# 24 — Obyekt səhifəsinin və aylıq hesabata qayıdışın əl ilə yoxlanışı (Task 24, Obyekt səhifəsi və aylıq hesabata qayıdış)

Bu fayl Task 24-ün brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama
aparmayıb:** Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

**API-ni yenidən başlatmaq lazım deyil.** Task 24 yalnız frontend-in keçidlərini və görünüşünü dəyişir: backend, API,
baza, data və miqrasiya dəyişməyib. Frontend bu commit-dən verilməlidir (`npm run dev` yenidən başladılıb və ya səhifə
yenilənib).

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-24.md`; qərarlar 24.1, 24.2, 24.3, 24.4):

- obyekt səhifəsində hər dövr sətrində yalnız bir keçid var — dövrün adı — və bütün sətir o keçidi açır; sətirlərdəki
  «Sifarişə bax» və «Müqayisə», başlıqdakı «Müqayisə et» yoxdur; kartdakı tək «Sifarişə bax» qalır;
- «Müqayisə et» heç bir formada yoxdur: nə mətn, nə ad, nə ikon; obyektlərarası müqayisə qurulmayıb;
- son ayların zolağında sifarişi olan hər ay həmin ayın sifarişini açır (seçilmiş baza ilə); sifarişi olmayan ay keçid
  deyil; son sifarişin ayı tünd boz sütunla və qalın adla fərqlənir; hamısı klaviatura ilə əlçatandır;
- aylıq hesabatda bir xana açılıb «Geri» basılanda həmin sətir (telefonda həmin kart) yenidən ekrana gəlir;
- hesabatın axtarışı ünvanda `search` kimi qalır: «Geri» və yeniləmədən sonra mətn də, süzülmüş cədvəl də qayıdır;
- hesabatdan açılan sifarişdə başlığın əvvəlində bir «Aylıq hesabat» keçidi var; başqa yoldan açılan sifarişdə yoxdur;
- heç bir məbləğ, status, dövr siyahısı, hesabat rəqəmi və rəngi dəyişməyib.

Hər ünvan, düymə və mətn yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`) — H-01 … H-07, H-09 … H-16. Orada heç bir yazma düyməsi
  basılmır: «Təsdiqlə», «Düzəliş tələb et», «Redaktə et», «Sil», «Sətir əlavə et», «Düzəliş versiyası yarat» və
  başqaları. Keçidə klik, süzgəc, baza seçimi, axtarış, «Geri» və yeniləmə yalnız oxumadır.
  - **`<OBYEKT>`** — «Heydər Əliyev Mərkəzi»: bir neçə ayda sifarişi olan obyekt. Yol: «Obyektlər» (`/locations`) →
    «Heydər Əliyev Mərkəzi» (ünvan `/locations/<nömrə>`). Nömrəni ünvan sətrindən götürüb hər yoxlamanın `Qeyd:`
    sətrinə yazın. Zolaqda sifarişsiz ay (boşluq) yoxdursa, H-07 üçün zolağında boşluq olan başqa obyekt seçin və adını
    yazın.
  - **Aylıq hesabat** — menyuda «Aylıq hesabat» (`/dashboard/monthly`, `App.tsx`:33), 2026-cı il.
  - Açan hesab: Rəhbər və ya Admin.
- **Sınaq mühiti** (`http://localhost:5174`) — H-08 və H-17. Onun işə salınması, hesablar və sıfırlama
  `docs/audits/2026-final-enver-muellim-audit/01-hazirliq.md`, 5-ci bənddədir; hər yazma əməlindən əvvəl
  `docs/audits/2026-final-enver-muellim-audit/04-sandbox.md`, 1-ci bölmənin üç yoxlaması edilir. Sıfırlamadan dərhal
  sonra orada bunlar var (`tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`):
  - **«Sınaq obyekti 1»** — İyul və Avqust 2026 (Excel-dən təsdiqlənmiş kimi, :71–93) və Sentyabr 2026 (təsdiq gözləyən
    test sifarişi, :44–53);
  - **«Sınaq obyekti 2»** — yalnız Sentyabr 2026, göndərilməmiş sifariş (:56–64): **bir dövrlü obyekt** (H-17).
- **`04-sandbox.md`, Sınaq 1-in 6-cı addımı** Sentyabr sifarişinin düzəliş versiyasını yaradır. H-08 onun nəticəsini
  oxuyur. Task 23-dən bəri həmin addımda «Redaktə et»-dən əvvəl `Sətirlər` başlığı açılmalıdır. Sınaq 1 Task 15-in
  qeydidir və dəyişdirilmir.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`, yoxlamada başqa en göstərilməyibsə.
  `En:` sətrinə hansı endə aparıldığını yazın.
- **H-11-də `1366×768`-də cədvəlin üfüqi sürüşüb-sürüşmədiyini mütləq yazın.** Gözlənilən: sürüşmür. Cədvəlin öz
  sürüşmə qutusu yalnız 1064 pikseldən dar pəncərədə yaranır (`components/reports/MonthlyReportTable.tsx`:103,
  izahı :88–102). Bu, Task 12-nin qəbul edilmiş davranışıdır; Task 24 onu dəyişmir.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `H-01-obyekt-1440.png`. Şəkillər
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
  mötərizədə səbəbini göstərin. Rəqəmi olmayan yoxlamada `Rəqəm:` sətrinə «yoxdur» yazın.
- Mətni ekranda gördüyünüz kimi, hərfbəhərf yazın: nöqtə, orta nöqtə (`·`), «» dırnaqları və böyük-kiçik hərf daxil.
- «Geri» dedikdə brauzerin öz «Geri» düyməsi (və ya `Alt+←`) nəzərdə tutulur, səhifədəki «Aylıq hesabat» keçidi yox —
  o, H-14 … H-16-da ayrıca yoxlanılır.
- Hesabatın axtarışı yalnız `Enter` basılanda tətbiq olunur (`pages/MonthlyReportPage.tsx`:101–104). Yazmaq özü cədvəli
  süzmür və ünvanı dəyişmir; bu, əvvəlki davranışdır.
- Hesabat açılan yer yadda saxlanılır: «Geri» ilə qayıdanda sətir ekranın ortasına gətirilir. Menyudan və ya yeni
  keçidlə gəldikdə səhifə yuxarıdan açılır (`navigation/useScrollMemory.ts`, Task 9, dəyişməyib).

---

## Yoxlamalar

### H-01 — Obyektin başlığında «Müqayisə et» yoxdur; yalnız «Obyektlərə qayıt» qalıb
Mənbə: `BRIEFS/TASK-24.md`, «Tələb», 2-ci bənd, sitat: ""Müqayisə et" düyməsi silinsin. Yenidən adlandırılmasın — olmayan imkanı vəd edirdi."
Harada: real (yalnız oxuma) · obyekt səhifəsi, başlıq · `<OBYEKT>` (`/locations/<nömrə>`); başlığın düymələri (`pages/LocationDetailPage.tsx`:146–150) · dörd en
Addımlar: 1) Rəhbər və ya Admin ilə daxil olun; 2) «Obyektlər» → «Heydər Əliyev Mərkəzi»; 3) başlığın sağındakı bütün düymə və keçidləri soldan sağa hərfbəhərf yazın; 4) `Ctrl+F` ilə «Müqayisə et» axtarın və neçə dəfə tapıldığını yazın; 5) DevTools → Elements-də `Ctrl+F` ilə `müqayisə et` (kiçik hərflə) axtarın — atributlar da daxil (`aria-label`, `title`) — və nəticəni yazın; 6) səhifədə yuxarı sağda qrafik oxu (↗) ikonu olan tünd düymənin olub-olmadığını yazın.
Gözlənilən: 3-cü addımda yalnız «Obyektlərə qayıt». 4-cü və 5-ci addımda 0 nəticə (kartdakı «Müqayisə» sözü bazanın seçicisinin başlığıdır və «Müqayisə: …» sətridir — onlar qalır və «Müqayisə et» deyil). 6-cı addımda belə düymə yoxdur. Nə yeni ad, nə deaktiv düymə, nə də «tezliklə» izahı yoxdur (24.2).
İlk auditdə: yuxarıda tünd «Müqayisə et» düyməsi obyektlərin bir-biri ilə müqayisəsini vəd edirdi, halbuki ən son sifarişi açırdı (`BRIEFS/TASK-24.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-02 — Hər dövr sətrində bir keçid: dövrün adı; cədvəl üç sütunlu; ünvanlar eyni
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 1-ci bənd, sitat: "Obyekt səhifəsində hər dövr sətrində bir keçid var; "Müqayisə et" düyməsi yoxdur."
Harada: real (yalnız oxuma) · obyekt səhifəsi, sifarişlər cədvəli · `<OBYEKT>`; sütun başlıqları (`pages/LocationDetailPage.tsx`:256–259), sətir (:278–314), dövr keçidi (:286–292) · dörd en
Addımlar: 1) `<OBYEKT>`-i açın; kartda müqayisədə «Son 3 ayın ortalaması»nı seçin; 2) cədvəlin sütun başlıqlarını soldan sağa yazın; 3) ilk üç sətrin hər birində neçə keçid olduğunu sayın (DevTools-da sətrin `<tr>`-i içində `<a>` elementlərinin sayı) və keçidin mətnini yazın; 4) hər üç keçidin `href`-ini yazın; 5) sətirlərdə «Sifarişə bax», «Müqayisə» sözlərinin və sağda boş sütunun olub-olmadığını yazın; 6) DevTools → Accessibility-də ilk sətrin keçidinin adını (Name) yazın.
Gözlənilən: 2-ci addımda «Dövr · Məbləğ · Status» (dördüncü, boş sütun yoxdur). 3-cü addımda hər sətirdə bir keçid, mətni dövr, məsələn «Sentyabr 2026». 4-cü addımda `/orders/<nömrə>?basis=avg3` — seçilmiş baza ünvandadır; hər sətrin nömrəsi başqadır (sətrin öz sifarişi), eyni ayın iki sətri olsa belə. 5-ci addımda heç biri yoxdur. 6-cı addımda ad dövrün özüdür (məsələn «Sentyabr 2026»), əlavəsiz.
İlk auditdə: sətirdə üç keçid eyni sifarişə aparırdı: dövr adı, «Sifarişə bax» və «Müqayisə» (`BRIEFS/TASK-24.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-03 — Sətir bütövlükdə açılır: siçan altında dəyişir, fokus görünür, məbləğə və statusa klik sifarişi açır
Mənbə: `BRIEFS/TASK-24.md`, «Tələb», 1-ci bənd, sitat: "Obyekt səhifəsində hər dövr sətrində bir keçid qalsın."
Harada: real (yalnız oxuma) · obyekt səhifəsi, sifarişlər cədvəli · `<OBYEKT>`; sətir səthi (`pages/LocationDetailPage.tsx`:284, `components/interaction.ts`:25–47, :65, :71, :74) · `1440×900` və `390×844`
Addımlar: 1) `<OBYEKT>`-i açın; 2) siçanı ikinci sətrin məbləğinin üzərinə aparın (basmadan); sətrin fonunun, dövr adının altından xəttin və kursorun necə dəyişdiyini yazın; 3) siçanı cədvəldən çıxarın; nə dəyişdiyini yazın; 4) ikinci sətrin **məbləğinə** klik edin; açılan ünvanı yazın; «Geri» basın; 5) üçüncü sətrin **statusuna** klik edin; ünvanı yazın; «Geri» basın; 6) sətirdə «Əvvəlki sifariş — sonradan yenilənib» qeydi varsa, qeydə klik edin və ünvanı yazın; 7) məbləğin rəqəmlərini siçanla seçib (sürükləyib) buraxın; səhifənin dəyişib-dəyişmədiyini yazın; 8) `Tab` ilə cədvəlin ilk sətrinə gəlin; fokusun harada göründüyünü (dövr adının ətrafında çərçivə, sətrin fonu, alt xətt) yazın və `Enter` basın; 9) `390×844`-də 4-cü addımı toxunuşla təkrarlayın.
Gözlənilən: 2-ci addımda sətrin fonu açıq boz olur, dövr adının altında xətt çıxır, kursor əl olur. 3-cü addımda hamısı əvvəlki halına qayıdır. 4–6-cı addımlarda sətrin öz sifarişi açılır — dövr adının `href`-i ilə eyni ünvan (H-02). 7-ci addımda səhifə dəyişmir: mətn seçmək sifariş açmır. 8-ci addımda dövr adının ətrafında tünd çərçivə, sətrin fonu açıq boz və alt xətt; `Enter` həmin sifarişi açır. 9-cu addımda telefonda da eyni.
İlk auditdə: sətir siçan altında rəngini dəyişirdi, amma klik edilmirdi (Task 20-nin 20.3 qaydası; `TASKS/TASK-24.md`, §2.1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-04 — Kartdakı tək «Sifarişə bax» ən son sifarişi açır — ilk sətrin açdığını
Mənbə: `TASKS/TASK-24.md`, §9, 2-ci meyar, sitat: "The card's single `Sifarişə bax` still opens the latest order with the basis."
Harada: real (yalnız oxuma) · obyekt səhifəsi, «Son sifariş» kartı · `<OBYEKT>`; kartın keçidi (`components/locations/LocationTrend.tsx`:92–97, dəyişməyib) · dörd en
Addımlar: 1) `<OBYEKT>`-i açın, süzgəcsiz, 1-ci səhifədə; 2) kartdakı bütün keçid və düymələri yazın; «Sifarişə bax»-ın neçə dəfə olduğunu sayın; 3) kartın «Sifarişə bax»-ının `href`-ini və cədvəlin ilk sətrindəki dövr keçidinin `href`-ini yazın; 4) kartda «Son 3 ayın ortalaması»nı seçin və 3-cü addımı təkrarlayın; 5) kartın «Sifarişə bax»-ına klik edin və açılan sifarişin başlığını (obyekt, dövr) yazın.
Gözlənilən: 2-ci addımda «Sifarişə bax» kartda bir dəfədir; qalanı bazanın düymələri və zolağın ayları (H-06). 3-cü və 4-cü addımda iki `href` eynidir və seçilmiş bazanı daşıyır (`?basis=last`, sonra `?basis=avg3`). 5-ci addımda kartın «Son sifariş · <ay>» yazısındakı ay açılır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-05 — Süzgəc altında və 2-ci səhifədə: «Müqayisə et» yoxdur, ən son sifarişə yol süzgəci təmizləməkdir
Mənbə: `TASKS/TASK-24.md`, §4.2, sitat: "Under a year or month filter, or on page 2, the button was the only control that reached the latest order (§2.1). After this task, the reader reaches it by: clearing the filter (`Filtri təmizlə`), or going to page 1, where the card and the first row lead to it; or opening any row's order and following that page's own links."
Harada: real (yalnız oxuma) · obyekt səhifəsi · `<OBYEKT>`; kartın şərti (`pages/LocationDetailPage.tsx`:93), süzgəclər (:202–250), səhifələr (:320–344) · `1440×900` və `390×844`
Addımlar: 1) `<OBYEKT>`-i açın; 2) «Bütün aylar» süzgəcində ən son sifarişin ayından **başqa** bir ay seçin (məsələn Mart); 3) kartın, zolağın və «Müqayisə et»-in olub-olmadığını yazın; başlıqdakı düymələri yazın; 4) səhifədəki bütün `/orders/` keçidlərinin sayını və nömrələrini yazın (DevTools → Elements, `Ctrl+F` `href="/orders/`); 5) «Filtri təmizlə»-yə basın; kartın qayıtdığını və ilk sətrin ən son sifariş olduğunu yazın; 6) 24-dən çox sifarişi olan obyekt varsa, onu açın, «Növbəti» ilə 2-ci səhifəyə keçin və 3-cü, 4-cü addımları təkrarlayın, sonra «Əvvəlki» basın. Belə obyekt yoxdursa, 6-cı addımı `Qeyd:`-də «yoxlanıla bilmədi (24-dən çox sifarişli obyekt yoxdur)» kimi yazın.
Gözlənilən: 3-cü addımda kart, zolaq və «Müqayisə et» yoxdur; başlıqda yalnız «Obyektlərə qayıt». 4-cü addımda yalnız süzülmüş sətirlərin sifarişləri — ən son sifarişə keçid yoxdur. Bu, 24.2-nin nəticəsidir və əvəz edilmir. 5-ci addımda kart qayıdır, ilk sətir və kart ən son sifarişi açır. 6-cı addımda 2-ci səhifədə də kart və «Müqayisə et» yoxdur; 1-ci səhifədə kart var.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-06 — Zolaqda sifarişi olan hər ay həmin ayın sifarişini bazası ilə açır
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 2-ci bənd, sitat: "Trend sütununa klik edilir → həmin ayın sifariş səhifəsi açılır; cari ayın sütunu digərlərindən görünüşcə fərqlidir."
Harada: real (yalnız oxuma) · obyekt səhifəsi, kartın altındakı «Son ayların məbləğləri» zolağı · `<OBYEKT>`; ayın keçidi (`components/locations/LocationTrend.tsx`:132–139), keçidin adı (:197–200) · dörd en
Addımlar: 1) `<OBYEKT>`-i açın və kartda «Son 3 ayın ortalaması»nı seçin; 2) zolaqdakı ayları soldan sağa, adı və məbləği ilə yazın; 3) siçanı ən soldakı ayın sütununun üzərinə aparın; fonun və sütunun rənginin dəyişdiyini, kursoru yazın; 4) həmin aya klik edin; açılan sifarişin başlığını (obyekt, dövr) və ünvanını yazın; «Geri» basın; 5) ortadakı bir ayla 3–4-cü addımları təkrarlayın; 6) açılan sifarişlərin nömrələrini cədvəldə həmin ayın **ən yuxarıdakı** sətrinin dövr keçidi ilə müqayisə edin; 7) DevTools → Accessibility-də bir ayın keçidinin adını (Name) yazın; qiyməti olmayan sətri olan ay varsa (altında «⚠ N»), onun adını da yazın; 8) ayların adlarında və ya adlarında «trend» sözünün olub-olmadığını yazın.
Gözlənilən: 3-cü addımda fon açıq boz olur, sütun bir az tündləşir, kursor əl olur. 4-cü və 5-ci addımda həmin ayın sifarişi açılır, ünvan `/orders/<nömrə>?basis=avg3`. 6-cı addımda nömrələr eynidir. 7-ci addımda ad sütunun ipucu ilə eynidir: «Avqust 2026: 1.958,52 ₼» şəklində; qiyməti olmayan ayda davamı ilə: «… · N sətirdə qiymət yoxdur». 8-ci addımda yoxdur. Sütunların hündürlüyü, ay adları, məbləğlər və «⚠ N» əvvəlki kimidir.
İlk auditdə: trend sütunları klik edilmirdi (`BRIEFS/TASK-24.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-07 — Sifarişi olmayan ay keçid deyil və siçan altında dəyişmir
Mənbə: `TASKS/TASK-24.md`, §9, 3-cü meyar, sitat: "A month with no order is not a link."
Harada: real (yalnız oxuma) · obyekt səhifəsi, zolaq · zolağında boşluq (qırıq xətli çərçivə, altında «—») olan obyekt; boş ay (`components/locations/LocationTrend.tsx`:129–130) · `1440×900` və `390×844`
Addımlar: 1) zolağında boşluq olan obyekti açın və adını yazın; 2) boş ayın adını və altındakı yazını yazın; 3) siçanı onun üzərinə aparın: ipucunu, fonun və kursorun dəyişib-dəyişmədiyini yazın; 4) ona klik edin; ünvanın dəyişib-dəyişmədiyini yazın; 5) `Tab` ilə zolağı keçin; fokusun boş aya düşüb-düşmədiyini yazın.
Gözlənilən: 2-ci addımda ay adı və «—». 3-cü addımda ipucu «<Ay İl>: sifariş yoxdur»; fon və kursor dəyişmir. 4-cü addımda heç nə olmur. 5-ci addımda fokus boş aya düşmür, qonşu aylara düşür.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-08 — Düzəldilmiş ay ən yeni versiyanı açır
Mənbə: `TASKS/TASK-24.md`, §4.3, sitat: "the same newest-version order the month shows"
Harada: sınaq · «Sınaq obyekti 1»-in obyekt səhifəsi · `04-sandbox.md`, Sınaq 1-in 6-cı addımından sonra · `1440×900`
Addımlar: 1) `04-sandbox.md`, Sınaq 1-in 1–6-cı addımlarını aparın (6-cı addımda `Sətirlər`-i açmağı unutmayın); 2) «Obyektlər» → «Sınaq obyekti 1»; 3) cədvəldə Sentyabr 2026-nın iki sətrini, hər birinin qeydini və dövr keçidinin `href`-ini yazın; 4) zolaqda Sentyabr sütununa klik edin və ünvanı yazın; 5) açılan sifarişin 3-cü addımdakı sətirlərdən hansı olduğunu yazın. Sınaq 1 bu seansda aparılmırsa, bütün yoxlamanı «yoxlanıla bilmədi (Sınaq 1 aparılmayıb)» kimi yazın.
Gözlənilən: 3-cü addımda iki Sentyabr sətri; aşağıdakının altında «Əvvəlki sifariş — sonradan yenilənib». 4-cü addımda açılan ünvan yuxarıdakı (qeydsiz, ən yeni) sətrin keçidi ilə eynidir. Sentyabr həm də son sifarişin ayıdır (H-09).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-09 — Son sifarişin ayı fərqlənir: tünd boz sütun, qalın ad, `aria-current`; qırmızı və yaşıl yoxdur
Mənbə: `BRIEFS/TASK-24.md`, «Tələb», 3-cü bənd, sitat: "Trend sütunları həmin ayın sifarişinə aparsın; cari ay digərlərindən fərqlənsin; klaviatura ilə də əlçatan olsun."
Harada: real (yalnız oxuma) · obyekt səhifəsi, zolaq · `<OBYEKT>`; son ay (`components/locations/LocationTrend.tsx`:122, :135, :162, :181) · dörd en
Addımlar: 1) `<OBYEKT>`-i açın; 2) kartın «Son sifariş · <ay>» yazısındakı ayı yazın; 3) zolağın ən sağdakı ayını yazın və onun sütununun, adının görünüşünü qonşu aylarla müqayisə edin (rəng, qalınlıq); 4) DevTools-da ən sağdakı ayın keçidini seçin və `aria-current` atributunu yazın; başqa bir ayın keçidində bu atributun olub-olmadığını yazın; 5) zolaqda qırmızı və ya yaşıl rəngin olub-olmadığını yazın; 6) başqa bazanı seçin («Keçən ay») və 3–5-ci addımları təkrarlayın.
Gözlənilən: 2-ci və 3-cü addımda eyni ay. 3-cü addımda onun sütunu tünd boz, adı qalın və qara; qalanlarının sütunu açıq boz, adı boz. 4-cü addımda `aria-current="true"` yalnız ən sağdakı aydadır. 5-ci addımda yoxdur: məbləğ cəmdir, istiqamət deyil (9.1). 6-cı addımda heç nə dəyişmir — cari ay bazadan asılı deyil.
İlk auditdə: cari ay digərlərindən fərqlənmirdi (`BRIEFS/TASK-24.md`, «Tələb», 3-cü bənd)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-10 — Zolaq klaviatura ilə: `Tab` hər aya çatır, `Enter` açır
Mənbə: `BRIEFS/TASK-24.md`, «Tələb», 3-cü bənd, sitat: "klaviatura ilə də əlçatan olsun"
Harada: real (yalnız oxuma) · obyekt səhifəsi, zolaq · `<OBYEKT>`; ayın fokus halqası (`components/interaction.ts`:71) · `1440×900` və `1366×768`
Addımlar: 1) `<OBYEKT>`-i açın; 2) siçandan istifadə etmədən `Tab` ilə kartın «Sifarişə bax»-ından sonra bazanın düymələrindən keçib zolağa gəlin; 3) zolaqda hər `Tab`-da fokusun hansı aya düşdüyünü və görünüşünü (ətrafında tünd çərçivə) yazın; 4) ən sağdakı aya gəldikdə `Enter` basın və açılan ünvanı yazın; 5) «Geri» basın; 6) `Shift+Tab` ilə geri gedin və bir ayda `Enter` basın.
Gözlənilən: 3-cü addımda fokus sifarişi olan hər aya soldan sağa bir-bir düşür, boş aylara düşmür (H-07); fokuslanan ayın ətrafında tünd çərçivə görünür. 4-cü və 6-cı addımda həmin ayın sifarişi açılır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-11 — Aylıq hesabat, geniş ekran: «Geri» açılan xananın sətrini ekrana qaytarır; `1366×768`-də üfüqi sürüşmə
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 3-cü bənd, sitat: "Aylıq hesabatda aşağı sürüşülür, bir xanaya klik edilir, "geri" basılır → həmin sətir yenidən ekranda görünür."
Harada: real (yalnız oxuma) · «Aylıq hesabat» (`/dashboard/monthly`), cədvəl · sətrin `id`-si (`components/reports/MonthlyReportTable.tsx`:187), xananın keçidi (:268–270), yaddaşın qoşulması (`pages/MonthlyReportPage.tsx`:77–80) · `1366×768`, `1440×900`, `1200×800`
Addımlar: 1) menyudan «Aylıq hesabat»-ı açın; 2) **yuxarıdan üçüncü** sətrin istənilən doldurulmuş xanasına klik edin; obyektin adını, ayı və açılan ünvanı yazın; 3) brauzerin «Geri» düyməsinə basın; cədvəl yükləndikdən sonra həmin sətrin ekranda olub-olmadığını və harada (yuxarı, orta, aşağı) olduğunu yazın; 4) **ortadakı** bir sətirlə 2–3-cü addımları təkrarlayın (əvvəl ora qədər sürüşdürün); 5) **ən aşağıdakı** obyekt sətri ilə təkrarlayın; 6) menyudan «Aylıq hesabat»-a yenidən basın: səhifənin yuxarıdan açıldığını yazın; 7) DevTools-da bir sətrin `<tr>`-inin `id`-sini yazın; 8) `1366×768`-də cədvəlin altında üfüqi sürüşmə zolağının olub-olmadığını və cədvəlin sağa sürüşüb-sürüşmədiyini (`Shift` + təkər) yazın.
Gözlənilən: 2-ci addımda ünvan `/orders/<nömrə>?back=monthly`. 3–5-ci addımlarda açılan xananın sətri ekrana, təxminən ortaya gətirilir; səhifə yuxarıdan açılmır. 6-cı addımda səhifə yuxarıdan açılır (menyu yeni gəlişdir). 7-ci addımda `row-<obyektin nömrəsi>`. 8-ci addımda cədvəl üfüqi sürüşmür (sürüşmə qutusu yalnız 1064 pikseldən darda yaranır).
İlk auditdə: matrisin iyirminci sətrindəki xanaya klik edilib «geri» basılanda matris yuxarıdan açılırdı (`BRIEFS/TASK-24.md`, «Problem»); geniş ekranda cədvəl ~1 197 px idi (`TASKS/TASK-24.md`, §2.3)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-12 — Aylıq hesabat, telefon (`390×844`): «Geri» həmin kartı qaytarır
Mənbə: `BRIEFS/TASK-24.md`, «Tələb», 4-cü bənd, sitat: "Aylıq hesabatdan sifariş səhifəsinə girib qayıdanda oxucu tərk etdiyi sətrə qayıtsın."
Harada: real (yalnız oxuma) · «Aylıq hesabat», telefon kartları · kartın `id`-si (`components/reports/MonthlyReportTable.tsx`:493), kartdakı ay (:513, cədvəlin eyni `Cell`-i) · `390×844`
Addımlar: 1) `390×844`-də «Aylıq hesabat»-ı açın; 2) ortadakı bir obyektin kartına qədər sürüşdürün; obyektin adını yazın; 3) kartdakı bir aya toxunun; ünvanı yazın; 4) «Geri» basın; həmin kartın ekranda olub-olmadığını yazın; 5) son kartla 2–4-cü addımları təkrarlayın; 6) DevTools-da kartın `<li>`-sinin `id`-sini yazın.
Gözlənilən: 3-cü addımda `/orders/<nömrə>?back=monthly`. 4-cü və 5-ci addımda həmin kart ekrana, təxminən ortaya gətirilir. 6-cı addımda `row-<obyektin nömrəsi>-phone`.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-13 — «Novxan» axtarışı «Geri»dən və yeniləmədən sonra qalır
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 4-cü bənd, sitat: "Aylıq hesabatda "Novxan" axtarılır, bir xanaya klik edilir, "geri" basılır → axtarış mətni və süzülmüş cədvəl qayıdır; səhifə yenilənir → yenə qayıdır."
Harada: real (yalnız oxuma) · «Aylıq hesabat», axtarış sahəsi · axtarış (`pages/MonthlyReportPage.tsx`:27, :30, :60–71, :101–104) · `1440×900` və `390×844`
Addımlar: 1) menyudan «Aylıq hesabat»-ı açın və ünvanı yazın; 2) axtarış sahəsinə «Novxan» yazın, **`Enter` basmadan** ünvanı və cədvəldəki obyektləri yazın; 3) `Enter` basın; ünvanı, cədvəldəki obyektləri və sağdakı «N / M obyekt» yazısını yazın; 4) bir xanaya klik edin; 5) «Geri» basın; axtarış sahəsindəki mətni, ünvanı və cədvəldəki obyektləri yazın; 6) səhifəni yeniləyin (`F5`); 5-ci addımın qeydlərini təkrarlayın; 7) ünvanı kopyalayıb yeni vərəqdə açın; eyni qeydləri edin; 8) axtarışı silib `Enter` basın, sonra brauzerin «Geri» düyməsinə bir dəfə basın və hara getdiyinizi yazın. «Novxan» heç bir obyektə uyğun gəlmirsə («Axtarışa uyğun obyekt tapılmadı.»), başqa bir obyekt adının hissəsini istifadə edin və `Qeyd:`-də yazın.
Gözlənilən: 2-ci addımda ünvan dəyişməyib, cədvəl süzülməyib (axtarış `Enter` ilə tətbiq olunur). 3-cü addımda ünvanda `search=Novxan`, cədvəldə yalnız uyğun obyekt(lər), «N / M obyekt». 5-ci, 6-cı və 7-ci addımda sahədə «Novxan», ünvanda `search=Novxan`, cədvəl süzülmüş. 8-ci addımda «Geri» axtarışları bir-bir geri qaytarmır — hesabatdan əvvəlki səhifəyə gedir (axtarış tarixçəyə yazılmır, ünvanı yerində dəyişir).
İlk auditdə: axtarış mətni ünvanda saxlanılmır, səhifə yenilənəndə itir (`BRIEFS/TASK-24.md`, «Problem»). Spesifikasiyanın yoxlaması: `search` `4e6acad`-də artıq ünvanda idi (`TASKS/TASK-24.md`, §2.3); bu yoxlama canlı davranışı təsdiq edir.
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-14 — «Aylıq hesabat» keçidi: hesabatın açdığı səhifədə «Geri» kimi işləyir — axtarış və sətir qayıdır
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 5-ci bənd, sitat: "Aylıq hesabatdan açılan sifariş səhifəsində geri keçid görünür və hesabata qaytarır."
Harada: real (yalnız oxuma) · hesabatdan açılan sifariş səhifəsi, başlıq · keçid (`pages/OrderDetailPage.tsx`:309–324, başlıqdakı yeri :354–378), klikin davranışı (:188–206), ünvan modulu (`navigation/monthlyReportReturn.ts`) · dörd en
Addımlar: 1) «Aylıq hesabat»-da «Novxan» axtarın (`Enter`), aşağı sürüşdürüb bir xanaya klik edin; 2) sifariş səhifəsinin başlığının sağındakı elementləri soldan sağa yazın; birincinin mətnini və solundakı ikonu yazın; 3) DevTools-da onun `href`-ini və Accessibility → Name-i yazın; 4) ona klik edin; ünvanı, axtarış sahəsindəki mətni və açdığınız sətrin ekranda olub-olmadığını yazın; 5) brauzerin «Geri» düyməsinə bir dəfə basın və hara getdiyinizi yazın; 6) `390×844`-də 1–4-cü addımları təkrarlayın; 7) hesabatdan yenidən bir xana açın və «Aylıq hesabat»-a cəld iki dəfə klik edin; hara getdiyinizi yazın.
Gözlənilən: 2-ci addımda birinci «← Aylıq hesabat» (sol ox ikonu), sonra status nişanı, sonra «Obyektin sifarişləri»; görünüşü «Obyektin sifarişləri» ilə eynidir (boz çərçivəli). 3-cü addımda `href` `/dashboard/monthly?year=<sifarişin ili>`, ad yalnız «Aylıq hesabat». 4-cü addımda hesabat qayıdır: ünvanda `search=Novxan`, sahədə «Novxan», açdığınız sətir ekranda (H-11) — bu, brauzerin «Geri»si ilə eynidir. 5-ci addımda hesabatdan əvvəlki səhifəyə gedirsiniz, sifarişə yox: keçid tarixçəyə yeni sətir əlavə etmir. 7-ci addımda hesabat açılır, ondan əvvəlki səhifə yox: cüt klik bir dəfə geri gedir.
İlk auditdə: sifariş səhifəsində hesabata aparan heç bir element yox idi (`TASKS/TASK-24.md`, §2.3)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-15 — «Aylıq hesabat» keçidi başqa hallarda adi keçiddir: səbəb seçildikdən, baza dəyişdikdən sonra, kopyalanmış ünvanda, yeni vərəqdə
Mənbə: `TASKS/TASK-24.md`, §4.6, sitat: "On any other entry, the link simply navigates to the report for the order's year."
Harada: real (yalnız oxuma) · hesabatdan açılan sifariş səhifəsi · keçid (`pages/OrderDetailPage.tsx`:309–324, :188–206); fərziyyə 4 (`TASKS/TASK-24.md`) · `1440×900`
Addımlar: 1) «Aylıq hesabat»-da «Novxan» axtarın, bir xanaya klik edin; 2) «Niyə dəyişib?» bölməsində bir səbəbə (məsələn «Yeni məhsullar») və ya «Əsas dəyişikliklər»dəki bir süzgəcə basın; ünvanı yazın və «Aylıq hesabat» keçidinin hələ də görünüb-görünmədiyini yazın; 3) müqayisədə başqa bazanı seçin; ünvanı yazın; 4) «Aylıq hesabat»-a klik edin; ünvanı, axtarış sahəsini və səhifənin harada açıldığını yazın; 5) brauzerin «Geri» düyməsinə basın; hara getdiyinizi yazın; 6) sifarişin ünvanını (`…?back=monthly…`) kopyalayıb yeni vərəqdə açın; «Aylıq hesabat»-ın görünüb-görünmədiyini və klik edəndə ünvanı yazın; 7) sifariş səhifəsində «Aylıq hesabat»-a orta düymə ilə (və ya `Ctrl`+klik) basın; yeni vərəqin açıldığını və cari vərəqin sifarişdə qaldığını yazın.
Gözlənilən: 2-ci və 3-cü addımda ünvanda `back=monthly` qalır (`cause`, `basis` ilə yanaşı), keçid görünür. 4-cü addımda `/dashboard/monthly?year=<il>` açılır — yuxarıdan və axtarışsız. Bu, gözlənilən güzəştdir (fərziyyə 4): səhifənin öz addımları tarixçəyə yazıldığı üçün keçid artıq bir addım geri getmir. 5-ci addımda sifarişə qayıdırsınız; brauzerin «Geri»si ilə daha geri getsəniz, axtarışlı hesabat sətri ilə qayıdır. 6-cı addımda keçid görünür və `/dashboard/monthly?year=<il>` açır. 7-ci addımda yeni vərəqdə hesabat açılır, cari vərəq sifarişdə qalır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-16 — Başqa yoldan açılan sifarişdə «Aylıq hesabat» keçidi yoxdur
Mənbə: `TASKS/TASK-24.md`, §9, 6-cı meyar, sitat: "An order opened from the dashboard or the object page shows no such control."
Harada: real (yalnız oxuma) · sifariş səhifəsi, başlıq · keçidin şərti (`navigation/monthlyReportReturn.ts`, `openedFromMonthlyReport`; `pages/OrderDetailPage.tsx`:179, :310–312) · `1440×900` və `390×844`
Addımlar: 1) «İdarəetmə paneli»ndən bir kartı və ya sətri açın; başlığın elementlərini və ünvanı yazın; 2) «Obyektlər» → `<OBYEKT>` → bir dövr sətrini, sonra zolaqdakı bir ayı, sonra kartın «Sifarişə bax»-ını açın; hər dəfə başlığı və ünvanı yazın; 3) Rəhbər ilə «Təsdiq gözləyənlər»dən bir sifarişi açın (varsa); başlığı yazın; 4) hesabatdan açılmış bir sifarişin ünvanında `back=monthly`-ni `back=panel` edib açın; başlığı yazın; 5) hesabatdan açılmış sifarişdəki «Ən son sifarişə bax» və ya «Obyektin sifarişləri» keçidləri ilə başqa səhifəyə keçib oradan sifariş açın; başlığı yazın.
Gözlənilən: 1–5-ci addımların heç birində «Aylıq hesabat» keçidi yoxdur; başlıq əvvəlki kimidir: status nişanı və «Obyektin sifarişləri». Ünvanlarda `back` yoxdur (4-cü addımda `back=panel` heç nə göstərmir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-17 — Bir dövrlü obyekt: bir sətir, bir keçid; zolaqda bir ay, o da cari ay
Mənbə: `BRIEFS/TASK-24.md`, «Qəbul», 6-cı bənd, sitat: "Obyekt səhifəsində heç bir məbləğ, status və dövr siyahısı dəyişmir; aylıq hesabatın heç bir rəqəmi və rəngi dəyişmir."
Harada: sınaq · «Sınaq obyekti 2»-nin obyekt səhifəsi (sıfırlamadan sonra yalnız Sentyabr 2026, `tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`:56–64); sonra «Aylıq hesabat» · `1440×900` və `390×844`
Addımlar: 1) sıfırlamadan sonra `sinaq.rehber` ilə daxil olun; 2) «Obyektlər» → «Sınaq obyekti 2»; faktlar sətrindəki «Dövrlər» və «Sifarişlər» rəqəmlərini yazın; 3) cədvəldəki sətirləri, hər birinin məbləğini, statusunu və keçidlərini yazın; 4) kartın «Son sifariş · <ay>» yazısını, məbləğini və «Sifarişə bax»-ın sayını yazın; 5) zolaqdakı ayların sayını, adını, sütununun görünüşünü (H-09) və `aria-current`-i yazın; 6) zolaqdakı aya klik edin, ünvanı yazın, «Geri» basın; 7) «Aylıq hesabat»-da «Sınaq obyekti 2»-nin sətrini tapın: Sentyabr xanasının məbləğini və «İl cəmi»ni yazın, obyekt səhifəsindəki məbləğlə müqayisə edin.
Gözlənilən: 2-ci addımda «Dövrlər 1», «Sifarişlər 1». 3-cü addımda bir sətir — Sentyabr 2026, məbləği, statusu «Təsdiqlənməyib» — və bir keçid (dövr). 4-cü addımda kartda Sentyabr 2026, eyni məbləğ, bir «Sifarişə bax». 5-ci addımda bir ay — «Sentyabr 2026», tünd sütun, qalın ad, `aria-current="true"`. 6-cı addımda sətrin keçidi ilə eyni sifariş. 7-ci addımda hesabatın rəqəmləri obyekt səhifəsindəki ilə eynidir; heç bir rəqəm və rəng dəyişməyib.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
