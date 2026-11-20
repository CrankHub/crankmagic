# r4 D1: a folded choice, a saved HUD value and a destructive confirmation are behavior, not decoration.
SUITES = ['tests/board-r4-shell.mjs']
BREAKS = [
    # Changed on purpose (the stabilization plan of 2026-11-19, G1, ROB-534): folded, the optional priority offer no longer floats.
    ('the folded priority offer floats over the board', 'crankmagic-board.js',
     "${!visible && d && !['draw', 'priority'].includes(d.kind) ? decision() : ''}",
     "${!visible && d && !['draw'].includes(d.kind) ? decision() : ''}"),
    ('HUD release does not persist', 'crankmagic-board.js',
     'keep(HUD_KEY, Math.max(100, Math.min(200, Number(el.value) || 100)));',
     '/* Deliberate break: forget the released HUD value. */'),
    ('concede skips confirmation', 'crankmagic-board.js',
     "if (el?.dataset.confirm !== '1')", "if (false)"),
]
