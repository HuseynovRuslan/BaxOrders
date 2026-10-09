# Review — Task 13c: "Variant dəyişib" sətri (Task 13, part 3 of 3)

Role: REVIEWER
Date: 2026-09-25
Verdict: **FIX_REQUIRED — not accepted.** The implementation meets criteria 1–10 of `TASKS/TASK-13c.md` §8, and I
found no defect in the application code. But criterion 11 ("Builds and suites are green") fails. One existing
integration test is red: `ProductMatchMigrationTests.The_figures_are_captured_the_same_twice_and_no_decision_moves_them`.
The Coder correctly left it unchanged, because spec §9 says to STOP on any failing test it does not name. The spec
missed this test. Its expectation cannot hold together with owner decision 13.1a, so the correction is a test-only
change that follows the brief, not a business decision. `COMMIT_MESSAGE.txt` is **not** written, so nothing is
committed. The task stays 13c. The correction task is in `CURRENT_TASK.md`.

## What was inspected

- Branch `main`, HEAD `c8a4747` (Task 13b). Nothing for 13c is committed.
- `git status`: 23 tracked files modified (+1025 / −81). Four new files: `Application/Analytics/ApprovedMatches.cs`,
  `IntegrationTests/VariantTransitionAnalyticsTests.cs`, `UnitTests/Analytics/VariantFamiliesTests.cs` and
  `UnitTests/Decisions/VariantTransitionTests.cs`. The untracked non-task paths are `AI_WORKFLOW/`, `run-agent.ps1`,
  `monitor-agent.ps1` and `resume-agent.ps1`, and the runner excludes them. Nothing changed under `tools/`, and there
  is no migration or snapshot change.
- The full diff of every application and frontend file. I read `ApprovedMatches.cs` in full, and
  `SpellingFold.ReadAsync` to compare filters. I read `VariantTransitionTests.cs` from the property test to the end,
  plus the changed `ProductMatchTests` test. I read `ProductMatchMigrationTests.cs` in full, and from
  `tools/BaxOrders.ProductMatchMigration/Invariants.cs` the capture (§6, HEM September), `Flatten`, `Walk` and
  `Compare`.
- The raw Coder log `LOGS/20260925-075958-cycle05-coder.jsonl`: every Write and Edit, and every build and test result.

## How builds and tests were verified

This Reviewer profile is not allowed to run `dotnet build`, `dotnet test` or `npm`, as in earlier reviews. I used the
Coder's raw log instead:

- Line 418: the first unit run had **8 failures**, all in the Coder's new
  `VariantTransitionTests.No_amount_moves_whatever_the_families`, at line 382
  (`with.TotalAmountImpact == Σ categories`). The differences were in the 26th–28th decimal digit (for example
  `-242,16541666666666666666666663` against `…664`). They came from test prices of `n/3000`, which have no exact
  decimal form. `AssertSameMoney` (line 381), the money invariant this task is about, had already passed on those
  inputs. At line 445 the Coder changed the generator to the stored scales (quantity to three decimals, unit price to
  four), and those products are exact. The test is not weaker: the same assertions still run over 8 seeds × 50 rounds,
  on inputs the database can actually hold. I accept this.
- Line 450: **991 unit, 0 failed.** No application or unit-test file was edited after that.
- Line 1052: full integration run, **750 passed, 1 failed** (751). The one failure is the tool test below (line 939).
  The last backend edit (line 644) came before this run started (line 656).
- Line 1078: frontend **44 files / 849 tests passed**. The last frontend edit is at line 935.
- Line 1122: `dotnet build` through `--artifacts-path`, **0 warnings, 0 errors**. The running API locks `bin`, which
  spec §10 allows for.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Acceptance 3, HEM September | **Pass** (test-proven). On all four bases: one transition, "Sabun elano", from `[Sabun elano, null]` to `[… lavanda ətirli, "lavanda ətirli"]`, 0.00 (750.00 → 750.00). New 0.00/0, NoLongerOrdered 0.00/0, VariantChange 0.00/2. This is asserted in `VariantTransitionAnalyticsTests` and again in the changed `ProductMatchTests`. The frontend renders the exact line and "0,00 ₼". |
| 2 | A transition that moved money | **Pass.** +125.00 is the primary cause. The card names the base, and `CauseLeader` counts the transition once, by its net, with its members excluded as candidates and from the denominator (`CauseLeader.cs:60-117`). |
| 3 | Edges of the rule | **Pass.** `VariantTransitionTests` and `VariantFamiliesTests` cover every edge listed, and the folded-away spelling case is also run through the real services. |
| 4 | Acceptance 4 | **Pass.** No line before approval, after a rejection, or after an undone approval. `ApprovedMatches.ReadAsync` reads only `Approved && UndoneAtUtc == null`. |
| 5 | Acceptance 7 | **Pass.** The money projections match before, after and after undo, and the property test over 8 seeds passes. By construction, `Transitions` changes only `Category` (`CauseDecomposition.cs:748`), and `PeriodComparison.Of` passes the roles to `Decompose` only. |
| 6 | 13.1, two products stay two | **Pass.** There are still two drivers, each with its own state and figures. Product counts, dashboard state counts, the comparison endpoint and the histories are unchanged. |
| 7 | Acceptance 8, undo | **Pass.** Every response after undo equals the one before approval, byte for byte. |
| 8 | Task 2 | **Pass.** Only `NewOrders` and `NoLongerOrdered` members are eligible (`:724-725`). An owed-price or internal-supply member stays where it was, and there are integration tests for both. |
| 9 | Query counts | **Pass.** One query for both kinds replaces the spelling read (6 / 6 / 7). The existing exact assertions pass unchanged, and a new test pins them with decisions of both kinds live. |
| 10 | The screens | **Pass.** `CauseSummary` shows the row at 0.00 and never marks a 0.00 row as primary (`isPrimary={index === 0 && category.amount !== 0}`). A 0.00 largest bar is guarded against division by zero. `DriverList` shows the pill and the note. `causeHeadline` is added. `findOldTerms` returns `[]`. The one-line `OrderDetailPage.tsx` change is the only way to reach `DriverList`'s note, and it falls under §5's "any other file tsc names". |
| 11 | Nothing else changed; suites green | **FAIL.** Integration is 750/751, for the reason below. Scope is otherwise clean. |

Code notes (none of these blocks acceptance):

- `ApprovedMatches.ReadAsync` builds `Spelling` from the same rows, filter and order as `SpellingFold.ReadAsync`
  (`SameItem`, both variant ids non-null, ordered by `Id`). The integration test compares `CanonicalOf` / `MembersOf`
  for every variant.
- With no live Variant link, `RolesOf` returns an empty map, `Decompose` skips `Transitions`, and `VariantChange` is
  left out. So the real database, which holds zero decisions, reads exactly as at `c8a4747`, apart from the new empty
  `variantTransitions` list. That list adds no key to the 13a tool's figures either, because `Walk` emits nothing for an
  empty array. The operator's `--verify` against the 13a baseline is therefore unaffected today.

## The failing test: why it is FIX_REQUIRED and not HUMAN_REQUIRED

`tests/BaxOrders.IntegrationTests/ProductMatchMigrationTests.cs:96-122` was written for 13a. It captures every number
of HEM's September decision context on all four bases, using the tool's `Invariants.CaptureAsync`. Then it approves
the Sabun **Variant** link and asserts that no figure moved (`:119-121`). Owner decision 13.1a and acceptance 3
require exactly that movement: "Yeni məhsullar" and "Bu ay yazılmayan məhsullar" each become 750.00 ₼ smaller, and a
"variant dəyişib" line appears. Spec §7 lists what may differ: "the categories' split, the drivers' `Category`, the new
transition list". The keys that now differ (LAST_REPORT §7.1) are only
`hem.2026-09.<basis>.Decomposition.Categories[…]`, `….Decomposition.Drivers[…].Category` and the new
`….Decomposition.VariantTransitions[…]`. No money, count, dashboard or report key differs.

This is the same situation as the two tests spec §9 names (13b criterion 7 and 13a criterion 9). The Planner missed a
third test that says the same thing. The brief has already decided the question (13.1a), so no owner decision is
needed. The Coder stopped correctly and did not rewrite the expectation on their own authority. The Reviewer now names
this test as deliberately changed, with 13.1a behind it, and bounds the change exactly in `CURRENT_TASK.md`. The change
is test-only, and it keeps the test at least as strict everywhere 13.1a does not reach: every other key must still be
identical, the undo must restore every key, and the transition must actually be present.

`tools/` must not change (spec §5). `Invariants.Compare`'s "no exceptions" rule belongs to the 13a migration, which
is already applied.

## Operator note (carry to the acceptance)

After an administrator approves a Variant link in the real database, the 13a tool's
`--verify` against its 13a baseline will report the same three kinds of HEM September key as differences. That is
13.1a working, not a money change. (A spelling approval touching HEM September could already do this after 13b.) The
live acceptance 3 check is "Keçən ay" +23,852.70 on the order page, as spec §12 says.

## Workflow state

- `STATE.json`: `FIX_REQUIRED`, `currentTask` `13c`, `humanApprovalRequired` false.
- `CURRENT_TASK.md`: the focused correction (one test, test-only), then the full suites and the report.
- `PLAN.md`: 13c stays under Current, marked `FIX_REQUIRED`. Nothing is accepted and nothing moves forward.
- No `COMMIT_MESSAGE.txt`.

---

# Review 2 — correction 1

Date: 2026-09-25
Verdict: **PASS — Task 13c accepted, and with it Task 13 (13a + 13b + 13c).**

## What was inspected

- Branch `main`, HEAD `c8a4747`, unchanged. Nothing was committed by any role.
- `git status --short`: the review-1 tree plus one modified file, `tests/BaxOrders.IntegrationTests/ProductMatchMigrationTests.cs`.
  `git diff --stat` shows 24 files, +1087 / −87. The difference from review 1 (23 files, +1025 / −81) is that file
  alone, at +62 / −6. Nothing under `tools/` changed (`git status --short tools/` is empty).
- Independently, by modification time: the only file under `src/`, `tests/`, `tools/` and `frontend/bax-orders-web/src`
  that is newer than the review-1 log (`LOGS/…-cycle06-reviewer.jsonl`) is that test file. So no application,
  frontend or other test file moved after review 1.
- The whole diff of the test file, against the five steps in the correction:
  1. The first half is unchanged: `first` equals `second`, and the four assertions on the brief's example are all still there.
  2. The comparison after approval is now split. `KeyOf` takes the text before the first `": "`, and that matches every
     form `Invariants.Compare` writes (`Invariants.cs:241`, `:249`, `:253`: "key: a → b", "→ (gone)", "(new) →"). `IsTheSplit` checks exact
     prefixes: `{basis}.Decomposition.Categories[`, `{basis}.Decomposition.VariantTransitions[`, and
     `{basis}.Decomposition.Drivers[<digits>].Category`, with the index checked to be digits only. So
     `Drivers[0].AmountImpact`, `TotalAmountImpact`, `Primary.*`, `Products.*`, `Steady[*]`, `dashboard.*` and `report.*`
     all fall in the group that must be empty. If a key ever held `": "`, it would be cut short, fall outside the
     allowed group and fail the test. It could not pass by mistake.
  3. The four bases come from the tool's own keys. `Assert.Equal(4, bases.Count)` checks that there are four, and
     `hem.2026-09.order` is excluded because it has no `.Decomposition.`. Each basis has
     `VariantTransitions[0].AmountImpact` = 0 (parsed with the invariant culture) and no `VariantTransitions[1]` key.
  4. The undo runs through the same `ProductMatchService`. Afterwards there are no differences, and
     `identical == first.Count`.
  5. The name, the method summary, the step comments and the class summary are corrected as asked.
  No expectation is weaker than before. Everything 13.1a does not reach is still compared exactly, and the test now also
  requires the transition to be present and the undo to be exact.
- The Coder's raw log `LOGS/20260925-075958-cycle07-coder.jsonl`:
  - Edits to the test file are at lines 139–145 (the correction), 186 (a temporary `Assert.Fail("DIAG …")` to print the
    counts) and 214 (the diagnostic removed again). The single failure at line 191 is that deliberate diagnostic run.
    The file on disk has no `DIAG` line. No other file was edited apart from `STATE.json` and `LAST_REPORT.md`.
  - Line 223 → 226: `dotnet build BaxOrders.slnx --artifacts-path …`: **0 warnings, 0 errors**. That is after the last
    edit (line 214).
  - Line 227 → 295: `dotnet test BaxOrders.slnx`: **991 unit passed, 751 integration passed, 0 failed** (3 min 13 s).
  - The frontend was not re-run, which is correct because no frontend file changed after the review-1 run
    (44 files / 849, review 1 line 1078).
- As in review 1, this Reviewer profile may not run `dotnet build` (it was refused again). The evidence above is the
  Coder's raw tool output, not the report's summary.

## Acceptance criteria

Criteria 1–10 passed in review 1. The correction touches no application or frontend file, so they still pass. The one
test changed adds tool-level evidence for criteria 1, 5 and 7: 84 differing keys, all in the split, and 1135 of 1135
identical after undo.

| # | Criterion | Result |
|---|---|---|
| 11 | Nothing else changed; builds and suites green | **Pass.** Build 0/0. Unit 991/991. Integration 751/751. Frontend 44/849, unchanged since it last ran. Scope: the §5 files, the §9 tests, and the third test named in correction 1. |

## Carried to the acceptance

- **Go-live:** restart the API on this commit before serving the new frontend. It reads `variantTransitions` and the
  `VariantChange` category.
- **Operator:** the live check of acceptance 3 is Heydər Əliyev's September "Keçən ay" +23,852.70 on the order page,
  after an administrator approves the Sabun variant link in the product (spec §12). After that approval, the 13a tool's
  `--verify` against its 13a baseline will report HEM September's split keys as differences. That is 13.1a working, not
  a money change (LAST_REPORT §7.2).
- Not blocking: when cents have fractions, a transition's own rounded amount and the `VariantChange` category's
  largest-remainder share can differ by 0.01. Drivers and categories can already differ in the same way today.

## Workflow state

- `PLAN.md`: 13c accepted, **Task 13 complete** (13a + 13b + 13c). Task 14 is Current.
- `COMMIT_MESSAGE.txt` written. The runner commits and records the hash.
- `STATE.json`: `PLANNING`, `currentTask` `14`. `TASKS/TASK-14.md` does not exist yet, and `BRIEFS/TASK-14.md` does.
