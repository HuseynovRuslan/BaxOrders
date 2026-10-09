# Task 11 — Obyekt səhifəsi və obyekt müqayisə səhifəsi

## Məqsəd
Obyektin öz səhifəsi vəziyyəti panel və sifariş səhifəsi ilə eyni dildə, eyni bazada və eyni rəqəmlərlə göstərsin. Müqayisə üçün ayrıca ikinci səhifə qalmasın.

## Auditdə müşahidə edilən hazırkı problem
**Obyektlər siyahısı:**
- "Dəyişmə" sütunu rəngsizdir və nəyə görə hesablandığı yazılmır; paneldə isə rənglidir.

**Obyekt səhifəsi:**
- Mini qrafikdə İyun və İyul ikisi də "İyu" yazılıb (Nərimanov heykəli: "Apr May İyu İyu Avq Sen"); sütunlarda rəqəm yoxdur.
- Səhifə seçilmiş bazanı qəbul etmir. Bu ay sifarişi olmayan obyekt üçün paneldəki "Detallara bax" bura aparır və baza itir.
- Daxili təminat sayı görünmür: Nərimanovda yalnız "Qiymət yoxdur 1" var, "1 sətir daxili təminat" yoxdur.
- Heydər Əliyev səhifəsindəki "15" qiymətsiz sətrin bütün tarixçəyə aid olduğu yazılmır, bu ayınkı kimi oxunur.

**Obyekt müqayisə səhifəsi ("Müqayisə et"):**
- Sifariş səhifəsindəki təhlili fərqli qaydada təkrarlayır: siyahı əlifba sırasıdır (418 Sprinkler, A4 kağız…), fərq pulla yox, miqdarla göstərilir, səhifə Excel təsiri bağışlayır.
- Rəhbər sifariş səhifəsi ilə bu səhifədən hansına baxmalı olduğunu bilmir.
- Bu səhifə rəqəmləri sifariş səhifəsindən ayrı qayda ilə hesablayır. Hazırda nəticələr eynidir, amma gələcəkdə ayrıla bilər.

## İstədiyim nəticə
- Obyektlər siyahısında "Dəyişmə" xərcin istiqamətinə görə rənglidir (artım qırmızı, azalma yaşıl) və bazası yazılıb.
- Mini qrafikdə ay adları təkrarlanmır və məbləğlər görünür.
- Obyekt səhifəsi seçilmiş bazanı qəbul edir və saxlayır.
- Qiymət yoxdur və daxili təminat sayları ayrıca göstərilir; hər sayın hansı dövrə aid olduğu yazılır.
- Ayrıca obyekt müqayisə səhifəsi qalmır; müqayisə sifariş səhifəsinin təhlil hissəsində aparılır (11.1):
  - obyekt səhifəsindəki "Müqayisə et" son sifarişin, sətirlərdəki "Müqayisə" isə həmin sifarişin təhlil səhifəsini açır;
  - seçilmiş baza saxlanılır;
  - müqayisə səhifəsində olub sifariş səhifəsində olmayan məlumat itmir.

## Qəbul edilmiş qərarlar
- Qiymət yoxdur / daxili təminat qaydası (Task 2): Nərimanov, Sentyabr — 1 / 1.
- 27 obyekt, tam adlar və sıralama (Task 3).
- Baza linkdə saxlanır (Task 1).
- **11.1:** Ayrıca obyekt müqayisə səhifəsi əsas sifariş/təhlil səhifəsinə birləşdirilir.
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; xərcin istiqaməti kimi təqdim olunur.

## Mütləq qorunmalı davranışlar
- Obyekt səhifəsindəki dövrlər cədvəli və hər sətirdə "Sifarişə bax" qalır.
- Sifariş səhifəsindən "Obyektin sifarişləri" obyekt səhifəsinə aparır.

## Out of scope
- LOC kodları, "Versiya" sütunu və "Çəkili orta qiymət" kimi sözlər — Task 5.
- Məhsul saylarının vahid tərifi (58/113 və 60/119) — Task 10.
- Mobil — Task 12.

## Acceptance — biznes dili ilə
- Nərimanov səhifəsində ay adları təkrarlanmır (İyun və İyul ayrıdır) və sütunlarda məbləğ görünür.
- Paneldə "Son 3 ay" seçib sifarişi olmayan obyektə keçəndə obyekt səhifəsi də "Son 3 ay" göstərir.
- Nərimanov səhifəsində "Qiymət yoxdur 1 · Daxili təminat 1" görürəm. Heydər Əliyev səhifəsində "15"in bütün tarixçəyə aid olduğu yazılıb.
- Obyektlər siyahısında dəyişmə xərcin istiqamətinə görə rənglidir və bazası yazılıb.
- Ayrıca müqayisə səhifəsi yoxdur. Obyekt səhifəsindən "Müqayisə" basanda həmin sifarişin təhlil səhifəsi açılır və seçilmiş baza saxlanılır.

## Açıq suallar
Yoxdur.

---

