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

