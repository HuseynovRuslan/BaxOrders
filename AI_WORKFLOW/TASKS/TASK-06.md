# TASK 06 — "NİYƏ DƏYİŞİB?" BÖLMƏSİ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-06.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** The work is three frontend components and their tests; it fits one Coder session.
Specification status: READY — written by the Planner on 2026-09-24 from the brief and the repository at `1e065a8`
(05b's accepted commit). Line numbers below are at `1e065a8`.

This task changes **frontend presentation only**: order, emphasis, colour and wording of the order page's comparison
line and its "Niyə dəyişib?" section. It changes no figure, no API, no database, no data. There is no
`DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief's goal: "Rəhbər sifariş səhifəsində 'nə qədər dəyişib' rəqəmindən dərhal əsas səbəbə keçsin. Əsas səbəb
birinci və seçilmiş görünsün, xəbərdarlıq yalnız həqiqətən lazım olanda çıxsın."

The owner's dependency table (`BRIEFS/OWNER_BRIEFS_MASTER.md`) gives Task 06 ownership of "Sifariş səhifəsinin
müqayisə sətri və 'Niyə dəyişib?'", and says the colour rule belongs to Task 09 (decision **9.1**: a cost increase
is red, a decrease green, presented as the direction of the cost and never as good/bad). Task 06 runs before 09, so
it is the first to put 9.1 into code: it writes the rule **once**, in one shared helper, and applies it on the two
parts of the order page it owns. Tasks 08, 09, 10 and 11 later move their own screens onto the same helper
(`WORKFLOW_RULES.md` §10: 06 applies the rule, it does not invent its own).

## 2. Verified current behaviour (repository at `1e065a8`)

### 2.1 Where the two pieces live

- `pages/OrderDetailPage.tsx:220–226` renders `DecisionHeadline` (the amount and the comparison line);
  `:272` renders `<CauseSummary decomposition={decision.decomposition} />`, then `DriverList` ("Əsas dəyişikliklər",
  Task 10's) below it. Both come from `GET /api/v1/orders/{id}/decision-context?basis=…`
  (`api/decisions.ts`, `OrderDecisionContext`); `decomposition` is computed against `primary`, the basis the reader
  chose (Task 1).
- `components/decisions/CauseSummary.tsx` — "Niyə dəyişib?".
- `components/decisions/DecisionHeadline.tsx` — the comparison line.

### 2.2 The order of the parts is fixed, not by size

`CauseSummary.tsx:16` keeps `decomposition.categories` in the order the backend returns them —
`CauseDecomposition.Order` (`src/BaxOrders.Application/Decisions/CauseDecomposition.cs:156–165`): NewOrders,
QuantityChange, PriceChange, NoLongerOrdered, Services, InternalSupply, UnattributedDueToMissingPrice — and drops
the zero ones. So for Fəvvarələr meydanı (Sentyabr 2026, Keçən ay) the largest part, "Bu ay yazılmayan məhsullar
−8.093,70 ₼", is the fourth row. Every row has the same weight.

### 2.3 Colours

- `CauseSummary.tsx:75–83` `barToneClass`: bars are coloured by **category** (sky, indigo, violet, slate…); the
  "Bu ay yazılmayan məhsullar" bar is `bg-slate-400` — grey, which is why the largest part does not stand out.
- The category chips use `causeToneClass` (`decisions/labels.ts:41–50`, shared with `DriverList`), whose comment says
  "nothing here is green or red".
- `CauseSummary.test.tsx:115–123` asserts exactly that ("never calls a rise bad or a fall good — nothing here is green
  or red"). That test encodes the rule 9.1 replaces.
- `DecisionHeadline.tsx:94,97,163` colour the deltas with `signedToneClass` (`analytics/format.ts:302–308`):
  **emerald up, rose down** — the opposite of 9.1. That is the "böyük yaşıl fərq" of the audit.
- `signedToneClass` is also used by the dashboard (`AttentionSection`, `DashboardSummary`, `LocationRows` — Task 9),
  the monthly report (`MonthlyReportTable` — Task 8), `DriverList` and `TrendModal` (Task 10).

### 2.4 The warning contradicts the arithmetic

- `CauseSummary.tsx:65–69` shows `incompleteExplanationNote` ("Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi
  sətirlərdə qiymət yoxdur.", `terminology/terms.ts:44`) whenever `decomposition.explanationIsComplete` is false.
- The backend sets that flag false as soon as **one variant** has a line whose owed price is missing
  (`CauseDecomposition.cs:203,211`), whatever money it moved. A variant priced on neither side moves 0,00 ₼ of known
  money; its part "Qiymət yoxdur" (`UnattributedDueToMissingPrice`) is then 0,00 ₼ and is hidden (`:16`), yet the
  warning still says the change cannot be explained. That is the Fəvvarələr, Heydər Əliyev and Nərimanov case of the
  brief: the shown parts add up to "Cəmi" to the qəpik and the section still claims otherwise.
- The warning says nothing concrete: not how much is unexplained, not which products.
- Internal supply already never raises it (backend and the test at `OrderDecisionPage.test.tsx:870–895`).

### 2.5 The comparison line does not say which figure is the basis

`DecisionHeadline.tsx:90–100`: under "Müqayisə: Son 6 ayın ortalaması (…)" the line is `17.583,62 ₼`, then a large
coloured delta and a percentage, with no word saying the first is the basis and the second the difference.

### 2.6 Smaller facts the Coder needs

- The zero-change sentence `CauseSummary.tsx:29–31` says "Keçən aya görə məbləğ dəyişməyib." whatever basis the
  reader chose — wrong on every basis but "Keçən ay" (the brief: "Müqayisə seçilmiş bazaya görə aparılır").
- The dashboard's "Əsas səbəb" is chosen in `ManagementDashboardQueries.cs:202–204`: the non-zero category with the
  largest absolute amount, ties broken by the `CauseCategory` enum value (NewOrders 1, QuantityChange 2,
  PriceChange 3, NoLongerOrdered 4, Services 5, UnattributedDueToMissingPrice 6, InternalSupply 7). Note that this
  tie order puts UnattributedDueToMissingPrice **before** InternalSupply, unlike `CauseDecomposition.Order`.
- `DecisionDecomposition.drivers` (`api/decisions.ts`) lists every variant that moved money **and every variant whose
  price is incomplete** (`OrderDecisionContextQueries.cs:208–214`), largest money first; each carries `category`,
  `amountImpact`, `variant.productName`.
- `decomposition.supplyChangedVariantCount` counts products paid for in one month and supplied internally in the
  other; `supplyChangedDriverNote = 'Təchizat forması dəyişib: alınan / şirkətdaxili'` (`decisions/labels.ts:84`) is
  today shown only on driver rows.
- Retired words the new text must not use (`src/test/oldTerms.ts`): among them "məhsulun qiyməti yoxdur",
  "Qiyməti olmayanlar", "qiymətsiz", "Artıq sifariş olunma…", "mövqe".

---

## 3. Scope

In scope, all on the order page (`/orders/:id`) and nowhere else:

- A. "Niyə dəyişib?" parts ordered by absolute size; the largest first and marked;
- B. owner decision 9.1 applied to every bar, every part amount and "Cəmi" of that section, and to the deltas of the
  comparison line (primary and the small secondary bases) — through **one** new shared helper;
- C. the warning shown only when an unexplained part exists, saying concretely how much and which products;
- D. "Baza" and "Fərq" written on the comparison line;
- E. the section speaks about the chosen basis (caption and zero-change sentence);
- F. tests.

Out of scope (the brief's list, plus what belongs to later tasks):

- the part names — Task 5 (5.1) settled them; this task uses `newProductsLabel` / `notOrderedThisMonthLabel` as they
  are;
- the product name and share on the dashboard card — Task 7;
- "Əsas dəyişikliklər" (`DriverList`) below the section, including its colours and badges — Task 10;
- the product history modal (`TrendModal`) — Task 10;
- the dashboard, the monthly report, the objects list and the comparison page, including their use of
  `signedToneClass` and of `incompleteExplanationNote` — Tasks 8, 9, 11;
- name differences and variant transitions, including the "variant dəyişib" line — Task 13 (13.1a);
- mobile layout — Task 12.

## 4. Required behaviour

### 4.1 The colour rule, written once (B)

Add to `components/analytics/format.ts`, next to `signedToneClass`:

```ts
/**
 * Owner decision 9.1: a cost that went up is red and a cost that went down is green. It is the direction of the
 * cost, never a verdict — more is not worse and less is not better. Zero and unknown are slate.
 */
export function costDirectionToneClass(value: number | null | undefined): string   // text: red-700 / emerald-700 / slate-600
export function costDirectionBarClass(value: number | null | undefined): string    // fill: red-500 / emerald-500 / slate-300
```

And to `terminology/terms.ts` the two words that explain the colour, so no screen writes its own:

```ts
export const costIncreasedLabel = 'xərc artıb'
export const costDecreasedLabel = 'xərc azalıb'
```

Leave `signedToneClass` **unchanged** in behaviour; replace its doc comment's first line with a pointer that it is
the pre-9.1 rule, kept only for screens Tasks 08, 09, 10 and 11 will move onto `costDirectionToneClass`. Nothing in
this task's two components may use `signedToneClass` afterwards.

### 4.2 The parts, largest first (A)

In `CauseSummary`:

- Shown parts are the categories whose `amount !== 0` (unchanged). Order them by `Math.abs(amount)` descending.
  Ties: the dashboard's order — NewOrders, QuantityChange, PriceChange, NoLongerOrdered, Services,
  UnattributedDueToMissingPrice, InternalSupply — so the order page's first part and the dashboard card's "Əsas
  səbəb" are always the same category for the same order and basis (brief: "panel kartı ilə eynidir"). Put that tie
  order in `decisions/labels.ts` as its own exported constant with a comment naming `ManagementDashboardQueries`;
  do not reorder `causeOrder` (the driver filter uses it).
- The first part is marked: a small caption **"Əsas səbəb"** (the dashboard card's own words, `AttentionSection.tsx:135`)
  above or beside its label; its label and amount are larger/bolder than the others; the row sits on a light
  background or ring. The other rows keep today's size. Tests find the marked row by its visible caption; a
  `data-primary` attribute on the row may be added for them (not `aria-current`, which means something else).
- Bar widths stay a share of the largest part (so the first bar is full width).
- The "Cəmi" figure and the list are unchanged in value; the shown amounts still add up to "Cəmi" to the qəpik.

### 4.3 Colour by direction (B)

- Every bar: `costDirectionBarClass(amount)`. Every part amount and "Cəmi": `costDirectionToneClass(amount)`.
  So a cost-increasing part is red and a decreasing one green, whichever category it is — "Qiymət yoxdur" and
  "Daxili təminat" included. Remove `barToneClass`.
- The category chip in this section becomes neutral (slate) for every category **except** "Qiymət yoxdur", which
  keeps Task 2's amber (`warningChipClass`, `pricing/labels.ts:80`) — amber means a missing price everywhere, and is
  not a direction. Do not change `causeToneClass` itself: `DriverList` (Task 10) still uses it.
- Colour is never the only carrier: under the heading, one small line —
  `Qırmızı — xərc artıb · Yaşıl — xərc azalıb` (built from the two words of 4.1) — and each part amount carries the
  direction word for assistive technology (`sr-only` text or `title`), e.g. "−8.093,70 ₼, xərc azalıb".

### 4.4 The warning only when something is unexplained (C)

- The unexplained part is the `UnattributedDueToMissingPrice` category's `amount` (already to the cent).
- **When that amount is 0** — whatever `explanationIsComplete` or `unattributedVariantCount` say — the section shows
  **no** warning. (The order's missing-price lines are still stated once, beside the amount, by Task 2's
  "N sətirdə qiymət yoxdur" in `DecisionHeadline` — unchanged.)
- **When it is not 0**, the section shows one `WarningNote` (role `status`, as today) that says how much and which
  products:

  `Dəyişikliyin {formatMoneyDelta(amount)} hissəsi izah edilə bilmir, çünki bu məhsulların bəzi sətirlərində qiymət yoxdur: {names}.`

  where `{names}` are the distinct `variant.productName`s of the drivers filed under
  `UnattributedDueToMissingPrice`, in the drivers' order (largest money first), at most three, then
  ` və daha N məhsul` for the remaining distinct names. Put the sentence builder in `terminology/terms.ts` (next to
  `incompleteExplanationNote`, e.g. `unexplainedPartNote(amount, names)`), unit-tested.
- `incompleteExplanationNote` stays as it is for the dashboard (Task 9 decides how the dashboard says it); the order
  page's section no longer imports it.
- Internal supply never produces a warning (unchanged), and a supply change is never amber.

### 4.5 The supply change is its own part (brief, Task 2 decision)

The `InternalSupply` part stays a separate part, labelled `Daxili təminat` (Task 2's word) and never amber. When
`decomposition.supplyChangedVariantCount > 0`, that part's secondary text reads `supplyChangedDriverNote`
("Təchizat forması dəyişib: alınan / şirkətdaxili") instead of, or before, its "N məhsul" count. It is sorted and
coloured like any other part (4.2, 4.3).

### 4.6 "Baza" and "Fərq" on the comparison line (D)

In `DecisionHeadline`, when `primary.available`:

```
Müqayisə: Son 6 ayın ortalaması (Mart–Avqust 2026)  ⓘ
Baza 17.583,62 ₼    Fərq +X ₼  +Y%
```

- The baseline amount is preceded by the word `Baza`; the delta and the percentage by `Fərq`. The labels are small
  slate text; the figures keep their current size.
- The delta and the percentage use `costDirectionToneClass(primary.deltaAmount)`.
- The small secondary bases (`Secondary`, `:145–178`) keep their layout; their delta uses
  `costDirectionToneClass(comparison.deltaAmount)`.
- Figures, the basis picker, the coverage "(2/3 ay)", the empty-window sentence, Task 2's missing-price / internal
  counts: unchanged.

### 4.7 The section speaks about the chosen basis (E)

- `CauseSummary` receives the primary comparison (or its `basis` and `windowPeriods`) from `OrderDetailPage`.
- Beside "Niyə dəyişib?" a small caption: `describeBasisCaption(basis, windowPeriods)` ("Son 6 ayın ortalamasına
  görə").
- The zero-change sentence becomes `${describeBasisCaption(...)} məbləğ dəyişməyib.` — e.g. "Son 3 ayın
  ortalamasına görə məbləğ dəyişməyib." — instead of the fixed "Keçən aya görə …".

---

## 5. Frontend requirements — summary for the Coder

Changed (expected): `components/decisions/CauseSummary.tsx`, `components/decisions/DecisionHeadline.tsx`,
`components/decisions/labels.ts` (the tie order), `components/analytics/format.ts` (the two helpers, the comment on
`signedToneClass`), `terminology/terms.ts` (two words, the sentence builder), `pages/OrderDetailPage.tsx` (the prop
passed to `CauseSummary`), and tests.

Not changed: `DriverList.tsx`, `causeToneClass`, `causeOrder`, `causeLabels`, `causeHints`; `TrendModal`; every
dashboard, monthly-report, objects and comparison-page component; `signedToneClass`'s behaviour;
`incompleteExplanationNote`'s text; `pricing/labels.ts`.

Keep the codebase's idiom: comments explain *why*, one word per idea from `src/terminology`, Task 2's price words from
`src/pricing/labels`.

## 6. Backend

None. Sorting, colour and the warning condition are presentation over data the API already returns. No C# change, no
API contract change. If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access**; do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change; HD-002's 94 rows untouched.
- No figure changes: every amount, "Cəmi", delta and percentage stays exactly what the API returns.
- Do not rework Task 5 (05a/05b); a defect found there goes into the report.
- Do not touch screens owned by later tasks (§3 out of scope), even to "make the colours consistent".
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- Every figure (brief): Heydər Əliyev, Keçən ay: Yeni +29.691,52, Miqdar −309,20, Qiymət +30,00,
  Bu ay yazılmayan −5.259,62, Xidmətlər −300,00, Cəmi +23.852,70. Fəvvarələr, Keçən ay: +5.133,27, +648,98, +17,00,
  −8.093,70, −290,00, Cəmi −2.584,45. The shown parts add up to "Cəmi" to the qəpik (Task 1c).
- The comparison is against the chosen basis and equals the dashboard card (Task 1); the basis picker stays on the
  order page and the basis stays in the URL (Task 1).
- Internal supply is never a warning and never amber (Task 2); Task 2's words and sentences, word for word
  ("Qiymət yoxdur", "Daxili təminat", "N sətirdə qiymət yoxdur", "N sətir daxili təminat (ödənişsiz)").
- Task 5's words (5.1): "Yeni məhsullar", "Bu ay yazılmayan məhsullar", "məhsul"; the old-terms sweep stays green.
- Zero parts stay hidden; the section is absent when `decomposition` is null (empty window) — unchanged.
- `DriverList`, `TrendModal` and every non-order-page screen render exactly as before.
- No backend, schema or data change.

## 9. Acceptance criteria

1. Fəvvarələr-shaped order (brief figures, Keçən ay): the first part is "Bu ay yazılmayan məhsullar −8.093,70 ₼",
   marked "Əsas səbəb", visibly emphasised over the others; its bar and amount are green; the rest follow by size
   (+5.133,27, +648,98, −290,00, +17,00). *(brief acceptance 1)*
2. Heydər Əliyev-shaped order: the first part is "Yeni məhsullar +29.691,52 ₼", marked, red; then −5.259,62,
   −309,20, −300,00, +30,00. *(brief acceptance 2)*
3. Every bar and part amount in the section, and "Cəmi", is red for a cost increase and green for a decrease; the
   section says in words that red is "xərc artıb" and green "xərc azalıb". *(brief outcome 2, decision 9.1)*
4. When the shown parts add up to "Cəmi" with no "Qiymət yoxdur" part (its amount 0), no warning appears, even with
   `explanationIsComplete: false`. *(brief acceptance 3, first sentence)*
5. When the "Qiymət yoxdur" part is non-zero, one warning says how much of the change is unexplained and names the
   products (at most three, then "və daha N məhsul"). *(brief acceptance 3, second sentence)*
6. The comparison line reads "Baza … ₼" and "Fərq … ₼ …%", the difference coloured by 9.1. *(brief acceptance 4)*
7. The order page's first part is the same category as the dashboard card's "Əsas səbəb" for the same order and basis,
   ties included. *(brief decision "panel kartı ilə eynidir")*
8. Internal supply: its part is separate, never amber, raises no warning, and when products changed supply form it
   says "Təchizat forması dəyişib: alınan / şirkətdaxili". *(brief decision, Task 2)*
9. The section's caption and zero-change sentence name the chosen basis.
10. No figure changed; `DriverList`, `TrendModal` and the other screens unchanged; all suites and both builds green;
    the old-terms sweep passes.

## 10. Required tests

Frontend (vitest):

- `format.test.ts`: `costDirectionToneClass` / `costDirectionBarClass` — positive → red, negative → emerald, zero and
  null → slate; `signedToneClass` unchanged (its existing tests stay green untouched).
- `terms.test.ts`: the unexplained-part sentence — one name; three names; five names → three and "və daha 2 məhsul";
  duplicate names counted once; the amount formatted with sign and ₼; the sentence passes `findOldTerms` (no retired
  word).
- `CauseSummary.test.tsx`:
  - the brief's Fəvvarələr figures (with `explanationIsComplete: false`, `unattributedVariantCount: 1`, Qiymət yoxdur
    0) → row order by size, first row "Bu ay yazılmayan məhsullar" with "Əsas səbəb", green bar and amount; **no**
    `role="status"`;
  - the brief's Heydər Əliyev figures → first row "Yeni məhsullar", red; order as in criterion 2;
  - a tie between two parts → the dashboard's tie order decides;
  - a non-zero "Qiymət yoxdur" part with drivers → the concrete sentence with amount and names; its chip amber, its bar
    by direction;
  - internal supply with `supplyChangedVariantCount > 0` → "Təchizat forması dəyişib: …", no amber, no status;
  - the legend words and the per-amount direction words are present;
  - zero-change sentence with basis `Previous3MonthAverage` → "Son 3 ayın ortalamasına görə məbləğ dəyişməyib.";
  - **replace** "the colours — nothing here is green or red" with the 9.1 test; say so in the report.
- `OrderDecisionPage.test.tsx`: the headline shows "Baza" and "Fərq" beside the right figures; the delta is red for
  an increase and green for a decrease; the section is wired with the chosen basis (caption); the existing
  internal-supply test (`:870–895`) stays green.
- `terminology/oldTerms.test.tsx`: the order-page sweep still passes; add a fixture case with a non-zero
  "Qiymət yoxdur" part so the new sentence is swept.
- A test that the dashboard's `signedToneClass` users are unchanged is not needed — do not touch them; their existing
  tests prove it.
- Existing tests that assert the old order, the old colours, or the old zero-change sentence change with this task;
  update them and list each with the reason. No expectation may be weakened to pass.

Backend: none; run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`--artifacts-path` into the scratchpad if `bin` is locked;
  say so).
- `dotnet test BaxOrders.slnx` — unit and integration counts unchanged from 05b's accepted 797 / 609.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  (the build's `tsc -b` is the type check) — green, with counts (05b's accepted: 36 files / 521 tests).
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/`.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Hissələr mütləq böyüklüyə görə sıralanır; ən böyüyü birinci və seçilmiş görünür. | §4.2; criteria 1, 2, 7 |
| Bütün zolaqlar xərcin istiqamətinə görə rənglənir: artım qırmızı, azalma yaşıl (9.1). | §4.1, §4.3; criterion 3 |
| Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir. | §4.4; criteria 4, 5 |
| Müqayisə sətrində "baza" və "fərq" açıq yazılır. | §4.6; criterion 6 |
| Rəhbər hesablamadan deyə bilir: "… əsas səbəbi 29 min manatlıq yeni məhsullardır." | §4.2 ("Əsas səbəb" first, largest), §4.6; criterion 2 |
| Müqayisə seçilmiş bazaya görə aparılır və panel kartı ilə eynidir (Task 1). | §4.2 tie order, §4.7, §8; criteria 7, 9 |
| Hissələrin cəmi "Cəmi"yə qəpiyinə qədər bərabərdir (Task 1c). | §8; criterion 10 |
| Daxili təminat heç vaxt xəbərdarlıq sayılmır; "Təchizat forması dəyişib" ayrıca hissədir (Task 2). | §4.4, §4.5; criterion 8 |
| 9.1 — istiqamət kimi, "yaxşı/pis" kimi yox. | §4.1 (comment, words), §4.3 legend |
| 5.1 — hissə adları. | §8 (used as they are) |
| Rəqəmlər dəyişmir; Heydər Əliyev rəqəmləri; Task 13-də mümkün 750,00 ₼ dəyişməsi, cəmi dəyişmir. | §7, §8; criterion 10 (nothing here depends on the split between the two parts) |
| Sifariş səhifəsindəki baza seçici qalır (Task 1). | §4.6, §8 |
| Acceptance 1–4 | criteria 1, 2, 4–5, 6 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. Task 06 writes decision 9.1 into one shared helper (`costDirectionToneClass`, `costDirectionBarClass`) and applies
   it only to the two pieces it owns — the comparison line and "Niyə dəyişib?". `signedToneClass` keeps its old
   behaviour until Tasks 08, 09, 10 and 11 move their screens. Consequence, accepted for the length of the queue: on
   the order page, `DriverList` (Task 10) keeps its old colours below a section that already follows 9.1.
2. "Seçilmiş görünür" is met by the caption "Əsas səbəb" (the dashboard card's words) plus visual emphasis of the
   first row; no interaction is added.
3. Ties in size are broken in the dashboard's order, so the first part always matches the card's "Əsas səbəb".
4. "Qiymət yoxdur" is a part like the others: it is sorted by size and can be first; its bar follows the direction
   and only its chip stays amber.
5. "Izah olunmayan hissə" is the "Qiymət yoxdur" part's amount; when it is 0,00 ₼ the section shows no warning even if
   some product has an unpriced line — the headline's Task 2 line already states that fact.
6. "Nəyin çatışmadığını konkret deyir" is met by the unexplained amount plus up to three product names, in the
   sentence of §4.4, which keeps 05a's "Dəyişikliyin … hissəsi izah edilə bilmir" stem and avoids the retired
   "məhsulun qiyməti yoxdur".
7. The category chips in this section become neutral (amber only for "Qiymət yoxdur"), so red and green are the only
   direction colours in it.
8. The colour is explained once in words ("Qırmızı — xərc artıb · Yaşıl — xərc azalıb") and per amount for screen
   readers.
9. The internal-supply part shows "Təchizat forması dəyişib: alınan / şirkətdaxili" when products changed supply form,
   so the part says what it is.
10. The section names the chosen basis in its caption and zero-change sentence; the fixed "Keçən aya görə" was wrong on
    the other four bases.
11. The secondary bases in the headline get the new colour but not the "Baza"/"Fərq" words; they are small context,
    and the brief names only the main comparison line.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (05b's commit `1e065a8`), `git status --short`, `git diff --stat`.
1. Sıra və "Əsas səbəb" — the sorting rule, the tie order and where it lives, before/after for the two brief orders.
2. Rənglər (9.1) — the helpers, where they are used, the legend, what still uses `signedToneClass` and which task
   moves it.
3. Xəbərdarlıq — the condition, the sentence with an example, the Fəvvarələr case with no warning.
4. Müqayisə sətri — "Baza" / "Fərq", before/after.
5. Seçilmiş baza — caption and zero-change sentence.
6. Daxili təminat — the part and the supply-change note.
7. Testlər — new tests; changed tests, each with the reason; counts; builds.
8. Toxunulmayanlar — no database reached, no backend change, no figure changed, Task 5 intact, other screens intact.
9. Sonrakı tapşırıqlar üçün qeydlər — for 7, 8, 9, 10, 11, 13 (e.g. the dashboard still shows
   `incompleteExplanationNote` on `explanationIsComplete`; `DriverList` colours), and any Task 5 defect found.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
