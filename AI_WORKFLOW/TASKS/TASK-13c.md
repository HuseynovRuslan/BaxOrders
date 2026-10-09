# TASK 13c — "VARIANT DƏYİŞİB" SƏTRİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-13.md`. This is the owner's settled requirement, shared by 13a, 13b and 13c. It decides
*what* and *why*; this file decides *how*. If this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **13c of three.** 13a (accepted, `15398eb`) built the decision record, the suggestions and the approve / reject /
undo API. 13b (accepted, `c8a4747`) made a live approved **spelling** match one product in every analytics path and
filled the Products page. **13c** makes a live approved **variant** link (`ProductMatchKind.Variant`) show in "Niyə
dəyişib?" as one "variant dəyişib" line (13.1a), on the order page and in the dashboard's cause. §3 lists which brief
lines each part carries; together they carry all of them.
Specification status: READY. Written by the Planner on 2026-09-25 from the brief and the repository at `c8a4747`.
Line numbers below are at `c8a4747`.

This task **reads** the decisions 13a records. It changes no schema and no data: no migration, no tool, no row in the
real database. The real database holds zero decisions today, so nothing any screen shows there moves until an
administrator approves a variant link on the Products page.

---

## 1. Context

The brief's lines for this part:

- "Təsdiqlənmiş variant keçidi «Niyə dəyişib?»də bir sətirdə «variant dəyişib» kimi göstərilir, məsələn: «Sabun elano
  — variant dəyişib: adi → lavanda ətirli». Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda baş verir;
  təsdiqlənməmiş hallarda iki mal ayrı sətirlərdə qalır."
- **13.1a** — "Eyni əsas məhsulun təsdiqlənmiş variant keçidi «Niyə dəyişib?» bölməsində bir sətirdə «variant dəyişib»
  kimi göstərilir. Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda tətbiq olunur; qeyri-müəyyən hallarda
  avtomatik birləşdirmə yoxdur."
- **13.1** — scent, colour and size stay separate variants of one base; "bir mala birləşmir". So in 13c the two products
  stay two products everywhere except the one place 13.1a names: the transition's money is one line in "Niyə dəyişib?".
- **Acceptance 3** — "Variant əlaqəsi təsdiqlənəndən sonra Heydər Əliyevin Sentyabr sifarişində «Niyə dəyişib?»
  bölməsində «Sabun elano» üçün bir «variant dəyişib» sətri görürəm; bu sətrin təsiri 0.00 ₼-dır (750.00 − 750.00).
  «Yeni məhsullar» və «Bu ay yazılmayan məhsullar» hissələrinin hər biri 750.00 ₼ azalır."
- "Heç bir təsdiqdən sonra məbləğlər dəyişmir." "Səhv təsdiq geri alına bilir." Task 1/1b/1c figures and Task 2's price
  states must hold (acceptance 7: Heydər Əliyev, Keçən ay +23,852.70 unchanged).
- WORKFLOW_RULES §10: "Task 13 represents an approved variant transition as a single «variant dəyişib» line, and doing
  so must not change the overall monetary total (13.1a)."

## 2. Verified current behaviour (repository at `c8a4747`)

### 2.1 The decisions

- `ProductMatchDecision` (`src/BaxOrders.Domain/Catalog/ProductMatchDecision.cs`). A live approved **Variant** row has
  `SourceProductId` = the variant product ("Sabun elano lavanda ətirli"), `TargetProductId` = the base ("Sabun elano"),
  `VariantLabel` = "lavanda ətirli", and null variant ids. The partial unique index `(SourceProductId) WHERE Kind =
  'Variant' AND Outcome = 'Approved' AND UndoneAtUtc IS NULL` means a product is a variant of at most one base. The
  service refuses a variant of a variant and a base that is itself a variant, so a family is one level deep.
- A live approved **SameItem** row carries `SourceVariantId → TargetVariantId` **and** both variants' products in
  `SourceProductId` / `TargetProductId` (13a §4.1).
- `SpellingFold` (`Application/Analytics/SpellingFold.cs`) reads live approved SameItem rows only (`ReadAsync`, `:93`,
  one query). It is read at four places: `ManagementDashboardQueries.GetAsync` (`:128`),
  `OrderDecisionContextQueries.GetAsync` (`:126`), `OrderAnalyticsQueries.CompareAsync` and `GetTrendAsync`. **No
  analytics path reads a Variant row.** 13b's criterion 7 test proves it
  (`SpellingFoldAnalyticsTests.On_the_briefs_example_a_variant_link_folds_nothing_…`, `:259`).

### 2.2 "Niyə dəyişib?" today

- `CauseDecomposition` (`Application/Decisions/CauseDecomposition.cs`): `CauseCategory` (`:11`, values 1–7),
  `Order` (`:158`), `Decompose` (`:174`) → `Explain` per variant (`:365`), `ToCents` (`:248`, largest-remainder
  allocation of the categories to the cents of the delta; each variant rounded on its own). A variant with baseline
  quantity 0 and current > 0 is `NewOrders`; the reverse is `NoLongerOrdered` — but only after the three earlier
  branches: an owed missing price → `UnattributedDueToMissingPrice`, any internal-supply line → `InternalSupply`, a
  service → `Services`.
- `PeriodComparison.Of` (`Decisions/PeriodComparison.cs:101`) is the one comparison both screens call: the dashboard
  (`ManagementDashboardQueries.cs:185`) and the decision context (`OrderDecisionContextQueries.cs:182`).
- `CauseLeader.Of` (`Decisions/CauseLeader.cs:43`) names the dashboard card's product (7.1, 7.1a): the largest variant
  filed under the primary category moving its way, over the sum of every variant moving that way.
- The dashboard row (`ManagementDashboardQueries.Build`, `:160`) lists `causes` with amount ≠ 0 (`:209`), picks the
  primary by |amount| then by the enum value (`:218`), and names the leader's product from `VariantsAsync`
  (`:225`, `:499`).
- The decision context's `Explain` (`OrderDecisionContextQueries.cs:216`) builds `DecisionDecompositionDto`
  (`DecisionContextDtos.cs:149`): categories, drivers, steady products and the product counts (the counts go by
  `StateOf`, not by category).
- Frontend: `components/decisions/CauseSummary.tsx` ("Niyə dəyişib?") shows the categories with amount ≠ 0, sorted by
  size then `causeTieOrder`, the first marked "Əsas səbəb". `components/decisions/labels.ts` holds `causeLabels`
  (`:13`), `causeHints` (`:27`), `causeToneClass` (`:43`), `causeOrder` (`:55`), `causeTieOrder` (`:73`).
  `DriverList.tsx` ("Əsas dəyişikliklər") shows each driver's pill from `causeLabels[driver.category]` (`Pill`, `:224`)
  and notes under it (`Change`, `:173`); its "Yeni məhsullar" / "Bu ay yazılmayan" chips go by **state**, not category
  (`matches`, `:285`). The dashboard's words for a cause are `causeHeadline` (`components/dashboard/labels.ts:103`);
  its product line is `CauseProduct` (`components/dashboard/AttentionSection.tsx`). The type is `CauseCategory` in
  `api/decisions.ts:6`. Enums are serialised as strings (`Api/Program.cs:25`).

### 2.3 The brief's example in the tests

13a's `ProductMatchFixture` (integration tests) is exactly the brief: Heydər Əliyev Mərkəzi (HEM), August 2026 "Sabun
elano" 60 ədəd × 12.50 = 750.00, September 2026 "Sabun elano lavanda ətirli" 60 ədəd × 12.50 = 750.00. Today its
September "Niyə dəyişib?" is "Yeni məhsullar" +750.00 (1) and "Bu ay yazılmayan" −750.00 (1), delta 0.00. On the real
data (13a `--inspect`) the same two lines exist, the Sabun pair is suggested with the label «lavanda ətirli», and HEM
September "Keçən ay" is +23,852.70.

### 2.4 Test baselines (13b review)

951 unit / 741 integration (0 skipped). Frontend 44 files / 833 tests. Both builds clean. Exact query counts are pinned:
decision context 6; dashboard 6, and 7 for "every prior month".

## 3. Scope — where each brief line lands

| Brief line | Part |
|---|---|
| Two kinds of suggestion; the system proposes, "özü heç nə etmir" | 13a, 13b |
| Yazılış fərqi: one product after approval; history, "Əsas dəyişikliklər", "Niyə dəyişib?" see one | 13b |
| Variant fərqi: "eyni əsas məhsulun ayrı variantları kimi bağlanır, bir mala birləşmir" | 13a (link), 13b (page); **13c** keeps the two products apart everywhere except the one transition line (§4.6, criterion 6) |
| 13.2 — only admin / data manager approves; "təsdiqlənməyən heç nə dəyişmir" | 13a, 13b; **13c** reads live **approved** Variant rows only (§4.1, criterion 4) |
| **13.1a — one "variant dəyişib" line in "Niyə dəyişib?", only for an approved link** | **13c** §4.2–4.5; criteria 1–3 |
| "Heç bir təsdiqdən sonra məbləğlər dəyişmir." | **13c** §4.2 invariant; criterion 5 |
| "Səhv təsdiq geri alına bilir." | 13a, 13b; **13c** criterion 7 (analytics back byte for byte) |
| Mütləq qorunmalı: Task 1/1b/1c figures; Task 2 price states | **13c** criteria 5, 8 |
| Acceptance 1, 2, 5, 6 | 13a, 13b (unchanged here) |
| **Acceptance 3** — HEM September, one "variant dəyişib" line for "Sabun elano" at 0.00 ₼; "Yeni" and "yazılmayan" each 750.00 ₼ less | **13c** criterion 1 |
| Acceptance 4 — "Təsdiq olunana qədər iki mal indiki kimi ayrı sətirlərdə qalır." | 13b; **13c** criterion 4 (before approval, rejected, undone: no line) |
| Acceptance 7 — totals unchanged (HEM Keçən ay +23,852.70) | 13a (`--verify`), 13b; **13c** criterion 5 (fixture) and §12 (the operator's live check) |
| Acceptance 8 — undo restores | 13a, 13b; **13c** criterion 7 |
| Out of scope: menu visibility (Task 14); words (Task 5 owns the rule) | — |

With 13c every brief line is carried. Nothing is left to a later part.

## 4. Required behaviour

### 4.1 Reading the links — one query for both kinds

New `src/BaxOrders.Application/Analytics/ApprovedMatches.cs`. The names are the Planner's; the Coder may rename them but
not change what they mean.

```
/// Every live approved product match an analytics path needs, read in one query.
public sealed record ApprovedMatches(SpellingFold Spelling, VariantFamilies Families)
{
    public static ApprovedMatches None { get; }
    public static Task<ApprovedMatches> ReadAsync(IBaxOrdersDbContext db, CancellationToken ct);
}

/// The live approved variant links: which base product each product belongs to, under which label.
public sealed class VariantFamilies
{
    public static VariantFamilies None { get; }
    public static VariantFamilies Of(
        IEnumerable<VariantLink> links,                              // (VariantProductId, BaseProductId, Label, BaseProductName)
        IEnumerable<(long SourceVariantId, long SourceProductId, long TargetProductId)> spellingMatches);
    public bool IsEmpty { get; }
    public string? BaseNameOf(long baseProductId);

    /// The family role of a canonical (already spelling-folded) variant, or null when it belongs to no family.
    public VariantFamilyRole? RoleOf(long canonicalVariantId, long ownProductId, SpellingFold spelling);
}

public sealed record VariantFamilyRole(long BaseProductId, long ProductId, string? Label);   // Label null = the base itself
```

- `ReadAsync` is **one** query over `ProductMatchDecisions` where `Outcome == Approved && UndoneAtUtc == null`, both
  kinds, `AsNoTracking`, ordered by `Id`, selecting `Kind`, the two variant ids, the two product ids, `VariantLabel`, and
  the base product's name (a correlated sub-select on `Products` by `TargetProductId`, inside the same statement).
  **Rejected and undone rows are never read.**
- Its `Spelling` is built from the SameItem rows exactly as `SpellingFold.ReadAsync` builds it today (same filter, same
  order, `SpellingFold.Of`). A unit or integration test proves the two agree.
- `ManagementDashboardQueries.GetAsync` and `OrderDecisionContextQueries.GetAsync` call `ApprovedMatches.ReadAsync`
  **instead of** `SpellingFold.ReadAsync`, so their query counts do **not** change (6; 6/7). `CompareAsync` and
  `GetTrendAsync` keep `SpellingFold.ReadAsync` unchanged (§4.6). Do not change `SpellingFold`'s behaviour.

**`RoleOf` — spellings first, then the family** (13b report §7.1):

1. The products behind a canonical variant `c` are its own product plus the `SourceProductId` of every live approved
   SameItem row whose source folds into `c` (`spelling.CanonicalOf(source) == c`).
2. Each product has at most one role: a base of a family → `(base, base, null)`; a variant product → `(base, itself,
   label)`; neither → none.
3. No product with a role → null. Roles pointing at **more than one** base → null (the approvals disagree; the variant
   is left in no family, as §7 of `WORKFLOW_RULES.md` leaves any unresolved pair). Otherwise the family is that base, and
   the role is the own product's role if it has one, else the role of the lowest product id that has one.
4. Pure. When `IsEmpty`, `RoleOf` is always null.

### 4.2 The transition — one pure rule, inside the one comparison

`CauseCategory` gains `VariantChange = 8` ("Variant dəyişib"). `CauseDecomposition.Order` puts it right after
`NoLongerOrdered`. Existing values keep their numbers.

`CauseDecomposition.Decompose` gains an optional argument: the role of each variant id
(`IReadOnlyDictionary<long, VariantFamilyRole>?`, default null). `PeriodComparison.Of` gains the same optional argument
and passes it through. **With null or an empty map the result is exactly the one at `c8a4747`** — same categories (no
`VariantChange` entry), same variants, same totals.

After every variant is explained as today:

1. **Eligible members**: variants with a role whose `Category` is `NewOrders` ("arrived") or `NoLongerOrdered` ("left").
   Nothing else is eligible: a member with an owed missing price, with internal supply or that is a service stays in
   its own category exactly as today (Task 2).
2. **A transition**: for each base, when it has at least one arrived and at least one left member, and some arrived and
   some left member belong to **different products** of the family. Two stored variants of one product (another unit,
   another specification) are not a transition: nobody approved them as variants of each other.
3. Every arrived and left member of that base joins its one transition, and each such member's `Category` becomes
   `VariantChange`. Its `AmountImpact`, quantities, prices, known amounts, item counts and flags do not change.
4. The transition's money is `Σ AmountImpact` of its members — the whole net, current minus baseline. It is **not**
   split into a quantity and a price effect: the members are different items (13.1).
5. `VariantChange`'s category total is the sum of its members, and its `VariantCount` is the number of members (the
   same `Filed` rule as the other categories). The `NewOrders` and `NoLongerOrdered` totals lose exactly those members.
6. The `VariantChange` entry is in `Categories` **only** when there is at least one transition — then always, even when
   its amount is 0.00.
7. `CauseDecompositionResult` gains `Transitions` (empty by default), each:
   `VariantTransitionResult(long BaseProductId, IReadOnlyList<long> FromVariantIds, IReadOnlyList<long> ToVariantIds,
   decimal AmountImpact, decimal? BaselineKnownAmount, decimal? CurrentKnownAmount)` — from = left, to = arrived, each in
   id order; the two known amounts are the sums of the members' own. Transitions are ordered by |AmountImpact| desc,
   then base id.
8. `ExplanationIsComplete`, `UnattributedVariantCount`, `InternalSupplyVariantCount`, `SupplyChangedVariantCount` and
   `TotalAmountImpact` are unchanged (no eligible member can affect them).
9. `ToCents`: the categories are allocated as today (`VariantChange` takes part like any category with members); each
   transition's `AmountImpact` is rounded on its own, as a driver is.

**The invariant that makes "məbləğlər dəyişmir" hold by construction:** a transition only re-files money that was
already in `NewOrders` / `NoLongerOrdered`. For every decomposition, the sum of the categories and `TotalAmountImpact`
are identical with and without roles, and so are every per-variant `AmountImpact`. Totals, known amounts, deltas and
percentages come from `OrderAnalyticsCalculator.Totals` and never see a role at all.

### 4.3 The share rule (7.1, 7.1a) with a transition

`CauseLeader.Of` counts **a transition as one product effect**: its net `AmountImpact`, filed under `VariantChange`.
Its members are not counted on their own — neither as candidates nor in `SameDirectionAmount`. Every other variant is
counted exactly as today, so with no transition the result is identical to `c8a4747`. When the leader is a transition,
`CauseLeaderResult` says so (for example `VariantTransitionResult? Transition`), and its `ProductVariantId` is the
transition's first `ToVariantIds` entry.

### 4.4 The decision context — the order page

In `OrderDecisionContextQueries.GetAsync`:

- Read `ApprovedMatches` once (replacing the `SpellingFold.ReadAsync` call at `:126`), fold with its `Spelling` as
  today, and build the role map from `Families.RoleOf` for every variant in `VariantsAsync`'s result (it already carries
  `ProductId`). Pass the map to every `PeriodComparison.Of` call (`Compare`, `:182`).
- `DecisionDecompositionDto` gains, **last**, `VariantTransitions: IReadOnlyList<DecisionVariantTransitionDto>`:

```
DecisionVariantTransitionDto(long BaseProductId, string BaseProductName,
    IReadOnlyList<DecisionVariantSideDto> From, IReadOnlyList<DecisionVariantSideDto> To,
    decimal AmountImpact, decimal? BaselineKnownAmount, decimal? CurrentKnownAmount)
DecisionVariantSideDto(long ProductVariantId, long ProductId, string ProductName, string? VariantLabel)  // null = the base
```

  Built from `Transitions` (primary basis). The base name comes from `Families.BaseNameOf`, so it is there even when
  the base itself was ordered in neither month. With no transition the list is empty.
- The drivers, the steady list and `DecisionProductCountsDto` are built exactly as today. Members stay two drivers with
  their own names, states (`New` / `NoLongerOrdered`), figures and history; only their `Category` is `VariantChange`.
  The product counts do not change (13.1).
- The class summary's query count stays "Six"; name the approved-matches query in it instead of the spelling one.

### 4.5 The dashboard

In `ManagementDashboardQueries.GetAsync` / `Build`:

- Read `ApprovedMatches` once (replacing `:128`). `VariantsAsync` (`:499`) also selects `ProductId` (same query) so the
  role map can be built; pass it to `PeriodComparison.Of` (`:185`).
- `causes` still lists categories with amount ≠ 0, the primary is still the largest by |amount| then enum value (so
  `VariantChange` loses every tie), and the state counts (`counts.New` …) are unchanged — they go by product.
- When `CauseLeader` returns a transition, `DashboardCauseProductDto` names the **base product** (`Families.BaseNameOf`)
  with the transition's net amount and `SameDirectionAmount`. No DTO shape changes on the dashboard.
- The class summary's query count stays as it is; name the approved-matches query in it.

### 4.6 What does not change

- `OrderAnalyticsQueries.CompareAsync` (the comparison endpoint) and `GetTrendAsync` (the product history): a variant
  link keeps its two products apart (13.1). Neither has a "Niyə dəyişib?". They keep `SpellingFold.ReadAsync`.
- The monthly report, the dashboard's period list, `LastOrdersBeforeAsync`, the order's line table, the approval inbox,
  pricing review, the Products page, 13a's API, rules, authority and suggestion engine.
- Every product count on every screen (`StateOf` is by product).
- Nothing is written. No product, variant, alias, line, price, classification or decision.

### 4.7 The order page — "Niyə dəyişib?"

`frontend/bax-orders-web/src/components/decisions/CauseSummary.tsx`:

- The rows shown are the categories with amount ≠ 0 **plus `VariantChange` whenever the decomposition has a
  transition, even at 0.00**. They are sorted as today (size, then `causeTieOrder`). "Əsas səbəb" is only ever put on a
  row whose amount is not 0.
- The `VariantChange` row has its chip ("Variant dəyişib"), hint, "N məhsuldan", amount and bar like any other, and
  under its chip **one line per transition**, in the brief's own words:

  `Sabun elano — variant dəyişib: adi → lavanda ətirli` … `0,00 ₼`

  The base product's name; " — variant dəyişib: "; the `From` side's labels; " → "; the `To` side's labels. A null
  label (the base itself) reads "adi". A side with several labels joins its distinct labels with ", " (base first, then
  as the API orders them). The amount is `formatMoneyDelta` in the 9.1 colour, with `DirectionWord` for screen readers,
  as the other rows do.
- When no category moved, the existing sentence ("… məbləğ dəyişməyib.") is still shown, and the `VariantChange` row
  with its line(s) is shown under it. This is the HEM case.

`DriverList.tsx`: a driver whose category is `VariantChange` shows the pill "Variant dəyişib" (through `causeLabels`)
and a note in `Change`'s note line: `Variant dəyişib: adi → lavanda ətirli` (found by matching the driver's
`productVariantId` in the transitions). The chips are unchanged: "Yeni məhsullar" / "Bu ay yazılmayan" still go by state,
so both members are still counted there, as a new product with a missing price is today.

Types and words:

- `api/decisions.ts`: `CauseCategory` gains `'VariantChange'`; `DecisionDecomposition` gains
  `variantTransitions: DecisionVariantTransition[]` with its two types. Correct the comment "The six together …".
- `components/decisions/labels.ts`: `causeLabels.VariantChange = variantChangedLabel`; a hint — for example "Eyni əsas
  məhsulun bir variantı əvəzinə başqası sifariş olunub (administrator təsdiqləyib). Məbləğ fərqi bir sətirdə göstərilir;
  məhsullar ayrı qalır."; a neutral slate tone; `causeOrder` gets it after `NoLongerOrdered`; `causeTieOrder` gets it
  **last** (the backend's enum order, so the order page's first row and the card's "Əsas səbəb" still agree).
- `components/dashboard/labels.ts`: `causeHeadline('VariantChange', …)` → "Variant dəyişib".
- `terminology/terms.ts` ("product matches (Task 13)" section): `variantChangedLabel = 'Variant dəyişib'`,
  `baseVariantWord = 'adi'`, and `variantTransitionLine(baseName, fromLabels, toLabels)` returning the sentence above.
  The driver note is built from the same pieces.
- Test fixtures typed as `DecisionDecomposition` gain `variantTransitions: []`. That is the only change allowed to an
  existing frontend fixture.

The layout rules of Task 12 hold: the line wraps at phone width, no horizontal scroll; the amount stays on one line.

## 5. Files — summary for the Coder

- Application: `Analytics/ApprovedMatches.cs` (new: `ApprovedMatches`, `VariantFamilies`, `VariantFamilyRole`,
  `VariantLink`). `Decisions/CauseDecomposition.cs`, `Decisions/PeriodComparison.cs`, `Decisions/CauseLeader.cs`,
  `Decisions/DecisionContextDtos.cs`, `Decisions/OrderDecisionContextQueries.cs`,
  `Analytics/Dashboard/ManagementDashboardQueries.cs`.
- Frontend: `api/decisions.ts`, `components/decisions/CauseSummary.tsx`, `components/decisions/DriverList.tsx`,
  `components/decisions/labels.ts`, `components/dashboard/labels.ts`, `terminology/terms.ts`; any other file `tsc`
  names for the new `CauseCategory` member; fixtures of §4.7.
- Tests: §9.

No migration, no snapshot change, no tool, no change under `tools/`, no change to `SpellingFold`, `ProductMatchService`,
`ProductMatchSuggestions`, `ProductMatchQueries`, `DoNotMergePairs`, `ProductMatchAuthority`, `OrderAnalyticsQueries`
or `MonthlyReportQueries`.

## 6. Safety and STOP conditions

- **No database access is needed or allowed.** This specification carries no data-migration line. Every test runs on
  the Postgres test fixture or an `IsolatedDatabase`. Do not run any tool under `tools/`, do not run the API against the
  real database, and do not stop or restart the running API.
- **No decision is made in the real database**, through the API or otherwise. Decisions exist only in test databases.
- **Only live approved Variant rows make a transition.** A suggestion, a rejected row, an undone row, a name that merely
  looks like a variant, or a normalised key must never produce one. If a test seems to need one, the test is wrong.
- **Money.** If any test shows a total, known amount, delta, percentage, per-variant `AmountImpact`, missing-price or
  internal-supply count changing because of a variant link, STOP and report. Do not adjust an expected value.
- **Task 2.** If the design seems to need a member with an owed missing price, internal supply or a service to join a
  transition, STOP: that would hide a price state the brief says must stay correct.
- Do not rework Tasks 1–12, 13a or 13b. A defect found there goes into the report.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and name the line.

## 7. Invariants — MUST NOT CHANGE

- With **no** live approved Variant link, every analytics response is exactly what it is at `c8a4747`, apart from the
  decision context's new empty `variantTransitions` list. The dashboard response is byte for byte the same. The real
  database is in that state.
- With one: every money figure (current, baseline, delta, percent, `TotalAmountImpact`, each variant's `AmountImpact`),
  every missing-price / internal-supply count, every product count and state, the comparison endpoint, the product
  history and the monthly report are exactly what they were without it. Only the categories' split, the drivers'
  `Category`, the new transition list, and the dashboard's cause / cause product may differ.
- The categories still add up exactly to the delta (in cents, after `ToCents`).
- 13b's spelling fold, Task 7's share rule when no transition exists, Task 9's colour rule, Task 10's `StateOf`, Task
  12's layouts, and the pinned query counts.

## 8. Acceptance criteria

1. **Acceptance 3 — the brief's example.** On 13a's `ProductMatchFixture`, after the Admin approves "Sabun elano lavanda
   ətirli" as a variant of "Sabun elano" (label "lavanda ətirli"), HEM's September decision context, on every one of the
   four standard bases, has exactly one transition: base "Sabun elano", from `[Sabun elano, label null]`, to `[Sabun
   elano lavanda ətirli, "lavanda ətirli"]`, amount 0.00 (baseline 750.00, current 750.00). Categories: `NewOrders` 0.00
   (count 0), `NoLongerOrdered` 0.00 (count 0) — each 750.00 less in size than before (+750.00 → 0.00, −750.00 → 0.00)
   — and `VariantChange` 0.00 (count 2). The order page renders "Sabun elano — variant dəyişib: adi → lavanda ətirli"
   with "0,00 ₼" in "Niyə dəyişib?" (frontend test on that response shape).
2. **A transition that moved money.** On a fixture where the base is 60 ədəd × 12.50 in August and the variant 70 ədəd ×
   12.50 in September: one transition of +125.00, `VariantChange` +125.00, and it is the primary cause. The dashboard row
   names "Sabun elano" (the base) with +125.00, and its share counts the transition as one effect (§4.3). The order
   page's first "Niyə dəyişib?" row is "Variant dəyişib" and the card's "Əsas səbəb" is the same.
3. **The rule's edges** (unit): no transition when only one side exists, when both sides are variants of one product,
   when the arriving member has an owed missing price (it stays `UnattributedDueToMissingPrice`, the left member stays
   `NoLongerOrdered`), when a member is internal supply or a service, or when the variant belongs to no family; two
   families give two transitions; several arriving members of one family give one transition with their sum; a spelling
   match folded into a variant whose own product has no link still carries the folded-away product's link; roles in two
   different families give no family.
4. **Acceptance 4 — separate until approved.** Before approval, after a **rejection**, and after an **undone** approval,
   HEM September has no transition and no `VariantChange` category, and every response is as at `c8a4747` (13b's tests
   unchanged).
5. **Acceptance 7 — no amount moves.** On the fixtures of criteria 1 and 2 and every basis: the order page's current /
   baseline / delta / percent, the dashboard summary and every object's money, the comparison endpoint, the product
   history of both products and the 2026 monthly report are identical before approval, after it and after its undo. The
   categories add up exactly to the delta, and every driver's `AmountImpact` is unchanged. A property test over random
   inputs proves the category sum and `TotalAmountImpact` are the same with and without roles.
6. **13.1 — two products stay two.** After approval, HEM's drivers are still "Sabun elano" (`NoLongerOrdered`, −750.00)
   and "Sabun elano lavanda ətirli" (`New`, +750.00), each with category `VariantChange`; `DecisionProductCountsDto` and
   the dashboard's state counts are unchanged (New 1, no longer ordered 1); the comparison endpoint still has two rows;
   each product's history is its own.
7. **Acceptance 8 — undo restores.** After undoing the Variant approval, the serialised decision contexts, dashboard,
   comparison, both histories and the monthly report equal the ones taken before the approval, byte for byte.
8. **Task 2.** A family whose arriving member owes a price: no transition, the unattributed money and
   `ExplanationIsComplete = false` stay as without the link, and the order's missing-price count is unchanged. An
   internal-supply member likewise stays `InternalSupply`.
9. **Query counts unchanged.** The decision context still runs 6 queries and the dashboard 6 (7 for "every prior
   month"); the existing exact assertions pass unchanged.
10. **The screens.** `CauseSummary` shows the transition line(s) under the "Variant dəyişib" row, at 0.00 too, never
    marks a 0.00 row "Əsas səbəb", and renders exactly as before when there is no transition. `DriverList` shows the
    pill and the note on both members. The dashboard's `causeHeadline` has the new category. `findOldTerms` finds nothing
    in the new texts.
11. **Nothing else changed.** Builds and suites are green. `git status` shows only the files of §5 and the tests of §9.

## 9. Required tests

Unit (`tests/BaxOrders.UnitTests`):

- `Analytics/VariantFamiliesTests.cs`: every clause of §4.1's `RoleOf` — base, variant with label, no family, the
  folded-away product's link, conflicting families → null, own role wins, empty → null. `ApprovedMatches`' spelling half
  equals `SpellingFold.Of` over the same SameItem rows.
- `Decisions/VariantTransitionTests.cs` (beside `CauseDecompositionTests`): every clause of §4.2 and criterion 3; the
  brief's example (criterion 1's figures); a money-moving transition; no roles / empty roles → a result equal to
  `Decompose(inputs)` at `c8a4747` (compare serialised); the property of criterion 5 over at least 5 seeds; `ToCents`
  with a transition: the categories add up to the delta in cents.
- `Decisions/CauseLeaderTests.cs`: add — a transition as leader (net amount, members not counted); a transition in the
  denominator when another category is primary; no transition → unchanged. Existing tests stay unchanged.

Integration (`tests/BaxOrders.IntegrationTests`, each on its own `IsolatedDatabase`):

- `VariantTransitionAnalyticsTests.cs` on `ProductMatchFixture`: criteria 1, 4, 5, 6, 7, 8 (the owed-price case may use
  its own small fixture), with approvals through `ProductMatchService` as the Admin (`TestCurrentUser.AdminAsync`).
  Reuse the serialise-and-compare pattern of `SpellingFoldAnalyticsTests` (`MoneyAsync`, `Json`).
- Criterion 2 on its own small fixture (base 60 in August, variant 70 in September, same price), including the dashboard
  row's cause and cause product.
- The spelling-plus-variant case of criterion 3 through the real services **if** 13a's service lets the two decisions
  be approved on a fixture; otherwise the unit test carries it and the report says why.

Deliberately changed existing tests — each named in the report with the brief line behind it (13.1a):

- `SpellingFoldAnalyticsTests.On_the_briefs_example_a_variant_link_folds_nothing_and_a_spelling_match_moves_no_amount`
  (13b criterion 7, which said "13c changes this"). After the Variant approval the comparison endpoint, both histories
  and the monthly report must still be equal to before; the decision context and the dashboard now differ by exactly
  §4.2. Keep its money assertions and its drivers assertion (both still hold), keep the final equality after both
  undos, rename it, and correct its summary.
- `ProductMatchTests.The_order_page_and_the_dashboard_do_not_move_when_a_match_is_approved_or_undone` (13a criterion 9).
  Replace only `Assert.Equal(before, afterApproval)` with: the money projection is equal, and the HEM context has
  exactly the one transition of criterion 1. Keep `Assert.Equal(before, afterUndo)` and the 750.00 / 750.00 / 0.00
  assertion. Correct its remark.
- If any other existing test fails, STOP and report it; do not change its expectation.

Frontend (vitest):

- `components/decisions/CauseSummary.test.tsx`: the HEM shape (every category 0, `VariantChange` 0 with one
  transition) shows the "məbləğ dəyişməyib" sentence and the exact line "Sabun elano — variant dəyişib: adi → lavanda
  ətirli" with "0,00 ₼", and no "Əsas səbəb"; a +125 transition is the "Əsas səbəb" row with its line; several labels on
  one side are joined; no transition → the existing tests pass unchanged.
- `components/decisions/DriverList.test.tsx`: the members' pill and note; both still counted under "Yeni məhsullar" /
  "Bu ay yazılmayan".
- The dashboard: `causeHeadline('VariantChange', …)`, and a card whose cause product is the base.
- `findOldTerms` over the new rendering returns `[]`.

No existing expectation may be weakened.

## 10. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors. `dotnet test BaxOrders.slnx` — baseline 951 unit / 741
  integration; give the new counts. If the running API locks `bin`, use `--artifacts-path` into the scratchpad, say so,
  and do not stop the API.
- `npm run --prefix frontend/bax-orders-web test` (baseline 44 files / 833 tests) and `… build` — green, with counts.
- `git diff --stat` and `git status`.

## 11. Out of scope

- Any effect of a variant link on the comparison endpoint, the product history, the monthly report or a product count.
- A "variant dəyişib" line for anything that is not a live approved Variant link, and any widening of 13a's suggestion
  rule.
- The menu, and who sees "Məhsullar" (Task 14). `PlannedFeature.tsx` (unused since 13b) — Task 14 or later.
- HD-002.

## 12. Operator notes (after review)

- No migration, no tool and no data change. Restart the API on the new commit before serving the new frontend (the
  order page reads `variantTransitions` and the new category).
- The real database has zero decisions, so every screen reads exactly as before. The live check of acceptance 3 is the
  operator's, not the Coder's: an administrator approves «Sabun elano lavanda ətirli» → «Sabun elano» on the Products
  page; HEM's September order then shows "Sabun elano — variant dəyişib: adi → lavanda ətirli · 0,00 ₼", "Yeni
  məhsullar" and "Bu ay yazılmayan məhsullar" are each 750.00 ₼ smaller, and "Keçən ay" is still +23,852.70. "Geri al"
  on the Products page restores the previous view.
- Rollback: `git reset` the commit. No data to restore.

## 13. Where the brief lands in 13c

| Brief | Here |
|---|---|
| 13.1a — one "variant dəyişib" line, only for an approved link | §4.1–4.5, §4.7; criteria 1–4 |
| 13.1 — variants stay separate, not one product | §4.2 (no split), §4.4, §4.6; criterion 6 |
| Amounts never change | §4.2 invariant, §7; criterion 5 |
| A wrong approval can be undone | criterion 7 |
| Task 1/1b/1c figures; Task 2 price states | criteria 5, 8 |
| Acceptance 3, 4, 7, 8 | criteria 1, 4, 5, 7 |

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. **A variant transition** is, within one family (a base and its live approved variants), at least one member that is
   new this month and at least one that is no longer ordered, of different products. A family that only gained or only
   lost a variant has no transition: nothing changed from one to the other.
2. **Only fully priced, purchased, quantity-comparable members** (`NewOrders` / `NoLongerOrdered`) take part. A member
   with an owed missing price, internal supply or a service stays in its own category, so Task 2's states cannot be
   hidden inside the line.
3. **One line per family**, holding every arriving and leaving member of it, so "bir sətirdə" holds even when two
   variants arrive at once.
4. The line's money is the **whole net** (current minus baseline), never split into quantity and price: the variants are
   different items (13.1), and a quantity effect across two items would compare unlike things.
5. **A new category, `VariantChange`** ("Variant dəyişib"), carries the line in "Niyə dəyişib?". It appears only when
   there is a transition, and on the order page it is shown even at 0.00, because the brief asks to see the 0.00 line.
   The dashboard card still lists only causes that moved money.
6. **"Əsas dəyişikliklər" keeps both products as rows**, with their own states and figures, and the product counts do not
   change (13.1). Only their pill says "Variant dəyişib", with a note naming the transition.
7. **The share rule (7.1a) counts a transition as one product effect** (its net). With no transition it is unchanged.
8. The base itself is shown as **"adi"**, the brief's own word in its example.
9. **Spellings fold first, then families** are applied to the kept variant. A link on a folded-away product still
   counts; links pointing at two different bases leave the variant in no family.
10. Both kinds of decision are read in **one query** on the two paths that need families, so no query count changes.
    The comparison endpoint and the product history keep their spelling-only read: they have no "Niyə dəyişib?" and keep
    the two products apart.
11. The live check of acceptance 3 on the real Heydər Əliyev order is the operator's (§12). The Coder proves it on 13a's
    fixture, which reproduces the brief's figures exactly, because no role may approve a match in the real database.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (`c8a4747`), `git status --short`, `git diff --stat`.
1. Oxuma — `ApprovedMatches`, `VariantFamilies`, `RoleOf`; the one query; where it replaced `SpellingFold.ReadAsync`;
   query counts before and after, with file:line.
2. Keçid qaydası — §4.2 clause by clause, with file:line; why money cannot move; `ToCents`; `CauseLeader`.
3. Ekranlar — the order page ("Niyə dəyişib?", "Əsas dəyişikliklər"), the dashboard card; the words added.
4. Acceptance — each criterion of §8 with the test that proves it, and criterion 1's figures before, after and after
   undo.
5. Testlər — new tests; the two deliberately changed tests with the brief line behind each; counts; builds.
6. Toxunulmayanlar — no data, no schema, no tool; the comparison endpoint, the history, the monthly report, the product
   counts; 13a and 13b.
7. Qeydlər — defects found elsewhere, and anything Task 14 should know.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
