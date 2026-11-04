/* A STAND-IN FOR CLOUDFLARE ACCESS'S API (ROB-440): the account's rule groups and the applications' reusable policies, as the
 * Worker reads and writes them (cloud/access-groups.mjs, cloud/access-invites.mjs). Nothing here has been checked against real
 * Cloudflare; it answers in the documented envelope ({success, result, result_info}) and records every write.
 *
 *   const access = fakeAccess({apps: [{id, name, domain, policy}], groups: {"Admin": ["rob@example.com"], ...}});
 *   access.fetch(url, init)    a Response for an Access API URL, or null for any other URL (so a suite can chain its own)
 *   access.members(name)       the addresses a group names by email rule, in order
 *   access.policy(id)          a policy's current state
 *   access.writes              [{kind: "group" | "policy", id, name?}] in order
 *   access.refuse              set to a predicate (url, init) => boolean to answer 403 where it holds
 *   access.hold                set to a promise to make every call wait on it, or to (path, init) => promise | null to hold some
 */
import assert from "node:assert/strict";
import {RULE_GROUPS} from "../../cloud/access-groups.mjs";

export const ACCOUNT = "0".repeat(32);
export const TOKEN = "test-only-access-token";
export const NAMES = RULE_GROUPS;

export function fakeAccess({apps = [], groups = {}, perPage = 50, policyIncludesGroups = false} = {}) {
  let counter = 0;
  const groupState = new Map(), policies = new Map(), appState = new Map(), writes = [];
  for (const [name, emails] of Object.entries(groups)) {
    const id = `9999999${counter++}-0000-0000-0000-00000000000${counter}`;
    groupState.set(id, {id, name, include: emails.map((email) => ({email: {email}})), exclude: [], require: [], is_default: false});
  }
  const groupId = (name) => [...groupState.values()].find((g) => g.name === name)?.id;
  for (const app of apps) {
    appState.set(app.id, {name: app.name ?? "", domain: app.domain ?? "", policies: [{id: app.policy}]});
    if (!policies.has(app.policy)) policies.set(app.policy, {id: app.policy, name: "Invited", reusable: true, app_count: 0, decision: "allow",
      include: policyIncludesGroups ? Object.values(NAMES).map(groupId).filter(Boolean).map((id) => ({group: {id}})) : [{email: {email: "rob@example.com"}}],
      require: [{login_method: {id: "existing-provider"}}], exclude: [], session_duration: "24h"});
    policies.get(app.policy).app_count += 1;
  }
  const fake = {
    writes, refuse: null, hold: null, calls: [],
    members: (name) => (groupState.get(groupId(name))?.include || []).filter((r) => r.email).map((r) => r.email.email),
    groupId,
    group: (name) => groupState.get(groupId(name)),
    policy: (id) => policies.get(id),
    /** Adds a group the way the dashboard would (a second of the same name, to prove the Worker refuses to guess). */
    addGroup(name, emails = []) {const id = `8888888${counter++}-0000-0000-0000-00000000000${counter}`; groupState.set(id, {id, name, include: emails.map((email) => ({email: {email}})), exclude: [], require: []}); return id;},
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
        if (method === "PUT") {
          const body = JSON.parse(init.body);
          policies.set(p[1], {...policies.get(p[1]), ...body}); writes.push({kind: "policy", id: p[1]});
        } else assert.equal(method, "GET");
        return ok(policies.get(p[1]));
      }
      assert.fail(`the Worker called an Access endpoint it has no business with: ${method} ${path}`);
    },
  };
  return fake;
}

/** The Worker variables that switch the groups on, for the fake's account and token. */
export const accessVars = (apps = []) => ({ACCESS_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
  ...(apps.length ? {ACCESS_INVITE_APP_IDS: apps.map((a) => a.id).join(","), ACCESS_INVITE_POLICY_ID: apps.map((a) => a.policy).join(",")} : {})});
