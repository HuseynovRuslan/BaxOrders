# Review — Task 20: Klik affordansı (Qərar zənciri, 4 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-20.md` (READY, Planner, verified at `899b005`); brief
`BRIEFS/TASK-20.md` (decisions 20.1, 20.2, 20.3); Coder report `LAST_REPORT.md`; the Coder log
`LOGS/20260925-230038-cycle11-coder.jsonl`.

**Verdict: PASS.** Task 20 is accepted. The next task is 21. Its specification is still `DRAFT — §2 UNVERIFIED`, so
the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `899b005` (Task 19's accepted commit). `git diff --stat` shows 9 tracked files, all
  under `frontend/bax-orders-web/src/`, +795 / −74. The untracked files are `components/interaction.ts`,
  `components/interaction.test.tsx`, `components/dashboard/details.tsx`, `test/interaction.ts`,
  `docs/audits/2026-qerar-zenciri/20-klik-affordansi.md`, and the workflow infrastructure (`AI_WORKFLOW/`,
  `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner excludes from the commit. No backend,
  tool, schema or data file changed. `useScrollMemory.ts`, `basisParams.ts`, `dashboard/labels.ts`, `terms.ts`,
  `format.ts`, `CauseSummary.tsx`, `causeFilter.ts`, `Modal.tsx`, `Drawer.tsx`, `TrendModal.tsx`, `OrderDetailPage.tsx`,
  `decisionParams.ts` and `LocationsPage.tsx` are not in the diff.
- **The production diff, read in full**: `interaction.ts`, `details.tsx`, `AttentionSection.tsx`, `LocationRows.tsx`,
  `DriverList.tsx`, `DecisionHeadline.tsx`.
- **One link per surface, and no nesting.** The card, the table row and the phone row each hold exactly one `<Link>`
  with `data-surface-link`, on the object name. I grepped the surfaces' sub-components (`MissingPriceMark`,
  `DirectionWord`, `DataState`, `MainCause`, `RowMissingPrices`) for links and buttons: the only other control is
  `InfoHint`'s `<button>` and its `role="note"`, both inside `openSurfaceLink`'s ignore selector. `MissingPriceMark` is
  a `role="img"` span with a `title`, so its tooltip stays and a click on it opens the card.
- **`openSurfaceLink`** matches §4.0: it returns on `defaultPrevented`, a non-main button, any of the four modifiers,
  a target inside `a, button, input, select, textarea, label, summary, [role="button"], [role="note"]`, and a
  non-collapsed selection with an end inside the surface. It then calls `.click()` on the `a[data-surface-link]`. The
  re-bubbled click has the `<a>` as target, so it is ignored on the way back up, and there is no loop.
- **Back.** `useScrollMemory` listens on the page root, below React's root. For a body click it sees a non-link
  target and returns; the forwarded click then passes it with the `<a>` as target and records the card or row id,
  before `Link` navigates. Two new page tests prove this end to end (body click → Back → `attention-21`; figure click →
  Back → `row-21`).
- **Destinations and names.** `detailsTarget` is the old `DetailsLink` ternary verbatim. `detailsName` is the old
  template verbatim, from the unchanged `detailsLabel`. The extra `detailsName` export is a harmless deviation from
  §4.2's suggested shape. `DetailsCue` keeps the old link's classes and arrow, drops `hover:bg-slate-50`, adds
  `group-hover:border-slate-300`, and is an `aria-hidden` span.
- **The table.** The sr-only `Detallar` header and the right-hand cell are gone. The footer's last cell is
  `colSpan={2}`, and a test sums the footer to 6 cells. Every row is a surface, including the no-order and
  never-ordered rows, which keep `/locations/{id}?basis=…` (§2.7).
- **`DriverList`.** Still one `<button>` with `onHistory(driver)`. It gains `group` and `aria-haspopup="dialog"`, the
  name span gains `interactiveTextClass` over its unchanged `font-medium text-slate-900`, and lucide's `History` icon
  follows it, `aria-hidden`. No other `group` exists in that subtree to confuse `group-hover`.
- **`Secondary`.** Only an available basis gets the box (`relative … border … hover:border-slate-300
  hover:bg-slate-50`). The button's `onClick` is verbatim. Its `after:absolute after:inset-0` layer covers the `<dt>`,
  and its name is `aria-labelledby` the term and itself, both from `useId()`. The unavailable `—` keeps
  `flex items-baseline gap-1.5` and plain text.
- **Built CSS.** I grepped `dist/assets/index-D47bqevY.css` myself. The four `has-[[data-surface-link]:focus-visible]`
  rules (`bg-slate-50`, `outline-2`, `outline-offset-2`, `outline-slate-900`) are there in Tailwind's own form, so the
  arbitrary-variant fallback was not needed.
- **The tests.** Across the five changed test files the only removed lines are:
  - two `MemoryRouter`-only imports, widened;
  - the `AttentionSection.test.tsx`:264 title (its assertions stay, which the spec allows);
  - `'Detallar'` in the header list at `LocationRows.test.tsx`:145 and in its second copy at :533–535;
  - the "keeps Detallara bax on one line" test, replaced as §10 asks. The replacement asserts six cells, no link in
    the last cell, no button and no «Detallara bax» in `tbody`, and a footer `colspan="2"` summing to 6;
  - one comment.

  The :533 copy is not named in §10. It is the same assertion, and it must change for the same reason (20.2). No
  other expectation was removed or weakened. No `.only`, `.skip`, `console.log` or the Coder's temporary
  `TMPACC` / `TMPNAME` probes remain in `src/`.
- **Suites and builds.** This Reviewer profile may not run `npm` (the call was refused), so I read the raw tool
  results in the Coder log. The Coder's last edit to application or test code is at log line 544, and every run below
  comes after it. After them the only writes are the manual pack (lines 653–677, 746) and `AI_WORKFLOW/` files.
  - line 558: full frontend suite, `Test Files 58 passed (58)`, `Tests 1158 passed (1158)`;
  - line 562: `npm run build`, `✓ built in 1.25s`;
  - line 593: `dotnet build --artifacts-path <scratchpad>`, `Build succeeded`, `0 Warning(s)`, `0 Error(s)`. The plain
    build into `bin` hit the running API's file lock (line 582), the same case as Tasks 17–19, which §11 allows;
  - line 607: `Passed! - Failed: 0, Passed: 1046` unit and `Passed! - Failed: 0, Passed: 785` integration.

  The one failure in the log (line 500, `1 failed | 100 skipped`) is a `-t`-filtered run during the Coder's temporary
  accessible-name probe. The probe was removed at line 505, and the full runs above are green.
- **No database or destructive command.** The Coder log's commands are git reads, `ls`, `grep`, `npm` test and build,
  `dotnet` build and test, and a `node` parse of `STATE.json`. There is no `psql`, `pg_dump`, `dotnet ef`,
  `dotnet run`, `git commit`, `git push`, `git reset` or `rm`.
- **The manual pack** has D-01 … D-15, each with an empty `---- operator doldurur ----` result, and says plainly that
  the Coder made no browser check.

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Any plain click on a card opens its order with the basis; no-order card opens `/locations/{id}`; one link | PASS. `AttentionSection.test.tsx` «the whole card opens the object»: clicks on the title, «Əsas səbəb», the amount, the direction sentence, the cue and whitespace; `/locations/21?basis=avg3`; `getAllByRole('link')` length 1 with no inner `a`/`button`. Page test: the percentage card has one link to `/orders/155?basis=avg3`. |
| 2 | Any plain click on a table row and a phone row opens the old destination; one link per row; no right-hand column | PASS. `LocationRows.test.tsx` «the whole row opens the object» and the replaced column test. |
| 3 | Product name underlines on hover/focus, has a history marker, announces a dialog; drawer opens as in 19 | PASS. `DriverList.test.tsx` «the product name says it opens something»; Task 19's drawer tests are unchanged and in the green run. The underline on focus works here because the `group` is the focused button itself. |
| 4 | Available basis has a button's box and a hover; a click on name or figure switches the basis in the URL; unavailable has no box | PASS in code and tests: `OrderDecisionPage.test.tsx` «the other bases, as buttons» (`basis=avg6`, re-fetch with `Previous6MonthAverage`, box and layer classes, no box for the unavailable one). That a click on the name lands on the `after:` layer is CSS, which jsdom does not draw. It is the operator's D-13. |
| 5 | Inert text carries no hover, cursor or focus class | PASS. `expectInert` (`test/interaction.ts`) is applied to every element §4.3 lists, on the card, both row layouts, the footer, the phone summary and the order headline. Read as §4.3 and assumption 1. |
| 6 | Tab stops once per card and row, in visual order, with a ring; the ⓘ is the one extra stop | PASS. Page test «stops once per card and once per row…» walks the whole page with `user.tab()`: cards `[link, ⓘ, link]`, table `[link, link]`, cards before the table, each stop `data-surface-link`. The ring's CSS reaches the build (above). Its visibility is the operator's D-08. |
| 7 | Figures, positions, destinations, ids unchanged; direction sentence on every card with a difference; Back returns | PASS. Page test «shows the figures it showed before», the id tests, «still says the direction in words on every card with a difference (9.1)», and the two Back tests above. The pre-existing link-click Back test is unchanged. |
| 8 | A selection-ending click does not navigate; Ctrl/Meta/middle on the body does nothing; on the name it is a normal link | PASS. `interaction.test.tsx`: collapsed-vs-not selection inside and outside the surface, each modifier separately, a non-main button, `defaultPrevented`, and a modifier click on the link itself left to the browser. |
| 9 | Other screens unchanged; suites and builds green; old-terms sweep passes | PASS. The report, the object page, `LocationsPage` and the order page's other sections are outside the diff. Frontend 58 / 1158 (from 57 / 1101). Backend 1046 / 785, unchanged. Both builds clean. `findOldTerms` is in the green run. |

## Regression risks considered

- **A second click handler on the page.** The forwarded click is synchronous inside React's handler and targets the
  `<a>`. `Link` handles it, and `useScrollMemory` records it before navigation. The original body click records
  nothing. The two Back tests cover the sequence.
- **Future content inside a card.** Anything Task 21 adds to the card that must keep its own click has to match the
  ignore selector, or it will open the order. The Coder's §9 says so, and I carry it into `CURRENT_TASK.md`.
- **The `Secondary` box padding** (`px-2 py-0.5`) is new spacing in the small `dl` under the headline. The spec
  prescribes it, and it does not touch the cards or the dashboard.

## Notes (not blocking)

- As the Coder observed, `group-focus-visible:underline` does not fire on the card or row name, because focus sits on
  the link and not on the `group`. Keyboard focus there is shown by the card's ring, or by the row's background plus
  the link's own ring, which satisfies criterion 6. The class strings are the spec's own. A later task may add
  `focus-visible:underline` to the link if the owner wants the underline on focus too.
- `LocationsPage.tsx` still has hover-only rows and two links per row (`TASK-20.md` §12). This is for the Coordinator
  to place, with Task 24's one-control rule the nearest owner.
- Browser-only checks (hover looks, ring visibility, the `after:` layer on the basis name, phone tap comfort) are in
  the D pack for the operator, and have not been run.
