# Review — Task 18: Səbəbdən drayverə keçid (Qərar zənciri, 2 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-18.md` (READY, Planner, verified at `97e81b8`); brief
`BRIEFS/TASK-18.md` (decisions 18.1, 18.2, 18.3); Coder report `LAST_REPORT.md`; the Coder log
`LOGS/20260925-230038-cycle05-coder.jsonl`.

**Verdict: PASS.** Task 18 is accepted. The next task is 19. Its specification is still `DRAFT — §2 UNVERIFIED`, so
the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `97e81b8b7a29…` (Task 17's accepted commit). `git diff --stat` shows 8 tracked files,
  all under `frontend/bax-orders-web/src/`, with +1165 / −63 lines. The untracked files are the four new frontend
  files named in the report, `docs/audits/2026-qerar-zenciri/18-sebeb-kecidi.md`, and the workflow infrastructure
  (`AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner excludes. No backend,
  tool, schema or data file changed. `api/decisions.ts`, `terminology/terms.ts`, `basisParams.ts`, `useBasis.ts`,
  `InfoHint.tsx`, `TrendModal` and `Modal` are not in the diff.
- **The production diff, read in full**: `CauseSummary.tsx`, `DriverList.tsx`, `labels.ts`, `OrderDetailPage.tsx`, and
  the new `decisionParams.ts` and `causeFilter.ts`.
- **`rowsUnder` / `matches` were moved verbatim.** The removed block in `DriverList.tsx` and `causeFilter.ts`:31–63
  are the same body and comments. The only difference is `export` on `rowsUnder`. Every chip count therefore stays
  exactly as it was.
- **The tests.** I read the new page tests (`OrderDecisionPage.test.tsx`, «from a reason to the products behind
  it», 12 tests). In the four changed existing test files, the only deleted lines are 5 import and render-helper
  lines: two `vitest` / `react-router` imports and three render calls replaced by the controlled harness. No
  expectation was removed or weakened.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`. The call was refused again. So I read
  the raw tool results in the Coder log:
  - line 778: full frontend suite, `Test Files 56 passed (56)`, `Tests 1047 passed (1047)`;
  - line 786: `npm run build` (`tsc -b` then `vite build`), `✓ built in 1.44s`;
  - line 818: `dotnet build --artifacts-path <scratchpad>`, `Build succeeded`, `0 Warning(s)`, `0 Error(s)`. The plain
    build into `bin` failed on file locks held by the running API. That is the same case as Task 17, and §11
    allows it;
  - line 833: `Passed! … 1046` unit and `Passed! … 785` integration.

  The Coder's last edit to application or test code is at log line 707. Every run above comes after it. After line
  778 the only writes are the manual pack (line 763, before the run) and `AI_WORKFLOW/` files.
- **No database or destructive command.** The Coder log has no `psql`, `pg_dump`, `dotnet ef`, `dotnet run`,
  `git commit`, `git push`, `git reset` or `rm`.

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Clicking «Yeni məhsullar» filters the list to new products, selects the chip, and brings the heading into view | PASS. Page test «filters the list, writes the choice beside the basis…»: the list goes from 4 rows to the 2 new products, the chip and the reason are `aria-pressed="true"`, and `scrollIntoView` is called once on the `H2` «Əsas dəyişikliklər» with `{ block: 'start', behavior: 'auto' }`. HEM's real figures are the operator's check (B-01). |
| 2 | `cause=new` in the address; a reload restores; Back returns unfiltered on the same page | PASS. The address probe reads `basis=avg3` and `cause=new`. The reload test opens `?basis=avg3&cause=new` filtered. The Back test uses `navigate(-1)`: the address returns to `basis=avg3`, the page stays, and nothing is re-fetched. `selectCause` pushes (`setParams(search)`, no `replace`). |
| 3 | A second click clears the filter | PASS. `onToggle` sends `'All'` when the reason's chip is already on. The page test shows `cause` removed, «Hamısı» pressed, 4 rows, and no second scroll. |
| 4 | «Xidmətlər», «Daxili təminat», «Variant dəyişib» are inert and do not look interactive | PASS. `chipOfCause` maps all three to `null`, and `listOf` returns `null`. So there is no button and no `aria-pressed`, and `rowClass` adds nothing (the class is `''`). In the page test, clicking the «Xidmətlər» row and its pill changes nothing. A mappable reason whose chip is empty is also inert (`rows.length === 0`). |
| 5 | The basis is unchanged and nothing is re-fetched; amounts, order, «Cəmi» and every count are unchanged | PASS. `cause` is not in `basisKey`, and the fetch count is equal before and after. `CauseSummary` tests compare the Heydər Əliyev order, caption, amounts, counts and bar widths with and without a selection. A basis change keeps `cause` (page test). |
| 6 | No two unexplained numbers under the same words | PASS. `causeListCountNote` gives §4.5's three forms word for word. It is shown only when `rows.length !== variantCount`, using the chip's own `rowsUnder`. Other parts are named only for `New` / `NoLongerOrdered`, in `causeOrder`. The HEM-shaped fixture asserts the spec's exact sentence. No figure changed. |
| 7 | A deep link `?basis=avg3&cause=price` opens filtered, with «Qiymət təsiri» pressed, and does not scroll | PASS. Page test «opens a link that carries the choice already filtered». |
| 8 | Keyboard: Tab, Enter and Space work, and the state is reported; an inert row is not a tab stop but its ⓘ is | PASS. The row's control is a native `<button type="button">` with `aria-pressed`. `CauseSummary` tests cover `Tab`, `Enter` and `Space`, and show the inert row with only its ⓘ as a stop. |
| 9 | No figure changed, other screens unchanged, all suites and builds green, old-terms sweep passes | PASS. Frontend 56 / 1047, up from 54 / 990. Backend 1046 / 785, unchanged. Both builds are clean. `oldTerms.test.tsx` has a new `?cause=new` case and is in the green run. |

## The two departures from the spec's examples, judged correct

- **No `z-10` on the ⓘ wrapper.** §4.3 wrote `relative z-10`. A `z-10` would create a stacking context, which would
  cap the `position: fixed`, `z-[60]` note from Task 12 under the sticky header and the phone's decision bar (both
  `z-20`). That would break §8's "InfoHint's behaviour inside a reason row". A positioned wrapper with `z-index: auto`
  that comes after the button in tree order paints, and is hit-tested, above the button's `::before` layer. The spec
  itself left the exact classes to the Coder ("The exact class strings are the Coder's to choose").
- **The collapse on a filter change** uses React's adjust-state-during-render pattern, `expandedFilter !== filter`,
  and not the example `expandedFor === filter`. The example would reopen an old expansion on A → B → A, for instance
  after Back. The spec's requirement is "collapses … whenever the filter changes, by any route", and this meets it.
  Task 10's behaviour holds as well: clicking the chip that is already on still collapses the list. There is a test
  for each.

## Not proven here, left to the operator

The layout and hit-testing cannot be shown in jsdom. That covers a click anywhere on the row landing on the button,
the ⓘ above the layer, the focus outline on `::before`, the landing position under the sticky header, smooth scroll,
and the phone. HEM September's actual 60 − 58 parts are also left open. The pack
`docs/audits/2026-qerar-zenciri/18-sebeb-kecidi.md` holds B-01 … B-14 in the twelve-line form. Every result is
`---- operator doldurur ----`, and the pack is read-only on real data. The report states that the Coder ran no
browser check. The spec makes the pack an operator stage, so none of this gates acceptance.

## Notes carried forward (not defects)

- For Task 19: `decisionParams.ts` owns `cause` only. The product history is still local state (`history` in
  `OrderDetailPage`). If Task 19 moves it into the URL, it must push, as `selectCause` does, so that Back undoes the
  history first and the filter second (`LAST_REPORT.md` §8).
- After Back, the browser's own scroll restoration may move the page (`history.scrollRestoration = 'auto'`). The app
  itself does not scroll. The operator is told in B-07.
- An interactive ordinary row gains `rounded-md` and a hover background with no padding, so the hover hugs the
  content. This is cosmetic, and B-06 / B-14 will show it.

## Human gates

None crossed. No database, no data, no backend. Nothing was committed or pushed by a role. The 58 / 60 gate was
answered by the spec's wording, with no figure changed, so there was no `BLOCKED_HUMAN`. Decision 18.3 is still marked
*açıq* in the master document. If the owner later prefers "bir rəqəm seçilməlidir", only §4.5's sentence changes
(spec Assumption 9). HD-009 stays open as the owner's decision and does not block. N-01 is still the owner's own
action.
