# Blockers — questions that genuinely need the owner

Each entry is a question no rule, no code and no evidence in the repository can answer. Nothing here is being
worked around; nothing here stops the rest of the work.

Status: `OPEN` = waiting for the owner · `ANSWERED` = answer recorded in DECISIONS.md.

---

## B-01 · September 2026: 480 blank «Növ» cells — ANSWERED and APPLIED, 2026-09-27

The owner released the workbook. `Aylıq!R3141:R3620` — 480 cells, all September 2026 — now read `Aylıq sifariş`.
Recorded as **D-15**.

| | |
|---|---|
| before | sha256 `02f2177a4e679925157c5e5810949e6a1f6b40fd779ed3238edd915811d42f3f` |
| after | sha256 `f2323158616eab7f5b1e2fd8013758207b4df59969f4b7dc00d81863dcb791c6` |
| where | `AI_WORKFLOW/workbooks/working/…` · the untouched original is kept beside it in `original/` |
| backups | `AI_WORKFLOW/workbooks/backups/20260927-174558-…` and `C:\Users\HP\BaxOrders-backups\workbook\…-174201-B01-approved-pre-edit.xlsx` |
| how | one worksheet part rewritten inside the package; the other seventeen entries copied byte for byte |

Twenty checks, all passed: exactly rows 3141–3620 changed and nothing else; all 480 are September 2026; the
other 3137 «Növ» cells keep their distribution (`Aylıq sifariş` 2810, `Aylıqdan kənar` 324); both sheets still
hold 3597 formulas each; the four comment and drawing parts, `sharedStrings`, `styles` and `calcChain` are
byte-identical; the footer gained nothing; the file opens with the same two sheets.

Through the real pipeline, in a disposable database: **3617 staged rows · Monthly 3293 · OutsideMonthly 324 ·
Unclassified 0**, which is exactly what the owner expected.

This does **not** settle item 2988 — that row is absent from the workbook altogether. See B-02.

---

## B-02 · Item 2988, «Yay ayaqqabısı» — ANSWERED and APPLIED, 2026-09-27

The owner ruled the row was not meant to disappear. It is back in the working workbook as `Aylıq` row 3621,
taken field by field from its own historical source row (`Əsas` 3035): Geyim · Fərdi mühafizə vasitələri · İş
ayaqqabısı · Yay ayaqqabısı · model `M-101-S-2` · 1 · ədəd · 28 · Qasımoğlu MMC · H.Ə.M · 1 August 2026 ·
Çingiz.

**Its «Növ» is deliberately empty.** No source states it, the owner said not to guess it from its neighbours,
and a blank «Növ» is a warning rather than a blocker — so the row imports and arrives «Təsnif edilməyib». That
is the one unclassified line in the batch, and it is unclassified on purpose.

Verified: the row lands as 1 × 28 ₼, Çingiz, Heydər Əliyev Mərkəzi, August 2026, `Unclassified`.

---

## B-03 · Item 500, «Kürək düz» — ANSWERED and APPLIED, 2026-09-27

The owner ruled the workbook right: a purchase at 4, not free supply. Applied by migration
`20260927182432_AcceptTheWorkbookPriceForKurekDuz` — 3 × 4 = 12, mode `InternalFreeSupply` → `PriceRequired`,
with the reason written to the pricing decision log. `Original*` untouched; the historical import row still says
what it always said. Reversed and reapplied once to prove the `Down`.

The known amount moves **431 670,91404 → 431 682,91404**, which is exactly this line.

---

## B-04 · Item 1303 / `Aylıq` row 1248 — ANSWERED and APPLIED, 2026-09-27

The owner ruled **50 mm** correct. `Aylıq!H1248` now reads `mm` instead of `mt`, one shared-string index changed
and nothing else on the row. The row then matches **variant 20766, `50 MM`, which already existed** — so no
variant was created and the last variant blocker in the workbook is gone.

---

## B-05 · The 17 «Laqonda daşı metal üçün» rows — ANSWERED and APPLIED, 2026-09-27

The owner ruled that the new workbook is the current truth: **one canonical product** of that name, its variants
told apart by the current Ölçü and Model/Kod, and the six older products left exactly as they are.

Rehearsed through the real endpoints on the real workbook:

| | |
|---|---|
| product created | **1** (`BatchOnly`, **no alias saved**) |
| variants created | **6** — 115 mm plain ×5 rows · 115 mm Alevs ×4 · 115 mm Skom ×4 · 230 mm Skom ×2 · 230 mm plain ×1 · 180 mm Alevs ×1 |
| rows resolved | **17 of 17**, `UnknownProduct` 0 and `UnknownProductVariant` 0 |
| rows 1730 and 2201 | one variant, deliberately — the same 115 mm Alevs identity |
| row 2251 | its own variant, because 180 mm is a different specification |
| «Ədəd» against «ədəd» | one variant, not two: the capital letter is not an identity |
| the six historical products | all six still there, all 17 of their historical lines untouched |
| catalog | units 17 unchanged · products 1112 → **1113** · product aliases **15 unchanged** |

`Original*` provenance is unchanged everywhere, and the workbook needs no further renaming for these rows.

**These were the last blocking rows.** The workbook now imports in full: 3618 of 3618.

---

## B-06 · After an import, 332 single actions — OPEN

**Fact, measured 2026-09-27.** Confirming the workbook creates **166 requests in `Draft`**. Moving them through
the workflow is `POST /orders/{id}/submit` and then `POST /orders/{id}/approve`, one order at a time — 332
actions, each its own page. The approvals screen is read-only (`GET /approvals/inbox`); its «Hamısı» entries are
filters, not a selection. There is no bulk path anywhere, in the API or in the screens.

**Why this is a blocker and not a task.** Approval is the control the workflow exists for: an approver saying
they have looked at this order. A "təsdiq et — hamısını" button removes exactly that, for 166 orders at once,
and no evidence in the repository says the company wants it removed. That is the owner's decision about their
own governance, so it is not taken here.

Submitting is a different matter — it is mechanical, reversible and asserts nothing — but it is still a step in
the same workflow, so it is asked rather than assumed.

**What is needed:** one of —

| | |
|---|---|
| (a) | leave it: 166 orders are approved one at a time, deliberately |
| (b) | bulk **submit** only: the drafts reach the approver in one action, each still approved on its own |
| (c) | bulk submit **and** approve, with the approver named on every order and the count shown before it runs |

(b) is the recommendation: it removes the mechanical half and keeps the half that means something.

---

## B-07 · The monthly report scrolls sideways on a laptop — OPEN

**Fact, measured in a browser 2026-09-27.** On `Aylıq hesabat` the page itself scrolls sideways under a
1290-pixel window: **9 pixels at 1280, 89 at 1200, 225 at 1064**, and nothing from 1290 up.

The twelve-month table has a 1000-pixel minimum — 144 for the name, 64 for each month, 88 for the year, which is
the owner's own "at least 64 pixels a month". The box it sits in is the window less the 256-pixel sidebar and the
`lg:px-8`, so **880 pixels at a 1200-pixel window**. The arithmetic that set the current breakpoint at 1064 left
the sidebar out and concluded the table fits from there up; it does not.

A scroll container is switched on only under 1064, because a container captures `position: sticky` and the header
then sticks to the box instead of the page — the defect reported on a 1280-pixel laptop. So between 1064 and 1289
there is no container and the document scrolls instead. The header does stick there, which is what that buys.

**What is needed:** one of —

| | |
|---|---|
| (a) | leave it: the page scrolls sideways on a 1280-pixel laptop, the header keeps sticking |
| (b) | scroll the container from 1290 down: no page scroll, and the header stops sticking on that laptop — the defect that was reported |
| (c) | give the table its own vertical scroll as well, so the header sticks inside the container: both are kept, and the manager's main report gains a scrollbar of its own |

(c) is the recommendation, and it is the one that changes how the screen feels, which is why it is asked.

Nothing is blocked by this: the figures are all reachable, and the page is correct at 1290 and above.

**Re-measured 2026-09-28**, during the redesign's responsive QA (`U-12`): **89 pixels at a 1200-pixel window**,
exactly as the note above predicts, and clean at 1440, 1366 and 390. The redesign did not touch it and did not
make it worse — the new headline is narrower than the six metrics it replaced. The dashboard, in all three
scopes and at all four widths, has no page-level horizontal scroll at all. This remains the owner's choice.

---

## B-09 · Tam frontend test qaçışında bir test vaxt həddini aşdı — AÇIQ (2026-10-15)

**Fakt.** 2026-10-15, UI V2 auditindən əvvəl tam qaçış (`npx vitest run`): 1472 testdən 1471-i keçdi.
`src/pages/OrderDecisionPage.test.tsx` › «the way back to the monthly report › opens the report for the order’s
year once the reader has pushed an entry of this page’s own» 20 000 ms limitini (`vitest.config.ts`,
`testTimeout`) aşdı. Qaçış 145 s çəkdi, jsdom mühitlərinin yaradılması 808 s.

**Sonrakı ölçmələr — heç bir kod dəyişmədən:**

| Qaçış | İşçi sayı | Nəticə | Müddət | Bu test | Fayldakı testlərin medianı | Boş RAM (ən az) | CPU (orta) |
|---|---|---|---|---|---|---|---|
| 1 (ilkin) | default | 1471/1472 — **bu test timeout** | 145 s | > 20 000 ms | — | ölçülməyib | ölçülməyib |
| yalnız bu fayl | default | 135/135 | 33 s | — | — | — | — |
| 2 | default | 1472/1472 | 93 s | 3 965 ms | 373 ms | ölçülməyib | ölçülməyib |
| 3 | default | 1472/1472 | 93 s | 3 218 ms | 387 ms | 287 MB | 99 % |
| 4 | default | 1472/1472 | 98 s | 3 125 ms | 396 ms | 549 MB | 95 % |
| 5 | `--maxWorkers=4` | 1472/1472 | 119 s | 1 578 ms | 183 ms | 897 MB | 57 % |

**Deyə bildiklərimiz.** Bu test faylın ən ağır testlərindəndir: fayldakı testlərin median müddətindən 8–10 dəfə
uzun çəkir. Müddəti yükdən asılıdır: 4 işçi ilə yarıya düşür. Tam qaçış zamanı maşın tam yüklənir: CPU 95–99 %,
8 GB-dan boş qalan yaddaş 0,3–0,5 GB.

**Deyə bilmədiklərimiz.** Səbəbin yük olduğunu deyə bilmirik. Testin tək işlədiləndə keçməsi bunu sübut etmir (sahib,
D-50). 20 s-ə çatmaq üçün test adi 3–4 s-dən 5–6 dəfə yavaşlamalı idi, ilkin qaçış isə bütövlükdə cəmi ~1,5 dəfə
yavaş idi. Səbəb keçici dayanma (swap, GC) da ola bilər, testdə və ya səhifədə nadir hallarda yaranan gözləmə də. İlkin
qaçışda testlərin ayrı-ayrı müddətləri yazılmayıb, ona görə həmin anda qonşu testlərin nə qədər çəkdiyini bilmirik.

**Növbəti addımlar.**
1. UI V2 işi zamanı hər tam qaçış JSON hesabatı ilə (`--reporter=json`) saxlanır. Test yenə düşərsə, həmin anın
   bütün müddətləri əlimizdə olacaq.
2. Yenə düşərsə, eyni qaçışda qonşu testlərin müddətinə baxılır. Hamısı yavaşdırsa, səbəb yükdür. Yalnız bu test
   yavaşdırsa, səbəb gözləmədir və testin addımları izlənir.
3. Limit qaldırılmır, test zəiflədilmir.
4. Sahib ayrıca qərar verərsə (test konfiqurasiyasının dəyişməsi): bu maşında işçi sayı 4-ə endirilir. Qaçış 93 s-dən
   119 s-ə uzanır, yük isə xeyli azalır.

**Heç nəyi bloklamır.** Amma test UI V2-nin toxunduğu yolu yoxlayır — sifarişdən hesabata qayıdış (24.3). Ona görə
V2-nin hər mərhələsinin qəbulunda tam qaçış təkrarlanır.

**Yeniləmə 2026-10-16 — təkrarlandı və yük fərziyyəsi təkzib olundu.** UI V2-nin A mərhələsinin ilkin qaçışı (`main`
budağı, kod dəyişməmiş): 1472 testdən 1471-i keçdi, **eyni test yenə düşdü** (35 458 ms, limit 20 000 ms). Bu dəfə
test-test müddətlər JSON hesabatında var:

| | Müddət |
|---|---|
| Düşən test | **35 458 ms** |
| Ondan əvvəlki 6 və sonrakı 6 test (fayl sırası ilə) | 107–1 029 ms |
| Fayldakı testlərin medianı | **228 ms** (əvvəlki yaşıl qaçışlarda 373–396 ms — yəni bu dəfə fayl hətta daha sürətli idi) |
| Fayldakı ikinci ən yavaş test | 4 516 ms |

**Nəticə:** eyni işçidə, eyni anda qonşu testlər sürətli işləyib — maşın yükü bunu izah etmir. Test **özünə xas
ilişib qalır** (nadir hallarda yaranan gözləmə və ya «race»). 35 s > 20 s olması onu da göstərir ki, ilişmə zamanı
hadisə dövrü (event loop) məşğul idi və limitin taymeri gec işlədi — sonsuz asinxron təkrarlanma (render → effekt →
sorğu → render) ehtimalı var. Bu, **[Fərziyyə]**-dir, sübut deyil.

**Tək başına 15 qaçış (2026-10-16, `-t "once the reader has pushed an entry"`):** 15/15 keçdi, test 412–669 ms.
Tam faylın içində isə eyni test adətən 3–4 s çəkir (faylın medianından 8–17 dəfə uzun) və 6 tam qaçışın 2-də
ilişib. Deməli, fayldakı **əvvəlki testlərin geridə qoyduğu vəziyyət** (yarımçıq sorğu, taymer, tarixçə və ya mock)
bu testə təsir edir — **[Fərziyyə]**, növbəti addımla yoxlanacaq.

**Növbəti addım (ayrıca tapşırıq, sahibin icazəsi ilə):** testi qonşuları ilə birlikdə, addım-addım zaman ölçüləri ilə
(müvəqqəti, commit edilməyən nüsxədə) təkrar-təkrar işlətmək, ilişən addımı və onu yaradan əvvəlki testi tapmaq; səbəb testdədirsə — testi düzəltmək (zəiflətmədən),
səhifədədirsə — `OrderDetailPage`-in qayıdış məntiqini düzəltmək. UI V2 `OrderDetailPage.tsx`-ə toxunmur.

**UI V2 B mərhələsindən sonra (2026-10-16):** icraçının 3 tam qaçışında bu test keçdi (18 494, 3 189, 2 906 ms — birincisi
limitə 1,5 s qalmış); yoxlayıcının qaçışında 4 733 ms, keçdi. Açıq qalır.

---

## B-10 · `App.test.tsx`-də bir test bir dəfə gözləmə müddətini aşdı — AÇIQ (2026-10-16)

**Fakt.** UI V2 B mərhələsinin icraçısının 3 tam qaçışından birində `src/App.test.tsx` › «sends /orders straight to the
objects…» düşdü: `findBy…` standart 1 000 ms gözləyir, element 1 312 ms-də gəldi. Tək başına 5/5 keçdi (307–394 ms).
Test aylıq hesabat səhifəsini açmır; V2-nin dəyişikliyi ona toxunmur. JSON: scratchpad `phaseB-run-2-app-flake.json`.

**B-09-dan fərqi.** B-09-da test 20 s ilişib qalır, qonşuları isə sürətlidir. Burada isə 1 s-lik dar gözləmə 0,3 s
aşılıb. Bu, yükə həssaslığa daha çox oxşayır — **[Fərziyyə]**, sübut deyil.

**Növbəti addım.** B-09 kimi: hər tam qaçışın JSON hesabatı saxlanır. Təkrarlanarsa, həmin qaçışda qonşu testlərin
müddətinə baxılır. Gözləmə müddəti qaldırılmır, sahibin qərarı olmadan test dəyişdirilmir.

**İkinci hal (2026-10-16, UI V2 C mərhələsinin yoxlayıcı qaçışı).** `src/components/imports/review/productAliasAuthority.test.tsx`
› «mapping a product to an existing one › offers no alternative name without the authority, and maps for this import
only» düşdü: «Unable to find role="button" and name "Lampa 15W"» — `findBy…`-ın 1 000 ms-i bitdi (test 1 418 ms). Faylın
testlərinin medianı 342 ms. Fayl tək başına 5 dəfə: 45/45 keçdi. İdxal kodu V2-də dəyişməyib (`git diff` boş). Eyni
sinifdəndir: dar 1 s gözləmə tam qaçışın yükü altında aşılır — **[Fərziyyə]**. JSON: scratchpad `phaseC-review.json`.

---

*B-01 was answered by the owner on 2026-09-27 and applied the same day; it is kept above as the record of what
was written and verified.*

*B-06, B-07 and B-08 were resolved autonomously on 2026-09-27 under the owner's autonomy grant and moved to
`DECISIONS.md` as AD-01, AD-03 and AD-02. They are catalog representation, source repair through the review's own
correction trail, and a service-line confirmation — product and policy choices, not historical truth.*
