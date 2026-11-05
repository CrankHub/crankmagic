# Bulk load: the instruction set (written 2026-11-05, to run once PR 998 and the Rakdos deck PR have merged)

Rob, 2026-11-05: *"Then identify all other cards that can be playtest-only candidates, and create a bulk load instruction set that you'll
run once we're done with the current work."*

This is that set. Nothing in it has been run: no candidate is promoted, no lane is started, no API key is used. The measurements are in
`bulk-load.json` beside it (`library-bulk-load@1`), taken 2026-11-05 on the tree of the Rakdos deck PR.

## What a "playtest-only candidate" is, and how many there are

The card compiler (`game/tools/card-compiler.mjs`) translates a Commander card from the sentences the defined cards already write; one
that compiles, is its oracle text and plays its smoke game is stored as a **candidate** (`data/engine/candidates.json`). A candidate
seats at **playtest tables only**, labeled, with a "report a wrong card" link (`docs/engine/plan-card-load-program.md`, Rob's decision 2,
2026-10-14) until a wave reviews it and promotes it into the card directory, where it is final and every table plays it.

| Of | Cards |
| --- | ---: |
| Commander cards the directory does not define | 25,578 |
| **Playtest-only candidates the compiler makes now** | **128** (it made 100 before this load: the 23 new cards taught it sentences) |
| of them in the most-played 80% of Commander (`data/engine/top-cards.json`, 3,239 cards) | 3: Muddle the Mixture, Canopy Tactician, Claim the Precious |
| Refused (a second reading of the text lost a way) or blocked (a rule not built) | 5 and 2 |
| With a sentence no defined card writes | 24,374, of them **12,086 one sentence short** |
| Of another layout (two-faced, adventure, meld) | 1,069 |
| Rob's own collection (`data/live-load.json`, 1,011 cards): final / candidate / unloaded | 1,010 / 0 / 1 (Extrapolate the Impossible) |
| The most-played 80% that no table plays yet | 1,233 (471 one sentence short), dealt into 45 lanes of seven themes |

So the candidates are few; the cheap bulk is the **12,086 cards one sentence short**, and the 40 sentences in `bulk-load.json`
(`sentencesToTeach`) complete 287 of them between them (Swampwalk alone 24, Mountainwalk 15, Wither 13).

## Before anything

1. PR 998 (ROB-441, Master Table column AL) and the Rakdos deck PR (ROB-442) are merged to main, by Rob. Nothing here is built on an
   unmerged branch.
2. A fresh worktree from `origin/main`; a `node_modules` junction (memory: the local CI toolchain on Personal-HP).
3. Linear: one issue per wave below (ROB-<n>), each PR's title starting with it; the loop is `one-loop` (`AGENTS.md`).
4. Read `docs/engine/plan-card-load-program.md` ("Running a lane": one step, one session, one PR; read narrowly; report briefly).

## Wave A: promote the 128 candidates (no tokens)

Four sessions or one: 40, 40, 40, 8, most-wanted first. For each:

```bash
node --stack-size=4000 game/tools/card-compiler.mjs --write
node --stack-size=4000 game/tools/card-waves.mjs --review --top 40 --out docs/engine/waves/<date>-bulk-A<n>.md
```

Read the sheet: for each card, is every ability its sentence, and is what the game showed what the card does? Keep the ones that are
(a keyword-only card such as Dalek Squadron is a quick yes); a candidate that is wrong teaches the library a wrong sentence, so a doubtful
one is **not promoted** and gets a line in the sheet saying why. Then:

```bash
node --stack-size=4000 game/tools/card-waves.mjs --promote "Card One,Card Two"
node --stack-size=4000 game/tools/engine-definitions.mjs --write && node --stack-size=4000 game/tools/card-compiler.mjs --write && node --stack-size=4000 game/tools/engine-candidates.mjs --write
node --stack-size=4000 game/tools/engine-coverage.mjs --write
node --stack-size=4000 game/tools/batch/check-cards.mjs
node --stack-size=4000 tests/card-waves.mjs
```

A promoted card's drafted scenario is its first; add a second where an edge is plain (as the two keyword cards of the Rakdos load still
want a myriad scenario each). Each promotion teaches the library, so **rerun the compiler between waves**: the next wave's list moves
(this load moved it from 100 to 128).

## Wave B: teach the sentences (hand, one card per sentence)

For each row of `sentencesToTeach` in `bulk-load.json`, most cards completed first:

1. Pick the card of that sentence that is cheapest to write and play (the compiler lists the cards one sentence short in
   `node game/tools/card-compiler.mjs --report <dir> --date <date>`; read `<dir>/card-compiler-<date>.md`, "The next sentences to teach").
2. Write it by hand with scenarios, as the Rakdos load did (`game/tools/batch/cardlib.py`, `Batch.write`; the interaction census
   `node --stack-size=4000 game/tools/interaction-census.mjs --card "<name>"` clean; a breaks file with `missed: []`).
3. `card-compiler --write`: every card that was one short of that sentence is now a candidate; send them through Wave A.

A sentence that needs a rule the engine lacks (Banding, Buyback, Retrace, Enlist, Unleash...) is a rule first, built and proved as this
load built soulbond, blitz and the coin flip, and its cards follow.

## Wave C: the lanes (hand; 1,233 most-played cards, 45 lanes)

```bash
node tools/library-engine-index.mjs --top 3239 --out <scratch>/idx
```

writes `index.json` and a file per lane (`L1-walkers-1` ... `L45-spells-8`, 22 to 30 cards each, one theme per lane so one lane owns the
rules its cards need): walkers 104, stack 75, graveyard 225, combat 274, mana 121, tokens 196, spells 239 (`lanes` in `bulk-load.json`).
One lane is one session and one PR: copy its file to `docs/engine/card-load-<lane>-<date>/lane-<lane>.json`, write the cards, prove with
`node tools/library-engine-index.mjs --check-lane <that file>` (exit 0 when every card is final), the lane's suite and breaks file.
Start with `L5-stack-1`, the lane that holds Rob's one unloaded owned card, Extrapolate the Impossible.

## Wave D: the backstop (needs Rob; not before)

`game/tools/engine-compile.mjs` writes the sentences the library lacks through the API. It needs Rob's key and spends nothing without
`--yes`; its cap is `--max-cost`, and **Rob sets it** (`plan-card-load-program.md`, "Still Rob's to set"). Until then this wave is not run.

## Gates for every PR of the bulk load

- `node --stack-size=4000 game/tools/batch/check-cards.mjs` (every definition and scenario) and the lane/wave suites.
- `node game/tools/engine-definitions.mjs --check` (the bundle and the support ledger) and `node game/tools/engine-candidates.mjs --check`.
- `node tools/library-engine-index.mjs --check-lane <lane file>`.
- The gameplay-gap list (`docs/engine/gameplay-gaps-2026-10-21.md`) gets a row for every **ignore** and for every fix; "fix" means the
  behavior is now correct, a skip is an ignore and is named so (Rob's glossary).
- `tools/local-ci.sh HEAD 0` before push; GitHub Actions is the gate (Rob, 10-01); a merge commit, not a rebase.
- Linear: a comment on each issue with the proof, and the status current.

## What stays Rob's

Promotion into the directory (a reviewer's reading is the proof, the PR is Rob's to merge), the API cap, and which waves to run first.
