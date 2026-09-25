# 05 — Nəticələrin qaytarılması

Auditin bütün nəticələri bu qovluqda qalır: `neticeler.md` faylında və `ekranlar/` qovluğunda. Hesabatı onlardan
15b yığır (`README.md`, 2-ci bölmə).

## 1. `neticeler.md`

- `02-yoxlama-siyahisi.md`-ni eyni qovluqda `neticeler.md` adı ilə köçürün (`01-hazirliq.md`-nin əvvəlindəki əmr) və
  nəticələri yalnız orada yazın. `02-yoxlama-siyahisi.md`-nin özü boş qalır, ona heç nə yazılmır.
- Hər yoxlamada yalnız `---- operator doldurur ----` sətrinin altındakı sahələri doldurun. Bu sətrin yuxarısındakı
  mətni dəyişməyin.
- Yoxlamanı apara bilmədinizsə, sahəni boş buraxmayın: "yoxlanıla bilmədi" yazın və səbəbini qeyd edin.

## 2. Ekran şəkilləri

- Şəkillər `ekranlar/` qovluğuna, PNG kimi qoyulur.
- Ad: `<ID>-<ekran>-<en>.png`, məsələn `A-02-qiymet-tesnifati-1366.png`. `<ID>` yoxlamanın nömrəsidir
  (`<bölmənin hərfi>-<iki rəqəm>`), `<en>` — `1366`, `1440`, `390` və ya `1200`. Ətraflı: `01-hazirliq.md`, 7-ci bənd.
- `neticeler.md`-də hər yoxlamanın yanında onun şəklinin adını yazın.

## 3. `neticeler.md`-nin yuxarısında

Faylın ən yuxarısına, başlıqdan sonra, bu dörd sətri yazın:

```text
Operator (ad və ya rol):
Tarix:
Başlama vaxtı:
Bitmə vaxtı:
```

## 4. Əmrlərin çıxışı

- `03-emrler.md`-dəki hər əmrin çıxışını olduğu kimi, heç nəyi düzəltmədən, `neticeler.md`-yə yapışdırın:
  - auditin əvvəlində işlədilənləri **A bölməsinin** altına;
  - auditin sonunda işlədilənləri **J bölməsinin** altına.
- `01-hazirliq.md`-nin 1-ci və 2-ci bəndlərindəki əmrlərin (tarix, `git`) çıxışı da A bölməsinə gedir.
- Yapışdırmadan əvvəl parola bənzəyən hər sətri silin: `Password=` olan bağlantı sətri, parol, token. Onun yerinə
  `[silinib: parol]` yazın ki, bir sətrin silindiyi görünsün.

## 5. İş bitəndə

1. `Bitmə vaxtı`-nı yazın.
2. Faylda parol qalmadığını yoxlayın:

   ```powershell
   Select-String -Path docs/audits/2026-final-enver-muellim-audit/neticeler.md -Pattern 'Password=', 'parol', 'token'
   ```

   Tapılan hər sətrə baxın. Orada parolun özü varsa, onu silin.
3. İş axınına nəticələrin hazır olduğunu bildirin: `AI_WORKFLOW/STATE.json` faylında `"status"` dəyərini
   `"PLANNING"` edin, `"humanApprovalRequired"` `true`-dursa, onu `false` edin. Bu addım `AI_WORKFLOW/PLAN.md`-dəki
   **HD-008**-dən gəlir (`AI_WORKFLOW/TASKS/TASK-15a.md`, §9). HD-008-in sözləri buradan fərqlidirsə, HD-008-ə əməl edin.
4. **Heç nə commit etməyin.** `git commit`, `git reset`, `git checkout`, `git push` işlətməyin. Nəticələri iş axını
   özü götürür.
