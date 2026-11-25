/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* WHICH PICTURE A TOKEN IS (ROB-542; Rob, 2026-11-24: "the images used on tokens, that the artwork is correct for the type of
 * token created"). A token's name does not say which token it is: Scryfall has 22 different Spirits, 31 Elementals and 8 Dragons,
 * and asked for "Inkling" by name it answered with a 1/1, for "Dragon" a colorless 4/4, for "Treasure" the Dinosaur side of a
 * two-sided token, for "Goblin" an Unfinity card. So a token is known by what it is -- its name, card types, subtypes, colors,
 * printed power and toughness, and keywords (CR 111.4: the characteristics the effect that made it gives) -- and that is looked up
 * in TOKEN_ART, a table tools/build-token-art.mjs writes from Scryfall's own token records (data/engine/tokens.json) for every
 * token a definition, a committed candidate or a predefined token makes. Its value is the Scryfall printing to draw.
 *
 * A token whose size an effect counts ("an X/X green Ooze") is written in the table with X, and found by its other
 * characteristics. A token that is a copy of a card (Helm of the Host's copy of a creature card) is no token of the table: its
 * picture is the card's, by name, as before. The contract is docs/ui-lane/token-art-contract.md.
 */

import {TOKEN_ART} from "./token-art-table.mjs";

const sorted = (list) => [...new Set((list ?? []).map(String))].sort();
/* "Toxic 1" and "Toxic" are the same token's keyword; a keyword's number is part of its ability, not of which picture it is. */
const keywordWord = (k) => String(typeof k === "string" ? k : k?.keyword ?? "").toLowerCase().replace(/\s+\d+$/, "").trim();
const size = (value) => (Number.isInteger(value) ? String(value) : value === null || value === undefined ? "" : "X");

/** The key a token is found by: from a token spec (as a card's definition writes it) or from a token object (as the state holds it). */
export function tokenArtKey(token, {sizeless = false} = {}) {
  return [
    token.name ?? token.card ?? "Token",
    sorted(token.types ?? ["Creature"]).join(" "),
    sorted(token.subtypes).join(" "),
    sorted(token.colors).join(""),
    sizeless ? "X" : size(token.power),
    sizeless ? "X" : size(token.toughness),
    sorted((token.keywords ?? []).map(keywordWord).filter(Boolean)).join(","),
  ].join("|");
}

/** The Scryfall printing to draw for this token, `{scryfallId, face?}`, or null when the table does not know it (a copy of a card). */
export function tokenArtOf(token) {
  const found = TOKEN_ART[tokenArtKey(token)] ?? TOKEN_ART[tokenArtKey(token, {sizeless: true})];
  return found ? {...found} : null;
}
