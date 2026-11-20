/* Copyright (c) 2026 Rob Minor. All rights reserved. See LICENSE. */
/* ROB-205: every pending decision has a Cancel that exits it, through the room as the board sees it (CrankRoomView@1).
 *
 * Rob, 2026-10-29: every pending decision gets a Cancel that exits the action (two playtest games of Oct 28 ended on a trigger
 * prompt with no way out). Rob, 2026-11-19: "If I press 'Cancel' that means I'm canceling the action. I DON'T want to resume
 * it." The room's view says, on the seat's own question, how it may be canceled (`decision.cancel`), and `room.cancel` does it:
 *   - back-out: Tezzeret's Gambit stopped to ask what pays for it is backed out -- the game exactly as before the cast, Rob at
 *     priority again, the card in his hand, no land tapped, no life paid, and no history line naming a card from his hand;
 *   - confirm, trigger: Orcish Bowmasters' enter trigger, asking its target, leaves the stack -- no damage, no Orc Army -- and
 *     the history says so (Rob's decision 6 of 2026-11-19);
 *   - confirm, resolution: Cultivate, asking which lands, ends there and goes to the graveyard, no land moved;
 *   - refused: the held draw can't be canceled, and the refusal says what to do (AGENTS.md, refused with instructions);
 *   - holding priority is not a question to cancel; a stale question id is refused as stale.
 * Each table replays identically from its tape (the cancel is on it).
 */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {memoryStorage} from "../game/engine/storage.mjs";
import {loadCardIndex} from "../game/tools/engine-cards.mjs";
import {startRoom, basicCards, RoomError} from "../game/room/room.mjs";
import {replayMatch} from "../game/room/replay.mjs";

let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks += 1; };
const ok = (c, m) => { assert.ok(c, m); checks += 1; };

const index = loadCardIndex();
const cards = (n) => n === "Commander" ? {types: ["Creature"], power: 1, toughness: 1, manaCost: "{9}"} : index.definition(n) ?? basicCards(n);
const GAMBIT = "Tezzeret's Gambit", BOWMASTERS = "Orcish Bowmasters", CULTIVATE = "Cultivate";
for (const name of [GAMBIT, BOWMASTERS, CULTIVATE]) ok(index.definition(name), `${name} is a card the table plays`);

async function table(matchId, deck, pod = {}) {
  const storage = memoryStorage();
  const room = await startRoom({storage, matchId, cards, seed: matchId, pod: {...pod, seats: [
    {seatId: "rob", name: "Rob", pilot: "human", commander: ["Commander"], cards: Array.from({length: 99}, (_, i) => deck(i))},
    {seatId: "maya", name: "Maya", pilot: "human", commander: ["Commander"], cards: Array.from({length: 99}, () => "Forest")}]}});
  return {room, storage, matchId};
}
const view = (room) => room.view(room.waitingOn);
const act = (room, v, option) => room.act(v.seatId, {kind: "answer", actionId: randomUUID(), revision: v.revision, choiceId: v.decision.id, indices: [option.index]});
const lands = (v) => v.state.players[0].zones.Battlefield.cards.filter((c) => c.types.includes("Land"));
const hand = (v) => (v.state.players[0].zones.Hand?.cards ?? []).map((c) => c.name);
/* Play lands and pass until `stop` says so; a question that is not priority is answered with its first option. */
async function until(room, stop) {
  for (let n = 0; n < 600; n += 1) {
    const v = view(room);
    if (stop(v)) return v;
    const options = v.decision.options;
    await act(room, v, (v.seatId === "rob" && options.find((o) => o.act === "play-land")) || options.find((o) => o.act === "pass") || options[0]);
  }
  throw new Error("never reached: " + JSON.stringify({seat: view(room).seatId, turn: view(room).state.turn, phase: view(room).state.phase}));
}
const casting = (name, landsNeeded) => (v) => v.seatId === "rob" && v.decision.kind === "priority" && lands(v).length >= landsNeeded
  && lands(v).every((c) => !c.tapped) && v.decision.options.some((o) => o.act === "cast" && o.label === name);
async function refusedWith(promise, status) {
  try {await promise;} catch (error) {ok(error instanceof RoomError, "refused as the room's own error"); eq(error.status, status, `refused ${status}`); return error.message;}
  throw new Error("expected a refusal");
}
const replays = async ({storage, matchId}) => (await replayMatch({storage, matchId, cards})).same;

{
  /* BACK-OUT: Rob's own cast, asking what pays for it. */
  const t = await table("cancel-back-out", (i) => (i % 2 === 0 ? GAMBIT : i % 4 === 1 ? "Wastes" : "Island"), {pooledTaps: true, xTaps: true, phyrexianTaps: true});
  let v = await until(t.room, (x) => casting(GAMBIT, 4)(x) && lands(x).some((c) => c.name === "Island") && lands(x).filter((c) => c.name === "Wastes").length >= 3);
  const before = {fingerprint: t.room.fingerprint().hash, hand: hand(v), life: v.state.players[0].life, history: v.history.length};
  ok(!v.decision.cancel, "holding priority carries no Cancel: passing is how a person declines to act");
  eq(await refusedWith(t.room.cancel("rob", {choiceId: v.decision.id}), 422), "Holding priority is not a question to cancel: pass, or choose an action.", "and canceling it is refused, saying what to do");
  await act(t.room, v, v.decision.options.find((o) => o.act === "cast" && o.label === GAMBIT));
  v = view(t.room);
  eq(v.decision.title, `${GAMBIT}: what to tap for it`, "the cast stops to ask what pays for it");
  eq(v.decision.cancel, {way: "back-out"}, "and its Cancel backs the cast out at once: no Resume, no confirmation");
  await refusedWith(t.room.cancel("rob", {choiceId: "choose-cost:stale"}), 409);
  await refusedWith(t.room.cancel("maya", {choiceId: v.decision.id}), 409);
  await t.room.cancel("rob", {choiceId: v.decision.id});
  v = view(t.room);
  eq(t.room.fingerprint().hash, before.fingerprint, "backed out: the game is exactly as it was before the cast");
  eq([v.seatId, v.decision.kind, hand(v), v.state.players[0].life, lands(v).filter((c) => c.tapped).length], ["rob", "priority", before.hand, before.life, 0],
    "Rob holds priority again, the Gambit in his hand, no land tapped, no life paid");
  ok(v.decision.options.some((o) => o.act === "cast" && o.label === GAMBIT), "and may cast it again");
  eq(v.history.length, before.history, "no history line: the cast never happened, and the card is in his hand");
  ok(await replays(t), "the match replays identically, the cancel on its tape");
}
{
  /* CONFIRM, TRIGGER: Orcish Bowmasters' enter trigger, asking its target. */
  const t = await table("cancel-trigger", (i) => (i % 3 === 0 ? BOWMASTERS : "Swamp"));
  let v = await until(t.room, casting(BOWMASTERS, 2));
  await act(t.room, v, v.decision.options.find((o) => o.act === "cast" && o.label === BOWMASTERS));
  v = await until(t.room, (x) => x.seatId === "rob" && x.decision.id.startsWith("trigger-targets:"));
  const life = v.state.players.map((p) => p.life), stack = v.state.stack.length;
  eq(v.decision.cancel, {way: "confirm", ends: "trigger"}, "an owed answer: Cancel asks to confirm, and Confirm cancel ends the trigger");
  await t.room.cancel("rob", {choiceId: v.decision.id});
  v = view(t.room);
  eq(v.state.players.map((p) => p.life), life, "no damage dealt");
  eq(v.state.stack.length, stack - 1, "the trigger left the stack");
  ok(!v.state.players[0].zones.Battlefield.cards.some((c) => /Orc Army/.test(c.name)), "and nothing after it happened: no Orc Army");
  ok(v.state.players[0].zones.Battlefield.cards.some((c) => c.name === BOWMASTERS), "Orcish Bowmasters stays on the battlefield");
  eq(v.history.at(-1)?.text ?? v.history.map((l) => l.text).find((x) => /canceled/.test(x)), `Rob canceled the ${BOWMASTERS} trigger · it left the stack`, "the table reads it in the history");
  ok(v.decision, "and the game goes on: someone is asked something");
  ok(await replays(t), "the match replays identically");
}
{
  /* CONFIRM, RESOLUTION: Cultivate, asking which lands. */
  const t = await table("cancel-resolution", (i) => (i % 4 === 0 ? CULTIVATE : "Forest"));
  let v = await until(t.room, casting(CULTIVATE, 3));
  const library = v.state.players[0].zones.Library?.count ?? v.state.players[0].libraryCount;
  await act(t.room, v, v.decision.options.find((o) => o.act === "cast" && o.label === CULTIVATE));
  v = await until(t.room, (x) => x.seatId === "rob" && x.decision.kind !== "priority" && !String(x.decision.id).startsWith("choose-cost"));
  eq(v.decision.cancel, {way: "confirm", ends: "resolution"}, `${CULTIVATE}'s own question: Confirm cancel ends the rest of it`);
  const field = lands(v).length;
  await t.room.cancel("rob", {choiceId: v.decision.id});
  v = view(t.room);
  eq(lands(v).length, field, "no land put onto the battlefield");
  ok((v.state.players[0].zones.Graveyard?.cards ?? []).some((c) => c.name === CULTIVATE), `${CULTIVATE} finished resolving: in the graveyard`);
  eq(v.state.stack.length, 0, "and off the stack");
  ok(v.history.some((l) => l.text === `Rob canceled the rest of ${CULTIVATE}`), "the table reads it in the history");
  ok(library !== undefined, "the library was read");
  ok(await replays(t), "the match replays identically");
}
{
  /* REFUSED: the held draw is no question to cancel. */
  const t = await table("cancel-refused", () => "Swamp", {drawBeat: true});
  const v = await until(t.room, (x) => x.seatId === "rob" && String(x.decision.id).startsWith("draw:"));
  eq(v.decision.cancel, {way: null, why: "Your draw can't be canceled: draw a card to go on."}, "the view says why, before anything is pressed");
  const before = t.room.fingerprint();
  eq(await refusedWith(t.room.cancel("rob", {choiceId: v.decision.id}), 422), "Your draw can't be canceled: draw a card to go on.", "refused, saying what to do instead");
  eq(t.room.fingerprint(), before, "and nothing changed: not the game, not the tape");
  eq(view(t.room).decision.id, v.decision.id, "the same question is still his");
}
console.log(`room-cancel-decision: ${checks} checks passed`);
