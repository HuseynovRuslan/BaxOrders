# TASK 18 — SƏBƏBDƏN DRAYVERƏ KEÇİD (P0)

Priority: **P0**
Brief: `AI_WORKFLOW/BRIEFS/TASK-18.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Decisions: 18.1, 18.2, 18.3 — `BRIEFS/OWNER_BRIEFS_MASTER.md`:802–804.
Part: **one part, not split.** Two components, one page, two new small modules, one new sentence and their tests; it
fits one Coder session.
Specification status: **READY** — Planner, 2026-09-25. §2 was verified against the accepted HEAD `97e81b8` (Task 17),
every statement carries a `file:line`, and §2.5's open question is resolved (outcome 1: the two numbers count
different things). The draft this replaces was written by the Product/UX planning agent on 2026-09-25 from the audit
of the running application; its requirements are all kept. Where the code did not support one of its assumptions, the
correction is marked **[Planner correction]** in place.

This task changes **frontend interaction only**: it makes an existing list filter reachable from the reason that
explains it, and puts the choice in the URL. It changes no figure, no amount, no percentage, no ordering, no API and
no database. There is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief's goal: "Rəhbər səbəbi görəndə onun üstünə klikləyib səbəbi yaradan məhsulları görsün."

Task 06 built "Niyə dəyişib?" and made the largest part first and marked. Task 10 built "Əsas dəyişikliklər" below
it with its chips. Both are accepted and correct. What is missing is the **link between them**: the reason names an
amount and a count, the list below can already show exactly those products, and nothing connects the two.

The audit measured it: from the dashboard card to a product's history is two clicks *if you already know* the
product name is clickable — but from the named reason to the products behind it there is no path at all. The reader
scrolls two screens and hunts for the matching chip among six.

This task owns that link. It does not re-open Task 06's ordering, Task 06's colours or Task 10's chips.

## 2. Verified current behaviour (repository at `97e81b8`, Task 17's accepted commit)

Paths are under `frontend/bax-orders-web/src/` unless they start with `src/BaxOrders.`.

### 2.1 Where the two pieces live

- `pages/OrderDetailPage.tsx` renders `CauseSummary` and then `DriverList`, in one column, only when the decision
  context has a decomposition (`:287–305`; `CauseSummary` `:289–293`, `DriverList` `:295–303`). `DriverList` is only
  rendered when there is at least one driver or steady product (`:295`). **Verified.**
- The page already owns one URL parameter family, the basis: `useSearchParams` (`:73`), `useBasis(params, setParams)`
  (`:78`), and `selectBasis`, which copies **every** existing parameter and pushes a new entry
  (`:81–92`, `setParams(search)` with no `replace`). The decision context is fetched on `[id, reloadToken, basisKey]`
  only (`:135–149`), so a parameter that is not the basis does not re-fetch anything.
- `components/decisions/CauseSummary.tsx` — "Niyə dəyişib?" (`:68`), the "Əsas səbəb" caption (`:128`), the ordering by
  `Math.abs(amount)` with the dashboard's tie order (`:49–51`, `:201–204`), the bars (`:173–178`), the legend
  (`:80`, `:195`), the unexplained warning (`:100–104`). Each reason row is `CauseRow` (`:109–181`), an `li`. **Verified.**
- `components/decisions/DriverList.tsx` — "Əsas dəyişikliklər" (`:78`): the chips **and** the filtered product list.
  The selected chip is component-local `useState` (`:63`), not lifted and not in the URL; clicking a chip sets it and
  collapses the list (`:91–94`). **Verified.**
- `components/decisions/labels.ts` — `causeLabels` (`:13–23`), `causeHints` (`:28–39`), `causeToneClass` (`:46–57`),
  `causeOrder` (`:60–69`), `causeTieOrder` (`:79–88`), `type DriverFilter` (`:114–121`), `driverFilterLabels`
  (`:126–134`), `driverFilterOrder` (`:136–144`), `driverScopeLine` (`:155–163`). **Verified.**
- `api/decisions.ts` — `CauseCategory` (`:9–22`), `DecisionCause` (`:75–79`), `DecisionDriver` with its `state`
  (`:88–113`), `DecisionProductCounts` (`:116–133`), `DecisionDecomposition` (`:161–182`). **Verified.**
- The test of the order page is `pages/OrderDecisionPage.test.tsx`; it renders `OrderDetailPage` inside a
  `MemoryRouter` (`:387–396`). **[Planner correction]** The draft offered the name as a guess; this is the file.

### 2.2 The two vocabularies

Backend `CauseCategory` (`src/BaxOrders.Application/Decisions/CauseDecomposition.cs`:11–55) and its frontend mirror
(`api/decisions.ts`:9–22), eight members, none added since Task 13c:
`NewOrders | QuantityChange | PriceChange | NoLongerOrdered | Services | UnattributedDueToMissingPrice |
InternalSupply | VariantChange`.

**[Planner correction]** The last member is **`VariantChange`** (`= 8`, `CauseDecomposition.cs`:54), not
`VariantSwitch`. Its row reads "Variant dəyişib" (`labels.ts`:22).

Frontend `DriverFilter` (`labels.ts`:114–121):
`All | PriceChange | QuantityChange | New | NoLongerOrdered | MissingPrice | Steady`.

Five categories have a chip; three do not: `Services`, `InternalSupply`, `VariantChange`.

The labels are not all shared. The reason row and the chip say the **same words** for two of the five pairs
(`labels.ts`:14, 17 against `:130–131`) and different words for the other three:

| Reason row (`causeLabels`) | Chip (`driverFilterLabels`) |
|---|---|
| Yeni məhsullar | Yeni məhsullar |
| Bu ay yazılmayan məhsullar | Bu ay yazılmayan məhsullar |
| Miqdar təsiri | Miqdar dəyişən |
| Qiymət təsiri | Qiymət dəyişən |
| Qiymət yoxdur | Qiymət yoxdur |

### 2.3 Reason rows are not interactive

In `CauseSummary` the reason row is a plain `li` (`:124–127`). The only `button` in it is the small "… nədir?" hint,
`InfoHint` (`CauseSummary.tsx`:138–140; `InfoHint.tsx`:77–88 is a `<button>`). **Verified** from the code; the draft's
DOM scan of the running application agrees.

**[Planner correction] — this changes how §4.3 is built.** Because the row already contains a button, the row itself
cannot become a `<button>`: a button inside a button is invalid HTML, and browsers split it apart. §4.3 now says how
the whole row is still made one click target.

### 2.4 The chips already do the work

The chips filter by `rowsUnder` / `matches` (`DriverList.tsx`:294–322), and each chip's count is the length of the
rows it leaves (`:66–68`), so a count and its list cannot disagree. A chip whose count is 0 is not offered, except
"Hamısı" (`:85`). A filtered row keeps its full quantity/price decomposition (`Change`, `:179–236`; `Split`, `:257–273`).
The audit's example — `Zibil paketi · 35 → 30 paket · Qiymət 32,00 ₼ → 34,00 ₼ (+6,25%) · Miqdar −160,00 ₼ · Qiymət
+60,00 ₼ · −100,00 ₼` — is the running application's data and was not re-read by the Planner (no browser, no
database). The unit tests already hold the same shape of row: `DriverList.test.tsx`:233–265 (Zibil paketi, 50 → 55
paket, +167,00 ₼ of which 160 ₼ quantity and 7 ₼ price). The URL does not change when a chip is clicked (there is no
URL code in `DriverList.tsx`). **Verified.**

### 2.5 RESOLVED — two counts under one label

The running application, Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: the reason row reads
`Yeni məhsullar · 58 məhsuldan` and the chip reads `Yeni məhsullar 60`.

**Finding: they count different things. Outcome 1 applies. No figure is wrong, and no figure changes.**

- **The reason row's number** is `DecisionCause.variantCount` (`CauseSummary.tsx`:144), which is the backend's
  `CauseCategoryTotal.VariantCount` (`OrderDecisionContextQueries.cs`:291–292). For "Yeni məhsullar" it is `Filed`
  (`CauseDecomposition.cs`:243–250, `:478–494`): the products whose **money is filed under that part**. A product is
  filed under `NewOrders` only if all of these hold (`CauseDecomposition.cs`:531–553):
  - it owes no price (otherwise `UnattributedDueToMissingPrice`, `:531–536`);
  - it is not supplied from the company's own store (otherwise `InternalSupply`, `:537–543`);
  - it is quantity-comparable (otherwise `Services`, `:544–549`);
  - its baseline quantity is 0 and its current quantity is above 0 (`:550–553`).

  Even then, an approved variant transition re-files it under `VariantChange` (`:301–345`, `:330`).
- **The chip's number** is the count of drivers whose **state** is `New` (`DriverList.tsx`:315–316), by
  `OrderAnalyticsCalculator.StateOf` (`src/BaxOrders.Application/Analytics/OrderAnalyticsCalculator.cs`:177–203). The
  backend's `products.newCount` counts the same thing (`OrderDecisionContextQueries.cs`:244–248), and a `New` product
  is always a driver, never steady (`:260–264`). That rule looks only at the two quantities. It does not look at the
  price, at internal supply or at variant links.
- So the chip holds **every new product**. The reason row holds **the new products whose money is in the "Yeni
  məhsullar" part**. The chip holds these too, and it also holds the new products whose money is filed under «Qiymət
  yoxdur», «Daxili təminat» or «Variant dəyişib». This is deliberate and accepted. Task 10 moved the chip to the state
  rule so that it would agree with the comparison page (`DriverList.test.tsx`:467–512;
  `OrderAnalyticsCalculator.cs`:166–167). Task 10 also worded the part's count as "N məhsuldan" to say it is not a count
  of new products (`terminology/terms.ts`:25–29; `CauseSummary.test.tsx`:171–183). The audit shows that wording is not
  enough on its own.
- The same holds for "Bu ay yazılmayan məhsullar" (`NoLongerOrdered`, `DriverList.tsx`:317–318 against `Filed`). The
  other three pairs count the same set on both sides:
  - `QuantityChange` / `PriceChange`: `Contributions` counts effects that are not 0 (`CauseDecomposition.cs`:456–476),
    and so does `matches` (`DriverList.tsx`:311–314);
  - `UnattributedDueToMissingPrice` / `MissingPrice`: every product that owes a price is filed there
    (`CauseDecomposition.cs`:531–536), and the chip takes `!priceIsComplete` (`DriverList.tsx`:319–320).
- Two edge cases could still make the counts differ. The Planner has seen neither in the data:
  - the state rule rounds quantities before comparing, and the filing does not (`OrderAnalyticsCalculator.cs`:192–193);
  - a variant with no identity is left out of the drivers but not out of the counts
    (`OrderDecisionContextQueries.cs`:237–240).

  §4.5's sentence is built so that it stays true in these cases as well.
- Which two products make up HEM's 60 − 58 was **not** read: the Planner and the Coder have no database, and it is not
  needed. §4.5 builds the explanation from the data on the screen, so it is right for whichever products they are.

This resolves the gate `PLAN.md` carries for this task: the difference **can** be stated truthfully without changing a
figure or an accepted count, so there is no `BLOCKED_HUMAN`. Decision 18.3 offers two ways — "ya hər biri nəyi
saydığını deməlidir, ya da bir rəqəm seçilməlidir" — and the brief's own requirement 6 takes the first ("yalnız hər
birinin nəyi saydığı yazılsın"). This task follows it. See Assumption 9.

## 3. Scope

In scope, all on the order page (`/orders/:id`):

- A. reason rows with a matching chip become interactive and select that chip;
- B. reason rows without a matching chip stay inert and do not look interactive;
- C. the selected filter moves out of `DriverList`'s local state and into the URL, owned by one new module;
- D. selecting a reason brings the list into view; selecting the selected reason again clears the filter;
- E. §2.5's wording, figures untouched;
- F. tests, and the manual verification pack.

Out of scope:

- the ordering of the reason rows, the "Əsas səbəb" caption, the tie order, the bars, the legend, the unexplained
  warning — **Task 06's**, accepted;
- the chips' labels, their order and the per-row decomposition below them — **Task 10's**;
- the product-history dialog and its drawer conversion — **Task 19's**;
- the dashboard, the monthly report, the locations pages — **Tasks 20, 21, 24's**;
- the raw line table and the source dialog — **Task 23's**;
- variant transitions and their note — **Task 13's (13.1a)**;
- any change to `CauseCategory`, to the backend, or to any amount.

## 4. Required behaviour

### 4.1 One module owns the spelling (C)

Add `analytics/decisionParams.ts`, a sibling of `basisParams.ts` and written in its spirit (`basisParams.ts`:3–13): the
query string is the single source of truth, and one module owns how it is spelled. It must not import from
`basisParams.ts` and must not touch `basis`, `from` or `to`. It may import the `DriverFilter` **type** from
`components/decisions/labels`.

```ts
/** The driver filter as it travels in a URL. Short on purpose, like the basis: a person can read it aloud. */
export type CauseParam = 'new' | 'qty' | 'price' | 'dropped' | 'noprice' | 'steady'

export function causeParamToFilter(value: string | null): DriverFilter        // unknown or absent -> 'All'
export function filterToCauseParam(filter: DriverFilter): CauseParam | null   // 'All' -> null (param removed)

/** The filter a query string asks for. Never throws. */
export function parseCause(params: URLSearchParams): DriverFilter

/**
 * The same query string with `cause` set to `filter` (removed for 'All'), every other parameter kept as it was —
 * or null when that is the query string already, so a caller never pushes an entry identical to the current one.
 */
export function withCause(params: URLSearchParams, filter: DriverFilter): URLSearchParams | null
```

| `CauseParam` | `DriverFilter` |
|---|---|
| `new` | `New` |
| `qty` | `QuantityChange` |
| `price` | `PriceChange` |
| `dropped` | `NoLongerOrdered` |
| `noprice` | `MissingPrice` |
| `steady` | `Steady` |
| *(absent)* | `All` |

The parameter name is `cause`. `?cause=new` selects the "Yeni məhsullar" chip. An absent or unrecognised value means
`All` and must never throw. An unrecognised value is not rewritten in the address bar (it claims no filter, so the
screen showing "Hamısı" does not contradict it); the next chip or reason click replaces it.

Task 19 extends this module (a `product` parameter); keep it small and self-contained so that is an addition.

### 4.2 Cause → chip (A)

Add `components/decisions/causeFilter.ts`:

```ts
/**
 * The chip that shows the products behind a reason. Five reasons have one; three do not, and those rows stay inert
 * rather than opening a list that would not be theirs.
 */
export function driverFilterForCause(category: CauseCategory): DriverFilter | null
```

| `CauseCategory` | `DriverFilter` |
|---|---|
| `NewOrders` | `New` |
| `QuantityChange` | `QuantityChange` |
| `PriceChange` | `PriceChange` |
| `NoLongerOrdered` | `NoLongerOrdered` |
| `UnattributedDueToMissingPrice` | `MissingPrice` |
| `Services` | `null` |
| `InternalSupply` | `null` |
| `VariantChange` | `null` |

Write it as an exhaustive `Record<CauseCategory, DriverFilter | null>` (or a `switch` with no `default`), so a new
`CauseCategory` member fails to compile rather than falling through. **[Planner correction]** `VariantChange`, not
`VariantSwitch` (§2.2). §2.5 found no category beyond these eight.

**Move** `rowsUnder` and `matches` from `DriverList.tsx`:290–322 into this module, **verbatim** (body and comments), and
export `rowsUnder`. `DriverList` imports it back. The chip counts and the reason rows (§4.3, §4.5) then use one rule,
so a chip's count and anything said about it cannot drift apart. This is a move, not a change: every chip count stays
exactly what it is.

### 4.3 The interaction (A, B, D)

**Who owns the state.** The page owns the URL, as it already does for the basis (`OrderDetailPage.tsx`:73–92):

- `OrderDetailPage` reads `const cause = parseCause(params)`;
- it writes through one function: `selectCause(next)` → `withCause(params, next)`, then `setParams(search)` (a push,
  never `replace`) when the result is not null;
- it passes the value and a setter down to both components, the way it passes `selection` / `onSelect` to
  `DecisionHeadline` (`:225–230`).

`CauseSummary` and `DriverList` stay free of the router. They are controlled components.
**[Planner correction]** The draft had `DriverList` read the URL itself. Lifting the value to the page follows the
page's own idiom. It also leaves the existing component tests rendering without a router.

**When a row is interactive.** A reason row is interactive if and only if both hold:

- `driverFilterForCause(category)` is not null;
- its chip is offered, i.e. `rowsUnder(filter, drivers, steady).length > 0`, using `decomposition.drivers` and
  `decomposition.steady`.

Otherwise the row is inert. On real data a shown mappable row always has rows under its chip (§2.5). The second
condition keeps a row from promising a list that is not there.

**In `CauseSummary`** (new props: `selected: DriverFilter`, `onSelect: (filter: DriverFilter) => void`):

- An interactive row is one click target over its whole area. The row cannot be a `<button>` (§2.3), so:
  - the `li` becomes `relative`;
  - the label pill `span` (`CauseSummary.tsx`:131–137) is wrapped in a `<button type="button">`. The button draws a
    `before:` pseudo-element, `absolute inset-0`, that covers the whole `li`;
  - the `InfoHint` is wrapped in a `relative z-10` span, so it stays above that layer and opens its note exactly as
    today.
- The pill `span` keeps its classes and still holds the label text directly. `span.rounded-full`'s text stays the
  label, and `getByText(label)` still returns the pill, so `CauseSummary.test.tsx`:106–109 and `:250` keep working.
- The button's accessible name is built from the visible label and the amount:
  `aria-label={`${causeLabels[category]}, ${formatMoneyDelta(amount)}`}`, for example `Yeni məhsullar, +29.691,52 ₼`.
  Use `formatMoneyDelta`, so the ₼ carries the formatter's no-break space. The old-terms sweep reads `aria-label`s
  (`test/oldTerms.ts`:72–76, "ordinary space before ₼").
- `aria-pressed="true"` on the selected row's button (`selected === driverFilterForCause(category)`),
  `aria-pressed="false"` on every other interactive row's button. The "Əsas səbəb" caption is a separate idea and is
  not used to show selection.
- Click: `onSelect(selected === mapped ? 'All' : mapped)`. Selecting the selected row again clears the filter.
- The row keeps its content unchanged: same order, same pill, same pill colour (including the amber "Qiymət yoxdur"),
  same "Əsas səbəb" caption and sizes, same bar, same amount, same transition lines.
- **What the row looks like when interactive.** It adds only these, on the `li` or the overlay:
  - `cursor-pointer`;
  - a hover background one step darker than the row's resting one: `hover:bg-slate-50` on an ordinary row, and
    `bg-slate-100` on hover for the primary row, which already rests on `bg-slate-50`;
  - the codebase's keyboard focus outline, drawn on the overlay:
    `focus-visible:before:outline focus-visible:before:outline-2 focus-visible:before:-outline-offset-2
    focus-visible:before:outline-slate-900`. This is the idiom of `DriverList.tsx`:123. The button itself shows no
    ring of its own;
  - when selected, an outline around the row: `outline outline-2 outline-offset-2 outline-slate-900 rounded-md`. It
    uses `outline`, not `ring`, so the primary row's `ring-1 ring-slate-200` (`CauseSummary.tsx`:126) stays exactly
    as it is. A focused, selected row therefore shows two outlines, one inside and one outside.

  The exact class strings are the Coder's to choose. They must meet three constraints: no pill colour changes, the
  primary row's caption, size and ring do not change, and an inert row gains nothing.
- **An inert row** renders exactly as today: no button, no `cursor-pointer`, no `hover:` class, no focus outline, no
  `relative`/`before:` layer. Its ⓘ keeps working and stays in the tab order as today. The *row* is not a tab stop.
- `onSelect` is never called from an inert row.

**In `OrderDetailPage`:**

- The handler given to `CauseSummary` calls `selectCause(next)`. Only when `next !== 'All'` — a selection, not a
  clear — it also brings the "Əsas dəyişikliklər" heading into view:

  ```ts
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
  driversHeading.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  ```

  The optional calls follow `ManagementDashboardPage.tsx`:232. jsdom has neither function. A missing `matchMedia` is
  treated as "reduce", so the page never animates when it cannot ask.
- Scrolling happens **only** in that click handler. A `cause` restored on load, by reload, by Back / Forward or by a
  chip click never scrolls. Clearing the filter by a second click does not scroll either.
- The handler given to `DriverList` calls `selectCause(next)` and never scrolls.
- `driversHeading` is a `useRef<HTMLHeadingElement>(null)`, passed to `DriverList`.

**In `DriverList`** (new props: `filter: DriverFilter`, `onFilter: (filter: DriverFilter) => void`,
`headingRef?: Ref<HTMLHeadingElement>`):

- `useState<DriverFilter>('All')` (`:63`) is removed. The selected chip is `filter`, and a chip click calls
  `onFilter(option)`. The two places are one control: a chip click writes the URL the same way a reason click does.
- The `h2` "Əsas dəyişikliklər" (`:78`) takes `ref={headingRef}` and `scroll-mt-20`. The margin keeps it clear of the
  sticky 64 px header (`layout/Header.tsx`:12). This is the same class the dashboard's table heading uses
  (`ManagementDashboardPage.tsx`:304).
- The list collapses to its first six whenever the filter changes, **by any route**: chip, reason, Back, reload.
  Today that is `setExpanded(false)` inside the chip handler (`:93`). With the filter now a prop, key the expansion to
  the filter, for example `const [expandedFor, setExpandedFor] = useState<DriverFilter | null>(null)` with
  `expanded = expandedFor === filter`.
- The selected chip is always offered. The chip row filters `option === 'All' || option === filter || counts[option]
  > 0` (was `:85` without the middle term). When a link or a basis change selects a chip whose count is 0, the chip
  reads "… 0" and pressed, and the list says "Bu növ üzrə dəyişiklik yoxdur." (`:111`). The screen then matches the
  address bar. See Assumption 10.
- Nothing else about the chips changes: same labels, same order, same counts, same rendering of each row.

### 4.4 The URL contract (C)

- `cause` is written with a push (no `replace`), so Back returns to the previous filter — that is the reader's undo.
  An unchanged value pushes nothing (`withCause` returns null).
- Changing the basis does not clear `cause`: `selectBasis` already copies every parameter (`OrderDetailPage.tsx`:82), and
  so does `normalizeBasis` (`basisParams.ts`:144). Changing `cause` does not touch `basis`, `from` or `to`, and does not
  re-fetch the decision context. `cause` is not part of `basisKey` (`OrderDetailPage.tsx`:79, 149) and must not become
  part of it.
- A deep link `/orders/<id>?basis=avg3&cause=new` opens the order on the 3-month basis with the "Yeni məhsullar" chip
  selected and its reason row pressed, and does not scroll.
- Links out of the order page (`orderLink`, `locationLink`, `pricingReviewLink`) carry the basis only, as today. `cause`
  is a reading of this order and is not carried to another page.

### 4.5 Two counts, one label (E)

**No figure may change.** The reason row keeps its number and its words: `58 məhsuldan` (`CauseSummary.tsx`:144,
`fromProductsNoun`, `terms.ts`:29). The chip keeps its label and its number: `Yeni məhsullar 60` (Task 10). What is
added is one sentence under the reason row, which says what the **list** counts. The row's own words already say what
the row counts: the products this part's money comes from.

**When it is shown:** under an interactive row (§4.3) whose `variantCount` differs from the number of rows under its
chip. That number is `rowsUnder(mapped, drivers, steady).length`, the chip's own number by the chip's own rule (§4.2),
and it must be above 0. If the two numbers are equal, nothing is added. So on real data the sentence appears only
under "Yeni məhsullar" and "Bu ay yazılmayan məhsullar", and only when they differ.

**Where it goes:** `components/decisions/labels.ts`, not inline:

```ts
/**
 * Said under a reason whose list counts a different number of products than the reason does (18.3).
 *
 * The part counts the products its money is filed under ("58 məhsuldan"); the chip counts every product in the
 * chip's state — a new product owing a price, or supplied from the store, is new, and its money sits in another
 * part. Neither number is wrong and neither changes: each says what it counts.
 */
export function causeListCountNote(
  filter: DriverFilter,
  listedCount: number,
  otherParts: readonly CauseCategory[],
): string
```

**Exact text.** `L` = `driverFilterLabels[filter]`, `N` = `formatCount(listedCount)`, `productNoun` = `məhsul`
(`terms.ts`:23). The words `«…» siyahısı N məhsulu sayır` follow `driverScopeLine`'s «Hamısı» … `məhsulu sayır`
(`labels.ts`:158).

- `otherParts` empty: `«L» siyahısı N məhsulu sayır.`
- one part `P`: `«L» siyahısı N məhsulu sayır — məbləği «P» hissəsində olanları da.`
- two or more parts: `«L» siyahısı N məhsulu sayır — məbləği «P1», «P2» və «P3» hissələrində olanları da.` Commas
  join all but the last, and ` və ` comes before the last.

Each `P` is `causeLabels[category]`, the part's own name on the same screen.

**Which parts are named.** For `New` and `NoLongerOrdered` only (the two state-based chips, `DriverList.tsx`:315–318),
`otherParts` holds the distinct `category` values of the rows under the chip whose `category` is not the reason's own.
They are in `causeOrder` order (`labels.ts`:60–69). For every other filter `otherParts` is empty: those chips select
by effect, and a split product's money is in two parts at once, so naming "its" part would not be true.

**The HEM example.** Suppose the two extra new products owe a price and are supplied from the store. The screen then
reads:

> **Yeni məhsullar** ⓘ 58 məhsuldan  **+29.691,52 ₼**
> «Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» və «Qiymət yoxdur» hissələrində olanları da.

The Planner has not confirmed which parts they are (§2.5), and the sentence names whichever they turn out to be.

**How it looks:** a `<p>` in the row under the label/amount line and before the bar, in the row's quiet text
(`mt-1 text-xs text-slate-500`, like the transition lines, `CauseSummary.tsx`:156–160). It is inside the row's click
area.

The acceptance test is §9.6: the reader is never shown two different numbers under the same words with no
explanation.

## 5. Frontend requirements — summary for the Coder

Changed (expected):

- `components/decisions/CauseSummary.tsx` — interaction and the §4.5 sentence;
- `components/decisions/DriverList.tsx` — controlled filter, heading ref, expansion keyed to the filter, the selected
  chip always offered, `rowsUnder` imported;
- `components/decisions/labels.ts` — `causeListCountNote`;
- new `components/decisions/causeFilter.ts` — `driverFilterForCause`, and `rowsUnder` / `matches` moved here;
- new `analytics/decisionParams.ts`;
- `pages/OrderDetailPage.tsx` — `parseCause`, `selectCause`, the scroll, the ref, the props;
- the tests of §10;
- the pack of §11.

Not changed: `api/decisions.ts`; `analytics/basisParams.ts`; `analytics/useBasis.ts`; `terminology/terms.ts`;
`pricing/labels.ts`; `components/analytics/InfoHint.tsx`; `TrendModal`; `Modal`; every dashboard, monthly-report,
locations and imports component; every amount; the backend.

Keep the codebase's idiom: comments explain *why*; one word per idea from `src/terminology`; Task 2's price words
from `src/pricing/labels`.

## 6. Backend

None. The mapping, the filter and the URL are presentation over data the API already returns. No C# change, no API
contract change. If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access**; do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool under `tools/`.
- No data change; HD-002's 94 rows untouched.
- No figure changes: every amount, "Cəmi", count, delta and percentage stays exactly what the API returns.
- Do not rework Task 06 or Task 10. A defect found there goes into the report, not into the code.
- If §4.5's sentence cannot be made true for some case without changing a figure or an accepted count, STOP with
  `BLOCKED_HUMAN` and say which case. The Planner found none (§2.5).
- Do not touch screens owned by later tasks (§3 out of scope).
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.

## 8. Invariants — MUST NOT CHANGE

- Every figure on the order page: the reason amounts, "Cəmi", the reason counts ("N məhsuldan"), the chip counts, every
  row's quantity and price decomposition, the headline, "Baza" and "Fərq".
- Task 06: the reason ordering by `Math.abs(amount)`, the tie order (`causeTieOrder`), the "Əsas səbəb" caption and the
  primary row's size and ring, the bars and their widths, the legend `Qırmızı — xərc artıb · Yaşıl — xərc azalıb`,
  `costDirectionToneClass` / `costDirectionBarClass`, the pill colours (`chipClass`, `CauseSummary.tsx`:211–215, amber
  "Qiymət yoxdur"), the unexplained-part warning and its condition, "Baza" / "Fərq", `describeBasisCaption`.
- Decision 9.1 as a direction, never a verdict; colour is never the only carrier.
- Task 1: the basis lives in the URL; the basis picker stays on the order page; the order page's comparison equals
  the dashboard card's.
- Task 1c: the shown parts add up to "Cəmi" to the qəpik.
- Task 2's words, word for word; Task 5's (5.1) words; `fromProductsNoun` "məhsuldan".
- `DriverList`'s chip labels, chip order, chip counts and per-row content. A chip whose count is 0 is still left out
  unless it is the selected one (§4.3).
- `InfoHint`'s behaviour inside a reason row, including 17.1's capture-phase `Escape`.
- The old-terms sweep stays green.
- No backend, schema or data change.

## 9. Acceptance criteria

1. Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: the reason row "Yeni məhsullar +29.691,52 ₼" is clicked → the list
   below shows only new products, the "Yeni məhsullar" chip is selected, and the "Əsas dəyişikliklər" heading is
   brought into view. *(brief acceptance 1)*
2. The address bar then carries `cause=new`; a reload restores the same filtered view; Back returns to the unfiltered
   view without leaving the order page. *(brief acceptance 2)*
3. Clicking the same reason row again clears the filter and the list returns to "Hamısı". *(brief acceptance 3)*
4. The "Xidmətlər" row: no pointer cursor, no hover change, no focus ring, and a click does nothing. The same for
   "Daxili təminat" and a "Variant dəyişib" row. *(brief acceptance 4, decision 18.2)*
5. Selecting a reason does not change the basis and does not re-fetch the decision context. The reason amounts, their
   order, "Cəmi", every reason count and every chip count are identical before and after. *(brief acceptance 5)*
6. Nowhere on the page are two different numbers shown under the same words with no explanation of what each counts.
   Where "N məhsuldan" and its chip's count differ, §4.5's sentence stands under the row, and no figure has changed.
   *(brief acceptance 6, decision 18.3)*
7. `/orders/<id>?basis=avg3&cause=price` opens on the 3-month basis with "Qiymət dəyişən" selected and "Qiymət təsiri"
   pressed, and does not scroll on load. *(§4.4)*
8. Keyboard: an interactive reason row is reachable by `Tab`, activates with `Enter` and `Space`, and reports its
   selected state. An inert row is not itself a tab stop; its ⓘ is, as today. *(§4.3)*
9. No figure changed; `TrendModal` and every other screen unchanged; all suites and both builds green; the old-terms
   sweep passes.

## 10. Required tests

Frontend (vitest). Use the brief's figures where the brief gives them.

- **New** `analytics/decisionParams.test.ts`:
  - every `CauseParam` round-trips to its `DriverFilter` and back;
  - `'All'` produces no parameter;
  - an unknown value and an absent value both yield `'All'` and do not throw;
  - `withCause` keeps `basis`, `from`, `to` and any other parameter byte for byte, removes `cause` for `'All'`, and
    returns `null` when nothing would change.
- **New** `components/decisions/causeFilter.test.ts`:
  - each of the five mapped categories returns its chip;
  - each of the three unmapped categories (`Services`, `InternalSupply`, `VariantChange`) returns `null`;
  - the test enumerates every `CauseCategory` through a `Record<CauseCategory, …>` literal, so a new member fails to
    compile rather than being skipped;
  - `rowsUnder` returns what it returned before the move. At least the "Yeni məhsullar by state" case of
    `DriverList.test.tsx`:472–512 is re-asserted here directly.
- `components/decisions/CauseSummary.test.tsx`:
  - `renderSummary` (`:97–103`) passes `selected` (default `'All'`) and `onSelect` (default `vi.fn()`). That is a
    helper change; every existing expectation stays as it is;
  - a mappable row with rows under its chip renders a button whose accessible name contains its label and amount
    (`Yeni məhsullar, +29.691,52 ₼`). An unmappable row renders no button except its ⓘ, and its `li` has no
    `cursor-pointer` and no `hover:` class. A mappable row whose chip has no rows is inert in the same way;
  - clicking a mappable row calls `onSelect` with its filter; with that filter already `selected`, it calls `onSelect`
    with `'All'`. `aria-pressed` reflects `selected`;
  - clicking an inert row (Xidmətlər, Daxili təminat, Variant dəyişib) calls nothing;
  - the ⓘ inside an interactive row still opens its note, and opening it does not call `onSelect`;
  - the row order, the "Əsas səbəb" caption, the bars' widths, the amounts and the "N məhsuldan" counts are the same
    as before, asserted explicitly with the Heydər Əliyev figures (`heyderAliyev()`, `:142–154`), with a row selected
    and without;
  - §4.5 with a HEM-shaped fixture: `NewOrders` with `variantCount` 58, and 60 drivers of state `New`, made up of 58
    `NewOrders`, one `InternalSupply` and one `UnattributedDueToMissingPrice`. The row reads `58 məhsuldan`, and the
    sentence reads exactly `«Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» və «Qiymət yoxdur»
    hissələrində olanları da.`;
  - with equal counts, no sentence. The one-part form and the empty form are each asserted once, the empty one on a
    `QuantityChange` row whose count differs.
- `components/decisions/DriverList.test.tsx`:
  - `renderList` (`:96–104`) wraps `DriverList` in a small stateful harness holding `filter` / `onFilter`, so the
    existing chip tests (`:405–512`, `:519–630`) keep every expectation;
  - the selected chip is the `filter` prop (render with `filter="New"` and see it pressed and the list filtered);
  - clicking a chip calls `onFilter` with that chip;
  - the chip labels, order and counts are unchanged;
  - a selected chip with no rows is offered, pressed, with the empty sentence;
  - the list collapses to six when `filter` changes from outside;
  - a filtered row still renders its full quantity/price decomposition, asserted with the Zibil paketi figures
    (`:233–265`).
- `labels.ts`: `causeListCountNote` — each form, and a four-digit count formatted by `formatCount`. This can live in
  the `CauseSummary` tests or in a small `labels.test.ts`.
- `pages/OrderDecisionPage.test.tsx`, end to end, with a location probe (the idiom of
  `ManagementDashboardPage.test.tsx`:126):
  - render `/orders/105?basis=avg3` and click the primary reason's button;
  - assert the list is filtered and the chip is pressed;
  - assert the probe shows `basis=avg3` **and** `cause=…`;
  - assert `fetchDecisionContext` was called no more times than before the click;
  - assert the headline figures are unchanged;
  - assert `scrollIntoView` was called once with `{ block: 'start', behavior: 'auto' }` (no `matchMedia` in jsdom),
    on the "Əsas dəyişikliklər" heading;
  - with `matchMedia` stubbed to `matches: false`, assert `behavior: 'smooth'`;
  - a second click removes `cause` and does not scroll again;
  - a chip click writes `cause` and does not scroll;
  - Back (a `useNavigate(-1)` probe button, or `MemoryRouter` history) restores the unfiltered view on the same page;
  - a deep link `/orders/105?basis=avg3&cause=price` opens filtered and never calls `scrollIntoView`;
  - changing the basis in the headline keeps `cause`.
- `terminology/oldTerms.test.tsx`: the order-page sweep (`:968–1017`) still passes. Add one case rendered with
  `?cause=new` and a fixture where §4.5's sentence shows, so the new words and the new `aria-label`s are swept.
- Existing tests that assert `DriverList`'s local filter state change with this task. Update them and list each one in
  the report with its reason. No expectation may be weakened to pass.

Backend: none; run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors. If the running API locks `src/BaxOrders.Api/bin`, use
  `--artifacts-path <scratchpad>/artifacts` as Task 17 did, and do not stop the API.
- `dotnet test BaxOrders.slnx` — counts unchanged from TASK-17's accepted totals: **1046 unit, 785 integration**, all
  passing.
- Frontend: `npm run --prefix frontend/bax-orders-web test` and `npm run --prefix frontend/bax-orders-web build` —
  green, with counts. The baseline is **54 files / 990 tests** (Task 17). The totals rise by the new files and tests
  only.
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/` and
  `docs/audits/2026-qerar-zenciri/`.

### Manual verification pack (operator stage)

Prepare, do not execute: `docs/audits/2026-qerar-zenciri/18-sebeb-kecidi.md`. The file name is ASCII, like
`17-dialoq-yoxlamasi.md` beside it. It holds checks `B-01 … B-14` in the twelve-line row format of Task 17's pack, each
result line `---- operator doldurur ----`. The checks cover:

- each of the five mappable reasons on a real order: the list, the chip and the address bar;
- the three inert reasons: cursor, hover, focus and click;
- reload and Back with `cause=` set;
- a basis change with `cause=` set;
- a deep link with `basis` and `cause`: no scroll;
- keyboard activation with `Tab`, `Enter` and `Space`;
- the ⓘ inside an interactive row;
- the scroll landing position, with the heading and the chips below the sticky header;
- `prefers-reduced-motion`;
- §4.5's sentence on HEM Sentyabr 2026 Keçən ay, where the operator writes down which parts it names;
- a phone at 390 × 844.

Viewports `1366×768 · 1440×900 · 390×844 · 1200×800`. Screenshots `<ID>-<ekran>-<en>.png`. The order id for HEM
September is looked up by the operator (`/orders/154` in the draft is an unverified example). The pack is read-only on
real data. State plainly in the report that the Coder performed no browser check.

## 12. Where the brief lands

| Brief | Here |
|---|---|
| Səbəb sətrinə klik siyahını süzsün və oxucunu siyahıya gətirsin. | §4.2, §4.3; criterion 1 |
| Seçim URL-də qalsın; yenilənmə və "geri" bərpa etsin. | §4.1, §4.4; criteria 2, 7 |
| İkinci klik süzgəci götürsün. | §4.3; criterion 3 |
| Çiplər qalsın və eyni vəziyyəti idarə etsin. | §4.3; criteria 1, 2 |
| Çipi olmayan səbəblər klik edilməsin və klik edilən görünməsin. | §4.2 cədvəli, §4.3; criterion 4 |
| Eyni sözün altında iki rəqəm qalmasın; rəqəmlərə toxunulmasın. | §2.5, §4.5; criterion 6 |
| Rəqəmlər, sıra, rənglər dəyişmir. | §8; criteria 5, 9 |

Brief acceptance 1 → criterion 1; 2 → 2; 3 → 3; 4 → 4; 5 → 5; 6 → 6. Criteria 7 and 8 are this file's additions.

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review. 1–7 are the draft's, kept; 8–13 are the
Planner's, added on verification.

1. The URL parameter is `cause` with short values (`new`, `qty`, `price`, `dropped`, `noprice`, `steady`), mirroring
   `basisParams.ts`'s stated principle that the query string should be readable aloud. The wire vocabulary
   (`CauseCategory`, `DriverFilter`) stays off the URL.
2. The reason row's control is a `button` with `aria-pressed`, not a link and not a tab. It selects a filter on the same
   page; `aria-pressed` is the honest role.
3. Unmappable reasons are inert rather than disabled-looking. A greyed-out row would suggest something is broken;
   nothing is broken — those reasons simply have no product list of their own.
4. Selecting a reason scrolls to the list heading rather than to the first row, so the chips stay visible and the
   reader can widen the filter without scrolling back.
5. Scrolling happens only on a reason click, never on load from a deep link, so a shared link opens where the reader
   expects the page to open.
6. `cause` changes are pushed (no `replace`), so Back is the reader's undo. This adds history entries; that is
   intended.
7. *(Draft's, now closed)* §4.5 was left for the Planner to word once §2.5 was known. It is worded above.
8. The whole row is made one click target with a stretched button: a button around the pill, whose `before:` layer
   covers the row, with the ⓘ raised above it. The row cannot itself be a button, because it contains the ⓘ button.
9. Decision 18.3 is marked *açıq* in the master document. It offers two ways, and the brief's requirement 6 already
   chooses one: "yalnız hər birinin nəyi saydığı yazılsın". `PLAN.md`'s gate stops the task only if the difference
   cannot be stated truthfully without changing a figure. It can be (§2.5), so the task is READY rather than
   `BLOCKED_HUMAN`. If the owner would rather close 18.3 the other way ("bir rəqəm seçilməlidir"), only §4.5's sentence
   changes.
10. The §4.5 sentence explains the list's count under the reason row. The reason row's "N məhsuldan" is not reworded:
    it already says what it counts (Task 10), and the audit's complaint was the unexplained difference, not the words.
    The chip is Task 10's and is not touched.
11. The page owns the `cause` parameter and passes it down, as it does the basis. The components stay router-free.
12. A mappable reason whose chip would have no rows is inert. A selected chip with no rows — reached by a link or a
    basis change — is still offered, pressed and showing 0, so the screen never contradicts the address bar. An
    unrecognised `cause` value reads as "Hamısı" and is not rewritten.
13. The selected reason row is marked with an outline, not by recolouring its pill. Recolouring would break the amber
    "Qiymət yoxdur" and 9.1's rule that colour carries direction only. Clearing by a second click does not scroll.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD, `git status --short`, `git diff --stat`.
1. Səbəb → çip uyğunluğu — cədvəl, hansı səbəb hansı çipi açır, hansı səbəb inertdir və niyə; `rowsUnder`-in köçürülməsi.
2. URL — `cause` parametri, qısa adlar, `basis` ilə münasibəti, "geri" davranışı, `withCause`-un boş itələmədən qaçması.
3. İnteraksiya — sətrin bir klik sahəsi olması (ⓘ ilə birlikdə), klik, ikinci klik, `aria-pressed`, seçilmiş sətrin
   görünüşü, skroll, `scroll-mt-20` və `prefers-reduced-motion`.
4. İki say məsələsi — §2.5-in tapıntısı, §4.5-in cümləsi sözbəsöz, hansı rəqəmin dəyişmədiyi (heç biri).
5. Testlər — yeni testlər; dəyişdirilmiş testlər, hər biri səbəbi ilə; saylar; build-lər.
6. Əl ilə yoxlama dəsti — hazırlanan fayl və yoxlama ID-ləri; Coder brauzerdə yoxlamayıb.
7. Toxunulmayanlar — rəqəmlər, Task 06-nın sırası və rəngləri, Task 10-un çipləri, baza, backend, data.
8. Sonrakı tapşırıqlar üçün qeydlər — 19 (`decisionParams` genişləndirilir, `product` parametri əlavə olunur) və
   Task 06/10-da tapılan hər hansı defekt.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
