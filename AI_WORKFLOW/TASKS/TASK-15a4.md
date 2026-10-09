# TASK 15a4 — YEKUN AUDİT DƏSTİ: YOXLAMA SİYAHISI — B VƏ C, `BRIEFS/TASK-04.md` … `TASK-09.md` (Task 15a, sub-part 4 of 5)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by every part of Task 15; there is no `TASK-15a4` brief). Sections B and C
also read `BRIEFS/TASK-04.md` … `TASK-09.md`, which are the owner's too: their «Auditdə müşahidə edilən hazırkı
problem» and «Acceptance — biznes dili ilə» are what the rows quote.
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md` — §6.1 (old findings) and §6.2 (acceptance). Unchanged.
Kit specification: `AI_WORKFLOW/TASKS/TASK-15a.md` §4.3 B and C. Unchanged, and it still governs.
Split map: `TASK-15a1.md` §1; `TASK-15a3.md` §1, §12; `PLAN.md`, "Current".
Where this file and `TASK-15a.md` disagree, `TASK-15a.md` wins; where it and the protocol disagree, the protocol wins;
where the protocol and the brief disagree, the brief wins. In every such case: STOP and report.

Specification status: **READY.** Written by the Planner on 2026-09-25. Repository at `282b62b` (HEAD, 15a3's commit).

**Documentation only.** This part adds rows to one existing file,
`docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`, under its B and C headings. No other line of that
file and no other file of the kit changes. No application code, test, style, schema, migration, tool or data change. No
database command of any kind, and no tool, script, sandbox or browser is run. This file carries no data-migration line,
on purpose.

---

## 1. Place in the split

| Part | Writes | Status |
|---|---|---|
| 15a1 | `README.md`, `01`, `05`, `06`; the suites | accepted (`4023da2`) |
| 15a2 | `03-emrler.md`, `04-sandbox.md` | accepted (`e19b590`) |
| 15a3 | `02-yoxlama-siyahisi.md`: preamble, A, E, F, G, H, I, J, K; empty B, C, D | accepted (`282b62b`) |
| **15a4 (this file)** | `02`: **B-01 … B-79** and **C-01 … C-34**, for `BRIEFS/TASK-04.md` … `TASK-09.md` | current |
| 15a5 | `02`: B and C for `TASK-10.md` … `TASK-14.md`, `TASK-16.md` (from **B-80** and **C-35**); B's four "Xeyr" rows; D; the whole-kit check | queued |

HD-008 (the operator run) opens only when 15a5 is accepted. Accepting 15a4 opens nothing for the operator.

**The seam with 15a5.** 15a5 appends its B rows after B-79 (above the C heading) and its C rows after C-34 (above the D
heading), continuing the numbers. Its four "Xeyr" rows and its D rows will cite rows written here by ID. So the IDs of
§6 are fixed by this specification and must not be renumbered. 15a5 also writes the H-19/H-21/H-23/H-25 targets (Task
12's C rows), so none of them is written here.

## 2. Which acceptance criteria this part carries, and which it leaves

- **Carried here** (`TASK-15a.md` §8):
  - item 2 for `BRIEFS/TASK-04.md` … `TASK-09.md`: every «Auditdə müşahidə edilən hazırkı problem» bullet and every
    «Acceptance — biznes dili ilə» bullet of those six briefs has a row; none is merged away;
  - item 3 for every row written here: the twelve lines, and every «Gözlənilən» figure citing its source;
  - item 4 for the rows written here: every write-check says *sınaq* and names its `04-sandbox.md` steps; no step writes
    to `baxorders_dev`;
  - items 6, 7 and 8 for the lines added.
- **Left to 15a5:** item 2 for `TASK-10.md` … `TASK-14.md`, `TASK-16.md`, B's four "Xeyr" rows, section D (20 rows) and
  the whole-kit count; item 1's final check; item 7's whole-kit check.
- **Left to 15b** (unchanged): the protocol's §9 items 1–11.

## 3. Verified current state (the Planner read these on 2026-09-25; the Coder confirms each at the cited lines)

### 3.1 Git and the file

- HEAD `282b62b` (15a3). Since `7550eda` only `docs/audits/` changed, so the frontend the rows cite is the one at
  `7550eda`. Confirm with `git diff --stat 7550eda HEAD -- frontend src tools` (expect nothing).
- Untracked: `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1`, `run-agent.ps1` (workflow infrastructure).
- `02-yoxlama-siyahisi.md` has 2022 lines. Line 383 is the `---` that ends section A (the operator pastes command output
  above it, `REVIEWS/TASK-15a3.md`, "Notes"). Then:
  - line 385 `## B. Köhnə tapıntılar`
  - line 387 `## C. Task 04–16 qəbul şərtləri`
  - line 389 `## D. Sahibin qərarları 4.1 … 16.1`
  - line 391 `## E. …`

  B and C are empty.
- The preamble (lines 1–131) fixes the row form (lines 15–31), the extra `  - <ad>:` lines only under `Göründü:`
  (40–56), the verdict-word table (58–70, which says B, C and D carry their words in their own rows), IDs and
  screenshots (72–82), the screens and their routes (84–104), brief words against screen words (106–118), and the
  real-data paragraph with the two exact openings of `Addımlar:` (120–129):
  - real rows: `(Real: yalnız oxuyun; yazma düyməsini basmayın.)`
  - sandbox rows: `` `04-sandbox.md` §1-in üç yoxlaması. ``
  - mixed rows, as E-27 does (line 897–898): `Harada: real və sınaq · …`, and `Addımlar:` opens with
    `` `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) ``
- Rows B and C may point to, by ID (all exist, `REVIEWS/TASK-15a3.md`):
  - A-04 (the real Rəhbər), A-05 (the sandbox reset), A-07 (Əmr 2, the Sabun line), A-09 and J-04 (Əmr 4, start and end);
  - E-02 (Back returns the basis), E-05 (EXPO), E-07/E-09/E-11 (the parts and «Cəmi»), E-15/E-16 (Nərimanov, object
    and order page), E-18 … E-21, E-25;
  - F-01 … F-09 (the flow);
  - H-01, H-04, H-19, H-21, H-22 (the dashboard at 1366 and 390, the report at 1440, 390 and 1200).

### 3.2 The sandbox side

`04-sandbox.md` «Yekun cədvəl» (lines 538–579) maps brief 04's seven acceptance bullets to «Sınaq 1» / «Sınaq 2» steps
(lines 546–553). Sınaq 1's steps are at lines 106–216, Sınaq 2's at 220–229. The C rows of Task 4 follow that table
exactly. F-01 … F-09 carry the same steps (`TASK-15a3.md` §6.4), so a C row names both the steps and the F rows.

### 3.3 Facts from the code the rows need (`frontend/bax-orders-web/src/`)

- **Money on screen** is formatted `az-Latn-AZ`, two decimals, with ₼ attached: "71.210,29 ₼", while the briefs write
  "71,210.29" (`components/analytics/format.ts`:234–246; the code's own example, `terminology/terms.ts`:122). The operator
  compares values, not spelling.
- **The words of decision 5.1**, one place: `terminology/terms.ts`:13–47 («Yeni məhsullar», «Bu ay yazılmayan
  məhsullar», «məhsul», «Qiyməti olan sətirlərin cəmi», «Orta qiymət», «Müqayisə üçün data azdır», «Məhsul tarixçəsi»,
  «Bütün dövrün ortalaması»). The retired words and codes, as a list: `test/oldTerms.ts`:15–51 (a test file: cite it as
  "Task 5-in köhnə sözlər siyahısı", never as proof of what the screen shows).
- **Units:** `terminology/units.ts`:8–26 (PCS «ədəd», BAG «kisə», PACK «paket», PAIR «cüt», ROLL «rulon», L «litr», M2
  «m²», KG «kq»).
- **"Server işləyir"** is gone; the header says «Server əlçatan deyil» only when the server cannot be reached
  (`layout/Header.tsx`:33–50).
- **Decision panel:** fact labels `components/workflow/labels.ts`:71–80; the imported order's line
  `historicalImportNote`, "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." (`:68`); statuses `:5–10`.
- **Bases:** «Keçən ay», «Son 3 ayın ortalaması», «Son 6 ayın ortalaması», «Bütün dövrün ortalaması», «Xüsusi seçim»
  (`components/analytics/format.ts`:37–43, order `:55–60`). The dashboard opens on the latest month and «Keçən ay»
  (`REVIEWS/TASK-15a3.md`; G-01).
- **Dashboard:** card titles `components/dashboard/labels.ts`:137–160 (a second card of one kind says «İkinci ən böyük
  …»); the rule for «Ən böyük faiz dəyişməsi», `strongPercentageHint` (`:185–186`: base at least 100 ₼ and change at
  least 50 %); sort options `:93–97` (default «Ən çox dəyişən»; there is no sort by percentage); «Detallara bax» `:231`;
  the chips' labels in `coverage/labels.ts`:190–200. The Planner found no in-page link back to the dashboard on the order
  page (`Grep` "Panelə|Geri" in `pages/OrderDetailPage.tsx`): "qayıdanda" is the browser's Back, as E-02 reads it.
- **Monthly report:** «Cəmi» / «Cəmi — bütün obyektlər» (`terminology/terms.ts`:101, 107), «İl cəmi»
  (`components/reports/MonthlyReportTable.tsx`:35), «Gələcək ay» and its note (`terms.ts`:110–115), «Qeyri-adi ay» and
  its hint and note (`terms.ts`:118–126), the legend `reportLegendLabel` (`terms.ts`:135). A month is future only
  after the reader's own calendar month; the current month is not future (`components/analytics/format.ts`:225–232). So
  if the audit runs in October 2026, October is not «Gələcək ay».

## 4. Working rules for this session. They are the fix, not advice.

1. **Read only what §5 lists**, at the line ranges given. Do not open `OWNER_BRIEFS_MASTER.md`, `LOGS/`, `REVIEWS/`,
   any `tools/` project, the backend, `BRIEFS/TASK-10.md` … `TASK-16.md`, or `03-emrler.md`.
2. **Write as you go, one brief at a time, in this order:** B-01 … B-05; B-06 … B-43; B-44 … B-51; B-52 … B-55;
   B-56 … B-63; B-64 … B-79; then C-01 … C-07; C-08 … C-13; C-14 … C-17; C-18 … C-20; C-21 … C-27; C-28 … C-34. The
   first `Edit` inserts B's introduction and B-01 … B-05 under the B heading; each later `Edit` appends after the last
   row written. Never leave half a row. If the session is cut off, what is written stands, and the report says where
   it stopped.
3. **Search narrowly.** `Grep` with a pattern and a path; `Read` with a line range. One `Grep` per label, not a sweep of
   the frontend. If one `Grep` does not find a label, write the step from the brief's words and add «kodda tapılmadı:
   <nümunə>» in `Addımlar:`. The operator still looks.
4. The facts in §3 were checked by the Planner. Confirm each at its cited lines rather than re-deriving it. If one is
   wrong, follow the code, write the row from the code, and say so in the report.
5. **Rows that repeat another row's reading point to it** ("E-09 ilə eyni", "F-06-da oxunur") instead of repeating its
   steps, as E-23 does. The row still stands, with its own quote, its own `Gözlənilən` and its own verdict.

## 5. Reading list

- `AI_WORKFLOW/BRIEFS/TASK-04.md` … `TASK-09.md`, all of each (359 lines together).
- `AI_WORKFLOW/TASKS/TASK-15.md` §6.1–§6.2 (lines 218–258).
- `02-yoxlama-siyahisi.md`: 1–131 (the preamble); 369–391 (A-14 up to the E heading); 827–911 (E-23 … E-27, the
  model for pointer rows and mixed rows); the headings of F and H by `Grep` `^### [FH]-`.
- `04-sandbox.md`: 80–229 (Sınaq 1 and 2); 538–579 («Yekun cədvəl»).
- Frontend (`frontend/bax-orders-web/src/`), by `Grep` or short reads, only for the §3.3 facts and the labels a row
  names:
  - `terminology/terms.ts`:1–140; `terminology/units.ts`:1–30; `test/oldTerms.ts`:1–51;
  - `components/analytics/format.ts`:30–60, 225–262; `analytics/basisParams.ts` (by `Grep`);
  - `layout/Header.tsx`:30–55;
  - `components/workflow/labels.ts`:1–90; `components/workflow/WorkflowPanel.tsx` (by `Grep` for the status badge and
    the facts list);
  - `components/dashboard/labels.ts`:130–235; `coverage/labels.ts`:185–205; `components/dashboard/AttentionSection.tsx`
    (by `Grep`: the card's cause line, the product and its share, the price mark); `components/dashboard/DashboardSummary.tsx`
    (by `Grep`: the chips and the headline's subtraction); `components/dashboard/LocationRows.tsx` (by `Grep`: the row's
    cause product, the price mark, «Detallara bax», the percentage column);
  - `components/decisions/CauseSummary.tsx` (by `Grep`: «Əsas səbəb», the bar, the warning, «Cəmi»);
    `components/decisions/DecisionHeadline.tsx` (by `Grep`: «Baza», «Fərq», the line count);
    `components/decisions/DriverList.tsx` (by `Grep`: the filter and the state badges);
  - `components/reports/MonthlyReportTable.tsx` (by `Grep`: the totals row, the legend, the status dot, ⚠ and percent);
  - `pages/OrderDetailPage.tsx`, `pages/LocationDetailPage.tsx`, `pages/LocationsPage.tsx` (by `Grep`, for a label a row
    names).

## 6. What the Coder writes

Only inside `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`, in Azerbaijani, in plain business
words; command lines, file paths, URLs, user names, screen labels and tool output stay as they are. Every route, label
and step cites the frontend file and line it comes from, or the kit file and section, or the row it points to.

### 6.1 Where the text goes

- Under `## B. Köhnə tapıntılar` (line 385): B's introduction (§6.2), then B-01 … B-79.
- Under `## C. Task 04–16 qəbul şərtləri` (line 387): C's introduction (§6.3), then C-01 … C-34.
- One blank line between rows, and one before the next heading, as in the rest of the file. No `---` rule is added: the
  file puts one only after A and after E … J, and 15a5 continues B and C below these rows.
- Nothing else in the file changes: not the preamble, not A, not D … K, not a single character above line 385 or from
  the D heading down.

### 6.2 Section B — introduction and rules (protocol §6.1; `TASK-15a.md` §4.3 B)

The introduction, at most twelve lines, says:

1. What B is: every bullet under «Auditdə müşahidə edilən hazırkı problem» of each task brief, one row per bullet, and
   one row per example where a bullet lists several (protocol §6.1, §10 A2). The findings of `BRIEFS/TASK-16.md` are not
   here (protocol §6.1, last paragraph).
2. The verdict words: «həll olunub / qismən / həll olunmayıb», then «yoxlanıla bilmədi (səbəb)». The operator never
   writes a priority: for a «qismən» or «həll olunmayıb» row, 15b gives one on today's scale (protocol §6.1, §7.1).
3. Every row needs evidence: the screen, the width, and the figure or text seen today, written beside the first audit's
   (protocol §6.1). So `Rəqəm:` and `Göründü:` are never left as "baxdım".
4. Unless a row says otherwise: real data, the Rəhbər's account, September 2026, «Keçən ay», 1366 × 768.
5. The money note of §3.3: the briefs write "71,210.29", the screen "71.210,29 ₼".
6. For the word rows (B-29 … B-43), the five screens to walk: İdarəetmə paneli; Heydər Əliyev Mərkəzinin Sentyabr 2026
   sifarişi; its object page; Aylıq hesabat; the «Məhsul tarixçəsi» window opened from that order (brief 05, line 32).

**Every B row:**

- `### B-NN — Task 0N: <qısa başlıq>`.
- `Mənbə:` `` `BRIEFS/TASK-0N.md`, «Auditdə müşahidə edilən hazırkı problem», sətir L, sitat: "<the bullet, verbatim>" ``,
  followed by `· həll edən task: Task 0N`. Where the brief's own «Out of scope» hands part of the finding to another
  task, name that task and the line as well, for example `· həll edən task: Task 04; paneldəki sözlər Task 05
  (`BRIEFS/TASK-04.md`:41)`. A bullet split into examples quotes the whole bullet in every one of its rows.
- `Harada:` per §6.4.
- `Gözlənilən:` what the same brief's «İstədiyim nəticə», «Qəbul edilmiş qərarlar» or «Acceptance» says must be seen now,
  quoted with its line. A figure only from a brief line. Where no line gives a figure: «brief rəqəm vermir».
- `İlk auditdə:` the figure or text the bullet records, quoted with its line (for a bullet with no figure, its key
  words). Never «brief qeyd etmir» in B: every B row is a first-audit finding.
- `Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)`.
- Under `Göründü:` at least `  - Bu gün görünən:`, and the extra lines §6.4 names.

### 6.3 Section C — introduction and rules (protocol §6.2; `TASK-15a.md` §4.3 C)

The introduction, at most ten lines, says:

1. What C is: every bullet under «Acceptance — biznes dili ilə» of `BRIEFS/TASK-04.md` … `TASK-14.md` and `TASK-16.md`,
   one row each, quoted verbatim (protocol §6.2).
2. The verdict words: «keçdi / keçmədi», then «yoxlanıla bilmədi (səbəb)».
3. A check that needs a write runs only in the sandbox, following `04-sandbox.md` «Yekun cədvəl». If the sandbox cannot
   host it, the row is «yoxlanıla bilmədi», never run on real data instead (protocol §6.2).
4. A criterion that names September data is read on September (protocol §6.2).
5. The same defaults as B (item 4) and the same money note.

**Every C row:**

- `### C-NN — Task 0N: <qısa başlıq>`.
- `Mənbə:` `` `BRIEFS/TASK-0N.md`, «Acceptance — biznes dili ilə», sətir L, sitat: "<the bullet, verbatim>" ``.
- `Gözlənilən:` the bullet's own figure or wording, and where it needs one, a supporting line of the same brief
  (quoted, with its line). For Task 4, also what `04-sandbox.md` says at the step, cited.
- `İlk auditdə:` the matching figure or text of the same brief's «Auditdə müşahidə edilən hazırkı problem», quoted with
  its line, and the B row it belongs to; otherwise «brief qeyd etmir».
- `Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)`.

### 6.4 The rows, with their IDs

"Real" means `Harada: real · …` and the real opening of `Addımlar:`. "Sınaq" means `Harada: sınaq · … ·
http://localhost:5174` and the sandbox opening. "Qarışıq" means the mixed form (§3.1). "→" names the rows a row points
to. `Göründü` names the extra lines. Line numbers are those of the brief file.

#### B — `BRIEFS/TASK-04.md` (lines 7–11)

| ID | Line | Row | Where; points to | Göründü |
|---|---|---|---|---|
| B-01 | 7 | «Təsdiq gözləyənlər» boş idi; qərar düymələri heç görünmədi | real, Rəhbər, «Təsdiq gözləyənlər» — what it shows today; → F-02 … F-06 for the buttons and the flow | the queue today; F-02 … F-06's verdicts |
| B-02 | 8 | axını sınamaq üçün mühit yox idi | sınaq; → A-05, F-01 … F-09 | A-05's and F-09's verdicts |
| B-03 | 9 | təsdiqlənmiş sifarişdə status iki dəfə | real: Fəvvarələr meydanı, Sentyabr 2026 order page — every place «Təsdiqlənib» shows (`components/workflow/labels.ts`:8); → F-06 (sandbox, "səhifədə neçə dəfə") | places seen, count |
| B-04 | 10 | panel qərara kömək etmir (Fəvvarələr, Sentyabr 2026) | real: the same page's panel, text verbatim. `Gözlənilən`: `BRIEFS/TASK-04.md`:23 (4.1) and `components/workflow/labels.ts`:68 | panel text |
| B-05 | 11 | qərar üçün beş fakt çatışmır | → F-01 … F-06 (the four facts in the sandbox) and B-04 (an imported order) | one line per fact: göndərən; tarix; neçənci göndəriş; əvvəlki düzəliş səbəbi; təsdiqləyən və tarix |

#### B — `BRIEFS/TASK-05.md` (lines 8–28)

Sub-headings of the brief («Texniki məlumat», «Vahidlər və format», «Köhnə və qeyri-dəqiq terminlər», «Eyni anlayış
üçün fərqli sözlər») go into each row's `Mənbə:` before the line number. Line 19 is a paragraph listing eight terms;
each term is one row. `Gözlənilən` for B-06 … B-17 is `BRIEFS/TASK-05.md`:32–33, 36; for B-18 … B-25 line 34 (the unit
words, in the same order as line 15), with `terminology/units.ts`:9–16; for B-26 … B-28 line 35; for B-29 … B-36 the 5.1
table (lines 43–50) and `terminology/terms.ts`; for B-37 … B-43 line 31 and the unchanged words of lines 53–55.

| ID | Line | Row | Where; points to |
|---|---|---|---|
| B-06 | 8 | LOC-kodu — panelin cədvəli | real, İdarəetmə paneli, «Bütün obyektlər» |
| B-07 | 8 | LOC-kodu — Obyektlər | real, «Obyektlər» |
| B-08 | 8 | LOC-kodu — mobil kartlar | real, 390 × 844: İdarəetmə paneli and Obyektlər (brief does not name the screen; write which) |
| B-09 | 8 | LOC-kodu — obyekt səhifəsinin başlığı | real, Heydər Əliyev Mərkəzinin obyekt səhifəsi |
| B-10 | 9 | PRD-kodu — sifariş sətirləri | real, HEM Sentyabr 2026 order, «Sətirlər» |
| B-11 | 10 | "Versiya 1" — sifarişin başlığı | real, HEM Sentyabr 2026 order |
| B-12 | 10 | "Versiya 1" — obyekt səhifəsinin cədvəli | real, HEM object page |
| B-13 | 10 | "Sətir sayı" sütunu | real, HEM object page's table and the order page (brief does not name the screen) |
| B-14 | 11 | "Server işləyir" başlıqda | real, the header on every screen of this audit; `layout/Header.tsx`:33–50 |
| B-15 | 12 | "2.8" (Rosmarinus) | real; the brief names no order: the operator writes the order where the product was found, or «yoxlanıla bilmədi (mal tapılmadı)» |
| B-16 | 12 | "20078331" (Columbus 80 BM 100 Şotka) | as B-15 |
| B-17 | 12 | "M-101-S-2" (Yay ayaqqabısı) | real, Fəvvarələr meydanı Sentyabr 2026 order (Yay ayaqqabısı is there: `BRIEFS/TASK-07.md`:10) |
| B-18 … B-25 | 15 | one unit each: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG | real, any order line with that unit; PCS on Fəvvarələr's Yay ayaqqabısı ("71 → 0", `BRIEFS/TASK-05.md`:69). `Göründü`: `  - Sifariş və sətir:` |
| B-26 | 16 | "99.00 / ₼" — 1366, sifariş sətirləri | real, 1366, order lines (brief names no order: HEM Sentyabr 2026) |
| B-27 | 16 | "431,670.91 / ₼" — telefon | real, 390 × 844: Aylıq hesabat (431,670.91 is the year's total, `BRIEFS/TASK-08.md`:46) and İdarəetmə paneli; → H-19, H-21 |
| B-28 | 17 | "32.1273 ₼" (Zibil paketi) | real, Fəvvarələr Sentyabr 2026 order (`BRIEFS/TASK-05.md`:69) |
| B-29 | 19 | "Yeni sifarişlər" | real, the five screens (§6.2 item 6) |
| B-30 | 19 | "Artıq sifariş olunmayanlar" | the same |
| B-31 | 19 | "mövqe" | the same |
| B-32 | 19 | "Məlum qiymətlər üzrə məbləğ / cəm" | the same |
| B-33 | 19 | "Çəkili orta qiymət" | the same |
| B-34 | 19 | "Tarixçə natamam" | the same |
| B-35 | 19 | "Son 9 mövcud aydan 3-də" | the same; → E-25 |
| B-36 | 19 | "Trend" | the same |
| B-37 | 22 | "Bütün dövr" / "Bütün dövrün ortalaması" | real: the basis picker and the sentence after choosing it (`components/analytics/format.ts`:41; `terminology/terms.ts`:47) |
| B-38 | 23 | "Artıq sifariş olunmur" (filtr) / "Artıq sifariş olunmayanlar" (nişan) | real: HEM order, «Əsas dəyişikliklər»: the filter and a row's badge |
| B-39 | 24 | "Qiyməti olmayanlar" / "Qiymət yoxdur" | real: Nərimanov heykəli Sentyabr 2026 order, «Niyə dəyişib?» and the line; → E-16 |
| B-40 | 25 | Nərimanov obyekt səhifəsi: "1 məhsulun qiyməti yoxdur" / "1 sətirdə qiymət yoxdur" | real: Nərimanov's object page, the header and the table; → E-15 |
| B-41 | 26 | "40 sətir · 2 sətirdə qiymət yoxdur" — "sətir" iki dəfə | real: the order headlines of HEM, Fəvvarələr and Nərimanov (brief names no order) |
| B-42 | 27 | "qiymətsiz sifarişlər" | real, the five screens |
| B-43 | 28 | kartlarda "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır" | real, İdarəetmə paneli, the attention cards; `həll edən task` also Task 09 (`BRIEFS/TASK-05.md`:63); `Gözlənilən` also `BRIEFS/TASK-09.md`:26 |

B-29 … B-36: `Gözlənilən` names the 5.1 replacement and says that the old word must appear on none of the five screens;
`Göründü`: `  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):` and `  - Yeni söz görülən yer:`.

#### B — `BRIEFS/TASK-06.md` (lines 7–11)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| B-44 | 7 | hissələrin sırası sabit idi; Fəvvarələrdə əsas səbəb 4-cü sətirdə | real, Fəvvarələr Sentyabr 2026, «Niyə dəyişib?»; → E-09. `Göründü`: the parts in page order |
| B-45 | 8 | əsas səbəb vurğulanmır | real, the same; «Əsas səbəb» mark (`components/decisions/CauseSummary.tsx`, by `Grep`) |
| B-46 | 9 | mənfi zolaq boz — Fəvvarələr −8,093.70 | real, the same; `Gözlənilən` `BRIEFS/TASK-06.md`:15 (9.1) |
| B-47 | 9 | mənfi zolaq boz — Nərimanov −1,601.06 | real, Nərimanov Sentyabr 2026; the same |
| B-48 | 10 | cəm tam tutduğu halda xəbərdarlıq — Fəvvarələr (the brief's sum quoted in `İlk auditdə`) | real, Fəvvarələr; `Gözlənilən` `BRIEFS/TASK-06.md`:16, 40; → E-09 |
| B-49 | 10 | eyni — Heydər Əliyev | real, HEM; → E-07 |
| B-50 | 10 | eyni — Nərimanov | real, Nərimanov; → E-11 |
| B-51 | 11 | baza məbləğinin adı yoxdur — HEM, «Son 6 ayın ortalaması», "17,583.62 ₼" | real, HEM Sentyabr 2026 order, basis «Son 6 ayın ortalaması» (`components/analytics/format.ts`:40); the headline's «Baza» / «Fərq» (`components/decisions/DecisionHeadline.tsx`, by `Grep`); `Gözlənilən` `BRIEFS/TASK-06.md`:17 |

#### B — `BRIEFS/TASK-07.md` (lines 7–11)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| B-52 | 7 | HEM kartı yalnız "Yeni sifarişlər +29,691.52 ₼" deyirdi; Traktor +21,900.00 | real, İdarəetmə paneli, HEM's attention card; `Gözlənilən` `BRIEFS/TASK-07.md`:14, 16, 38 (≤ 74 %; ≤ 76 % after the Sabun link, → A-07) |
| B-53 | 8 | traktoru görmək üçün sifarişə keçmək lazım idi | real, the same card; and the order page: the tractor still first in «Əsas dəyişikliklər» (`BRIEFS/TASK-07.md`:30) |
| B-54 | 10 | Fəvvarələr, −2,584.45: ən böyük mal Yay ayaqqabısı −1,988.00 | real, Fəvvarələr's card (or, with no card, its table row); `Gözlənilən` `:17`, `:39` |
| B-55 | 11 | Nərimanov, −1,166.42: ən böyük mal Mərmər bej qalınlığı 2 sm −883.20 | real, Nərimanov's card or table row (the row carries the cause product, `components/dashboard/LocationRows.tsx`, by `Grep`); `Gözlənilən` `:14`, share «brief rəqəm vermir» |

#### B — `BRIEFS/TASK-08.md` (lines 7–14) — real, «Aylıq hesabat»

| ID | Line | Row | Where; points to |
|---|---|---|---|
| B-56 | 7 | ayların cəmi sətri yox idi | the totals row «Cəmi» (`terms.ts`:101); September against the dashboard; → C-21 |
| B-57 | 8 | qeyri-adi ay gözə çarpmır — HEM İyun 36,010.19 (+85.48 %) | HEM's June cell; → C-22 |
| B-58 | 9 | gələcək aylar boş keçmiş aylar kimi | October–December cells, and their note (`terms.ts`:110–115); the current-month rule of §3.3; → C-25 |
| B-59 | 10 | ⚠ faizi əvəz edir — Bayıl yolu, Sentyabr "⚠1"; panel +254.03 % | Bayıl yolu's September cell, and the dashboard's figure for it; → C-26 |
| B-60 | 11 | status nöqtəsinin mənası yalnız siçanla | the legend above the table (`terms.ts`:135; `MonthlyReportTable.tsx`, by `Grep`) |
| B-61 | 12 | 12 aylıq cədvəl yalnız 1280 px-dən enli ekranda | 1200 × 800; → H-22, C-27 |
| B-62 | 13 | beşrəqəmli məbləğlər sıxdır — Fəvvarələr "23,449.32 ₼ 11,161.99 ₼" | Fəvvarələr's row, 1366; `Gözlənilən` `BRIEFS/TASK-08.md`:23 |
| B-63 | 14 | 1440-da cədvəl kartların hüdudundan çıxır | 1440 × 900; → H-04 |

#### B — `BRIEFS/TASK-09.md` (lines 7–21) — real, İdarəetmə paneli

Line 8 has three sub-bullets (lines 9–11), line 14 three findings, and line 15 four sub-bullets (lines 16–19) whose
last names two things. Each is its own row.

| ID | Line | Row | Where; points to |
|---|---|---|---|
| B-64 | 7 | diqqət kartları birinci ekranın altında | 1366 × 768, without scrolling; → H-01, C-28 |
| B-65 | 9 | "Ən böyük məbləğ artımı" iki kartda (HEM, Novxanı) | «Keçən ay» (the brief names no basis; write the basis read); card titles (`components/dashboard/labels.ts`:137–160) |
| B-66 | 10 | "Ən böyük faiz dəyişməsi" iki kartda (Bayıl yolu +254.03 %, Milli Konservatoriya +480.01 %) | the same |
| B-67 | 11 | «Son 3 ayın ortalaması»: Novxanı +268.05 %, kart isə Milli Konservatoriyaya (+85.55 %) | basis «Son 3 ayın ortalaması»; the card's percent and Novxanı's in the table; `Gözlənilən` also quotes `strongPercentageHint` (`labels.ts`:185–186) as "koddan" |
| B-68 | 12 | qiymət xəbərdarlığı hər kartda cümlə kimi; narıncı çox | the cards; `Gözlənilən` `BRIEFS/TASK-09.md`:26 |
| B-69 | 13 | yaşıl xərc artımını göstərir | the cards and the table; `:27` (9.1) |
| B-70 | 14 | çiplər klik olunmur | the chips (`components/dashboard/DashboardSummary.tsx`, by `Grep`); `:28` |
| B-71 | 14 | sıfır saylı çip görünür ("Tarixçə natamam 0") | the chips; `:28` |
| B-72 | 14 | qiymət xəbərdarlığından obyektlərə keçid yox | the «Qiymət yoxdur · N obyekt» chip; `:28`; → C-31 |
| B-73 | 16 | varsayılan sıra obyekt adına görə | «Bütün obyektlər», its sort as opened (`labels.ts`:93–97); `:31` |
| B-74 | 17 | 26/27 sətir iki səhifədə | the same table; `:30`; → C-32 |
| B-75 | 18 | "Növbəti" basılanda səhifə yuxarı qalxır | the same table: whether a «Növbəti» exists; `Gözlənilən` `:30` («brief bu barədə ayrıca nəticə vermir; 27 sətir bir səhifədədirsə, düymə yoxdur») |
| B-76 | 19 | "Detallara bax" iki sətrə sınır | the table, 1366; `:32` |
| B-77 | 19 | qiymət xəbərdarlığı 4 sətir tutur | the table, 1366; `:32` |
| B-78 | 20 | sifarişdən qayıdanda panel ən yuxarıdan açılır | HEM's card → «Detallara bax» → the browser's Back (§3.3); `:33`; → C-33 |
| B-79 | 21 | EXPO: fərq ay cəminin altında (+26,689.47; 71,210.29; 71,030.25) | the headline; `:34`; → E-05, C-34 |

#### C — `BRIEFS/TASK-04.md` (lines 45–51), following `04-sandbox.md` «Yekun cədvəl» (lines 546–553)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-01 | 45 | test sifarişi növbədə; real 27 obyektdə heç nə dəyişməyib | qarışıq: Sınaq 1, addım 1 (→ F-02); real: → A-09, J-04 (Əmr 4, A and J). `Göründü`: `  - Sınaqda növbədəki sifariş(lər):`, `  - J-04-ün hökmü:` |
| C-02 | 46 | qərar düymələri təhlilə baxarkən görünən qalır | sınaq: Sınaq 1, addım 4 (1366, → F-03); Sınaq 2, addım 2 (390, → F-09) |
| C-03 | 47 | səbəbsiz göndərilmir; səbəblə qaytarılır; ikinci göndəriş və səbəb görünür | sınaq: Sınaq 1, addım 5, 6, 7 (→ F-07, F-04, F-05, F-06). `Göründü`: one line for each of the three parts |
| C-04 | 48 | kim və nə vaxt təsdiqləyib; status bir dəfə | sınaq: Sınaq 1, addım 7 (→ F-06) |
| C-05 | 49 | səlahiyyətsiz admin təsdiqləyə bilmir | sınaq: Sınaq 1, addım 3 (→ F-08) |
| C-06 | 50 | Rəhbər təsdiqləyə bilir; ara dövr yoxdur | qarışıq: Sınaq 1, addım 7 (→ F-06); real: an active Rəhbər exists (→ A-04). The row says a real order is never approved in this audit (`04-sandbox.md`:552) |
| C-07 | 51 | köhnə Excel sifarişində "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." | qarışıq: Sınaq 1, addım 8 (reading); real: → B-04 (Fəvvarələr Sentyabr 2026, imported). `Göründü` one line for each |

#### C — `BRIEFS/TASK-05.md` (lines 68–73) — real

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-08 | 68 | panel, sifariş, obyekt: LOC/PRD, "Versiya", "Server işləyir" yoxdur | the dashboard, HEM's September order, HEM's object page; one `Göründü` line per screen; → B-06, B-09 … B-12, B-14 |
| C-09 | 69 | Fəvvarələr: "71 → 0 ədəd"; 2 onluqlu qiymət | Fəvvarələr Sentyabr 2026 order; → B-18, B-28 |
| C-10 | 70 | 1366-da və telefonda məbləğ ₼-dan ayrılmır | 1366 and 390 × 844: the dashboard, the order page, the monthly report; → B-26, B-27 |
| C-11 | 71 | «Yeni məhsullar», «Bu ay yazılmayan məhsullar»; paneldə «Müqayisə üçün data azdır» | HEM's order; the dashboard; → B-29, B-30, B-34 |
| C-12 | 72 | fərqli söz cütlərinin heç biri qalmayıb | → B-37 … B-43, their verdicts under `Göründü` |
| C-13 | 73 | Task 1b, 2, 3-ün sözləri olduğu kimi | the words of `BRIEFS/TASK-05.md`:53–55, one `Göründü` line each; → E-04, E-05, E-12 … E-17, E-19, E-20, E-21 |

#### C — `BRIEFS/TASK-06.md` (lines 38–41) — real, «Keçən ay»

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-14 | 38 | Fəvvarələr: birinci sətir «Bu ay yazılmayan məhsullar −8,093.70 ₼», yaşıl, seçilir | Fəvvarələr Sentyabr 2026, «Niyə dəyişib?»; → B-44, B-46 |
| C-15 | 39 | HEM: birinci sətir «Yeni məhsullar +29,691.52 ₼», qırmızı | HEM Sentyabr 2026; `Gözlənilən` adds `BRIEFS/TASK-06.md`:28 (each part may be 750.00 ₼ smaller after the Sabun link; → A-07) |
| C-16 | 40 | cəm tutanda ziddiyyətli xəbərdarlıq yoxdur; qiymətsiz sətir olanda konkret | Fəvvarələr and HEM for the first half; Nərimanov (it has an unpriced line, → E-16) for the second; → B-48 … B-50 |
| C-17 | 41 | müqayisə sətrində baza oxunur | HEM's headline, «Keçən ay» and «Son 6 ayın ortalaması»; → B-51 |

#### C — `BRIEFS/TASK-07.md` (lines 38–40) — real, İdarəetmə paneli

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-18 | 38 | HEM kartında traktor, məbləğ, "artımların …%-i", ≤ 74 % (≤ 76 % Sabun əlaqəsindən sonra) | HEM's card, «Keçən ay»; → A-07, B-52 |
| C-19 | 39 | Fəvvarələr kartı "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)", ≤ 25 % | Fəvvarələr's card (with no card, write so, and read the table row); → B-54 |
| C-20 | 40 | bazanı dəyişəndə pay yenilənir; heç bir bazada, heç bir kartda 100 %-i keçmir | each of the four fixed bases and one «Xüsusi seçim» (write the range chosen); `Göründü`: one line per basis with every card's share |

#### C — `BRIEFS/TASK-08.md` (lines 46–52) — real, «Aylıq hesabat»

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-21 | 46 | cəmi sətri: Yanvar … Sentyabr və İl; Sentyabr = panel; faiz yoxdur | the totals row; `Göründü`: one line per month, «İl», «Paneldə Sentyabr», «Faiz var / yox»; → B-56 |
| C-22 | 47 | HEM İyun 36,010.19 vurğulanır; ortalama 14,458.58, +149 % | HEM's June cell and its note (`terms.ts`:125); → B-57 |
| C-23 | 48 | HEM Avqust 11,985.02 vurğulanmır; −48 % | HEM's August cell |
| C-24 | 49 | HEM Yanvar, Fevral, Mart vurğulanmır | HEM's three cells |
| C-25 | 50 | Oktyabr–Dekabr "sifariş yoxdur" demir, fərqlənir | the future cells; the current-month rule (§3.3) in `Gözlənilən` as "koddan"; → B-58 |
| C-26 | 51 | Bayıl yolu Sentyabr: həm ⚠1, həm faiz | Bayıl yolu's September cell; → B-59 |
| C-27 | 52 | 1200 px-də 12 aylıq cədvəl | 1200 × 800; → H-22, B-61 |

#### C — `BRIEFS/TASK-09.md` (lines 60–66) — real, İdarəetmə paneli

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-28 | 60 | 1366 × 768-də sürüşdürmədən ən azı bir diqqət kartı | → H-01, B-64 |
| C-29 | 61 | kart başlığı təkrarlanmır; "ən böyük faiz" kartı həqiqətən ən böyük faizlidir | every card title; the percent card's figure against the table's percentages among objects that meet `strongPercentageHint` (quoted "koddan"); there is no sort by percentage (§3.3), so the operator reads the column; → B-65 … B-67 |
| C-30 | 62 | HEM kartında artım qırmızı, Fəvvarələrdə azalma yaşıl; "xərc artıb / azalıb" | the two cards; → B-69 |
| C-31 | 63 | «Qiymət yoxdur · 10 obyekt» çipi → cədvəldə həmin 10 obyekt | the chip, clicked (a filter; it writes nothing); `Göründü`: the chip's count, the rows left; → B-72 |
| C-32 | 64 | 27 obyekt bir səhifədə, ən böyük dəyişmədən başlayır | «Bütün obyektlər»; → B-73, B-74 |
| C-33 | 65 | HEM kartından sifarişə keçib qayıdanda kartın yanına dönür | the browser's Back (§3.3); → B-78, E-02 |
| C-34 | 66 | «Keçən ay»: başlıqdakı çıxma (71,030.25 − 44,340.78) göstərilən fərqə bərabər | the headline; → E-05, B-79 |

Figures in these tables are the briefs'; the Coder quotes them from the brief lines, not from this table.

## 7. No suites

15a4 changes only Markdown under `docs/audits/`, so the suites are not run (`TASK-15a1.md` §7). The tracked tree outside
that folder must stay byte-for-byte `282b62b`.

## 8. Out of scope

- B and C rows for `TASK-10.md` … `TASK-14.md`, `TASK-16.md`; B's four "Xeyr" rows; section D. They are 15a5's.
- Any change to the preamble, to sections A, D … K, or to `README.md`, `01`, `03`, `04`, `05` or `06`. If one of them is
  wrong in a way that affects a row, write the row from the code and list the difference in the report for 15a5.
- Running anything in the kit: no `dotnet`, no tool, no `sandbox.ps1`, no `psql`, no `npm`, no browser.
- A verdict, a priority, a finding, an expected figure no brief line gives, or a report text.
- Reconstructing anything of the 23.09.2026 audit (A2) beyond what the briefs' own bullets record.
- Editing a brief, `TASKS/`, or any tool, including the sandbox seed.

## 9. Safety and STOP conditions

STOP and report if:

- a check in B or C can only be done by writing to `baxorders_dev`: write it as «yoxlanıla bilmədi» with the reason, and
  list it;
- a row would need an admin account on real data anywhere except A-04's (`01-hazirliq.md` §4): find a Rəhbər or sandbox
  way, or write «yoxlanıla bilmədi» with the reason;
- a row would send anyone to `/imports?id=6`, or to any real import batch;
- a bullet of briefs 04–09 cannot be turned into a check at all: write the row anyway, with «yoxlanıla bilmədi» and the
  reason, and list it. Never drop it;
- a credential, token or connection string with a password would have to be written into a file;
- the brief and the protocol disagree.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `sandbox.ps1`, `npm`, `git commit` /
`reset` / `checkout` / `push`, or an edit outside `02-yoxlama-siyahisi.md`, `AI_WORKFLOW/LAST_REPORT.md` and
`AI_WORKFLOW/STATE.json`.

## 10. Acceptance criteria

1. `02-yoxlama-siyahisi.md` gains B's introduction and B-01 … B-79 under the B heading, and C's introduction and
   C-01 … C-34 under the C heading. No other file in the folder changed. `git diff 282b62b --` of the file shows only
   added lines, all between the B heading and the D heading.
2. **Coverage, counted.** The rows carry every bullet of briefs 04–09 exactly as §6.4 maps them:
   - «Auditdə müşahidə edilən hazırkı problem»: 04 → 5 bullets / 5 rows; 05 → 15 bullets and line 19's eight terms /
     38 rows; 06 → 5 / 8; 07 → 3 bullets with line 9's two examples / 4; 08 → 8 / 8; 09 → 8 bullets with their
     sub-bullets / 16;
   - «Acceptance»: 04 → 7; 05 → 6; 06 → 4; 07 → 3; 08 → 7; 09 → 7.

   Every row's `Mənbə:` quotes its bullet verbatim with its line number.
3. Every row has the twelve lines of the preamble in order, with the marker `---- operator doldurur ----` exactly, and
   extra lines only under `Göründü:`. B rows' `Hökm:` is «həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi
   (səbəb)»; C rows' is «keçdi / keçmədi / yoxlanıla bilmədi (səbəb)».
4. Every B row names `həll edən task`. Every B row's `İlk auditdə:` quotes its bullet's figure or words; none says
   «brief qeyd etmir».
5. Every figure in `Gözlənilən` or `İlk auditdə` cites a brief line; otherwise the row says «brief rəqəm vermir». Code
   facts are marked "koddan" and cite file and line.
6. Every real row's `Addımlar:` opens with the real reminder; every sandbox row's with `04-sandbox.md` §1's three checks;
   every mixed row as E-27 does. Task 4's C rows name the «Sınaq 1» / «Sınaq 2» steps of `04-sandbox.md` «Yekun cədvəl»
   and the F rows. No step writes to `baxorders_dev`; no row points to `/imports?id=` on the real system.
7. No password, token, secret or connection string with a password. No `P0` … `P3` value in any row.
8. Nothing of the first audit is reconstructed beyond the briefs' own bullets: no section list, priority or click path.
9. `git status --short` shows only ` M docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md` beyond the
   untracked workflow files.

## 11. Final report (`AI_WORKFLOW/LAST_REPORT.md`)

- HEAD, `git status --short`, `git diff --stat 282b62b`, `git diff --stat 7550eda HEAD -- frontend src tools`;
- the file's new line count; rows per section (B, C) and per brief;
- the coverage table of §10 item 2: for each brief 04–09, each bullet's line → its row IDs;
- every row marked «yoxlanıla bilmədi» by the Coder, and why;
- every label not found in the code («kodda tapılmadı»), and every §3 fact the code contradicted, with what the file
  follows instead;
- anything in `01`, `03`, `04` or `05` that a row found wrong, for 15a5;
- a statement that nothing was run, no database was touched, and no file outside §9's list changed.

End with `READY_FOR_REVIEW`.

## 12. For the Reviewer

On acceptance, 15a4 is committed as usual. Then set `currentTask` to `15a5`, status `PLANNING`, `nextTask` `15b`. Do not
open HD-008. For 15a5: B continues from B-80 after B-79, C from C-35 after C-34; its four "Xeyr" rows (brief 15 lines 8–11) cite rows
by ID. Candidates for the 15a5 Planner to confirm, not decided here: reason 1 → E-01 … E-11, E-18 … E-22; reason 2 →
E-12 … E-17, A-10 … A-12; reason 3 → B-01, B-02, B-05, C-01 … C-07, F-01 … F-09; reason 4 → B-52 … B-55, C-18, C-19.
H-19, H-21, H-23 and H-25 point to its Task 12 C rows.

## 13. Assumptions the Planner made

- P1. The B and C IDs are fixed here (§6.4), so that 15a5's "Xeyr" and D rows and the Reviewer can cite and count them.
- P2. "An example" (protocol §10 A2) is a separately observable instance the bullet names: an object, a screen, a
  figure, a code, a unit or a term. A list of the parts of one requirement stays one row with one `Göründü` line per
  part (B-05's five facts). So line 8 of brief 05 is four rows (four screens), line 15 eight (eight units), line 19
  eight (eight terms), and B-05 is one.
- P3. Brief 05's line 19 is a paragraph under a bold sub-heading, not a `-` bullet, but it is a first-audit finding in
  that section, so its eight terms get rows.
- P4. Brief 09's line 14 is split into its three findings (not clickable, zero chip, no link from the price warning),
  and line 19 into its two (the button wraps, the warning takes four lines).
- P5. "Həll edən task" is the brief's own task, plus any task that brief's «Out of scope» names for part of the finding.
  It goes at the end of `Mənbə:`, so every row keeps the preamble's twelve lines.
- P6. B and C each get a short introduction, as E and F have, because the preamble says their verdict words live with
  them and the B rows share reading defaults and a money-format note.
- P7. Where a brief names no object or order for a finding (the codes of line 12, most units, "40 sətir"), the row names
  the most likely order from another brief line where one exists, and otherwise asks the operator to write where it
  was found, or «yoxlanıla bilmədi (tapılmadı)».
- P8. Task 4's acceptance bullets 1, 6 and 7 are mixed rows: the sandbox part as `04-sandbox.md` «Yekun cədvəl» says,
  and a read-only real part that another row already records (A-04, J-04, B-04).
- P9. "Qayıdanda" (brief 09) is the browser's Back, as E-02 reads "Geri": the Planner found no in-page way back on the
  order page.
- P10. 15a4 is one session of 113 rows, about the size of 15a3 (99 rows). Its reading is smaller, because the rows are
  mapped here and most point to rows that already exist.
