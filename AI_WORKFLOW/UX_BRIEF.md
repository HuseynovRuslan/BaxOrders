# Rəhbər ekranının yenidən dizaynı

**28 sentyabr 2026** · sahibin brifinqi · baza `0f7fbff`

Rəhbərin sözü: «Çox qarışıqdır. Rəqəm çoxdur. Oxumaq yorur.»

Problem məlumatın azlığı deyil — **eyni anda görünən bərabər çəkili elementlərin çoxluğu**dur. Məqsəd:
**BAX → ANLA → DETALA KLİKLƏ**, «hamısını oxu → şərh et» deyil.

Qayda: **bir vizual element = bir əsas mesaj.**

---

## Faza A — mövcud vəziyyət

### Nə yaxşıdır və saxlanılır

| | |
|---|---|
| Analitik məntiq | `MonthlyComparisonPopulation`, kohort bölgüsü (`PortfolioCohort`), dekompozisiya və məhsul sürücüləri düzgündür — **yenidən yazılmır** |
| Kohort dürüstlüyü | müqayisə hər iki tərəfdə eyni obyekt dəsti üzərindədir; bu, silinmir |
| Sürücü siyahısı | `DriverList` UX-i sahibin xoşuna gəlir — **qorunur**, yalnız dərinliyə köçür |
| Növ ayrımı | aylıq / aylıqdan kənar / təsnif edilməyən artıq oxu modelindədir |
| Məhsul tarixçəsi | yeni və sadədir, toxunulmur |

### Nə ağırdır

| element | ölçü | problem |
|---|---|---|
| `DashboardSummary` | 445 sətir | başlıqda məbləğ + kohort + bölgü + çiplər bir yerdə |
| `AttentionSection` | 278 sətir | altı böyük kart, hər birində delta + faiz + cari məbləğ + səbəb + töhfə faizi |
| `BasisPicker` | — | beş seçim böyük düymə kimi, ekranın yuxarısını tutur |
| `LocationRows` | 375 sətir | 27 obyektin tam cədvəli, defolt olaraq açıq |
| Aylıq hesabat | — | 12×27 matrisin üstündə **üç bərabər çəkili nəhəng rəqəm** |

Defolt ekranda rəhbər eyni anda ~40 rəqəm görür.

---

## Qərar

### 1. Əhatə seçicisi (Faza B)

`[ Aylıq sifarişlər ] [ Aylıqdan kənar ] [ Hamısı ]` — defolt **Aylıq sifarişlər**.

Bu seçici **analitik populyasiyanı** təyin edir və **eyni zehni model** həm paneldə, həm aylıq hesabatda işləyir.

Semantika:

| əhatə | nə deməkdir | müqayisə olunurmu |
|---|---|---|
| Aylıq sifarişlər | təkrarlanan aylıq tələb | **bəli** — tələb müqayisəsi mənalıdır |
| Aylıqdan kənar | plandan kənar faktiki xərc | **xərc kimi bəli**, tələb kimi yox — sözlər buna uyğundur |
| Hamısı | ümumi faktiki xərc | müqayisə göstərilir, amma **«aylıq tələb» adlandırılmır** |

«Hamısı» seçiləndə başlıq **«Ümumi faktiki xərc»**dir. Təsnif edilməyən sətirlər yalnız «Hamısı»-ya girir —
aylıq analitikaya heç vaxt.

**Arxa tərəf:** `MonthlyComparisonPopulation.OnlyMonthly()` → `InScope(AnalyticsScope)`. Bir çağırış yeri
dəyişir (`ManagementDashboardQueries.SnapshotsAsync`), qalan hesablama toxunulmur. Aylıq hesabatda
`MonthlyReportQueries` seçilmiş tərəfi oxuyur. **Yeni hesablama yazılmır.**

### 2. Sadə / Ətraflı baxış (Faza E)

`[ Sadə baxış ] [ Ətraflı baxış ]` — defolt **Sadə**.

**Sadə baxış:** dövr · əhatə seçicisi · üç KPI · kompakt müqayisə seçimi · aylıq/kənar nisbəti · kiçik trend ·
ən böyük üç dəyişiklik.

**Ətraflı baxış:** bugünkü hər şey — zəngin müqayisə seçiciləri, tam sürücü siyahısı, dekompozisiya, 27 obyektin
cədvəli, faizlər, çiplər. **Heç bir imkan silinmir**, sadəcə bir səviyyə dərinə keçir.

### 3. Üç KPI, hər birində bir rəqəm (Faza C)

| kart | dominant rəqəm | etiket |
|---|---|---|
| 1 | `71 210 ₼` | Bu ay |
| 2 | `↑ 41 096 ₼` | Keçən aya görə |
| 3 | `24 / 27` | Sifariş olan obyekt |

Faiz ikinci dərəcəlidir — mütləq məbləğlə rəqabət aparmır.

### 4. Aylıq / aylıqdan kənar nisbəti

Kiçik iki-zolaqlı vizual. Məqsəd: **nisbəti oxumadan görmək**. Böyük kart yaradılmır.

### 5. Trend

Son 6 dövr, **bir seriya** — əhatə seçicisinə tabe. Bir seriya olduqda leqenda yoxdur.

### 6. «Nə dəyişdi?» — ən böyük üç (Faza D)

Böyük kartlar əvəzinə sıralanmış kompakt siyahı. Hər sətirdə **yalnız**: istiqamət · obyekt · bir dominant
delta · bir qısa səbəb · sadə zolaq.

Səbəb sözləri menecer dilində: «Yeni məhsullar», «Daha çox sifariş verilib», «Qiymət artıb», «Bəzi məhsullar bu
ay sifariş edilməyib».

Sətrə klik → **sağ tərəfdən açılan panel**: cari məbləğ, müqayisə, faiz, yeni/əskik məhsullar, miqdar və qiymət
təsiri, töhfə faizləri, məhsul sürücüləri, məhsul tarixçəsinə keçid. **Mövcud dekompozisiya məntiqi burada
qorunur.**

### 7. Aylıq hesabat (Faza F)

Eyni əhatə seçicisi. Seçim mənanı təyin etdiyi üçün **üç nəhəng rəqəm birə enir**; qalan ikisi kompakt kontekst
kimi qalır. Matris, fərqlər, ortalamalar və «Qeyri-adi ay» seçilmiş əhatəyə tabedir.

### 8. Rəng və iyerarxiya (Faza G)

Qırmızı = xərc artıb · yaşıl = xərc azalıb · kəhrəba = xəbərdarlıq · neytral = yoxluq. **Yalnız vacib dəyər
güclü rəng daşıyır.** İyerarxiya: məbləğ → istiqamət → obyekt → səbəb → detal.

---

## Toxunulmayan biznes qaydaları

- Aylıq müqayisə **yalnız aylıq sətirlər** üzərindədir.
- Aylıqdan kənar faktiki xərcdir, **normal tələb analitikasını təhrif etmir**.
- Təsnif edilməyən **heç vaxt səssizcə aylıq analitikaya girmir**.
- `ResponsiblePerson`, `DriverList` semantikası, məhsul tarixçəsi, idxal axını, provenans və audit hadisələri
  geriyə getmir.

## Ölçü

Sonda hər ekrana baxıb soruşulur: **«Rəhbər bunu 3 saniyəyə başa düşə bilər?»** Cavab «yox»-dursa, sadələşdirmə
davam edir — imkanı silməklə yox, qarşılıqlı əməliyyatın arxasına keçirməklə.
