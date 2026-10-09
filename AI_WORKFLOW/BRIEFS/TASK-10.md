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

