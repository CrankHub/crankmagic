/* THE THREE ACCESS RULE GROUPS ARE THE ONLY LIST (ROB-440; Rob, 2026-11-03). Cloudflare Access holds exactly three rule
 * groups, and the Worker keeps no copy of either list it reads:
 *
 *   Admin                  Rob's address: everything, the admin-only routes too           -> groupOf "owner"
 *   Game Theory Insiders   the app and every AI feature, no admin-only route              -> groupOf "insider"
 *   CrankMagic Invitees    the app only: no AI, no admin-only route                       -> groupOf "general"
 *
 * The groups are found by those names (any letter case) in one listing of the account's Access groups
 * (`GET /accounts/{account}/access/groups`). A person is in a group when the group's include rules name their address by an
 * email rule and its exclude rules do not; other rule kinds (a domain, an identity provider's group) are Access's to enforce
 * at sign-in, and grant nothing here. The listing is cached for a minute per isolate, and dropped the moment this Worker
 * writes a group, so a change made in the dashboard reaches the Worker within a minute. When the API cannot be read, the
 * last listing read within ten minutes answers; past that, nobody is an insider (groupOf fails closed).
 *
 * Configured by two things, neither of them a list: CLOUDFLARE_ACCOUNT_ID (a Worker variable) and ACCESS_API_TOKEN (a Worker
 * secret Rob installs; never in this repository). The token needs "Access: Organizations, Identity Providers, and Groups:
 * Edit" (read the groups; write an invitation into one) and "Access: Apps and Policies: Read" (cloud/access-invites.mjs checks
 * that each application's policies admit the group; it never writes a policy). Without both, invitations are refused.
 *
 * Plain fetch, no library. Nothing here returns the token, and no error carries a group's rules.
 */
export const RULE_GROUPS = Object.freeze({admin: "Admin", insiders: "Game Theory Insiders", invitees: "CrankMagic Invitees"});
export const ROLES = Object.freeze(Object.keys(RULE_GROUPS));

export class AccessApiError extends Error {
  constructor(message, status = 502) {super(message); this.name = "AccessApiError"; this.status = status;}
}

/** Whether this copy can read and write the rule groups: an account id and the Access API token. */
export const groupsConfigured = (env) => !!env?.ACCESS_API_TOKEN && /^[\da-f]{32}$/i.test(String(env?.CLOUDFLARE_ACCOUNT_ID || ""));

/** One call to the account's Access API. Returns the whole envelope ({result, result_info}); throws AccessApiError. */
export async function accessApi(env, path, {method = "GET", body, fetchImpl = fetch} = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/access${path}`;
  const what = `${method} ${path.split("?")[0].replace(/[\da-f-]{32,36}/gi, "…")}`;
  let response;
  try {
    // workerd rejects redirect:'error'. Never follow a redirect with the bearer token.
    response = await fetchImpl(url, {method, redirect: "manual", signal: AbortSignal.timeout(10000),
      headers: {authorization: `Bearer ${env.ACCESS_API_TOKEN}`, "content-type": "application/json"}, ...(body ? {body: JSON.stringify(body)} : {})});
  } catch {throw new AccessApiError(`the Access API did not answer (${what})`);}
  if (!response.ok) {await response.body?.cancel(); throw new AccessApiError(`the Access API refused ${what} (${response.status})`);}
  let value;
  try {value = await response.json();} catch {throw new AccessApiError(`the Access API answered ${what} with no JSON`);}
  if (value?.success !== true || !value.result) throw new AccessApiError(`the Access API did not succeed at ${what}`);
  return value;
}

const lower = (value) => String(value ?? "").trim().toLowerCase();
const emailsIn = (rules) => (Array.isArray(rules) ? rules : []).map((rule) => lower(rule?.email?.email)).filter((e) => e.includes("@"));
/** The addresses a group admits by name: its include email rules, less its exclude email rules. */
export function membersOf(group) {
  const out = new Set(emailsIn(group?.include));
  for (const e of emailsIn(group?.exclude)) out.delete(e);
  return out;
}

/* Each role's group, found by name: exactly one group of that name, or none (missing, or two of the same name, which is a
   configuration Rob must fix rather than one this code guesses between). */
function byRole(listed) {
  const out = {};
  for (const role of ROLES) {
    const named = listed.filter((g) => lower(g?.name) === lower(RULE_GROUPS[role]));
    out[role] = named.length === 1 && typeof named[0].id === "string" ? {id: named[0].id, name: named[0].name, members: membersOf(named[0])} : null;
  }
  return out;
}

let cache = {key: "", at: 0, groups: null};
export const forgetGroups = () => {cache = {key: "", at: 0, groups: null};};
const FRESH_MS = 60_000, STALE_MS = 600_000;

/**
 * The three rule groups, as {admin, insiders, invitees}: each {id, name, members: Set of lower-cased addresses}, or null when
 * the account has no group of that name (or two). Null altogether when this copy is not configured to read them.
 * @throws {AccessApiError} when the API cannot be read and no listing from the last ten minutes is held
 */
export async function ruleGroups(env, {fetchImpl = fetch, now = Date.now(), refresh = false} = {}) {
  if (!groupsConfigured(env)) return null;
  const key = String(env.CLOUDFLARE_ACCOUNT_ID).toLowerCase();
  if (!refresh && cache.key === key && cache.groups && now - cache.at < FRESH_MS) return cache.groups;
  try {
    const listed = [];
    for (let page = 1; page <= 20; page++) {
      const {result, result_info: info} = await accessApi(env, `/groups?page=${page}&per_page=50`, {fetchImpl});
      if (!Array.isArray(result)) throw new AccessApiError("the Access API listed the groups in a shape this Worker does not read");
      listed.push(...result);
      if (!result.length || page >= Number(info?.total_pages || 1)) break;
    }
    const groups = byRole(listed);
    cache = {key, at: now, groups};
    return groups;
  } catch (error) {
    if (cache.key === key && cache.groups && now - cache.at < STALE_MS) return cache.groups;
    throw error;
  }
}

/* A LEASE ON ONE ACCESS OBJECT (a policy or a group), so two Worker instances never read-modify-write it at once and lose
   each other's address. The row is in access_invite_locks (migration 0005); an expired holder cannot release a newer lease.
   `still()` refuses a write whose lease has under 30 seconds left, so a bounded write and read-back stay inside it. */
export async function withLease(db, id, {now, fail}, work) {
  if (!db) fail("Access cannot be changed here: this copy has no database for its write lock. Nothing was changed.", 503);
  const holder = crypto.randomUUID(), stamp = now(), expires = new Date(Date.parse(stamp) + 90000).toISOString();
  const lease = await db.prepare(`INSERT INTO access_invite_locks(id,holder,expires_at) VALUES (?,?,?)
    ON CONFLICT(id) DO UPDATE SET holder=excluded.holder,expires_at=excluded.expires_at
    WHERE access_invite_locks.expires_at<=? RETURNING holder`).bind(id, holder, expires, stamp).first();
  if (lease?.holder !== holder) fail("Another invitation is being processed. Please try again shortly.", 409);
  const still = async () => {
    const current = await db.prepare("SELECT holder,expires_at FROM access_invite_locks WHERE id=?").bind(id).first();
    if (current?.holder !== holder || Date.parse(current.expires_at) - Date.parse(now()) < 30000) fail("Invitation processing expired. Please retry.", 409);
  };
  try {return await work(still);}
  finally {await db.prepare("DELETE FROM access_invite_locks WHERE id=? AND holder=?").bind(id, holder).run();}
}

const thrower = (message, status) => {throw new AccessApiError(message, status);};
const GROUP_FIELDS = ["name", "include", "exclude", "require", "is_default"];

/**
 * Puts `email` in the role's rule group, or takes it out (an email include rule; nothing else in the group is touched), and
 * reads the group back. Idempotent: an address already where it should be is read, not written.
 * @param {{now: () => string, fetchImpl?: Function, fail?: Function}} deps `fail(message, status)` throws the caller's error
 * @returns {Promise<{group: {id: string, name: string}, changed: boolean}>}
 */
export async function setMember(db, env, role, email, member, {now, fetchImpl = fetch, fail = thrower}) {
  const who = lower(email), wanted = RULE_GROUPS[role];
  if (!wanted || role === "admin") fail("The Admin group is Rob's alone, and is changed in the Cloudflare dashboard.", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who)) fail("That is not an email address.", 400);
  if (!groupsConfigured(env)) fail(`This copy has no Access API token, so it cannot change the "${wanted}" group. Nothing was changed.`, 503);
  const api = async (path, init) => {
    try {return (await accessApi(env, path, {...init, fetchImpl})).result;}
    catch (error) {if (error instanceof AccessApiError) fail(`Access did not ${member ? "add the address to" : "take the address off"} the "${wanted}" group. Nothing else was changed; try again.`, 502); throw error;}
  };
  let groups;
  try {groups = await ruleGroups(env, {fetchImpl, refresh: true});}
  catch (error) {if (error instanceof AccessApiError) fail(`Access did not list its groups, so the "${wanted}" group was not changed. Try again.`, 502); throw error;}
  const found = groups[role];
  if (!found) fail(`Cloudflare Access has no single rule group named "${wanted}". Ask the administrator to create it (Zero Trust › Access › Rule groups). Nothing was changed.`, 503);
  return withLease(db, found.id, {now, fail}, async (still) => {
    const current = await api(`/groups/${found.id}`);
    const include = Array.isArray(current.include) ? current.include : [];
    const has = include.some((rule) => lower(rule?.email?.email) === who);
    if (has === member) return {group: {id: found.id, name: found.name}, changed: false};
    const next = member ? [...include, {email: {email: who}}] : include.filter((rule) => lower(rule?.email?.email) !== who);
    /* Access refuses a group with no include rule, and an empty group admits no one anyway: the last address leaves by the dashboard. */
    if (!next.length) fail(`"${email}" is the last rule in the "${wanted}" group; remove it in the Cloudflare dashboard. Nothing was changed.`, 409);
    const body = Object.fromEntries(GROUP_FIELDS.filter((k) => Object.hasOwn(current, k)).map((k) => [k, current[k]]));
    body.name = current.name ?? found.name; body.include = next;
    await still();
    await api(`/groups/${found.id}`, {method: "PUT", body});
    forgetGroups();
    const confirmed = await api(`/groups/${found.id}`);
    if ((Array.isArray(confirmed.include) && confirmed.include.some((rule) => lower(rule?.email?.email) === who)) !== member)
      fail(`Access did not confirm the change to the "${wanted}" group. Try again.`, 502);
    return {group: {id: found.id, name: found.name}, changed: true};
  });
}

/**
 * The owner's roster, read from the groups (GET /api/admin/groups): who is an insider and who an invitee, sorted, plus which
 * groups are missing. Admin's own members are not listed: it is Rob's, kept in the dashboard.
 * @throws {AccessApiError} 503 when this copy cannot read the groups, 502 when the API failed
 */
export async function roster(env, {fetchImpl = fetch} = {}) {
  if (!groupsConfigured(env)) throw new AccessApiError("This copy has no Access API token, so it cannot read the access groups. They are kept in Cloudflare Access (Zero Trust › Access › Rule groups).", 503);
  const groups = await ruleGroups(env, {fetchImpl, refresh: true});
  const list = (role) => [...(groups[role]?.members || [])].sort().map((email) => ({email}));
  return {source: "cloudflare-access", groups: RULE_GROUPS, missing: ROLES.filter((role) => !groups[role]).map((role) => RULE_GROUPS[role]),
    insiders: list("insiders"), invitees: list("invitees")};
}
