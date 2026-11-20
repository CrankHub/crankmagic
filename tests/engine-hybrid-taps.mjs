/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* MONOCOLORED HYBRID IS TAPPED FOR, EACH WAY (ROB-354; rules/actions.mjs, `hybridTaps`; rules/mana.mjs, monohybridVariants).
 *
 * {2/W} is one white mana or two of any kind (CR 107.4e). The tap planners took neither, so a spell with such symbols was
 * offered only once mana already floated: Spectral Procession, Reigning Victor and Temur Tawnyback, the interaction census's
 * CAST_ONLY_WHEN_FLOATED baseline. Now, in a match whose pod carries `hybridTaps` (a table's new matches), each plain variant
 * of the cost is planned, the colored ones first:
 *   - Spectral Procession with three Plains untapped: offered, tapped for, three white; cast, three Spirits;
 *   - with two Plains and two Wastes: offered too, a white each for two symbols and two generic for the third;
 *   - with six Wastes and no white at all: offered, every symbol paid as two generic;
 *   - with three Wastes: not offered -- three mana cannot pay it;
 *   - Temur Tawnyback ({2/G}{2/U}{2/R}) with a Forest, an Island and a Mountain: offered;
 *   - a match without the key offers what it did: nothing until mana floats.
 */
import assert from "node:assert/strict";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions} from "../game/engine/rules/actions.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };
const index = loadCardIndex();
const SP = "Spectral Procession", TT = "Temur Tawnyback";
const TABLE = {pooledTaps: true, xTaps: true, phyrexianTaps: true, permittedTaps: true, abilityTaps: true, hybridTaps: true};
const play = (field, hand, steps = [], flags = TABLE) =>
  runScenario({name: "hybrid taps", ...flags, library: ["Wastes", "Wastes", "Wastes"], setup: [{seat: 0, zone: "battlefield", cards: field}, {seat: 0, zone: "hand", cards: hand}], steps}, index.definition, {}).state;
const casts = (s, card) => legalActions(s, 0).filter((a) => a.kind === "cast" && s.objects[a.objectId]?.card === card);
const tapped = (s) => s.zones.battlefield.flat().map((id) => s.objects[id]).filter((o) => o.controller === 0 && o.tapped).map((o) => o.card).sort();

eq(casts(play(["Plains", "Plains", "Plains"], [SP], [], {...TABLE, hybridTaps: false}), SP).length, 0, "a match without the key: Spectral Procession is not offered while nothing floats");
ok(casts(play(["Plains", "Plains", "Plains"], [SP]), SP).some((a) => a.autoTap), "with it: three Plains, Spectral Procession offered, tapped for");
const cast = play(["Plains", "Plains", "Plains"], [SP], [{cast: SP}, {resolve: true}]);
eq([tapped(cast), cast.zones.battlefield.flat().filter((id) => cast.objects[id].controller === 0 && /Spirit/.test(cast.objects[id].card ?? "")).length],
  [["Plains", "Plains", "Plains"], 3], "cast: the three Plains tapped, one white each, and three Spirits");
ok(casts(play(["Plains", "Plains", "Wastes", "Wastes"], [SP]), SP).some((a) => a.autoTap), "two Plains and two Wastes: offered, the third symbol paid as two generic");
ok(casts(play(Array(6).fill("Wastes"), [SP]), SP).some((a) => a.autoTap), "six Wastes and no white: offered, every symbol as two generic");
eq(casts(play(["Wastes", "Wastes", "Wastes"], [SP]), SP).length, 0, "three Wastes cannot pay it: not offered");
ok(casts(play(["Forest", "Island", "Mountain"], [TT]), TT).some((a) => a.autoTap), "Temur Tawnyback with a Forest, an Island and a Mountain: offered, tapped for");
console.log(`engine-hybrid-taps: ${checks} checks passed — monocolored hybrid ({2/W}) tapped for each way in a table's new matches: Spectral Procession from three Plains, from two Plains and two Wastes, from six Wastes, not from three; Temur Tawnyback; a match launched before offers what it did (ROB-354).`);
