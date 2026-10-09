# Review — Task 10: "Əsas dəyişikliklər", məhsul tarixçəsi və məhsul saylarının uyğunluğu

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 11. Its brief exists but it
has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `773063f` (Task 9). Nothing for 10 is committed yet.
- `git status` and the full `git diff` of the 29 tracked files (+1372 / −108), plus the four new files
  (`ProductCountConsistencyTests.cs`, `TrendChart.test.tsx`, `Modal.test.tsx`, `AnalyticsSummary.test.tsx`). Every path
  is under `src/`, `tests/` or `frontend/bax-orders-web/src/`, and each is on spec §5's list. `CauseDecomposition`,
  `PeriodComparison`, `CauseLeader`, `components/analytics/labels.ts`, `ComparisonRows.tsx`, `DecisionHeadline.tsx`,
  the dashboard, the monthly report and `tools/` are not in the diff. There is no schema, migration or `package*.json`
  change. The only other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the runner
  leaves out of the commit.
- The raw Coder log `LOGS/20260924-211438-cycle20-coder.jsonl`, for every Edit, Write and Bash command and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile was again refused `dotnet test` and `npm run … test`: the harness asked for approval and did not
get it. As with Tasks 3–9, I checked the raw tool results in the Coder log instead:

| Check | Raw log evidence |
|---|---|
| Full backend suite | line 944 (`dotnet test BaxOrders.slnx`, command at 937): `Passed! - Failed: 0, Passed: 826` unit and `Passed! - Failed: 0, Passed: 683` integration (Task 9: 817 / 652) |
| Backend build | line 952 (`--no-incremental --artifacts-path`, because the running API locks `bin`): `0 Warning(s)`, `0 Error(s)` |
| Frontend tests | line 818: `Test Files 41 passed`, `Tests 701 passed` (Task 9: 38 / 655) |
| Frontend build (`tsc -b && vite build`) | line 799: `built in 1.26s`. The TS errors at 599 were fixture fields, fixed before it |

Order of edits against those runs:

- The last backend edits are `OrderAnalyticsTests.cs` (925) and `LinePricingModeTests.cs` (927). Both come before the
  full backend run (937/944) and the build (949/952).
- The earlier `Failed!` at 841 was `DashboardCauseTests`, which failed in the full run because the new supplier
  fixture's July money outranked that test's object on the shared dashboard. The Coder shrank the fixture's own
  amounts (925) and did not touch the dashboard test. The run at 944 is fully green.
- The last frontend edit is `CauseSummary.test.tsx` at 812, after the build at 799. That edit only changes expected
  string literals (`'2 məhsul'` → `'2 məhsuldan'`, the fix for the one failure at 808). It cannot introduce a type
  error, and the test run at 818 comes after it. No application file was edited after the build.

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout/clean/push`.

## Acceptance criteria (TASK-10 §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Zibil paketi shape: "Miqdar +160,00 ₼ · Qiymət +7,00 ₼" on its own line, each part coloured by 9.1, pill "Miqdar və qiymət", compact line unchanged | PASS. `isMixed` requires both effects non-null and non-zero. `Split` renders `quantityPartLabel` / `pricePartLabel` with `formatMoneyDelta`, `costDirectionToneClass` and `DirectionWord` for each part. The pill is `mixedCauseLabel` in slate `mixedCauseToneClass`. The `facts` line is untouched. Backend: `A_product_whose_quantity_and_price_both_moved_carries_both_parts` (50 → 55 PACK, 32 → 32,1273) asserts 167 = 160 + 7 and `Increased`. The frontend tests cover the split, the pill, and no split on a single-effect row |
| 2 | +870 `text-red-700`, −1.988 `text-emerald-700`, each with the `sr-only` word; `DriverList.tsx` / `TrendModal.tsx` do not import `signedToneClass` | PASS. Grepping the diff: both files drop the import and use `costDirectionToneClass` plus `DirectionWord` on the row money and on both `ComparisonDetail` effects. The `format.ts` comment now names only Task 11. The tests assert red/green, the word, and no `text-rose-700` |
| 3 | Same new / not-ordered / compared counts on every basis; the fixture has every awkward product; scope line; "məhsuldan"; comparison page says what it counts | PASS. `StateOf` is now public with one body, called by `Compare` and by `Explain`. It is not copied. `DecisionDriverDto.State` and `DecisionDecompositionDto.Products` are appended at the end. The skip rule keeps `New` / `NoLongerOrdered`. `ProductCountConsistencyTests`: 5 theories × 5 bases (Keçən ay, 3, 6, Bütün dövr, custom). Its world has a steady product, a mixed one, new priced, new unpriced, new internal-supply, new service, basis-only and two-basis-months products. It asserts the three count equalities, driver state = row state, the identical New / NoLongerOrdered sets, `InCurrentOrderCount == 6`, the free new product listed, the steady product not listed, and no figure moved. Chips filter by `state`, and their counts are the rows they leave. `driverScopeLine` gives the brief's sentence, with and without the "dəyişməyib" tail. `CauseSummary` says "{n} məhsuldan". `AnalyticsSummary` has the "Müqayisədə N məhsul: …" lead, and the search count reads "{n} məhsul göstərilir" |
| 4 | Şampun qab: every month labelled including "Avqust"; the line is `linear` | PASS. `XAxis dataKey="period" interval={0}` with `monthTickLabel`: full names, the year on the first slot and on January. `Line type="linear"`, and `connectNulls={false}` is kept. `TrendChart.test.tsx` mocks recharts and asserts those props, and the İyul 2026 / Avqust / Sentyabr ticks |
| 5 | Traktor 0 → 1: whole ticks including 0 and 1, no 0,25; supplier named | PASS. `valueAxis([0,1], true)` gives `[0, 1, 2]` and `allowDecimals={false}`. `wholeNumbers` only applies to the quantity metric with all-whole values. `supplierLine` names the latest ordered month's suppliers. On the backend there is one extra `Distinct (OrderRequestId, Supplier.Name)` query with `AzerbaijaniCollation` ordering. Three integration tests: two suppliers named once each with Ç before Z, a supplier-less line adds nothing, a month without the product is empty, and another product's supplier never appears |
| 6 | `body` is `overflow: hidden` while open, the overlay is `overscroll-contain`, and the old value is restored | PASS. `Modal` has a `useEffect` that stores the value this instance found and restores it on unmount. `Modal.test.tsx` covers open/close, stacked dialogs, consecutive dialogs and a dialog replaced in place |
| 7 | "…: 30 ədəd · bu ay: 40 ədəd — 1,3×" from the driver and from the comparison page; flat price does not reach the top | PASS. `quantityRatioLine` uses `describeBasis`, `formatQuantity` and the unit. `quantityRatio` is null on a 0/null baseline, and a current of 0 gives "— bu ay sifariş olunmayıb". Both pages build the prop from their own basis and row quantities. The comparison page builds it only when `baselineAvailable`. There is no ratio for a service. `valueAxis([32, 32.13])` gives a top above 32,13 × 1,1. Tested in `trend.test.ts`, `TrendModal.test.tsx` (with and without a driver) and `OrderDecisionPage.test.tsx` |
| 8 | Nothing else changed; all suites and builds green; sweep passes | PASS. The arithmetic classes are untouched. The five-query and writes-nothing tests are unchanged and green. `Compare`'s rounding in `StateOf` is a no-op for it: the current side is a sum of scale-3 quantities, and the baseline is already rounded to `QuantityScale` in `BaselineSide`. So the comparison page answers as before, and all existing `OrderAnalyticsTests` pass unmodified. The frequency line, the closed "Mənbə və versiya məlumatı", the sort and "Hamısına bax" are all kept. The old-terms sweep covers the new words |

## Invariants (TASK-10 §8)

- **Figures.** `AmountImpact` / `QuantityImpact` / `PriceImpact`, the category totals, "Cəmi" and the cause
  `variantCount` all come from `CauseDecomposition`, which is not in the diff. `Listing_a_product_that_cost_nothing_moves_no_figure`
  checks categories = total and quantity + price = amount on every basis.
- **Task 2.** An internal-supply month still reads "Daxili təminat" in slate. A month with a missing price now reads
  "—" plus the reused `MissingPriceMark` (`⚠ N`, named "N sətirdə qiymət yoxdur"). The mark was reused, not copied.
- **Tasks 5–9.** Words and units are unchanged. Task 6's order and emphasis are unchanged, and only the count word
  changed. The dashboard and the monthly report are not in the diff.
- **No database reached; HD-002's 94 rows untouched.**

## Changed tests

Each changed existing test is one the spec's §10 expected, or a fixture gaining `state` / `products` / `supplierNames`.
The removed assertions are these:

- the pre-9.1 `DriverList` colours (emerald up / rose down);
- the category-based New / not-ordered chip fixtures;
- `CauseSummary` "N məhsul";
- the `TrendModal` four-column header;
- the amber sentence in the price cell;
- one `text-emerald-700` on `+39,00 ₼`.

Each was replaced by an equal or stricter assertion of the new rule.

One change was **not** on the spec's list: `LinePricingModeTests.Order_frequency_costs_no_query_of_its_own`, where
the trend query count goes from 4 to 5. It follows directly from §4.5, which allows "at most one extra query" for the
suppliers. The test still proves what its name says: the frequency adds no query. I accept it.

No expected figure, class or business rule was loosened.

## Deviations from the spec (accepted)

1. `StateOf` rounds both quantities to `QuantityScale` before comparing. The spec did not ask for this. It is
   necessary for the two pages to agree, because the decomposition's baseline is the unrounded average and the
   comparison page's is rounded. It is a no-op for `Compare`, and it has a unit test
   (`An_unrounded_average_gets_the_label_the_rounded_one_on_the_screen_gets`).
2. `moneyIsUnknown` also shows "—" for a zero-money row whose price is incomplete. That is the pre-existing rule,
   kept. It adds the §4.2 case of no known amount on either side.

## Observations (not failures)

1. The brief's real figures cannot be checked without the real database: Zibil paketi +160 / +7, Nitroamafoska /
   Yay ayaqqabısı colours, Heydər Əliyev 58/60 → one number and 119, the Fəvvarələr scope line, Şampun qab's August,
   the Traktor axis and supplier, and the still page. The fixture tests prove them. The operator should confirm them
   on the running app after the API restarts on this commit, on "Keçən ay" and one averaged basis.
2. **Go-live order:** the new frontend reads `decomposition.products`, `driver.state` and `supplierNames`. An API not
   restarted on this commit sends none of them, and the order page would fail to render. Restart the API before
   serving the new frontend.
3. "Hamısı" can now be slightly larger than before on real data, because zero-money new or not-ordered products are
   listed. That is the point of §4.1.3, and the scope line says what it counts.
4. `OrderDecisionContextQueries`' class comment still says "Four queries" while the code and its test say five. This
   predates Task 10, and the Coder reported it rather than fixing it. It is harmless, and it can be tidied by any task
   that edits that file.
5. The frontend build ran before the last test-only edit (see above). This is immaterial here. The operator's usual
   `npm run build` re-run would close it formally.

## Scope

Nothing outside §3. The comparison page got only its lead line, its "göstərilir" word and the ratio prop. Its structure
and `components/analytics/labels.ts` are left for Task 11.

## Transition

- `PLAN.md`: 10 is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 11 — Obyekt səhifəsi və obyekt müqayisə səhifəsi**, the next task in the fixed order. Its brief
  `BRIEFS/TASK-11.md` exists, but `TASKS/TASK-11.md` does not, so the state is `PLANNING`.
- For Task 11:
  - `signedToneClass` is now left only behind `components/analytics/labels.ts` (the location screens and
    `ComparisonRows`);
  - the counts already agree through `DecisionProductCountsDto` and `ComparisonSummaryDto`;
  - the history window's `quantityRatio` prop must survive the merge.
- Task 11 changes no real data, so no §7 gate applies.
