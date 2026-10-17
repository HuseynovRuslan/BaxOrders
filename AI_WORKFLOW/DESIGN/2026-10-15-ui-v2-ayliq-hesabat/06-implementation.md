# 06 — Tətbiq planı: UI V2 «Aylıq hesabat»

**Vəziyyət:** PLAN — sahibin təsdiqini gözləyir (`05-approval.md`). Bu sənəd yazılanda tətbiqin kodu dəyişməyib.
**Əsas:** D-50, `02-requirements.md`, `03-ux.md` (tənqidə cavabla, §12), `04-visual.md`, `04-critique.md`.

## 1. Nə dəyişmir — müqavilə

- **API:** yalnız mövcud çağırışlar. `GET /api/v1/reports/monthly` — əsas sorğu; aktiv növ «Hamısı» deyilsə, hər əsas
  sorğudan əvvəl eyni endpoint `scope=All` ilə (03 §3.3). Panel üçün `GET /api/v1/orders/{id}`. Yeni endpoint, yeni sahə
  yoxdur.
- **Backend, hesablamalar, baza:** toxunulmur. Hər mərhələnin sonunda `git diff --stat` yalnız
  `frontend/bax-orders-web/src/` və `AI_WORKFLOW/`-u göstərməlidir.
- **Karkas:** `AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `ApprovalsBell` dəyişmir (260 px, 72 px).
- **Başqa ekranlar və ortaq komponentlər:** `OrderDetailPage.tsx`, `Modal`/`Drawer`, `PageHeader`, `format.ts`-in
  `costDirection*` köməkçiləri, idarəetmə paneli dəyişmir.
- **URL açarları:** `year`, `search`, `scope`, `back=monthly` və sətir id-ləri (`row-{id}`, `row-{id}-phone`) eyni
  qalır. Yenilər: `view=standart`, `sort=ad-azalan|cem-azalan|cem-artan`, `cell=<locationId>-<MM>` (03 §3.2).
- **Format:** pul yalnız `formatMoney`, faiz yalnız `formatPercent`. **Terminlər:** mövcud sözlər; yeni mətnlər
  03-də [Yeni mətn] kimi işarələnib və təsdiq paketində sadalanır.

## 2. Mərhələlər

Hər mərhələnin sonunda: `npm run build`; tam `npx vitest run --reporter=dot --reporter=json` (B-09 üçün hesabat
saxlanılır); həmin mərhələnin `UX-xx` meyarları üzrə qısa brauzer yoxlaması; sahib icazə verərsə lokal commit.
Push və deploy — yalnız sahib istəsə.

| Mərhələ | Nə edilir | Əsas fayllar | Testlər (03 §10.3) |
|---|---|---|---|
| **A · Hazırlıq** | Ayrıca lokal budaq; mövcud ekranın 1440 / 1280 / 768 / 390-da şəkilləri. Bu şəkillərdə B-07-nin 260 px ilə yeni ölçüsü, `top-16` fərziyyəsi və 1280-də məbləğlərin bitişməsi yoxlanır. Giriş: sahib lokal tətbiqə öz brauzerində özü daxil olur, agent parola toxunmur. | — | — |
| **B · Üst hissə** | Maliyyə zolağı (1 + 2; «Ümumi faktiki xərc» `scope=All`-dan, əsasdan əvvəl); sayğac xətti; statik cümlə (S-4); daimi nəticə sayı bölgəsi; filtrlər, «Sıfırla», görünüş keçidi; köhnə məlumatın öz açarı ilə saxlanması (DK-04) | `pages/MonthlyReportPage.tsx`; yeni `components/reports/ReportSummaryBand.tsx`, `ReportFilters.tsx`, `ReportResultCount.tsx`; `ScopeSelector.tsx` (görünüşü yerində, yalnız bu səhifə işlədir); URL modulları `reportView.ts`, `reportSort.ts` | A-cədvəlinin zolaq/filtr sətirləri; B-cədvəlinin «three kinds of money», «which lines», «search kept», L266 |
| **C · Cədvəl** | Yığcam və Standart; `ReportCell`, `StatusMark` (✓ ⏳ ↩), `UnusualMark` (▲/▼), əfsanə, «Cəmi» sətri, gələcək ay; sıralama; 1280 həlli (S-2a) və sıxlıq (S-2b); fokusun görünməsi (DK-01); telefon və planşet kartları (6 sütun 640–1023) | `components/reports/MonthlyReportTable.tsx` 03 §5.3-dəki fayllara bölünür (`ReportTable`, `ReportFloatingHeader`, `ReportMonthJump`, `ReportCell`, `StatusMark`, `UnusualMark`, …) | A-cədvəlinin qalan sətirləri; B-cədvəlinin L189, L210, L650, L905, L1043 |
| **D · Sağ panel** | Xana → panel (`cell`, öz tarixçə girişi, `OrderDetailPage`-in məhsul çəkməcəsi modeli); xananın rəqəmləri, iki ayrı adlı müqayisə, qeyri-adi izahı, tərkib; sifarişin real sətirləri (50-50, `hasPrice`, cavabdeh şəxs); «Bütün sifarişin məbləği» («Hamısı» növündə yox); «Sifarişə bax» (24.3), «Obyektin sifarişləri» | yeni `components/reports/ReportCellPanel.tsx`, `ReportOrderLines.tsx`, `reportCell.ts`; `Drawer` dəyişmədən | B-cədvəlinin «coming back from an order» bloku; D-cədvəlinin panel testləri |
| **E · Brauzer QA** | `visual-qa` (B rejimi): 1440×900, 1280×800, 1024×768, 768×1024, 390×844 × Koordinator, Rəhbər, Administrator; rəqəmlər API ilə qəpiyinə qədər; S1/S2 qalmayana qədər düzəliş | `07-qa.md`; şəkillər `qa/`-da (git-ə düşmür) | tam qaçış 2 dəfə, JSON hesabatı ilə |

### 2a. Təkrar tənqiddən icrada bağlanacaq qeydlər (`04-critique.md`, «Təkrar yoxlama»)

| ID | Ciddilik | Nə edilir | Mərhələ |
|---|---|---|---|
| DK-26 | S3 | Başlıqdakı əsl sıra düymələrinə `scroll-margin-top` ≈ 84 px (düymə xananın yuxarısından ~11 px aşağıdadır) — və ya surət yalnız əsl başlığın **alt** kənarı 72 px xəttini keçəndə görünür. UX-39-un 2-ci halı brauzerdə yoxlanır. | C |
| DK-27 | S3 | Üzən başlığın altındakı sinxron sürüşmə zolağına `tabindex="-1"`: `aria-hidden` sahədə Tab dayanacağı olmasın (Firefox və yeni Chrome sürüşmə konteynerini fokuslanan edir). | C |
| DK-28 | S3 | Bağlandı: S-2b sualının mətni düzəldi (03 §9.2, §11.1; 05 §7). | — |
| DK-29 | S3 | Bağlandı: AC-09 «Bütün sifarişin məbləği» ilə yeniləndi (02). | — |
| S4 | S4 | (1) L1310, L1322, L1351 testlərinə xana → panel → «Sifarişə bax» addımı; (2) ~~E-nin 11 px-i~~ — D-51 ilə E rədd edildi, aid deyil; (3) S-4 cümləsindəki ⏳ mətn daxilində rəngli emoji kimi görünməsin — U+FE0E və ya `Hourglass` ikonu; (4) ~~E-də Standart xananın boşluğu~~ — aid deyil; (5) S-3 sualında status nöqtələrinin ✓ ⏳ ↩ olduğu deyilir (05-də edildi). | B, C |

**D-51 (2026-10-16):** S-2b = 12 px. Qüvvədə olan enlər: obyekt 120, ay Yığcam 74 / Standart 106, il 88 px; rəqəmlər
bütün masaüstü enlərində 12 px. `03-ux.md` və `04-visual.md`-də E-yə aid hər şey qüvvədə deyil.

## 3. Testlər

**Tək plan `03-ux.md` §10.3-dür** (tənqid DK-08: iki siyahı bir-birinə zidd çıxmasın deyə bu sənəd onu təkrarlamır).
Orada:

- **A** — CSS sinfini yoxlayan 30 testin (69 sətir) hər biri: nəyi qoruyur, V2-də nə dəyişir, yeni yoxlama nədir.
- **B** — CSS-ə aid olmayan, amma sahibin qərarı ilə davranışı dəyişən testlər (xana kliki → panel; Yığcamda faiz yoxdur;
  zolaq; ikinci sorğu).
- **C** — dəyişməyən, amma yenidən yoxlanılan testlər.
- **D** — yeni testlər.

Qaydalar (M-13): heç bir yoxlama əvəzsiz silinmir. Gözlənən mətn və rəqəmlər dəyişmir. `toHaveBeenLastCalledWith`
yoxlamaları olduğu kimi qalır: «Hamısı» sorğusu əsasdan əvvəl gedir. Sinfin dəyəri dəyişirsə, test eyni commit-də və
səbəbi yazılmaqla dəyişir.

## 4. Ayrıca təsdiq istəyən bəndlər (03 §5.2)

| # | Bənd | Təsiri | Təsdiqlənməsə |
|---|---|---|---|
| 1 | `ScopeSelector`-un görünüşü yerində dəyişir | yalnız bu səhifə | bugünkü tünd düymə qrupu qalır |
| 2 | Yeni primitiv `SegmentedControl` («Sifariş növü», «Baxış») | yalnız bu səhifə; sonra başqa ekranlar işlədə bilər | eyni siniflər yerli yazılır |
| 3 | Yeni primitiv `buttonClass` (düymə stilləri) | bu səhifə və panel | eyni siniflər yerli yazılır |

## 5. V2-yə daxil olmayan, ayrıca təklif ediləcək işlər

- `Modal`-ın «Bağla» düyməsini telefonda 44 px etmək — bütün dialoqlara təsir edir (DK-09).
- Sifariş səhifəsinin sətir xanalarını ortaq fayla çıxarmaq (DK-09).
- `index.css`-də sətir hündürlüyü 1,4-dən aşağı olan tokenlər (`body-sm`, `label-md`, `headline-lg`, `metric-val`).
- `InfoHint` ikonunun kontrastı və toxunma sahəsi (DK-19).
- `LineResponsibleNote`-un «Cavabdeh təyin edilməyib» mətninin kontrastı (2,6:1) — V2-nin paneli bu sözü özü, keçən
  rənglə yazır; ortaq komponentin düzəlişi ayrıca.
- `format.ts` rəng köməkçilərinin tokenə keçidi (W-04).
- Paneldə «əvvəlki ay / növbəti ay» keçidi (DK-24).
- `scrollbar-gutter: stable` — dialoq açılanda səhifənin 17 px enlənməsi.

## 6. Mərhələlərin qəbul qapıları

- Build yaşıl; tam test qaçışı yaşıl. Timeout olarsa təhlil olunur, limit qaldırılmır (B-09).
- `git diff --stat`-da backend, API, baza faylı yoxdur.
- O mərhələyə aid `UX-xx` meyarları brauzerdə yoxlanılıb.
- Son qəbul (E): `visual-qa` hökmü KEÇDİ və ya QEYDLƏRLƏ KEÇDİ, açıq S1/S2 yoxdur.

---

## İcra jurnalı

### A · Hazırlıq — 2026-10-16

**Vəziyyət (kod dəyişmədən əvvəl).** Budaq `ui-v2-ayliq-hesabat` (`main`-in `b43c2c5`-indən; commit yoxdur). İşçi qovluqda yalnız
sənəd dəyişiklikləri var (`.gitignore`, `BLOCKERS.md`, `DECISIONS.md`, `.claude/`, `CLAUDE.md`, `DESIGN_WORKFLOW.md`,
`DESIGN/`). Frontend və backend kodu dəyişməyib.

| Yoxlama | Nəticə |
|---|---|
| `npm run build` | keçdi (7 s); köhnə xəbərdarlıq: əsas paket > 500 kB |
| `npx vitest run` (JSON: scratchpad `phaseA-baseline.json`) | 1471/1472; **B-09 testi yenə düşdü** (35 458 ms). Qonşu testlər 107–1 029 ms, faylın medianı 228 ms → yük deyil, testə xas ilişmə (`BLOCKERS.md` B-09 yeniləndi) |
| B-09 testi tək başına, 15 dəfə | 15/15 keçdi, 412–669 ms |

**Mövcud ekranın ölçüləri (lokal tətbiq, Chrome 155, iframe ilə dəqiq en; şəkillər `qa/baseline-report-*.png`, git-ə düşmür):**

| En | Səhifə yana sürüşməsi | Cədvəl | Məbləğlər | Qeyd |
|---|---|---|---|---|
| 1440 | 0 | 1099 px, 12 px | 200 xanadan 18-də məbləğ xanadan ≤ 1 px daşır | yapışqan başlıq `top: 64px`, tətbiq başlığı 72 px → **8 px örtülür** (xananın üst boşluğu; mətn düz 72-də başlayır) — 01 §3-ün fərziyyəsi təsdiqləndi |
| 1280 | **28 px** (B-07, 260 px sidebar ilə yenidən ölçüldü) | 1000 px qutuda 939 px, 11 px | 18 xanada ≤ 3 px daşır — məbləğlər bitişir | — |
| 768 | 0 | kartlar (27) | — | — |
| 390 | 0 | kartlar (27) | — | — |

**Yeni tapıntı — pul formatı brauzerdə Azərbaycan standartında deyil.** Chrome 155-də ekran «317,128.16 ₼» yazır
(qrup «,», onluq «.»). `format.ts` `Intl.NumberFormat('az-Latn-AZ')` işlədir; Chrome-un öz `az` məlumatı bu formatı
verir. Testlər Node-da işləyir və orada «317.128,16 ₼» çıxır — ona görə testlər bunu tutmur. Sahibin tələbi (D-50):
«326.951,62 ₼». Düzəliş `format.ts`-dədir (ortaq) və bütün ekranlara təsir edir → sahibin qərarı gözlənilir.

**Lokal mühit qeydi.** `src/BaxOrders.Api` user-secrets-də `ConnectionStrings:BaxOrders` 55438 portunu göstərir
(işləməyən başqa klaster); dev bazası 55434-dədir. Ölçmə üçün API bir dəfəlik mühit dəyişəni ilə 55434-ə yönəldildi;
user-secrets-ə toxunulmadı. Bütün serverlər işdən sonra dayandırıldı.

### B · Üst hissə — 2026-10-16

**Vəziyyət.** Budaq `ui-v2-ayliq-hesabat`, commit yoxdur. Dəyişiklik yalnız `frontend/bax-orders-web/src/`-dədir (+ bu
jurnal). Backend, API, baza toxunulmayıb. `format.ts`, `OrderDetailPage`, `Modal`/`Drawer`, `PageHeader`, karkas və
`MonthlyReportTable.tsx` dəyişməyib. Server, baza, dev server işə salınmayıb.

**Fayllar** (yolların başı `frontend/bax-orders-web/src/`)

| Fayl | Nə və niyə |
|---|---|
| `pages/MonthlyReportPage.tsx` | Üst hissə yenidən quruldu: zolaq → filtrlər → nəticə sayı → cədvəl (02 §6). Növ «Hamısı» deyilsə hər əsas sorğudan **əvvəl** `fetchMonthlyReport({ year, scope: 'All' })` — axtarışsız, yaddaşsız; iki cavabın ili fərqlidirsə «All» bir dəfə əsas cavabın ili ilə yenidən soruşulur (03 §3.3). Köhnə cavab cütü öz açarı ilə (`shownKey`: il, növ, axtarış) `opacity-60` və `inert` qalır; idarəetmə elementləri URL-i göstərir; `role="status"` «Yüklənir…». Əsas sorğu xətası köhnə məlumatı gizlədir, `ErrorState` göstərir; il siyahısı xətadan sonra da qalır. `view`/`sort`/`cell` yalnız «Baxış» və «Sıfırla» üçün oxunur. |
| `components/reports/ReportSummaryBand.tsx` (yeni) | «İlin xülasəsi»: 1 əsas (`h2` + 28 px) + 2 ikinci rəqəm, 03 §6.8.1 cədvəli ilə. «Ümumi faktiki xərc» yalnız «All» cavabından: «…» (`aria-busy`), alınmayanda «—» + `role="status"` «Ümumi faktiki xərc alınmadı.» + «Yenidən cəhd et». Alt xətt: Sifariş · Obyekt · Qiymət yoxdur (> 0 olanda kəhrəba «⚠ Qiymət yoxdur N — Məbləğ tam deyil.» + `knownAmountHint`); S-4 cümləsi həmişə; S-1 qeydi axtarışda; təsnifat qeydi (mövcud mətn, eyni şərt). |
| `components/reports/ReportFilters.tsx` (yeni) | Görünən etiketlər. İl (URL-dəki il siyahıda yoxdursa da seçim kimi); Obyekt axtar (yazmaq heç nə göndərmir, Enter göndərir, boş Enter silir); Sifariş növü; Baxış «Yığcam \| Standart» → `view=standart`; «Sıfırla» sıranın sonunda, yeri həmişə ayrılıb (`invisible` + `aria-hidden` + `tabindex="-1"`), basılanda `search`, `scope`, `view`, `sort`, `cell` silinir, il qalır, fokus axtarışa keçir. Hamısı `replace`. |
| `components/reports/ReportResultCount.tsx` (yeni) | Filtrlərin altında daimi `role="status"`: axtarış yoxdursa boş, axtarışda «N / M obyekt» — göstərilən cavabdan və onun axtarışından. |
| `components/reports/labels.ts` (yeni) | Hesabatın öz sözləri: 03-də [Yeni mətn] kimi təsdiqlənmiş cümlələr (S-1, S-4, «… alınmadı.», «Yenidən cəhd et», «Sıfırla»-nın `title`-ı) və səhifədən köçürülən mövcud filtr sözləri. |
| `components/reports/ReportHeadline.tsx` (silindi) | Yeganə istifadəçisi bu səhifə idi; brauzer cəmi (`Composition`, köhnə `:55-58`) onunla getdi. |
| `components/SegmentedControl.tsx` (yeni, 03 §5.2 №2) | Boz yol; aktiv seqment ağ + `ring-1 ring-outline` + yarımqalın + `aria-pressed`; `labelledBy` / `label`; `accessibleLabel`. Yalnız tokenlər. |
| `components/buttonClass.ts` (yeni, 03 §5.2 №3) | `primary` / `secondary` / `ghost`; hündürlüklər; `focus-visible` halqası; `disabled` / `aria-disabled`. Yalnız tokenlər. |
| `components/analytics/ScopeSelector.tsx` | `SegmentedControl` üzərində nazik sarğı (03 §5.2 №1); `labelledBy`, `size`, `fullWidth` əlavə olundu. Yeganə istifadəçisi bu səhifədir. |
| `analytics/reportView.ts` (yeni) | `view=standart`; yoxdursa və ya tanınmırsa Yığcam (`dashboardView.ts` qaydası). |
| `analytics/reportSort.ts` (yeni) | `sort=ad-azalan\|cem-azalan\|cem-artan`; yoxdursa ada görə A–Z. Yalnız URL dəyərləri; müqayisə funksiyası C-də sıralama ilə gəlir. |

**Dəyişən testlər** (`pages/MonthlyReportPage.test.tsx`; sətirlər köhnə fayla görə). A-cədvəlinin 30 testindən heç biri zolağa
və ya filtr sırasına aid deyil, B onların heç birini dəyişmir (#2, L311 — «İl» yeganə combobox — C-də «Sıralama» select-i
gələndə dəyişəcək; B-də olduğu kimi keçir). L1500 dəyişməyib (§10.3: `LastCalledWith` dəyişmir). `ScopeSelector.test.tsx`-in
mövcud 3 testi dəyişməyib.

| Test | §10.3 sətri | Köhnə yoxlama | Yeni yoxlama | Niyə zəif deyil |
|---|---|---|---|---|
| controls › says how much of the catalogue a search left, without shrinking the totals (L266) | B · L266 | «1 / 26 obyekt» var; zolaqda «26» | eyni ikisi + mətn `role="status"`-dadır, nə `.lg:block`, nə `.lg:hidden` içindədir, axtarış sahəsindən sonradır, zolaqda deyil; zolaqda S-1 qeydi | köhnə iki yoxlama sözbəsöz qalır; yer və rol əlavədir |
| coming back › comes back with the search the reader submitted… (L1322) | B · search kept | hər çağırış `{ year: undefined, search: 'Novxan', scope: 'Monthly' }` | çağırışlar cüt-cüt: `{ year: undefined, scope: 'All' }`, sonra `{ year: undefined, search: 'Novxan', scope: 'Monthly' }`; say cüt və > 0 | hər əsas çağırış yenə eyni axtarışı daşıyır; üstəlik sıra və «All»-un axtarışsızlığı; `LastCalledWith` dəyişməyib |
| coming back › keeps the search through a reload… (L1351) | B · search kept | `LastCalledWith({…Novxan…})` | dəyişməyib + yenidən yükləmədən sonra eyni cüt yoxlaması | yalnız əlavə |
| three kinds of money › heads the year with one figure… (L1418) | B · three kinds | başlıq «Aylıq sifarişlərin məbləği»; `428.000,00 ₼` 2 dəfə (başlıq + tərkib sətri) | mock növə görə cavab verir; `h2` «Aylıq sifarişlərin məbləği»; zolaqda tək başlıq; əsas rəqəm 428.000,00 ₼, zolaqda 1 dəfə; üç rəqəmin sırası `[428.000,00; 3.051,16; 431.079,17]` | «2 dəfə» köhnə tərkib sətrini sayırdı — D-50 №3 (1 + 2) onu çıxarır; indi üç rəqəm, sıra və tək başlıq yoxlanır |
| three kinds › says what the year was made of… (L1434) → yeni ad: «stands the other two beside it: off-plan from the same answer, the actual spend from the «All» answer, never a sum» | B · three kinds | «Aylıq sifarişlər» 428.000,00; «Aylıqdan Kənar sifarişlər» 3.051,16; «Ümumi faktiki xərc» **431.051,16 (brauzer cəmi)** | «Aylıqdan Kənar sifarişlər» 3.051,16; «Ümumi faktiki xərc» = «All» cavabının 431.079,17; heç bir mümkün cəm (431.051,16, 431.079,16) zolaqda yoxdur | rəqəm yalnız D-50 №3-ün dəyişdirdiyi yerdə dəyişib; «All» rəqəmi hər iki cəmdən fərqli seçilib ki, cəm göstərilsə test düşsün. «Aylıq sifarişlər» 428.000,00 yoxlaması L1418-ə (Aylıq növündə planlı məbləğ əsas rəqəmdir, 02 §6) və L1449-a keçib |
| three kinds › keeps the composition of the year itself… (L1449) | B · three kinds | başlıq «Aylıqdan kənar xərclər»; «Aylıq sifarişlər» 428.000,00; «Ümumi faktiki xərc» 431.051,16 (cəm) | `h2` + əsas 3.051,16 + `scopeNotes.OutsideMonthly`; «Aylıq sifarişlər» 428.000,00; «Ümumi faktiki xərc» 431.079,17 («All»); sıra; cəmlər yoxdur | eyni səbəb; daha çox rəqəm yoxlanır |
| which lines › opens on the planned material, and asks the server for nothing else (L1491) | B · L1491 | `LastCalledWith(scope Monthly)` | eyni + bütün çağırışlar yalnız `[All, Monthly]` cütləridir | yalnız əlavə: «nothing else» indi dəqiq yoxlanır |
| which lines › opens on the scope a pasted link carries (L1510) | B · L1510 | `aria-pressed` + `LastCalledWith(scope All)` | eyni + `toHaveBeenCalledTimes(2)` (StrictMode səhifəni iki dəfə qurur, hər dəfə bir sorğu) + hər çağırış `{ year: undefined, search: undefined, scope: 'All' }` | yalnız əlavə: ikinci sorğu yoxdur |

L1418–L1449 fixture-ində 1 təsnif edilməmiş sətir (28 ₼) əlavə edildi ki, üç növün cəmi (431.079,16) mövcud olsun və onun
ekranda olmadığı yoxlansın; «All» cavabı 431.079,17 (növlər qəpiyə ayrıca yuvarlaqlaşır, 03 §6.9.6).

**Yeni testlər (+50)**

- `MonthlyReportPage.test.tsx` (+35):
  - the three kinds of money › heads the year with the actual spend when that is the scope, its parts beside it, from one answer;
  - the actual spend beside another scope (6) › «All» əsasdan əvvəl, hər əsas sorğu ilə, axtarışsız, yaddaşsız, il ilə; baxış sorğu
    yaratmır · «…» + `aria-busy`, qalan rəqəmlər artıq ekrandadır, cəm yoxdur · əvvəl gələn «All» cavabı əsas gələnə qədər saxlanır
    · «—» + status + «Yenidən cəhd et» → `{ year: 2026, scope: 'All' }`, fokus rəqəmdə · «All» əsasdan sonra düşəndə də «—» · il
    uyğunsuzluğunda bir dəfə əsasın ili ilə təkrar;
  - what the year summary says under its figures (8) › sayğaclar (0 neytral) · M-05 kəhrəba sətir · S-4 cümləsi × 4 (Aylıq,
    Aylıqdan kənar, Hamısı, axtarış; sözbəsöz, rəqəmsiz, ikon `aria-hidden` + `text-sky-700`, ⏳ yalnız `sr-only`-də) · S-1 qeydi
    yalnız axtarışda, rəqəmlər serverin bütün obyektlər üzrə rəqəmləridir · axtarışsız qeyd yoxdur;
  - the filter row (14) › görünən etiketlər · URL-dəki il siyahıda yoxdursa da seçimdir · URL-də il yoxdursa cavabın ili · Yığcam
    defolt, «Standart» → `view=standart`, sorğusuz, `replace` · `view=` × 3 · «Sıfırla» gizli və yeri saxlanılır · «Sıfırla»
    görünür × 5 (search, scope, view, sort, cell) · «Sıfırla»: il qalır, axtarış boşdur və fokusdadır, eyni düymə gizlənir, `replace`;
  - how many objects a search left (2) › bölgə daimidir, yalnız mətni dəyişir · «0 / 26 obyekt» + `EmptyState`, zolaq və filtrlər yerində;
  - an answer on its way (4) › növ dəyişəndə köhnə cavab öz növünün sözləri ilə solğun + `inert`, «Yüklənir…» · il seçimi dərhal
    2025, cədvəl 2026 · axtarış qeydi və sayı köhnə cavabın açarından · xətada köhnə məlumat gizlənir, `ErrorState`, filtrlər işləyir.
- `components/SegmentedControl.test.tsx` (6), `components/buttonClass.test.ts` (3), `analytics/reportView.test.ts` (3),
  `analytics/reportSort.test.ts` (2), `components/analytics/ScopeSelector.test.tsx` (+1: görünən etiketlə ad, seçilmişin
  rəngdən başqa işarələri).

**Testlərin özü yoxlandı.** Səhifədə 6 qəsdən pozuntu (brauzer cəmi; `inert` yox; zolağın sözləri URL-dən; il təkrarı yox;
«All» axtarışla; əsas «All»-dan əvvəl) — hər biri 1–9 testi düşürdü; fayl hər dəfə bərpa edildi (`diff` ilə yoxlanıb).

**Build və testlər**

| Yoxlama | Nəticə |
|---|---|
| `npm run build` (`tsc -b && vite build`) | keçdi; köhnə xəbərdarlıq: əsas paket > 500 kB |
| `npx vitest run --reporter=dot --reporter=json` — son qaçış (JSON: scratchpad `phaseB-run.json`) | **81 fayl, 1522/1522**, 102,6 s. A-dakı 1472-dən +50. Əvvəlki iki tam qaçış: 1-ci 1520/1520 (132,8 s; iki il testi hələ yox idi), 2-ci 1521/1522 (113,0 s; aşağıdakı `App.test.tsx`) |
| B-09 testi | 3 tam qaçışın hamısında keçdi: **18 494 ms** (1-ci, faylın medianı 169 ms — ×109, limitə 1,5 s qalırdı), 3 189 ms (2-ci), 2 906 ms (3-cü, median 370 ms). Test dəyişdirilmədi, limit qaldırılmadı. Bu test `MonthlyReportPage`-i render etmir (marşrutda stub) |
| Yeni müşahidə: `App.test.tsx` › the retired orders page › sends /orders straight to the objects… | 2-ci tam qaçışda düşdü (1521/1522): `findByRole('heading', { name: 'Obyektlər' })` standart 1 000 ms gözləməni aşdı (test 1 312 ms). Tək işlədiləndə 5/5 keçdi (307–394 ms); 3-cü qaçışda keçdi (1 183 ms; faylın medianı 136 ms). Hesabat səhifəsini açmır (`/orders` → obyektlər). B-09 ilə eyni sinifdən görünür — tam qaçışın yükündə sərhəddə olan gözləmə; səbəbi sübutla deyilmir. Sübut: scratchpad `phaseB-run-2-app-flake.json`. Test dəyişdirilmədi; `BLOCKERS.md`-də B-09-a əlavə edilməsi Reviewer-in qərarıdır |
| `git status` | yalnız `frontend/bax-orders-web/src/` və `AI_WORKFLOW/` |
| Brauzer | **yoxlanmayıb** — tapşırıq server açmağı qadağan edir. B-nin meyarları (UX-05/06, UX-11–UX-15b, UX-18–UX-20) Reviewer-in brauzer yoxlamasındadır |

**Spesifikasiyadan fərqlər və qeydlər**

1. **`PageHeader`-in açıqlaması C-yə qədər saxlanılıb** (03 §3.6 #24, 04 §5.1). DK-15-in səbəbi «eyni sözlər cədvəlin
   başlığındadır» — o görünən `h2` C-də gəlir; indi silinsə, söz C-yə qədər ekrandan itərdi.
2. **S-4-ün ⏳-ü** lucide `Hourglass` ikonudur (`sky-700`, `aria-hidden`) + ekran oxuyucu üçün `sr-only` «⏳»; mətn
   təsdiqlənmiş cümlədir. 06 §2a S4-3 hər ikisinə icazə verir; U+FE0E-nin Windows Chrome-da monoxrom çıxması 03 §6.2.3-də
   [Fərziyyə]-dir və brauzer işlədilmədi. C-nin `StatusMark`-ı ⏳-ü eyni üsulla çəkməlidir. **C-yə qədər** cədvəl təsdiq
   gözləyən ayı hələ göy nöqtə ilə işarələyir, cümlə isə ⏳ deyir — mərhələlər arası müvəqqəti fərq.
3. **Primitivlərin interfeysi təsdiqlənmişin genişlənməsidir:** `SegmentedControl`-da `size: 'responsive'` (lg-dən aşağı
   44 px, yuxarı 32/40) və `fullWidth: 'mobile'`; `buttonClass`-da `size: 'sm'` (h-8, 04 §5.2 «Yenidən cəhd et») və
   `touchBelowLg` (DK-19, 44 px). Səbəb: 04 §5.3 və §6-nın enə görə ölçüləri. `md` / `touch` və boolean `fullWidth` qalır.
4. `SegmentedControl` artıq seçilmiş seqment basılanda `onChange` çağırmır; səhifənin görünən davranışı dəyişmir (əvvəl eyni
   URL yenidən yazılırdı).
5. Təsnifat qeydinin qutusu `mt-3`-dür (04 §5.2-də `m-4 mt-0`): `mt-0` kəhrəba qutunu boz alt xəttə yapışdırardı. Brauzerdə
   baxılmalıdır.
6. «Yenidən cəhd et»-dən sonra fokus «Ümumi faktiki xərc» rəqəminə (`tabindex="-1"` qrup) keçir: düymə xəta ilə gedir,
   fokus `body`-yə düşməsin (DK-16-nın prinsipi). Spesifikasiyada açıq yazılmayıb.
7. «Yenidən cəhd et» və il uyğunsuzluğu sorğusu ili açıq göndərir (`year: <əsas cavabın ili>`) — başqa ilin rəqəmi
   göstərilə bilməz.
8. «Yüklənir…» (`role="status"`) nəticə sayı ilə eyni xəttdə, sağdadır (03 §3.5 «filtrlərin yanında»).
9. `components/reports/labels.ts` 06-nın fayl siyahısında yoxdur — SKILL qaydası: mətnlər modulun `labels.ts`-indən.
10. **B-də edilməyib, C-yə qalır:** məlumatsız il üçün «Bu il üçün sistemdə sifariş yoxdur.» (03 §7 — cədvəlin yerində);
    cədvəlin görünən `h2`-si; `reportSort` müqayisə funksiyası; bənd 2-dəki ⏳ uyğunluğu.

### C · Cədvəl — 2026-10-16

**Vəziyyət.** B Reviewer tərəfindən qəbul edildi; C eyni budaqda, commit yoxdur. Dəyişiklik yalnız
`frontend/bax-orders-web/src/`-dədir (+ bu jurnal). Backend, API, baza, `format.ts`, `OrderDetailPage`, `Modal`/`Drawer`,
`PageHeader` komponenti, karkas toxunulmayıb. Server açılmayıb. Ölçülər D-51-ə görə: rəqəmlər bütün masaüstü enlərində
12 px; obyekt 120, ay Yığcam 74 / Standart 106, il 88 px. E variantına aid heç nə edilməyib.

**Fayllar** (yolların başı `frontend/bax-orders-web/src/`)

| Fayl | Nə və niyə |
|---|---|
| `components/reports/MonthlyReportTable.tsx` (silindi) | 03 §5.3-ə görə aşağıdakı fayllara bölündü; yeganə istifadəçisi səhifə idi |
| `components/reports/ReportTable.tsx` (yeni) | Masaüstü kartı: görünən `h2` «Obyektlər üzrə aylıq sifariş məbləğləri» və cədvəl ona `aria-labelledby` ilə bağlı, caption yoxdur (DK-23); ay düymələri; əfsanə; üzən başlıq; qutu — hər masaüstü endə `overflow-x-auto`, `scroll-pl-30 scroll-pr-22`, `[scroll-snap-type:x_proximity]`; `colgroup` 120 / 12 sinifsiz / 88, `min-w-[1096px]` / `min-w-[1480px]`; başlıqda sıra düymələri (`aria-sort` yalnız aktiv sütunda, `scroll-mt-21`); sətirlər (`row-{id}`, zebra, sabit obyekt və il, `scroll-mt-31 scroll-mb-4`); «Cəmi» (8.1, adi çəki). Seçilmiş xana üçün `selected` (DK-18; D-də bağlanır) |
| `components/reports/ReportFloatingHeader.tsx` (yeni) | `useFloatingHeader`: iki IntersectionObserver — əsl `thead` 72 px xəttindən yuxarıdırsa və sətirlər surətin altına çatırsa göstərilir; qutu ilə iki tərəfli sinxron. Surət: `aria-hidden`, `hidden`, `sticky top-18 z-10 h-0`, eyni `colgroup`/`min-w`, düymələri `tabindex="-1"`, klik əsl düyməyə ötürülür (fokus da). 12 px zolaq: yalnız qutu sürüşəndə, yalnız aylar sahəsində, `tabindex="-1"` (DK-27) |
| `components/reports/ReportMonthJump.tsx` (yeni) | «‹ Əvvəlki aylar · Fevral–Oktyabr 2026 · Sonrakı aylar ›» — yalnız qutu həqiqətən sürüşəndə; bir səhifə = görünən ay sayı; kənarda `aria-disabled`, fokus düymədə qalır |
| `components/reports/reportScroll.ts` (yeni) | Təmiz həndəsə: tam görünən aylar, açılış mövqeyi (son sifarişli ay ilin yanında tam görünür, solda yarımçıq ay yox), səhifə; `useBoxScroll` — sürüşmə (kadrda bir dəfə), `resize`, ResizeObserver, il və ya baxış dəyişəndə açılış mövqeyi; `prefers-reduced-motion`-da animasiyasız |
| `components/reports/ReportCell.tsx` (yeni) | Yığcam / Standart xana (03 §6.2); Standartda keçən aya görə faiz (12 px, 9.1), ▲/▼ məbləğin solunda; Yığcamda faiz yoxdur, ▲/▼ işarə sətrinin sonunda; ortalamaya görə faiz heç vaxt xanada yazılmır; `describeCell` köhnə `describe()`-dır, sözbəsöz |
| `components/reports/StatusMark.tsx`, `UnusualMark.tsx`, `MissingPriceMark.tsx` (yeni) | ✓ boz (S-3), ⏳ lucide `Hourglass` `sky-700`, ↩︎ `warningToneClass`, Draft işarəsiz — hamısı `aria-hidden`, `data-status-mark`; ▲/▼ 9.1 rəngində; ⚠ N |
| `components/reports/MonthTotal.tsx`, `Legend.tsx` (yeni) | Şirkətin ayı (adi çəki, ⚠ + `sr-only` cümlə); əfsanə baxışa görə («Faiz — əvvəlki aya görə» yalnız Standartda), işarələr xanalardakı kimi çəkilir |
| `components/reports/MonthlyReportYearList.tsx` (yeni) | Kartlar: `grid-cols-3 sm:grid-cols-6`, ad və aylar `min-h-11`, eyni `ReportCell` (eyni baxış), cədvəllə eyni sıra; gələcək ayın adı altında eyni ştrix işarəsi |
| `components/reports/reportGrid.ts` (yeni) | Aylar, dövrlər, gələcək ay ştrixi `outline` xətti ilə (DK-14), başlıq işarəsi, `min-w` sinifləri, son sifarişli ay |
| `components/reports/labels.ts` | Cədvəlin sözləri: başlıq (köhnə caption və `PageHeader` açıqlamasının sözləri), «Obyekt», «İl cəmi» (köçürüldü), «Sıralama», «Əvvəlki aylar» / «Sonrakı aylar», «Bu il üçün sistemdə sifariş yoxdur.» — hamısı 03-də var |
| `analytics/reportSort.ts` | `sortReportRows` — A–Z serverin sırası, Z–A onun tərsi; il cəminə görə hər iki istiqamətdə cəmi olmayanlar sonda, bərabərlər serverin sırası ilə (müqayisə edir, toplamır); `nextNameSort` / `nextTotalSort`; seçimlərin sözləri (03 §6.4) |
| `components/reports/ReportFilters.tsx` | «Sıralama» select-i (`lg:hidden`, görünən etiket) |
| `components/reports/ReportSummaryBand.tsx` | S-4 cümləsinin ⏳-ü indi `StatusMark` ilə — cədvəldəki ilə eyni çəkilir |
| `components/buttonClass.ts` | `iconOnly` — ikon düyməsi kvadrat olur (ay düymələri) |
| `pages/MonthlyReportPage.tsx` | `PageHeader` açıqlamasız (DK-15); sətirlər sıralanır (`useMemo`, sorğusuz); `ReportTable` + kartlar; «Cəmi — bütün obyektlər» göstərilən cavabın axtarışından; `requestCount = 0` → «Bu il üçün sistemdə sifariş yoxdur.» |

**Dəyişən testlər** (`MonthlyReportPage.test.tsx`; sətirlər B-dən əvvəlki fayla görə, §10.3 nömrəsi ilə). Köməkçi `table()`
indi `table[aria-labelledby]`-dir: üzən başlığın surəti (adsız, `aria-hidden` cədvəl) DOM-da əsl cədvəldən əvvəldir, köhnə
`document.querySelector('table')` onu tapardı. Yeni test cədvəlin adını rol ilə yoxlayır.

| Test | §10.3 | Köhnə yoxlama | Yeni yoxlama | Niyə zəif deyil |
|---|---|---|---|---|
| grid › location column pinned (L230) | A #1 | `sticky` | eyni + `left-0` | yalnız əlavə |
| grid › marks unpriced … beside the percentage (L210) | B L210 | «⚠ 2», «+12,5%», AN, `title` | `?view=standart` ilə eyni dördü; Yığcamda «⚠ 2», faiz yoxdur, AN və `title` eyni | köhnə yoxlama Standartda sözbəsöz; Yığcam əlavə |
| phone › every month at once (L311) | A #2 | `/Ay/` combobox yox; 1 combobox; `lg:hidden`; 12 ay | combobox-lar dəqiq `[«İl», «Sıralama»]` (sırası ilə); «Sıralama» `lg:hidden`-in içində; `/Ay/` yox; 12 ay; `grid-cols-3 sm:grid-cols-6` | say → dəqiq siyahı (daha sərt) |
| phone › month's order without a basis (L340) | A #3 | `tabular-nums` | `.tabular` (sinif tokeni) | eyni məqsəd, məhsulun sinfi |
| phone › unusual tinted both ways (L358) | A #4 | tint + məbləğ `font-semibold`; bar rəngləri | eyni tint + iyunda ▲ `text-red-700`, iyulda ▼ `text-emerald-700`, avqustda ▲/▼ yox, məbləğ yarımqalın deyil; adi bar `costDirectionBarClass(0)` | `font-semibold` işarənin özü ilə əvəzlənib (§10.3); istiqamət indi rəngsiz də yoxlanır |
| phone › unpriced beside the change (L389) | A #5 | «⚠ 2», «+12,5%» qırmızı, AN | Standartda eyni üçü; Yığcamda «⚠ 2», faiz yoxdur, AN-da həm qiymətsiz cümlə, həm «+12,5%» | eyni + əlavə |
| phone › past month dash (L406) | A #6 | `text-slate-300` | `text-on-surface-variant` | rəng dəyişib (AC-17); qalan eyni |
| phone › never ordered (L438) | A #8 | `text-slate-500` | `text-on-surface-variant` | eyni |
| phone › lists and grids (L509) | A #10 | `[class*="min-w-["]` yoxdur | sinif adı ilə süzülür (`withClass`) | **köhnə yoxlama boş idi**: jsdom `[class*="min-w-["]`-i heç vaxt tapmır (yoxlandı) — indi düşə bilir |
| panorama › box only below 1064 (L542) → «scrolls only inside its own box, at every desktop width» | A #11 | `max-[1063px]:overflow-x-auto`; `lg:overflow-x-auto` qadağan; `min-w-[1000px]` | qutu `overflow-x-auto` (şərtsiz), heç bir en şərti yoxdur; `table-fixed`, `w-full`, `min-w-[1096px]`; + ayrıca test: Standart `min-w-[1480px]` | §10.3: qadağa çıxır (B-07); səhifə səviyyəsində yana sürüşmə üçün ayrıca test var |
| panorama › header above rows (L565) | A #12 | `thead th` sticky + `z-[2\|3]`; `tbody` sabitləri `z-[1]` | eyni + üzən surət `z-10`, `aria-hidden="true"` | yalnız əlavə |
| panorama › ≥ 64 px a month (L581) → «at least 74 pixels …» | A #13 | 14 `col`; `w-[9rem]`, `w-[5.5rem]`; aylar sinifsiz | 14 `col`; `w-[7.5rem]`, `w-[5.5rem]`; aylar sinifsiz; `min-w-[1096px]` | ölçü D-51 ilə dəyişib; cəmin bərabərliyi (120 + 12 × 74 + 88) əlavə |
| panorama › header under the app header (L607) | A #15 | 14 `th`, hamısı `sticky top-16` | 14 `th` sticky, heç biri `top-16` (8 px örtülmə qayıtmasın); surət `sticky top-18`, 14 `th`, mətnləri əsl başlıqla eyni | Seçim A-nın öz yoxlaması; köhnə 8 px qüsuru da yoxlanır |
| panorama › money on one line (L635) | A #17 | hər ₼ `whitespace-nowrap` + `tabular-nums` | `.tabular`; Standartda da, manat fərqi («+120,00 ₼») xanada olanda da | eyni + daha çox hal |
| panorama › change as a percentage (L650) | B L650 | «+65,8%»; `title`-da manat fərqi | Standartda eyni; Yığcamda faiz yox, `title` Standartdakı ilə sözbəsöz eyni | eyni + əlavə |
| panorama › undecided unmarked (L665) | A #18 | `.rounded-full` var / yox | `[data-status-mark="Approved"]` mətni ✓; Draft-da heç bir `[data-status-mark]` | işarə məhsulun simvoludur (DK-05) |
| unusual › tint by direction (L780) | A #21 | tint + halqa; məbləğ `font-semibold` | eyni tint + halqa; ▲ qırmızı, ▼ yaşıl; məbləğ yarımqalın deyil | §10.3: `font-semibold` → ▲ |
| unusual › within half (L806) | A #22 | tint yox, `ring-1` yox; məbləğ `font-medium` | eyni; məbləğ `font-normal`; ▲/▼ yox | §10.3 |
| future › headers quieted (L858) → «marks the headers of the months to come, on the screen and in words» | A #24 | Okt/Noy/Dek `text-slate-400`; Yan/Sen yox | Okt/Noy/Dek: `data-future`, ştrix sinfi, `title` «… 2026: gələcək ay», solğun deyil; Yan/Sen: heç biri | işarə + söz (daha sərt) |
| future › year gone by (L871) | A #25 | `text-slate-400` heç birində | eyni + `data-future` heç birində | yalnız əlavə |
| colour › red up, green down (L925) | A #27 | «+12%» qırmızı, «−8%» yaşıl, AN | `?view=standart` ilə eyni; + yeni test: Yığcamda faiz yox, AN-da «xərc artıb» / «xərc azalıb» | eyni + əlavə |
| colour › old rule (L946) | A #28 | `rose` yox, «yaxşı/pis» yox | eyni, hər iki baxışda | panelin mətni D-də əlavə olunacaq |
| legend › every mark (L960) | A #29 | sözlər (o cümlədən «xərc artıb/azalıb») və «Faiz — əvvəlki aya görə» | Yığcam: status sözləri + ✓ ⏳ ↩ işarələri, ▲ qırmızı / ▼ yaşıl, qayda mətni, faiz bəndi **yoxdur**; + yeni test: Standartda faiz bəndi, «xərc artıb» qırmızı, «xərc azalıb» yaşıl | AC-02: faiz yalnız Standartda; hər iki baxış yoxlanır |
| historical › approved dot (L1032) → «approved mark» | A #30 | `.rounded-full` `workflowStatusClass.Approved`; `outerHTML` eyni | `[data-status-mark="Approved"]` ✓, `text-on-surface-variant` (S-3); `outerHTML` eyni | §10.3 |
| historical › adds nothing to either legend (L1043) | B L1043 | bir dəqiq siyahı | iki dəqiq siyahı — Yığcam (faizsiz) və Standart; mətnlərdə ✓, ↩︎, ▲▼; «Tarixi sifariş» heç birində | hər baxış dəqiq yoxlanır |

Dəyişməyən, olduğu kimi keçən A sətirləri: #7 (L422), #9 (L460), #14 (L596, `-mx-` yoxdur — sıra düymələri ona görə `-mx-1`
işlətmir), #16 (L618), #19 (L726), #20 (L736), #23 (L833), #26 (L883). B-cədvəlindən L321 və L499 dəyişmədi (§10.3);
L189 və «coming back» testləri D-yə aiddir — C-də xana hələ sifarişi açır, onlar olduğu kimi keçir.

**Yeni testlər (+43; 1522 → 1565)**

- `MonthlyReportPage.test.tsx` (+25): Standart `min-w-[1480px]`; Yığcamda istiqamət AN-da; Standartın əfsanəsi; baxış dərhal
  dəyişir (cədvəl, kartlar, əfsanə, sorğusuz); ▲ Yığcamda sonda, Standartda məbləğdən əvvəl, faizin yanında heç vaxt; ✓ ⏳ ↩
  (cədvəl və kart: forma, rəng, ⏳ emoji deyil, Draft işarəsiz, AN-da sözlər); sıra × 5 (açılış A–Z və `aria-sort`; «Obyekt»
  → Z–A, URL, kartlar, «Cəmi» sonda, fokus, sorğu yox, yenidən A–Z, Geri; «İl cəmi» azalan/artan, cəmsizlər sonda, bərabərlər
  API sırası ilə; yapışdırılmış link; «Sıralama» select-i); üzən başlıq × 4 (gizli şəkil, ekran oxuyucuya cədvəl deyil;
  IntersectionObserver ilə göstərilir/gizlənir, `rootMargin` −72 / −124; surətin düyməsi əsl düyməyə ötürür; qutu ilə sinxron
  və zolaq qutunu sürüşdürür); ay düymələri × 2 (qutu sürüşmürsə yoxdur; 1280-də açılış Fevral–Oktyabr, Standart May–Oktyabr,
  səhifə geri/irəli, kənarda `aria-disabled`, fokus qalır); səhifə yana sürüşmür; fokus × 4 (`scroll-padding`, snap, sətir
  linkləri 124 px, sıra düymələri 84 px, filtrlər 72 px); cədvəlin adı (DK-15, DK-23); kartlarda 44 px; məlumatsız il.
- `components/reports/reportScroll.test.ts` (10): görünən aylar, açılış mövqeyi (03 §4.1-in 1280 nümunələri), səhifə.
- `analytics/reportSort.test.ts` (+5): sıralama, cəmsizlər sonda, bərabərlər, dəyişməzlik, düymə qaydası, seçim sözləri.
- `components/reports/ReportTable.test.tsx` (3): seçilmiş xana — qeyri-adi xanada yalnız `primary` halqa (DK-18), sətir və obyekt.

**Testlərin özü yoxlandı.** 8 qəsdən pozuntu (Yığcamda faiz; `aria-sort` yox; cəmsizlər əvvəldə; surət `aria-hidden`-siz; qutu
həmişə başda açılır; ⏳ emoji simvolu kimi; sətir linklərinin 124 px kənarı yox; ✓ yaşıl) — hər biri 1–7 testi düşürdü; fayllar
bərpa edildi və yoxlandı.

**Build və testlər**

| Yoxlama | Nəticə |
|---|---|
| `npm run build` | keçdi (2622 modul); köhnə xəbərdarlıq: əsas paket > 500 kB |
| `npx vitest run --reporter=dot --reporter=json` (JSON: scratchpad `phaseC-run.json`) | **83 fayl, 1565/1565**, 132 s |
| B-09 | keçdi, **7 551 ms** (faylın medianı 399 ms, ×19). Toxunulmadı |
| B-10 | keçdi, 1 404 ms (faylın medianı 219 ms). Toxunulmadı |
| `MonthlyReportPage.test.tsx` | 138 test, median 591 ms (B-də 433 ms — DOM-da indi başlığın surəti də var) |
| `git status` | yalnız `frontend/bax-orders-web/src/` və `AI_WORKFLOW/` |
| Brauzer | **yoxlanmayıb** — server açmaq qadağandır. jsdom-da layout, IntersectionObserver, ResizeObserver yoxdur: üzən başlıq, ay düymələri və açılış mövqeyi stub-larla yoxlanıb; əsl davranış (UX-01–UX-04, UX-36b, UX-39) Reviewer-in brauzer yoxlamasındadır |

**Spesifikasiyadan fərqlər və qeydlər**

1. **⏳ xanada və əfsanədə lucide `Hourglass`-dır** (B-dəki cümlə ilə eyni `StatusMark`); U+FE0E yalnız ↩ üçün.
2. **Sıra oxları:** artan ↑, azalan ↓ — məhsulun öz sıra düyməsi kimi («Artan ↑» / «Azalan ↓», `ApprovalInboxPage`). 03 §4.2-nin
   sxemi açılışda «Obyekt ↓» göstərir (A–Z). Mənanı `aria-sort` daşıyır; ox şəkildir. Brauzer QA-da sahibə göstərilməlidir.
3. Sıra düymələrində `-mx-1` yoxdur (04 §5.5): test #14 `-mx-`-i qadağan edir. Eyni görünüş `th`-nin boşluğu ilə alınıb
   (obyekt: `th px-1` + düymə `px-1` = sətrin `px-2`; il: `th px-0` + düymə `px-1` = sətrin `px-1`).
4. Z–A serverin ad sırasının tərsidir (brauzerdə yenidən sıralanmır) — sıra API-nin öz qaydası ilə eyni qalır.
5. **Seçilmiş xana (DK-18)** `ReportTable`-in `selected` prop-u kimi edildi və öz testi var; səhifə onu hələ vermir — URL-in
   `cell`-i və panel D mərhələsidir.
6. 03 §6.6-nın istəyə bağlı ipucu («Məbləğə klikləyin — sifarişin sətirləri sağda açılır.») əlavə edilmədi: C-də klik hələ
   sifarişi açır, cümlə yanlış olardı. D-də panel ilə birlikdə.
7. **Üzən başlıq:** `h-0` yapışqan qab qutudan əvvəldədir — eni kartı izləyir, ölçmə lazım deyil; görünmə iki
   IntersectionObserver ilə, sinxron sürüşmə hadisələri ilə. Effektlər `useFloatingHeader`-dədir və `ReportTable` onu çağırır:
   surət qutudan əvvəl gəldiyi üçün React qutunun ref-ini surətin öz effektlərindən sonra bağlayır (testlə tapıldı).
8. **Test #10 boş idi** (yuxarıda): jsdom `[class*="min-w-["]`-i heç vaxt tapmır. İndi `withClass` ilə süzülür.
9. Ay düymələrinin aralıq mətni canlı bölgə deyil: sürüşmə zamanı fasiləsiz danışardı. Düymənin yanında adi mətndir.
10. Kartlarda gələcək ayın adı altında cədvəl başlığındakı 4 px ştrix var (köhnə 2,45:1 solğun mətnin yerinə; 04-də ayrıca
    yazılmayıb).
11. Açılış mövqeyi il, baxış və son sifarişli ay dəyişəndə yenidən hesablanır; axtarış, növ və sıra dəyişəndə qutu yerində
    qalır.

### C · Yoxlayıcının qeydləri — 2026-10-16

- `git diff --stat -- src tests` boşdur: backend, API, baza dəyişməyib. `components/imports/` kodu dəyişməyib.
- Build keçdi. Tam qaçış (scratchpad `phaseC-review.json`): **1564/1565**. Düşən: `components/imports/review/productAliasAuthority.test.tsx`
  › «offers no alternative name without the authority, and maps for this import only» (1 418 ms; `findBy` 1 000 ms-də
  «Lampa 15W» düyməsini tapmadı). Fayl tək başına 5 dəfə: 45/45. Bu, faylın **birinci** testidir — soyuq ilk render
  tam qaçışın yükü altında 1 s-dən uzun çəkir; eyni addımı edən sonrakı testlər keçir. V2 ilə əlaqəsi yoxdur
  (`BLOCKERS.md` B-10, ikinci hal). B-09 testi keçdi (7 852 ms).
- CSS-ə bağlı yoxlama sətirləri 69-dan 110-a çıxıb (48 test); silinən sətirlərin hər birinin əvəzi 03 §10.3-ə uyğundur;
  köhnə rəng qaydası (`text-rose-700`) yoxlaması indi hər iki görünüşdə aparılır.

### Pul formatı (D-52) — 2026-10-16

- Yeni `components/analytics/azNumber.ts`: `azNumberFormat(options)` — `en-US` hissələri (`formatToParts`), qrup «.»,
  onluq «,»; brauzerin `az` məlumatından asılı deyil. Rəqəmin özü, yuvarlaqlaşdırma və işarə dəyişmir.
- Ona keçən 4 yer: `components/analytics/format.ts` (say, pul, faiz), `components/analytics/trend.ts` (nisbət),
  `components/imports/labels.ts` (`formatNumber`, `formatAmount`), `terminology/terms.ts` (pay faizi). Bu dörd fayldan
  formatlanmış rəqəmi 58 komponent işlədir — hamısı avtomatik düzəlir.
- Redaktə dialoqları (`AddLineDialog`, `EditLineDialog`) formatlanmış mətni geri oxumur: xam ədəd göstərir, «12,5»-i
  qəbul edir — dəyişməyib. API, baza, hesablamalar, Excel idxalı dəyişməyib.
- Node-da 40 nümunə dəyərdə köhnə `az-Latn-AZ` çıxışı ilə yeni çıxış simvolu-simvoluna eynidir (0 fərq) — ona görə
  mövcud testlərin heç biri dəyişmədi.
- Yeni `azNumber.test.ts` (4 test): ayırıcılar; brauzerin öz ayırıcıları başqa olanda belə «.» və «,»; `formatMoney` /
  `formatCount` / `formatQuantity` / `formatPercent` nümunələri; və kodda `Intl.NumberFormat('az…')` başqa yerdə
  yoxdur — bu qoruyucu yoxlamanın işlədiyi təsadüfən təsdiqləndi (dayandırılmış əmrin qoyduğu müvəqqəti fayl onu
  düşürtdü; fayl silindi).
- Build keçdi. Tam qaçış (scratchpad `format-run.json`): **1568/1569** — yenə yalnız eyni `productAliasAuthority`
  testi (1 495 ms). B-09 testi keçdi (4 381 ms).

### C · Brauzer yoxlaması (format düzəlişi ilə birlikdə) — 2026-10-16

Lokal tətbiq (dev bazası 55434: 167 sifariş, hamısı «Təsdiqlənib»), Chrome 155, iframe ilə dəqiq en. Şəkillər
`qa/phaseC-*.png` (git-ə düşmür).

| Yoxlama | 1920 | 1440 | 1280 | 390 |
|---|---|---|---|---|
| Səhifə yana sürüşməsi | 0 | 0 | **0** (əvvəl 28 px — B-07 bağlandı) | 0 |
| Cədvəlin qutusu | sürüşmür, 12 ay | sürüşmür, 12 ay (1099 = 1099) | sürüşür (939 / 1096); açılışda Yan–Sen (son sifarişli ay sağ kənarda) | kartlar (27), 3 sütun |
| Pul formatı | «317.128,16 ₼» | eyni | eyni | eyni |
| Status | ✓ boz; ⏳ və ↩ əfsanədə var, xanalarda yox (lokal bazada belə sifariş yoxdur — testlər yoxlayır) | eyni | eyni | eyni |
| Qeyri-adi ay | ▲ 50, ▼ 22, istiqamət fonu ilə | eyni | eyni | kartda ▲ və fon |
| Sıralama | «Obyekt» A–Z (`aria-sort=ascending`) | «İl cəmi» → azalan: Heydər Əliyev 115.561,64 birinci; məbləğsizlər (Çadır, Puşkin parkı) sonda; «Cəmi» tfoot-da; URL `?sort=cem-azalan` | — | «Sıralama» seçimi var |
| Sürüşmə | — | Standart: qutu 1099 / 1480, açılışda Fev–Sen | aşağı sürüşəndə üzən ay başlığı 72 px-in altında, nazik sinxron zolaqla; «Sonrakı aylar» (real kliklə) → Apr–Dek, düymə sonda passiv | — |

**Tapılan problemlər.**
1. **S3 · Vizual** — qutu yana sürüşəndə «Sistemdə hələ sifarişi yoxdur» (12 ayı tutan xana) sabit obyekt sütununun
   altına girir: ekranda «…arişi yoxdur» görünür (Standart, 1440; Yığcam 1280-də də ola bilər). İstiqamət: mətn qutunun
   görünən sol kənarına yapışsın (sticky, obyekt sütununun eni qədər). → icraçı D-dən əvvəl düzəldir.
2. **Test mühiti (B-10)** — `productAliasAuthority.test.tsx`-in birinci testi C-dən sonrakı 2 tam qaçışın 2-də düşdü
   (soyuq ilk render > 1 s `findBy`); tək başına 45/45. Sahibin qərarı lazımdır.
3. Qeyd (problem deyil): ilk yoxlamada «Sonrakı aylar» düyməsi «işləmir» göründü — səbəb yoxlama üsulu idi
   (valideyn pəncərədən proqramla `click()`); siçanla real klikdə düzgün işləyir.
