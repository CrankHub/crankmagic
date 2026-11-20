/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* THE CHOICE POP-UP WHEN A PICTURE DOES NOT COME (ROB-341).
 *
 * The pop-up's large source art (`.cm-flow-card`) and its option thumbnails (`.cm-flow-thumb`) showed the browser's broken-image
 * icon when a card's picture failed -- Scryfall slow or down, or a card it does not have. On the board such a card is a named
 * placeholder. Now the pop-up does the same: with every card picture refused, Getaway Glamer's pop-up shows its name on a
 * card-shaped tile, and each target's thumbnail is the target's name, at 1440x900 and on a phone; nothing is a broken image.
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
const {browser,base,stub,close}=await openBrowser({name:'board-flow-art',flag:'GEOMETRY_REQUIRED'});
const catalog=loadCardIndex();
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const GG='Getaway Glamer';
const FIX={Bear:{types:['Creature'],manaCost:'{1}{G}',colors:['G'],power:2,toughness:2}};
const state=runScenario({name:'flow art',pooledTaps:true,library:['Wastes'],
 setup:[{seat:0,zone:'battlefield',cards:['Plains','Plains','Plains','Plains','Plains']},{seat:0,zone:'hand',cards:[GG]},{seat:1,zone:'battlefield',cards:['Bear']}],steps:[]},catalog.definition,FIX).state;
const actions=legalActions(state,0);
const v=structuredClone(sample);v.revision=1;v.seat=0;v.seatId=0;v.state=projectFor(state,0);v.status='playing';
v.decision=describeDecision(state,{id:'priority:1',kind:'priority',mode:'one',min:1,max:1,options:actions.map((a,index)=>({index,label:a.label||a.kind,cardId:a.objectId,act:a.kind}))},actions,v.state);
const gg=v.decision.options.find(o=>o.act==='cast'&&o.label===GG).cardId;
const shot=async(page,name)=>{if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UAT_SHOTS,name+'.png')});}};
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addInitScript(()=>{localStorage.setItem('cm-board-view','table');localStorage.setItem('crankmagic-audio-muted','true');});
  const page=await context.newPage();page.setDefaultTimeout(15000);if(stub)await stub(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  /* Every card picture refused, as when Scryfall is down. */
  await page.route(/scryfall\.(com|io)/,r=>r.fulfill({status:404,body:''}));
  await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));
  await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'rob@example.com'}}));
  await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
  const table={tableId:'art01',phase:'playing',matchId:v.matchId,away:[],blockers:[],youAreHost:true,rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:'human',you:p.playerId===0,occupied:true,ready:true,mat:'felt'}))};
  await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
  await page.routeWebSocket(/\/api\/tables\/art01\/connect$/,s=>{s.send(JSON.stringify({type:'view',view:v}));});
  await page.goto(`${base}/index.html#table?id=art01`);await page.locator('#cm-board').waitFor();
  if(width<500){const rail=page.locator('[data-action=board-stage-rail][aria-expanded=false]');if(await rail.count())await rail.click();}
  await page.locator(`[data-action=board-choose][data-card="${gg}"]`).first().click();
  const big=page.locator('.cm-choice-flow .cm-flow-card.is-artless');
  await big.waitFor();
  eq([await big.getAttribute('aria-label'),await big.getAttribute('data-name'),await big.evaluate(el=>getComputedStyle(el,'::after').content)],[GG,GG,JSON.stringify(GG)],`${width}: the source art is a tile with the card's name, not a broken image`);
  /* Through to a target layer: each target's thumbnail. */
  for(let n=0;n<4&&!(await page.locator('.cm-choice-flow .cm-flow-thumb').count());n+=1)await page.locator('.cm-required-popup [data-action=board-flow-choice]').first().click();
  await page.locator('.cm-choice-flow .cm-flow-thumb.is-artless').first().waitFor();
  ok((await page.$$eval('.cm-choice-flow .cm-flow-thumb.is-artless',ts=>ts.map(t=>t.dataset.name))).some(t=>/Bear/.test(t)),`${width}: a target's thumbnail is its name`);
  /* Drawn, not added: the option's own words are what they were (board-r4-decisions, board-target-lands read them). */
  ok((await page.locator('.cm-required-popup [data-action=board-flow-choice]').allInnerTexts()).every(t=>!/^s*(Bear|Plains)s*(Bear|Plains)/.test(t)),`${width}: and the option's words do not repeat the name`);
  const broken=await page.$$eval('.cm-choice-flow img',imgs=>imgs.filter(i=>i.complete&&i.naturalWidth===0).length);
  eq(broken,0,`${width}: no broken image left in the pop-up`);
  await shot(page,`flow-art-${width}`);
  eq(errors,[],`${width}: no browser errors`);
  await context.close();
 }
}finally{await close();}
console.log(`board-flow-art: ${checks} checks passed — with every card picture refused, the choice pop-up's source art and target thumbnails are card-shaped tiles with their names, never a broken image, at 1440 and on a phone (ROB-341).`);
