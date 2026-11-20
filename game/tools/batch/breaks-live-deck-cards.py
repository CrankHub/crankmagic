# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Rob's eight live decks, every card (ROB-94): tests/live-deck-cards.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-live-deck-cards.py
"""
SUITES = ['tests/live-deck-cards.mjs']
BREAKS = [
    ('a live deck card the table does not play', 'tests/fixtures/live-deck-names.json',
     '  "Absorb",\n',
     '  "Absorb of the Unwritten",\n'),
    # Not here: an ability no longer tapped for. The census files ACTIVATION_ONLY_WHEN_FLOATED as advisory (CLASS_POLICY), so it does
    # not fail on it; making that class enforcing, with its own baseline, is ROB-354 (plan item 2.5).
    ('a {X} spell no longer tapped for, which the census sees on a deck card', 'game/engine/rules/actions.mjs',
     'const xTaps = (state) => state.xTaps === true && pooledTaps(state);',
     'const xTaps = (state) => false;'),
]
