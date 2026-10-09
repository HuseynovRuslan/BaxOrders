# Review — Task 22b: Tarixi təsdiq ifadəsi — siyahılar və aylıq hesabat (Qərar zənciri, 6 of 8; Task 22, part 2 of 2)

Reviewer, 2026-09-26. Specification `TASKS/TASK-22b.md` (READY, Planner, verified at `cc46329`); brief
`BRIEFS/TASK-22.md` (decisions 22.1 … 22.4, where 22.4 is HD-010's answer, option 1); Coder report `LAST_REPORT.md`;
Coder log `LOGS/20260926-093543-cycle02-coder.jsonl`.

**Verdict: PASS.** Task 22b is accepted, and with it Task 22 (22a + 22b). The next task is 23. Its specification is
still `DRAFT — §2 UNVERIFIED`, so the state goes to `PLANNING`.

## What I checked independently

- **Git.** Branch `main`, HEAD `cc46329` (22a's accepted commit). `git diff --stat`: 23 tracked files, +973 / −54. There
  are two new untracked files, `Orders/Workflow/HistoricalImportRule.cs` and `UnitTests/Orders/HistoricalImportRuleTests.cs`.
  The other untracked entries are the workflow infrastructure (`AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1`,
  `resume-agent.ps1`), which the runner leaves out. Every changed file is in §5.4, in §10's tests, or is the manual pack.
  Nothing changed under `Migrations/`, `tools/`, `Domain/`, `Api/` or `Infrastructure/`, and there is no controller,
  permission, `DbContext` or schema change. `StatusBadge.tsx`, `OrderStatusBadge.test.tsx`,
  `WorkflowDecisionFactsTests.cs`, `ApprovalDecisionFactsTests.cs` and `ApprovalInboxQueries.cs` are unchanged.
- **I read the whole production diff.**
  - **`HistoricalImportRule.Holds`** is `!any(SubmittedForApproval in earlier ∪ own) && own contains
    ImportedAsApproved`. That is exactly the two lines it replaces in `Compute`. `Compute` now calls it with
    `ownHistory` and `earlierVersionsHistory` projected to actions. Its `chain` variable is still used below, for
    the current cycle, and the rest of `Compute` is unchanged.
  - **`EarlierVersions`** is the old loop from `DecisionFactsAsync`, moved unchanged, including the `!earlier.Contains`
    cycle guard. `DecisionFactsAsync` keeps its two queries and their SQL. Only the loop was replaced by the call.
  - **`AmongAsync`**:
    - it returns an empty set for an empty input, before any query;
    - query 1 reads the revision links whose revision request shares a location and month with a given request, through
      a correlated `Any`. That is `DecisionFactsAsync`'s scope, taken for all the requests at once;
    - query 2 reads `(OrderRequestId, Action)` for the requests and their whole chains, with no action filter in SQL;
    - `Holds` is applied per id;
    - it only reads (`AsNoTracking`, no `SaveChanges`).
  - `grep ImportedAsApproved src/BaxOrders.Application` finds only `HistoricalImportRule.cs:32`. The rule is written
    once (criterion 1, 22.4).
  - **The three fields**:
    - each is last, with default `false`, and has a `<param>` doc;
    - the objects list asks only about non-null `LatestRequestId`s, after `WithLatestOrderAsync`;
    - the history asks about the page's ids, after the `KnownAmountTotal` fix-up;
    - the report asks only about requests with `Period.Year == year`, and passes the set through `Build` → `Cell` onto
      the request cell. The empty cell keeps the default.
  - **Frontend**:
    - `showsHistoricalImport` is `status === 'Approved' && flag === true`;
    - `workflowStatusText` appends `` ` · ${historicalImportLabel}` `` only under that condition;
    - `OrderStatusBadge` swaps its inline condition for the helper, and its output is the same;
    - the three surfaces swap `StatusBadge` and the three maps for `OrderStatusBadge`, with the same `size="sm"`, and
      drop the unused imports;
    - `describe()` in the report is the only report change. The dot, the legend, amounts, colours, tint, ⚠ and the
      hatch are untouched.
- **The tests read right, and none is weakened.**
  - **9 unit tests** for `Holds` and `EarlierVersions`, exactly §10's cases.
  - **9 integration tests**:
    - the three lists: true for historical, false for in-system approved and for a draft;
    - the wire names;
    - no-write: status, version, event count and the three null moments are unchanged;
    - `AmongAsync`'s cost, 0 / 2 / 2 / 2;
    - the agreement test. It uses the real services as a coordinator and a Rəhbər. It covers historical, approved,
      draft, pending, the returned v1 and its correction v2. v2 carries a SQL-written `ImportedAsApproved` event and
      `Approved` status, and it must be false everywhere.
  - The fixture's two SQL statements moved unchanged into `CarryOverAsync`.
  - The only changed expectation is `MonthlyReportTests` 4 → 6, twice, which §10 allows. The comments name the two
    new reads, and the test still proves a constant cost. Renaming `A_whole_year_is_four_…` to `…six…` keeps the name
    true, and is accepted.
  - **Frontend, +47 tests**:
    - the 4 × 3 condition matrix, plus `null`;
    - `workflowStatusText`, which is byte-equal to the bare label in every case but one;
    - the list, rows and card show the badge with the slate phrase, with no amber;
    - the links are unchanged: the row keeps its name and «Bax», the period row's link list is identical before and
      after, and the card still has one «Sifarişə bax»;
    - in the report, the historical title equals `plain + ' · ' + historicalImportLabel`, the two dots' `outerHTML`
      are equal, both legends list the same seven items, and the phone card says the same words;
    - a non-Approved status with the flag set shows no phrase anywhere;
    - three old-terms sweeps with a historical order on screen.
  - One fixture outside §2.4's list, `oldTerms.test.tsx`:675, gained the field. It is a type requirement for `tsc -b`,
    not an expectation, and it reflects a gap in §2.4.
- **Suites and builds.** This Reviewer profile may not run `npm` or `dotnet`; both were refused. As for 20, 21 and 22a,
  I read the raw tool results in the Coder log and checked them against the files' modification times.
  - The last application edit is log line 691 (`oldTerms.test.tsx`, 05:56:07Z). The file's mtime is 09:56:07 +04:00,
    the same moment, and it is the newest mtime of any code file in the diff. After it, the only writes are to the
    Markdown pack (lines 927, 939; mtime 06:05:21Z) and to `AI_WORKFLOW/`.
  - Every run below comes after the last edit:
    - line 845 (06:00:48Z), full frontend suite: `1 failed | 1265 passed (1266)`. The failure is in
      `OrderDecisionPage.test.tsx`:758, a file untouched since 22a (mtime 08:57:46 +04:00);
    - line 851, a second full run, grepped for `FAIL|✗|×|Error:|Timed out|timeout`, printed nothing;
    - line 859 (06:03:16Z), a third full run: `Tests 1266 passed (1266)`;
    - line 894, `npm run build` (`tsc -b && vite build`): `built in 4.85s`;
    - line 982, `dotnet build BaxOrders.slnx` (`--artifacts-path` in the scratchpad, because the running API holds
      `bin`): `Build succeeded`, 0 warnings, 0 errors;
    - line 1010 (06:12:02Z), `dotnet test BaxOrders.slnx --no-build` on that build: unit `Passed: 1055, Failed: 0`;
      integration `Passed: 800, Failed: 0`.
  - The counts rise only by the new tests: 1046 → 1055 (+9), 791 → 800 (+9), and 1219 → 1266 (+47) in 60 files.
  - The one frontend failure passed on two re-runs of the unchanged tree, in a file this task does not touch. So it is
    non-deterministic, not a regression: the same shape as N-02 (15b). The Coder reported it rather than hid it.
- **Status and data.** No write path, event, permission, queue or schema is touched. The integration test pins that the
  historical order is still `Approved`, v1, with 1 event and null `SubmittedAtUtc` / `ApprovedAtUtc` /
  `SubmittedByUserId`, after all three lists are read. The Coder ran no database command. HD-002's 94 rows are
  untouched.
- **Manual pack.** `22-tarixi-tesdiq.md`: the only removed line is the 22b placeholder. F-01 … F-08 are unchanged.
  F-09 … F-16 are added under `## 22b — siyahılar və aylıq hesabat`, each with the `---- operator doldurur ----`
  marker. F-16 says the API must be restarted. The pack is prepared and not run, and the Coder did no browser check.

## Acceptance criteria (§9)

| # | Criterion | Result |
|---|---|---|
| 1 | `Holds` is the only place of the rule; `Compute` and `AmongAsync` call it; both walks use `EarlierVersions` | **Pass** — diff and `grep` |
| 2 | The three list flags equal `DecisionFacts.IsHistoricalImport` for every kind of order, including the chained v2 | **Pass** — agreement test |
| 3 | Historical: `✓ Təsdiqlənib` + phrase on the list, the period row and the card; the phrase in the report cell's description | **Pass** — page and card tests |
| 4 | In-system approved, Draft, Pending and Returned render as before, with no `Tarixi sifariş` | **Pass** — tests, and the byte-equal title |
| 5 | The report's dot and legend are unchanged; no amber | **Pass** |
| 6 | No status, version, amount, event, queue, permission, schema or data change | **Pass** — diff and no-write test |
| 7 | `AmongAsync` 0 / 2; the report 6 queries | **Pass** — counted tests |
| 8 | Old-terms sweep on the three screens with a historical order | **Pass** |
| 9 | Suites and builds green; diff within §5.4, §10 and the pack | **Pass** — log evidence above |

Brief acceptance 3, 4, 5 and 6 are met by this diff. 1 and 2 were met by 22a and are unchanged here, because the order
page, `WorkflowPanel` and 22a's labels were not touched. **Task 22 is complete.**

## Notes, not blocking

- **Go-live.** Restart the API on this commit before relying on the new wording. A new frontend on the old API reads
  the missing field as `undefined`, and `showsHistoricalImport` then shows the plain badge. So the order of restart
  only delays the phrase and breaks nothing. There is no migration.
- **Cost.** The objects list and the object page now run two more queries when the page has an order, and the report
  runs 6 queries instead of 4. All of these are constant, never one per row.
- **The frontend flake** in `OrderDecisionPage.test.tsx`:758, «lists the products when none moved money but some were
  compared», failed once in three runs here. This is the second time a one-off timeout has shown up in the frontend
  suite. It is worth a look if it recurs, but it is not this task's.
- **The NuGet cache.** The Coder saw `Access to the path 'Microsoft.AspNetCore.Mvc.Testing.Tasks.dll' is denied` on
  restore. If the operator's plain `dotnet build` hits it, close the stale MSBuild node and restore again. This is an
  environment issue, not a code one.
- **Carried from 22a, still out of scope:** `04-sandbox.md` Sınaq 1 step 8 and `SandboxScenario.cs`:67–68 still quote
  4.1's retired sentence.
