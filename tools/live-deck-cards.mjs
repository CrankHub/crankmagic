/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE LIVE DECKS' CARD NAMES, FROM A BACKUP (ROB-94): writes tests/fixtures/live-deck-cards.json from Rob's MtG Master Table
 * backup -- the distinct non-basic cards of his live decks D1-D8, names only, sorted. The backup itself is private and stays in
 * the ignored game/.local/rob94/; nothing else of it is written.
 *
 *   node tools/live-deck-cards.mjs game/.local/rob94/<backup>.json            # the decks whose names start D1 .. D8
 */
import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {decksFromBackup} from "./fuzz-live.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: node tools/live-deck-cards.mjs <backup.json>"); process.exit(2); }
const backup = JSON.parse(readFileSync(file, "utf8"));
const live = (backup.payload?.state?.decks ?? []).filter((d) => !d.archived && /^D[1-8]\b/.test(d.name)).map((d) => d.name).sort();
if (live.length !== 8) { console.error(`expected eight live decks D1-D8, found ${live.length}: ${live.join("; ")}`); process.exit(1); }
const BASIC = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);
const cards = [...new Set(decksFromBackup(backup, live).flatMap((d) => [...d.commander, ...d.cards]))].filter((n) => !BASIC.has(n)).sort();
const index = loadCardIndex();
const undefinedCards = cards.filter((n) => !index.definition(n));
const out = fileURLToPath(new URL("../tests/fixtures/live-deck-cards.json", import.meta.url));
writeFileSync(out, JSON.stringify({schema: "CrankLiveDeckCards@1",
  source: "The cards of Rob's eight live decks (D1-D8), from his MtG Master Table backup of 2026-11-18: names only. The lists, ids and deck membership stay in the ignored game/.local/rob94/ (ROB-94; AGENTS.md: Rob's library is private).",
  cards}, null, 1) + "\n");
console.log(`live-deck-cards: ${cards.length} cards of ${live.length} decks written to tests/fixtures/live-deck-cards.json${undefinedCards.length ? `; ${undefinedCards.length} not defined: ${undefinedCards.join(", ")}` : ", every one defined"}`);
