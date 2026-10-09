# TASK 21 — PANEL İYERARXİYASI VƏ BAZA ƏHATƏSİ (P0/P1)

Priority: **P0/P1**. Criteria 1–6 are P0, because they change what a manager concludes. Criteria 7–10 are P1.
Brief: `AI_WORKFLOW/BRIEFS/TASK-21.md` is the owner's settled requirement. Decisions 21.1 … 21.5 and 21.2a are in
`BRIEFS/OWNER_BRIEFS_MASTER.md`:820–831. The brief decides *what* and *why*; this file decides *how*. Where this file
and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** It covers three dashboard components, one coverage label, a one-line change to the
backend's card ordering, and their tests.
Specification status: **READY.** Drafted by the Product/UX planning agent on 2026-09-25. Completed by the Planner on
2026-09-26 against HEAD `9926de1` (Task 20's accepted commit). §2 is verified line by line; the draft's corrections
are listed in §2.8.

This task changes **presentation**: the type scale on the card, the arrangement of the summary card, one visible
qualification, one factual coverage label, and the order in which the API hands the cards over. It changes no figure,
no calculation, no selection of objects, no API shape and no database. There is no data-migration marker in this file,
on purpose.

---

## 1. Context

The brief states the goal: "Panelə üç saniyə baxan rəhbər nə qədər dəyişdiyini oxusun, hansı rəqəmin müqayisə
edildiyini bilsin və zəif bazadan çıxan faizi olduğu kimi görsün."

Task 09 decided which objects earn a card and settled the dashboard's colours under decision 9.1. Both stay. This task
changes three things:

- which number the eye reaches first;
- how the month's real total is kept apart from the comparable cohort;
- whether a percentage says how much history it rests on.

Three owner decisions constrain it, and all three point the same way: **state facts, do not soften them**.

- The real monthly total stays the headline and is not replaced by the cohort amount (21.2). Decision 21.2a gives the
  layout.
- A percentage computed from thin history is **exact for the data available** and is never labelled "təxmini" (21.3).
- The materiality threshold, meaning which objects are too small to deserve a card, is the owner's number and is
  **not** decided here (21.5).

## 2. Verified current behaviour (repository at `9926de1`)

Frontend paths are under `frontend/bax-orders-web/src/`.

The figures quoted from September 2026 were observed by the drafting agent on the running application on 2026-09-25.
The Planner did not re-measure them, since it has no database or browser access. They agree with the fixtures that
record September 2026: `DashboardSummary.test.tsx`:70–101 holds 71.210,29 / 71.030,25 / 44.340,78 / +26.689,47 /
+60,19%. They also agree with each other arithmetically: 35.837,72 − 23.852,70 = 11.985,02, and +23.852,70 on that
baseline is +199,02%.

### 2.1 The attention card's type scale

In `components/dashboard/AttentionSection.tsx`:

| Element | Code | Size / weight |
|---|---|---|
| Card kind caption, e.g. `Ən böyük məbləğ artımı` | `<p className="… text-xs …">` :112–118 | 12 px / 400 |
| Object name, the card's one link (Task 20) | :119–128 | 16 px / 500 |
| Current amount `35.837,72 ₼`, with `MissingPriceMark` beside it | `text-2xl font-semibold text-slate-900` :132–135 | 24 px / 600 |
| Delta `+23.852,70 ₼` **and** percent `+199,02%` | one `<p>` with `text-sm font-medium ${costDirectionToneClass}` :142–145 | 14 px / 500, same colour |
| Direction sentence `Keçən aya görə xərc artıb` | `text-xs text-slate-500` :146 | 12 px |
| No delta: `Müqayisə üçün əvvəlki ay yoxdur` (`noComparisonCause`, `components/dashboard/labels.ts`:230) | :137–138 | 14 px |

So the card exists because of the delta, but the delta is drawn at 58 % of the amount's size. The delta and the
percentage share one `<p>`, one size and one colour.

**Every card with a delta already shows both the absolute change and the percentage** (:142–145), including the
percentage cards. Brief acceptance 5 therefore already holds in substance. This task keeps it and pins it with a
test (§4.5).

### 2.2 The summary card (`components/dashboard/DashboardSummary.tsx`, `DashboardHeadline`)

- **Heading row** (:79–94):
  - `monthAmountHeading(period)`, e.g. `Sentyabr 2026 sifarişlərinin məbləği` (`components/dashboard/labels.ts`:210–212).
  - An ⓘ `InfoHint` labelled `Məbləğ necə hesablanır?`, whose text is `knownAmountHint` = `Qiyməti olmayan sətirlər bu
    məbləğə daxil deyil.` (`components/analytics/format.ts`:32; used at :82).
  - When `locationsWithMissingPrices > 0`, an amber button reading `missingPriceLocationsNote(n)`, e.g. `10 obyektin
    sifarişində qiyməti olmayan sətir var` (`coverage/labels.ts`:189–191). It opens the missing-price filter.
    It says **which objects** have unpriced lines. It does **not** say that those lines are outside the amount; that
    fact is only behind the ⓘ.
- **Headline** `formatMoney(summary.current.knownAmount)`, `text-3xl font-semibold`, i.e. 30 px / 600 (:95–97).
- **What follows depends on `leftOut`**, not on the basis (:66–69, :99–119). `leftOut` is true when
  `partition.noBaseline` is non-empty, or a `noHistory` member has money this month.
  - **`leftOut === false`**:
    - the delta and percent on their own line directly under the headline, `text-base font-semibold`, tone-coloured
      (:104–108);
    - the direction sentence (:109);
    - then `{basisText}: {baseline}` with the ⓘ `Müqayisə bazası nədir?` (:112–117).
    - The cohort is **not named** at all.
  - **`leftOut === true`** (`Subtraction`, :159–195): one running sentence,
    `Müqayisə olunan 23 obyekt: 71.030,25 ₼ − Keçən ay (Avqust 2026): 44.340,78 ₼ = +26.689,47 ₼ · +60,19%`
    (`comparedAmountLine`, `coverage/labels.ts`:157–159). The direction sentence follows (:185), and then
    `Müqayisəyə daxil deyil: EXPO Center (bu ay 180,04 ₼) — keçən ay sifarişi yoxdur` (:188–192;
    `excludedFromComparisonLine`, `coverage/labels.ts`:172–181).
- The draft saw "one shape on `last`, another on `avg3`". That was a consequence of the data: on September 2026, EXPO
  Center is outside the comparison on `last` and inside it on `avg3`. The code branches on `leftOut`.
- `comparedAmountLine` has no caller other than `Subtraction` (:171).

### 2.3 The objects table and the phone list (`components/dashboard/LocationRows.tsx`)

- The table's column headings are `Obyekt · Bu ay · {basis} · Dəyişmə · Əsas səbəb · Məlumat vəziyyəti` (:82–87).
  **`Bu ay` is already the word for "this month's amount"** (:83).
- In the Dəyişmə cell (:130–145), the delta sits on one line (with `DirectionWord`) and the percent sits under it,
  `text-xs`, both tone-coloured. For no delta it shows `—`.
- On the phone list (:226–237), the amount is followed by `delta percent` on one `text-xs` line and then the basis
  name.
- The data-state column (`DataState`, :312–347) says `Müqayisə üçün data azdır` (`partialHistoryNote` =
  `limitedComparisonDataLabel`, `components/dashboard/labels.ts`:228, `terminology/terms.ts`:38) for a row with an
  order this month and `historyCoverage === 'Partial'` (:337–339). It is slate and states no count.
- Task 20's surfaces:
  - the row is `onClick={openSurfaceLink}` with `interactiveRowClass` (:97);
  - the phone row is `interactiveSurfaceClass` (:207–212);
  - the only link is the name (:100–107, :216–223).

### 2.4 Coverage is already in the payload

- `api/dashboard.ts`:56–103 `LocationDashboardRow` carries:
  - `expectedBaselinePeriodCount`, `availableBaselinePeriodCount` and `missingBaselinePeriods` (:66–68);
  - `historyCoverage` and `comparisonAvailability` (:73–74).
- The backend sets them in `ManagementDashboardQueries.cs`:178–209:
  - `available` = the object's months with an order inside the window;
  - `expected` = the window's months;
  - `historyCoverage` is `Unavailable` when `available == 0`, `Complete` when `available >= expected`, and otherwise
    `Partial`.
- `Partial` therefore means exactly **0 < available < expected**. A row with `available == 0` is `NoBaselineHistory`
  or `NoCurrentRequest`, and it has no delta.
- The summary carries `current`, `comparedCurrent`, `baseline`, `knownAmountDelta`, `knownAmountPercentChange` and
  `partition` (`api/dashboard.ts`:183–226). `current.missingPriceItemCount` counts the month's lines somebody owes a
  price for (:49).
- **Nothing new is needed from the backend for the figures.**
- The drafting agent saw on `basis=avg6` a coverage chip counting 16 objects with thin history, while the attention
  cards showed `+186,85%` with no qualification. The code agrees: no card or row renders the counts.

### 2.5 Card order: the API decides it, and it sorts the percentage cards by money

- `AttentionSection.tsx`:76–80 renders `attention` in the order the API returns.
- The API builds it in `ManagementDashboardQueries.Attention` (`src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs`:340–394):
  - each reason's candidates are ranked in that reason's own ordering (:353–371);
  - `Rank` is the place in that ordering (:382–385);
  - the final order is `.OrderBy(item => item.Reason).ThenByDescending(item => Math.Abs(item.Location.KnownAmountDelta ?? 0m))`
    (:388–393).
- For both money reasons, the rank order and the |delta| order coincide.
- For `StrongPercentageChange`, rank follows |percent| (:361–364), but the final sort follows |delta|. So whenever
  the second-largest percentage moved more money than the largest, `İkinci ən böyük faiz dəyişməsi` is rendered first.
  That is the brief's fourth problem.
- At most 2 + 2 + 2 + 1 + 1 = 8 candidates exist (`PerReason` :38, `PerWarning` :45), and `MaxAttention` is 8 (:35).
  So `Take(MaxAttention)` never cuts, and **the ordering cannot change which objects are chosen**.
- The reason order is the enum's: Increase 1, Decrease 2, Percentage 3, MissingPrice 4, NoComparison 5
  (`DashboardContracts.cs`:47–63).

### 2.6 How the rest of the app already words these things

- **The order page** (`components/decisions/DecisionHeadline.tsx`) labels its figures `Baza` (:127) and `Fərq`
  (:131). The labels are `text-xs text-slate-500`; the Fərq amount is `text-lg font-semibold`, and its percent is
  `text-sm`, both tone-coloured.
- The order page states partial coverage as `(2/3 ay · Çatışmayan: Aprel 2026)` (`partialCoverageLine`,
  `components/decisions/labels.ts`:238–243) in **slate** `text-xs text-slate-500` (`DecisionHeadline.tsx`:172–189).
- **Amber means one thing on these screens: a price somebody owes is missing.** It is never used for anything else
  (`pricing/labels.ts`:88–92; `components/dashboard/labels.ts`:188–192; `DashboardSummary.tsx`:217–218;
  `LocationRows.tsx`:323–327). `historyCoverageClass` (`components/dashboard/labels.ts`:29–33) has an amber `Partial`
  entry, but nothing renders it.
- `Qiyməti olmayan sətir…` is accepted vocabulary. It is used by `knownAmountHint`, by `missingPriceLocationsNote` and
  by Task 16's `importPricingIntro` (`pricing/labels.ts`:148–150), and the old-terms sweep passes with it.

### 2.7 What must not be read as noise

- Each card's `Keçən aya görə xərc artıb` / `… azalıb` (`costDirectionSentence`, `terminology/terms.ts`:89) is
  decision 9.1's non-colour carrier (`AttentionSection.tsx`:146). Keep it. The summary card says it too
  (`DashboardSummary.tsx`:61–62, :109, :185).
- The card is a Task 20 surface. The Task 20 bullets below give the card's link, its click handling and its classes.

### 2.8 Corrections to the draft

| Draft said | Repository says | This file now |
|---|---|---|
| §2.3: the headline's shape changes with the **basis** | It changes with `leftOut` (§2.2) | One arrangement for every case (§4.2); the tests vary both basis and `leftOut` |
| §2.2 / §4.3: the missing-price fact is only behind the ⓘ | True of the *exclusion*; a visible amber button already names the objects (§2.2) | The exclusion becomes a visible line; the button stays as it is (§4.3) |
| §4.4: `Baza N/M ay` is **amber** "because amber means incomplete information" | Amber means **a missing price** and nothing else; the order page states partial coverage in slate (§2.6) | **Slate** (§4.4) |
| §4.4: render when `available < expected` | That includes `available == 0`, where there is no delta and the row already says `Müqayisə bazası yoxdur` or has no order | Render only where a delta is shown **and** `historyCoverage === 'Partial'` (§4.4) |
| §4.5: add the absolute delta to the percentage cards | Every card with a delta already shows both (§2.1) | Kept and pinned. On a percentage card the **percent** leads and the delta sits beside it (§4.1, §4.5) |
| §4.6 / §6: a rendering defect; "Backend: none", STOP on any backend change | The order is the API's, and it sorts the percentage cards by money (§2.5) | A one-line backend ordering fix with a backend test. No selection, figure or contract changes (§6) |
| Assumption 2: use `Bu ay` unless a word already exists | `Bu ay` already exists (`LocationRows.tsx`:83), and 21.2a uses it | `Bu ay`, confirmed |
| §10: `coverage/labels.test.ts` "new or extended" | No such file exists | **New** file |
| §11: backend counts "Planner: fill in" | Task 20: 1046 unit / 785 integration; frontend 58 files / 1158 tests | Filled in (§11) |

## 3. Scope

In scope, on the management dashboard (`/dashboard`):

- A. The change becomes the card's largest figure, and the current amount becomes a named secondary line (21.1).
- B. The two parts of the change, amount and percentage, are visually distinct from each other.
- C. The summary card keeps the real monthly total as its headline. It states the compared cohort separately and by
  name, with the percentage inside the cohort block, in one arrangement for every basis and every case (21.2, 21.2a).
- D. The missing-price exclusion becomes a visible line, in existing words.
- E. A factual baseline-coverage label, `Baza N/M ay`, on cards and rows whose baseline is partial (21.3, 21.5).
- F. The absolute delta on the percentage cards, which is already there; pinned (21.5).
- G. The percentage cards are ordered largest first (21.4), by the backend's ordering.
- H. Tests and the manual pack.

Out of scope:

- Which objects earn a card, and by what rule: **Task 09's**. The thresholds `StrongPercentage` / `MeaningfulBaseline`
  stay.
- A materiality threshold. It is **not** decided (owner decision 21.5). This task only gives the reader the figures to
  judge with.
- The card's title words, the driver sentence and the product line: **Task 07's / 09's**.
- Click surfaces and interactive styling: **Task 20's**, accepted.
- The monthly report and the locations pages: **Task 24's**.
- The order page: **Tasks 18, 19, 22, 23's**. Do not refactor `DecisionHeadline.tsx` to share constants.
- Any change to a calculation, a cohort definition, a percentage, a count or an API field.

## 4. Required behaviour

### 4.1 The change leads on the card (A, B)

On every attention card whose row has `knownAmountDelta !== null`, the figure block has three lines, in this order.

**1. The change line.** It is one `<p>`, tone-coloured by `costDirectionToneClass(row.knownAmountDelta)` exactly as
today (9.1).

- **On a `LargestIncrease`, `LargestDecrease`, `MissingRequiredPrice` or `NoComparisonHistory` card**:
  - the delta `formatMoneyDelta(delta)` is the **primary figure**, at `text-2xl font-semibold`, i.e. the size the
    amount has today;
  - the percent `formatPercent(percent)` is the **secondary figure**, at `text-sm font-medium`.
- **On a `StrongPercentageChange` card**, the percent is the primary figure and the delta is the secondary one. The
  card exists because of its percentage, and its title names it (§4.5).
- If §4.4 applies, `Baza N/M ay` ends this line as a separate span (§4.4).
- Every money or percent span keeps `whitespace-nowrap`, and the line wraps with `flex flex-wrap items-baseline
  gap-x-2`.

**2. The "Bu ay" line.** It reads `Bu ay` (`text-xs text-slate-500`), then the amount
`formatMoney(row.current.knownAmount)` (`text-sm font-medium text-slate-900 whitespace-nowrap`, never coloured, since
it is a sum and not a direction), then `MissingPriceMark` beside the amount exactly as today.

**3. The direction sentence.** `costDirectionSentence(caption, delta)`, unchanged in words and style.

The card kind caption, the object name (the one link), `alsoFirstLine`, the causes and the `DetailsCue` keep their
place, words and classes.

**A card with no delta** (`knownAmountDelta === null`) keeps today's markup:

- the amount at `text-2xl font-semibold text-slate-900` as the largest figure, with the mark;
- `noComparisonCause` under it;
- no `Bu ay` prefix and no percent.

**The class contract.** Export two constants from `AttentionSection.tsx` so that tests can find the figures without
pixel checks:

```ts
export const cardPrimaryFigureClass = 'text-2xl font-semibold'
export const cardSecondaryFigureClass = 'text-sm font-medium'
```

The primary figure's span carries `cardPrimaryFigureClass`, and the secondary figure's span carries
`cardSecondaryFigureClass`. So does the no-delta card's amount.

**Task 20's surface rules.** Every new element is inert text: a `<p>` or a `<span>` with no hover, focus or cursor
class, no `role="button"`, and no link. The card keeps exactly one link. Nothing new has to match the ignore selector,
because nothing new has a click of its own.

### 4.2 One summary arrangement (C)

`DashboardHeadline`'s left section becomes, **for every basis and whether or not money was left out**:

```
Sentyabr 2026 sifarişlərinin məbləği ⓘ          10 obyektin sifarişində qiyməti olmayan sətir var
71.210,29 ₼
Qiyməti olmayan sətirlər bu məbləğə daxil deyil.            ← §4.3, only when a line is missing a price
─────────────────────────────────────────────────────────────
Müqayisə olunan 23 obyekt · Keçən ay (Avqust 2026) ⓘ
Bu ay 71.030,25 ₼    Baza 44.340,78 ₼    Fərq +26.689,47 ₼ · +60,19%
Keçən aya görə xərc artıb
Müqayisəyə daxil deyil: EXPO Center (bu ay 180,04 ₼) — keçən ay sifarişi yoxdur   ← only when noBaseline is non-empty
```

- **The heading row is unchanged**: the heading, the ⓘ `Məbləğ necə hesablanır?` with `knownAmountHint`, and the
  amber button.
- **The headline is unchanged**: `formatMoney(summary.current.knownAmount)`, `text-3xl font-semibold
  whitespace-nowrap`. Nothing coloured and no percentage sits beside it or directly under it. *(21.2a.1, 21.2a.3,
  21.2a.4)*
- **The cohort block** is a `<div role="group" aria-label={footerComparedLabel(n)}>` with
  `mt-2 border-t border-slate-100 pt-2`. It is **always** rendered.
  - **Its first line** reads `footerComparedLabel(partition.compared.length)` (`Müqayisə olunan 23 obyekt`,
    `coverage/labels.ts`:245–247, `font-medium text-slate-700`), then ` · `, then `basisText` =
    `describeBasisWithRange(basis, baselinePeriods)`, then the existing ⓘ `Müqayisə bazası nədir?` with
    `basisHints[basis]`.
  - **Its second line** holds three labelled figures, each `whitespace-nowrap`, with `flex flex-wrap items-baseline
    gap-x-4 gap-y-1`. The labels are `text-xs text-slate-500`, as on the order page.
    - `Bu ay` then `formatMoney(summary.comparedCurrent.knownAmount)` (`text-sm font-medium text-slate-700`).
    - `Baza` then `formatMoney(summary.baseline.knownAmount)` (`text-sm text-slate-700`).
    - `Fərq` then `formatMoneyDelta(summary.knownAmountDelta)` (`text-base font-semibold`, tone), then
      `<span className="text-slate-400"> · </span>`, then `formatPercent(summary.knownAmountPercentChange)`
      (`text-sm`, tone). The tone is `costDirectionToneClass(summary.knownAmountDelta)`, on the two figure spans.
  - **Then** the direction sentence (`mt-0.5 text-xs text-slate-600`, as today) when it is non-null.
  - **Then** `excludedFromComparisonLine(partition.noBaseline, basis)` (`mt-1 text-xs text-slate-500`, as today) when
    `noBaseline` is non-empty.
- The percentage is inside the cohort block and on the same line as `Fərq`, so it can only be read as the cohort's.
  *(21.2a.3)*
- `Bu ay` is shown even when it equals the headline. That is the ordinary month in which every object that ordered was
  compared. One arrangement for every case is what 21.2a lists, and the equal figure says plainly that the cohort
  *is* the whole month.
- Responsive wrapping is allowed. Each label stays glued to its figure (`whitespace-nowrap` on the pair's wrapper), so
  the relationship stays unambiguous when it wraps. *(21.2a.6)*
- `Subtraction` and `comparedAmountLine` are removed, since nothing else uses them. Update the comments on
  `DashboardHeadline` and in `coverage/labels.ts` that describe the subtraction.
- The labels `Bu ay`, `Baza` and `Fərq` live as constants in `components/dashboard/labels.ts` (`thisMonthLabel`,
  `baselineLabel`, `deltaLabel`), and the card (§4.1) and the summary use them.
- The right-hand "Bu ay sifariş olan obyektlər" card (:129–147) is unchanged.

### 4.3 The missing-price exclusion is visible (D)

- **When** `summary.current.missingPriceItemCount > 0`, render a line directly under the headline:
  `<p className="mt-0.5 text-xs text-amber-800">{knownAmountHint}</p>`.
  - The text is `Qiyməti olmayan sətirlər bu məbləğə daxil deyil.`, the existing sentence, verbatim.
  - It is amber because it is about owed prices. Use `warningToneClass` from `pricing/labels.ts`.
- **When** nothing is missing, the line is absent, not rendered as a zero. Internal supply
  (`priceNotRequiredItemCount`) never raises it.
- The ⓘ beside the heading stays, with the same text. It still explains the rule in a month where nothing is missing.
- The amber `missingPriceLocationsNote` button stays where it is, with the same words and behaviour.
- Write no new sentence. Use no retired term.

### 4.4 Baseline coverage, stated as a fact (E)

- **The builder**, in `coverage/labels.ts`, next to the other coverage words:

  ```ts
  /** "Baza 2/6 ay" — how many of the window's months the object's baseline actually has. A fact, not a warning. */
  export function baselineCoverageLabel(available: number, expected: number): string   // `Baza ${formatCount(available)}/${formatCount(expected)} ay`
  /** The label for a row that shows a difference over a partial baseline; null otherwise. */
  export function baselineCoverageNote(row: Pick<LocationDashboardRow,
    'knownAmountDelta' | 'historyCoverage' | 'availableBaselinePeriodCount' | 'expectedBaselinePeriodCount'>): string | null
  ```

- `baselineCoverageNote` returns the label only when `knownAmountDelta !== null` **and**
  `historyCoverage === 'Partial'`, which is the same as 0 < available < expected (§2.4). In every other case it
  returns `null`.
- **Where it is rendered**, always as `<span className="whitespace-nowrap text-xs font-normal text-slate-500">`:
  - **On the card**, at the end of the change line (§4.1). The span sets its own colour, so the line's tone class
    does not reach it.
  - **In the table**, as a third line in the Dəyişmə cell (`LocationRows.tsx`:130–145), under the percent.
  - **On the phone row**, as a line under the delta/percent line (:231–235).
- **Slate, never amber, red or green.** It is not a direction (9.1) and not a missing price (Task 2).
- The percentage beside it is **not** qualified, greyed, hidden or called `təxmini`, `təqribi` or anything
  equivalent. The calculation is exact for the data available. *(owner decision 21.3)*
- When the baseline is complete, when there is no baseline, or when there is no order this month: nothing.
- `DataState`'s `Müqayisə üçün data azdır` stays as it is. It is the chip's word for the same rows. `Baza N/M ay` is
  the count behind it, and it sits beside the percentage it qualifies.

### 4.5 Percentage cards carry the absolute change (F)

On a `StrongPercentageChange` card:

- the percent is the primary figure (`cardPrimaryFigureClass`);
- the absolute delta sits beside it as the secondary figure (`cardSecondaryFigureClass`), in the same tone;
- `Baza N/M ay` follows when §4.4 applies;
- `Bu ay {amount}` is on the next line.

So `+480,01%` is read with `+1.514,82 ₼` and `Bu ay 1.830,40 ₼`. Both figures come from the row as they are, and
neither is recomputed.

### 4.6 Card order (G)

- **The change.** In `ManagementDashboardQueries.Attention`, change the final ordering (:388–393) from
  `.OrderBy(item => item.Reason).ThenByDescending(item => Math.Abs(item.Location.KnownAmountDelta ?? 0m))` to
  `.OrderBy(item => item.Reason).ThenBy(item => item.Rank)`.
- **Why.** Within a reason, the cards then appear in their rank. The rank is exactly what the title says:
  `Ən böyük …` is 1 and `İkinci ən böyük …` is 2. The reasons keep their order, which is Task 09's (decision 21.4).
- **What does not change.** For both money reasons the order is unchanged (§2.5). For the warnings, one card each, it
  is unchanged. Only the percentage pair can move.
- **What stays:**
  - `.GroupBy(…).Select(group => group.First())`, which keeps the first reason an object qualified under;
  - `.Take(MaxAttention)`;
  - every candidate list;
  - `Rank`, `AlsoFirstIn` and the DTO.
- Update the method's remarks to say that the cards within a reason follow their rank.
- **The frontend** keeps rendering the API's order. It does not re-sort.

### 4.7 Nothing else changes

No amount, percentage, cohort, count or object selection changes. No colour changes meaning. The only label text
added is `Bu ay`, `Baza`, `Fərq`, `Baza N/M ay`, and the existing `knownAmountHint` made visible. No API shape
changes.

## 5. Frontend requirements (summary for the Coder)

Changed (expected):

- `components/dashboard/AttentionSection.tsx`: §4.1, §4.4, §4.5;
- `components/dashboard/DashboardSummary.tsx`: §4.2, §4.3;
- `components/dashboard/LocationRows.tsx`: §4.4 only;
- `coverage/labels.ts`: §4.4, and `comparedAmountLine` is removed;
- `components/dashboard/labels.ts`: the three labels;
- tests.

Not changed:

- `api/dashboard.ts`;
- `analytics/format.ts`, beyond reading `knownAmountHint`;
- `components/dashboard/MissingPriceMark.tsx`, `components/dashboard/details.tsx` and `components/interaction.ts`;
- `pricing/labels.ts`, beyond importing `warningToneClass`;
- `DecisionHeadline.tsx`, the monthly report, the locations pages and the order page;
- every figure.

## 6. Backend

- **One change:** the ordering line of §4.6 in `src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs`,
  and its remarks.
- **No change** to any DTO, contract, endpoint, query, threshold, calculation, schema or migration.
- Do **not** add a "thin baseline" flag: `availableBaselinePeriodCount`, `expectedBaselinePeriodCount` and
  `historyCoverage` are enough.
- If any other backend change seems needed, **STOP** and report why.
- **Test** (`tests/BaxOrders.IntegrationTests/DashboardAttentionTests.cs`):
  - **A new `[PostgresTheory]` over `EveryBasis`:** within every reason, the cards appear in ascending `Rank`, and the
    reasons appear in enum order. Use `MixedWorldAsync`.
  - **A new `[PostgresFact]` that reproduces the defect**, in a world of its own built with the existing
    `OrdersAsync` / `ObjectAsync` helpers. A shape that does it, with month 8 then month 9:
    - `Pul 1` (10 000 → 40 000);
    - `Pul 2` (10 000 → 30 000);
    - `Faiz 1` (100 → 600, +500 %);
    - `Faiz 2` (1 000 → 5 000, +400 %).
  - It asserts:
    - the two percentage cards are `Faiz 1`, rank 1, then `Faiz 2`, rank 2, although `Faiz 2` moved more money;
    - the set of (reason, object) pairs equals the one `The_movements_choose_the_same_objects_as_before` computes.
  - If the Coder finds a shape that fits the helpers better, use it, provided that before the fix the order is inverted
    and after it the order is correct.
  - **Every existing backend test stays unchanged and green**, in particular
    `The_movements_choose_the_same_objects_as_before` and `Every_card_carries_its_true_place_in_its_own_ordering`.

## 7. Safety and STOP conditions

- **No database access.** Do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, or any tool under `tools/`. The
  integration tests' own disposable database is the only exception, used through `dotnet test`.
- No data change. HD-002's 94 rows stay untouched.
- **No figure changes**, and no change to any cohort, count or percentage. If making the layout work seems to require
  recomputing anything, STOP.
- Do not replace the real monthly total with the cohort amount, and do not put the percentage next to the headline
  (21.2, 21.2a). 21.2a already settles the layout, so do not stop for layout ambiguity where §4.2's hierarchy holds.
- Do not call any percentage `təxmini`, `təxmini olaraq`, `təqribi` or any equivalent (21.3). Do not grey, hide or
  qualify a percentage because its baseline is partial.
- Do not introduce a materiality threshold, and do not hide any card (21.5).
- Do not remove the direction sentence (§2.7), on the card or on the summary.
- Do not touch Task 09's object selection or Task 07's card labels. Record any defect found there in the report.
- Do not add a second link, a button or any interactive class inside a card or row (Task 20).
- Do not use amber for anything but a missing price.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants (MUST NOT CHANGE)

- **Every figure:** `71.210,29 ₼`, `71.030,25 ₼`, `44.340,78 ₼`, `+26.689,47 ₼`, `+60,19%`, and every card's and
  row's amount, delta and percentage.
- **Task 09's choices:** which objects appear on which card, with which `rank` and `alsoFirstIn`; which rows appear in
  the table; and the table's sort options.
- **Decision 9.1:** the colour helpers, the legend, the per-card and summary direction sentences, and `DirectionWord`.
- **Amber** means a missing price and nothing else (Task 2).
- **Existing words, verbatim:**
  - Task 2's price words;
  - Task 5's terms (5.1), including `Müqayisə üçün data azdır`;
  - Task 06's `Baza` and `Fərq`;
  - the group words of `coverage/labels.ts`.
- **Task 1:** the basis lives in the URL, and the dashboard card equals the order page's comparison.
- **Task 20:**
  - the ids `attention-${locationId}`, `row-${locationId}` and `row-${locationId}-phone`;
  - one `data-surface-link` link per card and row, with the same destination and name;
  - the shared interaction classes;
  - inert text stays inert.
- The old-terms sweep stays green.
- No schema, contract or data change. The one backend change is §4.6.

## 9. Acceptance criteria

1. **Sentyabr 2026, Keçən ay, "Ən böyük məbləğ artımı":**
   - the largest figure on the card is `+23.852,70 ₼`, in `cardPrimaryFigureClass`;
   - `35.837,72 ₼` is smaller, on the next line, named `Bu ay`.

   *(brief acceptance 1, 21.1)*
2. **On that card:**
   - the delta and the percentage are different sizes;
   - both are red per 9.1;
   - `Keçən aya görə xərc artıb` is still present.

   *(brief acceptance 1, 7)*
3. **The summary card:**
   - its headline is `71.210,29 ₼`;
   - the cohort block names `Müqayisə olunan 23 obyekt` and carries `Bu ay 71.030,25 ₼`, `Baza 44.340,78 ₼` and
     `Fərq +26.689,47 ₼ · +60,19%`;
   - the percentage is inside that block, and nothing but the heading row and §4.3's line sits between the headline
     and the block.

   *(brief acceptance 2, 21.2, 21.2a)*
4. **The summary card has the same structure** for `basis=last`, `avg3`, `avg6`, `all` and `custom`, and with or
   without an object left out. The same elements appear in the same order, and only the basis words, the figures and
   the conditional lines of §4.2 / §4.3 differ. *(§4.2)*
5. **The missing-price exclusion** reads `Qiyməti olmayan sətirlər bu məbləğə daxil deyil.` under the headline without
   clicking anything. It is absent when nothing is missing, including a month whose only unpriced lines are internal
   supply. *(brief acceptance 3)*
6. **With `basis=avg6` selected:**
   - every card and every row (table and phone) whose delta is shown over a partial baseline shows `Baza N/6 ay`, with
     that object's own N;
   - no complete-baseline, no-baseline or no-order object shows it;
   - it is slate;
   - `təxmini` and `təqribi` appear nowhere on the page;
   - the percentages are unchanged.

   *(brief acceptance 4, 21.3)*
7. **The percentage card for `Milli Konservatoriya qarşısı`** shows `+480,01%` as its primary figure and `+1.514,82 ₼`
   beside it, with `Bu ay 1.830,40 ₼` under them. *(brief acceptance 5, 21.5)*
8. **The card order** is: largest increase, second increase, largest decrease, second decrease, **largest
   percentage**, second percentage, then the warning cards. This holds for every basis, whatever money the percentage
   objects moved. *(brief acceptance 6, 21.4)*
9. **An object with no baseline** still shows its current amount as the largest figure, with its existing
   explanation. *(§4.1)*
10. **Nothing moved:**
    - no figure changed;
    - no object moved between cards;
    - every card keeps one link, and the Task 20 tests pass unchanged;
    - all suites and both builds are green;
    - the old-terms sweep passes.

    *(brief acceptance 7)*

## 10. Required tests

**Frontend (vitest)**

`components/dashboard/AttentionSection.test.tsx`:

- **An amount card:**
  - the element with text `+23.852,70 ₼` has `cardPrimaryFigureClass`;
  - the percent has `cardSecondaryFigureClass`;
  - the next line is `Bu ay` plus the amount, in `text-sm`, not coloured;
  - the line after it is the direction sentence.
- **A percentage card:**
  - the percent is primary and the delta secondary;
  - both are present with the Milli Konservatoriya figures (`+480,01%`, `+1.514,82 ₼`, `Bu ay 1.830,40 ₼`).
- **A card with no delta:** the amount has `cardPrimaryFigureClass`, there is no `Bu ay`, and `noComparisonCause` is
  shown.
- **Coverage on the card:**
  - `Baza 2/6 ay` renders on a card with `availableBaselinePeriodCount=2`, `expectedBaselinePeriodCount=6`,
    `historyCoverage='Partial'`;
  - it has `text-slate-500` and no amber, red or green class;
  - nothing renders at 6/6.
- **Inert text:** the new elements (the `Bu ay` line, the percent, `Baza 2/6 ay`) are inert (`expectInert`), and the
  card still has one link.
- **Nothing retired:** no text on any card matches `/təxmini|təqribi/i`.
- **Existing tests.** Update those that pin the old structure, keeping their assertions of figures, tone and words:
  - :382–402, whose `nextElementSibling` of the delta is now the `Bu ay` line (the direction sentence follows it);
  - any test that finds the amount by `.text-2xl`.

`components/dashboard/DashboardSummary.test.tsx`:

- **Every basis** (`PreviousMonth`, `Previous3MonthAverage`, `Previous6MonthAverage`, `AllPriorMonths`,
  `CustomRange`), each with `summary()` and `september()`:
  - the headline equals `current.knownAmount`;
  - the cohort `group` carries `Müqayisə olunan N obyekt`, `Bu ay`, `Baza`, `Fərq` and the percent;
  - the percent is inside the `group`.
- **A structural assertion:** the sequence of element roles and labels in the headline section is identical across the
  ten fixtures, except for the §4.2 / §4.3 conditional lines.
- **The missing-price line:**
  - present with `missingPriceItemCount: 11`;
  - absent with 0;
  - absent with only `priceNotRequiredItemCount`.
- **Existing tests.** These change with this task. Update each and list it with its reason:
  - :142–147, where the change is no longer directly beneath the headline (21.2a.3);
  - :154–167, where the subtraction sentence is replaced by the cohort block;
  - :170–179, :255–261 and :268–273, where the `basis:` colon form is gone and the cohort is now always named;
  - :195–213, where the tone and nowrap classes are asserted on the figure spans rather than `closest('p')`.
  - No expectation of a figure, a word or a colour may be weakened.

`components/dashboard/LocationRows.test.tsx`:

- `Baza 2/6 ay` appears in the Dəyişmə cell and on the phone row of a partial row;
- it does not appear on complete, no-baseline or no-order rows;
- `DataState` still says `Müqayisə üçün data azdır`;
- the figures are unchanged.

`coverage/labels.test.ts` (**new**):

- `baselineCoverageLabel(2, 6) === 'Baza 2/6 ay'`;
- `baselineCoverageNote` returns null for Complete, Unavailable, a null delta and 0/6, and the label for Partial with a
  delta;
- `findOldTerms` finds nothing in the label.

`pages/ManagementDashboardPage.test.tsx`:

- A render on `basis=avg6` with partial and complete rows and cards, asserting criterion 6: every partial compared
  object shows `Baza N/6 ay` on its card and row, and no element's text matches `/təxmini|təqribi/i`.

`terminology/oldTerms.test.tsx`:

- The dashboard sweep still passes, with a partial row and a missing-price summary in its fixture.

**Backend**

- The two tests of §6. Run both suites.

## 11. Expected verification

- `dotnet build BaxOrders.slnx`: 0 warnings, 0 errors. If the running API locks `bin`, use `--artifacts-path` under
  the scratchpad, as Tasks 17–20 did.
- `dotnet test BaxOrders.slnx`:
  - UnitTests **1046**, unchanged;
  - IntegrationTests **785 + the new cases** (5 theory cases + 1 fact = 791 expected);
  - all green;
  - the defect-reproducing test fails against the old ordering line. Show this by describing the red run or by
    reasoning, and say which.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`, both
  green. The baseline is 58 files / 1158 tests; report the new counts.
- `git diff --stat` and `git status`: changes only under:
  - `frontend/bax-orders-web/src/`;
  - `src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs`;
  - `tests/BaxOrders.IntegrationTests/DashboardAttentionTests.cs`;
  - `docs/audits/2026-qerar-zenciri/21-panel-iyerarxiyasi.md`.

### Manual verification pack (operator stage)

Prepare it but do not run it: `docs/audits/2026-qerar-zenciri/21-panel-iyerarxiyasi.md`.

- Checks `E-01 … E-18`. Each result line reads `---- operator doldurur ----`.
- Cover:
  - the three-second read (which number the eye reaches first) on each of the five bases;
  - the summary card on each basis, with and without an object left out;
  - the missing-price line;
  - `Baza N/M ay` on `avg6` for at least three objects, on the card, the table and the phone row;
  - the percentage cards' absolute delta;
  - the card order, which needs an API restart for the backend line;
  - an object with no baseline.
- Viewports: `1366×768 · 1440×900 · 390×844 · 1200×800`. At `1366×768`, record how many cards fit above the fold
  before and after, since the type change affects card height.
- Screenshots are named `<ID>-<ekran>-<en>.png`.
- State plainly that the Coder did no browser check, and that the running API must be restarted to serve the new card
  order.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Ən böyük rəqəm dəyişmədir; cari məbləğ ikinci sətirdə. | §4.1; criteria 1, 2, 9; decision 21.1 |
| Həqiqi məcmu qalır; kohort ayrıca və adlandırılmış. | §4.2; criteria 3, 4; decisions 21.2, 21.2a |
| Qiyməti olmayan sətirlər görünən sətirdə. | §4.3; criterion 5 |
| "Baza 2/6 ay"; faiz "təxmini" adlandırılmır. | §4.4; criterion 6; decision 21.3 |
| Faiz kartlarında mütləq fərq. | §4.5; criterion 7; decision 21.5 |
| Faiz kartlarının sırası düzəlir. | §4.6, §6; criterion 8; decision 21.4 |
| Materiallıq həddi təyin edilmir. | §3 out of scope, §7; decision 21.5 |
| Rəqəmlər, 9.1-in rəngləri və sözləri dəyişmir. | §8; criteria 2, 10 |

---

## Assumptions the Planner made

These are design decisions, not business rules, and each can be overturned at review.

1. The primary figure takes the size the amount has today (24 px / 600) rather than a larger one, so card height
   changes as little as possible.
2. `Bu ay` names the secondary amount. It is the table's existing column word, and 21.2a uses it.
3. On a percentage card the **percent** is the primary figure and the absolute delta sits beside it. The card exists
   for its percentage, and 21.5 asks for the absolute delta *also* to be shown. On every other card the delta leads.
4. "Second line" in brief acceptance 1 is read literally. The change is line 1, `Bu ay` is line 2, and the direction
   sentence, a caption of the change, follows as line 3.
5. The cohort block is always shown, with `Bu ay` even when it equals the headline, so there is one arrangement for
   every case.
6. The basis words go on the cohort block's first line, beside the object count, instead of in parentheses after
   `Baza`. That keeps the figure line to three short label–figure pairs.
7. The visible missing-price line is `knownAmountHint` verbatim, and it is amber because it concerns owed prices. The
   ⓘ and the amber button stay, so nothing already accepted is removed.
8. `Baza N/M ay` is slate, like the order page's partial-coverage line: it states coverage, not a warning. It is shown
   only where a difference is shown over a partial baseline. A `6/6` on every complete object would be noise.
9. `DataState`'s `Müqayisə üçün data azdır` stays next to the new label. It is the chip's word, and the label is the
   count behind it.
10. The card order is fixed in the backend (`ThenBy(Rank)`) rather than by re-sorting in the browser, so there is one
    ordering and the API's order is the screen's. It cannot change the selection (§2.5).
11. No materiality threshold is introduced and no card is hidden (21.5).

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Kart iyerarxiyası — hansı rəqəm böyüdü, hansı kiçildi; faiz kartında nə aparıcıdır; kart hündürlüyünə təsiri.
2. Xülasə kartı — məcmu və kohortun necə ayrıldığı; beş bazada və `leftOut`-un hər iki halında eyni quruluş; əvvəl/sonra.
3. Qiyməti olmayan sətirlər — görünən sətir, mövcud sözlərlə; nə vaxt göstərilmir.
4. Baza əhatəsi — `Baza N/M ay`, hansı hallarda göstərilir və hansılarda yox; rəngi; "təxmini" sözünün heç yerdə olmadığının
   təsdiqi.
5. Faiz kartları — mütləq fərq; sıra düzəlişi (backend sətri, əvvəl/sonra), seçimin dəyişmədiyinin sübutu.
6. 9.1 — istiqamət cümləsinin və rənglərin toxunulmadığı.
7. Testlər — yeni testlər; dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar; build-lər.
8. Əl ilə yoxlama dəsti — fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb; API-nin yenidən başladılması lazımdır.
9. Toxunulmayanlar — heç bir rəqəm, heç bir obyekt seçimi, materiallıq həddi qoyulmadı, baza yoxdur, kontrakt dəyişmədi.
10. Sonrakı tapşırıqlar üçün qeydlər — sahibə materiallıq həddi sualı; Task 09-da tapılan hər hansı defekt.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
