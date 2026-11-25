/* WHAT AN ATTACK RISKS, IN ONE MARK (ROB-545, from Rob's 2026-10-25 ask: "If they have a creature with power equal to or greater
   than the toughness of one of my attackers, that action button for that attacker should be red ... If the creature I can action
   has power lower than ... all of the target opponent's creatures, it should have a yellow ... indication"; and 2026-11-24: "on the
   first screen where I select the opponent's name that it includes the most permissible indicator of the combat outcome on their
   row"). The marks are the approved canvas plan's (docs/play-overhaul/combat-canvas/F3-attacker.md): ✓ safe (green), ⇄ trade
   (amber), ☠ dies (red), and ⊘ kills no blocker alone. Each creature is marked against the selected target; each header carries
   the most favorable mark of the creatures still free or sent there, and changes as they are sent.

   The sample table (docs/reference/replit-sample-views.json, view 13), Rob attacking:
     Proft 2/2, Thrummingbird 1/1 flying, Faerie Formation 5/4 flying.
     AI 2 untapped: Walking Bulwark 0/3, Pir 1/1, Surly Farrier 2/2 (no flyer).   AI 3 untapped: Kor Skyfisher 2/3 flying.
     Friend: no creatures.
   So: Proft at AI 2 trades (the 2/2 kills it and it kills the 2/2); Proft at AI 3 dies and kills nothing (the 2/3); Thrummingbird
   at AI 2 is safe (nothing can block it); Thrummingbird at AI 3 dies; Faerie at AI 3 is safe (the 2/3 cannot kill it); anything
   at Friend is safe. With Pir and Surly tapped, Proft at AI 2 is safe but kills nothing. Deathtouch makes a trade, indestructible
   dies to none, and the engine's own hints (ROB-362) are read instead of the board's guess when the options carry them. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {openBrowser,ROOT} from "./uat/browser-runner.mjs";
const {browser,base,stub,close}=await openBrowser({name:"board-attack-risk",flag:"GEOMETRY_REQUIRED"});
const sample=JSON.parse(readFileSync(path.join(ROOT,"docs/reference/replit-sample-views.json"),"utf8")).views[13];
const html=readFileSync(path.join(ROOT,"index.html"),"utf8").replace("</head>",'<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const table={tableId:"riskfixture01",phase:"playing",matchId:sample.matchId,away:[],blockers:[],rules:{},seats:sample.state.players.map(p=>({seatId:p.playerId,name:p.name,kind:p.playerId===sample.seat?"human":"ai",you:p.playerId===sample.seat,occupied:true}))};
let checks=0;
const ok=(c,m)=>{assert.ok(c,m);checks++};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:"reduce",serviceWorkers:"block"});
await context.addInitScript(()=>{localStorage.setItem("cm-board-view","focus");localStorage.setItem("crankmagic-audio-muted","true");});
const page=await context.newPage();if(stub)await stub(page);
const errors=[],sent=[];let sock,revision=sample.revision;
page.on("pageerror",x=>errors.push(x.message));
await page.route(`${base}/index.html*`,r=>r.fulfill({contentType:"text/html",body:html}));
await page.route(`${base}/api/me`,r=>r.fulfill({json:{email:"risk@example.com"}}));
await page.route(`${base}/api/library**`,r=>r.fulfill({json:{head:null}}));
await page.route(`${base}/api/tables**`,r=>r.fulfill({json:{table,now:Date.now()}}));
await page.routeWebSocket(/\/api\/tables\/riskfixture01\/connect$/,ws=>{sock=ws;ws.onMessage(d=>sent.push(JSON.parse(d)));ws.send(JSON.stringify({type:"view",view:sample}));});
await page.goto(`${base}/index.html#table?id=riskfixture01`);await page.locator("#cm-board .cm-stage-top").waitFor();
const PROFT=526,BIRD=485,FAERIE=545,attackers=[BIRD,PROFT,FAERIE],seats={1:"Friend",2:"AI 2",3:"AI 3"};
const decision=(extra={})=>{const options=[];for(const id of attackers)for(const d of [1,2,3])options.push({index:options.length,label:`${id} → ${seats[d]}`,cardId:id,defenderId:d});return {id:"declare-attackers:risk"+revision,kind:"attackers",title:"Declare attackers",mode:"many",min:0,max:attackers.length,options,...extra};};
const show=async(edit=()=>{},extra={})=>{const v=structuredClone(sample);v.revision=++revision;v.decision=decision(extra);edit(v);sock.send(JSON.stringify({type:"view",view:v}));await page.waitForTimeout(250);await page.locator("#cm-board-decision.is-attacking").waitFor();};
const target=async d=>{await page.locator(`[data-action=board-attack-target][data-target="${d}:"]`).click();await page.waitForTimeout(80);};
/* Each free creature's marks against target d, read from the row: "trade", "dies weak", ... */
const marksAt=async d=>{await target(d);return page.locator(".cm-attack-tray [data-action=board-attack-send]").evaluateAll(bs=>Object.fromEntries(bs.map(b=>[b.dataset.card,[...b.querySelectorAll("[data-outlook]")].map(m=>m.dataset.outlook).join(" ")])));};
const header=d=>page.locator(`[data-action=board-attack-target][data-target="${d}:"] [data-outlook]`).evaluateAll(ms=>ms.map(m=>m.dataset.outlook).join(" "));
const card=(v,id)=>v.state.players.flatMap(p=>p.zones.Battlefield.cards).find(c=>c.cardId===id);
try{
  await show();
  let a2=await marksAt(2),a3=await marksAt(3),f=await marksAt(1);
  eq([a2[PROFT],a3[PROFT],f[PROFT]],["trade","dies weak","clear"],"Proft: ⇄ at AI 2 (the 2/2 kills it and dies), ☠ ⊘ at AI 3 (Kor Skyfisher 2/3), ✓ at Friend (no creatures)");
  eq([a2[BIRD],a3[BIRD]],["clear","dies weak"],"a flyer is marked only by what can block it: ✓ at AI 2 (no flyer or reach), ☠ ⊘ at AI 3");
  eq([a2[FAERIE],a3[FAERIE]],["clear","safe"],"Faerie Formation 5/4 is safe at AI 3: the 2/3 cannot kill it");
  eq([await header(1),await header(2),await header(3)],["clear","clear","safe"],"each header carries the best mark any free creature has there");
  /* Sending changes the headers: Faerie and Thrummingbird at Friend leave Proft alone free, at AI 2 a trade and at AI 3 a death. */
  await target(1);
  for(const id of [FAERIE,BIRD])await page.locator(`.cm-attack-tray [data-action=board-attack-send][data-card="${id}"]`).click();
  eq([await header(1),await header(2),await header(3)],["clear","trade","dies"],"with two sent to Friend, the headers change: ⇄ at AI 2 and ☠ at AI 3 (Proft's), ✓ at Friend (the two sent there)");
  const proft3=page.locator(`[data-action=board-attack-target][data-target="3:"] .cm-risk.is-die`);
  eq(await proft3.getAttribute("title"),"Could die: Kor Skyfisher 2/3 (as the table stands; a trick or first strike can change it)","☠ says which blocker could kill it and the limit of the hint, on hover");
  ok((await page.locator(`[data-action=board-attack-target][data-target="3:"]`).textContent()).includes("Could die: Kor Skyfisher 2/3;"),"and a screen reader hears it");
  ok((await page.locator(`.cm-attack-sent [data-action=board-attack-back][data-card="${FAERIE}"]`).getAttribute("aria-label"))==="Bring back Faerie Formation","a sent creature says what a press does");
  ok(await page.locator(".cm-attack-sent .cm-risk.is-safe").count()===2,"each sent creature carries its own mark (✓ at Friend)");
  const colors=await page.evaluate(()=>{const probe=document.createElement("i");document.querySelector("#cm-board").append(probe);const tok=t=>{probe.style.color=`var(${t})`;return getComputedStyle(probe).color;};const c=s=>getComputedStyle(document.querySelector(s)).color;
    const r={die:[c(".cm-attack-head .cm-risk.is-die"),tok("--color-required")],trade:[c(".cm-attack-head .cm-risk.is-trade"),tok("--color-money")],safe:[c(".cm-attack-head .cm-risk.is-safe"),tok("--st-inbox")]};probe.remove();return r;});
  for(const [k,[got,want]] of Object.entries(colors))eq(got,want,`the ${k} mark is drawn in its token's color (${got})`);
  /* Tapped creatures cannot block. */
  await show(v=>{for(const id of [535,537])card(v,id).tapped=true;});
  eq((await marksAt(2))[PROFT],"safe weak","with Pir and Surly tapped, only Walking Bulwark 0/3 can block Proft: ✓ ⊘, it kills nothing and nothing kills it");
  await show(v=>{card(v,PROFT).keywords=["Deathtouch"];});
  eq((await marksAt(3))[PROFT],"trade","a deathtouch attacker kills any blocker: ⇄ where it would have died");
  await show(v=>{card(v,PROFT).keywords=["Indestructible"];});
  eq((await marksAt(3))[PROFT],"safe weak","an indestructible attacker dies to none: ✓ ⊘");
  /* The engine's hints (ROB-362), where the options carry them, are read instead of the board's guess. */
  await show(v=>{for(const o of v.decision.options)if(o.cardId===PROFT&&o.defenderId===1)o.hints={couldBlock:[{cardId:540,kills:true,dies:false}]};});
  eq((await marksAt(1))[PROFT],"dies weak","an option's own hints decide its mark: ☠ at Friend, who has no creature the board could see");
  /* Confirm is off while the attack breaks a requirement the room states, with the room's words beside it. */
  await show(()=>{},{requires:[{by:"cardId",values:[PROFT],least:1,why:"Proft attacks each combat if able."}]});
  const confirm=page.locator('#cm-board-decision [data-action=board-confirm]');
  ok(await confirm.isDisabled(),"a creature that must attack: Confirm is off until it is sent");
  eq(await page.locator(".cm-attack-problem").textContent(),"Proft attacks each combat if able.","and the room's reason is said beside it");
  await page.evaluate(()=>{const b=document.querySelector('#cm-board-decision [data-action=board-confirm]');b.disabled=false;b.click();});await page.waitForTimeout(100);
  ok(!sent.some(s=>s.type==="act"),"a stale Confirm still sends nothing while the requirement is unmet");
  await target(2);await page.locator(`.cm-attack-tray [data-action=board-attack-send][data-card="${PROFT}"]`).click();
  ok(await confirm.isEnabled() && await page.locator(".cm-attack-problem").count()===0,"with Proft sent, Confirm is on");
  await show(()=>{},{min:2});
  ok(await confirm.isDisabled() && (await page.locator(".cm-attack-problem").textContent())==="2 more must attack.","fewer than the least the room asks: Confirm is off, and says how many more");
  /* Not an attack: no marks. */
  const v=structuredClone(sample);v.revision=++revision;v.decision={id:"targets:x",kind:"targets",title:"Choose target creature",mode:"one",min:1,max:1,options:[{index:0,label:"Proft, Consulting Detective",cardId:PROFT,defenderId:2}]};sock.send(JSON.stringify({type:"view",view:v}));await page.waitForTimeout(250);
  eq(await page.locator("#cm-board-decision .cm-risk").count(),0,"a question that is not declaring attackers is never marked");
  eq(errors,[],"no page errors");
  console.log(`board-attack-risk: ${checks} checks passed — each attacker is marked ✓ safe, ⇄ trade or ☠ dies (and ⊘ when it kills no blocker) against the selected target, by flying, reach, deathtouch, indestructible and tapped blockers, or by the engine's hints; each header carries the best of them and changes as creatures are sent; Confirm is off, with the room's reason, while a requirement is unmet.`);
}finally{await context.close();await close();}
