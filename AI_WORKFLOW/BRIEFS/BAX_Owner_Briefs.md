# BAX Sifarişlər — Owner brief-lər (Task 04–16)

**Status:** yekun vahid mənbə sənədi (source of truth). Bütün açıq suallar cavablandırılıb. Hələ repo-ya yazılmayıb.
**Mənbə:** 23.09.2026 tarixli Ənvər müəllim auditi, Task 1, 1b, 1c, 2, 3 razılaşmaları və sahibkarın qərarları (4.1–16.1, 4.3a, 7.1a, 13.1a, 15.2a). Qərarların jurnalı sənədin sonundadır.
**Bitmiş tasklar (yenidən task edilmir):** Task 1 — müqayisə bazasının ötürülməsi · Task 1b — eyni kohort · Task 1c — qəpik yuvarlaqlaşdırması · Task 2 — qiymətsiz sətir və daxili təminat qaydası · Task 3 — obyekt kataloqu.
**İcra ardıcıllığı:** 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 16 → 15.

| Task | Nəyin sahibidir | Asılılıq |
|---|---|---|
| 04 | Təsdiq axını, qərar paneli, test mühiti, Rəhbər rolu və təsdiq hüququ | — |
| 05 | Bütün sözlər, vahidlər, məbləğ formatı, kodların gizlədilməsi | — |
| 06 | Sifariş səhifəsinin müqayisə sətri və "Niyə dəyişib?" | 05; rəng qaydası 09-dadır (9.1) |
| 07 | Kartda əsas səbəbin malı və payı | 05 |
| 08 | Aylıq hesabat (masaüstü) | 05; rəng qaydası 09-dadır (9.1) |
| 09 | Panel: kartlar, çiplər, cədvəl, naviqasiya; rəng qaydası | 05, 07 |
| 10 | "Əsas dəyişikliklər", məhsul tarixçəsi, məhsul sayları | 05 |
| 11 | Obyektlər siyahısı, obyekt səhifəsi; müqayisə səhifəsinin sifariş səhifəsinə birləşdirilməsi | 05, 10 |
| 12 | Mobil görünüş, toxunuş, info izahları | 04, 05, 08 |
| 13 | Məhsul adlarının uyğunlaşdırılması və variantlar | 06, 07, 10-un nəticələrinə təsir edir |
| 14 | Rəhbər rolu üçün menyu və görünüş qaydaları | 04 (rol burada yaranır), 13 ("Məhsullar" bölməsi) |
| 16 | Import yoxlamasında (review) qiymət vəziyyəti və təsnifat | 14 |
| 15 | Yekun audit | Hamısı; ən sonda |

---

# Task 04 — Təsdiq axını

## Məqsəd
Ənvər müəllim sifarişi təhlil edəndən sonra "Təsdiqlə" və ya "Düzəliş tələb et" qərarını axtarmadan verə bilsin. Qərardan əvvəl sifarişi kimin, nə vaxt və neçənci dəfə göndərdiyini görsün.

## Auditdə müşahidə edilən hazırkı problem
- "Təsdiq gözləyənlər" boşdur: "Təsdiq gözləyən sifariş yoxdur. Yeni sifariş təsdiqə göndərildikdə burada görünəcək." Ona görə "Təsdiqlə" və "Düzəliş tələb et" düymələri auditdə heç görünmədi və qərar axını yoxlanılmadı.
- Audit qaydası real sifarişləri təsdiqləməyi, qaytarmağı və dəyişməyi qadağan edir. Axını təhlükəsiz sınamaq üçün mühit yoxdur.
- Təsdiqlənmiş sifarişdə yan panel statusu təkrarlayır: "✓ Təsdiqlənib" həm başlıqda, həm yan paneldə var.
- Panelin qalan hissəsi qərara kömək etmir: "Məlum qiymətlər üzrə məbləğ: 10,949.67 ₼ · 76 sətir · Təqdim və təsdiq tarixi sistemdə qeyd olunmayıb" (Fəvvarələr meydanı, Sentyabr 2026).
- Qərar üçün bunlar çatışmır: sifarişi kim göndərib, nə vaxt, neçənci dəfə (düzəlişdən sonra?), əvvəlki düzəliş qeydi nə idi, kim və nə vaxt təsdiqləyib.

## İstədiyim nəticə
- Real datadan ayrı test mühitində axın başdan sona sınanır: sifariş göndərilir → "Təsdiq gözləyənlər"də görünür → rəhbər təhlilə baxır → səbəb yazaraq "Düzəliş tələb et" → göndərən düzəldib yenidən göndərir → rəhbər təsdiqləyir. Sınaq Rəhbər rolu ilə aparılır.
- Qərar paneli statusu təkrarlamır. Əvəzində bunları göstərir:
  - göndərən və göndərmə tarixi;
  - neçənci dəfə göndərildiyi (biznes dilində, "Versiya 2" kimi yox);
  - əvvəlki düzəliş səbəbi;
  - təsdiqləyən və ya qaytaran şəxs və tarix.
- "Təsdiqlə" və "Düzəliş tələb et" axtarılmadan tapılır və təhlilə baxarkən görünən qalır.
- "Düzəliş tələb et" səbəb yazılmadan göndərilmir.
- Ayrıca Rəhbər rolu bu taskda yaradılır və təsdiq səlahiyyəti ona verilir. Qərar düymələri yalnız təsdiq səlahiyyəti olan istifadəçidə işləyir; admin hesabı bu hüququ avtomatik almır.
- Excel-dən gəlmiş keçmiş sifarişlərdə panel belə yazır: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." Göndərən, tarix və ya təsdiqləyən uydurulmur.

## Qəbul edilmiş qərarlar
- Real sifarişlər təsdiqlənmir, qaytarılmır və dəyişdirilmir; sınaq yalnız test mühitində aparılır.
- 27 obyektlik real kataloqa test obyekti əlavə olunmur. Bu, Task 3 qərarından çıxır.
- Rəhbər ekranında texniki "Versiya" sözü göstərilmir (Task 5). Versiya məlumatı qərar panelində biznes dilində verilir.
- **4.1:** Excel-dən gəlmiş keçmiş sifarişlərdə mətn: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." Saxta audit məlumatı (göndərən, tarix, təsdiqləyən) yaradılmır.
- **4.2:** Düzəliş tələb edəndə səbəb yazmaq məcburidir.
- **4.3:** Təsdiqi yalnız Rəhbər rolu və ya təsdiq səlahiyyəti olan rol edə bilər. Admin olmaq avtomatik təsdiq hüququ vermir.
- **4.3a:** Rəhbər rolu bu taskın daxilində yaradılır. Task 14 sonradan həmin rolun menyu və görünüş qaydalarını tətbiq edir.

## Mütləq qorunmalı davranışlar
- "Təsdiq gözləyənlər" sifarişləri göndərilmə sırasına görə göstərir.
- Yan panel səhifə aşağı sürüşəndə görünən qalır (auditdə yaxşı qiymətləndirilib).
- Sifariş səhifəsinin təhlil hissəsi dəyişmir: seçilmiş baza (Task 1), tutan cəmlər (Task 1b/1c), "Qiymət yoxdur" / "Daxili təminat" (Task 2).

## Out of scope
- Qərar panelinin mobildə yeri və aşağıda sabit düymələr — Task 12.
- Paneldəki sözlər ("Məlum qiymətlər üzrə məbləğ" və s.) — Task 5.
- Rəhbər rolunun menyu və görünüş qaydaları — Task 14.

## Acceptance — biznes dili ilə
- Test mühitində "Təsdiq gözləyənlər"də bir test sifarişi görürəm. Real 27 obyektin heç birində heç nə dəyişməyib.
- Sifarişi açanda qərar düymələrini axtarmıram; təhlilə baxarkən onlar görünən qalır.
- Səbəb yazmadan "Düzəliş tələb et" göndərə bilmirəm. Səbəblə qaytarıram; göndərən düzəldib yenidən göndərəndə panel bunun ikinci göndərmə olduğunu və mənim səbəbimi göstərir.
- Təsdiqləyəndən sonra panel kimin və nə vaxt təsdiqlədiyini göstərir; status bir dəfə görünür.
- Təsdiq səlahiyyəti olmayan admin hesabı sifarişi təsdiqləyə bilmir.
- Bu task canlıya çıxandan sonra real sifarişləri Rəhbər rolu ilə təsdiqləmək mümkündür; təsdiq edə bilən kimsənin olmadığı ara dövr yaranmır.
- Köhnə, Excel-dən gəlmiş sifarişdə panel "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." yazır; uydurma ad və tarix yoxdur.

## Açıq suallar
Yoxdur.

---

# Task 05 — Terminlər, vahidlər və texniki məlumatların rəhbər görünüşündən çıxarılması

## Məqsəd
Rəhbər ekranı idarəetmə dilində danışsın. Hər anlayışın bir adı olsun, vahidlər Azərbaycan dilində olsun, texniki kodlar rəhbərin gözünü yormasın.

## Auditdə müşahidə edilən hazırkı problem
**Texniki məlumat:**
- Obyekt kodları görünür: LOC-000043 (panel cədvəli, Obyektlər, mobil kartlar, obyekt səhifəsinin başlığı).
- Məhsul kodları görünür: PRD-000110 (sifariş sətirləri).
- "Versiya 1" sifariş başlığında və obyekt səhifəsinin cədvəlində; "Sətir sayı" sütunu.
- "Server işləyir" yazısı başlıqda daim durur.
- Məhsul adının altında mənası bilinməyən kodlar var: "2.8" (Rosmarinus), "20078331" (Columbus 80 BM 100 Şotka), "M-101-S-2" (Yay ayaqqabısı).

**Vahidlər və format:**
- Vahidlər ingiliscədir: PCS, BAG, PACK, PAIR, ROLL, L, M2, KG.
- Məbləğ ₼-dan ayrılıb aşağı sətrə düşür: 1366-da sifariş sətirlərində "99.00 / ₼", mobildə "431,670.91 / ₼".
- Qiymət 4 onluqla göstərilir: "32.1273 ₼" (Zibil paketi).

**Köhnə və qeyri-dəqiq terminlər:** "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "mövqe", "Məlum qiymətlər üzrə məbləğ / cəm", "Çəkili orta qiymət", "Tarixçə natamam", "Son 9 mövcud aydan 3-də", "Trend".

**Eyni anlayış üçün fərqli sözlər** (bir qismi Task 1–2-dən sonra aşkarlanıb):
- "Bütün dövr" (düymə) və "Bütün dövrün ortalaması" (nəticə mətni).
- "Artıq sifariş olunmur" (filtr) və "Artıq sifariş olunmayanlar" (nişan).
- "Qiyməti olmayanlar" ("Niyə dəyişib?" hissəsi) və "Qiymət yoxdur" (sətir).
- Nərimanov heykəli obyekt səhifəsi: başlıqda "1 məhsulun qiyməti yoxdur", cədvəldə "1 sətirdə qiymət yoxdur".
- Sifariş başlığında "40 sətir · 2 sətirdə qiymət yoxdur": "sətir" iki dəfə işlənir.
- Bəzi xülasələrdə köhnə "qiymətsiz sifarişlər" ifadəsi qalıb.
- Diqqət kartlarındakı cümlə: "Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır" (Task 2-dən sonra hələ qalıbsa).

## İstədiyim nəticə
- Bütün tətbiqdə təsdiqlənmiş söz siyahısı işlənir; eyni anlayış hər yerdə eyni adla çıxır.
- Rəhbərin ekranlarında obyekt və məhsul kodları, "Versiya" və "Sətir sayı" görünmür: panel, aylıq hesabat, obyektlər, sifariş, məhsul tarixçəsi. Admin ekranlarında (Qiymət təsnifatı, Excel importları) lazım olduqca qalır.
- "Server işləyir" yalnız problem olanda görünür.
- Vahidlər: ədəd, kisə, paket, cüt, rulon, litr, m², kq və ekranda rast gəlinən digərləri.
- Məbləğ heç vaxt ₼-dan ayrılmır; qiymətlər 2 onluqla göstərilir.
- Faydalı spesifikasiya qalır (5 L, 50 kq); mənası bilinməyən kodlar rəhbərə göstərilmir.

## Qəbul edilmiş qərarlar
- **5.1 — təsdiqlənmiş termin cədvəli:**

| Köhnə | Yeni |
|---|---|
| Yeni sifarişlər | Yeni məhsullar |
| Artıq sifariş olunmayanlar / Artıq sifariş olunmur | Bu ay yazılmayan məhsullar |
| mövqe | məhsul |
| Məlum qiymətlər üzrə məbləğ / cəm | Qiyməti olan sətirlərin cəmi (və ya gizlət) |
| Çəkili orta qiymət | Orta qiymət |
| Tarixçə natamam | Müqayisə üçün data azdır |
| Son 9 mövcud aydan 3-də | Son 9 ayın 3-də sifariş edilib |
| Trend | Məhsul tarixçəsi |

- Dəyişdirilməyən sözlər:
  - **Task 2:** "Qiymət yoxdur" (kəhrəba), "Daxili təminat" (neytral), "N sətirdə qiymət yoxdur", "N sətir daxili təminat (ödənişsiz)", "Daxili: Azpetrol baza".
  - **Task 1b:** "Müqayisə olunan", "Sifariş qeydə alınmayıb", "Müqayisə bazası yoxdur", "Qiymət yoxdur · N obyekt", "10 obyektin sifarişində qiyməti olmayan sətir var".
  - **Task 3:** "Sistemdə hələ sifarişi yoxdur" və obyektlərin tam adları: Heydər Əliyev Mərkəzi, Bakı Konqres Mərkəzi, Hökumət evi və ətrafı parklar, Space TV qarşısı, Təmir-tikinti (ərazidə olan dibçəklərə qulluq) və s.

## Mütləq qorunmalı davranışlar
- Məhsul tarixçəsində "Mənbə və versiya məlumatı" bağlı bölmədə qalır; auditdə düzgün sayılıb.
- Sifariş sətirlərində "Mənbəyə bax" son səviyyə kimi qalır.
- Heç bir rəqəm dəyişmir. Yalnız sözlər, vahidlər və format dəyişir; Task 1/1b/1c rəqəmləri eyni qalır.

## Out of scope
- Kartlarda xəbərdarlığın təkrarlanması və vizual çəkisi — Task 9.
- "Niyə dəyişib?" hissələrinin sırası və vurğusu — Task 6.
- Menyunun rola görə görünməsi — Task 14.

## Acceptance — biznes dili ilə
- Panel, sifariş və obyekt səhifələrində heç bir LOC/PRD kodu, "Versiya" və "Server işləyir" görmürəm.
- Fəvvarələr sifarişində "71 → 0 PCS" əvəzinə "71 → 0 ədəd", "32.1273 ₼" əvəzinə 2 onluqlu qiymət görürəm.
- 1366-da və telefonda heç bir məbləğ ₼-dan ayrılmır.
- Sifariş səhifəsində "Yeni sifarişlər" əvəzinə "Yeni məhsullar", "Artıq sifariş olunmayanlar" əvəzinə "Bu ay yazılmayan məhsullar", paneldə "Tarixçə natamam" əvəzinə "Müqayisə üçün data azdır" görürəm.
- Yuxarıdakı fərqli söz cütlərinin heç biri qalmayıb.
- Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb.

## Açıq suallar
Yoxdur.

---

# Task 06 — "Niyə dəyişib?" bölməsi

## Məqsəd
Rəhbər sifariş səhifəsində "nə qədər dəyişib" rəqəmindən dərhal əsas səbəbə keçsin. Əsas səbəb birinci və seçilmiş görünsün, xəbərdarlıq yalnız həqiqətən lazım olanda çıxsın.

## Auditdə müşahidə edilən hazırkı problem
- Hissələrin sırası sabitdir (Yeni, Miqdar, Qiymət, Artıq, Xidmətlər), böyüklüyə görə deyil. Fəvvarələr meydanında (Sentyabr 2026, Keçən ay) əsas səbəb, "Artıq sifariş olunmayanlar −8,093.70 ₼", dördüncü sətirdədir.
- Əsas səbəb vurğulanmır; bütün sətirlər eyni çəkidədir.
- Mənfi zolaq boz rəngdədir, ona görə əsas səbəb görsənmir (Fəvvarələr −8,093.70; Nərimanov heykəli −1,601.06).
- Xəbərdarlıq hesabla ziddiyyət təşkil edir. Hissələr cəmə dəqiq bərabərdir (Fəvvarələr: +5,133.27 + 648.98 + 17.00 − 8,093.70 − 290.00 = −2,584.45 ₼), amma yenə "Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir" yazılır. Heydər Əliyev və Nərimanov sifarişlərində də belədir.
- Əsas müqayisə sətrində baza məbləğinin adı yoxdur. Heydər Əliyev, Son 6 ay: "17,583.62 ₼" yanında böyük yaşıl fərq və faiz durur, hansı rəqəmin baza olduğu yazılmır.

## İstədiyim nəticə
- Hissələr mütləq böyüklüyə görə sıralanır; ən böyüyü birinci və seçilmiş görünür.
- Bütün zolaqlar xərcin istiqamətinə görə rənglənir: artım qırmızı, azalma yaşıl (9.1).
- Xəbərdarlıq yalnız izah olunmayan hissə olanda çıxır və nəyin çatışmadığını konkret deyir.
- Müqayisə sətrində "baza" və "fərq" açıq yazılır.
- Rəhbər hələ də hesablamadan deyə bilir: "35 minlik sifarişin artmasının əsas səbəbi 29 min manatlıq yeni məhsullardır."

## Qəbul edilmiş qərarlar
- Müqayisə seçilmiş bazaya görə aparılır və panel kartı ilə eynidir (Task 1).
- Göstərilən hissələrin cəmi "Cəmi" rəqəminə qəpiyinə qədər bərabərdir (Task 1c).
- Daxili təminat heç vaxt xəbərdarlıq sayılmır. "Təchizat forması dəyişib: alınan / şirkətdaxili" ayrıca hissədir (Task 2).
- **9.1:** Xərc artımı qırmızı, azalma yaşıl. Bu, "yaxşı/pis" kimi yox, xərcin istiqaməti kimi təqdim olunur.
- **5.1:** Hissə adları: "Yeni məhsullar", "Bu ay yazılmayan məhsullar"; "mövqe" əvəzinə "məhsul".

## Mütləq qorunmalı davranışlar
- Rəqəmlər dəyişmir, yalnız sıra və görünüş dəyişir. Heydər Əliyev, Keçən ay: Yeni +29,691.52, Miqdar −309.20, Qiymət +30.00, Artıq −5,259.62, Xidmətlər −300.00, cəmi +23,852.70. Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" hissələrinin hər biri 750.00 ₼ azala bilər; cəmi dəyişmir.
- Sifariş səhifəsindəki baza seçici qalır (Task 1).

## Out of scope
- Hissə adlarının dəyişdirilməsi — Task 5 (5.1); bu task onları istifadə edir.
- Panel kartında mal adı və payı — Task 7.
- Aşağıdakı "Əsas dəyişikliklər" siyahısı — Task 10.
- Ad fərqi və variant keçidi (Sabun elano → Sabun elano lavanda ətirli), o cümlədən "variant dəyişib" sətri — Task 13 (13.1a).

## Acceptance — biznes dili ilə
- Fəvvarələr sifarişində birinci sətir "Bu ay yazılmayan məhsullar −8,093.70 ₼"-dır, yaşıl rəngdədir (xərc azalıb) və digərlərindən seçilir.
- Heydər Əliyevdə birinci sətir "Yeni məhsullar +29,691.52 ₼"-dır və qırmızıdır (xərc artıb).
- Hissələr cəmə tam bərabər olanda ziddiyyətli xəbərdarlıq görmürəm. Qiymətsiz sətir olanda xəbərdarlıq nəyin çatışmadığını konkret deyir.
- Müqayisə sətrində hansı rəqəmin baza olduğunu oxuyuram.

## Açıq suallar
Yoxdur.

---

# Task 07 — Əsas səbəbin məhsul adı və payı ilə göstərilməsi

## Məqsəd
Panel kartı dəyişməni yalnız kateqoriya ilə yox, onu doğuran konkret malla izah etsin. Rəhbər sifarişə girmədən "bu artım traktordandır" deyə bilsin.

## Auditdə müşahidə edilən hazırkı problem
- Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: kart "Əsas səbəb: Yeni sifarişlər +29,691.52 ₼" yazır. Artımın böyük hissəsi isə bir maldır: Traktor qazonbiçən RT-6127.1 ZL, 0 → 1 ədəd, +21,900.00 ₼ (ümumi fərq +23,852.70 ₼). İlk sifarişi Sentyabr 2026-dadır.
- Traktoru görmək üçün sifarişə keçib "Əsas dəyişikliklər" siyahısında axtarmaq lazımdır.
- Başqa nümunələr (Keçən ay):
  - Fəvvarələr meydanı, −2,584.45: əsas səbəb "Artıq sifariş olunmayanlar −8,093.70"; ən böyük mal Yay ayaqqabısıdır, −1,988.00 (71 → 0 ədəd).
  - Nərimanov heykəli, −1,166.42: əsas səbəb "Artıq sifariş olunmayanlar −1,601.06"; ən böyük mal Mərmər bej qalınlığı 2 sm, −883.20 (7.36 → 0 m²).

## İstədiyim nəticə
- Hər diqqət kartında əsas səbəbin yanında həmin səbəbdə ən böyük təsiri olan mal görünür: adı, məbləği və payı.
- Pay ayrı-ayrı məhsul təsirlərinə görə hesablanır (7.1, 7.1a): top məhsulun təsiri eyni istiqamətdə olan bütün məhsul təsirlərinin cəminə bölünür. Artımda artan, azalmada azalan bütün məhsulların təsirləri toplanır, ona görə pay heç vaxt 100%-i keçmir.
  - Heydər Əliyev (Keçən ay): "Traktor qazonbiçən RT-6127.1 ZL — +21,900 ₼ (artımların …%-i)". Təkcə yeni məhsulların cəmi 29,691.52 ₼ olduğu üçün pay 74%-dən çox ola bilməz.
  - Fəvvarələr (Keçən ay): "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)". Təkcə bu ay yazılmayan məhsulların cəmi 8,093.70 ₼ olduğu üçün pay 25%-dən çox ola bilməz.
- Pay seçilmiş müqayisə bazasına görə hesablanır (Task 1).

## Qəbul edilmiş qərarlar
- Kart seçilmiş bazanı daşıyır və sifariş səhifəsi ilə eyni rəqəmləri göstərir (Task 1).
- Cəmlər qəpiyinə qədər tutur (Task 1c).
- **7.1:** Pay eyni istiqamətdəki təsirlərin cəminə görə hesablanır.
- **7.1a:** Pay ayrı-ayrı məhsul təsirlərinə görə hesablanır: top məhsulun təsiri eyni istiqamətdə olan bütün məhsul təsirlərinin cəminə bölünür.
- **5.1:** Kartda "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" adları işlənir.
- **9.1:** Kartdakı məbləğin rəngi xərcin istiqamətini göstərir: artım qırmızı, azalma yaşıl.

## Mütləq qorunmalı davranışlar
- Kartdakı əsas kateqoriya sətri və iki köməkçi sətir qalır.
- Sifariş səhifəsində traktor "Əsas dəyişikliklər" siyahısında birinci görünməyə davam edir (təsirə görə sıralama).

## Out of scope
- Kart başlıqları, rəng qaydasının özü, xəbərdarlıq təkrarı — Task 9.
- "Niyə dəyişib?" sırası — Task 6.
- Ad fərqindən yaranan yalançı məhsul cütləri və variantlar — Task 13.

## Acceptance — biznes dili ilə
- Paneli açanda Heydər Əliyev kartında traktoru, məbləğini və "artımların …%-i" payını görürəm; pay 74%-dən çox deyil. Səbəbi sifarişə girmədən deyə bilirəm. (Task 13-də Sabun elano variant əlaqəsi təsdiqlənəndən sonra yeni məhsulların cəmi 28,941.52 ₼-a düşür və bu sərhəd 76%-ə qalxır.)
- Fəvvarələr kartında (Keçən ay) "Yay ayaqqabısı — −1,988 ₼ (azalmaların …%-i)" görünür; pay 25%-dən çox deyil.
- Bazanı dəyişəndə pay yeni bazaya görə yenilənir və heç bir bazada, heç bir kartda 100%-i keçmir.

## Açıq suallar
Yoxdur.

---

# Task 08 — Aylıq hesabat

## Məqsəd
Rəhbər il cədvəlinə baxanda bütün rəqəmləri oxumadan qeyri-adi ayları tutsun və ay cəmlərini görsün. Cədvəl adi noutbukda da işləsin.

## Auditdə müşahidə edilən hazırkı problem
- Ayların cəmi sətri yoxdur. Sentyabrın cəmini paneldəki 71,210.29 ₼ ilə yoxlamaq olmur.
- Qeyri-adi ay gözə çarpmır: hər hücrədə faiz var, vurğu yoxdur. Heydər Əliyev İyun 36,010.19 ₼ (+85.48%) digər rəqəmlərin içində itir.
- Gələcək aylar (Oktyabr–Dekabr) keçmişdə sifariş olmayan aylarla eyni görünür: "—" və izahı "Oktyabr 2026: sifariş yoxdur".
- ⚠ işarəsi faizi əvəz edir. Bayıl yolunun Sentyabr hücrəsində yalnız "⚠1" var, panel isə eyni ay üçün +254.03% göstərir.
- Hücrədəki kiçik rəngli nöqtənin (status) mənası yalnız mouse ilə üzərinə gələndə aydın olur.
- 12 aylıq cədvəl yalnız 1280px-dən enli ekranda açılır. 1150–1279px noutbukda rəhbər yalnız bir ayın kart siyahısını görür.
- Beşrəqəmli məbləğlər sıxdır: Fəvvarələr sətrində "23,449.32 ₼ 11,161.99 ₼" demək olar bitişik yazılır.
- 1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır.

## İstədiyim nəticə
- Cədvəlin altında ay cəmləri və il cəmi olan sətir var; bu sətirdə faiz yoxdur (8.1).
- Qeyri-adi ay: obyektin əvvəlki 3 mövcud ayının ortalamasından ±50%-dən çox fərqlənən ay rəqəmləri oxumadan seçilir. Əvvəlki 3 mövcud ay yoxdursa, vurğu olmur (8.2).
- Gələcək aylar keçmiş boş aylardan fərqlənir və "sifariş yoxdur" demir.
- ⚠ və faiz eyni hücrədə birlikdə görünür.
- Status nöqtəsinin qısa izahı ekrandadır.
- Rənglər xərcin istiqamətini göstərir: artım qırmızı, azalma yaşıl (9.1).
- 12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur.
- Heç sifarişi olmayan obyekt (Çadır) paneldəki ifadə ilə göstərilir: "Sistemdə hələ sifarişi yoxdur".

## Qəbul edilmiş qərarlar
- Hesabatdan sifarişə keçid bazasız gedir və sifariş "Keçən ay" ilə açılır, çünki hesabat aydan-aya oxunur (Task 1-də razılaşdırılıb).
- 27 obyekt, tam adlar və Azərbaycan əlifbası ilə sıralama (Task 3).
- Hücrədəki ⚠ sayları Task 2 qaydası ilə sayılır; daxili təminat daxil deyil.
- **8.1:** Cəmi sətrində aydan-aya faiz göstərilmir.
- **8.2:** Anomaliya = əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox fərq. Yetərli tarixçə (3 mövcud ay) yoxdursa, anomaliya göstərilmir.
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; "yaxşı/pis" kimi yox, xərcin istiqaməti kimi.

## Mütləq qorunmalı davranışlar
- 1366 və 1440-da Yanvar–Dekabr üfüqi sürüşdürmədən görünür; başlıq sətri yuxarıda sabit qalır.
- Hücrəyə klik həmin sifarişi açır.
- "İl cəmi" sütunu qalır.
- Rəqəmlər panellə eynidir (Task 1b/1c).

## Out of scope
- Mobil aylıq hesabatın quruluşu — Task 12.
- Rəng qaydasının özü — Task 9 (9.1); bu task həmin qaydanı tətbiq edir.
- Sözlər və vahidlər — Task 5.

## Acceptance — biznes dili ilə
- Cəmi sətrində audit vaxtındakı data ilə bu rəqəmləri görürəm: Yanvar 11,084.35 · Fevral 25,652.22 · Mart 48,296.72 · Aprel 49,106.54 · May 62,556.61 · İyun 70,992.62 · İyul 48,430.78 · Avqust 44,340.78 · Sentyabr 71,210.29 · İl 431,670.91 ₼. Sentyabr paneldəki rəqəmlə eynidir. Bu sətirdə faiz yoxdur.
- Heydər Əliyevin İyun hücrəsi (36,010.19 ₼) vurğulanır: əvvəlki 3 mövcud ayın (Mart–May) ortalaması 14,458.58 ₼-dır, fərq +149%.
- Heydər Əliyevin Avqust hücrəsi (11,985.02 ₼) vurğulanmır: əvvəlki 3 ayın (May–İyul) ortalamasından fərq −48%-dir.
- Heydər Əliyevin Yanvar, Fevral və Mart hücrələri vurğulanmır: əvvəlki 3 mövcud ay yoxdur.
- Oktyabr–Dekabr "sifariş yoxdur" demir və keçmiş boş aylardan fərqlənir.
- Bayıl yolunun Sentyabr hücrəsində həm ⚠1, həm faiz görünür.
- 1200px enində də 12 aylıq cədvəli görürəm.

## Açıq suallar
Yoxdur.

---

# Task 09 — İdarəetmə paneli UX

## Məqsəd
Paneli açan rəhbər 10 saniyədə hansı obyektə baxacağını bilsin və bir kliklə oraya keçsin. Geri qayıdanda qaldığı yerə dönsün.

## Auditdə müşahidə edilən hazırkı problem
- Birinci ekranda ay, məbləğ, istiqamət və baza görünür. "Hansı obyektə baxım" sualının cavabı, yəni diqqət kartları, isə birinci ekranın altında qalır.
- Kart başlıqları yanıldır:
  - "Ən böyük məbləğ artımı" iki kartda təkrarlanır (Heydər Əliyev və Novxanı).
  - "Ən böyük faiz dəyişməsi" də iki kartdadır (Bayıl yolu +254.03% və Milli Konservatoriya +480.01%).
  - "Son 3 ay" bazasında Novxanının artımı +268.05%-dir, amma "Ən böyük faiz dəyişməsi" kartı Milli Konservatoriyaya (+85.55%) verilib.
- Qiymət xəbərdarlığı demək olar hər kartda cümlə kimi təkrarlanır; narıncı rəng çox işlənir və xəbərdarlığın təsiri itir.
- Yaşıl rəng xərcin artmasını göstərir və "yaxşı" kimi oxunur.
- Çiplər klik olunmur. Hansı obyektlərdə qiymət yoxdur və ya tarixçə natamamdır, bunu görmək üçün cədvəl filtrini əllə seçmək lazımdır. Sıfır saylı çip də görünür ("Tarixçə natamam 0"). Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid yoxdur.
- "Bütün obyektlər" cədvəli:
  - varsayılan sıra obyekt adına görədir, dəyişməyə görə yox;
  - 26 sətir iki səhifəyə bölünürdü (ikinci səhifədə yalnız İDEA); 27 obyektlə də iki səhifədir;
  - "Növbəti" basılanda səhifə ən yuxarı qalxır;
  - "Detallara bax" iki sətrə sınır, qiymət xəbərdarlığı 4 sətir tutur.
- Sifarişdən geri qayıdanda panel ən yuxarıdan açılır və rəhbər baxdığı kartı itirir.
- Müqayisədən kənar obyekt olanda (Keçən ay: EXPO) fərq (+26,689.47) ay cəminin (71,210.29) altında durur, müqayisə olunan məbləğin (71,030.25) yanında yox. Rəhbər ay cəmindən çıxanda başqa rəqəm alır.

## İstədiyim nəticə
- Birinci ekranda ən azı birinci diqqət obyekti görünür.
- Kart başlıqları kartın niyə seçildiyini düzgün deyir: eyni başlıq təkrarlanmır, "ən böyük" yalnız həqiqətən ən böyük olana yazılır.
- Qiymət xəbərdarlığı kartda qısa işarə və say ilə verilir, hər kartda cümlə kimi təkrarlanmır.
- Rənglər: xərc artımı qırmızı, azalma yaşıl. İzahı "xərc artıb / azalıb" kimi verilir, "yaxşı / pis" kimi yox (9.1). Bu qayda panel, aylıq hesabat, "Niyə dəyişib?" və obyektlər siyahısı üçün eynidir.
- Hər çip klik olunur və cədvəli həmin obyektlərə süzür; sıfır saylı çip görünmür. "Qiymət yoxdur · N obyekt" həmin obyektləri göstərir.
- Cədvəl:
  - 27 sətir bir səhifədədir;
  - varsayılan sıra dəyişmənin böyüklüyünə görədir;
  - düymələr və xəbərdarlıqlar bir sətirə sığır.
- Geri qayıdanda panel qaldığım yerdən açılır.
- İstisna olanda fərq müqayisə olunan məbləğin yanında görünür: 71,030.25 − 44,340.78 = +26,689.47.
- "Bütün dövr" bazasında da kartlar məntiqli seçilir (Task 1-dən sonra yoxlanmalı qeyd kimi qalıb).

## Qəbul edilmiş qərarlar
- Ümumi müqayisə eyni kohort üzrə aparılır (Task 1b, 3). İstisnalar adları ilə ayrıca göstərilir:
  - "Sifariş qeydə alınmayıb": Puşkin parkı, Təmir-tikinti;
  - "Müqayisə bazası yoxdur": Keçən ay bazasında EXPO;
  - "Sistemdə hələ sifarişi yoxdur": Çadır.
- Başlıq cədvəlin cəmi ilə eynidir və hər cəm qəpiyinə qədər tutur (Task 1b/1c).
- Baza linkdə saxlanır, kartlarda "…görə" yazısı var (Task 1).
- Obyekt sayı 24 / 27-dir (Task 3).
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; "yaxşı/pis" yox, xərcin istiqaməti kimi təqdim olunur. Bu qaydanın sahibi bu taskdır; Task 6, 7, 8, 10 və 11 eyni qaydanı tətbiq edir.
- **5.1:** Çip və kart sözləri Task 5-in təsdiqlənmiş cədvəlinə görədir (məsələn, "Tarixçə natamam" → "Müqayisə üçün data azdır").

## Mütləq qorunmalı davranışlar
- Seçilmiş baza bütün linklərdə sifariş səhifəsinə ötürülür; "Geri" bazanı qaytarır; "Xüsusi seçim" paneli boşaltmır (Task 1).
- Çiplərin cəmi obyekt sayına bərabərdir (Task 1b).
- Kartdakı "Əsas səbəb" sətri oxunaqlı qalır (auditdə yaxşı qiymətləndirilib).

## Out of scope
- Kartda mal adı və payı — Task 7.
- Kodlar (LOC-…), sözlər və məbləğ formatı — Task 5.
- Qiymət təsnifatının rəhbər üçün yalnız baxış rejimində açılması — Task 14 (14.1).
- Mobil düzülüş — Task 12.

## Acceptance — biznes dili ilə
- 1366×768 ekranda paneli açanda aşağı sürüşdürmədən ən azı bir diqqət kartı görürəm.
- Heç bir kart başlığı təkrarlanmır; "ən böyük faiz" yazılan kart həqiqətən ən böyük faizə malikdir.
- Heydər Əliyev kartında artım qırmızı, Fəvvarələr kartında azalma yaşıl görünür; izahda "xərc artıb / azalıb" yazılır.
- "Qiymət yoxdur · 10 obyekt" çipinə basanda cədvəldə həmin 10 obyekt qalır.
- Cədvəldə 27 obyekt bir səhifədədir və ən böyük dəyişmədən başlayır.
- Heydər Əliyev kartından sifarişə keçib qayıdanda həmin kartın yanına dönürəm.
- "Keçən ay" bazasında başlıqdakı çıxma (71,030.25 − 44,340.78) göstərilən fərqə bərabərdir.

## Açıq suallar
Yoxdur.

---

# Task 10 — "Əsas dəyişikliklər", məhsul tarixçəsi və məhsul saylarının uyğunluğu

## Məqsəd
Rəhbər konkret malın dəyişməsinə baxanda miqdarın, qiymətin və pulun nə qədər dəyişdiyini düzgün görsün. Malın tarixçəsində isə bu ayın adi olub-olmadığını anlasın.

## Auditdə müşahidə edilən hazırkı problem
**"Əsas dəyişikliklər" siyahısı:**
- Həm miqdarı, həm qiyməti dəyişən mal yalnız "Miqdar təsiri" nişanı alır. Zibil paketi (Fəvvarələr): 50 → 55 paket, qiymət 32.00 → 32.1273 ₼, +167.00 ₼. Bunun 160 ₼-ı miqdardan, 7 ₼-ı qiymətdən gəlir, amma sətir bunu göstərmir.
- Məhsul sayları ekranlar arasında tutmur:
  - Heydər Əliyev, Sentyabr: sifariş səhifəsində "Yeni 58 / Hamısı 113", obyekt müqayisə səhifəsində "Yeni 60 / 119 mövqe".
  - Fəvvarələrdə "Hamısı 100" yazılır, halbuki sifarişdə 76 sətir var. 100 iki ayın birləşməsidir, amma bu izah olunmur.

**Məhsul tarixçəsi pəncərəsi:**
- Qrafik əyri xəttlə çəkilir, aylar arasında olmayan dəyərlər göstərir.
- Ədəd üçün 0.25 addımlı ox var: Traktor qazonbiçən üçün 0, 0.25, 0.5, 0.75, 1.
- X oxunda Avqust yazılmayıb (Şampun qab üçün: İyul 40, Avqust 20, Sentyabr 40 ədəd).
- "Orta qiymət" xətti qrafikin üst kənarına yapışır.
- Pəncərədə sürüşdürəndə arxadakı səhifə də sürüşür.
- Çatışmayan məlumat:
  - bu ayki miqdarın əvvəlki orta miqdara nisbəti (məsələn: "orta 30 ədəd, bu ay 40 — 1.3×");
  - təchizatçı (21,900 ₼-lıq traktor üçün vacibdir).

## İstədiyim nəticə
- Qarışıq dəyişən sətirdə iki hissə ayrıca görünür: "Miqdar +160 · Qiymət +7".
- Siyahıdakı məbləğlər xərcin istiqamətinə görə rənglənir: artım qırmızı, azalma yaşıl (9.1).
- Hər sayın yanında nəyi saydığı yazılıb. Eyni sual üçün sifariş səhifəsi və obyekt müqayisə səhifəsi eyni rəqəmi göstərir.
- Tarixçə pəncərəsi:
  - aylıq dəyərlər düz xətt və ya sütunla göstərilir;
  - ədəd üçün ox tam ədədlərlə gedir;
  - bütün aylar yazılıb;
  - qiymət xətti kənara sıxılmır;
  - pəncərə sürüşəndə arxa səhifə yerində qalır.
- Pəncərədə bu ayki miqdarın orta miqdara nisbəti (seçilmiş bazaya görə) və təchizatçı görünür.

## Qəbul edilmiş qərarlar
- Müqayisə bazası hər yerdə eynidir (Task 1).
- Daxili təminat ayları pəncərədə "Daxili təminat" kimi göstərilir, qiymətsiz sətir "—" kimi (Task 2).
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; xərcin istiqaməti kimi təqdim olunur.
- **5.1:** Pəncərənin adı "Məhsul tarixçəsi", tezlik sətri "Son 9 ayın 3-də sifariş edilib" (Task 5 dəyişir; bu task istifadə edir).

## Mütləq qorunmalı davranışlar
- Yığcam sətir formatı qalır: "20 → 40 ədəd · Qiymət 4.00 → 4.00 ₼". Auditdə dəyişmənin sırf miqdardan olduğunu dərhal göstərdiyi üçün yaxşı sayılıb.
- Siyahı təsirin böyüklüyünə görə sıralanır; "Hamısına bax" qalır.
- Pəncərədə "Son 9 ayın 3-də sifariş edilib · İlk sifariş · Son sifariş · Tipik interval" sətri qalır.
- "Mənbə və versiya məlumatı" bağlı bölmədə qalır.

## Out of scope
- Söz və vahid dəyişiklikləri (PCS → ədəd və s.), qiymətin 2 onluqla göstərilməsi — Task 5.
- Ad fərqindən yaranan yalançı yeni/yazılmayan cütləri və variantlar — Task 13.
- Obyekt müqayisə səhifəsi Task 11-də sifariş səhifəsinə birləşdirilir (11.1). Bu task yalnız sayların eyni tərifini təmin edir.

## Acceptance — biznes dili ilə
- Zibil paketi sətrində miqdar və qiymət payını ayrıca görürəm.
- Siyahıda Nitroamafoska +870 qırmızı, Yay ayaqqabısı −1,988 yaşıl görünür.
- Heydər Əliyev Sentyabr üçün "yeni məhsul" sayı sifariş səhifəsində və müqayisə səhifəsində eynidir; "Hamısı"nın nəyi saydığı yazılıb.
- Şampun qab üçün tarixçəsində oxda Avqust yazılıb, qrafik düz xətlərlə çəkilib.
- Traktor tarixçəsində ox 0 və 1 göstərir (0.25 yox) və təchizatçı yazılıb.
- Pəncərəni sürüşdürəndə arxa səhifə tərpənmir.

## Açıq suallar
Yoxdur.

---

# Task 11 — Obyekt səhifəsi və obyekt müqayisə səhifəsi

## Məqsəd
Obyektin öz səhifəsi vəziyyəti panel və sifariş səhifəsi ilə eyni dildə, eyni bazada və eyni rəqəmlərlə göstərsin. Müqayisə üçün ayrıca ikinci səhifə qalmasın.

## Auditdə müşahidə edilən hazırkı problem
**Obyektlər siyahısı:**
- "Dəyişmə" sütunu rəngsizdir və nəyə görə hesablandığı yazılmır; paneldə isə rənglidir.

**Obyekt səhifəsi:**
- Mini qrafikdə İyun və İyul ikisi də "İyu" yazılıb (Nərimanov heykəli: "Apr May İyu İyu Avq Sen"); sütunlarda rəqəm yoxdur.
- Səhifə seçilmiş bazanı qəbul etmir. Bu ay sifarişi olmayan obyekt üçün paneldəki "Detallara bax" bura aparır və baza itir.
- Daxili təminat sayı görünmür: Nərimanovda yalnız "Qiymət yoxdur 1" var, "1 sətir daxili təminat" yoxdur.
- Heydər Əliyev səhifəsindəki "15" qiymətsiz sətrin bütün tarixçəyə aid olduğu yazılmır, bu ayınkı kimi oxunur.

**Obyekt müqayisə səhifəsi ("Müqayisə et"):**
- Sifariş səhifəsindəki təhlili fərqli qaydada təkrarlayır: siyahı əlifba sırasıdır (418 Sprinkler, A4 kağız…), fərq pulla yox, miqdarla göstərilir, səhifə Excel təsiri bağışlayır.
- Rəhbər sifariş səhifəsi ilə bu səhifədən hansına baxmalı olduğunu bilmir.
- Bu səhifə rəqəmləri sifariş səhifəsindən ayrı qayda ilə hesablayır. Hazırda nəticələr eynidir, amma gələcəkdə ayrıla bilər.

## İstədiyim nəticə
- Obyektlər siyahısında "Dəyişmə" xərcin istiqamətinə görə rənglidir (artım qırmızı, azalma yaşıl) və bazası yazılıb.
- Mini qrafikdə ay adları təkrarlanmır və məbləğlər görünür.
- Obyekt səhifəsi seçilmiş bazanı qəbul edir və saxlayır.
- Qiymət yoxdur və daxili təminat sayları ayrıca göstərilir; hər sayın hansı dövrə aid olduğu yazılır.
- Ayrıca obyekt müqayisə səhifəsi qalmır; müqayisə sifariş səhifəsinin təhlil hissəsində aparılır (11.1):
  - obyekt səhifəsindəki "Müqayisə et" son sifarişin, sətirlərdəki "Müqayisə" isə həmin sifarişin təhlil səhifəsini açır;
  - seçilmiş baza saxlanılır;
  - müqayisə səhifəsində olub sifariş səhifəsində olmayan məlumat itmir.

## Qəbul edilmiş qərarlar
- Qiymət yoxdur / daxili təminat qaydası (Task 2): Nərimanov, Sentyabr — 1 / 1.
- 27 obyekt, tam adlar və sıralama (Task 3).
- Baza linkdə saxlanır (Task 1).
- **11.1:** Ayrıca obyekt müqayisə səhifəsi əsas sifariş/təhlil səhifəsinə birləşdirilir.
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; xərcin istiqaməti kimi təqdim olunur.

## Mütləq qorunmalı davranışlar
- Obyekt səhifəsindəki dövrlər cədvəli və hər sətirdə "Sifarişə bax" qalır.
- Sifariş səhifəsindən "Obyektin sifarişləri" obyekt səhifəsinə aparır.

## Out of scope
- LOC kodları, "Versiya" sütunu və "Çəkili orta qiymət" kimi sözlər — Task 5.
- Məhsul saylarının vahid tərifi (58/113 və 60/119) — Task 10.
- Mobil — Task 12.

## Acceptance — biznes dili ilə
- Nərimanov səhifəsində ay adları təkrarlanmır (İyun və İyul ayrıdır) və sütunlarda məbləğ görünür.
- Paneldə "Son 3 ay" seçib sifarişi olmayan obyektə keçəndə obyekt səhifəsi də "Son 3 ay" göstərir.
- Nərimanov səhifəsində "Qiymət yoxdur 1 · Daxili təminat 1" görürəm. Heydər Əliyev səhifəsində "15"in bütün tarixçəyə aid olduğu yazılıb.
- Obyektlər siyahısında dəyişmə xərcin istiqamətinə görə rənglidir və bazası yazılıb.
- Ayrıca müqayisə səhifəsi yoxdur. Obyekt səhifəsindən "Müqayisə" basanda həmin sifarişin təhlil səhifəsi açılır və seçilmiş baza saxlanılır.

## Açıq suallar
Yoxdur.

---

# Task 12 — Mobil görünüş

## Məqsəd
Ənvər müəllim telefonda da sifarişi rahat təhlil edib qərar verə bilsin.

## Auditdə müşahidə edilən hazırkı problem
Telefon eni 390px ilə:
- Başlıq "Material sifarişlərinin idarə edilməsi" 3 sətrə sınır.
- Aylıq hesabat mobildə yalnız seçilmiş bir ayı göstərir; obyektin il üzrə gedişatı itir.
- Sifariş sətirləri cədvəli 810px enindədir, ekranın istifadə olunan hissəsi isə 338px-dir; yana sürüşdürmək lazım gəlir.
- Sifariş səhifəsində qərar paneli "Niyə dəyişib?" təhlilindən əvvəl gəlir; qərar düymələri ekranın altında sabit deyil.
- Info (ⓘ) izahları yalnız mouse üzərinə gələndə açılır. Toxunanda açılmır; masaüstündə klik də heç nə açmır.

## İstədiyim nəticə
- Başlıq bir sətirə sığır.
- Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür.
- Sifariş sətirləri telefonda yana sürüşdürmədən oxunur.
- Sifariş səhifəsinin ardıcıllığı: nə olub → niyə → qərar. Qərar düymələri ekranın altında sabitdir.
- Info izahları toxunanda və kliklə açılır.

## Qəbul edilmiş qərarlar
- İstisnalar bloku mobildə başlığın dərhal altındadır (Task 1b).
- Mobil kartlar da bazanı sifariş səhifəsinə ötürür (Task 1).

## Mütləq qorunmalı davranışlar
- Panel mobildə kart siyahısı kimi istifadəyə yararlı qalır (auditdə yaxşı qiymətləndirilib).
- Masaüstü görünüş dəyişmir.

## Out of scope
- Məbləğin ₼-dan ayrılmaması və "Server işləyir" yazısı — Task 5. Bu task yalnız həmin qaydanın telefonda işlədiyini yoxlayır.
- Qərar panelinin məzmunu və qaydaları (səbəbin məcburiliyi, təsdiq hüququ) — Task 4.
- 12 aylıq cədvəlin noutbukda açılma eni — Task 8.

## Acceptance — biznes dili ilə
- Telefonda başlıq bir sətirdir və Task 5-in məbləğ qaydası burada da işləyir.
- Aylıq hesabatda bir obyektin 12 aylıq gedişatını telefonda görə bilirəm.
- Sifariş sətirlərini yana sürüşdürmədən oxuyuram.
- Task 4-ün test sifarişini telefonda açıram, təhlilə baxıram və "Təsdiqlə" / "Düzəliş tələb et" düymələrini ekranın altında tapıram.
- ⓘ işarəsinə toxunanda izah açılır.

## Açıq suallar
Yoxdur.

---

# Task 13 — Məhsul adlarının uyğunlaşdırılması / alias

## Məqsəd
Eyni mal fərqli yazıldığı üçün yalançı "yeni" və "bu ay yazılmayan" dəyişikliyi yaranmasın; ətir, rəng və ölçü kimi variantlar isə ayrı qalsın. Sistem heç vaxt öz-özünə birləşdirmə etməsin.

## Auditdə müşahidə edilən hazırkı problem
- Heydər Əliyev Mərkəzi, Sentyabr 2026:
  - "Sabun elano" "artıq sifariş olunmur" kimi görünür: 60 → 0 ədəd, 12.50 ₼, −750.00 ₼.
  - "Sabun elano lavanda ətirli" isə "yeni" kimi görünür: +750.00 ₼.
  - İkisi arasındakı əlaqə sistemdə yoxdur. Nəticədə "Niyə dəyişib?"də həm "yeni", həm "yazılmayan" hissəsi 750 ₼ artır.
- Əlavə kontekst (mənbə Excel faylların əvvəlki təhlili): 69 halda eyni mal fərqli yazılıb — boşluq fərqi, "15 W" / "15W", "3/4" / "3\4".
- Məhsullar səhifəsində hazırda "Bu bölmə hələ hazırlanır" yazılıb. Oradakı planlaşdırılmış imkanlar arasında "Məhsullar və onların variantları (ölçü, model, sifariş vahidi)" və "Excel yazılışları üçün alternativ adlar" var.

## İstədiyim nəticə
- Sistem ehtimal olunan uyğunluqları təklif edir. İki növ təklif var:
  - **Yazılış fərqi** (eyni mal): boşluq, "15 W" / "15W", "3/4" / "3\4". Təsdiqdən sonra bir mal sayılır.
  - **Variant fərqi** (ətir, rəng, ölçü): məsələn "Sabun elano" / "Sabun elano lavanda ətirli". Təsdiqdən sonra eyni əsas məhsulun ayrı variantları kimi bağlanır, bir mala birləşmir.
- Hər təklifi yalnız admin və ya data idarəçisi təsdiqləyir və ya rədd edir; təsdiqlənməyən heç nə dəyişmir.
- Yazılış fərqi təsdiqlənəndən sonra malın tarixçəsi, "Əsas dəyişikliklər" və "Niyə dəyişib?" onu bir mal kimi görür.
- Təsdiqlənmiş variant keçidi "Niyə dəyişib?"də bir sətirdə "variant dəyişib" kimi göstərilir, məsələn: "Sabun elano — variant dəyişib: adi → lavanda ətirli". Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda baş verir; təsdiqlənməmiş hallarda iki mal ayrı sətirlərdə qalır.
- Heç bir təsdiqdən sonra məbləğlər dəyişmir.
- Səhv təsdiq geri alına bilir.

## Qəbul edilmiş qərarlar
- Qeyri-müəyyən uyğunluqlar heç vaxt avtomatik qəbul edilmir (sizin qaydanız).
- Sifarişlər və məbləğlər dəyişmir; yalnız malın kimliyi və variant əlaqəsi qurulur.
- **13.1:** Ətir, rəng və ölçü fərqi olan adlar eyni əsas məhsula aid ola bilər, amma ayrı variant kimi qalır. Avtomatik kor birləşdirmə yoxdur.
- **13.1a:** Eyni əsas məhsulun təsdiqlənmiş variant keçidi "Niyə dəyişib?" bölməsində bir sətirdə "variant dəyişib" kimi göstərilir. Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda tətbiq olunur; qeyri-müəyyən hallarda avtomatik birləşdirmə yoxdur.
- **13.2:** Uyğunluqları və alternativ adları yalnız admin və ya data idarəçisi təsdiqləyir.

## Mütləq qorunmalı davranışlar
- Task 1/1b/1c rəqəmləri dəyişmir: ümumi məbləğlər və obyekt fərqləri eyni qalır.
- Task 2-nin qiymət vəziyyətləri (qiymət yoxdur / daxili təminat) təsdiqdən sonra da düzgün qalır.

## Out of scope
- Menyuda "Məhsullar" bölməsinin kimə görünməsi — Task 14.
- Sözlər — Task 5.

## Acceptance — biznes dili ilə
- Sistem "Sabun elano lavanda ətirli"ni "Sabun elano"nun variantı kimi təklif edir, özü heç nə etmir.
- Admin təsdiqləyəndən sonra ikisi eyni əsas məhsulun ayrı variantları kimi görünür, bir mala birləşmir.
- Variant əlaqəsi təsdiqlənəndən sonra Heydər Əliyevin Sentyabr sifarişində "Niyə dəyişib?" bölməsində "Sabun elano" üçün bir "variant dəyişib" sətri görürəm; bu sətrin təsiri 0.00 ₼-dır (750.00 − 750.00). "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" hissələrinin hər biri 750.00 ₼ azalır.
- Təsdiq olunana qədər iki mal indiki kimi ayrı sətirlərdə qalır.
- "15 W" / "15W" kimi yazılış fərqini admin təsdiqləyəndən sonra malın tarixçəsində bir mal görürəm.
- Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm.
- Heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir (Heydər Əliyev, Keçən ay: +23,852.70).
- Səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır.

## Açıq suallar
Yoxdur.

---

# Task 14 — Rola görə menyu

## Məqsəd
Ənvər müəllim öz Rəhbər hesabı ilə girəndə yalnız qərar üçün lazım olan bölmələri görsün.

## Auditdə müşahidə edilən hazırkı problem
- Audit "Administrator" hesabı ilə aparıldı: başlıqda "Administrator" yazılırdı. Ayrıca rəhbər hesabının olub-olmadığı yoxlanmadı.
- Menyuda rəhbərə lazım olmayan bölmələr var: Excel importları, İstifadəçilər, Məhsullar. "Məhsullar" açılanda "Bu bölmə hələ hazırlanır" yazır.
- Qiymət təsnifatı və Təchizatçılar da menyudadır; rəhbərə lazım olub-olmadığı müəyyən deyildi.

## İstədiyim nəticə
- Task 4-də yaradılmış Rəhbər rolu üçün menyu və görünüş qaydaları tətbiq olunur (4.3a, 14.2); təsdiq səlahiyyəti bu roldadır (4.3).
- Rəhbər menyusu: İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər, Obyektlər, Təchizatçılar (yalnız baxış).
- Qiymət təsnifatı rəhbər menyusunda yoxdur; rəhbər onu qiymət xəbərdarlığından yalnız baxış rejimində aça bilir.
- Admin bütün bölmələri görür, amma təsdiq səlahiyyəti ona avtomatik verilmir.
- Boş ("hazırlanır") bölmə heç kimə göstərilmir. Task 13 onu məzmunla dolduranda admin görür.
- Rəhbərdən gizlədilən bölmələr (Excel importları, İstifadəçilər) birbaşa linklə də açılmır. Yalnız baxış verilən bölmələrdə rəhbər heç nəyi dəyişə bilmir.

## Qəbul edilmiş qərarlar
- **14.1:** Təchizatçılar rəhbərə yalnız baxış üçün görünür. Qiymət təsnifatı əsas menyuda olmur; qiymət xəbərdarlığından yalnız baxış rejimində açılır.
- **14.2:** Ayrıca Rəhbər rolu yaradılır.
- **4.3:** Təsdiqi yalnız Rəhbər rolu və ya təsdiq səlahiyyəti olan rol edir. Admin olmaq avtomatik təsdiq hüququ vermir.
- **4.3a:** Rəhbər rolu Task 4-də yaradılır; bu task həmin rolun menyu və görünüş qaydalarını tətbiq edir.

## Mütləq qorunmalı davranışlar
- Admin üçün heç bir bölmə itmir.
- Rəhbərin gördüyü ekranlarda Task 1–13-ün nəticələri eyni qalır.

## Out of scope
- Rəhbər rolunun yaradılması, təsdiq hüququ və təsdiq axınının özü (qərar paneli, səbəbin məcburiliyi) — Task 4.
- Texniki sözlərin gizlədilməsi — Task 5.

## Acceptance — biznes dili ilə
- Rəhbər hesabı ilə menyuda yalnız bunları görürəm: İdarəetmə paneli, Aylıq hesabat, Təsdiq gözləyənlər, Obyektlər, Təchizatçılar. Başlıqda "Administrator" yazılmır.
- Təchizatçılarda heç nəyi dəyişə bilmirəm.
- Sifarişdəki qiymət xəbərdarlığından Qiymət təsnifatını açıram, amma heç nəyi dəyişə bilmirəm.
- Excel importlarının və İstifadəçilərin linkini əllə yazsam da açılmır.
- Admin hesabı ilə bütün bölmələr əvvəlki kimidir; təsdiq səlahiyyəti verilməyibsə, admin sifarişi təsdiqləyə bilmir.

## Açıq suallar
Yoxdur.

---

# Task 16 — Import ekranlarında qiymət vəziyyəti

## Məqsəd
Excel importunu edən şəxs importu təsdiqləmədən əvvəl qiyməti olmayan sətirləri sistemin qalan hissəsi ilə eyni dildə görsün, onları elə orada təsnif edə bilsin və importdan sonra hansı işin qaldığını bilsin.

## Auditdə müşahidə edilən hazırkı problem
Bu problem əsas auditdə deyil, Task 2-dən sonra aşkarlanıb:
- Import təsdiq ekranları qiyməti olmayan sətirləri hələ köhnə, sadə qayda ilə sayır: qiymət yoxdursa, "qiymətsiz".
- Import sətirlərində qiymət təsnifatı (alınan / ödənişsiz daxili təminat) hələ yoxdur. Məsələn, Azpetrol bazadan gələn və sonra "Daxili təminat" sayılacaq sətir import zamanı "qiymətsiz" görünür.
- Nəticədə import ekranının sayı Qiymət təsnifatı səhifəsinin saylarından fərqlənir.
- Kontekst:
  - Hazırda 94 sətir "Təsnif edilməyib" vəziyyətindədir və hamısı Qala bazadan gəlir: Fevral 25, Aprel 24, Sentyabr 19, İyun 11, Yanvar 7, May 5, Mart 3.
  - Sizin verdiyiniz məlumata görə Qala anbarda həm alınan, həm ödənişsiz mal var; Azpetrol bazanın da yalnız bir hissəsi ödənişsizdir.

## İstədiyim nəticə
- Import yoxlaması (review) Task 2-nin sözləri ilə danışır: "N sətirdə qiymət yoxdur".
- Yoxlama zamanı hər qiymətsiz sətri "Alış qiyməti tələb olunur" və ya "Ödənişsiz daxili təminat" kimi təsnif etmək olur.
- Təsnif edilməyən sətirlər importdan sonra Qiymət təsnifatına "Təsnif edilməyib" kimi düşür və ekran bunu əvvəlcədən deyir; yanında Qiymət təsnifatına keçid var.
- Import zamanı verilən təsnifat sonradan Qiymət təsnifatında düzəldilə bilir.
- Importdan sonra saylar tutur: "Təsnif edilməyib" sayı yoxlamada təsnif edilməyən sətirlərin sayı qədər artır.

## Qəbul edilmiş qərarlar
- Qiymət vəziyyətləri və sözlər Task 2-dəki kimidir.
- Mənbəyə görə avtomatik təsnifat olmur. Bu, sizin məlumatınızdan çıxır: Qala anbarda həm alınan, həm ödənişsiz mal olduğu üçün "Qala baza = ödənişsiz" kimi qayda səhv olardı.
- **16.1:** Qiymət təsnifatı import yoxlaması zamanı edilə bilir; sonradan da düzəliş edilə bilir.

## Mütləq qorunmalı davranışlar
- Import obyektləri əvvəlki kimi tanıyır, Task 3-ün alternativ adları da daxil (məsələn, "H.Ə.M Təmizlik" → Heydər Əliyev Mərkəzi).
- Qiymət təsnifatı səhifəsinin sayları və səhifələməsi düzgün qalır (Task 2).

## Out of scope
- 94 sətrin əl ilə təsnifatı. Bu, sizin işinizdir, kod tapşırığı deyil.
- Import bölməsinin kimə görünməsi — Task 14.

## Acceptance — biznes dili ilə
- Test mühitində import edəndə yoxlama ekranı "N sətirdə qiymət yoxdur" deyir.
- Yoxlamada bu sətirlərin bir neçəsini təsnif edirəm. Importdan sonra onlar Qiymət təsnifatında seçdiyim vəziyyətlə görünür; qalanları "Təsnif edilməyib" kimi düşür və sayları dəqiq tutur.
- Import zamanı verdiyim təsnifatı sonradan Qiymət təsnifatında dəyişə bilirəm.
- Heç bir sətir mənbəyə görə avtomatik təsnif olunmur.
- Import ekranında və qalan ekranlarda eyni sözləri görürəm.

## Açıq suallar
Yoxdur.

---

# Task 15 — Yekun Ənvər müəllim auditi

## Məqsəd
Bütün tapşırıqlardan sonra yoxlamaq: Ənvər müəllim ən son tam ayın sifarişlərini bu sistemlə rahat və inamla təsdiqləyə bilirmi? Bu task yeni imkan qurmur, yalnız yoxlayır.

## Auditdə müşahidə edilən hazırkı problem
İlk auditin (23.09.2026) yekun cavabı "Xeyr" idi. Səbəblər və onları həll edən tasklar:
1. Rəqəmlər ekranlar arasında sabit deyildi: baza itirdi, saylar fərqli idi — Task 1, 1b, 1c, 3.
2. Qiymət xəbərdarlıqları etibarsız idi: 94 sətir təsnifatsız idi, daxili təminat bir ekranda səhv sayılırdı — Task 2 və təsnifat işi.
3. Təsdiq addımı yoxlanılmamışdı — Task 4.
4. Əsas səbəb mal adı ilə deyilmirdi — Task 7.

## İstədiyim nəticə
- İlk auditin eyni ssenarisi və eyni hesabat quruluşu: 20 bölmə, P0–P3 cədvəli və açıq yekun cavab.
- Audit ən son tam real ayın datası ilə aparılır: Oktyabr tamdırsa Oktyabr, deyilsə Sentyabr. Ayın tam olub-olmadığı audit başlamazdan əvvəl sizinlə dəqiqləşdirilir.
- Təsdiq axını ayrıca test sifarişi ilə, Task 4-ün test mühitində yoxlanır.
- Audit başlamazdan əvvəl real qiymət təsnifatında açıq sətir qalmır: "Təsnif edilməyib" sətri yoxdur; "Alış qiyməti tələb olunur" sətirlərinin hamısına ya qiymət daxil edilib, ya da biznes qaydasına görə qiymət tələb etmədiyi təsdiqlənib və uyğun statusa keçirilib.
- Hər köhnə tapıntı üçün vəziyyət: həll olunub / qismən / həll olunmayıb, sübutla (ekran və rəqəm).
- Task 4–16-nın qəbul şərtləri və Task 1–3 üzrə regress yoxlanır.
- Yeni tapıntılar yeni task kimi təklif olunur; bu task çərçivəsində kod dəyişmir.

## Qəbul edilmiş qərarlar
- Audit yalnız oxuma rejimində aparılır: real sifariş təsdiqlənmir, qaytarılmır, dəyişdirilmir.
- Audit admin yox, Rəhbər hesabı ilə aparılır (Task 14).
- Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk.
- Bu task Task 16-dan sonra, ən sonda icra olunur.
- **15.1:** Ən son tam real ay + təsdiq axını üçün ayrıca test sifarişi. Oktyabr tamdırsa Oktyabr, deyilsə Sentyabr.
- **15.2:** Yekun auditdən əvvəl real qiymət təsnifatı üzrə açıq sətir qalmamalıdır.
- **15.2a:** "Alış qiyməti tələb olunur" real sətirlər yekun audit üçün açıq sayılır. Auditdən əvvəl ya qiymət daxil edilir, ya da biznes qaydasına görə qiymət tələb etmədiyi təsdiqlənib uyğun statusa keçirilir.

## Mütləq qorunmalı davranışlar
Yoxlanacaq nümunələr:
- **Task 1:** Heydər Əliyev, "Son 3 ay" — panel kartı və sifariş səhifəsi eyni rəqəmi göstərir; "Geri" bazanı qaytarır.
- **Task 1b:** başlıq cədvəlin cəmi ilə eynidir; "Sifariş qeydə alınmayıb" altında Puşkin parkı və Təmir-tikinti; "Keçən ay" bazasında EXPO ayrıca.
- **Task 1c:** hər sətirdə baza + fərq = cari; hissələrin cəmi "Cəmi"yə bərabərdir.
- **Task 2:** Nərimanov heykəli, Sentyabr — hər ekranda "Qiymət yoxdur 1 · Daxili təminat 1"; təchizatçı "Daxili: Azpetrol baza".
- **Task 3:** 27 obyekt, "24 / 27", Çadır "Sistemdə hələ sifarişi yoxdur", tam adlar, düzgün sıralama.
- **İlk auditdə yaxşı olanlar:** "Niyə dəyişib?" cəmi tutur; yığcam məhsul sətri; "Son 9 ayın 3-də…" sətri; 12 ay bir ekrana sığır; "Qaralama" heç yerdə görünmür.

(Sentyabr nümunələri Sentyabr datası ilə yoxlanır; audit Oktyabrla aparılsa da, bu regress yoxlamaları Sentyabr üzərindən edilir.)

## Out of scope
- Yeni imkan hazırlamaq və ya kodu düzəltmək.

## Acceptance — biznes dili ilə
- Hesabatın sonunda bu suala açıq, yumşaldılmamış cavab var: "Bu ayın sifarişləri bu gün Ənvər müəllimə verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?"
- İlk auditin hər P0 və P1 tapıntısının vəziyyəti sübutla göstərilib.
- Klik sayı ilk auditlə müqayisə olunub (ilk auditdə: 3 klik + 3 sürüşdürmə).
- Audit başlayanda Qiymət təsnifatında nə "Təsnif edilməyib", nə də qiyməti yazılmamış "Alış qiyməti tələb olunur" sətri var.

## Açıq suallar
Yoxdur.

---

# Sahibkar qərarları — jurnal

Açıq sual qalmayıb. Hər qərar aid brief-in "Qəbul edilmiş qərarlar" bölməsindədir.

| № | Qərar | Task |
|---|---|---|
| 4.1 | Excel-dən gəlmiş keçmiş sifarişlərdə: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil."; saxta audit məlumatı yaradılmır | 04 |
| 4.2 | Düzəliş tələb edəndə səbəb yazmaq məcburidir | 04 |
| 4.3 | Təsdiqi yalnız Rəhbər və ya təsdiq səlahiyyəti olan rol edir; admin olmaq avtomatik təsdiq hüququ vermir | 04, 14 |
| 4.3a | Rəhbər rolu Task 4-də yaradılır; Task 14 onun menyu və görünüş qaydalarını tətbiq edir | 04, 14 |
| 5.1 | Termin cədvəli təsdiqlənib ("Yeni məhsullar", "Bu ay yazılmayan məhsullar", "Müqayisə üçün data azdır" və s.) | 05; 06, 07, 09, 10 istifadə edir |
| 7.1 | Pay eyni istiqamətdəki təsirlərin cəminə görə hesablanır | 07 |
| 7.1a | Pay ayrı-ayrı məhsul təsirlərinə görə: top məhsulun təsiri / eyni istiqamətdəki bütün məhsul təsirlərinin cəmi | 07 |
| 8.1 | Aylıq hesabatın cəmi sətrində aydan-aya faiz yoxdur | 08 |
| 8.2 | Anomaliya: əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox fərq; tarixçə yetərli deyilsə göstərilmir | 08 |
| 9.1 | Xərc artımı qırmızı, azalma yaşıl; "yaxşı/pis" yox, xərcin istiqaməti kimi | 09; 06, 07, 08, 10, 11 tətbiq edir |
| 11.1 | Ayrıca obyekt müqayisə səhifəsi sifariş/təhlil səhifəsinə birləşdirilir | 11 |
| 13.1 | Ətir, rəng, ölçü fərqi ayrı variant kimi qalır; avtomatik kor birləşdirmə yoxdur | 13 |
| 13.1a | Təsdiqlənmiş variant keçidi "Niyə dəyişib?"də bir sətirdə "variant dəyişib" kimi göstərilir | 13 |
| 13.2 | Uyğunluqları yalnız admin və ya data idarəçisi təsdiqləyir | 13 |
| 14.1 | Təchizatçılar rəhbərə yalnız baxış üçün; Qiymət təsnifatı menyuda yox, xəbərdarlıqdan yalnız baxış rejimində | 14 |
| 14.2 | Ayrıca Rəhbər rolu | 14 (rol Task 4-də yaranır) |
| 15.1 | Ən son tam real ay (Oktyabr tamdırsa Oktyabr, deyilsə Sentyabr) + təsdiq axını üçün ayrıca test sifarişi | 15 |
| 15.2 | Yekun auditdən əvvəl qiymət təsnifatında açıq sətir qalmır | 15 |
| 15.2a | Qiyməti yazılmamış "Alış qiyməti tələb olunur" sətirləri də açıq sayılır | 15 |
| 16.1 | Qiymət təsnifatı import yoxlamasında da edilə bilir və sonradan düzəldilə bilir | 16 |
