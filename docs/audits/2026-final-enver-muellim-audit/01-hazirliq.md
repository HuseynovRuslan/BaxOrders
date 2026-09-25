# 01 — Hazırlıq

Bu fayl auditdən əvvəlki yeddi addımı sıra ilə verir. Bütün əmrlər repozitoriyanın kök qovluğunda (`BaxOrders.slnx`
olan qovluqda), PowerShell pəncərəsində işlədilir. Hər əmrin və ünvanın yanında onun götürüldüyü fayl və sətir
göstərilib. Əgər həmin fayl burada yazılandan fərqli bir şey deyirsə, faylın dediyinə əməl edin və fərqi
`neticeler.md`-də yazın.

**Başlamazdan əvvəl.** `02-yoxlama-siyahisi.md`-ni eyni qovluqda `neticeler.md` adı ilə köçürün və yuxarısına adınızı
və ya rolunuzu, tarixi və başlama vaxtını yazın (`05-neticeler-qaytarilmasi.md`). `neticeler.md` artıq varsa,
köçürməyin — üzərinə yazılar.

```powershell
Copy-Item docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md docs/audits/2026-final-enver-muellim-audit/neticeler.md
```

Aşağıdakı addımların nəticələri `neticeler.md`-də A bölməsinə (ön şərtlər) yazılır.

---

## 1. Tarix (G1)

Bugünkü tarixi və vaxtı yazın:

```powershell
Get-Date -Format 'yyyy-MM-dd HH:mm'
```

Audit ayı **Sentyabr 2026**-dır. Sahib bunu 2026-09-25-də təsdiqləyib: Oktyabr hələ başlamayıb, ona görə ən son tam
real ay Sentyabrdır (protokol §5.1, cavab A1).

**Tarix 2026-10-31-dən sonradırsa: DAYANIN.** Oktyabr artıq tam ola bilər və sahibin cavabı A1 tapşırığın 15.1
qərarına daha cavab vermir. Sahibdən yenidən soruşun (protokol §5.1).

## 2. Commit

```powershell
git rev-parse HEAD
git diff --stat 7550eda HEAD
git status --short
```

Hər üçünün çıxışını `neticeler.md`-yə yapışdırın.

- `git diff --stat 7550eda HEAD` yalnız `docs/audits/` altındakı faylları göstərə bilər, ya da heç nə göstərməz.
  Başqa bir fayl görünürsə: **DAYANIN** (protokol §5.3, §8). Sistem yoxlanılmış kodla işləmir.
- `git status --short`-da `?? AI_WORKFLOW/`, `?? monitor-agent.ps1`, `?? resume-agent.ps1`, `?? run-agent.ps1` və
  `docs/audits/` altındakı sətirlər normaldır. Başqa dəyişmiş fayl varsa, işləyən kod commit-dən fərqlidir:
  **DAYANIN** və bunu yazın.

## 3. Real sistemin işə salınması

Real sistem üç hissədən ibarətdir: verilənlər bazası, API və frontend. Hər birini ayrıca PowerShell pəncərəsində
başladın və pəncərələri audit bitənə qədər bağlamayın.

### 3.1 Verilənlər bazası

```powershell
./scripts/dev-postgres.ps1
```

Mənbə: `scripts/dev-postgres.ps1`, sətir 19 (nümunə) və 1–21 (başlıq). Skript bu kompüterdəki şəxsi PostgreSQL
klasterini `55434` portunda işə salır (sətir 25). Klaster artıq varsa, skript onu sadəcə işə salır: "Later runs just
start the cluster if it is stopped" (sətir 14).

- Skript **yeni klaster yaratdığını** bildirirsə (ilk işə salınma, sətir 10–13), bu kompüterdə real data yoxdur:
  **DAYANIN** və bunu yazın.
- Bağlantı sətri heç bir faylda yazılmır və bu dəstə də yazılmır. API onu .NET user-secrets-dən oxuyur: `src/BaxOrders.Api`
  üçün `ConnectionStrings:BaxOrders` (sətir 10–12).

### 3.2 API

```powershell
dotnet run --project src/BaxOrders.Api --launch-profile http
```

Mənbə: `src/BaxOrders.Api/Properties/launchSettings.json`, `http` profili, sətir 4–13: ünvan `http://localhost:5080`
(sətir 9), mühit `Development` (sətir 11). Əmrin forması `tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, sətir 68-dəki
ilə eynidir, yalnız profil fərqlidir.

- Bu profil brauzerdə `swagger` səhifəsini özü açır (sətir 7–8). O, texniki səhifədir; bağlayın, auditdə istifadə
  etməyin.
- **API-nin başlama vaxtını yazın**: pəncərədə `http://localhost:5080` ünvanında dinlədiyini bildirən sətir çıxan
  andakı saat. API-ni audit üçün təzədən başladın ki, onun indiki commit-in kodu ilə işlədiyi bilinsin.
- Başlayanda `5080` portunun məşğul olduğu deyilirsə, köhnə bir API hələ işləyir. Onun pəncərəsini tapıb `Ctrl+C` ilə
  dayandırın və yuxarıdakı əmri yenidən işlədin. API-ni dayandırmaq datanı dəyişmir.

### 3.3 Frontend

```powershell
npm run --prefix frontend/bax-orders-web dev
```

Mənbə: `frontend/bax-orders-web/package.json`, sətir 7 (`"dev": "vite"`). Port
`frontend/bax-orders-web/vite.config.ts`, sətir 15-dən gəlir: `5173`; API sorğuları `http://localhost:5080`-a ötürülür
(sətir 15, 25–28).

**Brauzerdə açılan ünvan: `http://localhost:5173`.** Bu portda `strictPort: false`-dur (sətir 15): port məşğuldursa,
`vite` başqa port seçir və pəncərədə yazır. Belə olsa, pəncərədə göstərilən ünvanı açın və onu `neticeler.md`-yə yazın.

## 4. Rəhbər hesabı (G3)

Audit admin yox, Rəhbər hesabı ilə aparılır. Əvvəlcə real sistemdə aktiv Rəhbər istifadəçisinin olduğunu yalnız
baxaraq yoxlayın:

1. `http://localhost:5173`-də **admin** hesabı ilə daxil olun.
2. Menyuda **İstifadəçilər** bəndini açın. Ünvan: `/admin/users` (`frontend/bax-orders-web/src/layout/navigation.ts`,
   sətir 40; səhifənin başlığı `frontend/bax-orders-web/src/pages/AdminUsersPage.tsx`, sətir 69).
3. Siyahıda rolu **Rəhbər** olan və aktiv olan istifadəçini tapın. Onun istifadəçi adını və ekranda görünən adını
   `neticeler.md`-yə yazın. Parolu yazmayın.
4. Bu səhifədə heç nəyi dəyişməyin, heç bir pəncərədə **yadda saxla** düyməsini basmayın. Yalnız baxın və çıxın.
5. Admin hesabından çıxın. Rəhbər hesabı ilə daxil olun. Parolu yalnız giriş formasına yazın.
6. Səhifənin başlığında Rəhbərin adı görünməlidir, "Administrator" yox (protokol §5.3). Nə göründüyünü yazın.

**Aktiv Rəhbər istifadəçisi yoxdursa: DAYANIN.** İstifadəçi yaratmaq sahibin qərarıdır, auditin işi deyil.

Auditin qalan hissəsi bu Rəhbər hesabı ilə aparılır. Admin hesabı yalnız bu 4-cü bənddə işlədilir.

## 5. Sınaq mühiti (sandbox)

Təsdiq axını real datada yox, sınaq mühitində yoxlanır. Sınaq mühiti eyni lokal klasterdə ayrıca
`baxorders_sandbox` bazasıdır; alət yalnız ona toxunur və real bazaya çatmır
(`tools/BaxOrders.ApprovalSandbox/sandbox.ps1`, sətir 6–8). Ona görə 3.1-dəki klaster işləməlidir: skript onun
parol faylını oxuyur (sətir 48–53).

### 5.1 Parol

Sınaq mühitindəki üç hesabın hamısı eyni parolu alır. Onu siz seçirsiniz və o heç bir faylda saxlanılmır
(sətir 15–16). Qayda (sətir 16 və 73): **ən azı 10 simvol, içində ən azı bir rəqəm və bir kiçik hərf.**

Parolu belə təyin edin:

```powershell
$env:BAXORDERS_SANDBOX_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host 'Sınaq parolu' -AsSecureString)).Password
```

Niyə belə: `sandbox.ps1`-in nümunəsi (sətir 22) `$env:BAXORDERS_SANDBOX_PASSWORD = '<choose one>'` yazır. Belə yazılsa,
parol əmr sətrinin içində olur və PowerShell həmin sətri tarixçə faylında saxlayır. `Read-Host -AsSecureString`-lə
parol ekranda görünmür və tarixçədə yalnız yuxarıdakı sətir qalır, parol yox.

Dəyişən yalnız bu PowerShell pəncərəsində yaşayır. `-Create` və `-Reset` əmrlərini elə bu pəncərədə işlədin.

### 5.2 Ardıcıllıq

**Pəncərə 1** (parolu təyin etdiyiniz pəncərə). Sınaq mühitini sıfırlayın:

```powershell
./tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Reset
```

Sınaq mühiti bu kompüterdə heç vaxt yaradılmayıbsa, ilk dəfə `-Reset` əvəzinə `-Create` işlədin. Mənbə: `sandbox.ps1`,
sətir 10–11 və 23.

Sonra elə bu pəncərədə sınaq API-ni başladın:

```powershell
./tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Run
```

Mənbə: `sandbox.ps1`, sətir 13 və 62–68. Sınaq API-si `http://localhost:5081` ünvanında, `Sandbox` mühitində,
`baxorders_sandbox` bazası ilə işləyir (sətir 65; `launchSettings.json`, `sandbox` profili, sətir 14–22).

**Pəncərə 2.** Sınaq mühitinin ekranı:

```powershell
npm run --prefix frontend/bax-orders-web dev:sandbox
```

Mənbə: `frontend/bax-orders-web/package.json`, sətir 8 (`"dev:sandbox": "vite --mode sandbox"`). `sandbox.ps1`-in
özü (sətir 26 və 67) `cd frontend/bax-orders-web; npm run dev:sandbox` yazır; `--prefix` forması eyni şeyi qovluğu
dəyişmədən edir.

**Sınaq mühitinin ekranı: `http://localhost:5174`** (`vite.config.ts`, sətir 12). Bu portda `strictPort: true`-dur:
port məşğuldursa, `vite` başqa port seçmir, xəta verir.

Real sistem (`5173` / `5080`) və sınaq mühiti (`5174` / `5081`) eyni vaxtda açıq ola bilər (`vite.config.ts`,
sətir 8–10). **Yazma tələb edən hər əməldən əvvəl brauzerin ünvan sətrində `5174` olduğunu yoxlayın.** Sınaq
mühitindəki hər obyekt, məhsul və hesabın adında "Sınaq" sözü var (`SandboxScenario.cs`, sətir 6–7).

### 5.3 Hesablar

Mənbə: `tools/BaxOrders.ApprovalSandbox/SandboxScenario.cs`, sətir 12–19. Parol hər üçü üçün 5.1-də təyin etdiyinizdir.

| İstifadəçi adı | Ekranda görünən ad | Rol |
|---|---|---|
| `sinaq.rehber` | Sınaq Rəhbəri | Rəhbər — təsdiq səlahiyyəti olan yeganə rol (sətir 11–12) |
| `sinaq.koordinator` | Sınaq Koordinatoru | Koordinator (sətir 14) |
| `sinaq.admin` | Sınaq Administratoru | Admin — administratorun təsdiqləyə bilmədiyini göstərmək üçün (sətir 16–17) |

### 5.4 Sıfırlamadan sonra nə qalır

`-Reset` (və ya `-Create`) bitəndə sınaq mühitində bunlar olur:

- **Təsdiq gözləyən test sifarişi:** obyekt **Sınaq obyekti 1** (`SINAQ-01`), dövr **Sentyabr 2026**, beş sətir.
  Sonuncu sətirin qiyməti yoxdur, ona görə təsdiq zamanı sistem bunun qəbul edildiyini soruşur
  (`SandboxScenario.cs`, sətir 40–53). Sifarişi koordinator göndərib və o, "Təsdiq gözləyənlər"-də gözləyir
  (`SandboxScenario.cs`, sətir 41–42; `SandboxSeed.cs`, sətir 113 və 120–125).
- **Qaralama:** obyekt **Sınaq obyekti 2** (`SINAQ-02`), dövr **Sentyabr 2026**, dörd sətir, hələ göndərilməyib — "sifariş
  göndərilir" addımını əllə etmək üçün (`SandboxScenario.cs`, sətir 55–64; `SandboxSeed.cs`, sətir 114).
- **İki tarixi sifariş**, hər ikisi **Sınaq obyekti 1** üçün, **İyul 2026** və **Avqust 2026**. Onlar Excel-dən artıq
  təsdiqlənmiş kimi köçürülüb, şirkətin öz tarixçəsi kimi (`SandboxScenario.cs`, sətir 66–93; `SandboxSeed.cs`,
  sətir 100–111). Avqust sifarişi paneldəki "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." cümləsinin
  oxunduğu sifarişdir; İyul sifarişi test sifarişinin ayına müqayisə bazası verir (`SandboxScenario.cs`, sətir 66–70).
  Onların yanındakı şərh: "Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb." (`SandboxScenario.cs`, sətir 96).
- Təchizatçı **Sınaq təchizatçısı**, məsul şəxs **Sınaq məsul şəxsi** və beş **Sınaq məhsulu** (`SandboxScenario.cs`,
  sətir 26–38).

Təsdiq axınının addımları `04-sandbox.md`-dədir.

### 5.5 Hər sınaq seansından sonra

1. Pəncərə 2-də (`dev:sandbox`) və pəncərə 1-də (`-Run`) `Ctrl+C` basın.
2. Pəncərə 1-də, parol hələ təyin olunmuş halda, yenidən sıfırlayın:

   ```powershell
   ./tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Reset
   ```

3. Audit tam bitəndə parolu pəncərədən silin:

   ```powershell
   Remove-Item Env:BAXORDERS_SANDBOX_PASSWORD
   ```

## 6. Ekran enləri

Audit dörd endə aparılır:

| En × hündürlük | Nəyi təmsil edir |
|---|---|
| 1366 × 768 | noutbuk |
| 1440 × 900 | geniş ekran |
| 390 × 844 | telefon |
| 1200 × 800 | tapşırığın "1150–1279 arası noutbuk" aralığı (protokol §10, A3) |

Chrome və ya Edge-də:

1. `F12` ilə tərtibatçı alətlərini açın, sonra `Ctrl+Shift+M` ilə cihaz panelini (device toolbar) yandırın.
2. Yuxarıdakı siyahıda **Responsive** seçin və en ilə hündürlüyü əllə yazın, məsələn `1366` və `768`.
3. Cihaz panelinin öz miqyası **100%** olmalıdır ("Fit to window" yox).
4. Brauzerin miqyası da **100%** qalır: `Ctrl+0`.

Hər rəqəmin yanında hansı endə oxunduğunu yazın.

## 7. Ekran şəkilləri

- Şəkillər bu dəstin yanında, `docs/audits/2026-final-enver-muellim-audit/ekranlar/` qovluğuna, PNG kimi qoyulur.
- Ad: `<ID>-<ekran>-<en>.png`. `<ID>` yoxlamanın nömrəsidir (`A-02`, `C-17` kimi); `<ekran>` ekranın qısa adıdır,
  kiçik latın hərfləri ilə, sözlər tire ilə; `<en>` — `1366`, `1440`, `390` və ya `1200`. Nümunə:
  `A-02-qiymet-tesnifati-1366.png`.
- Tərtibatçı alətlərində `Ctrl+Shift+P` → **Capture screenshot** yalnız səhifəni, seçilmiş endə çəkir.
- **Heç bir şəkildə parol və ya token görünməməlidir.** Giriş formasını, tərtibatçı alətlərinin Network və Application
  bölmələrini çəkməyin.
- Şəkil **mütləqdir**: G2-nin hər rəqəmi üçün və sizin P0 və ya P1 saydığınız hər bənd üçün. Başqa yerdə istəyə
  bağlıdır; orada rəqəmi ekranın adı və eni ilə yazmaq kifayətdir (protokol §7.2).
