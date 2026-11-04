/* THE THREE ACCESS RULE GROUPS ARE THE ONLY LIST (ROB-440; Rob, 2026-11-03; cloud/access-groups.mjs, cloud/access-invites.mjs).
 *
 *   Read     groupOf answers owner for the "Admin" group (or OWNER_EMAIL), insider for "Game Theory Insiders", general for
 *            everyone else; email include rules only, exclude rules subtract; a missing or doubled group grants nothing;
 *            ai_allowlist answers only where no Access API is configured, and never once it is.
 *   Cached   a minute; a write by this Worker drops it; an API failure falls back to the last listing for ten minutes, and
 *            past that nobody is an insider (fail closed) while OWNER_EMAIL still answers.
 *   Written  an invitation writes the address into its group (Invitees, or Insiders for an insider), never into a policy;
 *            each configured application's policy is confirmed to include the group, and is given it once if it does not;
 *            one invitation, both sign-ins, read back; idempotent; a refusal names what already holds.
 *
 * Everything is the fake in tests/helpers/fake-access.mjs. Nothing here has been run against real Cloudflare.
 */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {groupOf} from "../cloud/access.mjs";
import {forgetGroups, ruleGroups, setMember, roster, membersOf, AccessApiError} from "../cloud/access-groups.mjs";
import {inviteTargets, admitAddress, accessReady} from "../cloud/access-invites.mjs";
import {fakeAccess, accessVars, NAMES} from "./helpers/fake-access.mjs";

let checks = 0;
const eq = (a, b, m) => {assert.deepEqual(a, b, m); checks += 1;};
const ok = (c, m) => {assert.ok(c, m); checks += 1;};
const rejects = async (fn, test, m) => {await assert.rejects(fn, test, m); checks += 1;};

const raw = new DatabaseSync(":memory:");
for (const f of ["0002_ai.sql", "0005_access_invites.sql"]) raw.exec(readFileSync(new URL(`../cloud/migrations/${f}`, import.meta.url), "utf8"));
const stmt = (sql, args = []) => ({bind: (...v) => stmt(sql, v), first: async () => raw.prepare(sql).get(...args) ?? null, run: async () => ({meta: {changes: Number(raw.prepare(sql).run(...args).changes)}})});
const db = {prepare: (s) => stmt(s)};
const locks = () => raw.prepare("SELECT count(*) AS n FROM access_invite_locks").get().n;

const APPS = [{id: "aaaaaaaa-0000-0000-0000-000000000001", name: "CrankMagic staging", domain: "staging.crankmagic.com", policy: "bbbbbbbb-0000-0000-0000-000000000001"},
  {id: "aaaaaaaa-0000-0000-0000-000000000002", name: "CrankMagic accounts", domain: "crankmagic.com/api/*", policy: "bbbbbbbb-0000-0000-0000-000000000002"}];
const access = fakeAccess({apps: APPS, groups: {[NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["ann@example.com"], [NAMES.invitees]: ["gus@example.com"]}});
const env = accessVars(APPS);
const fetchImpl = async (url, init) => (await access.fetch(url, init)) ?? assert.fail(`no network in this suite: ${url}`);
const fail = (message, status) => {const e = new Error(message); e.status = status; throw e;};
const now = () => "2026-11-03T12:00:00.000Z";
raw.prepare("INSERT INTO ai_allowlist (email, added_at, note) VALUES ('old@example.com', '2026-10-01', 'the roster of before')").run();

/* 1. READ: the groups answer, and the old table does not. */
forgetGroups();
const of = (email, e = env) => groupOf(email, e, db, {fetchImpl});
eq([await of("rob@example.com"), await of("Ann@Example.com"), await of("gus@example.com"), await of("nobody@example.com")], ["owner", "insider", "general", "general"],
  "Admin is the owner, Game Theory Insiders an insider (in any letter case), CrankMagic Invitees and everyone else general");
eq(await of("old@example.com"), "general", "with the groups configured, a row in ai_allowlist makes no one an insider: the table is not a second list");
eq(await groupOf("old@example.com", {}, db), "insider", "with no Access API configured (a local run, a release before the secret), the old table still answers: the migration path");
eq(await of("owner@example.com", {...env, OWNER_EMAIL: "Owner@Example.com"}), "owner", "OWNER_EMAIL is the owner's fallback, matched in any case");
const calls = access.calls.length;
await of("ann@example.com"); await of("gus@example.com");
eq(access.calls.length, calls, "the listing is cached: asking again within the minute calls nothing");
access.setMembers(NAMES.insiders, ["ann@example.com", "x@example.com"]);
access.group(NAMES.insiders).exclude = [{email: {email: "x@example.com"}}];
access.group(NAMES.insiders).include.push({email_domain: {domain: "example.com"}});
forgetGroups();
eq([await of("x@example.com"), await of("zed@example.com")], ["general", "general"], "an exclude rule subtracts, and a domain rule grants nothing here (Access enforces it at sign-in)");
eq([...membersOf({include: [{email: {email: "A@B.co"}}, {everyone: {}}], exclude: []})], ["a@b.co"], "only email rules are members, lower-cased");
access.addGroup("game theory insiders", ["eve@example.com"]);
forgetGroups();
eq([await of("ann@example.com"), await of("eve@example.com")], ["general", "general"], "two groups of the same name grant nothing: the Worker never guesses between them");
access.removeGroup("game theory insiders");
access.removeGroup(NAMES.insiders);
forgetGroups();
eq((await ruleGroups(env, {fetchImpl})).insiders, null, "a missing group reads as null");
eq(await of("ann@example.com"), "general", "and grants nothing");

/* Paging: a listing over several pages is read whole. */
const paged = fakeAccess({groups: {Other1: [], Other2: [], [NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["pam@example.com"]}, perPage: 1});
forgetGroups();
eq(await groupOf("pam@example.com", env, db, {fetchImpl: async (u, i) => paged.fetch(u, i)}), "insider", "groups on a later page of the listing are found");

/* 2. CACHED AND FAIL CLOSED. */
const flaky = fakeAccess({groups: {[NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["ann@example.com"], [NAMES.invitees]: []}});
const ff = async (u, i) => flaky.fetch(u, i);
forgetGroups();
const t0 = Date.parse("2026-11-03T12:00:00Z");
eq((await ruleGroups(env, {fetchImpl: ff, now: t0})).insiders.members.has("ann@example.com"), true, "read once");
flaky.refuse = () => true;
eq((await ruleGroups(env, {fetchImpl: ff, now: t0 + 120_000})).insiders.members.has("ann@example.com"), true, "the API refusing, a listing from two minutes ago still answers");
await rejects(() => ruleGroups(env, {fetchImpl: ff, now: t0 + 700_000}), AccessApiError, "past ten minutes it does not");
forgetGroups();
const warn = console.warn; console.warn = () => {};
eq([await groupOf("ann@example.com", env, db, {fetchImpl: ff}), await groupOf("owner@example.com", {...env, OWNER_EMAIL: "owner@example.com"}, db, {fetchImpl: ff})], ["general", "owner"],
  "groups unreadable and nothing cached: no one is an insider (fail closed), and OWNER_EMAIL still names the owner");
console.warn = warn;
flaky.refuse = null;

/* 3. WRITTEN: the owner's roster changes the group itself. */
const w = fakeAccess({apps: APPS, groups: {[NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["ann@example.com"], [NAMES.invitees]: ["gus@example.com"]}});
const wf = async (u, i) => (await w.fetch(u, i)) ?? assert.fail(u);
forgetGroups();
await groupOf("ann@example.com", env, db, {fetchImpl: wf});
eq((await setMember(db, env, "insiders", "Bea@Example.com", true, {now, fetchImpl: wf})).changed, true, "an address is added to Game Theory Insiders");
eq(w.members(NAMES.insiders), ["ann@example.com", "bea@example.com"], "lower-cased, beside who was there");
eq(await groupOf("bea@example.com", env, db, {fetchImpl: wf}), "insider", "and the cache is dropped, so the Worker reads her as an insider at once");
eq((await setMember(db, env, "insiders", "bea@example.com", true, {now, fetchImpl: wf})).changed, false, "adding again writes nothing");
eq(w.writes.length, 1, "one write in all");
await setMember(db, env, "insiders", "bea@example.com", false, {now, fetchImpl: wf});
eq([w.members(NAMES.insiders), await groupOf("bea@example.com", env, db, {fetchImpl: wf})], [["ann@example.com"], "general"], "taken off, she is general again");
await rejects(() => setMember(db, env, "insiders", "ann@example.com", false, {now, fetchImpl: wf}), (e) => e.status === 409 && /last rule/.test(e.message), "the last address in a group leaves by the dashboard, never leaving the group empty");
await rejects(() => setMember(db, env, "admin", "eve@example.com", true, {now, fetchImpl: wf}), (e) => e.status === 400, "the Admin group is never written by the Worker");
await rejects(() => setMember(db, {}, "insiders", "eve@example.com", true, {now, fetchImpl: wf}), (e) => e.status === 503, "with no Access API configured, nothing is written");
eq(w.group(NAMES.insiders).require, [], "a write keeps the group's other rules as they were");
const r = await roster(env, {fetchImpl: wf});
eq([r.insiders, r.invitees, r.missing], [[{email: "ann@example.com"}], [{email: "gus@example.com"}], []], "the roster is the groups, read fresh");
eq(locks(), 0, "no lock is left behind");

/* 4. AN INVITATION: into the group, never into a policy; both sign-ins confirm. */
eq(inviteTargets(env), APPS.map((a) => ({app: a.id, policy: a.policy})), "the applications and their policies, read in pairs");
eq([inviteTargets({...env, ACCESS_INVITE_POLICY_ID: APPS[0].policy}), inviteTargets({...env, ACCESS_INVITE_APP_IDS: "not-a-uuid," + APPS[1].id})], [[], []], "lists of different lengths, or a malformed id, configure nothing");
eq([accessReady(env), accessReady({...env, ACCESS_API_TOKEN: ""}), accessReady({...env, CLOUDFLARE_ACCOUNT_ID: "x"})], [true, false, false], "admission needs the token, the account and the applications");
const deps = (group) => ({now, fetchImpl: wf, fail, group});
const policyWrites = () => w.writes.filter((x) => x.kind === "policy").length;
const done = await admitAddress(db, env, "gen@example.com", deps("general"));
eq(w.members(NAMES.invitees), ["gus@example.com", "gen@example.com"], "a General invitee is written into CrankMagic Invitees");
eq(done.map((x) => [x.domain, x.added]), [["staging.crankmagic.com", true], ["crankmagic.com/api/*", true]], "and each application confirms it");
eq(APPS.map((a) => w.policy(a.policy).include), APPS.map(() => [{email: {email: "rob@example.com"}}, {group: {id: w.groupId(NAMES.invitees)}}]),
  "each policy is given the group once, beside what it held; no address is written into a policy");
eq(APPS.map((a) => [w.policy(a.policy).require, w.policy(a.policy).session_duration]), APPS.map(() => [[{login_method: {id: "existing-provider"}}], "24h"]), "a policy keeps its other rules");
await admitAddress(db, env, "ins@example.com", deps("insider"));
eq([w.members(NAMES.insiders).includes("ins@example.com"), w.members(NAMES.invitees).includes("ins@example.com")], [true, false], "an Insider invitee is written into Game Theory Insiders only");
eq(await groupOf("ins@example.com", env, db, {fetchImpl: wf}), "insider", "so the Worker reads them as an insider, with no table written");
eq(raw.prepare("SELECT count(*) AS n FROM ai_allowlist WHERE email = 'ins@example.com'").get().n, 0, "ai_allowlist is not written");
const before = w.writes.length;
const again = await admitAddress(db, env, "ins@example.com", deps("insider"));
eq([w.writes.length, again.every((x) => x.added === false)], [before, true], "admitting again reads and writes nothing (idempotent)");
eq(policyWrites(), 4, "each policy was given each group once: two groups, two policies");

/* A policy refused at the second application: the group holds, the first sign-in is named, a retry finishes the rest. */
const half = fakeAccess({apps: APPS, groups: {[NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["ann@example.com"], [NAMES.invitees]: ["gus@example.com"]}});
const hf = async (u, i) => (await half.fetch(u, i)) ?? assert.fail(u);
forgetGroups();
half.refuse = (path, init) => init.method === "PUT" && path.endsWith(APPS[1].policy);
await rejects(() => admitAddress(db, env, "half@example.com", {now, fetchImpl: hf, fail, group: "general"}), (e) => e.status === 502 && /Already admitted: staging\.crankmagic\.com\./.test(e.message), "the second sign-in refused: the refusal names the first");
half.refuse = null;
const retried = await admitAddress(db, env, "half@example.com", {now, fetchImpl: hf, fail, group: "general"});
eq([retried.map((x) => x.added), half.members(NAMES.invitees)], [[false, false], ["gus@example.com", "half@example.com"]], "sending again finishes it, and the address is in the group once");

/* Configuration that must refuse, writing nothing. */
const writesBefore = w.writes.length;
await rejects(() => admitAddress(db, {...env, ACCESS_API_TOKEN: ""}, "late@example.com", deps("general")), (e) => e.status === 503 && /not configured/.test(e.message), "no token: not configured");
w.policy(APPS[0].policy).app_count = 3;
await rejects(() => admitAddress(db, env, "wide@example.com", deps("general")), (e) => e.status === 503 && /reusable and attached only/.test(e.message), "a policy attached to an application outside the configured ones is refused");
w.policy(APPS[0].policy).app_count = 1;
w.removeGroup(NAMES.invitees);
forgetGroups();
await rejects(() => admitAddress(db, env, "nogroup@example.com", deps("general")), (e) => e.status === 503 && /no single rule group named "CrankMagic Invitees"/.test(e.message), "no Invitees group: refused, naming the group to create");
eq(w.writes.length, writesBefore, "and none of them wrote anything: every application and policy is checked before the group is written");
eq(locks(), 0, "no lock is left behind");

/* One reusable policy shared by both applications is allowed when the configuration names it for both. */
const one = "cccccccc-0000-0000-0000-000000000001", shared = APPS.map((a) => ({...a, policy: one}));
const s = fakeAccess({apps: shared, groups: {[NAMES.admin]: ["rob@example.com"], [NAMES.insiders]: ["ann@example.com"], [NAMES.invitees]: ["gus@example.com"]}});
forgetGroups();
const sharedDone = await admitAddress(db, accessVars(shared), "both@example.com", {now, fetchImpl: async (u, i) => s.fetch(u, i), fail, group: "general"});
eq([sharedDone.length, s.policy(one).app_count, s.writes.filter((x) => x.kind === "policy").length], [2, 2, 1], "one policy for both applications: both confirm, and it is given the group once");

console.log(`access-invite-groups: ${checks} checks passed — the three Access rule groups are the only list: read, cached, fail closed, written by invitation and roster, never a policy address or a table row`);
