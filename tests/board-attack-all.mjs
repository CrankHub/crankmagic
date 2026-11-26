/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */

/* DECLARING ATTACKERS, ONE POP-UP (ROB-545; Rob, 2026-11-24: "combine this screen and the next so that it is a nested outline view of
 * each card underneath an expand and collapse header for each of the players. Then ... either me selecting the cards on the actual
 * table or me selecting from a scrollable row at the bottom of available cards. Actually, let's do that."). Before it: ATTACK ALL
 * (Rob's one-person, three-AI table, Oct 21).
 *
 * The engine offers Declare attackers as one option per creature per target (game/engine/rules/combat.mjs). The board draws one
 * pop-up: a header per player that folds, a target button on it and "⚔ All"; under it the creatures sent there and that player's
 * planeswalkers as targets of their own; at the foot the creatures not yet sent, in a row that scrolls sideways. A target stays
 * selected; one press on a creature sends it there (taking back any other pick of it), a press on a sent one brings it back, and
 * a press on your creature on the table does the same. Only Confirm sends the answer.
 *
 * In 3D (full), Table and Focus at 1280x720 and the phone at 390x844, each control reached by elementFromPoint (a Playwright click
 * proves no reach); twenty attackers and three players fit at 1440x900 and 390x844 in every view, the outline scrolling inside the
 * pop-up, the row sideways, Confirm in view. GEOMETRY_REQUIRED=1 refuses a missing browser.
 *   node tests/board-attack-all.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {openBrowser, ROOT} from "./uat/browser-runner.mjs";

const {browser, base, stub, close} = await openBrowser({name: "board-attack-all", flag: "GEOMETRY_REQUIRED"});
const sample = JSON.parse(readFileSync(path.join(ROOT, "docs/reference/replit-sample-views.json"), "utf8")).views[13];
const html = readFileSync(path.join(ROOT, "index.html"), "utf8").replace("</head>", '<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const goblin = (cardId) => ({cardId, name: "Goblin", owner: 0, controller: 0, faceDown: false, tapped: false, damage: 0, counters: {}, types: ["Creature"], power: 1, toughness: 1, keywords: [], commander: false});
const WALKER = 82050;
/* `count` goblins of Rob's; `opponents` how many players they may attack; `walker` adds the second opponent's planeswalker. */
function attackView({count = 3, opponents = 3, walker = true, edit = (o) => o} = {}) {
  const v = structuredClone(sample);
  v.revision = 40000;
  v.seat = 0; v.seatId = "s0"; v.waitingOn = "s0";
  v.state.activePlayer = 0; v.state.phase = "COMBAT_DECLARE_ATTACKERS"; v.state.combat = null;
  const ids = Array.from({length: count}, (_, i) => 82001 + i);
  v.state.players[0].zones.Battlefield.cards.push(...ids.map(goblin));
  const others = v.state.players.filter((p) => p.playerId !== 0).slice(0, opponents);
  if (walker) others[1 % others.length].zones.Battlefield.cards.push({cardId: WALKER, name: "Garruk Wildspeaker", owner: others[1 % others.length].playerId, controller: others[1 % others.length].playerId, faceDown: false, tapped: false, damage: 0, counters: {loyalty: 3}, types: ["Planeswalker"], power: null, toughness: null, keywords: [], commander: false});
  let options = [];
  /* As the engine lists them (rules/combat.mjs): each creature at each player, then at each planeswalker -- here the second
     opponent's, which "All" at that player never picks: attacking it is not attacking them. */
  ids.forEach((id, n) => {
    others.forEach((p) => options.push({index: options.length, label: `Goblin #${n + 1} → ${p.name}`, cardId: id, defenderId: p.playerId}));
    if (walker) options.push({index: options.length, label: `Goblin #${n + 1} → Garruk Wildspeaker`, cardId: id, defenderId: others[1 % others.length].playerId, planeswalkerId: WALKER});
  });
  options = edit(options, others).map((o, index) => ({...o, index}));
  v.decision = {id: "declare-attackers:31", title: "Declare attackers", kind: "declare-attackers", mode: "many", min: 0, max: count, exclusiveBy: "cardId", options};
  return {view: v, others, ids};
}
async function fixture(view, width, height, mode, ready = "#cm-board-decision.is-attacking") {
  const frames = [], context = await browser.newContext({viewport: {width, height}, reducedMotion: "reduce", serviceWorkers: "block"});
  await context.addInitScript((m) => {localStorage.setItem("cm-board-view", m); localStorage.setItem("crankmagic-audio-muted", "true");}, mode);
  const page = await context.newPage();
  if (stub) await stub(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(`${base}/index.html*`, (r) => r.fulfill({contentType: "text/html", body: html}));
  await page.route(`${base}/api/me`, (r) => r.fulfill({json: {email: "rob@example.com"}}));
  await page.route(`${base}/api/library**`, (r) => r.fulfill({json: {head: null}}));
  await page.route(`${base}/api/tables**`, (r) => r.fulfill({json: {table: {tableId: "atk00001", phase: "playing", matchId: view.matchId, away: [],
    seats: view.state.players.map((p) => ({seatId: p.playerId, name: p.name, kind: "human", mat: "felt", you: p.playerId === view.seat}))}, now: Date.now()}}));
  await page.routeWebSocket(/\/api\/tables\/atk00001\/connect$/, (ws) => {ws.onMessage((data) => frames.push(JSON.parse(data))); ws.send(JSON.stringify({type: "view", view}));});
  await page.goto(`${base}/index.html#table?id=atk00001`);
  await page.locator(ready).waitFor();
  await page.waitForTimeout(300);
  return {page, context, frames, errors};
}
/* Pressed where a person would press it: the element itself under the point, inside the window -- scrolled into its own
   list first if that list scrolls, as a person would. */
async function press(page, selector) {
  const at = await page.locator(selector).first().evaluate((el) => {
    el.scrollIntoView({block: "nearest", inline: "nearest"});
    const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    return {ok: x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && el.contains(document.elementFromPoint(x, y)), x, y};
  });
  assert.ok(at.ok, `${selector} takes the pointer`);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(120);
}
let currentOptions = [];
/* What is sent where, read from the outline: each sent row's creature under the target it is drawn at. */
const sentAt = (page) => page.locator(".cm-attack-group").evaluateAll((gs) => gs.flatMap((g) => [...g.querySelectorAll(".cm-attack-body>.cm-attack-list>.cm-attack-sent [data-card]")].filter((b) => b.dataset.action === "board-attack-back").map((b) => `${b.dataset.card}@${g.dataset.defender}`)
  .concat([...g.querySelectorAll(".cm-attack-sub .cm-attack-back")].map((b) => `${b.dataset.card}@pw`))).sort());
let checks = 0;
const ok = (c, m) => {assert.ok(c, m); checks += 1;};
const eq = (a, b, m) => {assert.deepEqual(a, b, m); checks += 1;};
try {
  for (const [width, height, mode] of [[1280, 720, "full"], [1280, 720, "table"], [1280, 720, "focus"], [390, 844, "focus"]]) {
    const where = `${mode} ${width}x${height}`;
    const {view, others, ids} = attackView(); currentOptions = view.decision.options;
    const [maya, theo, ivy] = others;
    const {page, context, frames, errors} = await fixture(view, width, height, mode);
    eq(await page.locator('[data-action="board-attack-all"]').evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label"))), others.map((p) => `Attack ${p.name} with every creature that can`), `${where}: one header with ⚔ All for each player the creatures may attack`);
    eq(await page.locator('[data-action=board-attack-target][aria-pressed=true]').evaluateAll((bs) => bs.map((b) => b.dataset.target)), [`${maya.playerId}:`], `${where}: the first player is selected already`);
    eq(await page.locator('[data-action=board-flow-choice], [data-action=board-flow-attacker]').count(), 0, `${where}: no screen asks one creature at a time`);
    await press(page, `[data-action="board-attack-all"][data-defender="${theo.playerId}"]`);
    eq(await sentAt(page), ids.map((id) => `${id}@${theo.playerId}`).sort(), `${where}: All at ${theo.name} sends every goblin there, listed under its header`);
    ok(await page.locator(".cm-attack-tray [data-action=board-attack-send]").count() === 0, `${where}: and the row of creatures not yet sent is empty`);
    /* Moving one: select Ivy, bring goblin #1 back, press it in the row. */
    await press(page, `[data-action=board-attack-target][data-target="${ivy.playerId}:"]`);
    await press(page, `[data-action=board-attack-back][data-card="${ids[0]}"]`);
    ok((await sentAt(page)).length === 2 && await page.locator(`.cm-attack-tray [data-action=board-attack-send][data-card="${ids[0]}"]`).count() === 1, `${where}: a sent creature pressed comes back to the row`);
    await press(page, `.cm-attack-tray [data-action=board-attack-send][data-card="${ids[0]}"]`);
    eq(await sentAt(page), [`${ids[0]}@${ivy.playerId}`, `${ids[1]}@${theo.playerId}`, `${ids[2]}@${theo.playerId}`].sort(), `${where}: pressed in the row it goes to the selected player, ${ivy.name}; the others stay at ${theo.name}`);
    eq(await page.locator(`.cm-attack-group[data-defender="${theo.playerId}"] .cm-attack-head .cm-attack-count`).textContent(), "⚔ 2 sent", `${where}: each header counts what is sent there`);
    await press(page, `[data-action="board-attack-all"][data-defender="${maya.playerId}"]`);
    eq(await sentAt(page), ids.map((id) => `${id}@${maya.playerId}`).sort(), `${where}: All at ${maya.name} turns them all on ${maya.name}: a creature goes to one target at most`);
    /* A planeswalker is a target of its own, under its controller. */
    await press(page, `[data-action=board-attack-back][data-card="${ids[1]}"]`);
    await press(page, `[data-action=board-attack-target][data-target="${theo.playerId}:${WALKER}"]`);
    await press(page, `.cm-attack-tray [data-action=board-attack-send][data-card="${ids[1]}"]`);
    ok((await sentAt(page)).includes(`${ids[1]}@pw`), `${where}: a goblin sent at Garruk is listed under the planeswalker, in ${theo.name}'s group`);
    await press(page, '[data-action="board-attack-none"]');
    ok((await sentAt(page)).length === 0 && await page.locator('[data-action="board-attack-none"]').count() === 0, `${where}: None clears them, and puts itself away`);
    ok(frames.filter((f) => f.type === "act").length === 0, `${where}: nothing is sent while picking`);
    await press(page, `[data-action="board-attack-all"][data-defender="${ivy.playerId}"]`);
    await press(page, '[data-action="board-confirm"]');
    const sent = frames.filter((f) => f.type === "act").at(-1);
    eq(sent && [...sent.indices].sort((a, b) => a - b), view.decision.options.filter((o) => o.defenderId === ivy.playerId && o.planeswalkerId === undefined).map((o) => o.index),
      `${where}: Confirm sends the three attacks at ${ivy.name}`);
    eq(errors, [], `${where}: no page errors`);
    await context.close();
  }
  /* One opponent: their header is selected already, and one press on a creature sends it. A creature that cannot attack the selected
     target is drawn dim, says why, and a press on it picks nothing. */
  {
    const {view, others, ids} = attackView({opponents: 1, walker: false, edit: (os) => os});
    const {page, context, frames} = await fixture(view, 1440, 900, "table");
    eq(await page.locator('[data-action=board-attack-target][aria-pressed=true]').evaluateAll((bs) => bs.map((b) => b.dataset.target)), [`${others[0].playerId}:`], "one opponent: their header is selected already");
    await press(page, `[data-action=board-attack-send][data-card="${ids[2]}"]`);
    eq(await sentAt(page), [`${ids[2]}@${others[0].playerId}`], "and one press on a creature sends it");
    await press(page, '[data-action="board-confirm"]');
    eq(frames.filter((f) => f.type === "act").at(-1)?.indices, [view.decision.options.find((o) => o.cardId === ids[2]).index], "Confirm sends that one attack");
    await context.close();
  }
  {
    const {view, others, ids} = attackView({walker: false, edit: (os, others) => os.filter((o) => !(o.cardId === 82003 && o.defenderId === others[0].playerId))});
    const maya = others[0];
    const {page, context} = await fixture(view, 1440, 900, "table");
    const tile = page.locator(`.cm-attack-tray [data-action=board-attack-send][data-card="${ids[2]}"]`);
    eq([await tile.getAttribute("aria-disabled"), await tile.getAttribute("aria-label")], ["true", `Goblin c can't attack ${maya.name}`], "a creature that cannot attack the selected player is dim and says so");
    await press(page, `.cm-attack-tray [data-action=board-attack-send][data-card="${ids[2]}"]`);
    ok((await sentAt(page)).length === 0, "a press on it sends nothing");
    ok((await page.locator("#cm-board-said").textContent()).includes(`can't attack ${maya.name}`), "and says why, with what to do instead");
    await press(page, `[data-action=board-attack-target][data-target="${others[1].playerId}:"]`);
    ok(await tile.getAttribute("aria-disabled") === null, "with another player selected it may attack, and is pressable");
    await context.close();
  }
  /* Your creature on the table: a press sends it at the selected target, another brings it back, as the row's press does. */
  {
    const {view, ids} = attackView({walker: false});
    const {page, context, frames} = await fixture(view, 1440, 900, "focus");
    const onTable = page.locator(`#cm-board .cm-bcard[data-action="board-card"][data-card="${ids[0]}"]`).first();
    ok(await onTable.count() === 1, "the goblin is on the table");
    const reach = await onTable.evaluate((el) => {const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; return {x, y, ok: x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && el.contains(document.elementFromPoint(x, y))};});
    if (reach.ok) await page.mouse.click(reach.x, reach.y); else {await onTable.focus(); await page.keyboard.press("Enter");}
    await page.waitForTimeout(150);
    eq(await sentAt(page), [`${ids[0]}@${view.decision.options[0].defenderId}`], `a press on the goblin on the table sends it at the selected player (${reach.ok ? "by the pointer" : "by the keyboard: the pop-up covers it here"})`);
    if (reach.ok) await page.mouse.click(reach.x, reach.y); else {await onTable.focus(); await page.keyboard.press("Enter");}
    await page.waitForTimeout(150);
    eq(await sentAt(page), [], "and another press brings it back");
    /* Moving it: sent at one player, another header selected, a press on the table moves it there -- one target at most. */
    const [p1, p2] = [...new Set(view.decision.options.map((o) => o.defenderId))];
    if (reach.ok) await page.mouse.click(reach.x, reach.y); else {await onTable.focus(); await page.keyboard.press("Enter");}
    await page.waitForTimeout(150);
    await press(page, `[data-action=board-attack-target][data-target="${p2}:"]`);
    if (reach.ok) await page.mouse.click(reach.x, reach.y); else {await onTable.focus(); await page.keyboard.press("Enter");}
    await page.waitForTimeout(150);
    eq(await sentAt(page), [`${ids[0]}@${p2}`], `sent at ${p1}, then with ${p2} selected, a press on the table moves it to ${p2}: at one target only`);
    if (reach.ok) await page.mouse.click(reach.x, reach.y); else {await onTable.focus(); await page.keyboard.press("Enter");}
    await page.waitForTimeout(150);
    eq(await sentAt(page), [], "and a press on it where it is sent brings it back");
    ok(frames.filter((f) => f.type === "act").length === 0 && await page.locator("#cm-card-menu").count() === 0, "nothing is sent, and no card menu opens");
    await context.close();
  }
  /* Twenty attackers at three players: the outline scrolls inside the pop-up, the row sideways, Confirm stays in view, the game never scrolls. */
  for (const [width, height] of [[1440, 900], [390, 844]]) for (const mode of ["table", "focus", "full"]) {
    const where = `twenty goblins, ${mode} ${width}x${height}`;
    const {view, others, ids} = attackView({count: 20});
    const {page, context, errors} = await fixture(view, width, height, mode);
    if (mode === "table" && width > 500) {
      ok(await page.locator(".cm-attack-body:not([hidden])").count() === 3, `${where}: with three players every header is open`);
      await press(page, `[data-action=board-attack-fold][data-defender="${others[2].playerId}"]`);
      ok(await page.locator(`#cm-attack-body-${others[2].playerId}`).isHidden() && await page.locator(`[data-action=board-attack-fold][data-defender="${others[2].playerId}"]`).getAttribute("aria-expanded") === "false", `${where}: a header folds`);
      await press(page, `[data-action=board-attack-fold][data-defender="${others[2].playerId}"]`);
      ok(await page.locator(`#cm-attack-body-${others[2].playerId}`).isVisible(), `${where}: and opens again`);
    }
    for (const id of ids.slice(0, 8)) await press(page, `.cm-attack-tray [data-action=board-attack-send][data-card="${id}"]`);
    const geo = await page.evaluate(() => {
      const box = (s) => {const b = document.querySelector(s).getBoundingClientRect(); return {top: b.top, bottom: b.bottom, left: b.left, right: b.right};};
      const outline = document.querySelector(".cm-attack-outline"), tray = document.querySelector(".cm-attack-tray"), board = document.getElementById("cm-board");
      return {popup: box("#cm-decision-slot"), outlineScrolls: outline.scrollHeight > outline.clientHeight && getComputedStyle(outline).overflowY === "auto",
        traySideways: tray.scrollWidth > tray.clientWidth && getComputedStyle(tray).overflowX === "auto", trayOneRow: tray.scrollHeight <= tray.clientHeight + 1,
        board: board.scrollHeight <= board.clientHeight + 1 || getComputedStyle(board).overflowY === "hidden", w: innerWidth, h: innerHeight};
    });
    ok(geo.popup.top >= 0 && geo.popup.bottom <= geo.h && geo.popup.left >= 0 && geo.popup.right <= geo.w, `${where}: the pop-up fits the window (${JSON.stringify(geo.popup)})`);
    ok(geo.traySideways && geo.trayOneRow, `${where}: the row of twelve creatures not yet sent scrolls sideways, one row high`);
    if (width < 500) ok(geo.outlineScrolls, `${where}: the outline scrolls up and down inside the pop-up`);
    await press(page, `.cm-attack-tray [data-action=board-attack-send][data-card="${ids.at(-1)}"]`);
    ok((await sentAt(page)).includes(`${ids.at(-1)}@${others[0].playerId}`), `${where}: the row's last creature is reached and sent`);
    await press(page, '[data-action="board-confirm"]');
    eq(errors, [], `${where}: no page errors`);
    await context.close();
  }
  /* Not on another question that picks many. */
  {
    const {view} = attackView();
    view.decision = {...view.decision, id: "choose-cards:31", title: "Choose two", kind: "choose", exclusiveBy: undefined, min: 2, max: 2};
    const {page, context} = await fixture(view, 1280, 720, "table", "#cm-board-decision");
    ok(await page.locator(".cm-attack-outline, [data-action=board-attack-all], [data-action=board-attack-send]").count() === 0, "another question that picks many has no attack outline");
    await context.close();
  }
} finally {await close();}
console.log(`board-attack-all: ${checks} checks passed -- Declare attackers is one pop-up: a header per player with ⚔ All, a selected target, a row of creatures not yet sent; one press sends or brings back (in the row or on the table), a creature at one target at most, a planeswalker a target of its own, a dim creature that cannot attack says why, twenty attackers fit; only Confirm sends; in 3D, Table, Focus and on the phone, by elementFromPoint.`);
