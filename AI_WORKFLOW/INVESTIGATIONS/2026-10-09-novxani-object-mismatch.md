# Novxanı ilə Parlament qarışığı — araşdırma və düzəliş planı

**9 oktyabr 2026.** Sahibin bildirdiyi hal: Excel-də Pentas sətri **Parlament** obyektinə aiddir, proqram isə
onu **Novxanı**-ya yazır.

**Qısa cavab: bu proqramın səhvi deyil.** İdxal faylı düzgün oxuyub; o vaxt verilən faylın özündə həmin
sətirlərin obyekt xanasında **Novxanı** yazılıbmış. Fayl sonradan düzəldilib, amma düzəliş yenidən idxal
edilməyib. Təsirlənən **14 sətir**, hamısı eyni sifarişdə (`158`, Novxanı, sentyabr 2026), **5 323,00 ₼**.

---

## 1. Sahibin göstərdiyi sətir

Excel-in **№ 3569** sətri (vərəq sətri `Əsas!3572` / `Aylıq!3571`) — hər üç nüsxədə eynidir:

| | `original/` | `working/` | sahibin `Downloads/` nüsxəsi |
|---|---|---|---|
| Malın adı | Pentas | Pentas | Pentas |
| Miqdar | 1500 | 1500 | 1500 |
| Qiymət | **1,2** | **1,2** | **1,2** |
| Cəmi | **1800** | **1800** | **1800** |
| Şirkət | B.A.X Mehdiabad | B.A.X Mehdiabad | B.A.X Mehdiabad |
| **Obyekt** | **Parlament** | **Parlament** | **Parlament** |
| Cavabdeh | Sirus | Sirus | Sirus |

Bazada isə həmin məhsul (sətir `3465`, sifariş `158`) belədir: **Novxanı**, qiymət **1,30**, cəmi **1950,00**,
təchizatçı **boş**, cavabdeh id 16.

Diqqət: sahibin dediyi rəqəmlər (1,30 və 1950) **bazadakı** rəqəmlərdir, əlimizdəki Excel-dəki deyil.
Bu, kök səbəbə aparan ilk ipucudur.

## 2. Sətrin idxalda hansı yolu keçdiyi

`ImportRows` cədvəli hər idxal sətrini **faylda yazıldığı kimi** saxlayır. Həmin sətir (`Id 66936`):

| sahə | faylda nə yazılıb |
|---|---|
| vərəq / sətir | `Əsas`, 3572 (№ 3569) |
| məhsul | Pentas |
| miqdar | 1500 |
| **qiymət** | **1.3** |
| **cəmi** | **1950** |
| **təchizatçı** | **B.A.X Mehdiabad** |
| **obyekt** | **Novxanı** |
| cavabdeh | Sirus |

İdxal bu sətri `MatchedLocationId = 41` (Novxanı) ilə əlaqələndirib — **faylda yazılanı**. Sütunlar
qarışmayıb: təchizatçı adı təchizatçı sahəsinə, obyekt adı obyekt sahəsinə düşüb.

## 3. Kök səbəb

Bütün 167 təsdiqlənmiş sifariş **tək bir idxaldan** gəlir: **batch 50010**, 22 sentyabr 2026.

| | |
|---|---|
| idxal edilən fayl | `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` |
| **həmin faylın sha256** | **`eba75b3929b18c1d0a838844f8995349e400517bfb9125fe723a532b392e555e`** |
| `original/` və `Downloads/` | `02f2177a4e679925157c5e5810949e6a1f6b40fd779ed3238edd915811d42f3f` |
| `working/` | `47bf24fe92312fe7635c8d9fcee75fe3c8811814b01b199ca262391aa62aa397` |

**Heç biri uyğun gəlmir.** Yəni istehsalat məlumatı faylın **üçüncü, daha köhnə** versiyasından gəlir — o
versiya artıq diskdə yoxdur. Fayl sonradan düzəldilib (obyektlər, bəzi adlar və qiymətlər), lakin yenidən
idxal olunmayıb.

**Kök səbəb: mənbə faylın versiya fərqi — proqramda nasazlıq deyil.** İdxal nə oxuyubsa onu yazıb, və bunu
sübut edən tam izi (`ImportRows`) saxlayıb.

## 4. Tək hadisədir, yoxsa sistemli?

Bütün **3618 sətir** canlı baza ilə müqayisə edildi (obyekt adları sistemin öz `LocationAliases` cədvəli ilə
həll edildi — təxmin yoxdur).

**Yanlış obyektə bağlanmış sətir: 14.** Hamısı sifariş `158`-dədir (Novxanı, sentyabr 2026).

İdxal anındakı fayl ilə indiki faylı müqayisə edəndə **145 sətirdə** fərq var:
51 ad, 29 qiymət, 24 cəmi, 22 cavabdeh, 17 obyekt (bəziləri üst-üstə düşür). Bunlardan:

- **3 sətir** (`Dədəd Qorqud` → `Dədə Qorqud`) sadəcə yazılış düzəlişidir — baza onsuz da **düzgün** obyektə
  bağlayıb, çünki alias cədvəli səhv yazılışı tanıyır. **Əməliyyat tələb etmir.**
- **22 cavabdeh fərqi** (Aydın → Qədeş, Xəyal/Çingiz) sahibin sonrakı qərarları ilə **artıq bazada
  tətbiq olunub** (`b5cbe78`).
- Qalan ad/qiymət fərqləri ayrıca qərar tələb edir — aşağıda, 7-ci bənddə.

## 5. Obyekt və təchizatçı sütunları qarışıbmı?

**Xeyr.**

- İdxal anındakı fayl ilə indiki fayl arasında **təchizatçı sütununda 0 fərq** var — 3618 sətrin hamısında
  təchizatçı eynidir. Əgər obyekt və təchizatçı yerini dəyişsəydi, təchizatçı sütunu da fərqlənərdi.
- Pentas sətrində faylın təchizatçı sahəsi `B.A.X Mehdiabad`, obyekt sahəsi `Novxanı` idi — hər biri öz
  yerində.
- `H.Ə.M`, `Bülbül parkı` və `Qala baza` adları həm obyekt, həm təchizatçı kimi işlənir (daxili anbar və
  obyektin öz adı). Bu, qarışıq deyil — şirkətin öz adlandırmasıdır.

## 6. Təsirlənən sətirlər və maliyyə təsiri

Hamısı sifariş `158`-də (Novxanı, sentyabr 2026, Approved, v1):

| sətir | № | məhsul | miqdar | qiymət | məbləğ | olmalı olan obyekt |
|---|---|---|---|---|---|---|
| 3454 | 3459 | Nitroamafoska 16+16+16 | 2 | 58,00 | 116,00 | Xətai parkı |
| 3455 | 3500 | Nitroamafoska 16+16+16 | 3 | 58,00 | 174,00 | Zabitlər parkı |
| 3456 | 3501 | Yay ayaqqabısı | 3 | 28,00 | 84,00 | Zabitlər parkı |
| 3457 | 3507 | Nitroamafoska 16+16+16 | 6 | 58,00 | 348,00 | Nərimanov heykəli |
| 3458 | 3530 | Nitroamafoska 16+16+16 | 1 | 58,00 | 58,00 | Hökumət evi və ətrafı parklar |
| 3459 | 3538 | Nitroamafoska 16+16+16 | 2 | 58,00 | 116,00 | Muzey Mərkəzi |
| 3460 | 3550 | Nitroamafoska 16+16+16 | 1 | 58,00 | 58,00 | Parlament parkı |
| 3461 | 3557 | Nitroamafoska 16+16+16 | 1 | 58,00 | 58,00 | Bülbül parkı |
| 3462 | 3566 | Nitroamafoska 16+16+16 | 1 | 58,00 | 58,00 | Milli Konservatoriya qarşısı |
| 3463 | 3567 | Ilex Nellie Stevens (Bal) | 2 | 520,00 | 1 040,00 | Parlament parkı |
| 3464 | 3568 | Euonymus Aurea | 11 | 95,00 | 1 045,00 | Parlament parkı |
| **3465** | **3569** | **Pentas** | **1500** | **1,30** | **1 950,00** | **Parlament parkı** |
| 3466 | 3570 | Torf | 80 | 2,00 | 160,00 | Parlament parkı |
| 3467 | 3582 | Nitroamafoska 16+16+16 | 1 | 58,00 | 58,00 | Space TV qarşısı |
| | | | | **CƏMİ** | **5 323,00** | |

Obyektlər üzrə sentyabr 2026 təsiri:

| obyekt | sifariş | indi | dəyişiklik | düzəlişdən sonra |
|---|---|---|---|---|
| **Novxanı** | 158 | 5 569,65 | **−5 323,00** | **246,65** |
| Parlament parkı | 160 | 213,90 | +4 253,00 | 4 466,90 |
| Zabitlər parkı | 166 | 3 575,39 | +258,00 | 3 833,39 |
| Nərimanov heykəli | 159 | 600,64 | +348,00 | 948,64 |
| Xətai parkı | 165 | 844,39 | +116,00 | 960,39 |
| Muzey Mərkəzi | 157 | 190,88 | +116,00 | 306,88 |
| Hökumət evi və ətrafı parklar | 155 | 252,80 | +58,00 | 310,80 |
| Bülbül parkı | 150 | 289,40 | +58,00 | 347,40 |
| Milli Konservatoriya qarşısı | 156 | 1 830,40 | +58,00 | 1 888,40 |
| Space TV qarşısı | 164 | 242,10 | +58,00 | 300,10 |

**Şirkətin ümumi cəmi dəyişmir: 431 682,91404 ₼.** Pul obyektlər arasında yerini dəyişir, yaranmır və itmir.

Diqqət: Novxanı indi panelde sentyabrın ən çox artan obyektlərindən biridir (+3 278,89). Düzəlişdən sonra o
sıralamadan çıxacaq — **panel hesabatı dəyişəcək və rəhbərliyə göstərilən rəqəmlər başqa olacaq.**

## 7. Düzəliş planı

Obyekt sətirdə yox, **sifarişdə** saxlanılır. Ona görə düzəliş = 14 sətri `158` sifarişindən həmin ayın
müvafiq sifarişlərinə **köçürmək**. Doqquz hədəf obyektin sentyabr 2026 sifarişi **artıq mövcuddur**
(155, 156, 157, 159, 160, 164, 165, 166 və 150) — yeni sifariş yaratmağa ehtiyac yoxdur.

### Hazırlanıb

- **Ehtiyat nüsxə alındı** (düzəlişdən əvvəl, istehsalat bazası):
  `/opt/baxorders/backups/baxorders-prod-pre-object-correction-20261009T070253Z.dump`
  sha256 `95dd4617a4d2591f85e7e782dc7e4e387b73f0034a13cb64ec7704dede59c390`
- Excel-in heç bir nüsxəsinə toxunulmayıb; hamısı yalnız oxundu.

### Addımlar (sahibin təsdiqindən sonra)

1. Ehtiyat nüsxənin bərpa oluna bildiyi ayrıca bazada yoxlanılsın.
2. 14 sətrin `OrderRequestId` dəyəri yuxarıdakı cədvələ görə dəyişdirilsin — **bir tranzaksiyada**, sətir-sətir
   açıq `Id` ilə, heç bir kütləvi `update` olmadan.
3. Hər köçürmə `OrderRequestEditEvents`-ə yazılsın ki, audit izi qalsın: kim, nə vaxt, hansı sətir, haradan
   haraya, hansı mənbəyə əsasən (fayl sha256 + sətir nömrəsi).
4. Yoxlama: hər obyektin sentyabr cəmi yuxarıdakı «düzəlişdən sonra» sütunu ilə üst-üstə düşsün; şirkət cəmi
   **431 682,91404** olaraq qalsın; sifariş `158`-də **5 sətir, 246,65 ₼** qalsın.
5. Panel açılıb gözlə yoxlanılsın.

### Nəyi etmirik

- Excel düzəldilmir — mənbə odur.
- Qiymət, miqdar, təchizatçı, tarix **toxunulmur**: bu araşdırma yalnız obyekt bağlantısını sübut etdi.
- Pentas sətrinin qiyməti (baza 1,30 ↔ fayl 1,20) **bu düzəlişə daxil deyil**. Hansının doğru olduğunu
  sahib deməlidir; 1,20 qəbul edilsə, həmin sətir 1 950,00 → 1 800,00 olur və şirkət cəmi 150,00 ₼ azalır.
- Qalan ad/qiymət fərqləri (bax 4-cü bənd) ayrıca qərar mövzusudur.

### Daha yaxşı yol — yenidən idxal

Bu 14 sətir faylın köhnə versiyasından qalıb. Düzgün uzunmüddətli həll: **indiki faylı yenidən idxal etmək**
(sistem bunu versiya kimi edir, tarixi silmir). Belə olsa bütün 145 fərq eyni anda, mənbəyə uyğun şəkildə
düzəlir. Əl ilə düzəliş yalnız o deməkdir ki, baza ilə fayl arasında qalan 131 fərq hələ də qalır.

**Qərar sahibindir:** ya 14 sətrin məqsədyönlü köçürülməsi (sürətli, dar), ya da faylın yenidən idxalı
(tam, amma bütün 145 fərqi birdən gətirir).
