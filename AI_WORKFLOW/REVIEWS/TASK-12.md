# Review — Task 12: Mobil görünüş

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** Every acceptance criterion of `TASKS/TASK-12.md` §8 is met. The change is frontend
only and stays inside the files §5 names. Desktop is unchanged by the rule of §2, apart from the ⓘ note, which the
brief asks to change. No test expectation was weakened. `COMMIT_MESSAGE.txt` is written. Next is Task 13, in
`PLANNING`.

## What was inspected

- Branch `main`, HEAD `eaa65bb` (Task 11b). Nothing for Task 12 is committed.
- `git status`: 17 tracked files modified (+1043 / −160) and one new file,
  `components/analytics/InfoHint.test.tsx`, all under `frontend/bax-orders-web/src/`. The only other untracked paths
  are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`. Nothing under `src/BaxOrders.*`, `tests/`, `tools/` or
  `api/*` changed, and nothing was deleted.
- The full diff of every non-test file: `Header.tsx`, `InfoHint.tsx`, `MonthlyReportTable.tsx`,
  `MonthlyReportPage.tsx`, `OrderDetailPage.tsx`, `WorkflowPanel.tsx`, `ManagementDashboardPage.tsx`, `terms.ts`.
- Every removed line in the test files, the whole `OrderRevisionPage.test.tsx` and `Header.test.tsx` diffs, and the
  new `InfoHint.test.tsx` in full.
- The table's `Cell`, `Secondary`, `MonthTotal` and `Legend` in `MonthlyReportTable.tsx`, and the lines table and
  `PriceCell` in `OrderDetailPage.tsx`, so the phone views could be compared against what they reuse.
- The raw Coder log `LOGS/20260925-023728-cycle03-coder.jsonl`, for the commands, edits and results.

## How builds and tests were verified

This Reviewer profile was refused `npm run … test` again ("requires approval"). As for Tasks 3–11b, I took the
results from the raw log:

| Check | Raw log evidence |
|---|---|
| Frontend tests | command 637, result 641: `Test Files 40 passed`, `Tests 797 passed` (baseline 39 / 745) |
| Frontend build (`tsc -b && vite build`) | command 642, result 645: `built in 1.49s` |
| Backend build | command 663, result 667: MSB3027 / MSB3021 only (the running API locks `bin`). Then `--artifacts-path` into the scratchpad, command 672, result 675: `0 Warning(s)`, `0 Error(s)` |
| Backend tests | command 676, result 770: `Passed! - Failed: 0, Passed: 826` unit, `Passed! - Failed: 0, Passed: 706` integration (unchanged) |

The last application or test edit is `oldTerms.test.tsx` at log line 631. That comes before the full frontend run
(637), the build (642) and the backend runs. The only later writes are `LAST_REPORT.md` (790, 802) and `STATE.json`
(804). No command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout/clean/push/rm`.

## Acceptance criteria (TASK-12 §8)

| # | Criterion | Result |
|---|---|---|
| 1 | Header: full words, `truncate`, `text-xs sm:text-sm`; `gap-2 sm:gap-4`; menu button and right group `shrink-0` | PASS. The title is `min-w-0 truncate text-xs font-medium text-slate-700 sm:text-sm` and the words are unchanged. The header is `gap-2 … sm:gap-4`, and the menu button and the right group are `shrink-0`. `Header.test.tsx` asserts all of it, and its three `ApiStatus` tests are unchanged (only a `CurrentUserMenu` mock was added) |
| 2 | ₼ on the phone: `findOldTerms` empty for the report's phone view, the line cards, and the order page and dashboard rendered whole | PASS. `oldTerms.test.tsx` adds separate sweeps of the line-card list and the report's phone view, and keeps the whole-page sweeps. Every amount in the new views comes from `formatMoney` / `formatAmount` (no-break space) |
| 3 | The year on a phone | PASS. `MonthlyReportYearList` (`lg:hidden`) renders one card per `report.rows` entry, in order. Each card has the name linking to `/locations/{id}`, "İl cəmi" and `formatMoney(row.knownAmount)`. The strip is `aria-hidden`, 12 slots, grey, with only `isUnusual` months in `costDirectionBarClass`, the hatch for future months, `largest` = 100 % and a 2 px minimum. The grid is `grid-cols-3` and renders **the table's own `Cell`**, so the link has no basis and the marks, tint, "—" and hatch are one definition. `!hasAnyRequest` shows "Sistemdə hələ sifarişi yoxdur" with no strip or grid. The company card comes last and renders the table's `MonthTotal`, with no percentage (8.1). The legend is on the phone. The "Ay" select, `?month=`, `MonthlyReportMonthList` and `futureMonthLine` are gone, and nothing under `src/` names either. The desktop table's markup is unchanged apart from calling the new `reportPeriods` helper, which gives the same result, and its tests pass unchanged |
| 4 | Lines without sideways scrolling | PASS. The wrapper is `hidden overflow-x-auto … lg:block` and the table is unchanged. `<ul aria-label="Sətirlər" className="space-y-2 lg:hidden">` holds one `LineCard` per line of the same page. Each card has the number, product (`break-words`), specification only when present, total or "—", quantity + `UnitCell` + " × " / " · " + `PriceCell` (Task 2 tones and ⓘ kept), supplier + category, "Mənbəyə bax", and "Redaktə et" / "Sil" when `editable` — all using the table's own handlers. Loading and empty cards use the table's words through the shared `noLinesText`. There is no `min-w-[…]`, and `whitespace-nowrap` is used only on the total |
| 5 | What → why → decision, buttons fixed | PASS. The decision column is `order-3 … lg:order-2` and the analysis `order-2 … lg:order-3`, with the DOM order unchanged. The actions container is `fixed inset-x-0 bottom-0 z-20 …` with `lg:static lg:z-auto lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`, and the buttons are `flex-1 … py-2.5 lg:flex-none lg:py-1.5`. That restores today's `flex flex-wrap gap-2` / `px-3 py-1.5` on `lg`. The condition (`hasActions`), the buttons, their words and their handlers are unchanged. The spacer `h-24 lg:hidden` renders once the order has loaded. The on-screen part of the criterion is the operator's check (§11.4) |
| 6 | ⓘ on tap and click | PASS. It opens on click, touch and Enter. It closes on a second press, on Escape (focus returns to the ⓘ), on a `pointerdown` outside, on a capturing scroll, on resize and on blur. `onMouseDown` on the note prevents the blur, so pressing the note keeps it open, as §4.2 requires. When open, `placeNote` sets it `fixed` with width `min(256, innerWidth − 16)`, `left = clamp(rect.left, 8, innerWidth − W − 8)`, and flips above only when it does not fit below but fits above. The note stays in the wrapper with `role`, `id` = `aria-controls` and `hidden`, and uses `z-[60]`. The button is `p-0.5 … pointer-coarse:p-2.5`. `InfoHint.test.tsx` (20 tests) covers each of these, including the 390 → 126 px and 250 → 234 / 8 px arithmetic. `AttentionSection.test.tsx` is unchanged and green. The report lists the 15 call sites; none is inside a transform, a button or a link |
| 7 | Dashboard decisions | PASS. `max-lg:flex max-lg:flex-col` wraps the headline, `max-lg:order-2` (cards) and `max-lg:order-1` (exceptions). The DOM order is unchanged, so `useScrollMemory` and the ids are untouched. On `lg` the wrappers are plain blocks with no padding or border, so the children's margins collapse through them as before. `LocationRows.test.tsx` pins `/orders/105?basis=avg3` and `/locations/21?basis=avg3` in the phone list |
| 8 | Nothing else changed | PASS. Only the §5 files changed. Every class added to an element that shows on desktop is `max-lg:` / `pointer-coarse:`, or is paired with an `lg:` class restoring today's value, or is `sm:`-restored or inert where things fit (`truncate`, `shrink-0`, `min-w-0`). The ⓘ note is the one deliberate desktop change. Suites and builds are green, and the backend is 826 / 706 |

## Tests changed deliberately

- `MonthlyReportPage.test.tsx`: "is a month of locations rather than a squeezed twelve-column table", "gathers the
  locations with no order for that month into one quiet line" and "says so on the narrow layout too, instead of
  listing who did not order" went with the one-month list and its "Ay" select. The spec (§9) names exactly these,
  and the brief line behind them is "Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür". Twelve phone tests and
  a hatch test replace them.
- `terms.test.ts`: two `futureMonthLine` assertions and the import were removed with the function, as §4.3 allows.
  No non-test file imported it.
- Scoped to the lines table without any change of expectation: 12 tests in `OrderRevisionPage.test.tsx` and 1 in
  `OrderDecisionPage.test.tsx`, each named in the report §8. The negative test "offers nothing when the server says
  this person may not edit" stays **unscoped**, so it now also proves that the cards offer nothing. That makes it
  stronger, not weaker.

## Observations (not blocking)

- One new string, `reportCardsLegendLabel` ("Kartlardakı işarələr"), sits in `terms.ts` as §4.7 allows. It exists
  because the phone legend needs its own accessible name next to the desktop one. The report says so.
- `pb-[max(0.75rem,env(safe-area-inset-bottom))]` only reads a non-zero inset if `index.html`'s viewport meta has
  `viewport-fit=cover`. Without it the padding is simply 0.75 rem, which is harmless. `index.html` was out of scope.
- On a phone the dashboard's three blocks are flex items, so their vertical margins add rather than collapse. This
  affects spacing only on a phone, and the operator's check §11.6 will show it.
- jsdom applies no CSS. What the eye must confirm — one-line title, no sideways scroll, the fixed bar over the Task 4
  test order, notes fully on screen, desktop at 1366 / 1440 — is the operator's §11 check. It remains open and needs
  no API restart.
- For the Coordinator: other wide tables at 390 px, and the remaining hover-only `title` explanations, are listed in
  the report §10 (§12 of the spec; relevant to Task 15).
