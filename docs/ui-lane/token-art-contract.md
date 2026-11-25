# Contract: `tokenArt`, which token's picture a token is drawn with (Linear ROB-542)

Status: built on 2026-11-24 by Claude (engine half and board half in one PR, as ROB-329's `appearance` was; Rob's go on the
issue, 2026-11-24). Additive to `CrankRoomView@1`; no existing field changes and no seat that ignores the key notices it.

Rob, 2026-11-24: *"There are some issues related to tokens, the images used on tokens, that the artwork is correct for the type
of token created."*

## The gap

The board drew a token from Scryfall by its name, and a name is not a token: Scryfall has 22 different Spirit tokens, 31
Elementals and 8 Dragons. Asked on 2026-11-24, "Inkling" drew a 1/1 (Shadrix Silverquill's is 2/1), "Dragon" a colorless 4/4
(Draconic Visitor's is a red 5/5 with flying), "Treasure" the Dinosaur side of a two-sided Dinosaur // Treasure token, "Goblin"
an Unfinity card, "Shapeshifter" the Antiquities card. 107 of the 161 different tokens the defined cards make share a name.

## The field

On a battlefield token, to every seat that can name it (as `name` is):

```json
"tokenArt": {"scryfallId": "<the printing's Scryfall id>", "oracleId": "<the Scryfall token it is>"}
```

| Key | Meaning |
| --- | --- |
| `scryfallId` | The Scryfall printing to draw: `https://api.scryfall.com/cards/<scryfallId>?format=image&version=normal`. |
| `oracleId` | The Scryfall token it was matched to (for a reader, and for the suites). |
| `face` | `"back"` when the token is the second face of a two-sided Scryfall token; absent otherwise. |

And on a look (`appearance`, `docs/ui-lane/view-appearance-contract.md`), the same object as `appearance.art`: Oko's 3/3 green
Elk drawn as that Elk.

## When it is present, and when it is not

Present on a token whose characteristics as it was made (name, card types, subtypes, colors, printed power and toughness,
keywords: its copiable values, CR 707.2) are one the table knows. A token made "X/X" is found by its other characteristics.

Absent:

* a card, or a token that is a copy of a card (it is drawn as that card, by name);
* a token no Scryfall token matches (listed in `UNMATCHED` in the table; drawn by name, as before);
* a face-down permanent, and anything off the battlefield.

What effects make of a token afterwards (a pump, a counter, a color change) does not change its picture; a look that replaces
it (`appearance`) does, and wins.

## Who draws what

* **Engine** (`game/engine/projection.mjs`; `game/engine/cards/token-art.mjs` finds it in `token-art-table.mjs`, which
  `tools/build-token-art.mjs` writes from Scryfall's token records, `data/engine/tokens.json`, for every token a definition, a
  committed candidate or a predefined token makes). Tests: `tests/engine-token-art.mjs`.
* **Board** (`crankmagic-board.js`, `pictureOf`): draws `appearance.art`, else `appearance.token` by name, else `tokenArt`, else
  the card by name. Every view that draws a battlefield card passes the card, so Table, Focus and 3D agree.

## Keeping it current

A card load that makes a token the table does not know fails `tests/engine-token-art.mjs` with the key to add. Run
`node tools/build-token-art.mjs` (network: one Scryfall search per new token, at Scryfall's search rate) and commit the table.
