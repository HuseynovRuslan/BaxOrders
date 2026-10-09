# BRIEF — TASK 19 — MƏHSUL TARİXÇƏSİ ÇEKMƏCƏSİ

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: P1 · Təşəbbüs: Qərar zənciri

## Məqsəd

Məhsulun tarixçəsinə baxmaq sifariş qərarından ayrılmaq demək olmasın. Rəhbər tarixçəni açıq görsün, qərarın rəqəmlərini isə itirməsin.

## Problem

Məhsul adına klikləyəndə açılan pəncərə ekranın ortasını tutur və arxadakı qərarı — məbləği, "Baza"nı, "Fərq"i — bağlayır. Rəhbər "55 manat normaldırmı?" sualına baxarkən müqayisə etdiyi rəqəmi görmür. Brauzerin "geri" düyməsi pəncərəni bağlamır, birbaşa panelə atır: bütün drill-down itir. Bir dəfə sifariş olunmuş məhsul üçün qrafik səkkiz sıfır və bir zirvədən ibarətdir — heç nə demir.

## Tələb

1. Məhsul tarixçəsi sağdan açılan çekməcə olsun; açıq ikən sifarişin məbləği, "Baza" və "Fərq" görünən qalsın. Dar ekranda çekməcə tam ekrana keçsin.
2. Açıq çekməcə URL-də qalsın; "geri" düyməsi əvvəlcə çekməcəni bağlasın, səhifəni tərk etməsin. `Escape` də bağlasın.
3. Çekməcə açılıb-bağlananda müqayisə bazası və seçilmiş səbəb dəyişməsin.
4. "Son 9 ayın 1-də sifariş edilib" kimi tezlik cümləsi qrafikdən **əvvəl**, yuxarıda dursun — rəhbərin ilk sualı "bu adi sifarişdir, yoxsa yox?"-dur.
5. İlk dəfə sifariş olunan məhsul üçün sıfır xətli qrafik göstərilməsin; bir cümlə yazılsın. Bu, mövcud tezlik məlumatından götürülsün, yeni hesablama aparılmasın.

## Qərarlar

19.1, 19.2, 19.3 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.

## Qəbul

1. Sifariş səhifəsində məhsul adına klik edilir → çekməcə sağdan açılır; sol tərəfdə məbləğ, "Baza" və "Fərq" oxunaqlı qalır.
2. `Escape` basılır → çekməcə bağlanır, səhifə yerində qalır. "Geri" basılır → çekməcə bağlanır, səhifə yerində qalır; ikinci dəfə "geri" → əvvəlki səhifə.
3. Çekməcə açılıb-bağlandıqdan sonra müqayisə bazası və səbəb süzgəci dəyişməmiş qalır.
4. Çekməcə açıq ikən ünvan paylaşılır → eyni məhsulun çekməcəsi eyni sifarişdə, eyni baza ilə açılır.
5. Tək bir ayda sifariş olunmuş məhsul (məsələn "Ağac dirəyi metal", Sentyabr 2026) → qrafik əvəzinə cümlə; rəqəmlər cədvəldə qalır.
6. Çekməcə açılanda sifarişin məlumatı yenidən yüklənmir.

## Toxunulmayanlar

Tarixçənin özündəki heç bir rəqəm, qrafikin metrikaları (`Miqdar / Məbləğ / Orta qiymət`) və "Orta qiymət" izahı. Mənbə və versiya bölməsi yığılmış qalır. Qərar 9.1-in rəngləri.

## Asılılıq

TASK-17 (dialoq müqaviləsi), TASK-18 (URL modulu).

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-19.md` — bölünməyib.
