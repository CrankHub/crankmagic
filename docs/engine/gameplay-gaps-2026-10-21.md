# What still plays differently from a physical table (2026-10-21)

Rob, 2026-10-21: *"This game is extremely deterministic in the functionality and specificity of what cards do, and the
combinations of 100 cards out of 35,000+ creates a hyper complex and interesting data architecture and interaction
project. We can't skip on any part."* This is the full list of what does not yet play as it would at a table of people:
cards the table refuses, cards that play differently, choices the engine makes for a player, and checks that step around
a card instead of proving it. It is the work list. An item leaves it when the behavior is correct, never when a check
stops looking at it.

**The words, as Rob uses them** (also in AGENTS.md's spirit, "a test that cannot fail is a comment"):
- **Fix:** the card or rule now behaves as at a physical table, proved by scenarios or a suite.
- **Ignore** (or skip, workaround): a card, case or check is excluded, retargeted or loosened while the behavior stays
  wrong or unproven. An ignore is always named as one, and stays on this list.

**State:** main `1d385054` (library load lanes L2, L3, L4 and L6 merged), plus `claude/engine-sentence-paragraphs` (the
Gemstone Caverns item in section 1). Open: L1 (#831), L5 (#829); the candidate review (lane 7) never ran.

**Sources:** the bodies and comments of all 832 pull requests; the repository's documents (`docs/ACTIVE.md`, the
handoffs, `docs/engine/**`, the lane files); the engine's code and suites; Linear. Each line names where it was recorded.
"Checked" marks the items read again in the code for this list; the rest are as recorded and not reproduced in a game.

## 1. This week's two ignores, and what became of them

| Item | What was done | Now |
| --- | --- | --- |
| Gemstone Caverns in `engine-compile`'s held-out sample | #830 (`cc895e5f`) excluded cards the sentence library writes half an ability of. **An ignore.** | **Fixed** in `claude/engine-sentence-paragraphs`: a paragraph is one ability (CR 113.2c), so a paragraph the library knows only in part goes to the writer whole (`game/engine/cards/sentences.mjs`, `partialTranslate`). The exclusion is removed; Gemstone Caverns is sampled again and passes. The card itself always played right at the table (its scenario "With a luck counter, instead one mana of any color -- and no {C}"); what was wrong was how the compiler learns a card like it. |
| `tests/card-waves.mjs` on Windows | Left failing in #830 as "Windows path separators only". | **Fixed** in the same branch: the test compares where each file landed in "/" whatever the system's separator. |
| Black Knight in `tests/card-compiler.mjs` | Its example of a vetoed card became Vodalian Zombie once L4 defined Black Knight. The test's subject changed; the veto is not fixed. | **Open.** Calibration charges Goblin Piledriver's failed attack-trigger template to every template the card used, so "protection from COLOR" is distrusted and **18 cards are vetoed** (Vodalian Zombie and 17 others; `docs/engine/card-compiler-2026-10-19.md`:30). Fix: charge a failure to the template that failed, or fix Goblin Piledriver's attack template. |

## 2. Rob's seven live decks: cards the table refuses on main today (22)

| Card | Deck | Why | Where the work is |
| --- | --- | --- | --- |
| Grist, the Hunger Tide | D1 | "repeat this process"; a static that works off the battlefield (CR 113.6c) | built in #831 (open) |
| Oath of Teferi | D1 | loyalty abilities twice a turn; a delayed return | #831 |
| Ajani Steadfast | D1 | emblems (CR 114); "prevent all but 1" | #831 |
| Ajani, the Greathearted | D1 | a loyalty counter on each other planeswalker | #831 |
| Carth the Lion | D1 | an extra [+1] on loyalty costs (CR 606) | #831 |
| Garruk Relentless | D1 | a planeswalker that transforms | #831 |
| Interplanar Beacon | D1 | two different colors, for planeswalker spells only | #831 |
| Mordenkainen | D1 | exchange hand and library (CR 701.12d); emblem | #831 |
| Teferi, Hero of Dominaria | D1 | emblem; delayed untap | #831 |
| The Wandering Emperor | D1 | loyalty abilities at flash timing the turn she entered | #831 |
| Vraska, Relic Seeker | D1 | "life total becomes 1" | #831 |
| Way of the Mentor | D1 | loyalty counters on gaining life | #831 |
| Teferi, Time Raveler | D7 | opponents cast only at sorcery timing (CR 307.5); sorceries with flash | #831 |
| **Nethroi, Apex of Death** | D4 | **mutate (CR 702.140, 721): merged permanents and the "mutates" trigger; stopped, not built** | no lane |
| **Boromir, Warden of the Tower** | D7 | **"the Ring tempts you" (CR 701.54): the Ring emblem, the Ring-bearer and its four abilities; stopped** | no lane |
| Plumb the Forbidden | D5 | "sacrifice one or more" as an additional cost, and its reflexive copy trigger | built in #829 (open) |
| Ruthless Lawbringer | D5 | a reflexive "when you do" after an optional sacrifice | #829 |
| Wall of Shards | D4 | cumulative upkeep paid by an opponent gaining 1 life | #829 |
| Dark-Dweller Oracle | D6 | exile the top card, play it this turn | #829 |
| Blossoming Defense | D3 | a compiler candidate: playtest tables only, never reviewed | the candidate review (never ran) |
| Goblin Sledder | D6 | the same | the candidate review |
| Absorb | D7 | the same | the candidate review |

All 449 design-deck cards are final, both design commanders (Kaalia, Kynaios) and D7's Queza among them. Load Live still
reads the 9-30 Master; moving it to the 10-21 library is ROB-186 (Rob's call).

## 3. Rob's library outside the decks: not playable on main (25)

- Waiting on #831: Hedron-Field Purists (level up), Stingerquill Voxmancer // Vicious Verse, Woodwork Prodigy // Soul
  Tether (prepare). Teferi, Mage of Zhalfir needs #831's sorcery-timing rule, then its own definition.
- Waiting on #829: Acrobatic Cheerleader, Blacksnag Buzzard (plot, CR 702.170), Zimone, Bear Trap, Boilerbilges Ripper,
  Fear of Immobility, Gold Rush, Hovel Hurler, Ruric Thar, Sunbond, Tenured Tethermage, Verdant Kraken.
- **Cunning Wish, Extrapolate the Impossible:** cards from outside the game (CR 400.11); not built. ACTIVE.md says a wish
  "does nothing in Commander", the L2 lane that it waits on the construct; Rob's ruling decides which.
- **Bludgeon Brawl:** an equip cost counted from the artifact's own mana value; the Equipment subtype granted in layer 4,
  its set fixed as it applies (CR 613.6); a granted +X/+0 per artifact; the unattach when it leaves (CR 704.5n).
- **Ichor Elixir:** planar dice (CR 901.9, Planechase). Rob backlogged it (ROB-187).
- Candidates never reviewed: Ankle Biter, Hydroblast, Pyroclasm, Scarblade Scout, Voracious Varmint.

## 4. Defined, but plays differently from a physical table

| Card or cards | What differs | Recorded |
| --- | --- | --- |
| Urza's Saga | III searches "mana value 1 or less", not "mana cost {0} or {1}": a colored one-drop artifact (Esper Sentinel) is found, and should not be. **Checked.** | #547 |
| Elspeth, Sun's Champion | The -7 emblem is two lasting effects with no emblem object: the board shows no emblem. **Checked.** | #637 |
| Token copies of a shock land | Enter untapped for free: "unless you pay 2 life" is never asked of a token. **Checked** (`permanents.mjs`). | code |
| Innocuous Rat (manifest dread) | CR 701.40f: a chosen card that can't enter should go to the graveyard; not handled | #828 |
| Plumb the Forbidden | No copies if it leaves the stack before its reflexive trigger resolves; last known information unsettled | #829 |
| Reverberate, Dualcaster Mage, Double Vision, Flare of Duplication, Narset's Reversal, Thousand-Year Storm, Jin-Gitaxias, Echoes of Eternity | A copy of an "up to N targets" spell keeps the original targets; "you may choose new targets" is not offered | `asking.mjs`:1559 |
| Any protection from a color | Damage from a source that has left the battlefield is treated as from no source, so protection does not stop it (a dead red creature's trigger) | `asking.mjs`:1693 |
| Wirewood Symbiote, Quirion Ranger; any cost or effect returning a commander to hand from the battlefield or the library's top | The command-zone choice (CR 903.9b) is not offered | `commander.mjs`:43 |
| Torbran, Fiery Emancipation and other damage doublers | Where nobody can be asked, the order that deals the least is applied | #533, #579, #582 |
| Metallic Mimic, Mirrormade, Sculpting Steel | Type chosen after it enters; a copy of a copy not asked again; Mimic misses the copied type | #543, #546 |
| Station cards (Wurmwall Sweeper) | N+ abilities checked again as they resolve, where by the rules they would still resolve | #545 |
| Song of the Dryads; Sagas under ability loss | Layer-4 timing of the lost abilities (CR 305.7), printed chapters, an ability lost as it enters (614.12) | #717 |
| Incubator tokens | Their copies are single-faced | #721 |
| Social Snub | A copy reads last known information instead of copying the spell | #721 |
| Winter; Narset | Winter's prompt says "a permanent"; a draw-two cost is not refused under Narset | #722 |
| Monarch cards | The board does not show the monarch | #721 |
| Two limited "you may play" permissions on one card | Merged, and one picked for the player | #722 |
| Alms Collector with dredge | Which replacement applies first is not asked (CR 616.1) | handoff 10-12 |
| "Each player draws" effects | Drawn in seat order, not from the active player | handoff 10-12 |
| Delve with {X}; dice | Delve not offered for an X spell; no die modifiers, no "whenever you roll" trigger | handoff 10-12 |
| Cards cast face down from exile (Gandalf) | CR 708.4 and unlookable face-down cards (406.4) are not built | #707 |
| Casts from exile, or with alternative costs | Offered only with the mana already in the pool | #628, #657 |
| {X} cards, or cards with an additional cost, cast by an effect's "pay mana" | Not offered | `asking.mjs`:2143 |
| "Up to N targets" spells cast free or by an effect | Left out of what may be cast | `actions.mjs`:2053 |
| Tokens and copies of prepare cards | Never prepared | `attributes.mjs`:23 |
| Convoke with Phyrexian or {2/W} symbols | Left to the mana pool | #619 |
| Planeswalkers in combat | Trample over a planeswalker (CR 702.19c) not built | #597 |
| Vinebred Brawler, Safewright Cavalry | Must-be-blocked and one-blocker rules proved by suites, never yet at a real table | #830 |
| Sphinx of the Second Sun | A judgment call on CR 103.8a | #724 |
| Land drops | A person may play a land in any step of their own turn: a house rule Rob chose, not a gap | `5e9167fa` |
| Bifur, Melodic Rider | **An ignore.** Storied is awarded at the state-based check (`designations.mjs`), so when Bifur himself completes his story as he enters, his "enters" ability triggers once; his own static would double it at a table. With the story already won, it doubles (proved). | Master Table load, 2026-11-04 |
| Ravening Warg, Nighthowl Pursuer, and the other ferocious attack triggers written with `condition` | **An ignore.** The condition is asked again as the trigger resolves, but ferocious is a trigger condition, not an intervening "if" (CR 603.4): the 4-power creature removed in response should not stop the effect. Wargling is written with `while` and does it right; the older cards were not changed. | Master Table load, 2026-11-04 |
| Kwain, Itinerant Meddler | **An ignore.** Each player decides, draws, then gains, in turn order, rather than all draw and then all gain; the outcome differs only if something reads the game between two players' draws. | Master Table load, 2026-11-04 |
| Lasyd Prowler's Renew (and 893 definitions) | Offered once its mana is floated by hand, not from untapped lands: the census's advisory class `ACTIVATION_ONLY_WHEN_FLOATED` (ROB-339, ROB-354). Not fixed by the load. | Master Table load, 2026-11-04 |
| Deadpool, Trading Card | **An ignore, Rob's call.** Left out of the Rakdos copy deck load: not defined, so a table refuses it by name. | Rakdos copy deck load, 2026-11-05 |
| Jaxis, the Troublemaker's blitz (and every alternative cost) | Offered only once its mana is floated by hand, not from untapped lands (the row above, #628, #657): the blitz cast of Jaxis is proved with `{1}{R}` tapped into the pool; the plain cast is offered from the lands. | Rakdos copy deck load, 2026-11-05 |
| Flameshadow Conjuring (and Molten Echoes) | **An ignore.** If the creature that entered is gone before the trigger resolves and its controller pays {R}, no token is made; a table copies it from last known information. The engine also asks a forced "Don't pay" when no {R} is available. | Rakdos copy deck load, 2026-11-05 |
| Mirror March, and coin flips in general | **An ignore.** The coin is flipped without a call (the odds are the same, CR 705); nothing modifies a flip (Krark's Thumb) or watches for one ("whenever you win a coin flip") yet. | Rakdos copy deck load, 2026-11-05 |
| Heartbeat of Spring (and Mirari's Wake, Zendikar Resurgent) | **An ignore.** A land that makes two types is tapped by hand with its pick (one offer for each type); the cast's automatic tapping from untapped lands leaves it out, so a spell only that land can pay is not offered until it is tapped by hand. The refusal of an activation without its pick (`performOffered`) has no test of its own. | Box load, 2026-11-15 |
| Gideon Jura's +2 | **An ignore.** A creature both goaded and required to attack Gideon is offered only Gideon (CR 508.1d lets its controller choose which requirement to keep); an attacker cap on that planeswalker (The Eternal Wanderer) is not weighed. | Box load, 2026-11-15 |
| Oath of Nissa | **An ignore.** A Phyrexian symbol in a planeswalker's cost still asks its color or 2 life, and colorless mana pays a colored symbol (as under Chromatic Orrery). | Box load, 2026-11-15 |
| Tamiyo, Field Researcher | **An ignore.** The -2's "their controller's next untap step" uses the controller when it resolves. The +1 draws once for each creature for each damage event, even when that damage hits several things at once (the worker's reading of CR 510.2 and 603.2c; the Gatherer ruling is not checked). | Box load, 2026-11-15 |
| Kardur, Doomscourge and Bloodthirsty Blade | **An ignore, existing behavior.** A goaded or bound creature left out of the attack declaration is added by the engine, not asked of the player. | Box load, 2026-11-15 |
| Mjölnir, Hammer of Thor; Bloodthirsty Blade; Hardened Tactician; Sarpadian Empires | Their activated abilities are offered only once their mana is floated by hand (the known gap, ROB-339 and ROB-354); their casts are offered from untapped lands, and their scenarios tap by hand to activate. | Box load, 2026-11-15 |
| Selvala, Comet Storm, Minds Aglow, Veteran Explorer | **Untested edges, named.** Selvala's empty library is not shown (a scenario always starts with 20 cards); a join-forces payer conceding mid-question is not tested; a Comet Storm target that becomes illegal for a reason other than dying is not shown; "each player draws" runs in seat order, not turn order from the active player (the existing `playersFor`). | Box load, 2026-11-15 |
| Gold Pan, Stormbeacon Blade, Quintessential Katana (equip); Harrier Strix; Underfoot Underdogs; Bre of Clan Stoutarm; Stoic Grove-Guide; Rocksteady (forestcycling); Eagles of the North (plainscycling); Kenrith, the Returned King; Krotiq Nestguard; Aerial Doombot and Ultron Drone (power-up) | Their activated abilities are offered only once their mana is floated by hand (ROB-339, ROB-354); their casts are offered from untapped lands. | Unplayable Cards load, 2026-11-18 |
| The Great Goblin, Gila Courser, Jessica Jones, Private Eye | **An ignore.** A card played from exile by their permission is offered only once its mana is floated (the "casts from exile" row above). | Unplayable Cards load, 2026-11-18 |
| Dáin Ironfoot; Captain America, Living Legend | **An ignore.** Under a token doubler, Dáin's "when you do" attaches only the first Axe. Captain America: a creature untapped by something else and tapped again before his trigger resolves is no longer "the first time", and a tap, untap and tap in one action count together. The Gatherer rulings are not checked. | Unplayable Cards load, 2026-11-18 |
| Rocksteady, Crash Courser; Krotiq Nestguard; Aerial Doombot, Ultron Drone | **Untested edges, named.** A refused second blocker for Rocksteady or a Boar, and Krotiq refused as an attacker without its ability, are not shown (the scenario runner cannot write a refusal; the rules are Safewright Cavalry's and defender's, both proved elsewhere); power-up's reduction by a hybrid, Phyrexian or X symbol, and by a transformed back face, are not shown. | Unplayable Cards load, 2026-11-18 |
| Arwen Undómiel; Inspired Tethermage | Their activated abilities (Scry 2, Empower Jace 2) are offered only once their mana is floated by hand (ROB-339, ROB-354). | Unplayable Cards load, 2026-11-18 |
| Arwen Undómiel; Gorbag of Minas Morgul; Scavenger Regent // Exude Toxin | **Untested edges, named.** A scry with an empty library raises no scry event, so Arwen does not trigger; Gorbag sacrificing a creature he no longer controls is not refused; a copy of an Omen spell would also try the shuffle into the library; an Omen whose spell is modal is not built (the shuffle is added to `spell.effects` only). Counters a mana ability's cost puts on still raise no event. | Unplayable Cards load, 2026-11-18 |
| Every sneak card (Leonardo, Leader in Blue; Splinter, Hamato Yoshi; the eight of the Ninja deck; Ninja Teen's sneak from a graveyard) | **Fixed.** A sneak cast is offered from untapped lands in the declare blockers step and tapped for; before, it was offered only with its mana floating, so a table offered none. Sneak is the one alternative cost tapped for: the rows above on alternative costs still hold for the rest. | Ninja deck load, 2026-11-23 |
| Turtle Lair | **An ignore.** Its mana that only a Ninja or Turtle spell may spend is offered only once it is tapped and floating, as Haven of the Spirit Dragon's and Cavern of Souls' are. | Ninja deck load, 2026-11-23 |
| Karai, Future of the Foot | **An ignore.** Sneaked, and gone before her combat damage trigger resolves, she returns the card to hand rather than the battlefield: "her sneak cost was paid this turn" is read with her on the battlefield. | Ninja deck load, 2026-11-23 |
| Endless Foot Assault (squad); Foot Chopper | **An ignore.** Squad is paid at most ten times (as multikicker and replicate), and a second squad on one card (CR 702.157b) is not built. Under a token doubler, Foot Chopper is attached to the first Ninja made, not one its controller picks (as Dáin Ironfoot's Axe). | Ninja deck load, 2026-11-23 |
| Satoru Umezawa; ninjutsu; Kaito, Bane of Nightmares | **Untested edges, named.** A copy of Satoru is not shown; which unblocked attacker a ninjutsu returns is not chosen in a scenario (the runner takes the first offer); Kaito with no loyalty counters on his own turn cannot be reached (he is put into the graveyard first). | Ninja deck load, 2026-11-23 |
| Invasion of Dominaria, Invasion of Zendikar (Sieges, battles) | **Fixed.** Battles play: a Siege's protector is chosen by its controller as it enters (set by itself with one opponent), it enters with its defense counters, anyone but its protector may attack it, damage removes defense counters, at 0 it is put into the graveyard, and a defeated Siege is exiled and may be cast transformed for nothing. An attack on a battle is no attack on its protector (Propaganda, "attacks you" triggers). | Upgrade map load, 2026-11-24 |
| Battles (CR 310) | **An ignore.** A protector who leaves the game, or a battle left with no protector, is not handled; a creature that may attack only a battle is not counted by the attack requirements; trample's assignment names the player, not the battle; an attacker redirected, or put onto the battlefield attacking (sneak, ninjutsu), attacks the player, never a battle; excess damage to a battle (CR 120.4a) and a copy's defense are not built. The room's board and the house pilot do not show or choose battle attacks (the pilot attacks players only). | Upgrade map load, 2026-11-24 |
| Brave the Sands | **Fixed.** A creature that can block an additional creature is offered both blocks, and divides its combat damage among the attackers it blocks as its controller chooses (CR 510.1d). | Upgrade map load, 2026-11-24 |
| Brave the Sands | **An ignore.** "Must be blocked" maximums still count one block a blocker; with both an attacker's own cap and a blocker able to block more, only the declaration's check holds the per-blocker limit. | Upgrade map load, 2026-11-24 |
| Fertile Ground | **An ignore.** A land it enchants is left out of casts tapped for from untapped lands, since its extra mana needs a pick: tap it by hand and pick the color, as Heartbeat of Spring on a land that makes two types. | Upgrade map load, 2026-11-24 |
| Teferi, Who Slows the Sunset's emblem | **An ignore.** When the active player's draw is held (a table's draw beat, a dredge question), the emblem's draw comes before it rather than after. | Upgrade map load, 2026-11-24 |
| Firdoch Core | **An ignore.** Animated, it keeps the Kindred type (CR 205.1b would drop it: `animate` only adds types, as Cyberdrive Awakener's). Nothing that plays reads Kindred on a creature; it shows on the type line. | Upgrade map load, 2026-11-24 |
| The Peregrine Dynamo; Illusionist's Bracers | **An ignore.** The Dynamo reads an ability's source as it is now, not as it last existed (CR 113.7a): an ability whose legendary token source is gone cannot be targeted. A creature sacrificed as the cost of its own ability is no longer equipped once the activation is done, so the Bracers copy nothing (no Gatherer ruling checked). | Upgrade map load, 2026-11-24 |
| The Chain Veil; Leyline of the Guildpact; Teferi, Who Slows the Sunset | **Untested edges, named.** A planeswalker that changes control after the Veil resolves, and the Veil with Oath of Teferi, are not shown; the Leyline's opening-hand start is not run (the scenario runner has no mulligan; it is the other Leylines' shape); the -7 emblem's untap is shown in one opponent's untap step only. | Upgrade map load, 2026-11-24 |

## 5. Choices the engine makes for the player

AGENTS.md: *"any decisions that takes place within the game the players should be given that option."* Each of these
is decided in code today.

| Moment | What is decided | Recorded |
| --- | --- | --- |
| An attacker with trample blocked by one creature | Exactly lethal to the blocker, the rest to the player; the attacker's controller may assign more to the blocker (CR 702.19b) and is not asked. **Checked.** | `combat.mjs`:616, 719 |
| Two damage replacements where nobody can be asked | The order that deals the least | `replacement.mjs`:33, 489 |
| Counter replacements on entering, as a cost, from infect or proliferate (Hardened Scales with a doubler) | The most if the affected player puts them, the fewest if another does | `statics.mjs`:735 |
| Token replacements outside a resolution | The order that makes the most tokens | `statics.mjs`:484 |
| Destruction replacements in nested effects | Regeneration first, then umbra armor in the order attached | `zones.mjs`:820 |
| A token put onto the battlefield attacking, outside a resolution | It attacks the first player in turn order | `permanents.mjs`:245 |
| Entering replacements | Applied in the order found | `replacement.mjs`:492 |
| Zone-change replacements (Liesa) | The question is raised but the move does not wait for it (no two such effects defined yet) | `replacement.mjs`:35 |
| Ways to pay | Only the first 24 tap choices and 12 payment choices are offered | `actions.mjs`:1501, `mana.mjs`:267 |
| Draw replacements where nobody can be asked | The first player in turn order | `zones.mjs`:637 |

## 6. AI seats beside people

Not rules gaps, but a card the AI never uses plays differently at a table of four. The house AI never sacrifices for
Plumb the Forbidden, never plots (Blacksnag Buzzard), never attacks planeswalkers, and does not value the monarch
(#829, #597, #721).

## 7. Checks that step around a card (ignores in suites and tools)

| Check | What it skips | Effect in play |
| --- | --- | --- |
| `engine-compile` smoke games | Condemn, Mirrodin Avenged, Precise Redaction, Cloud's Limit Break, Eriette's Lullaby, Flourishing Grapple, Rebuff the Wicked, Explosive Derailment, Proft are named as cards a smoke game cannot cast | none: each card's own scenarios prove it |
| Compiler candidates' smoke games | `ok` even when the card was never played: 8 never played (Argivian Restoration, Artifact Blast, Blue Elemental Blast, Devout Decree, Flashfreeze, Halt Order, Refurbish, You Are Already Dead); 130 resolved nothing; CI replays 1 in 97 | candidates at playtest tables, untested |
| Calibration | A template no card was held out on is trusted at one card: 1,041 of 2,643 candidates rest on one | candidates may misplay |
| Candidates | 2,643 compiler candidates and 25 provisional cards have no scenarios of their own; the 25 were never read back by a second model; promotion would write the observed smoke result as the card's scenario | playtest tables only, labeled |
| `engine-room-games` | Seeds 3 and 5 left out; the deal frozen at the definitions of `e243ccde`; refused pilot answers logged, not failed | later cards never dealt there |
| `engine-x11-leave-questions` | Pilot answers the rules refuse are replaced, not failed | a refused answer goes unnoticed |
| Coverage | 7 partial constructs counted as built ("up to X" targets, durations past end of turn, UnlessCost, Count, Valid, ThisTurnCast, OptionalDecider): `coverage.md`'s percentages are high | the measure, not play |
| Scenario runner | `settle` takes the first legal answer (225 steps, 138 cards); `optional` skips a move not offered without saying so (6 cards); `targets: "any"` takes the first aim (11 cards) | those steps prove less than they read |
| `tools/fuzz-live.mjs` | A definition that throws is left out silently; commanders are legendary creatures only | those cards are never fuzzed |
| Six; Ichor Elixir | Suites assert they do not play (locks on stopped cards) | to retarget once built |
| `data/engine/support.json` | Every row "unsupported" since 10-04; the frozen local runtime refuses every nonbasic card | the cloud table reads `definitions.mjs` |

## 8. Rules not built, and the cards they hold back

| Rule or construct | Cards |
| --- | --- |
| Mutate, merged permanents (CR 702.140, 721) | Nethroi, Apex of Death (D4) |
| The Ring tempts you (CR 701.54) | Boromir, Warden of the Tower (D7); it alone holds back 8 of the 11 most-played cards that need it |
| Cards from outside the game (CR 400.11) | Cunning Wish, Extrapolate the Impossible |
| Emblems (CR 114), loyalty twice, opponents at sorcery timing | built in #831 (open): Teferi Hero, Ajani Steadfast, Mordenkainen, Oath of Teferi, both Teferis; Daretti; Elspeth's emblem object |
| Equip {X} from the card itself; a layer-4 Equipment grant | Bludgeon Brawl |
| Planar dice (CR 901.9) | Ichor Elixir, Fractured Powerstone (ROB-187) |
| Blocker-side requirements: "must block", "can't block alone" (ROB-149) | none named; #830 built only the attacker side; "can block an additional creature" and battles built in the Upgrade map load, 2026-11-24 (ROB-541) |
| "Instead" of entering, on every route to the battlefield | Mox Diamond |
| Counters divided at activation (CR 601.2d) | The Earth Crystal |
| A random number; a cast by another player mid-resolution; a random order to the bottom | Tibalt's Trickery, Endurance |
| A replacement on every route to a graveyard | Dauthi Voidwalker, Valgavoth |
| "Cards drawn this turn", pay 4 life or put each back | Sylvan Library |
| Exert (CR 701.43); mana that gives haste | Arena of Glory |
| Retrace; dash; boast twice | Six; Ragavan; Birgi |
| The remaining forms of "the cards an effect moved" | Gix, The Legend of Kyoshi, Gisa |
| Draw replacements | Notion Thief, Abundance, Underrealm Lich |
| "Exiled with"; mana of any type; ability cost reduction | Nightveil Specter, Dire Fleet Daredevil, Forensic Gadgeteer |
| The devotion type change | Purphoros, Bronze-Blooded |
| Shield counters (CR 122.1c) | Sanctuary Warden |
| Convoke with {X} | Chord of Calling |
| The spell's own cast trigger | Nulldrifter |
| "Counted, not proven" in the catalog | The Lord of Pain, Decree of Pain, Dismantling Wave |
| Megamorph; decayed; a "discard X cards" cost | Jadar (decayed); others not named |
| Remembered objects (the most-played construct missing: 62 cards), entered/died this turn, ChoosePlayer (built 2026-11-04), Discover, Imprint (Mimic Vat's, 2026-11-05), Cascade, "your life total", Wither, FlipCoin (built 2026-11-05: `flipCoin`, no call and no modifier yet) | counts in `docs/engine/catalog.md` and `coverage.md`; library blockers: RememberObjects 66, RememberChanged 51, MayPlay 30 |
| Costs that tap, sacrifice or exile N of a type | Captivating Vampire, Kellogg, Piper of the Swarm, Sephara, Shimmer Dragon, Lathril, Grim Hireling, Drivnod |
| "Pay {N}; if you do" | Hellkite Charger, Dawn of Hope, Hashaton |
| Granted triggers and abilities | Dionus, Clavileño, Power Fist, Zombie Master, Svyelun, The Odd Acorn Gang, Bello, Ygra |
| Stack and copy constructs | Strionic Resonator, Weaver of Harmony, Zada, Pyromancer's Goggles, Arcane Bombardment, Electroduplicate, Hydroid Krasis |
| Modal and targeting forms | Golgari Charm, Fiery Confluence, Will of the Mardu, Will of the Jeskai, Not of This World, Nasty End, Monument to Endurance |
| Counted or remembered amounts | Dina, Susur Secundi, Steel Hellkite, Twilight Diviner, Chandra's Incinerator, Dark Deal, Malcolm, Grab the Prize, Gishath, Riveteers Ascendancy |
| Combat taxes and blocks | Odric, Archangel of Tithes, Norn's Annex, Summon: Yojimbo, Sting, Mjölnir |
| Restricted mana; enter-as choices; myriad | Food Chain, Klauth, Elementalist's Palette, Inga, Esika, Glasspool Mimic, Auton Soldier, Master Biomancer, Brudiclad |
| Enchant player; eminence; Rooms; "unless" sacrifice or discard; others | Curse of Opulence, Paradox Haze, The Ur-Dragon, Dollmaker's Shop, Blast Zone, The Goose Mother, Fandaniel, Painful Quandary, Brazen Borrower, Overmaster, Yuna, Eluge, Lignify, Kenrith's Transformation, Full Throttle, All-Out Assault, Wild Magic Surge, Songbirds' Blessing, Kastral, Flare of Fortitude, Invigorate, Fecund Greenshell, Breach the Multiverse, Cloud, Virtue of Knowledge, Ghyrson Starn |

The groups from the M4 batches (#499 to #555) are as those PRs recorded them; whether a later construct now covers a
card was not re-checked, and none of those cards is defined on main.

## 9. Recorded in play, and fixed since (for the record)

Rampant Growth and the land searches finding nothing (Rob's playtest note 6); Freyalise's token's mana ability on the
stack (#703); Foggy Swamp Vinebender with Path of Ancestry (#710); amass with Braids (#711); control gained for good
breaking the room's save; Mystic Forge with disguise cards; Song of the Dryads on a lord (fixed after it was wrong on a
quarter of targets); Canopy Gargantuan's trigger after its source left (ROB-175); Lethal Scheme through Bolas's Citadel
(ROB-177); the AI choosing nothing on every "up to" (ROB-164); same-named Goblins in a Krenko swarm (ROB-168); X spells
needing lands tapped by hand (#819 for new matches; ROB-74's payment draft still open).

**Never found:** the card in Luke's game that did one effect and not its "draw two" (ROB-17, ROB-70).
