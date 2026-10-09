# BRIEF — TASK 22 — TARİXİ TƏSDİQ İFADƏSİ

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: **P0** · Təşəbbüs: Qərar zənciri

## Məqsəd

Tarixi sifarişlərin statusu doğru qalsın, ifadəsi isə özünü təkzib etməsin.

## Problem

Sifariş səhifəsinin yuxarısında yaşıl `✓ Təsdiqlənib` nişanı var, onun yanında isə yazılır: "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil."

Rəhbər üçün bu iki cümlə bir-birini inkar edir. Biri "təsdiqlənib" deyir, digəri "təsdiq məlumatı yoxdur". Nəticədə statusun özünə inam itir — halbuki status **doğrudur**: bu sifarişlər biznesdə həqiqətən təsdiqlənib, sadəcə təsdiq BaxOrders yaranmazdan əvvəl verilib, ona görə təsdiqləyənin adı və tarixi sistemdə yoxdur.

## Tələb

1. Statuslar **dəyişmir**. Tarixi sifarişlər təsdiqlənmiş olaraq qalır. Bu, ifadə məsələsidir, məlumat məsələsi deyil.
2. Nişan belə oxunsun: **"Təsdiqlənib"**, yanında **"Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb"**.
3. İzah təsdiqləyənin və tarixin niyə olmadığını desin: təsdiq BaxOrders iş axını yaranmazdan əvvəl verilib.
4. "Təsdiq məlumatı mövcud deyil" cümləsi nişanla yanaşı, ziddiyyət yaradan formada bir daha göstərilməsin.
5. Eyni ifadə nişanın göründüyü hər yerdə eyni olsun.

## Qərarlar

22.1, 22.2, 22.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Excel ilə gələn tarixi sifariş açılır → nişan "Təsdiqlənib" oxunur, yanında "Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb" yazılır.
2. Eyni ekranda təsdiqləyənin və tarixin niyə olmadığı bir cümlə ilə izah olunur; "təsdiq məlumatı mövcud deyil" tək başına, nişanı təkzib edən formada görünmür.
3. Sistemdə təsdiqlənmiş adi sifariş (tarixi olmayan) açılır → nişan və izah əvvəlki kimidir, "Tarixi sifariş" yazılmır.
4. Obyektlər siyahısında və aylıq hesabatın statuslarında tarixi sifariş eyni cür ifadə olunur.
5. Heç bir sifarişin statusu, versiyası və məbləği dəyişmir; təsdiq axını və icazələr dəyişmir.
6. Köhnə terminlər süpürgəsi yaşıl qalır.

## Toxunulmayanlar

Sifarişlərin statusu — **heç biri**. İş axını hadisələri, icazələr, təsdiq qutusunun məntiqi. Baza, backend, data. Task 2 və Task 5-in sözləri.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-22.md` — bölünməyib.
