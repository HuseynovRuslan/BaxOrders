# TASK 08 — AYLIQ HESABAT (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-08.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** A small backend addition to the report query (a wider look-back, three fields on
the cell, one on the row, one pure rule) and a rework of one table component with its page and tests. It fits one
Coder session.
Specification status: READY — written by the Planner on 2026-09-24 from the brief and the repository at `4994803`
(Task 7's accepted commit). Line numbers below are at `4994803`.

This task **reads** data and changes how the monthly report presents it. It changes no stored figure, no schema,
no row in the database. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief's goal: "Rəhbər il cədvəlinə baxanda bütün rəqəmləri oxumadan qeyri-adi ayları tutsun və ay cəmlərini
görsün. Cədvəl adi noutbukda da işləsin."

The owner's dependency table (`BRIEFS/OWNER_BRIEFS_MASTER.md`) gives Task 08 "Aylıq hesabat (masaüstü)", depending on
05, with the colour rule in 09 (9.1). Task 12 depends on 08 and owns the report's mobile structure. Decisions 8.1 and
8.2 are this task's; 9.1 is applied, not re-invented — Task 6 wrote it once as `costDirectionToneClass` /
`costDirectionBarClass` (`components/analytics/format.ts:315–330`).

## 2. Verified current behaviour (repository at `4994803`)

### 2.1 Backend — `src/BaxOrders.Application/Reports/`

- `MonthlyReportQueries.GetAsync` (`MonthlyReportQueries.cs:34–101`) runs **four queries**: available years, the
  year's location universe (`LocationUniverse.ForYear`, Task 3), the highest version of every request from
  **December of the previous year** to December of the year (`:56–68`), and the priced totals of those requests
  (`TotalsAsync`, `:106–141`). `A_whole_year_is_four_queries_not_one_per_cell`
  (`tests/BaxOrders.IntegrationTests/MonthlyReportTests.cs:311`) pins the four.
- A cell's `KnownAmount` is rounded to the cent where it is computed (`KnownAmountOf`, `:218–226`); null when the
  month has no request or nothing in it is priced. `DeltaAmount` / `DeltaPercent` are against the calendar month
  before (`Cell`, `:182–216`, via `OrderAnalyticsCalculator.AmountDifference` → `PercentChange`, two decimals, half
  away from zero). They are computed whether or not the amount is complete.
- `MissingPriceItemCount` counts only lines that owe a price; internal supply is excluded (`:125–128`, Task 2).
- `MonthlyReportDto.Months` (`Months`, `:228–259`) already carries the **company's** total per month —
  `KnownAmount`, `MissingPriceItemCount`, `AmountIsComplete` — over every row, never the searched subset
  (`A_search_narrows_the_rows_and_leaves_the_totals_describing_everything`, `MonthlyReportTests.cs:183`).
  `MonthlyReportDto.KnownAmount` is the year's company total. Neither is shown anywhere today.
- A row has no way to say "this location has never ordered": `RequestCount` is this year's only
  (`MonthlyReportDtos.cs:38–47`).
- The migration tool hashes the report's figures (`tools/BaxOrders.CatalogueMigration/Invariants.cs:135–162`,
  `Verification.cs:85–88`): year/month/row/cell amounts, deltas, request and missing-price counts. None of those may
  move.

### 2.2 Frontend

- `components/reports/MonthlyReportTable.tsx`:
  - the panorama is `hidden … xl:block` (`:44`) — shown only from 1280px; below that `MonthlyReportMonthList`
    (`:235–295`, `xl:hidden`) shows one month as cards, and the page's month picker is `xl:hidden`
    (`pages/MonthlyReportPage.tsx:113`);
  - the wrapper reclaims the page gutters with `-mx-4 sm:-mx-6 xl:-mx-8` (`:44`), so at 1440 the table is 64px wider
    than the summary cards above it (the brief's "kartların hüdudundan kənara çıxır");
  - `table-fixed w-full`, columns `w-[180px]` / twelve equal / `w-[96px]` (`:47–54`), text `text-xs`;
  - header cells are **not** sticky to the top — only the first (`sticky left-0`) and last (`sticky right-0`) are
    pinned sideways (`:58–78`); header and body sticky cells use `z-20` / `z-10`, and the app header
    (`layout/Header.tsx`) is `sticky top-0 z-20 h-16`;
  - there is no totals row;
  - `Cell` (`:141–167`): a month with no request draws `—` with title `"{Ay} {il}: sifariş yoxdur"` — for October
    2026 as much as for a past month;
  - `Secondary` (`:173–200`) shows **either** the change (`compactDelta`: percent, else money) **or**, when the
    amount is incomplete, `⚠ N` — never both. Its colour is `signedToneClass` (pre-9.1, `:194`);
  - the status dot's meaning is only in the cell's `title` / accessible name; nothing on screen explains it;
  - amounts carry `₼` with a no-break space (`formatMoney`, `manatSuffix`), which is why five-digit neighbours
    ("23.449,32 ₼ 11.161,99 ₼") nearly touch in ~62px columns;
  - no cell is highlighted for any reason.
- Layout: `AppLayout` puts the sidebar at `lg:pl-64` (256px from 1024px) and the page in
  `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`. The page's content width is therefore about
  `viewport − 256 − 64 − scrollbar (≈17px on Windows)`: ≈687px at 1024, ≈863 at 1200, ≈1029 at 1366, ≈1103 at 1440.
- The dashboard already names a never-ordered object "Sistemdə hələ sifarişi yoxdur"
  (`coverage/labels.ts:34`, `portfolioGroupLabels.NoHistory`).
- The link from a cell is `/orders/{id}` with no basis, so the order opens on "Keçən ay" (Task 1) — correct, keep it.
- Tests: `pages/MonthlyReportPage.test.tsx` (368 lines; "the grid", "the controls", "the phone", "the panorama") and
  the monthly-report sweep in `terminology/oldTerms.test.tsx:1087` (fixture `reportCell` / `monthlyReport`,
  `:744–800`).

## 3. Scope

In scope (every line of the brief's "İstədiyim nəticə"):

- A. A totals row under the table: each month's company total and the year's, with no percentage (8.1).
- B. Unusual months (8.2): computed once in the backend, highlighted in the cell by direction.
- C. Future months look different from past empty months and never say "sifariş yoxdur".
- D. ⚠ and the percentage together in one cell.
- E. An on-screen legend for the status dot (and for the other marks the grid uses).
- F. 9.1 on the report: the cell's change and the unusual-month highlight coloured by cost direction.
- G. The panorama from 1024px; amounts never crowd; the table no wider than the page; at 1366 and 1440 all twelve
  months without horizontal scrolling and a header that stays on top.
- H. A location that has never ordered (Çadır) shown with the dashboard's words "Sistemdə hələ sifarişi yoxdur".
- I. Tests.

Out of scope (the brief's list, plus what belongs to later tasks):

- the report's mobile structure — Task 12. `MonthlyReportMonthList` keeps its structure; it only moves its
  breakpoint (§4.7) and stops saying "sifarişi yoxdur" of a future month (§4.4);
- the colour rule itself — Task 9 (9.1); this task applies it;
- words and units — Task 5 (accepted); new words come from `src/terminology`, old ones are not reworded;
- the dashboard, the order page, the objects screens — Tasks 9, 10, 11;
- any change to a figure the report already computes.

## 4. Required behaviour

### 4.1 The unusual-month rule (8.2), written once in the backend

Add a pure static function in `src/BaxOrders.Application/Reports/` (a new file, e.g. `UnusualMonth.cs`; the Coder may
choose the name), unit-testable without a database:

```csharp
/// How a month compares with the location's three previous months that have a known amount (owner decision 8.2).
public sealed record UnusualMonthResult(decimal? RecentAverage, decimal? RecentAveragePercent, bool IsUnusual);

/// <param name="amount">The month's known amount, as the cell shows it.</param>
/// <param name="previousAmounts">The known amounts of the location's earlier available months, oldest first.</param>
public static UnusualMonthResult Of(decimal? amount, IReadOnlyList<decimal> previousAmounts)
```

Rule, exactly:

1. **Available month** ("mövcud ay") = a month of this location, strictly before the cell's month, that has a
   request (the highest version, as everywhere in the report) **and** a non-null known amount. Months with no request
   are skipped, however many; a request whose every line is unpriced has no figure and is skipped too — it is
   unknown, not zero. The look-back is not limited to the report's year (see 4.2).
2. The **three most recent** available months are the baseline. Fewer than three → `(null, null, false)`: no
   highlight (8.2, "yetərli tarixçə yoxdursa, anomaliya göstərilmir").
3. `amount` null → `(null, null, false)`.
4. `RecentAverage = Money.RoundCents((a + b + c) / 3)` — to the cent, like every baseline since Task 1c, so the
   average the reader sees and the percentage beside it agree.
5. `RecentAveragePercent = OrderAnalyticsCalculator.PercentChange(amount, RecentAverage)` (two decimals, half away
   from zero; null when the average is 0).
6. `IsUnusual = RecentAveragePercent is { } p && Math.Abs(p) > 50m` — strictly more than ±50% (brief: "±50%-dən
   çox"), decided on the same rounded percentage the screen prints, so a cell that says "+50%" is never highlighted.

Consequences the tests must pin (the brief's own figures): June 36.010,19 against March–May averaging 14.458,58 →
+149,06%, unusual; August 11.985,02 against May–July averaging 23.048,12 → −48,00%, not unusual; January, February and
March of a location whose history starts in January → not evaluated.

### 4.2 The report query (backend)

- `MonthlyReportCellDto` gains, **at the end** of its parameter list:
  `decimal? RecentAverageKnownAmount, decimal? RecentAveragePercent, bool IsUnusual` — filled from 4.1 for every
  cell that has a request; `(null, null, false)` for a cell without one. XML doc on each (`<param>`), in the file's
  style: what "available" means, and that fewer than three gives no verdict.
- `MonthlyReportRowDto` gains, at the end, `bool HasAnyRequest` — false when the location has no request in any
  month up to and including December of the report's year (the report's version of the dashboard's `NoHistory`:
  "as of" the period being read). Doc comment says so.
- The request query's lower bound (`from = new DateOnly(year - 1, 12, 1)`, `:56`) is **removed**: the query reads the
  highest version of every request up to December of the year, so January's look-back can reach the previous year and
  `HasAnyRequest` can be answered. `TotalsAsync` then totals those requests. Still **four queries**
  (`A_whole_year_is_four_queries_not_one_per_cell` stays 4 unchanged). Update the class's `<remarks>`: the "Thirteen
  months, not twelve" paragraph becomes "Every month up to the year's end", saying why (the look-back of 8.2 and the
  never-ordered row), and that only the year's twelve months enter any total.
- `Build` computes each cell's look-back from the location's earlier periods in that dictionary (ordered by period,
  `KnownAmount` not null, strictly before the cell's month, last three). Pure in-memory work, no new round trip.
- Nothing else moves: every existing field of every cell, row, month and the report keeps its value; `Months`,
  `CompanyTotals`, the row's `KnownAmount`, `RequestCount`, `MonthsWithoutRequest` still count only the twelve months
  of the year. The migration tool's invariants (§2.1) are unaffected — prove it with the existing
  `MonthlyReportTests` staying green, not by running the tool.

### 4.3 The totals row (8.1)

- A `<tfoot>` row under the locations, labelled `Cəmi` (new constant in `terminology/terms.ts`, e.g.
  `monthlyTotalsRowLabel`).
- Month cells show `formatMoney(report.months[i].knownAmount)`; the year cell shows `formatMoney(report.knownAmount)`.
  Both come from the backend; the browser adds nothing up.
- **No percentage, no change, no colour** in this row (8.1). A month whose company total is incomplete
  (`amountIsComplete: false`) shows `⚠ N` (`missingPriceItemCount`, Task 2 counting) under its amount, amber, as a
  cell does — so a partial total is never presented as the whole story (the codebase rule in `amountHeading`). Its
  title / accessible name says so with `missingPriceCount(...)`.
- A month with no request anywhere: `—` if it is past, the future-month treatment (4.4) if it is future.
- Visually the strongest row of the table: `font-semibold`, a top border, the year column's quiet band.
- `report.months` describes the whole company, never the searched subset. When a search is active
  (`filteredLocationCount !== locationCount`) the label reads `Cəmi — bütün obyektlər` (a second constant), so a
  reader never tries to add the visible rows up to it.
- With no search, the row reads the brief's figures on the real data: Yanvar 11.084,35 · … · Sentyabr 71.210,29 ·
  İl 431.670,91 ₼ — and September equals the dashboard's month total (proved in §10, not by reading real data).

### 4.4 Future months

- A month is **future** when its period is after the current calendar month (the browser's today, compared as
  `yyyy-MM`). Write it once, e.g. `isFutureMonth(period: string, today = new Date()): boolean` beside `formatMonth` in
  `components/analytics/format.ts` (or in the report component; one place).
- A future cell **with** a request is an ordinary cell (an order entered ahead of time is still an order).
- A future cell **without** a request: no `—`, no link, empty content, a visibly different background from a past
  empty month (e.g. a very light hatched or `bg-slate-50/60` fill), and title / accessible name
  `"{Oktyabr 2026}: gələcək ay"` — a new constant (e.g. `futureMonthLabel = 'Gələcək ay'`). Never "sifariş yoxdur".
- The month's column header is quieter for a future month (e.g. `text-slate-400`), so the whole column reads as not
  yet happened.
- Past empty months keep today's `—` and "sifariş yoxdur" (the brief does not ask to reword them).
- `MonthlyReportMonthList` (the narrow layout, structure unchanged — Task 12): when the chosen month is future, its
  quiet line says the month has not come yet (the same constant, e.g. "Oktyabr 2026 — gələcək ay") instead of
  "N obyektin bu ay üçün sifarişi yoxdur".

### 4.5 A cell

Cell content, top to bottom:

1. The amount — `formatMoney`, `whitespace-nowrap`, `tabular-nums`, `font-medium`. Never truncated, never wrapped.
2. The secondary marks, right-aligned, `text-[11px]`, allowed to wrap onto a second line inside the cell (never
   into the neighbour, never clipped):
   - the change: percentage when there is one, else the money change (today's `compactDelta`), coloured with
     `costDirectionToneClass(deltaPercent ?? deltaAmount)` (9.1). Shown **whether or not** the amount is complete;
   - `⚠ N` in amber when the amount is incomplete — **beside** the change, not instead of it (brief: "⚠ və faiz eyni
     hücrədə birlikdə görünür"; Bayıl yolu's September shows both);
   - the status dot, as today (undecided `Draft` unmarked).
3. Unusual month (`isUnusual`): the whole cell gets a tint by direction of `recentAveragePercent` — red for an
   increase, green for a decrease — plus a thin ring of the same hue, and the amount is `font-semibold`. The tint is a
   new sibling of the 9.1 helpers in `format.ts`, e.g. `costDirectionTintClass(value)` returning
   `bg-red-50 ring-1 ring-inset ring-red-200` / `bg-emerald-50 … ring-emerald-200` / `''` — the same rule in another
   shape, as `costDirectionBarClass` is; no new rule.

The cell's title and accessible name (`describe`) keep everything they say today and add:

- after the change, the direction word from `costIncreasedLabel` / `costDecreasedLabel` (as Tasks 6 and 7 did);
- for an unusual month: `Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması {formatMoney(avg)}, fərq {formatPercent(p)}`
  (words from new constants).

No "yaxşı / pis" anywhere. The link stays `/orders/{id}` with no basis (Task 1).

### 4.6 The never-ordered location

A row with `hasAnyRequest: false` renders its twelve month cells as **one** cell (`colSpan={12}`) reading
`portfolioGroupLabels.NoHistory` — "Sistemdə hələ sifarişi yoxdur" — in `text-slate-500`, imported from
`coverage/labels.ts`, not retyped. Its year cell stays `—`. The row is still in the table, in its alphabetical place
(Task 3). A location with `hasAnyRequest: true` but no request this year keeps twelve ordinary empty cells.

### 4.7 Width, fit and the sticky header

The arithmetic (content width from §2.2; the widest cell amount is five digits, "36.010,19 ₼" ≈ 58px at 11px and ≈ 63px
at 12px; the widest year figure "431.670,91 ₼"):

- Columns: object `9rem` (144px), each month **at least** `4rem` (64px), year `5.5rem` (88px). The table is
  `table-fixed w-full` with `min-w-[1000px]` (144 + 12×64 + 88); months share whatever the container has beyond that.
- Amounts `text-[11px]` below 1440px and `text-xs` from 1440px (`min-[1440px]:text-xs`): at 1366 a month column is
  ≈66px (≥ 8px between neighbouring amounts); at 1440 ≈74px for 12px text (≥ 10px).
- Object names may wrap onto two lines; they are **not** truncated (full names, Task 3). `title` stays.
- The panorama (and its legend) shows from `lg` (1024px): `hidden lg:block`. `MonthlyReportMonthList` and the
  page's month picker become `lg:hidden`.
- Between 1024px and the width where 1000px fits (≈1340px including a scrollbar), the table scrolls **inside its own
  box**: the wrapper is `lg:overflow-x-auto`, the object column and the year column stay pinned (`sticky left-0` /
  `sticky right-0`, as today). The page itself never scrolls sideways. From `min-[1340px]` the wrapper is
  `overflow-x-visible` — the table fits, there is nothing to scroll, and the sticky header works against the page.
  (An `overflow-x: auto` ancestor would capture `position: sticky` — which is why it is switched off where the brief
  requires the sticky header.)
- **No negative margins**: remove `-mx-4 sm:-mx-6 xl:-mx-8`. The table's box is exactly as wide as the summary cards
  above it.
- Header row sticky to the top of the page: every `<th>` in `<thead>` is `sticky top-16` (below the 64px app header).
  Z-order: the app header (`z-20`) must stay above everything in the table; header corner cells above header cells
  above body sticky cells above body cells (e.g. `z-[3]` / `z-[2]` / `z-[1]`). Keep `border-separate` (sticky
  borders need it) and give header cells an opaque background.

Result: at 1366 and 1440 all twelve months without horizontal scrolling, header on top (brief, must-preserve); at
1200 and 1024 the twelve-month table, not the card list, with the object and year columns pinned (brief: "təxminən
1024px-dən başlayaraq işləyir", "1200px enində də 12 aylıq cədvəli görürəm").

### 4.8 The legend

One line (wrapping as needed) directly above the table, inside the `lg:block` panorama, `text-xs text-slate-600`,
reading in order:

- the three status dots with their words, from `workflowStatusClass` / `workflowStatusLabels` (PendingApproval,
  Approved, ReturnedForCorrection) — the same dot element the cells use;
- `⚠ N` — `missingPriceShortLabel` ("Qiymət yoxdur"), imported from `pricing/labels.ts`; no new word for it;
- the percent: "Faiz — əvvəlki aya görə" with a red and a green sample worded `costIncreasedLabel` /
  `costDecreasedLabel` (9.1);
- a tinted sample: `Qeyri-adi ay` — "əvvəlki 3 mövcud ayın ortalamasından 50%-dən çox fərq";
- a future-month sample: `Gələcək ay`.

All legend words live in `terminology/terms.ts` (new constants) or are imported from where they already live. The
legend is `aria-hidden` only if every word in it is also in the cells' accessible names; otherwise leave it readable.

### 4.9 The page

`MonthlyReportPage.tsx`: pass `report` (or `rows`, `months`, `knownAmount`, `locationCount`,
`filteredLocationCount`) to the table so it can draw the totals row; switch the month picker to `lg:hidden`. The
summary cards, filters, URL state and fetch are unchanged.

---

## 5. Files — summary for the Coder

Changed (expected):

- Backend: `Application/Reports/<new file>.cs` (4.1); `Application/Reports/MonthlyReportDtos.cs`;
  `Application/Reports/MonthlyReportQueries.cs`.
- Backend tests: a new unit-test file under `tests/BaxOrders.UnitTests/Reports/`;
  `tests/BaxOrders.IntegrationTests/MonthlyReportTests.cs`; one identity test against the dashboard (in
  `MonthlyReportTests.cs` or `MoneyIdentityTests.cs`, Coder's choice).
- Frontend: `api/reports.ts`; `components/reports/MonthlyReportTable.tsx`; `pages/MonthlyReportPage.tsx`;
  `components/analytics/format.ts` (`costDirectionTintClass`, `isFutureMonth`); `terminology/terms.ts` (new words);
  tests — `pages/MonthlyReportPage.test.tsx` (and/or a new `components/reports/MonthlyReportTable.test.tsx`),
  `components/analytics/format` tests if they exist, `terminology/terms.test.ts`, `terminology/oldTerms.test.tsx`
  (fixture gains the new fields; the sweep covers the new words).

Not changed: the dashboard (`ManagementDashboardQueries`, `LocationRows.tsx`, `DashboardSummary.tsx`,
`AttentionSection.tsx`); the order page and decision context; `coverage/labels.ts` (imported, not edited);
`workflow/labels.ts`; `pricing/labels.ts`; `signedToneClass`'s behaviour; `AppLayout` / `Header` / `Sidebar`;
`tools/`.

Keep the codebase's idiom: comments say *why*; one word per idea from `src/terminology`; C# XML doc comments in the
style of `MonthlyReportDtos.cs`; the component's existing doc comments rewritten where the design they describe
changes (the "no sideways scrolling" and "reclaims the page gutters" comments are now false).

## 6. Backend requirements

- As 4.1 and 4.2. Read-only; `Reading_the_report_writes_nothing` stays green.
- No schema change, no EF migration, no new endpoint, no change to the dashboard's or order page's queries.
- Still four queries.
- If a requirement seems to need a change to a figure the report already returns, **STOP** and report why.

## 7. Safety and STOP conditions

- **No access to the real database**: do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`. Integration tests use their own disposable databases, as in every earlier task.
- No data change; HD-002's 94 rows untouched.
- No figure changes: every amount, delta, percentage, count and total the report or the dashboard returns stays what
  it is. If the identity test of §10 (report vs dashboard) fails, **STOP** — do not "fix" either side's figures;
  report the case.
- Do not rework Tasks 1–7; a defect found there goes into the report.
- Do not touch the screens of later tasks (§3 out of scope), even to "make the colours consistent".
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- Every figure: cell amounts, month-to-month differences and percentages, row and year totals, month totals, request
  and missing-price counts (Tasks 1b/1c). The report's September equals the dashboard's.
- At 1366 and 1440: January to December without horizontal scrolling; the header row stays at the top.
- Clicking a cell opens that order, without a basis, so it opens on "Keçən ay" (Task 1).
- The "İl cəmi" column stays (`yearTotalLabel`), pinned on the right.
- 27 objects, full names, Azerbaijani alphabetical order (Task 3); Çadır keeps exactly one row.
- ⚠ counts by Task 2's rule: internal supply excluded.
- Task 5's words and money format (`₼` never separated from its amount — no-break space, `whitespace-nowrap`); the
  old-terms sweep stays green; no codes or versions on screen (05b).
- A month with no request never reads as zero.
- No schema, migration or data change; the report stays at four queries and writes nothing.

## 9. Acceptance criteria

1. Under the table a `Cəmi` row shows each month's company total and the year's, with no percentage, no change and no
   direction colour; its figures are `report.months[].knownAmount` and `report.knownAmount`; the report's month total
   equals the dashboard's month total (Sentyabr 71.210,29 on the audit data). *(brief acceptance 1; 8.1)*
2. A Heydər Əliyev-shaped row: June 36.010,19 after March–May averaging 14.458,58 is highlighted (+149,06%); August
   11.985,02 after May–July averaging 23.048,12 (−48,00%) is not; January–March are not (fewer than three available
   months). *(brief acceptance 2–4; 8.2)*
3. The rule looks at the three most recent **available** months, skipping months with no request or no known amount,
   and reaching into the previous year; exactly ±50,00% is not highlighted, beyond it is.
4. With today in September 2026, October–December cells without a request show no `—`, never "sifariş yoxdur", and
   look different from a past empty month; their headers are quieter. *(brief acceptance 5)*
5. A Bayıl yolu-shaped September cell (incomplete, ⚠ 1, +254,03%) shows both "⚠ 1" and "+254,03%". *(brief
   acceptance 6)*
6. The legend above the table explains the status dots, ⚠, the percentage and its colours, the unusual-month tint and
   the future month, on screen.
7. Increases red, decreases green (the cell's change, the unusual tint) through `costDirectionToneClass` /
   `costDirectionTintClass`; `MonthlyReportTable.tsx` no longer imports `signedToneClass`; no "yaxşı / pis". *(9.1)*
8. The panorama shows from 1024px (`lg`); below the fit width it scrolls inside its own box with the object and year
   columns pinned; from 1340px it does not scroll; no negative margins; header cells `sticky top-16`; month columns
   never narrower than 64px; amounts `whitespace-nowrap` and `tabular-nums`. *(brief acceptance 7; must-preserve)*
9. A never-ordered location shows one cell "Sistemdə hələ sifarişi yoxdur" — exactly `portfolioGroupLabels.NoHistory`
   — across the twelve months. A location that ordered in an earlier year but not this one does not.
10. Nothing else changed: all figures, the four queries, the dashboard, the order page; all suites and both builds
    green; the old-terms sweep passes.

## 10. Required tests

Backend — unit (`tests/BaxOrders.UnitTests/Reports/`, on the function of 4.1):

- Heydər Əliyev June: previous `[12000.00, 14375.74, 17000.00]`, amount 36010.19 → average 14458.58, percent 149.06,
  unusual.
- Heydər Əliyev August: previous `[…, 17000.00, 36010.19, 16134.16]`, amount 11985.02 → average 23048.12, percent
  −48.00, not unusual.
- Fewer than three previous → `(null, null, false)`; zero previous; null amount.
- Only the **last three** are used when more exist.
- Boundaries: exactly +50,00 and −50,00 → not unusual; +50,01 and −50,01 → unusual.
- Average 0 → percent null, not unusual.

Backend — integration (`MonthlyReportTests`):

- A location with months Jan, Feb, Apr, May (no March request) → May's `RecentAverageKnownAmount` averages Jan, Feb,
  Apr.
- A month whose request has only unpriced lines is skipped by the look-back.
- January 2026 is evaluated against October–December 2025 when they exist; a 2026 January with only two earlier months
  is not.
- `HasAnyRequest`: a never-ordered active location → false; an active location that ordered only in 2025, read for
  2026 → twelve empty cells and `HasAnyRequest` true; every location that ordered in the year → true.
- The report's existing figures are unchanged by the wider window: a December 2024 request does not enter 2025's or
  2026's totals; January's `PreviousMonthKnownAmount` is still December of the year before.
- `A_whole_year_is_four_queries_not_one_per_cell` and `Adding_locations_that_never_ordered_costs_no_extra_query`
  unchanged and green.
- Identity with the dashboard, in one database: for each month of the fixture, `report.Months[m].KnownAmount` equals
  the dashboard's `Summary.Current.KnownAmount` for that month; and for September, every dashboard row's
  `KnownAmountPercentChange` under `PreviousMonth` equals that location's report cell `DeltaPercent`.

Frontend (vitest), pinning today with `vi.useFakeTimers({ toFake: ['Date'] })` / `vi.setSystemTime(2026-09-24)` where
the future matters:

- Totals row: label `Cəmi`; figures from `months` and `knownAmount` (e.g. Sentyabr "71.210,29 ₼", İl
  "431.670,91 ₼"); no `%` and no `text-red-700` / `text-emerald-700` in the row; ⚠ on an incomplete month; the label
  `Cəmi — bütün obyektlər` when a search is active.
- Unusual cell: tint and ring by direction (red for +149,06, green for a −60 month), `font-semibold` amount, title /
  name containing "Qeyri-adi ay", "14.458,58 ₼" and "+149,06%"; a non-unusual cell has no tint.
- Future: with today 2026-09-24 an October cell without a request has no "—", no "sifariş yoxdur", title "Oktyabr
  2026: gələcək ay", a class distinct from a past empty cell; an October cell **with** a request is ordinary; the
  Okt/Noy/Dek headers are quieter; with today in 2027 no 2026 month is future.
- Bayıl: an incomplete cell with `deltaPercent: 254.03`, `missingPriceItemCount: 1` shows "⚠ 1" and "+254,03%".
- 9.1: a positive change `text-red-700`, a negative one `text-emerald-700`; no `signedToneClass` classes in the table.
- Legend: shows the three status words, "Qeyri-adi ay", "Gələcək ay", the ⚠ word and both direction words.
- Never-ordered row: one cell with colSpan 12 reading "Sistemdə hələ sifarişi yoxdur".
- Layout classes: wrapper `hidden lg:block`, `lg:overflow-x-auto`, `min-[1340px]:overflow-x-visible`, no `-mx-`;
  table `table-fixed w-full min-w-[1000px]`; `<col>` widths 9rem / none / 5.5rem; every `thead th` has `sticky` and
  `top-16`; the list and the month picker `lg:hidden`; every `₼` value `whitespace-nowrap`.
- The cell link is still `/orders/{id}` with no query string.

Existing tests that change **deliberately**, each named in the report with the brief line that changes it:

- "lays the year out at a fixed width …" (asserts no `overflow-x-auto`) → in-box scrolling below 1340px (brief:
  "təxminən 1024px-dən başlayaraq işləyir").
- "spends its width on twelve equal months …" (`w-[180px]` / `w-[96px]`) → the new widths.
- "reclaims the page gutters …" (`-mx-4`, `xl:-mx-8`) → removed and replaced by a test that there are none (brief:
  "1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır").
- "the phone" (`.xl\:hidden`) → `.lg\:hidden`.
- "marks unpriced lines compactly …" → still `⚠ 2`, now also asserts the percentage beside it.

Every other existing expectation stays as it is. Fixtures that build a full `MonthlyReportCell` / `MonthlyReportRow`
gain the new fields (`recentAverageKnownAmount: null, recentAveragePercent: null, isUnusual: false`,
`hasAnyRequest: true`) — mechanical; list the files.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`--artifacts-path` into the scratchpad if the running API
  locks `bin`; say so, and do not stop the API).
- `dotnet test BaxOrders.slnx` — all green; unit and integration counts **up** from Task 7's 807 / 616 by the new tests
  only.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  (`tsc -b` is the type check) — green, with counts (Task 7: 37 files / 571 tests).
- `git diff --stat`, `git status`: changes only under `src/BaxOrders.Application/`, `tests/` and
  `frontend/bax-orders-web/src/`.
- The brief's real figures (the totals row, Heydər Əliyev's June and August, Bayıl yolu's September) cannot be read
  without the real database, which this task does not touch. They are proven by the rule's unit tests with the
  brief's own numbers and by the identity test. Say in the report that the operator can confirm them on the running
  report after the API is restarted on this commit, at 1024, 1200, 1366 and 1440.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Ay cəmləri və il cəmi sətri; faiz yoxdur (8.1). | §4.3; criterion 1 |
| Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox; 3 mövcud ay yoxdursa vurğu yoxdur (8.2). | §4.1, §4.2, §4.5.3; criteria 2, 3 |
| Gələcək aylar keçmiş boş aylardan fərqlənir, "sifariş yoxdur" demir. | §4.4; criterion 4 |
| ⚠ və faiz eyni hücrədə. | §4.5.2; criterion 5 |
| Status nöqtəsinin qısa izahı ekrandadır. | §4.8; criterion 6 |
| Artım qırmızı, azalma yaşıl (9.1). | §4.5; criterion 7 |
| ~1024px-dən işləyir; məbləğlər sıxlaşmır; cədvəl səhifənin eninə uyğundur. | §4.7; criterion 8 |
| Çadır: "Sistemdə hələ sifarişi yoxdur". | §4.2 (`HasAnyRequest`), §4.6; criterion 9 |
| Hesabatdan sifarişə keçid bazasız, "Keçən ay" ilə (Task 1). | §4.5, §8 |
| 27 obyekt, tam adlar, Azərbaycan əlifbası (Task 3). | §4.6, §4.7 (names wrap, not truncated), §8 |
| ⚠ Task 2 qaydası ilə; daxili təminat daxil deyil. | §4.3, §4.5, §8 |
| 1366 və 1440-da Yanvar–Dekabr sürüşdürmədən; başlıq sabit. | §4.7; criterion 8 |
| Hücrəyə klik sifarişi açır; "İl cəmi" qalır; rəqəmlər panellə eynidir. | §8; criteria 1, 10; identity test |
| Acceptance: cəmi sətri rəqəmləri, Sentyabr = panel. | criterion 1; §10 identity test |
| Acceptance: Heydər Əliyev İyun / Avqust / Yanvar–Mart. | criterion 2; §10 unit tests with the brief's numbers |
| Acceptance: Oktyabr–Dekabr. | criterion 4 |
| Acceptance: Bayıl yolu ⚠1 + faiz. | criterion 5 |
| Acceptance: 1200px-də 12 aylıq cədvəl. | criterion 8 |
| Out of scope: mobil (12), rəng qaydası (9), sözlər (5). | §3 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. "Mövcud ay" is a month in which the location has a request with a known amount; months with no request, or whose
   every line is unpriced, are skipped rather than counted as zero — the report already refuses to read "unknown" as
   zero.
2. A month whose amount is incomplete (⚠) still counts as available and is still judged — the rule looks at the figure
   the cell shows; the ⚠ beside it says the figure is partial.
3. The look-back crosses the year boundary: a location's history does not restart in January. (On the audit data it
   makes no difference — the data starts in January 2026 — which is why Heydər Əliyev's January–March have no
   verdict.)
4. The average is rounded to the qəpik before the percentage is taken, and the ±50% test uses the percentage as
   printed, so the highlight never disagrees with the number beside it.
5. The rule lives in the backend, once; the browser only draws the verdict.
6. The cell's visible percentage stays the month-to-month one — the dashboard's "Keçən ay" figure that the brief
   compares Bayıl yolu with. The 3-month comparison appears as the highlight and in the cell's title.
7. The unusual highlight is a tint and ring by cost direction (9.1) with a bolder amount — seen without reading, and
   not carried by colour alone (the tinted cell stands out from the white ones; the direction is also in words in the
   title and the legend).
8. "Future" is after the browser's current calendar month; the current month itself is not future. A future month
   that already has a request is shown as an ordinary month. The word is "Gələcək ay".
9. The totals row shows the whole company even under a search, as `Months` already does, and says so in its label.
10. A company month total that is incomplete carries the same ⚠ mark as a cell, so a partial total is never shown as
    complete; 8.1 forbids only the percentage.
11. "Works from about 1024px" is met by showing the panorama from 1024px and letting it scroll inside its own box until
    it fits (≈1340px). All twelve months at once is not physically possible at 1024–1200 with the 256px sidebar, `₼`
    on every amount (Task 5) and no crowding; the brief requires no scrolling only at 1366 and 1440, and those hold.
12. Month columns are at least 64px, object 144px, year 88px; amounts 11px below 1440px and 12px from 1440px.
13. The page gutters are no longer reclaimed, so the table is exactly as wide as the cards above it.
14. Object names wrap rather than truncate, to keep Task 3's full names visible in a narrower column.
15. "Has never ordered" is judged up to the end of the report's year, like the dashboard's "Sistemdə hələ sifarişi
    yoxdur" is judged up to the selected month; the row shows the dashboard's own words in one merged cell.
16. The legend explains every mark in the grid, not only the status dot, because the tint and the future month are new
    marks a Rəhbər would otherwise have to guess at.
17. The narrow month list keeps its structure (Task 12) and only stops calling a future month "sifarişi yoxdur".

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 7's commit `4994803`), `git status --short`, `git diff --stat`.
1. Qayda (8.2) — where the function lives, the rule in one paragraph, the brief's numbers through it.
2. Backend — the new fields, the wider window, the query count, why no existing figure moved.
3. Cədvəl — before/after description: totals row, a Heydər Əliyev row, Bayıl yolu's September cell, October–December,
   Çadır, the legend.
4. En və sabit başlıq — columns, breakpoints, what a reader sees at 1024 / 1200 / 1366 / 1440, and why.
5. Rənglər (9.1) — what moved to `costDirectionToneClass` / the new tint; who still uses `signedToneClass`, and which
   task moves it.
6. Testlər — new tests; changed tests and fixtures, each with the reason; counts; builds.
7. Toxunulmayanlar — no database reached, no figure changed, dashboard / order page intact, Tasks 1–7 intact.
8. Sonrakı tapşırıqlar üçün qeydlər — for 9, 10, 11, 12.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
