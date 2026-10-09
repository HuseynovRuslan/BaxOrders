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

