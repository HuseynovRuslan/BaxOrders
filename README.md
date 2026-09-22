# BAX Orders

Internal system for **Bakı Abadlıq Xidməti** to collect, review and analyse material requests from the
company's operational locations (Ramana, Maştağa, Əmircan, H.Ə.M, …).

## Business problem

Every location periodically requests materials: cleaning supplies, tools, gloves and so on. Today a
coordinator collects these requests as Excel files. Management has no reliable way to answer questions
such as:

- How does this month's request of a location compare with previous periods?
- Which quantities or prices went up or down, and by how much?
- Which products are new? Which suppliers were used before?
- Which changes are unusual and need a closer look before approval?

The goal is a web system where management opens a location, sees its requests next to history
(previous month, 3- and 6-month averages), and approves or rejects them.

**All analytics are deterministic** (plain arithmetic over stored data). An AI assistant may later
*explain* results, but it never produces them.

## Architecture

One modular monolith with pragmatic clean architecture:

```
BaxOrders.Api            ASP.NET Core Web API: controllers, ProblemDetails, Swagger, health check
    │
    ├── BaxOrders.Application     Use cases (queries today); depends on Domain + EF Core abstractions
    │         │
    └── BaxOrders.Infrastructure  EF Core DbContext, Fluent mappings, migrations, seed data
              │
        BaxOrders.Domain          Entities, invariants, normalization. No framework dependencies.
```

Deliberate non-choices: no generic repository or unit of work (EF Core already is one), no MediatR/CQRS
framework, no event bus, no microservices. Application talks to the database through
`IBaxOrdersDbContext`, a thin interface over the real `DbContext` that exists only so Application does
not reference Infrastructure.

## Solution structure

```
BaxOrders.slnx
Directory.Build.props                 net10.0, nullable, warnings as errors
src/
  BaxOrders.Domain/
    Normalization/                    TextNormalizer, SpecificationNormalizer, ModelCodeNormalizer
    Locations/  Suppliers/  ResponsiblePeople/    entities and their aliases
    Catalog/                          Category, Product, ProductCode, ProductAlias, ProductVariant,
                                      ProductVariantKey, UnitOfMeasure, UnitOfMeasureAlias, UnitType
    Orders/                           OrderRequest, OrderRequestItem, OrderRequestStatus
    Imports/                          ImportBatch, ImportRow, ImportRowOriginalValues, ImportRowIssue,
                                      ImportMaterialization (+ group and row links), enums
  BaxOrders.Application/
    Abstractions/                     IBaxOrdersDbContext, IProductCodeGenerator
    Locations/  UnitsOfMeasure/       read queries
    Orders/OrderRequestVersions.cs    latest version of a logical request
    Imports/Confirmation/             ImportConfirmationPlanner (read-only), ImportConfirmationService
  BaxOrders.Infrastructure/
    Persistence/BaxOrdersDbContext.cs
    Persistence/Configurations/       one IEntityTypeConfiguration<T> per entity
    Persistence/Migrations/
    Persistence/Seed/ReferenceData.cs
    Persistence/AuditingSaveChangesInterceptor.cs
    Persistence/SqlServerProductCodeGenerator.cs
  BaxOrders.Api/
    Controllers/  ErrorHandling/  Program.cs
tests/
  BaxOrders.UnitTests/                domain, normalization and EF model tests (no database needed)
  BaxOrders.IntegrationTests/         opt-in SQL Server tests (sequence, unique constraints, versions)
docs/
  excel-import-notes.md               real workbook structure and data quality; input for Task 2
  business-decisions.md               decision register for the real workbook: confirmed, data-backed, open
frontend/
  bax-orders-web/                     React + TypeScript + Vite + Tailwind admin shell
```

## Domain concepts

| Entity | Meaning |
| --- | --- |
| `Location` | Operational object (Obyekt). Unique `Code` and unique normalized name. Deactivated, never deleted. |
| `LocationAlias` | Operator-confirmed spelling → location. Normalized alias is unique. |
| `Category` | One self-referencing tree. Excel's Ana / Orta / Alt kateqoriya are levels 1–3; deeper levels are allowed. |
| `UnitOfMeasure` | Unit for specifications (sm, ml) **and** order quantities (ədəd, paçka). `UnitType` is informational; no conversions exist. |
| `UnitOfMeasureAlias` | Approved spelling → unit. Normalized alias is globally unique. |
| `Product` | Base product identity ("Makaron mop"). Code `PRD-000001` from the code generator. **No price.** |
| `ProductAlias` | Approved spelling → product. Identifies the product only, never the variant. |
| `ProductVariant` | Comparable form of a product: specification + model code + order unit. |
| `Supplier` | Company materials are bought from (Şirkət). Unique normalized name. |
| `SupplierAlias` | Operator-confirmed spelling → supplier ("Cleanfix" → "Cleanfix MMC"). |
| `ResponsiblePerson` | Cavabdeh şəxs. A business record, not a login. Unique normalized name (for now). |
| `ResponsiblePersonAlias` | Operator-confirmed spelling → responsible person. |
| `OrderRequest` | One version of the logical request of a location for one analytical month. `RequestPeriod` (first day of the month) is required; `RequestDate` (the day it was written) is optional. Draft → PendingApproval → Approved / Rejected. |
| `OrderRequestItem` | Quantity of a variant, with the historical unit price and supplier. |
| `ImportBatch` | One uploaded Excel file. Not tied to one location. |
| `ImportRow` | Staging copy of one Excel row, original text preserved verbatim. |
| `ImportRowIssue` | One of possibly many problems found on a staged row. |

### Product vs ProductVariant

Excel has two different "unit" columns:

- **Ölçü + Vahid** describe the product: *Makaron mop, 50 sm*.
- **Miqdarı + Ö/v** describe the order: *43 ədəd*.

A `Product` is the name-level identity. A `ProductVariant` adds everything that decides whether two
quantities may be compared: specification value (kept as text: `50`, `40x40`, `1x5`), specification
unit, model code and **order unit**.

"Rezin əlcək" ordered in *ədəd* and "Rezin əlcək" ordered in *paçka* are **two variants**. 30 pieces and
30 packs are never compared unless a conversion rule is introduced later.

Every variant has a deterministic `NormalizedVariantKey`, for example:

```
specification=40x40|specUnit=CM|model=ab-12|orderUnit=PCS
```

It is unique per product (unique index on `ProductId, NormalizedVariantKey`). Units appear by their
business code, never by database id: ids are persistence details that differ between environments.
Unit codes are therefore immutable.

Two shapes of the real data are part of the key:

- **A variant may legitimately have no order unit.** A cleaning service billed per month, or a line whose
  "Ö/v" cell was empty and reviewed as meaningful that way, gets `OrderUnitId = null` and the key segment
  `orderUnit=` — deterministic, and never equal to a variant that does have a unit. No placeholder unit is
  ever invented for it. The UI writes such a line as **Vahidsiz**, never as `null` or a technical code.
- **The "Vahid" cell sometimes holds a word that is not a unit** (`28 diş`, `2 qat`). That word is stored as
  the variant's `SpecificationDescriptor` and appended as `|descriptor=…`, so it describes the specification
  instead of pretending to be a unit of measure. The segment is written only when a descriptor exists, which
  leaves every key created before this rule unchanged.

### Product codes

Product codes look like `PRD-000001`. They are issued only by `IProductCodeGenerator`, which is
implemented with the SQL Server sequence `dbo.ProductCodeNumbers` (`NEXT VALUE FOR` is atomic, so concurrent
imports never get the same code). Numbers may have gaps, for example after a rollback, but are never
reused. The `Product` constructor rejects codes in any other format. Codes never derive from Excel row
numbers.

### Request versions

One **logical request** exists per `Location + RequestPeriod`. Corrections and resubmissions are stored
as new versions (1, 2, 3, …); earlier versions are never overwritten. `(LocationId, RequestPeriod, Version)`
is unique.

- `OrderRequest.CreateNextVersion(...)` starts version N+1 as a new draft for the same location and
  period. Only non-draft requests are versioned; a draft is corrected in place.
- `OrderRequestVersions.FindLatestAsync(locationId, period)` returns the latest version.
- The full resubmission workflow (copying items, superseding a pending version) is not built yet.

### Prices are history

`Product` has no "current price". Each `OrderRequestItem` stores the unit price valid for that request,
so March at 5 AZN and September at 7 AZN both stay true. The line total is never stored: it is always
`Quantity × UnitPrice`, so it cannot drift from its inputs.

Precision: `Quantity decimal(18,3)`, `UnitPrice decimal(18,4)`. The domain rejects values with more
decimals than the column holds, so SQL Server never silently rounds them.

### Normalization

Normalization produces comparison values only; display values are kept as entered. It is fully
deterministic, with no fuzzy matching and no AI.

`TextNormalizer` (names, aliases):

1. Unicode NFKC (composed vs decomposed letters, non-breaking/full-width spaces are equal).
2. Removes zero-width characters and quotation marks (`"Cleanfix" MMC` = `Cleanfix MMC`).
3. Dash variants become `-`.
4. Culture-independent lower-casing; `I / İ / i / ı` fold to `i`, because data is typed on both
   Azerbaijani and English keyboards. Other Azerbaijani letters are **not** folded (`ş` ≠ `s`, `ə` ≠ `e`).
5. Collapses whitespace and drops spaces around `/ \ - . , ; : ( ) [ ] + &` (`H. Ə. M` = `H.Ə.M`).

`SpecificationNormalizer` treats specifications as text. It applies the same whitespace, case and Unicode
rules, but keeps quotation marks (`12"` can mean inches). It also unifies multiplication signs between
digits (`40 X 40`, `40 × 40`, `40*40` → `40x40`). It never parses numbers: `1,5` and `1.5` stay different, and
`1.000` is not turned into `1`, until an explicit business rule is approved.
`ModelCodeNormalizer` also removes all spaces.

Normalization never merges records. It only makes exact matches possible. Everything else is a
human decision (aliases).

## Excel staging concept

Excel is an input format, not the data model. Rows are never inserted directly into order requests:

```
Excel → ImportBatch → ImportRow (original text) → validation / matching → ImportRowIssue(s)
      → human review → canonical entities → confirmation → OrderRequest(s) → analytics → approval
```

- `ImportRow` keeps every cell verbatim (`OriginalProductName`, `OriginalQuantity`, …) for auditing,
  debugging and correcting mappings, next to normalized names, parsed numbers and matched entity ids.
- The Excel **Cəmi** is stored (`OriginalLineTotal`, `ParsedLineTotal`) but never trusted: validation
  compares it with `CalculatedLineTotal = ParsedQuantity × ParsedUnitPrice`.
- A row can have many `ImportRowIssue`s at once (unknown product *and* unknown supplier *and* bad
  quantity), each with a severity.
- One workbook can produce several order requests, grouped by location + request period.
- Operator mapping decisions are stored as aliases (location, supplier, responsible person, product, unit),
  so the same spelling resolves automatically next time. Aliases are never created without confirmation.
- Matching is exact after normalization. There is no fuzzy matching, no AI matching, and the import never
  creates order requests or catalog records.

The real workbook layout and the data quality to expect are documented in
[docs/excel-import-notes.md](docs/excel-import-notes.md). What the business has actually decided about that
data — and what is still open — is kept in [docs/business-decisions.md](docs/business-decisions.md), which
separates confirmed answers from conclusions drawn out of the data itself.

## Import confirmation (Task 4)

A reviewed batch becomes permanent orders in one explicit step: `ReadyToImport` → `Imported`.

- **Grouping.** One `OrderRequest` is one `Location` + one `RequestPeriod` + one `Version` — never a supplier,
  a category or a person. Every included row stays a separate `OrderRequestItem`, so 3,618 included rows
  produce 3,618 items. Identical-looking rows are two rows and become two items: `PossibleDuplicate` is
  information, never a reason to merge, sum or suppress.
- **Preview first.** `GET /api/v1/imports/{id}/confirmation/preview` reads only. It reports what would be
  created per group, the money total of rows whose price is known, and every remaining warning. Warnings
  (missing price, possible duplicates, unresolved supplier or responsible person) never block confirmation;
  they are shown so nobody confirms without seeing them.
- **Existing requests are never touched silently.** A group whose location and period already have a request
  needs an explicit decision: `CreateNewVersion` (the next version, earlier ones untouched) or `Skip` with a
  reason. Without a decision nothing is written for that group and the confirmation is refused. A request that
  is still a draft cannot be versioned at all — the domain corrects a draft in place.
- **The client sends decisions, not data.** `POST /api/v1/imports/{id}/confirmation` carries group decisions
  and the counts the operator saw. Products, variants, quantities, prices, suppliers, locations and periods
  all come from the staged rows as they are at that moment; the plan is rebuilt under the batch lock, and a
  preview that no longer matches is a 409, not an assumption.
- **What is copied.** Quantity and price come from the parsed effective values. An unknown price stays
  `null` — never 0 — and the quantity is imported all the same. A resolved supplier is copied, an unresolved
  one leaves `SupplierId` null. `RequestDate` stays null: the order workbook states a month, not a day, and
  nothing invents one. The request carries no responsible person, because one group may hold rows of several
  people; the staged rows keep that text.
- **Excluded rows** become no item and stay staged with their reason, as the audit trail of what was left out.
- **Provenance.** `ImportMaterialization` records that a batch was confirmed (unique per batch),
  `ImportMaterializationGroup` what was decided per location and period — including a skipped group and its
  reason — and `ImportRowMaterialization` links one staged row to the one item it became. Both sides of that
  link are unique in the database, so a source row can never be imported twice.
- **All or nothing.** The whole confirmation is one transaction: either the approved plan becomes orders and
  the batch is `Imported`, or nothing is written and the batch stays `ReadyToImport`.
- **Retry is safe.** Confirming an already imported batch creates nothing and returns the existing result;
  confirming it again with different decisions is refused.
- **Service lines keep their semantics.** A monthly service unit, an intentionally unitless variant and a
  specification descriptor are copied as they are. Comparing them is an analytics question, not an import one:
  ordinary material variants can be compared by quantity only when the variant identity and order-unit
  semantics match, while service-like lines need amount-based reporting. That is exactly what
  *Comparing months (Task 6A)* below implements.

## Browsing permanent orders (Task 5)

Once a batch is confirmed the orders stop being an import artefact and become the thing people work with.
Task 5 is the way through them, and it is **read-only**: nothing on these screens creates, edits, approves or
deletes anything, and every request stays in whatever status it already has.

The path is always the same four steps:

```
Obyektlər  →  Obyekt  →  Ay (sifariş)  →  Sətir  →  Mənbə
/locations    /locations/:id   /orders/:id      "Mənbəyə bax"
```

- **Obyektlər** (`GET /api/v1/locations/orders`) lists every location with how many requests it has, how many
  distinct periods, its earliest and latest period, its line count and its money. Searchable by name or code,
  sortable by name, request count or latest period, 25 per page.
- **Obyekt** (`GET /api/v1/locations/{id}/orders`) is that location's history: one row per request, newest
  period first, filterable by year and month, 24 per page. The years offered are the years the location
  actually has.
- **Sifariş** (`GET /api/v1/orders/{id}`) is one request: its location, period, version and status, four
  summary figures, and its lines 50 per page, searchable by product name, code or model and filterable to
  lines with or without a price.
- **Mənbə** (`GET /api/v1/orders/items/{id}/source`) answers "where did this line come from?" for one line.

### Known amount is not a total

`KnownAmountTotal` is `sum(Quantity × UnitPrice)` **over the lines whose price is known, and nothing else**.
A line with no price is not counted as zero, because the workbook did not say zero — it said nothing.

- Every screen that shows an amount shows `MissingPriceItemCount` next to it, so a partial figure is never
  read as a complete one, and the order page says so in words when lines are missing a price.
- When a location or a request has no priced line at all, the amount is `null` and renders as `—`, not as
  `0,00 ₼`. (SQL sums an empty set to zero, so the read services normalise that case back to unknown.)
- A line with no price shows **Qiymət yoxdur** and no line total. The totals are calculated in SQL by the
  read services; the browser never adds anything up.

### Period, not date

History is filtered and ordered on `RequestPeriod` — the month the request is for. `RequestDate` is null for
everything imported from the order workbook, which states a month and not a day, so filtering on it would
silently hide the data. Several versions of the same period are listed separately, newest version first.

### Provenance

"Mənbəyə bax" opens the staged row behind one permanent line, through the `ImportRowMaterialization` link
written at confirmation. It shows the batch, the file, the sheet, the Excel row number, the workbook's own
"Cəmi" text next to the calculated total, and then every column three ways:

| Mənbə dəyəri | Effektiv dəyər | Kanonik qeyd |
| --- | --- | --- |
| what the cell contained | what the import worked with | the catalog record it resolved to |

A corrected cell is marked, and a cell corrected to *intentionally empty* says so instead of showing a blank.
The workbook value is never rewritten, and nothing on this screen can change it: corrections belong to the
import review centre. A line whose batch is gone simply has no source link.

### Read-model rules

- Controllers return DTOs only. No EF entity and no domain entity is ever serialized.
- All query logic lives in `LocationOrderQueries` and `OrderRequestQueries` in the Application layer.
- Everything is paged server-side, with page size capped at 100 — no endpoint can be asked for everything.
- Totals and counts are aggregated in SQL; the pages are projections, not loaded graphs.
- Category is read from the product and falls back to the category matched on the staged row, because
  products imported from the workbook carry no category of their own yet.

## Comparing months (Task 6A)

Once a location has several months of permanent orders, the question stops being "what did they order?" and
becomes "how does this month differ from before?". Task 6A is the engine that answers it. It is **read-only**
and deterministic: no AI, no fuzzy matching, no guessing at what a difference means, and no screen — Task 6B
builds the UI on top of these endpoints.

```
GET /api/v1/analytics/locations/{id}/periods
GET /api/v1/analytics/locations/{id}/periods/{yyyy-MM}/comparison?basis=…&search=…&state=…&page=…&pageSize=…
GET /api/v1/analytics/locations/{id}/variants/{variantId}/trend?from=yyyy-MM&to=yyyy-MM
```

### Comparison basis and the calendar window

Three bases, as a typed enum — never a magic string:

| Basis | Baseline for 2026-07 | UI wording (Task 6B) |
| --- | --- | --- |
| `PreviousMonth` | 2026-06 | Keçən ay |
| `Previous3MonthAverage` | 2026-04, 2026-05, 2026-06 | Son 3 ayın ortalaması |
| `Previous6MonthAverage` | 2026-01 … 2026-06 | Son 6 ayın ortalaması |

The window is made of **calendar months**, not "the last three requests". It ends with the month before the
selected one, and the selected month is never part of its own baseline.

### A missing month is not a zero

This is the rule the whole engine turns on, and the two cases must never be confused.

- **The location ordered that month, but not this product.** The product ordered zero that month, and that
  zero is real: it counts in the average.
- **The location has no request for that month at all.** The month is *not available*. It never enters an
  average, and an average is divided by the months that are available — not by the months the basis asked for.

Every comparison therefore reports `ExpectedBaselinePeriodCount`, `AvailableBaselinePeriodCount` and
`MissingBaselinePeriods`, so a "three-month average" built from one month can never pass for a full one. When
**no** baseline month is available the answer is `InsufficientHistory` for every row — not a location full of
products that all look new.

Real example: EXPO has no request for 2026-06. Comparing its 2026-07 against the previous month reports
`BaselineAvailable = false` and all 15 variants as `InsufficientHistory`. Against the three-month average it
uses 2026-04 and 2026-05 and reports 2026-06 as missing.

### One version per month

A location and month may have several request versions. Analytics uses the **highest version** of each month
and never adds two versions together; the response names the `OrderRequestId` and `Version` it used, for the
current month and for every baseline month. Earlier versions stay in the database and stay visible in the
order browser.

Requests are included **whatever their status**. Every current request is a draft and no approval workflow
exists yet, so filtering by status would hide all the data; when approval arrives, this policy is the thing to
revisit.

### What a quantity is compared within

Quantities are compared **per `ProductVariantId`** — never per product name, product id or model code. The
variant already carries specification, specification unit, descriptor, model code and order unit, so 30 pieces
never meets 30 packs, 50 mm never meets 100 mm, and "28 diş" never meets a plain 28.

Within one request several permanent items may reference the same variant. Analytics adds them into one
snapshot per request and variant; the stored items keep their source-line cardinality and are not touched.
Items flagged as possible duplicates are ordinary items — Task 4 materialized them separately on purpose — and
they contribute their quantity, their money and their count like any other.

A comparison row is the **union** of the variants of the current month and of the available baseline months,
so a product that stopped being ordered is as visible as one that just started.

### Material or service

| Kind | When | Compared by |
| --- | --- | --- |
| `QuantityComparable` | any ordinary order unit | quantity, and money |
| `AmountOrientedService` | no order unit, or `MONTH` / `TIME` | money only |

"One month became two months" is not a doubling of consumption, so a service carries **no quantity figure at
all** on either side and its state is `NotComparable`. Its comparison is `KnownAmount`, `AmountDelta` and
`AmountPercentChange`. This follows the business answers recorded in Tasks 3G and 4.

### Quantity formulas

```
QuantityDelta         = Current − Baseline
QuantityPercentChange = (Current − Baseline) / Baseline × 100      when Baseline > 0
BaselineQuantity      = SUM(quantity of each available month) / AvailableBaselinePeriodCount
```

| Situation | State | Percent |
| --- | --- | --- |
| both sides > 0 | `Increased` / `Decreased` / `Unchanged` | calculated |
| baseline 0, current > 0 | `New` | **null** — a rise from nothing is not a percentage, and never infinity |
| current 0, baseline > 0 | `NoLongerOrdered` | −100 |
| no baseline month available | `InsufficientHistory` | null |
| service | `NotComparable` | null |

### Weighted unit price

A variant may appear several times in a month with different quantities, prices and suppliers, so no single
line's price is taken as "the" price:

```
WeightedUnitPrice = SUM(Quantity × UnitPrice) / SUM(Quantity)    over the priced items only
```

One unit at 10 and nine at 20 give **19.00**, not the 15.00 an unweighted mean would give.

For the average bases the baseline price is **pooled over every available month** rather than being an average
of monthly averages, so a month of one unit cannot weigh as much as a month of a thousand. `PriceDelta` is the
difference of the two weighted prices; `PricePercentChange` is null when the baseline price is zero, and both
are null when either side has no priced quantity.

### Money that is known

`KnownAmount` is `SUM(Quantity × UnitPrice)` over the priced items and **null** when nothing is priced — never
zero, because the workbook did not say zero. Each side also reports its price coverage:

| Coverage | Meaning |
| --- | --- |
| `Complete` | every unit of the side's quantity has a price |
| `Partial` | some of the quantity is priced and some is not; the money is a partial figure |
| `Unavailable` | no priced quantity at all; the money is unknown |

At summary level the location's current and baseline money are reported with their missing-price counts and
with `AmountIsComplete`, which is false as soon as either side has an unpriced line. A UI must label such a
figure **Məlum qiymətlər üzrə** and never simply "total".

### Averages, precision and nulls

Everything is `decimal`; nothing is cast to `double` or `float`. Quantities keep the domain's three decimals
and money its four, and an average is rounded **once**, at that scale, so a caller's `Delta` is exactly
`Current − Baseline`. Percentages are rounded to four decimals.

`null` always means "there is no such figure" — a missing weighted price, a percentage with a zero baseline, a
service's quantity, an unknown amount. `0`, `-1` and `999` are never used as stand-ins.

### Shape of the pipeline

```
permanent items  →  SQL aggregate per (request, variant)  →  OrderAnalyticsCalculator  →  DTOs → filter → page
```

`OrderAnalyticsCalculator` is pure: snapshots in, comparison figures out, no EF and no database, which is why
every rule above has a unit test that needs no SQL Server. `OrderAnalyticsQueries` does the reading, in a
fixed **four** queries regardless of how many products or baseline months are involved.

Rows are searched on product name, product code and model code through the same normalizer the rest of the
system matches names with — deterministic and case-insensitive, never fuzzy — and may be filtered to one
state. Search and filter are applied before paging (default 50, maximum 200), while the **summary always
describes the complete comparison**, not the page and not the filtered subset.

### Trend

The trend endpoint returns one point per month the location actually ordered in. A month in which the
location ordered but this variant did not is a point with quantity `0`; a month the location has no request
for produces **no point at all**. A service variant's points carry no quantity, only money.

### Category is deliberately not a filter yet

Comparison rows carry no category, and there is no category filter. In the current data **no product carries a
canonical category at all** — category lives on the staged import row, which is what the order browser falls
back to per line. Aggregating a variant's lines is exactly where that breaks down: 1,376 variants resolve to
one category path but **4 resolve to several**, so a category filter would have to silently pick one. That is
a data-model decision for the business, not something analytics should invent.

## Data protection rules

- Locations, categories, units, products, variants, suppliers and responsible persons are **deactivated,
  not deleted**. All foreign keys to them are `RESTRICT`, and the save interceptor refuses hard deletes.
- Only true parts cascade: request → items, import batch → rows → issues.
- Alias rows may be deleted to correct a wrong mapping; they carry no history.
- Technical timestamps (`CreatedAtUtc`, `UpdatedAtUtc`, …) are UTC and set by the interceptor.
  `RequestDate` is a business `date` (`DateOnly`), not a timestamp.
- Check constraints guard basics: positive quantity, non-negative price, month-start request period,
  consistent category levels.

## Prerequisites

- .NET SDK 10 (built with 10.0.301)
- SQL Server. For development, SQL Server Express **LocalDB** works out of the box.
- Node.js 22+ and npm
- EF Core CLI: `dotnet tool install --global dotnet-ef`

## Database setup

The API reads the connection string `ConnectionStrings:BaxOrders`. No secrets are committed:

- **Development** uses LocalDB via `src/BaxOrders.Api/appsettings.Development.json`
  (`Server=(localdb)\MSSQLLocalDB;Database=BaxOrders_Dev;Trusted_Connection=True`).
  To use another server locally, override with user secrets:
  ```
  dotnet user-secrets init --project src/BaxOrders.Api
  dotnet user-secrets set "ConnectionStrings:BaxOrders" "<connection string>" --project src/BaxOrders.Api
  ```
- **Other environments** must set the environment variable `ConnectionStrings__BaxOrders`.
  The API refuses to start without it.

In Development only, `Database:ApplyMigrationsOnStartup=true` applies pending migrations when the API
starts. Nothing is migrated automatically in any other environment.

Seed data (via migrations):

| Unit | Name | Approved aliases |
| --- | --- | --- |
| PCS | Ədəd | ədəd, əd, əd. |
| PACK | Paçka | paçka, paçqa |
| PAIR | Cüt | cüt |
| CM | Santimetr | sm, cm, santimetr |
| M | Metr | m, mt, metr |
| MM | Millimetr | mm |
| G | Qram | qr, gr, qram |
| KG | Kiloqram | kq, kg, kiloqram |
| ML | Millilitr | ml, millilitr |
| L | Litr | lt, l, litr |
| BAG | Kisə | kisə |

Descriptions such as `lik`, `lük`, `qat` and `yarpaq` are deliberately **not** mapped to any unit.
Locations seeded: Ramana, Maştağa, Əmircan, H.Ə.M. No orders, prices or other history are seeded.

## Migration commands

Run from the repository root. `-- --environment Development` makes the design-time host load the
development connection string.

```
# add a migration
dotnet ef migrations add <Name> --project src/BaxOrders.Infrastructure --startup-project src/BaxOrders.Api --output-dir Persistence/Migrations -- --environment Development

# apply to the development database
dotnet ef database update --project src/BaxOrders.Infrastructure --startup-project src/BaxOrders.Api -- --environment Development

# idempotent SQL script for review / deployment to other environments
dotnet ef migrations script --idempotent --project src/BaxOrders.Infrastructure --startup-project src/BaxOrders.Api --output artifacts/migrate.sql -- --environment Development
```

The unit test `Model_matches_the_latest_migration` fails if the model changes without a migration.

## Running the backend

```
dotnet restore
dotnet build
dotnet test
dotnet run --project src/BaxOrders.Api --launch-profile http
```

- API: `http://localhost:5080`
- Swagger UI (Development): `http://localhost:5080/swagger`
- Health (includes a database connectivity check): `GET /health`
- Read endpoints: `GET /api/v1/locations?includeInactive=true`, `GET /api/v1/units-of-measure`
- Excel import: `POST /api/v1/imports/excel` (multipart field `file`), `GET /api/v1/imports/{id}`,
  `GET /api/v1/imports/{id}/rows?page=&pageSize=&status=&issueType=&locationId=&period=&search=`
- Import review: `GET /api/v1/imports/{id}/unresolved/summary`, `GET /api/v1/imports/{id}/unresolved?kind=`,
  `GET /api/v1/imports/{id}/unresolved/category-path?sourceKey=`, `GET /api/v1/imports/{id}/unresolved/product-variant?sourceKey=`,
  `POST /api/v1/imports/{id}/review/bulk/preview`, `POST /api/v1/imports/{id}/review/bulk/apply`,
  `POST /api/v1/imports/{id}/resolutions/map`,
  `POST /api/v1/imports/{id}/resolutions/{locations|suppliers|responsible-people|units|category-paths|products|product-variants}`
- Row corrections and exclusion: `GET /api/v1/imports/{id}/rows/{rowId}`, `GET /api/v1/imports/{id}/corrections/candidates`,
  `PUT|DELETE /api/v1/imports/{id}/rows/{rowId}/corrections/{field}`,
  `POST /api/v1/imports/{id}/rows/{rowId}/{exclude|include}`, `GET /api/v1/imports/{id}/readiness`
- Reference search for review: `GET /api/v1/reference/{locations|suppliers|responsible-people|units|categories|products}?search=`
  and `GET /api/v1/reference/products/{productId}/variants?search=`
- Order confirmation: `GET /api/v1/imports/{id}/confirmation/preview`, `POST /api/v1/imports/{id}/confirmation`
- Order browsing: `GET /api/v1/locations/orders`, `GET /api/v1/locations/{id}/orders`,
  `GET /api/v1/orders/{id}`, `GET /api/v1/orders/items/{id}/source`
- Analytics: `GET /api/v1/analytics/locations/{id}/periods`,
  `GET /api/v1/analytics/locations/{id}/periods/{yyyy-MM}/comparison?basis=&search=&state=&page=&pageSize=`,
  `GET /api/v1/analytics/locations/{id}/variants/{variantId}/trend?from=&to=`

Import settings (`appsettings.json`): `Imports:MaxUploadBytes` (default 20 MB) and
`Imports:HeaderSearchRowLimit` (default 30). Full import rules: [docs/excel-import-notes.md](docs/excel-import-notes.md).

Errors are returned as RFC 7807 ProblemDetails: business-rule violations as 422, a malformed request (an
unknown comparison basis, a month that is not `yyyy-MM`) as 400, a record that does not exist as 404, and
unexpected errors as 500 without internal details.

### Integration tests (opt-in)

`tests/BaxOrders.IntegrationTests` checks behaviour that only a real SQL Server can prove: product code
uniqueness under concurrency, unique request versions, unique names and aliases. The tests are skipped
unless `BAXORDERS_TEST_SQLSERVER` is set. The fixture creates the database from the migrations and
**drops it afterwards**, so it refuses database names that do not end with `_Test`.

```
$env:BAXORDERS_TEST_SQLSERVER = "Server=(localdb)\MSSQLLocalDB;Database=BaxOrders_Test;Trusted_Connection=True;TrustServerCertificate=True"
dotnet test tests/BaxOrders.IntegrationTests
```

## Running the frontend

```
cd frontend/bax-orders-web
npm install
npm run dev      # http://localhost:5173, proxies /api and /health to http://localhost:5080
npm run build    # type-check and production build into dist/
```

Pages (Azerbaijani UI): İdarə paneli `/`, Sifarişlər `/orders`, Sifariş `/orders/:orderRequestId`,
Excel importları `/imports`, Obyektlər `/locations`, Obyekt `/locations/:locationId`, Məhsullar `/products`,
Təchizatçılar `/suppliers`. The import screens, the whole order-browsing path
(`/locations` → `/locations/:id` → `/orders/:id` → source) and the header's server status read real API
data; Məhsullar and Təchizatçılar are still honest placeholders. `/orders` itself is a signpost: a request is
opened from its object, because it always belongs to one object and one month.

There is no frontend test runner; `npm run build` type-checks with `tsc -b` before building.

## Current scope (Task 1)

- Solution foundation, normalized domain model with invariants, normalization rules
- EF Core mappings, indexes, constraints, initial migration `InitialDomainModel`, reference seed data
- API foundation: DI, SQL Server, Swagger, ProblemDetails, global exception handling, `/health`,
  two read endpoints
- Frontend admin shell with routing
- Unit tests for normalization, variant keys, domain invariants and the EF model

Task 1.1 (domain hardening before import, migration `HardenDomainForImports`):

- Location / supplier / responsible person aliases
- Unique canonical names for locations, suppliers and responsible persons
- Sequence-backed product code generator (`PRD-000001`)
- Request versions: unique `(LocationId, RequestPeriod, Version)`, next-version creation, latest-version lookup
- Specification normalization no longer reinterprets numbers; variant keys use unit codes
- Units MM and BAG, approved unit aliases
- Real Excel structure documented in `docs/excel-import-notes.md`

Task 2 (Excel import engine, migration `ImportProcessing`):

- `.xlsx` and legacy `.xls` reading with ExcelDataReader behind `IExcelWorkbookReader`
- File checks (extension, magic bytes, size), SHA-256, duplicate-file protection with retry after failure
- Header detection by normalized column names, staging of original cell text, parsing of quantity / price / date
- Deterministic exact matching (canonical names + aliases, ambiguity detection, category paths, product variants)
- Validation issues with severities, row statuses, batch lifecycle, duplicate-row detection
- Preview API (summary, issue counts, location + period groups with existing-request info, paged rows)
- `/imports` page: upload, summary, groups and filterable server-paged row preview

Task 2.1 (real-data corrections, migration `ClarifyImportPeriodSemantics`):

- `OrderRequest.RequestDate` is optional and `RequestPeriod` required; the order workbook's "Tarix" is staged as
  `ImportRow.ParsedRequestPeriod`
- Invalid present price is a Warning (price ignored, never zero)
- Identical fingerprints are "possible duplicates" with Info severity and never affect row status or readiness
- `HEM` location renamed to Heydər Əliyev Mərkəzi, with `H.Ə.M` as a seeded alias
- Legacy `.xls` findings, unresolved unit values and the distinct-value requirement for Task 3 documented in
  [docs/excel-import-notes.md](docs/excel-import-notes.md)

Task 3A (import review center, migration `AddImportResolutionWorkflow`):

- Review works on distinct unresolved values (location, supplier, responsible person, order unit, specification
  unit, category path); one decision is applied to every staged row with that value
- `ImportResolution` per batch + kind + source key (unique), with BatchOnly or GlobalAlias scope
- Alias safety: a spelling can never point at two records; creating a name that already exists is refused
- Generated location codes (`LOC-000001`), supplier/person/unit creation, category paths that reuse existing levels
- Re-matching rebuilds only `Matching` issues and refreshes the batch summary and preview groups; Excel is never re-read
- `/imports` review center with kind tabs, search, "Mövcud olana bağla" / "Yeni yarat" and the alias checkbox

Task 3B (product and variant resolution, migration `AddProductVariantResolution`):

- Product and product variant are resolved separately: the product is the base identity, the variant is what makes
  quantities comparable (specification, model, order unit)
- A variant is identified by `ImportRow.VariantSourceKey` = resolved product id + `ProductVariantKey` built from
  **unit codes**, so "ədəd", "əd" and "pcs" resolved to one unit produce one variant, not three
- While the product or a unit of a row is unresolved the row carries no variant key at all: it is reported as a
  dependency-blocked row (`dependencyBlockedRows`) with an issue naming the missing decision, never guessed from raw text
- Product decisions support BatchOnly and GlobalAlias (`ProductAlias`) with the same alias safety as Task 3A;
  a variant decision is always batch-only, because it is made of this import's ids
- Mapping to an existing variant is validated: it must belong to the resolved product and use the same order unit,
  otherwise the decision is refused with 409 â no coercion, no "closest variant"
- Creating a variant takes no typed identity fields: the product and units come from the decisions already made and
  the specification/model text is copied verbatim from a staged row
- Unknown product and unknown variant keep the batch out of `ReadyToImport`
- Review center tabs for Məhsullar and Variantlar, with the product shown above each variant and a plan of what
  would be created

Task 3C (bulk review, no migration):

- The review center works on a selection: checkboxes, "select this page", a selected count, and a selection that
  survives paging but starts over when the kind or the search changes
- Every bulk operation is **select → preview → confirm → apply**. The preview is read-only and shows, per value,
  the action, the target or the record that would be created, aliases, conflicts, dependencies and affected rows
- A bulk apply is atomic: the plan is built again under the batch lock, and if one value conflicts nothing at all
  is written (409, with the offending values in the `items` extension)
- At most `Imports:MaxBulkResolutionItems` (default 150) values per operation, so one decision stays reviewable
  and the set-based queries stay inside SQL Server's limits
- "Create as the sheet spells it" is offered only where the value **is** the record's name (location, supplier,
  responsible person, product) and for variants built from decisions already made. Units and category paths are
  never created in bulk
- Several spellings can be mapped to one existing record in one operation; a global alias is written only where
  the operator asked for it, and the default scope stays BatchOnly
- One re-match and one summary refresh per operation instead of one per value; a 150-value preview of the real
  2,672-row batch answers in about 90 ms
- The review center shows a work queue (decided / total per kind, dependency-blocked rows) and the next step

Task 3D (row corrections, exclusion and import readiness, migration `AddRowCorrectionsAndExclusion`):

- **The workbook value is immutable.** A correction records what one cell *should have said*; every `Original*`
  value stays exactly as it was staged, and the UI always shows both
- One shared concept of an **effective value** (`ImportRow.Effective` + `EffectiveRowValues`): the correction
  where there is one, the workbook value everywhere else. Parsing, matching, source keys, duplicates and the
  future import all read it through that one place — no `correction ?? original` scattered around
- A correction is held to the same rules as a workbook cell (same parser, same limits); an unusable value is
  refused with 400 instead of being stored
- A corrected row is re-parsed, re-matched and re-validated in one transaction: it stops inheriting the decision
  made for the value it used to carry, and only the fingerprint groups it touches are refreshed
- **Exclusion**: an operator can keep a row out of the future import with a required reason. The row is never
  deleted — it stays staged, visible and auditable, still counts in `TotalRows`, and stops blocking readiness
- `GET /readiness` answers "why can this batch not be imported yet?" with unresolved references, products and
  variants, row-level blockers, non-blocking warnings, possible duplicates, existing request groups, and
  `CanImport` — each blocker links to the screen where it is decided
- Review Center gained a "Sətir düzəlişləri" tab and an "İmporta hazırlıq" panel; blocking rules are unchanged

Task 5 (order browsing, no migration):

- Read-only path through the permanent orders: locations → one location's monthly history → one request →
  its lines → the staged row each line came from
- `LocationOrderQueries` and `OrderRequestQueries` in the Application layer; `LocationsController` and
  `OrdersController` return typed DTOs and never an entity
- Server-side paging everywhere (locations 25, history 24, lines 50), page size capped at 100, aggregates
  computed in SQL, no N+1
- `KnownAmountTotal` counts only priced lines and is `null` — not `0` — when nothing is priced; the missing
  price count travels with every amount shown
- History filters and orders on `RequestPeriod`, never on the null `RequestDate`
- "Mənbəyə bax" shows source value, effective value and canonical record per column, marks corrections and
  intentionally-empty cells, and changes nothing
- Nothing on these screens writes: no create, edit, approve, reject or delete, and no status transition

Task 6A (analytics engine, no migration):

- Deterministic comparison of one location-month against `PreviousMonth`, `Previous3MonthAverage` or
  `Previous6MonthAverage`, as calendar windows that never include the selected month
- A month the location has no request for is missing history, not a zero; averages divide by the months that
  are available and the response names the ones that are not
- The highest version of each month is used and two versions are never added together; requests of any status
  are included while no approval workflow exists
- `OrderAnalyticsCalculator` is a pure calculator with no database; `OrderAnalyticsQueries` reads in four
  queries whatever the number of products or months
- Quantity is compared per `ProductVariantId`; services (`MONTH`, `TIME`, no order unit) are compared by money
  and carry no quantity figure at all
- Weighted unit price, price coverage, known-amount and null-percentage rules as documented above
- `AnalyticsController` with the comparison, available-periods and trend endpoints; typed DTOs only
- Nothing writes: no endpoint, no service and no query in this layer changes a row

## Intentionally deferred

- Undo or history of review decisions
- Reading the legacy request-form `.xls` layout (location, person and period in a header block)
- Fuzzy or AI-assisted matching
- Analytics **screens**: the comparison UI, charts and the management dashboard (Task 6B onwards). The
  calculation engine behind them exists; see *Comparing months (Task 6A)*
- Anomaly detection, forecasting, recommendations and any generated explanation of why a number moved
- Category as an analytics dimension, until products carry a canonical category
- Approval workflow UI and rules beyond basic status transitions
- Authentication and roles (Admin, Coordinator, Manager / Approver)
- AI assistant
- Unit conversion rules (for example pack ↔ pieces)
- CRUD endpoints for master data
