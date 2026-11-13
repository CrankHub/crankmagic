# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""Rob's fullscreen notes on the board (Oct 21; crankmagic-board.js, crankmagic-stage.css): a card played by its click in
every view, a land just played taken back by its double-click, the actions large over the table in Full screen, the
others' plays held up for ten seconds, the two priority choices, the tabletop to 200%, the commander tax below the title.
tests/board-fullscreen-notes.mjs.

    GEOMETRY_REQUIRED=1 python3 game/tools/batch/breaks.py game/tools/batch/breaks-board-fullscreen-notes.py
"""
SUITES = ['tests/board-fullscreen-notes.mjs']
B = 'crankmagic-board.js'
C = 'crankmagic-stage.css'
J = 'crankmagic-stage.js'
BREAKS = [
    # r4 C1 (f407c890, 2026-10-26) changed the gestures these four were written for: the first click only reads (it opens
    # the card's menu, sending nothing and waiting on no timer), the double-click is what stages the play, and a land is
    # taken back by its offered Undo drawer. Each break is on that code now, making its label's mistake in today's gesture:
    # the play gesture doing nothing in Full screen; the double-click not read as one; the take-back sending nothing; the
    # single click acting at once.
    ('a click in Full screen only shows the card', B,
     '      return useCard(activeId);\n',
     '      return mode === "full" && !phone() ? undefined : useCard(activeId);\n'),
    ('a double-click playing twice', B,
     '    if(event?.detail>=2) {\n      cardDoubleHandled=true;',
     '    if(event?.detail>=2 && false) {\n      cardDoubleHandled=true;'),
    ('the double-click taking nothing back', B,
     "    if(!el?.dataset || !['undo-play','undo-land'].includes(el.dataset.act))return;\n    bindOffer(el.dataset);\n",
     "    if(!el?.dataset || !['undo-play','undo-land'].includes(el.dataset.act))return;\n"),
    ('the single click not waiting', B,
     '    firstCardClick=origin;\n    openCardMenu(id,el,el,',
     '    firstCardClick=origin;\n    return useCard(id);\n    openCardMenu(id,el,el,'),
    ('the take-back a button under You can also', B,
     'if (o.act === "pass" || o.act === "resolve-all" || o.act === "undo-land") continue;',
     'if (o.act === "pass" || o.act === "resolve-all") continue;'),
    # Every view has the one top strip since 74418ce0 (2026-10-28), and it holds no action at all: the break puts them back.
    ('the actions left in the strip', B,
     '      ${conn}${alsoButton()}',
     '      ${conn}${passButton()}${resolveAllButton()}${skipControl(true)}${alsoButton()}'),
    ('the actions small', C,
     '#matrix-v2 .cm-stage-actions .v-button{min-height:42px;',
     '#matrix-v2 .cm-stage-actions .v-button{min-height:20px;font-size:11px!important;'),
    ('your own plays held up', B,
     '(x.kind === "cast" || x.kind === "land") && x.player !== next.seat && x.card && x.card.name',
     '(x.kind === "cast" || x.kind === "land") && x.card && x.card.name'),
    ('a play shown twice', B,
     '    const fresh = all.filter((x) => !playsSeen.has(playKey(next.matchId, x)));\n',
     '    const fresh = all;\n'),
    ('opponent previews ignore the available gap', B,
     'layer.style.setProperty("--plays-left", `${Math.max(8, Math.round(left))}px`);',
     'layer.style.setProperty("--plays-left", "56px");'),
    ('preview margins cover the drawer before the card needs to', B,
     'gap >= width ? start + (gap - width) / 2',
     'gap >= width + 24 ? start + (gap - width) / 2'),
    # The Boards pane is inside the left drawer now (113c4283, 2026-10-26), whose tab stands at its outer edge, and the
    # flat stage has no mat to stand beside (74418ce0, 2026-10-28), so the measurement reached is the one for a view with
    # no mat. Leaving only the pane out of it changes nothing (the tab is further right); the break leaves out the whole
    # left drawer.
    ('the Boards pane is omitted from the preview gap', B,
     'host.querySelectorAll(".cm-stage-rail.is-open, .cm-board-pane, .cm-stage-left")',
     'host.querySelectorAll(".cm-none")'),
    ('the plays never fading', B,
     '      const run = () => {since = performance.now(); timer = setTimeout(gone, left);};',
     '      const run = () => {since = performance.now();};'),
    ('the checkbox huge again', C,
     '#matrix-v2 .cm-board-hold input[type=checkbox]{flex:none;width:16px;height:16px;',
     '#matrix-v2 .cm-board-hold input[type=checkbox]{flex:none;width:64px;height:64px;'),
    ('Skip not told to the room', B,
     '    keep(SKIP_KEY, event.target.checked ? "on" : "off");\n    prefer();\n',
     '    keep(SKIP_KEY, event.target.checked ? "on" : "off");\n'),
    ('the tabletop held to 150%', B,
     '  const CAMERA_MAX = 200;',
     '  const CAMERA_MAX = 150;'),
    ('the tax over the mana cost', C,
     '.cm-bcard-tax{position:absolute;right:4%;top:13%;',
     '.cm-bcard-tax{position:absolute;right:4%;top:4%;'),
]
