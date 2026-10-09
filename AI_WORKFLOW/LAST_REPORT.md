# LAST_REPORT — Task 24: Obyekt səhifəsi və aylıq hesabata qayıdış (Qərar zənciri, 8 of 8)

Coder, 2026-09-26. Spesifikasiya: `AI_WORKFLOW/TASKS/TASK-24.md` (READY, `4e6acad` üzərində yoxlanılıb). Brief:
`AI_WORKFLOW/BRIEFS/TASK-24.md`, qərarlar 24.1, 24.2, 24.3, 24.4.

Yalnız frontend-in keçidləri və görünüşü dəyişib. Backend, API, sxem, data, miqrasiya alətləri və baza dəyişməyib. Heç
bir baza əmri işlədilməyib: `psql`, `pg_dump`, `dotnet ef`, `dotnet run` və `tools/` altındakı alətlər işə salınmayıb.
Commit, push və merge edilməyib. İş boyu iş qovluğu repozitoriyanın kökü olaraq qalıb (`cd` edilməyib).

---

## 0. Git

- Budaq: `main`
- HEAD: `4e6acad3086cfc56be6c76d91e6adfb1c1183844` (Task 23-ün qəbul edilmiş commit-i)
- İşə başlayanda iş ağacı təmiz idi: yalnız izlənməyən `AI_WORKFLOW/`, `monitor-agent.ps1`, `resume-agent.ps1` və
  `run-agent.ps1` vardı.

`git status --short` (iş bitəndən sonra):

```
 M frontend/bax-orders-web/src/api/orders.ts
 M frontend/bax-orders-web/src/components/locations/LocationTrend.test.tsx
 M frontend/bax-orders-web/src/components/locations/LocationTrend.tsx
 M frontend/bax-orders-web/src/components/reports/MonthlyReportTable.tsx
 M frontend/bax-orders-web/src/pages/LocationDetailPage.test.tsx
 M frontend/bax-orders-web/src/pages/LocationDetailPage.tsx
 M frontend/bax-orders-web/src/pages/MonthlyReportPage.test.tsx
 M frontend/bax-orders-web/src/pages/MonthlyReportPage.tsx
 M frontend/bax-orders-web/src/pages/OrderDecisionPage.test.tsx
 M frontend/bax-orders-web/src/pages/OrderDetailPage.tsx
?? AI_WORKFLOW/
?? docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md
?? frontend/bax-orders-web/src/navigation/monthlyReportReturn.test.ts
?? frontend/bax-orders-web/src/navigation/monthlyReportReturn.ts
?? monitor-agent.ps1
?? resume-agent.ps1
?? run-agent.ps1
```

`git diff --stat` (izlənən fayllar):

```
 frontend/bax-orders-web/src/api/orders.ts          |   4 +-
 .../components/locations/LocationTrend.test.tsx    | 178 ++++++++++++-
 .../src/components/locations/LocationTrend.tsx     | 108 ++++++--
 .../src/components/reports/MonthlyReportTable.tsx  |  11 +-
 .../src/pages/LocationDetailPage.test.tsx          | 195 +++++++++++---
 .../src/pages/LocationDetailPage.tsx               |  67 ++---
 .../src/pages/MonthlyReportPage.test.tsx           | 292 ++++++++++++++++++++-
 .../bax-orders-web/src/pages/MonthlyReportPage.tsx |   9 +-
 .../src/pages/OrderDecisionPage.test.tsx           | 213 +++++++++++++++
 .../bax-orders-web/src/pages/OrderDetailPage.tsx   |  99 +++++--
 10 files changed, 1032 insertions(+), 144 deletions(-)
```

Yeni (izlənməyən) fayllar: `navigation/monthlyReportReturn.ts`, `navigation/monthlyReportReturn.test.ts` və əl ilə
yoxlama dəsti `docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md`.

Dəyişikliklər yalnız `frontend/bax-orders-web/src/` altındadır, üstəgəl yeni əl ilə yoxlama dəsti — spesifikasiyanın
§11-i ilə eyni. `App.tsx`, `navigation/useScrollMemory.ts`, `components/interaction.ts`, `analytics/basisParams.ts`,
`analytics/decisionParams.ts`, `components/dashboard/*`, `pages/LocationsPage.tsx`, `test/oldTerms.ts` və heç bir C#
faylı dəyişməyib. Git `LF will be replaced by CRLF` xəbərdarlığı verir; bu, əvvəlki tapşırıqlardakı kimi iş ağacının
sətir sonu parametridir, məzmun fərqi deyil.

Aşağıda fayl yolları `frontend/bax-orders-web/src/`-ə nisbətən yazılıb.

---

## 1. Obyekt səhifəsi (24.1)

`pages/LocationDetailPage.tsx`:

- **Silinən nəzarət elementləri:**
  - hər dövr sətrinin sağındakı «Sifarişə bax» və «Müqayisə» (`aria-label` «… dövrünü müqayisə et») keçidləri və onları
    saxlayan `<td>`;
  - cədvəlin boş dördüncü sütun başlığı. «Yüklənir…» və boş siyahı sətirlərinin `colSpan`-ı 4 → 3. Sütunlar indi
    `Dövr · Məbləğ · Status`-dur (:256–259, :265, :272).
- **Qalan tək keçid — dövrün adı** (:286–292):
  - `to={orderLink(request.orderRequestId, selection)}` olduğu kimi qalıb, yəni ünvan əvvəlki ilə eynidir və bazanı
    daşıyır;
  - mətni `formatPeriod(...)`, `aria-label` əlavə edilməyib, ad görünən dövrdür (fərziyyə 8).
- **Sətir Task 20-nin səthidir** (:284, `LocationRows.tsx`:99–110-dakı kimi):
  - `<tr onClick={openSurfaceLink} className={interactiveRowClass}>`;
  - dövr keçidində `{...surfaceLinkAttribute}` və `` `${rowLinkClass} ${interactiveTextClass} font-medium text-slate-900` ``.
    Sükunətdəki görünüş `font-medium text-slate-900` qalır; alt xətt artıq keçidin öz `hover:underline`-i ilə deyil,
    sətrin hover-i və keçidin fokusu ilə çıxır;
  - sətirdə başqa interaktiv element yoxdur. Status nişanı və «Əvvəlki sifariş — sonradan yenilənib» qeydi mətndir, ona
    görə onlara klik sətrin sifarişini açır. Bu, testlə yoxlanılıb (§8).
- **Kartın tək «Sifarişə bax»-ı** (`components/locations/LocationTrend.tsx`:92–97) mətn, ünvan və görünüş baxımından
  dəyişməyib. Süzgəcsiz 1-ci səhifədə o, ilk sətrin keçidi ilə eyni ünvanı açır (testlə yoxlanılıb).

## 2. «Müqayisə et» (24.2)

- Başlıqdakı `Link` (əvvəl :144–152), onun mətni və `TrendingUp` importu **silinib**. Adı dəyişdirilməyib, başqa yerə
  yönəldilməyib, deaktiv edilməyib, «tezliklə» ipucu ilə əvəz edilməyib. Başlığın tək elementi «Obyektlərə qayıt»-dır
  (:146–150).
- **Obyektlərarası müqayisə qurulmayıb:** heç bir seçici, yer tutucu, deaktiv düymə və ya ipucu yoxdur.
- Bu nəzarət elementini adlandıran iki şərh yenilənib:
  - `pages/LocationDetailPage.tsx`:90–92;
  - `api/orders.ts`-də `latestOrderRequestId`-in şərhi. Yalnız şərh dəyişib; tip və sahə qalır, API müqaviləsi
    dəyişməyib.
- **Süzgəc altında və 2-ci səhifədə nəticə (§4.2):** orada kart yoxdur və «Müqayisə et» ən son sifarişə aparan yeganə
  element idi. İndi oxucu ora «Filtri təmizlə» ilə və ya 1-ci səhifəyə qayıdaraq (kart və ilk sətir), ya da istənilən
  sətrin sifarişini açıb həmin səhifənin keçidləri ilə çatır. Bu, 24.2-nin birbaşa nəticəsidir və heç nə ilə əvəz
  edilməyib. Testlər süzgəc altında və 2-ci səhifədə səhifədəki yeganə `/orders/` keçidinin süzülmüş sətrinki olduğunu
  təsdiq edir.

## 3. Trend zolağı (24.4)

`components/locations/LocationTrend.tsx`:

- **Sifarişi olan ay** (`entry !== null`, :132–139): bütün məzmunu bir `Link`-in içindədir. `Link` `<li>`-nin yeganə
  uşağıdır:
  - `to={orderLink(entry.orderRequestId, selection)}` — sətirlər və kartla eyni ünvan forması və baza. Ay öz ən yeni
    versiyasını saxlayır (`stripSlots`, dəyişməyib), ona görə düzəldilmiş ay ən yeni versiyanı açır;
  - `aria-label` = sütunun ipucu mətni `«<Ay İl>: <məbləğ>»`; ayda qiyməti olmayan sətir varsa, davamı
    `« · N sətirdə qiymət yoxdur»` (`slotName`, :197–200) — qismən məbləğ tam kimi oxunmur;
  - siniflər: `group flex w-full flex-col items-center gap-1 hover:bg-slate-50 ${rowLinkClass}`. Keçid özü hədəfdir,
    ona görə öz fokus halqasını daşıyır (fərziyyə 10). Cari olmayan sütun siçan altında tündləşir:
    `group-hover:bg-slate-400`.
- **Sifarişi olmayan ay**: keçid yoxdur. Məzmun sadə `<div className="flex w-full flex-col items-center gap-1">`-in
  içindədir (:130); hover, kursor və fokus yoxdur. Qırıq xətli çərçivə, ipucu, «—» və ad dəyişməyib.
- **Cari ay = son sifarişin ayı** (fərziyyə 9), zolağın son yuvası (:122):
  - sütunu `bg-slate-600` (:162), adı `font-semibold text-slate-900` (:181);
  - keçiddə `aria-current="true"` (:135). Qırmızı və yaşıl istifadə edilməyib (9.1).
- **Klaviatura:** hər ay adi `<a href>`-dir, `Tab` ilə fokuslanır və `Enter` ilə açılır. Test `Tab`-ı ardıcıl basaraq
  sifarişi olan hər aya soldan sağa çatır və `Enter` ilə son ayı açır.
- **Dəyişməyənlər:** sütunların hündürlüyü, `barHeight`, 12 aylıq pəncərə, boşluq qaydası, adlar, məbləğlər,
  `MissingPriceMark`, `ol`-un «Son ayların məbləğləri» adı, müqayisə sətri və baza seçicisi. Görünən və ya oxunan heç
  bir mətndə «trend» sözü yoxdur (test `findOldTerms` ilə yoxlayır).
- **Coder-in qərarı (qeyd üçün):** spesifikasiya daxili bükücünün siniflərini `flex flex-col items-center gap-1` kimi
  verir. `w-full` əlavə etdim. Onsuz bükücü `items-center` olan `<li>`-nin içində məzmunun eninə qədər daralır və
  sütunun `w-full`-u yuvanın deyil, ən uzun yazının enini tutardı. Nəticədə sütunların eni dəyişərdi. `w-full` əvvəlki
  eni saxlayır.
- Bir yuvanın məzmunu təkrarlanmasın deyə `SlotContent` komponentinə çıxarılıb (:153–191). Keçid və boşluq eyni
  məzmunu göstərir.

## 4. Aylıq hesabata qayıdış (24.3)

- **Id-lər** (`components/reports/MonthlyReportTable.tsx`):
  - `LocationRow`-un `<tr>`-i: `` id={`row-${row.locationId}`} `` (:187);
  - `LocationCard`-ın `<li>`-si: `` id={`row-${row.locationId}-phone`} `` (:493) — panelin telefon qaydası kimi. Hər iki
    düzülüş DOM-dadır, ona görə hər biri ayrıca id alır və telefonda «Geri» gizli cədvəl sətrinə deyil, karta qayıdır.
  - Mövcud `row-` prefiksi istifadə edilib; yeni prefiks yoxdur.
- **Qoşulma** (`pages/MonthlyReportPage.tsx`:77–80):
  - `const root = useScrollMemory<HTMLDivElement>(state.status === 'success')`;
  - səhifənin fragment-i `<div ref={root}>…</div>` olub (panelin `ManagementDashboardPage.tsx`:240-dakı kimi). Hook-un
    klik dinləyicisi xana keçidlərini və ad keçidlərini görür.
  - Hazırlıq siqnalı qayıdılan ünvanın matrisi yükləndikdə doğru olur. Hook bir dəfə bərpa edir.
- **Nəticə:** «Geri» ilə qayıdanda açılan xananın (və ya adın) sətri/kartı `{ block: 'center' }` ilə ekrana gətirilir.
  Element yoxdursa, saxlanmış sürüşmə istifadə olunur. Başqa yolla gəldikdə səhifə yuxarıdan açılır (hook-un öz qaydası).
- **`navigation/useScrollMemory.ts` dəyişdirilməyib** — nə selektoru, nə alqoritmi.

## 5. Axtarış (24.3)

- Parametr **`search`** olaraq qalır, `q`-ya dəyişdirilməyib (fərziyyə 5).
- Davranış dəyişməyib: axtarış `Enter` ilə, `setParams(next, { replace: true })` vasitəsilə yazılır
  (`MonthlyReportPage.tsx`:60–71, :101–104). Yazmaq tarixçəni doldurmur; sahə ünvandan başlayır (:27).
- **Kod dəyişikliyi lazım olmadı.** Səbəb: sifarişdən «Geri» ilə qayıdanda hesabat yenidən mount olunur və sahə ünvandan
  (`useState(params.get('search') ?? '')`) başlayır. Ona görə panelin `useEffect(() => setSearchInput(search), [search])`
  sinxronu əlavə edilməyib. Testlər bunu sübut edir (§8):
  - «Novxan» yazılır, `Enter` basılır, xana açılır, «Geri» basılır: sahədə «Novxan», ünvanda `search=Novxan`, sorğu
    `{ year: undefined, search: 'Novxan' }`, sətir ekrana gətirilir;
  - «yeniləmə» (eyni ünvan yenidən render edilir): sahə, sorğu və ünvan eynidir;
  - iki axtarışdan sonra bir «Geri» hesabatdan əvvəlki səhifəyə aparır — `replace: true` tarixçəni böyütmür.

## 6. Geri keçid (24.3)

- **Modul** `navigation/monthlyReportReturn.ts` (yeni) yazılışın yeganə sahibidir:
  - `monthlyReportOrderLink(id)` → `/orders/{id}?back=monthly`;
  - `monthlyReportOrderState` → `{ monthlyReport: true }` (tarixçə işarəsi);
  - `isMonthlyReportEntry(state)` — `isProductDrawerEntry` ilə eyni formada;
  - `openedFromMonthlyReport(params)` → `params.get('back') === 'monthly'`;
  - `monthlyReportLink(year)` → `/dashboard/monthly?year={year}`, `null` üçün `/dashboard/monthly`.

  `back`-in yeganə dəyəri `monthly`-dir; başqa dəyər heç nə göstərmir. `from` istifadə edilməyib (§2.5). Modul `basis`,
  `from`, `to`, `cause` və `product`-u oxumur və yazmır.
- **Hesabatın xanası** (`MonthlyReportTable.tsx`:268–270) `monthlyReportOrderLink(cell.orderRequestId)`-ə
  `state={monthlyReportOrderState}` ilə aparır. `Cell` birdir, ona görə cədvəl də, telefon kartı da bunu daşıyır. Ad
  keçidləri, `title`, `aria-label`, siniflər və məzmun dəyişməyib.
- **Sifariş səhifəsi** (`pages/OrderDetailPage.tsx`), `openedFromMonthlyReport(params)` olduqda:
  - bir element göstərir: «Aylıq hesabat», əvvəlində `ArrowLeft` ikonu (`aria-hidden`). Adı «Aylıq hesabat»-dır.
    Görünüşü «Obyektin sifarişləri»nin boz çərçivəli siniflərinin eynisidir, ikon üçün `inline-flex items-center
    gap-1.5` əlavə olunub (:309–324);
  - başlığın elementlərindən birincidir, status nişanından əvvəl (:354–378). Sifariş yüklənməmiş də görünür;
  - `to` = `monthlyReportLink(il)`. İl sifarişin dövrünün ilidir (`Number(data.requestPeriod.slice(0, 4))`); yüklənənə
    qədər `null`. Orta düymə və `Ctrl`+klik həqiqi ünvanla yeni vərəq açır;
  - adi klikdə (əsas düymə, modifikatorsuz, emal olunmamış), `isMonthlyReportEntry(location.state)` olan qeyddə
    `preventDefault()` və `navigate(-1)` edir (:188–206). Bu, həqiqi «Geri»dir: hesabat `year` və `search` ilə qayıdır,
    sətir ekrana gəlir, tarixçədə yeni qeyd qalmır;
  - başqa qeyddə (kopyalanmış ünvan, yeni vərəq, səbəb/süzgəc/məhsul/baza seçimindən sonra) adi keçid kimi işləyib
    sifarişin ilinin hesabatını açır. Bu, yuxarıdan və axtarışsız açılır (fərziyyə 4).
- **Coder-in əlavəsi (qeyd üçün):** cüt klikdən qoruma. Birinci «Geri» çatmamış ikinci klik yenidən `navigate(-1)` edər
  və oxucunu hesabatdan da geri aparardı. Task 19-un məhsul tarixçəsinin bağlanmasındakı kimi, hər qeyd üçün bir dəfə:
  `leftForReport` ref-i `location.key` ilə müqayisə olunur (:180, :198–205). Spesifikasiya bu elementin Task 19-un
  formasını təkrarladığını deyir (§2.6); həmin forma bu qorumanı da daxil edir. Test qorumasız qırmızı idi
  (`'/elsewhere'`) və qoruma ilə yaşıldır.
- **Harada görünür:** yalnız ünvanda `back=monthly` olduqda. Bunu yalnız hesabatın xanası yazır. Səhifənin bütün
  yazıcıları (`withCause`, `withProduct`, baza seçicisi) naməlum parametrləri köçürür, ona görə səhifədə işləyərkən
  element qalır (testlə yoxlanılıb). Xəta vəziyyətində də görünür — başlığın elementi kimi, «Obyektlərə qayıt»-ın
  üstündə (:329). Spesifikasiya «beside `Obyektlərə qayıt`» deyir. Onu başlığa qoydum ki, yüklənmiş səhifədəki yerində
  olsun; bu, mənim şərhimdir.
- **Harada görünmür:** paneldən, obyekt səhifəsindən (sətir, zolaq, kart), təsdiq qutusundan və sifariş səhifəsinin öz
  keçidlərindən açılan sifarişlərdə, həmçinin `back=anything-else`, `back=Monthly` və `from=monthly` ilə. Heç bir başqa
  ekran `back` yazmır. Element `basis`, `from`, `to`, `cause`, `product`-u dəyişmir. Breadcrumb deyil və başqa yerdə
  mətn əlavə etmir.

## 7. Köhnəlmə sətri

- **Əlavə edilməyib.** `LocationOrderHistory` (`api/orders.ts`) obyektin öz `earliestPeriod` / `latestPeriod`-unu
  daşıyır. Sistem üzrə son dövr və `monthsSinceLastOrder` yoxdur. Brauzerin saatı ilə hesablamaq qadağandır, backend
  sahəsi isə §6-ya görə bu tapşırığa aid deyil.
- **Lazım olan:** `LocationOrderHistory`-yə ya sistem üzrə son dövr (bütün obyektlərin ən son sifariş ayı), ya da
  serverdə hesablanmış `monthsSinceLastOrder`. Sonrakı tapşırıq üçün qeyd edilib.

## 8. Testlər və build-lər

### Saylar

| | Əvvəl (`4e6acad`) | İndi |
|---|---|---|
| Frontend | 61 fayl / 1286 test | **62 fayl / 1340 test**, hamısı keçir |
| Backend unit | 1055 | **1055**, hamısı keçir |
| Backend integration | 800 | **800**, hamısı keçir |

Fayllar üzrə frontend fərqi (+54): `LocationTrend.test.tsx` 25 → 33, `LocationDetailPage.test.tsx` 28 → 31,
`MonthlyReportPage.test.tsx` 59 → 69, `OrderDecisionPage.test.tsx` 114 → 129, `monthlyReportReturn.test.ts` yeni, 18.

### Build-lər

- `npm run --prefix frontend/bax-orders-web build` (`tsc -b && vite build`): təmiz, xəta yoxdur. Vite yalnız `index`
  chunk-ının 500 kB-dan böyük olduğunu məlumat kimi deyir (645.49 kB). Task 23-də də belə idi (644.93 kB).
- `dotnet build BaxOrders.slnx --artifacts-path <scratchpad>/artifacts`: **Build succeeded, 0 Warning(s), 0 Error(s)**.
  İşləyən API `src/BaxOrders.Api/bin`-i kilidlədiyi üçün build sessiyanın scratchpad-ına edilib (spesifikasiya §2.8,
  §11).
- `dotnet test BaxOrders.slnx --artifacts-path <scratchpad>/artifacts`: unit **1055 / 1055**, integration **800 / 800**
  (Failed: 0).
- `npm run --prefix frontend/bax-orders-web test`: **62 / 1340** keçdi. Qoruma əlavə edilməzdən əvvəlki tam qaçış
  62 / 1339 idi, hamısı yaşıl.

### Yeni testlər

- `components/locations/LocationTrend.test.tsx`, «the strip as a way into each month» (8):
  - hər dolu ay bazası ilə öz sifarişinə aparır; keçid `<li>`-nin yeganə uşağıdır və içində `a`/`button` yoxdur;
  - düzəldilmiş ay ən yeni versiyanı açır;
  - keçidin adı sütunun ipucusudur, qiyməti olmayan ayda « · 2 sətirdə qiymət yoxdur» ilə davam edir;
  - boşluq keçid deyil, `<div>`-dir və `expectInert` ilə hərəkətsizdir;
  - yalnız son ayda `aria-current="true"`, `bg-slate-600` və qalın ad var; qırmızı/yaşıl yoxdur;
  - sütun hündürlükləri (44 / 22 / 11 / 4 px), adlar, məbləğlər və `title`-lar dəyişməyib;
  - kartda bir «Sifarişə bax»; `findOldTerms` boşdur (heç bir «trend» yoxdur);
  - `Tab` hər aya çatır, `Enter` son ayı `/orders/9?basis=last`-da açır.
- `pages/LocationDetailPage.test.tsx`, «one link per period row, and no «Müqayisə et»» (8):
  - hər sətirdə bir keçid — dövr — əvvəlki ünvanla və bazası ilə; «Sifarişə bax», «Müqayisə», düymə yoxdur; adı görünən
    dövrdür;
  - sətir səthdir (`cursor-pointer`, `data-surface-link`, fokus halqası, `group-hover:underline`, `hover:underline`
    yoxdur); məbləğ və status `expectInert`-dir;
  - məbləğə, statusa və «Əvvəlki sifariş …» qeydinə klik həmin sətrin sifarişini açır (marşrut stub-ı ilə);
  - «Müqayisə et» heç bir formada yoxdur (keçid, düymə, mətn, `aria-label`, `title`); başlıqda yalnız «Obyektlərə qayıt»,
    ikon yoxdur; kartın «Sifarişə bax»-ı ilk sətrin ünvanıdır;
  - eyni yoxluq süzgəc altında, 2-ci səhifədə və sifarişsiz obyektdə; heç bir `href`-də `/analytics` yoxdur;
  - məbləğ, status, qeyd və dövrlər hərfbəhərf eynidir.
- `pages/MonthlyReportPage.test.tsx`:
  - «the rows a reader comes back to» (3): `row-1 / row-21 / row-3` və `row-…-phone` id-ləri, hərəsi bir dəfə; hər dolu
    xana iki düzülüşdə `/orders/{id}?back=monthly`-dır, `basis` yoxdur (36 + 36); ad keçidləri `/locations/{id}`-dir;
    xananın `title`-ı və adı əvvəlki formadadır;
  - «coming back from an order» (7): açılan qeydin işarəsi `{"monthlyReport":true}`; «Geri» ilə `row-3` ekrana
    gətirilir, `scrollIntoView({ block: 'center' })` bir dəfə; telefon kartından açılanda `row-21-phone`; yeni gəlişdə
    heç nə bərpa olunmur; «Novxan» yazılır, `Enter`, xana, «Geri» — sahə, ünvan, sorğu və sətir qayıdır; «Geri» və
    yeniləmədən sonra axtarış qalır; iki axtarış tarixçəni böyütmür.
- `pages/OrderDecisionPage.test.tsx`, «the way back to the monthly report» (15):
  - başlığın birinci elementidir, adı «Aylıq hesabat», ikonu `aria-hidden`, görünüşü ikinci dərəcəlidir;
  - hesabatın açdığı qeyddə «Geri»dir: hesabat öz `search`-i ilə qayıdır (keçidin ünvanında olmayan) və sonrakı «Geri»
    hesabatdan əvvəlki səhifəyə aparır — yeni qeyd yoxdur;
  - cüt klik bir dəfə «Geri» gedir;
  - kopyalanmış ünvanda `href` `/dashboard/monthly?year=2026`-dır və klik ora aparır;
  - modifikatorlu/orta düymə klikində səhifə dəyişmir;
  - `back`-sız, `basis=avg3` ilə, `back=anything-else`, `back=Monthly`, `from=monthly` ilə və `back`-sız işarə ilə
    element yoxdur;
  - baza, səbəb süzgəci və məhsul dəyişəndə `back` qalır, element qalır və `href`-i heç birini daşımır;
  - baza seçildikdən sonra keçid adi keçiddir (`/dashboard/monthly?year=2026`);
  - sifariş yüklənməmiş görünür (`/dashboard/monthly`); xəta vəziyyətində «Obyektlərə qayıt» ilə yanaşı görünür və
    «Geri» edir.
- `navigation/monthlyReportReturn.test.ts` (yeni, 18): hər ixracın nəticəsi; `isMonthlyReportEntry` `null`, `undefined`,
  `{}`, `{ productDrawer: true }`, `{ monthlyReport: 'true' }` və sətir üçün `false`-dur; `openedFromMonthlyReport`
  yalnız `back=monthly`-ni tanıyır.
- `terminology/oldTerms.test.tsx` dəyişməyib və keçir (obyekt səhifəsi, hesabat və sifariş səhifəsi).

### Dəyişdirilmiş mövcud testlər (hər biri səbəbi ilə)

Heç bir gözlənti zəiflədilməyib. Silinən elementin testi onun yoxluğunun testinə çevrilib.

- `LocationDetailPage.test.tsx`:
  - :197 (indi :202) — başlıqlar `['Dövr', 'Məbləğ', 'Status', '']` → `['Dövr', 'Məbləğ', 'Status']`. Səbəb: boş
    dördüncü sütun iki silinən düymə ilə birlikdə getdi (24.1).
  - «keeps it on every link out of the page» (:329–357) — dörd «Sifarişə bax», «Müqayisə et» və sətir «Müqayisə»ləri →
    kartın bir «Sifarişə bax»-ı, üç dövr keçidi, zolağın iki ayı; səhifədəki **hər** `/orders/` keçidi (6) hələ də
    `?basis=avg3` daşıyır. Səbəb: 24.1, 24.2. Bazanın hər keçiddə qalması şərti genişlənib, zəifləməyib.
  - «"Müqayisə" opens the order's analysis» bloku (:401–470) → «one link per period row, and no «Müqayisə et»». Onun
    süzgəc, 2-ci səhifə, sifarişsiz obyekt və `/analytics`-siz ssenariləri saxlanılıb, indi yoxluğu yoxlayır. Səbəb:
    24.1 və 24.2 11.1-in həmin elementlərini silir; 11.1-in «ayrıca müqayisə səhifəsi yoxdur» qaydası qalır.
  - :483 (indi :596) — süzgəc altında kart olmayanda «Sifarişə bax»-ı gözləmək → dövr keçidini gözləmək. Səbəb: sətirlərin
    «Sifarişə bax»-ı yoxdur; dövr keçidləri yüklənmə bitəndə görünür, gözləmənin mənası eynidir.
- `LocationTrend.test.tsx` — `slots()` köməkçisi (:111–116) `slot.children` əvəzinə `slot.firstElementChild!.children`
  oxuyur. Səbəb: yuvanın məzmunu bir səviyyə aşağıdadır — keçidin və ya `<div>`-in içində. Köməkçinin gözləntiləri
  dəyişməyib.
- `MonthlyReportPage.test.tsx` — sabitlənmiş xana ünvanları: :169, :319, :622, :778, :830, :870 →
  `…?back=monthly`. :320-dəki yoxlama (`basis` yoxdur) qalır. Səbəb: §4.6.
- `MonthlyReportPage.test.tsx`-in yeni «coming back from an order» blokunda hər testdən əvvəl
  `window.sessionStorage.clear()` çağırılır. Səbəb: `MemoryRouter`-in ilk qeydinin açarı həmişə `"default"`-dur və
  sürüşmə yaddaşı açar üzrə sessiyada saxlanılır. Təmizləməsiz bir testin yadda saxladığı yer növbəti testdə bərpa
  olunurdu (əvvəlcə 4 test buna görə qırmızı idi: `scrollIntoView` 2 dəfə çağırılırdı). Bu, yalnız test izolyasiyasıdır;
  heç bir gözlənti dəyişməyib.

## 9. Əl ilə yoxlama dəsti

- Fayl: `docs/audits/2026-qerar-zenciri/24-obyekt-ve-qayidis.md`, `23-menbe-aciilisi.md`-nin formasında. Yoxlamalar
  **H-01 … H-17**. Hər biri on iki sətirlikdir, nəticə sətri `---- operator doldurur ----`-dur.
- Əhatə:
  - H-01, H-02: başlıq və sətirlər;
  - H-03: sətir səthi — hover, fokus, məbləğə klik;
  - H-04: kartın «Sifarişə bax»-ı;
  - H-05: süzgəc və 2-ci səhifə, §4.2-nin nəticəsi;
  - H-06 … H-10: zolaq — keçid, boşluq, düzəldilmiş ay (sınaqda), cari ay, klaviatura;
  - H-11, H-12: matrisə qayıdış — yuxarı, orta və aşağı sətirlər, geniş ekran və `390×844`;
  - H-13: axtarış, «Geri» və yeniləmə;
  - H-14 … H-16: geri keçid — «Geri» yolu, səbəbdən sonra və kopyalanmış ünvanda ehtiyat keçid, paneldən və obyekt
    səhifəsindən açılanda yoxluğu;
  - H-17: bir dövrlü obyekt («Sınaq obyekti 2», sınaq).
- Enlər: `1366×768 · 1440×900 · 390×844 · 1200×800`. Şəkillər `<ID>-<ekran>-<en>.png`.
- **`1366×768`-də üfüqi sürüşmə:** dəst H-11-də operatordan bunu mütləq yazmağı istəyir. Kodda cədvəlin sürüşmə qutusu
  yalnız 1064 pikseldən dar pəncərədə yaranır (`MonthlyReportTable.tsx`:103). Gözlənilən: sürüşmür. Bu, Task 12-nin
  qəbul edilmiş davranışıdır və dəyişdirilməyib.
- API-ni yenidən başlatmaq lazım deyil.
- **Coder brauzerdə heç bir yoxlama aparmayıb.** Dəst hazırlanıb, icra edilməyib.

## 10. Toxunulmayanlar

- Obyekt səhifəsinin və hesabatın bütün rəqəmləri, `Cəmi` sətri və `İl cəmi` sütunu.
- Matrisin anomaliya rəngləri, leqendası, status nöqtələri, `describe()`, hər xananın `title`-ı və adı. Test birinin
  `title`-ını hərfbəhərf başlanğıcla və adın `<obyekt> · <title>` formasında qaldığını yoxlayır. Mövcud 8.2, 9.1 və 22b
  testləri dəyişmədən keçir.
- Matrisin və telefon kartının obyekt adı keçidi `/locations/{id}`.
- `useScrollMemory`-nin selektoru və alqoritmi; panelin `row-…`, `row-…-phone` və `attention-…` id-ləri.
- Task 20-nin qaydası, sinifləri və `openSurfaceLink` — yenidən istifadə olunub, dəyişdirilməyib.
- `basis` (`from`, `to` ilə), Task 18-in `cause`-u, Task 19-un `product`-u və `productDrawer` işarəsi.
- Hesabatın `search` və `year` parametrləri və onların `replace: true` davranışı.
- Kart, müqayisə sətri, baza seçicisi və «Obyektlərə qayıt».
- 9.1, Task 2-nin qiymət sözləri, 5.1-in sözləri, 22a/22b-nin `OrderStatusBadge`-i və 23-ün yığılmış `Sətirlər`-i.
- 11.1: ayrıca müqayisə səhifəsi yoxdur, `/analytics` keçidi yoxdur (testlə yoxlanılıb).
- Backend, sxem, data, baza — dəyişməyib. HD-002-nin 94 sətrinə toxunulmayıb.

## 11. Sonrakı tapşırıqlar üçün qeydlər

- **Köhnəlmə siqnalı:** `LocationOrderHistory`-yə sistem üzrə son dövr və ya `monthsSinceLastOrder` lazımdır (§7).
  Onsuz «N aydır yeni sifariş yoxdur» sətri brauzerin saatına söykənərdi.
- **`LocationsPage.tsx`** (Obyektlər kataloqu) — `TASKS/TASK-20.md` §12-nin qeydi hələ açıqdır:
  - yalnız hover-li sətir (`4e6acad`-də :156);
  - sətir başına iki keçid (:158, :212–218; «Bax» təkrarı).

  Bu brief onu əhatə etmir və toxunulmayıb.
- **Ehtiyat keçid axtarışı itirir (fərziyyə 4):** səbəb, süzgəc, məhsul və ya baza seçildikdən sonra «Aylıq hesabat»
  hesabatı ilin əvvəlindən, axtarışsız açır. Brauzerin «Geri»si hər ikisini bərpa edir. Tarixçə addımlarını saymaq və
  ya hesabatın bütün sorğusunu sifarişin ünvanında daşımaq alternativlər idi; ikisi də rədd edilib (spesifikasiya).
- **Köhnəlmiş şərh (tapıldı, düzəldilmədi):** `App.tsx`:76–80, `RetiredComparisonRedirect`-in şərhi hələ də «each one's
  "Müqayisə" opens that order's analysis» deyir. Sətirlərin «Müqayisə»si Task 24-də silindi. Yalnız şərhdir, davranışa
  təsiri yoxdur. `App.tsx` spesifikasiyanın dəyişən fayllar siyahısında olmadığı üçün toxunmadım.
- **Test mühiti:** `useScrollMemory` sessionStorage-də `location.key` ilə saxlayır, `MemoryRouter`-in ilk qeydi isə
  həmişə `"default"`-dur. Səhifəni «Geri» ilə yoxlayan gələcək testlər bir faylda bir-birinə təsir etməsin deyə
  sessionStorage-i təmizləməlidir (§8).
- Task 23-dən qalanlar (24-ə aid deyil, toxunulmayıb): `SectionHeader.tsx` istifadə olunmur; `orderStatusLabels`
  təkrardır; Task 15-in `04-sandbox.md` 6-cı addımı. HD-009 sahibindədir.

READY_FOR_REVIEW
