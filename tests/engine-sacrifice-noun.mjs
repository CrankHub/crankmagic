/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* A SACRIFICE QUESTION SAYS WHAT MAY BE SACRIFICED (ROB-323).
 *
 * Winter, Tormented Loner: "When Winter enters, you may sacrifice a creature or planeswalker." Its question offered only
 * those -- a creature, Winter itself, or not to pay -- but asked "sacrifice a permanent?", because the word for a choice among
 * kinds (`anyOf`) fell through to the general one (script/effects/asking.mjs, noun). Now it asks "sacrifice a creature or
 * planeswalker?", the options unchanged. A question with one kind reads exactly as it did, so no other question's title -- nor
 * the key a standing answer is filed under (game/room/room.mjs, questionKey) -- changes.
 */
import assert from "node:assert/strict";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {awaitingChoice} from "../game/engine/rules/turn.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";

let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };
const index = loadCardIndex();
const WINTER = "Winter, Tormented Loner";
const FIX = {Bear: {types: ["Creature"], subtypes: ["Bear"], manaCost: "{1}{G}", colors: ["G"], power: 2, toughness: 2}};
const s = runScenario({name: "winter", library: ["Wastes", "Wastes"], setup: [{seat: 0, zone: "battlefield", cards: ["Swamp", "Wastes", "Wastes", "Bear"]},
  {seat: 0, zone: "hand", cards: [WINTER]}], steps: [{tap: "Swamp"}, {tap: "Wastes"}, {tap: "Wastes"}, {cast: WINTER}, {resolve: true}, {resolve: true}]}, index.definition, FIX).state;
const asked = awaitingChoice(s);
eq(asked.title, `${WINTER}: sacrifice a creature or planeswalker?`, "Winter's question says what may be sacrificed: a creature or planeswalker");
eq(asked.options.map((o) => o.label), ["Sacrifice Bear", `Sacrifice ${WINTER}`, "Don't pay"], "and its options are as they were");
console.log(`engine-sacrifice-noun: ${checks} checks passed — Winter, Tormented Loner asks to sacrifice "a creature or planeswalker", its options unchanged (ROB-323).`);
