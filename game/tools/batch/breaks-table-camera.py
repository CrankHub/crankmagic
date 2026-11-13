# ROB-97: restore either duplicate or put Camera over the life dial.
SUITES = ['tests/table-camera-layout.mjs', 'tests/table-board.mjs']
# Since 74418ce0 Table has no row bar, and one function (gridSlots) draws it for any number of seats: each break puts
# Camera's own Cards slider on the Table a second time, for the tables of its size alone.
SLIDER = '<label>Cards <input type="range" min="70" max="${CAMERA_MAX}" value="${camera.cards}" data-stage-camera="cards" aria-label="Tabletop card size"></label>'
BREAKS = [
    ('four-seat Table restores its duplicate slider', 'crankmagic-board.js',
     '${active === null ? "" : fan(active)}${slots}</div>`;',
     '${active === null ? "" : fan(active)}${slots}${ps.length > 2 ? `' + SLIDER + '` : ""}</div>`;'),
    ('two-seat Table restores its duplicate slider', 'crankmagic-board.js',
     '${active === null ? "" : fan(active)}${slots}</div>`;',
     '${active === null ? "" : fan(active)}${slots}${ps.length === 2 ? `' + SLIDER + '` : ""}</div>`;'),
    ('Camera covers the life dial', 'crankmagic-stage.css',
     '.cm-board[data-shell="shared"]>.cm-stage-camera{position:fixed;top:68px}',
     '.cm-board[data-shell="shared"]>.cm-stage-camera{position:fixed;top:30%;right:40%}'),
    ('Camera scrolls behind the header', 'crankmagic-stage.css',
     '.cm-board[data-shell="shared"]>.cm-stage-camera{position:fixed;top:68px}',
     '.cm-board[data-shell="shared"]>.cm-stage-camera{position:absolute;top:68px}'),
]
