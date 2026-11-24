/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
import assert from 'node:assert/strict';import {readFileSync,mkdirSync} from 'node:fs';import path from 'node:path';import {openBrowser,ROOT} from './uat/browser-runner.mjs';
const {browser,base,stub,close}=await openBrowser({name:'board-r4-combat',flag:'GEOMETRY_REQUIRED'});
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const creature=(id,name,owner,extra={})=>({cardId:id,name,owner,controller:owner,types:['Creature'],faceDown:false,tapped:false,counters:{},power:3,toughness:3,keywords:[],damage:0,...extra});
function fixture(n=2,{exclusive=true}={}){const v=structuredClone(sample);v.revision=7000;v.state.phase='COMBAT_DECLARE_BLOCKERS';v.state.turnId='r4turn';v.state.players[1].name='Keith';
 for(const p of v.state.players)p.zones.Battlefield.cards=[];
 v.state.players[1].zones.Battlefield.cards=Array.from({length:n},(_,i)=>creature(1000+i,i<2?'Savannah Lions':`Attacker ${i+1}`,1,{power:4,toughness:1,keywords:['Haste']}));
 v.state.players[0].zones.Battlefield.cards=[creature(2000,'Grizzly Bears',0),creature(2001,'Grizzly Bears',0),creature(2002,'Wind Drake',0,{power:2,toughness:4,keywords:['Flying']}),creature(2003,'Tapped blocker',0,{tapped:true})];
 v.state.combat={attackingPlayerId:1,defenders:[0],attacks:Array.from({length:n},(_,i)=>({attacker:1000+i,defender:0,blocked:false,blockers:[]}))};
 v.decision={id:'declare-blockers:r4',title:'Declare blockers',mode:'many',min:0,max:3,...(exclusive?{exclusiveBy:'cardId'}:{}),legalBlocks:[{blocker:2000,attackers:[1000,1001]},{blocker:2001,attackers:[1000,1001]},{blocker:2002,attackers:[1001]}],options:[[2000,1000],[2000,1001],[2001,1000],[2001,1001],[2002,1001]].map(([cardId,attackerId],index)=>({index,cardId,attackerId,label:`Block #${attackerId} with #${cardId}`})),blockReasons:[]};return v;}
async function open(mode,width,skin='sapphire-obsidian',v=fixture()){
 const context=await browser.newContext({viewport:{width,height:width<500?844:900},reducedMotion:'reduce',serviceWorkers:'block'});await context.addInitScript(mode=>{localStorage.setItem('cm-board-view',mode);localStorage.setItem('crankmagic-audio-muted','true');(globalThis.CrankFeatures||=[]).push(C=>{globalThis.__r4Commit=c=>C.commit(c);});},mode);
 const page=await context.newPage();if(stub)await stub(page);const frames=[],errors=[];let socket,held=false;
 page.on('pageerror',e=>errors.push(e.message));await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'combat@example.com'}}));await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
 const table={tableId:'r4combat01',phase:'playing',matchId:v.matchId,away:[],blockers:[],youAreHost:true,rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:p.playerId===v.seat?'human':'ai',you:p.playerId===v.seat,occupied:true,ready:true,mat:'felt'}))};
 await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
 const reply=(f,extra={})=>socket.send(JSON.stringify({type:'checked',choiceId:f.choiceId,ok:true,open:true,reasons:[],...extra}));
 await page.routeWebSocket(/\/api\/tables\/r4combat01\/connect$/,s=>{socket=s;s.onMessage(raw=>{const f=JSON.parse(raw);frames.push(f);if(f.type==='check'&&!held)reply(f);});s.send(JSON.stringify({type:'view',view:v}));});
 await page.goto(`${base}/index.html#table?id=r4combat01`);await page.locator('.cm-r4-combat').waitFor();if(skin!=='sapphire-obsidian')await page.evaluate(t=>__r4Commit({type:'preferences',values:{theme:t}}),skin);
 return {page,context,frames,errors,hold:()=>held=true,release:()=>held=false,reply:extra=>reply(frames.filter(f=>f.type==='check').at(-1),extra),emit:f=>socket.send(JSON.stringify(f)),publish:async change=>{change(v);v.revision++;socket.send(JSON.stringify({type:'view',view:v}));await page.waitForTimeout(150);}};
}
const tile=id=>`.cm-combat-tile[data-attacker="${id}"]`,pair=i=>`[data-action=board-block-pair][data-index="${i}"]`,send='[data-action=board-send-blockers]';
const pause=p=>p.waitForTimeout(80);
async function attacker(p,id){const active=await p.locator('.cm-block-draft').getAttribute('data-active-attacker');if(Number(active)!==id){await p.locator(tile(id)).click();await pause(p);eq(Number(await p.locator('.cm-block-draft').getAttribute('data-active-attacker')),id,'one press on an attacker row selects it');if(p.viewportSize().width<500)eq(await p.locator('.cm-required-popup .cm-block-draft').count(),1,'phone attacker stays in the exclusive popup');}}
/* ROB-544: two presses assign a block (the attacker's row, then your creature); there is no per-attacker Confirm. */
async function assign(p,id,index){await attacker(p,id);await p.locator(pair(index)).click();await pause(p);}
const label=async p=>(await p.locator(send).innerText()).trim();
async function hit(p,selector){const e=p.locator(selector);await e.scrollIntoViewIfNeeded();const good=await e.evaluate(el=>{const r=el.getBoundingClientRect();return [[.5,.5],[.2,.2],[.8,.8]].every(([x,y])=>el.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)));});if(!good){console.log(await e.evaluate(el=>{const r=el.getBoundingClientRect();return {box:r.toJSON(),hit:[[.5,.5],[.2,.2],[.8,.8]].map(([x,y])=>document.elementFromPoint(r.x+r.width*x,r.y+r.height*y)?.outerHTML.slice(0,350)),drawer:document.getElementById('cm-actions-drawer')?.getBoundingClientRect().toJSON()};}));if(process.env.UAT_SHOTS)await p.screenshot({path:path.join(process.env.UAT_SHOTS,'r4-combat-hit-failure.png')});}ok(good,`${selector} receives actual pointer`);}
try{
 for(const [mode,width,skin] of [['table',1440,'sapphire-obsidian'],['focus',1440,'sapphire-obsidian-light'],['full',1440,'bronze-basalt'],['focus',390,'sapphire-obsidian']]){
  if(process.env.COMBAT_CASE && process.env.COMBAT_CASE!==`${mode}-${width}`)continue;
  console.log(`combat ${mode}/${width}`);
  const {page,context,frames,errors,emit,publish}=await open(mode,width,skin);await pause(page);
  if(width>=500)ok(await page.locator('#cm-board').evaluate(host=>{const header=host.querySelector('.cm-stage-top');return !header.querySelector('.cm-r4-combat') && !host.hasAttribute('data-combat') && Math.abs(header.offsetHeight-parseFloat(getComputedStyle(host).getPropertyValue('--hud-top')))<8;}),`${mode}: combat lives in popup and does not inflate HUD height`);
  await page.locator(send+':not([disabled])').waitFor();eq(await label(page),'⊘ No blocks',`${mode}: with nothing assigned Send reads No blocks, enabled with every attacker left alone`);
  eq(await page.locator('.cm-r4-combat [data-combat-role=Attacker] .cm-twin-mark').allTextContents(),['a','b'],`${mode}: twin attacker marks`);
  ok(!/#\d+/.test(await page.locator('.cm-r4-combat,.cm-block-draft').allTextContents().then(a=>a.join(' '))),`${mode}: no visible engine numbers`);
  eq(await page.locator('.cm-block-tiles button').count(),2,`${mode}: only legal blockers for selected attacker`);
  await page.locator(pair(0)).click();eq(await page.locator(pair(0)).getAttribute('aria-pressed'),'true',`${mode}: blocker selected`);
  const inverted=await page.locator(pair(0)).evaluate(el=>getComputedStyle(el).backgroundColor===getComputedStyle(el.closest('.cm-block-draft')).color);ok(inverted,`${mode}: chosen blocker inverts to ink`);
  await page.locator(pair(0)).click();eq(await page.locator(pair(0)).getAttribute('aria-pressed'),'false',`${mode}: second click clears`);
  await assign(page,1000,0);ok(await page.locator('.cm-combat-row[data-combat-attacker="1000"]').evaluate(e=>e.classList.contains('is-blocked')),`${mode}: one press on the creature assigns it to the attacker`);ok(await page.locator('.cm-combat-row[data-combat-attacker="1001"]').evaluate(e=>e.classList.contains('is-open')),`${mode}: the other attacker reads not blocked`);
  await page.locator(send+':not([disabled])').waitFor();eq(await label(page),'⛨ Send 1',`${mode}: Send counts the one block, the other attacker left alone`);
  await assign(page,1001,1);ok(await page.locator('.cm-combat-row[data-combat-attacker="1000"]').evaluate(e=>e.classList.contains('is-open')),`${mode}: moving an exclusive blocker takes it off the old attacker`);
  await attacker(page,1000);eq((await page.locator(pair(0)+' .cm-block-elsewhere').innerText()).trim(),'⛨ Savannah Lions b',`${mode}: a tile says which attacker it is already blocking`);
  await page.locator(pair(2)).click();await pause(page);await page.locator(send+':not([disabled])').waitFor();eq(frames.filter(f=>f.type==='act').length,0,`${mode}: assigning stays private`);
  const primary=await page.locator('#cm-board .v-button.primary:not([disabled]),#cm-board .cm-btn--primary:not([disabled])').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>e.textContent.trim()));eq(primary,['⛨ Send 2'],`${mode}: Send is the only enabled primary`);
  if(width>=500 && mode==='table'){await page.locator('.cm-r4-combat [data-combat-light="1000"]').first().hover();ok(await page.locator('.cm-mat .cm-bcard[data-card="1000"]').evaluate(e=>e.classList.contains('is-lit')),'hover lights exact attacker on table');}
  await attacker(page,1001);await attacker(page,1000);eq(await label(page),'⛨ Send 2',`${mode}: moving between attackers clears no block`);
  await page.locator(send).evaluate(el=>el.dataset.revision='6999');await page.locator(send).click();eq(frames.filter(f=>f.type==='act').length,0,`${mode}: stale Send revision cannot bind`);await page.locator(send).evaluate(el=>el.dataset.revision='7000');await hit(page,send);
  if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.mouse.move(3,3);await page.screenshot({path:path.join(process.env.UAT_SHOTS,`r4-combat-${mode}-${width}.png`)});}
  await page.locator(send).click();eq(frames.filter(f=>f.type==='act').map(f=>f.indices),[[1,2]],`${mode}: Send publishes actual pair indexes once`);emit({type:'receipt',receipt:{}});await pause(page);ok(await page.locator(send).isDisabled(),`${mode}: receipt cannot reopen submitted draft`);
  await publish(v=>v.decision.id+=':new');eq(await page.locator('[data-draft-blocker]').count(),0,`${mode}: a fresh decision clears the draft`);eq(errors,[],`${mode}: no page errors`);await context.close();
 }
 {
  const f=await open('table',1440);const {page,context,frames}=f;f.hold();await page.locator(pair(0)).click();await pause(page);f.reply({ok:false,reasons:['Global reason remains visible'],byAttacker:[{attackerId:1000,reasons:['Menace needs another blocker']}]});await pause(page);
  ok(await page.locator(send).isDisabled(),'a refused draft cannot be sent');ok(await page.locator('.cm-combat-row[data-combat-attacker="1000"]').evaluate(e=>e.classList.contains('is-refused')),'attributed refusal marks correct attacker');eq((await page.locator('.cm-combat-row[data-combat-attacker="1000"] .cm-combat-reason').innerText()).trim(),'Menace needs another blocker','the refusal is on its attacker\'s row');ok(!await page.locator('.cm-combat-row[data-combat-attacker="1001"]').evaluate(e=>e.classList.contains('is-refused')),'global reasons do not become facts about another attacker');ok((await page.locator('.cm-block-status').textContent()).includes('Global reason'),'global errors remain available in draft status');
  await page.locator(pair(2)).click();await pause(page);f.reply({ok:true,open:true,reasons:[]});await pause(page);f.release();await page.locator(send+':not([disabled])').waitFor();eq(frames.filter(f=>f.type==='act').length,0,'assigning is still private');await page.locator(send).click();eq(frames.filter(f=>f.type==='act').at(-1).indices,[0,2],'several blockers on one attacker sent together');await context.close();
 }
 {
  /* ROB-544: the blocker pop-up is wide, the attackers a list read top to bottom with long names whole, and nothing in it
     scrolls sideways. Nine attackers, one named with 42 characters: the list scrolls inside the pop-up and Send stays in view,
     measured by hand (elementFromPoint), at 1440x900, 1024x700 and the phone's 390x844, in Table, Focus and 3D. */
  const LONG='Ancient Overgrown Sentinel of the Ironwood';
  for(const [mode,width,height] of [['table',1440,900],['focus',1440,900],['full',1440,900],['table',1024,700],['focus',390,844],['full',390,844]]){
   const v=fixture(9);v.state.players[1].zones.Battlefield.cards[8].name=LONG;
   const {page,context:c2}=await open(mode,width,'sapphire-obsidian',v);await page.setViewportSize({width,height});await pause(page);await page.waitForTimeout(200);
   const where=`${mode} ${width}x${height}`;
   const m=await page.evaluate(()=>{
     const pop=document.querySelector('.cm-required-popup'),r=pop.getBoundingClientRect(),list=pop.querySelector('.cm-combat-groups');
     const rows=[...list.querySelectorAll('.cm-combat-row')].map(e=>e.getBoundingClientRect());
     const sideways=[pop,...pop.querySelectorAll('*')].filter(el=>el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).overflowX!=='visible'&&getComputedStyle(el).overflowX!=='clip').map(el=>String(el.className).slice(0,50));
     const send=document.querySelector('[data-action="board-send-blockers"]'),s=send.getBoundingClientRect();
     return {w:r.width,inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,stacked:rows.every((q,i)=>!i||q.top>=rows[i-1].bottom-1),scrolls:list.scrollHeight>list.clientHeight+1,sideways,
       send:[[.5,.5],[.2,.2],[.8,.8]].every(([x,y])=>send.contains(document.elementFromPoint(s.x+s.width*x,s.y+s.height*y)))};
   });
   if(width>=1440)ok(m.w>=900,`${where}: the blocker pop-up is at least 900px wide (${m.w})`);
   ok(m.inside,`${where}: the pop-up fits the window`);
   ok(m.stacked,`${where}: nine attackers are a list, one under another`);
   ok(m.scrolls,`${where}: nine attackers scroll inside the list`);
   eq(m.sideways,[],`${where}: nothing in the pop-up scrolls sideways`);
   ok(m.send,`${where}: Send is in view and receives the pointer`);
   /* the last row: the wheel over the list brings it up, and the pointer reaches it there */
   const list=page.locator('.cm-required-popup .cm-combat-groups'),box=await list.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,3000);await page.waitForTimeout(150);
   const last=await page.locator('.cm-combat-row').last().evaluate(el=>{const b=el.querySelector('.cm-combat-open'),r=b.getBoundingClientRect(),name=el.querySelector('.cm-block-row-name'),n=name.getBoundingClientRect();
     return {hit:b.contains(document.elementFromPoint(r.x+r.width*.5,r.y+r.height*.5)),name:name.textContent,whole:name.scrollWidth<=name.clientWidth+1&&name.scrollHeight<=name.clientHeight+1,lines:Math.round(n.height/parseFloat(getComputedStyle(name).lineHeight))};});
   ok(last.hit,`${where}: the last attacker row is reached by the pointer after the list scrolls`);
   eq(last.name,LONG,`${where}: a 42-character name is all there`);ok(last.whole,`${where}: and nothing of it is cut`);
   if(width<500)ok(last.lines>=2,`${where}: the long name wraps rather than running sideways (${last.lines} lines)`);
   ok(await page.locator('.cm-required-popup [data-action=board-send-blockers]').evaluate(s=>{const r=s.getBoundingClientRect();return s.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${where}: Send stays in view with the list scrolled`);
   if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.mouse.move(3,3);await page.screenshot({path:path.join(process.env.UAT_SHOTS,`r4-combat-nine-${mode}-${width}.png`)});}
   await c2.close();
  }
 }

 {
  const v=fixture();v.state.players[0].zones.Battlefield.cards.push(creature(3000,'Garruk Wildspeaker',0,{types:['Planeswalker'],power:null,toughness:null,counters:{loyalty:3}}));v.state.combat.attacks[0].planeswalker=3000;
  const {page,context,frames}=await open('table',1440,'sapphire-obsidian',v);const pw=page.locator('.cm-r4-combat [data-action=board-combat-inspect][data-card="3000"]');
  await hit(page,'.cm-r4-combat [data-action=board-combat-inspect][data-card="3000"]');await pw.focus();await page.keyboard.press('Enter');await page.locator('#cm-dialog[open]').waitFor();ok((await page.locator('#cm-dialog').textContent()).includes('Garruk Wildspeaker'),'attacked permanent has a one-press keyboard inspection path');eq(frames.filter(f=>f.type==='act').length,0,'permanent inspection sends no game action');await context.close();
 }

 {
  const f=await open('table',1440);f.hold();await f.page.locator(pair(0)).click();await pause(f.page);f.emit({type:'refused',of:'check',error:'Transport check failed'});await pause(f.page);
  ok(await f.page.locator('[data-action=board-block-retry]').isVisible(),'closed transport check exposes quiet retry');const before=f.frames.filter(x=>x.type==='check').length;f.release();await f.page.locator('[data-action=board-block-retry]').click();await pause(f.page);
  eq(f.frames.filter(x=>x.type==='check').length,before+1,'retry asks for fresh validation');eq(f.frames.filter(x=>x.type==='check').at(-1).indices,[0],'retry preserves private pair draft');eq(f.frames.filter(x=>x.type==='act').length,0,'retry never submits a game answer');await f.context.close();
 }
}finally{await close();}
console.log(`board-r4-combat: ${checks} checks passed`);
