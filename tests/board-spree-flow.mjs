/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* A SPREE CARD, ONE STEP AT A TIME (ROB-209; Luke's playtest of 2026-10-28, change log UX-02: "Getaway showed every mode and
 * target at once and was unusable", with Arena's way named: the modes, then the targets, then the payment).
 *
 * Getaway Glamer is offered as 24 casts -- each count of modes, each mode, each target, each way to pay. The room gives every
 * cast its decision path (game/room/decision-path.mjs) and the board's choice flow walks it one layer at a time
 * (crankmagic-choice-flow.js). Through the real board, at 1440x900 and on a 390x844 phone:
 *   - the first question is how many modes, two answers, never a list of the 24;
 *   - then which modes, then each mode's target, one layer at a time, no mana among them;
 *   - Confirm sends exactly one of the room's own options, the one whose every step was picked;
 *   - Back steps back a layer, and Cancel sends nothing.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {openBrowser,ROOT} from './uat/browser-runner.mjs';
import {loadCardIndex} from '../game/tools/engine-cards.mjs';
import {runScenario} from '../game/engine/cards/scenario.mjs';
import {legalActions} from '../game/engine/rules/actions.mjs';
import {describeDecision} from '../game/room/decision.mjs';
import {projectFor} from '../game/engine/projection.mjs';
const {browser,base,stub,close}=await openBrowser({name:'board-spree-flow',flag:'GEOMETRY_REQUIRED'});
const catalog=loadCardIndex();
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const GG='Getaway Glamer';
const FIX={Bear:{types:['Creature'],manaCost:'{1}{G}',colors:['G'],power:2,toughness:2}};
const state=runScenario({name:'spree on the board',pooledTaps:true,xTaps:true,phyrexianTaps:true,library:['Wastes'],
 setup:[{seat:0,zone:'battlefield',cards:['Plains','Plains','Plains','Plains','Plains','Bear']},{seat:0,zone:'hand',cards:[GG]},{seat:1,zone:'battlefield',cards:['Bear','Bear']}],steps:[]},catalog.definition,FIX).state;
const actions=legalActions(state,0);
const v=structuredClone(sample);v.revision=1;v.seat=0;v.seatId=0;v.state=projectFor(state,0);v.status='playing';
v.decision=describeDecision(state,{id:'priority:1',kind:'priority',mode:'one',min:1,max:1,options:actions.map((a,index)=>({index,label:a.label||a.kind,cardId:a.objectId,act:a.kind}))},actions,v.state);
const casts=v.decision.options.filter(o=>o.act==='cast'&&o.label===GG);
const gg=casts[0].cardId;
ok(casts.length>=12,`Getaway Glamer is offered as ${casts.length} casts: every count, mode, target and way`);
async function open(width,height){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.addInitScript(()=>{localStorage.setItem('cm-board-view','table');localStorage.setItem('crankmagic-audio-muted','true');});
 const page=await context.newPage();page.setDefaultTimeout(15000);if(stub)await stub(page);
 const errors=[],sent=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'rob@example.com'}}));
 await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
 const table={tableId:'spree01',phase:'playing',matchId:v.matchId,away:[],blockers:[],youAreHost:true,rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:'human',you:p.playerId===0,occupied:true,ready:true,mat:'felt'}))};
 await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
 await page.routeWebSocket(/\/api\/tables\/spree01\/connect$/,s=>{s.onMessage(m=>sent.push(JSON.parse(m)));s.send(JSON.stringify({type:'view',view:v}));});
 await page.goto(`${base}/index.html#table?id=spree01`);await page.locator('#cm-board').waitFor();
 return {page,context,errors,sent};
}
const layer=async page=>(await page.locator('.cm-required-popup [data-action=board-flow-choice]').allTextContents()).map(t=>t.trim());
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const {page,context,errors,sent}=await open(width,height);
  if(width<500){const rail=page.locator('[data-action=board-stage-rail][aria-expanded=false]');if(await rail.count())await rail.click();}
  await page.locator(`[data-action=board-choose][data-card="${gg}"]`).first().click();
  let shown=await layer(page);
  eq(shown.length,2,`${width}: the first question is how many modes: two answers, not ${casts.length} casts (${shown.join(' | ')})`);
  ok(shown.every(t=>/1|2|one|two/i.test(t))&&!shown.some(t=>/Plains|Bear/.test(t)),`${width}: and it is the count, no target or mana in it`);
  await page.locator('.cm-required-popup [data-action=board-flow-choice]').filter({hasText:/2|two/i}).first().click();
  /* Choose 2: both modes, then each mode's target, one layer at a time, no mana shown while targeting. */
  const seen=[];
  for(let n=0;n<8&&!(await page.locator('[data-action=board-flow-confirm]').count());n+=1){
   shown=await layer(page);seen.push(shown);
   ok(shown.length>0&&!shown.some(t=>/\{W\}|Plains/.test(t)),`${width}: step ${n+1} is one layer, no mana in it (${shown.join(' | ')})`);
   await page.locator('.cm-required-popup [data-action=board-flow-choice]').first().click();
  }
  ok(seen.length>=2,`${width}: the modes' targets came one layer at a time (${seen.length} layers)`);
  eq(sent.filter(s=>s.type==='act').length,0,`${width}: nothing is sent before Confirm`);
  /* Back steps back a layer; then forward again. */
  if(await page.locator('[data-action=board-flow-back]').count()){
   await page.locator('[data-action=board-flow-back]').click();
   ok(!(await page.locator('[data-action=board-flow-confirm]').count())&&(await layer(page)).length>0,`${width}: Back steps back a layer`);
   await page.locator('.cm-required-popup [data-action=board-flow-choice]').first().click();
  }
  await page.locator('[data-action=board-flow-confirm]').click();await page.waitForTimeout(60);
  const acts=sent.filter(s=>s.type==='act');
  eq(acts.length,1,`${width}: Confirm sends one action`);
  const picked=v.decision.options.find(o=>o.index===acts[0].indices[0]);
  ok(picked&&picked.act==='cast'&&picked.label===GG&&picked.decisionPath.find(n=>n.key==='mode-count').value===2,`${width}: the room's own option, a two-mode Getaway Glamer`);
  eq(errors,[],`${width}: no browser errors`);
  await context.close();
 }
 /* Cancel sends nothing. */
 {
  const {page,context,sent}=await open(1440,900);
  await page.locator(`[data-action=board-choose][data-card="${gg}"]`).first().click();
  await page.locator('[data-action=board-flow-cancel]').click();
  eq(sent.filter(s=>s.type==='act').length,0,'Cancel sends nothing');
  await context.close();
 }
}finally{await close();}
console.log(`board-spree-flow: ${checks} checks passed — Getaway Glamer, ${casts.length} casts, stepped through the board: how many modes, then which, then each mode's target, one layer at a time and no mana among them; Confirm sends the room's one option, Back steps back, Cancel sends nothing (ROB-209).`);
