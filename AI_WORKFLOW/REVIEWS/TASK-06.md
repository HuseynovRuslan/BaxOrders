# Review — Task 06: "Niyə dəyişib?" bölməsi

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. Next: Task 7. Its brief exists but it
has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `1e065a8` (Task 05b). Nothing for 06 is committed yet.
- `git status` and the full `git diff` of the 11 tracked files (+789 / −92). All of them are under
  `frontend/bax-orders-web/src/`, and every one is on spec §5's "Changed (expected)" list. Nothing is touched under
  backend `src/`, `tests/` or `tools/`, and no `package*.json`, migration, `DriverList`, `TrendModal`, dashboard,
  monthly-report, objects or comparison-page component, `causeToneClass`, `causeOrder`, `causeLabels`, `causeHints` or
  `pricing/labels.ts` is changed. The only untracked paths are `AI_WORKFLOW/`, `run-agent.ps1` and
  `monitor-agent.ps1`, which the runner leaves out of the commit.
- The backend facts the tie order depends on: `ManagementDashboardQueries.cs:202–204` picks the primary cause with
  `OrderByDescending(|Amount|).ThenBy(Category)`, and `CauseDecomposition.cs` numbers the categories NewOrders 1 …
  Services 5, UnattributedDueToMissingPrice 6, InternalSupply 7. `causeTieOrder` in `decisions/labels.ts` has exactly
  that order.
- The raw Coder log `LOGS/20260924-211438-cycle08-coder.jsonl`, for every Edit, Write and Bash command and for the
  test and build results.

## How builds and tests were verified

This Reviewer profile is not allowed to run `npm` or `dotnet`. The harness asked for approval for
`npm run --prefix frontend/bax-orders-web test`, and I did not get it. As with Tasks 3–05b, I checked the raw tool
results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Frontend tests | line 339: `Test Files 36 passed (36)`, `Tests 551 passed (551)` (05b: 36 / 521) |
| Frontend build (`tsc -b && vite build`) | line 342: `built in 1.43s` |
| Backend build | line 297: `Build succeeded`, `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`, because the running API locks `bin/`) |
| Backend tests | line 309: `Passed! - Failed: 0, Passed: 797` and `Passed! - Failed: 0, Passed: 609`, unchanged from 05b |

The last edit to an application or test file is the `labels.ts` edit at log line 324 (18:48:25 UTC). The final full
`npm test` and `npm run build` (lines 334–335) were issued at 18:48:36 UTC, after it. On disk, the latest mtime of the
11 changed files is 22:48:25 local (+04:00), which is the same edit. After the final run, every Write or Edit targets
`LAST_REPORT.md` or `STATE.json`, and every Bash command is a read (`head`, `sed -n`, `git diff`, `git status`). So the
green results apply to the tree as it stands. The backend run (18:46) comes before that last frontend-only edit,
which cannot affect it.

The one failing run in the log (line 260: 1 failed of 145) is an intermediate run of the touched files. The
`terms.test.ts` edit at line 262 fixed it, and it was followed by a green targeted run (267) and green full runs
(275, 339).

## Acceptance criteria (TASK-06 §9)

| # | Criterion | Result |
|---|---|---|
| 1 | Fəvvarələr: first "Bu ay yazılmayan məhsullar −8.093,70 ₼", marked, emphasised, green; then +5.133,27, +648,98, −290,00, +17,00 | PASS. `bySizeThenDashboardOrder` sorts a filtered copy, not the API array. The test `leads Fəvvarələr…` asserts the exact row order, the single "Əsas səbəb" and `data-primary`. `makes the main cause visibly larger` asserts the background and ring, the larger chip and amount, and the 100% bar. `the colours` asserts the green bar and amount |
| 2 | Heydər Əliyev: first "Yeni məhsullar +29.691,52 ₼", marked, red; then −5.259,62, −309,20, −300,00, +30,00 | PASS. Exact order, caption, red bar and amount, and Cəmi +23.852,70 in red are all tested |
| 3 | Every bar, part amount and "Cəmi" by 9.1; red and green explained in words | PASS. `costDirectionBarClass` and `costDirectionToneClass` are written once in `format.ts` and unit-tested. `barToneClass` is removed, and a test proves no slate-400, sky, indigo or violet fill remains. The legend "Qırmızı — xərc artıb · Yaşıl — xərc azalıb" is built from `terms.ts`, each amount and "Cəmi" carries an `sr-only` direction word, and "yaxşı" and "pis" are absent (tested) |
| 4 | "Qiymət yoxdur" = 0 → no warning even with `explanationIsComplete: false` | PASS. The condition is `unexplained !== 0` only. The Fəvvarələr fixture has `explanationIsComplete: false`, `unattributedVariantCount: 1` and a zero-money unpriced driver. It gets no `role="status"` and no "izah edilə bilmir" |
| 5 | Non-zero "Qiymət yoxdur" → one warning with the amount and names (≤3, then "və daha N məhsul") | PASS. `unexplainedPartNote` is in `terms.ts`. The names come only from drivers in that category, in driver order and de-duplicated. There are 7 unit tests, including the `findOldTerms` check, and 3 component tests, including "exactly one status". An empty name list gets a shorter sentence instead of ending in "…: .", which the spec does not mention. It is harmless and tested |
| 6 | "Baza … ₼" and "Fərq … ₼ …%", difference by 9.1 | PASS. `OrderDecisionPage.test` finds "Baza" beside the baseline and "Fərq" beside the delta and percent. A rise is red and a fall green, on the primary and the secondary bases, and no emerald or rose/red is left in the wrong case |
| 7 | First part = dashboard card's "Əsas səbəb", ties included | PASS. `causeTieOrder` matches the backend's `ThenBy(Category)` (checked in the C# above). Two tie tests pass: "Qiymət yoxdur" before "Daxili təminat" (the reverse of `causeOrder`), "Bu ay yazılmayan" before "Xidmətlər", and "Yeni məhsullar" before "Qiymət təsiri". `causeOrder` itself is not changed |
| 8 | Internal supply separate, never amber, no warning, supply-change note | PASS. The chip is neutral (amber only for `UnattributedDueToMissingPrice`), and the warning comes only from that category. `supplyChangedDriverNote` shows only when `supplyChangedVariantCount > 0` (positive and negative tests). The existing page test at `OrderDecisionPage.test.tsx:870–895` is not in the diff and passes |
| 9 | Caption and zero-change sentence name the chosen basis | PASS. `OrderDetailPage` passes `primary.basis` and `windowPeriods`. `describeBasisCaption` is used for both the caption and the sentence. There are tests for the 6- and 3-month captions and for "Son 3 ayın ortalamasına görə məbləğ dəyişməyib.", and a page-level test that the section follows the chosen basis. The "Keçən ay" sentence is unchanged, word for word |
| 10 | No figure changed; other screens unchanged; suites and builds green; sweep passes | PASS. No computation changed: amounts, "Cəmi", deltas and percentages are rendered from the API as before, and the width formula is unchanged. The sweep gains a case with the new sentence in its longest form. The counts are above |

## Invariants (TASK-06 §8)

- **Figures.** The brief's Fəvvarələr and Heydər Əliyev figures appear in the tests exactly as given, with their
  totals.
- **Task 1.** The basis picker, URL basis and the comparison against the chosen basis are untouched. The section now
  names that basis.
- **Task 2.** "Qiymət yoxdur", "Daxili təminat" and the headline's "N sətirdə qiymət yoxdur" / "N sətir daxili təminat
  (ödənişsiz)" are unchanged. Internal supply is never amber or a warning.
- **Task 5.** The part names come from `causeLabels` (unchanged), and "məhsul" comes from `productNoun`. The sweep is
  green and extended.
- **Zero parts hidden; section absent when `decomposition` is null.** Both are unchanged (the existing tests are
  green).
- **`signedToneClass`** behaves as before (its test is untouched). Only its doc comment changed, as §4.1 asks. Neither
  of this task's two components imports it any more.
- **No database reached.** The Bash commands in the log include no `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or
  `tools/` invocation. HD-002's 94 rows are untouched.

## Changed tests

- `the colours › never calls a rise bad or a fall good — nothing here is green or red` was removed. It encoded the
  pre-9.1 rule, and spec §2.3/§10 require it to be replaced. The replacement is the six-test `the colours` block.
- `an explanation that cannot be complete › says the cause is not fully known…` was removed. Its fixture was exactly
  the contradiction the brief removes ("Qiymət yoxdur" = 0 with a generic warning). The replacements in `the warning`
  are stricter: they check both that the warning is absent and what it says when it is present.
- `says nothing of the sort when every price is known` moved blocks, and its assertion is unchanged.
- Every other change is `render(<CauseSummary …/>)` → `renderSummary(…)`, because `basis` and `windowPeriods` are now
  required props (default `PreviousMonth`). The assertions are unchanged.

No expected figure, class or business rule was loosened.

## Observations (not failures)

1. On the order page, "Niyə dəyişib?" now follows 9.1 while `DriverList` below it keeps the old colours and the
   coloured category chips. This is Planner assumption 1, accepted until Task 10.
2. The dashboard card's "Əsas səbəb" is still coloured by `signedToneClass`, so the same cause is red on the order page
   and green on the card. The dashboard also still shows `incompleteExplanationNote` on `!explanationIsComplete`
   (`AttentionSection.tsx:161–163`, `LocationRows.tsx:300–301`), which is the contradiction this task removed from the
   order page. Tasks 7 and 9 own these. The dashboard row already carries `unattributedAmount`, so Task 9 can apply the
   same condition without a backend change.
3. `unexplainedPartNote` takes an already formatted amount, not a number, to avoid a circular import between
   `terms.ts` and `format.ts`. The spec's signature was "e.g.", and the report explains the choice.
4. Nothing was checked by eye in a browser. The new elements use `flex-wrap`, and the phone layout belongs to Task 12.
5. The comment at `OrderDetailPage.tsx:212–216` still says "compare with last month". It is a comment only, and the
   report lists it.

## Scope

Nothing outside §3. Only the two components the task owns, their shared helpers and the prop wiring changed.

## Transition

- `PLAN.md`: 06 is accepted, and its commit is recorded as `see STATE.json`.
- Next: **Task 7 — Əsas səbəbin məhsul adı və payı ilə göstərilməsi**, next in the fixed order. Its brief
  `BRIEFS/TASK-07.md` exists, but `TASKS/TASK-07.md` does not, so the state is `PLANNING`.
- Task 7 is presentation work on the dashboard card (decisions 7.1, 7.1a). It changes no real data, so no §7 gate
  applies.
