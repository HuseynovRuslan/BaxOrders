# TASK 23 — MƏNBƏNİN MƏRHƏLƏLİ AÇILIŞI (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-23.md` is the owner's settled requirement, with decisions 23.1, 23.2 and 23.3 in
`BRIEFS/OWNER_BRIEFS_MASTER.md` (lines 841–845). The brief decides *what* and *why*; this file decides *how*. Where this
file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** It makes two disclosure changes on one page and adds their tests.
Specification status: **READY.** The Product/UX planning agent drafted it on 2026-09-25. The Planner verified §2 on
2026-09-26 against the accepted HEAD `112c2d7` (Task 22b) and completed it. Provenance of the changes from the draft
is in §13.

This task changes **frontend presentation only**, meaning what the order page shows before the reader asks for it. It
removes no capability, column, row or field. It changes no figure, no API and no database. This file has no
`DATA_MIGRATION` marker, on purpose.

---

## 1. Context

The brief's goal: "Rəhbərə baxan sifariş səhifəsi texniki mənşə ilə başlamasın. Mənbə imkanı yerində qalsın, amma
istənməyənə qədər görünməsin."

The audit measured the order page in its default state at **4 513 px (5.3 screens)**. With the change list fully
expanded it measured **13 460 px (15.9 screens)**. Most of that height is the open raw line table, and every row
carries a `Mənbəyə bax` control. Opening one shows the Excel file name, the import number, the sheet, **Excel row
3142**, and raw, effective and canonical values for each field.

That dialog is excellent, and it is for a data steward. A manager should not meet it on the way to a decision. This
task deletes none of it; it moves it behind one deliberate step.

## 2. Verified current behaviour (repository at `112c2d7`, Task 22b's accepted commit)

All paths are under `frontend/bax-orders-web/src/` unless they say otherwise.

### 2.1 The page's default state

`pages/OrderDetailPage.tsx` renders the following, in order:

- The header, with `OrderStatusBadge` and «Obyektin sifarişləri» (`:285-308`).
- A grid (`:321-411`):
  - the headline (`DecisionHeadline`, `:323-356`);
  - the sticky decision column (`WorkflowPanel`, `RevisionPanel`, `:365-385`);
  - `CauseSummary` («Niyə dəyişib?», `:389-395`);
  - `DriverList` («Əsas dəyişikliklər», `:397-408`).
- **The `Sətirlər` section, `:413-612`**:
  - `<SectionHeader title="Sətirlər" />` (`:414`);
  - a toolbar (`:415-455`) holding:
    - the search form (`:416-430`);
    - the filter `select` (`:432-443`), whose options are `Bütün sətirlər` (`:440`), `Qiyməti olan sətirlər`
      (`:441`) and `missingPriceShortLabel`, i.e. `Qiymət yoxdur` (`:442`);
    - for an editable version only, `addLineLabel` (`:446-454`);
  - **a table, shown from `lg` up** (`:457-562`). Its columns are
    `# · Məhsul · Spesifikasiya · Miqdar · Vahid · Qiymət · Cəmi · Təchizatçı · Kateqoriya · Mənbə` (`:462-471`), plus
    a hidden `Əməliyyatlar` column when the version is editable (`:472-476`). Every row's `Mənbə` cell has a
    `Mənbəyə bax` button (`:528-537`), and editable rows add `Redaktə et` and `Sil` (`:538-557`);
  - **a card list, shown below `lg`**: `<ul aria-label="Sətirlər" className="… lg:hidden">` (`:564-586`). Each card is
    a `LineCard` (`:758-828`) with its own `Mənbəyə bax` (`:804-806`) and, when editable, `Redaktə et` / `Sil`. The
    draft did not mention this list; it carries the same provenance control and collapses with the table;
  - **pagination** (`:588-612`), shown only when `data.items.totalCount > pageSize`. It reads
    `Səhifə N / M · K sətir` and has `Əvvəlki` / `Növbəti` buttons.
- `HistoryTabs` (`:614`), then the phone spacer (`:618`).
- The dialogs: `TrendModal` (`:621-640`), `ItemSourceDrawer` (`:642-648`), and edit / remove / add (`:651-681`).

**Pagination confirmed.** The table is paginated **on the server, 50 lines per page**:

- `const pageSize = 50` (`:64`);
- `fetchOrder(id, { search, hasPrice, page, pageSize }, …)` (`:203`);
- the effect depends on `[id, search, hasPrice, page, reloadToken]` (`:211`).

The audit's DOM count of 50 `tbody` rows for a 78-line order is page 1 of 2. Search, filter and page are page-level
state (`:172-175`), and they re-query the server.

**Line count available on the page:** `OrderRequestDetail.itemCount` (`api/orders.ts:172`). The server fills it with
`request.Items.Count` (`src/BaxOrders.Application/Orders/OrderRequestQueries.cs:45`, `:211`), so it counts the whole
order and **ignores the search and the filter**. By contrast, `data.items.totalCount` is the filtered count.

**Provenance on the page by default.** Excel row numbers and version facts appear **only** inside the source dialog:

- `ItemSourceDrawer.tsx:67`: `Excel sətri`;
- `ItemSourceDrawer.tsx:122-146`: `Sətrin keçdiyi versiyalar`, `Versiya N`, `· Excel sətri`;
- the product history's folded `<details>` (`components/analytics/TrendModal.tsx:245-248`).

The table's `#` column is the line's position in the order, `(page - 1) * pageSize + index + 1` (`:497`), and not an
Excel row. `OrderDecisionPage.test.tsx:907` and `:1297` already assert that the default page shows no `/versiya/i`. So the 23.1
items "Excel sətir nömrələri, versiya məlumatı" are reached today only through a row's `Mənbəyə bax`. Collapsing the
rows puts all of 23.1 behind the one disclosure.

### 2.2 The source dialog

`components/orders/ItemSourceDrawer.tsx`:

- It is a centred Task 17 `Modal` with `title="Mənbə"`, `subtitle={productName}`, `width="wide"` and
  `dismissOnBackdrop` (`:46`).
- **The lineage block** (`Lineage`, `:122-146`) appears only when `lineage.length > 1` (`:49`):
  - the heading `Sətrin keçdiyi versiyalar`;
  - `Cari sətir (versiya N)` and `Versiya N`;
  - each step's status word, from `orderStatusLabels` (`:136`);
  - `· Excel sətri` on the imported step;
  - the chain note.
- **The manually added note** (`:51-59`).
- **The facts `dl`** (`:63-71`): `Fayl`, `İdxal` (`#id · status`), `Vərəq`, `Excel sətri`, `Excel cəmi`,
  `Hesablanmış cəm` and `Sifarişə yazılıb`.
- **The field table** (`:74-100`):
  - four columns: `Sahə`, `Mənbə dəyəri (Excel-də)`, `Effektiv dəyər (sistem qəbul edir)`, `Kanonik qeyd`;
  - the `qəsdən boş` and `düzəliş` markers.
- **The closing note** (`:103-106`) and the error line (`:110`).
- It fetches its own data on open (`fetchOrderItemSource`, `:29-39`). There is **no test file of its own**. It is
  exercised through `OrderDecisionPage.test.tsx:1360` and `OrderRevisionPage.test.tsx:891`, `:913`.

`orderStatusLabels` (`components/imports/labels.ts:176-181`) is used only here (`ItemSourceDrawer.tsx:136`), and its
four words are byte-identical to `workflowStatusLabels` (`components/workflow/labels.ts:5-10`). 22a and 22b left it to
this task. **This task still leaves it alone**, because brief requirement 3 and §8 freeze the dialog (Assumption 7).

### 2.3 The counting paragraph

In `components/decisions/DriverList.tsx`, the heading block (`:104-110`) renders three lines:

- the `h2` «Əsas dəyişikliklər» (`:106`), with `ref={headingRef}` and `scroll-mt-20`, which a reason scrolls to;
- **`<p>{driverScopeLine(products)}</p>` (`:107`)**. This is the paragraph the brief quotes:
  *"Bu sifarişdə 78 məhsul var, müqayisə bazası ilə birlikdə 120. «Hamısı» onlardan dəyişən 113 məhsulu sayır. 7
  məhsulun məbləği dəyişməyib."* `components/decisions/labels.ts:155-163` builds it. It explains the counting rule,
  and Task 10 wrote it, refined in 11b;
- `<p>{productStateLine(products)}</p>` (`:109`): *"Artıb: 9 · Azalıb: 2 · Xidmətlər: 1"*
  (`components/decisions/labels.ts:199-210`). These are counts, not an explanation of the algorithm. See §4.2 and
  Assumption 5.

The chips (`:111-139`), the rows (`:142-189`) and `Hamısına bax (N)` (`:191-201`) follow.

### 2.4 What already collapses: the idioms this task reuses

- **Disclosure button:** `WindowMonths` in `components/decisions/DecisionHeadline.tsx:196-238`. It is a real
  `<button type="button" aria-expanded={open}>` with `ChevronRight` / `ChevronDown` and a constant noun label
  (`windowMonthsLabel = 'Müqayisəyə daxil olan aylar'`, `components/decisions/labels.ts:246`). The content is
  rendered only while it is open (`{open && …}`). It has no `aria-controls`; this task adds that for its own control.
- **Folded section:** the product history's `<details>` «Mənbə və versiya məlumatı» (`TrendModal.tsx:245-248`).
- **Explanation hint:** `components/analytics/InfoHint.tsx:24-103`:
  - props `label: string` (the ⓘ's `aria-label`) and `children: string`;
  - a `button` with `aria-expanded` / `aria-controls`;
  - a `role="note"` span that stays **in the DOM with `hidden`** while closed (`:90-100`);
  - it opens on click or keyboard, never on hover;
  - the order page already uses it for the price cells (`OrderDetailPage.tsx:706`, `:715`) and the headline uses it
    for coverage (`DecisionHeadline.tsx:186`).
- `components/imports/review/Drawer.tsx` (Task 19, the `Modal` with `placement="right"`) is available. This task does
  **not** need it (Assumption 7).

### 2.5 Tests that read the lines today

Collapsing the section changes every test that reaches the table, the card list or a row's buttons without opening
the section:

- `pages/OrderDecisionPage.test.tsx`:
  - `:1053-1058` (`still carries the order s own lines`);
  - the `the lines on a phone` block (`:1113-1260`, including loading and empty at `:1241-1258`);
  - `linesTable()` users (`:1283-1358`);
  - `:1360` (the source drawer's technical detail);
  - `:1819` (closing «Mənbə»);
  - `:2214`, `:2395`, `:2501` (waiting for a line in the card list);
  - `:2425`, which counts `fetchOrder` calls; opening the section must not change that count.
- `pages/OrderRevisionPage.test.tsx`:
  - `linesTable()` / `lineCards()` (`:227-234`);
  - every `Redaktə et` / `Sil` / `Mənbəyə bax` click (`:432-433`, `:514-692`, `:716-717`, `:891`, `:913`).
- `terminology/oldTerms.test.tsx:979-1014`:
  - the order-page sweep reads the card list at `:1001` and sweeps it;
  - it asserts the scope line with `toHaveTextContent` at `:994-996`;
  - it asserts the state line at `:1014`.
- `components/decisions/DriverList.test.tsx:400-416` (the scope line, via `getByText`) and `:614`, `:620` (the state
  line).

The InfoHint note stays in the DOM while hidden, so `getByText` and `toHaveTextContent` still find a moved string.
Those assertions keep passing unchanged. They do **not** prove the move, which is why §10 adds tests that do.

## 3. Scope

In scope, on the order page only:

- A. The line section (toolbar, table, card list, pagination) is collapsed by default behind one control that names
  how many lines the order has.
- B. The `Mənbəyə bax` controls go with it. They are inside the rows and become reachable when the section is opened.
- C. The counting paragraph (§2.3's `driverScopeLine`) moves behind an `InfoHint` beside the «Əsas dəyişikliklər»
  heading.
- D. The page's default height falls materially.
- E. Tests and the manual verification pack.

Out of scope:

- the contents of the source dialog, including its `orderStatusLabels` import: **unchanged, every field stays**
  (invariant, §8);
- the dialog's placement. «Mənbə» stays the centred `Modal` it is. Task 19 already decided that, and this task does
  not move it to `Drawer`;
- the raw table's columns, its search, its filter select, its pagination, its figures and its row actions;
- the change list, its chips, its rows and its `productStateLine` (**Tasks 18, 10 and 11b**), except for the one
  paragraph C moves;
- the product drawer (**Task 19's**);
- the dialog contract (**Task 17's**, inherited);
- the headline, the reasons, the approval wording and the status badge (**Tasks 06, 21, 22a and 22b**);
- `HistoryTabs`, `RevisionPanel`, `WorkflowPanel`;
- moving provenance behind a permission or a role (**not this task**, Assumption 4).

## 4. Required behaviour

### 4.1 The line section collapses (A, B)

**Structure.** Replace `<SectionHeader title="Sətirlər" />` (`OrderDetailPage.tsx:414`) with a heading that *is* the
disclosure. This is the WAI-ARIA accordion pattern: an `h2` with the same classes `SectionHeader` gives its heading
(`text-sm font-semibold text-slate-900`, inside the same `mb-2` wrapper). Inside the `h2` is **one**
`<button type="button">` holding:

- the chevron: `ChevronRight` closed, `ChevronDown` open, `aria-hidden`, as in `WindowMonths`;
- the word `Sətirlər`;
- the order's line count, as the change-list chips show theirs: `formatCount(data.itemCount)` in a
  `<span className="ml-1 … text-slate-400">`.

While the order is still loading (`data === null`), the count is left out and the button still works.

The button carries:

- `aria-expanded={linesOpen}`;
- `aria-controls={regionId}`, with `regionId` from `useId()`.

**Region.** Wrap everything that is now `:415-612` in one element: the toolbar, the `lg` table, the phone
`<ul aria-label="Sətirlər">` and the pagination. That element is `<div id={regionId}>`, is **always rendered**, and
holds its children **only while open**:

```tsx
<div id={regionId}>{linesOpen && (<>…the existing toolbar, table, card list and pagination, unchanged…</>)}</div>
```

So `aria-controls` always points at an existing element, and a closed section puts no table, card list, search box,
filter or `Mənbəyə bax` in the DOM. The markup inside moves into the wrapper **unchanged**: same elements, classes,
handlers, texts and `aria-label`. Where it helps, factor it into a local component in the same file, such as
`LinesSection`. **Do not** reimplement the table.

**State.**

- Store the open order, not a boolean: `const [linesOpenFor, setLinesOpenFor] = useState<number | null>(null)`, with
  `const linesOpen = linesOpenFor === id`. It closes for a different `orderRequestId` (the component is reused across
  `/orders/:id`, for example through the «latest order» link) and needs no effect.
- It is **not** in the URL and does not persist across navigation or reload. It is **collapsed by default on every
  visit, for every role, and whether or not the version is editable** (Assumptions 1 and 2).
- It **survives `reload()`** (`reloadToken`). After a line is edited, added or removed (`afterChange`, `:252-259`),
  the section the reader opened stays open.
- Search input, applied search, filter and page stay page-level state (`:172-175`), as they are now. Closing and
  reopening keeps them, so a reader who filtered to `Qiymət yoxdur`, closed the section and reopened it sees the same
  filter.

**Fetching is unchanged.** The `fetchOrder` effect (`:200-211`) and its dependencies stay exactly as they are. The
lines are still fetched with the page, whether or not the section is open. Opening, closing and reopening issue **no**
request. This task must **not** turn the collapse into a lazy fetch (§6).

**Row actions.** `addLineLabel`, `Redaktə et` and `Sil` are inside the section and go with it. For an editable
version they are one click further away. The server still decides whether they appear (`editable`, `:279`).

### 4.2 The counting explanation moves (C)

In `components/decisions/DriverList.tsx`:

- Remove `<p className="mt-0.5 text-xs text-slate-500">{driverScopeLine(products)}</p>` (`:107`) from the body.
- Put its text, **byte for byte the same string** from the same `driverScopeLine(products)` call, as the child of an
  `InfoHint` placed **beside** the `h2`. Wrap the `h2` and the `InfoHint` in an inline flex row. The `InfoHint` goes
  **outside** the `h2`, so that:
  - the heading's accessible name stays exactly `Əsas dəyişikliklər`;
  - `headingRef` and `scroll-mt-20` stay on the `h2`;
  - Task 18's scroll-to-heading behaves as before.
- The hint's `label` is a new constant `driverScopeHintLabel = '«Hamısı» nəyi sayır?'` in
  `components/decisions/labels.ts`, next to `driverScopeLine`. The ⓘ is named for what it answers, like the page's
  other hints (`Daxili təminat nədir?`, `… — bu nə deməkdir?`).
- `driverScopeLine` itself is **not changed**: its wording, its 11b tail and its `comparedCount > listedCount` branch
  all stay.
- `productStateLine` (`:109`) **stays where it is**, as the one line under the heading (Assumption 5).

### 4.3 Height (D)

With the change list at its default (not expanded) and the line section collapsed, the order page's scroll height must
be **materially** lower than the audit's 4 513 px. In the default state the page no longer renders up to 50 table rows,
or on a phone up to 50 cards, and it renders one fewer text line in «Əsas dəyişikliklər».

The Coder cannot measure pixels. jsdom has no layout, and the Coder performs no browser check. So in-suite, the
evidence is **structural**: the default DOM contains no line table, no card list and no counting paragraph as body text
(§10). The **pixel numbers, before and after, at `1440×900`, are measured by the operator** in the manual pack (§11,
G-03). Acceptance criterion 5 is a reader outcome, not a pixel target, because content varies by order.

### 4.4 Nothing is removed

Every column, row and field of the source dialog, every filter option, every row action and every figure stays. If any
of them would have to be dropped to meet §4.3, STOP. §4.3 gives way.

## 5. Frontend requirements: summary for the Coder

Expected changes:

- `pages/OrderDetailPage.tsx`: the heading-button, the region, the `linesOpenFor` state, and the `ChevronDown` /
  `ChevronRight` import from `lucide-react`. The `SectionHeader` import goes if nothing else uses it.
- `components/decisions/DriverList.tsx`: the paragraph moves into `InfoHint`, and `InfoHint` is imported from
  `../analytics/InfoHint`.
- `components/decisions/labels.ts`: `driverScopeHintLabel`.
- Tests (§10) and the manual pack (§11).

Not changed:

- `components/orders/ItemSourceDrawer.tsx`;
- `components/imports/labels.ts`;
- `components/analytics/InfoHint.tsx`;
- `components/SectionHeader.tsx`;
- `components/decisions/CauseSummary.tsx`;
- the markup and columns of the table and `LineCard`;
- `PriceCell`, `SpecificationCell`, `UnitCell`, `SupplierCell`;
- `api/orders.ts`, `api/decisions.ts`, `api/revisions.ts`, `api/workflow.ts`;
- every figure.

## 6. Backend

None. Disclosure is presentation over data the page already has: no C# change and no API contract change. In
particular, the lines must still be **fetched as they are today** (§4.1). If a requirement seems to need a backend
change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change. HD-002's 94 rows stay untouched.
- **Remove no provenance capability.** If meeting a requirement would drop a field, a column, a row action or the
  source dialog, STOP with `BLOCKED_HUMAN`.
- Do not change the counting paragraph's wording: move it, do not rewrite it.
- Do not put the disclosure state in the URL.
- Do not turn the collapse into a lazy fetch.
- Do not edit `ItemSourceDrawer.tsx` or `components/imports/labels.ts`, and do not swap `orderStatusLabels` for
  `workflowStatusLabels`, even though the words are identical (Assumption 7).
- Do not touch screens or sections owned by other tasks (§3, out of scope).
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants: MUST NOT CHANGE

- Every field of the source dialog:
  - file, import (number and status), sheet, Excel row, Excel total, calculated total, materialised date;
  - the raw / effective / canonical field table with its `qəsdən boş` and `düzəliş` markers;
  - the lineage block and the manually added note;
  - its `Modal` props (`dismissOnBackdrop`, `width="wide"`, title and subtitle).
- The line table's columns and their order, the card list's content, the search, the filter options
  (`Bütün sətirlər / Qiyməti olan sətirlər / Qiymət yoxdur`), the ordering, the server pagination (50 per page, the
  `Səhifə N / M · K sətir` line) and the row actions.
- Every figure on the page.
- The counting paragraph's text (`driverScopeLine`, Tasks 10 and 11b) and `productStateLine`'s place and text.
- The «Əsas dəyişikliklər» heading's accessible name, `ref` and scroll behaviour (Task 18).
- The requests the page makes: which endpoints, how many, and when. `fetchOrder`'s dependencies (`:211`) are the same.
- Task 17's dialog contract; Task 18's `cause`; Task 19's `product`; Task 1's `basis`.
- Task 2's price words; Task 5's (5.1) words; decision 9.1; 22a and 22b's `OrderStatusBadge` and wording.
- The old-terms sweep stays green, and it still sweeps the lines, now opened (§10).
- No backend, schema or data change.

## 9. Acceptance criteria

1. The order page opens with no line table, card list or `Mənbəyə bax` visible. In their place is one control,
   `Sətirlər` with the order's line count (`itemCount`). *(brief acceptance 1; 23.1)*
2. Activating that control reveals the section exactly as before: the search box, the filter select, every column,
   pagination when there are more than 50 lines, and a `Mənbəyə bax` control on every row (table and cards).
   *(brief acceptance 2; 23.2)*
3. A `Mənbəyə bax` control opens the source dialog with every field it showed before: file, import number, sheet,
   Excel row, the raw / effective / canonical columns, and the lineage when there is one. *(brief acceptance 3; §8)*
4. The counting paragraph is no longer rendered as body text under «Əsas dəyişikliklər». Its exact text is the
   content of the `InfoHint` beside the heading, which is hidden until the ⓘ is activated. *(brief acceptance 4; 23.3)*
5. On a real order, «Niyə dəyişib?» and the first rows of «Əsas dəyişikliklər» take materially less scrolling than
   before to reach. The page's default height is materially lower, measured by the operator before and after at
   `1440×900` (G-03). *(brief acceptance 5)*
6. With the section open, the three line filters behave exactly as before, and no row or figure is missing.
   *(brief acceptance 6)*
7. The disclosure control is a `button` inside the section's `h2`. It carries `aria-expanded`, which flips, and
   `aria-controls`, which names the element that holds the revealed content. *(§4.1)*
8. Opening, closing and reopening the section issue no request and change no query parameter. The state closes for a
   different order and survives a reload after an edit. *(§4.1, §6)*
9. No figure changed and no provenance field was removed. All suites and both builds are green, and the old-terms
   sweep passes and still covers the opened lines.

## 10. Required tests

Frontend (vitest). Give each test a doc comment naming its criterion, as the neighbouring tests do.

`pages/OrderDecisionPage.test.tsx` (the order-page test file at HEAD). Add a small helper, such as
`openLines(user)`, that clicks `getByRole('button', { name: /^Sətirlər/ })`. New tests:

- On first render, and after the order has loaded:
  - `queryByRole('table')` is null, `queryByRole('list', { name: 'Sətirlər' })` is null, and
    `queryAllByRole('button', { name: 'Mənbəyə bax' })` is empty;
  - the disclosure button exists, sits inside an `h2`, and its name includes the fixture's `itemCount` (for a fixture
    whose `itemCount` differs from the page's row count, the button shows `itemCount`);
  - it has `aria-expanded="false"`, and its `aria-controls` names an element in the document.
- After activating it:
  - `aria-expanded="true"`;
  - the table, with its ten column headers, is inside the controlled element;
  - there is one `Mənbəyə bax` per line in the table and one per card;
  - activating it again closes the section.
- Opening and closing change neither `location.search` nor the query-parameter set. Use the file's existing router
  harness.
- **No lazy fetch.** `fetchOrder`, `fetchDecisionContext` and `fetchRevision` call counts are the same before opening,
  after opening, after closing and after reopening. `fetchOrder` has been called once by the time the order is
  rendered collapsed.
- The filter select still offers exactly the three options. After opening, choosing `Qiymət yoxdur` calls `fetchOrder`
  with `hasPrice: false` and `page: 1`, as before. Closing and reopening keeps the chosen filter.
- **State scope.**
  - Navigating from one order to another, in the same mounted page, shows the second order collapsed.
  - For an editable version, the section opened and a line saved through `EditLineDialog` (`afterChange`) leaves the
    section open. The existing edit fixtures in `OrderRevisionPage.test.tsx` may host this instead.
- A source-dialog test (`:1360`) is updated to open the section first, and its assertions stay whole.

`components/decisions/DriverList.test.tsx`:

- The `driverScopeLine` string is **not** in any `<p>` of the section body. It is the text content of the
  `role="note"` element controlled by the `button` named `«Hamısı» nəyi sayır?`, and that element is `hidden` until
  the button is clicked and visible after.
- The `h2`'s accessible name is exactly `Əsas dəyişikliklər`.
- `productStateLine` is still rendered as body text.
- The chips, their counts and the rows are unchanged. The existing tests at `:400-416`, `:614` and `:620` stay as they
  are.

`components/orders/ItemSourceDrawer.test.tsx` (**new**; there is none at HEAD). Mock `fetchOrderItemSource` and render
the dialog. Add field-level assertions that list every label and value the dialog must render, so that a later change
dropping one fails here:

- for an imported line with a two-step lineage:
  - `Fayl`, `İdxal` (`#id · status`), `Vərəq`, `Excel sətri` (with the row number, for example `3142`),
    `Excel cəmi`, `Hesablanmış cəm`, `Sifarişə yazılıb`;
  - the four column headers `Sahə`, `Mənbə dəyəri (Excel-də)`, `Effektiv dəyər (sistem qəbul edir)` and
    `Kanonik qeyd`;
  - a corrected field with `düzəliş`, and an intentionally empty field reading `qəsdən boş`;
  - `Sətrin keçdiyi versiyalar`, `Cari sətir`, `Versiya 1`, the status word `Təsdiqlənib` and `· Excel sətri`;
  - the closing note;
- a manually added line: `manualItemSourceNote`, and no facts `dl`.

`terminology/oldTerms.test.tsx`, in the order-page sweep (`:979-1014`):

- Open the section before reading the card list at `:1001`, so the lines are still swept.
- Keep `expectNoOldTerms(container)` over the default state too.
- The scope-line assertion (`:994-996`) stays, and the hint's content is swept like the rest of the page.

Existing tests that reach the lines without opening the section change with this task (§2.5). Update each one to open
the section first, and list each in the report with the reason. Adding the open step is the whole change. **No
expectation may be weakened, and no test deleted.**

Backend: none. Run both suites to show nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. The 22a / 22b note still applies. If the running API locks
  `bin`, build into the session scratchpad with `--artifacts-path` and say so; that is not a failure.
- `dotnet test BaxOrders.slnx`: counts **unchanged from 22b's accepted totals, 1055 unit and 800 integration**, 0
  failed, 0 skipped.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  are green, with counts. The baseline is **60 files / 1266 tests**; the new count is 61 files with the new
  `ItemSourceDrawer.test.tsx`. `OrderDecisionPage.test.tsx:758` has one known one-off timeout (N-02 type). If it
  recurs, re-run and report both runs, as 22b did.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/` and the manual pack under
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

Prepare it, do not run it: `docs/audits/2026-qerar-zenciri/23-menbe-aciilisi.md`. Use the same row format as
`22-tarixi-tesdiq.md`, with each result line `---- operator doldurur ----`. The checks are:

- **G-01**: large order (Heydər Əliyev Mərkəzi, Sentyabr 2026), default state. No line table and no `Mənbəyə bax`;
  one `Sətirlər N` control, where N is the order's line count.
- **G-02**: small order, default state; the same.
- **G-03**: **page height before and after, at `1440×900`**. Record `document.documentElement.scrollHeight` for G-01's
  order on the previous build (`112c2d7`) and on this one, with the change list unexpanded. This is the evidence for
  criterion 5.
- **G-04**: activating the control. The table with all ten columns, the search and the filter; `aria-expanded` flips;
  activating it again closes it.
- **G-05**: an order over 50 lines. Pagination is present after opening, and `Səhifə 1 / 2 · N sətir` is unchanged.
- **G-06**: the three filters after opening, then close and reopen; the filter is kept.
- **G-07**: `Mənbəyə bax` opens «Mənbə» with file, import number, sheet, Excel row and the three value columns, plus
  the lineage on a corrected order.
- **G-08**: the ⓘ beside «Əsas dəyişikliklər». Its note shows the counting sentence word for word, and the
  `Artıb / Azalıb` line stays visible.
- **G-09**: the URL is unchanged by opening and closing, and the Network tab shows no request on opening.
- **G-10**: an editable correction version (coordinator). After opening, `Sətir əlavə et`, `Redaktə et` and `Sil`
  work, and the section stays open after a save.
- **G-11**: `390×844`. The cards are behind the same control, and the ⓘ note stays on screen.

Viewports are `1366×768 · 1440×900 · 390×844 · 1200×800`, and screenshots are named `<ID>-<ekran>-<en>.png`. State
plainly that the Coder performed no browser check. The running API needs **no restart**, because this is frontend
only.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Xam sətir cədvəli yığılmış olsun; bir açılışla görünsün. (Tələb 1, 23.1) | §4.1; criteria 1, 2 |
| Sətir-sətir mənbə keçidləri standart görünüşdə olmasın. (Tələb 2, 23.1) | §4.1 (B); criterion 1 |
| Excel sətir nömrələri, versiya məlumatı yığılmış olsun. (23.1) | §2.1: only inside «Mənbə», now two steps away; criterion 1 |
| Mənbə pəncərəsinin məzmunu dəyişməsin; heç bir imkan silinmir. (Tələb 3, 23.2) | §4.4, §8; criterion 3; `ItemSourceDrawer.test.tsx` |
| Alqoritm izahı başda durmasın; `InfoHint`-in arxasına keçsin. (Tələb 4, 23.3) | §4.2; criterion 4 |
| Səhifənin hündürlüyü azalsın. (Tələb 5) | §4.3; criterion 5; G-03 |
| Qəbul 1–6 | criteria 1–6 respectively |
| Toxunulmayanlar: dialog, sütunlar, süzgəclər, Task 2 sözləri, 9.1 | §3, §8 |
| Asılılıq: TASK-17 | §3, §8: the contract is inherited and not modified |

All six brief acceptance criteria are carried here. None is left to another part.

## 13. Provenance of this revision

The Planner revised the Product/UX draft of 2026-09-25 against `112c2d7` on 2026-09-26. No requirement of the draft
was dropped. The changes:

- §2 is verified with `file:line`. The pagination question is answered (server-side, 50 per page).
- §2 now records three facts the draft missed, and §4.1, §9 and §10 carry them:
  - the phone card list, with its own `Mənbəyə bax`;
  - the editable row actions that live inside the section;
  - the `itemCount` vs `totalCount` distinction.
- §2.3 separates the two lines under the heading. The draft quoted them as one paragraph; only the explanation moves
  (Assumption 5).
- §4.3 and criterion 5: the draft had the Coder record pixel heights, but the Coder has no browser. The measurement
  moves to the operator (G-03), and the in-suite evidence is structural.
- §11 is filled in with 22b's accepted totals.
- Assumptions 7–10 are added.

---

## Assumptions the Planner made

These are design decisions, not business rules, and each can be overturned at review.

1. Collapsed is the default for **everyone**, including operators, administrators and a coordinator on an editable
   correction. A role-aware or state-aware default would mean two pages to reason about and two sets of tests, and
   opening the section costs one click. Brief acceptance 1 names no exception.
2. The state is not persisted and not in the URL, so every reader gets the same page from the same link. It resets
   when a different order is shown, and it survives the page's own reload after an edit.
3. The collapse is presentation only: the lines are still fetched with the page. A lazy fetch would change the API
   call pattern and the page's loading states, which is a different task with different risks.
4. Provenance is **not** moved behind a permission. The audit found it out of place for a manager, not confidential.
   Hiding it by role is a separate decision the owner has not made.
5. Only `driverScopeLine` moves behind the ⓘ. `productStateLine` («Artıb: N · Azalıb: N · Xidmətlər: N») stays
   visible, for three reasons:
   - it holds figures, not an explanation of the counting rule (23.3 moves "alqoritmi izah edən abzas");
   - brief acceptance 6 keeps every figure in view where it was;
   - `InfoHint` takes a single string.
6. The disclosure is the section's own heading, `Sətirlər` plus the line count in the chips' grey-number style. It is
   not a separate button under an unchanged heading, which would say "Sətirlər" twice. The count is the whole order's
   `itemCount`, not the filtered `totalCount`, so it does not change when a filter is applied.
7. «Mənbə» stays a centred `Modal`. It is not moved to Task 19's `Drawer`, and its `orderStatusLabels` import is not
   swapped for `workflowStatusLabels`. The brief freezes the dialog, and both would be edits to it with no reader
   benefit.
8. The existing `WindowMonths` idiom (a chevron button with `aria-expanded`) is reused rather than a `<details>`
   element, because the section needs `aria-controls` and a region that holds nothing while closed. No new shared
   collapsible component is introduced for one call site.
9. The ⓘ's label is `«Hamısı» nəyi sayır?`, because it names the question the sentence answers.
10. The row actions (`Sətir əlavə et`, `Redaktə et`, `Sil`) go with the section rather than being lifted out of it.
    Lifting them out would be a new layout for the correction flow, which is Task 03's and not this brief's.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git: branch, HEAD, `git status --short`, `git diff --stat`.
1. Yığılma: the default state of the `Sətirlər` section, the heading button, `aria-expanded` / `aria-controls`, the
   state rule (a different order closes it; a reload keeps it open).
2. Mənbə: confirmation that no field was lost; that `ItemSourceDrawer.tsx` and `components/imports/labels.ts` are not
   in the diff; the new field-list test.
3. İzah abzası: where it moved and the hint's label; that the text did not change; that `productStateLine` stayed.
4. Hündürlük: the structural evidence (what the default DOM no longer contains). The pixel numbers are the operator's,
   G-03; the Coder does not measure them.
5. Yükləmə davranışı: the lines still load with the page, the request counts did not change, and there is no lazy
   fetch.
6. Testlər: the new tests (including the source field-list test); each changed test with its reason; counts before
   and after; the builds.
7. Əl ilə yoxlama dəsti: the file and the check IDs G-01 … G-11; the Coder did not check in a browser.
8. Toxunulmayanlar: columns, filters, row actions, figures, URL, database, backend, data.
9. Sonrakı tapşırıqlar üçün qeydlər:
   - hiding by role is the owner's decision and has not been made;
   - `orderStatusLabels` is still a second copy of `workflowStatusLabels`;
   - any defect found in Task 10's paragraph.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
