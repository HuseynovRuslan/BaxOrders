# Review — Task 15a1: Yekun audit dəsti — ön səhifə, hazırlıq, qaytarma, hesabat skeleti, baza testləri

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All ten acceptance criteria of `TASKS/TASK-15a1.md` §10 hold. The change is four new
Markdown files under `docs/audits/2026-final-enver-muellim-audit/` and nothing else. No tracked file changed, no
database was touched and no human gate was crossed. `COMMIT_MESSAGE.txt` is written. Next is 15a2, which goes to
`PLANNING` (spec §12). HD-008 is not opened: it opens when 15a5 is accepted.

## What was inspected

- Branch `main`, HEAD `7550eda08b88ca76b103aef67a2c8cd7b456b6ea`. Nothing for 15a1 is committed.
- `git status --short --untracked-files=all`, outside `AI_WORKFLOW/`: exactly the four kit files, plus
  `monitor-agent.ps1`, `resume-agent.ps1` and `run-agent.ps1`, which the runner excludes.
- `git diff --stat 7550eda`: empty. No tracked file changed.
- `02-yoxlama-siyahisi.md`, `03-emrler.md` and `04-sandbox.md` do not exist, as §8 requires.
- All four files, read in full: `README.md` 136 lines, `01-hazirliq.md` 254, `05-neticeler-qaytarilmasi.md` 55,
  `06-hesabat-skeleti.md` 116.
- Against them: the brief `BRIEFS/TASK-15.md`, the protocol `TASKS/TASK-15.md` §0.1, §5, §7.1, §7.2, §8, §9, and
  `TASKS/TASK-15a.md` §4.1, §4.2, §4.6, §4.7, §5–§9.
- Every source the kit cites, opened at the cited lines: `scripts/dev-postgres.ps1:1–30`,
  `src/BaxOrders.Api/Properties/launchSettings.json` (whole), `frontend/bax-orders-web/package.json:1–15`,
  `frontend/bax-orders-web/vite.config.ts` (whole), `tools/BaxOrders.ApprovalSandbox/sandbox.ps1` (whole, 89 lines),
  `SandboxScenario.cs` (whole), `SandboxSeed.cs:96–131`, and a `Grep` for `İstifadəçilər`.
- The raw Coder log `LOGS/20260925-145915-cycle02-coder.jsonl`.

## How builds and tests were verified

This review's profile may not run `npm` or `dotnet` (the call was refused), so, as in earlier reviews, I checked the
Coder's raw log and that the tested tree is the tree on disk.

- The four kit files were written at log lines 89, 202, 226 and 253. No other Write or Edit follows until
  `LAST_REPORT.md` (line 346).
- Line 298, frontend: **51 files / 957 tests**, all passed. Line 311: `vite build` finished ("built in 3.67s").
- Line 301: `dotnet build BaxOrders.slnx`, "Build succeeded".
- Line 320: `dotnet test`, **1046 unit / 785 integration**, 0 failed. `--artifacts-path` was not needed.
- These are the expected baseline figures (§7), equal to 16b's. That is what should happen: the tracked tree is
  byte-for-byte `7550eda`, since only untracked Markdown was added.
- The log has no `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run`, `sandbox.ps1`, `git commit`, `git reset`
  or `git checkout` command.

## Acceptance criteria (§10)

1. **Pass.** The four files exist, in Azerbaijani, and no other file is in the folder.
2. **Pass.** `README.md` has all seven bullets of §6.1:
   - the brief's «Məqsəd», quoted verbatim;
   - who does what (A3);
   - the seven kit files in a table, plus `neticeler.md` and `ekranlar/`;
   - the order of work, 01 → 03 → A → B … K with 04 → 03 again → 05;
   - the hard rules: the brief's 15.1 / 15.2 / 15.2a and the three decision bullets verbatim, then protocol §2 / §8,
     including batch #6 and the STOP list;
   - credentials, and a pointer to 05;
   - §8 «Yoxlanıla bilməyənlər». This is a faithful Azerbaijani rendering of protocol §0.1's three items, with nothing
     added, and it says the operator does not rebuild them.
3. **Pass.** `01-hazirliq.md` has items 1–7. I checked every cited line, and each one says what the kit says:
   - port 55434 (`dev-postgres.ps1:25`), and user-secrets `ConnectionStrings:BaxOrders` (`:10–12`);
   - `http://localhost:5080`, `Development` and swagger (`launchSettings.json:7–11`), and the `sandbox` profile
     (`:14–22`);
   - `dev` and `dev:sandbox` (`package.json:7–8`), and 5173 with `strictPort: false` (`vite.config.ts:15`);
   - 5174 with `strictPort: true` (`vite.config.ts:12`), and the proxy (`:25–28`);
   - the password rule (`sandbox.ps1:16`, `:73`), the literal example (`:22`), `-Run` (`:62–68`) and the password file
     (`:48–53`);
   - the three accounts (`SandboxScenario.cs:12–17`);
   - what a reset leaves (`SandboxScenario.cs:40–53`, `:55–64`, `:66–93`, `:96`). The coordinator's submission is at
     `SandboxSeed.cs:113`, `:120–125`;
   - `/admin/users` (`navigation.ts:40`), and the page title (`AdminUsersPage.tsx:69`).

   The waiting order is Sınaq obyekti 1 / Sentyabr 2026, and the draft is Sınaq obyekti 2 / Sentyabr 2026, as §6.2
   asks. The `Read-Host -AsSecureString` form (P7) is used, and the kit explains why.
4. **Pass.** `05-neticeler-qaytarilmasi.md` has all five bullets of §6.3:
   - the copy, with filling only under `---- operator doldurur ----`;
   - `ekranlar/`;
   - the four header lines;
   - raw outputs under A and J, with password lines removed;
   - `STATE.json` → `PLANNING` via HD-008, and no commit.
5. **Pass.** `06-hesabat-skeleti.md` has the fourteen headings, in protocol §7.1's order. Each has a "Mənbə" line
   matching §6.4's mapping. Section 1 holds the §0.1 text. I compared it with README lines 120–133: it is identical.
   The P0–P3 scale and the answer's rule are faithful translations of §7.1. The file ends with the brief's question,
   verbatim, then `Cavab: Bəli / Xeyr —`. It holds no finding, verdict, priority or figure. The only numbers are those
   inside the required §0.1 text and the §7.1 rules.
6. **Pass.** Check IDs appear only as the `<hərf>-<iki rəqəm>` form, with `A-02` / `C-17`. Screenshots are
   `<ID>-<ekran>-<en>.png`. No `NN-` form remains.
7. **Pass.** A `Grep` for `password=`, `Host=`, `Username=`, `token:`/`token=` and `secret` finds only instructions:
   - the `Read-Host` line, which holds no value;
   - the quoted `'<choose one>'` placeholder;
   - 05's instruction to remove `Password=` lines.
8. **Pass.** Nothing of the 23.09.2026 audit is reconstructed. It is referred to only through the brief's own words,
   and through §0.1's statement that its sections, priorities and path are unknown.
9. **Pass.** See "What was inspected".
10. **Pass.** The raw summary lines are in `LAST_REPORT.md` §4, and the log confirms them.

## Scope and the Coder's additions

The Coder listed six additions beyond the letter of the spec (`LAST_REPORT.md` §3). I weighed each one:

- `git status --short` in 01 item 2, with a STOP on an uncommitted tracked change. This enforces protocol §5.3 ("the
  API and frontend serve `7550eda` …"). **Kept.**
- STOP if `dev-postgres.ps1` initialises a new cluster. That would mean there is no real data (`:10–14`). **Kept.**
- Restart the API fresh for the audit. This makes the start time and the commit known, and protocol §5.3 asks for
  both. **Kept.**
- Stop both sandbox windows before `-Reset`, and remove the password variable at the end. **Kept.**
- 05's `Select-String` self-check, and "HD-008 wins if it differs". **Kept.**
- README's A … K table, taken from `TASK-15a1.md` §6. **Kept.**

None of them adds a business rule, and none of them loosens a gate.

## Notes (not blocking)

- README §5 quotes the brief's «Qəbul edilmiş qərarlar» as "sözbəsöz" but leaves out one bullet: "Bu task Task
  16-dan sonra, ən sonda icra olunur." That bullet is about sequencing, not a rule for the operator, and §6.1 lists
  only the operator's hard rules. 15a5's whole-kit check may add it if it wants the quote complete.
- For **15a3**: 05 tells the operator to fill only under the exact marker `---- operator doldurur ----`, and 01 tells
  them to copy `02-yoxlama-siyahisi.md`. The checklist must therefore use that marker, spelled exactly so. It must
  also have sections A and J that can take pasted command output.
- For **15a2**: the Coder observed that the real API and `sandbox.ps1 -Run` both `dotnet run` `src/BaxOrders.Api`
  (`sandbox.ps1:68`). A second build while the first process runs may hit the `bin` lock seen in 16b. `04-sandbox.md`
  should tell the operator what to do if `-Run` fails that way, for example by stopping the real API first. This is
  unverified.
- `TASK-15a.md`'s status line ("blocked by HD-007") is still out of date. `TASK-15a1.md` §1 already records this. It
  was left alone, as it should be.
