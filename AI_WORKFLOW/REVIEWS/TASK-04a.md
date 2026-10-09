# Review — Task 04a: Rəhbər rolu, təsdiq səlahiyyəti və qərar paneli

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`.

## What was inspected

- Branch `main`, HEAD `4827cb4` (Task 3). Nothing for 04a is committed yet.
- `git status` and the full `git diff` of the 44 tracked files. The seven new files were read directly:
  `ActiveApprovers.cs`, `WorkflowDecisionFactsTests.cs`, `ApprovalDecisionFactsTests.cs`,
  `ApprovalAuthorityEndToEndTests.cs`, `LastApproverGuardTests.cs`, `WorkflowDialog.test.tsx` and `labels.test.ts`.
- The diff touches only `src/`, `frontend/` and `tests/`. It adds no EF migration and does not touch `Migrations/`
  or `tools/`. Nothing is untracked outside the task apart from the workflow infrastructure, which the runner
  excludes from the commit.
- I checked the raw Coder log `LOGS/20260924-195739-cycle02-coder.jsonl` for the harness's own tool output and
  every Edit and Write the Coder made.

## How builds and tests were verified

This Reviewer profile is not allowed to run `dotnet build`, `dotnet test` or `npm`; the harness asked for approval
and I did not get it. As with Task 3, I did not re-run them myself. I checked the raw tool results in the Coder log
instead:

| Check | Raw log evidence |
|---|---|
| Backend build | line 1032: `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`, because the running API locks `bin`) |
| Backend unit + integration | line 1099: `Passed! Failed: 0, Passed: 728` (unit) and `Passed! Failed: 0, Passed: 598` (integration) |
| Frontend tests | line 1010: `Test Files 27 passed (27)`, `Tests 440 passed (440)`, in the same command as `tsc -b --noEmit` |
| Frontend build | line 1018: `npm run build`, `built in 4.22s` |

The Coder's last edit to an application or test file was at log line 995 (`labels.test.ts`, mtime 20:32:43). Every
result above comes later in the log, and no file in the diff has a later mtime. So the results apply to the tree as it
stands.

Earlier failures in the log were fixed in the Coder's normal loop, and no expected value was loosened:

- line 414 (1 unit test) failed before the unit-test theory was updated for 4.3;
- line 753 (2 integration tests) compared the in-memory entity moment (100 ns precision) with the stored event
  moment (µs precision). The facts come from the stored event by design, so the tests now compare against the stored
  event;
- line 900 (`tsc` errors) came from fixtures that were missing the new fields. They were fixed before line 1010.

## Acceptance criteria (TASK-04a §10)

| # | Criterion | Result |
|---|---|---|
| 1 | Action row is the first thing in the right-hand column; the column is sticky and capped to the viewport | PASS — `WorkflowPanel` renders the button row first. The column carries `lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto`, which `OrderDecisionPage.test.tsx` checks |
| 2 | "Düzəliş tələb et" refused without a reason; with a reason it succeeds | PASS — the dialog blocks empty and whitespace-only reasons (`WorkflowDialog.test.tsx`). Over HTTP, `"  "` gets 422, and the status and event count stay the same (`ApprovalAuthorityEndToEndTests`). The domain `Guard.RequiredText` is unchanged |
| 3 | After correction and resend: `İkinci göndəriş · düzəliş tələbindən sonra`, with the reason, the name and the moment | PASS — `WorkflowDecisionFactsDto.Compute` and `submissionCountLabel`. Proven over HTTP (number 2, reason, "Sınaq rəhbəri", moment equal to the stored return event) and in vitest |
| 4 | After approval the panel shows who approved and when; the status appears once, in the header | PASS — the status badge and status word are gone from the panel. `StatusBadge` stays in `PageHeader`. Tested for 4 statuses and on the page |
| 5 | An admin cannot approve or return: 403, service refuses, no button, note shown; admin still sees the queue | PASS — `CanDecideOrders` policy uses `RequireAssertion` over `ApprovalAuthority.IsHeldBy`, and `OrderWorkflowService.EnsureApprovalAuthority` throws `ForbiddenException` (mapped to 403) before anything loads. `CanViewApprovals` keeps the inbox, menu entry and route for Admin. `missingAuthorityNote` appears in the panel and on inbox rows |
| 6 | Rəhbər decides; `/auth/me` flags per role | PASS — `AuthenticationTests.Me_says_who_may_decide_and_who_may_look_at_the_approval_queue` checks Rəhbər (true, true), Admin (false, true) and Koordinator (false, false) |
| 7 | Last-approver guard, users-page warning, startup warning | PASS — the guard runs before any change and refuses both disabling and a role change; the display name also stays unchanged (`LastApproverGuardTests`, which uses its own `baxorders_approvers_*` database). The warning shows when the count is 0. The startup `LogWarning` creates no user and grants nothing |
| 8 | Historical Excel order reads exactly the 4.1 sentence, with no name or date | PASS — `historicalImportNote` is exact. `IsHistoricalImport` empties every other field. `HistoricalApprovalTests` and vitest assert no date and no "Sistem" |
| 9 | No new panel or dialog text contains "Versiya" | PASS — the dialog's `Versiya N` subtitle and its `Versiya` fact are replaced by the submission count. The remaining "yeni versiya yaradılır" note is existing text and belongs to Task 5 |
| 10 | §9 invariants hold; all suites and both builds green | PASS — see below |

## Invariants (TASK-04a §9)

- Analysis part of the order page: the only change in `OrderDetailPage.tsx` is the column's class list and its
  comment. `DecisionHeadline`, `CauseSummary`, `DriverList` and the lines table are untouched. All existing
  `OrderDecisionPage` tests pass.
- The inbox default sort is unchanged; there is no edit to the sort code in `ApprovalInboxQueries`.
- Self-approval and own-contribution rules are unchanged in the domain. Where an Admin used to be "the second person
  who may decide", the tests now use a Rəhbər (`.As(Manager)`), so both rules are still proven on the role that holds
  authority.
- History is append-only and still uses the name snapshot. The facts also read the snapshot and never look up a live
  user.
- Coordinator rights are unchanged. The Admin keeps every page, including the inbox, which is read-only for
  decisions.
- No database was reached apart from throw-away test databases. No user or role was changed, there is no schema
  change, and HD-002's 94 rows are untouched: no code in the diff goes near pricing.

## Changed existing tests

Every changed expectation traces to 4.3, or to the brief's renaming of the action to "Düzəliş tələb et", and each is
listed in `LAST_REPORT.md` §6. The endpoint-level own-contribution and self-approval expectations for an Admin moved
from 422 to 403, as the specification instructs. The rules themselves are still proven for a Rəhbər at the service
and domain level. No test was deleted, and one test was strengthened: `Handing_back_without_a_reason_is_refused` now
also asserts that no event is written.

## Judgement calls, accepted

1. **"Rəhbər" is the existing `Manager` role** (spec §3), and its stored identifier is not renamed. This matches 4.3
   and 4.3a: there is one role called Rəhbər, and only it holds authority. Task 14 configures it.
2. **The Coordinator is not shown the missing-authority note.** `BlockedByMissingAuthority` is limited to roles that
   see the queue (`ApprovalAuthority.MayViewQueue`). This keeps an already accepted test and "the Coordinator's
   access is unchanged". Acceptance criterion 5 is about the admin, so nothing required is missing.
3. **Fallback to "Sistem" for an empty actor name** in the panel's facts. This follows the history's existing
   convention for events recorded before sign-in. It cannot affect a historical import, whose facts are empty by
   construction.

## Findings left for later (not blocking)

- The last-approver guard takes no lock. Two admins deactivating the last two Rəhbərs at the same moment could both
  succeed. If that happens, the users-page warning and the startup log make it visible.
- These were already in the code before this task: `IdentityUserDirectory.UpdateAsync` can partly apply a command
  with an unknown role, and `AdminUsersController.Update` documents 422 where `ValidationException` maps to 400.
- Task 5 owns the history labels ("Düzəlişə qaytarıldı"), the header's "Versiya N", and the inbox row's
  "Dövr / Versiya" column and its "V1 düzəlişi" text.

## Go-live precondition (TASK-04a §11.6)

From the moment this code runs against the real database, an administrator can no longer approve. Before the API is
restarted on this commit, make sure an **active user with the role "Rəhbər"** exists. It can be created on
"İstifadəçilər". If there is none, the users page shows the warning and the API logs one at startup. Neither the
Coder nor the Reviewer checked or changed the real users. The API running now (PID 21024) is on the old code.

## Next

Task **04b** (`TASKS/TASK-04b.md`, complete specification, no `DATA_MIGRATION` marker) → state `READY`.
