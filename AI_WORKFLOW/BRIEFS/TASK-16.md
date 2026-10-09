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

