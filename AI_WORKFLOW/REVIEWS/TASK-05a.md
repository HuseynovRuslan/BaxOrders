# Review — Task 05a: Terminlər, vahidlər və format

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Task 05 continues with 05b.

## What was inspected

- Branch `main`, HEAD `3d9a4ed` (Task 04b). Nothing for 05a is committed yet.
- `git status` and the full `git diff` of the 47 tracked files (+473 / −215), plus every untracked file:
  `terminology/terms.ts`, `terminology/units.ts`, their tests, `terminology/oldTerms.test.tsx`, `test/oldTerms.ts`,
  `layout/Header.test.tsx`, `components/analytics/trend.test.ts`.
- Every change is under `frontend/bax-orders-web/src/`. No file under `src/` (backend), `tests/`, `tools/`,
  `package*.json` or any migration is touched. The only other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1`
  and `monitor-agent.ps1`, which the runner excludes.
- A search of `src/` (non-test files) for every §10.1 word. The only hits left are comments, the test helper's own
  list, and the administrator import screens (`ImportsPage`, `ImportGroupsTable`, `ConfirmationDialog`,
  `ImportRowsTable`, the review dialogs, `imports/labels.ts:110` Excel column name "Ö/v"), which §4 puts out of
  scope.
- The raw Coder log `LOGS/20260924-211438-cycle03-coder.jsonl`, for tool results and for every Edit, Write and Bash
  command.

## How builds and tests were verified

This Reviewer profile is not allowed to run `npm` or `dotnet`; the harness asked for approval and I did not get it.
As with Tasks 3, 04a and 04b, I checked the raw tool results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Frontend tests | line 1204: `Test Files 34 passed (34)`, `Tests 491 passed (491)` (04b: 29 / 448) |
| Frontend build (`tsc -b && vite build`) | line 1207: `built in 1.41s` |
| Backend build | line 1017: `Build succeeded`, `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`) |
| Backend tests | line 1025: `Passed! Failed: 0, Passed: 797` and `Passed! Failed: 0, Passed: 609` — unchanged from 04b |

The Coder's last edit to an application or test file is at log line 1165 (`TrendModal.test.tsx`). The final
`npm test` (1199) and `npm run build` (1200) come after it; every later Write or Edit targets `LAST_REPORT.md` or
`STATE.json`. No Bash command writes files (no `sed`, `mv`, `cp`, `rm`). `find -newer` on the Coder log finds no file
under `frontend/bax-orders-web/src`, `src`, `tests` or `tools` changed after the session. So the results apply to the
tree as it stands. The backend run precedes some frontend edits, but no backend file is in the diff, so that does not
matter.

The two failing runs in the log (lines 957 and 987) are the deliberate mutation checks the report describes. Both
files were restored, and the full suite ran green afterwards.

## Acceptance criteria (TASK-05a §10)

| # | Criterion | Result |
|---|---|---|
| 1 | None of the retired words on the seven screens | PASS — `oldTerms.test.tsx` renders the dashboard, the order page with the panel and both history tabs, the product history (from the order page and on its own), the object page, the comparison page (materials and services), the monthly report and the inbox. Fixtures reach every old code path: a missing price, partial history, new and not-ordered products, PCS/BAG/PACK/PAIR/ROLL/KG/L/M2, 32.1273, and a workflow history with a return and an acknowledged approval. It checks `textContent`, `aria-label`, `title` and `placeholder` against one exported list. Two further tests prove the detector catches each old word and passes each new one |
| 2 | The new words where the old ones were | PASS — the same sweep asserts them. `terms.ts` holds all eight 5.1 constants, the one incomplete-explanation sentence and `locativeSuffix`. Callers import them rather than repeating literals |
| 3 | Fəvvarələr: "71 → 0 ədəd", "32,13 ₼" | PASS — `DriverList.test` › "says a unit and a price the way the Fəvvarələr order should read", and the order-page sweep |
| 4 | No English unit code; unknown code → lower-cased catalogue name | PASS — `unitWord` covers the table in §5.4 exactly. It uses `toLocaleLowerCase('az')` for names ("İnç" → "inç"). `formatOrderUnit`, `formatItemSpecification`, `formatVariantLine`, `DriverList`, `TrendModal` and `EditLineDialog` all pass the name through. "Ö/v" → "Vahid", and the tooltip is removed. No stored name changes |
| 5 | No-break space before ₼; prices to two decimals | PASS — `manatSuffix` is built from `String.fromCharCode(0xa0)` and used in `formatMoney`, `formatPrice` (now `formatMoney`), `formatAmount` and `weightedPriceHint`. `priceFormat` (2–4 decimals) is deleted. `format.test` checks exact strings for all four formatters, and the sweep rejects any ordinary space before ₼ |
| 6 | Header: nothing when healthy, "Server əlçatan deyil" on failure | PASS — `ApiStatus` returns `null` unless `status === 'error'`, and adds `role="status"`. `Header.test` covers loading, healthy and error |
| 7 | The pairs of §5.3 read with one word; Nərimanov says "N sətirdə qiymət yoxdur" in both places; no "N sətir · N sətirdə…" | PASS — each pair is resolved as specified (`basisLabels`, `causeLabels`, `causeHeadline`, `attentionReasonLabels`, the order-line filter, `LocationTrend`, `DecisionHeadline`, the `OrderDetailPage` fallback, `AnalyticsSummary`, `ApprovalRows`, `ApprovalSummary`, `WorkflowHistory`, `missingPriceWarning`, `TrendModal` `PriceCell`). The object-page sweep asserts the sentence at least twice. The history label is now "Düzəliş tələb olundu". One extra: the dashboard's data-state filter option also said "Qiymət məlumatı çatışmır"; it is fixed, as §10.1 requires |
| 8 | §5.7 words unchanged | PASS — `pricing/labels.ts` changes only its header comment. In `coverage/labels.ts`, only `partialHistoryChipLabel` changes. `environment/labels.ts` and the 4.1 sentence are not in the diff. The tests the report lists still assert them and pass |
| 9 | No figure changed; changed tests only for words, units or format | PASS — there is no backend change, and the backend counts are 797 / 609 as before. I read each changed test: every edit is a word, a unit, U+00A0 in an exact comparison, or the removal of a summary line the spec removes. No expected number or class changed. No expectation was loosened |
| 10 | All suites and both builds green | PASS — see above |

## Invariants (TASK-05a §9)

- **No colour class changed.** The same amber and slate classes are used. In `DecisionHeadline`, `warningToneClass` and
  `internalToneClass` are kept. Where a missing-price count moved from a `<span>` to its own `<p>`, it keeps
  `text-amber-800`.
- **04a's panel structure.** The action row, facts and sticky column are unchanged. Only the amount line leaves
  (§5.2.2), and `missingPriceNote` stays. The 4.1 sentence, "Düzəliş tələb et" and the submission words are
  unchanged.
- **04b's banner** is not in the diff.
- **Task 1/1b/1c/2/3.** No computation, sort, filter predicate, URL basis or cohort code is touched. `describeBasis`
  now reads `basisLabels` for `AllPriorMonths`, which returns the same string it returned before.
- **05b not done.** `locationCode`, `productCode`, `modelCode`, "Versiya", "Sətir sayı" (`WorkflowDialog` fact,
  `LocationDetailPage` column) and the code-inviting placeholders are all still present, as they should be.
- **No database reached.** The log has no `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or `tools/` invocation.
  HD-002's 94 rows are untouched.

## Observations (not failures)

1. `AnalyticsSummary` shows only `missingPriceCount`, not `internalSupplyCount` as well. The spec says "the same, with
   `missingPriceCount` instead of 'N qiymətsiz'". The old line never showed internal supply, and adding a new fact is
   not a wording change, so the Coder's reading is defensible. The report says so openly. If the owner wants the
   internal-supply count there too, it is a few lines in a later task (Task 6 or 9).
2. `DriverList` rows show the cause as a badge on one product's row using the plural `causeLabels` ("Yeni
   məhsullar"). §5.2.1 asks for the singular only on `ComparisonRows`' `StateBadge`, and §5.2 assigns the plural to
   `causeLabels`, so this follows the spec. Task 6, which owns "Niyə dəyişib?", may want the singular there.
3. `amountHeading` is kept with no caller. The spec allows either keeping or deleting it.
4. The report's note on `CODER_PROMPT.md` is correct: the working command form is `npm run --prefix
   frontend/bax-orders-web <script>`. This is workflow infrastructure, not part of this task.
5. The ₼ fix is made by construction and tested. Nobody checked it by eye in a browser at 1366 px or on a phone. That
   belongs to Task 12, which the report flags.

## Scope

Nothing outside §4. Admin import screens keep "qiymətsiz" and "Ö/v" (Task 16 and the brief's own admin exception).
The report lists them.

## Transition

- `PLAN.md`: 05a is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 05b — Texniki məlumatların rəhbər görünüşündən çıxarılması**, the second part of Task 05, which the
  Planner fixed to run after 05a. `TASKS/TASK-05b.md` exists and is complete (status READY, written from
  `BRIEFS/TASK-05.md`), so the state is `READY`, not `PLANNING`.
- 05b is presentation-only, with no data change, so no §7 gate applies.
