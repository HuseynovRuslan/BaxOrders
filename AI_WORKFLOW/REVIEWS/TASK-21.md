# Review — Task 21: Panel iyerarxiyası və baza əhatəsi (Qərar zənciri, 5 of 8)

Reviewer, 2026-09-26. Specification `TASKS/TASK-21.md` (READY, Planner, verified at `9926de1`); brief
`BRIEFS/TASK-21.md` (decisions 21.1 … 21.5, 21.2a); Coder report `LAST_REPORT.md`; the Coder log
`LOGS/20260925-230038-cycle14-coder.jsonl`.

**Verdict: PASS.** Task 21 is accepted. The next task is 22. Its specification is still `DRAFT — §2 UNVERIFIED`, so
the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `9926de1` (Task 20's accepted commit). `git diff --stat` shows 12 tracked files,
  +897 / −127: ten under `frontend/bax-orders-web/src/`, plus `ManagementDashboardQueries.cs` and
  `DashboardAttentionTests.cs`. The untracked files are `coverage/labels.test.ts`,
  `docs/audits/2026-qerar-zenciri/21-panel-iyerarxiyasi.md`, and the workflow infrastructure (`AI_WORKFLOW/`,
  `run-agent.ps1`, `monitor-agent.ps1`, `resume-agent.ps1`), which the runner leaves out of the commit. That is exactly
  §11's allowed set. `api/dashboard.ts`, `analytics/format.ts`, `pricing/labels.ts`, `MissingPriceMark.tsx`,
  `details.tsx`, `interaction.ts` and `DecisionHeadline.tsx` are not in the diff.
- **I read the whole production diff.**
  - **Backend.** The one ordering line changed from `ThenByDescending(|delta|)` to `ThenBy(item => item.Rank)`, and
    the remarks and inline comment were updated. `GroupBy(...).Select(First)`, `Take(MaxAttention)`, the candidate
    lists, `Rank`, `AlsoFirstIn` and the DTO are untouched.
  - **`AttentionSection.tsx`.**
    - `cardPrimaryFigureClass` and `cardSecondaryFigureClass` are exported exactly as §4.1 specifies.
    - The new `Change` component draws three lines: the change line, the `Bu ay` line, then the direction sentence.
      The change line is one tone-coloured `<p>`. The percentage leads only when the reason is
      `StrongPercentageChange`. `Baza N/M ay` is its last span, in its own slate class.
    - The `Bu ay` line has no colour and keeps `MissingPriceMark`.
    - The no-delta branch keeps the amount as `cardPrimaryFigureClass text-slate-900`, followed by
      `noComparisonCause`.
    - Only `<p>` and `<span>` elements were added, with no interactive class.
  - **`DashboardSummary.tsx`.**
    - The `leftOut` branch and `Subtraction` are gone. The headline is unchanged.
    - The amber `knownAmountHint` line (`warningToneClass`) appears only when `missingPriceItemCount > 0`.
    - `Cohort` always renders, as `role="group"` with `aria-label={footerComparedLabel(n)}`. It holds:
      - the basis line with the ⓘ;
      - three `whitespace-nowrap` label–figure pairs, with the tone only on the difference and the percentage;
      - the direction sentence;
      - `excludedFromComparisonLine` when `noBaseline` is non-empty.
  - **`LocationRows.tsx`.** `BaselineCoverage` sits under the percentage in the Dəyişmə cell and under the
    delta line on the phone row. `block` is added to the spec's classes, which is harmless.
  - **`coverage/labels.ts`.**
    - `baselineCoverageLabel` and `baselineCoverageNote` match §4.4's signatures. The note is non-null only for
      delta ≠ null and `Partial`.
    - `comparedAmountLine` is removed. It had no other caller.
    - `Baza` is a literal here to avoid a circular import. The Coder states this, and the word is the same.
  - **`components/dashboard/labels.ts`.** It gains `thisMonthLabel`, `baselineLabel`, `deltaLabel` and
    `baselineCoverageClass`.
- **Colour.** The slate span inside a tone-coloured `<p>` sets its own `text-slate-500`, so the tone does not reach
  it, and a test pins that. The only new amber is §4.3's line, so amber still means a missing price and nothing
  else.
- **The Coder's `noHistory` observation** (report §10). The old `Subtraction` also listed only `noBaseline` by name,
  so the new block loses no named object. In such a month the cohort's `Bu ay` is smaller than the headline. That is
  the intent of 21.2a, since the cohort is not the whole month. Not a defect.
- **The tests.**
  - **Removed or rewritten lines in the existing tests** are only those §10 names:
    - `AttentionSection.test.tsx`:387 and :395. The next sibling is now the `Bu ay` line, and the sentence is
      asserted one sibling further on.
    - `DashboardSummary.test.tsx`: the directly-beneath test, the subtraction test, the `basis:` colon form (three
      places), the `closest('p')` tone and nowrap assertions, and "says none of that". The last now asserts that the
      cohort is named and that nobody is listed as left out.
  - **No expectation was weakened.** Every figure (`71.210,29`, `71.030,25`, `44.340,78`, `+26.689,47`, `+60,19%`,
    `+26.869,51`, `+60,6%`) is still asserted. Tone assertions moved onto both figure spans, which is stricter. The
    rewritten tests also assert that the percentage appears once and that the sums are uncoloured.
  - `LocationRows.test.tsx` and `ManagementDashboardPage.test.tsx` only add tests. `oldTerms.test.tsx` changes two
    comments and adds assertions.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet` (both calls were refused). As for Task 20,
  I read the raw tool results in the Coder log.
  - The Coder's last edit to application or test code is at log line 588 (`AttentionSection.tsx`). The last backend
    edit is at line 325, where `ThenBy(Rank)` was restored after the red run.
  - After line 588 the only writes are to the manual pack and to `AI_WORKFLOW/`. A `python` rewrite of the pack at
    line 634 was refused.
  - Every run below comes after the last edit:
    - line 608: full frontend suite, `Test Files 59 passed (59)`, `Tests 1195 passed (1195)`. Line 687 is the same
      again;
    - line 669: `npm run build` (`tsc -b && vite build`), `built in 2.82s`;
    - lines 677 and 748: `dotnet build --artifacts-path <scratchpad>`, `Build succeeded`, `0 Warning(s)`,
      `0 Error(s)`;
    - line 770: `Passed! - Failed: 0, Passed: 1046` unit and `Passed! - Failed: 0, Passed: 791` integration
      (785 + 5 theory cases + 1 fact).
  - The earlier failures in the log are intermediate:
    - line 363: 34 failed, after the component change and before the tests were updated;
    - line 527: 4 failed in a filtered run, fixed by 542.
- **The red run is real.**
  - Line 315 reverts the ordering line temporarily.
  - Line 320 shows `Failed! - Failed: 1, Passed: 26` on `DashboardAttentionTests`.
  - Line 325 restores `ThenBy(Rank)`.
  - Line 330 shows `Passed! - Failed: 0, Passed: 27`.
  - So the new fact reproduces the defect. The Coder notes that the new theory passes under both lines in
    `MixedWorld`. §6 asks the fact, not the theory, to reproduce the defect, so this is acceptable.
- **No database or destructive command.** The Coder log's commands are git reads, `grep`/`sed`/`cat`, `npm` test and
  build, and `dotnet` build and test. There is one `sed -i` on a test file at line 486, before the green runs. `node`,
  `python` and `jq` parses of `STATE.json` were refused. There is no `psql`, `pg_dump`, `dotnet ef`, `dotnet run`,
  tool under `tools/`, `git commit`, `git push` or `git reset`.
- **The manual pack** has E-01 … E-18, each with an empty `---- operator doldurur ----` result. It says plainly that
  the Coder did no browser check and that the running API must be restarted for the card order (E-16).

## Acceptance criteria (spec §9)

| # | Criterion | Result |
|---|---|---|
| 1 | September / Keçən ay «Ən böyük məbləğ artımı»: `+23.852,70 ₼` largest (`cardPrimaryFigureClass`); `35.837,72 ₼` smaller on the next line, named `Bu ay` | PASS. `AttentionSection.test.tsx` «makes the difference the largest figure…»: the only `.text-2xl` on the card is the delta; the next sibling reads `Bu ay 35.837,72 ₼` in `text-sm`, uncoloured. |
| 2 | Delta and percent at different sizes, both red, direction sentence kept | PASS. «draws the difference and the percentage at two sizes…»: the percent has the secondary class, the line is `text-red-700` and `Keçən aya görə xərc artıb` is present. |
| 3 | Summary: headline `71.210,29 ₼`; cohort block `Müqayisə olunan 23 obyekt` with `Bu ay 71.030,25 ₼ Baza 44.340,78 ₼ Fərq +26.689,47 ₼ · +60,19%`; the percentage only in the block; nothing but §4.3's line between the headline and the block | PASS. `DashboardSummary.test.tsx` «keeps the total as the headline and names the cohort…» (exact text regex; `headline().nextElementSibling` is the group; `+60,19%` occurs once), and «says under the headline…» (headline → amber line → group). |
| 4 | Same structure on `last`, `avg3`, `avg6`, `all`, `custom`, with and without an object left out | PASS. «one arrangement for every basis and every month»: ten fixtures, each with headline, group name, figure line and a single percentage, plus a structural sequence test (tag, role, fixed words) that is equal across all ten except the two conditional lines. |
| 5 | Missing-price exclusion visible under the headline; absent at 0 and with internal supply only | PASS. Three tests in «incomplete price data». The ⓘ and the amber button stay. |
| 6 | `basis=avg6`: every partial card and row (table and phone) shows `Baza N/6 ay` with its own N; complete, no-baseline and no-order rows show nothing; slate; no `təxmini`/`təqribi`; percentages unchanged | PASS. `ManagementDashboardPage.test.tsx` «the baseline coverage on six months» (2/6 and 4/6 on all three surfaces; complete and no-baseline objects clean; `readableText(document.body)`). The no-order case is covered in `LocationRows.test.tsx` and `coverage/labels.test.ts`. |
| 7 | Milli Konservatoriya: `+480,01%` primary, `+1.514,82 ₼` beside it, `Bu ay 1.830,40 ₼` under them | PASS. «leads a percentage card with the percentage…», with exact line text and next sibling. |
| 8 | Card order: increases, decreases, **largest percentage** then second, then warnings, on every basis | PASS. Backend `ThenBy(Rank)`. The `[PostgresTheory]` checks every basis in reason-then-rank order. The `[PostgresFact]` puts Faiz 1 (rank 1) before Faiz 2 (rank 2), although Faiz 2 moved more money, and it was red against the old line. |
| 9 | An object with no baseline keeps its amount as the largest figure and its explanation | PASS. «keeps an object with no baseline on its amount…». |
| 10 | Nothing moved: figures, card membership, one link per card, Task 20 tests unchanged, suites and builds green, old-terms sweep | PASS. The (reason, object) set equals the old rule's in the new fact. `The_movements_choose_the_same_objects_as_before` and `Every_card_carries_its_true_place_in_its_own_ordering` are unchanged and green. The Task 20 tests are not in the removed lines. Frontend 59 / 1195, backend 1046 / 791, both builds clean. The sweep is green with the new assertions. |

## Regression risks considered

- **Card order in production** changes only for the percentage pair. It cannot change the selection, because at most
  8 candidates exist against `MaxAttention` 8. The running API must be restarted to serve it (E-16).
- **Card height.** The line count is unchanged. The 24 px line moved from the amount to the change. `Baza N/M ay` may
  wrap on a narrow card. E-18 measures the fold at `1366×768`.
- **Duplicate figures.** When nothing is left out, the cohort's `Bu ay` equals the headline, by design
  (assumption 5). Tests that find the headline now do so by position, not by text.

## Notes (not blocking)

- 21.5's materiality threshold remains the owner's number. It was not introduced, and no card is hidden.
- `historyCoverageClass`'s unused amber `Partial` entry is untouched. A later cleanup could remove it.
- `LocationsPage.tsx`'s hover-only rows and two links per row (`TASK-20.md` §12) are still open. Task 24 is the
  nearest owner.
- The browser-only checks (the three-second read, the fold count, wrapping, the phone layout) are in the E pack for the
  operator and have not been run.
