# Card load, 2026-11-15: Rob's box and upgrade cards for D1, D3, D4, D5, D6 and D8

Rob, 2026-11-15: *"Load these cards into the game engine, merge into main when tests are successful and I can play them in a deck."* The
list is 28 cards by deck, each in the deck's box or an upgrade for it. Main was `5f5fe00d` (6,468 definitions). Linear: ROB-530.

`lane-boxes.json` here is the list. `node tools/library-engine-index.mjs --check-lane docs/engine/card-load-boxes-2026-11-15/lane-boxes.json`
reports every one final, and `tests/engine-boxes-load-1115.mjs` holds it.

## The review

| | Cards |
| --- | ---: |
| On the list | 28 |
| Playable before this load | 0 |
| Translated by the card compiler | 0 (every one was "an unknown sentence") |
| Written by hand here | **28** |
| Playable now | **28** |

Four workers wrote them in parallel, each in its own worktree and each group on its own branch; this branch merged the four and
regenerated the shared files once.

| Deck | In the box | Upgrade cards |
| --- | --- | --- |
| D1 | Garruk, Unleashed; Gideon Jura; Tamiyo, Field Researcher | Garruk Wildspeaker; Oath of Nissa |
| D3 | Heritage Reclamation | |
| D4 | Felothar, Dawn of the Abzan | |
| D5 | Hardened Tactician; Mjölnir, Hammer of Thor; The Sentry, Golden Guardian | Mathas, Fiend Seeker; Kardur, Doomscourge; Bloodthirsty Blade |
| D6 | Improvised Club | |
| D8 | Comet Storm; Dictate of Kruphix; Heartbeat of Spring; Heroes' Reunion; Jace Beleren; Lazotep Plating; Minds Aglow; Rites of Flourishing; Selvala, Explorer Returned; Tempt with Discovery; Veteran Explorer | Plea for Guidance; Sarpadian Empires, Vol. VII; Moon-Blessed Cleric |

## What the engine needed

| Card | What it needed | Scenarios |
| --- | --- | ---: |
| Gideon Jura | "Creatures that player controls attack Gideon if able" for the opponent's next turn; he becomes a 6/6 creature with damage to him prevented | 10 |
| Tamiyo, Field Researcher | A draw whenever either of two creatures deals damage; two permanents that skip their next untap; an emblem that casts for free | 15 |
| Garruk, Unleashed; Garruk Wildspeaker; Jace Beleren | Loyalty abilities, Beast tokens, a conditional loyalty counter, an emblem that tutors | 11, 7, 7 |
| Oath of Nissa | Mana of any color to cast planeswalker spells; look at three, take a creature, land or planeswalker | 9 |
| Mathas, Fiend Seeker | A bounty counter and an ability the creature has for as long as it has one | 8 |
| Kardur, Doomscourge | Opponents' creatures attack, and attack another player, until your next turn; a drain whenever an attacker dies | 11 |
| Bloodthirsty Blade | "Equipped creature is goaded"; attaching to an opponent's creature at sorcery speed | 9 |
| Mjölnir, Hammer of Thor | Doubled damage; equip worthy; a discard-from-hand ability | 11 |
| The Sentry, Golden Guardian | The Void created under the opponent's control | 5 |
| Felothar; Hardened Tactician; Improvised Club | A reflexive "when you do"; a token sacrifice cost; a sacrifice as an additional cost | 6, 4, 4 |
| Comet Storm | **Another target for each time it was kicked**, and X damage to each | 8 |
| Minds Aglow | **Join forces**: each player, from the caster, pays any amount | 8 |
| Heartbeat of Spring | **One more mana of a type the land produced**, the tapper choosing the type | 10 |
| Rites of Flourishing; Dictate of Kruphix | An extra draw each draw step; an extra land play for every player | 7, 6 |
| Selvala, Explorer Returned | Parley: each player reveals, mana and life for each nonland, each draws; not a mana ability | 5 |
| Tempt with Discovery | **A tempting offer**: each opponent may search; once more for each who did | 7 |
| Veteran Explorer; Plea for Guidance; Moon-Blessed Cleric | Each player may search for two basic lands; search for two enchantments; search and put one on top | 8, 7, 7 |
| Sarpadian Empires, Vol. VII | "As it enters, choose" one of five color and type pairs; a token of the pair | 7 |
| Heritage Reclamation | Three modes, one with "up to one target" and a draw | 9 |
| Lazotep Plating; Heroes' Reunion | Amass with hexproof for you and your permanents; seven life | 6, 4 |

## What was built (the Claude · Engine lane)

- **Attack a planeswalker if able** (`rules/statics.mjs` `mustAttackPlaneswalkers`, `rules/combat.mjs` `owedPlaneswalkers`,
  `requiresOf`, `attackers`; `effects/permanents.mjs` `effectUntil` `rule: "attacks-planeswalker"`, `until: "their-next-end"`;
  `rules/turn.mjs`): a creature required to attack a planeswalker is offered only that one, and a declaration that leaves it out is refused
  with what to do; one that cannot attack it is not required (CR 508.1d, 506.3, 508.1c, 611.2c, 514.2).
- **A permanent that skips its next untap** (`effects/resources.mjs` `tap` `noUntap`, `rules/turn.mjs`; CR 502.3).
- **A delayed trigger that watches a list** (`effects/permanents.mjs` `watchEach`, `rules/trigger.mjs`; CR 603.7c) and **damage to anything**
  (`cards/index.mjs` `damageDealt`, `trigger.mjs` `toAnything`, once for each source: CR 510.2, 603.2c).
- **A free cast read from the command zone** (`statics.mjs` `freeCast`, `cards/index.mjs`; CR 114.4).
- **Spending mana as though of any color** for a spell's own caster (a static `spend-as-any-color`, `actions.mjs` `castCost`, `anyTypeCost`,
  `castTapPlans`; CR 609.4b).
- **A static goad** (`statics.mjs` `goaded`, `staticGoaders`, `isGoaded`; `filter.mjs`) and **"attack a player other than you if able"** for a
  while (`attacks-other-than-you`; CR 701.15b, 508.1d, 611.2c).
- **An effect's given abilities compiled as a static's** (`cards/index.mjs` `compileGivenIn`; CR 611.2b, 613.1f): Mathas's dies trigger
  actually fires now.
- **Another target for each kick** (`script/bind.mjs` `countOf`, `schema.mjs`, `actions.mjs` `cast.kicked`; CR 702.33c, 601.2c).
- **Join forces** (`effects/asking.mjs` `unlessPays` `joinForces`, `schema.mjs`; CR 207.2c): each player in turn order from the caster picks
  any amount they can pay; the total is X.
- **The tapper picks the type** for "one more mana of a type that land produced" (`trigger.mjs` `manaTriggered`, `manaPicks`; `actions.mjs`
  `manaPickable`, `tapUnits`, `sameAction`; `scenario.mjs` `pick`; `room/room.mjs` label). This also fixes Mirari's Wake and Zendikar
  Resurgent on a land that makes two types.
- **An extra land play for every player** (`statics.mjs` `eachPlayerStatics`, `actions.mjs` `landDropsLeft`; CR 305.2).
- **A library-moving ability is not a mana ability** (`cards/index.mjs` `manaAbility`; CR 605.1a): Selvala uses the stack.
- **"For each player who did"** (`effects/index.mjs` `repeatFor` `each: "who did"`; CR 207.2c, 101.4, 800.4a).

No new effect primitive, so `vocabulary.mjs`, `PLAN.md` §12.2 and the vocabulary count are unchanged.

## Ignores, named

Recorded in `docs/engine/gameplay-gaps-2026-10-21.md`, section 4. None is a fix: Gideon's goad-or-attack choice and attacker caps, Oath of
Nissa's Phyrexian symbols, Tamiyo's untap controller and its once-for-each-damage-event reading (the Gatherer ruling is not checked),
goaded creatures added to the declaration rather than asked, activated abilities offered only once their mana is floated (Mjölnir,
Bloodthirsty Blade, Hardened Tactician, Sarpadian Empires), and four untested edges.

## Proof

See the pull request: the card checker, the suite, the breaks file, the census, and the engine suites the changes touch.
