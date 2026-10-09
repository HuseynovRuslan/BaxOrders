# Review — Task 19: Məhsul tarixçəsi çekməcəsi (Qərar zənciri, 3 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-19.md` (READY, Planner, verified at `6456263`); brief
`BRIEFS/TASK-19.md` (decisions 19.1, 19.2, 19.3); Coder report `LAST_REPORT.md`; the Coder log
`LOGS/20260925-230038-cycle08-coder.jsonl`.

**Verdict: PASS.** Task 19 is accepted. The next task is 20. Its specification is still `DRAFT — §2 UNVERIFIED`, so
the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `6456263` (Task 18's accepted commit). `git diff --stat` shows 9 tracked files, all
  under `frontend/bax-orders-web/src/`, +851 / −40. The untracked files are `Drawer.tsx`, `Drawer.test.tsx`,
  `docs/audits/2026-qerar-zenciri/19-mehsul-cekmecesi.md`, and the workflow infrastructure (`AI_WORKFLOW/`,
  `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner excludes from the commit
  (`run-agent.ps1`, `Invoke-AcceptedCommit`). No backend, tool, schema or data file changed. `DriverList.tsx`,
  `trend.ts`, `TrendChart.tsx`, `api/analytics.ts`, `dialogStack.ts`, `InfoHint.tsx`, `basisParams.ts`, `useBasis.ts`,
  `CauseSummary.tsx`, `causeFilter.ts` and `ItemSourceDrawer.tsx` are not in the diff.
- **The production diff, read in full**: `Modal.tsx`, `Drawer.tsx`, `TrendModal.tsx`, `decisionParams.ts`,
  `OrderDetailPage.tsx`.
- **`'center'` is byte-identical.** The three removed class strings in `Modal.tsx` stand verbatim in the `'center'`
  branch of the new ternaries. The panel's template literal is unchanged: the newlines sit inside `${…}`, so they are
  expression whitespace, not string content. `{children}` moving to its own line adds no JSX text. The new
  `Modal.test.tsx` block pins the backdrop, panel and body strings for the default and `wide` widths, and compares
  the whole `innerHTML` with `placement="center"` spelled out. The `'right'` branch changes only those three strings
  and adds no behaviour: the scroll lock, `useDialogLayer`, focus, `Tab` trap and backdrop rules are the same code.
- **`Drawer`** is `<Modal {...props} placement="right" />`, typed `Omit<ModalProps, 'width' | 'placement'>`, with no
  default for `dismissOnBackdrop`. It is Task 17's contract applied, not a copy of it.
- **The URL.** `productParam` accepts only `/^\d+$/` with a positive safe integer and cannot throw. `withProduct`
  returns `null` on no change, as `withCause` does. On the page, the open product is derived from
  `productParam(params)` through `driverOf` (drivers, then steady, ignoring `cause`), and `history` state is gone.
  `openProduct` pushes with `{ productDrawer: true }`. `closeProduct` does `navigate(-1)` for a marked entry, and
  otherwise a `replace` without `product`. The double-close guard is a ref compared with `location.key`, reset in an
  effect on `location.key`. `product` is not in `basisKey` or in any fetch effect's dependencies.
- **The frequency and the single month.** `Frequency` is now the first child of the body. `hasChart` is
  `orderedMonthCount !== 1` and nothing else. It removes the chart and its `Suspense`, the three metric buttons with
  the group's role and name, and the gaps note. The period caption and the «Orta qiymət necə hesablanır?» ⓘ stay in
  their row. No wording or calculation was added; `trend.ts` is untouched.
- **The tests.** Across all changed test files, the only deleted line is the `@testing-library/react` import in
  `OrderDecisionPage.test.tsx`, which gains `act` and `fireEvent`. No expectation was removed or weakened. I read the
  new test names in every file, and the unknown-product case: `it.each(['999999', 'abc', '0', '-3'])` asserts no
  dialog, the address unchanged, the list and headline figure present, and no trend request.
- **The mutation checks.** The Coder broke the guard (log line 479) and its reset (486), saw exactly one test fail
  each time (lines 484, 493), and restored both (488, 495). The current file has the restored code.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`; the calls were refused. So I read the
  raw tool results in the Coder log:
  - line 580: full frontend suite, `Test Files 57 passed (57)`, `Tests 1101 passed (1101)`;
  - line 585: `npm run build`, `built in 1.11s`;
  - line 596: `dotnet build --artifacts-path <scratchpad>`, `0 Warning(s)`, `0 Error(s)`. The plain build into `bin`
    failed on the running API's file lock (line 582), the same case as Tasks 17 and 18, which §11 allows;
  - line 612: `Passed! … 1046` unit and `Passed! … 785` integration.

  The Coder's last edit to application or test code is at log line 502. Every run above comes after it. After them
  the only writes are the manual pack (line 704) and `AI_WORKFLOW/` files.
- **No database or destructive command.** The Coder log's commands are git reads, `npm` test and build, `dotnet`
  build and test, `wc`, `grep`, `od`, and a `node` / `python` parse of `STATE.json`. There is no `psql`, `pg_dump`,
  `dotnet ef`, `dotnet run`, `git commit`, `git push`, `git reset` or `rm`.
- **The manual pack** has C-01 … C-16, each with an empty `---- operator doldurur ----` result, and says plainly
  that the Coder made no browser check.

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | A product row opens a right-hand drawer; at 1440×900 the amount, `Baza` and `Fərq` stay readable | PASS in code and tests: the panel is `justify-end`, `h-full`, `w-full sm:w-[560px]`, over `bg-slate-900/20` (`Drawer.test.tsx`, page test «opens a clicked product as a drawer on the right…»). The visual check at 1440 is the operator's (C-01, C-02). The Coder's arithmetic from the layout classes matches the spec's §4.2 evidence. |
| 2 | `Escape` closes, the page stays; after an in-page open the next Back leaves the page | PASS. Page test with `initialEntries` `['/elsewhere', url]`: after `Escape`, `product` is gone, `basis` and `cause` stay, and one Back reaches `/elsewhere`. |
| 3 | Back closes the drawer and stays; a second Back leaves | PASS. Page test «closes on Back and stays on the order…». |
| 4 | Basis and cause unchanged by any close | PASS. Escape, «Bağla», backdrop and Back tests assert `basis` and `cause`; «undoes the history first and the filter second». |
| 5 | Deep link `?basis=avg3&cause=new&product=<id>` opens as described; closing removes only `product`, with no new entry | PASS. Page test «opens a shared address…»: the basis button and «Yeni məhsullar» pressed, the drawer described by the product; after `Escape` the address is `basis=avg3&cause=new`, and Back goes to the entry before the link (the `replace`). |
| 6 | The frequency sentence comes before the supplier, the toggle and the chart | PASS. `TrendModal.test.tsx` «the order of the drawer», with `compareDocumentPosition`. |
| 7 | `orderedMonthCount === 1`: sentence, table, weighted-price hint; no chart, toggle or gaps note. Other counts: chart and toggle | PASS. Fixture shaped like `Ağac dirəyi metal` gives «Son 9 ayın 1-də sifariş edilib», no `chart`, no buttons, no group, no gaps note, the table's figures and «sifariş yoxdur», and the ⓘ. Counts 0, 2 and 6 draw the chart and the group; three measures, two for a service. |
| 8 | Opening and closing re-fetch nothing | PASS. Page test counts `fetchDecisionContext`, `fetchOrder` and `fetchRevision` across open, `Escape`, reopen and Back; `fetchVariantTrend` once per open. |
| 9 | At 390×844 the drawer is full-screen and «Bağla» is reachable without sideways scrolling | PASS in code: `w-full` below `sm`, the header is a non-scrolling first child. The device check is the operator's (C-03). |
| 10 | Unknown or non-numeric `product` gives no drawer and no error; focus returns to the row in a filtered list | PASS. The `it.each` case above, «opens no history when the comparison did not load», and the focus test (`toBe` the same row element, `{ preventScroll: true }`, the list still filtered). |
| 11 | No figure changed, other dialogs unchanged, all suites and builds green, old-terms sweep passes | PASS. No figure path changed. `'center'` is pinned. Frontend 57 / 1101, up from 56 / 1047. Backend 1046 / 785, unchanged. Both builds clean. `oldTerms.test.tsx` has a new `?product=` case, and it is in the green run. |

## Regression risks considered

- **Other dialogs.** Every other call site renders `Modal` without `placement`. The `'center'` output is pinned
  string for string, and the 22 other dialogs' existing tests pass unchanged.
- **An entry whose marker is lost.** If `useBasis` rewrites an old basis spelling with a `replace` that carries no
  state, a close falls back to the `replace` path. That leaves the pushed product-less entry behind, so one extra
  Back is needed. The spec names this case and accepts it (§4.3). It is not a defect of this task.
- **A reload with the drawer open.** `history.state` keeps the marker across `F5`, so a close still does
  `navigate(-1)` to the same order without `product`. That is correct, but jsdom cannot show it; it is C-10.
- **The ⓘ note inside the drawer.** No transform or animation is on the panel or its ancestors (tested), so
  `InfoHint`'s `position: fixed` note is measured from the viewport, as before. C-16 checks it in a browser.

## Notes carried forward

- **For 20 (click affordance).** The product row in `DriverList.tsx` is what opens the history, now through the page's
  `openProduct` (a push with the `productDrawer` marker). Requirement 3 of Task 20 restyles that row. It must keep the
  single `<button>` and its `onHistory(driver)` call, so the URL, Back and focus behaviour of Task 19 stay as they
  are.
- **For 23.** `components/imports/review/Drawer.tsx` is available for the source sections. `dismissOnBackdrop` is the
  caller's, and no inner dialog may open in the same commit as its parent.
- **Observations the Coder recorded and did not fix**, which I agree are not this task's: the header subtitle is
  `truncate` (pre-existing), so a long product name can be cut at 560 px and on a phone (C-03 records it). Safari
  does not focus a button on click, so focus may not return there (Task 17's behaviour).
- The manual pack `19-mehsul-cekmecesi.md` (C-01 … C-16) is prepared and not run. No browser check was made by the
  Coder or by this review.
