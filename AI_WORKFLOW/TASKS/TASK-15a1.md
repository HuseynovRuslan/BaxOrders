# TASK 15a1 — YEKUN AUDİT DƏSTİ: ÖN SƏHİFƏ, HAZIRLIQ, QAYTARMA, SKELET, BAZA TESTLƏRİ (Task 15a, sub-part 1 of 5)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by every part of Task 15; there is no `TASK-15a1` brief).
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md` — what the audit checks and how it is reported. Unchanged.
Kit specification: `AI_WORKFLOW/TASKS/TASK-15a.md` — what the whole kit contains. Unchanged, and it still governs.
This file carves out the part of it that one Coder session can finish. Where this file and `TASK-15a.md` disagree,
`TASK-15a.md` wins; where it and the protocol disagree, the protocol wins; where the protocol and the brief disagree,
the brief wins. In every such case: STOP and report.

Specification status: **READY.** Written by the Planner on 2026-09-25, repository at `7550eda` (HEAD).

**Documentation only.** This part adds four files under `docs/audits/2026-final-enver-muellim-audit/` and runs the
regression suites. No application code, test, style, schema, migration, tool or data change. No database command of any
kind. This file carries no data-migration line, on purpose.

---

## 1. Why 15a was split again

`TASK-15a.md` was attempted five times on 2026-09-25 and no run wrote a single file (`CURRENT_TASK.md`, the operator's
note of 15:00). The longest transcript (`LOGS/20260925-144944-cycle01-coder.jsonl`) shows why: the session read code
for the whole kit first — the last call was still investigating how import review blocks a confirmation, for Task 16's
sandbox checks — and was carrying about 400,000 tokens of context when the stream stopped, with nothing yet written.

So the kit is now produced in five sub-parts, each with its own reading list, each writing its files as it goes:

| Part | Writes | Carries of `TASK-15a.md` |
|---|---|---|
| **15a1 (this file)** | `README.md`, `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md`, `06-hesabat-skeleti.md`; the suites | §4.1, §4.2, §4.6, §4.7, §5; §8 items 6, 7, 8, 9 for its files |
| 15a2 | `03-emrler.md`, `04-sandbox.md` | §4.4, §4.5; §8 items 4 (sandbox side), 5, 6, 8 |
| 15a3 | `02-yoxlama-siyahisi.md`: the preamble and sections A, E, F, G, H, I, J, K | §4.3 for those sections; §8 items 2 (section E), 3, 4, 6, 8 |
| 15a4 | `02-yoxlama-siyahisi.md`: sections B and C for `BRIEFS/TASK-04.md` … `TASK-09.md` | §4.3 B, C; §8 items 2, 3, 4, 6, 8 for those briefs |
| 15a5 | `02-yoxlama-siyahisi.md`: sections B and C for `TASK-10.md` … `TASK-14.md` and `TASK-16.md`, B's four "Xeyr" summary rows, section D; the whole-kit coverage count | the rest of §4.3; §8 items 1, 2 (whole kit), 3, 4, 6, 7, 8 |

Only this part's specification is written now. 15a2 … 15a5 are each planned from `TASK-15a.md`, this table and
`PLAN.md` when the previous part is accepted. Together they carry every item of `TASK-15a.md` §2 and §8.
**HD-008 (the operator run) opens only when 15a5 is accepted.** `TASK-15a.md` §9 then applies as written, with "15a" read
as "15a5, the last kit part". Accepting 15a1 opens nothing for the operator.

`TASK-15a.md`'s status line ("blocked by HD-007") is out of date: the runner now grants `Edit(docs/audits/**)`
(`run-agent.ps1:951`), so HD-007 is resolved (`PLAN.md`). Nothing else in `TASK-15a.md` changes.

## 2. Which acceptance criteria this part carries, and which it leaves

This part produces no check rows, no command lines for the tools, no sandbox write-check and no verdict.

- **Carried here:** `TASK-15a.md` §8 item 9 (the suites, in full); item 7's two textual requirements (the protocol's
  §0.1 text in `README.md` and in the skeleton's section 1; nothing of the first audit reconstructed); items 6 and 8
  for the four files written here; item 1 for four of the seven files.
- **Left to 15a2:** item 5 (`03-emrler.md`), item 4's sandbox steps (`04-sandbox.md`).
- **Left to 15a3, 15a4 and 15a5:** items 2 and 3 (every checklist row), and item 4's rows.
- **Left to 15a5:** item 1's final check that all seven files exist, and item 2's whole-kit coverage count.
- **Left to 15b** (unchanged): the protocol's §9 items 1–11, as `TASK-15a.md` §2 says.

## 3. Verified current state (repository at `7550eda`)

- HEAD `7550eda` (`.git/refs/heads/main`). Untracked: `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1`,
  `run-agent.ps1` — workflow infrastructure, never part of a task's diff.
- `docs/` holds `business-decisions.md` and `excel-import-notes.md` only. `docs/audits/` does not exist.
- The Coder may write under `docs/audits/**` (`run-agent.ps1:951`) and nowhere else in `docs/`.
- How the real system starts, from the repository's own files:
  - database: `scripts/dev-postgres.ps1` — starts a private PostgreSQL cluster on port 55434; the connection strings are
    kept in .NET user-secrets (`ConnectionStrings:BaxOrders` for `src/BaxOrders.Api`), never in a file of the
    repository (its header, lines 1–20);
  - API: `src/BaxOrders.Api/Properties/launchSettings.json`, profile `http`, `http://localhost:5080`, environment
    `Development`; profile `sandbox`, `http://localhost:5081`, environment `Sandbox`;
  - frontend: `frontend/bax-orders-web/package.json`, `"dev": "vite"` and `"dev:sandbox": "vite --mode sandbox"`.
    The port `vite` serves the real UI on comes from `frontend/bax-orders-web/vite.config.ts`. Read it there and do
    not assume it. There is no `.env*` file in `frontend/bax-orders-web/`.
- Sandbox: `tools/BaxOrders.ApprovalSandbox/sandbox.ps1` (89 lines; `-Create`, `-Reset`, `-Drop`, `-Run`), seeded by
  `SandboxSeed.cs` (211 lines) and `SandboxScenario.cs` (121 lines). UI with `npm run dev:sandbox` on
  `http://localhost:5174`. Accounts `sinaq.rehber`, `sinaq.koordinator`, `sinaq.admin`; password from
  `BAXORDERS_SANDBOX_PASSWORD`, which is stored nowhere.
- Suites at `7550eda`: frontend 51 files / 957 tests; backend 1046 unit / 785 integration (16b review).

## 4. Working rules for this session. They are the fix, not advice.

1. **Read only what §5 lists.** Do not open `BRIEFS/TASK-04.md` … `TASK-14.md`, `TASK-16.md`, `OWNER_BRIEFS_MASTER.md`,
   `REVIEWS/`, `LOGS/`, or any `tools/` project other than `ApprovalSandbox`. Nothing written in this part needs them.
   Their content belongs to 15a2 … 15a5.
2. **Write each file as soon as its facts are in hand**, in the order of §6. Do not gather everything first. If the
   session is cut off, the files already written stand.
3. **Search narrowly.** Use `Grep` with a pattern and a path, not whole-directory reads. Read a file with a line range
   when only part of it is needed.
4. **Suites last** (§7), after the four files exist. Record only their summary lines in the report.

## 5. Reading list

- `AI_WORKFLOW/BRIEFS/TASK-15.md` (the brief, all of it);
- `AI_WORKFLOW/TASKS/TASK-15.md` (the protocol) — §0, §0.1, §5, §7.1, §7.2, §8;
- `AI_WORKFLOW/TASKS/TASK-15a.md` — §4.1, §4.2, §4.6, §4.7, §5, §6, §7, §8;
- `scripts/dev-postgres.ps1` (header and parameters), `src/BaxOrders.Api/Properties/launchSettings.json`,
  `frontend/bax-orders-web/package.json` (the `scripts` block), `frontend/bax-orders-web/vite.config.ts` (the port and
  the `sandbox` mode);
- `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, `SandboxScenario.cs`, and `SandboxSeed.cs` only where the scenario
  refers to it;
- for `01-hazirliq.md` item 4 only: the route and the menu name of the İstifadəçilər page — one `Grep` for
  `İstifadəçilər` under `frontend/bax-orders-web/src/`, and the route it points to.

## 6. What the Coder writes

All four files go under `docs/audits/2026-final-enver-muellim-audit/`, in Azerbaijani, in plain business words.
Command lines, file paths, URLs, user names and button labels stay exactly as they are.

**Check IDs.** Every file here that refers to a checklist row uses the ID form the whole kit shares:
`<section letter>-<two digits>`, for example `A-02` or `C-17`. Section letters are those of `TASK-15a.md` §4.3:
A Gates, B Old findings, C Acceptance, D Owner decisions, E Regression, F Approval flow, G Click count, H Widths,
I Carried items, J End state, K New findings. Screenshot names are `<ID>-<ekran>-<en>.png`, for example
`A-02-qiymet-tesnifati-1366.png`. This refines the `NN` of `TASK-15a.md` §4.2 item 7 and protocol §7.2. It does not
change them.

### 6.1 `README.md` — as `TASK-15a.md` §4.1, all seven bullets

- the goal, quoting the brief's «Məqsəd» verbatim;
- who does what (A3): the operator runs; the Coder prepared; 15b assembles the report;
- the order of work: `01-hazirliq.md` → `03-emrler.md` (start) → gates (section A of `02-yoxlama-siyahisi.md`) → the
  rest of the checklist, with `04-sandbox.md` for the sandbox rows → `03-emrler.md` again (section J) →
  `05-neticeler-qaytarilmasi.md`. Name the three files other parts write (`02`, `03`, `04`) as part of the kit;
- the hard rules, verbatim from the brief's «Qəbul edilmiş qərarlar» and the protocol's §2, §8: read-only on real data;
  no real order approved, returned or edited; nothing classified, matched or confirmed on `baxorders_dev`; batch #6
  never confirmed; every write-check in the sandbox only; the Rəhbər account, not an admin;
- credentials: a password goes into a login form or an environment variable only, never into a file of the kit, the
  results, a screenshot or a saved command history;
- what to hand back, and where: a pointer to `05-neticeler-qaytarilmasi.md`;
- «Yoxlanıla bilməyənlər»: the protocol's §0.1 three items, in Azerbaijani, with nothing added. Say that the operator
  does not try to rebuild them.

### 6.2 `01-hazirliq.md` — as `TASK-15a.md` §4.2, all seven items

1. **G1:** record the date. If it is after 2026-10-31: STOP and ask the owner (protocol §5.1, A16).
2. **Commit:** `git rev-parse HEAD` and `git diff --stat 7550eda HEAD`. Allowed: only files under `docs/audits/`
   changed. Anything else: STOP (protocol §8).
3. **The real system:** start the database, the API and the frontend, each command taken from the files of §3 with
   the file cited. Say which URL the operator opens. Record the API start time. Do not put a connection string in the
   file; say that it comes from user-secrets.
4. **The Rəhbər account (G3):** how to see, read-only, that an active Rəhbər user exists — the İstifadəçilər page,
   opened by an admin, looked at and left without saving. Then log out and log in as the Rəhbər: the header must show
   the Rəhbər's name, not "Administrator" (protocol §5.3). If there is no active Rəhbər: STOP. Creating a user is the
   owner's decision.
5. **The sandbox:** the exact sequence from `sandbox.ps1`'s own header and parameters. Set the password as an
   environment variable without echoing it. `sandbox.ps1:22` shows `$env:BAXORDERS_SANDBOX_PASSWORD = '<choose one>'`,
   which puts the password on a command line that PowerShell saves to its history. The kit therefore uses
   `$env:BAXORDERS_SANDBOX_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host 'Sınaq parolu' -AsSecureString)).Password`
   and says why. Give the password rule from `sandbox.ps1:73` (length, a digit, a lower-case letter). Then
   `-Reset` (`-Create` the first time), `-Run` in one window, `npm run --prefix frontend/bax-orders-web dev:sandbox`
   in another. Give the URLs and the three accounts by user name and display name. State, from `SandboxScenario.cs` and
   citing its lines, what a reset leaves: which order is waiting for approval and which is a draft, each by object and
   period. After every sandbox session: `-Reset` again. If `sandbox.ps1` or the scenario differs from §3 (another
   port, another account), follow the code and note the difference in the report.
6. **Widths:** how to set 1366 × 768, 1440 × 900, 390 × 844 and 1200 × 800 in the browser's device toolbar. 1200
   stands for the brief's 1150–1279 range (protocol §10 A3). Zoom stays at 100 %.
7. **Screenshots:** the folder `ekranlar/` beside the kit, the name pattern of §6 above, and that none may show a
   password or a token. Required for every G2 figure and every item the operator judges P0 or P1. Optional elsewhere
   (protocol §7.2).

### 6.3 `05-neticeler-qaytarilmasi.md` — as `TASK-15a.md` §4.6, all five bullets

- copy `02-yoxlama-siyahisi.md` to `neticeler.md` in the same folder, and fill only the fields under
  "---- operator doldurur ----". The checklist itself stays blank;
- screenshots go in `ekranlar/`, named as in §6;
- at the top of `neticeler.md`: the operator's name or role, the date, the start time and the end time;
- the raw output of each `03-emrler.md` command, pasted under section A (start) and section J (end), with any
  password-like line removed;
- when done: set `AI_WORKFLOW/STATE.json` to `PLANNING`, as HD-008 will say (`TASK-15a.md` §9). The operator commits
  nothing.

### 6.4 `06-hesabat-skeleti.md` — as `TASK-15a.md` §4.7

- The fourteen section headings of protocol §7.1, in that order, each followed by one line saying which checklist
  sections (A … K) feed it. Use this mapping, which follows the protocol's own references:
  1 ← README's §0.1 text; 2 ← A; 3 ← B; 4 ← C; 5 ← D; 6 ← E; 7 ← F; 8 ← G; 9 ← H; 10 ← I; 11 ← K; 12 ← B, C, D, E,
  F, G, H, I, K (every open item); 13 ← J; 14 ← all of the above.
- Section 1 carries the protocol's §0.1 text, the same words as `README.md`.
- The P0–P3 scale and the final answer's rule of protocol §7.1, copied, in Azerbaijani.
- Section 14 ends with the brief's question verbatim: "Bu ayın sifarişləri bu gün Ənvər müəllimə verilsəydi, o, bu
  sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?", then a line `Cavab: Bəli / Xeyr —` and nothing after it.
- No finding, verdict, priority or figure anywhere in the file.

## 7. Regression suites (the baseline, `TASK-15a.md` §5 / protocol §5.3)

Run from the repository root, without `cd`, and record the summary lines exactly as they come out:

- `npm run --prefix frontend/bax-orders-web test` (expect 51 files / 957 tests);
- `npm run --prefix frontend/bax-orders-web build`;
- `dotnet build BaxOrders.slnx`;
- `dotnet test BaxOrders.slnx` (expect 1046 unit / 785 integration).

If the running API locks `src/BaxOrders.Api/bin`, as it did in 16b, use `--artifacts-path` into a folder outside the
repository, as 16b did, and say so. Do not stop or restart the API. A red suite is a finding for the audit: record it
and do not fix it. 15a2 … 15a5 change only Markdown under `docs/audits/`, so they do not run the suites again. 15b
runs them again (protocol §5.3).

## 8. Out of scope

- `02-yoxlama-siyahisi.md`, `03-emrler.md`, `04-sandbox.md`: later parts write them. Do not create them, not even as
  empty files.
- Running any part of the kit, or any database command.
- Any change outside `docs/audits/2026-final-enver-muellim-audit/` and `AI_WORKFLOW/LAST_REPORT.md` /
  `AI_WORKFLOW/STATE.json`.
- A verdict, a priority, a finding, an expected figure or a report text.
- Reconstructing anything of the 23.09.2026 audit (A2): its sections, priorities or click path.
- Editing a brief, `TASKS/`, or any tool, including the sandbox seed.

## 9. Safety and STOP conditions

STOP and report if:

- a credential, token or connection string with a password would have to be written into a file;
- `sandbox.ps1`, the launch profiles or `package.json` contradict the brief or the protocol in a way the kit cannot
  simply follow (a different port is not a contradiction; record it);
- the brief and the protocol disagree.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `sandbox.ps1`, `git commit` / `reset` /
`checkout` / `push`, or an edit outside the paths above.

## 10. Acceptance criteria

1. `README.md`, `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md` and `06-hesabat-skeleti.md` exist under
   `docs/audits/2026-final-enver-muellim-audit/`, in Azerbaijani, and no other file does.
2. `README.md` has every bullet of §6.1. It contains the protocol's §0.1 three items and the hard rules, and names the
   seven files of the kit.
3. `01-hazirliq.md` has the seven items of §6.2. Every command and URL in it cites the repository file it comes from.
   What the reset leaves is stated from `SandboxScenario.cs`, with its lines.
4. `05-neticeler-qaytarilmasi.md` has the five bullets of §6.3.
5. `06-hesabat-skeleti.md` has the fourteen headings in protocol §7.1's order, each with its feeding sections. It has
   the §0.1 text in section 1, the P0–P3 scale and the answer's rule, and ends with the question verbatim and
   `Cavab: Bəli / Xeyr —`. It holds no finding, verdict or figure.
6. Check IDs and screenshot names follow §6 wherever they appear.
7. No file of the kit contains a password, a token, a secret's value or a connection string with a password.
8. Nothing of the first audit is reconstructed: no section list, priority or click path is attributed to it.
9. `git status --short` shows only `docs/audits/2026-final-enver-muellim-audit/` beyond the untracked workflow files.
   `git diff 7550eda` is empty outside `docs/audits/`.
10. The four suites were run and their summary lines are in `LAST_REPORT.md`, raw.

## 11. Final report (`AI_WORKFLOW/LAST_REPORT.md`)

- HEAD, `git status --short`, `git diff --stat 7550eda`;
- the four files, with line counts;
- for `01-hazirliq.md`: each command and URL with its source file and line; what the sandbox reset leaves, with the
  `SandboxScenario.cs` lines; any difference from §3;
- the suites' raw summary lines, and whether `--artifacts-path` was needed;
- a statement that no command was run against any database, no tool or sandbox was run, and no file outside the kit,
  `LAST_REPORT.md` and `STATE.json` changed.

End with `READY_FOR_REVIEW`.

## 12. For the Reviewer

On acceptance, 15a1 is committed as usual. Then set `currentTask` to `15a2`, status `PLANNING`, and `nextTask` to
`15a3`. Do not open HD-008: it opens when 15a5 is accepted (§1).

## 13. Assumptions the Planner made

- P1. 15a is split into five sub-parts, 15a1 … 15a5, rather than renumbered. `TASK-15a.md` stays the kit's governing
  specification, as `STATE.json` asks, and 15b stays the report. The runner resolves `15a1` to `TASK-15a1.md`: its
  pattern `^(\d+)([A-Za-z]*)$` does not match, so it falls back to the literal name (`run-agent.ps1:1011–1014`).
- P2. The seam is by the kind of reading each part needs. 15a1 needs the protocol and the start-up files, 15a2 the
  tools' code, 15a3 the protocol's own scenario and the frontend's routes, and 15a4 / 15a5 the task briefs, split
  between 04–09 and 10–16. The two brief halves are about the same size, measured by the length of their sections
  (heading to heading, blank lines included): «Acceptance» 40 lines each; «Auditdə müşahidə edilən hazırkı problem»
  66 lines for 04–09 and 48 for 10–14. The second half also carries the 20 decision rows.
- P3. Section D goes with the second brief half, because its rows may point to any C row (`TASK-15a.md` §4.3). B's four
  "Xeyr" summary rows go there too, because they point to B rows from both halves.
- P4. Check IDs are `<section letter>-<two digits>`, so that parts written in different sessions cannot collide and D can
  point to "C-NN" as `TASK-15a.md` §4.3 already writes it.
- P5. The suites run once, in 15a1, as the baseline. 15a2 … 15a5 change only Markdown under `docs/audits/`, so a re-run
  would test the same tree. 15b runs them again at the end.
- P6. The part's working rules (§4) — a fixed reading list, write as you go, suites last — are the remedy for the five
  failed runs. They are not a business rule.
- P7. The operator enters the sandbox password with `Read-Host -AsSecureString` rather than the literal assignment
  `sandbox.ps1:22` shows, so that it never reaches a saved command history (`TASK-15a.md` §4.1, "a command history that
  is saved").
