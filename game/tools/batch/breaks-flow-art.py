# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""The choice pop-up's art when the picture does not come (ROB-341): tests/board-flow-art.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-flow-art.py
"""
SUITES = ['tests/board-flow-art.mjs']
BREAKS = [
    ('a failed pop-up picture left as a broken image, as before', 'crankmagic-board.js',
     '    if (t && t.matches && t.matches("img.cm-flow-card, img.cm-flow-thumb") && t.dataset.fallbackName) {',
     '    if (false) {'),
]
