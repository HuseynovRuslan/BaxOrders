# BAX Sifarişlər — Implementation Plan

## Accepted

- Task 1 — Müqayisə bazasının paneldən sifariş səhifəsinə ötürülməsi
- Task 1b — Portfolio müqayisəsində eyni cohort
- Task 1c — Money rounding at the source
  - Accepted commit: `a45c5ff`
- Task 2 — Qiymətsiz sətir və daxili təminat qaydalarının ekranlar üzrə uyğunlaşdırılması
- Task 3 — Obyekt kataloqu və bütün ekranlarda vahid obyekt sayı
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-03.md`
  - Accepted commit: `4827cb4`
- Task 04a — Rəhbər rolu, təsdiq səlahiyyəti və qərar paneli
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-04a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Go-live: an active "Rəhbər" user must exist before the API is restarted on this commit (`TASK-04a.md` §11.6).
- Task 04b — Real datadan ayrı sınaq mühiti və axının başdan sona sınağı
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-04b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Operator commands for the sandbox (Task 12, Task 15): `LAST_REPORT.md` §6 of 04b, and the header of
    `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`.
- **Task 4 — Təsdiq axını: complete** (04a + 04b). The Rəhbər role and the approval authority were created here
  (4.3, 4.3a); Task 14 only configures that role.
- Task 05a — Terminlər, vahidlər və format
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-05a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The old-terms sweep (`src/test/oldTerms.ts`, `src/terminology/oldTerms.test.tsx`) is the list 05b extends.
- Task 05b — Texniki məlumatların rəhbər görünüşündən çıxarılması
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-05b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Coordinator/Admin-only correction texts that still say "versiya" (and `EditLineDialog`'s product code) are
    listed for Task 14 in 05b's `LAST_REPORT.md` §2.3 / §8.
- **Task 5 — Terminlər, vahidlər və texniki məlumatların rəhbər görünüşündən çıxarılması: complete** (05a + 05b).
  The split was inside Task 5 and did not change the queue order.
- Task 6 — "Niyə dəyişib?" bölməsi
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-06.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Decision 9.1 is now written once, as `costDirectionToneClass` / `costDirectionBarClass`
    (`components/analytics/format.ts`), with the words `costIncreasedLabel` / `costDecreasedLabel` (`terms.ts`).
    Tasks 07, 08, 09, 10 and 11 move their screens onto these; `signedToneClass` is the pre-9.1 rule, kept only
    until then. The dashboard still shows `incompleteExplanationNote` on `!explanationIsComplete` — Task 9.
- Task 7 — Əsas səbəbin məhsul adı və payı ilə göstərilməsi
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-07.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The share rule (7.1, 7.1a) lives once in `Application/Decisions/CauseLeader.cs`; the dashboard row carries
    `PrimaryCauseProduct`. The attention card is on 9.1; the table and summary (`LocationRows.tsx`,
    `DashboardSummary.tsx`) still use `signedToneClass` — Task 9. `MonthlyReportTable.tsx` still uses it — Task 8.
- Task 8 — Aylıq hesabat
  - Accepted by the Reviewer on 2026-09-24 — see `REVIEWS/TASK-08.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The unusual-month rule (8.2) lives once in `Application/Reports/UnusualMonth.cs`; the report cell carries
    `RecentAverageKnownAmount` / `RecentAveragePercent` / `IsUnusual`, the row `HasAnyRequest`. 9.1 gained a third
    shape, `costDirectionTintClass`. The report is off `signedToneClass`; the dashboard table and summary (Task 9) and
    `DriverList` / `TrendModal` (Task 10) still use it. The narrow month list's structure is Task 12's.
  - The full backend suite's raw output is missing from the Coder log (see the review); an operator re-run of
    `dotnet test BaxOrders.slnx` would close that gap.

- Task 9 — İdarəetmə paneli UX
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-09.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The attention card carries `Rank` / `AlsoFirstIn`; the chips filter on `group` / `missingPrice`, each on the very
    predicate it counts with; the page opens on `sort=AbsoluteKnownAmountDelta` (enum 11) with `pageSize=100`.
    The whole dashboard is on 9.1; `signedToneClass` is left only in `DriverList` / `TrendModal` (Task 10) and
    `components/analytics/labels.ts` (Task 11). Shared for them: `components/analytics/DirectionWord.tsx`,
    `costDirectionSentence` / `costUnchangedLabel` (`terms.ts`), `navigation/useScrollMemory.ts`.
  - Go-live: restart the API on this commit before serving the new frontend (the old API refuses sort 11).
- Task 10 — "Əsas dəyişikliklər", məhsul tarixçəsi və məhsul saylarının uyğunluğu
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-10.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The product state rule lives once in `OrderAnalyticsCalculator.StateOf`, called by the comparison page and the
    decision context. The decision context carries `DecisionDriverDto.State` and `DecisionDecompositionDto.Products`.
    New / no-longer-ordered products are always listed, even at zero money. The trend point carries `SupplierNames`
    (one extra query; the trend now runs five). `TrendModal` takes a `quantityRatio` prop from the page that opens it.
    The shared `Modal` locks the page scroll. `signedToneClass` is left only behind `components/analytics/labels.ts`
    (Task 11).
  - Go-live: restart the API on this commit before serving the new frontend (it reads `products`, `state`,
    `supplierNames`).
- Task 11a — Obyektlər siyahısı və obyekt səhifəsi (Task 11, part 1 of 2)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-11a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. The object page reads the basis (`useBasis`) and compares its latest order through
    `fetchDecisionContext`; the prior-months list is `comparablePriorMonths` (`components/decisions/labels.ts`),
    shared with the order page. "Müqayisə et" / "Müqayisə" still open the comparison page, via `comparisonLink` in
    `LocationDetailPage.tsx`, now with the basis — 11b repoints them. No API restart needed.
- Task 11b — Obyekt müqayisə səhifəsinin sifariş səhifəsinə birləşdirilməsi (Task 11, part 2 of 2)
  - Accepted by the Reviewer on 2026-09-25, after HD-005 — see `REVIEWS/TASK-11b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The comparison page, `AnalyticsSummary` and `ComparisonRows` are deleted. The old route redirects to the object
    page and keeps its basis. "Müqayisə et" opens the latest order (`LocationOrderHistoryDto.LatestOrderRequestId`),
    and each row's "Müqayisə" opens that row's order. New read-only fields:
    `DecisionComparisonDto.BaselineMissingPriceItemCount`, `DecisionDecompositionDto.Steady`, and
    `DecisionProductCountsDto.IncreasedCount` / `DecreasedCount` / `ServiceCount`. `signedToneClass` is gone, so
    the whole frontend is on 9.1. The backend comparison endpoints stay as the parity tests' reference.
  - Go-live: restart the API on this commit before serving the new frontend (it reads `steady`, the three counts,
    `baselineMissingPriceItemCount` and `latestOrderRequestId`).
  - Not blocking: the class summary of `OrderDecisionContextQueries` still says "Four queries" (it runs five).
- **Task 11 — Obyekt səhifəsi və obyekt müqayisə səhifəsi: complete** (11a + 11b). The split did not change the
  queue order.
- Task 12 — Mobil görünüş
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-12.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. The phone layouts sit below `lg`. The report's phone view is `MonthlyReportYearList`, which
    renders the table's own `Cell` / `MonthTotal`. `?month=`, `MonthlyReportMonthList` and `futureMonthLine` are
    gone. The order lines have `LineCard` beside the table. `WorkflowPanel`'s actions are a fixed bottom bar below
    `lg`. `InfoHint`'s note is `position: fixed` and `z-[60]`, and opens on click, tap or keyboard. The dashboard
    puts the exceptions first on a phone through `max-lg:order-*`, with the DOM unchanged.
  - Open: the operator's phone check at 390 × 844, including the Task 4 test order in the approval sandbox
    (`TASK-12.md` §11). No API restart is needed.

- Task 13a — Məhsul uyğunluqları: təklif, təsdiq, rədd, geri alma (Task 13, part 1 of 3)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-13a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - **Real database changed (schema only):** `20260925120000_AddProductMatchDecisions` is applied to
    `baxorders_dev` through `tools/BaxOrders.ProductMatchMigration`. `ProductMatchDecisions` exists and is empty,
    and `--verify` found 22,226 of 22,226 figures unchanged, with HD-002 unchanged. Backup:
    `C:\Users\HP\BaxOrders-backups\baxorders_dev-task13a-20260925-073953.dump`.
  - The authority is `ProductMatchAuthority`, held by the Admin only. `/auth/me` carries `canDecideProductMatches`.
    The endpoints are `api/v1/catalog/product-matches/{suggestions,decisions,approve,reject,decisions/{id}/undo}`.
    The pure engine is `ProductMatchSuggestions`, fed by `ProductMatchCatalog.ReadAsync`. Rejecting a Variant base
    brings up the next-shortest open base. Refusals return 422 through `DomainException`. The Koordinator no longer
    sees the product alias checkbox in import review.
  - For 13b: on the real data the engine suggests 1 SameItem and 216 Variant pairs. Among the Variant pairs are
    NM-03-like «Rain bird sprinkler başlığı», «Şampun qab üçün D3» (NM-05) and four «FAB …» products (NM-16). None is
    encoded, because the business has not named them. No real «15 W» / «15W» pair exists, so acceptance 5 needs a
    fixture. See the report's §9.
  - Go-live: restart the API on this commit to expose the endpoints. No migration is pending.
  - Closed (13b review): `run-agent.ps1:366` now excludes `resume-agent.ps1`, and `15398eb` does not track it.

- Task 13b — Yazılış uyğunluğu analitikada bir mal; Məhsullar səhifəsi (Task 13, part 2 of 3)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-13b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - No schema, data or tool change. The fold is `Application/Analytics/SpellingFold.cs`. It reads live approved
    SameItem rows only, in one query, and is applied at the three `SnapshotsAsync` call sites (dashboard, decision
    context, comparison) and in `GetTrendAsync` (`CanonicalOf` / `MembersOf`). A Variant link still folds nothing.
    Every analytics path now runs one query more (the decision context runs six). New read-only
    `GET api/v1/catalog/product-matches/families`. The Products page has three tabs under
    `components/catalog/matches/`. `PlannedFeature.tsx` is now unused.
  - Go-live: restart the API on this commit before serving the new frontend (it calls `/families`).

- Task 13c — "Variant dəyişib" sətri (Task 13, part 3 of 3)
  - Accepted by the Reviewer on 2026-09-25, after correction 1 — see `REVIEWS/TASK-13c.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - No schema, data or tool change. `Application/Analytics/ApprovedMatches.cs` reads both kinds of live approved
    decision in one query, replacing the spelling read on the dashboard and the decision context. Query counts are
    unchanged (6 / 6 / 7). `VariantFamilies.RoleOf` resolves a kept variant's family, spellings first.
    `CauseDecomposition.Decompose(inputs, roles)` moves a family's new and no-longer-ordered members of different
    products into `CauseCategory.VariantChange = 8`. They are reported as one `VariantTransitionResult` and exposed as
    `DecisionDecompositionDto.VariantTransitions`. `CauseLeader` counts a transition as one effect, by its net.
    Money, product counts, the comparison endpoint, the history and the monthly report do not move. Three existing
    tests were changed on purpose, each backed by 13.1a.
  - Go-live: restart the API on this commit before serving the new frontend (it reads `variantTransitions` and
    `VariantChange`). Operator: after the Sabun variant link is approved in the product, check HEM September
    "Keçən ay" +23,852.70. The 13a tool's `--verify` will then report HEM September's split keys, as 13.1a intends.
- **Task 13 — Məhsul uyğunluqları: complete** (13a + 13b + 13c). The split did not change the queue order.

- Task 14 — Rola görə menyu
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-14.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - No schema, data, role or user change. Məhsullar and Qiymət təsnifatı are `requires: 'canManageCatalog'` in the
    menu, and `/products` and `/products/categories` sit behind `RequirePermission canManageCatalog`. The four import
    controllers are `CanManageImports` at class level, so every `GET api/v1/imports/…` answers 403 to a Rəhbər.
    `PricingModeReviewQuery.OrderRequestId` (last, nullable) narrows the rows and the totals. The page reads
    `?order=`, and `pricingReviewLink` (`analytics/basisParams.ts`) is the price warning's "Qiymət təsnifatına bax".
    `readOnlyNote` (`auth/labels.ts`) is shown on Təchizatçılar and Qiymət təsnifatı without `canManageCatalog`.
    `PlannedFeature.tsx` is deleted. The 05b carry-in is closed: a test proves the Rəhbər never sees those controls.
  - Go-live: restart the API on this commit before serving the new frontend. It sends `orderRequestId`, which an
    older API ignores.
  - For Task 15: the pricing page a Rəhbər can now open still shows product codes and the sheet:row reference
    (technical words, Task 5's scope).

- Task 16a — İmport yoxlamasında qiymət təsnifatı: server və data (Task 16, part 1 of 2)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-16a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - **Real database changed (schema only):** `20260925180000_AddImportRowPricingClassification` is applied to
    `baxorders_dev` through `tools/BaxOrders.ImportPricingMigration`. The four `ImportRows.PricingClassified*`
    columns are NULL on all 6,291 rows, and `--verify` found 22,242 of 22,242 figures unchanged, with HD-002 equal by
    both hashes. Backup: `C:\Users\HP\BaxOrders-backups\baxorders_dev-task16a-20260925-121335.dump`.
  - The one rule is `Application/Imports/Pricing/ImportLinePricing.cs` (`ModeOf`, `StateOf`, `ImportPricingCounts`).
    It reads the price and the review's classification only. The API is `GET/POST api/v1/imports/{id}/pricing`
    (`ImportPricingController`, `CanManageImports`). Sending `Unresolved` clears a classification. An imported line's
    mode never comes from its supplier; a line built by hand keeps the seed. A classified row becomes one
    `OrderItemPricingDecision` in the classifier's name, reason `Import #N yoxlamasında təsnif edilib`.
  - Fields 16b reads, all appended at the end of their records:
    - readiness `warnings.unclassifiedPrice` / `priceRequired` / `priceNotRequired`;
    - preview `unclassifiedPriceRows` / `priceRequiredRows` / `internalSupplyRows`, and per group
      `unclassifiedPriceItemCount` / `priceRequiredItemCount` / `internalSupplyItemCount`;
    - result `unclassifiedPriceItems` / `priceRequiredItems` / `internalSupplyItems`;
    - staging group `missingPriceRows` / `internalSupplyRows`. These count included rows only, while the group's
      `rowCount` / `unpricedRows` still count excluded rows too. Do not subtract one from the other.
    - Client: `api/importPricing.ts`.
  - Live figures: Qiymət təsnifatı reads Unresolved 0 / PriceRequired 0 / InternalFreeSupply 95, with 94 decisions.
    The brief's 94 "Təsnif edilməyib" are HD-002's rows. No supplier is `NotRequired`. For HD-002 and Task 15.
  - Go-live: restart the API on this commit (endpoints and new count meanings). Until 16b, imports land unpriced
    lines as «Təsnif edilməyib», to be classified on Qiymət təsnifatı. Recreate or reset the sandbox before 16b's
    live check.

- Task 16b — İmport ekranları Task 2-nin sözləri ilə (Task 16, part 2 of 2)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-16b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. No backend, schema, tool or data change, and no database access.
  - The price words live in one place, `pricing/labels.ts`. It now also holds `priceRequiredLabel`,
    `pricingModeLabels`, `pricingModeChipClass` (moved unchanged from `PricingModeReviewPage`), `pricingReviewPath`,
    and the import review's sentences.
  - The screens:
    - readiness gets a price strip: «N sətirdə qiymət yoxdur», the three-way split, the "… kimi düşəcək" warning,
      «Təsnif et» and the link;
    - the groups table shows `missingPriceRows` / `internalSupplyRows`;
    - the confirmation dialog's figures follow the skipped groups, and its link opens in a new tab;
    - the result panel shows the three facts, «N sətir … düşdü.» and the link;
    - the row detail shows «Qiymət: —».
  - The classification tab is `components/imports/review/PricingClassificationTab.tsx`, inside the review, named
    «Qiymət təsnifatı». Rows are ticked one by one. There is no select-all and no control by source. The tab is
    read-only once the batch has left review.
  - The import screens are swept with `findOldPriceTerms` (`src/test/oldTerms.ts`): the five price words, by name.
  - Frontend 44/884 → 51/957. Backend 1046 / 785, unchanged.
  - Go-live: the API must run 16a's commit or later. No migration. The owner's live check runs in the sandbox, after
    `sandbox.ps1 -Reset` (spec §12).
  - For Task 15:
    - non-price technical words left on the import screens (`REVIEWS/TASK-16b.md`, "Notes");
    - Qiymət təsnifatı's own buttons read «Şirkətdaxili təminat kimi qeyd et» / «Alış qiyməti tələb olunur», while
      the import tab reads «Ödənişsiz daxili təminat kimi qeyd et» / «Alış qiyməti tələb olunur kimi qeyd et».
- **Task 16 — Import ekranlarında qiymət vəziyyəti: complete** (16a + 16b). The split did not change the queue order.

- Task 15a1 — Yekun audit dəsti: ön səhifə, hazırlıq, qaytarma, hesabat skeleti, baza testləri (Task 15a, part 1 of 5)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15a1.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only: `README.md`, `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md` and `06-hesabat-skeleti.md` under
    `docs/audits/2026-final-enver-muellim-audit/`. No code, test, tool or data change. No database command.
  - Baseline suites on the unchanged tree: frontend 51 / 957, backend 1046 / 785, both builds clean.
  - For the later parts:
    - 15a3's checklist must use the exact marker `---- operator doldurur ----`, which 05 relies on;
    - 15a2's `04-sandbox.md` should cover a possible `bin` lock when the real API and `sandbox.ps1 -Run` both run
      `src/BaxOrders.Api`. This is unverified.

- Task 15a2 — Yekun audit dəsti: yalnız oxuyan əmrlər və sınaq mühitinin addımları (Task 15a, part 2 of 5)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15a2.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only: `03-emrler.md` and `04-sandbox.md` under `docs/audits/2026-final-enver-muellim-audit/`, and the
    `04-sandbox.md` cell of that folder's `README.md`. No code, test, tool or data change. No database command. Suites
    not re-run (Markdown only).
  - `03-emrler.md`: Əmr 1–4 (three `--inspect`s, and `ImportPricingMigration --verify`), the A-equals-J rule, and no SQL.
    `04-sandbox.md`: Sınaq 1 (approval flow, K2), Sınaq 2 (390 × 844), Sınaq 3 (Task 16 on a trimmed sandbox import),
    Sınaq 4 (Task 13 on the same data), Sınaq 5 (fallback), and a closing table per brief bullet.
  - For 15a3: there is **no** batch list on `/imports`. The batch states come from `03-emrler.md` §5.1 (Əmr 1 and
    Əmr 3), and no row may send an admin to `/imports?id=6`. The other pointers are in `REVIEWS/TASK-15a2.md`, "Notes".

- Task 15a3 — Yekun audit dəsti: yoxlama siyahısı — giriş, A, E, F, G, H, I, J, K (Task 15a, part 3 of 5)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15a3.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only: `02-yoxlama-siyahisi.md` under `docs/audits/2026-final-enver-muellim-audit/`. No code, test,
    tool or data change. No database command. Suites not re-run (Markdown only).
  - The file holds:
    - the preamble: the twelve-line row format with the marker `---- operator doldurur ----`, the verdict words, IDs
      and screenshots, screens and routes, brief words against screen words, and real-data safety;
    - 99 rows: A-01 … A-14, E-01 … E-27, F-01 … F-09, G-01 … G-02, H-01 … H-26, I-01 … I-12, J-01 … J-08, and the
      K-01 template;
    - empty headings for B, C and D.
  - The A IDs are fixed for 15a5's D rows. The gates are:
    - A-01 the date;
    - A-02 the commit;
    - A-04 the Rəhbər;
    - A-10, A-11 and A-12 G2's three totals, read by the Rəhbər at `/pricing-modes`;
    - A-13 the batch states;
    - A-14 the outcome.
  - For 15a4 and 15a5:
    - rows go directly under the B, C and D headings, in the preamble's format;
    - H-19, H-21, H-23 and H-25 point to "C bölməsində Task 12-nin sətirləri", which are 15a5's;
    - 15a5's whole-kit check should fix the example screenshot name `A-02-qiymet-tesnifati-1366.png` in `01` §7 and
      `05` §2. It is now `A-10-…`.

- Task 15a4 — Yekun audit dəsti: yoxlama siyahısı — B və C, `BRIEFS/TASK-04.md` … `TASK-09.md` (Task 15a, part 4 of 5)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15a4.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only: 1934 lines added to `02-yoxlama-siyahisi.md`, under the B and C headings. Nothing else in the
    kit changed. No code, test, tool or data change. No database command. Suites not re-run (Markdown only).
  - B-01 … B-79 cover every «Auditdə müşahidə edilən hazırkı problem» bullet of briefs 04–09, with one row per
    example. C-01 … C-34 cover every «Acceptance» bullet of those briefs. Task 4's C rows run in the sandbox, by
    `04-sandbox.md` «Yekun cədvəl».
  - For 15a5:
    - B continues from **B-80**, above the C heading (line 1722). C continues from **C-35**, above the D heading
      (line 2323). The IDs here are fixed.
    - The dashboard table does not show the cause product; only the attention card does (`LocationRows.tsx`:258–275).
    - The `A-02-…` screenshot-name fix is still owed (above).

- Task 15a5 — Yekun audit dəsti: yoxlama siyahısı — B və C (`BRIEFS/TASK-10.md` … `TASK-14.md`, `TASK-16.md`), B-nin
  dörd "Xeyr" sətri, D bölməsi və bütün dəstin yoxlanışı (Task 15a, part 5 of 5)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15a5.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only. Changes under `docs/audits/2026-final-enver-muellim-audit/`:
    - `02-yoxlama-siyahisi.md` gains 1672 lines and loses none (patience diff);
    - `01-hazirliq.md` and `05-neticeler-qaytarilmasi.md` change one example file name each, `A-02-…` → `A-10-…`.

    No code, test, tool or data change. No database command. Suites not re-run (Markdown only).
  - The new rows:
    - B-80 … B-121: the first-audit findings of briefs 10–14;
    - B-122 … B-125: one summary row for each of the first audit's four "Xeyr" reasons;
    - C-35 … C-68: the «Acceptance» bullets of briefs 10–14 and 16;
    - D-01 … D-20: the twenty journal decisions.

    Writes run only in the sandbox, by `04-sandbox.md` «Yekun cədvəl», with Sınaq 5 as the fallback.
  - **Task 15a — the operator's kit: complete** (15a1 … 15a5). The checklist has 312 rows: A 14, B 125, C 68, D 20,
    E 27, F 9, G 2, H 26, I 12, J 8, K 1.
  - For 15b:
    - B-100 onwards have three-digit IDs, although the preamble and "Shared by all five" below say two digits;
    - the "Xeyr" rows and the D rows copy other rows' verdicts, so check them against the rows they cite.

- Task 15b — Yekun audit: hesabat (Task 15, part 2 of 2)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-15b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Documentation only. The report is `docs/audits/2026-final-enver-muellim-audit.md`. The commit also carries the
    operator's `neticeler.md`, unchanged (sha256 `7ff5a4a6…283c91`), as the report's evidence. No code, test, tool or
    data change, and no database command.
  - **What was accepted is the report, not a passed audit.** The report says:
    - section A passed: G1 keçdi; G2 keçdi on command evidence only; G3 qismən, because the sandbox (A-05) was not
      run;
    - all 298 B … K rows are «yoxlanıla bilmədi — DEFERRED_BY_OWNER»;
    - the answer is **Xeyr**;
    - brief acceptance bullets 2 and 3 are **not met**.
  - Proposed findings, not tasks:
    - **N-01, P0, Task 04:** no active user with approval authority except the temporary `audit.rehber`, whose
      password nobody knows. This is an owner action in İstifadəçilər.
    - **N-02, P3, Task 11:** a one-off frontend test timeout. The re-run was green.
  - Suites: frontend 51 / 957 on re-run (the first run had 1 timeout); backend 1046 / 785; both builds clean.
- **Task 15 — Yekun Ənvər müəllim auditi: NOT complete as an audit.** 15a (the kit) and 15b (the report) are both
  accepted. The browser part of the audit is deferred by the owner, not done. See HD-009.

- Task 17 — Ortaq dialoq müqaviləsi (Qərar zənciri, 1 of 8)
  - Accepted by the Reviewer on 2026-09-25 — see `REVIEWS/TASK-17.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. `Modal` now has these, and every one of the 23 dialogs inherits them:
    - `Escape` closes the topmost dialog, and the event is marked as used before `onClose`;
    - focus moves in on open, cycles inside with Tab, and returns to the opener with `preventScroll`;
    - `aria-labelledby` and `aria-describedby`;
    - an opt-in `dismissOnBackdrop`.
  - New `dialogStack.ts`, which asks "am I on top?" when the key arrives.
  - `dismissOnBackdrop` is set only on the product history, «Mənbə», and the row detail in its reading state.
  - `InfoHint` takes its own `Escape` in the capture phase.
  - One existing test changed: `oldTerms.test.tsx`:1076. It now checks the name and the description separately, with
    the same two texts.
  - Suites: frontend 54 / 990 (from 51 / 957); backend 1046 / 785, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/17-dialoq-yoxlamasi.md` (A-01 … A-12) is prepared for the operator
    and not run. The Coder did no browser check.
  - For 19 and 23: they apply this contract and do not re-implement it. Open any inner dialog on a later render, not
    in the same commit as its parent.

- Task 18 — Səbəbdən drayverə keçid (Qərar zənciri, 2 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-18.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. The page owns `?cause=` (`new | qty | price | dropped | noprice | steady`) through the new
    `analytics/decisionParams.ts` (`parseCause`, `withCause`, push only, and `null` for no change). `CauseSummary`
    (`selected` / `onSelect`) and `DriverList` (`filter` / `onFilter` / `headingRef`) are controlled and router-free.
  - `components/decisions/causeFilter.ts` holds `driverFilterForCause`. It gives a chip for five reasons, and `null`
    for Services, InternalSupply and VariantChange. It also holds `rowsUnder` / `matches`, moved verbatim.
  - An interactive reason is a stretched button around the pill. The ⓘ sits in a `relative` wrapper with no z-index,
    on purpose.
  - Only a reason click scrolls, to the `scroll-mt-20` heading, and it respects reduced motion.
  - `causeListCountNote` (`labels.ts`) explains 58 vs 60 under the reason, and no figure changed.
  - The selected chip is always offered, even at 0.
  - Suites: frontend 56 / 1047 (from 54 / 990); backend 1046 / 785, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/18-sebeb-kecidi.md` (B-01 … B-14) is prepared for the operator and
    not run. The Coder did no browser check. No API restart is needed.
  - For 19: extend `decisionParams.ts` with `product`, and keep "push, and no push when nothing changes". If the
    history moves into the URL, Back must undo the history first and the filter second.

- Task 19 — Məhsul tarixçəsi çekməcəsi (Qərar zənciri, 3 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-19.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. The product history is a right-hand drawer, full-screen below `sm`: Task 17's `Modal` with a new
    `placement="right"`, wrapped as `components/imports/review/Drawer.tsx`. The `'center'` output is pinned
    byte-identical in `Modal.test.tsx`, so the other 22 dialogs are unchanged.
  - `?product=` lives in `analytics/decisionParams.ts` (`productParam`, `withProduct`, `null` on no change). Opening
    pushes with a `productDrawer` state marker. Closing is `navigate(-1)` after an in-page open, or a `replace` after
    a deep link, with a guard per `location.key` against a double close. Back undoes the history first and the filter
    second. Nothing is re-fetched.
  - The frequency sentence is first in the drawer. With `orderedMonthCount === 1` there is no chart, no metric toggle
    and no gaps note; the table and the weighted-price ⓘ stay. No new wording or calculation.
  - `TrendModal` keeps its name. `DriverList.tsx` did not change.
  - Suites: frontend 57 / 1101 (from 56 / 1047); backend 1046 / 785, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/19-mehsul-cekmecesi.md` (C-01 … C-16) is prepared for the operator
    and not run. The Coder did no browser check.
  - For 20: the product row's restyle must keep its single `<button>` and `onHistory(driver)`, so the URL, Back and
    focus behaviour stay. For 23: `Drawer` is ready for the source sections.

- Task 20 — Klik affordansı (Qərar zənciri, 4 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-20.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. The attention card, the dashboard table row and the phone row are surfaces: `openSurfaceLink`
    (`components/interaction.ts`) hands a plain click to the one `a[data-surface-link]`, the object's name. It ignores
    modifier, middle, handled and selection-ending clicks, and clicks inside
    `a, button, input, select, textarea, label, summary, [role="button"], [role="note"]`. `useScrollMemory` still sees
    a click on an `<a>`, so Back returns to the card or row.
  - `components/dashboard/details.tsx` replaces `DetailsLink` with `detailsTarget`, `detailsName` and `DetailsCue`
    (an `aria-hidden` span). The table's right-hand column is gone and its footer cell is `colSpan={2}`. Every row is
    a surface; destinations, `basis`, anchor ids and the name `<object> · Detallara bax` are unchanged.
  - The shared classes (`interactiveSurfaceClass`, `interactiveRowClass`, `surfaceLinkClass`, `rowLinkClass`,
    `interactiveTextClass`) are the only hover, focus and cursor states on a card or row. The test helper
    `expectInert` (`test/interaction.ts`) pins inert text.
  - `DriverList`'s row is still one `<button>` with `aria-haspopup="dialog"`, and a lucide `History` icon after the
    name. `DecisionHeadline`'s available secondary basis is a boxed button whose `after:` layer covers the name, with
    `aria-labelledby` term + button.
  - Suites: frontend 58 / 1158 (from 57 / 1101); backend 1046 / 785, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/20-klik-affordansi.md` (D-01 … D-15) is prepared for the operator
    and not run. The Coder did no browser check. No API restart is needed.
  - For 21: the card is now a surface. Anything new inside it that must keep its own click has to match the ignore
    selector above, or it will open the order, and the card must keep exactly one link (20.1). Write on top of this
    commit. For 24: `interaction.ts` is ready for its one-control rule, and `TASK-20.md` §12's `LocationsPage` notes
    (hover-only rows, two links per row) are still open.

- Task 21 — Panel iyerarxiyası və baza əhatəsi (Qərar zənciri, 5 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-21.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - The attention card leads with the change. The delta is `cardPrimaryFigureClass` on amount and warning cards, and
    the percentage is primary on `StrongPercentageChange` cards, with the other figure beside it as
    `cardSecondaryFigureClass`. `Bu ay {amount}` follows, uncoloured, then the 9.1 direction sentence. A no-delta card
    keeps its amount as the largest figure.
  - The summary keeps `current.knownAmount` as the headline. It is followed by an amber `knownAmountHint` line when a
    price is owed, and then an always-present cohort block: `role="group"`, named `Müqayisə olunan N obyekt`, with the
    basis, `Bu ay · Baza · Fərq · %`, the direction sentence and the objects left out. This is one arrangement for
    every basis and every month. `Subtraction` and `comparedAmountLine` are gone.
  - `Baza N/M ay` (`baselineCoverageNote`, `coverage/labels.ts`) appears in slate, only where a delta is shown over a
    `Partial` baseline: on the card, in the Dəyişmə cell and on the phone row. It is never `təxmini`.
  - Backend: one line, `ThenBy(item => item.Rank)` in `ManagementDashboardQueries.Attention`, so the largest
    percentage comes first. There is a new theory over every basis and a new fact that was red against the old line.
    The selection is unchanged.
  - Suites: frontend 59 / 1195 (from 58 / 1158); backend 1046 / 791 (from 785); both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/21-panel-iyerarxiyasi.md` (E-01 … E-18) is prepared and not run. The
    running API must be restarted to serve the new card order.
  - 21.5's materiality threshold is still the owner's number, and it was not introduced.

- Task 22a — Tarixi təsdiq ifadəsi: sifariş səhifəsi (Qərar zənciri, 6 of 8; Task 22, part 1 of 2)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-22a.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only, and wording only. No order's status, version or amount changed, and there is no API, backend or
    data change.
  - The order page's header shows the unchanged `✓ Təsdiqlənib` badge. For a historical order, the 22.2 phrase sits
    beside it in slate (`historicalImportChipClass` = `workflowActionClass.ImportedAsApproved`).
  - The decision panel's one sentence is `historicalImportNote`: the 22.2 phrase, then `historicalApprovalReason`
    (22.3). 4.1's sentence is retired, and its surviving half still holds: nothing is invented.
  - `components/workflow/OrderStatusBadge.tsx` (`status`, `isHistoricalImport?`, `size?`) is the one component for
    22b. Without the flag, its output is byte-identical to the old `StatusBadge`.
  - The header gets the flag through `WorkflowPanel`'s new `onLoaded`, matched on `orderRequestId`, with no new request.
    The page still calls `fetchWorkflow` twice, as at `b6b987c`: the panel and `HistoryTabs`.
  - Suites: frontend 60 / 1219 (from 59 / 1195); backend 1046 / 791, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/22-tarixi-tesdiq.md` (F-01 … F-08) is prepared and not run. 22b
    continues it from F-09. No API restart is needed.
  - Out of scope and left alone: `04-sandbox.md` Sınaq 1 step 8 (Task 15's record) and a comment in
    `SandboxScenario.cs`:67–68 still quote 4.1's sentence.

- Task 22b — Tarixi təsdiq ifadəsi: siyahılar və aylıq hesabat (Qərar zənciri, 6 of 8; Task 22, part 2 of 2)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-22b.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - HD-010 option 1 (22.4): one read-only boolean, and no status, event, permission, schema, migration or data change.
  - The rule lives once in `Application/Orders/Workflow/HistoricalImportRule.cs`:
    - `Holds` is moved out of `WorkflowDecisionFactsDto.Compute`;
    - `EarlierVersions` is moved out of `OrderWorkflowService.DecisionFactsAsync`;
    - `AmongAsync` answers for a page in 0 queries for none, or 2 for any number.
  - New fields, each last with default `false`: `LocationOrderSummaryDto.LatestRequestIsHistoricalImport`,
    `LocationOrderHistoryEntryDto.IsHistoricalImport` and `MonthlyReportCellDto.IsHistoricalImport`. An agreement
    test pins them to `DecisionFacts.IsHistoricalImport` for every kind of order, including a chained correction.
  - The objects list, the object page's rows and its latest-order card use 22a's `OrderStatusBadge`. The report says
    the phrase in the cell's description through `workflowStatusText`; its dot and legend are unchanged.
    `showsHistoricalImport` (`components/workflow/labels.ts`) is the one condition.
  - Cost: +2 queries on the list and the object page; the report goes from 4 to 6 (`MonthlyReportTests`, the only
    changed expectation). The order page is unchanged.
  - Suites: frontend 60 / 1266 (from 60 / 1219; one run of three had an unrelated flake in
    `OrderDecisionPage.test.tsx`:758); backend 1055 / 800 (from 1046 / 791); both builds clean.
  - Manual pack `22-tarixi-tesdiq.md` F-09 … F-16 is prepared and not run.
  - Go-live: restart the API on this commit for the lists to show the phrase. An old API only means the plain badge.
- **Task 22 — Tarixi təsdiq ifadəsi: complete** (22a + 22b). The split did not change the queue order.

- Task 23 — Mənbənin mərhələli açılışı (Qərar zənciri, 7 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-23.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only, and presentation only. There is no backend, API, figure or data change, and no `DATA_MIGRATION`.
  - **The lines (23.1).** On the order page, the `Sətirlər` heading is now the disclosure: an `h2` holding one
    `<button>` with `aria-expanded` and `aria-controls` (from `useId`), and the grey count `formatCount(itemCount)`.
    - The always-rendered `<div id>` holds the toolbar, table, card list and pagination only while open. Their markup
      is unchanged (`git diff -w`).
    - The state is `linesOpenFor` (an order id), not in the URL. It folds for another order and survives `reload()`.
    - The `fetchOrder` effect is untouched, so there is no lazy fetch.
  - **The dialog (23.2).** `ItemSourceDrawer.tsx` and `components/imports/labels.ts` are untouched. A new
    `ItemSourceDrawer.test.tsx` pins every fact, column, marker, the lineage and the closing note.
  - **The counting sentence (23.3).** `driverScopeLine` moved word for word into an `InfoHint` beside the «Əsas
    dəyişikliklər» `h2` (`driverScopeHintLabel = '«Hamısı» nəyi sayır?'`). The heading's name, `headingRef` and
    `scroll-mt-20` are unchanged. `productStateLine` stays visible.
  - Suites: frontend 61 / 1286 (from 60 / 1266); backend 1055 / 800, unchanged; both builds clean (backend built
    with `--artifacts-path`, because the API locks `bin`).
  - Manual pack `docs/audits/2026-qerar-zenciri/23-menbe-aciilisi.md` (G-01 … G-11) is prepared and not run. G-03
    measures the height before and after. No API restart is needed.
  - Brief acceptance 5's second half is met only by the moved sentence's height. The lines were already below «Niyə
    dəyişib?» and «Əsas dəyişikliklər» at every width, so folding them lowers the page but does not raise those two
    (`REVIEWS/TASK-23.md`, Notes).
  - Later clean-ups:
    - `components/SectionHeader.tsx` is now unused;
    - `orderStatusLabels` still duplicates `workflowStatusLabels`;
    - Task 15's `04-sandbox.md` Sınaq 1 step 6 now needs `Sətirlər` opened first.

- Task 24 — Obyekt səhifəsi və aylıq hesabata qayıdış (Qərar zənciri, 8 of 8)
  - Accepted by the Reviewer on 2026-09-26 — see `REVIEWS/TASK-24.md`
  - Accepted commit: see `STATE.json` (`lastAcceptedCommit`, recorded by the runner)
  - Frontend only. There is no backend, API, figure or data change, and no `DATA_MIGRATION`.
  - **The object page (24.1, 24.2).**
    - Each period row has one link, its period, with the same `href` and basis. The row is a Task 20 surface
      (`openSurfaceLink`, `interactiveRowClass`), and the table has three columns.
    - `Müqayisə et` and its `TrendingUp` icon are deleted, with nothing in their place. The card keeps its one
      `Sifarişə bax`.
  - **The strip (24.4).** Each filled month is one `Link` to its order with the basis. Its name is the bar's title,
    plus the owed-price count when there is one. The last month is `bg-slate-600`, with a bold label and
    `aria-current="true"`. A gap is a plain `<div>`.
  - **The report (24.3).**
    - The table rows carry `row-{id}` and the phone cards `row-{id}-phone`. `MonthlyReportPage` is wired to
      `useScrollMemory`, which is unchanged.
    - `search` is kept, as it was already in the URL. Tests prove it survives Back and reload.
  - **The way back (24.3).** `navigation/monthlyReportReturn.ts` owns `back=monthly` and the `{ monthlyReport: true }`
    marker. The order page's `Aylıq hesabat` goes Back on the report's own entry and otherwise links to
    `/dashboard/monthly?year={year}`. A per-entry guard stops a double click from going Back twice.
  - Suites: frontend 62 / 1340 (from 61 / 1286); backend 1055 / 800, unchanged; both builds clean.
  - Manual pack `docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md` (H-01 … H-17) is prepared and not run. No
    API restart is needed.
  - Later:
    - the staleness line needs a system-wide latest period or `monthsSinceLastOrder`;
    - `LocationsPage.tsx`'s `TASK-20.md` §12 notes are still open;
    - `App.tsx`:76–80's comment still names the rows' «Müqayisə».
- **The decision chain 17 → 24 is complete.**

## Current

- **No active task. The queue is empty and the workflow is `DONE`** (owner closeout, 2026-09-26). The decision chain
  17 → 24 is accepted as implemented through `f960195`. HD-009 is closed: Task 15 stands as reported, and its
  remaining browser portion is deferred by the owner — not passed, and not to be recorded as passed. See HD-009 below.
- `SONRAKI_IMKANLAR.md` (TASK-25 … TASK-29) is **not** in the queue and is not to be started. Each needs its own
  brief and its own owner decision.
- The only item left is operational, not workflow work: **N-01**, the owner's own action in İstifadəçilər — create or
  activate Ənvər müəllim's real Rəhbər account through the application's supported UI or API, and only then deactivate
  the temporary `audit.rehber`. No direct SQL, and no audit history is deleted.

## Previous — Task 24 as it stood while active (record kept)

- **Task 24 — Obyekt səhifəsi və aylıq hesabata qayıdış** (Qərar zənciri, 8 of 8) — **accepted 2026-09-26**
  (`REVIEWS/TASK-24.md`)
  - Brief: `BRIEFS/TASK-24.md`, with the owner's decisions 24.1 … 24.4 in `BRIEFS/OWNER_BRIEFS_MASTER.md`.
  - Specification `TASKS/TASK-24.md` is **READY**. The Planner verified §2 against `4e6acad` on 2026-09-26. The task
    is one part, not split. Frontend only, with no `DATA_MIGRATION`.
  - Planner findings at `4e6acad`:
    - the report's search is **already** in the URL as `search`, with `replace: true`, and has been since `86bc4d8`.
      It is kept, not renamed to the draft's `q`, and the Back and reload journey is proven by tests;
    - `from` belongs to the basis (the custom range) and `normalizeBasis` deletes it, so the report return uses
      `back=monthly`;
    - the report route is `/dashboard/monthly`, and its phone cards are in the DOM beside the table, so they take
      `row-{id}-phone` as the dashboard's do;
    - the card, `Müqayisə et` and the first row open one order (`LocationOrderQueries.cs`:267–269, :303–304);
    - the location payload has no system latest period, so the staleness line is deferred.
  - How the owner's decisions land:
    - 24.1: one link per row, the period, and the row becomes a Task 20 surface; the card keeps its `Sifarişə bax`;
    - 24.2: `Müqayisə et` is deleted with no replacement. Under a filter or on page 2 it was the only way to the
      latest order, and that is stated rather than replaced;
    - 24.3: the report's rows get the ids `useScrollMemory` already matches, and the page is wired to the hook.
      `Aylıq hesabat` on the order page goes Back on the entry the report opened (Task 19's history-marker pattern),
      and otherwise links to the report's year;
    - 24.4: filled months in the strip link to their order with the basis. The latest order's month is darker, with a
      bold label and `aria-current`.
  - `LocationsPage.tsx` (the directory, `TASK-20.md` §12) stays outside this brief and is recorded again. Manual pack
    `24-obyekt-ve-qayidis.md` (H-01 … H-17).
  - Inherits from 08 and 11. Depends on 20: `components/interaction.ts` holds the one-control rule, and `TASK-20.md`
    §12's `LocationsPage` notes (hover-only rows, two links per row) are this task's to carry.
  - This is the last task of the decision chain. After it, the queue is empty: HD-009 stays the owner's, and
    `SONRAKI_IMKANLAR.md` (TASK-25 … TASK-29) is not in the queue.

## Previous — no longer active (records kept as they stood)

- **Task 23 — Mənbənin mərhələli açılışı** (Qərar zənciri, 7 of 8) — **accepted 2026-09-26** (`REVIEWS/TASK-23.md`)
  - Brief: `BRIEFS/TASK-23.md`. Specification `TASKS/TASK-23.md` is **READY**. The Planner verified §2 against
    `112c2d7` on 2026-09-26. The task is one part, not split.
  - Planner findings at `112c2d7`:
    - the line table is paginated on the server, 50 per page;
    - a phone card list carries its own `Mənbəyə bax`;
    - the correction's row actions live inside the section;
    - Excel row numbers and version facts appear only inside «Mənbə».
  - How the owner's decisions land:
    - 23.1: the `Sətirlər` heading becomes the disclosure, with the count from `itemCount`. The rows render only when
      it is open. The fetch is unchanged, and the state is not in the URL;
    - 23.2: `ItemSourceDrawer.tsx` is frozen, and a new field-list test guards it;
    - 23.3: `driverScopeLine` moves verbatim behind an `InfoHint` beside «Əsas dəyişikliklər», and
      `productStateLine` stays visible.
  - Frontend only, with no `DATA_MIGRATION`. Manual pack `23-menbe-aciilisi.md` (G-01 … G-11): the operator measures
    the height before and after (G-03).
  - Inherits from 03 and 10. Depends on 17: it applies the `Modal` / `Drawer` contract and does not re-implement it
    (`Drawer` is ready from 19).
  - Out of scope for it and left alone by 22: `components/imports/labels.ts`'s `orderStatusLabels` and
    `ItemSourceDrawer` were named in 22b's out-of-scope list as Task 23's.

- **Task 22 — Tarixi təsdiq ifadəsi** (Qərar zənciri, 6 of 8) — **accepted: 22a and 22b**
  - Brief: `BRIEFS/TASK-22.md`, the owner's source of truth, with decisions 22.1 … 22.3 in
    `BRIEFS/OWNER_BRIEFS_MASTER.md`.
  - **Split by the Planner on 2026-09-26 into 22a → 22b.** The split is a planning decision and does not change the
    queue. §2 was verified against `b6b987c` in `TASKS/TASK-22a.md` §2. `TASKS/TASK-22.md` stays as the adopted
    draft, with a split note at its top.
    - **22a** (`TASKS/TASK-22a.md`, **accepted** 2026-09-26, `REVIEWS/TASK-22a.md`; commit: see `STATE.json`): the
      order page. The header shows `✓ Təsdiqlənib` and beside it the
      22.2 phrase. The decision panel's sentence gives the 22.3 reason and drops 4.1's sentence, which 22.3 retires.
      A new `components/workflow/OrderStatusBadge.tsx` holds it, for 22b to reuse. The header gets the flag from the
      panel's existing load (`onLoaded`), so there is no new request. Brief acceptance 1, 2, 3, 5, 6.
    - **22b** (not yet specified): the objects list, the object page's period rows and latest-order card, and the
      monthly report's dot, description and legend. Brief acceptance 4. **Waits on HD-010.** The Planner for 22b sets
      `HUMAN_REQUIRED` with reason `TASK_22B_HD010_OPEN` if HD-010 is still unanswered when 22b comes up.
      **Set on 2026-09-26: HD-010 unanswered, state `HUMAN_REQUIRED`.**
      **HD-010 answered the same day (option 1, decision 22.4).** The Planner wrote `TASKS/TASK-22b.md` (READY,
      verified at `cc46329`):
      - A new `HistoricalImportRule` holds the rule, moved out of `Compute`, and the chain walk, moved out of
        `DecisionFactsAsync`. The order page and the lists share it.
      - The read-only flag goes on the three DTOs, filled by two fixed queries.
      - 22a's `OrderStatusBadge` goes on the objects list, the object page's rows and its latest-order card.
      - The phrase goes in the monthly report cell's description; its dot and legend are unchanged.
      - The report's query-count test moves from 4 to 6.
      - No status, event, permission, schema or data change.
  - Frontend wording only in 22a. No order's status, version or amount changes, and there is no migration marker.
  - Inherits from 04. Depends on nothing.

- Task 15 — Yekun Ənvər müəllim auditi — **finished and reported; no longer the active task.** 15b is accepted at
  `f011924`. **HD-009** stays open as the owner's own decision — call Task 15 `DONE`, or resume the deferred browser
  part later. The owner adopted the decision chain on top of it on 2026-09-25, so HD-009 blocks nothing and no role
  acts on it. The record below is kept as it stood.
  - Brief: `BRIEFS/TASK-15.md`. This is the mandatory owner source of truth.
  - HD-006 is resolved (answers at the end of this file). On 2026-09-25 the Planner filled the **[HD-006 Qn]** parts of
    `TASKS/TASK-15.md`, which is now the audit **protocol**. Because the owner's operator runs the audit (A3), the
    task is **split** into two Coder parts with a human step between them. The split is a planning decision and does
    not change the queue:
    - **15a — the operator's kit**: `TASKS/TASK-15a.md`, unchanged and still governing. The Coder writes the
      checklist, the read-only commands, the sandbox steps and the report skeleton under
      `docs/audits/2026-final-enver-muellim-audit/`, and runs the suites as a baseline. Documentation only; no database
      command. HD-007 is resolved (below).
      - **Split again on 2026-09-25 (Planner), into five sub-parts.** Five Coder runs of the whole of 15a wrote
        nothing. The longest carried about 400,000 tokens of context, all spent reading, and was cut off with no file
        written (`CURRENT_TASK.md`, operator's note; `LOGS/20260925-144944-cycle01-coder.jsonl`). Each sub-part has its
        own reading list and writes as it goes. Only the current sub-part's specification exists; the next is planned
        from `TASK-15a.md` and this map once the previous part is accepted:
        - **15a1** (**accepted** 2026-09-25, `REVIEWS/TASK-15a1.md`; commit: see `STATE.json`): `README.md`,
          `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md`, `06-hesabat-skeleti.md`, and the regression suites (the
          baseline). `TASK-15a.md` §4.1, §4.2, §4.6, §4.7, §5.
        - **15a2** (**accepted** 2026-09-25, `REVIEWS/TASK-15a2.md`; commit: see `STATE.json`): `03-emrler.md` and
          `04-sandbox.md`. `TASK-15a.md` §4.4, §4.5.
        - **15a3** (**accepted** 2026-09-25, `REVIEWS/TASK-15a3.md`; commit: see `STATE.json`):
          `02-yoxlama-siyahisi.md` — the preamble (row format, the screens and their routes), and sections A, E, F, G,
          H, I, J, K of `TASK-15a.md` §4.3, with empty headings for B, C and D. The A row IDs (A-01 … A-14) are fixed
          there, for 15a5's D rows.
        - **15a4** (**accepted** 2026-09-25, `REVIEWS/TASK-15a4.md`; commit: see `STATE.json`): sections B and C of the
          checklist for `BRIEFS/TASK-04.md` … `TASK-09.md`. The IDs are fixed there: B-01 … B-79 and C-01 … C-34.
        - **15a5** (**accepted** 2026-09-25, `REVIEWS/TASK-15a5.md`; commit: see `STATE.json`): B-80 … B-121
          for `TASK-10.md` … `TASK-14.md`, B's four "Xeyr" summary rows B-122 … B-125, C-35 … C-68 for `TASK-10.md` …
          `TASK-14.md` and `TASK-16.md`, section D (D-01 … D-20), the `A-02-…` → `A-10-…` screenshot-name fix in `01`
          §7 and `05` §2, and the whole-kit check of `TASK-15a.md` §8 items 1, 2, 3, 6 and 7. The IDs are fixed
          there. On acceptance the Reviewer opens HD-008 (`TASK-15a5.md` §12).
        - Shared by all five: check IDs are `<section letter>-<two digits>` (`A-02`, `C-17`); screenshots are
          `<ID>-<ekran>-<en>.png`. The suites run once, in 15a1; 15a2 … 15a5 change only Markdown under `docs/audits/`.
        - The split changes no requirement of `TASK-15a.md` or the protocol. Every item of `TASK-15a.md` §2 and §8
          lands in one sub-part (`TASK-15a1.md` §1, §2).
    - **HD-008 — the operator runs the kit** (**CLOSED 2026-09-25 — DEFERRED BY OWNER**; see "Human Decisions /
      Blockers" below). Section A of the kit was run and all six preconditions pass. The owner then deferred the
      browser-only part — the Rəhbər login check, the click counts, the viewport checks, the screenshots and the
      sandbox walkthrough, and with them B … K — as an explicit decision. Those rows are recorded
      `DEFERRED_BY_OWNER` in `neticeler.md`, never as passes, and `ekranlar/` is empty.
    - **15b — the report** (**accepted** 2026-09-25, `REVIEWS/TASK-15b.md`; commit: see `STATE.json`. Now blocked
      at HD-009; `TASKS/TASK-15b.md`, Planner, 2026-09-25): the Coder assembles
      `docs/audits/2026-final-enver-muellim-audit.md` from `neticeler.md` as it stands, per protocol §7, and runs the
      suites again.
      - Section A's gates and figures are reported with their sources. Every B … K row (298) is listed by ID as
        «yoxlanıla bilmədi — DEFERRED_BY_OWNER», never as passed. No screenshot exists, and none is referenced.
      - One new finding comes from section A's evidence: **N-01**, P0. Before the audit no active user held approval
        authority. The only one now is the temporary `audit.rehber`, whose password nobody knows. The proposed action
        is the owner's, through İstifadəçilər, and it is not a code change.
      - The answer rule gives **Xeyr**. The brief's acceptance bullets 2 and 3 are reported as not met.
      - On acceptance the spec (§10) recommends `HUMAN_REQUIRED` rather than `DONE`, because the audit's browser part
        was deferred, not waived.
  - Each part carries named acceptance criteria of the protocol's §9; together they carry all of them
    (`TASKS/TASK-15a.md` §2).
  - The brief says this task builds nothing and changes no code. It is a read-only audit, done with a Rəhbər account,
    and it proposes new tasks for new findings.
  - Gates the brief itself sets, for the Planner to carry and not to decide:
    - 15.1: whether the latest month is complete (October or September) is agreed with the owner before the audit
      starts;
    - 15.2 / 15.2a: the audit may not start while Qiymət təsnifatı has a «Təsnif edilməyib» line, or an «Alış qiyməti
      tələb olunur» line with no price. The last recorded live figures (16a) were Unresolved 0 / PriceRequired 0 /
      InternalFreeSupply 95, but they must be read again. HD-002 (94 rows) is resolved: they stand as settled (A4).
    - 15.1: September 2026, confirmed by the owner (A1).
    - Batch #6 in `baxorders_dev` is still `NeedsReview`. If it is confirmed before the audit, it lands its unpriced
      rows as «Təsnif edilməyib» unless they are classified in review first.

## Queue

Fixed order, from the owner brief (`BRIEFS/OWNER_BRIEFS_MASTER.md`). **16 comes before 15, and 15 is always last.**
Titles are the brief's own. Each task's business requirements are in `BRIEFS/TASK-XX.md`; no task may be planned
without its brief.

```
04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 16 → 15
```

Task 04 ran as **04a → 04b**, and Task 05 as **05a → 05b**; all four are accepted. Neither split changed the order.
Task 13 ran as **13a → 13b → 13c**; all three are accepted. Task 14 is accepted. Task 16 ran as **16a → 16b**;
both are accepted. Task 15, the last, is current (above) and runs as **15a (15a1 → 15a2 → 15a3 → 15a4 → 15a5) →
HD-008 (operator) → 15b**. 15a1 … 15a5 are accepted, so 15a is complete. HD-008 is closed: section A was run and
the browser-only part was deferred by the owner. 15b is accepted at `f011924`. HD-009 stays open — Task 15 is
reported, not `DONE`, because the audit's browser part is deferred rather than complete. That is the owner's
decision to make and it does not block what follows.

### The decision chain — 17 → 24 (adopted 2026-09-25)

The owner adopted a second initiative on 2026-09-25, out of the UX/interaction audit of the running application. Its
briefs and specifications were staged under `AI_WORKFLOW/STAGING/DECISION_CHAIN/` and copied byte for byte into
`BRIEFS/TASK-17.md … TASK-24.md` and `TASKS/TASK-17.md … TASK-24.md`. The staging folder stays as the source
snapshot; the copies under `BRIEFS/` and `TASKS/` are what the workflow reads. The owner's decisions 17.1 … 24.3 are
merged into `BRIEFS/OWNER_BRIEFS_MASTER.md`.

```
… → 14 → 16 → 15 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24
```

| Task | Owns | Inherits from | Depends on |
|---|---|---|---|
| 17 (**accepted**) | the `Modal` primitive — every dialog | — | — |
| 18 (**accepted**) | the "Niyə dəyişib?" ↔ "Əsas dəyişikliklər" link | 06, 10 | — |
| 19 (**accepted**) | product history | 10 | 17, 18 |
| 20 (**accepted**) | click targets on panel cards and rows | 07, 09 | — |
| 21 (**accepted**) | panel hierarchy and the summary card | 09 | 20 |
| 22 (**accepted**: 22a + 22b) | the status badge and the approval wording | 04 | — |
| 23 (**accepted**) | the order page's source sections | 03, 10 | 17 |
| 24 (**accepted**) | the object page; the way back to the monthly report | 08, 11 | 20 |

Ownership, continuing Task 06's rule: **17 writes the dialog contract; 19 and 23 apply it** and do not invent their
own. **18 writes the URL module; 19 extends it.** 22 depends on nothing and could move earlier without breaking the
chain, but the order above is the one adopted.

Three rules the Planner carries and does not decide:

- **Every specification arrives `DRAFT — §2 UNVERIFIED. Not READY.`** They were written against the running
  application by a planning agent that could not read `AI_WORKFLOW/` and took no line numbers. Before a task becomes
  READY the Planner verifies §2 against the then-current accepted HEAD, replaces every `<line>` marker with a real
  `file:line`, corrects any assumption the code no longer supports, and only then sets READY. A specification that
  cannot be verified is `HUMAN_REQUIRED` — never a guess.
- **TASK-18 — the 58 vs 60 product count.** The page reads `Yeni məhsullar · 58 məhsuldan` while the chip reads
  `Yeni məhsullar 60`. If the two cannot be explained truthfully without changing a figure or an accepted count,
  stop with `BLOCKED_HUMAN` and ask the owner. Neither number is edited to make them agree.
- **TASK-21 — two gates, one of them already answered.**
  - **21.2 is resolved.** On 2026-09-25 the owner gave the hierarchy in decision **21.2a**
    (`BRIEFS/OWNER_BRIEFS_MASTER.md`): the true period total stays the large headline, the compared cohort sits
    below it as a clearly separate block, and the percentage belongs visually to the cohort and never to the
    headline. The real monthly total is never replaced, no figure is recomputed, and a responsive layout may wrap
    these values as long as the relationship stays unambiguous. **Do not stop on layout ambiguity** where that
    hierarchy satisfies 21.2.
  - **21.5 stands.** Which objects are too small to deserve a card is the owner's number, and 21.5 does not give
    one. Do not invent a threshold and do not hide a card; show the absolute delta and the baseline coverage so the
    reader judges significance. If the work truly cannot proceed without that number, stop with `BLOCKED_HUMAN`.

`SONRAKI_IMKANLAR.md` (TASK-25 … TASK-29) is **not** part of this chain and does not enter the queue. Each needs new
backend work or new business data, and each needs its own brief and its own owner decision.

## Cross-task decisions that are easy to get backwards

- **Task 04 creates the Rəhbər role and the approval authority** (4.3, 4.3a). Task 14 only applies menu and
  visibility rules to the role that already exists (14.2) — it must not create it.
- **Task 07** share = the top product's effect divided by the sum of all product effects in the same direction
  (7.1, 7.1a).
- **Task 13** shows an approved variant transition as one "variant dəyişib" line, and the overall monetary total
  must not move (13.1a).
- **Task 15** may not begin while any pricing classification is unresolved; "Alış qiyməti tələb olunur" rows with no
  price entered count as unresolved (15.2, 15.2a).
- **Task 09** owns the colour rule (9.1); 06, 07, 08, 10 and 11 apply it rather than inventing their own.

## Human Decisions / Blockers

### HD-001 — Task 3 real-data migration — RESOLVED

Owner approval received.

Task 3 may be executed according to the current Task 3 specification, including:

- required database backup;
- dry-run / reference inspection;
- approved object catalogue changes;
- import alias protection;
- invariant verification.

All STOP conditions in the Task 3 specification remain mandatory.

Approval applies only to the explicitly documented Task 3 changes.

### HD-002 — 94 pricing-classification rows

Status: RESOLVED on 2026-09-25 — the owner confirmed the reclassification was intentional.

All 94 rows come from `Qala baza`, and the owner confirms they are what the change says they are: goods issued from
the company's own store without payment. `Unresolved → InternalFreeSupply` stands. Nothing is reverted, and no price
is owed on them, so they are settled rather than open and gate 15.2 is satisfied for them.

The evidence the decision was taken on, so a later reader can weigh it: 94 rows, every one supplied by `Qala baza`,
changed between 12:03:26 and 12:04:23 on 2026-09-24 by `Administrator` in a single bulk action, with no reason
recorded on any of them. By period: Yanvar 7, Fevral 25, Mart 3, Aprel 24, May 5, İyun 11, Sentyabr 19. The products
include consumables (ACE xlor, Domestos, rezin əlcək) and also equipment (drel, gül qayçısı Gardena, dərmanvuran
aparat akkumulyatorlu Master). It was put to the owner that `docs/business-decisions.md` records Qala baza as holding
both purchased and free goods, so a blanket classification of all 94 as free might be wrong for the equipment among
them. The owner considered that and confirmed the classification.

The original wording is kept below for the record.

Status when raised: OPEN — NON-BLOCKING FOR TASK 3

Task 3 must leave these 94 rows unchanged.

A confirmed audit trail shows that 94 rows were changed:

`Unresolved → InternalFreeSupply`

Audit details:

- Table/audit source: `OrderItemPricingDecisions`
- Records: 94
- Actor: `Administrator`
- Time: 2026-09-24 12:03:26–12:04:23

The fact that the change occurred is confirmed.

The unresolved business question is whether this reclassification was intentional and should remain, or whether it should later be reverted.

Until explicitly decided:

- do not modify these 94 rows;
- do not revert them;
- do not re-apply them;
- do not infer the intended classification;
- do not adjust pricing counters merely to make tests pass;
- preserve the current database state.

Task 3 left the 94 rows unchanged; `--verify` confirmed this by hash.

### HD-003 — Commit accepted Task 3 before Task 4 starts

Status: RESOLVED on 2026-09-24 — Task 3 is committed as `4827cb4`

All five steps below were carried out by the owner's operator:

1. `Pending.cs` deleted (it was zero bytes);
2. the Coder's full Azerbaijani report recovered from log line 1673 and saved to `LAST_REPORT.md`;
3. the suites re-run independently — 702 unit, 581 integration, 387 frontend, all green, both builds clean;
4. Task 3 committed as `4827cb4` (46 files, +3876/−212); `AI_WORKFLOW/`, `run-agent.ps1` and `monitor-agent.ps1`
   were deliberately left out of that commit, because they are workflow infrastructure rather than Task 3;
5. the API restarted on the new code.

The original requirement is kept below for the record. It is history, not a live rule — where it disagrees with
HD-004 or with the current `WORKFLOW_RULES.md`, the current rules win. Its closing line about a §7 human gate for
Task 4 was written before HD-004 and no longer applies. This is not a state conflict.

Status when raised: OPEN — BLOCKING FOR TASK 4

Task 3 is accepted but uncommitted, and the Task 3 specification leaves the commit to the owner. Task 4 must not start
on a working tree that still carries Task 3, because its diff could not be reviewed on its own.

The owner needs to:

1. delete the empty leftover `tools/BaxOrders.CatalogueMigration/Pending.cs`;
2. optionally save the Coder's full Azerbaijani report, which is the `Write` input at line 1673 of
   `LOGS/20260924-155113-cycle01-coder.jsonl`;
3. optionally re-run `dotnet test BaxOrders.slnx` and the frontend `npm test` / `npm run build` (the Reviewer
   profile cannot run them);
4. commit Task 3 and record the hash under "Accepted" above and as `lastAcceptedCommit` in `STATE.json`;
5. restart the API, which is still running the pre-Task-3 code.

Once the commit exists, Task 4 moves to `PLANNING`, not `READY`: it has no specification yet. Task 4 concerns the
approval flow. Changing approval or history data is a §7 human gate, so the Planner must say which parts need owner
approval.

### HD-004 — No human approval gate for real-data changes

Status: RESOLVED on 2026-09-24 — owner confirmed ("Belə qalsın")

`WORKFLOW_RULES.md` §7 was rewritten so that changing real business data no longer stops for an owner approval. What
protects the data instead is the migration-tool pattern proven in Task 3: `--inspect`, `--dry-run`, `--backup`,
`--apply`, `--verify`, with the apply refusing to run without that day's backup, working in one transaction under a
table lock, rolling back if the plan is not empty afterwards, and being idempotent.

The trade-off was stated to the owner before they confirmed:

- of the thirteen remaining tasks, only **Task 13** changes real data; 04–12, 14 and 16 do not touch it;
- a wrong alias merge is the one mistake `--verify` cannot catch, because the totals still reconcile afterwards.

The owner accepted this, so the protection for Task 13 comes from their own brief rather than from a workflow gate:
decision **13.1** forbids automatic blind merging (a difference in scent, colour or size stays a separate variant),
and **13.2** requires an admin or data manager to approve each match. The Planner must carry both into
`TASKS/TASK-13.md` as hard requirements.

Deployment, push or merge to a remote, destructive Git operations and secrets changes still stop. A local commit does
not — nothing is pushed, and `git reset` undoes it.

### HD-005 — Task 11b's file deletions: no role is allowed to perform them

Status: RESOLVED on 2026-09-25 by the owner's operator.

The five files were removed with `git rm -f`, after checking that each held only a comment and that nothing imported
them. The frontend suite and build were then re-run and matched the Reviewer's expectation exactly: **39 files, 745
tests, build clean**. `STATE.json` is back to `REVIEW` for the Reviewer to confirm criterion 1 and write the commit
message. Nothing was committed by hand.

The cause is fixed rather than worked around. `run-agent.ps1` now grants the Coder `Bash(git rm:*)` — and only that
spelling, never `rm`. `git rm` removes only *tracked* files, and everything the workflow must protect from a role
(`AI_WORKFLOW/` with the owner briefs, the runner, the monitor) is untracked, so the permission cannot reach them
whatever path it is given. `CODER_PROMPT.md` now also says that a comment-only placeholder is not a deleted file.

The original analysis is kept below for the record.

Status when raised: OPEN — BLOCKING TASK 11b (raised by the Reviewer on 2026-09-25)

This is not a business decision. It is a contradiction between `TASKS/TASK-11b.md` and `run-agent.ps1`:

- the spec (§4.2, acceptance criterion 1) requires `pages/LocationAnalyticsPage.tsx`,
  `components/analytics/AnalyticsSummary.tsx` (+ `.test.tsx`) and `components/analytics/ComparisonRows.tsx`
  (+ `.test.tsx`) under `frontend/bax-orders-web/src/` to be deleted;
- no role's permission profile can delete a file. The Coder's `rm` and `git rm` were refused (Coder log lines
  327, 331, 337). The Planner and Reviewer may edit only `AI_WORKFLOW/`. Only the owner may edit `run-agent.ps1`;
- so the Coder left comment-only placeholders. `FIX_REQUIRED` would repeat the refusal, and a pass would let the
  runner's `git add -A` commit the placeholders against criterion 1.

The rest of Task 11b passed review. To unblock (details in `CURRENT_TASK.md`):

1. `git rm -f` the five paths;
2. `npm run --prefix frontend/bax-orders-web test` (expect 39 files / 745 tests) and `… build`;
3. set `STATE.json` `status` to `REVIEW` and `humanApprovalRequired` to `false`. Do not commit; the next review
   accepts and the runner commits;
4. optional: give the Coder a narrow `git rm` permission in `run-agent.ps1` so a later task that deletes a file does
   not stop here again.

Same shape as HD-003 step 1 (`Pending.cs`).

### HD-006 — Task 15 cannot start: four owner answers

Status: RESOLVED on 2026-09-25 — all four answered. See "HD-006 — owner's answers" at the end of this file.

Status when raised: OPEN — BLOCKING TASK 15 (raised by the Planner on 2026-09-25)

`TASKS/TASK-15.md` is written and marked BLOCKED. Each question below is either a gate the owner's own brief sets, or
a fact the brief relies on that the repository does not hold. None is a workflow preference. Answer in any form. The
Planner then fills in the parts marked **[HD-006 Qn]** and sets READY.

**Q1 — the audit month (brief 15.1).** The brief says the month's completeness "audit başlamazdan əvvəl sizinlə
dəqiqləşdirilir". Today is 2026-09-25, so October has not begun and the choice is September 2026. The real September
comes from batch #50010: 480 rows from `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`, orders at 24 of 27
objects.
*Question:* is September 2026 complete in the system, so that the audit may use it? Or should the audit wait for
October?

**Q2 — the first audit's report.** The brief asks for "eyni ssenari və eyni hesabat quruluşu: 20 bölmə, P0–P3
cədvəli", a status for "hər P0 və P1 tapıntısı", and a click comparison with "3 klik + 3 sürüşdürmə". The findings are
in the master brief. Three things are nowhere in the repository: the 20 section titles, each finding's P0–P3 priority,
and the path that was counted.
*Question:* please place the 23.09.2026 audit report in the repository, for example as
`AI_WORKFLOW/BRIEFS/AUDIT-2026-09-23.md` (the briefs folder is yours). The Planner will not rebuild it from memory.

**Q3 — who runs the audit.** The audit means logging in as a Rəhbər, reading screens at four widths, counting clicks,
and running the sandbox approval flow. The Coder role has no browser, no Rəhbər password (a credential is a §7 stop)
and no database. Earlier tasks left exactly these checks to the operator (Task 12 §11, 16b §12). It is also not
recorded whether a real Rəhbər user exists in `baxorders_dev`.
*Question:* who runs it? Planner's recommendation: **the owner's operator runs §5–§6 of the spec, with a real Rəhbər
account**, and records the figures and screenshots. The Coder then only assembles the report from those records and
runs the test suites, and the Reviewer checks the report against the spec. The alternative is browser tooling and a
Rəhbər credential for the Coder in `run-agent.ps1`. That is a change only the owner can make.

**Q4 — HD-002 and gate 15.2.** The last recorded figures (16a) are Unresolved 0 / PriceRequired 0 / InternalFreeSupply
95. So 15.2 holds, but only because Administrator reclassified HD-002's 94 rows to InternalFreeSupply, and HD-002 still
says it is undecided whether that was intended. 15.2a counts a row as settled only when it has been "biznes qaydasına
görə qiymət tələb etmədiyi təsdiqlənib".
*Question:* do you confirm that those 94 rows are correctly «Ödənişsiz daxili təminat»? That would close HD-002.
Otherwise they must be reviewed on Qiymət təsnifatı before the audit.

A fact the Planner settled without the owner, recorded so it can be overturned: **batch #6 must not be confirmed.** It
is the superseded January–June workbook, with June duplicated (`docs/business-decisions.md`). Confirming it would add
a second copy of those orders. The spec treats a confirmed #6 as a STOP.

### HD-007 — Task 15a: the Coder cannot write under `docs/`

Status: RESOLVED — the owner added `'"Edit(docs/audits/**)"'` to `$coderAllow` (`run-agent.ps1:951`, observed by the
Planner on 2026-09-25). Nothing else under `docs/` is open to the Coder.

Status when raised: OPEN — BLOCKING TASK 15a (raised by the Planner on 2026-09-25)

This is not a business decision. It is a contradiction between the task and the runner, the same shape as HD-005:

- the owner decided the Coder prepares the audit kit and later assembles the report (HD-006 A3). Both are documents,
  and `TASKS/TASK-15.md` §7 / `TASKS/TASK-15a.md` §4 put them under `docs/audits/`, beside `docs/business-decisions.md`;
- the Coder's profile in `run-agent.ps1` (`$coderAllow`, lines 940–963) grants `Edit` on `src/`, `frontend/`, `tests/`,
  `tools/`, `BaxOrders.slnx`, `STATE.json` and `LAST_REPORT.md`, and **not** on `docs/`. `$ApplicationPaths`
  (line 151) lists `docs/**` as application space, but only to deny it to the Planner and the Reviewer. So no role can
  write there, and a 15a Coder run would be refused at its first file;
- only the owner edits the runner. Putting the audit into `tools/` or `frontend/` instead would place a document among
  code to route around a permission, so the Planner has not done it.

To unblock:

1. in `run-agent.ps1`, add `'"Edit(docs/audits/**)"'` to `$coderAllow` (next to `'"Edit(tools/**)"'`, line 942). The
   narrow path is deliberate: it leaves `docs/business-decisions.md` out of the Coder's reach, and it covers 15b too;
2. set `STATE.json` `status` to `READY` and `humanApprovalRequired` to `false`. `TASKS/TASK-15a.md` is complete and
   needs no Planner run.

The alternative, if the owner prefers not to change the runner: tell the Planner where the audit documents may go
instead, and the Planner rewrites the paths in `TASKS/TASK-15.md` and `TASKS/TASK-15a.md`.

### HD-008 — The operator runs the audit kit

Status: **CLOSED 2026-09-25 — DEFERRED BY OWNER** (opened by the Reviewer on 2026-09-25, when 15a5 was accepted;
`TASKS/TASK-15a.md` §9, `TASKS/TASK-15a5.md` §12)

**How it closed.** The operator ran the kit on 2026-09-25. Section A — every server and data precondition — is
complete and all six preconditions pass; the figures and the four read-only command outputs are in `neticeler.md`.
G3 failed on the first attempt because no active Rəhbər existed; with the owner's explicit approval a temporary
audit account (`audit.rehber`, role Manager, active) was created through the application's own supported path, and
`ActiveApproverCount` went 0 → 1.

The browser-only part was then **deferred by the owner as an explicit decision**: the Rəhbər browser login check,
the click counts (G), the viewport checks (H), the screenshots, the sandbox approval walkthrough (A-05, F), and with
them B … K. They are recorded `DEFERRED_BY_OWNER` in `neticeler.md` — **not** as passes — and nothing was invented.
`ekranlar/` is empty. This is a deferral, not a successful audit: 15b must report it that way.

`audit.rehber` stayed active. The application refused to deactivate it, because it is the only active user holding
approval authority and disabling it would put the system back into the G3 failure this closed.

Real data is untouched: no order approved, returned, revised or classified, no import confirmed, and `--verify`
passed all nine checks afterwards.

This is not a business decision, and not a request to look over the kit. The owner decided that the audit is run by
their operator, with a Rəhbər account and a browser, because no role has either (HD-006 A3). The kit is complete. 15b
can only be written from the operator's results.

The operator:

1. runs `docs/audits/2026-final-enver-muellim-audit/` as its `README.md` says, in its order: `01-hazirliq.md`, then
   the checklist `02-yoxlama-siyahisi.md`, with the read-only commands of `03-emrler.md` and the sandbox steps of
   `04-sandbox.md`;
2. copies the checklist to `neticeler.md` in the same folder (`01-hazirliq.md`, "Başlamazdan əvvəl"). The operator
   fills that copy below each `---- operator doldurur ----` marker, and puts the screenshots in `ekranlar/`, as
   `05-neticeler-qaytarilmasi.md` says;
3. sets `STATE.json` `status` to `PLANNING`, `currentTask` to `15b` and `humanApprovalRequired` to `false`. Nothing
   is committed by hand.

The hard rules are the README's:

- read only on real data: no real order is approved, returned or edited;
- nothing is classified, matched or confirmed on `baxorders_dev`;
- import #6 is never confirmed;
- every write happens in the sandbox;
- the audit uses the Rəhbər account.

The Planner then writes `TASKS/TASK-15b.md`. If `neticeler.md` is missing or unfilled, the Planner sets
`HUMAN_REQUIRED` with reason `TASK_15_OPERATOR_RESULTS_MISSING`.

### HD-009 — The final audit's browser part is deferred: resume it, or close Task 15 as reported

Status: **CLOSED 2026-09-26 — the owner chose option 2: Task 15 is closed as reported.** Raised by the Reviewer on
2026-09-25 when 15b was accepted, reason `TASK_15_BROWSER_PART_DEFERRED`.

**The owner's closeout, 2026-09-26.** Recorded as three facts, and no more than three:

1. Task 15's implementation and its report are **delivered** (`docs/audits/2026-final-enver-muellim-audit.md`, 15b
   accepted at `f011924`).
2. The remaining **browser portion of the audit is deferred by the owner** — deliberately, not waived and **not
   passed**. It was never performed. Section A of the kit was completed; B … K were not, `ekranlar/` is empty, and
   no observation, figure or screenshot was invented for them. The report's answer stays **Xeyr**, its unmet
   acceptance bullets 2 and 3 stand, and 298 rows stay unchecked.
3. **No blocking work remains for TASK-17 … TASK-24.** They are accepted through `f960195`.

`DONE` here means the queue is empty and nothing blocks. It does **not** mean the browser audit passed. The manual
packs under `docs/audits/2026-qerar-zenciri/` stay available for future regression and UX checks and block nothing.
The audit history is kept as it is.

**2026-09-26, Reviewer.** The decision chain (17 → 24) that the owner adopted on top of this has run to its end, and
Task 24 is accepted. The queue is empty again, so the workflow is back at this decision. Nothing about it has changed.

15b is accepted and committed, and the queue is empty. The workflow does not go to `DONE`, for two reasons:

- `WORKFLOW_RULES.md` §5 defines `DONE` as "all planned tasks and the final audit are complete", and the final audit's
  browser part was deferred, not waived;
- choosing between the two ways forward below is a business decision no role may make (§12).

This is not a request to review 15b.

What stands today (`docs/audits/2026-final-enver-muellim-audit.md`):

- the answer is **Xeyr**;
- brief acceptance bullets 2 and 3 are not met;
- 298 rows are unchecked;
- N-01 is open.

The owner decides one of:

1. **Resume the audit.** In İstifadəçilər, reset `audit.rehber`'s password. Then continue in `neticeler.md` from A-04
   steps 5–6, and fill B … K there, with the screenshots in `ekranlar/` (`neticeler.md`:1393–1394). Then set
   `STATE.json` `status` to `PLANNING`, with `currentTask` `15b` and `humanApprovalRequired` false. The Planner
   re-specifies the report from the completed results.
2. **Close Task 15 as reported.** Say so, and the state becomes `DONE`. The report's Xeyr and its unmet bullets stand
   as the audit's outcome.

Either way, **N-01 is the owner's own action and needs no task.** In İstifadəçilər:

1. create or activate Ənvər müəllim's own Rəhbər account;
2. then deactivate `audit.rehber`. The application allows this once another approver is active.

Until this is done, no one who knows a password can approve an order on the real system.

### HD-010 — Task 22b: the lists do not know which orders are historical, and the brief rules out the backend

Status: **CLOSED 2026-09-26 — the owner chose option 1.** Raised by the Planner on 2026-09-26. It blocked **22b only**. 22a is READY and does not depend on the
answer: whichever option is chosen, 22b reuses 22a's component and label source.

**The conflict.**

- Brief acceptance 4 (`BRIEFS/TASK-22.md`): "Obyektlər siyahısında və aylıq hesabatın statuslarında tarixi sifariş eyni
  cür ifadə olunur." Requirement 5 says the same for every place the badge appears.
- The same brief, under Toxunulmayanlar: "Baza, backend, data."
- The repository (HEAD `b6b987c`): the only thing that knows an order is historical is
  `GET /api/v1/orders/{id}/workflow`, one order at a time (`decisionFacts.isHistoricalImport`). The objects list
  (`GET /locations/orders`, `LocationOrderSummary`), the object page (`GET /locations/{id}/orders`,
  `LocationOrderHistoryEntry`) and the monthly report (`GET /reports/monthly`, `MonthlyReportCell`) return only the
  status (`TASK-22a.md` §2.4). No endpoint gives the fact for many orders at once. An Approved row cannot be told
  apart from list data, because historical and in-system approvals share the same status.

So acceptance 4 is met either with a backend change or with one extra request per order on screen. The first goes
against the brief's own line, and the second is a cost the owner has not agreed to. This is a choice for the owner,
not a technical detail.

**The owner decides one of:**

1. **Allow a read-only backend addition** (the Planner's recommendation). Add one boolean — whether the order is a
   historical import, worked out by the rule the workflow already uses (`OrderWorkflowDtos.cs:157-161`) — to the three
   list results above. No status, event, permission, schema or data change, and no migration. Only the "backend" line
   of Toxunulmayanlar is relaxed, and only for this read-only field.
2. **Frontend only, one request per order.** Each surface calls the workflow for every order it shows: up to 25 on
   the objects list, up to 24 on the object page, and one per filled cell on the monthly report. That is about 27
   objects × 12 months, so 300 or more requests each time the report opens. The brief's letter holds, but those
   screens get slower and the server does more work.
3. **Narrow acceptance 4.** The lists and the report keep today's plain `✓ Təsdiqlənib`, and the historical wording
   stays on the order page only. This changes the brief's acceptance 4 and requirement 5.

When answered, record it here, and the Planner specifies `TASKS/TASK-22b.md` from it.

**Planner, 2026-09-26, after 22a was accepted (`cc46329`):** still unanswered, so the workflow is `HUMAN_REQUIRED`
with reason `TASK_22B_HD010_OPEN`. The conflict still holds at `cc46329`. `IsHistoricalImport` exists only in
`OrderWorkflowDtos.cs` (`WorkflowDecisionFactsDto`). `LocationOrderSummaryDto` (`OrderReadDtos.cs`:38),
`LocationOrderHistoryEntryDto` (`OrderReadDtos.cs`:90) and `MonthlyReportCellDto` (`MonthlyReportDtos.cs`:34) still
carry only the status. `TASKS/TASK-22b.md` was not written.

**ANSWERED — the owner chose option 1, 2026-09-26: a read-only backend addition.**

One boolean — whether the order is a historical import — is added to `LocationOrderSummaryDto`
(`OrderReadDtos.cs`:38), `LocationOrderHistoryEntryDto` (`OrderReadDtos.cs`:90) and `MonthlyReportCellDto`
(`MonthlyReportDtos.cs`:34), worked out by the rule the per-order workflow already uses
(`OrderWorkflowDtos.cs`:157-161). The wording stays 22a's: the badge, its label source and its component are reused,
not re-invented (decisions 22.1, 22.2, 22.3).

What this relaxes, and what it does not:

- Relaxed: the single word "backend" in brief 22's Toxunulmayanlar, and only for this read-only field.
- **Not** relaxed: no status changes (an Approved order stays `Approved`, decision 22.1), no workflow event, no
  permission, no schema change, no migration, and nothing is written to or altered in the data. `Baza` and `data`
  stay untouched.
- Acceptance 4 and requirement 5 of brief 22 stand as written. They are met, not narrowed.
- The rule must not be duplicated: compute the field from the same place the workflow computes it, so the two can
  never disagree. If that means extracting the rule into one shared helper, do that rather than copying it.
To unblock: write the chosen option (1, 2 or 3) and the date under this heading. Then set `STATE.json` `status` to
`PLANNING` and `humanApprovalRequired` to `false`. Nothing else needs changing by hand.

---

## HD-006 — owner's answers, recorded 2026-09-25

The owner answered through their operator. The Planner fills the **[HD-006 Qn]** parts of `TASKS/TASK-15.md` from
these and sets the task READY.

**A1 — the audit month: September 2026.** October has not begun on 2026-09-25, so under brief 15.1 the last complete
real month is September. Confirmed; the audit uses it.

**A2 — the 23.09.2026 audit report: not available to the workflow.** It is not in the repository and the owner has
not supplied its text. Do not reconstruct its twenty sections, its P0–P3 priorities or its counted click path from
memory or from any report in `AI_WORKFLOW/`. Audit against what the repository does hold: each brief's own
`## Acceptance — biznes dili ilə`, for Tasks 04 through 16, plus the owner decisions 4.1 … 16.1 in
`BRIEFS/OWNER_BRIEFS_MASTER.md`. Say plainly in the final report which parts of brief 15 could not be checked for
want of the original document, rather than implying they were.

**A3 — who runs it: the owner's operator, not the Coder.** The Coder has no browser, no Rəhbər credential and no
database of its own. The Coder's part is to prepare: the checklist, the queries, the sandbox seed, the exact steps.
The operator then runs them and hands the results back for the report.

**A4 — HD-002 is resolved: the 94 rows are correct as they stand.** See HD-002 below, now marked RESOLVED. Gate 15.2
is therefore satisfied for them: they are not unresolved rows, they are settled ones. `Alış qiyməti tələb olunur`
rows with no price entered, if any remain, still count as open under 15.2a and must be reported.
