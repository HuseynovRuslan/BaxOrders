# 19 — Məhsul tarixçəsi çekməcəsinin əl ilə yoxlanışı (Task 19, Məhsul tarixçəsi çekməcəsi)

Bu fayl Task 19-un brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama aparmayıb:**
Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-19.md`; qərarlar 19.1, 19.2, 19.3):

- «Əsas dəyişikliklər»-də məhsul sətrinə klik məhsul tarixçəsini ortadakı pəncərədə yox, **sağdan açılan çekməcədə**
  açır; açıq ikən sifarişin məbləği, «Baza» və «Fərq» oxunaqlı qalır; dar ekranda çekməcə tam ekrandır;
- açıq çekməcə ünvandadır (`product=…`): «geri» əvvəlcə çekməcəni bağlayır, səhifəni tərk etmir; `Escape`, «Bağla» və
  arxa fona klik də bağlayır və tarixçəyə artıq addım qoymur;
- çekməcə açılıb-bağlananda müqayisə bazası (`basis=`) və səbəb süzgəci (`cause=`) dəyişmir;
- paylaşılan ünvan eyni sifarişdə, eyni baza ilə eyni məhsulun çekməcəsini açır;
- tezlik cümləsi («Son 9 ayın 1-də sifariş edilib») çekməcənin ən yuxarısındadır;
- yalnız bir ayda sifariş olunmuş məhsulda qrafik, göstərici düymələri və boşluq qeydi yoxdur; rəqəmlər cədvəldədir;
- çekməcənin açılması sifarişin məlumatını yenidən yükləmir.

Hər ünvan, düymə və sətir yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`). Bu dəstdə heç bir yazma düyməsi basılmır: «Təsdiqlə»,
  «Düzəliş tələb et», «Redaktə et», «Sil» və başqaları. Çekməcə, çiplər və baza düymələri yalnız ekranın oxunuşunu və
  ünvanı dəyişir; heç nə saxlanılmır.
- Sifariş səhifəsini aça bilən hesabla aparılır (Rəhbər və ya Admin).
- **Əsas sifariş — `<HEM>`.** Heydər Əliyev Mərkəzi, Sentyabr 2026 sifarişi. Operator onu tapır: «Obyektlər» →
  «Heydər Əliyev Mərkəzi» → «Müqayisə et» (`pages/LocationDetailPage.tsx`:151). Bu düymə obyektin ən son sifarişini
  açır. Səhifənin başlığında «Sentyabr 2026» yazıldığını yoxlayın; başqa ay yazılıbsa, «Obyektin sifarişləri»
  siyahısından Sentyabr 2026 sifarişini açın. Ünvandakı nömrəni C-01-in `Rəqəm:` sətrinə yazın; aşağıda `<HEM>` həmin
  nömrədir. Spesifikasiyada nümunə kimi göstərilən `/orders/154` yoxlanılmamış nümunədir.
- **Çox ayda sifariş olunmuş məhsul — `<ÇOX>`.** `<HEM>`-in «Əsas dəyişikliklər» siyahısında çekməcəsi «Son N ayın
  M-də sifariş edilib» deyən və M-i 2 və ya daha çox olan hər hansı məhsul. Adını C-01-in `Qeyd:` sətrinə yazın.
- **Yeni məhsul — `<YENİ>`.** `<HEM>`-də «Yeni məhsullar» çipinin altındakı hər hansı məhsul. Adını C-07-nin `Qeyd:`
  sətrinə yazın.
- **Tək ayda sifariş olunmuş məhsul — `<AĞAC>`.** Brief-in nümunəsi «Ağac dirəyi metal», Sentyabr 2026. Hansı obyektin
  sifarişində olduğu yazılmayıb; operator onu tapır, məsələn obyektlərin Sentyabr 2026 sifarişlərini açıb «Sətirlər»
  bölməsinin axtarışına «Ağac dirəyi» yazmaqla. Tapılan sifarişin nömrəsini C-13-ün `Rəqəm:` sətrinə yazın; aşağıda
  `<AĞAC>` həmin nömrədir. Tapılmasa, çekməcəsi «Son N ayın 1-də sifariş edilib» deyən başqa bir məhsuldan istifadə
  edin və bunu `Qeyd:`-də yazın.
- Məhsulun **variant nömrəsi** (`<V>`) çekməcə açıq ikən ünvan sətrindəki `product=` dəyəridir.
- Hər yoxlamaya başlamazdan əvvəl bazanı «Keçən ay» seçin, əgər yoxlama başqa baza istəmirsə.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın. C-02 bundan başqa `1280×800`-də də aparılır. C-03 yalnız `390×844`-dədir.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `C-01-cekmece-1440.png`. Şəkillər
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
- «Ünvan sətri» brauzerin yuxarısındakı ünvandır. `product=`, `cause=` və `basis=` onun `?`-dan sonrakı hissəsindədir.
- «Geri» brauzerin öz geri düyməsidir (və ya `Alt+←`), səhifədəki heç bir keçid deyil.

---

## Yoxlamalar

### C-01 — Məhsul sətrinə klik: çekməcə sağdan açılır, ünvana `product=` yazılır, arxadakı qərar oxunur
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 1-ci bənd, sitat: "Sifariş səhifəsində məhsul adına klik edilir → çekməcə sağdan açılır; sol tərəfdə məbləğ, "Baza" və "Fərq" oxunaqlı qalır."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Əsas dəyişikliklər» · `/orders/<HEM>?basis=last`; sətrin düyməsi (`components/decisions/DriverList.tsx`:150–179), açılış (`pages/OrderDetailPage.tsx`:138), çekməcənin yeri (`components/imports/review/Modal.tsx`:156, :170) · dörd en
Addımlar: 1) səhifəni başqa bir səhifədən (məsələn «İdarəetmə paneli») açın ki, «geri» üçün əvvəlki səhifə olsun; 2) `/orders/<HEM>?basis=last` açın; 3) başlıqdakı məbləği, «Baza»nı və «Fərq»i yazın; 4) «Əsas dəyişikliklər»-də `<ÇOX>` sətrinə klik edin; 5) çekməcənin ekranın hansı tərəfində, hansı hündürlükdə açıldığını, arxadakı səhifənin nə qədər qaraldığını və ünvan sətrini yazın; 6) çekməcə açıq ikən 3-cü addımdakı üç rəqəmi yenidən oxuyun.
Gözlənilən: çekməcə ekranın sağ kənarına bitişik, yuxarıdan aşağıya tam hündürlükdə açılır; ortada, künclü kart kimi açılmır. Arxadakı səhifə yüngül qaralır (əvvəlki pəncərədən açıq). Ünvanda `basis=last` qalıb və `product=<V>` əlavə olunub. `1440×900`-də məbləğ, «Baza» və «Fərq» çekməcənin solunda görünür və oxunur, rəqəmləri 3-cü addımdakı ilə eynidir. Çekməcə ani açılır, sürüşərək gəlmir. Başlığında «Məhsul tarixçəsi», altında məhsulun adı var.
İlk auditdə: pəncərə ekranın ortasını tuturdu və arxadakı məbləği, «Baza»nı, «Fərq»i örtürdü (`BRIEFS/TASK-19.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-02 — Hansı endə qərar konteksti görünür: məbləğ, «Baza», «Fərq»; baza seçicisi; sürüşmə zolağı
Mənbə: `TASKS/TASK-19.md`, §4.2, sitat: "From a `1280px`-wide viewport up, the open drawer must not cover the order headline's **amount, `Baza` and `Fərq`**. They stay readable beside it, behind the light scrim. Below `1280px` the drawer may overlap them, and below `sm` it is full-screen."
Harada: real (yalnız oxuma) · sifariş səhifəsi, başlıq (`components/decisions/DecisionHeadline.tsx`:69 məbləğ, :127 «Baza», :131 «Fərq», :106 baza seçicisi) · `/orders/<HEM>?basis=last` · `1280×800`, `1366×768`, `1440×900`, `1200×800`
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) hər en üçün ayrıca: `<ÇOX>` sətrinə klik edin; 3) məbləğin, «Baza» sətrinin və «Fərq» sətrinin (məbləğ və faiz) çekməcə tərəfindən örtülüb-örtülmədiyini, tam oxunub-oxunmadığını yazın; 4) başlığın altındakı baza seçicisinin beş düyməsindən hansılarının görünən, hansılarının çekməcənin arxasında qaldığını yazın; 5) çekməcəni açanda və bağlayanda səhifənin məzmununun sağa-sola tərpənib-tərpənmədiyini (sürüşmə zolağının itməsi) yazın.
Gözlənilən: `1280×800`, `1366×768` və `1440×900`-də məbləğ, «Baza» və «Fərq» tam görünür və oxunur; çekməcə onları örtmür. `1200×800`-də çekməcə onları qismən örtə bilər; bu, gözlənilən haldır — nəyin örtüldüyünü yazın. Baza seçicisi «sığdığı yerdə görünür»: örtülən düymələri yazın; bu, keçmədi sayılmır, çünki çekməcə açıq ikən seçici onsuz da istifadə olunmur. Sürüşmə zolağının itməsi ilə səhifənin bir neçə piksel tərpənməsi bütün pəncərələrdə olan köhnə davranışdır; varsa, `Qeyd:`-də yazın, keçmədi sayılmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-03 — Telefon, 390 × 844: çekməcə tam ekrandır, «Bağla» yana sürüşmədən əlçatandır
Mənbə: `BRIEFS/TASK-19.md`, «Tələb», 1-ci bənd, sitat: "Dar ekranda çekməcə tam ekrana keçsin."
Harada: real (yalnız oxuma) · sifariş səhifəsi, telefon görünüşü · `/orders/<HEM>?basis=last` · `390×844`
Addımlar: 1) brauzerin cihaz rejimində (və ya telefonda) `390×844` seçin; 2) `/orders/<HEM>?basis=last` açın və «Əsas dəyişikliklər»-ə qədər sürüşdürün; 3) `<ÇOX>` sətrinə toxunun; 4) çekməcənin ekranın enini və hündürlüyünü tam tutub-tutmadığını yazın; 5) çekməcənin içini aşağıya qədər sürüşdürün; başlığın («Məhsul tarixçəsi» və ×) yerində qalıb-qalmadığını və arxadakı səhifənin sürüşüb-sürüşmədiyini yazın; 6) cədvəli yana sürüşdürməyə çalışın; 7) × düyməsinə yana sürüşdürmədən toxunun. Aşağıdakı qərar zolağının düymələrinə **basmayın**.
Gözlənilən: çekməcə bütün ekranı tutur; kənarda arxa səhifədən zolaq qalmır. İçi sürüşəndə başlıq və × yuxarıda qalır, arxadakı səhifə tərpənmir. Səhifənin özü yana sürüşmür (yalnız cədvəl öz çərçivəsinin içində yana sürüşə bilər). × ilk baxışda görünür və bir toxunuşla çekməcəni bağlayır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-04 — `Escape` bağlayır, səhifə yerində qalır; növbəti «geri» səhifəni tərk edir
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 2-ci bənd, sitat: "`Escape` basılır → çekməcə bağlanır, səhifə yerində qalır."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last`; bağlanma (`pages/OrderDetailPage.tsx`:152–169) · `1366×768`, `1440×900`, `1200×800` (telefonda `Escape` yoxdur: `390×844` üçün «yoxlanıla bilmədi (klaviatura yoxdur)»)
Addımlar: 1) başqa bir səhifədən `/orders/<HEM>?basis=last`-a keçin; 2) səhifəni «Əsas dəyişikliklər»-ə qədər sürüşdürün; 3) `<ÇOX>` sətrinə klik edin; 4) `Escape` basın; 5) ekranın yerini və ünvan sətrini yazın; 6) brauzerin «geri» düyməsini bir dəfə basın və hansı səhifədə olduğunuzu yazın.
Gözlənilən: 4-cü addımda çekməcə bağlanır. 5-ci addımda ekran 2-ci addımdakı yerindədir, ünvanda `product=` yoxdur, `basis=last` qalıb. 6-cı addımda 1-ci addımdakı əvvəlki səhifəyə keçirsiniz — `Escape` tarixçəyə artıq addım qoymayıb, «geri»ni ikinci dəfə basmaq lazım olmur.
İlk auditdə: `Escape` pəncərəni bağlamırdı (Task 17-dən əvvəl; `TASKS/TASK-19.md`, §2.3)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-05 — «Bağla» × və arxa fona klik bağlayır; çekməcənin içinə klik bağlamır
Mənbə: `TASKS/TASK-19.md`, §4.3, sitat: "**Closing** is `closeProduct()`, which is passed as the drawer's `onClose`. `Escape`, «Bağla» × and a backdrop press all reach it."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en (arxa fon `390×844`-də görünmür: orada «yoxlanıla bilmədi (arxa fon yoxdur)»)
Addımlar: 1) başqa bir səhifədən `/orders/<HEM>?basis=last`-a keçin; 2) `<ÇOX>` sətrinə klik edin; 3) çekməcənin içində boş bir yerə, başlığa və cədvələ klik edin; 4) çekməcənin öz sürüşmə zolağını siçanla sürükləyin; 5) sağ yuxarıdakı × düyməsinə klik edin; ünvan sətrini yazın; 6) yenidən `<ÇOX>` sətrinə klik edin; 7) çekməcənin solunda, qaralmış arxa fona klik edin; ünvan sətrini yazın; 8) «geri» düyməsini bir dəfə basın.
Gözlənilən: 3-cü və 4-cü addımlarda çekməcə açıq qalır. 5-ci və 7-ci addımlarda çekməcə bağlanır, ünvanda `product=` yoxdur, `basis=last` qalıb, səhifə yerində qalır. 8-ci addımda 1-ci addımdakı əvvəlki səhifəyə keçirsiniz.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-06 — «Geri» bir dəfə: çekməcə bağlanır, səhifə qalır; ikinci dəfə: əvvəlki səhifə
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 2-ci bənd, sitat: ""Geri" basılır → çekməcə bağlanır, səhifə yerində qalır; ikinci dəfə "geri" → əvvəlki səhifə."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en (telefonda brauzerin geri düyməsi və ya geri jesti)
Addımlar: 1) «İdarəetmə paneli»ndən başlayın və oradan `<HEM>` sifarişinə keçin (məsələn obyektin kartı ilə və ya ünvanı yazaraq); 2) `<ÇOX>` sətrinə klik edin; 3) brauzerin «geri» düyməsini bir dəfə basın; 4) hansı səhifədə olduğunuzu, çekməcənin vəziyyətini, ekranın yerini və ünvan sətrini yazın; 5) «geri» düyməsini ikinci dəfə basın; 6) hansı səhifədə olduğunuzu yazın.
Gözlənilən: 3-cü addımda çekməcə bağlanır və siz həmin sifariş səhifəsində qalırsınız; ünvanda `product=` yoxdur, `basis=last` qalıb. 5-ci addımda 1-ci addımdakı səhifəyə qayıdırsınız. Qeyd: «geri»dən sonra brauzer ekranı əvvəlki yerinə qaytara bilər; bu, brauzerin öz davranışıdır.
İlk auditdə: «geri» pəncərəni bağlamırdı, birbaşa panelə atırdı və bütün drill-down itirdi (`BRIEFS/TASK-19.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-07 — Baza və səbəb süzgəci açılıb-bağlananda dəyişmir, hansı yolla bağlanırsa bağlansın
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 3-cü bənd, sitat: "Çekməcə açılıb-bağlandıqdan sonra müqayisə bazası və səbəb süzgəci dəyişməmiş qalır."
Harada: real (yalnız oxuma) · sifariş səhifəsi, baza seçicisi və «Əsas dəyişikliklər»-in çipləri · `/orders/<HEM>?basis=avg3&cause=new` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=avg3&cause=new` açın; 2) seçilmiş bazanı («Son 3 ayın ortalaması»), seçilmiş çipi («Yeni məhsullar»), siyahıdakı məhsulların adlarını və başlıqdakı məbləğ, «Baza», «Fərq» rəqəmlərini yazın; 3) `<YENİ>` sətrinə klik edin və `Escape` ilə bağlayın; 4) yenidən açın və × ilə bağlayın; 5) yenidən açın və arxa fona klik edərək bağlayın; 6) yenidən açın və «geri» ilə bağlayın; 7) hər bağlanmadan sonra 2-ci addımdakıları və ünvan sətrini yenidən yazın.
Gözlənilən: hər bağlanmadan sonra baza yenə «Son 3 ayın ortalaması», çip yenə «Yeni məhsullar», siyahı eynidir, rəqəmlər tam eynidir; ünvanda `basis=avg3&cause=new` qalıb, `product=` yoxdur. Açıq ikən ünvanda üçü birlikdədir: `basis=avg3`, `cause=new`, `product=<V>`.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-08 — «Geri» əvvəlcə çekməcəni, sonra süzgəci geri alır
Mənbə: `TASKS/TASK-19.md`, §4.3, sitat: "Back undoes the history first and the filter second, because both are pushes"
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) başqa bir səhifədən `/orders/<HEM>?basis=last`-a keçin; 2) «Yeni məhsullar» çipinə klik edin; 3) `<YENİ>` sətrinə klik edin; 4) «geri» basın; çekməcəni, çipi və ünvan sətrini yazın; 5) yenidən «geri» basın; çipi və ünvan sətrini yazın; 6) üçüncü dəfə «geri» basın və hansı səhifədə olduğunuzu yazın.
Gözlənilən: 4-cü addımda çekməcə bağlanır, «Yeni məhsullar» çipi seçilmiş qalır, ünvanda `basis=last&cause=new`. 5-ci addımda siyahı «Hamısı»-ya qayıdır, ünvanda yalnız `basis=last`. 6-cı addımda 1-ci addımdakı səhifəyə qayıdırsınız.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-09 — Hazır ünvan: eyni sifariş, eyni baza, eyni səbəb, eyni məhsul; bağlamaq yalnız `product=`-u götürür
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 4-cü bənd, sitat: "Çekməcə açıq ikən ünvan paylaşılır → eyni məhsulun çekməcəsi eyni sifarişdə, eyni baza ilə açılır."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=avg3&cause=new&product=<V>` (C-07-dəki `<YENİ>`-nin `<V>`-si), ünvan sətrinə yazılaraq; məhsulun tapılması (`pages/OrderDetailPage.tsx`:235–238) · dörd en
Addımlar: 1) C-07-də `<YENİ>` açıq ikən ünvan sətrindəki tam ünvanı köçürün və `Qeyd:`-ə yazın; 2) başqa bir səhifəyə keçin; 3) köçürdüyünüz ünvanı ünvan sətrinə yapışdırıb `Enter` basın; 4) seçilmiş bazanı, seçilmiş çipi, çekməcədə açılan məhsulun adını yazın; 5) `Escape` basın və ünvan sətrini yazın; 6) «geri» basın və hansı səhifədə olduğunuzu yazın.
Gözlənilən: 4-cü addımda səhifə `<HEM>` sifarişidir, baza «Son 3 ayın ortalaması», «Yeni məhsullar» çipi və «Niyə dəyişib?»-də «Yeni məhsullar» sətri seçilmişdir, çekməcədə `<YENİ>`-nin tarixçəsi açıqdır. 5-ci addımda çekməcə bağlanır, ünvanda `basis=avg3&cause=new` qalıb, `product=` yoxdur, səhifə yerindədir. 6-cı addımda 2-ci addımdakı səhifəyə qayıdırsınız (bağlamaq tarixçəyə yeni addım əlavə etməyib).
İlk auditdə: açıq pəncərə ünvanda deyildi; ünvanı paylaşmaq onu açmırdı (`BRIEFS/TASK-19.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-10 — Yeni vərəqdə yapışdırılan ünvan və çekməcə açıq ikən yeniləmə (`F5`)
Mənbə: `TASKS/TASK-19.md`, §4.3, sitat: "Otherwise the drawer was reached by a pasted link, a new tab, or an old-spelling basis that `useBasis` rewrote. Close with `setParams(withProduct(params, null), { replace: true })`."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last&product=<V>` (`<ÇOX>`-un `<V>`-si) · `1366×768`, `1440×900`, `1200×800` (telefonda yeni vərəq əvəzinə yeni pəncərə; bacarılmasa «yoxlanıla bilmədi»)
Addımlar: 1) `<ÇOX>`-un çekməcəsi açıq ikən ünvanı köçürün; 2) brauzerdə **yeni vərəq** açın, ünvanı yapışdırıb `Enter` basın; 3) çekməcənin açıldığını yazın; 4) × ilə bağlayın; ünvan sətrini və səhifəni yazın; 5) «geri» düyməsinin aktiv olub-olmadığını yazın; 6) əvvəlki vərəqə qayıdın, `/orders/<HEM>?basis=last` açıq ikən `<ÇOX>` sətrinə klik edin; 7) çekməcə açıq ikən `F5` ilə səhifəni yeniləyin; 8) çekməcənin yenidən açıldığını yazın; 9) `Escape` basın; ünvan sətrini və hansı səhifədə olduğunuzu yazın.
Gözlənilən: 3-cü addımda çekməcə açılır. 4-cü addımda çekməcə bağlanır, ünvanda `product=` yoxdur, siz sifariş səhifəsindəsiniz. 5-ci addımda yeni vərəqdə «geri» düyməsi aktiv deyil (və ya vərəqin ilk səhifəsinə aparır) — bağlamaq yeni addım əlavə etməyib. 8-ci addımda yeniləmədən sonra eyni çekməcə açılır. 9-cu addımda çekməcə bağlanır, siz eyni sifariş səhifəsində qalırsınız, ünvanda `product=` yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-11 — Tanınmayan `product=`: çekməcə açılmır, səhifə xətasız açılır, ünvan olduğu kimi qalır
Mənbə: `TASKS/TASK-19.md`, §9, 10-cu meyar, sitat: "An unknown or non-numeric `product` renders the page with no drawer and no error."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `/orders/<HEM>?basis=last&product=999999` və `/orders/<HEM>?basis=last&product=abc`; oxunuş (`analytics/decisionParams.ts`:88–96) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last&product=999999` açın; 2) çekməcənin olub-olmadığını, səhifədə xəta mesajı olub-olmadığını, başlıqdakı rəqəmləri və ünvan sətrini yazın; 3) `/orders/<HEM>?basis=last&product=abc` üçün təkrarlayın; 4) bu ünvanda `<ÇOX>` sətrinə klik edin və ünvan sətrini yazın.
Gözlənilən: 2-ci və 3-cü addımlarda çekməcə yoxdur, xəta yoxdur, səhifə adi kimi açılır; ünvandakı `product=999999` / `product=abc` olduğu kimi qalır. 4-cü addımda çekməcə açılır və ünvanda `product=` dəyəri `<ÇOX>`-un `<V>`-si ilə əvəz olunur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-12 — Çekməcənin açılması sifarişin məlumatını yenidən yükləmir
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 6-cı bənd, sitat: "Çekməcə açılanda sifarişin məlumatı yenidən yüklənmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, brauzerin «Developer Tools» → «Network» paneli · `/orders/<HEM>?basis=last` · `1366×768`, `1440×900`, `1200×800` (telefonda panel yoxdur: `390×844` üçün «yoxlanıla bilmədi (panel yoxdur)»)
Addımlar: 1) `/orders/<HEM>?basis=last` açın və səhifə tam yüklənsin; 2) `F12` → «Network» → «Fetch/XHR» süzgəcini seçin və siyahını təmizləyin (🚫); 3) `<ÇOX>` sətrinə klik edin və çekməcənin məzmunu gəlsin; 4) siyahıdakı bütün sorğuların ünvanlarını yazın; 5) `Escape` basın və yeni sorğuları yazın; 6) yenidən açın və «geri» ilə bağlayın; yeni sorğuları yazın.
Gözlənilən: 3-cü addımda yalnız bir sorğu görünür: ünvanı `/api/v1/analytics/locations/…/variants/<V>/trend…` ilə olan (`api/analytics.ts`:112). `/api/v1/orders/<HEM>`, `/api/v1/orders/<HEM>/revision` və `/api/v1/orders/<HEM>/decision-context` sorğuları **görünmür**. 5-ci addımda yeni sorğu yoxdur. 6-cı addımda yalnız açılışın `…/trend` sorğusu var, bağlanmada yeni sorğu yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-13 — Tək ayda sifariş olunmuş məhsul: qrafik əvəzinə cümlə, rəqəmlər cədvəldə
Mənbə: `BRIEFS/TASK-19.md`, «Qəbul», 5-ci bənd, sitat: "Tək bir ayda sifariş olunmuş məhsul (məsələn "Ağac dirəyi metal", Sentyabr 2026) → qrafik əvəzinə cümlə; rəqəmlər cədvəldə qalır."
Harada: real (yalnız oxuma) · sifariş səhifəsi, çekməcə · `/orders/<AĞAC>?basis=last`; qayda (`components/analytics/TrendModal.tsx`:116, :179, :186) · dörd en
Addımlar: 1) `/orders/<AĞAC>?basis=last` açın; 2) «Əsas dəyişikliklər»-də «Ağac dirəyi metal» sətrinə klik edin (siyahıda görünmürsə, «Yeni məhsullar» çipini və ya «Hamısına bax» düyməsini basın); 3) çekməcənin ən yuxarısındakı cümləni **sözbəsöz** yazın; 4) qrafikin, «Miqdar / Məbləğ / Orta qiymət» düymələrinin və sarı «… ay üçün bu obyektin sifarişi yoxdur. Həmin aylar qrafikdə boşluqdur…» qeydinin olub-olmadığını yazın; 5) «Orta qiymət necə hesablanır?» ⓘ düyməsinin olub-olmadığını yazın; 6) cədvəldə Sentyabr 2026 sətrinin miqdarını, qiymətini, məbləğini və təchizatçısını yazın; 7) dövr yazısını («… – … · N dövr») və «Mənbə və versiya məlumatı» bölməsinin yığılı olduğunu yazın.
Gözlənilən: 3-cü addımda cümlə «Son N ayın 1-də sifariş edilib» formasındadır (brief-in nümunəsi: «Son 9 ayın 1-də sifariş edilib»); altında «İlk sifariş: Sentyabr 2026 · Son sifariş: Sentyabr 2026». 4-cü addımda qrafik yoxdur, üç düymə yoxdur, sarı boşluq qeydi yoxdur. 5-ci addımda ⓘ var. 6-cı addımda Sentyabr sətrinin rəqəmləri var və başlıqdakı sətirlə uyğundur; sifariş olunmayan aylar «0 …» və ya «sifariş yoxdur» oxunur. 7-ci addımda dövr yazısı var, bölmə yığılıdır. «Adi», «qeyri-adi», «ilk dəfə» və ya proqnoz kimi heç bir yeni söz yoxdur.
İlk auditdə: bir dəfə sifariş olunmuş məhsul üçün qrafik səkkiz sıfır və bir zirvədən ibarət idi (`BRIEFS/TASK-19.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-14 — Çox ayda sifariş olunmuş məhsul: tezlik cümləsi ən yuxarıda, qrafik və üç göstərici işləyir, qalan sıra dəyişməyib
Mənbə: `BRIEFS/TASK-19.md`, «Tələb», 4-cü bənd, sitat: ""Son 9 ayın 1-də sifariş edilib" kimi tezlik cümləsi qrafikdən **əvvəl**, yuxarıda dursun — rəhbərin ilk sualı "bu adi sifarişdir, yoxsa yox?"-dur."
Harada: real (yalnız oxuma) · sifariş səhifəsi, çekməcə · `/orders/<HEM>?basis=last`; sıra (`components/analytics/TrendModal.tsx`:139–269) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) `<ÇOX>` sətrinə klik edin; 3) çekməcənin içindəki hissələri yuxarıdan aşağıya sırası ilə yazın; 4) «Miqdar», «Məbləğ» və «Orta qiymət» düymələrinə növbə ilə basın və qrafikin dəyişdiyini yazın; 5) müqayisə hissəsinin («Miqdar … → …», «Qiymət … → …», «Məbləğ … → …», «Miqdar təsiri», «Qiymət təsiri») rəqəmlərini və rənglərini yazın.
Gözlənilən: sıra belədir: 1) tezlik cümləsi («Son N ayın M-də sifariş edilib») və altında ilk/son sifariş, interval; 2) «Təchizatçı: …»; 3) bu ayın müqayisəsi; 4) dövr yazısı və «Miqdar / Məbləğ / Orta qiymət» düymələri ilə ⓘ; 5) qrafik; 6) boşluq varsa sarı qeyd; 7) aylar cədvəli; 8) yığılı «Mənbə və versiya məlumatı». Üç düymə qrafiki dəyişir. Rəqəmlər əvvəlki kimidir; xərcin artması qırmızı, azalması yaşıldır (qərar 9.1).
İlk auditdə: tezlik cümləsi müqayisədən sonra, qrafikin üstündə idi (`TASKS/TASK-19.md`, §2.1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-15 — Süzülmüş siyahıdan açılan çekməcə bağlananda fokus həmin sətrə qayıdır
Mənbə: `TASKS/TASK-19.md`, §4.3, sitat: "On close, focus returns to that row, **including when the list is filtered by `cause`**."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Əsas dəyişikliklər» · `/orders/<HEM>?basis=last&cause=new` · `1366×768`, `1440×900`, `1200×800` (telefonda klaviatura yoxdur: `390×844` üçün «yoxlanıla bilmədi (klaviatura yoxdur)»)
Addımlar: 1) `/orders/<HEM>?basis=last&cause=new` açın; 2) `Tab` ilə «Yeni məhsullar» siyahısındakı ikinci məhsulun sətrinə gəlin; 3) `Enter` basın; 4) fokusun çekməcədə harada olduğunu yazın; 5) `Tab`-ı bir neçə dəfə basın və fokusun çekməcədən çıxıb-çıxmadığını yazın; 6) `Escape` basın; 7) fokus çərçivəsinin harada olduğunu, siyahının hələ də süzülmüş olduğunu və ekranın yerini yazın.
Gözlənilən: 4-cü addımda fokus çekməcənin × düyməsindədir. 5-ci addımda fokus çekməcənin içində dövr edir, arxadakı səhifəyə keçmir. 7-ci addımda fokus çərçivəsi 2-ci addımdakı sətrin ətrafındadır, siyahı yenə «Yeni məhsullar»-dır, ekran yerindən tərpənməyib.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-16 — Çekməcənin içindəki ⓘ: qeyd düzgün yerdə açılır, `Escape` əvvəlcə qeydi bağlayır
Mənbə: `TASKS/TASK-19.md`, §4.1, sitat: "**No `transform`, `translate` or slide-in animation on the panel or its ancestors.** A transform would become the containing block for `InfoHint`'s `position: fixed` note (§2.1) and would clip or misplace it."
Harada: real (yalnız oxuma) · sifariş səhifəsi, çekməcə, «Orta qiymət necə hesablanır?» ⓘ (`components/analytics/TrendModal.tsx`:175) · `/orders/<HEM>?basis=last` · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) `<ÇOX>` sətrinə klik edin; 3) «Orta qiymət necə hesablanır?» ⓘ düyməsinə klik edin (telefonda toxunun); 4) qeydin harada açıldığını, tam oxunub-oxunmadığını, çekməcənin kənarında kəsilib-kəsilmədiyini yazın; 5) `Escape` basın (telefonda qeydin kənarına toxunun) və nəyin bağlandığını yazın; 6) qeydi yenidən açın və çekməcənin içini sürüşdürün; nə baş verdiyini yazın; 7) `Escape` basın.
Gözlənilən: 4-cü addımda qeyd ⓘ düyməsinin yanında, tam oxunaqlı görünür; kəsilmir və ekranın başqa yerinə düşmür. 5-ci addımda yalnız qeyd bağlanır, çekməcə açıq qalır. 6-cı addımda sürüşmə qeydi bağlayır. 7-ci addımda çekməcə bağlanır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
