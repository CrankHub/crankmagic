# Card load, 2026-11-04: Rob's Master Table, column AL

Rob, 2026-11-04: *"Load or first confirm and then load all cards that are in this spreadsheet and have a number greater than 0 in
column AL. These cards should all be playable within the engine of Crank Magic Play."* The spreadsheet is `MtG Master Table.xlsx`
(sheet **Master**, column AL = "Total-A", the copies actually in the deck boxes), read as saved 2026-11-04. Main was `6df474ee`
(6,430 definitions). Linear: ROB-441.

`lane-master-al.json` here is the list: 595 distinct cards, 920 copies. `node tools/library-engine-index.mjs --check-lane
docs/engine/card-load-master-al-2026-11-04/lane-master-al.json` reports every one final, and `tests/engine-master-al-load.mjs` holds it.

## The review

| | Cards |
| --- | ---: |
| In the sheet with a number above 0 in AL | 595 |
| Playable before this load (a definition every table plays) | 580 |
| Written by hand here (none was a compiler candidate) | 15 |
| Playable now | **595** |

Six of the 580 are two-faced cards the sheet names by their front face (Glóin the Mighty, Smaug the Great Calamity, Bofur Reliable
Guardian, Venat Heart of Hydaelyn, Joined Researchers, Fable of the Mirror-Breaker). They are definitions under their whole oracle names,
as every two-faced card is, and the deck importer reaches them by a face (`card-resolve.js`); the lane file names them whole, with the
sheet's spelling beside.

## The 15 the engine lacked

| Card | What it needed | Scenarios |
| --- | --- | ---: |
| Affectionate Indrik | An optional "you may have it fight" on entering | 9 |
| Bifur, Melodic Rider | Storied, an enters-or-attacks counter, and "a Dwarf's triggered ability triggers an additional time" with an enduring story (`triggers-again` with no cause) | 6 |
| Dewdrop Cure | A gift that changes "up to two" target cards to "up to three" | 5 |
| Dispelling Exhale | **An optional "you may behold a Dragon"** additional cost; "if a Dragon was beheld", counter unless {4} instead of {2} | 7 |
| Dusyut Earthcarver | Reach; endure 3 (counters or a 3/3 Spirit, the player's choice, the token alone if it left) | 3 |
| Faramir, Prince of Ithilien | **"Choose an opponent"** (chosen, not targeted), a delayed trigger at that player's next end step, and "if they didn't attack you that turn" | 7 |
| Inevitable Defeat | Can't be countered; exile; its controller loses 3 and you gain 3 | 7 |
| Jeskai Devotee | Flurry (the second spell each turn); "{1}: Add {U}, {R}, or {W}", once each turn | 11 |
| Kwain, Itinerant Meddler | "Each player may draw, then each who did gains 1 life", each player deciding for themselves | 10 |
| Lasyd Prowler | An optional mill by the lands; Renew from the graveyard at sorcery speed, X the land cards there | 7 |
| Palantír of Orthanc | Influence counters, scry 2, and a target opponent who may let you draw or take a mill and a life loss | 4 |
| Rainveil Rejuvenator | An optional mill; a mana ability adding {G} equal to its power | 7 |
| Ringsight | The Ring tempts, then **a search for a card that shares a color with a legendary creature you control** | 5 |
| Roamer's Routine | **Harmonize {4}{G}**: a graveyard cast, exiled after, and a creature to tap that takes its power off the generic mana | 12 |
| Wargling | A ferocious attack trigger: +1/+0 and trample for the team | 9 |

## What was built (the Claude · Engine lane)

- **An optional behold** (`cards/index.mjs`, `rules/actions.mjs` `additionalVariants`): `optional: true` on a behold in a spell's own
  additional cost, the cast without it and the cast with it as a kicker's are, what is beheld asked once the cast is taken; read by
  `cast.additionalPaid`. Refused in a choice of costs and in a flashback cost.
- **A gift's own targets, counted** (`rules/actions.mjs` `offerSpecs`): a promised cast asks the promised spell's targets, so "up to
  three" is three and "up to two" two. Only non-counted ones had been written before (Consumed by Greed).
- **Harmonize** (`cards/index.mjs`, `vocabulary.mjs`, `rules/actions.mjs`): flashback's graveyard cast and exile (a static
  `rule: "flashback"` with `harmonize: true`), and an offer for each untapped creature with power that taps it to take its power off
  the generic mana (`{-N}`, `castCost`; never the colored). Which creature is the caster's choice, one offer each; it is no additional
  cost.
- **`sharesColor` takes a selector** (`script/filter.mjs`): at least one color in common with a permanent the selector describes, through
  the layers; `"self"` as before.
- **`choosePlayer`** (a new effect primitive: `script/effects/asking.mjs`, `resolution.mjs`, `vocabulary.mjs`, `docs/engine/PLAN.md`
  §12.2): "choose an opponent", chosen as it resolves and never targeted (a hexproof player may be chosen); one opponent left needs no
  question. A delayed trigger's `player: "the chosen player"` (`effects/permanents.mjs`) waits for that player's own turn.
- **`activePlayerAttackedYou`** (`script/condition.mjs`): whether the player whose turn it is attacked the controller this turn.
- **The scenario runner** (`cards/scenario.mjs`): the steps `behold` and `harmonize` pick the offer that beholds / taps a creature.

## Ignores, named

Recorded in `docs/engine/gameplay-gaps-2026-10-21.md`, section 4. None is a fix.
- **Bifur** completing his own story as he enters triggers his "enters" ability once (Storied is awarded at the state-based check).
- **The other ferocious attack triggers** (Ravening Warg, Nighthowl Pursuer, ...) are written with `condition`, asked again as they
  resolve; ferocious is not an intervening "if". Wargling is written with `while` and is right. Found by this load, not changed.
- **Kwain** draws and then gains for each player in turn order, not all draw and then all gain.
- **Lasyd Prowler's Renew** is offered once its mana is floated by hand (the census's advisory `ACTIVATION_ONLY_WHEN_FLOATED`, 893
  definitions, ROB-339 and ROB-354); every other card of the 15 is clean in the census.

## The workbook

Column AJ ("Play") of the Master sheet now says **Playable** for the 580 cards the engine already played and **Loading** for the 15
written here, in the 595 rows with a number above 0 in AL; nothing else in the file changed (the package differs from the saved one only
in those cells and the calculation chain's entries for them). Those 595 cells were formulas (they said whether a card was loaded into a deck
box) and are now plain text; the other 858 rows keep theirs. The 15 stay **Loading** until this merges.
