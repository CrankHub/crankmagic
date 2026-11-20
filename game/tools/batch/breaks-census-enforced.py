# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""ROB-441 (Nov 20): an {X} ability tapped for each X the sources pay; the census's last advisory class enforced.
tests/engine-ability-taps.mjs and tests/engine-interaction-census.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-census-enforced.py
"""
SUITES = ['tests/engine-ability-taps.mjs', 'tests/engine-interaction-census.mjs']
BREAKS = [
    ('an {X} ability left to floated mana, as before', 'game/engine/rules/actions.mjs',
     '  if (printed.variable === 0 || !abilityTaps(state) || !xTaps(state)) return fromPool;',
     '  return fromPool;'),
    ('the activation class advisory again', 'game/tools/interaction-census.mjs',
     'export const CLASS_POLICY = Object.freeze({\n',
     'export const CLASS_POLICY = Object.freeze({\n  ACTIVATION_ONLY_WHEN_FLOATED: "advisory",\n'),
]
