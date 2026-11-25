# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Declaring attackers in one pop-up (ROB-545; Attack all before it, Oct 21): a header per player with "⚔ All", a selected target,
the row of creatures not yet sent; one press sends or brings back, in the row or on the table; a creature at one target at most;
"None" clears; Confirm alone sends. tests/board-attack-all.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-attack-all.py
"""
SUITES = ['tests/board-attack-all.mjs']
B = 'crankmagic-board.js'
BREAKS = [
    ('the attack drawn as the generic many-picker', B,
     "    if(String(d.id).startsWith('declare-attackers:'))return attackDecision(d);\n",
     ''),
    ('All at a planeswalker too', B,
     '.filter((o) => o.defenderId === Number(el.dataset.defender) && o.planeswalkerId === undefined && o.battleId === undefined);',
     '.filter((o) => o.defenderId === Number(el.dataset.defender));'),
    ("All at keeping the creatures' old picks too", B,
     'picked = [...picked.filter((i) => !creatures.has(d.options.find((x) => x.index === i)?.cardId)), ...at.map((o) => o.index)];',
     'picked = [...picked, ...at.map((o) => o.index)];'),
    ('All at sending at once', B,
     '...at.map((o) => o.index)];\n    draw();\n',
     '...at.map((o) => o.index)];\n    send({indices: picked});\n'),
    ('None not clearing', B,
     '    if (!attacking()) return;\n    picked = [];\n',
     '    if (!attacking()) return;\n'),
    ('a creature sent to two targets', B,
     '    picked = [...picked.filter((i) => d.options.find((x) => x.index === i)?.cardId !== cardId), o.index];',
     '    picked = [...picked, o.index];'),
    ('a sent creature never comes back', B,
     '    picked = picked.filter((i) => d.options.find((x) => x.index === i)?.cardId !== cardId);\n    draw();\n  }',
     '    draw();\n  }'),
    ('a creature sent at any target it may attack, not the selected one', B,
     "  const attackOptionFor = (d,cardId,key) => d.options.find(o=>o.cardId===cardId && attackKey(o)===key);",
     "  const attackOptionFor = (d,cardId,key) => d.options.find(o=>o.cardId===cardId);"),
    ('no target selected at first', B,
     "attackUi={choice:d.id,target:first?attackKey(first):null,",
     "attackUi={choice:d.id,target:null,"),
    ('a press on the table opens the card menu instead', B,
     "    if(attacking()?.options.some(o=>o.cardId===id)) {\n",
     "    if(false) {\n"),
    ('a planeswalker merged into its controller', B,
     "  const attackKey = o => `${o.defenderId}:${o.planeswalkerId ?? o.battleId ?? ''}`;",
     "  const attackKey = o => `${o.defenderId}:`;"),
    ('a header that never folds', B,
     '    if (ui.open.has(p)) ui.open.delete(p); else ui.open.add(p);\n',
     ''),
    ('the row wraps instead of scrolling sideways', 'crankmagic-stage.css',
     '.cm-attack-tray{list-style:none;display:flex;gap:6px;',
     '.cm-attack-tray{list-style:none;display:flex;flex-wrap:wrap;gap:6px;'),
]
