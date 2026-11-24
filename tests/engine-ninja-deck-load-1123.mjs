/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S NINJA DECK (ROB-540, 2026-11-23): "Make sure all of these cards are playable. Load those that aren't
 * currently." A pasted Commander deck of white, blue and black Ninjas -- 80 distinct names -- of which main 59b9f862 played 51.
 *
 * - The lane file `docs/engine/card-load-ninja-deck-2026-11-23/lane-ninja.json` holds the list: the 51 already playable
 *   (`source.playableBefore`) and the 29 loaded here (`cards`). Every one of the 80 is a definition every table plays
 *   (`tableDefinition`), so the whole deck plays.
 * - Each of the 29 has its scenarios run here on its own, so a change to one shows at once, under the name of the card.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {loadCardIndex, loadCardScenarios} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the list: 80 distinct names, 51 playable before and 29 loaded here; all 80 play ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-ninja-deck-2026-11-23/lane-ninja.json", import.meta.url), "utf8"));
eq(lane.source.distinct, 80, "the list has 80 distinct names");
eq(lane.source.playableBefore.length, 51, "51 played before this load");
eq(lane.cards.length, 29, "29 are loaded here");
const all = [...lane.source.playableBefore, ...lane.cards.map((c) => c.name)];
eq(new Set(all).size, 80, "each name once, in one list or the other");
eq(lane.cards.filter((c) => !c.loadedHere).map((c) => c.name), [], "every card of the load is loaded here");
/* Names are read as the deck importer reads them (card-resolve.js, with the flavor names): Splinter, Vengeful Sensei is
   Ink-Eyes, Servant of Oni's flavor name. */
const require = createRequire(import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const resolver = require("../card-resolve.js").createResolver(Object.values(read("../data/engine/oracle.json").cards),
  {aliases: read("../data/flavor-names.json").cards});
const resolved = Object.fromEntries(all.map((name) => [name, resolver.resolve(name).resolved]));
eq(all.filter((name) => !resolved[name]), [], "every name is a card of the oracle data");
eq(resolved["Splinter, Vengeful Sensei"], "Ink-Eyes, Servant of Oni", "a flavor name is its card");
eq(all.filter((name) => !tableDefinition(resolved[name])), [], "every card of the deck is a definition the table plays");

/* ---- each card's scenarios, run ---- */
const cards = loadCardIndex();
const loaded = lane.cards.map((c) => c.name);
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => loaded.includes(f.card));
eq(files.map((f) => f.card).sort(), [...loaded].sort(), "each card loaded here has its scenarios");
for (const file of files) {
  ok(file.scenarios.length >= 3, `${file.card}: its ways and an edge, three scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}

console.log(`engine-ninja-deck-load-1123: ${checks} checks passed`);
