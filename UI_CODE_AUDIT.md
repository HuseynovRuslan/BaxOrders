# BaxOrders — frontend UI/UX kod auditi

**Tarix:** 2026-10-12  ·  **Əhatə:** `frontend/bax-orders-web/src`  ·  **Xarakter:** yalnız analiz, heç bir kod dəyişdirilməyib

Bu sənəd sistemin bütün UI/UX dizaynını yeniləmək üçün hazırlanıb. Məqsəd — redizaynı aparacaq adama
**nəyin harada olduğunu, nəyin təkrarlandığını və nəyi sındırmaq olmadığını** rəqəmlərlə göstərmək.

Sənəddə məxfi məlumat, API açarı, parol və ya istifadəçi məlumatı yoxdur.

---

## 0. Bir baxışda

| | |
|---|---|
| Texnologiya | React 19.3 · TypeScript 7 · Vite 8 · Tailwind CSS 4.3 · react-router 7.18 |
| Kitabxanalar | `lucide-react` (ikonlar), `recharts` (yalnız bir faylda) |
| Mənbə kodu | **169 fayl · 27 426 sətir** |
| Testlər | **81 fayl · 26 424 sətir** (mənbə ilə demək olar bərabər) |
| Komponent faylı (test xaric) | **112** |
| Səhifə | **15** |
| Dark mode | **yoxdur** — `dark:` sinfi heç bir faylda işlənmir |

### Üç cümlə ilə əsas nəticə

1. **Dizayn token qatı mövcuddur və yaxşı yazılıb, amma demək olar işlənmir.** Rəng siniflərinin
   **159-u token, 2 043-ü standart Tailwind**-dir. 112 komponent faylından yalnız **7-si** tokenlərə sadiqdir.
2. **Paylaşılan primitivlər zəifdir.** Dialoq üçün yaxşı ortaq komponent var (23 yerdə işlənir), amma
   **cədvəl, düymə, giriş sahəsi, forma üçün ortaq komponent yoxdur** — 24 cədvəl, 183 düymə, 60 giriş
   sahəsi hər yerdə əl ilə qurulub.
3. **Responsivlik yarımçıqdır.** 112 fayldan **60-ında heç bir responsiv prefiks yoxdur**; mövcud
   olanların da 90%-i yalnız iki kəsim nöqtəsindədir (`sm:` 57, `lg:` 74).

---

## 1. Səhifələr və route-lar

Route cədvəli bir yerdədir: [`src/App.tsx`](frontend/bax-orders-web/src/App.tsx).
Bütün qorunan route-lar `RequireAuth` → `AppLayout` içindədir.

| Route | Səhifə | İcazə | Qeyd |
|---|---|---|---|
| `/login` | `LoginPage` | — | Layout-dan kənarda |
| `/` | → `/dashboard` | giriş | yönləndirmə |
| `/dashboard` | `ManagementDashboardPage` | giriş | **başlanğıc ekran**, 438 sətir |
| `/dashboard/monthly` | `MonthlyReportPage` | giriş | ilin icmalı |
| `/approvals` | `ApprovalInboxPage` | `canViewApprovals` | |
| `/orders` | → `/locations` | giriş | köhnə route, yönləndirilir |
| `/orders/:orderRequestId` | `OrderDetailPage` | giriş | **ən böyük fayl — 1 024 sətir** |
| `/locations` | `LocationsPage` | giriş | |
| `/locations/:locationId` | `LocationDetailPage` | giriş | |
| `/locations/:locationId/analytics` | `RetiredComparisonRedirect` | giriş | **ləğv edilmiş səhifə**, yönləndirmə |
| `/products` | `ProductsPage` | `canManageCatalog` | |
| `/products/:productId/history` | `ProductHistoryPage` | `canManageCatalog` | |
| `/products/categories` | `ProductCategoriesPage` | `canManageCatalog` | |
| `/suppliers` | `SuppliersPage` | giriş | Rəhbər oxuyur, dəyişmir |
| `/pricing-modes` | `PricingModeReviewPage` | giriş | 480 sətir |
| `/imports` | `ImportsPage` | `canManageImports` | |
| `/admin/users` | `AdminUsersPage` | `canManageUsers` | |
| `*` | `NotFoundPage` | giriş | |

**Redizayn üçün nəticə:** 15 səhifə, 2 ləğv edilmiş yönləndirmə. İcazə qatı route səviyyəsindədir
(`RequirePermission`), yəni menyu da, route da eyni bayraqlara baxır — dizayn dəyişəndə bu bağlantı
qorunmalıdır.

---

## 2. Layout, sidebar və header

### Quruluş

[`src/layout/AppLayout.tsx`](frontend/bax-orders-web/src/layout/AppLayout.tsx) — 24 sətir, çox sadə:

```
<div bg-[#f5f5f3]>              ← sərt kodlanmış rəng, token DEYİL
  <Sidebar />                    ← fixed, 260px
  <div lg:pl-[260px]>            ← sidebar üçün yer, sərt kodlanmış ölçü
    <SandboxBanner />            ← yalnız test mühitində
    <Header />
    <main px-4 py-6 sm:px-6 lg:px-8>
      <Outlet />
```

### Sidebar — [`src/layout/Sidebar.tsx`](frontend/bax-orders-web/src/layout/Sidebar.tsx)

- **260px sabit en**, `fixed inset-y-0 left-0`, `lg:` altında `translate-x` ilə açılıb-bağlanır
- Mobil: qara pərdə (`bg-slate-900/50`) + bağla düyməsi
- Aktiv element **iki əlamətlə** işarələnir: dolğun fon + mavi zolaq (rəng tək qalmır — bu düzgün yanaşmadır)
- Altda: istifadəçi adı və rolu

**Problem:** sidebar tamamilə **standart Tailwind palitrasındadır** — `bg-slate-800`, `text-slate-400`,
`bg-blue-600` və bir sərt hex `bg-[#2a3649]`. Halbuki token qatında `--color-primary: #08162f` və
`--color-secondary: #0051d5` məhz bunun üçün təyin edilib. Yəni **məhsulun ən görünən elementi dizayn
sistemindən kənardadır.**

Həmçinin: `«Material panel»` alt başlığı kod içində sabit mətndir.

### Header — [`src/layout/Header.tsx`](frontend/bax-orders-web/src/layout/Header.tsx) (68 sətir)

Yan elementlər: menyu düyməsi (`lg:hidden`), `ApprovalsBell` (təsdiq növbəsinin sayı),
`CurrentUserMenu` (135 sətir — açılan menyu).

### Naviqasiya mənbəyi — [`src/layout/navigation.ts`](frontend/bax-orders-web/src/layout/navigation.ts)

10 element, hər biri `{ to, label, icon, requires? }`. **Yaxşı qurulub:** menyu məlumatı koddan ayrıdır,
ikonlar `lucide-react`-dəndir, icazə bayrağı elementin öz üstündədir. Redizaynda bu fayl olduğu kimi
saxlanıla bilər.

---

## 3. Komponent xəritəsi

```
src/
├── pages/            15 səhifə
├── layout/           AppLayout · Sidebar · Header · CurrentUserMenu · ApprovalsBell
├── components/
│   ├── (kök)         PageHeader · SectionHeader · EmptyState · StatusBadge
│   │                 SummaryMetric · WarningNote · interaction.ts
│   ├── analytics/    TrendModal · TrendChart · BasisPicker · InfoHint · format.ts
│   ├── approvals/    ApprovalRows
│   ├── catalog/      ProductCategoryRows · AssignCategoryDialog · ApplySafeDialog
│   │   └── matches/  SuggestionList · FamilyList · ApproveMatchDialog · UndoDecisionDialog
│   ├── dashboard/    ← ÜÇ NƏSİL YANAŞI
│   │   ├── (kök)     DashboardSummary · LocationRows · SpendTrend · SpendSplitBar
│   │   │             WhatChangedList · ExecutiveHeadline · ChangeDetailDrawer
│   │   ├── v2/       SimpleDashboardView · KpiRow · CategoryRanked · ChangesTable
│   │   │             ExpenseDynamics · DashboardControls        ← «Sadə baxış»
│   │   └── stitch/   KpiGrid · KpiCard · AttentionCards · ComparisonBars
│   │                 CategoryBreakdown · FilterRibbon            ← «Ətraflı baxış»
│   ├── decisions/    DriverList · CauseSummary · DecisionHeadline
│   ├── imports/      ImportGroupsTable · ImportRowsTable
│   │   └── review/   Modal · Drawer · 7 dialoq · UnresolvedList · ReadinessPanel
│   │                 PricingClassificationTab · CorrectionCenter
│   ├── locations/    LocationTrend
│   ├── orders/       ItemSourceDrawer
│   │   └── revision/ RevisionPanel · AddLineDialog · EditLineDialog · RemoveLineDialog
│   ├── reports/      MonthlyReportTable (580 sətir)
│   └── workflow/     WorkflowPanel · WorkflowDialog
├── api/              25 fayl — hər ekran üçün ayrıca modul
├── auth/             AuthProvider · RequireAuth
├── analytics/        basisParams · scope · dashboardView · useBasis
├── terminology/      terms.ts · units.ts        ← məhsulun söz lüğəti
├── coverage/ pricing/ orderLines/               ← sahə məntiqi + etiketlər
└── navigation/       useScrollMemory · monthlyReportReturn
```

### Paylaşılan primitivlərin əhatəsi

| Komponent | Neçə faylda işlənir | Qeyd |
|---|---|---|
| `Modal` (+ `Drawer`) | **23** | güclü, aşağıda |
| `PageHeader` | 12 | 15 səhifədən 12-si |
| `EmptyState` / `ErrorState` / `LoadingRows` | 11 | |
| `StatusBadge` | 6 | |
| `SummaryMetric` | 6 | |
| `WarningNote` | 2 | |
| **`SectionHeader`** | **0** | **ölü kod** — təyin edilib, heç yerdə idxal olunmur |

---

## 4. Tailwind, şriftlər, rənglər və dizayn tokenləri

### Token qatı — [`src/index.css`](frontend/bax-orders-web/src/index.css) (186 sətir)

Tailwind 4-ün `@theme` bloku ilə qurulub. **Keyfiyyəti yüksəkdir** və hər qərarın səbəbi şərhdə yazılıb:

- **Səthlər:** Material-3 adlandırması — `surface`, `surface-container-{lowest…highest}`, `on-surface`,
  `outline`, `outline-variant`
- **Primary** `#08162f` (struktur navy) · **Secondary** `#0051d5` (yalnız «bu bir iş görür» deməkdir)
  · **Tertiary** `#001b18` · **Error** `#ba1a1a`
- **Xərc qaydası — məhsulun ən vacib rəng qərarı:**
  `--color-cost-up: #be2c2c` (artan xərc = **qırmızı**), `--color-cost-down: #0d7c4c` (azalan = **yaşıl**).
  Şərhdə açıq yazılıb ki, adlar məhz `cost-up`/`cost-down`-dur ki, sonradan kimsə maketə baxıb tərsinə
  çevirməsin.
- **Şriftlər:** `Geist` (başlıqlar və rəqəmlər) · `Inter` (mətn) · `DM Mono` (yalnız «Sadə baxış» rəqəmləri).
  Google Fonts-dan [`index.html`](frontend/bax-orders-web/index.html)-də yüklənir.
- **Tipoqrafik şkala:** `display-lg` 32/40 · `headline-lg` 24/32 · `headline-md` 20/28 · `headline-sm` 16/24
  · `metric-val` 28/32 · `body-lg/md/sm` 16/14/12 · `label-md` 13 · `label-sm` 11.
  **Hər sətir hündürlüyü ölçünün ən azı 1.4 qatıdır** — səbəb şərhdə yazılıb: aşağı düşəndə `İ, Ğ, Ş, ə`
  diakritikləri kəsilir. Yalnız `label-sm` 11/14-dür və ona görə yalnız qısa böyük hərfli etiketlərdə işlənir.
- **Kölgə:** üç səviyyə, hamısı çox yumşaq — DESIGN.md «dərinlik tondan və konturdan gəlir, kölgədən yox» deyir.
- `.tabular` sinfi — pul və miqdar sütunlarında rəqəmlərin düzülməsi üçün (qlobal deyil, qəsdən).

### Əsas problem — token sistemi işlənmir

| | Token sinfi | Standart Tailwind | Sərt kodlanmış |
|---|---|---|---|
| **Rəng** | 159 | **2 043** | 4 hex |
| **Şrift ölçüsü** | 103 | **860** | 37 px |

**Yalnız 7 fayl / 112** tokenlərə tam sadiqdir — hamısı `components/dashboard/stitch/` qovluğunda
(təsdiqlənmiş Stitch dizaynı) və `DetailedDashboardView.tsx`.

Ən çox işlənən standart rənglər:

| | | | |
|---|---|---|---|
| `slate-500` 332 | `slate-200` 327 | `slate-900` 231 | `slate-700` 175 |
| `slate-600` 140 | `slate-50` 133 | `slate-100` 109 | `slate-400` 76 |
| `red-50` 52 | `red-700` 46 | `slate-800` 44 | `red-200` 43 |
| `amber-900` 33 | `amber-50` 31 | `slate-300` 29 | `amber-800` 27 |

Sərt kodlanmış hex dəyərlər (cəmi 4): `#f0f3f6` ×2, `#f5f5f3` (AppLayout fonu), `#2a3649` (sidebar aktiv fon).

Ən çox standart rəng işlədən fayllar:

| Standart / token | Fayl |
|---|---|
| 92 / 0 | `pages/OrderDetailPage.tsx` |
| 70 / 0 | `pages/AdminUsersPage.tsx` |
| 60 / 0 | `pages/PricingModeReviewPage.tsx` |
| 59 / 0 | `components/imports/review/PricingClassificationTab.tsx` |
| 59 / 0 | `components/imports/review/RowDetailDialog.tsx` |
| 56 / 0 | `components/reports/MonthlyReportTable.tsx` |

> **Nəticə:** redizaynın ən böyük işi yeni rəng seçmək deyil — **mövcud tokenləri həqiqətən işlətməkdir**.
> Token adları artıq düzgündür (`cost-up`, `surface-container`, `on-surface-variant`); problem odur ki
> komponentlər onlara baxmır. Bu, bir dəfəlik, mexaniki, amma 2 000-dən çox yerə toxunan işdir.

---

## 5. Cədvəllər, filtrlər, formalar və modallar

### Cədvəllər — ortaq komponent YOXDUR

**22 faylda 24 `<table>`.** Hər biri `<thead>/<tbody>/<th>/<td>` ilə əl ilə qurulub; sütun eni, sıralama
göstəricisi, zebra, sticky başlıq, boş vəziyyət hər yerdə yenidən yazılıb.

Cədvəl olan fayllar: `MonthlyReportTable` (580 sətir), `LocationRows`, `ApprovalRows`,
`ImportGroupsTable`, `ImportRowsTable`, `ChangesTable`, `ExpenseDynamics`, `SpendTrend`,
`ProductCategoryRows`, `CorrectionCenter`, `PricingClassificationTab`, `RowDetailDialog`,
`ConfirmationDialog`, `ItemSourceDrawer`, `TrendModal` (×2), `ProductHistoryPage` (×2),
`AdminUsersPage`, `LocationDetailPage`, `LocationsPage`, `OrderDetailPage`, `PricingModeReviewPage`,
`SuppliersPage`.

21 yerdə `overflow-x-auto` var — yəni cədvəllərin əksəriyyəti dar ekranda yana sürüşür. Bu işləyən, amma
ən sadə həlldir: mobil üçün sütun gizlətmə və ya kart görünüşü yoxdur.

### Modallar — **güclü tərəf, qorunmalıdır**

[`src/components/imports/review/Modal.tsx`](frontend/bax-orders-web/src/components/imports/review/Modal.tsx)
(298 sətir) bütün məhsulun yeganə dialoqudur və **23 fayl onu işlədir**. İçində:

- `role="dialog"` · `aria-modal="true"` · `aria-labelledby` · `aria-describedby`
- **Fokus tələsi** — klaviatura dialoqdan çıxmır
- `Escape` = «Bağla», artığı yox
- Bağlananda fokus onu açan elementə qayıdır
- Arxa səhifənin sürüşməsi bloklanır və **əvvəlki vəziyyət bərpa olunur** (dialoq üstündə dialoq açılanda)
- `dialogStack` ilə üst-üstə dialoqların idarəsi
- `dismissOnBackdrop` yalnız **oxunan** dialoqlarda açıqdır — formada təsadüfi klik yazılanı itirməsin deyə
- `placement: 'center' | 'right'` — sağ panel `sm`-dən aşağıda tam ekran olur

`Drawer.tsx` onun üzərində qurulub; `ChangeDetailDrawer`, `ItemSourceDrawer`, `TrendModal` hamısı bundan
keçir. **Öz modalını quran başqa fayl yoxdur** (sidebar-ın pərdəsi istisna).

### Formalar və giriş sahələri — ortaq komponent YOXDUR

| Element | Say |
|---|---|
| `<button>` | **183** |
| `<input>` | 60 |
| `<select>` | 23 |
| `<form>` | 15 |
| `<textarea>` | 6 |

Hamısı xam HTML elementidir — `Button`, `Input`, `Select`, `Field` kimi ortaq komponent yoxdur. Yəni hər
düymənin ölçüsü, radiusu, hover və disabled vəziyyəti ayrıca yazılıb.

**Fokus vəziyyəti:** 183 düyməyə qarşı cəmi **19 `focus:`/`focus-visible:` sinfi**. Bunların əsas hissəsi
[`src/components/interaction.ts`](frontend/bax-orders-web/src/components/interaction.ts) faylındadır —
kart və sətir səthləri üçün mərkəzləşmiş qayda (yaxşı yanaşma), amma adi düymələr onun əhatəsində deyil.

### Filtrlər

Vahid filtr komponenti yoxdur; hər ekran özünü qurur:
`DashboardControls` (196 sətir), `FilterRibbon` (stitch), `BasisPicker` (187 sətir), səhifələrin öz
`<select>`-ləri. Filtr vəziyyəti **query string-də saxlanılır** (`useSearchParams`) — bu düzgün qərardır və
redizaynda qorunmalıdır: Geri/İrəli, yenidən yükləmə və paylaşılan link eyni ekranı bərpa edir.

---

## 6. Responsiv dizayn və mobil uyğunluq

| | |
|---|---|
| Cəmi responsiv prefiks | **145** |
| Bölgü | `lg:` 74 · `sm:` 57 · `xl:` 10 · `md:` 4 |
| **Heç bir prefiksi olmayan fayl** | **60 / 112** |
| `overflow-x-auto` | 21 |

### Nə işləyir

- Sidebar `lg:` kəsimində sabitləşir, aşağıda sürüşərək açılır — düzgün qurulub
- `AppLayout` daxili boşluqları `px-4 → sm:px-6 → lg:px-8` artır
- Modal-ın sağ paneli `sm`-dən aşağıda tam ekrana keçir
- Cədvəllərin əksəriyyəti yana sürüşür

### Nə işləmir

- **60 fayl heç bir kəsim nöqtəsi tanımır.** Ən böyükləri: `LocationDetailPage` (376 sətir),
  `AdminUsersPage` (375), `CreateResolutionDialog` (352), `CauseSummary` (342), `LocationTrend` (286),
  `ImportRowsTable` (222)
- `md:` cəmi **4 dəfə** işlənib — yəni planşet aralığı praktik olaraq nəzərə alınmayıb
- Cədvəllər üçün mobil strategiya yoxdur: 15–20 sütunlu cədvəl telefonda yalnız yana sürüşür
- Qrafiklər sabit piksel hündürlüyü ilə qurulub (aşağıda), yəni ekranla ölçülənmir

---

## 7. Təkrarlanan komponentlər və UI/UX problemləri

### 7.1 Üç nəsil dashboard yanaşı yaşayır

| Qovluq | Nədir | Token işlədirmi |
|---|---|---|
| `dashboard/` | köhnə komponentlər: `DashboardSummary` (445 sətir), `LocationRows`, `SpendTrend`, `SpendSplitBar`, `WhatChangedList`, `ExecutiveHeadline` | yox |
| `dashboard/v2/` | **«Sadə baxış»** — `SimpleDashboardView`, `KpiRow`, `CategoryRanked`, `ChangesTable`, `ExpenseDynamics` | yox |
| `dashboard/stitch/` | **«Ətraflı baxış»** — `KpiGrid`, `KpiCard`, `AttentionCards`, `ComparisonBars`, `CategoryBreakdown`, `FilterRibbon` | **bəli** |

`ManagementDashboardPage` hər üç dəstdən istifadə edir. Eyni məlumat üç fərqli vizual dillə göstərilir.
Bu, redizaynın həll etməli olduğu ən böyük struktur məsələsidir.

### 7.2 Formatlayıcılar təkrarlanır

**15 ayrı `labels.ts` / `format.ts` faylı** var. Eyni iş bir neçə yerdə görülür:

| Nə | Harada |
|---|---|
| Pul | `formatMoney` (analytics/format) · `formatAmount` (imports/labels) · `formatAnalyticsAmount` (analytics/labels) |
| Miqdar | `formatQuantity` — **analytics/format.ts və imports/labels.ts, ikisində də** |
| Dövr | `formatMonth`, `formatShortMonth`, `formatMonthRange` (analytics) · `formatPeriod` (imports) · `formatAnalyticsPeriod` |

Nəticə: eyni rəqəm iki ekranda fərqli görünə bilər.

### 7.3 Qrafiklər kitabxana ilə deyil, div ilə qurulub

`recharts` asılılıq kimi quraşdırılıb, amma **yalnız bir faylda** işlənir: `analytics/TrendChart.tsx`.

Qalan bütün «qrafiklər» — `ExpenseDynamics`, `ComparisonBars`, `SpendTrend`, `SpendSplitBar`,
`LocationTrend`, `CategoryBreakdown` — `<div>`-lərdən qurulub, hündürlük isə **inline `style={{ height }}`
ilə piksel hesablanır**:

```tsx
const height = amount === null || amount <= 0 ? 0 : Math.max(4, Math.round((amount / highest) * trackHeight))
```

Bunun bir məntiqi var (şərhdə yazılıb: pulu olan ay görünməz qalmasın deyə minimum 4px), amma nəticədə:
qrafiklər ölçülənmir, token rəngləri tətbiq olunmur, və hər qrafik öz oxunu, öz etiketini, öz tooltip-ini
yenidən yazır.

### 7.4 Nisbətən xırda problemlər

- **Ölü kod:** `SectionHeader.tsx` — heç yerdə idxal olunmur
- **Sərt kodlanmış ölçü:** sidebar eni `260px` iki yerdə ayrıca yazılıb — `Sidebar.tsx` (`w-[260px]`) və `AppLayout.tsx` (`lg:pl-[260px]`); token deyil, yəni biri dəyişsə o biri geridə qalır
- **Sərt kodlanmış mətn:** sidebar-da `«Material panel»`
- **`PageHeader` 15 səhifədən yalnız 12-sində** — üç səhifə öz başlığını qurur
- **`EmptyState` 11 faylda** — qalan ekranlarda boş/yüklənir/xəta vəziyyəti ayrıca yazılıb
- **Ən böyük fayl `OrderDetailPage.tsx` — 1 024 sətir**, 92 standart rəng sinfi ilə. Redizaynda bu fayl
  ayrıca planlaşdırılmalıdır.

### 7.5 Əlçatanlıq (a11y) — qarışıq mənzərə

| Göstərici | Say | Qiymət |
|---|---|---|
| `aria-*` atributu | 210 | yaxşı |
| `sr-only` | 43 | yaxşı |
| Modal-ın tam a11y-si | var | **güclü** |
| `focus` / `focus-visible` | **19** (183 düyməyə qarşı) | **zəif** |
| `<dialog>` native elementi | 0 | öz Modal-ı ilə əvəzlənib (qəbuledilən) |

Aktiv menyu elementi rənglə yanaşı zolaqla da işarələnir — rəng tək daşıyıcı deyil. Bu düzgün yanaşmadır
və redizaynda saxlanılmalıdır.

---

## 8. Mövcud funksionallığı qorumaq üçün texniki məhdudiyyətlər

Redizayn aparan adam bunları **sındırmamalıdır**:

### 8.1 Testlər — 81 fayl, 26 424 sətir

Testlər nəyə bağlıdır:

| Bağlılıq | Say | Redizayna davamlıdırmı |
|---|---|---|
| Mətnə (`getByText`, `getByLabelText`, `name:`) | 1 990 | **bəli** — mətn dəyişməsə qalır |
| Rola (`getByRole`) | 1 137 | **bəli** — semantik HTML qalsa |
| **CSS sinfinə** (`toHaveClass`, `className`) | **375** | **xeyr — sınacaq** |
| `data-testid` | 43 | bəli |

**Nəticə:** testlərin ~89%-i vizual dəyişikliyə davamlıdır, çünki mətn və rol üzərindən yazılıb. Amma
**375 yerdə sinif adı yoxlanılır** — redizaynda bunlar yenilənməlidir. Semantik HTML (`<table>`, `<th>`,
`<button>`, `role="dialog"`) saxlanılmalıdır, yoxsa 1 137 yoxlama sınar.

### 8.2 Dəyişməməli davranışlar

| Nə | Harada | Niyə |
|---|---|---|
| **Query string vəziyyəti** | `useSearchParams` — dashboard, hesabat, filtrlər | Geri/İrəli, yenidən yükləmə və paylaşılan link eyni ekranı bərpa edir |
| **Sürüşmə yaddaşı** | `navigation/useScrollMemory.ts` | Geri qayıdanda siyahı eyni yerdən açılır; `<a>` klikindən asılıdır |
| **Modal müqaviləsi** | `Modal.tsx` | fokus tələsi, `Escape`, fokusun qayıtması, arxa sürüşmənin bloku, dialoq yığını |
| **`dismissOnBackdrop` qaydası** | `Modal.tsx` | formada arxa fona klik dialoqu bağlamamalıdır (sahib qərarı 17.2) |
| **Səth kliki qaydası** | `components/interaction.ts` | kart/sətir öz linkini açır; `a, button, input, select, textarea, label, summary` daxilindəki klik istisnadır |
| **İcazə qatı** | `RequirePermission` + `navItems.requires` | menyu ilə route eyni bayrağa baxır |
| **Xərc rəng qaydası** | `--color-cost-up` / `--color-cost-down` | **artan xərc qırmızı, azalan yaşıl** — maketə baxıb tərsinə çevirmək olmaz |
| **Sətir hündürlüyü ≥ 1.4** | `index.css` | aşağı düşsə `İ, Ğ, Ş, ə` diakritikləri kəsilir |
| **`.tabular` rəqəmlər** | `index.css` | pul sütunları düzülməlidir |

### 8.3 Texniki çərçivə

- **TypeScript `strict: true`** + `noUnusedLocals` + `noUnusedParameters` — istifadəsiz idxal buildi sındırır
- **Tailwind 4** — konfiqurasiya JS faylında deyil, `@theme` ilə CSS-dədir
- **`verbatimModuleSyntax`** — tip idxalları `import type` ilə yazılmalıdır
- Şriftlər Google Fonts-dan CDN ilə gəlir (`Geist`, `Inter`, `DM Mono`); oflayn iş tələb olunsa, bu
  ayrıca həll edilməlidir
- Dark mode **yoxdur** — əlavə ediləcəksə, token qatı buna hazırdır (adlar semantikdir), amma 2 000-dən
  çox sərt rəng sinfi buna mane olur

---

## 9. Təklif olunan iş ardıcıllığı

Audit nəticəsindən çıxan ardıcıllıq — **ən çox təsir, ən az risk** prinsipi ilə:

| # | İş | Təsir | Risk |
|---|---|---|---|
| 1 | **Ortaq primitivlər yaratmaq:** `Button`, `Input`, `Select`, `Field`, `Table`, `Card` | çox yüksək | aşağı |
| 2 | **Sidebar və AppLayout-u tokenlərə keçirmək** — ən görünən ekran elementi | yüksək | aşağı |
| 3 | **Üç dashboard nəslini birinə yığmaq** | yüksək | **orta** — funksionallıq fərqi var |
| 4 | **2 043 standart rəng sinfini tokenlərə köçürmək** (mexaniki, fayl-fayl) | yüksək | aşağı, amma həcmli |
| 5 | **Formatlayıcıları birləşdirmək** (15 fayl → 1 modul) | orta | aşağı |
| 6 | **Fokus vəziyyətlərini tamamlamaq** (19 → bütün interaktiv elementlər) | orta | aşağı |
| 7 | **Cədvəllər üçün mobil strategiya** | orta | orta |
| 8 | **Qrafikləri bir yanaşmaya gətirmək** (recharts yaxud ortaq div-qrafik komponenti) | orta | orta |
| 9 | `SectionHeader` ölü kodunu silmək | aşağı | yox |

---

## 10. Ölçmə metodikası

Rəqəmlər `frontend/bax-orders-web/src` üzərində, test faylları ayrılmaqla hesablanıb:

- **Rəng/tipoqrafiya sayımı:** `.tsx` faylları üzrə regex — token adları (`surface`, `on-surface`,
  `primary`, `secondary`, `cost-up`, …) `bg-|text-|border-|ring-|…` prefiksləri ilə; standart palitra
  (`slate|gray|red|amber|…`) + rəqəmli çalar; sərt dəyərlər `bg-[#…]` şəklində
- **Nümunə sayımı:** `<table`, `<input`, `<select`, `<form`, `<button`, `fixed inset-0`, `aria-`,
  `sr-only`, `focus:`/`focus-visible:`
- **Responsivlik:** `sm:|md:|lg:|xl:|2xl:` prefiksləri
- **Test bağlılığı:** `getByRole`/`getByText`/`toHaveClass`/`data-testid` nümunələri

Skriptlər müvəqqəti iş qovluğundadır; anbara əlavə edilməyib, çünki bir dəfəlik ölçmə üçündür.

---

*Bu sənəd yalnız analizdir. Audit zamanı heç bir fayl dəyişdirilməyib, heç bir refaktorinq aparılmayıb.*
