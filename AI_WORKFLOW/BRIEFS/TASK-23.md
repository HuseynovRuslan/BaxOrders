# BRIEF — TASK 23 — MƏNBƏNİN MƏRHƏLƏLİ AÇILIŞI

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: P1 · Təşəbbüs: Qərar zənciri

## Məqsəd

Rəhbərə baxan sifariş səhifəsi texniki mənşə ilə başlamasın. Mənbə imkanı yerində qalsın, amma istənməyənə qədər görünməsin.

## Problem

Sifariş səhifəsinin aşağısında 78 sətirlik xam cədvəl açıq dayanır və hər sətrində "Mənbəyə bax" keçidi var. Keçid Excel faylının adını, idxal nömrəsini, vərəqi, **Excel sətri 3142**-ni və hər sahənin xam / effektiv / kanonik qarşılığını göstərir. Bu, data məsulu üçün əla, rəhbər üçün isə səhifəni "verilənlər bazası brauzeri"nə çevirən hissədir.

Eyni bölmədə alqoritmi izah edən abzas da başda durur: "Bu sifarişdə 78 məhsul var, müqayisə bazası ilə birlikdə 120. «Hamısı» onlardan dəyişən 113 məhsulu sayır…"

Səhifənin hündürlüyü beş ekrandan çoxdur; "Hamısına bax" açılanda on beş ekrana çatır.

## Tələb

1. Xam sətir cədvəli standart olaraq yığılmış olsun; bir açılışla tam görünsün.
2. Sətir-sətir mənbə keçidləri rəhbərin standart görünüşündə olmasın — cədvəllə birlikdə yığılsın.
3. Mənbə pəncərəsinin **məzmunu dəyişməsin**: heç bir imkan silinmir.
4. Alqoritmi izah edən abzas bölmənin başında durmasın; mövcud izah komponentinin arxasına keçsin.
5. Səhifənin standart hündürlüyü nəzərəçarpacaq dərəcədə azalsın.

## Qərarlar

23.1, 23.2, 23.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Sifariş səhifəsi açılır → xam sətir cədvəli görünmür; yerində sətir sayını göstərən bir açılış var.
2. Açılışa klik edilir → cədvəl əvvəlki kimi, bütün sütunları və hər sətrin mənbə keçidi ilə görünür.
3. Mənbə pəncərəsi açılır → içindəki heç bir sahə itməyib: fayl, idxal nömrəsi, vərəq, Excel sətri, xam / effektiv / kanonik sütunlar.
4. Alqoritm izahı bölmənin başında mətn kimi durmur; izah nişanının arxasındadır və məzmunu dəyişməyib.
5. Standart görünüşdə səhifənin hündürlüyü əvvəlkindən azdır və "Niyə dəyişib?" ilə "Əsas dəyişikliklər" birlikdə daha tez görünür.
6. Heç bir rəqəm və heç bir sətir itmir; süzgəclər (`Bütün sətirlər / Qiyməti olan sətirlər / Qiymət yoxdur`) əvvəlki kimi işləyir.

## Toxunulmayanlar

Mənbə pəncərəsinin məzmunu və imkanı. Sətir cədvəlinin sütunları, süzgəcləri və məlumatı. Task 2-nin qiymət sözləri. Qərar 9.1.

## Asılılıq

TASK-17 (dialoq müqaviləsi) — mənbə pəncərəsi həmin müqaviləni miras alır.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-23.md` — bölünməyib.
