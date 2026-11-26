/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* ROB-554 and ROB-555 (Rob, 2026-11-25).
 *
 * 1. AN ORDER OF MANY TRIGGERS STAYS ANSWERABLE. Twelve triggers with long names: nothing is printed under the choices (the
 *    order written out again is what pushed Confirm and Cancel out of the pop-up), each chosen row carries its number, a second
 *    press takes a row back out, and Reset, Confirm and Cancel are under the pointer (hit-tested by hand, since a Playwright
 *    click scrolls a clipped control into reach) at a desktop, a short window and a phone.
 * 2. AN ATTACHED CARD RIDES BEHIND ITS PERMANENT, up and to the right, in Table, Focus and 3D: it leaves its own row (an Aura
 *    of another player's too), its name line shows above the host, and the pointer on that part brings it whole to the front.
 */
import assert from 'node:assert/strict';import {readFileSync,mkdirSync} from 'node:fs';import path from 'node:path';import {openBrowser,ROOT} from './uat/browser-runner.mjs';
const {browser,base,stub,close}=await openBrowser({name:'board-order-attached',flag:'GEOMETRY_REQUIRED'});
const sample=JSON.parse(readFileSync(path.join(ROOT,'docs/reference/replit-sample-views.json'),'utf8')).views[13];
const html=readFileSync(path.join(ROOT,'index.html'),'utf8').replace('</head>','<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const SHOTS=process.env.UAT_SHOTS;if(SHOTS)mkdirSync(SHOTS,{recursive:true});
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};const ok=(c,m)=>{assert.ok(c,m);checks++;};
const WHY='Your triggers need an order to go on the stack (CR 603.3b): put them in order.';
const TRIGGERS=Array.from({length:12},(_,i)=>`Faerie Formation ${i+1}: Whenever one or more creatures you control with flying deal combat damage to a player, create a 1/1 blue Faerie Rogue creature token with flying, then draw a card for each Rogue you control`);
function orderView(){const v=structuredClone(sample);v.revision=8100;v.state.combat=null;v.state.phase='MAIN1';
  v.decision={id:'order-triggers:25:0',kind:'order-triggers',mode:'order',min:12,max:12,title:'Choose the order your triggers go on the stack',cancel:{way:null,why:WHY},options:TRIGGERS.map((label,index)=>({index,label,cardId:545}))};return v;}
function attachedView(){const v=structuredClone(sample);v.revision=8200;v.state.combat=null;v.state.phase='MAIN1';
  for(const p of v.state.players)for(const c of p.zones.Battlefield.cards)c.attachments=[];
  const mine=v.state.players[0].zones.Battlefield.cards;
  mine.find(c=>c.cardId===485).attachments=[9101,510];   /* Thrummingbird wears the Boots, and AI 2's Aura is on it */
  mine.push({cardId:9101,name:'Swiftfoot Boots',faceDown:false,owner:0,controller:0,tapped:false,damage:0,counters:{},types:['Artifact'],subtypes:['Equipment'],power:null,toughness:null,keywords:[],commander:false,attachments:[]});
  v.decision={id:'priority:attached',kind:'priority',mode:'one',min:1,max:1,title:'Your priority',options:[{index:0,act:'pass',label:'Pass priority'}]};return v;}
async function open(mode,v,{width=1440,height=900,touch=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block',hasTouch:touch,isMobile:touch});await context.addInitScript(mode=>{localStorage.setItem('cm-board-view',mode);localStorage.setItem('crankmagic-audio-muted','true');},mode);
 const page=await context.newPage();if(stub)await stub(page);const sent=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:'text/html',body:html}));await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:'input@example.com'}}));await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
 const table={tableId:'orderatt01',phase:'playing',matchId:v.matchId,away:[],blockers:[],rules:{},seats:v.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:p.playerId===v.seat?'human':'ai',you:p.playerId===v.seat,occupied:true,ready:true,mat:'felt'}))};
 await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));await page.routeWebSocket(/\/api\/tables\/orderatt01\/connect$/,s=>{s.onMessage(m=>sent.push(JSON.parse(m)));s.send(JSON.stringify({type:'view',view:v}));});
 await page.goto(`${base}/index.html#table?id=orderatt01`);await page.locator('#cm-board .cm-mat').first().waitFor();
 return {page,context,sent,errors};
}
/* Under the pointer, by hand: the control's own center is inside the window and the topmost element there is the control. */
const reach=el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;if(!r.width||x<0||y<0||x>innerWidth||y>innerHeight)return false;const hit=document.elementFromPoint(x,y);return !!hit&&(hit===el||el.contains(hit));};
try{
 /* ---- 1. the order of twelve triggers ---- */
 for(const [name,size] of [['desktop',{width:1440,height:900}],['short',{width:1024,height:600}],['phone',{width:390,height:844,touch:true}]]) {
  const {page,context,sent,errors}=await open('table',orderView(),size),box=page.locator('#cm-board-decision');
  await box.getByRole('heading',{name:'Choose the order your triggers go on the stack'}).waitFor({timeout:30000});
  const rows=box.locator('[data-action=board-option]'),foot=box.locator('.cm-board-decision-foot');
  const controls=async()=>Object.fromEntries(await Promise.all(['board-reset','board-confirm','board-flow-cancel'].map(async a=>[a,await box.locator(`[data-action=${a}]`).evaluate(reach)])));
  const numbers=async()=>rows.evaluateAll(els=>els.map(el=>el.dataset.order||''));
  eq(await rows.count(),12,`${name}: twelve triggers, a row each`);
  eq(await controls(),{'board-reset':true,'board-confirm':true,'board-flow-cancel':true},`${name}: Reset, Confirm and Cancel are under the pointer with twelve long triggers listed`);
  eq((await foot.innerText()).replace(/\s+/g,' ').trim(),'Reset Confirm Cancel',`${name}: nothing is printed under the choices, only the three controls`);
  ok(await rows.evaluateAll(els=>{const tops=els.map(el=>Math.round(el.getBoundingClientRect().top));return tops.every((t,i)=>i===0||t>tops[i-1]);}),`${name}: one trigger a row`);
  await rows.nth(2).click();await rows.nth(0).click();
  eq((await numbers()).slice(0,3),['2','','1'],`${name}: the rows chosen carry their numbers, in the order pressed`);
  eq(await rows.nth(2).evaluate(el=>getComputedStyle(el,'::before').content),'"1"',`${name}: the number is drawn on the row`);
  eq((await foot.innerText()).replace(/\s+/g,' ').trim(),'Reset Confirm Cancel',`${name}: and still nothing is printed under them`);
  await rows.nth(2).click();
  eq((await numbers()).slice(0,3),['1','',''],`${name}: a second press takes a row back out, and the row after it moves up`);
  await box.locator('[data-action=board-reset]').click();
  for(let i=11;i>=0;i-=1){await rows.nth(i).scrollIntoViewIfNeeded();await rows.nth(i).click();}
  eq(await numbers(),Array.from({length:12},(_,i)=>String(12-i)),`${name}: all twelve numbered, last row first`);
  eq(await controls(),{'board-reset':true,'board-confirm':true,'board-flow-cancel':true},`${name}: with all twelve chosen the three controls are still under the pointer`);
  /* the phone layout is not held to the no-scroll rule yet (AGENTS.md, "The game fits the window") */
  if(name!=='phone')ok(await page.evaluate(()=>{const b=document.querySelector('#cm-board');return b.scrollHeight<=b.clientHeight+1;}),`${name}: the game does not scroll`);
  if(SHOTS)await page.screenshot({path:path.join(SHOTS,`order-triggers-${name}.png`)});
  /* Cancel: the rules need this answer (the room's \`cancel.way\` null), so the pop-up steps aside with Resume and why. */
  await box.locator('[data-action=board-flow-cancel]').click();
  const resume=page.locator('#cm-board-decision [data-action=board-flow-resume]');await resume.waitFor();
  ok(await resume.evaluate(reach),`${name}: Cancel leaves Resume under the pointer`);
  eq((await page.locator('#cm-board-decision .cm-board-cancel-why').innerText()).trim(),WHY,`${name}: with why this question can't be canceled, in the room's words`);
  if(SHOTS)await page.screenshot({path:path.join(SHOTS,`order-triggers-${name}-paused.png`)});
  await resume.click();
  for(let i=11;i>=0;i-=1){await rows.nth(i).scrollIntoViewIfNeeded();await rows.nth(i).click();}
  const confirm=box.locator('[data-action=board-confirm]');ok(await confirm.isEnabled()&&await confirm.evaluate(reach),`${name}: Confirm is ready and under the pointer`);
  await confirm.click();
  eq(sent.filter(s=>s.type==='act').map(s=>s.indices),[[11,10,9,8,7,6,5,4,3,2,1,0]],`${name}: the order chosen is the order sent`);
  eq(errors,[],`${name}: no browser errors`);await context.close();
 }
 /* ---- 2. attached cards ride behind their permanent ---- */
 for(const mode of ['table','focus','full']) {
  const {page,context,errors}=await open(mode,attachedView());
  const mat=page.locator('.cm-mat[data-seat="0"]'),group=mat.locator('.cm-attach-group[data-attach-host="485"]');await group.waitFor({timeout:30000});
  if(mode==='full')await page.evaluate(()=>{for(const el of document.querySelectorAll('[data-action=board-stage-rail][aria-expanded=true],[data-action=board-stage-side][aria-expanded=true]'))el.click();});
  eq(await group.locator('.cm-attached').evaluateAll(els=>els.map(el=>el.dataset.attached)),['9101','510'],`${mode}: the Equipment and the other player's Aura ride with the creature they are attached to`);
  eq([await page.locator('#cm-board .cm-mat .cm-bcard[data-action="board-card"][data-card="9101"]').count(),await page.locator('#cm-board .cm-mat .cm-bcard[data-action="board-card"][data-card="510"]').count(),await page.locator('.cm-mat[data-seat="2"] .cm-bcard[data-action="board-card"][data-card="510"]').count()],[1,1,0],`${mode}: each is drawn once, and the Aura has left its controller's own row`);
  const host=group.locator('.cm-bcard[data-card="485"]'),boots=group.locator('.cm-bcard[data-card="9101"]'),aura=group.locator('.cm-bcard[data-card="510"]');
  ok(/attached: Swiftfoot Boots, Ordeal of Nylea/.test(await host.getAttribute('aria-label')),`${mode}: the creature says what is attached to it`);
  ok(/attached to Thrummingbird/.test(await boots.getAttribute('aria-label'))&&/attached to Thrummingbird/.test(await aura.getAttribute('aria-label')),`${mode}: and each attachment says what it is attached to`);
  await group.scrollIntoViewIfNeeded();
  const geo=await group.evaluate(g=>{const r=s=>g.querySelector(s).getBoundingClientRect(),h=r('.cm-bcard[data-card="485"]'),b=r('.cm-bcard[data-card="9101"]'),a=r('.cm-bcard[data-card="510"]');const laid=q=>{const el=g.querySelector(q);return [el.offsetWidth,el.offsetHeight].join();};   /* laid-out size: the 3D view's perspective draws nearer cards larger */
    const strip=(x,under)=>{const px=x.right-4,py=x.top+Math.min(6,(under.top-x.top)/2);const hit=document.elementFromPoint(px,py);return {x:px,y:py,card:hit?.closest('.cm-bcard')?.dataset.card||null};};
    return {sameSize:laid('.cm-bcard[data-card="485"]')===laid('.cm-bcard[data-card="9101"]')&&laid('.cm-bcard[data-card="485"]')===laid('.cm-bcard[data-card="510"]'),up:[h.top-b.top,b.top-a.top],right:[b.right-h.right,a.right-b.right],hostCenter:document.elementFromPoint(h.left+h.width/2,h.top+h.height/2)?.closest('.cm-bcard')?.dataset.card,boots:strip(b,h),aura:strip(a,b),nameLine:h.width*.12};});
  ok(geo.sameSize,`${mode}: an attached card is the size of the card it rides`);
  /* flat views: a whole name line shows; the 3D view tilts the table away, so there it is only held to showing */
  ok(geo.up.every(d=>d>=(mode==='full'?2:geo.nameLine))&&geo.right.every(d=>d>1),`${mode}: each is stepped up by at least a name line and to the right (${JSON.stringify(geo)})`);
  eq([geo.hostCenter,geo.boots.card,geo.aura.card],['485','9101','510'],`${mode}: the creature is in front, and each attachment's showing part is under the pointer`);
  await page.mouse.move(geo.boots.x,geo.boots.y);
  await page.locator('#cm-board-peek .cm-bcard-name').waitFor({state:'attached',timeout:3000});
  eq((await page.locator('#cm-board-peek .cm-bcard-name').textContent()).trim(),'Swiftfoot Boots',`${mode}: the pointer on the showing part pops that card up to read`);
  ok(await group.evaluate(g=>{const b=g.querySelector('.cm-bcard[data-card="9101"]'),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height*.6);return hit?.closest('.cm-bcard')===b;}),`${mode}: and brings it whole to the front of the creature`);
  if(SHOTS)await page.screenshot({path:path.join(SHOTS,`attached-${mode}-hover.png`)});
  await page.mouse.move(2,2);
  eq(await group.evaluate(g=>{const h=g.querySelector('.cm-bcard[data-card="485"]').getBoundingClientRect();return document.elementFromPoint(h.left+h.width/2,h.top+h.height/2)?.closest('.cm-bcard')?.dataset.card;}),'485',`${mode}: the pointer gone, the creature is in front again`);
  ok(await page.evaluate(()=>{const b=document.querySelector('#cm-board');return b.scrollHeight<=b.clientHeight+1;}),`${mode}: the game does not scroll`);
  if(SHOTS)await page.screenshot({path:path.join(SHOTS,`attached-${mode}.png`)});
  eq(errors,[],`${mode}: no browser errors`);await context.close();
 }
}finally{await close();}
console.log(`board-order-attached: ${checks} checks passed`);
