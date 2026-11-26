/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* THE MONARCH ON THE BOARD (ROB-289; Rob, 2026-11-24: "We also need to add an indicator for who is the monarch when the
 * monarch tag is in play"). The view carries it already: `state.players[i].monarch === true` on the monarch alone
 * (game/engine/projection.mjs). The board draws a crown (♛) on that seat's name wherever it names a seat, in a real Chromium
 * on a recorded room view (docs/reference/replit-sample-views.json) whose players are given the key:
 *
 *   1. While Friend is the monarch: a crown on Friend's name, and on no other seat's, in Table, Focus and 3D at 1440x900 and
 *      1024x700, and on the phone at 390x844; it is an image named "the monarch" with its one line on hover, and in 3D the seat's
 *      button says so too.
 *   2. The view moves the crown to Rob: it is on Rob's name, on no one else's, and the callouts say "MONARCH, Friend ⤳ You" once.
 *      Friend carries a long name, so the crown is seen where a name is cut short.
 *   3. A view with no monarch: no crown anywhere, and no space kept for one.
 *   4. The crown makes nothing taller or wider at any of those sizes (no seat tile, pane or page reaches further than with no monarch).
 *   5. Pressing the crown says what the monarch does, in its one line.
 * Needs Playwright and Chromium; GEOMETRY_REQUIRED=1 (CI) turns a missing browser into a failure. */
import assert from "node:assert/strict";
import {readFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {openBrowser, ROOT} from "./uat/browser-runner.mjs";

const {browser, base, stub, close} = await openBrowser({name: "board-monarch", flag: "GEOMETRY_REQUIRED"});
const sample = JSON.parse(readFileSync(path.join(ROOT, "docs/reference/replit-sample-views.json"), "utf8")).views[5];
/* Friend with a long name, so the crown is seen where a name is cut short. */
const LONG = "Friend Archibald Fitzwilliam the Third";
sample.state.players[1].name = LONG;
const html = readFileSync(path.join(ROOT, "index.html"), "utf8").replace("</head>", '<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const table = {tableId: "monarch01", phase: "playing", matchId: sample.matchId, away: [], blockers: [], rules: {},
  seats: sample.state.players.map((p) => ({seatId: p.playerId, name: p.name, kind: p.playerId === sample.seat ? "human" : "ai", you: p.playerId === sample.seat, occupied: true}))};
let checks = 0;
const ok = (c, m) => {assert.ok(c, m); checks += 1;};
const eq = (a, b, m) => {assert.deepEqual(a, b, m); checks += 1;};

/* The same view with the monarch at `seat` (null: no monarch), a revision on. */
const crowned = (seat, revision) => {
  const v = structuredClone(sample); v.revision = revision;
  for (const p of v.state.players) {delete p.monarch; if (p.playerId === seat) p.monarch = true;}
  return v;
};
const FRIEND = 1, ROB = 0;

async function open(mode, width, height) {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion: "reduce", serviceWorkers: "block", hasTouch: width < 500});
  await context.addInitScript((m) => {localStorage.setItem("cm-board-view", m); localStorage.setItem("crankmagic-audio-muted", "true");}, mode);
  const page = await context.newPage(); page.setDefaultTimeout(20000); if (stub) await stub(page);
  const errors = []; page.on("pageerror", (x) => errors.push(x.message));
  await page.route(`${base}/index.html*`, (r) => r.fulfill({contentType: "text/html", body: html}));
  await page.route(`${base}/api/me`, (r) => r.fulfill({json: {email: "monarch@example.com"}}));
  await page.route(`${base}/api/library**`, (r) => r.fulfill({json: {head: null}}));
  await page.route(`${base}/api/tables**`, (r) => r.fulfill({json: {table, now: Date.now()}}));
  await page.route(/\/assets\/environments\/[^/?]+\.webm(\?.*)?$/, (r) => r.abort());
  let socket = null;
  await page.routeWebSocket(/\/api\/tables\/monarch01\/connect$/, (ws) => {socket = ws; ws.send(JSON.stringify({type: "view", view: crowned(FRIEND, 61)}));});
  await page.goto(`${base}/index.html#table?id=monarch01`);
  await page.locator("#cm-board .cm-stage-top, #cm-board .cm-phone-seats").first().waitFor({timeout: 60000});
  await page.waitForTimeout(1200);
  const send = async (v) => {socket.send(JSON.stringify({type: "view", view: v})); await page.waitForTimeout(1500);};
  return {page, context, errors, send};
}
/* Every crown on the page: whose seat it sits in (the nearest seat header, seat slot or seat row), whether it is seen, and its names. */
const crowns = (page) => page.evaluate(() => [...document.querySelectorAll("#cm-board .cm-monarch")].map((el) => {
  const host = el.closest("[data-seat-header],[data-seat]"), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
  const seen = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !el.closest("[inert]");
  return {seat: host ? Number(host.dataset.seatHeader ?? host.dataset.seat) : null, seen, role: el.getAttribute("role"), label: el.getAttribute("aria-label"), title: el.getAttribute("title"), text: el.textContent};
}));
/* Every place the board names a seat, by name: each one that names `seat` says whether it holds a crown. */
const places = (page, seat) => page.evaluate((s) => {
  const at = {name: `.cm-stage-slot[data-seat="${s}"] > .cm-stage-boardname, .cm-stage-rear[data-seat="${s}"] > .cm-stage-boardname`, life: `.cm-stage-life[data-seat="${s}"]`,
    tile: `.cm-board-pane [data-seat-header="${s}"]`, label: `.cm-stage-seat-label[data-seat="${s}"] [data-seat-header]`, self: `.cm-stage-self [data-seat-header="${s}"]`,
    phone: `.cm-phone-seat[data-seat="${s}"]`, vitals: `.cm-full-vitals [data-seat="${s}"]`};
  const out = {};
  for (const [k, sel] of Object.entries(at)) {const els = [...document.querySelectorAll(`#cm-board ${sel.split(", ").join(", #cm-board ")}`)]; if (els.length) out[k] = els.every((x) => !!x.querySelector(".cm-monarch"));}
  return out;
}, seat);
/* How far the page and the seat panes reach: the crown adds nothing to either (measured against the same view with no monarch). */
const scrolls = (page) => page.evaluate(() => {const d = document.scrollingElement; return {page: [d.scrollWidth, d.scrollHeight], panes: [...document.querySelectorAll("#cm-board .cm-board-tile, #cm-board .cm-phone-seat, #cm-board .cm-stage-seat-label, #cm-board .cm-stage-self, #cm-board .cm-stage-life-list")].map((x) => Math.round(x.getBoundingClientRect().height))};});
const shot = async (page, name) => {if (process.env.UAT_SHOTS) {mkdirSync(process.env.UAT_SHOTS, {recursive: true}); await page.mouse.move(3, 3); await page.screenshot({path: path.join(process.env.UAT_SHOTS, `${name}.png`)});}};

const VIEWS = [["table", 1440, 900], ["focus", 1440, 900], ["full", 1440, 900], ["table", 1024, 700], ["focus", 1024, 700], ["full", 1024, 700], ["focus", 390, 844]];
try {
  for (const [mode, width, height] of VIEWS) {
    const where = `${width < 500 ? "phone" : mode} ${width}x${height}`;
    const {page, context, errors, send} = await open(mode, width, height);
    const crownless = await (async () => {await send(crowned(null, 62)); const m = await scrolls(page); await send(crowned(FRIEND, 63)); return m;})();
    /* 1. Friend is the monarch. */
    let all = await crowns(page);
    ok(all.some((c) => c.seen && c.seat === FRIEND), `${where}: a crown is seen on Friend's name (${JSON.stringify(all)})`);
    eq(all.filter((c) => c.seat !== FRIEND), [], `${where}: and on no other seat's`);
    ok(all.every((c) => c.role === "img" && c.label === "the monarch" && c.text.trim() === "♛"), `${where}: each is ♛, an image named "the monarch"`);
    ok(all.every((c) => /draws a card/i.test(c.title || "")), `${where}: with what the monarch does on hover (${JSON.stringify(all[0]?.title)})`);
    const need = width < 500 ? ["phone"] : mode === "full" ? ["label", "life", "tile"] : ["name", "life", "tile"];
    let named = await places(page, FRIEND);
    ok(need.every((k) => k in named), `${where}: Friend is named on the board in ${need.join(", ")} (${JSON.stringify(named)})`);
    ok(Object.values(named).every(Boolean), `${where}: and every place that names Friend holds the crown (${JSON.stringify(named)})`);
    if (mode === "full" && width > 500) {
      const label = await page.locator(`.cm-stage-seat-label[data-seat="${FRIEND}"]`).getAttribute("aria-label");
      ok(/the monarch/.test(label || ""), `${where}: Friend's seat button says Friend is the monarch (${label})`);
    }
    eq(await scrolls(page), crownless, `${where}: the crown makes nothing taller or wider, and nothing scroll that did not`);
    await shot(page, `monarch-${width < 500 ? "phone" : mode}-${width}x${height}-friend`);
    /* 5. Pressing the crown says its line. */
    if (mode === "table" && width === 1440) {
      const told = await page.evaluate(() => {
        const el = [...document.querySelectorAll("#cm-board .cm-monarch")].find((x) => x.getBoundingClientRect().width > 0);
        el.click(); return [...document.querySelectorAll("#cm-board-callouts .cm-callout")].map((x) => x.textContent.replace(/\s+/g, " ").trim());
      });
      ok(told.some((t) => /MONARCH/.test(t) && /draws a card/i.test(t)), `${where}: pressing the crown says what the monarch does (${JSON.stringify(told)})`);
    }
    /* 2. The view moves the crown to Rob, and the callouts say so once. */
    if (width === 1440 && mode === "table") {
      const said = await page.evaluate(([a, b]) => JSON.parse(JSON.stringify(globalThis.CrankBoard.calloutsFor(a, b))), [crowned(FRIEND, 61), crowned(ROB, 62)]);
      const monarch = said.filter((c) => c.word === "MONARCH");
      eq(monarch.map((c) => c.line), [`${LONG} ⤳ You`], `the crown passing from Friend to Rob is called out once, source ⤳ the new monarch (${JSON.stringify(said)})`);
      eq(monarch[0].glyph, "crown", "under the crown's glyph");
      const first = await page.evaluate(([a, b]) => globalThis.CrankBoard.calloutsFor(a, b).filter((c) => c.word === "MONARCH").map((c) => c.line), [crowned(null, 61), crowned(FRIEND, 62)]);
      eq(first, [LONG], "the first monarch is called out by name alone");
      const same = await page.evaluate(([a, b]) => globalThis.CrankBoard.calloutsFor(a, b).filter((c) => c.word === "MONARCH").length, [crowned(FRIEND, 61), crowned(FRIEND, 62)]);
      eq(same, 0, "a view that keeps the monarch calls nothing out");
      const gone = await page.evaluate(([a, b]) => globalThis.CrankBoard.calloutsFor(a, b).filter((c) => c.word === "MONARCH").length, [crowned(FRIEND, 61), crowned(null, 62)]);
      eq(gone, 0, "nor does one with no monarch left");
    }
    await send(crowned(ROB, 64));
    all = await crowns(page);
    ok(all.some((c) => c.seen && c.seat === ROB), `${where}: the crown moves to Rob's name (${JSON.stringify(all)})`);
    eq(all.filter((c) => c.seat !== ROB), [], `${where}: and leaves Friend's`);
    named = await places(page, ROB);
    ok(Object.keys(named).length >= (width < 500 ? 1 : 3) && Object.values(named).every(Boolean), `${where}: every place that names Rob holds the crown (${JSON.stringify(named)})`);
    eq(await scrolls(page), crownless, `${where}: nor on Rob`);
    await shot(page, `monarch-${width < 500 ? "phone" : mode}-${width}x${height}-rob`);
    /* 3. No monarch: no crown, and no space kept for one. */
    const before = await page.evaluate(() => [...document.querySelectorAll("#cm-board .cm-mat-name")].map((x) => x.textContent));
    await send(crowned(null, 65));
    eq(await crowns(page), [], `${where}: with no monarch, no crown anywhere`);
    const after = await page.evaluate(() => [...document.querySelectorAll("#cm-board .cm-mat-name")].map((x) => x.textContent));
    ok(after.every((t) => !t.includes("♛") && t === t.trim()), `${where}: and the names keep no space for one (${JSON.stringify(after)})`);
    ok(before.some((t) => t.includes("♛")) || width < 500 || mode !== "table", `${where}: (the crown was in a seat name before)`);
    eq(errors, [], `${where}: no browser errors`);
    await context.close();
  }
} finally {await close();}
console.log(`board-monarch: ${checks} checks passed — a crown on the monarch's name in Table, Focus, 3D and on the phone, moved by the view, called out once, gone with no monarch (ROB-289).`);
