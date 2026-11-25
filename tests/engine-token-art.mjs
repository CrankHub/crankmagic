/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.

   A TOKEN IS DRAWN AS THE TOKEN IT IS, NOT AS SOME TOKEN OF ITS NAME (ROB-542; Rob, 2026-11-24: "the images used on tokens, that
   the artwork is correct for the type of token created"; the contract is docs/ui-lane/token-art-contract.md;
   game/engine/cards/token-art.mjs, game/engine/projection.mjs, tools/build-token-art.mjs).

   Asked by name, Scryfall drew a 1/1 Inkling for Shadrix Silverquill's 2/1, a colorless 4/4 for Draconic Visitor's red 5/5
   Dragon, and the Dinosaur side of a two-sided token for a Treasure. The view now names the printing.

     1. The key: what a token is made as; a keyword's number is not part of it; "X/X" found by the rest.
     2. The table: every token the game can make is in it, or listed as matching no Scryfall token; that list only shrinks.
        Each entry's Scryfall token agrees with the token in name, types, subtypes, colors and printed size.
     3. The three Rob's reports name: Shadrix's Inkling is the 2/1, Draconic Visitor's Dragon the red 5/5 with flying, a
        Treasure the one-sided Treasure.
     4. The view: a token made in a game carries `tokenArt` to every seat; a Dragon made instead of a Treasure carries the
        Dragon's; a pumped Inkling is still the Inkling; a card carries none; Oko's Elk carries the Elk's in `appearance.art`.

     node tests/engine-token-art.mjs
*/
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {tokenArtKey, tokenArtOf} from "../game/engine/cards/token-art.mjs";
import {TOKEN_ART, UNMATCHED} from "../game/engine/cards/token-art-table.mjs";
import {tokenSpecs} from "../tools/build-token-art.mjs";
import {runScenario} from "../game/engine/cards/scenario.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";
import {projectFor} from "../game/engine/projection.mjs";
import {runEffect} from "../game/engine/script/effects/index.mjs";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks += 1; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };

const INKLING = {name: "Inkling", types: ["Creature"], subtypes: ["Inkling"], colors: ["W", "B"], power: 2, toughness: 1, keywords: ["Flying"]};
const VISITOR_DRAGON = {name: "Dragon", types: ["Creature"], subtypes: ["Dragon"], colors: ["R"], power: 5, toughness: 5, keywords: ["Flying"]};
/* The Scryfall tokens each is (data/engine/tokens.json): the 2/1 Inkling, the red 5/5 Dragon with flying, the one-sided Treasure. */
const SCRYFALL = {inkling: "fbdbff76-c1ea-47ea-bfcc-7c64c23dad70", dragon: "60fe4897-6760-4c5a-8074-c92bd64df52b", treasure: "3c549374-6c37-42e0-8d88-a8555d46732d"};

{
  /* 1. The key. */
  eq(tokenArtKey(INKLING), "Inkling|Creature|Inkling|BW|2|1|flying", "name, types, subtypes, colors in order, size, keywords");
  eq(tokenArtKey({...INKLING, colors: ["B", "W"], keywords: ["flying"]}), tokenArtKey(INKLING), "the order of colors and a keyword's case make no other token");
  eq(tokenArtKey({name: "Phyrexian Mite", types: ["Artifact", "Creature"], subtypes: ["Phyrexian", "Mite"], colors: [], power: 1, toughness: 1, keywords: ["Toxic 1"]}),
    tokenArtKey({name: "Phyrexian Mite", types: ["Creature", "Artifact"], subtypes: ["Mite", "Phyrexian"], colors: [], power: 1, toughness: 1, keywords: ["Toxic"]}), "toxic 1 is toxic");
  ok(tokenArtKey({...INKLING, power: 1}) !== tokenArtKey(INKLING), "a 1/1 Inkling is another token");
  ok(tokenArtKey({...INKLING, card: "Inkling", name: undefined}) === tokenArtKey(INKLING), "a token object (its `card`) keys as its spec does");
  const ooze = Object.keys(TOKEN_ART).find((k) => /\|X\|X\|/.test(k));
  ok(ooze, "the table has a token whose size an effect counts");
  const [name, types, subtypes, colors, , , keywords] = ooze.split("|");
  const made = {name, types: types.split(" "), subtypes: subtypes ? subtypes.split(" ") : [], colors: colors.split(""), power: 4, toughness: 4, keywords: keywords ? keywords.split(",") : []};
  eq(tokenArtOf(made)?.scryfallId, TOKEN_ART[ooze].scryfallId, `an X/X ${name} made 4/4 is found by the rest of it`);
  eq(tokenArtOf({name: "Grizzly Bears", types: ["Creature"], subtypes: ["Bear"], colors: ["G"], power: 2, toughness: 2}), null, "a card (a copy of one) is no token of the table");
}

{
  /* 2. The table covers what the game can make, and agrees with Scryfall's records. */
  const specs = await tokenSpecs();
  const missing = [...specs.keys()].filter((k) => !TOKEN_ART[k] && !UNMATCHED.includes(k));
  eq(missing, [], "every token the game can make is in the table (run node tools/build-token-art.mjs)");
  ok(specs.size >= 170, `the specs were collected: ${specs.size}`);
  /* Changed on purpose only by a match found: the tokens no Scryfall token is. Royal Treatment's Role and Sarpadian Empires'
     Camarid have none on Scryfall; Celebrate the Mountain-king's candidate makes its recruit Soldier an enchantment (a
     compiler template's TYPE slot, filed on ROB-542). */
  eq([...UNMATCHED].sort(), ["Camarid|Creature|Camarid|U|1|1|", "Human Soldier|Enchantment|Human Soldier|W|1|1|", "Royal|Enchantment|Aura Role||||"], "the tokens drawn by name");
  const records = new Map(JSON.parse(readFileSync(new URL("../data/engine/tokens.json", import.meta.url), "utf8")).tokens.map((t) => [t.id, t]));
  let agreed = 0;
  for (const [key, art] of Object.entries(TOKEN_ART)) {
    ok(/^[0-9a-f-]{36}$/.test(art.scryfallId), `${key}: a Scryfall printing id`);
    const record = records.get(art.oracleId);
    ok(record, `${key}: its Scryfall token is in data/engine/tokens.json`);
    const face = record.faces ? record.faces[art.face === "back" ? 1 : 0] : record;
    const [name, , , colors, power, toughness] = key.split("|");
    ok(face.name === name || face.name === `${name} Token`, `${key}: Scryfall's ${face.name}`);
    eq([...(face.colors ?? record.colors ?? [])].sort().join(""), colors, `${key}: its colors`);
    if (/^\d+$/.test(power) && !/^[X*]$/.test(String(face.power))) eq([String(face.power), String(face.toughness)], [power, toughness], `${key}: its size`);
    agreed += 1;
  }
  ok(agreed >= 170, `${agreed} entries agree with Scryfall's records`);
}

{
  /* 3. The reports. */
  eq(tokenArtOf(INKLING)?.oracleId, SCRYFALL.inkling, "Shadrix Silverquill's Inkling is the 2/1, not the 1/1 a name finds");
  eq(tokenArtOf(VISITOR_DRAGON)?.oracleId, SCRYFALL.dragon, "Draconic Visitor's Dragon is the red 5/5 with flying, not a colorless 4/4");
  const treasure = tokenArtOf({name: "Treasure", types: ["Artifact"], subtypes: ["Treasure"], colors: [], power: null, toughness: null, keywords: []});
  eq([treasure?.oracleId, treasure?.face], [SCRYFALL.treasure, undefined], "a Treasure is the one-sided Treasure, not the Dinosaur side of a two-sided token");
}

{
  /* 4. The view. */
  const index = loadCardIndex();
  const FIX = {Bear: {types: ["Creature"], subtypes: ["Bear"], manaCost: "{1}{G}", colors: ["G"], power: 2, toughness: 2}};
  const game = (cards) => runScenario({name: "token art", setup: [{seat: 0, zone: "battlefield", cards}], steps: [], expect: []}, index.definition, FIX).state;
  const board = (s, viewer) => projectFor(s, viewer).players[0].zones.Battlefield.cards;

  const s = game(["Bear"]);
  runEffect(s, {effect: "createToken", count: 1, token: INKLING}, {controller: 0});
  for (const viewer of [0, 1]) {
    const ink = board(s, viewer).find((c) => c.name === "Inkling");
    eq([ink?.token, ink?.tokenArt?.oracleId], [true, SCRYFALL.inkling], `seat ${viewer} is told which Inkling to draw`);
    eq("tokenArt" in board(s, viewer).find((c) => c.name === "Bear"), false, `seat ${viewer}: a card carries none`);
  }
  const inkId = s.zones.battlefield.find((id) => s.objects[id].card === "Inkling");
  runEffect(s, {effect: "putCounter", targets: [inkId], counter: "+1/+1", count: 2}, {controller: 0});
  eq(board(s, 1).find((c) => c.name === "Inkling").tokenArt?.oracleId, SCRYFALL.inkling, "with two +1/+1 counters it is still the 2/1 Inkling's picture");

  const v = game(["Draconic Visitor"]);
  runEffect(v, {effect: "createToken", count: 1, token: {predefined: "Treasure"}}, {controller: 0});
  const made = board(v, 1).filter((c) => c.token);
  eq(made.map((c) => [c.name, c.tokenArt?.oracleId]), [["Dragon", SCRYFALL.dragon]], "a Treasure made beside Draconic Visitor is a Dragon, drawn as the red 5/5");
  const plain = game([]);
  runEffect(plain, {effect: "createToken", count: 1, token: {predefined: "Treasure"}}, {controller: 0});
  eq(board(plain, 1).filter((c) => c.token).map((c) => [c.name, c.tokenArt?.oracleId]), [["Treasure", SCRYFALL.treasure]], "without it, a Treasure");

  const oko = runScenario({name: "Oko's Elk", setup: [{seat: 0, zone: "battlefield", cards: ["Oko, Thief of Crowns", "Bear"]}],
    steps: [{activate: "Oko, Thief of Crowns", ability: "a1", targets: [{card: "Bear"}]}, {resolve: true}], expect: []}, index.definition, FIX).state;
  const elk = board(oko, 1).find((c) => c.name === "Bear");
  eq(elk.appearance?.token, "Elk", "Oko's +1: it looks like an Elk");
  ok(elk.appearance?.art?.scryfallId, "and the view names which Elk: the 3/3 green one");
  eq(elk.appearance.art.oracleId, tokenArtOf({name: "Elk", types: ["Creature"], subtypes: ["Elk"], colors: ["G"], power: 3, toughness: 3})?.oracleId, "the same the table names for a 3/3 green Elk");
}

console.log(`engine-token-art: ${checks} checks passed — the key, the table against every token the game can make and Scryfall's records, the Inkling, the Visitor's Dragon and the Treasure, and the view to every seat.`);
