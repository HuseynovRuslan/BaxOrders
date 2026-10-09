# Roadmap

Ordered queue. A fresh session works the first `TODO` whose dependency is met. Priorities are the owner's:
P0 correctness/data loss · P1 blocks real import/use · P2 deterministic business semantics · P3 end-to-end
reliability · P4 manager UX · P5 performance/refactor · P6 polish.

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| R-01 | P1 | Import only the authoritative `Aylıq` sheet; skip summary/footer rows | **DONE** `70b74a6` | `Əsas` staged 3619 rows, doubled every line and blocked the batch on 3619 missing-Növ errors | — | low | staged 3617, `Əsas` 0, footer 0, duplicates 6938 → 48 |
| R-02 | P1 | Prove the 198 descriptor rows resolve through the existing review action, on the real workbook | **DONE** 2026-09-27 | The audit's central claim had to be shown, not asserted | R-01 | none (isolated DB) | 8 `NotAUnit` decisions applied, 198 → 0, no unit or variant created |
| R-03 | P1 | Measure true **fresh-import** readiness separately from collisions with the historical orders | **DONE** 2026-09-27 | §11: "cannot be imported" must not be confused with "collides with existing orders" | R-02 | none (isolated DB) | both environments measured and documented |
| R-04 | P2 | Every blocking family has a name the screens can show | **DONE** `e8e5d5c` | A workbook with no «Növ» column reports `otherErrors: 0` and "N rows have a blocking problem" — the one family the business wrote a sentence for is the one the summary cannot name | — | low | `Describe` and the row-issue counts cover `UnknownOrderLineType` and `UnknownResponsiblePerson`; tests pin the wording |
| R-05 | P2 | Confirmation preview states what each group would be classified as | **DONE** `f907ac8` | The operator confirms 166 groups without seeing how many lines arrive Unclassified per group | R-04 | low | preview carries Monthly/OutsideMonthly/Unclassified per group; tests |
| R-06 | P3 | One end-to-end test that drives the real workbook shape through upload → review → readiness | **DONE** `b9cb4a1` | R-02 and R-03 were done by hand; the next regression should be caught by the suite | R-02 | low | a synthetic workbook of the same shape reaches ReadyToImport through review actions only |
| R-07 | P4 | Review screen shows the eight descriptor values as one batch of work | **NOT NEEDED** | The «Vahid» tab already lists all eight with their row counts on one page; nothing to build | R-02 | — | verified against the real batch |
| R-10 | P3 | Browser smoke of the screens this run changed, against a disposable database | **DONE** — found the upload defect `4942295` | The confirmation dialog gained a fact, a note and a column, and the blocker chips gained a name; components are tested but the real layout is not | R-05 | low | import review, confirmation dialog and an order page render at 1440 and 390 with no console error and no horizontal scroll |
| R-08 | P1 | September 480 «Növ» | **DONE** 2026-09-27 | The 480 September rows arrived with no classification, and no importer rule may infer one (D-11) | owner release | the workbook is the owner's record | applied to `working/`, 20 checks passed, rehearsal shows Unclassified **0** |
| R-22 | P1 | Apply the owner's decisions of 2026-09-27 | **DONE** — workbook `7e84f86d…`, migration `8a294e7` | Three of the four remaining workbook conflicts were answered | R-16 | the workbook and one historical line | «Yay ayaqqabısı» back as row 3621 with «Növ» left empty, `mt`→`mm` on row 1248, item 500 priced; 36 workbook checks and a full rehearsal |
| R-23 | P1 | The workbook import flow is finished | **DONE** 2026-09-28 · test `3b44f17` | B-05 was the last blocking family; with it answered the workbook imports whole | R-22 | none (isolated DB) | **3618 of 3618 rows, no blocker, Monthly 3293 · Aylıqdan kənar 325 · Unclassified 0**, 166 requests · 431 051,16404 ₼ |
| R-09 | — | item 2988 · item 500 · item 1303 · the 17 Laqonda rows | **ALL DONE** 2026-09-27/28 — B-02 … B-05 answered and applied | Genuinely contradictory or missing source truth; the hard boundary protects them | — | — | owner answers |

## Not in the queue

`SONRAKI_IMKANLAR.md` (TASK-25 … TASK-29) stays deferred, as the earlier workflow recorded. The manual browser
packs under `docs/audits/` block nothing.

## Executive redesign (owner brief, 2026-09-28) — see `UX_BRIEF.md`

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| U-01 | P1 | An analytics scope the whole product shares | **DONE** `984e9c7` | «Aylıq / Aylıqdan kənar / Hamısı» has to mean one thing on every screen, and the population helper is the only honest place for it | — | low | `AnalyticsScope` with `InScope`; `OnlyMonthly` kept as the name of the default; unclassified only ever in «Hamısı» |
| U-02 | P1 | The dashboard reads the chosen scope | **DONE** `1369d67` | | U-01 | low | `DashboardQuery.Scope`, validated at the controller; the KPI, the comparison and the drivers follow it; the month’s own split does not |
| U-03 | P1 | Scope selector on the dashboard | **DONE** `a83acac` | | U-02 | low | segmented control, default Aylıq, in the URL and absent from it when default |
| U-04 | P1 | Three KPIs, one number each | **DONE** `4f1d5c8` | today's headline carries the amount, the cohort, the split and the chips at once | U-03 | low | amount · change · «24 / 27»; the percentage is a note under the change |
| U-05 | P2 | Monthly against outside, seen not read | **DONE** `a5bbafc` | | U-03 | low | two bars with share and amount; nothing at all on a month with no off-plan spending; whole-month, so it does not move with the scope |
| U-06 | P2 | A small trend of the last six periods | **DONE** `f876ec2` | | U-02 | medium | six bars, the selected month dark, no axis or legend; months the company actually ordered in; a null month draws nothing |
| U-07 | P1 | «Nə dəyişdi?» — the three biggest, compactly | **DONE** `8f6acbb` | six dense cards is the loudest part of the screen | U-02 | medium | direction · object · reason · bar · difference, ranked by money; says how many objects are outside the comparison |
| U-08 | P1 | The detail drawer keeps the decomposition | **DONE** `b3ee373` | complexity moves one level deeper, nothing is deleted | U-07 | medium | both months, the difference, every cause with its share and bar, the main product, the product counts; opens the order page for the product list |
| U-09 | P1 | Sadə / Ətraflı | **DONE** `4f1d5c8` | | U-04…U-08 | low | `view=etrafli` in the URL; «Ətraflı baxış» still has everything the old screen had |
| U-10 | P1 | The monthly report reads the same scope | **DONE** `a56f7a4` | | U-01 | medium | one place decides — the month’s amount — so grid, deltas, averages and «Qeyri-adi ay» cannot disagree; each cell reports the whole composition whatever the scope |
| U-11 | P2 | The report's hierarchy: one headline, not three | **DONE** `a56f7a4` | three equal giants above a dense matrix | U-10 | low | one headline named by the scope; composition and total in a line beneath; the counts are no longer sized like money |
| U-12 | P2 | Responsive QA of the redesign | **DONE** 2026-09-28 | | U-04…U-11 | none | dashboard clean at 1440 · 1366 · 1200 · 390 in every scope; the report overflows 89px at 1200 — that is `B-07`, measured exactly as its note predicts |
| U-13 | P2 | Browser QA on real data, all three scopes | **DONE** 2026-09-28 | | U-12 | none | real data, three scopes, four widths, dashboard and report, plus the drawer on a phone; no page errors; July 91/9 and May 59/41 monthly-to-off-plan |
| U-14 | P1 | The frontend build was red and nothing said so | **DONE** `8859d5c` | `tsc --noEmit` at the web root checks nothing — the root tsconfig is `"files": []`. The real gate is `tsc -b`, and under it `npm run build` had been failing with 21 errors, two of them in shipping code | — | low | both `ApiError.detail` sites (which put `undefined` where the server's reason belonged) and nineteen drifted fixtures; `npm run build` green |

## MVP completion — `OrderLineType` as a product feature (owner brief, 2026-09-28)

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| M-01 | P1 | Audit every read model for the monthly-only rule | **DONE** 2026-09-28 | The rule existed in one helper; nothing said which surfaces applied it | — | none | dashboard, order analytics and the decision context apply it; the monthly report did not — M-02 |
| M-02 | P1 | The monthly report compares monthly lines only | **DONE** `037cf11` | 325 outside-monthly lines made a broken pump read as a rise in demand | M-01 | low | grid, deltas, averages and «Qeyri-adi ay» are monthly; the other two kinds ride beside them; 7 tests |
| M-03 | P2 | Location / object page tells the two apart | **DONE** `ef27f3c` | Obyektlər worked its «Dəyişmə» out of every line type while promising it matched the analytics screens | M-01 | low | money and difference are monthly; «Aylıqdan kənar: …» named under them; 3 tests |
| M-04 | P2 | Order detail exposes every line's kind | **DONE** — verified, nothing to build | `OrderLineTypeBadge` already rides every line in both the table and the card layout, quiet by design; the line-level responsible person reads «Bir neçə cavabdeh · Hər sətrin cavabdehi sətrin yanında göstərilir», seen in a browser on a real imported order | M-01 | none | verified 2026-09-28 |
| M-05 | P2 | Product history does not read one-off purchases as recurring demand | **DONE for correctness** | The product-level drivers and the whole decomposition already read monthly lines alone (`OrderAnalyticsQueries` ×3, `OrderDecisionContextQueries`), so a one-off never enters product demand. There is **no standalone product-history screen** — Məhsullar is a catalog page — so nothing there can be wrong; building one is a new feature, listed as M-08 | M-01 | none | verified 2026-09-28 |
| M-08 | P4 | A product's own order history as a screen | **DONE** `0f7fbff` | The owner's product goal names «məhsul tarixçəsi»; a product's past was only reachable through one order's drivers | M-05 | medium | reached from the product name on any order line; «neçə ay» and the average read planned material alone; the one-off has its own figure, column and rows; 10 tests; driven on real data |
| M-09 | P1 | MVP readiness | **DONE** 2026-09-28 | | M-01…M-08 | none | `MVP_READY.md` |
| M-06 | P3 | Import / review ergonomics — bulk submit | **DONE** `0ce681e` | 166 drafts and no list of drafts anywhere to work from | B-06 answered | medium | «Hamısını təsdiqə göndər (166)» on the panel the coordinator is already on; each order keeps its own event; approve deliberately not offered; 7 tests |
| M-07 | P3 | Browser and responsive QA across the changed screens | **DONE** `2013307` | | M-02…M-06 | none | ten routes at four widths on the real imported data; three pages were scrolling the page sideways on a phone and are fixed; the whole coordinator run driven end to end |

## The Figma Make simple view (owner brief, 2026-09-29) — reference in `design-reference/figma-simple-dashboard/`

Two approved visual languages for the same month, deliberately not merged: «Sadə baxış» is the Figma Make
handoff, «Ətraflı baxış» stays the Stitch one. The toggle swaps the whole composition; the month, the scope
and the comparison are the page's own state and are shared.

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| F-01 | P1 | Copy and verify the Figma Make export | **DONE** 2026-09-29 | | — | none | 26 files byte-for-byte identical (`diff -rq` clean); Downloads untouched |
| F-02 | P1 | Design tokens for the second language | **DONE** `9b80223` | both handoffs define `surface`, `background` and `border` | F-01 | low | prefixed `simple-*`, plus `cost-up`/`cost-down` named by meaning; DM Mono for figures |
| F-03 | P1 | KPI tiles, filter bar, title row | **DONE** `9b80223` | | F-02 | low | the Figma composition owns its own header and ribbon; the state is the page's |
| F-04 | P1 | The comparison chart | **DONE** `9b80223` | | F-03 | medium | recharts grouped bars on real objects, ranked by spend; screen-reader table |
| F-05 | P1 | The category ring | **DONE** `9b80223` | | F-03 | low | the same read-model the detailed view reads; real roots |
| F-06 | P1 | Cards that open in place | **DONE** `9b80223` | the handoff's whole idea: detail without the page changing | F-03 | medium | «Detallara bax →» expands the decomposition inline; 11 tests |
| F-07 | P1 | The shared toggle and state | **DONE** `9b80223` | | F-03…F-06 | low | period, scope and comparison survive the switch; neither view can show the other's month |
| F-08 | P2 | Responsive QA | **DONE** `dbf7020` | | F-07 | none | 1440 · 1366 · 1200 · 390 × 2 views × 3 scopes — **no page-level horizontal scroll**; one real defect found and fixed |
| F-09 | P2 | Functional and regression QA | **DONE** 2026-09-29 | | F-08 | none | every scope changes both views; 44 153,18 + 4 277,60 = 48 430,78; the Stitch view unharmed |

### Where the Figma handoff lost to a standing rule

| what the handoff shows | what ships | why |
|---|---|---|
| a rising number in **green** | **red** | in this product a rising number is money leaving. Cost up is red and cost down is green on every surface; the tokens are named `cost-up`/`cost-down` so the mock cannot re-invert them |
| «Kod: #OB-004» on every card | nothing | Task 05b — no technical identifiers on a manager's screen |
| «v2.0 Enterprise», ⌘K search, 🔔 with 14 | absent | shell chrome with nothing behind it. The shell is shared and stays the Stitch one |
| «Sinxronizasiya: Bu gün, 09:42» | «Yeniləndi: hh:mm» | nothing synchronises; it says when the answer on screen was read |
| «Hesabatı İxrac Et» | absent | no export exists — `S-11`, the owner's call |
| named by movement | named by **spend** | the handoff's own phrase is «əsas xərc daşıyıcıları»; ranked by movement, three small objects stand beside a remainder twenty times their height |

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| F-10 | P4 | The month's shape and its six-month trend | **ANSWERED BY V-03** — the trend is back, as approved design; the split bar is still on no screen | `U-05` and `U-06` built a monthly-vs-off-plan split bar and a six-month trend for the previous simple view. The Figma composition has neither, so they are now on no screen. The backend still answers `summary.trend`, so putting either back is a component, not a read-model | F-07 | — | the owner says whether they are wanted, and where |

## The approved BaxOrders UI (owner brief, 2026-09-29) — Figma `BaxOrders-UI-v2`, frame `baxorders-dashboard`

The owner approved a new design for the app shell and for «Sadə baxış», read from Figma directly rather than
from a screenshot (file `cAUolnwBuZdFUOMW1RpbsW`, node `6:4`, 1440 × 1140). «Ətraflı baxış» is being designed
separately and was explicitly out of scope: its implementation is preserved.

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| V-01 | P1 | The app shell is the approved one | **DONE** `19efaa1` | The design's 260-pixel slate column and white utility bar are the frame both views sit in; the old chrome was the Stitch one | — | low | sidebar, header, account card and navigation match the frame; the queue count moved to the header's bell as a real link |
| V-02 | P1 | «Sadə baxış» is the approved composition | **DONE** `942a11c` | The Figma Make composition is superseded: title row and controls, four figures, «Xərc dinamikası», «Kateqoriya üzrə bölgü», «Məbləğ dəyişiklikləri» | V-01 | medium | every figure is the API's own; 33 new tests; verified in the browser at 1440, 1366, 1200 and 390 |
| V-03 | P2 | «Xərc dinamikası» — six months, one bar each | **DONE** `942a11c` | The approved design's largest section, and the answer to F-10: the trend returns because a design asks for it | V-02 | low | six bars from `summary.trend`, the selected one in colour, the exact figures in a table beside the picture |
| V-04 | P2 | The category breakdown is a ranked bar list | **DONE** `942a11c` | Five rows, each a name, an amount and a share bar; no percentage column, because the bar is the proportion | V-02 | low | the backend's six rows fold to five and still add up to the month |
| V-05 | P2 | «Məbləğ dəyişiklikləri» replaces the outlier cards on the simple view | **DONE** `942a11c` | Five objects, ranked by the money moved either way, each with its own largest cause and a way into the decomposition | V-02 | low | nothing on a row is a claim the data does not carry — no budget status, no plan limit, no score |
| V-06 | P2 | The page hands its views the state instead of drawing them | **DONE** `942a11c` | `DashboardPage → DashboardControls / SimpleDashboardView / DetailedDashboardView`, one month, one scope, one comparison | V-02 | low | «Ətraflı baxış» moved out with its markup carried across unchanged; the analytics live in neither view |
| V-07 | P3 | The superseded simple view is removed, not left beside the new one | **DONE** `942a11c` | Two simple views would be a third design nobody approved | V-02 | none | the Figma Make components and the `simple-*` palette are gone; the handoff under `design-reference/` is untouched |
| V-09 | P2 | Every month in «Xərc dinamikası» answers the pointer | **DONE** `39e815c` | The owner asked for it: the design pins the figure to the current month, which leaves the other five heights a picture nobody can put a number to | V-03 | low | any column lights blue and writes that month's exact amount; nothing is pinned; the first and last labels stay inside the card |
| V-08 | P1 | «Ətraflı baxış» is preserved until its own design arrives | **WAITING ON THE OWNER** | The owner is designing it separately and said so in the brief | V-06 | — | the approved Figma reference for «Ətraflı baxış» is supplied |

## The Stitch dashboard (owner brief, 2026-09-29) — reference in `design-reference/stitch-dashboard/`

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| S-01 | P1 | Reference audit and data mapping | **DONE** 2026-09-29 | | — | none | every section mapped to a real read-model or named as missing; the palette conflict in `DESIGN.md` settled |
| S-02 | P1 | Design tokens and the shell | **DONE** `0de9646` | the product had no token layer at all — `index.css` was four lines | S-01 | low | a Tailwind v4 `@theme` under the handoff's own names; Geist + Inter; the navy column and the utility bar |
| S-03 | P1 | Filter ribbon and scope control | **DONE** `1706bb3` | | S-02 | low | one bar: month, the three scopes, the comparison, and when the answer was read |
| S-04 | P1 | The four KPI cards | **DONE** `1706bb3` | | S-03 | low | three follow the scope; the off-plan card describes the month and deliberately does not |
| S-05 | P1 | The comparison block | **DONE** `1706bb3` | | S-04 | medium | real objects ranked by money, the rest folded into one bar that keeps the total honest |
| S-06 | P1 | Category breakdown | **DONE** `fd3c2a8` + `1706bb3` | the design has one and the product had no read-model | S-01 | medium | the catalogue's own roots, four named and the rest folded; unfiled products their own row; 7 tests |
| S-07 | P1 | Outlier cards | **DONE** `7baefbc` + `1706bb3` | | S-05 | medium | real drivers and the real effective responsible person; 12 tests |
| S-08 | P1 | Simple / Detailed integration | **DONE** `1706bb3` | | S-04…S-07 | low | the toggle switches the whole composition; «Sadə baxış» keeps every section it had |
| S-09 | P2 | Responsive QA | **DONE** 2026-09-29 | | S-08 | none | 1440 · 1366 · 1200 · 390 × 2 views × 3 scopes — **no page-level horizontal scroll anywhere**, no console or page errors |
| S-10 | P2 | Functional and regression QA | **DONE** 2026-09-29 | | S-09 | none | every scope changes the KPI, the bars, the breakdown and the cards; 44 153,18 + 4 277,60 = 48 430,78 reconciles |

### Where the handoff lost to a standing rule

| what the handoff shows | what ships | why |
|---|---|---|
| «Kod: #OB-004» in each card's corner | nothing | Task 05b: technical identifiers are not shown on a manager's screen. The handoff's code was not even this system's format |
| «v2.0 Enterprise» | the build's real version | a version string that is not this build's is the one thing a version string exists not to be |
| ⌘K search, notification bell | absent | nothing behind either; a control that looks live and does nothing is worse than none |
| «Sinxronizasiya: Bu gün, 09:42» | «Yeniləndi: hh:mm» | this product synchronises with nothing; it says when the answer on screen was read |
| «Hesabatı İxrac Et» | absent | no export exists. Left out rather than drawn inert — recorded below as `S-11` |
| the prose palette in `DESIGN.md` | the YAML palette | the two disagree; not one prose value appears in `code.html`, and the screenshot is visibly the YAML scheme |

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| S-11 | P4 | Report export | **NOT BUILT — the owner's call** | The handoff's header carries «Hesabatı İxrac Et». No export exists anywhere in the product, and inventing one is a feature, not a skin. The button is absent rather than inert | — | — | the owner says what an export should contain, and for which screen |

## Added by carrying the accepted decisions through the real endpoints

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| R-13 | P1 | A variant is built from the cell the operator corrected | **DONE** `4b5386b` | The three places that decide what a variant *is* read the workbook text, so a corrected row could not have its variant created at all — and where the normalized key survived, the corrupted value went into the catalog | R-08 | low | plan, single creation and bulk creation all read `Effective(...)`; three tests, each watched to fail first |
| R-14 | P3 | The fixture workbook has the «Model/Kod» column the real one has | **DONE** `a7e0a66` | Sixteen columns against the company's seventeen: the column carrying the brand, the article number and the grit was staged by no test | — | low | the column is in the header and on every row; four behaviours pinned |
| R-16 | P1 | Carry the workbook all the way to created orders | **DONE** 2026-09-27 | Readiness was proven; what the import actually *writes* never was. It is the last unproven step of the project | R-15 | none (isolated DB) | 166 requests · 3599 lines · 430 941,40404 ₼ · every line and manat accounted for · the history untouched |
| R-18 | P2 | The confirmation screen takes the decision that is the same for every group | **DONE** `4eac232` | All 167 historical requests are approved, so the workbook's 166 groups each need the same answer — asked 166 times across paged tables, with one missed row leaving the import refusing to start | R-16 | low | one button decides every waiting group; never a skip; three tests; driven in a browser on the real 166 |
| R-21 | P4 | `Aylıq hesabat` driven with the imported data | **DONE** 2026-09-27 | The one screen a manager opens monthly, never seen with two versions present | R-16 | none (isolated DB) | the year total 431 311,40 ₼ reconciles to the database; one layout fault found and recorded as B-07 |
| R-20 | P2 | An order says what it was written over | **DONE** `cf2d662` | An import writes a new version beside the approved one; the page warned only the other way round, so the reader of the new order — the one approving it — had no answer to "what does this replace?" | R-16 | low | the decision context carries the order below this one; one line with a link, in business words; three tests |
| R-19 | P4 | The confirmation table is legible | **DONE** `b95b9a6` | Ten columns at the form width: every cell wrapped, a group took four lines, and two headers touched | R-18 | none | `width="wide"` and the padding the data cells already had |
| R-17 | P1 | A category level is created under the corrected name | **DONE** `2ba9728` | The same defect as R-13, one decision along | R-13 | low | plan and creation read `Effective(...)`; a test pins it |
| R-15 | P1 | Carry AD-01 … AD-05 through the real endpoints on the real workbook | **DONE** 2026-09-27 | The decisions were written down but never shown to work together, and their order turned out to matter | R-13 | none (isolated DB) | 3599 of 3617 rows ready, 0 invalid, 18 blocked, nothing invented |

## Added by the browser smoke

| # | P | Task | Status | Why | Depends on | Risk | Done when |
|---|---|---|---|---|---|---|---|
| R-11 | P4 | The readiness panel's numeric row-error section counts the missing-column errors | **DONE** `cdd00a1` | A batch blocked only by a missing «Növ» or «Cavabdeh şəxs» column shows zeros in «Sətir xətaları» while the blocker chip beside it says thousands. The chip now names it, so this is tidiness, not information | R-04 | low | `RowBlockers` carries the count and the panel shows it; a test pins the sum |
| R-12 | P6 | Give the application an icon | **DIAGNOSED, left to the owner** | `index.html` declares no icon and there is no `public/` folder, so every page asks for `/favicon.ico` and is answered 404. Harmless. An icon is a visual choice, not a defect to be guessed at | — | none | the owner supplies an icon and it is linked from `index.html` |
