# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Every Prepared card offers its copy (ROB-432, RQ-04): tests/engine-prepared-every-card.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-prepared-every-card.py
"""
SUITES = ['tests/engine-prepared-every-card.mjs']
A = 'game/engine/rules/actions.mjs'
BREAKS = [
    ("a prepared copy's cast not tapped for, as before preparedTaps", A,
     '(state.preparedTaps === true && from === "exile"',
     '(false && from === "exile"'),
    ('the scenario runner dropping the key', 'game/engine/cards/scenario.mjs',
     '...(scenario.preparedTaps === true ? {preparedTaps: true} : {}), ',
     ''),
]
