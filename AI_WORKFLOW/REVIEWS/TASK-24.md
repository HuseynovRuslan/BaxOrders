# Review — Task 24: Obyekt səhifəsi və aylıq hesabata qayıdış (Qərar zənciri, 8 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-24.md` (READY, Planner, verified at `4e6acad`); brief
`BRIEFS/TASK-24.md` (decisions 24.1 … 24.4); Coder report `LAST_REPORT.md`; Coder log
`LOGS/20260926-093543-cycle08-coder.jsonl`.

**Verdict: PASS.** Task 24 is accepted. It is the last task of the decision chain, and the queue is now empty. The state
goes to `HUMAN_REQUIRED` on the already-open **HD-009**, not to `DONE`, for the same reason `REVIEWS/TASK-15b.md` gave:
the final audit's browser part was deferred, not waived, and closing Task 15 is the owner's decision.

## What I checked independently

- **Git.** Branch `main`, HEAD `4e6acad` (Task 23's accepted commit). `git diff --stat`: 10 tracked files, +1032 / −144,
  all under `frontend/bax-orders-web/src/`. There are three new untracked files: `navigation/monthlyReportReturn.ts`,
  `navigation/monthlyReportReturn.test.ts` and `docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md`. The other
  untracked entries are workflow infrastructure, which the runner leaves out.
  - Not in the diff: `App.tsx`, `useScrollMemory.ts`, `interaction.ts`, `basisParams.ts`, `decisionParams.ts`,
    `components/dashboard/*`, `LocationsPage.tsx`, `test/oldTerms.ts`, any C#, `Migrations/` and `tools/`. This matches
    §5's list of files that must not change.
- **I read the whole production diff.**
  - **`LocationDetailPage.tsx`.** The `TrendingUp` import and the header's `Müqayisə et` `Link` are deleted, and the
    header's only action is `Obyektlərə qayıt`. The fourth `<th>` is gone, and both `colSpan`s are now 3. The rows' `<td>`
    that held `Sifarişə bax` and `Müqayisə` is deleted. Each row is now
    `<tr onClick={openSurfaceLink} className={interactiveRowClass}>`. The period `Link` keeps its exact
    `orderLink(request.orderRequestId, selection)` and its text, and it gains `surfaceLinkAttribute` and
    `rowLinkClass interactiveTextClass font-medium text-slate-900`. The superseded note is a plain `<p>`, not
    `role="note"`, so `openSurfaceLink` forwards a click on it. The comment at :90–92 no longer names the removed
    control.
  - **`api/orders.ts`.** Only the doc comment changed. The type is unchanged.
  - **`LocationTrend.tsx`.** A filled slot is `<li>` → one `Link` (`orderLink(entry.orderRequestId, selection)`,
    `aria-label = slotName`, `aria-current="true"` on the last slot only, `group … hover:bg-slate-50 rowLinkClass`).
    A gap is `<li>` → a plain `<div>`. `SlotContent` carries the old bar, `title`, label, amount and `MissingPriceMark`
    unchanged. The only visual changes are these:
    - the current bar is `bg-slate-600`;
    - the other filled bars get `group-hover:bg-slate-400`;
    - the current label is `font-semibold text-slate-900`.

    There is no red or green. No ancestor in the card carries `group`, so the nested `group-hover` cannot leak.
    `slotName` appends `missingPriceCount(n)` when `n > 0`.
  - **`MonthlyReportTable.tsx`.** The change is `id="row-{locationId}"` on `LocationRow`'s `<tr>` and
    `id="row-{locationId}-phone"` on `LocationCard`'s `<li>`. `Cell`'s `to` is now `monthlyReportOrderLink(...)` with
    `state={monthlyReportOrderState}`. `describe()`, `title`, `aria-label`, the classes and the name links are untouched.
  - **`MonthlyReportPage.tsx`.** The fragment is now `<div ref={root}>`, with
    `useScrollMemory<HTMLDivElement>(state.status === 'success')`. The search code is untouched. The Coder showed that
    the journey already works and that no sync effect was needed.
  - **`OrderDetailPage.tsx`.** `monthlyReportControl(year)` renders only when `openedFromMonthlyReport(params)`. It
    is first in the header's actions, before the badge, and it appears while the order is loading and in the error
    state's `PageHeader`. It has an `ArrowLeft` `aria-hidden` icon, and its classes are those of
    `Obyektin sifarişləri` plus `inline-flex items-center gap-1.5`.
    - The click handler ignores handled, non-main and modified clicks.
    - It goes `navigate(-1)` only when `isMonthlyReportEntry(location.state)`. Otherwise the `Link` goes to
      `monthlyReportLink(year)`.
    - The double-click guard (`leftForReport` against `location.key`) is the Coder's addition. It is sound: the page
      unmounts on arrival at the report, so the ref cannot stale-block a later entry.
  - **`monthlyReportReturn.ts`** matches §4.6's five exports exactly. It reads and writes only `back`. A grep of
    non-test sources finds `back=` and the cell helpers only in this module and `MonthlyReportTable.tsx`, so no other
    screen sets `back`.
- **The tests read right, and none is weakened.** I read every removed line in the four changed test files. Each one
  belongs to a control the owner removed, or it is a pinned `href` that §4.6 changes, or it is an import:
  - **`LocationDetailPage.test.tsx`.**
    - The header row is now three columns, exactly `['Dövr','Məbləğ','Status']`.
    - The "every link keeps the basis" test is stronger than before. It now enumerates all six `/orders/` links on the
      page (the card, three periods and two strip months) and requires `?basis=avg3` on each.
    - The old "«Müqayisə» opens the analysis" block is rewritten as absence tests. It keeps the filter, page 2, no-order
      and no-`/analytics` scenarios, and adds `expectNoComparisonControl`. That checks every role, text,
      `aria-label` and `title`, and `document.body.textContent`, while still allowing the picker's own `Müqayisə`
      group.
    - The row-surface test clicks the amount, the status and the note, and asserts the destination through a route
      stub.
    - A literal `textContent` check pins the rows' amounts, statuses and note.
  - **`LocationTrend.test.tsx`.** The only removed expectation-bearing line is the `slots()` helper, which now reads
    `slot.firstElementChild.children`. Its expectations are unchanged. There are 8 new tests: links, names, the
    gap's inertness, `aria-current` on the last slot only, a corrected month, unchanged heights and titles,
    `findOldTerms`, and Tab / Enter.
  - **`MonthlyReportPage.test.tsx`.** The six pinned `href`s now end in `?back=monthly`, as §10 lists, and the no-basis
    check stays. There are 10 new tests.
    - Ids: `row-*` and `row-*-phone`, each unique.
    - Return: `scrollIntoView({block:'center'})` is called exactly once, on `row-3`, and on `row-21-phone` from the
      phone card. A fresh arrival restores nothing.
    - Search: `Novxan` goes through Enter, a cell and Back, and returns in the box, the address and every request.
      The reload renders the same URL anew.
    - History: two submitted searches still leave the report with one Back.
    - Every test clears `sessionStorage` first. That isolates the tests and hides nothing, because each test is a
      fresh visit and MemoryRouter's first key is always `default`.
  - **`OrderDecisionPage.test.tsx`** (15 new). §10's cases are all present:
    - the Back path with no entry left behind (a second Back leaves the report);
    - the double click;
    - a pasted link, with `href` `/dashboard/monthly?year=2026`;
    - modified and middle clicks;
    - absence with no `back`, `back=anything-else`, `back=Monthly`, `from=monthly`, and the marker without `back`;
    - `back` surviving basis, cause and product, while the control's `href` names none of them;
    - the ordinary link after a pushed entry;
    - loading and error states.
  - **`monthlyReportReturn.test.ts`** (new, 18) covers each export and the false cases §10 names.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`; `npm run … test` was refused again. As for
  20 … 23, I read the raw tool results in the Coder log and checked them against the files' modification times.
  - The last application or test write is log line 842 (`OrderDetailPage.tsx`, 07:35:07.872Z). It restores the guard
    after a deliberate red check at 834 / 840. The file's mtime is 11:35:07.886 +04:00, the same moment, and it is the
    newest mtime of any code file in the diff. After it, the only writes are to the Markdown pack (864 … 875) and to
    `AI_WORKFLOW/` (893 … 921). No Bash command after 842 writes a code file: they are `npm` runs, `git`, and one
    `node -e` JSON check.
  - The current `OrderDetailPage.tsx` has no `&& false` in the guard.
  - The runs after the last edit:
    - line 849 (07:36:22Z), full frontend suite: `Test Files 62 passed (62) · Tests 1340 passed (1340)`;
    - line 853 (07:36:29Z), `npm run build` (`tsc -b && vite build`): `built in 1.54s`.
  - The backend runs came earlier, at lines 607 / 616 / 629. They show `Build succeeded`, 0 warnings, 0 errors, and
    unit `Passed: 1055, Failed: 0` and integration `Passed: 800, Failed: 0`. They predate only frontend edits, and no
    C# file is in the diff, so they stand.
  - The counts rise only by the new tests: 1286 → 1340 (+54 = 8 + 3 net + 10 + 15 + 18), and 61 → 62 files. The
    backend is unchanged at 1055 / 800.
- **Data.** Frontend only. The Coder ran no database command, and nothing under `tools/` or `Migrations/` changed.
  HD-002's 94 rows are untouched.
- **Manual pack.** `24-obyekt-ve-qayidis.md` holds H-01 … H-17 in 23's format, and it is prepared but not run. The Coder
  did no browser check and says so.

## Acceptance criteria (§9)

| # | Criterion | Result |
|---|---|---|
| 1 | One link per row (the period, same `href`, with basis); no `Sifarişə bax` / `Müqayisə` in rows; 3 columns; row body click opens it | **Pass** |
| 2 | `Müqayisə et` absent in every form, with and without order, under filter, on page 2; card's one `Sifarişə bax` = first row | **Pass** |
| 3 | Filled months link with basis; latest month distinguished + `aria-current`; gap not a link; Tab / Enter | **Pass** |
| 4 | Back brings `row-{id}` (phone: `row-{id}-phone`) into view once loaded | **Pass** (jsdom; H-11 / H-12 in browser) |
| 5 | `Novxan` search survives Back and reload, in box, request and address | **Pass**: no code change was needed, and tests prove it |
| 6 | `Aylıq hesabat` goes Back on the report's entry, otherwise links to `?year=`; absent from dashboard / object page | **Pass** |
| 7 | No figure, highlight, legend, dot, cell `title` or name changed; name link still `/locations/{id}` | **Pass** |
| 8 | Suites and builds green, old-terms sweep passes | **Pass**: log evidence above |

All six brief acceptance bullets are carried. Nothing is deferred except the staleness line, which the specification
itself defers (§2.7): no field supports it.

## Notes, not blocking

- **The error state.** The spec says the control sits "beside `Obyektlərə qayıt`". The Coder put it in the error
  page's `PageHeader` actions, above the red message, and `Obyektlərə qayıt` stays below it. That is the same place as
  on the loaded page, and a test pins both links being present. I accept it as a faithful reading.
- **`App.tsx`:76–80.** `RetiredComparisonRedirect`'s comment still says each row's «Müqayisə» opens that order's
  analysis. It is a stale comment only, and `App.tsx` was rightly left alone. It is a later clean-up.
- **The fallback loses the search** (assumption 4). After a cause, product or basis push, «Aylıq hesabat» opens the
  year's report at the top with no search, and the browser's Back still restores both. The spec chose this.
- **Deferred, recorded again.** The staleness signal needs a system-wide latest period or `monthsSinceLastOrder` in
  `LocationOrderHistory`. `LocationsPage.tsx` still has its hover-only row and two links per row (`TASK-20.md` §12).
- **Earlier leftovers stand**: `SectionHeader.tsx` unused, `orderStatusLabels` duplicate, `04-sandbox.md` Sınaq 1 step 6.
- **Go-live.** Frontend only. No API restart and no migration.
- **Environment.** The running API still locks `src/BaxOrders.Api/bin`, so the backend build goes into the scratchpad
  (`--artifacts-path`).

## Why `HUMAN_REQUIRED` and not `DONE` or `PLANNING`

- There is no next task. The decision chain `17 → 24` is complete. `SONRAKI_IMKANLAR.md` (TASK-25 … 29) is outside
  the queue by the owner's rule, and each of those tasks needs its own brief.
- `DONE` would be untrue for as long as HD-009 is open (`WORKFLOW_RULES.md` §5), which is the 15b reasoning unchanged.
- So the workflow returns to where 15b left it: **HD-009**, the owner's choice between resuming the audit's browser
  part and closing Task 15 as reported. That is not a request to review Task 24, which is accepted and committed by
  the runner.
