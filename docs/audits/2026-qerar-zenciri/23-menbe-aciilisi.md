# 23 — Mənbənin mərhələli açılışının əl ilə yoxlanışı (Task 23, Mənbənin mərhələli açılışı)

Bu fayl Task 23-ün brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama
aparmayıb:** Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

**API-ni yenidən başlatmaq lazım deyil.** Task 23 yalnız frontend-in görünüşünü dəyişir: backend, API, baza, data və
miqrasiya dəyişməyib. Frontend bu commit-dən verilməlidir (`npm run dev` yenidən başladılıb və ya səhifə yenilənib).

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-23.md`; qərarlar 23.1, 23.2, 23.3):

- sifariş səhifəsi açılanda xam sətir cədvəli, telefon kartları və heç bir «Mənbəyə bax» görünmür; onların yerində bir
  açılış var: `Sətirlər` və yanında sifarişin sətir sayı;
- açılışa klik edəndə bölmə əvvəlki kimi açılır: axtarış, üç süzgəc, on sütun, 50-dən çox sətirdə səhifələr və hər
  sətirdə «Mənbəyə bax»;
- «Mənbə» pəncərəsinin məzmunu dəyişməyib: fayl, idxal nömrəsi, vərəq, Excel sətri, üç sütun, versiya zənciri;
- «Hamısı»-nın nəyi saydığını izah edən abzas «Əsas dəyişikliklər» başlığının altında mətn kimi durmur; o, başlığın
  yanındakı ⓘ-nin arxasındadır və sözləri dəyişməyib; «Artıb: … · Azalıb: …» sətri yerində qalır;
- səhifənin standart hündürlüyü əvvəlkindən nəzərəçarpacaq dərəcədə azdır (G-03);
- açılış ünvanı dəyişmir və serverə sorğu göndərmir; heç bir rəqəm, sətir və ya imkan itmir.

Hər ünvan, düymə və mətn yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`) — G-01, G-03 … G-09, G-11. Orada heç bir yazma düyməsi
  basılmır: «Təsdiqlə», «Düzəliş tələb et», «Redaktə et», «Sil», «Sətir əlavə et», «Düzəliş versiyası yarat» və
  başqaları. Bölməni açmaq, süzgəc seçmək, səhifə dəyişmək, «Mənbəyə bax» və ⓘ yalnız oxumadır.
  - **`<BÖYÜK>`** — «Heydər Əliyev Mərkəzi», **Sentyabr 2026**: auditin ölçdüyü sifariş (78 sətir; «Sətirlər» başlığı
    sayı özü deyir). Yol: «Obyektlər» (`/locations`) → «Heydər Əliyev Mərkəzi» → Sentyabr 2026 (ünvan
    `/orders/<nömrə>`). Nömrəni ünvan sətrindən götürüb hər yoxlamanın `Qeyd:` sətrinə yazın.
  - Açan hesab: Rəhbər və ya Admin.
- **Sınaq mühiti** (`http://localhost:5174`) — G-02 və G-10. Onun işə salınması, hesablar və sıfırlama
  `docs/audits/2026-final-enver-muellim-audit/01-hazirliq.md`, 5-ci bənddədir; hər yazma əməlindən əvvəl
  `docs/audits/2026-final-enver-muellim-audit/04-sandbox.md`, 1-ci bölmənin üç yoxlaması edilir. Sıfırlamadan dərhal
  sonra orada bu sifariş var (`tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`:44–53):
  - **`<KİÇİK>`** — «Sınaq obyekti 1», **Sentyabr 2026**: təsdiq gözləyən test sifarişi, 5 sətir.
- **`04-sandbox.md`, Sınaq 1-in 6-cı addımı** «Redaktə et»-i sətrin üstündə basır. Task 23-dən sonra sətirlər yığılıb:
  həmin addımdan əvvəl `Sətirlər` başlığına klik edib bölməni açın. Sınaq 1 Task 15-in qeydidir və dəyişdirilmir.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`, yoxlamada başqa en göstərilməyibsə.
  `En:` sətrinə hansı endə aparıldığını yazın.
- **G-03-ün ölçüsü yalnız `1440×900`-də götürülür.** Brauzerin pəncərəsini (DevTools-un cihaz rejimi ilə) məhz bu enə
  gətirin.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `G-01-sifaris-1440.png`. Şəkillər
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
- Başlıqdakı sətir sayı sifariş yükləndikdən sonra çıxır (`pages/OrderDetailPage.tsx`:439). Səhifə açılan anda bir an
  yalnız `Sətirlər` görünə bilər; hökmü say çıxdıqdan sonra verin.
- Açılışın vəziyyəti ünvanda saxlanmır və başqa sifarişə keçəndə bağlanır (`pages/OrderDetailPage.tsx`:185–190).
  Brauzerin «Yenilə» düyməsi səhifəni yenidən yığılmış açır; bu, gözlənilən davranışdır.

---

## Yoxlamalar

### G-01 — Böyük sifariş: cədvəl və «Mənbəyə bax» görünmür, yerində `Sətirlər N`
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 1-ci bənd, sitat: "Sifariş səhifəsi açılır → xam sətir cədvəli görünmür; yerində sətir sayını göstərən bir açılış var."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Sətirlər» bölməsi · `<BÖYÜK>` (`/orders/<nömrə>`); başlıq və düymə (`pages/OrderDetailPage.tsx`:426–443), bölmənin yeri (:446–649) · dörd en
Addımlar: 1) Rəhbər və ya Admin ilə daxil olun; 2) «Obyektlər» → «Heydər Əliyev Mərkəzi» → Sentyabr 2026 sifarişini açın və nömrəsini yazın; 3) «Əsas dəyişikliklər»-dəki «Hamısına bax»-a **basmadan** səhifənin sonuna qədər sürüşdürün; 4) «Əsas dəyişikliklər»dən sonra gələn bölmənin başlığını hərfbəhərf yazın və başlığın solundakı işarəni təsvir edin (sağa baxan ox, yoxsa aşağı); 5) səhifədə sətir cədvəlinin (sütunları «# · Məhsul · Spesifikasiya …»), axtarış sahəsinin («Məhsul adı…»), süzgəcin və hər hansı «Mənbəyə bax» yazısının olub-olmadığını yazın; `Ctrl+F` ilə «Mənbəyə bax» axtarın və neçə dəfə tapıldığını yazın; 6) başlıqdakı rəqəmi «Obyektin sifarişləri» səhifəsindəki bu sifarişin sətir sayı ilə (varsa) və ya auditin 78-i ilə müqayisə edin.
Gözlənilən: 4-cü addımda başlıq `Sətirlər 78` kimi oxunur (rəqəm açıq boz, sözdən bir az kiçik çəkidə), solunda sağa baxan ox (›). 5-ci addımda cədvəl, axtarış, süzgəc və «Mənbəyə bax» yoxdur; `Ctrl+F` 0 tapır. 6-cı addımda rəqəm sifarişin bütün sətirlərinin sayıdır (səhifədəki 50 yox).
İlk auditdə: səhifənin aşağısında 78 sətirlik xam cədvəl açıq dururdu və hər sətrində «Mənbəyə bax» vardı (`BRIEFS/TASK-23.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-02 — Kiçik sifariş: eyni yığılmış görünüş
Mənbə: `BRIEFS/TASK-23.md`, «Tələb», 1-ci bənd, sitat: "Xam sətir cədvəli standart olaraq yığılmış olsun; bir açılışla tam görünsün."
Harada: sınaq · sifariş səhifəsi · `<KİÇİK>` («Obyektlər» → «Sınaq obyekti 1» → Sentyabr 2026) · dörd en
Addımlar: 1) sıfırlamadan sonra `sinaq.rehber` ilə daxil olun; 2) `<KİÇİK>`-i açın və nömrəsini yazın; 3) G-01-in 4–5-ci addımlarını təkrarlayın; 4) `sinaq.koordinator` və `sinaq.admin` ilə 2–3-cü addımları təkrarlayın.
Gözlənilən: 3-cü addımda başlıq `Sətirlər 5`, solunda sağa baxan ox; cədvəl, kartlar və «Mənbəyə bax» yoxdur. 4-cü addımda hər rol üçün eynisi: yığılmış görünüş rola görə dəyişmir (spesifikasiya, fərziyyə 1).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-03 — Səhifənin hündürlüyü: əvvəl və sonra, `1440×900`-də
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 5-ci bənd, sitat: "Standart görünüşdə səhifənin hündürlüyü əvvəlkindən azdır və "Niyə dəyişib?" ilə "Əsas dəyişikliklər" birlikdə daha tez görünür."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `<BÖYÜK>` · yalnız `1440×900`
Addımlar: 1) **«Əvvəl» — `112c2d7` (Task 22b) frontend-i ilə.** İşçi qovluq artıq Task 23-ü daşıdığı üçün, əvvəlki versiyanı ayrıca qovluqda açın: `git worktree add ..\BaxOrders-112c2d7 112c2d7`, sonra `npm --prefix ..\BaxOrders-112c2d7\frontend\bax-orders-web ci` və `npm --prefix ..\BaxOrders-112c2d7\frontend\bax-orders-web run dev -- --port 5175`. Bu yalnız frontend-dir, eyni API-yə (5080) və eyni bazaya oxumaq üçün qoşulur; 2) `http://localhost:5175`-də daxil olun, `<BÖYÜK>`-ü açın, səhifə tam yüklənənə qədər gözləyin; «Hamısına bax»-a və heç bir açılışa basmayın; 3) DevTools konsolunda `document.documentElement.scrollHeight` yazın və rəqəmi yazın; 4) «Əsas dəyişikliklər»in ilk məhsul sətrinə çatmaq üçün səhifənin yuxarısından neçə piksel sürüşdürmək lazım olduğunu yazın: konsolda `document.querySelector('[aria-label="Əsas dəyişikliklər"] li').getBoundingClientRect().top + scrollY`; 5) **«Sonra» — bu commit ilə** `http://localhost:5173`-də 2–4-cü addımları təkrarlayın (bölmə yığılmış qalır); 6) iki rəqəmi və fərqi yazın; 7) işiniz bitəndə `git worktree remove ..\BaxOrders-112c2d7`.
Gözlənilən: 5-ci addımın `scrollHeight`-i 3-cü addımınkından nəzərəçarpacaq dərəcədə azdır: 50 cədvəl sətri və bir izah sətri artıq standart görünüşdə yoxdur. Auditin «əvvəl» ölçüsü 4 513 px idi (5,3 ekran). 4-cü addımda «sonra» «əvvəl»dən izah cümləsinin hündürlüyü qədər (bir-iki mətn sətri) azdır — bundan artıq yox: sətir bölməsi hər endə «Niyə dəyişib?» və «Əsas dəyişikliklər»dən **aşağıdadır**, ona görə onun yığılması bu iki bölməni yuxarı qaldırmır, yalnız səhifənin ümumi hündürlüyünü azaldır. Bunu olduğu kimi yazın. Konkret piksel hədəfi yoxdur: məzmun sifarişdən sifarişə dəyişir.
İlk auditdə: standart görünüşdə 4 513 px (5,3 ekran); «Hamısına bax» açılanda 13 460 px (15,9 ekran) (`TASKS/TASK-23.md`, §1)
---- operator doldurur ----
Göründü:
Rəqəm: əvvəl ____ px · sonra ____ px · fərq ____ px; «Əsas dəyişikliklər»ə qədər: əvvəl ____ px · sonra ____ px
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-04 — Açılış: cədvəl on sütunla, axtarış və süzgəc; ikinci klik bağlayır
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 2-ci bənd, sitat: "Açılışa klik edilir → cədvəl əvvəlki kimi, bütün sütunları və hər sətrin mənbə keçidi ilə görünür."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Sətirlər» · `<BÖYÜK>`; düymə (`pages/OrderDetailPage.tsx`:428–441), cədvəl (:492–596), kartlar (:598–620) · dörd en
Addımlar: 1) `<BÖYÜK>`-ü açın; 2) `Sətirlər 78` başlığına klik edin; 3) oxun istiqamətini yazın; 4) axtarış sahəsinin yer tutucusunu, süzgəcin seçimlərini (açıb) və cədvəlin sütun başlıqlarını soldan sağa hərfbəhərf yazın; 5) ilk və son görünən sətirdə «Mənbə» sütununda «Mənbəyə bax» olub-olmadığını yazın; 6) DevTools-da başlıqdakı düyməni seçin və `aria-expanded` və `aria-controls` atributlarının dəyərini yazın; `aria-controls`-un göstərdiyi `id`-li elementin cədvəli içində saxladığını yazın; 7) başlığa yenidən klik edin; nə görünür, `aria-expanded` nədir; 8) klaviatura ilə: `Tab` ilə başlığa gəlin və `Enter`, sonra `Space` basın; hər dəfə bölmənin açılıb-bağlandığını yazın.
Gözlənilən: 3-cü addımda ox aşağı baxır (⌄). 4-cü addımda yer tutucu «Məhsul adı…»; süzgəc «Bütün sətirlər · Qiyməti olan sətirlər · Qiymət yoxdur»; sütunlar «# · Məhsul · Spesifikasiya · Miqdar · Vahid · Qiymət · Cəmi · Təchizatçı · Kateqoriya · Mənbə» (`1024`-dən dar endə cədvəl yerinə kartlar görünür — G-11). 5-ci addımda hər sətirdə var. 6-cı addımda `aria-expanded="true"`, `aria-controls` cədvəli saxlayan elementin `id`-sidir. 7-ci addımda bölmə yığılır, ox yenə sağa baxır, `aria-expanded="false"`. 8-ci addımda hər basış bölməni açır və ya bağlayır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-05 — 50-dən çox sətir: səhifələr açılışdan sonra əvvəlki kimi
Mənbə: `TASKS/TASK-23.md`, §9, 2-ci meyar, sitat: "pagination when there are more than 50 lines"
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Sətirlər» · `<BÖYÜK>`; səhifələr (`pages/OrderDetailPage.tsx`:622–646) · `1440×900` və `390×844`
Addımlar: 1) `<BÖYÜK>`-ü açın; bölmə yığılmışkən səhifədə «Səhifə 1 / 2» yazısının olub-olmadığını yazın; 2) `Sətirlər 78`-ə klik edin; 3) cədvəlin altındakı yazını hərfbəhərf yazın və cədvəldə neçə sətir olduğunu sayın; 4) «Növbəti»-yə basın; yazını və ilk sətrin «#» nömrəsini yazın; 5) «Əvvəlki»-yə basın.
Gözlənilən: 1-ci addımda yoxdur. 3-cü addımda «Səhifə 1 / 2 · 78 sətir», cədvəldə 50 sətir. 4-cü addımda «Səhifə 2 / 2 · 78 sətir», ilk sətir 51. 5-ci addımda yenə 1-ci səhifə. Bölmə bu müddətdə açıq qalır.
İlk auditdə: auditin DOM sayı 78 sətirlik sifarişdə 50 `tbody` sətri idi — bu 2 səhifənin birincisidir (`TASKS/TASK-23.md`, §2.1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-06 — Üç süzgəc açılışdan sonra; bağlayıb açanda süzgəc qalır
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 6-cı bənd, sitat: "Heç bir rəqəm və heç bir sətir itmir; süzgəclər (`Bütün sətirlər / Qiyməti olan sətirlər / Qiymət yoxdur`) əvvəlki kimi işləyir."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Sətirlər» · `<BÖYÜK>`; süzgəc (`pages/OrderDetailPage.tsx`:466–477) · `1440×900`
Addımlar: 1) `<BÖYÜK>`-ü açın və `Sətirlər`-i açın; 2) süzgəcdə növbə ilə «Qiymət yoxdur», «Qiyməti olan sətirlər», «Bütün sətirlər» seçin; hər birindən sonra cədvəlin altındakı «… sətir» sayını (yazı yoxdursa, cədvəldəki sətirlərin sayını) yazın; 3) «Qiymət yoxdur»-u yenidən seçin; 4) başlığa klik edib bölməni bağlayın, sonra yenidən açın; 5) süzgəcdə nəyin seçili olduğunu və cədvəldə nə göründüyünü yazın; 6) başlıqdakı rəqəmin 2–5-ci addımlarda dəyişib-dəyişmədiyini yazın.
Gözlənilən: 2-ci addımda «Qiyməti olan» və «Qiymət yoxdur» saylarının cəmi «Bütün sətirlər»in sayına bərabərdir. 5-ci addımda «Qiymət yoxdur» seçili qalıb və cədvəl yenə yalnız o sətirləri göstərir. 6-cı addımda başlıqdakı rəqəm həmişə 78-dir: o, süzgəcdən asılı deyil, sifarişin bütün sətirlərini sayır (süzgəc dəyişəndə rəqəm bir an yox olub geri qayıda bilər — sətirlər yenidən oxunur).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-07 — «Mənbəyə bax»: pəncərədə heç bir sahə itməyib
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 3-cü bənd, sitat: "Mənbə pəncərəsi açılır → içindəki heç bir sahə itməyib: fayl, idxal nömrəsi, vərəq, Excel sətri, xam / effektiv / kanonik sütunlar."
Harada: real (yalnız oxuma) · «Mənbə» pəncərəsi (`components/orders/ItemSourceDrawer.tsx`, dəyişməyib: faktlar :63–71, sahə cədvəli :74–100, versiya zənciri :122–146) · `<BÖYÜK>`; sınaq · düzəldilmiş sifariş · `1440×900` və `390×844`
Addımlar: 1) `<BÖYÜK>`-ü açın, `Sətirlər`-i açın; 2) ilk sətirdə «Mənbəyə bax»-a basın; 3) pəncərənin başlığını və altındakı məhsul adını yazın; 4) faktların hər birini — etiket və dəyər — hərfbəhərf yazın; 5) sahə cədvəlinin sütun başlıqlarını və «düzəliş» və ya «qəsdən boş» işarəsi olan sətirləri (varsa) yazın; 6) pəncərənin altındakı qeydi yazın; 7) pəncərəni kənarına klik edərək bağlayın; 8) **sınaqda**, `04-sandbox.md` Sınaq 1-in 6-cı addımından sonra düzəldilmiş Sentyabr sifarişini açın, `Sətirlər`-i açın, «Sınaq məhsulu — zibil paketi» sətrində «Mənbəyə bax»-a basın və «Sətrin keçdiyi versiyalar» blokunu hərfbəhərf yazın; Sınaq 1 bu seansda aparılmırsa, bu addımı `Qeyd:`-də «yoxlanıla bilmədi» kimi yazın.
Gözlənilən: 3-cü addımda «Mənbə», altında sətrin məhsul adı. 4-cü addımda yeddi fakt: «Fayl», «İdxal» (`#<nömrə> · <status>`), «Vərəq», «Excel sətri» (rəqəm), «Excel cəmi», «Hesablanmış cəm», «Sifarişə yazılıb». 5-ci addımda dörd sütun: «Sahə · Mənbə dəyəri (Excel-də) · Effektiv dəyər (sistem qəbul edir) · Kanonik qeyd». 6-cı addımda «Excel dəyərləri dəyişdirilmir. …». 7-ci addımda pəncərə bağlanır, bölmə açıq qalır. 8-ci addımda «Sətrin keçdiyi versiyalar»: «Cari sətir (versiya 2)» və «Versiya 1», hər birinin statusu; biri «· Excel sətri» işarəlidirsə, o addım Excel sətri olandır. Pəncərə Task 17-dəki kimi mərkəzdədir (sağdan çıxan çəkməcə deyil).
İlk auditdə: pəncərə Excel faylının adını, idxal nömrəsini, vərəqi, «Excel sətri 3142»-ni və hər sahənin xam / effektiv / kanonik qarşılığını göstərirdi (`BRIEFS/TASK-23.md`, «Problem») — bu, olduğu kimi qalmalıdır
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-08 — «Əsas dəyişikliklər»in yanındakı ⓘ: izah sözbəsöz; «Artıb / Azalıb» sətri görünür
Mənbə: `BRIEFS/TASK-23.md`, «Qəbul», 4-cü bənd, sitat: "Alqoritm izahı bölmənin başında mətn kimi durmur; izah nişanının arxasındadır və məzmunu dəyişməyib."
Harada: real (yalnız oxuma) · sifariş səhifəsi, «Əsas dəyişikliklər» · `<BÖYÜK>`; başlıq və ⓘ (`components/decisions/DriverList.tsx`:107–115), ⓘ-nin adı (`components/decisions/labels.ts`:169), cümlə (:155–163, dəyişməyib), «Artıb …» sətri (`DriverList.tsx`:117) · dörd en
Addımlar: 1) `<BÖYÜK>`-ü açın; 2) «Əsas dəyişikliklər» başlığının altındakı bütün mətn sətirlərini hərfbəhərf yazın; 3) başlığın yanındakı ⓘ-nin üzərinə siçanı aparın (basmadan) və nə baş verdiyini yazın; 4) ⓘ-yə klik edin (telefonda toxunun) və açılan qeydi hərfbəhərf yazın; 5) DevTools-da ⓘ düyməsinin `aria-label`-ini yazın; 6) `Esc` basın; qeydin bağlandığını yazın; 7) başlığın adını ekran oxuyucusunun oxuduğu kimi yazın (DevTools → Accessibility → Name).
Gözlənilən: 2-ci addımda başlığın altında yalnız «Artıb: N · Azalıb: N» (xidmət varsa «· Xidmətlər: N») sətri var; «Bu sifarişdə … məhsul var …» cümləsi yoxdur. 3-cü addımda heç nə açılmır (ⓘ yalnız kliklə açılır). 4-cü addımda qeyd: «Bu sifarişdə N məhsul var, müqayisə bazası ilə birlikdə N. «Hamısı» onlardan dəyişən N məhsulu sayır.» və lazım olanda «N məhsulun məbləği dəyişməyib.» — `112c2d7`-də başlığın altında yazılan cümlə ilə hərfbəhərf eynidir (G-03-ün «əvvəl» səhifəsində müqayisə edin). 5-ci addımda ««Hamısı» nəyi sayır?». 6-cı addımda qeyd bağlanır. 7-ci addımda ad yalnız «Əsas dəyişikliklər»-dir.
İlk auditdə: "Bu sifarişdə 78 məhsul var, müqayisə bazası ilə birlikdə 120. «Hamısı» onlardan dəyişən 113 məhsulu sayır…" abzası bölmənin başında dururdu (`BRIEFS/TASK-23.md`, «Problem»)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-09 — Açılış ünvanı dəyişmir və serverə sorğu göndərmir
Mənbə: `TASKS/TASK-23.md`, §9, 8-ci meyar, sitat: "Opening, closing and reopening the section issue no request and change no query parameter."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `<BÖYÜK>`, ünvanda baza ilə, məsələn `/orders/<nömrə>?basis=avg3` · `1440×900`
Addımlar: 1) `<BÖYÜK>`-ü açın, müqayisədə «Son 3 ayın ortalaması»nı seçin və ünvan sətrini hərfbəhərf yazın; 2) DevTools → Network vərəqini açın, «Fetch/XHR» süzgəcini seçin və siyahını təmizləyin; 3) `Sətirlər`-i açın, bağlayın, yenidən açın; 4) Network-də yeni sorğuların sayını və ünvan sətrini yazın; 5) brauzerin «Geri» düyməsinə bir dəfə basın və hara getdiyinizi yazın; 6) sifarişi yenidən açın və səhifəni yeniləyin (`F5`); bölmənin açıq, yoxsa yığılmış olduğunu yazın.
Gözlənilən: 4-cü addımda 0 sorğu (sətirlər səhifə ilə birlikdə artıq oxunub), ünvan 1-ci addımdakı ilə eynidir. 5-ci addımda «Geri» bölməni bağlamır, əvvəlki ünvana (baza seçilməzdən əvvəlkinə) qayıdır — açılış tarixçəyə yazılmır. 6-cı addımda bölmə yığılmışdır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-10 — Düzəliş versiyası (koordinator): açılışdan sonra «Sətir əlavə et», «Redaktə et», «Sil»; yadda saxlayandan sonra bölmə açıq qalır
Mənbə: `TASKS/TASK-23.md`, §4.1, sitat: "It survives `reload()` (`reloadToken`). After a line is edited, added or removed (`afterChange`), the section the reader opened stays open."
Harada: sınaq · düzəldilmiş sifariş, «Sətirlər» · `04-sandbox.md`, Sınaq 1-in 6-cı addımı; «Sətir əlavə et» (`pages/OrderDetailPage.tsx`:479–488), «Redaktə et» / «Sil» (:572–591, kartda :844–861) · `1366×768` və `390×844`
Addımlar: 1) `04-sandbox.md`, Sınaq 1-in 1–5-ci addımlarını aparın; 2) 6-cı addımda `sinaq.koordinator` ilə «Düzəliş versiyası yarat»-ı basın və yeni versiyanı açın; 3) bölmənin yığılmış olduğunu və başlığı yazın; 4) `Sətirlər`-i açın; «Sətir əlavə et», hər sətirdə «Redaktə et» və «Sil» olub-olmadığını yazın; 5) «Sınaq məhsulu — zibil paketi» sətrində «Sil»-ə basın, pəncərənin açıldığını yazın və «İmtina»-ya basın; 6) həmin sətrdə «Redaktə et»-ə basın, miqdarı 140 → 130 edin və yadda saxlayın (Sınaq 1-in öz addımı); 7) yadda saxlandıqdan sonra bölmənin açıq, yoxsa yığılmış olduğunu və sətrin yeni miqdarını yazın; 8) Sınaq 1-in 6-cı addımının qalanını adi qaydada davam etdirin.
Gözlənilən: 3-cü addımda bölmə yığılmışdır, başlıq `Sətirlər 5`. 4-cü addımda üçü də var. 5-ci addımda pəncərə açılır, «İmtina» onu heç nə silmədən bağlayır. 7-ci addımda bölmə **açıq** qalır, zibil paketi sətrində 130.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-11 — Telefon (`390×844`): kartlar eyni açılışın arxasında, ⓘ-nin qeydi ekranda qalır
Mənbə: `BRIEFS/TASK-23.md`, «Tələb», 2-ci bənd, sitat: "Sətir-sətir mənbə keçidləri rəhbərin standart görünüşündə olmasın — cədvəllə birlikdə yığılsın."
Harada: real (yalnız oxuma) · sifariş səhifəsi · `<BÖYÜK>`; kartlar (`pages/OrderDetailPage.tsx`:598–620, kartın «Mənbəyə bax»-ı :841–843), ⓘ (`components/analytics/InfoHint.tsx`, dəyişməyib) · `390×844`
Addımlar: 1) `390×844`-də `<BÖYÜK>`-ü açın; 2) səhifənin sonuna qədər sürüşdürün; kart siyahısının və «Mənbəyə bax»-ın olub-olmadığını yazın; 3) `Sətirlər 78`-ə toxunun; ilk kartın bütün mətnini hərfbəhərf yazın və kartda «Mənbəyə bax» olub-olmadığını yazın; 4) səhifənin üfüqi olaraq sürüşüb-sürüşmədiyini yazın; 5) «Əsas dəyişikliklər»in yanındakı ⓘ-yə toxunun; qeydin tam oxunduğunu, ekranın kənarından çıxıb-çıxmadığını yazın; 6) aşağıdakı sabit «Təsdiqlə» / «Düzəliş tələb et» zolağının bölmənin başlığını və ya son kartı örtüb-örtmədiyini yazın (səhifənin sonuna qədər sürüşdürün).
Gözlənilən: 2-ci addımda kartlar və «Mənbəyə bax» yoxdur, yalnız `Sətirlər 78` başlığı. 3-cü addımda kartlar açılır (cədvəl yox), hər kartda «Mənbəyə bax» var. 4-cü addımda səhifə üfüqi sürüşmür. 5-ci addımda qeyd tam oxunur, ekrandan çıxmır. 6-cı addımda son kart zolağın üstünə qədər sürüşdürülə bilir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
