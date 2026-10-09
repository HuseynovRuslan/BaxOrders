# BRIEF — TASK 20 — KLİK AFFORDANSI

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: P1 · Təşəbbüs: Qərar zənciri

## Məqsəd

İnteraktiv olan element interaktiv görünsün; olmayan görünməsin. Rəhbər harada kliklədiyini təxmin etməsin.

## Problem

Auditdə üç boş klik qeydə alındı. Diqqət kartının başlığına — "Heydər Əliyev Mərkəzi" — klik edilir, heç nə olmur; kartın gövdəsinə klik edilir, heç nə olmur. Yeganə keçid kartın altındakı kiçik düymədir. Panel cədvəlində obyektin adı ilə keçid düyməsi arasında bütün ekran eni var: rəhbər adı oxuyur, sonra siçanı sağ kənara aparır.

Əksi də var: sifariş səhifəsində məhsul adı **klik edilir** və tarixçəni açır, amma adi qara mətn kimi görünür — heç kim onu tapmır. Müqayisə xülasəsindəki "Son 3 ayın ortalaması 20.708,65 ₼" sətri də əslində düymədir və bazanı dəyişir; bunu da heç nə bildirmir.

## Tələb

1. Diqqət kartının bütün səthi bir klik sahəsi olsun; kartın içində ikinci keçid olmasın.
2. Panel cədvəlinin sətri bütövlükdə klik edilsin.
3. Sifariş səhifəsindəki məhsul adı interaktiv görünsün.
4. Müqayisə xülasəsindəki ortalama sətirləri düymə kimi görünsün.
5. Klik edilə bilən hər element kursor altında və klaviatura fokusunda görünüşünü dəyişsin; klik edilməyən mətn heç vaxt dəyişməsin.
6. Klaviatura ilə hər keçid əlçatan olsun və fokus həlqəsi görünsün.

## Qərarlar

20.1, 20.2, 20.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Diqqət kartının istənilən boş yerinə klik → həmin obyektin sifariş səhifəsi açılır; kartda başqa keçid yoxdur.
2. Panel cədvəlində obyektin adına klik → eyni səhifə açılır; sətrin sağ kənarındakı ayrıca düymə artıq tələb olunmur.
3. Məhsul adının üstünə gəlinir → görünüşü dəyişir və onun tarixçə açdığı aydın olur.
4. "Son 6 ayın ortalaması 17.583,62 ₼" sətrinin üstünə gəlinir → düymə olduğu görünür; klik bazanı dəyişir və ünvanda qalır.
5. "Əsas səbəb" mətni, hissə adları və məbləğlər kursor altında dəyişmir — onlar klik edilmir.
6. Klaviatura ilə paneldən keçiləndə hər kart bir dayanacaqdır və fokus həlqəsi görünür.
7. Heç bir rəqəm, mətn və rəng dəyişmir; kartların sırası dəyişmir.

## Toxunulmayanlar

Qərar 9.1-in rəngləri **və sözləri**: kartdakı "Keçən aya görə xərc artıb / azalıb" sətri rəngin əvəzedicisidir və **silinmir**. Kartların seçilməsi və sırası (Task 09), "Əsas səbəb" başlığı (Task 06), bütün rəqəmlər.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-20.md` — bölünməyib.
