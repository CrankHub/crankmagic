# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Breaks for the card load of Rob's "Unplayable Cards 2026-11-18" workbook (ROB-531): one or more per engine change, each
caught by the load's suite (which runs the scenarios of all 42 cards) or by the engine suite named beside it.

    python -u game/tools/batch/breaks.py game/tools/batch/breaks-unplayable-load-1118.py
"""
SUITES = ['tests/engine-unplayable-load-1118.mjs', 'tests/engine-deaths.mjs', 'tests/engine-history-records.mjs']

LAYERS = 'game/engine/rules/layers.mjs'
TRIGGER = 'game/engine/rules/trigger.mjs'
BIND = 'game/engine/script/bind.mjs'
CONDITION = 'game/engine/script/condition.mjs'
FILTER = 'game/engine/script/filter.mjs'
INDEX = 'game/engine/cards/index.mjs'
ACTIONS = 'game/engine/rules/actions.mjs'

BREAKS = [
    # Dwalin, Weaponmaster: a hone counter on an Equipment grants +1/+0 to the equipped creature (CR 122.1, 613.4c, 301.5).
    ('dwalin: a hone counter grants nothing', LAYERS,
     'if (hone > 0) found.push(',
     'if (hone > 99) found.push('),
    ('dwalin: a hone counter grants toughness too', LAYERS,
     'apply: {power: hone, toughness: 0},',
     'apply: {power: hone, toughness: hone},'),
    # Nezumi Linkbreaker, Dain Ironfoot: a created token's own targets are its ability's, not the creating effect's (CR 111.3, 602.2b).
    ('token: its ability\'s targets are counted as the effect\'s', BIND,
     'const own = value.effect === "createToken" && value.token?.abilities ?',
     'const own = false ?'),
    # Vindictive Triumph: the mana value it last had (CR 202.3, 608.2h, 707.2).
    ('vindictive: the snapshot has no mana value', LAYERS,
     '    manaValue: valueCostOf(object) ? manaValue(parseManaCost(valueCostOf(object))) : 0,\n',
     ''),
    ('vindictive: any mana value passes', FILTER,
     'if (!(lki.manaValue <= s.manaValue.max)) return false;',
     ''),
    ('vindictive: a spell record is guessed, not refused', FILTER,
     'if (lki.manaValue === undefined) throw new Error(',
     'if (false) throw new Error('),
    # Night Nurse: a card put in its zone this turn (CR 400.7).
    ('night nurse: any card in the graveyard', FILTER,
     'if (selector.arrivedThisTurn === true && object.arrivedTurn !== state.turn) return false;',
     ''),
    # Captain America, Living Legend: the first time a creature has become tapped this turn (CR 701.26a, 603.4).
    ('captain: taps are never counted', TRIGGER,
     '  recordTaps(state, events);\n',
     ''),
    ('captain: the count carries into the next turn', TRIGGER,
     '(object.tapsThisTurn?.turn === state.turn ? object.tapsThisTurn.count : 0)',
     '(object.tapsThisTurn?.count ?? 0)'),
    ('captain: an untap counts as a tap', TRIGGER,
     'event.kind !== "GameEventCardTapped" || fields.tapped !== true',
     'event.kind !== "GameEventCardTapped"'),
    ('captain: a sacrificed permanent is counted', TRIGGER,
     '    if (!object) continue;\n    object.tapsThisTurn',
     '    object.tapsThisTurn'),
    ('captain: every tap is the first', CONDITION,
     'if (condition.firstTappedThisTurn === true && state.objects[about?.card]?.tapsThisTurn?.count !== 1) return false;',
     ''),
    # Aerial Doombot, Ultron Drone: power-up, once by this object and cheaper the turn it entered (CR 702.193a-b, 118.7, 601.2f).
    ('power-up: never known', INDEX,
     '...(/^Power-up\\b/.test(ability.text ?? "") ? {powerUp: true} : {}),',
     '...(false ? {powerUp: true} : {}),'),
    ('power-up: activated any number of times', ACTIONS,
     '&& !((ability.exhaust || ability.powerUp) && (state.objects[id]?.exhausted',
     '&& !((ability.exhaust) && (state.objects[id]?.exhausted'),
    ('power-up: its use is not recorded', ACTIONS,
     'if (ability.exhaust || ability.powerUp) (object.exhausted ??= []).push(ability.id);',
     'if (ability.exhaust) (object.exhausted ??= []).push(ability.id);'),
    ('power-up: never reduced', ACTIONS,
     '  if (ability.powerUp) return (ability.cost ?? []).map(',
     '  if (false) return (ability.cost ?? []).map('),
    ('power-up: reduced on any turn', ACTIONS,
     '  if (object.arrivedTurn !== state.turn) return printed;\n',
     ''),
    ('power-up: generic mana is not taken off', ACTIONS,
     '    if (generic(symbol)) left -= Number(symbol.slice(1, -1));',
     '    if (generic(symbol)) left -= 0;'),
    ('power-up: a colored symbol is not matched', ACTIONS,
     '    else if (at >= 0) rest.splice(at, 1);',
     '    else if (false) rest.splice(at, 1);'),
    ('power-up: an unmatched symbol takes nothing off', ACTIONS,
     '    else left -= 1;',
     '    else left -= 0;'),
    ('power-up: reduced below nothing', ACTIONS,
     'return `{${Math.max(0, left)}}${rest.join("")}`;',
     'return `{${left}}${rest.join("")}`;'),
    ('power-up: the activation is offered at the full cost', ACTIONS,
     'const plain = costPayment(state, player, id, costOf(state, player, ability, X ?? 0, id),',
     'const plain = costPayment(state, player, id, costOf(state, player, ability, X ?? 0),'),
]
