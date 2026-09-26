# 22 — Tarixi təsdiq ifadəsinin əl ilə yoxlanışı (Task 22a, Tarixi təsdiq ifadəsi — sifariş səhifəsi)

Bu fayl Task 22a-nın brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama
aparmayıb:** Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

**API-ni yenidən başlatmaq lazım deyil.** Task 22a yalnız frontend-in mətnini dəyişir: backend, API, baza, data və
miqrasiya dəyişməyib. Frontend bu commit-dən verilməlidir (`npm run dev` yenidən başladılıb və ya səhifə yenilənib).

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-22.md`; qərarlar 22.1, 22.2, 22.3):

- Excel-dən artıq təsdiqlənmiş kimi gəlmiş (tarixi) sifarişin səhifəsinin başlığında yaşıl `✓ Təsdiqlənib` nişanı
  **olduğu kimi qalır**, yanında isə boz mətn yazılır: «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb»;
- qərar panelində bir cümlə təsdiqləyənin və tarixin niyə olmadığını izah edir: «Tarixi sifariş · sistemə təsdiqlənmiş
  kimi köçürülüb. Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi üçün təsdiqləyən və tarix qeyd olunmayıb.»;
- köhnə cümlə — «Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.» — səhifənin heç yerində yoxdur;
- sistemdə təsdiqlənmiş sifarişdə nişan təkdir, «Təsdiqləyən» və «Təsdiq tarixi» əvvəlki kimidir;
- gözləyən və təsdiqlənməmiş sifarişlərin nişanı əvvəlki kimidir;
- heç bir sifarişin statusu, məbləği və tarixçəsi dəyişməyib.

**Bu dəst yalnız sifariş səhifəsini əhatə edir.** Obyektlər siyahısı, obyekt səhifəsi və aylıq hesabat Task 22b-nindir
(sonda boş başlıq var). 22b gələnə qədər onlarda tarixi sifariş hələ yalnız `✓ Təsdiqlənib` kimi görünür. Bu, natamam
işdir, səhv deyil; bu dəstdə onu «keçmədi» saymayın.

Hər ünvan, düymə və mətn yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Sınaq mühiti** (`http://localhost:5174`). Onun işə salınması, hesablar və sıfırlama
  `docs/audits/2026-final-enver-muellim-audit/01-hazirliq.md`, 5-ci bənddədir; hər yazma əməlindən əvvəl
  `docs/audits/2026-final-enver-muellim-audit/04-sandbox.md`, 1-ci bölmənin üç yoxlaması edilir. Sıfırlamadan dərhal
  sonra orada bu sifarişlər var (`tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`:44–93):
  - **`<TARİXİ>`** — «Sınaq obyekti 1», **Avqust 2026**: Excel-dən təsdiqlənmiş kimi gəlmiş sifariş. «Sınaq obyekti
    1», **İyul 2026** də eynidir;
  - **`<GÖZLƏYƏN>`** — «Sınaq obyekti 1», **Sentyabr 2026**: təsdiq gözləyir;
  - **`<QARALAMA>`** — «Sınaq obyekti 2», **Sentyabr 2026**: hələ göndərilməyib.

  Yol: «Obyektlər» (`/locations`) → obyekt → ayın sifarişi (ünvan `/orders/<nömrə>`). Sifarişin nömrəsini ünvan
  sətrindən götürüb hər yoxlamanın `Qeyd:` sətrinə yazın.
- **Sistemdə təsdiqlənmiş sifariş — `<TƏSDİQLƏNMİŞ>`.** Sıfırlamadan sonra sınaqda belə sifariş yoxdur. O,
  `04-sandbox.md`, Sınaq 1-in 1–7-ci addımlarından sonra yaranır: «Sınaq obyekti 1», Sentyabr 2026-nın düzəldilmiş
  sifarişi, `sinaq.rehber` tərəfindən təsdiqlənib. F-04 bu addımlardan sonra aparılır. Sınaq 1 bu seansda
  aparılmırsa, F-04-ün `Hökm:` sətrinə «yoxlanıla bilmədi (sistemdə təsdiqlənmiş sifariş yoxdur)» yazın.
- **Real sistem, yalnız oxuma** (`http://localhost:5173`) — yalnız F-08. Orada heç bir yazma düyməsi basılmır:
  «Təsdiqlə», «Düzəliş tələb et», «Redaktə et», «Sil», «Düzəliş versiyası yarat» və başqaları.
- Sifarişi açan hesab: sınaqda `sinaq.rehber`; real sistemdə Rəhbər və ya Admin.
- `04-sandbox.md`, Sınaq 1-in 8-ci addımı hələ köhnə cümləni gözləyir. O, Task 15-in qeydidir və dəyişdirilmir. Bu
  dəstdə gözlənilən mətn aşağıdakı yoxlamalarda yazılandır.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın.
- `390×844`-də başlıqdakı nişanın və yanındakı mətnin necə yerləşdiyini yazın: mətn nişanın altına keçirmi, ekranın
  kənarından çıxırmı, «Obyektin sifarişləri» düyməsini sıxışdırırmı (F-06).
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `F-01-sifaris-1440.png`. Şəkillər
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
- Mətni ekranda gördüyünüz kimi, hərfbəhərf yazın: nöqtə, orta nöqtə (`·`) və böyük-kiçik hərf daxil.
- Başlıqdakı mətn qərar paneli yükləndikdən sonra çıxır (`pages/OrderDetailPage.tsx`:189–198, :371). Səhifə açılan
  anda bir an yalnız nişan görünə bilər. Hökmü panel yükləndikdən sonra verin.

---

## Yoxlamalar

### F-01 — Tarixi sifariş: başlıqda `✓ Təsdiqlənib` və yanında «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb»
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 1-ci bənd, sitat: "Excel ilə gələn tarixi sifariş açılır → nişan "Təsdiqlənib" oxunur, yanında "Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb" yazılır."
Harada: sınaq · sifariş səhifəsi, başlıq · `<TARİXİ>` (`/orders/<nömrə>`); nişan və mətn (`components/workflow/OrderStatusBadge.tsx`:30–56), mətnin özü (`components/workflow/labels.ts`:66), başlıq (`pages/OrderDetailPage.tsx`:291–297) · dörd en
Addımlar: 1) `sinaq.rehber` ilə daxil olun; 2) «Obyektlər» → «Sınaq obyekti 1» → Avqust 2026 sifarişini açın və nömrəsini yazın; 3) qərar paneli yüklənənə qədər gözləyin; 4) başlıqda, obyekt adının sağında (telefonda altında) görünən nişanı və onun yanındakı mətni hərfbəhərf yazın; 5) nişanın işarəsini və rəngini yazın; 6) «Sınaq obyekti 1», İyul 2026 ilə 2–5-ci addımları təkrarlayın.
Gözlənilən: 4-cü addımda nişan `✓ Təsdiqlənib`-dir, yanında ayrıca mətn: «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb» (sonunda nöqtə yoxdur). 5-ci addımda işarə `✓`-dir, nişan əvvəlki kimi yaşıldır. Mətn nişanın içində deyil, onun yanındadır. 6-cı addımda eynisi.
İlk auditdə: başlıqda yaşıl `✓ Təsdiqlənib`, yanında isə «Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.» — iki cümlə bir-birini inkar edirdi (`BRIEFS/TASK-22.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-02 — Tarixi sifariş: qərar panelində təsdiqləyənin və tarixin niyə olmadığı bir cümlə ilə izah olunur
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 2-ci bənd, sitat: "Eyni ekranda təsdiqləyənin və tarixin niyə olmadığı bir cümlə ilə izah olunur; "təsdiq məlumatı mövcud deyil" tək başına, nişanı təkzib edən formada görünmür."
Harada: sınaq · sifariş səhifəsi, «Qərar» paneli · `<TARİXİ>`; panelin cümləsi (`components/workflow/WorkflowPanel.tsx`:221–225), mətn (`components/workflow/labels.ts`:69–80) · dörd en (`390×844`-də panel təhlildən sonra, aşağıdadır)
Addımlar: 1) F-01-in sifarişini açın; 2) «Qərar» panelini tapın (geniş ekranda sağ sütunda, telefonda təhlildən sonra); 3) paneldəki bütün mətni hərfbəhərf yazın; 4) paneldə «Göndərən», «Göndərilib», «Təsdiqləyən», «Təsdiq tarixi», «Sistem» sözlərinin və hər hansı tarixin olub-olmadığını yazın; 5) paneldə düymə olub-olmadığını yazın.
Gözlənilən: 3-cü addımda paneldə yalnız bu cümlə var: «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb. Təsdiq BaxOrders iş axını yaranmazdan əvvəl verildiyi üçün təsdiqləyən və tarix qeyd olunmayıb.» 4-cü addımda heç biri yoxdur: nə göndərən, nə təsdiqləyən, nə tarix uydurulmayıb (qərar 4.1-in qalan yarısı). 5-ci addımda düymə yoxdur.
İlk auditdə: paneldə «Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.» yazılırdı (`TASKS/TASK-22a.md`, §2.2)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-03 — «Təsdiq məlumatı mövcud deyil» səhifənin heç yerində yoxdur
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 22.3, və `BRIEFS/TASK-22.md`, «Tələb», 4-cü bənd, sitat: ""Təsdiq məlumatı mövcud deyil" cümləsi nişanla yanaşı, ziddiyyət yaradan formada bir daha göstərilməsin."
Harada: sınaq · sifariş səhifəsi, bütün səhifə · `<TARİXİ>` (Avqust və İyul 2026) · `1440×900` (qalan enlərdə yalnız 3-cü addım)
Addımlar: 1) F-01-in sifarişini açın və panel yüklənənə qədər gözləyin; 2) səhifənin sonuna qədər sürüşdürün, «Təsdiq prosesi» tarixçə vərəqini açın; 3) brauzerin axtarışı ilə (`Ctrl+F`) növbə ilə axtarın: «mövcud deyil», «Təsdiq məlumatı», «Excel importu»; hər birinin neçə dəfə tapıldığını yazın; 4) İyul 2026 sifarişi ilə 1–3-cü addımları təkrarlayın.
Gözlənilən: 3-cü addımda üçü də 0 dəfə tapılır. 4-cü addımda eynisi.
İlk auditdə: «Təsdiq məlumatı mövcud deyil» nişanın yanında, qərar panelində yazılırdı (`BRIEFS/TASK-22.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-04 — Sistemdə təsdiqlənmiş sifariş: nişan tək, «Təsdiqləyən» və «Təsdiq tarixi» əvvəlki kimi, «Tarixi sifariş» yoxdur
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 3-cü bənd, sitat: "Sistemdə təsdiqlənmiş adi sifariş (tarixi olmayan) açılır → nişan və izah əvvəlki kimidir, "Tarixi sifariş" yazılmır."
Harada: sınaq · sifariş səhifəsi, başlıq və «Qərar» paneli · `<TƏSDİQLƏNMİŞ>` (`04-sandbox.md`, Sınaq 1, 7-ci addımdan sonra); fakt sətirləri (`components/workflow/WorkflowPanel.tsx`:231–232; `components/workflow/labels.ts`:97–98) · dörd en
Addımlar: 1) `04-sandbox.md`, Sınaq 1-in 7-ci addımı bitdikdən sonra, `sinaq.rehber` ilə təsdiqlənmiş sifarişi açıq saxlayın və ya yenidən açın; nömrəsini yazın; 2) başlıqdakı nişanı və onun yanında hər hansı mətnin olub-olmadığını yazın; 3) «Qərar» panelindəki «Təsdiqləyən» və «Təsdiq tarixi» sətirlərini olduğu kimi yazın; 4) `Ctrl+F` ilə «Tarixi sifariş» axtarın və neçə dəfə tapıldığını yazın; 5) «Təsdiqlənib» sözünün səhifədə neçə dəfə göründüyünü yazın.
Gözlənilən: 2-ci addımda yalnız yaşıl `✓ Təsdiqlənib` var, yanında mətn yoxdur. 3-cü addımda «Təsdiqləyən — Sınaq Rəhbəri» və təsdiq anının tarixi və saatı yazılıb. 4-cü addımda 0 dəfə. 5-ci addımda bir dəfə, başlıqda (brief 04, «Acceptance», 4-cü bənd).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-05 — Gözləyən və təsdiqlənməmiş sifarişin başlığı əvvəlki kimidir
Mənbə: `TASKS/TASK-22a.md`, §9, 3-cü meyar, sitat: "A Draft, PendingApproval or ReturnedForCorrection order shows its badge exactly as before."
Harada: sınaq · sifariş səhifəsi, başlıq · `<GÖZLƏYƏN>`, `<QARALAMA>`; nişanın sözü, işarəsi və rəngi (`components/workflow/labels.ts`:5–29) · dörd en
Addımlar: 1) sıfırlamadan dərhal sonra, heç bir yazma əməlindən əvvəl, `sinaq.rehber` ilə «Sınaq obyekti 1» → Sentyabr 2026 sifarişini açın; 2) başlıqdakı nişanı (işarə, söz, rəng) və yanında hər hansı mətnin olub-olmadığını yazın; 3) «Sınaq obyekti 2» → Sentyabr 2026 ilə 1–2-ci addımları təkrarlayın; 4) Sınaq 1-in 5-ci addımından sonra (Rəhbər düzəliş tələb edib) «Sınaq obyekti 1», Sentyabr 2026-nın ilk sifarişini açın və 2-ci addımı təkrarlayın; bu seansda Sınaq 1 aparılmırsa, bu addımı «yoxlanıla bilmədi» kimi `Qeyd:`-də yazın.
Gözlənilən: 2-ci addımda mavi `⏳ Təsdiq gözləyir`, yanında mətn yoxdur. 3-cü addımda boz `· Təsdiqlənməyib`, yanında mətn yoxdur. 4-cü addımda kəhrəba `↩ Düzəliş tələb olunur`, yanında mətn yoxdur. Heç birində «Tarixi sifariş» yazılmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-06 — Mətnin rəngi boz, kəhrəba deyil; telefonda nişanın altına keçir
Mənbə: `TASKS/TASK-22a.md`, §4.1, sitat: "No sign, no amber, no emerald, no warning icon, not interactive." və "Wrapper: an inline flex with wrapping, so on a phone the text drops under the badge instead of overflowing."
Harada: sınaq · sifariş səhifəsi, başlıq · `<TARİXİ>`; mətnin rəngi (`components/workflow/labels.ts`:86, :45), yerləşmə (`components/workflow/OrderStatusBadge.tsx`:44–55) · dörd en, xüsusən `390×844`
Addımlar: 1) F-01-in sifarişini açın; 2) «Tarixi sifariş · …» mətninin fonunu və yazısının rəngini yazın; onun çərçivəsi (halqası) və işarəsi olub-olmadığını yazın; 3) onu səhifədəki kəhrəba (sarı-narıncı) xəbərdarlıqlarla, məsələn qiyməti olmayan sətir yazısı ilə müqayisə edin — varsa; 4) siçanı mətnin üzərinə aparın və klik edin; nə baş verdiyini yazın (`390×844`-də yalnız toxunuş); 5) hər endə nişanın və mətnin yerləşməsini yazın: bir sətirdə, yoxsa mətn nişanın altında; ekranın kənarından çıxırmı; «Obyektin sifarişləri» düyməsi görünürmü.
Gözlənilən: 2-ci addımda açıq boz fon və tünd boz yazı; halqa və işarə yoxdur — tarixçədəki «Təsdiqlənmiş kimi köçürülüb» ilə eyni boz. 3-cü addımda kəhrəba deyil. 4-cü addımda heç nə baş vermir: mətn keçid və ya düymə deyil. 5-ci addımda mətn heç bir endə ekrandan çıxmır; dar ekranda nişanın altına keçir; «Obyektin sifarişləri» görünür. `390×844`-də yerləşmənin qəbul olunan olub-olmadığını `Qeyd:`-də yazın.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-07 — Tarixi sifarişin «Təsdiq prosesi» tarixçəsi dəyişməyib
Mənbə: `TASKS/TASK-22a.md`, §8, sitat: "Every workflow event, its type, actor and timestamp; the history panel's words and colours."
Harada: sınaq · sifariş səhifəsi, «Təsdiq prosesi» vərəqi · `<TARİXİ>`; hadisənin adı və rəngi (`components/workflow/labels.ts`:37, :45), tarixçə (`components/orders/revision/HistoryTabs.tsx`:25–51) · `1440×900` və `390×844`
Addımlar: 1) F-01-in sifarişini açın; 2) səhifənin sonunda «Təsdiq prosesi» vərəqini açın; 3) hər hadisənin adını, rəngini, icraçısını, tarixini və şərhini olduğu kimi yazın.
Gözlənilən: bir hadisə: boz «Təsdiqlənmiş kimi köçürülüb», icraçı «Sistem», şərh «Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.», tarix — sınaq mühitinin sıfırlanma vaxtı. «Təsdiqləndi» hadisəsi yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-08 — Real sistem: tarixi sifariş eyni cür oxunur; status və məbləğ dəyişməyib
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 5-ci bənd, sitat: "Heç bir sifarişin statusu, versiyası və məbləği dəyişmir; təsdiq axını və icazələr dəyişmir."
Harada: real (yalnız oxuma) · «Obyektlər» siyahısı və sifariş səhifəsi · `http://localhost:5173/locations`, sonra `/orders/<nömrə>` · `1440×900` və `390×844`
Addımlar: 1) real sistemə Rəhbər və ya Admin ilə daxil olun; heç bir yazma düyməsi basmayın; 2) «Obyektlər» siyahısında istənilən obyektin sırasında «Status» sütunundakı nişanı və «Məbləğ» sütunundakı məbləği yazın (`pages/LocationsPage.tsx`:120, :129, :199–209); 3) həmin obyektin Sentyabr 2026-dan əvvəlki bir sifarişini açın və nömrəsini yazın; 4) «Təsdiq prosesi» vərəqində «Təsdiqlənmiş kimi köçürülüb» hadisəsinin olub-olmadığını yazın (yoxdursa, başqa sifariş seçin və bunu `Qeyd:`-də yazın); 5) başlıqdakı nişanı və yanındakı mətni, qərar panelinin cümləsini və baş məbləği yazın; 6) «Təsdiq gözləyənlər» (`/approvals`) açılırsa, orada neçə sifariş olduğunu yazın.
Gözlənilən: 2-ci addımda siyahıda nişan hələ yalnız `✓ Təsdiqlənib`-dir — siyahılar Task 22b-nindir, bu gözləniləndir. 5-ci addımda başlıqda `✓ Təsdiqlənib` və yanında «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb»; paneldə F-02-dəki cümlə; məbləğ Task 22a-dan əvvəlki ilə eynidir (əvvəlki qeyd varsa, onunla müqayisə edin). 6-cı addımda tarixi sifariş növbədə yoxdur (növbə yalnız «Təsdiq gözləyir» sifarişlərini göstərir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## 22b — siyahılar və aylıq hesabat

Bu hissə Task 22b-nin brauzerdə yoxlanılan hissəsidir (`AI_WORKFLOW/TASKS/TASK-22b.md`; brief-in «Qəbul» 3, 4, 5, 6-cı
bəndləri və «Tələb» 5-ci bəndi; qərarlar 22.1, 22.2, 22.4). Onu da operator aparır. **Coder brauzerdə heç bir yoxlama
aparmayıb.** Yuxarıdakı «Harada aparılır», «En və ekran şəkilləri» və «Sətrin forması» bu hissəyə də aiddir.

**22a-dan fərqli olaraq, API-ni yenidən başlatmaq LAZIMDIR.** Task 22b üç siyahının cavabına bir yalnız oxunan sahə
əlavə edir: obyektlər siyahısında `latestRequestIsHistoricalImport`, obyekt səhifəsində və aylıq hesabatda
`isHistoricalImport`. API bu commit-in kodu ilə yenidən başladılmayana qədər siyahılar ifadəni göstərmir, yalnız
`✓ Təsdiqlənib` görünür — bu, köhnə API-dir, səhv deyil. Real sistemdə API-ni (`http://localhost:5173`-ün arxasındakı)
və sınaq mühitinin API-sini (`sandbox.ps1 -Run`) yenidən başladın, frontend-i yeniləyin. Baza, miqrasiya və data
dəyişməyib; heç bir sifarişin statusu dəyişmir.

Nə yoxlanılır:

- obyektlər siyahısının «Status» sütunu, obyekt səhifəsinin dövr sətirləri və «Son sifariş» kartı tarixi sifarişi
  sifariş səhifəsindəki kimi deyir: yaşıl `✓ Təsdiqlənib`, yanında boz «Tarixi sifariş · sistemə təsdiqlənmiş kimi
  köçürülüb» (`components/workflow/OrderStatusBadge.tsx`:31–58; siyahı `pages/LocationsPage.tsx`:198–208; sətir
  `pages/LocationDetailPage.tsx`:311; kart `components/locations/LocationTrend.tsx`:85–87);
- aylıq hesabatda xananın izahı (üzərinə gələndə çıxan mətn) `… · Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş
  kimi köçürülüb` ilə bitir (`components/reports/MonthlyReportTable.tsx`:335–359; mətn
  `components/workflow/labels.ts`:92–106). **Nöqtə və şərti işarələr dəyişmir:** tarixi sifariş təsdiqlənib (22.1),
  nöqtə «Təsdiqlənib» deyir; dördüncü nöqtə dördüncü status kimi oxunardı;
- sistemdə təsdiqlənmiş, gözləyən, göndərilməmiş və düzəliş tələb olunan sifarişlər dörd yerdə də əvvəlki kimidir;
- heç bir sifarişin statusu, məbləği və tarixçəsi dəyişməyib.

Sınaq mühitində, sıfırlamadan sonra, **heç bir obyektin son sifarişi tarixi deyil**: «Sınaq obyekti 1»-in son sifarişi
Sentyabr 2026-dır (təsdiq gözləyir), «Sınaq obyekti 2»-ninki də Sentyabr 2026 (göndərilməyib). Ona görə obyektlər
siyahısında və «Son sifariş» kartında tarixi sifariş real sistemdə, yalnız oxumaqla yoxlanılır (F-09, F-12). Obyekt
səhifəsinin sətirləri və aylıq hesabat sınaqda da yoxlanılır: «Sınaq obyekti 1»-in İyul və Avqust 2026 sifarişləri
tarixidir.

F-08-in 2-ci addımı 22a-da «siyahıda nişan hələ yalnız `✓ Təsdiqlənib`-dir» gözləyirdi. 22b-dən sonra siyahı ifadəni də
göstərir; bu, F-09-un gözləntisidir və F-08 bunun üçün «keçmədi» sayılmır.

### F-09 — Obyektlər siyahısı: son sifarişi tarixi olan obyektdə `✓ Təsdiqlənib` və yanında ifadə
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 4-cü bənd, sitat: "Obyektlər siyahısında və aylıq hesabatın statuslarında tarixi sifariş eyni cür ifadə olunur."
Harada: real (yalnız oxuma) · «Obyektlər» siyahısı, «Status» sütunu · `http://localhost:5173/locations` (`pages/LocationsPage.tsx`:198–208) · dörd en
Addımlar: 1) API-nin bu commit ilə yenidən başladıldığını yoxlayın; real sistemə Rəhbər və ya Admin ilə daxil olun; heç bir yazma düyməsi basmayın; 2) «Obyektlər» siyahısını açın; 3) «Status» sütununda `✓ Təsdiqlənib` olan bir obyekt seçin, onun adını yazın, adına klik edib son sifarişini açın (`/orders/<nömrə>`) və nömrəsini yazın; 4) sifariş səhifəsinin «Təsdiq prosesi» vərəqində «Təsdiqlənmiş kimi köçürülüb» hadisəsinin olub-olmadığını yazın; varsa, bu obyekt tarixidir; yoxdursa, başqa obyektlə 3–4-cü addımları təkrarlayın; 5) siyahıya qayıdın və həmin obyektin «Status» xanasındakı bütün mətni hərfbəhərf yazın; 6) sətirdə neçə keçid olduğunu yazın (obyektin adı və «Bax»).
Gözlənilən: 5-ci addımda yaşıl `✓ Təsdiqlənib` və yanında ayrıca boz mətn «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb» — sifariş səhifəsinin başlığındakı ilə eyni (F-01). Mətn kəhrəba deyil. 6-cı addımda keçidlər əvvəlki kimidir: ad və «Bax»; ifadə keçid deyil.
İlk auditdə: siyahıda tarixi sifariş yalnız `✓ Təsdiqlənib` kimi görünürdü və sistemdə təsdiqlənmişdən ayrılmırdı (`AI_WORKFLOW/PLAN.md`, HD-010)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-10 — Obyektlər siyahısı: sistemdə təsdiqlənmiş və gözləyən obyektdə ifadə yoxdur
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 3-cü bənd, sitat: "Sistemdə təsdiqlənmiş adi sifariş (tarixi olmayan) açılır → nişan və izah əvvəlki kimidir, "Tarixi sifariş" yazılmır."
Harada: sınaq · «Obyektlər» siyahısı, «Status» sütunu · `http://localhost:5174/locations` (`pages/LocationsPage.tsx`:198–208) · dörd en
Addımlar: 1) sıfırlamadan dərhal sonra `sinaq.rehber` ilə daxil olun və «Obyektlər» siyahısını açın; 2) «Sınaq obyekti 1» və «Sınaq obyekti 2» sətirlərinin «Status» xanasını hərfbəhərf yazın; 3) `Ctrl+F` ilə «Tarixi sifariş» axtarın və neçə dəfə tapıldığını yazın; 4) `04-sandbox.md`, Sınaq 1-in 7-ci addımından sonra (düzəldilmiş Sentyabr sifarişi təsdiqlənib) siyahını yeniləyin və «Sınaq obyekti 1»-in «Status» xanasını yenidən yazın; Sınaq 1 bu seansda aparılmırsa, bu addımı «yoxlanıla bilmədi» kimi `Qeyd:`-də yazın.
Gözlənilən: 2-ci addımda «Sınaq obyekti 1» — mavi `⏳ Təsdiq gözləyir`, «Sınaq obyekti 2» — boz `· Təsdiqlənməyib`; heç birinin yanında mətn yoxdur. 3-cü addımda 0 dəfə. 4-cü addımda yaşıl `✓ Təsdiqlənib`, yanında mətn yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-11 — Obyekt səhifəsi: dövr sətirlərində tarixi sifariş ifadə ilə, qalanları əvvəlki kimi
Mənbə: `BRIEFS/TASK-22.md`, «Tələb», 5-ci bənd, sitat: "eyni ifadə nişanın göründüyü hər yerdə eyni olsun"
Harada: sınaq · obyekt səhifəsi, sifarişlər cədvəli, «Status» sütunu · «Obyektlər» → «Sınaq obyekti 1» (`/locations/<nömrə>`; `pages/LocationDetailPage.tsx`:311) · dörd en
Addımlar: 1) `sinaq.rehber` ilə «Obyektlər» → «Sınaq obyekti 1»-i açın və ünvandakı nömrəni yazın; 2) cədvəlin hər sətri üçün dövrü və «Status» xanasındakı bütün mətni hərfbəhərf yazın; 3) İyul 2026 sətrində neçə keçid olduğunu və adlarını yazın; 4) həmin sətrin «Status» xanasındakı ifadəyə klik edin və nə baş verdiyini yazın.
Gözlənilən: 2-ci addımda İyul 2026 və Avqust 2026 — yaşıl `✓ Təsdiqlənib`, yanında boz «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb»; Sentyabr 2026 — mavi `⏳ Təsdiq gözləyir`, yanında mətn yoxdur (Sınaq 1 aparılıbsa, düzəldilmiş Sentyabr — `✓ Təsdiqlənib`, yanında mətn yoxdur; əvvəlki Sentyabr — `↩ Düzəliş tələb olunur`). 3-cü addımda keçidlər əvvəlki kimidir: dövrün adı, «Sifarişə bax», «Müqayisə». 4-cü addımda ifadə özü heç nə açmır; sətir öz davranışını saxlayır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-12 — Obyekt səhifəsi: «Son sifariş» kartı
Mənbə: `BRIEFS/TASK-22.md`, «Tələb», 5-ci bənd, sitat: "eyni ifadə nişanın göründüyü hər yerdə eyni olsun"
Harada: real (yalnız oxuma) və sınaq · obyekt səhifəsi, yuxarıdakı «Son sifariş» kartı (`components/locations/LocationTrend.tsx`:85–87) · dörd en
Addımlar: 1) sınaqda «Sınaq obyekti 1»-in səhifəsini açın; kartda nişanı və yanındakı mətni hərfbəhərf yazın; 2) real sistemdə F-09-da seçdiyiniz tarixi obyektin səhifəsini açın (siyahıda adına klik); heç bir yazma düyməsi basmayın; 3) kartda «Son sifariş · <ay>» sətrini, nişanı və yanındakı mətni hərfbəhərf yazın; 4) kartda neçə «Sifarişə bax» keçidi olduğunu yazın.
Gözlənilən: 1-ci addımda mavi `⏳ Təsdiq gözləyir` (Sınaq 1-dən sonra `✓ Təsdiqlənib`), yanında mətn yoxdur. 3-cü addımda yaşıl `✓ Təsdiqlənib` və yanında boz «Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb». 4-cü addımda bir keçid.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-13 — Aylıq hesabat: tarixi xananın izahı ifadəni deyir, nöqtə yaşıl qalır
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 4-cü bənd, sitat: "Obyektlər siyahısında və aylıq hesabatın statuslarında tarixi sifariş eyni cür ifadə olunur."
Harada: sınaq · «Aylıq hesabat» (`/dashboard/monthly`), 2026 ili, «Sınaq obyekti 1» sətri · xananın izahı (`components/reports/MonthlyReportTable.tsx`:335–359), nöqtə (:316–323) · `1366×768`, `1440×900`, `1200×800`
Addımlar: 1) `sinaq.rehber` ilə «Aylıq hesabat»-ı açın, 2026 ilini seçin; 2) «Sınaq obyekti 1»-in İyul xanasının üzərinə siçanı aparın və çıxan izahı hərfbəhərf yazın; 3) Avqust xanası ilə 2-ci addımı təkrarlayın; 4) İyul və Avqust xanalarındakı nöqtənin rəngini yazın və onu cədvəlin üstündəki şərti işarələrdəki «Təsdiqlənib» nöqtəsi ilə müqayisə edin; 5) xananın içində (izahda yox) «Tarixi sifariş» yazısının olub-olmadığını yazın.
Gözlənilən: 2-ci və 3-cü addımda izah `… · Təsdiqlənib · Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb` ilə bitir; məbləğ və fərq hissəsi əvvəlki kimidir. 4-cü addımda nöqtə yaşıldır, «Təsdiqlənib» nöqtəsi ilə eynidir. 5-ci addımda xananın içində yazı yoxdur — ifadə yalnız izahdadır.
İlk auditdə: hesabatda tarixi sifariş yalnız «Təsdiqlənib» kimi görünürdü (`AI_WORKFLOW/PLAN.md`, HD-010)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-14 — Aylıq hesabat: şərti işarələr dəyişməyib; sistemdə təsdiqlənmiş xananın izahı əvvəlki kimidir
Mənbə: `TASKS/TASK-22b.md`, §9, 5-ci meyar, sitat: "The report's dot and legend are unchanged. The phrase appears in no amber or warning class."
Harada: sınaq · «Aylıq hesabat», 2026 · şərti işarələr (`components/reports/MonthlyReportTable.tsx`:399–438) və Sentyabr xanası · `1440×900` və `390×844`
Addımlar: 1) cədvəlin üstündəki şərti işarələr siyahısının bütün maddələrini soldan sağa hərfbəhərf yazın; 2) `390×844`-də kartların üstündəki şərti işarələr siyahısı ilə 1-ci addımı təkrarlayın; 3) `04-sandbox.md`, Sınaq 1-in 7-ci addımından sonra hesabatı yeniləyin; «Sınaq obyekti 1»-in Sentyabr xanasının izahını hərfbəhərf yazın; Sınaq 1 bu seansda aparılmırsa, bu addımı «yoxlanıla bilmədi» kimi `Qeyd:`-də yazın; 4) səhifədə kəhrəba rəngli «Tarixi sifariş» yazısının olub-olmadığını yazın.
Gözlənilən: 1-ci və 2-ci addımda maddələr: «Təsdiq gözləyir», «Təsdiqlənib», «Düzəliş tələb olunur», «⚠ N Qiymət yoxdur», «Faiz — əvvəlki aya görə: xərc artıb · xərc azalıb», «Qeyri-adi ay — …», «Gələcək ay»; «Tarixi sifariş» yoxdur, yeni nöqtə yoxdur. 3-cü addımda izah `… · Təsdiqlənib` ilə bitir, «Tarixi sifariş» yoxdur. 4-cü addımda yoxdur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-15 — Telefon (`390×844`): ifadə nişanın altına keçir, heç nə ekrandan çıxmır
Mənbə: `TASKS/TASK-22a.md`, §4.1, sitat: "Wrapper: an inline flex with wrapping, so on a phone the text drops under the badge instead of overflowing."
Harada: real (yalnız oxuma) və sınaq · obyektlər siyahısı, obyekt səhifəsi, aylıq hesabatın telefon kartları · `390×844`
Addımlar: 1) real sistemdə «Obyektlər» siyahısını açın, F-09-un obyektinin sətrini tapın (cədvəl sağa sürüşürsə, sürüşdürün); nişanın və ifadənin yerləşməsini yazın; 2) sınaqda «Sınaq obyekti 1»-in səhifəsində İyul 2026 sətrinin «Status» xanasını və yuxarıdakı kartı yazın; 3) sınaqda «Aylıq hesabat»-da «Sınaq obyekti 1»-in kartında İyul ayına toxunun; açılan sifarişin nömrəsini yazın və geri qayıdın; 4) hər ekranda səhifənin üfüqi olaraq ekrandan çıxıb-çıxmadığını yazın.
Gözlənilən: 1-ci və 2-ci addımda ifadə nişanın altına keçir və ya onunla bir sətirdədir; kəsilmir, üst-üstə düşmür. 3-cü addımda İyul sifarişi açılır (telefonda izah göstərilmir; onun mətni ekran oxuyucusunun adındadır). 4-cü addımda heç bir ekran cədvəldən başqa üfüqi sürüşmür.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-16 — Real sistem: status və məbləğlər dəyişməyib; «Təsdiq gözləyənlər» dəyişməyib
Mənbə: `BRIEFS/TASK-22.md`, «Qəbul», 5-ci bənd, sitat: "Heç bir sifarişin statusu, versiyası və məbləği dəyişmir; təsdiq axını və icazələr dəyişmir."
Harada: real (yalnız oxuma) · «Obyektlər», obyekt səhifəsi, «Aylıq hesabat», «Təsdiq gözləyənlər» · `http://localhost:5173` · `1440×900`
Addımlar: 1) **API-ni yenidən başlatmazdan əvvəl** «Obyektlər» siyahısında ilk beş obyektin «Status» və «Məbləğ» xanalarını, «Aylıq hesabat»-da 2026 ilinin «Cəmi» sətrini və «Təsdiq gözləyənlər»-də (`/approvals`) sifariş sayını yazın; 2) API-ni bu commit ilə yenidən başladın və frontend-i yeniləyin; 3) 1-ci addımdakı hər rəqəmi və statusun sözünü yenidən yazın; 4) F-09-un obyektinin səhifəsində tarixi sifarişlərin sayını (ifadəsi olan sətirlər) yazın; 5) heç bir yazma düyməsi basmayın.
Gözlənilən: 3-cü addımda hər status sözü, hər məbləğ, «Cəmi» sətri və «Təsdiq gözləyənlər»-in sayı 1-ci addımdakı ilə eynidir; yalnız tarixi sifarişlərin yanında ifadə əlavə olunub. 2-ci addımdan əvvəl siyahılarda ifadə görünmür — bu köhnə API-dir, səhv deyil.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
