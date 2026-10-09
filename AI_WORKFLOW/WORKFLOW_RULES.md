# BAX Sifarişlər — AI Development Workflow Rules

## Purpose

This repository uses a controlled AI development workflow.

The workflow has four logical roles:

1. Coordinator
2. Planner
3. Coder
4. Reviewer

Only one implementation task may be active at a time.

The repository files under `AI_WORKFLOW/` are the source of truth for workflow state.

---

# 1. Coordinator

The Coordinator decides what happens next.

The Coordinator:

- reads `PLAN.md`;
- reads `STATE.json`;
- reads `CURRENT_TASK.md`;
- reads `LAST_REPORT.md` when available;
- checks the current git state;
- selects only one task at a time;
- never silently skips a failed task;
- never invents business decisions;
- respects all Human Decisions / Blockers in `PLAN.md`.

The Coordinator continues to the next task automatically when:

- the current task has passed review;
- no human-decision gate applies;
- the next task does not contain destructive or business-sensitive operations.

The owner asked (2026-09-24) for the queue to run end to end, so this is the expected path rather than a permitted
exception. A queued task having no specification is not a gate — the Planner writes it.

The Coordinator must stop when human approval is required, which now means only the §7 data gates below and a genuine
contradiction between the workflow files.

---

# 2. Planner

The Planner turns an approved high-level task into an implementation-ready specification.

The Planner:

- reads `PLAN.md`, `STATE.json`, `CURRENT_TASK.md` and `LAST_REPORT.md`;
- reads every relevant specification under `AI_WORKFLOW/TASKS/`;
- inspects the repository read-only, using evidence rather than assumption;
- writes or updates exactly one specification, `AI_WORKFLOW/TASKS/TASK-XX.md`;
- preserves previously accepted behavior.

The Planner may modify only workflow and task-specification files under `AI_WORKFLOW/`.

The Planner may inspect the repository read-only.

## The owner brief is mandatory input

The owner's business requirements for Tasks 04–16 are settled and recorded in `AI_WORKFLOW/BRIEFS/`, one file per
task, extracted verbatim from `BRIEFS/OWNER_BRIEFS_MASTER.md`. That master document, including its closing journal of
the twenty owner decisions (4.1 … 16.1), is the canonical business source-of-truth for this repository.

The Planner **must** read `AI_WORKFLOW/BRIEFS/TASK-XX.md` before writing `TASKS/TASK-XX.md`. This is a hard rule, not
a preference. A specification produced without its brief is invalid and the Reviewer must reject it.

The brief decides what and why. The Planner decides how, from the repository as it stands now and from the tasks
already accepted. The Planner may not invent a business rule, contradict the brief, drop an acceptance criterion,
reintroduce a problem an earlier task solved, or substitute its own preference for an owner decision.

If the brief file is missing: `HUMAN_REQUIRED`, reason `TASK_XX_BRIEF_MISSING`, and no reconstruction from memory.

If the brief cannot be satisfied against the repository without changing an owner decision: `HUMAN_REQUIRED`, stating
the brief line, the repository fact, and why no implementation satisfies both.

The briefs are immutable planning input. No role may edit anything under `AI_WORKFLOW/BRIEFS/`. Only the owner
changes a brief.

The Planner must never invent a business decision.

The Planner must NOT:

- implement the task;
- modify application code;
- modify the database;
- run real-data migrations;
- execute the Coder;
- mark a task accepted.

If planning exposes a business or data ambiguity that needs the owner:

- do not guess;
- set the state to `HUMAN_REQUIRED`;
- record the exact question;
- do not mark the task `READY`.

The Planner transitions `PLANNING` to `READY` only when the specification is complete and no human blocker remains.

---

# 3. Coder

The Coder implements ONLY `CURRENT_TASK.md`.

Before coding, the Coder must read:

- `AI_WORKFLOW/WORKFLOW_RULES.md`
- `AI_WORKFLOW/PLAN.md`
- `AI_WORKFLOW/STATE.json`
- `AI_WORKFLOW/CURRENT_TASK.md`
- `CLAUDE.md` if it exists

The Coder must inspect the existing implementation before changing code.

The Coder must preserve all previously accepted behavior unless the current task explicitly changes it.

The Coder must NOT:

- choose the next task;
- mark its own task accepted;
- edit acceptance criteria to make the implementation pass;
- silently change business rules;
- implement work outside the current task;
- push or merge to remote branches;
- bypass a HUMAN_REQUIRED state.

When implementation is complete, the Coder must:

1. run task-specific tests;
2. run relevant backend tests;
3. run relevant frontend tests;
4. run backend build;
5. run frontend build;
6. inspect `git diff`;
7. record failures honestly;
8. write the complete result to `AI_WORKFLOW/LAST_REPORT.md`.

The Coder then stops.

---

# 4. Reviewer

The Reviewer is independent from the Coder.

The Reviewer must read:

- `AI_WORKFLOW/WORKFLOW_RULES.md`
- `AI_WORKFLOW/PLAN.md`
- `AI_WORKFLOW/STATE.json`
- `AI_WORKFLOW/CURRENT_TASK.md`
- `AI_WORKFLOW/LAST_REPORT.md`
- the actual `git diff`

The Reviewer must verify the actual repository state, not trust the Coder report blindly.

The Reviewer must NOT modify application code.

The Reviewer may modify only workflow files under `AI_WORKFLOW/`.

The Reviewer checks:

- every acceptance criterion;
- regression risk;
- builds;
- tests;
- task scope;
- unexpected code/data changes;
- whether a human-decision gate was crossed.

If anything fails:

- set state to `FIX_REQUIRED`;
- keep the same numbered task active;
- replace `CURRENT_TASK.md` with a focused correction task;
- do NOT advance `PLAN.md`.

If everything passes:

- mark the current task accepted in `PLAN.md`;
- record the accepted commit only after a commit exists;
- select the next queued task;
- determine whether that next task may run automatically or needs human approval.

---

# 5. Workflow States

## STATE.json must stay parseable

`AI_WORKFLOW/STATE.json` is parsed as JSON by the runner, not only read by a model. A role that writes it must
leave a file a strict JSON parser accepts.

- Every double quote inside a string value must be escaped as `\"`. Do not paste a quoted label — a screen word
  such as "Xeyr", a column heading, a button caption — straight into `reason`; name it without quotes instead.
- No raw newline or tab inside a value, and no trailing comma.
- After writing `STATE.json`, read it back and confirm it still parses.

A broken `STATE.json` does not stop the run visibly. The runner reads every field as empty, so the accepted commit
hash is never recorded and the Coder's permission profile is built without its task number — a data task would
silently lose its migration tool. Only a hand repair by the owner brings it back.

Allowed workflow states:

## SETUP

Workflow files are still being configured.

No implementation may start.

## PLANNING

The next numbered task is selected, but its implementation specification has not yet been prepared or refreshed.

No Coder may execute in this state.

Planner may run.

## READY

A current task exists and is allowed to start automatically.

## RUNNING

The Coder is implementing the current task.

## REVIEW

Implementation is complete and awaiting independent review.

## FIX_REQUIRED

The implementation failed one or more acceptance criteria.

The same numbered task remains active.

## HUMAN_REQUIRED

The workflow is blocked until the human owner explicitly decides or approves something.

No implementation may continue past the blocked point.

## DONE

All planned tasks and the final audit are complete.

---

# 6. Automatic Work Allowed

The workflow may normally continue automatically for:

- application-code changes within an approved task;
- unit tests;
- integration tests;
- UI changes;
- refactoring required by the current task;
- formatting;
- build fixes caused by the current implementation;
- documentation updates directly related to the current task;
- read-only repository inspection.

These are allowed only when they do not conflict with a human gate.

---

# 7. Data Safety

The owner asked (2026-09-24) to be out of the loop entirely: no specifications to write, no questions to answer, no
approvals to click. So this section no longer stops to ask. What replaced the asking is the machinery that actually
protected the data in Task 3 — a backup, a dry run, an invariant check over 38,517 figures and an apply that is
idempotent. A human clicking yes never verified any of that; the tool did.

This was put to the owner a second time, with the trade-off stated plainly — that the only task it affects is Task 13,
and that a wrong alias merge corrupts the catalogue in a way `--verify` cannot catch because the figures still add up.
The owner confirmed it on 2026-09-24 ("Belə qalsın"), and it is recorded as HD-004 in `PLAN.md`. Do not reopen it, and
do not quietly reintroduce an approval step because a task looks risky.

For Task 13 specifically, the protection now lives in the owner's own brief rather than here: decision 13.1 forbids
automatic blind merging, and 13.2 requires an admin or data manager to approve each match inside the product. Those
are requirements the Planner must carry into `TASKS/TASK-13.md`, not optional advice.

## Real business data may only be changed through a migration tool

Never through loose SQL, never through `dotnet ef`, never through a one-off script. A task that changes real data
builds a tool in `tools/`, modelled on `tools/BaxOrders.CatalogueMigration`, with the same five fixed commands:

1. `--inspect` — read what is actually there, and every reference to it;
2. `--dry-run` — print the exact plan, change nothing;
3. `--backup` — a fresh dump, taken in the same run, immediately before the apply;
4. `--apply` — one transaction, under a table lock, refusing to run without that day's backup, re-reading the plan
   afterwards and rolling back if anything is left outstanding;
5. `--verify` — assert every figure that must not change, by hash where possible.

The five run in that order, every time. `--apply` a second time must change nothing.

## What must still be true afterwards

The task's specification names the figures that must not move, and `--verify` proves it. Orders, order lines, prices,
pricing classifications and users are never touched unless the task is explicitly about them. HD-002's 94 rows stay
untouched until the owner decides.

## Still stop for these

- production deployment;
- push or merge to a remote;
- destructive Git operations — `reset --hard`, `clean`, force-push, history rewriting;
- secrets or credential changes;
- actions where the task specification itself says STOP.

A local commit is not a destructive Git operation: nothing is pushed, and `git reset` undoes it.

## Resolving aliases and business meaning

Merging two product, location or supplier names because they look alike is still forbidden — not because it needs
approval, but because likeness is not evidence. Use recorded evidence: `docs/business-decisions.md`, the import data,
an existing alias. Where no evidence exists, leave the pair unresolved, list it in the report, and move on. An
unresolved pair costs nothing; a wrong merge silently corrupts the catalogue and is the one mistake `--verify` cannot
catch, because the figures still add up.

Read-only investigation is always allowed.

---

# 8. Database Rules

Database changes require extra caution.

Allowed automatically only when explicitly part of an approved task:

- read-only queries;
- schema inspection;
- tests against isolated test databases;
- migrations against disposable/test databases.

Human approval is required before:

- destructive changes to real data;
- deleting catalogue entities referenced by real data;
- bulk classification/reclassification of real rows;
- irreversible migrations.

Before an approved real-data migration:

1. inspect references;
2. produce a dry-run plan;
3. create/verify a backup when required;
4. identify rollback strategy;
5. apply only the approved data change;
6. verify invariants afterwards.

---

# 9. Git Rules

Do not push automatically.

Do not merge automatically.

Do not rewrite shared history.

The Coder leaves implementation changes available for review. The Coder never commits.

A task that passes review is committed automatically (owner's decision, 2026-09-24). The Reviewer writes
`AI_WORKFLOW/COMMIT_MESSAGE.txt`; the runner commits with it and records the hash in `STATE.json`. No role holds
`git commit` — the runner does, and it can only commit the tree a review just passed. A review that fails or stops
writes no message, so nothing is committed.

Commits stay local. Nothing is ever pushed, and a commit is undone with `git reset` if the owner disagrees, which is
why committing automatically is safe in a way that changing the database is not.

The workflow's own files — `AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1` — are never part of a task's commit.
They are infrastructure, and mixing them into a task's diff would make that diff unreviewable.

Workflow setup itself must not commit unless the human owner explicitly asks.

---

# 10. Scope Control

One numbered task at a time.

## Task order is fixed

```
04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 16 → 15
```

This is the owner's order, and `BRIEFS/OWNER_BRIEFS_MASTER.md` gives the dependency behind each step. Note that
**16 comes before 15**, and **Task 15 is always last** — it is the final audit and it can only be run once
everything it audits exists. No role may reorder this, skip a task, or start a later task because an earlier one
looks hard. The Reviewer selects the next task from this sequence and from nowhere else.

A few dependencies are worth stating here, because getting them backwards would waste a whole task:

- **Task 04 creates the Rəhbər role and the approval authority.** Task 14 does not create it — it applies menu and
  visibility rules to the role that already exists (owner decisions 4.3, 4.3a, 14.2).
- **Task 07** calculates a product's contribution share across individual product effects in the same direction:
  the top product's effect divided by the sum of all product effects pointing the same way (7.1, 7.1a).
- **Task 13** represents an approved variant transition as a single "variant dəyişib" line, and doing so must not
  change the overall monetary total (13.1a).
- **Task 15** cannot start while any pricing classification is unresolved, and rows reading
  "Alış qiyməti tələb olunur" with no price entered count as unresolved (15.2, 15.2a).
- **Task 09** owns the colour rule — cost increase red, decrease green, as direction rather than good or bad (9.1) —
  and Tasks 06, 07, 08, 10 and 11 apply it rather than inventing their own.

If the Coder discovers another bug:

- record it in `LAST_REPORT.md`;
- do not fix it unless required for the current task;
- the Coordinator decides whether it becomes a correction or later task.

A correction discovered during review stays under the same task number.

Example:

Task 6
→ review fails
→ Task 6 correction

NOT:

Task 6
→ review fails
→ Task 7

---

# 11. Acceptance

A task is accepted only when the independent Reviewer confirms:

- all explicit acceptance criteria pass;
- required builds pass;
- required tests pass;
- no unexpected data change occurred;
- no unrelated application change occurred;
- no human gate was bypassed.

The Coder cannot accept its own work.

---

# 12. Final Principle

Never make the system appear correct by changing tests, expected values, classifications or business rules without evidence.

When uncertain:

STOP with `HUMAN_REQUIRED` rather than inventing a business decision.
