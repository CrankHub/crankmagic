# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Breaks for the card load of Rob's box and upgrade cards for D1, D3, D4, D5, D6 and D8 (2026-11-15; ROB-530): one or more per engine
change, each caught by the load's suite (which runs the scenarios of all 28 cards).

    python game/tools/batch/breaks.py game/tools/batch/breaks-boxes-load-1115.py
"""
SUITES = ['tests/engine-boxes-load-1115.mjs']

STATICS = 'game/engine/rules/statics.mjs'
COMBAT = 'game/engine/rules/combat.mjs'
ACTIONS = 'game/engine/rules/actions.mjs'
TRIGGER = 'game/engine/rules/trigger.mjs'
TURN = 'game/engine/rules/turn.mjs'
PERMANENTS = 'game/engine/script/effects/permanents.mjs'
RESOURCES = 'game/engine/script/effects/resources.mjs'
ASKING = 'game/engine/script/effects/asking.mjs'
EFFECTS = 'game/engine/script/effects/index.mjs'
FILTER = 'game/engine/script/filter.mjs'
BIND = 'game/engine/script/bind.mjs'
SCHEMA = 'game/engine/script/schema.mjs'
INDEX = 'game/engine/cards/index.mjs'
SCENARIO = 'game/engine/cards/scenario.mjs'

BREAKS = [
    # Gideon Jura: "creatures that player controls attack Gideon Jura if able" (CR 508.1d).
    ('gideon: the rule is never found', STATICS,
     'e.rule === "attacks-planeswalker" && staticAffects(state, e, id, e.sourceController)',
     'e.rule === "attacks-planeswalkerx" && staticAffects(state, e, id, e.sourceController)'),
    ('gideon: a creature that cannot attack it is still owed', COMBAT,
     ' && !cantAttack(state, id, defender, pw)\n',
     '\n'),
    ('gideon: the declaration is never required to include it', COMBAT,
     'if (owed.size) out.push(',
     'if (false) out.push('),
    ('gideon: the creature is offered other defenders too', COMBAT,
     '      if (walkers.length) {',
     '      if (false) {'),
    ('gideon: the planeswalker is not remembered', PERMANENTS,
     '...(params.rule === "attacks-planeswalker" ? {planeswalker: context.source ?? null} : {}),',
     '...(false ? {planeswalker: context.source ?? null} : {}),'),
    ('gideon: it never ends', TURN,
     'e.until === "their-next-end" && (e.players ?? []).includes(state.activePlayer)))',
     'e.until === "their-next-end" && false))'),
    # Tamiyo, Field Researcher.
    ('tamiyo -2: a tapped permanent untaps anyway', RESOURCES,
     'if (params.noUntap === true && object.zone === "battlefield") object.skipUntap',
     'if (false && object.zone === "battlefield") object.skipUntap'),
    ('tamiyo -2: it skips every untap step, not one', TURN,
     'if (o.skipUntap === state.activePlayer) { delete o.skipUntap; continue; }',
     'if (o.skipUntap === state.activePlayer) { continue; }'),
    ('tamiyo +1: only the first creature is watched', TRIGGER,
     '(Array.isArray(d.watch) ? !d.watch.includes(watched) : watched !== d.watch)',
     '(Array.isArray(d.watch) ? !d.watch.includes(watched) : watched !== d.watch) || (Array.isArray(d.watch) && watched !== d.watch[0])'),
    ('tamiyo +1: damage to a creature is not damage dealt', INDEX,
     '["player", "opponent", "you", "anything"].includes(t.to ?? "player")',
     '["player", "opponent", "you"].includes(t.to ?? "player")'),
    ('tamiyo +1: damage to anything is not read', TRIGGER,
     'const toAnything = condition.to === "anything";',
     'const toAnything = false;'),
    ('tamiyo +1: one draw for each thing damaged, not each creature', TRIGGER,
     'if (done.has(about.card)) continue;',
     ''),
    ('tamiyo -7: the emblem is not read for a free cast', STATICS,
     'const emblems = (state.zones.command ?? []).flat().filter((id) => state.objects[id]?.emblem === true);',
     'const emblems = [];'),
    ('tamiyo -7: an emblem may not hold a free cast', INDEX,
     '        || (ability?.kind === "static" && ability.rule === "cast-without-paying")\n',
     ''),
    # Oath of Nissa: mana as though of any color for planeswalker spells (CR 609.4b).
    ('oath: the cost is not marked', ACTIONS,
     'cost.anyColor = true;',
     'cost.anyColor = false;'),
    ('oath: the tap plan pays the printed cost', ACTIONS,
     'const paying = anyTypeCost(xs, null);',
     'const paying = xs;'),
    # Bloodthirsty Blade and Kardur: goaded, and the same requirement without the status (CR 701.15b).
    ('blade: the static goad is never found', STATICS,
     'if (ability.kind !== "static" || ability.rule !== "goaded") continue;',
     'if (ability.kind !== "static" || ability.rule !== "goadedx") continue;'),
    ('blade: a static goad is not goaded for a selector', STATICS,
     ' || staticGoaders(state, id).length > 0;',
     ' || false;'),
    ('blade: the selector reads only effects of a goad', FILTER,
     'if (selector.goaded === true && !isGoaded(state, id)) return false;',
     'if (selector.goaded === true && !goadersOf(state, id).length) return false;'),
    ('kardur: its requirement is never found', STATICS,
     'else if (e.rule === "attacks-other-than-you" && staticAffects(state, e, id, e.sourceController))',
     'else if (e.rule === "attacks-other-than-youx" && staticAffects(state, e, id, e.sourceController))'),
    # Mathas: an ability given for as long as a counter is there.
    ('mathas: the given abilities are held as written', INDEX,
     'if (effect.effect === "effectUntil" && Array.isArray(effect.apply?.addAbilities)',
     'if (false && effect.effect === "effectUntil" && Array.isArray(effect.apply?.addAbilities)'),
    # Comet Storm: another target for each time it was kicked (CR 702.33c, 601.2c).
    ('comet storm: the kicks add no target', BIND,
     'bounds && count.plusKicked === true',
     'bounds && count.plusKicked === "never"'),
    ('comet storm: the kicks are not read', BIND,
     'const kicks = Math.max(0, context?.kicked ?? context?.cast?.kicked ?? 0);',
     'const kicks = 0;'),
    ('comet storm: the cast does not remember its kicks', ACTIONS,
     'cast.kicked = variant.kicked ?? 0;',
     'cast.kicked = 0;'),
    ('comet storm: the offer does not carry its kicks', ACTIONS,
     'if (Number.isInteger(action.kicked)) context.kicked = action.kicked;',
     ''),
    ('comet storm: an ability may count kicks too', SCHEMA,
     'if (count?.plusKicked !== undefined && ability.kind !== "spell")',
     'if (count?.plusKicked !== undefined && false)'),
    # Minds Aglow: join forces.
    ('join forces: its shape is not held', SCHEMA,
     'effect.amountX === true && effect.ifPaid === true && effect.who === undefined))',
     'effect.amountX === true && effect.who === undefined))'),
    ('join forces: a player who can pay nothing is asked', ASKING,
     'xOptions(state, rest[i]).length < 2',
     'xOptions(state, rest[i]).length < 1'),
    ('join forces: the total is not added up', ASKING,
     'awaiting.joined.total + (awaiting.amount ?? 0)',
     'awaiting.joined.total + 0'),
    # Tempt with Discovery: "for each player who did" (CR 207.2c, 101.4).
    ('tempt: the players who did are every player', EFFECTS,
     '(context.whoDid ?? []).includes(player)',
     'true'),
    ('tempt: the repetition is not declared', EFFECTS,
     '"other opponent", "who did"]',
     '"other opponent"]'),
    # Heartbeat of Spring: the tapper picks the type (CR 106.3).
    ('heartbeat: the first type is taken without asking', TRIGGER,
     'kind = pending.shift();\n        if (!kinds.includes(kind))',
     'kind = kinds[0];\n        if (!kinds.includes(kind))'),
    ('heartbeat: no offer for each pick', ACTIONS,
     'if (!ability.tapSelf) return [null];',
     'if (true) return [null];'),
    ('heartbeat: the pick offers are spent as plain taps', ACTIONS,
     'if (offer.costChoice || offer.extra) continue;',
     'if (offer.costChoice) continue;'),
    ('heartbeat: the pick is not passed on', ACTIONS,
     'manaTriggered(state, events[events.length - 1], action.extra ?? [])',
     'manaTriggered(state, events[events.length - 1], [])'),
    ('heartbeat: the scenario takes any offer', SCENARIO,
     'found = found.filter((a) => JSON.stringify(a.extra ?? []) === JSON.stringify(step.pick ?? []));',
     ''),
    # Rites of Flourishing: an additional land for each player (CR 305.2).
    ('rites: only the controller gets the land', ACTIONS,
     '...eachPlayerStatics(state, "extra-land-drop")',
     '...[]'),
    # Selvala: a library-moving ability is not a mana ability (CR 605.1a).
    ('selvala: a library-moving ability is a mana ability', INDEX,
     'if ((ability.effects ?? []).some((e) => LIBRARY_MOVERS.includes(e?.effect))) return null;',
     ''),
]
