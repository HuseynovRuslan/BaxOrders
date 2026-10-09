# TASK 15 — YEKUN ƏNVƏR MÜƏLLİM AUDİTİ (P0)

Priority: P0 (the final gate of the queue)
Brief: `AI_WORKFLOW/BRIEFS/TASK-15.md`. This is the owner's settled requirement. It decides *what* and *why*. This file
decides *how*. Where this file and the brief disagree, the brief wins: whoever runs the audit stops and reports.

Specification status: **the audit protocol. HD-006 is resolved; it runs as 15a → operator run → 15b.** The Planner
wrote this on 2026-09-25 from the brief, `OWNER_BRIEFS_MASTER.md`, `PLAN.md`, the accepted tasks' reviews,
`docs/business-decisions.md`, `run-agent.ps1` and the repository at `7550eda` (HEAD). It was BLOCKED on four owner
questions (HD-006). The owner answered all four on 2026-09-25 (`PLAN.md`, "HD-006 — owner's answers"). The Planner
then filled §0 and the parts marked **[HD-006 Qn]**. Some answers also changed lines that were not marked: §5.3's
commit line, §6.2's owner-decision rows, §8's first STOP line and its "Never" list, §9 items 2, 3, 5, 6 and 9, and
§10 A1 and A4. Each of those lines cites its answer, and §10 A9–A16 are new. No other requirement was removed.

**How it runs (A3).** The Coder has no browser, no Rəhbər credential and no database, so the Coder does not run the
audit. The work is split in three, and each step has its own owner:

1. **15a, Coder:** prepare the audit kit — the checklist, the read-only commands, the sandbox preparation and the exact
   steps — and run the regression suites. Specification: `TASKS/TASK-15a.md`.
2. **The owner's operator:** run §5–§6 with the kit, on the real system and in the sandbox, and hand back the filled
   results. This is a human step, recorded in `PLAN.md` as HD-008 once 15a is accepted.
3. **15b, Coder:** assemble the report (§7) from the operator's results, and run the suites again. The Planner writes
   `TASKS/TASK-15b.md` once the operator's results exist.

This file stays the protocol that all three follow. 15a and 15b each say which of its parts they carry.

**Read-only task.** The brief says it: "bu task çərçivəsində kod dəyişmir", and the audit is "yalnız oxuma
rejimində". No application code, test, schema, migration, tool or real data changes. This file carries no
`DATA_MIGRATION` line, on purpose. The only file the task adds to the repository is the audit report (§7.1).

---

## 0. The owner's answers (HD-006, resolved 2026-09-25)

Recorded verbatim in `PLAN.md`, "HD-006 — owner's answers". In short:

| # | Answer | Where it lands |
|---|---|---|
| A1 | **The audit month is September 2026.** October has not begun on 2026-09-25, so under 15.1 the last complete real month is September. Confirmed; the audit uses it. | §5.1 |
| A2 | **The 23.09.2026 report is not available.** It is not in the repository and the owner has not supplied it. Do not reconstruct its 20 sections, its P0–P3 priorities or its counted click path from memory or from any report in `AI_WORKFLOW/`. Audit against each brief's own «Acceptance — biznes dili ilə» (Tasks 04–16) and the owner decisions 4.1 … 16.1 in `BRIEFS/OWNER_BRIEFS_MASTER.md`. The final report says plainly which parts of brief 15 could not be checked for want of the original, and does not imply that they were. | §6.1, §6.2, §6.5, §7.1, §9 |
| A3 | **The owner's operator runs it, not the Coder.** The Coder prepares the checklist, the queries, the sandbox seed and the exact steps. The operator runs them and hands the results back for the report. | header, §5.3, §7.2 |
| A4 | **HD-002 is resolved: the 94 rows stand as classified.** They are settled, not open, so 15.2 is satisfied for them. «Alış qiyməti tələb olunur» rows with no price, if any remain, still count as open under 15.2a and must be reported. | §5.2 |

The questions as they were raised, kept for the record:

| # | Blocker | Why the Planner could not resolve it |
|---|---|---|
| Q1 | **15.1: which month.** The brief says: "Ayın tam olub-olmadığı audit başlamazdan əvvəl sizinlə dəqiqləşdirilir." Today is 2026-09-25, so October 2026 has not started and cannot be complete. The choice is therefore September 2026. But the brief requires the owner to confirm that it is complete. The real data's September comes from batch #50010, from the workbook `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx`: 480 rows (`docs/business-decisions.md:425`), with orders at 24 of 27 objects (Task 3). | The brief makes this an owner confirmation, in so many words. |
| Q2 | **The first audit's report is not in the repository.** The brief requires "İlk auditin eyni ssenarisi və eyni hesabat quruluşu: 20 bölmə, P0–P3 cədvəli", "İlk auditin hər P0 və P1 tapıntısının vəziyyəti" and a click-count comparison with "3 klik + 3 sürüşdürmə". The findings themselves are recorded in the master brief, as each task's «Auditdə müşahidə edilən hazırkı problem». But these are missing: the 20 section titles and their order, each finding's P0–P3 priority, and the path that was counted as 3 clicks + 3 scrolls. A search of the repository, `docs/`, the briefs, the reviews and the logs found none of them. | Rebuilding the sections or assigning priorities would invent facts about the first audit. That would also break the brief's "eyni quruluş" requirement. |
| Q3 | **Who runs the audit.** The audit means logging in with a Rəhbər account, reading screens at 1366, 1440, 390 and 1150–1279 px, counting clicks, and running the sandbox approval flow. Under `run-agent.ps1`, the Coder has no browser, no Rəhbər password (a credential is a §7 stop) and no database (`psql` is always denied, and `pg_dump` only on `DATA_MIGRATION` tasks). Earlier tasks left exactly these checks to the operator (Task 12 §11, Task 16b §12). It is also not recorded whether a real Rəhbər user exists in `baxorders_dev` (04a go-live note). | Changing what a role may do, or handing it a credential, is the owner's decision (`WORKFLOW_RULES.md` §7). |
| Q4 | **15.2 rests on HD-002.** The last recorded live figures are Unresolved 0 / PriceRequired 0 / InternalFreeSupply 95, with 94 decisions (16a). So 15.2 holds on paper. But it holds only because Administrator reclassified 94 rows Unresolved → InternalFreeSupply on 2026-09-24, and HD-002 says it is still undecided whether that was intended. If the owner reverts them, 94 rows become «Təsnif edilməyib» again and 15.2 fails. 15.2a counts a row as settled only when "biznes qaydasına görə qiymət tələb etmədiyi təsdiqlənib". | Whether those 94 rows are confirmed business classifications is exactly HD-002's open question. |

### 0.1 What cannot be checked, because of A2

These parts of brief 15 cannot be carried out as written. The report names each one in its own section (§7.1,
section 1), in these words or plainer, and never presents a substitute as the original:

- **"eyni ssenari və eyni hesabat quruluşu: 20 bölmə"** — the first audit's scenario and its 20 sections are unknown.
  The report uses the structure in §7.1, which is this audit's own.
- **"P0–P3 cədvəli"** and **"İlk auditin hər P0 və P1 tapıntısının vəziyyəti"** — the first audit's priorities are
  unknown, so it cannot be said which old findings were P0 or P1. Instead *every* old finding gets a status with
  evidence (§6.1), which includes whichever of them were P0 and P1. The P0–P3 table uses this audit's own scale (§7.1).
- **"Klik sayı ilk auditlə müqayisə olunub (3 klik + 3 sürüşdürmə)"** — the counted path is unknown. The audit counts
  the paths in §6.5, which are this audit's own, and sets them beside "3 + 3" with the statement that the paths may
  differ, so the numbers are not a like-for-like comparison.

---

## 1. Context

The brief's goal: "Bütün tapşırıqlardan sonra yoxlamaq: Ənvər müəllim ən son tam ayın sifarişlərini bu sistemlə rahat
və inamla təsdiqləyə bilirmi? Bu task yeni imkan qurmur, yalnız yoxlayır."

The first audit (23.09.2026) answered "Xeyr", for four reasons, each with the tasks that address it:

1. The figures were not stable between screens — Tasks 1, 1b, 1c, 3.
2. The price warnings were unreliable — Task 2 and the classification work (now Tasks 16a/16b).
3. The approval step was never tested — Task 4 (04a + 04b).
4. The main cause did not name the product — Task 7.

All of Tasks 04–14 and 16 are accepted (`PLAN.md`, "Accepted"). HEAD is `7550eda` (16b).

## 2. Owner decisions carried (hard requirements)

- The audit only reads. No real order is approved, returned or changed.
- The audit uses a **Rəhbər** account, not an admin (Task 14).
- Screen widths: **1366, 1440, 390 (phone) and a laptop width between 1150 and 1279.**
- It runs after Task 16, last.
- **15.1:** the latest complete real month (October if complete, otherwise September), plus a separate test order for
  the approval flow, in Task 4's sandbox.
- **15.2 / 15.2a:** before the audit, no open line remains in the real Qiymət təsnifatı. That means no
  «Təsnif edilməyib», and every «Alış qiyməti tələb olunur» row either has a price or has been confirmed not to need
  one and moved to the matching status.
- The September regression samples are checked on September data, even if the audit month is a different one.
- New findings are **proposed** as new tasks. No code is changed in this task.

## 3. Verified current state (repository at `7550eda`)

- Every task the brief lists is accepted. The per-task go-live notes in `PLAN.md` require the API to run a commit at or
  after 16a (`4467f8f`). HEAD `7550eda` satisfies all of them. No migration is pending: 13a's and 16a's are applied.
- Real database: `baxorders_dev`. Two import batches:
  - **#50010**, `Imported`, January–September 2026: the source of every real order;
  - **#6**, `NeedsReview`: the superseded first workbook, January–June, with the June block duplicated
    (`docs/business-decisions.md:12–24, 415–427`). It is "kept for audit, never modified".
- Approval sandbox: `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, with `-Create`, `-Reset`, `-Drop` and `-Run`. The
  API runs on `http://localhost:5081` against `baxorders_sandbox`. The UI is `npm run dev:sandbox` on
  `http://localhost:5174`. `-Reset` recreates the test order waiting for approval. The three test accounts get
  `BAXORDERS_SANDBOX_PASSWORD`, which is not stored anywhere.
- Test suites at `7550eda`: frontend 51 files / 957 tests, backend 1046 unit / 785 integration (16b review).
- Items carried into this audit by accepted tasks:
  - 16b: non-price technical words left on the import screens (`REVIEWS/TASK-16b.md`, "Notes"):
    - "Bu mərhələdə sorğu yaradılmır";
    - «staging»;
    - "Sifariş siyahıları növbəti mərhələdə əlavə olunacaq";
    - «Mövcud sorğu»;
    - «Versiya»;
    - «Ö/v»;
    - `vərəq:sətir`.
  - 16b: the button wording differs between Qiymət təsnifatı («Şirkətdaxili təminat kimi qeyd et» / «Alış qiyməti
    tələb olunur») and the import tab («Ödənişsiz daxili təminat kimi qeyd et» / «Alış qiyməti tələb olunur kimi qeyd
    et»).
  - 16a: the NotRequired dialog on the Suppliers page (`SuppliersPage.tsx:258–261`) overstates what it does.
  - 14: the pricing page a Rəhbər can open still shows product codes and the sheet:row reference.
  - 13c: after the Sabun variant link is approved, HEM September "Keçən ay" should read +23,852.70.
  - 12: the phone check at 390 × 844 was left to the operator.

## 4. Scope

In scope:

1. The pre-audit gates (§5), recorded with figures.
2. The audit scenario on the audit month's real data, with a Rəhbər account, at the four widths (§6).
3. The approval flow on a separate test order in the sandbox (§6.4).
4. A status for every old finding: həll olunub / qismən / həll olunmayıb, with evidence (screen and figure) (§6.1).
5. Each accepted task's business acceptance criteria, Tasks 04–16 (§6.2).
6. The Task 1–3 regression samples and the first audit's good points, on September data (§6.3).
7. The click count, compared with the first audit (§6.5).
8. The report in the first audit's structure, ending with the unsoftened answer (§7).
9. New findings, written as proposed new tasks (§7.3).

Out of scope:

- any code, test, style, text, schema, migration, tool or real-data change, including fixing what the audit finds;
- approving, returning or editing any real order;
- confirming, re-staging or changing import batch #6 (§5.2);
- deciding HD-002;
- editing a brief.

## 5. Pre-audit gates. All must pass before §6 starts.

Each gate's result goes into the report's opening section, with its figures and the time it was read.

### 5.1 G1: the month (15.1) **[HD-006 Q1 → A1]**

The audit month is **September 2026**. The owner confirmed it on 2026-09-25 (A1): "October has not begun on
2026-09-25, so under brief 15.1 the last complete real month is September. Confirmed; the audit uses it." The report
quotes that sentence and its date.

The operator checks one fact and records it: October 2026 has not ended on the day the audit runs. If the audit runs
after 2026-10-31, October may be complete and A1 no longer answers 15.1: STOP, and ask the owner again. Because the
audit month is September, the §6.3 regression samples and the audit month are the same month.

### 5.2 G2: pricing classification (15.2 / 15.2a) **[HD-006 Q4 → A4]**

Read the live Qiymət təsnifatı totals on the real data. Do not reuse 16a's figures: the brief and `CURRENT_TASK.md`
both say to read them again. Read them on the page itself, with an account that can open it. Record:

- «Təsnif edilməyib» (Unresolved) count: **must be 0**;
- «Alış qiyməti tələb olunur» (PriceRequired) count, and how many of them still have no price: **the latter must be
  0**;
- «Ödənişsiz daxili təminat» (InternalFreeSupply) count, and how many of those are HD-002's 94 rows;
- the import batches and their states. Batch #6 must still be `NeedsReview`.
  - Batch #6 is the superseded January–June workbook, with June duplicated. Confirming it would add a second copy of
    those months' orders. The audit therefore never confirms it.
  - If it has been confirmed since 16b, or if any batch other than #50010 is `Imported`: STOP and report. The figures
    would no longer be the ones every accepted task was reviewed on.

HD-002's 94 rows are settled (A4): the owner confirmed on 2026-09-25 that they are correctly «Ödənişsiz daxili
təminat». They count toward InternalFreeSupply, not as open lines. So G2 passes when both of these read 0:

- «Təsnif edilməyib»;
- «Alış qiyməti tələb olunur» rows with no price.

If either is above 0: STOP. List the open rows (product, object, period) in the report, as A4 requires, and do not
start §6. Settling a row is a classification change on real data. That is the owner's work, never the audit's.

The last recorded live figures are Unresolved 0 / PriceRequired 0 / InternalFreeSupply 95 (16a). If a figure differs
from these but G2 still passes, record the difference in the report and carry on. It is a finding only if it cannot
be explained.

The operator reads these figures on the Qiymət təsnifatı page, and cross-checks them with the read-only commands the
15a kit prepares.

### 5.3 G3: the environment **[HD-006 Q3 → A3]**

The **owner's operator** runs this gate and all of §6, with the 15a kit. The Coder runs only the regression suites
below, in 15a and again in 15b.

- The API and frontend serve `7550eda`, or a later commit that changes only `docs/audits/` (15a's kit commit is one).
  Record `git rev-parse HEAD`, `git diff --stat 7550eda HEAD` and the API start time.
- An active Rəhbər user exists in the real system, and the audit logs in with it. The header must show the Rəhbər
  name, not "Administrator". If there is no such user: STOP. Creating one is a user change, and that belongs to the
  owner. The Rəhbər's password is typed into the login form only. It is never written to the kit, the results, a
  screenshot or the report.
- The sandbox is reset (`sandbox.ps1 -Reset`), so that its test order is waiting for approval.
- As a regression baseline, run and record:
  - `npm run --prefix frontend/bax-orders-web test` (expect 51 / 957);
  - `npm run --prefix frontend/bax-orders-web build`;
  - `dotnet test BaxOrders.slnx` (expect 1046 / 785).

  These read only. A red suite is itself a finding, not something to fix.

## 6. The audit

Every check is recorded as: what was done, what the screen showed (the exact text and figure), the width, and the
verdict. "Ekran və rəqəm" means both. A verdict without the figure it rests on does not count.

### 6.1 Old findings: one status each

The first audit's findings are the bullets under «Auditdə müşahidə edilən hazırkı problem» in
`BRIEFS/TASK-04.md` … `BRIEFS/TASK-14.md`. Each one is a separate row in the register: one bullet, one row. Where a
bullet lists several examples, give each example its own row. For each row:

- the brief file and the bullet (quoted);
- the task that addressed it;
- no first-audit priority **[HD-006 Q2 → A2]**: it is unknown and is not reconstructed. Where the status is
  **qismən** or **həll olunmayıb**, the row gets a priority for what is seen *today*, on this audit's scale (§7.1),
  marked as today's rating. A **həll olunub** row gets none;
- the status: **həll olunub**, **qismən** or **həll olunmayıb**;
- the evidence: the screen, the width, and the figure shown today beside the figure the first audit recorded
  (for example, Fəvvarələr September "Keçən ay" −2,584.45 ₼ in both).

Every row must have evidence. The brief requires it for every P0 and P1 finding, and since it is not known which those
were (A2), evidence on every row is the only way to be sure they are covered. The four reasons for "Xeyr" in
`BRIEFS/TASK-15.md` each get their own summary row, pointing to the rows above them.

The findings in `BRIEFS/TASK-16.md` were found after the first audit, as the brief says. They are checked under §6.2,
not listed as old findings.

### 6.2 Tasks 04–16: the acceptance criteria

For each of `BRIEFS/TASK-04.md` … `TASK-14.md` and `TASK-16.md`, every bullet under «Acceptance — biznes dili ilə» is
checked on screen, and each gets pass / fail with evidence.

- Checks that need an approval or any write (Task 4, Task 13's approve / undo, Task 16's classification) run **in the
  sandbox only**, never on real data.
- If the sandbox cannot host such a check, record the criterion as «yoxlanıla bilmədi» and give the reason. Never run
  it on real data instead.
- Where a criterion names September data (13c's Sabun, 7's Traktor), it is read on September.
- Task 14's criteria are checked with the Rəhbər account. The menu must show exactly İdarəetmə paneli, Aylıq hesabat,
  Təsdiq gözləyənlər, Obyektlər and Təchizatçılar. Excel importları and İstifadəçilər must not open by direct link,
  and the read-only pages must change nothing.
- Also record whether each item in §3's carried list is still present.

**The owner decisions 4.1 … 16.1 (A2).** Each of the twenty decisions in the closing journal of
`BRIEFS/OWNER_BRIEFS_MASTER.md` gets its own row: the decision quoted, what on screen shows it is honoured, the
evidence, and pass / fail. A decision already proven by an acceptance bullet above may point to that row instead of
repeating it. A decision that can be proven only by a write follows the same sandbox rule as above.

### 6.3 Regression: Task 1–3 and the first audit's good points (on September data)

These are the brief's samples, verbatim. Each one gets pass / fail with its figure.

- **Task 1:** Heydər Əliyev, "Son 3 ay" — panel kartı və sifariş səhifəsi eyni rəqəmi göstərir; "Geri" bazanı qaytarır.
- **Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti;
  "Keçən ay" bazasında EXPO ayrıca.
- **Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir.
- **Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili:
  Azpetrol baza".
- **Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama.
- **İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir
  ekrana sığır; "Qaralama" heç yerdə görünmür.

For "hər ekranda", list each screen where the figure was read. For Task 1c, check at least the three September orders
the briefs use (Heydər Əliyev, Fəvvarələr, Nərimanov) and show the arithmetic.

### 6.4 The approval flow (sandbox only)

This is Task 4's end-to-end flow, on the sandbox's test order, logged in as the sandbox's Rəhbər:

1. the order is sent;
2. it appears in «Təsdiq gözləyənlər»;
3. the Rəhbər reviews it;
4. the Rəhbər chooses «Düzəliş tələb et», with a reason (4.2: an empty reason is refused);
5. the sender corrects it and sends it again;
6. the Rəhbər approves it.

Record at each step what the decision panel shows:

- who sent it, and when;
- which submission this is, in business words;
- the previous correction reason;
- who approved it, and when.

Also check that an admin without approval authority cannot approve (4.3). Run this at 1366 and at 390 (the fixed
bottom bar, Task 12). After the flow, reset the sandbox again. No step touches `baxorders_dev`.

### 6.5 Click count

**[HD-006 Q2 → A2: the path]** The first audit's counted path is unknown and is not reconstructed. The audit counts
two paths of its own, at 1366 × 768, and records each click and each scroll in order:

- **K1, real data, the reading path:** from İdarəetmə paneli, as it opens after the Rəhbər logs in, to the September
  order page of Heydər Əliyev, with its total, its change against «Keçən ay» and the main cause's product name
  («Niyə dəyişib?») all read. The count ends when the last of the three has been read.
- **K2, sandbox, the decision path:** from İdarəetmə paneli, as it opens after the sandbox Rəhbər logs in, to the
  moment the Rəhbər has approved the test order, with the facts §6.4 lists read on the way.

The report sets both counts beside "3 klik + 3 sürüşdürmə" and says, in these words or plainer, that the first
audit's path is not known, so the comparison is between two paths that may differ (§0.1).

### 6.6 Widths

Each screen in the scenario is read at 1366 and 1440. The dashboard, the monthly report, the order page and the object
page are also read at 390 and at one width in 1150–1279 (§10, A3). A layout finding names its width.

## 7. Output

### 7.1 The report

File: `docs/audits/2026-final-enver-muellim-audit.md`, in Azerbaijani, the language of the first audit and the brief.

Structure **[HD-006 Q2 → A2]**: the first audit's 20 sections are unknown, so the report uses this audit's own
structure, in this order:

1. «Yoxlanıla bilməyənlər» — the §0.1 list, first, so that no reader takes a later section for the original's.
2. Ön şərtlər — G1, G2 and G3 (§5).
3. Köhnə tapıntılar — the register and the four "Xeyr" reasons (§6.1).
4. Task 04–16 qəbul şərtləri (§6.2).
5. Sahibin qərarları 4.1 … 16.1 (§6.2).
6. Regress — Task 1–3 and the first audit's good points (§6.3).
7. Təsdiq axını — the sandbox (§6.4).
8. Klik sayı — K1 and K2 against "3 + 3" (§6.5).
9. Ekran enləri (§6.6).
10. Əvvəlki tasklardan daşınan qeydlər — the §3 carried list.
11. Yeni tapıntılar — proposed tasks (§7.3).
12. P0–P3 cədvəli — every open item, old and new.
13. Son vəziyyət — the end-of-audit reading (§9, item 11).
14. Yekun cavab.

**This audit's P0–P3 scale** (the first audit's is unknown). Priority is by effect on the Rəhbər's approval decision:

- **P0** — a figure the Rəhbər sees is wrong, or disagrees with the same figure on another screen; or the Rəhbər can
  change real data that Task 14 says they must not; or the approval flow fails a step.
- **P1** — the decision can be made, but a brief acceptance bullet or an owner decision (4.1 … 16.1) is not met, or
  a word, colour or warning on the Rəhbər's path misleads.
- **P2** — slows or confuses the Rəhbər without misleading: a layout fault at one of the four widths, extra clicks, a
  technical word.
- **P3** — cosmetic, or on a screen the Rəhbər does not use.

**The final answer's rule.** The answer is **Bəli** only if every gate passed, no P0 or P1 is open (old or new), and
the approval flow ran end to end. Otherwise it is **Xeyr**, and the reasons name the open items by their row.

Within that structure the report must contain:

- the gate results (§5), with the owner's month confirmation quoted;
- the old-findings register (§6.1), and the four "Xeyr" reasons;
- Tasks 04–16 acceptance (§6.2) and the regression samples (§6.3);
- the approval flow (§6.4) and the click count against 3 + 3 (§6.5);
- the new findings (§7.3) in the P0–P3 table, beside the old ones and their statuses;
- as the report's final lines, the brief's question verbatim — "Bu ayın sifarişləri bu gün Ənvər müəllimə
  verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?" — and an answer that begins **Bəli** or
  **Xeyr**, followed by its reasons. "Qismən", "əsasən" or a conditional answer is not an answer.

### 7.2 Evidence

Every figure in the report names the screen and width it was read on. **[HD-006 Q3 → A3]** The operator takes the
screenshots. They go to `docs/audits/2026-final-enver-muellim-audit/ekranlar/` as PNG, named `NN-<screen>-<width>.png`
(NN = the check's number in the kit), and the results and the report reference them by that name. A screenshot is
required for every P0 or P1 item and for every G2 figure. Elsewhere a typed figure with its screen and width is
enough.

- A screenshot must not show a password or a token.
- It may show real names and figures, because the report stays in this local repository and is never pushed
  (`WORKFLOW_RULES.md` §9).

### 7.3 New findings

Each new finding is written as a proposed task. It has a title, the screen and width, the figure, the priority P0–P3
on the first audit's scale, and the brief task that owns the area (from the master brief's dependency table). It is
only proposed. Nothing is fixed, and no `TASKS/` file is written for it.

### 7.4 `LAST_REPORT.md`

- HEAD and `git status`;
- the gate results;
- the counts: old findings by status, acceptance pass/fail by task, regressions pass/fail;
- the click count;
- the final answer;
- the list of proposed tasks;
- the regression suites' raw summary lines;
- a statement that no real order, batch, classification or user was changed.

## 8. Safety and STOP conditions

STOP and report, without working around it, if any of these happens:

- any gate in §5 fails;
- the audit would have to approve, return, edit or classify anything in `baxorders_dev`;
- a screen offers the Rəhbər a write action on real data that Task 14 says must not exist. Record it as a P0 finding.
  Do not click it.
- batch #6 is found confirmed, or any batch other than #50010 is `Imported`;
- the API or frontend is not at the commit §5.3 names;
- a credential would have to be written to a file, a log or the report;
- the brief and this file disagree.

Never: SQL against `baxorders_dev` other than the kit's read-only commands, `pg_dump`/`pg_restore`, `dotnet ef`, a
migration tool's `--backup` or `--apply`, `git commit` / `reset` / `checkout` / `push`, or an edit outside
`docs/audits/` and `AI_WORKFLOW/LAST_REPORT.md`. The Coder, in 15a and 15b, runs no database command at all; the
kit's read-only commands are the operator's.

## 9. Acceptance criteria

The brief's four, verbatim, then this file's own:

1. "Hesabatın sonunda bu suala açıq, yumşaldılmamış cavab var: 'Bu ayın sifarişləri bu gün Ənvər müəllimə
   verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?'" The answer begins Bəli or Xeyr.
2. "İlk auditin hər P0 və P1 tapıntısının vəziyyəti sübutla göstərilib." Each has a screen, a width and a figure.
   Carried by giving *every* old finding a status with evidence, because which ones were P0 and P1 is unknown (A2,
   §0.1). The report says so.
3. "Klik sayı ilk auditlə müqayisə olunub (ilk auditdə: 3 klik + 3 sürüşdürmə)." Carried by K1 and K2 set beside
   "3 + 3", with the statement that the first audit's path is unknown (A2, §6.5).
4. "Audit başlayanda Qiymət təsnifatında nə 'Təsnif edilməyib', nə də qiyməti yazılmamış 'Alış qiyməti tələb olunur'
   sətri var." The figures and their reading time are in the report.
5. The brief's «İstədiyim nəticə» asks for the first audit's 20 sections and P0–P3 table. That document is not
   available (A2). The report instead follows §7.1's structure and scale, and its first section names the 20
   sections, the first audit's priorities and its click path as not checkable. It never presents a substitute as the
   original.
6. The audit month is September 2026, as the owner confirmed on 2026-09-25, and the confirmation is quoted (15.1, A1).
7. The approval flow was run end to end on a sandbox test order, with every step recorded (15.1, brief).
8. Every old finding (§6.1) has a status and evidence, not only the P0 and P1 findings (brief: "Hər köhnə tapıntı
   üçün").
9. Every Task 04–16 business acceptance bullet, every owner decision 4.1 … 16.1 and every §6.3 sample has a verdict
   with a figure (A2).
10. New findings are proposed tasks only.
11. `git diff` against `7550eda` shows nothing outside `docs/audits/`. `git status` shows no other change beyond the
    untracked workflow files. No real order, batch, classification, product match or user changed. Show this with the
    Qiymət təsnifatı totals and the batch states read at the end, equal to those read at §5.2.
12. The regression suites' results are recorded as they came out.

## 10. Assumptions the Planner made

- A1. *(Superseded by the owner's answer A1: September 2026 is confirmed.)* The Planner had read 15.1's choice as
  September 2026, pending that confirmation.
- A2. "Hər köhnə tapıntı" means each bullet of each task brief's «Auditdə müşahidə edilən hazırkı problem», one row per
  bullet, and one row per example where a bullet lists several.
- A3. The laptop width is 1200 px, one width inside 1150–1279. The brief names a range, not a width.
- A4. The click count is taken at 1366 × 768, the width the Task 9 brief uses for "the first screen". Since the first
  audit's path is unknown (A2), the two counted paths K1 and K2 (§6.5) are the Planner's.
- A5. The report is a committed document at `docs/audits/2026-final-enver-muellim-audit.md`. That way the audit's
  result stays with the code it audited, and a document is not a code change.
- A6. Batch #6 must not be confirmed before or during the audit. That follows from `docs/business-decisions.md`, which
  says it is superseded and holds June twice. It is not a new business rule.
- A7. Checks that need a write (Tasks 4, 13 and 16) run in the sandbox, because the brief's read-only rule covers all
  real data, not only orders.
- A8. The Task 04–16 acceptance bullets are checked by reference to their brief files rather than copied here, so this
  file cannot drift from them.
- A9. The task is split 15a (Coder prepares) → operator run → 15b (Coder assembles), because A3 puts the running in
  the operator's hands and a Coder session cannot wait for it.
- A10. The report's 14-section structure (§7.1) is the Planner's, standing in for the unknown 20 sections.
- A11. The P0–P3 scale (§7.1) is the Planner's, by effect on the Rəhbər's approval decision. The first audit's scale
  is unknown.
- A12. An old finding that is still open gets a priority on today's scale, marked as today's. A resolved one gets
  none. No first-audit priority is ever assigned.
- A13. The final answer's rule (§7.1): Bəli only with every gate passed, no open P0 or P1, and the approval flow run
  end to end. The brief asks for "rahat və inamla"; an open P0 or P1 rules out both.
- A14. The owner decisions 4.1 … 16.1 get one row each, and may point to an acceptance row that already proves them.
- A15. Screenshots are required for every P0/P1 item and every G2 figure, and optional elsewhere.
- A16. If the audit runs after 2026-10-31, A1 no longer answers 15.1 and the owner is asked again (§5.1).
