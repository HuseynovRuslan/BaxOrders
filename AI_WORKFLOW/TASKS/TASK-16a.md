# TASK 16a — İMPORT YOXLAMASINDA QİYMƏT TƏSNİFATI: SERVER VƏ DATA (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-16.md`. This is the owner's settled requirement, and 16a and 16b share it. It decides
*what* and *why*. This file decides *how*. Where this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **16a of two.** 16a builds everything behind the import screens:
- where a classification made during review is stored;
- the API that makes and lists those classifications;
- what the confirmation writes onto each imported line;
- the import's price counts, under Task 2's rule;
- the migration tool that adds the new columns to the real database.

**16b** makes the import screens speak Task 2's words, adds the classification screen, the advance warning with its
link to Qiymət təsnifatı, and the post-import result. §3 says which brief line each part carries. Together they carry
all of them.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `5bcdc84` (Task
14's accepted commit). Line numbers below are at `5bcdc84`.

This task changes the real database's **schema**: four new nullable columns on `ImportRows`, all NULL on every
existing row. The change goes through a migration tool with the five fixed commands. The task creates, changes and
deletes **no business row**: no order, line, price, pricing classification, pricing decision, product, variant,
alias, location, supplier or user. HD-002's 94 rows stay untouched.

DATA_MIGRATION: yes

---

## 1. Context

The brief's goal: "Excel importunu edən şəxs importu təsdiqləmədən əvvəl qiyməti olmayan sətirləri sistemin qalan
hissəsi ilə eyni dildə görsün, onları elə orada təsnif edə bilsin və importdan sonra hansı işin qaldığını bilsin."

Owner decisions this task carries as hard requirements:

- **16.1**: pricing classification can be done during import review, and can be corrected afterwards.
- "Qiymət vəziyyətləri və sözlər Task 2-dəki kimidir."
- "Mənbəyə görə avtomatik təsnifat olmur": Qala anbar holds both bought and free material, and only part of Azpetrol
  baza is free, so a rule like "Qala baza = ödənişsiz" would be wrong. This matches the recorded reasoning in
  `Domain/Orders/PricingMode.cs:14–22` and in migration `20260923122642_AddLinePricingModeAndHistoricalApproval.cs:40–49`.

Why the task is split: the brief needs a stored review decision (schema, hand-written migration, a five-command tool),
a new review API, a change to the one step that writes orders, new counts in three read models, and then a new review
screen plus wording changes across five import components. Task 13a (schema, tool and API, with no screen) was a full
session on its own. The seam is server and data (16a) versus screens (16b). The server is testable end to end without
the screens, and the screens only read what 16a exposes.

## 2. Verified current behaviour (repository at `5bcdc84`)

### 2.1 Task 2's rule (unchanged, and the only rule)

- `PricingMode` (`Domain/Orders/PricingMode.cs`) is `PriceRequired = 1`, `InternalFreeSupply = 2`, `Unresolved = 3`.
  It lives on the line (`OrderRequestItem.PricingMode`), never on the supplier. The code comment at lines 20–22
  reads: "It is never inferred … It is imported as a default, or a person sets it."
- `OrderLinePricing.Classify(unitPrice, mode)` (`Domain/Orders/OrderLinePricingState.cs:59`):
  - a price wins, so the line is `Priced`;
  - otherwise `InternalFreeSupply` gives `FreeInternalSupply`, `PriceRequired` gives `MissingPriceRequired`, and
    anything else gives `MissingUnclassified`.
  - Both `Missing*` states are warnings.
  - Every screen's "N sətirdə qiymət yoxdur" counts `UnitPrice == null && PricingMode != InternalFreeSupply`.
- Qiymət təsnifatı (`PricingModeReviewService`, `Application/Orders/Pricing/`) lists only unpriced lines. Its three
  totals are `Unresolved` ("Təsnif edilməyib"), `PriceRequired` ("Alış qiyməti tələb olunur") and
  `InternalFreeSupply` ("Ödənişsiz daxili təminat"). `SetAsync` moves a line's mode through
  `OrderRequestItem.SetPricingMode` and writes one `OrderItemPricingDecision` (who, when, from, to, reason) per
  change. It works on explicit line ids only, and deliberately never offers "every line of this supplier"
  (`:128–132`).

### 2.2 What an import writes today, and why it contradicts the brief

- `ImportConfirmationService.ConfirmAsync` (`Application/Imports/Confirmation/ImportConfirmationService.cs:112`) calls
  `request.AddItem(variant, quantity, unitPrice, supplier, originalProductName)`.
- `OrderRequestItem`'s constructor (`Domain/Orders/OrderRequestItem.cs:52–56`) seeds the mode **from the supplier**.
  `SupplierPriceRequirement.NotRequired` gives `InternalFreeSupply`. Anything else, including no supplier, gives
  `PriceRequired`.
- So today an unpriced imported line is **never** `Unresolved`. It lands under "Alış qiyməti tələb olunur", or, for a
  supplier somebody marked NotRequired, under "Ödənişsiz daxili təminat" **by source**. The brief requires the first
  to be "Təsnif edilməyib" and forbids the second.
- `SupplierPriceRequirement` is set on the Suppliers page (`SupplierPricingService`). Migration `20260923122642` set
  "qala baza" back to `Required`. Whether any supplier is `NotRequired` on the real database today is for `--inspect`
  to print.

### 2.3 Where the import review counts prices today (the "old, simple rule")

| Place | File | Rule today |
|---|---|---|
| Readiness "Qiymət yoxdur" / `PriceNotRequired` | `Imports/Review/ImportReadinessQueries.cs:106–118, 159–161` | Rows with a `MissingPrice` **issue** (blank cell only, not an unusable price), minus rows whose **matched supplier** is `NotRequired`. This is classification by source. |
| Confirmation preview `MissingPriceRows`, group `MissingPriceItemCount` | `Imports/Confirmation/ImportConfirmationPlanner.cs:201, 231` | `UnitPrice is null`: "qiymətsiz", with no classification. |
| Confirmation result `MissingPriceItems` | `ImportConfirmationService.cs:162` | `UnitPrice is null`. |
| Staging preview group `UnpricedRows` | `Imports/ImportPreviewQueries.cs:50, 103–104` | `ParsedUnitPrice == null`. |

An unusable price (`InvalidPrice`, `ImportRowEvaluator.cs:87–95`) is also imported as a null price, so it becomes an
unpriced line. The readiness count misses it. The preview counts it.

### 2.4 The staged row

- `ImportRow` (`Domain/Imports/ImportRow.cs`) holds the workbook values, the operator's corrections
  (`ImportRowCorrection`, one per *cell*: "what the cell should have said"), the matches, `IsExcluded`, and
  `ParsedUnitPrice`, which is the effective price after corrections.
- **Nothing on it can hold a pricing classification.** A classification is not a cell, so it must not be forced into
  `ImportRowCorrection`. See Assumption 2.
- Review writes follow one pattern (`ImportRowCorrectionService.ExecuteAsync:190–242`):
  1. open a transaction;
  2. `IImportBatchLock.AcquireAsync`;
  3. `batch.EnsureReviewable()` (only `NeedsReview` / `ReadyToImport`; otherwise `DomainException` → 422);
  4. change, then save, then return the refreshed `ImportPreview`.
- The four import controllers are `CanManageImports` at class level since Task 14 (Koordinator and Admin; a Rəhbər
  gets 403).

### 2.5 Schema, migrations, tools

- Latest migration: `20260925120000_AddProductMatchDecisions` (Task 13a). Enums are stored as strings. Actors are
  stored as `uuid` + `varchar(200)` display name + `timestamp with time zone`.
- `tests/BaxOrders.UnitTests/Persistence/DbModelTests.cs` fails when the model differs from the snapshot.
  `dotnet ef` is denied to every role, so the migration, its designer and the snapshot change are written **by
  hand**, exactly as 13a did.
- In Development the API applies pending migrations at start-up when `Database:ApplyMigrationsOnStartup` is set
  (`Api/Program.cs:64–69`). The real database gets this migration through the tool first, with a backup (§4.8).
- The model for the tool is `tools/BaxOrders.ProductMatchMigration` (Task 13a). It has the application's own
  services, a user-secrets connection string, `pg_dump -Fc` into the backup directory, `MigrationPlan`/STOP logic,
  and `Invariants.cs`. Its integration tests (`tests/BaxOrders.IntegrationTests/ProductMatchMigrationTests.cs:42, 55`)
  assume 13a's migration is the **latest**. They will fail once a newer migration exists. See §4.9.
- Integration fixtures migrate a fresh database. The approval sandbox (`tools/BaxOrders.ApprovalSandbox`, Task 04b)
  is created from the migrations too, so the new columns reach it on its next `-Create` / `-Reset`.

### 2.6 Location recognition (must not move)

Task 3 put the owner's alternative location names into `LocationAlias`. Example: "H.Ə.M Təmizlik" → HEM, Heydər Əliyev
Mərkəzi (`tools/BaxOrders.CatalogueMigration/CatalogueDecisions.cs:65`). The importer's matching reads them. No
integration test today imports a workbook row through that alias. This task adds one (§8).

## 3. Scope: where each brief line lands

| Brief line | Part |
|---|---|
| "Import yoxlaması … Task 2-nin sözləri ilə danışır: «N sətirdə qiymət yoxdur»" | **16a** gives every import count Task 2's meaning (§4.5). **16b** puts the words on the screens. |
| "Yoxlama zamanı hər qiymətsiz sətri «Alış qiyməti tələb olunur» və ya «Ödənişsiz daxili təminat» kimi təsnif etmək olur." | **16a** §4.1–§4.4 (the record and the API). **16b** builds the screen. |
| "Təsnif edilməyən sətirlər importdan sonra … «Təsnif edilməyib» kimi düşür" | **16a** §4.6 |
| "… və ekran bunu əvvəlcədən deyir; yanında Qiymət təsnifatına keçid var." | **16a** supplies the forecast numbers (§4.5). **16b** builds the sentence and the link. |
| 16.1 "sonradan da düzəliş edilə bilir"; "Import zamanı verilən təsnifat sonradan … düzəldilə bilir." | **16a** §4.6 (the lines and their decision record, which the existing page and `SetAsync` then change). Criterion 6. |
| "Importdan sonra saylar tutur: «Təsnif edilməyib» sayı … təsnif edilməyən sətirlərin sayı qədər artır." | **16a** criterion 5 |
| "Mənbəyə görə avtomatik təsnifat olmur." / Acceptance "Heç bir sətir mənbəyə görə avtomatik təsnif olunmur." | **16a** §4.6, §4.5; criterion 4 |
| Acceptance 1: "yoxlama ekranı «N sətirdə qiymət yoxdur» deyir" | 16a: the number (criterion 3). **16b**: the screen. |
| Acceptance 2: classify some, import, "seçdiyim vəziyyətlə görünür; qalanları «Təsnif edilməyib» … sayları dəqiq tutur" | **16a** criterion 5 through the API. **16b** through the screen. |
| Acceptance 3: "sonradan Qiymət təsnifatında dəyişə bilirəm" | **16a** criterion 6 |
| Acceptance 4: "Heç bir sətir mənbəyə görə avtomatik təsnif olunmur." | **16a** criterion 4 |
| Acceptance 5: "Import ekranında və qalan ekranlarda eyni sözləri görürəm." | **16b** |
| Mütləq qorunmalı: objects recognised as before, Task 3 aliases included | **16a** criterion 8 (the importer's matching is not touched; a new test proves the alias). 16b touches no matching. |
| Mütləq qorunmalı: Qiymət təsnifatı counts and paging (Task 2) | **16a** criterion 9 |
| Out of scope: classifying the 94 rows by hand; who sees Import (Task 14) | §10 |

**Deliberately left to 16b:**
- every visible word on the import screens: the readiness panel, the groups table, the confirmation dialog, the result
  panel, the row detail;
- the classification screen inside the review;
- the advance warning "N sətir … «Təsnif edilməyib» kimi düşəcək" and its link to Qiymət təsnifatı;
- the result's link;
- the old-terms sweep over the import screens;
- the visible half of acceptance 1, 2 and 5.

16a changes **no visible text**.

## 4. Required behaviour

### 4.1 Domain: the staged classification

On `ImportRow` add four properties. The names are the Planner's. The Coder may rename them, but must not change what
they mean.

| Property | Meaning |
|---|---|
| `PricingMode? PricingClassification` | null = nobody classified this row in review. Otherwise `PriceRequired` or `InternalFreeSupply`. **Never `Unresolved`**: "not classified" is the null. |
| `Guid? PricingClassifiedByUserId` | who classified it |
| `string? PricingClassifiedByDisplayName` | their name as it read then (a snapshot, `OrderItemPricingDecision.ActorDisplayNameMaxLength`) |
| `DateTime? PricingClassifiedAtUtc` | when |

Methods:

- `bool ClassifyPricing(PricingMode mode, WorkflowActor actor, DateTime utcNow)`:
  - `mode` must be `PriceRequired` or `InternalFreeSupply`. `Unresolved` or an undefined value → `DomainException`.
  - `actor.UserId` is required → `DomainException` otherwise, the same sentence as `OrderItemPricingDecision`.
  - The row must be unpriced (`ParsedUnitPrice is null`) → `DomainException` otherwise. A price has already answered
    the question (`PricingModeReviewService.cs:161–168`).
  - The same mode already set → returns `false` and changes nothing, not even the actor or the time.
  - Otherwise it sets all four properties and returns `true`.
- `bool ClearPricingClassification()`: sets all four to null. Returns `false` when already null.

A classification stays on the row whatever happens to it later:
- If a correction later gives the row a price, the classification is **inert**. No count reads it (§4.5), and the
  confirmation ignores it (§4.6).
- If the row is excluded, it is not counted, and is not imported.

The classification never touches the row's values, issues, matches or status.

### 4.2 Schema: four columns, written by hand

- `ImportRowConfiguration`:
  - `PricingClassification` is stored as a string, `character varying(30)`, nullable (the length
    `OrderRequestItem.PricingMode` uses).
  - `PricingClassifiedByDisplayName` is `character varying(200)`.
  - `PricingClassifiedByUserId` is `uuid`, and `PricingClassifiedAtUtc` is `timestamp with time zone`, both nullable.
- Check constraints:
  - `CK_ImportRows_PricingClassification`: `"PricingClassification" IS NULL OR "PricingClassification" IN
    ('PriceRequired', 'InternalFreeSupply')`;
  - `CK_ImportRows_PricingClassificationActor`: the four columns are all NULL or all NOT NULL.
- No index is needed. The lists are read per batch, and `ImportBatchId` is already indexed.
- The migration is `src/BaxOrders.Infrastructure/Persistence/Migrations/20260925180000_AddImportRowPricingClassification.cs`
  with its `.Designer.cs`. Its id must sort after `20260925120000`.
  - Write it by hand in the exact shape of `20260925120000_AddProductMatchDecisions.*`.
  - `Up` adds the four columns and the two checks. **No data statement**: no `UPDATE`, no `INSERT`.
  - `Down` drops the two checks and then the four columns.
  - Update `BaxOrdersDbContextModelSnapshot.cs` by hand. The designer's `BuildTargetModel` is the updated snapshot's
    body.
- Proof that it is right:
  - `DbModelTests.Model_matches_the_latest_migration` passes;
  - every integration fixture migrates through it;
  - a test migrates down and up again (§8).

### 4.3 One rule for an imported line's mode and its counts

Add `Application/Imports/Pricing/ImportLinePricing.cs`, a pure static class with no database. The name is the
Planner's.

```
// What the imported line will carry. The only place this is decided.
PricingMode ModeOf(decimal? effectiveUnitPrice, PricingMode? classification) =>
    effectiveUnitPrice is not null ? PricingMode.PriceRequired        // a price wins; nothing to classify
    : classification ?? PricingMode.Unresolved;                       // nobody said → "Təsnif edilməyib"

// And therefore its Task 2 state, through the existing rule:
OrderLinePricingState StateOf(decimal? price, PricingMode? classification) =>
    OrderLinePricing.Classify(price, ModeOf(price, classification));
```

- It reads **no supplier, no workbook supplier text, no location, no product and no category**. That is the whole of
  "mənbəyə görə avtomatik təsnifat olmur" in code. A unit test pins it: the function has no parameter through which
  a source could reach it.
- Every count in §4.5 and the write in §4.6 go through it. No count is written a second time by hand in a query. If a
  count must run in SQL for size, it must use the same predicate, and a test must hold the SQL and the function to
  each other. Task 2 did the same (`PricingCountConsistencyTests`).

The derived counts over a set of rows (the name `ImportPricingCounts` is the Planner's):

| Count | Rows | Task 2 word (16b) |
|---|---|---|
| `Unclassified` | unpriced, classification null | "Təsnif edilməyib" |
| `PriceRequired` | unpriced, classified `PriceRequired` | "Alış qiyməti tələb olunur" |
| `InternalSupply` | unpriced, classified `InternalFreeSupply` | "Daxili təminat" / "Ödənişsiz daxili təminat" |
| `MissingPrice` = `Unclassified + PriceRequired` | the warning | "N sətirdə qiymət yoxdur" |

Here *unpriced* means `ParsedUnitPrice is null`, the value the line will actually carry. It includes an unusable
price (§2.3).

### 4.4 API: classify and list staged rows

Add a new controller `Api/Controllers/ImportPricingController.cs`:
- `[Route(ApiRoutes.V1 + "/imports/{id:long}")]`;
- `[Authorize(Policy = BaxOrdersPolicies.CanManageImports)]` **at class level**, as Task 14 left every import
  controller.

The service is `Application/Imports/Pricing/ImportPricingService.cs`, registered in `Application/DependencyInjection.cs`.

| Method | Path | What |
|---|---|---|
| GET | `pricing?mode=&search=&page=&pageSize=` | The batch's **included, unpriced** rows with their classification. `mode` (a `PricingMode?`): `Unresolved` = not classified, `PriceRequired`, `InternalFreeSupply`, or absent = all. `pageSize` defaults to 50, maximum 200 (`Paging.Of`). |
| POST | `pricing` `{ importRowIds: long[], pricingMode }` | Sets the classification of the named rows. `pricingMode: "Unresolved"` **clears** it, back to "Təsnif edilməyib". |

**GET** returns `ImportPricingReviewDto(rows, totalCount, unclassified, priceRequired, internalFreeSupply)`:
- The three totals count the batch's included unpriced rows, **independent of the filter and search**, as
  `PricingModeReviewService` does. `totalCount` counts what the filter and search leave.
- Each row returns:
  - `importRowId`, `sheetName`, `rowNumber`;
  - the location: the matched location's name, or the effective workbook text when not matched;
  - `requestPeriod`;
  - the product: the matched product's name, or the effective workbook text;
  - the specification value and order unit, as effective text;
  - `quantity` (`ParsedQuantity`);
  - the supplier: the matched supplier's name, and the effective workbook supplier text;
  - `classification` (`PricingMode?`, null = not classified);
  - `classifiedByDisplayName` and `classifiedAtUtc`.
- Rows are sorted by `RequestPeriod` (nulls last), then location name, then product name
  (`AzerbaijaniCollation` where names are sorted in memory), then `RowNumber`, then `Id`. The order is stable, so
  paging is stable.
- `search` matches, through `TextNormalizer`, the product, location or supplier, workbook or matched.
- Shape: three queries, as `PricingModeReviewService.GetAsync` (totals, filtered count, one page).

**POST** returns `ImportPricingResult(changed, unchanged, pricingMode, preview)`, where `preview` is the refreshed
`ImportPreview`, as every review write returns it. It follows §2.4's pattern: transaction, `IImportBatchLock`,
`EnsureReviewable`. Refusals, before anything is written:

- an empty `importRowIds` → `ValidationException` (400);
- an undefined `pricingMode` → `ValidationException` (400);
- any id not a row of this batch → `NotFoundException` (404);
- any excluded row → `DomainException` (422);
- any priced row → `DomainException` (422);
- a batch not in `NeedsReview` / `ReadyToImport` (for example `Imported`) → `DomainException` (422) from
  `EnsureReviewable`;
- no signed-in person → `ForbiddenException` (`CurrentActor.Of`).

The actor is always `CurrentActor.Of(currentUser, …)`, never a value from the body. Classifying writes nothing but the
four columns of the named rows:
- no issue, no correction, no resolution, no batch counter and no batch status changes;
- the batch's `ReadyToImport` status is not re-evaluated, because a classification is never a blocker;
- one `SaveChangesAsync`.

There is **no** endpoint and no parameter that classifies rows by supplier, source text, location, product or
category. Rows are named one by one. This mirrors `PricingModeReviewService.SetAsync`'s deliberate refusal, for the
same reason.

### 4.5 The import's counts, under Task 2's rule

All of these go through §4.3.

- **Readiness** (`ImportReadinessQueries`):
  - `ReadinessWarnings.MissingPrice` = `MissingPrice` over the batch's included rows.
  - `ReadinessWarnings.PriceNotRequired` = `InternalSupply` over the batch's included rows.
  - Add `ReadinessWarnings.UnclassifiedPrice` = `Unclassified` and `ReadinessWarnings.PriceRequired` =
    `PriceRequired`.
  - Delete the supplier query (`:106–118`) and the `Math.Max` subtraction. Update the doc comments. The
    `SupplierPriceRequirement` using goes if unused.
- **Confirmation preview** (`ImportConfirmationPlanner`):
  - `PlannedRow` gains the classification. Read it in the same query, with no extra round trip.
  - `ConfirmationGroupPreview.MissingPriceItemCount` becomes Task 2's `MissingPrice` for the group.
  - Add `UnclassifiedPriceItemCount`, `PriceRequiredItemCount` and `InternalSupplyItemCount`.
  - `ImportConfirmationPreview.MissingPriceRows` becomes `MissingPrice` over the rows to import.
  - Add `UnclassifiedPriceRows`, `PriceRequiredRows` and `InternalSupplyRows`.
  - Preview rows are counted **before** any group is skipped, as `RowsToImport` already is. The per-group counts let
    16b subtract skipped groups the way `ConfirmationDialog` already subtracts `sourceRowCount`.
- **Confirmation result** (`ImportConfirmationResult`):
  - `MissingPriceItems` becomes `MissingPrice` over the rows actually written, after skips.
  - Add `UnclassifiedPriceItems`, `PriceRequiredItems` and `InternalSupplyItems`, also after skips.
  - `ResultOf` (the already-imported replay) keeps returning zeros, as today.
- **Staging preview** (`ImportPreviewQueries` / `ImportGroupPreview`): keep `PricedRows` / `UnpricedRows`, and add
  `MissingPriceRows` and `InternalSupplyRows` over **the same rows** the group already counts.

New DTO fields go **after** the existing positional parameters. Existing names keep their positions. Serialised
names are camelCase as today. The frontend types (`api/imports.ts`, `api/rows.ts`) gain the new fields (§4.10).

### 4.6 The confirmation writes the mode, and never by source

In `ImportConfirmationService.ConfirmAsync` (`:106–114`), for each row:

- `mode = ImportLinePricing.ModeOf(row.UnitPrice, row.Classification)`.
- The item is created with that initial mode, never from the supplier. For a classified row, it is created
  **`Unresolved`**, then moved by `item.SetPricingMode(classification, actor, reason, now)`, and the returned
  `OrderItemPricingDecision` is added to `db.OrderItemPricingDecisions`:
  - `actor` = `WorkflowActor.User(row.ClassifiedByUserId, row.ClassifiedByDisplayName)`, the person who classified
    it in review;
  - `reason` = `Import #<batchId> yoxlamasında təsnif edilib`;
  - `now` = the confirmation's time.
  
  The result: one decision per classified line, `PreviousMode = Unresolved`, `NewMode` = the chosen mode. The line's
  history on Qiymət təsnifatı says who decided, exactly as a decision made on that page would.
- An unclassified unpriced row → `Unresolved`, with no decision. A priced row → `PriceRequired`, with no decision.
- The supplier is still attached to the line exactly as today. Only the mode stops being read from it.
- Everything stays inside the existing transaction. The decisions are saved in the same `SaveChangesAsync` as the
  items, or the second one: the item navigation fixes up the id. The confirmation stays all-or-nothing and
  idempotent.

Domain change needed for this:
- `OrderRequest.AddItem` gains a **last** optional parameter `PricingMode? pricingMode = null`, passed to the
  `OrderRequestItem` constructor.
  - `null` keeps today's supplier-seeded behaviour **for every other caller**: hand-built requests in tests, the
    sandbox seed, `DataTransfer`. Those are not imports, and Task 16 does not change them (§10).
  - A non-null value is used as given, with one guard: a priced line with `InternalFreeSupply` → `DomainException`,
    the same sentence as `SetPricingMode`.
- Add a short remark on the constructor: an import always passes the mode (brief 16), and the supplier seed remains
  only for a line built by hand.

### 4.7 What "sonradan düzəliş" needs

Nothing new on Qiymət təsnifatı. A line classified at import is an ordinary unpriced line:
- its mode is `PriceRequired` or `InternalFreeSupply`;
- the page lists it under that filter;
- `SetAsync` moves it and appends a second decision.

Criterion 6 proves this through the existing service and endpoint. Task 14's role rules on that page stay as they
are: `CanManageCatalog` decides, and a Rəhbər only reads.

### 4.8 The migration tool: `tools/BaxOrders.ImportPricingMigration`

Model it on `tools/BaxOrders.ProductMatchMigration`:
- the application's own services (`Program.Build`);
- the same connection-string lookup: `AddUserSecrets("9009c03b-5170-410c-aa43-9cd30c88c6ae")`, then the environment;
- the same backup directory, and a `pg_dump -Fc` backup;
- the same "no SQL can be handed to it" design.

Register it in `BaxOrders.slnx` under `/tools/`. Copy what it needs. Do not reference the 13a tool's project.

The five commands, run in this order and no other:

```
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --inspect
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --dry-run
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --backup
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --apply
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --verify
```

- **`--inspect`** (read-only) prints:
  - the applied and pending migrations;
  - whether the four columns exist (asked of `information_schema`, so a missing column is an answer rather than an
    error);
  - import batches by status, and for every batch in `NeedsReview` / `ReadyToImport`: its included unpriced rows.
    These become "Təsnif edilməyib" if imported unclassified after this task;
  - Qiymət təsnifatı's three totals (`PricingModeReviewService.GetAsync`, no filter). Print the live figures; the
    brief's "94 Təsnif edilməyib" is context, not a target. Also the `Unresolved` lines by location and month, for
    comparison with the brief's list (Fevral 25, Aprel 24, Sentyabr 19, İyun 11, Yanvar 7, May 5, Mart 3);
  - every supplier with `PriceRequirement = NotRequired`. These are the suppliers whose future imported lines would
    have been classified by source before this task;
  - whether the location alias "H.Ə.M Təmizlik" exists and names HEM (Heydər Əliyev Mərkəzi).
- **`--dry-run`** (read-only) prints the plan: the pending migrations, which must be **exactly** §4.2's, and the SQL
  `IMigrator.GenerateScript` produces for it. STOP conditions (exit non-zero, nothing changes):
  - any other pending migration;
  - an applied migration the code does not know;
  - any of the four columns already existing while the migration is pending.
- **`--backup`**: `pg_dump -Fc` into the backup directory, with the date and "task16a" in the file name. Then it
  records the baseline of §4.9 next to it and prints the path.
- **`--apply`**:
  - Refuses without a backup taken today and a recorded baseline.
  - Re-runs the dry-run's STOP checks.
  - Applies the one migration through `IMigrator.MigrateAsync(<that migration>)`, in one transaction.
  - Afterwards: no pending migration, the four columns exist, and **every** `ImportRows` row has all four NULL. If
    any of these is false, it reports and exits non-zero.
  - A second `--apply` finds nothing to do, changes nothing, and says so.
- **`--verify`** (read-only): recaptures §4.9 and compares it with the baseline key by key. It prints every difference
  and exits non-zero on any. It also checks: no pending migration; the columns exist; all four are NULL on every row.

The tool never writes a row, never classifies anything, and never runs anything but the one migration. It does not
stop, start or restart the API.

### 4.9 The figures `--verify` must prove unchanged

Capture them through the application's own queries, keyed by location **code**, hashed with SHA-256 where a list is
involved. Start from **every key** that `tools/BaxOrders.ProductMatchMigration/Invariants.cs` captures, copied rather
than referenced, then add the import keys:

1. `OrderRequests` count; `OrderRequestItems` count and the line hash (`Id`, `OrderRequestId`, `ProductVariantId`,
   `Quantity`, `UnitPrice`, `PricingMode`, `SupplierId`, `OriginalProductName`).
2. Catalogue:
   - products, variants and aliases (counts and hashes);
   - **`LocationAliases`** count and hash (`Id`, `LocationId`, `NormalizedAlias`);
   - `Suppliers` hash (`Id`, `NormalizedName`, `PriceRequirement`);
   - `ProductMatchDecisions` count and hash (every column).
3. Qiymət təsnifatı: `total`, `unresolved`, `missingRequiredPrice`, `internalFreeSupply`; the
   `OrderItemPricingDecisions` count and hash; and both HD-002 hashes. **The 94 rows are unchanged.**
4. The dashboard: every month × the four standard bases, as 13a captures it.
5. The monthly report: every year, as 13a captures it.
6. Heydər Əliyev Mərkəzi, September 2026, the order page's primary delta on each standard basis.
7. **Import staging:**
   - `ImportBatches` count and hash (`Id`, `Status`, `TotalRows`, `ValidRows`, `WarningRows`, `InvalidRows`,
     `ExcludedRows`);
   - `ImportRows` count and hash (`Id`, `ImportBatchId`, `ParsedUnitPrice`, `ParsedQuantity`,
     `ParsedRequestPeriod`, `IsExcluded`, `MatchedLocationId`, `MatchedProductVariantId`, `MatchedSupplierId`);
   - `ImportRowMaterializations` count and hash;
   - `ImportRowCorrections` count and hash;
   - `ImportResolutions` count and hash.

Every figure must equal the baseline. If `--inspect` shows a figure the brief quotes at a different value, report the
live value. Do not adjust anything.

### 4.10 Frontend (types only, no visible change)

- `api/imports.ts` and `api/rows.ts` gain the new DTO fields of §4.5 as optional-safe additions.
- `api/importPricing.ts` gains `fetchImportPricing(importId, query, signal)` and
  `setImportPricing(importId, { importRowIds, pricingMode })`, with their types, for 16b. No component uses them yet.
  Keep the module small.
- No component, label or page changes. The frontend suite and build stay green, with the same counts plus any type
  test the Coder adds.

## 5. Files: summary for the Coder

- Domain:
  - `Imports/ImportRow.cs` (§4.1);
  - `Orders/OrderRequest.cs` and `Orders/OrderRequestItem.cs` (the optional mode, §4.6).
- Application:
  - `Imports/Pricing/ImportLinePricing.cs`, `ImportPricingService.cs` and DTOs;
  - `Imports/Review/ImportReadinessQueries.cs`;
  - `Imports/Confirmation/ImportConfirmationPlanner.cs`, `ImportConfirmationService.cs`, `ImportConfirmationDtos.cs`;
  - `Imports/ImportPreviewQueries.cs`, `ImportPreview.cs`;
  - `DependencyInjection.cs`.
- Infrastructure:
  - `Persistence/Configurations/ImportRowConfiguration.cs`;
  - `Migrations/20260925180000_AddImportRowPricingClassification.cs` + `.Designer.cs`;
  - `BaxOrdersDbContextModelSnapshot.cs`.
- Api: `Controllers/ImportPricingController.cs`.
- Tool: `tools/BaxOrders.ImportPricingMigration/*`, `BaxOrders.slnx`.
- Frontend: `api/imports.ts`, `api/rows.ts`, `api/importPricing.ts`.
- Tests: §8, including the 13a tool test fixture adjustment of §8.

## 6. Safety and STOP conditions

- **The real database is reached only through `tools/BaxOrders.ImportPricingMigration`**, with the five commands, in
  order. `psql` stays denied.
  - **Do not run any other tool**: not the Task 3 catalogue tool, not the 13a product-match tool, not the approval
    sandbox, not the data-transfer tool.
  - Do not run the API against the real database. Do not stop or restart the running API: it keeps working on the
    old code, and four added nullable columns do not disturb it.
- **No business row changes.** If anything in this task would create, change or delete an order, line, price,
  pricing mode, pricing decision, product, variant, alias, location, supplier, user, or an import batch, row,
  correction or resolution in the real database, STOP. `--verify` (§4.9) proves nothing moved. HD-002's 94 rows stay
  untouched.
- **Nothing classifies a row but a person, through §4.4.** No start-up step, job, import stage, migration statement or
  tool may set `PricingClassification`. No rule may derive it from a supplier, a workbook supplier text ("Qala baza",
  "Azpetrol baza"), a location, a product or a category. If any requirement here seems to need such a rule, STOP.
  That would contradict the brief.
- The Coder classifies nothing in the real database, through the API or otherwise. Every classification in a test
  lives in a test database.
- `--dry-run` reporting a STOP condition ends the sequence there: report it and do not apply.
- `--verify` reporting any difference: report every key, and do not "fix" the data. The backup path goes in the
  report so the operator can restore it.
- Do not change the Suppliers page, `SupplierPriceRequirement`, `SupplierPricingService` or the supplier-seed
  behaviour for lines built by hand (§4.6, §10).
- Do not rework Tasks 1–14. Report any defect you find there.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 7. Invariants: MUST NOT CHANGE

- Every figure of §4.9, before and after the tool's apply.
- The importer's parsing, matching and blockers: the same workbook stages to the same matches, issues and statuses.
  Location aliases, Task 3's included, resolve exactly as before.
- Qiymət təsnifatı:
  - the same rows, totals, filters and paging for every existing query;
  - `SetAsync`, and Task 14's order filter and read-only rules, unchanged.
- Every analytics read model (dashboard, order page, decision context, monthly report, approval inbox, object page,
  product history) counts missing prices as before. For lines created by an import after this task, "qiymət yoxdur"
  is still `Unresolved + PriceRequired`, so an unclassified import line is a warning exactly as a `PriceRequired`
  one was.
- The confirmation stays all-or-nothing, idempotent, and refuses a stale preview (`EnsureMatchesWhatTheOperatorSaw`),
  as today.
- Every endpoint response at `5bcdc84` keeps its existing fields and their order. Only fields are added, and only the
  count fields listed in §4.5 change meaning, to Task 2's.
- Task 14's role rules: import endpoints are `CanManageImports` (a Rəhbər gets 403, including on the new ones), and
  Qiymət təsnifatı decisions are `CanManageCatalog`.
- The pricing modes and words of Task 2. No new state and no new word is added in 16a.

## 8. Acceptance criteria

1. **The record.**
   - `ImportRows` has the four columns and the two checks of §4.2.
   - The migration applies to a fresh database, `DbModelTests` passes, and `Down` removes them.
   - The domain methods of §4.1 behave as stated, including the refusals.
2. **Classify and list (API).**
   - As Koordinator and as Admin: the GET lists only included unpriced rows, with correct totals, filter, search and
     stable paging.
   - The POST sets, changes and clears (`Unresolved`) classifications, and returns the refreshed preview.
   - Every refusal of §4.4 answers the stated status and writes nothing.
   - As Rəhbər: both endpoints answer 403. Anonymous: 401.
3. **The counts speak Task 2.** On one fixture batch of priced rows, blank-price rows, one unusable-price row and one
   excluded unpriced row, with some rows classified:
   - readiness, preview (total and per group), staging preview and result all report the same `Unclassified`,
     `PriceRequired`, `InternalSupply` and `MissingPrice = Unclassified + PriceRequired`, computed by §4.3;
   - the excluded row is in none of them;
   - the unusable-price row is counted as unpriced.
4. **No classification by source** (acceptance 4).
   - In the fixture, a supplier is set to `NotRequired`. Its unpriced rows, and the rows whose workbook supplier text
     is "Qala baza" or "Azpetrol baza", are counted `Unclassified` in readiness and preview.
   - After confirmation, those lines are `Unresolved`, with no `OrderItemPricingDecision`.
   - A unit test shows `ImportLinePricing` takes no source input.
5. **The counts add up after the import** (acceptance 2; "saylar tutur").
   - Capture Qiymət təsnifatı's three totals, classify some rows in review as `PriceRequired` and some as
     `InternalFreeSupply`, leave the rest, and confirm.
   - `Unresolved` rises by exactly the preview's `UnclassifiedPriceRows`. `PriceRequired` rises by
     `PriceRequiredRows`. `InternalFreeSupply` rises by `InternalSupplyRows`. The result's three counts are the
     same.
   - Every classified line carries the chosen mode and exactly one decision: `Unresolved` → mode, the classifier as
     actor, the import's reason.
   - With one group skipped, each rise equals the preview's figure minus that group's per-group count.
   - Each new order's `missingPriceItemCount` (order read model) equals its `Unclassified + PriceRequired`.
6. **Correctable afterwards** (acceptance 3, 16.1).
   - A line classified `InternalFreeSupply` at import is listed by Qiymət təsnifatı under that filter.
   - `SetAsync` (and `POST api/v1/pricing-mode-review` as Koordinator) moves it to `PriceRequired`, and a second
     decision is appended.
   - The totals move by one each way.
7. **The real database.**
   - The five commands ran in order.
   - The report has: `--inspect`'s figures; the dry-run's SQL; the backup path; the apply's result (one migration,
     four columns, all NULL); a second `--apply` doing nothing; and `--verify` passing on every key of §4.9, with
     HD-002's hashes equal.
8. **Objects recognised as before.**
   - A workbook row whose Obyekt reads "H.Ə.M Təmizlik", with a `LocationAlias` to HEM in the fixture, stages matched
     to HEM and imports into HEM's order.
   - Every existing import and alias test passes unchanged.
9. **Qiymət təsnifatı unchanged.** `LinePricingModeTests`, `PricingCountConsistencyTests` and
   `RoleVisibilityEndToEndTests`' pricing tests pass unchanged.
10. **Nothing else changed.**
    - Builds and suites are green.
    - `git status` shows only §5's files and the tests.
    - No visible frontend text changed. The frontend count is unchanged except for new tests.

## 9. Required tests

Unit (`tests/BaxOrders.UnitTests`):

- `Imports/ImportRowPricingClassificationTests.cs`: §4.1, with every guard in both directions (set, same again,
  change, clear, clear again). The Unresolved / priced / anonymous refusals. Values, issues and matches untouched.
- `Imports/ImportLinePricingTests.cs`: `ModeOf` and `StateOf` for the priced / null / `PriceRequired` /
  `InternalFreeSupply` inputs; that a price wins over a stored classification; the counts of §4.3 over a mixed set,
  with `MissingPrice = Unclassified + PriceRequired`; and, by reflection or signature, that no parameter carries a
  supplier or source.
- `Orders/…`: `AddItem` with an explicit mode (used as given; priced + `InternalFreeSupply` refused). With no mode, the
  supplier seed is unchanged. The existing supplier tests prove the last point; name them.
- `Persistence/DbModelTests.cs`: passes unchanged.
- `ImportPricingMigration/MigrationPlanTests.cs`: the plan and STOP logic and the baseline comparison, as
  `tests/BaxOrders.UnitTests/ProductMatchMigration/` does for 13a.

Integration (`tests/BaxOrders.IntegrationTests`, Postgres fixture):

- `ImportPricingClassificationTests.cs`: criteria 2 (service level), 3, 4, 5 and 6, on an imported workbook. Use
  `ImportWorkbooks.cs` / `ImportedOrders.cs` helpers, or extend them.
- `ImportPricingEndToEndTests.cs`: criterion 2 over HTTP with real cookies and antiforgery, as
  `RoleVisibilityEndToEndTests` does, for Koordinator, Admin, Rəhbər and anonymous. Also add the new GET to Task 14's
  Rəhbər 403 matrix, either in `RoleVisibilityEndToEndTests` (extend the list, and keep every existing assertion) or
  in the new file.
- Criterion 8: the "H.Ə.M Təmizlik" import, in `ExcelImportServiceTests.cs` or the new file.
- `ImportPricingMigrationTests.cs`, following `ProductMatchMigrationTests.cs`, on an isolated database:
  - once migrated, nothing is pending and every row's four columns are NULL;
  - Down to `20260925120000` removes the columns;
  - the tool's plan then shows exactly the one migration and applies it once;
  - a second apply does nothing;
  - the invariant capture is identical when taken twice.

Existing tests that change deliberately. Name each in the report with the brief line behind it:

- **`ProductMatchMigrationTests.cs`**, 13a's historical tool. Two tests assert that 13a's migration is the latest
  (`:42` `state.Applied[^1]`, `:55` `Pending == [Target]` after going down to `Previous`). With a newer migration
  those preconditions no longer hold. Adjust **the fixture's starting point only**: before those assertions, migrate
  the isolated database to `MigrationPlan.Target` (13a's migration), so the database stands where 13a found it. Every
  assertion stays as written. Do not change the 13a tool's code. Brief line: none; this is a consequence of the
  schema change. Say so.
- Any import test asserting that an unpriced imported line is `PriceRequired`, or that a `NotRequired` supplier's
  imported line is `InternalFreeSupply`. Change it to `Unresolved`, citing "Təsnif edilməyən sətirlər importdan sonra
  … «Təsnif edilməyib» kimi düşür" / "Mənbəyə görə avtomatik təsnifat olmur". None was found at `5bcdc84`
  (`ImportConfirmation*Tests` assert only `MissingPriceRows` / `MissingPriceItems` = 1, which stays 1). If one is
  found, list it.
- Any readiness test that expected a `NotRequired` supplier's rows to be subtracted from `MissingPrice`. Same brief
  line.

Frontend (vitest): only if the Coder adds a type-level test. No component test changes.

No expectation may be weakened to make a test pass.

## 10. Out of scope

- Every visible word and every screen: the readiness panel, groups table, confirmation dialog, result panel, row
  detail, and the new classification tab (**16b**).
- Classifying the 94 real `Unresolved` rows, or any real row. That is the owner's work (brief), done on Qiymət
  təsnifatı. HD-002.
- Who sees the import section (Task 14, done).
- The Suppliers page and `SupplierPriceRequirement`:
  - The setting keeps seeding lines built **by hand** (correction versions, tests, sandbox). The brief speaks only of
    the import.
  - The Suppliers page's NotRequired dialog text ("… sətri artıq çatışmayan qiymət kimi sayılmayacaq",
    `SuppliersPage.tsx:258–261`) already overstates what the setting does since Task 2 moved the mode onto the line.
    Record it in the report for the owner and Task 15. Do not change it.
- Re-deciding existing lines: no line created before this task changes mode.
- A classification per workbook supplier or per location "for all rows". Deliberately not offered (§4.4).

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. `dotnet test BaxOrders.slnx`: the baseline is 991 unit / 760
  integration (Task 14's report); give the new counts. If the running API locks `src/BaxOrders.Api/bin`, build and
  test with `--artifacts-path` into the scratchpad, say so, and do not stop the API.
- `npm run --prefix frontend/bax-orders-web test` (baseline 44 files / 883 tests) and `… build`: green, with counts.
- The five tool commands' output, in order, in the report. Long lists may be summarised, with the full output written
  to a file under the scratchpad and its path named.
- `git diff --stat` and `git status`.

## 12. Operator notes (after review)

- The migration is already in the real database when the review starts, because the Coder applied it. Restarting the
  API on the new commit applies nothing and enables the new endpoints and counts.
- Restart the API before serving any frontend that uses the new fields. 16a's frontend does not read them yet.
- Rollback, if the owner rejects 16a: `pg_restore` the backup the report names, then `git reset` the commit.
- The approval sandbox gets the new columns on its next `-Create` / `-Reset`. Do this before 16b's live check
  ("Test mühitində import edəndə …").
- What changes for the Koordinator after the restart, with the old screens:
  - the numbers under "Qiymət yoxdur" and "Qiyməti olmayan" now follow Task 2's rule (an internal-classified row is
    not a warning, and an unusable price is counted);
  - newly imported unclassified lines appear on Qiymət təsnifatı as "Təsnif edilməyib" instead of "Alış qiyməti tələb
    olunur".
  
  16b gives them the words and the controls.

## 13. Where the brief lands in 16a

| Brief | Here |
|---|---|
| Classify during review (16.1) | §4.1, §4.4; criterion 2 |
| Unclassified → "Təsnif edilməyib" after import | §4.3, §4.6; criterion 5 |
| "sonradan düzəliş" (16.1), acceptance 3 | §4.6, §4.7; criterion 6 |
| "saylar tutur", acceptance 2 | §4.5, §4.6; criterion 5 |
| No classification by source, acceptance 4 | §4.3, §4.4, §4.6, §6; criterion 4 |
| "Task 2-nin sözləri" (the meaning behind the words) | §4.3, §4.5; criterion 3 (words: 16b) |
| Objects recognised as before, Task 3 aliases | §7; criterion 8 |
| Qiymət təsnifatı counts and paging | §7; criterion 9 |
| Acceptance 1, 5; the advance warning and link | 16b (16a supplies the numbers, §4.5) |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. **Split 16a / 16b** at the server/screen seam. The whole brief (schema + tool + API + confirmation + counts + a new
   screen + five reworded components) is larger than one Coder session. The queue order is unchanged: 16a → 16b →
   15.
2. The review-time classification is **stored on the staged row** (four new columns), not held in the browser until
   confirmation. The review is a multi-session, persisted process, like every other review decision. The confirmation
   rule "the client never sends business values" (`ImportConfirmationService.cs:22–26`) holds. The server can count
   the forecast. It is not stored as an `ImportRowCorrection`, because it is not "what a cell should have said".
3. Storing it needs a schema change. That goes through a five-command tool with a backup, as 13a did, which is why
   this file carries `DATA_MIGRATION: yes`. HD-004's list said 16 would not touch real data. This task still changes
   **no business row**, only adds empty columns, and `--verify` proves it.
4. "Not classified" is a null on the staged row, and becomes `Unresolved` on the line. `Unresolved` is never stored
   on a staged row. Sending `Unresolved` to the POST means "clear it", mirroring how the pricing page can set a line
   back.
5. The supplier's `NotRequired` setting stops deciding the mode **of imported lines only**. That is the brief's "no
   automatic classification by source" applied to the import. Hand-built lines keep the old seed, because the brief
   does not speak of them.
6. An unusable price cell is counted as a missing price, because it is imported as one (`ImportRowEvaluator.cs:87–95`).
   Readiness previously missed it.
7. A classification made in review becomes, at confirmation, a regular `OrderItemPricingDecision`. Its actor is the
   person who classified, its time is the confirmation, and its reason names the import. So the line's history on
   Qiymət təsnifatı is the same whichever screen the decision was made on.
8. The classification endpoints sit under the import routes with `CanManageImports`, like every review write. Today
   that is the same people as `CanManageCatalog`, who decide on Qiymət təsnifatı.
9. Rows are classified by explicit id only. There is no "all rows of a supplier/source" operation. This mirrors
   `PricingModeReviewService.SetAsync`, and it keeps a one-click source rule from creeping back.
10. A classification on a row that later gets a price is kept but inert (§4.1), rather than being cleared by the
    correction service. Fewer moving parts, the same result.
11. 13a's historical tool tests get a fixture adjustment (§9), not a code change, because the tool's STOP behaviour
    is correct as written.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git: branch, HEAD (`5bcdc84`), `git status --short`, `git diff --stat`.
1. Qeyd: the four columns and two checks; the migration id; how the snapshot and designer were written by hand, and
   how that is proven.
2. Qayda: `ImportLinePricing` (file:line), and every place that now calls it (readiness, preview, result, staging
   preview, confirmation). The proof that no source reaches it.
3. API: both endpoints; each refusal with its status; the lock; the 403 matrix for the Rəhbər.
4. Təsdiq: how a line gets its mode, and one worked example: N rows → the preview's three counts → the pricing page's
   totals before and after. The same with one group skipped.
5. Sonradan düzəliş: the criterion-6 example, with both decisions.
6. Real baza: the five commands' output in order:
   - inspect: batches under review; the pricing totals and the `Unresolved` breakdown by month; `NotRequired`
     suppliers; the H.Ə.M alias;
   - dry-run: the SQL;
   - backup: the path;
   - apply, and the second apply;
   - verify: every key equal.
7. Testlər: new tests; deliberately changed tests, each with its reason; counts; builds.
8. Toxunulmayanlar: no business row, no screen text, no supplier behaviour for hand-built lines; HD-002; Tasks 1–14.
9. 16b üçün qeydlər: the exact DTO field names 16b will read; the pricing-page link target; anything found (the
   Suppliers dialog text of §10, and any other defect).

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
