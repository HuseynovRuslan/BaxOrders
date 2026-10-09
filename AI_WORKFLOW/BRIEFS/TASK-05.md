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

