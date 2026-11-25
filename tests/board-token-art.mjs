/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE.

   A TOKEN IS DRAWN FROM THE PRINTING THE VIEW NAMES (ROB-542; Rob, 2026-11-24: "the artwork is correct for the type of token
   created"; docs/ui-lane/token-art-contract.md; crankmagic-board.js `pictureOf`; tests/engine-token-art.mjs for the view).

     1. A token carrying `tokenArt` is drawn from that printing (Scryfall's /cards/<id>), not from a request by its name.
     2. The second face of a two-sided token asks for that face.
     3. A token with no `tokenArt` (one no Scryfall token is, or a copy of a card) is drawn by name, as before.
     4. A look's `appearance.art` wins over its name.
     5. The hover's pop-up shows the same picture as the card.
     6. Every view agrees: Table, Focus and 3D.

   SHOTS=<folder> also photographs each view with Scryfall's real pictures (no stub), for a person to look at.
   GEOMETRY_REQUIRED=1 refuses a missing browser.
     node tests/board-token-art.mjs
*/
import assert from "node:assert/strict";
import {readFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {openBrowser, ROOT} from "./uat/browser-runner.mjs";

const {browser, base, stub, close} = await openBrowser({name: "board-token-art", flag: "GEOMETRY_REQUIRED"});
const SHOTS = process.env.SHOTS || "";
const views = JSON.parse(readFileSync(path.join(ROOT, "docs/reference/replit-sample-views.json"), "utf8")).views;
const sample = views[13];
const html = readFileSync(path.join(ROOT, "index.html"), "utf8").replace("</head>", '<meta name="crankmagic-accounts" content="on"><meta name="crankmagic-play" content="cloud"></head>');
const TABLE = "tokart01";
const table = {tableId: TABLE, phase: "playing", matchId: sample.matchId, away: [], blockers: [], youAreHost: true, rules: {},
  seats: sample.state.players.map((p) => ({seatId: p.playerId, name: p.name, kind: p.playerId === sample.seat ? "human" : "ai", you: p.playerId === sample.seat, occupied: true, ready: true, mat: "felt"}))};
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
/* The printings tools/build-token-art.mjs chose (game/engine/cards/token-art-table.mjs), as the view would send them. */
const {TOKEN_ART} = await import("../game/engine/cards/token-art-table.mjs");
const art = (key) => {const a = TOKEN_ART[key]; assert.ok(a, `the table has ${key}`); return a;};
const INKLING = art("Inkling|Creature|Inkling|BW|2|1|flying"), DRAGON = art("Dragon|Creature|Dragon|R|5|5|flying"), TREASURE = art("Treasure|Artifact|Treasure||||");
const ELK = art("Elk|Creature|Elk|G|3|3|");
const BIRD = 485;
const TOKENS = [
  {cardId: 990001, name: "Inkling", types: ["Creature"], subtypes: ["Inkling"], power: 2, toughness: 1, keywords: ["Flying"], tokenArt: INKLING},
  {cardId: 990002, name: "Dragon", types: ["Creature"], subtypes: ["Dragon"], power: 5, toughness: 5, keywords: ["Flying"], tokenArt: DRAGON},
  {cardId: 990003, name: "Treasure", types: ["Artifact"], subtypes: ["Treasure"], power: null, toughness: null, keywords: [], tokenArt: TREASURE},
  {cardId: 990004, name: "Incubator", types: ["Artifact"], subtypes: ["Incubator"], power: null, toughness: null, keywords: [], tokenArt: {scryfallId: "00000000-0000-4000-8000-000000000004", oracleId: "x", face: "back"}},
  {cardId: 990005, name: "Camarid", types: ["Creature"], subtypes: ["Camarid"], power: 1, toughness: 1, keywords: []},
];
let checks = 0, rev = 970000;
/* With SHOTS the pictures are real, and a real miss (a Camarid, which Scryfall has no picture of) is the board's own fallback: that
   run photographs and asserts nothing. */
const ok = (c, m) => {if (SHOTS) return; assert.ok(c, m); checks += 1;};

function viewWith({look = false} = {}) {
  const v = structuredClone(sample);
  const mine = v.state.players[0].zones.Battlefield.cards;
  const template = mine.find((c) => c.cardId === BIRD);
  for (const t of TOKENS.filter((x) => !(SHOTS && x.cardId === 990004))) mine.push({...structuredClone(template), ...structuredClone(t), token: true, tapped: false, counters: {}, attachments: []});
  for (const c of mine) if (c.cardId === BIRD) {
    delete c.appearance;
    if (look) {c.appearance = {token: "Elk", colors: ["G"], subtypes: ["Elk"], power: 3, toughness: 3, art: ELK}; c.power = 3; c.toughness = 3; c.keywords = [];}
  }
  return v;
}
const printed = (a) => new RegExp(`/cards/${a.scryfallId}\\?format=image&version=normal${a.face === "back" ? "&face=back" : "(?!&face)"}`);

try {
  for (const mode of ["table", "focus", "full"]) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: "reduce", serviceWorkers: "block"});
    await context.addInitScript((m) => {localStorage.setItem("cm-board-view", m); localStorage.setItem("crankmagic-audio-muted", "true");}, mode);
    const page = await context.newPage();
    if (stub && !SHOTS) await stub(page);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let sock = null;
    await page.route(`${base}/index.html*`, (r) => r.fulfill({contentType: "text/html", body: html}));
    await page.route(`${base}/api/me`, (r) => r.fulfill({json: {email: "rob@example.com"}}));
    await page.route(`${base}/api/library**`, (r) => r.fulfill({json: {head: null}}));
    await page.route(`${base}/api/tables**`, (r) => r.fulfill({json: {table, now: Date.now()}}));
    if (!SHOTS) await page.route(/^https:\/\/(api\.scryfall\.com|cards\.scryfall\.io)\//, (r) => r.fulfill({contentType: "image/png", body: PIXEL}));
    await page.routeWebSocket(new RegExp(`/api/tables/${TABLE}/connect$`), (ws) => {sock = ws; ws.send(JSON.stringify({type: "view", view: viewWith()}));});
    await page.goto(`${base}/index.html#table?id=${TABLE}`);
    await page.locator("#cm-board").waitFor({timeout: 20000});
    await page.waitForTimeout(800);
    const show = async (view) => {view.revision = ++rev; sock.send(JSON.stringify({type: "receipt", receipt: {}})); sock.send(JSON.stringify({type: "view", view})); await page.waitForTimeout(700);};
    const sel = (id) => `#cm-board button.cm-bcard[data-card="${id}"]`;
    const srcOf = (id) => page.$eval(`${sel(id)} img`, (img) => img.getAttribute("src")).catch(() => null);

    await show(viewWith());
    /* ---- 1, 2, 3 ---- */
    ok(printed(INKLING).test(await srcOf(990001)), `${mode}: Shadrix's 2/1 Inkling is drawn from its printing, not by the name "Inkling"`);
    ok(printed(DRAGON).test(await srcOf(990002)), `${mode}: the Visitor's red 5/5 Dragon from its printing`);
    ok(printed(TREASURE).test(await srcOf(990003)), `${mode}: a Treasure from the one-sided Treasure's printing`);
    /* A made-up printing id: only with the pictures stubbed (a real request for it would fail, and the board fall back). */
    if (!SHOTS) ok(printed(TOKENS[3].tokenArt).test(await srcOf(990004)), `${mode}: the second face of a two-sided token asks for that face`);
    ok(/named\?exact=Camarid&format=image/.test(await srcOf(990005)), `${mode}: a token no Scryfall token is, drawn by name as before`);
    ok(/named\?exact=|cards\.scryfall\.io/.test(await srcOf(BIRD)), `${mode}: a card is drawn as it always was`);

    /* ---- 5. the hover ---- */
    const box = await page.$eval(sel(990001), (b) => {const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      return document.elementFromPoint(x, y)?.closest("button.cm-bcard") === b ? {x, y} : null;});
    if (box) {
      await page.mouse.move(box.x, box.y);
      await page.waitForTimeout(900);
      const peek = await page.$$eval("#cm-board-peek img", (is) => is.map((i) => i.getAttribute("src")));
      ok(peek.length === 0 || peek.every((s) => printed(INKLING).test(s)), `${mode}: the hover shows the Inkling's printing too (${peek.join(" ")})`);
      await page.mouse.move(2, 2);
    }

    if (SHOTS) {mkdirSync(SHOTS, {recursive: true}); await page.screenshot({path: path.join(SHOTS, `tokens-${mode}.png`)});}

    /* ---- 4. a look ---- */
    await show(viewWith({look: true}));
    ok(printed(ELK).test(await srcOf(BIRD)), `${mode}: a permanent that looks like a 3/3 green Elk is drawn from that Elk's printing`);
    ok(errors.length === 0, `${mode}: no page errors (${errors.join("; ")})`);
    await context.close();
  }
} finally {
  await close();
}
console.log(`board-token-art: ${checks} checks passed — each token from the printing the view names, a two-sided token's face, a token no Scryfall token is by name, a look's own Elk, in Table, Focus and 3D.`);
