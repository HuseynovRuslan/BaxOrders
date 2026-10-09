# TASK 15a3 — YEKUN AUDİT DƏSTİ: YOXLAMA SİYAHISI — GİRİŞ, A, E, F, G, H, I, J, K (Task 15a, sub-part 3 of 5)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by every part of Task 15; there is no `TASK-15a3` brief).
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md` — what the audit checks and how it is reported. Unchanged.
Kit specification: `AI_WORKFLOW/TASKS/TASK-15a.md` — what the whole kit contains. Unchanged, and it still governs.
Split map: `AI_WORKFLOW/TASKS/TASK-15a1.md` §1, §2; `TASK-15a2.md` §1; `PLAN.md`, "Current".
Where this file and `TASK-15a.md` disagree, `TASK-15a.md` wins; where it and the protocol disagree, the protocol wins;
where the protocol and the brief disagree, the brief wins. In every such case: STOP and report.

Specification status: **READY.** Written by the Planner on 2026-09-25. Repository at `e19b590` (HEAD, 15a2's commit).

**Documentation only.** This part adds one file, `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`.
No other file of the kit changes. No application code, test, style, schema, migration, tool or data change. No database
command of any kind, and no tool, script, sandbox or browser is run. This file carries no data-migration line, on
purpose.

---

## 1. Place in the split

| Part | Writes | Status |
|---|---|---|
| 15a1 | `README.md`, `01-hazirliq.md`, `05-neticeler-qaytarilmasi.md`, `06-hesabat-skeleti.md`; the suites | accepted (`4023da2`) |
| 15a2 | `03-emrler.md`, `04-sandbox.md` | accepted (`e19b590`) |
| **15a3 (this file)** | `02-yoxlama-siyahisi.md`: the preamble, sections A, E, F, G, H, I, J, K, and empty headings for B, C, D | current |
| 15a4 | `02-yoxlama-siyahisi.md`: B and C for `BRIEFS/TASK-04.md` … `TASK-09.md` | queued |
| 15a5 | `02-yoxlama-siyahisi.md`: B and C for `TASK-10.md` … `TASK-14.md`, `TASK-16.md`; B's four "Xeyr" rows; D; the whole-kit check | queued |

HD-008 (the operator run) opens only when 15a5 is accepted. Accepting 15a3 opens nothing for the operator.

**The seam with 15a4 and 15a5.** They add rows under the B, C and D headings this part leaves empty, in the row format
this part fixes (§6.1). They will point to rows written here: D's rows for 15.1, 15.2 and 15.2a point to the gate rows of
section A (`TASK-15a.md` §4.3, D). So the A row IDs this part assigns are fixed by this specification (§6.2) and must not
be renumbered.

## 2. Which acceptance criteria this part carries, and which it leaves

- **Carried here** (`TASK-15a.md` §8):
  - item 2 for section E — every sample of `BRIEFS/TASK-15.md` «Mütləq qorunmalı davranışlar» has a row;
  - item 3 for every row written here — the fixed fields, and every «Gözlənilən» figure citing its source;
  - item 4 for sections F, G (K2) and I — every write-check says *sınaq* with its `04-sandbox.md` steps;
  - items 6 and 8 for this file.
- **Left to 15a4 and 15a5:** item 2 for sections B, C, D and the whole-kit count; item 3 and 4 for the B, C, D rows.
- **Left to 15a5:** item 1's final check that all seven files exist; item 7's whole-kit check.
- **Left to 15b** (unchanged): the protocol's §9 items 1–11.

## 3. Verified current state (the Planner read these on 2026-09-25; the Coder confirms each at the cited lines)

### 3.1 Git and the kit

- HEAD `e19b590` (15a2). The two commits after `7550eda` (`4023da2`, `e19b590`) changed Markdown under `docs/audits/`
  only (`REVIEWS/TASK-15a1.md`, `REVIEWS/TASK-15a2.md`). So the frontend is the one at `7550eda`, which `TASK-15a.md`
  §4.3 asks the steps to cite. Confirm with `git diff --stat 7550eda HEAD -- frontend src tools` (expect nothing).
- Untracked: `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1`, `run-agent.ps1` (workflow infrastructure).
- The kit folder holds `README.md` (136 lines), `01-hazirliq.md` (254), `03-emrler.md` (500), `04-sandbox.md` (590),
  `05-neticeler-qaytarilmasi.md` (55), `06-hesabat-skeleti.md` (116). `02-yoxlama-siyahisi.md` does not exist.
- The kit's names that this file points to:
  - `01-hazirliq.md`: §1 Tarix (G1), §2 Commit, §3 Real sistem (3.1 baza, 3.2 API, 3.3 frontend; the real UI is
    `http://localhost:5173`), §4 Rəhbər hesabı (G3), §5 Sınaq mühiti (5.1 … 5.5), §6 Ekran enləri, §7 Ekran şəkilləri;
  - `03-emrler.md`: §2 how to run and keep the output (`$env:TEMP\emr-N-A.txt` / `-J.txt`), 2.1 the safety line, 2.2 the
    exit code; §3 «Əmr 1» … «Əmr 4», each with its «Hara gedir» list; §4.5 the A-equals-J rule and its `Compare-Object`
    line; §5.1 the batch states (from Əmr 1 and Əmr 3); §5.2 HD-002's share; §7 deleting the temporary files;
  - `04-sandbox.md`: §1 the three checks before any write; §3 the sessions; «Sınaq 1» (addım 1–9), «Sınaq 2»,
    «Sınaq 3» (addım 1–13), «Sınaq 4» (addım 1–7), «Sınaq 5»; the closing table «Yekun cədvəl»; the closing section
    «Hər seansdan sonra və audit bitəndə»;
  - `05-neticeler-qaytarilmasi.md`: §1 fill only below the marker, never leave a field empty; §2 screenshot names;
    §4 command output under A and J;
  - `README.md` §3: the section letters and names A … K; §8 «Yoxlanıla bilməyənlər».

### 3.2 Facts the rows need, from the code and the records

- **Routes and menu** (`frontend/bax-orders-web/src/layout/navigation.ts:26–41`, `App.tsx:29–69`):
  «İdarəetmə paneli» `/dashboard`; «Aylıq hesabat» `/dashboard/monthly`; «Təsdiq gözləyənlər» `/approvals`
  (`canViewApprovals`); «Excel importları» `/imports` (`canManageImports`); «Obyektlər» `/locations`, an object
  `/locations/:locationId`; an order `/orders/:orderRequestId`; «Məhsullar» `/products` (`canManageCatalog`);
  «Təchizatçılar» `/suppliers`; «Qiymət təsnifatı» `/pricing-modes` (`requires: 'canManageCatalog'` in the menu only);
  «İstifadəçilər» `/admin/users` (`canManageUsers`).
- **A Rəhbər can open Qiymət təsnifatı by its address.** The route is not behind `RequirePermission` (`App.tsx:58`); only
  the menu hides it (`navigation.ts:35–39`). Without `canManageCatalog` the page shows `readOnlyNote` and no decision
  buttons (`pages/PricingModeReviewPage.tsx:133–143`, `:219–237`). Its three totals are «Təsnif edilməyib»,
  «Alış qiyməti tələb olunur», «Ödənişsiz daxili təminat» (`:173–179`), and they count unpriced lines only
  (`03-emrler.md`, Əmr 1, «Hara gedir»). So gate G2 is read by the **Rəhbər**, at `/pricing-modes`, with the whole
  table (no `?order=`), and the audit never needs an admin for it.
- **No batch list on `/imports`.** G2's batch states come from `03-emrler.md` §5.1. No row may send anyone to
  `/imports?id=6` (`REVIEWS/TASK-15a2.md`, "Notes").
- **Screen words the E rows need** (`frontend/bax-orders-web/src/`):
  - bases: «Keçən ay», «Son 3 ayın ortalaması» (`components/analytics/format.ts:38–39`). The brief says "Son 3 ay"; the
    screen says «Son 3 ayın ortalaması». The picker is `components/analytics/BasisPicker.tsx`;
  - coverage: «Sifariş qeydə alınmayıb», «Sistemdə hələ sifarişi yoxdur» (`coverage/labels.ts:32–34`), and the line
    "24 / 27 obyekt üzrə sifariş var · …" (`coverage/labels.ts:133–138`);
  - price words: «Qiymət yoxdur», «Daxili təminat» (`pricing/labels.ts:62–65`), "Daxili: Azpetrol baza"
    (`pricing/labels.ts:205–212`); the object page's "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1"
    (`components/locations/LocationTrend.tsx:187`);
  - «Niyə dəyişib?» (`components/decisions/CauseSummary.tsx:68`); "Son 9 ayın 3-də" (`terminology/terms.ts:208`,
    `components/analytics/trend.ts:64–67`);
  - a draft is shown as «Təsdiqlənməyib», not «Qaralama» (`components/workflow/labels.ts:6`,
    `components/imports/labels.ts:177`).
  - **No control is labelled «Geri».** The only such words are «Geri al», «Geri alınıb», «Geri qaytar» (product matches
    and import review). The brief's "«Geri» bazanı qaytarır" is therefore the browser's Back button (Task 1: the basis
    travels in the address). The E row says so.
- **Figures the briefs record for the E samples.** Each is either what the first audit saw (from a brief's «Auditdə
  müşahidə edilən hazırkı problem») or what must be seen (from «Acceptance» or «Mütləq qorunmalı davranışlar»):
  - Task 1b: `BRIEFS/TASK-09.md:21` (EXPO, Keçən ay: +26,689.47; 71,210.29; 71,030.25 — first audit); `:39–41` (the
    three groups and their objects); `:44` (24 / 27);
  - Task 1c: `BRIEFS/TASK-06.md:10` (Fəvvarələr, Sentyabr, Keçən ay: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 =
    −2,584.45 ₼ — first audit); `BRIEFS/TASK-06.md:28` (Heydər Əliyev, Keçən ay: Yeni +29,691.52, Miqdar −309.20,
    Qiymət +30.00, Artıq −5,259.62, Xidmətlər −300.00, cəmi +23,852.70 — must be seen; after the Sabun variant link,
    Yeni and Artıq may each be 750.00 ₼ smaller and the total does not move); `BRIEFS/TASK-07.md:11` (Nərimanov
    heykəli, −1,166.42, «Artıq sifariş olunmayanlar» −1,601.06 — first audit); `BRIEFS/TASK-13.md:42`, `:46`;
  - Task 2: `BRIEFS/TASK-11.md:32`, `:50` (Nərimanov, Sentyabr — 1 / 1); `BRIEFS/TASK-05.md:25`;
  - Task 3: `BRIEFS/TASK-05.md:55` (full names, with examples); `BRIEFS/TASK-08.md:24` and `BRIEFS/TASK-09.md:41`
    (Çadır); `BRIEFS/TASK-09.md:44` (24 / 27);
  - good points: `BRIEFS/TASK-10.md:39`, `:44` ("Son 9 ayın 3-də sifariş edilib"); `BRIEFS/TASK-08.md:23`, `:52`
    (the 12-month table from about 1024 px, and at 1200 px).
  - No brief gives a figure for Task 1's Heydər Əliyev «Son 3 ay» card, for the order of the object list, or for
    «yığcam məhsul sətri». Those rows say «brief rəqəm vermir».
- **The carried list** (protocol §3, `TASKS/TASK-15.md:110–125`) and where each item can be read without writing:
  - 16b's seven technical words on the import screens: Rəhbər cannot open `/imports` (Task 14), and no real batch may be
    opened (above). They are read in the sandbox, during «Sınaq 3», as `sinaq.koordinator`, reading only;
  - 16b's two button wordings: «Sınaq 3», addım 6 (the import tab) and addım 12–13 (Qiymət təsnifatı's buttons,
    `PricingModeReviewPage.tsx:227`, `:234`);
  - 16a's NotRequired dialog (`pages/SuppliersPage.tsx:258–261`): «Sınaq 3», addım 5 opens it («Qiymət siyasəti»),
    before «Təsdiq et»;
  - 14's product codes and sheet:row reference on the pricing page: real data, Rəhbər, `/pricing-modes`, reading;
  - 13c's HEM September «Keçən ay» +23,852.70: real data, Rəhbər, the order page; whether the Sabun link was approved is
    Əmr 2's Sabun line (`03-emrler.md` §4.4);
  - 12's phone check at 390 × 844: section H's 390 rows and «Sınaq 2».
- **Roles** (`src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs:60–86`, as `04-sandbox.md` cites them): the
  queue is visible to the Rəhbər and the Admin; approval is the Rəhbər's alone; imports and the catalogue belong to the
  Coordinator and the Admin; users to the Admin.

## 4. Working rules for this session. They are the fix, not advice.

1. **Read only what §5 lists**, at the line ranges given. Do not open `OWNER_BRIEFS_MASTER.md`, `LOGS/`, `REVIEWS/`,
   any `tools/` project, the backend, or any brief line §5 does not list. B, C and D are not written here, so the task
   briefs are read only at the lines E needs.
2. **Write as you go, in this order:** (1) create the file with the preamble, section A and the empty B, C, D headings;
   (2) add E; (3) F and G; (4) H; (5) I; (6) J and K. Use `Write` once for step 1 and `Edit` to append after that. If the
   session is cut off, what is written stands.
3. **Search narrowly.** `Grep` with a pattern and a path; `Read` with a line range. One `Grep` per label you need, not a
   sweep of the frontend.
4. The facts in §3 were checked by the Planner. Confirm each at its cited lines rather than re-deriving it. If one is
   wrong, follow the code, write the row from the code, and say so in the report.

## 5. Reading list

- `AI_WORKFLOW/BRIEFS/TASK-15.md` (55 lines, all of it).
- `AI_WORKFLOW/TASKS/TASK-15a.md` §4.3 (lines 136–193), §7, §8.
- `AI_WORKFLOW/TASKS/TASK-15.md`: §3 (97–125), §5 (149–211), §6.3–§6.6 (260–315), §7.2 (365–375), §8 (394–410), §9
  item 11 (436–438), §10 A2–A4 (445–449).
- The kit: `README.md` (all); `01-hazirliq.md` 1–117 and 224–254; `03-emrler.md` 96–160, the three «Hara gedir» blocks
  and Əmr 4's (189–205, 234–243, 276–284, 310–319), 394–465, 494–500; `04-sandbox.md` 1–230, 322–420 (step headings and
  what each step records), 424–440, 504–590; `05-neticeler-qaytarilmasi.md` (all).
- For section E only, the brief lines of §3.2 ("Figures the briefs record"), each with two lines of context:
  `BRIEFS/TASK-05.md:25`, `:55`; `TASK-06.md:10`, `:28`; `TASK-07.md:11`; `TASK-08.md:23–24`, `:52`; `TASK-09.md:21`,
  `:39–44`; `TASK-10.md:39`, `:44`; `TASK-11.md:32`, `:50`; `TASK-13.md:42`, `:46`.
- Frontend (`frontend/bax-orders-web/src/`), by `Grep` or short reads:
  - `layout/navigation.ts`; `App.tsx` (routes);
  - `components/analytics/format.ts:30–60`, `components/analytics/BasisPicker.tsx`, `analytics/basisParams.ts` (the
    bases, the default basis and month the dashboard opens with, and how the basis travels in the address);
  - `coverage/labels.ts:15–40`, `:120–170`;
  - `pricing/labels.ts:55–80`, `:200–215`; `components/locations/LocationTrend.tsx:180–200`;
  - `components/decisions/CauseSummary.tsx:30–80` (the parts, their order and the «Cəmi» line);
  - the order page's line table: which amounts each line shows (`pages/OrderDetailPage.tsx`,
    `components/decisions/DriverList.tsx` — column headers only);
  - `terminology/terms.ts:200–215`, `components/analytics/trend.ts:55–70`, the «Məhsul tarixçəsi» window's title (`Grep`);
  - `components/workflow/labels.ts:1–30`;
  - `pages/PricingModeReviewPage.tsx:129–240` and the column headers of its table (for section I, item 14: product
    code and sheet:row);
  - the dashboard: the attention card, the table row and the summary's figures (`components/dashboard/`, headings and
    labels only);
  - the monthly report's page and its phone list (`pages/MonthlyReportPage.tsx`, `components/reports/` — headings only);
  - for section I, one `Grep` per word over `components/imports/` and `pages/ImportsPage.tsx`: "Bu mərhələdə sorğu
    yaradılmır", "staging", "Sifariş siyahıları növbəti mərhələdə", "Mövcud sorğu", "Versiya", "Ö/v", and the sheet:row
    reference; and `pages/SuppliersPage.tsx:240–305`;
  - `src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs:60–86` (roles).

## 6. What the Coder writes

One file: `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`, in Azerbaijani, in plain business
words. Command lines, file paths, URLs, user names, screen labels and tool output stay exactly as they are. Every
route, label and step cites the frontend file and line it comes from, or the kit file and section.

### 6.1 The preamble

1. **What the file is**, in three or four sentences: the checklist of the audit; the operator does not fill it but its
   copy `neticeler.md` (`05-neticeler-qaytarilmasi.md` §1, `01-hazirliq.md`, "Başlamazdan əvvəl"); the order of work is
   `README.md` §4.
2. **The row format**, shown once as a fenced block, exactly this (it refines `TASK-15a.md` §4.3's block only by the ID
   form of `TASK-15a1.md` §6):

   ```
   ### <ID> — <qısa başlıq>
   Mənbə: <brief faylı + bölmə, və ya protokol §>, sitat: "<bənd, sözbəsöz>"
   Harada: <real / sınaq> · <ekran> · <ünvan və ya menyu yolu> · <en(lər)>
   Addımlar: <nömrələnmiş kliklər>
   Gözlənilən: <brief və ya qəbul edilmiş yoxlamanın dediyi, mənbəsi ilə; və ya «brief rəqəm vermir»>
   İlk auditdə: <brief-in ilk audit üçün qeyd etdiyi rəqəm və ya mətn; yoxdursa «brief qeyd etmir»>
   ---- operator doldurur ----
   Göründü:
   Rəqəm:
   En:
   Ekran şəkli:
   Hökm: <bu bölmənin sözləri> / yoxlanıla bilmədi (səbəb)
   Qeyd:
   ```

   The marker line is `---- operator doldurur ----`, spelled exactly so: `05-neticeler-qaytarilmasi.md` §1 and
   `01-hazirliq.md` rely on it. Every row of every section uses these twelve lines, in this order, with nothing between
   them except as item 3 allows.
3. **Section-specific lines.** Where a section needs more than one figure, the extra lines go **under `Göründü:`**,
   each indented as `  - <ad>:`. The Coder writes the names; the operator fills the values. Used in E (Task 1c's
   amounts), F (the four facts), G (the count sheet), H (the observations) and J (`Başlanğıcla eynidir: bəli / xeyr`).
   Nothing else is added to a row.
4. **The verdict words, per section** (the `Hökm:` line lists only these, then «yoxlanıla bilmədi (səbəb)»):
   A, E, F, H, J — «keçdi / keçmədi»; G — «sayıldı»; I — «hələ var / artıq yoxdur»; K — no `Hökm` value: write
   «—» (the operator records; 15b judges, `TASK-15a.md` §11 P7). B, C, D are 15a4's and 15a5's; this part does not set
   their words. The operator never writes a priority or a proposed task.
5. **IDs and screenshots.** `<bölmənin hərfi>-<iki rəqəm>`, numbered from 01 within each section. Screenshot names
   `<ID>-<ekran>-<en>.png` (`05-neticeler-qaytarilmasi.md` §2). Say which rows *require* a screenshot: every G2 row
   (A-10 … A-13) and every item the operator judges P0 or P1 (`01-hazirliq.md` §7; protocol §7.2).
6. **The screens and their routes**, as one table: screen (its page title), menu entry, address, who can open it
   (from `navigation.ts` `requires` and `ICurrentUserContext.cs`), and where the audit reads it (real with the Rəhbər,
   or sınaq). Include the four the Rəhbər must not open by direct link (Excel importları, Məhsullar and its categories,
   İstifadəçilər) marked as such; their checks are C rows (15a5). Include Qiymət təsnifatı with its note (§3.2: not in
   the Rəhbər's menu, opened by address or from an order's price warning). Include the «Məhsul tarixçəsi» window (opened
   from the order page) and the order page's own route.
7. **Brief words and screen words.** A short table for the words that differ: "Son 3 ay" → «Son 3 ayın ortalaması»;
   "Geri" → the browser's Back button (no control of that name, §3.2); "Qaralama" → the screen's word for a draft is
   «Təsdiqlənməyib». Each with its source.
8. **Real-data safety in every real row.** One paragraph, and a one-line reminder in each real-data row's `Addımlar`:
   read only; if the screen offers the Rəhbər a write action that Task 14 says must not exist, do not click it — record
   it (protocol §8; `README.md` §5).

Then the section headings, in this order: `## A. Ön şərtlər (G1, G2, G3)`, `## B. Köhnə tapıntılar`,
`## C. Task 04–16 qəbul şərtləri`, `## D. Sahibin qərarları 4.1 … 16.1`, `## E. …`, … `## K. Yeni tapıntılar`, with the
names of `README.md` §3. **B, C and D are headings with nothing under them.** No placeholder text: 15a4 and 15a5 add
their rows directly below.

### 6.2 Section A — the gates (protocol §5; `TASK-15a.md` §4.3 A)

A short introduction: the gates run in `README.md` §4's order (preparation, then the start run of the commands, then
the figures); any gate that fails is a STOP (`README.md` §5); the regression suites are the Coder's (15a1 ran them as the
baseline, 15b runs them again; protocol §5.3), so no row asks the operator to run them. Then these rows, **with these
IDs** (15a5's D rows point to them):

| ID | Row | Where it points | Gözlənilən, with its source |
|---|---|---|---|
| A-01 | G1 — the date | `01-hazirliq.md` §1 | on or before 2026-10-31; else STOP (protocol §5.1). Quote A1's sentence (protocol §5.1). |
| A-02 | G3 — the commit | `01-hazirliq.md` §2 | `git diff --stat 7550eda HEAD` shows only `docs/audits/`; else STOP (protocol §5.3, §8) |
| A-03 | G3 — the real system started; the API's start time; the address the UI opened on | `01-hazirliq.md` §3 | `http://localhost:5173` or the one vite printed (`01-hazirliq.md` §3.3) |
| A-04 | G3 — an active Rəhbər user; the header shows the Rəhbər's name, not "Administrator" | `01-hazirliq.md` §4 | protocol §5.3; if none: STOP |
| A-05 | G3 — the sandbox reset; what it left | `01-hazirliq.md` §5.2, §5.4 | the test order waiting for approval and the draft, as §5.4 states them |
| A-06 | Əmr 1, start run | `03-emrler.md` §2, Əmr 1 | the safety line (2.1); exit code 0 (2.2); the «Hara gedir» lines copied into A-10 … A-13 |
| A-07 | Əmr 2, start run | `03-emrler.md` §2, Əmr 2 | the same; its «Hara gedir» lines (suggestion counts, decision count, the Sabun lines and verdict, HEM September «Keçən ay») |
| A-08 | Əmr 3, start run | `03-emrler.md` §2, Əmr 3 | the same; its «Hara gedir» lines (object count, aliases, batches, HD-002 block) |
| A-09 | Əmr 4, start run | `03-emrler.md` §2, Əmr 4; §4.1–§4.5 | "All 9 checks passed. Nothing was changed." if nothing changed since 16a (§4.1). Record PASS or FAIL as it came, with every difference line, and **no verdict** on a difference (§4.5). |
| A-10 | G2 — «Təsnif edilməyib» | Rəhbər, `/pricing-modes` typed in the address bar, 1366; and Əmr 1's `Təsnif edilməyib (Unresolved): …` line | **0** (protocol §5.2). Screenshot required. |
| A-11 | G2 — «Alış qiyməti tələb olunur» with no price | the same page's second total; Əmr 1's `Alış qiyməti tələb olunur (PriceRequired): …` line | **0** (protocol §5.2). Say, from the code, that the page counts unpriced lines only (§3.2), so this total *is* the gate figure. The protocol also asks for the count of all «Alış qiyməti tələb olunur» rows including priced ones: no screen and no command of the kit prints it, so the row gives the operator a line for it that reads «oxunmur — …» with that reason. Screenshot required. |
| A-12 | G2 — «Ödənişsiz daxili təminat», and how many are HD-002's | the same page's third total; Əmr 1's `Ödənişsiz daxili təminat (InternalFreeSupply): …` and `Pricing decisions recorded: …`; `03-emrler.md` §5.2 | last recorded: 95 with 94 decisions (`PLAN.md`, Task 16a); read again, not reused. HD-002's share per §5.2. A difference that still passes G2 is recorded, not a STOP (protocol §5.2). Screenshot required. |
| A-13 | G2 — the import batches | `03-emrler.md` §5.1, its three checks | `Imported: 1`; `#50010 … Imported … materialized True`; `#6 … NeedsReview`. Anything else: STOP. The row says, in `Addımlar`, not to open `/imports?id=6`. Screenshot of the pasted lines is not possible; the pasted output is the evidence. |
| A-14 | The gates' outcome | A-01 … A-13 | All of A-01, A-02, A-04, A-10, A-11 and A-13 «keçdi»; otherwise the audit stops here (`README.md` §4, step 3) |

For A-10 … A-12 the row's steps say: open the address, check that the read-only note is shown (so no decision button
is offered), read the three totals, then compare each with Əmr 1's line and write both. If the page and Əmr 1 differ,
record both; do not choose.

### 6.3 Section E — regression, on September data (protocol §6.3; `TASK-15a.md` §4.3 E)

One row per sample of `BRIEFS/TASK-15.md:33–38`, quoted verbatim in `Mənbə`. Split a line into samples at each «;»
and, for Task 1c, per order. This gives at least:

- **Task 1** (line 33): (1) Heydər Əliyev Mərkəzi, «Son 3 ayın ortalaması», the dashboard's figure and the order page's
  figure — the card if HEM has one on that basis, otherwise its table row; the row says to write which; (2) the
  browser's Back returns the basis (§3.2). Real, Rəhbər, 1366.
- **Task 1b** (line 34): (1) the dashboard's headline equals the table's total, on «Keçən ay» and on the basis the
  dashboard opens with; (2) «Sifariş qeydə alınmayıb» lists Puşkin parkı and Təmir-tikinti; (3) on «Keçən ay», EXPO
  stands apart («Müqayisə bazası yoxdur», `BRIEFS/TASK-09.md:40`), with the first audit's figures in `İlk auditdə`
  (`BRIEFS/TASK-09.md:21`).
- **Task 1c** (line 35), for each of Heydər Əliyev Mərkəzi, Fəvvarələr meydanı and Nərimanov heykəli, September 2026,
  «Keçən ay» (protocol §6.3), two rows:
  - *"hər sətirdə baza + fərq = cari"*: the headline, and the three largest lines of the main-cause part of «Niyə
    dəyişib?», each with `  - <sətir>: baza … · fərq … · cari …` under `Göründü:`. The amounts' names are the ones the
    order page shows (take them from the code, §5). The operator writes the figures; nobody adds them up in the kit;
  - *"hissələrin cəmi «Cəmi»yə bərabərdir"*: one line per part of «Niyə dəyişib?», in the page's order, and the
    «Cəmi».
  - Expected and first-audit figures from §3.2 only, each where it belongs: HEM's parts in `Gözlənilən`
    (`BRIEFS/TASK-06.md:28`), with the 750.00 ₼ note and a pointer to Əmr 2's Sabun line (A-07); Fəvvarələr's parts in
    `İlk auditdə` (`BRIEFS/TASK-06.md:10`); Nərimanov's total and «Artıq» part in `İlk auditdə`
    (`BRIEFS/TASK-07.md:11`), its other parts «brief rəqəm vermir».
- **Task 2** (line 36): one row per screen that shows Nərimanov heykəli's September counts. Find the screens from the
  code (§5: the dashboard, the object page, the order page, and any other page that shows `missingPriceLabel` /
  `internalSupplyLabel` counts for an object and month). The protocol requires the list of screens (§6.3, "hər ekranda").
  Then one row for the supplier "Daxili: Azpetrol baza" on the order page.
- **Task 3** (line 37): (1) 27 objects (the Obyektlər page); (2) "24 / 27" (the dashboard, September); (3) Çadır
  «Sistemdə hələ sifarişi yoxdur» (the dashboard and the monthly report); (4) full names (`BRIEFS/TASK-05.md:55`);
  (5) the order: «brief sıralama qaydasını vermir» — the operator writes the order seen.
- **The first audit's good points** (line 38), five rows: «Niyə dəyişib?» adds up (point to the Task 1c «Cəmi» rows
  instead of repeating: "E-NN ilə eyni", naming them); the compact product line; the "Son 9 ayın 3-də…" line in the
  «Məhsul tarixçəsi» window; 12 months on one screen (the monthly report at 1366; `BRIEFS/TASK-08.md:23`, `:52`); «Qaralama»
  appears nowhere (the operator writes every screen of this audit where a draft's word was seen; §6.1 item 7).

The report lists how the brief's samples map to E rows (§11).

### 6.4 Section F — the approval flow, sandbox (protocol §6.4; `TASK-15a.md` §4.3 F)

Every F row: `Harada: sınaq · … · http://localhost:5174`, and `Addımlar` begins with "`04-sandbox.md` §1-in üç
yoxlaması". The steps themselves are not repeated: each row names the «Sınaq 1» steps that carry it, following the
closing table of `04-sandbox.md` (its row «Protokol §6.4, altı addım»):

| ID | Protocol §6.4 | `04-sandbox.md` |
|---|---|---|
| F-01 | 1. the order is sent | Sınaq 1: the order the reset left (§5.4), and addım 2 (Sınaq obyekti 2 sent by hand) |
| F-02 | 2. it appears in «Təsdiq gözləyənlər» | Sınaq 1, addım 1 and 3 |
| F-03 | 3. the Rəhbər reviews it | Sınaq 1, addım 4 |
| F-04 | 4. «Düzəliş tələb et», with a reason | Sınaq 1, addım 5 |
| F-05 | 5. the sender corrects and sends again | Sınaq 1, addım 6 |
| F-06 | 6. the Rəhbər approves | Sınaq 1, addım 7 |
| F-07 | 4.2 — an empty reason is refused | Sınaq 1, addım 5 (first half) |
| F-08 | 4.3 — `sinaq.admin` cannot approve | Sınaq 1, addım 3 |
| F-09 | the whole flow at 390 × 844 | Sınaq 2 |

- F-01 … F-06 each carry the four facts under `Göründü:` (`04-sandbox.md`, Sınaq 1, «Hər addımda yazılacaq dörd
  fakt»): «Göndərən» / «Göndərilib»; «Göndəriş»; «Əvvəlki düzəliş səbəbi»; «Təsdiqləyən» / «Təsdiq tarixi». Their
  `Gözlənilən` takes what `04-sandbox.md` says at that step, citing it.
- F-09 carries, under `Göründü:`, the three observations of Sınaq 2, addım 2.
- Brief 04's acceptance bullets and decisions 4.1 … 4.3a are **not** F rows: they are C and D rows (15a4, 15a5), which
  point to the same steps. Sınaq 1, addım 8 (4.1) is therefore not in F.

### 6.5 Section G — the click count (protocol §6.5; `TASK-15a.md` §4.3 G)

Two rows, both at 1366 × 768, `Hökm` «sayıldı»:

- **G-01 — K1, real data.** From İdarəetmə paneli as it opens after the Rəhbər logs in, to Heydər Əliyev Mərkəzi's
  September order page, with three things read: the total, the change against «Keçən ay», and the main cause's product
  name in «Niyə dəyişib?». The count ends when the last of the three is read (protocol §6.5).
  - `Addımlar`: state, from the code, the basis and the month the dashboard opens with (§5), and so whether choosing
    «Keçən ay» and September are part of the count. Give the shortest way the code offers from the dashboard to that
    order (the card or the table row; cite it), as a *possible* path. The operator counts the path actually taken.
  - Under `Göründü:`: `  - 1:` … `  - 12:` blank lines, each to be written as `klik` or `sürüşdürmə` and what it was,
    with "lazım olsa sətir əlavə edin"; then `  - Cəmi: … klik · … sürüşdürmə`.
- **G-02 — K2, sandbox.** The walk is `04-sandbox.md`, Sınaq 1, addım 7; this row is its count sheet (the same form).
  From İdarəetmə paneli after `sinaq.rehber` logs in, to the approval, with the facts of protocol §6.4 read on the way.
- `İlk auditdə` in both: "3 klik + 3 sürüşdürmə" (`BRIEFS/TASK-15.md:48`), and the sentence that the first audit's path
  is not known, so this is not a like-for-like comparison (`README.md` §8, third item). No path is attributed to the
  first audit.

### 6.6 Section H — widths (protocol §6.6; `TASK-15a.md` §4.3 H)

One row per screen per width, real data, the Rəhbər's account, September 2026, «Keçən ay» unless the screen has no
basis:

- **1366 and 1440**, each screen of the scenario: İdarəetmə paneli; Aylıq hesabat; Obyektlər; Heydər Əliyev Mərkəzi's
  object page; its September order page; the «Məhsul tarixçəsi» window opened from that page; Təsdiq gözləyənlər;
  Təchizatçılar; Qiymət təsnifatı. Eighteen rows.
- **390 and 1200** (1200 stands for 1150–1279, protocol §10 A3): İdarəetmə paneli, Aylıq hesabat, the order page, the
  object page. Eight rows.
- Under `Göründü:` in every H row: `  - Üfüqi sürüşdürmə:`; `  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:`;
  `  - Qeyd olunan başqa şey:`. These are observations, not rules; the verdict is the operator's and 15b explains it.
- `Gözlənilən`: a brief line only where one speaks to that screen and width — `BRIEFS/TASK-08.md:52` (the 12-month
  table at 1200), `BRIEFS/TASK-08.md:23`; for 390, point to the C rows of brief 12 ("C bölməsində Task 12-nin sətirləri",
  since their IDs do not exist yet) and to «Sınaq 2» for the sandbox side. Elsewhere «brief rəqəm vermir».
- Widths are set as `01-hazirliq.md` §6 says.

### 6.7 Section I — carried items (protocol §3; `TASK-15a.md` §4.3 I)

One row per item of `TASKS/TASK-15.md:110–125`, and for the 16b technical words one row per word (seven). So twelve
rows. `Hökm`: «hələ var / artıq yoxdur». `Mənbə` quotes the protocol line and names the accepted task that carried it
(`PLAN.md` entry or `REVIEWS/…` as the protocol cites it). `Harada`, per §3.2:

- the seven words: sınaq, `sinaq.koordinator`, the import screens during «Sınaq 3» (name the addım where the screen that
  holds the word is on view). For each word, `Grep` the frontend once and name the component and line where it appears.
  If a word is not in the code, the row still stands and says «kodda tapılmadı: <Grep nümunəsi>»; the operator still
  looks;
- the two button wordings: sınaq, «Sınaq 3», addım 6 and addım 12–13, each wording with its source line;
- the NotRequired dialog: sınaq, «Sınaq 3», addım 5, read before «Təsdiq et»; quote the dialog's text from
  `SuppliersPage.tsx:258–261` in `Gözlənilən` without judging it;
- product codes and sheet:row on Qiymət təsnifatı: real, Rəhbər, `/pricing-modes`; name the table columns from the code;
- HEM September «Keçən ay» +23,852.70: real, Rəhbər, the order page; `Gözlənilən` +23,852.70 (`BRIEFS/TASK-13.md:46`);
  under `Göründü:` `  - Əmr 2-nin Sabun sətri (A-07):`;
- the phone check at 390 × 844: points to the H rows at 390 (by ID) and to F-09.

Every sandbox step here only reads. The sandbox's writes stay in `04-sandbox.md`; nothing in section I adds one.

### 6.8 Section J — the end state (protocol §9 item 11; `TASK-15a.md` §4.3 J)

Each row has `  - Başlanğıcla eynidir: bəli / xeyr` under `Göründü:` and points to the A row it compares with.

| ID | Row | Where it points |
|---|---|---|
| J-01 | Əmr 1, end run, and `Compare-Object` with the start run | `03-emrler.md` §2, Əmr 1, §4.5; compares with A-06 |
| J-02 | Əmr 2, the same | Əmr 2, §4.5; A-07 |
| J-03 | Əmr 3, the same | Əmr 3, §4.5; A-08 |
| J-04 | Əmr 4, the same — the audit's own proof that it changed nothing | Əmr 4, §4.5; A-09 |
| J-05 | Qiymət təsnifatı's three totals, read again by the Rəhbər | A-10, A-11, A-12 |
| J-06 | The import batches, read again | `03-emrler.md` §5.1; A-13 |
| J-07 | `git rev-parse HEAD`, `git status --short`, `git diff --stat 7550eda HEAD` | protocol §9 item 11; A-02 |
| J-08 | Cleaning up: the sandbox reset, the trimmed workbook copy deleted, the temporary output files deleted | `04-sandbox.md`, «Hər seansdan sonra və audit bitəndə»; `03-emrler.md` §7 |

J-01 … J-06 say, quoting `03-emrler.md` §4.5: any line that differs between A and J is a protocol-§8-level fact, written
in full in `Qeyd`, whatever it is. J-07's `Gözlənilən`: beyond the untracked workflow files, only `docs/audits/`
(`neticeler.md`, `ekranlar/`) — protocol §9 item 11.

### 6.9 Section K — new findings (`TASK-15a.md` §4.3 K)

- One sentence: for anything no row covers; copy the block for each new finding, numbering K-02, K-03, …
- One template block, `### K-01 — <qısa başlıq>`, in the row format: `Mənbə: operatorun müşahidəsi`; `Harada:` real or
  sınaq, screen, address, width; `Addımlar:` how to get there; `Gözlənilən:` «—»; `İlk auditdə:` «—»; below the marker
  the six fields, with `Göründü:` carrying `  - Nə səhvdir:`. `Hökm: —`.
- The operator does not assign a priority or a task. 15b does (`TASK-15a.md` §4.3 K, §11 P7).
- If a finding is a write action offered to the Rəhbər on real data: do not click it; it is recorded here (protocol §8).

## 7. No suites

15a3 changes only Markdown under `docs/audits/`, so the suites are not run (`TASK-15a1.md` §7, P5). The tracked tree
outside that folder must stay byte-for-byte `e19b590`.

## 8. Out of scope

- The rows of sections B, C and D. Their headings only.
- Any change to `README.md`, `01`, `03`, `04`, `05` or `06`. If one of them is wrong in a way that affects a row, write
  the row from the code and list the difference in the report for 15a5's whole-kit check.
- Running anything in the kit: no `dotnet`, no tool, no `sandbox.ps1`, no `psql`, no `npm`, no browser.
- A verdict, a priority, a finding, an expected figure that no source gives, or a report text.
- Reconstructing anything of the 23.09.2026 audit (A2): its sections, priorities or click path.
- Editing a brief, `TASKS/`, or any tool, including the sandbox seed.

## 9. Safety and STOP conditions

STOP and report if:

- a check in sections A, E, G, H, I or J can only be done by writing to `baxorders_dev`: write it as «yoxlanıla bilmədi»
  with the reason instead, and list it;
- a row would need an admin account on real data anywhere except `01-hazirliq.md` §4 (the kit's rule, `README.md` §5):
  find a Rəhbər or sandbox way, or write «yoxlanıla bilmədi» with the reason;
- a row would send anyone to `/imports?id=6`, or to any real import batch;
- a credential, token or connection string with a password would have to be written into a file;
- the brief and the protocol disagree.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `sandbox.ps1`, `npm`, `git commit` /
`reset` / `checkout` / `push`, or an edit outside `02-yoxlama-siyahisi.md`, `AI_WORKFLOW/LAST_REPORT.md` and
`AI_WORKFLOW/STATE.json`.

## 10. Acceptance criteria

1. `02-yoxlama-siyahisi.md` exists under `docs/audits/2026-final-enver-muellim-audit/`, in Azerbaijani. No other file
   in the folder changed.
2. The preamble has the eight items of §6.1: the row format with the marker `---- operator doldurur ----` exactly, the
   section-specific rule, the verdict words, IDs and screenshots, the screens-and-routes table with a source on every
   route, the brief-words table, and the real-data safety paragraph.
3. The eleven section headings are there, in order A … K, with the names of `README.md` §3. B, C and D have nothing
   under them.
4. Section A has A-01 … A-14 with the IDs and content of §6.2. G2's four figures each have their own row. The batch
   states come from `03-emrler.md` §5.1. No row sends anyone to `/imports?id=6`. A-10 … A-12 are read by the Rəhbər.
5. Section E has a row for every sample of `BRIEFS/TASK-15.md:33–38`, each quoting it verbatim, with the Task 1c rows
   for all three orders and their amount lines. Every figure in `Gözlənilən` or `İlk auditdə` cites a brief line;
   otherwise the row says «brief rəqəm vermir» / «brief qeyd etmir».
6. Section F has F-01 … F-09 of §6.4, each sandbox, each naming its `04-sandbox.md` steps, F-01 … F-06 with the four
   facts.
7. Section G has G-01 (K1, real) and G-02 (K2, pointing to Sınaq 1, addım 7), each with a count sheet and totals, at
   1366 × 768, with the "3 + 3" statement and nothing attributed to the first audit's path.
8. Section H has 26 rows (§6.6). Section I has twelve rows (§6.7). Section J has J-01 … J-08 (§6.8), each with
   `Başlanğıcla eynidir`. Section K has the template block.
9. Every row has the twelve lines of §6.1 in order. Every route, label and step cites its frontend file and line, or a
   kit file and section. No step writes to `baxorders_dev`; every sandbox row begins with `04-sandbox.md` §1's three
   checks.
10. No file of the kit contains a password, a token, a secret's value or a connection string with a password. No `P0`
    … `P3` value is written into any row; the words appear only where the preamble tells the operator about screenshots.
11. Nothing of the first audit is reconstructed.
12. `git status --short` shows only `?? docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md` beyond the
    untracked workflow files. `git diff e19b590 --stat` is empty.

## 11. Final report (`AI_WORKFLOW/LAST_REPORT.md`)

- HEAD, `git status --short`, `git diff --stat e19b590`, and `git diff --stat 7550eda HEAD -- frontend src tools`;
- the file, with its line count and the number of rows per section;
- the A row IDs, as a list (15a5's D rows will cite them);
- the E mapping: each sample of `BRIEFS/TASK-15.md:33–38` → its row IDs, and for Task 2 the list of screens and how
  they were found;
- for G-01: the basis and month the dashboard opens with, and the possible path, with their code lines;
- for each I row: where the word or item was found in the code, or «kodda tapılmadı»;
- every §3 fact the code contradicted, and what the file follows instead; any difference found in `01`, `03`, `04` or
  `05`, for 15a5;
- a statement that nothing was run, no database was touched, and no file outside §9's list changed.

End with `READY_FOR_REVIEW`.

## 12. For the Reviewer

On acceptance, 15a3 is committed as usual. Then set `currentTask` to `15a4`, status `PLANNING`, `nextTask` `15a5`. Do not
open HD-008. For 15a4: B and C rows go directly under the existing headings, in the row format of the preamble; their
verdict words are the kit spec's («həll olunub / qismən / həll olunmayıb» for B, «keçdi / keçmədi» for C); C rows of
Task 4 point to «Sınaq 1» / «Sınaq 2» by step, following `04-sandbox.md`'s closing table.

## 13. Assumptions the Planner made

- P1. The A row IDs are fixed here (§6.2), because 15a5's D rows point to the gates and must be able to cite them.
- P2. The regression suites get no A row: the protocol gives them to the Coder (§5.3), 15a1 ran them, and 15b runs them
  again. A row the operator cannot fill would only be marked «yoxlanıla bilmədi».
- P3. G2 is read by the Rəhbər, by typing `/pricing-modes`. The route is open to every signed-in user and the page is
  read-only for them (§3.2), so the audit keeps to the Rəhbər account (`README.md` §5) and needs no admin.
- P4. The total of *all* «Alış qiyməti tələb olunur» rows, priced ones included, is recorded as «oxunmur» with its
  reason, because no screen and no command of the kit prints it. The gate's own figure (with no price) is read.
- P5. Where a section needs several figures, they are indented lines under `Göründü:`. Every row keeps the same twelve
  lines in the same order, so 15b can still read them mechanically.
- P6. Each section's `Hökm` lists only the words that make sense for it (§6.1 item 4), always with «yoxlanıla bilmədi».
  The kit spec's list is the union of these.
- P7. The brief's "Geri" is the browser's Back button: the frontend has no control of that name, and Task 1's basis
  travels in the address.
- P8. For Task 1c, "hər sətir" is read as the headline and the three largest lines of the main-cause part, for each of
  the three orders. Checking every line of three orders by hand would not fit one audit session and adds no different
  kind of evidence.
- P9. Section H is one row per screen per width (26 rows), and its three observation lines are prompts, not criteria.
  The screens at 1366 and 1440 are the nine the audit reads with the Rəhbər on real data. The sandbox screens are
  covered at 1366 and 390 by F.
- P10. The 16b technical words are read in the sandbox during «Sınaq 3», because the Rəhbər cannot open the import
  screens and no real batch may be opened.
- P11. K1's possible path is given from the code, but the operator counts the path actually taken. It is this audit's
  path, not the first audit's.
