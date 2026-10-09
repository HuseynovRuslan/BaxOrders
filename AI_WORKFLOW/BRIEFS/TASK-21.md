# BRIEF — TASK 21 — PANEL İYERARXİYASI VƏ BAZA ƏHATƏSİ

Status: **TƏKLİF** — sahibin qəbulundan sonra brif olur. Rol tərəfindən dəyişdirilə bilməz.
Prioritet: **P0/P1** · Təşəbbüs: Qərar zənciri

## Məqsəd

Panelə üç saniyə baxan rəhbər **nə qədər dəyişdiyini** oxusun, hansı rəqəmin müqayisə edildiyini bilsin və zəif bazadan çıxan faizi olduğu kimi görsün.

## Problem

**Birincisi, iyerarxiya tərsdir.** Diqqət kartında cari məbləğ böyük (24px), dəyişmə isə kiçik (14px) yazılıb. Kartın orada olma səbəbi dəyişmədir — "Ən böyük məbləğ artımı" yazır — amma göz əvvəlcə dəyişməni yox, məbləği tutur.

**İkincisi, baş rəqəm müqayisə edilən rəqəm deyil.** Xülasə kartında böyük hərflərlə `71.210,29 ₼` yazılır, altında isə kiçik hərflərlə "Müqayisə olunan 23 obyekt: 71.030,25 ₼". Faiz ikincidən hesablanır, rəhbərin yadda saxladığı isə birincidir. Üstəlik qiyməti olmayan sətirlərin daxil olmadığı yalnız kiçik ikonu kliklədikdə görünür.

**Üçüncüsü, zəif baza gizlənir.** "Son 6 ayın ortalaması" seçiləndə müqayisə olunan 24 obyektdən **16-sında** baza natamamdır, amma diqqət kartlarında `+186,85%` heç bir qeyd olmadan yazılır.

**Dördüncüsü,** faiz kartları səhv sıradadır: "İkinci ən böyük faiz dəyişməsi" "Ən böyük faiz dəyişməsi"-dən əvvəl gəlir.

## Tələb

1. Diqqət kartında ən böyük rəqəm dəyişmə olsun; cari məbləğ kiçik, ikinci sətirdə.
2. Ayın həqiqi məcmu məbləği panelin baş rəqəmi olaraq **qalsın**. Müqayisə kohortunun məbləği, fərqi və faizi ondan ayrıca, adlandırılmış sətirdə yazılsın. İkisi bir-birini əvəz etməsin.
3. Qiyməti olmayan sətirlərin məbləğə daxil olmaması ikonun arxasında deyil, görünən sətirdə yazılsın — Task 2-nin mövcud sözləri ilə.
4. Bazası natamam olan obyektin kartında və sətrində faktiki əhatə yazılsın: **"Baza 2/6 ay"**. Faiz "təxmini" adlandırılmasın — hesablama mövcud data üçün dəqiqdir.
5. Faiz kartlarında mütləq fərq də göstərilsin ki, kiçik məbləğli obyektin böyük faizi olduğu kimi qiymətləndirilsin.
6. Faiz kartlarının sırası düzəlsin: birinci "Ən böyük faiz dəyişməsi", sonra "İkinci ən böyük faiz dəyişməsi".

## Qərarlar

21.1, 21.2, 21.3, 21.4, 21.5 — `OWNER_BRIEFS_MASTER.md` əlavəsinə bax.
**21.5:** materiallıq həddi (hansı məbləğdən aşağı obyekt ümumiyyətlə kart almasın) bu tapşırıqda təyin edilmir — sahibin rəqəmidir.

## Qəbul

1. Sentyabr 2026, Keçən ay: "Ən böyük məbləğ artımı" kartında ən böyük rəqəm `+23.852,70 ₼`-dır; `35.837,72 ₼` ondan kiçik, ikinci sətirdədir.
2. Xülasə kartında `71.210,29 ₼` baş rəqəm olaraq qalır; kohortun `71.030,25 ₼`, `+26.689,47 ₼` və `+60,19%`-i ayrıca, adlandırılmış sətirdədir; ikisi qarışdırılmır.
3. Qiyməti olmayan sətirlərin daxil olmaması görünən sətirdə yazılıb, kliklə açılan ikonda deyil.
4. Baza "Son 6 ayın ortalaması" seçilir → bazası natamam olan hər obyektin kartında və sətrində "Baza N/6 ay" görünür; heç yerdə "təxmini" sözü yoxdur.
5. Faiz kartında mütləq fərq də yazılıb (məsələn `1.830,40 ₼` obyekt üçün `+1.514,82 ₼` və `+480,01%` birlikdə).
6. Kartların sırası: ən böyük artım, ikinci, ən böyük azalma, ikinci, **ən böyük faiz**, ikinci ən böyük faiz.
7. Heç bir məbləğ, fərq və faiz dəyişmir; qərar 9.1-in rəngləri və "xərc artıb / azalıb" sözləri yerində qalır.

## Toxunulmayanlar

Hər rəqəm. Kartların hansı obyekti seçməsi (Task 09). Qərar 9.1-in rəngləri **və sözləri** — kartdakı istiqamət cümləsi rəngin əvəzedicisidir, silinmir. Task 2-nin qiymət sözləri, sözbəsöz. Panel kartının sifariş səhifəsi ilə eyni olması (Task 1).

## Asılılıq

TASK-20 (klik affordansı) — eyni komponentlərə toxunur; bu tapşırıq 20-nin qəbul commit-i üzərində yazılır.

## Bu brifi oxuyan tapşırıq

`TASKS/TASK-21.md` — bölünməyib.
