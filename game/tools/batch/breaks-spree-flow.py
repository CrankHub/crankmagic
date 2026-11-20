# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""A spree card stepped through the board (ROB-209): tests/board-spree-flow.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-spree-flow.py
"""
SUITES = ['tests/board-spree-flow.mjs']
BREAKS = [
    ('every cast shown at once, as in the playtest', 'crankmagic-choice-flow.js',
     'path:(o.path || []).map(n => {',
     'path:[].map(n => {'),
]
