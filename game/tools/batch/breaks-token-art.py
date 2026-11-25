# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""ROB-542 (Nov 24): a token is drawn from the printing that is it, not by its name.
tests/engine-token-art.mjs, tests/room-view-appearance.mjs and tests/board-token-art.mjs.

    GEOMETRY_REQUIRED=1 python3 game/tools/batch/breaks.py game/tools/batch/breaks-token-art.py
"""
SUITES = ['tests/engine-token-art.mjs', 'tests/room-view-appearance.mjs', 'tests/board-token-art.mjs']
ART = 'game/engine/cards/token-art.mjs'
VIEW = 'game/engine/projection.mjs'
BOARD = 'crankmagic-board.js'
BREAKS = [
    ('the view names no token picture', VIEW,
     '      ...(named && object.token === true ? (() => { const art = tokenArtOf(object); return art ? {tokenArt: art} : {}; })() : {}),',
     ''),
    ("a look's Elk unnamed", VIEW,
     '        return {appearance: art ? {...look, art} : look};',
     '        return {appearance: look};'),
    ('the key without power and toughness (a 1/1 Inkling and a 2/1 one alike)', ART,
     '    sizeless ? "X" : size(token.power),',
     '    "X",'),
    ('an X/X token never found by the rest of it', ART,
     '  const found = TOKEN_ART[tokenArtKey(token)] ?? TOKEN_ART[tokenArtKey(token, {sizeless: true})];',
     '  const found = TOKEN_ART[tokenArtKey(token)];'),
    ('the board draws a token by its name again', BOARD,
     '    if (card && card.tokenArt && card.tokenArt.scryfallId) return printing(card.tokenArt);',
     ''),
    ("the board ignores a two-sided token's face", BOARD,
     '${art.face === "back" ? "&face=back" : ""}',
     ''),
]
