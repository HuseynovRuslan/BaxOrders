# Review — Task 15a3: Yekun audit dəsti — yoxlama siyahısı: giriş, A, E, F, G, H, I, J, K

Role: REVIEWER
Date: 2026-09-25
Verdict: **PASS — accepted.** All twelve acceptance criteria of `TASKS/TASK-15a3.md` §10 hold. The change is one new
Markdown file, `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md` (2022 lines, Azerbaijani). No
tracked file changed. No code, test, tool, schema or data changed, no database command was run, and no human gate was
crossed. `COMMIT_MESSAGE.txt` is written. Next is 15a4, which goes to `PLANNING` (spec §12). HD-008 is not opened: it
opens when 15a5 is accepted.

## What was inspected

- Branch `main`, HEAD `e19b590` (15a2's commit). Nothing for 15a3 is committed.
- `git status --short`: `?? docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`, plus the workflow
  files `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1` and `run-agent.ps1`, which the runner excludes.
- `git diff --stat` of tracked files: empty. `README.md`, `01`, `03`, `04`, `05` and `06` are unchanged.
- `git diff --stat 7550eda HEAD`: only the six kit files under `docs/audits/`. The frontend the rows cite is the
  frontend at `7550eda`, as spec §3.1 says.
- The new file, read in full.
- The raw Coder log `LOGS/20260925-173016-cycle04-coder.jsonl`:
  - **Bash calls:** `git branch/rev-parse/status/diff --stat`, `ls`, `file`, `wc`, and a Python check script that the
    Coder wrote into its own scratchpad, outside the repository. That script only reads the checklist.
  - **Not in the log:** `dotnet`, `npm`, `psql`, `pg_dump`, `sandbox.ps1`, or any git write.
  - **Writes and Edits:** `STATE.json`, `02-yoxlama-siyahisi.md` (one `Write`, then `Edit`s), `LAST_REPORT.md`,
    `STATE.json`. This is the order spec §4.2 asks for.

## Independent checks

### The file's form (my own checks)

- **Row structure.** One multiline `Grep` required, for each row heading `### [A-K]-NN — …`:
  - the five non-empty fields `Mənbə` … `İlk auditdə`;
  - the marker `---- operator doldurur ----`, exactly;
  - `Göründü:`, then any number of `  - …` lines;
  - `Rəqəm:`, `En:` and `Ekran şəkli:`, empty;
  - `Hökm: …`, then `Qeyd:`, empty.

  It matched **99 of 99** rows.
- **Row counts:** A 14, E 27, F 9, G 2, H 26, I 12, J 8, and K 1 (the template).
- **Verdict words, per section:**
  - A, E, F, H, J: «keçdi / keçmədi / yoxlanıla bilmədi (səbəb)»;
  - G: «sayıldı / …»;
  - I: «hələ var / artıq yoxdur / …»;
  - K: «—».
- **Headings.** The eleven section headings are in order, and their names match `README.md` §3 (lines 47–57) word for
  word. B, C and D have nothing under them: the D heading is followed directly by the E heading.
- **`P0`–`P3`.** They appear in one place only, the preamble's screenshot rule (line 80).
- **Secrets.** No `password`, `PGPASSWORD`, `token=` or `Host=` anywhere in the file.
- **`imports?id=`.** It appears in three kinds of place:
  - the two warnings not to open `/imports?id=6` (A-13, J-06);
  - I-01 … I-08, each on the **sandbox** port `5174`, with the id of the sandbox import;
  - nowhere else. No row sends anyone to a real batch.

### The citations against the code and the records

I opened the lines the rows depend on most. All of them hold:

- **The brief.**
  - `BRIEFS/TASK-15.md` lines 33–38: every E row quotes its line verbatim.
  - Lines 8–10 feed `İlk auditdə`.
  - Lines 24, 25, 27, 29, 48 and 49 are the quotes in A, G and H.
- **Menu and routes.**
  - `navigation.ts:26–41`: the menu, and each entry's `requires`.
  - `App.tsx:29–67`: the routes. `/pricing-modes` (line 58) sits outside any `RequirePermission`, while `/products`,
    `/imports` and `/admin/users` are guarded.
- **The roles**, in `ICurrentUserContext.cs`: `:64` approval (Manager only), `:70` the queue (Manager or Admin),
  `:93` imports, `:114` users (Admin only), `:118` the catalogue. So the Coder's correction to spec §3.2 is right:
  lines 60–86 do not hold all four roles.
- **The pricing page, `PricingModeReviewPage.tsx`:**
  - the title (132) and the read-only note (139–143);
  - the three totals (173–179), and the «Hamısı» filter (183–197);
  - the search placeholder (214);
  - the decision buttons (219), with the labels «Şirkətdaxili təminat kimi qeyd et» (227) and «Alış qiyməti tələb
    olunur» (234).

  So G2 can be read by the Rəhbər at `/pricing-modes`, and nothing on that page is offered to them to write with.
- **The price words, `pricing/labels.ts`:**
  - labels (62–84) and counts (118–128);
  - the import tab's buttons (153–157), which make I-08's two wordings exact;
  - `internalSupplierLabel` (204–213).
- **The dashboard's opening state.**
  - Month and basis: `ManagementDashboardPage.tsx:117–122`, and `basisParams.ts:59–60` and `85–91`. The dashboard
    opens on the latest month and «Keçən ay», as G-01 and E-03 say.
  - The warning mark: `MissingPriceMark.tsx:9–10` and `22–42`. Only an owed price raises it. This is the basis of E-12's
    "göstərilmir" line.
- **The order page.**
  - `CauseSummary.tsx`: «Niyə dəyişib?» (68) and «Cəmi» (71–73); «Əsas səbəb» (128), the part's label (136) and its
    amount (146–148). The part shows a label and a product count, not a product name, as the report's §7 item 2 says.
  - `LocationTrend.tsx:186–202`: the object page's "Sentyabr 2026 sifarişində: …" line.
  - `components/workflow/labels.ts:6–9`: «Təsdiqlənməyib» is the draft's word. My own `Grep` for `Qaralama` over `src`,
    excluding tests, finds nothing, which is E-27's note.
- **The carried-in words and dialog (section I).**
  - `SuppliersPage.tsx:246–261`: the «Qiymət siyasəti» dialog. I-09 quotes it verbatim and makes no judgement.
  - One `Grep` over `src` for each of "Bu mərhələdə sorğu yaradılmır", «staging», «növbəti mərhələdə» and «Mövcud
    sorğu». The hits are exactly I-01 … I-04's lines: `ImportsPage.tsx:112`, `:255`, `:291`; `ImportGroupsTable.tsx:20`,
    `:37`; `ConfirmationDialog.tsx:321`.
- **The kit.**
  - `04-sandbox.md`'s headings, Sınaq 1 addım 1–9 and Sınaq 3 addım 1–13, match every F, G-02 and I pointer. F-01 is
    addım 2, F-02 addım 1 and 3, F-07 and F-04 addım 5, and so on. Sınaq 3 addım 5 is the NotRequired step, and 8, 9
    and 12 are the confirmation, the result panel and the page's buttons.

## Acceptance criteria (§10)

1. **Pass.** The file exists, in Azerbaijani. No other file in the folder changed.
2. **Pass.** The preamble has all eight items of §6.1. Items 6 and 7 have more than the spec asked for:
   - the screens-and-routes table has a source on every route. It also marks the three screens a Rəhbər must not
     open by address, and gives Qiymət təsnifatı with its note;
   - the brief-words table adds the brief's cause-part names ("Yeni", "Miqdar", "Qiymət", "Artıq") beside the three
     the spec required. They are needed to read E-07's expected figures.
3. **Pass.** See "The file's form".
4. **Pass.**
   - A-01 … A-14 carry the IDs and content of §6.2.
   - G2's four figures are A-10 … A-13, each in its own row.
   - A-10 … A-12 are read by the Rəhbər, with the read-only note checked first, and the page and Əmr 1 are both
     written without choosing between them.
   - A-11 has the «oxunmur — …» line for the priced-included total.
   - A-13 takes the batch states from `03-emrler.md` §5.1 and forbids `/imports?id=6`.
   - A-09 and A-12 define «keçdi» as "read and recorded", not a verdict on a difference.
   - A-14 lists exactly A-01, A-02, A-04, A-10, A-11 and A-13.
5. **Pass.**
   - All 27 E rows quote `BRIEFS/TASK-15.md:33–38` verbatim.
   - Task 1c has two rows per order for HEM, Fəvvarələr and Nərimanov, with their amount lines.
   - HEM's parts are in `Gözlənilən` (`TASK-06.md:28`), with the 750.00 ₼ note and the pointer to A-07.
   - Fəvvarələr's and Nərimanov's first-audit figures are in `İlk auditdə`.
   - Every other figure says «brief rəqəm vermir» or «brief qeyd etmir».
6. **Pass.** F-01 … F-09 follow the mapping of §6.4. Each is sandbox on port 5174, each begins with the three checks,
   and F-01 … F-06 carry the four facts. Sınaq 1 addım 8 is left to C and D, as the spec says.
7. **Pass.** G-01 and G-02 each have:
   - 1366 × 768;
   - the count sheet 1–12, «lazım olsa sətir əlavə edin», and «Cəmi»;
   - "3 klik + 3 sürüşdürmə" from `BRIEFS/TASK-15.md:48`;
   - the sentence that the first audit's path is unknown (`README.md` §8).

   Nothing is attributed to the first audit's path.
8. **Pass.** H has 26 rows (18 at 1366/1440, 8 at 390/1200), I has 12, J has J-01 … J-08 and each has «Başlanğıcla
   eynidir», and K has the template.
9. **Pass.**
   - Real rows: every one begins its `Addımlar` with the real-data reminder.
   - Sandbox rows: every one begins with `04-sandbox.md` §1's three checks. That includes the mixed rows E-27, I-12
     and J-08.
   - Writes: no step writes to `baxorders_dev`.
   - Admin account: used on real data only in A-04, which is `01-hazirliq.md` §4's exception.
10. **Pass.** No secret. No `P0`–`P3` value in any row.
11. **Pass.** Nothing of the 23.09.2026 audit is reconstructed. G says so plainly.
12. **Pass.** See "What was inspected".

## The Coder's deviations from the spec, weighed

- **Extra `  - …` lines in A, I and K**, besides the spec's E, F, G, H and J. §6.2 itself asks A-10 … A-12 to record
  both the page and Əmr 1. §6.7 prescribes an extra line for I-11, and §6.9 one for K. The rule that matters still holds:
  extra lines appear only under `Göründü:`, and every row keeps the same twelve lines. **Kept.**
- **G2 screenshots.** §6.1 item 5 asks for every G2 row, and §6.2 says A-13 cannot have one. The preamble resolves this
  honestly: A-10 … A-12 are mandatory, and A-13's evidence is the pasted output. **Kept.**
- **Task 1c's "baza … cari" per line.** They are read from the row's «Məhsul tarixçəsi» «Məbləğ» column, because the
  row itself shows only the effect (`DriverList.tsx`). No figure is invented, and nothing is added up in the kit.
  **Kept.**
- **Task 2 on the dashboard, the report and Obyektlər.** From the code, these three show only the missing-price count.
  The rows give the operator a «göstərilmir» line and pass no verdict. That is the right way round: 15b judges it.
  **Kept.**

None of them adds a business rule, loosens a gate, or writes to real data.

## Notes (not blocking)

- `LAST_REPORT.md` §9 says nothing was run except git, `wc`, `ls`, `file` and search. The Coder also ran a Python
  script it wrote into its own scratchpad. The script only reads the checklist, so it changes nothing that matters, but
  the statement is not quite complete.
- **For 15a5's whole-kit check** (from the report's §7):
  - `01-hazirliq.md` §7 and `05-neticeler-qaytarilmasi.md` §2 give `A-02-qiymet-tesnifati-1366.png` as the example
    screenshot name. A-02 is now the commit gate. The Qiymət təsnifatı screenshot is `A-10-…`.
  - The operator pastes command output in two places: after A-14, before the B heading, and after J-08, before the K
    heading. B, C and D's rows must go directly under their headings, so that the A block stays at the end of A.
- **For 15a4:**
  - Its rows go directly under `## B. Köhnə tapıntılar` and `## C. Task 04–16 qəbul şərtləri`, in the preamble's row
    format (the twelve lines, and extra lines only under `Göründü:`).
  - Verdict words: B «həll olunub / qismən / həll olunmayıb», C «keçdi / keçmədi», each followed by «yoxlanıla bilmədi
    (səbəb)».
  - Task 4's C rows point to «Sınaq 1» / «Sınaq 2» by step, and to the F rows where they cover the same step. They
    follow `04-sandbox.md`'s «Yekun cədvəl».
  - Task 12's C rows are the ones H-19, H-21, H-23 and H-25 point to ("C bölməsində Task 12-nin sətirləri"). That is
    15a5's range (`TASK-10.md` … `TASK-14.md`), not 15a4's.
