# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""An emblem on the board (ROB-192): Elspeth, Sun's Champion's -7 makes one, and the board draws it as a tile.
tests/board-emblem.mjs and tests/engine-cards.mjs (Elspeth's scenario).

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-emblem-board.py
"""
SUITES = ['tests/board-emblem.mjs']
BREAKS = [
    ('an emblem drawn as a card with a picture that fails', 'crankmagic-board.js',
     '    if (c.emblem) return `<div class="cm-bcard cm-bcard-emblem"',
     '    if (false) return `<div class="cm-bcard cm-bcard-emblem"'),
    ("an emblem's sentence said twice", 'game/engine/projection.mjs',
     'text: [...new Set((object.abilities ?? []).map((a) => a.text).filter(Boolean))].join(',
     'text: (object.abilities ?? []).map((a) => a.text).filter(Boolean).join('),
]
