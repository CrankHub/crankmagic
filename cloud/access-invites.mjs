/* ADMITTING AN ADDRESS TO CLOUDFLARE ACCESS (ROB-440; Rob, 2026-11-03: Access holds exactly three rule groups, and they are
 * the only list). An invitation writes the address into a rule group, and into nothing else:
 *
 *   general   "CrankMagic Invitees"     the app only
 *   insider   "Game Theory Insiders"    the app and every AI feature (only the owner may invite one: cloud/invitations.mjs)
 *
 * ONE INVITATION, EVERY SIGN-IN (Rob, 2026-10-26: "adds their email address to the Cloudflare staging and production
 * access ... and it has to be confirmed that they are added there"). ACCESS_INVITE_APP_IDS lists the Access applications an
 * invitation must reach (staging's and production's). Before anything is written, each one is read, and it must have an
 * Allow policy that includes the group; otherwise the invitation is refused, naming the application, and nothing changes.
 * Then the address is written once, into the group, and read back. The policies are Rob's, kept in the dashboard (Nov 4:
 * reusable "Admin", "Insiders" and "Invitees" policies, one per group): this code reads them and never writes one.
 *
 * The token is ACCESS_API_TOKEN (cloud/access-groups.mjs says which permissions it needs). ROB-320's per-group policy lists
 * (ACCESS_INVITE_POLICY_ID_GENERAL / _INSIDER) and the per-application ACCESS_INVITE_POLICY_ID are retired.
 */
import {accessApi, AccessApiError, groupsConfigured, ruleGroups, setMember, RULE_GROUPS} from './access-groups.mjs';

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
/** The rule group an invitation into `group` writes: Game Theory Insiders for an insider, CrankMagic Invitees otherwise. */
export const roleOf = group => group === 'insider' ? 'insiders' : 'invitees';

/** The Access applications an invitation must reach: [{app}], or [] when ACCESS_INVITE_APP_IDS is missing or malformed. */
export function inviteTargets(env) {
  const apps = String(env.ACCESS_INVITE_APP_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!apps.length || !apps.every(x => uuid.test(x))) return [];
  return apps.map(app => ({app}));
}
/** Whether this copy can admit anyone: the Access API token and account, and at least one application. */
export const accessReady = env => groupsConfigured(env) && inviteTargets(env).length > 0;

/** Whether an application lets the group sign in: one of its Allow policies includes the group. A policy the application
    lists without its rules is read on its own (a reusable policy); one that cannot be read admits nothing. */
async function admits(env, appState, groupId, fetchImpl) {
  for (const listed of Array.isArray(appState.policies) ? appState.policies : []) {
    let policy = listed;
    if (!Array.isArray(listed?.include)) {
      try {policy = (await accessApi(env, `/policies/${listed?.id}`, {fetchImpl})).result;}
      catch (e) {if (e instanceof AccessApiError) continue; throw e;}
    }
    if (policy?.decision === 'allow' && Array.isArray(policy.include) && policy.include.some(r => r?.group?.id === groupId)) return true;
  }
  return false;
}

/** Admits `to` into the group's rule group, once every configured Access application is confirmed to let that group sign
    in; returns what each confirmed: [{app, name, domain, added}] -- `added` false where the address was already in it. */
export async function admitAddress(db, env, to, {now, fetchImpl, fail, group}) {
  const targets = inviteTargets(env);
  if (!groupsConfigured(env) || !targets.length)
    fail('Cloudflare Access invitation permissions are not configured. Your sign-in is unchanged.', 503);
  const error = 'Access did not admit this address. No invitation email was sent; ask the administrator to check invitation permissions.';
  const role = roleOf(group), wanted = RULE_GROUPS[role];
  let groups;
  try {groups = await ruleGroups(env, {fetchImpl, refresh: true});}
  catch (e) {if (e instanceof AccessApiError) fail(error, 502); throw e;}
  const target = groups[role];
  if (!target) fail(`Cloudflare Access has no single rule group named "${wanted}". Ask the administrator to create it (Zero Trust › Access › Rule groups). No invitation email was sent.`, 503);
  const apps = [];
  for (const {app} of targets) {
    let appState;
    try {appState = (await accessApi(env, `/apps/${app}`, {fetchImpl})).result;}
    catch (e) {if (e instanceof AccessApiError) fail(error, 502); throw e;}
    const name = String(appState.name || ''), domain = String(appState.domain || '');
    if (!(await admits(env, appState, target.id, fetchImpl)))
      fail(`The Access application ${domain || name || app} has no Allow policy that includes the "${wanted}" rule group, so the invitee could not sign in there. Ask the administrator to add one. No invitation email was sent.`, 503);
    apps.push({app, name, domain});
  }
  const {changed} = await setMember(db, env, role, to, true, {now, fetchImpl, fail: (message, status) => fail(status === 502 ? error : message, status)});
  return apps.map(a => ({...a, added: changed}));
}
