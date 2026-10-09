# İdxal təlimatı — «Sifarişlər üzrə bölgü» kitabı

Bu addımların hamısı **27 sentyabr 2026-da bir dəfə əvvəldən icra edilib** — bazanın tam surətində, real
ekranlarla. Aşağıdakı rəqəmlər təxmin deyil, ölçülmüş nəticədir. Siz eyni addımları izləsəniz, eyni nəticəni
alacaqsınız.

**Nə yaradılır:** 166 sifariş (hər biri mövcud sifarişin **yeni versiyası**), **3601 sətir, 430 973,46404 ₼**.
**Nə dəyişmir:** mövcud 167 təsdiqlənmiş sifariş və onların 3618 sətri toxunulmur.

---

## Əvvəlcə

| | |
|---|---|
| Kitab | `AI_WORKFLOW\workbooks\working\Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` |
| Yalnız bu vərəq oxunur | `Aylıq` — `Əsas` heç bir sətir vermir |
| Ehtiyat nüsxə | idxaldan **əvvəl** bazanın nüsxəsini götürün |

Kitabda **sentyabrın 480 sətrinin «Növ» xanası** artıq doldurulub (`Aylıq sifariş`). Bu düzəliş sahib icazəsi
ilə edilib; düzəlişsiz nüsxə `workbooks\original\` qovluğunda saxlanılır.

---

## 1. Yükləyin

**Excel importları** → faylı seçin → **Yüklə və yoxla**.

Gözlənilən: **3618 sətir**, hamısı `Aylıq` vərəqindən. Bu mərhələdə heç bir sifariş yaranmır.

## 2. «Vahid» sütununun səkkiz sözünü vahid olmadığını bildirin

Baxış ekranında **Vahid** bölməsi. Səkkiz dəyər üçün «vahid deyil» seçin:

| söz | sətir |
|---|---|
| `lik` | 98 |
| `yarpaq` | 40 |
| `qat` | 18 |
| `lıq` | 11 |
| `luq` | 11 |
| `diş` | 8 |
| `lük` | 7 |
| `ədədli` | 5 |

Bunlar ölçü təsviridir, ölçü vahidi deyil (`28 diş` — `28 qat` deyil). Heç bir yeni vahid yaranmır.
Nəticə: naməlum variant **222 → 24**.

## 3. Dörd xananı düzəldin — **variant yaratmazdan ƏVVƏL**

Sıra vacibdir. Variant kataloqda qalıcı yazıdır: səhv xanadan yaradılsa, səhv həmişəlik qalır.

| sətir | sütun | yazılacaq | niyə |
|---|---|---|---|
| 501 | Model/Kod | `11 11 21` | Excel bunu `2021-11-11` tarixinə çevirib; kataloqdakı variant 20415 `11 11 21` yazır |
| 609 | Model/Kod | `11 11 21` | eyni sətir, eyni tarix |
| 227 | Ölçü | `125` | kataloqdakı variant 20861 (`Laqonda naqilli`, model `Ct13499`) `125 MM`-dir |
| 227 | Vahid | `mm` | eyni variant |
| 597 | Ö/v | `ədəd` | `Rolik başlığı` 10 sm yeddi dəfə sifariş olunub — hər dəfə `ədəd` |

Sətir **1248** artıq düzəliş tələb etmir: kitabın özündə `mt` → `mm` edilib (sahibin qərarı), ona görə o sətir
kataloqdakı mövcud `50 MM` variantına özü düşür.

Kitabın öz mətni dəyişmir: düzəliş ayrıca saxlanılır və geri qaytarıla bilər.

## 4. İki xidmət sətrini vahidsiz təsdiqləyin

Sətir **2307** və **2629** — `Təmir işləri`. «Ö/v» xanasını **qəsdən boş** olaraq təsdiqləyin.
(2307-də `azn` yazılıb; bu valyutadır, vahid deyil və vahid kataloquna düşməməlidir.)

## 5. On iki variant yaradın

Qalan variantları yaradın. On iki variant yaranır: hamısı kataloqda
onsuz da olan məhsulun markası və ya dənəvərliyidir (`BOSCH`, `Staunch`, `P40` … `P220`, `№611320`, `Mrtony`).

Yeni **məhsul** yaranmır: məhsul sayı 1112 olaraq qalır.

3-cü addım düzgün edilibsə, 227 / 501 / 597 / 609 sətirləri kataloqda **artıq mövcud** variantlara düşür və
onlar üçün heç nə yaradılmır.

## 6. On səkkiz sətri kənarda saxlayın — səbəbi ilə

Bu, sahibin cavabı hələ tamamlanmayan yeganə sualdır (B-05). Hər birini «idxal etmə» edin və səbəbi yazın:

| sətir | səbəb |
|---|---|
| 17 «Laqonda daşı metal üçün» sətri | kitab bir ümumi ad yazır, kataloqda altı ayrı məhsul var |

Bundan sonra partiya **idxala hazırdır**.

## 7. Təsdiqləyin

**İdxalı təsdiqlə** → pəncərədə **«Hamısına yeni versiya (166)»** düyməsi → **«166 sifariş və 3 601 sətir yarat»**.

166 qrupun hamısının artıq təsdiqlənmiş sifarişi var, ona görə hər biri **yeni versiya** alır. Köhnə versiya
toxunulmur.

---

## Nəticə

| | mövcud (v1) | idxal (v2) |
|---|---|---|
| sifariş | 167 · Təsdiqlənib | 166 · Qaralama |
| sətir | 3618 | **3601** |
| məlum məbləğ | 431 682,91404 ₼ | **430 973,46404 ₼** |
| təsnifat | — | **Aylıq 3276 · Aylıqdan kənar 324 · təsnif edilməmiş 1** |
| cavabdeh şəxs | — | **hamısında var (3601/3601)** |

Təsnif edilməmiş yeganə sətir — bərpa edilmiş «Yay ayaqqabısı» sətridir. Onun «Növ» xanası qəsdən boşdur:
mənbədə bu fakt yoxdur və sahib onu qonşu sətirlərdən təxmin etməyi qadağan edib.

İdxal təxminən **2 saniyə** çəkir.

### Fərq haradan gəlir

17 sətir və 709,45 ₼:

- **17 sətir** — 6-cı addımda kənarda saxlananlar (77,70 ₼)
- **631,75 ₼** — yeni kitabın köhnə təsdiqlənmiş qeyddən **fərqli yazdığı rəqəmlər**, əsasən iyun (−422,60) və
  sentyabr (−175,00)

Son bənd diqqət tələb edir: bu, nasazlıq deyil — kitab belə yazır. Amma yeni versiya təsdiqlənmiş versiyanı
məhz bu qədər əvəz edir.

### İdxaldan sonra

- **İdarəetmə paneli dərhal yeni rəqəmləri göstərir.** Panel hər obyekt və dövr üçün **son versiyanı** oxuyur,
  statusundan asılı olmayaraq — hər obyektin yanında «Təsdiqlənməyib» yazılır. Sentyabr 71 210,29 ₼ yerinə
  **71 035,29 ₼** olur.
- **120 sətirdə qiymət yoxdur.** Onlar «Qiymət təsnifatı» bölməsində «Təsnif edilməyib» kimi görünür. Köhnə
  qeyddə də həmin sətirlərdə qiymət yoxdur — heç nə itmir.
- 166 yeni sifariş **Qaralama** vəziyyətindədir və təsdiq gözləyir.

### Partiyaya qayıtmaq

Səhifəni tərk etsəniz, partiyaya `/imports?id=<partiya nömrəsi>` ünvanı ilə qayıda bilərsiniz. Başqa yol yoxdur.
