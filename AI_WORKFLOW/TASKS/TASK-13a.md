# TASK 13a — MƏHSUL UYĞUNLUQLARI: TƏKLİF, TƏSDİQ, RƏDD, GERİ ALMA (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-13.md`. This is the owner's settled requirement, shared by 13a, 13b and 13c. It decides
*what* and *why*; this file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **13a of three.** 13a builds the record of the admin's decisions, the suggestions, the approve / reject / undo
API with its authority, and the migration tool that puts the new table into the real database. **13b** makes an
approved spelling match count as one product everywhere the analytics look, and fills the Products page. **13c** shows
an approved variant transition as one "variant dəyişib" line (13.1a). §3 lists which brief lines each part carries;
together they carry all of them.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `d4a0ce4`
(Task 12's accepted commit). Line numbers below are at `d4a0ce4`.

This task changes the real database's **schema** (one new, empty table) through a migration tool with the five fixed
commands. It creates, changes and deletes **no business row**: no order, line, price, pricing classification, product,
variant, alias, location or user. No match is approved by anything but an admin, inside the product (13.2).

DATA_MIGRATION: yes

---

## 1. Context

The brief's goal: "Eyni mal fərqli yazıldığı üçün yalançı «yeni» və «bu ay yazılmayan» dəyişikliyi yaranmasın; ətir,
rəng və ölçü kimi variantlar isə ayrı qalsın. Sistem heç vaxt öz-özünə birləşdirmə etməsin."

Owner decisions this task carries as hard requirements (HD-004 put the protection for Task 13 here, not in a workflow
gate):

- **13.1** — names that differ by scent, colour or size may belong to one base product but stay separate variants.
  No automatic blind merging.
- **13.1a** — an approved variant transition is one "variant dəyişib" line in "Niyə dəyişib?". Only for an approved
  match. (Carried by 13c; 13a stores the approval it depends on.)
- **13.2** — matches and alternative names are approved only by an admin or a data manager.
- "Qeyri-müəyyən uyğunluqlar heç vaxt avtomatik qəbul edilmir." "Sifarişlər və məbləğlər dəyişmir; yalnız malın
  kimliyi və variant əlaqəsi qurulur."

Recorded evidence that binds the suggestions (`docs/business-decisions.md`):

- **TR-04**: similarity "may later suggest candidates to a human. It must never become an automatic merge rule."
- **Explicit "Do Not Merge" Rules** (NM-01 … NM-17): "A future suggestion engine must not propose them."
- **TR-03 / UR-10**: colour lives inside product names and is never stripped out automatically. 13.1 now answers how
  such names relate (a separate variant of one base product); nothing is renamed.
- **DB-03**: names differing only by a double space or a comma already normalise to one key — they are not candidates.

Why the task is split: the brief is a data model, a suggestion rule, an authority rule, a real-database migration, a
new screen, a change to every analytics read path and a new kind of line in the cause decomposition. Task 10 (one
session, 29 files) was the size limit. The seams are the seams of the work:

- 13a: the decision record and everything that writes it — the only part that touches the real database.
- 13b: what an approved **spelling** match means to the analytics (read side), and the Products page.
- 13c: what an approved **variant** link means to "Niyə dəyişib?" (the decomposition and its screens).

## 2. Verified current behaviour (repository at `d4a0ce4`)

### 2.1 The catalogue

- `Product` (`src/BaxOrders.Domain/Catalog/Product.cs`) is the base identity; `ProductVariant`
  (`ProductVariant.cs`) is a comparable form of it — specification, model code, order unit — keyed by
  `NormalizedVariantKey` (`ProductVariantKey.cs`), unique per product. **This "variant" is not the owner's variant.**
  Today "Sabun elano" and "Sabun elano lavanda ətirli" are two different `Product`s, each with its own
  `ProductVariant`s. Nothing relates them.
- `ProductAlias` (`ProductAlias.cs`) is an alternative spelling of a product *name*, used only by the Excel importer
  (`Imports/Matching/ImportCatalogLoader.cs:102`). It is created in import review when an operator maps a value to an
  existing product with scope `GlobalAlias` (`Imports/Review/ImportResolutionService.cs:612–708`,
  `BulkResolutionService.cs:220–291`). Those endpoints need `CanManageImports` — **Coordinator or Admin**
  (`Api/Security/SecuritySetup.cs:70`). The frontend offers "save as alias" in `MapExistingDialog.tsx:166`,
  `CreateResolutionDialog.tsx:325`, `BulkActionDialog.tsx:187`.
- `OrderRequestItem.ProductVariantId` is the only link from a line to the catalogue.
- Normalisation (`Domain/Normalization`): `TextNormalizer` folds case, Unicode form, I/İ/ı, quotes, dashes, collapses
  whitespace runs to one space and removes whitespace next to `/ \ - . , ; : ( ) [ ] + &`. It keeps one space between
  words, so "Lampa 15 W" ≠ "Lampa 15W", and keeps `/` ≠ `\`, so "3/4" ≠ "3\4". `SpecificationNormalizer` is the same
  plus `x` for multiplication signs. `ModelCodeNormalizer` removes every space.

### 2.2 The analytics are keyed by the variant

`VariantPeriodSnapshot` (`Application/Analytics/VariantPeriodSnapshot.cs`) is built per `(OrderRequestId,
ProductVariantId)` in three places — `ManagementDashboardQueries.cs:413`, `OrderDecisionContextQueries.cs:303`,
`OrderAnalyticsQueries.cs:388` — and the product history is `OrderAnalyticsQueries.GetTrendAsync` (`:190`, filtered
on `ProductVariantId`). `CauseDecomposition` states "Identity is the variant. Never the product". None of this changes
in 13a. It is 13b's and 13c's.

### 2.3 Roles and authority

- `BaxOrdersRoles` (`Application/Abstractions/ICurrentUserContext.cs:31`): `Coordinator`, `Manager` (Rəhbər),
  `Admin`. **There is no data-manager role.** One role per user.
- The pattern for a capability that belongs to a role is `ApprovalAuthority` (`:62`): one static rule, used by the
  endpoint policy (`SecuritySetup.cs:76`), the service (`OrderWorkflowService.cs:98`) and `/auth/me`
  (`AuthController.cs:169`).
- `CanManageCatalog` (Coordinator or Admin) guards the product-category decisions.

### 2.4 The Products page

`frontend/bax-orders-web/src/pages/ProductsPage.tsx` is a `PlannedFeature` ("Bu bölmə hələ hazırlanır"-style) listing
"Məhsullar və onların variantları", "Excel yazılışları üçün alternativ adlar", "Məhsulun qiymət və miqdar
tarixçəsi". **Unchanged in 13a** — 13b fills it.

### 2.5 Schema and migrations

- EF Core 10 / Npgsql 10. Latest migration `20260923124150_AddOrderItemPricingDecisions`. Enums are stored as strings
  (e.g. `PreviousMode character varying(30)`), actors as `ActorUserId uuid` + `ActorDisplayName varchar(200)`.
- `tests/BaxOrders.UnitTests/Persistence/DbModelTests.cs:29` fails when the model differs from the snapshot.
- The integration fixtures migrate a fresh database (`PostgresDatabaseFixture.cs:57`, `IsolatedDatabase.cs:40`).
- In Development the API applies pending migrations at start-up (`Program.cs:64`, `appsettings.Development.json`).
- **`dotnet ef` is denied to every role** (`run-agent.ps1:117`). The migration, its designer file and the snapshot
  change are written by hand (§4.2).
- The model for a real-data tool is `tools/BaxOrders.CatalogueMigration` (Task 3): `Program.cs` builds the
  application's own services; `Backup.cs` (pg_dump custom format, connection string from the API's user secrets
  `9009c03b-5170-410c-aa43-9cd30c88c6ae`); `Apply.cs:49–59` refuses without today's backup and a recorded baseline;
  `Invariants.cs` captures the figures through the application's queries and hashes HD-002's rows.

## 3. Scope — where each brief line lands

| Brief line | Part |
|---|---|
| "Sistem ehtimal olunan uyğunluqları təklif edir. İki növ təklif var" — **Yazılış fərqi** (boşluq, "15 W"/"15W", "3/4"/"3\4") and **Variant fərqi** ("Sabun elano"/"Sabun elano lavanda ətirli") | **13a** §4.4 (the rule and the API); 13b shows them |
| Yazılış fərqi: "Təsdiqdən sonra bir mal sayılır" | 13a stores it (§4.1); **13b** makes the analytics count one |
| Variant fərqi: "eyni əsas məhsulun ayrı variantları kimi bağlanır, bir mala birləşmir" | **13a** §4.1 (a link, never a merge); 13b shows it; 13c uses it |
| "Hər təklifi yalnız admin və ya data idarəçisi təsdiqləyir və ya rədd edir; təsdiqlənməyən heç nə dəyişmir." (13.2) | **13a** §4.3, §4.5, §4.6; 13b's buttons follow the same flag |
| "Yazılış fərqi təsdiqlənəndən sonra malın tarixçəsi, «Əsas dəyişikliklər» və «Niyə dəyişib?» onu bir mal kimi görür." | **13b** |
| "Təsdiqlənmiş variant keçidi «Niyə dəyişib?»də bir sətirdə «variant dəyişib» kimi göstərilir …" (13.1a) | **13c** |
| "Heç bir təsdiqdən sonra məbləğlər dəyişmir." | **13a** (`--verify`, §4.7; nothing reads the decisions yet), 13b and 13c (their tests) |
| "Səhv təsdiq geri alına bilir." | **13a** §4.5 (undo in the record and the API); 13b's button; 13b/13c's analytics follow it |
| 13.2 "… alternativ adları yalnız admin və ya data idarəçisi təsdiqləyir" | **13a** §4.6 (the import review's product alias) |
| Mütləq qorunmalı: Task 1/1b/1c figures | **13a** `--verify` (§4.7); 13b, 13c |
| Mütləq qorunmalı: Task 2 price states after approval | 13a changes no line; **13b** (folding keeps the counts), **13c** |
| Acceptance 1 — "Sistem «Sabun elano lavanda ətirli»ni «Sabun elano»nun variantı kimi təklif edir, özü heç nə etmir." | **13a** criteria 2, 3 (API and the real data); 13b shows it on the page |
| Acceptance 2 — "Admin təsdiqləyəndən sonra ikisi eyni əsas məhsulun ayrı variantları kimi görünür, bir mala birləşmir." | **13a** criterion 5 (the record); **13b** (the page) |
| Acceptance 3 — Heydər Əliyev, Sentyabr: one "variant dəyişib" line at 0.00 ₼; "Yeni" and "yazılmayan" each −750.00 ₼ | **13c** |
| Acceptance 4 — "Təsdiq olunana qədər iki mal indiki kimi ayrı sətirlərdə qalır." | **13a** criterion 9 (nothing reads suggestions); 13b, 13c |
| Acceptance 5 — "«15 W» / «15W» … admin təsdiqləyəndən sonra malın tarixçəsində bir mal görürəm." | **13b** |
| Acceptance 6 — "Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm." | **13a** criterion 6 (server); 13b (no button) |
| Acceptance 7 — totals unchanged (Heydər Əliyev, Keçən ay: +23,852.70) | **13a** criterion 10 (`--verify`); 13b, 13c |
| Acceptance 8 — "Səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır." | **13a** criterion 7 (the record and suggestions); 13b, 13c (the screens) |
| Out of scope: menu visibility of "Məhsullar" (Task 14); words (Task 5) | — |

**Deliberately left to 13b:** the Products page; the spelling match's effect on the product history, "Əsas
dəyişikliklər", "Niyə dəyişib?", the dashboard and every product count; acceptance 5; the visible half of acceptance 1,
2, 6 and 8. **Deliberately left to 13c:** 13.1a and acceptance 3.

## 4. Required behaviour

### 4.1 The decision record — domain

New `src/BaxOrders.Domain/Catalog/ProductMatchDecision.cs` (names below are the Planner's; the Coder may rename, not
change the meaning):

```
public enum ProductMatchKind   { SameItem = 1, Variant = 2 }   // "Yazılış fərqi", "Variant fərqi"
public enum ProductMatchOutcome { Approved = 1, Rejected = 2 }
```

One row is one person's decision about one pair. It is never deleted or overwritten; **undo** fills its undo columns.

| Property | Meaning |
|---|---|
| `Id` | |
| `Kind` | `SameItem` or `Variant` |
| `Outcome` | `Approved` or `Rejected` |
| `SourceVariantId`, `TargetVariantId` | **SameItem only** (null for Variant). The source variant's lines are, once approved, the same comparable item as the target's. The target is the one whose name is kept. |
| `SourceProductId`, `TargetProductId` | Always set. For SameItem, the two variants' products (they may be the same product). For Variant: the **variant product** ("Sabun elano lavanda ətirli") and its **base product** ("Sabun elano"). |
| `VariantLabel` | **Variant + Approved only**: the variant's short name under its base ("lavanda ətirli"), 1–100 characters, trimmed. |
| `Reason` | optional, ≤ 500 |
| `DecidedByUserId`, `DecidedByDisplayName`, `DecidedAtUtc` | the actor, as `ProductCategoryDecision` records one (snapshot of the name; UTC) |
| `UndoneByUserId`, `UndoneByDisplayName`, `UndoneAtUtc`, `UndoReason` | null until undone; the first three are all null or all set |

Factory methods, each taking a `WorkflowActor` that must have a user id (as `ProductCategoryDecision` does):
`ApproveSameItem(ProductVariant source, ProductVariant target, …)`, `ApproveVariant(Product variant, Product base,
string label, …)`, `Reject(kind, …)`, and `Undo(actor, reason, utcNow)`. Domain guards (`DomainException`):

- source ≠ target (variant for SameItem, product for Variant);
- SameItem: both variants have the same `OrderUnitId` (both null is the same) — a spelling match adds quantities
  together, and 30 pieces plus 30 packs is not 60 of anything;
- Variant + Approved: a label is required;
- `Undo` on a row already undone throws.

**A decision never touches anything else.** It does not rename, deactivate, re-point or merge a product, variant,
alias or order line. That is what makes undo exact: the row is the whole change.

"Live" below means `UndoneAtUtc is null`.

### 4.2 Schema — `ProductMatchDecisions`, written by hand

- `IBaxOrdersDbContext` / `BaxOrdersDbContext` gain `DbSet<ProductMatchDecision> ProductMatchDecisions`, with a
  configuration class beside `ProductCategoryDecisionConfiguration.cs`.
- Columns: enums as strings (`character varying(20)`); FKs to `ProductVariants` and `Products`, `ON DELETE RESTRICT`;
  `VariantLabel varchar(100)`, `Reason`/`UndoReason varchar(500)`, display names `varchar(200)` (the existing actor
  length), timestamps `timestamp with time zone`.
- Check constraints: Kind SameItem ⇔ both variant ids set; Variant ⇒ both variant ids null; `VariantLabel` is null
  unless Kind = Variant and Outcome = Approved, and set when it is; source ≠ target; the undo actor/time columns are
  all null or all set.
- Partial unique indexes (all `WHERE "UndoneAtUtc" IS NULL`):
  - SameItem: `(SourceVariantId, TargetVariantId)`;
  - Variant: `(SourceProductId, TargetProductId)`;
  - SameItem **and** Approved: `(SourceVariantId)` — a variant is folded into at most one other;
  - Variant **and** Approved: `(SourceProductId)` — a product is a variant of at most one base.
  Plus plain indexes on `TargetVariantId` and `TargetProductId`.
- The migration: `src/BaxOrders.Infrastructure/Persistence/Migrations/<yyyyMMddHHmmss>_AddProductMatchDecisions.cs`
  and `.Designer.cs`, with an id that sorts after `20260923124150`. Written by hand, in the exact shape of
  `20260923124150_AddOrderItemPricingDecisions.*`. `BaxOrdersDbContextModelSnapshot.cs` is updated by hand to the
  model EF would generate; the designer's `BuildTargetModel` is the updated snapshot's body. `Down` drops the table.
- Proof it is right: `DbModelTests.Model_matches_the_latest_migration` passes, and every integration fixture migrates a
  fresh database through it.

### 4.3 Authority — one rule

In `Application/Abstractions/ICurrentUserContext.cs`, beside `ApprovalAuthority`:

```
/// Who may approve or reject a product match and undo one, and save an alternative product name (13.2).
public static class ProductMatchAuthority
{
    public static bool IsHeldBy(string? role) => role is BaxOrdersRoles.Admin;
}
```

- A new policy `BaxOrdersPolicies.CanDecideProductMatches`, built in `SecuritySetup.cs` from `ProductMatchAuthority`
  the way `CanDecideOrders` is built from `ApprovalAuthority` (an assertion over `BaxOrdersRoles.All`).
- The service checks it too (`ForbiddenException`), whatever the endpoint said — as `OrderWorkflowService` does.
- `/auth/me`: `CurrentUserDto` gains `CanDecideProductMatches` (`AuthController.cs:165–172`); the frontend type
  `api/auth.ts` and its anonymous default gain `canDecideProductMatches` (false); every test fixture that builds a user
  object is updated.
- The Rəhbər (`Manager`) and the Koordinator do **not** hold it. See Assumption 1 for why the Koordinator is not taken
  to be the "data idarəçisi".

### 4.4 Suggestions — a deterministic rule, never fuzzy, never applied

New `src/BaxOrders.Domain/Normalization/SpellingKey.cs`:

```
SpellingKey.Of(text)          = TextNormalizer.Normalize(text) with '\' → '/' and every space removed
SpellingKey.OfSpecification   = SpecificationNormalizer.Normalize(value) with '\' → '/' and every space removed
SpellingKey.OfModelCode       = ModelCodeNormalizer.Normalize(value) with '\' → '/'
```

Nothing else is folded: no digit, letter, word order, suffix or number is touched. "1,5" ≠ "1.5" stays true.

The suggestion engine is a **pure** function (`Application/Catalog/ProductMatches/ProductMatchSuggestions.cs`, no
database) over the catalogue facts a query hands it, so every rule is unit-tested. Only **variants that have at least
one order line** in the highest version of some location and month take part (the analytics policy — the version every
screen reads); a product takes part when at least one of its variants does.

**A. Yazılış fərqi (`SameItem`) — between two variants.** Variants `a` and `b` are a candidate when all of these hold:

1. `SpellingKey.Of(product name)` is equal;
2. `SpellingKey.OfSpecification(SpecificationValue)` is equal, the specification unit code is equal (exact), the
   descriptor is equal (exact), `SpellingKey.OfModelCode(ModelCode)` is equal, the order unit code is equal (exact);
3. and they are **not** already the same strict identity (same product and same `NormalizedVariantKey` — impossible,
   they would be one variant) — i.e. the difference is only spaces and/or `/` vs `\`, in the name, the specification or
   the model code.

Candidates are grouped by that loose identity. In each group the **proposed target** is: the target of a live
approved SameItem decision in the group if there is one; otherwise the variant with the most order lines, then the
lowest id. Every other member that is not already the source of a live approved SameItem decision is suggested as
`member → target`. The suggestion says what differs: `Whitespace`, `Slash`, or `WhitespaceAndSlash`.

**B. Variant fərqi (`Variant`) — between two products.** Product `v` is a candidate variant of product `b` when `b`'s
`NormalizedName` is a **whole-word prefix** of `v`'s: `v.NormalizedName` starts with it, and the next character is a
space or one of `/ \ - . , ; : ( ) [ ] + &`, with at least one letter or digit after it. The proposed base is the
**shortest** such `b`. The proposed label is `v`'s display name with the leading part that normalises to `b`'s name
removed, then trimmed of spaces and leading punctuation — "Sabun elano lavanda ətirli" under "Sabun elano" →
"lavanda ətirli". No variant suggestion is made when `v` is already a live-approved variant of any product, when `b`
is itself a live-approved variant, or when `v` is a live-approved base of other products.

**Both kinds:**

- A pair with a **live** decision of the same kind, approved or rejected, is not suggested. SameItem pairs are
  compared **unordered** — a rejected `a → b` also silences `b → a`.
- **Do-not-merge pairs are never suggested.** Encode, as a list in code with a comment naming each rule, every pair
  from `docs/business-decisions.md` "Explicit «Do Not Merge» Rules" whose two product names are written out there
  (at least NM-02 `Metlaq Boz` / `Metlaq boz rəng`, NM-06 `Leska 3mm` / `Leska 2,4mm`, NM-08 `Kist 2` / `Kist 3`, NM-09
  `1 gözlü troynik` / `3 gözlü troynik`, NM-10 `Əl arabası` / `Əl arabası qaynaqlı`, NM-11 `Mop eko` / `Mop əskisi`,
  NM-12 `Laqonda nasadkası şkurka üçün` / `Laqonda nasadkası üçün şkurka`, NM-16 `FAB` / `Şampun əl üçün D2`), compared
  by `TextNormalizer`, in either order, for either kind. The report lists each NM rule and whether it is encoded or
  why the rule cannot produce it anyway (NM-01 and NM-07 differ by model code, which rule A requires equal; the rest
  name people, companies or locations).
- **Nothing is ever applied.** Computing suggestions writes nothing: no decision, no alias, no product change. No job,
  import, tool or start-up step creates a decision. The only writer of `ProductMatchDecisions` is §4.5, called by a
  person holding §4.3.

Each suggestion carries, for both sides: product id and name, variant id and its specification / model / order unit
(SameItem), how many order lines, how many locations, the first and last month; and for Variant the proposed label.

### 4.5 API — `Application/Catalog/ProductMatches/`, `Api/Controllers/ProductMatchesController.cs`

Route prefix `ApiRoutes.V1 + "/catalog/product-matches"`. Reading is open to everybody signed in, like the category
screen (`ProductCategoriesController`); who sees the menu is Task 14's. Writing needs `CanDecideProductMatches`.

| Method | Path | What |
|---|---|---|
| GET | `/suggestions?kind=SameItem\|Variant&search=&page=&pageSize=` | Current suggestions of one kind, plus both kinds' totals. `pageSize` default 50, max 200. SameItem by line count (desc), then name; Variant by base name, then variant name — names in Azerbaijani collation (`AzerbaijaniCollation`). `search` matches either side's name through `TextNormalizer`. |
| GET | `/decisions?kind=&outcome=&includeUndone=&page=&pageSize=` | Decisions, newest first, with both sides' names, the label, who and when, and the undo if any. |
| POST | `/approve` `{ kind, sourceId, targetId, variantLabel?, reason? }` | SameItem: ids are variant ids. Variant: ids are product ids (source = the variant product, target = the base). |
| POST | `/reject` `{ kind, sourceId, targetId, reason? }` | |
| POST | `/decisions/{id}/undo` `{ reason? }` | |

Rules the service enforces (server-side, whatever the screen offered):

- **Only a current suggestion can be approved or rejected.** The service recomputes the suggestions and refuses (422,
  `ValidationException`) a pair that is not one. For SameItem the admin may approve either direction of a suggested
  pair (choosing which name is kept); for Variant the direction is the suggestion's. This is the guard against a merge
  nobody was shown.
- SameItem approval: the source is not the source of a live approved SameItem, and not the target of one (no chains);
  the target is not the source of one. Variant approval: the source is not a live-approved variant, and not a
  live-approved base; the target is not a live-approved variant. Otherwise 422 with a sentence saying which.
- `variantLabel` for Variant defaults to the suggestion's proposed label; if given it is trimmed and 1–100 characters.
- Undo: only a live decision (else 409 `ConflictException`). Undoing an approval makes its pair a suggestion again,
  provided the rule of §4.4 still finds it; undoing a rejection does the same. Nothing else changes.
- Approve, reject and undo each take one application-wide Postgres advisory **transaction** lock
  (`IProductMatchLock`, implemented beside `PostgresImportBatchLock` / `PostgresOrderRequestLock`) before checking and
  writing, so two admins cannot build a chain between them. A unique-index violation is turned into a 409.
- Every write is one `SaveChangesAsync`. Nothing but the one decision row is written.

The service is registered in `Application/DependencyInjection.cs`; the lock in `Infrastructure/DependencyInjection.cs`.

### 4.6 Alternative names in import review (13.2)

A `GlobalAlias` scope on a **Product** resolution saves an alternative product name. 13.2 gives that to the admin (or
data manager) only; today the Koordinator can do it.

- `ImportResolutionService` (map to existing and create new, `Kind == Product`, `Scope == GlobalAlias`) and
  `BulkResolutionService` / `BulkResolutionPlanner` (any Product item with `GlobalAlias`) refuse with
  `ForbiddenException` (403) unless `ProductMatchAuthority.IsHeldBy(currentUser.Role)`. Inject `ICurrentUserContext`
  where it is not yet injected. The bulk request is refused as a whole, before anything is written.
- `BatchOnly` product resolutions, and every other kind's `GlobalAlias` (location, supplier, responsible person,
  units), are unchanged for the Koordinator.
- Frontend: in `MapExistingDialog.tsx`, `CreateResolutionDialog.tsx` and `BulkActionDialog.tsx` the "save as alias"
  checkbox is not offered for `kind === 'Product'` unless `user.canDecideProductMatches`. Nothing else in those dialogs
  changes.
- Existing product aliases are kept exactly as they are. No alias is created, moved or removed by this task.

### 4.7 The migration tool — `tools/BaxOrders.ProductMatchMigration`

Modelled on `tools/BaxOrders.CatalogueMigration`: the application's own services (`Program.Build`), the same
connection-string lookup (`AddUserSecrets("9009c03b-5170-410c-aa43-9cd30c88c6ae")`, then the environment), the same
backup directory and `pg_dump` custom-format backup, the same "no SQL can be handed to it" design. Registered in
`BaxOrders.slnx` under `/tools/`. Copy what it needs; do not reference the Task 3 tool's project.

The five commands, run in this order and no other:

```
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --inspect
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --dry-run
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --backup
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --apply
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --verify
```

- **`--inspect`** (read-only). Prints: the applied and pending migrations; whether `ProductMatchDecisions` exists; the
  catalogue counts (products, variants, variants with lines, aliases); **every current suggestion of both kinds**, as
  the engine of §4.4 computes it against the real data (both names, the differing part or the label, line counts) —
  it may read `ProductMatchDecisions` only if the table exists; the SameItem count split into "name differs" and
  "specification / model differs", for comparison with the brief's "69 halda" (which counted Excel rows, so the two
  numbers need not match); for **Heydər Əliyev Mərkəzi**, August and September 2026, every line of the products whose
  name starts with "Sabun elano" (quantity, unit, price, amount), and whether the pair "Sabun elano" → "Sabun elano
  lavanda ətirli" is among the Variant suggestions; and Heydər Əliyev Mərkəzi's September 2026 difference on the
  "Keçən ay" basis, read through `OrderDecisionContextQueries` (the brief says +23,852.70).
- **`--dry-run`** (read-only). Prints the plan: the pending migrations — they must be **exactly** the one of §4.2 —
  and the SQL `IMigrator.GenerateScript` produces for it. STOP conditions (exit non-zero, nothing changes): any other
  pending migration; a migration applied to the database that the code does not know; `ProductMatchDecisions` already
  existing while its migration is pending.
- **`--backup`**. `pg_dump -Fc` of the database, into the backup directory, file name carrying the date and "task13a";
  then records the baseline of §4.8 next to it. Prints the path.
- **`--apply`**. Refuses without a backup taken today and a recorded baseline (as `Apply.cs:49–59`). Re-runs the
  dry-run's STOP checks. Applies the one pending migration through `IMigrator.MigrateAsync(<that migration>)` — one
  transaction, as Npgsql runs a migration. Afterwards: no pending migration; the table exists and holds **zero** rows.
  If either is false it reports and exits non-zero. A second `--apply` finds nothing pending, changes nothing, and
  says so.
- **`--verify`** (read-only). Recaptures §4.8 and compares it with the baseline key by key; prints every difference;
  exits non-zero on any. Also checks: no pending migration; `ProductMatchDecisions` exists and has zero rows.

The tool never writes a decision, an alias, a product, a variant or a line, and never runs anything but the one
migration. It does not stop, start or restart the API.

### 4.8 The figures `--verify` must prove unchanged

Captured through the application's own queries, exactly as `CatalogueMigration/Invariants.cs` does, keyed by location
**code**; hashed with SHA-256 where a list is involved:

1. `OrderRequests` count; `OrderRequestItems` count; a hash over every line (`Id`, `OrderRequestId`,
   `ProductVariantId`, `Quantity`, `UnitPrice`, `PricingMode`, `SupplierId`, `OriginalProductName`).
2. The catalogue: `Products` count and hash (`Id`, `Code`, `Name`, `NormalizedName`, `CategoryId`, `IsActive`);
   `ProductVariants` count and hash (`Id`, `ProductId`, `NormalizedVariantKey`, `OrderUnitId`, `IsActive`);
   `ProductAliases` count and hash (`Id`, `ProductId`, `NormalizedAlias`).
3. Qiymət təsnifatı: `pricing.total`, `unresolved`, `missingRequiredPrice`, `internalFreeSupply`; the
   `OrderItemPricingDecisions` count and both HD-002 hashes (`Invariants.cs:84–89`) — **the 94 rows unchanged**.
4. The dashboard: every month × the four standard bases — summary current, compared current, baseline, delta,
   percent, and every object's current, baseline and delta.
5. The monthly report: every year — every object's known amount per month, and the year totals.
6. **Heydər Əliyev Mərkəzi, September 2026, "Keçən ay"**: the order page's primary delta (brief: +23,852.70). It must
   equal the baseline. If the live figure is not 23,852.70 at `--inspect`, report the live figure and why it differs
   if the data says; do not adjust anything to reach it.

## 5. Files — summary for the Coder

- Domain: `Catalog/ProductMatchDecision.cs` (entity + the two enums), `Normalization/SpellingKey.cs`.
- Application: `Abstractions/ICurrentUserContext.cs` (`ProductMatchAuthority`, the policy name),
  `Abstractions/IBaxOrdersDbContext.cs`, `Abstractions/IProductMatchLock.cs` (or beside the other lock interfaces),
  `Catalog/ProductMatches/` (DTOs, `ProductMatchSuggestions` — pure, `ProductMatchQueries`, `ProductMatchService`,
  `DoNotMergePairs`), `Users/UserDtos.cs`, `Imports/Review/ImportResolutionService.cs`, `BulkResolutionService.cs`
  and/or `BulkResolutionPlanner.cs`, `DependencyInjection.cs`.
- Infrastructure: `Persistence/BaxOrdersDbContext.cs`, `Configurations/ProductMatchDecisionConfiguration.cs`,
  `Migrations/<id>_AddProductMatchDecisions.cs` + `.Designer.cs`, `BaxOrdersDbContextModelSnapshot.cs`, the lock,
  `DependencyInjection.cs`.
- Api: `Controllers/ProductMatchesController.cs`, `Security/SecuritySetup.cs`, `Controllers/AuthController.cs`.
- Tool: `tools/BaxOrders.ProductMatchMigration/*`, `BaxOrders.slnx`.
- Frontend: `api/auth.ts` (+ fixtures), `api/productMatches.ts` (types and calls, for 13b — no screen uses it yet; keep
  it small), the three import dialogs.
- Tests: §9.

## 6. Safety and STOP conditions

- **The real database is reached only through `tools/BaxOrders.ProductMatchMigration`**, with the five commands, in
  order. `psql` stays denied. **Do not run any other tool** — not `BaxOrders.CatalogueMigration`, not
  `BaxOrders.ApprovalSandbox`, not `BaxOrders.DataTransfer`. Do not run the API against the real database, and do not
  stop or restart the running API (it keeps working on the old code; an added table does not disturb it).
- **No business row changes.** If anything in this task would create, change or delete an order, line, price, pricing
  classification, product, variant, alias, location or user in the real database, STOP. HD-002's 94 rows stay
  untouched (§4.8 item 3 proves it).
- **Nothing approves a match but a person holding §4.3, through §4.5.** The Coder does not approve, reject or undo
  anything in the real database — not through the API, not through the tool. Every decision in a test lives in a test
  database.
- **No likeness rule beyond §4.4.** No similarity score, edit distance, token-set or word-order matching, no stemming,
  no colour or size parsing. If the rule of §4.4 does not find the Sabun elano pair on the real data, do **not** widen
  it: report the two products' exact stored names and normalised forms and why the rule misses them, and finish the
  rest.
- `--dry-run` reporting a STOP condition ends the sequence there: report it, do not apply.
- `--verify` reporting any difference: report every key; do not "fix" the data. The backup's path is in the report so
  the operator can restore it.
- Do not rework Tasks 1–12. A defect found there goes into the report.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 7. Invariants — MUST NOT CHANGE

- Every figure of §4.8, before and after the tool's apply (the tool proves it) and before and after any approval,
  rejection or undo in the tests (the tests prove it — nothing reads the decisions yet).
- Every screen and every API response that exists at `d4a0ce4`, apart from `/auth/me`'s new flag and the import
  dialogs' product checkbox for a non-admin.
- The importer's matching: the same workbook maps to the same products and variants (no alias is added or removed).
- Task 2's price states, Task 4's approval authority (`ApprovalAuthority` unchanged; the Rəhbər still decides orders,
  and only orders), Task 10's `StateOf`, Task 12's layouts.

## 8. Acceptance criteria

1. **The record.** `ProductMatchDecisions` exists with the columns, checks and partial unique indexes of §4.2; the
   migration applies to a fresh database; `DbModelTests` passes; `Down` drops it.
2. **Suggestions, by the rule** (acceptance 1). On a fixture: "Sabun elano" / "Sabun elano lavanda ətirli" is a
   Variant suggestion with label "lavanda ətirli"; "Lampa 15 W" / "Lampa 15W" and "Kaplin 3/4" / "Kaplin 3\4" (same
   unit) are SameItem suggestions; a specification "15 W" / "15W" inside one product is one; a pair differing in
   order unit, a pair of which one variant has no line, a pair already decided (either order for SameItem) and every
   encoded NM pair are not. `SpellingKey` changes nothing but spaces and `\`.
3. **The real data** (acceptance 1). `--inspect`'s output, pasted in the report, lists the suggestions of both kinds
   and says whether "Sabun elano" → "Sabun elano lavanda ətirli" is among them, with the Heydər Əliyev lines behind
   it.
4. **Nothing applies itself.** Reading suggestions, twice, writes nothing: the counts and hashes of decisions,
   products, variants, aliases and lines are the same before and after.
5. **Approve** (acceptance 2). As Admin, approving the Sabun pair writes one Variant row with the label, the actor and
   the time; the two products stay two products with their own variants and lines; the pair leaves the suggestions.
   Approving a SameItem pair in the reverse direction keeps the other name. A non-suggested pair, a chain, a second
   base, a variant-of-a-variant, or a SameItem pair with different order units → 422 / domain refusal.
6. **Who** (acceptance 6, 13.2). Approve, reject and undo as Rəhbər → 403; as Koordinator → 403; anonymous → 401.
   `/auth/me` says `canDecideProductMatches` true for Admin only.
7. **Undo** (acceptance 8). Undoing the Sabun approval fills the undo columns with the actor and time, keeps the row,
   and the pair is a suggestion again exactly as before; a second undo → 409. Rejecting and undoing the rejection
   behaves the same.
8. **Alternative names** (13.2). A Koordinator's Product `GlobalAlias` resolution — single, create-new and bulk — is
   403 and writes nothing; the Admin's succeeds as today; the Koordinator's `BatchOnly` product resolution and
   `GlobalAlias` for a location, supplier, person or unit succeed as today. The three dialogs do not offer the
   product checkbox without the flag.
9. **Separate until approved** (acceptance 4). Every analytics endpoint returns exactly what it returned at `d4a0ce4`
   for the same data, with or without decisions in the table (13a changes no read path).
10. **The real database** (acceptance 7). The five commands ran in order; the report has the backup path, the
    dry-run's SQL, the apply's result (one migration, zero rows), a second `--apply` doing nothing, and `--verify`
    passing on every key of §4.8, with Heydər Əliyev's September "Keçən ay" figure printed.
11. **Nothing else changed.** Builds and suites green; `git status` shows only the files of §5.

## 9. Required tests

Unit (`tests/BaxOrders.UnitTests`):

- `Normalization/SpellingKeyTests.cs`: spaces, `\` vs `/`, specification and model forms; digits, letters,
  Azerbaijani letters, `1,5`/`1.5`, word order untouched.
- `Catalog/ProductMatchSuggestionsTests.cs` (the pure engine): every clause of §4.4 A and B, each with a case that
  passes and one that does not; the group target rule (live target first, then most lines, then lowest id);
  shortest-prefix base; label derivation (including a comma after the prefix); whole-word boundary ("Sabun elanox" is
  not a variant of "Sabun elano"); unordered suppression; live-decision and undone-decision behaviour; the NM list,
  one test per encoded pair.
- `Catalog/ProductMatchDecisionTests.cs`: the factories and guards of §4.1; `Undo` twice throws.
- `Persistence/DbModelTests.cs`: passes unchanged.
- Tool: the plan / STOP logic of `--dry-run` and the baseline comparison of `--verify`, as
  `tests/BaxOrders.UnitTests/CatalogueMigration/` does for Task 3.

Integration (`tests/BaxOrders.IntegrationTests`, Postgres fixture):

- `ProductMatchTests.cs`: criteria 2, 4, 5, 7 through the services on a fixture that reproduces the brief — Heydər
  Əliyev Mərkəzi, August "Sabun elano" 60 ədəd × 12.50 = 750.00, September "Sabun elano lavanda ətirli" 60 ədəd ×
  12.50 = 750.00 — plus the spelling pairs of criterion 2 and at least two NM pairs.
- `ProductMatchAuthorityEndToEndTests.cs`: criterion 6 over HTTP with real cookies (the pattern of
  `ApprovalAuthorityEndToEndTests`), and `/auth/me` per role.
- Import review: criterion 8, single and bulk, in the existing `ImportResolutionServiceTests` / `BulkResolutionTests`
  or a new file.
- Criterion 9: on the Sabun fixture, the decision context and the dashboard for Heydər Əliyev, September, every
  standard basis, are equal before an approval, after it and after its undo.
- The tool, following `CatalogueMigrationTests.cs`: on an isolated database, `--dry-run` reports nothing pending once
  migrated, and the invariant capture is identical when taken twice.

Frontend (vitest): the three dialogs with and without `canDecideProductMatches` for `Product` (and unchanged for
another kind); `auth` fixtures updated.

Existing tests that change deliberately — each named in the report with the brief line behind it:

- Tests where a **Koordinator** saves a Product `GlobalAlias` (13.2). Each is changed to the Admin, or to assert the
  403, not deleted.
- Fixtures typed as the current user (the new flag).

No expectation may be weakened to make a test pass.

## 10. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors. `dotnet test BaxOrders.slnx` — the baseline is 826 unit /
  706 integration; give the new counts. If the running API locks `bin`, use `--artifacts-path` into the scratchpad,
  say so, and do not stop the API.
- `npm run --prefix frontend/bax-orders-web test` (baseline 40 files / 797 tests) and `… build` — green, with counts.
- The five tool commands' output, in order, in the report (long suggestion lists may be summarised with the full list
  written to a file under the scratchpad and its path named).
- `git diff --stat` and `git status`.

## 11. Out of scope

- The Products page, and any screen that shows suggestions or decisions (13b).
- Any change to how the analytics group lines — the dashboard, the order page, the comparison endpoint, the product
  history, the monthly report (13b, 13c).
- Creating a "data idarəçisi" role, and the menu (Task 14).
- Words shown to the Rəhbər (Task 5 owns the rule; 13b and 13c add their words in `terms.ts`).
- DB-10's "same product" pairs that differ by more than spaces and slashes — they are not suggestions under §4.4; an
  admin cannot approve them in this task. Listed in the report as the natural next rule if the owner wants one.
- HD-002.

## 12. Operator notes (after review)

- The migration is already in the real database when the review starts (the Coder applied it). Restarting the API on
  the new commit applies nothing (no migration pending) and enables the new endpoints.
- Rollback, if the owner rejects 13a: `pg_restore` the backup the report names, then `git reset` the commit.
- No screen changes for the Rəhbər; the import dialogs lose the product alias checkbox for the Koordinator.

## 13. Where the brief lands in 13a

| Brief | Here |
|---|---|
| Two kinds of suggestion, the system proposes | §4.4; criteria 2, 3 |
| The system does nothing itself; nothing unapproved changes anything | §4.4 "Nothing is ever applied", §6; criteria 4, 9 |
| Only admin / data manager approves or rejects (13.2) | §4.3, §4.5; criterion 6 |
| Alternative names only by admin / data manager (13.2) | §4.6; criterion 8 |
| Variant: separate variants, not one product (13.1) | §4.1 (a link, never a merge); criterion 5 |
| A wrong approval can be undone | §4.1, §4.5; criterion 7 |
| Orders and amounts never change | §4.1, §4.8; criteria 9, 10 |
| Task 1/1b/1c figures, Task 2 price states | §4.8, §7; criterion 10 |
| Acceptance 1, 2, 4, 6, 7, 8 | criteria 2–3, 5, 9, 6, 10, 7 (the server and data halves; 13b shows them) |
| Acceptance 3, 5; "bir mal kimi görür"; 13.1a | 13b, 13c |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. **"Admin və ya data idarəçisi" is carried as Admin only.** The repository has no data-manager role (§2.3), and
   deciding that the Koordinator *is* the data manager would be a business fact nobody stated. Admin-only satisfies
   "yalnız" exactly. `ProductMatchAuthority` is one line, so naming a data-manager role later changes one line.
2. A decision is a **separate record read by the analytics**, not a change to the catalogue or the lines: nothing is
   re-pointed, renamed, deactivated or merged. That is how "Sifarişlər dəyişmir" and "geri alına bilir" hold exactly —
   undo is one timestamp.
3. A **spelling** match is between two *variants* (it adds their quantities, so the order unit must agree); a
   **variant** link is between two *products* (a base and its scent / colour / size). The first also covers a spelling
   difference inside the specification or model code, which is where "15 W" / "15W" can live.
4. "Yazılış fərqi" is exactly the brief's list — spaces, and `/` vs `\` — found by one normalisation step. Nothing
   wider (no similarity, no word order), so TR-04 and 13.1 hold by construction.
5. "Variant fərqi" is a whole-word name prefix: the variant's name is the base's name plus more words. It finds the
   brief's pair and the colour / scent / size names TR-03 lists; the admin rejects what is not a variant.
6. Only products and variants that appear in an order line are suggested; the catalogue holds names that were never
   ordered, and a suggestion about them changes nothing a screen shows.
7. Only a pair the rule currently suggests can be approved or rejected; the admin chooses which spelling is kept for a
   spelling match, not the kind of match.
8. An approval does not add a `ProductAlias`: a second active spelling in the importer's name index would make both
   names ambiguous and stop the next import. The two spellings keep importing as today, and the match folds them.
9. The import review's "save as alias" for **products** is restricted to the same authority, because it is the
   existing way an alternative product name is approved (13.2). Other kinds are untouched.
10. The schema goes into the real database through the tool with a backup before it, not through the API's start-up
    migration, so the §7 protections apply to it.
11. The Rəhbər can read suggestions and decisions through the API (reading the catalogue is open today); whether the
    menu shows them is Task 14's.
12. The brief is split into 13a / 13b / 13c at the seams of §1; the queue order is unchanged (13 → 14 → 16 → 15).

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (`d4a0ce4`), `git status --short`, `git diff --stat`.
1. Qərar qeydi — the entity, the columns, checks and indexes; the migration's id; how the snapshot and designer were
   written by hand and how that is proven.
2. Səlahiyyət — `ProductMatchAuthority`, the policy, the service check, `/auth/me`; who holds it and why not the
   Koordinator.
3. Təkliflər — `SpellingKey`; rule A and rule B, clause by clause; the NM list, rule by rule (encoded, or why not
   needed); "nothing applies itself".
4. API — the endpoints; each refusal with its status; the lock.
5. Alternativ adlar — the import review change, backend and the three dialogs.
6. Real baza — the five commands' output in order: inspect (with the suggestion counts, the "69" comparison, the
   Sabun elano lines and whether the pair is suggested, Heydər Əliyev's September figure), dry-run (the SQL), backup
   (the path), apply (and the second apply), verify (every key equal).
7. Testlər — new tests; deliberately changed tests, each with the brief line behind it; counts; builds.
8. Toxunulmayanlar — no business row, no alias, no analytics read path changed; HD-002; Tasks 1–12.
9. 13b və 13c üçün qeydlər — the suggestion counts on the real data, anything the next parts must know (for example
   variants whose products are in a SameItem pair and also a Variant pair), and defects found elsewhere.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
