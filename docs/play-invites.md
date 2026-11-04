# Who can sit at a table (M5)

> **Superseded in part by ROB-320 (Rob, 2026-10-29 and 2026-10-30; `docs/program/rob-320-invitations-contract.md`).** *Create game*
> now admits each guest to Cloudflare Access itself (General, or Game Theory Insider when the owner invites), records who invited
> whom, and emails the lobby link; the link, or one press in Live games, seats a signed-in person with no host answer. What still
> holds below is the first sentence's other half: a link does not add anyone to the Access list *by being opened*; the invitation does,
> at Create game or in Settings, five people at most per inviter.

> **The list is three Cloudflare Access rule groups, and nothing else (ROB-440; Rob, 2026-11-03).** *Admin* (Rob: everything),
> *Game Theory Insiders* (the app and every AI feature) and *CrankMagic Invitees* (the app only). An invitation writes the address
> into CrankMagic Invitees, or into Game Theory Insiders when the owner invites an Insider; never into a policy, and never into a
> table of the Worker's own. Each application's reusable policies (Admin, Insiders, Invitees) include the groups, and the Worker
> only reads them. `docs/ai-door.md`, "Three access groups",
> has how the Worker reads them and Rob's steps before the release that carries this.

Rob, 2026-09-26 (`docs/decisions-2026-09-25.md`, M5): **Play is for the accounts' invite list.** A table's link
seats someone only if the address they sign in with is on that list, and **the link never adds anyone to it.**
Someone who is not on it is **refused with instructions**: they are told to ask Rob to add them.

## How it works

- The list is the three Cloudflare Access **rule groups** (above), which the reusable **Admin**, **Insiders** and
  **Invitees** policies of each Access application include: **"CrankMagic accounts"** (`crankmagic.com/api/*`) and
  **"CrankMagic staging"**. Adding someone is an invitation
  (Admin › Share, or a seat at Create game), which writes them into a group and confirms each application admits it; or Rob
  adds them to a group in the dashboard. Nobody is added to a policy by address.
- A table's link is `https://crankmagic.com/#table/<id>/<code>`. Opening it calls `/api/tables/<id>/join`, which
  Access guards. Someone signed out is asked to sign in; someone whose address is not on the list is stopped by
  Access, which shows its block page.
- **`not-invited.html`** is that block page's words: you're not on the list; ask the person who sent the link to
  ask Rob to add the address you signed in with (or write to admin@crankmagic.com); once added, open the same
  link again; wrong address, sign out. It is published with every release (a root in `tools/release-pages.mjs`).

## Rob's step: send Access's refusals to that page

In the Cloudflare dashboard (dashboard-only; nothing here is a secret):

1. **Zero Trust → Access → Applications → "CrankMagic accounts" → Configure** (Edit).
2. Find the application's **block page** setting (under its experience or appearance settings).
3. Choose **Redirect URL** and enter `https://crankmagic.com/not-invited.html`. Save.
4. Check it: in a private window, open any table link and sign in with an address that is **not** on the Invited
   policy. The page above should appear.

If your plan offers only Cloudflare's own block page, keep it and set its message to:
"You're not on CrankMagic's invite list yet. Ask the person who sent you the link to ask Rob to add the address
you signed in with, or write to admin@crankmagic.com. A table's link never adds anyone to the list."

Nothing about this is deployed until Play's release is, which waits on Rob's go (staging first).

## G-E: people Rob invites, on staging first (Part 7)

G-E is the people Rob invites playing on **staging**, using its games and its workshop, before production. Staging's
Access application, "CrankMagic staging", admits Rob and the session's service token. Production's,
"CrankMagic accounts", holds the Invited policy above. So an invitee has to be admitted on staging too.

### Rob's steps

1. **One list for both applications: the rule groups.**
   - Zero Trust → **Access controls** → **Policies** → the **Rule groups** tab: the three groups, *Admin*, *Game Theory
     Insiders* and *CrankMagic Invitees*, each including people by **Emails** (`docs/ai-door.md` has the full steps).
   - The reusable policies (Rob, 2026-11-04): *Admin* and *Insiders* on both applications and the AI one, *Invitees* on
     "CrankMagic accounts" and "CrankMagic staging" only, each including its group and no address of its own.

   Then an address added once is on both, and removed once is off both. An invitation checks that both applications
   admit the group before it writes anything, and never writes a policy. It reads and writes the groups with
   `ACCESS_API_TOKEN`, a Worker secret Rob installs.
2. **Staging's block page:** do as above for production, with `https://staging.crankmagic.com/not-invited.html`.
3. **Check the list below**, then send each person `https://staging.crankmagic.com/`, and a table's link when there's a
   game. They sign in with Google, or with the one-time code Access emails them.
4. **Taking someone off:** remove them from their group.

### Before the first invite

| Item | State | Whose |
| --- | --- | --- |
| Staging admits the invitees (the groups, above), and `ACCESS_API_TOKEN` is installed | not set | Rob |
| Staging's block page sends refusals to `not-invited.html` | not set | Rob |
| Monitoring: the Worker's 5xx and sync-conflict lines in Workers Logs; the weekly check (`tools/ops-week.mjs`) | built | done |
| Monitoring: the two alerts and their email (`docs/ops.md`) | not set | Rob |
| Backups: D1 Time Travel, 30 days | confirmed | done |
| Backups: the nightly copy to R2, its window, and what deletion promises (`docs/ops.md`) | not set | Rob |
| The Coach's privacy wording | approved, on staging | done |
| *AI players on Claude* and *The deck advisor* privacy wording (`docs/ai-door.md`) | waiting | Rob; both stay off until then |
| AI spend caps: 300¢ a day for each person, the Coach's own $1.50 | set | done |
| Account deletion | built | done |
| Access's free plan: 50 people | | Rob, as the list grows |
| A finding reaches the triage with its game (below) | built | done once released |

### Their findings

*Send feedback*, in the menu (☰), opens a mail to admin@crankmagic.com, which forwards to Rob. The mail already
names:
- where the person was;
- the release (`Version`);
- when the board holds a game, which game and its turn (`Game`), with a line asking for the game's record.

Staging's tables are playtest tables, so that record, from the game-over panel's *Download*, is the whole game. A
finding then goes in the same shape as the agents' (`docs/uat/playtest-findings.md`), in a run folder of its own:
- `docs/uat/<date>-invites/`, holding `playtest-findings.csv` and `records/`;
- triaged by `node tools/playtest-triage.mjs docs/uat/<date>-invites --games <n>`, with *n* the games the records
  cover. G-E's end is Rob's word, not a count of games.
