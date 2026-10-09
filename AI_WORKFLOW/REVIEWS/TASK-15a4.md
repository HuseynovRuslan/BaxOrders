# Review — Task 15a4: Yekun audit dəsti — yoxlama siyahısı: B və C, `BRIEFS/TASK-04.md` … `TASK-09.md`

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All nine acceptance criteria of `TASKS/TASK-15a4.md` §10 hold. The change is 1934 added
lines, and no deleted lines, in one file: `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`. They
form B's introduction and B-01 … B-79, and C's introduction and C-01 … C-34. No other tracked file changed. No code,
test, tool, schema or data changed. No database command was run, and no human gate was crossed. `COMMIT_MESSAGE.txt`
is written. Next is 15a5, which goes to `PLANNING` (spec §12). HD-008 is not opened: it opens when 15a5 is accepted.

## What was inspected

- Branch `main`, HEAD `282b62b` (15a3's commit). Nothing for 15a4 is committed.
- `git status --short --untracked-files=no`: only ` M docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`.
  The untracked files are the workflow's own: `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1` and
  `run-agent.ps1`.
- `git diff 282b62b --numstat`: `1934 0` for that file. The diff has two hunks, `@@ -386,0 +387,1335 @@` and
  `@@ -388,0 +1724,599 @@`. Both are pure insertions, one directly under the B heading and one directly under the C
  heading. Nothing above line 385 changed, and nothing from the D heading (now line 2323) down.
- `git diff --stat 7550eda HEAD -- frontend src tools`: empty. The frontend the rows cite is the frontend at `7550eda`.
- The new text, lines 385–2322, read in full against `BRIEFS/TASK-04.md` … `TASK-09.md`.
- The raw Coder log, `LOGS/20260925-173016-cycle07-coder.jsonl`:
  - **Bash calls:**
    - `wc`, `git diff/status/rev-parse`;
    - one `sed -i` on `STATE.json` (READY → RUNNING);
    - one diff copied into the Coder's scratchpad.
  - **One refused call.** The Coder wrote a Python check script into its scratchpad and tried to run it, and the run
    was refused. `LAST_REPORT.md` §8 says so.
  - **Not in the log:** `dotnet`, `npm`, `psql`, `pg_dump`, `sandbox.ps1`, or any git write.
  - **Writes and edits:** `STATE.json`, then 16 `Edit`s to `02-yoxlama-siyahisi.md`, then `LAST_REPORT.md` and
    `STATE.json`. This is the one-brief-at-a-time order of spec §4 item 2.

## Independent checks

### Form

- **Headings.** `Grep` finds B-01 … B-79 and C-01 … C-34, each as `### X-NN — Task 0N: …`. They are in sequence with
  no gap, and each row carries the task number of its brief.
- **The twelve lines.** Across the whole file there are 2556 field lines (`Mənbə:` … `Qeyd:`, with the marker exactly
  `---- operator doldurur ----`). That is 12 × 213: the preamble's example, 99 older rows and the 113 new rows. I also
  read every new row by eye. Each has the fields in order, and every extra line is a `  - …` under `Göründü:`.
- **Verdict lines.**
  - All 79 B rows end with `Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)`. The 79 matches
    in the file are exactly these.
  - All 34 C rows use `Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)`.
- **Openings.**
  - Real rows: 104, each starting `Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.)`.
  - Sandbox rows: 5 (B-02, C-02 … C-05), each on `http://localhost:5174` and each starting with the three checks of
    `04-sandbox.md` §1.
  - Mixed rows: 4 (B-05, C-01, C-06, C-07), each opening exactly as E-27 does.
- **B-specific rules.**
  - `· həll edən task:` is on every B `Mənbə:`.
  - `  - Bu gün görünən` is under every B `Göründü:`.
  - «brief qeyd etmir» appears in no B row. In C it appears only in C-05, C-06, C-13, C-20, C-23 and C-24, where
    brief 04/05/07/08 records no first-audit finding.
- **Safety patterns.** Across the file, `P[0-3]`, `imports?id=`, `parol`, `password`, `token`, `Host=`, `Server=` and
  «kodda tapılmadı» match only lines outside 385–2322. Those are the preamble, A-04, A-13, the sandbox I rows and J-06.

### Quotes and line numbers against the briefs

I checked every `Mənbə:` quote against the brief file at the line it names, and every `(`BRIEFS/TASK-0N.md`:L)`
citation in `Gözlənilən` and `İlk auditdə` against that line. All of them hold.

- **Brief 05's sub-headings.** «Texniki məlumat», «Vahidlər və format», «Köhnə və qeyri-dəqiq terminlər» and «Eyni
  anlayış üçün fərqli sözlər» are on the right rows. Line 19 is quoted whole, bold markers included, in B-29 … B-36.
- **Sub-bullets.** Brief 07 lines 10–11 and brief 09 lines 9–11 and 16–19 are quoted as their own bullets, with the
  lead bullet named in brackets.
- **Supporting citations.** I checked each one I have seen at its line:
  - brief 05: :31–36, :43–50, :53–55, :63, :69, :70;
  - brief 06: :14–17, :24, :28, :38, :40;
  - brief 07: :14–18, :30, :38, :39;
  - brief 08: :17–23, :30, :31, :35, :46, :47, :50–52;
  - brief 09: :24–34, :44, :45, :55, :60.
- **Coverage.**
  - «Auditdə müşahidə edilən hazırkı problem»: 04 → 5 rows, 05 → 38, 06 → 8, 07 → 4, 08 → 8, 09 → 16. That is 79.
  - «Acceptance»: 04 → 7, 05 → 6, 06 → 4, 07 → 3, 08 → 7, 09 → 7. That is 34.
  - Every bullet and sub-bullet of lines 7–28 / 38–73 of the six briefs has its row, as spec §6.4 maps them. None is
    merged away.

### Code facts

I opened the lines the rows lean on. All of them hold:

- **Money.** `format.ts`:225–232 (`isFutureMonth`: the current month is not future), :235 and :243–245 (money
  formatting).
- **Words.**
  - `terms.ts`: :41 and :44 (`allPriorMonthsLabel`, so the Coder's :44 against the spec's :47 is right), :118–135
    (`unusualMonthNote` at :127–129, again the Coder's line rather than the spec's :125), and `reportLegendLabel` :135.
  - `units.ts`:8–16.
  - `workflow/labels.ts`: :5–10, :68 and :71–81.
- **The order page.** `WorkflowPanel.tsx`: :42, where the header says the status once, and :197–200 (4.1).
  `OrderDetailPage.tsx`:194–195.
- **Page structure.**
  - `LocationDetailPage.tsx`:264–268: the columns «Dövr», «Məbləğ», «Status» and an unnamed column.
  - `MonthlyReportTable.tsx`:84 and :447–453: the table at `lg`, the list below it.
  - `CauseSummary.tsx`:128: «Əsas səbəb».
  - `DecisionHeadline.tsx`:114–120.
- **The dashboard.**
  - `AttentionSection.tsx`:99–104 (the ⓘ `strongPercentageHint`) and :164.
  - `dashboard/labels.ts`: :88–97 (the sort options, «Ən çox dəyişən» first, none by percentage) and :185–186.
  - `coverage/labels.ts`:189–200.
  - `ManagementDashboardPage.tsx`: :38 (`pageSize = 100`) and :367–375 («Növbəti» only when rows exceed a page).
  - `DashboardSummary.tsx`:226: chips with count 0 are filtered out.
- **The header.** `Header.tsx`:33–50: nothing is shown unless the server cannot be reached.
- **`LocationRows.tsx`:258–275.** The Coder's correction to spec §3.3 / §6.4 B-55 is right. `MainCause` renders the
  cause's name and amount only. `primaryCauseProduct` is rendered only in `AttentionSection.tsx`:164. So B-54, B-55,
  C-19 and C-30 correctly say that without a card the product cannot be read, and the verdict is «yoxlanıla bilmədi
  (kart yoxdur)».
- **The sandbox quotes in C-01 … C-07.** `04-sandbox.md` lines 110, 131–132, 151, 159, 185, 207, 212–213 and 225 are
  quoted exactly. So are «Yekun cədvəl» lines 546–553 (C-01 cites 547, C-06 cites 552). Each Task 4 C row names its
  Sınaq 1 / Sınaq 2 step and its F rows, as the table maps them.

## Acceptance criteria (§10)

1. **Pass.** Only additions, all between the B heading and the D heading. No other file in the folder changed.
2. **Pass.** The counts per brief are as listed above. Every `Mənbə:` quotes its bullet verbatim, with its line.
3. **Pass.** Every row has the twelve lines in order, with the exact marker and extra lines only under `Göründü:`. The
   verdict words are right per section.
4. **Pass.** Every B row names `həll edən task`, including the out-of-scope hand-offs in B-04 (Task 05), B-43 (Task 09)
   and B-71 (Task 05). Every B `İlk auditdə:` quotes its bullet's figure or words.
5. **Pass.** Every figure cites a brief line, or the row says «brief rəqəm vermir». Code facts say "Koddan" and give
   file and line.
6. **Pass.** The openings are as counted above. The Task 4 C rows follow «Yekun cədvəl». No step writes to
   `baxorders_dev`, no real order is approved (C-06 says so), and no row points to a real `/imports?id=`.
7. **Pass.** No secret, and no `P0`–`P3` value in any row.
8. **Pass.** Nothing of the 23.09.2026 audit is reconstructed beyond the briefs' bullets.
9. **Pass.** See "What was inspected".

## The Coder's judgment calls, weighed

- **B-05 is written as a mixed row**, and B-02 as a sandbox row. B-05 names both the sandbox facts (F-01 … F-06) and
  the real imported order (B-04). Following E-27's mixed form is the honest shape. **Kept.**
- **The table row versus the card (B-54, B-55, C-19, C-30).** The code was followed over the spec, and the report says
  so (§5.1). This is spec §4 item 4 applied correctly. **Kept.**
- **Code line numbers that differ from the spec** (`terms.ts`:44, :127–129). The file cites the true lines. **Kept.**
- **C-25 leaves the October question to the reading date.** It quotes the code's rule and asks for the date. It does not
  tell the operator to read on another month, which would be a decision nobody has taken. **Kept.**
- **C-34 asks the operator to subtract two figures.** The criterion is itself that subtraction, and 15b checks it
  again. E-06's "do not add" rule is about Task 1c's sums, not this. **Kept.**
- **`Ctrl+F` in the word and code rows.** It reads the page and writes nothing. **Kept.**

None of these adds a business rule, loosens a gate, or writes to real data.

## Notes (not blocking)

- **B-54's `Gözlənilən`** cites `BRIEFS/TASK-07.md`:14 and :17, but not :39, which spec §6.4 also lists. :39 is the
  acceptance bullet itself, and it is quoted in C-19, which points back to B-54. The figure (≤ 25 %) is carried by :17.
  Nothing is missing for the operator.
- **`DashboardSummary.tsx`:215,** which B-34, B-71 and C-11 cite for "a chip with count 0 is not shown", is the doc
  comment. The filter itself is at :226. The fact is true, and the line is one off.
- **For 15a5:**
  - B continues from **B-80** after B-79 (above the C heading, now line 1722). C continues from **C-35** after C-34
    (above the D heading, now line 2323).
  - The IDs here are final. The "Xeyr" rows may cite B-01, B-02, B-05 and C-01 … C-07 (reason 3), and B-52 … B-55,
    C-18 and C-19 (reason 4), as spec §12 suggests. Confirming that is the 15a5 Planner's job.
  - Any 15a5 row that needs the cause product must read it from the attention card, not the dashboard table
    (`LocationRows.tsx`:258–275).
  - The whole-kit check still owes the screenshot-name fix from `REVIEWS/TASK-15a3.md`: `01` §7 and `05` §2 say
    `A-02-qiymet-tesnifati-1366.png`, and the name is now `A-10-…`.
