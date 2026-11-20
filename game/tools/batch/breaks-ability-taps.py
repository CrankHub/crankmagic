# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""`abilityTaps` (ROB-317, Nov 20): an activated ability's mana tapped for as a cast's is, in a table's new matches (Ash Barrens's
Basic landcycling); a {T} cost's source never its own mana; a match launched before offers what it offered then.
tests/engine-ability-taps.mjs and tests/game-table.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-ability-taps.py
"""
SUITES = ['tests/engine-ability-taps.mjs', 'tests/game-table.mjs']
A = 'game/engine/rules/actions.mjs'
BREAKS = [
    ('an ability offered only from floating mana, as before', A,
     '    if (!plain && !bends && !tapsFor) continue;',
     '    if (!plain && !bends) continue;'),
    ('a match launched before tapped for it too', A,
     'const abilityTaps = (state) => state.abilityTaps === true && pooledTaps(state);',
     'const abilityTaps = (state) => pooledTaps(state);'),
    ("a {T} cost's source tapped for its own mana", A,
     '  const busy = new Set([id, costChoice?.tap,',
     '  const busy = new Set([costChoice?.tap,'),
    ('two ways to tap, and none asked', A,
     "    if (action.kind === \"activate\" && action.autoTap === true && action.tapPlan === undefined && abilityTapPlans(state, player, action, 2).length > 1) {",
     "    if (false) {"),
    ("a table's new match without it", 'game/room/table.mjs',
     '      abilityTaps: true,\n',
     ''),
]
