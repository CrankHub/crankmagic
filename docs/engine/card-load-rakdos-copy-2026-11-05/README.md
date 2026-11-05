# Card load, 2026-11-05: Rob's Rakdos copy and legends list

Rob, 2026-11-04, pasting a Commander list: *"Don't add these to my spreadsheet, but evaluate how many the engine doesn't know, then plan
their load as a new body of work once the current is done."* And 2026-11-05: *"Deadpool leave out. Create new rules to support those edge
cases (new cards are always printed. May need them as a rule in the future). Handwrite the required that remains and update the engine.
Then identify all other cards that can be playtest-only candidates, and create a bulk load instruction set that you'll run once we're done
with the current work."* Linear: ROB-442 (the load), ROB-443 to ROB-447 (its rules). The list is not in the workbook, and the workbook was
not touched. It is built on PR 998 (ROB-441), whose branch it stacks on.

`lane-rakdos-copy.json` here is the list: 82 distinct cards, 99 copies (10 Mountain, 9 Swamp among them). It names **81 cards** and holds
Deadpool, Trading Card apart under `leftOut`. `node tools/library-engine-index.mjs --check-lane
docs/engine/card-load-rakdos-copy-2026-11-05/lane-rakdos-copy.json` reports every one of the 81 final, and
`tests/engine-rakdos-copy-load.mjs` holds it.

## The review

| | Cards |
| --- | ---: |
| On the list | 82 |
| Playable before this load (a definition every table plays) | 58 |
| Translated by the card compiler, read and promoted (keywords alone) | 2: Dalek Squadron, Tiamat's Fanatics |
| Written by hand here | 21 |
| Left out (Rob) | 1: Deadpool, Trading Card |
| Playable now | **81 of 82** |

## The 21 written, and what each needed

| Card | What it needed | Scenarios |
| --- | --- | ---: |
| The Master, Multiplied | **The legend rule not applying** to creature tokens you control; **a triggered ability can't make you sacrifice or exile** them; myriad | 10 |
| Mirror Box | The legend rule not applying to your permanents; +1/+1 to legendary creatures; **+1/+1 for each other creature you control with its name** (nontoken only) | 7 |
| Jaxis, the Troublemaker | **Blitz** ({1}{R}, haste, "when this dies, draw a card", sacrificed at the end step); copy another creature, hasty, drawing when it dies | 9 |
| Mordor on the March | Storm; **a token copy of a card** exiled from a graveyard (a copy of a card, not of a permanent); haste; exiled at the end step | 6 |
| Mimic Vat | **Imprint**: exile a dying nontoken creature, return the other card it holds (to its owner's graveyard); `{3}, {T}`: a hasty token copy of the exiled card | 8 |
| Mirror March | **A coin flipped until a flip is lost**, a token copy of the creature for each flip won, hasty, exiled | 7 |
| Delina, Wild Mage | **A d20 with rows** ("1-14 | ...", "15-20 | ...") and **"you may roll again"**; a tapped and attacking token copy, not legendary, exiled at end of combat | 8 |
| Shredder, Shadow Master | A token copy of the attacker **attacking each other opponent**, not legendary, sacrificed at end of combat; **half their life, rounded up** | 6 |
| Mirage Phalanx | **Soulbond**: a pairing, ended by itself; a granted ability for each of the pair; a copy that **loses soulbond** | 10 |
| Elturel Survivors | Trample, myriad, and **+X/+0 for the lands defending player controls** while it attacks (a token copy attacks another player, so counts that player's) | 6 |
| Éomer, Marshal of Rohan | **"One or more other attacking legendary creatures you control die"**: attacking as it died; untap, an additional combat, once each turn | 6 |
| Banshee of the Dread Choir | Myriad; combat damage to a player makes that player discard | 7 |
| Raphael, Tough Turtle | Another creature entering deals 1 damage to a target opponent | 6 |
| Dark Privilege | An Aura: +1/+1, "sacrifice a creature: regenerate enchanted creature" | 7 |
| Heroes' Podium | Legendary creatures get +1/+1 for each other legend; `{X}, {T}`: look at X, take a legendary creature | 10 |
| Urabrask's Forge | An oil counter each combat and a token as large as the counters, trample, haste, sacrificed | 5 |
| Come Back Wrong | Destroy, then return the creature under your control, sacrificed at the end step | 8 |
| Blade of Selves | Equip {4}; equipped creature has myriad | 9 |
| Firbolg Flutist | Gain control of a creature until end of turn, untap, haste, myriad | 6 |
| Flameshadow Conjuring | Pay {R}: a hasty token copy of a creature that entered, exiled at the end step | 10 |
| Rionya, Fire Dancer | Copies of another creature, as many as the instants and sorceries you cast, plus one | 9 |

(Banshee through Rionya were written by a worker; every one was run again here, with the census and a mutation check. Dalek Squadron
and Tiamat's Fanatics each have the one scenario the compiler drafted and a reviewer read.)

## What was built (the Claude · Engine lane)

- **The legend rule not applying** (`rules/statics.mjs` `legendRuleOff`, `rules/sba.mjs`): a static `rule: "legend-rule-off"` whose
  `affects` names the permanents it does not apply to, from its controller's side; such a permanent is in no group of one name.
- **A triggered ability that can't sacrifice or exile** (`statics.mjs` `triggerRemovalBlocked`, `effects/zones.mjs`
  `sacrificeOne`, `moveZone`, `moveZoneAll`; `rules/stack.mjs`, `script/resolution.mjs`): a static `rule: "triggers-cant-remove"`,
  `how` the ways. Only while a triggered ability of the protected permanent's controller is resolving (`context.triggered`, set for a
  trigger's stack entry); a spell, an activated ability, a state-based action or an opponent's trigger still can.
- **Blitz** (`cards/index.mjs`, `rules/stack.mjs`, `vocabulary.mjs`): the alternative cost as dash's is; the permanent has haste and
  "when this creature dies, draw a card", and a delayed trigger sacrifices it at the next end step.
- **The same name** (`script/filter.mjs` `sharesNameWithIt`): another with the name of the object a layer-7 amount is counted for.
- **`flipCoin`** (a new effect primitive: `effects/resources.mjs`, `vocabulary.mjs`, `PLAN.md` §12.2): "flip a coin", `count` times, or
  `until: "lose"`; the flips won are `{flipsWon: true}` (`script/amount.mjs`). From the game's random stream, said to everyone
  (`GameEventCoinFlipped`, the room's history line).
- **A die with rows** (`script/resolution.mjs`, `script/schema.mjs`, `cards/index.mjs`): `rollDie` with `rows`, each `{from, to, effects}`
  covering every result exactly once, a row that rolls again (`again: "may"` asks, `"must"` does not). Existing dice are unchanged.
- **`rng.roll(sides)`** (`rng.mjs`) and a scenario's **`rolls`** (`cards/scenario.mjs`): one call for a die or a coin, which a scenario
  can pin so a card with chance is proved, not hoped for. A flip is a die of two sides; 1 wins it.
- **Half, rounded up** (`script/amount.mjs`): `half: "up"` beside `half: true` (down).
- **Soulbond** (`cards/index.mjs`, `effects/permanents.mjs` `pair`, `rules/sba.mjs` `endPairings`, `script/filter.mjs`, `rules/layers.mjs`;
  a new effect primitive, `PLAN.md` §12.2): the keyword is two triggered abilities (this entering; another creature of yours entering),
  a pairing is state on both creatures and ends by itself when either leaves, stops being a creature or changes controller (CR 702.95e);
  `paired` and `pairedWithSource` ("each of those creatures") select it; a copy's `except.removeKeywords` makes "loses soulbond".
- **The lands defending player controls** (`script/filter.mjs`): `controller: "defending player"` is the player the creature a count is made
  for attacks.
- **Attacking, as it died** (`rules/layers.mjs` `lastKnown`, `script/filter.mjs`): a filter on a creature that has left may say
  `attacking: true`.
- **`repeatFor` keeps what a pass remembers** (`effects/index.mjs`): `rememberMore` inside a repetition that does not ask was lost with the
  pass; Shredder's "sacrifice those tokens" needs it.
- **At end of combat** is a step a triggered ability may name (`cards/index.mjs`, `STEPS`); the end-of-combat exile of Delina's token.
- **Scenarios** may say `token` of a `tapped` expectation, as they could of `stats` and `keywords`.

## Ignores (recorded in `gameplay-gaps-2026-10-21.md`, section 4)

- **Deadpool, Trading Card:** left out, Rob's call.
- **Flameshadow Conjuring:** a creature gone before the trigger resolves is not copied (a table uses last known information); and it asks a
  forced "Don't pay" when no {R} is available.
- **Coin flips:** no call, and nothing modifies or watches a flip yet.
- **Alternative costs from untapped lands** (Jaxis's blitz): the known gap, #628/#657; proved with the mana in the pool.

## The bulk load

`bulk-load-runbook.md` and `bulk-load.json` are the instruction set Rob asked for: the 128 playtest-only candidates the compiler makes now
(it made 100 before these 23 cards taught it), the 40 sentences that complete 287 of the 12,086 cards one sentence short, and the 45 lanes
of the 1,233 most-played cards no table plays. Nothing in it has been run.

## Proof

<!-- PROOF -->
