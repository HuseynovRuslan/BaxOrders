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

