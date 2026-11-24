# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Breaks for the card load of Rob's Ninja deck (ROB-540, 2026-11-23): one or more per engine change, each caught by the
load's suite (which runs the scenarios of all 29 cards) or by the engine suite named beside it.

    python -u game/tools/batch/breaks.py game/tools/batch/breaks-ninja-deck-load-1123.py
"""
SUITES = ['tests/engine-ninja-deck-load-1123.mjs', 'tests/engine-warp-sneak.mjs', 'tests/engine-play-from-zones.mjs']

ACTIONS = 'game/engine/rules/actions.mjs'
STACK = 'game/engine/rules/stack.mjs'
LAYERS = 'game/engine/rules/layers.mjs'
STATICS = 'game/engine/rules/statics.mjs'
TRIGGER = 'game/engine/rules/trigger.mjs'
INDEX = 'game/engine/cards/index.mjs'
RESOLUTION = 'game/engine/script/resolution.mjs'
CONDITION = 'game/engine/script/condition.mjs'
AMOUNT = 'game/engine/script/amount.mjs'
BIND = 'game/engine/script/bind.mjs'
SCHEMA = 'game/engine/script/schema.mjs'
ZONES = 'game/engine/script/effects/zones.mjs'

BREAKS = [
    # Group A. Sneak tapped for from untapped lands (CR 702.190a, 118.9): every sneak card.
    ('sneak: the cast offer does not tap for it', ACTIONS,
     '&& !fled && (!way || way.sneak === true) && !tapsAny',
     '&& !fled && !way && !tapsAny'),
    ('sneak: not a cast that may tap for itself', ACTIONS,
     '(action.alternative === undefined || sneakWay(state, player, action) !== null)',
     'action.alternative === undefined'),
    ('sneak: the tap plan pays the mana cost, not the sneak cost', ACTIONS,
     'false, sneakWay(state, player, action)?.mana ?? null, action.extraMana',
     'false, null, action.extraMana'),
    # Turncoat Kunoichi: "if its sneak cost was paid" read as the source last was once it is gone (CR 608.2h).
    ('sneak paid: the stack entry does not carry it to resolution', STACK,
     '    ...(entry.paidFor ? {paidFor: entry.paidFor} : {}),\n',
     ''),
    ('sneak paid: the resolution context drops it', RESOLUTION,
     '      ...(context.paidFor ? {paidFor: context.paidFor} : {}),\n',
     ''),
    ('sneak paid: a branch condition is not told', RESOLUTION,
     'about: resolving.context.about, paidFor: resolving.context.paidFor,\n',
     'about: resolving.context.about,\n'),

    # Group B. Ninjutsu given (Satoru Umezawa; CR 702.49a, 613.1f).
    ('ninjutsu given: a card in hand has only its printed abilities', LAYERS,
     '  if (object.zone === "hand") return [...(object.abilities ?? []), ...ninjutsuGiven(state, id)];\n',
     ''),
    ('ninjutsu given: every card in hand has it', LAYERS,
     '    if (!matchesSelector({...ability.affects, what: "card", zone: "hand"}, state, id, {controller: state.objects[holderId].controller, source: holderId})) continue;\n',
     ''),
    ('ninjutsu given: the hand loop reads printed abilities', ACTIONS,
     '    for (const ability of abilitiesOf(state, id)) {\n      if (ability.kind !== "activated" || ability.zone !== "hand") continue;',
     '    for (const ability of object.abilities ?? []) {\n      if (ability.kind !== "activated" || ability.zone !== "hand") continue;'),
    # Satoru's trigger: "whenever you activate a ninjutsu ability" (CR 702.49).
    ('ninjutsu: the ability is not marked', LAYERS,
     'zone: "hand", text, ninjutsu: true,',
     'zone: "hand", text,'),
    ('ninjutsu: the activation event is not marked', ACTIONS,
     '...(ability.ninjutsu === true ? {ninjutsu: true} : {})}',
     '}'),
    ('ninjutsu trigger: any activation', TRIGGER,
     'if (fields.sa?.ninjutsu !== true || fields.si',
     'if (fields.si'),
    ('ninjutsu trigger: any activator', TRIGGER,
     'fields.sa?.ninjutsu !== true || fields.si?.actor?.playerId !== controller) return [];',
     'fields.sa?.ninjutsu !== true) return [];'),
    ('ninjutsu trigger: the trigger word reads nothing', INDEX,
     '"ninjutsu activated": () => ({on: "GameEventSpellAbilityCast", ninjutsuActivated: true}),',
     '"ninjutsu activated": () => ({on: "GameEventSpellAbilityCast"}),'),
    # Silver-Fur Master: ninjutsu abilities you activate cost {1} less (CR 601.2f).
    ('ninjutsu reduction: any activated ability', STATICS,
     'if (activated?.ninjutsu === true && compileSelector',
     'if (compileSelector'),
    ('ninjutsu reduction: any player', STATICS,
     'if (activated?.ninjutsu === true && compileSelector({...(ability.affects ?? {}), what: "player"})(state, player, context)) total',
     'if (activated?.ninjutsu === true) total'),
    ('ninjutsu reduction: the cost is not told the ability', ACTIONS,
     '  + abilityCostReduction(state, id, ability, player);',
     '  + abilityCostReduction(state, id);'),
    # Nashi: a card played by permission paid with life equal to its mana value (CR 118.9).
    ('pay life: the permission drops it', ZONES,
     '    ...(params.payLife ? {payLife: params.payLife} : {}),\n    ...(typeof params.manaInstead',
     '    ...(typeof params.manaInstead'),
    ('pay life: the offer drops it', ACTIONS,
     '      ...(e.payLife ? {payLife: e.payLife} : {}),\n      /* "Its owner',
     '      /* "Its owner'),

    # Group C. Squad (CR 702.157a): Endless Foot Assault.
    ('squad: the keyword is not compiled', INDEX,
     'toLowerCase() === "squad") {',
     'toLowerCase() === "squad-x") {'),
    ('squad: no copies offered', ACTIONS,
     'if (atom?.atom === "squad") {',
     'if (atom?.atom === "squad-x") {'),
    ('squad: the offer forgets the times paid', ACTIONS,
     '        ...(variant.squad ? {squad: variant.squad} : {}),\n',
     ''),
    ('squad: the spell forgets the times paid', ACTIONS,
     '    if (action.squad > 0) entry.squad = action.squad;\n',
     ''),
    ('squad: the permanent forgets the times paid', STACK,
     'if (to === "battlefield" && entry.squad) state.objects[arrived].squad = entry.squad;',
     ''),
    ('squad: the trigger forgets the times paid', TRIGGER,
     '            ...(object.squad > 0 ? {squad: object.squad} : {}),\n',
     ''),
    ('squad: the trigger is put on the stack without them', TRIGGER,
     '      squad: trigger.squad ?? 0,\n',
     ''),
    ('squad: the ability forgets them', STACK,
     '  if (squad > 0) entry.sourceSquad = squad;\n',
     ''),
    ('squad: the condition is not told', STACK,
     '    ...(entry.sourceSquad ? {squad: entry.sourceSquad} : {}),\n    ...(entry.lastKnown',
     '    ...(entry.lastKnown'),
    ('squad: the resolution is not told', RESOLUTION,
     '      ...(context.squad ? {squad: context.squad} : {}),\n',
     ''),
    ('squad: never paid', CONDITION,
     '  if (condition.squadPaid === true && !(',
     '  if (false && !('),
    ('squad: the count reads none', AMOUNT,
     '  else if ("squad" in value) n = context.squad ?? 0;',
     '  else if ("squad" in value) n = 0;'),

    # Group D. Fugitive Droid: "can't be blocked if ..." reads its condition (CR 509.1b).
    ('cant-be-blocked: no condition read', INDEX,
     '  "cant-be-blocked",\n',
     ''),
    # Prehistoric Pet: can't be blocked by creatures with greater power (CR 509.1b).
    ('greater power: any blocker may block', STATICS,
     '      if (ability.byPowerAboveSource === true && powerOf(state, blockerId) > powerOf(state, holderId)) return true;\n',
     ''),
    ('greater power: the schema refuses it', SCHEMA,
     ' && ability.byPowerAboveSource !== true) errors.push(',
     ') errors.push('),
    # Game Over: a player's life total at half their starting life or less (CR 119.1).
    ('fewest life: never read', AMOUNT,
     '    else if (value.lifeTotal === "fewest") n = Math.min(...state.players.filter((p) => !p.lost).map((p) => p.life));\n',
     ''),
    # Don & Leo: one move of two targets together (CR 608.2c).
    ('two refs: one move takes neither', BIND,
     '  if (Array.isArray(value) && value.every(isRef)) return value.flatMap((ref) => objectsOf(ref, context));\n',
     ''),

    # Group E. Krang & Shredder: a dig's exiled card linked to its source (CR 607.2a).
    ('linked dig: the exile is not linked', ZONES,
     'if (params.link === true && linkOf(context) !== null)\n    (state.links ??= {})[linkOf(context)] = [...(state.links[linkOf(context)] ?? []), ...all.filter(',
     'if (false)\n    (state.links ??= {})[linkOf(context)] = [...(state.links[linkOf(context)] ?? []), ...all.filter('),
    # Ninja Teen's level 3: sneak given to graveyard creature cards, and cast from there by it (CR 702.190a, 601.3).
    ('graveyard sneak: never permitted', ACTIONS,
     '|| !ruleChanged(state, "sneak-from-graveyard", id)) return own;',
     ') return own;'),
    ('graveyard sneak: its condition is not read', ACTIONS,
     '&& conditionHolds(state, a.condition, {controller: state.objects[holder].controller, source: holder})',
     ''),
    ('graveyard sneak: any card is given it', ACTIONS,
     '&& matchesSelector(a.affects, state, id, {controller: state.objects[holder].controller, source: holder}))',
     ')'),
    ('graveyard sneak: at any timing', ACTIONS,
     'const given = !conditionHolds(state, {sneak: true}',
     'const given = false && !conditionHolds(state, {sneak: true}'),
    ('graveyard sneak: not marked as from the graveyard', ACTIONS,
     '(way.sneak === true ? {...way, fromGraveyard: true} : way)',
     '(way)'),
    ('graveyard sneak: the graveyard cast is offered by its mana cost', ACTIONS,
     '(graveyardCost || (object.abilities',
     '(false || (object.abilities'),
    ('graveyard sneak: not tapped for (the cast)', ACTIONS,
     '|| graveSneakTap(state, action.from, sneakWay(state, player, action)))',
     ')'),
    ('graveyard sneak: not tapped for (the offer)', ACTIONS,
     '|| graveSneakTap(state, from, way))) {',
     ')) {'),
    ('graveyard sneak: the declare blockers step is passed by itself', ACTIONS,
     "alternativeCosts(state, player, id).some((way) => way.fromGraveyard && way.sneak === true && manaValue(parseManaCost(way.mana)) <= mana)) return true;",
     "false) return true;"),
    ('graveyard sneak: not a rule a definition may carry', STATICS,
     '  "sneak": "rules/actions.mjs",\n  "sneak-from-graveyard": "rules/actions.mjs",\n',
     ''),
]
