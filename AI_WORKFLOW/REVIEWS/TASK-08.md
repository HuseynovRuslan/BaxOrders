# Review — Task 08: Aylıq hesabat

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 9. Its brief exists but it
has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `4994803` (Task 7). Nothing for 08 is committed yet.
- `git status` and the full `git diff` of the 12 tracked files (+1342 / −184), plus the two new files
  (`Application/Reports/UnusualMonth.cs`, `UnitTests/Reports/UnusualMonthTests.cs`). Every path is under
  `src/BaxOrders.Application/`, `tests/` or `frontend/bax-orders-web/src/`, and every one is on spec §5's
  "Changed (expected)" list. `ManagementDashboardQueries`, `LocationRows.tsx`, `DashboardSummary.tsx`,
  `AttentionSection.tsx`, `coverage/labels.ts`, `workflow/labels.ts`, `pricing/labels.ts`, `AppLayout` / `Header` /
  `Sidebar` and `tools/` are not in the diff. No schema, migration or `package*.json` change. The only other untracked
  paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the runner leaves out of the commit.
- The raw Coder log `LOGS/20260924-211438-cycle14-coder.jsonl`, for every Edit, Write and Bash command and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile is not allowed to run `npm`, `node` or `dotnet`. The harness asked for approval for
`dotnet test … --artifacts-path <scratchpad>` and `npm run --prefix frontend/bax-orders-web test` and did not get it.
As with Tasks 3–7, I checked the raw tool results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Backend build | lines 755 and 762: `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`), after the last backend edit (371) |
| New unit tests | line 376: `Passed! - Failed: 0, Passed: 10` (`UnusualMonthTests`); line 312 was the red run before the scale fix |
| Report integration tests | line 384: `Passed! - Failed: 0, Passed: 30` — `MonthlyReportTests`, the 20 existing and the 10 new, including the four-query tests and the dashboard identity test |
| Frontend tests | line 722: `Test Files 37 passed (37)`, `Tests 600 passed (600)` (Task 7: 37 / 571) |
| Frontend build (`tsc -b && vite build`) | line 727: `built in 1.88s`, no type error |

The last edit to an application or test file is `MonthlyReportPage.test.tsx` at log line 716. The full frontend test
run and build (722, 727) and the backend builds (755, 762) all come after it. After that the only Writes are to
`LAST_REPORT.md` and `STATE.json`.

**One gap.** The full backend suite ran at line 763 (`dotnet test BaxOrders.slnx … --no-build`). The harness shows it
completing (769), but the log has **no tool-result line** for that command. The count "817 unit / 626 integration"
exists only in the Coder's next message (773) and its report. Those numbers are exactly Task 7's 807 / 616 plus the
10 + 10 new tests. I accepted the task anyway, for three reasons:

- every test that exercises the changed code is proven green by the raw log (376, 384);
- every other consumer of the changed DTOs is proven to compile by the raw build (755/762);
- the other integration tests that read the report (`MoneyIdentityTests`, `PricingCountConsistencyTests`,
  `SupplierPriceRequirementTests`, `ObjectUniverseTests`, `HistoricalApprovalTests`) assert only existing figures.
  Those come from the same arithmetic, which the diff leaves untouched.

The operator may want to re-run `dotnet test BaxOrders.slnx` once to close the gap.

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout`.

## Acceptance criteria (TASK-08 §9)

| # | Criterion | Result |
|---|---|---|
| 1 | `Cəmi` row: month and year totals from `report.months[].knownAmount` / `report.knownAmount`; no %, change or direction colour; equals the dashboard | PASS. `<tfoot>` row, figures straight from the DTO. Tests assert 11.084,35, 71.210,29 and 431.670,91 ₼; no `%`, no `text-red-700` / `text-emerald-700`; ⚠ on an incomplete month with `missingPriceCount` title and sr-only text; `Cəmi — bütün obyektlər` under a search; a month with no order shows `—`, never 0. The integration test `Each_month_total_is_the_dashboards_month_…` proves `Months[m].KnownAmount == Summary.Current.KnownAmount` for every month of an isolated four-place-price fixture, and September's `DeltaPercent` equals the dashboard's `PreviousMonth` percent per location |
| 2 | Heydər Əliyev: June +149,06% marked, August −48,00% not, Jan–Mar not | PASS. Unit tests with the brief's figures: average 14.458,58 → 149.06, unusual; 23.048,12 → −48.00, not; 0/1/2 previous → `(null, null, false)` |
| 3 | Three most recent **available** months; skip no-request and all-unpriced months; reach into the previous year; exactly ±50 not marked | PASS. `Build` collects the location's periods with a non-null `KnownAmountOf`, oldest first, and passes the ones before the cell. Integration tests cover the skipped March, the all-unpriced March, January against Oct–Dec 2025, and a January with two months behind it. Unit tests cover ±50,00 (not marked), ±50,01 (marked), 450,01/300 → 50,00 (not marked), and the last three of six |
| 4 | Oct–Dec (today 2026-09-24) without a request: no `—`, no "sifariş yoxdur", different look, quieter header | PASS. `isFutureMonth` compares `yyyy-MM` in the reader's calendar. A future empty cell is hatched, has no link and has the title "Oktyabr 2026: gələcək ay"; its header is `text-slate-400`. A future cell with a request is ordinary. In 2027 nothing from 2026 is future. The narrow list says "Oktyabr 2026 — gələcək ay" |
| 5 | Bayıl yolu September shows "⚠ 1" and "+254,03%" | PASS. `Secondary` renders the change and ⚠ side by side; test asserts both in one link. The existing ⚠ 2 test now also asserts "+12,5%" |
| 6 | Legend on screen: dots, ⚠, % and colours, unusual tint, future | PASS. `<ul aria-label="Cədvəldəki işarələr">` inside the `lg:block` panorama, directly above the table. The words come from `workflowStatusLabels`, `missingPriceShortLabel` and `terms.ts`. It is readable, not `aria-hidden` |
| 7 | 9.1 via `costDirectionToneClass` / `costDirectionTintClass`; no `signedToneClass` import; no "yaxşı / pis" | PASS. Import is gone; tests assert red on +12%, green on −8%, no `text-rose-700`, direction words in the accessible name, and neither "yaxşı" nor "pis" anywhere |
| 8 | Panorama from `lg`; in-box scroll below fit, pinned object/year; from 1340 no scroll; no negative margins; `sticky top-16` headers; months ≥ 64px; `whitespace-nowrap` + `tabular-nums` | PASS. `hidden lg:block`, `lg:overflow-x-auto min-[1340px]:overflow-x-visible`, `table-fixed w-full min-w-[1000px]`, cols `9rem` / none / `5.5rem`. Every `thead th` is `sticky top-16` (z 3/2), and body sticky cells are z 1 (under the app header's z-20). No `-mx-`. List and month picker are `lg:hidden`. `AppLayout` has no overflow ancestor that would capture the sticky header. Width arithmetic: 1366 → ≈1029px of content ≥ 1000 |
| 9 | Never-ordered location → one `colSpan=12` cell with `portfolioGroupLabels.NoHistory`; an earlier-year orderer keeps twelve cells | PASS. `HasAnyRequest = requests.Count > 0` over every period ≤ Dec of the year. Integration: never-ordered → false; 2025-only read for 2026 → true with 12 empty months, and read for 2024 → false. Frontend: colSpan 12, three children in the row, imported label |
| 10 | Nothing else changed; four queries; suites and builds green; sweep passes | PASS, with the log gap described above. Four-query tests unchanged (comment only). `Reading_the_report_writes_nothing` untouched. The old-terms sweep now covers an unusual June, a future December and Çadır, and passes (722) |

## Invariants (TASK-08 §8)

- **Figures.** Removing the lower bound only adds earlier periods to the per-location dictionary. The cell loop, `Months`
  and `CompanyTotals` still iterate only `year`'s 1–12. January's `PreviousMonthKnownAmount` is still
  `period.AddMonths(-1)`. `Months_before_the_year_are_read_but_never_added_into_it` pins this. The migration tool's
  invariants hash named fields only (`Invariants.cs:135–162`), so the new fields do not enter them.
- **Link.** Still `/orders/{id}` with no query string (asserted on the unusual June).
- **"İl cəmi"** stays, `sticky right-0`. **27 objects, full names:** names now wrap (`break-words`) instead of being
  truncated, and the `title` stays. **Task 2 ⚠ counting, Task 5 words and money format, 05b:** unchanged; every `₼`
  value is `whitespace-nowrap`.
- **No database reached; HD-002's 94 rows untouched.**

## Changed tests

Every changed existing test is on spec §10's "deliberately" list, with its brief line:

- the fixed-width / no-`overflow-x-auto` test, now in-box scrolling;
- the `w-[180px]` / `w-[96px]` test, now the new widths;
- the `-mx-4` test, now asserting there are none;
- `.xl\:hidden` → `.lg\:hidden`;
- ⚠ 2, which now also asserts the percentage;
- "keeps money on one line", which now also asserts `tabular-nums`.

The fixtures in `MonthlyReportPage.test.tsx` and `oldTerms.test.tsx` gained the new fields. The sweep fixture gained a
future December and Çadır, so its counts moved from 12 to 11 requests. The integration four-query test changed its
comment only. No expected figure, class or business rule was loosened.

## Deviation from the spec (accepted)

Spec §4.1.5 says `PercentChange` returns two decimals. It returns four (`PercentScale = 4`). The Coder rounds its
result to two places (`PrintedPercentScale`, half away from zero) before the ±50 test. That is what §4.1.6 ("decided on
the same rounded percentage the screen prints") and §10's figures (149.06, −48.00) require. `DeltaPercent` is untouched
and keeps its four places.

## Observations (not failures)

1. The brief's real figures (the totals row, Heydər Əliyev's June and August, Bayıl yolu's September) are proven by the
   rule's unit tests and the identity test. The operator can confirm them on the running report once the API is
   restarted on this commit. The widths at 1024 / 1200 / 1366 / 1440 were checked by class and by generated CSS,
   not by eye in a browser.
2. Between 1024 and 1340px the header is sticky inside the scrolling box, not against the page. The brief requires the
   page-sticky header only at 1366 and 1440, and there it holds.
3. A six-figure monthly cell (≥ 100.000,00 ₼) would not fit a 64–66px column at 11px. The audit data's largest is
   five figures. Noted in the Coder's report for later.
4. `signedToneClass` remains in `LocationRows`, `DashboardSummary` (Task 9), `DriverList` and `TrendModal` (Task 10).
   The narrow month list has no unusual-month mark or ⚠ + % pair yet (Task 12).

## Scope

Nothing outside §3.

## Transition

- `PLAN.md`: 08 is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 9 — İdarəetmə paneli UX**, next in the fixed order. Its brief `BRIEFS/TASK-09.md` exists, but
  `TASKS/TASK-09.md` does not, so the state is `PLANNING`.
- Task 9 is dashboard presentation work and owns the 9.1 colour rule. It changes no real data, so no §7 gate applies.
