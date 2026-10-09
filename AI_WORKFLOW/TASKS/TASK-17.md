# TASK 17 — ORTAQ DİALOQ MÜQAVİLƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-17.md` — the owner's settled requirement, with decisions 17.1, 17.2 and 17.3 in
`BRIEFS/OWNER_BRIEFS_MASTER.md`. The brief decides *what* and *why*. This file decides *how*. Where this file and the
brief disagree, the brief wins, and the Coder stops and reports.
Part: **one part, not split.** It covers one shared primitive, one small module, a four-line change to `InfoHint`,
one call-site prop in each of three dialogs, and their tests. It fits one Coder session.
Specification status: **READY.** Verified by the Planner on 2026-09-25 against the accepted HEAD `f011924`.

- §2 was checked line by line against the code, and every statement now carries a `file:line`.
- Where the draft's assumptions did not match the code, they are corrected, and each correction is marked
  **[Planner, verified]**:
  - the caller list: 22 files and 23 dialogs, not 15;
  - `Modal.test.tsx` already exists;
  - the × button always comes first, which settles the destructive-autofocus question;
  - `InfoHint` has its own `Escape` handler;
  - three dialogs autofocus a field;
  - the row detail holds forms;
  - no screen opens one dialog over another;
  - a per-dialog `document` listener can fire twice;
  - the suite totals.
- The draft was written by the Product/UX planning agent on 2026-09-25, from an audit of the running application.
  Its requirements are all kept, and none was removed.

This task changes **frontend interaction behaviour only**: the keyboard, focus and dismissal behaviour of the one dialog
component that every screen uses. It changes no figure, no wording, no layout, no API and no database. This file has no
`DATA_MIGRATION` marker, on purpose.

---

## 1. Context

The brief's goal: "Tətbiqdəki bütün dialoqlar eyni cür davransın: `Escape` bağlasın, fokus itməsin, bağlamaq heç vaxt
'razıyam' mənasına gəlməsin."

This is the first task of the **Qərar zənciri** initiative. It owns the dialog contract and nothing else. Tasks 19
(the product history drawer) and 23 (the provenance disclosure) build on it. They must not invent their own dismissal
or focus behaviour. This is the rule Task 06 set for the colour helper: *17 writes the contract, and 19 and 23 apply
it.*

The audit's evidence: with the product-history dialog open, `Escape` was pressed and the dialog stayed open
(`modalStillOpen: true`). Keyboard users get no focus management at all today.

## 2. Verified current behaviour (repository at `f011924`)

Paths are relative to `frontend/bax-orders-web/src/`.

### 2.1 One primitive, many callers

`components/imports/review/Modal.tsx` (61 lines) is the only dialog component. No other file renders `role="dialog"`,
`aria-modal`, `<dialog>` or a portal. The only other `role="dialog"` strings are hand-written fixtures in
`terminology/oldTerms.test.tsx:1286` and `:1298`, and a selector in `test/oldTerms.ts:62,68`.

Its props (`Modal.tsx:4-12`) are `{ title, subtitle?, onClose, children, footer?, width?: 'default' | 'wide' }`.

**[Planner, verified]** The callers are **22 files rendering 23 dialogs**, found by a repository-wide search for
`<Modal` and for imports of `review/Modal`. The draft listed 15. Those marked *new* below were missing from it.

| # | Call site | What it holds | Kind |
|---|---|---|---|
| 1 | `components/analytics/TrendModal.tsx:115` — product history | charts, a table, metric toggles, an `InfoHint` (`:159`), a `<details>` (`:226`) | **read-only** |
| 2 | `components/orders/ItemSourceDrawer.tsx:45` — «Mənbə» | facts and tables. Its own comment says "a window, never an editor" (`:22`) | **read-only** |
| 3 | `components/imports/review/RowDetailDialog.tsx:76` — the row detail | facts and a table, **plus** inline correction inputs (`:201`), an exclusion reason form (`:128-150`), a clear confirmation (`:154-177`), and footer actions (`:88-109`) | **mixed** — see §2.4 |
| 4 | `components/imports/review/BulkActionDialog.tsx:140` | a form, with an autofocused field (`:165`) | form |
| 5 | `components/imports/review/ConfirmationDialog.tsx:123` — «İdxalı təsdiqlə» | a confirmation | confirmation |
| 6 | `components/imports/review/CreateResolutionDialog.tsx:142` | a form, with an autofocused field (`:225`) | form |
| 7 | `components/imports/review/MapExistingDialog.tsx:97` | a form, with an autofocused field (`:140`) | form |
| 8 | `components/imports/review/NotAUnitDialog.tsx:36` | a confirmation | confirmation |
| 9 | `components/imports/review/PricingClassificationTab.tsx:374` *(new)* | a classification confirmation | confirmation |
| 10 | `components/catalog/ApplySafeDialog.tsx:44` | a confirmation | confirmation |
| 11 | `components/catalog/AssignCategoryDialog.tsx:61` | a form | form |
| 12 | `components/catalog/matches/ApproveMatchDialog.tsx:71` | a confirmation | confirmation |
| 13 | `components/catalog/matches/UndoDecisionDialog.tsx:35` | a confirmation | confirmation |
| 14 | `components/orders/revision/AddLineDialog.tsx:101` | a form | form |
| 15 | `components/orders/revision/EditLineDialog.tsx:85` | a form | form |
| 16 | `components/orders/revision/RemoveLineDialog.tsx:48` — «Sətri sil» | a destructive confirmation (`:62-69`) | confirmation |
| 17 | `components/orders/revision/RevisionPanel.tsx:143` *(new)* | a confirmation | confirmation |
| 18 | `components/workflow/WorkflowDialog.tsx:77` | an approval form | form |
| 19 | `layout/CurrentUserMenu.tsx:84` *(new)* — «Şifrəni dəyiş» | a password form | form |
| 20 | `pages/AdminUsersPage.tsx:239` *(new)* | a user form | form |
| 21 | `pages/AdminUsersPage.tsx:343` *(new)* — «Şifrəni sıfırla» | a password form | form |
| 22 | `pages/SuppliersPage.tsx:246` *(new)* — «Qiymət siyasəti» | a confirmation with a reason `textarea` (`:274`) | form |
| 23 | `pages/PricingModeReviewPage.tsx:412` *(new)* | a classification confirmation | confirmation |

Openers that brief acceptance 1 and 3 name:

- The product history is opened by the product's row button in `components/decisions/DriverList.tsx:122`. Its
  accessible name carries the product name, and the page passes it in as `onHistory={setHistory}`
  (`pages/OrderDetailPage.tsx:301`). The dialog is rendered at `pages/OrderDetailPage.tsx:515-534`.
- «Mənbə» is opened from the lines table (`pages/OrderDetailPage.tsx:427`) or from a line card (`:476`), and rendered
  at `:536-542`.
- The row detail is rendered by `components/imports/review/CorrectionCenter.tsx:205`.

**[Planner, verified]** **No screen opens one dialog over another.** No dialog component renders another dialog, and
each page keeps its dialogs as siblings in state. So the brief's nested-dialog rule (tələb 1) cannot be reached in
the running application today. It is still required, and it is proven by unit tests (§10). The manual pack records
the nested-dialog check as unreachable (§11).

### 2.2 What the primitive already does

- It renders `role="dialog"`, `aria-modal="true"` and `aria-label={subtitle ? `${title} — ${subtitle}` : title}`
  (`Modal.tsx:33-35`).
- It locks `document.body.style.overflow` on mount and restores the **previous** value on unmount (`Modal.tsx:19-27`).
  This is deliberate: a dialog opened over another must not leave the page locked, and the comment at `:20-21` says
  so. Keep it. `Modal.test.tsx:17-66` already covers it with five tests.
- The backdrop is `fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain
  bg-slate-900/50 p-4` (`Modal.tsx:31`). `overscroll-contain` stops a scroll at the dialog's end instead of carrying
  it on to the page. Keep it.
- The close button carries `aria-label="Bağla"` (`Modal.tsx:45-52`). **[Planner, verified]** It sits in the header,
  **before** the body and the footer in DOM order, so in every dialog it is the first focusable element.
- The title is an `<h2>` without an id (`Modal.tsx:42`). The subtitle is a `<p>` without an id (`Modal.tsx:43`).

### 2.3 What it does not do

- There is **no `Escape` handler** anywhere in `Modal.tsx`.
- There is **no backdrop click handler**. The backdrop `div` (`Modal.tsx:31`) has no `onClick`.
- There is **no focus management**. Focus is not moved into the dialog on open, not trapped while it is open, and
  not returned when it closes.
- Nothing tells apart a dialog that was opened over another.
- It is not a native `<dialog>` element and does not use the top layer.

Things inside dialogs that the contract must respect **[Planner, verified]**:

- `components/analytics/InfoHint.tsx:48-53,60` has its **own** `Escape` handler, on `document`, in the bubble phase.
  An `InfoHint` sits inside the product history (`TrendModal.tsx:159`). A `Modal` listener, which is also on
  `document` and was registered earlier, would run first. One `Escape` would then close both the note and the whole
  dialog. `InfoHint.test.tsx:99-108` covers its `Escape` behaviour.
- Three dialogs autofocus a field on mount with React's `autoFocus`: `BulkActionDialog.tsx:165`,
  `CreateResolutionDialog.tsx:225` and `MapExistingDialog.tsx:140`. `RowDetailDialog.tsx:131,202` autofocus fields
  that appear later. React moves focus during the commit, **before** the `Modal`'s own effects run. So an effect
  that records "the element focused when the dialog opened" would record the dialog's own field, not the opener.
- No other `keydown` listener exists in `src/` (search for `onKeyDown` and `addEventListener('keydown'`).

Tests that touch the dialog's accessible name **[Planner, verified]**: none. No test queries
`getByRole('dialog', { name })` or `getByLabelText` with the composed title-and-subtitle string. Every dialog test uses
`getByRole('dialog')` / `findByRole('dialog')` without a name. The `aria-label` fixtures at
`terminology/oldTerms.test.tsx:1286,1298` are hand-written markup for the old-terms sweep, not `Modal`s, and they stay
as they are. The sweep's `readableText` (`test/oldTerms.ts:66-77`) collects `aria-label` attributes. Removing the
composed label loses it nothing, because the same title and subtitle are in the dialog's `textContent`.

### 2.4 Which dialogs may be dismissed by a backdrop click

Decision 17.2 names the read-only dialogs: "məhsul tarixçəsi, mənbə, sətir detalı". The same decision also says: "İçində
forma və ya təsdiq düyməsi olan dialoq fon klikinə bağlanmır — yazılmış məlumat təsadüfən itməsin."

- **Product history** (`TrendModal`) and **Mənbə** (`ItemSourceDrawer`) hold nothing that can be typed or lost:
  `dismissOnBackdrop` is always on.
- **Row detail** (`RowDetailDialog`). **[Planner, verified]** The draft called it read-only, but the code shows it is
  not always read-only. In its normal state it shows facts. While the operator is correcting a field
  (`editing !== null`, `:200-206`), writing an exclusion reason (`askExclude`, `:122-152`) or confirming a clear
  (`askClear !== null`, `:154-177`), it holds a form. While a request is in flight (`busy`), it also must not vanish.
  Both halves of 17.2 are satisfied at every moment when **the row detail dismisses on backdrop only in its reading
  state**:
  `dismissOnBackdrop={editing === null && !askExclude && askClear === null && !busy}`.
  No owner decision changes: the named dialog still closes on backdrop, and typed input is never lost that way. This
  is recorded as a technical resolution, not a conflict (Assumption 7).
- **The other twenty dialogs** (rows 4–23 of §2.1) each hold a form, a confirmation or both. They never dismiss on
  backdrop.

Destructive autofocus (the draft's §4.4 question) **[Planner, verified]**: **no dialog is affected.** The × «Bağla»
button comes before every body and footer in DOM order (§2.2). So "the first focusable element" is always «Bağla»,
never a destructive footer action such as «Sil» (`RemoveLineDialog.tsx:62-69`).

## 3. Scope

In scope, all inside the dialog primitive, its immediate helpers and three call sites:

- A. `Escape` closes the topmost open dialog, and only that one;
- B. focus moves into the dialog on open, is trapped while it is open, and returns to the opener on close;
- C. an opt-in backdrop dismissal, enabled only on the read-only dialogs of §2.4;
- D. `aria-labelledby` pointing at the rendered title (replacing the composed `aria-label` string), and
  `aria-describedby` pointing at the subtitle;
- E. `InfoHint` marks its own `Escape` as used, so that the dialog around it does not close too;
- F. tests;
- G. the manual verification pack (a document; the Coder prepares it and does not run it).

Out of scope:

- the product-history drawer, its layout and its URL state, which belong to **Task 19**;
- the provenance disclosure and what the source dialog contains, which belong to **Task 23**;
- browser-history integration ("Back closes the dialog"). That is **Task 19's**, and only for the dialog that has URL
  state. This task adds no history entries (Assumption 3);
- any change to a dialog's title, subtitle, body, footer, buttons or width;
- any change to what a dialog's action does, or to when its own buttons are enabled;
- converting anything to a native `<dialog>` element;
- every screen behind the dialogs.

## 4. Required behaviour

### 4.1 A dialog stack (A)

Add `components/imports/review/dialogStack.ts`: a module-level, ordered list of the open dialogs. Keep it deliberately
small. There is no context provider and no portal registry.

- A hook (suggested name `useDialogLayer()`) registers the calling `Modal` on mount and removes it on unmount, whatever
  the order. It returns a stable function `isTopmost()` that is read **when an event arrives**, not at mount.
  **[Planner, verified]** A plain depth number captured at mount goes wrong when a lower dialog closes before an upper
  one. The draft's own test ("unmounting out of order leaves the count correct") is kept, and it is exactly the case
  this guards.
- Registration must stay balanced under React `StrictMode`'s double mount in development
  (`register` in `useEffect`, `remove` in its cleanup).
- Export only what `Modal` and the tests need. A test-only reset is allowed, provided it is named as test-only.

### 4.2 Escape (A)

While a `Modal` is open, one `keydown` listener per `Modal` sits on `document`, in the bubble phase. It is registered
once per mount. `onClose` is read through a ref, so a new `onClose` on each render does not re-register the listener.
The listener calls `onClose()` only when all four of these hold:

1. `event.key === 'Escape'`, and not `event.isComposing`;
2. `!event.defaultPrevented`, meaning something inside, such as an open `InfoHint`, has not already used this
   `Escape`;
3. `isTopmost()` is true;

and then 4. it calls `event.preventDefault()` **before** `onClose()`.

**[Planner, verified]** Why step 4 is required: in a real browser, microtasks run between two listeners of one native
event. So React can unmount the upper dialog before the lower dialog's listener runs. The lower one would then find
itself topmost and close as well. Marking the event handled makes one `Escape` close exactly one dialog, whatever
order the listeners run in. jsdom does not run microtasks between listeners, so a test cannot show this failure. The
code must still guard against it.

The listener is removed on unmount.

`Escape` is equivalent to the × «Bağla» button: it calls the same `onClose` and nothing else (17.3). The × button is
enabled even while a dialog's request is in flight (`Modal.tsx:45-52`). So `Escape` is not gated on `busy` either
(Assumption 8).

### 4.3 Backdrop dismissal (C)

Add a new prop `dismissOnBackdrop?: boolean`, **default `false`**.

When it is `true`, a press that **starts and ends on the backdrop element itself** calls `onClose()`:

- the `pointerdown` target is the backdrop, and so is the `click` target. A press on a descendant never counts.
- A drag that starts inside the dialog and is released over the backdrop does not count. The browser reports that
  `click` on the backdrop, so the check needs both ends.
- A press on the backdrop's own scrollbar does not count. The backdrop is the scrolling element (`overflow-y-auto`).
  How to detect the scrollbar is the Coder's choice, but the check must not make every click fail in jsdom, which has
  no layout (`clientWidth` is 0).

Set the prop at exactly three call sites, and nowhere else:

- `TrendModal.tsx:115` — `dismissOnBackdrop`;
- `ItemSourceDrawer.tsx:45` — `dismissOnBackdrop`;
- `RowDetailDialog.tsx:76` — `dismissOnBackdrop={editing === null && !askExclude && askClear === null && !busy}`
  (§2.4).

A form or confirmation dialog must not be dismissible by a stray click. That is the owner's rule (17.2), not a
preference.

### 4.4 Focus (B)

- **Record the opener at the first render**, not in an effect (§2.3). For example:
  `const [opener] = useState(() => document.activeElement)`. By the time any effect runs, an `autoFocus` field inside
  the dialog already holds focus.
- **On open** (in an effect): if focus is already inside the dialog, because a field has `autoFocus`, leave it there.
  Otherwise focus the first focusable element inside the dialog with `{ preventScroll: true }`. By construction that
  is the × «Bağla» button (§2.2, §2.4). If there is none, focus the dialog container. In that case give it
  `tabIndex={-1}`, which has no visual effect. No destructive button can receive focus on open (§2.4).
- **While open**, the topmost dialog only: `Tab` from the last focusable element goes to the first, and `Shift+Tab`
  from the first goes to the last. If focus is outside the dialog (a click on the backdrop moves it to `body`), `Tab`
  goes to the first element and `Shift+Tab` to the last.
  - Work out the focusables at keypress time, because content arrives after loading.
  - Include `summary`, because the product history has a `<details>` (`TrendModal.tsx:226-228`).
  - Exclude anything `disabled`, and anything inside `[hidden]` or `[inert]`.
  - Between the first and the last element, let the browser move focus.
- **On close** (unmount): return focus to the recorded opener, with `{ preventScroll: true }`, if it is still in the
  document (`opener.isConnected`) and focusable. Otherwise do nothing. `preventScroll` is what keeps "səhifə yerində
  qalır" (brief acceptance 1): a plain `focus()` would scroll the opener into view.

### 4.5 Labelling (D)

- Give the rendered `<h2>` an id from `useId()`, and point `aria-labelledby` at it.
- When there is a subtitle, give its `<p>` an id and point `aria-describedby` at it. When there is none, render no
  `aria-describedby`.
- Remove the composed `aria-label` string.
- The visible text does not change.

### 4.6 InfoHint gives up an Escape it used (E)

In `components/analytics/InfoHint.tsx:48-53,60,66`:

- register `closeOnEscape` in the **capture** phase, both where it is added and where it is removed;
- inside it, call `event.preventDefault()` when it closes the note.

So an `Escape` pressed while a note is open closes only the note. The next `Escape` closes the dialog. That is the
brief's "yalnız üstdəki bağlanır", applied to the one layer the application actually stacks. Nothing else in
`InfoHint` changes: not its markup, its classes, its placement or its other listeners.

### 4.7 Nothing else changes

No class name that affects layout, spacing, colour or size may change. A visual difference in any dialog is a defect.
The only markup changes allowed are these attributes:

- `id`;
- `aria-labelledby`;
- `aria-describedby`;
- removing `aria-label` from the dialog `div`;
- `tabIndex={-1}`, if the container fallback of §4.4 needs it;
- the backdrop's pointer and click handlers.

## 5. Frontend requirements — summary for the Coder

Expected changes, all under `frontend/bax-orders-web/src/`:

- `components/imports/review/Modal.tsx`: Escape, focus, backdrop and labelling;
- new `components/imports/review/dialogStack.ts`;
- `components/analytics/InfoHint.tsx`: §4.6 only;
- three call sites gaining `dismissOnBackdrop`: `TrendModal.tsx`, `ItemSourceDrawer.tsx`, `RowDetailDialog.tsx`;
- tests (§10).

The manual pack goes under `docs/audits/2026-qerar-zenciri/` (§11).

Not changed:

- every dialog's content, title, footer and action, and when its buttons are enabled;
- every screen;
- every label file;
- every figure.

Keep the codebase's idiom:

- comments explain *why*, in the plain voice of the existing comments (see `Modal.tsx:14-17,20-21`);
- one word per idea, taken from `src/terminology`;
- this task adds no new visible word.

## 6. Backend

None. Keyboard, focus and dismissal are browser behaviour over a component that receives no data. There is no C#
change and no API contract change. If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef` or `dotnet run`, or any tool under `tools/`.
  `dotnet build` and `dotnet test` are required (§11) and are allowed.
- No data change. HD-002's 94 rows are untouched.
- Do not change what any dialog's action does. Closing is refusal (17.3). If closing a dialog could commit its action,
  STOP.
- Do not touch screens or components owned by Tasks 18–24, even to "make it consistent". Tasks 19 and 23 own what
  `TrendModal` and `ItemSourceDrawer` contain. This task adds one prop to each and nothing more.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- Every dialog's visible text, layout, width, buttons and footer.
- The body scroll lock's restore-previous behaviour (§2.2). A dialog over a dialog must not unlock the page. The five
  existing tests in `Modal.test.tsx:17-66` stay, unchanged, and pass.
- `overscroll-contain` on the backdrop. `Modal.test.tsx:28-32` finds it as the dialog's `parentElement`. Keep the
  backdrop as the dialog element's direct parent.
- `aria-label="Bağla"` on the close button.
- No dialog's action fires as a result of dismissal, whether by `Escape`, the backdrop or the × button.
- `InfoHint`'s existing behaviour and its test `InfoHint.test.tsx:99-108`: `Escape` closes the note and leaves focus on
  the ⓘ.
- Decision 9.1 and its words, Task 2's price words, and Task 5's (5.1) product words are untouched by this task.
- No figure anywhere changes. There is no backend, schema or data change.

## 9. Acceptance criteria

1. The product history is open. `Escape` is pressed. It closes, the page stays where it was, and focus returns to the
   product's row button that opened it (`DriverList.tsx:122`). *(brief acceptance 1)*
2. The line-removal confirmation («Sətri sil», `RemoveLineDialog`) is open. The backdrop is clicked. The dialog stays
   open and nothing is deleted, meaning `removeOrderItem` is not called. The same holds for every form and
   confirmation dialog of §2.4. *(brief acceptance 2)*
3. The source dialog («Mənbə») is open. The backdrop is clicked. It closes and nothing else happens. The same holds for
   the product history, and for the row detail in its reading state. The row detail does **not** close while a
   correction, an exclusion reason or a clear confirmation is open, or while a request is in flight.
   *(brief acceptance 3; 17.2)*
4. With a dialog open, the first `Tab` lands inside the dialog, `Tab` from the last focusable element returns to the
   first, and `Shift+Tab` from the first goes to the last. The page behind is never reached. *(brief acceptance 4)*
5. When two dialogs are open, one over the other, `Escape` closes the upper one alone. The one beneath stays open, and
   the page stays locked. With an `InfoHint` note open inside a dialog, the first `Escape` closes only the note.
   *(brief tələb 1)*
6. Screen readers announce each dialog by its visible title, from `aria-labelledby`, and its subtitle, if any, from
   `aria-describedby`. *(§4.5)*
7. Every dialog in the application opens and closes from its own buttons exactly as before, with no visual
   difference. A dialog with an `autoFocus` field still opens with that field focused. *(brief acceptance 5)*
8. No figure changed. Every other screen is unchanged. All suites and both builds are green, and the old-terms sweep
   passes.

## 10. Required tests

Frontend (vitest, `@testing-library/react` + `@testing-library/user-event`, both already in `package.json`):

- **Extend** the existing `components/imports/review/Modal.test.tsx`. Keep its five tests as they are, and add:
  - `Escape` calls `onClose` exactly once;
  - with two `Modal`s mounted, `Escape` calls only the upper one's `onClose`;
  - with two `Modal`s held in one parent's state, and the upper's `onClose` removing it: one `Escape` leaves the lower
    one open, and a second `Escape` closes it;
  - after the lower of two is unmounted first, `Escape` still reaches the remaining (upper) one;
  - an `Escape` whose `defaultPrevented` is already set calls nothing;
  - the listener is removed on unmount: `Escape` after unmount calls nothing;
  - `dismissOnBackdrop` absent: a backdrop click does not call `onClose`;
  - `dismissOnBackdrop` present: a backdrop click calls `onClose`. A click on the dialog body does not. A press that
    starts on the body and is released on the backdrop does not;
  - on open, focus is on «Bağla», or stays on an `autoFocus` field when the dialog has one;
  - `Tab` from the last focusable element returns to the first, and `Shift+Tab` from the first goes to the last;
  - focus returns to the opener after close. When the opener has left the document, closing does not throw;
  - the dialog is found by `getByRole('dialog', { name: <visible title> })`. It has an accessible description equal to
    the subtitle when there is one, and none when there is not.
- **New** `components/imports/review/dialogStack.test.ts`:
  - registering and removing keeps the list right;
  - `isTopmost()` follows the last one opened;
  - removing out of order leaves the list correct.
- `components/analytics/InfoHint.test.tsx`: keep `:99-108` unchanged. Add a test that, inside a `Modal`, the first
  `Escape` closes the note only and the second closes the dialog.
- `components/analytics/TrendModal.test.tsx` (it exists): a backdrop click calls `onClose`.
- One confirmation dialog, for example a new `components/orders/revision/RemoveLineDialog.test.tsx`: a backdrop click
  does not call `onClose`, and neither `Escape` nor a backdrop click calls `removeOrderItem`. Only `onClose` is called,
  on `Escape`.
- `RowDetailDialog`: a backdrop click closes it in its reading state, and does not close it while a correction input
  is open.
- Existing dialog tests: §2.3 found none that depend on the composed `aria-label`. If one fails anyway, update it to
  the accessible name, and list it in the report with the reason. No expectation may be weakened to make a test pass.

Backend: none. Run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. Use `--artifacts-path` into the scratchpad if `bin` is locked,
  and say so.
- `dotnet test BaxOrders.slnx`: **1046 unit / 785 integration**, unchanged from the totals accepted at TASK-15b
  (`LAST_REPORT.md` of 15b, lines 161–162).
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`. The
  build's `tsc -b` is the type check. Both must be green. The 15b baseline is **51 files / 957 tests**. Report the new
  totals and the difference.
- `git diff --stat` and `git status`: changes only under `frontend/bax-orders-web/src/` and
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

The Coder has no browser. Prepare the pack, but do not run it:
`docs/audits/2026-qerar-zenciri/17-dialoq-yoxlamasi.md`.

It holds checks `A-01 … A-12`, one row each, and every result line is left as `---- operator doldurur ----`:

- A-01 `Escape` on the product history: it closes, the page scroll position is unchanged, and focus is on the product's
  row;
- A-02 `Escape` on «Sətri sil»: it closes and nothing is removed;
- A-03 the nested-dialog `Escape`. Record it as **not reachable in the application today** (§2.1). It is proven by the
  unit tests. The operator writes whether any screen now nests dialogs;
- A-04 an `InfoHint` note open in the product history: the first `Escape` closes the note, the second the dialog;
- A-05 … A-07 a backdrop click on the product history, on «Mənbə», and on the row detail in its reading state: each
  closes;
- A-08 a backdrop click on the row detail with a correction input open: it stays open and the typed text is kept;
- A-09 … A-11 a backdrop click on three form or confirmation dialogs («Sətri sil», «Sətri redaktə et», «İdxalı
  təsdiqlə»): each stays open and nothing happens;
- A-12 the `Tab` / `Shift+Tab` cycle and the focus return, on one form dialog with an `autoFocus` field
  (`CreateResolutionDialog`).

Viewports: `1366×768 · 1440×900 · 390×844 · 1200×800`. Screenshots are named `<ID>-<ekran>-<en>.png` and go under
`docs/audits/2026-qerar-zenciri/ekranlar/`. The report must say plainly that the Coder performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Tələb 1 — `Escape` hər dialoqu bağlayır; iç-içə dialoqda yalnız üstdəki. (17.1) | §4.1, §4.2, §4.6; criteria 1, 5 |
| Tələb 2 — Fokus dialoqa keçir, içində dövr edir, bağlananda qayıdır. (17.1) | §4.4; criteria 1, 4, 7 |
| Tələb 3 — Fon klikinə bağlanma yalnız oxumaq üçün dialoqlarda. (17.2) | §2.4, §4.3; criteria 2, 3 |
| Tələb 4 — Bağlamaq əməliyyatı icra etmir. (17.3) | §4.2, §7, §8; criterion 2 |
| Tələb 5 — Dialoqun görünüşü dəyişmir. | §4.7, §8; criterion 7 |
| Qəbul 1 — məhsul tarixçəsi, `Escape`, fokus məhsul adına qayıdır | criterion 1 |
| Qəbul 2 — silmə təsdiqi, fon kliki, bağlanmır, heç nə silinmir | criterion 2 |
| Qəbul 3 — mənbə, fon kliki, bağlanır | criterion 3 |
| Qəbul 4 — ilk `Tab` dialoqun içində | criterion 4 |
| Qəbul 5 — görünüş, mətn, düymələr dəyişmir; hamısı əvvəlki kimi açılıb-bağlanır | criteria 7, 8 |
| Toxunulmayanlar — rəqəm, mətn, iş qaydası, baza, backend, data | §6, §7, §8; criterion 8 |

All five brief acceptance bullets and all five requirements land here. None is left to a later task.

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. The classification of §2.4 comes from what each dialog contains, read in the code, applied to the owner's own list
   in 17.2. If the owner wants a different set, the change is one line per call site.
2. `Escape` is unconditional. It closes even a form dialog with typed input, because that is what people expect of
   `Escape`, and an accidental `Escape` is far rarer than an accidental backdrop click. No "are you sure" is added.
3. This task adds **no** browser-history entry for dialogs. A generic "Back closes any dialog" mechanism is fragile for
   dialogs with no URL state. Task 19 gives the product drawer real URL state, and Back then works naturally for the one
   dialog where the audit found the problem.
4. The dialog stack is a module-level ordered list, not a React context. The primitive is a single component, and a
   context would change every caller's tree for no benefit. The list is asked "am I on top?" when an event arrives,
   rather than handing out a depth number at mount, so that closing dialogs out of order cannot confuse it (§4.1).
5. `aria-labelledby` replaces the composed `aria-label`, so the accessible name is exactly the visible title, and the
   subtitle becomes the description. Tests query by role and name rather than by a made-up label string.
6. Nothing is converted to a native `<dialog>`. That would change stacking, backdrop styling and scroll behaviour all at
   once, and this task is meant to be revertible on its own.
7. The row detail dismisses on backdrop only in its reading state (§2.4). This honours both sentences of 17.2 at once:
   the owner's list names the row detail, and the owner's rule protects typed input. It is a technical resolution,
   because no owner decision changes. If the owner prefers that the row detail never dismisses on backdrop, the prop
   becomes `false`.
8. `Escape` is not gated on a dialog's `busy` state, because the × button it mirrors is not gated either
   (`Modal.tsx:45-52`). Closing during a request does not cancel or commit anything: the request was already sent by
   the dialog's own button.
9. On open, focus goes to «Bağla», the first focusable element, rather than to the first field. The exception is a
   dialog that already autofocuses a field, which keeps it. This keeps every dialog's current first-field behaviour,
   and it never lands on a destructive action.
10. `InfoHint` is changed by four tokens (capture, and `preventDefault`) so that the one layer that really stacks inside
    a dialog today obeys "only the top one closes". `InfoHint` is not owned by Tasks 18–24.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — the branch, HEAD, `git status --short` and `git diff --stat`.
1. Dialoq müqaviləsi — `Escape`, fokus and the backdrop click: what was done, and where (`file:line`).
2. Dialoq yığını — how nested dialogs are told apart, and why one `Escape` closes exactly one dialog (§4.2, step 4).
3. Təsnifat — which dialogs close on a backdrop click, which do not, and why. Give the verified list of §2.4, with the
   row detail's condition.
4. Əlçatanlıq — `aria-labelledby` / `aria-describedby`, the focus return with `preventScroll`, the `autoFocus` fields
   kept, and why no destructive button can get focus.
5. InfoHint — the change and its test.
6. Testlər — the new tests; the changed tests, each with its reason; the counts before and after (frontend 51 / 957 →
   ?, backend 1046 / 785 unchanged); the builds.
7. Əl ilə yoxlama dəsti — the file prepared and its check IDs. State plainly that the Coder did no browser check.
8. Toxunulmayanlar — no dialog's appearance, text or action changed; there was no database and no backend; no figure
   changed.
9. Sonrakı tapşırıqlar üçün qeydlər — for 19 (the drawer inherits this contract, and its URL history is built there)
   and for 23 (the source dialog).

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
