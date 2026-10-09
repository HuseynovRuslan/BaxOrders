# TASK 09 — İDARƏETMƏ PANELİ UX (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-09.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **one part, not split.** A small backend addition to the dashboard query (a rank on each attention card, two
filters, one sort, one selection tweak — all in memory, no new query) and a rework of the dashboard page and its
four components with their tests. It is about the size of Task 8, whose Coder session took ≈ 22 minutes, so it fits
one session.
Specification status: READY — written by the Planner on 2026-09-25 from the brief and the repository at `1a53445`
(Task 8's accepted commit). Line numbers below are at `1a53445`.

This task **reads** data and changes how the dashboard presents it. It changes no stored figure, no schema, no row
in the database. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief's goal: "Paneli açan rəhbər 10 saniyədə hansı obyektə baxacağını bilsin və bir kliklə oraya keçsin. Geri
qayıdanda qaldığı yerə dönsün."

The owner's dependency table (`BRIEFS/OWNER_BRIEFS_MASTER.md`) gives Task 09 "Panel: kartlar, çiplər, cədvəl,
naviqasiya; rəng qaydası", depending on 05 and 07. **This task owns decision 9.1** (cost increase red, decrease green,
as direction, never good/bad). Task 6 already wrote the rule once as `costDirectionToneClass` /
`costDirectionBarClass`, Task 8 added `costDirectionTintClass` (`components/analytics/format.ts:320–357`), with the
words `costIncreasedLabel` / `costDecreasedLabel` (`terminology/terms.ts:74–75`). Tasks 6, 7 and 8 moved their screens
onto it; this task moves the rest of the dashboard and closes the rule's wording on the dashboard. `DriverList.tsx`
and `TrendModal.tsx` (Task 10) and the location analytics screen (`components/analytics/labels.ts`, Task 11) keep
`signedToneClass` until their own tasks.

## 2. Verified current behaviour (repository at `1a53445`)

### 2.1 The page — `pages/ManagementDashboardPage.tsx`

- Order on screen (`:185–320`): `PageHeader` (title + description, `mb-6`) → a controls row (Dövr select, `BasisPicker`,
  `mb-4`) → `DashboardSummary` (headline grid **and** the exceptions block **and** the coverage chips) →
  `AttentionSection` → "Bütün obyektlər" → search / "Məlumat vəziyyəti" select / sort select → `LocationRows` → pager.
  So at 1366×768 the attention cards start below the chips and exceptions — the brief's first complaint.
- `pageSize = 25` (`:28`): 27 objects make two pages.
- Default sort is `LocationName` (`:53`); "Ən çox dəyişən" maps to `KnownAmountDelta` descending, which is the signed
  delta — the biggest *decrease* comes last, not second.
- One "Məlumat vəziyyəti" select (`:119–136`, `:251–263`) maps three reader choices onto three API filters
  (`priceCoverage=Partial`, `historyCoverage=Unavailable`, `hasCurrentRequest=false`). None of them matches a chip:
  `priceCoverage=Partial` misses an object whose every owed line is unpriced (`CoverageOf` returns `Unavailable` for it,
  `ManagementDashboardQueries.cs:353–359`), while the chip counts `MissingPriceItemCount > 0` (`:630`).
- Every reload sets `dashboard` to `loading` (`:147`), so `data` is null and **the whole page body disappears** until
  the answer arrives. That collapse is why "Növbəti" (and any filter or sort change) throws the reader to the top.
- The app uses a plain `BrowserRouter` (`main.tsx:16`) — there is no `ScrollRestoration` and no scroll handling
  anywhere. The dashboard fetches after mount, so the browser's own restoration runs against a short page and lands at
  the top. "Geri" is the browser's Back button: no in-app back link exists on the order page.

### 2.2 The attention cards

- Backend `Attention` (`ManagementDashboardQueries.cs:309–344`): five reasons, `PerReason = 2` each (`:36`),
  `MaxAttention = 8` (`:33`). Candidates are taken **before** de-duplication; an object in two reasons keeps its first
  reason. Consequences, exactly the audit's:
  - two cards both titled "Ən böyük məbləğ artımı" (Heydər Əliyev, Novxanı) — the title is per reason, not per rank;
  - two cards both titled "Ən böyük faiz dəyişməsi" (Bayıl yolu, Milli Konservatoriya);
  - when the largest percentage belongs to an object already carded for money (Novxanı, "Son 3 ay"), it is de-duplicated
    away and the percent card goes to the runner-up (Milli Konservatoriya, +85,55%) under the title "Ən böyük faiz
    dəyişməsi" — a false statement;
  - two "Qiymət yoxdur" cards and two "Müqayisə üçün əvvəlki ay yoxdur" cards would share titles too.
- The percentage reason considers only rows with `|p| ≥ 50` and a baseline `≥ 100 ₼` (`StrongPercentage`,
  `MeaningfulBaseline`, `:39–42`, `:315–318`).
- `DashboardAttentionDto(Reason, Location)` (`DashboardDtos.cs:65`) carries no rank.
- Frontend `AttentionSection.tsx`: title from `attentionReasonLabels` (`components/dashboard/labels.ts:105–111`); amber
  title for both warning reasons (`attentionReasonIsWarning`, `:119–125`; card `:94–100`); the delta line is already on
  9.1 with an `sr-only` direction word (`:112–117`); caption "Keçən aya görə" (`:118`); `Causes` ends with two amber
  sentences — `incompleteExplanationNote` ("Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.")
  and `missingPriceCount(N)` ("N sətirdə qiymət yoxdur") (`:180–188`) — on almost every card.

### 2.3 The headline — `components/dashboard/DashboardSummary.tsx`

- The difference sits directly under the month total (`:76–86`): 71.210,29 ₼ then +26.689,47 ₼. When an object has no
  baseline (EXPO, "Keçən ay"), the compared amount (71.030,25 ₼) is on a later line (`:93–106`), so the subtraction on
  screen does not work: 71.210,29 − 44.340,78 ≠ 26.689,47.
- The delta is coloured with `signedToneClass` (`:81`, pre-9.1: green up); the sentence under it is
  `describeDirection` — "Keçən aydan yüksəkdir" (`:58`, `:86`), not "xərc artıb / azalıb".
- The coverage chips (`DataCoverage`, `:167–217`) are `<dt>/<dd>` text, not buttons; every non-"Müqayisə olunan"
  group with members is amber (`chipClass`, `:219–232`); "Müqayisə olunan" shows even at 0 (`:168–169`). The price
  chip reads `missingPriceChipLabel` — "Qiymət yoxdur · N obyekt" (`coverage/labels.ts:189–191`).
- The one-line price warning "N obyektin sifarişində qiyməti olmayan sətir var" (`:116–120`) is plain text.

### 2.4 The table — `components/dashboard/LocationRows.tsx`

- `signedToneClass` on the row delta and percent (`:109`, `:112`), the footer (`:162`, `:165`), the phone list (`:191`,
  `:230`) and the main cause (`:261`).
- Missing prices are a sentence under the amount (`MissingPrices`, `:308–318`); the data-state column repeats
  `incompleteExplanationNote` in amber (`:300–302`); a no-order row is amber (`:288`). The compact "Detallara bax"
  (`AttentionSection.tsx:222–248`) has no `whitespace-nowrap` and breaks onto two lines.

### 2.5 Backend filters and sorts

- `DashboardQuery` (`DashboardDtos.cs:189–207`): `HistoryCoverage`, `PriceCoverage`, `HasCurrentRequest`, `Sort`
  (default `LocationName`), `Descending`, `Page`, `PageSize` (default 25, capped at `MaxPageSize = 100`). No group
  filter, no missing-price filter, no magnitude sort. `Filter` `:471–498`, `Sort` `:504–535` (a row with no figure goes
  last in both directions).
- The portfolio group of each row is computed only inside `Summarize` (`:556–561`), from `PortfolioCohort.GroupOf`.
- The dashboard runs **five** queries (`DashboardCauseTests.Naming_a_cause_for_every_object_costs_no_extra_query`).

## 3. Scope

In scope — every line of the brief's "İstədiyim nəticə":

- A. The first screen at 1366×768 shows at least the first attention card.
- B. Card titles say truthfully why each card is there: no title repeats; "ən böyük" only on the object that really
  is the largest.
- C. The price warning on a card is a short mark with a count, not a repeated sentence; amber is kept for missing
  prices only.
- D. Decision 9.1 on the whole dashboard (headline, cards, table, phone list): increase red, decrease green, explained
  as "xərc artıb / azalıb".
- E. Every chip is a button that filters the table to exactly the objects it counts; zero chips are not shown; "Qiymət
  yoxdur · N obyekt" shows those N objects. The headline's price warning leads there too.
- F. The table: all 27 objects on one page; default order by the size of the change; buttons and warnings on one line;
  the page does not jump when the table reloads.
- G. Back from an order returns to where the reader was — the card they opened.
- H. With an excluded object, the difference sits beside the compared amount, as a subtraction that works.
- I. "Bütün dövr" basis: the cards are chosen by the same honest rule, proved by a test on every basis.
- J. Tests.

Out of scope (the brief's list, plus later tasks):

- the product name and share on the card — Task 7 (accepted; keep it exactly);
- codes, words, money format — Task 5 (accepted); new words come from `src/terminology` or `coverage/labels.ts`;
- the Rəhbər's read-only pricing classification — Task 14;
- the phone layout — Task 12 (the phone list only gets 9.1 colours and the ⚠ mark here; its structure stays);
- "Əsas dəyişikliklər", product history (`DriverList.tsx`, `TrendModal.tsx`) — Task 10; the location screens
  (`components/analytics/labels.ts`, `LocationAnalyticsPage`, `LocationDetailPage`) — Task 11;
- the monthly report — Task 8 (accepted; untouched);
- any change to a figure the dashboard already computes.

## 4. Required behaviour

### 4.1 The attention shortlist (backend)

`DashboardAttentionDto` gains, **at the end**:

```csharp
/// <param name="Rank">
/// The object's place, from 1, in its reason's own ordering over every object that qualifies for that reason —
/// counted before any object is set aside for having a card under an earlier reason. Rank 1 is the largest.
/// </param>
/// <param name="AlsoFirstIn">
/// The other movement reasons (largest increase, largest decrease, largest percentage) in which this object is
/// rank 1, so a largest figure is never hidden behind another card's title.
/// </param>
public sealed record DashboardAttentionDto(
    DashboardAttentionReason Reason, LocationDashboardRowDto Location,
    int Rank, IReadOnlyList<DashboardAttentionReason> AlsoFirstIn);
```

In `Attention` (`:309–344`):

1. Each reason's ordering is made explicit and total, ties by name (`ThenByName(row => row.LocationName)`, the helper
   `Sort` already uses):
   - `LargestIncrease`: `KnownAmountDelta > 0`, delta descending;
   - `LargestDecrease`: `KnownAmountDelta < 0`, delta ascending;
   - `StrongPercentageChange`: the existing `meaningful` set (`|p| ≥ 50`, baseline `≥ 100`), `|p|` descending;
   - `MissingRequiredPrice`: `MissingPriceItemCount > 0`, count descending;
   - `NoComparisonHistory`: `NoBaselineHistory`, current amount descending.
2. `Rank` = 1 + the row's index in its reason's ordering.
3. **The two warning reasons contribute one card each** (`MissingRequiredPrice`, `NoComparisonHistory`); the three
   movement reasons keep two (`PerReason`). `MaxAttention = 8` stays (2 + 2 + 2 + 1 + 1). The one-card-per-object rule
   (first reason wins) and the final order (`OrderBy(Reason).ThenByDescending(|delta|)`) stay as they are. Reason: a
   warning card's title cannot rank ("the object with the second-most missing prices" is not why anybody looks), so a
   second card would repeat the first one's title; every object of those groups is one click away on its chip (§4.5).
4. `AlsoFirstIn` = the movement reasons other than the card's own for which this object's `Rank` would be 1. Empty for
   most cards.

Consequences the tests must pin: movement cards have `Rank ∈ {1, 2}`; no two cards share `(Reason, Rank)`; the rank-1
object of each movement reason is on screen — either under that reason with rank 1, or on another card with that
reason in `AlsoFirstIn`; nothing else about the selection moves (the same objects under the three movement reasons as
before). No new query.

### 4.2 The card (frontend)

In `components/dashboard/labels.ts` add one builder, e.g. `attentionTitle(reason, rank): string`:

| Reason | Rank 1 | Rank 2 |
|---|---|---|
| `LargestIncrease` | Ən böyük məbləğ artımı | İkinci ən böyük məbləğ artımı |
| `LargestDecrease` | Ən böyük məbləğ azalması | İkinci ən böyük məbləğ azalması |
| `StrongPercentageChange` | Ən böyük faiz dəyişməsi | İkinci ən böyük faiz dəyişməsi |
| `MissingRequiredPrice` | `missingPriceShortLabel` ("Qiymət yoxdur") | — (one card) |
| `NoComparisonHistory` | `portfolioGroupLabels.NoBaseline` ("Müqayisə bazası yoxdur") | — (one card) |

- A rank above 2 is not expected (4.1); if it arrives, the builder returns the reason's plain words without "ən böyük"
  rather than a false superlative.
- `NoComparisonHistory`'s title becomes the brief's own decided wording "Müqayisə bazası yoxdur" (it was "Müqayisə
  üçün əvvəlki ay yoxdur", which is false on an averaged basis). `noComparisonCause` on the card body stays.
- The percentage title carries an `InfoHint` (the existing component) saying what it is the largest of — e.g. "Faiz
  yalnız müqayisə bazası ən azı 100 ₼ olan obyektlər arasında müqayisə olunur." — a constant in `labels.ts`, with a
  comment naming `ManagementDashboardQueries.MeaningfulBaseline` as its source.
- `AlsoFirstIn` non-empty → one quiet line under the object name, e.g. "Həm də ən böyük faiz dəyişməsi" (builder
  `alsoFirstLine(reasons)`, rank-1 wording of each reason joined with " · ", lower-cased after "Həm də").
- The caption under the delta (`:118`) becomes the direction sentence of 4.4 — "Keçən aya görə xərc artıb" — so the
  "…görə" wording (Task 1) stays and the explanation is in words. The `sr-only` direction word on the delta line is
  then redundant and is dropped; the one on the product amount (Task 7) stays.
- **The price mark.** `Causes` no longer prints `incompleteExplanationNote` or `missingPriceCount(N)` as sentences
  (`:180–188`). Instead the card shows one short mark on the line of the big amount, right of it:
  - `current.missingPriceItemCount > 0` → `⚠ N` (amber-800, `text-xs font-medium`, `whitespace-nowrap`); its `title`
    and accessible name: `missingPriceCount(N)`, followed by `incompleteExplanationNote` when
    `!explanationIsComplete`;
  - count 0 but `!explanationIsComplete` (a baseline month is missing prices) → `⚠` alone, named
    `incompleteExplanationNote`;
  - otherwise nothing.
  One mark component, reused by the table (§4.6).
- **Amber** on a card is only: the ⚠ mark, and the title of the `MissingRequiredPrice` card. The `NoComparisonHistory`
  title is slate, like a movement card's (it states a fact about the window, nothing is owed). Rename or replace
  `attentionReasonIsWarning` accordingly; its doc comment says why.
- Each card's root gets `id="attention-{locationId}"` (the Back anchor, §4.7).
- Everything Task 7 put on the card stays exactly: the "Əsas səbəb" caption, the primary cause line (still the loudest
  line of the block), the product line with its share, the two secondary causes with `causeTieOrder`, the supply note.

### 4.3 The headline — the subtraction (H)

In the headline card (`DashboardSummary.tsx:70–121`):

- **No excluded object** (`partition.noBaseline.length === 0`): as today — the month total, the delta right under it,
  then the basis line (the total *is* the compared amount, so the subtraction on screen works).
- **An excluded object**: the delta is **not** under the month total. The total stands alone with its heading. The
  comparison is one block, written as the subtraction it is:

  ```
  Müqayisə olunan 23 obyekt: 71.030,25 ₼ − Keçən ay: 44.340,78 ₼ = +26.689,47 ₼ · +60,19%
  Keçən aya görə xərc artıb
  Müqayisəyə daxil deyil: EXPO (bu ay 180,04 ₼) — keçən ay sifarişi yoxdur
  ```

  Figures: `comparedCurrent.knownAmount`, `baseline.knownAmount`, `knownAmountDelta`, `knownAmountPercentChange` — all
  from the backend; the browser subtracts nothing. The basis label is the one the line uses today
  (`describeBasisWithRange`). The `=` part is `font-semibold` and 9.1-coloured; the operands `font-medium
  text-slate-700`. Use `−` (U+2212) as `formatMoneyDelta` does. The wrapping is free, but the three figures are one
  element so a reader (and a test) finds them together.
- In both cases the sentence under the delta is the 4.4 direction sentence, replacing `describeDirection` on this
  screen (`describeDirection` itself stays; Task 11's screen uses it).
- `InfoHint`s, the excluded-objects line, the "24 / 27" card: unchanged in content.

### 4.4 Colour and words (9.1) on the whole dashboard (D)

- `DashboardSummary.tsx` and `LocationRows.tsx` stop importing `signedToneClass`; every signed figure (headline delta,
  row delta and percent, main cause, footer delta and percent, the phone list's delta and footer) uses
  `costDirectionToneClass`. After this task no file under `components/dashboard/` or `pages/ManagementDashboard*`
  imports `signedToneClass`. Its doc comment in `format.ts` then names only Tasks 10 and 11.
- One sentence builder in `terminology/terms.ts`, e.g.
  `costDirectionSentence(caption: string, delta: number | null): string | null` → `"{caption} xərc artıb"` /
  `"{caption} xərc azalıb"` / `"{caption} xərc dəyişməyib"` (new constant `costUnchangedLabel = 'xərc dəyişməyib'`) /
  null for null. `caption` is `describeBasisCaption(...)` ("Keçən aya görə", "Son 3 ayın ortalamasına görə", …). Used
  by the headline (4.3) and the card (4.2).
- The table's delta cell and the footer delta add an `sr-only` direction word (`costIncreasedLabel` /
  `costDecreasedLabel`); move the card's `DirectionWord` to one shared place (e.g. export it from
  `components/analytics/`), do not copy it.
- No "yaxşı / pis", "müsbət / mənfi" or any verdict word anywhere on the dashboard.

### 4.5 The chips (E)

Backend:

- `DashboardQuery` gains, **at the end**: `PortfolioGroup? Group = null` and `bool? MissingPrice = null`. The
  controller validates `Group` with `Require` like the other enums.
- `GetAsync` computes each row's `PortfolioGroup` **once** (today's `Summarize` code, `:556–561`) and hands the same
  dictionary to `Summarize` and to `Filter`, so a chip's count and its filter cannot drift.
- `Filter`: `Group` → rows in that group; `MissingPrice == true` → `HasCurrentRequest && Current.MissingPriceItemCount
  > 0`, written once as a static predicate that `Summarize`'s `LocationsWithMissingPrices` (`:630`) also uses.
- Existing filters, their API spelling and their behaviour are unchanged (old links keep working).

Frontend (`api/dashboard.ts`, the page, the chips):

- `DashboardRequest` gains `group?: PortfolioGroup` and `missingPrice?: boolean`; URL params `group=<Group>` and
  `missingPrice=true`, read and validated like the others.
- Every chip is a `<button type="button" aria-pressed>`:
  - each portfolio group **with a count above 0** (including "Müqayisə olunan") → `group=<Group>`;
  - "Müqayisə üçün data azdır" (partial history), when above 0 → `historyCoverage=Partial`;
  - "Qiymət yoxdur · N obyekt", when above 0 → `missingPrice=true`.
  A chip with 0 is not rendered. Clicking a chip sets its filter and clears the other data filters (`group`,
  `historyCoverage`, `priceCoverage`, `hasCurrentRequest`, `missingPrice`) and the page; the search stays. Clicking the
  active chip clears it. The active chip looks pressed (a darker ring / background) and says so (`aria-pressed`).
- The counts come from `summary` (the whole month), so they do not change when a chip is active. The closing
  "= 27 obyekt" stays as text; the groups (shown + hidden zeros) still add up to it (Task 1b).
- Chip colours: slate for groups and the partial-history flag; amber only for "Qiymət yoxdur · N obyekt" (amber means
  a missing price, §4.2).
- The "Məlumat vəziyyəti" select is removed — the chips replace it. The page still reads `priceCoverage`,
  `historyCoverage` and `hasCurrentRequest` from an older URL and sends them, and "Filtri təmizlə" clears all five.
- The headline's "N obyektin sifarişində qiyməti olmayan sətir var" becomes a text button that applies
  `missingPrice=true` and brings the "Bütün obyektlər" heading into view (`scrollIntoView({ block: 'start' })`). Its
  words do not change.

### 4.6 The table (F)

- **One page:** the page asks for `pageSize = 100` (`ManagementDashboardQueries.MaxPageSize`). The pager stays for a
  company with more than 100 objects and is not shown otherwise.
- **Default order by size of change:** new `DashboardSort.AbsoluteKnownAmountDelta = 11` (backend key
  `|KnownAmountDelta|`; a row with no delta goes last, by name — the existing rule), mirrored in `api/dashboard.ts`,
  `sortOrder` and `isSort`. With no `sort` in the URL the page asks for `AbsoluteKnownAmountDelta` descending and writes
  nothing to the URL. The select offers, in order: "Ən çox dəyişən" (`AbsoluteKnownAmountDelta`, descending — the
  default), "Bu ayın məbləği üzrə" (`CurrentKnownAmount`, descending), "Obyekt adı üzrə" (`LocationName`, ascending).
  A `sort` in the URL that is not one of these three is treated as absent. The API's own default (`LocationName`) is
  unchanged.
- **One line:** the compact "Detallara bax" is `whitespace-nowrap` (and its cell does not shrink); the "Bu ay" cell
  shows the §4.2 ⚠ mark **beside** the amount on the same line instead of the `missingPriceCount` sentence under it;
  the data-state column no longer repeats `incompleteExplanationNote` (the mark carries it); the no-order status
  (`noOrderRowStatus`) is slate, not amber.
- **Rows** get `id="row-{locationId}"` (Back anchor).
- **No jump on reload:** the page keeps the last loaded dashboard on screen while the next one loads — the summary,
  cards, chips and table stay; the region is `aria-busy="true"` and the table is dimmed (e.g. `opacity-60`) until the
  new answer replaces it. `LoadingRows` shows only when nothing has loaded yet. An error still shows `ErrorState`.
  Keep the existing `lastKey` guard so a stale response never overwrites a newer one.
- The footer, the phone list's structure and the table's columns are otherwise unchanged.

### 4.7 Back returns to where the reader was (G)

A small hook, e.g. `src/navigation/useScrollMemory.ts`, used by the dashboard page:

- It keys everything by `useLocation().key` in `sessionStorage` (one entry per history entry).
- While the page is shown it records `window.scrollY` (throttled with `requestAnimationFrame`, and once more on
  unmount), and it records the **anchor** — the `id` of the nearest ancestor carrying `id="attention-…"` / `"row-…"` —
  when a link inside one is clicked (one delegated `click` listener on the page's root element).
- On mount with `useNavigationType() === 'POP'` and a saved entry, it waits until the dashboard has data, then: anchor
  element present → `scrollIntoView({ block: 'center' })`; otherwise `window.scrollTo(0, y)`. It restores once per
  mount. A `PUSH` / `REPLACE` arrival (menu click, a new link) starts at the top as today.
- While mounted, `history.scrollRestoration = 'manual'`; restored to its previous value on unmount.
- The basis still travels in the URL, so Back restores the basis as well (Task 1; unchanged).

### 4.8 The first screen (A)

- `PageHeader` loses its description ("Sifarişlərin obyektlər üzrə ümumi görünüşü"); the Dövr select and the
  `BasisPicker` move into its `actions` slot (the same row as the title, wrapping under it on narrow screens).
- New order on the page:
  1. title + controls;
  2. the headline grid (the amount card and the "24 / 27" card) — `DashboardSummary` is split so the page can place
     its parts (e.g. `DashboardHeadline`, `DashboardExceptions`, `DashboardCoverageChips`; the Coder may choose names);
  3. `AttentionSection`;
  4. the exceptions block ("Müqayisədən kənarda qalan obyektlər", every excluded object by name — unchanged content);
  5. "Bütün obyektlər", then the chips (they filter what is directly under them), then search and sort, then the table.
- Budget: at 1366×768 the browser shows ≈ 640px of page. The top of the attention section must sit at or above
  ≈ 400px from the top of the document **in the tallest headline case** (an excluded object and a price warning), so
  the first card's title, object name, amount and change are visible without scrolling. In the report, state the
  arithmetic from the classes used (header 64 + main padding + title row + headline card + gaps).

### 4.9 "Bütün dövr" (I)

Nothing is built specially for it: 4.1's rule is basis-independent. It is proved on every basis by the integration
test of §10, and the operator confirms it on the real data (§11).

---

## 5. Files — summary for the Coder

Changed (expected):

- Backend: `Application/Analytics/Dashboard/DashboardDtos.cs` (`DashboardAttentionDto`, `DashboardQuery`);
  `DashboardContracts.cs` (`AbsoluteKnownAmountDelta`); `ManagementDashboardQueries.cs` (`Attention`, `Filter`, `Sort`,
  the shared group dictionary and missing-price predicate); `Api/Controllers/DashboardController.cs` (validate `Group`).
- Backend tests: `tests/BaxOrders.IntegrationTests/ManagementDashboardTests.cs`, `PortfolioCohortTests.cs`,
  `DashboardCauseTests.cs` (existing attention asserts still hold), and a new
  `tests/BaxOrders.IntegrationTests/DashboardAttentionTests.cs` (or inside `ComparisonBasisConsistencyTests.cs`).
- Frontend: `api/dashboard.ts`; `pages/ManagementDashboardPage.tsx`; `components/dashboard/AttentionSection.tsx`,
  `DashboardSummary.tsx` (split), `LocationRows.tsx`, `labels.ts`; `coverage/labels.ts` (only if a chip word needs a
  builder; no existing word changes); `terminology/terms.ts` (`costDirectionSentence`, `costUnchangedLabel`, card
  words); `components/analytics/format.ts` (only the `signedToneClass` comment); a shared direction-word component; the
  new `navigation/useScrollMemory.ts`.
- Frontend tests: `pages/ManagementDashboardPage.test.tsx`, `components/dashboard/AttentionSection.test.tsx`,
  `DashboardSummary.test.tsx`, `LocationRows.test.tsx`, `terminology/terms.test.ts`, `terminology/oldTerms.test.tsx`,
  `test/dashboardFixtures.ts`, a new `navigation/useScrollMemory.test.tsx` (or inside the page test); every fixture that
  builds a `DashboardAttention` (gains `rank`, `alsoFirstIn`).

Not changed: `PeriodComparison`, `CauseDecomposition`, `CauseLeader`, `PortfolioCohort.GroupOf` / `Partition`, the
order page and its API, `DriverList.tsx`, `TrendModal.tsx`, `CauseSummary.tsx`, `DecisionHeadline.tsx`, the monthly
report, `components/analytics/labels.ts`, `describeDirection`, `signedToneClass`'s behaviour, `pricing/labels.ts`,
`AppLayout` / `Header` / `Sidebar`, `tools/`.

Keep the codebase's idiom: comments say *why*; one word per idea from `src/terminology` / `coverage/labels.ts`; C# XML
doc comments in the style of `DashboardDtos.cs`; rewrite doc comments whose design changes (the page's "Meaning
first…", `attentionReasonIsWarning`, `DataCoverage`'s amber rule, "the default is the object's name" in
`labels.ts:54–57` and in `DashboardContracts.cs:42–46` — the latter now says the *page* opens on the size of the
change while the API default stays the name).

## 6. Backend requirements

- As 4.1, 4.5 and 4.6. In-memory work only; the dashboard stays at **five** queries
  (`Naming_a_cause_for_every_object_costs_no_extra_query` unchanged) and writes nothing
  (`Reading_the_dashboard_writes_nothing`).
- No schema change, no EF migration, no new endpoint. Every existing figure, filter and sort answers as before.
- If a requirement seems to need a change to a figure the dashboard already returns, **STOP** and report why.

## 7. Safety and STOP conditions

- **No access to the real database**: do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or anything under
  `tools/`. Integration tests use their own disposable databases.
- No data change; HD-002's 94 rows untouched.
- No figure changes: every amount, delta, percentage, count, cause, product share and total stays what it is. If the
  headline's `ComparedCurrent − Baseline` ever differs from `KnownAmountDelta` in a test, **STOP** — do not adjust a
  figure; report it.
- Do not rework Tasks 1–8; a defect found there goes into the report.
- Do not touch the screens of later tasks (§3), even to "make the colours consistent".
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- Task 1: the basis lives in the URL; every card, row and excluded-object link carries it to the order / object page;
  Back restores it; "Xüsusi seçim" never blanks the panel; each card says "…görə".
- Task 1b / 1c: the comparison is over one cohort; the exceptions are named — "Sifariş qeydə alınmayıb", "Müqayisə
  bazası yoxdur", "Sistemdə hələ sifarişi yoxdur"; the headline equals the table footer and every total holds to the
  qəpik; the chips add up to the object count.
- Task 2: ⚠ counts only lines somebody owes a price for; internal supply is never a warning.
- Task 3: 24 / 27 objects; every object has a row; full names; Azerbaijani alphabetical order where the name decides.
- Task 5: the words ("Müqayisə üçün data azdır", "Yeni məhsullar", …), money format, no codes / versions on screen; the
  old-terms sweep stays green.
- Task 7: the card's "Əsas səbəb" caption, primary cause line (the loudest line of its block), product line and share,
  two secondary causes — unchanged in content and order.
- Task 8: the monthly report — untouched.
- The three movement reasons pick the same objects as before; every object stays in the table whatever its card.
- The dashboard: five queries, writes nothing; no schema, migration or data change.

## 9. Acceptance criteria

1. At 1366×768 the first attention card (title, object, amount, change) is visible without scrolling: the page order is
   title + controls → headline → cards → exceptions → chips → table, and the report's height arithmetic puts the cards
   at or above ≈ 400px in the tallest headline case. *(brief acceptance 1)*
2. No two cards share a title; "Ən böyük faiz dəyişməsi" is only on the object with the largest percentage among the
   objects the reason considers; a runner-up says "İkinci ən böyük …"; a largest figure carded under another reason is
   named on that card ("Həm də ən böyük …"); the warning reasons show one card each. On a Novxanı / Milli
   Konservatoriya-shaped fixture ("Son 3 ay"), Milli's card does not say "Ən böyük". *(brief acceptance 2)*
3. A Heydər Əliyev-shaped card's change is red and a Fəvvarələr-shaped card's green, each with "… xərc artıb" /
   "… xərc azalıb" in words; the headline, table, footer and phone list follow 9.1; no dashboard file imports
   `signedToneClass`; no "yaxşı / pis". *(brief acceptance 3; 9.1)*
4. Clicking "Qiymət yoxdur · 10 obyekt" leaves exactly those 10 objects in the table (the API's
   `missingPrice=true` count equals `LocationsWithMissingPrices`); every group chip leaves exactly its members; zero
   chips are not shown; the chips still add up to the object count; the headline's price line applies the same filter.
   *(brief acceptance 4)*
5. All 27 objects are on one page and the table opens on the largest change by size (a −8.000 row before a +5.000
   row), rows without a change last. *(brief acceptance 5)*
6. From the Heydər Əliyev card to its order and Back, the page returns with that card in view (the anchor is scrolled
   into view once data has loaded); the basis is still the one chosen. *(brief acceptance 6)*
7. On "Keçən ay" with an excluded object, "71.030,25 ₼ − Keçən ay: 44.340,78 ₼ = +26.689,47 ₼" is one line and the
   difference is not under the 71.210,29 ₼ total. *(brief acceptance 7)*
8. On every basis, including "Bütün dövr", the §10 attention invariants hold.
9. Cards carry a short ⚠ mark instead of the two sentences; amber appears only for missing prices; buttons and ⚠ marks
   stay on one line in the table; a reload does not blank the page.
10. Nothing else changed: all figures, five queries, the order page, the monthly report; all suites and both builds
    green; the old-terms sweep passes.

## 10. Required tests

Backend — integration (new `DashboardAttentionTests`, over `ComparisonBasisConsistencyTests`' `EveryBasis` or an
equivalent theory; fixture: several months, objects with rising and falling money, a large-percentage object that is
also a large-money object, two objects with missing prices, two with no baseline, one never ordered):

- per basis: no two cards share `(Reason, Rank)`; every movement card's `Rank` is 1 or 2 and equals its position in
  that reason's ordering computed independently from `Rows` (fetched with `pageSize: 100`); each movement reason's
  rank-1 object is carded under it with rank 1 **or** carries it in `AlsoFirstIn`; `MissingRequiredPrice` and
  `NoComparisonHistory` contribute at most one card each; a card's `Location` equals that object's table row;
  `Count <= 8`; one card per object;
- the Novxanı shape: object A is 2nd by money and 1st by percentage, object B 2nd by percentage → A is
  `LargestIncrease` rank 2 with `AlsoFirstIn = [StrongPercentageChange]`, B is `StrongPercentageChange` rank 2;
- the movement reasons choose the same objects as the pre-change rule would (assert the object sets by construction).

Backend — integration (`ManagementDashboardTests`):

- `missingPrice=true` returns exactly the rows with an owed missing price, and its count equals
  `Summary.LocationsWithMissingPrices` — including an object whose every owed line is unpriced (the case
  `priceCoverage=Partial` misses);
- `group=<each of the four>` returns exactly that group's partition members; the four counts add up to
  `LocationCount`;
- `sort=AbsoluteKnownAmountDelta&descending=true`: −8.000 before +5.000 before +10 (by size), rows with no delta last by
  name; ascending mirrors it with the no-delta rows still last;
- an invalid `group` value is a 400, like the other enums;
- `Rows_sort_by_name_by_default_and_by_money_when_asked` still passes unchanged (the API default is still the name);
- `Naming_a_cause_for_every_object_costs_no_extra_query` still 5.

Backend — the headline identity: with a no-baseline object under "Keçən ay", `ComparedCurrent.KnownAmount −
Baseline.KnownAmount == KnownAmountDelta` and `Current.KnownAmount − ComparedCurrent.KnownAmount` equals the excluded
objects' current money (add to `PortfolioCohortTests` / `MoneyIdentityTests` only if not already asserted — say which).

Frontend (vitest):

- `labels` / `terms`: `attentionTitle` for every reason and rank 1 / 2 (and >2 → no superlative); `alsoFirstLine`;
  `costDirectionSentence` (+, −, 0, null); every new word passes `findOldTerms`; no "yaxşı / pis".
- `AttentionSection.test.tsx`: two `LargestIncrease` cards read "Ən böyük məbləğ artımı" and "İkinci ən böyük məbləğ
  artımı"; a card with `alsoFirstIn: ['StrongPercentageChange']` shows "Həm də ən böyük faiz dəyişməsi"; the percentage
  title has its hint; the `NoComparisonHistory` card reads "Müqayisə bazası yoxdur" and is not amber; a card with 3
  missing lines shows "⚠ 3" named "3 sətirdə qiymət yoxdur" (+ the incomplete note when `explanationIsComplete` is
  false) and neither sentence as visible text; an increase card's delta `text-red-700` with "Keçən aya görə xərc artıb",
  a decrease `text-emerald-700` with "… xərc azalıb"; the Task 7 product-line tests still pass unchanged; the card root
  has `id="attention-{id}"`.
- `DashboardSummary` tests: with an excluded object, one element contains "71.030,25 ₼", "44.340,78 ₼" and
  "+26.689,47 ₼", and the element right under "71.210,29 ₼" does not contain "+26.689,47"; without one, the delta sits
  under the total as before; the delta is `text-red-700` / `text-emerald-700`; the sentence is "… xərc artıb /
  azalıb"; chips are buttons, zero chips absent, "Müqayisə olunan" absent at 0, the price chip amber and the others not;
  clicking a chip calls back with its filter; an active chip is `aria-pressed="true"`; the price line is a button.
- `LocationRows` tests: 9.1 classes on row, footer and phone list, no `text-rose-700`; the `sr-only` direction word;
  `⚠ N` beside the amount on the same line, no `missingPriceCount` sentence below it; no `incompleteExplanationNote` in
  the data-state column; the compact "Detallara bax" is `whitespace-nowrap`; rows have `id="row-{id}"`.
- `ManagementDashboardPage.test.tsx`: the first request carries `pageSize=100`, `sort=AbsoluteKnownAmountDelta`,
  `descending=true`; choosing "Obyekt adı üzrə" sends `sort=LocationName`; clicking "Qiymət yoxdur · 10 obyekt" sends
  `missingPrice=true` and puts it in the URL, and clears `group`; clicking a group chip sends `group=NoBaseline`;
  an older link with `priceCoverage=Partial` is still sent; "Filtri təmizlə" clears all; the "Məlumat vəziyyəti"
  select is gone; the attention section precedes the exceptions block, which precedes the chips, which precede the
  table, in document order; while a second response is pending the summary and the previous table are still in the
  document (`aria-busy="true"`).
- Back: in a `MemoryRouter` with the dashboard and a stub order route, click the Heydər Əliyev card's "Detallara bax",
  go back (`navigate(-1)`), let the data load → `scrollIntoView` (mocked on `Element.prototype`) was called on
  `#attention-{id}`; arriving by a `PUSH` restores nothing; `history.scrollRestoration` is `manual` while mounted and
  restored after.
- `oldTerms.test.tsx`: the dashboard fixture carries `rank`, `alsoFirstIn`, an excluded object and an active chip so the
  new words are swept.

Existing tests that change **deliberately** — name each in the report with the brief line behind it. Expected:
"is the whole month, with the change directly beneath it" (only without an excluded object now — brief: "fərq
müqayisə olunan məbləğin yanında"); "says which way it went and against what, in words" / "says a rise is a rise"
(now "xərc artıb" — 9.1); "colours the change by direction alone" in `DashboardSummary` and `LocationRows` (red up —
9.1); "ambers only the groups that have somebody in them" (only the price chip — brief: "narıncı rəng çox işlənir");
"chips the groups and shows them adding up" (buttons; zero groups hidden — brief: "sıfır saylı çip görünmür");
"names them beside the money they affect" and "says when part of the money cannot be explained" (the ⚠ mark — brief:
"qısa işarə və say ilə"); the page tests that assert `pageSize=25`, the name sort default or the "Məlumat vəziyyəti"
select. Every other expectation stays; fixtures that build a `DashboardAttention` gain `rank` / `alsoFirstIn`
mechanically — list the files. No expectation may be weakened to pass.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`--artifacts-path` into the scratchpad if the running API
  locks `bin`; say so, and do not stop the API).
- `dotnet test BaxOrders.slnx` — all green; unit and integration counts **up** from Task 8's 817 / 626 by the new tests
  only (paste the summary lines — Task 8's review noted they were missing from its log).
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build`
  (`tsc -b` is the type check) — green, with counts (Task 8: 37 files / 600 tests).
- `git diff --stat`, `git status`: changes only under `src/`, `tests/` and `frontend/bax-orders-web/src/`.
- The brief's real figures (Heydər Əliyev / Novxanı / Bayıl yolu / Milli Konservatoriya titles, "Qiymət yoxdur · 10
  obyekt", 71.030,25 − 44.340,78, the first screen at 1366×768, Back to the card) cannot be read without the real
  database, which this task does not touch. They are proven by the fixture tests above. Say in the report that the
  operator should confirm them on the running dashboard after the API is restarted on this commit — at 1366×768, on
  "Keçən ay", "Son 3 ay" and "Bütün dövr".

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Birinci ekranda ən azı birinci diqqət obyekti görünür. | §4.8; criterion 1 |
| Kart başlıqları düzgün; təkrarlanmır; "ən böyük" yalnız həqiqətən ən böyüyə. | §4.1, §4.2; criterion 2; §10 attention tests |
| Qiymət xəbərdarlığı kartda qısa işarə və say ilə. | §4.2 (⚠ mark); criterion 9 |
| Narıncı rəng çox işlənir. | §4.2, §4.5, §4.6 (amber = missing price only); criterion 9 |
| Rənglər: artım qırmızı, azalma yaşıl; "xərc artıb / azalıb" (9.1) — panel üçün. | §4.4; criterion 3 |
| Hər çip klik olunur və cədvəli süzür; sıfır çip görünmür; "Qiymət yoxdur · N obyekt". | §4.5; criterion 4 |
| Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid. | §4.5 (headline price line); criterion 4 |
| 27 sətir bir səhifədə; varsayılan sıra dəyişmənin böyüklüyünə görə. | §4.6; criterion 5 |
| Düymələr və xəbərdarlıqlar bir sətirə sığır; "Növbəti" səhifəni yuxarı atmır. | §4.6; criterion 9 |
| Geri qayıdanda qaldığım yer. | §4.7; criterion 6 |
| İstisna olanda fərq müqayisə olunan məbləğin yanında. | §4.3; criterion 7 |
| "Bütün dövr" bazasında kartlar məntiqli. | §4.1, §4.9; criterion 8; §10 over every basis |
| Eyni kohort; istisnalar adları ilə; başlıq = cədvəl cəmi; baza linkdə, "…görə"; 24 / 27. | §8 |
| 5.1 — çip və kart sözləri Task 5-in cədvəlinə görə. | §4.2, §4.5 (existing words reused; new words swept) |
| Seçilmiş baza linklərdə; "Geri" bazanı qaytarır; "Xüsusi seçim" boşaltmır. | §4.7, §8 |
| Çiplərin cəmi obyekt sayına bərabərdir. | §4.5, §8; §10 group test |
| "Əsas səbəb" sətri oxunaqlı qalır. | §4.2, §8 |
| Out of scope: mal adı və payı (7), sözlər (5), 14.1, mobil (12). | §3 |
| Acceptance 1–7 | criteria 1–7 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. The task stays in one part: it is about Task 8's size (backend additions are in-memory; the rest is one page and
   its components).
2. A card's title states its rank in its reason's full ordering: "Ən böyük …" for rank 1, "İkinci ən böyük …" for
   rank 2. The rank is counted before any object is set aside for having an earlier card, so the words stay true.
3. The largest figure of a movement reason is never hidden: when its object already has a card for another reason, that
   card says "Həm də ən böyük …" rather than the next object taking the superlative.
4. "The largest percentage" is the largest among the objects the percentage reason already considers (a baseline of at
   least 100 ₼, an existing rule); the title's hint says so, so the claim can be checked.
5. The two warning reasons ("Qiymət yoxdur", "Müqayisə bazası yoxdur") give one card each, because their titles cannot
   rank and a second card would repeat the title; every such object is one chip click away.
6. The no-baseline card is titled with the brief's own decided words "Müqayisə bazası yoxdur" instead of "Müqayisə
   üçün əvvəlki ay yoxdur", which is false on an averaged basis.
7. The three movement reasons keep choosing the same objects; only the titles and the warning cards' count change.
8. Amber means one thing on the dashboard — a price somebody owes (Task 2's ⚠): the ⚠ mark, the "Qiymət yoxdur" card
   title, the price chip and the headline's price line. Group chips, the no-baseline card and the no-order row status
   become slate, because none of them is something owed.
9. On a card the two warning sentences become one ⚠ mark with the count, beside the amount, with the sentences in its
   title and accessible name; a card whose only gap is in the baseline shows "⚠" alone.
10. The card's caption and the headline say the direction in words — "Keçən aya görə xərc artıb" — so the "…görə"
    wording of Task 1 stays and 9.1's "xərc artıb / azalıb" is visible, not only read aloud.
11. The chips replace the "Məlumat vəziyyəti" select, sit directly above the table they filter, and one is active at a
    time; the search stays when a chip is chosen. Older links' filter params are still honoured.
12. Two filters are added to the API (`group`, `missingPrice`) so each chip filters on the very predicate it counts;
    the existing filters are left alone for old links.
13. "One page" is met by asking for the API's maximum page (100), not by removing paging.
14. "Varsayılan sıra dəyişmənin böyüklüyünə görə" is the absolute money change, largest first, with rows that have no
    change last; it is a new sort value so the old signed sort keeps its meaning for old links. The API's own default
    stays the name.
15. The page keeps showing the previous answer while the next loads; that, not a scroll hack, is what stops "Növbəti"
    and every filter from throwing the reader to the top.
16. Back is the browser's Back button (there is no in-app back link); the position is remembered per history entry,
    and the card or row the reader opened is scrolled into view once data is there, falling back to the saved offset.
    A fresh arrival starts at the top.
17. With an excluded object, the headline writes the comparison as the subtraction it is, and the month total stands
    alone; without one, the headline stays as it is, because there the total is the compared amount.
18. The first-screen budget is met by moving the controls into the title row, dropping the header description, and
    moving the exceptions block and the chips below the cards — nothing is removed from the page.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (Task 8's commit `1a53445`), `git status --short`, `git diff --stat`.
1. Kartlar — the rank rule and `AlsoFirstIn`; before/after titles for the audit's shapes (Heydər Əliyev / Novxanı,
   Bayıl yolu / Milli Konservatoriya, "Son 3 ay" Novxanı); the ⚠ mark; where amber remains.
2. Başlıq — before/after of the EXPO case; the direction sentence.
3. Rənglər (9.1) — what moved to `costDirectionToneClass`; who still uses `signedToneClass`, and which task moves it.
4. Çiplər və filtrlər — the new API filters and sort, why each chip's count equals its filter, the removed select.
5. Cədvəl və naviqasiya — one page, default sort, one-line cells, no reload jump, Back to the card (how it works).
6. Birinci ekran — the new order and the height arithmetic at 1366×768.
7. Testlər — new tests; changed tests and fixtures, each with the brief line behind it; counts; builds.
8. Toxunulmayanlar — no database reached, no figure changed, order page / monthly report intact, Tasks 1–8 intact.
9. Sonrakı tapşırıqlar üçün qeydlər — for 10, 11, 12, 14.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
