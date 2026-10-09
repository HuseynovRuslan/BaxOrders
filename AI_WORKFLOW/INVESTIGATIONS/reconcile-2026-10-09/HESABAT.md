# Tam uzlaşdırma — yeni Excel ↔ baza

**9 oktyabr 2026.** Bütün 3618 tarixi sətir yeni səlahiyyətli Excel ilə tutuşduruldu; təsdiqlənən
fərqlər istehsalatda düzəldildi. Canlı ünvan: <https://order.qrlog.az>

| | |
|---|---|
| Yeni Excel | `Sifarisler_uzre_bolgu.xlsx` · sha256 `13bb50d8b9ab1641df09ce7e50b9ce8926d347132e8cc060d46a70cee717a416` |
| Dəyişməz surət | `reconcile-2026-10-09/working-copy.xlsx` (eyni sha256) |
| Səlahiyyətli vərəq | **`Aylıq`** |
| Ehtiyat nüsxə | `/opt/baxorders/backups/baxorders-prod-pre-reconciliation-20261009T072202Z.dump` · sha256 `e324cfbd7f7b2e62b0756bb9e2782f5d8fb931dcb6910c9371ac4b130514f6a9` |

---

## 1. Hansı vərəq səlahiyyətlidir — və niyə

Yeni kitabda **üç vərəq** var: `Əsas` (3618 sətir, `Növ` sütunu **yoxdur**), `Aylıq` (3624 sətir, `Növ`
**var**) və `Лист1` (3 sətirlik qaralama).

**İki əsas vərəq bir-biri ilə ziddiyyətdədir.** Eyni № daşıyan sətirlərdə:

| sahə | neçə sətirdə fərqlənir |
|---|---|
| Obyekt | **219** |
| Cavabdeh şəxs | 95 |
| Cəmi | 29 |
| Qiymət | 8 |
| Şirkət | 4 |
| digər | 6 |

Sahibin göstərdiyi № 3569 (Pentas) sətri məsələni həll edir:

| | `Əsas` | `Aylıq` | sahibin dediyi |
|---|---|---|---|
| Qiymət | 1,2 | **1,3** | **1,30** |
| Cəmi | 1800 | **1950** | **1950** |
| Cavabdeh | Sirus | **Elmir** | **Elmir** |
| Növ | — | **Aylıqdan kənar** | **Aylıqdan kənar** |

`Aylıq` sahibin təsvirinə tam uyğundur, `Əsas` isə yox. Üstəlik yalnız `Aylıq` məhsulun ehtiyac duyduğu
`Növ` sütununu daşıyır, və proqramın idxalı artıq yalnız bu vərəqi oxuyur (`70b74a6`). **Səlahiyyətli
vərəq `Aylıq`-dır.**

## 2. Sətirlər necə tutuşduruldu

Sətir mövqeyi ilə yox, **№ sütunu ilə** — o, idxal zamanı bazaya `ImportRows.OriginalSequenceNumber`
kimi düşüb, yəni mənşə izidir. Əvvəlcə № -nin versiyalar arasında sabit olduğu sübut edildi: idxal
edilən faylla yeni faylın **3618/3618** sətrində məhsul adı eynidir. Yəni sətir vərəqdə yerini
dəyişsə belə, özü ilə tutuşur.

Hər Excel dəyəri müqayisədən əvvəl **proqramın öz alias cədvəllərindən** keçirildi
(`LocationAliases`, `SupplierAliases`, `ResponsiblePersonAliases`, `UnitOfMeasureAliases`), ona görə
«H.Ə.M» ilə «Heydər Əliyev Mərkəzi» fərq sayılmır — eyni faktdır.

## 3. Nəticə

| | |
|---|---|
| Excel sətri (`Aylıq`) | **3624** (3617 nömrəli + 7 nömrəsiz) |
| Bazadakı tarixi sətir | **3618** |
| № ilə tutuşan | **3617** |
| Tam eyni | 3375 |
| Fərqli | **242 sətir · 323 sahə** |
| Excel-də var, bazada yox | 7 (nömrəsiz əlavələr) |
| Bazada var, `Aylıq`-da yox | 1 (№ 3032) |
| Qeyri-müəyyən | 0 (hamısının kimliyi dəqiqdir) |

### Tətbiq edilən düzəlişlər — 87 sahə, 64 sətir, 18 sifariş

| sahə | say |
|---|---|
| Növ (Aylıq/Aylıqdan kənar) | 35 |
| Cavabdeh şəxs | 26 |
| **Obyekt** | **18** |
| Qiymət | 5 |
| Miqdar | 2 |
| Şirkət | 1 |

**Obyekt düzəlişləri (18):** 14-ü `158` sifarişindən (Novxanı → öz obyektlərinə) — əvvəlki araşdırmanın
tapdığı sətirlər. Yeni tapılan 4-ü: № 38 H.Ə.M → Parlament parkı · № 1072 Parlament parkı → H.Ə.M ·
№ 2640 və 2709 Qala baza → Zabitlər parkı.

**Maliyyə təsiri:** cəm **431 682,91404 → 429 633,01404 ₼** (**−2 049,90**). Hər qəpiyi izlənir:

| sətir | nə | təsir |
|---|---|---|
| 3426 | qiymət 21 900 → 19 600 | −2 300,00 |
| 3458 | miqdar 1 → 6 (× 58) | +290,00 |
| 3359 | qiymət ∅ → 8 (× 5) | +40,00 |
| 3360 | qiymət ∅ → 4 (× 10) | +40,00 |
| 3413 | qiymət 34 → 33 (× 30) | −30,00 |
| 3459 | miqdar 2 → 1 (× 58) | −58,00 |
| 3187 | qiymət 66,90 → 35 | −31,90 |
| | **cəmi** | **−2 049,90** |

Obyekt köçürmələri pulu yaratmır və itirmir — yalnız obyektlər arasında yerini dəyişir.

**Aylıq / Aylıqdan kənar:** 3293/324 → **3280/338** sətir; məbləğcə **286 201,40404** və
**143 431,61**.

> **Əlavə, 2026-10-09:** uzlaşdırmadan sonra bir sətir təsnifatsız qalmışdı — sətir **2988** (№ 3032),
> «Yay ayaqqabısı», 28,00 ₼. Sahibin **D-24** qərarı (2026-09-28) onu `Aylıqdan kənar` təyin etmişdi, lakin
> qərar yalnız kitaba tətbiq olunmuşdu. Qərarın sənədi və artefaktı yoxlanıldı, sonra bazaya da tətbiq edildi.
> **Təsnifatsız sətir qalmadı.** Yuxarıdakı 337/143 403,61 rəqəmləri həmin düzəlişdən əvvəlki vəziyyətdir.

### Tətbiq edilməyən, ayrıca qərar gözləyən — 236 fərq

**a) Kataloq adları — 209 fərq** (məhsul adı 105, model/kod 68, ölçü vahidi 23, ölçü dəyəri 13).

Bunlar sifariş sətrinin faktı deyil, **kataloqun adlandırmasıdır**. Məhsulun adını dəyişmək onun
**bütün** sətirlərini — Excel-in toxunmadığı sətirləri də — dəyişir. Üstəlik bir çox halda kataloq
Excel-dən **daha dəqiqdir**:

| bazada | Excel-də | say |
|---|---|---|
| `Cod şotka` | `Cod fırça` | 11 |
| `Xlor Toz 90% qranul` | `Xlor toz qranul 90% Pooltech` | 9 |
| `Laqonda daşı dəmir üçün AO 60TBF-41 Skom` | `Laqonda daşı metal üçün` | 4 |
| `EMAF A 300` (model) | `Emaf A300` | 41 |

Sonuncu ikisi göstərir ki, avtomatik tətbiq **məlumat itirərdi**. Qərar sahibindir: kataloq adları
Excel-ə uyğunlaşdırılsın, yoxsa kataloq olduğu kimi qalsın.

**b) Excel-də qiymət xanası boş, bazada qiymət var — 27 sətir, 481,75 ₼.**

Yoxlanıldı: həmin xanalar həqiqətən boşdur (nə dəyər, nə formul), `Cəmi` formulları 0 verir. Boş
xana «qiyməti sil» göstərişi deyil — köhnə faylda o qiymətlər var idi. Silinsəydi, 481,75 ₼ tarixdən
yoxa çıxardı. **Toxunulmadı.** Sentyabr ayına heç biri düşmür.

### Bazada olub Excel-də olmayan — 1 sətir

**№ 3032** `Aylıq` vərəqində yoxdur (amma `Əsas`-da var). Silinmədi: səlahiyyətli vərəqdən bir sətrin
düşməsi onu tarixdən silmək üçün əsas deyil.

### Excel-də olub bazada olmayan — 7 sətir (nömrəsiz)

Bunlar kitaba sonradan əlavə edilmiş, № verilməmiş sətirlərdir. Bazaya salınmaları **düzəliş yox,
yeni idxaldır** — ona görə edilmədi:

| məhsul | miqdar × qiymət | obyekt | tarix | növ |
|---|---|---|---|---|
| Rosmarinus | 90 × 2 = 180 | Bibiheybət | 2026-09-01 | Aylıqdan kənar |
| Pittosporum nana | 40 × 2 = 80 | Bibiheybət | 2026-09-01 | Aylıqdan kənar |
| Saxsı qab | 2 × 80 = 160 | Bibiheybət | 2026-09-01 | Aylıqdan kənar |
| **Qara qum** | 1 × 400 = 400 | Zabitlər | 2026-09-01 | **Aylıq sifariş** |
| Pittosporum | 50 × 4 = 200 | Xətai | 2026-09-01 | Aylıqdan kənar |
| Pittosporum | 200 × 4 = 800 | Zabitlər | 2026-09-01 | Aylıqdan kənar |
| Nerium oleander | 200 × 5 = 1000 | Zabitlər | 2026-09-02 | Aylıqdan kənar |

Cəmi **2 820,00 ₼** (Aylıq 400 + Aylıqdan kənar 2 420).

## 4. Təhlükəsizlik və yoxlama

1. **Canlı fəaliyyət yoxlandı:** bazada idxaldan kənar heç nə yoxdur — 3618 sətrin hamısının mənşə izi
   var, 167 sifarişin hamısı `50010` partiyasındandır, 22 sentyabrdan bəri heç nə yaradılmayıb və
   dəyişdirilməyib. Yəni üstündən yazılacaq istifadəçi işi yox idi.
2. **Ehtiyat nüsxə alındı** və **bərpa edilərək yoxlandı** — nüsxə `baxorders_clone` bazasına açıldı və
   məzmunu istehsalatla hərfbəhərf üst-üstə düşdü.
3. **Düzəliş klonda sınandı**, sonra klon yenidən Excel ilə tutuşduruldu: tətbiq edilən sahələrdə
   **sıfır fərq** qaldı, yalnız bilərəkdən kənarda saxlanan 236 fərq qaldı.
4. **İdempotentlik sübut edildi:** skript ikinci dəfə işlədiləndə 0 sətir dəyişir və 0 audit yazısı
   əlavə olunur (hər `UPDATE` əvəz etdiyi dəyəri `WHERE`-də təsdiqləyir, hər audit `INSERT` isə
   `NOT EXISTS` ilə qorunur).
5. **İstehsalatda bir tranzaksiyada** tətbiq edildi; sətir sayının dəyişməməsi və sahibsiz sətir
   olmaması tranzaksiya daxilində yoxlanıldı.
6. **Audit izi:** 87 yazı `OrderRequestEditEvents`-də — `ItemOrderLineTypeChanged` 35,
   `ItemResponsiblePersonChanged` 26, `ItemMovedToAnotherLocation` 18, `ItemPriceChanged` 5,
   `ItemQuantityChanged` 2, `ItemSupplierChanged` 1.

## 5. Müstəqil yoxlama — sentyabr 2026

Excel-dən **birbaşa** hesablandı (bazaya baxmadan), yalnız sistemdə olmayan 7 nömrəsiz sətir çıxıldı:

| | Excel-dən gözlənilən | API-nin verdiyi | fərq |
|---|---|---|---|
| Aylıq sifarişlər | 40 258,39 | 40 258,39 | **0,00** |
| Aylıqdan kənar | 28 902,00 | 28 902,00 | **0,00** |
| Cəmi | 69 160,39 | 69 160,39 | **0,00** |

**Pentas (№ 3569) — sahibin nümunəsi:**

> sətir 3465 · sifariş **160** · obyekt **Parlament parkı** · 1500 × 1,30 = **1 950,00 ₼** ·
> **Aylıqdan kənar** · cavabdeh **Elmir** · sentyabr 2026

Yeni Excel-in `Aylıq` sətri ilə hərfbəhərf eynidir.

**Sentyabr, obyekt üzrə (ilk sıralar):** H.Ə.M 33 587,72 · Fəvvarələr meydanı 10 949,67 ·
**Parlament parkı 4 466,90** · Zabitlər parkı 3 833,39 · … · **Novxanı 246,65**.

## 6. Nə edilmədi

- Excel dəyişdirilmədi — mənbə odur. Bütün nüsxələr yalnız oxundu.
- Tətbiq kodu yenidən yayımlanmadı: bu, yalnız məlumat düzəlişidir.
- Paylaşılan Caddy konfiqurasiyasına toxunulmadı.
- VPS-dəki digər layihələrə və bazalara toxunulmadı; hamısı yoxlanıldı və işləyir.
- Heç bir sətir silinmədi, heç bir dəyər uydurulmadı.

## 7. Fayllar

| fayl | nədir |
|---|---|
| `working-copy.xlsx` | yeni Excel-in dəyişməz surəti |
| `01-butun-ferqler.csv` | 323 sahə fərqinin hamısı, sətir-sətir |
| `02-tetbiq-edilmeyenler.csv` | kənarda saxlanan 236 fərq, səbəbi ilə |
| `03-duzelis.sql` | tətbiq edilən idempotent skript |
| `04-yeni-excel-ayliq.csv`, `05-yeni-excel-esas.csv` | yeni kitabın hər iki vərəqi, oxunmuş halda |
| `06-baza-duzelisden-evvel.csv`, `07-baza-duzelisden-sonra.csv` | bazanın tam vəziyyəti, əvvəl və sonra |

Uzlaşdırmanı təkrar aparan kod `tools/reconciliation/`-dadır.

---

## 8. Yekun mərhələ — «Excel-də necədi elə olsun» (2026-10-09, D-39)

Sahibin yekun qərarı ilə kitab əsas götürüldü. Araşdırmanın əsas tapıntısı: **kitab kataloqdan daha yaxşı
qurulub.** Malın qradını və markasını (`P100`, `Staunch`, `AO 60TBF-41 Skom`) öz `Model/Kod` sütununda saxlayır,
kataloq isə onu məhsul adının içinə yığıb o sütunu boş qoymuşdu. `Model/Kod` variant kimliyinin hissəsi
olduğundan onu öz yerinə köçürmək heç bir fərqi itirmir — dörd cür `Laqonda daşı almaz` dörd variant qalır —
və növbəti idxalın axtardığı yerə qoyur.

### Nə edildi

| əməliyyat | say | nəticə |
|---|---|---|
| kitabın adı ilə mövcud məhsula keçən sətir | 29 | 18 yeni variant yaradıldı |
| yalnız model kodunun yazılışı düzələn sətir | 41 | 1 variant (`EMAF A 300` → `Emaf A300`) |
| `Dırmıq` — kitabın çoxluq yazılışı | 3 | D-36-nın azlıq seçimi düzəldildi |
| boşalan variant / məhsul | 22 / 16 | **deaktiv edildi, silinmədi** |
| yeni məhsul | 0 | qəsdən: bax «nə edilmədi» |

Sətir sayı **3625** və məbləğ **431 971,26404 ₼** dəyişməyib. Miqdar, qiymət, təchizatçı, obyekt, cavabdeh və
dövr toxunulmayıb. Skript iki dəfə işlədildi: ikinci işləmədə hər dəyişiklik **0** — tam idempotentdir.
Əvvəlcə `pre-excel-align` nüsxəsi götürülüb (sha256 yoxlanıldı, 353 obyekt oxunur), sonra klon üzərində
sınaqdan keçirilib, klonun nəticəsi canlı baza ilə **hər sahədə eyni** çıxıb.

Fərq: **176 → 77** sahə (143 → 70 sətir).

### Nə edilmədi və niyə

Kitabın yazılışını hərfi tətbiq etmək **yeni məhsul yaratmaq** tələb edəcəyi yerlərdə dayandırıldı:

- **48 fərq / 48 sətir — kitab eyni malı bir vərəqdə bir neçə cür yazır.** On məhsulda belədir; doqquzunda
  proqram kitabın **çoxluq yazılışına artıq uyğundur** (`Xlor Toz 90% qranul` 41 sətrin 25-i, `Hava
  təravətləndirici (Air freshener)` 24 sətrin 16-sı, `Şampun qab üçün` 22 sətrin 21-i). Azlıq yazılışlarını da
  ödəmək bir mal üçün kataloqda iki məhsul yaratmaq olardı.
- **22 fərq / 15 sətir — kitab öz-özünə yaxud sahibin qərarına zidd.** D-37-nin altlıq/şkurka ayrımı (5);
  `AO 46SBF-42` ↔ `AO 60TBF-41` (1); həm ölçü həm marka dəyişir (1); iki ayrı mal bir ada yığılır (2);
  `Model/Kod` xanasında tarix `2021-11-11 00:00:00` (2); `Clean strong` ↔ `Yersil (Plastik)` (1); kitabda ölçü
  boş, kataloqda real ölçü var — `18 CM`, `125 MM`, `2.2` (3).
- **7 fərq / 7 sətir — yalnız hərf və boşluq.** `US-418` ↔ `us-418` (4), `MV-611` ↔ `Mv-611`, `Emaf A300` ↔
  `EMAF A 300`, ikiqat boşluq. Normallaşdırılmış dəyər eynidir; kataloqun yazılışı düzgündür.

### Əlavə tapıntı

`Products.NormalizedName` sütununda **bir səhv** aşkarlandı: məhsul 20003-də `dırmıq gardena plastik` yazılmışdı,
halbuki proqramın öz normalaşdırıcısı `ı`-nı `i`-yə qatlayır (`dirmiq …`). Bu, bu gün D-36-nı tətbiq edən
skriptdən qalmışdı və həmin məhsulun ada görə idxal uyğunlaşmasını pozurdu. Bu işləmə onu düzəltdi.
Qalan 1112 məhsulun hamısı düzgündür.

| fayl | nədir |
|---|---|
| `16-excel-uygunlasdirma.sql` | tətbiq edilən idempotent skript |
| `17-qalan-77-ferq.csv` | qalan hər fərq, obyekti və **səbəbi** ilə |

---

## 9. İkinci keçid — «Sən həmişə Excel-i əsas al» (2026-10-09, D-40)

Sahib ümumi qayda verdi: proqram ilə kitab fərqlənəndə kitab qalib gəlir, hər dəfə. 8-ci bölmədə mülahizə
tələb etdiyi üçün saxlanan 15 sətrin **13-ü** açıldı və tətbiq edildi.

| nə | say |
|---|---|
| **№ 1228** `Clean strong` → **`Yersil (Plastik)`**, ölçü 55 sm | 1 sətir |
| kitabın `Laqonda nasadkası üçün şkurka` yazdığı sətirlər — **D-37-ni ləğv edir** | 5 sətir |
| kitabın `Laqonda nasadkası` yazdığı sətirlər | 2 sətir |
| modeldə/ölçüdə kataloqa zidd sətirlər (`AO 46SBF-42` → `AO 60TBF-41`, 115 → 230 + `Skom`) | 2 sətir |
| kitabda ölçü xanası boş — `18 CM`, `125 MM`, `2.2` təmizləndi | 3 sətir |
| model kodundan ikiqat boşluq silindi | 7 sətir |

13 sətir yeni varianta keçdi (10-u başqa məhsula), 1 yeni variant yaradıldı, 10 variant və 6 məhsul deaktiv
edildi. **Yeni məhsul yaradılmadı, mövcud ad dəyişdirilmədi.** Sətir sayı (3625) və məbləğ (431 971,26404 ₼)
dəyişməyib. Eyni qayda ilə: nüsxə → klon sınağı → prod; ikinci işləmədə bütün dəyişikliklər 0.

**Fərq 77 → 56. Ölçü fərqi tamamilə bitdi.**

### Ortaya çıxan qoruyucu

İlk cəhd `Fəhlə əlcəyi` variantının model kodunu `Emaf A300` → `EMAF A 300` dəyişəcəkdi, çünki bir Excel
sətri belə yazır. Amma həmin variant **42 sətir tərəfindən paylaşılır** və 41-i `Emaf A300` istəyir — yəni
1 sətri düzəltmək üçün 41-i pozardı. Generatora qayda əlavə edildi: **paylaşılan variantın mətni yalnız heç
bir sətir köhnə yazılışı istəmədikdə dəyişir.** Qayda `US-418` ↔ `us-418` və `MV-611` ↔ `Mv-611`
hallarının da kitabın azlıq yazılışı olduğunu göstərdi.

### Qalan 56 fərq

- **48 — kitab bir malı iki-üç cür adlandırır**, və o adların heç biri kataloqda ayrı məhsul deyil. Hərfi
  tətbiq bir mal üçün ikinci məhsul yaratmaq olardı (bir Gardena duşu üçün üç məhsul), onda heç bir hesabat
  o malı toplaya bilməzdi.
- **6 — hərf fərqi, kitabın azlıq yazılışı** (yuxarıdaki qoruyucu).
- **2 — `Yaramilla`:** kitabın `Model/Kod` xanasında `2021-11-11 00:00:00` var. Kataloqdaki `11 11 21` həmin
  xananın kod kimi oxunuşudur, yəni kitabın dəyəri artıq proqramdadır.

| fayl | nədir |
|---|---|
| `18-excel-uygunlasdirma-2.sql` | tətbiq edilən idempotent skript |
| `19-qalan-56-ferq.csv` | qalan hər fərq, obyekti və səbəbi ilə |

---

## 10. Uzlaşdırma bağlandı (2026-10-09, D-42)

Sahib qalan 48 fərqi də qəbul etdi: «olduğu kimi burax, əslində fərqli yazılışlar amma eynidi məntiq».
`Pooltech`, `264 metr`, `Glade`, `3/4`, `Ardıc` ayrı mal deyil — yalnız kitabın yazılış fərqidir. Ayrı məhsul
yaradılmır.

**Yekun vəziyyət**

| | proqram | Excel «Aylıq» |
|---|---|---|
| sifariş | 167 | — |
| effektiv sətir | **3625** | 3624 |
| məbləğ | **431 971,26404 ₼** | 431 943,26404 ₼ |
| qiymətsiz sətir | 164 | 164 |

Yeganə məbləğ fərqi **1 sətir / 28,00 ₼** — № 3032, sahibin D-16/D-24 qərarı. Miqdar, qiymət, dövr, obyekt,
təchizatçı, cavabdeh və **ölçü** üzrə fərq yoxdur.

Qalan 56 ad/model fərqinin hamısı izahlıdır və qəbul edilib: 48 yazılış fərqi (D-42), 6 azlıq yazılışı
(D-41), 2 kitabın xana xətası (D-41). **Proqramın səhvi olan heç bir fərq qalmadı.**

---

## 11. Qeyd — kitabın «Cəmi» sütunu ilə proqramın məbləği niyə fərqlənə bilər

Sahib sentyabrı yoxlayanda Excel-də seçimin cəmi **71 900,39**, proqramda isə **71 980,39** çıxdı.
Araşdırma: fərq **80,00 ₼**-dir və səbəbi kitabın iki boş xanasıdır.

| Excel sətri | № | obyekt | mal | miqdar × qiymət | «Cəmi» xanası |
|---|---|---|---|---|---|
| 3148 | 3146 | H.Ə.M | Süpürgə xəkandaz dəsti | 5 × 8 = 40 | **boş** |
| 3149 | 3147 | H.Ə.M | Kürək sapı | 10 × 4 = 40 | **boş** |

Excel boş xananı toplamır, ona görə «Cəmi» sütununun cəmi 80 ₼ az çıxır. Proqram məbləği **miqdar × qiymət**
kimi hesablayır, ona görə düzgün göstərir.

Sentyabr sətir-sətir tutuşduruldu: Excel **487 sətir / 71 980,39 ₼**, proqram **487 sətir / 71 980,39 ₼** —
**fərq sıfır**. Bazada düzəliş tələb olunmur; kitab mənbə sənəd olduğu üçün ona da toxunulmayıb.

Bu səhv növü yeni şablonda mümkün deyil: orada «Cəmi» düsturdur və vərəq qorunduğu üçün üzərinə nə yazmaq,
nə də onu boş qoymaq olur (D-44).

**Davamı (D-45).** Yuxarıdakı nəticə — «bazada düzəliş tələb olunmur» — ilkin araşdırmanın nəticəsi idi:
hesablama baxımından proqram düzgün idi. Amma sahibə bildiriləndə məlum oldu ki məsələ hesablamada deyil:
hər iki sətrin təchizatçısı **Qala baza**-dır və sahib təsdiq etdi ki mal anbardan **pulsuz** verilib.

Baza bunu artıq yarımçıq qeyd etmişdi: hər iki sətir `InternalFreeSupply` kimi təsnif olunub, amma qiyməti
saxlayırdı — bütün effektiv tarixçədə belə ziddiyyətdə olan yalnız bu iki sətir var idi. Qiymətlər silindi
(skript `21-qala-baza-daxili-tedaruk-2.sql`), effektiv məbləğ **431 971,26404 → 431 891,26404 ₼**.

İndi sentyabr kitabın «Cəmi» sütunu ilə **tam eynidir** (71 900,39). Kitabın `Qiyməti` sütununda isə həmin
sətirlərdə hələ 8 və 4 yazılıdır — kitab mənbə sənəddir, ona toxunulmayıb. Yəni kitabı `Miqdarı × Qiyməti`
ilə toplasanız proqramdan 80 ₼ çox çıxacaq, `Cəmi` sütunu ilə toplasanız üst-üstə düşəcək.

---

## 12. Bütün ayların yoxlanışı (2026-10-09, D-46)

Sentyabrdakı üsul bütün aylara tətbiq edildi: hər ay üçün **üç** məbləğ yan-yana qoyuldu — kitabın «Cəmi»
sütunu (insanın vərəqdə seçib gördüyü), kitabın öz `miqdar × qiymət`-i, və proqram. Birinci ilə ikincinin
fərqi kitabın öz qüsurudur; ikinci ilə üçüncünün fərqi kitabla proqram arasındakı fərqdir.

**Tapılan nümunə:** bütün kitabda «Cəmi» xanası boş olan **22 sətir** var və **22-sinin də** «Şirkət»
sütununda `Qala Baza` yazılıb — bir istisna yoxdur. Yəni kitabı dolduran adam məbləği məhz pul getmədiyi
yerdə yazmayıb. 2-si sentyabr (D-45), 20-si may (D-46, 404,33 ₼). Sahib hər ikisini təsdiq etdi.

«Cəmi» xanası **səhv hesablanan sətir yoxdur** — 0. Yalnız boş qalanlar var.

### Yekun — aylar üzrə

| ay | sətir (kitab / proqram) | kitabın «Cəmi» sütunu | proqram | fərq |
|---|---|---|---|---|
| 2026-01 | 92 / 92 | 11 072,85 | 11 072,85 | — |
| 2026-02 | 165 / 165 | 25 613,82 | 25 613,82 | — |
| 2026-03 | 377 / 377 | 48 308,72 | 48 308,72 | — |
| 2026-04 | 470 / 470 | 49 106,54 | 49 106,54 | — |
| 2026-05 | 490 / 490 | 62 139,28 | 62 139,28 | — |
| 2026-06 | 522 / 522 | 70 573,77 | 70 573,77 | — |
| 2026-07 | 682 / 682 | 48 430,78 | 48 430,78 | — |
| 2026-08 | 339 / **340** | 44 312,78 | 44 340,78 | **+28,00** |
| 2026-09 | 487 / 487 | 71 900,39 | 71 900,39 | — |
| **CƏMİ** | **3624 / 3625** | **431 458,93404** | **431 486,93404** | **+28,00** |

**Proqram artıq kitabın «Cəmi» sütununun özüdür.** Yeganə fərq avqustdakı bir sətir və 28,00 ₼-dir — № 3032,
sahibin D-16/D-24 qərarı.

Qeyd: `.93404` quyruğu iki həqiqi sətirdən gəlir — № 390 `Stop lenti` (25 × 3,0250) və № 393 `Qranit qırmızı
çilli yanmış` (6,12 × 180,3920) — və hər iki tərəfdə eynidir.

Bütün effektiv tarixçədə «daxili təminat, amma qiymətli» ziddiyyəti **0**-dır.

---

## 13. Uzlaşdırma tam bitdi (2026-10-09, D-47)

Avqustdakı son 28 ₼ fərqi də bağlandı. Söhbət bir sətirdən gedirdi — **№ 3032** `Yay ayaqqabısı`, Heydər
Əliyev Mərkəzi, 1 × 28 — kitabın **«Əsas»** vərəqində var, **«Aylıq»** vərəqində yoxdur. Sahib: «excel-də
yoxdursa saytdan da sil». Sətir silindi, silinmə tarixçəyə yazıldı.

### Yekun vəziyyət

| | kitabın «Aylıq» vərəqi | proqram |
|---|---|---|
| sətir | **3624** | **3624** |
| məbləğ | **431 458,93404 ₼** | **431 458,93404 ₼** |

| ay | kitab | proqram | fərq |
|---|---|---|---|
| 2026-01 | 11 072,85 | 11 072,85 | — |
| 2026-02 | 25 613,82 | 25 613,82 | — |
| 2026-03 | 48 308,72 | 48 308,72 | — |
| 2026-04 | 49 106,54 | 49 106,54 | — |
| 2026-05 | 62 139,28 | 62 139,28 | — |
| 2026-06 | 70 573,77 | 70 573,77 | — |
| 2026-07 | 48 430,78 | 48 430,78 | — |
| 2026-08 | 44 312,78 | 44 312,78 | — |
| 2026-09 | 71 900,39 | 71 900,39 | — |

**Doqquz ayın doqquzunda sətir sayı və məbləğ qəpiyinə qədər eynidir.** Kitabda olub proqramda olmayan nömrə
**0**, proqramda olub kitabda olmayan nömrə **0**.

### Qalan yeganə fərq kitabın öz içindədir

Kitabın `miqdar × qiymət`-i **431 943,26404**, «Cəmi» sütunu isə **431 458,93404** — aradakı **484,33 ₼**
məhz «Cəmi» xanası boş qoyulmuş **22 Qala baza sətridir**. Proqram «Cəmi» sütununu izləyir, çünki sahib
həmin malların anbardan pulsuz verildiyini təsdiq etdi (D-45, D-46).

Yəni kitabı yoxlayarkən: **«Cəmi» sütununu toplayın** — proqramla üst-üstə düşür. `Miqdarı × Qiyməti` ilə
toplasanız 484,33 ₼ çox çıxacaq, çünki orada ödənilməyən qiymətlər də var.

---

## 14. Obyektlər üzrə yoxlama (2026-10-09, D-48)

Sahib soruşdu: obyektlərin sifarişləri də eynidirmi? Müqayisə proqramın öz `LocationAliases` cədvəli ilə
aparıldı, çünki kitab qısaltma yazır (`H.Ə.M`, `F.M`, `B.K.M`) — kitabda tanınmayan obyekt adı qalmadı.

| obyekt | sətir (kitab / proqram) | kitab ₼ | proqram ₼ |
|---|---|---|---|
| Heydər Əliyev Mərkəzi | 674 / 674 | 148 107,14 | 148 107,14 |
| Fəvvarələr meydanı | 629 / 629 | 107 878,61 | 107 878,61 |
| Dədə Qorqud | 396 / 396 | 29 354,91 | 29 354,91 |
| Bakı Konqres Mərkəzi | 224 / 224 | 18 443,88 | 18 443,88 |
| Qafur Məmmədov | 205 / 205 | 39 871,12 | 39 871,12 |
| Bayıl yolu | 181 / 181 | 9 783,79 | 9 783,79 |
| Xətai parkı | 160 / 160 | 11 979,82 | 11 979,82 |
| Zabitlər parkı | 158 / 158 | 19 037,41 | 19 037,41 |
| Nərimanov heykəli | 133 / 133 | 4 779,38 | 4 779,38 |
| Bibiheybət | 105 / 105 | 4 255,74 | 4 255,74 |
| Novxanı | 99 / 99 | 7 221,78 | 7 221,78 |
| Bülbül parkı | 94 / 94 | 3 066,23 | 3 066,23 |
| Parlament parkı | 80 / 80 | 6 620,55 | 6 620,55 |
| Qala baza | 58 / 58 | 1 874,26 | 1 874,26 |
| Axundov parkı | 55 / 55 | 1 111,23 | 1 111,23 |
| Hökumət evi və ətrafı parklar | 52 / 52 | 2 573,49 | 2 573,49 |
| Milli Konservatoriya qarşısı | 52 / 52 | 5 078,88 | 5 078,88 |
| Muzey Mərkəzi | 49 / 49 | 1 385,52 | 1 385,52 |
| Qara Qarayev parkı | 42 / 42 | 624,19 | 624,19 |
| Ağır Cinayətlərin qarşısı | 36 / 36 | 664,42 | 664,42 |
| ADNSU | 34 / 34 | 518,93 | 518,93 |
| EXPO Center | 34 / 34 | 625,82 | 625,82 |
| İDEA | 29 / 29 | 635,59 | 635,59 |
| Space TV qarşısı | 28 / 28 | 621,19 | 621,19 |
| Təmir-tikinti (ərazidə olan digər obyektlər) | 16 / 16 | 4 645,05 | 4 645,05 |
| Puşkin parkı | 1 / 1 | 700,00 | 700,00 |
| **CƏMİ** | **3624 / 3624** | **431 458,93404** | **431 458,93404** |

**Fərqli obyekt: 0 / 26. Fərqli sifariş (obyekt + ay): 0 / 166.**

### Yolüstü tapılan və həll edilən

Proqramda **167** effektiv sifariş çıxdı, kitabda isə 166 — fərq **sətri olmayan bir sifariş** idi:
`Parlament parkı · yanvar 2026`. Bu, 22 sentyabrdakı idxalın səhv uyğunlaşdırmasının qalığı idi: kitabın
1075-ci sətri (№ 1072 `Torf (perilitli)`) obyekt kimi `H.Ə.M` yazır, idxal isə onu Parlament parkına
bağlamışdı. Sətir sonradan düzəldilib Heydər Əliyev Mərkəzinə keçmiş, boş qabıq qalmışdı. Silindi; idxalın
qrup qeydi `Skipped` kimi, səbəbi ilə saxlanıldı. İndi **sətirsiz sifariş 0**-dır.
