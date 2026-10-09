# Task 08 — Aylıq hesabat

## Məqsəd
Rəhbər il cədvəlinə baxanda bütün rəqəmləri oxumadan qeyri-adi ayları tutsun və ay cəmlərini görsün. Cədvəl adi noutbukda da işləsin.

## Auditdə müşahidə edilən hazırkı problem
- Ayların cəmi sətri yoxdur. Sentyabrın cəmini paneldəki 71,210.29 ₼ ilə yoxlamaq olmur.
- Qeyri-adi ay gözə çarpmır: hər hücrədə faiz var, vurğu yoxdur. Heydər Əliyev İyun 36,010.19 ₼ (+85.48%) digər rəqəmlərin içində itir.
- Gələcək aylar (Oktyabr–Dekabr) keçmişdə sifariş olmayan aylarla eyni görünür: "—" və izahı "Oktyabr 2026: sifariş yoxdur".
- ⚠ işarəsi faizi əvəz edir. Bayıl yolunun Sentyabr hücrəsində yalnız "⚠1" var, panel isə eyni ay üçün +254.03% göstərir.
- Hücrədəki kiçik rəngli nöqtənin (status) mənası yalnız mouse ilə üzərinə gələndə aydın olur.
- 12 aylıq cədvəl yalnız 1280px-dən enli ekranda açılır. 1150–1279px noutbukda rəhbər yalnız bir ayın kart siyahısını görür.
- Beşrəqəmli məbləğlər sıxdır: Fəvvarələr sətrində "23,449.32 ₼ 11,161.99 ₼" demək olar bitişik yazılır.
- 1440-da cədvəl yuxarıdakı kartların hüdudundan kənara çıxır.

## İstədiyim nəticə
- Cədvəlin altında ay cəmləri və il cəmi olan sətir var; bu sətirdə faiz yoxdur (8.1).
- Qeyri-adi ay: obyektin əvvəlki 3 mövcud ayının ortalamasından ±50%-dən çox fərqlənən ay rəqəmləri oxumadan seçilir. Əvvəlki 3 mövcud ay yoxdursa, vurğu olmur (8.2).
- Gələcək aylar keçmiş boş aylardan fərqlənir və "sifariş yoxdur" demir.
- ⚠ və faiz eyni hücrədə birlikdə görünür.
- Status nöqtəsinin qısa izahı ekrandadır.
- Rənglər xərcin istiqamətini göstərir: artım qırmızı, azalma yaşıl (9.1).
- 12 aylıq cədvəl təxminən 1024px-dən başlayaraq işləyir; məbləğlər sıxlaşmır, cədvəl səhifənin eninə uyğundur.
- Heç sifarişi olmayan obyekt (Çadır) paneldəki ifadə ilə göstərilir: "Sistemdə hələ sifarişi yoxdur".

## Qəbul edilmiş qərarlar
- Hesabatdan sifarişə keçid bazasız gedir və sifariş "Keçən ay" ilə açılır, çünki hesabat aydan-aya oxunur (Task 1-də razılaşdırılıb).
- 27 obyekt, tam adlar və Azərbaycan əlifbası ilə sıralama (Task 3).
- Hücrədəki ⚠ sayları Task 2 qaydası ilə sayılır; daxili təminat daxil deyil.
- **8.1:** Cəmi sətrində aydan-aya faiz göstərilmir.
- **8.2:** Anomaliya = əvvəlki 3 mövcud ayın ortalamasından ±50%-dən çox fərq. Yetərli tarixçə (3 mövcud ay) yoxdursa, anomaliya göstərilmir.
- **9.1:** Xərc artımı qırmızı, azalma yaşıl; "yaxşı/pis" kimi yox, xərcin istiqaməti kimi.

## Mütləq qorunmalı davranışlar
- 1366 və 1440-da Yanvar–Dekabr üfüqi sürüşdürmədən görünür; başlıq sətri yuxarıda sabit qalır.
- Hücrəyə klik həmin sifarişi açır.
- "İl cəmi" sütunu qalır.
- Rəqəmlər panellə eynidir (Task 1b/1c).

## Out of scope
- Mobil aylıq hesabatın quruluşu — Task 12.
- Rəng qaydasının özü — Task 9 (9.1); bu task həmin qaydanı tətbiq edir.
- Sözlər və vahidlər — Task 5.

## Acceptance — biznes dili ilə
- Cəmi sətrində audit vaxtındakı data ilə bu rəqəmləri görürəm: Yanvar 11,084.35 · Fevral 25,652.22 · Mart 48,296.72 · Aprel 49,106.54 · May 62,556.61 · İyun 70,992.62 · İyul 48,430.78 · Avqust 44,340.78 · Sentyabr 71,210.29 · İl 431,670.91 ₼. Sentyabr paneldəki rəqəmlə eynidir. Bu sətirdə faiz yoxdur.
- Heydər Əliyevin İyun hücrəsi (36,010.19 ₼) vurğulanır: əvvəlki 3 mövcud ayın (Mart–May) ortalaması 14,458.58 ₼-dır, fərq +149%.
- Heydər Əliyevin Avqust hücrəsi (11,985.02 ₼) vurğulanmır: əvvəlki 3 ayın (May–İyul) ortalamasından fərq −48%-dir.
- Heydər Əliyevin Yanvar, Fevral və Mart hücrələri vurğulanmır: əvvəlki 3 mövcud ay yoxdur.
- Oktyabr–Dekabr "sifariş yoxdur" demir və keçmiş boş aylardan fərqlənir.
- Bayıl yolunun Sentyabr hücrəsində həm ⚠1, həm faiz görünür.
- 1200px enində də 12 aylıq cədvəli görürəm.

## Açıq suallar
Yoxdur.

---

