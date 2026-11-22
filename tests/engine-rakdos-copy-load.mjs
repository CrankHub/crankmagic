/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE CARD LOAD OF ROB'S RAKDOS COPY AND LEGENDS LIST (2026-11-05): every card of it playable but Deadpool, and what the scenarios of the
 * 23 written for it cannot reach.
 *
 * - The 82 distinct cards (99 copies) of the list Rob pasted on 2026-11-04 are the lane file
 *   `docs/engine/card-load-rakdos-copy-2026-11-05/lane-rakdos-copy.json`; Deadpool, Trading Card is left out (Rob, 2026-11-05) and named
 *   there so; each of the other 81 is a definition every table plays (`tableDefinition`), and the 23 the engine lacked have their
 *   scenarios run here on their own, so a change to one shows at once.
 * - The legend rule not applying (The Master, Multiplied; Mirror Box), a triggered ability that can't make you sacrifice or exile (The
 *   Master, Multiplied), "for each other creature with the name of it" (Mirror Box): proved by their scenarios; the rule keys are held here.
 * - Blitz (Jaxis, the Troublemaker): a mana cost once, without X, on a creature.
 * - Coin flips and dice with rows (Mirror March; Delina, Wild Mage): the flips, the rows that cover every result once, "roll again".
 * - "Half their life, rounded up" (Shredder, Shadow Master).
 * - Soulbond (Mirage Phalanx): a pairing made, kept while both are creatures under one controller, ended by itself.
 * - "The lands defending player controls" (Elturel Survivors) and "attacking, as it died" (Eomer, Marshal of Rohan).
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadCardIndex, loadCardScenarios, loadCardScripts} from "../game/tools/engine-cards.mjs";
import {tableDefinition} from "../game/engine/cards/definitions.mjs";
import {compileScript} from "../game/engine/cards/index.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {createState, addObject} from "../game/engine/state/index.mjs";
import {createRng} from "../game/engine/rng.mjs";
import {flipCoin} from "../game/engine/script/effects/resources.mjs";
import {pair} from "../game/engine/script/effects/permanents.mjs";
import {amountOf, amountProblems} from "../game/engine/script/amount.mjs";
import {checkStateBasedActions} from "../game/engine/rules/sba.mjs";
import {lastKnown} from "../game/engine/rules/layers.mjs";
import {compileSelector, matchesLastKnown} from "../game/engine/script/filter.mjs";
import {isPrimitive, isKeyword} from "../game/engine/vocabulary.mjs";
import {historyLines} from "../game/room/history.mjs";
import {validateScript} from "../game/engine/script/schema.mjs";
import {beginResolution} from "../game/engine/script/resolution.mjs";
import {moveZoneAll} from "../game/engine/script/effects/zones.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

/* ---- the list's cards: all of them but one playable, the 23 that were written with their scenarios ---- */
const lane = JSON.parse(readFileSync(new URL("../docs/engine/card-load-rakdos-copy-2026-11-05/lane-rakdos-copy.json", import.meta.url), "utf8"));
eq(lane.cards.length, 81, "the list has 82 distinct cards, 81 without Deadpool");
eq(lane.cards.reduce((n, c) => n + c.copies, 0), 98, "and they are 98 copies, 99 with Deadpool");
eq(new Set(lane.cards.map((c) => c.name)).size, 81, "each once");
eq(lane.leftOut.map((c) => c.name), ["Deadpool, Trading Card"], "Deadpool is the one left out, by name");
ok(!lane.cards.some((c) => c.name === "Deadpool, Trading Card") && !tableDefinition("Deadpool, Trading Card"), "and the engine does not play it");
eq(lane.cards.filter((c) => !tableDefinition(c.name)).map((c) => c.name), [], "every other one is a definition the table plays");
const written = lane.cards.filter((c) => c.loadedHere).map((c) => c.name).sort();
eq(written, ["Banshee of the Dread Choir", "Blade of Selves", "Come Back Wrong", "Dalek Squadron", "Dark Privilege", "Delina, Wild Mage", "Elturel Survivors",
  "Firbolg Flutist", "Flameshadow Conjuring", "Heroes' Podium", "Jaxis, the Troublemaker", "Mimic Vat", "Mirage Phalanx", "Mirror Box",
  "Mirror March", "Mordor on the March", "Raphael, Tough Turtle", "Rionya, Fire Dancer", "Shredder, Shadow Master", "The Master, Multiplied", "Tiamat's Fanatics",
  "Urabrask's Forge", "Éomer, Marshal of Rohan"], "23 of them were written for this load");
const cards = loadCardIndex();
const files = loadCardScenarios().map((f) => f.scenarios).filter((f) => written.includes(f.card));
eq(files.map((f) => f.card).sort(), written, "each has its scenarios");
for (const file of files) {
  /* The two the compiler translated (Dalek Squadron, Tiamat's Fanatics: keywords alone) were promoted on a reviewer's reading with the
     smoke game it drafted; the rest were written with the card and an edge or more. */
  ok(file.scenarios.length >= (["Dalek Squadron", "Tiamat's Fanatics"].includes(file.card) ? 1 : 2), `${file.card}: the card and an edge, two scenarios or more`);
  for (const scenario of file.scenarios) { runScenario(scenario, cards.definition, file.fixtures ?? {}); checks += 1; }
}
const scriptOf = (name) => structuredClone(loadCardScripts().find((f) => f.script.identity.name === name).script);
const refused = (script, pattern, message) => {
  const verdict = compileScript(script);
  ok(verdict.definition === null || verdict.problems.length > 0, `${message}: not accepted`);
  ok(verdict.problems.some((p) => pattern.test(p)), `${message}: ${verdict.problems.join(" | ")}`);
};
const players = (n = 2) => createState({matchId: "rakdos", seed: "rakdos", players: ["Rob", "Maya", "Trey"].slice(0, n).map((name) => ({name}))});
const creatureOf = (state, seat, name, more = {}) => addObject(state, {card: name, types: ["Creature"], subtypes: [], colors: [], power: 2, toughness: 2, owner: seat, controller: seat, ...more}, "battlefield", null);

/* ---- the new words are declared ---- */
{
  ok(isPrimitive("flipCoin") && isPrimitive("pair"), "flipCoin and pair are declared primitives");
  ok(isKeyword("blitz") && isKeyword("soulbond"), "blitz and soulbond are declared keywords");
}

/* ---- blitz: a mana cost, once, without X, on a creature ---- */
{
  const jaxis = scriptOf("Jaxis, the Troublemaker");
  eq(compileScript(structuredClone(jaxis)).problems, [], "Jaxis compiles with his blitz");
  const x = structuredClone(jaxis);
  x.abilities.find((a) => a.keyword === "blitz").cost = [{atom: "mana", cost: "{X}{R}"}];
  refused(x, /blitz cost of mana, once, without X/, "a blitz cost with X");
  const life = structuredClone(jaxis);
  life.abilities.find((a) => a.keyword === "blitz").cost = [{atom: "mana", cost: "{1}{R}"}, {atom: "payLife", amount: 2}];
  refused(life, /blitz cost of mana, once, without X/, "a blitz cost with life in it");
  const spell = structuredClone(jaxis);
  spell.identity.types = ["Enchantment"];
  refused(spell, /blitz on a card that is no creature/, "blitz on a card that is no creature");
}

/* ---- the legend rule and what a trigger can't remove ---- */
{
  const master = scriptOf("The Master, Multiplied");
  eq(master.abilities.filter((a) => a.rule).map((a) => a.rule).sort(), ["legend-rule-off", "triggers-cant-remove"], "The Master turns the legend rule off and bars a trigger's sacrifice and exile");
  eq(scriptOf("Mirror Box").abilities.find((a) => a.rule === "legend-rule-off")?.affects, {controller: "you"}, "Mirror Box turns it off for its controller alone");
  assert.throws(() => compileSelector({what: "permanent", types: ["Creature"], sharesNameWithIt: "yes"}), /sharesNameWithIt is true/);
  assert.throws(() => compileSelector({what: "permanent", types: ["Creature"], otherThanRemembered: false}), /otherThanRemembered is true/);
  checks += 2;
  const SAME = {what: "permanent", types: ["Creature"], sharesNameWithIt: true};
  const state = players(2);
  const a = creatureOf(state, 0, "Twin"), b = creatureOf(state, 0, "Twin"), c = creatureOf(state, 0, "Other"), d = creatureOf(state, 1, "Twin");
  const same = compileSelector(SAME);
  eq([same(state, a, {affected: b}), same(state, b, {affected: b}), same(state, c, {affected: b}), same(state, d, {affected: b}), same(state, a, {})], [true, false, false, true, false],
    "another with the name of the one counted for: not itself, not another name, none when nothing is counted for");
  state.objects[a].faceDown = true;
  eq(same(state, a, {affected: b}), false, "a face-down permanent has no name (CR 708.2)");
  const left = compileSelector({what: "permanent", types: ["Creature"], otherThanRemembered: true});
  eq([left(state, c, {remembered: [c]}), left(state, c, {remembered: [d]}), left(state, c, {})], [false, true, true], "not what the effect before it remembered");
}

/* ---- the random stream: a die and a coin are one call, which a scenario can pin ---- */
{
  const a = createRng("roll"), b = createRng("roll");
  const seen = new Set();
  for (let n = 0; n < 400; n += 1) { const r = a.roll(20); seen.add(r); eq(r, b.int(20) + 1, "roll(sides) is int(sides) + 1 from the same stream"); }
  eq([seen.size, Math.min(...seen), Math.max(...seen)], [20, 1, 20], "every face from 1 to 20 and nothing else");
  const pinned = files.find((f) => f.card === "Mirror March").scenarios.find((s) => Array.isArray(s.rolls));
  ok(pinned && pinned.rolls.length >= 2, "a scenario pins its results with `rolls`");
}

/* ---- "flip a coin until you lose a flip" ---- */
{
  const state = players();
  const stub = (list) => ({roll: (n) => { assert.equal(n, 2, "a coin is a die of two sides"); return list.shift(); }});
  const flip = (params, list) => { const context = {controller: 0, source: null}; const events = flipCoin(state, params, context, stub(list)); return {events, context}; };
  let r = flip({until: "lose"}, [1, 1, 2, 1]);
  eq([r.events.map((e) => e.data.fields.won), r.context.flipsWon], [[true, true, false], 2], "until a flip is lost: the two wins and the loss that ends it (the fourth result unused)");
  r = flip({until: "lose"}, [2]);
  eq([r.events.length, r.context.flipsWon], [1, 0], "lost at once: one flip, none won");
  r = flip({count: 3}, [1, 2, 1]);
  eq([r.events.length, r.context.flipsWon], [3, 2], "three flips: all three, whatever they land");
  r = flip({}, [2]);
  eq([r.events.length, r.context.flipsWon], [1, 0], "once, unsaid");
  const wins = {roll: () => 1}, many = {controller: 0, source: null};
  eq(flipCoin(state, {until: "lose"}, many, wins).length, 1000, "a coin that never lands the other way is stopped at a thousand flips");
  assert.throws(() => flipCoin(state, {}, {controller: 0, source: null}, null), /random stream/);
  checks += 1;
  eq(r.events[0].kind, "GameEventCoinFlipped", "said to everyone");
  eq(historyLines({kind: "GameEventCoinFlipped", data: {turn: 2, fields: {player: {playerId: 0}, won: false}}}, ["Rob"]), [{turn: 2, text: "Rob flipped a coin and lost the flip", actor: 0}], "the history says the flip");
  eq([amountOf(state, {flipsWon: true}, {controller: 0, flipsWon: 3}), amountOf(state, {flipsWon: true}, {controller: 0})], [3, 0], "flipsWon counts what the flips before it won, none flipped is 0");
  eq([amountProblems({flipsWon: true}), amountProblems({flipsWon: 1}).length], [[], 1], "flipsWon is true");
  const march = scriptOf("Mirror March");
  const flipEffect = march.abilities[0].effects[0];
  for (const bad of [{until: "win"}, {count: 0}, {count: 1.5}]) {
    const script = structuredClone(march);
    script.abilities[0].effects[0] = {effect: "flipCoin", ...bad};
    refused(script, /coin is flipped once|flipCoin/i, `a coin flipped ${JSON.stringify(bad)}`);
  }
  ok(flipEffect.until === "lose", "Mirror March flips until it loses");
}

/* ---- a die with rows: every result in exactly one row ---- */
{
  const delina = scriptOf("Delina, Wild Mage");
  eq(compileScript(structuredClone(delina)).problems, [], "Delina compiles with her rows");
  const rows = (change) => { const s = structuredClone(delina); change(s.abilities[0].effects[0]); return s; };
  refused(rows((d) => { d.rows[1].from = 16; }), /Result 15 is in no row/, "a result in no row");
  refused(rows((d) => { d.rows[1].from = 14; }), /Result 14 is in two rows/, "a result in two rows");
  refused(rows((d) => { d.rows[1].to = 21; }), /within the die's sides/, "a row past the die's last face");
  refused(rows((d) => { d.rows[0].from = 0; }), /within the die's sides/, "a row from 0");
  refused(rows((d) => { d.rows[1].again = "always"; }), /says "may" or "must"/, "a row that rolls again some other way");
  refused(rows((d) => { d.rows[0].effects = "none"; }), /effects are a list/, "a row whose effects are not a list");
  refused(rows((d) => { d.rows = []; }), /rows are a list/, "no rows");
  const inner = rows((d) => { d.rows[0].effects = [{effect: "rollDie", sides: 1}]; });
  ok(validateScript(inner).errors.some((e) => /\.effects\[0\]\.sides$/.test(e.path)), "the schema reads the effects inside a row (a die of one side in it is refused)");
  eq(validateScript(structuredClone(delina)).errors, [], "and Delina's own rows are clean");
  const plain = scriptOf("Ancient Copper Dragon");
  eq(validateScript(plain).errors, [], "a die without rows is as it was: the schema asks nothing of its children");
  const nested = rows((d) => { d.rows[0].effects = [{effect: "bogusEffect"}]; });
  const verdict = compileScript(nested);
  ok(verdict.definition === null || verdict.problems.length > 0, "an effect nested in a row is checked as any other is");
  ok(compileScript(structuredClone(delina)).definition.abilities.find((a) => a.kind === "triggered").effects[0].rows[0].effects[0].except.addAbilities[0].trigger.on === "GameEventTurnPhase",
    "and a token's given ability inside a row is compiled as it is everywhere (its end-of-combat trigger)");
}

/* ---- a row that rolls again, and a delayed trigger inside a row ---- */
{
  const state = players();
  const rolls = [3, 4, 15];
  const die = {effect: "rollDie", sides: 20, rows: [{from: 1, to: 10, effects: [{effect: "gainLife", amount: 1}], again: "must"}, {from: 11, to: 20, effects: [{effect: "gainLife", amount: 100}]}]};
  const before = state.players[0].life;
  beginResolution(state, [die], {controller: 0, source: null}, {roll: () => rolls.shift(), int: () => 0});
  eq([state.players[0].life - before, rolls], [102, []], "a row that must roll again does: 3 and 4 gain 1 each and roll on, 15 gains 100 and stops");
  const delina = scriptOf("Delina, Wild Mage");
  delina.abilities[0].effects[0].rows[0].effects.push({effect: "delayedTrigger", at: "someday", effects: [{effect: "gainLife", amount: 1}]});
  refused(delina, /a moment no delayed trigger waits for/, "a delayed trigger in a row is checked as any other is");
}

/* ---- a trigger's mass exile of tokens does nothing to the ones The Master protects, a spell's does ---- */
{
  const state = players();
  const master = cards.definition("The Master, Multiplied");
  addObject(state, {...master, card: "The Master, Multiplied", owner: 0, controller: 0}, "battlefield", null);
  const mine = creatureOf(state, 0, "Smoke Token", {token: true}), theirs = creatureOf(state, 1, "Smoke Token", {token: true});
  const sweep = () => moveZoneAll(state, {selector: {what: "permanent", types: ["Creature"], token: true}, to: "exile"}, {controller: 0, source: null}, null);
  state.resolving = {context: {controller: 0, triggered: true}, queue: [], events: []};
  sweep();
  eq([state.objects[mine]?.zone, state.objects[theirs]?.zone === "battlefield"], ["battlefield", false], "a trigger of Rob's exiles Maya's tokens and not his own");
  state.objects[theirs] = undefined; delete state.objects[theirs];
  const again = creatureOf(state, 0, "Smoke Token", {token: true});
  state.resolving.context.triggered = false;
  sweep();
  eq([state.objects[mine]?.zone === "battlefield", state.objects[again]?.zone === "battlefield"], [false, false], "a spell's takes them all");
  /* `how` names the ways: a protection from sacrifice alone lets a trigger exile, and one from exile alone lets it sacrifice. */
  const guard = state.objects[Object.keys(state.objects).map(Number).find((id) => state.objects[id].card === "The Master, Multiplied")].abilities.find((a) => a.rule === "triggers-cant-remove");
  const third = creatureOf(state, 0, "Smoke Token", {token: true});
  guard.how = ["sacrifice"];
  state.resolving = {context: {controller: 0, triggered: true}, queue: [], events: []};
  sweep();
  eq(state.objects[third]?.zone === "battlefield", false, "protected from sacrifice alone, a trigger's exile still takes it");
  const fourth = creatureOf(state, 0, "Smoke Token", {token: true});
  guard.how = ["exile"];
  sweep();
  eq(state.objects[fourth]?.zone, "battlefield", "protected from exile, a trigger's exile does not");
  state.resolving = null;
}

/* ---- half their life, rounded up ---- */
{
  const state = players();
  const at = (life, half) => { state.players[0].life = life; return amountOf(state, {lifeTotal: "you", half}, {controller: 0}); };
  eq([at(35, "up"), at(36, "up"), at(1, "up"), at(0, "up")], [18, 18, 1, 0], "half rounded up: 35 is 18, 36 is 18, 1 is 1");
  eq([at(35, true), at(36, true), at(1, true)], [17, 18, 0], "and rounded down, as it was: 17, 18, 0");
  eq([amountProblems({lifeTotal: "you", half: "up"}), amountProblems({lifeTotal: "you", half: "down"}).length], [[], 1], "half is true or \"up\"");
}

/* ---- soulbond: a pairing made, and ended by itself ---- */
{
  const state = players(2);
  const a = creatureOf(state, 0, "Smoke A"), b = creatureOf(state, 0, "Smoke B"), c = creatureOf(state, 1, "Smoke C");
  const land = addObject(state, {card: "Smoke Land", types: ["Land"], subtypes: [], colors: [], owner: 0, controller: 0}, "battlefield", null);
  const via = (source, other, controller = 0) => pair(state, {}, {source, controller, remembered: [other]});
  eq(via(a, c).length, 0, "no pairing with a creature of another player's");
  eq(via(a, land).length, 0, "nor with a land");
  eq(via(a, a).length, 0, "nor with itself");
  eq(via(a, b).map((e) => e.kind), ["GameEventPaired"], "two creatures of one controller are paired, and it is said");
  eq([state.objects[a].pairedWith, state.objects[b].pairedWith], [b, a], "each knows the other");
  const d = creatureOf(state, 0, "Smoke D");
  eq(via(d, a).length + via(a, d).length, 0, "a creature already paired is paired with no other");
  eq(pair(state, {with: "that card"}, {source: d, controller: 0, about: {card: b}}).length, 0, "nor is that card, when it is paired");
  eq(pair(state, {with: "that card"}, {source: d, controller: 0, about: {card: creatureOf(state, 0, "Smoke E")}}).length, 1, "that card, when it is not, is");
  checkStateBasedActions(state);
  eq([state.objects[a].pairedWith, state.objects[b].pairedWith], [b, a], "a pair of creatures under one controller stays paired as the game is checked");
  delete state.objects[b].pairedWith;
  checkStateBasedActions(state);
  eq([state.objects[a].pairedWith, state.objects[b].pairedWith], [undefined, undefined], "a pairing only one of them remembers is no pairing");
  via(a, b);
  state.objects[b].controller = 1;
  checkStateBasedActions(state);
  eq([state.objects[a].pairedWith, state.objects[b].pairedWith], [undefined, undefined], "a change of control ends it for both (CR 702.95e)");
  eq([via(a, d).length, state.objects[a].pairedWith], [0, undefined], "d is still paired with the one it was paired with, so a cannot be paired with it");
  const f = creatureOf(state, 0, "Smoke F"), g = creatureOf(state, 0, "Smoke G");
  eq(via(f, g).length, 1, "a fresh pair");
  state.objects[g].types = ["Artifact"];
  checkStateBasedActions(state);
  eq([state.objects[f].pairedWith, state.objects[g].pairedWith], [undefined, undefined], "one that stops being a creature ends it for both");
  const h = creatureOf(state, 0, "Smoke H"), i = creatureOf(state, 0, "Smoke I");
  via(h, i);
  delete state.objects[i];
  state.zones.battlefield = state.zones.battlefield.filter((id) => id !== i);
  checkStateBasedActions(state);
  eq(state.objects[h].pairedWith, undefined, "one that has left the battlefield leaves the other unpaired");
  eq(historyLines({kind: "GameEventPaired", data: {turn: 1, fields: {player: {playerId: 0}, card: {cardId: 7, name: "Mirage Phalanx"}, with: {cardId: 8, name: "Smoke A"}}}}, ["Rob"])[0].text,
    "Rob paired Mirage Phalanx with Smoke A", "the history says who was paired with whom");
  for (const [bad, pattern] of [[{what: "permanent", paired: "yes"}, /paired is true or false/], [{what: "permanent", pairedWithSource: false}, /pairedWithSource is true/]]) {
    assert.throws(() => compileSelector(bad), pattern); checks += 1;
  }
  const paired = compileSelector({what: "permanent", types: ["Creature"], paired: true}), unpaired = compileSelector({what: "permanent", types: ["Creature"], paired: false});
  state.objects[a].pairedWith = d; state.objects[d].pairedWith = a;
  eq([paired(state, a, {controller: 0}), unpaired(state, a, {controller: 0}), paired(state, c, {controller: 0}), unpaired(state, c, {controller: 0})], [true, false, false, true], "paired and unpaired, each read off the object");
  const joined = compileSelector({what: "permanent", pairedWithSource: true});
  eq([joined(state, a, {source: a}), joined(state, d, {source: a}), joined(state, c, {source: a}), joined(state, a, {source: c})], [true, true, false, false], "the source and its partner, no one else, and none when the source is unpaired");
  const phalanx = scriptOf("Mirage Phalanx");
  eq(compileScript(structuredClone(phalanx)).problems, [], "Mirage Phalanx compiles");
  const copy = scriptOf("Mirage Phalanx");
  ok(JSON.stringify(copy).includes('"removeKeywords":["Soulbond"]'), "its token copy loses soulbond by name");
}

/* ---- "the lands defending player controls": the player this attacker attacks ---- */
{
  const state = players(3);
  const attacker = creatureOf(state, 0, "Smoke Attacker");
  const mine = addObject(state, {card: "Smoke Land A", types: ["Land"], subtypes: [], colors: [], owner: 0, controller: 0}, "battlefield", null);
  const maya = addObject(state, {card: "Smoke Land B", types: ["Land"], subtypes: [], colors: [], owner: 1, controller: 1}, "battlefield", null);
  const trey = addObject(state, {card: "Smoke Land C", types: ["Land"], subtypes: [], colors: [], owner: 2, controller: 2}, "battlefield", null);
  const lands = compileSelector({what: "permanent", types: ["Land"], controller: "defending player"});
  const read = (context) => [mine, maya, trey].map((id) => lands(state, id, context));
  eq(read({affected: attacker}), [false, false, false], "not attacking, it is no one's");
  state.combat = {attackingPlayerId: 0, defenders: [1], attacks: [{attacker, defender: 1, blocked: false, blockers: []}]};
  eq(read({affected: attacker}), [false, true, false], "attacking Maya: Maya's lands");
  eq(read({source: attacker}), [false, true, false], "the source, when nothing is counted for another");
  state.combat.attacks[0].defender = 2;
  eq(read({affected: attacker}), [false, false, true], "attacking Trey: Trey's");
  eq(read({affected: mine}), [false, false, false], "a creature that is not attacking: no one's");
}

/* ---- "attacking, as it died" ---- */
{
  const state = players(2);
  const a = creatureOf(state, 0, "Smoke Attacker"), b = creatureOf(state, 0, "Smoke Home");
  state.combat = {attackingPlayerId: 0, defenders: [1], attacks: [{attacker: a, defender: 1, blocked: false, blockers: []}]};
  eq([lastKnown(state, a).attacking, lastKnown(state, b).attacking], [true, false], "the last known information says it was attacking, or not");
  const dies = {types: ["Creature"], attacking: true};
  eq([matchesLastKnown(dies, lastKnown(state, a)), matchesLastKnown(dies, lastKnown(state, b))], [true, false], "a filter on what has left asks it");
  assert.throws(() => matchesLastKnown({attacking: false}, lastKnown(state, a)), /attacking: true/);
  assert.throws(() => matchesLastKnown({attacking: "you"}, lastKnown(state, a)), /attacking: true/);
  checks += 2;
}

console.log(`engine-rakdos-copy-load: ${checks} checks passed`);
