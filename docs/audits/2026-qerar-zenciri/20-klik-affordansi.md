# 20 — Klik affordansının əl ilə yoxlanışı (Task 20, Klik affordansı)

Bu fayl Task 20-nin brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama aparmayıb:**
Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-20.md`; qərarlar 20.1, 20.2, 20.3):

- diqqət kartının **bütün səthi** bir klik sahəsidir: başlığa, gövdəyə, boş yerə və altdakı «Detallara bax →»-a klik
  həmin obyektin sifariş səhifəsini açır; kartda bir keçid var — obyektin adı;
- panel cədvəlinin sətri **bütövlükdə** klik edilir; sətrin sağ kənarındakı ayrıca «Detallara bax» düyməsi və onun sütunu
  artıq yoxdur; telefonda sətir kart kimi açılır;
- sifariş səhifəsində məhsul adı sətirlə birlikdə altdan xətt alır və yanında tarixçə (saat) işarəsi var;
- «Digər müqayisə bazaları»-ndakı ortalama sətirləri düymə qutusundadır; həm adına, həm rəqəminə klik bazanı dəyişir;
- klik edilə bilən hər şey kursor altında və klaviatura fokusunda dəyişir; klik edilməyən mətnin **özü** heç vaxt
  dəyişmir (kart və sətir içində yalnız kartın/sətrin fonu və çərçivəsi dəyişir — `TASKS/TASK-20.md`, §4.3);
- klaviatura ilə hər kart və hər sətir bir dayanacaqdır, fokus həlqəsi görünür;
- heç bir rəqəm, mətn, rəng, kartların sırası və «geri»-nin qaytardığı yer dəyişməyib.

Hər ünvan, düymə və sətir yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`). Bu dəstdə heç bir yazma düyməsi basılmır: «Təsdiqlə»,
  «Düzəliş tələb et», «Redaktə et», «Sil» və başqaları. Kartlar, sətirlər və baza düymələri yalnız səhifə açır və ya
  ekranın oxunuşunu və ünvanı dəyişir; heç nə saxlanılmır.
- Paneli və sifariş səhifəsini aça bilən hesabla aparılır (Rəhbər və ya Admin).
- **Panel — `<PANEL>`.** «İdarəetmə paneli», dövr «Sentyabr 2026», baza «Keçən ay»: `/dashboard?period=2026-09&basis=last`.
  Yoxlama başqa baza istəmirsə, hər yoxlamaya bu ünvanla başlayın.
- **Faiz kartı — `<FAİZ>`.** Başlığında ⓘ olan diqqət kartı («Ən böyük faiz dəyişməsi» və ya «İkinci ən böyük faiz
  dəyişməsi»). `basis=last`-da yoxdursa, bazanı «Son 3 ayın ortalaması» seçin (`basis=avg3`). Obyektin adını D-09-un
  `Qeyd:` sətrinə yazın. Heç bir bazada yoxdursa, D-09 «yoxlanıla bilmədi (faiz kartı yoxdur)» olur.
- **Sifarişi olmayan obyekt — `<YOX>`.** Cədvəldə «Məlumat vəziyyəti» sütununda «Sifariş qeydə alınmayıb · …» və ya
  «Sistemdə hələ sifarişi yoxdur» yazılan hər hansı sətir. Adını D-05-in `Qeyd:` sətrinə yazın.
- **Sifariş — `<HEM>`.** Heydər Əliyev Mərkəzi, Sentyabr 2026 sifarişi (`19-mehsul-cekmecesi.md`-də olduğu kimi
  tapılır: «Obyektlər» → «Heydər Əliyev Mərkəzi» → «Müqayisə et»). Ünvandakı nömrəni D-12-nin `Rəqəm:` sətrinə yazın.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın. Cədvəl `1024` pikseldən enlidə görünür; `390×844`-də onun yerinə telefon siyahısı var (D-03 və D-04-ə baxın).
- `390×844`-də iki şeyi ayrıca yazın: telefon sətrinə toxunmaq rahatdırmı (barmaq səhvən başqa sətrə düşürmü), və
  klik edilməyən hər hansı mətn indi toxunula bilən kimi görünürmü.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `D-01-panel-1440.png`. Şəkillər `docs/audits/2026-qerar-zenciri/ekranlar/`
  qovluğuna qoyulur. Qovluq yoxdursa, onu yaradın.

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
- «Ünvan sətri» brauzerin yuxarısındakı ünvandır. `basis=` onun `?`-dan sonrakı hissəsindədir.
- «Geri» brauzerin öz geri düyməsidir (və ya `Alt+←`), səhifədəki heç bir keçid deyil.
- «Adi klik» siçanın sol düyməsi ilə, heç bir düymə (`Ctrl`, `Shift`, `Alt`, `⌘`) basılmadan edilən klikdir.

---

## Yoxlamalar

### D-01 — Diqqət kartının başlığına, gövdəsinə və boş yerinə klik sifariş səhifəsini açır
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 1-ci bənd, sitat: "Diqqət kartının istənilən boş yerinə klik → həmin obyektin sifariş səhifəsi açılır; kartda başqa keçid yoxdur."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Diqqət tələb edən obyektlər» · `<PANEL>`; kartın səthi (`components/dashboard/AttentionSection.tsx`:107–111), klikin ötürülməsi (`components/interaction.ts`:25) · dörd en
Addımlar: 1) `<PANEL>` açın; 2) birinci kartın obyekt adını və onun altındakı məbləği yazın; 3) kartın başlıq sətrinə («Ən böyük məbləğ artımı» və s.) adi klik edin; açılan səhifəni və ünvan sətrini yazın; «geri» basın; 4) kartın ortasındakı məbləğə adi klik edin; ünvanı yazın; «geri» basın; 5) «Əsas səbəb» altındakı səbəb sətrinə adi klik edin; ünvanı yazın; «geri» basın; 6) kartın içində mətn olmayan boş yerə (məsələn sağ kənarda) adi klik edin; ünvanı yazın; «geri» basın; 7) obyektin adına adi klik edin; ünvanı yazın.
Gözlənilən: 3–7-ci addımların hər birində eyni səhifə açılır: həmin obyektin Sentyabr 2026 sifarişi, ünvan `/orders/<nömrə>?basis=last`. Bu ay sifarişi olmayan obyektin kartı `/locations/<nömrə>?basis=last` açır. Heç bir klik «boş» qalmır.
İlk auditdə: kartın başlığına klik — heç nə; gövdəyə klik — heç nə; yeganə keçid kartın altındakı kiçik düymə idi (`BRIEFS/TASK-20.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-02 — Kartın altındakı «Detallara bax →» keçid deyil, işarədir; kartda bir keçid var
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 20.1, sitat: "Diqqət kartının bütün səthi bir klik sahəsidir. Kartın içində ikinci bir keçid olmur."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartı · `<PANEL>`; işarə (`components/dashboard/details.tsx`:28, `components/dashboard/AttentionSection.tsx`:152–154), yeganə keçid — ad (`AttentionSection.tsx`:119–128) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də sağ klik menyusu yoxdur: 3-cü və 4-cü addımlar üçün «yoxlanıla bilmədi (sağ klik yoxdur)»)
Addımlar: 1) `<PANEL>` açın; 2) birinci kartın altındakı «Detallara bax →»-a adi klik edin; ünvanı yazın; «geri» basın; 3) «Detallara bax →»-un üstündə sağ klik edin və menyuda «Keçidi yeni vərəqdə aç» olub-olmadığını yazın; 4) obyektin adının üstündə sağ klik edin və eyni şeyi yazın; 5) siçanı kartın üstündə gəzdirin və kursorun hansı formada olduğunu (əl / ox) yazın.
Gözlənilən: 2-ci addımda D-01-dəki eyni sifariş açılır. 3-cü addımda menyuda keçid bəndi yoxdur (işarə keçid deyil). 4-cü addımda keçid bəndi var — kartın yeganə keçidi obyektin adıdır. 5-ci addımda kursor kartın hər yerində əldir.
İlk auditdə: kartın yeganə keçidi altdakı düymə idi (`BRIEFS/TASK-20.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-03 — Cədvəl sətrinin adına, ortasına və boş yerinə klik; sağ kənarda düymə yoxdur
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 2-ci bənd, sitat: "Panel cədvəlində obyektin adına klik → eyni səhifə açılır; sətrin sağ kənarındakı ayrıca düymə artıq tələb olunmur."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Bütün obyektlər» cədvəli · `<PANEL>`; sətir (`components/dashboard/LocationRows.tsx`:97), ad keçidi (:99–108), alt sətir (:195) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də cədvəl yoxdur — orada D-04)
Addımlar: 1) `<PANEL>` açın və cədvələ qədər sürüşdürün; 2) cədvəlin sütun başlıqlarını soldan sağa yazın; 3) hər hansı sətrin sağ kənarında düymə olub-olmadığını yazın; 4) ilk sətrin obyekt adına adi klik edin; ünvanı yazın; «geri» basın; 5) eyni sətrin «Dəyişmə» xanasına adi klik edin; ünvanı yazın; «geri» basın; 6) eyni sətrin «Məlumat vəziyyəti» xanasının boş yerinə adi klik edin; ünvanı yazın; «geri» basın; 7) cədvəlin ən altındakı yekun sətrinə klik edin və nə baş verdiyini yazın.
Gözlənilən: 2-ci addımda altı sütun var: «Obyekt», «Bu ay», bazanın adı (məsələn «Keçən ay»), «Dəyişmə», «Əsas səbəb», «Məlumat vəziyyəti». 3-cü addımda sağ kənarda düymə yoxdur. 4–6-cı addımlarda eyni sifariş açılır: `/orders/<nömrə>?basis=last`. 7-ci addımda heç nə açılmır — yekun sətri klik sahəsi deyil; o, cədvəlin bütün enini tutur.
İlk auditdə: obyektin adı ilə keçid düyməsi arasında bütün ekran eni var idi: rəhbər adı oxuyur, sonra siçanı sağ kənara aparırdı (`BRIEFS/TASK-20.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-04 — Telefonda sətir: ada, ortasına, boş yerə toxunmaq; toxunma sahəsinin rahatlığı
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 20.2, sitat: "Panel cədvəlinin sətri bütövlükdə klik edilir; keçid sətrin sağ kənarında bir düymə olaraq qalmır."
Harada: real (yalnız oxuma) · İdarəetmə paneli, telefon siyahısı · `<PANEL>`; telefon sətri (`components/dashboard/LocationRows.tsx`:207–212), işarə (:250) · `390×844`
Addımlar: 1) brauzerin cihaz rejimində (və ya telefonda) `390×844` seçin; 2) `<PANEL>` açın və obyektlər siyahısına qədər sürüşdürün; 3) bir sətrin obyekt adına toxunun; ünvanı yazın; «geri» basın; 4) eyni sətrin məbləğinə toxunun; ünvanı yazın; «geri» basın; 5) sətrin «Əsas səbəb» mətninə toxunun; ünvanı yazın; «geri» basın; 6) sətrin altındakı «Detallara bax →»-a toxunun; ünvanı yazın; «geri» basın; 7) siyahının sonundakı yekun kartına toxunun; 8) toxunmanın rahat olub-olmadığını, barmağın qonşu sətrə düşüb-düşmədiyini yazın; 9) siyahıda klik edilməyən hər hansı mətnin toxunula bilən kimi göründüyünü (məsələn altdan xətt, düymə görünüşü) yazın.
Gözlənilən: 3–6-cı addımların hər birində eyni sifariş açılır: `/orders/<nömrə>?basis=last`. 7-ci addımda heç nə açılmır. 8-ci və 9-cu addımlar operatorun qiymətləndirməsidir: nə gördüyünüzü yazın; brief bunun üçün ölçü vermir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-05 — Bu ay sifarişi olmayan obyektin sətri obyekt səhifəsini açır, bazanı saxlayır
Mənbə: `TASKS/TASK-20.md`, §9, 1-ci meyar, sitat: "An object with no order this month opens `/locations/{id}` with it."
Harada: real (yalnız oxuma) · İdarəetmə paneli, cədvəl və telefon siyahısı · `/dashboard?period=2026-09&basis=avg3`; ünvan (`components/dashboard/details.tsx`:12) · dörd en
Addımlar: 1) `/dashboard?period=2026-09&basis=avg3` açın; 2) `<YOX>` sətrini tapın; 3) sətrin «Məlumat vəziyyəti» mətninə adi klik edin (telefonda toxunun); 4) açılan səhifəni və ünvan sətrini yazın; 5) «geri» basın və ekranın harada olduğunu yazın.
Gözlənilən: 4-cü addımda obyektin öz səhifəsi açılır: `/locations/<nömrə>?basis=avg3`. 5-ci addımda panel yenə `basis=avg3` ilədir və ekran `<YOX>` sətrinin yanındadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-06 — Kartda və sətirdə klik edilməyən mətnin özü kursor altında dəyişmir
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 5-ci bənd, sitat: ""Əsas səbəb" mətni, hissə adları və məbləğlər kursor altında dəyişmir — onlar klik edilmir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartı və cədvəl sətri · `<PANEL>`; oxunuş (`TASKS/TASK-20.md`, §4.3), kartın «Əsas səbəb»-i (`components/dashboard/AttentionSection.tsx`:179), cədvəlin başlığı (`components/dashboard/LocationRows.tsx`:86) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də kursor yoxdur: «yoxlanıla bilmədi (kursor yoxdur)»)
Addımlar: 1) `<PANEL>` açın; 2) siçanı kartın xaricində saxlayın və kartın bu hissələrinin rəngini, qalınlığını və altdan xəttini yazın: «Əsas səbəb» sözü, səbəb sətirləri, məhsul sətri, məbləğ, fərq, «Keçən aya görə xərc artıb / azalıb» cümləsi, ⚠ işarəsi (varsa); 3) siçanı növbə ilə bu hissələrin hər birinin üstünə aparın və hər dəfə nəyin dəyişdiyini yazın; 4) ⚠ işarəsinin üstündə bir az saxlayın və açılan ipucunu yazın; 5) eyni şeyi cədvəl sətrində edin (məbləğ, fərq, «Əsas səbəb» xanası); 6) siçanı cədvəlin «Əsas səbəb» sütun başlığının və yekun sətrinin üstünə aparın.
Gözlənilən: 3-cü addımda mətnin özünün rəngi, qalınlığı və altdan xətti dəyişmir. Dəyişən yalnız bütün kartdır: çərçivəsi bir az tündləşir, fonu açıq boz olur, kursor əl olur, obyektin adının altında xətt çıxır — bu, qərar 20.1-in «bütün səth» klik sahəsidir. 4-cü addımda ⚠ ipucu əvvəlki kimi görünür. 5-ci addımda sətrin fonu açıq boz olur, obyektin adının altında xətt çıxır; məbləğlərin və səbəbin özü dəyişmir. 6-cı addımda heç nə dəyişmir, kursor ox olaraq qalır.
İlk auditdə: cədvəl sətri kursor altında fonunu dəyişirdi, amma klik edilmirdi (`TASKS/TASK-20.md`, §2.2)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-07 — Sifariş səhifəsində klik edilməyən mətn heç dəyişmir
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 20.3, sitat: "Klik edilə bilən hər element kursor altında və klaviatura fokusunda görünüşünü dəyişir; klik edilməyən mətn heç vaxt dəyişmir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, başlıq və «Niyə dəyişib?» · `/orders/<HEM>?basis=last`; başlıq (`components/decisions/DecisionHeadline.tsx`:69–71, :126–138), «Əsas səbəb» (`components/decisions/CauseSummary.tsx`:169), mövcud olmayan baza «—» (`DecisionHeadline.tsx`:285) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də kursor yoxdur: «yoxlanıla bilmədi (kursor yoxdur)»)
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) siçanı növbə ilə bunların üstünə aparın və hər dəfə nəyin dəyişdiyini, kursorun formasını yazın: başlıqdakı məbləğ, «Baza» və onun rəqəmi, «Fərq» və onun rəqəmi və faizi, «Niyə dəyişib?»-dəki «Əsas səbəb» sözü; 3) «Digər müqayisə bazaları»-nda «—» göstərən baza varsa, onun üstünə aparın.
Gözlənilən: 2-ci və 3-cü addımlarda heç nə dəyişmir: nə rəng, nə altdan xətt, nə fon; kursor ox olaraq qalır. («Niyə dəyişib?»-dəki səbəb sətirləri Task 18-dən bəri klik edilir; onlar bu yoxlamaya aid deyil.)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-08 — Klaviatura: hər kart və hər sətir bir dayanacaq, oxuma sırası ilə, fokus həlqəsi görünür
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 6-cı bənd, sitat: "Klaviatura ilə paneldən keçiləndə hər kart bir dayanacaqdır və fokus həlqəsi görünür."
Harada: real (yalnız oxuma) · İdarəetmə paneli · `<PANEL>`; kartın həlqəsi (`components/interaction.ts`:59–62), sətrin fonu və adın həlqəsi (:65, :71) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də klaviatura yoxdur: «yoxlanıla bilmədi (klaviatura yoxdur)»)
Addımlar: 1) `<PANEL>` açın və ünvan sətrinə klik edin; 2) `Tab`-ı basaraq diqqət kartlarına qədər gəlin; 3) hər `Tab`-da fokusun harada olduğunu və necə göründüyünü yazın, kartlar bitənə qədər; 4) cədvələ qədər `Tab`-a davam edin və ilk üç sətir üçün eyni şeyi yazın; 5) fokus bir kartda ikən `Enter` basın; açılan səhifəni yazın; «geri» basın; 6) fokus bir cədvəl sətrində ikən `Enter` basın; açılan səhifəni yazın.
Gözlənilən: 3-cü addımda hər kart bir dayanacaqdır; fokusda bütün kartın ətrafında tünd, qalın (2 piksel) həlqə görünür. Faiz kartında (`<FAİZ>`) əlavə bir dayanacaq var: əvvəlcə başlıqdakı ⓘ, sonra kartın özü. Kartlar soldan sağa, yuxarıdan aşağıya ekrandakı sırası ilə gəlir. 4-cü addımda hər sətir bir dayanacaqdır; fokusda sətrin fonu açıq boz olur və obyektin adının ətrafında tünd həlqə görünür; sətirlər yuxarıdan aşağıya gəlir; sağ kənarda ayrıca dayanacaq yoxdur. 5-ci və 6-cı addımlarda D-01 və D-03-dəki sifariş açılır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-09 — Faiz kartındakı ⓘ öz qeydini açır, sifarişi açmır
Mənbə: `TASKS/TASK-20.md`, §4.1, sitat: "The ⓘ on a percentage card stays a `<button>`, and stays where it is. `openSurfaceLink` ignores clicks on it and on its open note."
Harada: real (yalnız oxuma) · İdarəetmə paneli, `<FAİZ>` kartı · `<PANEL>` (və ya `basis=avg3`); ⓘ (`components/dashboard/AttentionSection.tsx`:116, `components/analytics/InfoHint.tsx`:76–101) · dörd en
Addımlar: 1) `<FAİZ>` kartını tapın; 2) başlıqdakı ⓘ-yə adi klik edin (telefonda toxunun); açılanı və ünvan sətrini yazın; 3) açılan qeydin mətninə klik edin; ünvanı yazın; 4) `Escape` basın (telefonda qeydin kənarına toxunun); 5) kartın boş yerinə klik edin; ünvanı yazın.
Gözlənilən: 2-ci addımda ⓘ-nin yanında «Faiz yalnız müqayisə bazası ən azı 100 ₼ olan və ən azı 50% dəyişən obyektlər arasında müqayisə olunur.» qeydi açılır; səhifə dəyişmir, ünvan eynidir. 3-cü addımda səhifə dəyişmir. 4-cü addımda qeyd bağlanır. 5-ci addımda həmin obyektin sifarişi açılır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-10 — Kartda mətn seçmək səhifəni açmır
Mənbə: `TASKS/TASK-20.md`, §9, 8-ci meyar, sitat: "A click that ends a text selection inside a card or row does not navigate."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartı və cədvəl sətri · `<PANEL>`; qayda (`components/interaction.ts`:41–56) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də siçanla seçim yoxdur: «yoxlanıla bilmədi (siçan yoxdur)»)
Addımlar: 1) `<PANEL>` açın; 2) birinci kartın məbləğini siçanla sürükləyərək seçin və düyməni buraxın; ünvanı yazın; 3) `Ctrl+C` basın və mətni istənilən yerə yapışdırıb nəyin köçürüldüyünü yazın; 4) kartın boş yerinə bir dəfə klik edərək seçimi götürün; ünvanı yazın; 5) cədvəl sətrində «Dəyişmə» rəqəmini sürükləyərək seçin və eyni şeyi yazın.
Gözlənilən: 2-ci və 5-ci addımlarda səhifə açılmır, ünvan dəyişmir, mətn seçilmiş qalır. 3-cü addımda seçilmiş məbləğ köçürülür. 4-cü addımda — seçim artıq götürülübsə — sifariş açıla bilər; açıldısa, bunu yazın (seçimi götürən klik ilə açan klik bir-birindən ayrıdır).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-11 — `Ctrl` və orta düymə ilə klik: adda yeni vərəq, gövdədə heç nə
Mənbə: `TASKS/TASK-20.md`, §9, 8-ci meyar, sitat: "A Ctrl, Meta or middle click on the body does nothing, while the same on the name link behaves as a normal link."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartı və cədvəl sətri · `<PANEL>`; qayda (`components/interaction.ts`:26–33) · `1366×768`, `1440×900`, `1200×800` (`390×844` üçün «yoxlanıla bilmədi (klaviatura və orta düymə yoxdur)»)
Addımlar: 1) `<PANEL>` açın; 2) birinci kartın obyekt adına `Ctrl` basılı klik edin (Mac-da `⌘`); yeni vərəqin açılıb-açılmadığını və onun ünvanını yazın; 3) həmin kartın məbləğinə `Ctrl` basılı klik edin; nə baş verdiyini yazın; 4) obyektin adına orta düymə (təkər) ilə klik edin; 5) kartın məbləğinə orta düymə ilə klik edin; 6) 2–5-ci addımları bir cədvəl sətrində təkrarlayın.
Gözlənilən: 2-ci və 4-cü addımlarda yeni vərəqdə həmin obyektin sifarişi açılır (`/orders/<nömrə>?basis=last`), əsas vərəq panelde qalır. 3-cü və 5-ci addımlarda heç nə baş vermir: nə yeni vərəq, nə keçid. 6-cı addımda nəticə eynidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-12 — Məhsul adı: sətirlə birlikdə altdan xətt, tarixçə işarəsi; klik çekməcəni Task 19-dakı kimi açır
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 3-cü bənd, sitat: "Məhsul adının üstünə gəlinir → görünüşü dəyişir və onun tarixçə açdığı aydın olur."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Əsas dəyişikliklər» · `/orders/<HEM>?basis=last`; sətrin düyməsi (`components/decisions/DriverList.tsx`:154–159), ad və işarə (:162–163) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) siçanı sətirlərdən kənarda saxlayın və ilk məhsul adının görünüşünü və yanındakı saat işarəsinin rəngini yazın; 3) siçanı həmin sətrin rəqəm hissəsinə (sağdakı məbləğə) aparın; adın və işarənin necə dəyişdiyini yazın; 4) `Tab` ilə həmin sətrə gəlin və adın görünüşünü yazın (telefonda bu addım «yoxlanıla bilmədi (klaviatura yoxdur)»); 5) məhsul adına adi klik edin (telefonda toxunun); açılanı və ünvan sətrini yazın; 6) «geri» basın.
Gözlənilən: 2-ci addımda ad əvvəlki kimi qalın, tünd mətndir; yanında boz saat işarəsi var; heç bir yeni söz yoxdur. 3-cü addımda sətrin fonu açıq boz olur, adın altında xətt çıxır, saat işarəsi tündləşir. 4-cü addımda sətrin ətrafında fokus həlqəsi var və adın altında xətt çıxır. 5-ci addımda Task 19-un çekməcəsi sağdan açılır, ünvana `product=<V>` əlavə olunur. 6-cı addımda çekməcə bağlanır, səhifə yerində qalır.
İlk auditdə: məhsul adı klik edilirdi, amma adi qara mətn kimi görünürdü — heç kim onu tapmırdı (`BRIEFS/TASK-20.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-13 — «Son 6 ayın ortalaması …» düymə qutusundadır; adına və rəqəminə klik bazanı dəyişir
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 4-cü bənd, sitat: ""Son 6 ayın ortalaması 17.583,62 ₼" sətrinin üstünə gəlinir → düymə olduğu görünür; klik bazanı dəyişir və ünvanda qalır."
Harada: real (yalnız oxuma) · sifariş səhifəsi, başlıq, «Digər müqayisə bazaları» · `/orders/<HEM>?basis=last`; qutu və düymə (`components/decisions/DecisionHeadline.tsx`:259–283) · dörd en
Addımlar: 1) `/orders/<HEM>?basis=last` açın; 2) başlığın altındakı digər bazaların hər birinin görünüşünü (çərçivə, künclər), rəqəmini və rəngini yazın; 3) siçanı «Son 6 ayın ortalaması» qutusunun üstünə aparın; nəyin dəyişdiyini və kursorun formasını yazın (telefonda bu addım «yoxlanıla bilmədi (kursor yoxdur)»); 4) qutunun **adına** («Son 6 ayın ortalaması» sözlərinə) adi klik edin; başlıqdakı seçilmiş bazanı, «Baza» və «Fərq» rəqəmlərini və ünvan sətrini yazın; 5) «geri» basın; 6) indi eyni qutunun **rəqəminə** adi klik edin və eyni şeyləri yazın; 7) `Tab` ilə bu qutuya gəlin və fokus həlqəsinin nəyi əhatə etdiyini yazın (telefonda «yoxlanıla bilmədi (klaviatura yoxdur)»); 8) «—» göstərən baza varsa, onun görünüşünü yazın.
Gözlənilən: 2-ci addımda hər mövcud baza nazik boz çərçivəli, yumru künclü qutudadır; rəqəmlər və fərqin rəngi (artım qırmızı, azalma yaşıl) əvvəlki kimidir. 3-cü addımda qutunun çərçivəsi tündləşir, fonu açıq boz olur, rəqəmin altında xətt çıxır, kursor əldir. 4-cü və 6-cı addımlarda baza «Son 6 ayın ortalaması» olur, başlığın rəqəmləri yenilənir, ünvanda `basis=avg6` yazılır. 5-ci addımda əvvəlki baza (`basis=last`) qayıdır. 7-ci addımda həlqə bütün qutunu — adı və rəqəmi birlikdə — əhatə edir. 8-ci addımda «—» qutusuz, adi boz mətndir.
İlk auditdə: «Son 3 ayın ortalaması 20.708,65 ₼» sətri əslində düymə idi və bazanı dəyişirdi; bunu heç nə bildirmirdi (`BRIEFS/TASK-20.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-14 — «Geri» açılmış karta və ya sətrə qaytarır
Mənbə: `TASKS/TASK-20.md`, §9, 7-ci meyar, sitat: "Back from a card or a row returns to it."
Harada: real (yalnız oxuma) · İdarəetmə paneli · `<PANEL>`; yerin yadda saxlanması (`navigation/useScrollMemory.ts`:80–87), id-lər `attention-<nömrə>`, `row-<nömrə>`, `row-<nömrə>-phone` · dörd en (cədvəl `390×844`-də yoxdur; orada 4-cü addımı telefon sətri ilə edin)
Addımlar: 1) `<PANEL>` açın; 2) ekranı sürüşdürüb üçüncü kartı ekranın ortasına gətirin; onun **məbləğinə** (adına yox) adi klik edin; 3) sifariş açılandan sonra «geri» basın; ekranda hansı kartın olduğunu yazın; 4) cədvəldə ortadakı bir sətrin **«Dəyişmə»** xanasına adi klik edin, sonra «geri» basın; ekranda hansı sətrin olduğunu yazın; 5) 2–4-cü addımları kartın və sətrin adına klik edərək təkrarlayın.
Gözlənilən: 3-cü addımda ekran açılan kartın yanındadır. 4-cü addımda ekran açılan sətrin yanındadır. Ünvanda `period=2026-09&basis=last` qalıb. 5-ci addımda nəticə eynidir — gövdəyə klik ilə ada klik arasında fərq yoxdur.
İlk auditdə: brief qeyd etmir (Task 09-un «geri» davranışıdır; bu tapşırıq onu dəyişməməlidir)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### D-15 — Heç bir rəqəm, mətn, rəng və sıra dəyişməyib; qonşu ekranlar olduğu kimidir
Mənbə: `BRIEFS/TASK-20.md`, «Qəbul», 7-ci bənd, sitat: "Heç bir rəqəm, mətn və rəng dəyişmir; kartların sırası dəyişmir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, sifariş səhifəsi, «Aylıq hesabat», obyekt səhifəsi, «Obyektlər» · `<PANEL>`, `/orders/<HEM>?basis=last`, menyudan «Aylıq hesabat» və «Obyektlər» · `1440×900` (qalan enlərdə yalnız 1-ci addım)
Addımlar: 1) `<PANEL>`-də kartların sırasını, hər kartın başlığını, obyektini, məbləğini, fərqini və «Keçən aya görə xərc artıb / azalıb» cümləsini yazın; bunu Task 19 dövründə çəkilmiş hər hansı ekran şəkli və ya qeydlə müqayisə edin (varsa); 2) hər kartda istiqamət cümləsinin olub-olmadığını yoxlayın (fərqi olan hər kartda olmalıdır); 3) cədvəlin yekun sətrinin rəqəmlərini yazın; 4) `/orders/<HEM>?basis=last`-da başlığın rəqəmlərini yazın; 5) «Aylıq hesabat»-ı, «Heydər Əliyev Mərkəzi»-nin obyekt səhifəsini və «Obyektlər» siyahısını açın və nəyinsə dəyişib-dəyişmədiyini yazın.
Gözlənilən: 1-ci addımda sıra, başlıqlar, rəqəmlər və rənglər əvvəlki kimidir (artım qırmızı, azalma yaşıl). 2-ci addımda fərqi olan hər kartda cümlə var — o, rəngin sözlə deyilişidir (qərar 9.1) və silinməməlidir. 3-cü və 4-cü addımlarda rəqəmlər əvvəlki kimidir. 5-ci addımda bu üç ekran dəyişməyib; «Obyektlər» siyahısında «Bax» sözü və sətrin kursor altında fonunu dəyişməsi əvvəlki kimi qalır (bu tapşırığa aid deyil, `TASKS/TASK-20.md`, §12).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
