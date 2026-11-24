# Card load, 2026-11-24: Rob's Upgrade map

Rob, 2026-11-24, pasting the cards of his Upgrade Series map (`Upgrade Series 2026-11-22 Map.xlsx`) that the game did not
play: *"Here's another list of cards to prioritize next."* Of the 73 distinct cards in the map's BIC, Practical and
Available columns, 48 played on main `59b9f862`; these 25 did not, and still did not on main `1952139b` (after the Ninja
load). Linear: ROB-541.

`lane-upgrade-map.json` here is the list, in the shape of `card-load-boxes-2026-11-15/lane-boxes.json`: each card with
its deck, the map columns it is listed in, its slot's status, and the group that wrote it.
`tests/engine-upgrade-map-load-1124.mjs` holds it: every one of the 25 is a definition every table plays, and each runs
its scenarios.

## The review

| | Cards |
| --- | ---: |
| On the list | 25 |
| In the oracle data | 25 (the two Invasions are named by their front face; the oracle names both faces) |
| Compiler candidates | 0 |
| **Loaded here, written by hand** | **25** |

Five workers wrote them in parallel, each group on its own branch; this branch merged the five and regenerated the shared
files once.

| Group | Cards | Scenarios |
| --- | --- | ---: |
| A, planeswalkers | Teferi, Temporal Archmage; Teferi, Who Slows the Sunset; The Chain Veil; Brokers Ascendancy | 25 |
| B, copying abilities | Illusionist's Bracers; Rings of Brighthearth; The Peregrine Dynamo | 16 |
| C, artifacts | Clock of Omens; Dross Scorpion; Jan Jansen, Chaos Crafter; Marionette Master; Oni-Cult Anvil; Tempered Steel; Sting, the Glinting Dagger; Firdoch Core; Transguild Courier | 34 |
| D, battles and blocks | Brave the Sands; Invasion of Dominaria // Serra Faithkeeper; Invasion of Zendikar // Awakened Skyclave | 23 |
| E, colors and others | Leyline of the Guildpact; Coalition Victory; Fertile Ground; Queen Marchesa; Drogskol Reaver; Felidar Guardian | 26 |

## What was built (the Claude · Engine lane)

- **Battles** (CR 310, 506.3, 508.1b, 120.3h, 704.5v, 712.11a): Sieges. A battle carries its printed defense
  (`cards/index.mjs`, `compile.mjs`, `state/index.mjs`) and enters with that many defense counters
  (`rules/replacement.mjs`). As a Siege enters its controller chooses an opponent to protect it, set by itself with one
  opponent (`rules/entering.mjs`). Each opponent's battles are offered as attacks to everyone but their protector, who
  is the defending player for those attackers and blocks them (`rules/combat.mjs`, `battlesProtectedBy`). Damage
  removes defense counters (`script/effects/resources.mjs`); at 0 a battle is put into its owner's graveyard, but a
  Siege waits for its own trigger (`rules/sba.mjs`), which exiles it and lets its controller cast it transformed for
  nothing (`rules/trigger.mjs`; `rules/actions.mjs` and `rules/stack.mjs` put the back face on the stack). An attack on
  a battle is no attack on its protector: attack taxes, "attacks you" and "attacks an opponent" triggers, "the player
  with the most life", and `attacking` selectors all leave it out. ROB-149's battles.
- **Blocking an additional creature** (`rules/statics.mjs`, `blocksAllowed`, static rule `blocks-additional`;
  `rules/combat.mjs`; CR 509.1a, 510.1d): Brave the Sands. A blocker of two attackers divides its combat damage as its
  controller chooses.
- **"Whenever an ability is activated"** (`rules/trigger.mjs`, trigger word `ability activated`, `of: "equipped"`;
  CR 602.2, 605.3a, 707.10c): Rings of Brighthearth and Illusionist's Bracers copy it with the existing `copySpell`; a
  copy is not activated, so it triggers neither again. **"From another legendary source that's not a commander"**
  (`script/filter.mjs`, `fromSource`, `commander: false`; CR 113.7, 903.3): The Peregrine Dynamo.
- **Emblems' rules from the command zone** (`rules/statics.mjs`, `withEmblems`; `cards/index.mjs`, `EMBLEM_RULES`;
  CR 114.4): Teferi, Temporal Archmage's loyalty at instant speed; Teferi, Who Slows the Sunset's untap in each
  opponent's untap step and draw in each opponent's draw step (`rules/turn.mjs`, rule `draws-in-others-draw-step`).
  **Loyalty again** (`rules/statics.mjs`, `loyaltyAgain`, rule `loyalty-again`; `rules/actions.mjs`; CR 606.3): The Chain
  Veil, one more activation each time it resolves; its end-step loss reads `loyaltyThisTurn: false`
  (`script/condition.mjs`). `tap` and `untap` take an `only` selector (`script/effects/resources.mjs`): Teferi, Who
  Slows the Sunset's +1.
- **"Blocking or blocked by a Goblin or Orc"** (`script/filter.mjs`, `blockingOrBlockedByAttached`; CR 509.1g, 509.1h):
  Sting, the Glinting Dagger. **"Is all colors"** (`rules/statics.mjs`, rule `all-colors`; CR 604.3, 105.2):
  Transguild Courier.
- **"An additional one mana of any color"** (`cards/index.mjs`, `rules/trigger.mjs` `manaPicks`, `rules/actions.mjs`
  `manaPickable`; CR 106.1a, 605.1b): Fertile Ground, its color picked by the tapping player.
  **"If an opponent is the monarch"** (`script/condition.mjs`, `monarch: "opponent"`; CR 725.1): Queen Marchesa.

No new effect primitive, so the vocabulary count is unchanged. `vocabulary.mjs` gains the trigger event
`ability activated`; `docs/engine/PLAN.md` §12.2 names it.

Two corrections to the brief, the rules' way: a Siege may be attacked by its own controller (only its protector may not,
CR 310.9b), and the cast of a defeated Siege is a "may" (CR 310.12b). Marionette Master's life loss is its own power,
as its oracle text says.

## Ignores, named

Recorded in `docs/engine/gameplay-gaps-2026-10-21.md`, section 4. None is a fix:

- Battles: a protector who leaves the game, an attacker redirected or put onto the battlefield attacking, trample's
  assignment, excess damage and a copy's defense; the room's board and the house pilot do not show or choose battle
  attacks.
- Brave the Sands: "must be blocked" maximums count one block a blocker.
- Fertile Ground's land is left out of casts tapped for from untapped lands (its pick is made by hand).
- Teferi, Who Slows the Sunset's emblem draw comes before a held draw of the active player's.
- Firdoch Core keeps the Kindred type when animated.
- The Peregrine Dynamo reads a gone source as it is now; Illusionist's Bracers copy nothing for a creature sacrificed to
  its own ability.
- Untested: The Chain Veil with a planeswalker changing control, or with Oath of Teferi; the Leyline's opening-hand start.

## Proof

See the pull request: the card checker, the load's suite, the breaks file
(`game/tools/batch/breaks-upgrade-map-load-1124.py`), the census, and the engine suites the changes touch.
