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

