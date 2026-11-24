/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S UPGRADE MAP (ROB-541, 2026-11-24): "Here's another list of cards to prioritize next." The 25 cards of
 * the BIC, Practical and Available columns of his Upgrade Series map (2026-11-22) that main 59b9f862 did not play.
 *
 * - The lane file `docs/engine/card-load-upgrade-map-2026-11-24/lane-upgrade-map.json` holds the list, each card with its
 *   deck, its columns, its slot's status and the group that wrote it. Every one is a definition every table plays
 *   (`tableDefinition`).
 * - Each card has its scenarios run here on its own, so a change to one shows at once, under the name of the card.
 * - Fertile Ground's pick, refused when a tap action comes without it or with a color that isn't one: no offer is ever made
 *   that way, so no scenario reaches either refusal.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {loadCardIndex, loadCardScenarios} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions, applyAction} from "../game/engine/rules/actions.mjs";
import {blockers} from "../game/engine/rules/combat.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the list: 25 names, all of them loaded here, all of them played ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-upgrade-map-2026-11-24/lane-upgrade-map.json", import.meta.url), "utf8"));
eq(lane.schema, "library-load-lane@1", "the lane file's schema");
eq(lane.source.distinct, 25, "the list has 25 names");
eq(lane.cards.length, 25, "25 cards in the lane");
eq(new Set(lane.cards.map((c) => c.name)).size, 25, "each name once");
eq(lane.cards.filter((c) => !c.loadedHere).map((c) => c.name), [], "every card of the list is loaded here");
const require = createRequire(import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const resolver = require("../card-resolve.js").createResolver(Object.values(read("../data/engine/oracle.json").cards),
  {aliases: read("../data/flavor-names.json").cards});
const resolved = Object.fromEntries(lane.cards.map((c) => [c.name, resolver.resolve(c.name).resolved]));
eq(lane.cards.filter((c) => !resolved[c.name]).map((c) => c.name), [], "every name is a card of the oracle data");
/* A double-faced card is named by its front face on the map and by both faces in the oracle data. */
eq(lane.cards.filter((c) => c.oracleName).map((c) => [c.oracleName, resolved[c.name]]),
  lane.cards.filter((c) => c.oracleName).map((c) => [c.oracleName, c.oracleName]), "a front face is its card");
eq(lane.cards.filter((c) => !tableDefinition(resolved[c.name])).map((c) => c.name), [], "every card of the list is a definition the table plays");

/* ---- each card's scenarios, run ---- */
const cards = loadCardIndex();
const loaded = lane.cards.map((c) => c.oracleName ?? c.name);
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => loaded.includes(f.card));
eq(files.map((f) => f.card).sort(), [...loaded].sort(), "each card loaded here has its scenarios");
for (const file of files) {
  ok(file.scenarios.length >= 3, `${file.card}: its ways and an edge, three scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}

/* ---- Fertile Ground: a tap with no pick, or a pick that is no color, is refused (CR 106.1a, 605.1b) ---- */
const {state} = runScenario({
  name: "Fertile Ground on Rob's Wastes",
  setup: [{seat: 0, zone: "battlefield", cards: ["Forest", "Island", "Wastes"]}, {seat: 0, zone: "hand", cards: ["Fertile Ground"]}],
  steps: [{tap: "Forest"}, {tap: "Island"}, {cast: "Fertile Ground", targets: [{card: "Wastes"}]}, {resolve: true}],
}, cards.definition);
const offers = legalActions(state, 0).filter((a) => a.kind === "activate-mana" && a.label === "Wastes");
eq(offers.map((a) => a.extra).sort(), [["B"], ["G"], ["R"], ["U"], ["W"]], "the Wastes offers its extra mana in each of the five colors");
const forged = (extra) => { const {extra: _, ...rest} = offers[0]; return structuredClone(extra ? {...rest, extra} : rest); };
assert.throws(() => applyAction(structuredClone(state), 0, forged(null)), /triggered mana abilities watching Wastes add \(1 pick\)/,
  "tapped with no pick: refused before anything is paid");
checks += 1;
assert.throws(() => applyAction(structuredClone(state), 0, forged(["C"])), /Choose the color of the one mana Fertile Ground adds/,
  "a pick that is not a color: refused");
checks += 1;

/* ---- an attack on a battle is not an attack on its protector (CR 506.3, 508.1b): nothing records the protector as attacked,
   so "can't attack a player it has already attacked this turn" (Port Razer) still may attack them ---- */
const fileOf = (card) => files.find((f) => f.card === card);
const siege = fileOf("Invasion of Dominaria // Serra Faithkeeper");
const atSiege = structuredClone(siege.scenarios.find((s) => s.steps.some((step) => step.attack && /\(Maya\)/.test(step.at ?? ""))));
atSiege.steps = atSiege.steps.slice(0, atSiege.steps.findIndex((step) => step.attack) + 1); atSiege.expect = [];
{
  const {state: s} = runScenario(atSiege, cards.definition, siege.fixtures ?? {});
  const ox = Object.values(s.objects).find((o) => o.card === "Ox" && o.zone === "battlefield");
  ok((s.combat?.attacks ?? []).some((a) => a.attacker === ox.id && a.battle !== undefined), "the Ox is attacking the Siege");
  eq(Object.keys(ox.used?.counts ?? {}).filter((k) => k.startsWith("attacked:")), [], "and nothing records it as having attacked Maya");
}

/* ---- the blockers' record: one blocker one attacker, unless it may block more (CR 509.1a; Brave the Sands) ---- */
const sands = fileOf("Brave the Sands");
const twoBears = structuredClone(sands.scenarios.find((s) => s.steps.some((step) => Array.isArray(step.block) && step.block.length === 2)));
twoBears.steps = twoBears.steps.slice(0, twoBears.steps.findIndex((step) => step.block)); twoBears.expect = [];
const blockRecord = (scenario) => { const {state: s} = runScenario(scenario, cards.definition, sands.fixtures ?? {}); return blockers.choice(s, s.awaiting ?? {kind: "declare-blockers", player: 0}); };
{
  const record = blockRecord(twoBears);
  eq([record.exclusiveBy, record.max], [undefined, 2], "with Brave the Sands the Ox may block both Bears: no one-attacker rule, two blocks");
  const without = structuredClone(twoBears);
  without.setup = without.setup.map((z) => ({...z, cards: z.cards.filter((c) => c !== "Brave the Sands")}));
  const plain = blockRecord(without);
  eq([plain.exclusiveBy, plain.max], ["cardId", 1], "without it, each blocker blocks one attacker");
}

console.log(`engine-upgrade-map-load-1124: ${checks} checks passed`);
