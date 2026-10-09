# BRIEF — TASK 17 — ORTAQ DİALOQ MÜQAVİLƏSİ

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: P1 · Təşəbbüs: Qərar zənciri

## Məqsəd

Tətbiqdəki bütün dialoqlar eyni cür davransın: `Escape` bağlasın, fokus itməsin, bağlamaq heç vaxt "razıyam" mənasına gəlməsin.

## Problem

Məhsul tarixçəsi pəncərəsi açıq ikən `Escape` düyməsi işləmir — oxucu yalnız kiçik "×" düyməsini tapmalıdır. Klaviatura ilə işləyən adam dialoq açılanda fokusun harada olduğunu bilmir və `Tab` ilə arxadakı səhifəyə düşür. Bu, bütün dialoqlara aiddir: idxal, kataloq, düzəliş, iş axını, mənbə, məhsul tarixçəsi — hamısı bir pəncərə komponentindən qurulub.

## Tələb

1. `Escape` hər dialoqu bağlayır. Bir dialoq digərinin üstündə açıqdırsa, yalnız üstdəki bağlanır.
2. Dialoq açılanda fokus onun içinə keçir; `Tab` dialoqun içində dövr edir; bağlananda fokus dialoqu açan elementə qayıdır.
3. Fon klikinə bağlanma yalnız **oxumaq üçün** dialoqlarda olur (məhsul tarixçəsi, mənbə, sətir detalı). İçində forma və ya təsdiq düyməsi olan dialoq fon klikinə bağlanmır.
4. Bağlamaq heç vaxt dialoqun əməliyyatını icra etmir. Bağlamaq = imtina.
5. Dialoqun görünüşü dəyişmir.

## Qərarlar

17.1, 17.2, 17.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Məhsul tarixçəsi açıqdır → `Escape` basılır → pəncərə bağlanır, səhifə yerində qalır, fokus pəncərəni açan məhsul adına qayıdır.
2. Sətri silmə təsdiqi açıqdır → fona klik edilir → pəncərə **bağlanmır** və heç nə silinmir.
3. Mənbə pəncərəsi açıqdır → fona klik edilir → bağlanır.
4. Klaviatura ilə: dialoq açılanda ilk `Tab` dialoqun içindəki elementə düşür, arxadakı səhifəyə yox.
5. Heç bir dialoqun görünüşü, mətni və düymələri dəyişmir; bütün mövcud dialoqlar əvvəlki kimi açılıb-bağlanır.

## Toxunulmayanlar

Heç bir rəqəm, heç bir mətn, heç bir iş qaydası. Baza yoxdur, backend yoxdur, data yoxdur.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-17.md` — bölünməyib.
