# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""`permittedTaps` (ROB-226, Nov 20): a card cast through a permission -- from exile, a graveyard or the top of a library --
tapped for as from the hand, in a table's new matches (Valakut Exploration's exiled Purphoros); a permission that pays
another way (Bolas's Citadel, life) paid as before; a match launched before offers what it offered then.
tests/engine-permitted-taps.mjs and tests/game-table.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-permitted-taps.py
"""
SUITES = ['tests/engine-permitted-taps.mjs', 'tests/game-table.mjs']
A = 'game/engine/rules/actions.mjs'
BREAKS = [
    ('a permitted cast offered only from floating mana, as before', A,
     '  && preparedCopyStays(state, id) && controllerOf(state, state.objects[id].prepareOf) === player) || permittedTap(state, player, from, id, via);',
     '  && preparedCopyStays(state, id) && controllerOf(state, state.objects[id].prepareOf) === player);'),
    ('a match launched before tapped for it too', A,
     'const permittedTaps = (state) => state.permittedTaps === true && pooledTaps(state);',
     'const permittedTaps = (state) => pooledTaps(state);'),
    # Not here: permittedTap's own refusal of a permission paid another way (payLife, Bolas's Citadel). castOffers already declines to
    # tap for a cost paid in life before it asks tapZone, so breaking that guard alone changes nothing a suite can see; the Citadel
    # case in tests/engine-permitted-taps.mjs holds the behavior.
    ('the state not keeping the key', 'game/engine/state/index.mjs',
     '...(pod?.permittedTaps === true ? {permittedTaps: true} : {}),',
     ''),
    ("a table's new match without it", 'game/room/table.mjs',
     '      permittedTaps: true,\n',
     ''),
]
