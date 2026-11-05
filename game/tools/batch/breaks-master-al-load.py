# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Breaks for the card load of Rob's Master Table, column AL (2026-11-04): one per engine change, each caught by the load's suite.

    python game/tools/batch/breaks.py game/tools/batch/breaks-master-al-load.py
"""
SUITES = ['tests/engine-master-al-load.mjs', 'tests/engine-vocabulary.mjs']

ACTIONS = 'game/engine/rules/actions.mjs'
INDEX = 'game/engine/cards/index.mjs'
FILTER = 'game/engine/script/filter.mjs'
CONDITION = 'game/engine/script/condition.mjs'
ASKING = 'game/engine/script/effects/asking.mjs'
RESOLUTION = 'game/engine/script/resolution.mjs'
PERMANENTS = 'game/engine/script/effects/permanents.mjs'
VOCABULARY = 'game/engine/vocabulary.mjs'
SCENARIO = 'game/engine/cards/scenario.mjs'

BREAKS = [
    # Dispelling Exhale: "you may behold a Dragon", an optional additional cost.
    ('optional behold: only the cast without it', ACTIONS,
     '      variants = variants.flatMap((v) => [v, {...v, atoms: [...v.atoms, atom]}]);\n',
     '      variants = variants.flatMap((v) => [v]);\n'),
    ('optional behold: refused in a spell\'s own additional cost', INDEX,
     '&& (atom.optional === undefined || (exiles && atom.optional === true));',
     '&& (atom.optional === undefined);'),
    ('optional behold: allowed anywhere', INDEX,
     '&& (atom.optional === undefined || (exiles && atom.optional === true));',
     '&& (atom.optional === undefined || atom.optional === true);'),
    ('optional additional cost: any atom may be', INDEX,
     'if (atom?.optional !== undefined && !(atom.optional === true && (atom.atom === "blight" || atom.atom === "behold")))',
     'if (false)'),
    ('scenario step: behold is not chosen', SCENARIO,
     '    if (step.behold !== undefined) found = found.filter((a) => ((a.behold ?? 0) > 0) === step.behold);\n',
     ''),
    # Dewdrop Cure: the gift promised changes "up to two" to "up to three".
    ('promised cast: the plain cast\'s targets are asked', ACTIONS,
     '    const spell = action.gift !== undefined && object.spell?.promised ? object.spell.promised : object.spell;\n',
     '    const spell = object.spell;\n'),
    # Roamer's Routine: harmonize.
    ('harmonize: the static is not marked', INDEX,
     'abilities.push({id, kind: "static", rule: "flashback", harmonize: true,',
     'abilities.push({id, kind: "static", rule: "flashback",'),
    ('harmonize: any cost', INDEX,
     'if (cost.length !== 1 || cost[0]?.atom !== "mana" || !paid || !paid.symbols.length || paid.variable > 0) problems.push(',
     'if (false) problems.push('),
    ('harmonize: a permanent card', INDEX,
     'if (!(identity.types ?? []).some((t) => t === "Instant" || t === "Sorcery")) problems.push(`${ability.text}: harmonize on',
     'if (false) problems.push(`${ability.text}: harmonize on'),
    ('harmonize: not a keyword', VOCABULARY,
     '\n  "harmonize",\n',
     '\n'),
    ('harmonize: the flashback cost is not marked', ACTIONS,
     '    ...(own?.harmonize === true ? {harmonize: true} : {}),\n',
     ''),
    ('harmonize: no offer taps a creature', ACTIONS,
     '[v, ...tappers.map((c) =>',
     '[v, ...[].map((c) =>'),
    ('harmonize: a creature with no power is offered', ACTIONS,
     '.filter((c) => (characteristicsOf(state, c).power ?? 0) > 0);',
     '.filter((c) => (characteristicsOf(state, c).power ?? 0) >= 0);'),
    ('harmonize: two creatures of one power are one offer', ACTIONS,
     '  && (a.harmonize ?? null) === (b.harmonize ?? null)\n',
     ''),
    ('harmonize: the creature is not tapped', ACTIONS,
     '[...tapping, ...harmonizing, ...escalating,',
     '[...tapping, ...escalating,'),
    ('harmonize: nothing comes off the cost', ACTIONS,
     'let reduction = costReduction(state, player, id, targets) + harmonized;',
     'let reduction = costReduction(state, player, id, targets);'),
    ('harmonize: one mana comes off whatever the power', ACTIONS,
     'Number(token.slice(2, -1))',
     '1'),
    ('harmonize: an additional cost paid', ACTIONS,
     '      delete entry.cast.additionalPaid;\n',
     '      void 0;\n'),
    ('scenario step: harmonize is not chosen', SCENARIO,
     'if (step.harmonize !== undefined)',
     'if (false)'),
    # Ringsight: a card that shares a color with a legendary creature you control.
    ('sharesColor: a color of any permanent is any color', FILTER,
     'if (!others.some((other) => colorsOf(state, other).some((color) => own.includes(color)))) return false;',
     'if (!others.length) return false;'),
    ('sharesColor: any value is a selector', FILTER,
     'if (!selector.sharesColor || typeof selector.sharesColor !== "object" || Array.isArray(selector.sharesColor))',
     'if (false)'),
    # Faramir: choose an opponent, at that player's next end step, if they didn't attack you.
    ('choosePlayer: not in the catalog', VOCABULARY,
     '    "choosePlayer",\n  ]),',
     '  ]),'),
    ('choosePlayer: not in the asking list', ASKING,
     'chooseType, chooseColor, choosePlayer, play,',
     'chooseType, chooseColor, play,'),
    ('choosePlayer: not a decision', 'game/engine/script/effects/index.mjs',
     '  "choosePlayer",\n',
     ''),
    ('choosePlayer: one opponent is asked', ASKING,
     '    if (opponents.length === 1) { context.chosenPlayer = opponents[0]; return false; }\n',
     ''),
    ('choosePlayer: an opponent who left is offered', ASKING,
     'const opponents = state.players.filter((p) => p.id !== context.controller && !p.lost).map((p) => p.id);\n    if (opponents.length === 0) return false;\n    if (opponents.length === 1) {',
     'const opponents = state.players.filter((p) => p.id !== context.controller).map((p) => p.id);\n    if (opponents.length === 0) return false;\n    if (opponents.length === 1) {'),
    ('choosePlayer: more than one chosen', ASKING,
     'const picked = (indices ?? []).length === 1 ? awaiting.options[indices[0]] : undefined;',
     'const picked = awaiting.options[(indices ?? [])[0]];'),
    ('choosePlayer: the choice is not remembered', RESOLUTION,
     'if (!Array.isArray(outcome) && Number.isInteger(outcome.chosenPlayer)) state.resolving.context.chosenPlayer = outcome.chosenPlayer;',
     ''),
    ('delayed trigger: the chosen player is not read', PERMANENTS,
     'if (params.player === "the chosen player") {',
     'if (false) {'),
    ('delayed trigger: a chosen player who left, or none, waits for anyone', PERMANENTS,
     '&& !state.players[chosen]?.lost ? chosen : -1};',
     '&& !state.players[chosen]?.lost ? chosen : undefined};'),
    ('activePlayerAttackedYou: not read', CONDITION,
     '(state.players[state.activePlayer]?.attackedPlayers ?? []).includes(controller) !== condition.activePlayerAttackedYou) return false;',
     '(state.players[state.activePlayer]?.attackedPlayers ?? []).includes(-1) !== condition.activePlayerAttackedYou) return false;'),
    ('activePlayerAttackedYou: any value', CONDITION,
     'if ("activePlayerAttackedYou" in condition && typeof condition.activePlayerAttackedYou !== "boolean") problems.push(',
     'if (false) problems.push('),
    ('activePlayerAttackedYou: not a condition key', CONDITION,
     '  "activePlayerAttackedYou",\n',
     ''),
]
