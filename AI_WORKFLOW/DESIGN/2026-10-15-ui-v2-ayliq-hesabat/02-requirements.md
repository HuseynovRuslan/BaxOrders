# 02 — Tələblər: UI V2 «Aylıq hesabat»

**Tarix:** 2026-10-15 · **Mərhələ:** 2 (`DESIGN_WORKFLOW.md`) · **Mənbə:** sahibin qərarları — `DECISIONS.md` D-50
(sözbəsöz orada), audit — `01-audit.md`.

`product-strategist` agenti işə salınmadı: tələblər sahibin açıq qərarlarından birbaşa gəlir, bu sənəd onları
izləyir. Hər tələbin yanında mənbəyi yazılıb.

## 1. Sorğu

> İndi 1-ci mərhələyə keç: UX-i tamamla və tətbiq planını yekunlaşdır. Hələ proqram kodunu dəyişmə. Əvvəl
> nəticəni mənə təqdim et.

Qərarlar və əlavə tələblər: D-50 (1–7 və 9 əlavə tələb).

## 2. İstifadəçi problemi

Rəhbər ili obyekt-obyekt oxuyur: hansı obyekt, hansı ay, xərc artıb, yoxsa azalıb, qeyri-adi ay varmı, hansı ay
hələ təsdiq gözləyir. Bu gün bunun qarşısında dörd maneə var:

| Problem | Sübut |
|---|---|
| Hər xanada dörd məlumat (məbləğ, faiz, status, ⚠) 64 px-ə sıxılıb — göz rəqəmi axtarır | `MonthlyReportTable.tsx` `Cell`/`Secondary`; UX_BRIEF «defolt ekranda ~40 rəqəm» |
| Sifarişin sətirlərinə baxmaq üçün hesabatdan çıxmaq lazımdır | xana birbaşa `/orders/{id}` açır |
| 1280 px-də səhifə yana sürüşür | B-07 (açıq), brauzerdə ölçülüb 2026-09-27 |
| Obyektləri il cəminə görə sıralamaq olmur | API sətirləri adla sıralayır, ekranda sıralama yoxdur |

## 3. Mövcud vəziyyət

`01-audit.md` §3–4. Qısaca: rəqəmlərin, faizlərin, «qeyri-adi»nin və statusun hamısı API-dədir
(`GET /api/v1/reports/monthly`); sifarişin sətirləri `GET /api/v1/orders/{id}`-dədir. Backend lazım deyil.

## 4. Rollar və ehtiyacları

| Rol | Bu ekranda nə edir | Nəyə ehtiyacı var | Fərq |
|---|---|---|---|
| Rəhbər | ili oxuyur; təsdiqi başqa ekranda verir | qeyri-adi və təsdiq gözləyən aylar; sifarişin sətirləri | zəng gözləyənlərin sayını göstərir |
| Koordinator | idxal edir, göndərir; ayların gəldiyini yoxlayır | qiymətsiz sətirlər; «Düzəlişə qaytarılıb» statusu | — |
| Administrator | Koordinatorun işi + istifadəçilər | eyni | təsdiq növbəsini yalnız oxuyur |

Hesabatın yazma əməliyyatı yoxdur; üç rol eyni rəqəmləri görür.

## 5. Məqsədlər

- **Biznes:** ekrandakı hər rəqəm API ilə qəpiyinə qədər eynidir; qeyri-adi və təsdiq gözləyən aylar gözdən qaçmır.
- **İstifadəçi:** 3 saniyə testi — əsas rəqəm və cədvəlin məbləğləri bir baxışda oxunur; sifarişin sətirlərinə bir
  kliklə baxılır və hesabatdakı yer itmir.
- **Ölçü:** 1280 və 1440 px-də səhifə yana sürüşmür; panel bir kliklə açılır; «Geri» vəziyyəti bərpa edir; build
  və testlər yaşıldır; brauzerdə toplanan pul yoxdur.

## 6. İnformasiya arxitekturası

Yuxarıdan aşağı (masaüstü):

1. **Başlıq:** «Aylıq hesabat», il.
2. **Maliyyə zolağı:** 1 əsas + 2 ikinci dərəcəli rəqəm (aşağıdakı cədvəl); altında sayğaclar — Sifariş,
   Obyekt, Qiyməti olmayan.
3. **Filtrlər:** İl · Obyekt axtarışı · Sifariş növü · Sıfırla · Görünüş (Yığcam | Standart).
4. **Əfsanə.**
5. **Cədvəl:** Obyekt | Yan … Dek | İl cəmi; altda «Cəmi» sətri (8.1).
6. **Sağ panel:** xana seçiləndə.

**Maliyyə zolağı — hansı rəqəm haradan** (D-50 №3; README: «the browser never adds anything up»):

| Aktiv növ (`scope`) | Əsas rəqəm | İkinci dərəcəli 1 | İkinci dərəcəli 2 |
|---|---|---|---|
| `Monthly` (açılışda) | «Aylıq sifarişlərin məbləği» — `knownAmount` | «Aylıqdan Kənar sifarişlər» — `outsideMonthlyKnownAmount` | «Ümumi faktiki xərc» — `scope=All` cavabının `knownAmount`-ı |
| `OutsideMonthly` | «Aylıqdan kənar xərclər» — `knownAmount` | «Aylıq sifarişlər» — `monthlyKnownAmount` | «Ümumi faktiki xərc» — `scope=All` cavabının `knownAmount`-ı |
| `All` | «Ümumi faktiki xərc» — `knownAmount` | «Aylıq sifarişlər» — `monthlyKnownAmount` | «Aylıqdan Kənar sifarişlər» — `outsideMonthlyKnownAmount` |

Adlar `analytics/scope.ts` və `orderLines/lineType.ts`-dəki mövcud terminlərdir.

«Ümumi faktiki xərc» bu gün brauzerdə toplanır (`ReportHeadline.tsx:55-58`). Bundan sonra onu server verəcək:
aktiv növ «Hamısı» deyilsə, hər əsas sorğu ilə birlikdə **mövcud** endpoint bir dəfə də `scope=All` ilə
çağırılır. Belə olanda zolağın üç rəqəmi eyni anın cavablarından gəlir (tənqid DK-13; əvvəlki «il üçün bir dəfə»
qaydası ləğv edildi). Backend dəyişmir.

**Cədvəl və panel — hansı rəqəm haradan:**

| Ekranda | API sahəsi |
|---|---|
| Xananın məbləği | `months[].knownAmount` (aktiv növ üzrə) |
| Keçən aya görə faiz və fərq | `deltaPercent`, `deltaAmount`, `previousMonthKnownAmount` |
| 3 aylıq ortalamaya görə faiz | `recentAverageKnownAmount`, `recentAveragePercent` |
| Qeyri-adi ay | `isUnusual` (8.2: ±50%, iki istiqamət) |
| Status, versiya, tarixi idxal | `status`, `version`, `isHistoricalImport` |
| Qiymətsiz sətirlər | `missingPriceItemCount`, `amountIsComplete` |
| Ayın tərkibi | `monthlyKnownAmount`, `outsideMonthlyKnownAmount`, `unclassifiedKnownAmount` + say sahələri |
| İl cəmi, «Cəmi» sətri | `rows[].knownAmount`, `months[]` (MonthlyReportMonth) |
| Sifarişin sətirləri və cəmi | `GET /api/v1/orders/{id}`: `items` (səhifələnir), `knownAmountTotal`, `itemCount`, `missingPriceItemCount` |

## 7. Əhatə

### Must — bu mərhələdə olmalıdır

| ID | Tələb | Mənbə |
|---|---|---|
| M-01 | Açılış görünüşü **Yığcam**dır; Standart seçimlə açılır; görünüş URL-də saxlanır. | D-50 №6 |
| M-02 | Xərc artımı qırmızı, azalması yaşıl — faizdə də, qeyri-adi ay işarəsində də. | D-50 №1; 9.1 |
| M-03 | Qeyri-adi ay yalnız API-nin `isUnusual`-ından gəlir, hər iki istiqamətdə. | D-50 №2; 8.2 |
| M-04 | **Keçən aya görə faiz** və **3 aylıq ortalamaya görə faiz** fərqli görünür, fərqli adlanır və heç vaxt bir-birinin yerinə işlənmir. | D-50 əlavə |
| M-05 | Maliyyə zolağı: 1 əsas + 2 ikinci dərəcəli; §6-dakı cədvəl. Məbləğ tam deyilsə bu, rəqəmin yanında yazılır. | D-50 №3 |
| M-06 | Xanaya klik sağ paneli açır. Panel sifarişin **real sətirlərini** göstərir və «Sifarişə bax» düyməsi (məhsulun mövcud sözü, `openOrderLabel`) sifarişin öz səhifəsini açır. | D-50 №5 |
| M-07 | Saxlanılır: status nöqtələri və əfsanəsi, təsdiq zəngi, «Cəmi» sətri (8.1 — faizsiz və rəngsiz), sifarişdən hesabata qayıdış (24.3), qayıdanda sətrə dönüş, obyekt linki, telefon kartları, gələcək ay, «Sistemdə hələ sifarişi yoxdur», təsnif edilməmiş sətirlər qeydi, hər xananın tooltip-i və accessible name-i. | D-50 əlavə |
| M-08 | Pul formatı yalnız `formatMoney`: «326.951,62 ₼»; faiz `formatPercent`: «+12,5%», «−8%»; naməlum dəyər «—». | D-50 əlavə |
| M-09 | 1280 px, planşet (768) və telefon (390) üçün ayrıca düzülüş. | D-50 əlavə |
| M-10 | Karkas dəyişmir: sidebar 260 px, başlıq 72 px. | D-50 №4; D-V1, D-V2 |
| M-11 | Toxunulan kodda rəng, şrift və ölçü `index.css` tokenlərindən gəlir. 9.1 rəngləri ortaq köməkçidən (`costDirection*`) gəlir; onların tokenə keçidi bütün ekranlara təsir edir və ayrıca tapşırıqdır. | CLAUDE.md |
| M-12 | Klaviatura: hər element Tab ilə; fokus görünür; Enter xananı açır; Esc paneli bağlayır, fokus xanaya qayıdır. | DESIGN_WORKFLOW |
| M-13 | CSS-ə bağlı 30 test (69 sətir) zəiflədilmədən yenilənir: hər yoxlama öz funksional məqsədini eyni və ya daha güclü yoxlama ilə saxlayır. | D-50 əlavə |
| M-14 | Backend, API müqaviləsi və baza dəyişmir. | tapşırığın 6-cı bəndi |

### Should — olmalıdır, amma Must-u gecikdirməməlidir

| ID | Tələb |
|---|---|
| S-01 | Cədvəlin yapışqan başlığı 72 px başlığın altında tam görünür (auditdəki 8 px fərziyyəsi brauzerdə təsdiqlənərsə). |
| S-02 | Obyekt adı və il cəminə görə sıralama; sıra URL-də. |
| S-03 | «Sıfırla» — axtarışı, növü, görünüşü, sıralamanı və seçilmiş xananı sıfırlayır. |
| S-04 | Paneldə sətirləri qiymətə görə süzmək (API `hasPrice` parametrini artıq dəstəkləyir). |

### Could — vaxt qalarsa

| ID | Tələb |
|---|---|
| C-01 | Paneldə sətirlər arasında axtarış (API `search` parametri). |

### Won't — bu mərhələdə yox

| ID | Nə | Niyə |
|---|---|---|
| W-01 | Analitika görünüşü | D-50 №7 |
| W-02 | Karkasın dəyişməsi, o cümlədən Figma-dakı sidebar mətnləri («SİFARİŞ SİSTEMİ», «İŞ SAHƏSİ») | D-50 №4; karkas təsdiqlənib |
| W-03 | Backend/API/baza dəyişikliyi — axtarışa görə hesablanan yuxarı rəqəm (S-1) və cəm üçün yeni sahə də daxil | tapşırığın 6-cı bəndi |
| W-04 | `format.ts` rəng köməkçilərinin və başqa ekranların tokenə keçidi | ayrıca tapşırıq |
| W-05 | Figma faylının düzəldilməsi | D-50: Figma vizual istiqamətdir |

## 8. Qəbul meyarları

| ID | Meyar |
|---|---|
| AC-01 | URL-də `view` yoxdursa Yığcam açılır; Standart seçiləndə URL-ə yazılır; yenidən yükləmə və «Geri» görünüşü bərpa edir. |
| AC-02 | Yığcam: 12 ay; xanada məbləğ, status nöqtəsi, qiymətsiz işarəsi və qeyri-adi işarəsi var; keçən aya görə faiz yoxdur — o, Standart-da və paneldədir. |
| AC-03 | Standart: xanada məbləğ və «keçən aya görə» faiz (9.1 rəngi ilə). Qeyri-adi ayın öz işarəsi var və ortalamaya görə faiz bu işarə ilə birlikdə deyilir. İki faiz eyni üslubda və adsız yanaşı durmur. |
| AC-04 | Qeyri-adi işarə yalnız `isUnusual = true` olan xanada var; artım qırmızı, azalma yaşıl; işarə rəngdən başqa simvol və ya sözlə də fərqlənir. |
| AC-05 | Maliyyə zolağı §6-dakı cədvələ uyğundur; «Ümumi faktiki xərc» API-nin `scope=All` rəqəmidir; brauzerdə heç bir pul toplanmır. Məbləğ tam deyilsə, bu yazılır. |
| AC-06 | Axtarış aktivdirsə, ekran yuxarı rəqəmlərin bütün obyektlər üzrə olduğunu deyir (S-1 cavablanana qədər). |
| AC-07 | Sıralama: adla (açılış, API sırası) və il cəminə görə (azalan/artan); məbləği olmayan sətirlər sonda qalır; sıra URL-dədir. |
| AC-08 | Xanaya klik paneli açır və URL-də xana qeyd olunur. Esc, «Bağla» və brauzerin «Geri»si paneli bağlayır; fokus xanaya qayıdır; arxadakı səhifə oxunur (19.1); telefonda panel tam ekrandır. |
| AC-09 | Panel: xananın rəqəmləri (növün məbləği, keçən aya görə, ortalamaya görə, qeyri-adi izahı, tərkib, qiymətsiz sətirlər, status; «Versiya» sözü işlənmir — əvəzində `replacesEarlierOrderNote`) və sifarişin real sətirləri serverin səhifələri ilə, cavabdeh şəxs də daxil. «Bütün sifarişin məbləği» (`knownAmountTotal`) API-dən gəlir və xananın növ məbləğindən aydın şəkildə ayrılır; «Hamısı» növündə göstərilmir — orada xananın məbləği eyni anlayışdır və 0,01 ₼ yuvarlaqlaşdırma fərqi çaşdıra bilər (03 §6.9.6). Heç nə toplanmır. (DK-29 ilə düzəldilib.) |
| AC-10 | «Sifarişə bax» `/orders/{id}?back=monthly` ünvanını hesabatın işarəsi ilə açır. Sifariş səhifəsindəki «Aylıq hesabat» düyməsi brauzerin «Geri»si kimi hesabata qaytarır: il, axtarış, növ, görünüş, sıra və seçilmiş xana yerində olur (24.3). |
| AC-11 | Xana link olaraq qalır: Ctrl və ya orta düymə ilə klik sifarişi yeni tabda açır. |
| AC-12 | M-07-dəki hər imkan yerindədir və işləyir. |
| AC-13 | Pul «326.951,62 ₼», faiz «+12,5%» / «−8%», naməlum «—» kimi yazılır. |
| AC-14 | 1440 və 1280 px-də səhifə yana sürüşmür; cədvəl lazım gələndə yalnız öz qutusunda sürüşür, obyekt və il cəmi sabit qalır. |
| AC-15 | 768 px-də (planşet) heç bir məlumat itmir və səhifə yana sürüşmür. |
| AC-16 | 390 px-də kartlar göstərilir; heç bir işarə itmir; panel tam ekrandır; toxunma hədəfləri ≥ 44 px. |
| AC-17 | Hər idarəetmə elementinə klaviatura ilə çatılır; fokus görünür; mətn kontrastı ≥ 4,5:1; rəng məlumatın yeganə daşıyıcısı deyil. |
| AC-18 | Build və bütün testlər yaşıl; CSS-ə bağlı 30 test M-13-ə uyğun yenilənib; backend, API və baza faylları dəyişməyib. |

## 9. Risklər

| Risk | Növ | Necə idarə olunur |
|---|---|---|
| Paneldə iki fərqli cəm görünür: xananın növ məbləği (məsələn yalnız aylıq sətirlər) və sifarişin bütün sətirlərinin cəmi | maliyyə mənası | Hər birinin öz adı olur; tərkib onları birləşdirir; rəqəm toplanmır |
| Təsdiq gözləyən ay təsdiqlənmiş kimi oxunur | iş axını | Status nöqtəsi cədvəldə, statusun özü paneldə sözlə deyilir |
| `scope=All` sorğusu ikinci sorğudur: yüklənmə və xəta vəziyyəti lazımdır | məlumat | Yüklənəndə «…», alınmayanda «—» və xəbərdarlıq görünür; heç vaxt brauzer cəmi göstərilmir |
| Bəzi mövcud testlər niyyət dəyişikliyi ilə yenilənməlidir: xana birbaşa sifarişi açmır (D-50 №5); səhifə ikinci sorğu verir (§6) | test | Bu dəyişikliklər `06-implementation.md`-də bir-bir sadalanır; yeni davranış eyni sərtliklə yoxlanır |
| 9.1 rəngləri hələ stock siniflərdədir (`text-red-700`) | kod | Ortaq köməkçi saxlanır; tokenə keçid ayrıca tapşırıqdır (W-04) |
| Çox sətirli sifariş | məlumat | Server səhifələri ilə; panel heç nəyi toplamır |
| Tam test qaçışında timeout | test | `BLOCKERS.md`-də ayrıca açıq məsələ; səbəbi sübutla müəyyən olunmayınca bağlanmır |

## 10. Fərziyyələr

- **[Fərziyyə]** Axtarış bu gün olduğu kimi Enter ilə göndərilir; Figma-dakı ikonlu sahə yalnız görünüşdür.
- **[Fərziyyə]** «Sıfırla» ili saxlayır, çünki il başqa sualın cavabıdır.
- **[Fərziyyə]** Panelin bir səhifəsi 50 sətirdir — sifariş səhifəsindəki kimi.
- **[Fərziyyə]** Analitika olmadığı üçün görünüş keçidində iki seçim var: Yığcam, Standart.
- **[Fərziyyə]** Rənglər və şrift `index.css` tokenlərindəndir. Figma-nın palitrası götürülmür, yalnız görünüşün
  istiqaməti götürülür: daha sakit cədvəl, aydın rəqəm zolağı, sağ panel.

## 11. Sahibə suallar

**S-1 · Əsas rəqəm və obyekt axtarışı.** D-50 №3: «Əsas göstərici aktiv sifariş növünə və filtrlərə uyğun
hesablanmalıdır». API əsas rəqəmi il və sifariş növünə görə hesablayır; obyekt axtarışına görə hesablamır —
yuxarı rəqəmlər həmişə bütün obyektlər üzrədir (`reports.ts`: «Describes every location, never the searched
subset»). Figma-nın öz qeydi də belədir: «İllik göstəricilər cədvəlin yalnız görünən sətirlərinin cəmi deyil».
Axtarışa görə rəqəm iki yolla verilə bilər: brauzerin özü toplayar — bu, qaydaya ziddir; ya da backend dəyişər —
bu isə indi qadağandır.

- **A (tövsiyə):** rəqəm bütün obyektlər üzrə qalır; axtarış aktiv olanda bu, rəqəmin yanında açıq yazılır.
- **B:** sonrakı mərhələdə backend-ə axtarışa görə cəm əlavə olunur — sizin ayrıca icazənizlə.

UX-in qalan açıq məsələləri (məsələn, 1280 px-də cədvəlin necə yerləşəcəyi — B-07) `03-ux.md`-də alternativlərlə
həll olunur və təsdiq paketində (`05-approval.md`) sizə təqdim edilir.
