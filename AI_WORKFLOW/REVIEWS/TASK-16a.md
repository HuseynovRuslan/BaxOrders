# Review — Task 16a: İmport yoxlamasında qiymət təsnifatı: server və data

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All ten acceptance criteria of `TASKS/TASK-16a.md` §8 hold. I checked the diff, the new
files and the Coder's raw log myself rather than relying on the report. The only real-database change is the
schema-only migration, which went through `tools/BaxOrders.ImportPricingMigration` in the five fixed steps.
`--verify` found every one of 22,242 figures unchanged, and both HD-002 hashes equal. No human gate was crossed.
`COMMIT_MESSAGE.txt` is written. Next is Task 16b, and it goes to `PLANNING` because it has no specification yet.

## What was inspected

- Branch `main`, HEAD `5bcdc84` (Task 14). Nothing for 16a is committed.
- `git status --untracked-files=all` under `src/`, `tests/`, `tools/` and `frontend/`:
  - 19 tracked files are modified, +400 / −50.
  - 26 files are new: the controller, three `Imports/Pricing` files, the migration and its designer, nine tool files
    plus the csproj, four integration test files, four unit test files, and `api/importPricing.ts`.
  - Every file is one §5 names, or a test. The tool's `bin/` and `obj/` are git-ignored.
  - The other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1` and `resume-agent.ps1`, and
    the runner excludes all four.
- The full diff of every modified file, and all of `ImportLinePricing.cs`, `ImportPricingDtos.cs`,
  `ImportPricingService.cs`, `ImportPricingController.cs`, the migration, `Apply.cs`, `MigrationPlan.cs`,
  `MigrationsAsFound.cs`, `importPricing.ts`, and criteria 3–6 and 8 of `ImportPricingClassificationTests.cs`.
- `git diff --no-index` of the 13a designer against the 16a designer: +20 / −2. That is the attribute, the class name
  and the same 18 lines as the snapshot change, and nothing else.
- The raw Coder logs: `LOGS/20260925-115030-cycle01-coder.jsonl` (this run) and
  `LOGS/20260925-075958-cycle13-coder.jsonl` (the run the session limit cut off).

## How builds, tests and the tool runs were verified

As in earlier reviews, I did not build the code myself. I read the Coder's raw log instead.

- Every Edit/Write to code in this run is at log line 610 or earlier. Neither log has a Bash call to `psql`,
  `pg_restore`, `dotnet ef`, another migration tool, the sandbox, DataTransfer, or `git commit` / `push` / `reset` /
  `clean`. The interrupted run never ran the new tool.
- Line 596: 15 of 34 new integration tests failed. The fix was a test-only edit at line 610, and the rerun at line 616
  passed 17 of 17.
- Line 636: frontend **44 files / 883 tests** passed, the same as the baseline. Line 640: `vite build` passed after
  `tsc -b`.
- Line 876: full `dotnet test BaxOrders.slnx` with `--artifacts-path`, **1046 unit / 785 integration, 0 failed**
  (baseline 991 / 760). Line 527 also shows the 760 existing integration tests passing on the new code before any new
  test was added.
- Line 887: `--artifacts-path` build, **0 warnings, 0 errors**.
- The tool ran in order, with no code edit in between:
  1. `--inspect` (653);
  2. `--dry-run` (681), which ended "the one migration can be applied";
  3. `--backup` (892), `baxorders_dev-task16a-20260925-121335.dump`;
  4. `--apply` (897), "done: 20260925180000_AddImportRowPricingClassification";
  5. a second `--apply` (902), "Nothing to apply … Nothing was changed";
  6. `--verify` (907), "All 9 checks passed".

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Record: four columns, two checks, migration, `Down`, domain methods | **Pass.** The configuration, the snapshot and the designer agree. `Up` adds four columns and two checks and has no data statement. `Down` drops the checks, then the columns. `ClassifyPricing` refuses `Unresolved` or an undefined mode, an anonymous actor and a priced row. Giving the same mode again returns `false` and rewrites nothing. `ClearPricingClassification` nulls all four columns. `DbModelTests` passes within the 1046, and `ImportPricingMigrationTests` covers `Down` and `Up`. |
| 2 | Classify and list over the API | **Pass.** The controller is `CanManageImports` at class level. The GET lists included, unpriced rows only. Its three totals are computed before any filter or search, it gets three queries after the existence check, and it has a stable order ending in `RowNumber`, `Id`. The POST validates, then takes the actor from `CurrentActor.Of`, then opens a transaction, takes `IImportBatchLock`, calls `EnsureReviewable`, and checks ids, exclusion and price before any write. It saves once. `Unresolved` clears. Nothing classifies by supplier or source. The end-to-end tests cover Koordinator and Admin (200), Rəhbər (403 on both endpoints), anonymous (401) and every refusal status. The new GET is added to Task 14's Rəhbər 403 matrix, and every old assertion is kept. |
| 3 | Counts speak Task 2 | **Pass.** Readiness, confirmation preview (total and per group), result and staging preview all go through `ImportPricingCounts.Of` → `ImportLinePricing.StateOf` → `OrderLinePricing.Classify`. There is no hand-written SQL count. The supplier query and the `Math.Max` subtraction are gone from readiness. The fixture gives 7 / 5 / 2 / 2 everywhere, with the unusable price counted and the excluded row counted nowhere. |
| 4 | No classification by source | **Pass.** `ImportLinePricing` takes only `(decimal?, PricingMode?)`, and a reflection test pins that. With a supplier really marked `NotRequired` and matched, plus rows reading "Qala baza" and "Azpetrol baza", everything counts as Unclassified (10 / 10 / 0 / 0). After the import those lines are `Unresolved`, with no decision, and the supplier is still attached. |
| 5 | Counts add up after the import | **Pass.** Qiymət təsnifatı's three totals rise by exactly the preview's three figures, and the result's three counts are the same. With one group skipped, each rise is the preview minus that group's per-group count (4 / 1 / 1). Each classified line has exactly one decision: `Unresolved` → mode, by the classifier (Leyla or Rauf), with reason "Import #N yoxlamasında təsnif edilib". Each new order's `MissingPriceItemCount` equals its Unresolved plus PriceRequired lines. |
| 6 | Correctable afterwards | **Pass.** At the service level, the line is listed under `InternalFreeSupply` with the order filter. `SetAsync` moves it to `PriceRequired`, the totals move by one each way, and a second decision is appended. The same works over HTTP as the Koordinator. Qiymət təsnifatı's code is untouched. |
| 7 | Real database | **Pass.** See "How … verified" above. The report carries the inspect figures, the dry-run SQL (four `ADD`, two `ADD CONSTRAINT`, the history `INSERT`), the backup path, both applies and a verify that passes on every key. The capture was taken before the migration and reads no new column, and a test proves that capture is the same on the old and new schema. |
| 8 | Objects recognised as before | **Pass.** On an isolated database, "H.Ə.M Təmizlik", with its `LocationAlias`, stages matched to HEM with no `UnknownLocation` issue, and imports into HEM's September order. Matching code is untouched, and every existing import and alias test is in the green 785. |
| 9 | Qiymət təsnifatı unchanged | **Pass.** No file under `Orders/Pricing` changed. `LinePricingModeTests`, `PricingCountConsistencyTests` and the pricing tests in `RoleVisibilityEndToEndTests` pass unchanged. |
| 10 | Nothing else changed | **Pass.** The scope is as listed above. The frontend changes only types, all optional, plus the new `importPricing.ts`, which no component imports. The frontend count is unchanged. Existing DTO fields keep their positions, and new ones are appended. The only required-to-positional change is `ImportConfirmationPreview.Result`, which was `= null` and now comes before the new fields; the serialised shape is unchanged. |

## Deliberately changed existing tests

- `ProductMatchMigrationTests`, two tests, fixture only. The database is first migrated to 13a's `Target`. The tool
  then reads it through `MigrationsAsFound.Task13a`, a test-only context whose migration list stops at 13a's.
  Migrating the database down alone would not be enough: the code itself would still list 16a's migration as
  pending. Every assertion is as 13a wrote it, and the 13a tool's code is untouched. No brief line is behind this; it
  follows from the schema change, as the spec said.
- `RoleVisibilityEndToEndTests`: one path is appended to the 403 matrix, as §9 asks.
- No test asserted `PriceRequired` or `InternalFreeSupply` for an imported unpriced line, and none asserted the
  readiness subtraction, so none needed rewriting. No expectation was weakened.

## Scope and safety

- The real database got one migration. The four columns are NULL on every one of 6,291 rows. No business row was
  written, and HD-002's 94 decisions are equal by both hashes. The running API was not stopped.
- Supplier behaviour for lines built by hand is unchanged: `AddItem` without a mode still takes the supplier seed.
  The Suppliers page, `SupplierPriceRequirement` and `SupplierPricingService` are untouched.
- Spec assumptions 1–11 are implemented as written. None changes an owner decision.

## Notes, not blocking

- **For 16b: the staging preview's two count families cover different rows.** The group's existing `rowCount`,
  `pricedRows` and `unpricedRows` still count excluded rows. The new `missingPriceRows` and `internalSupplyRows`
  count included rows only. Criterion 3 requires the second; §4.5's "the same rows" does not hold. 16b must not
  subtract one family from the other.
- The list's page size caps at 200 through the service's own constant, the spec's explicit number, not
  `Paging.Of`'s 100. It sorts in SQL, with the database collation, which is how `PricingModeReviewService` sorts too.
- **Live figures differ from the brief's context.** Qiymət təsnifatı today reads Unresolved 0, PriceRequired 0,
  InternalFreeSupply 95, with 94 decisions. The brief's "94 Təsnif edilməyib" are the rows HD-002 records as
  reclassified. Nobody has looked into where the 95th InternalFreeSupply line came from. This is for the owner, HD-002
  and Task 15, and nothing was adjusted.
- No supplier is `NotRequired` on the real database, so before this task no real import line was classified by
  source either.
- The Suppliers dialog text (`SuppliersPage.tsx:258–261`) overstates what `NotRequired` does, now for imports too.
  It is recorded for the owner and Task 15, and was not changed (§10).
- Operator:
  - The migration is already in `baxorders_dev`. Restart the API on this commit to expose the endpoints and the new
    count meanings.
  - Until 16b ships, no screen can classify during review. Batch #6, still `NeedsReview`, would land its 88 unpriced
    rows as «Təsnif edilməyib», and they can then be classified on Qiymət təsnifatı.
  - Recreate or reset the approval sandbox before 16b's live check.
  - Rollback: `pg_restore` `C:\Users\HP\BaxOrders-backups\baxorders_dev-task16a-20260925-121335.dump`, then
    `git reset` the commit.
