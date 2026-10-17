# 01 — Audit: dashboard kartlarının detalları

**Tarix:** 2026-10-17 · **Mərhələ:** 1 — Audit (`AI_WORKFLOW/DESIGN_WORKFLOW.md`) · **Kim:** senior-product-designer (audit rejimi)
**Əsaslanır:** `UI_CODE_AUDIT.md` (§4, §5, §7.1, §8.2) · `AI_WORKFLOW/UX_BRIEF.md` · `DECISIONS.md` D-50, D-51, D-52 ·
`DESIGN/2026-10-15-ui-v2-ayliq-hesabat/` (03-ux §3.2, §3.4, §4.7, §6.9; 04-visual §5.6; 06-implementation, D mərhələsi) ·
kod və backend DTO (`fayl:sətir`) · UI/UX Pro Max (axtarış) və Frontend Design bacarıqları.
**Necə yoxlanıb:** yalnız kod, testlər və backend. **Tətbiq işə salınmayıb, brauzerdə yoxlanmayıb.** Dashboard-un ekran şəkli repoda yoxdur (`qa/`-dakı şəkillər yalnız «Aylıq hesabat»a aiddir). Kontrast rəqəmləri Tailwind 4-ün standart rənglərindən hesablanıb, ekranda ölçülməyib. Heç bir fayl dəyişməyib.

> **2026-10-17: O-1…O-4 sahib tərəfindən təsdiqləndi; plan buna uyğunlaşdırıldı.**
>
> **Yeniləndi: 2026-10-17 — sahibin qərarları ilə (Drawer yox, kartların altında yerində açılan bölmə).**
> Köhnə tövsiyə **A (sağ panel) — sahib rədd etdi:** o, əvvəlcədən bildirilmiş «sağdan açılan panel istəmirəm» tələbinə zidd idi və audit bu tələbi nəzərə almamışdı. Tövsiyə **B**-yə keçdi. §2–§4 (sübutlu tapıntılar) dəyişməyib; §1, §5 (işarələr), §6–§9 yenidən yazılıb. Bu yeniləmədə yalnız aşağıdakı fayllar əlavə oxunub: `KpiRow.tsx:20-60`, `SimpleDashboardView.tsx` (blokların sırası), `ManagementDashboardPage.tsx:286-356`, `dashboardView.ts`; backend və qalan kod yenidən araşdırılmayıb (§2–§4-ə güvənilir).

Sahibin yeniləmə sözü (sözbəsöz):

> Vacib düzəliş: Mən sağdan açılan panel (Drawer) istəmirəm. Bu, əvvəlcədən bildirdiyim tələbdir. Ona görə A variantını tövsiyə etmə. Əsas seçim: Kartlara klikləyəndə detallar KPI kartlarının altında, eyni səhifədə açılsın. Yalnız bir kartın detalları açıq qalsın. Mövcud 01-audit.md sənədindən istifadə et. Frontend və backend-i yenidən tam araşdırma. Mənim qərarlarım: S-1: Hələlik obyekt-obyekt səbəblər. S-2: Maliyyə yekunları serverdə qalsın. S-3: Ayrı cəmlər sonrakı mərhələyə. S-4: Yalnız Sadə baxış. S-5: Mövcud ortaq komponentlərə uyğun davran. S-6: Həqiqi ən böyük 5-i göstərmək üstünlükdür. Tapşırıq: 1. Yerində açılan detal bölməsinin UX həllini dəqiqləşdir. 2. Layout sıçramasını minimuma endir. 3. URL, geri düyməsi, mobil görünüş və uzun siyahıları nəzərə al. 4. Mövcud audit sənədini bu qərara uyğun yenilə. 5. Konkret icra planını təqdim et. 6. Kodu dəyişmə.

İlkin tapşırıq (sözbəsöz):

> BaxOrders dashboard-undakı 4 statistika kartının UI/UX dizaynını audit et. Məqsəd: İstifadəçi kartı klikləyəndə həmin göstəricinin detalları açılmalıdır. Məsələn, "Fərq" kartında fərqlərin haradan yarandığı görünməlidir. Şərtlər: Mövcud dashboard dizaynını və komponentlərini araşdır. Ən uyğun 3 drill-down UX variantını müqayisə et. Rəhbərlik üçün ən rahat variantı seç və səbəbini izah et. Mobil və desktop istifadəni nəzərə al. UI/UX Pro Max və Frontend Design bacarıqlarından uyğun olanları istifadə et. Əvvəlki auditləri oxu, eyni işi təkrarlama. Hələ kodu dəyişmə. Yekunda konkret dizayn təklifi və icra planı təqdim et.

---

## 1. Bir baxışda

- 4 kart `/dashboard` səhifəsindədir, «Sadə baxış»da (açılış görünüşü): `components/dashboard/v2/KpiRow.tsx`. Bu gün heç biri kliklənmir.
- Detalların çoxunu mövcud API artıq verir:
  - fərqi obyekt-obyekt;
  - hər obyektin əsas səbəbini;
  - müqayisədən kənar qalan və sifariş verməyən obyektləri.
- **API-nin vermədikləri:** bütün şirkət üzrə «qiymət / miqdar / yeni məhsul» bölgüsü və kateqoriya üzrə fərq. Bunları brauzerdə toplamaq qadağandır. Bu backend işidir; sahibin qərarı (S-1): hələlik obyekt-obyekt səbəblər, şirkət üzrə bölgü sonrakı mərhələdə.
- **Tövsiyə — Variant B (sahibin seçimi):** karta klik həmin kartın detallarını kart cərgəsinin dərhal altında, eyni səhifədə açır. Eyni anda yalnız bir kart açıqdır; eyni karta təkrar klik bağlayır. Drawer və ya sağ panel yoxdur. «Fərq» bölməsində obyektlər fərqin ölçüsünə görə düzülür, obyekt sətri öz yerində açılaraq səbəblərini göstərir. Vəziyyət URL-dədir, «Geri» bölməni bağlayır. Sıçrayış risklərinin həlli §7.3-dədir.
- Köhnə tövsiyə A (sağ panel) — **sahib rədd etdi** (§6).
- Kartlardan əvvəl iki problem düzəlməlidir:
  - «Fərq»in yaşıl rəngi demək olar ki, oxunmur (≈2,2:1);
  - «Məbləğ dəyişiklikləri» siyahısı adının vəd etdiyi «ən böyük 5»-i həmişə göstərmir.

## 2. Mövcud vəziyyət

**Ekran.** `/dashboard` (`App.tsx:31`), menyuda «İdarəetmə paneli» (`layout/navigation.ts:27`). Route-un icazə şərti yoxdur: Rəhbər, Koordinator və Administrator eyni ekranı görür. Səhifə `pages/ManagementDashboardPage.tsx`-dir, «Sadə baxış» defoltdur (`:95`, `:300-314`).

**Başqa namizədlər (hədəf deyil):**
- «Ətraflı baxış»ın `stitch/KpiGrid.tsx`-i də 4 kartdır, amma orada «Fərq» kartı yoxdur. Kartlar: məbləğ · sifariş verən obyektlər · müqayisəyə daxil · aylıqdan kənar.
- KpiGrid-in dördüncü kartı bu gün açılan yeganə kartdır: `OutsideMonthlyPanel`-i açır (`KpiGrid.tsx:182-196`).
- «Aylıq hesabat»ın zolağında 3 rəqəm var (D-50 №3).

| # | Kart | Nə göstərir | API sahəsi | Kod |
|---|---|---|---|---|
| 1 | `scopeAmountLabels[scope]` — «Aylıq sifarişlərin məbləği» / «Aylıqdan kənar xərclər» / «Ümumi faktiki xərc» | ayın məbləği; qiymətsiz sətir qeydi | `summary.current.knownAmount`, `missingPriceItemCount` | `KpiRow.tsx:58-67` |
| 2 | «Müqayisə dövrü · {qayda}» | kohortun orta baza ayı; ay aralığı | `summary.baseline.knownAmount`, `baselinePeriods` | `:75-88` |
| 3 | «Fərq» | fərq, faiz, «xərc artıb/azalıb», «N obyekt üzrə — M obyekt daxil deyil» | `knownAmountDelta`, `knownAmountPercentChange`, `locationsWithComparison` | `:97-125` |
| 4 | «Aktiv obyektlər» | «24 / 27 obyekt»; «N obyektdə sifariş yoxdur» | `locationsWithCurrentRequest`, `locationCount`, `locationsWithoutCurrentRequest` | `:127-140` |

**API.** Bir sorğu: `GET /api/v1/dashboard?period&basis&scope&…` (`DashboardController.cs:60`; `api/dashboard.ts:382-405`). Cavabın hissələri:
- `summary` — həmişə bütün şirkət üzrədir, axtarış və süzgəc ona təsir etmir (`DashboardDtos.cs:213-216`);
- `attention` — ən çox 8 obyekt (`ManagementDashboardQueries.cs:35`);
- `rows` — süzülmüş cədvəl, 100-lük səhifə.

Detal üçün ən vacibi `summary.partition`-dur. Orada hər obyekt dörd qrupdan birindədir: müqayisə olunan, bu ay sifarişsiz, bazasız, tarixçəsiz. Hər obyektin öz bu ay / baza / fərq məbləği var (`api/dashboard.ts:172-203`). Server təsdiqləyir ki, müqayisə olunan obyektlərin fərqlərinin cəmi dəqiq «Fərq»ə bərabərdir (`PortfolioCohort.cs:99-103`). Yəni obyekt siyahısı kartla qəpiyinə qədər uyğun gəlir.

**Bu günkü klik.** Kartlar sadə `<section>`-dur (`KpiRow.tsx:50`). Detal başqa yerdən açılır: «Məbləğ dəyişiklikləri»ndə «Ətraflı» düyməsi `ChangeDetailDrawer`-i açır (`ManagementDashboardPage.tsx:312`, `:336-344`). Panelin açıq olması URL-də saxlanmır (`:115`).

## 3. Tapıntılar

### İstifadəlilik

| ID | Ciddilik | Tapıntı | Sübut |
|---|---|---|---|
| U-1 | **S2** | «Sadə baxış»da fərqin mənbəyi tapılmır. Kart «M obyekt müqayisəyə daxil deyil» deyir, amma hansılar olduğunu demir. Rəhbər «kart 1 − kart 2 ≠ kart 3» görür, səbəbi isə yalnız «Ətraflı baxış»dadır (`DashboardExceptions`). | `KpiRow.tsx:106`, `:118-122`; `DashboardSummary.tsx:398-440`; `DetailedDashboardView.tsx:165` |
| U-2 | **S2** | «Məbləğ dəyişiklikləri» «ən böyük məbləğ dəyişiklikləri» deyir, amma 5 obyekti `attention`-dan seçir. Orada hər istiqamətdən ən çox 2 obyekt, üstəlik faiz və xəbərdarlıq kartları var. Üç ən böyük dəyişiklik eyni istiqamətdədirsə, üçüncüsü siyahıdan düşə bilər, kiçik fərqli «faiz» obyekti isə görünər. «Fərq» paneli bütün siyahını göstərəndə bu iki yer bir-birinə zidd çıxacaq. Kodla sübut olunur; real ayda baş verib-vermədiyi yoxlanmayıb. | `ChangesTable.tsx:28-31`, `:46`; `ManagementDashboardQueries.cs:35-38`, `:387-429` |
| U-3 | S3 | Obyekt paneli URL-də deyil: «Geri» paneli bağlamır, səhifədən çıxarır; panel açıq linki paylaşmaq olmur. Bu, «Aylıq hesabat»ın təsdiqlənmiş `cell` qaydasına və CLAUDE.md-nin «görünüş vəziyyəti query string-də saxlanır» qaydasına uyğun deyil. | `ManagementDashboardPage.tsx:115`; 03-ux §3.2, §3.4 |
| U-4 | S3 | Kart klik vəd etmir: kursor, işarə, hover yoxdur. İki baxışda eyni məna fərqli işləyir: «Ətraflı»da bir kart açılır, «Sadə»də heç biri açılmır. | `KpiRow.tsx:50`; `KpiGrid.tsx:187-195` |

### Vizual

| ID | Ciddilik | Tapıntı | Sübut |
|---|---|---|---|
| V-1 | **S2** | «Fərq» rəngləri oxunmur. `text-green-500` ağ fonda ≈2,2:1-dir, halbuki 28 px qalın mətn üçün də 3:1 lazımdır. Faiz nişanı yaşılda ≈2,1:1, qırmızıda (`red-500`/`red-50`) ≈3,6:1-dir; 12 px üçün 4,5:1 lazımdır. «xərc artıb» (`slate-400`) ≈2,6:1-dir. Məhsulun ortaq 9.1 köməkçisi (`red-700`/`emerald-700`) işlənmir. Eyni nişan `ChangesTable`-da da var. | `KpiRow.tsx:102-103`, `:112`, `:116`; `ChangesTable.tsx:89-91`; `format.ts:324-351`; 04-visual (`costDirection*`) |
| V-2 | S3 | Etiketlər böyük hərflə yazılıb (`uppercase`): «İ, Ə, Ş» sıxlaşır, oxumaq yavaşlayır; Frontend Design də bunu şablon əlaməti sayır. Rəqəmdə `leading-none` 1.4 qaydasını pozur. Stock rənglər və `#f0f3f6` işlənir, tokenlər yox (UI_CODE_AUDIT §4, §7.1 — təkrar etmirəm). | `KpiRow.tsx:51-52`, `:84`, `:103` |
| V-3 | S4 | Dörd kartın çəkisi bərabərdir, UX_BRIEF isə «bir əsas rəqəm» deyir. Bu işin əhatəsində dəyişmir — yalnız qeyddir. | UX_BRIEF §3 |

### Kod

| ID | Ciddilik | Tapıntı | Sübut |
|---|---|---|---|
| K-1 | S3 | Yaxın komponentlərdə brauzer pul toplayır və faiz hesablayır; yeni panellər bunu **təkrarlamamalıdır**. Yerlər: obyekt panelində artım/azalma cəmi və pay faizi; «Kateqoriya üzrə bölgü»də «Digər» cəmi (məbləğsizi 0 sayır); «Ətraflı»da obyekt payı %. Bunlar əvvəlki qərarlarla (7.1/7.1a) qurulmuş ola bilər **[Fərziyyə]** — S-2. | `ChangeDetailDrawer.tsx:131-132`, `:161`; `terms.ts:151-164`; `CategoryRanked.tsx:26`, `:90`; `KpiGrid.tsx:86` |
| K-2 | S3 | Dashboard üç vizual nəsildən ibarətdir (UI_CODE_AUDIT §7.1). Yeni panel dördüncü vizual dil olmamalıdır: `Drawer` + «Aylıq hesabat» panelinin təsdiqlənmiş tipoqrafiyası (04-visual §3, §5.6). | — |
| K-3 | S4 | Kənar qalan obyektlərin sayı brauzerdə çıxma ilə tapılır, halbuki serverin adlı siyahısı (`partition.noBaseline`) var. | `KpiRow.tsx:106` |

## 4. Hər kart: rəhbərin sualı və detal

| Kart | Rəhbərin sualı | Detal göstərir — API-dən olduğu kimi | API vermir |
|---|---|---|---|
| **1 · Məbləğ** | «Bu pul hara gedib?» | Növ tərkibi: aylıq / aylıqdan kənar / təsnif edilməyib (`summary.lineTypes`). Kateqoriyalar serverin sırası və öz «Digər» sətri ilə, brauzerdə qatlanmadan (`summary.categories`). Obyektlər bu ayın məbləğinə görə (`partition.*[].currentKnownAmount`; `null` = sifariş yoxdur). Qiymətsiz sətir sayı. «Aylıqdan kənar» növündə — sətirlər (`GET /dashboard/outside-monthly`, mövcud panelin məzmunu). | Kateqoriya × obyekt kəsişməsi |
| **2 · Müqayisə dövrü** | «Nə ilə müqayisə edirik, ədalətlidirmi?» | Qayda və aylar (`basis`, `baselinePeriods`); neçə obyekt müqayisədədir (`partition.compared`); obyekt-obyekt baza məbləği (`baselineKnownAmount`); natamam tarixçəli obyekt sayı (`locationsWithPartialHistory`). | Kohortun ay-ay baza məbləği. `trend` bütün şirkət üzrədir, kohort üzrə deyil — onu baza kimi göstərmək olmaz. |
| **3 · Fərq** | «Fərq haradan yaranıb?» | (a) Fərq aşağıdakı N obyektin fərqlərinin cəmidir — bunu server deyir, UI toplamır. (b) Obyektlər: xərci artanlar və azalanlar, hər biri fərqin ölçüsünə görə (`partition.compared[].knownAmountDelta`). (c) Hər obyektin əsas səbəbi (`rows[].primaryCause`, `causeHeadline`); klikdə obyektin bütün dekompozisiyası: səbəblər, ən çox təsir edən məhsul, məhsul sayları (`ChangeDetailDrawer`-in məzmunu). (d) Müqayisədən kənar qalanlar: bu ay sifariş verib, bazası olmayanlar (`partition.noBaseline` və tarixçəsizlərdən bu ay sifariş verənlər). Üstəlik «müqayisə olunan obyektlər üzrə bu ay» (`summary.comparedCurrent`) — kart 1 ilə kart 3 arasındakı fərqi izah edir. (e) Qiyməti olmadığı üçün bölüşdürülə bilməyən məbləğ (`unattributedAmount`). | **Şirkət üzrə səbəb bölgüsü** (qiymət təsiri, miqdar təsiri, yeni məhsul, sifariş edilməyən); şirkət üzrə ən çox təsir edən məhsullar; kateqoriya üzrə fərq (`categories` yalnız bu ayı verir); artanların və azalanların ayrıca cəmi. → S-1, S-3 |
| **4 · Aktiv obyektlər** | «Kim sifariş verməyib?» | Qruplar, adbaad: sifariş verənlər; bu ay sifarişsizlər — son sifariş ayı və məbləği ilə (`lastOrderPeriod`, `lastOrderKnownAmount`); heç sifariş verməyənlər. `DashboardExceptions` bunu artıq göstərir. | Niyə sifariş yoxdur — sistem bunu bilmir və ekran təxmin etmir (`DashboardSummary.tsx:395-396`). |

Qeyd: obyektlərin səbəbləri `rows`-dadır, `rows` isə cədvəlin axtarışı və süzgəci ilə dəyişir. Cədvəlin süzgəcləri olmasa da, 100-lük səhifə ən böyük fərqlərin tam siyahısı olmaya bilər, ona görə panel həmişə eyni endpoint-i `group=Compared&sort=AbsoluteKnownAmountDelta&page=1&pageSize=100` ilə ayrıca soruşur (§7.9); hər iki parametr serverdə var (`ManagementDashboardQueries.cs:898`, `:935`). **API dəyişmir.**

## 5. Üç drill-down variantı

| | **A · Sağ panel** (sahib rədd etdi) | **B · Yerində açılan bölmə** (sahibin seçimi) | **C · Ayrı səhifə** |
|---|---|---|---|
| Nədir | Karta klik → sağda 560 px panel; içində ikinci səviyyə (obyekt) | Kart «tab» kimi işləyir; kartların altında tam enli detal bölməsi açılır | `/dashboard/ferq?…` kimi öz səhifəsi (və ya «Bütün obyektlər» cədvəlinə hazır süzgəclə keçid) |
| Desktop | Səhifə solda görünür; siyahı üçün yer kifayətdir | Ən geniş yer, amma qrafik və cədvəl aşağı itələnir | Ən çox yer |
| Mobil (390) | Tam ekran, aşağıda 44 px düymələr; telefonun «Geri»si bağlayır | Kartın altında açılır; uzun siyahı səhifəni uzadır, başlıq yuxarıda itir | Adi səhifə; qayıdanda dashboard yenidən yüklənir |
| Kontekst | Kart və ay arxada görünür; bağlayanda yer dəyişmir | Eyni səhifədədir, amma layout sıçrayır; 768-də 2×2 gridə bölmənin yeri qeyri-müəyyəndir | İtir; ay və baza URL ilə daşınmalıdır |
| URL / paylaşma | `detal=ferq` — «Geri» bağlayır, link paneli açır | Mümkündür, amma «Geri» bölməni bağlamır | Ən təbii |
| Klaviatura / a11y | `Modal`-ın hazır müqaviləsi: fokus tələsi, Esc, fokusun qayıdışı | `aria-expanded` və fokus idarəsi yenidən yazılmalıdır; Esc yoxdur | Adi səhifə |
| Təkrar istifadə | `Drawer`, `ChangeDetailDrawer`, `OutsideMonthlyPanel`, `DashboardExceptions` | Az; yeni açılan komponent lazımdır | Yeni route; `LocationRows` cədvəli |
| Məhsulda presedent | 19.1; obyekt paneli; «Aylıq hesabat» paneli (03-ux §3.4) | Yoxdur | «Bütün obyektlər» — UX_BRIEF onu «ağır» sayır |
| İcra xərci | Orta | Orta–yüksək (responsiv yerləşmə) | Yüksək (səhifə, qayıdış, sürüşmə yaddaşı) |
| Risk | İki səviyyə bir paneldədir — «‹ Fərq» qayıdışı aydın olmalıdır | Sıçrayan layout; mobildə uzunluq | İkinci «Ətraflı baxış» yaranır — dashboard-un 4-cü nəsli |

## 6. Tövsiyə: B — kartların altında yerində açılan bölmə

**A rədd edildi.** Səbəb: sahib sağdan açılan paneli (Drawer) istəmir; tələb əvvəlcədən bildirilib. A-nın ətraflı təsviri silindi.

**Niyə B rəhbər üçün işləyir:**
1. **Kart və cavab yan-yana qalır.** Rəhbər «Fərq +7.870 ₼» görür, klikləyir, cavabı rəqəmin dərhal altında oxuyur. Kart cərgəsi ekranda qalır, heç nə üstünü örtmür.
2. **Bir hərəkət, bir qayda.** Bir kart açıqdır; başqa karta klik məzmunu dəyişir; təkrar klik bağlayır. Yadda saxlanacaq heç nə yoxdur.
3. **Səhifə «ağ» olmur.** Altdakı qrafik, kateqoriyalar və cədvəl yerindədir, bölmə onları yalnız aşağı itələyir.
4. **Rəqəmlər dəyişmir.** Bölmə kartın öz cavabını oxuyur; brauzerdə yeni hesablama yoxdur (S-2).

**B-nin əvvəl qeyd olunan riskləri və həlli:**

| Risk | Həll (ətraflısı §7) |
|---|---|
| Layout sıçrayır | Kartlar heç vaxt yerini dəyişmir (bölmə bütün cərgənin altındadır); kartlar arası keçiddə hündürlük saxlanır; skelet eyni hündürlükdədir; açılış yalnız aşağını itələyir (§7.3) |
| Mobildə uzunluq | Uzun siyahı ilk 8 sətirdir, «Hamısını göstər (N)» yerində genişləndirir; açılanda bölmə görünmürsə səhifə ona sürüşür; «Bağla» düyməsi həm başlıqda, həm sonda (§7.4) |
| «Geri» bölməni bağlamır | Açılış history-yə yazılır (push), «Geri» bölməni bağlayır; kartlar arası keçid və obyekt sətri `replace` ilə, «Geri» addım-addım gəzmir (§7.6) |
| Esc / fokus yoxdur | Açıq bölmə üçün Esc və fokus qaydası yazılıb (§7.7) |

Qalan zəiflik (dürüst): bölmə kartların altında olduğu üçün telefonda ilk ekranın altına düşə bilər. **O-2 təsdiqləndi: mobildə 2×2 kart düzülüşü** (iki cərgə ≈ 300 px, bir sütundakı ~600 px əvəzinə) — bölmə ilk ekrana yaxınlaşır. Risk: dar kartda mətn/rəqəm sıxlaşır; bunun üçün §7.2-də konkret responsiv qayda var. Avtomatik sürüşmə (§7.3.5) qalır.

## 7. Dizayn təklifi (B)

### 7.1 Açan element — kartlar

- **Semantika: disclosure düymələri (`aria-expanded` + `aria-controls`), tab yox.** Səbəb: tab-da həmişə biri seçilidir, bizdə isə «hamısı bağlı» da normal vəziyyətdir və təkrar klik bağlayır. Tab oxlarla gəzmə və `tabpanel` müqaviləsi də lazımdır. Məhsulda disclosure artıq var (`InfoHint.tsx:81`, `DecisionHeadline.tsx:210`, `OrderDetailPage.tsx:534`), tab isə yalnız ayrı-ayrı seçici kimi işlənir (`ProductsPage.tsx`, `HistoryTabs.tsx`).
- **Quruluş:** kart `<section>` və `<h3>` qalır (`KpiRow.tsx:50-52`); `<h3>`-ün içində `<button type="button">` olur (düymənin içində başlıq yazmaq düzgün HTML deyil). Düymənin `::after`-i bütün kartı örtür, beləliklə kartın hər yeri klikləyir. `aria-describedby` — rəqəm sətri (ad: «Fərq», təsvir: «+7.870,00 ₼ · xərc artıb»).
- **Davranış:** bağlı kartda klik → açır; açıq kartda klik → bağlayır; başqa karta klik → məzmun dəyişir, bölmə bağlanıb-açılmır.
- **Vəziyyətlər:**
  - hover — bir ton tünd fon;
  - fokus — 2 px `primary` halqa (04-visual);
  - basılı — daha bir ton tünd;
  - **açıq kart** — 2 px `primary` haşiyə + kartın altında bölməyə bağlayan `primary` xətt; əlavə olaraq mətn: kartın alt sətirində sabit yerdə «Detallara bax ▾» (bağlı) / «Bağla ▴» (açıq). Rəng tək işarə deyil, mətn və ox da var. Bu sətir bütün kartlarda həmişə var, ona görə kartın hündürlüyü dəyişmir;
  - səhifə yenilənir (`aria-busy`) — 60% solğun, klik bağlı (`ManagementDashboardPage.tsx:407`); açıq bölmə qalır, solğun olur.
- **Rəng və mətn** (V-1, V-2 düzəlişləri): `costDirectionToneClass` / `costDirectionTintClass`, etiket adi hərflə, rəqəm `.tabular` və yalnız `format.ts` ilə.
- Kart həmişə açılır; məzmun boşdursa bölmə bunu deyir.

### 7.2 Bölmənin yeri

- **Kart cərgəsinin dərhal altında, tam en, kartlarla eyni sol-sağ kənarlar.** Altdakı bloklar (`ExpenseDynamics`, `CategoryRanked`, `ChangesTable`) onun altına keçir (`SimpleDashboardView.tsx:77-84`).
- **Mobil (390) və 768: 2×2 kart düzülüşü (O-2); bölmə bütün grid-in altındadır, açılan kartın altında deyil.** Əsaslandırma:
  - kart açılan kartın altında olsa, aşağıdakı kartlar yerini dəyişər — bu, ən pis sıçrayışdır;
  - 2×2-də bölmə bir kartın altına sığmır, sətri bölmək lazım gələrdi;
  - bütün cərgə üçün tək yer = tək qayda, test və hesab sadədir;
  - 2×2 ilə bölmə ən çox 1 cərgə (≈ 150 px) aşağıdadır; yenə də görünmürsə avtomatik sürüşmə (§7.3) işləyir, başlıqda kartın adı + rəqəmi təkrar olunur.
- **Mobil 2×2 üçün responsiv qayda (mətn sığmırsa).** Meyar: **rəqəm heç vaxt kəsilmir və bükülmür; etiket ≤ 2 sətir.**
  1. **≥ 768:** adi ölçü, 2×2 (və ya mövcud geniş düzülüş).
  2. **~360–767 (390 daxil): yığcam forma** — etiket 2 sətrə bükülə bilər (`line-clamp-2`, adi hərf), rəqəm bir pillə kiçik (məs. 28 → 22–24 px; dəqiq ölçü QA-da), alt izah sətri qısa (tək sətir, qısaldılmış mətn: «M obyekt daxil deyil»); «Detallara bax ▾» sətri qalır. Düymə ≥ 44 px hündürlükdə.
  3. **< ~360 px və ya yığcam formada da rəqəm sığmırsa** (məs. `−317.128,16 ₼` kimi uzun məbləğ, sistem şrifti böyüdülüb) → **1 sütun**. Keçid yalnız CSS-dədir (konteyner/media sorğusu); rəqəmi JS ilə ölçüb dəyişmək yoxdur. Dəyər kəsilməsin deyə `overflow` gizlədilmir, `truncate` işlənmir.
  4. **Hündürlük:** cərgədəki kartlar bərabər hündürlükdədir (grid `align-items: stretch`; kart daxilində sabit sətirlər: etiket · rəqəm · izah · «Detallara bax»). Kart hündürlüyü açıq/bağlı fərqlənmir (§7.3.1).
  5. **QA-da yoxlanır:** 360, 390, 412, 768 enlərində ən uzun real məbləğlə və böyüdülmüş şriftlə (200%) — kəsilmə/bükülmə yoxdur, etiket ≤ 2 sətir, kartlar cərgədə bərabərdir, yana sürüşmə yoxdur.
- Bölmə `<section id="detal-bolmesi" aria-labelledby>` olur, başlıq = kartın adı, yanında kartın rəqəmi (eyni mətn).

### 7.3 Layout sıçramasını minimuma endirmə

1. **Kartlar yerində qalır — desktopda, 768-də və mobil 2×2-də də (O-2).** Bölmə kart cərgəsindən sonra gəlir; kart ölçüsü açıq/bağlı fərqlənmir (`min-h-[140px]` + sabit alt sətir; mobil yığcam formada cərgədə bərabər hündürlük, §7.2). Açma, bağlama, kartlar arası keçid və 1 sütun ↔ 2×2 keçidi kartların yerini və ölçüsünü dəyişmir. Ölçmə: açıb-bağlayanda kartın `getBoundingClientRect()` dəyişməməlidir (Δ = 0 px) — 360/390/768/1024/1440-də.
2. **Kartlar arası keçid.** Məzmun dəyişəndə bölmənin hündürlüyü **yalnız yeni məzmun ölçülənə qədər** əvvəlkinin hündürlüyündə saxlanır (`min-height` = ölçülmüş hündürlük) və yeni məzmun render olunan kimi **dərhal buraxılır**: uzundan qısaya keçəndə bölmə yeni məzmunun hündürlüyünə qədər kiçilir, qalıq boşluq qalmır. Aşağıdakı bloklar yalnız yeni məzmunun hündürlüyü qədər yerdəyişir. Keçiddə hündürlük animasiya olunmur (anında).
3. **Yüklənmə skeleti real məzmunun hündürlüyündədir.** Obyekt siyahısı üçün ayrıca sorğu gedir (§7.9, §7.8); skelet `LoadingRows` ilə sətirləri real sətirlə eyni hündürlükdə (44 px) və real sətir sayında (≤ 5, ilk 5 üçün) ayırır, cavab gələndə yerini real sətirlərə verir; artıq sətir ayrılmır. Əsas məzmun (rəqəmlər, siyahı) skelet olmadan dərhal görünür, çünki `summary` artıq yüklənib.
4. **Animasiya.** Açılış: hündürlük 0 → auto, 150 ms (`grid-template-rows: 0fr → 1fr`), bağlanış eyni. `prefers-reduced-motion`-da animasiya yoxdur, bölmə dərhal görünür. Kartlar arası keçiddə animasiya yoxdur.
5. **Açılanda scroll.** Bölmənin yuxarı kənarı görünən sahədədirsə (yuxarı ~⅔-də) — səhifə sürüşmür. Görünmürsə (tipik hal: mobil) — `scrollIntoView({ block: 'start' })` + `scroll-mt` (sabit başlıq qədər). Kartlar arası keçiddə sürüşmə yoxdur. `prefers-reduced-motion`-da `behavior: auto`.
6. **Bağlananda.** Bölmənin yuxarı kənarı ekranın üstündən yuxarıdadırsa, bağlamadan əvvəl səhifə kartın üzərinə sürüşür (fokus kartaya qayıdır) — əks halda altdakı məzmun yuxarı «tullanardı».
7. **Aşağıdakı bloklar tullanmasın deyə:** bölmə ağacda həmişə eyni yerdədir (şərti render yox, `hidden`/animasiya), blokların `key`-ləri dəyişmir, brauzer scroll anchoring işləyir (bölmə anker elementlərdən yuxarıdadır, yəni görünən bloku itələmir yalnız onu aşağı aparır). Ölçmə: `PerformanceObserver('layout-shift')` — açma/bağlamada kartlar üçün 0, altdakı bloklar üçün yalnız istifadəçinin klikindən sonrakı (`hadRecentInput`) sürüşmə.
8. **Daimi artıq boşluq yoxdur (O-1…O-4 ilə əlavə tələb).**
   - **Bağlı vəziyyət:** bölmə **0 hündürlükdür** — yer ayrılmır, `hidden` (və ya animasiya bitəndə `hidden`); kartlarla altdakı bloklar arasında boş zolaq, boş `margin`/`padding` qalmır.
   - **Açıq vəziyyət:** hündürlük məzmunun özüdür; **sabit `min-height` yoxdur** (yalnız bənd 2-dəki müvəqqəti, dərhal buraxılan saxlama).
   - **Skelet** real məzmunun hündürlüyündədir (bənd 3); sorğu bitəndən sonra qalıq boşluq yoxdur.
   - **Ölçmə:** bağlıda bölmənin `offsetHeight` = 0 və kart cərgəsi ilə növbəti blok arasındakı məsafə bölmə əlavə olunmazdan əvvəlki ilə eynidir; uzun → qısa kart keçidindən sonra bölmənin hündürlüyü = məzmunun `scrollHeight`-i (Δ ≤ 1 px).

### 7.4 Uzun siyahılar

- **Seçim: ilk 8 sətir + «Hamısını göstər (N)» (yerində genişlənmə), daxili scroll yox.** Səbəb: mobildə iç-içə scroll toxunuşu tutur, səhifəni sürüşdürməyi çətinləşdirir, brauzerdə axtarışı pozur; yerində genişlənmə isə səhifənin öz scroll-undan istifadə edir. Genişlənəndə fokus ilk yeni sətirə keçmir (qalır düymədə); düymə «Daha az göstər» olur və yerini dəyişməməsi üçün siyahının sonunda qalır.
- N = 8 başlanğıc **[Fərziyyə]** — QA-da 390-da ölçülür.
- Qrup başlıqları (artanlar / azalanlar / kənar qalanlar) hər biri öz «Hamısını göstər»inə malikdir; hamısı bir dəfədə açıq olmur.
- Genişlənmə vəziyyəti URL-də deyil (qısa ömürlüdür), kart dəyişəndə və ya bağlananda sıfırlanır.
- **«Bütün obyektlər cədvəli» keçidi (O-3 təsdiqləndi):** bölmənin sonunda; yalnız həmin səhifədə cədvəlin başlığına sürüşür (mövcud `onOpenAll`, `ManagementDashboardPage.tsx:313`). **Mövcud filtrləri, qrupu, sıranı və URL-i dəyişmir** (nə `group`, nə `sort`, nə `q` yazılır; `detal`/`obyekt` də toxunulmaz). Sürüşmə `scrollIntoView` ilə, `prefers-reduced-motion`-da `behavior: auto`; fokus cədvəlin başlığına keçir.

### 7.5 Hər kartın bölməsi

Hər bölmə eyni karkasdadır: **başlıq** (kartın adı + rəqəm) → **bir izah cümləsi** → **əsas siyahı** → **kənar hallar** → **«Bütün obyektlər cədvəli» · «Bağla»**.

- **Fərq:**
  - izah: «Fərq aşağıdakı N obyektin fərqlərindən ibarətdir» (server təsdiqləyir, `PortfolioCohort.cs:99-103`); UI toplamır;
  - artanlar və azalanlar ayrı qruplarda; qrup başlığında yalnız say (S-3); sıra fərqin ölçüsünə görə — serverin `AbsoluteKnownAmountDelta` sırası;
  - hər sətir: obyekt adı · fərq (`formatMoneyDelta`) · `DirectionWord` · `causeHeadline` · qiymətsizdirsə `MissingPriceMark`;
  - kənar hallar: «Müqayisəyə daxil deyil (M)» (`partition.noBaseline` və bu ay sifariş verən tarixçəsizlər), `unattributedAmount` qeydi, «müqayisə olunan obyektlər üzrə bu ay» (`summary.comparedCurrent`).
- **Məbləğ:** növ tərkibi (3 sətir, cəm sətri yox) → kateqoriyalar serverin sətirləri olduğu kimi → obyektlər bu ayın məbləğinə görə. «Aylıqdan kənar» növündə — `OutsideMonthlyPanel`-in sətir siyahısı **Drawer-siz** komponentə çıxarılır (mövcud panel öz yerində qalır).
- **Müqayisə dövrü:** qayda və aylar (`describeBasisCaption`) → «N obyekt müqayisədədir» → obyekt-obyekt baza məbləği → natamam tarixçə qeydi.
- **Aktiv obyektlər:** `DashboardExceptions` qrupları, adbaad; obyekt adı onun səhifəsini açır.

### 7.6 «Fərq»də ikinci səviyyə — Drawer-siz

- **Seçim: obyekt sətri öz yerində açılır (accordion sətir), eyni anda yalnız biri.** Başqa sətir açılanda əvvəlki bağlanır. Sətir `aria-expanded` düyməsidir, açılan hissə sətirin altında, bölmənin tam enində.
- **Niyə yan-yana (master–detail) yox:** 390–1024 px-də iki sütun yoxdur, yalnız geniş ekranda işləyər — iki ayrı düzülüş = iki dəfə test. Sətir açılması hər enə eyni işləyir.
- **Məzmun:** `ChangeDetailDrawer`-in bölmələri (Rəqəmlər · Niyə dəyişib? · Məhsullar) Drawer-siz `ObjectChangeBreakdown` komponentinə köçür. `ChangeDetailDrawer` yalnız `ManagementDashboardPage.tsx:337`-də işlənir; O-1-dən sonra istehlakçısı qalmır, ona görə Drawer sarıyıcısı və onun testləri yerində açılan sətrin testlərinə keçir (davranış eyni, mətnlər və rəqəmlər dəyişmir). Altda: «Sifarişə bax» (əsas düymə, `detailsTarget`) və «Obyektin səhifəsi».
- **Scroll:** yeni sətir açılanda əvvəlki bağlandığı üçün sətrin yuxarı kənarı ekrandan yuxarıda qala bilər — onda sətir görünənə qədər sürüşür (§7.3 qaydası).
- **«Məbləğ dəyişiklikləri»ndəki «Ətraflı» düyməsi (O-1 təsdiqləndi)** bu gün `ChangeDetailDrawer` (Drawer) açır (`ManagementDashboardPage.tsx:312`, `:336-344`). Qərar: düymə «Fərq» bölməsini açır və həmin obyektin sətrini açıq/seçili edir (`detal=ferq&obyekt=<id>`; history qaydası §7.7: bölmə bağlı idisə push, açıq idisə replace). **Sağ Drawer dashboard-dan çıxır.** Sətir siyahıda görünmürsə («Hamısını göstər»dən aşağıdadırsa) siyahı həmin sətri əhatə edənə qədər genişlənir və səhifə ona sürüşür (§7.3.5); sətir fokusa alınır.

### 7.7 URL, «Geri», fokus

**URL.** `detal=mebleg|baza|ferq|obyektler` və `obyekt=<locationId>` (yalnız `detal=ferq` ilə). Adlar ASCII azərbaycancadır, `dashboardView.ts:30` qaydası kimi. Mövcud `update` köməkçisi ilə yazılır **[Fərziyyə: onun push/replace davranışı mərhələ 1-də yoxlanır — oxunmayıb]**.

| Hərəkət | History | Nəticə |
|---|---|---|
| Heç nə → kart açılır | **push** (giriş bizimdir, işarə ilə) | `detal=ferq` |
| Kart → başqa kart | **replace** | `detal` dəyişir, `obyekt` silinir |
| Fərqdə obyekt sətri açılır/dəyişir/bağlanır | **replace** | `obyekt` yazılır/silinir |
| Eyni kartda təkrar klik, ✕, «Bağla», Esc | giriş bizimkidirsə `navigate(-1)`, deyilsə **replace** ilə parametr silinir | bölmə bağlanır |
| «Geri» düyməsi | brauzer | bölmə bağlanır (bir addım); ikinci «Geri» dashboard-dan çıxarır |

- **Birbaşa link:** `detal` olan link səhifəni açanda bölmə açıq gəlir; data gələnə qədər skelet; data gələndən sonra bir dəfə görünmürsə sürüşür (§7.3.5). Ay, baza, növ URL-də qaldığından link eyni şeyi göstərir.
- **Tanınmayan dəyər:** `detal=xyz` → səssizcə silinir (replace), bölmə bağlı. `obyekt` cari cavabda tapılmırsa (başqa ay, başqa baza) → `obyekt` silinir, bölmə açıq qalır.
- **Görünüş:** `view=etrafli` olanda `detal`/`obyekt` oxunmur və kartlar bu işlə dəyişmir (S-4); keçiddə silinir.

**Fokus və klaviatura.**
- Tab sırası: kartlar → (açıqdırsa) bölmə → altdakı bloklar.
- Açanda/karta keçəndə fokus bölmənin başlığına (`tabIndex=-1`) keçir: bölmə kartlardan sonra gəlir və klaviatura/ekran oxuyucu istifadəçisi üç kartdan keçməli olmasın. Bu, qəsdən seçilib: kart düyməsində qalsa, məzmuna çatmaq üçün 3 Tab lazım olardı.
- **Esc:** fokus kartda və ya bölmənin içindədirsə bölməni bağlayır, fokus açıq kartaya qayıdır. Açıq açılan sətir varsa, birinci Esc yalnız sətri bağlayır, ikincisi bölməni. Daxili `InfoHint` açıqdırsa, Esc əvvəlcə onu bağlayır (mövcud davranış).
- Sətir açılanda fokus düymədə qalır; sətir bağlananda eyni düymədədir.
- Bağlananda fokus kartdadır (URL ilə tapılır, `activeElement`-ə güvənilmir).
- Düymələr ≥ 44 px (toxunuşda), sətir düyməsi bütün sətir enində.

### 7.8 Vəziyyətlər

| Vəziyyət | Kart | Bölmə |
|---|---|---|
| Yüklənir (ilk dəfə) | kart yoxdur — səhifənin `LoadingRows`-u | açılmır; `detal` olan link üçün skelet |
| Yenilənir (ay / baza / növ dəyişdi) | rəqəm 60% solğun, klik bağlı | `aria-busy`, solğun, hündürlük saxlanır; yeni cavab gələndə yenilənir; obyekt yoxdursa sətir bağlanır |
| Ayrıca sorğu (§7.9) yüklənir | — | `summary` rəqəmləri dərhal; obyekt/səbəb sətirləri real sətir hündürlüyündə skelet |
| Səhv | səhifənin `ErrorState`-i | əlavə sorğu səhvi: həmin hissədə `ErrorState` + «Yenidən cəhd et»; qalanı işləyir |
| Boş | «—» | Fərq: «Bu ay müqayisə ediləcək obyekt yoxdur» + kənar qalanlar; Aktiv: «Bütün obyektlər bu ay sifariş verib» (`EmptyState`) |
| Qismən (qiymətsiz) | `knownAmountHint` | hər sətirdə `MissingPriceMark`; «… qiyməti olmayan sətirlərə görə bölüşdürülə bilmir» |
| Daxili təminat | xəbərdarlıq deyil | neytral söz (Qala baza qiymətsiz sayılmır) |
| İcazə yoxdur | route hamıya açıqdır | 401/403 — tətbiqin ümumi qaydası |

### 7.9 S-6 — «Məbləğ dəyişiklikləri» həqiqi ən böyük 5

**Niyə cədvəlin sətirlərinə güvənmək olmaz.** Server əvvəl süzür, sonra BÜTÜN obyektləri sıralayır, sonra səhifələyir (`ManagementDashboardQueries.cs:176-178`: `Sort(Filter(rows, groups, query))` → `Skip/Take`); `AbsoluteKnownAmountDelta` açarı `:935`, dəyəri olmayanlar sonda, bərabərlikdə ada görə (`:940-943`); `MaxPageSize = 100` (`:65`). Frontend cədvəli `pageSize = 100` istəyir (`ManagementDashboardPage.tsx:37`), amma o sətirlər cədvəlin axtarış/qrup süzgəclərindən keçir.

**Qərar: ayrıca sorğu.**
- «Fərq» bölməsi və «Məbləğ dəyişiklikləri» **bir ayrıca sorğudan** oxuyur: eyni ay/baza/növ, `group=Compared&sort=AbsoluteKnownAmountDelta&page=1&pageSize=100`, **cədvəlin axtarışı və süzgəcləri olmadan**. İlk 5 = həqiqi ən böyük 5; iki yer qurulma ilə uyğun gəlir, bir-birinə zidd çıxa bilməz (U-2 həll olunur). `ChangesTable.tsx` artıq `attention`-dan seçmir.
- Cədvəlin öz sorğusu dəyişmir. İki sorğu eyni açarla keş paylaşa bilər **[Fərziyyə]** — mərhələ 1-də yoxlanır.
- 100-dən çox müqayisə olunan obyekt olarsa, «Fərq» siyahısı növbəti səhifəni də istəyir (indi 27 obyekt var; «Məbləğ dəyişiklikləri» yalnız 1-ci səhifənin ilk 5-ini işlədir).
- **API dəyişmir** — parametrlər mövcuddur. Faiz nişanı yalnız server sahəsidir; brauzerdə faiz və cəm hesablanmır.

**Yoxlama meyarları (testlər):**
- (a) ən böyük üç dəyişiklik eyni istiqamətdə olan fixture (U-2 halı): üçü də görünür;
- (b) cədvəldə axtarış/süzgəc aktivdir: ilk 5 dəyişmir;
- (c) müqayisə olunan obyekt 5-dən azdır: yalnız o qədər sətir, boş yer yoxdur;
- (d) fərqi `null` olanlar daxil deyil;
- (e) bərabər fərqdə ada görə sıra;
- (f) «Fərq» bölməsinin ilk 5-i «Məbləğ dəyişiklikləri» ilə eyni obyektlərdir;
- (g) faiz və cəm brauzerdə hesablanmır (rəqəmlər server sahələrindən olduğu kimi).

### 7.10 Komponentlər və tokenlər

**Mövcud:** `DetailsCue`, `EmptyState`/`ErrorState`/`LoadingRows`, `DirectionWord`, `MissingPriceMark`, `causeHeadline`, `noComparisonCause`, `DashboardExceptions`, `ChangeDetailDrawer`-in bölmələri, `OutsideMonthlyPanel`-in siyahısı, `format.ts`, `costDirection*`, `detailsTarget`/`orderLink`/`locationLink`, `buttonClass` (D-51), `InfoHint`/`DecisionHeadline`-in `aria-expanded` naxışı. `Modal`/`Drawer` bu işdə **işlənmir**.

**Yeni (təsdiqdən sonra):** `v2/KpiDetailSection.tsx` (çərçivə: başlıq, animasiya, hündürlük saxlama, Bağla), `v2/ExpandableList.tsx` (ilk N + «Hamısını göstər»), `v2/DifferenceDetail`, `AmountDetail`, `BaselineDetail`, `LocationsDetail`, `ObjectChangeBreakdown`. **Tokenlər:** yeni token yoxdur.

## 8. İcra planı (təsdiqdən sonra)

**0 · Qapılar.** `02-requirements` → `03-ux` → `04-visual` + `visual-qa` tənqidi → `05-approval` (sahibin təsdiqi sitat kimi). Təsdiqə qədər kod dəyişmir. Sahibin 2026-10-17 tarixli ikinci təsdiqi (O-1…O-4) `05-approval.md`-yə sözbəsöz köçürülür.

**Qapı O-4 (V2 ilə ortaq fayllar).** «Aylıq hesabat» V2 ilə ortaq fayllar: `components/buttonClass.ts`, `components/analytics/format.ts` (V2 branch-də commit edilməyib).
- Bu fayllara toxunmazdan (və ya onlara bağlı kodu yazmazdan) əvvəl: (1) V2-nin dəyişikliklərinin commit olunması gözlənilir; (2) konflikt riski yoxlanılır (`git status`/`git diff` ilə iki faylın V2 branch-dəki vəziyyəti ilə müqayisəsi). Hər ikisi yerinə yetməyibsə 🔒 işarəli addımlar başlamır.
- **Gözləmədən başlaya bilən addımlar (ortaq fayla toxunmur):** `analytics/dashboardDetail.ts` (+test) və `update` köməkçisinin push/replace yoxlaması; `v2/KpiDetailSection.tsx` və `v2/ExpandableList.tsx` (çərçivə, `buttonClass` və `format.ts` olmadan); `ObjectChangeBreakdown` çıxarışının strukturu; ayrıca sorğunun (§7.9) hook-u; `ChangesTable`-ın mənbə dəyişikliyi **rəqəm formatlaşdırmasına toxunmadan**.
- **🔒 Qapılı addımlar:** `format.ts`/`buttonClass.ts`-i import edən və ya dəyişən kod — V-1 rəng düzəlişi (`costDirection*`), düymələrin `buttonClass` ilə tətbiqi, bölmədəki pul/faiz mətnləri.

| Mərhələ | Nə | Fayllar | Toxunulmur |
|---|---|---|---|
| 1 · Əsas və URL | `dashboardDetail.ts` (oxu/yaz, tanınmayan dəyər); `update` köməkçisinin push/replace davranışını yoxla; ayrıca sorğu hook-u (§7.9); 🔒 V-1, V-2 | yeni `analytics/dashboardDetail.ts` (+test); 🔒 `v2/KpiRow.tsx` (`format.ts` istehlakçısı) | backend, `api/dashboard.ts`, `Modal`, `Drawer` |
| 2 · Bölmə karkası və mobil 2×2 | kartlar disclosure düyməsi; mobil 2×2 + yığcam forma + 1 sütun qaydası (§7.2); `KpiDetailSection` (animasiya, 0 hündürlük bağlıda, hündürlük saxlama və buraxma, scroll, fokus, Esc); `ExpandableList` | 🔒 `v2/KpiRow.tsx`; yeni `v2/KpiDetailSection.tsx`, `v2/ExpandableList.tsx`; `SimpleDashboardView.tsx`; `ManagementDashboardPage.tsx` (URL) | «Ətraflı baxış» |
| 3 · «Fərq», S-6 və «Ətraflı» (O-1, O-3) | `DifferenceDetail`, sətir açılması, `ObjectChangeBreakdown` çıxarışı; `ChangesTable` və «Fərq» ayrıca sorğudan (§7.9); «Ətraflı» düyməsi «Fərq» bölməsini və sətri açır; `ChangeDetailDrawer` dashboard-dan çıxarılır (testləri yerində açılan sətrə köçür); «Bütün obyektlər cədvəli» yalnız sürüşür | yeni `v2/DifferenceDetail.tsx`, `ObjectChangeBreakdown.tsx`; `ChangeDetailDrawer.tsx` (istehlakçısı qalmır — sarıyıcı və testləri köçür); 🔒 `v2/ChangesTable.tsx` (faiz nişanı/`format.ts`); `ManagementDashboardPage.tsx` (`:312-344`, `onOpenAll`) | `api/dashboard.ts`, backend, cədvəlin süzgəcləri |
| 4 · Qalan üç bölmə | məbləğ, baza, aktiv obyektlər; `OutsideMonthlyPanel` siyahısının çıxarışı | 🔒 yeni `AmountDetail`, `BaselineDetail`, `LocationsDetail` (pul mətnləri); `OutsideMonthlyPanel.tsx`, `DashboardSummary.tsx` (yalnız çıxarış) | `reports/*`, `MonthlyReportPage` |

- **API və maliyyə hesablamaları dəyişmir.** Backend, `api/dashboard.ts`, DTO-lar, serverin sıralama/filtr/səhifələmə məntiqi və pul/faiz hesablamaları toxunulmazdır; yeni sorğu mövcud parametrlərlə gedir. Şirkət üzrə səbəb bölgüsü sonrakı mərhələdir (S-1).
- Əvvəlki 5-ci mərhələ («Ətraflı» düyməsi) şərtsiz olduğu üçün 3-cü mərhələyə birləşdirildi.
- **Testlər** (Drawer testləri əvəzinə):
  - kart rol və adla tapılır (`button`, ad «Fərq»), klik `aria-expanded="true"` verir, bölmə (`region`) görünür, URL-də `detal` var;
  - eyni karta təkrar klik bağlayır; başqa karta klik məzmunu dəyişir və yalnız bir bölmə var;
  - Esc bağlayır, fokus karta qayıdır; açıq sətir varsa birinci Esc yalnız sətri bağlayır;
  - «Geri» bölməni bağlayır (push), kartlar arası keçid isə history-yə yazmır (replace);
  - birbaşa link bölməni açır; tanınmayan `detal`/`obyekt` silinir;
  - ay dəyişəndə `obyekt` yoxdursa sətir bağlanır;
  - «Hamısını göstər (N)» siyahını açır, N düzgündür, düymə «Daha az göstər» olur;
  - yalnız bir obyekt sətri açıqdır;
  - bölmədəki rəqəm kartdakı ilə eyni mətndir; fərq siyahısı `partition.compared`-in hamısıdır, kəsilmədən;
  - «Məbləğ dəyişiklikləri» serverin sırasının ilk 5-ini göstərir; «ən böyük 5» meyarları (a)–(g) §7.9-dakı kimi;
  - **Drawer dashboard-da qalmır:** «Ətraflı» klikində `dialog`/`Drawer` açılmır, «Fərq» bölməsi və həmin obyektin sətri açılır (`aria-expanded="true"`, URL-də `detal=ferq&obyekt=<id>`); sətir siyahıda görünmürsə siyahı genişlənir və sətir açılır;
  - **«Bütün obyektlər cədvəli» keçidi** URL-i və cədvəl filtrlərini (`q`, `group`, `sort`, `page`) dəyişmir, yalnız cədvəlin başlığına sürüşdürür;
  - **bağlı vəziyyətdə** bölmə DOM-da `hidden`-dir və 0 hündürlükdədir;
  - ayrıca sorğu cədvəlin axtarışı/süzgəci olmadan gedir (sorğu parametrləri yoxlanır);
  - rəng 9.1 köməkçisindən gəlir; `view=etrafli`-də `detal` tətbiq olunmur;
  - mövcud panel testləri (`ManagementDashboardPage.test.tsx:1162-1197`) yaşıl qalır; `npm run build`, `npm test`.
- **Brauzer (visual-qa), enlər 390 / 768 / 1024 / 1280 / 1440 / 1920:**
  - yana sürüşmə yoxdur; hover/fokus/basılı vəziyyət; açma-bağlama, Esc, «Geri/İrəli», birbaşa link;
  - **sıçrayış ölçməsi:** (a) açanda və bağlananda 4 kartın `getBoundingClientRect()` dəyişmir (Δ = 0); (b) karta → karta keçəndə bölmənin üst kənarı dəyişmir, altdakı blokun yeri yalnız hündürlük fərqi qədər dəyişir; (c) açanda altdakı blokun yerdəyişməsi = bölmənin hündürlüyü; (d) `layout-shift` yığımı; (e) skelet və real məzmunun hündürlük fərqi;
  - **mobil 2×2 (O-2):** 360, 390, 412, 768-də 2×2; ən uzun real məbləğ və 200% şriftlə rəqəm kəsilmir/bükülmür, etiket ≤ 2 sətir, kartlar cərgədə bərabər hündürlükdə; ~360-dan dar ekranda 1 sütuna keçid; kartlar açma/bağlama/keçiddə yerini dəyişmir (Δ = 0);
  - **boşluq qalmır:** bağlıda bölmənin hündürlüyü 0; uzun məzmunlu kartdan qısaya keçəndən sonra bölmə məzmuna qədər kiçilir (qalıq boşluq yoxdur); skelet ↔ real məzmun hündürlük fərqi ≈ 0;
  - 390-da: bölmə görünmürsə sürüşmə işləyir, «Hamısını göstər», 44 px düymələr, «Bağla»;
  - `prefers-reduced-motion` ilə animasiya yoxdur;
  - uzun obyekt adları, yavaş şəbəkə, API səhvi, boş ay, qiymətsiz sətir, «Aylıqdan kənar» növü, əl ilə seçilmiş dövr, 100-dən çox obyekt;
  - kontrast ölçülür; konsolda səhv yoxdur.

  Şəkillər `AI_WORKFLOW/DESIGN/2026-10-17-dashboard-kart-detallari/qa/` qovluğuna yazılır.

## 9. Qərarlar və açıq suallar

### Qərarlar (2026-10-17, ikinci təsdiq)

Sahibin sözü (sözbəsöz): «Dashboard kartları üçün O-1–O-4 qərarlarını təsdiqləyirəm: O-1: Bəli. «Ətraflı» düyməsi sağ Drawer əvəzinə kartların altındakı «Fərq» bölməsini açsın və müvafiq obyekti seçsin. O-2: Mobil görünüşdə 2×2 kart düzülüşü istifadə et. Mətnlər sığmırsa, responsive alternativ seç. O-3: «Bütün obyektlər cədvəli» keçidi həmin səhifədə cədvələ sürüşdürsün. Mövcud filtrləri dəyişmə. O-4: Aylıq hesabat V2 ilə ortaq fayllara toxunmazdan əvvəl onun dəyişikliklərinin commit olunmasını və konflikt riskinin yoxlanmasını gözlə. Əlavə tələblər: Kartların yerindən tərpənməsinin qarşısını al. Detal bölməsində daimi artıq boşluq yaratma. «Ən böyük 5» siyahısının bütün uyğun obyektlər arasından düzgün seçilməsini yoxla. Mövcud API və maliyyə hesablamalarını dəyişmə.»

| # | Sahibin qərarı | Dizayna təsiri |
|---|---|---|
| O-1 | Bəli: «Ətraflı» sağ Drawer əvəzinə «Fərq» bölməsini açır və obyekti seçir | `detal=ferq&obyekt=<id>`; Drawer dashboard-dan çıxır; `ChangeDetailDrawer`-in məzmunu `ObjectChangeBreakdown`-a köçür, testlər yerində açılan sətrə keçir (§7.6, §8 mərhələ 3) |
| O-2 | Mobildə 2×2; sığmırsa responsiv alternativ | 360–767: yığcam forma (etiket ≤ 2 sətir, rəqəm bir pillə kiçik, qısa izah); ~360-dan dar və ya rəqəm sığmırsa 1 sütun; rəqəm heç vaxt kəsilmir/bükülmür; kartlar cərgədə bərabər hündürlük (§7.2) |
| O-3 | «Bütün obyektlər cədvəli» yalnız həmin səhifədə cədvələ sürüşdürür; filtrləri dəyişmir | `onOpenAll`; `group`/`sort`/`q` və URL yazılmır (§7.4) |
| O-4 | V2 ilə ortaq fayllara toxunmazdan əvvəl V2-nin commit olunması və konflikt riskinin yoxlanması gözlənir | `buttonClass.ts`, `format.ts` qapısı; qapısız addımlar əvvəl başlaya bilər (§8, «0 · Qapılar») |
| Əlavə | Kartlar yerindən tərpənməsin; daimi artıq boşluq olmasın; «ən böyük 5» düzgün seçilsin; API və maliyyə hesablamaları dəyişməsin | §7.3.1 (2×2-də də Δ = 0), §7.3.8 (bağlıda 0 hündürlük, sabit `min-height` yox), §7.9 (ayrıca sorğu, meyarlar a–g), §8 (API/maliyyə toxunulmaz) |

### Qərarlar (2026-10-17)

| # | Sahibin qərarı | Dizayna təsiri |
|---|---|---|
| — | Drawer yox; detal kartların altında, bir dəfədə biri açıq | Variant B; §6–§7 |
| S-1 | Hələlik obyekt-obyekt səbəblər | «Fərq» bölməsi şirkət üzrə bölgü göstərmir; yalnız sətir başına `causeHeadline`. Şirkət bölgüsü sonrakı backend işidir |
| S-2 | Maliyyə yekunları serverdə qalsın | Bölmə yalnız server rəqəmlərini göstərir; brauzerdə toplama/faiz yoxdur. K-1 yerləri (mövcud hesablamalar) bu işə daxil deyil |
| S-3 | Ayrı cəmlər sonrakı mərhələyə | Qrup başlığında yalnız say; artan/azalan cəmi yoxdur |
| S-4 | Yalnız «Sadə baxış» | «Ətraflı baxış» və `KpiGrid` dəyişmir; `view=etrafli`-də `detal` oxunmur |
| S-5 | Mövcud ortaq komponentlərə uyğun davran | Yeni müstəqil dil yoxdur: `EmptyState`/`ErrorState`/`LoadingRows`, `DirectionWord`, `format.ts`, `aria-expanded` naxışı, tokenlər. `Modal`/`Drawer` işlənmir (Drawer-siz tələb) |
| S-6 | Həqiqi ən böyük 5 üstündür | «Məbləğ dəyişiklikləri» `AbsoluteKnownAmountDelta` sırasından; §7.9 |

### Açıq suallar

Yoxdur. O-1…O-4 yuxarıda həll olunub. Yalnız icra zamanı yoxlanacaq **[Fərziyyə]**lər qalır (`update` köməkçisinin push/replace davranışı; iki sorğunun keş paylaşması; N = 8 başlanğıc) — bunlar sahib qərarı tələb etmir.
