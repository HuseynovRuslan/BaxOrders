# BRIEF — TASK 18 — SƏBƏBDƏN DRAYVERƏ KEÇİD

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: **P0** · Təşəbbüs: Qərar zənciri

## Məqsəd

Rəhbər səbəbi görəndə onun üstünə klikləyib səbəbi yaradan məhsulları görsün. Səbəbdən məhsula gedən yol bir kliklə olsun.

## Problem

Sifariş səhifəsi düzgün deyir: "Yeni məhsullar +29.691,52 ₼ · 58 məhsuldan". Rəhbərin növbəti sualı həmişə eynidir — *hansı 58 məhsul?* Bu sətrin üstünə klikləmək mümkün deyil. Aşağıda həmin siyahı **var** və "Yeni məhsullar" çipi ilə süzülə bilir, amma rəhbər iki ekran aşağı sürüşüb özü uyğun çipi tapmalıdır. Səbəbi göstərib səbəbin içinə buraxmamaq — auditin ən böyük tapıntısıdır.

İkinci problem: səbəb sətrində "58 məhsuldan", çipdə isə "Yeni məhsullar 60" yazılır. Eyni sözün altında iki rəqəm rəhbərin hesabata inamını aşağı salır.

## Tələb

1. "Niyə dəyişib?" bölməsindəki səbəb sətrinə klik aşağıdakı "Əsas dəyişikliklər" siyahısını həmin səbəbə süzsün və oxucunu siyahıya gətirsin.
2. Seçilmiş səbəb URL-də qalsın — keçid paylaşıla bilsin, səhifə yenilənəndə və "geri" basılanda bərpa olunsun.
3. Seçilmiş səbəbə ikinci dəfə klik süzgəci götürsün ("Hamısı"-ya qayıtsın).
4. Çiplər qalsın və eyni vəziyyəti idarə etsin: çipə klik də URL-i yeniləsin.
5. Süzgəc çipi olmayan səbəblər — "Xidmətlər", "Daxili təminat", variant dəyişməsi — klik edilməsin və klik edilən kimi **görünməsin**.
6. Səbəb sətrindəki say ilə çipdəki say eyni sözün altında fərqlənməsin. Rəqəmlərə toxunulmasın — yalnız hər birinin nəyi saydığı yazılsın.

## Qərarlar

18.1, 18.2, 18.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax. **18.3 açıqdır və sahibin təsdiqini gözləyir.**

## Qəbul

1. Heydər Əliyev Mərkəzi, Sentyabr 2026, Keçən ay: "Yeni məhsullar +29.691,52 ₼" sətrinə klik edilir → aşağıdakı siyahı yalnız yeni məhsulları göstərir, "Yeni məhsullar" çipi seçilmiş görünür, ekran siyahıya sürüşür.
2. Həmin an ünvan sətrində seçim görünür; səhifə yenilənir → eyni süzülmüş görünüş qayıdır; "geri" basılır → süzgəcsiz görünüş qayıdır, səhifə tərk edilmir.
3. Eyni sətrə ikinci dəfə klik edilir → siyahı "Hamısı"-ya qayıdır.
4. "Xidmətlər" sətrinin üstünə gəlinir → kursor dəyişmir, sətir işıqlanmır, klik heç nə etmir.
5. Müqayisə bazası səbəb seçiləndə dəyişmir; "Cəmi", hissələrin məbləği və sırası dəyişmir.
6. Səbəb sətri ilə açdığı çip eyni sözün altında iki fərqli rəqəm göstərmir.

## Toxunulmayanlar

Heç bir məbləğ, faiz, "Cəmi" və hissə sırası. Qərar 9.1-in rəngləri və sözləri. "Əsas səbəb" başlığı. Baza seçici və bazanın URL-də olması. Task 5-in hissə adları, Task 2-nin qiymət sözləri.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-18.md` — bölünməyib.
