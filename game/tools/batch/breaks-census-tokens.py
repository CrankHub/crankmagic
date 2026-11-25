# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""ROB-542 (Nov 24): the census reads the tokens a card's text makes, and how many modes it lets a player take, against
the definition. tests/engine-interaction-census.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-census-tokens.py
"""
SUITES = ['tests/engine-interaction-census.mjs']
CENSUS = 'game/tools/interaction-census.mjs'
BREAKS = [
    ("a token's colors never compared", CENSUS,
     '      if ((t.colors ?? []).slice().sort().join("") !== want.colors) return',
     '      if (false) return'),
    ("a token's extra keyword let through", CENSUS,
     '      if (extra.length) return',
     '      if (false) return'),
    ('a predefined token not expanded (the Pest, the decayed Zombie)', CENSUS,
     '        const made = node.token.predefined ? PREDEFINED_TOKENS[node.token.predefined] : node.token;',
     '        const made = node.token;'),
    ('how many modes never compared', CENSUS,
     '    if (!kept.modals.some((m) => modalFits(m, oracle.choose)))',
     '    if (false)'),
    ('"one or both" read as exactly one', CENSUS,
     '  if (said === "one or both") return {said, min: 1, max: 2};',
     '  if (said === "one or both") return {said, min: 1, max: 1};'),
]
