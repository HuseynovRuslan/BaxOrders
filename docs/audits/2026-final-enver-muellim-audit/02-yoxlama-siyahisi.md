# 02 — Yoxlama siyahısı

Bu fayl auditin yoxlama siyahısıdır. Hər yoxlama başlığı və nömrəsi olan ayrıca blokdur, məsələn `A-10` və ya `E-06`. Operator bu
faylın özünü doldurmur: onu eyni qovluqda `neticeler.md` adı ilə köçürür və nəticələri yalnız surətə yazır
(`01-hazirliq.md`, «Başlamazdan əvvəl»; `05-neticeler-qaytarilmasi.md`, 1-ci bənd). İşin sırası `README.md`, 4-cü
bölmədədir: hazırlıq, əmrlərin başlanğıc oxunuşu, A bölməsi, sonra B … K, sonda əmrlər yenidən.

Hər ünvan, ekran adı, düymə və addımın yanında onun götürüldüyü fayl və sətir göstərilib. Frontend faylları
`frontend/bax-orders-web/src/` qovluğundadır; aşağıda bu ön hissə yazılmır (məsələn, `layout/navigation.ts`:27). Kod
`7550eda` commit-indəkidir: ondan sonra yalnız `docs/audits/` dəyişib (`01-hazirliq.md`, 2-ci bənd). Ekran burada
yazılandan fərqli bir şey göstərirsə, ekranda gördüyünüzü yazın və fərqi `Qeyd:` sətrində qeyd edin.

## Sətrin forması

Hər yoxlama bu on iki sətirdən ibarətdir, bu sırayla:

```
### <ID> — <qısa başlıq>
Mənbə: <brief faylı + bölmə, və ya protokol §>, sitat: "<bənd, sözbəsöz>"
Harada: <real / sınaq> · <ekran> · <ünvan və ya menyu yolu> · <en(lər)>
Addımlar: <nömrələnmiş kliklər>
Gözlənilən: <brief və ya qəbul edilmiş yoxlamanın dediyi, mənbəsi ilə; və ya «brief rəqəm vermir»>
İlk auditdə: <brief-in ilk audit üçün qeyd etdiyi rəqəm və ya mətn; yoxdursa «brief qeyd etmir»>
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: <bu bölmənin sözləri> / yoxlanıla bilmədi (səbəb)
Qeyd:
```

- Ayırıcı sətir məhz belə yazılır: `---- operator doldurur ----`. Onun yuxarısındakı mətni dəyişməyin; yalnız
  aşağısındakı altı sahəni doldurun (`05-neticeler-qaytarilmasi.md`, 1-ci bənd).
- Heç bir sahəni boş buraxmayın. Yoxlamanı apara bilmədinizsə, `Hökm:` sətrinə «yoxlanıla bilmədi» yazın və
  mötərizədə səbəbini göstərin.
- `Mənbə:` sətrindəki protokol sitatları ingiliscədir, çünki protokol (`AI_WORKFLOW/TASKS/TASK-15.md`) ingiliscə
  yazılıb. Onlar sözbəsöz saxlanılıb.

### Bölməyə xas sətirlər

Bir yoxlamada birdən çox rəqəm və ya fakt yazılmalıdırsa, əlavə sətirlər `Göründü:` sətrinin altına, hər biri iki
boşluqla içəridən, `  - <ad>:` şəklində yazılır. Adları dəst yazıb, dəyərləri siz yazırsınız. Belə sətirlər bu
bölmələrdədir:

- A — ön şərtlərin ayrı-ayrı rəqəmləri və oxunma vaxtı;
- E — məbləğlər (Task 1c) və iki ekranın eyni rəqəmi;
- F — qərar panelinin dörd faktı və müşahidələr;
- G — sayma cədvəli;
- H — üç müşahidə;
- I — tapılan söz və ya rəqəm;
- J — `Başlanğıcla eynidir: bəli / xeyr`;
- K — `Nə səhvdir:`.

Sətrə bundan başqa heç nə əlavə edilmir. Sətir çatmırsa (məsələn, G-nin sayma cədvəlində), eyni formada yeni sətir
əlavə edin.

### Hökm sözləri

`Hökm:` sətrində yalnız bu sözlər işlənir:

| Bölmə | Sözlər |
|---|---|
| A, E, F, H, J | keçdi / keçmədi |
| G | sayıldı |
| I | hələ var / artıq yoxdur |
| K | — (heç nə yazmırsınız: tapıntını 15b qiymətləndirir) |

Hər bölmədə bunlara əlavə: yoxlanıla bilmədi (səbəb). B, C və D bölmələrinin sözləri həmin bölmələrin öz
sətirlərində yazılıb. Operator heç yerdə prioritet və ya yeni task yazmır: bunu hesabatı yığan 15b edir.

### Nömrələr və ekran şəkilləri

- Nömrə: `<bölmənin hərfi>-<iki rəqəm>`, hər bölmədə 01-dən başlayır (`README.md`, 3-cü bölmə).
- Şəkil adı: `<ID>-<ekran>-<en>.png`, `ekranlar/` qovluğunda, məsələn `A-10-qiymet-tesnifati-1366.png`
  (`01-hazirliq.md`, 7-ci bənd; `05-neticeler-qaytarilmasi.md`, 2-ci bənd).
- Şəkil **mütləqdir**:
  - G2-nin hər rəqəmi üçün — A-10, A-11, A-12. A-13-ün rəqəmləri heç bir ekranda yoxdur (`03-emrler.md`, 5.1); orada
    sübut `neticeler.md`-yə yapışdırılmış əmr çıxışıdır;
  - P0 və ya P1 saydığınız hər bənd üçün (`01-hazirliq.md`, 7-ci bənd; protokol §7.2).
- Başqa yerdə şəkil istəyə bağlıdır: rəqəmi ekranın adı və eni ilə yazmaq kifayətdir. Heç bir şəkildə parol və ya
  token görünməməlidir.

### Ekranlar və ünvanlar

«Kim aça bilir» sütunu menyunun `requires` sahəsindən (`layout/navigation.ts`:23–41), marşrutlardan (`App.tsx`:20–74)
və rolların qaydasından (`src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs`) götürülüb. Real sistemin
ünvanı `http://localhost:5173`-dür (`01-hazirliq.md`, 3.3), sınaq mühitininki `http://localhost:5174`
(`04-sandbox.md`, giriş hissəsi).

| Ekran (səhifənin başlığı) | Menyu bəndi | Ünvan | Kim aça bilir | Audit harada oxuyur |
|---|---|---|---|---|
| «İdarəetmə paneli» | «İdarəetmə paneli» (`layout/navigation.ts`:27) | `/dashboard` — girişdən sonra açılan səhifə (`App.tsx`:29–30) | daxil olmuş hər kəs | real, Rəhbər; sınaqda K2-nin başlanğıcı (G-02) |
| «Aylıq hesabat» (`pages/MonthlyReportPage.tsx`:76) | «Aylıq hesabat» (`layout/navigation.ts`:28) | `/dashboard/monthly` (`App.tsx`:33) | daxil olmuş hər kəs | real, Rəhbər |
| «Təsdiq gözləyənlər» (`pages/ApprovalInboxPage.tsx`:129) | «Təsdiq gözləyənlər», `requires: 'canViewApprovals'` (`layout/navigation.ts`:30) | `/approvals` (`App.tsx`:37–39) | Rəhbər və Admin (`ICurrentUserContext.cs`:70, 103) | real, Rəhbər, yalnız baxış; axının özü sınaqda (F bölməsi) |
| «Excel importları» | «Excel importları», `requires: 'canManageImports'` (`layout/navigation.ts`:33) | `/imports` (`App.tsx`:61–63) | Koordinator və Admin (`ICurrentUserContext.cs`:93) | **Rəhbər birbaşa ünvanla da açmamalıdır** — bu, C bölməsinin yoxlamasıdır; sınaqda `sinaq.koordinator` ilə (`04-sandbox.md`, Sınaq 3). Real importun ünvanı heç kimlə açılmır (`03-emrler.md`, 5.1) |
| «Obyektlər» (`pages/LocationsPage.tsx`:70) | «Obyektlər» (`layout/navigation.ts`:34) | `/locations` (`App.tsx`:44) | daxil olmuş hər kəs | real, Rəhbər |
| obyekt səhifəsi — başlıq obyektin adıdır (`pages/LocationDetailPage.tsx`:139) | yoxdur; «Obyektlər» siyahısından | `/locations/<nömrə>` (`App.tsx`:45) | daxil olmuş hər kəs | real, Rəhbər |
| sifariş səhifəsi — başlıq obyektin adı, altında dövr (`pages/OrderDetailPage.tsx`:188–190) | yoxdur; paneldə «Detallara bax» (`components/dashboard/AttentionSection.tsx`:211–236) və ya obyekt səhifəsində «Müqayisə et» (`pages/LocationDetailPage.tsx`:151) | `/orders/<nömrə>` (`App.tsx`:43) | daxil olmuş hər kəs | real, Rəhbər; sınaqda F bölməsi |
| «Məhsul tarixçəsi» pəncərəsi (`terminology/terms.ts`:41; `components/analytics/TrendModal.tsx`:115) | yoxdur; sifariş səhifəsində «Əsas dəyişikliklər» siyahısının bir sətrinə klik (`components/decisions/DriverList.tsx`:117–122; `pages/OrderDetailPage.tsx`:516) | öz ünvanı yoxdur | daxil olmuş hər kəs | real, Rəhbər |
| «Məhsullar» və kateqoriyalar | «Məhsullar», `requires: 'canManageCatalog'` (`layout/navigation.ts`:37) | `/products`, `/products/categories` (`App.tsx`:51–54) | Koordinator və Admin (`ICurrentUserContext.cs`:118) | **Rəhbər birbaşa ünvanla da açmamalıdır** — C bölməsi; sınaqda `04-sandbox.md`, Sınaq 4 |
| «Təchizatçılar» | «Təchizatçılar» (`layout/navigation.ts`:38) | `/suppliers` (`App.tsx`:57) | daxil olmuş hər kəs; `canManageCatalog` olmayana yalnız baxış (`auth/labels.ts`:31) | real, Rəhbər; sınaqda Sınaq 3, addım 5 |
| «Qiymət təsnifatı» (`pages/PricingModeReviewPage.tsx`:132) | «Qiymət təsnifatı», `requires: 'canManageCatalog'` (`layout/navigation.ts`:39) — **Rəhbərin menyusunda yoxdur** | `/pricing-modes` (`App.tsx`:58; marşrutda icazə yoxlaması yoxdur) | daxil olmuş hər kəs açır; qərar düymələri yalnız `canManageCatalog` olana (`PricingModeReviewPage.tsx`:219); qalanlara «Yalnız baxış» qeydi (`PricingModeReviewPage.tsx`:139–143) | real, Rəhbər: ünvan sətrinə yazaraq (A-10 … A-12, J-05), və ya sifarişin qiymət xəbərdarlığındakı «Qiymət təsnifatına bax» linki ilə (`components/decisions/DecisionHeadline.tsx`:85–94; `pricing/labels.ts`:128) — bu link `?order=` ilə açılır və yalnız həmin sifarişin sətirlərini göstərir; sınaqda Sınaq 3 |
| «İstifadəçilər» | «İstifadəçilər», `requires: 'canManageUsers'` (`layout/navigation.ts`:40) | `/admin/users` (`App.tsx`:65–67) | yalnız Admin (`ICurrentUserContext.cs`:114) | **Rəhbər birbaşa ünvanla da açmamalıdır** — C bölməsi; admin hesabı yalnız `01-hazirliq.md`, 4-cü bənddə, baxmaq üçün (A-04) |

### Brief-in sözləri və ekranın sözləri

Brief-lərdə bəzi şeylər ekrandakından fərqli adlanır. Ekranda axtarılacaq söz sağ sütundadır.

| Brief-də | Ekranda | Mənbə |
|---|---|---|
| "Son 3 ay" (`BRIEFS/TASK-15.md`, Task 1 nümunəsi) | «Son 3 ayın ortalaması» | `components/analytics/format.ts`:39; seçici `components/analytics/BasisPicker.tsx`:69–83 |
| "Geri" bazanı qaytarır (`BRIEFS/TASK-15.md`, Task 1 nümunəsi) | brauzerin **Geri** (Back) düyməsi. Ekranda «Geri» adlı düymə yoxdur; «Geri al», «Geri alınıb», «Geri qaytar» başqa şeylərdir (məhsul uyğunluqları və import yoxlaması) | baza ünvanda saxlanır: `analytics/basisParams.ts`:10–11, 186; «Geri al» — `components/catalog/matches/labels.ts`:56; «Geri qaytar» — `components/imports/review/RowDetailDialog.tsx`:259 |
| "Qaralama" (`BRIEFS/TASK-15.md`, yaxşı olanlar) | qaralama «Təsdiqlənməyib» adlanır | `components/workflow/labels.ts`:6; `components/imports/labels.ts`:177 |
| "Yeni" (`BRIEFS/TASK-06.md`:28) | «Yeni məhsullar» | `terminology/terms.ts`:14; `components/decisions/labels.ts`:14 |
| "Miqdar" (`BRIEFS/TASK-06.md`:28) | «Miqdar təsiri» | `components/decisions/labels.ts`:15 |
| "Qiymət" (`BRIEFS/TASK-06.md`:28) | «Qiymət təsiri» | `components/decisions/labels.ts`:16 |
| "Artıq" (`BRIEFS/TASK-06.md`:28), "Artıq sifariş olunmayanlar" (`BRIEFS/TASK-07.md`:10–11) | «Bu ay yazılmayan məhsullar» | `terminology/terms.ts`:20; `components/decisions/labels.ts`:17 |

### Real datada təhlükəsizlik

Real datada (`http://localhost:5173`, baza `baxorders_dev`) hər yoxlama yalnız oxumadır. Heç bir sifariş
təsdiqlənmir, qaytarılmır və dəyişdirilmir; heç nə təsnif edilmir; heç bir məhsul uyğunluğu və heç bir import
təsdiqlənmir (`README.md`, 5-ci bölmə; protokol §8). Rəhbərin öz qərar düymələri («Təsdiqlə», «Düzəliş tələb et») Task
4-ə görə var: real sifarişdə onları da basmayın. Ekran Rəhbərə Task 14-ün olmamalı dediyi bir yazma əməli təklif edirsə
(düymə, işarələmə qutusu, «Yadda saxla»), onu basmayın. Nə gördüyünüzü ekranı, eni və ünvanı ilə K bölməsində yazın və
DAYANIN (`README.md`, 5-ci bölmə; protokol §8). Buna görə real datanın hər sətrində `Addımlar:` bu xatırlatma ilə
başlayır: «(Real: yalnız oxuyun; yazma düyməsini basmayın.)». Sınaq mühitinin hər sətrində isə `Addımlar:`
`04-sandbox.md` §1-in üç yoxlaması ilə başlayır.

---

## A. Ön şərtlər (G1, G2, G3)

Ön şərtlər `README.md`, 4-cü bölmədəki sıra ilə yoxlanır: əvvəl hazırlıq (`01-hazirliq.md`), sonra əmrlərin başlanğıc
oxunuşu (`03-emrler.md`), sonra rəqəmlər. Bir ön şərt keçmirsə, DAYANIN: audit davam etmir (`README.md`, 4-cü bölmə,
3-cü addım; 5-ci bölmə).

Regress testləri (frontend və backend) bu bölmədə yoxdur. Protokola görə onları Coder işlədir (protokol §5.3): 15a1
onları baza kimi işlədib, 15b yenidən işlədəcək. Operator testləri işlətmir.

`01-hazirliq.md`-nin 1-ci və 2-ci bəndlərindəki əmrlərin və `03-emrler.md`-nin dörd əmrinin bütün çıxışını A-14-dən
sonra, «B. Köhnə tapıntılar» başlığından əvvəl yapışdırın (`05-neticeler-qaytarilmasi.md`, 4-cü bənd).

### A-01 — G1: tarix
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar», 15.1; protokol §5.1, sitat: "**15.1:** Ən son tam real ay + təsdiq axını üçün ayrıca test sifarişi. Oktyabr tamdırsa Oktyabr, deyilsə Sentyabr."
Harada: real · PowerShell · `01-hazirliq.md`, 1-ci bənd · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) `01-hazirliq.md`, 1-ci bənddəki `Get-Date -Format 'yyyy-MM-dd HH:mm'` əmrini işlədin; 2) çıxışı `Rəqəm:` sətrinə yazın.
Gözlənilən: tarix 2026-10-31 və ya ondan əvvəldir. Sonradırsa: DAYANIN və sahibdən yenidən soruşun (protokol §5.1; `01-hazirliq.md`, 1-ci bənd). Audit ayı Sentyabr 2026-dır; sahibin 2026-09-25 tarixli cavabı (A1), protokol §5.1-dən sözbəsöz: "October has not begun on 2026-09-25, so under brief 15.1 the last complete real month is September. Confirmed; the audit uses it."
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-02 — G3: commit
Mənbə: protokol §5.3, sitat: "The API and frontend serve `7550eda`, or a later commit that changes only `docs/audits/` (15a's kit commit is one). Record `git rev-parse HEAD`, `git diff --stat 7550eda HEAD` and the API start time."
Harada: real · PowerShell · `01-hazirliq.md`, 2-ci bənd · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) `01-hazirliq.md`, 2-ci bənddəki üç əmri işlədin: `git rev-parse HEAD`, `git diff --stat 7550eda HEAD`, `git status --short`; 2) üçünün çıxışını bu bölmənin sonuna yapışdırın; 3) aşağıdakı iki sətri doldurun.
Gözlənilən: `git diff --stat 7550eda HEAD` yalnız `docs/audits/` altındakı faylları göstərir və ya heç nə göstərmir; başqa fayl görünürsə DAYANIN (protokol §5.3, §8; `01-hazirliq.md`, 2-ci bənd). `git status --short`-da `?? AI_WORKFLOW/`, `?? monitor-agent.ps1`, `?? resume-agent.ps1`, `?? run-agent.ps1` və `docs/audits/` altındakı sətirlərdən başqa heç nə yoxdur; varsa DAYANIN (`01-hazirliq.md`, 2-ci bənd).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - HEAD:
  - `docs/audits/`-dan kənar dəyişmiş fayl (yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-03 — G3: real sistem işə salınıb
Mənbə: protokol §5.3, sitat: "Record `git rev-parse HEAD`, `git diff --stat 7550eda HEAD` and the API start time."
Harada: real · PowerShell və brauzer · `01-hazirliq.md`, 3-cü bənd · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) `01-hazirliq.md`, 3.1: `./scripts/dev-postgres.ps1`; skript yeni klaster yaratdığını deyirsə, DAYANIN; 2) 3.2: API-ni təzədən başladın və pəncərədə `http://localhost:5080`-da dinlədiyini bildirən sətrin çıxdığı saatı yazın; `swagger` səhifəsini bağlayın; 3) 3.3: frontend-i başladın və brauzerdə açılan ünvanı yazın.
Gözlənilən: skript mövcud klasteri işə salır, yenisini yaratmır (`01-hazirliq.md`, 3.1). API `http://localhost:5080`-da dinləyir (3.2). Frontend `http://localhost:5173`-də, ya da port məşğuldursa `vite`-in pəncərədə yazdığı ünvanda açılır (3.3). Bu ünvan auditin bütün real sətirlərində işlədilir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Baza (3.1) — mövcud klaster işə düşdü, yoxsa yenisi yaradıldı:
  - API-nin başlama vaxtı (3.2):
  - Frontend-in ünvanı (3.3):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-04 — G3: aktiv Rəhbər istifadəçisi
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar», sitat: "Audit admin yox, Rəhbər hesabı ilə aparılır (Task 14)."
Harada: real · «İstifadəçilər», sonra səhifənin başlığı · `/admin/users` (`layout/navigation.ts`:40), sonra `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) `01-hazirliq.md`, 4-cü bənd, 1–4-cü addımlar: admin hesabı auditdə yalnız burada, yalnız baxmaq üçün işlədilir; heç bir pəncərədə yadda saxlamayın; 2) 5-ci addım: admindən çıxın və Rəhbər hesabı ilə daxil olun; parolu yalnız giriş formasına yazın; 3) 6-cı addım: başlıqda görünən adı yazın.
Gözlənilən: «İstifadəçilər» siyahısında rolu Rəhbər olan aktiv istifadəçi var; Rəhbər ilə daxil olanda başlıqda onun adı görünür, "Administrator" yox (protokol §5.3; `01-hazirliq.md`, 4-cü bənd). Belə istifadəçi yoxdursa: DAYANIN.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Rəhbərin istifadəçi adı və ekrandakı adı (parolsuz):
  - Rəhbər ilə daxil olanda başlıqda görünən ad:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-05 — G3: sınaq mühiti sıfırlanıb
Mənbə: protokol §5.3, sitat: "The sandbox is reset (`sandbox.ps1 -Reset`), so that its test order is waiting for approval."
Harada: sınaq · «Təsdiq gözləyənlər» · `http://localhost:5174/approvals` (`layout/navigation.ts`:30) · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `01-hazirliq.md`, 5.1 və 5.2: parol, `-Reset`, `-Run`, `dev:sandbox`; 2) `sinaq.rehber` ilə daxil olun; 3) menyuda «Təsdiq gözləyənlər»-i açın və siyahını yazın; 4) nə qaldığını `01-hazirliq.md`, 5.4 ilə tutuşdurun; 5) bu baxış `04-sandbox.md`, Sınaq 1, addım 1 ilə eynidir: Sınaq 1-ə dərhal keçirsinizsə, oxunuşu orada da işlədə bilərsiniz; keçmirsinizsə, `01-hazirliq.md`, 5.5 (dayandırmaq və `-Reset`).
Gözlənilən: siyahıda bir sifariş var — Sınaq obyekti 1, Sentyabr 2026, sətirdə «Qərar gözləyir» (`04-sandbox.md`, Sınaq 1, addım 1; `01-hazirliq.md`, 5.4; `components/approvals/ApprovalRows.tsx`:239–243). Sınaq obyekti 2-nin Sentyabr 2026 qaralaması «Təsdiqlənməyib» vəziyyətində qalır və növbədə görünmür (`04-sandbox.md`, Sınaq 1, giriş hissəsi və addım 2; `components/workflow/labels.ts`:6).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Təsdiq gözləyənlər»-dəki sifarişlər:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-06 — Əmr 1, başlanğıc oxunuşu
Mənbə: protokol §5.2, sitat: "The operator reads these figures on the Qiymət təsnifatı page, and cross-checks them with the read-only commands the 15a kit prepares."
Harada: real · PowerShell · `03-emrler.md`, Əmr 1 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) `03-emrler.md`, 2-ci bölmə: əvvəl `[Console]::OutputEncoding …` sətri, sonra Əmr 1, çıxış `$env:TEMP\emr-1-A.txt` faylına; 2) ikinci sətri yoxlayın (2.1); 3) çıxış kodunu yazın (2.2); 4) bütün çıxışı bu bölmənin sonuna yapışdırın; 5) Əmr 1-in «Hara gedir» sətirlərini A-10, A-11, A-12 və A-13-ə köçürün.
Gözlənilən: ikinci sətir `Database: baxorders_dev @ localhost:55434 (user baxorders)`-dir; başqa baza adı görünürsə DAYANIN (`03-emrler.md`, 2.1). Çıxış kodu `0` (2.2). Son sətir `Inspection only. Nothing was changed.` (`03-emrler.md`, Əmr 1). Bu sətirdə «keçdi» o deməkdir ki, bu üçü belədir və çıxış tam yapışdırılıb.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - İkinci sətir (2.1):
  - Çıxış kodu (2.2):
  - Son sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-07 — Əmr 2, başlanğıc oxunuşu
Mənbə: protokol §3, sitat: "13c: after the Sabun variant link is approved, HEM September "Keçən ay" should read +23,852.70."
Harada: real · PowerShell · `03-emrler.md`, Əmr 2 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) A-06 kimi, Əmr 2 ilə, çıxış `$env:TEMP\emr-2-A.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın; 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) Əmr 2-nin «Hara gedir» sətirlərini aşağıya köçürün.
Gözlənilən: ikinci sətir və çıxış kodu A-06-dakı kimi (`03-emrler.md`, 2.1, 2.2); son sətir `Inspection only. Nothing was changed.` (`03-emrler.md`, Əmr 2). Müqayisə üçün: Task 13a-da real datada 1 «Yazılış fərqi» və 216 «Variant fərqi» təklifi qeydə alınıb — bu, o vaxtkı rəqəmdir (`AI_WORKFLOW/PLAN.md`, Task 13a, `03-emrler.md`, Əmr 2, «Hara gedir»-in istinad etdiyi kimi).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - İkinci sətir və çıxış kodu:
  - `N suggestion(s)` — iki başlıqda:
  - `ProductMatchDecisions: exists, N row(s)` və `Live decisions read: N`:
  - Sabun sətirləri və `YES — …` / `NO.` sətri:
  - HEM Sentyabr «Keçən ay»: `Order #…, version …, …` və `Current …, baseline …, difference …`:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-08 — Əmr 3, başlanğıc oxunuşu
Mənbə: protokol §5.2, sitat: "the import batches and their states. Batch #6 must still be `NeedsReview`."
Harada: real · PowerShell · `03-emrler.md`, Əmr 3 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) A-06 kimi, Əmr 3 ilə, çıxış `$env:TEMP\emr-3-A.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın; 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) Əmr 3-ün «Hara gedir» sətirlərini aşağıya köçürün; import sətrini A-13-ə də köçürün.
Gözlənilən: ikinci sətir və çıxış kodu A-06-dakı kimi (`03-emrler.md`, 2.1, 2.2); son sətir `Nothing was changed.` (`03-emrler.md`, Əmr 3). HD-002 bloku: 94 qərar, `Administrator`, 2026-09-24, 12:03:26–12:04:23 (`AI_WORKFLOW/PLAN.md`, HD-002, `03-emrler.md`, Əmr 3, «Hara gedir»-in istinad etdiyi kimi). Alət vaxtı UTC ilə çap edir: vaxtları müqayisə etməyin, yalnız yapışdırın (`03-emrler.md`, Əmr 3, «Hara gedir»). Obyektlərin sayı üçün bu əmrə aid rəqəm brief-də yoxdur (brief rəqəm vermir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - İkinci sətir və çıxış kodu:
  - `Catalogue — N objects (…)` başlığı:
  - `Location aliases — N` bloku (yapışdırılıb: bəli / xeyr):
  - `Batches of Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` blokunun sətirləri:
  - `Pricing classification decisions (HD-002 …)` bloku və `Unpriced lines by mode: …` sətri (yapışdırılıb: bəli / xeyr):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-09 — Əmr 4, başlanğıc oxunuşu
Mənbə: protokol §9, 11-ci bənd, sitat: "No real order, batch, classification, product match or user changed."
Harada: real · PowerShell · `03-emrler.md`, Əmr 4; 4.1–4.5 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) A-06 kimi, Əmr 4 ilə, çıxış `$env:TEMP\emr-4-A.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın (2.1, 2.2); 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) aşağıdakı sətirlərə nəticəni gəldiyi kimi yazın — PASS və ya FAIL, bütün fərq sətirləri ilə; 5) **heç bir fərq haqqında hökm yazmayın** («normaldır», «gözlənilir», «problemdir» yox): fərqləri 15b izah edir (`03-emrler.md`, 4.5).
Gözlənilən: Task 16a-dan bəri heç nə dəyişməyibsə, son sətir `All 9 checks passed. Nothing was changed.`-dir (`03-emrler.md`, 4.1). Task 16a-nın baza faylı bu kompüterdə yoxdursa, nəticə 4.3-dəki kimidir. Çıxış kodu `0` və ya `1` ola bilər; `1` ölçünün nəticəsidir, alətin xətası deyil (2.2). Bu sətirdə «keçdi» yalnız o deməkdir ki, əmr işləyib və çıxışı tam yapışdırılıb; o, fərqlər haqqında hökm deyil.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - İkinci sətir və çıxış kodu:
  - Son sətir:
  - `== MUST NOT CHANGE … ==` bölməsinin son sətri:
  - `[FAIL]` olan yoxlamalar, sözbəsöz (yoxdursa «yoxdur»):
  - 5-ci yoxlama (`HD-002: …`) — `[PASS]` / `[FAIL]` / çıxmayıb:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-10 — G2: «Təsnif edilməyib»
Mənbə: `BRIEFS/TASK-15.md`, «Acceptance — biznes dili ilə», 4-cü bənd, sitat: "Audit başlayanda Qiymət təsnifatında nə "Təsnif edilməyib", nə də qiyməti yazılmamış "Alış qiyməti tələb olunur" sətri var."
Harada: real · «Qiymət təsnifatı» · `/pricing-modes`, ünvan sətrinə yazılır (Rəhbərin menyusunda yoxdur: `layout/navigation.ts`:39; ünvan açıqdır: `App.tsx`:58) · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Rəhbər ilə daxil olmuş halda ünvan sətrinə `http://localhost:5173/pricing-modes` yazın (A-03-də başqa ünvan yazılıbsa, onu işlədin), `?order=` olmadan; 2) başlıq «Qiymət təsnifatı»-dır (`pages/PricingModeReviewPage.tsx`:132); yuxarıda "Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz yoxdur." qeydinin olduğunu yoxlayın (`PricingModeReviewPage.tsx`:139–143; `auth/labels.ts`:31) — bu qeyd varsa, qərar düyməsi təklif olunmur (`PricingModeReviewPage.tsx`:219); 3) üç cəmi oxuyun (`PricingModeReviewPage.tsx`:173–179): «Təsnif edilməyib», «Alış qiyməti tələb olunur», «Ödənişsiz daxili təminat» (`pricing/labels.ts`:80–84); 4) birincini Əmr 1-in `Təsnif edilməyib (Unresolved): …` sətri ilə tutuşdurun və ikisini də yazın; fərqlidirlərsə, ikisini də yazın, birini seçməyin; 5) ekran şəkli çəkin — **mütləqdir**.
Gözlənilən: **0** (protokol §5.2; brief 15.2). Sonuncu qeydə alınmış rəqəm 0-dır (`AI_WORKFLOW/PLAN.md`, Task 16a), amma yenidən oxunur. 0-dan böyükdürsə: DAYANIN və açıq sətirləri — məhsul, obyekt, dövr — `Qeyd:` sətrində sadalayın (protokol §5.2).
İlk auditdə: "Qiymət xəbərdarlıqları etibarsız idi: 94 sətir təsnifatsız idi, daxili təminat bir ekranda səhv sayılırdı — Task 2 və təsnifat işi." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 2-ci bənd)
---- operator doldurur ----
Göründü:
  - "Yalnız baxış" qeydi görünür (bəli / xeyr):
  - Səhifədə «Təsnif edilməyib»:
  - Əmr 1: `Təsnif edilməyib (Unresolved): …`:
  - Oxunma vaxtı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-11 — G2: qiyməti yazılmamış «Alış qiyməti tələb olunur»
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar», 15.2a, sitat: "**15.2a:** "Alış qiyməti tələb olunur" real sətirlər yekun audit üçün açıq sayılır. Auditdən əvvəl ya qiymət daxil edilir, ya da biznes qaydasına görə qiymət tələb etmədiyi təsdiqlənib uyğun statusa keçirilir."
Harada: real · «Qiymət təsnifatı», ikinci cəm · `/pricing-modes`, ünvan sətrinə yazılır · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) A-10-un səhifəsində ikinci cəmi, «Alış qiyməti tələb olunur»-u oxuyun (`PricingModeReviewPage.tsx`:176); 2) onu Əmr 1-in `Alış qiyməti tələb olunur (PriceRequired): …` sətri ilə tutuşdurun və ikisini də yazın; fərqlidirlərsə, birini seçməyin; 3) ekran şəkli — **mütləqdir** (A-10-un şəkli üç cəmi göstərirsə, eyni şəkli yazın). Koddan: bu səhifə yalnız qiyməti olmayan sətirləri göstərir və sayır (`PricingModeReviewPage.tsx`:136, 174), Əmr 1-in sətri də yalnız qiyməti olmayanları sayır (`03-emrler.md`, Əmr 1, «Hara gedir»; `src/BaxOrders.Application/Orders/Pricing/PricingModeReviewService.cs`:46–47). Ona görə bu cəm G2-nin "qiyməti yazılmamış «Alış qiyməti tələb olunur»" rəqəminin özüdür.
Gözlənilən: **0** (protokol §5.2; brief 15.2a). Sonuncu qeydə alınmış rəqəm 0-dır (`AI_WORKFLOW/PLAN.md`, Task 16a), amma yenidən oxunur. 0-dan böyükdürsə: DAYANIN və açıq sətirləri — məhsul, obyekt, dövr — `Qeyd:` sətrində sadalayın (protokol §5.2).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Səhifədə «Alış qiyməti tələb olunur» (qiyməti yazılmamış):
  - Əmr 1: `Alış qiyməti tələb olunur (PriceRequired): …`:
  - Bütün «Alış qiyməti tələb olunur» sətirləri, qiymətlilər də daxil: oxunmur — dəstin heç bir ekranı və əmri bu rəqəmi göstərmir (səhifə də, Əmr 1 də yalnız qiyməti olmayan sətirləri sayır)
  - Oxunma vaxtı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-12 — G2: «Ödənişsiz daxili təminat» və HD-002-nin payı
Mənbə: protokol §5.2, sitat: "«Ödənişsiz daxili təminat» (InternalFreeSupply) count, and how many of those are HD-002's 94 rows;"
Harada: real · «Qiymət təsnifatı», üçüncü cəm; Əmr 1 və Əmr 4 · `/pricing-modes`, ünvan sətrinə yazılır · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) A-10-un səhifəsində üçüncü cəmi, «Ödənişsiz daxili təminat»-ı oxuyun (`PricingModeReviewPage.tsx`:177); 2) Əmr 1-in `Ödənişsiz daxili təminat (InternalFreeSupply): …` və `Pricing decisions recorded: …` sətirlərini yazın; 3) HD-002-nin payını `03-emrler.md`, 5.2-yə görə yazın: Əmr 4-ün `HD-002: …` yoxlaması `[PASS]`-dırsa (A-09) — "94-ü HD-002-nindir"; `[FAIL]`-dırsa və ya çıxmayıbsa — "Əmr 4-ün HD-002 yoxlaması keçməyib, bu rəqəm oxunmur" və Əmr 3-ün HD-002 blokunu yapışdırın; 4) ekran şəkli — **mütləqdir** (A-10-un şəkli üç cəmi göstərirsə, eyni şəkli yazın).
Gözlənilən: sonuncu qeydə alınmış rəqəm 95-dir, 94 qərarla (`AI_WORKFLOW/PLAN.md`, Task 16a); rəqəm yenidən oxunur, köhnəsi köçürülmür. HD-002-nin 94 sətri həll olunmuş sayılır, açıq sətir deyil (protokol §5.2, cavab A4). Rəqəm fərqlidirsə, amma A-10 və A-11 0-dırsa, fərqi yazın və davam edin: bu, DAYANMA deyil (protokol §5.2). Bu sətirdə «keçdi» o deməkdir ki, rəqəmlər oxunub və yazılıb.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Səhifədə «Ödənişsiz daxili təminat»:
  - Əmr 1: `Ödənişsiz daxili təminat (InternalFreeSupply): …`:
  - Əmr 1: `Pricing decisions recorded: …`:
  - HD-002-nin payı (`03-emrler.md`, 5.2):
  - Oxunma vaxtı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-13 — G2: importların vəziyyəti
Mənbə: protokol §5.2, sitat: "If it has been confirmed since 16b, or if any batch other than #50010 is `Imported`: STOP and report."
Harada: real · PowerShell (Əmr 1 və Əmr 3) · `03-emrler.md`, 5.1 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Əmr 1-in `== Import batches — N ==` blokundan vəziyyət üzrə sayları yazın; 2) Əmr 3-ün `== Batches of Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx ==` blokundan `#50010` sətrini yazın; 3) Əmr 1-in `== Batches under review (NeedsReview / ReadyToImport) — N ==` blokundan `#6` sətrini yazın; 4) üçünü sözbəsöz köçürün. «Excel importları» səhifəsində importların siyahısı yoxdur (`03-emrler.md`, 5.1; `pages/ImportsPage.tsx`:38–39) və Rəhbər o səhifəni aça bilmir (`App.tsx`:61–63). **Heç bir hesabla `/imports?id=6` və ya başqa real importun ünvanını açmayın** (`03-emrler.md`, 5.1). Ekran şəkli mümkün deyil: sübut yapışdırılmış əmr çıxışıdır.
Gözlənilən: `Imported: 1`; `#50010 … Imported … materialized True`; `#6 «…» NeedsReview: …` (`03-emrler.md`, 5.1). `Imported` sayı 1-dən çoxdursa, #50010 `Imported` deyilsə və ya #6 `NeedsReview` deyilsə: DAYANIN (protokol §5.2, §8; `03-emrler.md`, 5.1).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Əmr 1, `Import batches`:
  - Əmr 3, `#50010` sətri:
  - Əmr 1, `#6` sətri:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### A-14 — Ön şərtlərin nəticəsi
Mənbə: protokol §5, sitat: "Pre-audit gates. All must pass before §6 starts."
Harada: — · bu bölmə · A-01 … A-13 · —
Addımlar: 1) A-01, A-02, A-04, A-10, A-11 və A-13-ün `Hökm:` sətirlərinə baxın; 2) hamısı «keçdi»dirsə, B bölməsinə keçin; biri «keçdi» deyilsə, DAYANIN və burada hansının keçmədiyini yazın.
Gözlənilən: A-01, A-02, A-04, A-10, A-11 və A-13 «keçdi»; əks halda audit burada dayanır (`README.md`, 4-cü bölmə, 3-cü addım; 5-ci bölmə).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## B. Köhnə tapıntılar

Bu bölmə ilk auditin tapıntılarıdır: `BRIEFS/TASK-04.md` … `TASK-14.md`-nin «Auditdə müşahidə edilən hazırkı problem»
bölməsində hər bənd bir sətirdir, bənd bir neçə nümunə sayırsa, hər nümunə ayrıca sətirdir (protokol §6.1, §10 A2).
`BRIEFS/TASK-16.md`-nin tapıntıları burada yox, C-dədir (protokol §6.1, son abzas). `Hökm:` sözləri: həll olunub /
qismən / həll olunmayıb, və ya yoxlanıla bilmədi (səbəb). Prioritet yazmayın: «qismən» və «həll olunmayıb» sətrinə bu
günün şkalası ilə prioriteti 15b verir (protokol §6.1, §7.1). Hər sətrə sübut lazımdır: ekran, en və bu gün görünən rəqəm
və ya mətn, ilk auditin qeydinin yanında (protokol §6.1). `Rəqəm:` və `Göründü:` «baxdım» ilə qalmır.

- Sətir başqa demirsə: real data, Rəhbər hesabı, Sentyabr 2026, «Keçən ay», 1366 × 768; sifariş səhifəsi E-nin
  girişindəki kimi açılır. `Mənbə:`-nin sonunda tapıntını həll edən task yazılıb.
- Məbləğ: brief "71,210.29" yazır, ekran "71.210,29 ₼" (`components/analytics/format.ts`:235, 243–245). Dəyəri müqayisə
  edin, yazılışı yox. Söz sətirlərinin (B-29 … B-43) beş ekranı: İdarəetmə paneli; Heydər Əliyev Mərkəzinin Sentyabr
  2026 sifarişi; onun obyekt səhifəsi; Aylıq hesabat; həmin sifarişdən açılan «Məhsul tarixçəsi» (`BRIEFS/TASK-05.md`:32).

### B-01 — Task 04: «Təsdiq gözləyənlər» boş idi, qərar düymələri görünmədi
Mənbə: `BRIEFS/TASK-04.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 7, sitat: ""Təsdiq gözləyənlər" boşdur: "Təsdiq gözləyən sifariş yoxdur. Yeni sifariş təsdiqə göndərildikdə burada görünəcək." Ona görə "Təsdiqlə" və "Düzəliş tələb et" düymələri auditdə heç görünmədi və qərar axını yoxlanılmadı." · həll edən task: Task 04
Harada: real · «Təsdiq gözləyənlər» · `/approvals` (`layout/navigation.ts`:30) · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Təsdiq gözləyənlər»-i açın (başlıq: `pages/ApprovalInboxPage.tsx`:129); 2) siyahıdakı sifarişləri (obyekt və dövr) yazın; siyahı boşdursa, boş siyahının mətnini sözbəsöz yazın; 3) real sifarişdə «Təsdiqlə» və «Düzəliş tələb et»-i basmayın; 4) düymələrin görünməsi və qərar axını sınaqda yoxlanır: F-02 … F-06-nın hökmlərini aşağıya köçürün.
Gözlənilən: "Real datadan ayrı test mühitində axın başdan sona sınanır: sifariş göndərilir → "Təsdiq gözləyənlər"də görünür → rəhbər təhlilə baxır → səbəb yazaraq "Düzəliş tələb et" → göndərən düzəldib yenidən göndərir → rəhbər təsdiqləyir. Sınaq Rəhbər rolu ilə aparılır." (`BRIEFS/TASK-04.md`:14); ""Təsdiqlə" və "Düzəliş tələb et" axtarılmadan tapılır və təhlilə baxarkən görünən qalır." (`BRIEFS/TASK-04.md`:20). Real növbədə neçə sifariş olmalıdır — brief rəqəm vermir.
İlk auditdə: ""Təsdiq gözləyənlər" boşdur" və düymələr "auditdə heç görünmədi və qərar axını yoxlanılmadı" (`BRIEFS/TASK-04.md`:7)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (real növbədəki sifarişlər və ya boş siyahının mətni):
  - F-02-nin hökmü:
  - F-03-ün hökmü:
  - F-04-ün hökmü:
  - F-05-in hökmü:
  - F-06-nın hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-02 — Task 04: axını təhlükəsiz sınamaq üçün mühit yox idi
Mənbə: `BRIEFS/TASK-04.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 8, sitat: "Audit qaydası real sifarişləri təsdiqləməyi, qaytarmağı və dəyişməyi qadağan edir. Axını təhlükəsiz sınamaq üçün mühit yoxdur." · həll edən task: Task 04
Harada: sınaq · sınaq mühiti: A-05 və F-01 … F-09 · `http://localhost:5174` · 1366 və 390
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. Ayrıca addım yoxdur: 1) sınaq mühitinin sıfırlanıb açılması A-05-dədir; 2) axın F-01 … F-09-dadır (`04-sandbox.md`, Sınaq 1 və Sınaq 2); 3) A-05-in və F-09-un hökmlərini, və F-01 … F-09 arasında «keçdi» olmayan sətirlərin nömrələrini aşağıya köçürün.
Gözlənilən: "Real datadan ayrı test mühitində axın başdan sona sınanır: …" (`BRIEFS/TASK-04.md`:14); "Real sifarişlər təsdiqlənmir, qaytarılmır və dəyişdirilmir; sınaq yalnız test mühitində aparılır." (`BRIEFS/TASK-04.md`:26)
İlk auditdə: "Axını təhlükəsiz sınamaq üçün mühit yoxdur." (`BRIEFS/TASK-04.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - A-05-in hökmü:
  - F-09-un hökmü:
  - F-01 … F-09 arasında «keçdi» olmayanlar (yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-03 — Task 04: təsdiqlənmiş sifarişdə status iki dəfə
Mənbə: `BRIEFS/TASK-04.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 9, sitat: "Təsdiqlənmiş sifarişdə yan panel statusu təkrarlayır: "✓ Təsdiqlənib" həm başlıqda, həm yan paneldə var." · həll edən task: Task 04
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifariş səhifəsini açın (E-nin girişi, «Sifariş səhifəsini açmaq»); 2) səhifədə «Təsdiqlənib» sözünün (`components/workflow/labels.ts`:8) göründüyü hər yeri yazın: başlıqdakı nişan (`pages/OrderDetailPage.tsx`:194–195), qərar paneli və başqa yer; 3) neçə dəfə göründüyünü yazın. Koddan: panel statusu təkrarlamır, onu başlıq bir dəfə deyir (`components/workflow/WorkflowPanel.tsx`:42). Sınaqda təsdiqlənmiş test sifarişində eyni sual F-06-dadır ("səhifədə bir dəfə"): F-06-nın hökmünü də köçürün.
Gözlənilən: "Qərar paneli statusu təkrarlamır." (`BRIEFS/TASK-04.md`:15); "status bir dəfə görünür." (`BRIEFS/TASK-04.md`:48)
İlk auditdə: ""✓ Təsdiqlənib" həm başlıqda, həm yan paneldə var." (`BRIEFS/TASK-04.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - «Təsdiqlənib» görülən yerlər:
  - Neçə dəfə:
  - F-06-nın hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-04 — Task 04: panelin mətni qərara kömək etmirdi (Fəvvarələr, Sentyabr 2026)
Mənbə: `BRIEFS/TASK-04.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10, sitat: "Panelin qalan hissəsi qərara kömək etmir: "Məlum qiymətlər üzrə məbləğ: 10,949.67 ₼ · 76 sətir · Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb" (Fəvvarələr meydanı, Sentyabr 2026)." · həll edən task: Task 04; paneldəki sözlər Task 05 (`BRIEFS/TASK-04.md`:41)
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, qərar paneli · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-03-ün səhifəsi; 2) qərar panelinin bütün mətnini sözbəsöz yazın; 3) paneldə göndərənin, tarixin və ya təsdiqləyənin adı olub-olmadığını yazın. Koddan: Excel-dən gəlmiş sifarişdə panel yalnız bir cümlə yazır (`components/workflow/WorkflowPanel.tsx`:199; `components/workflow/labels.ts`:68). "Məlum qiymətlər üzrə məbləğ" sözünün özü B-32-dədir.
Gözlənilən: "Excel-dən gəlmiş keçmiş sifarişlərdə panel belə yazır: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." Göndərən, tarix və ya təsdiqləyən uydurulmur." (`BRIEFS/TASK-04.md`:23; qərar 4.1, `BRIEFS/TASK-04.md`:29). Paneldə məbləğ olmalıdırmı — brief rəqəm vermir.
İlk auditdə: "Məlum qiymətlər üzrə məbləğ: 10,949.67 ₼ · 76 sətir · Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb" (`BRIEFS/TASK-04.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (panelin mətni, sözbəsöz):
  - Paneldə göndərən, tarix və ya təsdiqləyən adı (var / yox):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-05 — Task 04: qərar üçün beş fakt çatışmırdı
Mənbə: `BRIEFS/TASK-04.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 11, sitat: "Qərar üçün bunlar çatışmır: sifarişi kim göndərib, nə vaxt, neçənci dəfə (düzəlişdən sonra?), əvvəlki düzəliş qeydi nə idi, kim və nə vaxt təsdiqləyib." · həll edən task: Task 04
Harada: real və sınaq · qərar paneli: sınaqda F-01 … F-06, realda B-04-ün sifarişi · — · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: 1) sınaqda panelin dörd faktı F-01 … F-06-da hər addımda yazılır (`04-sandbox.md`, Sınaq 1, «Hər addımda yazılacaq dörd fakt»; `components/workflow/labels.ts`:71–81); hər fakt üçün onun göründüyü F sətrini və dəyərini köçürün; 2) Excel-dən gəlmiş real sifarişdə faktların uydurulmaması B-04-dədir: B-04-ün hökmünü `Qeyd:`-ə yazın.
Gözlənilən: "Qərar paneli statusu təkrarlamır. Əvəzində bunları göstərir:" "göndərən və göndərmə tarixi;" "neçənci dəfə göndərildiyi (biznes dilində, "Versiya 2" kimi yox);" "əvvəlki düzəliş səbəbi;" "təsdiqləyən və ya qaytaran şəxs və tarix." (`BRIEFS/TASK-04.md`:15–19)
İlk auditdə: "sifarişi kim göndərib, nə vaxt, neçənci dəfə (düzəlişdən sonra?), əvvəlki düzəliş qeydi nə idi, kim və nə vaxt təsdiqləyib" (`BRIEFS/TASK-04.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Göndərən (F sətri və dəyər):
  - Göndərmə tarixi:
  - Neçənci göndəriş:
  - Əvvəlki düzəliş səbəbi:
  - Təsdiqləyən və tarix:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-06 — Task 05: obyekt kodu (LOC-…) — panelin cədvəli
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 8, sitat: "Obyekt kodları görünür: LOC-000043 (panel cədvəli, Obyektlər, mobil kartlar, obyekt səhifəsinin başlığı)." · həll edən task: Task 05
Harada: real · İdarəetmə paneli, «Bütün obyektlər» cədvəli (`pages/ManagementDashboardPage.tsx`:304) · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə panelini açın və «Bütün obyektlər» cədvəlinə enin; 2) brauzerdə `Ctrl+F` ilə `LOC-` axtarın və neçə tapıldığını yazın (axtarış yalnız ekrandakı mətni oxuyur, heç nə dəyişmir); 3) obyekt adının yanında və ya altında hər hansı kod görünürsə, sözbəsöz yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32)
İlk auditdə: "LOC-000043 (panel cədvəli, …)" (`BRIEFS/TASK-05.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (`LOC-` axtarışının nəticəsi və görülən kod):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-07 — Task 05: obyekt kodu (LOC-…) — «Obyektlər»
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 8, sitat: "Obyekt kodları görünür: LOC-000043 (panel cədvəli, Obyektlər, mobil kartlar, obyekt səhifəsinin başlığı)." · həll edən task: Task 05
Harada: real · «Obyektlər» (`pages/LocationsPage.tsx`:70) · `/locations` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-06-nın 2–3-cü addımları, menyuda «Obyektlər»-i açaraq (`layout/navigation.ts`:34).
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32)
İlk auditdə: "LOC-000043 (…, Obyektlər, …)" (`BRIEFS/TASK-05.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (`LOC-` axtarışının nəticəsi və görülən kod):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-08 — Task 05: obyekt kodu (LOC-…) — mobil kartlar
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 8, sitat: "Obyekt kodları görünür: LOC-000043 (panel cədvəli, Obyektlər, mobil kartlar, obyekt səhifəsinin başlığı)." · həll edən task: Task 05
Harada: real · İdarəetmə paneli və «Obyektlər» · `/dashboard`, `/locations` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd); 2) İdarəetmə panelində, sonra «Obyektlər»-də obyekt kartlarına qədər enin və B-06-nın 2–3-cü addımlarını edin; 3) brief ekranın adını vermir: kodu hansı ekranın kartında gördüyünüzü yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32)
İlk auditdə: "LOC-000043 (…, mobil kartlar, …)" (`BRIEFS/TASK-05.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - İdarəetmə paneli, 390 (`LOC-` axtarışı):
  - «Obyektlər», 390 (`LOC-` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-09 — Task 05: obyekt kodu (LOC-…) — obyekt səhifəsinin başlığı
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 8, sitat: "Obyekt kodları görünür: LOC-000043 (panel cədvəli, Obyektlər, mobil kartlar, obyekt səhifəsinin başlığı)." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi, başlıq (`pages/LocationDetailPage.tsx`:139) · `/locations/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «Obyektlər» → «Heydər Əliyev Mərkəzi»; 2) başlığı və onun altındakı sətri sözbəsöz yazın; 3) B-06-nın 2-ci addımı, bu səhifədə.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32)
İlk auditdə: "LOC-000043 (…, obyekt səhifəsinin başlığı)" (`BRIEFS/TASK-05.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (başlıq, sözbəsöz; `LOC-` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-10 — Task 05: məhsul kodu (PRD-…) — sifariş sətirləri
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 9, sitat: "Məhsul kodları görünür: PRD-000110 (sifariş sətirləri)." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Sətirlər» (`pages/OrderDetailPage.tsx`:308–309) · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifariş səhifəsini açın (E-nin girişi, «Sifariş səhifəsini açmaq»); 2) «Sətirlər»-ə enin; 3) `Ctrl+F` ilə `PRD-` axtarın və neçə tapıldığını yazın; 4) məhsul adının yanında və ya altında kod görünürsə, sözbəsöz yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32)
İlk auditdə: "PRD-000110 (sifariş sətirləri)" (`BRIEFS/TASK-05.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (`PRD-` axtarışının nəticəsi və görülən kod):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-11 — Task 05: "Versiya 1" — sifarişin başlığı
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 10, sitat: ""Versiya 1" sifariş başlığında və obyekt səhifəsinin cədvəlində; "Sətir sayı" sütunu." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, başlıq (`pages/OrderDetailPage.tsx`:188–195) · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsi; 2) səhifənin başlığını və altındakı sətri sözbəsöz yazın; 3) `Ctrl+F` ilə `Versiya` axtarın və tapılan yerləri yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: …" (`BRIEFS/TASK-05.md`:32); "Rəhbər ekranında texniki "Versiya" sözü göstərilmir (Task 5). Versiya məlumatı qərar panelində biznes dilində verilir." (`BRIEFS/TASK-04.md`:28)
İlk auditdə: ""Versiya 1" sifariş başlığında" (`BRIEFS/TASK-05.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (başlıq, sözbəsöz; `Versiya` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-12 — Task 05: "Versiya 1" — obyekt səhifəsinin cədvəli
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 10, sitat: ""Versiya 1" sifariş başlığında və obyekt səhifəsinin cədvəlində; "Sətir sayı" sütunu." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi, sifarişlər cədvəli · `/locations/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-09-un səhifəsi; 2) sifarişlər cədvəlinin sütun başlıqlarını sırası ilə yazın (koddan: «Dövr», «Məbləğ», «Status» və adsız sütun — `pages/LocationDetailPage.tsx`:264–268); 3) `Ctrl+F` ilə `Versiya` axtarın və tapılan yerləri yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: …" (`BRIEFS/TASK-05.md`:32)
İlk auditdə: ""Versiya 1" … obyekt səhifəsinin cədvəlində" (`BRIEFS/TASK-05.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (sütun başlıqları; `Versiya` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-13 — Task 05: "Sətir sayı" sütunu
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 10, sitat: ""Versiya 1" sifariş başlığında və obyekt səhifəsinin cədvəlində; "Sətir sayı" sütunu." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi və Sentyabr 2026 sifarişi · `/locations/<nömrə>`, `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) brief sütunun hansı ekranda olduğunu demir: B-12-nin cədvəlində və B-10-un səhifəsində `Ctrl+F` ilə `Sətir sayı` axtarın; 2) tapılan hər yeri ekranın adı ilə yazın.
Gözlənilən: "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: …" (`BRIEFS/TASK-05.md`:32)
İlk auditdə: ""Sətir sayı" sütunu" (`BRIEFS/TASK-05.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Obyekt səhifəsi (`Sətir sayı` axtarışı):
  - Sifariş səhifəsi (`Sətir sayı` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-14 — Task 05: "Server işləyir" başlıqda
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 11, sitat: ""Server işləyir" yazısı başlıqda daim durur." · həll edən task: Task 05
Harada: real · auditin bütün ekranlarının yuxarı başlığı · — · bütün enlər
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) auditin gedişində hər ekranın yuxarı başlığına baxın; 2) «Server işləyir» görünən hər ekranı yazın; 3) başlıqda serverlə bağlı başqa yazı görsəniz, onu sözbəsöz və ekranı ilə yazın. Koddan: başlıq yalnız server əlçatan olmayanda «Server əlçatan deyil» yazır, qalan vaxt heç nə yazmır (`layout/Header.tsx`:33–50).
Gözlənilən: ""Server işləyir" yalnız problem olanda görünür." (`BRIEFS/TASK-05.md`:33)
İlk auditdə: ""Server işləyir" yazısı başlıqda daim durur." (`BRIEFS/TASK-05.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (başlıqdakı server yazısı; yoxdursa «heç yerdə»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-15 — Task 05: məhsul adının altında "2.8" (Rosmarinus)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 12, sitat: "Məhsul adının altında mənası bilinməyən kodlar var: "2.8" (Rosmarinus), "20078331" (Columbus 80 BM 100 Şotka), "M-101-S-2" (Yay ayaqqabısı)." · həll edən task: Task 05
Harada: real · məhsulun olduğu Sentyabr 2026 sifarişi: brief sifarişi demir · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) açdığınız Sentyabr 2026 sifarişlərində (Heydər Əliyev Mərkəzi, Fəvvarələr meydanı, Nərimanov heykəli və başqaları) `Ctrl+F` ilə `Rosmarinus` axtarın, «Sətirlər»-də və «Əsas dəyişikliklər»-də; 2) tapsanız, sifarişi (obyekt və dövr) və məhsul adının altındakı yazını sözbəsöz yazın; 3) heç bir sifarişdə tapmasanız, `Hökm:`-ə «yoxlanıla bilmədi (mal tapılmadı)» yazın və baxdığınız sifarişləri `Qeyd:`-ə yazın.
Gözlənilən: "Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir." (`BRIEFS/TASK-05.md`:36)
İlk auditdə: ""2.8" (Rosmarinus)" (`BRIEFS/TASK-05.md`:12)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (adın altındakı yazı, sözbəsöz):
  - Sifariş (obyekt və dövr):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-16 — Task 05: məhsul adının altında "20078331" (Columbus 80 BM 100 Şotka)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 12, sitat: "Məhsul adının altında mənası bilinməyən kodlar var: "2.8" (Rosmarinus), "20078331" (Columbus 80 BM 100 Şotka), "M-101-S-2" (Yay ayaqqabısı)." · həll edən task: Task 05
Harada: real · məhsulun olduğu Sentyabr 2026 sifarişi: brief sifarişi demir · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-15-in 1–3-cü addımları, `Columbus` axtarışı ilə; sonra həmin səhifədə `20078331` axtarın.
Gözlənilən: "Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir." (`BRIEFS/TASK-05.md`:36)
İlk auditdə: ""20078331" (Columbus 80 BM 100 Şotka)" (`BRIEFS/TASK-05.md`:12)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (adın altındakı yazı, sözbəsöz):
  - Sifariş (obyekt və dövr):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-17 — Task 05: məhsul adının altında "M-101-S-2" (Yay ayaqqabısı)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Texniki məlumat», sətir 12, sitat: "Məhsul adının altında mənası bilinməyən kodlar var: "2.8" (Rosmarinus), "20078331" (Columbus 80 BM 100 Şotka), "M-101-S-2" (Yay ayaqqabısı)." · həll edən task: Task 05
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Əsas dəyişikliklər» (`components/decisions/DriverList.tsx`:78) · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifariş səhifəsini açın (E-nin girişi), «Keçən ay»; 2) Yay ayaqqabısı bu sifarişdədir, "71 → 0 ədəd" (`BRIEFS/TASK-07.md`:10): «Əsas dəyişikliklər»-də «Bu ay yazılmayan məhsullar» düyməsini basın (`components/decisions/labels.ts`:131) və «Yay ayaqqabısı» sətrini tapın; 3) adın altındakı yazını sözbəsöz yazın; 4) `Ctrl+F` ilə `M-101-S-2` axtarın.
Gözlənilən: "Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir." (`BRIEFS/TASK-05.md`:36)
İlk auditdə: ""M-101-S-2" (Yay ayaqqabısı)" (`BRIEFS/TASK-05.md`:12)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (adın altındakı yazı, sözbəsöz; `M-101-S-2` axtarışı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-18 — Task 05: vahid ingiliscə — PCS
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Əsas dəyişikliklər»; başqa vahidlər üçün vahidin olduğu istənilən sifariş · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) bu vahidli bir sətir tapın: PCS üçün Fəvvarələr meydanının «Yay ayaqqabısı» sətri, "71 → 0" (`BRIEFS/TASK-05.md`:69; B-17-nin 2-ci addımı); 2) sətirdə miqdarın yanındakı vahid sözünü sözbəsöz yazın — «Əsas dəyişikliklər»-in yığcam sətrində (`components/decisions/DriverList.tsx`:207–231) və ya «Sətirlər»-də (`pages/OrderDetailPage.tsx`:308–309); 3) `Ctrl+F` ilə vahidin ingiliscə kodunu (burada `PCS`) axtarın və rəqəmdən sonra gəldiyi yeri yazın; 4) bu vahidli sətir tapmasanız, `Hökm:`-ə «yoxlanıla bilmədi (bu vahidli sətir tapılmadı)» yazın və baxdığınız sifarişləri `Qeyd:`-ə yazın. Koddan: kod ekranda Azərbaycan sözü ilə göstərilir (`terminology/units.ts`:8–16).
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — PCS üçün «ədəd» (`terminology/units.ts`:9); "Fəvvarələr sifarişində "71 → 0 PCS" əvəzinə "71 → 0 ədəd" … görürəm." (`BRIEFS/TASK-05.md`:69)
İlk auditdə: "Vahidlər ingiliscədir: PCS, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-19 — Task 05: vahid ingiliscə — BAG
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi BAG olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, BAG üçün: brief sifarişi demir; kisə ilə gələn malı Heydər Əliyev Mərkəzi, Fəvvarələr meydanı və Nərimanov heykəlinin Sentyabr sifarişlərində axtarın, axtarışda `BAG` və `kisə` yazın.
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — BAG üçün «kisə» (`terminology/units.ts`:10)
İlk auditdə: "Vahidlər ingiliscədir: …, BAG, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-20 — Task 05: vahid ingiliscə — PACK
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi PACK olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, PACK üçün; axtarışda `PACK` və `paket` yazın.
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — PACK üçün «paket» (`terminology/units.ts`:11)
İlk auditdə: "Vahidlər ingiliscədir: …, PACK, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-21 — Task 05: vahid ingiliscə — PAIR
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi PAIR olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, PAIR üçün; axtarışda `PAIR` və `cüt` yazın.
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — PAIR üçün «cüt» (`terminology/units.ts`:12)
İlk auditdə: "Vahidlər ingiliscədir: …, PAIR, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-22 — Task 05: vahid ingiliscə — ROLL
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi ROLL olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, ROLL üçün; axtarışda `ROLL` və `rulon` yazın.
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — ROLL üçün «rulon» (`terminology/units.ts`:13)
İlk auditdə: "Vahidlər ingiliscədir: …, ROLL, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-23 — Task 05: vahid ingiliscə — L
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi L olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, L üçün; axtarışda `litr` yazın. Tək `L` hərfi axtarışda çox yerdə tapılır: miqdarın yanındakı vahidə gözlə baxın. Məhsulun adındakı "5 L" kimi spesifikasiya vahid deyil və qala bilər (`BRIEFS/TASK-05.md`:36).
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — L üçün «litr» (`terminology/units.ts`:14)
İlk auditdə: "Vahidlər ingiliscədir: …, L, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-24 — Task 05: vahid ingiliscə — M2
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Əsas dəyişikliklər»; və ya vahidi M2 olan başqa sətir · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, M2 üçün: «Mərmər bej qalınlığı 2 sm» sətri Nərimanov heykəlinin sifarişindədir, "7.36 → 0 m²" (`BRIEFS/TASK-07.md`:11), «Bu ay yazılmayan məhsullar» düyməsi altında; axtarışda `M2` və `m²` yazın.
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — M2 üçün «m²» (`terminology/units.ts`:15)
İlk auditdə: "Vahidlər ingiliscədir: …, M2, …" (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-25 — Task 05: vahid ingiliscə — KG
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 15, sitat: "Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG." · həll edən task: Task 05
Harada: real · vahidi KG olan sətri olan istənilən Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-18-in 1–4-cü addımları, KG üçün; axtarışda `KG` və `kq` yazın. Məhsulun adındakı "50 kq" kimi spesifikasiya qala bilər (`BRIEFS/TASK-05.md`:36).
Gözlənilən: "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34) — KG üçün «kq» (`terminology/units.ts`:16)
İlk auditdə: "Vahidlər ingiliscədir: …, KG." (`BRIEFS/TASK-05.md`:15)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (vahid sözü, sözbəsöz):
  - Sifariş və sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-26 — Task 05: məbləğ ₼-dan ayrılır — 1366, sifariş sətirləri
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 16, sitat: "Məbləğ ₼-dan ayrılıb aşağı sətrə düşür: 1366-da sifariş sətirlərində "99.00 / ₼", mobildə "431,670.91 / ₼"." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Sətirlər» (brief sifarişi demir) · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsində «Sətirlər»-ə enin; 2) qiymət və məbləğ sütunlarında hər rəqəmin ₼ ilə eyni sətirdə olub-olmadığına baxın, sona qədər; 3) ₼ aşağı sətrə düşən hər halı məhsulun adı və rəqəmi ilə yazın. Koddan: ₼ rəqəmə qırılmayan boşluqla bağlanır (`components/analytics/format.ts`:20, 243–245).
Gözlənilən: "Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir." (`BRIEFS/TASK-05.md`:35)
İlk auditdə: "1366-da sifariş sətirlərində "99.00 / ₼"" (`BRIEFS/TASK-05.md`:16)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (₼-dan ayrılan məbləğlər; yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-27 — Task 05: məbləğ ₼-dan ayrılır — telefon
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 16, sitat: "Məbləğ ₼-dan ayrılıb aşağı sətrə düşür: 1366-da sifariş sətirlərində "99.00 / ₼", mobildə "431,670.91 / ₼"." · həll edən task: Task 05
Harada: real · «Aylıq hesabat» və İdarəetmə paneli · `/dashboard/monthly`, `/dashboard` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin; 2) «Aylıq hesabat»-ı açın: 431,670.91 ilin cəmidir (`BRIEFS/TASK-08.md`:46); onu və cəmi sətrinin/kartının məbləğlərini tapın və ₼-ın rəqəmlə eyni sətirdə olub-olmadığını yazın; 3) İdarəetmə panelində başlığın, kartların və obyekt kartlarının məbləğlərində eyni şeyə baxın; 4) ₼ aşağı sətrə düşən hər halı ekranı və rəqəmi ilə yazın; 5) H-19-un (panel, 390) və H-21-in (hesabat, 390) hökmlərini köçürün.
Gözlənilən: "Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir." (`BRIEFS/TASK-05.md`:35); "1366-da və telefonda heç bir məbləğ ₼-dan ayrılmır." (`BRIEFS/TASK-05.md`:70)
İlk auditdə: "mobildə "431,670.91 / ₼"" (`BRIEFS/TASK-05.md`:16)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Aylıq hesabat, 390 (ilin cəmi və ₼-dan ayrılan məbləğlər):
  - İdarəetmə paneli, 390 (₼-dan ayrılan məbləğlər):
  - H-19-un hökmü:
  - H-21-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-28 — Task 05: qiymət 4 onluqla — "32.1273 ₼" (Zibil paketi)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Vahidlər və format», sətir 17, sitat: "Qiymət 4 onluqla göstərilir: "32.1273 ₼" (Zibil paketi)." · həll edən task: Task 05
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Fəvvarələr meydanının Sentyabr 2026 sifarişini açın (`BRIEFS/TASK-05.md`:69); 2) `Ctrl+F` ilə `Zibil paketi` axtarın, «Sətirlər»-də və «Əsas dəyişikliklər»-də; 3) onun qiymətini ekrandakı kimi yazın, onluqların sayı ilə; 4) səhifədə vergüldən sonra 3 və ya 4 rəqəmli başqa qiymət görsəniz, onu da yazın. Koddan: qiymət ekranda 2 onluğa yuvarlaqlaşdırılır (`components/analytics/format.ts`:247–253).
Gözlənilən: "Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir." (`BRIEFS/TASK-05.md`:35); "Fəvvarələr sifarişində … "32.1273 ₼" əvəzinə 2 onluqlu qiymət görürəm." (`BRIEFS/TASK-05.md`:69). Yuvarlaqlaşdırılmış rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: ""32.1273 ₼" (Zibil paketi)" (`BRIEFS/TASK-05.md`:17)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (Zibil paketinin qiyməti, ekrandakı kimi):
  - 2-dən çox onluqlu başqa qiymət (yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-29 — Task 05: köhnə termin "Yeni sifarişlər"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · `/dashboard`, `/orders/<nömrə>`, `/locations/<nömrə>`, `/dashboard/monthly`, «Məhsul tarixçəsi» · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) beş ekranı növbə ilə açın: İdarəetmə paneli; Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi (E-nin girişi); onun obyekt səhifəsi («Obyektlər» → «Heydər Əliyev Mərkəzi»); «Aylıq hesabat»; həmin sifarişdə «Əsas dəyişikliklər»-in birinci sətrini basanda açılan «Məhsul tarixçəsi» pəncərəsi (`components/decisions/DriverList.tsx`:117–122); 2) hər ekranda `Ctrl+F` ilə köhnə sözü axtarın — burada `Yeni sifarişlər`; 3) köhnə sözün tapıldığı ekranları yazın, heç birində yoxdursa «heç yerdə»; 4) yeni sözün — burada «Yeni məhsullar» (`terminology/terms.ts`:14) — göründüyü yeri ekranı və bölməsi ilə yazın.
Gözlənilən: "| Yeni sifarişlər | Yeni məhsullar |" (qərar 5.1, `BRIEFS/TASK-05.md`:43); "Bütün tətbiqdə təsdiqlənmiş söz siyahısı işlənir; eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Yeni sifarişlər"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-30 — Task 05: köhnə termin "Artıq sifariş olunmayanlar"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `Artıq sifariş`, yeni söz «Bu ay yazılmayan məhsullar» (`terminology/terms.ts`:20).
Gözlənilən: "| Artıq sifariş olunmayanlar / Artıq sifariş olunmur | Bu ay yazılmayan məhsullar |" (qərar 5.1, `BRIEFS/TASK-05.md`:44); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Artıq sifariş olunmayanlar"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-31 — Task 05: köhnə termin "mövqe"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `mövqe`, yeni söz «məhsul» (`terminology/terms.ts`:23).
Gözlənilən: "| mövqe | məhsul |" (qərar 5.1, `BRIEFS/TASK-05.md`:45); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""mövqe"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-32 — Task 05: köhnə termin "Məlum qiymətlər üzrə məbləğ / cəm"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `Məlum`, yeni söz «Qiyməti olan sətirlərin cəmi» (`terminology/terms.ts`:32); koddan: obyekt səhifəsinin «Bütün tarixçə» sətrində işlənir (`pages/LocationDetailPage.tsx`:190).
Gözlənilən: "| Məlum qiymətlər üzrə məbləğ / cəm | Qiyməti olan sətirlərin cəmi (və ya gizlət) |" (qərar 5.1, `BRIEFS/TASK-05.md`:46); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Məlum qiymətlər üzrə məbləğ / cəm"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-33 — Task 05: köhnə termin "Çəkili orta qiymət"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `Çəkili`, yeni söz «Orta qiymət» (`terminology/terms.ts`:35); koddan: «Məhsul tarixçəsi» pəncərəsinin sütunudur (`components/analytics/trend.ts`:25; `components/analytics/TrendModal.tsx`:159).
Gözlənilən: "| Çəkili orta qiymət | Orta qiymət |" (qərar 5.1, `BRIEFS/TASK-05.md`:47); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Çəkili orta qiymət"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-34 — Task 05: köhnə termin "Tarixçə natamam"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `natamam`, yeni söz «Müqayisə üçün data azdır» (`terminology/terms.ts`:38); koddan: paneldə çipin və cədvəlin sözüdür (`coverage/labels.ts`:199; `components/dashboard/labels.ts`:228). Çip yalnız sayı sıfırdan böyük olanda görünür (`components/dashboard/DashboardSummary.tsx`:215): başqa bazada da baxa bilərsiniz, amma sonra «Keçən ay»-a qayıdın.
Gözlənilən: "| Tarixçə natamam | Müqayisə üçün data azdır |" (qərar 5.1, `BRIEFS/TASK-05.md`:48); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Tarixçə natamam"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-35 — Task 05: köhnə termin "Son 9 mövcud aydan 3-də"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `mövcud aydan`, yeni söz «Son N ayın M-də sifariş edilib» (`components/analytics/trend.ts`:58–69). Pəncərənin tezlik sətri E-25-də sözbəsöz yazılır: E-25-in hökmünü də köçürün.
Gözlənilən: "| Son 9 mövcud aydan 3-də | Son 9 ayın 3-də sifariş edilib |" (qərar 5.1, `BRIEFS/TASK-05.md`:49); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür. Bu məhsulun rəqəmlərini brief vermir (brief rəqəm vermir).
İlk auditdə: ""Son 9 mövcud aydan 3-də"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
  - E-25-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-36 — Task 05: köhnə termin "Trend"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Köhnə və qeyri-dəqiq terminlər», sətir 19, sitat: "**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend"." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–4-cü addımları: köhnə söz `Trend`, yeni söz «Məhsul tarixçəsi» (`terminology/terms.ts`:41); koddan: pəncərənin başlığıdır (`components/analytics/TrendModal.tsx`:115).
Gözlənilən: "| Trend | Məhsul tarixçəsi |" (qərar 5.1, `BRIEFS/TASK-05.md`:50); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31). Köhnə söz beş ekranın heç birində görünmür.
İlk auditdə: ""Trend"" (`BRIEFS/TASK-05.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Yeni söz görülən yer:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-37 — Task 05: "Bütün dövr" (düymə) və "Bütün dövrün ortalaması" (nəticə mətni)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 22, sitat: ""Bütün dövr" (düymə) və "Bütün dövrün ortalaması" (nəticə mətni)." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, baza seçicisi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsi; 2) baza seçicisinin (`components/analytics/BasisPicker.tsx`:69–83) dördüncü düyməsinin yazısını sözbəsöz yazın (koddan: «Bütün dövrün ortalaması» — `components/analytics/format.ts`:41; `terminology/terms.ts`:44); 3) həmin düyməni basın və seçicinin altındakı «Müqayisə: …» cümləsini sözbəsöz yazın (`components/decisions/DecisionHeadline.tsx`:115); 4) seçicidə yenə «Keçən ay»-ı basın. Baza seçmək heç nə yazmır: baza ünvanda saxlanır (`analytics/basisParams.ts`:145).
Gözlənilən: "Bütün tətbiqdə təsdiqlənmiş söz siyahısı işlənir; eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31): düymə və cümlə eyni adı daşıyır.
İlk auditdə: ""Bütün dövr" (düymə) və "Bütün dövrün ortalaması" (nəticə mətni)" (`BRIEFS/TASK-05.md`:22)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Düymənin yazısı:
  - Cümlənin yazısı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-38 — Task 05: "Artıq sifariş olunmur" (filtr) və "Artıq sifariş olunmayanlar" (nişan)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 23, sitat: ""Artıq sifariş olunmur" (filtr) və "Artıq sifariş olunmayanlar" (nişan)." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Əsas dəyişikliklər» (`components/decisions/DriverList.tsx`:78) · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsi, «Keçən ay»; 2) «Əsas dəyişikliklər»-in filtr düymələrini sırası ilə sözbəsöz yazın (`DriverList.tsx`:83–106); 3) bu ay yazılmayan məhsulların düyməsini basın və birinci sətrin nişanını (sətirdəki etiketi) sözbəsöz yazın (`DriverList.tsx`:242–252); 4) `Ctrl+F` ilə `Artıq sifariş` axtarın. Koddan: filtr «Bu ay yazılmayan məhsullar»-dır (`components/decisions/labels.ts`:131); nişan səbəbin adıdır, bu məhsullarda «Bu ay yazılmayan məhsullar» (`labels.ts`:17).
Gözlənilən: "| Artıq sifariş olunmayanlar / Artıq sifariş olunmur | Bu ay yazılmayan məhsullar |" (qərar 5.1, `BRIEFS/TASK-05.md`:44); "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31)
İlk auditdə: ""Artıq sifariş olunmur" (filtr) və "Artıq sifariş olunmayanlar" (nişan)" (`BRIEFS/TASK-05.md`:23)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Filtrin yazısı:
  - Nişanın yazısı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-39 — Task 05: "Qiyməti olmayanlar" («Niyə dəyişib?») və "Qiymət yoxdur" (sətir)
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 24, sitat: ""Qiyməti olmayanlar" ("Niyə dəyişib?" hissəsi) və "Qiymət yoxdur" (sətir)." · həll edən task: Task 05
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Niyə dəyişib?» və «Sətirlər» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Nərimanov heykəlinin Sentyabr 2026 sifarişini açın (E-16-nın səhifəsi), «Keçən ay»; 2) «Niyə dəyişib?» bölməsində (`components/decisions/CauseSummary.tsx`:68) qiyməti olmayan sətirlərin hissəsinin adını sözbəsöz yazın; belə hissə yoxdursa, «hissə yoxdur» yazın; 3) «Sətirlər»-də qiyməti olmayan sətrin qiymət yerindəki yazını sözbəsöz yazın; 4) `Ctrl+F` ilə `Qiyməti olmayanlar` axtarın. Koddan: hissənin də, sətrin də sözü «Qiymət yoxdur»-dur (`components/decisions/labels.ts`:21; `pricing/labels.ts`:183). E-16-nın hökmünü də köçürün.
Gözlənilən: "Bütün tətbiqdə təsdiqlənmiş söz siyahısı işlənir; eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31); Task 2-nin dəyişməyən sözü: ""Qiymət yoxdur" (kəhrəba)" (`BRIEFS/TASK-05.md`:53)
İlk auditdə: ""Qiyməti olmayanlar" ("Niyə dəyişib?" hissəsi) və "Qiymət yoxdur" (sətir)" (`BRIEFS/TASK-05.md`:24)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - «Niyə dəyişib?»-dəki hissənin adı:
  - Sətirdəki yazı:
  - E-16-nın hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-40 — Task 05: Nərimanov heykəli obyekt səhifəsi — "məhsul" və "sətir"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 25, sitat: "Nərimanov heykəli obyekt səhifəsi: başlıqda "1 məhsulun qiyməti yoxdur", cədvəldə "1 sətirdə qiymət yoxdur"." · həll edən task: Task 05
Harada: real · Nərimanov heykəlinin obyekt səhifəsi · `/locations/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «Obyektlər» → «Nərimanov heykəli» (E-15-in səhifəsi); 2) səhifənin yuxarı hissəsində qiyməti olmayan sətirlər barədə yazını sözbəsöz yazın — koddan: «Bütün tarixçə (…):» sətrində «Qiymət yoxdur» və say (`pages/LocationDetailPage.tsx`:180–197; `pricing/labels.ts`:183); 3) sifarişlər cədvəlinin Sentyabr 2026 sətrində məbləğin altındakı yazını sözbəsöz yazın — koddan: «N sətirdə qiymət yoxdur» (`LocationDetailPage.tsx`:300–303; `pricing/labels.ts`:118–119); 4) `Ctrl+F` ilə `məhsulun qiyməti` axtarın. E-15-in hökmünü də köçürün.
Gözlənilən: "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31); Task 2-nin dəyişməyən sözü: ""N sətirdə qiymət yoxdur"" (`BRIEFS/TASK-05.md`:53). Sayı brief bu gün üçün vermir (brief rəqəm vermir).
İlk auditdə: "başlıqda "1 məhsulun qiyməti yoxdur", cədvəldə "1 sətirdə qiymət yoxdur"" (`BRIEFS/TASK-05.md`:25)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Yuxarı hissədəki yazı:
  - Cədvəldəki yazı:
  - E-15-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-41 — Task 05: sifarişin başlığında "sətir" iki dəfə
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 26, sitat: "Sifariş başlığında "40 sətir · 2 sətirdə qiymət yoxdur": "sətir" iki dəfə işlənir." · həll edən task: Task 05
Harada: real · Heydər Əliyev Mərkəzi, Fəvvarələr meydanı və Nərimanov heykəlinin Sentyabr 2026 sifarişləri, başlıq · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) brief sifarişi demir: üç sifarişin hər birini açın; 2) başlıqda məbləğin altındakı sətri sözbəsöz yazın (`components/decisions/DecisionHeadline.tsx`:68–102); 3) sətirdə "sətir" sözünün neçə dəfə işləndiyini yazın. Koddan: başlıq sətir sayı ilə başlamır, yalnız qiyməti olmayan və daxili təminat sətirlərini sayır (`DecisionHeadline.tsx`:73–102).
Gözlənilən: "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31); Task 2-nin dəyişməyən sözləri: ""N sətirdə qiymət yoxdur", "N sətir daxili təminat (ödənişsiz)"" (`BRIEFS/TASK-05.md`:53). Sayları brief bu gün üçün vermir (brief rəqəm vermir).
İlk auditdə: ""40 sətir · 2 sətirdə qiymət yoxdur": "sətir" iki dəfə işlənir" (`BRIEFS/TASK-05.md`:26)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Heydər Əliyev Mərkəzi — başlıqdakı sətir:
  - Fəvvarələr meydanı — başlıqdakı sətir:
  - Nərimanov heykəli — başlıqdakı sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-42 — Task 05: köhnə ifadə "qiymətsiz sifarişlər"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 27, sitat: "Bəzi xülasələrdə köhnə "qiymətsiz sifarişlər" ifadəsi qalıb." · həll edən task: Task 05
Harada: real · beş ekran (bölmənin girişi) · B-29 ilə eyni · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-29-un 1–3-cü addımları, `qiymətsiz` axtarışı ilə; 4) qiyməti olmayan sətirləri xülasədə hansı sözlərin dediyini, ekranı ilə yazın (məsələn paneldə `coverage/labels.ts`:189–196).
Gözlənilən: "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31); Task 1b-nin dəyişməyən sözləri: ""Qiymət yoxdur · N obyekt", "10 obyektin sifarişində qiyməti olmayan sətir var"" (`BRIEFS/TASK-05.md`:54)
İlk auditdə: "köhnə "qiymətsiz sifarişlər" ifadəsi qalıb" (`BRIEFS/TASK-05.md`:27)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Köhnə söz görülən ekranlar (yoxdursa «heç yerdə»):
  - Xülasənin sözləri (ekran və söz):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-43 — Task 05: diqqət kartlarında "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır"
Mənbə: `BRIEFS/TASK-05.md`, «Auditdə müşahidə edilən hazırkı problem» — «Eyni anlayış üçün fərqli sözlər», sətir 28, sitat: "Diqqət kartlarındakı cümlə: "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır" (Task 2-dən sonra hələ qalıbsa)." · həll edən task: Task 05; kartlarda xəbərdarlığın təkrarı və çəkisi Task 09 (`BRIEFS/TASK-05.md`:63)
Harada: real · İdarəetmə paneli, diqqət kartları (`components/dashboard/AttentionSection.tsx`:61) · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə panelini açın, «Keçən ay»; 2) hər diqqət kartında qiymət xəbərdarlığı nə şəkildə görünür, yazın: cümlə, yoxsa məbləğin yanında qısa işarə və say (⚠ N); 3) `Ctrl+F` ilə `qiymət məlumatı` və `izah edilə bilmir` axtarın; 4) işarənin üzərinə gəlin və çıxan yazını sözbəsöz yazın. Koddan: kartda işarə «⚠ N»-dir, cümlə yalnız işarənin üzərinə gələndə çıxır (`components/dashboard/MissingPriceMark.tsx`:4–11, 22–30; `terminology/terms.ts`:50).
Gözlənilən: "eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31); "Qiymət xəbərdarlığı kartda qısa işarə və say ilə verilir, hər kartda cümlə kimi təkrarlanmır." (`BRIEFS/TASK-09.md`:26)
İlk auditdə: "Diqqət kartlarındakı cümlə: "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır"" (`BRIEFS/TASK-05.md`:28)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kartlarda xəbərdarlığın şəkli (cümlə / işarə və say):
  - İşarənin üzərinə gələndə çıxan yazı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-44 — Task 06: hissələrin sırası sabit idi; Fəvvarələrdə əsas səbəb 4-cü sətirdə
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 7, sitat: "Hissələrin sırası sabitdir (Yeni, Miqdar, Qiymət, Artıq, Xidmətlər), böyüklüyə görə deyil. Fəvvarələr meydanında (Sentyabr 2026, Keçən ay) əsas səbəb, "Artıq sifariş olunmayanlar −8,093.70 ₼", dördüncü sətirdədir." · həll edən task: Task 06
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: hissələr E-09-da səhifədəki sırası ilə, adı və məbləği ilə yazılır (`components/decisions/CauseSummary.tsx`:46–51, 83–97). Onları buraya eyni sıra ilə köçürün. Brief-in hissə adları ekranda başqa cür yazılır: «Brief-in sözləri və ekranın sözləri».
Gözlənilən: "Hissələr mütləq böyüklüyə görə sıralanır; ən böyüyü birinci və seçilmiş görünür." (`BRIEFS/TASK-06.md`:14); "Fəvvarələr sifarişində birinci sətir "Bu ay yazılmayan məhsullar −8,093.70 ₼"-dır …" (`BRIEFS/TASK-06.md`:38)
İlk auditdə: "Hissələrin sırası sabitdir (Yeni, Miqdar, Qiymət, Artıq, Xidmətlər) … əsas səbəb, "Artıq sifariş olunmayanlar −8,093.70 ₼", dördüncü sətirdədir." (`BRIEFS/TASK-06.md`:7)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - 1-ci hissə (ad və məbləğ):
  - 2-ci hissə:
  - 3-cü hissə:
  - 4-cü hissə:
  - 5-ci hissə:
  - 6-cı hissə (varsa):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-45 — Task 06: əsas səbəb vurğulanmır
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 8, sitat: "Əsas səbəb vurğulanmır; bütün sətirlər eyni çəkidədir." · həll edən task: Task 06
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-44-ün səhifəsi; 2) «Əsas səbəb» yazısının hansı hissənin üstündə olduğunu yazın (`components/decisions/CauseSummary.tsx`:128); 3) o hissə digərlərindən necə seçilir, yazın: çərçivə, yazının ölçüsü, zolağın qalınlığı (koddan: `CauseSummary.tsx`:125–133, 146, 173).
Gözlənilən: "Hissələr mütləq böyüklüyə görə sıralanır; ən böyüyü birinci və seçilmiş görünür." (`BRIEFS/TASK-06.md`:14)
İlk auditdə: "Əsas səbəb vurğulanmır; bütün sətirlər eyni çəkidədir." (`BRIEFS/TASK-06.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - «Əsas səbəb» yazılan hissə:
  - Digərlərindən necə seçilir:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-46 — Task 06: mənfi zolaq boz idi — Fəvvarələr −8,093.70
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 9, sitat: "Mənfi zolaq boz rəngdədir, ona görə əsas səbəb görsənmir (Fəvvarələr −8,093.70; Nərimanov heykəli −1,601.06)." · həll edən task: Task 06
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-44-ün səhifəsi; 2) bu ay yazılmayan məhsulların hissəsinin (brief-də −8,093.70) zolağının rəngini yazın; 3) artan (müsbət) bir hissənin zolağının rəngini yazın; 4) bölmə başlığının altındakı istiqamət yazısını sözbəsöz yazın (`components/decisions/CauseSummary.tsx`:80). Koddan: zolaq xərcin istiqamətinə görə rənglənir (`CauseSummary.tsx`:173–175).
Gözlənilən: "Bütün zolaqlar xərcin istiqamətinə görə rənglənir: artım qırmızı, azalma yaşıl (9.1)." (`BRIEFS/TASK-06.md`:15)
İlk auditdə: "Mənfi zolaq boz rəngdədir … (Fəvvarələr −8,093.70; …)" (`BRIEFS/TASK-06.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (azalan hissənin zolağının rəngi və məbləği):
  - Artan hissənin zolağının rəngi:
  - İstiqamət yazısı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-47 — Task 06: mənfi zolaq boz idi — Nərimanov heykəli −1,601.06
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 9, sitat: "Mənfi zolaq boz rəngdədir, ona görə əsas səbəb görsənmir (Fəvvarələr −8,093.70; Nərimanov heykəli −1,601.06)." · həll edən task: Task 06
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-46-nın 2–4-cü addımları, Nərimanov heykəlinin Sentyabr 2026 sifarişində (E-11-in səhifəsi); azalan hissə brief-də −1,601.06-dır.
Gözlənilən: "Bütün zolaqlar xərcin istiqamətinə görə rənglənir: artım qırmızı, azalma yaşıl (9.1)." (`BRIEFS/TASK-06.md`:15)
İlk auditdə: "Mənfi zolaq boz rəngdədir … (…; Nərimanov heykəli −1,601.06)." (`BRIEFS/TASK-06.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (azalan hissənin zolağının rəngi və məbləği):
  - Artan hissənin zolağının rəngi (varsa):
  - İstiqamət yazısı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-48 — Task 06: cəm tam tutduğu halda xəbərdarlıq — Fəvvarələr
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10, sitat: "Xəbərdarlıq hesabla ziddiyyət təşkil edir. Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." · həll edən task: Task 06
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: bölmənin altındakı xəbərdarlıq və hissələrin cəmi E-09-da yazılır. E-09-un xəbərdarlıq sətrini və hökmünü buraya köçürün. Koddan: xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və həmin məhsulların adını deyir (`components/decisions/CauseSummary.tsx`:55–62, 100–104; `terminology/terms.ts`:63–74).
Gözlənilən: "Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:16); "Hissələr cəmə tam bərabər olanda ziddiyyətli xəbərdarlıq görmürəm. Qiymətsiz sətir olanda xəbərdarlıq nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:40)
İlk auditdə: "Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (xəbərdarlıq sözbəsöz; yoxdursa «yoxdur»):
  - E-09-un hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-49 — Task 06: cəm tam tutduğu halda xəbərdarlıq — Heydər Əliyev Mərkəzi
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10, sitat: "Xəbərdarlıq hesabla ziddiyyət təşkil edir. Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." · həll edən task: Task 06
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: E-07-nin xəbərdarlıq sətrini və hökmünü buraya köçürün. Koddan: B-48 ilə eyni.
Gözlənilən: "Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:16); "Hissələr cəmə tam bərabər olanda ziddiyyətli xəbərdarlıq görmürəm. Qiymətsiz sətir olanda xəbərdarlıq nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:40)
İlk auditdə: "amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (xəbərdarlıq sözbəsöz; yoxdursa «yoxdur»):
  - E-07-nin hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-50 — Task 06: cəm tam tutduğu halda xəbərdarlıq — Nərimanov heykəli
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10, sitat: "Xəbərdarlıq hesabla ziddiyyət təşkil edir. Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." · həll edən task: Task 06
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: E-11-in xəbərdarlıq sətrini və hökmünü buraya köçürün. Bu sifarişdə qiyməti olmayan sətir var (E-16): xəbərdarlıq çıxırsa, onun məhsulun adını deyib-demədiyini yazın. Koddan: B-48 ilə eyni.
Gözlənilən: "Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:16); "Hissələr cəmə tam bərabər olanda ziddiyyətli xəbərdarlıq görmürəm. Qiymətsiz sətir olanda xəbərdarlıq nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:40)
İlk auditdə: "amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (xəbərdarlıq sözbəsöz; yoxdursa «yoxdur»):
  - Xəbərdarlıq məhsulun adını deyir (bəli / xeyr / xəbərdarlıq yoxdur):
  - E-11-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-51 — Task 06: baza məbləğinin adı yox idi — Heydər Əliyev, «Son 6 ayın ortalaması»
Mənbə: `BRIEFS/TASK-06.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 11, sitat: "Əsas müqayisə sətrində baza məbləğinin adı yoxdur. Heydər Əliyev, Son 6 ay: "17,583.62 ₼" yanında böyük yaşıl fərq və faiz durur, hansı rəqəmin baza olduğu yazılmır." · həll edən task: Task 06
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Son 6 ayın ortalaması» (`components/analytics/format.ts`:40), başlıq · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsi; 2) baza seçicisində «Son 6 ayın ortalaması»-nı basın; 3) başlıqda müqayisə sətrini sözbəsöz yazın: «Müqayisə: …», sonra rəqəmlərin yanındakı adlar və rəqəmlər (koddan: «Baza» və «Fərq» — `components/decisions/DecisionHeadline.tsx`:114–138); 4) fərqin rəngini yazın; 5) seçicidə yenə «Keçən ay»-ı basın.
Gözlənilən: "Müqayisə sətrində "baza" və "fərq" açıq yazılır." (`BRIEFS/TASK-06.md`:17). Bu gün üçün baza rəqəmini brief vermir (brief rəqəm vermir).
İlk auditdə: "Heydər Əliyev, Son 6 ay: "17,583.62 ₼" yanında böyük yaşıl fərq və faiz durur, hansı rəqəmin baza olduğu yazılmır." (`BRIEFS/TASK-06.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (müqayisə sətri, sözbəsöz):
  - Bazanın adı və rəqəmi:
  - Fərqin adı, rəqəmi, faizi və rəngi:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-52 — Task 07: Heydər Əliyev kartı yalnız kateqoriyanı deyirdi; artımın çoxu traktordur
Mənbə: `BRIEFS/TASK-07.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 7, sitat: "Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: kart "Əsas səbəb: Yeni sifarişlər +29,691.52 ₼" yazır. Artımın böyük hissəsi isə bir maldır: Traktor qazonbiçən RT-6127.1 ZL, 0 → 1 ədəd, +21,900.00 ₼ (ümumi fərq +23,852.70 ₼). İlk sifarişi Sentyabr 2026-dadır." · həll edən task: Task 07
Harada: real · İdarəetmə paneli, Heydər Əliyev Mərkəzinin diqqət kartı, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə panelini açın, «Keçən ay»; 2) Heydər Əliyev Mərkəzinin kartını tapın; kartı yoxdursa, bunu yazın və `Hökm:`-ə «yoxlanıla bilmədi (kart yoxdur)» yazın; 3) kartın başlığını, «Əsas səbəb» sətrini (`components/dashboard/AttentionSection.tsx`:156–162) və onun altındakı mal sətrini — ad, məbləğ, pay — sözbəsöz yazın (`AttentionSection.tsx`:193–205; payın sözü `terminology/terms.ts`:143–154); 4) Sabun variant əlaqəsinin təsdiqlənib-təsdiqlənmədiyini A-07-dəki Əmr 2-nin Sabun sətrindən götürün: sərhəd buna görə 74 % və ya 76 %-dir.
Gözlənilən: "Hər diqqət kartında əsas səbəbin yanında həmin səbəbdə ən böyük təsiri olan mal görünür: adı, məbləği və payı." (`BRIEFS/TASK-07.md`:14); "Heydər Əliyev (Keçən ay): "Traktor qazonbiçən RT-6127.1 ZL — +21,900 ₼ (artımların …%-i)". Təkcə yeni məhsulların cəmi 29,691.52 ₼ olduğu üçün pay 74%-dən çox ola bilməz." (`BRIEFS/TASK-07.md`:16); "(Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra yeni məhsulların cəmi 28,941.52 ₼-a düşür və bu sərhəd 76%-ə qalxır.)" (`BRIEFS/TASK-07.md`:38)
İlk auditdə: "kart "Əsas səbəb: Yeni sifarişlər +29,691.52 ₼" yazır. … Traktor qazonbiçən RT-6127.1 ZL, 0 → 1 ədəd, +21,900.00 ₼ (ümumi fərq +23,852.70 ₼)" (`BRIEFS/TASK-07.md`:7)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kartın başlığı:
  - «Əsas səbəb» sətri:
  - Mal sətri (ad, məbləğ, pay):
  - A-07-yə görə Sabun əlaqəsi təsdiqlənib (bəli / xeyr):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-53 — Task 07: traktoru görmək üçün sifarişə keçmək lazım idi
Mənbə: `BRIEFS/TASK-07.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 8, sitat: "Traktoru görmək üçün sifarişə keçib "Əsas dəyişikliklər" siyahısında axtarmaq lazımdır." · həll edən task: Task 07
Harada: real · İdarəetmə paneli, Heydər Əliyev Mərkəzinin kartı; sonra onun Sentyabr 2026 sifarişi · `/dashboard`, `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) kartda traktorun adının olub-olmadığını B-52-dən köçürün; 2) kartda «Detallara bax»-ı basın (`components/dashboard/AttentionSection.tsx`:211–236); 3) «Əsas dəyişikliklər»-də «Hamısı» seçilmiş halda birinci sətrin məhsulunu və məbləğini yazın (`components/decisions/DriverList.tsx`:78, 117–148); 4) brauzerin **Geri** düyməsi ilə panelə qayıdın.
Gözlənilən: "Səbəbi sifarişə girmədən deyə bilirəm." (`BRIEFS/TASK-07.md`:38); "Sifariş səhifəsində traktor "Əsas dəyişikliklər" siyahısında birinci görünməyə davam edir (təsirə görə sıralama)." (`BRIEFS/TASK-07.md`:30)
İlk auditdə: "Traktoru görmək üçün sifarişə keçib "Əsas dəyişikliklər" siyahısında axtarmaq lazımdır." (`BRIEFS/TASK-07.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kartda traktorun adı (var / yox; B-52):
  - «Əsas dəyişikliklər»-in 1-ci sətri (məhsul və məbləğ):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-54 — Task 07: Fəvvarələr meydanı — ən böyük mal Yay ayaqqabısı
Mənbə: `BRIEFS/TASK-07.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10 (9-cu sətrin «Başqa nümunələr (Keçən ay):» bəndinin altında), sitat: "Fəvvarələr meydanı, −2,584.45: əsas səbəb "Artıq sifariş olunmayanlar −8,093.70"; ən böyük mal Yay ayaqqabısıdır, −1,988.00 (71 → 0 ədəd)." · həll edən task: Task 07
Harada: real · İdarəetmə paneli, Fəvvarələr meydanının diqqət kartı, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-52-nin 1-ci addımı; 2) Fəvvarələr meydanının kartını tapın və B-52-nin 3-cü addımını edin; 3) kartı yoxdursa, bunu yazın, «Bütün obyektlər» cədvəlində onun sətrindəki əsas səbəbi yazın və `Hökm:`-ə «yoxlanıla bilmədi (kart yoxdur)» yazın. Koddan: cədvəl sətri yalnız səbəbin adını və məbləğini göstərir, malı göstərmir (`components/dashboard/LocationRows.tsx`:258–275); mal yalnız kartdadır (`components/dashboard/AttentionSection.tsx`:164).
Gözlənilən: "Hər diqqət kartında əsas səbəbin yanında həmin səbəbdə ən böyük təsiri olan mal görünür: adı, məbləği və payı." (`BRIEFS/TASK-07.md`:14); "Fəvvarələr (Keçən ay): "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)". Təkcə bu ay yazılmayan məhsulların cəmi 8,093.70 ₼ olduğu üçün pay 25%-dən çox ola bilməz." (`BRIEFS/TASK-07.md`:17)
İlk auditdə: "Fəvvarələr meydanı, −2,584.45: əsas səbəb "Artıq sifariş olunmayanlar −8,093.70"; ən böyük mal Yay ayaqqabısıdır, −1,988.00 (71 → 0 ədəd)." (`BRIEFS/TASK-07.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kart (var / yox; varsa başlığı):
  - «Əsas səbəb» sətri:
  - Mal sətri (ad, məbləğ, pay):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-55 — Task 07: Nərimanov heykəli — ən böyük mal Mərmər bej qalınlığı 2 sm
Mənbə: `BRIEFS/TASK-07.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 11 (9-cu sətrin «Başqa nümunələr (Keçən ay):» bəndinin altında), sitat: "Nərimanov heykəli, −1,166.42: əsas səbəb "Artıq sifariş olunmayanlar −1,601.06"; ən böyük mal Mərmər bej qalınlığı 2 sm, −883.20 (7.36 → 0 m²)." · həll edən task: Task 07
Harada: real · İdarəetmə paneli, Nərimanov heykəlinin diqqət kartı, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) B-54-ün 1–3-cü addımları, Nərimanov heykəli üçün.
Gözlənilən: "Hər diqqət kartında əsas səbəbin yanında həmin səbəbdə ən böyük təsiri olan mal görünür: adı, məbləği və payı." (`BRIEFS/TASK-07.md`:14). Bu kart üçün payı brief vermir (brief rəqəm vermir).
İlk auditdə: "Nərimanov heykəli, −1,166.42: əsas səbəb "Artıq sifariş olunmayanlar −1,601.06"; ən böyük mal Mərmər bej qalınlığı 2 sm, −883.20 (7.36 → 0 m²)." (`BRIEFS/TASK-07.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kart (var / yox; varsa başlığı):
  - «Əsas səbəb» sətri:
  - Mal sətri (ad, məbləğ, pay):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-56 — Task 08: ayların cəmi sətri yox idi
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 7, sitat: "Ayların cəmi sətri yoxdur. Sentyabrın cəmini paneldəki 71,210.29 ₼ ilə yoxlamaq olmur." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», 2026 · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Aylıq hesabat»-ı açın (`layout/navigation.ts`:28); 2) obyektlərin altında cəmi sətrinin olub-olmadığını və adını yazın (koddan: «Cəmi», axtarış varkən «Cəmi — bütün obyektlər» — `terminology/terms.ts`:101, 107; `components/reports/MonthlyReportTable.tsx`:150–169); 3) həmin sətirdə Sentyabrı yazın; 4) İdarəetmə panelində başlığın «Sentyabr 2026 sifarişlərinin məbləği» rəqəmini yazın (`components/dashboard/labels.ts`:210–212; `components/dashboard/DashboardSummary.tsx`:80–97). Ayların hamısı C-21-dədir.
Gözlənilən: "Cədvəlin altında ay cəmləri və il cəmi olan sətir var; bu sətirdə faiz yoxdur (8.1)." (`BRIEFS/TASK-08.md`:17); "… Sentyabr 71,210.29 · … Sentyabr paneldəki rəqəmlə eynidir." (`BRIEFS/TASK-08.md`:46)
İlk auditdə: "Ayların cəmi sətri yoxdur. Sentyabrın cəmini paneldəki 71,210.29 ₼ ilə yoxlamaq olmur." (`BRIEFS/TASK-08.md`:7)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Cəmi sətri (var / yox; adı):
  - Sentyabr — hesabatda:
  - Sentyabr — paneldə:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-57 — Task 08: qeyri-adi ay gözə çarpmırdı — Heydər Əliyev İyun
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 8, sitat: "Qeyri-adi ay gözə çarpmır: hər hücrədə faiz var, vurğu yoxdur. Heydər Əliyev İyun 36,010.19 ₼ (+85.48%) digər rəqəmlərin içində itir." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», Heydər Əliyev Mərkəzinin İyun hücrəsi · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) Heydər Əliyev Mərkəzinin İyun hücrəsinin məbləğini və altındakı yazını yazın; 3) hücrənin qonşu hücrələrdən necə seçildiyini yazın: fon rəngi, qalın yazı (koddan: `components/reports/MonthlyReportTable.tsx`:262–276); 4) hücrənin üzərinə gəlin və çıxan yazını sözbəsöz yazın (koddan: «Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması …, fərq …» — `terminology/terms.ts`:127–129; `MonthlyReportTable.tsx`:344–346); 5) cədvəlin üstündəki izahda «Qeyri-adi ay» yazısını yazın (`MonthlyReportTable.tsx`:422–428; `terms.ts`:118–121). Rəqəmlərin özü C-22-dədir.
Gözlənilən: "Qeyri-adi ay: obyektin əvvəlki 3 mövcud ayının ortalamasından ±50%-dən çox fərqlənən ay rəqəmləri oxumadan seçilir. Əvvəlki 3 mövcud ay yoxdursa, vurğu olmur (8.2)." (`BRIEFS/TASK-08.md`:18); "Heydər Əliyevin İyun hücrəsi (36,010.19 ₼) vurğulanır: əvvəlki 3 mövcud ayın (Mart–May) ortalaması 14,458.58 ₼-dır, fərq +149%." (`BRIEFS/TASK-08.md`:47)
İlk auditdə: "Heydər Əliyev İyun 36,010.19 ₼ (+85.48%) digər rəqəmlərin içində itir." (`BRIEFS/TASK-08.md`:8)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (hücrənin məbləği və altındakı yazı):
  - Hücrə necə seçilir:
  - Üzərinə gələndə çıxan yazı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-58 — Task 08: gələcək aylar keçmiş boş aylar kimi görünürdü
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 9, sitat: "Gələcək aylar (Oktyabr–Dekabr) keçmişdə sifariş olmayan aylarla eyni görünür: "—" və izahı "Oktyabr 2026: sifariş yoxdur"." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», Oktyabr–Dekabr sütunları və keçmişdə boş bir hücrə · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) istənilən obyektin Oktyabr, Noyabr və Dekabr hücrələrinin görünüşünü və üzərinə gələndə çıxan yazını yazın (koddan: «Oktyabr 2026: gələcək ay» — `terminology/terms.ts`:109–115; `components/reports/MonthlyReportTable.tsx`:239–248); 3) keçmiş aylardan sifarişi olmayan bir hücrə tapın (obyekt və ay) və onun görünüşünü və yazısını yazın (koddan: "—" və «…: sifariş yoxdur» — `MonthlyReportTable.tsx`:251–258); 4) oxuduğunuz tarixi yazın. Koddan: ay yalnız oxuyanın təqvim ayından sonra gələcək sayılır; cari ay gələcək deyil (`components/analytics/format.ts`:225–232). Audit Oktyabr 2026-da aparılırsa, Oktyabr «Gələcək ay» olmayacaq.
Gözlənilən: "Gələcək aylar keçmiş boş aylardan fərqlənir və "sifariş yoxdur" demir." (`BRIEFS/TASK-08.md`:19); "Oktyabr–Dekabr "sifariş yoxdur" demir və keçmiş boş aylardan fərqlənir." (`BRIEFS/TASK-08.md`:50)
İlk auditdə: ""—" və izahı "Oktyabr 2026: sifariş yoxdur"" (`BRIEFS/TASK-08.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Oktyabr, Noyabr, Dekabr — görünüş və yazı:
  - Keçmiş boş hücrə (obyekt, ay) — görünüş və yazı:
  - Oxuma tarixi:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-59 — Task 08: ⚠ faizi əvəz edirdi — Bayıl yolu, Sentyabr
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10, sitat: "⚠ işarəsi faizi əvəz edir. Bayıl yolunun Sentyabr hücrəsində yalnız "⚠1" var, panel isə eyni ay üçün +254.03% göstərir." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», Bayıl yolunun Sentyabr hücrəsi; İdarəetmə paneli, «Keçən ay» · `/dashboard/monthly`, `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) Bayıl yolunun Sentyabr hücrəsində məbləğin altında görünən hər şeyi yazın: faiz, ⚠ N, nöqtə (koddan: faiz və ⚠ yan-yana çıxır — `components/reports/MonthlyReportTable.tsx`:283–313); 3) İdarəetmə panelində, «Keçən ay», «Bütün obyektlər» cədvəlində Bayıl yolunun fərqini və faizini yazın. Hesabatın faizi əvvəlki aya görədir (`terminology/terms.ts`:132), panelinki «Keçən ay» bazasına görə. Hücrənin özü C-26-dadır.
Gözlənilən: "⚠ və faiz eyni hücrədə birlikdə görünür." (`BRIEFS/TASK-08.md`:20); "Bayıl yolunun Sentyabr hücrəsində həm ⚠1, həm faiz görünür." (`BRIEFS/TASK-08.md`:51). Bu gün üçün faizin rəqəmini brief vermir (brief rəqəm vermir).
İlk auditdə: "Bayıl yolunun Sentyabr hücrəsində yalnız "⚠1" var, panel isə eyni ay üçün +254.03% göstərir." (`BRIEFS/TASK-08.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (hücrədə: məbləğ, faiz, ⚠ N):
  - Paneldə Bayıl yolu, «Keçən ay» (fərq və faiz):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-60 — Task 08: status nöqtəsinin mənası yalnız siçanla
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 11, sitat: "Hücrədəki kiçik rəngli nöqtənin (status) mənası yalnız mouse ilə üzərinə gələndə aydın olur." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», cədvəlin üstündəki izah · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) cədvəlin üstündə işarələrin izahı varmı, yazın (koddan: «Cədvəldəki işarələr» — `terminology/terms.ts`:135; `components/reports/MonthlyReportTable.tsx`:394–435); 3) izahın hər bəndini sözbəsöz yazın; 4) izahda status nöqtələrinin hansı vəziyyətləri dediyini yazın (`MonthlyReportTable.tsx`:403–408).
Gözlənilən: "Status nöqtəsinin qısa izahı ekrandadır." (`BRIEFS/TASK-08.md`:21)
İlk auditdə: "Hücrədəki kiçik rəngli nöqtənin (status) mənası yalnız mouse ilə üzərinə gələndə aydın olur." (`BRIEFS/TASK-08.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - İzahın bəndləri, sözbəsöz:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-61 — Task 08: 12 aylıq cədvəl yalnız 1280 px-dən enli ekranda
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 12, sitat: "12 aylıq cədvəl yalnız 1280px-dən enli ekranda açılır. 1150–1279px noutbukda rəhbər yalnız bir ayın kart siyahısını görür." · həll edən task: Task 08
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1200 × 800 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Aylıq hesabat»-ı açın; 3) 12 aylıq cədvəlin, yoxsa kart siyahısının göründüyünü yazın (koddan: cədvəl 1024 pikseldən enli ekranda göstərilir — `components/reports/MonthlyReportTable.tsx`:84, 447–453); 4) H-22-nin hökmünü köçürün. Eyni en C-27-dədir.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23); "1200px enində də 12 aylıq cədvəli görürəm." (`BRIEFS/TASK-08.md`:52)
İlk auditdə: "12 aylıq cədvəl yalnız 1280px-dən enli ekranda açılır. 1150–1279px noutbukda rəhbər yalnız bir ayın kart siyahısını görür." (`BRIEFS/TASK-08.md`:12)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (1200-də cədvəl / kart siyahısı):
  - H-22-nin hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-62 — Task 08: beşrəqəmli məbləğlər sıx idi — Fəvvarələr
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 13, sitat: "Beşrəqəmli məbləğlər sıxdır: Fəvvarələr sətrində "23,449.32 ₼ 11,161.99 ₼" demək olar bitişik yazılır." · həll edən task: Task 08
Harada: real · «Aylıq hesabat», Fəvvarələr meydanının sətri · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) Fəvvarələr meydanının sətrində yan-yana duran iki beşrəqəmli məbləği tapın və ikisini də yazın; 3) aralarında aydın boşluq olub-olmadığını, məbləğin kəsilib-kəsilmədiyini və ya iki sətrə düşüb-düşmədiyini yazın.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23). Bu gün üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Fəvvarələr sətrində "23,449.32 ₼ 11,161.99 ₼" demək olar bitişik yazılır." (`BRIEFS/TASK-08.md`:13)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (iki qonşu məbləğ və aralarındakı boşluq):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-63 — Task 08: 1440-da cədvəl kartların hüdudundan çıxırdı
Mənbə: `BRIEFS/TASK-08.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 14, sitat: "1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır." · həll edən task: Task 08
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin; 2) «Aylıq hesabat»-ı açın; 3) cədvəlin sağ kənarının yuxarıdakı hissələrin sağ kənarından çıxıb-çıxmadığını və üfüqi sürüşdürmənin olub-olmadığını yazın; 4) H-04-ün hökmünü köçürün.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23); "1366 və 1440-da Yanvar–Dekabr üfüqi sürüşdürmədən görünür; başlıq sətri yuxarıda sabit qalır." (`BRIEFS/TASK-08.md`:35)
İlk auditdə: "1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır." (`BRIEFS/TASK-08.md`:14)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - H-04-ün hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-64 — Task 09: diqqət kartları birinci ekranın altında idi
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 7, sitat: "Birinci ekranda ay, məbləğ, istiqamət və baza görünür. "Hansı obyektə baxım" sualının cavabı, yəni diqqət kartları, isə birinci ekranın altında qalır." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, sürüşdürmədən · `/dashboard` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) İdarəetmə panelini açın və sürüşdürməyin; 3) birinci ekranda tam görünən ilk diqqət kartının başlığını və obyektini yazın; kart yoxdursa, «yoxdur» yazın; 4) H-01-in hökmünü köçürün. Eyni yoxlama C-28-dədir.
Gözlənilən: "Birinci ekranda ən azı birinci diqqət obyekti görünür." (`BRIEFS/TASK-09.md`:24); "1366×768 ekranda paneli açanda aşağı sürüşdürmədən ən azı bir diqqət kartı görürəm." (`BRIEFS/TASK-09.md`:60)
İlk auditdə: "diqqət kartları, isə birinci ekranın altında qalır" (`BRIEFS/TASK-09.md`:7)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (sürüşdürmədən görünən ilk kart: başlıq və obyekt):
  - H-01-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-65 — Task 09: "Ən böyük məbləğ artımı" iki kartda
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 9 (8-ci sətrin «Kart başlıqları yanıldır:» bəndinin altında), sitat: ""Ən böyük məbləğ artımı" iki kartda təkrarlanır (Heydər Əliyev və Novxanı)." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, diqqət kartları · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə panelini açın, «Keçən ay» (brief bazanı demir; oxuduğunuz bazanı yazın); 2) hər kartın başlığını və obyektini sırası ilə sözbəsöz yazın (koddan: başlıqlar `components/dashboard/labels.ts`:137–152; eyni növün ikinci kartı «İkinci ən böyük …» yazır — `labels.ts`:157–168); 3) məhz «Ən böyük məbləğ artımı» yazan kartları sayın.
Gözlənilən: "Kart başlıqları kartın niyə seçildiyini düzgün deyir: eyni başlıq təkrarlanmır, "ən böyük" yalnız həqiqətən ən böyük olana yazılır." (`BRIEFS/TASK-09.md`:25)
İlk auditdə: ""Ən böyük məbləğ artımı" iki kartda təkrarlanır (Heydər Əliyev və Novxanı)." (`BRIEFS/TASK-09.md`:9)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Oxunan baza:
  - Kartlar (başlıq — obyekt), sırası ilə:
  - «Ən böyük məbləğ artımı» yazan kart sayı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-66 — Task 09: "Ən böyük faiz dəyişməsi" iki kartda
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 10 (8-ci sətrin «Kart başlıqları yanıldır:» bəndinin altında), sitat: ""Ən böyük faiz dəyişməsi" də iki kartdadır (Bayıl yolu +254.03% və Milli Konservatoriya +480.01%)." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, diqqət kartları · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-65-in 1–2-ci addımları (kart siyahısını oradan köçürə bilərsiniz); 2) məhz «Ən böyük faiz dəyişməsi» yazan kartları sayın, hər birinin obyektini və faizini yazın.
Gözlənilən: "Kart başlıqları kartın niyə seçildiyini düzgün deyir: eyni başlıq təkrarlanmır, "ən böyük" yalnız həqiqətən ən böyük olana yazılır." (`BRIEFS/TASK-09.md`:25). Bu gün üçün faizləri brief vermir (brief rəqəm vermir).
İlk auditdə: ""Ən böyük faiz dəyişməsi" də iki kartdadır (Bayıl yolu +254.03% və Milli Konservatoriya +480.01%)." (`BRIEFS/TASK-09.md`:10)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Oxunan baza:
  - «Ən böyük faiz dəyişməsi» yazan kart sayı:
  - Onların obyekti və faizi:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-67 — Task 09: «Son 3 ayın ortalaması» — faiz kartı ən böyük faizə verilməmişdi
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 11 (8-ci sətrin «Kart başlıqları yanıldır:» bəndinin altında), sitat: ""Son 3 ay" bazasında Novxanının artımı +268.05%-dir, amma "Ən böyük faiz dəyişməsi" kartı Milli Konservatoriyaya (+85.55%) verilib." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Son 3 ayın ortalaması» (`components/analytics/format.ts`:39) · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panelin baza seçicisində (`pages/ManagementDashboardPage.tsx`:263; `components/analytics/BasisPicker.tsx`:69–83) «Son 3 ayın ortalaması»-nı basın; 2) «Ən böyük faiz dəyişməsi» kartının obyektini və faizini yazın; 3) kartın başlığının yanındakı ⓘ izahını açın və sözbəsöz yazın (`components/dashboard/AttentionSection.tsx`:101–103); 4) «Bütün obyektlər» cədvəlində Novxanının bazasını, fərqini və faizini yazın; 5) seçicidə yenə «Keçən ay»-ı basın.
Gözlənilən: "Kart başlıqları kartın niyə seçildiyini düzgün deyir: eyni başlıq təkrarlanmır, "ən böyük" yalnız həqiqətən ən böyük olana yazılır." (`BRIEFS/TASK-09.md`:25). Koddan: "Faiz yalnız müqayisə bazası ən azı 100 ₼ olan və ən azı 50% dəyişən obyektlər arasında müqayisə olunur." (`components/dashboard/labels.ts`:185–186). Bu gün üçün faizləri brief vermir (brief rəqəm vermir).
İlk auditdə: ""Son 3 ay" bazasında Novxanının artımı +268.05%-dir, amma "Ən böyük faiz dəyişməsi" kartı Milli Konservatoriyaya (+85.55%) verilib." (`BRIEFS/TASK-09.md`:11)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - «Ən böyük faiz dəyişməsi» kartı (obyekt və faiz):
  - Kartın ⓘ izahı, sözbəsöz:
  - Novxanı cədvəldə (baza, fərq, faiz):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-68 — Task 09: qiymət xəbərdarlığı hər kartda cümlə kimi; narıncı çox
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 12, sitat: "Qiymət xəbərdarlığı demək olar hər kartda cümlə kimi təkrarlanır; narıncı rəng çox işlənir və xəbərdarlığın təsiri itir." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, diqqət kartları · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) kartlarda xəbərdarlığın şəklini B-43-dən köçürün; 2) kartlarda narıncı (kəhrəba) rəngin harada işləndiyini yazın: başlıq, işarə, başqa yer (koddan: yalnız «Qiymət yoxdur» kartının başlığı və ⚠ işarəsi — `components/dashboard/labels.ts`:188–199; `components/dashboard/AttentionSection.tsx`:91, 98).
Gözlənilən: "Qiymət xəbərdarlığı kartda qısa işarə və say ilə verilir, hər kartda cümlə kimi təkrarlanmır." (`BRIEFS/TASK-09.md`:26)
İlk auditdə: "Qiymət xəbərdarlığı demək olar hər kartda cümlə kimi təkrarlanır; narıncı rəng çox işlənir" (`BRIEFS/TASK-09.md`:12)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Kartlarda xəbərdarlığın şəkli (B-43-dən):
  - Narıncı görülən yerlər:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-69 — Task 09: yaşıl rəng xərcin artmasını göstərirdi
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 13, sitat: "Yaşıl rəng xərcin artmasını göstərir və "yaxşı" kimi oxunur." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, diqqət kartları və «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; 2) artan bir kartda (məsələn Heydər Əliyev Mərkəzi) fərqin rəngini və altındakı cümləni sözbəsöz yazın (`components/dashboard/AttentionSection.tsx`:118–123; `terminology/terms.ts`:80–96); 3) azalan bir kartda (məsələn Fəvvarələr meydanı) eyni şeyi yazın; 4) cədvəldə artan və azalan bir sətrin fərqinin rəngini yazın. Eyni iki kart C-30-dadır.
Gözlənilən: "Rənglər: xərc artımı qırmızı, azalma yaşıl. İzahı "xərc artıb / azalıb" kimi verilir, "yaxşı / pis" kimi yox (9.1). Bu qayda panel, aylıq hesabat, "Niyə dəyişib?" və obyektlər siyahısı üçün eynidir." (`BRIEFS/TASK-09.md`:27)
İlk auditdə: "Yaşıl rəng xərcin artmasını göstərir və "yaxşı" kimi oxunur." (`BRIEFS/TASK-09.md`:13)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Artan kart (obyekt): rəng və cümlə:
  - Azalan kart (obyekt): rəng və cümlə:
  - Cədvəldə artım / azalma rəngi:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-70 — Task 09: çiplər klik olunmurdu
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 14, sitat: "Çiplər klik olunmur. Hansı obyektlərdə qiymət yoxdur və ya tarixçə natamamdır, bunu görmək üçün cədvəl filtrini əllə seçmək lazımdır. Sıfır saylı çip də görünür ("Tarixçə natamam 0"). Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, çiplər (`components/dashboard/DashboardSummary.tsx`:220–310) · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; 2) çipləri adı və sayı ilə sırası ilə yazın; 3) hər çipi növbə ilə basın və «Bütün obyektlər» cədvəlində neçə sətir qaldığını yazın; sonra çipi yenə basıb süzgəci götürün. Çip süzgəcdir, heç nə yazmır (`DashboardSummary.tsx`:197–224).
Gözlənilən: "Hər çip klik olunur və cədvəli həmin obyektlərə süzür; sıfır saylı çip görünmür. "Qiymət yoxdur · N obyekt" həmin obyektləri göstərir." (`BRIEFS/TASK-09.md`:28)
İlk auditdə: "Çiplər klik olunmur. Hansı obyektlərdə qiymət yoxdur və ya tarixçə natamamdır, bunu görmək üçün cədvəl filtrini əllə seçmək lazımdır." (`BRIEFS/TASK-09.md`:14)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Çiplər (ad və say):
  - Hər çip basılanda cədvəldə qalan sətir sayı:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-71 — Task 09: sıfır saylı çip görünürdü ("Tarixçə natamam 0")
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 14, sitat: "Çiplər klik olunmur. Hansı obyektlərdə qiymət yoxdur və ya tarixçə natamamdır, bunu görmək üçün cədvəl filtrini əllə seçmək lazımdır. Sıfır saylı çip də görünür ("Tarixçə natamam 0"). Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur." · həll edən task: Task 09; çipin sözü Task 05 (`BRIEFS/TASK-09.md`:55)
Harada: real · İdarəetmə paneli, çiplər · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-70-in 2-ci addımındakı çip siyahısına baxın; 2) sayı 0 olan çip görünürsə, adını yazın; yoxdursa «yoxdur» yazın. Koddan: sayı sıfır olan çip göstərilmir (`components/dashboard/DashboardSummary.tsx`:215).
Gözlənilən: "sıfır saylı çip görünmür." (`BRIEFS/TASK-09.md`:28)
İlk auditdə: "Sıfır saylı çip də görünür ("Tarixçə natamam 0")." (`BRIEFS/TASK-09.md`:14)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (sayı 0 olan çip; yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-72 — Task 09: qiymət xəbərdarlığından obyektlərə keçid yox idi
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 14, sitat: "Çiplər klik olunmur. Hansı obyektlərdə qiymət yoxdur və ya tarixçə natamamdır, bunu görmək üçün cədvəl filtrini əllə seçmək lazımdır. Sıfır saylı çip də görünür ("Tarixçə natamam 0"). Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, başlıqdakı qiymət qeydi və «Qiymət yoxdur · N obyekt» çipi · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) başlıqda məbləğin yuxarısındakı qiymət qeydini sözbəsöz yazın (koddan: «N obyektin sifarişində qiyməti olmayan sətir var» — `coverage/labels.ts`:189–191; `components/dashboard/DashboardSummary.tsx`:85–92); 2) onu basın və cədvəldə qalan obyektləri yazın; sonra süzgəci götürün; 3) çipin özü C-31-dədir: C-31-in hökmünü köçürün.
Gözlənilən: ""Qiymət yoxdur · N obyekt" həmin obyektləri göstərir." (`BRIEFS/TASK-09.md`:28)
İlk auditdə: "Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur." (`BRIEFS/TASK-09.md`:14)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Başlıqdakı qiymət qeydi (sözbəsöz):
  - Qeyd basılanda cədvəldə qalan obyektlər:
  - C-31-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-73 — Task 09: cədvəlin varsayılan sırası obyekt adına görə idi
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 16 (15-ci sətrin «"Bütün obyektlər" cədvəli:» bəndinin altında), sitat: "varsayılan sıra obyekt adına görədir, dəyişməyə görə yox;" · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə panelini menyudan yenidən açın (ünvanda əlavə seçim olmadan); 2) cədvəlin sıralama seçimində nə seçildiyini yazın (koddan: «Ən çox dəyişən» — `components/dashboard/labels.ts`:88–97); 3) ilk beş sətrin obyektini və fərqini sırası ilə yazın.
Gözlənilən: "varsayılan sıra dəyişmənin böyüklüyünə görədir;" (`BRIEFS/TASK-09.md`:31)
İlk auditdə: "varsayılan sıra obyekt adına görədir, dəyişməyə görə yox" (`BRIEFS/TASK-09.md`:16)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (seçilmiş sıralama):
  - İlk beş sətir (obyekt — fərq):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-74 — Task 09: 26 / 27 sətir iki səhifəyə bölünürdü
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 17 (15-ci sətrin «"Bütün obyektlər" cədvəli:» bəndinin altında), sitat: "26 sətir iki səhifəyə bölünürdü (ikinci səhifədə yalnız İDEA); 27 obyektlə də iki səhifədir;" · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) cədvəldə sətirləri sayın; 2) cədvəlin altında səhifələr və ya «Növbəti» düyməsi olub-olmadığını yazın (koddan: səhifədə 100 sətir göstərilir, düymələr yalnız sətir bundan çox olanda çıxır — `pages/ManagementDashboardPage.tsx`:38, 367–375). Eyni yoxlama C-32-dədir.
Gözlənilən: "27 sətir bir səhifədədir;" (`BRIEFS/TASK-09.md`:30); "Obyekt sayı 24 / 27-dir (Task 3)." (`BRIEFS/TASK-09.md`:44)
İlk auditdə: "26 sətir iki səhifəyə bölünürdü (ikinci səhifədə yalnız İDEA); 27 obyektlə də iki səhifədir" (`BRIEFS/TASK-09.md`:17)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (sətir sayı; səhifə düymələri var / yox):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-75 — Task 09: "Növbəti" basılanda səhifə yuxarı qalxırdı
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 18 (15-ci sətrin «"Bütün obyektlər" cədvəli:» bəndinin altında), sitat: ""Növbəti" basılanda səhifə ən yuxarı qalxır;" · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) cədvəlin altında «Növbəti» düyməsinin olub-olmadığını B-74-dən köçürün; 2) varsa, basın və səhifənin harada qaldığını yazın (düymə yalnız səhifəni dəyişir, heç nə yazmır); yoxdursa, «düymə yoxdur» yazın.
Gözlənilən: "27 sətir bir səhifədədir;" (`BRIEFS/TASK-09.md`:30). Brief bu barədə ayrıca nəticə vermir; 27 sətir bir səhifədədirsə, düymə yoxdur.
İlk auditdə: ""Növbəti" basılanda səhifə ən yuxarı qalxır" (`BRIEFS/TASK-09.md`:18)
---- operator doldurur ----
Göründü:
  - Bu gün görünən («Növbəti» var / yox; varsa, basılandan sonra səhifə harada qaldı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-76 — Task 09: "Detallara bax" iki sətrə sınırdı
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 19 (15-ci sətrin «"Bütün obyektlər" cədvəli:» bəndinin altında), sitat: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) cədvəlin hər sətrində «Detallara bax» düyməsinin (`components/dashboard/labels.ts`:231) bir sətirdə qalıb-qalmadığına baxın; 2) iki sətrə sınan varsa, obyektini yazın. Koddan: düymə sınmayan yazı ilə qurulub (`components/dashboard/AttentionSection.tsx`:229–231).
Gözlənilən: "düymələr və xəbərdarlıqlar bir sətirə sığır." (`BRIEFS/TASK-09.md`:32)
İlk auditdə: ""Detallara bax" iki sətrə sınır" (`BRIEFS/TASK-09.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (iki sətrə sınan düymələr; yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-77 — Task 09: qiymət xəbərdarlığı cədvəldə 4 sətir tuturdu
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 19 (15-ci sətrin «"Bütün obyektlər" cədvəli:» bəndinin altında), sitat: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) cədvəldə qiyməti olmayan sətri olan obyektləri tapın (B-72-nin süzgəci ilə tapmaq olar); 2) onların sətrində xəbərdarlığın necə göründüyünü və neçə sətir tutduğunu yazın (koddan: məbləğin yanında «⚠ N», cümlə yalnız üzərinə gələndə — `components/dashboard/LocationRows.tsx`:310–330; `components/dashboard/MissingPriceMark.tsx`:4–11).
Gözlənilən: "düymələr və xəbərdarlıqlar bir sətirə sığır." (`BRIEFS/TASK-09.md`:32); "Qiymət xəbərdarlığı kartda qısa işarə və say ilə verilir, hər kartda cümlə kimi təkrarlanmır." (`BRIEFS/TASK-09.md`:26)
İlk auditdə: "qiymət xəbərdarlığı 4 sətir tutur" (`BRIEFS/TASK-09.md`:19)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (xəbərdarlığın şəkli və tutduğu sətir sayı):
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-78 — Task 09: sifarişdən qayıdanda panel ən yuxarıdan açılırdı
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 20, sitat: "Sifarişdən geri qayıdanda panel ən yuxarıdan açılır və rəhbər baxdığı kartı itirir." · həll edən task: Task 09
Harada: real · İdarəetmə paneli → Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi → brauzerin **Geri** düyməsi · `/dashboard`, `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: yol C-33-dədir (kartdan «Detallara bax», sifarişdə bir az aşağı, sonra brauzerin **Geri** düyməsi; sifariş səhifəsində panelə qaytaran öz düyməsi yoxdur — «Brief-in sözləri və ekranın sözləri»). C-33-də yazılanı buraya köçürün. Koddan: panel qayıdanda açılan kartın yerinə dönür (`navigation/useScrollMemory.ts`:13, 26, 104; `components/dashboard/AttentionSection.tsx`:96–97).
Gözlənilən: "Geri qayıdanda panel qaldığım yerdən açılır." (`BRIEFS/TASK-09.md`:33)
İlk auditdə: "Sifarişdən geri qayıdanda panel ən yuxarıdan açılır və rəhbər baxdığı kartı itirir." (`BRIEFS/TASK-09.md`:20)
---- operator doldurur ----
Göründü:
  - Bu gün görünən (Geri-dən sonra panel harada açıldı):
  - C-33-ün hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

### B-79 — Task 09: EXPO olanda fərq ay cəminin altında dururdu
Mənbə: `BRIEFS/TASK-09.md`, «Auditdə müşahidə edilən hazırkı problem», sətir 21, sitat: "Müqayisədən kənar obyekt olanda (Keçən ay: EXPO) fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox. Rəhbər ay cəmindən çıxanda başqa rəqəm alır." · həll edən task: Task 09
Harada: real · İdarəetmə paneli, başlıq, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; 2) başlıqda ay cəmini yazın; 3) fərqin hansı rəqəmin yanında durduğunu yazın: ay cəminin altında, yoxsa müqayisə olunan məbləğlə çıxma kimi (koddan: `components/dashboard/DashboardSummary.tsx`:152–195); 4) EXPO-nun ayrıca göstərilməsi E-05-dədir, çıxmanın rəqəmləri C-34-dədir: E-05-in hökmünü köçürün.
Gözlənilən: "İstisna olanda fərq müqayisə olunan məbləğin yanında görünür: 71,030.25 − 44,340.78 = +26,689.47." (`BRIEFS/TASK-09.md`:34)
İlk auditdə: "fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox" (`BRIEFS/TASK-09.md`:21)
---- operator doldurur ----
Göründü:
  - Bu gün görünən:
  - Ay cəmi:
  - Fərq hansı rəqəmin yanındadır:
  - E-05-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: həll olunub / qismən / həll olunmayıb / yoxlanıla bilmədi (səbəb)
Qeyd:

## C. Task 04–16 qəbul şərtləri

Bu bölmə `BRIEFS/TASK-04.md` … `TASK-14.md` və `TASK-16.md`-nin «Acceptance — biznes dili ilə» bölməsinin hər bəndini
yoxlayır: hər bənd bir sətirdir və `Mənbə:`-də sözbəsöz verilib (protokol §6.2). `Hökm:` sözləri: keçdi / keçmədi, və ya
yoxlanıla bilmədi (səbəb). Yazma tələb edən yoxlama yalnız sınaqda, `04-sandbox.md` «Yekun cədvəl»-ə görə aparılır;
sınaq onu apara bilmirsə, sətir «yoxlanıla bilmədi» olur və heç vaxt real datada aparılmır (protokol §6.2). Sentyabr
datasını adlandıran şərt Sentyabrda oxunur (protokol §6.2). Sətir başqa demirsə, B-nin girişindəki kimi: real data,
Rəhbər hesabı, Sentyabr 2026, «Keçən ay», 1366 × 768; məbləğin yazılışı da oradakı kimi. `İlk auditdə:` həmin brief-in
ilk audit qeydini və onun B sətrini göstərir.

### C-01 — Task 04: sınaqda növbədə bir test sifarişi; real 27 obyektdə heç nə dəyişməyib
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 45, sitat: "Test mühitində "Təsdiq gözləyənlər"də bir test sifarişi görürəm. Real 27 obyektin heç birində heç nə dəyişməyib."
Harada: real və sınaq · sınaqda «Təsdiq gözləyənlər» (`http://localhost:5174/approvals`); realda Əmr 4 (A-09, J-04) · — · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sınaq: `04-sandbox.md`, Sınaq 1, addım 1 — `sinaq.rehber` ilə «Təsdiq gözləyənlər»-dəki sifarişləri yazın; bu oxunuş F-02-dədir, oradan köçürə bilərsiniz; 2) real: 27 obyektdə heç nəyin dəyişmədiyi Əmr 4-ün başlanğıc (A-09) və son (J-04) oxunuşlarının müqayisəsidir (`03-emrler.md`, Əmr 4; `04-sandbox.md`, «Yekun cədvəl», sətir 547): J-04-ün hökmünü köçürün.
Gözlənilən: bəndin özü — sınaqda bir test sifarişi; real 27 obyektdə heç nə dəyişməyib. "Real sifarişlər təsdiqlənmir, qaytarılmır və dəyişdirilmir; sınaq yalnız test mühitində aparılır." (`BRIEFS/TASK-04.md`:26); "27 obyektlik real kataloqa test obyekti əlavə olunmur." (`BRIEFS/TASK-04.md`:27). `04-sandbox.md`, Sınaq 1, addım 1: "Gözlənilən: bir sifariş, Sınaq obyekti 1, Sentyabr 2026".
İlk auditdə: ""Təsdiq gözləyənlər" boşdur" (`BRIEFS/TASK-04.md`:7) — B-01; "Axını təhlükəsiz sınamaq üçün mühit yoxdur." (`BRIEFS/TASK-04.md`:8) — B-02
---- operator doldurur ----
Göründü:
  - Sınaqda növbədəki sifariş(lər):
  - J-04-ün hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-02 — Task 04: qərar düymələri təhlilə baxarkən görünən qalır
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 46, sitat: "Sifarişi açanda qərar düymələrini axtarmıram; təhlilə baxarkən onlar görünən qalır."
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi, qərar paneli · `http://localhost:5174/orders/<nömrə>` · 1366 və 390 × 844
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 4 (1366): «Niyə dəyişib?»-i aşağı sürüşdürərək oxuyun və «Təsdiqlə» və «Düzəliş tələb et» olan panelin təhlilin yanında görünən qalıb-qalmadığını yazın (F-03); 2) Sınaq 2, addım 2 (390 × 844): qərar düymələrinin ekranın aşağısına bərkidilmiş zolaqda olub-olmadığını və sürüşdürərkən orada qalıb-qalmadığını yazın (F-09); 3) F-03-ün və F-09-un hökmlərini köçürün.
Gözlənilən: bəndin özü — düymələr axtarılmır və görünən qalır. ""Təsdiqlə" və "Düzəliş tələb et" axtarılmadan tapılır və təhlilə baxarkən görünən qalır." (`BRIEFS/TASK-04.md`:20); "Yan panel səhifə aşağı sürüşəndə görünən qalır (auditdə yaxşı qiymətləndirilib)." (`BRIEFS/TASK-04.md`:36). `04-sandbox.md`: "«Təsdiqlə» və «Düzəliş tələb et» düymələri olan panel təhlilin yanında görünən qalırmı" (Sınaq 1, addım 4); "qərar düymələri ekranın aşağısına bərkidilmiş zolaqdadırmı, və «Niyə dəyişib?» sürüşdürülərkən orada qalırmı" (Sınaq 2, addım 2).
İlk auditdə: ""Təsdiqlə" və "Düzəliş tələb et" düymələri auditdə heç görünmədi" (`BRIEFS/TASK-04.md`:7) — B-01
---- operator doldurur ----
Göründü:
  - 1366 (Sınaq 1, addım 4; F-03):
  - 390 × 844 (Sınaq 2, addım 2; F-09):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-03 — Task 04: səbəbsiz qaytarmaq olmur; səbəblə qaytarılır; ikinci göndəriş və səbəb görünür
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 47, sitat: "Səbəb yazmadan "Düzəliş tələb et" göndərə bilmirəm. Səbəblə qaytarıram; göndərən düzəldib yenidən göndərəndə panel bunun ikinci göndərmə olduğunu və mənim səbəbimi göstərir."
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi, qərar paneli · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 5: səbəb sahəsi boşkən pəncərədəki «Düzəliş tələb et»-in basılmadığını və «Düzəliş tələb etmək üçün səbəb yazılmalıdır.» yazısını yazın (F-07); sonra səbəb yazıb qaytarın (F-04); 2) addım 6: koordinator düzəldib yenidən göndərir (F-05); 3) addım 7: Rəhbər panelində, təsdiqdən əvvəl, «Göndəriş» faktını (məsələn «İkinci göndəriş · düzəliş tələbindən sonra») və «Əvvəlki düzəliş səbəbi»-ni yazın (F-06; `components/workflow/labels.ts`:74–75, 83–119); 4) F-07, F-04, F-05 və F-06-nın hökmlərini `Qeyd:`-ə yazın.
Gözlənilən: bəndin özü — səbəbsiz göndərilmir; səbəblə qaytarılır; panel ikinci göndərişi və Rəhbərin səbəbini göstərir. "**4.2:** Düzəliş tələb edəndə səbəb yazmaq məcburidir." (`BRIEFS/TASK-04.md`:30); "neçənci dəfə göndərildiyi (biznes dilində, "Versiya 2" kimi yox);" "əvvəlki düzəliş səbəbi;" (`BRIEFS/TASK-04.md`:17–18). `04-sandbox.md`, Sınaq 1, addım 5: "sahənin altında «Düzəliş tələb etmək üçün səbəb yazılmalıdır.» görünürmü"; addım 6: "panel bunun ikinci göndəriş olduğunu və Rəhbərin səbəbini göstərsin".
İlk auditdə: "neçənci dəfə (düzəlişdən sonra?), əvvəlki düzəliş qeydi nə idi" (`BRIEFS/TASK-04.md`:11) — B-05
---- operator doldurur ----
Göründü:
  - Səbəbsiz göndərmək (addım 5; F-07):
  - Səbəblə qaytarmaq (addım 5; F-04):
  - İkinci göndəriş və səbəb paneldə (addım 6–7; F-05, F-06):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-04 — Task 04: kim və nə vaxt təsdiqləyib; status bir dəfə
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 48, sitat: "Təsdiqləyəndən sonra panel kimin və nə vaxt təsdiqlədiyini göstərir; status bir dəfə görünür."
Harada: sınaq · Sınaq obyekti 1-in düzəldilmiş Sentyabr 2026 sifarişi, təsdiqdən sonra · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 7: təsdiqdən sonra panelin «Təsdiqləyən» və «Təsdiq tarixi» faktlarını yazın (`components/workflow/labels.ts`:79–80); 2) səhifədə «Təsdiqlənib» sözünün (`labels.ts`:8) neçə dəfə və harada göründüyünü yazın; 3) F-06-nın hökmünü köçürün.
Gözlənilən: bəndin özü — kim və nə vaxt təsdiqləyib görünür; status bir dəfə görünür. "Qərar paneli statusu təkrarlamır." (`BRIEFS/TASK-04.md`:15); "təsdiqləyən və ya qaytaran şəxs və tarix." (`BRIEFS/TASK-04.md`:19). `04-sandbox.md`, Sınaq 1, addım 7: "vəziyyət «Təsdiqlənib» …, və səhifədə bir dəfə görünürmü"; "«Təsdiqləyən» və «Təsdiq tarixi»".
İlk auditdə: ""✓ Təsdiqlənib" həm başlıqda, həm yan paneldə var." (`BRIEFS/TASK-04.md`:9) — B-03; "kim və nə vaxt təsdiqləyib" (`BRIEFS/TASK-04.md`:11) — B-05
---- operator doldurur ----
Göründü:
  - Təsdiqləyən və tarix:
  - «Təsdiqlənib» səhifədə neçə dəfə və harada:
  - F-06-nın hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-05 — Task 04: təsdiq səlahiyyəti olmayan admin təsdiqləyə bilmir
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 49, sitat: "Təsdiq səlahiyyəti olmayan admin hesabı sifarişi təsdiqləyə bilmir."
Harada: sınaq · «Təsdiq gözləyənlər» və Sınaq obyekti 1-in sifarişi, `sinaq.admin` ilə · `http://localhost:5174/approvals` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 3: sətirlərdə «Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.» yazısının olub-olmadığını və «Təsdiqlə» / «Düzəliş tələb et» düymələrinin olmadığını yazın; 2) «Sifarişə bax»-dan sonra qərar panelində eyni yazını və «Təsdiqlə»-nin olmadığını yazın; 3) heç nəyi dəyişməyin; F-08-in hökmünü köçürün.
Gözlənilən: bəndin özü — admin təsdiqləyə bilmir. "**4.3:** Təsdiqi yalnız Rəhbər rolu və ya təsdiq səlahiyyəti olan rol edə bilər. Admin olmaq avtomatik təsdiq hüququ vermir." (`BRIEFS/TASK-04.md`:31). `04-sandbox.md`, Sınaq 1, addım 3: "hər sətirdə «Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.» yazısı görünürmü"; "sətirlərdə «Təsdiqlə» və «Düzəliş tələb et» düymələri yoxdurmu".
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Növbədə (yazı və düymələr):
  - Qərar panelində (yazı və düymələr):
  - F-08-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-06 — Task 04: Rəhbər təsdiqləyə bilir; ara dövr yoxdur
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 50, sitat: "Bu task canlıya çıxandan sonra real sifarişləri Rəhbər rolu ilə təsdiqləmək mümkündür; təsdiq edə bilən kimsənin olmadığı ara dövr yaranmır."
Harada: real və sınaq · sınaqda Sınaq 1, addım 7 (F-06); realda aktiv Rəhbər (A-04) · — · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: 1) Rəhbərin təsdiqləyə bildiyi sınaqda F-06-dadır (`04-sandbox.md`, Sınaq 1, addım 7): F-06-nın hökmünü köçürün; 2) real sistemdə aktiv Rəhbər istifadəçisinin olması A-04-dədir (`01-hazirliq.md`, 4-cü bənd): A-04-ün hökmünü köçürün; 3) real sifariş bu auditdə heç vaxt təsdiqlənmir (`04-sandbox.md`, «Yekun cədvəl», sətir 552): realda «Təsdiqlə»-ni basmayın.
Gözlənilən: bəndin özü — Rəhbər təsdiqləyə bilir, təsdiq edə bilən kimsənin olmadığı dövr yoxdur. "**4.3a:** Rəhbər rolu bu taskın daxilində yaradılır. Task 14 sonradan həmin rolun menyu və görünüş qaydalarını tətbiq edir." (`BRIEFS/TASK-04.md`:32). `04-sandbox.md`, «Yekun cədvəl»: "sınaq: Sınaq 1, addım 7. Real sistemdə aktiv Rəhbərin olması: real data, yalnız oxuma … Real sifariş auditdə heç vaxt təsdiqlənmir."
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - F-06-nın hökmü:
  - A-04-ün hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-07 — Task 04: köhnə Excel sifarişində "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil."
Mənbə: `BRIEFS/TASK-04.md`, «Acceptance — biznes dili ilə», sətir 51, sitat: "Köhnə, Excel-dən gəlmiş sifarişdə panel "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." yazır; uydurma ad və tarix yoxdur."
Harada: real və sınaq · sınaqda Sınaq obyekti 1-in Avqust 2026 sifarişi; realda Fəvvarələr meydanının Sentyabr 2026 sifarişi (B-04) · `/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sınaq: `04-sandbox.md`, Sınaq 1, addım 8 — «Obyektlər» → «Sınaq obyekti 1» → Avqust 2026; qərar panelinin mətnini sözbəsöz yazın (yalnız oxuma); 2) real: B-04-də yazılan panel mətnini köçürün. Koddan: cümlə `components/workflow/labels.ts`:68-dədir və Excel-dən gəlmiş sifarişdə tək göstərilir (`components/workflow/WorkflowPanel.tsx`:199).
Gözlənilən: bəndin özü — panel "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." yazır; ad və tarix yoxdur. "**4.1:** Excel-dən gəlmiş keçmiş sifarişlərdə mətn: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." Saxta audit məlumatı (göndərən, tarix, təsdiqləyən) yaradılmır." (`BRIEFS/TASK-04.md`:29). `04-sandbox.md`, Sınaq 1, addım 8: "Qərar panelində yalnız bu cümlə olmalıdır … Göndərən, təsdiqləyən və tarix olmamalıdır".
İlk auditdə: ""Məlum qiymətlər üzrə məbləğ: 10,949.67 ₼ · 76 sətir · Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb" (Fəvvarələr meydanı, Sentyabr 2026)" (`BRIEFS/TASK-04.md`:10) — B-04
---- operator doldurur ----
Göründü:
  - Sınaq (Sınaq obyekti 1, Avqust 2026) — panelin mətni:
  - Real (Fəvvarələr meydanı, Sentyabr 2026; B-04) — panelin mətni:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-08 — Task 05: panel, sifariş və obyekt səhifəsində LOC/PRD kodu, "Versiya", "Server işləyir" yoxdur
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 68, sitat: "Panel, sifariş və obyekt səhifələrində heç bir LOC/PRD kodu, "Versiya" və "Server işləyir" görmürəm."
Harada: real · İdarəetmə paneli; Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi; onun obyekt səhifəsi · `/dashboard`, `/orders/<nömrə>`, `/locations/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) üç ekranın hər birində `Ctrl+F` ilə `LOC-`, `PRD-`, `Versiya` və `Server işləyir` axtarın; 2) hər ekranda tapılanları yazın, yoxdursa «heç biri». Eyni oxunuşlar B-06, B-09, B-10, B-11, B-12 və B-14-dədir: oradan köçürə bilərsiniz.
Gözlənilən: bəndin özü — üç ekranda heç biri yoxdur. "Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi." (`BRIEFS/TASK-05.md`:32); ""Server işləyir" yalnız problem olanda görünür." (`BRIEFS/TASK-05.md`:33)
İlk auditdə: "Obyekt kodları görünür: LOC-000043 …" (`BRIEFS/TASK-05.md`:8) — B-06 … B-09; "Məhsul kodları görünür: PRD-000110 (sifariş sətirləri)." (`BRIEFS/TASK-05.md`:9) — B-10; ""Versiya 1" sifariş başlığında və obyekt səhifəsinin cədvəlində" (`BRIEFS/TASK-05.md`:10) — B-11, B-12; ""Server işləyir" yazısı başlıqda daim durur." (`BRIEFS/TASK-05.md`:11) — B-14
---- operator doldurur ----
Göründü:
  - İdarəetmə paneli:
  - Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi:
  - Heydər Əliyev Mərkəzinin obyekt səhifəsi:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-09 — Task 05: Fəvvarələrdə "71 → 0 ədəd" və 2 onluqlu qiymət
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 69, sitat: "Fəvvarələr sifarişində "71 → 0 PCS" əvəzinə "71 → 0 ədəd", "32.1273 ₼" əvəzinə 2 onluqlu qiymət görürəm."
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Yay ayaqqabısının «Əsas dəyişikliklər»-dəki yığcam sətrini sözbəsöz yazın (B-17-nin 2-ci addımı; B-18); 2) Zibil paketinin qiymətini ekrandakı kimi yazın (B-28).
Gözlənilən: bəndin özü — "71 → 0 ədəd"; qiymət 2 onluqla. "Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri." (`BRIEFS/TASK-05.md`:34); "Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir." (`BRIEFS/TASK-05.md`:35). Yuvarlaqlaşdırılmış qiymətin özünü brief vermir (brief rəqəm vermir).
İlk auditdə: "Vahidlər ingiliscədir: PCS, …" (`BRIEFS/TASK-05.md`:15) — B-18; "Qiymət 4 onluqla göstərilir: "32.1273 ₼" (Zibil paketi)." (`BRIEFS/TASK-05.md`:17) — B-28
---- operator doldurur ----
Göründü:
  - Yay ayaqqabısının sətri:
  - Zibil paketinin qiyməti:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-10 — Task 05: 1366-da və telefonda məbləğ ₼-dan ayrılmır
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 70, sitat: "1366-da və telefonda heç bir məbləğ ₼-dan ayrılmır."
Harada: real · İdarəetmə paneli; Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi; «Aylıq hesabat» · `/dashboard`, `/orders/<nömrə>`, `/dashboard/monthly` · 1366 və 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) 1366-da üç ekranın hər birində məbləğləri sona qədər gözdən keçirin və ₼-ın rəqəmlə eyni sətirdə olub-olmadığını yazın; 2) eni 390 × 844 edin və eyni üç ekranda təkrarlayın; 3) ₼ aşağı sətrə düşən hər halı ekranı, eni və rəqəmi ilə yazın. B-26 (1366, sifariş sətirləri) və B-27 (390, hesabat və panel) bunun bir hissəsidir: oradan köçürə bilərsiniz.
Gözlənilən: bəndin özü — heç bir məbləğ ₼-dan ayrılmır. "Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir." (`BRIEFS/TASK-05.md`:35)
İlk auditdə: "Məbləğ ₼-dan ayrılıb aşağı sətrə düşür: 1366-da sifariş sətirlərində "99.00 / ₼", mobildə "431,670.91 / ₼"." (`BRIEFS/TASK-05.md`:16) — B-26, B-27
---- operator doldurur ----
Göründü:
  - 1366 — panel:
  - 1366 — sifariş:
  - 1366 — aylıq hesabat:
  - 390 — panel:
  - 390 — sifariş:
  - 390 — aylıq hesabat:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-11 — Task 05: «Yeni məhsullar», «Bu ay yazılmayan məhsullar», «Müqayisə üçün data azdır»
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 71, sitat: "Sifariş səhifəsində "Yeni sifarişlər" əvəzinə "Yeni məhsullar", "Artıq sifariş olunmayanlar" əvəzinə "Bu ay yazılmayan məhsullar", paneldə "Tarixçə natamam" əvəzinə "Müqayisə üçün data azdır" görürəm."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi; İdarəetmə paneli · `/orders/<nömrə>`, `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifarişdə «Niyə dəyişib?» hissələrinin və «Əsas dəyişikliklər» filtrlərinin arasında yeni və bu ay yazılmayan məhsulların adını sözbəsöz yazın (`components/decisions/labels.ts`:14, 17, 130–131); 2) paneldə tarixçəsi az olan obyektlərin sözünü yazın: çip (`coverage/labels.ts`:199) və cədvəlin «Məlumat vəziyyəti» sütunu (`components/dashboard/labels.ts`:228; `components/dashboard/LocationRows.tsx`:306–308). Çip yalnız sayı sıfırdan böyük olanda görünür (`components/dashboard/DashboardSummary.tsx`:215): «Keçən ay»-da görünmürsə, «Son 3 ayın ortalaması» və «Son 6 ayın ortalaması»-nda baxın, oxuduğunuz bazanı yazın və sonra «Keçən ay»-a qayıdın. Beş ekranda köhnə sözlərin axtarışı B-29, B-30 və B-34-dədir.
Gözlənilən: bəndin özü. "| Yeni sifarişlər | Yeni məhsullar |" (`BRIEFS/TASK-05.md`:43); "| Artıq sifariş olunmayanlar / Artıq sifariş olunmur | Bu ay yazılmayan məhsullar |" (`BRIEFS/TASK-05.md`:44); "| Tarixçə natamam | Müqayisə üçün data azdır |" (`BRIEFS/TASK-05.md`:48)
İlk auditdə: ""Yeni sifarişlər", "Artıq sifariş olunmayanlar", … "Tarixçə natamam"" (`BRIEFS/TASK-05.md`:19) — B-29, B-30, B-34
---- operator doldurur ----
Göründü:
  - Sifariş — yeni məhsulların sözü:
  - Sifariş — bu ay yazılmayan məhsulların sözü:
  - Panel — tarixçəsi az olanların sözü (və baza):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-12 — Task 05: fərqli söz cütlərinin heç biri qalmayıb
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 72, sitat: "Yuxarıdakı fərqli söz cütlərinin heç biri qalmayıb."
Harada: real · B-37 … B-43-ün ekranları · — · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: brief-in yeddi söz cütü B-37 … B-43-dədir. Onların hökmlərini aşağıya köçürün.
Gözlənilən: bəndin özü — yeddi cütün heç biri qalmayıb. "Bütün tətbiqdə təsdiqlənmiş söz siyahısı işlənir; eyni anlayış hər yerdə eyni adla çıxır." (`BRIEFS/TASK-05.md`:31)
İlk auditdə: "**Eyni anlayış üçün fərqli sözlər** (bir qismi Task 1–2-dən sonra aşkarlanıb):" (`BRIEFS/TASK-05.md`:21) — B-37 … B-43
---- operator doldurur ----
Göründü:
  - B-37-nin hökmü:
  - B-38-in hökmü:
  - B-39-un hökmü:
  - B-40-ın hökmü:
  - B-41-in hökmü:
  - B-42-nin hökmü:
  - B-43-ün hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-13 — Task 05: Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb
Mənbə: `BRIEFS/TASK-05.md`, «Acceptance — biznes dili ilə», sətir 73, sitat: "Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb."
Harada: real · İdarəetmə paneli, sifariş, obyekt səhifəsi, «Obyektlər», «Aylıq hesabat» · — · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: sözlər E bölməsinin sətirlərində oxunur — Task 2-ninkilər E-12 … E-17-də, Task 1b-ninkilər E-04, E-05-də və paneldə (başlığın çıxma sətri, çiplər — B-70, B-72), Task 3-ünkülər E-19, E-20, E-21-də. Aşağıdakı hər söz üçün onu harada olduğu kimi gördüyünüzü (ekran) və ya «görmədim» yazın; söz dəyişibsə, ekrandakını sözbəsöz yazın.
Gözlənilən: bəndin özü. "**Task 2:** "Qiymət yoxdur" (kəhrəba), "Daxili təminat" (neytral), "N sətirdə qiymət yoxdur", "N sətir daxili təminat (ödənişsiz)", "Daxili: Azpetrol baza"." (`BRIEFS/TASK-05.md`:53); "**Task 1b:** "Müqayisə olunan", "Sifariş qeydə alınmayıb", "Müqayisə bazası yoxdur", "Qiymət yoxdur · N obyekt", "10 obyektin sifarişində qiyməti olmayan sətir var"." (`BRIEFS/TASK-05.md`:54); "**Task 3:** "Sistemdə hələ sifarişi yoxdur" və obyektlərin tam adları: Heydər Əliyev Mərkəzi, Bakı Konqres Mərkəzi, Hökumət evi və ətrafı parklar, Space TV qarşısı, Təmir-tikinti (ərazidə olan dibçəklərə qulluq) və s." (`BRIEFS/TASK-05.md`:55)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - "Qiymət yoxdur" (kəhrəba):
  - "Daxili təminat" (neytral):
  - "N sətirdə qiymət yoxdur":
  - "N sətir daxili təminat (ödənişsiz)":
  - "Daxili: Azpetrol baza" (E-17):
  - "Müqayisə olunan":
  - "Sifariş qeydə alınmayıb" (E-04):
  - "Müqayisə bazası yoxdur" (E-05):
  - "Qiymət yoxdur · N obyekt":
  - "10 obyektin sifarişində qiyməti olmayan sətir var":
  - "Sistemdə hələ sifarişi yoxdur" (E-20):
  - Obyektlərin tam adları (E-21):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-14 — Task 06: Fəvvarələrdə birinci hissə «Bu ay yazılmayan məhsullar», yaşıl, seçilir
Mənbə: `BRIEFS/TASK-06.md`, «Acceptance — biznes dili ilə», sətir 38, sitat: "Fəvvarələr sifarişində birinci sətir "Bu ay yazılmayan məhsullar −8,093.70 ₼"-dır, yaşıl rəngdədir (xərc azalıb) və digərlərindən seçilir."
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: birinci hissənin adı və məbləği B-44-dən, necə seçildiyi B-45-dən, rəngi B-46-dan köçürülür.
Gözlənilən: bəndin özü — birinci hissə «Bu ay yazılmayan məhsullar −8,093.70 ₼», yaşıl, digərlərindən seçilir. "Hissələr mütləq böyüklüyə görə sıralanır; ən böyüyü birinci və seçilmiş görünür." (`BRIEFS/TASK-06.md`:14); "**9.1:** Xərc artımı qırmızı, azalma yaşıl." (`BRIEFS/TASK-06.md`:24)
İlk auditdə: "əsas səbəb, "Artıq sifariş olunmayanlar −8,093.70 ₼", dördüncü sətirdədir" (`BRIEFS/TASK-06.md`:7) — B-44; "Mənfi zolaq boz rəngdədir" (`BRIEFS/TASK-06.md`:9) — B-46
---- operator doldurur ----
Göründü:
  - Birinci hissə (ad və məbləğ; B-44):
  - Necə seçilir (B-45):
  - Rəngi (B-46):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-15 — Task 06: Heydər Əliyevdə birinci hissə «Yeni məhsullar», qırmızı
Mənbə: `BRIEFS/TASK-06.md`, «Acceptance — biznes dili ilə», sətir 39, sitat: "Heydər Əliyevdə birinci sətir "Yeni məhsullar +29,691.52 ₼"-dır və qırmızıdır (xərc artıb)."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-07-nin səhifəsi, «Keçən ay»; 2) «Niyə dəyişib?»-in birinci hissəsinin adını, məbləğini və zolağının rəngini yazın (hissələrin siyahısı E-07-dədir); 3) Sabun variant əlaqəsinin təsdiqlənib-təsdiqlənmədiyini A-07-dən götürün.
Gözlənilən: bəndin özü — birinci hissə «Yeni məhsullar +29,691.52 ₼», qırmızı. "Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" hissələrinin hər biri 750.00 ₼ azala bilər; cəmi dəyişmir." (`BRIEFS/TASK-06.md`:28)
İlk auditdə: "Hissələrin sırası sabitdir (Yeni, Miqdar, Qiymət, Artıq, Xidmətlər), böyüklüyə görə deyil." (`BRIEFS/TASK-06.md`:7) — B-44
---- operator doldurur ----
Göründü:
  - Birinci hissə (ad və məbləğ):
  - Rəngi:
  - A-07-yə görə Sabun əlaqəsi təsdiqlənib (bəli / xeyr):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-16 — Task 06: cəm tutanda ziddiyyətli xəbərdarlıq yoxdur; qiymətsiz sətir olanda konkret
Mənbə: `BRIEFS/TASK-06.md`, «Acceptance — biznes dili ilə», sətir 40, sitat: "Hissələr cəmə tam bərabər olanda ziddiyyətli xəbərdarlıq görmürəm. Qiymətsiz sətir olanda xəbərdarlıq nəyin çatışmadığını konkret deyir."
Harada: real · Fəvvarələr meydanı, Heydər Əliyev Mərkəzi və Nərimanov heykəlinin Sentyabr 2026 sifarişləri, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: 1) birinci yarı — Fəvvarələr meydanı (B-48) və Heydər Əliyev Mərkəzi (B-49): xəbərdarlığı və cəmin tutub-tutmadığını (E-09, E-07) köçürün; 2) ikinci yarı — Nərimanov heykəlinin sifarişində qiyməti olmayan sətir var (E-16): B-50-dən xəbərdarlığı və onun hansı məhsulu və məbləği dediyini köçürün.
Gözlənilən: bəndin özü. "Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir." (`BRIEFS/TASK-06.md`:16)
İlk auditdə: "Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10) — B-48, B-49, B-50
---- operator doldurur ----
Göründü:
  - Fəvvarələr meydanı — xəbərdarlıq (B-48) və E-09-un hökmü:
  - Heydər Əliyev Mərkəzi — xəbərdarlıq (B-49) və E-07-nin hökmü:
  - Nərimanov heykəli — xəbərdarlıq və dediyi (B-50):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-17 — Task 06: müqayisə sətrində baza oxunur
Mənbə: `BRIEFS/TASK-06.md`, «Acceptance — biznes dili ilə», sətir 41, sitat: "Müqayisə sətrində hansı rəqəmin baza olduğunu oxuyuram."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, başlıq, «Keçən ay» və «Son 6 ayın ortalaması» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-10-un səhifəsi, «Keçən ay»: başlıqdakı müqayisə sətrini sözbəsöz yazın — «Müqayisə: …», rəqəmlərin adları və rəqəmlər (`components/decisions/DecisionHeadline.tsx`:114–138); 2) «Son 6 ayın ortalaması»-ndakı sətri B-51-dən köçürün.
Gözlənilən: bəndin özü — hansı rəqəmin baza olduğu yazılıb. "Müqayisə sətrində "baza" və "fərq" açıq yazılır." (`BRIEFS/TASK-06.md`:17). «Keçən ay»-da fərq: "cəmi +23,852.70" (`BRIEFS/TASK-06.md`:28). Bazanın rəqəmini brief vermir (brief rəqəm vermir).
İlk auditdə: "Heydər Əliyev, Son 6 ay: "17,583.62 ₼" yanında böyük yaşıl fərq və faiz durur, hansı rəqəmin baza olduğu yazılmır." (`BRIEFS/TASK-06.md`:11) — B-51
---- operator doldurur ----
Göründü:
  - «Keçən ay» — müqayisə sətri:
  - «Son 6 ayın ortalaması» — müqayisə sətri (B-51):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-18 — Task 07: Heydər Əliyev kartında traktor, məbləğ və pay; pay sərhədi keçmir
Mənbə: `BRIEFS/TASK-07.md`, «Acceptance — biznes dili ilə», sətir 38, sitat: "Paneli açanda Heydər Əliyev kartında traktoru, məbləğini və "artımların …%-i" payını görürəm; pay 74%-dən çox deyil. Səbəbi sifarişə girmədən deyə bilirəm. (Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra yeni məhsulların cəmi 28,941.52 ₼-a düşür və bu sərhəd 76%-ə qalxır.)"
Harada: real · İdarəetmə paneli, Heydər Əliyev Mərkəzinin diqqət kartı, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: kartın mal sətri və Sabun əlaqəsinin vəziyyəti B-52-dədir (A-07). Onları köçürün və hansı sərhədin tətbiq olunduğunu yazın: əlaqə təsdiqlənməyibsə 74 %, təsdiqlənibsə 76 %.
Gözlənilən: bəndin özü — traktor, məbləğ və "artımların …%-i"; pay 74 %-dən çox deyil, Sabun əlaqəsi təsdiqlənibsə 76 %-dən çox deyil. "Heydər Əliyev (Keçən ay): "Traktor qazonbiçən RT-6127.1 ZL — +21,900 ₼ (artımların …%-i)". Təkcə yeni məhsulların cəmi 29,691.52 ₼ olduğu üçün pay 74%-dən çox ola bilməz." (`BRIEFS/TASK-07.md`:16)
İlk auditdə: "kart "Əsas səbəb: Yeni sifarişlər +29,691.52 ₼" yazır. … Traktor qazonbiçən RT-6127.1 ZL, 0 → 1 ədəd, +21,900.00 ₼" (`BRIEFS/TASK-07.md`:7) — B-52
---- operator doldurur ----
Göründü:
  - Mal sətri (ad, məbləğ, pay; B-52):
  - A-07-yə görə Sabun əlaqəsi təsdiqlənib (bəli / xeyr):
  - Tətbiq olunan sərhəd (74 % / 76 %):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-19 — Task 07: Fəvvarələr kartında "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)"; pay ≤ 25 %
Mənbə: `BRIEFS/TASK-07.md`, «Acceptance — biznes dili ilə», sətir 39, sitat: "Fəvvarələr kartında (Keçən ay) "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)" görünür; pay 25%-dən çox deyil."
Harada: real · İdarəetmə paneli, Fəvvarələr meydanının diqqət kartı, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: kart və onun mal sətri B-54-dədir. Onları köçürün. Kart yoxdursa, bunu yazın və `Hökm:`-ə «yoxlanıla bilmədi (kart yoxdur)» yazın: koddan, cədvəl sətri malı göstərmir (`components/dashboard/LocationRows.tsx`:258–275).
Gözlənilən: bəndin özü — "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)"; pay 25 %-dən çox deyil. "Təkcə bu ay yazılmayan məhsulların cəmi 8,093.70 ₼ olduğu üçün pay 25%-dən çox ola bilməz." (`BRIEFS/TASK-07.md`:17)
İlk auditdə: "Fəvvarələr meydanı, −2,584.45: … ən böyük mal Yay ayaqqabısıdır, −1,988.00 (71 → 0 ədəd)." (`BRIEFS/TASK-07.md`:10) — B-54
---- operator doldurur ----
Göründü:
  - Kart (var / yox; başlığı):
  - Mal sətri (ad, məbləğ, pay; B-54):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-20 — Task 07: baza dəyişəndə pay yenilənir və heç yerdə 100 %-i keçmir
Mənbə: `BRIEFS/TASK-07.md`, «Acceptance — biznes dili ilə», sətir 40, sitat: "Bazanı dəyişəndə pay yeni bazaya görə yenilənir və heç bir bazada, heç bir kartda 100%-i keçmir."
Harada: real · İdarəetmə paneli, diqqət kartları, beş baza · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panelin baza seçicisində (`pages/ManagementDashboardPage.tsx`:263; `components/analytics/format.ts`:37–43, 55–60) bazaları növbə ilə seçin: «Keçən ay», «Son 3 ayın ortalaması», «Son 6 ayın ortalaması», «Bütün dövrün ortalaması», «Xüsusi seçim»; 2) hər bazada hər kartın obyektini və mal sətrindəki payı — "(artımların N%-i)" və ya "(azalmaların N%-i)" — yazın (`components/dashboard/AttentionSection.tsx`:193–205); malı olmayan kartı «mal yoxdur» kimi yazın; 3) «Xüsusi seçim»-də Sentyabr 2026-dan əvvəlki bir neçə ay seçin və seçdiyiniz ayları yazın (`format.ts`:51–52); 4) sonda «Keçən ay»-a qayıdın. Baza seçmək heç nə yazmır.
Gözlənilən: bəndin özü — pay bazaya görə dəyişir və heç bir kartda 100 %-i keçmir. "Artımda artan, azalmada azalan bütün məhsulların təsirləri toplanır, ona görə pay heç vaxt 100%-i keçmir." (`BRIEFS/TASK-07.md`:15); "Pay seçilmiş müqayisə bazasına görə hesablanır (Task 1)." (`BRIEFS/TASK-07.md`:18). Hər bazanın paylarını brief vermir (brief rəqəm vermir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Keçən ay» — hər kartın obyekti və payı:
  - «Son 3 ayın ortalaması»:
  - «Son 6 ayın ortalaması»:
  - «Bütün dövrün ortalaması»:
  - «Xüsusi seçim» (seçilən aylar və paylar):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-21 — Task 08: cəmi sətri — Yanvar … Sentyabr və İl; Sentyabr panellə eyni; faiz yoxdur
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 46, sitat: "Cəmi sətrində audit vaxtındakı data ilə bu rəqəmləri görürəm: Yanvar 11,084.35 · Fevral 25,652.22 · Mart 48,296.72 · Aprel 49,106.54 · May 62,556.61 · İyun 70,992.62 · İyul 48,430.78 · Avqust 44,340.78 · Sentyabr 71,210.29 · İl 431,670.91 ₼. Sentyabr paneldəki rəqəmlə eynidir. Bu sətirdə faiz yoxdur."
Harada: real · «Aylıq hesabat», cəmi sətri; İdarəetmə paneli · `/dashboard/monthly`, `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) cəmi sətrində (`components/reports/MonthlyReportTable.tsx`:150–169) hər ayın rəqəmini Yanvardan Sentyabra qədər ekrandakı kimi yazın; 3) sətrin sonundakı ilin cəmini yazın («İl cəmi» sütunu — `MonthlyReportTable.tsx`:35, 165–169); 4) bu sətirdə hər hansı faiz görünürmü, yazın; 5) paneldəki Sentyabr rəqəmini B-56-dan köçürün.
Gözlənilən: bəndin özü — Yanvar 11,084.35 · Fevral 25,652.22 · Mart 48,296.72 · Aprel 49,106.54 · May 62,556.61 · İyun 70,992.62 · İyul 48,430.78 · Avqust 44,340.78 · Sentyabr 71,210.29 · İl 431,670.91 ₼; Sentyabr = panel; faiz yoxdur. "**8.1:** Cəmi sətrində aydan-aya faiz göstərilmir." (`BRIEFS/TASK-08.md`:30)
İlk auditdə: "Ayların cəmi sətri yoxdur. Sentyabrın cəmini paneldəki 71,210.29 ₼ ilə yoxlamaq olmur." (`BRIEFS/TASK-08.md`:7) — B-56
---- operator doldurur ----
Göründü:
  - Yanvar:
  - Fevral:
  - Mart:
  - Aprel:
  - May:
  - İyun:
  - İyul:
  - Avqust:
  - Sentyabr:
  - İl:
  - Paneldə Sentyabr:
  - Faiz var / yox:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-22 — Task 08: Heydər Əliyev İyun 36,010.19 vurğulanır
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 47, sitat: "Heydər Əliyevin İyun hücrəsi (36,010.19 ₼) vurğulanır: əvvəlki 3 mövcud ayın (Mart–May) ortalaması 14,458.58 ₼-dır, fərq +149%."
Harada: real · «Aylıq hesabat», Heydər Əliyev Mərkəzinin İyun hücrəsi · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: hücrənin məbləği, necə seçildiyi və üzərinə gələndə çıxan yazı B-57-dədir. Onları köçürün və yazıdakı ortalamanı və fərqi ayrıca yazın (koddan: «Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması …, fərq …» — `terminology/terms.ts`:127–129).
Gözlənilən: bəndin özü — 36,010.19 ₼ vurğulanır; ortalama 14,458.58 ₼; fərq +149 %. "**8.2:** Anomaliya = əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox fərq. Yetərli tarixçə (3 mövcud ay) yoxdursa, anomaliya göstərilmir." (`BRIEFS/TASK-08.md`:31)
İlk auditdə: "Heydər Əliyev İyun 36,010.19 ₼ (+85.48%) digər rəqəmlərin içində itir." (`BRIEFS/TASK-08.md`:8) — B-57
---- operator doldurur ----
Göründü:
  - Hücrənin məbləği:
  - Vurğulanır (bəli / xeyr; necə):
  - Yazıdakı ortalama və fərq:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-23 — Task 08: Heydər Əliyev Avqust 11,985.02 vurğulanmır
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 48, sitat: "Heydər Əliyevin Avqust hücrəsi (11,985.02 ₼) vurğulanmır: əvvəlki 3 ayın (May–İyul) ortalamasından fərq −48%-dir."
Harada: real · «Aylıq hesabat», Heydər Əliyev Mərkəzinin Avqust hücrəsi · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-56-nın səhifəsi; 2) Heydər Əliyev Mərkəzinin Avqust hücrəsinin məbləğini yazın; 3) hücrənin qonşularından fon rəngi və ya qalın yazı ilə seçilib-seçilmədiyini yazın; 4) üzərinə gəlin və çıxan yazını sözbəsöz yazın.
Gözlənilən: bəndin özü — 11,985.02 ₼ vurğulanmır (fərq −48 %). "**8.2:** Anomaliya = əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox fərq." (`BRIEFS/TASK-08.md`:31)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Hücrənin məbləği:
  - Vurğulanır (bəli / xeyr):
  - Üzərinə gələndə çıxan yazı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-24 — Task 08: Heydər Əliyev Yanvar, Fevral, Mart vurğulanmır
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 49, sitat: "Heydər Əliyevin Yanvar, Fevral və Mart hücrələri vurğulanmır: əvvəlki 3 mövcud ay yoxdur."
Harada: real · «Aylıq hesabat», Heydər Əliyev Mərkəzinin Yanvar, Fevral və Mart hücrələri · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) C-23-ün 2–4-cü addımları, üç hücrənin hər biri üçün.
Gözlənilən: bəndin özü — üç hücrə vurğulanmır. "Yetərli tarixçə (3 mövcud ay) yoxdursa, anomaliya göstərilmir." (`BRIEFS/TASK-08.md`:31)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Yanvar (məbləğ; vurğulanır bəli / xeyr):
  - Fevral:
  - Mart:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-25 — Task 08: Oktyabr–Dekabr "sifariş yoxdur" demir, fərqlənir
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 50, sitat: "Oktyabr–Dekabr "sifariş yoxdur" demir və keçmiş boş aylardan fərqlənir."
Harada: real · «Aylıq hesabat», Oktyabr–Dekabr sütunları · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: gələcək ayların, keçmiş boş bir hücrənin və oxuma tarixinin oxunuşu B-58-dədir. Onları köçürün.
Gözlənilən: bəndin özü — Oktyabr–Dekabr "sifariş yoxdur" demir və keçmiş boş aylardan fərqlənir. "Gələcək aylar keçmiş boş aylardan fərqlənir və "sifariş yoxdur" demir." (`BRIEFS/TASK-08.md`:19). Koddan: ay yalnız oxuyanın təqvim ayından sonra gələcək sayılır, cari ay gələcək deyil (`components/analytics/format.ts`:225–232); audit Oktyabr 2026-da aparılırsa, Oktyabr gələcək ay kimi görünməyəcək — oxuma tarixini `Göründü:`-də yazın.
İlk auditdə: "Gələcək aylar (Oktyabr–Dekabr) keçmişdə sifariş olmayan aylarla eyni görünür: "—" və izahı "Oktyabr 2026: sifariş yoxdur"." (`BRIEFS/TASK-08.md`:9) — B-58
---- operator doldurur ----
Göründü:
  - Oktyabr, Noyabr, Dekabr (B-58):
  - Keçmiş boş hücrə (B-58):
  - Oxuma tarixi:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-26 — Task 08: Bayıl yolu Sentyabr — həm ⚠1, həm faiz
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 51, sitat: "Bayıl yolunun Sentyabr hücrəsində həm ⚠1, həm faiz görünür."
Harada: real · «Aylıq hesabat», Bayıl yolunun Sentyabr hücrəsi · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: hücrənin oxunuşu B-59-dadır. Onu köçürün.
Gözlənilən: bəndin özü — hücrədə həm ⚠1, həm faiz. "⚠ və faiz eyni hücrədə birlikdə görünür." (`BRIEFS/TASK-08.md`:20). Faizin rəqəmini brief vermir (brief rəqəm vermir).
İlk auditdə: "Bayıl yolunun Sentyabr hücrəsində yalnız "⚠1" var, panel isə eyni ay üçün +254.03% göstərir." (`BRIEFS/TASK-08.md`:10) — B-59
---- operator doldurur ----
Göründü:
  - Hücrədə (məbləğ, faiz, ⚠ N; B-59):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-27 — Task 08: 1200 px-də 12 aylıq cədvəl
Mənbə: `BRIEFS/TASK-08.md`, «Acceptance — biznes dili ilə», sətir 52, sitat: "1200px enində də 12 aylıq cədvəli görürəm."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: 1200 endə cədvəlin oxunuşu B-61-dədir və H-22-dədir. B-61-in oxunuşunu və H-22-nin hökmünü köçürün.
Gözlənilən: bəndin özü — 1200 endə 12 aylıq cədvəl görünür. "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23)
İlk auditdə: "12 aylıq cədvəl yalnız 1280px-dən enli ekranda açılır. 1150–1279px noutbukda rəhbər yalnız bir ayın kart siyahısını görür." (`BRIEFS/TASK-08.md`:12) — B-61
---- operator doldurur ----
Göründü:
  - 1200-də cədvəl / kart siyahısı (B-61):
  - H-22-nin hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-28 — Task 09: 1366 × 768-də sürüşdürmədən ən azı bir diqqət kartı
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 60, sitat: "1366×768 ekranda paneli açanda aşağı sürüşdürmədən ən azı bir diqqət kartı görürəm."
Harada: real · İdarəetmə paneli, sürüşdürmədən · `/dashboard` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: eyni oxunuş B-64-dədir və H-01-dədir. B-64-ün oxunuşunu və H-01-in hökmünü köçürün.
Gözlənilən: bəndin özü — sürüşdürmədən ən azı bir diqqət kartı görünür. "Birinci ekranda ən azı birinci diqqət obyekti görünür." (`BRIEFS/TASK-09.md`:24)
İlk auditdə: ""Hansı obyektə baxım" sualının cavabı, yəni diqqət kartları, isə birinci ekranın altında qalır." (`BRIEFS/TASK-09.md`:7) — B-64
---- operator doldurur ----
Göründü:
  - Sürüşdürmədən görünən ilk kart (B-64):
  - H-01-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-29 — Task 09: kart başlığı təkrarlanmır; "ən böyük faiz" kartı həqiqətən ən böyük faizlidir
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 61, sitat: "Heç bir kart başlığı təkrarlanmır; "ən böyük faiz" yazılan kart həqiqətən ən böyük faizə malikdir."
Harada: real · İdarəetmə paneli, diqqət kartları və «Bütün obyektlər», «Keçən ay» və «Son 3 ayın ortalaması» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) kart başlıqlarını B-65-dən köçürün və təkrarlanan başlıq olub-olmadığını yazın; 2) «Ən böyük faiz dəyişməsi» kartının obyektini və faizini yazın (B-66); 3) kartın ⓘ izahı hansı obyektlərin yarışa daxil olduğunu deyir (B-67): «Bütün obyektlər» cədvəlində hər sətrin bazasını və faizini oxuyun və bazası ən azı 100 ₼, dəyişməsi ən azı 50 % olan obyektlər arasında ən böyük faizi olanı yazın. Cədvəldə faizə görə sıralama yoxdur (`components/dashboard/labels.ts`:93–97): sütunu gözlə oxuyun; 4) 2–3-cü addımları «Son 3 ayın ortalaması»-nda təkrarlayın (B-67), sonra «Keçən ay»-a qayıdın.
Gözlənilən: bəndin özü — başlıq təkrarlanmır; faiz kartı şərtə uyan obyektlər arasında ən böyük faizlidir. "Kart başlıqları kartın niyə seçildiyini düzgün deyir: eyni başlıq təkrarlanmır, "ən böyük" yalnız həqiqətən ən böyük olana yazılır." (`BRIEFS/TASK-09.md`:25). Koddan: "Faiz yalnız müqayisə bazası ən azı 100 ₼ olan və ən azı 50% dəyişən obyektlər arasında müqayisə olunur." (`components/dashboard/labels.ts`:185–186). Faizləri brief vermir (brief rəqəm vermir).
İlk auditdə: ""Ən böyük məbləğ artımı" iki kartda təkrarlanır (Heydər Əliyev və Novxanı)." (`BRIEFS/TASK-09.md`:9) — B-65; ""Ən böyük faiz dəyişməsi" də iki kartdadır (Bayıl yolu +254.03% və Milli Konservatoriya +480.01%)." (`BRIEFS/TASK-09.md`:10) — B-66; ""Son 3 ay" bazasında Novxanının artımı +268.05%-dir, amma "Ən böyük faiz dəyişməsi" kartı Milli Konservatoriyaya (+85.55%) verilib." (`BRIEFS/TASK-09.md`:11) — B-67
---- operator doldurur ----
Göründü:
  - Kart başlıqları (təkrar var / yox; B-65):
  - «Keçən ay» — faiz kartı (obyekt, faiz) və cədvəldə şərtə uyan ən böyük faiz (obyekt, faiz):
  - «Son 3 ayın ortalaması» — eyni:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-30 — Task 09: Heydər Əliyev kartında artım qırmızı, Fəvvarələrdə azalma yaşıl; "xərc artıb / azalıb"
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 62, sitat: "Heydər Əliyev kartında artım qırmızı, Fəvvarələr kartında azalma yaşıl görünür; izahda "xərc artıb / azalıb" yazılır."
Harada: real · İdarəetmə paneli, Heydər Əliyev Mərkəzinin və Fəvvarələr meydanının kartları, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) B-69-un 2–3-cü addımlarını bu iki kart üçün edin (oradan köçürə bilərsiniz); 2) Fəvvarələr meydanının kartı yoxdursa, bunu yazın və `Hökm:`-ə «yoxlanıla bilmədi (Fəvvarələr meydanının kartı yoxdur)» yazın.
Gözlənilən: bəndin özü — Heydər Əliyev: qırmızı, «xərc artıb»; Fəvvarələr: yaşıl, «xərc azalıb». "**9.1:** Xərc artımı qırmızı, azalma yaşıl; "yaxşı/pis" yox, xərcin istiqaməti kimi təqdim olunur." (`BRIEFS/TASK-09.md`:45)
İlk auditdə: "Yaşıl rəng xərcin artmasını göstərir və "yaxşı" kimi oxunur." (`BRIEFS/TASK-09.md`:13) — B-69
---- operator doldurur ----
Göründü:
  - Heydər Əliyev Mərkəzinin kartı: rəng və cümlə:
  - Fəvvarələr meydanının kartı: rəng və cümlə:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-31 — Task 09: «Qiymət yoxdur · 10 obyekt» çipi cədvəldə həmin 10 obyekti saxlayır
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 63, sitat: ""Qiymət yoxdur · 10 obyekt" çipinə basanda cədvəldə həmin 10 obyekt qalır."
Harada: real · İdarəetmə paneli, «Qiymət yoxdur · N obyekt» çipi (`coverage/labels.ts`:194–196) və «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; 2) çipin yazısını və sayını yazın; 3) çipi basın (bu, cədvəlin süzgəcidir, heç nə yazmır — `components/dashboard/DashboardSummary.tsx`:197–224, 266–272); 4) cədvəldə qalan sətirləri sayın və obyektlərini yazın; 5) çipi yenə basıb süzgəci götürün.
Gözlənilən: bəndin özü — çip 10 obyekt deyir və cədvəldə həmin 10 obyekt qalır. "Hər çip klik olunur və cədvəli həmin obyektlərə süzür; sıfır saylı çip görünmür. "Qiymət yoxdur · N obyekt" həmin obyektləri göstərir." (`BRIEFS/TASK-09.md`:28)
İlk auditdə: "Çiplər klik olunmur. … Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur." (`BRIEFS/TASK-09.md`:14) — B-70, B-72
---- operator doldurur ----
Göründü:
  - Çipin sayı:
  - Basılanda cədvəldə qalan sətirlər (say və obyektlər):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-32 — Task 09: 27 obyekt bir səhifədə, ən böyük dəyişmədən başlayır
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 64, sitat: "Cədvəldə 27 obyekt bir səhifədədir və ən böyük dəyişmədən başlayır."
Harada: real · İdarəetmə paneli, «Bütün obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: sətir sayı və səhifələr B-74-dədir, sıralama və ilk sətirlər B-73-dədir. Onları köçürün.
Gözlənilən: bəndin özü — 27 obyekt bir səhifədə; birinci sətir ən böyük dəyişmədir. "27 sətir bir səhifədədir;" "varsayılan sıra dəyişmənin böyüklüyünə görədir;" (`BRIEFS/TASK-09.md`:30–31)
İlk auditdə: "varsayılan sıra obyekt adına görədir, dəyişməyə görə yox;" (`BRIEFS/TASK-09.md`:16) — B-73; "26 sətir iki səhifəyə bölünürdü (ikinci səhifədə yalnız İDEA); 27 obyektlə də iki səhifədir;" (`BRIEFS/TASK-09.md`:17) — B-74
---- operator doldurur ----
Göründü:
  - Sətir sayı və səhifələr (B-74):
  - Sıralama və ilk sətirlər (B-73):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-33 — Task 09: Heydər Əliyev kartından sifarişə keçib qayıdanda kartın yanına dönür
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 65, sitat: "Heydər Əliyev kartından sifarişə keçib qayıdanda həmin kartın yanına dönürəm."
Harada: real · İdarəetmə paneli → Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi → brauzerin **Geri** düyməsi · `/dashboard`, `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; Heydər Əliyev Mərkəzinin kartı ekranın ortasına gələnə qədər aşağı sürüşdürün; 2) kartda «Detallara bax»-ı basın (`components/dashboard/AttentionSection.tsx`:211–236); 3) sifariş səhifəsində bir az aşağı sürüşdürün; 4) brauzerin **Geri** düyməsini basın — sifariş səhifəsində panelə qaytaran öz düyməsi yoxdur («Brief-in sözləri və ekranın sözləri»); 5) panelin harada açıldığını yazın: Heydər Əliyev Mərkəzinin kartının yanında, yoxsa səhifənin başında; 6) bazanın qayıtması E-02-dədir: E-02-nin hökmünü köçürün.
Gözlənilən: bəndin özü — Geri-dən sonra panel həmin kartın yanında açılır. "Geri qayıdanda panel qaldığım yerdən açılır." (`BRIEFS/TASK-09.md`:33)
İlk auditdə: "Sifarişdən geri qayıdanda panel ən yuxarıdan açılır və rəhbər baxdığı kartı itirir." (`BRIEFS/TASK-09.md`:20) — B-78
---- operator doldurur ----
Göründü:
  - Geri-dən sonra panel harada açıldı:
  - E-02-nin hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### C-34 — Task 09: «Keçən ay»-da başlıqdakı çıxma göstərilən fərqə bərabərdir
Mənbə: `BRIEFS/TASK-09.md`, «Acceptance — biznes dili ilə», sətir 66, sitat: ""Keçən ay" bazasında başlıqdakı çıxma (71,030.25 − 44,340.78) göstərilən fərqə bərabərdir."
Harada: real · İdarəetmə paneli, başlıq, «Keçən ay» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) İdarəetmə paneli, «Keçən ay»; 2) başlıqdakı çıxma sətrinin üç rəqəmini ekrandakı kimi yazın: müqayisə olunan məbləğ, baza və fərq (`components/dashboard/DashboardSummary.tsx`:152–185); 3) birincidən ikincini çıxın və nəticənin göstərilən fərqə bərabər olub-olmadığını yazın; 15b hesabı yenidən yoxlayır; 4) EXPO-nun ayrıca göstərilməsi E-05-dədir: E-05-in hökmünü köçürün.
Gözlənilən: bəndin özü — 71,030.25 − 44,340.78 göstərilən fərqə bərabərdir. "İstisna olanda fərq müqayisə olunan məbləğin yanında görünür: 71,030.25 − 44,340.78 = +26,689.47." (`BRIEFS/TASK-09.md`:34)
İlk auditdə: "Müqayisədən kənar obyekt olanda (Keçən ay: EXPO) fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox. Rəhbər ay cəmindən çıxanda başqa rəqəm alır." (`BRIEFS/TASK-09.md`:21) — B-79
---- operator doldurur ----
Göründü:
  - Müqayisə olunan məbləğ:
  - Baza:
  - Göstərilən fərq:
  - E-05-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

## D. Sahibin qərarları 4.1 … 16.1

## E. Regress: Task 1–3 və ilk auditdə yaxşı olanlar

Bu bölmə `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar» bölməsinin nümunələrini (sətir 33–38) yoxlayır: hər
nümunə ayrıca sətirdir və `Mənbə:`-də brief-in sətri sözbəsöz verilib. Nümunələr Sentyabr 2026 datası ilə yoxlanır
(`BRIEFS/TASK-15.md`:40; protokol §6.3). Hamısı real datadır, Rəhbər hesabı ilə, 1366 × 768 endə, başqa en
yazılmayıbsa.

- **Sifariş səhifəsini açmaq.** «Obyektlər» (`/locations`) → obyektin adı → obyekt səhifəsində Sentyabr 2026
  sətrindəki «Müqayisə» (`pages/LocationDetailPage.tsx`:322–333), ya da paneldə obyektin «Detallara bax»-ı
  (`components/dashboard/AttentionSection.tsx`:211–236). Baza sifariş səhifəsinin seçicisində dəyişdirilir
  (`components/decisions/DecisionHeadline.tsx`:105–111; `components/analytics/BasisPicker.tsx`:69–83). Panel və obyekt
  səhifəsi seçilmiş bazanı sifariş səhifəsinə ötürür (`analytics/basisParams.ts`:183–195).
- **Task 2-nin ekranları** koddan tapılıb: `pricing/labels.ts`-dəki `missingPriceShortLabel`, `internalSupplyShortLabel`,
  `missingPriceCount`, `internalSupplyCount` və paneldəki `MissingPriceMark`-ın işləndiyi yerlər axtarılıb. Bir obyektin
  bir ayı üçün say göstərən ekranlar bunlardır: İdarəetmə paneli (E-12), Aylıq hesabat (E-13), Obyektlər (E-14), obyekt
  səhifəsi (E-15), sifariş səhifəsi (E-16). «Məhsul tarixçəsi» pəncərəsi məhsul üzrədir, obyektin ayı üzrə deyil.
  «Təsdiq gözləyənlər» yalnız təsdiq gözləyən sifarişin sayını göstərir (`components/approvals/ApprovalRows.tsx`:184–185):
  Nərimanov heykəlinin Sentyabr sifarişi orada görünsə, onu E-16-nın `Qeyd:` sətrində yazın. Import ekranları real
  datada açılmır (A-13).
- Brief-in hissə adları ilə ekranın hissə adları fərqlidir: yuxarıdakı «Brief-in sözləri və ekranın sözləri» cədvəli.

### E-01 — Task 1: Heydər Əliyev Mərkəzi, «Son 3 ayın ortalaması» — panel və sifariş səhifəsi
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 33, sitat: "**Task 1:** Heydər Əliyev, "Son 3 ay" — panel kartı və sifariş səhifəsi eyni rəqəmi göstərir; "Geri" bazanı qaytarır."
Harada: real · «İdarəetmə paneli», sonra sifariş səhifəsi · `/dashboard` → `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «İdarəetmə paneli»-ni açın; «Dövr» siyahısında Sentyabr 2026 olduğunu yoxlayın (`pages/ManagementDashboardPage.tsx`:245–260); 2) «Müqayisə» seçicisində «Son 3 ayın ortalaması»-nı basın (`components/analytics/BasisPicker.tsx`:69–83; `components/analytics/format.ts`:39); 3) Heydər Əliyev Mərkəzini «Diqqət tələb edən obyektlər» kartlarında axtarın (`components/dashboard/AttentionSection.tsx`:61–75); kartı yoxdursa, «Bütün obyektlər» cədvəlində onun sətrini tapın (`pages/ManagementDashboardPage.tsx`:304); hansını oxuduğunuzu yazın; 4) kartda məbləği, fərqi və faizi oxuyun (`AttentionSection.tsx`:109–123); cədvəldə «Bu ay», baza sütununu (başlığı seçilmiş bazanın adıdır) və «Dəyişmə»-ni oxuyun (`components/dashboard/LocationRows.tsx`:72–78); 5) həmin kartın və ya sətrin «Detallara bax»-ını basın (`AttentionSection.tsx`:211–236; `LocationRows.tsx`:136); 6) sifariş səhifəsində seçicidə «Son 3 ayın ortalaması»-nın seçili olduğunu yoxlayın və «Sentyabr 2026 · Məbləğ», «Baza», «Fərq»-i oxuyun (`components/decisions/DecisionHeadline.tsx`:68–70, 105–137); 7) ünvan sətrindəki `basis=` dəyərini yazın (`analytics/basisParams.ts`:10–11, 57; `BasisPicker.tsx`:11–17). Səhifədə qalın: E-02 buradan davam edir.
Gözlənilən: panel və sifariş səhifəsi eyni rəqəmi göstərir (`BRIEFS/TASK-15.md`:33). Rəqəmin özünü brief vermir (brief rəqəm vermir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Paneldə harada oxundu (kart / cədvəl sətri):
  - Panel — bu ayın məbləği:
  - Panel — baza (yalnız cədvəldə var):
  - Panel — fərq və faiz:
  - Sifariş səhifəsi — «Məbləğ»:
  - Sifariş səhifəsi — «Baza»:
  - Sifariş səhifəsi — «Fərq» və faiz:
  - Sifariş səhifəsinin ünvanında `basis=`:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-02 — Task 1: brauzerin «Geri» düyməsi bazanı qaytarır
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 33, sitat: "**Task 1:** Heydər Əliyev, "Son 3 ay" — panel kartı və sifariş səhifəsi eyni rəqəmi göstərir; "Geri" bazanı qaytarır."
Harada: real · sifariş səhifəsi → «İdarəetmə paneli» · `/orders/<nömrə>` → `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-01-in sonunda açılan sifariş səhifəsində brauzerin **Geri** düyməsini basın (ünvan sətrinin solundakı ←, və ya `Alt+←`); ekranda «Geri» adlı düymə yoxdur (bax: «Brief-in sözləri və ekranın sözləri»); 2) paneldə seçili bazanı, «Dövr»-ü və ünvandakı `basis=` dəyərini yazın (baza ünvanda saxlanır: `analytics/basisParams.ts`:10–11); 3) panelin açdığınız karta və ya sətrə qayıtdığını yazın (kartın və sətrin `id`-si məhz bunun üçündür: `components/dashboard/AttentionSection.tsx`:96–97; `components/dashboard/LocationRows.tsx`:83–84); 4) kartların altındakı "…görə" cümləsini sözbəsöz yazın (`AttentionSection.tsx`:123).
Gözlənilən: "Baza linkdə saxlanır, kartlarda "…görə" yazısı var (Task 1)." (`BRIEFS/TASK-09.md`:43); "Baza linkdə saxlanır (Task 1)." (`BRIEFS/TASK-11.md`:34). Geri-dən sonra baza «Son 3 ayın ortalaması» qalır. Rəqəm: brief rəqəm vermir.
İlk auditdə: "Sifarişdən geri qayıdanda panel ən yuxarıdan açılır və rəhbər baxdığı kartı itirir." (`BRIEFS/TASK-09.md`:20)
---- operator doldurur ----
Göründü:
  - Geri-dən sonra seçili baza:
  - Geri-dən sonra «Dövr»:
  - Geri-dən sonra ünvandakı `basis=`:
  - Panel açdığınız karta / sətrə qayıtdı (bəli / xeyr):
  - Kartdakı "…görə" cümləsi:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-03 — Task 1b: başlıq cədvəlin cəmi ilə eynidir
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 34, sitat: "**Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti; "Keçən ay" bazasında EXPO ayrıca."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Rəhbər ilə daxil olun. Panel ən son ay və «Keçən ay» ilə açılır (`pages/ManagementDashboardPage.tsx`:117–122; `analytics/basisParams.ts`:59–60, 85–91): açılış bazası elə «Keçən ay»-dır, ona görə bir oxunuş kifayətdir. «Dövr» Sentyabr 2026 deyilsə, onu seçin; 2) başlıq: «Sentyabr 2026 sifarişlərinin məbləği» altındakı böyük məbləğ (`components/dashboard/DashboardSummary.tsx`:80–97; `components/dashboard/labels.ts`:210–212), onun altındakı fərq və baza (`DashboardSummary.tsx`:103–117); müqayisədən kənarda pul varsa, orada çıxma sətirləri göstərilir (`DashboardSummary.tsx`:99–100); 3) cədvəl: «Bütün obyektlər» cədvəlinin son sətri «Müqayisə olunan N obyekt» — «Bu ay», baza sütunu, «Dəyişmə», varsa altındakı «Bütün sifarişlər (N obyekt): …» (`components/dashboard/LocationRows.tsx`:149–182; `coverage/labels.ts`:245–252); 4) rəqəmləri qəpiyinə qədər, ekrandakı kimi yazın.
Gözlənilən: "Başlıq cədvəlin cəmi ilə eynidir və hər cəm qəpiyinə qədər tutur (Task 1b/1c)." (`BRIEFS/TASK-09.md`:42). Rəqəmin özünü brief vermir (brief rəqəm vermir).
İlk auditdə: "Müqayisədən kənar obyekt olanda (Keçən ay: EXPO) fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox. Rəhbər ay cəmindən çıxanda başqa rəqəm alır." (`BRIEFS/TASK-09.md`:21)
---- operator doldurur ----
Göründü:
  - Başlıq — ay məbləği:
  - Başlıq — «Müqayisə olunan N obyekt: …» sətri (varsa):
  - Başlıq — baza:
  - Başlıq — fərq və faiz:
  - Cədvəlin son sətri — «Müqayisə olunan N obyekt»:
  - Cədvəlin son sətri — «Bu ay»:
  - Cədvəlin son sətri — baza:
  - Cədvəlin son sətri — «Dəyişmə»:
  - Cədvəlin son sətri — «Bütün sifarişlər (N obyekt): …» (varsa):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-04 — Task 1b: «Sifariş qeydə alınmayıb» altında Puşkin parkı və Təmir-tikinti
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 34, sitat: "**Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti; "Keçən ay" bazasında EXPO ayrıca."
Harada: real · «İdarəetmə paneli», «Müqayisədən kənarda qalan obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panel, Sentyabr 2026, «Keçən ay»; 2) «Müqayisədən kənarda qalan obyektlər» bölməsini tapın (`components/dashboard/DashboardSummary.tsx`:337–363; `coverage/labels.ts`:117); 3) «Sifariş qeydə alınmayıb (N)» başlığının (`coverage/labels.ts`:32) altındakı obyektlərin adlarını sözbəsöz yazın.
Gözlənilən: ""Sifariş qeydə alınmayıb": Puşkin parkı, Təmir-tikinti;" (`BRIEFS/TASK-09.md`:39)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Sifariş qeydə alınmayıb (N)» başlığı:
  - Onun altındakı obyektlər:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-05 — Task 1b: «Keçən ay» bazasında EXPO ayrıca
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 34, sitat: "**Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti; "Keçən ay" bazasında EXPO ayrıca."
Harada: real · «İdarəetmə paneli», başlıq və «Müqayisədən kənarda qalan obyektlər» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panel, Sentyabr 2026, «Keçən ay»; 2) «Müqayisədən kənarda qalan obyektlər» bölməsində «Müqayisə bazası yoxdur (N)» başlığının (`coverage/labels.ts`:33) altındakı obyektləri yazın; 3) başlıqda fərqin hansı məbləğin yanında durduğunu yazın: ay məbləği, «Müqayisə olunan N obyekt: …» sətri (`coverage/labels.ts`:151–159) və fərq (`components/dashboard/DashboardSummary.tsx`:95–119).
Gözlənilən: ""Müqayisə bazası yoxdur": Keçən ay bazasında EXPO;" (`BRIEFS/TASK-09.md`:40). Bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Müqayisədən kənar obyekt olanda (Keçən ay: EXPO) fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox. Rəhbər ay cəmindən çıxanda başqa rəqəm alır." (`BRIEFS/TASK-09.md`:21)
---- operator doldurur ----
Göründü:
  - «Müqayisə bazası yoxdur (N)» altındakı obyektlər:
  - Başlıq — ay məbləği:
  - Başlıq — «Müqayisə olunan N obyekt: …»:
  - Başlıq — fərq və onun yanında durduğu məbləğ:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-06 — Task 1c: Heydər Əliyev Mərkəzi — hər sətirdə baza + fərq = cari
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifariş səhifəsini açın (bu bölmənin girişi) və seçicidə «Keçən ay»-ı basın; 2) başlıqdan «Sentyabr 2026 · Məbləğ» (cari), «Baza», «Fərq»-i yazın (`components/decisions/DecisionHeadline.tsx`:68–70, 126–137); 3) «Niyə dəyişib?» bölməsində (`components/decisions/CauseSummary.tsx`:68) «Əsas səbəb» işarəli hissənin adını və məbləğini yazın (`CauseSummary.tsx`:128, 136, 146–148); 4) «Əsas dəyişikliklər» siyahısında (`components/decisions/DriverList.tsx`:78) həmin hissənin adını daşıyan düyməni basın — «Yeni məhsullar», «Bu ay yazılmayan məhsullar», «Miqdar dəyişən» və ya «Qiymət dəyişən» (`DriverList.tsx`:83–106; `components/decisions/labels.ts`:126–134); belə düymə yoxdursa, «Hamısı»-da qalın və etiketi həmin hissənin adı olan sətirləri götürün (`DriverList.tsx`:242–252); 5) siyahının ilk üç sətri (siyahı təsirin böyüklüyünə görə sıralanır: `BRIEFS/TASK-10.md`:43) — hər biri üçün: **fərq** sətrin sağındakı məbləğdir (`DriverList.tsx`:139–148); sonra sətri basın, «Məhsul tarixçəsi» pəncərəsi açılır (`DriverList.tsx`:117–122); onun «Məbləğ» sütunundan (`components/analytics/TrendModal.tsx`:183–187) Avqust 2026-nı (**baza**, «Keçən ay») və Sentyabr 2026-nı (**cari**) yazın; pəncərəni bağlayın. Xidmət sətrində baza və cari sətrin özündə «Cəmi … → …» kimi yazılıb (`DriverList.tsx`:212–215); 6) rəqəmləri ekrandakı kimi yazın; toplamayın — hesabı 15b yoxlayır.
Gözlənilən: hər sətirdə baza + fərq = cari (`BRIEFS/TASK-15.md`:35). Başlıqdakı «Fərq»: +23,852.70 — "Heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir (Heydər Əliyev, Keçən ay: +23,852.70)." (`BRIEFS/TASK-13.md`:46). Sətirlərin rəqəmini brief vermir (brief rəqəm vermir).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Başlıq: Baza … · Fərq … · Məbləğ (cari) …:
  - Əsas səbəb (hissənin adı və məbləği):
  - 1-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 2-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 3-cü sətir: <məhsul> — baza … · fərq … · cari …:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-07 — Task 1c: Heydər Əliyev Mərkəzi — hissələrin cəmi «Cəmi»yə bərabərdir
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-06-nın səhifəsi, «Keçən ay»; 2) «Niyə dəyişib?» bölməsində hər hissəni səhifədəki sırası ilə, adı və məbləği ilə yazın (`components/decisions/CauseSummary.tsx`:83–97, 136, 146–148); «Variant dəyişib» hissəsi varsa, onu və altındakı sətirləri də yazın (`CauseSummary.tsx`:42–44, 155–170); 3) bölmənin yuxarısındakı «Cəmi»-ni yazın (`CauseSummary.tsx`:71–73); 4) bölmənin altında xəbərdarlıq varsa, sözbəsöz yazın (`CauseSummary.tsx`:100–104); 5) Sabun variant əlaqəsinin təsdiqlənib-təsdiqlənmədiyini A-07-dəki Əmr 2-nin Sabun sətrindən götürün; 6) toplamayın — hesabı 15b yoxlayır.
Gözlənilən: "Rəqəmlər dəyişmir, yalnız sıra və görünüş dəyişir. Heydər Əliyev, Keçən ay: Yeni +29,691.52, Miqdar −309.20, Qiymət +30.00, Artıq −5,259.62, Xidmətlər −300.00, cəmi +23,852.70. Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" hissələrinin hər biri 750.00 ₼ azala bilər; cəmi dəyişmir." (`BRIEFS/TASK-06.md`:28). Əlaqə təsdiqlənibsə: "Variant əlaqəsi təsdiqlənəndən sonra Heydər Əliyevin Sentyabr sifarişində "Niyə dəyişib?" bölməsində "Sabun elano" üçün bir "variant dəyişib" sətri görürəm; bu sətrin təsiri 0.00 ₼-dır (750.00 − 750.00)." (`BRIEFS/TASK-13.md`:42). Brief-in hissə adları ekranda başqa cür yazılır: «Brief-in sözləri və ekranın sözləri».
İlk auditdə: brief bu sifarişin hissələrini qeyd etmir. Brief-in ilk audit qeydi xəbərdarlıq haqqındadır: "… amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - 1-ci hissə (ad və məbləğ):
  - 2-ci hissə:
  - 3-cü hissə:
  - 4-cü hissə:
  - 5-ci hissə:
  - 6-cı hissə (varsa):
  - 7-ci hissə (varsa):
  - 8-ci hissə (varsa):
  - «Variant dəyişib» altındakı sətirlər (varsa):
  - «Cəmi»:
  - Xəbərdarlıq (varsa, sözbəsöz; yoxdursa «yoxdur»):
  - Əmr 2-yə görə Sabun əlaqəsi təsdiqlənib (A-07):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-08 — Task 1c: Fəvvarələr meydanı — hər sətirdə baza + fərq = cari
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) E-06-nın 1–6-cı addımları, Fəvvarələr meydanının Sentyabr 2026 sifarişində.
Gözlənilən: hər sətirdə baza + fərq = cari (`BRIEFS/TASK-15.md`:35). Bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Fəvvarələr meydanı, −2,584.45: əsas səbəb "Artıq sifariş olunmayanlar −8,093.70"; ən böyük mal Yay ayaqqabısıdır, −1,988.00 (71 → 0 ədəd)." (`BRIEFS/TASK-07.md`:10)
---- operator doldurur ----
Göründü:
  - Başlıq: Baza … · Fərq … · Məbləğ (cari) …:
  - Əsas səbəb (hissənin adı və məbləği):
  - 1-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 2-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 3-cü sətir: <məhsul> — baza … · fərq … · cari …:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-09 — Task 1c: Fəvvarələr meydanı — hissələrin cəmi «Cəmi»yə bərabərdir
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Fəvvarələr meydanının Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) E-07-nin 1–4-cü və 6-cı addımları, Fəvvarələr meydanının Sentyabr 2026 sifarişində.
Gözlənilən: hissələrin cəmi «Cəmi»yə bərabərdir (`BRIEFS/TASK-15.md`:35). Bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Xəbərdarlıq hesabla ziddiyyət təşkil edir. Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - 1-ci hissə (ad və məbləğ):
  - 2-ci hissə:
  - 3-cü hissə:
  - 4-cü hissə:
  - 5-ci hissə:
  - 6-cı hissə (varsa):
  - 7-ci hissə (varsa):
  - 8-ci hissə (varsa):
  - «Cəmi»:
  - Xəbərdarlıq (varsa, sözbəsöz; yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-10 — Task 1c: Nərimanov heykəli — hər sətirdə baza + fərq = cari
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Keçən ay» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) E-06-nın 1–6-cı addımları, Nərimanov heykəlinin Sentyabr 2026 sifarişində.
Gözlənilən: hər sətirdə baza + fərq = cari (`BRIEFS/TASK-15.md`:35). Bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Nərimanov heykəli, −1,166.42: əsas səbəb "Artıq sifariş olunmayanlar −1,601.06"; ən böyük mal Mərmər bej qalınlığı 2 sm, −883.20 (7.36 → 0 m²)." (`BRIEFS/TASK-07.md`:11)
---- operator doldurur ----
Göründü:
  - Başlıq: Baza … · Fərq … · Məbləğ (cari) …:
  - Əsas səbəb (hissənin adı və məbləği):
  - 1-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 2-ci sətir: <məhsul> — baza … · fərq … · cari …:
  - 3-cü sətir: <məhsul> — baza … · fərq … · cari …:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-11 — Task 1c: Nərimanov heykəli — hissələrin cəmi «Cəmi»yə bərabərdir
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 35, sitat: "**Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir."
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Keçən ay», «Niyə dəyişib?» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) E-07-nin 1–4-cü və 6-cı addımları, Nərimanov heykəlinin Sentyabr 2026 sifarişində.
Gözlənilən: hissələrin cəmi «Cəmi»yə bərabərdir (`BRIEFS/TASK-15.md`:35). Bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: cəm və «Artıq» hissəsi: "Nərimanov heykəli, −1,166.42: əsas səbəb "Artıq sifariş olunmayanlar −1,601.06"; …" (`BRIEFS/TASK-07.md`:11). Qalan hissələri brief qeyd etmir. Xəbərdarlıq haqqında: "… Heydər Əliyev və Nərimanov sifarişlərində də belədir." (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - 1-ci hissə (ad və məbləğ):
  - 2-ci hissə:
  - 3-cü hissə:
  - 4-cü hissə:
  - 5-ci hissə:
  - 6-cı hissə (varsa):
  - 7-ci hissə (varsa):
  - 8-ci hissə (varsa):
  - «Cəmi»:
  - Xəbərdarlıq (varsa, sözbəsöz; yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-12 — Task 2: Nərimanov heykəli, Sentyabr — İdarəetmə paneli
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panel, Sentyabr 2026, «Keçən ay»; 2) «Bütün obyektlər» cədvəlində Nərimanov heykəlinin sətrini tapın; kartı da varsa, kartda da baxın; 3) məbləğin yanındakı ⚠ işarəsini və siçanı üzərinə gətirəndə çıxan yazını yazın (`components/dashboard/MissingPriceMark.tsx`:22–42; `components/dashboard/LocationRows.tsx`:311–327; `components/dashboard/AttentionSection.tsx`:111); 4) sətirdə və ya kartda «Daxili təminat» sayı görünürsə, yazın. Koddan: panelin kartı və cədvəli yalnız qiyməti yazılmamış sətirlərin sayını göstərir, daxili təminat bu işarəni qaldırmır (`MissingPriceMark.tsx`:9–10), və `components/dashboard/` faylları daxili təminat sayını göstərmir.
Gözlənilən: "Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"" (`BRIEFS/TASK-15.md`:36); "Qiymət yoxdur / daxili təminat qaydası (Task 2): Nərimanov, Sentyabr — 1 / 1." (`BRIEFS/TASK-11.md`:32)
İlk auditdə: "… daxili təminat bir ekranda səhv sayılırdı …" (`BRIEFS/TASK-15.md`:9); hansı ekran olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Harada oxundu (kart / cədvəl sətri):
  - ⚠ işarəsi və onun yazısı:
  - «Daxili təminat» sayı (görünmürsə «göstərilmir»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-13 — Task 2: Nərimanov heykəli, Sentyabr — Aylıq hesabat
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` (`layout/navigation.ts`:28) · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Aylıq hesabat»-ı açın; 2) Nərimanov heykəlinin sətrində Sentyabr xanasını tapın; 3) xanadakı ⚠ işarəsini və sayını (`components/reports/MonthlyReportTable.tsx`:309–311), siçanı xananın üzərinə gətirəndə çıxan izahı (`MonthlyReportTable.tsx`:334–357) yazın; 4) «Daxili təminat» sayı görünürsə, yazın. Koddan: hesabat yalnız qiyməti yazılmamış sətirlərin sayını göstərir (`MonthlyReportTable.tsx`:17 yalnız bu sözləri götürür).
Gözlənilən: "Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"" (`BRIEFS/TASK-15.md`:36); "Nərimanov, Sentyabr — 1 / 1." (`BRIEFS/TASK-11.md`:32)
İlk auditdə: "… daxili təminat bir ekranda səhv sayılırdı …" (`BRIEFS/TASK-15.md`:9); hansı ekran olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Sentyabr xanası — ⚠ və say:
  - Xananın izahı:
  - «Daxili təminat» sayı (görünmürsə «göstərilmir»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-14 — Task 2: Nərimanov heykəli, Sentyabr — Obyektlər
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · «Obyektlər» · `/locations` (`layout/navigation.ts`:34) · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Obyektlər»-i açın; 2) Nərimanov heykəlinin sətrində son sifarişin dövrünü və onun altındakı "N sətirdə qiymət yoxdur" yazısını yazın (`pages/LocationsPage.tsx`:170–173; `pricing/labels.ts`:118–120); 3) «Daxili təminat» sayı görünürsə, yazın. Koddan: bu siyahı son sifarişin yalnız qiyməti yazılmamış sətirlərinin sayını göstərir.
Gözlənilən: "Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"" (`BRIEFS/TASK-15.md`:36); "Nərimanov, Sentyabr — 1 / 1." (`BRIEFS/TASK-11.md`:32)
İlk auditdə: "… daxili təminat bir ekranda səhv sayılırdı …" (`BRIEFS/TASK-15.md`:9); hansı ekran olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Son sifarişin dövrü:
  - Qiymət yoxdur yazısı:
  - «Daxili təminat» sayı (görünmürsə «göstərilmir»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-15 — Task 2: Nərimanov heykəli, Sentyabr — obyekt səhifəsi
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · Nərimanov heykəlinin obyekt səhifəsi · `/locations/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «Obyektlər» → Nərimanov heykəli; 2) yuxarıdakı son sifariş blokunda "Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1" formalı sətri sözbəsöz yazın (`components/locations/LocationTrend.tsx`:186–202); 3) sifarişlər cədvəlində Sentyabr 2026 sətrindəki yazıları yazın: "N sətirdə qiymət yoxdur", "N sətir daxili təminat (ödənişsiz)" (`pages/LocationDetailPage.tsx`:300–307; `pricing/labels.ts`:118–125); 4) səhifədəki bütün tarixçə sətrini ayrıca yazın: o, Sentyabrın yox, bütün ayların sayıdır (`LocationDetailPage.tsx`:176–207).
Gözlənilən: "Nərimanov səhifəsində "Qiymət yoxdur 1 · Daxili təminat 1" görürəm." (`BRIEFS/TASK-11.md`:50); "Nərimanov, Sentyabr — 1 / 1." (`BRIEFS/TASK-11.md`:32); `BRIEFS/TASK-15.md`:36
İlk auditdə: "Nərimanov heykəli obyekt səhifəsi: başlıqda "1 məhsulun qiyməti yoxdur", cədvəldə "1 sətirdə qiymət yoxdur"." (`BRIEFS/TASK-05.md`:25)
---- operator doldurur ----
Göründü:
  - Son sifariş blokundakı sətir:
  - Cədvəldə Sentyabr 2026 sətri:
  - Bütün tarixçə sətri:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-16 — Task 2: Nərimanov heykəli, Sentyabr — sifariş səhifəsi
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) sifariş səhifəsini açın (bu bölmənin girişi); 2) başlıqdakı böyük məbləğin altındakı say sətrini sözbəsöz yazın: "N sətirdə qiymət yoxdur · Qiymət təsnifatına bax · N sətir daxili təminat (ödənişsiz)" formasındadır (`components/decisions/DecisionHeadline.tsx`:77–101; `pricing/labels.ts`:118–128); «Qiymət təsnifatına bax» linkini basmaq lazım deyil; 3) «Sətirlər» cədvəlinin «Qiymət» sütununda «Qiymət yoxdur» və «Daxili təminat» yazılan sətirləri sayın (`pages/OrderDetailPage.tsx`:309, 362, 595–614); 4) «Sifariş xülasəsi» hissəsindəki sayı yazın (`OrderDetailPage.tsx`:233–242).
Gözlənilən: "Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"" (`BRIEFS/TASK-15.md`:36); "Nərimanov, Sentyabr — 1 / 1." (`BRIEFS/TASK-11.md`:32)
İlk auditdə: "… daxili təminat bir ekranda səhv sayılırdı …" (`BRIEFS/TASK-15.md`:9); hansı ekran olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Başlıqdakı say sətri:
  - «Sətirlər»: «Qiymət yoxdur» yazılan sətirlərin sayı:
  - «Sətirlər»: «Daxili təminat» yazılan sətirlərin sayı:
  - «Sifariş xülasəsi»ndəki say:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-17 — Task 2: təchizatçı «Daxili: Azpetrol baza»
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 36, sitat: "**Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza"."
Harada: real · Nərimanov heykəlinin Sentyabr 2026 sifarişi, «Sətirlər» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-16-nın səhifəsində «Sətirlər» cədvəlində «Qiymət» sütununda «Daxili təminat» yazılan sətri tapın; 2) onun məhsulunu və «Təchizatçı» xanasını sözbəsöz yazın (`pages/OrderDetailPage.tsx`:364, 733; `pricing/labels.ts`:204–213).
Gözlənilən: «Daxili: Azpetrol baza» (`BRIEFS/TASK-15.md`:36; `BRIEFS/TASK-05.md`:53)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Daxili təminat sətrinin məhsulu:
  - Onun «Təchizatçı» xanası:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-18 — Task 3: 27 obyekt
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 37, sitat: "**Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama."
Harada: real · «Obyektlər» · `/locations` (`layout/navigation.ts`:34) · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Obyektlər»-i açın; 2) yuxarıdakı «Obyekt» və «Sifarişi olan» göstəricilərini yazın (`pages/LocationsPage.tsx`:73–76); 3) cədvəlin altındakı "Səhifə … · N obyekt" sətrini yazın (`LocationsPage.tsx`:232).
Gözlənilən: 27 (`BRIEFS/TASK-15.md`:37); "27 obyekt, tam adlar və sıralama (Task 3)." (`BRIEFS/TASK-11.md`:33)
İlk auditdə: "Rəqəmlər ekranlar arasında sabit deyildi: baza itirdi, saylar fərqli idi — Task 1, 1b, 1c, 3." (`BRIEFS/TASK-15.md`:8)
---- operator doldurur ----
Göründü:
  - «Obyekt»:
  - «Sifarişi olan»:
  - Cədvəlin altındakı say:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-19 — Task 3: «24 / 27»
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 37, sitat: "**Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panel, Sentyabr 2026; 2) «Bu ay sifariş olan obyektlər» kartındakı rəqəmi və onun altındakı cümləni yazın (`components/dashboard/DashboardSummary.tsx`:129–138; `components/dashboard/labels.ts`:215; `coverage/labels.ts`:120, 144–148); 3) «Dövr» siyahısında Sentyabr 2026-nın yazısını yazın, "Sentyabr 2026 (N obyekt)" formasındadır (`pages/ManagementDashboardPage.tsx`:255–257).
Gözlənilən: «24 / 27» (`BRIEFS/TASK-15.md`:37); "Obyekt sayı 24 / 27-dir (Task 3)." (`BRIEFS/TASK-09.md`:44)
İlk auditdə: "Rəqəmlər ekranlar arasında sabit deyildi: baza itirdi, saylar fərqli idi — Task 1, 1b, 1c, 3." (`BRIEFS/TASK-15.md`:8)
---- operator doldurur ----
Göründü:
  - Kartdakı rəqəm:
  - Kartın altındakı cümlə:
  - «Dövr» siyahısında Sentyabr 2026:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-20 — Task 3: Çadır «Sistemdə hələ sifarişi yoxdur»
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 37, sitat: "**Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama."
Harada: real · «İdarəetmə paneli» və «Aylıq hesabat» · `/dashboard`, `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) panel, Sentyabr 2026: «Müqayisədən kənarda qalan obyektlər» bölməsində «Sistemdə hələ sifarişi yoxdur (N)» başlığının altındakı obyektləri yazın (`components/dashboard/DashboardSummary.tsx`:337–363; `coverage/labels.ts`:34); 2) «Aylıq hesabat»: Çadırın sətrində nə yazıldığını yazın (`components/reports/MonthlyReportTable.tsx`:210).
Gözlənilən: ""Sistemdə hələ sifarişi yoxdur": Çadır." (`BRIEFS/TASK-09.md`:41); "Heç sifarişi olmayan obyekt (Çadır) paneldəki ifadə ilə göstərilir: "Sistemdə hələ sifarişi yoxdur"." (`BRIEFS/TASK-08.md`:24)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Panel — «Sistemdə hələ sifarişi yoxdur (N)» altındakı obyektlər:
  - Aylıq hesabat — Çadırın sətri:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-21 — Task 3: tam adlar
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 37, sitat: "**Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama."
Harada: real · «Obyektlər», «İdarəetmə paneli», «Aylıq hesabat» · `/locations`, `/dashboard`, `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «Obyektlər» siyahısında obyektlərin adlarını oxuyun; qısaldılmış, kəsilmiş və ya tam olmayan adı sözbəsöz yazın; 2) eyni şeyi panelin «Bütün obyektlər» cədvəlində və «Aylıq hesabat»-da edin; 3) ən azı brief-in adlarını sadaladığı beş obyektə baxın.
Gözlənilən: "Task 3: "Sistemdə hələ sifarişi yoxdur" və obyektlərin tam adları: Heydər Əliyev Mərkəzi, Bakı Konqres Mərkəzi, Hökumət evi və ətrafı parklar, Space TV qarşısı, Təmir-tikinti (ərazidə olan dibçəklərə qulluq) və s." (`BRIEFS/TASK-05.md`:55)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Obyektlər» — tam olmayan adlar (yoxdursa «yoxdur»):
  - Panel — tam olmayan adlar:
  - Aylıq hesabat — tam olmayan adlar:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-22 — Task 3: düzgün sıralama
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 37, sitat: "**Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama."
Harada: real · «Obyektlər», «İdarəetmə paneli», «Aylıq hesabat» · `/locations`, `/dashboard`, `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) «Obyektlər» siyahısını açıldığı kimi oxuyun; koddan: siyahı «Obyekt» sütunu üzrə, artan sıra ilə açılır (`pages/LocationsPage.tsx`:36–37, 109–110) — bu, kodun qaydasıdır, brief-in deyil; 2) sıranı yazın və ya ekran şəkli çəkin; 3) panelin «Bütün obyektlər» cədvəlinin və «Aylıq hesabat»-ın sırasını da yazın.
Gözlənilən: brief sıralama qaydasını vermir (brief rəqəm vermir). Operator gördüyü sıranı yazır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Obyektlər»-in sırası:
  - Panelin cədvəlinin sırası:
  - Aylıq hesabatın sırası:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-23 — İlk auditdə yaxşı olan: «Niyə dəyişib?» cəmi tutur
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 38, sitat: "**İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür."
Harada: real · sifariş səhifəsi, «Niyə dəyişib?» · E-07, E-09, E-11 · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: E-07, E-09 və E-11 ilə eynidir. Onların hökmlərini aşağıya köçürün.
Gözlənilən: E-07, E-09 və E-11 ilə eyni — hissələrin cəmi «Cəmi»yə bərabərdir (`BRIEFS/TASK-15.md`:35).
İlk auditdə: yaxşı sayılıb (`BRIEFS/TASK-15.md`:38); nümunə: "Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼) …" (`BRIEFS/TASK-06.md`:10)
---- operator doldurur ----
Göründü:
  - E-07-nin hökmü:
  - E-09-un hökmü:
  - E-11-in hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-24 — İlk auditdə yaxşı olan: yığcam məhsul sətri
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 38, sitat: "**İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay», «Əsas dəyişikliklər» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-06-nın səhifəsi, «Keçən ay»; 2) «Əsas dəyişikliklər» siyahısında (`components/decisions/DriverList.tsx`:78) «Hamısı» seçilmiş halda ilk iki sətrin məhsul adının altındakı yığcam yazını sözbəsöz yazın: "baza → cari miqdar · Qiymət baza → cari" formasındadır (`DriverList.tsx`:207–231).
Gözlənilən: "Yığcam sətir formatı qalır: "20 → 40 ədəd · Qiymət 4.00 → 4.00 ₼"." (`BRIEFS/TASK-10.md`:42). Bu, formanın nümunəsidir; bu audit üçün rəqəmi brief vermir (brief rəqəm vermir).
İlk auditdə: "Auditdə dəyişmənin sırf miqdardan olduğunu dərhal göstərdiyi üçün yaxşı sayılıb." (`BRIEFS/TASK-10.md`:42)
---- operator doldurur ----
Göründü:
  - 1-ci sətir — məhsul və yığcam yazı:
  - 2-ci sətir — məhsul və yığcam yazı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-25 — İlk auditdə yaxşı olan: «Son 9 ayın 3-də…» sətri
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 38, sitat: "**İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür."
Harada: real · «Məhsul tarixçəsi» pəncərəsi, Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişindən · öz ünvanı yoxdur · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-06-nın səhifəsində «Əsas dəyişikliklər» siyahısının birinci sətrini basın (`components/decisions/DriverList.tsx`:117–122); 2) pəncərənin başlığını yazın (`terminology/terms.ts`:41; `components/analytics/TrendModal.tsx`:115); 3) başlığın altındakı tezlik sətrini sözbəsöz yazın: "Son N ayın M-də sifariş edilib" formasındadır (`components/analytics/trend.ts`:58–69; `TrendModal.tsx`:134, 318); 4) onun altındakı "İlk sifariş · Son sifariş · … interval" sətrini yazın (`TrendModal.tsx`:293–336); 5) pəncərəni bağlayın.
Gözlənilən: "Pəncərədə "Son 9 ayın 3-də sifariş edilib · İlk sifariş · Son sifariş · Tipik interval" sətri qalır." (`BRIEFS/TASK-10.md`:44); "**5.1:** Pəncərənin adı "Məhsul tarixçəsi", tezlik sətri "Son 9 ayın 3-də sifariş edilib" (Task 5 dəyişir; bu task istifadə edir)." (`BRIEFS/TASK-10.md`:39). Rəqəmlər məhsuldan asılıdır: bu məhsul üçün brief rəqəm vermir.
İlk auditdə: yaxşı sayılıb (`BRIEFS/TASK-15.md`:38)
---- operator doldurur ----
Göründü:
  - Məhsul:
  - Pəncərənin başlığı:
  - Tezlik sətri:
  - Onun altındakı sətir:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-26 — İlk auditdə yaxşı olan: 12 ay bir ekrana sığır
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 38, sitat: "**İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) menyuda «Aylıq hesabat»-ı açın (1366 endə 12 aylıq cədvəl göstərilir; 1024 pikseldən dar ekranda onun yerinə siyahı çıxır: `components/reports/MonthlyReportTable.tsx`:84, 447–453); 2) 12 ayın hamısının üfüqi sürüşdürmədən görünüb-görünmədiyini və məbləğlərin sıxlaşıb-sıxlaşmadığını yazın. 1200 en H-22-dədir.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23)
İlk auditdə: yaxşı sayılıb (`BRIEFS/TASK-15.md`:38)
---- operator doldurur ----
Göründü:
  - 12 ayın hamısı görünür (bəli / xeyr):
  - Üfüqi sürüşdürmə (var / yox):
  - Sıxlaşan və ya kəsilən məbləğ (yoxdursa «yoxdur»):
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-27 — İlk auditdə yaxşı olan: «Qaralama» heç yerdə görünmür
Mənbə: `BRIEFS/TASK-15.md`, «Mütləq qorunmalı davranışlar», sətir 38, sitat: "**İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür."
Harada: real və sınaq · auditin bütün ekranları · — · bütün enlər
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (sınaq hissəsi üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Auditin bütün ekranlarında «Qaralama» sözünə diqqət edin; 2) qaralamanın sözünü gördüyünüz hər ekranı və sözü yazın. Sınaqda qaralama Sınaq obyekti 2-nin Sentyabr 2026 sifarişidir (`04-sandbox.md`, Sınaq 1, addım 2); onun vəziyyəti «Təsdiqlənməyib» adlanır (`components/workflow/labels.ts`:6; importda `components/imports/labels.ts`:177). Koddan: «Qaralama» sözü frontend-in ekran mətnlərində yoxdur (testlərdən kənarda `Qaralama` üçün axtarış heç nə tapmır).
Gözlənilən: ""Qaralama" heç yerdə görünmür" (`BRIEFS/TASK-15.md`:38)
İlk auditdə: yaxşı sayılıb (`BRIEFS/TASK-15.md`:38)
---- operator doldurur ----
Göründü:
  - «Qaralama» görülən ekranlar (yoxdursa «heç yerdə»):
  - Qaralamanın sözü görülən ekranlar və söz:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## F. Təsdiq axını (sınaq mühitində)

Bütün F sətirləri sınaq mühitindədir: `http://localhost:5174`, `04-sandbox.md`, Sınaq 1 (1366 × 768) və Sınaq 2
(390 × 844). Addımlar burada təkrarlanmır: hər sətir onu daşıyan addımları adlandırır, `04-sandbox.md`-nin «Yekun
cədvəl»-indəki «Protokol §6.4, altı addım» sətrinə görə. Sınaq 1-in addımlarını bir dəfə, sıra ilə aparın və hər
addımın nəticəsini aid olduğu F sətrinə yazın. Heç bir addım `baxorders_dev`-ə toxunmur.

Qərar paneli açıq olanda dörd fakt yazılır (`04-sandbox.md`, Sınaq 1, «Hər addımda yazılacaq dörd fakt»;
`components/workflow/labels.ts`:71–81): «Göndərən» / «Göndərilib»; «Göndəriş»; «Əvvəlki düzəliş səbəbi»; «Təsdiqləyən»
/ «Təsdiq tarixi». Panel bir faktı göstərmirsə, «yoxdur» yazın.

Brief 04-ün qəbul bəndləri və 4.1 … 4.3a qərarları F-də deyil: onlar C və D bölmələrindədir və eyni addımlara istinad
edir. Ona görə Sınaq 1, addım 8 (qərar 4.1) F-də yoxdur.

### F-01 — Sifariş göndərilir
Mənbə: protokol §6.4, sitat: "1. the order is sent;"
Harada: sınaq · Sınaq obyekti 2-nin Sentyabr 2026 sifarişi · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) Sınaq 1-in hazır datası: Sınaq obyekti 1-in sifarişi sıfırlama zamanı `sinaq.koordinator`-un adından artıq göndərilib (`04-sandbox.md`, Sınaq 1, giriş hissəsi; `01-hazirliq.md`, 5.4); 2) `04-sandbox.md`, Sınaq 1, addım 2: `sinaq.koordinator` Sınaq obyekti 2-nin qaralamasını əl ilə göndərir; 3) addım 2-nin yeni vəziyyətini və dörd faktını aşağıya yazın.
Gözlənilən: göndərəndən sonra vəziyyət «Təsdiq gözləyir» (`04-sandbox.md`, Sınaq 1, addım 2; `components/workflow/labels.ts`:7). Dörd faktın dəyərini brief vermir (brief rəqəm vermir).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Yeni vəziyyət:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-02 — Sifariş «Təsdiq gözləyənlər»-də görünür
Mənbə: protokol §6.4, sitat: "2. it appears in «Təsdiq gözləyənlər»;"
Harada: sınaq · «Təsdiq gözləyənlər» · `http://localhost:5174/approvals` (`layout/navigation.ts`:30) · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 1 (`sinaq.rehber`): siyahıda neçə və hansı sifariş var; 2) Sınaq 1, addım 3 (`sinaq.admin`): sətirlərin sırası; 3) növbədə qərar paneli açıq deyil: dörd faktdan göstərilməyənə «yoxdur» yazın.
Gözlənilən: addım 1-də bir sifariş — Sınaq obyekti 1, Sentyabr 2026, sətirdə «Qərar gözləyir» (`04-sandbox.md`, Sınaq 1, addım 1). Addım 3-də əvvəl Sınaq obyekti 1, sonra Sınaq obyekti 2; səhifənin öz təsviri: "Qərar gözləyən bütün sifarişlər, təsdiq üçün göndərilmə sırasına görə" (`04-sandbox.md`, Sınaq 1, addım 3; `pages/ApprovalInboxPage.tsx`:129).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Addım 1 — siyahıdakı sifarişlər:
  - Addım 3 — sətirlərin sırası:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-03 — Rəhbər sifarişə baxır
Mənbə: protokol §6.4, sitat: "3. the Rəhbər reviews it;"
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 4: `sinaq.rehber` «Təsdiq gözləyənlər»-də Sınaq obyekti 1-in «Sifarişə bax»-ını basır; 2) dörd faktı yazın; 3) «Niyə dəyişib?»-i aşağı sürüşdürərək oxuyun və qərar panelinin görünən qalıb-qalmadığını yazın (`components/workflow/WorkflowPanel.tsx`:108–114); 4) qiymət xəbərdarlığının mətnini olduğu kimi yazın.
Gözlənilən: «Göndərən» — Sınaq Koordinatoru; «Göndərilib» — sıfırlama vaxtı; «İlk göndəriş»; əvvəlki səbəb yoxdur (`04-sandbox.md`, Sınaq 1, addım 4). Sonuncu sətrin qiyməti yoxdur, ona görə qiymət xəbərdarlığı çıxır (`04-sandbox.md`, Sınaq 1, addım 4).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
  - Panel «Niyə dəyişib?» sürüşdürülərkən görünən qalır (bəli / xeyr):
  - Qiymət xəbərdarlığının mətni:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-04 — Rəhbər səbəblə «Düzəliş tələb et» seçir
Mənbə: protokol §6.4, sitat: "4. the Rəhbər chooses «Düzəliş tələb et», with a reason (4.2: an empty reason is refused);"
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi, «Düzəliş tələb et» pəncərəsi · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 5, ikinci yarısı: qısa səbəb yazın və «Düzəliş tələb et»-i basın (boş səbəb F-07-dədir); 2) yeni vəziyyəti, panelin «Düzəliş tələb edən», «Tarix», «Səbəb» sahələrini və paneldəki yazını yazın; 3) dörd faktı yazın.
Gözlənilən: vəziyyət «Düzəliş tələb olunur» (`components/workflow/labels.ts`:9); panelin «Düzəliş tələb edən», «Tarix», «Səbəb» sahələri doludur; yazı: "Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu sifarişdə aparılmır: düzəldilmiş sifariş yaradılır." (`04-sandbox.md`, Sınaq 1, addım 5; `components/workflow/WorkflowPanel.tsx`:163–167).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Yazılan səbəb:
  - Yeni vəziyyət:
  - «Düzəliş tələb edən» / «Tarix» / «Səbəb»:
  - Paneldəki yazı:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-05 — Göndərən düzəldib yenidən göndərir
Mənbə: protokol §6.4, sitat: "5. the sender corrects it and sends it again;"
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi və onun düzəldilmiş versiyası · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 6: `sinaq.koordinator` düzəliş versiyasını yaradır, miqdarı dəyişir, sonuncu sətrin qiymətini boş saxlayır və yenidən göndərir; 2) koordinatorun gördüyü düymə və yazıların adlarını olduğu kimi yazın; 3) yeni vəziyyəti və dörd faktı yazın.
Gözlənilən: panel bunun ikinci göndəriş olduğunu və Rəhbərin səbəbini göstərir (`04-sandbox.md`, Sınaq 1, addım 6, brief 04-ün «Acceptance» bölməsinin 3-cü bəndinə istinadla); «Göndəriş» nümunəsi: «İkinci göndəriş · düzəliş tələbindən sonra» (`04-sandbox.md`, Sınaq 1, «Hər addımda yazılacaq dörd fakt»; `components/workflow/labels.ts`:83–119).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Koordinatorun gördüyü düymə və yazılar:
  - Yeni vəziyyət:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-06 — Rəhbər təsdiqləyir
Mənbə: protokol §6.4, sitat: "6. the Rəhbər approves it."
Harada: sınaq · Sınaq obyekti 1-in düzəldilmiş Sentyabr 2026 sifarişi · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 7: `sinaq.rehber` sifarişi təsdiqləyir; bu, K2-nin yoludur — kliklər G-02-də sayılır; 2) vəziyyəti və onun səhifədə neçə dəfə göründüyünü yazın; 3) «Təsdiqləyən», «Təsdiq tarixi» və dörd faktı yazın.
Gözlənilən: vəziyyət «Təsdiqlənib» (`components/workflow/labels.ts`:8), səhifədə bir dəfə (`04-sandbox.md`, Sınaq 1, addım 7, brief 04-ün «Acceptance» bölməsinin 4-cü bəndinə istinadla); «Təsdiqləyən» və «Təsdiq tarixi» göstərilir (`04-sandbox.md`, Sınaq 1, addım 7).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Vəziyyət və səhifədə neçə dəfə görünür:
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-07 — Səbəbsiz «Düzəliş tələb et» qəbul olunmur (4.2)
Mənbə: protokol §6.4, sitat: "4. the Rəhbər chooses «Düzəliş tələb et», with a reason (4.2: an empty reason is refused);"
Harada: sınaq · Sınaq obyekti 1-in Sentyabr 2026 sifarişi, «Düzəliş tələb et» pəncərəsi · `http://localhost:5174/orders/<nömrə>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 5, birinci yarısı: paneldə «Düzəliş tələb et»-i basın; «Səbəb» sahəsini boş saxlayın (və ya yalnız boşluq yazın); 2) pəncərədəki «Düzəliş tələb et» düyməsinin basılıb-basılmadığını və sahənin altındakı yazını yazın; sonra F-04-ə keçin.
Gözlənilən: pəncərədəki «Düzəliş tələb et» basılmır; sahənin altında «Düzəliş tələb etmək üçün səbəb yazılmalıdır.» görünür (`04-sandbox.md`, Sınaq 1, addım 5; `components/workflow/WorkflowDialog.tsx`:61–62, 94, 132; `components/workflow/labels.ts`:152).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Boş səbəblə düymə basılır (bəli / xeyr):
  - Sahənin altındakı yazı:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-08 — Təsdiq səlahiyyəti olmayan admin təsdiqləyə bilmir (4.3)
Mənbə: protokol §6.4, sitat: "Also check that an admin without approval authority cannot approve (4.3)."
Harada: sınaq · «Təsdiq gözləyənlər» və Sınaq obyekti 1-in sifarişi · `http://localhost:5174/approvals` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 1, addım 3: `sinaq.admin` ilə daxil olun, «Təsdiq gözləyənlər»-i açın; 2) hər sətirdəki yazını və düymələrin olub-olmadığını yazın; 3) Sınaq obyekti 1-in «Sifarişə bax»-ını basın və qərar panelini yazın; 4) heç nəyi dəyişməyin.
Gözlənilən: hər sətirdə «Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.» yazılır; sətirlərdə «Təsdiqlə» və «Düzəliş tələb et» düymələri yoxdur (`04-sandbox.md`, Sınaq 1, addım 3; `components/approvals/ApprovalRows.tsx`:219–224, 259–278); qərar panelində eyni yazı var və «Təsdiqlə» yoxdur (`components/workflow/WorkflowPanel.tsx`:98–104, 124–132). Təsdiq səlahiyyəti yalnız Rəhbər roludur (`ICurrentUserContext.cs`:64).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Növbə sətirlərindəki yazı:
  - Növbədə «Təsdiqlə» / «Düzəliş tələb et» düymələri (var / yox):
  - Qərar panelindəki yazı:
  - Qərar panelində «Təsdiqlə» (var / yox):
  - «Göndərən» / «Göndərilib»:
  - «Göndəriş»:
  - «Əvvəlki düzəliş səbəbi»:
  - «Təsdiqləyən» / «Təsdiq tarixi»:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### F-09 — Bütün axın telefonda, 390 × 844
Mənbə: protokol §6.4, sitat: "Run this at 1366 and at 390 (the fixed bottom bar, Task 12)."
Harada: sınaq · Sınaq 1-in ekranları · `http://localhost:5174` · 390 × 844
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `04-sandbox.md`, Sınaq 2, addım 1: `01-hazirliq.md`, 5.2 ilə başlayın (Sınaq 1-dən sonra `-Reset` edilib); 2) Sınaq 2, addım 2: eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd) və Sınaq 1-in 1–8-ci addımlarını təkrarlayın; K2 burada sayılmır; 3) Rəhbərin hər addımında Sınaq 2, addım 2-nin üç müşahidəsini yazın; 4) Sınaq 2, addım 3: `01-hazirliq.md`, 5.5.
Gözlənilən: 1024 pikseldən dar ekranda qərar düymələri ekranın aşağısına bərkidilmiş zolaqdadır və «Niyə dəyişib?» sürüşdürülərkən orada qalır; səhifənin sonu zolağın altından çıxana qədər sürüşdürülür; pəncərələr oxunur və düymələri basılır (`04-sandbox.md`, Sınaq 2, addım 2; `components/workflow/WorkflowPanel.tsx`:109–114; `pages/OrderDetailPage.tsx`:511–513).
İlk auditdə: "Təsdiq addımı yoxlanılmamışdı — Task 4." (`BRIEFS/TASK-15.md`, «Auditdə müşahidə edilən hazırkı problem», 3-cü bənd)
---- operator doldurur ----
Göründü:
  - Qərar düymələri aşağıya bərkidilmiş zolaqdadır və sürüşdürərkən qalır:
  - Səhifənin sonu zolağın altından çıxana qədər sürüşdürülür:
  - Pəncərələr (göndər, düzəliş tələb et, təsdiqlə) oxunur və düymələri basılır:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## G. Klik sayı

İki yol sayılır, ikisi də 1366 × 768 endə (protokol §6.5; §10, A4). Hər klik və hər sürüşdürmə sırası ilə ayrıca
sətirdir: `klik` və ya `sürüşdürmə`, və nəyə. İlk auditin sayılmış yolu məlum deyil və bərpa edilmir (`README.md`,
8-ci bölmə). Burada sayılan yollar bu auditin öz yollarıdır; onları "3 klik + 3 sürüşdürmə"-nin yanına 15b qoyur.

### G-01 — K1, real data: paneldən Heydər Əliyev Mərkəzinin Sentyabr sifarişinə
Mənbə: `BRIEFS/TASK-15.md`, «Acceptance — biznes dili ilə», 3-cü bənd; protokol §6.5, K1, sitat: "Klik sayı ilk auditlə müqayisə olunub (ilk auditdə: 3 klik + 3 sürüşdürmə)."
Harada: real · «İdarəetmə paneli» → Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi · `/dashboard` → `/orders/<nömrə>` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Rəhbər ilə daxil olun; sayma İdarəetmə paneli girişdən sonra açılan kimi başlayır (`/dashboard`, `App.tsx`:29–30). 2) Koddan: panel ən son ayla açılır — ünvanda `period` yoxdursa, «Dövr» siyahısının birincisi seçilir (`pages/ManagementDashboardPage.tsx`:117–122) — və «Keçən ay» bazası ilə (`analytics/basisParams.ts`:59–60, 85–91). Ən son ay Sentyabr 2026-dırsa (A-01), ay və baza seçmək saymaya daxil deyil. «Dövr»-də başqa ay görünürsə, Sentyabrı seçmək klikdir: sayın. 3) Koddan mümkün yol (siz getdiyiniz yolu sayın): Heydər Əliyev Mərkəzi «Diqqət tələb edən obyektlər» kartlarındadırsa (`components/dashboard/AttentionSection.tsx`:61–75), kartın «Detallara bax»-ı sifarişi birbaşa açır (`AttentionSection.tsx`:130, 211–236); deyilsə, «Bütün obyektlər» cədvəlinə sürüşdürün (`pages/ManagementDashboardPage.tsx`:304) və HEM sətrinin «Detallara bax»-ını basın (`components/dashboard/LocationRows.tsx`:136). Cədvəl bir səhifədə 100 sətir göstərir (`ManagementDashboardPage.tsx`:38). 4) Sifariş səhifəsində üç şeyi oxuyun: cəm — «Sentyabr 2026 · Məbləğ» (`components/decisions/DecisionHeadline.tsx`:68–70); «Keçən ay»a qarşı dəyişmə — «Fərq» (`DecisionHeadline.tsx`:130–137); əsas səbəbin məhsul adı. Koddan: «Niyə dəyişib?» «Əsas səbəb» işarəli hissənin adını və məhsul sayını göstərir, məhsulun adını yox (`components/decisions/CauseSummary.tsx`:68, 128–145); məhsul adları onun altındakı «Əsas dəyişikliklər» siyahısındadır (`components/decisions/DriverList.tsx`:78, 127). Adı harada oxuduğunuzu yazın. 5) Sayma üçüncü şey oxunanda bitir.
Gözlənilən: brief rəqəm vermir — bu yol üçün hədəf yoxdur. Sayı "3 klik + 3 sürüşdürmə"-nin yanına 15b qoyur (protokol §6.5).
İlk auditdə: "3 klik + 3 sürüşdürmə" (`BRIEFS/TASK-15.md`:48). İlk auditin yolu məlum deyil, ona görə bu, eyni yolun müqayisəsi deyil (`README.md`, 8-ci bölmə, üçüncü bənd).
---- operator doldurur ----
Göründü:
  - Getdiyiniz yol (kart / cədvəl sətri):
  - 1:
  - 2:
  - 3:
  - 4:
  - 5:
  - 6:
  - 7:
  - 8:
  - 9:
  - 10:
  - 11:
  - 12:
  - (lazım olsa sətir əlavə edin)
  - Cəmi: … klik · … sürüşdürmə
  - Oxunan cəm:
  - Oxunan «Fərq»:
  - Əsas səbəbin məhsul adı və harada oxundu:
Rəqəm:
En:
Ekran şəkli:
Hökm: sayıldı / yoxlanıla bilmədi (səbəb)
Qeyd:

### G-02 — K2, sınaq: paneldən test sifarişinin təsdiqinə
Mənbə: `BRIEFS/TASK-15.md`, «Acceptance — biznes dili ilə», 3-cü bənd; protokol §6.5, K2, sitat: "Klik sayı ilk auditlə müqayisə olunub (ilk auditdə: 3 klik + 3 sürüşdürmə)."
Harada: sınaq · «İdarəetmə paneli» → «Təsdiq gözləyənlər» → Sınaq obyekti 1-in düzəldilmiş sifarişi · `http://localhost:5174/dashboard` → `/approvals` → `/orders/<nömrə>` · 1366 × 768
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) Yol `04-sandbox.md`, Sınaq 1, addım 7-dir və orada keçilir; bu sətir onun sayma cədvəlidir; 2) sayma `sinaq.rehber` daxil olandan sonra İdarəetmə paneli açılan kimi başlayır (`layout/navigation.ts`:27); 3) təxmini yol Sınaq 1, addım 7-dədir; növbə sətrinin öz «Təsdiqlə» düyməsi də var, amma protokola görə dörd fakt yolda oxunmalıdır — hansı yolu getdinizsə, onu sayın; 4) sayma təsdiq bitəndə dayanır.
Gözlənilən: brief rəqəm vermir — bu yol üçün hədəf yoxdur. Sayı "3 klik + 3 sürüşdürmə"-nin yanına 15b qoyur (protokol §6.5).
İlk auditdə: "3 klik + 3 sürüşdürmə" (`BRIEFS/TASK-15.md`:48). İlk auditin yolu məlum deyil, ona görə bu, eyni yolun müqayisəsi deyil (`README.md`, 8-ci bölmə, üçüncü bənd).
---- operator doldurur ----
Göründü:
  - 1:
  - 2:
  - 3:
  - 4:
  - 5:
  - 6:
  - 7:
  - 8:
  - 9:
  - 10:
  - 11:
  - 12:
  - (lazım olsa sətir əlavə edin)
  - Cəmi: … klik · … sürüşdürmə
Rəqəm:
En:
Ekran şəkli:
Hökm: sayıldı / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## H. Ekran enləri

Hər ekran hər endə ayrıca sətirdir: ssenarinin doqquz ekranı 1366 və 1440-da (H-01 … H-18), dörd ekran 390 və 1200-də
(H-19 … H-26) (protokol §6.6). Hamısı real datadır, Rəhbər hesabı ilə, Sentyabr 2026, ekranın bazası varsa «Keçən ay».
Eni `01-hazirliq.md`, 6-cı bənddəki kimi qoyun; miqyas 100 % qalır. 1200 en tapşırığın "1150–1279 arası noutbuk"-unu
təmsil edir (protokol §10, A3). Sınaq mühitinin ekranları 1366 və 390-da F bölməsində oxunur.

`Göründü:` altındakı üç sətir qayda deyil, müşahidədir: gördüyünüzü yazın. Hökm sizindir; onu 15b izah edir.

Ekranların açılışı:

- İdarəetmə paneli — menyuda «İdarəetmə paneli» (`layout/navigation.ts`:27);
- Aylıq hesabat — menyuda «Aylıq hesabat» (`layout/navigation.ts`:28);
- Obyektlər — menyuda «Obyektlər» (`layout/navigation.ts`:34);
- Heydər Əliyev Mərkəzinin obyekt səhifəsi — «Obyektlər» → Heydər Əliyev Mərkəzi (`App.tsx`:45);
- onun Sentyabr sifarişi — obyekt səhifəsində Sentyabr 2026 sətrinin «Müqayisə»-si (`pages/LocationDetailPage.tsx`:322–333);
- «Məhsul tarixçəsi» — sifariş səhifəsində «Əsas dəyişikliklər» siyahısının birinci sətri
  (`components/decisions/DriverList.tsx`:117–122);
- Təsdiq gözləyənlər — menyuda «Təsdiq gözləyənlər» (`layout/navigation.ts`:30);
- Təchizatçılar — menyuda «Təchizatçılar» (`layout/navigation.ts`:38);
- Qiymət təsnifatı — ünvan sətrinə `/pricing-modes` yazılır (Rəhbərin menyusunda yoxdur: `layout/navigation.ts`:39).

Sifariş səhifəsində və «Təsdiq gözləyənlər»-də Rəhbərin öz qərar düymələri («Təsdiqlə», «Düzəliş tələb et») ola bilər
(Task 4): real sifarişdə onları basmayın.

### H-01 — İdarəetmə paneli, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) paneli Sentyabr 2026, «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." (`BRIEFS/TASK-09.md`:19); hansı endə olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-02 — İdarəetmə paneli, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) paneli Sentyabr 2026, «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." (`BRIEFS/TASK-09.md`:19); hansı endə olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-03 — Aylıq hesabat, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Aylıq hesabat»-ı açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-04 — Aylıq hesabat, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Aylıq hesabat»-ı açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-05 — Obyektlər, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Obyektlər» · `/locations` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər»-i açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-06 — Obyektlər, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Obyektlər» · `/locations` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər»-i açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-07 — Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi · `/locations/<nömrə>` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər» → Heydər Əliyev Mərkəzi, «Keçən ay»; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-08 — Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi · `/locations/<nömrə>` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər» → Heydər Əliyev Mərkəzi, «Keçən ay»; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-09 — Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · sifariş səhifəsi · `/orders/<nömrə>` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişini «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; qərar düymələri varsa, basmayın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-10 — Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · sifariş səhifəsi · `/orders/<nömrə>` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişini «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; qərar düymələri varsa, basmayın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-11 — «Məhsul tarixçəsi» pəncərəsi, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Məhsul tarixçəsi», Heydər Əliyev Mərkəzinin Sentyabr sifarişindən · öz ünvanı yoxdur · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) H-09-un səhifəsində «Əsas dəyişikliklər» siyahısının birinci sətrini basın; 3) pəncərəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın və pəncərəni bağlayın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-12 — «Məhsul tarixçəsi» pəncərəsi, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Məhsul tarixçəsi», Heydər Əliyev Mərkəzinin Sentyabr sifarişindən · öz ünvanı yoxdur · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) H-10-un səhifəsində «Əsas dəyişikliklər» siyahısının birinci sətrini basın; 3) pəncərəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın və pəncərəni bağlayın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-13 — Təsdiq gözləyənlər, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Təsdiq gözləyənlər» · `/approvals` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Təsdiq gözləyənlər»-i açın; sətirlərdə «Təsdiqlə» və «Düzəliş tələb et» varsa, basmayın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-14 — Təsdiq gözləyənlər, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Təsdiq gözləyənlər» · `/approvals` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Təsdiq gözləyənlər»-i açın; sətirlərdə «Təsdiqlə» və «Düzəliş tələb et» varsa, basmayın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-15 — Təchizatçılar, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Təchizatçılar» · `/suppliers` · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Təchizatçılar»-ı açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-16 — Təchizatçılar, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Təchizatçılar» · `/suppliers` · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Təchizatçılar»-ı açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-17 — Qiymət təsnifatı, 1366
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Qiymət təsnifatı» · `/pricing-modes`, ünvan sətrinə yazılır · 1366 × 768
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1366 × 768 edin (`01-hazirliq.md`, 6-cı bənd); 2) ünvan sətrinə `/pricing-modes` yazın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-18 — Qiymət təsnifatı, 1440
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Qiymət təsnifatı» · `/pricing-modes`, ünvan sətrinə yazılır · 1440 × 900
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1440 × 900 edin (`01-hazirliq.md`, 6-cı bənd); 2) ünvan sətrinə `/pricing-modes` yazın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-19 — İdarəetmə paneli, 390
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd); 2) paneli Sentyabr 2026, «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: C bölməsində Task 12-nin sətirləri; sınaq mühitinin telefon yoxlaması «Sınaq 2»-dədir (F-09). Bu en üçün brief rəqəm vermir.
İlk auditdə: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." (`BRIEFS/TASK-09.md`:19); hansı endə olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-20 — İdarəetmə paneli, 1200
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «İdarəetmə paneli» · `/dashboard` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1200 × 800 edin (`01-hazirliq.md`, 6-cı bənd); 2) paneli Sentyabr 2026, «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: ""Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur." (`BRIEFS/TASK-09.md`:19); hansı endə olduğunu brief demir.
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-21 — Aylıq hesabat, 390
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Aylıq hesabat»-ı açın (bu endə cədvəlin yerinə siyahı göstərilir: `components/reports/MonthlyReportTable.tsx`:447–453); 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: C bölməsində Task 12-nin sətirləri; sınaq mühitinin telefon yoxlaması «Sınaq 2»-dədir (F-09). Bu en üçün brief rəqəm vermir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-22 — Aylıq hesabat, 1200
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · «Aylıq hesabat» · `/dashboard/monthly` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1200 × 800 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Aylıq hesabat»-ı açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 12 ayın hamısının görünüb-görünmədiyini də yazın; 4) üç müşahidəni yazın.
Gözlənilən: "1200px enində də 12 aylıq cədvəli görürəm." (`BRIEFS/TASK-08.md`:52); "12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur." (`BRIEFS/TASK-08.md`:23)
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-23 — Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 390
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · sifariş səhifəsi · `/orders/<nömrə>` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd); 2) Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişini «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; aşağıdakı zolaqda qərar düymələri varsa, basmayın; 4) üç müşahidəni yazın.
Gözlənilən: C bölməsində Task 12-nin sətirləri; sınaq mühitinin telefon yoxlaması «Sınaq 2»-dədir (F-09). Bu en üçün brief rəqəm vermir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-24 — Heydər Əliyev Mərkəzinin Sentyabr sifarişi, 1200
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · sifariş səhifəsi · `/orders/<nömrə>` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1200 × 800 edin (`01-hazirliq.md`, 6-cı bənd); 2) Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişini «Keçən ay» ilə açın; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; qərar düymələri varsa, basmayın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-25 — Heydər Əliyev Mərkəzinin obyekt səhifəsi, 390
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi · `/locations/<nömrə>` · 390 × 844
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər» → Heydər Əliyev Mərkəzi, «Keçən ay»; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: C bölməsində Task 12-nin sətirləri; sınaq mühitinin telefon yoxlaması «Sınaq 2»-dədir (F-09). Bu en üçün brief rəqəm vermir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### H-26 — Heydər Əliyev Mərkəzinin obyekt səhifəsi, 1200
Mənbə: `BRIEFS/TASK-15.md`, «Qəbul edilmiş qərarlar»; protokol §6.6, sitat: "Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk."
Harada: real · Heydər Əliyev Mərkəzinin obyekt səhifəsi · `/locations/<nömrə>` · 1200 × 800
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) eni 1200 × 800 edin (`01-hazirliq.md`, 6-cı bənd); 2) «Obyektlər» → Heydər Əliyev Mərkəzi, «Keçən ay»; 3) səhifəni yuxarıdan aşağı sürüşdürüb baxın; 4) üç müşahidəni yazın.
Gözlənilən: brief rəqəm vermir
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Üfüqi sürüşdürmə:
  - Kəsilən və ya üst-üstə düşən mətn/rəqəm:
  - Qeyd olunan başqa şey:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## I. Əvvəlki tasklardan daşınan qeydlər

Bu bölmə protokolun §3-ündəki siyahıdır (`AI_WORKFLOW/TASKS/TASK-15.md`:110–125): qəbul edilmiş tasklar bu qeydləri
yekun auditə ötürüb. Hər qeyd bir sətirdir; Task 16b-nin yeddi texniki sözü hər biri ayrıca sətirdir (I-01 … I-07).

- **Harada oxunur.** Import ekranları Rəhbərə bağlıdır (`App.tsx`:61–63) və real importun ünvanı heç kimlə açılmır
  (`03-emrler.md`, 5.1). Ona görə yeddi söz sınaq mühitində, `sinaq.koordinator` ilə, `04-sandbox.md`, «Sınaq 3» gedərkən
  oxunur. Hər sətir sözün göründüyü addımı və kodda harada olduğunu göstərir.
- **Bu bölmə heç nə yazmır.** Sınaq mühitinin yazma addımları yalnız `04-sandbox.md`-dədir; burada yalnız o addımlar
  gedərkən ekranda görünən oxunur.
- **Hökm.** «hələ var» — qeyd hələ də qüvvədədir: söz ekrandadır, iki yazılış hələ də fərqlidir, mətn sitatdakı
  kimidir və s. «artıq yoxdur» — qeyd artıq qüvvədə deyil. Hər sətir öz qeydi üçün bunu açır. Bu, qeydin yaxşı və ya
  pis olduğu haqqında hökm deyil; onu 15b yazır.

### I-01 — Import ekranı: "Bu mərhələdə sorğu yaradılmır"
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "16b: non-price technical words left on the import screens (`REVIEWS/TASK-16b.md`, "Notes"): "Bu mərhələdə sorğu yaradılmır";"
Harada: sınaq · «Excel importları», yükləmədən sonra · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 2-dən sonra import səhifəsi açıqdır (ünvandakı `?id=` sınaq importunundur, `04-sandbox.md`, Sınaq 3, addım 2); 2) səhifənin başlığının altındakı təsviri və qruplar cədvəlinin altyazısını oxuyun; 3) sözün harada göründüyünü sözbəsöz yazın; heç nəyi basmayın.
Gözlənilən: kodda iki yerdə var: səhifənin təsviri (`pages/ImportsPage.tsx`:112) və qruplar cədvəlinin altyazısı (`components/imports/ImportGroupsTable.tsx`:20); ikisi də yükləmədən sonra səhifədədir (`ImportsPage.tsx`:156–168). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-02 — Import ekranı: «staging»
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "«staging»;"
Harada: sınaq · «Excel importları», «İdxal hazırdır» bölməsi və «İdxalı təsdiqlə» pəncərəsi · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 8: «İdxal hazırdır» bölməsinin mətnini oxuyun; 2) «İdxalı təsdiqlə»-ni basanda açılan pəncərənin mətnini oxuyun; pəncərədəki son düymə Sınaq 3-ün öz addımıdır, bu sətir üçün lazım deyil; 3) sözün harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda iki yerdə var: «İdxal hazırdır» bölməsi — "Baxış bitdi. Növbəti addım staging sətirlərindən real sifarişlər yaratmaqdır." (`pages/ImportsPage.tsx`:253–256); «İdxalı təsdiqlə» pəncərəsi (`components/imports/review/ConfirmationDialog.tsx`:321). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-03 — Import ekranı: "Sifariş siyahıları növbəti mərhələdə əlavə olunacaq"
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: ""Sifariş siyahıları növbəti mərhələdə əlavə olunacaq";"
Harada: sınaq · «Excel importları», «İdxal tamamlandı» paneli · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 9: «İdxal tamamlandı» panelinin mətnini oxuyun; 2) sözün harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda nəticə panelindədir: "Xəbərdarlıqlar yox olmayıb: qiyməti olmayan sətirlər Qiymət təsnifatında görünür, mümkün təkrarlar ayrı-ayrı sətir olaraq qalır. Sifariş siyahıları növbəti mərhələdə əlavə olunacaq." (`pages/ImportsPage.tsx`:289–292). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-04 — Import ekranı: «Mövcud sorğu»
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "«Mövcud sorğu»;"
Harada: sınaq · «Excel importları», qruplar cədvəli · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 2-dən sonra import səhifəsində qruplar cədvəlinin sütun başlıqlarını oxuyun; 2) sözün harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda qruplar cədvəlinin sütun başlığıdır (`components/imports/ImportGroupsTable.tsx`:37). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-05 — Import ekranı: «Versiya»
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "«Versiya»;"
Harada: sınaq · «Excel importları», «İdxalı təsdiqlə» pəncərəsinin qruplar cədvəli · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 8: «İdxalı təsdiqlə» pəncərəsinin qruplar cədvəlini oxuyun; 2) sözün harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda pəncərənin qruplar cədvəlindədir: sütun başlığı «Versiya» (`components/imports/review/ConfirmationDialog.tsx`:210) və xanalarda "Versiya N" (`ConfirmationDialog.tsx`:239–241). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-06 — Import ekranı: «Ö/v»
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "«Ö/v»;"
Harada: sınaq · «Excel importları»: sətirlər cədvəli, sətrin detalları, «Uyğunsuzluqları həll et»-in pəncərələri · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 2-dən sonra sətirlər cədvəlinin sütun başlıqlarını oxuyun; 2) addım 3-də «Mövcud olana bağla» və «Yeni yarat» pəncərələri açılanda onların sahələrini oxuyun; 3) sözün harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda bu yerlərdə var: sətirlər cədvəlinin sütunu (`components/imports/ImportRowsTable.tsx`:118); sətrin detal pəncərəsi (`components/imports/review/RowDetailDialog.tsx`:281); «Mövcud olana bağla» pəncərəsi (`components/imports/review/MapExistingDialog.tsx`:124); «Yeni yarat» pəncərəsi (`components/imports/review/CreateResolutionDialog.tsx`:205); sütun adları (`components/imports/labels.ts`:110). «hələ var» — söz ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-07 — Import ekranı: `vərəq:sətir` istinadı
Mənbə: protokol §3 (Task 16b-dən, `REVIEWS/TASK-16b.md`, "Notes"), sitat: "`vərəq:sətir`."
Harada: sınaq · «Excel importları»: yoxlamanın «Qiymət təsnifatı» tabı, «Uyğunsuzluqları həll et», sətrin detalları · `http://localhost:5174/imports?id=<sınaq importunun nömrəsi>` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 5 və 6: yoxlamanın «Qiymət təsnifatı» tabında sətirlərin «Excel faylındakı təchizatçı xanası» yanında vərəq və sətir nömrəsini oxuyun; 2) addım 3-də «Uyğunsuzluqları həll et» siyahısında və sətrin detal pəncərəsinin başlığında oxuyun; 3) harada göründüyünü sözbəsöz yazın.
Gözlənilən: kodda bu yerlərdə var: «Qiymət təsnifatı» tabı, `<vərəq>:<sətir>` (`components/imports/review/PricingClassificationTab.tsx`:266–271); sətrin detal pəncərəsinin başlığı, "Sətir N · <vərəq>" (`components/imports/review/RowDetailDialog.tsx`:77); həll olunmayan dəyərin sətirləri, "Sətir N: …" (`components/imports/review/UnresolvedList.tsx`:178–179). «hələ var» — istinad ekrandadır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Harada göründü (ekran, «Sınaq 3»-ün addımı, mətn):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-08 — İki yerdə fərqli düymə yazılışı
Mənbə: protokol §3 (Task 16b-dən, `AI_WORKFLOW/PLAN.md`, Task 16b, "For Task 15"), sitat: "16b: the button wording differs between Qiymət təsnifatı («Şirkətdaxili təminat kimi qeyd et» / «Alış qiyməti tələb olunur») and the import tab («Ödənişsiz daxili təminat kimi qeyd et» / «Alış qiyməti tələb olunur kimi qeyd et»)."
Harada: sınaq · yoxlamanın «Qiymət təsnifatı» tabı və «Qiymət təsnifatı» səhifəsi · `http://localhost:5174/imports?id=<nömrə>`, `http://localhost:5174/pricing-modes` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 6: tabda sətir işarələnəndə görünən iki düymənin yazısını sözbəsöz yazın; düymələri basmaq Sınaq 3-ün öz addımıdır, bu sətir yalnız oxuyur; 2) «Sınaq 3», addım 12: «Qiymət təsnifatı» səhifəsində sətir işarələnəndə görünən iki düymənin yazısını yazın (`pages/PricingModeReviewPage.tsx`:219–236); 3) addım 13-dəki kimi, hökm vermədən.
Gözlənilən: import tabı — «Alış qiyməti tələb olunur kimi qeyd et», «Ödənişsiz daxili təminat kimi qeyd et» (`pricing/labels.ts`:153–157); «Qiymət təsnifatı» səhifəsi — «Şirkətdaxili təminat kimi qeyd et», «Alış qiyməti tələb olunur» (`pages/PricingModeReviewPage.tsx`:227, 234). «hələ var» — iki yerin yazılışı hələ də fərqlidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Import tabının iki düyməsi:
  - «Qiymət təsnifatı» səhifəsinin iki düyməsi:
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-09 — Təchizatçılar: «Qiymət tələb olunmur» pəncərəsinin mətni
Mənbə: protokol §3 (Task 16a-dan), sitat: "16a: the NotRequired dialog on the Suppliers page (`SuppliersPage.tsx:258–261`) overstates what it does."
Harada: sınaq · «Təchizatçılar», «Qiymət siyasəti» pəncərəsi · `http://localhost:5174/suppliers` · 1366
Addımlar: `04-sandbox.md` §1-in üç yoxlaması. 1) `sinaq.koordinator` ilə, «Sınaq 3», addım 5: «Təchizatçılar» → təchizatçının sətrində «Dəyiş» (`pages/SuppliersPage.tsx`:176–183); 2) «Qiymət siyasəti» pəncərəsinin (`SuppliersPage.tsx`:246) «Hazırda», «Yeni» sətirlərini və boz qutudakı mətni **«Təsdiq et»-i basmazdan əvvəl** sözbəsöz yazın; 3) sonra addım 5-in qalanı ilə davam edin — «Təsdiq et» Sınaq 3-ün öz addımıdır, bu sətir yalnız oxuyur.
Gözlənilən: kodun mətni, hökmsüz (`pages/SuppliersPage.tsx`:258–261): "Bu təchizatçının qiyməti olmayan {N} sətri artıq çatışmayan qiymət kimi sayılmayacaq: xəbərdarlıqlarda görünməyəcək və təsdiq zamanı ayrıca təsdiq tələb etməyəcək. Sifariş sətirlərinə toxunulmur — yazılmış qiymətlər qalır, yazılmayanlar yazılmamış qalır." ({N} — təchizatçının qiyməti olmayan sətirlərinin sayı). «Yeni» sətri: «Qiymət tələb olunmur — daxili anbar» (`SuppliersPage.tsx`:20–23, 251–253). «hələ var» — mətn bu sitatdakı kimidir; «artıq yoxdur» — mətn dəyişib.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Hazırda» və «Yeni» sətirləri:
  - Boz qutudakı mətn, sözbəsöz:
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-10 — Qiymət təsnifatı: məhsul kodu və vərəq:sətir istinadı
Mənbə: protokol §3 (Task 14-dən, `AI_WORKFLOW/PLAN.md`, Task 14, "For Task 15"), sitat: "14: the pricing page a Rəhbər can open still shows product codes and the sheet:row reference."
Harada: real · «Qiymət təsnifatı» · `/pricing-modes`, ünvan sətrinə yazılır · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Rəhbər ilə ünvan sətrinə `/pricing-modes` yazın; 2) «Hamısı» süzgəcini basın (`pages/PricingModeReviewPage.tsx`:183–197) — bu, yalnız süzgəcdir, heç nə dəyişmir; 3) cədvəlin «Məhsul» sütununda məhsul adının altındakı sətri oxuyun: məhsul kodu · ölçü · təsvir (`PricingModeReviewPage.tsx`:258, 281–284, 469–472); 4) «Mənbə» sütununda Excel-dəki təchizatçı xanasını və `vərəq:sətir` istinadını oxuyun (`PricingModeReviewPage.tsx`:262, 305–314); 5) axtarış sahəsinin yazısını oxuyun (`PricingModeReviewPage.tsx`:214); 6) hər birindən bir nümunə yazın.
Gözlənilən: kodda: «Məhsul» sütununun ikinci sətri məhsul kodu ilə başlayır (`PricingModeReviewPage.tsx`:469–472); «Mənbə» sütununda «<Excel təchizatçısı>» · `<vərəq>:<sətir>` (`PricingModeReviewPage.tsx`:307–312); axtarış sahəsi «Məhsul, kod və ya obyekt…» (`PricingModeReviewPage.tsx`:214). «hələ var» — kod və istinad Rəhbərin gördüyü səhifədədir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Məhsul» sütununda kod (nümunə):
  - «Mənbə» sütununda `vərəq:sətir` (nümunə):
  - Axtarış sahəsinin yazısı:
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-11 — Heydər Əliyev Mərkəzi, Sentyabr, «Keçən ay»: +23,852.70
Mənbə: protokol §3 (Task 13c-dən, `AI_WORKFLOW/PLAN.md`, Task 13c, "Operator"), sitat: "13c: after the Sabun variant link is approved, HEM September "Keçən ay" should read +23,852.70."
Harada: real · Heydər Əliyev Mərkəzinin Sentyabr 2026 sifarişi, «Keçən ay» · `/orders/<nömrə>` · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) E-06-nın səhifəsi, «Keçən ay»; E-06 və E-07-də oxunubsa, eyni rəqəmləri yazın; 2) başlıqdakı «Fərq»-i (`components/decisions/DecisionHeadline.tsx`:130–137) və «Niyə dəyişib?»-in «Cəmi»-sini (`components/decisions/CauseSummary.tsx`:71–73) yazın; 3) Sabun əlaqəsinin təsdiqlənib-təsdiqlənmədiyini və Əmr 2-nin HEM sətrini A-07-dən köçürün.
Gözlənilən: +23,852.70 — "Heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir (Heydər Əliyev, Keçən ay: +23,852.70)." (`BRIEFS/TASK-13.md`:46). «artıq yoxdur» — ekran +23,852.70 göstərir; «hələ var» — başqa rəqəm göstərir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Başlıqdakı «Fərq»:
  - «Niyə dəyişib?»-in «Cəmi»:
  - Əmr 2-nin Sabun sətri (A-07):
  - Əmr 2-nin HEM sətri, `Current …, baseline …, difference …` (A-07):
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

### I-12 — Telefonda yoxlama, 390 × 844
Mənbə: protokol §3 (Task 12-dən, `AI_WORKFLOW/PLAN.md`, Task 12, "Open"), sitat: "12: the phone check at 390 × 844 was left to the operator."
Harada: real və sınaq · H-19, H-21, H-23, H-25 və F-09 · — · 390 × 844
Addımlar: `04-sandbox.md` §1-in üç yoxlaması (F-09 üçün). (Real: yalnız oxuyun; yazma düyməsini basmayın.) Ayrıca addım yoxdur: yoxlama real datada H-19, H-21, H-23, H-25-də, sınaq mühitində F-09-da («Sınaq 2») aparılır. Onların hökmlərini aşağıya köçürün.
Gözlənilən: Task 12 bu yoxlamanı operatora açıq saxlayıb, test sifarişi ilə birlikdə (`AI_WORKFLOW/PLAN.md`, Task 12). «artıq yoxdur» — beş sətrin hamısı aparılıb (nəticələri öz hökmlərindədir); «hələ var» — onlardan ən azı biri «yoxlanıla bilmədi»-dir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - H-19, H-21, H-23, H-25-in hökmləri:
  - F-09-un hökmü:
Rəqəm:
En:
Ekran şəkli:
Hökm: hələ var / artıq yoxdur / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## J. Son vəziyyət

Bu bölmə auditin sonunda, B … I bitəndən sonra aparılır (`README.md`, 4-cü bölmə, 5-ci addım). O, auditin özünün heç
nəyi dəyişmədiyinin sübutudur (protokol §9, 11-ci bənd). Hər sətir başlanğıcdakı A sətri ilə tutuşdurulur və
`Göründü:` altında `Başlanğıcla eynidir: bəli / xeyr` sətri var.

`03-emrler.md`, 4.5-dən: "A ilə J arasında fərqlənən hər sətir, nə olursa olsun, protokolun §8-i səviyyəsində
faktdır." Belə sətri, nə olursa olsun, `Qeyd:`-də tam yazın; onun haqqında hökm yazmayın.

Əmrlərin son çıxışını və `Compare-Object`-in çap etdiyini J-08-dən sonra, «K. Yeni tapıntılar» başlığından əvvəl
yapışdırın (`05-neticeler-qaytarilmasi.md`, 4-cü bənd).

### J-01 — Əmr 1, son oxunuş və başlanğıcla müqayisə
Mənbə: protokol §9, 11-ci bənd, sitat: "No real order, batch, classification, product match or user changed. Show this with the Qiymət təsnifatı totals and the batch states read at the end, equal to those read at §5.2."
Harada: real · PowerShell · `03-emrler.md`, Əmr 1; 4.5 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) `03-emrler.md`, 2-ci bölmə kimi, Əmr 1, çıxış `$env:TEMP\emr-1-J.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın (2.1, 2.2); 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) `03-emrler.md`, 4.5-dəki `Compare-Object` sətrini `emr-1-A.txt` və `emr-1-J.txt` üçün işlədin və çap etdiyi hər sətri yapışdırın; yığılma (build) sətirlərini nəzərə almayın (2.1).
Gözlənilən: `Compare-Object` heç nə çap etmir: Əmr 1-in Qiymət təsnifatı bloku və import sətirləri A-06-dakı ilə eynidir (`03-emrler.md`, 4.5). A-06 ilə tutuşdurulur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Çıxış kodu:
  - `Compare-Object` çıxışı (boşdursa «heç nə»):
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-02 — Əmr 2, son oxunuş və başlanğıcla müqayisə
Mənbə: protokol §9, 11-ci bənd, sitat: "No real order, batch, classification, product match or user changed."
Harada: real · PowerShell · `03-emrler.md`, Əmr 2; 4.5 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) J-01 kimi, Əmr 2 ilə, çıxış `$env:TEMP\emr-2-J.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın; 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) `Compare-Object`-i `emr-2-A.txt` və `emr-2-J.txt` üçün işlədin və çap etdiyi hər sətri yapışdırın.
Gözlənilən: `Compare-Object` heç nə çap etmir; ən azı Əmr 2-nin qərar sayı A-07-dəki ilə eynidir (`03-emrler.md`, 4.5). A-07 ilə tutuşdurulur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Çıxış kodu:
  - `Compare-Object` çıxışı (boşdursa «heç nə»):
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-03 — Əmr 3, son oxunuş və başlanğıcla müqayisə
Mənbə: protokol §9, 11-ci bənd, sitat: "No real order, batch, classification, product match or user changed."
Harada: real · PowerShell · `03-emrler.md`, Əmr 3; 4.5 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) J-01 kimi, Əmr 3 ilə, çıxış `$env:TEMP\emr-3-J.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın; 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) `Compare-Object`-i `emr-3-A.txt` və `emr-3-J.txt` üçün işlədin və çap etdiyi hər sətri yapışdırın.
Gözlənilən: `Compare-Object` heç nə çap etmir; ən azı Əmr 3-ün import və HD-002 blokları A-08-dəki ilə eynidir (`03-emrler.md`, 4.5). A-08 ilə tutuşdurulur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Çıxış kodu:
  - `Compare-Object` çıxışı (boşdursa «heç nə»):
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-04 — Əmr 4, son oxunuş: auditin heç nəyi dəyişmədiyinin sübutu
Mənbə: protokol §9, 11-ci bənd, sitat: "No real order, batch, classification, product match or user changed."
Harada: real · PowerShell · `03-emrler.md`, Əmr 4; 4.5 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın. `03-emrler.md`, 1.4-dəki əmrləri işlətməyin.) 1) J-01 kimi, Əmr 4 ilə, çıxış `$env:TEMP\emr-4-J.txt` faylına; 2) ikinci sətri və çıxış kodunu yoxlayın; 3) bütün çıxışı bu bölmənin sonuna yapışdırın; 4) `03-emrler.md`, 4.5-dəki sətri olduğu kimi işlədin: `Compare-Object (Get-Content "$env:TEMP\emr-4-A.txt") (Get-Content "$env:TEMP\emr-4-J.txt")`, və çap etdiyi hər sətri yapışdırın.
Gözlənilən: sonda işlədilən Əmr 4 başlanğıcdakı ilə eyni sətirləri çap edir: eyni fərq sətirləri, eyni `Key figures` sətirləri, eyni doqquz yoxlama sətri (`03-emrler.md`, 4.5). A-09 ilə tutuşdurulur. Başlanğıcdakı PASS və ya FAIL özü burada hökm deyil: tutuşdurulan A ilə J-nin eyniliyidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Çıxış kodu:
  - Son sətir:
  - `Compare-Object` çıxışı (boşdursa «heç nə»):
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-05 — Qiymət təsnifatının üç cəmi, yenidən
Mənbə: protokol §9, 11-ci bənd, sitat: "Show this with the Qiymət təsnifatı totals and the batch states read at the end, equal to those read at §5.2."
Harada: real · «Qiymət təsnifatı» · `/pricing-modes`, ünvan sətrinə yazılır · 1366
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) Rəhbər ilə, A-10-dakı kimi, `?order=` olmadan `/pricing-modes` açın; 2) «Yalnız baxış» qeydini yoxlayın; 3) üç cəmi oxuyun (`pages/PricingModeReviewPage.tsx`:173–179); 4) A-10, A-11, A-12-dəki səhifə rəqəmləri ilə tutuşdurun; ekran şəkli istəyə bağlıdır.
Gözlənilən: üç cəm A-10, A-11 və A-12-dəki ilə eynidir (protokol §9, 11-ci bənd).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - «Təsnif edilməyib»:
  - «Alış qiyməti tələb olunur»:
  - «Ödənişsiz daxili təminat»:
  - Oxunma vaxtı:
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-06 — Importların vəziyyəti, yenidən
Mənbə: protokol §9, 11-ci bənd, sitat: "Show this with the Qiymət təsnifatı totals and the batch states read at the end, equal to those read at §5.2."
Harada: real · PowerShell (J-01 və J-03-ün çıxışı) · `03-emrler.md`, 5.1 · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) A-13-dəki üç sətri J-01 (Əmr 1) və J-03 (Əmr 3) çıxışından eyni qaydada köçürün (`03-emrler.md`, 5.1); 2) A-13 ilə tutuşdurun. Heç bir hesabla `/imports?id=6` və ya başqa real importun ünvanını açmayın (`03-emrler.md`, 5.1).
Gözlənilən: üç sətir A-13-dəki ilə eynidir: `Imported: 1`; `#50010 … Imported … materialized True`; `#6 «…» NeedsReview: …` (`03-emrler.md`, 5.1; protokol §9, 11-ci bənd).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Əmr 1, `Import batches`:
  - Əmr 3, `#50010` sətri:
  - Əmr 1, `#6` sətri:
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-07 — Repozitoriyanın vəziyyəti
Mənbə: protokol §9, 11-ci bənd, sitat: "`git diff` against `7550eda` shows nothing outside `docs/audits/`. `git status` shows no other change beyond the untracked workflow files."
Harada: real · PowerShell · repozitoriyanın kök qovluğu · —
Addımlar: (Real: yalnız oxuyun; yazma düyməsini basmayın.) 1) `git rev-parse HEAD`, `git status --short`, `git diff --stat 7550eda HEAD` əmrlərini işlədin; 2) üçünün çıxışını bu bölmənin sonuna yapışdırın; 3) A-02 ilə tutuşdurun. `git commit`, `git reset`, `git checkout`, `git push` işlətməyin (`05-neticeler-qaytarilmasi.md`, 5-ci bənd).
Gözlənilən: HEAD A-02-dəki ilə eynidir; `git status --short` və `git diff --stat 7550eda HEAD` iş axınının dörd izlənməyən sətrindən (`?? AI_WORKFLOW/`, `?? monitor-agent.ps1`, `?? resume-agent.ps1`, `?? run-agent.ps1`) başqa yalnız `docs/audits/` altındakıları göstərir — `neticeler.md` və `ekranlar/` (protokol §9, 11-ci bənd; `01-hazirliq.md`, 2-ci bənd).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - HEAD:
  - `docs/audits/`-dan kənar dəyişmiş fayl (yoxdursa «yoxdur»):
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### J-08 — Təmizlik: sınaq mühiti, iş kitabının surəti, müvəqqəti fayllar
Mənbə: protokol §6.4, sitat: "After the flow, reset the sandbox again. No step touches `baxorders_dev`."
Harada: sınaq və kompüter · PowerShell · `04-sandbox.md`, «Hər seansdan sonra və audit bitəndə»; `03-emrler.md`, 7-ci bölmə · —
Addımlar: `04-sandbox.md` §1-in üç yoxlaması — bu sətirdə brauzerdə yazma əməli yoxdur; `-Reset` sınaq alətinin öz əmridir. 1) Son sınaq seansı `01-hazirliq.md`, 5.5 ilə bitib: dayandırmaq və `-Reset`; bitməyibsə, indi edin; 2) iş kitabının surətini silin: `Remove-Item -Recurse "$env:TEMP\sinaq-import"` (`04-sandbox.md`, «Hər seansdan sonra və audit bitəndə»); 3) J-01 … J-04-ün müqayisələri yapışdırılandan sonra müvəqqəti çıxış fayllarını silin: `Remove-Item "$env:TEMP\emr-[1-4]-[AJ].txt"` (`03-emrler.md`, 7-ci bölmə).
Gözlənilən: `-Reset` xətasız bitir və sınaq mühiti A-05-dəki vəziyyətə qayıdır — bir test sifarişi təsdiq gözləyir, bir qaralama qalır (`01-hazirliq.md`, 5.4); iki silmə əmri xətasız bitir. A-05 ilə tutuşdurulur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
  - Sonuncu `-Reset` xətasız bitdi:
  - İş kitabının surəti silindi:
  - Müvəqqəti çıxış faylları silindi:
  - Başlanğıcla eynidir: bəli / xeyr
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

---

## K. Yeni tapıntılar

Heç bir sətrin əhatə etmədiyi hər şey üçün aşağıdakı bloku köçürün, hər yeni tapıntı üçün bir blok, nömrələri K-02,
K-03, … ilə. Bu şablonda ayırıcı sətrin yuxarısındakı sahələri də siz yazırsınız.

- Tapıntıya prioritet və ya task yazmayın: onları 15b verir.
- Tapıntı real datada Rəhbərə təklif olunan bir yazma əməlidirsə: düyməni basmayın, onu burada yazın və DAYANIN
  (protokol §8; `README.md`, 5-ci bölmə).

### K-01 — <qısa başlıq>
Mənbə: operatorun müşahidəsi
Harada: <real / sınaq> · <ekran> · <ünvan> · <en>
Addımlar: <ora necə gəlinir>
Gözlənilən: —
İlk auditdə: —
---- operator doldurur ----
Göründü:
  - Nə səhvdir:
Rəqəm:
En:
Ekran şəkli:
Hökm: —
Qeyd:
