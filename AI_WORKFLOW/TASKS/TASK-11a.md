# TASK 11a — OBYEKTLƏR SİYAHISI VƏ OBYEKT SƏHİFƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-11.md`. This is the owner's settled requirement, shared by 11a and 11b. It decides
*what* and *why*; this file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **11a of two.** 11a changes the objects list and the object page. **11b** merges the object comparison page into
the order page (decision 11.1). §3 lists which brief lines each part carries; together they carry all of them.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `47454e6`
(Task 10's accepted commit). Line numbers below are at `47454e6`.

This task **reads** data and changes how three screens present it. It is frontend only: no backend file, no schema, no
database row. This file deliberately contains no `DATA_MIGRATION` marker.

---

## 1. Context

The brief's goal: "Obyektin öz səhifəsi vəziyyəti panel və sifariş səhifəsi ilə eyni dildə, eyni bazada və eyni
rəqəmlərlə göstərsin. Müqayisə üçün ayrıca ikinci səhifə qalmasın." 11a delivers the first sentence. 11b delivers the
second.

Why the task is split:

- 11a needs no backend change. It is two pages and one component.
- 11.1 is a different kind of work. It carries the comparison page's product list into the order page, retires a route,
  and removes three components. The 11a/11b seam is also the seam between frontend-only work and work with a backend
  change, and each half is one reviewable diff. Task 10 was one session with 29 files; the two halves together would
  be larger than that.

Owner decisions and accepted rules this part applies but does not own:

- **9.1** (Task 9): cost increase red, decrease green, as direction. It is written once as `costDirectionToneClass`
  (`components/analytics/format.ts:325`), with `DirectionWord` (`components/analytics/DirectionWord.tsx`) for the
  screen-reader word.
- **Task 1**: the basis lives in the URL. `analytics/basisParams.ts` owns the spelling: `parseBasis`, `basisSearch`,
  `orderLink`, `locationLink`. `analytics/useBasis.ts` reads it. The dashboard already sends
  `/locations/{id}?basis=avg3` for an object with no order this month (`AttentionSection.tsx:222`,
  `DashboardSummary.tsx:352`).
- **Task 2**: "Qiymət yoxdur" is amber and counts only lines somebody owes a price for. "Daxili təminat" is slate and
  never a warning. The words are in `pricing/labels.ts`.
- **Task 3**: 27 objects, full names, the list's order. **Task 5**: words, units, 2-decimal money, no codes.
- **Task 10**: `monthTickLabel` (`components/analytics/trend.ts:76`) — full month names, the year on the first slot
  and on January.

## 2. Verified current behaviour (repository at `47454e6`)

### 2.1 Objects list — `pages/LocationsPage.tsx`

- "Dəyişmə" (`:117`, cell `:166–176`) shows `formatMoneyDelta(knownAmountDelta)` and `formatPercent(…)` in
  `text-slate-900` / `text-slate-500`. There is no colour, no direction word, and nothing says what the change is
  measured against.
- The figure is the backend's (`LocationOrderQueries.WithLatestOrderAsync`, `Application/Orders/LocationOrderQueries.cs:134–226`).
  It compares the latest order's known amount with the calendar month before it, at that month's highest version.
  It is null when that month has no order. The dashboard, for comparison, colours the same kind of figure with 9.1
  (`components/dashboard/LocationRows.tsx:114–118`).

### 2.2 Object page — `pages/LocationDetailPage.tsx`, `components/locations/LocationTrend.tsx`

- The page does not read the URL at all. `?basis=avg3` from the dashboard is ignored. Every link it writes
  (`:73`, `:184`, `:210`, `:216`, and `LocationTrend.tsx:77`) drops the basis.
- `LocationTrend` works out "Keçən aya görə +X ₼ (Y%)" **in the browser**, from two history entries
  (`LocationTrend.tsx:29–40`). This is the only comparison on the page. It is always against last month, and it is
  not the figure the order page or the dashboard computes.
- The strip (`:84–105`):
  - labels each month with `formatMonth(period).slice(0, 3)`, so "İyun" and "İyul" both read "İyu". Nərimanov
    heykəli reads "Apr May İyu İyu Avq Sen";
  - labels a month without an order "—" instead of its name;
  - shows no amount; the amount is only in the bar's `title`;
  - takes `entries.slice(0, 12)`, which counts versions, not months;
  - renders whenever year and month are unfiltered (`LocationDetailPage.tsx:91`), even on page 2 of the history,
    where `entries[0]` is not the latest order.
- Counts:
  - the latest card shows only `missingPriceCount(latest.missingPriceItemCount)` (`LocationTrend.tsx:70–72`);
  - the lifetime line (`LocationDetailPage.tsx:93–102`) shows "Qiymət yoxdur {n}" with **no period**. This is Heydər
    Əliyev's "15", which covers the whole history but reads as this month;
  - internal supply appears nowhere on the page. Nərimanov shows "Qiymət yoxdur 1" and no "Daxili təminat 1".
  The backend already sends `InternalSupplyItemCount` on every history entry and on the lifetime header
  (`Application/Orders/OrderReadDtos.cs:100`, `:121`; `LocationOrderQueries.cs:254–255`, `:300`, `:323`). The frontend
  types (`api/orders.ts:70–97`) do not declare it.
- Each history row has "Sifarişə bax" (`:209–214`) and "Müqayisə" (`:215–221`, to
  `/locations/{id}/analytics?period=yyyy-MM`). The header has "Müqayisə et" (`:71–79`).

### 2.3 Round trip through the order page

- `OrderDetailPage.tsx:195–200`: "Obyektin sifarişləri" links to `/locations/{id}` and drops the basis the order page
  is reading.
- `LocationAnalyticsPage.tsx:165`, `:177`: the comparison page's breadcrumb and "Sifarişlərə bax" also drop it. That
  page already *reads* the basis (`useBasis`, `:50`).

## 3. Scope — where each brief line lands

| Brief line | Part |
|---|---|
| "Obyektlər siyahısında «Dəyişmə» xərcin istiqamətinə görə rənglidir … və bazası yazılıb." | **11a** §4.1 |
| "Mini qrafikdə ay adları təkrarlanmır və məbləğlər görünür." | **11a** §4.3 |
| "Obyekt səhifəsi seçilmiş bazanı qəbul edir və saxlayır." | **11a** §4.2 |
| "Qiymət yoxdur və daxili təminat sayları ayrıca göstərilir; hər sayın hansı dövrə aid olduğu yazılır." | **11a** §4.4 |
| "Ayrıca obyekt müqayisə səhifəsi qalmır; müqayisə sifariş səhifəsinin təhlil hissəsində aparılır (11.1)" and its three sub-lines ("Müqayisə et" / "Müqayisə" open the order's analysis; the basis is kept; nothing on the comparison page is lost) | **11b** |
| Mütləq qorunmalı: the periods table and "Sifarişə bax" on every row | **11a** §8 (and 11b keeps it) |
| Mütləq qorunmalı: "Obyektin sifarişləri" leads to the object page | **11a** §4.2 (now with the basis) |
| Acceptance 1 (Nərimanov strip), 2 ("Son 3 ay" on the object page), 3 (1 / 1 and the "15"), 4 (the list's colour and basis) | **11a** §9 |
| Acceptance 5 (no separate comparison page; "Müqayisə" opens the order's analysis with the basis) | **11b** |

In 11a, "Müqayisə et" and "Müqayisə" still open the comparison page. 11a makes them **carry the basis** (§4.2). 11b
repoints them to the order page's analysis and removes the comparison page. 9.1 on the comparison page itself
(`components/analytics/labels.ts` still re-exporting `signedToneClass`) is 11b's: that page is removed there.

Out of scope (the brief's list, plus later tasks):

- LOC codes, the "Versiya" column, "Çəkili orta qiymət": Task 5, accepted.
- The product counts' single definition: Task 10, accepted.
- Phone layouts: Task 12. Keep the strip readable at desktop widths (§4.3). Its phone form is Task 12's.
- Any backend change, any figure change. The objects list's delta stays the backend's figure. The object page's
  comparison is the order page's own endpoint.

## 4. Required behaviour

### 4.1 Objects list, "Dəyişmə" — `pages/LocationsPage.tsx`

- **9.1.**
  - Both lines of the cell, the money and the percentage, take `costDirectionToneClass(location.knownAmountDelta)`.
  - The money is followed by `<DirectionWord value={location.knownAmountDelta} />`.
  - Zero stays slate, as the shared rule says.
  - No new colour function.
- **The basis is written.**
  - The column header reads "Dəyişmə". Under it is a block line in `font-normal text-slate-400`:
    `describeBasisCaption('PreviousMonth', [])`, which gives "Keçən aya görə". Follow the pattern of the comparison
    page's `BaselineHeading`.
  - It is the calendar month before each object's own latest order. That is what "Keçən ay" means everywhere else:
    the month before the month being read. The backend figure is unchanged.
- **The empty cell.** When `knownAmountDelta` is null, the cell keeps `unknownValue`. It gains
  `title={noPreviousMonthNote}` and an `sr-only` copy of that sentence (`components/decisions/labels.ts:156`), so the
  dash says why.
- Nothing else in the list changes: the columns, the sort, the search, the summary metrics, the "Bax" link, the
  footnote.

### 4.2 Object page — the basis is accepted and kept

In `pages/LocationDetailPage.tsx`:

- **Read it.** `const [params, setParams] = useSearchParams()` and `const selection = useBasis(params, setParams)`, as
  `OrderDetailPage` does. The year, month and page filters stay local state. The basis is the one thing that travels.
- **Show it, with the order page's figure.** When the page shows the latest-order card (§4.3), it fetches
  `fetchDecisionContext(latest.orderRequestId, basisRequest(selection), signal)` — the order page's own endpoint, so
  the object page and the order page cannot give two answers for one order and one basis.
  - Key the effect on `latest.orderRequestId` and the flattened basis, as `OrderDetailPage.tsx:126–140` does.
  - A failure only drops the comparison line. The card still renders its month, money and status, as the order page
    does when its decision context fails.
- **Let the reader change it.**
  - The card carries `BasisPicker` (`components/analytics/BasisPicker.tsx`) with:
    - `selection`;
    - `onSelect`, which writes `basisParams(next)` into the URL, as `OrderDetailPage.selectBasis` does;
    - `currentPeriod = latest.requestPeriod`;
    - `months` = the prior months, taken from the decision context the same way `OrderDetailPage.tsx:148–150` takes
      them.
  - Move that expression into **one** helper, for example `comparablePriorMonths(context)` in
    `components/decisions/labels.ts`, and call it from both pages. Do not copy it.
- **Keep it on every link out of the page:**
  - every "Sifarişə bax" (the card and every row) and the period link in each row → `orderLink(orderRequestId, selection)`;
  - "Müqayisə et" (header) → `/locations/{id}/analytics?{basisSearch(selection)}`;
  - each row's "Müqayisə" → `/locations/{id}/analytics?period={yyyy-MM}&{basisSearch(selection)}`;
  - build the query with `URLSearchParams` or `basisSearch`. Never hand-spell `basis=`.
  11b repoints the two "Müqayisə" links. Here they only carry the basis.
- **Round trip.**
  - `OrderDetailPage.tsx:196`: "Obyektin sifarişləri" → `locationLink(data.locationId, selection)`.
  - `LocationAnalyticsPage.tsx:165` and `:177` (the breadcrumb and "Sifarişlərə bax") → `locationLink(id, selection)`.
  These are one-line changes. The comparison page is otherwise untouched; 11b removes it.

Result: a manager picks "Son 3 ay" on the dashboard and opens an object with no order this month. The object page
opens with "Son 3 ayın ortalaması" selected, and its card compares the latest order with that average. Every link on
the page carries `basis=avg3`, and coming back from the order page keeps it.

### 4.3 The latest-order card and the strip — `components/locations/LocationTrend.tsx`

`LocationTrend` stays the one component for the card and the strip. It becomes presentational: the page passes it
what it needs, and it computes no comparison of its own. For example:
`entries`, `comparison: OrderDecisionContext | null`, `comparisonPending`, `selection`, `onSelectBasis`,
`priorMonths`.

**The card.**

- Unchanged:
  - "Son sifariş · {Ay İl}";
  - the amount (`formatMoney(latest.knownAmountTotal)`);
  - the status badge;
  - "Sifarişə bax", now with the basis (§4.2).
- The in-browser month-before comparison and `monthBefore` are **removed**.
- In their place, under the `BasisPicker`, the order page's figures from `comparison.primary`:
  - "Müqayisə: {describeBasisWithRange(primary.basis, primary.windowPeriods)}";
  - then `{describeBasisCaption(primary.basis, primary.windowPeriods)} {formatMoneyDelta(primary.deltaAmount)}
    {formatPercent(primary.deltaPercent)}`. The money and the percentage take `costDirectionToneClass(primary.deltaAmount)`
    (9.1). The money is followed by `DirectionWord`.
  - When `!primary.available`, the line is `emptyWindowNote` instead ("Seçilmiş dövrdə müqayisə üçün sifariş yoxdur").
    Nothing is compared with zero.
  - While `comparisonPending`, a one-line pulse placeholder, as `OrderDetailPage.tsx:239`.
- The counts line: see §4.4.

**The strip.** Label every month, and show every month's money.

- **Slots.** At most 12: the latest order's month and the 11 calendar months before it. The strip starts no earlier
  than the object's oldest loaded order in that range. Each slot takes the **highest version** of its month from the
  loaded entries. A month with no order is a gap slot, as today.
- **Month names.** Every slot, a gap included, is labelled `monthTickLabel(period, index === 0)`: full names, the year
  on the first slot and on January. No two slots can read alike. "İyun" and "İyul" are both written out. A gap slot's
  label is its month name, never "—".
- **Amounts.** Each slot shows its money under the bar, from the entry and not computed:
  - `formatMoney(entry.knownAmountTotal)` in `text-[10px] tabular-nums whitespace-nowrap`;
  - a gap slot shows `unknownValue`;
  - a month with a price owed also shows Task 9's mark `MissingPriceMark` (`count = entry.missingPriceItemCount`,
    `explanationIsComplete` true), so a partial amount never reads as a whole one;
  - import `MissingPriceMark` from `components/dashboard/`, or move it to `components/analytics/` and update every
    importer. **Never copy it.**
  The bar's `title` keeps its current text ("Avqust 2026: sifariş yoxdur" / "Sentyabr 2026: 3.000,00 ₼").
- The bars stay neutral slate. Their height is still the amount against the strip's largest.
- `aria-label="Son ayların məbləğləri"` on the list stays.

**When it renders.** Only on the unfiltered first page (`!year && !month && page === 1`), because only there is
`entries[0]` the object's latest order. When the reader filters or pages, the card and the strip are hidden, and so
is the decision-context fetch.

### 4.4 The counts, each with its period

- **The latest card.** One line under the amount:
  - "{Ay İl} sifarişində: Qiymət yoxdur {m} · Daxili təminat {k}";
  - the words are `missingPriceShortLabel` and `internalSupplyShortLabel` (`pricing/labels.ts:111–112`);
  - "Qiymət yoxdur {m}" is `warningToneClass` (amber), and appears only when m > 0;
  - "Daxili təminat {k}" is `internalToneClass` (slate), and appears only when k > 0;
  - no line at all when both are 0.
  - Nərimanov heykəli, September: "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1".
- **The lifetime line** (`LocationDetailPage.tsx:93–102`) gains a lead that says its period:
  - "Bütün tarixçə ({formatMonthRange([earliestPeriod, latestPeriod])}):";
  - then the existing facts ("Dövrlər", "Sifarişlər", the known-amount fact), "Qiymət yoxdur {n}" (amber, only when
    n > 0), and a new "Daxili təminat {k}" (slate, only when k > 0);
  - Heydər Əliyev's "15" then reads under "Bütün tarixçə (… – …)";
  - when the object has no order, the lead is just "Bütün tarixçə:".
- **Each history row** keeps `missingPriceCount(n)` (amber) under its amount and gains `internalSupplyCount(k)` (slate)
  when k > 0. The row is its own period, so it needs no label.
- **Types.** `api/orders.ts` declares `internalSupplyItemCount: number` on `LocationOrderHistoryEntry` and on
  `LocationOrderHistory`. The backend already sends both, so no backend change. Every fixture that builds these types
  gains the field; `tsc -b` finds them.

## 5. Files — summary for the Coder

Changed (expected), all under `frontend/bax-orders-web/src/`:

- `pages/LocationsPage.tsx` (§4.1);
- `pages/LocationDetailPage.tsx` (§4.2, §4.4);
- `components/locations/LocationTrend.tsx` (§4.3, §4.4);
- `pages/OrderDetailPage.tsx`: the one link, and the prior-months helper call;
- `pages/LocationAnalyticsPage.tsx`: two links only;
- `components/decisions/labels.ts`: the prior-months helper;
- `api/orders.ts`: two type fields;
- `components/dashboard/MissingPriceMark.tsx`, only if moved, and its importers;
- `terminology/terms.ts`, only if a new word belongs there (for example the "Bütün tarixçə" lead or
  "{Ay} sifarişində").

Tests:

- `pages/LocationsPage.test.tsx`;
- `pages/LocationDetailPage.test.tsx` (now also mocks `api/decisions`);
- `components/locations/LocationTrend.test.tsx`;
- `pages/OrderDecisionPage.test.tsx` (the round-trip link);
- `terminology/oldTerms.test.tsx`;
- fixtures gaining `internalSupplyItemCount`.

Not changed:

- anything under `src/` or `tests/` (the backend);
- the dashboard (Task 9), the monthly report (Task 8), the order page's analysis (Tasks 6, 7, 10);
- `components/analytics/labels.ts`, `ComparisonRows.tsx`, `AnalyticsSummary.tsx` (11b);
- `tools/`.

Keep the codebase's idiom: comments say *why*; words come from `src/terminology`, `pricing/labels.ts` or the feature's
`labels.ts`. Rewrite the doc comments whose design changes:

- `LocationTrend`'s header: it no longer compares anything itself;
- the "lifetime counts … nobody decides anything with them" comment at `LocationDetailPage.tsx:87–90`.

## 6. Backend requirements

None. If a requirement seems to need a backend change or a new figure, **STOP** and report why. Do not add one.

## 7. Safety and STOP conditions

- **No access to the real database.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`.
- No data change. HD-002's 94 rows stay untouched.
- No figure changes. The objects list's delta, the history's amounts and counts, and the decision context's figures
  are shown as the backend gives them. The browser computes no comparison.
- Do not rework Tasks 1–10. A defect found there goes into the report.
- Do not start 11b: the comparison page's route, its components and its links' destinations stay as they are, apart
  from the basis they now carry (§4.2).
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 8. Invariants — MUST NOT CHANGE

- Task 1:
  - the basis is in the URL, spelled by `basisParams.ts`;
  - the dashboard's `locationLink` / `orderLink` are unchanged;
  - the order page compares against the URL's basis.
- Task 2:
  - "Qiymət yoxdur" counts only lines somebody owes a price for, and is amber;
  - "Daxili təminat" is slate and never a warning.
- Task 3: 27 objects, full names, the list's sort (Azerbaijani alphabet; no-order objects last).
- Task 5:
  - no LOC code and no version on the object page;
  - "Əvvəlki sifariş — sonradan yenilənib" still tells two orders of one month apart;
  - the columns "Dövr / Məbləğ / Status / (links)";
  - the old-terms sweep stays green.
- Tasks 6–10: the order page's analysis, the dashboard, the monthly report and the product history are untouched.
- Brief "Mütləq qorunmalı":
  - the object page's periods table, with "Sifarişə bax" on every row;
  - "Obyektin sifarişləri" on the order page leads to the object page.
- No backend, schema, migration or data change.

## 9. Acceptance criteria

1. Nərimanov-shaped history (April–September 2026, one order a month): the strip reads "Aprel 2026", "May", "İyun",
   "İyul", "Avqust", "Sentyabr". No label is a three-letter cut, and every slot shows its amount. A gap month is
   labelled with its name, and its amount is "—". A month with a price owed shows "⚠ N". *(brief acceptance 1)*
2. Opened at `/locations/43?basis=avg3`:
   - the decision context of the latest order is requested with `Previous3MonthAverage`;
   - the card shows "Son 3 ayın ortalamasına görə" with the context's delta, coloured by 9.1 with its direction word;
   - the picker shows that basis as chosen;
   - every "Sifarişə bax", period link, "Müqayisə" and "Müqayisə et" carries `basis=avg3`;
   - picking another basis rewrites the URL and refetches;
   - on the order page, "Obyektin sifarişləri" links back with the order page's basis.
   *(brief acceptance 2; "qəbul edir və saxlayır")*
3. The counts:
   - Nərimanov-shaped latest order with 1 owed price and 1 internal-supply line: "Sentyabr 2026 sifarişində: Qiymət
     yoxdur 1 · Daxili təminat 1", amber and slate.
   - Heydər Əliyev-shaped lifetime header with 15 owed prices: "15" sits under "Bütün tarixçə (… – …)".
   - A history row with internal supply shows "{k} sətir daxili təminat (ödənişsiz)".
   *(brief acceptance 3)*
4. Objects list:
   - a +320,40 ₼ delta is `text-red-700` and a −150,00 ₼ delta is `text-emerald-700`, each with the `sr-only`
     direction word, on both the money and the percentage;
   - the header says "Keçən aya görə";
   - a null delta shows "—" with the no-previous-month sentence.
   *(brief acceptance 4; 9.1)*
5. `LocationTrend` computes no difference: it has no subtraction of two entries' amounts, and no "Keçən aya görə"
   from entries. The card and the strip do not render on page 2 or under a year/month filter.
6. Nothing else changed: the backend diff is empty, the comparison page is only re-linked, all suites and both builds
   are green, and the old-terms sweep passes.

## 10. Required tests

Frontend (vitest):

- `LocationsPage.test.tsx`:
  - red/green classes and the `sr-only` word on a positive and a negative delta, on both lines;
  - the header line "Keçən aya görə";
  - the null delta's "—" and its sentence.
  The existing header assertion (`:183`, `['Obyekt', 'Son sifariş', 'Məbləğ', 'Dəyişmə', 'Status', 'Bax']`) changes
  **deliberately**, because the "Dəyişmə" header now also holds the caption. Assert the caption separately rather
  than weakening the list.
- `LocationTrend.test.tsx`:
  - Nərimanov's six months: every full name, with "İyun" ≠ "İyul";
  - an amount on every slot;
  - a gap slot labelled with its month and "—";
  - `⚠ N` on a partial month;
  - at most 12 slots, the highest version per month;
  - the counts line, with both counts, with one, and with none;
  - the comparison line from a supplied context (caption, delta, 9.1 class, word);
  - `emptyWindowNote` when `available` is false;
  - the pending placeholder;
  - no comparison line when the context is null.
  The tests "compares it with the calendar month before it" and "refuses a comparison when the month before has no
  order" are **replaced**. The comparison now comes from the order page's endpoint: the same "Keçən ay" figure, from
  the backend. Assert its "Keçən aya görə" line from a context with `PreviousMonth`, and assert `emptyWindowNote` for
  an unavailable window.
- `LocationDetailPage.test.tsx` (mock `api/decisions`):
  - at `?basis=avg3`, `fetchDecisionContext` is called for the latest order with `Previous3MonthAverage`;
  - the caption, the chosen basis in the picker, and `basis=avg3` on every link listed in criterion 2;
  - picking "Keçən ay" rewrites the URL and refetches with `PreviousMonth`;
  - with no basis in the URL, the page behaves as "Keçən ay";
  - a rejected decision context still renders the card;
  - the lifetime lead "Bütün tarixçə (…)" with "Qiymət yoxdur 15" under it, and "Daxili təminat";
  - a row's internal-supply line;
  - no card or strip on page 2 or under a filter, and no decision-context call then.
  The existing tests stay green: header, table columns, "Əvvəlki sifariş".
- `OrderDecisionPage.test.tsx`: "Obyektin sifarişləri" carries the page's basis.
- `oldTerms.test.tsx`:
  - the object page with the new lines ("Bütün tarixçə", "{Ay} sifarişində", "Daxili təminat", the comparison
    caption) passes `findOldTerms`;
  - no "yaxşı / pis";
  - no three-letter month cut ("İyu", "Avq", "Sen" as a whole word) on the object page.

Existing tests that change **deliberately**: name each in the report with the brief line behind it. Expected:

- the `LocationsPage` header list;
- the two `LocationTrend` month-before tests;
- fixtures gaining `internalSupplyItemCount` (list the files).

No expectation may be weakened to make a test pass.

Backend: no change, so no new test. The suites still run (§11) to show nothing moved.

## 11. Expected verification

- `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` (`tsc -b` is the
  type check) are green. Give the counts; Task 10 had 41 files / 701 tests.
- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `bin`, use `--artifacts-path` into the
  scratchpad. Say so, and do not stop the API.
- `dotnet test BaxOrders.slnx`: all green, and unchanged at Task 10's 826 unit / 683 integration. Paste the summary
  lines.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/`.
- The brief's real figures cannot be read without the real database, which this task does not touch:
  - Nərimanov's strip;
  - "Qiymət yoxdur 1 · Daxili təminat 1";
  - Heydər Əliyev's "15";
  - the dashboard → object page "Son 3 ay" path.
  The fixture tests prove them. Say in the report that the operator should confirm them on the running app.

## 12. Where the brief lands (this part)

| Brief | Here |
|---|---|
| Siyahıda "Dəyişmə" rəngsizdir, bazası yazılmır → rənglidir (9.1) və bazası yazılıb. | §4.1; criterion 4 |
| Mini qrafikdə "İyu İyu"; sütunlarda rəqəm yoxdur → ay adları təkrarlanmır, məbləğlər görünür. | §4.3; criterion 1 |
| Səhifə seçilmiş bazanı qəbul etmir; "Detallara bax" ilə baza itir → qəbul edir və saxlayır. | §4.2; criterion 2 |
| "1 sətir daxili təminat" görünmür; "15" bütün tarixçəyə aid olduğu yazılmır → iki say ayrıca, dövrü ilə. | §4.4; criterion 3 |
| Qəbul edilmiş: Task 2 qaydası; Task 3; baza linkdə (Task 1); 9.1. | §4.1, §4.2, §4.4; §8 |
| Mütləq qorunmalı: dövrlər cədvəli, "Sifarişə bax"; "Obyektin sifarişləri". | §4.2; §8 |
| 11.1 and its three sub-lines; acceptance 5. | **11b** (§3) |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. Task 11 is split into 11a (the objects list and the object page, frontend only) and 11b (the 11.1 merge, which
   needs a backend change and retires a page). Each part is one reviewable diff.
2. The object page shows "the chosen basis" by comparing its **latest order** against that basis, using the order
   page's own decision-context endpoint. The object page, the order page and (for the same month) the dashboard then
   give one figure. An object with no order in the dashboard's month is compared at its own latest month, and the
   card names that month.
3. The object page carries a basis picker, as the order page does, so the reader who arrived with "Son 3 ay" can
   change it there. The prior-months list comes from one shared helper.
4. The objects list keeps its fixed "Keçən ay" figure and says so in its header. The brief asks for the basis to be
   written, not for the list to follow a chosen basis, and the list has no basis of its own to follow.
5. "Keçən ay" in the list means the calendar month before each object's latest order. That is the backend's rule, and
   it is what "Keçən ay" means on every other screen: the month before the month being read.
6. The strip names every month in full with `monthTickLabel` (Task 10's helper), and prints the money under each bar
   in the 2-decimal format (Task 5). A month with a price owed gets Task 9's "⚠ N" so a partial amount never reads as
   whole.
7. The strip covers at most the 12 calendar months ending at the latest order, one slot per month at its highest
   version. Before, 12 *entries* could include two versions of one month.
8. The card and the strip render only on the unfiltered first page, where the first entry really is the latest order.
   Before, page 2 showed an older order as "Son sifariş".
9. Each count names its period in words: "{Ay İl} sifarişində" for the latest order, "Bütün tarixçə (… – …)" for the
   lifetime line. A history row is its own period and needs no label.
10. Every link out of the object page carries the basis, even when the URL had none. `basisSearch` then writes
    "basis=last", which reads the same as no basis.
11. Until 11b, "Müqayisə et" / "Müqayisə" still open the comparison page, now with the basis. 11b repoints them. The
    comparison page's two links back to the object page carry the basis too, so the round trip keeps it in the
    meantime.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 10's commit `47454e6`), `git status --short`, `git diff --stat`.
1. Obyektlər siyahısı — the "Dəyişmə" cell before and after, the header caption, the empty cell.
2. Baza — how the object page reads the basis, where it fetches its comparison, the picker, every link that now
   carries it, and the round trip through the order page and the comparison page.
3. Son sifariş kartı və mini qrafik — the comparison line, the month labels (Nərimanov shape), the amounts, "⚠ N",
   the slots, and when it renders.
4. Saylar — the latest card's line, the lifetime lead, the rows; which period each count belongs to.
5. Testlər — new tests; changed tests and fixtures, each with the brief line behind it; counts; builds.
6. Toxunulmayanlar — no backend or database access, no figure changed, Tasks 1–10 intact, the comparison page only
   re-linked.
7. 11b üçün qeydlər — what 11b inherits: the links to repoint, the helper for prior months, anything found about the
   comparison page.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
