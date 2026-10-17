# UI V2 — Aylıq hesabat: audit, risklər və plan

**Tarix:** 2026-10-15 · **Mərhələ:** 1 — Audit (`AI_WORKFLOW/DESIGN_WORKFLOW.md`) · **Tətbiqin kodu dəyişməyib.**

## Sahibin tapşırığı (sözbəsöz)

> BaxOrders layihəsində UI/UX V2 tətbiqinə başlayırıq.
>
> Figma dizaynları:
> Yığcam cədvəl: https://www.figma.com/design/rtCWL4rS03iOyhKFtGcaGh/Untitled?node-id=10-3
> Standart cədvəl: https://www.figma.com/design/rtCWL4rS03iOyhKFtGcaGh/Untitled?node-id=16-2
> Detal paneli: https://www.figma.com/design/rtCWL4rS03iOyhKFtGcaGh/Untitled?node-id=17-2
> Analitika: https://www.figma.com/design/rtCWL4rS03iOyhKFtGcaGh/Untitled?node-id=19-2
>
> 1. Mövcud frontend strukturunu və dizayn tokenlərini araşdır.
> 2. Figma dizaynlarını oxu və mövcud kodla müqayisə et.
> 3. UI V2 üçün mərhələli tətbiq planı hazırla.
> 4. Hazırkı işlək funksiyaları, API müqavilələrini və biznes məntiqini qoru.
> 5. Figma-dakı statik nümunə məlumatlarını həqiqi məlumat kimi istifadə etmə. Mövcud tətbiq və verilənlər bazası əsas mənbədir.
> 6. Backend, hesablamalar və verilənlər bazası dəyişməsin.
> 7. İşə başlamazdan əvvəl Git statusunu və mövcud testlərin vəziyyətini yoxla.
>
> Hələ kod dəyişmə. Əvvəl audit nəticəsini, riskləri və həyata keçirmə planını göstər.

**Necə yoxlanıldı:** Figma MCP (`get_metadata`, `get_design_context`, `get_variable_defs`) — dörd kadrın hamısı;
kod oxundu (aşağıdakı fayllar); `npx vitest run`, `npm run build`; backend sorğusu
`MonthlyReportQueries.cs` yalnız oxundu.

---

## 1. Başlanğıc vəziyyət

| | Nəticə |
|---|---|
| Git | `main`, GitHub-dan 1 commit irəli (`b43c2c5`, Oktyabr idxalı). Commit edilməmiş: `.gitignore`, `.claude/`, `CLAUDE.md`, `AI_WORKFLOW/DESIGN_WORKFLOW.md` (dizayn iş axını). Frontend və backend kodunda dəyişiklik yoxdur. |
| Testlər (tam qaçış) | 77 fayldan 76-sı, 1472 testdən 1471-i keçdi. 1 test 20 s limitini aşdı: `OrderDecisionPage.test.tsx` › «the way back to the monthly report › opens the report for the order’s year once the reader has pushed an entry of this page’s own». Fayl tək işlədiləndə **135/135 keçir** (33 s). Səbəb maşının yüküdür (tam qaçış 145 s, 8 GB RAM), kod xətası deyil. |
| Build (`tsc -b && vite build`) | Keçir. Köhnə xəbərdarlıqlar: əsas paket 708,5 kB (> 500 kB); `vite.config.ts`-də JSON importu. |

Vaxtı aşan test məhz V2-nin toxunacağı yolu yoxlayır: sifarişdən aylıq hesabata qayıdış (24.3). Tam qaçışda yenə
düşərsə, fayl ayrıca işlədilib nəticə qeyd olunacaq. Testin özü zəiflədilməyəcək.

---

## 2. Figma: nə var

Fayl `rtCWL4rS03iOyhKFtGcaGh` («Untitled»), 4 kadr, hər biri **yalnız 1920 px** genişlikdədir:

| Kadr | Node | Nə göstərir |
|---|---|---|
| Yığcam cədvəl | `10:3` | 12 ay bir ekranda, xanada yalnız məbləğ; obyekt və «İl cəmi» sütunları sabit; Noy–Dek «Gələcək»; seçilmiş sətir və xana; altda əfsanə və «Görünür: 8 obyekt / Ümumi: 27 obyekt». |
| Standart cədvəl | `16:2` | 8 ay görünür (Mar–Okt), qalanı üfüqi sürüşür; xanada məbləğ + «əvvəlki aya nisbət» faizi; qeyri-adi ay narıncı nöqtə və narıncı faizlə; «İlk mövcud ay» yazısı. |
| Detal paneli | `17:2` | Sağda 530 px panel, arxada tünd örtük: yol (il / ay / növ), obyekt, ayın məbləği, «Qeyri-adi artım · +235.89%», «Niyə işarələnib?», «Əlaqəli sifarişlər» (boş vəziyyət), «Bütün əlaqəli sifarişlərə bax ↗», «Esc · Paneli bağla». |
| Analitika | `19:2` | «Cədvəl / Analitika» keçidi; seçilmiş obyektin 12 aylıq sütun qrafiki (gələcək aylar boz); 5 obyektin illik müqayisəsi; «Qeyri-adi xərc nümunələri» (3 sətir). |

Dörd kadrın ortaq hissələri: sidebar **220 px**, üst panel **64 px**, «Maliyyə icmalı» zolağında 3 bərabər pul rəqəmi
(birincisi mavi), altında sifariş sayı, obyekt sayı və «Qiyməti olmayan» xəbərdarlığı; filtr sırası: İl, obyekt
axtarışı, «Sifariş növü» (Aylıq sifarişlər / Aylıqdan kənar / Hamısı), «Sıfırla», görünüş keçidi.

**Faylın özü haqqında**

- Dəyişən (variable) və komponent yoxdur: hər şey xam hex rəng və mütləq mövqedir. Figma şəkil kimidir, dizayn
  sistemi deyil. Kod ona baxıb mövcud tokenlər və komponentlərlə yığılmalıdır.
- Rənglər: sidebar `#111d33`, aktiv menyu `#243c60`, vurğu `#2563eb`, fon `#f4f7fb`, mətn `#15253d`, ikinci dərəcəli
  mətn `#687a94`, xətt `#dfe6f0`, xəbərdarlıq `#b76a0a`.
- Şrift yalnız Inter; rəqəmlərin çoxu 10–12 px; sətir hündürlüyü «normal» (~1,2×).
- Faylın adı «Untitled»-dır və 29 sentyabrda təsdiqlənmiş `BaxOrders-UI-v2`-nin `6:4` kadrı burada yoxdur — ya
  başqa fayldır, ya o kadr silinib. Hər iki halda bu kadrların karkası təsdiqlənmiş karkasdan (D-V1, D-V2)
  **fərqlidir** və yeni təklif kimi oxunur.
- Figma-dakı rəqəmlər canlı hesabatın bir anlıq görüntüsüdür (190 sifariş = 166 təsdiqlənmiş + 24 təsdiq gözləyən
  Oktyabr sifarişi). Tapşırığın 5-ci bəndinə görə bu rəqəmlər heç yerdə istifadə olunmur; ekran həmişə API-dən
  oxuyur.

---

## 3. Mövcud kod: nə var

Ekran: `/dashboard/monthly` → `src/pages/MonthlyReportPage.tsx`.

| Hissə | Fayl | Nə edir |
|---|---|---|
| Səhifə | `pages/MonthlyReportPage.tsx` | İl seçimi, axtarış (Enter ilə), `ScopeSelector`. Vəziyyət URL-dədir: `year`, `search`, `scope`. Yüklənir / boş / xəta vəziyyətləri. Geri qayıdanda açılan sətrə qayıdır (`useScrollMemory`). |
| Başlıq rəqəmləri | `components/reports/ReportHeadline.tsx` | Bir böyük rəqəm (seçilmiş növün məbləği) + tərkib sətri (aylıq / aylıqdan kənar / təsnif olunmamış / cəm) + 3 sayğac (Sifariş, Obyekt, Qiyməti olmayan). UX_BRIEF §7-yə uyğun qurulub. |
| Cədvəl | `components/reports/MonthlyReportTable.tsx` (580 sətir) | 12 ay bir cədvəldə; obyekt solda, «İl cəmi» sağda yapışqan. Xanada: məbləğ, aydan-aya faiz (qırmızı/yaşıl, 9.1), status nöqtəsi, «⚠ N» qiymətsiz sətir. Qeyri-adi ay istiqamət rəngi ilə (8.2), gələcək ay ştrixlə. Altda şirkətin aylıq cəmi (8.1). Xana sifarişi açır və geri yol verir (24.3); obyektin adı obyekt səhifəsini açır. |
| Telefon | eyni fayl, `MonthlyReportYearList` | `lg`-dən aşağı hər obyekt üçün kart: 12 aylıq kiçik sütun zolağı + 3×4 ay şəbəkəsi. |
| API | `api/reports.ts` → `GET /api/v1/reports/monthly?year&search&scope` | Hər xana üçün: `knownAmount`, `deltaAmount`, `deltaPercent`, `previousMonthKnownAmount`, `recentAverageKnownAmount`, `recentAveragePercent`, `isUnusual`, `status`, `version`, `missingPriceItemCount`, `amountIsComplete`, tərkib (aylıq / aylıqdan kənar / təsnifsiz). Sətirlər ada görə sıralanır. Hər obyekt+ay üçün son versiya sayılır, statusundan asılı olmayaraq — təsdiq gözləyənlər də daxildir. |
| Karkas | `layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `navigation.ts` | Sidebar 260 px, `bg-slate-800`, aktiv `bg-[#2a3649]` + mavi zolaq, alt hissədə istifadəçi. Başlıq 72 px: təşkilat/məhsul, server xəbərdarlığı, təsdiq zəngi (sayla), istifadəçi menyusu. Telefonda sidebar çəkməcədir; menyu rola görə gizlənir. Fon `bg-[#f5f5f3]`. |
| Sağ panel | `components/imports/review/Drawer.tsx` | `Modal`-ın sağ variantı: Esc, fokus tələsi və qayıdışı, səhifə scroll-unun kilidi; arxa fon yüngüldür (`bg-slate-900/20`) ki, səhifə oxunsun (19.1); telefonda tam ekran. İstifadəçiləri: `ChangeDetailDrawer`, `TrendModal`. |
| Qrafik | `components/analytics/TrendChart.tsx` | recharts, ayrıca yüklənən 353 kB paket; idarəetmə panelində işlənir. |
| Tokenlər | `src/index.css` `@theme` | `primary #08162f`, `secondary #0051d5` (yalnız «bu nəsə edir» mənasında), `cost-up #be2c2c`, `cost-down #0d7c4c`, Geist başlıq və rəqəmlər üçün, Inter mətn üçün. Xəbərdarlıq (kəhrəba) üçün token yoxdur — kodda stock `amber-*` işlənir. |
| Format | `components/analytics/format.ts` | `formatMoney` → «326.951,62 ₼» (az-Latn-AZ). Rəng köməkçiləri (`costDirection*`) stock `red-*` / `emerald-*` siniflərini qaytarır və bütün analitika ekranlarında işlənir. |

Testlər: `MonthlyReportPage.test.tsx` — 78 test; onlardan **30-u CSS sinfini yoxlayır, cəmi 69 yoxlama sətri**
(`bg-red-50`, `text-red-700`, `min-w-[1000px]`, `max-[1063px]:overflow-x-auto`, `lg:hidden`, `grid-cols-12`,
`top-16` …). Karkas üçün: `Header.test.tsx`, `auth.test.tsx`.

> **Düzəliş (2026-10-15):** bu sənədin ilk variantında «29 yoxlama» yazılmışdı. O rəqəm 30 sətirə kəsilmiş axtarış
> nəticəsindən sayılmışdı və səhv idi. Düzgün sayım (bütün fayl, test-test): 30 test, 69 sətir. Siyahı
> `03-ux.md`-nin test planındadır.

Kodda görünən, brauzerdə təsdiqlənməli bir müşahidə **[Fərziyyə]**: başlıq 72 px-dir, cədvəlin yapışqan başlığı isə
64 px-də dayanır (`top-16`, `MonthlyReportTable.tsx:126`). Səhifə sürüşəndə cədvəl başlığının 8 px-i üst başlığın
altında qala bilər.

---

## 4. Müqayisə: Figma ↔ bu gün

**Əsas nəticə:** Figma-dakı məlumatların demək olar hamısını API artıq verir. Yeni backend lazım deyil.

| Figma elementi | Bu gün | Məlumat mənbəyi | Qeyd |
|---|---|---|---|
| 12 aylıq cədvəl, obyekt və il cəmi sabit | Var | `rows[].months[]` | Görünüş dəyişir, məntiq yox. |
| Aydan-aya faiz | Var (qırmızı/yaşıl) | `deltaPercent` | Figma boz verir → K1. |
| Qeyri-adi ay | Var (istiqamət rəngi ilə) | `isUnusual`, `recentAveragePercent` | Figma yalnız artımı göstərir → K2. |
| Gələcək aylar | Var (ştrix) | `isFutureMonth` | Figma «Gələcək» sözü yazır. |
| Sifarişsiz ay «—» | Var | `orderRequestId = null` | — |
| Qiyməti olmayan sətirlər | Var (xanada ⚠ N) | `missingPriceItemCount`, `amountIsComplete` | Figma-da yalnız üst zolaqda. |
| Status nöqtələri | Var | `status` | **Figma-da yoxdur** → K5. Oktyabrın 24 sifarişi təsdiq gözləyir; status görünməsə, təsdiqlənməmiş pul fakt kimi oxunar. |
| Şirkətin aylıq cəmi (alt sətir) | Var (8.1) | `months[]` | **Figma-da yoxdur** → K5. |
| «Sifariş növü» (3 seçim) | Var | `scope` | Sözlər eynidir. |
| İl, axtarış | Var | `year`, `search` | — |
| «Görünür: 8 / 27» | Var | `filteredLocationCount`, `locationCount` | — |
| 3 pul rəqəmi | 1 böyük + tərkib sətri | `monthlyKnownAmount`, `outsideMonthlyKnownAmount` | «Ümumi faktiki xərc» API-də ayrıca sahə deyil; bu gün brauzer toplayır (`ReportHeadline.tsx:55-58`) — CLAUDE.md qaydasına zidd köhnə borc → K3. |
| Sifariş sayı, obyekt sayı | Var | `requestCount`, `locationCount` | — |
| Standart / Yığcam keçidi | **Yoxdur** | — | Yeni; URL açarı `view`. |
| Obyekt / il cəminə görə sıralama | **Yoxdur** | `locationName`, `knownAmount` | Yeni; API-nin rəqəmini sıralamaq hesablama deyil. URL açarı `sort`. |
| «Sıfırla» | **Yoxdur** | — | Yeni. |
| Xanaya klik → sağ panel | Xana birbaşa sifarişi açır | `orderRequestId`; sətirlər üçün mövcud `GET /api/v1/orders/{id}` | Yeni; `Drawer` hazırdır. URL açarı `cell`. |
| Analitika görünüşü | **Bu ekranda yoxdur** (idarəetmə panelində trend var) | eyni hesabat cavabı | Yeni → sual 7. |
| Telefon / planşet | Var (kartlar) | — | **Figma-da yoxdur.** |
| Təsdiq zəngi, server xəbərdarlığı | Var | — | **Figma-da yoxdur** → K5 (D-V3). |

---

## 5. Ziddiyyətlər: Figma ↔ sahibin qərarları

Bunları Figma-ya baxıb səssizcə dəyişmək olmaz — hər biri sahibin qərarıdır.

**K1 · Rəng qaydası (qərar 9.1; D-F3, D-V5).** Qayda: xərc artıbsa qırmızı, azalıbsa yaşıl. Figma faizləri boz,
qeyri-adi ayı narıncı göstərir. **Tövsiyə:** 9.1 qalır; narıncı yalnız xəbərdarlıq üçündür (qiyməti olmayan sətir).

**K2 · Qeyri-adi ay (qərar 8.2).** Qayda: son 3 mövcud ayın ortalamasından **±50%** fərq — həm artım, həm azalma;
qərarı backend verir (`isUnusual`). Figma yalnız artımı işarələyir («50%-dən çox artım», «Qeyri-adi artım»). Qaydanı
yalnız artıma çevirmək backend dəyişikliyidir — 6-cı bəndə görə indi mümkün deyil. **Tövsiyə:** API-nin qərarı hər iki
istiqamətdə göstərilir, mətn «±50%» deyir.

**K3 · Üç bərabər rəqəm (UX_BRIEF §7: «üç nəhəng rəqəm birə enir»; `ReportHeadline`).** Figma üç pul rəqəmini eyni
ölçüdə verir, birincisini mavi rəngdə. Mavi (`secondary`) bu məhsulda «bu nəsə edir» deməkdir — rəqəm link kimi
görünər. Bundan başqa, «Ümumi faktiki xərc» API sahəsi deyil, bu gün brauzer toplayır. **Tövsiyə:** Figma-nın zolağı
saxlanır, amma seçilmiş növün rəqəmi böyük, digər ikisi kiçik; rəqəm mavi olmur. Cəm üçün backend-ə kiçik sahə
əlavə etmək sonra, ayrıca qərarla olar.

**K4 · Karkas (D-V1, D-V2).** Təsdiqlənmiş karkas: sidebar 260 px, başlıq 72 px, tokenlər (navy `primary`, Geist
rəqəmlər). Figma: 220 px, 64 px, `#2563eb` / `#111d33`, yalnız Inter. **Tövsiyə:** ölçülər və düzülüş Figma-dan
(220 px cədvələ 40 px qazandırır və açıq qalan B-07-ni — 1280 px-də səhifənin yana sürüşməsini — azaldır; 64 px
başlıq cədvəlin yapışqan başlığının dayandığı 64 px ilə eyni olur), rənglər və şrift mövcud tokenlərdən. **Alternativ:** bütün
məhsulu Figma rənglərinə keçirmək — bütün səhifələr dəyişir və iki dizayn dili qarışır.

**K5 · Figma-da olmayan, amma işləyən imkanlar.** Şirkətin aylıq cəmi (8.1), status nöqtələri, təsdiq zəngi (D-V3),
server xəbərdarlığı, telefon kartları, sifarişdən hesabata qayıdış (24.3), obyekt səhifəsinə keçid. **Tövsiyə:** heç
biri silinmir (UX_BRIEF: imkanı silmə, arxaya köçür) — məsələn, status nöqtəsi kiçik qalır, sözlə paneldə deyilir.

---

## 6. Figma-da düzəldilməli xətalar

Figma əsas sənəd olacaqsa, bunlar orada da düzəldilməlidir:

1. **Panel yanlış olaraq deyir ki, sifariş detalları bazada yoxdur** («Mənbədə yalnız aylıq cəm var…», «…bazaya
   qoşulması tələb olunur»). Bütün sətirlər bazadadır və sifariş səhifəsi onları göstərir. Panel əsl sifarişi
   göstərməlidir.
2. **Paneldəki faiz səhv əsasla izah olunur.** «+235.89%» keçən aya nisbətdir (3 939,02 / 1 172,70), izah isə
   «əvvəlki üç ayın ortalaması»ndan danışır. Həmin ay üçün ortalamaya nisbət təxminən +93%-dir. API hər ikisini verir
   (`deltaPercent`, `recentAveragePercent`) — hər biri öz adı ilə göstərilməlidir.
3. **«İlk mövcud ay»** keçən ayı boş olan hər aya yazılıb (məsələn, sentyabrı boş olan obyektin oktyabrı). Bu, «ilk ay»
   deyil. Bu gün olduğu kimi: faiz yoxdursa, heç nə yazılmır.
4. **Rəqəm formatı qarışıqdır:** «2413.11 ₼», «88 ₼», «326,951.62 ₼». Məhsulda bir format var: `formatMoney` →
   «326.951,62 ₼».
5. **Görünüş keçidinin adları kadrlar arasında fərqlidir:** cədvəldə «Standart / Yığcam», analitikada «Cədvəl /
   Analitika». Bir idarəetmə elementi lazımdır.
6. **Kontrast:** ikinci dərəcəli mətn `#687a94` ağ fonda 4,4:1, açıq fonda 4,2:1; narıncı `#b76a0a` 4,1:1; «Gələcək»
   2,2:1. Kiçik mətn üçün minimum 4,5:1-dir.
7. **Kiçik rəqəmlər:** xanada 10,7–11,5 px. Rəhbərin 3 saniyə testi və ≥1,4× sətir hündürlüyü qaydası üçün rəqəmlər
   ən azı 12 px olmalıdır.
8. **Dizayn qeydləri məhsul mətni deyil:** «V2 · 1920px · …», «Rəqəmlər mövcud hesabatdan götürülüb…».
9. **«Ekranda olan 5 obyekt»** üçün qayda yazılmayıb. Figma-da görünən 8 obyektdən illik cəmi ən böyük 5-i götürülüb.
   Qayda təsdiqlənməlidir.
10. **«Bütün əlaqəli sifarişlərə bax ↗»:** bir xana = bir sifariş (obyekt+ayın son versiyası). Məhsulda bu, iki ayrı
    hərəkətdir: «Sifarişi aç» və «Obyektin bütün sifarişləri» (`/locations/{id}`).

---

## 7. Risklər

| # | Risk | Təsir | Necə qarşısı alınır |
|---|---|---|---|
| R1 | Figma-ya baxıb işləyən imkanı silmək (cəm sətri, status, zəng, telefon, 24.3) | Yüksək | K5 siyahısı qəbul meyarına çevrilir; `visual-qa` hər birini yoxlayır. |
| R2 | Rəqəmin mənası dəyişir (9.1 rəngi, 8.2 qaydası, brauzerdə yeni toplama) | Yüksək | Rəng və işarələr yalnız API sahələrindən; yeni toplama yoxdur; mövcud testlər qırmızı/yaşılı yoxlayır. |
| R3 | 30 test (69 yoxlama sətri) CSS sinfinə bağlıdır | Orta | Sinif yalnız bilərəkdən dəyişir, test eyni anda yenilənir; heç bir gözlənən dəyər zəiflədilmir. |
| R4 | Karkas dəyişikliyi bütün səhifələrə toxunur (en, yapışqan başlıqlar) | Orta | Karkas ayrıca mərhələdir; bütün səhifələr 4 endə yoxlanılır. |
| R5 | Figma yalnız 1920 px; 1280-də 12 sütun sıxdır, B-07 hələ açıqdır | Orta | 390 / 768 / 1280 / 1440 üçün düzülüş əvvəlcədən yazılır; səhifənin yana sürüşməməsi qəbul meyarıdır. |
| R6 | Ortaq hissələr (`format.ts` rəngləri) başqa ekranlarda da işlənir | Orta | V2 onların davranışını dəyişmir; tokenə keçid ayrıca, təsdiqlənmiş addım olur. (Düzəliş: `ScopeSelector`-u yalnız bu səhifə işlədir — ilk variantda səhvən ortaq yazılmışdı.) |
| R7 | Tam test qaçışında yük səbəbindən vaxt aşımı | Aşağı | Düşən fayl ayrıca işlədilir, nəticə qeyd olunur; testə toxunulmur. |
| R8 | Analitika qrafiki paketi böyüdür (əsas paket artıq 708 kB) | Aşağı | Qrafik ayrıca (lazy) yüklənir, `TrendChart` kimi. |
| R9 | Analitika idarəetmə panelini təkrarlayır («dördüncü dashboard üslubu») | Orta | Əvvəl sahib qərar verir; olarsa, mövcud qrafik komponentləri və tokenlərlə. |
| R10 | 8 GB RAM: API + PostgreSQL + Vite + brauzer birlikdə | Aşağı | Yalnız lazım olan işə salınır, sonra dayandırılır. |

---

## 8. Həyata keçirmə planı (təklif)

Hər mərhələnin sonunda: `npm run build` və `npm test` yaşıl; backend və baza dəyişməyib (`git diff` yalnız
`frontend/` və `AI_WORKFLOW/`-u göstərir); `visual-qa` yoxlaması; sahibin icazəsi ilə lokal commit. Push və deploy —
yalnız sahib istəsə.

**Mərhələ 0 — Qərarlar (sahib).** K1–K5 və 10-cu bölmənin sualları. Nəticə: `DECISIONS.md`-də yeni qeydlər. Kod
yoxdur.

**Mərhələ 1 — UX-i tamamlamaq (dizayn).** `ux-architect`: 390 / 768 / 1280 / 1440 düzülüşü; vəziyyətlər (yüklənir,
boş, xəta, qismən qiymət, təsdiq gözləyir, köhnə məlumat); telefon; panelin məzmunu; klaviatura; URL açarları
(`view`, `sort`, `cell`); qəbul meyarları. Sahib istəsə, 6-cı bölmədəki xətalar Figma-da da düzəldilir. `visual-qa`
(A rejimi) tənqid edir. Sahib təsdiqləyir → `05-approval.md`.

**Mərhələ 2 — Karkas.** `AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`: 220 px / 64 px, tokenlər, «SİFARİŞ SİSTEMİ»,
«İŞ SAHƏSİ». Zəng, server xəbərdarlığı, istifadəçi menyusu, telefon çəkməcəsi, rol üzrə menyu qalır. Cədvəlin
yapışqan başlığı yeni hündürlüyə uyğunlaşır. Testlər: `Header.test.tsx`, `auth.test.tsx`. Yoxlama: bütün səhifələr.
Kod az, yoxlama geniş.

**Mərhələ 3 — Hesabatın üst hissəsi.** `MonthlyReportPage.tsx`, `ReportHeadline.tsx`: başlıq, K3-ə görə rəqəm
zolağı, sayğaclar, filtr sırası (İl, axtarış, Sifariş növü, Sıfırla, görünüş keçidi). Köhnə URL açarları (`year`,
`search`, `scope`) eyni qalır; yenilər: `view`, `sort`. `ScopeSelector`-u yalnız bu səhifə işlədir (ilk variantda
səhvən «idarəetmə paneli ilə ortaq» yazılmışdı).

**Mərhələ 4 — Cədvəl.** `MonthlyReportTable.tsx` (580 sətir) bir neçə fayla bölünür. Yığcam: 12 ay, məbləğ +
qeyri-adi işarəsi + status. Standart: üstəgəl aydan-aya faiz, 9.1 rəngi ilə. Sıralama; yapışqan sütunlar; cəm
sətri; əfsanə; telefon kartları qalır; tokenlər. CSS-ə bağlı 30 test (69 sətir) bilərəkdən yenilənir; görünüş və
sıralama üçün yeni testlər yazılır.

**Mərhələ 5 — Sağ panel.** Xanaya klik (və Enter) → `Drawer`, URL-də `cell`. Məzmun API-dən: ayın məbləği, keçən aya
nisbət, 3 aylıq ortalamaya nisbət və «qeyri-adi» izahı (±50%), qiymətsiz sətirlər, status və versiya; təsdiqlənsə,
sifarişin qısa sətir siyahısı (mövcud `GET /api/v1/orders/{id}`). Düymələr: «Sifarişi aç» (24.3 qayıdışı qalır),
«Obyektin bütün sifarişləri». Esc bağlayır, fokus xanaya qayıdır, səhifə oxunaqlı qalır (19.1).

**Mərhələ 6 — Analitika (sahib istəsə).** Eyni hesabat cavabından: obyekt seçimi, 12 aylıq qrafik (gələcək aylar
boz), illik müqayisə (təsdiqlənən qaydaya görə), qeyri-adi aylar siyahısı (hər iki istiqamət, 9.1 rəngi). Hər
qrafikin yanında ekran oxuyucu üçün cədvəl (D-F7); qrafik lazy yüklənir.

**Mərhələ 7 — Son brauzer yoxlaması.** `visual-qa` (B rejimi): 4 en × 3 rol (Koordinator, Rəhbər, Administrator);
rəqəmlər API ilə qəpiyinə qədər tutuşdurulur; S1/S2 qalmayana qədər düzəliş; nəticə `07-qa.md`-də. Sonra commit,
push, deploy — sahibin qərarı.

**Sıra:** 0 → 1 → 2 → 3 → 4 → 5 → (6) → 7. Ən çox fayda 3–5-dədir; 2 kiçikdir, amma hamıya təsir edir, ona görə
ayrıca yoxlanılır.

### Qəbul meyarlarının qaralaması (Mərhələ 1-də dəqiqləşir)

- **AC-1** Ekrandakı hər rəqəm API cavabı ilə qəpiyinə qədər eynidir; format `formatMoney`.
- **AC-2** Xərc artımı qırmızı, azalması yaşıl (9.1); «qeyri-adi» yalnız `isUnusual`-dan, hər iki istiqamətdə.
- **AC-3** Cəm sətri, status, qiymətsiz sətir, gələcək ay görünür; təsdiq gözləyən ay təsdiqlənmiş kimi görünmür.
- **AC-4** URL yenidən yükləmədən və «Geri»dən sonra `year`, `search`, `scope`, `view`, `sort`, `cell`-i bərpa edir.
- **AC-5** Panel: Esc bağlayır, fokus xanaya qayıdır, səhifə oxunur (19.1); «Sifarişi aç» → «Geri» eyni hesabata
  qaytarır (24.3).
- **AC-6** 1280 və 1440 px-də səhifə yana sürüşmür; cədvəl yalnız öz qutusunda sürüşür.
- **AC-7** 390 px-də kartlar; heç bir məlumat itmir.
- **AC-8** Hər idarəetmə elementinə klaviatura ilə çatılır, fokus görünür; mətn kontrastı ≥ 4,5:1.
- **AC-9** Üç rol eyni rəqəmləri görür; zəng və menyu rola görədir.
- **AC-10** Build və bütün testlər yaşıl; backend, API və baza faylları dəyişməyib.

---

## 9. Nə dəyişməyəcək

- **API:** yalnız mövcud çağırışlar — `GET /api/v1/reports/monthly` və (panel üçün) `GET /api/v1/orders/{id}`. Yeni
  endpoint, yeni sahə yoxdur.
- **Backend, hesablamalar, baza:** toxunulmur.
- **URL:** `year`, `search`, `scope`, `back=monthly` və sətir id-ləri (`row-{id}`) eyni qalır; köhnə linklər işləyir.
- **Format:** pul yalnız `formatMoney` ilə yazılır.
- **Qaydalar:** 8.1, 8.2, 9.1, 19.1, 24.3, D-S3 (heç nə etməyən düymə çəkilmir), D-V3 (zəng = təsdiq növbəsi).
- **Rollar və icazələr:** dəyişmir. Təsdiqi yalnız Rəhbər verir.

---

## 10. Sahibin cavab verməli olduğu suallar

| # | Sual | Tövsiyə |
|---|---|---|
| 1 | Faizlər qırmızı/yaşıl qalsın (qərar 9.1)? | Bəli |
| 2 | «Qeyri-adi ay» həm artımı, həm azalmanı göstərsin (indiki ±50% qaydası)? | Bəli |
| 3 | Yuxarıda 1 böyük + 2 kiçik rəqəm, yoxsa Figma kimi 3 bərabər rəqəm? | 1 + 2 |
| 4 | Ölçülər Figma-dan (220 / 64), rənglər və şrift indiki tokenlərdən? Yoxsa bütün məhsul Figma rənglərinə keçsin? | Ölçülər Figma-dan, rənglər indiki |
| 5 | Xanaya klik panel açsın (içində «Sifarişi aç»)? Panel sifarişin sətirlərini də göstərsin? | Bəli, qısa siyahı ilə |
| 6 | Açılışda hansı görünüş: Yığcam (12 ay) yoxsa Standart? | Yığcam |
| 7 | Analitika görünüşü indi lazımdır, yoxsa cədvəl və paneldən sonra? «5 obyekt» = illik cəmi ən böyük 5? | Sonra; bəli |
