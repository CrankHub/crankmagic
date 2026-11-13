# ROB-99: each regression must be caught by the real browser shell walk.
SUITES = ['tests/table-shared-shell.mjs']
BREAKS = [
    # Since 74418ce0 Table, Focus and Full screen are one view (stageView): one header, with Camera in it.
    ('Table loses the shared header', 'crankmagic-board.js',
     'return `${boardHeader()}\n      <div class="cm-full-mine cm-stage-region"',
     'return `${mode === "table" ? "" : boardHeader()}\n      <div class="cm-full-mine cm-stage-region"'),
    ('Focus loses Camera', 'crankmagic-board.js',
     '${cameraMenu()}${stageProfile(me)}', '${mode === "focus" ? "" : cameraMenu()}${stageProfile(me)}'),
    ('Tilt leaks outside Full', 'crankmagic-board.js',
     '${stageEnabled() ? `<label>Tilt ', '${true ? `<label>Tilt '),
    ('closed drawers lose focus isolation on redraw', 'crankmagic-board.js',
     '!!fan || (el.matches(".cm-stage-rail, .cm-stage-side") && !el.classList.contains("is-open"))', '!!fan'),
    ('drawer width is forgotten', 'crankmagic-board.js',
     '    keep(PANELW_KEY, w);\n', ''),
    ('nested profile menus run offscreen', 'crankmagic-stage.css',
     '.cm-profile-menu .cm-board-menu{left:auto;right:0;', '.cm-profile-menu .cm-board-menu{left:0;right:auto;'),
    ('Escape closes the background before the hand', 'crankmagic-board.js',
     '    if (event.key === "Escape" && showing) {', '    if (false) {'),
]
