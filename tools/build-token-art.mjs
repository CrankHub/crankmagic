/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* THE TOKEN PICTURES (ROB-542): which Scryfall printing each token a card makes is drawn with.
 *
 * The board drew a token by its name, and a name is not a token: "Inkling" drew a 1/1 for Shadrix Silverquill's 2/1, "Dragon"
 * a colorless 4/4 for Draconic Visitor's red 5/5 with flying, "Treasure" the Dinosaur side of a two-sided token. This collects
 * every token spec the game can make -- each `token` in the card directory and the committed candidates, and each predefined
 * token (PREDEFINED_TOKENS) -- finds the Scryfall token it is among data/engine/tokens.json (Scryfall's own token records, the
 * engine's data rule: docs/engine/ADR-001-own-engine.md), and writes the printing to draw into
 * game/engine/cards/token-art-table.mjs, keyed as game/engine/cards/token-art.mjs looks a token up.
 *
 * WHICH SCRYFALL TOKEN A SPEC IS. Its name (or a face's, for a two-sided token), card types, subtypes and colors must be equal,
 * and its power and toughness where the spec prints them. Among those left: the fewest keywords that differ, then text that agrees
 * (a token with an ability of its own against one with none), then a one-sided token over a face of a two-sided one, then the
 * oracle id, so the answer is the same each run. A spec no Scryfall token matches is listed in UNMATCHED and drawn by name.
 *
 * WHICH PRINTING. The newest English paper printing of that token with a picture. A printing already in the table is kept, so a
 * run changes only what changed (--refresh picks again).
 *
 *   node tools/build-token-art.mjs            network: one Scryfall search for each token not yet in the table
 *   node tools/build-token-art.mjs --check    no network: exit 1 if a token the game can make is not in the table
 *   node tools/build-token-art.mjs --refresh  pick every printing again
 */

import {readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {tokenArtKey} from "../game/engine/cards/token-art.mjs";
import {TOKEN_ART, UNMATCHED as WAS_UNMATCHED} from "../game/engine/cards/token-art-table.mjs";
import {PREDEFINED_TOKENS} from "../game/engine/script/effects/permanents.mjs";
import {loadCardScripts} from "../game/tools/engine-cards.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = path.join(ROOT, "game", "engine", "cards", "token-art-table.mjs");
const UA = {"User-Agent": "CrankMagic/1.0 (personal Commander workshop)", Accept: "application/json"};

/* ---- the specs the game can make ---- */
const walk = (value, visit) => {
  if (Array.isArray(value)) return value.forEach((v) => walk(v, visit));
  if (value && typeof value === "object") { visit(value); Object.values(value).forEach((v) => walk(v, visit)); }
};
export async function tokenSpecs() {
  const specs = new Map();
  const add = (spec, from) => {
    if (!spec || typeof spec !== "object" || !(spec.name || spec.subtypes?.length)) return;
    const token = {name: spec.name ?? (spec.subtypes ?? []).join(" "), types: spec.types ?? ["Creature"], subtypes: spec.subtypes ?? [], colors: spec.colors ?? [],
      power: spec.power ?? null, toughness: spec.toughness ?? null, keywords: spec.keywords ?? [], abilities: spec.abilities ?? []};
    const key = tokenArtKey(token);
    if (!specs.has(key)) specs.set(key, {token, from: new Set()});
    specs.get(key).from.add(from);
  };
  const scripts = [...loadCardScripts().map((e) => e.script)];
  try {
    const {committedCandidates} = await import("../game/tools/interaction-census.mjs");
    scripts.push(...(await committedCandidates()).scripts.map((e) => e.script));
  } catch { /* no candidates file: the directory alone */ }
  for (const script of scripts) walk(script, (node) => {
    if (!node.token || typeof node.token !== "object") return;
    add(node.token.predefined ? PREDEFINED_TOKENS[node.token.predefined] : node.token, script.identity?.name ?? "?");
  });
  for (const [name, spec] of Object.entries(PREDEFINED_TOKENS)) add(spec, `predefined ${name}`);
  /* The looks (the view's `appearance`, ROB-329): "loses all abilities and becomes a green Elk creature with base power and
     toughness 3/3" (Oko, Thief of Crowns, Kenrith's Transformation), an ability's effects together, drawn as that token. */
  for (const script of scripts) walk(script.abilities ?? [], (node) => {
    if (!Array.isArray(node.effects)) return;
    const applied = node.effects.map((e) => e?.apply ?? {});
    const creatureTypes = applied.find((a) => a.setCreatureTypes)?.setCreatureTypes;
    if (!creatureTypes || !applied.some((a) => a.removeAllAbilities)) return;
    const stats = applied.find((a) => Number.isInteger(a.setPower)) ?? {};
    add({name: creatureTypes.join(" "), types: ["Creature"], subtypes: creatureTypes, colors: applied.find((a) => a.setColors)?.setColors ?? [],
      power: stats.setPower ?? null, toughness: stats.setToughness ?? null}, `${script.identity?.name ?? "?"} (a look)`);
  });
  return specs;
}

/* ---- Scryfall's token records ---- */
const SUPERTYPES = new Set(["Legendary", "Snow", "Basic", "World"]);
function typeLine(line) {
  const [left, right = ""] = String(line ?? "").split(/\s+—\s+/);
  const types = left.split(/\s+/).filter((t) => t && t !== "Token" && !SUPERTYPES.has(t));
  return {types: types.sort().join(" "), subtypes: right.split(/\s+/).filter(Boolean).sort().join(" ")};
}
/* Each record, and each face of a two-sided one, as something a spec can be compared with. */
export function scryfallTokens() {
  const tokens = JSON.parse(readFileSync(path.join(ROOT, "data", "engine", "tokens.json"), "utf8")).tokens;
  const out = [];
  for (const t of tokens) {
    if (/^Emblem/.test(t.type)) continue;
    const faces = t.faces?.length ? t.faces.map((f, i) => ({...f, face: i, keywords: t.keywords ?? []})) : [{...t, face: null}];
    for (const f of faces) out.push({oracleId: t.id, layout: t.layout, face: f.face, name: f.name, ...typeLine(f.type),
      colors: [...(f.colors ?? t.colors ?? [])].sort().join(""), power: f.power ?? null, toughness: f.toughness ?? null,
      keywords: (t.keywords ?? []).map((k) => k.toLowerCase()), text: String(f.text ?? "")});
  }
  return out;
}

const keywordWord = (k) => String(typeof k === "string" ? k : k?.keyword ?? "").toLowerCase().replace(/\s+\d+$/, "").trim();
export function matchToken(token, records) {
  const types = [...new Set(token.types)].sort().join(" "), subtypes = [...new Set(token.subtypes)].sort().join(" ");
  const colors = [...new Set(token.colors)].sort().join("");
  const printed = (v) => Number.isInteger(v);
  const want = new Set(token.keywords.map(keywordWord).filter(Boolean));
  const scored = [];
  /* A size the token's own ability defines ("*" or "X" on Scryfall's record: Hallowed Haunting's Spirit Cleric) is any size. */
  const sizeAgrees = (mine, theirs) => !printed(mine) || /^[X*]$/.test(String(theirs ?? "")) || String(mine) === String(theirs);
  for (const r of records) {
    /* Scryfall names a few tokens "<name> Token" (Gingerbrute Token); a token whose card names no subtype for it (Heartwood) is
       matched without one. */
    if ((r.name !== token.name && r.name !== `${token.name} Token`) || r.types !== types || r.colors !== colors) continue;
    if (r.subtypes !== subtypes && subtypes !== "") continue;
    if (!sizeAgrees(token.power, r.power) || !sizeAgrees(token.toughness, r.toughness)) continue;
    const have = new Set(r.keywords);
    const keywordsOff = [...want].filter((k) => !have.has(k)).length + [...have].filter((k) => !want.has(k)).length;
    /* Its own text beyond its keywords: a line of a keyword ability ("Flying", "Flying, vigilance") says nothing more. */
    const ownText = r.text.split("\n").filter((line) => line.trim() && !line.split(/,\s*/).every((w) => have.has(w.toLowerCase().replace(/\s+\d+$/, "").replace(/\s*\(.*$/, "")))).length > 0;
    const textOff = ownText !== (token.abilities ?? []).length > 0 ? 1 : 0;
    const sizeOff = !printed(token.power) && !/^[X*]$/.test(String(r.power ?? "")) ? 1 : 0;
    scored.push({r, score: [keywordsOff, textOff, sizeOff, r.face === null ? 0 : 1]});
  }
  scored.sort((a, b) => a.score.reduce((d, x, i) => d || x - b.score[i], 0) || a.r.oracleId.localeCompare(b.r.oracleId));
  return scored[0]?.r ?? null;
}

/* ---- the printing ---- */
async function newestPrinting(oracleId) {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`oracleid:${oracleId}`)}&unique=prints&order=released&dir=desc&include_extras=true`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(url, {headers: UA});
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 65000)); continue; }
    if (!res.ok) throw new Error(`Scryfall answered ${res.status} for oracle id ${oracleId}`);
    const {data} = await res.json();
    const drawable = (c) => c.lang === "en" && !c.digital && (c.image_uris || c.card_faces?.some((f) => f.image_uris));
    const pick = data.find((c) => drawable(c) && !c.promo) ?? data.find(drawable);
    if (!pick) throw new Error(`no English paper printing with a picture for oracle id ${oracleId}`);
    return pick.id;
  }
  throw new Error(`Scryfall kept refusing oracle id ${oracleId}`);
}

function writeTable(entries, unmatched) {
  const lines = Object.keys(entries).sort().map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(entries[k])},`);
  writeFileSync(TABLE, `/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* GENERATED by tools/build-token-art.mjs -- do not edit; run it again. (ROB-542)
 *
 * Each token the game can make, by game/engine/cards/token-art.mjs's key (name|types|subtypes|colors|power|toughness|keywords),
 * and the Scryfall printing to draw it with: \`scryfallId\`, \`oracleId\` (the Scryfall token it was matched to), \`face\` ("back" for
 * the second face of a two-sided token). ${Object.keys(entries).length} tokens. */

export const TOKEN_ART = Object.freeze({
${lines.join("\n")}
});

/* Tokens no Scryfall token matches: drawn by name, as before. */
export const UNMATCHED = Object.freeze(${JSON.stringify(unmatched.sort(), null, 1).replace(/\n/g, "\n")});
`);
}

async function main(argv) {
  const specs = await tokenSpecs();
  const records = scryfallTokens();
  const entries = {}, unmatched = [], missing = [];
  for (const [key, {token}] of specs) {
    const match = matchToken(token, records);
    if (!match) { unmatched.push(key); continue; }
    const kept = TOKEN_ART[key];
    if (argv.includes("--check")) { if (!kept && !WAS_UNMATCHED.includes(key)) missing.push(key); continue; }
    if (kept && kept.oracleId === match.oracleId && !argv.includes("--refresh")) { entries[key] = kept; continue; }
    const scryfallId = await newestPrinting(match.oracleId);
    await new Promise((r) => setTimeout(r, 600));
    entries[key] = {scryfallId, oracleId: match.oracleId, ...(match.face === 1 ? {face: "back"} : {})};
    process.stderr.write(`  ${key} -> ${scryfallId}\n`);
  }
  if (argv.includes("--check")) {
    for (const key of missing) console.log(`NOT IN THE TABLE: ${key} (run node tools/build-token-art.mjs)`);
    console.log(`${specs.size} tokens the game can make; ${missing.length} not in the table.`);
    return missing.length ? 1 : 0;
  }
  writeTable(entries, unmatched);
  console.log(`${Object.keys(entries).length} tokens written; ${unmatched.length} no Scryfall token matches (drawn by name).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).then((code) => process.exit(code));
