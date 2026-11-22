/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S "UNPLAYABLE CARDS 2026-11-18" WORKBOOK (ROB-531): the 42 cards of his boxes and designs the engine
 * could not play, each one loaded here playable now and each through its scenarios.
 *
 * - The 42 are the lane file `docs/engine/card-load-unplayable-2026-11-18/lane-unplayable.json`, from the workbook's
 *   "Not in the engine" rows on both sheets. Each one marked `loadedHere` is a definition every table plays
 *   (`tableDefinition`), written by hand, and has its scenarios run here on its own, so a change to one shows at once,
 *   under the name of the card. The first pull request loaded 36 (the six box cards first); the second, group E's six.
 * - The four Star Trek cards of the workbook (Federation Probe, Silicate Surveyor, Command Subadjunct, Captain's Tutelage)
 *   were not in the oracle data until it was refreshed (ROB-532, 2026-11-22); the lane file names them under
 *   `releasedAfterTheOracleData`, and they are loaded and run here with the rest.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadCardIndex, loadCardScenarios} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the list: 42 distinct cards; each one loaded here is a definition the table plays ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-unplayable-2026-11-18/lane-unplayable.json", import.meta.url), "utf8"));
eq(lane.cards.length, 42, "the list has 42 distinct cards");
eq(new Set(lane.cards.map((c) => c.name)).size, 42, "each once");
eq(lane.cards.filter((c) => c.where.includes("box")).length, 6, "six are in the boxes D1-A to D8-A");
eq(lane.cards.filter((c) => c.where.includes("design")).length, 37, "37 are in the designs (Moon-Vigil Adherents is in both)");
const loaded = lane.cards.filter((c) => c.loadedHere);
eq(loaded.filter((c) => !tableDefinition(c.name)).map((c) => c.name), [], "every card loaded here is a definition the table plays");
/* The cards not loaded yet are a later pull request's (the lane says so card by card); none may be claimed early. */
eq(lane.cards.filter((c) => !c.loadedHere && tableDefinition(c.name)).map((c) => c.name), [], "a card marked for later is not a definition yet");
/* The four Star Trek cards of the workbook (released 2026-11-13, after the oracle data of 2026-10-04) were loaded in ROB-532,
   once the engine's oracle data was refreshed (2026-11-22): each is a definition every table plays, and has its scenarios. */
const trek = lane.source.releasedAfterTheOracleData;
eq(trek.map((c) => c.name).sort(),
  ["Captain's Tutelage", "Command Subadjunct", "Federation Probe", "Silicate Surveyor"], "the four Star Trek cards of the workbook");
eq(trek.filter((c) => !c.loadedHere || c.loadedIn !== "ROB-532").map((c) => c.name), [], "the lane says all four were loaded in ROB-532");
eq(trek.filter((c) => !tableDefinition(c.name)).map((c) => c.name), [], "each of the four is a definition the table plays");

/* ---- each card's scenarios, run ---- */
const cards = loadCardIndex();
const everyLoaded = [...loaded, ...trek];
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => everyLoaded.some((c) => c.name === f.card));
eq(files.map((f) => f.card).sort(), everyLoaded.map((c) => c.name).sort(), "each card loaded here has its scenarios");
for (const file of files) {
  ok(file.scenarios.length >= 2, `${file.card}: a way and an edge, two scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}

console.log(`engine-unplayable-load-1118: ${checks} checks passed`);
