# TASK 05b — TEXNİKİ MƏLUMATLARIN RƏHBƏR GÖRÜNÜŞÜNDƏN ÇIXARILMASI (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-05.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **b of 2.** Runs only after Task 05a (`TASKS/TASK-05a.md`) is accepted and committed. It builds on 05a's
`src/terminology/` module, its unit words and its old-terms sweep test, and must not rework them; a defect found in
05a is reported, not fixed here.
Specification status: READY (queued behind 05a) — written by the Planner on 2026-09-24 from the brief and the
repository at `3d9a4ed`. Before starting, the Coder re-reads 05a's accepted code: where 05a named something
differently from what this file assumes, follow 05a's code and say so in the report. Line numbers below are at
`3d9a4ed` and will have moved.

This task changes **frontend presentation only**. It changes no figure, no API, no database, no data. There is no
`DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The brief: "Rəhbərin ekranlarında obyekt və məhsul kodları, 'Versiya' və 'Sətir sayı' görünmür: panel, aylıq
hesabat, obyektlər, sifariş, məhsul tarixçəsi. Admin ekranlarında (Qiymət təsnifatı, Excel importları) lazım
olduqca qalır." And: "Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir."
The owner brief for Task 4 adds: "Rəhbər ekranında texniki 'Versiya' sözü göstərilmir (Task 5). Versiya məlumatı
qərar panelində biznes dilində verilir." — 04a already gives the submission count in words in the panel.

Kept, by the brief: the "Mənbəyə bax" drawer as the last level, and the product history's folded "Mənbə və versiya
məlumatı" section.

## 2. Verified current behaviour (repository at `3d9a4ed`)

### 2.1 Which screens are the Rəhbər's

The Rəhbər role (`Manager`) reaches, per `App.tsx` and `layout/navigation.ts`: the dashboard (`/dashboard`), the
monthly report (`/dashboard/monthly`), "Təsdiq gözləyənlər" (`/approvals`), the objects list (`/locations`), an
object (`/locations/:id`), the object comparison page (`/locations/:id/analytics`), an order (`/orders/:id`) and, from
the order and comparison pages, the product history modal (`TrendModal`). The Rəhbər cannot create or edit a
correction: `RevisionPermissions.MayRevise` (`src/BaxOrders.Application/Orders/Revisions/RevisionPermissions.cs:18–23`)
is Coordinator or Admin only, so the "create correction" button and the line edit/add/remove dialogs are never
rendered for them.

### 2.2 Object codes (LOC-…)

- Dashboard table and phone cards: `components/dashboard/LocationRows.tsx:86,186`.
- Objects list: `pages/LocationsPage.tsx:152`.
- Object page header: `pages/LocationDetailPage.tsx:66` — `description = code (· deaktiv)`.
- Monthly report: `components/reports/MonthlyReportTable.tsx:99` (tooltip "name · code"), `:258`.
- Inbox: `components/approvals/ApprovalRows.tsx:112` (table), `:140` (card: "code · month · Versiya N").
- Search placeholders that invite a code: `ManagementDashboardPage.tsx:240`, `MonthlyReportPage.tsx:106`,
  `LocationsPage.tsx:96`, `ApprovalInboxPage.tsx:174`, `OrderDetailPage.tsx:294` ("Məhsul adı, kodu və ya model…"),
  `LocationAnalyticsPage.tsx:253` ("Məhsul, kod və ya model üzrə axtar").

### 2.3 Product codes (PRD-…) and meaningless codes under a product name

- Order lines: `OrderDetailPage.tsx:366` prints `productCode` under the name; `:370` prints `model {modelCode}`;
  the "Spesifikasiya" column prints `formatItemSpecification(item)` — a specification value with no unit and no
  descriptor is printed bare.
- Correction history on the order page: `components/orders/revision/EditHistory.tsx:38` prints `productCode`.
- The line under a product name in `DriverList.tsx:106`, `ComparisonRows.tsx:200` and the `TrendModal` subtitle
  (`TrendModal.tsx:92`) is `formatVariantLine` (`analytics/labels.ts:123–133`): specification (value + unit or
  descriptor, or the **bare value**), then **`modelCode`**, then the order unit. That is where "2.8" (a bare
  specification value), "20078331" and "M-101-S-2" (model codes) appear under Rosmarinus, Columbus 80 BM 100 Şotka
  and Yay ayaqqabısı.
- Administrator screens show product codes on purpose: `ProductCategoryRows.tsx:48,71`,
  `AssignCategoryDialog.tsx:63`, `PricingModeReviewPage.tsx:411`, the import screens.

### 2.4 "Versiya" and "versiya"

| Where | Text |
|---|---|
| `OrderDetailPage.tsx:183` | header description `Sentyabr 2026 · Versiya 2` |
| `OrderDetailPage.tsx:262–265` | `Bu, bu ayın ən son versiyası deyil. Rəqəmlər açdığınız versiyaya aiddir. Versiya N-ə bax` |
| `RevisionPanel.tsx:46–47,55–56,60,70,99` | "Düzəliş versiyası", "Versiya 2 · Versiya 1 əsasında", "Versiya 2 · <status>", "Versiya 1 əsasında yaradılıb", "Əvvəlki versiyaya bax", "Versiya 1 baxılmış versiyadır …" — shown to every reader of a correction or of a corrected order |
| `orders/revision/labels.ts:6` | `openRevisionLabel = 'Düzəliş versiyasına bax'` (a link every reader sees) |
| `orders/revision/labels.ts:39`, `EditHistory.tsx:19` | "Versiya yaradıldı", "Bu versiyada hələ düzəliş edilməyib." (the order page's correction history) |
| `WorkflowPanel.tsx:165` | "Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu versiyada aparılmır: yeni versiya yaradılır." (04a left it to Task 5) |
| `workflow/labels.ts:137–138`, `orders/revision/labels.ts:23–24`, `approvals/labels.ts:72` | own-contribution notes "Bu versiyada düzəliş etdiyiniz üçün …" |
| `ApprovalRows.tsx:100,115,140,204` | "Dövr / Versiya", "· Versiya N", "· V1 düzəlişi" |
| `approvals/labels.ts:35` | revision filter "Düzəliş versiyası" |
| `AnalyticsSummary.tsx:131,154` | "Versiya N · status", "Mart 2026 — Versiya 1" |
| `TrendChart.tsx:96` | tooltip row "Versiya" |
| `LocationDetailPage.tsx:158,189` | column "Versiya", cell "Versiya N" |
| `TrendModal.tsx:195–219` | folded "Mənbə və versiya məlumatı" — **kept** (brief) |
| `ItemSourceDrawer.tsx:124–133` | "Sətrin keçdiyi versiyalar", "Versiya N" — the "Mənbəyə bax" drawer, **kept** (brief) |
| `orders/revision/labels.ts:4,5,10,18`, `RevisionPanel.tsx:153,179–180` | "Düzəliş versiyası yarat", create-dialog texts, remove-line explanation — rendered only for Coordinator/Admin (2.1) |
| `ImportGroupsTable.tsx:46`, `ConfirmationDialog.tsx:178–250` | import screens — administrator, **kept** |

### 2.5 Line counts as a standalone figure

- `LocationDetailPage.tsx:159,190` — column "Sətir sayı"; `:95` — fact "Sətirlər: N".
- `WorkflowDialog.tsx:106` — fact "Sətir sayı" in the decision dialog.
- `TrendChart.tsx:89` — tooltip row "Sətir".
- `dashboard/labels.ts:62` — `sortLabels.CurrentItemCount = 'Sətir sayı'` (no importer at `3d9a4ed`).
- 05a already removed the "N sətir" totals that doubled the word next to "N sətirdə qiymət yoxdur".

### 2.6 Rows of the same month on the object page

`LocationDetailPage` lists every request of the object, and a month can have more than one (a correction, or a
second import). Today the "Versiya" column is what tells them apart. `LocationOrderHistoryEntry` carries `version`
but no "is correction" flag (`api/orders.ts:70–81`).

---

## 3. Scope

In scope:

- A. no object code, product code or model code on the Rəhbər's screens; useful specification kept;
- B. no "Versiya"/"versiya" text on the Rəhbər's screens, replaced by business words where the information matters;
- C. no "Sətir sayı" / standalone line-count figure on the Rəhbər's screens;
- D. search placeholders that do not invite a code;
- E. tests, extending 05a's old-terms sweep.

"The Rəhbər's screens" are those of 2.1, **as a Rəhbər-role user sees them**. Controls rendered only for a
Coordinator or Administrator on those pages (create-correction button and dialog, line edit/add/remove dialogs, the
remove-line explanation) keep their wording in this task; the report lists them for Task 14.

Out of scope: everything of 05a; administrator screens (Qiymət təsnifatı, kateqoriyalar, Excel importları,
İstifadəçilər, Təchizatçılar — supplier codes are not in the brief); the "Mənbəyə bax" drawer; TrendModal's folded
section; mobile layout (Task 12); menus (Task 14); variant merging (Task 13).

## 4. Required behaviour

### 4.1 Object codes (A)

Remove the `locationCode` / `code` line or fragment at every place in 2.2. The object page header description becomes
`Deaktiv` when the object is inactive and is absent otherwise. The monthly report tooltip is the name alone (or
removed). The inbox card's subtitle is the month alone.

### 4.2 Product codes, model codes and the specification (A)

Add to `analytics/labels.ts` (next to `formatVariantLine`, which stays for any administrator use) one function for the
Rəhbər's screens:

```ts
/** "5 litr · ədəd", "28 diş · ədəd", "ədəd", "Vahidsiz" — no product code, no model code, no bare number. */
export function describeVariant(variant: VariantIdentity): string
```

- The specification is shown **only when it says what it measures**: its value followed by 05a's unit word, or by the
  descriptor ("28 diş"). A specification value with neither a unit nor a descriptor ("2.8") is not shown.
- The model code is never shown.
- Then the order unit word (05a's `formatOrderUnit`, "Vahidsiz" when there is none).

Use `describeVariant` in `DriverList` (line under the name), `ComparisonRows` (`Product`) and the `TrendModal`
subtitle. On the order page's lines table: remove the `productCode` line and the `model …` line; the "Spesifikasiya"
column shows the specification by the same rule (value + unit word or descriptor), else "—". In `EditHistory`, remove
the `productCode` fragment.

**Rows that would become indistinguishable.** Hiding a model code can make two rows of one list read identically
(same product name, same description). Within one rendered list — `DriverList`'s shown rows, `ComparisonRows`'
rows, the order page's current page of lines — when two or more rows have the same product name and the same
`describeVariant` text, those rows (and only those) append the hidden detail after ` · `: the model code if the row has
one, else the bare specification value. Implement it once (e.g. `distinguishVariants(rows)` returning the text per
row) and unit-test it. Every other row shows no code.

The "Mənbəyə bax" drawer keeps showing every source field, model code included.

### 4.3 "Versiya" in business language (B)

One business vocabulary, used everywhere below: a version made to correct a returned order is a **"düzəldilmiş
sifariş"**; the one it was made from is the **"əvvəlki sifariş"**; the newest of a month is the **"ən son sifariş"**.
No text a Rəhbər sees on the screens of 2.1 contains "versiya" in any case, except the two kept places.

| Where | Becomes |
|---|---|
| Order page header description | the month alone: `Sentyabr 2026` |
| Order page "not the latest" note | `Bu ay üçün bu obyektin daha yeni sifarişi var. Rəqəmlər açdığınız sifarişə aiddir.` + link `Ən son sifarişə bax` (same target) |
| `RevisionPanel` banner on a correction | title `Düzəldilmiş sifariş`, line `Düzəliş tələbindən sonra əvvəlki sifarişdən yaradılıb` |
| `RevisionPanel` "Versiya N · status" line | removed (the status is shown once, in the page header — 04a) |
| `RevisionPanel` "Versiya N əsasında yaradılıb" | removed (the banner says it) |
| `RevisionPanel` "Əvvəlki versiyaya bax" | `Əvvəlki sifarişə bax` |
| `openRevisionLabel` | `Düzəldilmiş sifarişə bax` |
| `RevisionPanel` footer note | `Əvvəlki sifariş dəyişdirilmir. Düzəlişlər bu sifarişdə aparılır.` |
| `editActionLabels.RevisionCreated` | `Düzəldilmiş sifariş yaradıldı` |
| `EditHistory` empty text | `Bu sifarişdə hələ düzəliş edilməyib.` |
| `WorkflowPanel` returned note | `Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu sifarişdə aparılmır: düzəldilmiş sifariş yaradılır.` |
| own-contribution notes (workflow, revision, approvals row) | `Bu sifarişdə düzəliş etdiyiniz üçün onu özünüz təsdiqləyə bilməzsiniz.` (row: `Bu sifarişdə düzəliş etdiyiniz üçün qərar verə bilməzsiniz.`) |
| `ApprovalRows` column "Dövr / Versiya", cell "· Versiya N", card "· Versiya N" | column `Dövr`; the month alone |
| `ApprovalRows` revision badge "Düzəliş · V1 düzəlişi" | `Düzəldilmiş sifariş`, still linking to the previous order; no version number |
| `revisionFilterLabels.Revision` "Düzəliş versiyası" | `Düzəldilmiş sifariş` |
| `AnalyticsSummary` "Versiya N · status" | the status alone |
| `AnalyticsSummary` baseline list "Mart 2026 — Versiya 1 · Sifarişə bax" | `Mart 2026 · Sifarişə bax` |
| `TrendChart` tooltip row "Versiya" | removed |
| `LocationDetailPage` column "Versiya" and its cell | removed; see 4.5 |

Kept unchanged: `TrendModal`'s folded "Mənbə və versiya məlumatı" section with its "Sətir" and "Versiya" columns;
the whole `ItemSourceDrawer`; the Coordinator/Admin-only texts of 2.4's last-but-one row; the import screens.

### 4.4 Line counts (C)

- `LocationDetailPage`: remove the "Sətir sayı" column and the "Sətirlər" fact.
- `WorkflowDialog`: remove the "Sətir sayı" fact (the dialog keeps object, month, submission count, amount and the
  missing-price count).
- `TrendChart` tooltip: remove the "Sətir" row.
- `dashboard/labels.ts` `sortLabels` (`CurrentItemCount: 'Sətir sayı'`): delete the unused map, or drop that entry.
- Kept: Task 2's sentences "N sətirdə qiymət yoxdur" and "N sətir daxili təminat (ödənişsiz)"; the order page's
  "Sətirlər" section heading and its pagination ("Səhifə 1 / 2 · 60 sətir"), which navigate the table rather than
  report a figure; TrendModal's folded section.

### 4.5 Two orders of the same month on the object page

Without the version column, rows of one month must still be told apart. Within the rows on the page, for each month
that has more than one row: the row with the highest `version` is shown as it is; every other row of that month
carries, under the month link, the grey note `Əvvəlki sifariş — sonradan yenilənib`. (Rows of one month split
across two pages are an accepted edge; the history is sorted newest first, so the newest row is on the earlier
page.)

### 4.6 Search placeholders (D)

On the Rəhbər's screens the placeholders stop inviting a code; the search itself is unchanged (it may still match
codes): dashboard and inbox → `Obyekt adı üzrə axtar`; monthly report and objects → `Obyekt adı…`; order page →
`Məhsul adı…`; comparison page → `Məhsul adı üzrə axtar`.

---

## 5. Frontend requirements — summary for the Coder

Changed (expected; the Coder searches for more): `analytics/labels.ts` (`describeVariant`, the distinguishing
helper), `analytics/{ComparisonRows,AnalyticsSummary,TrendChart,TrendModal}.tsx`, `decisions/DriverList.tsx`,
`dashboard/{LocationRows.tsx,labels.ts}`, `reports/MonthlyReportTable.tsx`, `approvals/{ApprovalRows.tsx,labels.ts}`,
`workflow/{WorkflowPanel.tsx,WorkflowDialog.tsx,labels.ts}`, `orders/revision/{RevisionPanel.tsx,EditHistory.tsx,
labels.ts}`, `pages/{OrderDetailPage,LocationDetailPage,LocationsPage,ManagementDashboardPage,MonthlyReportPage,
ApprovalInboxPage,LocationAnalyticsPage}.tsx`.

Not changed: `ItemSourceDrawer.tsx`; TrendModal's `<details>` block; `ProductCategoryRows`, `AssignCategoryDialog`,
`PricingModeReviewPage`, `SuppliersPage`, every import component; the create/edit/add/remove correction dialogs.

## 6. Backend

None. No C# change, no API contract change (the codes and versions stay in the API — administrator screens and the
drawer use them). If a requirement seems to need a backend change, **STOP** and report why.

## 7. Safety and STOP conditions

- **No database access**; do not run `psql`, `pg_dump`, `dotnet ef`, `dotnet run` or any tool.
- No data change; HD-002's 94 rows untouched.
- No figure changes; no sort, filter or search behaviour changes.
- Do not rework 05a; a defect in 05a goes into the report.
- Do not commit, push or merge; edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement cannot be met without changing an owner decision, STOP with
  `BLOCKED_HUMAN` and say which line.

## 8. Invariants — MUST NOT CHANGE

- Everything 05a delivered (words, units, format, server badge) and its words list.
- The words of `TASK-05a.md` §5.7 (Tasks 1b, 2, 3, 04a, 04b), word for word.
- "Mənbəyə bax" and its drawer; TrendModal's folded "Mənbə və versiya məlumatı".
- Every figure; Task 1's basis in the URL; Task 1b's cohort; Task 2's classifications; Task 3's catalogue and counts.
- 04a's panel and dialog structure, apart from the removed "Sətir sayı" fact and the reworded returned note.
- Administrator screens keep their codes and versions.
- No backend, schema or data change.

## 9. Acceptance criteria (this part)

1. On the dashboard (table and phone cards), the objects list, an object page, the monthly report, the inbox (table
   and cards), the order page and the comparison page, no object code (`LOC-…`) and no product code (`PRD-…`) is shown
   (brief acceptance, with 05a's "Server işləyir").
2. Under a product name no model code and no bare specification value is shown; a specification with a unit or a
   descriptor is shown ("5 litr", "50 kq", "28 diş"); two rows that would read identically are told apart by the
   hidden detail and no other row shows one.
3. No text a Rəhbər sees on those screens and in the product history contains "versiya" in any case, except the folded
   "Mənbə və versiya məlumatı" section and the "Mənbəyə bax" drawer; corrections read "Düzəldilmiş sifariş" /
   "Əvvəlki sifariş" / "Ən son sifariş".
4. "Sətir sayı" appears nowhere on those screens; the object page has no line-count column or fact; the decision
   dialog has no line-count fact.
5. Two orders of one month on the object page are distinguishable: the older one says
   "Əvvəlki sifariş — sonradan yenilənib".
6. Administrator screens still show product codes (`ProductCategoryRows`, `PricingModeReviewPage` tests unchanged and
   green); the drawer still shows the source's model code and versions.
7. All suites and both builds are green; 05a's old-terms sweep passes, extended with this part's list.

## 10. Required tests

Frontend (vitest):

- `describeVariant`: spec with unit code `L` → "5 litr · …"; with `KG` → "50 kq · …"; with descriptor → "28 diş · …";
  bare value "2.8" → not shown; model code "M-101-S-2" → not shown; no unit → "Vahidsiz".
- the distinguishing helper: two rows, same name, same description, different model codes → each shows its model
  code; one of them without a model code → it shows its bare specification value; a unique row → nothing appended.
- Extend 05a's old-terms sweep (same screens, plus the order page with a correction fixture showing `RevisionPanel`
  and the correction history, and the inbox with a revision row): fixtures carry `locationCode: 'LOC-000043'`,
  `productCode: 'PRD-000110'`, `modelCode: 'M-101-S-2'`, a bare specification `'2.8'` and `version: 2`; the rendered
  text and `aria-label`s contain none of `LOC-`, `PRD-`, `M-101-S-2`, `Sətir sayı`, and no `/versiya/i` outside the
  `<details>` of TrendModal and outside the drawer. (Where a fixture file uses `OBJ-…`, add a real-shaped code.)
- `LocationDetailPage`: no "Versiya" or "Sətir sayı" column; two rows of one month → the older carries the note.
- `OrderDetailPage` / `OrderDecisionPage` tests: header is the month alone; the latest-version note's new text and
  link; no product code or model line; the drawer (`ItemSourceDrawer`) still shows "Versiya" in its lineage.
- `ApprovalRows`: no code, no "Versiya", the revision badge "Düzəldilmiş sifariş" linking to the previous order.
- `RevisionPanel` / `OrderRevisionPage.test.tsx`: the new wording as a Rəhbər sees it; the Coordinator's create
  button keeps its label.
- `ProductCategoryRows.test.tsx`, `PricingModeReviewPage.test.tsx`: unchanged and green (codes stay there).
- Existing tests that assert a code, a "Versiya" text or "Sətir sayı" on these screens change with this task; update
  them and list each with the reason.

Backend: none; run both suites to prove nothing moved.

## 11. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (`--artifacts-path` if `bin` is locked; say so).
- `dotnet test` — unit and integration, counts unchanged from 05a's accepted numbers.
- `npx tsc -b --noEmit`, `npx vitest run`, `npm run build` — all green, with counts.
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/`.

## 12. Where the brief lands in this part

| Brief | Here |
|---|---|
| Panel, sifariş və obyekt səhifələrində heç bir LOC/PRD kodu, "Versiya" … görmürəm. | §4.1–4.3 (with 05a's "Server işləyir", the criterion is complete) |
| Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür … Admin ekranlarında lazım olduqca qalır. | §4.1–4.4, §3 (admin screens kept) |
| Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir. | §4.2 |
| Məhsul tarixçəsində "Mənbə və versiya məlumatı" bağlı bölmədə qalır. | §4.3 (kept), §8 |
| Sifariş sətirlərində "Mənbəyə bax" son səviyyə kimi qalır. | §4.2 (drawer kept), §8 |
| Heç bir rəqəm dəyişmir. | §7, §8 |
| Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb. | §8 |

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. "The Rəhbər's screens" are the pages a Rəhbər-role user reaches (2.1), the inbox and the object comparison page
   included; controls only a Coordinator or Administrator is ever shown keep their wording until Task 14.
2. A "meaningless code" is a model code or a specification value that has neither a unit nor a descriptor; a
   specification with a unit or a descriptor is the "useful specification" the brief keeps.
3. When hiding a code would make two rows of one list identical, the hidden detail is shown for those rows only.
4. Versions are named in business words: "düzəldilmiş sifariş", "əvvəlki sifariş", "ən son sifariş"; version numbers
   are not shown to the Rəhbər outside the kept technical places.
5. "Sətir sayı" covers every standalone line-count figure on the Rəhbər's screens (the object page's column and fact,
   the decision dialog's fact, the chart tooltip), not only the column of that name; Task 2's sentences, the lines
   section heading and its pagination stay.
6. On the object page, an older order of the same month is marked "Əvvəlki sifariş — sonradan yenilənib".
7. Search placeholders on the Rəhbər's screens stop mentioning codes; what the search matches does not change.
8. Supplier codes are not in the brief and stay.
9. The API keeps returning codes and versions; only the Rəhbər's screens stop printing them.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (05a's commit), `git status --short`, `git diff --stat`.
1. Obyekt və məhsul kodları — every place removed (file:line), `describeVariant`, the distinguishing rule with an
   example, what administrator screens still show.
2. "Versiya" — the §4.3 table as implemented, the two kept places, the Coordinator/Admin-only texts left for Task 14.
3. Sətir sayı — every place removed, what was kept and why.
4. Obyekt səhifəsində eyni ayın sifarişləri — the note and a before/after.
5. Axtarış — the placeholders.
6. Testlər — new tests; changed tests, each with the reason; counts; builds.
7. Toxunulmayanlar — no database reached, no backend change, no figure changed, 05a intact.
8. Sonrakı tapşırıqlar üçün qeydlər — anything for 6, 9, 11, 12, 13 or 14, and any 05a defect found.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
