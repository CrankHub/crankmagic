/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* A LIBRARY'S REVEALED TOP CARD, ON THE BOARD (ROB-227, Rob's playtest 2026-10-29: Conspicuous Snoop "does not show the top library
 * card face up or let him interact with successive top cards as playable cards").
 *
 * The room's view carries a library's top card to every seat that may see it (game/engine/projection.mjs: Snoop's "play with the
 * top card of your library revealed" shows it to everyone). The board drew the Library pile face down whatever the view said.
 * Now, in Table, Focus and 3D:
 *   - Rob's library under Snoop shows Raging Goblin face up, to Rob and to Maya; pressing it opens its card menu with the cast,
 *     tapped for (#1013, ROB-226), and the cast sends the room's own option;
 *   - a library nobody may see stays face down: no name, no picture;
 *   - while Rob's draw waits (the held draw), the pile is still the draw, the revealed card on its face, and pressing it draws.
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
const {browser,base,stub,close}=await openBrowser({name:'board-library-top',flag:'GEOMETRY_REQUIRED'});
const catalog=loadCardIndex();
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const TABLE={pooledTaps:true,xTaps:true,phyrexianTaps:true,permittedTaps:true};
/* Rob (seat 0) with Conspicuous Snoop and a Mountain; Raging Goblin on top of his library. Maya's library is unseen. */
const game=()=>runScenario({name:'Snoop on the board',...TABLE,library:['Raging Goblin','Mountain','Mountain'],
 setup:[{seat:0,zone:'battlefield',cards:['Conspicuous Snoop','Mountain']}],steps:[]},catalog.definition,{}).state;
function viewed(state,seat,revision=1){
 const v=structuredClone(sample);v.revision=revision;v.seat=seat;v.seatId=seat;v.state=projectFor(state,seat);v.status='playing';
 const actions=legalActions(state,seat);
 const choice={id:`priority:${revision}`,kind:'priority',mode:'one',min:1,max:1,options:actions.map((a,index)=>({index,label:a.label || a.kind,cardId:a.objectId,act:a.kind}))};
 v.decision=seat===0?describeDecision(state,choice,actions,v.state):null;return {v,actions};
}
async function open(v,mode,width,height){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.addInitScript(mode=>{localStorage.setItem('cm-board-view',mode);localStorage.setItem('crankmagic-audio-muted','true');},mode);
 const page=await context.newPage();page.setDefaultTimeout(15000);if(stub)await stub(page);
 const errors=[],sent=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));
 await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'rob@example.com'}}));
 await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
 const table={tableId:'top01',phase:'playing',matchId:v.matchId,away:[],blockers:[],youAreHost:true,rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:'human',you:p.playerId===v.seat,occupied:true,ready:true,mat:'felt'}))};
 await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
 await page.routeWebSocket(/\/api\/tables\/top01\/connect$/,s=>{s.onMessage(m=>sent.push(JSON.parse(m)));s.send(JSON.stringify({type:'view',view:v}));});
 await page.goto(`${base}/index.html#table?id=top01`);await page.locator('#cm-board').waitFor();
 return {page,context,errors,sent};
}
const shot=async(page,name)=>{if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.mouse.move(3,3);await page.screenshot({path:path.join(process.env.UAT_SHOTS,name+'.png')});}};
/* A seat's Library pile on the board, on its own mat (data-seat), as shown. */
const libraryOf=(page,seat)=>page.locator(`.cm-mat[data-seat="${seat}"] .cm-board-pile[data-zone=library] >> visible=true`).first();
try{
 const state=game(),goblin=state.zones.library[0][0];
 ok(state.objects[goblin].card==='Raging Goblin','Raging Goblin is on top of Rob\'s library');
 for(const [mode,width,height] of [['table',1440,900],['focus',1440,900],['full',1440,900]]){
  const {v}=viewed(state,0);
  const names=v.state.players.map(p=>p.name);
  const {page,context,errors,sent}=await open(v,mode,width,height);
  const mine=libraryOf(page,0);await mine.waitFor();
  eq(await mine.locator('.cm-bcard[data-card]').count(),1,`${mode}: Rob's library shows its revealed top card as a card, not a face-down pile`);
  eq(await mine.locator('.cm-bcard[data-card]').getAttribute('data-card'),String(goblin),`${mode}: and it is Raging Goblin`);
  /* Face up: not a back, and named (the picture itself is the card art, which this suite does not serve). */
  const top=mine.locator('.cm-bcard[data-card]');
  ok(!/\bis-back\b/.test(await top.getAttribute('class')) && /Raging Goblin/.test(await top.evaluate(el=>el.outerHTML)),`${mode}: face up, named Raging Goblin`);
  const theirs=libraryOf(page,1);
  eq([await theirs.locator('.cm-bcard[data-card]').count(),await theirs.locator('.cm-bcard.is-back').count(),/Raging Goblin|Mountain/.test(await theirs.evaluate(el=>el.outerHTML))],[0,1,false],`${mode}: Maya's unseen library stays face down, nothing named`);
  await shot(page,`library-top-${mode}`);
  if(mode!=='full'){
   await mine.locator('.cm-bcard[data-card]').click();await page.locator('#cm-card-menu').waitFor();
   const rows=await page.$$eval('#cm-card-menu [data-action=board-card-menu-do]',rs=>rs.map(r=>r.getAttribute('aria-label')||r.textContent));
   ok(rows.some(r=>/Cast/i.test(r)),`${mode}: pressing it offers the cast (${rows.join(' | ')})`);
   await page.locator('#cm-card-menu [data-action=board-card-menu-do]').first().click();await page.waitForTimeout(60);
   const cast=v.decision.options.find(o=>o.act==='cast'&&o.cardId===goblin);
   ok(sent.some(s=>s.type==='act'&&JSON.stringify(s.indices)===JSON.stringify([cast.index]))||await page.locator('.cm-required-popup').count()>0,`${mode}: and casting sends the room's own option, or asks the rest first`);
  }
  eq(errors,[],`${mode}: no browser errors`);
  await context.close();
 }
 /* Maya sees it too: Snoop reveals it to everyone. */
 {
  const {v}=viewed(state,1);
  const {page,context,errors}=await open(v,'table',1440,900);
  const robs=libraryOf(page,0);await robs.waitFor();
  eq(await robs.locator('.cm-bcard[data-card]').getAttribute('data-card'),String(goblin),'Maya sees Rob\'s revealed top card too');
  eq(errors,[],'no browser errors');await context.close();
 }
 /* The held draw: the pile is still the draw, the revealed card on its face. */
 {
  const {v}=viewed(state,0);v.decision={id:'draw:1',kind:'draw',title:'Draw a card',mode:'one',min:1,max:1,options:[{index:4,label:'Draw a card'}]};
  const {page,context,sent,errors}=await open(v,'table',1440,900);
  const pile=libraryOf(page,0);await pile.waitFor();
  const draw=pile.locator('button[data-action=board-draw]');
  eq(await draw.count(),1,'while the draw waits, the library is still the draw');
  ok(/Raging Goblin on top/.test(await draw.getAttribute('aria-label')) && !/\bis-back\b/.test(await draw.getAttribute('class')),'with the revealed card on its face, and said');
  await draw.click();await page.waitForTimeout(60);
  eq(sent.filter(s=>s.type==='act').map(s=>s.indices),[[4]],'pressing it draws');
  await shot(page,'library-top-held-draw');
  eq(errors,[],'no browser errors');await context.close();
 }
}finally{await close();}
console.log(`board-library-top: ${checks} checks passed — a library's revealed top card on the board (ROB-227, Conspicuous Snoop): face up in Table, Focus and 3D, to its owner and an opponent, pressed for its cast; an unseen library face down; the held draw still draws, the card on its face.`);
