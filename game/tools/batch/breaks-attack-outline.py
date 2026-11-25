# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""The attack pop-up's marks and its Confirm (ROB-545): each creature marked ✓ safe, ⇄ trade or ☠ dies (⊘ when it kills no blocker)
against the selected target, from the table's untapped creatures or the engine's hints; each header the best mark of the creatures
still free or sent there; Confirm off, with the room's reason, while the attack breaks its min, max or a requirement.
tests/board-attack-risk.mjs.

    python3 game/tools/batch/breaks.py game/tools/batch/breaks-attack-outline.py
"""
SUITES = ['tests/board-attack-risk.mjs']
B = 'crankmagic-board.js'
BREAKS = [
    ('header mark taken from the worst instead of the best', B,
     'at.reduce((a,o)=>OUTLOOK_RANK[o.mark]<OUTLOOK_RANK[a.mark]?o:a)',
     'at.reduce((a,o)=>OUTLOOK_RANK[o.mark]>OUTLOOK_RANK[a.mark]?o:a)'),
    ('header mark counting creatures sent elsewhere', B,
     "const at=d.options.filter(o=>attackKey(o)===key && (!sentCards.has(o.cardId) || chosen.some(c=>c.index===o.index)))",
     "const at=d.options.filter(o=>attackKey(o)===key)"),
    ('the mark computed against tapped creatures', B,
     '(c) => c.types.includes("Creature") && !c.tapped && c.power != null',
     '(c) => c.types.includes("Creature") && c.power != null'),
    ('a flyer blocked by anything', B,
     '\n        && (!kw(a, "flying") || kw(c, "flying") || kw(c, "reach")))\n',
     '\n        && true)\n'),
    ('a trade drawn as a death', B,
     'killers.some((x) => !x.dies) ? "dies" : killers.length ? "trade" : "safe"',
     'killers.length ? "dies" : "safe"'),
    ('deathtouch ignored on the attacker', B,
     '(kw(a, "deathtouch") || a.power >= left(c))',
     '(a.power >= left(c))'),
    ('indestructible ignored', B,
     'kills: !kw(a, "indestructible") && c.power > 0',
     'kills: c.power > 0'),
    ("the engine's hints ignored", B,
     '    if (o.hints) could = ',
     '    if (false) could = '),
    ('weak never said', B,
     'weak: could.length > 0 && !could.some((x) => x.dies)}',
     'weak: false}'),
    ('the limit left off the title', B,
     'title="${e(said)} (${OUTLOOK_LIMIT})"><span aria-hidden="true">${glyph}',
     'title="${e(said)}"><span aria-hidden="true">${glyph}'),
    ('Confirm sending while the least is not met', B,
     '    if(chosen.length<d.min)return `${d.min-chosen.length} more must attack.`;\n',
     ''),
    ('a requirement unread', B,
     '    for(const r of d.requires || [])',
     '    for(const r of [])'),
    ('a stale Confirm sending anyway', B,
     '    if (String(d.id).startsWith("declare-attackers:") && attackProblem(d)) return;\n',
     ''),
    ('the trade mark in the wrong color', 'crankmagic-stage.css',
     '.cm-risk.is-trade{color:var(--color-money)}',
     '.cm-risk.is-trade{color:var(--color-required)}'),
]
