# Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.
SUITES = ['tests/board-account-keyboard.mjs','tests/board-seat-lifecycle.mjs','tests/board-coach-context.mjs','tests/board-r4-views.mjs']
# The board's keydown handler asks twice whether the account menu is open: where the hotkeys begin (4ea73ead) and, since
# 0cae5802, again at its top, before the required popup's keys. Either one alone holds the hotkeys back, so the break
# takes both out: the anchor is the first, what lies between them, and the second.
ACCOUNT = "    if(C.accountMenuOpen?.() || document.querySelector('#cm-user-menu:popover-open'))return;\n"
POPUP_KEYS = (
 "    const popup=document.querySelector('.cm-required-popup');\n"
 "    if(popup && !inspection && !coach.open && !cameraOpen && !historyOpen && !profileOpen && !tableMenuOpen && !menuOpen && !tools && !document.querySelector('#cm-card-menu,#cm-dialog[open]')){\n"
 "      if(event.key==='Escape'){event.preventDefault();actions['board-flow-cancel']();return;}\n"
 "      if(event.key==='Tab'){\n"
 "        const controls=[...popup.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex=\"0\"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(el.matches('summary')||!el.closest('details:not([open])'));});\n"
 "        const at=controls.indexOf(document.activeElement),next=event.shiftKey?at-1:at+1;\n"
 "        if(at<0 || next<0 || next>=controls.length){event.preventDefault();controls[event.shiftKey?controls.length-1:0]?.focus();}\n"
 "      }\n"
 "      return;\n"
 "    }\n"
 "    if(document.getElementById('cm-card-menu'))return;\n"
)
BREAKS = [
 ('account menu permits board hotkeys', 'crankmagic-board.js', ACCOUNT + POPUP_KEYS + ACCOUNT, POPUP_KEYS),
 ('seat lifecycle disappears', 'crankmagic-board.js', "if(departed(i) || p.health.status==='lost' || away.get(i))return flag;", 'if(false)return flag;'),
 ('Coach accepts a stale account/table/match reply', 'crankmagic-board.js', 'if(JSON.stringify([coachKey(),view?.matchId])!==requestKey)', 'if(false)'),
 ('Coach ignores availability', 'crankmagic-board.js', 'available:coachGate.available,thread:', 'available:true,thread:'),
 ('Coach rebuilds actual textarea', 'crankmagic-board.js', 'replacement.replaceWith(input);', 'replacement.value=input.value;'),
 ('Settings Coach handoff runs before dialog restoration', 'crankmagic-board.js', 'if(leaving&&!leaving.closed)leaving.afterClose=arm;else arm();', 'arm();'),
 ('same-control pointer intent leaves late Coach focus armed', 'crankmagic-board.js', "if(coachFocusRequest?.armed&&!event.target.closest?.('#cm-board-coach'))coachFocusRequest=null;", ''),
]
