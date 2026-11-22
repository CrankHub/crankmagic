/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* A CARD CAST THROUGH A PERMISSION IS TAPPED FOR, AS FROM THE HAND (ROB-226; rules/actions.mjs, `permittedTaps`).
 *
 * Rob, playtest of 2026-10-29: he could not play the card Valakut Exploration exiled -- Purphoros, God of the Forge, then a
 * second exiled card. Valakut's landfall exiles the top card, "You may play that card for as long as it remains exiled".
 * The engine offered a cast from exile only when mana already floating paid for it: a card from the hand is tapped for as
 * it is cast, one from exile was not. A person is offered casts, not "tap first, then cast", so with four Mountains
 * untapped Purphoros was never offered at all. Now, in a match whose pod carries `permittedTaps` (a table's new matches),
 * a card cast through a permission -- from exile, a graveyard or the top of a library -- is tapped for as from the hand:
 *   - Rob's case: Purphoros offered and cast from exile with the Mountains untapped; the next land's exile, a Goblin, cast
 *     too, and Purphoros deals 2 to each opponent as it enters;
 *   - the rules still hold: not offered when the lands cannot pay; Lightning Bolt cast in response to Valakut's own end-step
 *     trigger; a Goblin from the top of the library under Conspicuous Snoop (ROB-227); a permanent from the graveyard under
 *     Muldrotha;
 *   - a permission that pays another way is paid as before: Bolas's Citadel's card costs life, never a tapped land;
 *   - a match without the key (every game launched before) offers what it did: nothing until mana floats.
 */
import assert from "node:assert/strict";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions} from "../game/engine/rules/actions.mjs";
import {projectFor} from "../game/engine/projection.mjs";
import {describeDecision} from "../game/room/decision.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

const index = loadCardIndex();
const PUR = "Purphoros, God of the Forge", VALAKUT = "Valakut Exploration", GOBLIN = "Raging Goblin", BOLT = "Lightning Bolt";
const FIX = {Bear: {types: ["Creature"], subtypes: ["Bear"], manaCost: "{1}{G}", colors: ["G"], power: 2, toughness: 2}};
/* A table's new match (game/room/table.mjs): the taps flags it carries, with this one or without it. */
const TABLE = {pooledTaps: true, xTaps: true, phyrexianTaps: true, permittedTaps: true};
const BEFORE = {...TABLE, permittedTaps: false};
const play = (setup, steps, {library = [PUR, "Mountain", GOBLIN, "Mountain", "Mountain"], flags = TABLE, ...more} = {}) =>
  runScenario({name: "permitted taps", library, setup, steps, ...flags, ...more}, index.definition, FIX).state;
const named = (s, card, zone) => s.zones[zone].flat().filter((id) => s.objects[id]?.card === card);
const offers = (s, card, zone = "exile") => legalActions(s, 0).filter((a) => a.kind === "cast" && s.objects[a.objectId]?.card === card && s.objects[a.objectId]?.zone === zone);
const tapped = (s, card) => named(s, card, "battlefield").filter((id) => s.objects[id].tapped).length;
/* What the board is sent: the priority question, as the room words it (game/room/room.mjs, priorityChoice). */
const decisionFor = (s) => {
  const actions = legalActions(s, 0);
  const choice = {id: "priority:t", kind: "priority", mode: "one", min: 1, max: 1, options: actions.map((a, i) => ({index: i, label: a.label || a.kind, cardId: a.objectId, act: a.kind}))};
  return describeDecision(s, choice, actions, projectFor(s, 0));
};
const MOUNTAINS = (n) => Array(n).fill("Mountain");
const valakut = (lands) => [{seat: 0, zone: "battlefield", cards: [VALAKUT, ...MOUNTAINS(lands)]}, {seat: 0, zone: "hand", cards: ["Mountain", "Mountain"]}];
const LANDFALL = [{play: "Mountain"}, {resolve: true}];

{
  /* ROB'S CASE: Valakut, four Mountains untapped, a fifth played; the landfall trigger exiles Purphoros. */
  const before = play(valakut(4), LANDFALL, {flags: BEFORE});
  eq(named(before, PUR, "exile").length, 1, "the landfall trigger exiled Purphoros");
  eq(offers(before, PUR).length, 0, "a match without the key: Purphoros is not offered while nothing floats (what Rob met)");
  const s = play(valakut(4), LANDFALL);
  const [cast] = offers(s, PUR);
  ok(cast, "with it: Purphoros is offered from exile, five Mountains untapped and nothing floating");
  ok(cast.autoTap === true, "and the cast taps its lands as it is cast, as one from the hand does");
  const d = decisionFor(s);
  ok(d.options.some((o) => o.act === "cast" && o.cardId === cast.objectId), "the room's question carries it, by the exiled card's own id, for the board to offer");
  const after = play(valakut(4), [...LANDFALL, {cast: PUR}, {resolve: true}]);
  eq([named(after, PUR, "battlefield").length, named(after, PUR, "exile").length, tapped(after, "Mountain")], [1, 0, 4],
    "cast and resolved: Purphoros on the battlefield, out of exile, four Mountains tapped for it");
  /* The second exiled card (Rob: "followed by another exiled card"): the next turn's land exiles a Goblin, cast from exile
     with the Mountains that untapped, and Purphoros's trigger deals 2 to each opponent. */
  const next = play(valakut(4), [...LANDFALL, {cast: PUR}, {resolve: true}, {to: {turn: 3, phase: "MAIN1"}}, {play: "Mountain"}, {resolve: true},
    {expect: [{seat: 0, zone: "exile", cards: [GOBLIN]}]}, {cast: GOBLIN}, {resolve: true}, {resolve: true}], {library: [PUR, "Mountain", GOBLIN, "Mountain", "Mountain"]});
  eq([named(next, GOBLIN, "battlefield").length, next.players[1].life], [1, 38], "the next exiled card, a Goblin, cast too; Purphoros deals 2 as it enters");
}
{
  /* The cost still counts: with one Mountain and the one just played, Purphoros ({3}{R}) is not offered; Raging Goblin is. */
  const s = play(valakut(1), LANDFALL);
  eq(offers(s, PUR).length, 0, "two Mountains cannot pay {3}{R}: not offered");
  const g = play(valakut(0), LANDFALL, {library: [GOBLIN, "Mountain"]});
  ok(offers(g, GOBLIN).some((a) => a.autoTap), "the land just played pays {R}: Raging Goblin offered from exile, tapped for");
}
{
  /* In response to Valakut's own end-step trigger (it would put the card into the graveyard): an instant, tapped for. */
  const s = play(valakut(1), [...LANDFALL, {to: {turn: 1, phase: "END_OF_TURN"}}], {library: [BOLT, "Mountain"]});
  ok(s.stack.length >= 1, "Valakut's end-step trigger is on the stack");
  ok(offers(s, BOLT).some((a) => a.autoTap), "Lightning Bolt is offered from exile in response, tapped for");
}
{
  /* Other permissions to cast from elsewhere: the top of the library (Conspicuous Snoop, ROB-227), the graveyard (Muldrotha). */
  const snoop = play([{seat: 0, zone: "battlefield", cards: ["Conspicuous Snoop", "Mountain"]}], [], {library: [GOBLIN, "Mountain"]});
  ok(offers(snoop, GOBLIN, "library").some((a) => a.autoTap), "Conspicuous Snoop: the Goblin on top of the library is offered, tapped for");
  eq(offers(play([{seat: 0, zone: "battlefield", cards: ["Conspicuous Snoop", "Mountain"]}], [], {library: [GOBLIN, "Mountain"], flags: BEFORE}), GOBLIN, "library").length, 0,
    "and without the key it was not");
  const muldrotha = play([{seat: 0, zone: "battlefield", cards: ["Muldrotha, the Gravetide", "Forest", "Forest"]}, {seat: 0, zone: "graveyard", cards: ["Bear"]}], []);
  ok(offers(muldrotha, "Bear", "graveyard").some((a) => a.autoTap), "Muldrotha: a creature card in the graveyard is offered, tapped for");
}
{
  /* A permission that pays another way: Bolas's Citadel's card costs life equal to its mana value, never a tapped land. */
  const s = play([{seat: 0, zone: "battlefield", cards: ["Bolas's Citadel", "Mountain", "Mountain"]}], [], {library: [GOBLIN, "Mountain"]});
  const cits = offers(s, GOBLIN, "library");
  ok(cits.length > 0 && cits.every((a) => a.autoTap !== true), "Bolas's Citadel: the Goblin is offered for life, and no land is tapped for it");
}
console.log(`engine-permitted-taps: ${checks} checks passed — a card cast through a permission (exile, a graveyard, the top of a library) is tapped for as from the hand, in a table's new matches: Rob's Purphoros from Valakut Exploration and the card after it, an instant in response to Valakut's end step, Conspicuous Snoop and Muldrotha; the cost still counts; Bolas's Citadel still costs life; a match launched before offers what it did.`);
