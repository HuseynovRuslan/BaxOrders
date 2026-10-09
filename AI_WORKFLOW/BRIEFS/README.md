# Owner briefs — immutable planning input

`OWNER_BRIEFS_MASTER.md` is the canonical owner and business source-of-truth for Tasks 04–16. It was approved by the
owner and placed here on 2026-09-24, and it carries its own provenance: the Ənvər müəllim audit of 23.09.2026, the
agreements from Tasks 1, 1b, 1c, 2 and 3, and the owner decisions 4.1 … 16.1, whose journal closes the document.

`TASK-XX.md` in this folder is that task's section of the master, extracted **verbatim** — byte for byte. The
extraction was verified by concatenating all thirteen files and comparing them with lines 26–749 of the master:
53,111 bytes, identical. Nothing was summarised, reworded or improved.

## These files are read-only for every role

No Coordinator, Planner, Coder or Reviewer may edit anything in this folder. The runner denies it. Only the owner
changes a brief, and a changed brief is a new approved document, not an edit made mid-run.

## How they are used

The Planner reads `BRIEFS/TASK-XX.md` before writing `TASKS/TASK-XX.md`, and may not contradict it, drop one of its
acceptance criteria, or substitute its own preference for an owner decision. A missing brief is
`TASK_XX_BRIEF_MISSING` and stops the workflow; a brief that cannot be satisfied against the repository without
changing an owner decision is a conflict the owner resolves. See `WORKFLOW_RULES.md` §2 and `PLANNER_PROMPT.md`.

`BAX_Owner_Briefs.md` is the file as the owner delivered it, kept beside the master copy so the two can be compared
at any time.

## Order

```
04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 16 → 15
```

16 before 15. Task 15 is the final audit and is always last.
