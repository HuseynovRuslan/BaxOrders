# TASK 15a5 — YEKUN AUDİT DƏSTİ: YOXLAMA SİYAHISI — B VƏ C (`BRIEFS/TASK-10.md` … `TASK-14.md`, `TASK-16.md`), B-NİN DÖRD "XEYR" SƏTRİ, D BÖLMƏSİ VƏ BÜTÜN DƏSTİN YOXLANIŞI (Task 15a, sub-part 5 of 5)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md` (shared by every part of Task 15; there is no `TASK-15a5` brief). Sections B and C
also read `BRIEFS/TASK-10.md` … `TASK-14.md` and `TASK-16.md`, which are the owner's too: their «Auditdə müşahidə
edilən hazırkı problem» and «Acceptance — biznes dili ilə» are what the rows quote. Section D reads the closing journal
of `BRIEFS/OWNER_BRIEFS_MASTER.md` (lines 750–775) and each decision's own brief line.
Protocol: `AI_WORKFLOW/TASKS/TASK-15.md` — §6.1 (old findings and the four "Xeyr" reasons) and §6.2 (acceptance and the
owner decisions). Unchanged.
Kit specification: `AI_WORKFLOW/TASKS/TASK-15a.md` §4.3 B, C and D, and §8. Unchanged, and it still governs.
Split map: `TASK-15a4.md` §1 and §12; `PLAN.md`, "Current"; `REVIEWS/TASK-15a4.md`, "Notes".
Where this file and `TASK-15a.md` disagree, `TASK-15a.md` wins; where it and the protocol disagree, the protocol wins;
where the protocol and the brief disagree, the brief wins. In every such case: STOP and report.

Specification status: **READY.** Written by the Planner on 2026-09-25. Repository at `7a09257` (HEAD, 15a4's commit).

**Documentation only.** This part adds rows to one existing file,
`docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`, under its B, C and D headings, and changes one
example file name on one line each of `01-hazirliq.md` and `05-neticeler-qaytarilmasi.md` (§6.7). Nothing else in the
kit changes. No application code, test, style, schema, migration, tool or data change. No database command of any
kind, and no tool, script, sandbox or browser is run. This file carries no data-migration line, on purpose.

---

## 1. Place in the split

| Part | Writes | Status |
|---|---|---|
| 15a1 | `README.md`, `01`, `05`, `06`; the suites | accepted (`4023da2`) |
| 15a2 | `03-emrler.md`, `04-sandbox.md` | accepted (`e19b590`) |
| 15a3 | `02`: preamble, A, E, F, G, H, I, J, K; empty B, C, D | accepted (`282b62b`) |
| 15a4 | `02`: B-01 … B-79 and C-01 … C-34, for `BRIEFS/TASK-04.md` … `TASK-09.md` | accepted (`7a09257`) |
| **15a5 (this file)** | `02`: **B-80 … B-121** (briefs 10–14), **B-122 … B-125** (the four "Xeyr" rows), **C-35 … C-68** (briefs 10–14, 16), **D** (intro + D-01 … D-20); the screenshot-name fix in `01` and `05`; the whole-kit check | current |

This is the last kit sub-part. When the Reviewer accepts it, HD-008 opens (`TASK-15a.md` §9; §12 below).

## 2. Which acceptance criteria this part carries, and which it leaves

- **Carried here** (`TASK-15a.md` §8):
  - item 1 — the kit exists (final check over all seven files);
  - item 2 — for `BRIEFS/TASK-10.md` … `TASK-14.md` and `TASK-16.md`: every «Auditdə müşahidə edilən hazırkı problem»
    bullet (10–14) and every «Acceptance» bullet (10–14, 16) has a row, none merged away; section D has exactly 20
    rows; and the **whole-kit count** for 04–14 and 16, with section E's samples, reported in one table;
  - item 3 for every row written here;
  - item 4 for the rows written here: every write-check says *sınaq* and names its `04-sandbox.md` steps, or says
    «yoxlanıla bilmədi» with the reason `04-sandbox.md` gives; no step writes to `baxorders_dev`;
  - items 6 and 7 for the lines added, and **their whole-kit check** (every file of the kit);
  - item 8 for this part's diff.
  - Also the protocol's §6.1 requirement that "the four reasons for "Xeyr" … each get their own summary row, pointing to
    the rows above them" (`TASK-15a.md` §4.3 B, last sentence).
- **Already carried** by 15a1 … 15a4: items 2 (04–09), 3, 4, 5, 9, and 6 / 7 for their own files.
- **Left to 15b** (unchanged): the protocol's §9 items 1–11.

## 3. Verified current state (the Planner read these on 2026-09-25; the Coder confirms each at the cited lines)

### 3.1 Git and the file

- HEAD `7a09257`. `git status --short` shows only the four untracked workflow entries (`AI_WORKFLOW/`,
  `monitor-agent.ps1`, `resume-agent.ps1`, `run-agent.ps1`). `git diff --stat 7550eda HEAD -- frontend src tools` is
  empty, so the frontend the rows cite is the one at `7550eda`.
- `02-yoxlama-siyahisi.md` has 3956 lines. The anchors, **by their text** (line numbers move as rows are added):
  - B-79 ends at line 1720 (`Qeyd:`), line 1721 is blank, line 1722 is `## C. Task 04–16 qəbul şərtləri`;
  - C-34 ends at line 2321, line 2322 is blank, line 2323 is `## D. Sahibin qərarları 4.1 … 16.1`;
  - line 2324 is blank, line 2325 is `## E. Regress: Task 1–3 və ilk auditdə yaxşı olanlar`.
  D is empty: it has no introduction and no row.
- The preamble (lines 1–131) fixes the twelve-line row form (15–31), the extra `  - <ad>:` lines only under
  `Göründü:` (40–56), the verdict words (58–70: "B, C və D bölmələrinin sözləri həmin bölmələrin öz sətirlərində
  yazılıb"), IDs and screenshots (72–82), screens and routes (84–104), brief words against screen words (106–118), and
  the real-data paragraph with the `Addımlar:` openings (120–129):
  - real rows: `(Real: yalnız oxuyun; yazma düyməsini basmayın.)`
  - sandbox rows: `` `04-sandbox.md` §1-in üç yoxlaması. ``
  - mixed rows, as E-27 and C-01 do: `Harada: real və sınaq · …`, and `Addımlar:` opens with
    `` `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) ``
- B's introduction (lines 387–398) already covers briefs 04–14 and sets the defaults (real, Rəhbər, September 2026,
  «Keçən ay», 1366 × 768), the money note and `həll edən task` at the end of `Mənbə:`. C's introduction (1724–1730)
  already covers briefs 04–14 and 16. **Neither is changed.** The model rows are B-52 … B-55 (1253–1324), B-78 / B-79
  (1688–1720), C-01 (1732–1747, a mixed row) and C-33 / C-34 (2289–2321).
- Rows this part may point to, by ID (all exist): A-01, A-04, A-05, A-07, A-10 … A-14; B-01 … B-79; C-01 … C-34;
  E-01 … E-27; F-01 … F-09; H-19, H-21, H-23, H-25; I-08, I-11. H-19, H-21, H-23 and H-25 already say "C bölməsində
  Task 12-nin sətirləri": those are C-46 … C-50 below. F's introduction (2858–2859) says brief 04's criteria and
  4.1 … 4.3a are carried by C and D, and that `04-sandbox.md` Sınaq 1, addım 8 (decision 4.1) is not in F.

### 3.2 The sandbox side

`04-sandbox.md` «Yekun cədvəl» (lines 538–579) already maps every write-check this part needs. The rows follow it
exactly:

- brief 13's acceptance 1–8 and decisions 13.1, 13.1a, 13.2 → Sınaq 4 (lines 424–505), steps as at lines 560–570;
- brief 16's acceptance 1–5 and decision 16.1 → Sınaq 3 (lines 233–420), steps as at lines 571–577;
- decisions 4.1, 4.2, 4.3, 4.3a → Sınaq 1 (lines 106–216), as at lines 554–557;
- Sınaq 2 (lines 220–229) is the phone flow (F-09).
- If Sınaq 3's import is not ready, Sınaq 5 (lines 509–535) lists exactly which checks become «yoxlanıla bilmədi» and
  which can still be read. Every row that depends on Sınaq 3 or 4 names Sınaq 5 as its fallback.
- Sınaq 4, addım 5 (lines 489–496) already gives the exact «yoxlanıla bilmədi» reason for "15 W" / "15W".

`03-emrler.md`, Əmr 2 (lines 207–243) is the real-data read of Task 13: the `Yazılış fərqi (SameItem)` and
`Variant fərqi (Variant)` suggestion blocks, `ProductMatchDecisions: exists, N row(s)`, the Sabun lines, the
`YES — …` / `NO.` line, and HEM September «Keçən ay». A-07 records it. The rows cite A-07, never run the tool.

### 3.3 Facts from the code the rows need (`frontend/bax-orders-web/src/`)

**Task 10 — the order page's list and the history window**

- «Əsas dəyişikliklər» is `components/decisions/DriverList.tsx` (heading :78). Its scope line is `driverScopeLine`
  (`components/decisions/labels.ts`:155–163): "Bu sifarişdə N məhsul var, müqayisə bazası ilə birlikdə M. «Hamısı»
  onlardan dəyişən K məhsulu sayır." Under it, `productStateLine` (:170–181), the up / down / service counts.
- The chips: `driverFilterLabels` (`labels.ts`:126–134): «Hamısı», «Qiymət dəyişən», «Miqdar dəyişən», «Yeni
  məhsullar», «Bu ay yazılmayan məhsullar», «Qiymət yoxdur», «Məbləği dəyişməyən». A chip with 0 is hidden
  (`DriverList.tsx`:84–86). «Hamısına bax (N)» expands the list (:155–165).
- A mixed row: the pill «Miqdar və qiymət» (`labels.ts`:90–97), and under the figures the split "Miqdar +160,00 ₼ ·
  Qiymət +7,00 ₼", each part in its own direction's colour (`DriverList.tsx`:256–272; `labels.ts`:102–104). The compact
  line "20 → 40 ədəd · Qiymət 4,00 → 4,00 ₼" stays (:170–236). The row's money is coloured by 9.1 (:139–148).
- A row opens «Məhsul tarixçəsi» (`DriverList.tsx`:120–123; `pages/OrderDetailPage.tsx`:515–534).
- The window (`components/analytics/TrendModal.tsx`): title «Məhsul tarixçəsi» (:115); the supplier line (:128;
  `components/analytics/trend.ts`:176–191, "Təchizatçı: …" or "Təchizatçı (Ay): …"); the ratio line (:130–132, :358–359;
  `trend.ts`:155–174, "<baza>: 30 ədəd · bu ay: 40 ədəd — 1,3×", with the basis the order page uses, passed in at
  `OrderDetailPage.tsx`:523–531); the frequency block "Son 9 ayın 3-də sifariş edilib" with «İlk sifariş», «Son
  sifariş», «Tipik interval» (:293–322; `trend.ts`:52–69); the tabs «Miqdar», «Məbləğ», «Orta qiymət» (:143–160;
  `trend.ts`:22–26); the table with a «Təchizatçı» column (:176–223); the folded «Mənbə və versiya məlumatı»
  (:225–250).
- The chart (`components/analytics/TrendChart.tsx`): `type="linear"`, gaps not bridged (:81–92); every month named,
  `interval={0}` and full month names (:58–68; `trend.ts`:71–79); the value axis from zero to a round number above the
  data, whole-number steps when every quantity is whole (:69–77; `trend.ts`:81–123).
- The window locks the page behind it (`components/imports/review/Modal.tsx`:15–31).

**Task 11 — «Obyektlər» and the object page**

- «Obyektlər» (`pages/LocationsPage.tsx`): the «Dəyişmə» column's heading carries its basis as a caption,
  `describeBasisCaption('PreviousMonth', [])` (:121–128); its figures are coloured by 9.1 with a direction word
  (:186–196).
- The object page (`pages/LocationDetailPage.tsx`) reads the basis from the address (`useBasis`, :47). «Müqayisə et»
  opens the latest order with the basis (:143–153); each row's «Sifarişə bax» and «Müqayisə» open that row's order with
  the basis (:320–334). The lifetime line starts «Bütün tarixçə (…):» (:176–207; `terminology/terms.ts`:197–199); the
  rows carry their own counts (:300–308).
- The top card (`components/locations/LocationTrend.tsx`): «Son sifariş · <ay>» and the latest order's two counts,
  "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1" (:186–205); the basis picker and the «Müqayisə:» line
  with the difference (:104–113, :150–184); the month strip, full month names and each month's amount (:115–145).
- The comparison page is gone. Its old address `/locations/<nömrə>/analytics` redirects to the object page and keeps
  the basis (`App.tsx`:46–48, 81–84). The object page's comparison line is the order page's own answer: it calls the
  same endpoint (`LocationDetailPage.tsx`:91–119).
- On the dashboard, an object with no order this month is listed under its group in the exceptions block, «Sifariş
  qeydə alınmayıb» (`coverage/labels.ts`:32), and its name links to the object page with the reader's basis
  (`components/dashboard/DashboardSummary.tsx`:337–365, the link at :351–356). A card for such an object opens the
  object page too (`components/dashboard/AttentionSection.tsx`:222).

**Task 12 — phone**

- The header's title is one line on every width: `truncate text-xs … sm:text-sm` (`layout/Header.tsx`:21–23).
- «Aylıq hesabat» below 1024 px is `MonthlyReportYearList` (`components/reports/MonthlyReportTable.tsx`:447–453); the
  table is `hidden lg:block` (:84).
- The order lines below 1024 px are cards (`pages/OrderDetailPage.tsx`:352–353, 459–481; `LineCard` :652).
- Below 1024 px the order page reads headline → analysis → decision (`OrderDetailPage.tsx`:217–305: `order-1`,
  `order-2`, `order-3`), and the decision buttons are a bar fixed to the bottom
  (`components/workflow/WorkflowPanel.tsx`:108–114).
- ⓘ opens on a click, a tap or the keyboard, never on hover, and closes on scroll or resize
  (`components/analytics/InfoHint.tsx`:14–23, 77–80). Two ⓘ on the dashboard: each exceptions group's heading
  (`DashboardSummary.tsx`:346) and the attention section's percent hint (`AttentionSection.tsx`:99–104).

**Task 13 — product matches**

- «Məhsullar» has three tabs: «Təkliflər», «Məhsullar və variantlar», «Qərarlar»
  (`components/catalog/matches/labels.ts`:21–25). The text "Bu bölmə hələ hazırlanır" is nowhere in the application
  code (`Grep` finds it only in `pages/ProductsPage.test.tsx`:224, which asserts its absence).
- «Variant dəyişib» (`terminology/terms.ts`:248); the line "Sabun elano — variant dəyişib: adi → lavanda ətirli"
  (:271–279).

**Task 14 — the menu**

- The menu is `layout/navigation.ts`:26–41. For a Rəhbər it shows «İdarəetmə paneli», «Aylıq hesabat», «Təsdiq
  gözləyənlər», «Obyektlər», «Təchizatçılar». «Excel importları» needs `canManageImports` (:33), «Məhsullar» and «Qiymət
  təsnifatı» `canManageCatalog` (:37, :39), «İstifadəçilər» `canManageUsers` (:40). An admin sees all nine.
- Typing `/imports`, `/admin/users` or `/products` without the permission shows «Bu səhifəyə icazəniz yoxdur.»
  (`auth/RequireAuth.tsx`:36–53; `App.tsx`:49–54, 61–67).
- The header shows the signed-in person's name and role (`layout/CurrentUserMenu.tsx`:22–23); the role words are
  «Koordinator», «Rəhbər», «Administrator» (`auth/labels.ts`:3–7).
- «Təchizatçılar» without `canManageCatalog`: the note «Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz
  yoxdur.» (`pages/SuppliersPage.tsx`:83–87; `auth/labels.ts`:31) and no «Dəyiş» (:176–183).
- The price warning's «Qiymət təsnifatına bax» (`components/decisions/DecisionHeadline.tsx`:83–94) opens
  `/pricing-modes?order=…`; there the same note shows (`pages/PricingModeReviewPage.tsx`:139–143) and no decision
  button (:219).

## 4. Working rules for this session. They are the fix, not advice.

1. **Read only what §5 lists**, at the line ranges given. Do not open `LOGS/`, `REVIEWS/`, any `tools/` project, the
   backend, `BRIEFS/TASK-04.md` … `TASK-09.md`, or the rest of `OWNER_BRIEFS_MASTER.md`.
2. **Write as you go, in this order, one `Edit` per group:** B-80 … B-89; B-90 … B-101; B-102 … B-108; B-109 … B-115;
   B-116 … B-121; B-122 … B-125; C-35 … C-40; C-41 … C-45; C-46 … C-50; C-51 … C-58; C-59 … C-63; C-64 … C-68; D's
   introduction and D-01 … D-10; D-11 … D-20; then §6.7; then the whole-kit check (§7).
3. **Anchor every insertion on the next heading's text, not on a line number.** B rows are inserted directly above
   `## C. Task 04–16 qəbul şərtləri`; C rows directly above `## D. Sahibin qərarları 4.1 … 16.1`; D's introduction
   and rows directly above `## E. Regress: Task 1–3 və ilk auditdə yaxşı olanlar`. Each group goes below the one before
   it. Keep one blank line between rows and one blank line before the next heading. Never leave half a row. If the
   session is cut off, what is written stands, and the report says where it stopped.
4. **Search narrowly.** `Grep` with a pattern and a path; `Read` with a line range. One `Grep` per label. If a label is
   not found, write the step from the brief's words and add «kodda tapılmadı: <nümunə>» in `Addımlar:`.
5. The facts in §3 were checked by the Planner. Confirm each at its cited lines rather than re-deriving it. If one is
   wrong, follow the code, write the row from the code, and say so in the report.
6. **Rows that repeat another row's reading point to it** ("B-80 ilə eyni", "C-07-də oxunur", "F-09-un hökmünü
   köçürün"), as C-33 and B-78 do. The row still stands, with its own quote, its own `Gözlənilən` and its own verdict.

## 5. Reading list

- `AI_WORKFLOW/BRIEFS/TASK-10.md` … `TASK-14.md` and `TASK-16.md`, all of each (about 280 lines together);
  `BRIEFS/TASK-15.md`, lines 6–11 and 22–29.
- `AI_WORKFLOW/BRIEFS/OWNER_BRIEFS_MASTER.md`, lines 750–775 only (the journal).
- `AI_WORKFLOW/TASKS/TASK-15.md` §6.1–§6.2 (lines 218–258).
- `02-yoxlama-siyahisi.md`: 1–131 (the preamble); 385–399 (B's introduction and B-01's heading); 1253–1324 (B-52 …
  B-55); 1688–1747 (B-78, B-79, the C heading and introduction, C-01); 2289–2346 (C-33, C-34, the D and E headings, E's
  introduction); 2847–2860 (F's introduction); the headings of every section by `Grep` `^## |^### [A-K]-`.
- `04-sandbox.md`: 1–44 (the three checks); 106–216 (Sınaq 1, for steps 3, 5, 7 and 8); 220–229 (Sınaq 2); 233–505
  (Sınaq 3 and 4); 509–535 (Sınaq 5); 538–579 («Yekun cədvəl»).
- `03-emrler.md`: 207–243 (Əmr 2).
- `01-hazirliq.md`: 244–254 (§7); `05-neticeler-qaytarilmasi.md`: 14–19 (§2).
- Frontend (`frontend/bax-orders-web/src/`), by `Grep` or short reads, only for the §3.3 facts and the labels a row
  names: `components/decisions/DriverList.tsx`, `components/decisions/labels.ts`:90–181,
  `components/analytics/TrendModal.tsx`:100–322, `components/analytics/TrendChart.tsx`, `components/analytics/trend.ts`:
  15–191, `components/imports/review/Modal.tsx`:1–35, `pages/LocationsPage.tsx`:100–200, `pages/LocationDetailPage.tsx`:
  40–340, `components/locations/LocationTrend.tsx`:70–210, `App.tsx`, `layout/Header.tsx`, `layout/navigation.ts`,
  `layout/CurrentUserMenu.tsx`, `auth/RequireAuth.tsx`, `auth/labels.ts`, `components/analytics/InfoHint.tsx`:1–100,
  `components/dashboard/DashboardSummary.tsx`:320–370, `components/workflow/WorkflowPanel.tsx`:100–140,
  `components/reports/MonthlyReportTable.tsx` (by `Grep`), `pages/OrderDetailPage.tsx`:180–310, 450–535, 640–660,
  `pages/SuppliersPage.tsx`:70–190, `pages/PricingModeReviewPage.tsx`:130–225, `components/decisions/DecisionHeadline.tsx`
  (by `Grep`), `components/catalog/matches/labels.ts`:1–70, `terminology/terms.ts`:140–290.

## 6. What the Coder writes

In Azerbaijani, in plain business words; command lines, file paths, URLs, user names, screen labels and tool output stay
as they are. Every route, label and step cites the frontend file and line, or the kit file and section, or the row it
points to. The row form is the preamble's twelve lines, exactly as B-01 … C-34 use it.

### 6.1 Every B row (B-80 … B-121)

As `TASK-15a4.md` §6.2 defines it, unchanged:

- `### B-NN — Task NN: <qısa başlıq>`.
- `Mənbə:` `` `BRIEFS/TASK-NN.md`, «Auditdə müşahidə edilən hazırkı problem», sətir L, sitat: "<the bullet, verbatim>" ``,
  then `· həll edən task: Task NN`, plus any task that brief's «Out of scope» names for part of the finding, with the
  line (§6.4 names them). A sub-heading of the brief (brief 10's «"Əsas dəyişikliklər" siyahısı», «Məhsul tarixçəsi
  pəncərəsi»; brief 11's «Obyektlər siyahısı», «Obyekt səhifəsi», «Obyekt müqayisə səhifəsi ("Müqayisə et")») goes
  before the line number, as brief 05's did in 15a4. A sub-bullet is quoted as its own bullet, with its lead named in
  brackets, as B-54 does. A bullet split into findings or examples is quoted whole in every one of its rows.
- `Gözlənilən:` what the same brief's «İstədiyim nəticə», «Qəbul edilmiş qərarlar», «Mütləq qorunmalı davranışlar» or
  «Acceptance» says must be seen now, quoted with its line. A figure only from a brief line or an accepted record the
  row cites (`AI_WORKFLOW/PLAN.md`, Task 13a, for the real suggestion counts). Code facts are marked "koddan" with file
  and line. Where no line gives a figure: «brief rəqəm vermir».
- `İlk auditdə:` the figure or words the bullet records, quoted with its line. Never «brief qeyd etmir» in B.
- Under `Göründü:` at least `  - Bu gün görünən:`, and the extra lines §6.4 names.
- `Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)`.

### 6.2 The four "Xeyr" rows (B-122 … B-125)

Directly after B-121, still above the C heading. One row per reason of `BRIEFS/TASK-15.md` lines 8–11:

- `### B-12N — Task 15: «Xeyr» səbəbi N — <qısa başlıq>`.
- `Mənbə:` `` `BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», sətir L, sitat: "<the bullet, verbatim>" ``,
  then `· həll edən task:` in the bullet's own words (for example «Task 1, 1b, 1c, 3»), and the protocol's reading
  where it adds one (reason 2: protocol §1, "the classification work (now Tasks 16a/16b)").
- `Harada: — · bu bölmə və göstərilən sətirlər · — · —`.
- `Addımlar:` no opening reminder (the row reads nothing itself, as A-14). "Ayrıca addım yoxdur." Then the rows the
  reason rests on (below), and the rule for `Hökm:`: all of them
  «keçdi» or «həll olunub» → «həll olunub»; none of them → «həll olunmayıb»; otherwise «qismən». A row marked
  «yoxlanıla bilmədi» counts as not passed and is named in `Qeyd:`; if every row is «yoxlanıla bilmədi», the verdict is
  «yoxlanıla bilmədi». 15b checks the rows again.
- `Gözlənilən:` "brief rəqəm vermir"; and what the rows' own sources say, in one sentence, citing them by ID.
- `İlk auditdə:` the bullet itself, with its line, and the first audit's verdict: "İlk auditin yekun cavabı "Xeyr" idi."
  (`BRIEFS/TASK-15.md`:7).
- `Göründü:` one `  - <IDs> (<task>)-in hökmləri:` line per group below, then `  - «keçdi» / «həll olunub» olmayan
  sətirlər (ID və hökm):`.

| ID | Line | Reason | Rests on (groups, one `Göründü` line each) |
|---|---|---|---|
| B-122 | 8 | rəqəmlər ekranlar arasında sabit deyildi — Task 1, 1b, 1c, 3 | E-01 … E-02 (Task 1); E-03 … E-05 (Task 1b); E-06 … E-11 (Task 1c); E-18 … E-22 (Task 3) |
| B-123 | 9 | qiymət xəbərdarlıqları etibarsız idi — Task 2 və təsnifat işi | E-12 … E-17 (Task 2); A-10 … A-12 (G2); C-64 … C-68 (Task 16) |
| B-124 | 10 | təsdiq addımı yoxlanılmamışdı — Task 4 | B-01 … B-05; C-01 … C-07; F-01 … F-09 |
| B-125 | 11 | əsas səbəb mal adı ilə deyilmirdi — Task 7 | B-52 … B-55; C-18 … C-20 |

### 6.3 Every C row (C-35 … C-68)

As `TASK-15a4.md` §6.3 defines it, unchanged: `### C-NN — Task NN: <qısa başlıq>`; `Mənbə:` quotes the «Acceptance —
biznes dili ilə» bullet verbatim with its line; `Gözlənilən:` the bullet's own figure or wording, and a supporting line
of the same brief where it needs one; for a sandbox row also what `04-sandbox.md` says at the step, cited;
`İlk auditdə:` the matching first-audit text of the same brief, quoted with its line, and its B row, otherwise «brief
qeyd etmir»; `Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)`.

- For brief 16, `İlk auditdə:` is «brief qeyd etmir — brief 16-nın tapıntıları ilk auditdən deyil: "Bu problem əsas
  auditdə deyil, Task 2-dən sonra aşkarlanıb" (`BRIEFS/TASK-16.md`:7)».
- Every row that depends on Sınaq 3 or 4 adds to `Addımlar:` the fallback: «Sınaq 3-ün importu hazır olmasa:
  `04-sandbox.md`, Sınaq 5 — bu sətir (və ya onun sınaq hissəsi) «yoxlanıla bilmədi»». Where Sınaq 5, 3-cü addım says
  a part can still be read (brief 16 bullets 1 and 5's review screens; brief 13 bullet 6), the row says so.

### 6.4 The rows, with their IDs

"Real", "Sınaq" and "Qarışıq" as `TASK-15a4.md` §6.4 uses them (§3.1 above). "→" names the rows a row points to.
`Göründü` names the extra lines. Line numbers are those of the brief file. Figures in these tables are the briefs'; the
Coder quotes them from the brief lines, not from this table.

#### B — `BRIEFS/TASK-10.md` (lines 7–21) — real, «Keçən ay»

Line 9 has two sub-bullets (10, 11) and line 19 two (20, 21); each is its own row. `həll edən task: Task 10`; for B-81
also `obyekt müqayisə səhifəsi Task 11-də birləşdirilir (`BRIEFS/TASK-10.md`:50)`.

| ID | Line | Row | Where; points to | Gözlənilən; Göründü |
|---|---|---|---|---|
| B-80 | 8 | yalnız «Miqdar təsiri» nişanı; Zibil paketi (Fəvvarələr) +167.00 = 160 + 7 | Fəvvarələr meydanı Sentyabr 2026, «Əsas dəyişikliklər», Zibil paketi's row (use «Hamısına bax» if it is not among the first rows) | `:24`; koddan the pill and the split (§3.3). `Göründü`: `  - Nişan:`, `  - Miqdar / qiymət sətri:`, `  - Bölgü sətri (Miqdar … · Qiymət …):`; → C-35 |
| B-81 | 10 (under 9) | HEM Sentyabr: sifariş səhifəsi "Yeni 58 / Hamısı 113", müqayisə səhifəsi "Yeni 60 / 119 mövqe" | HEM Sentyabr 2026 order: the «Yeni məhsullar» and «Hamısı» chips, the scope line and the state line (§3.3); then type the old address `/locations/<HEM-in nömrəsi>/analytics` (the number from the object page's address) and write where it lands | `:26`, `:50`; `BRIEFS/TASK-11.md`:26, 29; koddan the redirect. `Göründü`: `  - «Yeni məhsullar» çipi:`, `  - «Hamısı» çipi:`, `  - Əhatə sətri:`, `  - Köhnə ünvan hara açıldı:`; → C-37 |
| B-82 | 11 (under 9) | Fəvvarələr: "Hamısı 100", sifarişdə 76 sətir; izah yoxdur | Fəvvarələr Sentyabr 2026 order: the «Hamısı» chip and the scope line | `:26`. `Göründü`: `  - «Hamısı» çipi:`, `  - Əhatə sətri, sözbəsöz:`; → C-37 |
| B-83 | 14 | qrafik əyri xətlə | «Məhsul tarixçəsi» of HEM's Traktor qazonbiçən RT-6127.1 ZL (opened from its row) and of Şampun qab (B-85) | `:28`; koddan `TrendChart.tsx`:81–92; → C-38 |
| B-84 | 15 | ədəd oxu 0.25 addımla — Traktor | HEM Sentyabr 2026, Traktor's history, «Miqdar» tab: the axis labels | `:29`. `Göründü`: `  - Oxun rəqəmləri:`; → C-39 |
| B-85 | 16 | X oxunda Avqust yoxdur — Şampun qab (İyul 40, Avqust 20, Sentyabr 40) | the brief names no object: look for "Şampun qab" in the September orders of HEM, Fəvvarələr and Nərimanov (the order page's «Məhsul adı…» search, `pages/OrderDetailPage.tsx`:311–325, filters only the lines table and writes nothing; the list row opens the history); write where it was found, or «yoxlanıla bilmədi (mal tapılmadı)» | `:30`. `Göründü`: `  - Harada tapıldı (obyekt, ay):`, `  - Oxdakı aylar:`; → C-38 |
| B-86 | 17 | «Orta qiymət» xətti yuxarı kənara yapışır | the same two histories, «Orta qiymət» tab | `:31`; koddan `trend.ts`:98–104 |
| B-87 | 18 | pəncərədə sürüşdürəndə arxa səhifə də sürüşür | any history window: scroll inside it, then close it, and write whether the page behind moved | `:32`; koddan `Modal.tsx`:15–31; → C-40 |
| B-88 | 20 (under 19) | miqdar nisbəti yoxdur ("orta 30 ədəd, bu ay 40 — 1.3×") | a history opened from a row with both quantities above 0 (the row shows "N → M"); then change the basis to «Son 3 ayın ortalaması» on the order page, reopen, and write the line again | `:33` ("seçilmiş bazaya görə"); koddan `trend.ts`:155–174. `Göründü`: `  - «Keçən ay» ilə nisbət sətri:`, `  - «Son 3 ayın ortalaması» ilə nisbət sətri:` |
| B-89 | 21 (under 19) | təchizatçı yoxdur (21,900 ₼-lıq traktor) | Traktor's history: the supplier line and the table's «Təchizatçı» column | `:33`; koddan `trend.ts`:176–191, `TrendModal.tsx`:187, 214–216; → C-39 |

#### B — `BRIEFS/TASK-11.md` (lines 7–19) — real

Lines 8, 11 and 17 each name several findings; each finding is its own row. `həll edən task: Task 11`.

| ID | Line | Row | Where; points to | Gözlənilən; Göründü |
|---|---|---|---|---|
| B-90 | 8 | «Dəyişmə» rəngsizdir | «Obyektlər», the «Dəyişmə» column: an increase and a decrease, their colour and direction word | `:22`, `:36` (9.1); koddan `LocationsPage.tsx`:186–196; → C-44 |
| B-91 | 8 | «Dəyişmə»-nin nəyə görə hesablandığı yazılmır | the same column's heading and the caption under it | `:22`; koddan `:121–128`; → C-44 |
| B-92 | 11 | mini qrafikdə "İyu İyu" (Nərimanov heykəli) | Nərimanov heykəlinin obyekt səhifəsi, the month strip of the top card | `:23`. `Göründü`: `  - Aylar, soldan sağa:`; → C-41 |
| B-93 | 11 | sütunlarda rəqəm yoxdur | the same strip: the amount under each month | `:23`; → C-41 |
| B-94 | 12 | baza itir: sifarişi olmayan obyekt | İdarəetmə paneli, basis «Son 3 ayın ortalaması»; in the exceptions block, «Sifariş qeydə alınmayıb», the name of Puşkin parkı (→ E-04; `DashboardSummary.tsx`:337–365); on the object page write the basis picker's selection and the address's `basis=`. If a card for such an object exists, its «Detallara bax» may be used instead (`AttentionSection.tsx`:222); write which | `:24`, `:34`; → C-42 |
| B-95 | 13 | Nərimanov: yalnız "Qiymət yoxdur 1", daxili təminat sayı görünmür | Nərimanov's object page: the top card's counts, the «Bütün tarixçə» line, the Sentyabr 2026 row | `:25`, `:32` ("Nərimanov, Sentyabr — 1 / 1"). `Göründü`: one line for each of the three places; → E-15, C-43 |
| B-96 | 14 | HEM "15" bütün tarixçəyə aiddir, yazılmır | HEM's object page: the «Bütün tarixçə (…):» line and its «Qiymət yoxdur» figure | `:25`; today's figure «brief rəqəm vermir»; koddan `LocationDetailPage.tsx`:176–186; → C-43 |
| B-97 | 17 | müqayisə səhifəsinin siyahısı əlifba sırasıdır (418 Sprinkler, A4 kağız…) | type the old address `/locations/<HEM-in nömrəsi>/analytics` and write where it lands; then HEM Sentyabr 2026 order's «Əsas dəyişikliklər»: the first three rows and their money | `:26`; `BRIEFS/TASK-10.md`:43 ("Siyahı təsirin böyüklüyünə görə sıralanır"); → B-53, C-45 |
| B-98 | 17 | fərq pulla yox, miqdarla | the same list: each row's money on the right (`DriverList.tsx`:134–148) | `:26`, `:29`; → C-45 |
| B-99 | 17 | səhifə Excel təsiri bağışlayır | whether any screen still opens a separate comparison table: the old address, «Müqayisə et», a row's «Müqayisə» | `:26`; → C-45 |
| B-100 | 18 | rəhbər hansı səhifəyə baxmalı olduğunu bilmir | HEM's object page: where «Müqayisə et» and a row's «Müqayisə» lead | `:27`; → C-45 |
| B-101 | 19 | müqayisə səhifəsi ayrı qayda ilə hesablayır | HEM's object page, «Keçən ay»: the «Müqayisə:» line's difference; then HEM Sentyabr 2026 order, same basis: «Fərq» (`DecisionHeadline.tsx`:131). Write both | `:4` ("eyni bazada və eyni rəqəmlərlə"), `:26`; koddan `LocationDetailPage.tsx`:91–119. `Göründü`: `  - Obyekt səhifəsində fərq:`, `  - Sifariş səhifəsində «Fərq»:` |

#### B — `BRIEFS/TASK-12.md` (lines 7–12) — real, 390 × 844 unless said

Line 7 is the lead ("Telefon eni 390px ilə:"). Lines 11 and 12 each name two findings. `həll edən task: Task 12`; for
B-102 also `məbləğin ₼-dan ayrılmaması və "Server işləyir" Task 05 (`BRIEFS/TASK-12.md`:30)`; for B-105 and B-106 also
`qərar panelinin məzmunu Task 04 (`BRIEFS/TASK-12.md`:31)`.

| ID | Line | Row | Where; points to | Gözlənilən; Göründü |
|---|---|---|---|---|
| B-102 | 8 | başlıq "Material sifarişlərinin idarə edilməsi" 3 sətrə sınır | the header, on İdarəetmə paneli | `:15`; koddan `Header.tsx`:21–23. `Göründü`: `  - Neçə sətir:`; → H-19, C-46 |
| B-103 | 9 | aylıq hesabat yalnız bir ayı göstərir | «Aylıq hesabat»: HEM's months, as the phone list shows them | `:16`. `Göründü`: `  - HEM-in görünən ayları:`; → H-21, C-47 |
| B-104 | 10 | sətirlər cədvəli 810px, yana sürüşdürmə | HEM Sentyabr 2026 order, «Sətirlər» | `:17`. `Göründü`: `  - Yana sürüşdürmə lazımdır (bəli / xeyr):`; → H-23, C-48 |
| B-105 | 11 | qərar paneli «Niyə dəyişib?»-dən əvvəl gəlir | HEM Sentyabr 2026 order: the blocks from the top, in order (headline, «Niyə dəyişib?», «Əsas dəyişikliklər», the decision panel). Do not press any button in it | `:18` ("nə olub → niyə → qərar"). `Göründü`: `  - Blokların sırası:`; the sandbox flow → F-09 |
| B-106 | 11 | qərar düymələri ekranın altında sabit deyil | **sınaq**: `04-sandbox.md`, Sınaq 2, addım 2 (→ F-09) | `:18`; koddan `WorkflowPanel.tsx`:108–114; → C-49 |
| B-107 | 12 | ⓘ toxunanda açılmır | İdarəetmə paneli: tap an ⓘ of the exceptions block (`DashboardSummary.tsx`:346) or of the attention section (`AttentionSection.tsx`:99–104). In the device toolbar a click is a tap. It writes nothing | `:19`. `Göründü`: `  - Hansı ⓘ:`, `  - Açıldı (bəli / xeyr):`; → C-50 |
| B-108 | 12 | masaüstündə klik də heç nə açmır | the same ⓘ at 1366 × 768, clicked with the mouse | `:19`; koddan `InfoHint.tsx`:14–23. `Göründü` as B-107 |

#### B — `BRIEFS/TASK-13.md` (lines 7–12)

Line 7 is the lead ("Heydər Əliyev Mərkəzi, Sentyabr 2026:") of lines 8–10. Line 11 names three examples of spelling
difference; each is a row. `həll edən task: Task 13`; for B-115 also `menyuda "Məhsullar"-ın kimə görünməsi Task 14
(`BRIEFS/TASK-13.md`:36)`.

| ID | Line | Row | Where; points to | Gözlənilən; Göründü |
|---|---|---|---|---|
| B-109 | 8 (under 7) | "Sabun elano" "artıq sifariş olunmur": 60 → 0, 12.50 ₼, −750.00 ₼ | real: HEM Sentyabr 2026, «Keçən ay», «Əsas dəyişikliklər» under «Bu ay yazılmayan məhsullar»: the Sabun elano row; and whether the real Sabun link is approved (A-07) | `:20`, `:43` (until approved, two rows); koddan «Variant dəyişib» (`terms.ts`:248). `Göründü`: `  - Sətir (nişan, miqdar, məbləğ):`, `  - A-07-yə görə Sabun əlaqəsi təsdiqlənib (bəli / xeyr):`; → C-54 |
| B-110 | 9 (under 7) | "Sabun elano lavanda ətirli" "yeni": +750.00 ₼ | real: the same list, under «Yeni məhsullar» | as B-109; → C-54 |
| B-111 | 10 (under 7) | əlaqə yoxdur; «Niyə dəyişib?»-də hər iki hissə 750 ₼ artır | qarışıq: real — A-07's `YES — …` / `NO.` line, and HEM's «Niyə dəyişib?» «Yeni məhsullar» and «Bu ay yazılmayan məhsullar» amounts; sınaq — `04-sandbox.md`, Sınaq 4, addım 1–4 (→ C-51, C-53) | `:15–17`, `:42`. `Göründü`: `  - A-07: Sabun cütü təklif olunur:`, `  - Real: iki hissənin məbləği:`, `  - C-51-in və C-53-ün hökmləri:` |
| B-112 | 11 | yazılış fərqi — boşluq fərqi | qarışıq: real — A-07's `Yazılış fərqi (SameItem)` block: is there a pair differing only by a space; sınaq — Sınaq 4, addım 2 (the «Yazılış fərqi» list) | `:16`; for comparison, Task 13a recorded 1 «Yazılış fərqi» suggestion on the real data (`AI_WORKFLOW/PLAN.md`, Task 13a; `03-emrler.md`, Əmr 2, «Hara gedir») — then, not now. `Göründü`: `  - Real (A-07), belə cüt:`, `  - Sınaq (Sınaq 4, addım 2):` |
| B-113 | 11 | yazılış fərqi — "15 W" / "15W" | as B-112 | as B-112; also: Task 13a found no real «15 W» / «15W» pair (`AI_WORKFLOW/PLAN.md`, Task 13a); → C-55 |
| B-114 | 11 | yazılış fərqi — "3/4" / "3\4" | as B-112 | as B-112 |
| B-115 | 12 | Məhsullar səhifəsində "Bu bölmə hələ hazırlanır" | qarışıq: real — the Rəhbər's menu has no «Məhsullar», and `/products` typed shows «Bu səhifəyə icazəniz yoxdur.» (→ B-119); sınaq — Sınaq 4, addım 2: `sinaq.koordinator` opens «Məhsullar»; write its tabs and whether "Bu bölmə hələ hazırlanır" appears | `:15–19`; `BRIEFS/TASK-14.md`:16 ("Boş ("hazırlanır") bölmə heç kimə göstərilmir. Task 13 onu məzmunla dolduranda admin görür."); koddan the tabs (§3.3). `Göründü`: `  - Real, Rəhbər:`, `  - Sınaq, tablar:`, `  - "hazırlanır" mətni (var / yox):` |

#### B — `BRIEFS/TASK-14.md` (lines 7–9) — real, the Rəhbər

Line 8 names three sections and line 9 two; each is a row. `həll edən task: Task 14`; for B-116 also `Rəhbər rolunun
yaradılması Task 04 (`BRIEFS/TASK-14.md`:30)`.

| ID | Line | Row | Where; points to | Gözlənilən; Göründü |
|---|---|---|---|---|
| B-116 | 7 | audit "Administrator" hesabı ilə aparıldı; rəhbər hesabı yoxlanmadı | the header after the Rəhbər logs in: name and role (`CurrentUserMenu.tsx`:22–23); → A-04 | `:12`, `:34` (second sentence). `Göründü`: `  - Başlıqda ad və rol:`, `  - A-04-ün hökmü:`; → C-59 |
| B-117 | 8 | menyuda "Excel importları" | the menu's items | `:13`, `:17`. `Göründü`: `  - Menyu, yuxarıdan aşağı:`; → C-59, C-62 |
| B-118 | 8 | menyuda "İstifadəçilər" | the menu | as B-117 |
| B-119 | 8 | menyuda "Məhsullar"; açılanda "Bu bölmə hələ hazırlanır" | the menu; then type `/products` and write what shows | `:16`, `:17`; the "hazırlanır" part → B-115 |
| B-120 | 9 | menyuda "Qiymət təsnifatı" | the menu; the read-only way in from a price warning → C-61 | `:14`, `:20` (14.1) |
| B-121 | 9 | menyuda "Təchizatçılar" | the menu; the page is read-only → C-60 | `:13`, `:20` |

#### C — `BRIEFS/TASK-10.md` (lines 53–58) — real, «Keçən ay»

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-35 | 53 | Zibil paketi: miqdar və qiymət payı ayrıca | → B-80. `Gözlənilən` adds `:24` |
| C-36 | 54 | Nitroamafoska +870 qırmızı, Yay ayaqqabısı −1,988 yaşıl | Yay ayaqqabısı: Fəvvarələr Sentyabr 2026 «Əsas dəyişikliklər» (the product is in that order: B-54, B-17). Nitroamafoska: the brief names no object; search as B-85 and write where it was found, or «yoxlanıla bilmədi (mal tapılmadı)» for that half. `Göründü`: one line per product: object, money, colour |
| C-37 | 55 | HEM: "yeni məhsul" sayı sifariş və müqayisə səhifəsində eyni; «Hamısı» izah olunub | → B-81. `Gözlənilən` adds `:50` and `BRIEFS/TASK-11.md`:26, 29: the comparison page is merged into the order page, so one count remains; the row asks for that count, the scope line, and where the old address lands |
| C-38 | 56 | Şampun qab: oxda Avqust, düz xətlər | → B-85, B-83 |
| C-39 | 57 | Traktor: ox 0 və 1, təchizatçı yazılıb | → B-84, B-89 |
| C-40 | 58 | pəncərəni sürüşdürəndə arxa səhifə tərpənmir | → B-87 |

#### C — `BRIEFS/TASK-11.md` (lines 48–52) — real

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-41 | 48 | Nərimanov: ay adları təkrarlanmır; sütunlarda məbləğ | → B-92, B-93 |
| C-42 | 49 | paneldə «Son 3 ay» → sifarişi olmayan obyekt → obyekt səhifəsi də «Son 3 ay» | → B-94 |
| C-43 | 50 | Nərimanov "Qiymət yoxdur 1 · Daxili təminat 1"; HEM-də "15"-in bütün tarixçəyə aid olduğu yazılıb | → B-95, B-96, E-15. `Göründü`: one line for each half |
| C-44 | 51 | Obyektlər: dəyişmə xərcin istiqamətinə görə rəngli, bazası yazılıb | → B-90, B-91 |
| C-45 | 52 | ayrıca müqayisə səhifəsi yoxdur; «Müqayisə» həmin sifarişin təhlilini açır, baza saxlanılır | HEM's object page: choose «Son 3 ayın ortalaması» in the top card's picker; in the Sentyabr 2026 row press «Müqayisə» (`LocationDetailPage.tsx`:320–334); on the order page write the selected basis and the address's `basis=`; → B-97 … B-101. `Göründü`: `  - Köhnə ünvan (B-97):`, `  - «Müqayisə» hara açdı:`, `  - Sifariş səhifəsində baza:` |

#### C — `BRIEFS/TASK-12.md` (lines 35–39)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-46 | 35 | telefonda başlıq bir sətir; Task 5-in məbləğ qaydası işləyir | real, 390 × 844: → B-102, and the money half → C-10 (15a4's row, which reads 1366 and 390). `Göründü`: one line each |
| C-47 | 36 | telefonda obyektin 12 aylıq gedişatı | real, 390: → B-103, H-21 |
| C-48 | 37 | sətirlər yana sürüşdürmədən oxunur | real, 390: → B-104, H-23 |
| C-49 | 38 | Task 4-ün test sifarişi telefonda: təhlil, düymələr ekranın altında | sınaq: `04-sandbox.md`, Sınaq 2, addım 2 (→ F-09). `Gözlənilən` quotes Sınaq 2, addım 2's first bullet |
| C-50 | 39 | ⓘ-yə toxunanda izah açılır | real, 390: → B-107 |

#### C — `BRIEFS/TASK-13.md` (lines 40–47), following `04-sandbox.md` «Yekun cədvəl» (lines 560–567)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-51 | 40 | Sabun lavanda "Sabun elano"-nun variantı kimi təklif olunur; sistem özü heç nə etmir | qarışıq: sınaq — Sınaq 4, addım 1 and 2 («Təkliflər», «Qərarlar» empty); real — A-07's `YES — …` / `NO.` line and `ProductMatchDecisions` count |
| C-52 | 41 | admin təsdiqindən sonra ayrı variantlar, bir mala birləşmir | sınaq: Sınaq 4, addım 3 |
| C-53 | 42 | bir «variant dəyişib» sətri, 0.00 ₼; iki hissənin hər biri 750.00 ₼ azalır | sınaq: Sınaq 4, addım 4 against addım 1. If A-07 says the real Sabun link is approved, also read HEM Sentyabr 2026 on the real system (read-only) under `  - Real (yalnız A-07 «təsdiqlənib» deyirsə):`; this makes the row mixed |
| C-54 | 43 | təsdiqə qədər iki mal ayrı sətirlərdə | qarışıq: sınaq — Sınaq 4, addım 1; real — B-109, B-110 (if the real link is not approved) |
| C-55 | 44 | "15 W" / "15W" təsdiqindən sonra tarixçədə bir mal | sınaq: Sınaq 4, addım 5; if no «Yazılış fərqi» suggestion appeared, the reason exactly as `04-sandbox.md`:495–496 gives it |
| C-56 | 45 | Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm | qarışıq: sınaq — Sınaq 4, addım 1 (menu, `/products`); real — B-119 |
| C-57 | 46 | heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir (HEM, Keçən ay: +23,852.70) | qarışıq: sınaq — Sınaq 4, addım 1, 4, 6 ("dəyişmir", not "+23,852.70", `04-sandbox.md`:435–437); real — I-11 (+23,852.70) |
| C-58 | 47 | səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır | sınaq: Sınaq 4, addım 6 |

#### C — `BRIEFS/TASK-14.md` (lines 34–38)

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-59 | 34 | Rəhbər menyusunda yalnız beş bölmə; başlıqda "Administrator" yox | real: → A-04, B-116 … B-121. `Göründü`: `  - Menyu, yuxarıdan aşağı:`, `  - Başlıqda ad və rol:` |
| C-60 | 35 | Təchizatçılarda heç nəyi dəyişə bilmirəm | real: «Təchizatçılar»: the read-only note and whether any «Dəyiş» or other write button shows; press none |
| C-61 | 36 | sifarişdəki qiymət xəbərdarlığından Qiymət təsnifatını açıram, amma dəyişə bilmirəm | real: Nərimanov heykəli Sentyabr 2026 order (it has an unpriced line, → E-16): «Qiymət təsnifatına bax»; on the page write the address (with `?order=`), the read-only note, and whether any decision button shows |
| C-62 | 37 | Excel importlarının və İstifadəçilərin linkini əllə yazsam da açılmır | real: type `/imports` and `/admin/users` (never `/imports?id=…`, `03-emrler.md`, 5.1) and write what shows |
| C-63 | 38 | admin: bütün bölmələr əvvəlki kimi; təsdiq səlahiyyəti yoxdursa təsdiqləyə bilmir | sınaq: `sinaq.admin` at `04-sandbox.md`, Sınaq 1, addım 3 — write the menu's items while logged in there (a read); the approval half → F-08, C-05. No admin account on real data |

#### C — `BRIEFS/TASK-16.md` (lines 36–40), following `04-sandbox.md` «Yekun cədvəl» (lines 571–575) — sınaq

| ID | Line | Row | Where; points to |
|---|---|---|---|
| C-64 | 36 | test mühitində import edəndə yoxlama "N sətirdə qiymət yoxdur" deyir | Sınaq 3, addım 4. Readable even if Sınaq 5 applies (`04-sandbox.md`:527–528) |
| C-65 | 37 | yoxlamada təsnif edilənlər seçilən vəziyyətlə; qalanları «Təsnif edilməyib»; saylar dəqiq tutur | Sınaq 3, addım 6, 7, 8, 9, 10. `Göründü`: `  - Təsnif edilən sətirlər (addım 6):`, `  - Ə-U / Ə-P / Ə-D (addım 7):`, `  - M / U / D (addım 8):`, `  - Nəticə paneli (addım 9):`, `  - Sonrakı üç cəm və hesab (addım 10):` |
| C-66 | 38 | import zamanı verilən təsnifatı sonradan dəyişə bilirəm | Sınaq 3, addım 12 |
| C-67 | 39 | heç bir sətir mənbəyə görə avtomatik təsnif olunmur | Sınaq 3, addım 5 and 11 |
| C-68 | 40 | import ekranında və qalan ekranlarda eyni sözlər | Sınaq 3, addım 13; the two button wordings are also I-08: copy I-08's verdict. The review screens are readable even if Sınaq 5 applies (`04-sandbox.md`:529) |

### 6.5 Section D — introduction and rows

Under `## D. Sahibin qərarları 4.1 … 16.1`, an introduction of at most eight lines, then D-01 … D-20. It says:

1. What D is: each of the twenty decisions of the closing journal of `BRIEFS/OWNER_BRIEFS_MASTER.md` (lines 756–775),
   one row each, quoted verbatim in `Mənbə:`; `Gözlənilən:` quotes the same decision in full from its brief's «Qəbul
   edilmiş qərarlar» (protocol §6.2; `TASK-15a.md` §4.3 D).
2. The verdict words: «keçdi / keçmədi», then «yoxlanıla bilmədi (səbəb)».
3. Most rows point to the rows that already show the decision on screen; the operator copies their verdicts and then
   judges the decision itself (protocol §6.2, "may point to that row instead of repeating it").
4. A decision proven only by a write is read in the sandbox, per `04-sandbox.md` «Yekun cədvəl»; never on real data.
5. The same defaults as B.

**Every D row:**

- `### D-NN — Qərar <nömrə>: <qısa başlıq>`.
- `Mənbə:` `` `BRIEFS/OWNER_BRIEFS_MASTER.md`, «Sahibkar qərarları — jurnal», sətir L, sitat: "<the «Qərar» cell, verbatim>" ``.
- `Harada:` per the table (real / sınaq / qarışıq, with the opening of `Addımlar:` that goes with it).
- `Addımlar:` the rows to copy, and any extra reading the table names.
- `Gözlənilən:` the decision from its brief, verbatim, with the line (the table's "Brief line").
- `İlk auditdə:` as the table says: the B row and brief line it answers, or «brief qeyd etmir».
- `Göründü:` one `  - <ID>-in hökmü:` line per row pointed to, plus the extra lines the table names.
- `Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)`.

| ID | Journal line | Decision | Brief line | Kind; points to | İlk auditdə |
|---|---|---|---|---|---|
| D-01 | 756 | 4.1 | `TASK-04.md`:29 | qarışıq → C-07 (Sınaq 1, addım 8; real B-04) | B-04 (`TASK-04.md`:10) |
| D-02 | 757 | 4.2 | `TASK-04.md`:30 | sınaq → C-03, F-07 (Sınaq 1, addım 5) | brief qeyd etmir |
| D-03 | 758 | 4.3 | `TASK-04.md`:31; `TASK-14.md`:22 | sınaq → C-05, F-08 (Sınaq 1, addım 3); C-06, F-06 (addım 7); C-63 | brief qeyd etmir |
| D-04 | 759 | 4.3a | `TASK-04.md`:32; `TASK-14.md`:23 | qarışıq, not a write (`04-sandbox.md`:557): the sandbox Rəhbər exists (`sinaq.rehber`, A-05) and the real one (A-04); its menu → C-59; its approval → C-06 | B-116 (`TASK-14.md`:7) |
| D-05 | 760 | 5.1 | `TASK-05.md`:39–50; also `TASK-10.md`:39 | real → C-11, C-12, B-29 … B-36, E-25 | B-29 … B-36 (`TASK-05.md`:19) |
| D-06 | 761 | 7.1 | `TASK-07.md`:23 | real → C-18, C-19, C-20 | B-52 (`TASK-07.md`:7) |
| D-07 | 762 | 7.1a | `TASK-07.md`:24 | real → C-18, C-19, C-20; the share's wording on the card, koddan (`terminology/terms.ts`, by `Grep` for the share text, as B-52 cites :143–154) | B-52 (`TASK-07.md`:7) |
| D-08 | 763 | 8.1 | `TASK-08.md`:30 | real → C-21 | B-56 (`TASK-08.md`:7) |
| D-09 | 764 | 8.2 | `TASK-08.md`:31 | real → C-22, C-23, C-24 | B-57 (`TASK-08.md`:8) |
| D-10 | 765 | 9.1 | `TASK-09.md`:45 | real, one `Göründü` line per task that applies it: 06 → C-14, C-15; 07 → C-30 (the card's money); 08 → «Aylıq hesabat»: the legend and HEM's June cell (koddan `MonthlyReportTable.tsx`, by `Grep` `costDirection`), → C-22; 09 → C-30; 10 → C-36; 11 → C-44 | B-69 (`TASK-09.md`:13) |
| D-11 | 766 | 11.1 | `TASK-11.md`:35 | real → C-45 | B-100 (`TASK-11.md`:18) |
| D-12 | 767 | 13.1 | `TASK-13.md`:27 | sınaq → C-52 (Sınaq 4, addım 3) | brief qeyd etmir |
| D-13 | 768 | 13.1a | `TASK-13.md`:28 | sınaq → C-53 (Sınaq 4, addım 4) | B-111 (`TASK-13.md`:10) |
| D-14 | 769 | 13.2 | `TASK-13.md`:29 | qarışıq → C-56 (Rəhbər cannot), C-51 (Koordinator: Sınaq 4, addım 2), C-52 (Admin can: addım 3) | brief qeyd etmir |
| D-15 | 770 | 14.1 | `TASK-14.md`:20 | real → C-60, C-61, B-120 | B-120, B-121 (`TASK-14.md`:9) |
| D-16 | 771 | 14.2 | `TASK-14.md`:21 | real → A-04, C-59 | B-116 (`TASK-14.md`:7) |
| D-17 | 772 | 15.1 | `TASK-15.md`:27 | qarışıq → A-01 (the month; the owner's confirmation quoted there), A-05, F-01 … F-06 (the separate test order) | brief qeyd etmir |
| D-18 | 773 | 15.2 | `TASK-15.md`:28 | real → A-10, A-14 | "94 sətir təsnifatsız idi" (`TASK-15.md`:9) |
| D-19 | 774 | 15.2a | `TASK-15.md`:29 | real → A-11 | brief qeyd etmir |
| D-20 | 775 | 16.1 | `TASK-16.md`:25 | sınaq → C-65 (Sınaq 3, addım 6), C-66 (addım 12); Sınaq 5 for the part after the import (`04-sandbox.md`:520, 530) | brief qeyd etmir |

For D-05 … D-11 and D-15 … D-19, "real" means the rows they point to are real; D itself adds no step on real data
beyond D-10's reading of the report's legend and June cell.

### 6.6 Where the text goes, and what stays

- B-80 … B-125 directly above `## C. Task 04–16 qəbul şərtləri`, after B-79, in ID order.
- C-35 … C-68 directly above `## D. Sahibin qərarları 4.1 … 16.1`, after C-34, in ID order.
- D's introduction and D-01 … D-20 between `## D. …` and `## E. …`: one blank line after the D heading, one blank line
  before the E heading.
- No `---` rule is added after B, C or D; the file has none there (`TASK-15a4.md` §6.1).
- Nothing else in `02-yoxlama-siyahisi.md` changes: not the preamble, not A, not B-01 … B-79 or their introduction, not
  C-01 … C-34 or theirs, not E … K. H-19, H-21, H-23 and H-25 keep their words; C-46 … C-50 are the rows they mean.

### 6.7 The screenshot-name fix (`REVIEWS/TASK-15a3.md`, `REVIEWS/TASK-15a4.md`, "Notes")

The example screenshot name is still the one from before 15a3 fixed the A IDs. Change only the file name, nothing
else on the line:

- `01-hazirliq.md`, §7 (line 249): `A-02-qiymet-tesnifati-1366.png` → `A-10-qiymet-tesnifati-1366.png`;
- `05-neticeler-qaytarilmasi.md`, §2 (line 17): the same.

`A-02` as an example **ID** (`01-hazirliq.md`:247; `README.md`:59) stays: it is a real ID. The preamble
(`02-yoxlama-siyahisi.md`:75) already says `A-10-…`.

## 7. The whole-kit check (`TASK-15a.md` §8 items 1, 2, 3, 6, 7)

After §6, with `Grep` and `Read` only, over the whole folder. Nothing is fixed here beyond §6.7: a problem found
outside this part's rows is listed in the report for the Reviewer, not edited.

1. **The kit exists.** The seven files of `TASK-15a.md` §8 item 1 are there, in Azerbaijani; their line counts.
2. **Coverage, counted, whole kit.** One table: for each of briefs 04–14 the number of «Auditdə müşahidə edilən
   hazırkı problem» bullets and their B rows; for each of briefs 04–14 and 16 the number of «Acceptance» bullets and
   their C rows. Counted from the `Mənbə:` lines by `Grep` (`BRIEFS/TASK-NN.md`, «…», sətir L), not copied from
   15a4's report. Expected: B 79 + 42 = 121 per-brief rows, plus B-122 … B-125; C 34 + 34 = 68; D 20; E-01 … E-27 cover
   every sample of `BRIEFS/TASK-15.md` lines 33–38.
3. **Form, whole file.** Headings `^### X-NN — ` for every section in sequence, no gap and no repeat (A-01 … A-14,
   B-01 … B-125, C-01 … C-68, D-01 … D-20, E-01 … E-27, F-01 … F-09, G-01 … G-02, H-01 … H-26, I-01 … I-12,
   J-01 … J-08, K-01). The marker `---- operator doldurur ----` occurs once per row plus the preamble's example. Each
   section's rows carry its verdict words (preamble table; B, C, D in their own rows).
4. **No secrets, whole kit.** `Grep` for `password`, `Password=`, `parol`, `token`, `Host=`, `Server=`,
   `BAXORDERS_SANDBOX_PASSWORD` in all seven files. List every match with its line, and say why it is allowed (a
   warning, an environment-variable name, a placeholder). None may be a value.
5. **Nothing of the first audit reconstructed, whole kit.** `Grep` `\bP[0-3]\b` and «20 bölmə» in all seven files. Every
   match must be the protocol's own scale or the §0.1 text (`README.md` §8, `06-hesabat-skeleti.md`, the preamble's
   note that the operator writes no priority). No row carries a priority value. The §0.1 text is in `README.md` §8 and
   in the skeleton's section 1.
6. **No real write.** No row outside a sandbox row, and no sandbox row outside `04-sandbox.md`'s steps, asks for a write;
   no row sends anyone to `/imports?id=`; no row needs an admin account on real data except A-04.

## 8. No suites

15a5 changes only Markdown under `docs/audits/`, so the suites are not run (`TASK-15a1.md` §7). The tracked tree
outside that folder must stay byte-for-byte `7a09257`.

## 9. Out of scope

- Any change to the preamble, to A, to B-01 … B-79, C-01 … C-34, E … K, or to `README.md`, `03`, `04` or `06`; and to
  `01` and `05` beyond §6.7. If one of them is wrong in a way that affects a row, write the row from the code and list
  the difference in the report. (Known and left: `DashboardSummary.tsx`:215 cited in B-34, B-71 and C-11 is the doc
  comment; the filter is at :226 — `REVIEWS/TASK-15a4.md`, "Notes". Not fixed here.)
- Running anything in the kit: no `dotnet`, no tool, no `sandbox.ps1`, no `psql`, no `npm`, no browser.
- A verdict, a priority, a finding, an expected figure no brief line or accepted record gives, or a report text.
- Reconstructing anything of the 23.09.2026 audit (A2) beyond what the briefs' own bullets record.
- Editing a brief, `TASKS/`, or any tool, including the sandbox seed.
- Opening HD-008 or writing anything for 15b. That is the Reviewer's step (§12).

## 10. Safety and STOP conditions

STOP and report if:

- a check can only be done by writing to `baxorders_dev`: write it as «yoxlanıla bilmədi» with the reason, and list it;
- a row would need an admin or coordinator account on real data anywhere except A-04's (`01-hazirliq.md`, §4): use the
  sandbox's account and the `04-sandbox.md` step, or write «yoxlanıla bilmədi» with the reason;
- a row would send anyone to `/imports?id=…` on the real system, or to any real import batch;
- a bullet of briefs 10–14 or 16, or a decision of the journal, cannot be turned into a check at all: write the row
  anyway, with «yoxlanıla bilmədi» and the reason, and list it. Never drop it;
- a credential, token or connection string with a password would have to be written into a file;
- the brief and the protocol disagree.

Never: `psql`, `pg_dump`, `pg_restore`, `dotnet ef`, `dotnet run` of anything, `sandbox.ps1`, `npm`, `git commit` /
`reset` / `checkout` / `push`, or an edit outside `02-yoxlama-siyahisi.md`, the one line each of `01-hazirliq.md` and
`05-neticeler-qaytarilmasi.md` (§6.7), `AI_WORKFLOW/LAST_REPORT.md` and `AI_WORKFLOW/STATE.json`.

## 11. Acceptance criteria

1. `02-yoxlama-siyahisi.md` gains B-80 … B-125 between B-79 and the C heading, C-35 … C-68 between C-34 and the D
   heading, and D's introduction and D-01 … D-20 between the D and E headings. `git diff 7a09257 --` of the file shows
   only added lines, all in those three places.
2. `01-hazirliq.md` and `05-neticeler-qaytarilmasi.md` each differ from `7a09257` by exactly the one file name of §6.7.
   No other file changed.
3. **Coverage, counted.** The rows carry every bullet as §6.4 maps them:
   - «Auditdə müşahidə edilən hazırkı problem»: 10 → 8 bullets with their sub-bullets / 10 rows (B-80 … B-89); 11 → 8
     bullets / 12 rows (B-90 … B-101); 12 → 5 bullets / 7 rows (B-102 … B-108); 13 → 3 bullets, line 7's three
     sub-bullets and line 11's three examples / 7 rows (B-109 … B-115); 14 → 3 bullets / 6 rows (B-116 … B-121);
   - the four "Xeyr" reasons of `BRIEFS/TASK-15.md` lines 8–11 → B-122 … B-125, each listing the rows of §6.2;
   - «Acceptance»: 10 → 6; 11 → 5; 12 → 5; 13 → 8; 14 → 5; 16 → 5 (C-35 … C-68);
   - the journal → D-01 … D-20, exactly twenty, in the journal's order.

   Every `Mənbə:` quotes its bullet or journal cell verbatim with its line number.
4. Every row has the preamble's twelve lines in order, with the marker exactly, and extra lines only under
   `Göründü:`. B rows' `Hökm:` is «həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)»; C and D rows'
   is «keçdi / keçmədi / yoxlanıla bilmədi (səbəb)».
5. Every B row names `həll edən task`, and its `İlk auditdə:` quotes its bullet's figure or words. Every figure in
   `Gözlənilən` or `İlk auditdə` cites a brief line or the accepted record named in §6.1; otherwise «brief rəqəm
   vermir». Code facts are marked "koddan" with file and line.
6. Every real row opens `Addımlar:` with the real reminder, every sandbox row with `04-sandbox.md` §1's three checks,
   every mixed row as C-01 does; the four "Xeyr" rows have no opening, as A-14. Every sandbox row names its Sınaq and step as `04-sandbox.md` «Yekun cədvəl» maps it,
   and rows that depend on Sınaq 3 or 4 name the Sınaq 5 fallback. No step writes to `baxorders_dev`; no row points to
   `/imports?id=` on the real system; no row uses an admin account on real data.
7. No password, token, secret or connection string with a password. No `P0` … `P3` value in any row.
8. Nothing of the first audit is reconstructed beyond the briefs' own bullets: no section list, priority or click path.
9. The report carries the whole-kit check of §7, every item with its result.
10. `git status --short` shows only ` M` for `01-hazirliq.md`, `02-yoxlama-siyahisi.md` and
    `05-neticeler-qaytarilmasi.md` under `docs/audits/2026-final-enver-muellim-audit/`, beyond the untracked workflow
    files.

## 12. Final report (`AI_WORKFLOW/LAST_REPORT.md`) and the Reviewer's next step

The report:

- HEAD, `git status --short`, `git diff --stat 7a09257`, `git diff --stat 7550eda HEAD -- frontend src tools`;
- the file's new line count; rows per section (B, C, D) and per brief;
- the coverage table of §11 item 3: for each brief 10–14 and 16, each bullet's line → its row IDs; for D, each journal
  line → its row;
- the whole-kit check of §7, item by item;
- every row the Coder marked «yoxlanıla bilmədi» or told the operator when to mark so, and why;
- every label not found in the code, and every §3 fact the code contradicted, with what the file follows instead;
- anything elsewhere in the kit that a row or the check found wrong, for the Reviewer;
- a statement that nothing was run, no database was touched, and no file outside §10's list changed.

End with `READY_FOR_REVIEW`.

**For the Reviewer.** 15a5 is the last kit sub-part. On acceptance, 15a5 is committed as usual, and then `TASK-15a.md`
§9 applies, with "15a" meaning this part: set `STATE.json` to `HUMAN_REQUIRED`, `currentTask` `15b`, reason
`TASK_15_OPERATOR_RUN`; add **HD-008 — the operator runs the audit kit** to `PLAN.md`; replace `CURRENT_TASK.md` with
the operator's instructions (run `docs/audits/2026-final-enver-muellim-audit/` as its `README.md` says, fill
`neticeler.md` and `ekranlar/`, then set `STATE.json` to `PLANNING` for 15b). The Planner writes `TASKS/TASK-15b.md`
only when `neticeler.md` exists and is filled.

## 13. Assumptions the Planner made

- P1. The IDs are fixed here (§6.2, §6.4, §6.5): B-80 … B-121 for briefs 10–14, B-122 … B-125 for the four "Xeyr"
  reasons, C-35 … C-68, D-01 … D-20. The "Xeyr" rows go at the end of B because `TASK-15a.md` §4.3 B lists them after
  the per-brief rows ("Then the four "Xeyr" reasons").
- P2. As in 15a4 (its P2 and P4), a bullet that names separately observable findings or examples gets one row each:
  brief 11 lines 8 (colour; basis), 11 (month names; amounts) and 17 (alphabetical order; quantity instead of money;
  the Excel look); brief 12 lines 11 (order; fixed buttons) and 12 (tap on a phone; click on a desktop); brief 13
  line 11 (the three spelling examples); brief 14 lines 8 (three sections) and 9 (two sections). A list of parts of one
  requirement stays one row (brief 14 line 7).
- P3. A "Xeyr" row's verdict is a mechanical summary of the rows it rests on (all passed → «həll olunub», none →
  «həll olunmayıb», otherwise «qismən»), so the operator applies a rule rather than judging a reason as a whole. 15b
  checks the rows again. The rows each reason rests on are the ones the reason's own bullet names by task: reason 2's
  "təsnifat işi" is read as the protocol reads it (§1: Tasks 16a/16b), so it includes C-64 … C-68 and the G2 rows.
- P4. D rows' `İlk auditdə:` names a B row only where a first-audit finding is what the decision answers (the table's
  last column); otherwise «brief qeyd etmir». The decisions themselves are not first-audit findings.
- P5. Where a brief names no object for a product (Şampun qab, Nitroamafoska), the operator searches the three
  September orders the audit already opens, as 15a4's P7 did, and writes where it was found or «yoxlanıla bilmədi
  (mal tapılmadı)».
- P6. The retired comparison page is checked by typing its old address, which only reads (`App.tsx`:46–48, 81–84).
  Brief 10's "sifariş səhifəsində və müqayisə səhifəsində eyni" is read after 11.1: one count remains, and the row
  records it with where the old address lands. Whether that satisfies the bullet is the operator's verdict, not the
  Coder's.
- P7. Task 14's admin criterion (brief 14 line 38) is read in the sandbox with `sinaq.admin` at Sınaq 1, addım 3, since
  15a4's rule allows no admin account on real data beyond A-04.
- P8. 15a5 is one session of about 100 rows plus the check, the size of 15a4 (113 rows). Most rows point to rows or
  sandbox steps that already exist, and every row is mapped here.
