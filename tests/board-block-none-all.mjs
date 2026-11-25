/* ROB-333, kept by ROB-544: one press answers "no blocks", and since ROB-544 the same button sends whatever was assigned.
   Rob, 2026-10-30: he had to press "No block" or "Confirm" once per attacker slot. Rob, 2026-11-24: "allow the user to press
   confirm when there are unconfirmed blockers, and any that are unconfirmed are default to not being blocked."
   Proved in Table, Focus and 3D (full) at desktop size and in the phone layout: there is no per-attacker Confirm or Don't
   block and no "No blocks, all"; the one primary button reads "⊘ No blocks" with nothing assigned and "⛨ Send N" otherwise,
   its accessible name whole; with nothing assigned one press (keyboard too) sends []; with one block assigned among seven
   attackers one press sends exactly that pair, nothing cleared; a refused check sends nothing and names the attacker on its row. */
import assert from "node:assert/strict";
import {readFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {openBrowser, ROOT} from "./uat/browser-runner.mjs";
const {browser, base, stub, close} = await openBrowser({name:"board-block-none-all",flag:"GEOMETRY_REQUIRED"});
const sample = JSON.parse(readFileSync(path.join(ROOT,"docs/reference/replit-sample-views.json"),"utf8")).views[13];
const original = structuredClone(sample);
original.revision = 21000;
original.seat=1;original.seatId="s1";original.waitingOn="s1";
delete original.yourTurn;
original.state.turn=31;
for(const p of original.state.players) p.zones.Hand.cards=[];
original.state.players[original.seat].zones.Hand.count=0;
original.state.phase = "COMBAT_DECLARE_BLOCKERS";
original.state.turnId = "turn:31";
original.state.combat = {attackingPlayerId:0,defenders:[1],attacks:[]};
const permanent=(cardId,name,owner,extra={})=>({cardId,name,owner,controller:owner,faceDown:false,tapped:false,damage:0,counters:{},types:["Creature"],power:2,toughness:2,keywords:[],commander:false,...extra});
for(const p of original.state.players) p.zones.Battlefield.cards=[];
const ATTACKERS=[73001,73002,73003,73004,73005,73006,73007];
const NAMES=["Savannah Lions","Wind Drake","Grizzly Bears","Serra Angel","Goblin Guide","Craw Wurm","Hill Giant"];
original.state.players[0].zones.Battlefield.cards=ATTACKERS.map((id,i)=>permanent(id,NAMES[i],0));
original.state.players[1].zones.Battlefield.cards=[permanent(73011,"Reach creature",1),permanent(73012,"Second blocker",1)];
original.state.combat.attacks=ATTACKERS.map(attacker=>({attacker,defender:1,blocked:false,blockers:[]}));
const legal=[{blocker:73011,attackers:ATTACKERS},{blocker:73012,attackers:[73001,73002]}];
const optionsFor=l=>l.flatMap(b=>b.attackers.map(attackerId=>({cardId:b.blocker,attackerId}))).map((o,index)=>({index,...o,label:`Block #${o.attackerId} with #${o.cardId}`}));
original.decision={id:"declare-blockers:31:1",mode:"many",min:0,max:9,title:"Declare blockers",legalBlocks:legal,options:optionsFor(legal)};
const html=readFileSync(path.join(ROOT,"index.html"),"utf8").replace("</head>",'<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const errors=[];
async function fixture(width,height,mode,{noLegal=false}={}){
  const current=structuredClone(original);
  if(noLegal){current.decision.legalBlocks=[];current.decision.options=[];}
  const state={refuse:false};
  const frames=[], context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce",serviceWorkers:"block"});
  await context.addInitScript(mode=>{localStorage.setItem("cm-board-view",mode);localStorage.setItem("crankmagic-audio-muted","true");},mode);
  const page=await context.newPage();
  if(stub) await stub(page);
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:"text/html",body:html}));
  await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:"combat@example.com"}}));
  await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
  await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table:{tableId:"combat02",phase:"playing",matchId:current.matchId,away:[],seats:current.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:"human",mat:"felt",you:p.playerId===current.seat}))},now:Date.now()}}));
  await page.routeWebSocket(/\/api\/tables\/combat02\/connect$/,ws=>{ws.onMessage(data=>{const f=JSON.parse(data);frames.push(f);
    if(f.type==="check") ws.send(JSON.stringify({type:"checked",choiceId:f.choiceId,ok:!state.refuse,open:true,reasons:state.refuse?["The table refuses this draft."]:[],byAttacker:state.refuse?[{attackerId:73004,reasons:["Serra Angel has menace and needs another blocker. Add a blocker or take this one off."]}]:[]}));});
    ws.send(JSON.stringify({type:"view",view:current}));});
  await page.goto(`${base}/index.html#table?id=combat02`);
  await page.locator(".cm-combat-row").first().waitFor();
  return {page,context,frames,state};
}
const send='[data-action="board-send-blockers"]';
const acts=frames=>frames.filter(f=>f.type==="act");
const pause=page=>page.waitForTimeout(250);
/* A press where the pointer really lands: the control's own scrolling list brings it into view (never hidden overflow). */
async function press(page,sel){
  const el=page.locator(sel).first();
  await el.evaluate(el=>el.scrollIntoView({block:"nearest"}));
  const hit=await el.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&el.contains(document.elementFromPoint(x,y));});
  assert.ok(hit,`${sel} receives the pointer`);
  const r=await el.boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);await pause(page);
}
let cases=0;
try {
 for(const [width,height,mode] of [[1280,720,"full"],[1280,720,"table"],[1280,720,"focus"],[390,844,"focus"]]){
  cases++;
  const where=`${mode} ${width}x${height}`;console.log(where);
  /* No creature can block: the same one button answers with no blocks. */
  {
    const {page,context,frames}=await fixture(width,height,mode,{noLegal:true});await pause(page);
    assert.equal((await page.locator(send).innerText()).trim(),"⊘ No blocks",where+': with no legal blocker the one button reads No blocks');
    await press(page,send);
    assert.deepEqual(acts(frames).map(f=>f.indices),[[]],where+': and one press sends the empty answer');
    await context.close();
  }
  const {page,context,frames,state}=await fixture(width,height,mode);await pause(page);
  assert.equal(await page.locator('.cm-combat-row').count(),7,where+': seven attacker rows');
  for(const gone of ["board-block-none-all","board-block-attacker-none","board-block-attacker-confirm"])
    assert.equal(await page.locator(`[data-action="${gone}"]`).count(),0,`${where}: no ${gone} button (nothing to settle per attacker, no shortcut that clears a block)`);
  assert.equal(await page.locator('#cm-board-decision .v-button.primary,#cm-board-decision .cm-btn--primary').count(),1,where+': one primary button');
  assert.equal((await page.locator(send).innerText()).trim(),"⊘ No blocks",where+': nothing assigned reads No blocks');
  assert.equal(await page.locator(send).getAttribute("aria-label"),"No blocks; 7 attackers not blocked",where+': a whole accessible name');
  assert.equal(await page.locator(send).isDisabled(),false,where+': Send needs no attacker settled, only the table\'s check');
  /* It is on the screen: its center receives the pointer (no hidden overflow) and it keeps inside the window. */
  const reach=await page.locator(send).evaluate(el=>{const r=el.getBoundingClientRect();return {inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert.deepEqual(reach,{inside:true,hit:true},where+': Send is inside the window and reaches the pointer');
  if(process.env.UAT_SHOTS){mkdirSync(process.env.UAT_SHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.UAT_SHOTS,`block-send-${mode}-${width}.png`)});}
  /* One block among seven attackers: two presses assign it, nothing else is touched. */
  await press(page,'[data-action="board-block-attacker"][data-attacker="73004"]');
  await press(page,'[data-action="board-block-pair"][data-block-object="73011"]');
  assert.equal(await page.locator('[data-action="board-block-pair"][data-block-object="73011"]').first().getAttribute("aria-pressed"),"true",where+': one press on the creature assigns it');
  assert.equal(acts(frames).length,0,where+': assigning sends nothing');
  assert.equal((await page.locator(send).innerText()).trim(),"⛨ Send 1",where+': one block assigned reads Send 1');
  assert.equal(await page.locator(send).getAttribute("aria-label"),"Send 1 block; 6 attackers not blocked",where+': the accessible name counts the attackers left unblocked');
  assert.equal(await page.locator('.cm-combat-row.is-open').count(),6,where+': the six others read not blocked');
  /* A refused check sends nothing, and the refusal is on its attacker's row, with the way out. */
  state.refuse=true;
  await press(page,'[data-action="board-block-pair"][data-block-object="73011"]');
  await press(page,'[data-action="board-block-pair"][data-block-object="73011"]');
  assert.equal(await page.locator(send).isDisabled(),true,where+': a refused draft cannot be sent');
  assert.match(await page.locator('.cm-combat-row[data-combat-attacker="73004"].is-refused .cm-combat-reason').innerText(),/menace.*Add a blocker or take this one off/,where+': the refusal names the attacker and the way out on its row');
  await page.locator(send).click({force:true});await pause(page);
  assert.equal(acts(frames).length,0,where+': a refused check sends nothing');
  state.refuse=false;
  await press(page,'[data-action="board-block-pair"][data-block-object="73011"]');
  await press(page,'[data-action="board-block-pair"][data-block-object="73011"]');
  /* One activation, from the keyboard, sends exactly the one pair. */
  await page.locator(send).focus();
  await page.keyboard.press("Enter");await pause(page);
  assert.equal(acts(frames).length,1,where+': exactly one act after one activation');
  const act=acts(frames)[0],pair=original.decision.options.find(o=>o.cardId===73011&&o.attackerId===73004).index;
  assert.deepEqual([act.type,act.kind,act.choiceId,act.indices],["act","answer","declare-blockers:31:1",[pair]],where+': exactly the one assigned pair answers the declare-blockers decision');
  assert.deepEqual(frames.filter(f=>f.type==="check").at(-1).indices,[pair],where+': the table checked that draft before it was sent');
  await context.close();
 }
 /* The same press with no pair drafted (the draft is already empty and already checked) is one act of no blocks. */
 {
  const {page,context,frames}=await fixture(1280,720,"table");await pause(page);
  await press(page,send);
  assert.equal(acts(frames).length,1,'an untouched draft: one activation, one act');
  assert.deepEqual(acts(frames)[0].indices,[],'an untouched draft sends no pairs');
  await context.close();
 }
 assert.deepEqual(errors,[],'no browser errors');
 console.log(`board-block-none-all: PASS (${cases} layouts x 7 attackers: no per-attacker settling, one button that reads No blocks or Send N, one press sends [] or exactly the assigned pair, keyboard, a refusal named on its row sends nothing)`);
}finally{await close();}
