/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* AN ACTIVATED ABILITY IS TAPPED FOR, AS A CAST IS (ROB-317; rules/actions.mjs, `abilityTaps`).
 *
 * Rob, playtest of 2026-10-29: "Ash Barrens is the example card. Basic Land Cycling. 1, discard card and search library for a
 * land card. That option is not presented to me." An ability was offered only when mana already floating paid for it: with
 * Ash Barrens in hand, an untapped Wastes and nothing in the pool, he was offered the land play and the Wastes's mana, never
 * the cycling (the interaction census's ACTIVATION_ONLY_WHEN_FLOATED). Now, in a match whose pod carries `abilityTaps` (a
 * table's new matches), an ability's mana is tapped for as a cast's is:
 *   - Ash Barrens in hand, one Wastes untapped: Basic landcycling {1} offered, tapped for; activated, it pays exactly {1}, is
 *     discarded once, goes on the stack as an ability (not the turn's land play), searches for a basic land only -- a Forest or
 *     a Snow-Covered Forest, never Command Tower -- and puts it into the hand; with no basic land left, it finds nothing and Ash
 *     Barrens is still cycled;
 *   - two lands that could pay: which to tap is asked, and the one picked is tapped;
 *   - an ability whose cost taps its own source never taps that source for its mana: Mind Stone alone does not offer its draw,
 *     Mind Stone and a Wastes do, the Wastes tapped;
 *   - a match without the key (every game launched before) offers what it did.
 */
import assert from "node:assert/strict";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions, applyAction} from "../game/engine/rules/actions.mjs";
import {awaitingChoice, resolveAwaiting} from "../game/engine/rules/turn.mjs";
import {passPriority} from "../game/engine/rules/priority.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";
import {createRng} from "../game/engine/rng.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

const index = loadCardIndex();
const rng = createRng("ability-taps");
const ASH = "Ash Barrens";
const TABLE = {pooledTaps: true, xTaps: true, phyrexianTaps: true, permittedTaps: true, abilityTaps: true};
const BEFORE = {...TABLE, abilityTaps: false};
const play = (field, hand, {library = ["Forest", "Command Tower", "Snow-Covered Forest", "Island"], flags = TABLE} = {}) =>
  runScenario({name: "ability taps", ...flags, library, setup: [{seat: 0, zone: "battlefield", cards: field}, {seat: 0, zone: "hand", cards: hand}], steps: []}, index.definition, {}).state;
const zone = (s, z) => s.zones[z].flat().map((id) => s.objects[id]).filter((o) => o && (o.owner === 0 || o.controller === 0));
const named = (s, z) => zone(s, z).map((o) => o.card);
const offers = (s, card) => legalActions(s, 0).filter((a) => a.kind === "activate" && s.objects[a.objectId]?.card === card);
const poolTotal = (s) => Object.values(s.players[0].pool ?? s.players[0].mana ?? {}).reduce((n, v) => n + (typeof v === "number" ? v : 0), 0);

{
  /* ROB'S CASE: Ash Barrens in hand, one untapped Wastes, nothing floating. */
  eq(offers(play(["Wastes"], [ASH], {flags: BEFORE}), ASH).length, 0, "a match without the key: Basic landcycling is not offered (what Rob met)");
  const s = play(["Wastes"], [ASH]);
  const [cycle] = offers(s, ASH);
  ok(cycle && cycle.autoTap === true, "with it: Basic landcycling {1} is offered from the hand, tapped for");
  ok(legalActions(s, 0).some((a) => a.kind === "play-land" && s.objects[a.objectId]?.card === ASH), "beside the land play, which stays its own choice");
  const libraryBefore = s.zones.library[0].length;
  applyAction(s, 0, cycle);
  eq([named(s, "graveyard"), zone(s, "battlefield").filter((o) => o.tapped).map((o) => o.card), poolTotal(s)], [[ASH], ["Wastes"], 0],
    "activated: the Wastes tapped for exactly {1}, all of it spent, and Ash Barrens discarded once");
  eq([s.stack.length, s.players[0].landsPlayed ?? 0], [1, 0], "Basic landcycling is on the stack as an ability, not the turn's land play");
  passPriority(s, null, rng); passPriority(s, null, rng);
  const search = awaitingChoice(s);
  ok(search, "it resolves into the search");
  const labels = search.options.map((o) => o.label).sort();
  ok(labels.includes("Forest") && labels.includes("Snow-Covered Forest"), `a basic land may be found, snow too (${labels.join(", ")})`);
  ok(!labels.includes("Command Tower"), "a nonbasic land never is: no Command Tower");
  resolveAwaiting(s, [search.options.find((o) => o.label === "Forest").index], null, rng);
  eq(named(s, "hand"), ["Forest"], "the Forest is put into the hand");
  eq(s.zones.library[0].length, libraryBefore - 1, "and the library is one card smaller, shuffled");
}
{
  /* Nothing to find: no basic land in the library. The cycling still happens; nothing comes to hand. */
  const s = play(["Wastes"], [ASH], {library: ["Command Tower", "Command Tower"]});
  applyAction(s, 0, offers(s, ASH)[0]);
  passPriority(s, null, rng); passPriority(s, null, rng);
  if (s.awaiting) resolveAwaiting(s, [], null, rng);
  eq([named(s, "hand"), named(s, "graveyard")], [[], [ASH]], "no basic land left: nothing found, and Ash Barrens is still cycled");
}
{
  /* Two lands that could pay: which to tap is the player's to say. */
  const s = play(["Wastes", "Forest"], [ASH]);
  applyAction(s, 0, offers(s, ASH)[0]);
  const asked = awaitingChoice(s);
  eq([asked?.cost, asked?.options.map((o) => o.label).sort()], ["mana", ["Forest", "Wastes"]], "two lands: asked what to tap for it");
  resolveAwaiting(s, [asked.options.find((o) => o.label === "Forest").index], null, rng);
  eq(zone(s, "battlefield").filter((o) => o.tapped).map((o) => o.card), ["Forest"], "the Forest picked is the one tapped");
}
{
  /* A {T} cost's own source never pays its mana: Mind Stone ({1}, {T}, sacrifice: draw). */
  eq(offers(play(["Mind Stone"], []), "Mind Stone").length, 0, "Mind Stone alone: its draw is not offered -- it cannot tap for its own {1} and for {T}");
  const s = play(["Mind Stone", "Wastes"], []);
  const draw = offers(s, "Mind Stone").find((a) => a.autoTap);
  ok(draw, "Mind Stone and a Wastes: the draw is offered, tapped for");
  applyAction(s, 0, draw);
  eq([named(s, "graveyard"), zone(s, "battlefield").filter((o) => o.tapped).map((o) => o.card)], [["Mind Stone"], ["Wastes"]], "the Wastes pays, and Mind Stone is sacrificed");
}
{
  /* Mana already floating (a game of Rob's live decks, seed 4: "Nylea, Keen-Eyed's ability cannot be paid for now"). With
     {W}{U}{R} in the pool and a Forest untapped, Nylea's {2}{G} taps the Forest -- and the pool, {W}{U}{R}{G}, then pays the {2}
     three ways. What the Forest was tapped for, and the floating mana the plan priced in, is the way taken. */
  const s = runScenario({name: "floating", ...TABLE, library: ["Forest", "Forest"], setup: [{seat: 0, zone: "battlefield", cards: ["Nylea, Keen-Eyed", "Plains", "Island", "Mountain", "Forest"]}],
    steps: [{tap: "Plains"}, {tap: "Island"}, {tap: "Mountain"}]}, index.definition, {}).state;
  const reveal = offers(s, "Nylea, Keen-Eyed").find((a) => a.autoTap);
  ok(reveal, "{W}{U}{R} floating and a Forest untapped: Nylea's {2}{G} is offered, tapped for");
  applyAction(s, 0, reveal);
  if (s.awaiting) resolveAwaiting(s, [0], null, rng);
  eq([s.stack.length, zone(s, "battlefield").filter((o) => o.card === "Forest")[0]?.tapped], [1, true], "activated: the Forest tapped and the ability on the stack, paid the way it was tapped for");
}
console.log(`engine-ability-taps: ${checks} checks passed — an activated ability is tapped for as a cast is, in a table's new matches: Rob's Ash Barrens cycled from the hand with a Wastes untapped (exactly {1}, discarded once, an ability not a land play, a basic land only, fail-to-find), which land asked when two could pay, a {T} cost's source never its own mana; a match launched before offers what it did (ROB-317).`);
