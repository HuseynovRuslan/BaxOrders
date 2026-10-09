# TASK 10 — "ƏSAS DƏYİŞİKLİKLƏR", MƏHSUL TARİXÇƏSİ VƏ MƏHSUL SAYLARININ UYĞUNLUĞU (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-10.md`. This is the owner's settled requirement. It decides *what* and *why*; this
file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and reports.
Part: **one part, not split.** The backend work is small and in memory: a state and a count block on the decision
context, one filter tweak, one shared state rule, and supplier names on the trend points. The frontend work is two
components (`DriverList`, `TrendModal` + `TrendChart`), the shared `Modal`, two captions and their tests. That is
about Task 9's size, so it fits one Coder session.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `773063f`
(Task 9's accepted commit). Line numbers below are at `773063f`.

This task **reads** data and changes how two screens present it. It changes no stored figure, no schema and no
database row. This file deliberately contains no `DATA_MIGRATION` marker.

---

## 1. Context

The brief's goal: "Rəhbər konkret malın dəyişməsinə baxanda miqdarın, qiymətin və pulun nə qədər dəyişdiyini düzgün
görsün. Malın tarixçəsində isə bu ayın adi olub-olmadığını anlasın."

Owner decisions this task applies but does not own:

- **9.1** (Task 9): cost increase red, decrease green, as direction. It is written once as `costDirectionToneClass`
  (`components/analytics/format.ts:324`) and `DirectionWord` (`components/analytics/DirectionWord.tsx`), with the words
  `costIncreasedLabel` / `costDecreasedLabel` (`terminology/terms.ts`). This task moves `DriverList.tsx` and
  `TrendModal.tsx` onto them.
- **5.1** (Task 5): the window is called "Məhsul tarixçəsi" (`productHistoryLabel`), and the frequency line reads "Son 9
  ayın 3-də sifariş edilib" (`frequencySentence`, `components/analytics/trend.ts:57`). Both already exist. Keep them.
- **Task 1**: the comparison basis is the same everywhere. **Task 2**: an internal-supply month reads "Daxili
  təminat", and an unpriced line reads "—".
- **11.1** (Task 11) will merge the location comparison page into the order page. This task only makes the two pages
  count products by one definition, and label each count.

## 2. Verified current behaviour (repository at `773063f`)

### 2.1 "Əsas dəyişikliklər" — `components/decisions/DriverList.tsx`

- Each row shows the product name, **one** category pill (`causeLabels[driver.category]`, `:101–105`), the variant
  line, the compact facts line "50 → 55 paket · Qiymət 32,00 → 32,13 ₼" (`Change`, `:150–194`), and the money
  (`:116–120`).
- A product whose quantity *and* price both moved is filed under the larger effect (`CauseDecomposition.Explain`,
  `src/BaxOrders.Application/Decisions/CauseDecomposition.cs:432–442`). The row then shows only that pill ("Miqdar
  təsiri"). The two effects exist on the driver (`quantityImpact`, `priceImpact`), but the row does not show them.
  They are only shown in the history window's `ComparisonDetail` (`TrendModal.tsx:344–363`).
- The money is coloured with `signedToneClass` (`:116`), the pre-9.1 rule (green up). It has no screen-reader
  direction word.
- Filter chips (`:56–80`, `labels.ts:81–99`):
  - "Hamısı" counts `drivers.length`;
  - "Yeni məhsullar" / "Bu ay yazılmayan məhsullar" count and filter by **`driver.category`**
    (`matches`, `:196–212`);
  - "Qiymət dəyişən" / "Miqdar dəyişən" filter by the effect;
  - "Qiymət yoxdur" filters by `!priceIsComplete`.
  The list sorts by `|amountImpact|` (backend, `CauseDecomposition.cs:209`). It shows 6 rows first, then "Hamısına bax
  (N)".

### 2.2 Why the product counts disagree between the two pages

The order page's numbers come from `OrderDecisionContextQueries.Explain` (`Decisions/OrderDecisionContextQueries.cs:200–253`).
The comparison page's numbers come from `OrderAnalyticsQueries.CompareAsync` / `Summarize`
(`Analytics/OrderAnalyticsQueries.cs:102–158`, `:488–548`). Both start from the same union of variants (this month ∪
the basis window). They then count differently:

1. **"Yeni".** The comparison page counts `ComparisonState.New` (`OrderAnalyticsCalculator.StateOf`, `:161–183`: a
   material with current quantity > 0 and baseline quantity 0). The order page's chip counts `category == NewOrders`.
   `Explain` gives a new product another category when:
   - a line of it is missing a price → `UnattributedDueToMissingPrice`;
   - it came from internal supply → `InternalSupply`.
   A service has its own category, and the comparison page counts a service as `NotComparable`. So Heydər Əliyev
   reads "Yeni 58" on the order page and "Yeni 60" on the comparison page.
2. **"Hamısı".** `Explain` drops every variant that moved no money (`:206–214`). It also drops a new internally
   supplied product with no price, whose money is 0. The comparison page keeps all of them, so it reads 119 against
   the order page's 113.
3. **What the counts count is never said.** "Hamısı 100" on Fəvvarələr is this month's products plus those only in
   the basis window, while the order has 76 lines. The page does not explain this. The cause rows under "Niyə
   dəyişib?" say "58 məhsul" (`CauseSummary.tsx:127`), which reads as "58 new products", but it counts the products
   whose money is in that bucket.

The comparison page shows its counts in `AnalyticsSummary.StateOverview` (`components/analytics/AnalyticsSummary.tsx:83–104`)
and "{n} məhsul" beside the search (`pages/LocationAnalyticsPage.tsx:287–289`). The second is the **filtered** row
count of the active tab. The default tab is materials only (`:51`).

### 2.3 "Məhsul tarixçəsi" — `TrendModal.tsx`, `TrendChart.tsx`, `imports/review/Modal.tsx`

- `TrendChart` draws `<Line type="monotone">` (`TrendChart.tsx:43–54`). The curve between monthly points implies
  values that never existed.
- `XAxis` uses Recharts' default tick interval (`:33`). This skips labels, so "Avqust" is missing on Şampun qab, and the
  labels are the long form "Avqust 2026" (`formatAnalyticsPeriod`).
- `YAxis` has no `allowDecimals` and no domain (`:34–39`). A 0/1 quantity gets ticks 0, 0.25 … 1. The default
  `[0, 'auto']` domain can end exactly at the maximum, so a flat price line sits on the top edge.
- `Modal` (`imports/review/Modal.tsx:16`) is a `fixed … overflow-y-auto` overlay. The page body behind it is not
  locked, so the page scrolls too when the dialog is scrolled (scroll chaining).
- The window shows:
  - the comparison (`ComparisonDetail`, `:310–366`, with `signedToneClass` on the two effects `:349`, `:357`);
  - the frequency line (`Frequency`, `:258–287`);
  - the chart;
  - a four-column table: Ay, Miqdar, Qiymət, Məbləğ;
  - "Mənbə və versiya məlumatı" in a closed `<details>` (`:197–221`).
  The price cell of a month with a missing price shows the amber sentence "N sətirdə qiymət yoxdur" (`PriceCell`,
  `:235–249`), not "—".
- Nothing shows how this month's quantity compares with the basis. No supplier appears anywhere: the trend DTO carries
  none (`VariantTrendPointDto`, `Analytics/AnalyticsDtos.cs:183–193`), although every order line has a nullable
  `SupplierId` (`Domain/Orders/OrderRequestItem.cs:71`).
- The window opens from the order page with the driver (`pages/OrderDetailPage.tsx:466–475`,
  `from = requestPeriod − 11 months`). It also opens from the comparison page without one
  (`LocationAnalyticsPage.tsx:343–351`).

## 3. Scope

In scope. Every line of the brief's "İstədiyim nəticə":

- A. A row where both quantity and price moved shows the two parts on their own: "Miqdar +160,00 ₼ · Qiymət +7,00 ₼".
- B. 9.1 on the list and in the history window: increase red, decrease green, with the direction in words.
- C. Every product count says what it counts. For the same question, the order page and the comparison page show the
  same number: new products, products no longer ordered, products in the comparison.
- D. History window: the chart uses straight lines, every month is labelled, the quantity axis uses whole numbers for
  whole quantities, the price line does not sit on the top edge, and the page behind the window stays still.
- E. The window shows this month's quantity against the basis average as a ratio, and the supplier.
- F. Tests.

Out of scope (the brief's list, plus later tasks):

- words and units, and prices to 2 decimals: Task 5, accepted (reuse `formatPrice`, `formatOrderUnit`, the terms);
- false new/not-ordered pairs caused by name differences, and variants: Task 13;
- merging the comparison page into the order page: Task 11. The comparison page only gets its count captions here;
  its structure, colours and `components/analytics/labels.ts` stay for Task 11;
- phone layouts: Task 12;
- "Niyə dəyişib?" order and emphasis: Task 6, accepted. Only the count word in each cause row changes (§4.3);
- any change to a figure: money, effect, share, cause total or the frequency counts.

## 4. Required behaviour

### 4.1 One state rule, one set of counts (backend) — C

1. **The state rule lives once.** Extract the body of `OrderAnalyticsCalculator.StateOf` (`:161–183`) into a public
   static method, for example
   `public static ComparisonState StateOf(AnalyticsKind kind, decimal? currentQuantity, decimal? baselineQuantity, int availableBaselinePeriodCount)`.
   `Compare` calls it exactly as it does today, so the comparison page's answers do not change. The decision context
   calls the same method (point 2).
2. **Each driver carries its state.** `DecisionDriverDto` gains `ComparisonState State` **at the end**. It is computed
   in `Explain` from the variant's kind, its `CurrentQuantity` / `BaselineQuantity` (the same average the comparison
   page uses — `PeriodComparison.AverageBaseline`) and the primary window's available month count. For a service,
   `CurrentQuantity`/`BaselineQuantity` are null, which gives `NotComparable`, as on the comparison page. Add the
   available count to `Explain`'s parameters; `Compare` already has `available.Count`.
3. **A product that appeared or disappeared is always listed.** `Explain`'s "moved no money" skip (`:206–214`) no longer
   drops a variant whose state is `New` or `NoLongerOrdered`. Such a product is a change even when it cost nothing,
   for example a new internally supplied material. A steady product still drops
   (`OrderDecisionContextTests` `…SteadyVariantId` stays green).
4. **The counts, once.** `DecisionDecompositionDto` gains **at the end** `DecisionProductCountsDto Products`:

   ```csharp
   /// <param name="ComparedCount">Every product in this order or in the basis window — the union the comparison is
   /// over. The comparison page's <c>TotalVariantCount</c> for the same object, month and basis.</param>
   /// <param name="InCurrentOrderCount">Distinct products in the opened order.</param>
   /// <param name="NewCount">Products whose state is <see cref="ComparisonState.New"/>. Same rule as the comparison page.</param>
   /// <param name="NoLongerOrderedCount">Products whose state is <see cref="ComparisonState.NoLongerOrdered"/>.</param>
   /// <param name="ListedCount">The drivers returned: products whose money or effect moved, whose price is unknown,
   /// or that appeared or disappeared.</param>
   public sealed record DecisionProductCountsDto(
       int ComparedCount, int InCurrentOrderCount, int NewCount, int NoLongerOrderedCount, int ListedCount);
   ```

   Compute these in memory, from the decomposition's variants (before the skip) and the current snapshots:
   - `NewCount` and `NoLongerOrderedCount` count the states over **all** compared variants, not over the drivers. By
     point 3 they are then also the number of drivers in each state.
   - `ListedCount == Drivers.Count`.
5. No new query. The decision context stays at **five** queries
   (`The_whole_answer_is_a_handful_of_queries_however_many_products_there_are` unchanged). It writes nothing.

Result, for one object, month (latest version) and basis:

- decision `Products.NewCount` = comparison summary `NewVariantCount`;
- `NoLongerOrderedCount` = `NoLongerOrderedVariantCount`;
- `ComparedCount` = `TotalVariantCount`;
- every driver's `State` = that variant's comparison row `State`.

§10's test proves this on every basis.

### 4.2 The list rows (frontend, `DriverList.tsx`) — A, B

- **Mixed row.** When `quantityImpact` and `priceImpact` are both non-null and non-zero:
  - add one line directly under the compact facts line:
    `Miqdar +160,00 ₼ · Qiymət +7,00 ₼`. The words are "Miqdar" and "Qiymət", the amounts are `formatMoneyDelta`, and
    each amount has its own `costDirectionToneClass` and `DirectionWord`;
  - replace the single category pill with one neutral pill, `mixedCauseLabel = 'Miqdar və qiymət'` (new constant in
    `components/decisions/labels.ts`, slate tone). A single pill naming only the larger effect is what the audit
    objected to.
  A row with only one non-zero effect is unchanged: one pill, no split line.
- **Keep the compact line exactly.** "20 → 40 ədəd · Qiymət 4,00 → 4,00 ₼" stays in the same form and order (brief:
  "Mütləq qorunmalı").
- **9.1.** The row's money uses `costDirectionToneClass(driver.amountImpact)` plus `DirectionWord`. Keep the "—"
  case. Widen it: an amount of 0 with neither side carrying a known amount (`currentKnownAmount` and
  `baselineKnownAmount` both null — an unpriced or internally supplied product kept by §4.1.3) also shows `unknownValue`,
  never "0,00 ₼".
- **Chips by the shared definition.**
  - `matches` for `NewOrders` / `NoLongerOrdered` becomes `driver.state === 'New'` / `'NoLongerOrdered'`. Rename the
    `DriverFilter` values if that reads better; the chip words stay `newProductsLabel` / `notOrderedThisMonthLabel`.
  - A new product with a missing price is then under both "Yeni məhsullar" and "Qiymət yoxdur". The file already has
    this precedent: "A product that moved both ways appears under both".
  - Each chip's count is still the number of rows it leaves. By §4.1.4 that equals `products.newCount` /
    `products.noLongerOrderedCount`, and a test asserts it.
- **Say what "Hamısı" counts.** Add one quiet `text-xs text-slate-500` line under the heading, from a builder
  `driverScopeLine(products)` in `components/decisions/labels.ts`:
  - "Bu sifarişdə {C} məhsul var, müqayisə bazası ilə birlikdə {K}. «Hamısı» onlardan dəyişən {L} məhsulu sayır."
  - when K > L, append " {K−L} məhsul dəyişməyib."
  (C = `inCurrentOrderCount`, K = `comparedCount`, L = `listedCount`.) This is where Fəvvarələr's 100 against 76 lines
  is explained.
- `DriverList` receives the counts. Pass `decomposition.products` (or the whole decomposition) from
  `OrderDetailPage.tsx:277–279`.
- Unchanged: the sort by `|amountImpact|` (backend), the first 6 rows, "Hamısına bax (N)" / "Daha az göstər", the
  whole row opening the history, the notes (missing price, internal supply, supply changed), "Qiymət dəyişən" /
  "Miqdar dəyişən" / "Qiymət yoxdur" chips.

### 4.3 Counts that say what they count, on both pages — C

- **Order page, "Niyə dəyişib?"** (`CauseSummary.tsx:127`): the per-cause count becomes "{n} məhsuldan" (ablative,
  "from n products"). The number is unchanged (`cause.variantCount`, the products whose money is in that row). It no
  longer reads as "n new products" beside a "Yeni məhsullar" chip that counts by state. Figures, order and emphasis
  from Task 6 are untouched.
- **Comparison page** (`AnalyticsSummary.StateOverview`, `:83–104`): before the state counts, add the lead
  "Müqayisədə {totalVariantCount} məhsul: bu ay və ya müqayisə bazasında sifariş olunanlar ·". The state counts ("Yeni
  məhsullar: 60", …) keep their labels.
- **Comparison page, the row count** beside the search (`LocationAnalyticsPage.tsx:288`): "{n} məhsul göstərilir",
  because it is the filtered count of the active tab.
- Result, Heydər Əliyev, September, same basis:
  - "Yeni məhsullar 60" on the order page's chip and "Yeni məhsullar: 60" on the comparison page;
  - "müqayisə bazası ilə birlikdə 119" on the order page and "Müqayisədə 119 məhsul" on the comparison page.
  (The real figures are the operator's to confirm, §11.)

### 4.4 The history window — chart (D)

Put the pure rules in `components/analytics/trend.ts` (unit-tested). `TrendChart.tsx` only applies them.

- **Straight lines.** `type="linear"`. Keep the dots, `connectNulls={false}` (a missing month is still a break), and
  the colours.
- **Every month labelled.**
  - `XAxis interval={0}`.
  - The tick text comes from a helper, for example `monthTickLabel(period, isFirst)`: the full month name ("Avqust"),
    plus the year on the first slot and on every January ("Yanvar 2027"). Full names, never 3-letter abbreviations
    ("İyun" / "İyul" must not collide — the problem Task 11 reports on the object page).
  - With more than 8 slots, the ticks tilt (for example `angle={-35}`, `textAnchor="end"`, and more axis `height`) so
    the order page's 12-month window stays readable at `max-w-3xl`.
- **The value axis.** One helper, for example
  `valueAxis(values: (number | null)[], wholeNumbers: boolean): { domain: [0, number]; ticks: number[] }`:
  - `max` is the largest non-null value, or 0;
  - `top` is a "nice" number (1, 2, 2.5, 5 × 10ⁿ steps) **strictly above** `max × 1.1`, and at least 1, so no line
    touches the top edge and an all-zero series still has an axis;
  - at most 6 ticks from 0 to `top`;
  - when `wholeNumbers`, the step is a whole number ≥ 1 and every tick is a whole number.
  `wholeNumbers` is true for the quantity metric when every plotted quantity is a whole number. A quantity series in
  m² with 7,36 keeps decimal ticks. Price and amount are never forced to whole numbers. Pass `domain`, `ticks` and
  `allowDecimals={!wholeNumbers}` to `YAxis`.
  - Traktor, 0 and 1 ədəd: ticks are whole numbers only, including 0 and 1, with no 0,25.
  - Şampun qab 40 / 20 / 40: `top` > 40.
  - A flat price of 32,00: `top` > 32.

### 4.5 The history window — content (E, and the brief's decisions)

- **9.1.** `ComparisonDetail`'s "Miqdar təsiri" / "Qiymət təsiri" (`:349`, `:357`) use `costDirectionToneClass` plus
  `DirectionWord`. After this, `DriverList.tsx` and `TrendModal.tsx` no longer import `signedToneClass`. Its only
  importer outside its own test is `components/analytics/labels.ts` (Task 11). Update the doc comment in `format.ts`
  to name only Task 11.
- **The ratio against the basis.** One line, shown when the window has a basis to compare with and the product is a
  material. Example: "Son 3 ayın ortalaması: 30 ədəd · bu ay: 40 ədəd — 1,3×".
  - The basis words are `describeBasis(basis, windowPeriods)` ("Keçən ay", "Son 3 ayın ortalaması", …). The quantities
    use `formatQuantity` plus `formatOrderUnit`.
  - The ratio comes from a helper `quantityRatio(current, baseline)`: `current / baseline` to one decimal, written with
    a comma and "×" ("1,3×", "0,5×"). It is null when `baseline` is null or 0 (a new product: then the line says
    "… : 0 ədəd · bu ay: 5 ədəd" with no ratio). When `current` is 0, the line ends "— bu ay sifariş olunmayıb" instead
    of "0,0×".
  - The figures are the ones the entry page already shows:
    - from the order page, `driver.baselineQuantity` / `driver.currentQuantity` and `decision.primary.basis` /
      `windowPeriods`;
    - from the comparison page, the row's `baseline.quantity` / `current.quantity` and `summary.basis` /
      `baselineWindowPeriods`.
    Pass a small prop into `TrendModal` (for example
    `quantityRatio?: { basis, windowPeriods, baseline: number | null, current: number | null } | null`), built by
    each page. The window divides; it does not average anything.
  - Place it at the top of `ComparisonDetail` when there is a driver, otherwise as its own line above the frequency
    section.
- **The supplier.**
  - Backend: `VariantTrendPointDto` gains **at the end** `IReadOnlyList<string> SupplierNames`. These are the distinct
    names of the suppliers on that month's lines of this variant, in Azerbaijani alphabetical order, and empty when no
    line has a supplier. Read them in `GetTrendAsync` with **at most one** extra query: a `Distinct` over
    `(OrderRequestId, Supplier.Name)` for the same request ids and variant. Nothing is written.
    `Reading_analytics_writes_nothing` stays green.
  - Frontend:
    - Add a line "Təchizatçı: {names joined ' · '}" at the top of the window. It names the suppliers of the latest
      month in which the product was ordered. If that month is not the window's last month, add its month:
      "Təchizatçı (İyul 2026): …". If no line recorded one, the line reads "Təchizatçı qeyd olunmayıb".
    - The monthly table gains a fifth column "Təchizatçı" after "Məbləğ": the names, or `unknownValue` when there are
      none. A month without an order stays one "sifariş yoxdur" cell (`colSpan` becomes 4).
- **Task 2 in the window.**
  - An internal-supply month's price cell stays "Daxili təminat" (slate).
  - A month with a missing price shows `unknownValue` "—" in the price cell, followed by Task 9's short mark (`⚠ N`,
    accessible name "N sətirdə qiymət yoxdur"). Reuse `components/dashboard/MissingPriceMark.tsx` with
    `explanationIsComplete` true. You may move it to `components/analytics/` beside `DirectionWord` and update its
    importers; do not copy it.
  - The amount cell stays "—" for a month with no known amount.
- **Unchanged:**
  - the title "Məhsul tarixçəsi";
  - the frequency line "Son 9 ayın 3-də sifariş edilib · İlk sifariş · Son sifariş · Tipik interval", with its
    content and its place above the chart;
  - the metric buttons and the `weightedPriceHint`;
  - the gap note;
  - "Mənbə və versiya məlumatı", still a closed `<details>`, with its content.

### 4.6 The page behind stays still (D)

In `components/imports/review/Modal.tsx` (the one modal every dialog uses):

- while mounted, lock the page: remember `document.body.style.overflow`, set it to `hidden`, and restore the
  remembered value on unmount. Nested or consecutive dialogs must restore correctly, so restore what *this* instance
  found;
- add `overscroll-contain` to the overlay, so a scroll that reaches the dialog's end does not chain to the page.

Every dialog gets this. That is intended (§Assumptions 11).

## 5. Files — summary for the Coder

Changed (expected):

- Backend:
  - `Application/Analytics/OrderAnalyticsCalculator.cs` (public `StateOf`);
  - `Application/Decisions/OrderDecisionContextQueries.cs` (`Explain`: state, skip rule, counts);
  - `Application/Decisions/DecisionContextDtos.cs` (`DecisionDriverDto.State`, `DecisionProductCountsDto`,
    `DecisionDecompositionDto.Products`);
  - `Application/Analytics/AnalyticsDtos.cs` (`VariantTrendPointDto.SupplierNames`);
  - `Application/Analytics/OrderAnalyticsQueries.cs` (`GetTrendAsync`).
- Backend tests:
  - `tests/BaxOrders.IntegrationTests/OrderDecisionContextTests.cs`;
  - `OrderAnalyticsTests.cs`;
  - a new theory over every basis in `ComparisonBasisConsistencyTests.cs`, or a new `ProductCountConsistencyTests.cs`;
  - unit tests for `StateOf` if the unit project already tests the calculator.
- Frontend:
  - `api/decisions.ts` (`state`, `products`), `api/analytics.ts` (`supplierNames`);
  - `components/decisions/DriverList.tsx`, `labels.ts`, `CauseSummary.tsx` (count word only);
  - `components/analytics/TrendModal.tsx`, `TrendChart.tsx`, `trend.ts`, `AnalyticsSummary.tsx` (lead only),
    `format.ts` (comment only);
  - `components/imports/review/Modal.tsx`;
  - `pages/OrderDetailPage.tsx` and `pages/LocationAnalyticsPage.tsx` (props and the row-count word only);
  - `terminology/terms.ts` if a new word belongs there;
  - `MissingPriceMark` if moved.
- Frontend tests: `DriverList.test.tsx`, `CauseSummary.test.tsx`, `TrendModal.test.tsx`, `trend.test.ts`, a
  `TrendChart` test, a `Modal` test, `OrderDecisionPage.test.tsx`, the comparison page / `ComparisonRows` tests where
  the summary is rendered, `terminology/oldTerms.test.tsx`, and every fixture that builds a `DecisionDriver`,
  `DecisionDecomposition` or `VariantTrendPoint` (`tsc -b` finds them).

Not changed:

- the arithmetic: `CauseDecomposition`, `PeriodComparison`, `CauseLeader`;
- the dashboard (Task 9) and the monthly report (Task 8);
- `components/analytics/labels.ts`, `ComparisonRows.tsx` and the comparison page's layout (Task 11);
- the order page's lines table;
- `DecisionHeadline.tsx`;
- `tools/`;
- any schema.

Keep the codebase's idiom: comments say *why*; words come from `src/terminology` or the feature's `labels.ts`; C# XML
doc comments follow `DecisionContextDtos.cs`. Rewrite a doc comment whose design changes: `matches` in
`DriverList.tsx`, `Explain`'s skip comment, `TrendChart`'s header, and the `DriverList` header's "the split of the
two effects … is one click away and deliberately not here" (`:145–148`), which no longer holds for a mixed row.

## 6. Backend requirements

- As in §4.1 and §4.5. The work is in memory, except for one supplier query on the trend. The decision context stays
  at five queries and writes nothing. The trend writes nothing.
- No schema change, no EF migration, no new endpoint. The existing fields keep their meaning; the new fields go at the
  end of their records.
- The comparison page's rows, states and summary answer exactly as before. The dashboard's variant counts do not
  change (they use the same `Compare`).
- If a requirement seems to need a figure to change (money, effect, cause total, share, frequency), **STOP** and
  report why.

## 7. Safety and STOP conditions

- **No access to the real database.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`. Integration tests use their own disposable databases.
- No data change. HD-002's 94 rows stay untouched.
- No figure changes. If a test shows a driver's `amountImpact`, `quantityImpact` or `priceImpact`, a cause total, or
  the "Cəmi" moving, **STOP**. Report it; do not adjust it.
- If the §10 equality test fails because the two pages really do use different months or versions for the same
  question (not because of the counting), **STOP** and report the exact case. Do not bend either side to match.
- Do not rework Tasks 1–9. A defect found there goes into the report.
- Do not touch later tasks' screens (§3), even to "make the colours consistent".
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 8. Invariants — MUST NOT CHANGE

- Task 1: the basis is in the URL, and the order page and the window compare against the chosen basis.
- Task 1c: the causes add up to "Cəmi" to the qəpik, and each driver's two effects add up to its money.
- Task 2:
  - ⚠ counts only lines somebody owes a price for;
  - internal supply reads "Daxili təminat" and is never amber;
  - "Təchizat forması dəyişib" stays.
- Task 5:
  - the words "Yeni məhsullar", "Bu ay yazılmayan məhsullar", "məhsul" (never "mövqe"), "Məhsul tarixçəsi", "Orta
    qiymət";
  - units, and prices to 2 decimals;
  - no codes or versions outside the closed "Mənbə və versiya məlumatı";
  - the old-terms sweep stays green.
- Task 6: cause order, primary emphasis, figures and `causeTieOrder`. Only the count word in each cause row changes
  (§4.3).
- Task 7: the dashboard's product line and share. The traktor is still first in "Əsas dəyişikliklər" (sorted by
  impact).
- Tasks 8 and 9: the monthly report and the dashboard are untouched.
- Brief "Mütləq qorunmalı":
  - the compact row format;
  - sorting by impact, and "Hamısına bax";
  - the frequency line;
  - "Mənbə və versiya məlumatı" closed.
- The decision context: five queries, writes nothing. The comparison page's figures and states are unchanged.
- No schema, migration or data change.

## 9. Acceptance criteria

1. A Zibil paketi-shaped driver (50 → 55 paket, 32,00 → 32,1273 ₼, +167,00 ₼) shows "Miqdar +160,00 ₼ · Qiymət
   +7,00 ₼" as its own line, each part 9.1-coloured, with the pill "Miqdar və qiymət". The compact line is unchanged.
   *(brief acceptance 1)*
2. A Nitroamafoska-shaped row "+870,00 ₼" is `text-red-700`, and a Yay ayaqqabısı-shaped row "−1.988,00 ₼" is
   `text-emerald-700`, each with the `sr-only` direction word. `DriverList.tsx` and `TrendModal.tsx` do not import
   `signedToneClass`. *(brief acceptance 2; 9.1)*
3. For one object, month and basis — on every basis — the order page's new-product count equals the comparison page's,
   and so do the no-longer-ordered count and the compared count. The fixture includes a new product with a missing
   price, a new internally supplied product with no money, a new service, a steady product, and a product in two
   basis months. "Hamısı" has its scope line; the cause rows say "{n} məhsuldan"; the comparison page says what its
   counts count. *(brief acceptance 3)*
4. Şampun qab-shaped history (İyul 40, Avqust 20, Sentyabr 40): every month is labelled on the axis, including
   "Avqust", and the line is `linear`. *(brief acceptance 4)*
5. Traktor-shaped history (0 → 1 ədəd): the axis ticks are whole numbers that include 0 and 1, with no 0,25. The
   supplier line names the traktor's supplier. *(brief acceptance 5)*
6. While the history window is open, `document.body` is `overflow: hidden` and the overlay is `overscroll-contain`.
   Closing restores the previous value. *(brief acceptance 6)*
7. The window shows "…: 30 ədəd · bu ay: 40 ədəd — 1,3×" for a 30 → 40 driver, with the chosen basis's words. The same
   line appears when the window is opened from the comparison page. A flat price series does not reach the top of the
   axis.
8. Nothing else changed: every figure, the frequency line, "Mənbə və versiya məlumatı" closed, the sort and "Hamısına
   bax", five queries, and the comparison page's figures. All suites and both builds are green; the old-terms sweep
   passes.

## 10. Required tests

Backend, integration: the product-count agreement, a theory over `EveryBasis`. Its world is one location with
several months and:

- a steady product;
- a product with both effects;
- a new priced product;
- a new product with a missing price;
- a new internally supplied product (no price owed, so zero money);
- a new service;
- a product only in the basis window;
- a product in two of the basis months only.

Per basis, with the order opened at its latest version:

- `Products.NewCount == summary.NewVariantCount`;
- `Products.NoLongerOrderedCount == summary.NoLongerOrderedVariantCount`;
- `Products.ComparedCount == summary.TotalVariantCount`;
- `Products.InCurrentOrderCount` is the distinct variants of the order;
- `Products.ListedCount == Drivers.Count`;
- every driver's `State` equals the comparison row's `State` for that variant;
- the drivers in state `New` are exactly the rows in state `New`, and likewise for `NoLongerOrdered`;
- the internally supplied new product is a driver;
- the steady product is not.

Backend, `OrderDecisionContextTests`:

- a mixed driver's `QuantityImpact + PriceImpact == AmountImpact` (existing), and both are non-zero for the Zibil
  paketi shape;
- the five-query and writes-nothing tests are unchanged and green.

Backend, `OrderAnalyticsTests`:

- `SupplierNames`:
  - two suppliers on one month's lines of the variant → both, alphabetical, no duplicates;
  - a line with no supplier contributes nothing;
  - a month without the variant → empty;
  - other variants' suppliers never appear;
- `Reading_analytics_writes_nothing` stays green.

Backend, unit (if the calculator has unit tests): `StateOf` for New / NoLongerOrdered / Increased / Decreased /
Unchanged / service / no baseline.

Frontend (vitest):

- `trend.test.ts`:
  - `valueAxis`: [0, 1] whole → whole ticks including 0 and 1, none fractional; [40, 20, 40] → top > 40;
    [32, 32.13] → top > 32.13; all null or 0 → top ≥ 1; [7.36] not whole → decimals allowed;
  - `monthTickLabel`: full names, the year on the first slot and on January, "İyun" ≠ "İyul";
  - `quantityRatio`: 40/30 → "1,3×", 20/40 → "0,5×", baseline 0 or null → null;
  - the ratio line wording, including "bu ay sifariş olunmayıb".
- `TrendChart` test (mock `recharts` to capture props):
  - `Line` has `type="linear"` and `connectNulls={false}`;
  - `XAxis` has `interval={0}` and a tick for every slot, "Avqust" included, on a three-month İyul/Avqust/Sentyabr
    series;
  - on a 0/1 quantity series, `YAxis` gets whole-number ticks and `allowDecimals={false}`.
- `TrendModal.test.tsx`:
  - the two effects are `text-red-700` / `text-emerald-700` with the direction word;
  - the ratio line from a driver and the basis;
  - the ratio line from the `quantityRatio` prop without a driver;
  - "Təchizatçı: …" from the last ordered month, "Təchizatçı (İyul 2026): …" when that is not the last month, and
    "Təchizatçı qeyd olunmayıb";
  - the table's "Təchizatçı" column;
  - a missing-price month shows "—" and "⚠ N" named "N sətirdə qiymət yoxdur";
  - an internal-supply month shows "Daxili təminat";
  - "Mənbə və versiya məlumatı" is a closed `<details>`;
  - the frequency line is still there.
- `Modal` test: `document.body.style.overflow` is `hidden` while open and the previous value after close, also with
  two modals opened one after the other; the overlay has `overscroll-contain`.
- `DriverList.test.tsx`:
  - the mixed row's split line and pill, with the compact line unchanged;
  - a single-effect row has no split line;
  - 9.1 classes and the `sr-only` word on the row money, and no `text-rose-700`;
  - "Yeni məhsullar" counts and filters by `state` (a new, missing-price product is under both chips);
  - the chip counts equal `products.newCount` / `noLongerOrderedCount`;
  - the scope line with and without the "dəyişməyib" tail;
  - a zero-money, unpriced kept driver shows "—";
  - "Hamısına bax" and the first 6 rows are unchanged.
- `CauseSummary.test.tsx`: "2 məhsuldan" / "1 məhsuldan". This is a deliberate change of the "2 məhsul" expectations,
  and the "never mövqe" intent is kept.
- Comparison page: the lead "Müqayisədə N məhsul: …" and "{n} məhsul göstərilir".
- `OrderDecisionPage.test.tsx`: `DriverList` gets the counts, and the window gets the basis for the ratio.
- `oldTerms.test.tsx`: the new words ("Miqdar və qiymət", the scope line, "məhsuldan", the ratio line, the supplier
  line, "məhsul göstərilir") pass `findOldTerms`, with no "yaxşı / pis".

Existing tests that change **deliberately**: name each one in the report, with the brief line behind it. Expected:

- `DriverList` tests that assert the pre-9.1 colours, or the New / not-ordered chip counts by category;
- `CauseSummary`'s "N məhsul" count text;
- `TrendModal` tests that assert the amber missing-price sentence in the price cell, or `signedToneClass` colours;
- fixtures gaining `state`, `products` and `supplierNames` mechanically — list the files.

No expectation may be weakened to make a test pass.

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `bin`, use `--artifacts-path` into
  the scratchpad; say so, and do not stop the API.
- `dotnet test BaxOrders.slnx`: all green. Unit and integration counts go **up** from Task 9's 817 / 652, and only by
  the new tests. Paste the summary lines.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  (`tsc -b` is the type check) are green, with counts (Task 9: 38 files / 655 tests).
- `git diff --stat` and `git status`: changes only under `src/`, `tests/` and `frontend/bax-orders-web/src/`.
- The brief's real figures cannot be read without the real database, which this task does not touch:
  - Zibil paketi +160 / +7;
  - Nitroamafoska +870 / Yay ayaqqabısı −1.988;
  - Heydər Əliyev 58/60 and 113/119;
  - Şampun qab's August;
  - Traktor's 0/1 axis and supplier;
  - the still page behind the window.
  The fixture tests above prove them. Say in the report that the operator should confirm them on the running app after
  the API is restarted on this commit, on "Keçən ay" and one averaged basis.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Qarışıq dəyişən sətirdə "Miqdar +160 · Qiymət +7". | §4.2; criterion 1 |
| Siyahıdakı məbləğlər 9.1 ilə. | §4.2, §4.5; criterion 2 |
| Hər sayın yanında nəyi saydığı; iki səhifədə eyni rəqəm. | §4.1, §4.2, §4.3; criterion 3; §10 count theory |
| Tarixçə: düz xətt; ədəd üçün tam ədədli ox; bütün aylar; qiymət xətti kənara sıxılmır. | §4.4; criteria 4, 5, 7 |
| Pəncərə sürüşəndə arxa səhifə yerində qalır. | §4.6; criterion 6 |
| Orta miqdara nisbət (seçilmiş bazaya görə) və təchizatçı. | §4.5; criteria 5, 7 |
| Müqayisə bazası hər yerdə eynidir (Task 1). | §4.5 (ratio uses the page's basis); §8 |
| Daxili təminat "Daxili təminat", qiymətsiz "—" (Task 2). | §4.5 |
| 9.1; 5.1 (pəncərənin adı, tezlik sətri). | §4.2, §4.5; §8 |
| Mütləq qorunmalı: yığcam sətir; sıralama və "Hamısına bax"; tezlik sətri; "Mənbə və versiya məlumatı" bağlı. | §4.2, §4.5; §8 |
| Out of scope: Task 5, 13, 11. | §3 |
| Acceptance 1–6 | criteria 1–6 |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. The task stays in one part. It is about Task 9's size.
2. "The same question" for the product counts is "how many new / no-longer-ordered / compared products". The shared
   answer is the comparison page's state rule (current quantity > 0 against a zero baseline, and so on). That rule
   matches the order page's own hint for "Yeni məhsullar" ("Keçən ay sifariş olunmayan, bu ay sifariş olunan
   məhsullar"). The order page's chips move onto it. The money buckets in "Niyə dəyişib?" keep their own count, which
   now reads "{n} məhsuldan".
3. The rule is extracted from `OrderAnalyticsCalculator`. It is called by both pages, not copied, so the definitions
   cannot drift. The backend sends each driver's state, so the browser does not recompute it.
4. A product that appeared or disappeared is listed in "Əsas dəyişikliklər" even when its money is zero (for example
   an internally supplied new material). Without this the order page's "Yeni" count could never match the comparison
   page's. Steady products are still left out of the list.
5. "Hamısı" keeps its word and still counts the listed products. A scope line under the heading states how many
   products are in the order, how many the comparison covers, and how many of them changed. This explains
   Fəvvarələr's 100 against 76 lines.
6. The comparison page gets only a lead line and the word "göstərilir" on its filtered count. Its structure is Task
   11's.
7. A mixed row shows a neutral "Miqdar və qiymət" pill instead of a single pill that names only the larger effect. The
   split line uses the brief's words "Miqdar" and "Qiymət", with money in Task 5's format (two decimals), so "+160"
   is written "+160,00 ₼".
8. "Düz xətt" is met with straight line segments between the monthly points. Bars were not used: they would hide
   the gap between a month without an order and a month ordered at zero, which the chart already distinguishes.
9. The quantity axis uses whole numbers when every plotted quantity is whole. That covers "ədəd" without the chart
   having to know units, and leaves m² or kq decimals intact.
10. "Qiymət xətti kənara sıxılmır" is met by giving every metric's axis headroom above its largest value.
11. The scroll lock sits in the one shared `Modal`, so every dialog gets it. That fixes the same defect everywhere
    rather than only in the history window.
12. The ratio is this month's quantity divided by the basis quantity the entry page already shows (for an averaged
    basis, the average over the months the object ordered in). It is shown to one decimal with "×". It is omitted
    where it would divide by zero, and replaced by words when this month is zero.
13. "Təchizatçı" is the supplier on the product's order lines. The window names the latest ordered month's suppliers
    and adds a per-month column, so a change of supplier is visible. Several suppliers in one month are all named.
14. Task 2's "qiymətsiz sətir '—' kimi" in the window is met by an em dash in the price cell. The count moves to Task
    9's short ⚠ mark, as on the dashboard.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 9's commit `773063f`), `git status --short`, `git diff --stat`.
1. Siyahı sətirləri — the mixed row before and after (Zibil paketi shape), 9.1 on the list, the "—" rule.
2. Məhsul sayları — why the two pages disagreed, the shared state rule, the counts block, the skip-rule change, the
   scope line, "məhsuldan", and the comparison page captions; before and after for the Heydər Əliyev and Fəvvarələr
   shapes.
3. Tarixçə qrafiki — line type, month ticks, the value axis rule with the Traktor / Şampun qab / flat-price examples.
4. Tarixçə pəncərəsi — the ratio, the supplier (backend and frontend), the Task 2 cells, 9.1, and the scroll lock.
5. Rənglər (9.1) — who still imports `signedToneClass`, and which task moves it.
6. Testlər — new tests; changed tests and fixtures, each with the brief line behind it; counts; builds.
7. Toxunulmayanlar — no database access, no figure changed, five queries, the comparison page's figures, and Tasks
   1–9 intact.
8. Sonrakı tapşırıqlar üçün qeydlər — for 11, 12, 13.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
