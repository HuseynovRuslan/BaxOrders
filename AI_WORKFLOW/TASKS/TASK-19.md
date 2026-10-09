# TASK 19 — MƏHSUL TARİXÇƏSİ ÇEKMƏCƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-19.md` is the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. If this file and the brief disagree, the brief wins, and the Coder stops and reports.
Owner decisions: **19.1, 19.2, 19.3** (`BRIEFS/OWNER_BRIEFS_MASTER.md`, "Qərar zənciri" addendum).
Part: **one part, not split.** One container change to an existing component, one URL parameter, and their tests.
Specification status: **READY.** The Product/UX planning agent drafted it on 2026-09-25 as `DRAFT — §2 UNVERIFIED`.
The Planner verified it on 2026-09-26 against the accepted HEAD `6456263` (Task 18's commit). §2 now carries
`file:line` evidence. Wherever the draft said something the code does not support, the text is corrected and marked
**Planner correction (2026-09-26)**, with the reason. No draft requirement was dropped. Where one was narrowed, the
correction says why.

This task changes **frontend presentation and interaction only**:
- where the product history appears;
- how it is dismissed;
- that it lives in the URL.

It changes no figure, series, metric, API or database. This file deliberately has no `DATA_MIGRATION` marker.

---

## 1. Context

The brief's goal: "Məhsulun tarixçəsinə baxmaq sifariş qərarından ayrılmaq demək olmasın."

Task 10 built the product history and its three metrics. The content is good, but the container is wrong: a centred
modal covers the comparison the reader is checking against. Browser Back leaves the page entirely. `Escape` has
closed it only since Task 17.

Task 17 wrote the dialog contract. This task applies it and adds the one thing 17 deliberately left out: real URL
state, which makes Back close the panel instead of the page. Task 18 created `analytics/decisionParams.ts`. This task
extends that module and does not start a second URL module.

## 2. Verified current behaviour (repository at `6456263`, Task 18 accepted)

Paths are relative to `frontend/bax-orders-web/src/`.

### 2.1 What exists

- `components/analytics/TrendModal.tsx` (437 lines) renders through `components/imports/review/Modal.tsx`, with
  `title={productHistoryLabel}`, `subtitle`, `width="wide"` and `dismissOnBackdrop` (`TrendModal.tsx`:115–122). It
  fetches `fetchVariantTrend` in an effect keyed on `[locationId, variant.productVariantId, from, to]`
  (`TrendModal.tsx`:84–94).
- The endpoint is location-scoped: `/api/v1/analytics/locations/{locationId}/variants/{productVariantId}/trend`
  (`api/analytics.ts`:101–115).
- `TrendModal.tsx` imports:
  - from `components/analytics/trend.ts` (`TrendModal.tsx`:26–35): `frequencySentence`, `metricLabels`,
    `monthsBetween`, `quantityRatioLine` and `supplierLine`. It does **not** import a type called
    `VariantOrderFrequency` from there; that type comes from `api/analytics.ts` (`TrendModal.tsx`:5);
  - `MissingPriceMark` (:11), `DirectionWord` (:14) and `InfoHint` (:15).
- **Planner correction (2026-09-26): body order.** When data is present, the body order today is
  (`TrendModal.tsx`:133–258):
  1. supplier line (:135);
  2. the comparison the product was opened from. This is `ComparisonDetail` (:137–138, :353–414), with the
     `quantityRatioLine` inside it. Without a driver, only the ratio line appears (:139). It is not a
     "Keçən ay / bu ay" block;
  3. the frequency block, `Frequency` (:141, :300–329): the `frequencySentence` and a facts line;
  4. one row holding the period caption and the metric toggle `Miqdar / Məbləğ / Orta qiymət` with its
     `InfoHint` "Orta qiymət necə hesablanır?" (:143–168);
  5. the lazily loaded chart, `TrendChart` (:170–172);
  6. the amber gaps note "N ay üçün bu obyektin sifarişi yoxdur. Həmin aylar qrafikdə boşluqdur…" (:174–179);
  7. the month table (:183–230);
  8. the collapsed «Mənbə və versiya məlumatı» section (:233–257).
- **Planner correction (2026-09-26): who opens it.** The page opens `TrendModal`, not `DriverList`:
  - each product row in `components/decisions/DriverList.tsx` is one `<button>` covering the whole row
    (:150–179), and it calls `onHistory(driver)` (:152);
  - `pages/OrderDetailPage.tsx` passes `onHistory={setHistory}` (:334);
  - it keeps the open product as local state, `history: DecisionDriver | null` (:133);
  - it renders `TrendModal` only when `history && data` are set (:548–567), with:
    - `from = monthKey(requestPeriod, -11)` and `to = monthKey(requestPeriod, 0)`;
    - `driver={history}`;
    - `quantityRatio` from `decision.primary`.
- `TrendModal` has exactly one production caller, `OrderDetailPage.tsx`:34 and :549. Two test files import it by name:
  `components/analytics/TrendModal.test.tsx`:6 and `terminology/oldTerms.test.tsx`:20 and :1112.
- `Modal.tsx` today:
  - backdrop: `fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4`
    (:142–147);
  - panel: `mt-10 w-full rounded-lg … max-w-3xl` for `wide` (:148–158);
  - the panel is the backdrop's **direct child**. `TrendModal.test.tsx`:141–148 relies on this: it clicks
    `dialog.parentElement`;
  - the contract Task 17 wrote:
    - scroll lock (:60–68);
    - focus in and focus return (:70–97);
    - `Escape` and `Tab` through `useDialogLayer` (:99–118);
    - backdrop press rules (:120–138);
    - `tabStops` / `keepTabInside` (:182–267).
  - `ModalProps` is not exported (:14).
- `components/imports/review/dialogStack.ts`:17–31 holds `useDialogLayer()`.
- `analytics/decisionParams.ts` (75 lines) owns `cause`:
  - `parseCause` (:57–59);
  - `withCause` (:65–75). It returns `null` when nothing would change;
  - the module comment (:3–10) says it owns `cause` "and nothing else".
- The page (`OrderDetailPage.tsx`):
  - owns `cause` (:98–106). `selectCause` pushes (`setParams(search)`, no `replace`);
  - `basisKey` is `basis|from|to` only (:80);
  - the decision context is fetched in an effect keyed on `[id, reloadToken, basisKey]` (:163–177);
  - the order on `[id, search, hasPrice, page, reloadToken]` (:140–151);
  - the revision on `[id, reloadToken]` (:153–159);
  - none of these reads other search parameters.
- `useBasis` (`analytics/useBasis.ts`:13–22) replaces the URL only to rewrite an old basis spelling.
- The router is `<BrowserRouter>` (`main.tsx`:16). There is no `ScrollRestoration`. `react-router` is `^7.18.3`,
  whose `setSearchParams(next, { replace?, state? })` carries navigation state.
- The layout:
  - fixed sidebar `w-64` from `lg` (`layout/Sidebar.tsx`:26), with content `lg:pl-64`;
  - main `mx-auto max-w-7xl px-4 … lg:px-8` (`layout/AppLayout.tsx`:13, :17);
  - the order page's first grid puts the headline in columns 1–2 of 3 from `lg` (`OrderDetailPage.tsx`:250–251);
  - in `DecisionHeadline.tsx`, the amount (:68–71) and the `Baza` / `Fərq` row (:125–139) are left-aligned. The
    `BasisPicker` (:106–111) is a wrapping row of five buttons (`BasisPicker.tsx`:64–85).
- `InfoHint`'s note is `position: fixed`, `z-[60]` (`InfoHint.tsx`:97, :114). It closes on any scroll through a
  capture listener on `window` (:65–66).

### 2.2 `VariantOrderFrequency`: already computed

`api/analytics.ts`:72–86 returns these fields per product:
- `availableMonthCount` ("Months the location has a request for. The denominator.");
- `orderedMonthCount`;
- `firstOrderedPeriod`, `lastOrderedPeriod`;
- `monthsSinceLastOrder`;
- `intervalsInMonths`;
- `typicalIntervalMonths`, `shortestIntervalMonths`, `longestIntervalMonths`.

`frequencySentence` (`components/analytics/trend.ts`:58–69) already turns them into the brief's own words. With
`orderedMonthCount === 1` it gives exactly "Son N ayın 1-də sifariş edilib" (`locativeSuffix(1)`,
`terminology/terms.ts`:209–217). §4.4 and §4.5 need no new calculation.

`VariantTrendPoint.quantity` is "Zero when the location ordered that month without this variant"
(`api/analytics.ts`:55). This is why a product ordered in a single month draws as a row of zeros and one spike.

### 2.3 What is wrong

- **Planner correction (2026-09-26):** since Task 17, `Escape` **does** close it (`Modal.tsx`:106–110), and so does
  a press on the background. The draft's "Escape did not close it" was true only before Task 17.
- Browser Back with it open leaves the order page. The open product is component state (`OrderDetailPage.tsx`:133),
  not an entry in the history, so Back discards the whole drill-down. The draft observed this on the running
  application as `/orders/154` → `/dashboard`. The order ID is the draft's example and was not checked here.
- It is centred (`items-start justify-center`) and `max-w-3xl` (768 px) wide, over a `bg-slate-900/50` scrim
  (`Modal.tsx`:143, :156). It covers the headline the reader is comparing against.
- A product ordered in exactly one month (the brief's example is `Ağac dirəyi metal`, Sentyabr 2026) gets a chart of
  zero points and one spike (§2.2). The chart carries no information.

## 3. Scope

In scope, on the order page only:

- A. the product history moves from a centred modal to a right-hand drawer, full-screen on narrow widths;
- B. the open product lives in the URL, and Back closes it;
- C. it inherits Task 17's contract (`Escape`, focus, backdrop dismissal) and does not define its own;
- D. the frequency sentence moves above the chart;
- E. a single-month product shows a sentence instead of a chart;
- F. tests and the manual pack.

Out of scope:

- the trend figures, the three metrics, the weighted-average hint, the month table, the supplier line (**Task
  10's**);
- the dialog contract itself (**Task 17's**). §4.1 adds a placement to it and changes no behaviour;
- the cause filter and the chips (**Task 18's**);
- company-wide product analytics and cross-location price comparison (**deferred, TASK-26**);
- a per-row frequency badge in the change list (**deferred, TASK-25**; it needs a field the list response does not
  carry);
- the source dialog, `ItemSourceDrawer`, and the raw line table (**Task 23's**). «Mənbə» stays a centred `Modal`;
- variant transitions (13.1a), untouched;
- any other screen that could open a product history later.

## 4. Required behaviour

### 4.1 A drawer that is Task 17's dialog, placed on the right (A, C)

**Planner correction (2026-09-26): how the drawer shares the contract.** The draft asked for a new `Drawer.tsx`
"sharing" `Modal`'s contract without editing `Modal`. At HEAD that contract is about 200 lines inside `Modal.tsx`
(§2.1). A separate component could share it only by copying it. That would be a second implementation of Task 17's
contract, which the ownership rule forbids ("17 writes the dialog contract; 19 and 23 apply it", `PLAN.md`,
decision-chain section). So:

- **`Modal.tsx`** gains one prop, `placement?: 'center' | 'right'`, which defaults to `'center'`.
  - With `'center'`, every element, attribute and class string it renders is **byte-identical to HEAD**. The other
    22 dialogs cannot tell the difference.
  - `'right'` changes only three class strings: the backdrop's, the panel's and the body wrapper's. It adds no
    behaviour. The same scroll lock, `useDialogLayer`, `Escape`, `Tab` trap, focus in and focus return,
    `aria-labelledby` / `aria-describedby` and backdrop-press rules run unchanged.
  - Export `ModalProps`, so the wrapper below can type itself.
- **New `components/imports/review/Drawer.tsx`**: `export function Drawer(props)`, which renders
  `<Modal {...props} placement="right" />`. It is the named primitive that Task 23 can reuse. It takes every
  `Modal` prop except `width` and `placement`. It sets no default for `dismissOnBackdrop`. The caller passes it, so
  the number of call sites with `dismissOnBackdrop` stays three (`TrendModal`, `ItemSourceDrawer`,
  `RowDetailDialog`, as in Task 17's review).

The `'right'` layout:

- **Backdrop:** `fixed inset-0 z-50` with a flex layout that puts the panel against the right edge, and a **light
  scrim, `bg-slate-900/20`**, so that the figures behind it stay readable (brief acceptance 1). The backdrop does not
  scroll, and it has no padding. It stays the panel's **direct parent**, so the backdrop-press rules and
  `TrendModal.test.tsx`:141–148 keep working unchanged.
- **Panel** (`role="dialog"`): full viewport height, with a left border, a shadow and no rounded outer corners.
  - Width is `100%` below the `sm` breakpoint (full-screen), and `560px` from `sm` up, which is `min(560px, 100vw)`
    in effect.
  - It is a column: the existing header with its title, subtitle and «Bağla» × stays at the top and never scrolls
    away.
  - The body scrolls inside the panel (`overflow-y-auto overscroll-contain`). The page behind does not scroll,
    because the existing scroll lock applies.
- **No `transform`, `translate` or slide-in animation on the panel or its ancestors.** A transform would become the
  containing block for `InfoHint`'s `position: fixed` note (§2.1) and would clip or misplace it. Opening is instant,
  as it is for every dialog today.
- The footer slot renders as it does in `Modal`. The product history does not use it.

`dismissOnBackdrop` stays `true` for the product history. It is a read-only window (17.2).

**Name:** keep `TrendModal.tsx` and the `TrendModal` export. Two test files import the name (§2.1). The draft allowed
a rename only if nothing depended on it. The report says so.

### 4.2 The decision context stays visible (A)

From a `1280px`-wide viewport up, the open drawer must not cover the order headline's **amount, `Baza` and `Fərq`**.
They stay readable beside it, behind the light scrim. Below `1280px` the drawer may overlap them, and below `sm` it is
full-screen.

Do not restyle the page behind the drawer to achieve this. The page is not re-laid out to make room for the drawer.

Evidence for the threshold, from the layout in §2.1:
- at `1280`, the headline's text starts at about x = 309 px and the drawer at x = 720 px;
- at `1440`, the drawer starts at x = 880 px;
- the amount and the `Baza` / `Fərq` row are left-aligned and about 350 px wide.

The operator confirms this at `1280`, `1366`, `1440` and `1200` (§11).

**Planner correction (2026-09-26): the basis picker.** The draft also listed "the basis picker" as staying readable.
Its five buttons form a wrapping row about as wide as the headline column (`BasisPicker.tsx`:64–85). At 1440 px only
about 570 px is left of a 560 px drawer. So the picker cannot be guaranteed without restyling the page, which this
section forbids. The brief names only the amount, `Baza` and `Fərq`. The picker is therefore "visible where it
fits", and the operator records what is covered. While the drawer is open the picker cannot be used anyway: the
dialog is modal.

The shared scroll lock (Task 10) hides the page scrollbar while any dialog is open. Where the operating system draws
classic scrollbars, the page therefore shifts by the scrollbar's width. This is pre-existing for every dialog and is
not this task's to change. Do not add `scrollbar-gutter` or any other global style. The operator records it.

### 4.3 URL and history (B)

Extend `analytics/decisionParams.ts` (Task 18's module) with one parameter, `product`, which carries the
`productVariantId`. Update the module comment (:3–10) to say that it owns `cause` and `product`.

```ts
export function productParam(search: URLSearchParams): number | null
export function withProduct(search: URLSearchParams, id: number | null): URLSearchParams | null
```

**Planner correction (2026-09-26):** `withProduct` returns `URLSearchParams | null`, not `URLSearchParams`. It
returns `null` when the result would equal the current query string, exactly as `withCause` does. Task 18's rule is
"nothing is pushed when nothing changes" (`CURRENT_TASK.md`; Task 18 `LAST_REPORT.md` §8).

- `productParam` accepts only a string of ASCII digits (`/^\d+$/`) whose value is a positive safe integer. Anything
  else returns `null` and never throws. That includes an absent value, `''`, `abc`, `0`, `-3`, `1.5`, `1e3`, ` 12`
  and a number too large to be a safe integer. Unlike `cause`, an unrecognised value is **left in the address**, and
  the next product opened replaces it.
- `withProduct(…, id)` sets `product` and keeps every other parameter as it was. `withProduct(…, null)` removes it.

**On the page** (`OrderDetailPage.tsx`). Remove the `history` state (:133). Then:

- **Which product is open** is derived and never stored:
  - `productParam(params)`, looked up by `variant.productVariantId` in `decision.decomposition.drivers`, then in
    `decision.decomposition.steady`;
  - the lookup ignores the current `cause`. A link to a product opens it whatever list is showing;
  - the drawer renders only when both `data` and that driver exist. It keeps the props it has today (:549–566), with
    `driver` as the driver found;
  - an unknown ID, a non-numeric value, or a decision context that failed to load, renders the page with no drawer
    and does not throw.
- **Opening** is `openProduct(driver)`, which is passed as `DriverList`'s `onHistory` (:334).
  - It calls `withProduct(params, driver.variant.productVariantId)`.
  - When the result is not `null`, it calls `setParams(next, { state: { productDrawer: true } })`. That is a
    **push**: no `replace`.
  - The state marker records that this page pushed the entry.
- **Closing** is `closeProduct()`, which is passed as the drawer's `onClose`. `Escape`, «Bağla» × and a backdrop
  press all reach it.
  - If the current location's state carries `productDrawer: true`, the entry was pushed by `openProduct`. Close with
    `navigate(-1)`. Closing is then exactly what Back does, and it leaves no extra entry. A later Back therefore
    leaves the page (brief acceptance 2).
  - Otherwise the drawer was reached by a pasted link, a new tab, or an old-spelling basis that `useBasis` rewrote.
    Close with `setParams(withProduct(params, null), { replace: true })`. The product disappears without adding an
    entry, and Back then goes wherever it went before the link.
  - **Guard against a double close.** A second `closeProduct` for the same location must do nothing, for example
    Escape and a backdrop press before the pop has landed. A browser's pop is asynchronous, and two `navigate(-1)`
    calls would leave the page. Use a ref keyed on `location.key`.
- **Browser Back** with the drawer open pops to the entry without `product`. The drawer closes and the order page
  stays where it was. A second Back leaves the page.
  - Back undoes the history first and the filter second, because both are pushes (Task 18 `REVIEWS/TASK-18.md`,
    "Notes carried forward").
- **Opening and closing never change the other parameters.** `basis`, `from`, `to` and `cause` are untouched.
  `product` is **not** added to `basisKey` (:80). So opening or closing re-fetches neither the decision context, nor
  the order, nor the revision (§2.1 dependency lists).
- **A deep link** such as `/orders/154?basis=avg3&cause=new&product=812` opens:
  - the order on the 3-month basis;
  - with the «Yeni məhsullar» chip and its reason pressed;
  - with that product's drawer open once the order and the decision context have loaded.

  Links out of the page (`orderLink`, `locationLink`, `pricingReviewLink`) still carry only the basis. They do not
  carry `product` or `cause`. This is how Task 18 left them, and it does not change.
- **Focus.**
  - Opened by a click, the drawer's opener is the row's button. `Modal` reads the opener at its first render
    (`Modal.tsx`:52), and URL-driven opening does not change what that is.
  - On close, focus returns to that row, **including when the list is filtered by `cause`**. The filter does not
    change, so the row is still rendered. This is the check `CURRENT_TASK.md` carries over from Task 18.
  - Opened by a deep link, there is no opener, and focus is not returned anywhere. That is Task 17's rule and needs
    no change.
- **Task 17's note** ("open any inner dialog on a later render, not in the same commit as its parent"). The drawer
  contains no inner `Modal`; its `InfoHint` is not a dialog. On a deep link the drawer mounts on the render after
  data arrives. Nothing is opened in the same commit as a parent dialog. Keep it that way. Do not put the source
  dialog or any other `Modal` inside the drawer.

### 4.4 The frequency sentence first (D)

Move the existing `Frequency` block to the first position in the drawer's body. It goes directly under the product
identity (the header's title and subtitle) and before the supplier line, the comparison, the period and toggle row,
and the chart.

Use `Frequency` and `frequencySentence` exactly as they are: no new wording, no new calculation. Its facts line
(first / last order, months since, interval) moves with it.

Everything else keeps its order relative to the rest: supplier line → comparison → period and toggle → chart → gaps
note → table → «Mənbə və versiya məlumatı».

When `Frequency` renders nothing (`availableMonthCount === 0`, `TrendModal.tsx`:301–303), the body starts with the
supplier line, as it does today.

### 4.5 A single-month product gets a sentence, not a chart (E)

**Planner correction (2026-09-26): the helper is named.** The sentence is `frequencySentence`
(`components/analytics/trend.ts`:58–69). With `orderedMonthCount === 1` it already reads "Son N ayın 1-də sifariş
edilib", the brief's own example. **No helper is added to `trend.ts`, and no new wording is added.** After §4.4 it is
the first statement in the drawer.

When `trend.frequency.orderedMonthCount === 1`, and on nothing else (not the shape of the series, not a threshold):

- **omit** the chart (`TrendChart` and its `Suspense`, :170–172);
- **omit** the three metric buttons, `Miqdar / Məbləğ / Orta qiymət` (:151–165);
- **omit** the amber gaps note (:174–179). It speaks about the chart ("Həmin aylar qrafikdə boşluqdur") and there is
  no chart. The table's own «sifariş yoxdur» rows (:202–206) still say which months had no request;
- **keep** the frequency block, the supplier line, the comparison, the period caption (:144–148), the weighted-price
  `InfoHint` «Orta qiymət necə hesablanır?» (:166), the month table with every figure, and the collapsed source
  section.
  - The hint also explains the table's price column, so it stays. It sits in the same row it sits in today.

Do not invent a predictive or judgemental label: no "unusual", no "first of many", no forecast.

When `orderedMonthCount !== 1` everything renders as today, apart from §4.4's move. That covers 0, and 2 or more.

### 4.6 Nothing else moves

These keep their content and their order relative to one another:
- the figures;
- the comparison block;
- the three metrics;
- the weighted-average hint;
- the month table's columns;
- `MissingPriceMark`;
- the supplier line;
- the collapsed source section.

`metric` still starts at `'amount'` for a service and at `'quantity'` otherwise (:82).

## 5. Frontend requirements: summary for the Coder

Expected changes:
- `components/imports/review/Modal.tsx`: the `placement` prop and the exported `ModalProps` (§4.1). The `'center'`
  output stays byte-identical;
- new `components/imports/review/Drawer.tsx`;
- `components/analytics/TrendModal.tsx`: `Drawer` instead of `Modal`, the body order (§4.4), the single-month branch
  (§4.5). Not renamed;
- `analytics/decisionParams.ts`: `productParam`, `withProduct` and the module comment;
- `pages/OrderDetailPage.tsx`: the derived product, `openProduct`, `closeProduct`, and removing `history`;
- tests (§10) and the manual pack (§11).

**Planner correction (2026-09-26):** `components/decisions/DriverList.tsx` does **not** change. Its `onHistory(driver)`
callback stays as it is; only what the page passes to it changes. The draft had listed it as "opens by URL instead
of local state", but the local state lives in the page (§2.1).

Not changed:
- `api/analytics.ts`, `components/analytics/trend.ts`, `TrendChart.tsx`;
- `dialogStack.ts`, `InfoHint.tsx`;
- `DriverList.tsx`, `CauseSummary.tsx`, `causeFilter.ts`;
- `basisParams.ts`, `useBasis.ts`;
- `ItemSourceDrawer.tsx` and every other dialog's call site;
- every other screen.

## 6. Backend

None. The trend endpoint, its parameters and its payload are unchanged. There is no C# change and no API contract
change. If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change. HD-002's 94 rows are untouched.
- No figure changes. Every quantity, price, amount, month and supplier stays exactly what the API returns.
- Do not add a second URL module; extend Task 18's.
- Do not redefine dismissal or focus. The drawer *is* Task 17's `Modal`, placed differently (§4.1).
- If `'center'` output of `Modal` cannot stay byte-identical, **STOP** and report why.
- Do not touch screens owned by later tasks (§3, out of scope).
- Do not commit, push or merge. Under `AI_WORKFLOW/`, edit only `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, STOP with `BLOCKED_HUMAN` and say which line.

## 8. Invariants: MUST NOT CHANGE

- Every figure in the product history: the comparison block, the ratio line, the chart series, the month table and
  the supplier.
- The three metrics and the weighted-average explanation (Task 10).
- `frequencySentence`'s wording; `MissingPriceMark`; Task 2's price words.
- Task 17's contract: `Escape`, focus trap, focus return with `preventScroll`, the dialog stack, and the scroll-lock
  restore.
- For every other dialog, `Modal`'s markup and classes (`placement` defaults to `'center'`).
- Task 18's `cause` parameter, its push semantics and its `null`-for-no-change rule. Task 1's `basis` / `from` / `to`
  parameters. All of them survive opening and closing the drawer.
- Links out of the order page carry the basis only.
- Decision 9.1 and its words; decision 5.1's terms («Məhsul tarixçəsi», «Yeni məhsullar»).
- The old-terms sweep stays green.
- No backend, schema or data change.

## 9. Acceptance criteria

1. On the order page a product row is clicked. The history opens as a right-hand drawer. At `1440×900` the amount,
   `Baza` and `Fərq` remain readable beside it. *(brief acceptance 1; 19.1)*
2. `Escape` closes the drawer and the page stays where it was. After an in-page open, a following Back leaves the
   page: `Escape` added no entry. *(brief acceptance 2)*
3. With the drawer open, browser Back closes it and stays on the order page. A second Back leaves the page. *(brief
   acceptance 2; 19.2)*
4. After opening and closing the drawer, by any route, the comparison basis and the selected cause are unchanged.
   *(brief acceptance 3; 19.2)*
5. `/orders/<id>?basis=avg3&cause=new&product=<variantId>` opens the order on the 3-month basis, with «Yeni
   məhsullar» selected and that product's drawer open. Closing it removes only `product`, without a new entry.
   *(brief acceptance 4)*
6. The frequency sentence is rendered above the supplier line, the metric toggle and the chart. *(brief tələb 4)*
7. A product with `orderedMonthCount === 1` renders:
   - the frequency sentence;
   - the month table with its figures;
   - the weighted-price hint;
   - **no chart, no metric toggle, and no gaps note**.
   Any other count renders the chart and the toggle. *(brief acceptance 5; 19.3)*
8. Opening and closing the drawer issue no new request for the order, its revision or its decision context. *(brief
   acceptance 6)*
9. At `390×844` the drawer is full-screen, and the close control is reachable without horizontal scrolling. *(19.1;
   §4.1)*
10. An unknown or non-numeric `product` renders the page with no drawer and no error. When the history is opened from
    a filtered list, focus returns to its row on close. *(§4.3)*
11. No figure changed, and every other screen and dialog is unchanged. All suites and both builds are green, and the
    old-terms sweep passes.

## 10. Required tests

Frontend (vitest). The existing idioms are: the `Search` address probe and the `Back` probe (`navigate(-1)`) in
`pages/OrderDecisionPage.test.tsx`:1633–1642, and `MemoryRouter` with `initialEntries`.

- **New `components/imports/review/Drawer.test.tsx`**:
  - it renders `role="dialog"` with `aria-modal`, named by its visible title and described by its subtitle;
  - `Escape` calls `onClose` once, and only the topmost dialog closes;
  - focus goes to «Bağla» on open and returns to the opener with `{ preventScroll: true }` on close;
  - `Tab` stays inside;
  - with `dismissOnBackdrop`, a press on the backdrop (`dialog.parentElement`) closes it; without it, a press does
    not;
  - the body scroll lock is set and restored;
  - the backdrop is the panel's direct parent;
  - the panel is right-anchored, full-screen below `sm` and `560px` from `sm`, and neither the panel nor the backdrop
    has a `transform` / `translate` / `animate` class.
- **`components/imports/review/Modal.test.tsx`** *(extend)*: with no `placement`, the backdrop's, panel's and body's
  class strings equal HEAD's exactly. Pin the strings in the test. Every existing test passes unchanged.
- **`analytics/decisionParams.test.ts`** *(extend Task 18's file)*:
  - `productParam`: `812` → `812`; absent, `''`, `abc`, `0`, `-3`, `1.5`, `1e3`, ` 12` and an unsafe integer each
    give `null` and do not throw;
  - `withProduct` sets, replaces and removes the parameter, and returns `null` when nothing changes;
  - `basis`, `from`, `to`, `cause` and `period` are preserved in both directions;
  - `withCause` preserves `product`.
- **`components/analytics/TrendModal.test.tsx`**:
  - the frequency sentence comes before the supplier line and before the «Göstərici» toggle group in DOM order
    (`compareDocumentPosition`);
  - `orderedMonthCount === 1`, with a fixture shaped like the brief's single-month product (one ordered month among
    zero-quantity months):
    - no `chart` test id;
    - no `Miqdar / Məbləğ / Orta qiymət` buttons;
    - no gaps note;
    - the sentence `Son 9 ayın 1-də sifariş edilib`;
    - the month table with that month's quantity, price and amount;
    - the «Orta qiymət necə hesablanır?» hint present;
  - `orderedMonthCount > 1`: chart and toggle present, and all three metrics selectable (two for a service);
  - the comparison figures render exactly as given, as today.
- **`pages/OrderDecisionPage.test.tsx`**:
  - clicking a product row writes `product=<id>`, keeps `basis`, and opens the drawer;
  - `Escape` removes `product` and keeps `basis` and `cause`. With `initialEntries={['/elsewhere', url]}`, a
    following `Back` then leaves the page, which proves no entry was added;
  - with the drawer open, `Back` removes only `product` and leaves `basis` and `cause`. A second `Back` leaves the
    page;
  - a deep link `?basis=avg3&cause=new&product=<id>` opens:
    - with the basis button pressed;
    - with «Yeni məhsullar» pressed;
    - with the drawer open and the product in its description.

    Closing it (`Escape`) leaves `basis=avg3&cause=new` and **no** `product`. A following `Back` then goes to the
    entry before the link, which proves `replace`;
  - `product=999999` and `product=abc` give no dialog, no error, and the page's figures;
  - opened from `?cause=new`, `Escape` returns focus to the new product's row, and the list stays filtered;
  - across open and close, `fetchDecisionContext`, `fetchOrder` and `fetchRevision` are each called the same number
    of times as before opening;
  - the double-close guard: two closes before the pop lands leave the page on the order. Do this only if it can be
    driven deterministically in jsdom, for example two `fireEvent.click`s on «Bağla» inside one `act`. Otherwise say
    so in the report and leave it to the manual pack.
- **`terminology/oldTerms.test.tsx`**: the existing product-history sweeps (:1093–1126) pass. Add a case that opens
  the drawer through `?product=` and sweeps it.
- **Existing tests that change**, if any, are listed each with its reason. No expectation may be weakened to pass.
  - Expected: none. The dialog keeps its role, name, description and backdrop-parent structure.
  - The existing Escape and focus test (`OrderDecisionPage.test.tsx`:1591–1605) must pass as it is.

Backend: none. Run both suites to prove that nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `bin`, build with `--artifacts-path`
  in the scratchpad, as Tasks 17 and 18 did, and say so. Do not stop the API.
- `dotnet test BaxOrders.slnx`: unchanged from Task 18's accepted totals, **1046 unit / 785 integration**.
- Frontend `npm run --prefix frontend/bax-orders-web test`: green, from **56 files / 1047 tests** at HEAD, with the
  new counts stated. `npm run --prefix frontend/bax-orders-web build` (`tsc -b` then `vite build`): clean.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/` and the manual pack under
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

Prepare the pack, but do not run it: `docs/audits/2026-qerar-zenciri/19-mehsul-cekmecesi.md`, beside the 17 and 18
packs.

- **Format:** checks `C-01 … C-16` in the same twelve-line form. Every result line reads
  `---- operator doldurur ----`. Everything is read-only on real data, and no write button is pressed.
- **What to cover:**
  - open and close by click, by `Escape`, by «Bağla» and by backdrop;
  - browser Back once and twice, and Back after `Escape`;
  - basis and cause preserved;
  - the deep link, a pasted link in a new tab, and a reload with the drawer open;
  - a single-month product (the brief's `Ağac dirəyi metal`, Sentyabr 2026; the operator finds its order) and a
    many-month product;
  - focus return from a filtered list;
  - the ⓘ note inside the drawer;
  - the headline's readability beside the open drawer.
- **Viewports:** `1366×768 · 1440×900 · 390×844 · 1200×800`. Also record `1280×800`, the threshold of §4.2. At
  `1200×800`, record whether the headline is covered. Record whether the basis picker is covered, and any
  scrollbar shift (§4.2).
- **Screenshots:** `<ID>-<ekran>-<en>.png` in `docs/audits/2026-qerar-zenciri/ekranlar/`.
- State plainly that the Coder performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| A drawer that opens from the right; the decision context stays visible; full-screen on a narrow screen. | §4.1, §4.2; criteria 1, 9 |
| It stays in the URL; Back closes the drawer first; `Escape` closes it too. | §4.3, §4.1; criteria 2, 3, 5 |
| The basis and the cause do not change. | §4.3; criterion 4 |
| The frequency sentence comes before the chart. | §4.4; criterion 6 |
| A product ordered for the first time gets a sentence, not a chart. | §4.5; criterion 7 |
| The existing calculation is used, and no new one is made. | §2.2, §4.5; §8 |
| Acceptance 4: a shared address opens the same drawer on the same order with the same basis. | §4.3; criterion 5 |
| Acceptance 6: opening the drawer does not reload the order's data. | §4.3; criterion 8 |
| Untouched: the history's figures, the metrics, the "Orta qiymət" note, the collapsed source section, the 9.1 colours. | §4.5, §4.6, §8 |

---

## Assumptions the Planner made

These are design decisions, not business rules, and each can be overturned at review. Items marked *(draft)* come
from the planning agent's draft. Items marked *(Planner, 2026-09-26)* were added or changed while verifying the
draft.

1. *(Planner, 2026-09-26; replaces the draft's "a new `Drawer` beside `Modal`, not a variant prop")* The drawer is
   `Modal` with `placement="right"`, wrapped as `Drawer`.
   - A separate component would copy Task 17's contract, and the ownership rule forbids a second implementation.
   - The draft's worry was the risk to fifteen or more other dialogs. That risk is removed by requiring the
     `'center'` output to be byte-identical and pinning it in a test.
2. *(draft)* `560px`, with `1280px` as the threshold from which the amount, `Baza` and `Fərq` must stay visible. Both
   are presentation choices. What matters is that at `1440×900` the reader can see the comparison while reading the
   history.
3. *(Planner, 2026-09-26)* A light scrim, `bg-slate-900/20`, instead of `Modal`'s `/50`, so the figures behind the
   drawer are readable and not merely present.
4. *(draft)* Opening pushes, so Back closes the drawer. Each product opened adds one history entry; that is the
   point.
5. *(Planner, 2026-09-26)* Closing after an in-page open is `navigate(-1)`, recognised by a `productDrawer` state
   marker. Closing after a deep link is a `replace`. Either way `Escape`, «Bağla» and the backdrop leave no stray
   entry, and "a second Back leaves the page" stays true after any close.
6. *(Planner, 2026-09-26)* The open product is looked up among `drivers`, then `steady`, and ignores the current
   `cause`. An unknown value stays in the address and is ignored, as an unknown `cause` is.
7. *(draft)* The single-month case is decided by `orderedMonthCount === 1` and nothing else.
8. *(Planner, 2026-09-26)* The single-month sentence is the existing `frequencySentence`, with no new helper and no
   new wording. It is the brief's own example.
9. *(Planner, 2026-09-26)* In the single-month case the gaps note goes with the chart, because its words are about
   the chart. The weighted-price hint stays, because it also explains the table's price column.
10. *(Planner, 2026-09-26)* The name `TrendModal` is kept (§4.1). A rename would touch two test files for no change
    in behaviour.
11. *(draft)* The drawer stays location-scoped, exactly like the endpoint. "Is this price normal across the
    company?" is a real question, and it is deliberately **not** answered here. It needs a new endpoint and is
    deferred to TASK-26.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git: branch, HEAD, `git status --short`, `git diff --stat`.
1. Çekməcə: `placement`, `Drawer`, sizes, narrow-screen behaviour, and proof that `'center'` is byte-identical; the
   name `TrendModal` was kept.
2. Qərar konteksti: at which widths the amount, `Baza` and `Fərq` stay visible, and where they are covered; the basis
   picker; the scrollbar.
3. URL və tarixçə: the `product` parameter; opening (push and marker) and closing (`navigate(-1)` or `replace`); the
   double-close guard; Back; how it relates to `basis` and `cause`; the deep link; focus.
4. Tezlik: where the sentence sits; why a single-month product has no chart, toggle or gaps note; that no new
   calculation or wording was added.
5. Testlər: new tests; changed tests, each with its reason; counts; builds.
6. Əl ilə yoxlama dəsti: the file and check IDs; state that the Coder did not check in a browser.
7. Toxunulmayanlar: figures, metrics, the other dialogs' `Modal`, Task 17's contract, Task 18's parameter, the basis,
   `DriverList`, the backend.
8. Sonrakı tapşırıqlar üçün qeydlər:
   - TASK-23: `Drawer` is available for the source sections;
   - TASK-25: the per-row frequency badge needs a backend field;
   - TASK-26: cross-location price.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
