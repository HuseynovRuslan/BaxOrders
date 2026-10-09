# Review — Task 11a: Obyektlər siyahısı və obyekt səhifəsi

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 11b. Its brief is
`BRIEFS/TASK-11.md` (shared with 11a), but `TASKS/TASK-11b.md` does not exist yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `47454e6` (Task 10). Nothing for 11a is committed yet.
- `git status` and the full `git diff` of the 13 tracked files (+1076 / −129). Every path is under
  `frontend/bax-orders-web/src/` and on spec §5's list. There are no new files. `src/` (backend), `tests/`, `tools/`,
  `components/analytics/labels.ts`, `ComparisonRows.tsx`, `AnalyticsSummary.tsx`, the dashboard and the monthly
  report are not in the diff. `MissingPriceMark` was imported from `components/dashboard/`, not copied. The only
  untracked paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the runner leaves out of the
  commit.
- The raw Coder log `LOGS/20260924-211438-cycle23-coder.jsonl`, for every Edit, Write and Bash command, and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile was again refused `npm run … test` because the harness required approval. As with Tasks 3–10, I
checked the raw tool results in the Coder log instead:

| Check | Raw log evidence |
|---|---|
| Frontend build (`tsc -b && vite build`) | command 443, result 446: `built in 3.48s`. The TS errors at 334 were the fixtures missing `internalSupplyItemCount`, fixed before it |
| Frontend tests | command 460, result 464: `Test Files 41 passed (41)`, `Tests 734 passed (734)` (Task 10: 41 / 701) |
| Backend build | command 474 (`--artifacts-path`, because the running API locks `bin`), result 478: `0 Warning(s)`, `0 Error(s)` |
| Full backend suite | command 486, result 543: `Passed! - Failed: 0, Passed: 826` unit and `Passed! - Failed: 0, Passed: 683` integration. These equal Task 10's counts, because the backend is untouched |

The last application or test edit is `OrderDecisionPage.test.tsx` at log line 441. That comes before the build (443)
and before the full frontend run (460). The only later edits are `LAST_REPORT.md` (545) and `STATE.json` (547).

No Bash command in the log runs `psql`, `pg_dump`, `dotnet ef`, `dotnet run`, anything under `tools/`, or any
`git commit/reset/stash/checkout/clean/push`.

## Acceptance criteria (TASK-11a §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Nərimanov strip: "Aprel 2026", "May", "İyun", "İyul", "Avqust", "Sentyabr". No three-letter cut. An amount on every slot. A gap is named with "—" money. "⚠ N" appears on a partial month | PASS. Each slot is labelled `monthTickLabel(period, index === 0)`, a gap included. The money is `formatMoney(entry.knownAmountTotal)` or `unknownValue`. `MissingPriceMark` gets `explanationIsComplete`, so it renders only when count > 0. `stripSlots` spans at most 12 calendar months ending at the latest order, from the oldest loaded month in that range, with the highest version per month. Tests cover the six names, the January year, the gap, "⚠ 3" only on the owed month, 12 of 15 months, and İyul v2 over v1. The old-terms sweep asserts that no three-letter cut stands as a word |
| 2 | `?basis=avg3` → `Previous3MonthAverage` for the latest order. Caption, 9.1 and the word. The picker is chosen. Every link carries `basis=avg3`. Re-picking rewrites and refetches. "Obyektin sifarişləri" keeps the basis | PASS. `useBasis(params, setParams)` is used, and `fetchDecisionContext(latestId, basisRequest(selection), signal)` is keyed on `latestId` plus the flattened basis. A failure only drops the line. `orderLink` is on the card, row and period links. `comparisonLink` builds its query through `URLSearchParams` + `basisSearch`, so `basis=` is never hand-spelled. `OrderDetailPage` and both `LocationAnalyticsPage` links use `locationLink(…, selection)`. The tests assert the call (107, `Previous3MonthAverage`), −150,00 ₼ in `text-emerald-700` with "xərc azalıb", `aria-pressed`, 4 + 3 + 1 + 3 links, the switch to `PreviousMonth` with `?basis=last`, the default, the rejected context, and both round-trip hrefs |
| 3 | "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1" (amber / slate). "15" sits under "Bütün tarixçə (… – …)". A row reads "{k} sətir daxili təminat (ödənişsiz)" | PASS. `LatestCounts` uses `orderCountsLead`, `missingPriceShortLabel` in `warningToneClass` (`text-amber-800`) and `internalSupplyShortLabel` in `internalToneClass` (slate). Each shows only when > 0, and there is no line when both are 0. The lifetime lead is `wholeHistoryLead(formatMonthRange([earliest, latest]))`, and an object with no orders reads "Bütün tarixçə:". Rows add `internalSupplyCount`. The two type fields match what the backend already sends |
| 4 | The list: +320,40 ₼ is red and −150,00 ₼ green, with the `sr-only` word, on both lines. The header says "Keçən aya görə". A null delta reads "—" with the sentence | PASS. `costDirectionToneClass` is on both `<p>`s and `DirectionWord` is on the money. The caption is `describeBasisCaption('PreviousMonth', [])` in `block font-normal text-slate-400`. The dash has `title` and an `sr-only` `noPreviousMonthNote`. Zero stays slate with no word |
| 5 | `LocationTrend` computes no difference, and the card and strip are hidden on page 2 or under a filter | PASS. `monthBefore` and the subtraction are removed, and the comparison comes only from the `comparison` prop. The page renders `LocationTrend` only when `latest` exists (`!year && !month && page === 1`). The effect sets no fetch when `latestId` is null. Tests cover the year filter and page 2 with no `fetchDecisionContext` call |
| 6 | Nothing else changed: the backend diff is empty, the comparison page is only re-linked, suites and builds are green, and the sweep passes | PASS. See above. `LocationAnalyticsPage` changes only its import and two `to=` props |

## Invariants (TASK-11a §8)

- **Task 1.** The basis is spelled only by `basisParams.ts`. The dashboard's `locationLink` / `orderLink` are
  unchanged. The order page's prior-months expression moved into `comparablePriorMonths` unchanged, and both pages
  call it rather than copying it. `OrderDecisionPage.test.tsx`'s existing tests pass.
- **Task 2.** Amber appears only for owed prices. Internal supply is slate everywhere and never raises the "⚠" mark.
- **Tasks 3 and 5.** The list's columns, sort, search and summary are unchanged. The header-name test still pins the
  same six names. "Əvvəlki sifariş — sonradan yenilənib" and the "Dövr / Məbləğ / Status / (links)" columns stay, and
  there is no code and no version. The sweep is green on the new lines.
- **Tasks 6–10.** The order page's analysis, the dashboard, the monthly report and the product history are not in the
  diff, apart from the one link and the helper call.
- **Brief "Mütləq qorunmalı".** The periods table remains, with "Sifarişə bax" on every row. "Obyektin sifarişləri"
  still leads to the object page, now carrying the basis.
- **No database reached, and HD-002's 94 rows are untouched.** There is no backend, schema or migration change.

## Changed tests

Every changed existing test is on spec §10's list, or is a fixture gaining `internalSupplyItemCount`:

- the `LocationsPage` header list, which strips only the caption and still asserts the same six names; the caption
  is asserted separately;
- the two `LocationTrend` month-before tests, replaced by the backend-context "Keçən aya görə" test and the
  `emptyWindowNote` test;
- the card's "2 sətirdə qiymət yoxdur", replaced by the brief's "{Ay} sifarişində: Qiymət yoxdur 2", which is
  stricter, since it also checks that no "Daxili təminat" or "·" appears;
- "Sifarişə bax" `/orders/9`, which now carries the basis;
- the card amount, now found by `.text-2xl` because the strip also prints the amount;
- the old-terms "object page" test, which gains the basis and the new lines.

No expected figure, class or business rule was loosened.

## Deviations from the spec (accepted)

1. `selectBasis` in `LocationDetailPage` repeats the pattern of `OrderDetailPage.selectBasis`, as §4.2 asks
   ("as `OrderDetailPage.selectBasis` does"). It is a URL write, not a business rule. The spec's no-copy
   requirement applied to the prior-months expression, and that one is shared.
2. While another basis loads, the previous context is kept but not shown, so the custom-range picker keeps its
   months. On failure it is cleared, so a figure is never shown under the wrong basis. This is a refinement of §4.2,
   and it is tested.

## Observations (not failures)

1. The brief's real figures need the real database, which this task does not touch: Nərimanov's strip, "Qiymət
   yoxdur 1 · Daxili təminat 1", Heydər Əliyev's "15", and the dashboard → object page "Son 3 ay" path. The fixture
   tests prove them. The operator should confirm them on the running app.
2. **Go-live:** there is no backend change, so no API restart is needed for 11a. The frontend reads
   `internalSupplyItemCount`, which the API already sends, and the existing `decision-context` endpoint.
3. The object card shows only `primary`, not the order page's small "Digər müqayisə bazaları". The spec does not ask
   for them.
4. The strip is built from page 1 of the history. An object with very many versions in the last year could show fewer
   than 12 months. The spec ("no earlier than the oldest loaded order") accepts this.

## Scope

Nothing outside §3. The comparison page got only `locationLink` on two links. Its route, components and the targets
of "Müqayisə et" / "Müqayisə" are 11b's.

## Transition

- `PLAN.md`: 11a is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 11b — Obyekt müqayisə səhifəsinin sifariş səhifəsinə birləşdirilməsi (11.1)**, the second part of
  Task 11. Its brief `BRIEFS/TASK-11.md` exists and `TASKS/TASK-11b.md` does not, so the state is `PLANNING`.
- 11b inherits (from `LAST_REPORT.md` §7):
  - `comparisonLink` in `LocationDetailPage.tsx` for the header's "Müqayisə et" and each row's "Müqayisə";
  - `latest` exists only on the unfiltered first page;
  - `comparablePriorMonths` in `components/decisions/labels.ts`;
  - `LocationAnalyticsPage`'s two `locationLink` back-links;
  - `signedToneClass`, still re-exported by `components/analytics/labels.ts`.
- 11b changes no real data, so no §7 gate applies.
