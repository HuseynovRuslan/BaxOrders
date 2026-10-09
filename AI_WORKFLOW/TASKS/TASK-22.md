# TASK 22 — TARİXİ TƏSDİQ İFADƏSİ (P0)

Priority: **P0**
Brief: `AI_WORKFLOW/BRIEFS/TASK-22.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** One badge, one explanatory line, their label file and tests.
Specification status: **DRAFT — §2 UNVERIFIED. Not READY.** Written by the Product/UX planning agent on 2026-09-25.
**The Planner must complete §2 against the accepted HEAD, attach `file:line`, and set this status to READY.**

> **Planner, 2026-09-26 — SPLIT, and this file is kept as the adopted draft, unchanged below this note.** §2 was
> verified against HEAD `b6b987c` in `TASKS/TASK-22a.md` §2, which also lists the draft's corrections (§2.6). The
> task runs as **22a → 22b**:
> - **22a** (`TASKS/TASK-22a.md`, READY): the order page, the shared `OrderStatusBadge` and the label source. Brief
>   acceptance 1, 2, 3, 5, 6.
> - **22b** (not yet specified): the objects list, the object page, `LocationTrend` and the monthly report. Brief
>   acceptance 4. Their APIs do not carry `isHistoricalImport`, and the brief puts the backend out of bounds, so 22b
>   waits on the owner's answer to **HD-010** in `PLAN.md`.
> Nothing below is removed; where it disagrees with `TASK-22a.md` §2.6, the reason is given there.

This task changes **frontend wording only**. It does not change any order's status, any workflow event, any
permission, any API and any database. **No order moves away from Approved.** There is no `DATA_MIGRATION` marker in
this file, on purpose — and adding one would be wrong: there is nothing to migrate.

---

## 1. Context

The brief's goal: "Tarixi sifarişlərin statusu doğru qalsın, ifadəsi isə özünü təkzib etməsin."

On the running application the order page shows, side by side:

> `✓ Təsdiqlənib`  ·  `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.`

Both statements are true and together they read as a contradiction. The status is **correct**: these orders were
genuinely approved in the business. They were approved before BaxOrders existed, so no approver and no date can be
attributed inside this system.

The domain already models this precisely — see §2.1. Nothing needs to be computed, inferred or migrated. This is a
sentence problem.

## 2. Verified current behaviour (repository at `<HEAD after TASK-21 is accepted — Planner fills in>`)

> **Planner:** verify each statement and attach `file:line`.

### 2.1 The domain already distinguishes it

`api/workflow.ts` carries:

- a workflow event type **`ImportedAsApproved`**, documented in the repository as: *"Carried in already approved,
  from before this system existed. Deliberately not `Approved`: nobody approved these here, and it has no actor
  because there is no person here to attribute it to."*
- a field **`isHistoricalImport: boolean`**, documented as: *"Carried in from Excel as already approved; every other
  field is then empty (4.1)."*

So the front end already knows, per order, whether the approval happened here or was carried in. The order's
`OrderRequestStatus` is `Approved` in both cases and **stays** `Approved`.

### 2.2 Where the two statements are rendered

- The badge: `components/StatusBadge.tsx`, with wording in `components/workflow/labels.ts` and/or
  `components/imports/labels.ts` (`orderStatusLabels`). **Planner: establish which file owns the approved label and
  whether `StatusBadge` receives `isHistoricalImport` today or must be given it.**
- The side panel line on the order page: rendered by `pages/OrderDetailPage.tsx` or
  `components/workflow/WorkflowPanel.tsx`. **Planner: establish which, and where its sentence lives.**
- The same badge appears on `pages/LocationsPage.tsx`, on `pages/LocationDetailPage.tsx`'s period rows, and as a
  status dot in `components/reports/MonthlyReportTable.tsx`'s legend.

### 2.3 What the approval queue does

`pages/ApprovalInboxPage.tsx` was empty on the running application. Historical imports never enter the queue — they
arrive approved. **Planner: confirm that nothing in this task can change queue membership.** If it can, STOP.

## 3. Scope

In scope:

- A. the badge, where `isHistoricalImport` is true, reads as approved **and** as historical;
- B. one explanatory sentence that says why no approver and no date are recorded;
- C. removal of the standalone `Təsdiq məlumatı mövcud deyil` line where it stands beside the badge and contradicts
  it;
- D. the same treatment wherever the badge appears;
- E. tests.

Out of scope:

- any order's status, version, amount or history — **unchanged, and protected by §7**;
- the approval queue, its membership, its permissions and its actions — **Task 04's**;
- the workflow panel's event list for orders that were approved in this system;
- the dashboard's and monthly report's figures and colours — **Tasks 21's and 24's**;
- the source dialog and the raw line table — **Task 23's**;
- any backend or database change of any kind.

## 4. Required behaviour

### 4.1 The badge (A)

Where `isHistoricalImport` is true, the reader sees both facts and the approved state is not weakened:

```
✓ Təsdiqlənib    Tarixi sifariş
```

The approved badge keeps its existing appearance and its existing word. `Tarixi sifariş` is a separate, neutral chip
beside it — **not** amber (amber means incomplete information, Task 2) and **not** a warning. Nothing here is
incomplete; it is an older order.

Where `isHistoricalImport` is false, the badge renders exactly as today, with no second chip.

### 4.2 The explanation (B, C)

Replace the contradicting line with one sentence that carries the brief's semantics:

> `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb. Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi üçün
> təsdiqləyən və tarix qeyd olunmayıb.`

- It lives in the workflow label file, built by a named function, not inline.
- It must not use `Təsdiq məlumatı mövcud deyil` as a standalone clause beside the badge.
- It must not use any retired term from `src/test/oldTerms.ts`.
- Where the order was approved in this system, the existing approver and date lines are unchanged.

**Planner:** confirm the exact final wording with the owner's brief; the sentence above is the brief's own direction
and should be taken as written unless the owner has since refined it.

### 4.3 Every surface (D)

Apply A and B wherever the approved badge is rendered for an order that may be a historical import: the order page,
the locations directory, the location detail page's period rows, and the monthly report's status indication. One
label source, imported by all of them — not four copies.

Where a surface has no room for a second chip (a status dot in a dense matrix), the distinction is carried in the
existing `title` / accessible description rather than by adding a visual element. **Planner: name those surfaces.**

### 4.4 Nothing else changes

No status value, no status colour scheme, no queue behaviour, no permission, no figure.

## 5. Frontend requirements — summary for the Coder

Changed (expected): `components/StatusBadge.tsx`, `components/workflow/labels.ts` (the chip word and the sentence),
the component that renders the order page's approval panel, and the call sites that must now pass
`isHistoricalImport` down, plus tests.

Not changed: `api/workflow.ts`; `api/orders.ts`; the approval inbox; every figure; every other screen's layout.

## 6. Backend

None. `isHistoricalImport` and the `ImportedAsApproved` event already exist and already say exactly what is needed.
No C# change, no API contract change, **no status change**. If a requirement seems to need a backend change, **STOP**
and report why.

## 7. Safety and STOP conditions

- **No database access**; do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- **No order's status may change.** Historical imports were genuinely approved in the business and stay `Approved`.
  If any part of this task appears to require a status change, a re-classification, a backfill or a migration, STOP
  immediately with `BLOCKED_HUMAN` — the owner has decided this point (22.1).
- No data change; HD-002's 94 rows untouched.
- Do not alter approval-queue membership, permissions or actions. If a change here can affect who may approve what,
  STOP.
- Do not touch screens owned by Tasks 21, 23, 24 beyond the badge and its sentence.
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- **Every order's `OrderRequestStatus`.** No order leaves `Approved`; none becomes `Approved`.
- Every workflow event, its type, its actor and its timestamp.
- The approval queue's contents, permissions and actions (Task 04).
- The approver and date lines for orders approved inside this system.
- Every amount, version and period on every screen.
- Amber means incomplete information and nothing else (Task 2); this task introduces no amber.
- Task 2's price words; Task 5's (5.1) words; decision 9.1.
- The old-terms sweep stays green.
- No backend, schema or data change.

## 9. Acceptance criteria

1. An order with `isHistoricalImport: true` renders `Təsdiqlənib` and, beside it, `Tarixi sifariş`; the approved
   badge's own word and appearance are unchanged. *(brief acceptance 1)*
2. The same screen explains in one sentence that the approval predates the BaxOrders workflow and that this is why no
   approver and no date are recorded; the standalone `Təsdiq məlumatı mövcud deyil` clause no longer stands beside
   the badge. *(brief acceptance 2)*
3. An order approved inside this system renders the badge with no `Tarixi sifariş` chip and keeps its approver and
   date exactly as before. *(brief acceptance 3)*
4. The locations directory, the location detail page's period rows and the monthly report's status indication
   distinguish a historical import in the same words, from one label source. *(brief acceptance 4)*
5. No order's status, version or amount changed anywhere; the approval queue's contents and permissions are
   identical. *(brief acceptance 5, decision 22.1)*
6. The new chip is not amber and is not styled as a warning. *(§4.1)*
7. The old-terms sweep passes with the new sentence. *(brief acceptance 6)*
8. All suites and both builds green.

## 10. Required tests

Frontend (vitest):

- `components/StatusBadge.test.tsx`:
  - `isHistoricalImport: true` on an approved order → both the approved word and `Tarixi sifariş` are rendered;
  - `isHistoricalImport: false` → only the approved word;
  - a non-approved status is unaffected by the flag;
  - the historical chip does not carry the warning/amber class used by Task 2's missing-price mark (assert the class
    contract explicitly, so a later restyle cannot silently make it a warning).
- **New or extended** `components/workflow/labels.test.ts`: the explanation sentence builder; it names the
  pre-BaxOrders reason; it contains no retired term (`findOldTerms`); it does not contain the standalone
  `Təsdiq məlumatı mövcud deyil` clause.
- `pages/OrderDecisionPage.test.tsx` *(or the order-page test file at HEAD)*:
  - a historical import renders badge + chip + the sentence, and does not render the old contradicting line;
  - an in-system approval renders the approver and date unchanged.
- `pages/LocationsPage.test.tsx` and the monthly-report test file: the same distinction, same words.
- **A guard test**: render a fixture set covering every `OrderRequestStatus` with both values of
  `isHistoricalImport` and assert the rendered status word for each — so any future change that alters a status word
  fails here. Statuses themselves are not asserted against the database; this is a rendering guard.
- `terminology/oldTerms.test.tsx`: the order page and locations sweeps still pass.
- Existing tests asserting the removed line change with this task; update them and list each with the reason. No
  expectation may be weakened to pass.

Backend: none; run both suites to prove nothing moved — in particular the approval and workflow integration tests
must be untouched and green.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors.
- `dotnet test BaxOrders.slnx` — counts unchanged from TASK-21's accepted totals (**Planner: fill in**). Call out
  explicitly in the report that the approval/workflow integration tests are unchanged and green.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` —
  green, with counts.
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/`.

### Manual verification pack (operator stage)

Prepare, do not execute: `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md` — checks `F-01 … F-09`, each result
line `---- operator doldurur ----`. Cover: a historical import on the order page, in the locations directory, on the
location detail page and in the monthly report; an in-system approval on the same four surfaces; the absence of the
old contradicting line; the chip's colour. Viewports `1366×768 · 1440×900 · 390×844 · 1200×800` — at `390×844`
record whether badge and chip wrap acceptably. Screenshots `<ID>-<ekran>-<en>.png`. State plainly that the Coder
performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Statuslar dəyişmir; tarixi sifarişlər təsdiqlənmiş qalır. | §7, §8; criterion 5, decision 22.1 |
| Nişan: "Təsdiqlənib" + "Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb". | §4.1, §4.2; criteria 1, 2 |
| İzah təsdiqin BaxOrders-dən əvvəl verildiyini deyir. | §4.2; criterion 2 |
| Ziddiyyət yaradan cümlə nişanla yanaşı qalmır. | §4.2; criterion 2 |
| Eyni ifadə hər yerdə eynidir. | §4.3; criterion 4 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. The approved badge keeps its own word and appearance, and `Tarixi sifariş` is a second, neutral chip beside it,
   rather than a replacement word like `Tarixi təsdiq`. The owner's decision is that these orders **are** approved;
   changing the word would soften a status the owner says is true.
2. The chip is neutral, not amber. Amber is already spoken for: it means information is still owed (Task 2). Nothing
   is owed here.
3. The explanation is one sentence, not two lines and not a hint icon, because the contradiction the audit found was
   caused by two separate statements sitting beside each other.
4. In dense surfaces (the monthly report's status dot) the distinction goes into the existing accessible description
   rather than adding a visual element, so the matrix's density is not changed by this task.
5. `isHistoricalImport` is threaded to `StatusBadge` as an explicit prop rather than inferred from the presence or
   absence of an approver, because absence of an actor is exactly the ambiguity that caused this defect.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Nişan — nə göstərilir, hansı halda ikinci çip çıxır, rəngin niyə neytral olduğu.
2. İzah cümləsi — tam mətn, harada yaşayır, hansı köhnə cümlənin götürüldüyü.
3. Səthlər — dörd ekranda eyni ifadə; sıx səthlərdə necə həll olundu.
4. Status — **heç bir sifarişin statusu dəyişmədi**; təsdiq növbəsi, icazələr və iş axını hadisələri toxunulmadı.
5. Testlər — yeni testlər (status rendering guard daxil); dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar;
   build-lər; təsdiq/iş axını integration testlərinin yaşıl qaldığı.
6. Əl ilə yoxlama dəsti — fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb.
7. Toxunulmayanlar — status, versiya, məbləğ, növbə, icazə, baza, backend, data.
8. Sonrakı tapşırıqlar üçün qeydlər — təsdiq görünürlüyü (TASK-29) üçün; Task 04-də tapılan hər hansı defekt.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
