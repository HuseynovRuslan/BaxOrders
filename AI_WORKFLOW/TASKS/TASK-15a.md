# TASK 15a — YEKUN AUDİT: OPERATORUN DƏSTİ (Task 15, part 1 of 2)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by 15a and 15b; there is no `TASK-15a` brief).
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md`. It says *what* the audit checks and how it is reported. This file says what
the Coder prepares so that the owner's operator can run it. Where this file and the protocol disagree, the protocol
wins; where the protocol and the brief disagree, the brief wins. Either way: STOP and report.

Specification status: **complete, but blocked by HD-007 (the runner's permissions).** Written by the Planner on
2026-09-25, after HD-006 was resolved (`PLAN.md`, "HD-006 — owner's answers"). Repository at `7550eda` (HEAD).
The Coder's permission profile in `run-agent.ps1` (`$coderAllow`, lines 940–963) grants `Edit` on `src/`,
`frontend/`, `tests/`, `tools/`, `BaxOrders.slnx`, `STATE.json` and `LAST_REPORT.md`, and not on `docs/`. This task
writes only under `docs/audits/`, so a Coder run would be refused at its first file, the way Task 11b's deletions were
(HD-005). Only the owner edits the runner. Once `'"Edit(docs/audits/**)"'` is in `$coderAllow`, this specification
is READY as written. Nothing in it changes.

**Documentation only.** This task adds files under `docs/audits/` and nothing else. No application code, test, style,
schema, migration, tool or data changes. No database command of any kind. This file carries no `DATA_MIGRATION` line,
on purpose.

---

## 1. Why this part exists

The owner decided who runs the audit (A3): *"the owner's operator, not the Coder. The Coder has no browser, no Rəhbər
credential and no database of its own. The Coder's part is to prepare: the checklist, the queries, the sandbox seed,
the exact steps. The operator then runs them and hands the results back for the report."*

So Task 15 runs in three steps (protocol, header):

1. **15a (this file), Coder:** the kit, and the regression suites' baseline.
2. **The operator:** runs the kit on the real system and in the sandbox, and fills in the results. A human step,
   opened as HD-008 when 15a is accepted (§9).
3. **15b, Coder:** assembles the report from the filled results. Planned once the results exist.

## 2. Which parts of the brief and protocol 15a carries

15a produces no verdict of its own. It makes every check the brief requires *runnable and recordable*, so that none
can be dropped at the seam. That is why it has to cover every item below:

| Brief / protocol item | 15a carries | Left to |
|---|---|---|
| Gates 15.1, 15.2, 15.2a (protocol §5) | the steps, commands and blank fields for G1–G3 | operator runs; 15b reports |
| "Hər köhnə tapıntı üçün vəziyyət … sübutla" (§6.1) | one checklist row per old finding, with the first audit's recorded figure where a brief gives one | operator; 15b |
| "Task 4–16-nın qəbul şərtləri" (§6.2) | one row per acceptance bullet of `BRIEFS/TASK-04.md` … `TASK-14.md`, `TASK-16.md` | operator; 15b |
| Owner decisions 4.1 … 16.1 (A2, §6.2) | one row per decision, 20 rows | operator; 15b |
| "Task 1–3 üzrə regress" and the good points (§6.3) | one row per sample, verbatim from the brief | operator; 15b |
| "Təsdiq axını ayrıca test sifarişi ilə" (15.1, §6.4) | the sandbox preparation and the six steps | operator; 15b |
| "Klik sayı … 3 klik + 3 sürüşdürmə" (§6.5) | K1 and K2, with a step-by-step count sheet | operator; 15b |
| Widths 1366, 1440, 390, 1150–1279 (§6.6) | how to set each width, and which screens at which width | operator; 15b |
| The §3 carried list | one row each | operator; 15b |
| The end-state reading (protocol §9 item 11) | the same read-only commands, run again at the end | operator; 15b |
| The regression suites (§5.3) | **run by the Coder now**, as the baseline | 15b runs them again |
| The report, the P0–P3 table, the final answer, proposed tasks (§7) | the report skeleton only, no content | **15b** |
| "Yoxlanıla bilməyənlər" (§0.1) | carried unchanged into the report skeleton | 15b |

The acceptance criteria that 15a leaves to 15b by name: protocol §9 items **1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11** (all of
them need the operator's results). 15a itself carries item **12** (the suites) for the baseline and the rest of this
file's §8.

## 3. Verified current state (repository at `7550eda`)

- Accepted: every task 04–14 and 16. HEAD `7550eda`. Untracked: `AI_WORKFLOW/`, `monitor-agent.ps1`,
  `resume-agent.ps1`, `run-agent.ps1` (workflow infrastructure, never part of a task's diff).
- `docs/` holds `business-decisions.md` and `excel-import-notes.md`. `docs/audits/` does not exist yet.
- Real database `baxorders_dev`. Batch #50010 `Imported` (January–September 2026), batch #6 `NeedsReview` (superseded,
  never to be confirmed; protocol §5.2). Last recorded Qiymət təsnifatı: Unresolved 0 / PriceRequired 0 /
  InternalFreeSupply 95, with 94 decisions (16a). HD-002 is resolved: those 94 rows stand (A4).
- Read-only tool commands that exist today, each documented in its `Program.cs` as "Changes nothing":
  - `dotnet run --project tools/BaxOrders.ImportPricingMigration -- --inspect` — migrations, staged imports,
    Qiymət təsnifatı, NotRequired suppliers, the H.Ə.M alias;
  - `… ImportPricingMigration -- --verify` — nothing pending, the four 16a columns there and NULL on every row, every
    figure recorded at 16a's backup unchanged;
  - `dotnet run --project tools/BaxOrders.ProductMatchMigration -- --inspect` — migrations, the catalogue, every
    current product-match suggestion;
  - `… ProductMatchMigration -- --verify` — nothing pending, `ProductMatchDecisions` empty, every figure unchanged;
  - `dotnet run --project tools/BaxOrders.CatalogueMigration -- --inspect` / `--verify`.
  Whether each `--verify` can still pass today is **not** known: a later task may have legitimately changed what it
  checks (for example, 13b/13c's approvals would make `ProductMatchDecisions` non-empty). §4.4 makes the Coder find
  out from the code.
- Approval sandbox: `tools/BaxOrders.ApprovalSandbox/sandbox.ps1` with `-Create`, `-Reset`, `-Drop`, `-Run`. It makes
  `baxorders_sandbox`, seeded by `SandboxSeed.cs` / `SandboxScenario.cs` with:
  - three accounts: `sinaq.rehber` («Sınaq Rəhbəri», Manager), `sinaq.koordinator` («Sınaq Koordinatoru»,
    Coordinator), `sinaq.admin` («Sınaq Administratoru», Admin). Their password is `BAXORDERS_SANDBOX_PASSWORD`,
    chosen by the operator, stored nowhere;
  - two locations, one supplier, the scenario's products, historical orders carried in as approved, one test order
    sent for approval (by the coordinator) and one unsent draft.
  - The API runs on `http://localhost:5081`; the UI with `npm run dev:sandbox` on `http://localhost:5174`.
- Sample workbooks exist locally under `samples/` (`samples/imports/raw/…`, `samples/decisions/…`). Whether they are
  tracked by git is for the Coder to check (`git ls-files samples`); the kit may name them either way.
- Test suites at `7550eda`: frontend 51 files / 957 tests; backend 1046 unit / 785 integration (16b review).
- The Coder's permissions (`run-agent.ps1`): `npm run`, `dotnet build`, `dotnet test`, `git status/diff/log/show`.
  No `dotnet run` of a tool, no `psql`, no `pg_dump`, no browser. The Coder cannot run anything in the kit and must
  not try.

## 4. What the Coder writes

All files go under `docs/audits/2026-final-enver-muellim-audit/`. The operator's language, and the brief's, is
Azerbaijani: every file in the kit is written in Azerbaijani, in plain business words, with command lines and file
paths left as they are.

### 4.1 `README.md` — the kit's front page

- What the audit is, in three sentences, quoting the brief's goal.
- Who does what (A3): the operator runs; the Coder prepared; 15b assembles.
- The order of work: `01-hazirliq.md` → gates → checklist → end-state reading → hand back.
- The hard rules, verbatim from the brief and the protocol: read-only on real data; no real order approved, returned
  or edited; nothing classified, matched or confirmed on `baxorders_dev`; batch #6 never confirmed; every write-check
  in the sandbox only; the Rəhbər account, not an admin.
- **Credentials:** a password is typed into a login form or an environment variable, never into a file of the kit,
  the results, a screenshot or a command history that is saved.
- What to hand back (§4.6), and where.
- The protocol's §0.1 list, so the operator knows which parts of the brief cannot be checked and does not try to
  reconstruct them.

### 4.2 `01-hazirliq.md` — preparation, exact steps

1. **G1 fact:** the date; if after 2026-10-31, STOP (protocol §5.1).
2. **Commit:** `git rev-parse HEAD` and `git diff --stat 7550eda HEAD`; allowed: only `docs/audits/` changed.
3. **Real system:** how the API and the frontend are started for `baxorders_dev` (take the commands from the
   repository's own scripts and READMEs — `scripts/dev-postgres.ps1`, `frontend/bax-orders-web/package.json`, the API's
   launch profiles; cite each source). Record the API start time.
4. **The Rəhbər account (G3):** how to check, read-only, that an active Rəhbər user exists (e.g. the İstifadəçilər
   page read by an admin, without saving anything). If none: STOP; creating a user is the owner's decision.
5. **The sandbox:** the exact sequence, with the password set as an environment variable and never echoed:
   `-Reset` (or `-Create` the first time), `-Run` in one window, `npm run --prefix frontend/bax-orders-web dev:sandbox`
   in another; the URLs; the three accounts by user name and display name. State, from `SandboxScenario.cs`, what
   the reset leaves: which order is waiting for approval and which is a draft, by object and period. After the flow:
   `-Reset` again.
6. **Widths:** how to set 1366 × 768, 1440 × 900, 390 × 844 and 1200 × 800 in the browser's device toolbar, and
   that 1200 stands for the 1150–1279 range (protocol §10 A3). The zoom stays at 100 %.
7. **Screenshots:** the folder `ekranlar/`, the name pattern `NN-<ekran>-<en>.png` (NN = the check's ID), and that
   none may show a password or token. Required for every G2 figure and every item the operator judges P0/P1;
   optional elsewhere (protocol §7.2).

### 4.3 `02-yoxlama-siyahisi.md` — the checklist

One numbered row per check. Every row has the same fields, so 15b can read them mechanically:

```
### NN — <short title>
Mənbə: <brief file + section, or protocol §>, sitat: "<the bullet, verbatim>"
Harada: <environment: real / sandbox> · <screen> · <URL or menu path> · <width(s)>
Addımlar: <numbered clicks, as exact as the code allows>
Gözlənilən: <what the brief or an accepted review says should be seen, with its figure and its source; or "brief rəqəm vermir">
İlk auditdə: <the figure or text the brief records for the first audit, if it gives one; otherwise "brief qeyd etmir">
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:
```

The sections of the checklist, in this order:

- **A. Gates** — G1, G2 (each figure of protocol §5.2 as its own field: «Təsnif edilməyib», «Alış qiyməti tələb
  olunur» and how many without a price, «Ödənişsiz daxili təminat», the batch states), G3.
- **B. Old findings** — protocol §6.1: every bullet under «Auditdə müşahidə edilən hazırkı problem» in
  `BRIEFS/TASK-04.md` … `TASK-14.md`, one row per bullet, and one row per example where a bullet lists several
  (protocol §10 A2). Each row names the task that addressed it. Then the four "Xeyr" reasons of `BRIEFS/TASK-15.md`,
  one summary row each, listing the row numbers they rest on. No priority field is filled by the Coder: the first
  audit's priorities are unknown (A2).
- **C. Acceptance** — every bullet under «Acceptance — biznes dili ilə» in `BRIEFS/TASK-04.md` … `TASK-14.md` and
  `TASK-16.md`, one row each, verbatim. Rows whose check needs a write (Task 4's flow, Task 13's approve/undo,
  Task 16's classification) say *sandbox* and give the sandbox steps from §4.5; never real data.
- **D. Owner decisions** — the twenty rows of the closing journal of `BRIEFS/OWNER_BRIEFS_MASTER.md` (4.1, 4.2, 4.3,
  4.3a, 5.1, 7.1, 7.1a, 8.1, 8.2, 9.1, 11.1, 13.1, 13.1a, 13.2, 14.1, 14.2, 15.1, 15.2, 15.2a, 16.1), each quoted,
  each with what on screen shows it honoured. A row may point to a C row instead of repeating it ("C-NN ilə eyni").
  15.1, 15.2 and 15.2a point to the gates.
- **E. Regression, on September data** — the six sample groups of protocol §6.3, verbatim from the brief, one row per
  sample. For Task 1c: the three orders (Heydər Əliyev, Fəvvarələr, Nərimanov), with fields for baza, fərq and cari
  per line and for the sum, so the arithmetic can be checked.
- **F. The approval flow** — protocol §6.4's six steps, each a row with the four facts to record (who sent it and
  when; which submission, in business words; the previous correction reason; who approved it and when), then the
  4.2 check (empty reason refused), the 4.3 check (`sinaq.admin` cannot approve), at 1366 and at 390.
- **G. Click count** — K1 and K2 (protocol §6.5), each as a sheet with one line per action (`klik` / `sürüşdürmə`,
  what was clicked or scrolled to) and a total, at 1366 × 768.
- **H. Widths** — protocol §6.6: dashboard, monthly report, order page, object page at 390 and 1200; every screen of
  the scenario at 1366 and 1440.
- **I. Carried items** — protocol §3's list, one row each: still present or not, where.
- **J. End state** — the §4.4 commands run again, and the Qiymət təsnifatı totals and batch states read again, with a
  field "başlanğıcla eynidir: bəli / xeyr".
- **K. New findings** — an empty, repeatable block for anything the operator sees that no row covers: screen, width,
  figure, what is wrong, screenshot. The operator does not assign the task or the priority; 15b does.

Expected figures: only from a brief, an accepted review (`AI_WORKFLOW/REVIEWS/`), an accepted report or
`docs/business-decisions.md`, each with its source cited in the row. **Never** a figure the Coder computed, guessed or
remembered. Where no source gives one: «brief rəqəm vermir».

Steps: take routes, menu names, button labels and tab names from the frontend code (`frontend/bax-orders-web/src/`),
so a step says exactly what the operator will see. Cite nothing that is not in the code at `7550eda`.

### 4.4 `03-emrler.md` — the read-only commands ("the queries")

- The commands the operator runs at the start (after G3) and again at the end (section J): the `--inspect` commands
  of §3, and each `--verify` whose outcome today can be predicted from the code.
- For each command: the exact line, which working directory, what it reads, which lines of its output the operator
  copies into which checklist field, and the line in the tool's code that proves it writes nothing.
- For each `--verify`: read its `Verification.cs` (or equivalent) and say, from the code, whether it can still pass
  after the tasks accepted since it was written. If a check would legitimately fail today (a table no longer empty,
  a baseline taken before a later task), say so and either drop that command from the kit or tell the operator which
  failure line is expected. Never let an expected failure look like a finding, or a finding look expected.
- Any figure the gates or section J need that no screen and no existing command prints may be given as read-only SQL,
  but only as a last resort, and only in this form:
  ```
  BEGIN TRANSACTION READ ONLY;
  SELECT …;
  ROLLBACK;
  ```
  Table and column names come from
  `src/BaxOrders.Infrastructure/Persistence/Migrations/BaxOrdersDbContextModelSnapshot.cs`, cited. No `INSERT`,
  `UPDATE`, `DELETE`, DDL, function call with side effects or `COMMIT` anywhere in the kit. If none is needed, the
  file says so.
- The kit never includes `--backup` or `--apply` of any tool, `pg_dump`, `pg_restore` or `dotnet ef`.

### 4.5 `04-sandbox.md` — the sandbox preparation ("the sandbox seed")

- Uses the existing sandbox tool only. **No change to `tools/` or to the seed.** The brief rules out code changes, and
  the seed as it stands was built for exactly this flow (Task 4).
- For each write-check in sections C, D and F, say from the code whether the reset sandbox can host it through the
  UI, and give the steps:
  - Task 4's flow and 4.2 / 4.3: on the seeded test order.
  - Task 13's approve and undo (13.2, 13.1a): whether the sandbox's products give a match suggestion at all
    (`SandboxScenario.Products`, and how suggestions are produced — cite the code). If not, the rows say
    «yoxlanıla bilmədi: sandbox-da uyğunluq təklifi yoxdur», and the read-only part of each criterion is still checked
    on real data (for example, 13c's HEM September «Keçən ay» figure, if its link has been approved there).
  - Task 16's classification (16.1): which workbook the operator uploads into the sandbox, and what the operator
    should expect to see in the review. If no workbook in the repository or `samples/` fits, say so and mark the rows
    «yoxlanıla bilmədi» with that reason. A real workbook uploaded into the sandbox changes only the sandbox.
- After every sandbox session: `-Reset`.

### 4.6 `05-neticeler-qaytarilmasi.md` — how results come back

- The operator copies `02-yoxlama-siyahisi.md` to `neticeler.md` in the same folder and fills the "operator
  doldurur" fields there. The checklist itself stays blank.
- Screenshots in `ekranlar/`.
- The operator's name or role, the date and the time of the start and the end, at the top of `neticeler.md`.
- The raw output of each §4.4 command, pasted into `neticeler.md` under section A (start) and J (end), with any
  password-like line removed.
- When done: tell the workflow the results are in (HD-008, §9). Nothing is committed by the operator.

### 4.7 `06-hesabat-skeleti.md` — the report skeleton for 15b

The fourteen section headings of protocol §7.1, in that order, each with one line saying which checklist sections
feed it; section 1 carries the protocol's §0.1 text; section 14 ends with the brief's question, verbatim:
"Bu ayın sifarişləri bu gün Ənvər müəllimə verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?"
followed by `Cavab: Bəli / Xeyr —` and nothing else. The P0–P3 scale and the answer's rule of protocol §7.1, copied.
No finding, verdict or figure.

## 5. Regression suites (the baseline, protocol §5.3)

Run, and record the summary lines exactly as they come out:

- `npm run --prefix frontend/bax-orders-web test` (expect 51 files / 957 tests);
- `npm run --prefix frontend/bax-orders-web build`;
- `dotnet build BaxOrders.slnx` and `dotnet test BaxOrders.slnx` (expect 1046 unit / 785 integration).

If the running API locks `src/BaxOrders.Api/bin` (as in 16b), use `--artifacts-path` into the scratchpad, as 16b did.
Do not stop or restart the API. A red suite is itself a finding for the audit: record it, do not fix it.

## 6. Out of scope

- running any part of the kit, or any database command;
- any change outside `docs/audits/2026-final-enver-muellim-audit/` (and `AI_WORKFLOW/LAST_REPORT.md`);
- a verdict, a priority, a finding or a report text;
- reconstructing anything of the 23.09.2026 audit (A2): its sections, priorities or click path;
- editing a brief, `TASKS/TASK-15.md`, or any tool, including the sandbox seed.

## 7. Safety and STOP conditions

STOP and report if:

- a check can only be run by writing to `baxorders_dev`: write the row as «yoxlanıla bilmədi» with the reason instead,
  and list it in the report;
- a brief's acceptance bullet cannot be turned into a check at all: list it, do not drop it;
- the brief and the protocol disagree;
- a credential would have to be written into a file.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `git commit` / `reset` / `checkout` /
`push`, or an edit outside the folder above and `AI_WORKFLOW/LAST_REPORT.md`.

## 8. Acceptance criteria

1. The kit exists: `README.md`, `01-hazirliq.md`, `02-yoxlama-siyahisi.md`, `03-emrler.md`, `04-sandbox.md`,
   `05-neticeler-qaytarilmasi.md`, `06-hesabat-skeleti.md` under `docs/audits/2026-final-enver-muellim-audit/`, in
   Azerbaijani.
2. **Coverage, counted.** The report lists, for each brief file 04–14 and 16, the number of «Auditdə müşahidə edilən
   hazırkı problem» bullets (04–14) and «Acceptance — biznes dili ilə» bullets (04–14, 16), and the checklist row
   numbers that carry each. Every bullet has a row; none is merged away. Section D has exactly 20 rows. Section E has
   every sample of `BRIEFS/TASK-15.md` «Mütləq qorunmalı davranışlar».
3. Every row has the fixed fields of §4.3. Every «Gözlənilən» figure cites its source; none is invented.
4. Every write-check says *sandbox* and has steps, or says «yoxlanıla bilmədi» with a reason from the code. No step
   anywhere writes to `baxorders_dev`.
5. `03-emrler.md` contains no `--backup`, `--apply`, `pg_dump`, `pg_restore`, `dotnet ef`, and no SQL other than
   `BEGIN TRANSACTION READ ONLY … ROLLBACK` blocks of `SELECT`s. For each `--verify` it states, from the code, whether
   it can pass today.
6. No file of the kit contains a password, a token or a connection string with a password.
7. Nothing of the first audit is reconstructed: no section list, priority or click path is attributed to it. The
   protocol's §0.1 text appears in `README.md` and in the skeleton's section 1.
8. `git status` shows only the new folder beyond the untracked workflow files. `git diff 7550eda` is empty outside
   `docs/audits/`.
9. The suites' results (§5) are in `LAST_REPORT.md`, raw.

## 9. After acceptance: HD-008 (for the Reviewer)

When the Reviewer accepts 15a, the next step is not a Coder. The Reviewer:

- sets `STATE.json` to `HUMAN_REQUIRED`, `currentTask` `15b`, reason `TASK_15_OPERATOR_RUN`;
- adds **HD-008 — the operator runs the audit kit** to `PLAN.md`: run `docs/audits/2026-final-enver-muellim-audit/`
  as its README says, fill `neticeler.md` and `ekranlar/`, then set `STATE.json` to `PLANNING` for 15b;
- replaces `CURRENT_TASK.md` with those instructions.

The Planner writes `TASKS/TASK-15b.md` only when `neticeler.md` exists and is filled. Without it, the Planner sets
`HUMAN_REQUIRED` with the reason `TASK_15_OPERATOR_RESULTS_MISSING`.

## 10. Final report (`AI_WORKFLOW/LAST_REPORT.md`)

- HEAD, `git status --short`, `git diff --stat 7550eda`;
- the kit's files, with line counts;
- the coverage table of §8 item 2;
- for each §4.4 command: what it prints and whether its `--verify` can pass today, with the code line;
- for each write-check: sandbox, or «yoxlanıla bilmədi» and why;
- any bullet that could not be turned into a check, and why;
- the suites' raw summary lines;
- a statement that no command was run against any database and no file outside the kit changed.

End with `READY_FOR_REVIEW`.

## 11. Assumptions the Planner made

- P1. The kit lives in `docs/audits/2026-final-enver-muellim-audit/`, the folder protocol §7.2 already gives the
  screenshots, so the audit's files stay together.
- P2. The kit is written in Azerbaijani, the brief's language and the operator's.
- P3. "The queries" (A3) are met first by the existing read-only tool commands; SQL only as a last resort, and only
  inside a read-only transaction. Those tools are already reviewed and cannot write outside `--apply`.
- P4. "The sandbox seed" (A3) is met by preparation steps with the existing sandbox tool, not by a new seed. A new
  seed would be a code change, which the brief rules out.
- P5. The operator fills a copy of the checklist (`neticeler.md`), so the blank checklist stays reviewable and 15b
  reads one fixed format.
- P6. The laptop width is 1200 × 800 (protocol §10 A3), and the heights are the common ones for each width.
- P7. The operator does not assign priorities or proposed tasks; 15b does, from the recorded evidence, on the
  protocol's scale. The operator records what is seen.
