# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""A sacrifice question says what may be sacrificed (ROB-323): Winter, Tormented Loner's "a creature or planeswalker".
tests/engine-sacrifice-noun.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-sacrifice-noun.py
"""
SUITES = ['tests/engine-sacrifice-noun.mjs']
BREAKS = [
    ('a choice among kinds said as "a permanent", as before', 'game/engine/script/effects/asking.mjs',
     'const noun = (selector) => (Array.isArray(selector?.anyOf) && selector.anyOf.length > 1 ? anyOfNoun(selector.anyOf)\n  : ',
     'const noun = (selector) => ('),
]
