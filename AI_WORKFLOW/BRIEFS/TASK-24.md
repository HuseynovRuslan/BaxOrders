# BRIEF — TASK 24 — OBYEKT SƏHİFƏSİ VƏ AYLIQ HESABATA QAYIDIŞ

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: P1 · Təşəbbüs: Qərar zənciri

## Məqsəd

Obyekt səhifəsi nə üçün olduğunu desin və olmayan imkanı vəd etməsin. Aylıq hesabatdan bir aya girib qayıdan rəhbər yerini itirməsin.

## Problem

**Obyekt səhifəsində beş nəzarət elementi eyni ünvana aparır.** Yuxarıdakı tünd "Müqayisə et" düyməsi, kartdakı "Sifarişə bax", sətirdəki dövr adı, sətirdəki "Sifarişə bax" və sətirdəki "Müqayisə" — hamısı eyni sifariş səhifəsini açır.

Bunlardan biri yalan deyir: **"Müqayisə et"** rəhbərə obyektləri bir-biri ilə müqayisə edəcəyini vəd edir. Məhsulda belə imkan yoxdur və bu brif onu tələb etmir — obyektlərin ölçüsü, tipi və sahəsi sistemdə yoxdur, `35.837,72 ₼` ilə `84,10 ₼` müqayisəsi isə qərar vermir.

**Trend sütunları klik edilmir** — halbuki ayın sütunu həmin aya keçmək üçün ən təbii yerdir.

**Aylıq hesabatdan qayıdış yerini itirir.** Matrisin iyirminci sətrindəki xanaya klik edilir, sifariş açılır, "geri" basılır — matris yuxarıdan açılır. Axtarış mətni isə ünvanda saxlanılmır: səhifə yenilənəndə itir.

## Tələb

1. Obyekt səhifəsində hər dövr sətrində bir keçid qalsın.
2. "Müqayisə et" düyməsi **silinsin**. Yenidən adlandırılmasın — olmayan imkanı vəd edirdi.
3. Trend sütunları həmin ayın sifarişinə aparsın; cari ay digərlərindən fərqlənsin; klaviatura ilə də əlçatan olsun.
4. Aylıq hesabatdan sifariş səhifəsinə girib qayıdanda oxucu tərk etdiyi sətrə qayıtsın.
5. Aylıq hesabatın axtarış mətni ünvanda qalsın ki, səhifə yenilənəndə və keçid paylaşılanda saxlanılsın.
6. Aylıq hesabatdan açılan sifariş səhifəsində geri keçid görünsün.

## Qərarlar

24.1, 24.2, 24.3, 24.4 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Obyekt səhifəsində hər dövr sətrində bir keçid var; "Müqayisə et" düyməsi yoxdur.
2. Trend sütununa klik edilir → həmin ayın sifariş səhifəsi açılır; cari ayın sütunu digərlərindən görünüşcə fərqlidir.
3. Aylıq hesabatda aşağı sürüşülür, bir xanaya klik edilir, "geri" basılır → həmin sətir yenidən ekranda görünür.
4. Aylıq hesabatda "Novxan" axtarılır, bir xanaya klik edilir, "geri" basılır → axtarış mətni və süzülmüş cədvəl qayıdır; səhifə yenilənir → yenə qayıdır.
5. Aylıq hesabatdan açılan sifariş səhifəsində geri keçid görünür və hesabata qaytarır.
6. Obyekt səhifəsində heç bir məbləğ, status və dövr siyahısı dəyişmir; aylıq hesabatın heç bir rəqəmi və rəngi dəyişmir.

## Toxunulmayanlar

Aylıq hesabatın matris məzmunu, anomaliya işarələri və rəngləri (Task 08). Obyekt adının artıq keçid olması — **dəyişmir**, o artıq düzgündür. Obyekt səhifəsindəki bütün rəqəmlər. Qərar 9.1.

## Asılılıq

TASK-20 (klik affordansı və sətir kimliyi).

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-24.md` — bölünməyib.
