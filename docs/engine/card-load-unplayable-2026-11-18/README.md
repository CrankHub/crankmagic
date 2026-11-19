# Card load, 2026-11-18: Rob's "Unplayable Cards" workbook

Rob, 2026-11-18, with the workbook *Unplayable Cards 2026-11-18.xlsx*: *"Make these cards playable in the game today."* Then:
*"prioritize pushing [the cards for my 8 Dx-A decks] to staging now over the additional branches."* Main was `5c9c5c1a`
(6,496 definitions). Linear: ROB-531.

`lane-unplayable.json` here is the list: the workbook's "Not in the engine" rows from both sheets, 42 distinct cards, each
with its decks, where it is (the boxes D1-A to D8-A, the designs, or both) and whether it is loaded here (`loadedHere`).
`tests/engine-unplayable-load-1118.mjs` holds it.

## The review

| | Cards |
| --- | ---: |
| On the list | 42 |
| In the oracle data (2026-10-04) | 42 |
| Playable before this load | 0 |
| **Loaded** | **42**: 36 in the first pull request (the six box cards among them), group E's 6 in the second |
| Not in the oracle data (Star Trek, 2026-11-13; ROB-532) | 4 more, outside the 42 |

Six workers wrote them in parallel, each group on its own branch. The first pull request merged five groups and
regenerated the shared files once, so the box cards reached staging first; the second merged group E on top of it.

| Group | Cards | Scenarios |
| --- | --- | ---: |
| A, equipment | Dwalin, Weaponmaster; Dáin Ironfoot; Gold Pan; Stormbeacon Blade; Quintessential Katana; Wingnut, Bat on the Belfry; Starry-Eyed Skyrider | 33 |
| B, spells and power-up | Razzle-Dazzler; Poised Practitioner; Devoted Duelist; Aerial Doombot; Ultron Drone; **Guiding Hydra**; Flitterwing Nuisance | 45 |
| C, exile and graveyard | The Great Goblin; Gila Courser; Jessica Jones, Private Eye; Night Nurse, Healer of Heroes; Bre of Clan Stoutarm; Stoic Grove-Guide; **Vindictive Triumph** | 42 |
| D, tokens | Genghis Frog; Slithering Cryptid; H.E.R.B.I.E. Scout Unit; Harrier Strix; Dwynen's Elite; Nezumi Linkbreaker; Underfoot Underdogs | 21 |
| E, the hardest | Gandalf (the S0-D6 commander); Bolg of the North; Gorbag of Minas Morgul; Inspired Tethermage; Arwen Undómiel; Scavenger Regent // Exude Toxin | 49 |
| F, statics | **Captain America, Living Legend**; **Rocksteady, Crash Courser**; **Moon-Vigil Adherents**; **Kenrith, the Returned King**; Alesha's Legacy; Mirkwood Meditator; Krotiq Nestguard; Eagles of the North | 43 |

The six in bold are the box cards (D2-A Chulane, D3-A Ghalta, D4-A Felothar, D5-A Tymna + Kraum, D8-A Kenrith twice).

## What was built (the Claude · Engine lane)

- **A hone counter** (`rules/layers.mjs`, `gatherEffects`; CR 122.1, 613.4c, 301.5): on an Equipment, +1/+0 to the creature it
  is attached to, as the Equipment's effect in layer 7c, not an ability it can lose. Dwalin, Weaponmaster.
- **A created token's own abilities are its own** (`script/bind.mjs`, `targetRefs`; CR 111.3, 111.4, 602.2b): the Axe's equip
  and the Mercenary's "{T}: target creature…" no longer count as targets the creating effect must declare. Dáin Ironfoot,
  Nezumi Linkbreaker.
- **Power-up** (`cards/index.mjs`; `rules/actions.mjs` `poweredUp`, `costOf`, `withinLimit`; CR 702.193a-b, 118.7, 601.2f):
  once by this object, its mana reduced by the permanent's mana cost the turn it entered. Aerial Doombot, Ultron Drone.
- **The mana value a permanent last had** (`rules/layers.mjs` `lastKnown`, `script/filter.mjs` `matchesLastKnown`; CR 202.3,
  608.2h, 707.2): "if that permanent's mana value was 3 or less". A spell's record has none and is refused. Vindictive Triumph.
- **A card put in its zone this turn** (`script/filter.mjs` `arrivedThisTurn`; CR 400.7). Night Nurse, Healer of Heroes.
- **The first time a permanent has become tapped this turn** (`rules/trigger.mjs` `recordTaps`, `script/condition.mjs`
  `firstTappedThisTurn`; CR 701.26a, 603.4). Captain America, Living Legend.

- **"Whenever you scry"**, a surveil not among them (`cards/index.mjs` `scried`, `rules/trigger.mjs`; CR 701.22a, 701.25a).
  Arwen Undómiel.
- **A reflexive trigger's modes chosen as it goes on the stack** (`effects/permanents.mjs` `immediateTrigger`; CR 603.12,
  603.3c, 700.2b). Gorbag of Minas Morgul.
- **Counters a cost puts on, seen** (`rules/actions.mjs` `payCounters`; CR 122.6, 606.4): a loyalty ability's [+1] is
  putting loyalty counters. Inspired Tethermage.
- **An omen card** (`script/schema.mjs`, `cards/index.mjs`; CR 720.2, 720.3d): written as an Adventure is, its spell shuffled
  into its owner's library as the last of its resolution. Scavenger Regent // Exude Toxin.
- **The census reads a choice inside a mode as no bulleted mode** (`game/tools/interaction-census.mjs`). Gandalf.

No new effect primitive, so `vocabulary.mjs`, `PLAN.md` §12.2 and the vocabulary count are unchanged.

## Ignores, named

Recorded in `docs/engine/gameplay-gaps-2026-10-21.md`, section 4. None is a fix:

- Activated abilities offered only once their mana is floated by hand (the census advisory ACTIVATION_ONLY_WHEN_FLOATED):
  Gold Pan, Stormbeacon Blade and Quintessential Katana's equip; Harrier Strix; Underfoot Underdogs; Bre of Clan Stoutarm;
  Stoic Grove-Guide; Rocksteady's forestcycling and Eagles of the North's plainscycling; Kenrith's first four; Krotiq
  Nestguard; the power-ups.
- A spell cast from exile by a may-play permission (The Great Goblin, Gila Courser, Jessica Jones) is offered only once its
  mana is floated.
- Dáin Ironfoot with a token doubler attaches only the first Axe; Captain America's two rare orders of taps (untapped by
  something else before the trigger resolves; tap, untap and tap in one action) are read one way, the Gatherer ruling not
  checked.
- Untested: a second blocker refused for Rocksteady or a Boar (the scenario runner cannot write a refused block; the rule is
  Safewright Cavalry's, `tests/engine-libload-l4-combat.mjs`); Krotiq Nestguard refused as an attacker without its ability;
  power-up's reduction by a hybrid, Phyrexian or X symbol; a transformed back face's power-up; a created token's ability's
  own targets are checked by nothing (they never were, against themselves).

## Proof

See the pull request: the card checker, the suite, the breaks file, the census, and the engine suites the changes touch.
