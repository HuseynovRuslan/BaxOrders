# Yekun Ənvər müəllim auditi — hesabat

- Audit ayı: **Sentyabr 2026**
- Qaçışın tarixi və vaxtı: **2026-09-25, 21:00–21:06** (A bölməsi; `neticeler.md`:4–6)
- Operator, `neticeler.md`:3-dən sözbəsöz: Claude Code — sahibin adından işləyən avtomatlaşdırılmış operator (brauzersiz)
- Yoxlanılan commit: `749ad9d` (kod `7550eda`-dakıdır; ondan sonra yalnız `docs/audits/` dəyişib — A-02)
- Mənbələr: operatorun nəticələri `docs/audits/2026-final-enver-muellim-audit/neticeler.md`; protokol
  `AI_WORKFLOW/TASKS/TASK-15.md`; brief `AI_WORKFLOW/BRIEFS/TASK-15.md`

> **Bu, uğurla tamamlanmış audit deyil.** Ön şərtlər (A bölməsi) aparılıb və altısı da keçib. Auditin brauzerlə
> aparılan hissəsi — B … K bölmələri, təsdiq axını, klik sayı, ekran enləri, ekran şəkilləri — sahibin 2026-09-25
> tarixli açıq qərarı ilə təxirə salınıb (`DEFERRED_BY_OWNER`). Bu hissələrin heç bir sətri keçdi sayılmır. Heç bir
> müşahidə, rəqəm və ya ekran şəkli uydurulmayıb.

Bu hesabatı necə oxumaq:

- Hər rəqəmin yanında onun mənbə sətri yazılıb, məsələn «A-10, Əmr 1, 21:03». Mənbə sətirləri `neticeler.md`-dədir.
- Ekrana baxılmayıbsa, bu açıq yazılır: «ekrana baxılmayıb». Bu qaçışda heç bir ekran oxunmayıb, ona görə heç bir
  rəqəmin yanında ekran adı və en yoxdur.
- Heç bir ekran şəklinə istinad edilmir, çünki ekran şəkli yoxdur: `ekranlar/` qovluğu yaradılmayıb
  (`neticeler.md`:17, 1388).
- Təxirə salınmış hər sətir öz nömrəsi və başlığı ilə sadalanır və vəziyyəti «yoxlanıla bilmədi — DEFERRED_BY_OWNER»
  yazılır. Belə sətrə hökm və prioritet verilmir.

---

## 1. Yoxlanıla bilməyənlər

Mənbə: `README.md`, 8-ci bölmə (protokolun §0.1-i); `neticeler.md`:1366–1394.

### 1.1 İlk auditin sənədi olmadığı üçün yoxlanıla bilməyənlər

İlk auditin (23.09.2026) hesabatı əlçatan deyil: repozitoriyada yoxdur və sahib onun mətnini verməyib (cavab A2).
Tapşırığın bu hissələri yazıldığı kimi yerinə yetirilə bilməz:

- **"eyni ssenari və eyni hesabat quruluşu: 20 bölmə"** — ilk auditin ssenarisi və 20 bölməsi məlum deyil. Hesabat
  protokolun §7.1-dəki quruluşdan istifadə edir; bu, bu auditin öz quruluşudur.
- **"P0–P3 cədvəli"** və **"İlk auditin hər P0 və P1 tapıntısının vəziyyəti"** — ilk auditin prioritetləri məlum
  deyil, ona görə hansı köhnə tapıntıların P0 və ya P1 olduğunu demək mümkün deyil. Bunun əvəzinə *hər* köhnə tapıntıya
  sübutla vəziyyət verilir (§6.1); onların arasında P0 və P1 olanlar da buna daxildir. P0–P3 cədvəli bu auditin öz
  şkalasından istifadə edir (§7.1).
- **"Klik sayı ilk auditlə müqayisə olunub (3 klik + 3 sürüşdürmə)"** — sayılmış yol məlum deyil. Audit §6.5-dəki
  yolları sayır — bunlar bu auditin öz yollarıdır — və onları "3 + 3"-ün yanına qoyur, yolların fərqli ola biləcəyini
  açıq deyərək. Ona görə bu rəqəmlər eyni yolun müqayisəsi deyil.

(Paraqraf nömrələri protokola, `AI_WORKFLOW/TASKS/TASK-15.md`-yə aiddir.)

### 1.2 Bu qaçışda təxirə salınanlar — DEFERRED_BY_OWNER

Sahib 2026-09-25-də auditin brauzerlə aparılan hissəsini açıq qərarla təxirə saldı (`neticeler.md`:6, 8–17,
1366–1372). `neticeler.md`-nin öz sözləri ilə: «Bu, uğursuzluq deyil, tapıntı da deyil — qərardır.»

| Təxirə salınan | Nə tələb edir | Sətir sayı | Vəziyyət |
|---|---|---|---|
| A-04-ün 5–6-cı addımları — Rəhbər ilə brauzerdə giriş və başlıqda onun adı | brauzer | 1 sətrin iki addımı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| A-05 — sınaq mühiti sıfırlanıb | sınaq mühiti və brauzer | 1 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| B — Köhnə tapıntılar | ekran, en, bugünkü rəqəm | 125 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C — Task 04–16 qəbul şərtləri | ekran müşahidəsi | 68 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D — Sahibin qərarları 4.1 … 16.1 | ekran müşahidəsi | 20 | yoxlanıla bilmədi — DEFERRED_BY_OWNER (15.1, 15.2, 15.2a ön şərtlərə aiddir — bölmə 5) |
| E — Regress: Task 1–3 və ilk auditdə yaxşı olanlar | ekran müşahidəsi | 27 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F — Təsdiq axını (sınaq mühitində) | sınaq mühiti və brauzer | 9 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| G — Klik sayı | brauzer | 2 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H — Ekran enləri | brauzer | 26 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| I — Əvvəlki tasklardan daşınan qeydlər | ekran müşahidəsi | 12 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J — Son vəziyyət | auditin sonunda oxunuş | 8 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| K — Yeni tapıntılar | ekran müşahidəsi | 1 (boş şablon) | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| **B … K cəmi** | | **298** | |

- Bu cədvəldəki heç bir sətir keçdi sayılmır. Heç birinə bu hesabatda hökm və ya prioritet verilmir; onlar nə açıq,
  nə də bağlı sayılır.
- Nəticədə protokolun §7.2-sinin tələb etdiyi ekran şəkilləri — hər G2 rəqəmi və hər P0/P1 bənd üçün — mövcud deyil.

İki siyahı bir-birindən ayrıdır:

- **1.1** ilk auditin sənədi olmadığı üçün (A2) **yoxlanıla bilməz** — heç bir qaçışda.
- **1.2** yoxlanıla bilərdi, amma sahibin qərarı ilə bu qaçışda **aparılmayıb**. Onu davam etdirmək olar
  (`neticeler.md`:1393–1394; bölmə 11, N-01).

---

## 2. Ön şərtlər — G1, G2, G3

Mənbə: A bölməsi (`neticeler.md`:163–418) və dörd əmrin tam çıxışı (`neticeler.md`:424–1362).

### 2.1 G1 — audit ayı

Sahibin cavabı A1, 2026-09-25, sözbəsöz (`AI_WORKFLOW/PLAN.md`, «HD-006 — owner's answers»; protokol §0):

> "October has not begun on 2026-09-25, so under brief 15.1 the last complete real month is September. Confirmed; the
> audit uses it."

A-01: `Get-Date -Format 'yyyy-MM-dd HH:mm'` → **2026-09-25 21:00**. Bu tarix 2026-10-31-dən əvvəldir, ona görə A1
qüvvədədir və audit ayı Sentyabr 2026-dır.

**G1: keçdi** (A-01).

### 2.2 G2 — qiymət təsnifatında açıq sətir yoxdur

| Göstərici | Rəqəm | Mənbə və vaxt | Ekran |
|---|---|---|---|
| «Təsnif edilməyib» | **0** | A-10, Əmr 1, 21:03 | ekrana baxılmayıb, ekran şəkli yoxdur |
| qiyməti yazılmamış «Alış qiyməti tələb olunur» | **0** | A-11, Əmr 1, 21:03 | ekrana baxılmayıb, ekran şəkli yoxdur |
| «Ödənişsiz daxili təminat» | **95**, onlardan 94-ü HD-002-nindir | A-12, Əmr 1 və Əmr 3, 21:03 | ekrana baxılmayıb, ekran şəkli yoxdur |
| qiymət təsnifatı qərarları | **94** | A-12, Əmr 1, 21:03 | ekrana baxılmayıb, ekran şəkli yoxdur |
| importlar — `Imported` | **1**: `#50010  Imported         3619 rows  materialized True` | A-13, Əmr 1 (21:03) və Əmr 3 | ekran yoxdur: sübut əmr çıxışıdır (A-13) |
| importlar — `NeedsReview` | **1**: `#6 «kamran_sifarisler_2026.xlsx» NeedsReview: 2672 row(s), 0 excluded, 88 included row(s) without a price` | A-13, Əmr 1, 21:03 | ekran yoxdur: sübut əmr çıxışıdır (A-13) |
| importlar — `Failed` | **1** | A-13, Əmr 1, 21:03 | ekran yoxdur: sübut əmr çıxışıdır (A-13) |

**G2: keçdi — yalnız əmr sübutu ilə.** «Qiymət təsnifatı» ekranının oxunuşu və G2-nin ekran şəkilləri təxirə salınıb:
A-10, A-11 və A-12-də ekran tərəfi «yoxlanıla bilmədi — ekrana baxılmadı» yazılıb.

- **Task 16a ilə müqayisə.** 16a-nın son qeydə alınmış rəqəmləri 0 / 0 / 95 idi, 94 qərarla (`AI_WORKFLOW/PLAN.md`,
  Task 16a). İndi oxunan rəqəmlər eynidir: **fərq yoxdur**. Əmr 4 də bunu deyir (A-09):
  `[PASS] Qiymət təsnifatı: the three totals are unchanged` — `unresolved 0, price required 0, internal 95`.
- **HD-002 həll olunub** (cavab A4). Onun 94 sətri həll olunmuş sayılır, açıq sətir deyil. Əmr 3 (A-08, A-12):
  `Unresolved → InternalFreeSupply  94 records by Administrator, 2026-09-24 08:03:26–08:04:23 UTC`. Əmr 4 (A-09):
  `[PASS] HD-002: the pricing decisions, the 94 reclassified lines among them, are unchanged` —
  `count 94 → 94, record hash and line hash unchanged`.
- **`Failed` vəziyyətindəki import.** Protokolun §3-ü iki import adlandırır (#50010 və #6), Əmr 1 isə üç sayır
  (`NeedsReview: 1`, `Imported: 1`, `Failed: 1`). Əmr 4 Task 16a-nın baza faylı ilə müqayisədə yazır:
  `[PASS] No import batch, staged row, materialization, correction or resolution changed` —
  `3 batch(es), 6291 row(s) compared by hash`. Deməli, üç import 16a-da da var idi və olduğu kimi qalıb: `Failed`
  import 16a-dan əvvəl yaranıb, audit onu yaratmayıb. Bu, tapıntı deyil.
- `#6` təsdiqlənməyib, `Imported` olan yeganə import `#50010`-dur: protokolun §5.2 və §8-dəki DAYANMA şərti yaranmır
  (A-13).

### 2.3 G3 — üç hissə, hər birinin öz hökmü

**1) Commit və mühit (A-02, A-03): keçdi.**

- HEAD `749ad9d5d31cffbcf7c99ee086ffe8c7fdbd7a6d`.
- `git diff --stat 7550eda HEAD`: 7 fayl, 7279 əlavə, hamısı `docs/audits/2026-final-enver-muellim-audit/` altında.
- `git status --short`: yalnız icazə verilən sətirlər (`?? AI_WORKFLOW/`, `?? monitor-agent.ps1`,
  `?? resume-agent.ps1`, `?? run-agent.ps1`) və auditin öz faylı `?? docs/audits/2026-final-enver-muellim-audit/neticeler.md`.
- Baza: mövcud klaster işə düşdü, yeni klaster yaradılmadı, port 55434.
- API 2026-09-25 21:00-da təzədən başladıldı: `Now listening on: http://localhost:5080`. Frontend:
  `http://localhost:5173`.

**2) Aktiv Rəhbər (A-04): hesab tərəfi keçdi; brauzer tərəfi yoxlanıla bilmədi — DEFERRED_BY_OWNER.**

Tarixçə, `neticeler.md`-də yazıldığı kimi:

- Eyni gün 20:36-da başlayan ilk qaçışda bazada aktiv Rəhbər **yox idi**, ön şərt keçmədi və audit A-04-də dayandı
  (20:36–20:47; `neticeler.md`:5, 19; A-04, Qeyd).
- API-nin o vaxtkı başlanğıcında jurnalda `No active user holds approval authority` xəbərdarlığı var idi (A-03, Qeyd).
- Sahib 2026-09-25-də bir müvəqqəti audit hesabının yaradılmasına **açıq icazə verdi**. Hesab tətbiqin öz dəstəklənən
  yolu ilə yaradıldı: admin sessiyası ilə `POST /api/v1/admin/users`. Identity cədvəllərinə birbaşa SQL yazılmadı.
  Yalnız `Manager` rolu verildi; Admin və ya əlavə rol verilmədi.
- Hesab: `audit.rehber` — «HD-008 audit — Rəhbər (müvəqqəti)», rolu `Manager` (ekranda Rəhbər), aktivdir, yaradılıb
  2026-09-25T16:58:34Z.
- `GET /api/v1/admin/users/approval-authority` → `ActiveApproverCount: 1`. Təsdiq səlahiyyəti olan aktiv istifadəçilərin
  sayı **0 → 1** oldu. 21:00 başlanğıcında xəbərdarlıq artıq çıxmır (A-03).
- Hesabın parolu yaradılarkən yaddaşda təsadüfi qurulub və heç bir fayla, jurnala və ya əmr tarixçəsinə yazılmayıb:
  **onu heç kim bilmir** (A-04, Qeyd; `neticeler.md`:30–31).
- Tətbiq bu hesabı deaktiv etməyi rədd edir: «Bu, təsdiq səlahiyyəti olan yeganə aktiv istifadəçidir»
  (`neticeler.md`:28–29).
- Rəhbər ilə brauzerdə giriş və başlıqda onun adının görünməsi (A-04, 5–6-cı addımlar): **yoxlanıla bilmədi —
  DEFERRED_BY_OWNER**. `neticeler.md`: «bu operator mühitində brauzer yoxdur, giriş edilə bilmədi».

**3) Sınaq mühiti sıfırlanıb (A-05): yoxlanıla bilmədi — DEFERRED_BY_OWNER.** `01-hazirliq.md`, 5-ci bənd icra
edilmədi; sınaq mühiti qurulmadı (A-05, Qeyd).

**G3 bütövlükdə: qismən keçib: 3-cü hissə aparılmayıb.**

A-14 olduğu kimi: «altı ön şərtin altısı da keçdi» — A-01, A-02, A-04, A-10, A-11, A-13. Qeyd: A-05 A-14-ün saydığı
altı ön şərtdən biri deyil. Ona görə A-14-ün «altısı da keçdi» nəticəsi G3-ün sınaq mühiti hissəsinin aparılmadığını
örtmür. A-14-dəki A-04 «keçdi»-si də yalnız hesab tərəfinə aiddir.

### 2.4 Real data haqqında — hədləri ilə

Əmr 4 (`--verify`, A-09) 21:00–21:06 qaçışında, audit hesabı yaradıldıqdan **sonra** işlədildi. Çıxışın yekunu
(`neticeler.md`:1341–1361), sözbəsöz:

```
== Verification ==
  [PASS] No migration is pending, and no STOP condition holds
         nothing pending
  [PASS] 20260925180000_AddImportRowPricingClassification is applied
         latest applied: 20260925180000_AddImportRowPricingClassification
  [PASS] ImportRows has the four classification columns, NULL on every row
         all four exist; 0 row(s) hold a value in them
  [PASS] MUST NOT CHANGE: every recorded figure is identical, key by key
         22.242 identical, 0 different
  [PASS] HD-002: the pricing decisions, the 94 reclassified lines among them, are unchanged
         count 94 → 94, record hash and line hash unchanged
  [PASS] Qiymət təsnifatı: the three totals are unchanged
         unresolved 0, price required 0, internal 95
  [PASS] No order, line, product, variant, alias, object alias, supplier or product-match decision changed
         counts and hashes compared
  [PASS] No import batch, staged row, materialization, correction or resolution changed
         3 batch(es), 6291 row(s) compared by hash
  [PASS] Heydər Əliyev Mərkəzi, 2026-09, «Keçən ay»: the difference is unchanged
         23852.70 → 23852.70

All 9 checks passed. Nothing was changed.
```

- **Əmr 4 nəyi əhatə edir:** sifarişlər, sətirlər, məhsullar, variantlar, alternativ adlar, obyekt adları,
  təchizatçılar, məhsul uyğunluğu qərarları, qiymət təsnifatı qərarları və importlar. 9 yoxlamanın 9-u keçdi:
  22.242 rəqəm eyni, 0 fərqli, HD-002 dəyişməyib.
- **Əmr 4 nəyi əhatə etmir:** istifadəçiləri. Onun müqayisə etdiyi rəqəmlər
  (`tools/BaxOrders.ImportPricingMigration/Invariants.cs`) arasında istifadəçilər yoxdur. Ona görə onun `[PASS]`-ı
  yuxarıdakıların dəyişmədiyini sübut edir, amma istifadəçilər haqqında heç nə demir. İstifadəçi dəyişikliyini A-04-ün
  özü sübut edir.
- Operatorun qeydinə görə audit zamanı real sistemdə **yeganə dəyişiklik** sahibin icazə verdiyi bir istifadəçinin —
  `audit.rehber` — yaradılmasıdır. Heç bir sifariş təsdiqlənmədi, qaytarılmadı, dəyişdirilmədi və ya təsnif edilmədi,
  heç bir import təsdiqlənmədi (`neticeler.md`:24–26).
- Auditin sonunda oxunuş (J bölməsi) aparılmayıb: bölmə 13-ə baxın.

---

## 3. Köhnə tapıntılar

Mənbə: B bölməsi (`neticeler.md`, B-01 … B-125).

Protokolun qaydası (§6.1): hər köhnə tapıntıya vəziyyət verilir — həll olunub / qismən / həll olunmayıb — və hər
vəziyyətin sübutu olur: ekran, en və bugünkü rəqəm.

Bu qaçışda B bölməsinin heç bir sətri aparılmayıb. Ona görə hər sətrin vəziyyəti «yoxlanıla bilmədi —
DEFERRED_BY_OWNER», sübutu «yoxdur». Başlıqlar `neticeler.md`-dən sözbəsöz köçürülüb.

| Sətir | Başlıq | Vəziyyət | Sübut |
|---|---|---|---|
| B-01 | Task 04: «Təsdiq gözləyənlər» boş idi, qərar düymələri görünmədi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-02 | Task 04: axını təhlükəsiz sınamaq üçün mühit yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-03 | Task 04: təsdiqlənmiş sifarişdə status iki dəfə | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-04 | Task 04: panelin mətni qərara kömək etmirdi (Fəvvarələr, Sentyabr 2026) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-05 | Task 04: qərar üçün beş fakt çatışmırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-06 | Task 05: obyekt kodu (LOC-…) — panelin cədvəli | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-07 | Task 05: obyekt kodu (LOC-…) — «Obyektlər» | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-08 | Task 05: obyekt kodu (LOC-…) — mobil kartlar | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-09 | Task 05: obyekt kodu (LOC-…) — obyekt səhifəsinin başlığı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-10 | Task 05: məhsul kodu (PRD-…) — sifariş sətirləri | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-11 | Task 05: "Versiya 1" — sifarişin başlığı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-12 | Task 05: "Versiya 1" — obyekt səhifəsinin cədvəli | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-13 | Task 05: "Sətir sayı" sütunu | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-14 | Task 05: "Server işləyir" başlıqda | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-15 | Task 05: məhsul adının altında "2.8" (Rosmarinus) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-16 | Task 05: məhsul adının altında "20078331" (Columbus 80 BM 100 Şotka) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-17 | Task 05: məhsul adının altında "M-101-S-2" (Yay ayaqqabısı) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-18 | Task 05: vahid ingiliscə — PCS | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-19 | Task 05: vahid ingiliscə — BAG | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-20 | Task 05: vahid ingiliscə — PACK | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-21 | Task 05: vahid ingiliscə — PAIR | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-22 | Task 05: vahid ingiliscə — ROLL | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-23 | Task 05: vahid ingiliscə — L | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-24 | Task 05: vahid ingiliscə — M2 | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-25 | Task 05: vahid ingiliscə — KG | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-26 | Task 05: məbləğ ₼-dan ayrılır — 1366, sifariş sətirləri | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-27 | Task 05: məbləğ ₼-dan ayrılır — telefon | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-28 | Task 05: qiymət 4 onluqla — "32.1273 ₼" (Zibil paketi) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-29 | Task 05: köhnə termin "Yeni sifarişlər" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-30 | Task 05: köhnə termin "Artıq sifariş olunmayanlar" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-31 | Task 05: köhnə termin "mövqe" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-32 | Task 05: köhnə termin "Məlum qiymətlər üzrə məbləğ / cəm" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-33 | Task 05: köhnə termin "Çəkili orta qiymət" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-34 | Task 05: köhnə termin "Tarixçə natamam" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-35 | Task 05: köhnə termin "Son 9 mövcud aydan 3-də" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-36 | Task 05: köhnə termin "Trend" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-37 | Task 05: "Bütün dövr" (düymə) və "Bütün dövrün ortalaması" (nəticə mətni) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-38 | Task 05: "Artıq sifariş olunmur" (filtr) və "Artıq sifariş olunmayanlar" (nişan) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-39 | Task 05: "Qiyməti olmayanlar" («Niyə dəyişib?») və "Qiymət yoxdur" (sətir) | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-40 | Task 05: Nərimanov heykəli obyekt səhifəsi — "məhsul" və "sətir" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-41 | Task 05: sifarişin başlığında "sətir" iki dəfə | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-42 | Task 05: köhnə ifadə "qiymətsiz sifarişlər" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-43 | Task 05: diqqət kartlarında "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-44 | Task 06: hissələrin sırası sabit idi; Fəvvarələrdə əsas səbəb 4-cü sətirdə | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-45 | Task 06: əsas səbəb vurğulanmır | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-46 | Task 06: mənfi zolaq boz idi — Fəvvarələr −8,093.70 | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-47 | Task 06: mənfi zolaq boz idi — Nərimanov heykəli −1,601.06 | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-48 | Task 06: cəm tam tutduğu halda xəbərdarlıq — Fəvvarələr | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-49 | Task 06: cəm tam tutduğu halda xəbərdarlıq — Heydər Əliyev Mərkəzi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-50 | Task 06: cəm tam tutduğu halda xəbərdarlıq — Nərimanov heykəli | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-51 | Task 06: baza məbləğinin adı yox idi — Heydər Əliyev, «Son 6 ayın ortalaması» | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-52 | Task 07: Heydər Əliyev kartı yalnız kateqoriyanı deyirdi; artımın çoxu traktordur | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-53 | Task 07: traktoru görmək üçün sifarişə keçmək lazım idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-54 | Task 07: Fəvvarələr meydanı — ən böyük mal Yay ayaqqabısı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-55 | Task 07: Nərimanov heykəli — ən böyük mal Mərmər bej qalınlığı 2 sm | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-56 | Task 08: ayların cəmi sətri yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-57 | Task 08: qeyri-adi ay gözə çarpmırdı — Heydər Əliyev İyun | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-58 | Task 08: gələcək aylar keçmiş boş aylar kimi görünürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-59 | Task 08: ⚠ faizi əvəz edirdi — Bayıl yolu, Sentyabr | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-60 | Task 08: status nöqtəsinin mənası yalnız siçanla | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-61 | Task 08: 12 aylıq cədvəl yalnız 1280 px-dən enli ekranda | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-62 | Task 08: beşrəqəmli məbləğlər sıx idi — Fəvvarələr | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-63 | Task 08: 1440-da cədvəl kartların hüdudundan çıxırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-64 | Task 09: diqqət kartları birinci ekranın altında idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-65 | Task 09: "Ən böyük məbləğ artımı" iki kartda | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-66 | Task 09: "Ən böyük faiz dəyişməsi" iki kartda | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-67 | Task 09: «Son 3 ayın ortalaması» — faiz kartı ən böyük faizə verilməmişdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-68 | Task 09: qiymət xəbərdarlığı hər kartda cümlə kimi; narıncı çox | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-69 | Task 09: yaşıl rəng xərcin artmasını göstərirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-70 | Task 09: çiplər klik olunmurdu | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-71 | Task 09: sıfır saylı çip görünürdü ("Tarixçə natamam 0") | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-72 | Task 09: qiymət xəbərdarlığından obyektlərə keçid yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-73 | Task 09: cədvəlin varsayılan sırası obyekt adına görə idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-74 | Task 09: 26 / 27 sətir iki səhifəyə bölünürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-75 | Task 09: "Növbəti" basılanda səhifə yuxarı qalxırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-76 | Task 09: "Detallara bax" iki sətrə sınırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-77 | Task 09: qiymət xəbərdarlığı cədvəldə 4 sətir tuturdu | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-78 | Task 09: sifarişdən qayıdanda panel ən yuxarıdan açılırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-79 | Task 09: EXPO olanda fərq ay cəminin altında dururdu | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-80 | Task 10: həm miqdarı, həm qiyməti dəyişən mal yalnız «Miqdar təsiri» alırdı — Zibil paketi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-81 | Task 10: Heydər Əliyev Sentyabr — iki səhifədə iki fərqli say | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-82 | Task 10: Fəvvarələr — «Hamısı 100», sifarişdə 76 sətir, izah yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-83 | Task 10: tarixçənin qrafiki əyri xətlə çəkilirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-84 | Task 10: Traktorun miqdar oxu 0.25 addımla gedirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-85 | Task 10: Şampun qabın tarixçəsində X oxunda Avqust yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-86 | Task 10: «Orta qiymət» xətti qrafikin üst kənarına yapışırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-87 | Task 10: tarixçə pəncərəsində sürüşdürəndə arxa səhifə də sürüşürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-88 | Task 10: tarixçədə miqdarın ortaya nisbəti yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-89 | Task 10: tarixçədə təchizatçı yox idi — Traktor | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-90 | Task 11: «Obyektlər»-də «Dəyişmə» rəngsiz idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-91 | Task 11: «Dəyişmə»-nin nəyə görə hesablandığı yazılmırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-92 | Task 11: Nərimanov heykəli — mini qrafikdə "İyu İyu" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-93 | Task 11: Nərimanov heykəli — mini qrafikin sütunlarında rəqəm yox idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-94 | Task 11: sifarişi olmayan obyektə keçəndə baza itirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-95 | Task 11: Nərimanov heykəli — daxili təminat sayı görünmürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-96 | Task 11: Heydər Əliyev — "15"-in bütün tarixçəyə aid olduğu yazılmırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-97 | Task 11: müqayisə səhifəsinin siyahısı əlifba sırası ilə idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-98 | Task 11: müqayisədə fərq pulla yox, miqdarla göstərilirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-99 | Task 11: müqayisə səhifəsi Excel təsiri bağışlayırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-100 | Task 11: Rəhbər hansı səhifəyə baxmalı olduğunu bilmirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-101 | Task 11: müqayisə səhifəsi rəqəmləri ayrı qayda ilə hesablayırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-102 | Task 12: telefonda başlıq 3 sətrə sınırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-103 | Task 12: telefonda aylıq hesabat yalnız bir ayı göstərirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-104 | Task 12: telefonda sətirlər cədvəli 810 px idi, yana sürüşdürmək lazım gəlirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-105 | Task 12: telefonda qərar paneli «Niyə dəyişib?»-dən əvvəl gəlirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-106 | Task 12: telefonda qərar düymələri ekranın altında sabit deyildi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-107 | Task 12: telefonda ⓘ toxunanda açılmırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-108 | Task 12: masaüstündə ⓘ-yə klik də heç nə açmırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-109 | Task 13: Heydər Əliyev Sentyabr — "Sabun elano" «artıq sifariş olunmur» kimi görünürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-110 | Task 13: Heydər Əliyev Sentyabr — "Sabun elano lavanda ətirli" «yeni» kimi görünürdü | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-111 | Task 13: iki Sabun arasında əlaqə yox idi; «Niyə dəyişib?»-də iki hissə 750 ₼ artırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-112 | Task 13: eyni mal fərqli yazılırdı — boşluq fərqi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-113 | Task 13: eyni mal fərqli yazılırdı — "15 W" / "15W" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-114 | Task 13: eyni mal fərqli yazılırdı — "3/4" / "3\4" | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-115 | Task 13: «Məhsullar» səhifəsində "Bu bölmə hələ hazırlanır" yazılırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-116 | Task 14: audit «Administrator» hesabı ilə aparılmışdı; Rəhbər hesabı yoxlanmamışdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-117 | Task 14: Rəhbərin menyusunda «Excel importları» var idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-118 | Task 14: Rəhbərin menyusunda «İstifadəçilər» var idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-119 | Task 14: Rəhbərin menyusunda «Məhsullar» var idi və "hazırlanır" yazırdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-120 | Task 14: «Qiymət təsnifatı» Rəhbərin menyusunda idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-121 | Task 14: «Təchizatçılar»-ın Rəhbərə lazım olub-olmadığı müəyyən deyildi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-122 | Task 15: «Xeyr» səbəbi 1 — rəqəmlər ekranlar arasında sabit deyildi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-123 | Task 15: «Xeyr» səbəbi 2 — qiymət xəbərdarlıqları etibarsız idi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-124 | Task 15: «Xeyr» səbəbi 3 — təsdiq addımı yoxlanılmamışdı | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |
| B-125 | Task 15: «Xeyr» səbəbi 4 — əsas səbəb mal adı ilə deyilmirdi | yoxlanıla bilmədi — DEFERRED_BY_OWNER | yoxdur |

### 3.1 İlk auditin dörd "Xeyr" səbəbi

Brief (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem»), sözbəsöz: «İlk auditin (23.09.2026) yekun
cavabı "Xeyr" idi. Səbəblər və onları həll edən tasklar:»

1. «Rəqəmlər ekranlar arasında sabit deyildi: baza itirdi, saylar fərqli idi — Task 1, 1b, 1c, 3.» Xülasə sətri
   **B-122**; tasklar 1, 1b, 1c və 3. Bu gün vəziyyəti yoxlanılmayıb: B-122 və onun istinad etdiyi sətirlər təxirə
   salınıb.
2. «Qiymət xəbərdarlıqları etibarsız idi: 94 sətir təsnifatsız idi, daxili təminat bir ekranda səhv sayılırdı — Task 2
   və təsnifat işi.» Xülasə sətri **B-123**; Task 2 və təsnifat işi. Bu gün vəziyyəti yoxlanılmayıb: B-123 və onun
   istinad etdiyi sətirlər təxirə salınıb. Kontekst üçün, hökm kimi yox: əmrlərə görə «Təsnif edilməyib» 0-dır və 94
   sətir HD-002 ilə həll olunub (bölmə 2.2). Bu, B-123-ü yoxlamır: o, ekranlardakı xəbərdarlıqları soruşur, heç bir
   ekrana isə baxılmayıb.
3. «Təsdiq addımı yoxlanılmamışdı — Task 4.» Xülasə sətri **B-124**; Task 4. Bu gün vəziyyəti yoxlanılmayıb: B-124 və
   onun istinad etdiyi sətirlər təxirə salınıb. Təsdiq axını bu qaçışda da sınaq mühitində aparılmayıb (A-05, F; bölmə
   7).
4. «Əsas səbəb mal adı ilə deyilmirdi — Task 7.» Xülasə sətri **B-125**; Task 7. Bu gün vəziyyəti yoxlanılmayıb:
   B-125 və onun istinad etdiyi sətirlər təxirə salınıb.

**Brifin 2-ci qəbul şərti yerinə yetirilməyib.** İlk auditin tapıntılarının heç birinin bu gün sübutu yoxdur; ona
görə onun P0 və P1 tapıntılarının da — hansılar olursa olsun — sübutu yoxdur.

---

## 4. Task 04–16 qəbul şərtləri

Mənbə: C bölməsi (`neticeler.md`, C-01 … C-68). Başlıqlar sözbəsöz.

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| C-01 | Task 04: sınaqda növbədə bir test sifarişi; real 27 obyektdə heç nə dəyişməyib | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-02 | Task 04: qərar düymələri təhlilə baxarkən görünən qalır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-03 | Task 04: səbəbsiz qaytarmaq olmur; səbəblə qaytarılır; ikinci göndəriş və səbəb görünür | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-04 | Task 04: kim və nə vaxt təsdiqləyib; status bir dəfə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-05 | Task 04: təsdiq səlahiyyəti olmayan admin təsdiqləyə bilmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-06 | Task 04: Rəhbər təsdiqləyə bilir; ara dövr yoxdur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-07 | Task 04: köhnə Excel sifarişində "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-08 | Task 05: panel, sifariş və obyekt səhifəsində LOC/PRD kodu, "Versiya", "Server işləyir" yoxdur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-09 | Task 05: Fəvvarələrdə "71 → 0 ədəd" və 2 onluqlu qiymət | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-10 | Task 05: 1366-da və telefonda məbləğ ₼-dan ayrılmır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-11 | Task 05: «Yeni məhsullar», «Bu ay yazılmayan məhsullar», «Müqayisə üçün data azdır» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-12 | Task 05: fərqli söz cütlərinin heç biri qalmayıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-13 | Task 05: Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-14 | Task 06: Fəvvarələrdə birinci hissə «Bu ay yazılmayan məhsullar», yaşıl, seçilir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-15 | Task 06: Heydər Əliyevdə birinci hissə «Yeni məhsullar», qırmızı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-16 | Task 06: cəm tutanda ziddiyyətli xəbərdarlıq yoxdur; qiymətsiz sətir olanda konkret | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-17 | Task 06: müqayisə sətrində baza oxunur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-18 | Task 07: Heydər Əliyev kartında traktor, məbləğ və pay; pay sərhədi keçmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-19 | Task 07: Fəvvarələr kartında "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)"; pay ≤ 25 % | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-20 | Task 07: baza dəyişəndə pay yenilənir və heç yerdə 100 %-i keçmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-21 | Task 08: cəmi sətri — Yanvar … Sentyabr və İl; Sentyabr panellə eyni; faiz yoxdur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-22 | Task 08: Heydər Əliyev İyun 36,010.19 vurğulanır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-23 | Task 08: Heydər Əliyev Avqust 11,985.02 vurğulanmır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-24 | Task 08: Heydər Əliyev Yanvar, Fevral, Mart vurğulanmır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-25 | Task 08: Oktyabr–Dekabr "sifariş yoxdur" demir, fərqlənir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-26 | Task 08: Bayıl yolu Sentyabr — həm ⚠1, həm faiz | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-27 | Task 08: 1200 px-də 12 aylıq cədvəl | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-28 | Task 09: 1366 × 768-də sürüşdürmədən ən azı bir diqqət kartı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-29 | Task 09: kart başlığı təkrarlanmır; "ən böyük faiz" kartı həqiqətən ən böyük faizlidir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-30 | Task 09: Heydər Əliyev kartında artım qırmızı, Fəvvarələrdə azalma yaşıl; "xərc artıb / azalıb" | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-31 | Task 09: «Qiymət yoxdur · 10 obyekt» çipi cədvəldə həmin 10 obyekti saxlayır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-32 | Task 09: 27 obyekt bir səhifədə, ən böyük dəyişmədən başlayır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-33 | Task 09: Heydər Əliyev kartından sifarişə keçib qayıdanda kartın yanına dönür | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-34 | Task 09: «Keçən ay»-da başlıqdakı çıxma göstərilən fərqə bərabərdir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-35 | Task 10: Zibil paketi sətrində miqdar və qiymət payı ayrıca | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-36 | Task 10: Nitroamafoska +870 qırmızı, Yay ayaqqabısı −1,988 yaşıl | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-37 | Task 10: Heydər Əliyev Sentyabr — "yeni məhsul" sayı bir; «Hamısı»-nın nəyi saydığı yazılıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-38 | Task 10: Şampun qabın tarixçəsində oxda Avqust, qrafik düz xətlərlə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-39 | Task 10: Traktorun tarixçəsində ox 0 və 1, təchizatçı yazılıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-40 | Task 10: tarixçəni sürüşdürəndə arxa səhifə tərpənmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-41 | Task 11: Nərimanov heykəli — ay adları təkrarlanmır, sütunlarda məbləğ | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-42 | Task 11: paneldə «Son 3 ay» → sifarişi olmayan obyekt → obyekt səhifəsi də «Son 3 ay» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-43 | Task 11: Nərimanovda "Qiymət yoxdur 1 · Daxili təminat 1"; Heydər Əliyevdə "15"-in dövrü yazılıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-44 | Task 11: «Obyektlər»-də dəyişmə xərcin istiqamətinə görə rəngli, bazası yazılıb | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-45 | Task 11: ayrıca müqayisə səhifəsi yoxdur; «Müqayisə» həmin sifarişin təhlilini açır, baza saxlanılır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-46 | Task 12: telefonda başlıq bir sətir; Task 5-in məbləğ qaydası işləyir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-47 | Task 12: telefonda bir obyektin 12 aylıq gedişatı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-48 | Task 12: telefonda sətirlər yana sürüşdürmədən oxunur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-49 | Task 12: Task 4-ün test sifarişi telefonda — təhlil, düymələr ekranın altında | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-50 | Task 12: ⓘ-yə toxunanda izah açılır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-51 | Task 13: Sabun lavanda "Sabun elano"-nun variantı kimi təklif olunur; sistem özü heç nə etmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-52 | Task 13: admin təsdiqindən sonra ayrı variantlar, bir mala birləşmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-53 | Task 13: bir «variant dəyişib» sətri, 0.00 ₼; iki hissənin hər biri 750.00 ₼ azalır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-54 | Task 13: təsdiqə qədər iki mal ayrı sətirlərdə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-55 | Task 13: "15 W" / "15W" təsdiqindən sonra tarixçədə bir mal | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-56 | Task 13: Rəhbər hesabı ilə təklifi təsdiqləmək olmur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-57 | Task 13: heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-58 | Task 13: səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-59 | Task 14: Rəhbərin menyusunda yalnız beş bölmə; başlıqda "Administrator" yoxdur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-60 | Task 14: «Təchizatçılar»-da Rəhbər heç nəyi dəyişə bilmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-61 | Task 14: qiymət xəbərdarlığından «Qiymət təsnifatı» açılır, amma dəyişmək olmur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-62 | Task 14: «Excel importları» və «İstifadəçilər» birbaşa ünvanla da açılmır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-63 | Task 14: admin bütün bölmələri görür; təsdiq səlahiyyəti yoxdursa, təsdiqləyə bilmir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-64 | Task 16: sınaqda import edəndə yoxlama "N sətirdə qiymət yoxdur" deyir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-65 | Task 16: yoxlamada təsnif edilənlər seçilən vəziyyətlə, qalanları «Təsnif edilməyib», saylar dəqiq tutur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-66 | Task 16: import zamanı verilən təsnifatı sonradan dəyişmək olur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-67 | Task 16: heç bir sətir mənbəyə görə avtomatik təsnif olunmur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| C-68 | Task 16: import ekranında və qalan ekranlarda eyni sözlər | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

Bu qaçışda Task 04–16-nın qəbul şərtlərindən heç biri yoxlanılmayıb.

---

## 5. Sahibin qərarları 4.1 … 16.1

Mənbə: D bölməsi (`neticeler.md`, D-01 … D-20). Başlıqlar sözbəsöz.

Başlığı 15.1, 15.2 və ya 15.2a qərarını adlandıran sətir ön şərtə aiddir və onun vəziyyəti ön şərtin vəziyyətidir
(bölmə 2). D-17-nin başlığı iki şey adlandırır — ay və təsdiq axını üçün test sifarişi. Ay hissəsini G1 daşıyır; test
sifarişi hissəsi sınaq mühitinə aiddir (A-05, F) və təxirə salınıb. Ona görə D-17-nin vəziyyəti iki hissədə yazılır.
Qalan sətirlər təxirə salınıb.

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| D-01 | Qərar 4.1: Excel-dən gəlmiş sifarişdə "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-02 | Qərar 4.2: düzəliş tələb edəndə səbəb məcburidir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-03 | Qərar 4.3: təsdiqi yalnız Rəhbər edir; admin olmaq təsdiq hüququ vermir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-04 | Qərar 4.3a: Rəhbər rolu Task 4-də yaradılıb; Task 14 onun menyusunu tətbiq edir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-05 | Qərar 5.1: təsdiqlənmiş termin cədvəli | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-06 | Qərar 7.1: pay eyni istiqamətdəki təsirlərin cəminə görə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-07 | Qərar 7.1a: pay — top məhsulun təsiri / eyni istiqamətdəki bütün məhsul təsirləri | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-08 | Qərar 8.1: aylıq hesabatın cəmi sətrində aydan-aya faiz yoxdur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-09 | Qərar 8.2: anomaliya — əvvəlki 3 mövcud ayın ortalamasından ±50 %-dən çox | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-10 | Qərar 9.1: xərc artımı qırmızı, azalma yaşıl — xərcin istiqaməti kimi | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-11 | Qərar 11.1: ayrıca obyekt müqayisə səhifəsi sifariş səhifəsinə birləşdirilib | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-12 | Qərar 13.1: ətir, rəng, ölçü fərqi ayrı variant kimi qalır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-13 | Qərar 13.1a: təsdiqlənmiş variant keçidi bir «variant dəyişib» sətridir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-14 | Qərar 13.2: uyğunluqları yalnız admin və ya data idarəçisi təsdiqləyir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-15 | Qərar 14.1: Təchizatçılar yalnız baxış; Qiymət təsnifatı menyuda yox, xəbərdarlıqdan yalnız baxış | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-16 | Qərar 14.2: ayrıca Rəhbər rolu | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| D-17 | Qərar 15.1: ən son tam real ay və təsdiq axını üçün ayrıca test sifarişi | ay hissəsi: ön şərt G1-ə aiddir — **keçdi** (A-01, sahibin A1 cavabı; bölmə 2.1). Test sifarişi hissəsi: yoxlanıla bilmədi — DEFERRED_BY_OWNER (A-05, F) |
| D-18 | Qərar 15.2: auditdən əvvəl qiymət təsnifatında açıq sətir qalmır | ön şərt G2-yə aiddir — **keçdi, yalnız əmr sübutu ilə** (A-10, A-11; Əmr 1, 21:03); ekrana baxılmayıb (bölmə 2.2) |
| D-19 | Qərar 15.2a: qiyməti yazılmamış «Alış qiyməti tələb olunur» sətirləri də açıqdır | ön şərt G2-yə aiddir — **keçdi, yalnız əmr sübutu ilə** (A-11; Əmr 1, 21:03: 0); ekrana baxılmayıb (bölmə 2.2) |
| D-20 | Qərar 16.1: qiymət təsnifatı import yoxlamasında da edilir və sonradan düzəldilir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

---

## 6. Regress — Task 1–3 və ilk auditdə yaxşı olanlar

Mənbə: E bölməsi (`neticeler.md`, E-01 … E-27). Başlıqlar sözbəsöz.

Brifin «Mütləq qorunmalı davranışlar» nümunələri, sözbəsöz (`BRIEFS/TASK-15.md`) — bu qaçışda yoxlanılmayanlar
bunlardır:

> Yoxlanacaq nümunələr:
> - **Task 1:** Heydər Əliyev, "Son 3 ay" — panel kartı və sifariş səhifəsi eyni rəqəmi göstərir; "Geri" bazanı qaytarır.
> - **Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti; "Keçən ay" bazasında EXPO ayrıca.
> - **Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir.
> - **Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza".
> - **Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama.
> - **İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür.
>
> (Sentyabr nümunələri Sentyabr datası ilə yoxlanır; audit Oktyabrla aparılsa da, bu regress yoxlamaları Sentyabr üzərindən edilir.)

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| E-01 | Task 1: Heydər Əliyev Mərkəzi, «Son 3 ayın ortalaması» — panel və sifariş səhifəsi | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-02 | Task 1: brauzerin «Geri» düyməsi bazanı qaytarır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-03 | Task 1b: başlıq cədvəlin cəmi ilə eynidir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-04 | Task 1b: «Sifariş qeydə alınmayıb» altında Puşkin parkı və Təmir-tikinti | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-05 | Task 1b: «Keçən ay» bazasında EXPO ayrıca | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-06 | Task 1c: Heydər Əliyev Mərkəzi — hər sətirdə baza + fərq = cari | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-07 | Task 1c: Heydər Əliyev Mərkəzi — hissələrin cəmi «Cəmi»yə bərabərdir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-08 | Task 1c: Fəvvarələr meydanı — hər sətirdə baza + fərq = cari | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-09 | Task 1c: Fəvvarələr meydanı — hissələrin cəmi «Cəmi»yə bərabərdir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-10 | Task 1c: Nərimanov heykəli — hər sətirdə baza + fərq = cari | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-11 | Task 1c: Nərimanov heykəli — hissələrin cəmi «Cəmi»yə bərabərdir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-12 | Task 2: Nərimanov heykəli, Sentyabr — İdarəetmə paneli | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-13 | Task 2: Nərimanov heykəli, Sentyabr — Aylıq hesabat | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-14 | Task 2: Nərimanov heykəli, Sentyabr — Obyektlər | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-15 | Task 2: Nərimanov heykəli, Sentyabr — obyekt səhifəsi | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-16 | Task 2: Nərimanov heykəli, Sentyabr — sifariş səhifəsi | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-17 | Task 2: təchizatçı «Daxili: Azpetrol baza» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-18 | Task 3: 27 obyekt | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-19 | Task 3: «24 / 27» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-20 | Task 3: Çadır «Sistemdə hələ sifarişi yoxdur» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-21 | Task 3: tam adlar | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-22 | Task 3: düzgün sıralama | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-23 | İlk auditdə yaxşı olan: «Niyə dəyişib?» cəmi tutur | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-24 | İlk auditdə yaxşı olan: yığcam məhsul sətri | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-25 | İlk auditdə yaxşı olan: «Son 9 ayın 3-də…» sətri | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-26 | İlk auditdə yaxşı olan: 12 ay bir ekrana sığır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| E-27 | İlk auditdə yaxşı olan: «Qaralama» heç yerdə görünmür | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

**Task 3 haqqında qeyd.** Brifin Task 3 nümunəsi "27 obyekt" deyir. Əmr 3 (A-08) `== Catalogue — 27 objects (27
active, 26 with order history) ==` çap edib. Bu, kataloqdakı saydır, ekrandakı "24 / 27" deyil, ona görə **E-18 və
E-19-u yoxlamır**; yalnız kontekst kimi verilir. Sətirlərin vəziyyəti dəyişmir.

---

## 7. Təsdiq axını (sınaq mühitində)

Mənbə: F bölməsi (`neticeler.md`, F-01 … F-09). Başlıqlar sözbəsöz.

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| F-01 | Sifariş göndərilir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-02 | Sifariş «Təsdiq gözləyənlər»-də görünür | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-03 | Rəhbər sifarişə baxır | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-04 | Rəhbər səbəblə «Düzəliş tələb et» seçir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-05 | Göndərən düzəldib yenidən göndərir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-06 | Rəhbər təsdiqləyir | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-07 | Səbəbsiz «Düzəliş tələb et» qəbul olunmur (4.2) | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-08 | Təsdiq səlahiyyəti olmayan admin təsdiqləyə bilmir (4.3) | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| F-09 | Bütün axın telefonda, 390 × 844 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

Sınaq mühiti qurulmayıb (A-05), ona görə brifin 15.1-dəki təsdiq axını — ayrıca test sifarişi ilə, Task 4-ün test
mühitində — **aparılmayıb**. Deməli, protokolun §9-unun 7-ci bəndi yerinə yetirilməyib və yekun cavab qaydasının
üçüncü şərti — «təsdiq axını başdan sona işləyib» — ödənmir (bölmə 14).

---

## 8. Klik sayı

Mənbə: G bölməsi (`neticeler.md`, G-01 … G-02). Başlıqlar sözbəsöz.

| Sətir | Başlıq | Bu audit | İlk audit (brief) |
|---|---|---|---|
| G-01 | K1, real data: paneldən Heydər Əliyev Mərkəzinin Sentyabr sifarişinə | sayılmayıb — DEFERRED_BY_OWNER | "3 klik + 3 sürüşdürmə" |
| G-02 | K2, sınaq: paneldən test sifarişinin təsdiqinə | sayılmayıb — DEFERRED_BY_OWNER | "3 klik + 3 sürüşdürmə" |

İlk auditin rəqəmi brifdəndir: «ilk auditdə: 3 klik + 3 sürüşdürmə». İlk auditdə sayılmış yol məlum deyil (bölmə 1.1):
K1 və K2 bu auditin öz yollarıdır və sayılsaydılar belə, eyni yolun müqayisəsi olmazdı. Bu qaçışda isə heç biri
sayılmayıb.

**Brifin 3-cü qəbul şərti yerinə yetirilməyib.**

---

## 9. Ekran enləri

Mənbə: H bölməsi (`neticeler.md`, H-01 … H-26). Başlıqlar sözbəsöz.

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| H-01 | İdarəetmə paneli, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-02 | İdarəetmə paneli, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-03 | Aylıq hesabat, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-04 | Aylıq hesabat, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-05 | Obyektlər, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-06 | Obyektlər, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-07 | Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-08 | Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-09 | Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-10 | Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-11 | «Məhsul tarixçəsi» pəncərəsi, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-12 | «Məhsul tarixçəsi» pəncərəsi, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-13 | Təsdiq gözləyənlər, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-14 | Təsdiq gözləyənlər, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-15 | Təchizatçılar, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-16 | Təchizatçılar, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-17 | Qiymət təsnifatı, 1366 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-18 | Qiymət təsnifatı, 1440 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-19 | İdarəetmə paneli, 390 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-20 | İdarəetmə paneli, 1200 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-21 | Aylıq hesabat, 390 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-22 | Aylıq hesabat, 1200 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-23 | Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 390 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-24 | Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1200 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-25 | Heydər Əliyev Mərkəzinin obyekt səhifəsi, 390 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| H-26 | Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1200 | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

Bu qaçışda heç bir ekran 1366, 1440, 390 və ya 1200 enində oxunmayıb.

---

## 10. Əvvəlki tasklardan daşınan qeydlər

Mənbə: I bölməsi (`neticeler.md`, I-01 … I-12) və protokolun §3-dəki daşınan qeydlər. Hər qeyd I sətrinə başlığına
görə uyğunlaşdırılıb; başlıqlar sözbəsöz.

| Daşınan qeyd (protokol §3) | Sətir | Başlıq | Vəziyyət |
|---|---|---|---|
| 16b: import ekranlarında qalan texniki söz — "Bu mərhələdə sorğu yaradılmır" | I-01 | Import ekranı: "Bu mərhələdə sorğu yaradılmır" | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: «staging» | I-02 | Import ekranı: «staging» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: "Sifariş siyahıları növbəti mərhələdə əlavə olunacaq" | I-03 | Import ekranı: "Sifariş siyahıları növbəti mərhələdə əlavə olunacaq" | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: «Mövcud sorğu» | I-04 | Import ekranı: «Mövcud sorğu» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: «Versiya» | I-05 | Import ekranı: «Versiya» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: «Ö/v» | I-06 | Import ekranı: «Ö/v» | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: `vərəq:sətir` | I-07 | Import ekranı: `vərəq:sətir` istinadı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16b: düymə yazılışı Qiymət təsnifatında və import tabında fərqlidir | I-08 | İki yerdə fərqli düymə yazılışı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 16a: Təchizatçılar səhifəsindəki NotRequired pəncərəsi etdiyindən çoxunu deyir | I-09 | Təchizatçılar: «Qiymət tələb olunmur» pəncərəsinin mətni | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 14: Rəhbərin aça bildiyi qiymət səhifəsində məhsul kodu və vərəq:sətir istinadı | I-10 | Qiymət təsnifatı: məhsul kodu və vərəq:sətir istinadı | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| 13c: Sabun variant əlaqəsi təsdiqlənəndən sonra HEM Sentyabr «Keçən ay» +23,852.70 olmalıdır | I-11 | Heydər Əliyev Mərkəzi, Sentyabr, «Keçən ay»: +23,852.70 | yoxlanıla bilmədi — DEFERRED_BY_OWNER (ekrana baxılmayıb). Əmrə görə qeydin şərti hələ yaranmayıb — aşağıya baxın |
| 12: telefonda yoxlama, 390 × 844, operatora qalmışdı | I-12 | Telefonda yoxlama, 390 × 844 | yoxlanıla bilmədi — DEFERRED_BY_OWNER; **açıq qalır** |

**I-11 (13c qeydi) — əmrin göstərdiyi.** Sabun variant əlaqəsi təsdiqlənməyib: Əmr 2 (A-07) —
`ProductMatchDecisions: exists, 0 row(s)`, `Live decisions read: 0`. Əlaqə yalnız təklif olunub: `YES — suggested with
the label «lavanda ətirli».` Ona görə qeydin şərti («təsdiqlənəndən sonra») hələ yaranmayıb. Əmr 2 HEM Sentyabr
«Keçən ay»-ı belə çap edir: `Order #154, version 1, Approved`; `Current +35,837.72, baseline +11,985.02, difference
+23,852.70 (the brief: +23,852.70)`. Əmr 4 (A-09): `23852.70 → 23852.70`. Ekrana baxılmayıb.

**I-12 (Task 12 qeydi) açıq qalır.** Telefonda 390 × 844 yoxlaması — Task 4-ün test sifarişi daxil — bu qaçışda da
aparılmayıb.

---

## 11. Yeni tapıntılar

Mənbə: K bölməsi (`neticeler.md`, K-01) və A bölməsinin qeydə alınmış sübutu.

K bölməsi təxirə salınıb, ona görə ekranda müşahidə edilmiş heç bir yeni tapıntı yoxdur. K bölməsində yalnız boş
şablon var:

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| K-01 | <qısa başlıq> | boş şablondur, doldurulmayıb — DEFERRED_BY_OWNER |

Aşağıdakı iki tapıntı ekrandan yox, qeydə alınmış sübutdan gəlir. Hər biri yalnız təklif olunur: heç nə düzəldilmir və
onlar üçün `TASKS/` faylı yazılmır (protokol §7.3).

### N-01 — Real sistemdə təsdiq qərarını verə biləcək şəxs yoxdur

- **Nə:** auditdən əvvəl real sistemdə təsdiq səlahiyyəti olan aktiv istifadəçi yox idi. İndi yeganə belə istifadəçi
  müvəqqəti `audit.rehber` hesabıdır, onun parolunu isə heç kim bilmir.
- **Sübut:**
  - A-03: audit hesabı yaradılmazdan əvvəlki API başlanğıcında jurnalda `No active user holds approval authority`
    xəbərdarlığı var idi;
  - A-04: `ActiveApproverCount` 0 → 1, yalnız müvəqqəti `audit.rehber` hesabı sayəsində; ilk qaçış (20:36–20:47) məhz
    buna görə dayandı;
  - A-04, Qeyd: bu hesabın parolunu heç kim bilmir;
  - `neticeler.md` banneri (28–29): tətbiq hesabı deaktiv etməyi rədd edir — «Bu, təsdiq səlahiyyəti olan yeganə
    aktiv istifadəçidir».
- **Ekran və en:** yoxdur. Bu, ekran oxunuşu deyil, qeydə alınmış server və hesab sübutudur.
- **Rəqəm:** təsdiq səlahiyyəti olan aktiv istifadəçilər (`ActiveApproverCount`) — auditdən əvvəl 0, indi 1
  (`audit.rehber`).
- **Sahəyə cavabdeh task:** Task 04. Rəhbər rolunu və təsdiq səlahiyyətini o yaradıb (4.3, 4.3a). Onun
  `AI_WORKFLOW/PLAN.md`-dəki go-live qeydi API həmin commit-də yenidən başladılmazdan əvvəl aktiv "Rəhbər"
  istifadəçisinin olmasını tələb edirdi.
- **Prioritet, bu auditin şkalası ilə: P0.**
  - Protokolun §7.1-inə görə P0-a "təsdiq axınının bir addımı alınmır" daxildir.
  - Bu gün real sistemdə admin əvvəlcə parolu sıfırlamadan və ya hesab yaratmadan heç kim təsdiq addımını yerinə
    yetirə bilməz.
- **Təklif olunan iş — kod dəyişikliyi deyil.** Sahibin operatoru «İstifadəçilər» səhifəsində:
  1. Ənvər müəllimin öz Rəhbər hesabını yaradır (və ya mövcud hesabı aktivləşdirir);
  2. sonra `audit.rehber`-i deaktiv edir. Tətbiq onu yalnız yeganə təsdiqləyici olduğu üçün rədd edib; başqa
     təsdiqləyici aktiv olandan sonra bu mane aradan qalxır.

  Hesabat yalnız təklif edir; heç nə etmir.
- **Söz seçimi.** Qeydlər yalnız bunu deyir: təsdiq səlahiyyəti olan aktiv istifadəçi yox idi. Onlar Ənvər müəllimin
  qeyri-aktiv və ya Rəhbər olmayan hesabının olub-olmadığını demir; ona görə bu hesabat onun hesabının olmadığını
  demir.

### N-02 — Frontend testlərinin ilk qaçışında bir test vaxt həddini keçdi

- **Nə:** 15b-də `npm run --prefix frontend/bax-orders-web test`-in ilk qaçışı qırmızı oldu: bir test 20000 ms
  həddini keçdi. Kod `7550eda`-dan bəri dəyişməyib. Eyni əmrin dərhal təkrarı yaşıl oldu. Hər iki qaçışın xülasəsi
  bölmə 13-dədir.
- **Test:** `src/pages/OrderDecisionPage.test.tsx > the drivers > lists the products when none moved money but some
  were compared` — `Error: Test timed out in 20000ms.`
- **Ekran və en:** yoxdur. Bu, test dəstidir, Rəhbərin ekranı deyil.
- **Rəqəm:** ilk qaçış `Tests  1 failed | 956 passed (957)`; təkrar `Tests  957 passed (957)`.
- **Sahəyə cavabdeh task:** Task 11 — testin öz şərhi qərar 11.1-ə istinad edir (`OrderDecisionPage.test.tsx`:613).
- **Prioritet, bu auditin şkalası ilə: P3.** Rəhbərin istifadə etdiyi heç bir ekrana və rəqəmə təsir etmir; test
  dəstinin etibarlılığına aiddir.
- **Təklif olunan iş:** bu testin yük altında niyə 20 saniyəni keçdiyini araşdırmaq. Hesabat yalnız təklif edir; heç
  nə düzəldilmir.

Başqa yeni tapıntı yoxdur. Təxirə salınmanın yaratdığı boşluqlar tapıntı kimi yazılmır: onlar bölmə 1.2-dədir.

---

## 12. P0–P3 cədvəli

Mənbə: B, C, D, E, F, G, H, I, K bölmələri — hər açıq bənd, köhnə və yeni.

**Bu auditin P0–P3 şkalası** (ilk auditin şkalası məlum deyil). Prioritet bəndin Rəhbərin təsdiq qərarına təsirinə
görə verilir (protokol §7.1):

- **P0** — Rəhbərin gördüyü rəqəm səhvdir və ya eyni rəqəm başqa ekranda fərqlidir; ya da Rəhbər real datanı Task
  14-ün dəyişə bilməməli dediyi şəkildə dəyişə bilir; ya da təsdiq axınının bir addımı alınmır.
- **P1** — qərar verilə bilir, amma tapşırıqdakı qəbul şərtlərindən biri və ya sahibin qərarı (4.1 … 16.1) yerinə
  yetirilməyib; ya da Rəhbərin yolundakı söz, rəng və ya xəbərdarlıq yanıldır.
- **P2** — Rəhbəri yavaşladır və ya çaşdırır, amma yanıltmır: dörd endən birində düzülüş xətası, artıq kliklər,
  texniki söz.
- **P3** — kosmetik, və ya Rəhbərin istifadə etmədiyi ekranda.

Sübutu olan hər açıq bənd:

| Bənd | Qısa təsvir | Prioritet | Sübut | Cavabdeh task |
|---|---|---|---|---|
| N-01 | Real sistemdə təsdiq qərarını verə biləcək şəxs yoxdur: yeganə təsdiqləyici müvəqqəti `audit.rehber`-dir, parolunu heç kim bilmir | **P0** | A-03, A-04, `neticeler.md`:28–31 | Task 04 |
| N-02 | Frontend testlərinin ilk qaçışında bir test vaxt həddini keçdi; təkrar yaşıl | **P3** | bölmə 13, test xülasələri | Task 11 |

B, C, D, E, F, G, H və I bölmələrinin sətirlərinə **prioritet verilmir**, çünki onlar yoxlanılmayıb. Yoxlanılmamış
sətir nə açıq, nə də bağlı sayılır. Onlar bölmə 3–10-da öz nömrələri ilə sadalanıb.

---

## 13. Son vəziyyət

Mənbə: J bölməsi (`neticeler.md`, J-01 … J-08). Başlıqlar sözbəsöz.

| Sətir | Başlıq | Vəziyyət |
|---|---|---|
| J-01 | Əmr 1, son oxunuş və başlanğıcla müqayisə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-02 | Əmr 2, son oxunuş və başlanğıcla müqayisə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-03 | Əmr 3, son oxunuş və başlanğıcla müqayisə | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-04 | Əmr 4, son oxunuş: auditin heç nəyi dəyişmədiyinin sübutu | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-05 | Qiymət təsnifatının üç cəmi, yenidən | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-06 | Importların vəziyyəti, yenidən | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-07 | Repozitoriyanın vəziyyəti | yoxlanıla bilmədi — DEFERRED_BY_OWNER |
| J-08 | Təmizlik: sınaq mühiti, iş kitabının surəti, müvəqqəti fayllar | yoxlanıla bilmədi — DEFERRED_BY_OWNER |

- Auditin sonunda oxunuş aparılmayıb.
- Yeganə data oxunuşu 21:00–21:06 qaçışınınkıdır (A-06 … A-09; Əmr 1 21:03-də), audit hesabı yaradıldıqdan sonra
  (bölmə 2). Operatorun qeydi 21:06-da bitir və ondan sonra heç bir əməl qeyd etmir.
- **Bu, protokolun §9-unun 11-ci bəndinin data tərəfinin auditin sonunda yenidən oxunmadığı deməkdir.** Üstəlik,
  audit zamanı bir istifadəçi əlavə edilib (`audit.rehber`, sahibin icazəsi ilə; bölmə 2.3). Ona görə bu hesabat real
  data haqqında yalnız bunu deyir: Əmr 4-ün əhatə etdiyi rəqəmlər hesab yaradıldıqdan sonra dəyişməyib (bölmə 2.4);
  istifadəçilər dəyişib (bir hesab əlavə olunub); auditin sonunda oxunuş yoxdur.

**15b-nin öz git oxunuşu** (Coder, 2026-09-25, 15b zamanı):

```
$ git rev-parse HEAD
749ad9d5d31cffbcf7c99ee086ffe8c7fdbd7a6d

$ git status --short
?? AI_WORKFLOW/
?? docs/audits/2026-final-enver-muellim-audit.md
?? docs/audits/2026-final-enver-muellim-audit/neticeler.md
?? monitor-agent.ps1
?? resume-agent.ps1
?? run-agent.ps1

$ git diff --stat 7550eda HEAD
 .../2026-final-enver-muellim-audit/01-hazirliq.md  |  254 +
 .../02-yoxlama-siyahisi.md                         | 5628 ++++++++++++++++++++
 .../2026-final-enver-muellim-audit/03-emrler.md    |  500 ++
 .../2026-final-enver-muellim-audit/04-sandbox.md   |  590 ++
 .../05-neticeler-qaytarilmasi.md                   |   55 +
 .../06-hesabat-skeleti.md                          |  116 +
 .../2026-final-enver-muellim-audit/README.md       |  136 +
 7 files changed, 7279 insertions(+)
```

`docs/audits/`-dan kənarda dəyişiklik yoxdur. İzlənməyən fayllar yalnız iş axınının faylları, `neticeler.md` və bu
hesabatdır.

**15b-də işlədilən testlər** — 15b zamanı aparılan yeganə yoxlamalar bunlardır. Xülasə sətirləri gəldiyi kimi:

- frontend testləri, 1-ci qaçış: `Test Files  1 failed | 50 passed (51)`, `Tests  1 failed | 956 passed (957)` —
  N-02-yə baxın;
- frontend testləri, təkrar: `Test Files  51 passed (51)`, `Tests  957 passed (957)`;
- frontend build: `✓ built in 6.00s`;
- backend build: `Build succeeded.`, `0 Warning(s)`, `0 Error(s)`;
- backend testləri: `Passed!  - Failed:     0, Passed:  1046, Skipped:     0, Total:  1046, Duration: 3 s - BaxOrders.UnitTests.dll (net10.0)`
  və `Passed!  - Failed:     0, Passed:   785, Skipped:     0, Total:   785, Duration: 3 m 20 s - BaxOrders.IntegrationTests.dll (net10.0)`.

Frontend (təkrarda) və backend 16b-nin bazası ilə eynidir: 51 / 957, 1046 / 785.

---

## 14. Yekun cavab

Mənbə: yuxarıdakı bütün bölmələr.

**Brifin dörd qəbul şərti və nəticəsi:**

| Brifin qəbul şərti | Nəticə |
|---|---|
| 1 — yekun suala açıq, yumşaldılmamış cavab | yerinə yetirilib (aşağıda) |
| 2 — ilk auditin hər P0 və P1 tapıntısının vəziyyəti sübutla | **yerinə yetirilməyib** — B bölməsi təxirə salınıb (bölmə 3) |
| 3 — klik sayı ilk auditin "3 klik + 3 sürüşdürmə"-si ilə müqayisədə | **yerinə yetirilməyib** — G bölməsi təxirə salınıb (bölmə 8) |
| 4 — audit başlayanda Qiymət təsnifatında açıq sətir yoxdur | yerinə yetirilib, yalnız əmr sübutu ilə: 0 / 0 (A-10, A-11; Əmr 1, 21:03); ekrana baxılmayıb, ekran şəkli yoxdur |

**Yekun cavabın qaydası** (protokol §7.1). Cavab yalnız bu halda **Bəli**-dir: bütün ön şərtlər keçib, heç bir açıq P0
və ya P1 yoxdur (köhnə və ya yeni), və təsdiq axını başdan sona işləyib. Əks halda cavab **Xeyr**-dir və səbəblər açıq
bəndləri öz sətirləri ilə adlandırır. "Qismən", "əsasən" və ya şərtli cavab cavab deyil.

Qaydanın tətbiqi:

| Şərt | Nəticə |
|---|---|
| bütün ön şərtlər keçib | **xeyr** — G3-ün sınaq mühiti hissəsi aparılmayıb (A-05) |
| heç bir açıq P0 və ya P1 yoxdur | **xeyr** — N-01 açıq P0-dır |
| təsdiq axını başdan sona işləyib | **xeyr** — F bölməsi təxirə salınıb (F-01 … F-09) |

Üç şərtdən heç biri ödənmir, ona görə cavab **Xeyr**-dir.

Bu ayın sifarişləri bu gün Ənvər müəllimə verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?

Cavab: Xeyr — (a) **N-01**: real sistemdə təsdiq edə bilən yeganə şəxs müvəqqəti audit hesabıdır, onun parolunu isə
heç kim bilmir; (b) **A-05, F-01 … F-09**: təsdiq axını sınaq mühitində aparılmayıb; (c) **B, C, D, E, G, H, I, J**:
ilk auditin tapıntılarından, Task 04–16-nın qəbul şərtlərindən, regressdən, ekran enlərindən və klik sayından heç biri
ekranda yoxlanılmayıb — onlar sahibin qərarı ilə təxirə salınıb. Bu cavab həmin sahələrin xətalı olduğunu demir. O
deyir ki, bu gün onlar sübut olunmayıb, "rahat və inamla" isə sübut olunmayana söykənə bilməz.
