# Review — Task 15a2: Yekun audit dəsti — yalnız oxuyan əmrlər və sınaq mühitinin addımları

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All eleven acceptance criteria of `TASKS/TASK-15a2.md` §10 hold. The change is two new
Markdown files under `docs/audits/2026-final-enver-muellim-audit/` (`03-emrler.md`, `04-sandbox.md`) and one table cell
of that folder's `README.md`. No code, test, tool, schema or data changed. No database command was run and no human
gate was crossed. `COMMIT_MESSAGE.txt` is written. Next is 15a3, which goes to `PLANNING` (spec §12). HD-008 is not
opened: it opens when 15a5 is accepted.

## What was inspected

- Branch `main`, HEAD `4023da2b175134918755bba229f45a424b09917e` (15a1's commit). Nothing for 15a2 is committed.
- `git status --short --untracked-files=all`, outside `AI_WORKFLOW/`: `M README.md`, `?? 03-emrler.md`,
  `?? 04-sandbox.md` in the kit folder, plus `monitor-agent.ps1`, `resume-agent.ps1` and `run-agent.ps1`, which the
  runner excludes.
- `git diff` of tracked files: `README.md` only, the one line 36 cell. It matches `LAST_REPORT.md` §2 exactly.
- `git diff --stat 4467f8f HEAD -- src tools`: empty, as spec §3.1 says.
- `02-yoxlama-siyahisi.md` does not exist. The folder holds `README.md`, `01`, `03`, `04`, `05`, `06`.
- Both new files, read in full: `03-emrler.md` 500 lines, `04-sandbox.md` 590 lines.
- The raw Coder log `LOGS/20260925-173016-cycle01-coder.jsonl`. Its Bash calls are `git branch/rev-parse/status/diff/
  log -S/ls-files`, `sed -n` on `docs/business-decisions.md`, `wc` and `head`. It has no `dotnet`, `npm`, `psql`,
  `pg_dump`, `pg_restore`, `sandbox.ps1`, `git commit/reset/checkout/push/clean`. Its Writes are `STATE.json`,
  `03-emrler.md`, `04-sandbox.md` and `LAST_REPORT.md`, in that order. `03` was written in full before `04` (spec §4.2).

## Independent checks against the code

I did not take the report's citations on trust. Opened at the cited lines:

- **The commands only read.** `ImportPricingMigration/Program.cs` (whole): the usage block at 16/20/35/39, exit `2` at
  41 and 50, the `Database:` line at 55, `NobodySignedIn` at 90 and 107–118. `ToolSettings.cs` (whole): the five
  exact arguments (29–42), user-secrets then environment (50–54), and `DescribeDatabase` without a password (71–76).
  `Verification.cs` (whole): the nine checks at 45–109, the missing-baseline line at 56–59, the four printed blocks,
  and the final line and exit code at 119–124. The kit's "`1 of 4 checks FAILED`" for a missing baseline is right:
  three checks, then one baseline check. `Inspection.cs:25–85`: the status counts and the
  `#<id> «<file>» <status>: …` line that the kit's 5.1 relies on.
- **My own write grep** over `tools/` (excluding `bin/`, `obj/`) for `SaveChanges|ExecuteSql|ExecuteUpdate|
  ExecuteDelete|BeginTransaction|File.Write|WriteAll|pg_dump|MigrateAsync|ExecuteNonQuery|File.Create|Delete|Move|Copy`.
  Outside the sandbox and `DataTransfer` tools, it hits only `Apply.cs`, `Backup.cs` and `Invariants.WriteAsync`. I
  also listed every service the inspect and verify paths resolve (`GetRequiredService<…>`):
  - `PricingModeReviewService.GetAsync`. Its only `SaveChangesAsync` is in `SetAsync`, at line 183;
  - `OrderDecisionContextQueries`, `ManagementDashboardQueries`, `MonthlyReportQueries`, `OrderRequestQueries` and
    `LocationOrderQueries`. None of them writes;
  - `ImportCatalogLoader` and `IExcelWorkbookReader`. Neither writes.

  So Əmr 1–4 write nothing.
- **`PricingModeReviewService.cs:46–47`**: the totals count `UnitPrice == null` lines only, so the PriceRequired total is
  G2's second figure, as the kit says.
- **The §3 fact the code contradicts.** There is no batch list on `/imports`: `ImportsPage.tsx` (317 lines) reads one
  batch by `?id=` (38–39, 52–67), and no controller under `Api/Controllers/Import*` has a list route. The kit reads the
  batch states from Əmr 1 and Əmr 3 instead (5.1). Its STOP conditions match protocol §5.2 and §8 (`TASK-15.md:101–103`,
  `:172–175`, `:402`). It also tells the admin not to open `/imports?id=6`, whose review buttons are live
  (`ImportsPage.tsx:157–167`). This is the right way round: the gate figure stays readable without anything being
  written, and nothing is invented.
- **`--backup` and the baseline.** Spec §6.1 item 1 said `--backup` would overwrite the baseline. `Backup.cs:70–83`
  keeps it once the migration is applied. The kit does not repeat the wrong claim and still forbids `--backup`, so
  safety is unchanged.
- **The two `--verify` commands left out.** `ProductMatchMigration/Verification.cs:43–45` requires an empty decisions
  table. `ImportPricingMigration/Invariants.cs:26–32` states that it copies every 13a figure. The reasons hold.
- **`ProductMatchSuggestions.cs:84–89`**: a decided pair is not suggested again until undone. That supports the kit's
  read-only way of telling whether a real approval happened.
- **`04-sandbox.md`'s screen words.** These all match word for word:
  - `components/workflow/labels.ts` 5–10, 49–50, 55, 62–81 and 152;
  - `layout/navigation.ts` 27, 30, 33–39;
  - `components/catalog/matches/labels.ts` 21–25, 54–70;
  - `ImportsPage.tsx` 206–222, 250–264 and 293–305.
- **Who may do what.** `SecuritySetup.cs:68–97` and `ICurrentUserContext.cs:60–86` match the kit:
  - imports, submission and the catalogue go to the Coordinator and the Admin;
  - order approval goes to the Manager (Rəhbər) alone;
  - the queue is visible to the Rəhbər and the Admin;
  - product-match decisions go to the Admin alone.
- **Check IDs and secrets.** A `Grep` over `03-*.md` and `04-*.md` for `\b[A-Za-z]-\d{2}\b|\bP[0-3]\b|Password=|
  PGPASSWORD|Host=` finds nothing. The sandbox arithmetic labels `Ə-U` / `Ə-P` / `Ə-D` are not of the check-ID form.

## Acceptance criteria (§10)

1. **Pass.** Both files exist, in Azerbaijani. `02-yoxlama-siyahisi.md` does not.
2. **Pass.** Əmr 1–4 each have:
   - the exact line and the working directory (1.3, the repository root);
   - what it reads, as a table of output headings with source lines;
   - the no-write evidence;
   - the safety line `Database: baxorders_dev @ localhost:55434 (user baxorders)`, with the rule to discard and rerun
     otherwise. A pre-check `Test-Path Env:ConnectionStrings__BaxOrders` guards against a sandbox window
     (`sandbox.ps1:64`);
   - "Hara gedir", naming the lines and the gate fields.
3. **Pass.** 4.1 says `--verify` can pass today, from the code, with the empty `src tools` diff and
   `REVIEWS/TASK-16a.md:50`. 4.2 lists the nine checks, each with what a FAIL means. 4.3 covers the missing baseline,
   and forbids creating it. 4.4 gives the two recorded legitimate causes and how to see them read-only. 4.5 gives the
   A-equals-J rule, with no verdict from the operator and every A≠J line treated as a §8-level fact. §6 gives the two
   left-out verifies and their reasons.
4. **Pass.** `--backup`, `--apply`, `pg_dump`, `pg_restore`, `dotnet ef` and `psql` appear only in 1.4, "Heç vaxt
   işlətməyin", and in the §6 descriptions. None appears in a code block. 5.3 says no SQL is needed, and 5.2 says
   what is recorded instead, in the spec's own words.
5. **Pass.** `04-sandbox.md` points to `01-hazirliq.md` §5.1–5.5 and repeats none of it. It has the three-point check
   (section 1) and the locked-file fallback (section 2, the five steps of spec §6.2 item 2).
6. **Pass.**
   - **Sınaq 1**: the flow on the waiting order, plus Sınaq obyekti 2's draft sent by hand, with its reason. It covers
     4.2 (step 5), 4.3 (step 3), the four facts at every step, the correction via «Düzəliş versiyası yarat», the
     historical sentence (step 8) and the K2 walk (step 7), pointing to section G.
   - **Sınaq 2**: 390 × 844 after a reset, with the fixed bottom bar.
   - **Sınaq 3**: Task 16 on the trimmed copy, made outside the repository.
   - **Sınaq 4**: Task 13 on the same data, before any reset.
   - **Sınaq 5**: the fallback, naming the dependent bullets.

   Every label and route cites its frontend file.
7. **Pass.** The closing table covers every write-check of briefs 04, 13 and 16. It also covers decisions 4.1, 4.2,
   4.3, 4.3a, 13.1, 13.1a, 13.2 and 16.1, and protocol §6.4 and §6.5. Each row is *sınaq* with its steps, «yoxlanıla
   bilmədi» with a reason (the «15 W» row), or "real data, yalnız oxuma — bu faylda deyil". No step writes to
   `baxorders_dev`.
8. **Pass.** No check ID and no `P1`/`P2` label. The screenshot pattern is `<ID>-<ekran>-<en>.png`.
9. **Pass.** No password, token, secret value or connection string. The tools' own `Database:` line has none
   (`ToolSettings.cs:71–76`).
10. **Pass.** Nothing of the 23.09.2026 audit is reconstructed.
11. **Pass.** See "What was inspected".

## Scope and the Coder's additions

The Coder listed seven additions to `04-sandbox.md` and three to `03-emrler.md` (`LAST_REPORT.md` §3, §7). I weighed
each one:

- **`03-emrler.md`**:
  - the `ConnectionStrings__BaxOrders` pre-check;
  - the UTF-8 capture to `%TEMP%`, with cleanup at the end;
  - the extended write grep (`ExecuteNonQuery`, and raw SQL).

  All three tighten safety. **Kept.**
- **Sınaq 1**: send Sınaq obyekti 2's draft by hand. This is what `SandboxScenario.cs:55–64` keeps the draft for, and
  the waiting order keeps the July/August basis and the unpriced line. **Kept.**
- **The correction by a new version.** `WorkflowPanel.tsx:163–167` says so. The send button's label is left as
  "whichever shows", and this is honestly marked unverified. **Kept.**
- **Sınaq 3, step 5**: mark the Azpetrol supplier NotRequired, in the sandbox only. Without it, brief 16's fourth
  acceptance bullet would pass by default. The page and the policy are cited. **Kept.** It is the right way to make
  the check real.
- **The workbook trim**: keep other HEM spellings; map `Nərimanov` to the new `Nərimanov Heykəli` object, citing
  CB-03. It is sandbox-only data, and the kit says no Task 3 rule is applied. **Kept.**
- **The shorter-base rejection** (`ProductMatchSuggestions.cs:81–83`) and **the M − U arithmetic**
  (`ImportConfirmationDtos.cs:67–69`). Both are from the code. **Kept.**

None of them adds a business rule, loosens a gate or writes to real data.

## Notes (not blocking)

- Two facts in the Planner's spec were wrong, and the kit follows the code:
  - there is no batch list on `/imports`;
  - `--backup` keeps the baseline once the migration is applied.

  Also, `ImportOptions.MaxBulkResolutionItems` is at line 17, not 16. `TASKS/TASK-15a2.md` was left unedited, as it
  should be.
- Not verifiable from the code, and correctly left open in the kit:
  - whether the trimmed import reaches «İmporta hazırdır» in one session. Sınaq 5 is the fallback;
  - whether the sandbox shows the 750.00 ₼ split. The check is "unchanged by the approval" (P4).
- `01-hazirliq.md` §5.4 still says nothing of the migration-seeded objects (HEM, RAMANA, MASTAGA, EMIRCAN) and units in
  a reset sandbox. 15a2 could not change that file (spec §6.3). `04-sandbox.md` states what it needs itself. 15a5's
  whole-kit check may add a pointer.
- **For 15a3:**
  - Sections A and J must name «Əmr 1» … «Əmr 4» and the fields their "Hara gedir" lists give.
  - G2's batch states come from `03-emrler.md` §5.1 (Əmr 1 and Əmr 3), **not** from an `/imports` list, which does
    not exist. No checklist row may send an admin to `/imports?id=6`.
  - HD-002's share of «Ödənişsiz daxili təminat» is `03-emrler.md` §5.2.
  - Section J's "equal to A" check is `03-emrler.md` §4.5, with the `Compare-Object` lines.
  - Section F and K2 point to `04-sandbox.md`: Sınaq 1, addım 1–8; Sınaq 2; and K2 at Sınaq 1, addım 7.
  - The checklist must use the marker `---- operator doldurur ----` exactly (from the 15a1 review).
