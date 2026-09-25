# 04 — Sınaq mühitində yoxlamalar

Yazma tələb edən hər yoxlama yalnız sınaq mühitində (`baxorders_sandbox`) aparılır, real datada heç vaxt aparılmır
(protokol §6.2, §6.4, §8). Bu fayl həmin yoxlamaları beş prosedur kimi verir: **Sınaq 1** … **Sınaq 5**. Prosedurun
içindəki hər addım nömrələnib. Yoxlama siyahısı onlara belə istinad edir: "04-sandbox.md, Sınaq 3, addım 6".

- Yalnız mövcud sınaq aləti işlədilir. Alətə və onun hazır datasına heç nə əlavə edilmir.
- Sınaq mühitinin işə salınması, parol, hesablar, sıfırlamadan sonra nə qaldığı və seansdan sonra sıfırlama
  `01-hazirliq.md`, 5-ci bənddədir:
  - 5.1 — parol;
  - 5.2 — ardıcıllıq: `-Reset`, `-Run`, `dev:sandbox`;
  - 5.3 — hesablar: `sinaq.rehber`, `sinaq.koordinator`, `sinaq.admin`;
  - 5.4 — sıfırlamadan sonra nə qalır;
  - 5.5 — hər seansdan sonra.

  Bu fayl onları təkrarlamır.
- Hər ekran adı, düymə və ünvan onun götürüldüyü fayl və sətirlə göstərilib. Frontend faylları
  `frontend/bax-orders-web/src/` qovluğundadır; aşağıda bu ön hissə yazılmır. Fayl burada yazılandan fərqli bir şey
  deyirsə, faylın dediyinə əməl edin və fərqi `neticeler.md`-də yazın.
- Ekran şəkli bu fayla istinad edən yoxlama sətrinin nömrəsi ilə adlandırılır: `<ID>-<ekran>-<en>.png`
  (`01-hazirliq.md`, 7-ci bənd). Bu fayl yoxlama nömrəsi vermir.
- Daxil olmaq: `http://localhost:5174`, giriş səhifəsi `/login` (`auth/RequireAuth.tsx`, sətir 24). Çıxmaq: başlıqdakı
  «Çıxış» düyməsi (`layout/CurrentUserMenu.tsx`, sətir 42–43).
- En: `01-hazirliq.md`, 6-cı bənd.

---

## 1. Hər yazma əməlindən əvvəl — üç yoxlama

Hər yazma əməlindən əvvəl, hər dəfə, bu üçünü yoxlayın. Yazma əməli: göndərmək, təsdiqləmək, qaytarmaq, düzəltmək,
yükləmək, təsnif etmək, uyğunluğu təsdiqləmək və ya geri almaq.

1. Brauzerin ünvan sətrində `localhost:5174` var (`01-hazirliq.md`, 5.2; `vite.config.ts`, sətir 12).
2. Səhifənin yuxarısında sınaq mühitinin zolağı var (`environment/labels.ts`, sətir 2–3):

   > Sınaq mühiti — burada real sifariş yoxdur. Burada edilən təsdiq və düzəlişlər real dataya təsir etmir.
3. Başlıqda daxil olmuş istifadəçinin adı «Sınaq …» ilə başlayır (`layout/CurrentUserMenu.tsx`, sətir 22). Adlar:
   «Sınaq Rəhbəri», «Sınaq Koordinatoru», «Sınaq Administratoru»
   (`tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`, sətir 12–17).

Üçündən biri yoxdursa: **DAYANIN.** `5173` portunda (real sistem, `01-hazirliq.md`, 3.3) heç bir yazma əməli heç vaxt
edilmir.

---

## 2. `-Run` faylın məşğul olduğunu deyib dayanarsa

Real API (`01-hazirliq.md`, 3.2) və sınaq API-si eyni layihəni, `src/BaxOrders.Api`-ni işə salır. Sınaq API-si bunu
`dotnet run --project … --launch-profile sandbox` ilə edir (`tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, sətir 40 və
68). Skriptdə yığılmanı (build) keçmək imkanı yoxdur. `-Run` yığılma xətası ilə dayanarsa və xəta bir faylın başqa proses
tərəfindən istifadə olunduğunu deyirsə ("used by another process"):

1. Real API-ni dayandırın: onun pəncərəsində `Ctrl+C`. API-ni dayandırmaq datanı dəyişmir (`01-hazirliq.md`, 3.2).
2. `-Run`-ı yenidən başladın və sınaq seansını aparın.
3. Seansdan sonra onu dayandırın və sıfırlayın (`01-hazirliq.md`, 5.5).
4. Real API-ni `01-hazirliq.md`, 3.2-dəki kimi yenidən başladın. Onun yeni başlama vaxtını və `git rev-parse HEAD`-in
   çıxışını `neticeler.md`-də A bölməsinə yazın.
5. Real API dayanan müddətdə real datanın heç bir ekranını oxumayın.

Bu xəta müşahidə edilməyib; bu, ehtiyat tədbiridir. Frontend-in ayarı iki sistemin eyni vaxtda işləməsi üçün
qurulub (`vite.config.ts`, sətir 8–10).

---

## 3. Seansların sırası

Hər seans `01-hazirliq.md`, 5.2 ilə başlayır (`-Reset`, `-Run`, `dev:sandbox`) və 5.5 ilə bitir (dayandırmaq,
`-Reset`).

| Seans | Prosedur | En | Hesablar |
|---|---|---|---|
| 1 | Sınaq 1 — təsdiq axını | 1366 × 768 | `sinaq.rehber`, `sinaq.koordinator`, `sinaq.admin` |
| 2 | Sınaq 2 — təsdiq axını telefonda | 390 × 844 | eyni |
| 3 | Sınaq 3 — import və qiymət təsnifatı (Task 16), sonra Sınaq 4 — məhsul uyğunluğu (Task 13), eyni data ilə | 1366 × 768 | eyni |

Seans 3-də import hazır olmursa, Sınaq 5-ə keçin.

---

## Sınaq 1 — Təsdiq axını, 1366 × 768

**Hansı sifariş və niyə.** Axın təsdiq gözləyən test sifarişində aparılır: **Sınaq obyekti 1**, Sentyabr 2026.
Səbəblər:

- Protokolun §6.4-ü axının test sifarişində aparılmasını tələb edir.
- Bu obyektin İyul və Avqust sifarişləri var, ona görə Rəhbər baxanda «Niyə dəyişib?» bölməsinin müqayisə bazası olur
  (`SandboxScenario.cs`, sətir 66–93).
- Sifarişin sonuncu sətrinin qiyməti yoxdur, ona görə təsdiq zamanı xüsusi qeyd tələb olunur (sətir 40–53).

Bu sifariş sıfırlama zamanı artıq göndərilib. Onu `sinaq.koordinator`-un adından, ekranın işlətdiyi xidmət göndərib
(`tools/BaxOrders.ApprovalSandbox/SandboxSeed.cs`, sətir 117–125). "Sifariş göndərilir" addımını əl ilə də görmək üçün
koordinator **Sınaq obyekti 2**-nin qaralamasını göndərir (addım 2). Qaralama elə bunun üçün saxlanılıb: "so 'sifariş
göndərilir' can be done by hand" (`SandboxScenario.cs`, sətir 55–64).

**Hər addımda yazılacaq dörd fakt.** Qərar paneli açıq olanda, onun göstərdiyini yazın
(`components/workflow/labels.ts`, sətir 71–81):

1. kim göndərib və nə vaxt: «Göndərən», «Göndərilib»;
2. hansı göndərişdir, biznes sözləri ilə: «Göndəriş», məsələn «İlk göndəriş» və ya «İkinci göndəriş · düzəliş
   tələbindən sonra» (sətir 83–119);
3. əvvəlki düzəliş səbəbi: «Əvvəlki düzəliş səbəbi»;
4. kim təsdiqləyib və nə vaxt: «Təsdiqləyən», «Təsdiq tarixi».

Panel bir faktı göstərmirsə, "yoxdur" yazın.

1. **Rəhbər: növbədə bir test sifarişi.** Sıfırlamadan dərhal sonra `sinaq.rehber` ilə daxil olun. Üç yoxlamanı edin
   (1-ci bölmə).
   - Menyuda «Təsdiq gözləyənlər»-i açın: `/approvals` (`layout/navigation.ts`, sətir 30). Səhifənin başlığı «Təsdiq
     gözləyənlər»-dir (`pages/ApprovalInboxPage.tsx`, sətir 129).
   - Yazın: siyahıda neçə sifariş var və hansılardır. Gözlənilən: bir sifariş, Sınaq obyekti 1, Sentyabr 2026
     (`01-hazirliq.md`, 5.4). Sətirdə «Qərar gözləyir» yazılır (`components/approvals/ApprovalRows.tsx`, sətir 239–243).
   - Çıxın.
2. **Koordinator: sifariş əl ilə göndərilir.** `sinaq.koordinator` ilə daxil olun. Üç yoxlamanı edin.
   - Yazın: menyuda «Təsdiq gözləyənlər» varmı. Koordinator bu növbəni görmür: onu yalnız Rəhbər və admin görür
     (`App.tsx`, sətir 35–39; `src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs`, sətir 70).
   - «Obyektlər»-i açın (`/locations`, `layout/navigation.ts`, sətir 34). Sonra «Sınaq obyekti 2»-ni, sonra onun
     Sentyabr 2026 sifarişini açın (ünvan `/orders/<nömrə>`, `App.tsx`, sətir 43).
   - Panel «Təsdiqlənməyib» vəziyyətini və «Təsdiqə göndər» düyməsini göstərir (`components/workflow/labels.ts`, sətir
     6 və 49; `components/workflow/WorkflowPanel.tsx`, sətir 115–122).
   - «Təsdiqə göndər»-i basın. Eyni adlı pəncərə açılır: Obyekt, Dövr, Məbləğ (`components/workflow/WorkflowDialog.tsx`,
     sətir 30–34, 103–112). «Qeyd (məcburi deyil)» sahəsini boş buraxın və pəncərədəki «Təsdiqə göndər»-i basın.
   - Yazın:
     - yeni vəziyyət: «Təsdiq gözləyir» (`components/workflow/labels.ts`, sətir 7);
     - dörd fakt.
   - Çıxın.
3. **Admin: növbə və 4.3.** `sinaq.admin` ilə daxil olun. Üç yoxlamanı edin.
   - «Təsdiq gözləyənlər»-i açın. Yazın: sətirlərin sırası. Gözlənilən: əvvəl Sınaq obyekti 1 (sıfırlamada göndərilib),
     sonra Sınaq obyekti 2 (addım 2-də göndərilib). Səhifənin öz təsviri belədir: "Qərar gözləyən bütün sifarişlər,
     təsdiq üçün göndərilmə sırasına görə" (`pages/ApprovalInboxPage.tsx`, sətir 129).
   - Yazın:
     - hər sətirdə «Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.» yazısı görünürmü;
     - sətirlərdə «Təsdiqlə» və «Düzəliş tələb et» düymələri yoxdurmu.

     Mənbə: `components/approvals/ApprovalRows.tsx`, sətir 219–224 və 259–278.
   - Sınaq obyekti 1-in sətrində «Sifarişə bax»-ı basın (sətir 279–284). Yazın:
     - qərar panelində eyni yazı var və «Təsdiqlə» düyməsi yoxdur (`components/workflow/WorkflowPanel.tsx`, sətir
       98–104, 124–132);
     - dörd fakt.

     Təsdiq səlahiyyəti yalnız Rəhbər roludur (`src/BaxOrders.Api/Security/SecuritySetup.cs`, sətir 76–78;
     `ICurrentUserContext.cs`, sətir 64).
   - Heç nəyi dəyişməyin. Çıxın.
4. **Rəhbər sifarişə baxır.** `sinaq.rehber` ilə daxil olun. Üç yoxlamanı edin.
   - «Təsdiq gözləyənlər»-də Sınaq obyekti 1-in sətrində «Sifarişə bax»-ı basın.
   - Dörd faktı yazın. Gözlənilən:
     - «Göndərən» — Sınaq Koordinatoru;
     - «Göndərilib» — sıfırlama vaxtı;
     - «İlk göndəriş»;
     - əvvəlki səbəb yoxdur.
   - «Niyə dəyişib?» bölməsini (`components/decisions/CauseSummary.tsx`, sətir 68) aşağı sürüşdürərək oxuyun. Yazın:
     «Təsdiqlə» və «Düzəliş tələb et» düymələri olan panel təhlilin yanında görünən qalırmı
     (`components/workflow/WorkflowPanel.tsx`, sətir 108–114).
   - Qiymət xəbərdarlığının mətnini olduğu kimi yazın. Sonuncu sətrin qiyməti yoxdur (`SandboxScenario.cs`, sətir 52).
5. **Rəhbər: səbəbsiz qaytarmaq olmur (4.2), sonra səbəblə qaytarır.**
   - Paneldə «Düzəliş tələb et»-i basın. «Düzəliş tələb et» adlı pəncərə açılır: sahə «Səbəb», içində «Nəyin
     düzəldilməli olduğunu yazın» (`components/workflow/WorkflowDialog.tsx`, sətir 30–34, 121–133).
   - Sahəni boş saxlayın (və ya yalnız boşluq yazın). Yazın:
     - pəncərədəki «Düzəliş tələb et» düyməsi basılmırmı;
     - sahənin altında «Düzəliş tələb etmək üçün səbəb yazılmalıdır.» görünürmü.

     Mənbə: `WorkflowDialog.tsx`, sətir 61–62, 94, 132; `components/workflow/labels.ts`, sətir 152.
   - Qısa səbəb yazın, məsələn «Zibil paketinin miqdarını yoxlayın.», sonra «Düzəliş tələb et»-i basın.
   - Yazın:
     - vəziyyət: «Düzəliş tələb olunur» (`components/workflow/labels.ts`, sətir 9);
     - panelin «Düzəliş tələb edən», «Tarix», «Səbəb» sahələri (sətir 76–78);
     - "Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu sifarişdə aparılmır: düzəldilmiş sifariş yaradılır." yazısı
       (`WorkflowPanel.tsx`, sətir 163–167).
   - Çıxın.
6. **Koordinator düzəldib yenidən göndərir.** `sinaq.koordinator` ilə daxil olun. Üç yoxlamanı edin.
   - «Obyektlər» → «Sınaq obyekti 1» → Sentyabr 2026. Yazın: vəziyyət və səbəb koordinatora necə görünür.
   - «Düzəliş versiyası yarat»-ı basın (`components/orders/revision/labels.ts`, sətir 4;
     `components/orders/revision/RevisionPanel.tsx`, sətir 78–85). Pəncərədə "Köhnə versiya dəyişdirilməyəcək. Yeni,
     təsdiqlənməmiş versiya yaradılacaq." yazılır (`labels.ts`, sətir 9–10). Təsdiq edin.
   - Yeni versiya özü açılmırsa, «Düzəldilmiş sifarişə bax»-ı basın (`labels.ts`, sətir 6).
   - «Sınaq məhsulu — zibil paketi» sətrində «Redaktə et»-i basın (`labels.ts`, sətir 12). Miqdarı dəyişin (140 → 130)
     və yadda saxlayın.
   - Sonuncu sətrin qiymətini boş saxlayın, ki, addım 7-də qiymətsiz sətir üçün qeyd yenə tələb olunsun.
   - Paneldə göndərmə düyməsini basın: «Təsdiqə göndər» və ya «Yenidən təsdiqə göndər», hansı görünürsə
     (`WorkflowPanel.tsx`, sətir 115–122; `components/workflow/labels.ts`, sətir 49–50). Pəncərədə göndərin.
   - Yazın:
     - koordinatorun gördüyü düymə və yazıların adları, olduğu kimi;
     - yeni vəziyyət;
     - dörd fakt.

     Brief 04 tələb edir ki, panel bunun ikinci göndəriş olduğunu və Rəhbərin səbəbini göstərsin (`BRIEFS/TASK-04.md`,
     «Acceptance», 3-cü bənd).
   - Çıxın.
7. **Rəhbər təsdiqləyir — bu, K2 sayğacının yoludur.** K2-nin sayma cədvəli yoxlama siyahısının G bölməsindədir; yol
   burada keçilir (protokol §6.5).
   - `sinaq.rehber` ilə daxil olun. Üç yoxlamanı edin. Sayma İdarəetmə paneli giriş sonrası açılan kimi başlayır:
     `/dashboard` (`layout/navigation.ts`, sətir 27).
   - Addım 4–6-da gördüyünüz yolla gedin və hər klik və sürüşdürməni sırası ilə yazın. Təxmini yol:
     1. «Təsdiq gözləyənlər»;
     2. Sınaq obyekti 1-in sətri, «Düzəldilmiş sifariş» nişanı ilə (`terminology/terms.ts`, sətir 171);
     3. «Sifarişə bax»;
     4. dörd faktı oxumaq;
     5. «Təsdiqlə»;
     6. pəncərədə «Qiyməti olmayan sətirlərin mövcud olduğunu bilirəm.» qutusunu işarələmək
        (`components/workflow/labels.ts`, sətir 55; `WorkflowDialog.tsx`, sətir 135–145; işarələnməyincə düymə
        basılmır, sətir 62 və 94);
     7. pəncərədəki «Təsdiqlə».

     Növbə sətrinin öz «Təsdiqlə» düyməsi də var (`ApprovalRows.tsx`, sətir 259–268). Amma protokola görə faktlar yolda
     oxunmalıdır. Hansı yolu getdinizsə, onu sayın.
   - Sayma təsdiq bitəndə dayanır.
   - Yazın:
     - vəziyyət «Təsdiqlənib» (`components/workflow/labels.ts`, sətir 8), və səhifədə bir dəfə görünürmü (brief 04,
       «Acceptance», 4-cü bənd);
     - «Təsdiqləyən» və «Təsdiq tarixi» (sətir 79–80);
     - dörd fakt.
8. **Rəhbər: Excel-dən gəlmiş köhnə sifariş (4.1).** «Obyektlər» → «Sınaq obyekti 1» → Avqust 2026.
   - Qərar panelində yalnız bu cümlə olmalıdır: «Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.».
     Göndərən, təsdiqləyən və tarix olmamalıdır (`WorkflowPanel.tsx`, sətir 197–200; `components/workflow/labels.ts`,
     sətir 62–68).
   - Gördüyünüzü olduğu kimi yazın.
9. **Son.** `01-hazirliq.md`, 5.5: hər iki pəncərədə `Ctrl+C`, sonra `-Reset`.

---

## Sınaq 2 — Təsdiq axını telefonda, 390 × 844

1. `01-hazirliq.md`, 5.2 ilə başlayın. Sınaq 1-dən sonra `-Reset` edilib, ona görə test sifarişi yenə gözləyir.
2. Eni 390 × 844 edin (`01-hazirliq.md`, 6-cı bənd). Sınaq 1-in 1–8-ci addımlarını bu endə təkrarlayın. K2 burada
   sayılmır: protokol K2-ni 1366 × 768-də sayır (§6.5). Rəhbərin hər addımında bunları da yazın:
   - qərar düymələri ekranın aşağısına bərkidilmiş zolaqdadırmı, və «Niyə dəyişib?» sürüşdürülərkən orada qalırmı.
     1024 pikseldən dar ekranda belə qurulub (`components/workflow/WorkflowPanel.tsx`, sətir 109–114; Task 12);
   - səhifənin sonu zolağın altından çıxana qədər sürüşdürülə bilirmi (`pages/OrderDetailPage.tsx`, sətir 511–513);
   - pəncərələr (göndər, düzəliş tələb et, təsdiqlə) bu endə oxunur və düymələri basılırmı.
3. **Son.** `01-hazirliq.md`, 5.5.

---

## Sınaq 3 — Import və qiymət təsnifatı (Task 16), 1366 × 768

**Niyə import.** Brief 16-nın hər bəndi importun özündən keçir. Task 13-ün yoxlaması (Sınaq 4) da sifariş sətirləri
olan yeni məhsullar tələb edir. Sınaq mühitinə belə məhsulları ekran vasitəsilə gətirməyin yeganə yolu Excel importudur:
API-də import yoxlamasından kənarda məhsul yaradan ünvan yoxdur (`src/BaxOrders.Api/Controllers/`: `POST`/`PUT`
ünvanları).

**Niyə kəsilmiş surət.** Bütün iş kitabı 3,619 sətirdir (`docs/business-decisions.md`, sətir 12–24). Onu idxal etmək
üçün hər obyekti, məhsulu, vahidi və kateqoriyanı əvvəlcə həll etmək lazım olardı, bu da bir seansa sığmır. Surətdə bu
sətirlər qalır:

- Heydər Əliyev Mərkəzinin Avqust və Sentyabr sətirləri. Task 13-ün Sabun cütü onlardadır. HEM sınaq mühitinə
  tanışdır: obyekt və onun `H.Ə.M` alternativ adı miqrasiya ilə yaradılır
  (`src/BaxOrders.Infrastructure/Persistence/Migrations/20260922191708_InitialPostgres.cs`, sətir 1016 və 1037–1040).
  İş kitabında HEM `H.Ə.M` kimi yazılıb (`docs/business-decisions.md`, sətir 59 və 461).
- Nərimanov heykəlinin Sentyabr sətirləri. Brief-in qiymət nümunəsi onlardadır: «Qiymət yoxdur 1 · Daxili təminat 1»,
  təchizatçı «Daxili: Azpetrol baza» (`BRIEFS/TASK-15.md`, Task 2 nümunəsi; protokol §6.3).

Sınaq mühitinə yüklənən real iş kitabı yalnız sınaq mühitini dəyişir (`TASKS/TASK-15a.md`, §4.5), və `-Reset` onu silir.

1. **İş kitabının surəti (seansdan əvvəl, Excel-də).**
   - Surəti repozitoriyadan kənarda çıxarın:

     ```powershell
     New-Item -ItemType Directory -Force "$env:TEMP\sinaq-import" | Out-Null
     Copy-Item samples/imports/raw/Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx "$env:TEMP\sinaq-import\sinaq-hem-nerimanov.xlsx"
     ```

   - Excel-də yalnız **surəti** açın, `samples/`-dəki faylı yox. Vərəq `Əsas`-dır: başlıq 3-cü sətirdə, data 4-cü
     sətirdən başlayır (`docs/excel-import-notes.md`, sətir 40). 1–3-cü sətirlərə toxunmayın.
   - Başlıq sətrində süzgəci (filter) yandırın. Yalnız bu data sətirlərini saxlayın:
     - `Obyekt` = `H.Ə.M`, `Tarix` = Avqust 2026 və ya Sentyabr 2026. `Tarix` həmişə ayın 1-idir
       (`docs/excel-import-notes.md`, sətir 44–47);
     - `Obyekt` = `Nərimanov` və ya `Nərimanov Heykəli`, `Tarix` = Sentyabr 2026 (`docs/business-decisions.md`, sətir
       456).
   - Süzgəcin `Obyekt` siyahısında Avqust–Sentyabr üçün Heydər Əliyev Mərkəzinin başqa yazılışı da görünürsə, həmin
     sətirləri də saxlayın. Məsələn, Task 3-ün alternativ adı «H.Ə.M Təmizlik» ola bilər (`BRIEFS/TASK-16.md`,
     «Mütləq qorunmalı davranışlar»). Hansı yazılışları saxladığınızı yazın.
   - Qalan data sətirlərini silin. Sətirlər yalnız silinir, heç bir xana dəyişdirilmir.
   - Surəti `.xlsx` kimi yadda saxlayın. Yazın: obyekt və ay üzrə neçə data sətri qaldı.
   - Surət heç vaxt repozitoriyaya qoyulmur. Audit bitəndə silinir (bu faylın sonu).
2. **Yükləmə.** `sinaq.koordinator` ilə daxil olun. İmport Koordinator və Admin roluna açıqdır
   (`src/BaxOrders.Api/Security/SecuritySetup.cs`, sətir 70–71). Üç yoxlamanı edin.
   - Menyuda «Excel importları»-nı açın (`/imports`, `layout/navigation.ts`, sətir 33).
   - "Excel faylını bura sürükləyin və ya fayl seçin" sahəsində surəti seçin (`components/imports/FileDropZone.tsx`,
     sətir 32–41), sonra «Yüklə və yoxla»-nı basın (`pages/ImportsPage.tsx`, sətir 126–133).
   - Yazın:
     - importun nömrəsi (ünvandakı `?id=`, `ImportsPage.tsx`, sətir 87);
     - vəziyyəti (`components/imports/labels.ts`, sətir 7–15);
     - sətir sayı.
3. **Dəyərləri həll etmək.** Bölmənin adı «Uyğunsuzluqları həll et»-dir (`components/imports/review/ReviewCenter.tsx`,
   sətir 107). Tabların adları `components/imports/labels.ts`, sətir 51–60-dadır. Hər dəyər üçün iki düymə var:
   «Mövcud olana bağla» və «Yeni yarat» (`components/imports/review/UnresolvedList.tsx`, sətir 201 və 209). Çox dəyəri
   birdən həll etmək üçün:
   - «Bu səhifəni seç» (sətir 106);
   - «Seçilənləri mövcud olana bağla» (sətir 128);
   - «Seçilənləri göstərilən adla … kimi yarat» (sətir 131–141).

   Toplu əməliyyat əvvəl nə ediləcəyini göstərir, sonra təsdiq istəyir (`docs/excel-import-notes.md`, sətir 435–441).
   Bir əməliyyatda ən çoxu 150 dəyər olur (`src/BaxOrders.Application/Imports/ImportOptions.cs`, sətir 17).
   - **«Obyektlər».**
     - `H.Ə.M` burada olmamalıdır: onu miqrasiyanın alternativ adı tanıyır.
     - `Nərimanov Heykəli`: «Yeni yarat» ilə, iş kitabındakı kimi yazılmış obyekt yaradın.
     - `Nərimanov` (varsa): «Mövcud olana bağla» ilə indicə yaradılan obyektə bağlayın. Səbəb: biznes qeydlərində bu
       iki yazılışın eyni obyekt olduğu yazılıb (CB-03, `docs/business-decisions.md`, sətir 54). Bu, yalnız sınaq
       mühitinin datasıdır; burada Task 3-ün heç bir qaydası tətbiq edilmir.
     - 1-ci addımda saxlanılan HEM-in başqa yazılışı varsa: «Mövcud olana bağla» ilə «Heydər Əliyev Mərkəzi»-nə bağlayın.
     - Nə etdiyinizi yazın.
   - **«Sifariş vahidləri».** Naməlum sifariş vahidi xətadır və importu dayandırır (`docs/excel-import-notes.md`, sətir
     176).
     - Mövcud vahidin yazılışı olan dəyəri həmin vahidə bağlayın. Miqrasiyanın yaratdığı vahidlər və onların yazılışları
       `20260922191708_InitialPostgres.cs`, sətir 1019–1072-dədir.
     - Heç bir vahidə uyğun gəlməyən dəyəri «Yeni yarat» ilə, bir-bir yaradın: kod, ad, simvol, növ. Vahidləri toplu
       yaratmaq olmur (`src/BaxOrders.Application/Imports/Review/BulkResolutionRules.cs`, sətir 12–24 və 73–81).
     - Vahidi başqa vahidə bağlamayın.
   - **«Ölçü vahidləri».** Eyni qayda. Vahid olmayan söz üçün (məsələn "diş") «Bu vahid deyil» düyməsi var
     (`UnresolvedList.tsx`, sətir 186–194). Vahidləri həll olunmayan sətrin variantı olmur və o, importu gözlədir
     (`docs/excel-import-notes.md`, sətir 323–329).
   - **«Məhsullar».** «Bu səhifəni seç», sonra «Seçilənləri göstərilən adla məhsul kimi yarat». Ad iş kitabındakı
     kimi götürülür (`docs/excel-import-notes.md`, sətir 470–472). 150-dən çox dəyər varsa, səhifə-səhifə edin.
   - **«Variantlar».** Məhsullar və vahidlər həll olunandan sonra: seçin, sonra «Seçilən variantları yarat»
     (`UnresolvedList.tsx`, sətir 138–139).
   - **«Təchizatçılar»** və **«Cavabdeh şəxslər»**. Bunlar importu dayandırmır (`docs/excel-import-notes.md`, sətir
     182–186, 205–208). Yenə də toplu yaradın, iş kitabındakı kimi, ki, sətirlərdə təchizatçı adı olsun. Addım 5 buna
     əsaslanır.
   - **«Kateqoriyalar».** İmportu dayandırmır. Həll etməyin: kateqoriya yolu toplu yaradılmır (sətir 461, 463–466).
   - Yuxarıdakılardan sonra da xətası qalan sətir üçün: «Sətir düzəlişləri» (`ReviewCenter.tsx`, sətir 179–186).
     Xanaları düzəltməyin. Həll oluna bilməyən sətri səbəb yazaraq, bir-bir importdan çıxara bilərsiniz
     (`docs/excel-import-notes.md`, sətir 530–541). Hansı sətri və niyə çıxardığınızı yazın.
4. **«İmporta hazırlıq» paneli — brief 16, 1-ci bənd.** Panel: `components/imports/review/ReadinessPanel.tsx`, sətir 89.
   Yazın:
   - «İmporta hazırdır» və ya «İmporta hazır deyil» (sətir 95);
   - «Qalan maneələr», əgər varsa (sətir 171–187);
   - qiymət zolağı (sətir 214–236; `pricing/labels.ts`, sətir 118–120 və 136–138):
     - «N sətirdə qiymət yoxdur»;
     - bölgü: «Təsnif edilməyib U · Alış qiyməti tələb olunur P · Daxili təminat I»;
     - xəbərdarlıq «N sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.».

   Ekran şəkli çəkin. Seansın sonunda da «İmporta hazır deyil» qalırsa: Sınaq 5.
5. **Təchizatçıya görə təsnifatın olmadığını sınamaq üçün hazırlıq — brief 16, 4-cü bənd.** Bu addım yalnız sınaq
   mühitində edilir.
   - **Niyə.** Task 16a-dan əvvəl "qiymət tələb olunmur" kimi işarələnmiş təchizatçının idxal edilən qiymətsiz sətri
     mənbəyə görə «Ödənişsiz daxili təminat» olurdu. İndi bu heç vaxt olmamalıdır
     (`tools/BaxOrders.ImportPricingMigration/Inspection.cs`, sətir 155). Təchizatçını belə işarələmədən yoxlama heç nəyi
     sınamaz. İmportun qiymət qaydası yalnız qiyməti və yoxlamada verilən təsnifatı oxuyur (`AI_WORKFLOW/PLAN.md`,
     Task 16a).
   - Yoxlamanın «Qiymət təsnifatı» tabında Nərimanov-un Sentyabr sətirləri arasında Excel-dəki təchizatçısı «Azpetrol
     baza» olan qiymətsiz sətri tapın («Excel faylındakı təchizatçı xanası»,
     `components/imports/review/PricingClassificationTab.tsx`, sətir 266). Belə sətir yoxdursa, istənilən qiymətsiz
     sətrin təchizatçısını seçin. Hansını seçdiyinizi yazın.
   - Menyuda «Təchizatçılar»-ı açın (`/suppliers`, `layout/navigation.ts`, sətir 38). O təchizatçının sətrində «Dəyiş»-i
     basın (`pages/SuppliersPage.tsx`, sətir 176–183). «Qiymət siyasəti» pəncərəsində (sətir 246) «Yeni: Qiymət tələb
     olunmur — daxili anbar» görünməlidir (sətir 20–23, 251–253). «Təsdiq et»-i basın (sətir 302).
   - İmport səhifəsinə qayıdın və 4-cü addımdakı bölgünü yenidən oxuyun. Yazın: dəyişibmi.
6. **Yoxlamada təsnifat — 16.1, brief 16, 2-ci bənd.**
   - Yoxlamanın «Qiymət təsnifatı» tabını açın (`ReviewCenter.tsx`, sətir 190–196; `pricing/labels.ts`, sətir 146).
     Qiymət zolağındakı «Təsnif et» də oraya aparır (`ReadinessPanel.tsx`, sətir 238–245).
   - Sətirləri bir-bir işarələyin. Hamısını birdən seçmək imkanı yoxdur (`PricingClassificationTab.tsx`, sətir 236–239).
     Sonra «Alış qiyməti tələb olunur kimi qeyd et» və ya «Ödənişsiz daxili təminat kimi qeyd et»-i basın
     (`pricing/labels.ts`, sətir 153–157) və pəncərədə təsdiq edin.
   - Nə qədər təsnif etmək:
     - ən azı bir sətir;
     - qiymətsiz sətir üç və ya daha çoxdursa, hər vəziyyətdən ən azı bir sətir.
   - 5-ci addımdakı sətri **təsnif etməyin**: o, «Təsnif edilməyib» qalmalıdır.
   - Yazın:
     - hər təsnif etdiyiniz sətir: məhsul, obyekt, ay, seçdiyiniz vəziyyət;
     - çıxan bildiriş: «N sətir «…» kimi qeyd edildi.» (`pricing/labels.ts`, sətir 160–164);
     - hazırlıq panelindəki yeni bölgü.
7. **Qiymət təsnifatı — importdan əvvəl.** Menyuda «Qiymət təsnifatı»-nı yeni brauzer tabında açın (`/pricing-modes`,
   `layout/navigation.ts`, sətir 39). Üç cəmi yazın: «Təsnif edilməyib», «Alış qiyməti tələb olunur», «Ödənişsiz daxili
   təminat» (`pages/PricingModeReviewPage.tsx`, sətir 174–178; `pricing/labels.ts`, sətir 80–84). Aşağıda onları
   **Ə-U**, **Ə-P**, **Ə-D** adlandırırıq. Sıfırlanmış sınaq mühitində də qiymətsiz sətir var: test sifarişinin sonuncu
   sətri (`SandboxScenario.cs`, sətir 52). Rəqəmləri olduğu kimi yazın.
8. **İdxalın təsdiqi.** İmport səhifəsində «İdxal hazırdır» bölməsində «İdxalı təsdiqlə»-ni basın (`ImportsPage.tsx`,
   sətir 250–264). «İdxalı təsdiqlə» pəncərəsi açılır (`components/imports/review/ConfirmationDialog.tsx`, sətir 124).
   - Yazın (sətir 147–160):
     - «Sifarişə çevriləcək sətir»;
     - «Yaradılacaq sifariş qrupu»;
     - «Qiymət yoxdur» — **M**;
     - «Təsnif edilməyib» — **U**;
     - «Daxili təminat» — **D**.

     Bu pəncərədə «Qiymət yoxdur» = «Təsnif edilməyib» + «Alış qiyməti tələb olunur»
     (`src/BaxOrders.Application/Imports/Confirmation/ImportConfirmationDtos.cs`, sətir 67–69).
   - `U` sıfırdan böyükdürsə, pəncərədə qabaqcadan xəbərdarlıq və «Qiymət təsnifatına bax» linki olur; link yeni tabda
     açılır (sətir 169–176). Yazın.
   - Qruplar cədvəlində hər qrup «Yeni sifariş» olmalıdır (sətir 231). Sınaq mühitində HEM-in və Nərimanov-un sifarişi
     yoxdur. Başqa bir şey görünürsə, yazın.
   - «… sifariş və … sətir yarat» düyməsini basın (sətir 132–139).
9. **Nəticə paneli.** «İdxal tamamlandı» (`ImportsPage.tsx`, sətir 206–237). Yazın:
   - «Yaradılan sifariş», «Yaradılan sətir», «Qiymət yoxdur», «Təsnif edilməyib», «Daxili təminat» (sətir 213–222);
   - cümlə «N sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.» (sətir 293–297; `pricing/labels.ts`, sətir
     141–143);
   - link «Qiymət təsnifatına bax» və yanındakı «Yoxlamada verilən təsnifatı orada dəyişə bilərsiniz.» (sətir 298–305;
     `pricing/labels.ts`, sətir 128 və 177).

   Ekran şəkli çəkin.
10. **Qiymət təsnifatı — importdan sonra, brief 16, 2-ci bənd.** Qiymət təsnifatı tabını yeniləyin və üç cəmi yazın.
    Brief-ə görə saylar dəqiq tutmalıdır:
    - «Təsnif edilməyib» = Ə-U + U;
    - «Alış qiyməti tələb olunur» = Ə-P + (M − U);
    - «Ödənişsiz daxili təminat» = Ə-D + D.

    6-cı addımda təsnif etdiyiniz hər sətri axtarışla tapın («Məhsul, kod və ya obyekt…», `PricingModeReviewPage.tsx`,
    sətir 208–216). Onun «Vəziyyət» sütununu yazın (sətir 263): seçdiyiniz vəziyyət olmalıdır. Hesabı və rəqəmləri
    yazın.
11. **Mənbəyə görə təsnifat yoxdur — brief 16, 4-cü bənd.** 5-ci addımdakı sətri Qiymət təsnifatında tapın.
    - Onun təchizatçısı «Qiymət tələb olunmur — daxili anbar» kimi işarələnib. Buna baxmayaraq, «Vəziyyət» «Təsnif
      edilməyib» olmalıdır, «Ödənişsiz daxili təminat» yox.
    - Yoxlamada təsnif edilməyən başqa sətirlərin də «Təsnif edilməyib» olduğunu yoxlayın.
    - Gördüyünüzü yazın.
12. **Təsnifatı sonradan dəyişmək — 16.1, brief 16, 3-cü bənd.** Qiymət təsnifatında 6-cı addımda təsnif edilmiş bir
    sətri işarələyin. Onun vəziyyətini «Şirkətdaxili təminat kimi qeyd et» və ya «Alış qiyməti tələb olunur» ilə
    dəyişin (`PricingModeReviewPage.tsx`, sətir 219–236). Pəncərədə səbəb məcburi deyil (sətir 438). Təsdiq edin.
    - Yazın: sətrin yeni vəziyyəti və üç cəm.
    - Bu səhifədə yalnız bu iki vəziyyət təklif olunur. «Təsnif edilməyib»-ə qaytaran düymə burada yoxdur (sətir
      222–235).
13. **Eyni sözlər — brief 16, 5-ci bənd.** Qiymət sözlərini hər ekranda olduğu kimi yazın, hökm vermədən:
    - import ekranları: hazırlıq paneli, yoxlamanın «Qiymət təsnifatı» tabı, təsdiq pəncərəsi, nəticə paneli. Sözlər
      `pricing/labels.ts`-dədir;
    - Qiymət təsnifatı səhifəsi: onun düymələri «Şirkətdaxili təminat kimi qeyd et» və «Alış qiyməti tələb olunur»-dur
      (`PricingModeReviewPage.tsx`, sətir 227 və 234);
    - idxal edilmiş Nərimanov Sentyabr sifarişinin səhifəsi: «Obyektlər» → yaradılan obyekt → Sentyabr 2026.

    Task 16b-nin qəbulunda bu iki düymə yazılışının fərqli olduğu Task 15 üçün qeyd edilib (`AI_WORKFLOW/PLAN.md`, Task
    16b). Yalnız gördüyünüzü yazın.

İdxal edilmiş sifarişləri göndərməyin: lazım deyil. **Sıfırlamayın**: Sınaq 4 eyni data ilə davam edir.

---

## Sınaq 4 — Məhsul uyğunluğu: təsdiq və geri alma (Task 13), eyni seans, 1366 × 768

**Ön şərt:** Sınaq 3-ün 9-cu addımı bitib, yəni import təsdiqlənib. Bitməyibsə: Sınaq 5.

**Niyə yalnız importdan sonra.** Sıfırlanmış sınaq mühiti heç bir uyğunluq təklifi vermir:

- Onun beş məhsulu «Sınaq məhsulu — …» adlanır (`SandboxScenario.cs`, sətir 31–38).
- Heç birinin adı digərinin tam sözlərlə başlanğıcı deyil, və heç biri digərindən yalnız boşluq və ya xətt işarəsi ilə
  fərqlənmir (`src/BaxOrders.Application/Catalog/ProductMatches/ProductMatchSuggestions.cs`, sətir 74–89).
- Təklifdə yalnız sifariş sətri olan variantlar iştirak edir (sətir 86 və 108).

HEM-in brief-dəki rəqəmi, +23,852.70, **real** Sentyabr sifarişinindir (`BRIEFS/TASK-13.md`, «Acceptance»). Sınaq
surəti onu təkrarlamaya bilər. Ona görə burada yoxlama belədir: "təsdiqdən sonra cəm və fərq dəyişmir", "+23,852.70-ə
bərabərdir" yox.

1. **Rəhbər: təsdiqdən əvvəl — brief 13, 4-cü və 6-cı bənd.** `sinaq.rehber` ilə daxil olun. Üç yoxlamanı edin.
   - Menyunun bəndlərini yazın. «Məhsullar» olmamalıdır (`layout/navigation.ts`, sətir 37; Task 14).
   - Ünvan sətrinə `http://localhost:5174/products` yazın. «Bu səhifəyə icazəniz yoxdur.» görünməlidir (`App.tsx`,
     sətir 49–54; `auth/RequireAuth.tsx`, sətir 46). Yazın.
   - «Obyektlər» → «Heydər Əliyev Mərkəzi» → Sentyabr 2026 sifarişi. Bazanı «Keçən ay» seçin
     (`components/analytics/format.ts`, sətir 38). Yazın:
     - sifarişin cəmi;
     - «Keçən ay» ilə fərq;
     - «Niyə dəyişib?» bölməsində (`components/decisions/CauseSummary.tsx`, sətir 68) «Yeni məhsullar» və «Bu ay
       yazılmayan məhsullar» hissələrinin məbləği (`terminology/terms.ts`, sətir 14 və 20);
     - «Sabun elano lavanda ətirli» «Yeni məhsullar» altında, «Sabun elano» isə «Bu ay yazılmayan məhsullar» altında,
       ayrı sətirlərdə görünürmü.

     Ekran şəkli çəkin.
   - Çıxın.
2. **Koordinator: təklif var, özü heç nə etmir — brief 13, 1-ci bənd; 13.2.** `sinaq.koordinator` ilə daxil olun. Üç
   yoxlamanı edin. «Məhsullar» Koordinator və Admin roluna açıqdır (`SecuritySetup.cs`, sətir 91–92).
   - «Məhsullar»-ı açın (`/products`), sonra «Təkliflər» tabını (`components/catalog/matches/labels.ts`, sətir 21–25).
   - Yazın:
     - «Variant fərqi» (`terminology/terms.ts`, sətir 225) altında «Sabun elano lavanda ətirli» «Sabun elano»-nun
       variantı kimi təklif olunurmu;
     - «Yazılış fərqi» (sətir 222) altında təklif varmı, və varsa hansılardır.
   - Düymələrin yerində «Təklifləri yalnız administrator təsdiqləyir və ya rədd edir.» yazısı olmalıdır
     (`components/catalog/matches/labels.ts`, sətir 58–59). Uyğunluğu yalnız Admin təsdiqləyə bilər (`SecuritySetup.cs`,
     sətir 95–97; `src/BaxOrders.Application/Abstractions/ICurrentUserContext.cs`, sətir 82–85). Yazın.
   - «Qərarlar» tabı boş olmalıdır: heç nə özbaşına qərara çevrilməyib. Yazın.
   - Çıxın.
3. **Admin təsdiqləyir — brief 13, 2-ci bənd; 13.1.** `sinaq.admin` ilə daxil olun. Üç yoxlamanı edin. «Məhsullar» →
   «Təkliflər».
   - «Sabun elano lavanda ətirli» başqa, daha qısa bir əsas məhsulun altında təklif olunursa, bu, gözləniləndir:
     sistem qərar verilməmiş ən qısa əsası təklif edir (`ProductMatchSuggestions.cs`, sətir 81–83). Belə olsa, o təklifi
     «Rədd et» ilə rədd edin (`components/catalog/matches/labels.ts`, sətir 55). Onda növbəti ən qısa əsas görünür
     (`AI_WORKFLOW/PLAN.md`, Task 13a). Hər rəddi yazın.
   - «Sabun elano lavanda ətirli» → «Sabun elano» cütündə «Təsdiqlə»-ni basın (sətir 54). Pəncərədə təklif olunan adı
     dəyişmədən saxlayın və təsdiq edin.
   - «Məhsullar və variantlar» tabı (sətir 23): «Sabun elano» altında «lavanda ətirli» görünür. Yanında bu qeyd var:
     "Variantlar ayrı məhsul kimi qalır; burada yalnız hansı əsas məhsula aid olduqları göstərilir." (sətir 64–65).
     Yazın: iki məhsul ayrı qalırmı, bir mala birləşməyibmi. Ekran şəkli çəkin.
   - «Qərarlar» tabında qərar «Təsdiqlənib» kimi görünür (`terminology/terms.ts`, sətir 235). Yazın.
   - Çıxın.
4. **Rəhbər: «Variant dəyişib» sətri — brief 13, 3-cü və 7-ci bənd; 13.1a.** `sinaq.rehber` ilə daxil olun. HEM →
   Sentyabr 2026 → «Keçən ay». Yazın:
   - «Niyə dəyişib?»-də Sabun elano üçün bir «Variant dəyişib» sətri (`terminology/terms.ts`, sətir 248). Onun forması
     belədir: «Sabun elano — variant dəyişib: adi → lavanda ətirli» (sətir 271). Onun təsirini yazın. Brief-ə görə
     0.00 ₼-dır;
   - «Yeni məhsullar» və «Bu ay yazılmayan məhsullar»: hər biri 1-ci addımdakından nə qədər azalıb. Brief-də hər biri
     750.00 ₼ azalır (`BRIEFS/TASK-13.md`, «Acceptance», 3-cü bənd);
   - sifarişin cəmi və «Keçən ay» ilə fərq: 1-ci addımdakı ilə eyni olmalıdır.

   Ekran şəkli çəkin.
5. **Yazılış fərqi — brief 13, 5-ci bənd.** Yalnız 2-ci addımda «Yazılış fərqi» təklifi görünübsə:
   - `sinaq.admin`: həmin təklifdə «Təsdiqlə»-ni basın. Pəncərə soruşur: «Hansı yazılış saxlanılsın?»
     (`components/catalog/matches/labels.ts`, sətir 62). Əvvəlcədən seçilmiş variantı saxlayın və təsdiq edin.
   - Həmin məhsul olan obyekt və ayın sifariş səhifəsində məhsulun sətrindən «Məhsul tarixçəsi»-ni açın
     (`terminology/terms.ts`, sətir 41; `pages/OrderDetailPage.tsx`, sətir 515–516). Yazın: tarixçədə bir mal görünürmü.

   Təklif görünməyibsə, yazın: «yoxlanıla bilmədi: sınaq mühitində yazılış fərqi təklifi yoxdur; real datada «15 W» /
   «15W» cütü yoxdur» (`AI_WORKFLOW/PLAN.md`, Task 13a).
6. **Geri alma — brief 13, 8-ci bənd.**
   - `sinaq.admin`: «Məhsullar» → «Qərarlar». Sabun qərarında «Geri al»-ı basın (`components/catalog/matches/labels.ts`,
     sətir 56). Sual çıxır: «Bu qərar geri alınsın? Cüt yenidən təklif kimi görünəcək; …» (sətir 69–70). Təsdiq edin.
     5-ci addımda qərar verilibsə, onu da eyni qaydada geri alın.
   - «Təkliflər»: Sabun cütü yenidən görünür. Yazın.
   - `sinaq.rehber`: HEM → Sentyabr 2026 → «Keçən ay». Yazın: rəqəmlər 1-ci addımdakı ilə eynidirmi, «Variant dəyişib»
     sətri yoxdurmu. Ekran şəkli çəkin.
7. **Son.** `01-hazirliq.md`, 5.5: dayandırmaq və `-Reset`. İş kitabının surəti audit bitənə qədər qalır; Sınaq 3–4-ü
   təkrarlamaq lazım olsa, yenidən işlədilir.

---

## Sınaq 5 — Ehtiyat yol: import hazır olmursa

Seansın sonunda hazırlıq paneli hələ də «İmporta hazır deyil» deyirsə:

1. «Qalan maneələr»-in hər bəndini sözbəsöz yazın. Hər bənd «<problem> · N sətir →» şəklindədir
   (`components/imports/review/ReadinessPanel.tsx`, sətir 171–187).
2. İmportdan asılı olan hər yoxlamanı «yoxlanıla bilmədi» kimi yazın. Səbəb: "sınaq mühitində import hazır olmadı",
   yanında maneələr. Bunlar:
   - `BRIEFS/TASK-16.md`, «Acceptance»:
     - 2-ci, 3-cü və 4-cü bənd;
     - 5-ci bəndin təsdiq pəncərəsi, nəticə paneli və idxal edilmiş sifariş hissəsi;
   - qərar 16.1-in importdan sonrakı hissəsi (sonradan dəyişmək);
   - `BRIEFS/TASK-13.md`, «Acceptance»:
     - 1-ci, 2-ci, 3-cü, 4-cü, 5-ci və 8-ci bənd;
     - 7-ci bəndin sınaq hissəsi;
   - qərarlar 13.1 və 13.1a;
   - qərar 13.2-nin Koordinator hissəsi (təklif olmadan onun düymələrinin yoxluğu göstərilə bilmir).
3. Import olmadan da yoxlanıla bilənlər:
   - brief 16, 1-ci bənd: qiymət zolağı baxış zamanı, import hazır olmasa da görünür (`ReadinessPanel.tsx`, sətir
     151–155 və 199–253);
   - brief 16, 5-ci bəndin baxış ekranları;
   - qərar 16.1-in birinci hissəsi: yoxlamada təsnifat (Sınaq 3, addım 6);
   - brief 13, 6-cı bənd və 13.2-nin Rəhbər hissəsi (Sınaq 4, addım 1-in menyu və ünvan hissəsi).
4. Bu yoxlamaları heç vaxt real datada aparmayın (protokol §6.2). `baxorders_dev`-də heç nə təsdiqlənmir, təsnif
   edilmir, idxal edilmir.
5. `01-hazirliq.md`, 5.5: dayandırmaq və `-Reset`.

---

## Yekun cədvəl: hər yazma yoxlaması harada

"sınaq" — bu faylda, göstərilən addımlarda aparılır. "real data, yalnız oxuma — bu faylda deyil" — yoxlama siyahısı onu
real datada, heç nə yazmadan aparır. Sınaq 3 hazır olmasa, Sınaq 3 və 4-ə istinad edən sətirlər Sınaq 5-ə görə
«yoxlanıla bilmədi» olur.

| Brief, bölmə, bənd | Harada |
|---|---|
| `BRIEFS/TASK-04.md`, «Acceptance», 1-ci bənd — "Test mühitində «Təsdiq gözləyənlər»də bir test sifarişi görürəm." | sınaq: Sınaq 1, addım 1 |
| `BRIEFS/TASK-04.md`, «Acceptance», 1-ci bənd — "Real 27 obyektin heç birində heç nə dəyişməyib." | real data, yalnız oxuma — bu faylda deyil (`03-emrler.md`, Əmr 4, A ilə J) |
| `BRIEFS/TASK-04.md`, «Acceptance», 2-ci bənd — qərar düymələri təhlilə baxarkən görünən qalır | sınaq: Sınaq 1, addım 4 (1366); Sınaq 2, addım 2 (390, aşağıdakı zolaq) |
| `BRIEFS/TASK-04.md`, «Acceptance», 3-cü bənd — səbəbsiz qaytarmaq olmur; səbəblə qaytarılır; ikinci göndəriş və səbəb görünür | sınaq: Sınaq 1, addım 5, 6, 7 |
| `BRIEFS/TASK-04.md`, «Acceptance», 4-cü bənd — kim və nə vaxt təsdiqləyib; status bir dəfə | sınaq: Sınaq 1, addım 7 |
| `BRIEFS/TASK-04.md`, «Acceptance», 5-ci bənd — səlahiyyətsiz admin təsdiqləyə bilmir | sınaq: Sınaq 1, addım 3 |
| `BRIEFS/TASK-04.md`, «Acceptance», 6-cı bənd — Rəhbər rolu təsdiqləyə bilir | sınaq: Sınaq 1, addım 7. Real sistemdə aktiv Rəhbərin olması: real data, yalnız oxuma — bu faylda deyil (`01-hazirliq.md`, 4-cü bənd). Real sifariş auditdə heç vaxt təsdiqlənmir. |
| `BRIEFS/TASK-04.md`, «Acceptance», 7-ci bənd — köhnə sifarişdə "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." | sınaq (oxuma): Sınaq 1, addım 8 |
| Qərar 4.1 | sınaq (oxuma): Sınaq 1, addım 8 |
| Qərar 4.2 | sınaq: Sınaq 1, addım 5 |
| Qərar 4.3 | sınaq: Sınaq 1, addım 3 (admin bacarmır) və addım 7 (Rəhbər bacarır) |
| Qərar 4.3a | yazma yoxlaması deyil. Sınaq Rəhbəri: `SandboxScenario.cs`, sətir 12. Real Rəhbər: `01-hazirliq.md`, 4-cü bənd. |
| Protokol §6.4, altı addım | sınaq: 1 → Sınaq 1-in hazır datası və addım 2; 2 → addım 1 və 3; 3 → addım 4; 4 → addım 5; 5 → addım 6; 6 → addım 7. Telefonda: Sınaq 2. |
| Protokol §6.5, K2 | sınaq: Sınaq 1, addım 7. Sayma cədvəli yoxlama siyahısının G bölməsindədir. |
| `BRIEFS/TASK-13.md`, «Acceptance», 1-ci bənd — təklif edir, özü heç nə etmir | sınaq: Sınaq 4, addım 1 və 2. Real datada təklifin olub-olmaması: real data, yalnız oxuma — bu faylda deyil (`03-emrler.md`, Əmr 2). |
| `BRIEFS/TASK-13.md`, «Acceptance», 2-ci bənd — ayrı variantlar kimi görünür, bir mala birləşmir | sınaq: Sınaq 4, addım 3 |
| `BRIEFS/TASK-13.md`, «Acceptance», 3-cü bənd — bir «variant dəyişib» sətri, 0.00 ₼; iki hissə 750.00 ₼ azalır | sınaq: Sınaq 4, addım 4 (addım 1 ilə müqayisədə) |
| `BRIEFS/TASK-13.md`, «Acceptance», 4-cü bənd — təsdiqə qədər ayrı sətirlərdə qalır | sınaq: Sınaq 4, addım 1 |
| `BRIEFS/TASK-13.md`, «Acceptance», 5-ci bənd — «15 W» / «15W» təsdiqindən sonra tarixçədə bir mal | sınaq: Sınaq 4, addım 5, yalnız yazılış fərqi təklifi görünsə. Görünməsə: «yoxlanıla bilmədi: sınaq mühitində yazılış fərqi təklifi yoxdur; real datada «15 W» / «15W» cütü yoxdur» (`AI_WORKFLOW/PLAN.md`, Task 13a). |
| `BRIEFS/TASK-13.md`, «Acceptance», 6-cı bənd — Rəhbər təklifi təsdiqləyə bilmir | sınaq: Sınaq 4, addım 1 |
| `BRIEFS/TASK-13.md`, «Acceptance», 7-ci bənd — cəm və fərq dəyişmir | sınaq: Sınaq 4, addım 1, 4, 6 ("təsdiq dəyişmir"). HEM Keçən ay +23,852.70: real data, yalnız oxuma — bu faylda deyil. |
| `BRIEFS/TASK-13.md`, «Acceptance», 8-ci bənd — geri alanda əvvəlki vəziyyət qayıdır | sınaq: Sınaq 4, addım 6 |
| Qərar 13.1 | sınaq: Sınaq 4, addım 3 |
| Qərar 13.1a | sınaq: Sınaq 4, addım 4 |
| Qərar 13.2 | sınaq: Sınaq 4, addım 1 (Rəhbər bacarmır), addım 2 (Koordinator bacarmır), addım 3 (Admin bacarır) |
| `BRIEFS/TASK-16.md`, «Acceptance», 1-ci bənd — "N sətirdə qiymət yoxdur" | sınaq: Sınaq 3, addım 4 |
| `BRIEFS/TASK-16.md`, «Acceptance», 2-ci bənd — yoxlamada təsnif edilənlər seçilən vəziyyətlə, qalanlar «Təsnif edilməyib», saylar dəqiq | sınaq: Sınaq 3, addım 6, 7, 8, 9, 10 |
| `BRIEFS/TASK-16.md`, «Acceptance», 3-cü bənd — təsnifatı sonradan dəyişmək | sınaq: Sınaq 3, addım 12 |
| `BRIEFS/TASK-16.md`, «Acceptance», 4-cü bənd — mənbəyə görə avtomatik təsnifat yoxdur | sınaq: Sınaq 3, addım 5 və 11 |
| `BRIEFS/TASK-16.md`, «Acceptance», 5-ci bənd — import və qalan ekranlarda eyni sözlər | sınaq (oxuma): Sınaq 3, addım 13 |
| Qərar 16.1 | sınaq: Sınaq 3, addım 6 (yoxlamada) və addım 12 (sonradan) |
| `BRIEFS/TASK-16.md`, «Qəbul edilmiş qərarlar» — "Mənbəyə görə avtomatik təsnifat olmur." | sınaq: Sınaq 3, addım 5 və 11 |

Bu faylın heç bir addımı `baxorders_dev`-ə yazmır: hər yazma əməlindən əvvəl 1-ci bölmədəki üç yoxlama edilir.

---

## Hər seansdan sonra və audit bitəndə

- Hər seansdan sonra: `01-hazirliq.md`, 5.5 — dayandırmaq və `-Reset`.
- Audit bitəndə iş kitabının surətini silin:

  ```powershell
  Remove-Item -Recurse "$env:TEMP\sinaq-import"
  ```
