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

