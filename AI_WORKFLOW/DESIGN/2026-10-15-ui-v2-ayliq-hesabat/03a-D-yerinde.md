# 03a — D mərhələsi yenidən: xananın detalları yerində, sətrin altında

**Tarix:** 2026-10-17 · **Mərhələ:** 3 (UX düzəlişi) + D-nin icra planı · **Vəziyyət: TƏSDİQLƏNDİ — D-Y1, D-Y2, D-Y3,
2026-10-17** (sitat §11-də); tənqid `04a-D-critique.md` (QEYDLƏRLƏ KEÇDİ), S2-lərin həlli §10-da; **icra edildi**
(`v2-inteqrasiya`, commit yoxdur — `06-implementation.md`, «D · yerində — icra») · **Əsaslanır:** D-50 №5, D-51, `03-ux.md` §3.2, §3.4, §4.7, §6.9, §9.8, §10.3; `06-implementation.md`
§2 (D sətri), §2a.

**Sahibin sözləri.** 2026-10-17, dashboard üçün: «Mən sağdan açılan panel (Drawer) istəmirəm. Bu, əvvəlcədən bildirdiyim
tələbdir.» Eyni gün, V2-nin D mərhələsi soruşulanda («Aylıq hesabatda xana detalları necə açılsın?»): **«Yerində,
sətrin altında»**. Bu, D-51-in «xanaya klik sağda panel açır» bəndini əvəz edir. `DECISIONS.md`-yə sənəd commit-i ilə
yazılacaq: fayl indi commit olunmamış D-53-ü saxlayır və ona toxunulmur.

## 1. Nə dəyişir, nə dəyişmir

**Dəyişir — yalnız qab.** Detallar `Drawer`-də (03 §3.4, §4.7, §6.9-un başlığı) deyil, kliklənən obyektin sətrinin
**düz altında** açılır: masaüstündə cədvəlin içində, planşet və telefonda obyektin kartının içində. Eyni anda yalnız
bir xananın detalları açıqdır. Tam ekran və fon qaranlığı yoxdur.

**Dəyişmir:**
- **Məzmun — 03 §6.9.1–6.9.8 sözbəsöz:**
  - başlıq: obyekt + «İyun 2026 · Aylıq sifarişlər»;
  - status nişanı və «əvvəlki sifarişi əvəz edir» qeydi;
  - növün məbləği;
  - iki ayrı adlı müqayisə;
  - ayın tərkibi;
  - sifarişin real sətirləri `GET /api/v1/orders/{id}`-dən: 50-lik səhifələr, `hasPrice` süzgəci, cavabdeh şəxs;
  - «Bütün sifarişin məbləği» («Hamısı» növündə yox);
  - «Sifarişə bax» (24.3) və «Obyektin sifarişləri».
- **Xana link qalır** (03 §9.8, AC-11): Ctrl/⌘/Shift/Alt, orta düymə və kontekst menyusu sifarişi əvvəlki kimi açır.
- **URL:** açar `cell=<locationId>-<MM>`. İlk açılış tarixçəyə **push** edilir, keçid **replace**, bağlanma «Geri»
  ilə (03 §3.2). «Sıfırla» `cell`-i silir. Tapılmayan `cell` `replace` ilə çıxır.
- **Sifarişdən «Geri» ilə qayıdış:** detal açıq qayıdır (24.3).
- **API, backend, hesablamalar** dəyişmir. `Drawer`, `Modal`, `OrderDetailPage` və dashboard faylları da dəyişmir.

## 2. Masaüstü (≥ 1024 px, cədvəl)

- **Yer.** Sətrin altında bir əlavə `<tr>`, içində bütün 14 sütunu tutan bir `<td colSpan={14}>`.
- **Görünən en.** Detalın qutusu `sticky left-0`-dır. Eni cədvəl qutusunun görünən eninə bərabərdir (mövcud
  `useBoxScroll`-un ResizeObserver-i ilə ölçülür). Cədvəl yana necə sürüşmüş olsa da, detal tam görünür və özü yana
  sürüşmür. Açılanda qutunun sürüşmə mövqeyi dəyişmir.
- **Layout sıçraması.**
  - Kliklənən sətir yerində qalır. Yalnız altdakı sətirlər detalın hündürlüyü qədər aşağı düşür.
  - Açılma 150 ms çəkir (dashboard-un `KpiDetailSection`-u kimi, `grid-template-rows` 0fr → 1fr).
    `prefers-reduced-motion` olanda animasiya yoxdur.
  - Bağlıda detalın sətri DOM-da yoxdur.
- **Nəyin açıq olduğu.** Seçilmiş xananın `primary` halqası və sətrin zolağı görünür. Bunlar C-də hazırlanıb
  (`ReportTable` `selected`, DK-18).
- **Daxili düzülüş.** ≥ 1280 px iki sütun: solda rəqəmlər (§6.9.2–6.9.5), sağda sətirlər (§6.9.6). Daha dar endə bir
  sütun. Hərəkətlər (§6.9.7) altda, həmişə görünür.
- **Üzən başlıq, «Cəmi», sıralama.**
  - Üzən başlıq detal sətrini adi sətir kimi sayır. Bunun üçün öz testi olacaq.
  - Sıra dəyişəndə detal öz sətri ilə birlikdə yeni yerə gedir.
  - Axtarış sətri gizlədirsə, `cell` silinir (§3.2).

## 3. Planşet və telefon (< 1024 px, kartlar)

Detal obyektin kartının içində, ay şəbəkəsinin altında açılır və kartın tam enini tutur. Tam ekran yoxdur. Kartın ay
düymələrində də `aria-expanded` var. Məzmun bir sütundur, sətirlər siyahı kimidir (03 §9.9).

## 4. Qarşılıqlı əlaqə və fokus (03 §3.4-ün №2, №3, №6 bəndlərini əvəz edir)

| Hal | Davranış |
|---|---|
| Dolu xanaya adi klik və ya Enter | `preventDefault`; `cell` push (lazımsa `year` də yazılır) |
| Eyni sətirdə başqa xana, və ya başqa sətrin xanası | `cell` replace; detal yeni yerdə |
| Açıq xanaya təkrar klik | bağlanır (dashboard kartları kimi) |
| ✕ «Detalları bağla», Esc, brauzerin «Geri»si | bağlanır. Giriş bizimdirsə `navigate(-1)`, deyilsə `cell` replace ilə silinir. Bir girişə bir bağlanma düşür |
| Sifarişsiz və gələcək ay | əvvəlki kimi klik edilmir |
| Açılanda fokus | detalın başlığına (`h3`, `tabIndex=-1`) keçir, detal görünən olandan **sonra** (dashboard-da D-2 dərsi) |
| Bağlananda fokus | detalın təsvir etdiyi xananın linkinə qayıdır (`scrollIntoView nearest`, sonra `focus({preventScroll})`) |
| `cell` ilə gəliş (link, yeniləmə, sifarişdən «Geri») | sətir və ya kart `block: 'center'` ilə görünən yerə gəlir, detal açıqdır |

ARIA: xananın linkində `aria-expanded` və `aria-controls="report-cell-detail"` olur. Detal `role="region"`-dur, adını
başlığından alır.

## 5. Fayllar

| Fayl | Nə |
|---|---|
| `analytics/reportCell.ts` (yeni) + test | `cell`-i oxumaq, yazmaq, təmizləmək (06 §2-də planlaşdırılıb) |
| `analytics/useReportCell.ts` (yeni) | açılış push, keçid replace, bağlanma `navigate(-1)` (dashboard-un `useDashboardDetail` nümunəsi) |
| `components/reports/ReportCellDetail.tsx` (yeni) | qab: başlıq, ✕, açılma, fokus; §6.9.2–6.9.5 |
| `components/reports/ReportOrderLines.tsx` (yeni) | §6.9.6: sətirlər, səhifələr, `hasPrice` süzgəci, cavabdeh şəxs (06-da planlaşdırılıb) |
| `ReportCell.tsx`, `ReportTable.tsx`, `MonthlyReportYearList.tsx`, `pages/MonthlyReportPage.tsx`, `reports/labels.ts` | klik → detal; detal sətri; kartda detal; URL və sorğu; yeni mətnlər yalnız 03-dəkilər |

## 6. Testlər (03 §10.3-ün D cədvəli, qab dəyişikliyinə uyğunlaşdırılmış)

- Dialoq yoxlamaları region yoxlamaları ilə əvəzlənir. Məzmun yoxlamaları (rəqəmlər, sözlər, sətirlər, statuslar)
  sözbəsöz qalır.
- Yeni testlər:
  - eyni anda bir detal; təkrar klik bağlayır;
  - push, replace və «Geri»;
  - Esc; açılanda fokus başlıqda, bağlananda xanada;
  - Ctrl-klik detal açmır;
  - detal sətri `colSpan=14`, `sticky` və ölçülən endədir;
  - kart variantı;
  - tapılmayan `cell` silinir; «Sıfırla» `cell`-i silir;
  - sifarişdən «Geri» ilə detal açıq qayıdır;
  - üzən başlıq detal sətri ilə də düzgün işləyir.
- 06 §2a S4-1: L1310, L1322, L1351 testlərinə «xana → detal → Sifarişə bax» addımı əlavə olunur.
- Hər addımdan sonra uyğun testlər, sonda `npm run build` və tam qaçış (JSON ilə, B-09).

## 7. İnteqrasiya — D-dən əvvəl qərar lazımdır

V2 branch-i `b43c2c5` üzərindədir, `main` isə artıq dashboard-u daxil edib (`3bfc340`).

- **Tövsiyə: D-dən əvvəl `main`-i V2-yə birləşdirmək.**
  - Konflikt yoxdur: `git merge-tree` təmizdir, birləşmiş ağac bu gün 1623/1623 keçib.
  - Faydası: D dashboard-un artıq yoxlanmış hissələrini təkrar yazmadan işlədir (`ExpandableList`, yerində açılma
    nümunəsi). E mərhələsi də son vəziyyəti yoxlayır.
- **Maneə:** əsas qovluqda dashboard-un 25 commit olunmamış surəti var. Onlar `3bfc340` ilə bayt-bayt eynidir, amma
  durduqca git merge-i dayandırır. Merge üçün onları silməyə icazəniz lazımdır. Məzmun itmir: hamısı `3bfc340`-dədir.
- **Alternativ:** D-ni V2-də dashboard-suz etmək (oxşar hissələr ayrıca yazılır), birləşməni E-dən sonra etmək.

## 8. E mərhələsi üçün qəbul meyarları (03 §10-a əlavə)

| Ən | Yoxlanılan |
|---|---|
| 1440, 1280, 1024 | detal sətrin altında tam görünür; qutu sürüşmüş olanda da; səhifə yana sürüşmür |
| 768, 390 | detal kartın içindədir; toxunma hədəfləri ≥ 44 px |
| hamısı | fokus və Esc qaydası; URL və «Geri»; sifarişdən qayıdış; rəqəmlər API ilə qəpiyinə qədər eyni; artım qırmızı, azalma yaşıl |

Rollar: Koordinator, Rəhbər, Administrator.

## 9. Sahibin cavabını gözləyən suallar

1. **D-Y1.** Yuxarıdakı forma təsdiqlənirmi? Bura telefonda kartın içində açılma da daxildir, tam ekran yoxdur.
2. **D-Y2.** D-dən əvvəl `main` V2-yə birləşdirilsinmi (§7)? Bunun üçün 25 eyni surət silinməlidir.
3. **D-Y3.** İş axınının 4-cü mərhələsi: icradan əvvəl bu planın qısa dizayn tənqidi (`visual-qa`, A rejimi, Sonnet)
   aparılsınmı?

## 10. Tənqiddən sonra dəqiqləşdirmələr (`04a-D-critique.md`)

| Tapıntı | Həll |
|---|---|
| **Q-1 (S2)** — detalın eni | Detal xanası `p-0`-dır. Onun içindəki qutu `sticky left-0`-dır və eni cədvəl qutusunun `clientWidth`-idir. Bu en `ReportTable`-də qutuya qoşulan ResizeObserver ilə ölçülür (`reportScroll.ts`, `useBoxWidth`). Cədvəl `table-fixed`-dir və sütun enləri `colgroup` ilə başlıqdan gəlir, ona görə `colSpan` xanası sütunları dəyişə bilmir. Qutu cədvəldən heç vaxt enli olmadığı üçün `scrollWidth` dəyişmir. Brauzer yoxlaması: detal açılanda `scrollWidth` eyni qalır, detal qutunun hər sürüşmə mövqeyində tam görünür. |
| **Q-2 (S2)** — üzən başlıq | Detal qutusu `z-11`-dir: üzən başlıqdan (`z-10`) yuxarı, tətbiqin başlığından (`z-20`) aşağı. Səhifə detalın içindən keçərkən detal üzən başlığı örtür, uyğun gəlməyən ay adları onun üstündə görünmür. Detaldan yuxarıda və aşağıda üzən başlıq əvvəlki kimi işləyir. JS yoxdur, üzən başlığın məntiqi dəyişmir. |
| Q-3 (S3) — fokus | Dashboard-un `KpiDetailSection`-u ilə eyni mexanizm: fokus detal `hidden`-dən çıxandan sonra verilir (animasiya `overflow-hidden` ilədir, `visibility` yoxdur). `prefers-reduced-motion`-da animasiya yoxdur. |
| Q-4 (S3) — «Geri» | Keçidlər replace olduğu üçün «Geri» xanadan-xanaya deyil, detaldan çıxır — bu qəsdəndir (03 §3.4). Yeniləmədən sonra tarixçə işarəsi itir, ✕ `cell`-i replace ilə silir və səhifədə qalır. Bunun öz testi var. |
| Q-5 (S3) — telefonda sürüşmə | Açılanda detal yalnız ekranın yuxarı üçdə ikisində deyilsə görünən yerə gətirilir (`block: 'start'`, dashboard-un qaydası). Linklə gələndə də bir dəfə. 44 px yoxlaması E-dədir. |
| Q-6 (S4) — ARIA | `aria-expanded` hər dolu xananın linkindədir. `aria-controls` yalnız açıq xanada olur. Cədvəlin və kartların detalının id-ləri ayrıdır (`report-cell-detail-table`, `report-cell-detail-cards`). İkisi eyni anda DOM-dadır, amma biri hər zaman `display: none`-dur. |
| Q-7 (S4) — zebra | Zolaq sətrin `rows` massivindəki indeksindən hesablanır; detal sətri bu indeksi dəyişmir. |

## 11. Sahibin təsdiqi (2026-10-17, sözbəsöz qısaldılmış)

> **D-Y1 — TƏSDİQ.** `03a-D-yerinde.md` sənədindəki yerində açılan xana detalları dizaynını təsdiqləyirəm. Desktop:
> detallar kliklənən sətrin altında açılsın. Mobil və planşet: detallar obyekt kartının daxilində açılsın. Eyni anda
> yalnız bir detal açıq olsun. URL, Back, fokus və sifarişdən qayıdış qaydaları qorunsun. Horizontal scroll zamanı
> detallar sabit sütunun altında qalmasın. Mövcud API və biznes hesablamaları dəyişdirilməsin.
>
> **D-Y2 — TƏSDİQ, AMMA TƏHLÜKƏSİZ İZOLYASİYA İLƏ.** V2 (`567d198`) ilə main-in birləşdirilmiş vəziyyətini ayrıca
> integration branch və Git worktree-də hazırla. […] Push, production merge və deploy etmə.
>
> **D-Y3 — TƏSDİQ.** D mərhələsinə başlamazdan əvvəl Sonnet ilə qısa, müstəqil visual-qa dizayn tənqidi apar. […]
> Bloklayıcı UX problemi varsa, bildir və dayan. Yoxdursa, təsdiqlənmiş D mərhələsinin implementasiyasına davam et.

İnteqrasiya: branch `v2-inteqrasiya` (`567d198` + `main` → birləşmə commit-i `654032c`, konfliktsiz, ağac `fb999d7`),
worktree `C:/Users/HP/BaxOrders-worktrees/v2-inteqrasiya`.
