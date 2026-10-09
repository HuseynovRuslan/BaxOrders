# Review — Task 13b: Yazılış uyğunluğu analitikada bir mal; Məhsullar səhifəsi (Task 13, part 2 of 3)

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** Every acceptance criterion of `TASKS/TASK-13b.md` §8 is met. No schema, data, tool or
real-database change was made. The fold reads only live approved SameItem rows. No money figure can move, and the
tests prove it on both fixtures. The one departure from criterion 11 is judged below, and it does not block
acceptance. `COMMIT_MESSAGE.txt` is written. Next is Task 13c, in `PLANNING`.

## What was inspected

- Branch `main`, HEAD `15398eb` (Task 13a). Nothing for 13b is committed.
- `git status`: 15 tracked files modified (+365 / −41). The new files are `Analytics/SpellingFold.cs`,
  `components/catalog/matches/*` (six components or modules and two test files), `pages/ProductsPage.test.tsx`,
  `UnitTests/Analytics/SpellingFoldTests.cs`, `IntegrationTests/SpellingFoldAnalyticsTests.cs` and
  `IntegrationTests/ProductMatchFamiliesTests.cs`. The untracked non-task paths are `AI_WORKFLOW/`, `run-agent.ps1`,
  `monitor-agent.ps1` and `resume-agent.ps1`. The runner excludes all four (`run-agent.ps1:366`), so the 13a note
  about `resume-agent.ps1` is closed. `git ls-files` also shows that `15398eb` does not track it.
- The full diff of every tracked source, frontend and test file.
- `SpellingFold.cs` in full. `OrderAnalyticsQueries.CompareAsync` / `GetTrendAsync` read at the working tree.
  `SpellingFoldAnalyticsTests.cs` in full. `SuggestionList.tsx` and `ApproveMatchDialog.tsx` in full. The test
  names of `ProductsPage.test.tsx`.
- A search of `src/` for every `GroupBy(OrderRequestId, ProductVariantId)` snapshot reader. There are exactly three,
  and each is folded at its call site. No other analytics path keys by variant.
- The raw Coder log `LOGS/20260925-075958-cycle02-coder.jsonl`: every Write and Edit, and every test and build
  result.

## How builds and tests were verified

This Reviewer profile is refused `dotnet build`, `dotnet test` and `npm` (the same as for the 13a review). The Coder's
raw log was used instead:

- Line 819: the first full integration run had **5 failures**. All five are query-count assertions
  (`OrderDecisionContextTests.The_whole_answer_is_a_handful_of_queries…`, `DashboardCauseTests.Naming_a_cause…`, and
  three in `LinePricingModeTests`). There was no other failure. The earlier failure at line 496 was the Coder's own
  new test (`No_amount_moves…`), and it is explained below.
- Line 875, after the last backend edit (line 860): **951 unit / 741 integration, 0 failed, 0 skipped.**
- Line 884: `dotnet build` through `--artifacts-path`, **0 warnings, 0 errors**. The running API locks `bin`, which
  the spec (§10) allows for.
- Line 789, after the last frontend edit (line 774): **44 files / 833 tests passed.** Line 912: the Vite build
  succeeded.
- No source or test file was edited after those runs. The only later writes are `LAST_REPORT.md` and `STATE.json`.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | The fold (§4.1) | **Pass.** `ReadAsync` is one `AsNoTracking` query on `Kind == SameItem && Outcome == Approved && UndoneAtUtc == null`. `Apply` returns its input unchanged when empty and adds all seven fields. `Resolve` stops on a visited id. Everything except `ReadAsync` is pure. `SpellingFoldTests` (14) covers every clause, including a 5-seed per-field sum property. |
| 2 | Acceptance 5, "15 W" / "15W" | **Pass.** Before approval: 24.00 / 20.00 / +4.00, New +24.00 and NoLongerOrdered −20.00, counts 1/1/0, and a zero August in the history. After approval: one driver "Lampa 15W", Increased, 10 → 12, +4.00, counts 0/0/1. The dashboard row, the comparison endpoint and the history (asked for by either id) agree. The lines still sit under their own variants. |
| 3 | Acceptance 4, separate until approved | **Pass.** `Before_approval_…`. `A_rejected_pair_stays_two_products_everywhere` checks the full serialised responses after a rejection and after the rejection is undone. `Undoing_the_approval_…` checks the undo. |
| 4 | Acceptance 7, no amount moves | **Pass.** `MoneyAsync` covers the order page's current / primary / secondary, the dashboard summary and every row, the comparison summary's money and price counts, and the 2026 monthly report, on all four bases, before, after and after undo. It also asserts that the categories add up to the delta. This runs on 13b's fixture and on 13a's HEM fixture. |
| 5 | Acceptance 8, undo restores byte for byte | **Pass.** Decision context ×2, dashboard, comparison ×2 (× 4 bases), six histories and the monthly report are serialised. Before = after undo, and before ≠ after approval. |
| 6 | Task 2 price states | **Pass.** "Kaplin 3/4" is one `UnattributedDueToMissingPrice` driver with missing 1. "Vedrə 10 L" is `InternalSupply` with missing 0 and not-required 2. The order's counts (1, 1) and money (10.00 / 25.00 / −15.00) do not change, and the history is still owed in September. |
| 7 | A variant link folds nothing | **Pass.** After the Sabun Variant approval, every HEM response is identical (context, dashboard and comparison × 4 bases, two histories, report). The figures are 750.00 / 750.00 / 0.00 on two rows. |
| 8 | The page, visible half | **Pass.** `ProductsPage.test.tsx` checks both kinds with totals, the Sabun row with its label, and that reading sends nothing. It checks the reverse-direction approve (ids swapped), the edited label with a reason, an empty label refused without a request, one-click reject with "Geri al", a 422 shown in the dialog, and undo from "Qərarlar". `ProductMatchFamiliesTests` covers `/families` before, after and after undo, search by base and by variant, both products still separate, and HTTP reads by Manager / Coordinator / Admin with anonymous getting 401. |
| 9 | Acceptance 6, visible half | **Pass.** Manager and Coordinator see no "Təsdiqlə" / "Rədd et" / "Geri al" on any tab. `SuggestionList` renders the buttons only under `canDecide`, and `DecisionList` renders "Geri al" only with the flag. 13a's server 403 is untouched. |
| 10 | No placeholder | **Pass.** `PlannedFeature` is gone from the page. A test checks for the absence of "Bu bölmə hələ hazırlanır" and the old points, and `findOldTerms` returns `[]` on every tab. |
| 11 | Nothing else changed | **Pass, with one judged departure (below).** No migration, snapshot, tool or 13a service / rule file changed. `ProductMatchCatalog.cs` is untouched. |

## The judged departure: five query-count assertions raised by one

Three test files outside §9 changed: `OrderDecisionContextTests`, `DashboardCauseTests` and `LinePricingModeTests`.
Each one raises an exact query count by one (5 → 6, and 6 → 7 for "every prior month"). §9 also says "the analytics
tests of Tasks 1–12 must pass unchanged".

This is not a weakened test:

- §4.1 requires `ReadAsync` to be **one query**, and §4.2 requires each path to "read the fold once" and says "each
  class summary that states a query count is corrected by one". The specification itself expects one more query on
  every path, and query-count assertions cannot pass unchanged under it. The contradiction is inside the spec.
  §9's sentence gives its reason as "because their fixtures have no decisions", and that is about figures.
- Every assertion is still exact (`Assert.Equal`), not a bound. What each test proves still holds: the count does
  not grow with objects or products, frequency adds no query, and "every prior month" costs exactly one more than a
  fixed window (6 → 7 keeps the difference of one). Each comment names the new query.
- The log shows these five were the only failures before the change. No figure-based expectation was touched.

The only alternative is to fold inside the SQL of each `SnapshotsAsync`, and that contradicts §4.1's pure fold and
Assumption 3. So I accept the change.

The other test change is `No_amount_moves…`, the Coder's own new test. It first compared a null `DeltaAmount` with
`TotalAmountImpact` on a fixture month with no priced line (that behaviour is the same at `15398eb`). The fix added
"Əlcək" 10 × 1.00 to both months, so the delta is a number (−15.00), and it guards the equality with a null check.
The check is still made on every context that has a delta. The categories-sum check stays unconditional. Nothing
required by the spec was relaxed.

## Other checks

- **No likeness in the read path.** The fold reads decisions only. Tests approve through `ProductMatchService` as
  the Admin.
- **The trend with an empty fold.** `MembersOf(id)` returns `[id]`, so `members.Contains(...)` selects exactly the
  lines `== id` selected. The byte-for-byte "before" snapshots confirm it.
- **The families API** reads live approved Variant rows, product names, and `ProductMatchCatalog.ReadAsync(db,
  readDecisions: false, …)`. It writes nothing, and paging is by family.
- **Class summaries** now give the true counts: "Six queries" for the decision context, and "six … and a seventh" for
  the dashboard. That also fixes the "Four" that the 11b review flagged.
- **Frontend.** The page uses only `canDecideProductMatches`. Tab and kind are in the URL, and the defaults are
  omitted. Words are in `terms.ts` and page-only words in `labels.ts`. No money or product code is shown. The layout
  uses cards at every width.

## Not blocking — for the record

- `components/PlannedFeature.tsx` is now unused. It is left for Task 14 or later.
- The `readDecisions` doc comment in `ProductMatchCatalog.ReadAsync` still says "False only for the migration tool's
  inspection". `/families` now calls it with `false` too. That file was outside §5.
- A month with no priced line has a null `DeltaAmount` while its decomposition has a non-zero total. This is the
  same at `15398eb`, and nobody has checked yet how the screen shows it.
- For 13c: the report's §7.1 note matters. The spelling fold is keyed by variant and the Variant link by product.
  13c should fold spellings first, then map the canonical variant's product through the live Variant links, and
  also consider a link on the folded-away source's product.

## Operator

Restart the API on this commit to expose `GET …/product-matches/families` and the folded read paths before serving
the new frontend. No migration is pending. The real database holds no decision, so every figure reads as before.
