# 06 — İcra: dashboard kartlarının detalları

**Tarix:** 2026-10-17 · **Mərhələ:** 6 — İcra (`DESIGN_WORKFLOW.md`, `ui-implementation-qa`) · **Əsaslanır:** `01-audit.md`
§7–§8, `05-approval.md` (AC-01…AC-15). Branch: `ui-v2-ayliq-hesabat` işçi ağacı, **commit yoxdur**.

## V2 qapısı (O-4) necə saxlanıldı

Sahibin cavabı: «V2-yə toxunmadan hamısını et». Ona görə:
- V2-nin dəyişdiyi və ya yaratdığı **heç bir fayl dəyişmədi** (`format.ts`, `buttonClass.ts`, `terms.ts`, `trend.ts`,
  `imports/labels.ts`, `SegmentedControl`, `reports/*`, `analytics/report*`, `MonthlyReportPage*`, `ScopeSelector*`).
- V2-nin yeni modullarından heç nə idxal olunmadı (`buttonClass`, `SegmentedControl`, `azNumber`, `reports/MissingPriceMark`).
  `format.ts`-dən yalnız commit olunmuş versiyada da olan funksiyalar çağırılır (`formatMoney`, `formatMoneyDelta`,
  `formatPercent`, `formatCount`, `formatMonthRange`, `describeBasisCaption`, `basisLabels`, `costDirectionToneClass`,
  `costDirectionTintClass`). Testlərdə pul formatı hər iki `format.ts` versiyasında eynidir (Node).
- Dəyişən faylların hamısı V2-nin siyahısından kənardadır → iki iş fayl yolları üzrə ayrıca commit oluna bilər
  (aşağıdakı siyahı bu işin tam fayl siyahısıdır).

## Dəyişən fayllar

| Fayl | Nə | Niyə |
|---|---|---|
| `src/analytics/dashboardDetail.ts` (yeni) + `.test.ts` | `detal` / `obyekt` URL dəyərləri, oxuma, təmizləmə | AC-04 |
| `src/analytics/useDashboardDetail.ts` (yeni) | açma = push, keçid = replace, bağlama = `navigate(-1)` (giriş bizimdirsə) | AC-04, §7.7 |
| `src/api/dashboard.ts` | yeni **müştəri** funksiyası `fetchDashboardChanges` — mövcud `/api/v1/dashboard` endpoint-i mövcud parametrlərlə (`group=Compared`, `sort=AbsoluteKnownAmountDelta`, `descending=true`), 100-lük səhifələrlə | AC-06, AC-07; server API dəyişmir |
| `src/api/dashboardChanges.test.ts` (yeni) | sorğu parametrləri, süzgəcsizlik, səhifələmə | AC-07 |
| `components/dashboard/v2/KpiRow.tsx` + test | kartlar disclosure düyməsi; açıq kart `ring` ilə (ölçü dəyişmir); V-1 rəng köməkçisi; V-2 adi hərfli etiket, tokenlər; 2×2 yığcam mobil, `rem`-ə bağlı konteyner sorğusu ilə 1 sütun; `kpiLabel` / `kpiValue` | AC-01, AC-02, AC-11, AC-13 |
| `components/dashboard/v2/KpiDetailSection.tsx` (yeni) | kartların altındakı tək region: bağlıda `hidden` (0 hündürlük), 150 ms açılma, fokus, sürüşmə, ✕ / «Bağla» | AC-01, AC-03, AC-05 |
| `components/dashboard/v2/ExpandableList.tsx` (yeni) | ilk 8 + «Hamısını göstər (N)», istənən sətir üçün özü açılır | AC-10, AC-08 |
| `components/dashboard/v2/DifferenceDetail.tsx` (yeni) | «Fərq»: artan / azalan / dəyişməyən qruplar (yalnız say), sətir yerində açılır, Esc qaydası, müqayisədən kənar qalanlar | AC-06 |
| `components/dashboard/v2/MonthDetails.tsx` (yeni) | «Məbləğ», «Müqayisə dövrü», «Aktiv obyektlər» bölmələri | AC-14 |
| `components/dashboard/v2/KpiDetails.test.tsx` (yeni) | yuxarıdakı dörd komponentin testləri | — |
| `components/dashboard/v2/ChangesTable.tsx` + test | «ən böyük 5» ayrıca siyahıdan; «Ətraflı» → «Fərq» + obyekt; rəng köməkçisi | AC-07, AC-08, AC-13 |
| `components/dashboard/v2/SimpleDashboardView.tsx` | kartlar + region bir blok; Esc; fokusun karta qayıdışı | AC-01…AC-05 |
| `components/dashboard/ObjectChangeBreakdown.tsx` (yeni) | Drawer-in məzmunu **dəyişmədən** köçürüldü | AC-06, AC-15 |
| `components/dashboard/ChangeDetailDrawer.tsx` | indi `ObjectChangeBreakdown`-ı sarıyır; «Ətraflı baxış»da əvvəlki kimi | AC-15 |
| `components/dashboard/OutsideMonthlyPanel.tsx` | siyahı `useOutsideMonthly` + `OutsideMonthlyLines`-a ayrıldı; panel eyni | AC-14, AC-15 |
| `pages/ManagementDashboardPage.tsx` + test | URL vəziyyəti, ayrıca sorğu (yalnız «Sadə baxış»da), görünüş dəyişəndə `detal` silinir | AC-04, AC-07, AC-15 |

## Toxunulmayanlar

Backend və API, server hesablamaları, DTO-lar; «Ətraflı baxış» (`DetailedDashboardView`, `KpiGrid`, onun Drawer-i);
«Bütün obyektlər» cədvəli və süzgəcləri; `ObjectChangeBreakdown`-a köçürülən məzmun (brauzerdəki mövcud pay
hesablaması daxil, S-2-yə görə bu işdə dəyişmir); V2 faylları.

## Plandan kənarlaşmalar və aşkar olunanlar

- **«Ətraflı baxış» Drawer-i qalır.** `01-audit.md` «ChangeDetailDrawer-in istehlakçısı qalmır» deyirdi; əslində
  «Ətraflı baxış»ın «— təfərrüat» düyməsi də onu açır (səhifə testləri bunu yoxlayır). S-4 ilə o görünüş dəyişmir:
  Drawer yalnız «Sadə baxış»dan çıxdı, məzmunu ortaq `ObjectChangeBreakdown`-dadır. AC-08 buna görə dəqiqləşdirildi.
- **Ayrıca sorğu ayrıca müştəri funksiyası ilə.** Mövcud səhifə testləri `fetchDashboard`-un son çağırışını yoxlayır;
  eyni funksiya ilə ikinci sorğu onları yanıldardı. `fetchDashboardChanges` eyni endpoint-i çağırır — server API dəyişmir,
  köhnə yoxlamalar zəifləmir.
- **Kartlar arası keçiddə hündürlük saxlama** (`01-audit §7.3.2`) ayrıca `min-height` ilə edilmədi: keçid sinxrondur (bütün
  rəqəmlər artıq yüklənib), yeganə asinxron hissə «Fərq» siyahısıdır və onun yer tutucusu `LoadingRows`-dur. Sabit
  `min-height` yoxdur (AC-03).
- **`buttonClass` işlədilmədi** (V2-nin commit olunmamış faylı). Düymələr tokenlərlə və ≥ 44 px toxunma hündürlüyü ilə
  birbaşa yazıldı; V2 commit olunandan sonra `buttonClass`-a keçirmək ayrıca kiçik addımdır.

## Testlər və build

| Addım | Nəticə |
|---|---|
| Mərhələ 1 (URL + ayrıca sorğu) | `dashboardDetail.test.ts` + `dashboardChanges.test.ts`: 11/11 |
| Drawer məzmununun köçürülməsi | `ChangeDetailDrawer.test.tsx` dəyişmədən 12/12 |
| Mərhələ 2–4 (kartlar, region, «Fərq», qalan üç bölmə, «Ətraflı») | `KpiRow` 14/14, `ChangesTable` 14/14, `KpiDetails` 15/15, `ManagementDashboardPage` 65/65 |
| Tam dəst, 1-ci qaçış | 1615/1616 — düşən yeganə test **B-09**-dur (`OrderDecisionPage.test.tsx` › «the way back to the monthly report», 20 s vaxt həddi; bu iş o fayla toxunmur). Fayl təkbaşına 3 dəfə: 135/135 hər dəfə. JSON: scratchpad `dashboard-full-run.json` |
| Brauzer düzəlişlərindən sonra | `npm run build` ✓ · tam dəst **1616/1616** ✓ (JSON: `dashboard-final-run.json`) |

Yeni testlər: 47 (URL 7, sorğu 4, kartlar +5, «ən böyük 5» +4, detallar 15, səhifə +12). Köhnə testlərdə yalnız iki növ
dəyişiklik var: rəng sinfi yoxlamaları köhnə `text-red-500`/`green-500`-dən məhsulun köməkçisinə keçdi (V-1, qəsdən), və
`ChangesTable` testləri `attention` əvəzinə sıralanmış siyahı verir. Heç bir yoxlama zəiflədilməyib.

## Brauzer yoxlamasından sonra edilən düzəlişlər

1. **1280–1920 px-də kartlar 2 sütun idi** — yeni konteyner qaydası (`@xs:grid-cols-2`) kaskadda köhnə `xl:grid-cols-4`-ü
   üstələyirdi. 4 sütun da konteyner sorğusu oldu (`@4xl`, 56 rem). İndi 1280/1440/1920 → 4 sütun.
2. **Fokus açılanda başlığa keçmirdi, «Ətraflı»dan sonra sətir ekrana gəlmirdi** — hər ikisi bölmə hələ `hidden` ikən işə
   düşürdü (jsdom bunu göstərmir). İndi bölmə görünəndən sonra işləyir.
3. **360 px-də səhifə 16 px yana sürüşürdü** — köhnə qüsur: «Məbləğ dəyişiklikləri»ndəki `sr-only` söz cədvəlin sürüşmə
   qutusundan «qaçırdı». Nişana və bölmənin daxili qutusuna `relative` verildi.
4. **Telefonda bir neçə keçid 17 px idi** — siyahı keçidləri telefonda ≥ 44 px oldu.

## Qəbul mərhələsi (2026-10-17)

- **Q-1:** «Fərq» siyahısının sorğusu xəta verəndə «Məbləğ dəyişiklikləri» artıq yox olmur — başlıq qalır, `ErrorState`
  (serverin mətni) və «Yenidən cəhd et»; ilk yükləmədə `LoadingRows`. Xəta boş siyahı və ya sıfır kimi göstərilmir;
  yalnız həqiqətən heç kim dəyişməyəndə bölmə əvvəlki kimi görünmür.
- **Q-3:** açılan obyekt sətrindəki «Detallara bax» və «Obyektin səhifəsi» telefonda 44 px (`ObjectChangeBreakdown`-a
  `touchLinks`; «Ətraflı baxış»ın Drawer-i dəyişmir).
- **Müstəqil visual-qa** (`07-qa.md`): 1-ci qaçış KEÇMƏDİ (D-1, S2) → düzəlişlər: D-1 (dar ekran və böyük mətndə sətir
  sütunlu yığılır, ad ən azı 10 rem), D-2 («Ətraflı»dan sonra fokus sətrə, cədvəl keçidindən sonra başlığa), D-4 (fərqi
  bilinməyən ayrıca qrup; baza siyahısı tam) → təkrar yoxlama QEYDLƏRLƏ KEÇDİ.
- **Yekun:** `npm run build` ✓ · tam dəst **1623/1623** ✓ (JSON: `dashboard-acceptance-run.json`) · dashboard testləri
  320/320.
- **Ayrı commit yoxlaması:** `HEAD` (`b43c2c5`, V2-siz) üzərində müvəqqəti worktree + yalnız bu işin 20 kod faylı:
  `tsc --noEmit` ✓, dashboard testləri 320/320, tam dəst **1526/1526** — commit V2-dən asılı deyil.
