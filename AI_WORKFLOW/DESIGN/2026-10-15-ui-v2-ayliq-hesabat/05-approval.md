# 05 — Təsdiq paketi: UI V2 «Aylıq hesabat»

**Vəziyyət: TƏSDİQLƏNDİ — D-51, 2026-10-16.** Sahib: «Mərhələ 1-i qəbul edirəm. S-1, S-2a, S-3, S-4 və üç ortaq
komponent üzrə tövsiyələrinlə razıyam. Yalnız S-2b fərqlidir: 11 px əvəzinə 12 px seçirəm. Rəqəmlərin oxunaqlılığı daha
vacibdir. Lazım olduqda cədvəl öz daxilində üfüqi sürüşsün, amma səhifənin özü yana sürüşməsin.» Əlavə şərtlər və tam
mətn — `DECISIONS.md` D-51. Aşağıdakı S-2b tövsiyəsi (11 px) **qəbul edilmədi**; qüvvədə olan: 12 px.

**Müstəqil dizayn tənqidi:** ilk yoxlama «KEÇMƏDİ» oldu: 4 ciddi (S2)
irad var idi. Düzəlişdən sonra təkrar yoxlamada «**QEYDLƏRLƏ KEÇDİ**»: açıq S1/S2 yoxdur. Qalan 4 S3 və 5 S4 qeyd icrada
bağlanır (§9).
**Ətraflı:** `02-requirements.md` (tələblər), `03-ux.md` (UX, sxemlər §4), `04-visual.md` (vizual), `04-critique.md`
(tənqid), `06-implementation.md` (tətbiq planı).

## 1. Problem

Rəhbər ilin xərcini obyekt-obyekt oxuyur, amma bu gün:
- hər xanada dörd şey 64 px-ə sıxılıb: məbləğ, faiz, status, ⚠;
- sifarişin sətirlərinə baxmaq üçün hesabatdan çıxmaq lazımdır;
- 1280 px-lik laptopda səhifə yana sürüşür;
- obyektləri il cəminə görə sıralamaq olmur.

## 2. Tövsiyə — nə dəyişir

- **Açılışda «Yığcam» görünüş.** 12 ay görünür. Xanada bunlar var:
  - məbləğ;
  - status — məhsulun öz işarələri: ✓ təsdiqlənib, ⏳ təsdiq gözləyir, ↩ düzəliş tələb olunur;
  - ⚠ N — qiyməti olmayan sətirlər;
  - qeyri-adi ay: ▲ (qırmızı) və ya ▼ (yaşıl).

  «Standart» görünüşdə bunlara keçən aya görə faiz də əlavə olunur.
- **Xanaya klik sağda panel açır.** Panel bunları göstərir:
  - ayın məbləği;
  - «keçən aya görə» və «əvvəlki 3 ayın ortalamasına görə» müqayisələr — ayrı-ayrı adla;
  - qeyri-adi ayın izahı;
  - ayın tərkibi və status;
  - **sifarişin real sətirləri**, cavabdeh şəxs ilə;
  - «Sifarişə bax» və «Obyektin sifarişləri» düymələri.

  Ctrl ilə klik sifarişi yeni tabda açır. Sifarişdən «Geri» basanda hesabata panel açıq halda qayıdırsınız.
- **Yuxarıda 1 böyük + 2 kiçik rəqəm.** Böyük rəqəm seçilmiş sifariş növünə görədir. Hər üç rəqəm serverdən gəlir;
  «Ümumi faktiki xərc» artıq brauzerdə toplanmır.
- **Filtrlər:** İl, Obyekt axtar, Sifariş növü, Baxış (Yığcam / Standart), Sıfırla. Obyekt adına və il cəminə görə
  sıralamaq olur. Hamısı linkdə saxlanır.
- **Səhifə heç bir ekranda yana sürüşmür.** Cədvəl lazım olanda öz qutusunda sürüşür, obyekt və il cəmi sütunları sabit
  qalır.
- **Planşet və telefon:** kartlar planşetdə 6 sütundur, telefonda 3. Panel telefonda tam ekran açılır.
- **Rənglər və şrift:** məhsulun öz tokenləri. Artım qırmızı, azalma yaşıldır. Solğun mətnlərin kontrastı düzəldilir.

## 3. Alternativlər

| | Nə qazanır | Nə itirir |
|---|---|---|
| **Tövsiyə** (yuxarıda) | Figma-nın sakit görünüşü; sizin bütün qərarlarınız; heç bir imkan itmir | ən çox ön tərəf işi; 1280 həlli brauzerdə yoxlanmalıdır |
| Bugünkü səhifəni saxlamaq | dəyişiklik və risk yoxdur | §1-dəki dörd problem qalır |
| Figma-nı olduğu kimi köçürmək | Figma ilə piksel-piksel eyni | qərarlarınıza ziddir: boz faiz, üç bərabər rəqəm, yalnız artım, silinən imkanlar, paneldə yanlış mətn |

## 4. Hər rol üçün nə dəyişir

| Rol | Nə dəyişir |
|---|---|
| Rəhbər | Sifarişin sətirlərinə hesabatdan çıxmadan baxır. Təsdiq gözləyən aylar ⏳ ilə görünür. Təsdiqi əvvəlki kimi «Təsdiq gözləyənlər»də verir. |
| Koordinator | ⚠ N və ↩ (düzəliş tələb olunur) hər xanada görünür. Paneldə sətirləri qiyməti olub-olmamasına görə süzə bilir. |
| Administrator | Koordinatorla eyni. |

Heç bir icazə dəyişmir; təsdiq zəngi yerində qalır.

## 5. Nə dəyişmir

- **Rəqəmlər və mənaları:** API, backend, baza dəyişmir.
- **Karkas və icazələr:** sidebar 260 px, başlıq 72 px; təsdiqi yalnız Rəhbər verir.
- **Saxlanılan imkanlar:**
  - «Cəmi» sətri (faizsiz);
  - status işarələri;
  - gələcək aylar;
  - obyekt linki;
  - telefon kartları;
  - təsnif edilməyən sətirlər qeydi;
  - sifarişdən hesabata qayıdış.
- **Köhnə linklər** (`year`, `search`, `scope`) işləyir.

## 6. Qəbul meyarları

`03-ux.md` §10-da 47 meyar var (UX-01 … UX-42). Hər biri `02-requirements.md`-nin AC-01 … AC-18 meyarına bağlıdır.
`visual-qa` agenti bunları brauzerdə yoxlayacaq:
- 5 en: 1440, 1280, 1024, 768, 390;
- 3 rol: Koordinator, Rəhbər, Administrator.

## 7. Sizin qərarınızı gözləyən suallar

**S-1 · Axtarış və yuxarıdakı rəqəmlər.** Obyekt axtaranda yuxarıdakı rəqəmlər bütün obyektlər üzrə qalır, çünki server
onları belə hesablayır. Axtarışa uyğun rəqəm üçün backend dəyişməlidir, bu isə indi qadağandır.
- **A (tövsiyə):** rəqəmlər bütün obyektlər üzrə qalır, axtarış aktiv olanda ekranda bu yazılır.
- **B:** sonra, ayrıca icazənizlə backend-ə axtarışa görə cəm əlavə edilir.

**S-2a · 1280-də cədvəl yana sürüşəndə ay adları necə görünsün?** Səhifənin özü heç bir halda yana sürüşməyəcək.
- **A (tövsiyə):** aşağı sürüşəndə ay adları ekranın yuxarısında qalır və aylarla birlikdə yana hərəkət edir. Altında
  nazik sürüşmə zolağı olur.
- **B:** cədvəlin öz qutusu və öz sürüşməsi olur. Bu daha sadədir, amma səhifədə iki sürüşmə yaranır.
- **C:** ay adları yuxarıda qalmır. Əvvəl bildirdiyiniz nasazlıq geri qayıdır.
- **D:** aylar hissə-hissə göstərilir. Bu halda il bir ekranda görünmür.

**S-2b · 1280-də rəqəmlərin ölçüsü.** Hər iki halda 1440 və daha geniş ekranda 12 ay görünür, rəqəmlər 12 px olur.
- **11 px (tövsiyə):** 1280-də Yanvar–Oktyabr hamısı görünür. Hələ başlamamış Noyabr–Dekabr sağda qalır. Qiyməti:
  rəqəmlər bu gündən bir az kiçik və incədir, məhsulun «rəqəm ən azı 12 px» qaydasından istisnadır.
- **12 px:** rəqəmlər bu günkü ölçüyə yaxındır. Qiyməti: 1280-də ~10 ay görünür, Yanvar üçün cədvəli sola sürüşdürmək
  lazımdır.

Tövsiyənin səbəbi: bu hesabatın mənası ilin panoramasıdır.

**S-3 · Cədvəldə ✓ (təsdiqlənib) hansı rəngdə olsun?** Bu gün xanadakı status rəngli kiçik nöqtədir. V2-də nöqtə
məhsulun öz işarəsinə çevrilir: ✓ təsdiqlənib, ⏳ təsdiq gözləyir, ↩ düzəliş tələb olunur.
- **Boz (tövsiyə):** bu cədvəldə yaşıl yalnız «xərc azalıb» deməkdir.
- **Yaşıl:** məhsulun başqa yerlərindəki kimi.

Paneldəki status nişanı hər halda yaşıldır.

**S-4 · Yuxarıdakı rəqəmlərin altında daimi cümlə olsunmu?** Hesabat təsdiqlənməmiş sifarişləri də sayır (bu gün
Oktyabrın 24 sifarişi). Təklif olunan cümlə: «Təsdiqlənməmiş sifarişlər də daxildir; təsdiq gözləyənlər cədvəldə ⏳ ilə
işarələnib.»

**Ortaq koda aid 3 kiçik bənd** (`06-implementation.md` §4). Hamısını yalnız bu səhifə işlədir; təsdiqlənməsə, eyni
görünüş yerli kodla yazılır.
1. `ScopeSelector`-un görünüşü yenilənir.
2. Yeni `SegmentedControl` komponenti yaradılır.
3. Yeni düymə stilləri (`buttonClass`) yaradılır.

## 8. Təsdiqdən sonra

İş `06-implementation.md`-dəki A–E mərhələləri ilə gedir. Hər mərhələnin sonunda build, bütün testlər və brauzerdə
yoxlama olur. Commit sizin icazənizlə edilir. Push və deploy yalnız siz desəniz.

## 9. Tənqidin qalan qeydləri

Bunlar sizin qərarınızı tələb etmir. Hamısı icrada bağlanır (`06-implementation.md` §2a).

- **Klaviatura:** başlıqdakı sıralama düyməsinə Tab ilə qayıdanda düymə üzən başlığın altında qalmamalıdır (DK-26).
- **Sürüşmə zolağı:** nazik sürüşmə zolağı Tab ilə fokus almamalıdır (DK-27).
- **Testlər:** üç test yeni yolla yazılır: xana → panel → «Sifarişə bax».
- **⏳ işarəsi:** cümlənin içində rəngli emoji kimi görünməməlidir.
- **11 px ölçüsü** (S-2b-də seçilsə): tokenlərdə yoxdur, ona görə şərhli yerli istisna kimi yazılır.

**V2-yə daxil olmayanlar** (`06-implementation.md` §5): bütün dialoqlarda «Bağla» düyməsinin telefonda böyüdülməsi,
sifariş səhifəsinin xanalarının ortaq fayla çıxarılması və başqa kiçik kontrast düzəlişləri. Bunlar sonra ayrıca təklif
olunacaq.
