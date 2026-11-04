/* ADMITTING AN ADDRESS TO CLOUDFLARE ACCESS (ROB-440; Rob, 2026-11-03: Access holds exactly three rule groups, and they are
 * the only list). An invitation writes the address into a rule group, never into a policy:
 *
 *   general   "CrankMagic Invitees"     the app only
 *   insider   "Game Theory Insiders"    the app and every AI feature (only the owner may invite one: cloud/invitations.mjs)
 *
 * ONE INVITATION, EVERY SIGN-IN (Rob, 2026-10-26: "adds their email address to the Cloudflare staging and production
 * access ... and it has to be confirmed that they are added there"). ACCESS_INVITE_APP_IDS and ACCESS_INVITE_POLICY_ID are
 * comma-separated lists read in pairs: application i admits people through its reusable policy i. The address is written
 * once, into the group, and read back; then each pair is confirmed in turn: the policy is attached to that application, and
 * it includes the group. A policy that does not include the group yet is given it, once, and read back (the only policy
 * write left, and the one thing in a policy this code ever adds). The address counts as admitted only when every application
 * confirms it. Other policies, and every other rule of these, are never touched.
 *
 * The token is ACCESS_API_TOKEN (cloud/access-groups.mjs says which permissions it needs). The group is chosen by the group
 * asked for; the per-group policy lists of ROB-320 (ACCESS_INVITE_POLICY_ID_GENERAL / _INSIDER) are retired: one policy per
 * application includes the groups.
 */
import {accessApi, AccessApiError, groupsConfigured, setMember, withLease} from './access-groups.mjs';

const POLICY_FIELDS = ['name','decision','include','exclude','require','approval_groups','approval_required',
  'connection_rules','isolation_required','mfa_config','purpose_justification_prompt',
  'purpose_justification_required','session_duration'];
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
/** The rule group an invitation into `group` writes: Game Theory Insiders for an insider, CrankMagic Invitees otherwise. */
export const roleOf = group => group === 'insider' ? 'insiders' : 'invitees';

/** The configured applications and the policy through which each admits the groups: [{app, policy}], or [] when the two
    lists are missing, malformed or of different lengths. `group` no longer changes the answer (one policy per application). */
export function inviteTargets(env) {
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const apps = list(env.ACCESS_INVITE_APP_IDS), policies = list(env.ACCESS_INVITE_POLICY_ID);
  if (!apps.length || apps.length !== policies.length || ![...apps, ...policies].every(x => uuid.test(x))) return [];
  return apps.map((app, i) => ({app, policy: policies[i]}));
}
/** Whether this copy can admit anyone: the Access API token and account, and at least one application and its policy. */
export const accessReady = env => groupsConfigured(env) && inviteTargets(env).length > 0;

/** Admits `to` into the group's rule group and confirms every configured Access application admits that group; returns
    what each confirmed: [{app, name, domain, added}] -- `added` false where the address was already in the group.
    Every application and policy is checked before anything is written, so a configuration that cannot admit writes nothing. */
export async function admitAddress(db, env, to, {now, fetchImpl, fail, group}) {
  const targets = inviteTargets(env);
  if (!groupsConfigured(env) || !targets.length)
    fail('Cloudflare Access invitation permissions are not configured. Your sign-in is unchanged.', 503);
  const error = 'Access did not admit this address. No invitation email was sent; ask the administrator to check invitation permissions.';
  const call = async (path, method = 'GET', body) => {
    try {return (await accessApi(env, path, {method, body, fetchImpl})).result;}
    catch (e) {if (e instanceof AccessApiError) fail(error, 502); throw e;}
  };
  /* The policy is reusable, allows, is attached to this application, and to no application outside the configured ones (a
     policy the configuration names for two applications may serve both). */
  const check = (appState, policyId, policy) => {
    const shared = targets.filter(t => t.policy === policyId).length;
    if (!appState.policies?.some(p => p.id === policyId) || policy.id !== policyId || policy.reusable !== true || policy.app_count !== shared || policy.decision !== 'allow' || !Array.isArray(policy.include))
      fail('The invitation policy must be reusable and attached only to this application. Ask the administrator to check its configuration.', 503);
  };
  const read = [];
  for (const {app, policy} of targets) {
    const appState = await call(`/apps/${app}`);
    check(appState, policy, await call(`/policies/${policy}`));
    read.push({app, policy, appState});
  }
  const {group: written, changed} = await setMember(db, env, roleOf(group), to, true, {now, fetchImpl, fail: (message, status) => fail(status === 502 ? error : message, status)});
  const admits = p => Array.isArray(p?.include) && p.include.some(r => r?.group?.id === written.id);
  const confirmed = [];
  for (const {app, policy: policyId, appState} of read) {
    try {
      const policy = await call(`/policies/${policyId}`);
      check(appState, policyId, policy);
      /* The policy does not include the group yet: add it, under the lease, from a fresh read. */
      if (!admits(policy)) await withLease(db, policyId, {now, fail}, async still => {
        const fresh = await call(`/policies/${policyId}`);
        check(appState, policyId, fresh);
        if (admits(fresh)) return;
        const body = Object.fromEntries(POLICY_FIELDS.filter(k => Object.hasOwn(fresh, k)).map(k => [k, fresh[k]]));
        body.include = [...fresh.include, {group: {id: written.id}}];
        await still();
        await call(`/policies/${policyId}`, 'PUT', body);
        if (!admits(await call(`/policies/${policyId}`))) fail(error, 502);
      });
      confirmed.push({app, name: String(appState.name || ''), domain: String(appState.domain || ''), added: changed});
    } catch (e) {
      // Name what already holds, so a retry (which is idempotent) is understood as finishing the rest.
      if (confirmed.length) e.message += ` Already admitted: ${confirmed.map(x => x.domain || x.name).join(', ')}.`;
      throw e;
    }
  }
  return confirmed;
}
