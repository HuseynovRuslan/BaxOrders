# Review — Task 11b: Obyekt müqayisə səhifəsinin sifariş səhifəsinə birləşdirilməsi

Role: REVIEWER
Date: 2026-09-25
Verdict: **HUMAN_REQUIRED — not accepted, not failed.** The implementation meets every acceptance criterion but one.
Criterion 1 fails because five files that the specification says to delete still exist in the tree. The Coder
replaced them with comment-only placeholders because its permission profile cannot delete a file. None of the four
roles can, and only the owner may change `run-agent.ps1`. A `FIX_REQUIRED` would send the Coder back into the
same refusal, and a pass would commit the placeholders. Both would break the rules. This is a genuine contradiction
between `TASKS/TASK-11b.md` and the runner's permission profiles (`WORKFLOW_RULES.md` §1), so the run stops for the
owner. No `COMMIT_MESSAGE.txt` is written. Task 11b stays active.

## What was inspected

- Branch `main`, HEAD `93b5a81` (Task 11a). Nothing for 11b is committed.
- `git status`: 32 tracked files modified (+1155 / −1740), and every path is under `src/BaxOrders.Application/`,
  `tests/BaxOrders.IntegrationTests/` or `frontend/bax-orders-web/src/`. There are no new files and no deletions. The
  only untracked paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`.
- The full backend diff (4 files), the non-test frontend diff, and the removed lines of every changed test.
- The five placeholder files, read in full.
- The raw Coder log `LOGS/20260924-211438-cycle26-coder.jsonl`, for the commands, edits and results.
- `run-agent.ps1`, for the role profiles (`$coderAllow`, `$workflowAuthorAllow`, `$AlwaysDenied`) and for
  `Invoke-AcceptedCommit`, which runs `git add -A` on everything outside `AI_WORKFLOW/`.

## How builds and tests were verified

This Reviewer profile was again refused `npm run … test` (the harness required approval), so, as for Tasks 3–11a,
I verified the results from the raw log:

| Check | Raw log evidence |
|---|---|
| Frontend build (`tsc -b && vite build`) | command 868, result 871: `built in 1.70s`. The TS errors at 665 (fixtures missing the new fields) were fixed before this |
| Frontend tests | command 874, result 878: `Test Files 41 passed (41)`, `Tests 747 passed (747)` |
| Backend tests | command 892, result 899: `Passed! - Failed: 0, Passed: 826` unit, `Passed! - Failed: 0, Passed: 706` integration (11a: 826 / 683) |
| Backend build | command 904 (`--artifacts-path`, because the running API locks `bin`), result 907: `0 Warning(s)`, `0 Error(s)` |

The last application or test edit is `App.test.tsx` at log line 858. That comes before the build (868) and before
both full runs. The only later writes are `LAST_REPORT.md` (967, 974) and `STATE.json` (976).

The deletion attempts are at log lines 327, 331 (`rm`) and 337 (`git rm`). All three were refused with "This command
requires approval". This matches `$coderAllow`, which holds only `Edit(...)`, `dotnet build/test`, `npm run/ci`,
`npx vitest/tsc` and read-only git.

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout/clean/push`.

## Acceptance criteria (TASK-11b §9)

| # | Criterion | Result |
|---|---|---|
| 1 | `LocationAnalyticsPage`, `AnalyticsSummary`, `ComparisonRows` do not exist; `/locations/43/analytics?period=2026-07&basis=avg3` redirects (replace) to `/locations/43?basis=avg3` | **FAIL — deletion only.** The redirect passes: `RetiredComparisonRedirect` in `App.tsx` renders `<Navigate replace to={locationLink(Number(locationId), parseBasis(params))} />`, and `App.test.tsx` covers avg3, a custom range, and no basis → `?basis=last`. Nothing imports the old modules, and `/analytics` appears in no non-test page or component. **But all five paths still exist.** The three components hold only a comment. The two test files each hold one test, which imports the empty module and asserts it has no exports. The runner's `git add -A` would commit all five as they are |
| 2 | "Müqayisə et" → `/orders/{latestOrderRequestId}?basis=avg3` (also filtered / page 2); each row's "Müqayisə" → its own order; no "Müqayisə et" without an order; no `/analytics` href | PASS. Both links use `orderLink(…, selection)`. The header link is conditioned on `latestOrderRequestId !== null` and never on `latest`. The `aria-label`, words and style are unchanged. `comparisonLink` and the unused `basisSearch` import are gone. Tests cover the unfiltered case, the year filter, page 2, every row, the null case, and no `/analytics` in any href |
| 3 | Nothing lost: the steady products under "Məbləği dəyişməyən {U}" (the rising store product shown "Artıb"); "Artıb · Azalıb · Xidmətlər" from the backend; missing months named; the window-months disclosure with `orderLink` / "sifariş yoxdur"; the both-sides owed-price sentence; C1–C18 walked | PASS. `DriverFilter 'Steady'` is last in `driverFilterOrder`. `rowsUnder` returns `steady` for that chip and `drivers.filter(matches)` for every other, so "Hamısı" is unchanged. The steady pill is `stateBadgeLabels[state]` in `mixedCauseToneClass`. `productStateLine` reads the three backend counts and shows "Xidmətlər" only when > 0. `partialCoverageLine` names the months. `WindowMonths` starts closed, uses `aria-expanded` and the chevron, and lists every `windowPeriods` month, including when `!available`. A missing month is `text-amber-900` text with no icon. `bothSidesOwePricesNote` appears under exactly the comparison page's condition. The newer-version link now uses `orderLink(…, selection)`. The report's §3 walks C1–C18, and the design choices it names (no search box, no per-row quantity % / current amount) are the Planner's Assumptions 1 and 4 |
| 4 | Backend parity on every basis | PASS. The new `ProductCountConsistencyTests` theories over `EveryBasis` check that `Drivers ∩ Steady = ∅`, that `Drivers ∪ Steady` equals the comparison rows by id, that each steady product has the same `State`, and that `Steady.Count == ComparedCount − ListedCount`. They check the three counts against `IncreasedVariantCount` / `DecreasedVariantCount` / `AmountOrientedServiceCount`, with fixed values 2 / 1. They check `SteadyVariantId` is steady and `Unchanged`, and that the "Anbar" material (10 → 12) is steady, `Increased`, has zero money and is not a driver. They check `BaselineMissingPriceItemCount` for primary and every secondary against `CompareAsync` in a separate world where the count is > 0. `Explain` keeps the skip predicate character for character, now as `isSteady`. The query-count test is unchanged and green |
| 5 | History header `LatestOrderRequestId` | PASS. A correlated subquery in the existing header projection orders by `RequestPeriod DESC, Version DESC`, the rows' own order over the same unfiltered `LocationId` set. It is independent of filter and page, and null when there are no orders. `OrderBrowsingTests` covers two versions, a year filter that excludes it, a month filter, page 2 and no orders |
| 6 | `signedToneClass` nowhere under `src/` | PASS. A grep finds nothing. It was removed from `format.ts`, from the `labels.ts` re-export, and with its test. `costDirectionToneClass` is untouched |
| 7 | Nothing else changed; suites and builds green; sweep passes | PASS, apart from criterion 1. The diff touches only the files in spec §6. `Application/Analytics/*`, `CauseDecomposition.cs`, `PeriodComparison.cs`, the dashboard, the report, `TrendModal`, `CauseSummary`, `LocationTrend`, `LocationsPage`, `tools/`, schema and migrations are not in it. The new records are appended at the end. The `oldTerms` sweep runs over the new lines |

## Tests changed deliberately

I checked each removed line of each changed test against spec §10. All of them are listed there:

- The `/analytics` hrefs in `LocationDetailPage.test.tsx`.
- The scope-line tail "dəyişməyib" → "məhsulun məbləği dəyişməyib".
- "Ən son sifarişə bax" gains `?basis=last`.
- The `signedToneClass` test.
- The comparison-page case in `oldTerms.test.tsx`. Its words are now swept on the order page.
- The `ProductCounts` records gain three fields, and the old five values are unchanged.
- `SeptemberVariantCount` 6 → 7, which is the fixture change the spec asks for, named in the report.

No expectation was weakened.

## Invariants (TASK-11b §8)

- **Task 1.** Every new or repointed link goes through `orderLink` / `locationLink`, and the redirect uses `parseBasis`.
- **Task 2.** "Qiymət yoxdur" amber stays only for owed prices. A missing window month is amber *text* with no
  warning icon, as the spec says. Internal supply stays slate.
- **Task 5.** There is no code or version. The sweep includes the new lines.
- **Tasks 6, 9, 10.** "Niyə dəyişib?", the dashboard and `StateOf` are untouched. For "Hamısı", the compact line,
  the sort and the 6 rows / "Hamısına bax", the logic is unchanged and only the pill was extracted into a component.
- **Task 11a** and brief "Mütləq qorunmalı". The periods table and every "Sifarişə bax" stay, and "Obyektin
  sifarişləri" still leads to the object page.
- **No data.** There is no schema, migration, `DATA_MIGRATION` marker or database command.

## Findings outside this task (not blocking)

- The class summary of `OrderDecisionContextQueries` still says "Four queries", while the test asserts five. This
  was left over from Task 10, and the Coder reported it and did not change it. It is a doc comment only. Fold it into
  a later task that touches that file.

## Why this stops for the owner, and what unblocks it

- The contradiction. `TASK-11b.md` §4.2 and criterion 1 say to delete five files. In `run-agent.ps1`, no role may
  delete a file: the Coder has no `rm` / `git rm`, and the Planner and Reviewer may edit only `AI_WORKFLOW/`. The
  runner's accepted-commit step would stage the placeholders as content. Only the owner may change `run-agent.ps1`
  (`$AlwaysDenied` holds `Edit(run-agent.ps1)`), and there is precedent: HD-003 step 1 was the same operator
  deletion.
- What the owner does. The steps are in `PLAN.md` HD-005 and `CURRENT_TASK.md`. At minimum, `git rm` the five
  paths, re-run the frontend suite and build (expected 39 files / 745 tests), and set `STATE.json` back to `REVIEW`.
  The next review then checks that the five paths are gone and accepts.

State: `HUMAN_REQUIRED`, `currentTask` `11b`, `humanApprovalRequired` true. There is no commit message and nothing
advances.

---

## Re-review after HD-005 — 2026-09-25

Verdict: **PASS — accepted.**

The owner's operator removed the five files with `git rm -f` and set `STATE.json` back to `REVIEW` (HD-005, resolved).
I checked the repository myself rather than relying on that note:

- Branch `main`, HEAD still `93b5a81`. Nothing was committed by hand.
- `git diff --cached --name-status` stages exactly five deletions: `pages/LocationAnalyticsPage.tsx`,
  `components/analytics/AnalyticsSummary.tsx` (+ `.test.tsx`) and `components/analytics/ComparisonRows.tsx`
  (+ `.test.tsx`). None of the five paths exists on disk (a glob finds nothing). `git diff --numstat` shows each as
  pure removal of its whole `93b5a81` content (411, 193, 67, 277, 276 lines) and no additions.
- A grep of `frontend/bax-orders-web/src` for `LocationAnalyticsPage`, `AnalyticsSummary`, `ComparisonRows`,
  `signedToneClass` and `comparisonLink` finds nothing. So no importer was left behind, and criterion 6 still holds.
- The redirect is unchanged: `App.tsx:48` routes `locations/:locationId/analytics` to `RetiredComparisonRedirect`
  (`App.tsx:78`), a `<Navigate replace>` to `locationLink(id, parseBasis(params))`.
- Nothing else moved since the first review. The changed-file set is the same 32 paths. The totals went from
  +1155 / −1740 to +1127 / −1743. That is exactly the placeholders' 28 added lines disappearing and the 3 lines they
  had kept from the originals now counted as deleted. The per-file counts of every other path are unaffected. The
  only untracked paths outside `AI_WORKFLOW/` are `run-agent.ps1` and `monitor-agent.ps1`, which the runner excludes.

**Criterion 1: PASS.** Criteria 2–7 passed in the first review, and I found no change to the code they covered.

Tests and builds. This profile is still refused `npm run … test` ("requires approval"), so I could not re-run the
suites. The evidence is the Coder's raw log, which is unchanged from the first review: backend 826 unit / 706
integration, both builds clean. It is joined by the operator's re-run after the deletion: frontend 39 files / 745
tests, build clean. That count is exactly the 41 / 747 of the log minus the two placeholder test files and their one
test each. The backend is untouched by the deletion.

The root cause is closed for later tasks. `run-agent.ps1:904` grants the Coder `Bash(git rm:*)`, and the comment at
line 898 records why it is `git rm` and never `rm`.

Carried forward, not blocking: `OrderDecisionContextQueries`'s class summary still says "Four queries" (from Task 10).
Fold it into a later task that touches that file.

State: Task 11b accepted and Task 11 complete. `COMMIT_MESSAGE.txt` is written. Next is Task 12, in `PLANNING`.
