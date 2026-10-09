# TASK 12 — MOBİL GÖRÜNÜŞ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-12.md`. This is the owner's settled requirement. It decides *what* and *why*; this
file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and reports.
Part: **one part, not split.** Every line of the brief is carried here (§13). The work is frontend only and smaller
than Task 11b, so one Coder session is enough.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `eaa65bb`
(Task 11b's accepted commit). Line numbers below are at `eaa65bb`.

This task changes **only the frontend's layout and one small component's behaviour**. No backend change, no API
field, no schema, no migration, no database row. This file deliberately contains no `DATA_MIGRATION` marker.

---

## 1. Context

The brief's goal: "Ənvər müəllim telefonda da sifarişi rahat təhlil edib qərar verə bilsin."

The brief's five wanted results, verbatim:

1. "Başlıq bir sətirə sığır."
2. "Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür."
3. "Sifariş sətirləri telefonda yana sürüşdürmədən oxunur."
4. "Sifariş səhifəsinin ardıcıllığı: nə olub → niyə → qərar. Qərar düymələri ekranın altında sabitdir."
5. "Info izahları toxunanda və kliklə açılır."

Accepted decisions the brief lists for this task:

- "İstisnalar bloku mobildə başlığın dərhal altındadır (Task 1b)."
- "Mobil kartlar da bazanı sifariş səhifəsinə ötürür (Task 1)."

Must stay (brief): "Panel mobildə kart siyahısı kimi istifadəyə yararlı qalır" and "Masaüstü görünüş dəyişmir."

Out of scope (brief): the ₼ rule and "Server işləyir" (Task 5 — this task only checks that the ₼ rule holds on the
phone); the decision panel's content and rules (Task 4); the 12-month table's laptop width (Task 8).

Rules from accepted tasks this task applies but does not own:

- **Task 1**: the basis lives in the URL, spelled only by `analytics/basisParams.ts`.
- **Task 2**: "Qiymət yoxdur" amber, only for a price somebody owes; "Daxili təminat" slate, never a warning.
- **Task 4**: the decision panel's buttons come first in it, and on a wide screen it stays in view (sticky column).
- **Task 5**: words, units, 2-decimal money, a no-break space before ₼ (`components/analytics/format.ts:17`), no
  codes, no versions on the manager's screens.
- **Task 8**: the report links to an order **without** a basis; 8.1 (no percentage on the totals row); 8.2 (unusual
  month); the report's marks and legend.
- **9.1** (Task 9): cost increase red, decrease green, as direction — `costDirectionToneClass`,
  `costDirectionTintClass`, `costDirectionBarClass`. The money amount itself is never coloured.

## 2. What "phone" and "desktop" mean here

- **Phone layout** = below Tailwind's `lg` breakpoint (< 1024 px). That is the breakpoint the repository already
  uses for every narrow layout: the sidebar (`layout/AppLayout.tsx:13`), the dashboard's phone list
  (`components/dashboard/LocationRows.tsx:65`, `:187`), the report's narrow view
  (`components/reports/MonthlyReportTable.tsx:78`, `:439`) and the order page's grid (`pages/OrderDetailPage.tsx:212`).
  The brief's audit width, 390 px, is inside it.
- **Desktop** = `lg` and up. "Masaüstü görünüş dəyişmir" is enforced by one rule: **every class this task adds to an
  element that is visible on desktop is either prefixed `max-lg:` / `pointer-coarse:`, or is paired with an `lg:`
  class that restores the exact current value.** The one deliberate desktop change is the ⓘ note (§4.2), because the
  brief says the desktop click must open it.

## 3. Verified current behaviour (repository at `eaa65bb`)

### 3.1 The header — brief item 1

- `layout/Header.tsx:12–27`: `h-16 flex items-center gap-4 px-4`; a 32 px menu button (`lg:hidden`); the title
  `<p className="text-sm font-medium text-slate-700">Material sifarişlərinin idarə edilməsi</p>` (`:21`); then
  `ml-auto flex gap-4` with `ApiStatus` (null unless the server is down, Task 5) and `CurrentUserMenu` (two 28 px icon
  buttons on a phone; the name block is `hidden sm:block`, `layout/CurrentUserMenu.tsx:21`).
- At 390 px: 358 px inside the padding, minus 32 (menu) + 16 + 16 (gaps) + 64 (two icons and their gap) leaves
  ≈ 230 px. The 39-character title at 14 px needs ≈ 270 px, so it wraps; nothing stops it wrapping.

### 3.2 The ⓘ explanations — brief item 5

- There is one ⓘ component, `components/analytics/InfoHint.tsx`, used in 8 files (`DashboardSummary` ×6,
  `DecisionHeadline` ×2, `OrderDetailPage` ×2, `AttentionSection`, `CauseSummary`, `TrendModal`,
  `PricingModeReviewPage`, `SuppliersPage`; 15 call sites). It **does** toggle on click (`:24`) and closes on blur (`:25`).
- Its note is `absolute top-6 left-0 z-20 w-64` (`:35`), inside the button's `relative` span. That is why the audit saw
  nothing open:
  - an ancestor that clips overflow hides it. The order page's lines table sits in `overflow-x-auto`
    (`OrderDetailPage.tsx:330`), and `overflow-x: auto` forces `overflow-y` to clip too — the "Daxili təminat" and
    "Təsnif edilməyib" hints in the price column (`:553`, `:562`) open inside a box that cuts them off;
  - `left-0 w-64` from an icon near the right edge of a 390 px screen runs past the viewport (for example the
    "Müqayisə bazası nədir?" hint at the end of "Müqayisə: …", `DecisionHeadline.tsx:102`);
  - `z-20` is below the modal (`Modal.tsx:31`, `z-50`) and equal to the sticky header.
- The button is `p-0.5` around a 14 px icon: an 18 px touch target.
- The only test touching it is `AttentionSection.test.tsx:439`, which finds the note **inside the card** with
  `getByRole('note', { hidden: true })`. The old-terms sweep (`test/oldTerms.ts:66–77`) reads the note text through
  the DOM as well.

### 3.3 The monthly report on a phone — brief item 2

- `MonthlyReportTable` is `hidden lg:block` (`MonthlyReportTable.tsx:78`); below `lg` the page shows
  `MonthlyReportMonthList` (`:424–495`): the objects that ordered in **one** month chosen by an "Ay" select
  (`pages/MonthlyReportPage.tsx:112–126`, URL `?month=`, `:30`), and one grey line naming the rest. An object's year
  cannot be seen at all. Its doc comment says "Its structure is Task 12's" (`:422`); PLAN.md (Task 8) says the same.
- The legend (`Legend`, `:378–417`) is inside the `hidden lg:block` box: a phone never sees it.
- The data is already all there: `report.rows[].months[]` (12 cells with amount, change, status, unusual flag and
  average, owed-price count), `row.knownAmount`, `row.hasAnyRequest`, `report.months[]` (the company's months),
  `report.knownAmount`. No API change is needed.

### 3.4 The order lines — brief item 3

- `OrderDetailPage.tsx:330–438`: a 10-column table (11 when editable) in `overflow-x-auto`, at every width. At 390 px
  it scrolls sideways; the audit measured it at 810 px.
- The cells are already factored: `PriceCell` (`:542–568`), `SpecificationCell` (`:577–585`), `SupplierCell`
  (`:594–602`).

### 3.5 The order page's order and the decision buttons — brief item 4

- `OrderDetailPage.tsx:212–284`, one grid:
  - `order-1`: `DecisionHeadline` (what — amount and comparison);
  - `order-2`: the decision column — `WorkflowPanel`, `RevisionPanel`, the newer-version notice — `lg:col-start-3
    lg:row-span-2 lg:sticky` (`:245`);
  - `order-3`: `CauseSummary` ("Niyə dəyişib?") and `DriverList` ("Əsas dəyişikliklər") (`:267`).
  - On a phone the grid is one column and follows `order`, so the reader meets **what → decision → why**. On `lg`
    every item is placed explicitly (`lg:col-start-*`, `lg:row-start-*`), so `order` has no effect there.
- `WorkflowPanel` is used only by this page. Its buttons are the first thing in it
  (`components/workflow/WorkflowPanel.tsx:108–138`): `<div className="flex flex-wrap gap-2">`, shown when
  `canSubmit || canApprove || canReturn`. They scroll away with the page on a phone.
- Layers in use: header `z-20` sticky; sidebar overlay `z-30`, sidebar `z-40`; modal `z-50`.

### 3.6 The dashboard on a phone — the brief's two decisions and "must stay"

- `pages/ManagementDashboardPage.tsx:286–291`: `DashboardHeadline` → `AttentionSection` → `DashboardExceptions`, at
  every width (Task 9 put the cards second so one is on the first screen at 1366×768). So on a phone the exceptions
  block ("İstisnalar") is **not** directly under the headline — the attention cards are between them.
- Phone cards carry the basis: the dashboard's phone list uses `DetailsLink` with the selection
  (`LocationRows.tsx:219`), and the attention cards use the same (`AttentionSection.tsx:130`). The existing phone test
  (`LocationRows.test.tsx:423–433`) checks the link exists, not its `href`.
- The dashboard's phone list (`LocationRows.tsx:186–249`) is the layout the audit praised.

### 3.7 The ₼ rule

- `formatMoney` / `formatMoneyDelta` / `formatAmount` put a no-break space before ₼ (Task 5,
  `components/analytics/format.ts:17`). The old-terms sweep flags an ordinary space before ₼
  (`test/oldTerms.ts:41`). Every amount this task adds must come from those formatters.

### 3.8 Test counts at `eaa65bb`

Frontend 39 files / 745 tests (after HD-005). Backend 826 unit / 706 integration.

## 4. Required behaviour

All paths under `frontend/bax-orders-web/src/`.

### 4.1 The header title fits one line — `layout/Header.tsx`

- The title keeps its words exactly: "Material sifarişlərinin idarə edilməsi".
- It never wraps: `min-w-0 truncate` (one line; an ellipsis is the last resort, never a second line).
- On a phone it is sized to fit whole at 390 px: `text-xs sm:text-sm`, and the header's gap is `gap-2 sm:gap-4`. The
  menu button and the right-hand group are `shrink-0`, so the title is the one thing that gives way.
- Desktop: `sm:` restores `text-sm` and `gap-4`; `truncate` changes nothing where the title fits. The header's height,
  padding, the menu button, `ApiStatus` and `CurrentUserMenu` are unchanged.

### 4.2 ⓘ opens on tap and on click, and is never cut off — `components/analytics/InfoHint.tsx`

The component's props and its call sites do not change. Its behaviour:

- **Opens** on a click, a tap and Enter/Space (a native `<button>` already covers all three through `onClick`).
- **Closes** on: a second click/tap on the ⓘ; `Escape` (focus returns to the ⓘ); a `pointerdown` anywhere outside
  both the ⓘ and the note; the window scrolling (listen with `capture: true`, so a scrolling box counts) or resizing;
  focus leaving the ⓘ (the current `onBlur`, kept). A `pointerdown` inside the note does not close it.
- **The note stays where it is in the DOM** — next to its ⓘ, `role="note"`, `id` = `aria-controls`, `hidden` while
  closed. It is not moved to a portal: `AttentionSection.test.tsx:439` and the old-terms sweep read it in place, and
  `aria-controls` keeps pointing at it.
- **When open it is positioned `fixed`**, from the ⓘ's `getBoundingClientRect()`, so no ancestor's `overflow` can clip
  it (a fixed box is clipped only by an ancestor with a transform, and none of the call sites has one — the Coder
  checks the 15 call sites and says so in the report):
  - width `W = min(256, window.innerWidth − 16)` px (256 px = today's `w-64`);
  - `left = clamp(rect.left, 8, window.innerWidth − W − 8)`;
  - below the ⓘ: `top = rect.bottom + 6`; if the measured note does not fit below (`top + height > innerHeight − 8`)
    and does fit above, `top = rect.top − 6 − height`. Measure in `useLayoutEffect` after opening.
  - `z-[60]`: above the modal (`z-50`) and the fixed decision bar (§4.5).
  - The note's look is unchanged: border, white, `p-2`, `text-xs`, shadow. Drop only `absolute top-6 left-0 z-20
    w-64`, which the computed style replaces.
- **Touch target:** on a coarse pointer the ⓘ gets `pointer-coarse:p-2.5` (≈ 34 px). On a mouse it stays `p-0.5` —
  desktop layout unchanged.
- The doc comment says why the note is fixed rather than absolute (the clipping in §3.2), in the file's own idiom.

Hover still opens nothing, as today: the brief asks for tap and click, and a note that appears on hover and vanishes
on the way to reading it is the problem the audit described.

### 4.3 The monthly report shows each object's year on a phone — `components/reports/MonthlyReportTable.tsx`, `pages/MonthlyReportPage.tsx`

Replace `MonthlyReportMonthList` with a phone view of the **whole year per object** (name it, for example,
`MonthlyReportYearList`), `lg:hidden`, rendered where the month list is now (`MonthlyReportPage.tsx:160`).

- **Legend first.** The same `Legend` the table uses, shown above the list on a phone. The desktop `Legend` stays
  where it is, inside `hidden lg:block`; render it once more inside the phone view rather than moving it.
- **One card per row of `report.rows`, in the report's order** (27 objects, Azerbaijani alphabetical, Task 3):
  - Header line: the object's full name, linking to `/locations/{locationId}` exactly as the table's name does (no
    basis), wrapping rather than cut; on the right, "İl cəmi" (`yearTotalLabel`) and `formatMoney(row.knownAmount)`,
    `whitespace-nowrap`.
  - **The course of the year, as a bar strip** (`aria-hidden`: the grid below carries every figure): 12 equal slots,
    January first. A month with an order: a bar whose height is its `knownAmount` as a share of the object's largest
    `knownAmount` of the year (the largest is 100 %; a positive amount is at least 2 px). Bars are neutral
    `bg-slate-300`; an unusual month (`isUnusual`) takes `costDirectionBarClass(recentAveragePercent)` (9.1 —
    direction of cost, as the table tints it). A month with no order: an empty slot. A month that has not begun: the
    table's hatch (`futureMonthClass`).
  - **The twelve months as a grid**, `grid grid-cols-3`, so each row of the grid is a quarter (Yan Fev Mar / Apr May
    İyn / İyl Avq Sen / Okt Noy Dek). Each month shows its short name (`shortMonths`) and exactly what the table's
    cell shows, by the **same** code:
    - with an order: a link to `/orders/{orderRequestId}` (no basis — Task 8's decision), the amount in
      `formatMoney`, `whitespace-nowrap tabular-nums`, and under it the table's `Secondary` marks (status dot, change
      against the previous month in 9.1 colours, ⚠ N); an unusual month is tinted with `costDirectionTintClass` and
      its amount is `font-semibold`; the accessible name is the table's: `` `${locationName} · ${describe(cell, month)}` ``;
    - no order in a past month: "—" (`unknownValue`), slate-300, named `` `${locationName} · ${month} · sifariş yoxdur` ``;
    - a month that has not begun: the hatch, named with `futureMonthNote`, never "sifariş yoxdur".
    Extract the cell's inner content into one function both the table's `Cell` and the phone grid call, or reuse
    `Secondary`, `describe`, `compactDelta`, `StatusDot` and `futureMonthClass` directly — either way there is one
    definition of what a month says. The table's own markup and classes do not change.
  - An object with no order ever (`!row.hasAnyRequest`): no strip and no grid; one line,
    `portfolioGroupLabels.NoHistory` ("Sistemdə hələ sifarişi yoxdur"), slate-500, as the table's row says.
- **The company's months, last** — as the table's totals row is last, and as the dashboard's phone list ends with its
  totals (`LocationRows.tsx:224`): a card headed `monthlyTotalsRowLabel` (or `monthlyTotalsAllLocationsLabel` when a
  search is active, as `MonthlyReportTable.tsx:136` decides), the same 3-column grid of the 12 months, each by the
  table's `MonthTotal` (amount only; ⚠ N when incomplete; hatch or "—" when empty — **no percentage and no change,
  8.1**), and "İl cəmi" `formatMoney(report.knownAmount)`.
- **Lists, not tables.** The phone view uses `<ul>`/`<li>` and grids. It contains no `<table>` (the page's tests find
  the desktop table with `document.querySelector('table')`) and no `min-w-[…]` class.
- **The "Ay" select and the `month` URL parameter go**: the phone now shows every month. `MonthlyReportPage.tsx:30`
  and `:112–126` are removed; an old link with `?month=3` simply opens the report. Remove `MonthlyReportMonthList`.
  `futureMonthLine` (`terminology/terms.ts:118`) is used only by it and by its own assertions in
  `terminology/terms.test.ts` (`:8`, `:143`, `:160`): if no non-test file imports it afterwards, remove it together
  with those assertions and name them in the report. The inline sentence "{n} obyektin bu ay üçün sifarişi yoxdur"
  goes with the month list.
- Rewrite the doc comment that said "Its structure is Task 12's" to say what the phone view is and why.
- Desktop: `MonthlyReportTable`'s markup, classes, legend placement and behaviour are unchanged.

### 4.4 The order lines read without sideways scrolling — `pages/OrderDetailPage.tsx`

- The table's wrapper becomes `hidden overflow-x-auto … lg:block` (add `hidden` and `lg:block`; keep every current
  class). The table itself is unchanged.
- Below `lg`, a list of the **same page of lines** (`data.items.items`, the same search, filter and pagination
  controls — they are shared, above and below):
  `<ul aria-label="Sətirlər" className="space-y-2 lg:hidden">`, one `<li>` card per line
  (`rounded-lg border border-slate-200 bg-white p-3`):
  1. **Top line:** on the left (`min-w-0`) the running number in `text-xs text-slate-400` (the table's
     `(page − 1) × pageSize + index + 1`) and the product name, `font-medium`, wrapping (`break-words`); on the right
     (`shrink-0 text-right`) the line total — `formatAmount(item.lineTotal)` `whitespace-nowrap font-medium`, or the
     table's slate "—" when there is none.
  2. **Specification** under the name, `text-xs text-slate-500`, by `SpecificationCell` — only when there is one (the
     table's "—" is not repeated on a phone).
  3. **Quantity and price**, `text-sm text-slate-700`, wrapping: `formatQuantity(quantity)` and the unit exactly as
     the table's unit cell renders it, then — when the line has a price — " × " and `formatAmount(unitPrice)`;
     when it has none — " · " and `PriceCell` (so "Qiymət yoxdur" stays amber, "Daxili təminat" slate with its ⓘ,
     "Təsnif edilməyib" with its ⓘ — Task 2 unchanged). Never "Qiymət Qiymət yoxdur".
  4. **Supplier and category**, `text-xs text-slate-500`: `SupplierCell`, then " · " and the category path joined
     with " › " when there is one.
  5. **Actions**, under a `border-t border-slate-100 pt-2 mt-2` rule: "Mənbəyə bax" (the same handler as the table);
     when `editable`, "Redaktə et" and "Sil" (`ml-auto`, the same handlers and styles as the table's).
  - Loading and empty: the same words as the table's rows ("Yüklənir…", "Axtarışa uyğun sətir tapılmadı." / "Bu
    sifarişdə sətir yoxdur."), in one card.
- Nothing in the list may force width: no `min-w-[…]`, no `whitespace-nowrap` on names, specifications, suppliers or
  categories (only on amounts, which are short).
- The line cards are this task's; the other tables on the manager's screens (object page periods, approvals inbox,
  product history) are not in the brief — see Out of scope.

### 4.5 The order page reads what → why → decision, with the decision buttons fixed at the bottom — `pages/OrderDetailPage.tsx`, `components/workflow/WorkflowPanel.tsx`

- **Order on a phone.** The decision column's `order-2` becomes `order-3 lg:order-2`; the analysis's `order-3`
  becomes `order-2 lg:order-3` (`OrderDetailPage.tsx:245`, `:267`). The headline stays `order-1`. On `lg` nothing moves:
  every item there is placed explicitly and the `lg:` classes restore today's values. The DOM order is unchanged.
  Result on a phone: amount and comparison → "Niyə dəyişib?" and "Əsas dəyişikliklər" → the decision panel (facts,
  correction panel, newer-version notice).
- **The buttons are fixed at the bottom of the screen on a phone.** In `WorkflowPanel`, the actions container
  (`:109`) keeps its DOM place, its buttons and handlers, and changes only its classes:
  - phone: `fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white px-4 pt-3
    pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(15,23,42,0.08)]`; each button `flex-1`
    with a comfortable tap height (`py-2.5`);
  - `lg:` restores exactly today's look: `lg:static lg:z-auto lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0
    lg:shadow-none`, buttons `lg:flex-none lg:py-1.5`.
  - It is shown exactly when it is shown today (`hasActions`). No button is added, removed, renamed or re-ordered;
    which ones exist remains the server's answer (Task 4).
  - `z-20`: under the sidebar overlay (`z-30`), the sidebar (`z-40`), every dialog (`z-50`) and the ⓘ note (`z-[60]`).
  - The blocked-reason note and the facts stay where they are, in the panel.
- **Nothing hides under the bar.** `OrderDetailPage` ends with a phone-only spacer, `<div aria-hidden="true"
  className="h-24 lg:hidden" />`, rendered whenever the order has loaded, so the last line, the pagination and the
  histories can be scrolled clear of the bar.
- Desktop: the sticky decision column, its `lg:max-h` and `lg:overflow-y-auto`, and the buttons as the first thing in
  it (Task 4, "Yan panel … görünən qalır") are unchanged.

### 4.6 The dashboard: exceptions directly under the headline on a phone — `pages/ManagementDashboardPage.tsx`

- Wrap `DashboardHeadline`, `AttentionSection` and `DashboardExceptions` (`:286–291`) in one container,
  `max-lg:flex max-lg:flex-col`. Wrap the attention section in `<div className="max-lg:order-2">` and the exceptions
  in `<div className="max-lg:order-1">`; the headline has no order class (0, first). On a phone the page then reads
  headline → exceptions → attention cards → the table section, as decided ("İstisnalar bloku mobildə başlığın dərhal
  altındadır"). On `lg` the wrappers are plain blocks and the order is Task 9's.
- The DOM order does not change, so Back's scroll memory (`useScrollMemory`, the `attention-{id}` and `row-{id}-phone`
  ids) and every existing test are unaffected.
- No other dashboard change: the phone list (`LocationRows.tsx:186–249`), the cards, the chips and their links stay as
  they are ("Panel mobildə kart siyahısı kimi istifadəyə yararlı qalır").

### 4.7 Words

No new business word is needed. The labels this task shows on a phone already exist (`yearTotalLabel`,
`shortMonths`, `monthlyTotalsRowLabel`, `monthlyTotalsAllLocationsLabel`, `portfolioGroupLabels.NoHistory`,
`futureMonthNote`, the table's column words). If the Coder needs a new string, it goes in `terminology/terms.ts` or
the feature's `labels.ts`, not inline in JSX.

## 5. Files — summary for the Coder

Changed (expected): `layout/Header.tsx`, `components/analytics/InfoHint.tsx`,
`components/reports/MonthlyReportTable.tsx`, `pages/MonthlyReportPage.tsx`, `pages/OrderDetailPage.tsx`,
`components/workflow/WorkflowPanel.tsx`, `pages/ManagementDashboardPage.tsx`, `terminology/terms.ts` and
`terminology/terms.test.ts` (only if `futureMonthLine` goes, §4.3).

Tests: `components/analytics/InfoHint.test.tsx` (new), `layout/Header.test.tsx`, `pages/MonthlyReportPage.test.tsx`,
`pages/OrderDecisionPage.test.tsx`, `pages/OrderRevisionPage.test.tsx` (scoping only, §9), `components/workflow/WorkflowPanel.test.tsx`,
`pages/ManagementDashboardPage.test.tsx`, `components/dashboard/LocationRows.test.tsx`, `terminology/oldTerms.test.tsx`.

Not changed: anything under `src/` (backend), `tests/`, `tools/`; `api/*`; `components/decisions/*`;
`components/dashboard/*` (except tests); `DecisionHeadline`, `CauseSummary`, `DriverList`, `TrendModal`, `Modal`;
`index.html`; `index.css`.

Keep the codebase's idiom: comments say *why*; the phone layouts sit beside the desktop ones in the same file, as
`LocationRows` and `MonthlyReportTable` already do.

## 6. Safety and STOP conditions

- **No access to the real database.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/` (the approval sandbox included — that is the operator's, §11). No data change; HD-002's 94 rows untouched.
- **No backend change.** If any requirement here seems to need an API field or a backend change, STOP and report.
- **No figure changes.** Every amount, count and percentage shown on a phone comes from the same field and the same
  formatter the desktop uses. Nothing is summed, averaged or rounded in the browser, except the bar heights of §4.3,
  which are a display ratio and are never printed.
- **Desktop does not change** (§2). If a requirement seems to need a desktop change other than the ⓘ note, STOP and
  report.
- Do not rework Tasks 1–11. A defect found there goes into the report.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 7. Invariants — MUST NOT CHANGE

- Desktop (`lg` and up) looks and behaves as at `eaa65bb` on every screen, apart from the ⓘ note opening where it was
  clipped (§4.2).
- Task 1: the basis in the URL; every order link from the dashboard and the attention cards (phone included) carries
  it; the report's links carry none (Task 8).
- Task 2: "Qiymət yoxdur" amber and only for owed prices; "Daxili təminat" slate; the same on the phone cards.
- Task 4: which decision buttons exist is the server's answer; the words; the dialogs; the reason is mandatory; the
  panel's facts; on desktop the panel is sticky with the buttons first.
- Task 5: no LOC/PRD code, no version, no "Server işləyir"; money with a no-break space before ₼; 2-decimal prices.
- Task 6 / 10 / 11: "Niyə dəyişib?", "Əsas dəyişikliklər", the product history — content, order, figures.
- Task 8: the desktop panorama at 1366 / 1440 / 1200 px; 8.1; 8.2; cell links open the order without a basis.
- Task 9: the dashboard's desktop order (cards on the first screen at 1366×768), the phone list, the chips.
- 9.1 wherever direction is shown; the amount itself never coloured.
- No backend, schema, migration or data change.

## 8. Acceptance criteria

1. **Header** (brief 1; acceptance 1, first half). The title element has the full words and `truncate` (cannot wrap),
   `text-xs sm:text-sm`; the header gap is `gap-2 sm:gap-4`; the menu button and the right group are `shrink-0`.
2. **₼ on the phone** (acceptance 1, second half). `findOldTerms` finds nothing — in particular no "ordinary space
   before ₼" — in: the report's phone view (§4.3), the order page's line cards (§4.4), and the order page and
   dashboard rendered whole (their phone lists included).
3. **The year on a phone** (brief 2; acceptance 2). Below `lg`, every object of the report has a card with all 12
   months in calendar order — amount, marks, tint, links to `/orders/{id}` with no basis, "—" for a past month
   without an order, the hatch for a month not begun — the year total, and the bar strip; an object that never
   ordered says "Sistemdə hələ sifarişi yoxdur"; the company's months close the list with no percentage; the legend
   is on the phone. There is no "Ay" select. The desktop table's tests pass unchanged.
4. **Lines without sideways scrolling** (brief 3; acceptance 3). Below `lg` the lines are cards (§4.4) with every
   fact the table row has (number, product, specification, quantity and unit, price or its state with ⓘ, total or
   "—", supplier, category, "Mənbəyə bax", and "Redaktə et" / "Sil" when editable); the table's wrapper is
   `hidden … lg:block`; the list has no `min-w-[…]` class and no `whitespace-nowrap` on text.
5. **What → why → decision, buttons fixed** (brief 4; acceptance 4). The decision column is `order-3 lg:order-2`,
   the analysis `order-2 lg:order-3`; the actions container is `fixed inset-x-0 bottom-0 z-20 …` with `lg:static …`
   restoring today's classes; with a Rəhbər's `canApprove` / `canReturn` it holds "Təsdiqlə" and "Düzəliş tələb et",
   and each still opens its dialog; the page has the phone spacer. On the operator's phone check (§11) with the Task 4
   test order, the two buttons are at the bottom of the screen while "Niyə dəyişib?" is read.
6. **ⓘ on tap and click** (brief 5; acceptance 5). The note opens on a mouse click, on a touch tap and on the
   keyboard; closes as §4.2 says; while open it is `position: fixed`, inside the viewport with an 8 px margin at 390 px,
   `z-[60]`; it stays in place in the DOM with its `role`, `id` and `aria-controls`; the touch target is
   `pointer-coarse:p-2.5`. `AttentionSection.test.tsx:439` passes unchanged.
7. **Dashboard decisions.** Below `lg` the exceptions block comes directly after the headline (`max-lg:order-1`, the
   cards `max-lg:order-2`, the container `max-lg:flex max-lg:flex-col`); the DOM order is unchanged. The phone list's
   "Detallara bax" carries the basis (`/orders/105?basis=avg3`), as do the attention cards.
8. **Nothing else changed.** Desktop per §2 and §7; all frontend suites and the build green; the backend untouched,
   its suites green at 826 / 706; the old-terms sweep passes.

## 9. Required tests (vitest)

jsdom applies no CSS, so layout is tested through structure and class names, and through the positioning arithmetic.
That is the limit of what a unit test can prove here; §11's operator check covers what the eye must see.

- **`components/analytics/InfoHint.test.tsx` (new):**
  - closed at first (`hidden`, `aria-expanded="false"`);
  - opens on `userEvent.click`; opens on a touch tap (`userEvent.pointer({ keys: '[TouchA]', target })`); opens on
    Enter;
  - a second click closes; `Escape` closes and focus is on the ⓘ; a `pointerdown` outside closes; a `pointerdown` on
    the note does not; a `scroll` event on `window` closes;
  - while open: `style.position === 'fixed'`; with `window.innerWidth = 390` and the ⓘ's rect at `left: 330`, the note's
    `left` is `390 − 8 − 256 = 126` px and its width 256 px; with `innerWidth = 250`, width is 234 px and `left` 8 px;
    with the ⓘ near the bottom and room above, the note is placed above;
  - the note is a descendant of the ⓘ's wrapper (not portalled), and has `z-[60]`; the button has
    `pointer-coarse:p-2.5`.
- **`layout/Header.test.tsx`:** the title's words and its classes (§4.1 / criterion 1). Keep the three `ApiStatus`
  tests.
- **`pages/MonthlyReportPage.test.tsx`** — the `describe('the phone', …)` block (`:248–273`) and the narrow-layout
  test `:609–616` are **replaced deliberately** (brief: "Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür"; the
  one-month list and its "Ay" select go). New phone tests, all scoped to the `lg:hidden` view:
  - no "Ay" combobox; `?month=3` renders the report without error;
  - one card per row, in the report's order; each has 12 months named Yan … Dek in order;
  - a month with an order links to `/orders/{id}` with no `?basis`, shows `formatMoney`, and has the table's
    accessible name; an unusual month has the direction tint (both directions); an incomplete month shows "⚠ N";
    a past month without an order is "—"; a future month is the hatch with `futureMonthNote` and no "sifariş yoxdur"
    (use `today(...)` as the existing tests do);
  - the year total; the bar strip has 12 slots and the largest month's bar is 100 %;
  - `hasAnyRequest: false` → "Sistemdə hələ sifarişi yoxdur" and no month grid;
  - the company's months card is last, has 12 totals, no "%" in it (8.1), and `formatMoney(report.knownAmount)`;
    with a search active it is labelled `monthlyTotalsAllLocationsLabel`;
  - the legend is present in the phone view;
  - the phone view contains no `table` element; `findOldTerms(phoneView)` is empty.
  Every other test in the file passes **unchanged**.
- **`pages/OrderDecisionPage.test.tsx`:**
  - the line cards: every fact of §4.4 for a priced line, an internally supplied line (slate, ⓘ), an owed-price line
    (amber), an unclassified line (ⓘ), a line with no total ("—"); "Mənbəyə bax" in a card opens the source drawer;
    the empty and loading words; the table wrapper has `hidden` and `lg:block`; no `min-w-[` in the list;
    `findOldTerms(list)` is empty;
  - order: the decision column's classes contain `order-3` and `lg:order-2`, the analysis's `order-2` and `lg:order-3`;
    in the DOM the headline still comes before both;
  - the phone spacer exists with `lg:hidden`.
- **`pages/OrderRevisionPage.test.tsx`** (and any other file that now finds a line's text or button twice): scope the
  existing queries to the table (`within(table)`), **without changing any expectation**. Name every test so scoped in
  the report — the reason is the brief's "Sifariş sətirləri telefonda yana sürüşdürmədən oxunur", which adds the card
  list beside the table. Add one test that "Redaktə et" and "Sil" in a card open the same dialogs.
- **`components/workflow/WorkflowPanel.test.tsx`:** the actions container has `fixed`, `bottom-0`, `inset-x-0`, `z-20`
  and `lg:static`; with `canApprove` and `canReturn` it holds exactly "Təsdiqlə" and "Düzəliş tələb et" (the words from
  `labels.ts`), each still opens its dialog; with no action it is not rendered. Existing tests pass unchanged.
- **`pages/ManagementDashboardPage.test.tsx`:** the exceptions wrapper has `max-lg:order-1`, the attention wrapper
  `max-lg:order-2`, their container `max-lg:flex` and `max-lg:flex-col`; in the DOM the attention section still
  precedes the exceptions (Task 9's desktop order).
- **`components/dashboard/LocationRows.test.tsx`:** in the phone list (`ul.lg\:hidden`), "Detallara bax" is
  `/orders/105?basis=avg3`, and for a row with no order this month `/locations/21?basis=avg3`.
- **`terminology/oldTerms.test.tsx`:** the report's phone view and the order page's line cards pass `findOldTerms`.
  If the monthly report case there relied on the one-month list, update it to the new phone view and name it.

Existing tests that change **deliberately** — each named in the report with the brief line behind it:

- `MonthlyReportPage.test.tsx`: `:248–273` and `:609–616` (the one-month list and its "Ay" select).
- `terminology/terms.test.ts`: the `futureMonthLine` assertions, if the function goes with the month list (§4.3).
- The files whose line queries are scoped to the table (list them).
- Anything else — explain it, or it is a regression.

No expectation may be weakened to make a test pass.

## 10. Expected verification

- `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` (`tsc -b` is the
  type check) are green. Give the counts; the baseline is 39 files / 745 tests.
- `dotnet build BaxOrders.slnx` (0 warnings, 0 errors) and `dotnet test BaxOrders.slnx` (826 unit / 706 integration,
  unchanged — this task touches no backend). If the running API locks `bin`, use `--artifacts-path` into the
  scratchpad, say so, and do not stop the API.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/`.
- A search under `frontend/bax-orders-web/src` for `MonthlyReportMonthList` finds nothing.
- The report lists the ⓘ's 15 call sites and confirms none sits inside an element with a CSS transform, or inside
  another button or link.

## 11. Operator check on a phone (after review; no role can do this)

No role has a browser. The operator confirms on the running app, in Chrome's device mode at **390 × 844**
(and, if possible, on a real phone), after serving this commit's frontend (no API restart is needed — no backend
change):

1. The header title is one line on every page.
2. Aylıq hesabat: every object shows its 12 months and year total; tapping a month opens that order; the legend is
   there.
3. An order with many lines (for example Heydər Əliyev, Sentyabr): the lines read without any sideways scrolling;
   no amount is split from its ₼ anywhere on the page.
4. **The Task 4 test order**, in the approval sandbox, as the Rəhbər: `tools/BaxOrders.ApprovalSandbox/sandbox.ps1
   -Reset`, then `-Run`, and `npm run dev:sandbox` (commands in the script's header and in Task 04b's report). Open
   the order waiting for approval: the page reads amount → "Niyə dəyişib?" → decision panel, and "Təsdiqlə" /
   "Düzəliş tələb et" stay at the bottom of the screen throughout.
5. Tap the ⓘ beside "Müqayisə: …" on the order page, beside "Daxili təminat" in a line, and on a dashboard chip: each
   note opens fully on screen, and closes on a second tap or a tap elsewhere. On a desktop, a click opens it.
6. The dashboard: the exceptions block directly under the headline; the phone list is as before; a card's
   "Detallara bax" opens the order with the chosen basis.
7. At 1366 × 768 and 1440: every screen looks as before.

## 12. Out of scope

- The ₼ rule itself and "Server işləyir" (Task 5): only checked here (criterion 2).
- The decision panel's content and rules (Task 4).
- The 12-month table at laptop widths (Task 8).
- Other wide tables a phone can meet — the object page's periods table, "Təsdiq gözləyənlər", the product history's
  month table, the admin screens. The brief names only the order lines. They keep scrolling inside their own box;
  the Coder lists any that do so at 390 px in the report, for the Coordinator.
- Hover-only explanations that are not ⓘ — the `title` of the "⚠ N" mark (`MissingPriceMark`), the dashboard table's
  basis header, the report's cell tooltips (the phone grid shows the same facts as text and marks, and has the
  legend). The brief's item 5 is the ⓘ. The Coder lists the remaining `title`-only explanations on the manager's
  screens in the report, for Task 15.
- Any backend change.

## 13. Where the brief lands

| Brief | Here |
|---|---|
| Başlıq bir sətirə sığır | §4.1; criterion 1 |
| Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür | §4.3; criterion 3 |
| Sifariş sətirləri telefonda yana sürüşdürmədən oxunur | §4.4; criterion 4 |
| Ardıcıllıq: nə olub → niyə → qərar | §4.5 (order); criterion 5 |
| Qərar düymələri ekranın altında sabitdir | §4.5 (fixed bar); criterion 5 |
| Info izahları toxunanda və kliklə açılır | §4.2; criterion 6 |
| Qərar: İstisnalar bloku mobildə başlığın dərhal altındadır (Task 1b) | §4.6; criterion 7 |
| Qərar: Mobil kartlar da bazanı sifariş səhifəsinə ötürür (Task 1) | §3.6 (already true), §9 test; criterion 7 |
| Qorunmalı: Panel mobildə kart siyahısı kimi yararlı qalır | §4.6 (no change to the phone list); §7 |
| Qorunmalı: Masaüstü görünüş dəyişmir | §2, §7; criterion 8 |
| Acceptance 1: başlıq bir sətir və Task 5-in məbləğ qaydası | criteria 1, 2 |
| Acceptance 2: bir obyektin 12 aylıq gedişatı telefonda | criterion 3 |
| Acceptance 3: sətirlər yana sürüşdürmədən | criterion 4; §11.3 |
| Acceptance 4: Task 4-ün test sifarişi, təhlil, düymələr ekranın altında | criterion 5; §11.4 |
| Acceptance 5: ⓘ-yə toxunanda izah açılır | criterion 6; §11.5 |
| Out of scope (Task 5, Task 4, Task 8) | §12 |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. "Phone" is below 1024 px (`lg`), the breakpoint every existing narrow layout in the app already uses; 390 px is
   inside it. Tablets therefore get the phone layouts too.
2. The header keeps its exact words and is made to fit by a smaller size on a phone; `truncate` guarantees one line
   on any narrower device, at the cost of an ellipsis there, rather than shortening the product's name.
3. The ⓘ note becomes `position: fixed` rather than being moved to a portal, so it escapes clipping while staying in
   place for screen readers, `aria-controls`, the existing test and the old-terms sweep. It closes on scroll, because
   a fixed note would otherwise drift away from its ⓘ.
4. The ⓘ still does not open on hover. The brief asks for tap and click; hover-open is what the audit found wanting.
5. The ⓘ's touch target grows only on a coarse pointer (`pointer-coarse:`), so a mouse user's layout is untouched.
6. The phone report shows every object's whole year (a 12-bar strip for the shape, a quarter-per-row grid for the
   figures) instead of one chosen month. The "Ay" select and `?month=` go, because they no longer choose anything.
7. The bar strip is neutral grey, and only an unusual month takes the direction colour — the same rule the table
   uses (an amount is a sum, not a direction; 9.1 colours only direction).
8. The company's months close the phone report, as the totals row closes the table and the dashboard's phone list
   ends with its totals.
9. The phone report repeats the legend rather than moving it, so the desktop layout is untouched.
10. The order lines on a phone are a card list beside the table (CSS decides which shows), the pattern the dashboard
    and the report already use, rather than one element restyled by breakpoint. The cost is that some existing tests
    must scope their queries to the table; no expectation changes.
11. A line card leads with the product and its total, then "quantity × price", then supplier and category, then the
    actions. The table's "—" for an absent specification is not repeated on a phone.
12. On a phone the newer-version notice stays with the decision panel (after the analysis), as it is on a desktop.
13. The phone spacer under the order page is always there once the order has loaded, whether or not the bar is,
    rather than being tied to the panel's state: a few blank lines at the end of a page cost nothing.
14. The dashboard's reordering is done with CSS `order` below `lg` only, keeping the DOM (and so Task 9's desktop
    order, the scroll memory and every test) as it is. On a phone this places the exceptions before the attention
    cards, as the brief decides; Task 9's "a card on the first screen" is measured at 1366×768 and is unaffected.
15. Tables other than the order lines, and hover-only `title` explanations other than ⓘ, are left as they are and
    listed in the report (§12), because the brief names neither.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (`eaa65bb`), `git status --short`, `git diff --stat`.
1. Başlıq — before/after classes; the arithmetic at 390 px.
2. ⓘ — what was wrong (the clipping and overflow of §3.2), what it does now, the positioning rule, the closing rules,
   the 15 call sites checked (none under a transform, none inside a button or link).
3. Aylıq hesabat telefonda — the card, the strip, the grid, the closing card, the legend; what was removed (the month
   list, the "Ay" select, `?month=`, any export).
4. Sifariş sətirləri telefonda — the card's lines, field by field against the table's columns.
5. Sifariş səhifəsinin ardıcıllığı və sabit düymələr — the order classes; the bar's classes on a phone and on `lg`;
   the spacer; the layers.
6. Panel — the exceptions order; the phone links' basis.
7. Masaüstü — how each change leaves `lg` and up as it was (§2's rule, file by file); the one ⓘ exception.
8. Testlər — new tests; deliberately changed and scoped tests, each with the brief line behind it; counts; builds.
9. Toxunulmayanlar — no backend, no database access, no figure changed; Tasks 1–11 intact.
10. Operator üçün — §11's checklist as it stands, the other wide tables met at 390 px, and the remaining `title`-only
    explanations (§12).

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
