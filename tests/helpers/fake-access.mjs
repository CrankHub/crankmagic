/* A STAND-IN FOR CLOUDFLARE ACCESS'S API (ROB-440): the account's rule groups and the applications' reusable policies, shaped
 * as Rob set Access on 2026-11-04. Three rule groups; one reusable Allow policy per group ("Admin", "Insiders", "Invitees"),
 * each including its group; and "Session checks", a Service Auth policy, on every application. Nothing here has been
 * checked against real Cloudflare; it answers in the documented envelope ({success, result, result_info}), records every
 * write, and fails a suite whose Worker writes a policy (the Worker never does).
 *
 *   const access = fakeAccess({apps: [{id, name, domain, admits?: [group names]}], groups: {"Admin": ["rob@example.com"], ...}});
 *   access.fetch(url, init)    a Response for an Access API URL, or null for any other URL (so a suite can chain its own)
 *   access.members(name)       the addresses a group names by email rule, in order
 *   access.detach(app, name)   takes the policy of that group off an application, as the dashboard would
 *   access.writes              [{kind: "group", id, name}] in order
 *   access.refuse              set to a predicate (path, init) => boolean to answer 403 where it holds
 *   access.hold                a promise every call waits on, or (path, init) => promise | null to hold some
 */
import assert from "node:assert/strict";
import {RULE_GROUPS} from "../../cloud/access-groups.mjs";

export const ACCOUNT = "0".repeat(32);
export const TOKEN = "test-only-access-token";
export const NAMES = RULE_GROUPS;
const POLICY_NAMES = {[RULE_GROUPS.admin]: "Admin", [RULE_GROUPS.insiders]: "Insiders", [RULE_GROUPS.invitees]: "Invitees"};

export function fakeAccess({apps = [], groups = {}, perPage = 50} = {}) {
  let counter = 0;
  const id = (prefix) => `${prefix}-${String(++counter).padStart(4, "0")}`;
  const groupState = new Map(), policies = new Map(), appState = new Map(), writes = [];
  for (const [name, emails] of Object.entries(groups)) {
    const gid = id("group");
    groupState.set(gid, {id: gid, name, include: emails.map((email) => ({email: {email}})), exclude: [], require: [], is_default: false});
  }
  const groupId = (name) => [...groupState.values()].find((g) => g.name === name)?.id;
  const policyOf = new Map();
  for (const [name, label] of Object.entries(POLICY_NAMES)) {
    if (!groupId(name)) continue;
    const pid = id("policy");
    policies.set(pid, {id: pid, name: label, reusable: true, app_count: 0, decision: "allow", include: [{group: {id: groupId(name)}}], exclude: [], require: []});
    policyOf.set(name, pid);
  }
  const checks = id("policy");
  policies.set(checks, {id: checks, name: "Session checks", reusable: true, app_count: 0, decision: "non_identity", include: [{any_valid_service_token: {}}], exclude: [], require: []});
  for (const app of apps) {
    const admitted = (app.admits ?? Object.values(NAMES)).map((n) => policyOf.get(n)).filter(Boolean);
    for (const pid of [...admitted, checks]) policies.get(pid).app_count += 1;
    appState.set(app.id, {id: app.id, name: app.name ?? "", domain: app.domain ?? "", policies: [...admitted, checks].map((pid) => ({id: pid}))});
  }
  const fake = {
    writes, refuse: null, hold: null, calls: [],
    members: (name) => (groupState.get(groupId(name))?.include || []).filter((r) => r.email).map((r) => r.email.email),
    groupId,
    group: (name) => groupState.get(groupId(name)),
    policy: (pid) => policies.get(pid),
    policyFor: (name) => policies.get(policyOf.get(name)),
    app: (appId) => appState.get(appId),
    detach(appId, name) {const a = appState.get(appId); a.policies = a.policies.filter((p) => p.id !== policyOf.get(name)); policies.get(policyOf.get(name)).app_count -= 1;},
    /** Adds a group the way the dashboard would (a second of the same name, to prove the Worker refuses to guess). */
    addGroup(name, emails = []) {const gid = id("group"); groupState.set(gid, {id: gid, name, include: emails.map((email) => ({email: {email}})), exclude: [], require: []}); return gid;},
    removeGroup(name) {groupState.delete(groupId(name));},
    /** Changes a group the way the dashboard would. */
    setMembers(name, emails) {groupState.get(groupId(name)).include = emails.map((email) => ({email: {email}}));},
    async fetch(url, init = {}) {
      const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access`;
      if (typeof url !== "string" || !url.startsWith(base)) return null;
      assert.equal(init.redirect, "manual", "an Access call never follows a redirect with the token");
      assert.ok(init.signal instanceof AbortSignal, "an Access call has a timeout");
      assert.equal(init.headers?.authorization, `Bearer ${TOKEN}`, "an Access call carries the Access API token");
      const method = init.method || "GET", path = url.slice(base.length);
      fake.calls.push(`${method} ${path}`);
      if (typeof fake.hold === "function") {const held = fake.hold(path, init); if (held) await held;}
      else if (fake.hold) await fake.hold;
      if (fake.refuse && fake.refuse(path, init)) return Response.json({success: false, errors: [{message: "denied"}]}, {status: 403});
      const ok = (result, info) => Response.json({success: true, result: structuredClone(result), ...(info ? {result_info: info} : {})});
      const listed = path.match(/^\/groups\?page=(\d+)&per_page=(\d+)$/);
      if (listed && method === "GET") {
        const all = [...groupState.values()], size = Math.min(Number(listed[2]), perPage), page = Number(listed[1]);
        return ok(all.slice((page - 1) * size, page * size), {page, per_page: size, count: Math.min(size, Math.max(0, all.length - (page - 1) * size)), total_count: all.length, total_pages: Math.max(1, Math.ceil(all.length / size))});
      }
      const g = path.match(/^\/groups\/([\w-]+)$/);
      if (g) {
        const state = groupState.get(g[1]);
        if (!state) return Response.json({success: false}, {status: 404});
        if (method === "PUT") {
          const body = JSON.parse(init.body);
          assert.ok(typeof body.name === "string" && Array.isArray(body.include) && body.include.length, "a group is written whole: its name and a non-empty include");
          groupState.set(g[1], {...state, ...body, id: g[1]}); writes.push({kind: "group", id: g[1], name: state.name});
        } else assert.equal(method, "GET");
        return ok(groupState.get(g[1]));
      }
      const a = path.match(/^\/apps\/([\w-]+)$/);
      if (a && method === "GET" && appState.has(a[1])) return ok(appState.get(a[1]));
      const p = path.match(/^\/policies\/([\w-]+)$/);
      if (p && policies.has(p[1])) {
        assert.equal(method, "GET", "the Worker never writes a policy: the policies are Rob's, in the dashboard");
        return ok(policies.get(p[1]));
      }
      if (p) return Response.json({success: false}, {status: 404});
      assert.fail(`the Worker called an Access endpoint it has no business with: ${method} ${path}`);
    },
  };
  return fake;
}

/** The Worker variables that switch the groups on, for the fake's account and token, and the applications an invitation reaches. */
export const accessVars = (apps = []) => ({ACCESS_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
  ...(apps.length ? {ACCESS_INVITE_APP_IDS: apps.map((a) => a.id).join(",")} : {})});
