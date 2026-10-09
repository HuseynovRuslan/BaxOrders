# TASK 07 — ƏSAS SƏBƏBİN MƏHSUL ADI VƏ PAYI İLƏ GÖSTƏRİLMƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-07.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** One small backend addition (a field on the dashboard row, computed from the
decomposition that is already in memory) and one dashboard component with its tests. It fits one Coder session.
Specification status: READY — written by the Planner on 2026-09-24 from the brief and the repository at `a5be6c0`
(Task 6's accepted commit). Line numbers below are at `a5be6c0`.

This task **reads** data and changes how the dashboard card presents it. It changes no stored figure, no schema, no
row in the database. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief's goal: "Panel kartı dəyişməni yalnız kateqoriya ilə yox, onu doğuran konkret malla izah etsin. Rəhbər
sifarişə girmədən 'bu artım traktordandır' deyə bilsin."

The owner's dependency table (`BRIEFS/OWNER_BRIEFS_MASTER.md`) gives Task 07 "Kartda əsas səbəbin malı və payı",
depending on 05. Task 09 depends on 07 and owns the rest of the dashboard (card titles, chips, table, the colour rule
itself, the warning repetition). Decisions 7.1 and 7.1a define the share; 9.1 is applied, not re-invented — Task 6
already wrote it once as `costDirectionToneClass` (`components/analytics/format.ts:315`).

## 2. Verified current behaviour (repository at `a5be6c0`)

### 2.1 The card

- `components/dashboard/AttentionSection.tsx` renders one `Card` per `DashboardAttention`. `Causes` (`:122–173`)
  shows the caption "Əsas səbəb" (`:135`), then `causeHeadline(primaryCause, primaryCauseAmount)` and the amount
  (`:136–141`), then up to two secondary causes (`secondaryCount = 2`, `:24`) sorted by `Math.abs(amount)` with **no
  tie rule** (`:127–130`), then the supply-change note, `incompleteExplanationNote` (`:162–164`, Task 9) and Task 2's
  missing-price count.
- No product is named anywhere on the card. The Rəhbər has to open the order and find the product in "Əsas
  dəyişikliklər" (`components/decisions/DriverList.tsx`).
- Colours on the card still follow the pre-9.1 rule `signedToneClass` (emerald up, rose down): the delta line (`:101`),
  the primary cause amount (`:138`), the secondary amounts (`:148`). So the same cause that the order page's
  "Niyə dəyişib?" shows red (Task 6) is green on the card.
- There is no `AttentionSection.test.tsx`. The card is exercised through `pages/ManagementDashboardPage.test.tsx` and
  the dashboard sweep in `terminology/oldTerms.test.tsx:942`.

### 2.2 Where the cause comes from

- `ManagementDashboardQueries.Build` (`src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs:145–285`)
  runs `PeriodComparison.Of` — the **same** call the order page makes (`OrderDecisionContextQueries.cs:177`) — so the
  decomposition, already allocated to cents by `CauseDecomposition.ToCents` (`PeriodComparison.cs:136–139`), is in
  memory for every row.
- `PrimaryCause` is the non-zero category with the largest `|Amount|`, ties by the `CauseCategory` enum value
  (`:202–204`).
- `decomposition.Variants` holds every variant's `VariantCauseResult`: `ProductVariantId`, `Category` (the single
  category it is filed under), `AmountImpact` (its whole contribution, rounded to the cent by `ToCents`), sorted by
  `|AmountImpact|` descending, then `ProductVariantId` (`CauseDecomposition.cs:209`).
- The order page's "Əsas dəyişikliklər" is exactly that list minus variants that moved nothing
  (`OrderDecisionContextQueries.Explain`, `:200–253`), each row showing `variant.productName` (= `Product.Name`,
  `:316`) and `amountImpact` (`DriverList.tsx:100,116–119`).
- The dashboard reads no product names today: `KindsAsync` (`:433–446`) reads only each variant's order unit, and its
  doc comment says "the dashboard lists no products".
- `DashboardCauseTests.Naming_a_cause_for_every_object_costs_no_extra_query`
  (`tests/BaxOrders.IntegrationTests/DashboardCauseTests.cs:208–230`) pins the dashboard at **five** queries.
- `ComparisonBasisConsistencyTests` (`:69–100`) already proves, for every basis, that the card's causes equal the
  order page's categories to the qəpik.

### 2.3 The row contract

`LocationDashboardRowDto` (`DashboardDtos.cs:58–98`) ↔ `LocationDashboardRow` (`frontend/.../api/dashboard.ts`). It is
constructed in one place only (`ManagementDashboardQueries.cs:228`). Frontend fixtures that build a full row:
`pages/ManagementDashboardPage.test.tsx:39–81`, `components/dashboard/LocationRows.test.tsx` (`row()` near `:71` and
`:450`), `terminology/oldTerms.test.tsx:172–200`, and possibly `src/test/dashboardFixtures.ts`.

## 3. Scope

In scope:

- A. The backend names, for every dashboard row with a primary cause, the product with the largest effect in that
  cause, its amount, and the sum of all product effects in the same direction (7.1, 7.1a).
- B. Every attention card shows that product under its "Əsas səbəb": name, amount, share.
- C. Decision 9.1 applied to the figures on the attention card (the delta line, the primary cause, the product line,
  the two secondary causes), through Task 6's `costDirectionToneClass`.
- D. The secondary causes on the card use the tie order `causeTieOrder` (`decisions/labels.ts:71`).
- E. Tests.

Out of scope (the brief's list, plus what belongs to later tasks):

- card titles, the colour rule itself, the repeated warning (`incompleteExplanationNote` on the card, and the
  missing-price line) — Task 9;
- the "Bütün obyektlər" table (`LocationRows.tsx`), including its own "Əsas səbəb" column and its `signedToneClass`,
  and `DashboardSummary.tsx` — Task 9;
- "Niyə dəyişib?" and its order — Task 6 (accepted; do not touch `CauseSummary.tsx`);
- "Əsas dəyişikliklər" (`DriverList.tsx`), its sort and colours — Task 10;
- false product pairs from name differences, variants, "variant dəyişib" — Task 13;
- mobile layout — Task 12.

## 4. Required behaviour

### 4.1 The rule (7.1, 7.1a), written once in the backend

Add a pure static function next to the decomposition, in `src/BaxOrders.Application/Decisions/` (a new file, e.g.
`CauseLeader.cs`; the Coder may choose the name), unit-testable without a database:

```csharp
/// The product that did most of the primary cause, and how much of the movement in its direction it accounts for.
public sealed record CauseLeaderResult(long ProductVariantId, decimal Amount, decimal SameDirectionAmount);

public static CauseLeaderResult? Of(CauseDecompositionResult? decomposition, CauseCategory? primary, decimal? primaryAmount)
```

Rule, exactly:

1. Null when `decomposition`, `primary` or `primaryAmount` is null, or `primaryAmount` is 0.
2. **Direction** = the sign of `primaryAmount`.
3. **Candidates** = `decomposition.Variants` whose `Category == primary` and whose `AmountImpact` has the direction's
   sign (strictly: `> 0` for an increase, `< 0` for a decrease).
4. **Top product** = the candidate with the largest `|AmountImpact|`; ties by the lowest `ProductVariantId`. This is
   the order `Variants` already has, so it is simply the first candidate in that list — and therefore the first row of
   that category and sign in the order page's "Əsas dəyişikliklər".
5. **SameDirectionAmount** = the sum of `AmountImpact` over **every** variant of the decomposition with the direction's
   sign — every category, including "Qiymət yoxdur" and "Daxili təminat" — never only the primary category's.
   (Brief: "Artımda artan, azalmada azalan bütün məhsulların təsirləri toplanır".)
6. Null when there is no candidate.

Consequences the tests must pin: `Amount` and `SameDirectionAmount` have the same sign; `|Amount| ≤
|SameDirectionAmount|`, so the share never exceeds 100%; both are sums of the cent figures the order page prints, so a
reader can check them there.

### 4.2 The dashboard row (backend)

- New DTO in `DashboardDtos.cs`:

  ```csharp
  /// <summary>The product that did most of the primary cause, with the movement in its direction it is a share of.</summary>
  public sealed record DashboardCauseProductDto(
      long ProductVariantId, string ProductName, decimal Amount, decimal SameDirectionAmount);
  ```

- `LocationDashboardRowDto` gains `DashboardCauseProductDto? PrimaryCauseProduct`, placed right after
  `PrimaryCauseAmount`. `Build` fills it from 4.1 with the `primary` it already chose. Null when 4.1 returns null or
  the variant's name was not read.
- **No new query.** Extend the existing variant query (`KindsAsync`, `:433–446`) to read `Product.Name` beside the
  order-unit code, returning both (rename it, e.g. `VariantsAsync`, and update its doc comment — the dashboard now
  names one product per row). `Naming_a_cause_for_every_object_costs_no_extra_query` must still see **5**; update only
  its explanatory comment ("…and the variant kinds and names").
- `PrimaryCause`, `PrimaryCauseAmount`, `Causes`, every amount and the attention selection are unchanged.

### 4.3 The card (frontend)

`api/dashboard.ts`: add

```ts
export interface DashboardCauseProduct {
  productVariantId: number
  productName: string
  amount: number
  sameDirectionAmount: number
}
// on LocationDashboardRow, after primaryCauseAmount:
/** The product that did most of the primary cause (7.1, 7.1a). Null when no product does. */
primaryCauseProduct: DashboardCauseProduct | null
```

In `AttentionSection.tsx`, `Causes`:

```
Əsas səbəb
Yeni məhsullar  +29.691,52 ₼
Traktor qazonbiçən RT-6127.1 ZL — +21.900,00 ₼ (artımların 70%-i)
Bu ay yazılmayan məhsullar −5.259,62 ₼
Miqdar azalması −309,20 ₼
```

- The product line sits **directly under** the primary cause line and above the secondary causes. Its size sits
  between them: `text-sm`, name `text-slate-700`, amount `font-medium`. The primary cause line stays the loudest thing
  in the block (brief: "əsas kateqoriya sətri … qalır"; Task 9 brief: "'Əsas səbəb' sətri oxunaqlı qalır").
- Text: `{productName} — {formatMoneyDelta(amount)} ({share})`. The amount uses the card's own money format (to the
  qəpik, Task 1c / 5a), not the brief's rounded "+21,900 ₼".
- `{share}` comes from one builder in `terminology/terms.ts`, e.g. `productShareLabel(amount, sameDirectionAmount)`:
  - the word is `artımların` when `amount > 0`, `azalmaların` when `amount < 0`;
  - the percent is `|amount| / |sameDirectionAmount| × 100`, rounded to a whole number (half away from zero) and
    formatted in `az-Latn-AZ`, followed by `%-i` — "artımların 74%-i";
  - two guards so the figure is never false: a share that is not exactly 100% never prints as 100 (it prints 99); a
    share above 0 that rounds to 0 prints `artımların 1%-dən azı` / `azalmaların 1%-dən azı`;
  - it never prints more than 100 — guaranteed by 4.1, and asserted in its unit test.
- When `primaryCauseProduct` is null the block renders exactly as today, minus nothing.
- The product line is a line of text, not a link; the "Detallara bax" button already opens the order.

### 4.4 Colour by direction (9.1) on the card

- In `AttentionSection.tsx` replace every `signedToneClass` with `costDirectionToneClass`: the delta line (`:101`),
  the primary cause amount (`:138`), the secondary amounts (`:148`), and use it for the new product amount. After this
  task `AttentionSection.tsx` does not import `signedToneClass`.
- The big month amount (`:93–95`) stays uncoloured (its comment says why). Amber stays reserved for warning cards.
- Colour is not the only carrier: the words already carry the direction — the sign on every amount,
  `causeHeadline`'s "artımı / azalması", and the share's "artımların / azalmaların". Additionally give the delta line
  and the product amount an `sr-only` direction word from `costIncreasedLabel` / `costDecreasedLabel` (`terms.ts`), as
  Task 6 did. No "yaxşı / pis" anywhere.
- `signedToneClass`'s behaviour is unchanged; its remaining users after this task are Task 8's, Task 9's
  (`DashboardSummary.tsx`, `LocationRows.tsx`) and Task 10's. Update the report's list accordingly.

### 4.5 Secondary causes, same tie rule as everywhere

`Causes` sorts the secondary causes by `Math.abs(amount)` descending, **then by `causeTieOrder`**. Still two of them
(`secondaryCount` unchanged), still excluding the primary.

### 4.6 The basis

Nothing to build: the dashboard row is already computed for the basis in the URL (Task 1), so a change of basis
refetches the row and the product, amount and share with it. Tests prove it (§10).

---

## 5. Files — summary for the Coder

Changed (expected):

- Backend: `Application/Decisions/<new file>.cs` (4.1); `Application/Analytics/Dashboard/DashboardDtos.cs`;
  `Application/Analytics/Dashboard/ManagementDashboardQueries.cs` (the field, the widened variant query).
- Backend tests: a new unit-test file under `tests/BaxOrders.UnitTests/Decisions/`;
  `tests/BaxOrders.IntegrationTests/DashboardCauseTests.cs`; `tests/BaxOrders.IntegrationTests/ComparisonBasisConsistencyTests.cs`.
- Frontend: `api/dashboard.ts`; `components/dashboard/AttentionSection.tsx`; `terminology/terms.ts` (the share
  builder); tests — a new `components/dashboard/AttentionSection.test.tsx`, `terminology/terms.test.ts`,
  `pages/ManagementDashboardPage.test.tsx`, `terminology/oldTerms.test.tsx`, and every fixture that builds a full
  `LocationDashboardRow` (it gains `primaryCauseProduct`).

Not changed: `CauseDecomposition.cs`, `PeriodComparison.cs`, `OrderDecisionContextQueries.cs` and the decision-context
API; `CauseSummary.tsx`, `DecisionHeadline.tsx`, `DriverList.tsx`, `TrendModal.tsx`; `LocationRows.tsx`,
`DashboardSummary.tsx`, `components/dashboard/labels.ts` (`causeHeadline` and the card titles); `signedToneClass`'s
behaviour; `incompleteExplanationNote`; `pricing/labels.ts`.

Keep the codebase's idiom: comments say *why*; one word per idea from `src/terminology`; C# XML doc comments on the
new record and function in the style of `CauseDecomposition.cs`.

## 6. Backend requirements

- As 4.1 and 4.2. Pure arithmetic over the in-memory decomposition, plus one more column in an existing query.
- Read-only. The dashboard still writes nothing (`Reading_the_dashboard_writes_nothing` stays green).
- No schema change, no EF migration, no change to any other endpoint.
- If a requirement seems to need a change to `CauseDecomposition` or to the order page's API, **STOP** and report why.

## 7. Safety and STOP conditions

- **No access to the real database**: do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`. Integration tests use their own disposable databases, as in every earlier task.
- No data change; HD-002's 94 rows untouched.
- No figure changes: every amount, cause, delta, percentage and attention choice stays what it is.
- Do not rework Tasks 5 or 6; a defect found there goes into the report.
- Do not touch the screens of later tasks (§3 out of scope), even to "make the colours consistent".
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- The card's primary cause and its amount; the two secondary causes are still there (brief: "əsas kateqoriya sətri və
  iki köməkçi sətir qalır").
- The card and the order page show the same figures for the same order and basis (Task 1); the product's amount on
  the card equals that product's row in the order page's "Əsas dəyişikliklər" to the qəpik.
- "Əsas dəyişikliklər" still sorts by effect, so the tractor stays its first row (brief) — `DriverList` and the
  decomposition's variant order are not touched.
- Totals to the qəpik (Task 1c); the causes add up to the difference (`ComparisonBasisConsistencyTests` stays green).
- Task 2's words; Task 5's words ("Yeni məhsullar", "Bu ay yazılmayan məhsullar", "məhsul"); the old-terms sweep
  stays green; no product or object code on the card (05b).
- The attention selection, the card titles, the table, the summary: unchanged.
- The dashboard's query count: 5.
- No schema, migration or data change.

## 9. Acceptance criteria

1. A Heydər Əliyev-shaped card (Keçən ay: "Yeni məhsullar +29.691,52 ₼" primary; a new product "Traktor qazonbiçən
   RT-6127.1 ZL" +21.900,00 ₼ among the new products; total +23.852,70 ₼) shows under "Əsas səbəb" the line
   "Traktor qazonbiçən RT-6127.1 ZL — +21.900,00 ₼ (artımların N%-i)" with N ≤ 74. *(brief acceptance 1)*
2. A Fəvvarələr-shaped card (Keçən ay: "Bu ay yazılmayan məhsullar −8.093,70 ₼" primary; "Yay ayaqqabısı" −1.988,00 ₼)
   shows "Yay ayaqqabısı — −1.988,00 ₼ (azalmaların N%-i)" with N ≤ 25. *(brief acceptance 2)*
3. The share is the top product's effect over the sum of **all** product effects in the same direction, across every
   category (7.1, 7.1a); it never exceeds 100% on any card and any basis; changing the basis updates it.
   *(brief acceptance 3)*
4. The product is the one with the largest effect **within** the primary cause, in its direction, and it is the first
   row of that category and sign in the order page's "Əsas dəyişikliklər"; its amount is that row's amount.
5. The primary cause line and two secondary causes remain; secondaries break ties by `causeTieOrder`.
6. On the attention card an increase is red and a decrease green (delta, primary cause, product, secondaries), through
   `costDirectionToneClass`; `AttentionSection.tsx` no longer uses `signedToneClass`. *(decision 9.1)*
7. No card shows a product line when there is no primary cause or no qualifying product; nothing else on it changes.
8. The dashboard still runs 5 queries and writes nothing; no figure changed; the table, the summary, the order page
   and every other screen are unchanged; all suites and both builds green; the old-terms sweep passes.

## 10. Required tests

Backend — unit (`tests/BaxOrders.UnitTests/Decisions/`, on the function of 4.1, built from `VariantCauseResult`s or
through `CauseDecomposition.Decompose` + `ToCents`):

- Heydər Əliyev-shaped: several new products summing to 29.691,52 including one of 21.900,00, plus other rising
  variants (e.g. a price rise) and falling ones → top is the 21.900,00 variant; `SameDirectionAmount` is the sum of
  every positive impact (≥ 29.691,52); the ratio ≤ 0,7376.
- Fəvvarələr-shaped: falling "no longer ordered" variants summing to −8.093,70 including −1.988,00, plus other falling
  variants → top −1.988,00; `SameDirectionAmount` ≤ −8.093,70; ratio ≤ 0,2457.
- A larger variant filed under **another** category is not chosen, but is counted in `SameDirectionAmount` when it
  points the same way.
- A variant in the primary category moving the **opposite** way is neither chosen nor counted.
- "Qiymət yoxdur" and "Daxili təminat" variants pointing the same way are counted.
- Tie in `|AmountImpact|` → the lower `ProductVariantId`.
- The only product in its direction → `Amount == SameDirectionAmount`.
- No candidate, a null decomposition, a null or zero primary → null.

Backend — integration:

- `DashboardCauseTests`: a month of new products names the largest new product with its `Product.Name`, amount and
  same-direction sum; a month that stopped ordering something names it with a negative amount; no previous month → null;
  `Naming_a_cause_for_every_object_costs_no_extra_query` still 5 (comment updated only).
- `ComparisonBasisConsistencyTests`, over `EveryBasis`: the card's `PrimaryCauseProduct` is the first driver of the
  order page's decomposition with `Category == PrimaryCause` and the same sign; its amount equals that driver's
  `AmountImpact`; `SameDirectionAmount` equals the sum of the drivers' `AmountImpact` of that sign; `|Amount| ≤
  |SameDirectionAmount|`.

Frontend (vitest):

- `terms.test.ts`: the share builder — "artımların 74%-i" (e.g. 21900 / 29691.52), "azalmaların 25%-i"
  (−1988 / −8093.70 → rounds to 25), exact 100 → "…100%-i", 99.6 → "…99%-i", 0.3 → "…1%-dən azı"; never a number
  above 100; passes `findOldTerms`.
- New `components/dashboard/AttentionSection.test.tsx`:
  - the Heydər Əliyev card: caption "Əsas səbəb", the primary line, the product line with name, "+21.900,00 ₼" and
    "artımların N%-i" with N ≤ 74, then two secondaries;
  - the Fəvvarələr card: "Yay ayaqqabısı", "−1.988,00 ₼", "azalmaların N%-i" with N ≤ 25;
  - colours: delta, primary, product and secondary amounts red for increases and green for decreases; no
    `text-emerald-700` on an increase and no `text-rose-700` anywhere on the card;
  - the `sr-only` direction words; no "yaxşı/pis";
  - `primaryCauseProduct: null` → no product line, primary and secondaries as before;
  - equal secondaries → `causeTieOrder` decides.
- `ManagementDashboardPage.test.tsx`: changing the basis refetches with the new basis and the card shows the new
  product line and share from the new response.
- `terminology/oldTerms.test.tsx`: the dashboard fixture carries a product so the product line is swept.
- Fixtures that build a full `LocationDashboardRow` gain `primaryCauseProduct` (null unless the test is about it). This
  is a mechanical change; list the files in the report. No expectation may be weakened to pass.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`--artifacts-path` into the scratchpad if the running API
  locks `bin`; say so, and do not stop the API).
- `dotnet test BaxOrders.slnx` — all green; unit and integration counts **up** from Task 6's 797 / 609 by the new
  tests only.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  (`tsc -b` is the type check) — green, with counts (Task 6: 36 files / 551 tests).
- `git diff --stat`, `git status`: changes only under `src/BaxOrders.Application/`, `tests/` and
  `frontend/bax-orders-web/src/`.
- The brief's real figures (Heydər Əliyev ≤ 74%, Fəvvarələr ≤ 25%) cannot be read without the real database, which
  this task does not touch. They are proven by construction (4.1: the denominator contains every product the brief
  sums, and more) and by the fixture tests above. Say in the report that the operator can confirm them on the running
  dashboard after the API is restarted on this commit.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Hər diqqət kartında əsas səbəbin yanında ən böyük təsirli mal: adı, məbləği, payı. | §4.1 rule 3–4, §4.3; criteria 1, 2, 4 |
| Pay ayrı-ayrı məhsul təsirlərinə görə; top / eyni istiqamətdəki bütün məhsul təsirlərinin cəmi (7.1, 7.1a); 100%-i keçmir. | §4.1 rule 5, §4.3 builder; criterion 3 |
| Heydər Əliyev: "Traktor … — +21,900 ₼ (artımların …%-i)", ≤ 74%. | criterion 1; §10 |
| Fəvvarələr: "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)", ≤ 25%. | criterion 2; §10 |
| Pay seçilmiş bazaya görə (Task 1); kart sifariş səhifəsi ilə eyni rəqəmlər. | §4.6, §8; criteria 3, 4; `ComparisonBasisConsistencyTests` over every basis |
| Cəmlər qəpiyinə qədər (Task 1c). | §4.1 (cent figures), §8 |
| 5.1 — "Yeni məhsullar", "Bu ay yazılmayan məhsullar". | §8 (used as they are, via `causeHeadline`) |
| 9.1 — kartdakı məbləğin rəngi istiqamətə görə. | §4.4; criterion 6 |
| Əsas kateqoriya sətri və iki köməkçi sətir qalır. | §4.3, §4.5, §8; criterion 5 |
| Traktor "Əsas dəyişikliklər"də birinci qalır. | §8; nothing in `DriverList` or the variant order changes |
| Task 13 qeydi (Sabun elano, sərhəd 76%). | Nothing to do here: the rule does not depend on how Task 13 later splits the products |
| Acceptance 1–3 | criteria 1, 2, 3 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. "Məhsul" is the variant, exactly as "Əsas dəyişikliklər" lists it (the decomposition's identity is the variant, and
   the list shows `Product.Name`). The card shows that same name, so it matches the row the Rəhbər would find.
2. "Həmin səbəbdə" means the variants **filed under** the primary cause — the category the order page's list gives
   each row — and the product's amount is its whole `AmountImpact`, the figure that row shows. For the two split
   categories this is the variant's whole difference, not its quantity or price part alone.
3. The top product is taken only among variants moving in the primary cause's direction; a variant in the same
   category moving the other way does not explain the cause.
4. "Eyni istiqamətdə olan bütün məhsul təsirləri" is every variant of the comparison with that sign, whatever its
   category — "Qiymət yoxdur" and "Daxili təminat" included — using the same cent figures the order page prints.
5. The rare case in which no variant filed under the primary cause points its way (possible only for the split
   categories) shows no product line rather than a product from another category.
6. The share is computed in the browser from two figures the backend sends (`amount`, `sameDirectionAmount`); the rule
   that decides *which* figures lives in the backend, once.
7. The share is printed as a whole percent, with two guards so it is never false: never "100" unless it is all of it,
   never "0" when it is something ("1%-dən azı").
8. The product's amount is printed to the qəpik like every other amount on the card, not rounded as in the brief's
   illustration.
9. The product line goes under the primary cause line, quieter than it and louder than the secondaries; it is text,
   not a link.
10. 9.1 is applied to every figure on the attention card, including its delta line, because the brief's 9.1 line
    speaks of "kartdakı məbləğ" and a card coloured by two opposite rules would contradict itself. The table and the
    summary stay for Task 9.
11. The secondary causes adopt `causeTieOrder`, so the card's order of causes and the order page's agree on ties too.
12. Product names are read in the dashboard's existing variant query, so the dashboard stays at five queries.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 6's commit `a5be6c0`), `git status --short`, `git diff --stat`.
1. Qayda (7.1, 7.1a) — where the function lives, the rule in one paragraph, what the denominator contains.
2. Backend — the new DTO and field, the widened query, the query count.
3. Kart — before/after text of the Heydər Əliyev and Fəvvarələr cards; the share builder and its guards.
4. Rənglər (9.1) — what moved to `costDirectionToneClass`; who still uses `signedToneClass`, and which task moves it.
5. Baza — how the tests prove the share follows the basis.
6. Testlər — new tests; changed tests and fixtures, each with the reason; counts; builds.
7. Toxunulmayanlar — no database reached, no figure changed, order page / table / summary intact, Tasks 5 and 6 intact.
8. Sonrakı tapşırıqlar üçün qeydlər — for 9, 10, 12, 13.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
