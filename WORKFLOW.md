---
harness: crankharness
contract: 1
project: CrankHub/crankmagic
tracker:
  kind: linear
  team: ROB
  ready_label: agent-ready
  states:
    todo: Todo
    in_progress: In Progress
    blocked: Blocked
    done: Done
concurrency: 3
branch:
  pattern: agent/<ISSUE-ID>-<slug>
gate:
  local: tools/local-ci.sh <ref> 0
touches:
  default: lane
verify:
  skill: .claude/skills/verify/SKILL.md
  feature_map: .claude/skills/verify/feature-map.md
  pending: ROB-401
caps:
  cycles: 8
  same_failure: 3
  turns: 80
  wall_minutes: 90
---

# How the harness runs CrankMagic

The front matter above is the runtime policy the CrankHarness daemon reads (`CrankHub/crankharness`, `CONTRACT.md`,
part 3; ROB-400, 2026-11-10). The prose below is for the worker it dispatches. `AGENTS.md` says how to build and is
read first; this file only says what the daemon does with an issue and which of `AGENTS.md`'s rules it mechanizes.

## States

The daemon dispatches an issue in **Todo** labeled `agent-ready` whose blockers are all merged and that is not
**Rob's call**; it sets **In Progress** when a worker holds it (the lock, with the `Held by` comment `AGENTS.md`
asks for), **Blocked** when a stop condition is hit (with a note), and **Done** when the issue-level definition of
done is true and the merge agent has merged (`AGENTS.md`, "Done").

## Concurrency

At most 3 sessions at once in this repository (Rob, 2026-11-02), raised only while the first-pass PASS rate and the
post-merge revert rate hold (ROB-420).

## The lease: a lane is the default Touches

An issue's Touches are its lease: nobody else edits those files while it is In Progress. When an issue lists no
Touches, the lease is its **lane**: the files of the Lane label it carries, as the table in `AGENTS.md`, "Lanes",
lists them (`touches.default: lane`). An issue with neither Touches nor a Lane label is not dispatched; the daemon
says so on the issue.

## The branch

A dispatched worker gets its own worktree on `agent/<ISSUE-ID>-<slug>` (`agent/ROB-401-verify-skill`). It merges
`origin/main` in to catch up, never force-pushes, and opens a draft PR whose title starts with the issue key.
Interactive sessions keep `<agent>/<rob-key>-<topic>` (`AGENTS.md`, "The branch belongs to one agent").

## The local gate

Before every push: the suites the change touches (`AGENTS.md`, "Merging to `main`") and `tools/local-ci.sh <ref> 0`,
the scan for secrets and personal addresses and the clean merge with `main`. The Stop hook (ROB-405) runs the same.
PR CI is the eight-shard Tests workflow on GitHub, once the PR is marked ready.

## Verification

`.claude/skills/verify/SKILL.md` and its feature map are ROB-401 and do not exist yet (`verify.pending`). Until they
do, the daemon dispatches only issues whose verification is a suite, and a worker proves a visible change by
`AGENTS.md`'s visual acceptance rules, by hand.
