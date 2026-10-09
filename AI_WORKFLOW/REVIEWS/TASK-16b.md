# Review — Task 16b: İmport ekranları Task 2-nin sözləri ilə

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All seven acceptance criteria of `TASKS/TASK-16b.md` §8 hold. I read the whole diff,
every new component, and the new tests, and checked the Coder's raw log instead of trusting the report. The change is
frontend only. No backend, schema, tool or data file changed, and no database was touched. No human gate was crossed.
`COMMIT_MESSAGE.txt` is written. With 16a and 16b both accepted, Task 16 is complete. Next is Task 15, the final audit,
which goes to `PLANNING` because it has no specification yet.

## What was inspected

- Branch `main`, HEAD `7cc1ccd`. Nothing for 16b is committed.
- `git status --short`:
  - 12 tracked files are modified, +426 / −61, all under `frontend/bax-orders-web/src/`.
  - 10 files are new: `PricingClassificationTab.tsx`, seven test files, and `src/test/importFixtures.ts`, which is a
    test-only fixture that no application file imports.
  - Every file is one §5 names, a test, or the fixture. `SuppliersPage.tsx`, which §5 made optional, is untouched.
    `PricingModeReviewPage.test.tsx` is untouched.
  - The other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1` and `resume-agent.ps1`, which
    the runner excludes.
- The full diff of all 12 modified files, and all of `PricingClassificationTab.tsx`, `PricingClassificationTab.test.tsx`,
  `ConfirmationDialog.test.tsx` and `importScreens.test.tsx`. I also read the test names and key assertions of
  `ReadinessPanel.test.tsx`, `ImportGroupsTable.test.tsx` and `ImportsPage.test.tsx`.
- The raw Coder log `LOGS/20260925-125512-cycle02-coder.jsonl`.

## How builds and tests were verified

The sandbox for this review would not let me run `npm`, `npx`, `node` or `dotnet`. So, as in earlier reviews, I read the
Coder's raw log, and I checked that the tree it tested is the tree now on disk.

- The last Edit or Write to code is at log line 641, at 09:18:17Z. The newest modified file on disk has the mtime
  13:18:17 local (UTC+4), which is the same moment. Nothing changed after the runs below.
- Line 57, the baseline at HEAD before any change: **44 files / 884 tests**, all green.
- Line 651, the full suite started at 09:18:20Z, after the last edit: **51 files / 957 tests**, all green.
- Line 655: `npm run build`, which is `tsc -b && vite build`, green.
- Line 664: a plain `dotnet build` failed with MSB3026 because the running API locks `src/BaxOrders.Api/bin`. As §11
  allows, the Coder rebuilt with `--artifacts-path`. Line 674: **0 warnings, 0 errors**.
- Line 712: `dotnet test` with `--artifacts-path` passed **1046 unit / 785 integration, 0 failed**. That is the same
  count as 16a.
- The log has no Bash call to `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, any `tools/` project, the sandbox,
  DataTransfer, or `git commit`, `push`, `reset` or `clean`. The API was not stopped.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | The review says «N sətirdə qiymət yoxdur» | **Pass.** `ReadinessPanel`'s new price strip shows `missingPriceCount(7)` in amber. It shows the split «Təsnif edilməyib 5 · Alış qiyməti tələb olunur 2 · Daxili təminat 2», with every part at 0 shown the same way, and Daxili təminat always in `internalToneClass`. The strip is absent when all three counts are 0. The «Bloklamayanlar» row now reads `missingPriceShortLabel` with the same number. Tested, including the class assertions. |
| 2 | Task 2's words on every import screen | **Pass.** All the price words come from `pricing/labels`. The groups table replaces «Qiymətli / qiymətsiz» with «Qiymət yoxdur» = `missingPriceRows` (amber, «—» at 0) and «Daxili təminat» = `internalSupplyRows` (slate). It never shows `pricedRows` or `unpricedRows` and never subtracts them. A test uses a group whose `unpricedRows` includes an excluded row. In the dialog, «Qiyməti olmayan» and «Qiymətsiz» are gone. The row detail shows «—». The only literal price sentences left are C2 and P2, which the spec replaces as whole sentences. |
| 3 | Classify in the review | **Pass.** The «Qiymət təsnifatı» tab comes after «Sətir düzəlişləri». Its badge is `readiness.warnings.unclassifiedPrice`, delivered through `onLoaded` with no extra request, and a test asserts `fetchReadiness` is called once. It has the three totals, four filters mapping to the right `mode`, search on Enter, and paging at 50. A dialog names the selected rows. The exact ids are sent for each of the three modes, and «Təsnifatı geri al» sends `Unresolved`. On success the tab shows the notice, reloads, clears the selection and calls `onChanged({ preview })`. On a 422 it shows the server's message in the dialog, and nothing else happens. A test shows the only buttons are the four filters, plus the three states once a row is ticked. There is no select-all, no combobox, no source control and no pre-check. The «Qala baza» row appears «Təsnif edilməyib» and unchecked. When the batch is imported, there are no checkboxes or buttons, and T6 appears with the link. |
| 4 | Advance warning, and the counts add up | **Pass.** The readiness strip shows R3 and a link to `/pricing-modes`. The dialog uses 16a's worked example: 7 / 5 / 2 and «5 sətir …». With group B skipped it shows 5 / 4 / 1 and «4 sətir …», computed exactly as `skippedRows` already is. The link has `target="_blank"` and `rel="noopener noreferrer"`, with C4 beside it. `confirmImport`'s body is asserted unchanged, and no price figure is sent. |
| 5 | After the import | **Pass.** The result shows «Qiymət yoxdur 5», «Təsnif edilməyib 4», «Daxili təminat 1», P2, P3 «4 sətir … düşdü.», P4 and the in-app link. P3 is dropped when nothing is unclassified. The link is dropped when no unpriced line was written. With `alreadyImported`, no price fact or price sentence is shown. |
| 6 | The same words | **Pass.** `findOldPriceTerms` finds nothing on the review, the tab, the dialog, the result or the row detail (`importScreens.test.tsx`). The tab's chips and Qiymət təsnifatı's chips are compared from both rendered screens against `pricingModeLabels`. `oldPriceTerms` selects its five names from `oldTerms`, and a test fails if any of them is renamed there. |
| 7 | Nothing else moved | **Pass.** `modeLabels` and `modeToneClass` moved to `pricing/labels` with identical strings and classes, and `labels.test.ts` asserts the literals. `PricingModeReviewPage.test.tsx` is unchanged and green. In `oldTerms.test.tsx`, the import line is widened and four tests are appended. No existing assertion changed. Only frontend files changed, both suites are green, and the backend count is unchanged. |

## Deliberately changed existing tests

- `terminology/oldTerms.test.tsx`: the import line is widened, and four tests are appended to "the sweep itself", as
  §9 requires (brief acceptance 5). No existing assertion was changed or weakened.
- No other existing test file changed.

## Deviations from the specification, judged

- **`ReadinessPanel` receives `batchStatus`.** Once the batch is no longer `NeedsReview` or `ReadyToImport`, the panel
  drops R3 and «Təsnif et» and keeps R1, R2 and the link. The specification's §4.3 shows R3 whenever
  `unclassifiedPrice > 0`. However, after a confirmation the panel keeps the readiness it read before the import, so
  R3 would still say "… kimi düşəcək" about rows that have already landed. That contradicts the brief's own sentence,
  and it contradicts §4.2's read-only rule for the tab. The change adds no request, touches no count, and is tested.
  **Accepted.**
- On a replay (`alreadyImported`), the P2 note is replaced by «Bu idxal artıq sifarişlərə çevrilib.». §4.6 asks for
  exactly that kind of wording. Accepted.
- `ImportGroupsTable` has two columns instead of one. That is what §4.4 asks.

## Scope and safety

- No file changed under `src/BaxOrders.*`, `tests/BaxOrders.*`, `tools/` or `docs/`. No database was touched. No real
  row was classified, and HD-002's 94 lines are untouched.
- The frontend's only new requests are 16a's two pricing endpoints. The confirmation request is unchanged.
- Nothing in matching, parsing, corrections, exclusions or blockers changed. The pricing strip is outside the blocker
  sections, and a test proves `canImport` and «Qalan maneələr» are unaffected.
- Task 14's routes and role rules are unchanged. Qiymət təsnifatı behaves exactly as before.

## Notes, not blocking

- **For Task 15, non-price technical words on the import screens.** These are listed in the report's §5 and were
  left unchanged on purpose (§10):
  - `ImportsPage`'s header "Bu mərhələdə sorğu yaradılmır", which is no longer true;
  - «staging»;
  - "Sifariş siyahıları növbəti mərhələdə əlavə olunacaq", which is no longer true;
  - `ImportGroupsTable`'s "Bu mərhələdə sorğu yaradılmır" and «Mövcud sorğu»;
  - «Versiya»;
  - «Ö/v»;
  - `vərəq:sətir`;
  - a stale JSDoc in `ReadinessPanel`.
- **Wording differs between two places.** Qiymət təsnifatı's own buttons say «Şirkətdaxili təminat kimi qeyd et»
  and a bare «Alış qiyməti tələb olunur». The import tab's buttons follow the spec's T3: «Ödənişsiz daxili təminat
  kimi qeyd et» and «Alış qiyməti tələb olunur kimi qeyd et». The state words and chips are the same on both. Only the
  verb phrase on the buttons differs. This is for Task 15.
- `ReadinessPanel`'s `useEffect` carries an `eslint-disable` for `onLoaded`, with a reason. It is harmless.
- Operator:
  - The API must already run 16a's commit (`4467f8f`) or later, because the types now require 16a's fields. No
    migration is needed.
  - The owner's live check (spec §12) runs in the approval sandbox, after `sandbox.ps1 -Reset`. The Coder did not
    run it.
  - Batch #6 (`NeedsReview`, 88 unpriced included rows) can now be classified in review before it is confirmed. That
    is the owner's work.
  - Rollback: `git reset` the commit. There is no data to restore.
