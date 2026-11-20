/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* ROB'S EIGHT LIVE DECKS, EVERY CARD (ROB-94; the staging stabilization plan of 2026-11-19, Phase 2.3).
 *
 * The decks people sit down with are Rob's D1-D8, read from his MtG Master Table backup of 2026-11-18 -- never from the
 * repository's older bundled decks (a test against a stale list proves only consistency with the wrong source). The backup is
 * private: the lists, the ids and which card is in which deck stay in the ignored game/.local/rob94/; this suite reads only
 * the cards' names (tests/fixtures/live-deck-names.json), and runs on every PR. For each of the 537 cards:
 *   - the table plays it: the card directory defines it, playable, with no problem recorded (`index.resolve`);
 *   - each scenario of each hand-authored card plays through the rules and passes;
 *   - the interaction census (game/tools/interaction-census.mjs, layers A and B, the table's taps flags) finds nothing about it
 *     that is not already in the census baseline -- so a change that breaks one of these cards' offers, or leaves an effect of
 *     its Oracle text unscripted, fails here by the card's name.
 * The games themselves -- each deck in seeded four-seat games, replayed, with no leak -- are played from the private lists,
 * locally: `node tools/fuzz-live.mjs --backup game/.local/rob94/<backup>.json --decks "D1 …|D2 …|D3 …|D4 …" --seeds 1-10
 * --replay --leaks` and the same for D5-D8 (the release and the PR say how many).
 *
 * Refresh the names from a newer backup: `node tools/live-deck-cards.mjs <backup.json>`.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {loadCardIndex, loadCardScripts, loadCardScenarios} from "../game/tools/engine-cards.mjs";
import {census, againstBaseline, readBaseline} from "../game/tools/interaction-census.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

const {cards} = JSON.parse(readFileSync(new URL("./fixtures/live-deck-names.json", import.meta.url), "utf8"));
ok(cards.length >= 500 && new Set(cards).size === cards.length, `the eight live decks' cards, each once: ${cards.length}`);
const index = loadCardIndex();

/* 1. The table plays every one. */
eq(cards.filter((n) => !index.resolve(n)?.playable || (index.resolve(n)?.problems ?? []).length), [], "every card of the live decks is defined and playable at the table, with no problem recorded");

/* 2. Every scenario of every hand-authored card passes. */
const named = new Set(cards);
const files = loadCardScenarios().filter((f) => named.has(f.scenarios.card));
let played = 0;
const failing = [];
for (const {scenarios: file} of files) for (const scenario of file.scenarios) {
  try { runScenario(scenario, index.definition, file.fixtures ?? {}); played += 1; } catch (error) { failing.push(`${file.card}: ${error.message.slice(0, 160)}`); }
}
eq(failing, [], `every scenario of the live decks' cards passes (${played} played)`);
const hand = cards.filter((n) => index.resolve(n)?.source === "hand");
eq(hand.filter((n) => !files.some((f) => f.scenarios.card === n)), [], `every hand-authored card among them has scenarios (${hand.length} hand-authored, ${cards.length - hand.length} compiled with the loader's smoke game)`);

/* 3. The census finds nothing new about them. */
const scripts = loadCardScripts().filter(({script}) => named.has(script.identity?.name));
const {findings, tally} = census({scripts, index});
const {added} = againstBaseline(findings, readBaseline());
eq(added.map((f) => `${f.card}: ${f.code} ${f.detail.slice(0, 100)}`), [], `the interaction census finds nothing about them outside its baseline (${tally.cards} cards examined)`);

console.log(`live-deck-cards: ${checks} checks passed — the ${cards.length} cards of Rob's eight live decks: each defined and playable, ${played} scenarios passing, the census clean against its baseline (ROB-94).`);
