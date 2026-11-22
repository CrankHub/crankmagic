/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* EVERY PREPARED CARD OFFERS ITS COPY (ROB-432, Rob's Play UX request RQ-04 of 2026-10-26).
 *
 * Rob: "Studious First-Year, a card with both a creature and a sorcery option. I cast as a creature. It's prepared. I should
 * have the option to cast a copy of it, which I currently don't." The acceptance: "for every card with Prepared in the card
 * data, after the creature half resolves prepared, the person is offered to cast the copy exactly as the Oracle text allows
 * (timing, cost, how often); the copy is a spell, never a permanent". tests/room-prepared.mjs walks Studious First-Year
 * through the room (timing, unprepare, replay). This holds every other card to the same, read from the card data itself:
 *   - each two-part card whose Oracle text says it "enters prepared": cast as the creature, it is prepared, the copy
 *     of its spell is in exile as a spell (no permanent type), offered to its controller with the table's taps (`preparedTaps`),
 *     cast, and then the creature is unprepared and the copy is neither offered again nor a permanent;
 *   - each one that becomes prepared only on a condition (an upkeep, a landfall, a tap cost) does not enter prepared.
 * Each is given a board where its spell has something to aim at: a creature card in Rob's graveyard, a small creature of
 * Maya's, and lands enough of every color that paying for the creature cannot spend the copy's color.
 */
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {legalActions} from "../game/engine/rules/actions.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

const index = loadCardIndex();
const DIR = fileURLToPath(new URL("../game/engine/cards/", import.meta.url));
const cards = readdirSync(DIR, {withFileTypes: true}).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(DIR + d.name).map((f) => `${DIR}${d.name}/${f}`))
  .filter((f) => f.endsWith(".json") && !f.endsWith(".scenarios.json")).map((f) => JSON.parse(readFileSync(f, "utf8")))
  .filter((j) => JSON.stringify(j.abilities ?? []).includes('"prepare') || /\bprepared\b/i.test(j.oracleText ?? ""))
  .filter((j) => (j.identity?.name ?? "").includes(" // "));
const FIX = {Bear: {types: ["Creature"], subtypes: ["Bear"], manaCost: "{1}{G}", colors: ["G"], power: 2, toughness: 2}};
const LANDS = ["Plains", "Island", "Swamp", "Mountain", "Forest"].flatMap((l) => Array(8).fill(l));
const PERMANENT = ["Creature", "Artifact", "Enchantment", "Planeswalker", "Land", "Battle"];
const play = (name, steps) => {
  return runScenario({name, pooledTaps: true, xTaps: true, phyrexianTaps: true, preparedTaps: true, library: ["Wastes", "Wastes", "Wastes", "Wastes"],
    setup: [{seat: 0, zone: "battlefield", cards: LANDS}, {seat: 0, zone: "hand", cards: [name]}, {seat: 0, zone: "graveyard", cards: ["Bear"]}, {seat: 1, zone: "battlefield", cards: ["Bear"]}],
    steps}, index.definition, FIX).state;
};
const exiled = (s, inset) => s.zones.exile.flat().map((id) => s.objects[id]).find((o) => o?.card === inset);
const source = (s, front) => s.zones.battlefield.flat().map((id) => s.objects[id]).find((o) => o?.card?.startsWith(front));

let entering = 0, conditional = 0;
for (const card of cards) {
  const name = card.identity.name, [front, inset] = name.split(" // ");
  if (/\benters prepared\b/i.test(card.oracleText ?? "")) {
    entering += 1;
    const s = play(name, [{cast: front}, {settle: true}]);
    ok(source(s, front)?.prepared === true, `${name}: cast as the creature, it enters prepared`);
    const copy = exiled(s, inset);
    ok(copy && !(copy.types ?? []).some((t) => PERMANENT.includes(t)), `${name}: the copy of ${inset} waits in exile as a spell, no permanent type (${copy?.types})`);
    ok(legalActions(s, 0).some((a) => a.kind === "cast" && a.objectId === copy.id), `${name}: its controller is offered to cast the copy`);
    const after = play(name, [{cast: front}, {settle: true}, {cast: inset, targets: "any"}, {settle: true}]);
    const left = exiled(after, inset);
    ok(source(after, front)?.prepared !== true, `${name}: casting the copy unprepares the creature`);
    ok(!after.zones.battlefield.flat().some((id) => after.objects[id]?.card === inset), `${name}: the copy never becomes a permanent`);
    ok(!left || !legalActions(after, 0).some((a) => a.kind === "cast" && a.objectId === left.id), `${name}: and is not offered a second time`);
  } else {
    conditional += 1;
    ok(source(play(name, [{cast: front}, {settle: true}]), front)?.prepared !== true, `${name}: prepared only on its condition, so it does not enter prepared`);
  }
}
ok(entering >= 28 && conditional >= 10, `every Prepared card in the data was read: ${entering} enter prepared, ${conditional} on a condition`);
console.log(`engine-prepared-every-card: ${checks} checks passed — ${entering} cards that enter prepared, each with its copy offered as a spell, cast, unprepared and never a permanent; ${conditional} prepared only on their condition (ROB-432, RQ-04).`);
