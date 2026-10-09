# TASK 13b — YAZILIŞ UYĞUNLUĞU ANALİTİKADA BİR MAL; MƏHSULLAR SƏHİFƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-13.md`. This is the owner's settled requirement, shared by 13a, 13b and 13c. It decides
*what* and *why*; this file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **13b of three.** 13a (accepted, `15398eb`) built the decision record, the suggestions, the approve / reject /
undo API with its authority, and put the empty `ProductMatchDecisions` table into the real database. **13b** makes a
live approved **spelling** match (`ProductMatchKind.SameItem`) count as one product in every analytics read path, and
fills the Products page. **13c** shows an approved **variant** link as one "variant dəyişib" line (13.1a). §3 lists
which brief lines each part carries; together they carry all of them.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `15398eb`.
Line numbers below are at `15398eb`.

This task **reads** the decisions 13a records. It changes no schema and no data: no migration, no tool, no row in the
real database. The real database holds zero decisions today, so nothing any screen shows there moves until an
administrator approves a spelling match.

---

## 1. Context

The brief's goal: "Eyni mal fərqli yazıldığı üçün yalançı «yeni» və «bu ay yazılmayan» dəyişikliyi yaranmasın; ətir,
rəng və ölçü kimi variantlar isə ayrı qalsın. Sistem heç vaxt öz-özünə birləşdirmə etməsin."

Owner decisions this part carries:

- **13.1** — scent, colour and size stay separate variants; no automatic blind merging. In 13b a **variant** link is
  shown on the Products page as a base with its variants. It never folds anything in the analytics.
- **13.2** — only an admin or a data manager approves. 13a made this `ProductMatchAuthority` (Admin only, 13a
  Assumption 1). 13b's buttons follow `canDecideProductMatches` and nothing else.
- "Qeyri-müəyyən uyğunluqlar heç vaxt avtomatik qəbul edilmir." "Sifarişlər və məbləğlər dəyişmir; yalnız malın
  kimliyi və variant əlaqəsi qurulur."
- The brief's own line for this part: "Yazılış fərqi təsdiqlənəndən sonra malın tarixçəsi, «Əsas dəyişikliklər» və
  «Niyə dəyişib?» onu bir mal kimi görür."

## 2. Verified current behaviour (repository at `15398eb`)

### 2.1 What 13a left

- `ProductMatchDecision` (`src/BaxOrders.Domain/Catalog/ProductMatchDecision.cs`). A live approved SameItem row has
  `SourceVariantId → TargetVariantId`. The target is the spelling that is kept. The two variants always have the same
  `OrderUnitId` (domain guard). The partial unique index `(SourceVariantId) WHERE Kind='SameItem' AND
  Outcome='Approved' AND UndoneAtUtc IS NULL` means a variant folds into at most one other. The service refuses
  chains: a source cannot be the target of another live SameItem, and a target cannot be a source. "Live" means
  `UndoneAtUtc is null`.
- Nothing reads a decision except `ProductMatchCatalog.ReadAsync`, `ProductMatchQueries` and `ProductMatchService`
  (`Application/Catalog/ProductMatches/`). No analytics path reads one yet. 13a's criterion 9 test
  (`ProductMatchTests.The_order_page_and_the_dashboard_do_not_move_when_a_match_is_approved_or_undone`, line 337)
  proves it.
- The API is `api/v1/catalog/product-matches/{suggestions,decisions,approve,reject,decisions/{id}/undo}`
  (`Api/Controllers/ProductMatchesController.cs`). Reading is open to every signed-in user. Writing needs
  `CanDecideProductMatches`. Refusals are 422 (`DomainException`), 409, 404, 403 and 401.
- The frontend types and calls are in `frontend/bax-orders-web/src/api/productMatches.ts`. No screen uses them yet.
  `/auth/me` carries `canDecideProductMatches` (`api/auth.ts:24`), read through `useAuth()`
  (`auth/AuthProvider.tsx:101`).
- On the real data (13a report §3 and §9) there is 1 SameItem suggestion («Dəmir ventil yarıdövr» `DN20 3\4` →
  `DN20 3/4`). There are 216 Variant suggestions under 89 bases, with up to 26 under one base («PPRC») and 23 under
  «Laqonda». Many of them are accessories an admin will reject. «FAB …» products are suggested as variants of «FAB»
  (NM-16), and «Rain bird sprinkler başlığı» as a variant of «Rain bird sprinkler» (NM-03, not encoded for lack of
  written names). There is **no real «15 W» / «15W» pair**, so acceptance 5 is proven on a fixture.

### 2.2 The analytics are keyed by the variant, in three identical readers

Each of these builds `Dictionary<requestId, Dictionary<variantId, VariantPeriodSnapshot>>` with the same SQL
`GroupBy(OrderRequestId, ProductVariantId)`:

- `Application/Analytics/Dashboard/ManagementDashboardQueries.cs:413` (`SnapshotsAsync`, called at `:125`). Everything
  after it (`PeriodComparison.Of`, the per-variant state counts at `:232`, `CauseLeader`, the cause product's name
  from `VariantsAsync` at `:495`) is keyed by that variant id.
- `Application/Decisions/OrderDecisionContextQueries.cs:303` (called at `:122`). It feeds the order page's
  "Niyə dəyişib?" (`DecisionDecompositionDto.Categories`), "Əsas dəyişikliklər" (`Drivers`, `Steady`), the product
  counts (`DecisionProductCountsDto`, `:284`) and the object page (which reads this same endpoint, Task 11a).
- `Application/Analytics/OrderAnalyticsQueries.cs:382` (called at `:77` by `CompareAsync`, the comparison endpoint
  that Task 11b kept as the parity tests' reference).
- The product history is `OrderAnalyticsQueries.GetTrendAsync` (`:190`). It filters the lines on
  `item.ProductVariantId == productVariantId` (`:238`, and the supplier names at `:262`). The frontend opens it from
  the order page's driver rows (`OrderDetailPage.tsx:497`, `TrendModal.tsx:86`) with the driver's
  `variant.productVariantId`.

Downstream of the snapshots, nothing needs the stored variant id itself. `PeriodComparison.GroupBaseline` /
`AverageBaseline` / `Of`, `CauseDecomposition`, `OrderAnalyticsCalculator.Compare` / `StateOf` / `Totals` and
`CauseLeader` take whatever id they are given. `CauseDecomposition.cs:138` says "**Identity is the variant.** Never
the product: 30 pieces and 30 packs … are different things". A SameItem match always joins two variants with the same
order unit, so folding one into the other keeps that rule.

### 2.3 What does not carry a product identity

- The monthly report (`Application/Reports/MonthlyReportQueries.cs`) sums lines per location and month. Its
  `ItemCount` is a line count.
- The dashboard's period list (`ManagementDashboardQueries.cs:68`), `LastOrdersBeforeAsync` (`:468`), the approval
  inbox (`ApprovalInboxQueries.cs:62`), the order list and the order's line table (`OrderRequestQueries.cs`), and the
  pricing review all count or list **lines**, not products.

Folding cannot change any of these. They stay as they are.

### 2.4 The Products page

`frontend/bax-orders-web/src/pages/ProductsPage.tsx` is a `PageHeader` with a link to `/products/categories` and a
`PlannedFeature` placeholder ("Məhsullar və onların variantları …", "Excel yazılışları üçün alternativ adlar",
"Məhsulun qiymət və miqdar tarixçəsi"). The route is `products` (`App.tsx:49`). The owner's Task 14 brief says: "Boş
(«hazırlanır») bölmə heç kimə göstərilmir. Task 13 onu məzmunla dolduranda admin görür."

### 2.5 Words and units

Terms shared by screens live in `frontend/bax-orders-web/src/terminology/terms.ts`. Units are shown through `unitWord`
(`terminology/units.ts:34`), never as a bare code after a number. The old-terms sweep is
`src/test/oldTerms.ts` / `findOldTerms`. Variant descriptions for analytics rows go through `describeVariant`
(`components/analytics/labels.ts:107`).

### 2.6 Test baselines (13a report §7)

936 unit / 730 integration (0 skipped). Frontend: 41 files / 806 tests. Both builds are clean.

## 3. Scope — where each brief line lands

| Brief line | Part |
|---|---|
| Two kinds of suggestion, the system proposes, "özü heç nə etmir" | 13a (rule, API); **13b** shows them (§4.6) |
| Yazılış fərqi: "Təsdiqdən sonra bir mal sayılır" | 13a stores it; **13b** §4.1–4.3 |
| Variant fərqi: "eyni əsas məhsulun ayrı variantları kimi bağlanır, bir mala birləşmir" | 13a (the link); **13b** shows it (§4.5, §4.6); 13c uses it in "Niyə dəyişib?" |
| 13.2 — only admin / data manager approves or rejects; "təsdiqlənməyən heç nə dəyişmir" | 13a (server); **13b** (buttons only with the flag, §4.6; the fold reads only live **approved** rows, §4.1) |
| "Yazılış fərqi təsdiqlənəndən sonra malın tarixçəsi, «Əsas dəyişikliklər» və «Niyə dəyişib?» onu bir mal kimi görür." | **13b** §4.2, §4.3 |
| 13.1a — the "variant dəyişib" line | **13c** |
| "Heç bir təsdiqdən sonra məbləğlər dəyişmir." | 13a (`--verify`); **13b** §4.1 (the fold only regroups) and criteria 4, 6 |
| "Səhv təsdiq geri alına bilir." | 13a (record, API); **13b** — the undo button (§4.6) and the analytics going back (criterion 5) |
| Mütləq qorunmalı: Task 1/1b/1c figures | **13b** criterion 4 (money identical with and without a fold); 13c |
| Mütləq qorunmalı: Task 2 price states after approval | **13b** criterion 6 |
| Acceptance 1 — the Sabun pair suggested, the system does nothing | 13a (server); **13b** criterion 8 (the page shows it, nothing happens until a button is pressed) |
| Acceptance 2 — after approval the two are separate variants of one base, not one product | 13a (record); **13b** criteria 7, 8 (the page shows the base with its variant; analytics keep them apart) |
| Acceptance 3 — Heydər Əliyev, Sentyabr "variant dəyişib" line at 0.00 ₼ | **13c** |
| Acceptance 4 — "Təsdiq olunana qədər iki mal indiki kimi ayrı sətirlərdə qalır." | **13b** criterion 3 (before approval, and for a rejected or undone pair, nothing folds) |
| Acceptance 5 — "«15 W» / «15W» … admin təsdiqləyəndən sonra malın tarixçəsində bir mal görürəm." | **13b** criterion 2 |
| Acceptance 6 — "Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm." | 13a (server 403); **13b** criterion 9 (no button without the flag) |
| Acceptance 7 — totals unchanged (Heydər Əliyev, Keçən ay: +23,852.70) | 13a (`--verify` on the real data); **13b** criterion 4 (fixture), §8 (no decision exists in the real database, so its figures are the ones 13a verified) |
| Acceptance 8 — "Səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır." | 13a (record, suggestions); **13b** criterion 5 (analytics byte for byte) and criterion 8 (the button) |
| Out of scope: menu visibility of "Məhsullar" (Task 14); words (Task 5 owns the rule) | — |

**Deliberately left to 13c:** 13.1a, acceptance 3, and any effect of a **Variant** link on "Niyə dəyişib?", "Əsas
dəyişikliklər", the dashboard's cause or any count. In 13b a Variant link changes no analytics figure (criterion 7).

## 4. Required behaviour

### 4.1 The fold — one pure rule, read once per request

New `src/BaxOrders.Application/Analytics/SpellingFold.cs`. The names are the Planner's; the Coder may rename them but
not change what they mean.

```
/// The live approved spelling matches: each source variant counts as its target in every analytics read.
public sealed class SpellingFold
{
    public static SpellingFold None { get; }                       // no match: every id is its own
    public static SpellingFold Of(IEnumerable<(long Source, long Target)> matches);
    public static Task<SpellingFold> ReadAsync(IBaxOrdersDbContext db, CancellationToken ct);

    public bool IsEmpty { get; }
    public long CanonicalOf(long variantId);                       // the kept variant, or the id itself
    public IReadOnlyList<long> MembersOf(long variantId);          // every variant counting as CanonicalOf(id), itself included

    /// Re-keys every request's snapshots by canonical id, adding up the snapshots that land on one id.
    public Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> Apply(
        Dictionary<long, Dictionary<long, VariantPeriodSnapshot>> byRequest);
}
```

- `ReadAsync` is **one** query: `ProductMatchDecisions` where `Kind == SameItem && Outcome == Approved && UndoneAtUtc
  == null`, selecting `(SourceVariantId, TargetVariantId)`, `AsNoTracking`. Nothing else is read. **Rejected, undone
  and Variant rows are never read by the fold.** Only an approved spelling match changes an analytics figure.
- `Apply` adds up `Quantity`, `ItemCount`, `KnownPriceItemCount`, `MissingRequiredPriceItemCount`,
  `PriceNotRequiredItemCount`, `PricedQuantity` and `PricedAmount`, field by field, into one snapshot carrying the
  canonical id. No field is dropped, recomputed, rounded or averaged. The fold happens per request, before any
  baseline averaging, so `AverageBaseline` sees one variant per request exactly as it sees an ordinary one.
- When `IsEmpty`, `Apply` returns its input unchanged. With no approved spelling match, every read path does exactly
  what it does at `15398eb`.
- `CanonicalOf` follows the map to its end. 13a's service makes a chain impossible, but this function must not rely
  on that: it stops at the first id it has already visited, so a stored cycle can never loop.
- It is pure (`Of`, `CanonicalOf`, `MembersOf`, `Apply`); only `ReadAsync` touches the database.

**The invariant that makes "məbləğlər dəyişmir" hold by construction:** for every request, the sum of every field over
`Apply`'s output equals the sum over its input. Totals, known amounts, deltas, percentages and missing-price counts
are sums of snapshots (`OrderAnalyticsCalculator.Totals`), so they cannot move. What can move is how a difference is
split between products and causes. That split is the point of the brief: a false "new" plus a false "no longer
ordered" become one product whose quantity or price changed.

### 4.2 Every analytics read path folds

In each of the three readers of §2.2, read the fold once and apply it to the snapshots straight after they are read,
before anything else uses them:

- `ManagementDashboardQueries.GetAsync` — the variant ids passed to `VariantsAsync` (`:126`) are the folded ones, so
  the cause product's name (`DashboardCauseProductDto`, 7.1) is the kept spelling's product name.
- `OrderDecisionContextQueries.GetAsync` — likewise `VariantsAsync` (`:130`) gets the folded ids. The drivers,
  steady products, categories and `DecisionProductCountsDto` all follow.
- `OrderAnalyticsQueries.CompareAsync` — likewise (`:103`). `Filter`'s search matches the kept variant's product name,
  code and model code (see Assumption 6).

Each class summary that states a query count is corrected by one. The summary of `OrderDecisionContextQueries` already
says "Four" and runs five (11b review); it now runs six, so write the true number. `CauseDecomposition.cs:138`'s remark
gains one sentence: identity is the variant **after approved spelling matches are folded**, and that is still
identity by order unit, because a spelling match never joins two units.

Do **not** merge the three private `SnapshotsAsync` methods into one in this task. Apply the shared fold at each call
site, so the diff stays small and each path is visibly folded (Assumption 3).

### 4.3 The product history folds

`OrderAnalyticsQueries.GetTrendAsync(locationId, productVariantId, …)`:

1. Read the fold. `canonical = fold.CanonicalOf(productVariantId)`, `members = fold.MembersOf(canonical)`.
2. The identity returned (`VariantTrendDto`'s variant) is the **canonical** variant's. Asking for a source variant's
   history returns the kept spelling's history, and that history includes the source's lines.
3. The line query (`:237`) and the supplier query (`:260`) filter on `members.Contains(item.ProductVariantId)` instead
   of `== productVariantId`, and group by request as today. Each point's quantity, amount, weighted price, item counts
   and suppliers therefore cover every member. `Frequency` needs no change: a month counts as ordered when any member
   was ordered in it.
4. When the fold is empty, the result is exactly the one at `15398eb`.

The frontend's `TrendModal` does not change: it asks with the driver's variant id, which after §4.2 is already the
canonical one.

### 4.4 What does not change

- Every path in §2.3 (they count lines, not products). The monthly report is covered by criterion 4.
- The order's line table still shows every line under its own stored spelling. A line is a line. Only analytics fold.
- No product, variant, alias, line, price or pricing classification is written. The fold is a read.
- A **Variant** link has no analytics effect in 13b. That is 13c's.

### 4.5 Families — a base product and its variants (read-only API)

A new read endpoint, open to every signed-in user like the rest of `ProductMatchesController`:

```
GET api/v1/catalog/product-matches/families?search=&page=&pageSize=
```

- One family per **base** product that has at least one **live approved Variant** decision (`TargetProductId`).
- Per family: the base's `productId`, `productName`, and its usage (lines, locations, first and last month, from
  `ProductMatchCatalog`'s `ProductUsage`, or null when it has no line in the versions the screens read). Then its
  variants, each with the variant product's `productId`, `productName`, the decision's `variantLabel`, the decision
  `id`, `decidedByDisplayName`, `decidedAtUtc`, and the same usage.
- Order: families by base name, variants by label, both through `AzerbaijaniCollation` (as `ProductMatchQueries`
  does). `search` matches the base's or any variant's product name through `TextNormalizer`, as `/suggestions` does.
  Paged by family: `pageSize` default 50, max 200, same `PageOf`.
- DTOs go in `ProductMatchDtos.cs` (`ProductFamilyDto`, `ProductFamilyMemberDto`, `ProductFamilyQuery`). The query is
  `ProductMatchQueries.GetFamiliesAsync`. It reads the live approved Variant decisions (one query), the product names
  (one query), and the catalogue usage through `ProductMatchCatalog.ReadAsync(db, readDecisions: false, …)`.
- It writes nothing.

The two products of a family stay two products in every table and every API. The family is a view of the decisions,
not a change to the catalogue (13.1, "bir mala birləşmir").

### 4.6 The Products page

`frontend/bax-orders-web/src/pages/ProductsPage.tsx` is rewritten. The `PlannedFeature` placeholder goes away (Task 14
brief: no empty section is shown to anybody). The `PageHeader` keeps its title and the link to "Məhsul
kateqoriyaları".

Three tabs, with the tab and the kind held in the URL (`?tab=suggestions|families|decisions&kind=SameItem|Variant`)
so that back navigation returns to the same view (the `useSearchParams` pattern of `ApprovalInboxPage.tsx:35`):

**1. "Təkliflər"** (default)

- Two sub-tabs with their totals from `/suggestions`: "Yazılış fərqi (N)" and "Variant fərqi (N)". There is a search
  box and paging (50 a page).
- One line under the tab says what each kind means:
  - Yazılış fərqi: "Eyni mal fərqli yazılıb. Təsdiqlənsə, hesabatlarda bir mal sayılır; sifarişlər və məbləğlər
    dəyişmir."
  - Variant fərqi: "Eyni əsas məhsulun variantı ola bilər. Təsdiqlənsə, iki məhsul birləşmir — hər biri öz adı,
    sətirləri və tarixçəsi ilə ayrıca variant kimi qalır."
- A **spelling** row shows both sides: product name, specification, model code where there is one, and unit (through
  `unitWord`); how many lines and locations; first and last month (month names, not codes). It also shows the
  difference in words: `Whitespace` → "Boşluq fərqi", `Slash` → "«/» və «\» fərqi", `WhitespaceAndSlash` → "Boşluq və
  «/» — «\» fərqi".
- A **variant** row shows the variant product → its base, the proposed label, and the same usage figures.
  Suggestions under one base are listed together, as the API already orders them (base name, then variant name).
- **Nothing on this tab does anything by itself.** Opening, searching and paging only read.

Buttons, **only when `user.canDecideProductMatches`**:

- **"Təsdiqlə"** opens a small dialog.
  - For a spelling pair, it shows both spellings and asks "Hansı yazılış saxlanılsın?". The choice is two radio
    options, and the suggestion's target is preselected. The chosen one is sent as `targetId`, the other as
    `sourceId`: the API accepts either direction of a suggested pair.
  - For a variant pair, it shows the base and the variant and a label field prefilled with `proposedLabel` (1–100
    characters, trimmed; empty is refused in the browser before sending). It repeats the sentence "İki məhsul
    birləşmir …" above.
  - Both dialogs have an optional reason (≤ 500). "Təsdiqlə" calls `approveProductMatch`, then reloads the list and
    the totals.
- **"Rədd et"** acts at once, with no dialog, because rejecting 200 accessories one dialog at a time is not usable
  (13a report §9.5). It calls `rejectProductMatch` and reloads. A line then appears above the list: "«A» / «B» rədd
  edildi." It has a **"Geri al"** button that calls `undoProductMatch` on the returned decision's id and reloads. The
  line stays until the next action.
- A refusal (422 / 409 / 403 / 404) shows the server's message in the dialog or above the list, and the list reloads.
  Nothing is retried.

Without the flag the tab is read-only. No button, no dialog, and one line: "Təklifləri yalnız administrator təsdiqləyir
və ya rədd edir."

**2. "Məhsullar və variantlar"** — the families of §4.5, with search and paging. Each family shows the base product
with its usage, and under it each variant as its own row, showing the variant product's name, its label, its usage,
and "kim / nə vaxt təsdiqləyib". A line at the top says: "Variantlar ayrı məhsul kimi qalır; burada yalnız hansı əsas
məhsula aid olduqları göstərilir." When nothing has been approved: "Hələ heç bir variant əlaqəsi təsdiqlənməyib."

**3. "Qərarlar"** — `/decisions`, newest first, paged. Filters: kind (both / Yazılış / Variant), outcome (both /
Təsdiqlənib / Rədd edilib), and a checkbox "Geri alınanları da göstər". Each row shows the kind, the outcome, both
sides (product names, and the variant description for a spelling match; the label for a variant link), the reason,
who and when. For an undone row it also shows who undid it, when, and why, and the row is visibly marked "Geri
alınıb". A **live** row has **"Geri al"** only with the flag. It opens a confirmation dialog: "Bu qərar geri alınsın?
Cüt yenidən təklif kimi görünəcək; yazılış uyğunluğu idisə, hesabatlar əvvəlki kimi iki mal göstərəcək." There is an
optional reason (≤ 500). It calls `undoProductMatch` and reloads.

Words: the kind labels ("Yazılış fərqi", "Variant fərqi"), the three difference labels, "Təsdiqlənib" / "Rədd edilib"
/ "Geri alınıb", and the two explanatory sentences are exported from `terminology/terms.ts`. Page-only wording may
live in a `components/catalog/matches/labels.ts`. Money is not shown on this page. Months use the existing month-name
helpers. Product codes are not shown (05b). Specification, model code and unit are shown, because they are what a
spelling match is about.

Components: put them under `components/catalog/matches/` (for example `SuggestionList.tsx`, `ApproveMatchDialog.tsx`,
`FamilyList.tsx`, `DecisionList.tsx`), with the calls in `api/productMatches.ts`, which gains
`fetchProductMatchFamilies` and its types. The page works at phone width without horizontal scrolling. Use rows or
cards below `lg`, as Task 12 does. The rows stay readable at 1366.

## 5. Files — summary for the Coder

- Application: `Analytics/SpellingFold.cs` (new). `Analytics/OrderAnalyticsQueries.cs` (compare and trend).
  `Analytics/Dashboard/ManagementDashboardQueries.cs`. `Decisions/OrderDecisionContextQueries.cs`.
  `Decisions/CauseDecomposition.cs` (the remark only). `Catalog/ProductMatches/ProductMatchDtos.cs` and
  `ProductMatchQueries.cs` (families).
- Api: `Controllers/ProductMatchesController.cs` (`GET families`).
- Frontend: `pages/ProductsPage.tsx`, `components/catalog/matches/*` (new), `api/productMatches.ts`,
  `terminology/terms.ts`.
- Tests: §9.

No migration, no snapshot change, no tool, no change under `tools/`, and no change to `ProductMatchService`,
`ProductMatchSuggestions`, `DoNotMergePairs` or `ProductMatchAuthority`.

## 6. Safety and STOP conditions

- **No database access is needed or allowed.** This specification carries no `DATA_MIGRATION` line. Every test runs
  on the Postgres test fixture or an `IsolatedDatabase`. Do not run any tool under `tools/`, do not run the API
  against the real database, and do not stop or restart the running API.
- **No decision is made in the real database**: not through the API, not through a script. Decisions exist only in
  test databases.
- **The fold reads only live approved SameItem rows.** If any part of the design needs a Variant row, a rejected row
  or an undone row to change an analytics figure, STOP: that is 13c's line, or a business rule the brief does not
  state.
- **No likeness in the read path.** The analytics fold exactly the pairs an administrator approved, never a pair by
  name, normalised key or suggestion. If a test seems to need a suggestion to fold, the test is wrong.
- **Money.** If any test shows a total, a known amount, a delta, a percentage or a missing-price count changing
  because of an approval, STOP and report. Do not adjust an expected value. That is the brief's hard rule ("Heç bir
  təsdiqdən sonra məbləğlər dəyişmir").
- Do not rework Tasks 1–12 or 13a. A defect found there goes into the report.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 7. Invariants — MUST NOT CHANGE

- With **no** live approved SameItem decision, every analytics response (dashboard, decision context, comparison,
  trend, monthly report) is exactly what it is at `15398eb`, byte for byte. The real database is in that state.
- With one, every money figure and every missing-price / internal-supply count of every response is exactly what it
  was without it. Only the per-product rows, the categories' split and the product counts may differ.
- Task 2's price states: a folded product whose members include a line with an owed missing price is still
  "unattributed" and still counted as missing. An internal-supply line is still neutral and still not counted as
  missing.
- Task 7's share rule (`CauseLeader`), Task 10's `StateOf`, Task 9's colour rule and Task 12's layouts are unchanged
  as code. They simply receive folded rows.
- 13a's API, authority, suggestion rule and NM list are unchanged.

## 8. Acceptance criteria

1. **The fold.** `SpellingFold` behaves as §4.1. Empty means unchanged. Two members in one request are added up
   field by field. A lone source is re-keyed. The per-request sum of every field is preserved. A chain is followed,
   and a cycle stops. Only live approved SameItem rows are read.
2. **Acceptance 5 — one product in the history.** On a fixture object that ordered "Lampa 15 W" 10 ədəd × 2.00 in
   August 2026 and "Lampa 15W" 12 ədəd × 2.00 in September 2026, the September order page shows, before approval,
   "Lampa 15W" New (+24.00) and "Lampa 15 W" no longer ordered (−20.00): two drivers, "Yeni" 1, "yazılmayan" 1. The
   history of "Lampa 15W" has a zero August. **After the Admin approves the spelling match (keeping "Lampa 15W")**
   there is one driver, "Lampa 15W", Increased, quantity 10 → 12, amount impact +4.00. "Yeni" is 0 and "yazılmayan"
   is 0. The history of "Lampa 15W" (asked for either variant id) shows August 10 and September 12 under one name.
   The dashboard row of that object and the comparison endpoint agree with the order page.
3. **Acceptance 4 — separate until approved.** Before approval, after a **rejection**, and after an **undone**
   approval, the two spellings are two rows everywhere, exactly as at `15398eb`.
4. **Acceptance 7 — no amount moves.** On that fixture, and on 13a's Heydər Əliyev fixture, every basis (the four
   standard ones): the order page's current / baseline / delta / percent, the dashboard summary and every object's
   figures, the comparison summary's money and missing-price counts, and the monthly report for 2026 are identical
   before approval, after it and after its undo. The decomposition's categories still add up exactly to the delta.
5. **Acceptance 8 — undo restores everything.** After undoing the approval, the serialised dashboard, decision
   context, comparison and trend responses equal the ones taken before the approval, byte for byte.
6. **Task 2 price states.** A folded pair whose September line has an owed missing price stays one driver in
   `UnattributedDueToMissingPrice` with `MissingRequiredPriceItemCount` 1. The order's missing count is unchanged. An
   internal-supply member stays neutral (`InternalSupply`, not counted as missing).
7. **A variant link folds nothing (13.1; 13c's seam).** Approving "Sabun elano lavanda ətirli" as a variant of "Sabun
   elano" leaves every analytics response exactly as before: Heydər Əliyev September 750.00 / 750.00 / 0.00, the two
   products on two rows. **13c changes this; 13b must not.**
8. **The page (acceptance 1, 2, 8 — visible half).** The Products page shows both kinds of suggestion with their
   totals, the Sabun pair under "Variant fərqi" with the label "lavanda ətirli", and nothing happens until a button is
   pressed. As Admin: approving a spelling pair sends the chosen direction, approving a variant pair sends the
   (edited) label, "Rədd et" rejects at once and offers "Geri al", and "Qərarlar" lists decisions with "Geri al" on
   live ones. After the Sabun approval, "Məhsullar və variantlar" shows "Sabun elano" with the variant "Sabun elano
   lavanda ətirli" (label "lavanda ətirli") as its own row, and `/families` returns it. Both products still exist
   separately in the catalogue.
9. **Acceptance 6 — visible half.** Signed in without `canDecideProductMatches` (Rəhbər, Koordinator), the page shows
   the lists and no "Təsdiqlə", "Rədd et" or "Geri al". The server's 403 is 13a's and still holds.
10. **No placeholder.** "Bu bölmə hələ hazırlanır" and the `PlannedFeature` points no longer appear on the Products
    page. The page passes `findOldTerms`.
11. **Nothing else changed.** Builds and suites are green. `git status` shows only the files of §5 and the tests of
    §9.

## 9. Required tests

Unit (`tests/BaxOrders.UnitTests`):

- `Analytics/SpellingFoldTests.cs`: every clause of §4.1 — empty, one pair in one request, a lone source, several
  requests, the per-field sum property over every field, `CanonicalOf` / `MembersOf`, chain followed, cycle stops.
- The pure decomposition on folded input: a New + NoLongerOrdered pair becomes one Increased variant with the same
  total `AmountImpact`. Put it beside the existing `CauseDecomposition` / `PeriodComparison` tests.

Integration (`tests/BaxOrders.IntegrationTests`, each on its own `IsolatedDatabase` so the whole-catalogue rules of
13a are not disturbed):

- `SpellingFoldAnalyticsTests.cs` with its own small fixture: the object of criterion 2, plus a pair for criterion 6
  (an owed missing price, and an internal-supply line). It covers criteria 2, 3, 4 (on this fixture), 5 and 6. The
  approvals go through `ProductMatchService` as the Admin (`TestCurrentUser.AdminAsync`). The before / after / undo
  comparison serialises the four responses as 13a's `AnalyticsAsync` helper does, and pins the concrete figures of
  criterion 2.
- Criterion 4 and 7 on 13a's `ProductMatchFixture` (Heydər Əliyev): the Variant approval leaves every response equal,
  and the figures stay 750.00 / 750.00 / 0.00.
- `ProductMatchFamiliesTests.cs` (or in `ProductMatchTests.cs`): criterion 8's API half — empty before, the Sabun
  family after approval (label, actor, usage), gone after undo, search by base or variant name, and both products
  still separately in `Products`.
- 13a's `The_order_page_and_the_dashboard_do_not_move_when_a_match_is_approved_or_undone` stays with its assertions.
  Its spelling match is at the test object, which has no September order, so no September figure can move. Correct its
  summary comment, which says "until 13b and 13c, nothing reads a decision", to say why it still holds. If it fails,
  STOP and report; do not change its expectations.

Frontend (vitest):

- `pages/ProductsPage.test.tsx`: both sub-tabs with totals; the Sabun row with its label; no placeholder text;
  `findOldTerms` finds nothing. **With** the flag: approve a spelling pair in the reverse direction (the request body
  swaps `sourceId` / `targetId`); approve a variant with an edited label; an empty label is refused without a request;
  "Rədd et" posts at once and "Geri al" posts the undo; a 422 message is shown. **Without** the flag: no action
  buttons on any tab.
- `components/catalog/matches/*.test.tsx` as needed: families (base with variant rows, empty text) and decisions
  (filters, the undone marking, "Geri al" only on live rows and only with the flag, the confirmation dialog).
- Existing fixtures typed as the current user do not need changing (13a added the flag).

No existing expectation may be weakened. The analytics tests of Tasks 1–12 must pass unchanged, because their
fixtures have no decisions.

## 10. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors. `dotnet test BaxOrders.slnx` — baseline 936 unit / 730
  integration; give the new counts. If the running API locks `bin`, use `--artifacts-path` into the scratchpad, say
  so, and do not stop the API.
- `npm run --prefix frontend/bax-orders-web test` (baseline 41 files / 806 tests) and `… build` — green, with counts.
- `git diff --stat` and `git status`.

## 11. Out of scope

- 13.1a's "variant dəyişib" line, acceptance 3, and any analytics effect of a Variant link (13c).
- The menu, and who sees "Məhsullar" (Task 14).
- A full catalogue browser (every product with its stored `ProductVariant`s), the list of Excel alternative names
  (`ProductAlias`), and a per-product price history on the Products page. The brief asks for none of them, and the
  placeholder that listed them is removed rather than half-filled.
- A bulk-reject endpoint. One-click reject with undo is 13b's answer (Assumption 7).
- Encoding NM-03 / NM-05 more precisely (13a report §9.2–9.3). That needs the owner to name the products.
- DB-10 pairs that differ by more than spaces and slashes (13a §11).
- HD-002.

## 12. Operator notes (after review)

- No migration, no tool and no data change. Restart the API on the new commit to expose `GET …/families` and the
  folded read paths before serving the new frontend (the Products page calls `/families`).
- The real database has zero decisions, so the dashboard, order pages and report read exactly as before until an
  Admin approves a spelling match on the Products page. The one real spelling suggestion is «Dəmir ventil yarıdövr»
  `DN20 3\4` / `DN20 3/4`.
- Rollback: `git reset` the commit. No data to restore.

## 13. Where the brief lands in 13b

| Brief | Here |
|---|---|
| Spelling match: one product in the history, "Əsas dəyişikliklər", "Niyə dəyişib?" | §4.1–4.3; criteria 1, 2 |
| Variant: separate variants of one base, never merged (13.1) | §4.4, §4.5, §4.6 tab 2; criteria 7, 8 |
| Only admin / data manager approves or rejects (13.2) | §4.6 (buttons by the flag); criterion 9 |
| Nothing unapproved changes anything | §4.1 (live approved rows only); criterion 3 |
| Amounts never change | §4.1 invariant, §7; criterion 4 |
| A wrong approval can be undone | §4.6 ("Geri al"); criterion 5 |
| Task 1/1b/1c figures; Task 2 price states | criteria 4, 6 |
| Acceptance 1, 2, 4, 5, 6, 7, 8 | criteria 8, 7–8, 3, 2, 9, 4, 5 |
| Acceptance 3; 13.1a | 13c |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. **Folding happens on the read side**, at the snapshots every analytics path already builds. Nothing is re-pointed
   or merged in the data. So undo is exact (a decision stops being live and the next read is the old one), and money
   cannot move, because the fold only regroups sums.
2. **The kept spelling is the decision's target.** The admin chooses it when approving (13a allows either direction),
   and every screen shows that variant's name and description for the folded row.
3. The three identical `SnapshotsAsync` readers are **not** merged in this task. The shared piece is the fold, applied
   at each call site, which keeps the diff small and each path visibly folded.
4. The **product history asked for a folded-away variant** answers with the kept variant's history, which includes the
   asked-for variant's lines, rather than refusing or returning half a history.
5. The **order's line table** still shows every line under its own stored spelling. Lines are records, and 13b folds
   only analytics.
6. The comparison endpoint's search matches the kept variant's name, code and model code only. The endpoint has no
   screen since Task 11b.
7. **Rejecting is one click with an immediate "Geri al"**, not a dialog and not a bulk endpoint. The real data has 216
   variant suggestions, many of which an admin will reject, and every rejection is already undoable.
8. **Approving asks for confirmation** (a small dialog): for a spelling pair, which spelling is kept; for a variant
   link, the label, with the sentence that the two products are not merged. This answers 13a's FAB / NM-16 note.
9. The Products page shows **suggestions, families and decisions only**. The placeholder's other points (a full
   catalogue browser, Excel alternative names, per-product price history) are not built here, and the placeholder is
   removed, because the Task 14 brief says no "hazırlanır" section is shown.
10. **Families** are a read-only view of live approved Variant decisions, grouped by base. They are served by one new
    GET endpoint rather than assembled in the browser from paged decisions.
11. The page is **readable by every signed-in user** (as the API is). The buttons follow `canDecideProductMatches`
    only. Who sees the menu entry is Task 14's.
12. No real spelling match exists to show acceptance 5, so it is proven on a fixture with the brief's "15 W" / "15W".

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (`15398eb`), `git status --short`, `git diff --stat`.
1. Fold — `SpellingFold`, what it reads, how `Apply` adds up, why money cannot move; each of the three read paths and
   the history, with file:line.
2. Families API — the endpoint, its DTOs, its queries.
3. Products page — the three tabs, what an Admin can do, what anybody else sees, the words added to `terms.ts`.
4. Acceptance — each criterion of §8 with the test that proves it and the concrete figures of criterion 2 (before,
   after, after undo).
5. Testlər — new tests; deliberately changed tests or comments, each with the brief line behind it; counts; builds.
6. Toxunulmayanlar — no data, no schema, no tool; paths that count lines; 13a's API and rules; Tasks 1–12.
7. 13c üçün qeydlər — anything 13c must know (for example how a Variant link should meet a folded spelling match
   when a product such as «Dəmir ventil yarıdövr» is in both), and defects found elsewhere.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
