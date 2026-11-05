/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S MASTER TABLE, COLUMN AL (2026-11-04): every card of his boxes playable in the engine, and what the
 * scenarios of the 15 that were written for it cannot reach.
 *
 * - The 595 cards of the workbook's Master sheet with a number above 0 in column AL ("Total-A", 920 copies) are the lane file
 *   `docs/engine/card-load-master-al-2026-11-04/lane-master-al.json`; each is a definition every table plays (`tableDefinition`),
 *   and the 15 that the engine lacked have their scenarios run here on their own, so a change to one shows at once.
 * - "You may behold a Dragon" as an additional cost (Dispelling Exhale; CR 701.4a): optional in a spell's own additional cost
 *   alone -- never in a choice ("behold an Elf or pay {2}"), nor in a flashback cost.
 * - Harmonize (Roamer's Routine): a mana cost alone, on an instant or sorcery.
 * - "A card that shares a color with a legendary creature you control" (Ringsight): `sharesColor` takes a selector of permanents,
 *   not any other value.
 * - "Choose an opponent" (Faramir, Prince of Ithilien): one opponent still in the game needs no question, two or more are asked,
 *   and what is chosen is a delayed trigger's player -- a chosen player who has left the game, or none chosen, waits for no one.
 * - "If they didn't attack you that turn": a condition that is true or false and nothing else.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadCardIndex, loadCardScenarios, loadCardScripts} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {compileScript} from "../game/engine/cards/index.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions, applyAction} from "../game/engine/rules/actions.mjs";
import {awaitingChoice} from "../game/engine/rules/turn.mjs";
import {compileSelector} from "../game/engine/script/filter.mjs";
import {conditionProblems} from "../game/engine/script/condition.mjs";
import {ASKING} from "../game/engine/script/effects/asking.mjs";
import {delayedTrigger} from "../game/engine/script/effects/permanents.mjs";
import {createState} from "../game/engine/state/index.mjs";
import {isPrimitive, isKeyword} from "../game/engine/vocabulary.mjs";
import {NEEDS_A_DECISION} from "../game/engine/script/effects/index.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the workbook's cards: all of them playable, the 15 that were written with their scenarios ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-master-al-2026-11-04/lane-master-al.json", import.meta.url), "utf8"));
eq(lane.cards.length, 595, "the Master sheet has 595 distinct cards with column AL above 0");
eq(lane.cards.reduce((n, c) => n + c.copies, 0), 920, "and they are 920 copies in the deck boxes");
eq(new Set(lane.cards.map((c) => c.name)).size, 595, "each once");
eq(lane.cards.filter((c) => !tableDefinition(c.name)).map((c) => c.name), [], "every one is a definition the table plays");
const written = lane.cards.filter((c) => c.loadedHere).map((c) => c.name).sort();
eq(written, ["Affectionate Indrik", "Bifur, Melodic Rider", "Dewdrop Cure", "Dispelling Exhale", "Dusyut Earthcarver", "Faramir, Prince of Ithilien", "Inevitable Defeat",
  "Jeskai Devotee", "Kwain, Itinerant Meddler", "Lasyd Prowler", "Palantír of Orthanc", "Rainveil Rejuvenator", "Ringsight", "Roamer's Routine", "Wargling"],
  "15 of them were written for this load");
const cards = loadCardIndex();
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => written.includes(f.card));
eq(files.map((f) => f.card).sort(), written, "each has its scenarios");
for (const file of files) {
  ok(file.scenarios.length >= 3, `${file.card}: every way of it and an edge, three scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}

const scriptOf = (name) => structuredClone(loadCardScripts().find((f) => f.script.identity.name === name).script);
const refused = (script, pattern, message) => {
  const verdict = compileScript(script);
  ok(verdict.definition === null || verdict.problems.length > 0, `${message}: not accepted`);
  ok(verdict.problems.some((p) => pattern.test(p)), `${message}: ${verdict.problems.join(" | ")}`);
};

/* ---- an optional behold: a spell's own additional cost, and nowhere else ---- */
{
  const exhale = scriptOf("Dispelling Exhale");
  eq(compileScript(structuredClone(exhale)).problems, [], "Dispelling Exhale compiles with its optional behold");
  const choice = structuredClone(exhale);
  choice.abilities[0].additionalCost = [{atom: "oneOf", options: [[{atom: "behold", selector: {subtypes: ["Dragon"]}, optional: true}], [{atom: "mana", cost: "{1}"}]]}];
  refused(choice, /behold|optional/i, "an optional behold inside a choice of additional costs");
  const kindle = scriptOf("Kindle the Inner Flame");
  const flashback = kindle.abilities.find((a) => a.keyword === "flashback");
  flashback.cost.find((a) => a.atom === "behold").optional = true;
  refused(kindle, /behold|optional/i, "an optional behold in a flashback cost");
  const odd = structuredClone(exhale);
  odd.abilities[0].additionalCost = [{atom: "discard", optional: true}];
  refused(odd, /optional/i, "an optional additional cost that is neither a blight nor a behold");
}

/* ---- harmonize: mana alone, on an instant or sorcery ---- */
{
  ok(isKeyword("harmonize"), "harmonize is a declared keyword");
  const routine = scriptOf("Roamer's Routine");
  eq(compileScript(structuredClone(routine)).problems, [], "Roamer's Routine compiles with its harmonize");
  const life = structuredClone(routine);
  life.abilities.find((a) => a.keyword === "harmonize").cost = [{atom: "mana", cost: "{4}{G}"}, {atom: "payLife", amount: 2}];
  refused(life, /harmonize cost is mana/, "a harmonize cost with life in it");
  const free = structuredClone(routine);
  free.abilities.find((a) => a.keyword === "harmonize").cost = [{atom: "mana", cost: ""}];
  refused(free, /harmonize cost is mana/, "a harmonize cost of no mana");
  const permanent = structuredClone(routine);
  permanent.identity.types = ["Enchantment"];
  refused(permanent, /harmonize on a card that is not an instant or sorcery/, "harmonize on a permanent card");
}

/* ---- harmonize: the creature an offer names is the one tapped -- an offer for another is another action ---- */
{
  const file = loadCardScenarios().map((f) => f.scenarios).find((f) => f.card === "Roamer's Routine");
  const base = file.scenarios.find((s) => /Which creature is the caster's choice/.test(s.name));
  const {state} = runScenario({...base, steps: base.steps.slice(0, 3), expect: []}, cards.definition, file.fixtures ?? {});
  const offers = legalActions(state, 0).filter((a) => a.kind === "cast" && a.harmonize !== undefined);
  eq(offers.map((o) => o.costNames[0]).sort(), ["Smoke Two", "Smoke Two B"], "two creatures of one power are two offers, each naming its creature");
  const [first, second] = offers;
  state.objects[second.harmonize].tapped = true;
  assert.throws(() => applyAction(state, 0, {...first, harmonize: second.harmonize}), /not a legal action/);
  checks += 1;
  ok(legalActions(state, 0).filter((a) => a.kind === "cast" && a.harmonize !== undefined).length === 1, "a creature tapped meanwhile is no longer offered");
}

/* ---- Dewdrop Cure: creature cards of mana value 2 or less, up to two -- and up to three, the gift promised ---- */
{
  const file = loadCardScenarios().map((f) => f.scenarios).find((f) => f.card === "Dewdrop Cure");
  const base = file.scenarios[0], taps = base.steps.filter((s) => s.tap);
  for (const [gift, most] of [[undefined, 2], [1, 3]]) {
    const cast = {cast: "Dewdrop Cure", seat: 0, targets: "any", ...(gift !== undefined ? {gift} : {})};
    const {state} = runScenario({...base, steps: [...taps, cast], expect: []}, cards.definition, file.fixtures ?? {});
    const choice = awaitingChoice(state);
    eq([choice.min, choice.max], [0, most], `${gift === undefined ? "without" : "with"} the gift: none up to ${most} cards`);
    eq(choice.options.map((o) => o.label).sort(), ["Smoke One", "Smoke Two", "Smoke Zero"], "only creature cards of mana value 2 or less (not the three-drop, not the enchantment)");
  }
}

/* ---- a color shared with a permanent a selector describes ---- */
{
  compileSelector({what: "card", zone: "library", sharesColor: "self"});
  compileSelector({what: "card", zone: "library", sharesColor: {types: ["Creature"], supertypes: ["Legendary"], controller: "you"}});
  checks += 2;
  assert.throws(() => compileSelector({what: "card", zone: "library", sharesColor: "green"}), /sharesColor is "self"/);
  assert.throws(() => compileSelector({what: "card", zone: "library", sharesColor: ["G"]}), /sharesColor is "self"/);
  assert.throws(() => compileSelector({what: "card", zone: "library", sharesColor: {bogus: true}}));
  checks += 3;
}

/* ---- "if they didn't attack you": true or false ---- */
{
  eq(conditionProblems({activePlayerAttackedYou: false}), [], "false is a condition");
  eq(conditionProblems({activePlayerAttackedYou: true}), [], "and so is true");
  ok(conditionProblems({activePlayerAttackedYou: "no"}).length > 0, "a word is not");
}

/* ---- "choose an opponent": asked of two or more, nobody asked of one ---- */
{
  ok(isPrimitive("choosePlayer") && NEEDS_A_DECISION.includes("choosePlayer") && typeof ASKING.choosePlayer?.open === "function", "choosePlayer is a declared primitive that asks");
  const state = createState({matchId: "master-al", seed: "choose", players: [{name: "Rob"}, {name: "Maya"}, {name: "Trey"}]});
  const context = {controller: 0, source: null};
  ok(ASKING.choosePlayer.open(state, {}, context) === true, "two opponents are asked");
  eq(state.awaiting.options, [1, 2], "which of them, in seat order");
  eq(state.awaiting.player, 0, "by their controller");
  eq(ASKING.choosePlayer.choice(state, state.awaiting).options.map((o) => o.label), ["Maya", "Trey"], "each by name");
  eq(ASKING.choosePlayer.apply(state, state.awaiting, [1]).chosenPlayer, 2, "the second is Trey");
  assert.throws(() => ASKING.choosePlayer.apply(state, state.awaiting, []), /Choose one opponent/);
  assert.throws(() => ASKING.choosePlayer.apply(state, state.awaiting, [0, 1]), /Choose one opponent/);
  checks += 2;
  state.awaiting = null;
  state.players[1].lost = true;
  const alone = {controller: 0, source: null};
  ok(ASKING.choosePlayer.open(state, {}, alone) === false && state.awaiting === null, "one opponent left in the game is chosen without a question");
  eq(alone.chosenPlayer, 2, "the one who is still there");
  state.players[2].lost = true;
  const none = {controller: 0, source: null};
  ok(ASKING.choosePlayer.open(state, {}, none) === false && none.chosenPlayer === undefined, "none left, none chosen");
}

/* ---- the chosen player's turn: a delayed trigger waits for it, and for no one if there is none ---- */
{
  const state = createState({matchId: "master-al", seed: "delayed", players: [{name: "Rob"}, {name: "Maya"}, {name: "Trey"}]});
  delayedTrigger(state, {at: "end step", player: "the chosen player", effects: []}, {controller: 0, source: null, chosenPlayer: 2});
  eq(state.delayedTriggers[0].player, 2, "it waits for the chosen player's turn");
  delayedTrigger(state, {at: "end step", player: "the chosen player", effects: []}, {controller: 0, source: null});
  eq(state.delayedTriggers[1].player, -1, "with none chosen it waits for no turn");
  state.players[2].lost = true;
  delayedTrigger(state, {at: "end step", player: "the chosen player", effects: []}, {controller: 0, source: null, chosenPlayer: 2});
  eq(state.delayedTriggers[2].player, -1, "and a chosen player who has left the game has no turn to wait for (CR 800.4a)");
}

console.log(`engine-master-al-load: ${checks} checks passed`);
