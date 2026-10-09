# Review — Task 14: Rola görə menyu

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All nine acceptance criteria of `TASKS/TASK-14.md` §10 hold. I checked the diff and the
Coder's raw log myself rather than relying on the report. No human gate was crossed, and there is no data, schema,
role or user change. `COMMIT_MESSAGE.txt` is written. The next task is 16, and it goes to `PLANNING`.

## What was inspected

- Branch `main`, HEAD `e65747b` (Task 13c). Nothing for Task 14 is committed.
- `git status`: 27 tracked files modified and `PlannedFeature.tsx` staged as deleted (`D `; the file is gone from disk
  and from the index). One new file: `tests/BaxOrders.IntegrationTests/RoleVisibilityEndToEndTests.cs`. The other
  untracked paths are `AI_WORKFLOW/`, `run-agent.ps1`, `monitor-agent.ps1` and `resume-agent.ps1`, and the runner
  excludes them. `git diff --numstat` is +713 / −53, all under `src/`, `frontend/` and `tests/`. Nothing changed under
  `tools/`, `docs/` or `Infrastructure`, and there is no migration.
- The full diff of every file, and all of the new integration test.
- Every `[Route]` / `[Authorize]` in `src/BaxOrders.Api/Controllers`. Only the four touched controllers sit under
  `api/v1/imports`, none has an `[AllowAnonymous]` action, and no other policy moved.
- A grep of the frontend. `/api/v1/imports` appears only in `api/imports.ts`, `api/rows.ts` and `api/review.ts`.
  Outside the import screens, the only functions taken from them are `searchReference` and `searchProductVariants`,
  in `AssignCategoryDialog`, `SupplierPicker` and `AddLineDialog`, and `components/imports/labels.ts` imports only
  types. Nothing a Rəhbər can open links to `/products` (only the menu, `ProductsPage` and `ProductCategoriesPage`
  do). `hazırlanır` is left only in `BulkActionDialog`'s "Plan hazırlanır…" and in one test assertion.
- The raw Coder log `LOGS/20260925-075958-cycle10-coder.jsonl`.

## How builds and tests were verified

As in earlier reviews, this Reviewer profile was refused `dotnet build` again. I used the Coder's raw log instead:

- Line 278: the direct `dotnet build` failed on file copies into the locked `src/BaxOrders.Api/bin`. The running API
  holds that lock. It was not a compile error, and spec §11.5 allows for it.
- Line 283: `--artifacts-path` build, **0 warnings, 0 errors**. It ran after the last backend edit (line 268,
  `AuthenticationTests.cs`).
- Line 706: full `dotnet test`, **991 unit / 760 integration, 0 failed** (baseline 991 / 751, +9 new). No backend
  file was edited after that.
- Line 657: a frontend run had **1 failure**, in the Coder's own new test "is told the page is read-only". It had
  asserted that no button named "Alış qiyməti tələb olunur" exists, but the filter button has the same name as the
  decision button. At line 679 the Coder changed it to assert exactly one such button, and that it is the filter
  (`aria-pressed`). The test is no weaker: the decision button's absence is still asserted, and the existing "a manager"
  test still asserts no checkbox and no "Şirkətdaxili təminat kimi qeyd et".
- Line 685: frontend **44 files / 883 tests passed** (baseline 849, +34). Line 695: `vite build` green, after
  `tsc -b`. No frontend file was edited after line 679.
- Line 803: a further `--artifacts-path` build, 0 / 0.

`npx tsc -b --noEmit` was refused to the Coder's profile. `npm run build` runs the same `tsc -b` over the whole
project, tests included, so I accept that as the type check.

## Acceptance criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Rəhbər menu: five entries in order; header shows the name and "Rəhbər", not "Administrator" | **Pass.** `navigation.ts:37,39` tie Məhsullar and Qiymət təsnifatı to `canManageCatalog`. `auth.test.tsx` pins the exact list for all three roles. `App.test.tsx` "the header for a Rəhbər" renders the real layout and checks the banner for the name and "Rəhbər", and the whole body for "Administrator". |
| 2 | Təchizatçılar read-only for a Rəhbər; POST 403 and nothing changes | **Pass.** A `role="note"` with `readOnlyNote` is shown when `!mayManage` (`= canManageCatalog`). The existing test already proves there is no "Dəyiş". The integration test gets 403 and reads `PriceRequirement == Required` afterwards. |
| 3 | Price warning → Qiymət təsnifatı for that order, "Hamısı", read-only, totals = warning, way back keeps the basis; POST 403 | **Pass.** The link is in `DecisionHeadline` and the fallback summary, and only when missing > 0. `pricingReviewLink` carries `basisSearch`, as `orderLink` does. With `order`, the page starts on "Hamısı", sends `orderRequestId`, and links back through `orderLink(order, parseBasis(params))`. The server narrows `unpriced` before the totals. In the integration test Unresolved 1 + PriceRequired 2 = 3, which equals `missingPriceItemCount` on both `orders/{id}` and `decision-context`. POST gets 403 and `PricingMode` stays `Unresolved`. The domain has only three pricing modes, so the equality holds in general, not only in the fixture. |
| 4 | `/imports`, `/admin/users`, `/products`, `/products/categories` refused; every `GET api/v1/imports/…` and `admin/users…` 403 | **Pass.** The two routes sit behind `RequirePermission canManageCatalog`. `App.test.tsx` shows all four refused, with the page never rendered. `CanManageImports` is on all four import controllers at class level. The 403 matrix covers eight reads on a real staged batch and row, plus `admin/users` and `admin/users/approval-authority`. |
| 5 | Admin nine entries, approve/return 403; Koordinator seven entries, import reads and writes work | **Pass.** The menus are pinned exactly. Coordinator and Admin get 200 on the same eight reads, and the existing import end-to-end suites pass in the 760. `An_administrator_may_submit_and_manage_users_but_not_decide` is unchanged and green. |
| 6 | `PlannedFeature.tsx` gone; no reachable "hazırlanır" page | **Pass.** Removed with `git rm`, and the grep is as above. |
| 7 | No 05b Coordinator/Admin-only control and no "versiya" for a Rəhbər | **Pass.** The new `OrderRevisionPage.test.tsx` "what a Rəhbər is shown" covers a pending corrected order and a returned order. Neither shows a create-correction button, "Redaktə et", "Sil" or "Sətir əlavə et", and the body has no `/versiya/i`. |
| 8 | Pricing endpoint unchanged without `orderRequestId`; narrowed with it | **Pass.** The parameter is last and nullable, and the filter is added only when it has a value, so the null path builds the same query. `Without_an_order_the_queue_answers_exactly_as_before` compares the serialised HTTP response with the service called the old positional way, over four query shapes. It also counts the totals directly from the DB. An unknown id returns 200 with zeros. |
| 9 | §9 invariants; all suites and builds green | **Pass.** No policy other than the import class level changed. `/auth/me` is untouched. The frontend has no removed expectation; the only `-` lines in test files are import and doc-comment lines. One integration test changed, `AuthenticationTests.A_manager_may_decide_but_not_submit_or_import`: its comment was replaced and a GET 403 was added, as the spec names, and every old assertion is kept. |

## Scope and safety

- No database was touched outside the fixtures' throw-away databases. No tool was run. There is no migration, and no
  role, user or authority changed. HD-002 is untouched, and the pricing change only filters a read.
- The per-action `CanManageImports` attributes are kept, which is redundant and harmless. The spec left that choice to
  the Coder, and the report says so.
- Spec assumptions 1–11 are all implemented as written. None of them changes an owner decision.

## Notes, not blocking

- Operator: restart the API on this commit before serving the new frontend. An older API ignores `orderRequestId` and
  would show the whole queue under an order's scope line.
- For Task 15's audit: the pricing page a Rəhbər can now open still shows product codes and the Excel sheet:row
  reference. Brief 14 leaves technical words out of scope (Task 5), so the report records this and does not change it.
