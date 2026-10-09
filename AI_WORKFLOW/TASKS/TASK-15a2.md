# TASK 15a2 — YEKUN AUDİT DƏSTİ: YALNIZ OXUYAN ƏMRLƏR VƏ SINAQ MÜHİTİNİN ADDIMLARI (Task 15a, sub-part 2 of 5)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by every part of Task 15; there is no `TASK-15a2` brief).
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md` — what the audit checks and how it is reported. Unchanged.
Kit specification: `AI_WORKFLOW/TASKS/TASK-15a.md` — what the whole kit contains. Unchanged, and it still governs.
Split map: `AI_WORKFLOW/TASKS/TASK-15a1.md` §1, §2, and `PLAN.md`, "Current".
Where this file and `TASK-15a.md` disagree, `TASK-15a.md` wins; where it and the protocol disagree, the protocol wins;
where the protocol and the brief disagree, the brief wins. In every such case: STOP and report.

Specification status: **READY.** Written by the Planner on 2026-09-25. Repository at `4023da2` (HEAD, 15a1's commit).

**Documentation only.** This part adds two files under `docs/audits/2026-final-enver-muellim-audit/` and may change one
line of that folder's `README.md` (§6.3). No application code, test, style, schema, migration, tool or data change. No
database command of any kind, and no tool, script or sandbox is run. This file carries no data-migration line, on
purpose.

---

## 1. Place in the split

| Part | Writes | Status |
|---|---|---|
| 15a1 | `README.md`, `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md`, `06-hesabat-skeleti.md`; the suites | accepted (`4023da2`) |
| **15a2 (this file)** | `03-emrler.md`, `04-sandbox.md` | current |
| 15a3 | `02-yoxlama-siyahisi.md`: preamble, sections A, E, F, G, H, I, J, K | queued |
| 15a4 | `02-yoxlama-siyahisi.md`: B and C for `BRIEFS/TASK-04.md` … `TASK-09.md` | queued |
| 15a5 | `02-yoxlama-siyahisi.md`: B and C for `TASK-10.md` … `TASK-14.md`, `TASK-16.md`; B's four "Xeyr" rows; D; the whole-kit check | queued |

HD-008 (the operator run) opens only when 15a5 is accepted. Accepting 15a2 opens nothing for the operator.

**The seam with the checklist.** `02-yoxlama-siyahisi.md` does not exist yet, so the two files written here cannot cite
check IDs. They name their own parts instead, and 15a3 … 15a5 point to those names from their rows:

- each command in `03-emrler.md` is **«Əmr 1»**, **«Əmr 2»**, … (sections A and J will say "03-emrler.md, Əmr 2");
- each procedure in `04-sandbox.md` is **«Sınaq 1»**, **«Sınaq 2»**, …, and each step inside it is numbered
  («Sınaq 3, addım 4»).

Do not use `P1`, `P2` … (they read as priorities) or `<letter>-<two digits>` (the check-ID form). Screenshots taken
during a procedure are named after the checklist row that points to it (`<ID>-<ekran>-<en>.png`, `01-hazirliq.md`
§7); say so, and do not invent IDs.

## 2. Which acceptance criteria this part carries, and which it leaves

- **Carried here:** `TASK-15a.md` §8 item 5 (all of it: `03-emrler.md`); item 4 for the sandbox side (every
  write-check has sandbox steps, or «yoxlanıla bilmədi» with a reason from the code); items 6 and 8 for the two files.
- **Left to 15a3:** sections A, F and J of the checklist, which cite «Əmr N» and «Sınaq N»; item 3 for those rows.
- **Left to 15a4 / 15a5:** the B, C and D rows, including the rows of Task 4, 13 and 16 that point to «Sınaq N»;
  item 2; item 4's row side.
- **Left to 15a5:** item 1's final check that all seven files exist.
- **Left to 15b** (unchanged): the protocol's §9 items 1–11.

## 3. Verified current state (the Planner read these on 2026-09-25; the Coder confirms each at the cited lines)

### 3.1 Git

- HEAD `4023da2`. `git diff --stat 4467f8f HEAD -- src tools` is **empty**: no backend or tool file has changed since
  16a's commit. 16b and `7cc1ccd` were frontend only; 15a1 was Markdown only.
- Untracked: `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1`, `run-agent.ps1` (workflow infrastructure).
- `samples/` is on disk and ignored by git (`git ls-files samples` prints nothing). It holds
  `samples/imports/raw/Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`, `samples/imports/raw/kamran_sifarisler_2026.xlsx`,
  `samples/imports/raw/kamran_anbar_2026.xls` and `samples/decisions/Kamran_Sifaris_Melumatlarinin_Deqiqlesdirilmesi_Batch6.xlsx`.

### 3.2 The three tools with read-only commands

All three read the connection string from the API's user-secrets, then the environment, never the command line
(`tools/BaxOrders.ImportPricingMigration/ToolSettings.cs:44–69`; the other two are the same shape). Each prints the
database it is pointed at, without the password (`ToolSettings.cs:71–76`, printed at `Program.cs:55`). Each command is
chosen by an exact argument; there is no way to pass SQL (`ToolSettings.cs:29–42`).

Where a write can happen, by a `Grep` over `tools/` for `SaveChanges|ExecuteSql|ExecuteUpdate|ExecuteDelete|
BeginTransaction|File.Write|WriteAll|pg_dump|MigrateAsync` (excluding `bin/`, `obj/`): only in each tool's `Apply.cs`
and `Backup.cs`, and in `Invariants.WriteAsync`, which writes the baseline file for `--backup`. `Inspection.cs`,
`Verification.cs` and `DryRun.cs` contain none of them. The tools also run with `NobodySignedIn`, so a service that
needs an actor to write is refused (`ImportPricingMigration/Program.cs:103–118`).

| Tool | `--inspect` prints | `--verify` compares against |
|---|---|---|
| `ImportPricingMigration` (16a) | migrations; import batches **counted by status**, and each batch still under review (`NeedsReview` / `ReadyToImport`) by id, file name, rows, excluded rows and unpriced included rows; Qiymət təsnifatı's four totals and the number of pricing decisions; «Təsnif edilməyib» by month, by object and month, and by the workbook's supplier cell; suppliers marked NotRequired; the «H.Ə.M Təmizlik» alias (`Inspection.cs:25–193`) | the baseline 16a's `--backup` wrote: `<BackupDirectory>/baxorders_dev-task16a-baseline.tsv` (`Invariants.cs:465–466`), where `BackupDirectory` is `BAXORDERS_BACKUP_DIR` or `%USERPROFILE%\BaxOrders-backups` (`ToolSettings.cs:61–66`). 16a's backup is `C:\Users\HP\BaxOrders-backups\baxorders_dev-task16a-20260925-121335.dump` (`PLAN.md`, 16a) |
| `ProductMatchMigration` (13a) | migrations; the catalogue; every current «Yazılış fərqi» and «Variant fərqi» suggestion; HEM's August and September lines of every product starting «Sabun elano»; whether «Sabun elano lavanda ətirli» → «Sabun elano» is suggested; HEM September «Keçən ay» (`Inspection.cs`, headings at 33, 51, 61, 72, 97, 140, 187) | 13a's baseline (`…-task13a-baseline.tsv`) |
| `CatalogueMigration` (Task 3) | the catalogue, the code sequence, every column holding a location id, the deleted objects' references, the aliases, how the importer recognises an object, the Sentyabr workbook's batches and blocks, the HD-002 decisions (`Inspection.cs`, headings at 58–268) | Task 3's baseline |

### 3.3 Whether each `--verify` can pass today — from the code

- **`ImportPricingMigration --verify` can pass today, all nine checks**, if nothing in `baxorders_dev` changed since
  16a's backup: its code is unchanged since then (§3.1), and 16a's review recorded "All 9 checks passed"
  (`REVIEWS/TASK-16a.md:50`). What it compares: every order and line, the catalogue, the location aliases, the
  suppliers, the product-match decisions, Qiymət təsnifatı's totals and HD-002's decisions (by hash), every dashboard
  month on four bases, every year of the monthly report, every number of HEM's September order page, and the import
  staging (`Invariants.cs:56–360`). A figure present on one side only is a difference (`Invariants.cs:370–400`).
  It fails, and says which figures moved, if something changed in the real data after 12:13 on 2026-09-25. The
  workflow records one kind of change that would be legitimate: an administrator approving a product match in the
  product. After a Variant approval, HEM September's `….Decomposition.Categories[…]`, `….Decomposition.Drivers[…].Category`
  and `….Decomposition.VariantTransitions[…]` keys differ, and so do `catalogue.productMatchDecisions` and its hash.
  That is 13.1a working, not a money change (`REVIEWS/TASK-13c.md:95–100`; `PLAN.md`, 13c). Classifying batch #6's
  rows in its review is owner work (`TASKS/TASK-16b.md:494–495`); it would fail the check "four classification
  columns, NULL on every row" (`Verification.cs:51–53`). Whether either happened is not recorded anywhere. The
  operator therefore records the outcome as it is, and 15b explains it (§6.1).
- **`ProductMatchMigration --verify` is left out of the kit.** Every figure it records is also recorded by the 16a
  tool, which copied them (`ImportPricingMigration/Invariants.cs:26–32`), so it adds no evidence. Its baseline is also
  older (13a, before 16a), and its check "`ProductMatchDecisions` exists and holds no row"
  (`ProductMatchMigration/Verification.cs:43–45`) fails on the first legitimate approval. Keeping it would put a
  second, noisier copy of the same comparison before the operator.
- **`CatalogueMigration --verify` is left out of the kit: it fails today whatever the data.** It flattens every
  number of orders 153 and 154's detail and decision context (`CatalogueMigration/Invariants.cs:182–195`), and it
  counts a figure that exists on one side only as a difference (`Verification.cs:255–301`). The decision context has
  gained numeric fields since Task 3's baseline. One example: `IncreasedCount`, added by Task 11b (`eaa65bb`,
  `src/BaxOrders.Application/Decisions/DecisionContextDtos.cs:127`). So its "MUST NOT CHANGE" check reports "(new)"
  keys from code growth alone. That is an expected failure that the operator could not tell apart from a finding,
  which `TASK-15a.md` §4.4 forbids.

### 3.4 Figures the gates and section J need, and where they are read

- Qiymət təsnifatı's totals count **unpriced lines only** (`src/BaxOrders.Application/Orders/Pricing/PricingModeReviewService.cs:47`).
  So its «Alış qiyməti tələb olunur» total *is* the number of such rows with no price, which gate G2's second figure
  asks for (protocol §5.2). `ImportPricingMigration --inspect` prints the same four totals (`Inspection.cs:94–99`).
- HD-002's 94 among «Ödənişsiz daxili təminat»: `--verify`'s HD-002 check compares the decisions and their lines by
  hash with 16a's baseline (`Verification.cs:88–91`). 16a recorded InternalFreeSupply 95 with 94 decisions (`PLAN.md`,
  16a). If the check passes, the 94 are the same rows in the same state. If it fails, no command prints the figure.
- Batch states: `--inspect` prints the count per status, and the id of every batch under review, but not the id of an
  `Imported` batch (`Inspection.cs:60–82`). The Excel importları list (`/imports`, `layout/navigation.ts:33`),
  opened by an admin, shows every batch. Reading it saves nothing, in the same way as 01 §4's İstifadəçilər check.
- So read-only SQL is needed **at most** for one figure: how many of today's «Ödənişsiz daxili təminat» lines are
  HD-002's, and only when the HD-002 check of `--verify` fails. See §6.1 item 6.

### 3.5 The sandbox, as it stands

- `sandbox.ps1` (89 lines): `-Create`, `-Reset`, `-Drop`, `-Run`. `-Run` is `dotnet run --project src/BaxOrders.Api
  --launch-profile sandbox` (`sandbox.ps1:62–68`), the **same project** the real API runs from (01 §3.2). The script has
  no `--no-build` switch. `-Create` / `-Reset` build and run `tools/BaxOrders.ApprovalSandbox` instead (`:81–82`).
- Start-up, password, accounts, what a reset leaves, and the stop-and-reset after a session are already in
  `01-hazirliq.md` §5 (lines 118–223, accepted). **`04-sandbox.md` points there and does not repeat it.**
- Every page of the sandbox UI carries the banner «Sınaq mühiti — burada real sifariş yoxdur. Burada edilən təsdiq və
  düzəlişlər real dataya təsir etmir.» (`frontend/bax-orders-web/src/environment/labels.ts`).
- The sandbox is created from the migrations, and the first migration seeds the objects `RAMANA`, `MASTAGA`,
  `EMIRCAN` and **`HEM` «Heydər Əliyev Mərkəzi»**, the alias **«H.Ə.M» → HEM**, and eleven units with their aliases
  (`src/BaxOrders.Infrastructure/Persistence/Migrations/20260922191708_InitialPostgres.cs:1008–1072`). No migration
  deletes or updates seeded rows (no `DeleteData` / `UpdateData`). No category is seeded. `01-hazirliq.md` §5.4 does
  not mention these seeded objects; it is not wrong, only silent.
- The seeded catalogue's five products are all named «Sınaq məhsulu — …» with different endings
  (`SandboxScenario.cs:31–38`). None is a whole-word prefix of another, and no two differ only by spaces or slashes.
  So a reset sandbox gives **no match suggestion** (`ProductMatchSuggestions.cs:74–89`; only variants with order
  lines take part, `:108`).
- There is no endpoint that creates a product outside import review (the POST/PUT routes under
  `src/BaxOrders.Api/Controllers/`). The only way to get new products, with order lines, into the sandbox through the UI
  is an Excel import.

### 3.6 The import, as far as the sandbox checks need it

- The importable format: one sheet `Əsas`, header on row 3, data from row 4, one flat table. The columns include
  `Obyekt` and `Tarix`, one row per line, and a workbook holds many objects and months (`docs/excel-import-notes.md:38–49`).
  The `.xls` warehouse workbook is not importable (`:51–72`).
- The corrected workbook, `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`, is the source of batch #50010:
  January–September 2026, 3,619 staged rows (`docs/business-decisions.md:12–24`). In it, HEM's rows are spelled
  `H.Ə.M` (`:59`, `:461`), which the sandbox's seeded alias resolves. Nərimanov heykəli's rows are spelled
  `Nərimanov` and `Nərimanov Heykəli` (`:456`), which the sandbox does not know.
- A batch becomes `ReadyToImport` only when no row has a blocking issue: every Error, plus an unknown product or
  variant. An unknown category, supplier or responsible person, or a missing price, is a warning and does not block
  (`docs/excel-import-notes.md:171–211`). Excluding a row is one row at a time, with a reason (`:530–541`).
- In bulk, the review can create objects, suppliers, responsible people, products and variants "as the sheet spells
  them". Units and category paths cannot be created in bulk. They are mapped to existing records, or created one at a
  time (`src/BaxOrders.Application/Imports/Review/BulkResolutionRules.cs:12–24`, `:73–81`). One bulk operation carries
  at most 150 values (`src/BaxOrders.Application/Imports/ImportOptions.cs:16`).
- Confirmation requires `ReadyToImport` (`ImportConfirmationService.cs:61–65`). An imported order starts as a draft
  (`src/BaxOrders.Domain/Orders/OrderRequest.cs:86`). The analytics and the match suggestions do not filter by status,
  so an imported draft is read like any order.
- Facts the workflow recorded for Task 13: on the real data, the engine suggests 1 «Yazılış fərqi» and 216 «Variant
  fərqi» pairs, and no real «15 W» / «15W» pair exists (`PLAN.md`, 13a). The HEM September «Keçən ay» figure
  +23,852.70 is the brief's (`BRIEFS/TASK-13.md`, «Acceptance»).

## 4. Working rules for this session. They are the fix, not advice.

1. **Read only what §5 lists**, at the line ranges given. Do not open other briefs, `OWNER_BRIEFS_MASTER.md`, `LOGS/`,
   other reviews or other tools. Nothing written in this part needs them.
2. **`03-emrler.md` first.** Read §5.1, write `03-emrler.md` in full, then read §5.2 and write `04-sandbox.md`. If the
   session is cut off, the first file stands.
3. **Search narrowly.** `Grep` with a pattern and a path; `Read` with a line range when only part of a file is needed.
4. The facts in §3 were checked by the Planner. Confirm each one at its cited lines rather than re-deriving it from a
   wider reading. If one is wrong, follow the code and say so in the report.

## 5. Reading list

### 5.1 For `03-emrler.md`

- `TASKS/TASK-15a.md` §4.4, §8 items 5 and 6; `TASKS/TASK-15.md` §5.2, §8, §9 item 11;
- `docs/audits/2026-final-enver-muellim-audit/05-neticeler-qaytarilmasi.md` (55 lines), and `README.md:28–68`;
- `tools/BaxOrders.ImportPricingMigration/`: `Program.cs`, `ToolSettings.cs`, `Inspection.cs`, `Verification.cs`,
  `MigrationPlan.cs`, and `Invariants.cs:16–61`, `:362–400`, `:463–490`;
- `tools/BaxOrders.ProductMatchMigration/`: `Program.cs:1–60`, `Inspection.cs` (headings, and what each block prints),
  `Verification.cs:28–93`;
- `tools/BaxOrders.CatalogueMigration/`: `Program.cs:1–60`, `Inspection.cs` (headings), `Verification.cs:157–190`,
  `:255–301`, `Invariants.cs:182–195`;
- `src/BaxOrders.Application/Decisions/DecisionContextDtos.cs:115–135`;
  `src/BaxOrders.Application/Orders/Pricing/PricingModeReviewService.cs:40–60`;
- `AI_WORKFLOW/REVIEWS/TASK-13c.md:64–72`, `:95–100`; `AI_WORKFLOW/REVIEWS/TASK-16a.md:40–55`;
- the write-call `Grep` of §3.2, run once over `tools/`;
- only if §6.1 item 6's SQL is written: `scripts/dev-postgres.ps1` (header, where `psql` is found), and the
  `OrderItemPricingDecisions` / `OrderRequestItems` entities in
  `src/BaxOrders.Infrastructure/Persistence/Migrations/BaxOrdersDbContextModelSnapshot.cs` (`Grep` for them).

### 5.2 For `04-sandbox.md`

- `TASKS/TASK-15a.md` §4.5; `TASKS/TASK-15.md` §6.2 (first three bullets), §6.4, §6.5 (K2), §8;
- `BRIEFS/TASK-04.md`, `BRIEFS/TASK-13.md`, `BRIEFS/TASK-16.md`: «Qəbul edilmiş qərarlar» and «Acceptance — biznes
  dili ilə» only;
- `docs/audits/2026-final-enver-muellim-audit/01-hazirliq.md:118–223` (§5), to point to and not repeat;
- `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, `SandboxScenario.cs`, `SandboxSeed.cs:100–131`;
- `src/BaxOrders.Infrastructure/Persistence/Migrations/20260922191708_InitialPostgres.cs:1008–1072`;
- `src/BaxOrders.Application/Catalog/ProductMatches/ProductMatchSuggestions.cs:64–113`;
- `docs/excel-import-notes.md:36–87`, `:171–212`, `:296–485` (review and bulk review), `:530–552`;
- `docs/business-decisions.md:12–24`, `:54`, `:59`, `:456`, `:461`;
- `src/BaxOrders.Application/Imports/Review/BulkResolutionRules.cs`, `src/BaxOrders.Application/Imports/ImportOptions.cs`,
  `src/BaxOrders.Application/Imports/Confirmation/ImportConfirmationService.cs:61–81`;
- `src/BaxOrders.Api/Security/SecuritySetup.cs`: which role holds which policy (imports, catalogue, product-match
  decisions, approval);
- the screens' words, from the frontend only, by `Grep` or short reads:
  - `src/layout/navigation.ts`;
  - `src/components/workflow/labels.ts`;
  - `src/components/catalog/matches/labels.ts`;
  - `src/pricing/labels.ts`;
  - the review's tab and button names in `src/components/imports/review/` (`ReviewCenter.tsx`,
    `PricingClassificationTab.tsx`, `ReadinessPanel.tsx`, `ConfirmationDialog.tsx`: labels only);
  - the Excel importları page's upload control.

  All of these are under `frontend/bax-orders-web/`.
- `PLAN.md`, the 13a and 13c entries (the «15 W» note and the Sabun note).

## 6. What the Coder writes

Both files go under `docs/audits/2026-final-enver-muellim-audit/`, in Azerbaijani, in plain business words. Command
lines, file paths, URLs, user names, screen labels and tool output stay exactly as they are. Every command, route and
label cites the repository file and line it comes from.

### 6.1 `03-emrler.md` — as `TASK-15a.md` §4.4

1. **Introduction:**
   - what the file is for, and that every command in it only reads (the §3.2 evidence: the `Grep`, `NobodySignedIn`,
     no way to pass SQL);
   - when it runs: at the start, after G3 (checklist section A), and again at the end (section J). Outputs go where
     `05-neticeler-qaytarilmasi.md` §4 says;
   - the working directory: the repository root, in a PowerShell window where `scripts/dev-postgres.ps1` has run.
     The database must be running, and the connection string comes from user-secrets (01 §3.1);
   - what not to run, ever: `--dry-run` is not needed, and `--backup` / `--apply` of any tool, `pg_dump`, `pg_restore`,
     `dotnet ef` and `sandbox.ps1` do not belong to this file. `--backup` would also overwrite the baseline that
     `--verify` compares with (`Invariants.cs:465–473`).
2. **The four commands**, each as its own «Əmr N» block:

   | Əmr | Command |
   |---|---|
   | 1 | `dotnet run --project tools/BaxOrders.ImportPricingMigration -- --inspect` |
   | 2 | `dotnet run --project tools/BaxOrders.ProductMatchMigration -- --inspect` |
   | 3 | `dotnet run --project tools/BaxOrders.CatalogueMigration -- --inspect` |
   | 4 | `dotnet run --project tools/BaxOrders.ImportPricingMigration -- --verify` |

   For each one:
   - the exact line and the working directory;
   - what it reads;
   - the code line that shows it writes nothing;
   - the exit code it ends with (`Program.cs`; `Inspection` returns 0, `Verification` 0 or 1);
   - a **safety line**: the output's second line must read `Database: baxorders_dev @ localhost:55434 (user …)`
     (`Program.cs:55`, `ToolSettings.cs:71–76`; port from `scripts/dev-postgres.ps1`). If it names another database
     (`baxorders_sandbox`, say, because `ConnectionStrings__BaxOrders` is set in that window, `ToolSettings.cs:50–54`):
     stop, discard the output, and run it in a fresh window;
   - **which output lines go into which gate field**, so that 15a3 can name them in section A:
     - Əmr 1 gives the four Qiymət təsnifatı totals, the batches by status and the batch under review, and the
       «H.Ə.M Təmizlik» line;
     - Əmr 2 gives the suggestion counts, the Sabun lines, whether the Sabun pair is suggested, and HEM September
       «Keçən ay»;
     - Əmr 3 gives the object count and the aliases;
     - Əmr 4 gives the nine check lines and the "Key figures" block.
   - A way to keep the full output for pasting without changing it: for example `… *> "$env:TEMP\emr-1-A.txt"`, then
     open the file. Keep it outside the repository, and say to delete these files at the end.
3. **Əmr 4, what to expect, from the code (§3.3):**
   - the expected result, if nothing changed since 16a's backup: `All 9 checks passed. Nothing was changed.`;
   - the baseline file's path, and that a missing file shows as `[FAIL] MUST NOT CHANGE: baseline recorded`. That
     means a file is missing on this computer, not that the data changed;
   - each of the nine checks, in one plain line, with what a FAIL of it would mean;
   - the one recorded legitimate cause of differences (a product-match approval: the key families of §3.3), and batch
     #6's review classifications. Say how the operator can see whether the first happened, **read-only**: Əmr 2 shows
     whether the Sabun pair is still suggested, and 13a's inspect leaves decided pairs out (`ProductMatchSuggestions.cs:86–87`).
   - **The rule that keeps an expected failure from looking like a finding, and a finding from looking expected:**
     - the start run's outcome is recorded as it came, PASS or FAIL, with its difference lines;
     - the operator writes no verdict on a difference. 15b explains each one against the causes above, or reports it as
       unexplained;
     - the audit's own evidence that it changed nothing (protocol §9 item 11) is that the end run (J) prints the same
       difference lines, "Key figures" lines and check lines as the start run (A). Any line that differs between A and
       J is a STOP-level fact for the report (protocol §8), whatever it is.
4. **The two `--verify` commands left out**, each with its §3.3 reason and code lines, so that a reader of the kit sees
   they were considered and not forgotten.
5. **Gate figures not printed by a command** (§3.4): the Excel importları list read by an admin, for the batch ids and
   states. Say which columns to read. Take the column names from the page's code.
6. **Read-only SQL: only if the Coder finds it necessary, and only for HD-002's share of «Ödənişsiz daxili
   təminat» when Əmr 4's HD-002 check fails.** If it is written:
   - it must be in the exact form of `TASK-15a.md` §4.4 (`BEGIN TRANSACTION READ ONLY;` → `SELECT …;` → `ROLLBACK;`);
   - table and column names come from `BaxOrdersDbContextModelSnapshot.cs`, cited;
   - the session is opened read-only as well (for example `$env:PGOPTIONS = '-c default_transaction_read_only=on'`);
   - the cluster's password is taken from the file `scripts/dev-postgres.ps1` writes, without printing it (the way
     `sandbox.ps1:48–53` reads it), and never typed into a command line or the kit;
   - the path to `psql` comes from `scripts/dev-postgres.ps1`.

   If the Coder decides SQL is not needed, the file says so in one sentence and says what the operator records instead
   ("Əmr 4-ün HD-002 yoxlaması keçməyibsə, bu rəqəm oxunmur; qeyd edin").

### 6.2 `04-sandbox.md` — as `TASK-15a.md` §4.5

**Uses the existing sandbox tool only. No change to `tools/` or to the seed.** Start-up, password, accounts and the
reset are `01-hazirliq.md` §5; point to its subsections (§5.1 … §5.5) instead of repeating them.

1. **Before any write, every time:**
   - the address bar shows `localhost:5174`;
   - the sandbox banner (§3.5) is at the top of the page;
   - the header shows a «Sınaq …» account.

   If any of the three is missing: stop. No write-check is ever done on `5173`.
2. **If `-Run` fails because a file is locked.** The real API and `-Run` build the same project (§3.5). If `-Run` stops
   with a build error that names a file "used by another process":
   1. stop the real API (`Ctrl+C` in its window);
   2. start `-Run` again and do the sandbox session;
   3. stop it and `-Reset` (01 §5.5);
   4. start the real API again as in 01 §3.2, and record its new start time and `git rev-parse HEAD` in `neticeler.md`
      section A;
   5. read no real-data screen while the real API is stopped.

   The Planner has not seen this failure happen; it is a precaution (15a1 review).
3. **The procedures**, each a «Sınaq N» block: which accounts, which width, numbered steps with the exact labels and
   routes from the frontend, what to record at each step, and where the reset falls. The Coder decides the procedures'
   boundaries, but they must cover every write-check below:
   - **The approval flow** (protocol §6.4, all six steps, and brief 04's «Acceptance» bullets that need a write):
     - step 1 "the order is sent": either the seeded draft sent by `sinaq.koordinator`
       (`SandboxScenario.cs:55`, "so 'sifariş göndərilir' can be done by hand"), or the order already waiting; say which
       and why;
     - at each step, the four facts to record: who sent it and when; which submission, in business words; the previous
       correction reason; who approved it and when;
     - 4.2: «Düzəliş tələb et» with an empty reason is refused (`reasonRequired`, `components/workflow/labels.ts:152`);
     - 4.3: `sinaq.admin` sees «Təsdiq gözləyənlər» but cannot approve;
     - the sender's correction and re-send, with the labels the coordinator sees;
     - the whole flow at 1366 × 768, and again at 390 × 844 after a `-Reset`, where the decision buttons sit in the
       fixed bottom bar (Task 12);
     - the carried-in history: the «Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.» sentence on
       Sınaq obyekti 1's August order (01 §5.4);
     - K2 (protocol §6.5): the count starts at İdarəetmə paneli, as it opens after `sinaq.rehber` logs in, and ends at
       the approval. Say that the count sheet itself is checklist section G (15a3), and that this procedure is where
       it is walked.
   - **Task 16's classification, and 16.1** (brief 16, «Acceptance»), on a sandbox import. Write it from §3.6:
     - the workbook: a **trimmed copy** of `samples/imports/raw/Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`,
       made by the operator in Excel and saved **outside the repository**. It keeps the header rows 1–3 and only the
       data rows whose `Obyekt` is `H.Ə.M` with `Tarix` August or September 2026, plus the rows whose `Obyekt` is
       `Nərimanov` or `Nərimanov Heykəli` with `Tarix` September 2026. Rows are deleted, never edited, and the copy
       is deleted after the audit;
     - why this copy: HEM's two months give Task 13 its Sabun pair (next bullet). HEM is known to the sandbox through
       the seeded alias. Nərimanov's September holds the brief's unpriced lines («Qiymət yoxdur 1 · Daxili təminat 1»,
       `BRIEFS/TASK-15.md`, Task 2 sample). The whole workbook (3,619 rows) would need every object, product, unit
       and category path resolved first;
     - which account uploads, and where (Excel importları);
     - the review: map or create the unknown values, with the bulk tools where the code allows (§3.6), and units one
       at a time. Nərimanov: create it as the sheet spells it, or map both spellings to one new object, and say which.
       This is sandbox-only data, and no rule of Task 3 is being applied here;
     - read the review's «N sətirdə qiymət yoxdur» and the advance warning;
     - read Qiymət təsnifatı's totals in the sandbox **before** confirming;
     - classify some unpriced rows in the review's «Qiymət təsnifatı» tab, one by one, and leave at least one
       unclassified;
     - confirm, and read the result panel;
     - read the totals **after**. Each must have risen by the figure the dialog gave (acceptance 2);
     - change one classified line on Qiymət təsnifatı (acceptance 3, 16.1);
     - check that no line arrived classified by its supplier (acceptance 4). Nərimanov's Azpetrol line is the example:
       on the real data it was seeded «Daxili təminat» by source before 16a (`PLAN.md`, 16a);
     - read the import screens' words beside the other screens' (acceptance 5).
   - **Task 13's approve and undo** (brief 13, «Acceptance»; 13.1, 13.1a, 13.2), on the same imported data, before any
     reset:
     - the suggestion appears and nothing has changed by itself;
     - `sinaq.rehber` has no «Məhsullar» in the menu, and `/products` is refused (Task 14);
     - `sinaq.koordinator` cannot approve, if the code says so (13.2; check `SecuritySetup.cs`);
     - `sinaq.admin` approves «Sabun elano lavanda ətirli» as a variant of «Sabun elano». Read the family view.
       Then read HEM September's order page, «Keçən ay», before and after: one «variant dəyişib» line at 0.00 ₼, the
       «Yeni» and «Bu ay yazılmayan» parts each 750.00 ₼ smaller, and the order total and the «Keçən ay» difference
       unchanged;
     - undo, and read the same figures back.

     The brief's figure +23,852.70 belongs to the **real** HEM September order. The sandbox copy need not reproduce
     it, so the sandbox check is "unchanged by the approval", not "equals +23,852.70". If no «Yazılış fərqi»
     suggestion appears in the sandbox, the spelling acceptance (brief 13, «15 W» / «15W») is «yoxlanıla bilmədi:
     sınaq mühitində yazılış fərqi təklifi yoxdur; real datada «15 W» / «15W» cütü yoxdur» (`PLAN.md`, 13a). If one
     does appear, approve it and read the product's history.
   - **The fallback.** If the trimmed import does not reach `ReadyToImport` in the session, record the readiness
     panel's blockers word for word. Mark every row that depends on the import «yoxlanıla bilmədi» with that reason,
     and never run the check on real data instead (protocol §6.2). Say which rows those are, by brief bullet.
4. **A closing table**, so that 15a3 … 15a5 can point to it without re-reading the code. One row per write-check,
   named by brief and bullet, not by check ID: for example "`BRIEFS/TASK-16.md`, «Acceptance», 2-ci bənd →
   Sınaq 3, addım 6–9". Cover every write-check of brief 04, 13 and 16, and decisions 4.2, 4.3, 13.1a, 13.2 and 16.1.
   Each row says one of two things: *sandbox*, with its procedure and steps, or «yoxlanıla bilmədi» with the reason.
   Where a bullet is read-only and belongs on real data (for example brief 04's «Real 27 obyektin heç birində heç nə
   dəyişməyib», or brief 13's HEM +23,852.70), say "real data, read-only — not in this file".
5. **After every session:** `-Reset` (01 §5.5). The trimmed workbook copy is deleted when the audit ends.

### 6.3 `README.md`, one line

`README.md:36` describes `04-sandbox.md` as «Sınaq mühitində təsdiq axınının addımları». After this part, the file also
holds the Task 13 and Task 16 write-checks. Change that one table cell to describe what `04-sandbox.md` now holds.
Change nothing else in `README.md`, and nothing in `01`, `05` or `06`.

## 7. No suites

15a2 changes only Markdown under `docs/audits/`, so the suites are not run (`TASK-15a1.md` §7, P5). The tracked tree
outside that folder must stay byte-for-byte `4023da2`.

## 8. Out of scope

- `02-yoxlama-siyahisi.md`: later parts write it. Do not create it, not even empty.
- Running anything in the kit: no `dotnet run`, no tool, no `sandbox.ps1`, no `psql`, no browser.
- Any change outside `docs/audits/2026-final-enver-muellim-audit/03-emrler.md`, `04-sandbox.md`, the one cell of
  `README.md:36`, and `AI_WORKFLOW/LAST_REPORT.md` / `AI_WORKFLOW/STATE.json`.
- A verdict, a priority, a finding, an expected figure that no source gives, or a report text.
- Reconstructing anything of the 23.09.2026 audit (A2).
- Editing a brief, `TASKS/`, or any tool, including the sandbox seed. Creating or committing a workbook.

## 9. Safety and STOP conditions

STOP and report if:

- a check can only be run by writing to `baxorders_dev`: write it as «yoxlanıla bilmədi» with the reason instead;
- a command in `03-emrler.md` would need `--backup`, `--apply`, `pg_dump`, `pg_restore`, `dotnet ef`, or SQL other than
  `BEGIN TRANSACTION READ ONLY … ROLLBACK` around `SELECT`s;
- a credential, token or connection string with a password would have to be written into a file;
- a §3 fact is wrong in a way that changes what the kit may safely tell the operator (for example, an `--inspect` that
  writes): record it and do not write that command into the kit;
- the brief and the protocol disagree.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `sandbox.ps1`, `npm`, `git commit` /
`reset` / `checkout` / `push`, or an edit outside the paths of §8.

## 10. Acceptance criteria

1. `03-emrler.md` and `04-sandbox.md` exist under `docs/audits/2026-final-enver-muellim-audit/`, in Azerbaijani.
   `02-yoxlama-siyahisi.md` does not.
2. `03-emrler.md` holds Əmr 1–4 of §6.1. Each has:
   - its exact line and working directory;
   - what it reads;
   - a code line showing it writes nothing;
   - the database safety line;
   - the output lines to copy, and where they go.
3. `03-emrler.md` states from the code, citing lines, that `ImportPricingMigration --verify` can pass today if nothing
   changed since 16a's backup. It lists the nine checks, the missing-baseline case and the recorded legitimate causes
   of differences. It gives the A-equals-J rule. It names the two `--verify` commands left out, with their reasons.
4. `03-emrler.md` contains no `--backup`, `--apply`, `pg_dump`, `pg_restore` or `dotnet ef` as a command to run, and
   no SQL other than `BEGIN TRANSACTION READ ONLY; … ROLLBACK;` blocks of `SELECT`s. Or it says that no SQL is
   needed.
5. `04-sandbox.md` points to `01-hazirliq.md` §5 for start-up and reset and does not repeat them. It has the
   three-point check before any write, and the locked-file fallback.
6. `04-sandbox.md` has «Sınaq N» procedures covering §6.2 item 3:
   - the approval flow with 4.2, 4.3, both widths, the historical sentence and the K2 walk;
   - Task 16 on the trimmed import;
   - Task 13 on the same data;
   - the fallback.

   Every label and route cites its frontend file.
7. The closing table covers every write-check of briefs 04, 13 and 16 and decisions 4.2, 4.3, 13.1a, 13.2, 16.1, each
   as *sandbox* with steps or «yoxlanıla bilmədi» with a reason. No step anywhere writes to `baxorders_dev`.
8. Neither file uses a check ID of the form `<letter>-<two digits>`, except in the screenshot-name pattern. Neither
   uses `P1`/`P2` as a label.
9. No file of the kit contains a password, a token, a secret's value or a connection string with a password.
10. Nothing of the first audit is reconstructed.
11. `git status --short` shows no change outside `docs/audits/2026-final-enver-muellim-audit/` beyond the untracked
    workflow files. `git diff 4023da2 --stat` shows at most `README.md` inside that folder, one line.

## 11. Final report (`AI_WORKFLOW/LAST_REPORT.md`)

- HEAD, `git status --short`, `git diff --stat 4023da2`;
- the two files, with line counts; the `README.md` line before and after;
- for each «Əmr N»: the command, its source lines, and what it prints;
- for `--verify`: whether it can pass today, and the code lines; the two left out, and why;
- whether SQL was written, and if so the block and its snapshot citations;
- the closing table of `04-sandbox.md`, reproduced;
- any §3 fact the code contradicted, and what the kit follows instead;
- a statement that nothing was run, no database was touched, and no file outside §8 changed.

End with `READY_FOR_REVIEW`.

## 12. For the Reviewer

On acceptance, 15a2 is committed as usual. Then set `currentTask` to `15a3`, status `PLANNING`, `nextTask` `15a4`. Do not
open HD-008. For 15a3: sections A and J must name «Əmr 1» … «Əmr 4» and the fields §6.1 item 2 assigns. Section F and
K2 must point to the «Sınaq N» steps of `04-sandbox.md`.

## 13. Assumptions the Planner made

- P1. The kit runs one `--verify`, the 16a tool's, and leaves out 13a's and Task 3's. 16a's records every figure 13a's
  does. Task 3's fails today from code growth alone (§3.3). Dropping a command is what `TASK-15a.md` §4.4 allows for a
  check that would fail legitimately.
- P2. The audit's own proof of changing nothing is that the start and end runs of Əmr 4 print the same lines. A
  difference present at the start is recorded without a verdict, and 15b explains it or reports it as unexplained.
  This is how the kit keeps an expected failure from looking like a finding without anyone guessing which it is.
- P3. The Task 13 and Task 16 write-checks run on a sandbox import of a trimmed copy of the corrected workbook (HEM
  August and September, Nərimanov September), made by the operator and kept outside the repository. It is the only way
  through the UI to put products with order lines into the sandbox (§3.5). HEM is already known to a fresh sandbox,
  and the copy keeps the review to a size one session can finish. `TASK-15a.md` §4.5 already allows a real workbook in
  the sandbox ("changes only the sandbox"), and `-Reset` removes it.
- P4. In the sandbox, Task 13's money check is "unchanged by the approval", not the real order's +23,852.70, which
  stays a real-data read.
- P5. The two files name their parts «Əmr N» and «Sınaq N», because the checklist's IDs do not exist yet. The rows
  written by 15a3 … 15a5 point to those names.
- P6. The locked-file fallback stops the real API only if `-Run` actually fails. The Planner did not verify that it
  fails, and `vite.config.ts:8–10` intends both to run at once.
- P7. Changing the one cell of `README.md:36` is inside the kit's folder and keeps the front page true. It is not a
  change to 15a1's accepted content beyond that cell.
- P8. SQL is allowed for one figure only, and only on a failed HD-002 check. Every other gate figure has a screen or a
  command.
