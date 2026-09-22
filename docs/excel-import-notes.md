# Excel import

How workbooks become staged, validated import rows. Implemented in Task 2.

**Explicitly not implemented yet:**
- **No fuzzy matching.**
- **No AI matching.**
- **No OrderRequest creation.**
- **No manual mapping or resolution UI.**

The import stops at a preview.

```
upload → file checks → SHA-256 → duplicate check → ImportBatch
       → read workbook → detect header → stage rows (original text)
       → parse → normalize → exact matching → validation → issues
       → row status + batch summary → preview
```

## Supported formats and library

| | |
| --- | --- |
| Formats | `.xlsx` (standard for normal business use) and legacy `.xls` |
| Library | [ExcelDataReader](https://github.com/ExcelDataReader/ExcelDataReader) 3.9.0 (MIT), in `BaxOrders.Infrastructure` behind `IExcelWorkbookReader` |
| Legacy encodings | `CodePagesEncodingProvider` is registered for `.xls` |
| Macros / formulas | Never executed or evaluated; the value Excel cached in the file is read |
| Size limit | `Imports:MaxUploadBytes`, default 20 MB |
| Content check | Extension must be `.xlsx`/`.xls` **and** the magic bytes must match (ZIP for `.xlsx`, OLE2 for `.xls`) |
| Hash | SHA-256 of the file, stored as `ImportBatch.FileHash` |

Why ExcelDataReader: one fully managed library reads both formats. It needs no Excel installation and no
COM, and it has no commercial licence (EPPlus was excluded). It returns typed cell values (string, double,
DateTime), which the parser needs. Application code never references the library.

## Observed workbooks

### Order workbook (`.xlsx`): importable

- One sheet, `Əsas`. The header is on row 3 and data starts on row 4. Column A is empty.
- The header text contains `Alt  kateqoriya` with two spaces.
- Columns: № · Ana kateqoriya · Orta kateqoriya · Alt kateqoriya · Malın adı · Ölçü · Vahid · Model/Kod ·
  Miqdarı · Ö/v · Qiyməti · Cəmi · Şirkət · Obyekt · Tarix · Cavabdeh şəxs.
- Quantities, prices and totals are native numbers. "Tarix" is a native date and is **always the first day of a
  month**: it is the request **period**, not the day the request was written. It is staged as
  `ParsedRequestPeriod`; `ParsedRequestDate` stays null, and order requests created from this workbook will have
  `RequestDate = null`.
- One workbook contains many locations, months, suppliers and responsible people. After review, rows group
  into many order requests by **location + request period**.

### Warehouse/expense workbook (`.xls`): a different schema, not imported

The legacy workbook is **not** the same kind of file, and it is not forced into the order schema.

| Aspect | Order `.xlsx` | Legacy `.xls` |
| --- | --- | --- |
| Sheets | 1 (`Əsas`) | 12: yearly summaries (`Ümumi`, `Titul`), one sheet per month, request forms, a fuel list (`Лист1`) |
| Table layout | One flat table | Several blocks per sheet; request forms have a metadata block above the table |
| Location | `Obyekt` column per row | Header text such as `Şöbə: Heydər Əliyev Mərkəzi` or `Ərazi: …` |
| Responsible person | `Cavabdeh şəxs` column | Header text `Sifariş üzrə cavabdeh şəxs: …` or `Sifarişçi: …` |
| Date / period | `Tarix` per row | Header text `Tarix: 22.06.2026` and `Dövr: 01.07.2026 - 31.07.2026`. The request date can fall in the month *before* the period |
| Columns | 16 | `№, Malın adı, Miqdarı, Ö/v, Qiyməti, Cəmi, Şirkətlər` (no categories, specification, model) |
| Supplier header | `Şirkət` | `Şirkətlər` |

This workbook proves that the business distinguishes the **request date** (`Tarix: 22.06.2026`) from the
**request period** (`Dövr: 01.07.2026 - 31.07.2026`). That is why `OrderRequest.RequestPeriod` is required and
`OrderRequest.RequestDate` is optional. It also confirms **H.Ə.M = Heydər Əliyev Mərkəzi**: the location is seeded
with code `HEM`, name `Heydər Əliyev Mərkəzi` and the alias `H.Ə.M`.

Uploading it stages nothing. The import becomes `Failed` with a per-sheet list of missing required columns,
and it can be retried. Supporting it needs a separate "request form" reader that understands the metadata
block. That is a decision for a later task.

## Header detection

- The first 30 rows of each visible sheet are searched (`Imports:HeaderSearchRowLimit`); row 3 is not hard-coded.
- Header text is normalized with `TextNormalizer`: trim, collapsed whitespace, Unicode NFKC, culture-independent case,
  and I/İ/ı folded to i. `Alt  kateqoriya`, `ALT KATEQORIYA` and `alt kateqoriya` are the same column.
- Matching is exact against the expected header names. Unknown headers are ignored, never guessed
  (`Şirkətlər` is not `Şirkət`).
- **Required columns:** Malın adı, Miqdarı, Ö/v, Obyekt, Tarix. The first row containing all of them is the header.
  A header row with a duplicated column is rejected.
- Columns that may be absent or blank: №, the categories, Ölçü, Vahid, Model/Kod, Qiyməti, Cəmi, Şirkət,
  Cavabdeh şəxs.
- Hidden sheets are not imported.
- If no sheet has a header, the import fails with the missing columns for every sheet.

## Raw and parsed values

`ImportRow.Original*` always answers *what was written in Excel*:

- Text cells are stored exactly, including leading and trailing spaces.
- Numeric cells are stored in invariant round-trip notation (`1.2`), date cells as ISO dates (`2026-01-01`).
- Empty cells are stored as null.
- A cell longer than its staging column is cut to fit, and the row gets an Error issue.

Parsed values (`ParsedQuantity`, `ParsedUnitPrice`, `ParsedLineTotal`, `ParsedRequestPeriod`) and matched ids
are stored next to the originals and never overwrite them. `ParsedRequestDate` is reserved for sources that state
a request date separately from the period (the legacy request forms) and is null for the order workbook.

## Rows

- A row is skipped only when **every recognised column** is empty.
- Blank price, supplier, model or specification never skips a row.
- A row missing required business data is staged anyway, with Error issues. One bad row never aborts the workbook.

## Parsing rules

**Quantity** (required, `decimal(18,3)`):
- Native numbers are preferred. The binary double is converted to decimal with 15 significant digits, which
  removes floating-point noise but never rounds a real value.
- Text is accepted only as a plain number with one `.` or `,` decimal separator (`4,5`, `4.5`).
- `1,500` / `1.500` are rejected as **ambiguous** (possible thousands separator).
- It must be greater than 0. More than 3 decimals is rejected, not rounded.
- Problems produce `InvalidQuantity` (Error).

**Price** (optional, `decimal(18,4)`). Price is optional for an order request item, so a price problem never
invalidates a row with a valid product, quantity, order unit, location and period:
- Blank price gives `MissingPrice` (Warning).
- A present price that cannot be read, is negative or has more than 4 decimals gives `InvalidPrice` (**Warning**).
  `ParsedUnitPrice` stays null; the price is **never replaced by zero**.
- Without a parsed price, no `LineTotalMismatch` can be calculated. The row stays usable for quantity analytics.

**Request period ("Tarix")** (required, `DateOnly`, first day of a month):
- In the order workbook "Tarix" is the analytical period. It is staged as `ParsedRequestPeriod`, never as a request date.
- Native date cells are preferred; any time part is ignored.
- Text is accepted as `dd.MM.yyyy`, `d.M.yyyy`, `dd/MM/yyyy`, `d/M/yyyy` or `yyyy-MM-dd`. Month-first text is never guessed.
- Plain numbers are not interpreted as Excel serial dates. Years must be within 2000–2100.
- A missing or unreadable value gives `InvalidDate` (Error).
- A date on another day than the 1st is used as its month (2026-03-18 → 2026-03-01) with an Info note.
  In the real workbook every value is already the 1st.
- Business dates and periods are not UTC timestamps.

**Line total (Cəmi):**
- Never authoritative, and the raw total is never modified.
- When quantity, price and Cəmi are all present, the importer computes `quantity × price`.
- If the difference from Cəmi is more than **0.01 AZN** (`ImportIssueRules.LineTotalTolerance`), it adds
  `LineTotalMismatch` (Warning). The message contains the Excel total, the calculated total and the difference.
- An unreadable Cəmi gives `InvalidLineTotal` (Warning). A missing price or total means no comparison.

**Specifications** use `SpecificationNormalizer` from Task 1.1: whitespace, case and multiplication signs only.
`1,5` ≠ `1.5` and `1.000` ≠ `1`. A specification or model cell that Excel stored as a date is flagged
(`Other`, Warning), because Excel may have converted what the author typed.

## Exact matching

All matching is exact on normalized values, from data loaded once per import (see Performance).

| Field | Looked up in | Missing | Unknown | Ambiguous |
| --- | --- | --- | --- | --- |
| Obyekt | `Location.NormalizedName`, `LocationAlias` | Error | Error `UnknownLocation` | Error |
| Ö/v | unit code, name, symbol, `UnitOfMeasureAlias` | Error | Error `UnknownUnit` | Error |
| Vahid | same as Ö/v | fine | Warning `UnknownUnit` | Warning |
| Şirkət | `Supplier.NormalizedName`, `SupplierAlias` | fine | Warning `UnknownSupplier` | Warning |
| Cavabdeh şəxs | `ResponsiblePerson.NormalizedName`, `ResponsiblePersonAlias` | fine | Warning `UnknownResponsiblePerson` | Warning |
| Categories | full path from the root | fine | Warning `UnknownCategory` | n/a |
| Malın adı | `Product.NormalizedName`, `ProductAlias` | Error `MissingRequiredValue` | Warning `UnknownProduct` | Error |
| Variant | `ProductVariantKey` (specification + spec unit code + model + order unit code) | n/a | Warning `UnknownProductVariant` | n/a |

- **Canonical names and aliases:** both go into one lookup.
  - Same record: the value matches that record.
  - Different records (canonical `Cleanfix` and alias `Cleanfix` → `Cleanfix MMC`): `AmbiguousMatch`. Nothing is chosen.
- **Categories:** matched as a path. `Usta → Tikinti ləvazimatı → Material` never matches a `Material` under another parent.
  A blank level between filled levels makes the path unknown.
- **Variants:** checked only after the product and the order unit are resolved. Pieces and packs are always different variants.
- **Scope:** only active records are matched.
- **Nothing is created:** no product, variant, category, supplier, alias or order request.
- **Corrections** come only from normalization, approved aliases, or (Task 3) manual review.
  There are no special-case string fixes in the parser.

## Severity, row status and batch status

**Errors:**
- missing product name
- missing or invalid quantity
- missing or unknown order unit
- missing or unknown location
- missing or invalid request period (Tarix)
- ambiguous location, order unit or product
- oversized cell

**Warnings:**
- missing or invalid price
- LineTotalMismatch, InvalidLineTotal
- unknown supplier, responsible person, category, product, variant or specification unit
- ambiguous supplier, responsible person or specification unit
- cells stored as dates

**Info** (never changes the row status, never blocks):
- possible duplicate (`DuplicateRow`)
- "Tarix" on a day other than the 1st

Row status and summary buckets (each row counts in exactly one):

| Row status | Summary bucket | Rule |
| --- | --- | --- |
| `Invalid` | InvalidRows | at least one Error |
| `NeedsReview` | WarningRows | no Error, at least one Warning |
| `Valid` | ValidRows | no Error and no Warning (Info issues do not count) |

A `Valid` row may therefore still carry Info issues, such as a possible duplicate.

Batch lifecycle: `Uploaded → Parsing → Validating → NeedsReview | ReadyToImport`, or `Failed`.

- **NeedsReview:** at least one row has a *blocking* issue. That means every Error, plus `UnknownProduct` and
  `UnknownProductVariant`, because an order request item needs a product variant.
- **ReadyToImport:** only non-blocking warnings and Info remain (for example missing or invalid price, unknown
  supplier, possible duplicates).
- **Failed:** the workbook could not be read, has no header, has no data rows, or processing hit an unexpected error.
  `FailureReason` stores a short internal message, never a stack trace.
- **Imported** is not used yet.

## Duplicate files

- **Same file twice:** if a batch with the same SHA-256 exists in any status except `Failed`, the upload returns
  **409** with that `importBatchId`, and nothing is processed.
- **Concurrent uploads:** a filtered unique index (`FileHash` where `Status <> 'Failed'`) also stops two
  simultaneous uploads of the same file.
- **Retry:** a `Failed` import leaves the index, so the same file can be uploaded again.

## Possible duplicate rows

Rows within one import are marked **Possible duplicate** (`DuplicateRow`, severity **Info**) when this fingerprint
of normalized values is equal. It is only a review signal: two independent, legitimate request lines can have
identical business values, so an identical fingerprint does not prove an accidental duplicate. A possible duplicate
never invalidates a row, never gives it Warning status, never blocks ReadyToImport, and is never merged or deleted.

```
location · request period · main / middle / sub category · product name · specification (SpecificationNormalizer)
· specification unit · model code (ModelCodeNormalizer) · quantity · order unit · unit price (or its text)
· supplier · responsible person
```

- **Not in the fingerprint:** `№` and `Cəmi`.
- **No fingerprint:** rows without a location, product name, order unit, valid quantity or valid date, so they
  are never duplicates.
- **Flagging:** every row of a duplicate group is flagged, and the message lists the other row numbers.
- **Never removed:** rows are only flagged.

## Groups and existing requests

The preview groups rows with a resolved location and a parsed request period by **location + `ParsedRequestPeriod`**.
Existing requests are looked up by **`LocationId` + `RequestPeriod`**. For each group:
- row count
- priced and unpriced rows
- warning and error issue counts
- whether an `OrderRequest` already exists for that location and period, and its latest version

`SuggestedAction` is `CreateNewRequest` or `RequiresOperatorDecision`. Nothing is overwritten, merged or versioned.
Rows without a resolved location or request period are counted as `ungroupedRows`.

## API

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/v1/imports/excel` (multipart field `file`) | 201 preview + sheet detection; 400 refused upload; 409 duplicate (`importBatchId`); 422 failed workbook (`importBatchId`, `sheets`) |
| GET | `/api/v1/imports/{id}` | batch summary, issue summary, groups |
| GET | `/api/v1/imports/{id}/rows` | server-paged rows: `page`, `pageSize` (max 200), `status`, `issueType`, `locationId`, `period`, `search` (normalized product name contains) |

Errors are ProblemDetails; physical paths and stack traces are never returned.

## Performance

- **Matching data:** loaded in a fixed number of queries.
  - Locations, suppliers, people, units, categories and their aliases are loaded completely.
  - Products and product aliases are loaded only for the workbook's distinct normalized names, in chunks of 500.
  - Variants are loaded for the products found.
- **Per-row cost:** no database query per row. Rows and issues are saved in one `SaveChanges`, with large insert batches.
- **Preview:** counts and groups are aggregated in SQL, and rows are paged on the server.
- **Timing:** a ~2,700-row workbook completes synchronously within seconds on LocalDB.
  `ExcelImportService` has no HTTP dependency, so it can move to a background job later.

## Logging

One line per import: id, file name, hash prefix, total rows, duration and summary counts. Failures log the
import id and reason. Workbook contents and individual rows are never logged.

## Data problems seen in the real order workbook

These are data facts for review; the parser does not special-case any of them.

- **Order units without a canonical unit (unresolved):** `kv`, `kv.m`, `top`, `dəst`, `dəfə`, `k`. These rows are
  errors until a person decides. They are **not** mapped automatically.
- **Specification-like values (unresolved):** `lik`, `luq`, `lıq`, `lük`, `qat`, `yarpaq`, `ədədli`, `diş`. These are
  warnings. **No** `UnitOfMeasure` records are created for them automatically.
- Both lists wait for explicit human resolution in the mapping workflow (Task 3).
- **Status text in the location column** (`Təhvil verdi`, `Təhvil verildi`), and location names in the supplier column.
- **Spelling variants of the same name:**
  - `Xəyal - Əbülfəz` / `Xəyal-Əbülfəz`, and `xəyal` / `Xəyal `: normalization unifies these.
  - `Dədə Qorqud` / `Dədəd Qorqud`, `Green Garden` / `Green Gardem`: typos that need aliases.
- **Suspicious totals:** "Cəmi" is `0` where the price is blank. Some totals have more than 4 decimals, and a few differ from quantity × price.
- **Dates:** some specification and model cells were stored by Excel as dates.
- **Repeats:** 952 rows share their business fingerprint with another row. This does not prove accidental
  duplicate orders, so they are only marked as possible duplicates (Info).

## Import review: resolving distinct values

Review works on **distinct values, never row by row**: the first real import has 2,672 UnknownSupplier row issues
but only 98 distinct supplier values, so an operator makes 98 decisions instead of 2,672.

Covered kinds: **location, supplier, responsible person, order unit, specification unit, category path, product
and product variant**. Order requests are still not created.

### Source keys

Every staged row stores the key of each value (`ImportSourceKeys`), and decisions are stored against the same key:

| Kind | Key |
| --- | --- |
| Location, supplier, responsible person, order unit, specification unit | the normalized cell text |
| Category path | the normalized levels from the root, joined by `\|` (`təmizlik\|təmizlik ləvazimati\|əlcək`) |
| Product | the normalized product name |
| Product variant | `product=<id>\|` + the `ProductVariantKey` of the row (`specification=50\|specUnit=CM\|model=\|orderUnit=PCS`) |

A blank level between filled levels is kept as an empty segment: such a path can be mapped to an existing
category but cannot be created, because its hierarchy is unknown.

A variant key is built from **canonical values only**: the id of the resolved product and the **codes** of the
resolved units. "ədəd", "əd" and "pcs" mapped to one unit therefore produce one variant instead of three, and the
same shape under another product is a different value. The key is stored on the row (`ImportRow.VariantSourceKey`,
at most 480 characters) and is hashed like every other key when a decision is stored.

### Dependencies

A row has a variant key only once the decisions it is made of exist. While the product, the order unit or the
specification unit is unresolved, the row keeps `VariantSourceKey = NULL`, gets an `UnknownProductVariant` issue
naming the missing decision ("...until the order unit (Ö/v) is resolved") and is counted as a
dependency-blocked row in the summary instead of appearing as a distinct value. No variant is ever invented from
raw cell text: that would create a second item hiding under the same name.

In the first real workbook this is visible at once: all 2,672 rows are dependency-blocked because all 858 product
names are still unresolved.

### What an operator can do

Per distinct value:

- **Map to an existing record.** The UI searches canonical records by name, code and symbol. Nothing is
  preselected and no fuzzy scoring happens; the person chooses.
- **Create a new record**, using the incoming spelling as the default name. Spelling is never auto-corrected.
- **Leave it unresolved.**

Each decision has a scope:

- **BatchOnly** — applies to this import only.
- **GlobalAlias** — also saves the incoming spelling as an alias (location, supplier, responsible person, unit,
  product), so later imports resolve it automatically. Category paths and product variants cannot become aliases:
  a path is a hierarchy and a variant is made of this import's own ids.

### Alias safety

Before an alias is saved:

- If the value is already the canonical name of the **target**, no alias is needed.
- If it is the canonical name or an alias of **another** record, the decision is refused (409): one spelling must
  never point at two records.
- An alias that already points at the target is left as is.

The same rule protects newly created records: a name that already belongs to a record or alias is refused with a
hint to map to it instead. For units, the code, name and symbol are all checked.

### Creating records

| Kind | Rules |
| --- | --- |
| Location | Code is generated from a SQL Server sequence (`LOC-000001`), never typed |
| Supplier | Name required, code optional and unique |
| Responsible person | Name only. Still a business label: no user account, and similar names are never merged |
| Unit | Code, name, optional symbol and unit type. The importer never guesses what `kv.m`, `top` or `dəst` mean |
| Category path | Existing levels are reused, only missing ones are created, in one transaction |
| Product | Name from the incoming spelling, optional category chosen by the operator; code generated (`PRD-000001`) |
| Product variant | No typed fields at all: product and units come from the decisions already made, specification and model code are copied verbatim from a staged row |

### Mapping a variant to an existing one

A variant is only comparable with a variant of the same product ordered in the same unit, so mapping is checked
before it is stored:

- the target must belong to the product the value was resolved to, otherwise **409**;
- the target's order unit must be the row's resolved order unit, otherwise **409** — 30 pieces and 30 packs are
  not the same quantity;
- creating a variant that already exists is refused with **409** and a hint to map to it.

Nothing is coerced and no "closest variant" is offered.

### Applying a decision

One decision runs as a single transaction:

1. Lock the import batch row, so two decisions cannot interleave.
2. Create or look up the target, and save the alias when asked.
3. Store the `ImportResolution`.
4. Re-match **every staged row with that source key**. When the catalog itself changed (a new record or alias),
   rows still unresolved for the same catalog are re-matched too.
5. Recount row statuses and refresh the batch summary (`NeedsReview` ⇄ `ReadyToImport`).

Re-matching never reads Excel again and never touches `Original*` values. Only issues with origin `Matching` are
rebuilt; parsing, validation and duplicate issues (missing price, total mismatch, invalid quantity, possible
duplicate) stay exactly as they were. Row statuses follow the same severity rule as during import.

Resolved rows immediately appear in the preview groups for **location + request period**, and existing requests
are looked up again for those groups. No order request is created, versioned or changed.

### Concurrency

- `(ImportBatchId, Kind, SourceKeyHash)` is unique, so one value cannot hold two decisions. The key is hashed
  because category paths can exceed SQL Server's index key size.
- Repeating the same decision returns `AlreadyApplied`; a different target returns **409 Conflict**.
- A failed decision rolls the whole transaction back: no resolution, no alias, no re-matched rows.

### API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/imports/{id}/unresolved/summary` | Distinct values and affected rows per kind |
| GET | `/api/v1/imports/{id}/unresolved?kind=&search=&page=&pageSize=` | Distinct values with samples and status |
| GET | `/api/v1/imports/{id}/unresolved/category-path?sourceKey=` | Which levels exist, which would be created |
| GET | `/api/v1/imports/{id}/unresolved/product-variant?sourceKey=` | What creating the variant would produce, and what blocks it |
| POST | `/api/v1/imports/{id}/review/bulk/preview` | What the selected decisions would do; writes nothing |
| POST | `/api/v1/imports/{id}/review/bulk/apply` | Applies them as one operation: all or none |
| POST | `/api/v1/imports/{id}/resolutions/map` | Map a value to an existing record |
| POST | `/api/v1/imports/{id}/resolutions/{locations\|suppliers\|responsible-people\|units\|category-paths\|products\|product-variants}` | Create a record for the value |
| GET | `/api/v1/reference/{locations\|suppliers\|responsible-people\|units\|categories\|products}?search=` | Choices for a person |
| GET | `/api/v1/reference/products/{productId}/variants?search=` | Variants of one product only |
| GET | `/api/v1/imports/{id}/rows/{rowId}` | One row: workbook values, corrections, effective values, matches, issues |
| GET | `/api/v1/imports/{id}/corrections/candidates?issueType=&status=&excluded=&search=` | Rows that need a row-specific decision |
| PUT | `/api/v1/imports/{id}/rows/{rowId}/corrections/{field}` | What the cell should have said |
| DELETE | `/api/v1/imports/{id}/rows/{rowId}/corrections/{field}` | Back to the workbook value |
| POST | `/api/v1/imports/{id}/rows/{rowId}/exclude` | Keep the row out of the import (reason required) |
| POST | `/api/v1/imports/{id}/rows/{rowId}/include` | Put it back |
| GET | `/api/v1/imports/{id}/readiness` | Why the batch cannot be imported yet |

### Bulk review

The first real workbook needs 858 product decisions, so the review center works on a selection as well as on
single values. A bulk operation is always **select → preview → confirm → apply**, and the preview is the only
thing the confirmation shows.

- **Preview** (`review/bulk/preview`) writes nothing. Per value it reports the action, the target or the record
  that would be created, whether an alias would be saved, conflicts, missing dependencies, how many staged rows
  it touches and how many raw spellings fall into it. The totals are what the confirmation screen shows.
- **Apply** (`review/bulk/apply`) takes the same explicit item list. The client's display text is never trusted:
  the server looks the values up by source key and builds the plan again, under the batch lock.
- **Atomic.** One batch lock, one transaction, one re-match and one summary refresh. If any value is in conflict
  or waiting for a dependency, the whole operation is refused with **409** and the offending values in the
  `items` extension — no partial catalog records, no partial decisions.
- **Bounded.** At most `Imports:MaxBulkResolutionItems` values (default 150) per operation: enough to be useful,
  small enough to stay reviewable and to keep the set-based queries inside SQL Server's parameter limits.
  Above it, the request is refused with **400**.
- **Idempotent.** A value that already carries the same decision is reported as already resolved and skipped, so
  a double submit writes nothing twice.

#### What may be created for a whole selection

| Kind | Map many to one | Create as the sheet spells it |
| --- | --- | --- |
| Location, supplier, responsible person | yes | yes — the value **is** the name; the code comes from the sequence |
| Product | yes | yes — name from the review list, `PRD-000001` from the sequence, category left empty |
| Product variant | yes (per value) | yes — built from the product and units already decided |
| Order unit, specification unit | yes | **no** |
| Category path | yes | **no** |

A unit is not created in bulk because "kv", "top", "lik" or "yarpaq" carry meaning the sheet does not: a unit
needs a code, a name, a symbol and a type, and only a person knows them. A category path is not created in bulk
because it is a hierarchy, and some real paths have a blank level between filled ones; both stay one-at-a-time
decisions in the single-value dialog.

#### Products

The name used is the review list's display value: the most common spelling, ties by first appearance. Before
creating, each value is checked against canonical names and aliases; a name that already belongs to a record is
a conflict with a hint to map to it instead, never a second product. Fuzzy similarity decides nothing.

#### Variants

Only dependency-ready variants can be selected: a row whose product or units are unresolved has no variant
identity at all and is counted as a dependency-blocked row. Because the key is built from unit codes, spellings
that resolve to the same unit are already one value — the preview shows this as "2 spellings, 3 rows" — so one
canonical variant is created, not one per spelling. A variant decision is always batch-only.

#### Real data safety

Bulk apply was never run against the real batch. Its preview is read-only and was measured there: 150 distinct
product values covering 1,596 rows answer in about 90 ms, and the work queue over 2,672 rows in about 150 ms.

## Row corrections and exclusion

Distinct-value review settles values the catalog should know ("Green Gardem" → a supplier). It cannot settle a
problem that belongs to **one cell of one row**: a status text in the Obyekt column, a location name in the
Şirkət column, a quantity that is not a number, or a size Excel turned into a date. Those need a correction —
or the row has no place in the import at all.

### Source value and effective value

| | |
| --- | --- |
| **Source value** | What the workbook holds, staged in the `Original*` columns. **Never changed, ever.** |
| **Effective value** | What the importer parses, matches and will import: the operator's correction when there is one, the workbook value otherwise. |

`ImportRow.Effective(field)` and `EffectiveRowValues` are the only place that choice is made. Everything else —
source keys, `ImportRowEvaluator`, `ImportRowMatcher`, `DuplicateRowDetector` and the future order import —
reads row values through that one abstraction, so a corrected row goes through exactly the pipeline a freshly
read row goes through.

### What a correction is, and is not

A correction answers **"what should this cell have said?"** — not **"which canonical record is this?"**. Correcting
the Obyekt cell to "Dədə Qorqud" does not point the row at a location: the corrected text goes through normal
matching and, if it is still unknown, appears in the review list like any other value. No canonical id is ever
stored in a correction.

- One cell carries at most one correction (unique on row + field); correcting it again updates that correction.
- A correction is parsed by the **same parser with the same limits** as a workbook cell: a quantity must be a
  number greater than zero with at most 3 decimals, a price must be a number ≥ 0 with at most 4 decimals, a
  period must be a readable date. An unusable value is refused with **400**, not stored.
- Removing the correction returns the row to the workbook value.
- The Excel "Cəmi" column is not correctable: the total is always recalculated from quantity × price, and the
  workbook's own total is kept for auditing only.

### What happens when a correction is saved

One transaction, under the batch lock: store the correction → rebuild the source keys from the effective values
→ re-parse → re-match → rebuild the parsing, validation and matching issues → refresh the possible-duplicate
groups the row left and joined → refresh the row status and the batch summary. The workbook is never read again.

A correction can change the source key, so the row **stops inheriting the decision made for the old value** and
no stale match or matching issue is left behind. Issues that describe the workbook itself (a cell too long for
its staging column) survive, because staged text cannot produce them again.

### Excluding a row

Some rows cannot be corrected: they do not belong in the import at all. An operator can exclude one row with a
**required reason**. An excluded row:

- is **not deleted**: it stays staged with its original values, its corrections and its issues;
- still counts in `TotalRows`, and is counted separately as `ExcludedRows`;
- drops out of the valid / warning / invalid counts, the review lists and readiness;
- never blocks `ReadyToImport`, and will not become an order request item.

Putting it back re-evaluates it and brings its problems back; its corrections are kept. There is no bulk
exclusion: one row at a time, on purpose.

### Import readiness

`GET /api/v1/imports/{id}/readiness` answers one question: what still keeps this batch from becoming order
requests? It reports rows (included / excluded), unresolved references, unresolved products and variants,
row-level blockers, non-blocking warnings, possible duplicates and the location + period groups that already
have a request — plus `CanImport` and a list of blockers, each naming the screen where it is decided.

The blocking rule itself is unchanged: every Error, plus an unresolved product or product variant. Warnings and
information never block.

### Business rules confirmed here

- **A row without a usable price may still be imported.** The future order request item keeps `UnitPrice = null`
  and takes part in quantity analytics only. A missing or unusable price is **never** replaced by 0 AZN.
- **Possible duplicates stay separate lines.** They are informational, never merged, removed or suppressed, and
  a future import keeps them as separate order request items unless a later, explicit business decision says
  otherwise. A correction only refreshes which rows share a fingerprint.
- **An existing request for a location and period is never touched.** Readiness reports the group and its
  latest version; what to do about it is Task 4's decision, and the safe default there is to do nothing.
- **A cell Excel converted to a date cannot be guessed.** The importer only reports it; the value the author
  typed has to come from the original document, entered by a person as a correction — or the row is excluded.

### Still not done

No fuzzy matching, no AI, no typo correction, no automatic synonyms, no unit conversion (pack ↔ pieces), no undo
or history of decisions, and no order request creation.

## From staged rows to orders

The last step of an import is a separate, explicit confirmation; nothing becomes an order as a side effect of
review. The batch moves `ReadyToImport` → `Imported` once, and only once.

**Grouping.** One order request is one location and one analytical month (`Tarix`, normalised to the first day
of that month). Nothing else groups: not the supplier, not the category, not the responsible person. Every
included staged row becomes its own item, so the permanent data keeps the line cardinality of the sheet.

**Two identical lines stay two lines.** The workbook really does repeat lines — the same part ordered twice in
a month, on two separate request lines. `DuplicateRow` is information for a human, and the import never merges,
sums or drops such rows.

**An unknown price stays unknown.** 95 rows of the corrected workbook have no usable price. They are imported
with `UnitPrice = null` and their quantity intact; zero is never substituted, and the money total of a group
sums only the rows whose price is known. The permanent line total is always `Quantity × UnitPrice`, never the
sheet's `Cəmi`.

**An unresolved supplier is empty, not invented.** `OrderRequestItem.SupplierId` is optional. Rows whose
`Şirkət` value has no decision yet are imported with no supplier; the staged row keeps the original text.

**The responsible person does not travel to the item.** `OrderRequest` has an optional responsible person, but
a location + period group may hold rows of several people, so the import leaves it null rather than choosing
one. `ImportRow.OriginalResponsiblePersonName` and its matched identity remain the record of who asked.

**Excluded rows** — the workbook's grand-total footer row, for instance — become no item. They stay staged with
their exclusion reason, so "left out on purpose" never looks like "the system forgot these rows".

**Existing requests are never touched silently.** If a location and period already have a request, the group
needs an explicit decision: a new version (earlier versions untouched) or an explicit skip with a reason. A
request still in `Draft` cannot be versioned — the domain corrects a draft in place.

**Provenance.** `ImportRowMaterialization` links each staged row to the single item it became, with both sides
unique in the database, so a row can never be imported twice. `ImportMaterializationGroup` keeps what was
decided per group, including the reason a group was skipped.

**Service lines keep their meaning.** A monthly service unit (`MONTH`), an intentionally unitless variant and a
specification descriptor (`28 diş`) are copied exactly as they are. Whether such a line can be compared with a
material line is an analytics question: ordinary material variants are quantity-comparable only when their
variant identity and order-unit semantics match, while service-like lines need amount-based reporting. No
analytics code exists yet.
