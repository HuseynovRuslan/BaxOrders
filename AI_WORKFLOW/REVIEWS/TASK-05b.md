# Review — Task 05b: Texniki məlumatların rəhbər görünüşündən çıxarılması

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. With 05a and 05b both accepted,
**Task 5 is complete**. Next: Task 6, which has no specification yet, so the state is `PLANNING`.

## What was inspected

- Branch `main`, HEAD `eebe8d5` (Task 05a). Nothing for 05b is committed yet.
- `git status` and the full `git diff` of the 34 tracked files (+773 / −215), plus the two untracked test files
  `components/analytics/labels.test.ts` and `pages/LocationDetailPage.test.tsx`.
- Every change is under `frontend/bax-orders-web/src/`. No file under `src/` (backend), `tests/`, `tools/`,
  `package*.json` or any migration is touched. The only other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1`
  and `monitor-agent.ps1`, which the runner excludes.
- A search of non-test `src/` files for `versiya`, `locationCode`, `productCode`, `modelCode`, `Sətir sayı`,
  `formatVariantLine` and `formatItemSpecification`. Every hit that is still rendered falls into one of four groups:
  - API types;
  - the kept places: `TrendModal`'s `<details>` and `ItemSourceDrawer`;
  - Coordinator/Admin-only correction texts: `createRevisionLabel`, `createNextRevisionLabel`,
    `createRevisionExplanation`, `removeLineExplanation`, the `CreateRevisionDialog` subtitle and body, and
    `EditLineDialog`;
  - administrator screens: `ProductCategoryRows`, `AssignCategoryDialog`, `PricingModeReviewPage`, `SuppliersPage`
    and the import screens.

  None of these is on a Rəhbər's screen as §3 defines it.
- A search of non-test `src/` files for rendered line counts. Only the following remain: Task 2's sentences, the
  order page's pagination "Səhifə N / M · K sətir", TrendModal's folded "Sətir" column, and the admin/import screens.
  §4.4 keeps all of these.
- The raw Coder log `LOGS/20260924-211438-cycle05-coder.jsonl`, for tool results and for every Edit, Write and Bash
  command.

## How builds and tests were verified

This Reviewer profile is not allowed to run `npm` or `dotnet`. The harness asked for approval for
`npm run --prefix frontend/bax-orders-web test`, and I did not get it. As with Tasks 3, 04a, 04b and 05a, I checked
the raw tool results in the Coder log:

| Check | Raw log evidence |
|---|---|
| Frontend tests | line 820: `Test Files 36 passed`, `Tests 521 passed` (05a: 34 / 491) |
| Frontend build (`tsc -b && vite build`) | line 820, same command (816): `✓ built in` |
| Backend build | line 824: `Build succeeded`, `0 Warning(s)`, `0 Error(s)` (`--artifacts-path`) |
| Backend tests | line 832: `Passed! - Failed: 0, Passed: 797` and `Passed! - Failed: 0, Passed: 609`, unchanged from 05a |

The Coder's last edit to an application or test file is at log line 802. It restores `LocationRows.tsx` after the
second mutation check, and the file's mtime is 22:20:43 local. The final full `npm test` + `npm run build` (816) was
issued at 18:20:54 UTC, which is 22:20:54 local, after that edit. Every later Write or Edit targets `LAST_REPORT.md`
or `STATE.json`. The only file-writing Bash command, the `sed -i` on `oldTerms.test.tsx` at line 663, comes before
the final run. `find -newermt "2026-09-24 22:20:50"` over `frontend/bax-orders-web/src`, `src`, `tests` and `tools`
returns nothing. So the green results apply to the tree as it stands.

The failing runs in the log (458, 774, 791, 801) are intermediate runs and the two deliberate mutation checks the
report describes (§6.2). Each was followed by a restore and a green full run.

## Acceptance criteria (TASK-05b §9)

| # | Criterion | Result |
|---|---|---|
| 1 | No `LOC-…` / `PRD-…` on the dashboard (table and cards), objects list, object page, monthly report, inbox (table and cards), order page, comparison page | PASS. The `locationCode`/`code` line is removed in `LocationRows` (both layouts), `LocationsPage`, `ApprovalRows` (table and card), `MonthlyReportTable` (tooltip and phone list) and the `LocationDetailPage` header, which now says `Deaktiv` or nothing. `productCode` is removed from `OrderDetailPage` and `EditHistory`. The sweep's fixtures carry `LOC-000043`/`PRD-000110`, and the new `object code`/`product code` patterns catch them. The mutation check shows the dashboard sweep turning red when `row.locationCode` comes back |
| 2 | No model code or bare specification under a product name; unit or descriptor specs kept; colliding rows told apart, and only those | PASS. `describeSpecification` shows the value only with a unit word or a descriptor. `describeVariant` never includes `modelCode`. `distinguishingDetails`/`distinguishVariants` are implemented once, keyed on name plus `describeVariant`, and are used by `DriverList` (shown rows), `ComparisonRows` (both tables) and the order page (current page). The `TrendModal` subtitle uses `describeVariant`. `labels.test.ts` covers every case in §10, plus neighbours and a different unit. `OrderDecisionPage.test` covers the two Columbus lines "80 sm · 20078331" / "80 sm · 20078332" and "—" for the unique one |
| 3 | No "versiya" (any case) outside the folded section and the drawer; business words used | PASS. Every row of the §4.3 table is implemented as specified. The words live once in `terms.ts` (`correctedOrderLabel`, `previousOrderLinkLabel`, `latestOrderLinkLabel`, `supersededOrderNote`). The sweep adds `/versiya/i` and skips only a `<details>` whose summary is exactly "Mənbə və versiya məlumatı" and a dialog whose heading is exactly "Mənbə". Two detector tests prove it skips those two places and nothing else. New sweep screens: the order page of a correction, with the panel, both history tabs and all three links; the objects list; and the inbox with a corrected-order row, its own-contribution note and the filter option |
| 4 | "Sətir sayı" nowhere; no line-count column or fact on the object page; none in the decision dialog | PASS. Removed from the object page column and its "Sətirlər" fact, the `WorkflowDialog` fact and the `TrendChart` tooltip. The unused `sortLabels` map is deleted. `isSort` now checks `sortOrder`, which holds the same ten keys, so accepted sorts are unchanged. The comparison page's period option "(40 sətir)" is also dropped, under assumption 5 |
| 5 | Two orders of one month distinguishable on the object page | PASS. `supersededRequests` marks every row below the month's highest `version`. `LocationDetailPage.test` covers the note on the older row, no note on the newest or on a single-order month, and independence from row order |
| 6 | Admin screens keep product codes; drawer keeps model code and versions | PASS. `ProductCategoryRows`, `AssignCategoryDialog`, `PricingModeReviewPage` and `ItemSourceDrawer` are not in the diff, and neither are their tests. `OrderDecisionPage.test` asserts that the drawer still shows "Sətrin keçdiyi versiyalar", "Versiya 1" and the model code |
| 7 | All suites and both builds green; 05a's sweep passes, extended | PASS. See above. The sweep is extended in the same `oldTerms` list; there is no second sweep |

## Invariants (TASK-05b §8)

- **05a intact.** `terminology/units.ts` is not in the diff. `terms.ts` only gains four constants. `oldTerms` only
  gains entries. The detector's single change is to skip the two kept sections. That is narrower than removing
  entries, and a test proves it.
- **§5.7 words.** `pricing/labels.ts`, `coverage/labels.ts` and `environment/labels.ts` are not in the diff. The
  04a words "Düzəliş tələb et", the submission words and the 4.1 sentence are untouched. The inbox badge "Düzəliş"
  becomes "Düzəldilmiş sifariş". That word is not on the §5.7 list, and §4.3 asks for the change.
- **No figure changed.** No computation, sort key, filter predicate or search parameter changed. Only placeholders
  and the matching `sr-only` labels changed, and the search inputs send the same values. No colour class changed.
  The backend counts are unchanged.
- **04a structure.** In the panel and dialog, only the "Sətir sayı" fact goes and the returned note is reworded.
  `RevisionPanel` loses its "Versiya N · status" line, as §4.3 requires, and its links move from `ml-auto` to the
  left. That is a layout side effect. The report flags it for Task 11/12.
- **Coordinator/Admin-only texts** keep "versiya", as §3 requires. `OrderRevisionPage.test` asserts that the
  Coordinator's "Düzəliş versiyası yarat" button keeps its label. The report lists them all for Task 14.
- **No database reached.** The Bash commands in the log include no `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or
  `tools/` invocation. HD-002's 94 rows are untouched.

## Changed tests

I read every changed assertion. Each one replaces an old code, "Versiya" or "Sətir sayı" text with §4.3/§4.4/§4.6
wording, and most also add a negative check (`not.toHaveTextContent(/versiya/i)`, no `V1`, no `PRD-`). The
`ApprovalInboxPage` absence check was moved to the new label, so it does not pass vacuously. No expected number,
class or business rule changed, and no expectation was loosened.

## Observations (not failures)

1. `hiddenDetail` returns null when two colliding rows have no model code and no bare specification value. Such rows
   still read alike, but there is nothing hidden to give back, so this follows §4.2 literally. The report notes a
   related edge case: identical model codes with different bare values. Neither case has been seen in real data.
   Task 13 (variants) is the natural place to address either one.
2. The object page's "Əvvəlki sifariş — sonradan yenilənib" is page-local, which §4.5 accepts as an edge case. The
   report suggests that Task 11 take it from the API.
3. `formatVariantLine` and `formatItemSpecification` no longer have callers on the Rəhbər's screens. §4.2 says to
   keep `formatVariantLine`, and `EditLineDialog` still uses `formatItemSpecification`.
4. Nothing was checked by eye in a browser, including the `RevisionPanel` alignment and the phone cards. That belongs
   to Task 11/12.
5. `ComparisonRows`' services "Qiymət qismən məlumdur · N sətir" is a missing-price count, not a line count, so it
   was correctly left alone. The report suggests aligning it with Task 2's sentence in Task 6 or 10.

## Scope

Nothing outside §3. The admin screens, the drawer, TrendModal's folded section, the correction dialogs and the
menus are untouched.

## Transition

- `PLAN.md`: 05b is accepted, and its commit is recorded as `see STATE.json`. Task 5 is complete.
- Next: **Task 6 — "Niyə dəyişib?" bölməsi**, next in the fixed order `04 → 05 → 06 → …`. Its brief
  `BRIEFS/TASK-06.md` exists, but `TASKS/TASK-06.md` does not, so the state is `PLANNING`.
- Task 6 is presentation/analysis work on the Rəhbər's screens. It changes no real data, so no §7 gate applies.
