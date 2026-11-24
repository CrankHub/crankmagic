# Card load, 2026-11-23: Rob's Ninja deck

Rob, 2026-11-23, pasting a Commander deck of white, blue and black Ninjas (the Teenage Mutant Ninja Turtles cards, Kaito,
Yuriko, sneak and ninjutsu): *"Make sure all of these cards are playable. Load those that aren't currently."* Main was
`59b9f862` (6,538 definitions). Linear: ROB-540.

`lane-ninja.json` here is the list: the 51 names that already played (`source.playableBefore`) and the 29 loaded here
(`cards`, each with its group). `tests/engine-ninja-deck-load-1123.mjs` holds it: every one of the 80 names, read as the deck
importer reads them, is a definition every table plays, and each of the 29 runs its scenarios.

## The review

| | Cards |
| --- | ---: |
| Distinct names on the list (79 in the deck, 99 cards with the basics, and Splinter, Radical Rat set apart) | 80 |
| In the oracle data | 80 |
| Playable before this load | 51 (Splinter, Vengeful Sensei is Ink-Eyes, Servant of Oni's flavor name) |
| Compiler candidates among the rest | 0 |
| **Loaded here, written by hand** | **29** |

Five workers wrote them in parallel, each group on its own branch; this branch merged the five and regenerated the shared
files once.

| Group | Cards | Scenarios |
| --- | --- | ---: |
| A, sneak | Dark Leo & Shredder; Donatello's Technique; Foot Ninjas; Karai, Future of the Foot; Oroku Saki, Shredder Rising; Shark Shredder, Killer Clone; The Last Ronin's Technique; Turncoat Kunoichi | 31 |
| B, ninjutsu | Kaito, Bane of Nightmares; Nashi, Moon Sage's Scion; Satoru Umezawa; Silver-Fur Master; Walker of Secret Ways; Splinter, Radical Rat | 38 |
| C, tokens and a planeswalker | Kaito, Cunning Infiltrator; Endless Foot Assault; Foot Chopper; Arcade Cabinet; Donatello, the Brains; Momo, Playful Pet | 38 |
| D, lands and statics | Hidden Lair; Turtle Lair; Fugitive Droid; Game Over; Prehistoric Pet; Taeko, the Patient Avalanche; Don & Leo, Problem Solvers | 45 |
| E, new rules | Krang & Shredder; Ninja Teen | 19 |

## What was built (the Claude · Engine lane)

- **Sneak tapped for** (`rules/actions.mjs`, `sneakWay`, `castOffers`, `tapCastable`, `castTapPlans`; CR 702.190a, 118.9): a
  sneak cast is offered from untapped lands in the declare blockers step, and its lands tapped for the sneak cost. Before,
  it was offered only with its mana already floating, so at a table (whose pod sets the `*Taps` flags) no sneak was offered at
  all: Leonardo, Leader in Blue and Splinter, Hamato Yoshi too.
- **"If its sneak cost was paid" as the source last was** (`rules/stack.mjs`, `script/resolution.mjs`; CR 608.2h): Turncoat
  Kunoichi killed in response still exiles for good.
- **Ninjutsu given** (`rules/layers.mjs`, `ninjutsuGiven`, static rule `grants-ninjutsu`; CR 702.49a, 613.1f): Satoru Umezawa's
  "each creature card in your hand has ninjutsu {2}{U}{B}". **"Whenever you activate a ninjutsu ability"** (`rules/trigger.mjs`,
  trigger word `ninjutsu activated`). **Ninjutsu abilities cost {1} less** (`rules/statics.mjs`, `abilityCostReduction`;
  CR 601.2f): Silver-Fur Master.
- **A card played by permission paid with life equal to its mana value** (`script/effects/zones.mjs`, `mayPlay`;
  `script/schema.mjs`; CR 118.9): Nashi, Moon Sage's Scion. `tests/engine-play-from-zones.mjs` had held this shape refused;
  it is legal now, on purpose, and that suite holds its edges.
- **Squad** (`cards/index.mjs`, `rules/actions.mjs`, `rules/stack.mjs`, `rules/trigger.mjs`, `script/condition.mjs`,
  `script/amount.mjs`; CR 702.157a): paid any number of times, up to ten, a token copy for each. Endless Foot Assault.
- **"Can't be blocked if ..."** reads its condition (`cards/index.mjs`, `RULES_READING_A_CONDITION`; CR 509.1b): Fugitive
  Droid. `tests/engine-cards-x11-b2.mjs` used `cant-be-blocked` as its example of a rule that reads none; it now uses
  `cant-be-blocked-by`, which still reads none.
- **Can't be blocked by creatures with greater power** (`rules/statics.mjs`, `byPowerAboveSource`; CR 509.1b): Prehistoric Pet.
- **The fewest life among the players** (`script/amount.mjs`, `lifeTotal: "fewest"`; CR 119.1): Game Over's cost.
- **One move of two targets together** (`script/bind.mjs`, `objectsOf`; CR 608.2c): Don & Leo.
- **A dig's exiled card linked to its source** (`script/effects/zones.mjs`, `digUntil`, `link`; CR 607.2a): Krang & Shredder.
- **Sneak given to graveyard creature cards, and cast from there by it** (`rules/actions.mjs`, `alternativeCosts`,
  `castOffers`, `graveSneakTap`, `nothingToDo`; static rules `sneak` and `sneak-from-graveyard`; CR 702.190a, 601.3): Ninja
  Teen's level 3, tapped for from untapped lands as a sneak from the hand is.

No new effect primitive, so the vocabulary count is unchanged. `vocabulary.mjs` gains the keyword `squad` and the trigger
event `ninjutsu activated`; `docs/engine/PLAN.md` §12.2 names the event.

## Ignores, named

Recorded in `docs/engine/gameplay-gaps-2026-10-21.md`, section 4. None is a fix:

- Turtle Lair's mana that only a Ninja or Turtle spell may spend is offered only once it is tapped and floating, as Haven of
  the Spirit Dragon's and Cavern of Souls' are.
- Karai, Future of the Foot sneaked and gone before her trigger resolves returns the card to hand, not the battlefield.
- Squad is paid at most ten times, and a second squad on one card (CR 702.157b) is not built. Under a token doubler, Foot
  Chopper is attached to the first Ninja, not one its controller picks (as Dáin Ironfoot's Axe).
- Untested: a copy of Satoru Umezawa; which attacker a ninjutsu returns (the scenario runner takes the first offer); Kaito,
  Bane of Nightmares with no loyalty counters on his own turn (he is put into the graveyard first).

## Proof

See the pull request: the card checker, the load's suite, the breaks file
(`game/tools/batch/breaks-ninja-deck-load-1123.py`), the census, and the engine suites the changes touch.
