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

22b tərəfindən doldurulacaq; F-09-dan davam edir.
