# 04 — Dizayn tənqidi: UI V2 «Aylıq hesabat»

**Tarix:** 2026-10-15 · **Mərhələ:** 4-cü mərhələnin qapısı — `visual-qa`, rejim A (təsdiqdən əvvəl) · **Yoxlanılan:**
`03-ux.md`, `04-visual.md` (müəllif `ux-architect`; bu rəyi yazan onları yazmayıb) · **Ölçü:** `02-requirements.md`
(M-01…M-14, W-01…W-05, AC-01…AC-18, §6), `DECISIONS.md` D-50 (sözbəsöz, hər şeydən üstündür), D-R/D-S/D-F/D-V,
`UX_BRIEF.md`, `DESIGN_WORKFLOW.md`, `01-audit.md` §6, `BLOCKERS.md` B-07, `CLAUDE.md`, kod (`fayl:sətir`).

Sahibin sözü (`02-requirements.md` §1): «İndi 1-ci mərhələyə keç: UX-i tamamla və tətbiq planını yekunlaşdır. Hələ
proqram kodunu dəyişmə. Əvvəl nəticəni mənə təqdim et.»

## Hökm: KEÇMƏDİ

Açıq qüsurlar: **S1 — 0, S2 — 4** (DK-01…DK-04), **S3 — 12**, **S4 — 9**.

S1 yoxdur: ekrandakı hər pul və faiz API sahəsinə bağlanır, brauzerdə toplanan pul yoxdur, 9.1 və 8.2 düzgündür.
Dizayn ümumən güclüdür: D-50-nin yeddi qərarı daxildədir, panelin tarixçə modeli sifariş səhifəsindən düzgün
köçürülüb, kontrast dəqiq hesablanıb, köhnə brauzer cəmi (`ReportHeadline.tsx:55-58`) aradan qalxır. Amma dörd S2
təsdiqdən əvvəl sənəddə bağlanmalıdır — hər birinin düzəlişi kiçikdir (bir neçə cümlə və ya bir qayda).

## Mühit — rejim (A/B), ünvan, commit, viewport-lar, rollar, alət

- **Rejim:** A — dizayn tənqidi, təsdiqdən əvvəl.
- **Ünvan:** yoxdur — işlək məhsul açılmayıb; server, baza, brauzer başladılmayıb (tapşırığın sərhədi, 8 GB RAM).
- **Commit:** `b43c2c5` (`main`); tətbiqin kodu dəyişməyib (`git status`: yalnız `AI_WORKFLOW/`, `.claude/`, `CLAUDE.md`).
- **Viewport-lar:** 1440×900, 1280×800, 1024×768, 768×1024, 390×844 — **yalnız hesabla**; Windows Chrome skrolbarı
  S = 17 px götürülüb (03 §4.1 ilə eyni).
- **Rollar:** Koordinator, Rəhbər, Administrator — sənəd üzrə; hesabatda yazma əməliyyatı yoxdur (02 §4).
- **Alət:** statik (sənəd və kod). Playwright / Chrome işlədilməyib. Figma açılmayıb (W-05; dizayn markdown-dadır).
  Kontrast Tailwind 4.3.3-ün öz OKLCH dəyərlərindən (`node_modules/tailwindcss/theme.css`) sRGB-yə çevrilib
  hesablanıb.

## Qəbul meyarları — ID · nəticə · sübut

### D-50 — sahibin qərarları

| # | Qərar (D-50, sözbəsöz qısaltma) | Nəticə | Sübut |
|---|---|---|---|
| 1 | Artım qırmızı, azalma yaşıl | **Var** — faizdə, ▲/▼-də, tintdə, paneldə, kartın zolağında; ortaq `costDirection*` | 03 §6.2.2, §6.2.4, §6.9.4; `format.ts:322-351` |
| 2 | Qeyri-adi — iki istiqamət, mövcud qayda | **Var** — yalnız `isUnusual`; istiqamət `recentAveragePercent`-in işarəsindən; ±50% brauzerdə yoxlanmır | `UnusualMonth.cs:73` (\|%\| > 50); `MonthlyReportQueries.cs:277,294` |
| 3 | 1 əsas + 2 ikinci; «növə və filtrlərə uyğun» | **Var** il və növ üzrə; «Ümumi faktiki xərc» `scope=All`-dan. Axtarışa görə — S-1 sahibdə açıqdır, dizayn «A» ilə qurulub | 03 §6.8.1, §6.8.3; `MonthlyReportQueries.cs:101-125` (cəm bütün sətirlərdən) |
| 4 | Sidebar 260, başlıq 72 | **Var** — karkas toxunulmur | `AppLayout.tsx:13`, `Header.tsx:20` |
| 5 | Xanaya klik → real sətirlər + sifarişin səhifəsi | **Var** — `GET /orders/{id}`, 50-50, «Sifarişi aç» 24.3 ilə | 03 §6.9; `orders.ts:295-305`; `OrderRequestQueries.cs:29-243` — söz: DK-10 |
| 6 | İlkin görünüş yığcam | **Var** — `view` yoxdursa Yığcam | 03 §3.2 |
| 7 | Analitika sonraya | **Var** — üçüncü seçim yoxdur | 02 W-01; 03 §1 |
| əlavə | Mövcud funksiyaları silmə | **Pozulur** — «N / M obyekt» telefonda və planşetdə | DK-03 |
| əlavə | Status nöqtələri, zəng, cəm sətri, 24.3 | **Qalır**; status işarəsinin rəngi və forması dəyişir | 03 §2.2; DK-05 |
| əlavə | Aylıq faizlə anomaliya faizi fərqlənsin | **Var** (ad, yer, panelin iki sətri); oxunuş riski | 03 §6.2.2, §6.9.4; DK-06 |
| əlavə | «326.951,62 ₼» | **Var** — yalnız `formatMoney` / `formatPercent` / `formatMoneyDelta` | `format.ts:257-303` |
| əlavə | 1280, planşet, telefon | **Var**, 1280-də risklərlə | DK-02, DK-07, DK-15 |
| əlavə | Figma yalnız istiqamət | **Var** — rəqəm, palitra, «İlk mövcud ay», panelin yanlış mətni, «Qeyri-adi artım · +235.89%» götürülmür | 04 §1; 01 §6 |
| əlavə | API həqiqət mənbəyi; backend dəyişmir | **Var** — yeni endpoint və sahə yoxdur | 03 §3.3 |
| əlavə | 30 CSS testi zəiflədilmədən | **Qismən** | DK-08 |
| əlavə | Timeout ayrıca | **Var** — B-09 | `BLOCKERS.md:153-190` |

### AC-01…AC-18 (dizaynda)

| AC | Nəticə | Sübut / qüsur |
|---|---|---|
| AC-01 | Dizayn edilib | 03 §3.2 (`view=standart`, `replace`), UX-05/06 |
| AC-02 | Dizayn edilib | 03 §6.2.1; faiz `describe()`-də qalır (`MonthlyReportTable.tsx:346-370`) |
| AC-03 | Dizayn edilib, oxunuş riski | 03 §6.2.2, §9.5 · DK-06, DK-17 |
| AC-04 | Dizayn edilib | 03 §6.2.4, §9.6 |
| AC-05 | Dizayn edilib | 03 §6.8.1, §6.8.3 · DK-04, DK-13 |
| AC-06 | Dizayn edilib (S-1 «A») | 03 §6.8.4 — sahibin S-1 cavabı yoxdur |
| AC-07 | Dizayn edilib | 03 §6.4 · DK-20 (defolt `aria-sort`) |
| AC-08 | Dizayn edilib, fokus boşluğu | 03 §3.4 — `OrderDetailPage.tsx:139-182` modeli (push + işarə, `closedEntry`, `navigate(-1)` / `replace`) sadiqcə köçürülüb · DK-01 |
| AC-09 | Dizayn edilib, söz problemi | 03 §6.9 · DK-11 |
| AC-10 | Dizayn edilib | 03 §3.4, §6.9.7; `useScrollMemory.ts:86` təhlili doğrudur (drawer-dəki klikdə anchor `null`, y bərpa olunur; sətri `cell` göstərir) |
| AC-11 | Dizayn edilib | 03 §3.4.1 (`interaction.ts:25-46` qaydası) |
| AC-12 | Qismən | DK-03; qalan M-07 elementləri 03 §2.2-də var |
| AC-13 | Dizayn edilib | `format.ts:257-285` |
| AC-14 | Dizayn edilib, risklərlə | 03 §4.3, §6.3 · DK-02, DK-07 |
| AC-15 | **Sənəddə keçmir** | DK-03 |
| AC-16 | Əsasən dizayn edilib | 03 §4.6, §8 · DK-19 |
| AC-17 | Qismən | kontrast aşağıda ✓ · DK-01, DK-14, DK-16, DK-23 |
| AC-18 | Qismən | DK-08, DK-09 |

### Məlumat xəritəsi (02 §6) — hansı rəqəm haradan

Brauzerdə hesablanan və ya toplanan pul **tapılmadı**. Zolaq: `knownAmount`, `outsideMonthlyKnownAmount`,
`monthlyKnownAmount`, «All» cavabının `knownAmount`-ı; sayğaclar: `requestCount`, `locationCount`,
`missingPriceItemCount`. Xana: `knownAmount`, `deltaPercent`, `deltaAmount`, `isUnusual`, `recentAveragePercent`-in
işarəsi. «Cəmi»: `months[].knownAmount`, `report.knownAmount`. Panel: xananın sahələri; `order.knownAmountTotal`,
`itemCount`, `missingPriceItemCount`, `items[].lineTotal`. Brauzerdə alınan, amma pul olmayan: sıra, qutunun ilk
mövqeyi (`locationsWithRequest`), «Səhifə 1 / 3» (= ⌈totalCount / 50⌉, `OrderDetailPage.tsx:346` kimi), zolaq
barlarının hündürlüyü (yalnız görüntü, `MonthlyReportTable.tsx:558-575`). Risklər: DK-04 (köhnə rəqəmin adı),
DK-11 (iki «cəm» 1 qəpik), DK-13 (iki fərqli anın rəqəmi).

### Kontrast (WCAG 2.1, hesablanıb)

Dizaynın dəyərləri (04 §4.2) Tailwind 3 hex-i ilə hesablanıb görünür; məhsul Tailwind 4-dür. Fərq 0,1–0,15-dir,
heç bir hədd keçidi dəyişmir. Dizaynın cədvəlində olmayan cütlər də yoxlanıb:

| Ön plan → fon | Nisbət | Hədd | |
|---|---|---|---|
| `on-surface` → ağ / `surface` / `sc-low` / `sc` / `sc-high` | 17,18 / 16,38 / 15,54 / 14,73 / 14,05 | 4,5 | ✓ |
| `on-surface-variant` → ağ / `sc-low` / `sc` / `sc-high` / `red-50` | 9,29 / 8,40 / 7,96 / 7,60 / 8,50 | 4,5 | ✓ |
| `red-700` (#c10007) → ağ / `red-50` / `sc` / `emerald-50` | 6,42 / 5,88 / 5,51 / 6,09 | 4,5 | ✓ |
| `emerald-700` (#007a55) → ağ / `emerald-50` / `sc` (hover) / `sc-low` / `red-50` | 5,37 / 5,09 / 4,60 / 4,86 / 4,91 | 4,5 | ✓ (hover-də ehtiyat azdır) |
| `emerald-700` → `primary-fixed` / `sc-high` | 4,15 / 4,39 | 4,5 | ✗ — dizayn işlətmir, doğrudur |
| `amber-800` (⚠ N) → ağ / `sc` / `red-50` / `emerald-50` | 7,13 / 6,12 / 6,53 / 6,76 | 4,5 | ✓ |
| `slate-600` (sıfır faiz) → `red-50` | 6,92 | 4,5 | ✓ |
| ● `outline` → ağ / `surface` / `sc-low` / `sc` / `red-50` | 4,47 / 4,26 / 4,05 / 3,83 / 4,09 | 3 | ✓ |
| ○ `sky-700` → ağ / `sc-high` / `red-50` | 5,85 / 4,79 / 5,36 | 3 | ✓ |
| ◆ `amber-700` → ağ / `sc` / `sc-high` | 5,05 / 4,33 / 4,13 | 3 | ✓ |
| fokus, seçim `primary` → ağ / `red-50` | 18,01 / 16,48 | 3 | ✓ |
| aktiv seqmentin halqası `outline` → yol `sc` | 3,83 | 3 | ✓ |
| ştrix xətti `outline-variant` → `sc-low` | 1,54 | 3 | ✗ DK-14 |
| ⓘ `slate-400` → ağ (mövcud komponent) | 2,63 | 3 | ✗ DK-19 |

### 3 saniyə testi (statik qiymət)

- **1440×900 — keçir (brauzerdə təsdiqlənməli).** Göz əvvəl 28 px qalın əsas rəqəmə düşür: səhifənin ən böyük
  elementi, solda, yuxarıda; iki ikinci rəqəm 20 px, eyni rəngdə — rəqabət zəifdir; heç bir rəqəm mavi deyil (K3).
  Cədvəlin ~5 sətri açılışda görünür (DK-15). Diqqəti çəkən başqa elementlər kəhrəba sayğac (doğru — xəbərdarlıqdır)
  və iki sətirlik əfsanədir.
- **1280×800 — qismən.** Əsas rəqəm ✓; cədvəlin məbləğləri açılışda demək olar görünmür (DK-15), Yanvar sütunu
  açılışda gizlidir (DK-02), 5 rəqəmli qonşu məbləğlər arasında 1–3 px qalır (DK-07).

### B-07 / Seçim A — texniki qiymət (sual 3)

- **Doğrudur.** `overflow-x: auto` `overflow-y`-ni də `auto` edir; qutu iki oxda sürüşmə konteyneri olur və `thead`-in
  `sticky top`-unu özünə bağlayır — ona görə görünən başlıq qutudan kənarda surət olmalıdır; dizayn bunu düzgün qurur
  (03 §4.3, §6.3) və kartda `overflow: hidden` qadağasını düzgün qoyur (04 §5.4). Sənəd (window) sürüşür, `main`-də
  overflow yoxdur (`AppLayout.tsx:11-19`) — `top: 72px` görünüşə görə işləyər. Obyekt və il sütunlarının qutu içində
  `sticky left/right` olması standart və etibarlıdır; z-qatları ardıcıldır (`Header.tsx:20` `z-20`).
- **İşləməsi üçün doğru olmalıdır** (sənəddə tam yazılmayıb): (1) surətin cədvəli eyni `table-fixed`, `colgroup`,
  `min-w`, `border-separate` və qutunun `clientWidth`-i ilə; (2) `scrollLeft` sinxronu və eni izləyən ResizeObserver —
  panel açılanda `body overflow: hidden` Windows-da səhifəni 17 px enləşdirir (`Modal.tsx:67-75`); (3) surət yalnız
  əsl `thead` 72 px xəttindən yuxarı çıxanda görünür (məs. IntersectionObserver, `rootMargin: -72px`), yoxsa iki
  başlıq sırası; (4) fokus üçün `scroll-padding` (DK-01); (5) surət köhnə məlumatda solğun və `inert`, gələcək ayın
  ştrixi və aktiv sıra əsl başlıqla eyni.
- **İstifadə riskləri:** DK-02.
- **En hesabı:** düstur `C = W − S − 260 − 64` və 1440 / 1366 / 1280 / 1024 dəyərləri doğrudur (1280, S = 17 →
  939 px; ay sahəsi 689 px → Yığcam 9,8 ay, Standart 6,6 ay). B-07-nin köhnə ölçmələrinin 256 px ilə edildiyi
  (`MonthlyReportTable.tsx:100`) və 260 ilə ~13 / ~30 px gözlənildiyi düzgündür. Ziddiyyətlər: §4.3-ün «Yan–Okt»
  mətni (DK-02), xananın məzmun eni (DK-07), 2 px çərçivə (DK-20).

## Qüsurlar

```
[DK-01] S2 · İstifadə (əlçatanlıq) · cədvəl (masaüstü) · 1024 / 1280 / 1440, xüsusən Standart · bütün rollar
Addımlar: 03 §8 sırası ilə klaviaturadan istifadə et: Standart baxışda 1280-də bir sətrin dolu xanalarında Tab ilə
  sağa get; sonra Shift+Tab ilə cədvəldən «İl cəmi» / «Obyekt» sıra düymələrinə qayıt; paneli Esc ilə bağla (03 §3.4
  b.3: fokus `scrollIntoView({ block: 'nearest', inline: 'nearest' })` ilə xanaya qayıdır).
Gözlənilən: UX-39 — «heç bir fokus yapışqan sütun və ya üzən başlıq altında gizlənmir»; AC-17.
Faktiki: dizayn bunun mexanizmini vermir. Brauzer fokuslanan elementi görünüşün «ən yaxın» kənarına gətirir və
  yapışqan örtükləri nəzərə almır: (1) sağa Tab-da qutudan çıxan ay xanası (70–104 px) sağdakı yapışqan «İl cəmi»
  sütununun (104 px) tam altına düşür; (2) yuxarıya gələn element (Shift+Tab, Esc-dən sonrakı `block: 'nearest'`)
  72 px tətbiq başlığı + 40 px üzən başlığın altına düşür; (3) üzən surət əsl `thead`-in üstündə olarsa, əsl sıra
  düyməsinin fokus halqası onun altında qalır. 03 §4.3 yalnız sol tərəf üçün `scroll-padding-left` deyir (snap
  məqsədi ilə); kodda heç yerdə `scroll-padding` / `scroll-margin` yoxdur (`src/` üzrə axtarış — 0 nəticə).
Sübut: 03-ux.md §3.4 (s.200-202), §4.3 (s.347-353), §6.3 (s.623-635), §8 (s.860-866), UX-39 (s.1119); 04-visual.md
  §5.5 «z-qatları» (s.288); Header.tsx:20; WCAG 2.4.7, 2.4.11.
İstiqamət: qutuya `scroll-padding-inline` = sabit sütunların eni (144 / 104); sənədə `scroll-padding-top` = 72 px
  (+40 surət görünəndə) və ya sətir və düymələrə `scroll-margin-top`; surət yalnız əsl başlıq 72 xəttindən yuxarıda
  olanda görünsün; UX-39-a üç hal yazılsın: «Standartda sağa Tab», «Shift+Tab sıra düymələrinə», «Esc-dən sonra fokus».
```

```
[DK-02] S2 · İstifadə · cədvəl, B-07 / S-2 · 1280 (Yığcam 1281–1430; Standart hər laptop) · bütün rollar
Addımlar: 03 §4.3 və §6.6-ya görə 1280×800-də hesabatı aç; cədvəlin ortasına (10-cu sətir) sürüş; gizli aya — keçən
  ilin Noyabr–Dekabrı və ya Standartda Yanvar–Aprel — baxmağa çalış. Sonra 03 §9.1 cədvəlini və §11.1 S-2 sualını oxu.
Gözlənilən: tövsiyə olunan variantın əsas istifadə riski güzəşt cədvəlində və sahibə gedən sualda yazılıb; sxem öz
  en hesabı ilə üst-üstə düşür.
Faktiki: (1) Seçim A-da qutunun üfüqi skrolbarı 27 sətirlik (~1.300 px) cədvəlin ən altındadır, «‹ Əvvəlki aylar /
  Sonrakı aylar ›» isə kartın başlığındadır (04 §5.4) — cədvəlin ortasında heç biri görünmür; siçanla yeganə yol
  Shift+çarx və ya trackpad-dir. Bu qiymət §9.1-də A üçün yazılmayıb. (2) B-nin qiyməti şişirdilib: «qayıdışda ofset
  bərpası qutunu bərpa etmir» — amma qayıdış `cell` / `row-{id}` ilə `scrollIntoView` edir (03 §3.4 b.4;
  useScrollMemory.ts:100-102), bu isə iç-içə qutuları da sürüşdürür; B-də qutu ekran boyda olduğu üçün üfüqi skrolbar
  həmişə görünür — bu üstünlük yazılmayıb. (3) 1280-də S = 17 ilə 9,8 ay görünür (03 §4.1-in öz cədvəli); «solda
  yarımçıq ay yoxdur» qaydası ilə açılışda Fevral–Oktyabr görünür, Yanvar gizlidir — §4.3 isə «Yan–Okt» və kartın
  başlığında «Yanvar–Oktyabr 2026» yazır. (4) Bu gün 1280-də 12 ayın hamısı görünür, səhifə ~13 / ~30 px yana sürüşür
  (03 §2.3-ün hesabı; B-07 256 px sidebar ilə 9 px ölçüb); V2-də səhifə sürüşmür, amma ~2 ay gizlənir (rəqəm 11 → 12 px, il sütunu 88 → 104 px). S-2-dəki
  «12 ayın hamısı 1440 px-dən başlayaraq görünür» cümləsi bu güzəşti sahibə açıq demir.
Sübut: 03-ux.md §4.1 (s.273-278), §4.3 (s.325-358), §9.1 (s.897-905), §11.1 S-2 (s.1211-1223); 04-visual.md §5.4
  (s.250-252); BLOCKERS.md:120-149; MonthlyReportTable.tsx:97-109.
İstiqamət: A seçilərsə, ay düymələrini (və ya nazik sinxron skrolbarı) üzən başlığın içinə qoymaq, ya da qutunun
  altına ekranın altında yapışan üfüqi skrolbar vermək; §9.1-i və S-2-ni bu dörd faktla yeniləmək (sahibin dilində:
  «1280-lik laptopda açılışda Yanvar görünməyəcək; bu gün görünür, amma səhifə azca yana gedir»); §4.3-ün mətnini
  düzəltmək.
```

```
[DK-03] S2 · İstifadə · axtarışın nəticə sayı · 768 və 390 (lg-dən aşağı) · bütün rollar
Addımlar: 03 §4.5, §4.6 sxemlərinə və 04 §5.7-yə görə planşetdə və telefonda «Novx» axtar.
Gözlənilən: bu gün olduğu kimi «1 / 27 obyekt» hər endə görünür və (dizayna görə) `role="status"` ilə elan olunur;
  AC-15 «768 px-də heç bir məlumat itmir»; D-50 «Mövcud funksiyaları silmə».
Faktiki: bu gün say filtr sırasındadır və hər endə görünür (MonthlyReportPage.tsx:128-132). V2 onu «cədvəl kartının
  başlığına» köçürür (03 §3.6 #22, §6.6; 04 §5.4) — bu kart yalnız `lg`-dən yuxarı var; planşet və telefon
  sxemlərində (03 §4.5, §4.6) və kartların spesifikasiyasında (04 §5.7) say yoxdur. Test L266 (`screen.getByText('1 /
  26 obyekt')`) jsdom-da gizli masaüstü hissəni də tapdığı üçün itkini tutmayacaq.
Sübut: 03-ux.md s.248, s.668-670, s.370-395, s.402-430; 04-visual.md s.249-250, s.310-320;
  MonthlyReportPage.test.tsx:266-273.
İstiqamət: say və onun `role="status"`-u kartların üstündə də yazılsın (sxemlərə əlavə); telefon testinə
  `phoneView()` daxilində yoxlama; L499-un «əfsanə birinci uşaqdır» yoxlaması buna görə dəyişəcək (DK-08).
```

```
[DK-04] S2 · İstifadə (məna) · zolaq, cədvəl, filtrlər — yenilənmə zamanı · bütün enlər · bütün rollar
Addımlar: 03 §3.5 «Yenilənmə»: «Aylıq sifarişlər»-də ikən «Aylıqdan kənar» bas; cavab gələnə qədər ekrana bax (yavaş
  şəbəkədə saniyələrlə).
Gözlənilən: solğun köhnə rəqəm öz sorğusunun adı ilə qalır; idarəetmə elementləri yeni istəyi göstərir.
Faktiki: dizayn köhnə rəqəmin hansı adla qalacağını demir; 03 §3.5-in öz cümləsi («xəta gəlsə … fərqli növün adı ilə
  köhnə rəqəm ekranda qalmasın») yüklənmə zamanı bunun baş verəcəyini nəzərdə tutur. Bu gün etiket URL-dəki növdən
  gəlir (MonthlyReportPage.tsx:36-37, :139 → `scopeAmountLabels[scope]`), API cavabında `scope` sahəsi yoxdur
  (api/reports.ts:99-120); bu gün problem görünmür, çünki yüklənəndə məlumat silinir (:47). Köhnə məlumat saxlanılsa,
  «Aylıqdan kənar xərclər 428.000,00 ₼» kimi — aylıq məbləğ kənar xərcin adı ilə — görünəcək. Eyni boşluq:
  «Ümumi faktiki xərc»in il yaddaşı hansı ilə (köhnə `data.year`, yoxsa URL) bağlıdır; il seçimi `data?.year`-ə
  bağlıdır (:94) — yeni il seçiləndə cavab gələnə qədər köhnə ilə qayıdır.
Sübut: 03-ux.md §3.5 (s.218-221), §7 «Yenilənir» (s.837); 04-visual.md §5.5 «Köhnə məlumat» (s.287).
İstiqamət: 03 §3.5 və §7-yə bir qayda: «köhnə məlumat öz sorğusunun açarı (il, növ, axtarış) ilə saxlanılır; zolağın,
  sütunların, əfsanənin, il çipinin sözləri və «Ümumi faktiki xərc» həmin açardan gəlir; idarəetmə elementləri URL-i
  göstərir». UX-20-yə «solğun rəqəm köhnə növün adı ilədir» yoxlaması.
```

```
[DK-05] S3 · Vizual · status işarələri · bütün enlər · bütün rollar
Addımlar: 03 §6.2.3 və 04 §4.1 / §5.5-i məhsulun status lüğəti ilə tutuşdur.
Gözlənilən: bir status hər ekranda eyni rəng və simvolla; D-50: «Status nöqtələri … qorunsun».
Faktiki: məhsulda «Təsdiqlənib» = yaşıl + ✓, «Təsdiqlənməyib» = boz + · (workflow/labels.ts:16-29;
  OrderStatusBadge.tsx:33-38 — Obyektlər, Obyekt, Sifariş səhifələri). V2 cədvəldə «Təsdiqlənib»-i boz ● edir — məhsulun
  qalanında boz «Təsdiqlənməyib» deməkdir — və ●/○/◆ adlı ikinci simvol dəsti gətirir; eyni ekranın paneli isə yaşıl ✓
  nişan göstərir. Səbəb (yaşıl nöqtə 9.1-in «xərc azalıb» yaşılı ilə yanaşı durur) əsaslıdır, amma D-50-nin
  «qorunsun» dediyi işarənin rəngi dəyişir və bu yalnız §3.6 #7 və §9.7-də yazılıb, sahibə sual kimi yox.
Sübut: 03-ux.md s.586-597, s.233, s.937-941; 04-visual.md s.163-174, s.275.
İstiqamət: ya mövcud simvolları kiçik ölçüdə işlətmək (neytral ✓ və s.), ya da cədvəl lüğətini `workflowStatusSign`-ın
  yanında açıq qayda kimi yazıb təsdiq paketində ayrıca sual vermək («cədvəldə təsdiqlənmiş ay boz nöqtədir,
  paneldə yaşıl nişandır»).
```

```
[DK-06] S3 · İstifadə · Standart xana · masaüstü, kartlar · bütün rollar
Addımlar: 03 §6.2.2: əvvəlki 3 ayın ortalaması 1.000, keçən ay 2.500, bu ay 2.000 ₼ olan xana.
Gözlənilən: M-04 — iki müqayisə bir-birinin yerinə oxunmur.
Faktiki: xanada qırmızı ▲ (ortalamadan +100%, qeyri-adi) və yaşıl «−20%» (keçən aya görə) yanaşı durur; iki fərqli
  əsas (MonthlyReportQueries.cs:276-277). ▲/▼ ən çox «əvvəlki ilə müqayisə» kimi oxunan işarədir; sürətli oxuda «▲, amma
  −20%» ziddiyyət kimi görünür. Dizayn işarəni faizdən ayırır (doğru), amma işarənin özü «ortalama» demir. Rəqəm və
  rəng API-dəndir — məlumat səhvi yoxdur, oxunuş riski var.
Sübut: 03-ux.md s.572-584, s.599-604; 04-visual.md s.277.
İstiqamət: brauzer yoxlamasında belə bir ay sahibə göstərilsin; lazım olsa qeyri-adi işarəni başqa formada vermək
  (məs. xananın küncündə bayraq, istiqamət AN-da) — AC-04-ün «simvol və ya söz» şərti qalmaqla.
```

```
[DK-07] S3 · Vizual · Yığcam cədvəl · 1280–1440 · bütün rollar
Addımlar: 03 §4.1-in en hesabını 04 §5.5-in boşluqları ilə tutuşdur; «Cəmi» sətrinə bax (ay cəmləri 11.084,35 …
  71.210,29 ₼, yarımqalın).
Gözlənilən: 5 rəqəmli məbləğlər sütunda oxunaqlı, qonşudan aydın ayrılır; minimum en hesabla əsaslandırılıb.
Faktiki: 03 §4.1 Yığcam xananın məzmununu 70 − 2×4 = 62 px sayır, 04 §5.5 isə həm `td` (`px-1`), həm link (`px-1`)
  verir → 54 px; «12.345,67 ₼» (~67–69 px, 03-ün öz təxmini) linkin qutusundan 13–15 px çıxır — tint, hover fonu,
  seçim halqası və fokus xətti rəqəmi tam örtmür. Daha önəmlisi: sağa düzülmüş qonşu məbləğlər arasındakı boşluq
  = sütun eni − mətn eni = 70 − 67…69 = 1–3 px (boşluqdan asılı deyil). «Cəmi» sətrinin bütün ay cəmləri 5 rəqəmlidir —
  sətir boyu rəqəmlər demək olar bitişir; 03-ün «qonşuya çatmır» cümləsi bunu göstərmir. «±4 px» ehtiyatı isə 1440 vədini
  pozur: 144 + 12×74 + 104 + 2 = 1.138 > 1.097.
Sübut: 03-ux.md s.264-271; 04-visual.md s.271-273; MonthlyReportPage.test.tsx:708-711 (auditin ay cəmləri).
İstiqamət: minimumu ən geniş 5 rəqəmli yarımqalın məbləğ + ≥ 6–8 px boşluqla hesablamaq; 1440 vədi ilə güzəşti açıq
  yazmaq (məs. 1440-da obyekt sütununu daraltmaq); bir səviyyəli üfüqi boşluq.
```

```
[DK-08] S3 · Kod · test planı · — · —
Addımlar: 03 §10.3 və 06 §3-ü MonthlyReportPage.test.tsx ilə tutuşdur.
Gözlənilən: düşəcək hər test siyahıdadır; heç bir yoxlama zəifləmir (M-13); bir plan.
Faktiki: (a) siyahıdan kənarda qalan, V2-də düşəcək testlər: L210 (`+12,5%` cədvəl xanasında — Yığcamda faiz yoxdur),
  L311 (`getAllByRole('combobox')` = 1 — yeni «Sıralama» select-i ilə 2), L650 (`+65,8%`), L905 (`+254,03%`), L321 /
  L499 (telefon hissəsinin uşaq sırası, DK-03). 06 bunların bir hissəsini (L650, L903) sadalayır, 03 yox.
  (b) Zəiflətmə: (1500, 1510) üçün `toHaveBeenLastCalledWith` → `toHaveBeenCalledWith` lazım deyil — «All» sorğusu əsas
  cavabdan dərhal sonra, klikdən əvvəl gedir, `OutsideMonthly` yenə sonuncu çağırışdır; `scope=All` linkində ikinci
  sorğu heç yoxdur. Dəyişiklik sonradan gələn yanlış növ sorğusunu buraxar. (c) 03 §10.3 ilə 06 §3.1 ziddir: #15/#16
  (`top-[72px]` üzən başlıq ↔ `top-18`), #30 (`workflowStatusMarkClass` ↔ `workflowStatusClass`); 06 §1
  «`OrderDetailPage.tsx` dəyişmir» deyir, 03 §5.2 ondan xanaları çıxarır (DK-09).
Sübut: MonthlyReportPage.test.tsx:210-228, :311-319, :650-663, :905-921, :321-325, :499-507, :1500-1517;
  03-ux.md s.1154-1203; 06-implementation.md s.16-17, s.58-72.
İstiqamət: bir siyahı (03 §10.3), bütün düşən testlərlə; `LastCalledWith` saxlanılsın və ya çağırışlar dəqiq ardıcıllıqla
  yoxlansın; 06 03-ə uyğunlaşdırılsın.
```

```
[DK-09] S3 · Kod · ortaq kod · — · —
Addımlar: 03 §5.2, §5.4, §9.19-u istifadəçiləri ilə tutuşdur.
Gözlənilən: başqa ekranlara toxunan dəyişikliklər ayrıca görünür, ayrıca yoxlanılır; bir qərar bir yerdə.
Faktiki: (1) Sifariş səhifəsinin xanalarının (OrderDetailPage.tsx:845-1003) ortaq fayla köçürülməsi 1.024 sətirlik
  başqa ekrana və 135 testlik OrderDecisionPage.test.tsx-ə (B-09-un vaxtı aşan testi orada) toxunur; 06 §1 bunu
  qadağan edir. Bu xanalar `formatMoney` yox, `formatAmount` (imports/labels.ts:198) işlədir — çıxış eynidir, amma
  CLAUDE.md «yalnız format.ts» deyir. (2) Modal-ın «Bağla»sı bu gün 24 px-dir (Modal.tsx:180-187: `p-1` + `size-4`);
  dəyişiklik 24 dialoq komponentinə təsir edir, başlıq hündürlüyü dəyişə bilər; QA planında (UX-33) yalnız bu panel
  var. (3) `ScopeSelector`-un yeganə istifadəçisi bu səhifədir (MonthlyReportPage.tsx:6) — «pill» defoltu ölü koda
  çevrilir; 03 §6.7 «Sifariş növü»nü `ScopeSelector appearance="segmented"`, §5.4 isə `SegmentedControl` ilə çəkir —
  hansı olduğu bəlli deyil. (4) `SegmentedControl` və `buttonClass` dizayn sisteminə yeni primitivlərdir.
Sübut: 03-ux.md s.493-501, s.512-532, s.690, s.999-1002; 06-implementation.md s.16-17.
İstiqamət: (1) və (2)-ni ayrıca, ayrıca təsdiqlənən kiçik dəyişiklik kimi (DESIGN_WORKFLOW «light path»), öz testi və
  bütün dialoqların 390-da yoxlanması ilə; (3) `ScopeSelector` `SegmentedControl`-u işlədən nazik sarğı olsun, variant
  yox; (4) primitivləri təsdiq paketində ayrıca bənd kimi göstərmək.
```

```
[DK-10] S3 · İstifadə (söz) · panel · bütün enlər · bütün rollar
Addımlar: 03 §6.9.7-ni məhsulun sözləri ilə tutuşdur.
Gözlənilən: bir hərəkət — bir söz (terms.ts:1-11, qərar 5.1); CLAUDE.md «heç vaxt termin uydurma».
Faktiki: «Sifarişi aç» [Yeni mətn] — eyni hərəkətin sözü artıq var: `openOrderLabel = 'Sifarişə bax'`
  (components/decisions/labels.ts:372), təsdiq siyahısında (ApprovalRows.tsx:283) və obyektin trendində
  (LocationTrend.tsx:96).
Sübut: 03-ux.md s.818; 02-requirements.md M-06.
İstiqamət: mövcud «Sifarişə bax» işlədilsin, ya da sahibdən söz qərarı alınsın (M-06-nın mətni ilə birlikdə).
```

```
[DK-11] S3 · İstifadə (söz və məna) · panel · bütün enlər · bütün rollar
Addımlar: 03 §6.9.6: qiyməti olmayan sətri olan sifarişin panelini aç; sonra «Hamısı» növündə kəsr miqdarlı sətri
  olan sifarişi aç.
Gözlənilən: iki cəm aydın və ziddiyyətsiz adlanır (AC-09); eyni mənalı iki rəqəm fərqli görünmür.
Faktiki: (1) natamam sifarişdə başlıq «Sifarişin cəmi (bütün sətirlər) · Qiyməti olan sətirlərin cəmi» olur
  (`amountHeading`, format.ts:309-311) — «bütün sətirlər» və «qiyməti olan sətirlər» bir başlıqda bir-birini inkar
  edir. (2) «Hamısı» növündə panel demək olar eyni iki rəqəm göstərir: xananın «Ümumi faktiki xərc»-i (hər növ ayrıca
  qəpiyə yuvarlaqlaşdırılıb toplanır, MonthlyReportQueries.cs:325, :336-337) və «Sifarişin cəmi» (yuvarlaqlaşdırmasız,
  OrderRequestQueries.cs:50, :230); 0,01 ₼ fərq ola bilər. Dizayn bunu [Fərziyyə] kimi qeyd edir (03 §11.2), ekranda
  necə görünəcəyini vermir.
Sübut: 03-ux.md s.794-797, s.1240-1242.
İstiqamət: (1) mötərizəsiz ad (məs. «Bütün sifarişin məbləği») — AC-09-un mətni ilə birlikdə sahibə; (2) «Hamısı»
  növündə ikinci rəqəmi göstərməmək və ya fərqin mümkünlüyünü təsdiq paketində demək.
```

```
[DK-12] S3 · İstifadə (məna) · zolaq · bütün enlər · Rəhbər
Addımlar: 03 §6.8-i bugünkü məlumatla oxu: Oktyabrın 24 sifarişi təsdiq gözləyir.
Gözlənilən: rəqəmin nəyi əhatə etdiyi rəqəmin yanında deyilir (M-05 ruhu; audit K5).
Faktiki: hesabat hər obyekt+ay üçün son versiyanı statusundan asılı olmayaraq sayır (MonthlyReportQueries.cs:74-82;
  01 §3). Bu gün 24 sifariş — 42.586,30 ₼, ilin ~9%-i — təsdiq gözləyir (DECISIONS.md:734-738, D-49). V2 «Ümumi faktiki
  xərc»-i tərkib sətrindən 20 px-lik ikinci rəqəmə qaldırır, amma zolaqda pulun bir hissəsinin hələ təsdiqlənmədiyi
  deyilmir; audit K5 məhz bunu risk kimi yazıb, dizayn yalnız xana səviyyəsində (○) cavab verir.
Sübut: 01-audit.md s.85, s.118; 03-ux.md s.702-747; 02-requirements.md §9 (risk «təsdiq gözləyən ay»).
İstiqamət: sahibə sual: zolaqda «təsdiq gözləyən sifarişlər daxildir» qeydi (statik söz) və ya gözləyən ayların sayı
  (say, pul deyil) lazımdırmı.
```

```
[DK-13] S3 · İstifadə (məlumat) · zolaq · bütün enlər · bütün rollar
Addımlar: 03 §3.3: hesabat açıq ikən başqa istifadəçi idxal və ya düzəliş edir; oxucu sonra növü dəyişir.
Gözlənilən: zolağın üç rəqəmi eyni anın API cavablarındandır.
Faktiki: «Ümumi faktiki xərc» il üzrə yaddaşda saxlanılır, növ və axtarış dəyişəndə təzələnmir (03 §3.3, UX-12);
  əsas rəqəm isə hər növ dəyişikliyində yenidən gəlir. Arada məlumat dəyişərsə, iki API rəqəmi bir-birinə zidd ola
  bilər (məs. «Aylıq» + «Kənar» > «Ümumi»).
Sübut: 03-ux.md s.179, s.1045-1047.
İstiqamət: «All» sorğusunu hər əsas sorğu ilə təkrarlamaq (növ «Hamısı» deyilsə) və ya yaddaşı əsas cavabın ömrünə
  bağlamaq; qiyməti — filtr dəyişikliyində bir əlavə sorğu.
```

```
[DK-14] S3 · Vizual (əlçatanlıq) · gələcək ay · masaüstü və kartlar · bütün rollar
Addımlar: 04 §5.5 gələcək ayın başlığı və xanası; boz tonlu və aşağı kontrastlı ekranda bax.
Gözlənilən: «gələcək ay» görünən işarə ilə ≥ 3:1 (qrafik element) və ya sözlə deyilir.
Faktiki: başlığın mətni artıq solğun deyil (doğru — 2,51:1 idi); «gələcək» başlıqda yalnız 3 px ştrix zolaqla və
  `title`-la (klaviaturada görünmür) deyilir. Ştrix xətti `outline-variant` `surface-container-low` üzərində 1,54:1-dir.
  Xanada ştrix + «—»-nin olmaması fərqi verir; başlıqda daşıyıcı zəifdir.
Sübut: 04-visual.md s.268, s.280; 03-ux.md s.243.
İstiqamət: xətti `outline` etmək (4,05:1) və ya başlıqda kiçik görünən işarə; UX-10-un boz tonlu yoxlamasına başlığı
  da daxil etmək.
```

```
[DK-15] S3 · İstifadə (3 saniyə) · ilk ekran · 1280×800, 1024×768 · Rəhbər
Addımlar: 03 §4.1-in hündürlük hesabını 1280×800 üçün təkrarla.
Gözlənilən: 02 §5 — «əsas rəqəm və cədvəlin məbləğləri bir baxışda oxunur», sahibin laptopunda da.
Faktiki: şaquli büdcə yalnız 1440×900 üçün hesablanıb (ilk sətir ~500 px). 1280-də filtrlər iki sıraya (03 §4.3),
  əfsanə 2–3 sətirə bükülür; Yığcam sətri 44 px deyil: məbləğ 18 + 2 + işarə sətri 14 + link `py-1` 8 + `td` `py-1` 8
  ≈ 50 px, təsdiqlənmiş ayların hamısında ● olduğu üçün demək olar hər sətirdə. Brauzerin paneli ilə 1280×800-də
  açılışda cədvəlin ~2–3 sətri, 1024×768-də ~1 sətri görünür. Bu, bugünkündən pis deyil, amma məqsədə 1280-də çatmır;
  «Yığcam 44 px (Figma ilə eyni)» iddiası iki sətirlik xana ilə uyğun gəlmir.
Sübut: 03-ux.md s.280-282, s.330, s.546; 04-visual.md s.100, s.271-274.
İstiqamət: 1280×800 üçün büdcə yazmaq; əfsanəni bir sətrə sıxmaq və ya «İşarələr» kimi açılan etmək, əsas rəqəmin
  altındakı `knownAmountHint`-i sayğacdakı «Məbləğ tam deyil» ilə birləşdirmək, sətrin real hündürlüyünü yazmaq.
```

```
[DK-16] S3 · İstifadə (əlçatanlıq) · filtrlər · 1280 (və hamısı) · bütün rollar
Addımlar: klaviatura ilə «Sıfırla»-nı bas; 1280-də «Standart»-ı siçanla bas.
Gözlənilən: fokus məntiqli yerə keçir; basılan idarəetmə elementi yerindən qaçmır.
Faktiki: (1) «Sıfırla» yalnız nəsə dəyişəndə görünür; basılanda hər şey defolta qayıdır → düymə yox olur → fokus
  `body`-yə düşür; hara getdiyi yazılmayıb (təsdiq səhifəsinin «Filtri təmizlə»-si də belədir,
  ApprovalInboxPage.tsx:237-245). (2) 1280-də sıra demək olar dolu: İl ~90 + axtarış 240 + növ ~290 + Sıfırla ~90 +
  Baxış ~160 + boşluqlar ≈ 930 / 939 px; «Standart» basılanda «Sıfırla»-nın görünməsi «Baxış»-ı ikinci sıraya ata
  bilər — basılan düymə göstəricinin altından qaçır.
Sübut: 03-ux.md s.691, s.975-978, s.300, s.328-330.
İstiqamət: «Sıfırla»-dan sonra fokusu axtarış sahəsinə (və ya «Sifariş növü»nə) vermək; «Sıfırla»-nı sıranın sonuna
  qoymaq və ya yerini saxlamaq; brauzerdə 1280-də yoxlamaq.
```

```
[DK-17] S4 · Vizual · Standart xananın işarə sətri · masaüstü · bütün rollar
Faktiki: keçən aya görə faiz və «⚠ N» `text-label-sm` (11/14, 0,04em, 600) ilə yazılır; token «yalnız qısa böyük
  hərfli etiket» üçündür (index.css:90-93), 04 §3-ün öz qaydası isə «rəqəmlər ən azı 12 px» deyir; faiz rəqəmdir.
Sübut: 04-visual.md s.145, s.157, s.274.
İstiqamət: faizi 12 px etmək və ya istisnanı açıq yazmaq.
```

```
[DK-18] S4 · Kod · seçilmiş qeyri-adi xana · masaüstü · bütün rollar
Faktiki: qeyri-adi xananın linkinə `costDirectionTintClass` `ring-1 ring-inset ring-red-200` verir (format.ts:348-350);
  seçilmiş xana `ring-2 ring-inset ring-primary` əlavə edir. Bir elementdə iki halqa rəngi — qalibi sinif sırası yox,
  Tailwind-in CSS sırası seçir; seçilmiş qeyri-adi xananın halqası qırmızı qala bilər.
Sübut: 04-visual.md s.278, s.285.
İstiqamət: seçiləndə tint halqasını şərti siniflə əvəzləmək; test.
```

```
[DK-19] S4 · İstifadə (əlçatanlıq) · panel və zolaq · 390 · bütün rollar
Faktiki: (1) panel sifariş səhifəsinin `PriceCell`-ini işlədəcək (03 §5.2) — daxili təminat və təsnif edilməyən
  sətirlərdə ⓘ var (OrderDetailPage.tsx:852-867): toxunma sahəsi `pointer-coarse:p-2.5` ilə 34 px, ikon `slate-400`
  ağda 2,63:1 (InfoHint.tsx:84-86) — mövcud komponent. (2) «Yenidən cəhd et» `h-8` (32 px), telefon ölçüsü verilməyib.
  AC-16: ≥ 44 px.
Sübut: 04-visual.md s.217-218; 03-ux.md s.882-883.
İstiqamət: «Yenidən cəhd et»-ə `touch` ölçüsü; ⓘ-ni ortaq komponentdə ayrıca işlə düzəltmək (W-04 kimi).
```

```
[DK-20] S4 · Kod · hesab və spesifikasiya xırdalıqları · masaüstü · —
Faktiki: (1) 1090-a 2 px çərçivə daxildir (03 §4.1), `min-w-[1090px]` isə cədvəlin özündədir (04 §5.5) — 2 px fərq.
  (2) Standart sətri 52 px deyil, ~54 px (18 + 2 + 14 + 8 + 12). (3) «Obyekt» başlığında defolt A–Z halında
  `aria-sort="ascending"` olub-olmadığı və ilk klikin nə etdiyi qeyri-müəyyəndir (03 §6.4: «aktiv deyilsə»).
Sübut: 03-ux.md s.264, s.546, s.641; 04-visual.md s.264.
İstiqamət: rəqəmləri düzəltmək; defolt sıranı «aktiv» saymaq (ilk klik Z–A).
```

```
[DK-21] S4 · Vizual · «Sifariş növü» seqmentləri · 390 · bütün rollar
Faktiki: 03 §4.6 sxemində «[Aylıq sif.│…]» qısaltması var, spesifikasiyada qayda yoxdur. Hesabla tam söz sığır
  («Aylıq sifarişlər» ~79 px, seqmentin mətn sahəsi ~91 px). Qısaltma olsa, D-V8 və WCAG 2.5.3 (görünən söz adın
  içində) yoxlanmalıdır.
Sübut: 03-ux.md s.417; DECISIONS.md D-V8.
İstiqamət: qısaltmanı sxemdən çıxarmaq və ya `accessibleLabel` qaydasını yazmaq.
```

```
[DK-22] S4 · Vizual · səhifə başlığı · bütün enlər · bütün rollar
Faktiki: il çipi (`data.year`) dərhal altındakı «İl» seçimi ilə eyni ili ikinci dəfə deyir; dəyirmi boz fonda
  düyməyə bənzəyir (D-S3 ruhu); yüklənərkən iki dəyər fərqli ola bilər (DK-04).
Sübut: 04-visual.md s.203-205.
İstiqamət: çipi çıxarmaq və ya zolağın başlığına («2026 · İlin xülasəsi») köçürmək.
```

```
[DK-23] S4 · Kod (əlçatanlıq) · cədvəl kartı · masaüstü · ekran oxuyucu
Faktiki: (1) «N / M obyekt»-in `role="status"`-u yalnız axtarışda yaradılır — yeni yaranan canlı bölgənin ilk mətni bəzi
  ekran oxuyucularda elan olunmur. (2) Eyni mətn üç dəfə: görünən `h2`, `sr-only` caption və sürüşən qutunun
  `aria-label`-i. (3) Üzən surətin `tabindex="-1"` düymələri siçanla basılanda fokusu `aria-hidden` bölgəyə aparır.
Sübut: 03-ux.md s.632-633, s.668-670, s.867-868.
İstiqamət: canlı bölgəni həmişə yerində saxlayıb mətnini dəyişmək; cədvəli `aria-labelledby` ilə `h2`-yə bağlamaq;
  surətin düyməsində fokusu əsl düyməyə yönəltmək.
```

```
[DK-24] S4 · İstifadə · panel · 1280 / 1440 · Rəhbər
Faktiki: ardıcıl ayları müqayisə etmək (İyun → İyul) üçün hər dəfə paneli bağlayıb yeni xananı basmaq lazımdır;
  1440-da panel cədvəlin sağ yarısını (İyl–Dek, İl cəmi) örtür — seçilmiş xana çox vaxt panelin altındadır, onu yalnız
  obyekt xanasındakı 3 px zolaq göstərir. Paneldə sətrin cavabdeh şəxsi (`LineResponsibleNote`,
  OrderDetailPage.tsx:938) yoxdur — sifariş səhifəsində var.
Sübut: 03-ux.md s.433-468, s.662, s.803-811.
İstiqamət: qeyd; sonrakı mərhələ üçün paneldə «‹ əvvəlki ay · növbəti ay ›»; cavabdeh şəxsin paneldə olmasını
  sahibdən soruşmaq.
```

```
[DK-25] S4 · Vizual · rəngin mənası · masaüstü və kartlar · bütün rollar
Faktiki: xanada ◆ (düzəliş tələb olunur, `amber-700`) və «⚠ N» (qiymət yoxdur, `amber-800`) yanaşı durur;
  pricing/labels.ts:88-90: «Amber means one thing on these screens: a price somebody owes is missing». UX_BRIEF-də
  kəhrəba ümumi xəbərdarlıqdır, ona görə ziddiyyət deyil, amma kiçik xanada iki kəhrəba işarə yalnız forma ilə ayrılır.
Sübut: 04-visual.md s.167; 03-ux.md s.592.
İstiqamət: qeyd; UX-10-un boz tonlu yoxlamasında ◆ ilə ⚠-nin ayrılmasını da yoxlamaq.
```

## Yoxlanıla bilməyənlər və səbəbi

- **Heç bir ekran görülməyib.** Server, baza və brauzer başladılmayıb (tapşırığın sərhədi, 8 GB RAM). Bütün en,
  hündürlük, şrift və qlif enləri hesabdır — [Fərziyyə]; B rejimində təsdiqlənməlidir: DK-07 (5 rəqəmli məbləğlərin
  bitişməsi, Geist və ₼ qlifinin eni), DK-15 (sətrin real hündürlüyü), DK-16 (1280-də filtr sırası), 1440-da Yığcamın
  qutusuz sığması (70,75 px / 70 px — ehtiyat 9 px).
- **Rəqəmlərin API ilə qəpiyinə uyğunluğu** (şəbəkə paneli) — B rejimində; burada yalnız sahələrin xəritəsi yoxlanıb.
- **Rollar.** Hesabatda yazma əməliyyatı yoxdur; zəngin rola görə görünməsi (`ApprovalsBell`) dəyişmir — brauzerdə üç
  rolla baxılmalıdır.
- **Üzən başlığın davranışı** — sinxron sürüşmə, titrəmə, `scroll-snap` ilə trackpad, Shift+çarx (DK-02): yalnız
  brauzerdə; jsdom ölçmür (dizayn özü də deyir).
- **Açıq `<select>`-də Esc.** 03 §8 «Esc açıq siyahını bağlayanda paneli bağlamır»-ı Modal-ın `defaultPrevented`
  qaydasına bağlayır, amma native `<select>` `preventDefault` etmir (Modal.tsx:109). Chrome-da açıq siyahı Esc-i özü
  udduğu üçün nəticə yəqin düzgündür, göstərilən mexanizm isə yox — brauzerdə yoxlanmalıdır.
- **Ekran oxuyucu:** `href` + `aria-haspopup="dialog"` olan xananın elanı (NVDA / JAWS) — B rejimində.
- **Modal-ın 44 px-lik «Bağla»sının** 24 dialoqun başlığına təsiri (DK-09) — 390-da hər dialoq açılmalıdır.
- **`top-16`-nın 8 px örtməsi** fərziyyəsi (01 §3) — dizayn onsuz da 72-yə keçir; köhnə ekranda ölçülməyib.
- **200% böyütmə** (03 §8) — brauzerdə.
- **Figma** açılmayıb: 04 §1-dəki Figma hex və px dəyərləri yoxlanmayıb; tənqid markdown dizayna və koda əsaslanır.
- **06-implementation.md** yalnız test planı və ortaq kod baxımından oxunub (DK-08, DK-09).
- **Sahibin açıq sualları cavabsızdır:** S-1 (axtarış və yuxarı rəqəmlər; D-50 №3-ün «filtrlərə uyğun» sözü) və S-2
  (1280, B-07). Təsdiq paketi bunlarsız tam deyil; S-2 DK-02-dəki faktlarla yenilənməlidir.

---

## Təkrar yoxlama (2026-10-15)

**Hökm: QEYDLƏRLƏ KEÇDİ.** S1 — 0; S2 — 0 (DK-01…DK-04 bağlandı). Açıq qalan: **S3 — 4** (DK-26…DK-29),
**S4 — 5** (DK-30…DK-34); hamısı yeni qüsurdur. İlk 25 qüsurdan 24-ü bağlandı, DK-08 qismən bağlandı (qalığı DK-30).
**Şərt:** DK-28 (S-2b-nin mətni) və DK-29 (AC-09) təsdiq paketi (05) sahibə verilməzdən əvvəl düzəldilsin: birincisi
sahibin qərar verəcəyi mətndir, ikincisi B rejimində yoxlanacaq meyardır.

**Mühit.** Rejim A, statik. Yoxlanılan sənədlər:
- `03-ux.md` və `04-visual.md` — Revizyon 1, §12-dəki cavab cədvəli ilə;
- yenidən yazılmış `06-implementation.md`;
- yenilənmiş `02-requirements.md` (M-06, AC-10).

Kod `b43c2c5`-dir və dəyişməyib. Brauzer, server və Figma işlədilmədi.

Rəqəm və simvol enlərini öz skriptimlə (`fontTools`) ayrıca ölçdüm. Mənbələr: sessiyanın scratchpad-ındakı Google Fonts
faylları (Geist, Inter — yalnız məlumat kimi oxundu) və Windows şriftləri (Segoe UI, Segoe UI Symbol, Segoe UI Emoji).
Dizaynerin ölçüləri ±0,1 px dəqiqliklə təsdiqləndi:
- «71.210,29 ₼»: Geist 400 12 px — 67,4; Geist 600 12 px — 70,4; Geist 400 11 px — 61,8; bugünkü Inter 500 11 px —
  66,9;
- Geist-də ₼ yoxdur — Segoe UI-dan gəlir (9,1 px);
- «Aylıq sifarişlər» — 81,8 px.

### İlk qüsurların vəziyyəti

| DK | İlk | Vəziyyət | Sübut (revizyon) |
|---|---|---|---|
| DK-01 | S2 | **bağlandı** | `scroll-padding-inline` 120 / 88 (E: 84), `scroll-margin-top` 124 / 72, surət yalnız `thead` xəttdən yuxarıda olanda, surətin düyməsi fokusu əsl düyməyə ötürür; UX-39 üç halla — 03 §6.3 (s.705-716), §8, UX-39; 04 §5.4, §5.5 (s.308). Sərhəd halı → DK-26 |
| DK-02 | S2 | **bağlandı** | (1) üzən başlığın altında 12 px-lik sinxron zolaq — 03 s.422-426, 04 s.288; (2) B ədalətlə təsvir olunub — §9.1; (3) 1280-də açılış «Fevral–Oktyabr», mətn və kartın başlığı düzəldi — §4.1, §4.3; (4) bugünkü vəziyyət açıq yazılıb, E variantı hesablanıb, S-2a və S-2b ayrıdır — §9.2, §11.1. E-nin sahibə təsviri → DK-28 |
| DK-03 | S2 | **bağlandı** | daimi `role="status"` bölgəsi filtrlərin altında, iki görünüşdən kənarda, hər endə — 03 §6.6 (s.751-754), §4.5, §4.6, UX-15b; 04 §5.3 (s.258-260); L266 testinin yeni yeri yazılıb |
| DK-04 | S2 | **bağlandı** | `shownKey`: bütün sözlər və rəqəmlər köhnə açardan gəlir («Ümumi faktiki xərc», sayğaclar, «N / M», «Cəmi» də daxil), idarəetmə elementləri URL-dən; «All» gecikirsə «…» — 03 §3.5 (s.224-232), §7, UX-20 |
| DK-05 | S3 | bağlandı | ✓ ⏳ ↩ (`workflowStatusSign`); ⏳ üçün U+FE0E və `Hourglass` ehtiyatı (ölçüldü: Segoe UI Symbol-da ⏳ 7,1 px, emoji kimi 16,5 px); ✓-in rəngi — S-3. Qeyd → DK-34 |
| DK-06 | S3 | bağlandı (qeyd kimi) | UX-08b — belə ay sahibə göstəriləcək; §9.6, alternativ 3 |
| DK-07 | S3 | bağlandı | enlər ölçülüb, üfüqi boşluq bir səviyyədədir, ay sütununda çəki 400, qonşu məbləğlər arasında ≥ 6 px; 1440-da 1 px ehtiyat və ehtiyat yolu var. Ölçülər müstəqil təsdiqləndi. Qalıq → DK-33 |
| DK-08 | S3 | **qismən** | §10.3 tək siyahıdır; L210, L311, L650, L905 əlavə olunub; `LastCalledWith` saxlanılır — doğrudur: «All» əvvəl getdiyi üçün əsas sorğu sonuncudur, StrictMode-da da. Qalıq → DK-30 |
| DK-09 | S3 | bağlandı | 03 §5.2 cədvəli; 06 §1, §4, §5 ilə uyğundur |
| DK-10 | S3 | bağlandı | «Sifarişə bax» hər yerdə; 02-də M-06 və AC-10 də yenilənib |
| DK-11 | S3 | bağlandı (03/04-də) | «Bütün sifarişin məbləği», «Hamısı» növündə göstərilmir, natamamlıq öz sətrindədir. 02-də AC-09 köhnə qalıb → DK-29 |
| DK-12 | S3 | bağlandı | statik cümlə və S-4 sualı əlavə olunub; qeydlər → DK-32 |
| DK-13 | S3 | bağlandı | «All» hər əsas sorğudan əvvəl, eyni `year` açarı ilə gedir; yaddaş yoxdur; il uyğun gəlməsə bir dəfə təkrarlanır — 03 §3.3, §9.17, UX-12; 06 §1 |
| DK-14 | S3 | bağlandı | ştrix xətti `outline` — 4,05:1 (hesablandı) |
| DK-15 | S3 | bağlandı | 1280×800 büdcəsi: 515 px → ~3,4 sətir (hesab yoxlandı). Qeyd: qiymətsiz sətir olanda alt xətt 1280-də iki sətrə bükülür (+18 px) |
| DK-16 | S3 | bağlandı | «Sıfırla» sıranın sonundadır, yeri `invisible` ilə saxlanılır, sonra fokus axtarışa keçir; sıra 925 ≤ 937 (seqment enləri ölçüldü: 296 / 152 px) |
| DK-17 | S4 | bağlandı | faiz 12 px-dir; E-də istisna açıq yazılıb |
| DK-18 | S4 | bağlandı | seçiləndə tint-in halqası əvəzlənir — 04 s.298 |
| DK-19 | S4 | bağlandı | panel `InfoHint` işlətmir; «Yenidən cəhd et» `lg`-dən aşağı 44 px-dir |
| DK-20 | S4 | bağlandı | `min-w` çərçivəsizdir; sətir 45 px; defolt `aria-sort="ascending"`, ilk klik Z–A |
| DK-21 | S4 | bağlandı | qısaltma yoxdur; ölçüldü: 81,8 px (aktivdə 83,4), mətn sahəsi ~91 px |
| DK-22 | S4 | bağlandı | il çipi çıxarılıb |
| DK-23 | S4 | bağlandı | canlı bölgə daimidir; `aria-labelledby` → `h2`; caption yoxdur; surətin düyməsi fokusu əsl düyməyə ötürür. Yeni zolaq üçün → DK-27 |
| DK-24 | S4 | bağlandı | sətirdə cavabdeh şəxs var (yerli yazılır); «‹ əvvəlki ay · növbəti ay ›» sonrakı mərhələyə qalıb |
| DK-25 | S4 | bağlandı | UX-10 ↩ ilə ⚠-nin forma fərqini yoxlayır |

### Yeni bəndlərin qısa qiyməti

- **E (1024–1439 px-də 11 px).** Hesab doğrudur:
  - 1280: 733 / 68 = 10,8 ay, açılışda Yanvar–Oktyabr görünür;
  - 1366: 1.020 ≤ 1.023 — 12 ayın hamısı görünür;
  - qonşu məbləğlər arasında ≥ 6,3 px qalır.

  Amma sahibə təsviri dəqiq deyil (DK-28); ölçü tokendən deyil (DK-31); Standart xananın 2-ci sətrində qalıq var
  (DK-33).
- **Paneldə cavabdeh şəxs (`LineResponsibleNote` əvəzinə yerli yazılır).** Qəbul olunur:
  - sözlər tək mənbədəndir (`orderLines/responsibility.ts`: «Cavabdeh», «Cavabdeh təyin edilməyib»);
  - məntiq ortaq komponentlə eynidir: ad yoxdursa — «təyin edilməyib»;
  - kontrast daha yaxşıdır: `on-surface-variant` 9,3:1, ortaq komponentin `slate-400`-ü isə 2,6:1.

  Qiyməti: ortaq komponent düzələnə qədər sifariş səhifəsi ilə panel eyni faktı fərqli rəngdə yazır. Bu düzəliş 03
  §11.3-də var, amma 06 §5-in «ayrıca işlər» siyahısında yoxdur — ora əlavə edilsin.
- **S-4 statik cümləsi.** Rəqəmsizdir, heç nə hesablamır, faktı düz deyir: hesabat statusdan asılı olmayaraq sayır
  (`MonthlyReportQueries.cs:74-82`). Tənqiddəki təklifdən dəqiqdir, çünki qaralama və qaytarılan sifarişləri də əhatə
  edir. Qeydlər → DK-32.
- **06 ↔ 03.** Ziddiyyət qalmayıb:
  - tək test planı 03 §10.3-dür;
  - «All» sorğusu əsasdan əvvəl gedir;
  - `OrderDetailPage`, `Modal`/`Drawer`, `PageHeader` dəyişmir;
  - ayrıca təsdiqlənən üç bənd 03 §5.2 ilə eynidir.

  Yalnız 06 §5-də `LineResponsibleNote`-un kontrast düzəlişi yoxdur (yuxarıdakı qeyd).

### Yeni qüsurlar

```
[DK-26] S3 · İstifadə (əlçatanlıq) · cədvəlin başlığı, Seçim A · masaüstü (1024+) · bütün rollar
Addımlar: UX-39-un 2-ci halı: cədvəlin ortasından birinci sətrə, oradan Shift+Tab ilə «İl cəmi» sıra düyməsinə.
Gözlənilən: düymənin fokus halqası tam görünür, üzən başlıq gizlidir (UX-39).
Faktiki: düyməyə `scroll-mt-18` (72 px) verilib. Düymə 40 px-lik `th`-nin ortasındadır (18 px hündür → `th`-nin
  yuxarısından ~11 px aşağıda). Brauzer düymənin yuxarısını 72-yə gətirir, `thead`-in yuxarısı isə ~61-də qalır — xəttin
  ~11 px yuxarısında. Surətin şərti («`thead` 72 xəttindən yuxarı çıxanda», IntersectionObserver, `rootMargin: -72px 0 0
  0`) hansı kənarın sayıldığını demir. Yuxarı kənar sayılsa, surət (72–124 px, `z-10`) fokuslanan əsl düyməni (72–90 px)
  tam örtür. 03 §6.3-ün 3-cü bəndindəki «`thead` artıq xəttdən yuxarıda olmadığı üçün surət gizlənir» cümləsi bu ~11
  px-i nəzərə almır.
Sübut: 03-ux.md s.417-418, s.712-714; 04-visual.md s.285-286, s.308.
İstiqamət: sıra düymələrinin `scroll-margin-top`-u = 72 + düymənin `th`-dəki ofseti (~84 px, `scroll-mt-21`); ya da
  surətin şərtini açıq yazmaq: «`thead`-in alt kənarı 72 xəttindən yuxarı çıxanda».
```

```
[DK-27] S3 · Kod (əlçatanlıq) · üzən başlığın sinxron zolağı · masaüstü, qutu sürüşəndə · klaviatura, ekran oxuyucu
Addımlar: 04 §5.5 «Üzən başlıq»: zolaq `overflow-x-auto`-dur, içində fokuslanan element yoxdur; surət bütövlükdə
  `aria-hidden`-dir, `tabindex="-1"` isə yalnız düymələrə verilib.
Gözlənilən: UX-40 — «`aria-hidden` bölgədə fokuslanan element yoxdur»; zolaq yalnız siçan üçündür.
Faktiki: içində fokuslanan uşağı olmayan sürüşmə konteyneri Firefox-da və Chrome-un 130-cu versiyasından bəri
  klaviatura ilə fokuslanır, yəni Tab dayanacağına çevrilir. Zolağa `tabindex="-1"` yazılmayıb. Surət görünəndə
  `aria-hidden` bölgədə adsız Tab dayanacağı yaranır; axe-nin `aria-hidden-focus` qaydası bunu tutar.
Sübut: 04-visual.md s.288; 03-ux.md s.422-426, UX-40 (s.1214-1215).
İstiqamət: zolağa `tabindex="-1"` vermək — klaviatura onsuz da xananın fokusu ilə qutunu sürüşdürür (03 §6.3);
  UX-40-a «surət görünərkən axe» halını əlavə etmək.
```

```
[DK-28] S3 · İstifadə (sahibə sual) · S-2b, cədvəlin rəqəmləri · 1024–1439 · Rəhbər
Addımlar: 03 §11.1 S-2b-ni §4.1-in ölçü cədvəli ilə tutuşdur; rəqəmin hündürlüyünü şrift fayllarından ölç.
Gözlənilən: hər seçimin qazancı və qiyməti düz deyilir (DESIGN_WORKFLOW: «Alternatives with trade-offs»).
Faktiki: S-2b 12 px variantını «iri», E-ni «11 px, bu günkü kimi» adlandırır. Bu gün rəqəm Inter 500 11 px-dir, V2-də isə
  Geist 400. Ölçü nəticələri:
  - rəqəmin hündürlüyü: bu gün 8,0 px, 12 px variantında 8,5 px, E-də 7,8 px;
  - «71.210,29 ₼»-ın eni: bu gün 66,9 px, 12 px-də 67,4 px, E-də 61,8 px;
  - çəki hər iki variantda 500-dən 400-ə enir.
  Deməli, 12 px variantı təxminən bugünkü ölçüdədir (bir az incə), E isə bu gündən kiçik, dar və incədir. Üstəlik E
  auditin «rəqəmlər ən azı 12 px» bəndindən (01 §6, 7-ci bənd) aşağıdır; sahib auditi qəbul edib. S-2b bunu demir,
  04 §8-in 11-ci bəndi isə «kiçik rəqəmlər geri gəlməyib» yazır.
Sübut: 03-ux.md s.1340-1346, s.276-280, s.993; 04-visual.md s.152, s.165-166, s.404-405; 01-audit.md §6, 7-ci bənd.
İstiqamət: S-2b-ni dəqiq yazmaq: «12 px — rəqəmlər təxminən bugünkü ölçüdədir; E — bu gündən bir az kiçik və incə,
  auditin 12 px tövsiyəsindən aşağı». Mümkünsə 1280-də iki variantın şəklini göstərmək. 04 §8-in 11-ci bəndini E üçün
  dəqiqləşdirmək. 05-ə qədər düzəldilsin.
```

```
[DK-29] S3 · Kod (sənəd) · tələblər, AC-09 · — · —
Addımlar: 02-dəki AC-09-u 03 §6.9.6 və UX-28 ilə tutuşdur.
Gözlənilən: qəbul meyarı dizaynla eyni şeyi deyir.
Faktiki: 02-də AC-09 hələ «“Sifarişin cəmi (bütün sətirlər)” API-dən gəlir və xananın növ məbləğindən aydın şəkildə
  ayrılır» deyir. Dizayn isə bu rəqəmi «Bütün sifarişin məbləği» adlandırır və «Hamısı» növündə göstərmir. 02-də M-06 və
  AC-10 yenilənib, AC-09 yox. B rejimində AC-09 sözbəsöz yoxlansa, «keçmir» çıxar.
Sübut: 02-requirements.md s.150; 03-ux.md s.876-882, s.1171-1174.
İstiqamət: AC-09-u dizayna uyğunlaşdırmaq: yeni ad və «Hamısı» növündə göstərilməməsi, səbəbi ilə. 05-ə qədər.
```

```
[DK-30] S4 · Kod · test planı (DK-08-in qalığı) · — · —
Faktiki:
  - 03 §10.3-B-də L1310 üçün «eyni» yazılıb. Amma test xanaya klikləyib sifariş səhifəsindəki «Hesabata» linkini
    gözləyir; D mərhələsindən sonra klik paneli açacaq və test düşəcək.
  - L1322 və L1351 üçün yalnız çağırış cütləri yazılıb. Hər ikisi xanaya klikləyib OrderStub-un «Geri» düyməsini
    gözləyir, qayıdışdan sonra isə ünvanın `?search=Novxan` olduğunu yoxlayır. V2-də araya «Sifarişə bax» addımı
    girir, ünvanda isə `year` və `cell` də olacaq.
Sübut: MonthlyReportPage.test.tsx:1310-1319, :1335-1347, :1356-1363; 03-ux.md s.1304-1305. 06 §2 «coming back»
  blokunu bütövlükdə D mərhələsinə verir, ona görə risk azdır.
İstiqamət: bu üç testin B cədvəlindəki sətrinə «xana → panel → Sifarişə bax» addımını və yeni ünvanı yazmaq.
```

```
[DK-31] S4 · Kod · E-nin rəqəm ölçüsü · 1024–1439 · —
Faktiki: E `text-[11px] leading-4` işlədir — bu, token deyil (M-11). `label-sm` (11/14) bilərəkdən işlənmir və bu
  doğrudur, amma onda istisna 04 §7-nin tokendən kənar siniflər siyahısına yazılmalıdır; orada yoxdur.
Sübut: 04-visual.md s.152-153, s.292-293, s.372-385.
İstiqamət: E seçilərsə, istisnanı §7-yə yazmaq; ya da `index.css`-də rəqəm üçün 11/16 tokeni yaratmaq (qlobal
  dəyişiklikdir, ayrıca bənd kimi).
```

```
[DK-32] S4 · İstifadə · S-4 statik cümləsi · bütün enlər · bütün rollar
Faktiki:
  (1) Cümlə həmişə görünür, sifarişlərinin hamısı təsdiqlənmiş il üçün də (məs. 2025); S-4 sualı bu qiyməti sahibə
      demir. Daha dəqiq variant («yalnız ildə təsdiqlənməmiş sifariş olanda göstər») statuslar üzrə bəli/xeyr cavabı
      tələb edir — bu pul hesabı deyil. Amma axtarışdan asılı olmasın deyə cavab «All» sorğusunun sətirlərindən
      oxunmalıdır; «Hamısı» növündə axtarış aktiv olanda belə cavab yoxdur.
  (2) Cümlədəki ⏳ adi mətndə U+FE0E olmadan rəngli emoji (16,5 px) kimi çıxacaq və `sky-700` rəngini almayacaq;
      04 §5.2 bunu demir.
  (3) Telefonda «cədvəldə» sözü əslində kartlara aiddir.
Sübut: 03-ux.md s.814-817, s.1351-1354; 04-visual.md s.235.
İstiqamət: bu qiyməti S-4-ə əlavə etmək; ⏳ üçün `StatusMark`-ın qaydasını tətbiq etmək (U+FE0E / `Hourglass`); sözü
  «cədvəldə və kartlarda» etmək və ya sadəcə «⏳ ilə işarələnib» yazmaq.
```

```
[DK-33] S4 · Vizual · Standart xananın 2-ci sətri · 1024–1439 (E) · —
Faktiki: kodda və testdə «⚠ N» boşluqla yazılır («⚠ 2» — MonthlyReportTable.tsx:321; MonthlyReportPage.test.tsx:223).
  Boşluqla «✓ ⚠ 12 +235,89%» 12 px-də 99,9 px, 11 px-də 92,2 px tutur; 03 §4.1 boşluqsuz hesablayıb (96,4 / 89,1).
  106 / 98 px-lik sütunda qonşu ilə 6,1 / 5,8 px qalır: E-də 6 px qaydası 0,2 px pozulur və mətn linkin qutusundan
  ~2 px çıxır.
Sübut: 03-ux.md s.293-294; ölçü (fontTools: Geist, Segoe UI Symbol).
İstiqamət: Standartın E minimumunu 100 px etmək (1440-dan aşağı Standart onsuz da qutuda sürüşür), ya da hesabı
  boşluqla yeniləmək.
```

```
[DK-34] S4 · İstifadə (söz) · S-3 sualı, 02 · — · Rəhbər
Faktiki: D-50 «Status nöqtələri … qorunsun» deyir. V2 nöqtələri məhsulun öz simvolları ilə (✓ ⏳ ↩) əvəz edir — DK-05-in
  istədiyi də budur. Amma S-3 yalnız ✓-in rəngini soruşur, «nöqtə → simvol» dəyişikliyini sahibə demir. 02-də M-07,
  AC-02 və §9-un risk cədvəli hələ «status nöqtəsi» yazır.
Sübut: 03-ux.md s.1348-1349; 02-requirements.md s.104, s.143, s.166.
İstiqamət: S-3-ə bir cümlə əlavə etmək: «Cədvəldəki status nöqtələri məhsulun öz işarələri ilə əvəz olunur: ✓ ⏳ ↩».
  02-də sözü «status işarəsi» etmək.
```

### Yoxlanıla bilməyənlər (təkrar yoxlama)

- **Brauzerin render-i.** Hinting ±1 px dəyişə bilər, 1440-da Yığcamın ehtiyatı isə cəmi 1 px-dir. Dizayn bunun üçün
  ehtiyat yol yazıb: obyekt sütunu 116 px.
- **⏳ + U+FE0E** Windows Chrome-da monoxrom çıxırmı (UX-10b).
- **Sinxron zolaq:** `scrollbar-width: thin` 12 px-lik qaba sığırmı; zolaq brauzerdə həqiqətən Tab dayanacağına
  çevrilirmi (DK-27).
- **IntersectionObserver-in sərhəd davranışı** (DK-26).
- **Əfsanə** 1440-da bir sətrə sığırmı (~1.055 / 1.065 px).
- **Obyekt adları:** 27 adın hamısı 104 px-də iki sətrə sığırmı — 03-də yalnız üç ad ölçülüb.
- **Rəqəmlərin API ilə uyğunluğu, rollar, ekran oxuyucu** — B rejimində.
