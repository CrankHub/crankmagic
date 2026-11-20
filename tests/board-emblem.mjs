/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* AN EMBLEM ON THE BOARD (ROB-192: Elspeth, Sun's Champion's −7 left nothing to see -- "two lasting effects with no emblem
 * object, so the board shows none").
 *
 * Elspeth's −7 now makes an emblem (CR 114), an object in her controller's command zone with its two abilities, which the
 * view carries with its text. The board draws it as a tile -- the word Emblem and what it does -- with no picture to fail:
 *   - Rob's command zone shows "Elspeth, Sun's Champion emblem" and reads "Creatures you control get +2/+2 and have flying."
 *     once, in Table and Focus, to Rob and to Maya;
 *   - it is no broken image and no card button.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {openBrowser,ROOT} from './uat/browser-runner.mjs';
import {loadCardIndex} from '../game/tools/engine-cards.mjs';
import {runScenario} from '../game/engine/cards/scenario.mjs';
import {legalActions} from '../game/engine/rules/actions.mjs';
import {describeDecision} from '../game/room/decision.mjs';
import {projectFor} from '../game/engine/projection.mjs';
const {browser,base,stub,close}=await openBrowser({name:'board-emblem',flag:'GEOMETRY_REQUIRED'});
const catalog=loadCardIndex();
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const scenarios=JSON.parse(readFileSync(path.join(ROOT,'game/engine/cards/e/elspeth-suns-champion.scenarios.json'),'utf8'));
const seventh=scenarios.scenarios[2];
const state=runScenario({...seventh,steps:seventh.steps.filter(s=>!s.expect)},catalog.definition,scenarios.fixtures).state;
const TEXT='Creatures you control get +2/+2 and have flying.';
function viewed(seat){
 const v=structuredClone(sample);v.revision=1;v.seat=seat;v.seatId=seat;v.state=projectFor(state,seat);v.status='playing';
 const actions=legalActions(state,seat);
 v.decision=seat===state.priorityPlayer?describeDecision(state,{id:'priority:1',kind:'priority',mode:'one',min:1,max:1,options:actions.map((a,index)=>({index,label:a.label||a.kind,cardId:a.objectId,act:a.kind}))},actions,v.state):null;
 return v;
}
async function open(v,mode){
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.addInitScript(mode=>{localStorage.setItem('cm-board-view',mode);localStorage.setItem('crankmagic-audio-muted','true');},mode);
 const page=await context.newPage();page.setDefaultTimeout(15000);if(stub)await stub(page);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'rob@example.com'}}));
 await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
 const table={tableId:'emblem01',phase:'playing',matchId:v.matchId,away:[],blockers:[],youAreHost:true,rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:'human',you:p.playerId===v.seat,occupied:true,ready:true,mat:'felt'}))};
 await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
 await page.routeWebSocket(/\/api\/tables\/emblem01\/connect$/,s=>{s.send(JSON.stringify({type:'view',view:v}));});
 await page.goto(`${base}/index.html#table?id=emblem01`);await page.locator('#cm-board').waitFor();
 return {page,context,errors};
}
const shot=async(page,name)=>{if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.mouse.move(3,3);await page.screenshot({path:path.join(process.env.UAT_SHOTS,name+'.png')});}};
try{
 const robs=projectFor(state,0).players[0].zones.Command.cards.find(c=>c.emblem);
 ok(robs&&robs.name==="Elspeth, Sun's Champion emblem"&&robs.text===TEXT,`the view carries the emblem and its text, once (${JSON.stringify(robs?.text)})`);
 for(const [seat,mode] of [[0,'table'],[0,'focus'],[1,'table']]){
  const {page,context,errors}=await open(viewed(seat),mode);
  const tile=page.locator('.cm-mat[data-seat="0"] .cm-board-pile[data-zone=command] .cm-bcard-emblem >> visible=true').first();
  await tile.waitFor();
  eq(await tile.getAttribute('aria-label'),`Elspeth, Sun's Champion emblem: ${TEXT}`,`${mode}, seat ${seat}: Rob's command zone shows the emblem, said whole`);
  ok(/emblem/i.test(await tile.innerText())&&(await tile.innerText()).includes('+2/+2'),`${mode}, seat ${seat}: and it reads Emblem and what it does`);
  eq(await tile.locator('img').count(),0,`${mode}, seat ${seat}: no picture to fail`);
  await shot(page,`emblem-${mode}-seat${seat}`);
  eq(errors,[],`${mode}, seat ${seat}: no browser errors`);
  await context.close();
 }
}finally{await close();}
console.log(`board-emblem: ${checks} checks passed — Elspeth, Sun's Champion's emblem in Rob's command zone, a tile that says what it does, in Table and Focus, to Rob and to Maya (ROB-192).`);
