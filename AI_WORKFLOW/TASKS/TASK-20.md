# TASK 20 — KLİK AFFORDANSI (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-20.md` — the owner's settled requirement, with decisions 20.1, 20.2 and 20.3 in
`BRIEFS/OWNER_BRIEFS_MASTER.md`:814–816. The brief decides *what* and *why*; this file decides *how*. Where this file
and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** Five components, one shared interaction module and their tests.
Specification status: **READY.** Drafted by the Product/UX planning agent on 2026-09-25; completed by the Planner on
2026-09-26 against HEAD `899b005` (Task 19's accepted commit). §2 is verified line by line; the draft's corrections
are listed in §2.7.

This task changes **frontend presentation and interaction only**: which surfaces are clickable and how an
interactive element announces itself. It changes no figure, no visible wording, no ordering, no colour meaning, no
API and no database. There is no data-migration marker in this file, on purpose.

---

## 1. Context

The brief's goal: "İnteraktiv olan element interaktiv görünsün; olmayan görünməsin."

The audit recorded three dead clicks on the dashboard before finding the real control. It also found capabilities no
reader would discover: the product name on the order page opens the history but is rendered as ordinary black text,
and the averages under the headline are buttons that nothing marks as such. Both failures are the same failure in
opposite directions.

Tasks 07 and 09 own what the dashboard cards say and which objects they choose. This task owns only **where a click
lands and how an element signals that it can be clicked**. It changes no card's content and no card's selection.

## 2. Verified current behaviour (repository at `899b005`)

Paths are under `frontend/bax-orders-web/src/`.

### 2.1 Dashboard attention cards

- Each card is an `<article id={`attention-${row.locationId}`}>` with `rounded-lg border border-slate-200 bg-white p-4`
  and no hover, cursor or focus style (`components/dashboard/AttentionSection.tsx`:97).
- The title line is plain text. On a `StrongPercentageChange` card it also holds an `InfoHint` ⓘ, which is a
  `<button>` (`AttentionSection.tsx`:98–104; `components/analytics/InfoHint.tsx`:76–88).
- The object name is a plain `<p className="mt-0.5 font-medium text-slate-900">` (`AttentionSection.tsx`:105). So the
  heading and the body are inert, which is the audit's dead click.
- The direction sentence `costDirectionSentence(caption, delta)` sits under the difference (`AttentionSection.tsx`:123;
  `terminology/terms.ts`:89–96). It reads, for example, `Keçən aya görə xərc artıb`.
- The "Əsas səbəb" caption (`AttentionSection.tsx`:156), the causes, the product line and the ⚠ mark are all plain
  text. The ⚠ mark carries its sentence only as `title` and `aria-label` (`components/dashboard/MissingPriceMark.tsx`:23–27).
- The only link is `DetailsLink`, at the bottom of the card (`AttentionSection.tsx`:129–131, component :211–238):
  - `to` is `orderLink(currentRequestId, selection)`, or `locationLink(locationId, selection)` when
    `currentRequestId === null` (:221–223). The basis is carried either way.
  - The accessible name is `${row.locationName} · ${detailsLabel}` (:228); `detailsLabel = 'Detallara bax'`
    (`components/dashboard/labels.ts`:231).
  - It is styled as a bordered button with `hover:bg-slate-50` (:230–232).
- `AttentionSection.test.tsx`:264–270 already asserts exactly one link per card.

### 2.2 Dashboard location rows

`components/dashboard/LocationRows.tsx` renders two layouts. The table is shown from `lg` up (:65) and the phone list
below `lg` (:187). Both are in the DOM at all times; CSS hides one of them.

- **Table.**
  - Each row is `<tr id={`row-${row.locationId}`} className="hover:bg-slate-50">` (:84). So the row changes on hover
    but is **not** clickable, which is a live breach of 20.3.
  - The object name is a plain `<p>` inside `<th scope="row">` (:85–87).
  - The only link is `DetailsLink compact`, in a seventh, right-hand cell (:134–137). Its column header is the sr-only
    `Detallar` (:78).
  - The footer's last cell is `colSpan={3}` (:178); it spans "Əsas səbəb", "Məlumat vəziyyəti" and that seventh column.
- **Phone list.**
  - Each row is a bordered `<li id={`row-${row.locationId}-phone`}>` card (:190). The name is plain text (:193).
  - `DetailsLink compact` sits at the bottom, under a divider (:218–220).
  - The closing summary `<li>` (:225–248) has no link.
- **Every row has a destination today.** `DetailsLink` is rendered unconditionally. A row with no order this month,
  including a never-ordered one (`Sistemdə hələ sifarişi yoxdur`, `coverage/labels.ts`:34), links to
  `/locations/{id}?basis=…`.
- `LocationRows.tsx`:15 imports `DetailsLink` from `AttentionSection.tsx`.

### 2.3 Where Back returns to

`navigation/useScrollMemory.ts` listens for clicks on the page root (`pages/ManagementDashboardPage.tsx`:188). When a
click's target is inside an `<a>`, it records `link.closest('[id^="attention-"], [id^="row-"]')?.id` as the anchor
(`useScrollMemory.ts`:13, :80–87). It records nothing for a click whose target is not inside a link. So whatever opens
a card or a row must end in a click on an `<a>` inside that card or row.

### 2.4 The order page's hidden interactions

- **The product row.**
  - In `components/decisions/DriverList.tsx` each product is one full-width `<button>` calling `onHistory(driver)`,
    already with `hover:bg-slate-50` and a `focus-visible` outline (:150–154).
  - The product name inside it is a plain `<span className="font-medium text-slate-900">` (:157). Nothing on the name
    says it opens anything.
  - Tests find the row by `getByRole('button', { name: /Zibil paketi/ })` (`DriverList.test.tsx`:211 and others).
- **The other bases.**
  - `components/decisions/DecisionHeadline.tsx` renders them in `<dl aria-label="Digər müqayisə bazaları">`
    (:156–165).
  - `Secondary` (:244–277) puts the basis name in a `<dt>` (:253) and, when available, the amount and the delta in a
    `<button>` that calls `onSelect({ basis, from: null, to: null })` (:256–270). That is the page's `setSelection`,
    which writes `basis` to the URL.
  - The button's only styling is `rounded hover:underline` plus a `focus-visible` outline (:259). At rest it looks like
    text, and the basis name beside it is not part of it.
  - An unavailable basis shows `—` as plain text (:271–273).
  - No existing test clicks this button. The picker's own buttons are found by exact name, e.g.
    `getByRole('button', { name: 'Son 6 ayın ortalaması' })` (`pages/OrderDecisionPage.test.tsx`:1884).

### 2.5 Accepted neighbours this task must not disturb

- **Task 18's stretched reason button.**
  - `CauseSummary.tsx`:300–315: a reason with a list is a `relative cursor-pointer` row whose button draws its layer
    and focus outline with `before:`. Inert reasons get no hover.
  - The primary row's "Əsas səbəb" caption is at `CauseSummary.tsx`:169.
- **Task 19's product drawer.** It is opened by `DriverList`'s `onHistory(driver)`.

### 2.6 What must not be mistaken for noise

Each attention card carries the direction sentence of §2.1. It is decision **9.1**'s non-colour carrier (Task 06 §4.3:
"Colour is never the only carrier"; `OWNER_BRIEFS_MASTER.md`:861). It is **not** redundant text and is not removed.

### 2.7 Corrections to the draft

| Draft said | Repository says | This file now |
|---|---|---|
| §4.2: rows with no destination stay inert; criterion 6: the object with no order is not a tab stop | Every row has a link today, a no-order row to `/locations/{id}` (§2.2) | Every row becomes a surface. Its destination is unchanged, and none is inert (§4.2) |
| §2.3: the product row is a button "styled as a heading" | It is a list row with hover and focus already; only the **name** is inert-looking (§2.4) | §4.4 marks the name, and leaves the row's button as it is |
| §4.5 / criterion 7: unify `Bax` (Obyektlər page) with `Detallara bax` | `LocationsPage.tsx`:213–220 does say `Bax`, but the brief does not name that page, and brief acceptance 7 forbids text changes | **Removed from scope** (§3); noted for a later task (§12) |
| §4.1: link name "object — card title" | The current name `${locationName} · Detallara bax` is accepted wording, and six existing tests rely on it | The name is kept (§4.1, assumption 4) |
| §10: `DecisionHeadline.test.tsx` | No such file; the headline's tests live in `OrderDecisionPage.test.tsx` | Tests go there (§10) |
| §4.1: the whole card becomes one `Link` element | The ⓘ on a percentage card is a `<button>`, and a button inside `<a>` is invalid nesting | The card is a **surface** that forwards a click to its one link (§4.0) |

## 3. Scope

In scope:

- A. the whole attention card opens its object (20.1);
- B. the whole dashboard location row opens its object, in the table and in the phone list (20.2);
- C. the product name in "Əsas dəyişikliklər" looks interactive (brief requirement 3);
- D. the secondary basis summaries look and behave like buttons (brief requirement 4);
- E. one shared rule: interactive elements change on hover and focus, and inert text never does (20.3);
- F. tests and the manual pack.

Out of scope:

- which objects get a card, the card's order, its labels and its figures — **Tasks 07 and 09**;
- the type scale, the delta's prominence, the cohort split and the baseline-coverage indicator — **Task 21**;
- the monthly report's rows and cells — **Task 24**;
- the location detail page's duplicate controls — **Task 24**;
- the Obyektlər directory (`pages/LocationsPage.tsx`): its `Bax` verb and its hover-only rows (§12);
- the cause rows' interactivity — **Task 18**, already done;
- the drawer and the dialog contract — **Tasks 17 and 19**;
- adding navigation to anything that has no destination today (the trend bars are Task 24's).

## 4. Required behaviour

### 4.0 The shared interaction module (E)

Create `components/interaction.ts`. It sits beside `components/analytics/format.ts`, where Task 06 put its shared
presentation helpers. It exports the following; the class strings are given so that tests can assert them.

```ts
/** Marks the one link a card or row opens. The surface finds it by this attribute, and so does the focus ring. */
export const surfaceLinkAttribute = { 'data-surface-link': '' } as const

/**
 * A card or a row that opens what its one link opens. It forwards a plain click anywhere on it to that link, so the
 * link — never the surface — navigates, and Back's scroll memory sees a click on an <a> (useScrollMemory).
 * It ignores:
 * - a click the page already handled (`defaultPrevented`);
 * - any button but the main one, and any click with Ctrl, Meta, Shift or Alt;
 * - a click inside a, button, input, select, textarea, label, summary, [role="button"] or [role="note"], because
 *   that element's own behaviour wins;
 * - a click that ends a text selection inside the surface.
 */
export function openSurfaceLink(event: React.MouseEvent<HTMLElement>): void
// → event.currentTarget.querySelector<HTMLAnchorElement>('a[data-surface-link]')?.click()

/** Card-shaped surface (bordered): the attention card and the phone row. */
export const interactiveSurfaceClass =
  'cursor-pointer hover:border-slate-300 hover:bg-slate-50 '
  + 'has-[[data-surface-link]:focus-visible]:outline-2 has-[[data-surface-link]:focus-visible]:outline-offset-2 '
  + 'has-[[data-surface-link]:focus-visible]:outline-slate-900'

/** Table-row surface. Outlines on <tr> are unreliable, so the row changes background and the link wears the ring. */
export const interactiveRowClass = 'group cursor-pointer hover:bg-slate-50 has-[[data-surface-link]:focus-visible]:bg-slate-50'

/** The link inside a card surface: no ring of its own, because the card wears it. */
export const surfaceLinkClass = 'focus-visible:outline-hidden'

/** The link inside a table row: its own ring. */
export const rowLinkClass = 'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'

/** The visible handle of a surface or a button — the name — underlines when its surface is hovered or focused. */
export const interactiveTextClass = 'underline-offset-2 group-hover:underline group-focus-visible:underline'
```

- Surfaces that use `interactiveTextClass` also carry `group`: add it next to `interactiveSurfaceClass` where needed.
  `interactiveRowClass` already includes it.
- **Resting colours do not change** (brief acceptance 7). Hover, focus and the cursor are the only new states.
- **No `transition-*` or `animate-*`.**
- `has-[[data-surface-link]:focus-visible]` must reach the built CSS. After `npm run build`, grep
  `frontend/bax-orders-web/dist/assets/*.css` for `data-surface-link` and quote the matching rule in the report.
  - If Tailwind does not emit it, use the arbitrary-variant form
    `[&:has([data-surface-link]:focus-visible)]:outline-2` (same for the other two), and say which form landed.
  - Do not fall back to `focus-within`: it would ring the card when its ⓘ is focused.

The component files change only to apply these.

### 4.1 The attention card (A — 20.1)

In `AttentionSection.tsx`'s `Card`:

- The `<article>` keeps `id={`attention-${row.locationId}`}` and every existing class. It adds `group`,
  `interactiveSurfaceClass` and `onClick={openSurfaceLink}`.
- The object name (:105) becomes the card's **only** link: a `<Link>` inside the existing `<p>`, with:
  - `{...surfaceLinkAttribute}`;
  - `to` = exactly today's destination (§2.1);
  - `aria-label={`${row.locationName} · ${detailsLabel}`}`, today's accessible name, unchanged;
  - `className` = `surfaceLinkClass` + `interactiveTextClass`.
  The `<p>`'s own classes are unchanged, so the name looks the same at rest.
- The bottom "Detallara bax →" control stops being a link. It becomes a **visual cue only**:
  - an `aria-hidden="true"` `<span>` in the same place, with the same text and arrow and the same classes as today's
    non-compact `DetailsLink`;
  - no `hover:bg-slate-50` of its own; `group-hover:border-slate-300` is allowed;
  - not focusable.
  Clicking it opens the order, because it is part of the card surface.
- The ⓘ on a percentage card stays a `<button>`, and stays where it is. `openSurfaceLink` ignores clicks on it and on
  its open note. It is not a link, so 20.1's "ikinci keçid" does not apply to it (assumption 3).
- The direction sentence, the title, the figures, the causes, the product line and the ⚠ mark are unchanged, element
  by element and class by class.
  - Their own classes gain nothing: no `hover:`, `group-hover:` or `cursor-` on any of them. Only the surface changes
    under the cursor (§4.3).
  - The ⚠ mark's `title` tooltip keeps working, because nothing covers it.
- Update the two comments that say "Detallara bax" opens the order (:189–191 and the `DetailsLink` doc) so that they
  say the card does. This is not a behaviour change.

### 4.2 The location row (B — 20.2)

**Table.**

- Each `<tr>` keeps `id={`row-${row.locationId}`}`. It adds `interactiveRowClass` and `onClick={openSurfaceLink}`,
  replacing its bare `hover:bg-slate-50`.
- The object name in the `<th>` becomes the row's only link: `{...surfaceLinkAttribute}`, the same `to`, the same
  `aria-label` as today, and `className` = `rowLinkClass` + `interactiveTextClass`. The `<p>`'s classes are unchanged.
- **The seventh column goes** (20.2: "keçid sətrin sağ kənarında bir düymə olaraq qalmır"):
  - the sr-only `Detallar` header (:78);
  - the right-hand cell (:134–137);
  - the footer's last cell goes from `colSpan={3}` to `colSpan={2}` (:178), so the footer still spans the table.
- **Every row** is a surface, because every row has a destination today (§2.2). No row is inert, and none changes its
  destination.

**Phone list** — the same treatment as the attention card:

- each row `<li>` keeps `id={`row-${row.locationId}-phone`}` and adds `group`, `interactiveSurfaceClass` and
  `onClick={openSurfaceLink}`;
- its name becomes the only link (card-style: `surfaceLinkClass` + `interactiveTextClass`);
- its bottom "Detallara bax" becomes the `aria-hidden` visual cue, in its `compact` size, with the divider kept.

The closing summary `<li>` is not a surface and gets none of this.

**Code shape.** Replace the exported `DetailsLink` component with two exports that both files import. A small module
`components/dashboard/details.tsx` is suggested; `AttentionSection.tsx` is also acceptable.

- `detailsTarget(row, selection): string` — the destination logic of :221–223, verbatim;
- `DetailsCue({ compact })` — the visual cue.

### 4.3 The interaction rule (E — 20.3; brief acceptance 5)

- **Interactive elements in scope, and what each gains.**
  - the attention card and the phone row: the surface hover (border and background), a pointer cursor, a focus ring
    around the surface, and the name underlines;
  - the table row: background and pointer on hover; background plus a ring on the name link on keyboard focus; the
    name underlines;
  - the product row: the name underlines and a history marker (§4.4);
  - the secondary basis: the button look (§4.5).
- **Inert text gains nothing.** No element that is not itself a control or a surface gets `hover:`, `group-hover:`,
  `cursor-pointer` or a focus style:
  - the "Əsas səbəb" caption: the card's (:156), the table header (:76) and the order page's (`CauseSummary.tsx`:169);
  - the card title and the cause lines;
  - the amounts and the delta on the card and the row, and the order headline's amount, `Baza` and `Fərq`
    (`DecisionHeadline.tsx`:69–71, :126–138);
  - the direction sentence and the ⚠ mark;
  - the unavailable basis `—` (:271–273);
  - the table's header and footer, and the phone list's summary card.
- **How brief acceptance 5 is read.** Inside a surface that 20.1 or 20.2 makes clickable, hovering an inert text
  changes the *surface* (it is part of the click area, by the owner's own 20.1). The text itself changes neither its
  colour, its underline nor its weight. Outside a surface, nothing changes at all.
  - Task 18's reason rows are already surfaces under 18.1 and stay exactly as accepted.
  - This reading is recorded as assumption 1.
- Every focus state is an outline of at least 2 px, so it is carried by shape as well as colour.

### 4.4 The product name (C)

`DriverList.tsx`'s product row stays a single `<button type="button" onClick={() => onHistory(driver)}>`, so Task
19's URL, Back and focus-return behaviour stay exactly as accepted. The changes are:

- the button adds `group` and `aria-haspopup="dialog"`, so a screen reader says it opens a dialog. Its accessible name
  is unchanged — its full content — so the tests that find it by product name still pass;
- the name `<span>` (:157) adds `interactiveTextClass`. Its resting classes stay `font-medium text-slate-900`;
- right after the name, inside the same `<p>`, add lucide's `History` icon:
  - `aria-hidden="true"`;
  - `className="size-3.5 shrink-0 text-slate-400 group-hover:text-slate-700"`.
  It says "this opens its history" without a new word;
- the row's pill, description, change lines, split and amount are unchanged, element by element.

### 4.5 The secondary basis summaries (D)

In `DecisionHeadline.tsx`'s `Secondary`, **only when `comparison.available`**:

- The wrapping `<div>` becomes the button's visual box:
  `relative flex items-baseline gap-1.5 rounded-md border border-slate-200 px-2 py-0.5 cursor-pointer
  hover:border-slate-300 hover:bg-slate-50`. The `<dt>`/`<dd>` structure and the `dl` stay.
- The `<button>` keeps its `onClick`, which calls `onSelect({ basis, from: null, to: null })`, verbatim. The changes
  are these:
  - It adds a layer over the whole box, Task 18's technique with `after:` instead of `before:`:
    `after:absolute after:inset-0 after:rounded-md focus-visible:outline-hidden focus-visible:after:outline-2
    focus-visible:after:outline-offset-1 focus-visible:after:outline-slate-900`.
    A click on the basis name therefore selects the basis too.
  - It keeps `hover:underline` on its own text.
  - Its accessible name becomes the whole line: `aria-labelledby={`${termId} ${buttonId}`}`, with both ids from
    `useId()`, the `<dt>` carrying `termId` and the button carrying `buttonId`. That gives, for example,
    `Son 6 ayın ortalaması 17.583,62 ₼ −…`. No new word.
- When a basis is unavailable, its `<div>` keeps today's classes, its `—` stays plain, and it gets no border, hover or
  cursor.
- The amounts, the delta colours (9.1) and the `(2/3 ay)` note are unchanged.
- The picker's buttons keep their exact names. `'Son 6 ayın ortalaması'` as an exact string does not match the new
  longer name, so `OrderDecisionPage.test.tsx`:1884 is unaffected. A regex query written by this task must be scoped
  to the `Digər müqayisə bazaları` list.

### 4.6 Nothing else changes

- No figure changes.
- No visible text changes, apart from the dashboard table losing its `Detallara bax` buttons, which 20.2 requires.
- No ordering changes, and no colour meaning changes.
- No resting colour changes, and no change in spacing that alters how many cards fit on a screen.

## 5. Frontend requirements — summary for the Coder

Changed (expected):

- `components/interaction.ts` (new) and `components/interaction.test.tsx` (new);
- `components/dashboard/AttentionSection.tsx`, `components/dashboard/LocationRows.tsx`, and the optional
  `components/dashboard/details.tsx`;
- `components/decisions/DriverList.tsx` and `components/decisions/DecisionHeadline.tsx`;
- tests: `AttentionSection.test.tsx`, `LocationRows.test.tsx`, `DriverList.test.tsx`, `OrderDecisionPage.test.tsx`,
  `ManagementDashboardPage.test.tsx`;
- the manual pack (§11).

Not changed:

- `navigation/useScrollMemory.ts`, `analytics/basisParams.ts` and `components/dashboard/labels.ts` (`detailsLabel`
  stays);
- `coverage/labels.ts`, `terminology/terms.ts` and `analytics/format.ts`'s colour helpers;
- `CauseSummary.tsx` and `causeFilter.ts` (Task 18);
- `Modal.tsx`, `Drawer.tsx`, `TrendModal.tsx`, `pages/OrderDetailPage.tsx` and `analytics/decisionParams.ts`
  (Tasks 17 and 19);
- `pages/LocationsPage.tsx`, the monthly report and the location detail page.

## 6. Backend

None. Click surfaces and focus styling are presentation over data the API already returns. No C# change and no API
contract change. If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change; HD-002's 94 rows are untouched.
- No figure changes, and no change to which object is shown where.
- Do not remove the direction sentence of §2.6. It is decision 9.1's non-colour carrier. If it looks redundant, that
  is not a reason; leave it.
- **Do not nest interactive elements.** No `<button>` inside an `<a>`, and no `<a>` inside an `<a>`. If a surface cannot
  be made one target without nesting, STOP and report.
- Do not change a destination or a `basis` query, and do not change an anchor id.
- Do not touch the screens owned by Tasks 21–24, or `LocationsPage.tsx` (§3).
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- Every amount, delta, percentage and count on the dashboard and on the order page.
- Which objects get a card and in what order (Task 09); the card titles (Task 07).
- Decision 9.1: `costDirectionToneClass` / `costDirectionBarClass`, the legend, `DirectionWord`, and **the direction
  sentence on each card**.
- `id={`attention-${locationId}`}`, `id={`row-${locationId}`}` and `id={`row-${locationId}-phone`}`, because
  `useScrollMemory` restores to them. Back from an opened card or row still returns to it.
- The destination of every existing link, including its `basis` / `from` / `to` query.
- The accessible name `<object> · Detallara bax` of the dashboard's object links.
- Task 18: the reason rows' stretched buttons, `aria-pressed`, the ⓘ wrapper without a z-index, and the inert reasons
  without hover.
- Task 19: the product row's single `<button>` and its `onHistory(driver)`; the drawer's URL, Back and focus return.
- Task 17: `Modal`'s keyboard and focus contract.
- Task 2's price words; Task 5's (5.1) product words; the old-terms sweep stays green.
- No backend, schema or data change.

## 9. Acceptance criteria

1. A plain click anywhere on an attention card — heading, body, whitespace, the "Detallara bax" cue — opens that
   object's order page with the current basis. An object with no order this month opens `/locations/{id}` with it.
   The card contains exactly one link. *(brief acceptance 1; 20.1)*
2. A plain click anywhere on a dashboard table row, and on a phone row, opens the destination the right-hand control
   opened before. Each row contains exactly one link, and the table has no right-hand button column. *(brief
   acceptance 2; 20.2)*
3. The product name in "Əsas dəyişikliklər" underlines when its row is hovered or focused. It carries a history
   marker, and the row announces that it opens a dialog. Clicking it still opens the drawer exactly as in Task 19.
   *(brief acceptance 3)*
4. `Son 6 ayın ortalaması 17.583,62 ₼ …` has a button's box at rest and changes on hover. Clicking it — on the name or
   on the figure — switches the basis and writes it to the URL, as before. An unavailable basis has no box. *(brief
   acceptance 4)*
5. Hovering the "Əsas səbəb" caption, a part name, an amount or a card's direction sentence changes nothing about that
   text itself; the elements listed in §4.3 carry no hover, cursor or focus class. *(brief acceptance 5, read as in
   §4.3)*
6. Tabbing through the dashboard stops once per card and once per row, in visual order, with a visible focus ring. The
   one extra stop is the ⓘ on a percentage card, which is not a link. *(brief acceptance 6)*
7. Every figure, every card's position, every destination and every anchor id is unchanged. The direction sentence is
   still on every card that has a difference. Back from a card or a row returns to it. *(brief acceptance 7; decision
   9.1)*
8. A click that ends a text selection inside a card or row does not navigate. A Ctrl, Meta or middle click on the
   body does nothing, while the same on the name link behaves as a normal link. *(§4.0)*
9. The monthly report, the location detail page, the Obyektlər page and the order page's other sections are
   unchanged. All suites and both builds are green, and the old-terms sweep passes.

## 10. Required tests

Frontend (vitest). Counts at HEAD: **57 files / 1101 tests**.

- **New** `components/interaction.test.tsx`, for `openSurfaceLink` on a small rendered surface inside `MemoryRouter`:
  - a click on plain text inside it navigates to the link's `href`;
  - a click on an inner `<button>` or `[role="note"]` does not navigate, and the button's own handler runs;
  - a click with each of Ctrl, Meta, Shift and Alt, a non-main button, or `defaultPrevented` does not navigate;
  - a click while a non-collapsed selection is inside the surface does not navigate (`document.createRange` plus
    `getSelection().addRange`);
  - the forwarded click's target is the `<a>`, which is what `useScrollMemory` needs.
- `components/dashboard/AttentionSection.test.tsx`:
  - each card has exactly one link, carrying `data-surface-link`, and no `<button>` or `<a>` inside it;
  - the `href` is unchanged, `basis` included, including `/locations/{id}?basis=…` for a card with no current order;
  - the accessible name is `<name> · Detallara bax`;
  - a click on the title, on the "Əsas səbəb" caption and on the amount each navigates;
  - the "Detallara bax" cue is present, `aria-hidden` and not a link;
  - the `<article>` carries `interactiveSurfaceClass`;
  - `expectInert` (below) holds for the title, the "Əsas səbəb" caption, the amount, the delta, the direction
    sentence and the ⚠ mark;
  - the direction sentence is still rendered on every card with a difference;
  - on a percentage card, clicking the ⓘ opens its note and does not navigate;
  - the `attention-{id}` id is unchanged.
- `components/dashboard/LocationRows.test.tsx`:
  - one link per table row and per phone row, with unchanged `href`s and names;
  - a click on a table row's amount cell, and on a phone row's amount, navigates;
  - a no-order row and a never-ordered row are surfaces and go to `/locations/{id}?basis=…`;
  - the footer and the phone summary are not surfaces;
  - the ids are unchanged.
- `components/decisions/DriverList.test.tsx`:
  - the row is still exactly one `button`, found by its product name, with `aria-haspopup="dialog"`;
  - the name carries `interactiveTextClass` and its resting classes are unchanged;
  - an `aria-hidden` icon follows the name;
  - a click calls `onHistory` with the driver;
  - pills, figures and colours are unchanged.
- `pages/OrderDecisionPage.test.tsx`, in the headline's describe:
  - within `Digər müqayisə bazaları`, an available basis is a button named `<basis name> <amount> <delta>`;
  - clicking it writes `basis` to the URL and re-fetches with that basis;
  - its box has the border and hover classes;
  - an unavailable one has no button and no box;
  - the figures and the 9.1 colours are unchanged;
  - the headline's amount, `Baza` and `Fərq` pass `expectInert`;
  - Task 19's drawer tests still pass unchanged.
- `pages/ManagementDashboardPage.test.tsx`:
  - keyboard order: tab through the attention region and the table, scoped to them, since jsdom does not apply
    `lg:hidden`. That gives one stop per card, the ⓘ before its card's link on a percentage card, and one stop per
    row, in DOM order equal to the visual order;
  - a click on a card body opens the order, and Back restores `attention-{id}` (extend the existing test at :697–700
    with a body click);
  - the figures rendered are identical to the accepted expectations.
- **`expectInert(element, surface?)`** is a small test helper. It asserts that neither the element nor any ancestor
  below `surface` has a class matching `/(^|\s|:)(hover|group-hover|focus|focus-visible|cursor)[-:]/`. Put it in
  `test/` beside the existing helpers if there is a natural home, otherwise in `interaction.test.tsx`, exported.
- **Existing tests that change**, each to be listed in the report with its reason:
  - `LocationRows.test.tsx`:145 — the header list loses `'Detallar'` (20.2);
  - `LocationRows.test.tsx`:203–210 — "keeps Detallara bax on one line" loses its subject. Replace it with an
    assertion that there is no right-hand button column and that the footer's last cell spans 2;
  - the comment in `AttentionSection.test.tsx`:264's title may be reworded; its assertions stay.
  No other expectation may be changed or weakened to pass.

Backend: none. Run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors.
- `dotnet test BaxOrders.slnx` — **1046 unit / 785 integration**, unchanged from Task 19.
  - If the running API locks `bin`, use `--artifacts-path` under the scratchpad, as Tasks 17–19 did, and say so.
- `npm run --prefix frontend/bax-orders-web test` — green, with counts: at least 58 files, more than 1101 tests.
- `npm run --prefix frontend/bax-orders-web build` — clean. Quote the built-CSS rule of §4.0.
- `git status` and `git diff --stat` show changes only under `frontend/bax-orders-web/src/` and
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

Prepare, do not execute: `docs/audits/2026-qerar-zenciri/20-klik-affordansi.md`.

- Same form as the 17–19 packs: checks **D-01 … D-15**, each result line `---- operator doldurur ----`.
- Cover:
  - clicks on a card's heading, body, whitespace and cue;
  - clicks on a row's name, middle and whitespace, in the table and on a phone;
  - hover on each inert element of criterion 5;
  - tab order and focus-ring visibility on cards and rows;
  - the ⓘ on a percentage card;
  - a text selection on a card;
  - Ctrl-click on a name;
  - the product-name hover and marker;
  - the secondary-basis box and its click;
  - Back to the opened card or row.
- Viewports `1366×768 · 1440×900 · 390×844 · 1200×800`. At `390×844`, record whether a phone row's tap target is
  comfortable, and whether any inert text now looks tappable.
- Screenshots `<ID>-<ekran>-<en>.png`.
- State plainly that the Coder performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Req. 1 / 20.1 — kartın bütün səthi bir klik sahəsi; içində ikinci keçid yox | §4.0, §4.1; criterion 1 |
| Req. 2 / 20.2 — cədvəl sətri bütövlükdə klik edilir; sağ kənardakı düymə qalmır | §4.2; criterion 2 |
| Req. 3 — məhsul adı interaktiv görünür | §4.4; criterion 3 |
| Req. 4 — ortalama sətirləri düymə kimi görünür | §4.5; criterion 4 |
| Req. 5 / 20.3 — interaktiv hover/fokusda dəyişir, inert dəyişmir | §4.0, §4.3; criteria 5, 6 |
| Req. 6 — klaviatura ilə əlçatan, fokus həlqəsi görünür | §4.0; criterion 6 |
| Acceptance 1–7 | Criteria 1–7 |
| Toxunulmayanlar — 9.1-in rəngləri və sözləri, kartların seçimi və sırası, "Əsas səbəb", rəqəmlər | §2.6, §7, §8; criterion 7 |

**Notes for later tasks.** These are not done here and not decided here:

- The Obyektlər directory's rows have `hover:bg-slate-50` without being clickable (`LocationsPage.tsx`:157).
- Each directory row has two links to the same place, the name and `Bax` (:158–161, :213–220).
- Both breach 20.3 in the same way the dashboard table did. They are for the Coordinator to place (Task 24's
  one-control rule is the nearest owner).

---

## Assumptions the Planner made

These are design decisions, not business rules; each can be overturned at review.

1. Brief acceptance 5 is read together with 20.1. Inside a card or row, which 20.1 and 20.2 make wholly clickable,
   the surface changes on hover and the inert text itself does not. Outside a surface, nothing inert changes. The
   other reading — card text not clickable — would contradict 20.1's "bütün səthi".
2. The card and row forward a click to their one real link (`openSurfaceLink`) rather than using an overlay
   (stretched link). This keeps the ⓘ clickable without a z-index (Task 18's reason for avoiding one), keeps the ⚠
   mark's tooltip, allows text selection, and works the same on a `<tr>`.
3. The ⓘ on a percentage card stays. It is a button that explains, not a second link, and removing it would drop
   accepted content. It is the one extra tab stop.
4. The link's accessible name stays `<object> · Detallara bax`. It is accepted wording, it says what the link does,
   and existing tests rely on it.
5. The card's and phone row's "Detallara bax" stays visible as a non-link cue (`aria-hidden`). Brief acceptance 7
   forbids text changes, and the cue tells a touch reader the card opens. Only the table's right-hand buttons are
   removed, because 20.2 names them.
6. The name is the link's visible text, because it is what a reader aims at (brief acceptance 2).
7. Focus rings use `focus-visible` and `:has()`: a card's ring for its link and not for its ⓘ. A table row shows a
   background plus a ring on its name, because outlines on `<tr>` are not reliable across browsers.
8. Modifier and middle clicks on a surface's body do nothing. They work on the name link, which is a real `<a>`.
9. The product row is marked with lucide's `History` icon and `aria-haspopup="dialog"` rather than a new word, and
   its accessible name is unchanged, so no text and no test name moves.
10. The secondary basis's whole line — name and figure — becomes the button target, using Task 18's layer technique,
    and its accessible name joins the two existing texts through `aria-labelledby`.
11. `LocationsPage`'s verb and its row hover are left alone: the brief does not name that page, and acceptance 7
    forbids text changes (§12).

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Klik sahələri — kart, cədvəl sətri, telefon sətri: nə dəyişdi, keçid sayı, ünvanların və id-lərin eyni qaldığı,
   `openSurfaceLink`-in nəyi nəzərə almadığı.
2. Görünən interaktivlik — `interaction.ts`-in sinifləri, harada tətbiq olundu, harada qəsdən tətbiq olunmadı; qurulmuş
   CSS-dən `data-surface-link` qaydası.
3. Gizli interaksiyalar — məhsul adı və ortalama sətirləri; əlçatan adlar.
4. Qəbul 5-in oxunuşu — səth və inert mətn (§4.3).
5. 9.1 — istiqamət cümləsinin saxlanıldığının təsdiqi.
6. Testlər — yeni testlər; dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar; build-lər.
7. Əl ilə yoxlama dəsti — fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb.
8. Toxunulmayanlar — rəqəmlər, kartların seçimi və sırası, ünvanlar, anchor id-ləri, baza, Task 17/18/19, backend.
9. Sonrakı tapşırıqlar üçün qeydlər — 21 (eyni komponentlərə toxunur, bu commit üzərində yazılmalıdır), 24 (obyekt
   səhifəsi, trend sütunları, `LocationsPage`-in §12 qeydi).

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
