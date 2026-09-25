# 03 — Yalnız oxuyan əmrlər

Bu fayl real verilənlər bazasından (`baxorders_dev`) yalnız oxuyan dörd əmri verir: **Əmr 1**, **Əmr 2**, **Əmr 3** və
**Əmr 4**. Onlar auditin əvvəlində və sonunda işlədilir. Yoxlama siyahısı (`02-yoxlama-siyahisi.md`) onlara bu adlarla
istinad edir, məsələn "03-emrler.md, Əmr 4".

Hər əmrin, başlığın və sətrin yanında onun götürüldüyü fayl və sətir göstərilib. Fayl burada yazılandan fərqli bir şey
deyirsə, faylın dediyinə əməl edin və fərqi `neticeler.md`-də yazın.

---

## 1. Bu əmrlər nə edir, nə etmir

### 1.1 Yalnız oxuyurlar

Dörd əmr üç alətdən gəlir:

- `tools/BaxOrders.ImportPricingMigration` — Task 16a;
- `tools/BaxOrders.ProductMatchMigration` — Task 13a;
- `tools/BaxOrders.CatalogueMigration` — Task 3.

Hər alətin beş əmri var. Bu dəst onlardan yalnız oxuyan ikisini işlədir: `--inspect` və `--verify`. Kodda bunu belə
görmək olar:

- **Alət yalnız dəqiq bir arqument qəbul edir, SQL qəbul etmir.** Arqument beş sözdən biri olmalıdır, başqa heç nə
  qəbul edilmir. Mənbə: `tools/BaxOrders.ImportPricingMigration/ToolSettings.cs`, sətir 29–42;
  `tools/BaxOrders.ProductMatchMigration/ToolSettings.cs`, sətir 35–39; `tools/BaxOrders.CatalogueMigration/ToolSettings.cs`,
  sətir 32–36.
- **Yazan kod yalnız başqa əmrlərdədir.** Üç alətin kodunda bazaya və ya fayla yazan hər çağırış axtarıldı:
  `SaveChanges`, `ExecuteSql`, `ExecuteUpdate`, `ExecuteDelete`, `BeginTransaction`, `File.Write…`, `pg_dump`,
  `MigrateAsync`, `ExecuteNonQuery`. Belə çağırışlar yalnız bu yerlərdədir:
  - `Apply.cs` — `--apply` əmri;
  - `Backup.cs` — `--backup` əmri;
  - `Invariants.WriteAsync` — bunu yalnız `Backup.cs` çağırır (`ImportPricingMigration/Backup.cs`, sətir 86;
    `ProductMatchMigration/Backup.cs`, sətir 86; `CatalogueMigration/Backup.cs`, sətir 84).

  `Inspection.cs`-də və `Verification.cs`-də belə çağırış yoxdur. Bu iki əmrin öz SQL mətnləri də yalnız `SELECT`-dir:
  - `ImportPricingMigration/MigrationPlan.cs`, sətir 31–34;
  - `CatalogueMigration/CatalogueState.cs`, sətir 60;
  - `CatalogueMigration/ReferenceScan.cs`, sətir 56, 77, 104;
  - `CatalogueMigration/Inspection.cs`, sətir 121.

  Task 3 alətinin `UPDATE`, `INSERT`, `LOCK TABLE` və `nextval` əmrləri yalnız `CatalogueMigration/Apply.cs`-dədir
  (sətir 108, 160, 175, 187, 209).
- **Alət heç kimin adından işləmir.** Hər üç alət "heç kim daxil olmayıb" istifadəçisi ilə qurulur
  (`ImportPricingMigration/Program.cs`, sətir 90 və 103–118; `ProductMatchMigration/Program.cs`, sətir 90;
  `CatalogueMigration/Program.cs`, sətir 89). Yazmaq üçün istifadəçi tələb edən xidmət (məsələn, sətri təsnif etmək)
  rədd edilir.
- **Hər `--inspect` "Nothing was changed." ilə bitir** (`ImportPricingMigration/Inspection.cs`, sətir 48;
  `ProductMatchMigration/Inspection.cs`, sətir 84; `CatalogueMigration/Inspection.cs`, sətir 41). `--verify` də
  "… Nothing was changed." ilə bitir (`ImportPricingMigration/Verification.cs`, sətir 121–123).

`dotnet run` aləti işə salmazdan əvvəl onu yığır (build). Yığılma yalnız alətlərin `bin/` və `obj/` qovluqlarına yazır.
Git bu qovluqları nəzərə almır (`.gitignore`, sətir 33–34). Yığılma verilənlər bazasına toxunmur.

### 1.2 Nə vaxt işlədilir

- **Auditin əvvəlində.** `01-hazirliq.md` bitəndən sonra işlədilir (G1 və G3 orada yoxlanılır), ön şərtlərin
  cədvəlindən (yoxlama siyahısı, A bölməsi) əvvəl. Ardıcıllıq `README.md`, 4-cü bölmədədir. Çıxışlar `neticeler.md`-də
  **A bölməsinin** altına yapışdırılır (`05-neticeler-qaytarilmasi.md`, 4-cü bənd).
- **Auditin sonunda.** Bütün yoxlamalardan sonra eyni dörd əmr eyni qaydada yenidən işlədilir. Çıxışlar **J
  bölməsinin** altına yapışdırılır.

### 1.3 Harada işlədilir

- Repozitoriyanın kök qovluğunda (`BaxOrders.slnx` olan qovluqda), PowerShell pəncərəsində.
- Verilənlər bazası işləməlidir: `./scripts/dev-postgres.ps1` (`01-hazirliq.md`, 3.1).
- Alət bağlantı sətrini əvvəlcə API-nin user-secrets-indən, sonra mühit dəyişənlərindən oxuyur
  (`ImportPricingMigration/ToolSettings.cs`, sətir 44–69). User-secrets-ə onu `scripts/dev-postgres.ps1` yazır (sətir
  101–103). Bağlantı sətri əmr sətrinə yazılmır.
- **Əmrləri ayrıca, təzə PowerShell pəncərəsində işlədin, sınaq mühitinin pəncərəsində yox.** Mühit dəyişəni
  user-secrets-dən üstündür (`ToolSettings.cs`, sətir 50–54). `sandbox.ps1 -Run` isə işlədiyi pəncərədə
  `ConnectionStrings__BaxOrders` dəyişənini sınaq bazasına yönəldir
  (`tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, sətir 64). Əmrlərdən əvvəl pəncərədə bunu yoxlayın:

  ```powershell
  Test-Path Env:ConnectionStrings__BaxOrders
  ```

  Nəticə `False` olmalıdır. `True` çıxırsa, pəncərəni bağlayın və təzəsini açın.

### 1.4 Heç vaxt işlətməyin

Bu fayl yalnız aşağıdakı dörd əmri verir. Bunlar dəstə aid deyil və işlədilmir:

- alətlərin `--dry-run` əmri: lazım deyil;
- alətlərin `--backup` əmri: `pg_dump` ilə bazanın yeni nüsxəsini diskə yazır (`ImportPricingMigration/Backup.cs`,
  sətir 18–67);
- alətlərin `--apply` əmri: bazaya miqrasiya tətbiq edir (`Apply.cs`);
- `pg_dump`, `pg_restore`, `dotnet ef`, `psql` və ya hər hansı SQL;
- `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`: o, sınaq mühitinə aiddir və `01-hazirliq.md`, 5-ci bənddə və
  `04-sandbox.md`-də işlədilir.

---

## 2. Əmri necə işlətmək və çıxışı necə saxlamaq

Çıxışı dəyişmədən saxlamaq üçün onu repozitoriyadan kənarda, müvəqqəti fayla yazın, sonra açıb `neticeler.md`-yə
köçürün.

Pəncərədə əvvəlcə bir dəfə bunu işlədin:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

Alət çıxışını UTF-8 ilə yazır (`ImportPricingMigration/Program.cs`, sətir 53). Bu sətir olmasa, faylda `ə`, `ş`, `ı`
hərfləri pozula bilər.

Sonra hər əmr üçün (nümunə: Əmr 1, auditin əvvəli):

```powershell
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --inspect *> "$env:TEMP\emr-1-A.txt"
"Çıxış kodu: $LASTEXITCODE"
notepad "$env:TEMP\emr-1-A.txt"
```

Faylların adları: auditin əvvəlində `emr-1-A.txt` … `emr-4-A.txt`, sonunda `emr-1-J.txt` … `emr-4-J.txt`. Çıxış kodunu
da `neticeler.md`-yə yazın.

### 2.1 Təhlükəsizlik sətri

Alətin çıxışının birinci sətri `BAX Sifarişlər — …` ilə başlayır. İkinci sətir belə olmalıdır:

```text
Database: baxorders_dev @ localhost:55434 (user baxorders)
```

Mənbə: sətrin özü `Program.cs`, sətir 55 (üç alətdə eyni: `CatalogueMigration/Program.cs`, sətir 54); forması
`ToolSettings.cs`, sətir 71–76; port və istifadəçi `scripts/dev-postgres.ps1`, sətir 25 və 101. Bu sətirdə parol yoxdur.

Başqa bir baza adı görünürsə (məsələn, `baxorders_sandbox`): **DAYANIN.** O çıxışı silin və heç yerə yapışdırmayın.
Pəncərəni bağlayın, təzə pəncərədə 1.3-dəki yoxlamadan başlayaraq əmri yenidən işlədin.

`BAX Sifarişlər — …` sətrindən əvvəl başqa sətirlər çıxa bilər. Onlar alətin yığılmasından (build) gəlir, alətin öz
çıxışı deyil. Onları da yapışdırın, amma A ilə J-ni müqayisə edəndə (4.4) nəzərə almayın.

### 2.2 Çıxış kodu

- `0` — əmr bitib. `--inspect` həmişə `0` ilə bitir (`ImportPricingMigration/Inspection.cs`, sətir 49). `--verify`
  bütün yoxlamalar keçəndə `0` ilə bitir (`Verification.cs`, sətir 124).
- `1` — yalnız `--verify`-da olur: ən azı bir yoxlama keçməyib (`Verification.cs`, sətir 119–124). Bu, ölçünün
  nəticəsidir, alətin xətası deyil (4-cü bölmə).
- `2` — arqument səhvdir və ya alət bağlantı sətrini tapmayıb (`Program.cs`, sətir 29–51). Əmrin düz yazıldığını və
  `./scripts/dev-postgres.ps1`-in işlədiyini yoxlayın, sonra əmri yenidən işlədin.
- Başqa kod, və ya çıxışda `Unhandled exception` — əmr yarımçıq qalıb, məsələn baza işləmir. Mətni olduğu kimi yazın,
  `./scripts/dev-postgres.ps1`-i işlədin və əmri yenidən işlədin. Yarımçıq qalan oxuma heç nəyi dəyişmir.

### 2.3 Parol

Alətlər parol çap etmir (`ToolSettings.cs`, sətir 71–76). Yenə də yapışdırmadan əvvəl `05-neticeler-qaytarilmasi.md`,
4-cü bənddəki yoxlamanı edin.

---

## 3. Dörd əmr

Hər əmrin bütün çıxışı A (əvvəldə) və ya J (sonda) bölməsinin altına yapışdırılır. "Hara gedir" altında sadalanan
sətirlər isə yoxlama siyahısının sahələrinə ayrıca köçürülür.

### Əmr 1 — import və qiymət təsnifatı (Task 16a aləti), `--inspect`

```powershell
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --inspect
```

Mənbə: `tools/BaxOrders.ImportPricingMigration/Program.cs`, sətir 16 və 35; arqument `ToolSettings.cs`, sətir 35. İş
qovluğu: repozitoriyanın kökü (1.3).

**Nə oxuyur** (`tools/BaxOrders.ImportPricingMigration/Inspection.cs`):

| Çıxışdakı başlıq | Nə göstərir | Sətir |
|---|---|---|
| `== Migrations ==` | Kodda və bazada olan miqrasiyalar, gözləyən miqrasiya. | 31–41 |
| `== Import batches — N ==` | Importların sayı, vəziyyətə görə (məsələn `Imported: 1`). | 53–66 |
| `== Batches under review (NeedsReview / ReadyToImport) — N ==` | Baxışda olan hər import: nömrəsi, fayl adı, vəziyyəti, sətir sayı, çıxarılmış sətirlər, qiyməti olmayan daxil edilmiş sətirlər. | 68–84 |
| `== Qiymət təsnifatı (PricingModeReviewService, no filter) ==` | Qiymət təsnifatı səhifəsinin cəmləri, səhifənin öz xidməti ilə hesablanır. Qeydə alınmış təsnifat qərarlarının sayı. | 91–100 |
| `== Təsnif edilməyib by month — N line(s) ==`, `== Təsnif edilməyib by object and month ==`, `== Təsnif edilməyib by the workbook's supplier cell ==` | «Təsnif edilməyib» sətirlər ay, obyekt və Excel-dəki təchizatçı xanası üzrə. | 102–142 |
| `== Suppliers marked NotRequired — N ==` | "Qiymət tələb etmir" kimi işarələnmiş təchizatçılar. | 146–167 |
| `== Location alias «H.Ə.M Təmizlik» (normalized «…») ==` | Task 3-ün alternativ adı hansı obyekti göstərir; obyektlərin alternativ adlarının ümumi sayı. | 170–193 |

**Heç nə yazmır.** `Inspection.cs`-də yazan çağırış yoxdur (1.1). Oxumalar `AsNoTracking` və `CountAsync` ilə aparılır.
Son sətir `Inspection only. Nothing was changed.`-dir (sətir 48), çıxış kodu `0`-dır (sətir 49).

**Mötərizədəki sabit mətn ölçü deyil.** İki sətirdə alətin Task 16a-dan qalan sabit qeydi var:
`(the brief quotes 94 as context, not as a target)` (sətir 96) və `(the brief: Fevral 25, Aprel 24, …)` (sətir 117).
Bunlar bugünkü rəqəmlər deyil. Bu sətirlərdə yalnız iki nöqtədən sonrakı ədəd ölçüdür.

**Hara gedir:**

- **G2, Qiymət təsnifatı** — `Qiymət təsnifatı` blokunun beş sətri:
  - `Unpriced lines: …` — qiyməti olmayan bütün sətirlər;
  - `Təsnif edilməyib (Unresolved): …` — «Təsnif edilməyib»;
  - `Alış qiyməti tələb olunur (PriceRequired): …` — qiyməti yazılmamış «Alış qiyməti tələb olunur» sətirlər. Bu cəm
    yalnız qiyməti olmayan sətirləri sayır (`src/BaxOrders.Application/Orders/Pricing/PricingModeReviewService.cs`,
    sətir 46–47). Ona görə G2-nin "qiyməti yazılmamış «Alış qiyməti tələb olunur»" rəqəmi elə budur;
  - `Ödənişsiz daxili təminat (InternalFreeSupply): …`;
  - `Pricing decisions recorded: …` — qiymət təsnifatı qərarlarının sayı.

  G2-nin əsas oxunuşu Qiymət təsnifatı səhifəsidir (protokol §5.2). Bu beş sətir onu yoxlamaq üçündür.
- **G2, importlar** — `Import batches` blokunun vəziyyət sətirləri və `Batches under review` blokunun hər sətri.
  Necə oxunduğu 5.1-dədir.
- **Task 3, alternativ ad** — `Location alias «H.Ə.M Təmizlik»` blokunun sətirləri. Hər alternativ ad üçün sətrin
  sonunda ya `— names Heydər Əliyev Mərkəzi`, ya da `— does NOT name HEM` yazılır (sətir 181–183).
- **Task 16, təchizatçıya görə təsnifat** — `Suppliers marked NotRequired` bloku.

### Əmr 2 — məhsul uyğunluqları (Task 13a aləti), `--inspect`

```powershell
dotnet run --project tools/BaxOrders.ProductMatchMigration -- --inspect
```

Mənbə: `tools/BaxOrders.ProductMatchMigration/Program.cs`, sətir 16 və 35; arqument `ToolSettings.cs`, sətir 35. İş
qovluğu: repozitoriyanın kökü.

**Nə oxuyur** (`tools/BaxOrders.ProductMatchMigration/Inspection.cs`):

| Çıxışdakı başlıq | Nə göstərir | Sətir |
|---|---|---|
| `== Migrations ==` | Miqrasiyalar. `ProductMatchDecisions: exists, N row(s)` — real datada qeydə alınmış uyğunluq qərarlarının sayı. | 33–43 |
| `== Catalogue ==` | Məhsulların, variantların, məhsul alternativ adlarının sayı. `Live decisions read: N` — qüvvədə olan qərarlar. | 51–57 |
| `== Yazılış fərqi (SameItem) — N suggestion(s) ==` | Hər «Yazılış fərqi» təklifi. | 59–70 |
| `== Variant fərqi (Variant) — N suggestion(s) ==` | Hər «Variant fərqi» təklifi. | 72–79 |
| `== Heydər Əliyev Mərkəzi, 2026-08 and 2026-09: every line of a product whose name starts with «Sabun elano» ==` | HEM-in Avqust və Sentyabr sifarişlərində adı «Sabun elano» ilə başlayan hər sətir: miqdar, qiymət, məbləğ, qiymət rejimi. | 97–138 |
| `== Is «Sabun elano lavanda ətirli» → «Sabun elano» among the Variant suggestions? ==` | Bu cüt təklif olunurmu: `YES — …` və ya `NO.`, və səbəbi. | 140–180 |
| `== Heydər Əliyev Mərkəzi, 2026-09, «Keçən ay» (OrderDecisionContextQueries) ==` | HEM-in Sentyabr sifarişi «Keçən ay» bazası ilə: cari məbləğ, baza, fərq. Sifariş səhifəsinin öz sorğusu ilə hesablanır. | 184–210 |

**Heç nə yazmır.** Yazan çağırış yoxdur (1.1). Təkliflər təmiz funksiya ilə hesablanır: "no database, no clock, and
nothing written" (`src/BaxOrders.Application/Catalog/ProductMatches/ProductMatchSuggestions.cs`, sətir 69–70). Son sətir
`Inspection only. Nothing was changed.`-dir (sətir 84), çıxış kodu `0`-dır (sətir 85).

**Sabit mətn ölçü deyil:** `(The brief's "69 halda" …)` (sətir 63) və `(the brief: +23,852.70)` (sətir 206).

**Hara gedir:**

- **Task 13, təkliflər** — iki başlıqdakı `N suggestion(s)` sayı. Müqayisə üçün: Task 13a-da real datada 1
  «Yazılış fərqi» və 216 «Variant fərqi» təklifi qeydə alınıb (`AI_WORKFLOW/PLAN.md`, Task 13a). Bu, o vaxtkı
  rəqəmdir.
- **Task 13, qərarlar** — `ProductMatchDecisions: exists, N row(s)` və `Live decisions read: N`. Əmr 4-ün fərqlərini
  izah etmək üçün lazımdır (4.3).
- **Task 13, Sabun cütü** — Sabun sətirləri və `YES — …` / `NO.` sətri.
- **Task 13, HEM Sentyabr «Keçən ay»** — `Order #…, version …, …` və `Current …, baseline …, difference …` sətirləri
  (sətir 204–206).

### Əmr 3 — obyekt kataloqu (Task 3 aləti), `--inspect`

```powershell
dotnet run --project tools/BaxOrders.CatalogueMigration -- --inspect
```

Mənbə: `tools/BaxOrders.CatalogueMigration/Program.cs`, sətir 15 və 34; arqument `ToolSettings.cs`, sətir 32. İş
qovluğu: repozitoriyanın kökü. Alət iş kitabını da kök qovluqdan başlayaraq axtarır (`Program.cs`, sətir 100–103).

**Nə oxuyur** (`tools/BaxOrders.CatalogueMigration/Inspection.cs`):

| Çıxışdakı başlıq | Nə göstərir | Sətir |
|---|---|---|
| `== Catalogue — N objects (M active, K with order history) ==` | Hər obyekt: kodu, aktivdirmi, sifariş sayı, ilk və son ay, adı. | 45–70 |
| `== Location code sequence ==` | Obyekt kodlarının ardıcıllığı. | 74–78 |
| `== Every column that holds a location id ==` | Obyektə istinad edən hər sütun və sətir sayı. | 83–93 |
| `== Objects the owner asked to delete — every referencing row ==` | Task 3-də silinməsi istənilən obyektlərə istinadlar. | 102–143 |
| `== Materialized and derived tables ==` | Törəmə cədvəllər. | 148–153 |
| `== Location aliases — N ==` | Obyektlərin hər alternativ adı və göstərdiyi obyekt. | 156–166 |
| `== How the importer recognises an object ==` | Sabit izah mətni. | 171–178 |
| `== Batches of Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx ==` | Bu iş kitabının importları: nömrəsi, vəziyyəti, sətir sayı, sifarişə çevrilibmi (`materialized True`). | 180–196 |
| `== Batch #N: block name → recorded location ==` | İş kitabındakı obyekt adı → qeydə alınmış obyekt. | 198–220 |
| `== Location review decisions (all batches) — N ==` | Import baxışlarında obyektlər üzrə verilmiş qərarlar. | 222–234 |
| `== The same workbook, read and matched again against today's catalogue (nothing staged) ==` | `samples/imports/raw/`-dəki iş kitabı yenidən oxunur və bugünkü kataloqla tutuşdurulur. Heç nə yazılmır. | 236–249 |
| `== Pricing classification decisions (HD-002 — read only, never changed by this tool) ==` | Qiymət təsnifatı qərarları, keçid və icraçı üzrə qruplaşdırılmış: sayı, ilk və son vaxtı (UTC). Sonda qiyməti olmayan sətirlər, rejim üzrə. | 253–281 |

**Heç nə yazmır.** Yazan çağırış yoxdur (1.1). İş kitabı yalnız oxunur:
`samples/imports/raw/Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` (`ImportMappingProof.cs`, sətir 59–62). Fayl bu
kompüterdə yoxdursa, çıxış `Workbook not found: …` yazır və həmin blok boş qalır (`Inspection.cs`, sətir 239–243). Bu,
data dəyişikliyi deyil. Son sətir `Nothing was changed.`-dir (sətir 41), çıxış kodu `0`-dır (sətir 42).

**Hara gedir:**

- **Task 3, obyekt sayı** — `Catalogue — N objects (…)` başlığı.
- **Task 3, alternativ adlar** — `Location aliases — N` blokunun hamısı.
- **G2, importlar** — `Batches of Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` blokunun sətirləri (5.1).
- **G2, HD-002** — `Pricing classification decisions (HD-002 …)` blokunun bütün sətirləri, `Unpriced lines by mode: …`
  sətri də daxil. `AI_WORKFLOW/PLAN.md`, HD-002: 94 qərar, `Administrator`, 2026-09-24, 12:03:26–12:04:23. Alət vaxtı
  UTC ilə çap edir (sətir 271–272). PLAN.md-də vaxt qurşağı göstərilməyib, ona görə vaxtları müqayisə etməyin, sadəcə
  yapışdırın.

### Əmr 4 — Task 16a-dan bəri heç nə dəyişməyibmi (Task 16a aləti), `--verify`

```powershell
dotnet run --project tools/BaxOrders.ImportPricingMigration -- --verify
```

Mənbə: `tools/BaxOrders.ImportPricingMigration/Program.cs`, sətir 20 və 39; arqument `ToolSettings.cs`, sətir 39. İş
qovluğu: repozitoriyanın kökü.

**Nə oxuyur** (`tools/BaxOrders.ImportPricingMigration/Verification.cs`):

- Miqrasiyaların vəziyyətini və `ImportRows` cədvəlinin dörd təsnifat sütununu (sətir 41–43; çapı `DryRun.cs`, sətir
  41–48).
- Baza faylını (baseline): Task 16a-da ehtiyat nüsxə ilə birlikdə yazılmış rəqəmlər (sətir 55–62). Faylın yeri:
  `%USERPROFILE%\BaxOrders-backups\baxorders_dev-task16a-baseline.tsv`. `BAXORDERS_BACKUP_DIR` mühit dəyişəni varsa,
  həmin qovluq (`Invariants.cs`, sətir 465–466; `ToolSettings.cs`, sətir 61–66).
- Bugünkü rəqəmləri, tətbiqin öz sorğuları ilə, yəni ekranların göstərdiyi rəqəmləri (sətir 63; `Invariants.cs`,
  sətir 56–61).
- Sonra iki tərəfi açar-açar müqayisə edir (sətir 64; `Invariants.cs`, sətir 374–400).

**Heç nə yazmır.** Yazan çağırış yoxdur (1.1). Baza faylı yalnız oxunur (`Invariants.cs`, sətir 475–490). Son sətir ya
`All 9 checks passed. Nothing was changed.`, ya da `N of 9 checks FAILED. Nothing was changed.` olur (sətir 121–123).
Çıxış kodu `0` və ya `1`-dir (sətir 124).

**Hara gedir** — bütün çıxış, xüsusilə bu dörd blok:

- `== Migrations ==`;
- `== MUST NOT CHANGE — … figures before, … after (…) ==`. Altında hər fərq bir sətirdir, sonda ya `Every figure is
  identical.`, ya da `N difference(s).` yazılır (sətir 66–73);
- `== Key figures — before → after ==`. Hər açar üçün bir sətir çıxır, sonu `same` və ya `CHANGED` olur (sətir 75–83;
  açarlar sətir 10–34-dədir);
- `== Verification ==`. Doqquz yoxlama çıxır, hər biri `[PASS]` və ya `[FAIL]` ilə, altında bir izah sətri ilə (sətir
  112–117);
- son sətir.

---

## 4. Əmr 4-dən nə gözləmək — koddan

### 4.1 Bu gün keçə bilərmi

**Bəli**, əgər Task 16a-nın ehtiyat nüsxəsindən sonra real datada heç nə dəyişməyibsə. Ehtiyat nüsxə 2026-09-25,
saat 12:13-də (yerli vaxtla) alınıb: `C:\Users\HP\BaxOrders-backups\baxorders_dev-task16a-20260925-121335.dump`
(`AI_WORKFLOW/PLAN.md`, Task 16a). Səbəblər:

- Aləti və tətbiqin backend kodu Task 16a-nın commit-indən (`4467f8f`) bəri dəyişməyib. `git diff --stat 4467f8f HEAD
  -- src tools` boşdur. Sonrakı işlər (16b, `7cc1ccd`, 15a1 və bu dəst) yalnız frontend və sənəddir. Deməli, bugünkü
  rəqəmləri baza faylını yazan kodun özü hesablayır.
- Task 16a-nın yoxlamasında bu əmr `All 9 checks passed` ilə bitib (`AI_WORKFLOW/REVIEWS/TASK-16a.md`, sətir 50).

Heç nə dəyişməyibsə, gözlənilən son sətir budur:

```text
All 9 checks passed. Nothing was changed.
```

### 4.2 Doqquz yoxlama

Mənbə: `Verification.cs`, sətir 45–109.

| # | Çıxışdakı ad | Nəyi yoxlayır | `[FAIL]` nə deməkdir |
|---|---|---|---|
| 1 | `No migration is pending, and no STOP condition holds` | Bazada koddakı bütün miqrasiyalar var, artıq və ya gözləyən miqrasiya yoxdur (sətir 45–47). | Baza işləyən kodla uyğun gəlmir: ya gözləyən, ya da kodun tanımadığı miqrasiya var. |
| 2 | `20260925180000_AddImportRowPricingClassification is applied` | Task 16a-nın miqrasiyası bazadadır (sətir 48–50). | Alət Task 16a-dan əvvəlki bazaya baxır (başqa baza, və ya köhnə nüsxədən bərpa edilmiş baza). |
| 3 | `ImportRows has the four classification columns, NULL on every row` | Dörd sütun var və heç bir import sətrində dəyər yoxdur (sətir 51–53). | Real datada import baxışında ən azı bir sətir təsnif edilib, və ya sütunlar yoxdur. İzah sətri neçə sətirdə dəyər olduğunu deyir (`MigrationPlan.cs`, sətir 61–66). |
| 4 | `MUST NOT CHANGE: every recorded figure is identical, key by key` | Baza faylındakı hər rəqəm bu gün də eynidir, açar-açar. Bir tərəfdə olub o biri tərəfdə olmayan rəqəm də fərq sayılır (`Invariants.cs`, sətir 374–400). | Ən azı bir rəqəm fərqlidir. Hər fərq `MUST NOT CHANGE` blokunda ayrıca sətirdir. |
| 5 | `HD-002: the pricing decisions, the 94 reclassified lines among them, are unchanged` | Qiymət təsnifatı qərarlarının sayı, qeydlərin xeşi və qərar verilmiş sətirlərin bugünkü rejimi ilə qiymətinin xeşi (sətir 88–91; `Invariants.cs`, sətir 179–184). | Yeni təsnifat qərarı yazılıb, qərar dəyişib, və ya qərar verilmiş sətrin rejimi ya qiyməti dəyişib. |
| 6 | `Qiymət təsnifatı: the three totals are unchanged` | Qiymət təsnifatının cəmləri: hamısı, «Təsnif edilməyib», «Alış qiyməti tələb olunur», «Ödənişsiz daxili təminat» (sətir 92–95). | Bu cəmlərdən ən azı biri dəyişib. |
| 7 | `No order, line, product, variant, alias, object alias, supplier or product-match decision changed` | Sifarişlər, sətirlər, məhsullar, variantlar, məhsul və obyekt alternativ adları, təchizatçılar və məhsul uyğunluğu qərarları, say və xeş ilə (sətir 96–101). | Bunlardan ən azı biri dəyişib. |
| 8 | `No import batch, staged row, materialization, correction or resolution changed` | Importlar, onların sətirləri, sifarişə çevrilmə qeydləri, düzəlişlər və baxış qərarları, xeş ilə (sətir 102–106). | Import tərəfində nəsə dəyişib: yeni yükləmə, baxışda düzəliş və ya qərar, təsdiqlənmiş import. |
| 9 | `Heydər Əliyev Mərkəzi, 2026-09, «Keçən ay»: the difference is unchanged` | HEM-in Sentyabr sifarişinin «Keçən ay» fərqi (sətir 107–109). | Bu fərq dəyişib. |

### 4.3 Baza faylı bu kompüterdə yoxdursa

Onda 4–9-cu yoxlamalar işləmir. Onların yerinə bir sətir çıxır (`Verification.cs`, sətir 56–59):

```text
[FAIL] MUST NOT CHANGE: baseline recorded
       missing: <faylın yolu>
```

Birinci üç yoxlama keçibsə, son sətir `1 of 4 checks FAILED. Nothing was changed.` olur. Bu, faylın bu kompüterdə
olmadığını göstərir, datanın dəyişdiyini yox. Onu olduğu kimi yazın və auditə davam edin. Faylı yaratmağa çalışmayın:
`--backup` bu dəstə aid deyil (1.4). Bu halda A ilə J-nin müqayisəsi (4.5) Əmr 4-ün qalan sətirləri və Əmr 1–3 ilə
aparılır.

### 4.4 Fərq yarada bilən qanuni hadisələr — qeydə alınmış olanlar

İş axını Task 16a-dan sonra real datada baş verə bilən iki qanuni hadisəni qeydə alıb. Onların baş verib-vermədiyi heç
yerdə yazılmayıb.

1. **Admin real datada məhsul uyğunluğunu təsdiqləyib, rədd edib və ya geri alıb.**
   - 7-ci yoxlama keçmir: `catalogue.productMatchDecisions` və onun xeşi dəyişir.
   - Variant təsdiqi HEM-in Sentyabr sifarişinə toxunursa, 4-cü yoxlama da keçmir. Fərq bu açarlardadır:
     `hem.2026-09.<baza>.Decomposition.Categories[…]`, `….Decomposition.Drivers[…].Category` və yeni
     `….Decomposition.VariantTransitions[…]`. Bu, 13.1a qərarının işləməsidir, pul dəyişikliyi deyil
     (`AI_WORKFLOW/REVIEWS/TASK-13c.md`, sətir 76–83 və 95–100; `AI_WORKFLOW/PLAN.md`, Task 13c).
   - Bunun baş verib-vermədiyini yalnız oxuyaraq belə görmək olar:
     - Əmr 2-də `ProductMatchDecisions: exists, N row(s)` sətri. Task 13a-da bu say 0 idi (`AI_WORKFLOW/PLAN.md`,
       Task 13a). Əmr 4-ün `Key figures` blokundakı `catalogue.productMatchDecisions` sətri isə Task 16a-dakı və bugünkü
       sayı yan-yana göstərir;
     - Əmr 2-də Sabun cütünün sətri. Qərar verilmiş cüt, qərar geri alınmayınca, yenidən təklif olunmur
       (`ProductMatchSuggestions.cs`, sətir 86–87). Cüt artıq təklif olunmursa (`NO.`), bu, ona qərar verildiyinin bir
       əlamətidir.
2. **Import #6-nın baxışında sətirlər təsnif edilib.** Bu, sahibin işidir, dəstin yox
   (`AI_WORKFLOW/TASKS/TASK-16b.md`, sətir 494–495). Onda 3-cü yoxlama keçmir: import sətirlərinin təsnifat
   sütunlarında dəyər olur (`Verification.cs`, sətir 51–53).

### 4.5 Gözlənilən fərq tapıntı kimi, tapıntı da gözlənilən kimi görünməsin deyə

- **Əvvəldə (A):** Əmr 4-ün nəticəsini gəldiyi kimi yazın: PASS və ya FAIL, bütün fərq sətirləri ilə.
- **Heç bir fərq haqqında hökm yazmayın** ("normaldır", "gözlənilir", "problemdir"). Hər fərqi 15b yuxarıdakı
  səbəblərlə tutuşdurub izah edir, və ya "izah olunmayıb" kimi hesabata yazır.
- **Auditin özünün heç nəyi dəyişmədiyinin sübutu** (protokol §9, 11-ci bənd) belədir. Sonda (J) işlədilən Əmr 4 əvvəlki
  (A) Əmr 4 ilə eyni sətirləri çap etməlidir:
  - eyni fərq sətirlərini;
  - eyni `Key figures` sətirlərini;
  - eyni doqquz yoxlama sətrini.

  A ilə J-də bunlar da eyni olmalıdır:
  - Əmr 1-in Qiymət təsnifatı bloku və import sətirləri;
  - Əmr 2-nin qərar sayı;
  - Əmr 3-ün import və HD-002 blokları.

  Protokol §9-un 11-ci bəndi bunu tələb edir: sonda oxunan Qiymət təsnifatı cəmləri və importların vəziyyəti əvvəldə
  oxunanlara bərabər olmalıdır.
- **A ilə J arasında fərqlənən hər sətir, nə olursa olsun, protokolun §8-i səviyyəsində faktdır.** Onu J bölməsində
  açıq yazın.

Müqayisə üçün (yalnız oxuyur, heç nə dəyişmir):

```powershell
Compare-Object (Get-Content "$env:TEMP\emr-4-A.txt") (Get-Content "$env:TEMP\emr-4-J.txt")
```

Heç nə çap etmirsə, iki çıxış eynidir. Çap edirsə, çıxan hər sətri J bölməsinə yapışdırın. `<=` yalnız A-da olan,
`=>` yalnız J-də olan sətirdir. Yığılma (build) sətirlərini nəzərə almayın (2.1). Eyni müqayisəni Əmr 1, 2 və 3 üçün də
edin: `emr-1-A.txt` ilə `emr-1-J.txt`, və s.

---

## 5. Ön şərtlər üçün başqa rəqəmlər

### 5.1 Importların nömrəsi və vəziyyəti

«Excel importları» səhifəsində importların siyahısı yoxdur. Səhifə yükləmə sahəsini göstərir, bir də ünvandakı `?id=`
ilə seçilmiş tək bir importu (`frontend/bax-orders-web/src/pages/ImportsPage.tsx`, sətir 38–39, 51–67, 108–186).
API-də də importların siyahısını qaytaran ünvan yoxdur (`src/BaxOrders.Api/Controllers/ImportsController.cs`, sətir 27,
56, 63). Ona görə importların vəziyyəti əmrlərdən oxunur:

1. Əmr 1, `== Import batches — N ==` bloku: vəziyyət üzrə say. `Imported: 1` olmalıdır.
2. Əmr 3, `== Batches of Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx ==` bloku: `#50010` nömrəli, `Imported`
   vəziyyətində və `materialized True` olan sətir olmalıdır.
3. Əmr 1, `== Batches under review (NeedsReview / ReadyToImport) — N ==` bloku: `#6 «…» NeedsReview: …` sətri
   olmalıdır.

Üçü birlikdə göstərir ki, `Imported` vəziyyətində olan yeganə import #50010-dur, #6 isə hələ `NeedsReview`-dadır.
Aşağıdakılardan biri olarsa, **DAYANIN** (protokol §5.2 və §8; `README.md`, 5-ci bölmə):

- `Imported` sayı 1-dən çoxdur;
- #50010 `Imported` deyil;
- #6 `NeedsReview` deyil.

Admin hesabı ilə `/imports?id=6` ünvanını açmayın. Orada import #6-nın baxış düymələri işləkdir
(`ImportsPage.tsx`, sətir 157–167), və təsadüfi klik real datanı dəyişər. Əmrlər kifayətdir.

### 5.2 «Ödənişsiz daxili təminat» sətirlərindən neçəsi HD-002-nindir

- **Əmr 4-ün 5-ci yoxlaması (`HD-002: …`) `[PASS]`-dırsa:** 94 qərar və onların sətirləri baza faylındakı kimidir. Xeş
  hər sətrin bugünkü rejimini və qiymətini əhatə edir (`Invariants.cs`, sətir 179–184). Task 16a-da bu 94 sətir
  «Ödənişsiz daxili təminat» idi (`AI_WORKFLOW/PLAN.md`, Task 16a və HD-002). Onda belə yazın: «Ödənişsiz daxili
  təminat» cəmindən 94-ü HD-002-nindir.
- **`[FAIL]`-dırsa və ya bu yoxlama çıxmayıbsa (4.3):** bu rəqəm heç bir əmrlə oxunmur. Belə yazın: "Əmr 4-ün HD-002
  yoxlaması keçməyib, bu rəqəm oxunmur". Yanına Əmr 3-ün HD-002 blokunu yapışdırın. 15b bunu izah edir.

### 5.3 SQL

Bu dəstdə SQL yoxdur və lazım deyil. Ön şərtlərin hər rəqəmi ya ekranda, ya da yuxarıdakı dörd əmrin çıxışındadır.
Oxunmayan yeganə rəqəm üçün (5.2, `[FAIL]` halı) "oxunmur" yazılır.

---

## 6. Kənarda qalan iki `--verify` əmri

Qalan iki alətin də `--verify` əmri var. Onlar baxılıb və bilərəkdən dəstə daxil edilməyib.

- **`tools/BaxOrders.ProductMatchMigration -- --verify` (Task 13a).**
  - Heç bir əlavə sübut vermir. Task 16a aləti Task 13a alətinin qeyd etdiyi hər rəqəmi köçürüb özü yoxlayır
    (`ImportPricingMigration/Invariants.cs`, sətir 26–32).
  - Onun baza faylı daha köhnədir: Task 13a-da, Task 16a-nın miqrasiyasından əvvəl yazılıb.
  - Bir yoxlaması `ProductMatchDecisions` cədvəlinin boş olmasını tələb edir (`ProductMatchMigration/Verification.cs`,
    sətir 43–45). Real datada ilk qanuni uyğunluq qərarında bu yoxlama keçmir.
  - Onu dəstə salmaq operatorun qarşısına eyni müqayisənin ikinci, daha səs-küylü nüsxəsini qoyardı.
- **`tools/BaxOrders.CatalogueMigration -- --verify` (Task 3).** Bu əmr bu gün datadan asılı olmayaraq keçmir.
  - Onun baza faylı 153 və 154 nömrəli sifarişlərin səhifəsindəki və qərar kontekstindəki hər rəqəmi açar kimi yazır,
    hər bazada (`CatalogueMigration/Invariants.cs`, sətir 182–195).
  - Bir tərəfdə olub o biri tərəfdə olmayan açarı fərq sayır (`CatalogueMigration/Verification.cs`, sətir 255–301).
    Yeganə istisna Task 3-də silinən və ya əlavə edilən, boş qalan obyektlərin açarlarıdır (sətir 263–266, 274, 294).
  - Qərar kontekstinə Task 3-dən sonra yeni rəqəm sahələri əlavə olunub. Məsələn, `IncreasedCount`
    (`src/BaxOrders.Application/Decisions/DecisionContextDtos.cs`, sətir 127) Task 11b-də əlavə edilib (commit
    `eaa65bb`).
  - Ona görə bu əmr, data eyni qalsa belə, kodun böyüməsindən yaranan `(new)` açarlarını fərq kimi göstərir. Bu, gözlənilən
    xətadır, və operator onu tapıntıdan ayıra bilməzdi. `AI_WORKFLOW/TASKS/TASK-15a.md`, §4.4 buna yol vermir.

Task 3 alətinin `--inspect` əmri isə dəstdədir (Əmr 3): o, heç nəyi müqayisə etmir, yalnız bugünkü vəziyyəti göstərir.

---

## 7. İş bitəndə

A ilə J-nin müqayisəsi (4.5) yapışdırıldıqdan sonra müvəqqəti faylları silin:

```powershell
Remove-Item "$env:TEMP\emr-[1-4]-[AJ].txt"
```
