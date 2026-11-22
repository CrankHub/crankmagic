"""ROB-99: shared controls keep readable ink and preserve choice highlights.
Run with GEOMETRY_REQUIRED=1 A11Y_FAIL_FAST=1; the baseline must pass first.

"closed previews mark every played card selected" went with the code it anchored on (ROB-236): since f407c890 (r4 C1:
native card activation) a press on a card opens its menu and selects nothing, so no card on the board is ever marked
selected and there is no closed-preview guard left to break.
"""
SUITES = ['tests/a11y-board.mjs']
BREAKS = [
    ('the shared header uses light-theme ink on its dark ground', 'crankmagic-stage.css',
     '.cm-stage-top{color:#edf6ef}', '.cm-stage-top{color:var(--v-ink)}'),
    ('History inherits the dark profile ink on its light panel', 'crankmagic-stage.css',
     '.cm-profile-menu .cm-board-menu{color:var(--v-ink)}', ''),
    ('Camera view buttons inherit unreadable theme ink', 'crankmagic-stage.css',
     '#matrix-v2 .cm-stage-camera .cm-board-views .v-button{height:38px;color:#edf6ef;background:#1c302e}',
     '#matrix-v2 .cm-stage-camera .cm-board-views .v-button{height:38px;background:#1c302e}'),
    ('Camera slider rows collapse around their output', 'crankmagic-stage.css',
     'gap:4px;height:auto;padding:6px 8px;border-radius:6px',
     'gap:4px;height:22px;padding:6px 8px;border-radius:6px'),
]
