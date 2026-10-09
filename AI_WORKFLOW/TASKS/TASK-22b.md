# TASK 22b — TARİXİ TƏSDİQ İFADƏSİ: SİYAHILAR VƏ AYLIQ HESABAT (P0)

Priority: **P0**
Brief: `AI_WORKFLOW/BRIEFS/TASK-22.md`, the owner's settled requirement. Its decisions 22.1 … 22.4 are in
`BRIEFS/OWNER_BRIEFS_MASTER.md`:835–839. 22.4 is HD-010's answer, option 1, recorded 2026-09-26. The brief decides
*what* and *why*; this file decides *how*. Where this file and the brief disagree, the brief wins, and the Coder stops
and reports.
Parent: `TASKS/TASK-22.md` (the adopted draft), split into `TASKS/TASK-22a.md` (accepted, `cc46329`,
`REVIEWS/TASK-22a.md`) and this file.
Part: **22b of 22a → 22b.** It is the last part of Task 22.
Specification status: **READY.** Verified by the Planner on 2026-09-26 against HEAD `cc46329`, Task 22a's accepted
commit.

This task adds **one read-only boolean** to three list results and shows 22a's wording on the four surfaces that read
them. It changes no order's status, no workflow event, no permission, no schema and no data. **No order moves away
from Approved.** There is no migration marker in this file, on purpose: nothing is written to the database.

---

## 1. Context

22a made the order page say `✓ Təsdiqlənib` and, beside it, `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`.
The objects list, the object page and the monthly report still show only the plain `✓ Təsdiqlənib` for the same
order. Brief acceptance 4 and requirement 5 say every surface must word it the same way.

Those three screens read list endpoints that do not carry the fact (HD-010). The owner allowed one read-only backend
field for this (22.4). It is computed **by the rule the workflow already uses**, so the list and the order page can
never disagree.

## 2. Verified current behaviour (HEAD `cc46329`)

### 2.1 The rule, and where it lives today

- `src/BaxOrders.Application/Orders/Workflow/OrderWorkflowDtos.cs:145-193` — `WorkflowDecisionFactsDto.Compute(status,
  ownHistory, earlierVersionsHistory)`. The rule is at `:155-161`: the chain is the earlier versions' events followed by
  the request's own. A request is historical when **no event in the chain is `SubmittedForApproval`** and **its own
  history holds an `ImportedAsApproved` event**. It then returns `HistoricalImport` (`:133`).
- `src/BaxOrders.Application/Orders/Workflow/OrderWorkflowService.cs:162-184` — `DecisionFactsAsync` builds
  `earlierVersionsHistory`:
  - it loads the revision links (`RevisionOrderRequestId → SourceOrderRequestId`) of the request's own location and
    month (`:165-169`);
  - it walks them back from the request, with a guard against a cycle (`:171-175`);
  - it loads those versions' events in one query (`:177-181`).

  It is two queries whatever the chain's length. `tests/BaxOrders.IntegrationTests/ApprovalDecisionFactsTests.cs:195-201`
  pins that.
- Unit tests of the rule: `tests/BaxOrders.UnitTests/Orders/WorkflowDecisionFactsTests.cs:160-190` (historical, and
  in-system approved is not).
- Where the events came from: migration `20260923122642_AddLinePricingModeAndHistoricalApproval.cs:79-99`. It wrote one
  `ImportedAsApproved` event beside every imported Draft request and set it to `Approved`. No application code writes
  that action (`grep ImportedAsApproved src/` finds only the enum, the rule and the migration).

The historical request's `OrderRequestStatus` is `Approved`, exactly as for an order approved in this system. Status
alone cannot tell them apart. That is why a field is needed.

### 2.2 The three list results

| Result | DTO | Built at | Endpoint |
|---|---|---|---|
| Objects list | `LocationOrderSummaryDto`, `src/BaxOrders.Application/Orders/OrderReadDtos.cs:38-63`; latest order's status `LatestRequestStatus` `:49` | `LocationOrderQueries.ListAsync` `LocationOrderQueries.cs:25-124`; projection `:70-103`; latest-order enrichment `WithLatestOrderAsync` `:134-226` | `GET /api/v1/locations/orders` (`LocationsController.cs:21`) |
| Object page | `LocationOrderHistoryEntryDto`, `OrderReadDtos.cs:90-106` | `LocationOrderQueries.GetHistoryAsync` `:229-334`; projection `:293-310`; post-processing `:312-314` | `GET /api/v1/locations/{id}/orders` (`LocationsController.cs:28-31`) |
| Monthly report | `MonthlyReportCellDto`, `src/BaxOrders.Application/Reports/MonthlyReportDtos.cs:34-49` | `MonthlyReportQueries.GetAsync` `MonthlyReportQueries.cs:37-104`; requests `:63-71` (`RequestRef` `:317-318`); cells `Cell` `:202-241`, empty cell `:216-217`, request cell `:225-240` | `GET /api/v1/reports/monthly` (`ReportsController.cs:23`) |

- `LocationOrderSummaryDto` already ends in optional parameters (`:55-63`), and the projection at `:72` omits them.
- `LocationOrderHistoryEntryDto` and `MonthlyReportCellDto` have no optional parameter today.
- Nothing else constructs the three DTOs (`grep`, `src/`, `tests/`, `tools/`). The migration tools under `tools/` read
  named fields only (`tools/BaxOrders.CatalogueMigration/Invariants.cs:136-178`), so a new field changes none of their
  figures.

### 2.3 Query-count tests that the change touches

- `tests/BaxOrders.IntegrationTests/MonthlyReportTests.cs:288-308` and `:312-330` assert the report costs exactly **4**
  queries: the years, the locations, the requests and their lines. The comment's point is "not one per cell".
- `ApprovalDecisionFactsTests.cs:195-201` asserts that one more version in the chain costs no extra query on the order
  page.
- No query-count test exists for `LocationOrderQueries`.

### 2.4 The four surfaces (frontend)

All four render the workflow status with `StatusBadge` and the workflow labels directly.

| Surface | Code | Data |
|---|---|---|
| Objects list, status column | `frontend/bax-orders-web/src/pages/LocationsPage.tsx:199-209` (badge `:201-206`, `size="sm"`); imports `:6`, `:8` | `LocationOrderSummary.latestRequestStatus` (`api/orders.ts:42`) |
| Object page, period rows | `pages/LocationDetailPage.tsx:311-318` (badge `:312-317`, `size="sm"`); imports `:21-22` | `LocationOrderHistoryEntry.status` (`api/orders.ts:70-83`) |
| Object page, latest-order card | `components/locations/LocationTrend.tsx:86-93` (badge `:87-92` inside a `<p className="mt-1 text-xs">`); imports `:29-30` | `entries[0]`, the same entries (`LocationDetailPage.tsx:166-167`) |
| Monthly report | `components/reports/MonthlyReportTable.tsx`, detailed below | `MonthlyReportCell.status` (`api/reports.ts:10-35`) |

The monthly report in detail:

- `markedStatuses` (`:56`) — Pending, Approved, Returned get a dot; Draft is left unmarked (`:288`).
- The dot: `StatusDot` (`:316-323`), `aria-hidden`, coloured by `workflowStatusClass`, drawn at `:298`.
- The cell's words: `describe()` (`:335-357`) pushes `workflowStatusLabels[cell.status]` at `:352-354`. The result is
  the link's `title` and, with the location name, its `aria-label` (`:267-268`).
- The legend: `Legend` (`:397-436`) lists the three marked statuses with their dot and word (`:403-408`).
- The phone year list reuses the same `Cell` (`:506`) and the same `Legend` (`:454`).

22a's building blocks, all unchanged at `cc46329`:

- `components/workflow/OrderStatusBadge.tsx:30-57`: `status`, `isHistoricalImport?`, `size?`. Without the flag its
  output is byte-identical to `StatusBadge` with the workflow words (pinned by `OrderStatusBadge.test.tsx`).
- `components/workflow/labels.ts:66` `historicalImportLabel`, `:69-70` `historicalApprovalReason`, `:80`
  `historicalImportNote`, `:86` `historicalImportChipClass` (slate).

Cards and rows as surfaces (Task 20): `components/interaction.ts:13` — a click inside `a, button, … [role="note"]`
keeps its own behaviour. 22a's phrase is a plain `span` with no handler and no role, so it is inert text and a click
on it still opens the row's or card's link.

Frontend test fixtures that build these types, and must gain the new field:

- `pages/LocationsPage.test.tsx:20`;
- `pages/LocationDetailPage.test.tsx:30`;
- `components/locations/LocationTrend.test.tsx:17`;
- `pages/MonthlyReportPage.test.tsx:22` and `:44`;
- `terminology/oldTerms.test.tsx:705` and `:860`.

`tsconfig.app.json:23` includes `src`, so `tsc -b` type-checks the tests.

### 2.5 Baselines at `cc46329`

- Frontend 60 files / 1219 tests.
- Backend 1046 unit / 791 integration.
- Both builds clean.

## 3. Scope

### 3.1 In scope

- A. One shared rule, moved out of `Compute` and the workflow service, used by the order page and by the lists (§4.1).
- B. One read-only boolean on each of the three DTOs, computed through that rule (§4.2).
- C. The objects list, the object page's period rows and its latest-order card use `OrderStatusBadge` with the flag
  (§5.2).
- D. The monthly report says the phrase in the cell's words (§5.3).
- E. Tests, and the manual pack from F-09.

### 3.2 Out of scope

- Any order's status, version, amount, period or workflow event. These are **unchanged**, protected by §7.
- The approval queue, its membership, permissions and actions (Task 04). `ApprovalInboxQueries` is not touched.
- The order page, the decision panel and `WorkflowPanel.onLoaded`. They are 22a's and accepted.
- `OrderStatusBadge`'s output and the 22a labels' wording. 22b reuses them and does not reword them.
- The dashboard. It renders no workflow status (`TASK-22a.md` §2.4).
- `LocationsPage.tsx`'s hover-only rows and its two links per row (`TASK-20.md` §12), and the object page's links and
  "Müqayisə" button. These are Task 24's.
- `components/imports/labels.ts`'s `orderStatusLabels`, `ItemSourceDrawer` (Task 23).
- `docs/audits/2026-final-enver-muellim-audit*` (Task 15's record), and the comment in
  `tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs:67-68`.
- Schema, migrations, `tools/`, the database.

### 3.3 Which brief acceptance criteria this part carries

| Brief acceptance | Carried by |
|---|---|
| 1 — the order page: `Təsdiqlənib` + the 22.2 phrase | 22a (accepted). 22b must not change it. |
| 2 — one-sentence reason; the contradicting clause gone | 22a (accepted). 22b must not change it. |
| 3 — an in-system approved order: no `Tarixi sifariş` | **22b**, repeated on its own four surfaces |
| 4 — the objects list and the monthly report say it the same way | **22b** |
| 5 — no status, version, amount, workflow or permission change | **22b**, on its own diff |
| 6 — old-terms sweep green | **22b**, on its own diff |

Brief requirement 5 ("eyni ifadə nişanın göründüyü hər yerdə eyni olsun") is completed here. After 22b, every place
that shows a workflow status with the workflow labels takes its words from `components/workflow/labels.ts`. It shows
the phrase under one condition: `status === 'Approved'` and the flag is true.

## 4. Backend

### 4.1 One rule, in one place (A)

New file `src/BaxOrders.Application/Orders/Workflow/HistoricalImportRule.cs`, a `public static class
HistoricalImportRule`, with three members:

1. **The rule itself** — moved, not copied:

   ```csharp
   /// Carried in from Excel as already approved: nothing in the chain was ever sent for approval, and the request's
   /// own history holds the carried-over event.
   public static bool Holds(IEnumerable<OrderWorkflowAction> ownActions, IEnumerable<OrderWorkflowAction> earlierActions)
   ```

   Its meaning is exactly `OrderWorkflowDtos.cs:157-158`: not any `SubmittedForApproval` in `earlier ∪ own`, and any
   `ImportedAsApproved` in `own`. `WorkflowDecisionFactsDto.Compute` calls it in place of those lines:
   `if (HistoricalImportRule.Holds(ownHistory.Select(…Action), earlierVersionsHistory.Select(…Action))) return HistoricalImport;`.
   The rest of `Compute` is unchanged.

2. **The chain walk** — moved from `OrderWorkflowService.cs:171-175`, cycle guard included:

   ```csharp
   /// The versions this request corrects, nearest first, followed back through the revision links.
   public static IReadOnlyList<long> EarlierVersions(long orderRequestId, IReadOnlyDictionary<long, long> sourceByRevision)
   ```

   `DecisionFactsAsync` calls it in place of its loop. Its two queries and their shape are unchanged.

3. **The batch** — for the lists:

   ```csharp
   /// Which of these requests are historical imports, by the same rule and the same chain as the order page.
   public static async Task<IReadOnlySet<long>> AmongAsync(
       IBaxOrdersDbContext db, IReadOnlyCollection<long> orderRequestIds, CancellationToken cancellationToken)
   ```

   - An empty input returns an empty set, with **no query**.
   - Otherwise it runs **exactly two queries**, whatever the number of requests and the length of their chains:
     1. The revision links whose revision request shares a location and a month with any of the given requests. This
        is the same scope `DecisionFactsAsync` uses (`:165-167`), taken for all of them at once through a correlated
        `Any` over `db.OrderRequests` filtered by the given ids. Read it as a `RevisionOrderRequestId →
        SourceOrderRequestId` dictionary.
     2. The `(OrderRequestId, Action)` of every workflow event of the given requests and of all their earlier versions
        (from `EarlierVersions`). Do **not** filter by action in SQL: which actions matter is the rule's business, and
        it lives in `Holds` alone.
   - For each given id, it returns the id when `Holds(own actions, actions of its EarlierVersions)` is true.
   - It is read-only: `AsNoTracking`, no `SaveChanges`, no tracked entity.

After this, `OrderWorkflowDtos.cs` and `OrderWorkflowService.cs` contain no test of `ImportedAsApproved` or
`SubmittedForApproval` for this purpose, and no walk of their own. `grep ImportedAsApproved src/BaxOrders.Application`
finds only `HistoricalImportRule.cs`.

### 4.2 The three fields (B)

Each new parameter goes **last**, with the default `false`, so no existing positional call changes meaning.

| DTO | New parameter | Filled |
|---|---|---|
| `LocationOrderSummaryDto` (`OrderReadDtos.cs:38`) | `bool LatestRequestIsHistoricalImport = false`, after `KnownAmountPercentChange` | In `ListAsync`, after `WithLatestOrderAsync` (`:114`): one `AmongAsync` over the page's `LatestRequestId`s, then `row with { LatestRequestIsHistoricalImport = … }`. A row with no latest request stays `false`. |
| `LocationOrderHistoryEntryDto` (`OrderReadDtos.cs:90`) | `bool IsHistoricalImport = false`, after `CreatedAtUtc` | In `GetHistoryAsync`, after `:312-314`: one `AmongAsync` over the page's `OrderRequestId`s, then `with`. |
| `MonthlyReportCellDto` (`MonthlyReportDtos.cs:34`) | `bool IsHistoricalImport = false`, after `IsUnusual` | In `GetAsync`, after `:63-71`: one `AmongAsync` over the ids of the requests whose period falls in the report's year. Those are the only ones that become cells; the earlier months are read for comparison and are never shown. Pass the set down to `Cell` (through `Build`, or on `RequestRef`), and set it on the request cell (`:225-240`). The empty cell (`:216-217`) stays `false`. |

- Each gets a one-line `<param>` doc: what it says; that it comes from `HistoricalImportRule`, the same as the order
  page's `DecisionFacts.IsHistoricalImport`; and that it never changes the status, which stays `Approved`.
- If the compiler refuses to omit the new optional argument inside the EF projection (`:72`, `:298`), pass `false`
  explicitly there. The value is set after the query either way.
- The wire names (ASP.NET Core web defaults) are `latestRequestIsHistoricalImport` and `isHistoricalImport`.
- The flag is **never** inferred from `SubmittedAtUtc`/`ApprovedAtUtc` being null, from `SourceImportBatchId`, or from
  anything but the rule.

### 4.3 What it costs

- The objects list and the object page: two more queries per call, when the page has any order. Otherwise none.
- The monthly report: two more queries when the year has any request. Otherwise none. It is still a constant, never
  one per cell.
- The order page: unchanged, the same queries as today.

### 4.4 Nothing else in the backend

No controller, no endpoint, no permission, no domain type, no `DbContext` change, no configuration, no migration, no
schema. `ApprovalInboxQueries`, `ManagementDashboardQueries` and every write path are unchanged.

## 5. Frontend

### 5.1 Types and the one condition

- `api/orders.ts`:
  - `LocationOrderSummary` gains `latestRequestIsHistoricalImport: boolean`, with a doc comment. It is the workflow's
    recorded fact, it is true only with `latestRequestStatus === 'Approved'`, and it is never inferred.
  - `LocationOrderHistoryEntry` gains `isHistoricalImport: boolean`.
- `api/reports.ts`: `MonthlyReportCell` gains `isHistoricalImport: boolean`.
- `components/workflow/labels.ts` gains:
  - `showsHistoricalImport(status: OrderRequestStatus | null, isHistoricalImport: boolean | undefined): boolean`. It
    is `status === 'Approved' && isHistoricalImport === true`, the one condition under which the 22.2 phrase is shown.
  - `workflowStatusText(status: OrderRequestStatus, isHistoricalImport?: boolean): string`. It returns
    `workflowStatusLabels[status] ?? status`, followed by `` ` · ${historicalImportLabel}` `` exactly when
    `showsHistoricalImport` is true. This is the status in words, for places that cannot draw the badge.
- `OrderStatusBadge.tsx:40` uses `showsHistoricalImport` in place of its inline condition. Its output must stay
  byte-identical. Its existing 14 tests stay unchanged and green.

### 5.2 The objects list and the object page (C)

Replace `StatusBadge` + the three workflow maps with `OrderStatusBadge`, keeping `size="sm"`:

- `LocationsPage.tsx:201-206`: `<OrderStatusBadge status={location.latestRequestStatus}
  isHistoricalImport={location.latestRequestIsHistoricalImport} size="sm" />`. The `sifariş yoxdur` branch (`:207-208`)
  is unchanged.
- `LocationDetailPage.tsx:312-317`: `status={request.status}`, `isHistoricalImport={request.isHistoricalImport}`.
- `LocationTrend.tsx:87-92`: `status={latest.status}`, `isHistoricalImport={latest.isHistoricalImport}`, still inside
  its `<p className="mt-1 text-xs">`.
- Drop the imports that become unused. `StatusBadge.tsx` is unchanged.
- The phrase is inert text inside a row or card (§2.4). It adds no link, button or handler, and each row and card
  keeps the links it has today — no more, no fewer.

### 5.3 The monthly report (D)

- `describe()` (`MonthlyReportTable.tsx:352-354`) pushes `workflowStatusText(cell.status, cell.isHistoricalImport)`
  instead of the bare label. A historical approved cell's `title` and `aria-label` then read
  `… · Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`. Every other cell's words are
  byte-identical to today.
- **The dot is unchanged.** A historical order is approved (22.1), and the dot says Approved. A different dot would
  read as a fourth status, and a 64-pixel cell has no room for 22a's phrase.
- **The legend is unchanged.** It explains the marks in the grid, and 22b adds no mark. The phrase is said where the
  report already says a status in words: the cell's description.
- The phone year list gets the same words for free, because it renders the same `Cell` (`:506`).
- Change nothing else in the report: amounts, differences, colours (9.1), the unusual-month tint, the ⚠ count and the
  future-month hatch.

### 5.4 Files

- **Changed**, backend:
  - `Orders/Workflow/OrderWorkflowDtos.cs`
  - `Orders/Workflow/OrderWorkflowService.cs`
  - `Orders/OrderReadDtos.cs`
  - `Orders/LocationOrderQueries.cs`
  - `Reports/MonthlyReportDtos.cs`
  - `Reports/MonthlyReportQueries.cs`
- **New**, backend: `Orders/Workflow/HistoricalImportRule.cs`.
- **Changed**, frontend:
  - `api/orders.ts`
  - `api/reports.ts`
  - `components/workflow/labels.ts`
  - `components/workflow/OrderStatusBadge.tsx` (the condition only)
  - `pages/LocationsPage.tsx`
  - `pages/LocationDetailPage.tsx`
  - `components/locations/LocationTrend.tsx`
  - `components/reports/MonthlyReportTable.tsx`
- **Tests** as in §10.
- **Manual pack**: `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md`, under its existing 22b heading only.

## 6. Data

None. Nothing is written, so no backup, dry run or tool is needed, and `tools/` is not used. The Coder has no database
access and needs none: the integration tests run against their own test database.

## 7. Safety and STOP conditions

- **No database access**: no `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, nothing under `tools/`. The integration test
  suite's own disposable database is the only one touched.
- **No order's status may change** (22.1). If anything seems to need a status change, a reclassification, a backfill,
  a new event, a schema change or a migration, STOP with `BLOCKED_HUMAN`.
- **Do not duplicate the rule** (22.4). If the rule cannot be shared as §4.1 describes, STOP and report why. Do not
  write a second version of it, in SQL or in C#.
- If `WorkflowDecisionFactsTests`, `ApprovalDecisionFactsTests` or `HistoricalApprovalTests` fail after the extraction,
  the extraction changed the rule. Fix the extraction, never the test.
- Do not alter the approval queue, permissions or actions. Do not touch 22a's order page, or Tasks 23 and 24's screens.
- HD-002's 94 rows are untouched.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- Every order's `OrderRequestStatus`. No order leaves `Approved`, and none becomes `Approved`.
- Every workflow event, its type, actor and time; the history panel.
- The order page's decision facts for every order. `DecisionFacts.IsHistoricalImport` answers exactly as before, for
  historical, in-system, draft, pending, returned and corrected orders alike.
- The order page's query count (`ApprovalDecisionFactsTests.cs:195-201`).
- The approval queue's contents, permissions and actions (Task 04).
- Every amount, count, difference, percentage, version and period on the three screens, and every figure
  `tools/*/Invariants.cs` reads.
- The approved badge's word `Təsdiqlənib`, sign `✓` and `workflowStatusClass.Approved`. 22a's phrase and its slate
  class. No amber is added (Task 2).
- Task 2's price words, Task 5's (5.1) words, and decision 9.1.
- One link per card or row, as today. The old-terms sweep stays green.
- No schema, migration or data change.

## 9. Acceptance criteria

1. `HistoricalImportRule.Holds` is the only place the rule is written. `Compute` and `AmongAsync` both call it, and
   `DecisionFactsAsync` and `AmongAsync` both walk the chain with `EarlierVersions`. *(22.4)*
2. For every request in the tests — historical; in-system approved; draft; pending; returned; a correction; a
   correction carrying an `ImportedAsApproved` event below a submitted version — the objects list's
   `LatestRequestIsHistoricalImport`, the object page's `IsHistoricalImport` and the report cell's `IsHistoricalImport`
   equal `OrderWorkflowService.GetAsync(id).DecisionFacts.IsHistoricalImport`. *(22.4, "never disagree")*
3. A historical order reads `✓ Təsdiqlənib` and, beside it, `Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb` in
   three places: the objects list's status column, the object page's period row and the object page's latest-order
   card. Its monthly-report cell's description contains `Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş kimi
   köçürülüb`. *(brief acceptance 4; requirement 5; 22.2)*
4. An in-system approved order, and every Draft, PendingApproval and ReturnedForCorrection order, renders exactly as
   before on all four surfaces, with no `Tarixi sifariş`. *(brief acceptance 3)*
5. The report's dot and legend are unchanged. The phrase appears in no amber or warning class. *(§5.3; Task 2)*
6. No status, version, amount, event, queue or permission changes. No schema, migration or data change. The
   historical request is still `Approved`, with `SubmittedAtUtc`, `ApprovedAtUtc` and `SubmittedByUserId` null, after
   all three lists are read. *(brief acceptance 5; 22.1)*
7. `AmongAsync` costs no query for an empty input, and exactly two for one request or for many, with or without chains.
   The monthly report costs exactly 6 queries for a year with requests. *(§4.3)*
8. The old-terms sweep passes on the objects list, the object page and the monthly report with a historical order.
   *(brief acceptance 6)*
9. All suites and both builds are green. `git diff --stat` shows only the files in §5.4, §10 and the pack.

## 10. Required tests

### Backend

- **New** `tests/BaxOrders.UnitTests/Orders/HistoricalImportRuleTests.cs`:
  - `Holds` for:
    - own `[ImportedAsApproved]` → true;
    - own `[]` → false;
    - own `[SubmittedForApproval, Approved]` → false;
    - own `[ImportedAsApproved, SubmittedForApproval]` → false;
    - own `[ImportedAsApproved]` with earlier `[SubmittedForApproval, ReturnedForCorrection]` → false;
    - own `[]` with earlier `[ImportedAsApproved]` → false, because only the request's **own** carried event counts.
  - `EarlierVersions`:
    - no link → empty;
    - a three-version chain → nearest first;
    - a cycle in the links → terminates.
- `WorkflowDecisionFactsTests.cs`: **unchanged**, all green. It proves `Compute` answers as before.
- `ApprovalDecisionFactsTests.cs`: **unchanged**, all green. It proves the order page's facts and its query count are
  unchanged.
- `HistoricalApprovalTests.cs` — add, using its existing fixture (`HistoricalWorldAsync`, `WorkflowWorldAsync`):
  - the objects list's row has `LatestRequestIsHistoricalImport` true and `LatestRequestStatus` `Approved`;
  - the object page's entry has `IsHistoricalImport` true and `Status` `Approved`;
  - the report cell has `IsHistoricalImport` true and `Status` `Approved`;
  - the same three are false for an order approved through the workflow (`SubmitForApproval` then `Approve`), and for
    a draft;
  - the wire: the serialised list, history and report (`Wire` options) contain `"latestRequestIsHistoricalImport":true`
    / `"isHistoricalImport":true` for the historical order;
  - **the agreement test** (criterion 2). Seed:
    - a historical order;
    - an in-system approved order;
    - a pending order;
    - a returned v1 with its correction v2, where v2 also gets an `ImportedAsApproved` event inserted by SQL, the way
      the fixture does.

    For each, assert that the three list flags equal `DecisionFacts.IsHistoricalImport`. v2 must be false in all four
    places.
  - after reading all three lists, the historical order is still `Approved`, and its version, its event count and its
    three null moments are unchanged.

  Keep every existing test in the file as it is. The comment at `:139-143` quotes 4.1's retired sentence. It describes
  the facts, not the screen, and it is left alone.
- **New**, in `HistoricalApprovalTests.cs` or its own file, with the counting interceptor pattern
  `MonthlyReportTests.cs:297-301` already uses: `AmongAsync` issues 0 queries for `[]`, and 2 for one id, for many ids
  and for a chained id.
- `MonthlyReportTests.cs:307` and `:329`: `4` becomes `6`, and the comments name the two new reads — the revision links
  and the workflow events for the historical flag. Both still prove a constant cost, not one per cell. This is the only
  existing expectation that changes. Report it with its reason.

### Frontend (vitest)

- The fixtures in §2.4 gain the new field, defaulting to `false`.
- `components/workflow/labels.test.ts`:
  - `showsHistoricalImport` is true only for `('Approved', true)`, over all four statuses × {true, false, undefined},
    and false for `null`;
  - `workflowStatusText` equals `workflowStatusLabels[status]` in every case but `('Approved', true)`, which is
    `Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb`.
- `components/workflow/OrderStatusBadge.test.tsx`: unchanged, all 14 green.
- `pages/LocationsPage.test.tsx`:
  - a historical row shows `✓ Təsdiqlənib` with the phrase beside it, in `historicalImportChipClass`;
  - an in-system approved row, and a pending row, show their badge with no `Tarixi sifariş`;
  - a row with no order still says `sifariş yoxdur`;
  - the row's link count is unchanged.
- `pages/LocationDetailPage.test.tsx`: a historical period row shows the phrase and a non-historical row does not. The
  row's links are unchanged.
- `components/locations/LocationTrend.test.tsx`: the latest-order card shows the phrase for a historical latest order,
  and not otherwise. The card still has one "Sifarişə bax" link.
- `pages/MonthlyReportPage.test.tsx`:
  - a historical approved cell's link `title` and `aria-label` contain `Təsdiqlənib · Tarixi sifariş · sistemə
    təsdiqlənmiş kimi köçürülüb`;
  - an in-system approved cell's words are unchanged and contain no `Tarixi sifariş`;
  - the historical cell's dot carries `workflowStatusClass.Approved`, as today;
  - the legend's entries are unchanged;
  - the phone card's cell says the same words.
- `terminology/oldTerms.test.tsx`: add sweep cases where the objects list, the object page and the monthly report
  each show a historical order. `findOldTerms` finds nothing.
- List every existing test changed, with its reason. No expectation may be weakened.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors. If the running API locks `bin`, use `--artifacts-path` in the
  scratchpad, as in 22a, and say so.
- `dotnet test BaxOrders.slnx` — green. Unit and integration counts rise only by the new tests, from 1046 / 791.
  Report both numbers. Say that `WorkflowDecisionFactsTests`, `ApprovalDecisionFactsTests` and the existing
  `HistoricalApprovalTests` are unchanged and green.
- `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` — green, with
  counts from 60 / 1219.
- `git diff --stat`, `git status` — §5.4's files, the tests and the pack; nothing under `Migrations/`, `tools/`,
  `Domain/`, `Api/` or `Infrastructure/`.
- `grep -rn ImportedAsApproved src/BaxOrders.Application` shows only `HistoricalImportRule.cs`.

### Manual verification pack (operator stage)

Prepare the checks, and do not run them. They go in `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md`, under
`## 22b — siyahılar və aylıq hesabat`. Replace its placeholder line, and leave F-01 … F-08 as they are. Use the file's
existing format, with each result block starting at `---- operator doldurur ----`.

- **F-09** — objects list: a historical object's status column shows `✓ Təsdiqlənib` + the phrase.
- **F-10** — objects list: an in-system approved object and a pending one show no phrase.
- **F-11** — object page: period rows, historical and not.
- **F-12** — object page: the latest-order card.
- **F-13** — monthly report: hover a historical cell and read its tooltip. The dot is still green.
- **F-14** — monthly report: the legend is unchanged, and an in-system approved cell's tooltip is unchanged.
- **F-15** — at `390×844`, the list, the object page and the report's phone cards wrap the phrase under the badge,
  and nothing runs off the screen.
- **F-16** — real system, read-only:
  - **the API must be restarted first**, to serve the new field; until then the lists show the plain badge;
  - statuses and amounts on the three screens are the same as before;
  - `/approvals` is unchanged.

Use the viewports `1366×768 · 1440×900 · 390×844 · 1200×800`. Name screenshots `<ID>-<ekran>-<en>.png`. Say plainly
that the Coder ran no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Statuslar dəyişmir; tarixi sifarişlər təsdiqlənmiş qalır. | §4.2, §7, §8; criterion 6; 22.1 |
| Nişan: "Təsdiqlənib" + "Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb". | §5.2; criterion 3; 22.2 |
| İzah təsdiqin BaxOrders-dən əvvəl verildiyini deyir. | 22a (order page); not repeated on lists (assumption 4) |
| "Təsdiq məlumatı mövcud deyil" nişanla yanaşı qalmır. | 22a; the lists never said it |
| Eyni ifadə hər yerdə eynidir. | §5.1 one condition and one label source; §5.2, §5.3; criterion 3 |
| Qəbul 3 — adi təsdiqlənmiş sifariş dəyişmir | criterion 4 |
| Qəbul 4 — obyektlər siyahısı, aylıq hesabat | §4, §5; criteria 2, 3 |
| Qəbul 5 — status, versiya, məbləğ, axın, icazə dəyişmir | §7, §8; criterion 6 |
| Qəbul 6 — köhnə terminlər süpürgəsi | criterion 8; §10 |
| 22.4 — yalnız oxunan bir boolean, qayda təkrarlanmır | §4.1, §4.2; criteria 1, 2, 7 |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. **The rule is extracted into `HistoricalImportRule`**, together with the chain walk it depends on. The order page
   and the lists call the same two functions. 22.4 asks for one rule, and the rule's meaning includes the chain.
2. **The batch reads the events and does not filter by action in SQL.** Filtering in SQL would write the rule's two
   actions a second time. The events of a page of orders are few.
3. **Two fixed queries, not one per row.** This keeps the lists' cost constant. The report's query-count test moves
   from 4 to 6 and still proves the same property.
4. **The lists show the badge and the phrase, not the 22.3 reason.** The reason sentence is the order page's. A list
   row has room for the status and its qualifier only, and the phrase is what 22.2 says the badge reads.
5. **In the monthly report, the dot and the legend stay as they are.** The phrase goes into the cell's description,
   which is where the report already puts a status into words. A new dot would look like a fourth status, against
   22.1.
6. **Names.** The fields are `LatestRequestIsHistoricalImport` on the summary, beside `LatestRequestStatus`, and
   `IsHistoricalImport` on the entry and the cell, matching `DecisionFacts.IsHistoricalImport`. The helpers are
   `showsHistoricalImport` and `workflowStatusText`.
7. **The report looks up only the year's own requests.** The months before the year are read for comparison and never
   become a cell.
8. **Not split.** The backend part is one helper and three call sites, and the frontend part swaps one component in
   three places and changes one function. That fits one Coder session.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. **Git** — branch, HEAD, `git status --short`, `git diff --stat`.
1. **Qayda** — `HistoricalImportRule`: what moved from where, with `file:line`. The `grep ImportedAsApproved` result.
   Why the rule is not duplicated.
2. **Sahələr** — the three fields, where each is filled, and the wire names.
3. **Sorğu sayı** — `AmongAsync`'s 0/2, the report's 4 → 6, and the order page unchanged.
4. **Ekranlar** — the objects list, the object page's rows and card, and the monthly report's description. Say that
   the dot and the legend are unchanged, and why.
5. **Status** — **heç bir sifarişin statusu dəyişmədi**. No change to the approval queue, permissions, workflow events,
   schema or data.
6. **Testlər**:
   - new tests, with the agreement test described;
   - changed tests, each with its reason;
   - counts;
   - builds;
   - that `WorkflowDecisionFactsTests`, `ApprovalDecisionFactsTests` and the existing `HistoricalApprovalTests` are
     green and unchanged.
7. **Əl ilə yoxlama dəsti** — F-09 … F-16. The API must be restarted. The Coder ran no browser check.
8. **Toxunulmayanlar**.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN` or `IMPLEMENTATION_FAILED`.
