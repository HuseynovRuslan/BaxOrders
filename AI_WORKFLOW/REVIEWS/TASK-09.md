# Review — Task 09: İdarəetmə paneli UX

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 10. Its brief exists but it
has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `1a53445` (Task 8). Nothing for 09 is committed yet.
- `git status` and the full `git diff` of the 21 tracked files (+1757 / −444), plus the five new files
  (`components/analytics/DirectionWord.tsx`, `components/dashboard/MissingPriceMark.tsx`,
  `components/dashboard/labels.test.ts`, `navigation/useScrollMemory.ts`,
  `tests/BaxOrders.IntegrationTests/DashboardAttentionTests.cs`). Every path is under `src/`, `tests/` or
  `frontend/bax-orders-web/src/`, and each is on spec §5's list or is one of the new files §5 names. `PeriodComparison`,
  `CauseDecomposition`, `CauseLeader`, `PortfolioCohort`, `DriverList.tsx`, `TrendModal.tsx`,
  `components/analytics/labels.ts`, `pricing/labels.ts`, the monthly report, the order page, `AppLayout` / `Header` /
  `Sidebar` and `tools/` are not in the diff. No schema, migration or `package*.json` change. The only other untracked
  paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the runner leaves out of the commit.
- The raw Coder log `LOGS/20260924-211438-cycle17-coder.jsonl`, for every Edit, Write and Bash command and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile was again refused `dotnet build` and `npm run … test` (the harness asked for approval and did
not get it). As with Tasks 3–8, I checked the raw tool results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Backend build | line 1184: `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`, because the running API locks `bin`) |
| Full backend suite | line 1176 (a `grep` of the full `dotnet test BaxOrders.slnx` log started at 1043): `Passed! - Failed: 0, Passed: 817` unit and `Passed! - Failed: 0, Passed: 652` integration. No `Failed!` line anywhere in the log |
| Frontend tests | line 1174: `Test Files 38 passed (38)`, `Tests 655 passed (655)` (Task 8: 37 / 600) |
| Frontend build (`tsc -b && vite build`) | line 1166: `built in 1.45s`, no type error (the TS errors at 764 were fixed before it) |

The last edit to a backend or test file is `PortfolioCohortTests.cs` at log line 422, before the full backend run
(1043). The last edit to any application file is `DashboardSummary.tsx` at line 1119. The frontend test run (1174),
the frontend build (1166) and the backend build (1184) all come after it. After that the only Writes are to
`LAST_REPORT.md` and `STATE.json`. This closes the gap Task 8's review noted: this time the backend summary lines are
in the raw log.

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout/clean/push`.

## Acceptance criteria (TASK-09 §9)

| # | Criterion | Result |
|---|---|---|
| 1 | First screen order and ≤ ≈ 400 px arithmetic | PASS. Page order: `PageHeader` (no description; Dövr + `BasisPicker size="sm"` in `actions`) → `DashboardHeadline` → `AttentionSection` → `DashboardExceptions` → "Bütün obyektlər" → chips → search/sort → table. A page test asserts that document order. The report's arithmetic uses the classes actually in the code (h-16, py-6, mb-6, p-4, text-3xl, mt-2/pt-2, mb-3). It puts the section at 385 px in the tallest case (controls wrapped), or 337 px with the controls on one row |
| 2 | Titles true and unique; runner-up says "İkinci"; "Həm də …"; warnings one card each; Novxanı / Milli shape | PASS. The backend `Attention` gives every reason a total ordering (`ThenByName`). `Rank` is the index before de-duplication, and `AlsoFirstIn` is taken from each movement's first row. `PerWarning = 1`, and `MaxAttention = 8` still holds. `attentionTitle` returns "Ən böyük …" / "İkinci ən böyük …", and a plain title with no superlative for any rank above 2. `DashboardAttentionTests` (real Postgres, all 5 bases, including "Bütün dövr" and a custom range): each rank matches an ordering rebuilt independently from every row. No `(Reason, Rank)` repeats. Each movement's rank-1 object is on screen and is the only one called the largest. The audit shape passes: Novxanı is `LargestIncrease` rank 2 with `AlsoFirstIn=[StrongPercentageChange]`, Milli is `StrongPercentageChange` rank 2, and there is no percentage card with rank 1 |
| 3 | 9.1 red/green + "xərc artıb / azalıb"; no dashboard file imports `signedToneClass`; no verdict words | PASS. `grep signedToneClass` in `src/` finds only `format.ts` (its definition, comment now names Tasks 10/11), `format.test.ts`, `analytics/labels.ts` (Task 11), `TrendModal.tsx` and `DriverList.tsx` (Task 10). The headline, card, table, footer, phone list and main cause use `costDirectionToneClass`. `costDirectionSentence` gives "Keçən aya görə xərc artıb". There is an `sr-only` `DirectionWord` on the table delta and the footer, and a shared component instead of a copy. Tests assert `text-red-700` / `text-emerald-700`, no `text-rose-700`, and no yaxşı/pis/müsbət/mənfi |
| 4 | Chips filter exactly what they count; zero chips hidden; still add up; headline price line = same filter | PASS. `GroupsOf` is computed once and passed to both `Summarize` and `Filter`. `HasOwedMissingPrice` is one static predicate, used by `LocationsWithMissingPrices` and by `missingPrice=true`. The summary count changed from `withCurrent.Count(Missing>0)` to `rows.Count(HasOwedMissingPrice)`; these are the same set. Integration tests: the missing-price filter equals the chip count, including an object with no priced line that `priceCoverage=Partial` misses. Each of the four group filters returns exactly its partition members. `group=99` / `Nonsense` gives 400. Frontend: chips are `<button aria-pressed>`, zero chips are not rendered, and only the price chip is amber. Clicking a chip sets its filter and clears the other four and the page, and keeps the search. The headline line is a button with unchanged words that sets `missingPrice=true` and scrolls the table heading into view |
| 5 | One page; largest change first by size; no-delta rows last | PASS. The page asks for `pageSize=100`, and the pager only shows above that. `DashboardSort.AbsoluteKnownAmountDelta = 11` (key `|delta|`, null last by name, existing `Sort` rule). The page default is descending with nothing written to the URL. Three options are offered, and an unknown `sort` falls back to the default. Integration test: −8.000, +5.000, +10, then no-delta by name, and ascending mirrors it. `Rows_sort_by_name_by_default…` is unchanged, so the API default is still the name |
| 6 | Back from the Heydər Əliyev card returns to that card; basis kept | PASS. `useScrollMemory` keys by `location.key` in `sessionStorage`. It records scrollY once per frame and on unmount, and records the anchor from a delegated click on the page root. On `POP` it restores once, after data has loaded: `scrollIntoView({block:'center'})` on the anchor, or `scrollTo(0, y)` if there is none. `history.scrollRestoration='manual'` while mounted. The test uses `MemoryRouter` with a stub order route and `navigate(-1)`, and asserts `scrollIntoView` on `#attention-21`. A PUSH restores nothing, and `scrollRestoration` goes back to its old value on unmount. The basis stays in the URL, so Task 1 is unchanged |
| 7 | "71.030,25 ₼ − Keçən ay: 44.340,78 ₼ = +26.689,47 ₼" is one line, and the difference is not under 71.210,29 | PASS. `Subtraction` is one `<p>` with real spaces and U+2212. Every figure comes from the backend. The test asserts the exact string in one element, and that the line under the total does not start with the difference. `PortfolioCohortTests.With_an_object_left_out…` proves `ComparedCurrent − Baseline == KnownAmountDelta`, and that `Current − ComparedCurrent` equals the left-out objects' money |
| 8 | Invariants on every basis including "Bütün dövr" | PASS. See criterion 2: all four invariant theories run over all 5 bases |
| 9 | Short ⚠ mark instead of the two sentences; amber only for missing prices; one-line cells; reload keeps the page | PASS. `MissingPriceMark` shows "⚠ N", or a bare ⚠ when the only gap is in the baseline. Its title and `aria-label` carry the sentences. It is used on the card and in the table and phone list. `Causes` no longer prints the sentences. The no-baseline card title, group chips and no-order status are now slate. `DetailsLink` is `whitespace-nowrap`, and its cell is `w-px whitespace-nowrap`. During a reload the page keeps the previous `data`, sets `aria-busy` and dims the table. `LoadingRows` shows only when nothing has loaded. An error clears the old figures. The `lastKey` guard is kept. There is a page test for the pending second response |
| 10 | Nothing else changed; suites/builds green; sweep passes | PASS. No figure computation changed: the attention change only makes the ordering explicit and adds rank fields, and the other changes are filters and one sort. The dashboard still runs five queries (`Naming_a_cause…` unchanged, green) and writes nothing. The old-terms sweep now also covers rank 2, "Həm də", an excluded object and an active chip, and it passes |

## Invariants (TASK-09 §8)

- **Movement selection unchanged.** `ThenByName` is the explicit form of the previous stable ordering. The rows reach
  `Attention` already name-sorted (`:135`), and LINQ ordering is stable. The integration test
  `The_movements_choose_the_same_objects_as_before` rebuilds the old two-per-reason, first-reason-wins rule, and gets
  the same (Reason, object) set on every basis.
- **Task 1 / 1b / 1c / 2 / 3 / 5 / 7 / 8.** Card, row and exception links still carry the basis, and the old cards
  keep the basis they were requested with. Exceptions are named as before, and the headline still equals the footer.
  The ⚠ still counts only owed lines, and internal supply never raises it. 24 / 27 and full names are unchanged. The
  "Əsas səbəb" block, product line, share and two secondary causes are unchanged in content and order, and the Task 7
  tests pass unmodified. The monthly report is not in the diff.
- **No database reached; HD-002's 94 rows untouched.**

## Changed tests

Every changed existing test is on spec §10's "deliberately" list, or is a fixture gaining `rank` / `alsoFirstIn`:

- `DashboardSummary`: the total/delta test now runs only with nothing left out (the brief says the difference sits
  beside the compared amount), and a new test covers the exception case. The direction sentences are now "xərc
  artıb / azalıb", and the colours red up / green down (9.1). "ambers only the price chip" follows the brief's
  "narıncı rəng çox işlənir". The chip tests use `closest('button')` with the same expectations.
- `LocationRows`: 9.1 colours plus the `sr-only` word. The two missing-price sentence tests now assert the ⚠ mark and
  its accessible name (brief: "qısa işarə və say ilə"). The "complete" test got stronger.
- `AttentionSection`: the `sr-only` word on the delta line was replaced by the visible sentence (spec §4.2). The
  product line's `sr-only` word is still asserted, and so is the no-yaxşı/pis check.
- `ManagementDashboardPage` and `oldTerms`: the fixtures gained fields, an excluded object and an active chip. The
  sweep's sentence check moved to the ⚠ mark's accessible name, where the sentence now lives.

No expected figure, class or business rule was loosened. The spec's literal "the element right under 71.210,29 does not
contain +26.689,47" could not hold under its own layout, because the subtraction block *is* that element. The test
checks what the brief complains about instead: the line under the total starts with "Müqayisə olunan 23 obyekt", not
with the difference. I accept this reading.

## Deviations from the spec (accepted)

1. The subtraction layout also appears when an object ordering for the first time this month has money in
   `noHistory`, not only when `noBaseline` is non-empty. The spec's own reason (the month's total is not the compared
   amount) applies to that case too. It makes no difference on the real "Keçən ay" data.
2. `missingPrice=false` returns the complement, like `hasCurrentRequest`. The UI only sends `true`.
3. A warning reason's single card is its rank-1 object. If that object already has a card, no warning card is shown.
   The fact is still on its ⚠ mark and on the price chip. This follows from spec §4.1.3 ("one card each", first
   reason wins).
4. The spec expected edits to `test/dashboardFixtures.ts` and a separate `useScrollMemory.test.tsx`. The fixtures that
   build a `DashboardAttention` live in the three test files that were edited, and `tsc -b` would fail on any other.
   The Back tests are in the page test, which §10 allows.

## Observations (not failures)

1. The brief's real figures cannot be checked without the real database: the Heydər Əliyev / Novxanı / Bayıl yolu /
   Milli Konservatoriya titles, "Qiymət yoxdur · 10 obyekt", 71.030,25 − 44.340,78, the 1366×768 first screen and
   Back to the card. The fixture tests above prove them. The operator should confirm them on the running dashboard
   after the API restarts on this commit, on "Keçən ay", "Son 3 ay" and "Bütün dövr".
2. **Go-live order:** the frontend sends `sort=AbsoluteKnownAmountDelta` (enum 11) by default. An API not yet
   restarted on this commit would refuse it with 400. Restart the API before serving the new frontend.
3. The one-line fit of the subtraction at 1366 px is estimated from character widths, not measured in a browser.
4. The phone list's delta has no `sr-only` direction word; §4.4 only required it on the table cell and the footer.
   Task 12 owns that list's structure.
5. When the attention section shows two percentage cards, the final order is still `Reason` then `|delta|`, as the
   spec requires. So an "İkinci …" card can come before the "Ən böyük …" card of the same reason. Both titles are
   still true.

## Scope

Nothing outside §3.

## Transition

- `PLAN.md`: 09 is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 10 — "Əsas dəyişikliklər", məhsul tarixçəsi və məhsul saylarının uyğunluğu**, next in the fixed
  order. Its brief `BRIEFS/TASK-10.md` exists, but `TASKS/TASK-10.md` does not, so the state is `PLANNING`.
- Task 10 moves `DriverList.tsx` / `TrendModal.tsx` onto 9.1. It can reuse `DirectionWord` and
  `costDirectionSentence`. It changes no real data, so no §7 gate applies.
