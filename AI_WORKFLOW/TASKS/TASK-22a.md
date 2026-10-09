# TASK 22a — TARİXİ TƏSDİQ İFADƏSİ: SİFARİŞ SƏHİFƏSİ (P0)

Priority: **P0**
Brief: `AI_WORKFLOW/BRIEFS/TASK-22.md` — the owner's settled requirement, with decisions 22.1 … 22.3 in
`BRIEFS/OWNER_BRIEFS_MASTER.md`:835–837. It decides *what* and *why*; this file decides *how*. Where this file and
the brief disagree, the brief wins and the Coder stops and reports.
Parent: `TASKS/TASK-22.md` (the adopted DRAFT). This part verifies and supersedes its §2, and carries its §3–§12 for
the order page. Where this file corrects the draft, the correction and its reason are in §2.6.
Part: **22a of 22a → 22b.** 22a is the order page and the shared component. 22b is the objects list, the object page
and the monthly report — see §3.3 for the seam and `PLAN.md` HD-010 for why 22b waits.
Specification status: **READY.** Verified by the Planner on 2026-09-26 against HEAD `b6b987c` (Task 21's accepted
commit).

This task changes **frontend wording only**. It changes no order's status, no workflow event, no permission, no API
and no database. **No order moves away from Approved.** There is no migration marker in this file, on purpose:
there is nothing to migrate.

---

## 1. Context

The brief's goal: "Tarixi sifarişlərin statusu doğru qalsın, ifadəsi isə özünü təkzib etməsin."

Today the order page shows the green `✓ Təsdiqlənib` badge in its header and, in the decision panel beside it,
`Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.` Together they read as a contradiction. The status is
correct (22.1). The approval was given before BaxOrders existed, so this system has no approver and no date for it.

The domain already knows which orders these are (§2.1). This is a sentence problem, not a data problem.

## 2. Verified current behaviour (HEAD `b6b987c`)

### 2.1 The domain already marks it

- `frontend/bax-orders-web/src/api/workflow.ts:9-13` — the workflow action `ImportedAsApproved`: "Carried in already
  approved, from before this system existed. Deliberately not `Approved` …"
- `frontend/bax-orders-web/src/api/workflow.ts:49-51` — `WorkflowDecisionFacts.isHistoricalImport: boolean`, "Carried
  in from Excel as already approved; every other field is then empty (4.1)". It reaches the page as
  `OrderWorkflow.decisionFacts` (`api/workflow.ts:104`), from `GET /api/v1/orders/{id}/workflow`
  (`src/BaxOrders.Api/Controllers/OrdersController.cs:71-77`).
- The server's rule: `src/BaxOrders.Application/Orders/Workflow/OrderWorkflowDtos.cs:157-161` — historical when the
  request's chain was never submitted and its own history holds an `ImportedAsApproved` event. It then returns
  `HistoricalImport` (`:133`), with every other fact empty.
- Where those orders came from: migration
  `src/BaxOrders.Infrastructure/Persistence/Migrations/20260923122642_AddLinePricingModeAndHistoricalApproval.cs:66-99`
  wrote one `ImportedAsApproved` event (actor NULL, `Sistem`, comment "Tarixi sifariş sistemə artıq təsdiqlənmiş kimi
  köçürülüb.") beside every imported Draft request and set it to `Approved`. Requests created afterwards go through
  the normal workflow.

The order's `OrderRequestStatus` is `Approved` in both cases and **stays** `Approved`. Nothing in this task reads or
writes it.

### 2.2 Where the two statements are rendered on the order page

The order page is `pages/OrderDetailPage.tsx` (its tests are `pages/OrderDecisionPage.test.tsx`).

- **The badge.** `pages/OrderDetailPage.tsx:280-284`: `StatusBadge` in the page header, fed by `data.status` from
  `fetchOrder` — `OrderRequestDetail` (`api/orders.ts:153-179`), which has **no** historical flag. So the header does
  not know today whether its order is historical.
- **The contradicting line.** `components/workflow/WorkflowPanel.tsx:197-200` renders `historicalImportNote` alone
  when `facts.isHistoricalImport`, in place of the facts list. The constant is
  `components/workflow/labels.ts:62-68`: `'Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.'`
- **The panel is on the same page and loads the flag.** `pages/OrderDetailPage.tsx:353-359` mounts
  `WorkflowPanel` with `key={reloadToken}`, `onStatusChanged={reload}`, `showHistory={false}`. The panel fetches the
  workflow itself (`WorkflowPanel.tsx:56-66`) and keeps it in its own state. `onStatusChanged` fires only after an
  action (`:77-79`), never after the load.
- **In-system approval.** `WorkflowPanel.tsx:202-208`: `Təsdiqləyən` + name and `Təsdiq tarixi` + date from
  `decisionFacts.decision`. Unchanged by this task.
- **History.** The event label `Təsdiqlənmiş kimi köçürülüb` (`labels.ts:36-37`, grey `labels.ts:44-45`) and the
  event's comment render in the history panel. Unchanged by this task.

### 2.3 Where the wording lives

- Status words, tones and signs: `components/workflow/labels.ts:5-10` (`workflowStatusLabels`), `:16-21`
  (`workflowStatusClass`, Approved = `bg-emerald-50 text-emerald-900 ring-emerald-200`), `:24-29`
  (`workflowStatusSign`, Approved = `✓`). This file owns the approved label.
- `components/imports/labels.ts:176-181` (`orderStatusLabels`) is a second copy of the same four words, used only as
  plain text in the source drawer's lineage (`components/orders/ItemSourceDrawer.tsx:136`). It is not a badge and
  the source drawer is Task 23's. Not touched.
- `components/StatusBadge.tsx:1-30` is the generic badge shape for every kind of state (workflow, coverage,
  permissions). It receives `label`, `sign`, `toneClass`, `size` and nothing about workflow. It has no test file.
- Amber means "information still owed" (Task 2): `pricing/labels.ts:92-93` (`warningToneClass`,
  `warningChipClass`). Neutral internal context is slate: `pricing/labels.ts:96-97`.

### 2.4 Every other place the badge appears — all 22b

`workflowStatusLabels` is rendered in exactly these other places (`grep`, HEAD):

| Surface | Code | Its data | Has the flag? |
|---|---|---|---|
| Objects list, status column | `pages/LocationsPage.tsx:199-209` | `LocationOrderSummary.latestRequestStatus` (`api/orders.ts:42`) | no |
| Object page, period rows | `pages/LocationDetailPage.tsx:311-318` | `LocationOrderHistoryEntry.status` (`api/orders.ts:70-83`) | no |
| Object page, latest order card | `components/locations/LocationTrend.tsx:86-93` | the same entries | no |
| Monthly report, cell dot + description | `components/reports/MonthlyReportTable.tsx:298`, `:316-323`, `:335-357` (used as `title` / `aria-label` at `:267-268`) | `MonthlyReportCell.status` (`api/reports.ts:16`) | no |
| Monthly report, legend | `MonthlyReportTable.tsx:397-408`, `markedStatuses` `:56` | — | — |

None of `GET /locations/orders`, `GET /locations/{id}/orders` or `GET /reports/monthly`
(`LocationsController.cs:21-35`, `ReportsController.cs:23-29`) carries the fact, and there is no endpoint that
returns it for many orders at once. That is the reason for the split (§3.3).

The dashboard does not render a workflow status (`api/dashboard.ts:63` `currentStatus` is not rendered anywhere).

### 2.5 The approval queue cannot change

`src/BaxOrders.Application/Approvals/ApprovalInboxQueries.cs:51` selects `Status == PendingApproval` only.
Historical imports are `Approved` and never enter it. This task changes no backend file, so it cannot change queue
membership, permissions or actions. Confirmed.

### 2.6 Corrections to the draft (`TASK-22.md`)

1. **The words beside the badge.** The draft's §4.1 put only `Tarixi sifariş` beside the badge. The brief's
   requirement 2, acceptance 1 and decision 22.2 say the text beside it is
   **`Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`**. The brief wins; this file uses the full phrase.
2. **`StatusBadge` is not changed.** The draft expected it to take `isHistoricalImport`. It is the shape for every
   kind of state (§2.3), and its own comment says a page owns what its states are called. A small workflow component
   composes it instead (§4.1). One label source, as the draft required.
3. **The order page's header has no flag today** (§2.2). The draft assumed it could be passed down. It is lifted from
   the panel's existing load, with no second request (§4.3).
4. **The list surfaces cannot be done without a backend change or one request per order** (§2.4). They move to 22b.
5. **Decision 4.1's sentence is retired by 22.3.** 4.1 (`OWNER_BRIEFS_MASTER.md`:54) fixed the text
   `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.`. 22.3 (`:837`) is the owner's later decision and
   says that sentence is not shown beside the badge again. 4.1's other half stands and is kept: no sender, approver
   or date is invented.

## 3. Scope

### 3.1 In scope (22a)

- A. On the order page, an order with `isHistoricalImport: true` shows `✓ Təsdiqlənib` and, beside it,
  `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`.
- B. The decision panel explains in one sentence why no approver and no date are recorded.
- C. `Təsdiq məlumatı mövcud deyil` is no longer shown.
- D. The wording lives in `components/workflow/labels.ts`. The badge-plus-text is one component,
  `components/workflow/OrderStatusBadge.tsx`, which 22b will reuse on the other surfaces.
- E. Tests and the manual pack.

### 3.2 Out of scope

- any order's status, version, amount or history — **unchanged, protected by §7**;
- the approval queue, its membership, permissions and actions (Task 04);
- the event label `Təsdiqlənmiş kimi köçürülüb` and its grey, and the history panel;
- the objects list, the object page, `LocationTrend` and the monthly report — **22b**;
- `components/imports/labels.ts`'s `orderStatusLabels` and the source drawer (Task 23);
- the dashboard's and the report's figures and colours (Tasks 21, 24);
- `docs/audits/2026-final-enver-muellim-audit*`, which quote the old sentence as a record of what was audited. They
  are Task 15's record and are not edited;
- any backend or database change.

### 3.3 The seam with 22b

| Brief acceptance | Carried by |
|---|---|
| 1 — historical order: `Təsdiqlənib` + `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb` | **22a** (order page) |
| 2 — one-sentence explanation; the contradicting clause gone | **22a** |
| 3 — in-system approval unchanged, no `Tarixi sifariş` | **22a** (order page); 22b repeats it on its surfaces |
| 4 — objects list and monthly report say it the same way | **22b**, deliberately left, waiting on HD-010 |
| 5 — no status, version, amount, workflow or permission change | **22a** and 22b, each for its own diff |
| 6 — old-terms sweep green | **22a** and 22b |

Brief requirement 5 ("eyni ifadə nişanın göründüyü hər yerdə eyni olsun") is carried by 22a through the one component
and label source, and by 22b through using it on every surface in §2.4. Between 22a and 22b the lists still show
the plain `✓ Təsdiqlənib`. That is incomplete, not contradictory, and it is said in the report.

## 4. Required behaviour

### 4.1 The labels and the component (A, D)

In `components/workflow/labels.ts`:

- `historicalImportLabel = 'Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb'` — decision 22.2, verbatim, no
  final full stop.
- `historicalApprovalReason = 'Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi üçün təsdiqləyən və tarix qeyd olunmayıb.'`
- `historicalImportNote` keeps its name and becomes `` `${historicalImportLabel}. ${historicalApprovalReason}` ``, that
  is: `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb. Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi
  üçün təsdiqləyən və tarix qeyd olunmayıb.` Its doc comment names 22.2, 22.3 and 4.1's surviving half.
- `historicalImportChipClass` — neutral: `workflowActionClass.ImportedAsApproved` (`bg-slate-100 text-slate-700`), the
  grey the history already uses for the same fact. No ring, so it does not read as a second status badge.

New `components/workflow/OrderStatusBadge.tsx`:

```ts
interface OrderStatusBadgeProps {
  status: OrderRequestStatus
  /** From the workflow's decision facts. Only an Approved order is ever shown as historical. */
  isHistoricalImport?: boolean
  size?: 'sm' | 'md'
}
```

- Renders the existing `StatusBadge` with `workflowStatusLabels[status] ?? status`, `workflowStatusSign[status]`,
  `workflowStatusClass[status]` and `size` — the approved badge's word, sign and colours unchanged.
- When `status === 'Approved' && isHistoricalImport === true`, renders beside it a `span` with
  `historicalImportLabel`, classes `historicalImportChipClass` plus a pill shape (`rounded-full`, padding and text
  size matching `size`). No sign, no amber, no emerald, no warning icon, not interactive.
- Otherwise renders the badge alone, with exactly today's output.
- Wrapper: an inline flex with wrapping, so on a phone the text drops under the badge instead of overflowing.

### 4.2 The panel (B, C)

`WorkflowPanel.tsx`'s historical branch (`:197-200`) keeps its shape — one `<p>`, no facts list, no sender, approver,
date or `Sistem` — and renders the new `historicalImportNote`. Update the comment at `:197` to cite 22.3 and 4.1.

Nothing else in the panel changes. For an order approved in this system, `Təsdiqləyən` and `Təsdiq tarixi` render
exactly as today.

### 4.3 The page header gets the flag without a second request (A)

- `WorkflowPanel` gains an optional prop `onLoaded?: (workflow: OrderWorkflow) => void`, called with the workflow
  after the initial load succeeds and after `run` succeeds. It is not called for an aborted load.
- `OrderDetailPage.tsx` keeps the last loaded `{ orderRequestId, isHistoricalImport }` from `onLoaded`. The header uses
  `isHistoricalImport` only when that `orderRequestId` equals the page's current order, so a stale value from the
  previous order is never shown.
- The header's `StatusBadge` (`OrderDetailPage.tsx:280-284`) becomes `OrderStatusBadge` with `status={data.status}` and
  that flag. Until the workflow has loaded, the header shows the plain badge — the same as today.
- No new `fetchWorkflow` call anywhere. The page still makes exactly the requests it makes today.

### 4.4 Nothing else changes

No status value, no status colour, no sign, no queue behaviour, no permission, no figure, no API type.
`StatusBadge.tsx`, `api/*.ts` and every file listed in §3.2 are unchanged.

## 5. Frontend — summary for the Coder

Changed: `components/workflow/labels.ts`, `components/workflow/WorkflowPanel.tsx`, `pages/OrderDetailPage.tsx`.
New: `components/workflow/OrderStatusBadge.tsx`, `components/workflow/OrderStatusBadge.test.tsx`.
Tests changed: `components/workflow/labels.test.ts`, `components/workflow/WorkflowPanel.test.tsx`,
`pages/OrderDecisionPage.test.tsx`; `terminology/oldTerms.test.tsx` only if a new sweep case is added (§10).
Not changed: `components/StatusBadge.tsx`, `api/*`, the approval inbox, `LocationsPage`, `LocationDetailPage`,
`LocationTrend`, `MonthlyReportTable`, `components/imports/labels.ts`, `ItemSourceDrawer`.

## 6. Backend

None. If any requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access**; do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- **No order's status may change** (22.1). If any part of this task seems to need a status change, a
  reclassification, a backfill or a migration, STOP with `BLOCKED_HUMAN`.
- No data change; HD-002's 94 rows untouched.
- Do not alter approval-queue membership, permissions or actions.
- Do not touch 22b's surfaces (§2.4), or Tasks 21, 23 and 24's screens.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- Every order's `OrderRequestStatus`. No order leaves `Approved`, and none becomes `Approved`.
- Every workflow event, its type, actor and timestamp; the history panel's words and colours.
- The approval queue's contents, permissions and actions (Task 04).
- The approver and date lines for orders approved in this system.
- Every amount, version and period on every screen.
- Amber means information still owed (Task 2). This task introduces no amber.
- The approved badge's word `Təsdiqlənib`, sign `✓` and `workflowStatusClass.Approved`.
- 4.1's surviving half: no sender, approver or date is invented for a historical order.
- Task 2's price words; Task 5's (5.1) words; decision 9.1.
- The old-terms sweep stays green.
- No backend, schema or data change.

## 9. Acceptance criteria

1. On the order page, an order whose workflow has `isHistoricalImport: true` shows `Təsdiqlənib` with `✓` in its
   existing emerald badge and, beside it, exactly `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`.
   *(brief acceptance 1; 22.2)*
2. The decision panel of that order shows exactly `historicalImportNote` (§4.1), which names the pre-BaxOrders
   workflow as the reason there is no approver and no date. `Təsdiq məlumatı mövcud deyil` appears nowhere on the
   page, and no sender, approver, date or `Sistem` appears in the panel. *(brief acceptance 2; 22.3; 4.1)*
3. An order approved in this system shows the badge with no historical text, and its `Təsdiqləyən` and
   `Təsdiq tarixi` exactly as before. A Draft, PendingApproval or ReturnedForCorrection order shows its badge exactly as
   before. *(brief acceptance 3)*
4. The historical text uses `historicalImportChipClass`, which contains no `amber`, `red`, `emerald` or `sky`, and is
   not `warningChipClass` or `warningToneClass`. *(§4.1; Task 2)*
5. The page makes no additional request: `fetchWorkflow` is called once per panel load, as before.
6. No backend, API type, status, version, amount, queue or permission changed; `git diff --stat` shows only the files
   in §5. *(brief acceptance 5; 22.1)*
7. The old-terms sweep passes on the order page with a historical order. *(brief acceptance 6)*
8. All suites and both builds are green.

## 10. Required tests

Frontend (vitest):

- **New** `components/workflow/OrderStatusBadge.test.tsx`:
  - Approved + `isHistoricalImport: true` → `Təsdiqlənib`, `✓` and `Tarixi sifariş · sistemə təsdiqlənmiş kimi
    köçürülüb` are rendered; the badge keeps `workflowStatusClass.Approved`;
  - Approved + `false`, and Approved with the prop omitted → the badge alone, with no historical text;
  - **the rendering guard**: for every `OrderRequestStatus` × `isHistoricalImport` ∈ {true, false}, the status word
    equals `workflowStatusLabels[status]`, and the historical text appears only for Approved + true. A future change
    that alters a status word fails here;
  - the historical text's element carries `historicalImportChipClass`, and that class contains none of `amber`, `red`,
    `emerald`, `sky` and differs from `warningChipClass` — asserted explicitly, so a later restyle cannot quietly make
    it a warning.
- `components/workflow/labels.test.ts` — replace the 4.1 test (`:46-49`):
  - `historicalImportLabel` is exactly the 22.2 phrase;
  - `historicalImportNote` starts with it, contains `BaxOrders iş axını yaranmazdan əvvəl`, contains `təsdiqləyən` and
    `tarix`, and does not contain `Təsdiq məlumatı mövcud deyil`;
  - `findOldTerms` on an element holding the note finds nothing.
- `components/workflow/WorkflowPanel.test.tsx` — the historical block (`:660-700`):
  - update the sentence to `historicalImportNote` and the block comment to cite 22.3; keep every "names nobody and
    dates nothing" assertion as it is;
  - add: `onLoaded` is called once with the loaded workflow, and not after unmount/abort;
  - add: the panel never contains `Təsdiq məlumatı mövcud deyil`.
- `pages/OrderDecisionPage.test.tsx` — the `an order carried in as already approved` block (`:1648-1721`):
  - update `:1711-1720` to the new note, keeping its `Göndərən` / `Təsdiqləyən` / `Sistem` assertions;
  - add: the header shows the approved badge and `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`;
  - add: `Təsdiq məlumatı mövcud deyil` is absent from the whole page;
  - add: `fetchWorkflow` was called exactly once;
  - add: `findOldTerms(document.body)` is empty for this order.
- `pages/OrderDecisionPage.test.tsx` — an in-system approved order (extend the existing `shows who approved and when,
  once approved — and still the status only once` at `:846`): no historical text in the header; `Təsdiqləyən` and
  `Təsdiq tarixi` render as before; the status word still appears once.
- `terminology/oldTerms.test.tsx`: the existing order-page sweep stays green unchanged.
- Every existing test changed by this task is listed in the report with its reason. No expectation may be weakened
  to pass: the three 4.1 sentence tests change because 22.3 retires the sentence, and nothing else changes.

Backend: none. Run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors.
- `dotnet test BaxOrders.slnx` — unchanged from Task 21's accepted totals: **1046 unit, 791 integration**, all green.
  Say in the report that `HistoricalApprovalTests` and the approval/workflow integration tests are untouched and
  green.
- `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` — green, with
  counts. Task 21's baseline is **59 files / 1195 tests**; expect one more file.
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/` and the manual pack.

### Manual verification pack (operator stage)

Prepare, do not execute: `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md` — checks `F-01 … F-08`, each result
line `---- operator doldurur ----`. Cover, on the order page only: a historical order's header (badge and text); its
decision panel sentence; the absence of `Təsdiq məlumatı mövcud deyil`; an in-system approved order's header and
approver/date; a pending order's header; the text's colour (grey, not amber); the history panel unchanged. Viewports
`1366×768 · 1440×900 · 390×844 · 1200×800` — at `390×844` record whether badge and text wrap acceptably. Screenshots
`<ID>-<ekran>-<en>.png`. Leave a heading `22b — siyahılar və aylıq hesabat` with the line "22b tərəfindən
doldurulacaq; F-09-dan davam edir." State plainly that the Coder did no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Statuslar dəyişmir; tarixi sifarişlər təsdiqlənmiş qalır. | §7, §8; criterion 6; 22.1 |
| Nişan: "Təsdiqlənib" + "Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb". | §4.1, §4.3; criterion 1; 22.2 |
| İzah təsdiqin BaxOrders-dən əvvəl verildiyini deyir. | §4.1, §4.2; criterion 2; 22.3 |
| "Təsdiq məlumatı mövcud deyil" nişanla yanaşı qalmır. | §4.2; criterion 2; 22.3 |
| Eyni ifadə hər yerdə eynidir. | §4.1 one component and source; the surfaces in 22b (§3.3) |
| Qəbul 4 — obyektlər siyahısı, aylıq hesabat | **22b**, after HD-010 |
| Köhnə terminlər süpürgəsi yaşıl qalır. | criterion 7; §10 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. The approved badge keeps its word, sign and emerald, and the 22.2 phrase is separate text beside it rather than a
   replacement word. 22.1 says these orders are approved; changing the badge would weaken that.
2. The historical text is grey — the same grey the history already gives `ImportedAsApproved` — with no ring, so it
   reads as context and not as a second status. Amber is Task 2's colour for information still owed, and nothing is
   owed here.
3. The panel keeps one paragraph: the 22.2 phrase, then the 22.3 reason. The phrase is repeated there because on a
   phone the panel sits after the analysis, far from the header.
4. `Excel importu ilə daxil edilib` is dropped with the rest of 4.1's sentence. 22.2's `sistemə … köçürülüb` says how
   the order arrived, and 22.3 retires the sentence as a whole.
5. `StatusBadge` stays generic and a new `OrderStatusBadge` composes it, so the workflow wording has one owner and the
   coverage and permission badges are untouched.
6. The header learns the flag from the panel's existing load through `onLoaded`, not from a second `fetchWorkflow`
   and not from the order DTO, so there is no extra request and no backend change.
7. The flag is taken from `decisionFacts.isHistoricalImport` and never inferred from a missing approver or date. That
   absence is the ambiguity that caused this defect.
8. The explanation is two constants and one composed note, not a function: it has no parameters. The draft's "built by
   a named function" was about keeping it in one named place, which this does.
9. The task is split. 22a has no open question. 22b needs HD-010, and the order page does not have to wait for it.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Nişan — nə göstərilir, hansı halda yanında mətn çıxır, rəngin niyə neytral olduğu.
2. İzah cümləsi — tam mətn, harada yaşayır, hansı köhnə cümlənin götürüldüyü (4.1 → 22.3).
3. Başlıq bayrağı necə alır — `onLoaded`, əlavə sorğu olmadığı.
4. Status — **heç bir sifarişin statusu dəyişmədi**; təsdiq növbəsi, icazələr və iş axını hadisələri toxunulmadı.
5. Testlər — yeni testlər (status rendering guard daxil); dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar;
   build-lər; `HistoricalApprovalTests` və təsdiq/iş axını integration testlərinin yaşıl qaldığı.
6. Əl ilə yoxlama dəsti — fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb.
7. Toxunulmayanlar — status, versiya, məbləğ, növbə, icazə, baza, backend, data, 22b-nin səthləri.
8. 22b üçün qeydlər — `OrderStatusBadge`-in API-si; siyahılarda hələ köhnə görünüş olduğu.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
