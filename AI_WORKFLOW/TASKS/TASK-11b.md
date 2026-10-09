# TASK 11b — OBYEKT MÜQAYİSƏ SƏHİFƏSİNİN SİFARİŞ SƏHİFƏSİNƏ BİRLƏŞDİRİLMƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-11.md`. This is the owner's settled requirement, shared by 11a and 11b. It decides
*what* and *why*; this file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **11b of two.** 11a (accepted, `93b5a81`) changed the objects list and the object page. 11b carries decision
**11.1**: the separate object comparison page goes, and the comparison lives in the order page's analysis.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `93b5a81`
(Task 11a's accepted commit). Line numbers below are at `93b5a81`.

This task **reads** data. It adds read-only fields to two backend read models, changes three frontend screens and
removes one. No schema change, no migration, no database row. This file deliberately contains no `DATA_MIGRATION`
marker.

---

## 1. Context

The brief's goal, second sentence: "Müqayisə üçün ayrıca ikinci səhifə qalmasın." 11a delivered the first sentence.

The brief's lines 11b carries, verbatim:

- "Ayrıca obyekt müqayisə səhifəsi qalmır; müqayisə sifariş səhifəsinin təhlil hissəsində aparılır (11.1):
  - obyekt səhifəsindəki "Müqayisə et" son sifarişin, sətirlərdəki "Müqayisə" isə həmin sifarişin təhlil səhifəsini
    açır;
  - seçilmiş baza saxlanılır;
  - müqayisə səhifəsində olub sifariş səhifəsində olmayan məlumat itmir."
- Acceptance 5: "Ayrıca müqayisə səhifəsi yoxdur. Obyekt səhifəsindən "Müqayisə" basanda həmin sifarişin təhlil
  səhifəsi açılır və seçilmiş baza saxlanılır."

Why the owner wants it (the brief's audit):

- the comparison page repeats the order page's analysis by another rule: alphabetical list, differences in quantity
  rather than money, "Excel təsiri";
- the manager does not know which of the two pages to read;
- it computes its figures on a separate path, which agrees today but may drift.

Owner decisions and accepted rules this part applies but does not own:

- **11.1** (this task): the separate comparison page is merged into the order/analysis page.
- **9.1** (Task 9): cost increase red, decrease green, as direction. `costDirectionToneClass`
  (`components/analytics/format.ts:325`) and `DirectionWord`. PLAN.md: "`signedToneClass` is left only behind
  `components/analytics/labels.ts` (Task 11)" — 11b removes it.
- **Task 1**: the basis lives in the URL, spelled only by `analytics/basisParams.ts` (`orderLink`, `locationLink`,
  `parseBasis`, `basisParams`).
- **Task 2**: "Qiymət yoxdur" amber, only lines somebody owes a price for; "Daxili təminat" slate, never a warning.
- **Task 5**: words, units, 2-decimal money, no codes, no versions on the manager's screens.
- **Task 10**: one state rule (`OrderAnalyticsCalculator.StateOf`); "Hamısı" counts the listed (changed) products and
  says so (`driverScopeLine`); the compact row line "20 → 40 ədəd · Qiymət 4,00 → 4,00 ₼" stays exactly; sort by
  impact; "Hamısına bax".
- **Task 11a**: the object page reads and keeps the basis; `comparablePriorMonths` is the one prior-months helper.

## 2. Verified current behaviour (repository at `93b5a81`)

### 2.1 Where the comparison page is reached

- Route `locations/:locationId/analytics` → `LocationAnalyticsPage` (`App.tsx:7`, `:46`).
- The only links to it are on the object page, built by `comparisonLink` (`pages/LocationDetailPage.tsx:372–379`):
  - header "Müqayisə et" (`:142–150`), shown when `orderRequestCount > 0`, to `/locations/{id}/analytics?basis=…`;
  - each history row's "Müqayisə" (`:324–330`), to `/locations/{id}/analytics?period=yyyy-MM&basis=…`.
- The dashboard no longer links there (`components/dashboard/LocationRows.test.tsx:416`).
- `latest` (the latest order) exists only on the unfiltered first page (`LocationDetailPage.tsx:85–88`). The history
  header (`LocationOrderHistoryDto`, `Application/Orders/OrderReadDtos.cs:108–123`) has no latest order id.

### 2.2 What the comparison page shows — the inventory 11b must not lose

`pages/LocationAnalyticsPage.tsx`, `components/analytics/AnalyticsSummary.tsx`, `components/analytics/ComparisonRows.tsx`.
Its data is `GET /api/v1/analytics/locations/{id}/periods/{yyyy-MM}/comparison` (`OrderAnalyticsQueries.CompareAsync`),
which answers for a month's **latest version**.

| # | On the comparison page | Where it is on the order page today (`OrderDetailPage.tsx`, `DecisionHeadline`, `CauseSummary`, `DriverList`) |
|---|---|---|
| C1 | Breadcrumb, title, "Sifarişlərə bax" | "Obyektin sifarişləri" → object page, with the basis (11a) |
| C2 | Month selector over every month of the object | The object page's periods table; one order per row |
| C3 | `BasisPicker` | `DecisionHeadline`'s `BasisPicker` — same component, same URL basis |
| C4 | "Bu obyektin hələ sifarişi yoxdur" | n/a — an order page always has an order |
| C5 | Basis name with its range | "Müqayisə: {describeBasisWithRange}" |
| C6 | "N / M ay mövcuddur", and "Çatışmayan: {months}" when partial | Only "(N/M ay)" when partial (`DecisionHeadline.tsx:134–147`). **Missing months are not named.** |
| C7 | "Müqayisəyə daxil olan dövrlər": each baseline month with "Sifarişə bax", each missing month "— sifariş yoxdur" | **Absent.** The data is there: `primary.periods` (month, order id) and `primary.missingPeriods` |
| C8 | Current order's status and "Sifarişə bax" | The order page is that order, with its status badge |
| C9 | No-baseline notice naming the months | `emptyWindowNote` under "Müqayisə: {basis} ({range})" |
| C10 | Amount (or "known amount" wording), owed-price count | Headline amount and counts |
| C11 | "Fərq ({basis})": delta and percent | Headline "Baza / Fərq", 9.1 colours |
| C12 | "Müqayisə dövründə də N sətirdə qiymət yoxdur — hər iki məbləğ tam deyil" (when both sides owe prices) | **Absent.** `DecisionComparisonDto` has only `AmountIsComplete`; no baseline owed-price count |
| C13 | Counts: compared products, Yeni, Artıb, Azalıb, Bu ay yazılmayan, Xidmətlər | Scope line gives compared / in-order / listed; chips give Yeni and Bu ay yazılmayan. **Artıb, Azalıb, Xidmətlər counts are absent** — `DecisionProductCountsDto` does not carry them |
| C14 | **Every** compared product, including the ones whose money did not move | Drivers only. `Explain` skips a priced product with no money, no effect and no appear/disappear (`OrderDecisionContextQueries.cs:226–238`). That includes an internally supplied material whose quantity changed (its effects are null, its money 0, but `StateOf` says Increased/Decreased). The scope line counts them ("{K−L} məhsul dəyişməyib"), but they cannot be seen |
| C15 | Per product: name + description, current and baseline quantity, quantity delta and percent, current amount, state badge, weighted price with its percent, price coverage | Per driver: name + description, "a → b {unit}", "Qiymət a → b (x%)", service "Cəmi a → b", owed-price / internal-supply / supply-changed notes, money impact (9.1). The row opens "Məhsul tarixçəsi", which has every month's quantity, price and amount and the ratio to the basis average (Task 10) |
| C16 | Materials / Services tabs | Service rows are in the same list, marked by the "Xidmətlər" pill and "Cəmi a → b" |
| C17 | Search, state filter, pagination, "{n} məhsul göstərilir" | Chips (filter, each with its count), the first 6 rows, "Hamısına bax (N)" |
| C18 | "Məhsul tarixçəsi" per row, with the quantity ratio | The whole driver row opens it, with the ratio (Task 10) |

### 2.3 Other relevant facts

- The order page's analysis is its section A, the first thing under the header (`OrderDetailPage.tsx:207–281`). It
  answers for the **opened version**. When a newer version of the month exists it says so and links it
  (`:255–262`) — without the basis (`to={`/orders/${decision.latestOrderRequestId}`}`).
- `DriverList` renders only when `decomposition.drivers.length > 0` (`OrderDetailPage.tsx:272`).
- `PeriodComparisonResult.BaselineTotals` (`Decisions/PeriodComparison.cs:13–20`) is
  `OrderAnalyticsCalculator.Totals` over every baseline snapshot of the available months. The comparison page's
  `BaselineMissingPriceItemCount` is the same call over the same snapshots (`OrderAnalyticsQueries.cs:522`, `:554`).
- `signedToneClass` (`components/analytics/format.ts:313`) has no importer except the re-export in
  `components/analytics/labels.ts:34` and its own test (`format.test.ts:22`, `:230–233`).
- The decision context runs five queries (`OrderDecisionContextTests.The_whole_answer_is_a_handful_of_queries_…`).
- `ProductCountConsistencyTests` (integration) already holds the two pages to one count on every basis.

## 3. Scope

In scope — every line of §1:

- A. "Müqayisə et" opens the **latest order's** analysis, and each row's "Müqayisə" opens **that order's** analysis,
  both carrying the basis (§4.1).
- B. The comparison page, its route and its components go. An old link lands on the object page with its basis
  (§4.2).
- C. Nothing on the comparison page is lost: every row of §2.2 marked absent gets a home on the order page (§4.3,
  §4.4), with the few backend fields it needs (§5).
- D. 9.1: `signedToneClass` leaves the codebase (§4.5).

Where 11a left the seam (TASK-11a §3, REVIEWS/TASK-11a.md "Transition"): `comparisonLink`, `latest` only on page 1,
`comparablePriorMonths`, the comparison page's two `locationLink` back-links, `signedToneClass`. All five are handled
here.

Out of scope:

- LOC codes, "Versiya", "Çəkili orta qiymət": Task 5, accepted. Do not bring any back from the comparison page.
- Product counts' single definition: Task 10, accepted. 11b adds counts by the same rule; it does not change one.
- Phone layouts: Task 12.
- The backend comparison endpoints (`/api/v1/analytics/locations/{id}/periods…`) and `OrderAnalyticsQueries` stay as
  they are. They are what `ProductCountConsistencyTests` checks the order page against. Only the frontend stops
  calling them (see Assumptions).
- Any change to a figure: amounts, deltas, effects, categories, shares, existing counts.

## 4. Required behaviour — frontend

All paths under `frontend/bax-orders-web/src/`.

### 4.1 The object page's two links — `pages/LocationDetailPage.tsx`

- **"Müqayisə et"** (header) → `orderLink(data.latestOrderRequestId, selection)`.
  - `latestOrderRequestId` comes from the history header (§5.4), so the link is the same on every page and under every
    year/month filter. It never depends on `latest`.
  - Rendered only when `latestOrderRequestId !== null`. An object with no order shows no "Müqayisə et" (C4).
  - Keep its words, icon and style.
- **Each row's "Müqayisə"** → `orderLink(request.orderRequestId, selection)`. Keep the words and the `aria-label`.
  A superseded row opens that older order; the order page already says a newer one exists (§4.4 carries the basis on
  that notice's link).
- Delete `comparisonLink` and any import it leaves unused.
- Unchanged: "Sifarişə bax" on the card and every row, the period links, the periods table, the card, the strip, the
  counts (11a).

### 4.2 The comparison page goes — `App.tsx`, `pages/`, `components/analytics/`

- Delete `pages/LocationAnalyticsPage.tsx`, `components/analytics/AnalyticsSummary.tsx`,
  `components/analytics/ComparisonRows.tsx` and their tests (`AnalyticsSummary.test.tsx`, `ComparisonRows.test.tsx`).
- Keep the route path `locations/:locationId/analytics`, but as a redirect, not a page: a small component in
  `App.tsx` that renders `<Navigate replace to={locationLink(id, parseBasis(params))} />`. A saved bookmark then lands
  on the object page with its basis instead of "Səhifə tapılmadı". `period`, `kind`, `state`, `search`, `page` are
  dropped.
- `api/analytics.ts`: remove `fetchComparison`, `fetchAnalyticsPeriods` and every type only they use
  (`ComparisonRequest`, `LocationComparison`, `ComparisonSummary`, `VariantComparison`, `ComparisonSide`,
  `BaselineSide`, `ComparisonDelta`, `PriceCoverage`, `PeriodRequest`, `AnalyticsPeriods`, `AnalyticsPeriod`, … —
  exactly those with no importer left; `tsc -b` decides). Keep everything still imported (`AnalyticsComparisonBasis`,
  `AnalyticsKind`, `ComparisonState`, `VariantIdentity`, the trend types, `fetchVariantTrend`, …).
- `components/analytics/labels.ts` and `terminology/terms.ts`: remove an export **only** when no importer remains
  after the deletions (candidates: `stateBadgeClass`, `stateSign`, `kindLabels`, `coverageLabels`,
  `coverageBadgeClass`, `materialStates`, `isState`, `formatCoverage`, `formatBaselineBasisNote`,
  `comparedProductsLead`, `shownProductsLabel`). Remove a removed export's test with it. List every removal in the
  report. `stateLabels` / `stateBadgeLabels` stay: §4.3 uses them.

### 4.3 "Əsas dəyişikliklər" holds every compared product — `components/decisions/DriverList.tsx`, `labels.ts`

(C13, C14, C16, C17.)

- **The products whose money did not move** (backend `decomposition.steady`, §5.2):
  - A new chip, last in the row: **"Məbləği dəyişməyən {U}"**, U = `steady.length`. Shown only when U > 0.
  - Choosing it lists the steady products, in the backend's order, in the same row form as every other row: name,
    description, the compact line (`Change`, unchanged), the notes, the row opening "Məhsul tarixçəsi".
  - A steady row's pill is its state, not a cause: `stateBadgeLabels[driver.state]` ("Dəyişməyib", "Artıb", …) in the
    neutral `mixedCauseToneClass` (slate). Its money follows the existing rule: `unknownValue` when neither side has a
    known amount (`moneyIsUnknown`), otherwise `formatMoneyDelta(0)` in slate.
  - First 6 rows, then "Hamısına bax (U)" — the same rule as every chip.
  - "Hamısı" and every existing chip are **unchanged**: they count and list `drivers` only (Task 10). A steady product
    is under no other chip.
  - Model it as a `DriverFilter` value (for example `'Steady'`) whose rows are `steady` rather than
    `drivers.filter(matches)`. Its count is still the number of rows it leaves.
- **The scope line** (`driverScopeLine`) keeps its first sentence. Its tail, when K > L, becomes
  " {K−L} məhsulun məbləği dəyişməyib." — the same words as the chip, because the old "{K−L} məhsul dəyişməyib" is not
  true of an internally supplied material whose quantity moved, and that product is now visible under the chip with
  "Artıb". K − L = U; assert it.
- **The state counts** (C13). One more quiet `text-xs text-slate-500` line under the scope line, from a builder in
  `components/decisions/labels.ts` (for example `productStateLine(products)`):
  - "Artıb: {i} · Azalıb: {d}", then " · Xidmətlər: {s}" only when s > 0;
  - the words are `stateLabels.Increased`, `stateLabels.Decreased` and `causeLabels.Services`;
  - i, d, s are `products.increasedCount`, `decreasedCount`, `serviceCount` (§5.3), never counted in the browser.
- **Props.** `DriverList` receives `steady` (or the whole decomposition). `OrderDetailPage` renders it when
  `drivers.length + steady.length > 0` — an order in which nothing moved still lists its products.
- Unchanged (Task 10): the compact line's form and order, the mixed split, the sort, the first 6 rows, "Hamısına bax" /
  "Daha az göstər", the notes, 9.1 on the money, the chips' words and predicates.

### 4.4 The headline says what the window is made of — `components/decisions/DecisionHeadline.tsx`

(C6, C7, C12.)

- **Missing months named.** The partial-coverage line becomes "({N}/{M} ay · Çatışmayan: {months})", months by
  `formatMonth`, comma-separated, from `primary.missingPeriods`. Its `InfoHint` stays.
- **"Müqayisəyə daxil olan aylar".** Under the comparison figures, a disclosure button (closed by default,
  `aria-expanded`, the chevron pattern of the old `BaselineCoverage`) listing every month of `primary.windowPeriods`,
  oldest first:
  - a month in `primary.periods`: "{Ay İl} · Sifarişə bax", the link `orderLink(period.orderRequestId, selection)`;
  - a month in `primary.missingPeriods`: "{Ay İl} — sifariş yoxdur", in `text-amber-900` (as the comparison page did;
    a missing month is a gap in the window, not a price warning — keep it text, no warning icon).
  Shown whenever `primary.windowPeriods.length > 0`, including when `!primary.available` (then every month reads
  "sifariş yoxdur"). The headline needs `selection` for the links; it already receives it.
- **Both sides owe prices** (C12). When `current.missingPriceItemCount > 0 && primary.baselineMissingPriceItemCount > 0`,
  a `WarningNote` under the figures: "Müqayisə dövründə də {missingPriceCount(n)} — hər iki məbləğ tam deyil." — the
  comparison page's sentence and condition, n from the backend (§5.1).
- **The newer-version notice** in `OrderDetailPage.tsx:255–262` links `orderLink(decision.latestOrderRequestId,
  selection)` so the basis is kept there too.
- Unchanged: the amount, the counts line, the picker, "Müqayisə: …" with its hint, "Baza / Fərq" in 9.1 colours,
  `emptyWindowNote`, the secondary bases.

### 4.5 9.1 — `components/analytics/format.ts`, `labels.ts`

- Remove `signedToneClass` from `format.ts`, its re-export from `labels.ts`, and its test (`format.test.ts:22`,
  `:230–233`). No screen uses it after §4.2. `costDirectionToneClass` and its tests are untouched.

### 4.6 Types and words

- `api/decisions.ts`: `DecisionComparison.baselineMissingPriceItemCount: number`;
  `DecisionProductCounts.increasedCount`, `decreasedCount`, `serviceCount: number`;
  `DecisionDecomposition.steady: DecisionDriver[]`.
- `api/orders.ts`: `LocationOrderHistory.latestOrderRequestId: number | null`.
- Every fixture building these types gains the fields; `tsc -b` finds them.
- New words ("Məbləği dəyişməyən", "Müqayisəyə daxil olan aylar", "Çatışmayan", "sifariş yoxdur", the both-sides
  sentence) live in `components/decisions/labels.ts` or `terminology/terms.ts`, not inline in JSX.

## 5. Required behaviour — backend (read models only)

All additions are **appended at the end** of their positional records, so no existing argument moves. No new query in
the decision context; the history header stays one query. Nothing writes.

### 5.1 `DecisionComparisonDto.BaselineMissingPriceItemCount` — C12

- `int BaselineMissingPriceItemCount`, set in `OrderDecisionContextQueries.Compare` from
  `result.BaselineTotals.MissingRequiredPriceItemCount`.
- It is the comparison page's `ComparisonSummaryDto.BaselineMissingPriceItemCount` for the same object, month (latest
  version) and basis. Every basis, primary and secondary, carries it.

### 5.2 `DecisionDecompositionDto.Steady` — C14

- `IReadOnlyList<DecisionDriverDto> Steady`: exactly the variants `Explain` skips today (`:231–238`), each built as a
  driver is built, with its `State`.
- Order: product name (`StringComparer.OrdinalIgnoreCase`), then `ProductVariantId` — their money is zero, so impact
  cannot order them.
- `Drivers`, `ListedCount`, every category, every total and every existing count are unchanged. The skip still
  decides what is a driver; it now also decides what is steady.
- Invariants (tested, §10): `Drivers` and `Steady` are disjoint; together they are exactly the comparison page's rows
  (same variant ids) with the same `State` each; `Steady.Count == ComparedCount − ListedCount`.

### 5.3 `DecisionProductCountsDto`: `IncreasedCount`, `DecreasedCount`, `ServiceCount` — C13

- Counted in `Explain` over **all** compared variants, as `NewCount` / `NoLongerOrderedCount` already are:
  `State == Increased`, `State == Decreased`, `Kind == AmountOrientedService`.
- They equal the comparison summary's `IncreasedVariantCount`, `DecreasedVariantCount`,
  `AmountOrientedServiceCount` on every basis.

### 5.4 `LocationOrderHistoryDto.LatestOrderRequestId` — §4.1

- `long? LatestOrderRequestId`: the object's latest period at its highest version — the same order the unfiltered
  first page puts first (`RequestPeriod DESC, Version DESC`). Null when the object has no order.
- A correlated subquery in the existing header query (`LocationOrderQueries.GetHistoryAsync:234–257`). It ignores the
  year, month and page filters.

## 6. Files — summary for the Coder

Changed (expected):

- Backend: `Application/Decisions/DecisionContextDtos.cs`, `Application/Decisions/OrderDecisionContextQueries.cs`,
  `Application/Orders/OrderReadDtos.cs`, `Application/Orders/LocationOrderQueries.cs`.
- Backend tests: `ProductCountConsistencyTests.cs` (extend), `OrderDecisionContextTests.cs` (steady list),
  `OrderBrowsingTests.cs` (`LatestOrderRequestId`).
- Frontend: `App.tsx`, `pages/LocationDetailPage.tsx`, `pages/OrderDetailPage.tsx`,
  `components/decisions/DriverList.tsx`, `components/decisions/DecisionHeadline.tsx`, `components/decisions/labels.ts`,
  `components/analytics/format.ts`, `components/analytics/labels.ts`, `api/decisions.ts`, `api/orders.ts`,
  `api/analytics.ts`, `terminology/terms.ts` (if words land there).
- Frontend tests: `LocationDetailPage.test.tsx`, `DriverList.test.tsx`, a `DecisionHeadline` test (new file or the
  page test), `OrderDecisionPage.test.tsx`, `format.test.ts`, `labels.test.ts` (both folders, as needed),
  `oldTerms.test.tsx`, an `App` redirect test, fixtures.

Deleted: `pages/LocationAnalyticsPage.tsx`, `components/analytics/AnalyticsSummary.tsx` (+ test),
`components/analytics/ComparisonRows.tsx` (+ test).

Not changed: `Application/Analytics/*` (the comparison endpoint and its calculator), `Application/Decisions/CauseDecomposition.cs`,
`PeriodComparison.cs`, the dashboard, the monthly report, `TrendModal`, `CauseSummary`, `LocationTrend`,
`LocationsPage`, `tools/`, schema and migrations.

Keep the codebase's idiom: comments say *why*; words come from `src/terminology`, `pricing/labels.ts` or the feature's
`labels.ts`. Rewrite the doc comments whose design changes (`Explain`'s summary and the skip comment, `DriverList`'s
header, `driverScopeLine`'s comment, `DecisionHeadline`'s header).

## 7. Safety and STOP conditions

- **No access to the real database.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`. Integration tests use their own disposable database, as before.
- No data change. HD-002's 94 rows stay untouched.
- No figure changes. Every existing field of the decision context and the history keeps its value; the new fields are
  read from what is already computed. If a figure seems to need a new calculation, **STOP** and report.
- The decision context stays at five queries. If §5 seems to need a sixth, STOP and report.
- Do not rework Tasks 1–11a. A defect found there goes into the report.
- Do not remove or change the backend comparison endpoints.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 8. Invariants — MUST NOT CHANGE

- Task 1: the basis is in the URL, spelled by `basisParams.ts`; the order page compares against the URL's basis; every
  link this task adds or repoints carries it.
- Task 2: "Qiymət yoxdur" amber and only for owed prices; "Daxili təminat" slate, never a warning.
- Task 5: no LOC code, no version number, no "Çəkili orta qiymət" on the manager's screens; the old-terms sweep stays
  green.
- Task 6: "Niyə dəyişib?" — order, emphasis, figures.
- Task 9: the dashboard, including its links.
- Task 10: `StateOf` is the one state rule; "Hamısı" counts the listed products; the compact line's form; the sort;
  6 rows and "Hamısına bax"; the history window; `ProductCountConsistencyTests` stays green with its existing
  assertions.
- Task 11a: the object page reads and keeps the basis; the card, the strip, the counts and their periods; every
  "Sifarişə bax"; `comparablePriorMonths`.
- Brief "Mütləq qorunmalı": the object page's periods table with "Sifarişə bax" on every row; "Obyektin sifarişləri"
  on the order page leads to the object page.
- No schema, migration or data change. The backend comparison endpoints answer as before.

## 9. Acceptance criteria

1. **No separate comparison page.** `LocationAnalyticsPage`, `AnalyticsSummary`, `ComparisonRows` do not exist.
   `/locations/43/analytics?period=2026-07&basis=avg3` redirects (replace) to `/locations/43?basis=avg3`.
   *(brief acceptance 5, first sentence; 11.1)*
2. **"Müqayisə" opens the order's analysis with the basis.** At `/locations/43?basis=avg3`:
   - "Müqayisə et" is `/orders/{latestOrderRequestId}?basis=avg3`, also under a year filter and on page 2;
   - each row's "Müqayisə" is `/orders/{that row's orderRequestId}?basis=avg3`;
   - an object with no order has no "Müqayisə et";
   - no link on the page points at `/analytics`.
   *(brief acceptance 5; 11.1 sub-lines 1 and 2)*
3. **Nothing lost** (11.1 sub-line 3). On the order page, for a fixture shaped like the comparison page's cases:
   - the steady products are listed under "Məbləği dəyişməyən {U}", U = compared − listed, including an internally
     supplied product whose quantity rose, shown "Artıb";
   - "Artıb: i · Azalıb: d · Xidmətlər: s" from the backend counts;
   - partial coverage names the missing months; "Müqayisəyə daxil olan aylar" lists every window month, with
     `orderLink(…, selection)` for each available one and "sifariş yoxdur" for each missing one;
   - with owed prices on both sides: "Müqayisə dövründə də N sətirdə qiymət yoxdur — hər iki məbləğ tam deyil.";
   - every other row of §2.2 is where the table says it is (the report walks the table, C1–C18).
4. **Backend parity**, on every basis of `ProductCountConsistencyTests.EveryBasis`:
   - `Drivers ∪ Steady` = the comparison rows (ids), disjoint, same `State`;
   - `Steady.Count == ComparedCount − ListedCount`;
   - `IncreasedCount`, `DecreasedCount`, `ServiceCount` = the summary's `IncreasedVariantCount`,
     `DecreasedVariantCount`, `AmountOrientedServiceCount`;
   - `Primary.BaselineMissingPriceItemCount` = the summary's `BaselineMissingPriceItemCount`, on a fixture where it
     is > 0;
   - `Drivers`, `ListedCount`, categories and totals unchanged; still five queries.
5. **History header.** `LatestOrderRequestId` is the highest version of the latest period, unaffected by year, month
   or page; null for an object with no order.
6. **9.1.** `signedToneClass` appears nowhere under `src/`.
7. **Nothing else changed.** Tasks 1–11a intact, the backend comparison endpoints unchanged, all suites and both
   builds green, the old-terms sweep passes.

## 10. Required tests

Backend (xunit):

- `ProductCountConsistencyTests` (extend; keep every existing assertion):
  - a theory over `EveryBasis`: `Drivers ∪ Steady` equals the comparison rows by id, disjoint, same `State`;
    `Steady.Count == ComparedCount − ListedCount`;
  - a theory over `EveryBasis`: the three new counts equal the summary's;
  - `SteadyVariantId` is in `Steady`;
  - an internally supplied product present in every month whose September quantity rises (for example 10 → 12, from
    the "Anbar" supplier): it is in `Steady`, not in `Drivers`, with `State == Increased`. Add it to the world, and
    update the world's `SeptemberVariantCount` accordingly (a deliberate fixture change — name it), or build it in its
    own world;
  - `BaselineMissingPriceItemCount` parity, primary and secondary, on a world with an unpriced line in a baseline
    month.
- `OrderDecisionContextTests`: the steady variant is in `Steady` and still not in `Drivers`; the query-count test is
  unchanged and green.
- History (`OrderBrowsingTests`, which already calls `GetHistoryAsync`): `LatestOrderRequestId` with two versions of
  the latest month, under a year filter that excludes it, on page 2, and null with no orders.

Frontend (vitest):

- `LocationDetailPage.test.tsx`:
  - "Müqayisə et" → `/orders/{latestOrderRequestId}?basis=avg3`, unfiltered, under a year filter and on page 2;
  - every row's "Müqayisə" → `/orders/{id}?basis=avg3`;
  - no "Müqayisə et" when `latestOrderRequestId` is null;
  - no `href` contains `/analytics`.
  The 11a assertions on "Müqayisə" / "Müqayisə et" pointing at `/locations/43/analytics…` change **deliberately**
  (brief: "«Müqayisə» … həmin sifarişin təhlil səhifəsini açır").
- App redirect: rendering `/locations/43/analytics?period=2026-07&basis=avg3` lands on `/locations/43?basis=avg3`;
  without a basis, `/locations/43?basis=last` (or `/locations/43` — whatever `locationLink(id, parseBasis(…))` gives).
- `DriverList.test.tsx`:
  - the "Məbləği dəyişməyən {U}" chip, its rows, the state pill in slate, "—" and "0,00 ₼" money cases;
  - no chip when `steady` is empty; "Hamısı" and every existing chip count unchanged with steady products present;
  - the state line, with and without services;
  - the scope line's new tail; K − L = U.
- Headline (`DecisionHeadline` test or `OrderDecisionPage.test.tsx`):
  - "Çatışmayan: …" on partial coverage;
  - the disclosure closed by default, then every window month, with `orderLink` (basis kept) and "sifariş yoxdur";
  - the disclosure when `!available`;
  - the both-sides warning shown only when both counts are > 0;
  - the newer-version link carries the basis.
- `OrderDecisionPage.test.tsx`: the list renders when drivers are empty and steady is not.
- `format.test.ts`: the `signedToneClass` test is removed with the function (deliberate — 9.1 is
  `costDirectionToneClass`, whose tests stay).
- `oldTerms.test.tsx`: the comparison-page case is removed with the page; the order page with the new lines (chip,
  state line, disclosure, both-sides sentence) passes `findOldTerms`; no "yaxşı / pis"; no "Çəkili", no LOC code, no
  version.

Existing tests that change **deliberately**: name each in the report with the brief line behind it. Expected:

- `AnalyticsSummary.test.tsx`, `ComparisonRows.test.tsx`: deleted with their components. Their Task 10 count caption
  assertions are carried by `ProductCountConsistencyTests` (the counts) and by §4.3's tests (the words on the page
  that remains).
- `LocationDetailPage.test.tsx`: the `/analytics` hrefs.
- `driverScopeLine`'s tail ("dəyişməyib" → "məbləği dəyişməyib").
- `format.test.ts`: `signedToneClass`.
- `oldTerms.test.tsx`: the comparison-page case.
- Removed `labels.ts` / `terms.ts` exports and their tests (list them).
- Fixtures gaining the new fields (list the files).

No expectation may be weakened to make a test pass.

## 11. Expected verification

- `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` (`tsc -b` is the
  type check) are green. Give the counts; Task 11a had 41 files / 734 tests (this task deletes two test files).
- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `bin`, use `--artifacts-path` into the
  scratchpad. Say so, and do not stop the API.
- `dotnet test BaxOrders.slnx`: all green. Paste the summary lines. Task 11a: 826 unit / 683 integration; the
  integration count rises by the new tests.
- `git diff --stat` and `git status`: changes only under `src/BaxOrders.Application/`, `tests/` and
  `frontend/bax-orders-web/src/`; the three deletions listed.
- A search for `signedToneClass` under `frontend/bax-orders-web/src` finds nothing. A search for `/analytics` in the
  non-test files under `src/pages` and `src/components` finds nothing (the redirect lives in `App.tsx`; a test may
  assert its absence).
- The real figures need the real database, which this task does not touch. Say in the report that the operator should
  confirm on the running app, after restarting the API: Heydər Əliyev, Sentyabr — "Məbləği dəyişməyən" plus "Hamısı"
  cover the comparison's 119 products; the object page's "Müqayisə" opens the order with the chosen basis.
- **Go-live:** restart the API on this commit before serving the new frontend (it reads `steady`, the three counts,
  `baselineMissingPriceItemCount`, `latestOrderRequestId`).

## 12. Where the brief lands (this part)

| Brief | Here |
|---|---|
| Ayrıca obyekt müqayisə səhifəsi qalmır (11.1) | §4.2; criterion 1 |
| "Müqayisə et" son sifarişin, "Müqayisə" həmin sifarişin təhlil səhifəsini açır | §4.1, §5.4; criterion 2 |
| Seçilmiş baza saxlanılır | §4.1, §4.2 (redirect), §4.4 (disclosure and newer-version links); criteria 1, 2 |
| Müqayisə səhifəsində olub sifariş səhifəsində olmayan məlumat itmir | §2.2 inventory; §4.3, §4.4, §5.1–5.3; criteria 3, 4 |
| Audit: fərqli qaydada təkrarlayır, əlifba sırası, miqdarla fərq, Excel təsiri; hansına baxmalı bilinmir; ayrı hesablama | One page remains, ordered by money (Task 10's list); criteria 1, 3 |
| 9.1 | §4.5; criterion 6 |
| Acceptance 5 | criteria 1, 2 |
| Mütləq qorunmalı (dövrlər cədvəli, "Sifarişə bax"; "Obyektin sifarişləri") | §4.1, §8 |

With 11a's criteria 1–4 (brief acceptance 1–4), Task 11's brief is carried in full.

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. "Nothing is lost" is read as *information*: every figure, count, month and product the comparison page showed has a
   place on the order page (§2.2 table). The comparison page's *controls* — the month selector, the Materials/Services
   tabs, the product-name search, the state dropdown and the pagination — are not rebuilt; the object page's periods
   table, the list's chips and "Hamısına bax" do their job. A search box can be added later if the owner misses it.
2. The products whose money did not move go under their own chip, "Məbləği dəyişməyən", instead of into "Hamısı".
   Task 10 fixed "Hamısı" as the changed products and says so on screen; folding the steady ones in would undo that.
3. The scope line's tail changes from "{n} məhsul dəyişməyib" to "{n} məhsulun məbləği dəyişməyib", to match the chip
   and because an internally supplied material whose quantity moved is among them.
4. The comparison page's per-product quantity percentage and current amount are not added to the compact row line,
   which Task 10's brief protects as it is. The row shows both quantities; the history window it opens shows every
   month's amount and the ratio to the basis average.
5. The steady list is ordered by product name, because its money is zero and cannot order it.
6. A steady row's pill names its state ("Dəyişməyib", "Artıb"…), in slate, because its money went to no cause.
7. The state counts line shows Artıb, Azalıb and (when present) Xidmətlər — the counts the comparison page showed that
   the order page lacked. Yeni and Bu ay yazılmayan are already on the chips.
8. "Müqayisəyə daxil olan aylar" is a closed disclosure in the headline, like the comparison page's, and its links
   carry the basis.
9. The history header carries the latest order's id, so "Müqayisə et" works on every page and under every filter,
   rather than disappearing whenever the reader filters or pages.
10. An object with no order shows no "Müqayisə et": there is no order to open.
11. A row's "Müqayisə" opens that exact order (version). Before, it opened the month's latest version. The order page
    already tells the reader when a newer version exists, and its link now keeps the basis.
12. The old URL `/locations/{id}/analytics` redirects to the object page with its basis rather than to "Səhifə
    tapılmadı", so a saved bookmark still lands somewhere sensible.
13. The backend comparison endpoints stay. Nothing on screen reads them any more, but they are the reference the
    parity tests hold the order page to, and removing an API is not needed to remove the page.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 11a's commit `93b5a81`), `git status --short`, `git diff --stat`, the deleted files.
1. Linklər — "Müqayisə et" and each row's "Müqayisə" before and after; where `latestOrderRequestId` comes from; the
   object with no order; the redirect of the old URL.
2. Silinənlər — the page, the two components, their tests, the API functions and types, every removed export.
3. Heç nə itmir — the §2.2 table walked row by row (C1–C18): where each fact is now, and which new field or element
   carries it.
4. Backend — the four new fields, how each is computed from what was already computed, the unchanged figures, the
   query count.
5. 9.1 — `signedToneClass` gone.
6. Testlər — new tests; changed and deleted tests and fixtures, each with the brief line behind it; counts; builds.
7. Toxunulmayanlar — no database access, no figure changed, the comparison endpoints unchanged, Tasks 1–11a intact.
8. Go-live — the API restart, and what the operator should confirm on the running app.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
