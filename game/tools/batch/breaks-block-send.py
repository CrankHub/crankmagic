# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""ROB-544 (and ROB-333's one press, kept): Send with attackers left alone, one button that reads No blocks or Send N, no
shortcut that clears an assigned block, a refusal named on its attacker's row. tests/board-block-none-all.mjs.

    python game/tools/batch/breaks.py game/tools/batch/breaks-block-send.py
"""
SUITES = ['tests/board-block-none-all.mjs']
T = 'crankmagic-board.js'
BREAKS = [
    ('Send waits for every attacker to be blocked', T,
     'const canSendBlocks = () => blockValid() && !sending;',
     'const canSendBlocks = () => blockValid() && picked.length >= ownBlockAttacks().length && !sending;'),
    ('Send enabled on a refused check', T,
     '&& blockResult.ok && blockResult.open && socket?.readyState',
     '&& blockResult.open && socket?.readyState'),
    ('an untouched attacker sent as blocked', T,
     '      return send({indices: [...picked]});',
     '      return send({indices: [...picked, ...view.decision.options.filter(o=>!draftFor(o.attackerId).length).slice(0,1).map(o=>o.index)]});'),
    ('Send wipes the assigned blocks', T,
     '      return send({indices: [...picked]});',
     '      return send({indices: []});'),
    ('the button keeps its old words', T,
     "const label=n?`⛨ Send ${n}`:'⊘ No blocks';",
     "const label='Send blockers';"),
    ('the accessible name drops the unblocked count', T,
     "; ${open} attacker${open===1?'':'s'} not blocked`;",
     "`;"),
    ('a refusal is not on its row', T,
     "        ${issues.length?`<small class=\"cm-combat-reason\">${e(issues[0])}</small>`:''}</div></li>`;",
     "        </div></li>`;"),
    ('an assigned creature not shown as assigned', T,
     'const state=issues.length?"refused":selected.length?"blocked":mine?"open":"public";',
     'const state=issues.length?"refused":mine?"open":"public";'),
]
