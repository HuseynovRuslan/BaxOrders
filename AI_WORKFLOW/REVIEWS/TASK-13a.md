# Review — Task 13a: Məhsul uyğunluqları: təklif, təsdiq, rədd, geri alma (Task 13, part 1 of 3)

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** Every acceptance criterion of `TASKS/TASK-13a.md` §8 is met. The real database received
exactly one new, empty table through `tools/BaxOrders.ProductMatchMigration`, in the order the specification requires,
and `--verify` proved all 22,226 figures unchanged, HD-002 included. No test expectation was weakened, and no business
row was touched. `COMMIT_MESSAGE.txt` is written. Next is Task 13b, in `PLANNING`.

One thing for the owner that is not the Coder's (see "Commit contents" below): the runner will also commit
`resume-agent.ps1`.

**Note on how this review happened.** The first Reviewer session (`LOGS/20260925-073324-cycle02-reviewer.jsonl`)
wrote this file and `COMMIT_MESSAGE.txt`. It ended before it could change `STATE.json`, `PLAN.md` or
`CURRENT_TASK.md`, and its log has no final result record. A second Reviewer session (`LOGS/20260925-075354-cycle01-reviewer.jsonl`)
then checked the work again without relying on the first. It found the same tree: HEAD `d4a0ce4`, 25 tracked
files changed (+275 / −16) and the same untracked paths. It read the full tracked diff, `ProductMatchService`,
`ProductMatchSuggestions`, `DoNotMergePairs`, `ProductMatchDecision`, `SpellingKey`, the controller, the tool's
`Apply.cs`, `ProductMatchTests` and the test names of every other new file. It compared the list with
`docs/business-decisions.md` NM-01 … NM-17. It also went back to the Coder's raw log for the build, test and tool
results. Its profile was also refused `dotnet build` and `npm test`. The Coder logs show every `dotnet run` was one
of the five commands, run in order. They show no `psql`, no `dotnet ef`, no `pg_restore` and no git write.
`resume-agent.ps1` holds no credential. The second session agrees with every finding below. It then made the state
transition.

## What was inspected

- Branch `main`, HEAD `d4a0ce4` (Task 12). Nothing for 13a is committed.
- `git status`: 25 tracked files modified (+275 / −16). The new files are the entity, `SpellingKey`, the
  `Catalog/ProductMatches/` folder, the controller, the lock, the configuration, the hand-written migration and
  designer, the tool, the tests and `api/productMatches.ts`. Every one of them is in §5. The untracked non-task paths
  are `AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1` and `resume-agent.ps1`.
- The full diff of every tracked source, frontend and test file.
- The new code in full: `ProductMatchService.cs`, `ProductMatchSuggestions.cs`, `ProductMatchCatalog.cs`,
  `DoNotMergePairs.cs`, `ProductMatchesController.cs`, the tool's `Apply.cs` and `MigrationPlan.cs`. I also checked the
  test names of every new integration file and read `ProductAliasAuthorityTests` and the criterion-9 test.
- `docs/business-decisions.md` NM-01 … NM-17, compared with the encoded list.
- The raw Coder log `LOGS/20260925-073324-cycle01-coder.jsonl`: every command and every edit.

## How builds, tests and the tool runs were verified

This Reviewer session was refused `dotnet build` ("requires approval"), so, as for Tasks 3–12, I took the results
from the raw log. The only application edits in this session are two comment edits: `productMatches.ts` (log line
134) and `DoNotMergePairs.cs` (626).

| Check | Raw log evidence |
|---|---|
| Backend build | after edit 134: command 151, result 154 — `Build succeeded`, `0 Warning(s)`, `0 Error(s)`. After edit 626: command 632, result 635, the same |
| Backend tests | commands 156/165, result 460: `Passed: 936` unit, `Passed: 730` integration, 0 failed, 0 skipped (baseline 826 / 706). After edit 626: unit again at 640, 936/936 |
| Frontend tests | command 159, result 163: `Test Files 41 passed (41)`, `Tests 806 passed (806)` (baseline 40 / 797) |
| Frontend build | command 169, result 172: `built in 2.13s` |
| `--inspect` | command 364, result 371: the Sabun pair `YES — suggested with the label «lavanda ətirli»`; `difference +23,852.70` |
| `--dry-run` | command 452, result 462: `Dry run: the one migration can be applied` |
| `--backup` | command 487, result 493: `Backup written: C:\Users\HP\BaxOrders-backups\baxorders_dev-task13a-20260925-073953.dump` |
| `--apply` | command 498, result 503: `done: 20260925120000_AddProductMatchDecisions` |
| `--apply` again | command 505, result 510: `Nothing to apply … Nothing was changed` |
| `--verify` | command 512, result 517: `Every figure is identical`, `All 7 checks passed` |

The integration suite was not re-run after the `DoNotMergePairs.cs` edit. That edit is comment-only, so this is
acceptable. The log has no `psql`, no `dotnet ef`, no other tool under `tools/`, no API stop or start, and no
`git commit/reset/stash/checkout/clean/push/rm`. The five commands ran in the specified order. The full test run
happened between `--dry-run` and `--backup`, which the specification allows.

## Acceptance criteria (TASK-13a §8)

| # | Criterion | Result |
|---|---|---|
| 1 | The record | PASS. The `--dry-run` SQL (report §6.2) is §4.2 column for column: strings for the enums, four `RESTRICT` FKs, the five checks, the four partial unique indexes on `"UndoneAtUtc" IS NULL`, and plain indexes on both targets. `DbModelTests` passes inside the 936. `ProductMatchMigrationTests.Down_drops_the_table_and_the_tool_puts_it_back_once` covers `Down` |
| 2 | Suggestions, by the rule | PASS. The engine is pure. `LooseIdentity` loosens only the name, the specification and the model code through `SpellingKey`. Units and the descriptor are exact, and `DifferenceOf` drops pairs normalization already unifies (DB-03). The prefix rule needs a word-boundary character and a letter or digit after it. Only variants with lines in the highest version take part. SameItem suppression is unordered, Variant suppression is directional, and `DoNotMergePairs.Forbids` is applied in both kinds. `ProductMatchTests.The_system_suggests_the_briefs_pair_and_the_spelling_pairs_and_nothing_else` plus 30 unit tests |
| 3 | The real data | PASS. `--inspect` output is in the report in full: 1 SameItem, 216 Variant, the Sabun pair suggested with label «lavanda ətirli», and the two Heydər Əliyev lines behind it (60 × 12.50 = 750.00 each) |
| 4 | Nothing applies itself | PASS. `ProductMatchCatalog.ReadAsync` and the suggestions only read. `Reading_suggestions_writes_nothing`. The only `ProductMatchDecisions.Add` is in `ProductMatchService.DecideAsync` |
| 5 | Approve | PASS. One row. The products and variants are read `AsNoTracking`, so nothing else can be saved. The domain rejects different order units. The chain, second-base and variant-of-a-variant checks run against the live approvals, and `EnsureSuggested` runs against suggestions recomputed under the lock. Reverse-direction SameItem and a custom label are tested |
| 6 | Who | PASS. `ProductMatchAuthority.IsHeldBy(role) => role is Admin`. The policy is built from it the way `CanDecideOrders` is. The service checks it first, before reading. `/auth/me` carries the flag. The end-to-end test covers Rəhbər / Koordinator → 403, anonymous → 401 and Admin → 200 over real cookies |
| 7 | Undo | PASS. `Undo` fills the actor and time under the lock, and a second undo → 409. Both undo tests show the pair coming back |
| 8 | Alternative names | PASS. `EnsureMayNameProducts` runs before the transaction in `ExecuteAsync`, the single path both map-existing and create-new use. Bulk refuses the whole set in preview and apply. The only two `AddAlias` calls in `src/` are behind it. Six integration tests cover single, create-new, promotion and bulk, and show other kinds unchanged for the Koordinator. The three dialogs hide the checkbox and force `BatchOnly`, covered by 9 vitest cases |
| 9 | Separate until approved | PASS. No analytics read path changed; the diff has none. `The_order_page_and_the_dashboard_do_not_move_when_a_match_is_approved_or_undone` compares before, after approval and after undo, and pins 750.00 / 750.00 / 0.00 |
| 10 | The real database | PASS. See the table above. Backup path, SQL, one migration, zero rows, an idempotent second apply, 7/7 checks, 22,226 of 22,226 identical, HD-002 94 rows with both hashes unchanged, and Heydər Əliyev September «Keçən ay» 23,852.70 → 23,852.70 |
| 11 | Nothing else changed | PASS. Every changed file is one §5 names. Suites and builds are green |

## Deviations from the letter of the specification, judged

- **422 through `DomainException` rather than `ValidationException`.** In this repository `GlobalExceptionHandler`
  maps `ValidationException` to 400. The Coder kept the status the spec asks for (422) through the exception type that
  already produces it, and did not touch the handler. Accepted: the observable contract is the spec's.
- **"Shortest base" read as "shortest base still open to a decision".** Read literally, rejecting a short wrong base
  such as "Sabun" would stop the right longer base from ever being suggested. The only-current-suggestion rule would
  then make it impossible to approve at all. The reading changes only the order in which bases are offered, not the
  likeness rule, and the admin still decides every pair. The report discloses it. Accepted.
- **`Reject(kind, …)` split into `RejectSameItem` / `RejectVariant`.** The specification allows renaming.

## Not blocking — for 13b's Planner

- **NM-03 and NM-05 on the real data.** The engine suggests «Rain bird sprinkler başlığı» → «Rain bird sprinkler».
  NM-03 says "Rain Bird `başlıq` ≠ `sprink`", but it does not write out the full names, so the Coder did not encode it
  without evidence (§7 "likeness is not evidence"). NM-05 is encoded as written ("Şampun qab üçün" / "D3"), but the
  catalogue's D3 is «Şampun qab üçün D3». If that suggestion is rejected, the next base offered is «Şampun qab üçün».
  Both are suggestions, not merges, and only an admin can act on them. 13b's screen should make rejecting easy. If the
  owner confirms the products, each is one line in `DoNotMergePairs.All`.
- **FAB (NM-16).** «FAB mata», «FAB Boya Tünd sarı» and two more are suggested as variants of «FAB». A variant link is
  not a merge (13.1). 13b's screen should still say so plainly to the admin.
- The report's §9 notes stand as written: 216 Variant suggestions, many of them accessories an admin will reject,
  with up to 26 under one base. A product («Dəmir ventil yarıdövr») appears in both a SameItem and a Variant pair. No
  real «15 W» / «15W» pair exists, so acceptance 5 of 13b needs a fixture.

## Tests changed deliberately

- `ProductResolutionTests`: the two tests where a Koordinator saved a product `GlobalAlias` now run as the Admin, with
  expectations unchanged. The brief line behind this is 13.2: "Uyğunluqları və alternativ adları yalnız admin və ya
  data idarəçisi təsdiqləyir."
- `ImportWorkbooks`: the services take a current user, defaulting to the Koordinator. Every existing non-product
  `GlobalAlias` test therefore still runs as the Koordinator and still passes, which proves "other kinds unchanged".
- Five frontend fixtures gained `canDecideProductMatches` (true only for Admin).

No assertion was removed or loosened.

## Commit contents — for the owner

`run-agent.ps1` stages with `git add -A -- . ':(exclude)AI_WORKFLOW' ':(exclude)run-agent.ps1'
':(exclude)monitor-agent.ps1'`. `resume-agent.ps1` is new since Task 12, untracked and not excluded, so **the Task 13a
commit will include it.** It is the operator's session-limit wrapper, 186 lines with no secrets, and is workflow
infrastructure by its own account: its `git status` filter treats it that way. It is not the Coder's work and the Coder
cannot remove it, so it does not fail the task. To keep it out of later commits, add
`':(exclude)resume-agent.ps1'` to line 348 of `run-agent.ps1`. To take it out of this one, `git rm --cached
resume-agent.ps1` and amend, or leave it. The commit message says it is there.

## Operator notes

- The migration is already in `baxorders_dev`. Restarting the API on the new commit applies nothing and exposes the
  endpoints.
- Rollback, if wanted: `pg_restore` `C:\Users\HP\BaxOrders-backups\baxorders_dev-task13a-20260925-073953.dump`,
  then `git reset` the commit.
- Visible change: the Koordinator no longer sees "Gələcək importlarda da bu uyğunluğu yadda saxla" for a product in
  the three import dialogs. Nothing changes for the Rəhbər.
