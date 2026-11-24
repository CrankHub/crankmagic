# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""r4 combat (ROB-26) as ROB-544 left it: two presses assign a block, nothing is settled per attacker, the pop-up is wide and
the attackers a list that never scrolls sideways. tests/board-r4-combat.mjs.

    python game/tools/batch/breaks.py game/tools/batch/breaks-r4-combat.py
"""
SUITES = ['tests/board-r4-combat.mjs']
T = 'crankmagic-board.js'
S = 'crankmagic-stage.css'
BREAKS = [
 # Re-anchored by ROB-544: the per-attacker Confirm is gone; a press on an attacker's row is what must stay private.
 ('choosing an attacker publishes', T, 'blockAttacker=id;actionsShut=false;', 'blockAttacker=id;actions["board-confirm"]();actionsShut=false;'),
 # Re-anchored by ROB-544: a creature that may block one attacker moves off the old one.
 ('move leaves the old attacker blocked', T, '      if(view.decision.exclusiveBy === "cardId")picked=picked.filter(i=>view.decision.options.find(x=>x.index===i)?.cardId!==o.cardId);\n', ''),
 ('global reason assigned to all attackers', T, 'const fromCheck=checked?.byAttacker?.find(x=>x.attackerId===id)?.reasons || [];', 'const fromCheck=checked?.reasons || [];'),
 ('stale Send binds', T, 'Number(el?.dataset?.revision)===view?.revision && ', ''),
 # ROB-544
 ('Send waits for every attacker to be blocked', T, 'const canSendBlocks = () => blockValid() && !sending;', 'const canSendBlocks = () => blockValid() && picked.length >= ownBlockAttacks().length && !sending;'),
 ('choosing another attacker clears the draft', T, 'blockAttacker=id;actionsShut=false;', 'blockAttacker=id;picked=[];actionsShut=false;'),
 ('a tile hides which attacker it blocks', T, "${other?`<small class=\"cm-block-elsewhere\">", "${false?`<small class=\"cm-block-elsewhere\">"),
 ('the blocker pop-up stays narrow', S, '.cm-required-popup:has(.is-blocking){width:min(1040px,calc(100vw - 32px))!important}', '.cm-required-popup:has(.is-blocking){width:min(540px,calc(100vw - 32px))!important}'),
 ('the attackers run sideways again', S, '.cm-r4-combat.is-draft .cm-combat-groups{display:flex;flex-direction:column;', '.cm-r4-combat.is-draft .cm-combat-groups{display:flex;flex-direction:row;overflow-x:auto;'),
 ('a long name is cut', S, '.cm-block-row-name{overflow-wrap:anywhere;white-space:normal}', '.cm-block-row-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'),
 ('Send leaves the answering row', T, '      foot = sendBlocksButton() + ', '      body += sendBlocksButton(); foot = '),
 ('the pop-up grows past the window', S, '#cm-board-decision.is-blocking>.cm-board-options{display:flex;flex-direction:column;max-height:calc(100dvh - 220px);overflow:hidden;', '#cm-board-decision.is-blocking>.cm-board-options{display:flex;flex-direction:column;max-height:none;overflow:hidden;'),
 # Break the winning shared !important rule, not the redundant lower-priority tile rule.
 ('chosen blockers borrow ownership color', S, '.cm-board .cm-board-options [aria-pressed=true]{background:var(--color-ink)!important;', '.cm-board .cm-board-options [aria-pressed=true]{background:var(--st-inbox)!important;'),
]
