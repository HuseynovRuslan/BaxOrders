# TASK 24 — OBYEKT SƏHİFƏSİ VƏ AYLIQ HESABATA QAYIDIŞ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-24.md` is the owner's settled requirement, with decisions 24.1, 24.2, 24.3 and 24.4 in
`BRIEFS/OWNER_BRIEFS_MASTER.md` (lines 847–852). The brief decides *what* and *why*; this file decides *how*. Where this
file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** Two screens: the location detail page's controls, and the monthly report's return
journey. They share one idea: a reader should not lose their place, and no control should promise something that does
not exist.
Specification status: **READY.** The Product/UX planning agent drafted it on 2026-09-25. The Planner verified §2 on
2026-09-26 against the accepted HEAD `4e6acad` (Task 23) and completed it. §13 records where this file departs from the
draft and why.

This task changes **frontend presentation and navigation only**. It changes no figure, no API and no database. This file
has no `DATA_MIGRATION` marker, on purpose.

---

## 1. Context

The brief's goal: "Obyekt səhifəsi nə üçün olduğunu desin və olmayan imkanı vəd etməsin. Aylıq hesabatdan bir aya girib
qayıdan rəhbər yerini itirməsin."

The two findings belong together because they are the same navigation failure.

- **The location page.** Five controls lead to one place. One of them, `Müqayisə et`, promises an object-to-object
  comparison that the product does not have. The brief says it should not have one either, because object type, area
  and staffing are not business data in this system.
- **The monthly report.** The matrix has the product's best drill-down: one click takes the reader from an odd cell to
  that exact month's decision page. It has the worst way back: Back lands at the top of the matrix.

## 2. Verified current behaviour (repository at `4e6acad`, Task 23's accepted commit)

All paths are under `frontend/bax-orders-web/src/` unless they say otherwise.

### 2.1 The location page: five controls, one destination

`pages/LocationDetailPage.tsx`:

- **The header** (`PageHeader actions`, `:141-157`) holds `Müqayisə et` (`:144-152`), a dark primary `Link` with a lucide
  `TrendingUp` icon (`:1`, `:149`). It points to `orderLink(data.latestOrderRequestId, selection)` and appears whenever
  the object has an order. Beside it is `Obyektlərə qayıt` (`:153-155`), which leads to `/locations`, not to an order.
- **The card.** `LocationTrend` renders only when `latest` exists (`:164-173`). `latest` is the first row of the
  **unfiltered first page** (`:87`). The card's own `Sifarişə bax` is in `components/locations/LocationTrend.tsx`
  (`:90-95`) and points to `orderLink(latest.orderRequestId, selection)`.
- **The table** (`:259-335`) has four columns. The fourth header is empty (`:267`), and the loading and empty rows span
  four columns (`:273`, `:280`). Every period row (`:286-331`) carries **three** links to that row's own order, each
  built with the same `orderLink(request.orderRequestId, selection)`:
  - the period name (`:289-291`), `font-medium text-slate-900 hover:underline`;
  - `Sifarişə bax` (`:315-320`);
  - `Müqayisə` (`:322-328`), with `aria-label` `"{period} dövrünü müqayisə et"` (`:324`).
- **The row** is `<tr className="hover:bg-slate-50">` (`:287`). It changes colour under the cursor but is not clickable,
  which is the same 20.3 breach Task 20 removed from the dashboard table.

**Planner's confirmation (asked for by the draft's §4.1).** The card and the removed header button always open the same
order as the first row. The backend orders both the header's `LatestOrderRequestId` and the page's items by
`RequestPeriod` descending, then `Version` descending: `src/BaxOrders.Application/Orders/LocationOrderQueries.cs`
`:267-269` and `:303-304`. The card is shown only on the unfiltered first page (`:87`). There, `items[0]` is the latest
order, so the card's `Sifarişə bax`, `Müqayisə et` and the first row's links all point at one `href`.

Under a year or month filter, or on page 2, there is no card. There, `Müqayisə et` was the only control that still
reached the latest order. The existing tests (`pages/LocationDetailPage.test.tsx:431-461`) pin this. Removing the
button (24.2) takes that shortcut away; the unfiltered first page still offers the card. See §4.2.

### 2.2 The trend strip is inert, and nothing marks the current month

`components/locations/LocationTrend.tsx`:

- **The slots** come from `stripSlots` (`:206-221`), oldest first. There are at most 12 calendar months (`:32`). The
  strip ends at the latest order's month and starts at the oldest order loaded in that range. The draft's "nine bars" is
  the audit's object, not a fixed number.
  - A month holds its **newest** version (`:214`). This is the same order the row list's newest row opens.
  - A month with no order is `entry: null` (`:220`).
- **Each slot** (`:114-138`) is an `<li>` holding:
  - a bar `<span>` (`:117-129`), `bg-slate-300` for every month alike, or a dashed outline for a gap (`:118`). The bar
    has a `title` (`:124-128`): `"{Month YYYY}: {amount}"`, or `"{Month YYYY}: sifariş yoxdur"` for a gap;
  - the month label (`:131`), from `monthTickLabel`;
  - the amount (`:132-134`);
  - `MissingPriceMark` (`:136`), which is `role="img"` and non-interactive (`components/dashboard/MissingPriceMark.tsx`).
- **There is no `Link` in the strip.** No slot is visually or semantically distinguished; the latest order's month
  looks like every other.
- **The old-terms list forbids the word `trend`** (`test/oldTerms.ts`, `{ name: 'Trend', pattern: /trend/i }`). No new
  visible text or accessible name may contain it.

### 2.3 The monthly report's return journey

The route is **`/dashboard/monthly`** (`App.tsx:33`; menu label `Aylıq hesabat`, `layout/navigation.ts:28`). The draft
called it "the report"; it is not `/reports/...`.

`components/reports/MonthlyReportTable.tsx`:

- **The desktop table** (`MonthlyReportTable`, `:78-176`) is wrapped in `hidden lg:block` (`:84`).
  - Its rows are `LocationRow` (`:178-227`): `<tr className="group">` (`:185`), **with no `id`**.
  - The object name is a `Link` to `/locations/${row.locationId}` (`:191-197`). **This is already correct and does not
    change.**
- **The phone list** (`MonthlyReportYearList`, `:449-484`) is wrapped in `lg:hidden` (`:455`). Its cards are
  `LocationCard` (`:486-520`): an `<li>` **with no `id`**, with the same name link (`:491-496`).
  - Both layouts are in the DOM at once; only CSS hides one.
- **Every filled month, in both layouts, is the one `Cell` component** (`:236-281`, used at `:203` and `:508`).
  - It is a `Link` to `` `/orders/${cell.orderRequestId}` `` (`:265-266`), with no basis and nothing else.
  - Its `title` and `aria-label` come from `describe()` (`:335-359`).
  - An empty or future month is a `<span>` with no link (`:239-260`).
- **The scroll container** exists only below a 1064-pixel window (`max-[1063px]:overflow-x-auto`, `:102`, with the
  reasoning at `:87-101`). At 1366 and 1440 the table fits and nothing scrolls. This is Task 12's accepted behaviour. The
  draft's "~1 197 px wide … no scroll container" is an observation for the operator, not a defect this task owns.

`navigation/useScrollMemory.ts` (Task 9):

- It remembers a position **per history entry**, keyed by `location.key` in `sessionStorage` (`:10`, `:111-127`).
- It records which element a followed link sat in, found by `closest('[id^="attention-"], [id^="row-"]')` (`:13`,
  `:80-87`). It listens on the page's root element, so the root must contain the links.
- It restores **only on a `POP` arrival** (`:32`), once, after `ready` turns true. It scrolls that element into view with
  `{ block: 'center' }`, or falls back to the saved offset (`:94-106`).
- The dashboard wires it with `useScrollMemory<HTMLDivElement>(data !== null)` (`pages/ManagementDashboardPage.tsx:188`)
  and `<div ref={root}>` (`:240`).
- The dashboard's rows carry `` id={`row-${row.locationId}`} `` (`components/dashboard/LocationRows.tsx:99`). Its phone
  rows carry `` id={`row-${row.locationId}-phone`} `` (`:212`), because the table's rows are in the DOM but hidden on a
  phone.

`pages/MonthlyReportPage.tsx`:

- It returns a fragment (`:74-147`). **It does not call `useScrollMemory`** and has no root element, so Back from an
  order lands at the top.
- **The search is already in the URL.** The draft's §2.3 was wrong here:
  - `search` is read from `params.get('search')` (`:29`), and the input starts from it (`:26`);
  - submitting the form (Enter) writes it through `update()` (`:95-99`), which uses `setParams(next, { replace: true })`
    (`:59-70`). Typing alone writes nothing and filters nothing;
  - the fetch is keyed on `year` and `search` (`:35-57`);
  - so a reload, Back and a pasted link already restore a submitted search. This has been so since the page was
    created (`git log -S"params.get('search')"` → `86bc4d8`), and `pages/MonthlyReportPage.test.tsx:232-239` already
    reads `?year=2025&search=meydan` from the URL.
  - What is **not** yet proven is brief acceptance 4 end to end: search, open a cell, Back, and see the text and the
    filtered matrix again. No test does that journey.
- The order page has no control that leads back to the report.

### 2.4 What the cells already explain

A filled cell's `title` and accessible name come from `describe()` (`MonthlyReportTable.tsx:335-359`), for example:
*"Avqust 2026 · 152,60 ₼ · keçən aya görə +86,89 ₼ +132,23%, xərc artıb · Qeyri-adi ay: … · Təsdiqlənib"*. Task 22b
added the historical phrase after `Təsdiqlənib` (`:352-356`). That content is correct and stays. This task changes
neither it nor the cell's visible content.

### 2.5 Why the draft's `from=monthly` cannot be used

`from` already belongs to the basis:

- `analytics/basisParams.ts` reads `from` as a custom range's first month (`:99-100`) and writes it (`:111-121`);
- `normalizeBasis` **deletes** `from` whenever a basis other than a custom range is present (`:159-163`);
- the order page's basis picker copies the query and rewrites `basis`, `from` and `to` with a push
  (`pages/OrderDetailPage.tsx:85-99`);
- `analytics/decisionParams.ts:9-10` says in words that nothing else reads or writes `basis`, `from` or `to`.

So `from=monthly` would vanish the moment the reader chose `Son 3 ay` on the order page, and would be overwritten by a
hand-picked range. This task uses a parameter nobody owns: **`back`** (§4.6).

### 2.6 How the order page already goes Back (Task 19's pattern)

- `openProduct` pushes with `{ state: { productDrawer: true } }` (`pages/OrderDetailPage.tsx:139-144`).
- `closeProduct` goes `navigate(-1)` when the current entry carries that state, and otherwise rewrites the address
  (`:153-170`, `isProductDrawerEntry` `:885-887`).
- `withCause`, `withProduct` and the basis picker all copy every other parameter as they are
  (`analytics/decisionParams.ts:66-76`, `:102-111`; `OrderDetailPage.tsx:89-98`). So an unknown parameter such as `back`
  survives every move within the order page.
- The header's actions render only once the order has loaded (`:296-315`). The error state has its own
  `Obyektlərə qayıt` (`:269-279`).

This task reuses that shape for its back control (§4.6), so the order page has one idiom for "go back to what opened me".

### 2.7 Staleness data (the draft's deferred sub-item)

`LocationOrderHistory` (`api/orders.ts:93-114`) carries the object's **own** `earliestPeriod` and `latestPeriod`
(`:100-101`). It carries **no** system-wide latest period and no `monthsSinceLastOrder`. A line such as "N aydır yeni
sifariş yoxdur" could only be computed against the browser's clock, which the draft forbids, or from a new backend
field, which §6 forbids. **So the staleness line is not added.** It is recorded as deferred (§4.8, final report §7).

### 2.8 Baselines at `4e6acad`

- Frontend: 61 test files / 1286 tests.
- Backend: 1055 unit / 800 integration.
- Both builds are clean. The running API locks `src/BaxOrders.Api/bin`, so the backend is built with `--artifacts-path`
  in the scratchpad (Task 22a, 22b and 23 all did this).

## 3. Scope

In scope:

- A. One link per period row on the location page. The row becomes a Task 20 surface, and its two duplicate buttons and
  its empty column go.
- B. `Müqayisə et` is removed.
- C. The trend strip's filled months link to that month's order, and the latest order's month is distinguished.
- D. The monthly report's rows and phone cards gain the ids `useScrollMemory` already matches, and the page is wired to
  the hook.
- E. The report's search: it is already in the URL as `search`. This task **keeps** it there and proves the Back and
  reload journey with tests. No rename.
- F. An order opened from the report offers one way back to it.
- G. Tests, and the operator's manual pack.

Out of scope:

- the matrix's figures, its anomaly highlighting, its legend, its `title` and accessible-name content (`describe()`), its
  status dots, its `Cəmi` row and its `İl cəmi` column — **Task 08's, and 22b's wording**;
- the matrix's and the phone card's object-name links — **already correct, unchanged**;
- object-to-object comparison of any kind — **owner decision 24.2; the brief does not ask for it**;
- a staleness signal on the location page — **no data for it (§2.7); deferred**;
- the Obyektlər directory (`pages/LocationsPage.tsx`), with its hover-only rows and its `Bax` duplicate
  (`TASKS/TASK-20.md` §12). The brief names the object's own page, not the directory, and says nothing of `Bax`. It
  stays recorded for a later task (§4.8);
- the dashboard — **Tasks 20 and 21's**;
- the order page's other sections — **Tasks 18, 19, 22 and 23's**;
- `useScrollMemory`'s selector and algorithm — reused, not rewritten;
- the monthly report's year select and its `replace: true` behaviour.

## 4. Required behaviour

### 4.1 One link per period row (A; 24.1)

In `pages/LocationDetailPage.tsx`:

- **Remove** each row's `Sifarişə bax` (`:315-320`) and `Müqayisə` (`:322-328`), and the `<td>` that held them
  (`:313-330`).
- **Remove** the empty fourth header (`:267`), and change the loading and empty rows' `colSpan` from 4 to 3 (`:273`,
  `:280`). The table's headers become `Dövr · Məbləğ · Status`.
- **The period name is the row's one link.** It keeps its exact `to={orderLink(request.orderRequestId, selection)}`, with
  the basis included, and its visible text `formatPeriod(request.requestPeriod)`. Its accessible name stays that visible
  text; no `aria-label` is added (assumption 8).
- **The row becomes a Task 20 table-row surface**, as `LocationRows.tsx:99-110` does:
  - `<tr onClick={openSurfaceLink} className={interactiveRowClass}>` replaces `className="hover:bg-slate-50"`;
  - the period link carries `{...surfaceLinkAttribute}` and `` className={`${rowLinkClass} ${interactiveTextClass} font-medium text-slate-900`} ``.
    Its resting look stays `font-medium text-slate-900`. The underline now follows the row's hover and the link's
    focus, instead of the link's own `hover:underline`;
  - nothing else in the row is interactive. The status badge and the `Əvvəlki sifariş — sonradan yenilənib` note are
    plain text, so a click on them opens the row's order.

  This does two things. It stops the hover-only row from breaching 20.3. It also keeps the whole row as the target the
  removed right-hand buttons used to be, so the reader never has to aim at a small word at the far left.
- **The latest-order card keeps its single `Sifarişə bax`** (`LocationTrend.tsx:90-95`), unchanged in text, `href` and
  style. It is the page's primary action, and the reader at the top of the page should not have to go into the table to
  open the current month (assumption 2).

### 4.2 `Müqayisə et` is removed (B; 24.2)

- Delete the `Link` at `LocationDetailPage.tsx:144-152`, its label and the `TrendingUp` import (`:1`). Do not rename it,
  repoint it, disable it or replace it with a tooltip about a future feature.
- `Obyektlərə qayıt` stays where it is, as the header's only action.
- Update the two comments that name the removed control so they no longer describe it:
  - `LocationDetailPage.tsx:84-86`;
  - the doc comment of `latestOrderRequestId` in `api/orders.ts:109-113`. This is a **comment-only** edit; the type and
    the field stay, because the API contract does not change.
- **Consequence, stated rather than hidden.** Under a year or month filter, or on page 2, the button was the only
  control that reached the latest order (§2.1). After this task, the reader reaches it by:
  - clearing the filter (`Filtri təmizlə`), or going to page 1, where the card and the first row lead to it; or
  - opening any row's order and following that page's own links.
  
  That follows directly from 24.2 and is not replaced with anything.

### 4.3 The trend strip navigates (C; 24.4)

In `components/locations/LocationTrend.tsx`, for each slot in the strip:

- **A slot with an order** (`entry !== null`) renders its content inside one `Link`:
  - `to={orderLink(entry.orderRequestId, selection)}`. This is the same `href` shape and basis as the rows and the card,
    and the same newest-version order the month shows (`:214`);
  - its content is the bar, the month label, the amount and `MissingPriceMark`, exactly as today (the heights, the
    `title` on the bar, the label and the amount text are unchanged). The `<li>` stays the list item, and the `Link` is
    its only child;
  - its accessible name is `aria-label` = the bar's existing title text, `` `${formatMonth(period)}: ${formatMoney(entry.knownAmountTotal)}` ``.
    When the month has unpriced lines, it continues with `` ` · ${missingPriceCount(entry.missingPriceItemCount)}` ``,
    so a partial amount is never announced as a whole one (Task 2's rule, and what the mark already says);
  - classes: `group flex flex-col items-center gap-1 ${rowLinkClass}`, a hover background (`hover:bg-slate-50`) and the
    bar darkening under the cursor (`group-hover:bg-slate-400` on a bar that is not the current one). The link is itself
    the target, so it wears its own focus ring (`rowLinkClass`). `interactiveSurfaceClass` is for a surface that
    *contains* its link and does not fit here (assumption 10).
- **A slot with no order** stays inert: no link, no hover, no cursor change, and its dashed outline, `title`, `—` and
  label are unchanged. Wrap its content in a plain `<div className="flex flex-col items-center gap-1">` so both kinds of
  slot have the same shape.
- **The current month is the latest order's month**: the last slot, the month the card above names in
  `Son sifariş · {month}`. It is distinguished like this (assumption 9):
  - its bar is `bg-slate-600` instead of `bg-slate-300`;
  - its month label is `font-semibold text-slate-900` instead of `text-slate-500`;
  - its link carries `aria-current="true"`, so the distinction is not visual only.

  Slate, never red or green: an amount is a sum, not a direction (9.1). The last slot always has an order, because the
  strip ends at the latest order.
- **Nothing else changes.** The bar heights (`:120-123`), `barHeight`, the 12-month window, the gap rule, the labels,
  the amounts, `MissingPriceMark`, the `ol`'s `aria-label` `Son ayların məbləğləri`, the comparison line and the picker
  all stay as they are. No visible text or accessible name contains the word `trend` (§2.2).

### 4.4 The matrix can be returned to (D; 24.3)

- **Row ids, in `components/reports/MonthlyReportTable.tsx`:**
  - `LocationRow`'s `<tr>` (`:185`) gets `` id={`row-${row.locationId}`} ``;
  - `LocationCard`'s `<li>` (`:488`) gets `` id={`row-${row.locationId}-phone`} ``. This is the dashboard's phone
    convention (`LocationRows.tsx:212`): both layouts are in the DOM, so one id each keeps them unique, and Back on a
    phone returns to the card rather than to a hidden table row.
  - Use the existing `row-` prefix. Do not invent a new prefix and do not change the hook's selector.
- **Wiring, in `pages/MonthlyReportPage.tsx`:**
  - `const root = useScrollMemory<HTMLDivElement>(state.status === 'success')`;
  - the page's fragment becomes `<div ref={root}>…</div>`, as the dashboard's is (`ManagementDashboardPage.tsx:240`), so
    the hook's click listener sees the cell links.

  The ready signal becomes true only once the matrix for the returned-to URL has loaded, and the hook restores once.
- **Result.** When Back returns to the report, the row or card whose cell (or name) the reader followed is brought into
  view with `{ block: 'center' }`. If it is gone, for example because the data changed, the saved offset is used.
  Arriving any other way still starts at the top (the hook's own rule).
- `navigation/useScrollMemory.ts` is **not** edited.

### 4.5 The search stays in the URL (E; 24.3)

- The parameter stays **`search`** (§2.3). Do not rename it to `q`. Renaming would break every link and bookmark a
  manager has made since the report existed, for no requirement (assumption 5).
- Its behaviour is unchanged. It is committed on submit with `replace: true`, so typing never fills the history. The
  input starts from the URL, so on Back or reload the text is in the box and the matrix is filtered.
- **No code change is required for E.** What is required is proof: the tests in §10 walk brief acceptance 4 (search,
  open, Back; then reload).
- If the Coder finds that the journey does **not** restore the text or the filter, they fix it in `MonthlyReportPage.tsx`
  and report what was wrong. They do not change the parameter's name. An example of such a failure is the input missing
  a URL change while mounted. The dashboard syncs its input with
  `useEffect(() => setSearchInput(search), [search])` (`ManagementDashboardPage.tsx:101-102`); adding the same line is
  acceptable if a test shows it is needed.

### 4.6 A way back from the order (F; 24.3)

**One small module owns the spelling:** `navigation/monthlyReportReturn.ts` (new). It exports:

- `monthlyReportOrderLink(orderRequestId: number): string` → `` `/orders/${orderRequestId}?back=monthly` ``;
- `monthlyReportOrderState` → `{ monthlyReport: true }`, the history-entry marker;
- `isMonthlyReportEntry(state: unknown): boolean`, the same shape as `isProductDrawerEntry`;
- `openedFromMonthlyReport(params: URLSearchParams): boolean` → `params.get('back') === 'monthly'`;
- `monthlyReportLink(year: number | null): string` → `` `/dashboard/monthly?year=${year}` ``, or `/dashboard/monthly` for
  `null`.

The parameter is `back` and its one value is `monthly`. No other value is read, and any other value shows nothing.

**The report's cell** (`MonthlyReportTable.tsx` `Cell`, `:265-266`) links to `monthlyReportOrderLink(cell.orderRequestId)`
with `state={monthlyReportOrderState}`. There is one `Cell`, so the desktop table and the phone cards both carry it.
Nothing else on the report changes: not the object-name links, the `title`, the `aria-label`, the classes or the content.

**The order page** (`pages/OrderDetailPage.tsx`), when `openedFromMonthlyReport(params)`:

- renders **one** control, `Aylıq hesabat`, preceded by a lucide `ArrowLeft` icon (`aria-hidden`). Its accessible name is
  `Aylıq hesabat`. Its look is the header's existing secondary link, the classes of `Obyektin sifarişləri` (`:307-312`);
- places it first in the header's actions, before the status badge. It is shown whether or not the order has loaded
  yet, and also in the error state beside `Obyektlərə qayıt` (`:269-279`);
- is a real `<Link>` whose `to` is `monthlyReportLink(year)`, where `year` is the order's period year
  (`Number(data.requestPeriod.slice(0, 4))`) once loaded, and `null` before that. A middle click or Ctrl+click opens the
  report in a new tab from a real address;
- on a **plain** click (main button, no modifier, not already handled) on an entry where
  `isMonthlyReportEntry(location.state)`, does `event.preventDefault()` and `navigate(-1)`. This is a real Back:
  - the report returns with its `year` and `search` (§4.5), and its row is brought into view (§4.4);
  - no new history entry is left behind.

  On any other entry, the link simply navigates to the report for the order's year. This covers three cases:
  - a pasted or bookmarked link, or a new tab;
  - the reader has moved within the order page, since a cause chip, the product drawer and the basis picker push
    entries without the marker;
  - the page was reached some other way while still carrying `back=monthly`.

  That fallback is an ordinary arrival, so it starts at the top without the search (assumption 4 states this trade-off).

**Scope of the control:**

- It is absent when `back` is absent. **No other screen sets `back`.** The dashboard, the object page, the approvals
  inbox and the order page's own links to other orders do not carry it.
- It does **not** alter `basis`, `from`, `to`, `cause` or `product`. `back` is copied along by every existing writer
  (§2.6), so the control stays visible while the reader uses the order page.
- It is not a breadcrumb, and it adds no text anywhere else.

### 4.7 Nothing else changes

No amount, percentage, anomaly highlight, legend entry, cell `title` or accessible name of a matrix cell, column, sort,
status badge, or order-page section changes.

### 4.8 Deferred and recorded, not done

- **Staleness line** (`Son sifariş: … · N aydır yeni sifariş yoxdur`): no existing field supports it (§2.7). Recorded
  for a later task, which needs either a system-wide latest period in `LocationOrderHistory` or a
  `monthsSinceLastOrder`.
- **`LocationsPage.tsx`**, the Obyektlər directory, still has the hover-only row (`:156` at `4e6acad`) and two links per
  row (`:158`, `:212-218`), as `TASKS/TASK-20.md` §12 recorded (its line numbers were taken before 22b). It is outside this brief (§3). Record it again in the final report.

## 5. Frontend requirements — summary for the Coder

Changed (expected):

- `pages/LocationDetailPage.tsx` — §4.1, §4.2;
- `components/locations/LocationTrend.tsx` — §4.3;
- `components/reports/MonthlyReportTable.tsx` — ids (§4.4) and the cell's `to` and `state` (§4.6), nothing else;
- `pages/MonthlyReportPage.tsx` — the root and `useScrollMemory` (§4.4), and the search sync only if §4.5's test needs
  it;
- `pages/OrderDetailPage.tsx` — the back control (§4.6);
- `navigation/monthlyReportReturn.ts` — new;
- `api/orders.ts` — one doc comment only (§4.2);
- tests (§10).

Not changed:

- `navigation/useScrollMemory.ts`;
- `components/interaction.ts`, which is reused as it is;
- `analytics/basisParams.ts` and `analytics/decisionParams.ts`;
- the matrix's `describe()`, legend, dots, `MonthTotal`, `YearStrip` and name links;
- `components/dashboard/*`;
- `pages/LocationsPage.tsx`;
- `test/oldTerms.ts`;
- every other `api/*` file, and every figure.

## 6. Backend

None. Links, ids, a query parameter, a history marker and a back control are presentation over data the API already
returns. There is no C# change and no API contract change. The staleness line would need a new field, so it is **not**
added (§2.7). If any other requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change. HD-002's 94 rows are untouched.
- No figure changes anywhere on either screen.
- **Do not build object-to-object comparison** in any form: not a picker, not a placeholder, not a disabled control, not
  a tooltip. If a requirement seems to ask for it, STOP with `BLOCKED_HUMAN`.
- Do not use `from` for the report return (§2.5). Do not read or write `basis`, `from`, `to`, `cause` or `product` in the
  new module.
- Do not change `useScrollMemory`'s selector or algorithm. Supply the ids it already looks for.
- Do not change the matrix's or the phone card's object-name link.
- **Do not nest interactive elements.** Put no `<a>` or `<button>` inside the trend strip's slot link, and nothing
  interactive inside a location-page row besides its one link (Task 20's rule).
- Do not touch screens owned by other tasks (§3, out of scope).
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- Every figure on the location page and in the monthly report, including the `Cəmi` row and the `İl cəmi` column.
- The matrix's anomaly highlighting, its legend, its status dots, and every cell's `title` and accessible name (§2.4;
  Task 08 and 22b).
- The matrix's and the phone card's object-name links to `/locations/{id}`.
- `useScrollMemory`'s selector `'[id^="attention-"], [id^="row-"]'` and its algorithm.
- The dashboard's `row-{locationId}` and `row-{locationId}-phone` ids and `attention-{locationId}`. This task reuses the
  convention on another page; it does not touch the dashboard's.
- Task 20's one-link-per-surface rule, its interaction classes and `openSurfaceLink`.
- Task 1's `basis` (with `from` and `to`) in the URL; Task 18's `cause`; Task 19's `product` and its `productDrawer`
  history marker.
- The report's `search` and `year` parameters, and their `replace: true`.
- The location page's card, its comparison line, its basis picker and the `Obyektlərə qayıt` link.
- Decision 9.1; Task 2's price words; Task 5's (5.1) words; 22a/22b's `OrderStatusBadge` and wording; 23's folded
  `Sətirlər`.
- Decision 11.1 still holds: there is no separate comparison page, and no link to `/analytics` appears.
- The old-terms sweep stays green, and no new text contains `trend`.
- No backend, schema or data change.

## 9. Acceptance criteria

1. On `/locations/{id}`, each period row has exactly one link, on the period name. It points at the same order it pointed
   at before, with the basis. `Sifarişə bax` and `Müqayisə` no longer appear on the rows, the table has three columns,
   and a click on the row's body opens that link. *(brief acceptance 1; 24.1)*
2. `Müqayisə et` does not appear anywhere on the location page, in any form: no text, no accessible name and no icon
   button. The card's single `Sifarişə bax` still opens the latest order with the basis. *(brief acceptance 1; 24.2)*
3. Clicking a filled month in the strip opens that month's order, with the basis. The latest order's month is visually
   distinguished and carries `aria-current="true"`. A month with no order is not a link. Every link can be reached with
   Tab and opened with Enter. *(brief acceptance 2; 24.4)*
4. In the monthly report, a cell is opened and Back is pressed: the row that cell sits in (`row-{locationId}`) is
   brought into view once the matrix is loaded. On the phone layout, it is the card (`row-{locationId}-phone`).
   *(brief acceptance 3; 24.3)*
5. Search `Novxan`, open a cell, press Back: the search box says `Novxan` and the matrix is fetched with
   `search: 'Novxan'`. Reload: the same. The address carries `search=Novxan`. *(brief acceptance 4; 24.3)*
6. An order opened from the monthly report shows `Aylıq hesabat`.
   - On the entry the report opened, the control goes Back, and the report returns with its search and its row.
   - Elsewhere, it links to `/dashboard/monthly?year={order year}`.
   - An order opened from the dashboard or the object page shows no such control. *(brief acceptance 5; 24.3)*
7. No amount, percentage, anomaly highlight, legend entry, status dot, cell `title` or cell accessible name changed on
   either screen. The matrix's object-name link still points at `/locations/{id}`. *(brief acceptance 6)*
8. All suites and both builds are green, and the old-terms sweep passes.

## 10. Required tests

Frontend (vitest). There is **no** `MonthlyReportTable.test.tsx`; the matrix is tested through
`pages/MonthlyReportPage.test.tsx`, and new report tests go there.

- `pages/LocationDetailPage.test.tsx`:
  - each period row has exactly one link: the period, with the expected `href` including `basis`. The row has no
    `Sifarişə bax`, no `Müqayisə` and no `/dövrünü müqayisə et$/` name. The headers are `['Dövr', 'Məbləğ', 'Status']`;
  - a click on a row's amount or status opens that row's order (the row is a surface). Assert the navigation with a
    route stub, as `LocationRows.test.tsx:769-770` does;
  - no element with the accessible name or text `Müqayisə et` exists, with or without an order, under a filter, and on
    page 2;
  - the card's single `Sifarişə bax` still points at the latest order with the basis, and it equals the first row's link
    on the unfiltered first page;
  - no `href` contains `/analytics` (11.1 still holds);
  - the amounts, statuses, the `Əvvəlki sifariş` note and the period list are unchanged.
- `components/locations/LocationTrend.test.tsx`:
  - a filled month renders a link to its order with the basis;
  - that link's accessible name is `"{Month YYYY}: {amount}"`, and continues with `" · N sətirdə qiymət yoxdur"` when
    lines are unpriced;
  - a gap renders no link;
  - only the last slot's link has `aria-current="true"`, and its bar carries the distinguishing class;
  - a corrected month links to its newest version;
  - the bar heights, the labels, the amounts and the bar `title`s are unchanged;
  - the card still has exactly one `Sifarişə bax`.
- `pages/MonthlyReportPage.test.tsx`:
  - every table row carries `id="row-{locationId}"`, and every phone card carries `id="row-{locationId}-phone"`;
  - every filled cell, in both layouts, links to `/orders/{id}?back=monthly`, with no `basis`;
  - the object-name links still point at `/locations/{id}`;
  - the figures, the `Cəmi` row, the `İl cəmi` column and the cells' `title`s and accessible names are unchanged;
  - **coming back:** use the dashboard's pattern (`ManagementDashboardPage.test.tsx:883-972`) — an order-route stub
    with `navigate(-1)` and a stubbed `Element.prototype.scrollIntoView`. Open a cell, go Back, and assert
    `scrollIntoView({ block: 'center' })` was called once on `row-{locationId}`. A fresh arrival restores nothing;
  - **the search through Back and reload:** start at `/dashboard/monthly?search=Novxan`, open a cell, go Back. Assert
    the input's value is `Novxan`, the last fetch had `search: 'Novxan'`, and the URL still has `search=Novxan`. Then
    render the same URL anew (the reload) and assert the same. Also: submitting a new search writes `search` with
    `replace: true`, so the history length does not grow.
- `pages/OrderDecisionPage.test.tsx`:
  - `?back=monthly` with `state: { monthlyReport: true }`, opened from a report stub: `Aylıq hesabat` is shown; a click
    returns to the stub by Back, with no new entry;
  - `?back=monthly` without the state (a pasted link): the control's `href` is `/dashboard/monthly?year=2026` (the
    fixture's year), and a click navigates there;
  - no `back`, or `back=anything-else`: no control;
  - with `back=monthly&basis=avg3&cause=new`, changing the basis or the cause keeps `back`, and the control keeps
    `basis`, `cause` and `product` as they were;
  - the control is present in the error state.
- `navigation/monthlyReportReturn.test.ts` (new): each export's output, and that `isMonthlyReportEntry` is false for
  `null`, `{}` and `{ productDrawer: true }`.
- `terminology/oldTerms.test.tsx`: the location page, report and order page sweeps still pass unchanged.

**Existing tests that change with this task.** Update each and list it in the report with its reason. No expectation
may be weakened to pass. A test of a removed control becomes a test of its absence.

- `LocationDetailPage.test.tsx`:
  - `:197`, the headers → three;
  - `:329-357`, the four `Sifarişə bax`, `Müqayisə et` and the row `Müqayisə` links → the card's one link plus the
    period links;
  - `:401-470`, the `"Müqayisə" opens the order's analysis` block, rewritten as the one-link and no-`Müqayisə et`
    block, keeping its filter, page 2, no-order and no-`/analytics` scenarios;
  - `:483`, which waits for `Sifarişə bax` under a filter where no card exists → wait for the period link.
- `LocationTrend.test.tsx`: the `slots()` helper (`:111-116`) reads `slot.children`. The slot's content now sits one
  level down, inside the link or the `<div>`, so the helper reads from the slot's first element child. This is a helper
  change; its expectations are unchanged.
- `MonthlyReportPage.test.tsx`: the pinned cell `href`s at `:169`, `:319`, `:622`, `:778`, `:830` and `:870` →
  `…?back=monthly`. The check at `:320` (no `basis`) stays.

Backend: none. Run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx --artifacts-path <scratchpad>/artifacts`: 0 warnings, 0 errors.
- `dotnet test BaxOrders.slnx --artifacts-path <scratchpad>/artifacts`: 1055 unit / 800 integration, unchanged from
  Task 23.
- Frontend:
  - `npm run --prefix frontend/bax-orders-web test`: green, with counts (from 61 / 1286; expect one more file for
    `monthlyReportReturn.test.ts`);
  - `npm run --prefix frontend/bax-orders-web build`: clean.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/`, plus the new manual pack under
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

Prepare the pack; do not execute it. It goes in `docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md`, in the form of
`23-menbe-aciilisi.md`: checks `H-01 … H-17`, each result line `---- operator doldurur ----`.

It covers:

- the location page's controls before and after, including under a filter and on page 2 (§4.2's consequence);
- the row surface: hover, focus, and a click on the amount;
- each trend-strip month, including a month with no order, a corrected month, and the latest month's distinction;
  keyboard Tab and Enter;
- the matrix return journey from rows near the top, the middle and the bottom, at desktop width and at `390×844` (phone
  cards);
- the search surviving Back and reload;
- the back control:
  - its Back path, with the row and search restored;
  - its fallback after a cause chip, and from a pasted link;
  - its absence from the dashboard and the object page;
- an object with a single period.

Viewports: `1366×768 · 1440×900 · 390×844 · 1200×800`. At `1366×768`, record whether the matrix scrolls horizontally
(by §2.3 it should not). Screenshots are named `<ID>-<ekran>-<en>.png`. No API restart is needed. State plainly that the
Coder performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Req. 1 / 24.1 — hər dövr sətrində bir keçid | §4.1; criterion 1 |
| Req. 2 / 24.2 — "Müqayisə et" silinsin, adı dəyişdirilməsin | §4.2, §7; criterion 2 |
| Req. 3 / 24.4 — trend sütunları həmin aya aparsın; cari ay fərqlənsin; klaviatura ilə əlçatan | §4.3; criterion 3 |
| Req. 4 / 24.3 — qayıdanda tərk edilən sətrə qayıtsın | §4.4; criterion 4 |
| Req. 5 / 24.3 — axtarış mətni ünvanda qalsın | §2.3, §4.5; criterion 5 |
| Req. 6 / 24.3 — hesabatdan açılan sifarişdə geri keçid | §4.6; criterion 6 |
| Qəbul 6 — heç bir məbləğ, status, dövr siyahısı, rəqəm və rəng dəyişmir | §4.7, §8; criterion 7 |
| Toxunulmayanlar — matris məzmunu, anomaliya, rənglər (08); obyekt adı keçidi; rəqəmlər; 9.1 | §3, §8; criterion 7 |

Every one of the brief's six acceptance criteria lands in §9 (brief 1 → 1 and 2; 2 → 3; 3 → 4; 4 → 5; 5 → 6; 6 → 7).
None is deferred.

**11.1 and 24.1/24.2.** Task 11's brief said `Müqayisə et` opens the latest order's analysis and each row's `Müqayisə`
opens that order's. 24.1 and 24.2 are the owner's later decisions about those same controls, and they remove them. 11.1
itself, "no separate comparison page", still holds and stays pinned (§8, §10). This is the owner changing their own
earlier wording, not a conflict.

## 13. Changes from the draft, with provenance

| Draft said | Repository says (at `4e6acad`) | This file now |
|---|---|---|
| §2.3 / §4.5: the report's search is not in the URL; add `q` | It is in the URL as `search`, with `replace: true`, since `86bc4d8` (`MonthlyReportPage.tsx:26-29`, `:59-70`, `:95-99`) | Keep `search`; prove the journey by tests; no rename (§4.5) |
| §4.6: `from=monthly` | `from` is the basis's custom-range month and is deleted by `normalizeBasis` (§2.5) | `back=monthly` (§4.6) |
| §4.6: the back control uses history | The order page pushes its own entries (cause, product, basis), so one step back is not always the report | Back on the entry the report opened (history marker, Task 19's pattern); otherwise a link to the report's year (§4.6) |
| §2.3: "the report" | The route is `/dashboard/monthly` (`App.tsx:33`) | Named exactly |
| §4.4: give each row `row-{id}` | The phone cards are in the DOM too (`lg:hidden`) | Table `row-{id}`, card `row-{id}-phone`, as the dashboard (§4.4) |
| §10: `components/reports/MonthlyReportTable.test.tsx` | No such file; the matrix is tested in `MonthlyReportPage.test.tsx` | Tests go there (§10) |
| §4.1: the row link's name contains the period and the object | The page title names the object; tests find the link by its visible period | The name stays the visible period (assumption 8) |
| §4.3: `interactiveSurfaceClass` on the bars | That class is for a surface containing its link; the bar's link is the target itself | `rowLinkClass` plus hover (§4.3) |
| §4.3: "the bar for the period the page is showing" | The page shows no single period; the strip ends at the latest order's month | The latest order's month is the current one (§4.3, assumption 9) |
| §2.2: nine bars | Up to 12 slots, from the data | Corrected (§2.2) |
| §4.6 staleness: check the payload | No system latest period or months-since field (§2.7) | Not added; deferred (§4.8) |
| §3: `TASK-20.md` §12's `LocationsPage` notes are "this task's to carry" (PLAN.md) | The brief names the object's page, not the directory | Out of scope; recorded again (§4.8) |
| §11: backend counts "Planner: fill in" | 1055 / 800 at `4e6acad` | Filled (§11) |

---

## Assumptions the Planner made

These are design decisions, not business rules; each can be overturned at review.

1. The period name is the surviving link on each row, because it is the row's subject and it already works. The whole
   row forwards its click to it, as Task 20's dashboard rows do, so removing the right-hand buttons costs the reader no
   target size.
2. The latest-order card keeps its own `Sifarişə bax`. It is the page's primary action, and 24.1 reduces *duplicates in
   the reader's path*. The card sits above the table, not in the same row.
3. `Müqayisə et` is deleted and not replaced, even though under a filter or on page 2 it was the only way to the latest
   order (§4.2). 24.2 says to delete it and not rename it; a replacement shortcut would be the same control under
   another name.
4. The back control goes Back only on the entry the report itself opened. Elsewhere it is an ordinary link to the
   report for the order's year, which lands at the top without the search.
   - The trade-off: after a cause chip or the product drawer, the control loses the reader's search and row. The
     browser's Back still restores both.
   - The alternative was to count or guess history steps, which is fragile. Another was to carry the report's whole
     query inside the order's address, which Task 1's rule of a readable URL argues against.
5. The search parameter stays `search`. It works today, links and bookmarks already use it, and the brief asks that
   the text survive, not that it be renamed.
6. The report reuses the dashboard's `row-` prefix and its `-phone` suffix, so `useScrollMemory` needs no change. The two
   pages never render at once, so the ids cannot collide.
7. The staleness line is not added: no existing field supports it without the browser's clock (§2.7).
8. The row link's accessible name stays the visible period. The page's `h1` names the object, and a label differing from
   the visible text would break "label in name" for voice users.
9. "Cari ay" on the object page is read as the latest order's month: the month the card above names and where the strip
   ends. The page is not tied to a calendar month and must not read the browser's clock. It is marked in darker slate,
   with a bold label and `aria-current`, never in a direction colour.
10. A strip month's link wears its own focus ring (`rowLinkClass`) and a hover background, rather than
    `interactiveSurfaceClass`, because the link is the target itself and not a surface around one.
11. The back control is named `Aylıq hesabat`, the menu's own name for the page, with an arrow icon rather than a `←`
    character, so its accessible name is the page's name alone.
12. The parameter is `back=monthly`: short, readable in the address bar like `basis=avg3`, and owned by no other module.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Obyekt səhifəsi — hansı nəzarət elementləri silindi, hansı qaldı, ünvanların eyni qaldığı, sətrin səthə çevrilməsi.
2. "Müqayisə et" — silindiyinin təsdiqi; obyektlərarası müqayisənin qurulmadığı; filtr və 2-ci səhifədəki nəticə (§4.2).
3. Trend zolağı — keçidlər, son sifariş ayının fərqləndirilməsi, sifarişi olmayan ay, klaviatura.
4. Aylıq hesabata qayıdış — sətir və kart id-ləri, `useScrollMemory`-nin necə qoşulduğu, hook-un dəyişdirilmədiyi.
5. Axtarış — `search` parametri, `replace` davranışı, Back və yeniləmə testləri; kod dəyişdimi, niyə.
6. Geri keçid — `back=monthly`, tarixçə işarəsi, Back yolu və ehtiyat keçid; harada görünür, harada görünmür.
7. Köhnəlmə sətri — data yox idi; təxirə salındı; lazım olan sahə.
8. Testlər — yeni testlər; dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar; build-lər.
9. Əl ilə yoxlama dəsti — fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb; `1366×768`-də üfüqi sürüşmə qeydi.
10. Toxunulmayanlar — rəqəmlər, anomaliya işarələri, leqenda, `title` mətnləri, obyekt adı keçidi, hook, `basis` /
    `cause` / `product`, baza, backend.
11. Sonrakı tapşırıqlar üçün qeydlər — köhnəlmə siqnalı üçün lazım olan data; `LocationsPage`-in Task 20 §12 qeydi;
    ehtiyat keçidin axtarışı itirməsi (fərziyyə 4).

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
