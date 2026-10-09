# BaxOrders — MVP hazırdır

**28 sentyabr 2026** · HEAD `0f7fbff` · kitab `47bf24fe…`

Sistem material sifarişləri üzrə **qərar dəstəyi** verir: menecer ayın nə qədər sifariş verdiyini, keçən dövrlə
nəyin dəyişdiyini və bunu hansı məhsul və obyektin yaratdığını tez görür. Excel surəti deyil, admin paneli deyil.

---

## Nə işləyir

### İdxal axını — tam bağlıdır

Səlahiyyətli kitab **bütövlükdə idxal olunur**: 3618 sətrin hamısı, heç bir bloklayıcı qalmadan.

| | |
|---|---|
| oxunan vərəq | yalnız **`Aylıq`** · `Əsas` heç bir sətir vermir |
| sətir | **3618** · yararlı 3487 · xəbərdarlıq 131 · **yararsız 0** |
| təsnifat | **Aylıq 3293 · Aylıqdan kənar 325 · təsnif edilməmiş 0** |
| yaradılan | **166 sifariş · 3618 sətir · 431 051,16404 ₼** · ~2 saniyə |
| cavabdeh | hər sətirdə |

Kitabın öz cəmi 3618 sətir üzrə **431 051,16404 ₼** — idxal edilənlə tam eyni. Təsdiqlənmiş tarixlə fərq
**631,75 ₼**, o da yeni kitabın fərqli yazdığı rəqəmlərdir (əsasən iyun −422,60, sentyabr −175,00), nasazlıq
deyil.

### «Aylıqdan kənar» artıq məhsul funksiyasıdır

Aylıq müqayisə **yalnız aylıq sətirlər** üzərində qurulur — bu qayda indi bütün ekranlarda eynidir. Plandan
kənar alış fakt kimi görünür, amma tələb müqayisəsini təhrif etmir; təsnif edilməyən sətir heç birinə düşmür.

| ekran | nə göstərir |
|---|---|
| İdarəetmə paneli | əsas KPI aylıq xərcdir, yanında «Aylıqdan Kənar sifarişlər» məbləği və sayı, açılan detalı ilə |
| Aylıq hesabat | **üç rəqəm**: aylıq məbləğ · aylıqdan kənar məbləğ (sətir sayı ilə) · ümumi faktiki xərc. Şəbəkə, fərqlər, orta və «Qeyri-adi ay» yalnız aylıqdır |
| Obyektlər | pul və «Dəyişmə» aylıqdır; birdəfəlik alış pulun altında adlanır |
| Sifariş detalı | hər sətirdə növ nişanı, həm cədvəldə, həm telefon kartında; qarışıq sifarişdə sətir-səviyyəli cavabdeh oxunur |
| Məhsul tarixçəsi | «neçə ayda sifariş olunub» və «ayda orta miqdar» yalnız aylıqdır; plandan kənar alış öz rəqəmi, öz sütunu və öz sətirləri ilə |
| Müqayisə / sürücülər | əvvəlcədən aylıq idi, dəyişməyib |

**Real nümunə:** *Yay şalvarı* plan daxilində cəmi 1 ayda sifariş olunub, amma plandan kənar 37 dəfə alınıb
(6 555 ₼). Köhnə məntiqlə bu, müntəzəm məhsul kimi görünürdü.

### Koordinatorun işi praktikdir

İdxaldan sonra 166 qaralama qalır. Panel **«Hamısını təsdiqə göndər (166)»** təklif edir; hər sifariş tək-tək
təqdimin keçdiyi yolu keçir və **öz iş-axını hadisəsini** yazır. **Toplu təsdiq yoxdur** — təsdiq kiminsə baxdığı
ifadəsidir.

Təsdiq pəncərəsində **«Hamısına yeni versiya (166)»** eyni məntiqlə: mexaniki cavabı bir dəfə verir, «idxal etmə»
isə həmişə ayrıca və səbəbi ilə.

---

## Necə işə salınır

```
scripts/dev-postgres.ps1                     # lokal PostgreSQL, port 55434
dotnet run --project src/BaxOrders.Api       # http://localhost:5080
cd frontend/bax-orders-web && npm run dev    # http://localhost:5173
```

Giriş: `admin`. Parol `dotnet user-secrets list --project src/BaxOrders.Api` içindədir.

Təcrid olunmuş sınaq üçün `--mode sandbox` (vebin 5174, API-nin 5081 portu) və
`CREATE DATABASE <ad> TEMPLATE baxorders_dev;`.

## Kitab necə idxal olunur

Addım-addım təlimat: **`AI_WORKFLOW/IMPORT_RUNBOOK.md`** — hər addımın gözlənilən rəqəmi ilə, hamısı ölçülüb.

Qısaca: yüklə → səkkiz «Vahid» sözünü vahid olmadığını bildir → dörd xananı düzəlt → iki xidmət sətrini vahidsiz
təsdiqlə → bir kanonik «Laqonda daşı metal üçün» məhsulu və variantları → qalan variantlar → **«Hamısına yeni
versiya»** → **«Hamısını təsdiqə göndər»**.

Kitab `AI_WORKFLOW/workbooks/` altındadır: `original/` toxunulmaz, `working/` səlahiyyətli, `backups/` hər
dəyişiklikdən əvvəl.

## Kim nə edir

**Koordinator:** kitabı yükləyir, baxış qərarlarını verir, idxalı təsdiqləyir, sifarişləri bir kliklə təsdiqə
göndərir, qiyməti olmayan sətirləri «Qiymət təsnifatı»nda təsnif edir.

**Menecer / Rəhbər:** idarəetmə panelində ayı və dəyişikliyin səbəbini oxuyur, aylıq hesabatda ili görür, obyektə
və sifarişə enir, məhsulun tarixçəsinə baxır, sifarişləri **ayrı-ayrılıqda** təsdiqləyir.

---

## Bilinən məhdudiyyətlər

| | |
|---|---|
| **B-06 → həll olundu** | toplu təqdim var, toplu təsdiq qəsdən yoxdur |
| **B-07 · açıq** | Aylıq hesabat 1290px-dən dar pəncərədə səhifəni yana sürüşdürür (1280-də 9px, 1200-də 89px). Bağlamaq ya yapışqan başlığı noutbukda itirmək, ya da cədvələ öz şaquli sürüşməsini vermək deməkdir — sizin seçiminiz |
| R-12 | tətbiqin ikonu yoxdur, hər səhifə `/favicon.ico` üçün 404 alır. Zərərsiz; ikon sizin seçiminizdir |
| N-01 | Ənvər müəllimin real Rəhbər hesabı — İstifadəçilər ekranından sizin öz əməliyyatınız |
| sətir 2988 — **bağlandı 2026-10-09** | sahibin D-24 qərarı bazaya tətbiq edildi: `Unclassified` → `Aylıqdan kənar`. Bazada təsnifatsız sətir qalmadı |

## Təxirə salınanlar

`SONRAKI_IMKANLAR.md` (TASK-25 … TASK-29) növbədə deyil — hər biri öz brifinqini və öz qərarınızı tələb edir.

---

## Testlər

| | |
|---|---|
| backend unit | **1197 yaşıl** |
| integration | **905 yaşıl** (`BAXORDERS_TEST_POSTGRES` ilə) |
| frontend | **1408 yaşıl** · `tsc --noEmit` təmiz |

Responsiv: on marşrut × 1440 / 1366 / 1200 / 390 — **B-07-dən başqa hamısı sıfır daşqın**, konsol xətası yoxdur.

## Kitabın barmaq izi

| | |
|---|---|
| `original/` | `02f2177a4e679925157c5e5810949e6a1f6b40fd779ed3238edd915811d42f3f` |
| `working/` | `47bf24fe92312fe7635c8d9fcee75fe3c8811814b01b199ca262391aa62aa397` |

## Bu mərhələnin commit zənciri

`cdd00a1` üzərinə, sıra ilə:

| | |
|---|---|
| `a7e0a66` | test: «Model/Kod» sütununu əhatə et |
| `4b5386b` | fix: variant operatorun düzəltdiyi xanadan qurulur |
| `2ba9728` | fix: kateqoriya səviyyəsi düzəldilmiş adla yaranır |
| `4eac232` | feat: təsdiq qərarını bir dəfəyə ver |
| `b95b9a6` | fix: təsdiq cədvəlinə yer ver |
| `cf2d662` | feat: sifariş nəyi əvəz etdiyini deyir |
| `e9c1ad0` | docs: aylıq hesabatın sürüşmə qaydasını düzgün izah et |
| `8a294e7` | fix: «Kürək düz» üçün kitabın qiymətini qəbul et |
| `3b44f17` | test: bir ümumi ad → bir məhsul, hər marka üçün variant |
| `037cf11` | fix: aylıq hesabat yalnız aylıq sətirləri müqayisə edir |
| `ef27f3c` | fix: obyekt siyahısı yalnız aylıq sətirləri müqayisə edir |
| `0ce681e` | feat: idxalın yaratdığı sifarişləri bir aktla təhvil ver |
| `2013307` | fix: üç cədvəl telefonda səhifəni yana sürüşdürmür |
| `0f7fbff` | feat: məhsulun öz tarixçəsi |

Qərarların hamısı `DECISIONS.md`-də, açıq suallar `BLOCKERS.md`-də, vəziyyət `STATE.md`-dədir.
