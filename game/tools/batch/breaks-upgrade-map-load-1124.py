# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Breaks for the card load of Rob's Upgrade map (ROB-541, 2026-11-24): one or more per engine change, each caught by the
load's suite (which runs the scenarios of all 25 cards) or by the engine suite named beside it.

    python -u game/tools/batch/breaks.py game/tools/batch/breaks-upgrade-map-load-1124.py
"""
SUITES = ['tests/engine-upgrade-map-load-1124.mjs']

ACTIONS = 'game/engine/rules/actions.mjs'
STATICS = 'game/engine/rules/statics.mjs'
TRIGGER = 'game/engine/rules/trigger.mjs'
TURN = 'game/engine/rules/turn.mjs'
INDEX = 'game/engine/cards/index.mjs'
CONDITION = 'game/engine/script/condition.mjs'
RESOURCES = 'game/engine/script/effects/resources.mjs'
FILTER = 'game/engine/script/filter.mjs'

BREAKS = [
    # Group A. Emblems' rules read from the command zone (CR 114.4): Teferi, Temporal Archmage; Teferi, Who Slows the Sunset.
    ('emblem: a player rule read from the battlefield only', STATICS,
     '     control during each opponent\'s untap step" (Teferi, Who Slows the Sunset\'s emblem), "you" the player who got it. */\n  for (const holderId of withEmblems(state)) {',
     '     control during each opponent\'s untap step" (Teferi, Who Slows the Sunset\'s emblem), "you" the player who got it. */\n  for (const holderId of state.zones.battlefield) {'),
    ('emblem: a permanent rule read from the battlefield only', STATICS,
     '     Archmage\'s emblem), "you" the player who got it. */\n  for (const holderId of withEmblems(state)) {',
     '     Archmage\'s emblem), "you" the player who got it. */\n  for (const holderId of state.zones.battlefield) {'),
    ('emblem: its rules not compiled', INDEX,
     'const EMBLEM_RULES = ["loyalty-at-instant-speed", "untap-during-others", "draws-in-others-draw-step"];',
     'const EMBLEM_RULES = [];'),
    # The Chain Veil: one more loyalty activation for each time it reached the planeswalker (CR 606.3).
    ('loyalty again: never', ACTIONS,
     '(ruleChanged(state, "loyalty-twice", id) ? 2 : 1) + loyaltyAgain(state, id)) continue;',
     '(ruleChanged(state, "loyalty-twice", id) ? 2 : 1)) continue;'),
    ('loyalty again: twice is once', STATICS,
     'staticAffects(state, effect, id, effect.sourceController)).length;',
     'staticAffects(state, effect, id, effect.sourceController)).length > 0 ? 1 : 0;'),
    ('chain veil: "didn\'t activate" read as "did"', CONDITION,
     '((state.players[controller]?.loyaltyThisTurn ?? 0) > 0) !== condition.loyaltyThisTurn) return false;',
     '((state.players[controller]?.loyaltyThisTurn ?? 0) > 0) !== true) return false;'),
    # Teferi, Who Slows the Sunset's emblem draw (CR 504.1).
    ('emblem draw: never', TURN,
     'playerStatics(state, "draws-in-others-draw-step", seat).forEach(() => draw(state, seat, events));',
     'playerStatics(state, "draws-in-others-draw-step", seat).forEach(() => null);'),
    # Teferi, Who Slows the Sunset's +1: untap yours, tap theirs (CR 608.2c).
    ('tap: the ones you control too', RESOURCES,
     '    /* "Tap the chosen permanents you don\'t control" (Teferi, Who Slows the Sunset; CR 608.2c): of those it names, the ones a\n       selector fits as each now is (`only`). */\n    if (params.only && !onlyFits(state, params.only, id, context)) continue;\n',
     ''),
    ('untap: the ones you don\'t control too', RESOURCES,
     '    /* "Untap the chosen permanents you control" (Teferi, Who Slows the Sunset): `only`, as tap\'s. */\n    if (params.only && !onlyFits(state, params.only, id, context)) continue;\n',
     ''),

    # Group B. "Whenever an ability is activated" (CR 602.2, 605.3a, 707.10c): Rings of Brighthearth, Illusionist's Bracers.
    ('ability activated: a spell triggers it', TRIGGER,
     '    if (fields.sa?.isSpell !== false) return [];\n',
     ''),
    ('ability activated: any activator', TRIGGER,
     '    if (!whoseIs(condition.activator ?? "you", activator, controller)) return [];\n',
     ''),
    ('ability activated: any creature\'s, not the equipped one\'s', TRIGGER,
     '    if (condition.of === "equipped" && state.objects[sourceId]?.attachedTo !== fields.card?.cardId) return [];\n',
     ''),
    ('ability activated: "that ability" not known', TRIGGER,
     'return [{card: fields.card?.cardId, player: activator, stackId: fields.sa.stackId}];',
     'return [{card: fields.card?.cardId, player: activator}];'),
    ('ability activated: the equipped reading dropped', INDEX,
     '...(t.of === "equipped" ? {of: "equipped"} : {})}),',
     '}),'),
    # The Peregrine Dynamo: "from another legendary source that's not a commander" (CR 113.7, 903.3).
    ('from source: any source', FILTER,
     '      if (!source || !sourceIn(source.zone)(state, entry.cardId, context)) return false;\n',
     ''),
    ('not a commander: a commander too', FILTER,
     '    if (selector.commander === false && object.commander === true) return false;\n',
     ''),

    # Group C. Sting, the Glinting Dagger: first strike while blocking or blocked by a Goblin or Orc (CR 509.1g, 509.1h).
    ('sting: blocking it never counts', FILTER,
     '(attack.attacker === host && (attack.blockers ?? []).includes(id))\n        || ',
     ''),
    ('sting: blocked by it never counts', FILTER,
     '\n        || (attack.attacker === id && (attack.blockers ?? []).includes(host))',
     ''),
    ('sting: any creature in combat or not', FILTER,
     '    if (selector.blockingOrBlockedByAttached === true) {',
     '    if (false) {'),
    # Transguild Courier is all colors (CR 604.3, 105.2).
    ('all colors: not a rule a definition may carry', STATICS,
     '  "all-colors": "cards/index.mjs",\n',
     ''),

    # Group E. Fertile Ground: "an additional one mana of any color" (CR 106.1a, 605.1b).
    ('any color: not compiled as a mana ability', INDEX,
     '|| adds.chosenColor === true || adds.anyColor === true)) {',
     '|| adds.chosenColor === true)) {'),
    ('any color: no pick asked', TRIGGER,
     '      else if (mana.anyColor === true) picks.push([...COLORS]);\n',
     ''),
    ('any color: the pick adds nothing', TRIGGER,
     'const adds = mana.produced || mana.anyColor === true ? (kind ? {[kind]: 1} : null)',
     'const adds = mana.produced ? (kind ? {[kind]: 1} : null)'),
    ('any color: the same mana offered twice', ACTIONS,
     '    if (!kept.has(key) || (ordered && !kept.get(key).ordered)) kept.set(key, {way, ordered});',
     '    kept.set(key + kept.size, {way, ordered});'),
    # Queen Marchesa: "if an opponent is the monarch" (CR 725.1).
    ('monarch opponent: always', CONDITION,
     '  if (condition.monarch === "opponent" && !(Number.isInteger(state.monarch) && state.monarch !== controller)) return false;\n',
     ''),
    ('monarch opponent: nobody counts', CONDITION,
     '!(Number.isInteger(state.monarch) && state.monarch !== controller)) return false;',
     '!(state.monarch !== controller)) return false;'),
]
