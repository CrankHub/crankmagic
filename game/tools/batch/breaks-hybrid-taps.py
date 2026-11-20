# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""`hybridTaps` (ROB-354, Nov 20): monocolored hybrid ({2/W}) tapped for each way, in a table's new matches; a match launched
before offers what it offered then. tests/engine-hybrid-taps.mjs, tests/engine-interaction-census.mjs and tests/game-table.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-hybrid-taps.py
"""
SUITES = ['tests/engine-hybrid-taps.mjs', 'tests/engine-interaction-census.mjs', 'tests/game-table.mjs']
A = 'game/engine/rules/actions.mjs'
BREAKS = [
    ('a {2/W} cost planned as before: not at all', A,
     '  if (!hybridTaps(state) || !cost.symbols.some((s) => s.kind === "monohybrid")) return plainFunding(state, player, id, cost, limit, units, life);',
     '  return plainFunding(state, player, id, cost, limit, units, life);'),
    ('a match launched before tapped for it too', A,
     'const hybridTaps = (state) => state.hybridTaps === true && pooledTaps(state);',
     'const hybridTaps = (state) => pooledTaps(state);'),
    ('only the colored way', 'game/engine/rules/mana.mjs',
     '      if (two.has(i)) { more += s.amount; return {kind: "generic", amount: s.amount}; }',
     '      if (two.has(i)) return null;'),
    ("a table's new match without it", 'game/room/table.mjs',
     '      hybridTaps: true,\n',
     ''),
]
