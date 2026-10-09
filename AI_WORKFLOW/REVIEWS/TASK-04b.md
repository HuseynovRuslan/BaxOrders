# Review — Task 04b: Real datadan ayrı sınaq mühiti və axının başdan sona sınağı

Role: REVIEWER
Date: 2026-09-24
Verdict: **PASS**. Accepted. The runner commits it using `COMMIT_MESSAGE.txt`. With 04b accepted, Task 04 is
complete.

## What was inspected

- Branch `main`, HEAD `0f638ce` (Task 04a). Nothing for 04b is committed yet.
- `git status` and the full `git diff` of the 11 tracked files. I read every untracked file directly: the 13 files in
  `tools/BaxOrders.ApprovalSandbox/`, `SandboxDatabase.cs`, `IdentitySetup.cs`, `EnvironmentController.cs`,
  `appsettings.Sandbox.json`, the six new backend test files, and the six new frontend files.
- Changes are only under `src/`, `frontend/`, `tests/`, `tools/BaxOrders.ApprovalSandbox/` and `BaxOrders.slnx`, as
  §9 allows. There is no EF migration, nothing under `Migrations/`, and no change to `package-lock.json` or to any
  other tool. The only other untracked paths are `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`, which the
  runner excludes.
- No existing test was changed. The only tracked test changes are the two `ProjectReference` lines in the test
  `.csproj` files.
- I checked the raw Coder log `LOGS/20260924-195739-cycle04-coder.jsonl` for the harness's own tool output and for
  every Edit and Write the Coder made.

## How builds and tests were verified

This Reviewer profile is not allowed to run `dotnet build`, `dotnet test` or `npm`; the harness asked for approval
and I did not get it. As with Task 3 and 04a, I did not re-run them myself. I checked the raw tool results in the Coder
log instead:

| Check | Raw log evidence |
|---|---|
| Backend build | lines 908 and 1113: `Build succeeded. 0 Warning(s) 0 Error(s)` (`--artifacts-path`) |
| Unit | line 908: `Passed! Failed: 0, Passed: 797` (04a: 728, +69) |
| Integration | line 1063: `Passed! Failed: 0, Passed: 609, Skipped: 0` (04a: 598, +11) |
| Frontend tests | lines 925/930: `Test Files 29 passed (29)`, `Tests 448 passed (448)` (04a: 27 / 440) |
| Frontend build | line 930: `built in 2.07s` |

The Coder's last edit to an application or test file was at log line 893 (`environment.test.ts`). The later Edit at
line 1058 (`sandbox.ps1`) was refused, as the report says, and the file is not compiled anyway. Every result above
comes later in the log. `find -newer` on the Coder log finds no source, test or tool file changed after the session.
So the results apply to the tree as it stands.

The +69 / +11 / +8 deltas match what I counted in the new test files: `SandboxGuardTests` 46 and
`SandboxDatabaseTests` 23. Integration: 2 end-to-end, 4 tool and 5 environment-guard tests. Frontend: 6 banner and
2 client tests.

The one earlier failure (line 797, 6 compile errors) was CS0182, from `InlineData` with a single array argument. The
test was rewritten to take a string. No expected value was loosened.

## Acceptance criteria (TASK-04b §7)

| # | Criterion | Result |
|---|---|---|
| 1 | Tool creates, resets and drops a separate database built from the migrations, with synthetic data only. Its guards refuse every other name, including the real one, before connecting | PASS — `SandboxLifecycle` runs `SandboxServer.For` (guards 1–3) and `SandboxPassword.Require` before any connection. The name regex `^baxorders_sandbox(_[a-z0-9]+)*$`, max 63 characters, also makes identifier injection impossible. Guard 2 refuses the API's own database name, case-insensitively. The maintenance connection issues only the two statements `SandboxServer` builds. Unit tests point create, reset and drop at an unresolvable host and get `SandboxRefusedException`, not a connection error. `Create_builds_the_sandbox_from_the_migrations…` asserts that no migration is pending, and that every ordered-at object is `SINAQ-0x` and every product "Sınaq məhsulu…". Guard 4 (refuse a database that holds orders) is proven in integration |
| 2 | After `--create`, the Rəhbər sees the test order in "Təsdiq gözləyənlər" | PASS — `ApprovalSandboxToolTests` (inbox query as `sinaq.rehber`) and step 3 of the E2E test over HTTP |
| 3 | The whole flow over HTTP with the Rəhbər role: no correction without a reason; the resend is the second submission and carries the reason; after approval, who and when; the admin is refused | PASS — `The_brief_flow_runs_from_start_to_finish…` covers all 13 steps of §4.5, with three real cookie and antiforgery sessions against the real API in environment `Sandbox`. `""` and `"   "` get 422 and no event is written. The admin gets 403 on approve and on return, and nothing moves. `SubmissionNumber` is 2, and `PreviousReturn` equals the stored return event (reason, "Sınaq Rəhbəri", moment). The approval's `Decision` equals the last stored event, and `MissingPricesAcknowledged` is true. The historical order's facts equal `WorkflowDecisionFactsDto.HistoricalImport`, with no "Sistem" |
| 4 | Nothing outside the sandbox changes, and no real database was reached | PASS — the separation test compares sorted id lists of locations, orders, users, roles and products, plus the workflow event count, on the shared test database before and after a full seed and flow. It also checks that no `SINAQ-` object or `sinaq.` user leaked. Every connection in the tests targets the test server (`postgres`, `baxorders_test_…`, `baxorders_sandbox_t_…`) or an unresolvable host. The tool and script were not run (no `dotnet run` in the log) |
| 5 | API refuses `Sandbox` + non-sandbox database, and any other environment + sandbox database | PASS — `SandboxDatabase.EnsureFits` is the first statement after `CreateBuilder`. Unit tests cover both directions, including a null or empty string, `postgres`, and upper-case `BAXORDERS_SANDBOX`. Integration shows the real host refusing `Sandbox`+`baxorders_dev` and `Testing`/`Staging`/`Production`+`baxorders_sandbox`. Messages carry no password |
| 6 | Every sandbox page shows the banner; the normal UI shows none | PASS — `SandboxBanner` renders at the top of `AppLayout`'s content column, before `Header`, so it appears on every signed-in route, not-found included. It also renders at the top of `LoginPage`. Those are the only two shells in `App.tsx`. The text is exact, amber, cannot be closed, and has `role="status"`. vitest covers true, false and endpoint-failure cases on both shells. The `LoginPage` diff is re-indentation only |
| 7 | `npm run dev:sandbox` and the `sandbox` launch profile exist; operator commands in the report | PASS — `vite --mode sandbox` serves on 5174 → 5081 with `strictPort`. The `sandbox` profile runs on 5081 with `ASPNETCORE_ENVIRONMENT=Sandbox`. `sandbox.ps1` has `-Create`, `-Reset`, `-Drop` and `-Run`, never echoes the password, and restores the environment variables it sets. Report §6 has the exact commands |
| 8 | All suites and both builds green | PASS — see above |

## Invariants (TASK-04b §6)

- **Real database not reached.** No code path opens a connection to a database the name guard has not accepted,
  other than `postgres` for the two statements. `SandboxSettings.Load` reads the API's development connection
  string only to take its server and its database *name*. `SandboxServer` replaces the database before any use.
- **Real catalogue, orders, prices, classifications (HD-002's 94 rows), users and roles:** untouched. This is not a
  data task, and nothing ran against a real database.
- **04a preserved.** `ApprovalAuthority`, `DecisionFacts`, the panel, the 403/422 behaviour and "Düzəliş tələb et"
  are not in the diff. The E2E test exercises them unchanged.
- **Tasks 1–3 preserved.** No analysis, money, pricing or catalogue code is in the diff.
- **`npm run dev` and the `http` profile unchanged.** `vite.config.ts` falls back to 5173 → 5080 with
  `strictPort: false` (the previous default) for every mode other than `sandbox`, `development` included. The `http`
  profile is untouched.
- **Development still migrates on startup.** The `IsDevelopment()` migration block in `Program.cs` is unchanged.
- **Identity refactor.** `IdentitySetup.AddBaxOrdersIdentity` has the same options, character for character, and the
  same builder chain (`AddIdentityCore` → `AddRoles` → `AddEntityFrameworkStores`). `SecuritySetup` appends
  `AddSignInManager().AddDefaultTokenProviders()` exactly as before. No behaviour change, and the whole
  authentication suite passes.
- **No committed secret.** `appsettings.Sandbox.json` holds only `ApplyMigrationsOnStartup: false` and logging.
  Test constants are obviously fake (`not-a-real-secret`).
- **Historical carry-in** matches migration `20260923122642` column for column: same comment text, same
  missing-price count expression, `FALSE`, `NOW() AT TIME ZONE 'UTC'`, and the same `SourceImportBatchId IS NOT
  NULL AND Status = 'Draft'` guard. It is narrowed to one id. This is the only direct write, as §4.3 allows.

## Observations (not failures)

1. `SandboxLifecycle` lives in `ApprovalSandbox.cs`, because the Coder's profile could not rename the file. This is a
   naming nit only.
2. `EnvironmentProvider.tsx` has a stray `</summary>` inside its JSDoc comment. This is cosmetic.
3. The banner scrolls with the page, while the header is `sticky top-0`. "Persistent" is met in the sense that it
   cannot be dismissed and heads every page. Whether it should also stay pinned on mobile belongs to Task 12, which
   the report flags.
4. The migrations seed four reference locations into every fresh database, so the sandbox's "Obyektlər" shows 6
   objects. The spec (§2) calls this harmless. Task 15 must not compare the sandbox's count with the real 27.
5. `sandbox.ps1 -Run` builds into `src/BaxOrders.Api/bin`. If the normal API is running from there on older code,
   the build cannot replace its files; stop or restart it first. This note is in the report only, not in the script
   header.
6. The report was recovered by the operator from the Coder's scratchpad, and its header comment says so. I compared
   its claims with the raw log and the tree, not with the report alone.

## Scope

Nothing outside §3. Mobile, menus, wording and the final audit were not touched. No 04a defect was found, and none
was fixed.

## Transition

- `PLAN.md`: 04b accepted, and Task 04 is complete. The commit is recorded as `see STATE.json`.
- Next task from the fixed order `04 → 05 → …`: **Task 05 — Terminlər, vahidlər və texniki məlumatların rəhbər
  görünüşündən çıxarılması**. `BRIEFS/TASK-05.md` exists. There is no `TASKS/TASK-05.md` yet, so the state is
  `PLANNING`.
- Task 05 is a wording and visibility task. It changes no real data, so no §7 gate applies.
