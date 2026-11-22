/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S BOX AND UPGRADE CARDS FOR D1, D3, D4, D5, D6 AND D8 (2026-11-15; ROB-530): all 28 cards playable, each through
 * its scenarios, and what the scenarios cannot reach.
 *
 * - The 28 cards are the lane file `docs/engine/card-load-boxes-2026-11-15/lane-boxes.json`; each is a definition every table plays
 *   (`tableDefinition`), written by hand (none was a compiler candidate), and each has its scenarios run here on its own, so a change to
 *   one shows at once, under the name of the card.
 * - The words the load added are held directly: a count that grows with the kicks (`plusKicked`, Comet Storm: a spell's only), join
 *   forces (`joinForces`, Minds Aglow: its one shape), "for each player who did" (`repeatFor` `who did`, Tempt with Discovery), and
 *   the static rules `goaded` (Bloodthirsty Blade) and `spend-as-any-color` (Oath of Nissa).
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadCardIndex, loadCardScenarios, loadCardScripts} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {compileScript} from "../game/engine/cards/index.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {STATIC_RULES} from "../game/engine/rules/statics.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the list: 28 distinct cards, every one a definition the table plays ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-boxes-2026-11-15/lane-boxes.json", import.meta.url), "utf8"));
eq(lane.cards.length, 28, "the list has 28 distinct cards");
eq(new Set(lane.cards.map((c) => c.name)).size, 28, "each once");
eq(lane.cards.filter((c) => !tableDefinition(c.name)).map((c) => c.name), [], "every one is a definition the table plays");
eq(lane.cards.filter((c) => c.where === "upgrade").length, 8, "eight are upgrade cards, the rest in the box");
eq(Object.fromEntries(["D1", "D3", "D4", "D5", "D6", "D8"].map((d) => [d, lane.cards.filter((c) => c.deck === d).length])),
  {D1: 5, D3: 1, D4: 1, D5: 6, D6: 1, D8: 14}, "by deck");

/* ---- each card's scenarios, run ---- */
const cards = loadCardIndex();
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => lane.cards.some((c) => c.name === f.card));
eq(files.map((f) => f.card).sort(), lane.cards.map((c) => c.name).sort(), "each has its scenarios");
for (const file of files) {
  ok(file.scenarios.length >= 4, `${file.card}: each way and an edge, four scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}

const scriptOf = (name) => structuredClone(loadCardScripts().find((f) => f.script.identity.name === name).script);
const refused = (script, pattern, message) => {
  const verdict = compileScript(script);
  ok(verdict.definition === null || verdict.problems.length > 0, `${message}: not accepted`);
  ok(verdict.problems.some((p) => pattern.test(p)), `${message}: ${verdict.problems.join(" | ")}`);
};

/* ---- another target for each time it was kicked: a spell's count only (Comet Storm) ---- */
{
  const storm = scriptOf("Comet Storm");
  eq(compileScript(structuredClone(storm)).problems, [], "Comet Storm compiles");
  const spell = storm.abilities.find((a) => a.kind === "spell");
  eq(spell.targets[0].count, {min: 1, max: 1, plusKicked: true}, "its count is one target, plus one for each kick");
  const loose = structuredClone(storm);
  loose.abilities.find((a) => a.kind === "spell").targets[0].count.plusKicked = "yes";
  refused(loose, /count/, "plusKicked that is not true");
  const other = scriptOf("Garruk Wildspeaker");
  const walker = other.abilities.find((a) => a.kind === "activated" && a.targets?.length);
  walker.targets[0].count = {min: 1, max: 1, plusKicked: true};
  refused(other, /another target for each time it was kicked|spell/i, "plusKicked on an ability that is not a spell's");
}

/* ---- join forces: its one shape (Minds Aglow) ---- */
{
  const minds = scriptOf("Minds Aglow");
  eq(compileScript(structuredClone(minds)).problems, [], "Minds Aglow compiles");
  for (const [key, value] of [["amountX", false], ["ifPaid", false]]) {
    const bad = structuredClone(minds);
    bad.abilities[0].effects[0][key] = value;
    refused(bad, /Join forces/, `join forces with ${key} ${value}`);
  }
  const who = structuredClone(minds);
  who.abilities[0].effects[0].who = "you";
  refused(who, /Join forces/, "join forces with a who");
}

/* ---- "for each player who did" (Tempt with Discovery) ---- */
{
  const tempt = scriptOf("Tempt with Discovery");
  eq(compileScript(structuredClone(tempt)).problems, [], "Tempt with Discovery compiles");
  const bad = structuredClone(tempt);
  bad.abilities[0].effects.find((e) => e.each === "who did").each = "who didnt";
  refused(bad, /each/i, "an unknown repetition");
}

/* ---- the static rules the load added are declared, and each is read where it says ---- */
{
  ok(Object.hasOwn(STATIC_RULES, "goaded") && Object.hasOwn(STATIC_RULES, "spend-as-any-color"), "goaded and spend-as-any-color are declared static rules");
  const blade = scriptOf("Bloodthirsty Blade");
  ok(JSON.stringify(blade.abilities).includes('"goaded"'), "Bloodthirsty Blade grants goaded as a static rule");
  const oath = scriptOf("Oath of Nissa");
  ok(JSON.stringify(oath.abilities).includes('"spend-as-any-color"'), "Oath of Nissa is the rule of spending mana as any color");
}

console.log(`engine-boxes-load-1115: ${checks} checks passed`);
