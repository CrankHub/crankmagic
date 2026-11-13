# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
"""The Play board's first pass on the Replit concept (Rob, 2026-10-12): the seven steps in the strip, Full screen as the
table from your chair with its 3D switch, the right pane docked with Turn Resources, the hover card no taller than the
mat, the callouts. crankmagic-board.js and crankmagic.css, held by the board's browser suite.
ROB-99 replaces the docked panel with shared overlay drawers. Its former dock-width/layout
breaks are replaced by drawer geometry and remembered-width breaks in breaks-play-shared-shell.py.

Codex rebuilt Full screen on the tabletop (#734; docs/ACTIVE.md, Play tabletop preview): always 3D, with no switch, its
depth the Camera's tilt, every other seat across the back. "3D never on the board" now breaks the tilt the board hands
the stage, which tests/table-tabletop.mjs holds. The other three breaks on Full screen went with the code they anchored
on (2026-10-17): "the ground is felt, not the mat" (the ground is now the Camera's Table and Background, not the big
board's mat), "one other seat put at the left, not the back" (no seat is placed by count any more) and "3D forgotten"
(the switch is gone; its successor is the tilt kept as cm-board-tilt-v2).

"the hover card taller than the mat" went the same way (ROB-236): 4f1ad43c (Table: no center dial ...; a minimum board
size) made the flat stage's boards small by design, and tests/table-board.mjs now holds the hover card to its normal
size within the window instead ("was: no taller than the mat"); nothing sets --peek-max on a layout that is drawn.

Browser suites: run with GEOMETRY_REQUIRED=1, from the repository root, with nothing else editing the worktree:

    GEOMETRY_REQUIRED=1 python3 game/tools/batch/breaks.py game/tools/batch/breaks-play-ui.py

The reading of the callouts, the lobby and Settings are in breaks-play-ui-rest.py, whose suites are quicker.
"""
SUITES = ['tests/table-board.mjs', 'tests/table-tabletop.mjs']
BREAKS = [
    ('the strip shows the step alone, not the seven', 'crankmagic-board.js',
     '<span class="cm-board-tools cm-board-turnsteps">${turnRibbon()}${stepsOpen ? stepsMenu() : ""}</span>',
     '<span class="cm-board-step">${e(stepInfo().step)}</span>'),
    ('no step lit in the ribbon', 'crankmagic-board.js',
     '      ? `<li class="is-now cm-board-step" title=',
     '      ? `<li class="cm-board-step" title='),
    ('no Resources module', 'crankmagic-board.js',
     '["resources", "Resources"], ', ''),
    ('every land counted as untapped', 'crankmagic-board.js',
     '<b>${r.up}/${r.all}</b>',
     '<b>${r.all}/${r.all}</b>'),
    ('3D never on the board', 'crankmagic-board.js',
     'tilt: cameraTilt(), zoom: camera.zoom,',
     'tilt: 0, zoom: camera.zoom,'),
    ('no layer for the callouts', 'crankmagic-board.js',
     '<div class="cm-board-callouts" id="cm-board-callouts" aria-hidden="true"></div>',
     ''),
]
