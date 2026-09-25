# 18 — Səbəbdən drayverə keçidin əl ilə yoxlanışı (Task 18, Səbəbdən drayverə keçid)

Bu fayl Task 18-in brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama aparmayıb:**
Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-18.md`; qərarlar 18.1, 18.2, 18.3):

- «Niyə dəyişib?» bölməsində çipi olan səbəb sətrinə klik aşağıdakı «Əsas dəyişikliklər» siyahısını həmin çipə süzür,
  ünvana `cause=…` yazır və siyahının başlığını ekrana gətirir;
- eyni sətrə ikinci klik süzgəci götürür; çip də eyni seçimi idarə edir;
- «Xidmətlər», «Daxili təminat» və «Variant dəyişib» sətirləri klik edilmir və klik edilən kimi görünmür;
- seçim ünvanda qalır: yenilənmə, «geri» və paylaşılan keçid onu bərpa edir;
- heç bir rəqəm dəyişmir. «N məhsuldan» ilə çipin sayı fərqlidirsə, sətrin altında bir cümlə siyahının nəyi saydığını
  deyir.

Hər ünvan, düymə və sətir yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`). Bu dəstdə heç bir yazma düyməsi basılmır: «Təsdiqlə»,
  «Düzəliş tələb et», «Redaktə et», «Sil» və başqaları. Səbəb sətirləri və çiplər yalnız ekranın oxunuşunu və ünvanı
  dəyişir; heç nə saxlanılmır.
- Sifariş səhifəsini aça bilən hesabla aparılır (Rəhbər və ya Admin).
- **Heydər Əliyev Mərkəzi, Sentyabr 2026 sifarişinin nömrəsi** operator tərəfindən tapılır: «Obyektlər» → «Heydər
  Əliyev Mərkəzi» → «Müqayisə et» (`pages/LocationDetailPage.tsx`:151). Bu düymə obyektin ən son sifarişini açır.
  Səhifənin başlığında «Sentyabr 2026» yazıldığını yoxlayın. Ünvandakı nömrəni B-01-in `Rəqəm:` sətrinə yazın; aşağıda
  `<HEM>` həmin nömrədir. Başlıqda başqa ay yazılıbsa, «Obyektin sifarişləri» siyahısından Sentyabr 2026 sifarişini
  açın. Spesifikasiyada nümunə kimi göstərilən `/orders/154` yoxlanılmamış nümunədir.
- Hər yoxlamaya başlamazdan əvvəl bazanı «Keçən ay» seçin, əgər yoxlama başqa baza istəmirsə.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın. B-14 yalnız `390×844`-dədir.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `B-01-sifaris-1366.png`. Şəkillər
  `docs/audits/2026-qerar-zenciri/ekranlar/` qovluğuna qoyulur. Qovluq yoxdursa, onu yaradın.

## Sətrin forması

Hər yoxlama `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`-dəki on iki sətirlik formadadır:

```
### <ID> — <qısa başlıq>
Mənbə: <brief faylı + bölmə>, sitat: "<bənd, sözbəsöz>"
Harada: <real / sınaq> · <ekran> · <ünvan və ya menyu yolu> · <en(lər)>
Addımlar: <nömrələnmiş addımlar>
Gözlənilən: <brief-in və ya spesifikasiyanın dediyi>
İlk auditdə: <UX auditinin qeyd etdiyi; yoxdursa «brief qeyd etmir»>
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
```

- Ayırıcı sətir məhz belə yazılır: `---- operator doldurur ----`. Onun yuxarısındakı mətni dəyişməyin.
- Heç bir sahəni boş buraxmayın. Yoxlamanı apara bilmədinizsə, `Hökm:` sətrinə «yoxlanıla bilmədi» yazın və
  mötərizədə səbəbini göstərin.
- «Ünvan sətri» brauzerin yuxarısındakı ünvandır. `cause=` onun `?`-dan sonrakı hissəsindədir.

---

## Yoxlamalar

### B-01 — «Yeni məhsullar» sətri: siyahı süzülür, çip seçilir, ünvanda `cause=new`, başlıq ekrana gəlir
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 1-ci bənd, sitat: "Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: "Yeni məhsullar +29.691,52 ₼" sətrinə klik edilir → aşağıdakı siyahı yalnız yeni məhsulları göstərir, "Yeni məhsullar" çipi seçilmiş görünür, ekran siyahıya sürüşür."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Niyə dəyişib?» və «Əsas dəyişikliklər» · `/orders/<HEM>?basis=last`; səbəb sətrinin düyməsi (`components/decisions/CauseSummary.tsx`:177), siyahının başlığı (`components/decisions/DriverList.tsx`:104) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Niyə dəyişib?» bölməsində «Yeni məhsullar» sətrinin məbləğini və «N məhsuldan» sayını yazın; 3) «Əsas dəyişikliklər»-də «Yeni məhsullar» çipinin sayını yazın; 4) səhifəni ən yuxarıya qaytarın; 5) «Yeni məhsullar» sətrinin boş bir yerinə (yazının yox, sətrin sağ tərəfinə, zolağın yanına) klik edin; 6) ekranın harada dayandığını, siyahını, çipləri və ünvan sətrini yazın.
Gözlənilən: 2-ci addımda sətir «Yeni məhsullar … +29.691,52 ₼» oxunur. 5-ci addımdan sonra: siyahıda yalnız yeni məhsullar var; «Yeni məhsullar» çipi seçilmişdir (tünd fonda); səbəb sətrinin ətrafında tünd çərçivə var; ünvan sətrində `basis=last` qalıb və `cause=new` əlavə olunub; ekran sürüşüb və «Əsas dəyişikliklər» başlığı ilə çiplər yuxarıdakı sabit başlıq zolağının (`layout/Header.tsx`:12, 64 piksel) **altında**, görünən yerdədir — başlıq zolağının arxasında gizlənmir. Heç bir rəqəm dəyişməyib.
İlk auditdə: səbəb sətrinin üstünə klikləmək mümkün deyildi; siyahı ilə çip iki ekran aşağıda idi və oxucu uyğun çipi özü tapmalı idi (`TASKS/TASK-18.md`, §1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-02 — «Bu ay yazılmayan məhsullar» və «Qiymət yoxdur» sətirləri öz çiplərini açır
Mənbə: `BRIEFS/TASK-18.md`, «Tələb», 1-ci bənd, sitat: ""Niyə dəyişib?" bölməsindəki səbəb sətrinə klik aşağıdakı "Əsas dəyişikliklər" siyahısını həmin səbəbə süzsün və oxucunu siyahıya gətirsin."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` və ya bu iki sətri olan başqa sifariş; səbəb → çip cədvəli (`components/decisions/causeFilter.ts`:12–21) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın. «Bu ay yazılmayan məhsullar» və ya «Qiymət yoxdur» sətri yoxdursa, onu olan bir sifariş açın və nömrəsini `Qeyd:` sətrinə yazın; 2) «Bu ay yazılmayan məhsullar» sətrinə klik edin; siyahını, seçilmiş çipi və ünvan sətrini yazın; 3) sətrə yenidən klik edin; 4) «Qiymət yoxdur» sətrinə klik edin; siyahını, seçilmiş çipi və ünvan sətrini yazın; 5) sətirin rənginə baxın.
Gözlənilən: 2-ci addımda «Bu ay yazılmayan məhsullar» çipi seçilir, ünvanda `cause=dropped`. 4-cü addımda «Qiymət yoxdur» çipi seçilir, ünvanda `cause=noprice`. Hər dəfə siyahı yalnız həmin çipin məhsullarını göstərir və başlıq ekrana gəlir. «Qiymət yoxdur» etiketi əvvəlki kimi sarı (kəhrəba) qalır; seçim etiketin rəngini deyil, sətrin ətrafındakı tünd çərçivəni dəyişir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-03 — «Miqdar təsiri» və «Qiymət təsiri» sətirləri öz çiplərini açır
Mənbə: `BRIEFS/TASK-18.md`, «Tələb», 1-ci bənd, sitat: ""Niyə dəyişib?" bölməsindəki səbəb sətrinə klik aşağıdakı "Əsas dəyişikliklər" siyahısını həmin səbəbə süzsün və oxucunu siyahıya gətirsin."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Miqdar təsiri» sətrinə klik edin; siyahını, seçilmiş çipi və ünvan sətrini yazın; 3) siyahıda həm miqdarı, həm qiyməti dəyişmiş bir məhsulun sətrini tapın (etiketi «Miqdar və qiymət») və onun iki sətirlik izahını yazın; 4) «Qiymət təsiri» sətrinə klik edin; siyahını, seçilmiş çipi və ünvan sətrini yazın.
Gözlənilən: 2-ci addımda «Miqdar dəyişən» çipi seçilir, ünvanda `cause=qty`. 4-cü addımda «Qiymət dəyişən» çipi seçilir, ünvanda `cause=price`. 3-cü addımdakı məhsul hər iki siyahıdadır və sətri əvvəlki kimi tamdır, məsələn «Zibil paketi · 35 → 30 paket · Qiymət 32,00 ₼ → 34,00 ₼ (+6,25%)» və altında «Miqdar −160,00 ₼ · Qiymət +60,00 ₼», sağda «−100,00 ₼». Bu nümunə UX auditinin datasındandır və Planner tərəfindən yenidən oxunmayıb; ekrandakı faktiki sətri yazın.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-04 — Seçilmiş sətrə ikinci klik süzgəci götürür və ekranı sürüşdürmür
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 3-cü bənd, sitat: "Eyni sətrə ikinci dəfə klik edilir → siyahı "Hamısı"-ya qayıdır."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) B-01-in 1–5-ci addımlarını edin; 2) səhifəni «Niyə dəyişib?» bölməsinə qədər yuxarı qaldırın; 3) «Yeni məhsullar» sətrinə yenidən klik edin; 4) ekranın yerini, çipləri və ünvan sətrini yazın.
Gözlənilən: siyahı «Hamısı»-ya qayıdır; «Hamısı» çipi seçilmişdir; sətrin ətrafındakı tünd çərçivə itir; ünvandan `cause=` silinir, `basis=last` qalır; ekran 2-ci addımdakı yerində qalır (aşağı sürüşmür).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-05 — Çip də eyni seçimi idarə edir: ünvanı yazır, səbəbi seçilmiş göstərir, ekranı sürüşdürmür
Mənbə: `BRIEFS/TASK-18.md`, «Tələb», 4-cü bənd, sitat: "Çiplər qalsın və eyni vəziyyəti idarə etsin: çipə klik də URL-i yeniləsin."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Əsas dəyişikliklər»-in çipləri (`components/decisions/DriverList.tsx`:115–123) · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) səhifəni «Əsas dəyişikliklər»-ə qədər aşağı sürüşdürün; 3) «Qiymət dəyişən» çipinə klik edin; 4) ekranın yerini və ünvan sətrini yazın; 5) yuxarı qalxın və «Qiymət təsiri» sətrinə baxın; 6) «Hamısı» çipinə klik edin və ünvan sətrini yazın.
Gözlənilən: 3-cü addımdan sonra ünvanda `cause=price`; ekran yerində qalır (çip klikində sürüşmə yoxdur); 5-ci addımda «Qiymət təsiri» sətrinin ətrafında tünd çərçivə var. 6-cı addımda `cause=` ünvandan silinir və çərçivə itir. Çiplərin adları, sırası və sayları əvvəlki kimidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-06 — Çipi olmayan üç səbəb: «Xidmətlər», «Daxili təminat», «Variant dəyişib» — kursor, işıqlanma, fokus, klik
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 4-cü bənd, sitat: ""Xidmətlər" sətrinin üstünə gəlinir → kursor dəyişmir, sətir işıqlanmır, klik heç nə etmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Niyə dəyişib?» · `/orders/<HEM>?basis=last`; «Daxili təminat» və ya «Variant dəyişib» sətri olmayan sifarişdə onu olan başqa sifariş; cədvəl (`components/decisions/causeFilter.ts`:18–20) · dörd en (siçan ilə olan addımlar `390×844`-də «yoxlanıla bilmədi (toxunma ekranı)» ola bilər)
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) siçanı «Xidmətlər» sətrinin üzərinə, etiketin, məbləğin və zolağın üstünə gətirin; kursoru və sətrin fonunu yazın; 3) sətrin boş yerinə, etiketinə və məbləğinə klik edin; ünvan sətrini və siyahını yazın; 4) `Tab` ilə sətirlərdən keçin və fokusun «Xidmətlər» sətrinin özündə dayanıb-dayanmadığını yazın; 5) 2–4-cü addımları «Daxili təminat» və «Variant dəyişib» sətirləri üçün təkrarlayın. Hansısa sətir heç bir sifarişdə tapılmırsa, `Qeyd:` sətrinə yazın. Sətir üçün hansı sifarişdən istifadə etdiyinizi də yazın.
Gözlənilən: hər üç sətirdə kursor adi ox qalır; sətrin fonu dəyişmir; klik heç nə etmir (ünvan və siyahı dəyişmir); sətrin özü fokus dayanacağı deyil, onun yalnız ⓘ düyməsi fokus alır. Bu sətirlər əvvəlki kimi görünür: nə çərçivə, nə boz görünüş, nə «bağlıdır» işarəsi.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-07 — Yenilənmə süzülmüş görünüşü bərpa edir; «geri» süzgəcsiz görünüşü qaytarır və səhifəni tərk etmir
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 2-ci bənd, sitat: "Həmin an ünvan sətrində seçim görünür; səhifə yenilənir → eyni süzülmüş görünüş qayıdır; "geri" basılır → süzgəcsiz görünüş qayıdır, səhifə tərk edilmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Yeni məhsullar» sətrinə klik edin; 3) ünvan sətrini yazın; 4) səhifəni yeniləyin (`F5`); 5) siyahını, çipi, səbəb sətrinin çərçivəsini və ekranın yerini yazın; 6) brauzerin «geri» düyməsini bir dəfə basın; 7) ünvan sətrini, siyahını və hansı səhifədə olduğunuzu yazın.
Gözlənilən: 3-cü addımda ünvanda `cause=new`. 5-ci addımda eyni süzülmüş görünüş qayıdır: «Yeni məhsullar» çipi seçilmiş, sətir çərçivəli. Yenilənmədən sonra tətbiq ekranı özü sürüşdürmür. 7-ci addımda ünvanda `cause=` yoxdur, `basis=last` qalıb, siyahı «Hamısı»-dır və siz hələ də həmin sifarişin səhifəsindəsiniz. Qeyd: «geri»dən sonra brauzer ekranı əvvəlki yerinə qaytara bilər; bu, brauzerin öz davranışıdır və tətbiqin sürüşdürməsi deyil.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-08 — Baza dəyişəndə seçim qalır; səbəb seçiləndə baza, «Cəmi», məbləğlər və sıra dəyişmir
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 5-ci bənd, sitat: "Müqayisə bazası səbəb seçiləndə dəyişmir; "Cəmi", hissələrin məbləği və sırası dəyişmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, müqayisə bazası seçicisi və «Niyə dəyişib?» · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Niyə dəyişib?»-də «Cəmi»ni, hər sətrin adını, məbləğini və «N məhsuldan» sayını sırası ilə, həmçinin hər çipin sayını yazın; 3) «Yeni məhsullar» sətrinə klik edin; 4) 2-ci addımdakı hər şeyi yenidən yazın və seçilmiş bazanı yazın; 5) yuxarıdakı seçicidə «Son 3 ayın ortalaması» düyməsini basın; 6) ünvan sətrini, seçilmiş çipi və səbəb sətrinin çərçivəsini yazın.
Gözlənilən: 4-cü addımda baza yenə «Keçən ay»dır və 2-ci addımdakı bütün rəqəmlər, adlar və sıra tam eynidir. 6-cı addımda ünvanda `basis=avg3` və `cause=new` birlikdədir; «Yeni məhsullar» çipi seçilmiş qalır (yeni bazada yeni məhsul yoxdursa, çip «Yeni məhsullar 0» kimi seçilmiş görünür və siyahı «Bu növ üzrə dəyişiklik yoxdur.» deyir). Rəqəmlər yeni bazaya görədir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-09 — Hazır keçid (`basis` + `cause`): süzülmüş açılır və ekranı sürüşdürmür
Mənbə: `TASKS/TASK-18.md`, §9, 7-ci meyar, sitat: "`/orders/<id>?basis=avg3&cause=price` opens on the 3-month basis with "Qiymət dəyişən" selected and "Qiymət təsiri" pressed, and does not scroll on load."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=avg3&cause=price`, ünvan sətrinə yazılaraq · dörd en
Addımlar: 1) başqa bir səhifədə olarkən ünvan sətrinə `/orders/<HEM>?basis=avg3&cause=price` yazın və `Enter` basın; 2) səhifə yüklənəndən sonra ekranın yerini yazın; 3) seçilmiş bazanı, seçilmiş çipi və çərçivəli səbəb sətrini yazın; 4) sonra ünvanı `/orders/<HEM>?basis=avg3&cause=xyz` edib açın və siyahını və ünvan sətrini yazın.
Gözlənilən: 2-ci addımda səhifə ən yuxarıdadır (özü sürüşmür). 3-cü addımda baza «Son 3 ayın ortalaması», «Qiymət dəyişən» çipi seçilmiş, «Qiymət təsiri» sətri çərçivəlidir (bu bazada «Qiymət təsiri» sətri yoxdursa, `Qeyd:`-də yazın; çip yenə seçilmiş görünür). 4-cü addımda tanınmayan dəyər «Hamısı» kimi oxunur, səhifə xəta vermir və ünvandakı `cause=xyz` olduğu kimi qalır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-10 — Klaviatura: `Tab` ilə çatılır, `Enter` və `Space` ilə basılır, seçim vəziyyəti deyilir
Mənbə: `TASKS/TASK-18.md`, §9, 8-ci meyar, sitat: "Keyboard: an interactive reason row is reachable by `Tab`, activates with `Enter` and `Space`, and reports its selected state. An inert row is not itself a tab stop; its ⓘ is, as today."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Niyə dəyişib?» · `/orders/<HEM>?basis=last` · `1366×768`, `1440×900`, `1200×800` (telefonda klaviatura yoxdur: `390×844` üçün «yoxlanıla bilmədi (klaviatura yoxdur)»)
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) `Tab` ilə «Niyə dəyişib?» bölməsinə gəlin; fokus çərçivəsinin harada göründüyünü yazın; 3) «Yeni məhsullar» sətrində `Enter` basın; ünvan sətrini yazın; 4) `Shift+Tab` ilə yenidən həmin sətrə qayıdın və `Space` basın; ünvan sətrini yazın; 5) `Tab` ilə bütün səbəb sətirlərindən keçin və fokusun dayandığı yerləri sırası ilə yazın. Ekran oxuyucusu varsa (NVDA, Narrator), 3-cü addımda nə dediyini yazın.
Gözlənilən: 2-ci addımda fokus çərçivəsi bütün «Yeni məhsullar» sətrinin ətrafında görünür (yalnız etiketin yox). 3-cü addımda sətir seçilir, ünvanda `cause=new`, ekran siyahıya sürüşür; 4-cü addımda seçim götürülür, `cause=` silinir. 5-ci addımda hər çipi olan sətir bir fokus dayanacağıdır və ondan sonra onun ⓘ düyməsi gəlir; «Xidmətlər» kimi sətirlərdə fokus yalnız ⓘ-yə düşür. Ekran oxuyucusu sətri «Yeni məhsullar, +29.691,52 ₼» adı ilə və basılı / basılmamış vəziyyəti ilə oxuyur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-11 — Çipi olan sətrin içindəki ⓘ: qeydini açır, sətri seçmir
Mənbə: `TASKS/TASK-18.md`, §8, sitat: "`InfoHint`'s behaviour inside a reason row, including 17.1's capture-phase `Escape`."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Yeni məhsullar nədir?» ⓘ (`components/decisions/CauseSummary.tsx`:191) · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Yeni məhsullar» sətrindəki ⓘ düyməsinə klik edin (telefonda toxunun); 3) açılan qeydi, ünvan sətrini və siyahını yazın; 4) `Escape` basın (telefonda qeydin kənarına toxunun); 5) ünvan sətrini və siyahını yenidən yazın; 6) `390×844`-də ⓘ-ni ekranın aşağısına yaxın olanda açın və qeydin aşağıdakı sabit qərar zolağının («Təsdiqlə» düymələri) üstündə göründüyünü yazın.
Gözlənilən: 2-ci addımda yalnız qeyd açılır: «Keçən ay sifariş olunmayan, bu ay sifariş olunan məhsullar.» Ünvan və siyahı dəyişmir, sətir seçilmir. 4-cü addımda qeyd bağlanır, fokus ⓘ-də qalır, səhifədə başqa heç nə dəyişmir. 6-cı addımda qeyd qərar zolağının və yuxarıdakı başlıq zolağının üstündədir, onların arxasında qalmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-12 — «Hərəkəti azalt» seçimi: sürüşmə animasiyasız olur
Mənbə: `TASKS/TASK-18.md`, §4.3, sitat: "A missing `matchMedia` is treated as "reduce", so the page never animates when it cannot ask."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last`; kod (`pages/OrderDetailPage.tsx`:112–119) · `1366×768` (başqa enlər istəyə görə)
Addımlar: 1) Windows-da «Parametrlər» → «Əlçatanlıq» → «Vizual effektlər» → «Animasiya effektləri»ni **açıq** saxlayın; 2) `/orders/<HEM>?basis=last` açın, «Yeni məhsullar» sətrinə klik edin və sürüşmənin necə olduğunu yazın (hamar / ani); 3) sətrə yenidən klik edib süzgəci götürün və səhifəni yuxarı qaldırın; 4) «Animasiya effektləri»ni **bağlayın**, brauzeri yeniləyin; 5) 2-ci addımı təkrarlayın və sürüşmənin necə olduğunu yazın.
Gözlənilən: 2-ci addımda ekran hamar sürüşür. 5-ci addımda ekran bir anda, animasiyasız siyahıya keçir. Hər iki halda «Əsas dəyişikliklər» başlığı sabit başlıq zolağının altında görünür.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-13 — İki say bir sözün altında: «58 məhsuldan» qalır, altındakı cümlə siyahının nəyi saydığını deyir
Mənbə: `BRIEFS/TASK-18.md`, «Qəbul», 6-cı bənd, sitat: "Səbəb sətri ilə açdığı çip eyni sözün altında iki fərqli rəqəm göstərmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Niyə dəyişib?»-in «Yeni məhsullar» sətri, cümlə (`components/decisions/CauseSummary.tsx`:203; mətni `components/decisions/labels.ts`:175) · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) «Yeni məhsullar» sətrindəki «N məhsuldan» sayını yazın; 3) «Yeni məhsullar» çipinin sayını yazın; 4) səbəb sətrinin altındakı cümləni **sözbəsöz** yazın; cümlədə hansı hissələrin («Daxili təminat», «Qiymət yoxdur», «Variant dəyişib» və ya başqa) adlandığını ayrıca yazın; 5) həmin sətrə klik edin və siyahıda cümlədə deyilən sayda məhsul olduğunu sayın («Hamısına bax (N)» düyməsindəki N də olar); 6) «Bu ay yazılmayan məhsullar» sətri üçün 2–4-cü addımları təkrarlayın.
Gözlənilən: 2-ci addımda «58 məhsuldan», 3-cü addımda «Yeni məhsullar 60» — hər iki rəqəm əvvəlki kimidir, heç biri dəyişməyib. 4-cü addımda sətrin altında belə bir cümlə var: «Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «…» hissəsində olanları da (iki və ya daha çox hissə adlanırsa: «…» və «…» hissələrində olanları da). Adlanan hissələr ekrandakı «Niyə dəyişib?» sətirlərinin adlarıdır. 5-ci addımda siyahıda cümlədəki qədər məhsul var. 6-cı addımda iki say eynidirsə, cümlə yoxdur; fərqlidirsə, eyni formada cümlə var.
İlk auditdə: sətir «Yeni məhsullar · 58 məhsuldan», çip isə «Yeni məhsullar 60» oxunurdu və heç nə fərqi izah etmirdi (`TASKS/TASK-18.md`, §2.5)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-14 — Telefon, 390 × 844: sətrə toxunmaq siyahını açır, başlıq görünür, qərar zolağı heç nəyi örtmür
Mənbə: `BRIEFS/TASK-18.md`, «Tələb», 1-ci bənd, sitat: ""Niyə dəyişib?" bölməsindəki səbəb sətrinə klik aşağıdakı "Əsas dəyişikliklər" siyahısını həmin səbəbə süzsün və oxucunu siyahıya gətirsin."
Harada: real (yalnız oxuma) · sifariş səhifəsi, telefon görünüşü · `/orders/<HEM>?basis=last` · `390×844`
Addımlar: 1) brauzerin cihaz rejimində (və ya telefonda) `390×844` seçin; 2) `/orders/<HEM>?basis=last` açın və «Niyə dəyişib?» bölməsinə qədər sürüşdürün; 3) «Yeni məhsullar» sətrinin boş bir yerinə toxunun; 4) ekranın harada dayandığını, başlığın və çiplərin görünüb-görünmədiyini yazın; 5) aşağıdakı sabit qərar zolağının («Təsdiqlə», «Düzəliş tələb et») siyahının ilk sətirlərini örtüb-örtmədiyini yazın; 6) «Xidmətlər» sətrinə toxunun və nəyin dəyişdiyini yazın. Qərar zolağının düymələrinə **basmayın**.
Gözlənilən: 3-cü addımda siyahı yeni məhsullara süzülür və ekran siyahının başlığına sürüşür; başlıq və çiplər yuxarıdakı başlıq zolağının altında görünür. Sətrin məzmunu (etiket, məbləğ, zolaq, cümlə) sıxılmır və yana sürüşmür. 6-cı addımda heç nə dəyişmir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
