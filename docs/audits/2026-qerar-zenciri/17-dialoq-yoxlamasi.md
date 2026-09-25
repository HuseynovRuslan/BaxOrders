# 17 — Dialoqların əl ilə yoxlanışı (Task 17, Ortaq dialoq müqaviləsi)

Bu fayl Task 17-nin brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama aparmayıb:**
Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-17.md`; qərarlar 17.1, 17.2, 17.3):

- `Escape` üstdəki dialoqu bağlayır, yalnız onu;
- fokus dialoqa keçir, `Tab` onun içində dövr edir, bağlananda fokus dialoqu açan elementə qayıdır;
- fon klikinə yalnız oxumaq üçün olan dialoqlar bağlanır: məhsul tarixçəsi, «Mənbə», sətir detalı. Sətir detalında
  düzəliş, çıxarma səbəbi və ya «Qəsdən boş» təsdiqi açıqdırsa, o da bağlanmır;
- bağlamaq heç vaxt dialoqun əməliyyatını icra etmir.

Hər ünvan, düymə və sətir yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Sınaq mühiti** (`http://localhost:5174`). İşə salınması, hesablar və sıfırlama
  `docs/audits/2026-final-enver-muellim-audit/01-hazirliq.md`, 5-ci bənddədir. Hər yazma əməlindən əvvəl
  `docs/audits/2026-final-enver-muellim-audit/04-sandbox.md`, 1-ci bölmənin üç yoxlaması edilir.
- Bu dəstdə heç bir dialoqun əsas düyməsi basılmır: «Sil», «Yadda saxla», «İdxalı təsdiqlə», «Yarat» və başqaları.
  Dialoq yalnız açılır, sonra `Escape`, «Bağla» (×), fon kliki və ya «İmtina» ilə bağlanır.
- Məhsul tarixçəsi və «Mənbə» yalnız oxumadır. Onları real sistemdə də (`http://localhost:5173`) yoxlamaq olar, amma
  orada heç bir yazma düyməsi basılmır.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `A-01-mehsul-tarixcesi-1366.png`. Şəkillər
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

---

## Yoxlamalar

### A-01 — Məhsul tarixçəsi: `Escape` bağlayır, səhifə yerində qalır, fokus məhsula qayıdır
Mənbə: `BRIEFS/TASK-17.md`, «Qəbul», 1-ci bənd, sitat: "Məhsul tarixçəsi açıqdır → `Escape` basılır → pəncərə bağlanır, səhifə yerində qalır, fokus pəncərəni açan məhsul adına qayıdır."
Harada: sınaq (və ya real, yalnız oxuma) · sifariş səhifəsi, «Məhsul tarixçəsi» pəncərəsi · `/orders/<nömrə>`; «Əsas dəyişikliklər» siyahısında məhsulun sətri (`components/decisions/DriverList.tsx`:120–122) · dörd en
Addımlar: 1) Sınaq obyekti 1-in Sentyabr 2026 sifarişini açın (`04-sandbox.md`, Sınaq 1); 2) səhifəni «Əsas dəyişikliklər» siyahısına qədər aşağı sürüşdürün; 3) `Tab` ilə bir məhsulun sətrinə gəlin və `Enter` basın; 4) pəncərə açılanda `Escape` basın; 5) səhifənin yerini və fokusun harada olduğunu yazın.
Gözlənilən: pəncərə bağlanır; səhifə 2-ci addımdakı yerindədir (yuxarı və ya aşağı qaçmayıb); fokus həmin məhsulun sətrindədir (fokus çərçivəsi onun üzərindədir).
İlk auditdə: məhsul tarixçəsi açıq ikən `Escape` basıldı, pəncərə bağlanmadı (`modalStillOpen: true`) (`TASKS/TASK-17.md`, §1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-02 — «Sətri sil»: `Escape` bağlayır, heç nə silinmir
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 4-cü bənd, sitat: "Bağlamaq heç vaxt dialoqun əməliyyatını icra etmir. Bağlamaq = imtina."
Harada: sınaq · sifarişin düzəliş versiyası, «Sətri sil» pəncərəsi (`components/orders/revision/RemoveLineDialog.tsx`:48–50) · `/orders/<nömrə>`, sətrin «Sil» düyməsi (`pages/OrderDetailPage.tsx`:448; telefonda `:715`) · dörd en
Addımlar: 1) `sinaq.koordinator` ilə düzəliş versiyası olan sifarişi açın. Düzəliş versiyası yoxdursa, `04-sandbox.md` §1-in üç yoxlamasından sonra «Düzəliş versiyası yarat» (`components/orders/revision/labels.ts`:4) ilə yaradın — bu, yalnız sınaqda edilən yazma əməlidir; 2) sətirlərin sayını yazın; 3) bir sətirdə «Sil» basın; 4) «Sətri sil» pəncərəsində `Escape` basın; 5) sətirlərin sayını yenidən yazın.
Gözlənilən: pəncərə bağlanır; sətir yerindədir; sətirlərin sayı 2-ci addımdakı ilə eynidir; «Düzəliş tarixçəsi»ndə yeni silmə qeydi yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-03 — Dialoq üstündə dialoq: `Escape` yalnız üstdəkini bağlayır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 1-ci bənd, sitat: "`Escape` hər dialoqu bağlayır. Bir dialoq digərinin üstündə açıqdırsa, yalnız üstdəki bağlanır."
Harada: — · — · — · —
Addımlar: 1) Bu yoxlama tətbiqdə **bu gün aparıla bilmir**: heç bir ekran bir dialoqun üstündə başqa dialoq açmır (`TASKS/TASK-17.md`, §2.1). Qayda vahid testlərlə sübut olunub (`components/imports/review/Modal.test.tsx`, «Escape» bölməsi). 2) Yoxlama zamanı hər hansı ekranda dialoqun içindən ikinci dialoq açılırsa, onu yazın, və orada `Escape` basıb neçə dialoqun bağlandığını yazın.
Gözlənilən: `Hökm:` sətrində «yoxlanıla bilmədi (tətbiqdə iç-içə dialoq yoxdur)». İç-içə dialoq tapılıbsa: bir `Escape` yalnız üstdəkini bağlayır, alttakı açıq qalır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-04 — Məhsul tarixçəsində ⓘ qeydi: birinci `Escape` qeydi, ikincisi pəncərəni bağlayır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 1-ci bənd, sitat: "Bir dialoq digərinin üstündə açıqdırsa, yalnız üstdəki bağlanır."
Harada: sınaq (və ya real, yalnız oxuma) · «Məhsul tarixçəsi» pəncərəsi, «Orta qiymət necə hesablanır?» ⓘ (`components/analytics/TrendModal.tsx`:166) · A-01-dəki yol · dörd en
Addımlar: 1) A-01-in 1–3-cü addımları ilə pəncərəni açın; 2) göstəricilərin yanındakı ⓘ-ni basın, qeyd açılır; 3) `Escape` basın; 4) nəyin bağlandığını yazın; 5) yenidən `Escape` basın.
Gözlənilən: 3-cü addımda yalnız qeyd bağlanır, pəncərə açıq qalır, fokus ⓘ-dədir; 5-ci addımda pəncərə bağlanır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-05 — Məhsul tarixçəsi: fon klikinə bağlanır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 3-cü bənd, sitat: "Fon klikinə bağlanma yalnız **oxumaq üçün** dialoqlarda olur (məhsul tarixçəsi, mənbə, sətir detalı)."
Harada: sınaq (və ya real, yalnız oxuma) · «Məhsul tarixçəsi» pəncərəsi · A-01-dəki yol · dörd en
Addımlar: 1) A-01-in 1–3-cü addımları ilə pəncərəni açın (3-cü addımda siçan ilə də olar); 2) pəncərənin kənarındakı tünd fona basın; 3) pəncərənin içində basıb, siçanı basılı saxlayaraq fona çəkin və orada buraxın; 4) nə olduğunu yazın.
Gözlənilən: 2-ci addımda pəncərə bağlanır və başqa heç nə olmur. 3-cü addımda pəncərə bağlanmır (basış pəncərənin içində başlayıb).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-06 — «Mənbə»: fon klikinə bağlanır
Mənbə: `BRIEFS/TASK-17.md`, «Qəbul», 3-cü bənd, sitat: "Mənbə pəncərəsi açıqdır → fona klik edilir → bağlanır."
Harada: sınaq (və ya real, yalnız oxuma) · sifariş səhifəsi, «Mənbə» pəncərəsi (`components/orders/ItemSourceDrawer.tsx`:46) · `/orders/<nömrə>`, sətrin «Mənbəyə bax» düyməsi (`pages/OrderDetailPage.tsx`:427–430; telefonda `:699`) · dörd en
Addımlar: 1) A-01-dəki sifarişi açın; 2) bir sətrin «Mənbəyə bax» düyməsini basın; 3) pəncərənin kənarındakı tünd fona basın; 4) nə olduğunu yazın.
Gözlənilən: pəncərə bağlanır və başqa heç nə olmur; fokus «Mənbəyə bax» düyməsinə qayıdır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-07 — Sətir detalı, oxuma vəziyyətində: fon klikinə bağlanır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 3-cü bənd, sitat: "Fon klikinə bağlanma yalnız **oxumaq üçün** dialoqlarda olur (məhsul tarixçəsi, mənbə, sətir detalı)."
Harada: sınaq · «Excel importları», import yoxlaması, sətir detalı (`components/imports/review/RowDetailDialog.tsx`:76) · `/imports`, `04-sandbox.md`, Sınaq 3-ün importu · dörd en
Addımlar: 1) `sinaq.koordinator` ilə Sınaq 3-ün yoxlamada olan importunu açın; 2) bir sətrin detalını açın; 3) heç nəyi dəyişmədən pəncərənin kənarındakı tünd fona basın; 4) nə olduğunu yazın.
Gözlənilən: pəncərə bağlanır və başqa heç nə olmur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-08 — Sətir detalı, düzəliş yazılarkən: fon klikinə bağlanmır, yazılan qalır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 3-cü bənd, sitat: "İçində forma və ya təsdiq düyməsi olan dialoq fon klikinə bağlanmır."
Harada: sınaq · A-07-dəki sətir detalı · A-07-dəki yol · dörd en
Addımlar: 1) A-07-nin 1–2-ci addımları ilə sətir detalını açın; 2) bir sahənin «Düzəlt» düyməsini basın; 3) açılan sahəyə bir neçə hərf yazın, amma «Saxla» basmayın; 4) pəncərənin kənarındakı tünd fona basın; 5) sonra «Ləğv» ilə düzəlişdən çıxın və pəncərəni «Bağla» ilə bağlayın.
Gözlənilən: 4-cü addımda pəncərə açıq qalır və yazdığınız mətn sahədə qalır. Heç nə saxlanılmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-09 — «Sətri sil»: fon klikinə bağlanmır, heç nə silinmir
Mənbə: `BRIEFS/TASK-17.md`, «Qəbul», 2-ci bənd, sitat: "Sətri silmə təsdiqi açıqdır → fona klik edilir → pəncərə **bağlanmır** və heç nə silinmir."
Harada: sınaq · A-02-dəki «Sətri sil» pəncərəsi · A-02-dəki yol · dörd en
Addımlar: 1) A-02-nin 1–3-cü addımları ilə pəncərəni açın; 2) pəncərənin kənarındakı tünd fona basın; 3) nə olduğunu yazın; 4) pəncərəni «İmtina» ilə bağlayın və sətirlərin sayını yazın.
Gözlənilən: 2-ci addımda pəncərə açıq qalır; sətir silinmir; sətirlərin sayı dəyişmir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-10 — «Sətri redaktə et»: fon klikinə bağlanmır, heç nə saxlanılmır
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 3-cü bənd, sitat: "İçində forma və ya təsdiq düyməsi olan dialoq fon klikinə bağlanmır."
Harada: sınaq · «Sətri redaktə et» pəncərəsi (`components/orders/revision/EditLineDialog.tsx`:85–87) · `/orders/<nömrə>`, sətrin «Redaktə et» düyməsi (`pages/OrderDetailPage.tsx`:441; telefonda `:708`) · dörd en
Addımlar: 1) A-02-nin 1-ci addımındakı düzəliş versiyasını açın; 2) bir sətirdə «Redaktə et» basın; 3) miqdarı dəyişin, amma saxlamayın; 4) pəncərənin kənarındakı tünd fona basın; 5) pəncərəni «İmtina» ilə bağlayın və sətrin miqdarını yazın.
Gözlənilən: 4-cü addımda pəncərə açıq qalır və yazdığınız miqdar sahədə qalır; 5-ci addımdan sonra sətrin miqdarı əvvəlki kimidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-11 — «İdxalı təsdiqlə»: fon klikinə bağlanmır, import təsdiqlənmir
Mənbə: `BRIEFS/TASK-17.md`, «Tələb», 4-cü bənd, sitat: "Bağlamaq heç vaxt dialoqun əməliyyatını icra etmir. Bağlamaq = imtina."
Harada: sınaq · «İdxalı təsdiqlə» pəncərəsi (`components/imports/review/ConfirmationDialog.tsx`:123–125) · `/imports`, Sınaq 3-ün importu, «İdxalı təsdiqlə» düyməsi · dörd en
Addımlar: 1) A-07-nin 1-ci addımındakı importu açın; 2) «İdxalı təsdiqlə» basın; 3) pəncərənin kənarındakı tünd fona basın; 4) sonra `Escape` basın; 5) importun vəziyyətini yazın.
Gözlənilən: 3-cü addımda pəncərə açıq qalır; 4-cü addımda bağlanır; import hələ yoxlamadadır, sifariş yaradılmayıb.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-12 — Forma dialoqu: `Tab` / `Shift+Tab` içəridə dövr edir, fokus açan düyməyə qayıdır
Mənbə: `BRIEFS/TASK-17.md`, «Qəbul», 4-cü bənd, sitat: "Klaviatura ilə: dialoq açılanda ilk `Tab` dialoqun içindəki elementə düşür, arxadakı səhifəyə yox."
Harada: sınaq · import yoxlaması, «Yeni … yarat» pəncərəsi (`components/imports/review/CreateResolutionDialog.tsx`:142–144) · `/imports`, Sınaq 3-ün importu, həll olunmamış dəyərlərin siyahısında «Yeni yarat» düyməsi (`components/imports/review/UnresolvedList.tsx`:209) · dörd en
Addımlar: 1) A-07-nin 1-ci addımındakı importda həll olunmamış bir dəyərin «Yeni yarat» düyməsinə klaviatura ilə (`Tab`) gəlin və `Enter` basın; «Yeni … yarat» pəncərəsi açılır. Sınaq 3-ün importunda həll olunmamış dəyər qalmayıbsa, `Hökm:` sətrinə «yoxlanıla bilmədi (həll olunmamış dəyər yoxdur)» yazın; 2) fokusun harada olduğunu yazın; 3) `Tab`-ı pəncərənin son düyməsinə qədər, sonra bir dəfə də basın; 4) `Shift+Tab` basın; 5) `Escape` basın və fokusun harada olduğunu yazın. Heç nə yaratmayın.
Gözlənilən: 2-ci addımda fokus pəncərənin öz sahəsindədir (sahə özü fokuslanır); 3-cü addımın sonunda fokus pəncərənin ilk elementinə, «Bağla» (×) düyməsinə qayıdır, arxadakı səhifəyə keçmir; 4-cü addımda son düyməyə qayıdır; 5-ci addımda pəncərə bağlanır, fokus onu açan düymədədir və heç nə yaradılmayıb.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
