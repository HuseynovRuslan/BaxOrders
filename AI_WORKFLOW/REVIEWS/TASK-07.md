# Review — Task 07: Əsas səbəbin məhsul adı və payı ilə göstərilməsi

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 8. Its brief exists but it
has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `a5be6c0` (Task 6). Nothing for 07 is committed yet.
- `git status` and the full `git diff` of the 11 tracked files (+320 / −23), plus the three new files
  (`Decisions/CauseLeader.cs`, `UnitTests/Decisions/CauseLeaderTests.cs`, `dashboard/AttentionSection.test.tsx`).
  Every path is under `src/BaxOrders.Application/`, `tests/` or `frontend/bax-orders-web/src/`, and every one is on
  spec §5's "Changed (expected)" list. `CauseDecomposition.cs`, `PeriodComparison.cs`,
  `OrderDecisionContextQueries.cs`, `CauseSummary.tsx`, `DecisionHeadline.tsx`, `DriverList.tsx`, `TrendModal.tsx`,
  `LocationRows.tsx`, `DashboardSummary.tsx`, `components/dashboard/labels.ts`, `format.ts` and `pricing/labels.ts`
  are not in the diff. No schema, migration, `package*.json` or `tools/` change. The only other untracked paths are
  `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the runner leaves out of the commit.
- The raw Coder log `LOGS/20260924-211438-cycle11-coder.jsonl`, for every Edit, Write and Bash command and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile is not allowed to run `npm` or `dotnet`: the harness asked for approval for both
`dotnet build … --artifacts-path <scratchpad>` and `npm run --prefix frontend/bax-orders-web test`, and did not get
it. As with Tasks 3–6, I checked the raw tool results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Frontend tests | line 449: `Test Files 37 passed (37)`, `Tests 571 passed (571)` (Task 6: 36 / 551) |
| Frontend build (`tsc -b && vite build`) | line 458: `built in …`, no type error |
| Backend tests | line 470: `Passed! - Failed: 0, Passed: 807` and `Passed! - Failed: 0, Passed: 616` (Task 6: 797 / 609) |
| Backend build | line 478 (and 524–532): `0 Warning(s)`, `0 Error(s)` with `--artifacts-path` |

The build at line 135 (`MSB3027`/`MSB3021`, 6 errors) is the default-`bin` build blocked by the running API's file
lock, not a compile error; the next build (line 141) into the artifacts path is clean, as spec §11 foresees.

The last Edit to an application or test file is `ManagementDashboardPage.test.tsx` at log line 434. The final full
frontend test and build (449, 458) and backend test and build (470, 478) all come after it. After that, the only
Writes and Edits are to `LAST_REPORT.md` and `STATE.json`. So the green results apply to the tree as it stands. The
counts rise by exactly the new tests: unit +10 (`CauseLeaderTests`), integration +7 (2 facts in
`DashboardCauseTests`, a theory over the 5 bases in `ComparisonBasisConsistencyTests`), frontend +1 file / +20 tests.

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout`.

## Acceptance criteria (TASK-07 §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Heydər Əliyev card: "Traktor qazonbiçən RT-6127.1 ZL — +21.900,00 ₼ (artımların N%-i)", N ≤ 74 | PASS. `AttentionSection.test.tsx` asserts the exact line text and the share ≤ 74 (74 with the fixture's 29.791,52 denominator). The unit test builds the brief's figures through `Decompose` + `ToCents` (total +23.852,70, new products +29.691,52) and asserts the ratio ≤ 0,7376 |
| 2 | Fəvvarələr card: "Yay ayaqqabısı — −1.988,00 ₼ (azalmaların N%-i)", N ≤ 25 | PASS. Component test (23% with the fixture's −8.593,70 denominator) and unit test (total −2.584,45, "no longer ordered" −8.093,70, ratio ≤ 0,2457) |
| 3 | Share = top over **all** same-direction product effects, every category; never > 100%; follows the basis | PASS. `CauseLeader.Of` sums `AmountImpact` over every variant with the direction's sign, whatever its category. Unit tests pin: a larger variant in another category is counted but not named, an opposite-way variant in the primary category is neither, "Qiymət yoxdur" / "Daxili təminat" are counted, and the ≤ 100% property over every category and sign. The integration theory over `EveryBasis` proves the denominator equals the order page's same-sign driver sum for each basis. `ManagementDashboardPage.test` proves a basis change refetches and shows the new product and share. The share builder also caps at 100 |
| 4 | Product = largest within the primary cause and its direction = first such row in "Əsas dəyişikliklər", same amount | PASS. Candidates are `Category == primary` with the direction's sign; tie by lower `ProductVariantId` (unit test hands over the higher id first). The integration theory asserts id, `Product.Name` and `AmountImpact` equal the first matching driver of the order page's decomposition, for every basis |
| 5 | Primary line and two secondaries remain; ties by `causeTieOrder` | PASS. `secondaryCount` unchanged; the sort adds `causeTieOrder.indexOf` as the tie-breaker; a test with three 300 ₼ causes shows "Xidmətlər", then "Qiymət yoxdur", and only two of them |
| 6 | 9.1 on the card via `costDirectionToneClass`; no `signedToneClass` in `AttentionSection.tsx` | PASS. Delta line, primary amount, product amount and secondaries all use `costDirectionToneClass`; the import is gone. Tests assert red on rises and green on falls for all four, no `text-rose-700` anywhere, no emerald on a rise, `sr-only` "xərc artıb / xərc azalıb" beside the delta and the product, and no "yaxşı/pis" |
| 7 | No product line without a primary cause or qualifying product; nothing else changes | PASS. `primaryCauseProduct` is null when `CauseLeader` returns null or the name is missing; the card renders the product line only when it is non-null. Two tests cover both cases; the integration test asserts null with no previous month; a unit test covers "no variant in the cause points its way" |
| 8 | 5 queries, writes nothing, no figure changed, other screens unchanged, suites/builds green, sweep passes | PASS. The name is read in the widened variant query (`VariantsAsync`), and `Naming_a_cause_…_no_extra_query` still asserts 5 (comment only changed). `Reading_the_dashboard_writes_nothing` untouched and green. `PrimaryCause`, amounts, causes and the attention choice are computed exactly as before. The old-terms sweep now carries two product lines and passes |

## Invariants (TASK-07 §8)

- **Figures and Task 1/1c.** No arithmetic in the decomposition changed; the product's amount is the same cent
  figure the order page prints (integration-tested for every basis). `The_causes_add_up_to_the_difference_they_explain`
  is untouched.
- **"Əsas dəyişikliklər".** `DriverList.tsx` and the decomposition's variant order are not in the diff, so the tractor
  stays first there.
- **Tasks 2, 5, 05b, 6.** The card still uses `causeHeadline` for "Yeni məhsullar" / "Bu ay yazılmayan məhsullar";
  the DTO carries a name and no product code; `incompleteExplanationNote` and the missing-price count remain on the
  card (Task 9); `CauseSummary.tsx` untouched.
- **`signedToneClass`** behaviour unchanged; remaining users are `DashboardSummary`, `LocationRows` (Task 9),
  `DriverList`, `TrendModal`, `analytics/labels.ts` (Task 10) and `MonthlyReportTable` (Task 8).
- **No database reached; HD-002's 94 rows untouched.**

## Changed tests

- `DashboardCauseTests`: the private `World` record gained each line's variant id and product name so the new tests
  can check the name — mechanical. `With_no_previous_month_no_cause_is_invented` gained one assertion (strengthened).
  The five-query test changed its comment only.
- `LocationRows.test.tsx`, `ManagementDashboardPage.test.tsx`, `oldTerms.test.tsx`: fixtures gained
  `primaryCauseProduct` (null except where the test is about it). `oldTerms` gained three assertions.
- In its own new `terms.test.ts` block the Coder changed one of its extra cases from `0.5` to `0.6` before the final
  run: `0.5 / 100 × 100` is `0.4999…` in floating point and prints "1%-dən azı", which is true of a 0,5% share. The
  spec's required cases (74, 25, exact 100, 99.6 → 99, 0.3 → "1%-dən azı") are all present unchanged.

No expected figure, class or business rule was loosened.

## Observations (not failures)

1. The brief's real figures (Heydər Əliyev ≤ 74%, Fəvvarələr ≤ 25%) are proven by construction and by fixtures; the
   operator can confirm them on the running dashboard once the API is restarted on this commit (the running API,
   PID 21024, still serves `a5be6c0`).
2. The card is now 9.1 while the table and summary on the same page are still `signedToneClass` — Task 9. The order
   page's `DriverList` still shows the tractor green while the card shows it red — Task 10.
3. When a comparison has a decomposition but a null delta, `ToCents` is not applied and amounts keep full precision.
   This is existing `Causes` behaviour; the card formats to the qəpik. Not changed here.
4. The product line wraps the name while keeping amount and share `whitespace-nowrap`; long names on narrow screens
   are for Task 12. Nothing was checked by eye in a browser.

## Scope

Nothing outside §3.

## Transition

- `PLAN.md`: 07 is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 8 — Aylıq hesabat**, next in the fixed order. Its brief `BRIEFS/TASK-08.md` exists, but
  `TASKS/TASK-08.md` does not, so the state is `PLANNING`.
- Task 8 is presentation work on the monthly report (8.1, 8.2, 9.1). It changes no real data, so no §7 gate applies.
