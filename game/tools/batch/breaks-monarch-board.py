# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""ROB-289: the monarch on the board -- a crown on the monarch's name wherever the board names a seat, moved by the view,
called out once (source -> the new monarch), gone with no monarch, taking no room. tests/board-monarch.mjs.

    python -u game/tools/batch/breaks.py game/tools/batch/breaks-monarch-board.py
"""
SUITES = ['tests/board-monarch.mjs']
T = 'crankmagic-board.js'
S = 'crankmagic-stage.css'
BREAKS = [
    ('no crown at all', T,
     'const monarchMark = (p) => isMonarch(p) ?',
     'const monarchMark = (p) => false ?'),
    ('the crown on the wrong seat', T,
     'const isMonarch = (p) => !!p && p.monarch === true;',
     'const isMonarch = (p) => !!p && p.playerId === 1;'),
    ('the crown kept after the key is gone', T,
     'const isMonarch = (p) => !!p && p.monarch === true;',
     'const isMonarch = (p) => !!p && (p.monarch === true || p.playerId === 1);'),
    ('an empty crown kept on every other seat', T,
     'role="img" aria-label="the monarch" title="The monarch: ${MONARCH_LINE}">♛</span>` : "";',
     'role="img" aria-label="the monarch" title="The monarch: ${MONARCH_LINE}">♛</span>` : `<span class="cm-monarch"></span>`;'),
    ('no accessible name', T,
     '<span class="cm-monarch" role="img" aria-label="the monarch" title=',
     '<span class="cm-monarch" title='),
    ('no line on hover', T,
     'title="The monarch: ${MONARCH_LINE}">♛</span>',
     '>♛</span>'),
    ('the crown not on the seat header', T,
     '<strong class="cm-mat-name">${monarchMark(p)}${e(label)}</strong>',
     '<strong class="cm-mat-name">${e(label)}</strong>'),
    ('the crown not on a board\'s name', T,
     '${monarchMark(p)}${e(seatLabel(p))}</span>`;',
     '${e(seatLabel(p))}</span>`;'),
    ('the 3D seat button does not say the monarch', T,
     '${isMonarch(p) ? ", the monarch" : ""}',
     ''),
    ('the change not called out', T,
     'if (crownNow !== null && crownNow !== crownWas) out.push(',
     'if (false) out.push('),
    ('the callout without its source', T,
     'line: crownWas === null ? who(crownNow) : `${who(crownWas)} ⤳ ${who(crownNow)}`});',
     'line: who(crownNow)});'),
    ('a view that keeps the monarch called out again', T,
     'if (crownNow !== null && crownNow !== crownWas) out.push(',
     'if (crownNow !== null) out.push('),
    ('a press on the crown says nothing', T,
     '    callouts([{tone: "value", glyph: "crown", word: "MONARCH", line: MONARCH_LINE}]);\n',
     ''),
    ('the crown on a row of its own in a seat name', S,
     '#matrix-v2 .cm-board .cm-mat-name:has(>.cm-monarch){display:block}',
     ''),
]
