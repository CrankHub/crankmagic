# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""A library's revealed top card on the board (ROB-227, Nov 20): Conspicuous Snoop's top card face up, pressed for its cast;
while the draw waits, the pile is still the draw, the card on its face. tests/board-library-top.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-library-top.py
"""
SUITES = ['tests/board-library-top.mjs']
B = 'crankmagic-board.js'
BREAKS = [
    ("the view's revealed top card thrown away, as before", B,
     'pile("Library", z.Library, z.Library.cards?.[0] || null, {',
     'pile("Library", z.Library, null, {'),
    ('the held draw lost under a revealed top card', B,
     '<span class="cm-board-partners">${zone.cards.map((c) => card(c)).join("")}</span>` : drawing',
     '<span class="cm-board-partners">${zone.cards.map((c) => card(c)).join("")}</span>` : top ? card(top) : drawing'),
]
