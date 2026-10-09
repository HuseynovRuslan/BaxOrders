# Review — Task 3: Obyekt kataloqu və bütün ekranlarda vahid obyekt sayı

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted, not yet committed.

## What was inspected

- Branch `main`, HEAD `a45c5ff` (Task 1c). Nothing is committed for Task 3.
- `git status` and the full `git diff`. The untracked files were read directly:
  `LocationUniverse.cs`, `AzerbaijaniCollation.cs`, the whole `tools/BaxOrders.CatalogueMigration`, and the new tests.
- The raw Coder run log `LOGS/20260924-155113-cycle01-coder.jsonl`. It was read for the harness's own tool output, not the Coder's narrative.
- File modification times against the log timestamps.

## How builds and tests were verified

The Reviewer permission profile in `run-agent.ps1` grants no `dotnet build`, `dotnet test`, `npm` or catalogue-tool
commands. **The Reviewer did not re-run them itself.** Instead the harness's raw tool results in the Coder log were
checked, and they were matched against file modification times:

| Check | Raw log evidence |
|---|---|
| Backend unit tests | line 1576 — `Passed! Failed: 0, Passed: 702` |
| Backend integration tests | line 1576 — `Passed! Failed: 0, Passed: 581` (`dotnet test BaxOrders.slnx`, which compiles every project, including the API and the tool) |
| Frontend tests | line 1400 — `Tests 387 passed`, after the last frontend edit (line 1392) |
| Frontend build | line 1605 — `npm run build`, `built in 4.87s` |
| `--verify` after Part B | line 1597 — `All 23 checks passed`: 27 objects in B6 order; 23/1/2/1 and 24/0/2/1 = 27; Obyekt 27 · Sifarişi olan 26; A5 52/52; 38,517 MUST NOT CHANGE figures identical; the 94 HD-002 rows unchanged by hash; Qiymət təsnifatı counters unchanged |

The last application-file edit was at 17:08:50. The test run finished at 17:10:43 and `--verify` at 17:11. No
application file has changed since, so the results apply to the tree as it stands.

Two integration failures earlier in the run (line 1518) were tests that asserted ordinal name order. B6 replaces that
order, and the tests were updated to the Azerbaijani comparer. No expected value was loosened.

The earlier `--verify` at line 989 FAILED, as expected: it ran before Part B existed.

## Acceptance criteria

| Item | Result |
|---|---|
| 0.4 tool with five fixed commands, registered in `BaxOrders.slnx`, secrets read like DataTransfer | PASS |
| Order inspect → dry-run → backup → apply → verify | PASS — log lines 496 / 781 / 944 / 961 / 989 + 1597 |
| `--apply` refuses without today's backup and baseline; one transaction; table lock; plan re-read after the steps must be empty, else rollback | PASS (`Apply.cs`) |
| Keyed by code; each code must still carry the expected name; the next code is drawn from `LocationCodeNumbers` and checked | PASS |
| A1: the three objects to delete have no references | PASS (inspect + plan STOP rules) |
| A2: fresh backup immediately before apply | PASS — `baxorders_dev-task3-20260924-165210.dump`; operator confirmed the file exists |
| A4: delete 3, rename 6, insert Çadır `LOC-000047`, 15 aliases kept, 10 added, no collision | PASS |
| A4: alias "Çadır" | Not stored, because the domain refuses an alias equal to the name. The name resolves through `NameIndex`. This is correct per the Planner note |
| A5: the Sentyabr mapping is unchanged | PASS — 52/52 |
| B1: one universe function | PASS — `LocationUniverse.ForMonth/ForYear/AllTime` |
| B2: dashboard headline, "Sistemdə hələ sifarişi yoxdur", chips = 27, 27 rows | PASS |
| B3 Aylıq hesabat 27, B4 Obyektlər 27 · 26 | PASS |
| B5: other lists | PASS — approvals, import preview/readiness/confirmation and the location list are sorted by the Azerbaijani collation; reference search stays active-only on purpose, because a row can only map to an active object |
| B6: collation, exact order | PASS — unit test on the 27 names and `--verify` on real data |
| Tests the spec requires (universe ×3, partition on every basis, cross-screen consistency, idempotent + keyed by code, collation) | PASS — `ObjectUniverseTests`, `CatalogueMigrationTests`, `CataloguePlanTests`, `AzerbaijaniCollationTests`. Integration tests use dedicated test databases, never `baxorders_dev` |
| HD-002: 94 rows untouched | PASS |
| Safety: no orders, lines, prices, pricing modes or users changed | PASS — 167 requests and 3618 lines unchanged; the operator checked independently |

### The extra alias `Qafur Məmmədov parkı` → Qafur Məmmədov

Confirmed as within scope:

- Amendment 0.3 names this exact mapping as one to investigate.
- `docs/business-decisions.md` DB-04 records the pair as one location. The later "C" result means *no longer present
  in the workbook, historical only*. It does not reverse the identity decision.
- No other object has a colliding name or alias.

The mapping is therefore not ambiguous.

## Must be done before the Task 3 commit (not failures of the implementation)

1. **Delete `tools/BaxOrders.CatalogueMigration/Pending.cs`.** It is an empty leftover and must not be committed.
   The Coder's `rm` was refused, and the Reviewer may not touch `tools/`.
2. **Save the full Azerbaijani report.** The spec's report (sections 0–8) was written but refused on save. It exists
   verbatim only as the `Write` input to `AI_WORKFLOW/LAST_REPORT.md` at log line 1673. `LAST_REPORT.md` holds only
   the Coder's closing message.
3. **Restart the API.** PID 17052 was still running the pre-Task-3 code when the Coder finished.
4. Optional but recommended, because the Reviewer could not run them: `dotnet test BaxOrders.slnx`,
   `npm test` and `npm run build` in `frontend/bax-orders-web`.

## Notes for later tasks (no action in Task 3)

- `LocationUniverse` now scopes by period. An **inactive** object appears only in the months or year in which it
  ordered: the dashboard month, the report year, and all time on Obyektlər. This follows B1. Today every object is
  active, so no figure moves. If an object is ever deactivated, its disappearance from later months is intended.
- `LocationQueries.ListAsync(includeInactive: false)` now returns the all-time universe, not only active objects. The
  only frontend caller (`api/locations.ts`, unused) passes `includeInactive=true`, so nothing visible changes.
- `LocationOrderQueries` now sorts in memory, which is fine for a catalogue of dozens. Revisit it if the catalogue
  grows by orders of magnitude.
- `run-agent.ps1`: the Reviewer profile cannot run builds or tests. Consider granting it `dotnet build`,
  `dotnet test`, `npm run` and `npx vitest`, so future reviews can re-run the suite instead of reading the log.
