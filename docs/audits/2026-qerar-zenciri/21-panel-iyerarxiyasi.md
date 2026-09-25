# 21 — Panel iyerarxiyasının və baza əhatəsinin əl ilə yoxlanışı (Task 21, Panel iyerarxiyası və baza əhatəsi)

Bu fayl Task 21-in brauzerdə yoxlanılan hissəsidir. Onu operator aparır. **Coder brauzerdə heç bir yoxlama aparmayıb:**
Coder-in brauzeri yoxdur. Aşağıdakı hər nəticə sətri boşdur və operator doldurur.

**Başlamazdan əvvəl API yenidən başladılmalıdır.** Kartların sırası (E-16) backend-də düzəlib
(`src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs`:399). Köhnə kodla işləyən API faiz
kartlarını əvvəlki kimi — pula görə — sıralayır. Qalan yoxlamalar yalnız yeni frontend-i tələb edir, amma hamısını
yenidən başladılmış API ilə aparın. Heç bir miqrasiya yoxdur.

Nə yoxlanılır (`AI_WORKFLOW/BRIEFS/TASK-21.md`; qərarlar 21.1, 21.2, 21.2a, 21.3, 21.4, 21.5):

- diqqət kartında **ən böyük rəqəm dəyişmədir**; cari məbləğ kiçik, növbəti sətirdə, «Bu ay» adı ilə; faiz kartında
  faiz aparıcıdır, mütləq fərq onun yanındadır;
- xülasə kartında ayın **həqiqi məcmusu** baş rəqəm olaraq qalır; onun altında, ayrıca blokda, adlandırılmış kohort:
  «Müqayisə olunan N obyekt · baza», sonra «Bu ay · Baza · Fərq · %»; faiz yalnız bu blokdadır; beş bazada və obyekt
  kənarda qalsa da, qalmasa da quruluş eynidir;
- «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» baş rəqəmin altında görünən sətirdə yazılır;
- bazası natamam olan, dəyişməsi göstərilən obyektin kartında, cədvəl sətrində və telefon sətrində «Baza N/M ay» boz
  (slate) rəngdə yazılır; heç yerdə «təxmini» yoxdur; faiz dəyişmir;
- kartların sırası: ən böyük artım, ikinci, ən böyük azalma, ikinci, **ən böyük faiz**, ikinci faiz, sonra xəbərdarlıq
  kartları;
- heç bir rəqəm, qərar 9.1-in rəngləri və «xərc artıb / azalıb» cümləsi dəyişməyib; materiallıq həddi qoyulmayıb.

Hər ünvan, düymə və sətir yanında onun götürüldüyü fayl göstərilib. Frontend faylları `frontend/bax-orders-web/src/`
qovluğundadır; aşağıda bu ön hissə yazılmır.

## Harada aparılır

- **Real sistem, yalnız oxuma** (`http://localhost:5173`). Bu dəstdə heç bir yazma düyməsi basılmır: «Təsdiqlə»,
  «Düzəliş tələb et», «Redaktə et», «Sil» və başqaları. Bazanı dəyişən düymələr, çiplər və kartlar yalnız ekranın
  oxunuşunu və ünvanı dəyişir; heç nə saxlanılmır.
- Paneli aça bilən hesabla aparılır (Rəhbər və ya Admin).
- **Panel — `<PANEL>`.** «İdarəetmə paneli», dövr «Sentyabr 2026», baza «Keçən ay»: `/dashboard?period=2026-09&basis=last`.
  Yoxlama başqa baza istəmirsə, hər yoxlamaya bu ünvanla başlayın.
- **Beş baza.** Ünvandakı `basis=` hissəsi: `last` («Keçən ay»), `avg3` («Son 3 ayın ortalaması»), `avg6` («Son 6
  ayın ortalaması»), `all` («Bütün dövrün ortalaması»), `custom` («Xüsusi seçim»). «Xüsusi seçim» üçün başlanğıc və son
  ayı özünüz seçin və ünvandakı `from=` və `to=` dəyərlərini `Qeyd:` sətrinə yazın.
- **Bazası natamam obyektlər — `<QİSMƏN>`.** `basis=avg6`-da «Məlumatın əhatəsi» cərgəsindəki «Müqayisə üçün data
  azdır» çipinə klik edin: cədvəl yalnız bu obyektləri göstərir. Onlardan dəyişməsi (fərqi) olan ən azı üçünü seçin və
  adlarını E-11-in `Qeyd:` sətrinə yazın. Çipi yenidən klik edib söndürün.

## En və ekran şəkilləri

- Hər yoxlama dörd endə aparılır: `1366×768 · 1440×900 · 390×844 · 1200×800`. `En:` sətrinə hansı endə aparıldığını
  yazın. Cədvəl `1024` pikseldən enlidə görünür; `390×844`-də onun yerinə telefon siyahısı var (E-13-ə baxın).
- `1366×768`-də E-18-də ekranın ilk görünüşünə (sürüşdürmədən) neçə diqqət kartının sığdığını yazın: rəqəm dəyişikliyi
  kartın hündürlüyünə təsir edir.
- Şəkil adı: `<ID>-<ekran>-<en>.png`, məsələn `E-01-panel-1440.png`. Şəkillər `docs/audits/2026-qerar-zenciri/ekranlar/`
  qovluğuna qoyulur. Qovluq yoxdursa, onu yaradın.

## Sətrin forması

Hər yoxlama `docs/audits/2026-final-enver-muellim-audit/02-yoxlama-siyahisi.md`-dəki on iki sətirlik formadadır:

```
### <ID> — <qısa başlıq>
Mənbə: <brief faylı + bölmə>, sitat: "<bənd, sözbəsöz>"
Harada: <real / sınaq> · <ekran> · <ünvan və ya menyu yolu> · <en(lər)>
Addımlar: <nömrələnmiş addımlar>
Gözlənilən: <brief-in və ya spesifikasiyanın dediyi>
İlk auditdə: <UX auditinin qeyd etdiyi; yoxdursa «brief qeyd etmir»>
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
```

- Ayırıcı sətir məhz belə yazılır: `---- operator doldurur ----`. Onun yuxarısındakı mətni dəyişməyin.
- Heç bir sahəni boş buraxmayın. Yoxlamanı apara bilmədinizsə, `Hökm:` sətrinə «yoxlanıla bilmədi» yazın və
  mötərizədə səbəbini göstərin.
- «Ünvan sətri» brauzerin yuxarısındakı ünvandır. `basis=` onun `?`-dan sonrakı hissəsindədir.
- «Üç saniyəlik oxunuş»: səhifəni açın, karta üç saniyə baxın, sonra gözünüzün ilk olaraq hansı rəqəmə düşdüyünü yazın.
  Bu, operatorun müşahidəsidir; brief bunun üçün ölçü vermir.
- Rəqəmləri ekranda gördüyünüz kimi, nöqtə və vergüllə yazın (`+23.852,70 ₼`).

---

## Yoxlamalar

### E-01 — «Keçən ay»: «Ən böyük məbləğ artımı» kartında ən böyük rəqəm dəyişmədir, «Bu ay» növbəti sətirdədir
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 1-ci bənd, sitat: "Sentyabr 2026, Keçən ay: "Ən böyük məbləğ artımı" kartında ən böyük rəqəm `+23.852,70 ₼`-dır; `35.837,72 ₼` ondan kiçik, ikinci sətirdədir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Diqqət tələb edən obyektlər» · `<PANEL>`; dəyişmə sətri (`components/dashboard/AttentionSection.tsx`:191–195), «Bu ay» sətri (:198–202), ölçülər (:50–51) · dörd en
Addımlar: 1) `<PANEL>` açın; 2) «Ən böyük məbləğ artımı» kartına üç saniyə baxın və gözünüzün ilk düşdüyü rəqəmi yazın; 3) kartdakı rəqəmləri yuxarıdan aşağı, sətir-sətir yazın (obyekt adından sonra); 4) hansı rəqəmin ən böyük şriftlə yazıldığını yazın; 5) «Bu ay» sözünün harada olduğunu və yanındakı məbləğin rəngini yazın.
Gözlənilən: 2-ci və 4-cü addımda ən böyük rəqəm `+23.852,70 ₼`-dır. 3-cü addımda sıra belədir: birinci sətirdə böyük `+23.852,70 ₼` və yanında kiçik `+199,02%`; ikinci sətirdə kiçik boz «Bu ay» və tünd (rəngsiz) `35.837,72 ₼`; üçüncü sətirdə «Keçən aya görə xərc artıb». Obyekt Heydər Əliyev Mərkəzidir.
İlk auditdə: cari məbləğ böyük (24px), dəyişmə isə kiçik (14px) yazılırdı; göz əvvəlcə məbləği tuturdu (`BRIEFS/TASK-21.md`, «Problem», birincisi)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-02 — Kartda dəyişmə və faiz fərqli ölçüdədir, ikisi də 9.1-in rəngindədir, cümlə yerindədir
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 7-ci bənd, sitat: "Heç bir məbləğ, fərq və faiz dəyişmir; qərar 9.1-in rəngləri və "xərc artıb / azalıb" sözləri yerində qalır."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartları · `<PANEL>`; ton (`components/dashboard/AttentionSection.tsx`:191), istiqamət cümləsi (:204) · dörd en
Addımlar: 1) `<PANEL>` açın; 2) hər artım kartında dəyişmənin və faizin ölçüsünü (hansı böyük, hansı kiçik) və rəngini yazın; 3) hər azalma kartında eyni şeyi yazın; 4) fərqi olan hər kartda «Keçən aya görə xərc artıb» və ya «… azalıb» cümləsinin olub-olmadığını yazın; 5) «Bu ay» məbləğinin rəngini yazın.
Gözlənilən: 2-ci addımda dəyişmə böyük, faiz kiçikdir; ikisi də qırmızıdır. 3-cü addımda ikisi də yaşıldır. 4-cü addımda fərqi olan hər kartda cümlə var. 5-ci addımda «Bu ay» məbləği tünd boz/qaradır, qırmızı və ya yaşıl deyil.
İlk auditdə: dəyişmə və faiz bir sətirdə, eyni ölçüdə və eyni rəngdə idi (`TASKS/TASK-21.md`, §2.1)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-03 — Üç saniyəlik oxunuş «Son 3 ayın ortalaması» və «Son 6 ayın ortalaması» bazalarında
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 21.1, sitat: "Diqqət kartında ən böyük rəqəm **dəyişmədir**. Cari məbləğ ikinci sətirdə, kiçik yazılır. Kartın orada olma səbəbi dəyişmədir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartları · `/dashboard?period=2026-09&basis=avg3`, sonra `…&basis=avg6`; kart (`components/dashboard/AttentionSection.tsx`:174–207) · dörd en
Addımlar: 1) `basis=avg3` açın; 2) birinci kartə üç saniyə baxın və gözünüzün ilk düşdüyü rəqəmi yazın; 3) hər kartda ən böyük şriftli rəqəmi yazın; 4) `basis=avg6` ilə 1–3-cü addımları təkrarlayın.
Gözlənilən: hər bazada, dəyişməsi olan hər kartda ən böyük rəqəm dəyişmədir (faiz kartında — faiz); cari məbləğ «Bu ay» adı ilə növbəti sətirdə, kiçikdir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-04 — Üç saniyəlik oxunuş «Bütün dövrün ortalaması» və «Xüsusi seçim» bazalarında
Mənbə: `BRIEFS/TASK-21.md`, «Tələb», 1-ci bənd, sitat: "Diqqət kartında ən böyük rəqəm dəyişmə olsun; cari məbləğ kiçik, ikinci sətirdə."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartları · `/dashboard?period=2026-09&basis=all`, sonra «Xüsusi seçim» (`basis=custom&from=…&to=…`); kart (`components/dashboard/AttentionSection.tsx`:174–207) · dörd en
Addımlar: 1) `basis=all` açın; 2) birinci kartə üç saniyə baxın və gözünüzün ilk düşdüyü rəqəmi yazın; 3) hər kartda ən böyük şriftli rəqəmi yazın; 4) «Xüsusi seçim»-i seçin, iki ay seçin, ünvanı yazın və 2–3-cü addımları təkrarlayın.
Gözlənilən: E-03-dəki kimi: dəyişməsi olan hər kartda ən böyük rəqəm dəyişmədir (faiz kartında — faiz); «Bu ay» növbəti sətirdədir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-05 — Xülasə kartı, «Keçən ay»: məcmu baş rəqəmdir, kohort ayrıca blokda adlandırılıb, faiz blokun içindədir
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 2-ci bənd, sitat: "Xülasə kartında `71.210,29 ₼` baş rəqəm olaraq qalır; kohortun `71.030,25 ₼`, `+26.689,47 ₼` və `+60,19%`-i ayrıca, adlandırılmış sətirdədir; ikisi qarışdırılmır."
Harada: real (yalnız oxuma) · İdarəetmə paneli, yuxarıdakı xülasə kartı · `<PANEL>`; baş rəqəm (`components/dashboard/DashboardSummary.tsx`:86–88), kohort bloku (:139–187) · dörd en
Addımlar: 1) `<PANEL>` açın; 2) xülasə kartının sol hissəsini yuxarıdan aşağı, sətir-sətir yazın; 3) baş rəqəmin yanında və ya dərhal altında rəngli rəqəm və ya faiz olub-olmadığını yazın; 4) faizin hansı sətirdə, hansı sözün yanında olduğunu yazın; 5) `390×844`-də sətirlər bir neçə sətrə keçəndə hər sözün öz rəqəminin yanında qalıb-qalmadığını yazın.
Gözlənilən: 2-ci addımda: «Sentyabr 2026 sifarişlərinin məbləği ⓘ»; `71.210,29 ₼` (böyük); «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» (E-09); nazik xətt; «Müqayisə olunan 23 obyekt · Keçən ay (Avqust 2026) ⓘ»; «Bu ay 71.030,25 ₼   Baza 44.340,78 ₼   Fərq +26.689,47 ₼ · +60,19%»; «Keçən aya görə xərc artıb»; «Müqayisəyə daxil deyil: EXPO Center (bu ay 180,04 ₼) — keçən ay sifarişi yoxdur». 3-cü addımda yoxdur. 4-cü addımda faiz «Fərq» sətrindədir, xəttin altındakı blokda. 5-ci addımda «Bu ay», «Baza», «Fərq» öz rəqəmlərindən ayrılmır.
İlk auditdə: `71.210,29 ₼` böyük, altında kiçik «Müqayisə olunan 23 obyekt: 71.030,25 ₼» yazılırdı; faiz ikincidən hesablanırdı, rəhbər isə birincini yadda saxlayırdı (`BRIEFS/TASK-21.md`, «Problem», ikincisi)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-06 — Xülasə kartının quruluşu beş bazada eynidir
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 21.2a, 3-cü bənd, sitat: "Faiz **həmişə vizual olaraq kohort müqayisəsinə** aiddir, heç vaxt baş rəqəmə."
Harada: real (yalnız oxuma) · İdarəetmə paneli, xülasə kartı · beş baza (`last`, `avg3`, `avg6`, `all`, `custom`); kohort bloku (`components/dashboard/DashboardSummary.tsx`:139–187) · `1440×900` (qalan enlərdə yalnız 2-ci addım)
Addımlar: 1) hər bazanı növbə ilə açın; 2) hər bazada xülasə kartının sol hissəsinin sətirlərinin sırasını yazın (rəqəmləri də); 3) «Müqayisəyə daxil deyil: …» sətrinin hansı bazalarda olduğunu yazın; 4) beş bazanı müqayisə edin: fərq yalnız baza sözlərində, rəqəmlərdə və «Müqayisəyə daxil deyil» / «Qiyməti olmayan sətirlər …» sətirlərindədirmi?
Gözlənilən: hər bazada eyni sıra: başlıq sətri, baş rəqəm (`71.210,29 ₼`, bütün bazalarda eyni), qiymət sətri (əgər varsa), xətt, «Müqayisə olunan N obyekt · <baza>», «Bu ay … Baza … Fərq … · …%», istiqamət cümləsi, (əgər varsa) «Müqayisəyə daxil deyil». Faiz heç bir bazada baş rəqəmin yanında deyil.
İlk auditdə: «Keçən ay»-da bir forma, «Son 3 ay»-da başqa forma görünürdü; kod bazaya deyil, obyektin kənarda qalıb-qalmamasına görə budaqlanırdı (`TASKS/TASK-21.md`, §2.2)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-07 — Heç bir obyekt kənarda qalmayanda da kohort adlandırılır; «Bu ay» baş rəqəmə bərabərdir
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 21.2a, 4-cü bənd, sitat: "Real aylıq məcmu kohort məbləği ilə əvəz edilmir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, xülasə kartı · `/dashboard?period=2026-09&basis=avg3` (E-06-da «Müqayisəyə daxil deyil» sətri olmayan istənilən baza da olar); kohort bloku (`components/dashboard/DashboardSummary.tsx`:151–175) · `1440×900`, `390×844`
Addımlar: 1) E-06-da «Müqayisəyə daxil deyil» sətri olmayan bazanı açın (belə baza yoxdursa, Hökm: «yoxlanıla bilmədi (hər bazada obyekt kənarda qalır)»); 2) baş rəqəmi yazın; 3) kohort blokunun birinci sətrini və «Bu ay» rəqəmini yazın; 4) ikisini müqayisə edin.
Gözlənilən: kohort bloku yenə var və adlandırılıb: «Müqayisə olunan N obyekt · <baza>». Hər obyekt müqayisə olunubsa, «Bu ay» rəqəmi baş rəqəmə bərabərdir; bərabər deyilsə, fərqi və səbəbini (məsələn, sistemdə ilk sifarişi bu ay olan obyekt) `Qeyd:`-də yazın. Baş rəqəm heç vaxt kohortun rəqəmi ilə əvəz olunmur.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-08 — Xülasə kartının sağ hissəsi və cədvəlin yekun sətri dəyişməyib
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 21.2a, 5-ci bənd, sitat: "Heç bir rəqəm yenidən hesablanmır və dəyişdirilmir."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Bu ay sifariş olan obyektlər» kartı və cədvəlin yekun sətri · `<PANEL>`; sağ kart (`components/dashboard/DashboardSummary.tsx`:108–127), yekun sətri (`components/dashboard/LocationRows.tsx`:169–202) · `1440×900`
Addımlar: 1) `<PANEL>` açın; 2) sağdakı «Bu ay sifariş olan obyektlər» kartını yazın; 3) cədvələ qədər sürüşdürün və yekun sətrinin rəqəmlərini yazın; 4) yekun sətrinin rəqəmlərini E-05-dəki kohort blokunun rəqəmləri ilə müqayisə edin.
Gözlənilən: 2-ci addımda «24 / 27» və altındakı cümlə əvvəlki kimidir. 3-cü addımda «Müqayisə olunan 23 obyekt», `71.030,25 ₼`, `44.340,78 ₼`, `+26.689,47 ₼`, `+60,19%`, altında «Bütün sifarişlər (24 obyekt): 71.210,29 ₼». 4-cü addımda rəqəmlər eynidir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-09 — «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» klik etmədən görünür
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 3-cü bənd, sitat: "Qiyməti olmayan sətirlərin daxil olmaması görünən sətirdə yazılıb, kliklə açılan ikonda deyil."
Harada: real (yalnız oxuma) · İdarəetmə paneli, xülasə kartı · `<PANEL>`; görünən sətir (`components/dashboard/DashboardSummary.tsx`:94–96), ⓘ (:73), narıncı düymə (:76–84) · dörd en
Addımlar: 1) `<PANEL>` açın; heç nəyə klik etməyin; 2) baş rəqəmin dərhal altındakı sətri və onun rəngini yazın; 3) başlıq sətrindəki narıncı «10 obyektin sifarişində qiyməti olmayan sətir var» düyməsinin yerində olub-olmadığını yazın; 4) başlığın yanındakı ⓘ-yə klik edin və açılan qeydi yazın; 5) narıncı düyməyə klik edin və cədvəlin nəyi göstərdiyini yazın, sonra «Filtri təmizlə» basın.
Gözlənilən: 2-ci addımda baş rəqəmin altında narıncı, kiçik şriftlə «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» yazılıb. 3-cü addımda düymə yerindədir, sözləri eynidir. 4-cü addımda ⓘ eyni cümləni göstərir. 5-ci addımda cədvəl qiyməti olmayan obyektlərə süzülür (Task 09-un davranışı).
İlk auditdə: qiyməti olmayan sətirlərin daxil olmadığı yalnız kiçik ikonu kliklədikdə görünürdü (`BRIEFS/TASK-21.md`, «Problem», ikincisi)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-10 — Qiyməti olmayan sətir yoxdursa, həmin sətir də yoxdur
Mənbə: `TASKS/TASK-21.md`, §9, 5-ci meyar, sitat: "It is absent when nothing is missing, including a month whose only unpriced lines are internal supply."
Harada: real (yalnız oxuma) · İdarəetmə paneli, xülasə kartı · dövr seçicisində narıncı «… qiyməti olmayan sətir var» düyməsi olmayan ay; şərt (`components/dashboard/DashboardSummary.tsx`:94) · `1440×900`
Addımlar: 1) dövr seçicisindən ayları növbə ilə seçin və başlıq sətrində narıncı düymə olmayan bir ay tapın; ayın adını yazın; 2) həmin ayda baş rəqəmin altında «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» sətrinin olub-olmadığını yazın; 3) ⓘ-yə klik edin və qeydi yazın. Belə ay yoxdursa, Hökm: «yoxlanıla bilmədi (hər ayda qiyməti olmayan sətir var)».
Gözlənilən: 2-ci addımda sətir yoxdur (sıfır kimi də yazılmır); baş rəqəmin altında birbaşa xətt və kohort bloku gəlir. 3-cü addımda ⓘ qaydanı yenə eyni sözlərlə izah edir. Yalnız şirkətdaxili təminat olan sətirlər bu sətri çıxarmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-11 — «Son 6 ayın ortalaması»: bazası natamam obyektin kartında «Baza N/6 ay»
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 4-cü bənd, sitat: "Baza "Son 6 ayın ortalaması" seçilir → bazası natamam olan hər obyektin kartında və sətrində "Baza N/6 ay" görünür; heç yerdə "təxmini" sözü yoxdur."
Harada: real (yalnız oxuma) · İdarəetmə paneli, diqqət kartları · `/dashboard?period=2026-09&basis=avg6`; kart (`components/dashboard/AttentionSection.tsx`:194), söz (`coverage/labels.ts`:202–215) · dörd en
Addımlar: 1) `basis=avg6` açın; 2) hər diqqət kartında dəyişmə sətrinin sonunda «Baza N/6 ay» olub-olmadığını, varsa N-i və rəngini yazın; 3) «Baza N/6 ay» olan kartlardan birinin obyektini açın (karta klik) və sifariş səhifəsinin başlığındakı natamam baza sətrini («(N/6 ay · Çatışmayan: …)») yazın; «geri» basın; 4) «Baza …» yazılmayan kartların obyektləri üçün cədvəldə «Məlumat vəziyyəti» sütununu yazın.
Gözlənilən: 2-ci addımda bazası natamam və dəyişməsi olan hər kartda dəyişmə sətrinin sonunda boz (qırmızı, yaşıl və ya narıncı deyil), kiçik «Baza N/6 ay» var; N obyektin özünündür. 3-cü addımda sifariş səhifəsindəki N eynidir. 4-cü addımda «Baza …» olmayan kartların bazası tamdır (sütunda heç nə yazılmır) və ya bazası yoxdur. Faizlər əvvəlki kimidir.
İlk auditdə: «Son 6 ay» seçiləndə müqayisə olunan 24 obyektdən 16-sında baza natamam idi, amma kartlarda `+186,85%` heç bir qeyd olmadan yazılırdı (`BRIEFS/TASK-21.md`, «Problem», üçüncüsü)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-12 — «Son 6 ayın ortalaması»: cədvəlin «Dəyişmə» xanasında «Baza N/6 ay», yalnız bazası natamam sətirlərdə
Mənbə: `BRIEFS/OWNER_BRIEFS_MASTER.md`, qərar 21.3, sitat: "Zəif tarixçə faizi "təxmini" adlandırılmır. Hesablama mövcud data üçün dəqiqdir. Əvəzinə faktiki əhatə yazılır: **"Baza 2/6 ay"**."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Bütün obyektlər» cədvəli · `/dashboard?period=2026-09&basis=avg6`; «Dəyişmə» xanası (`components/dashboard/LocationRows.tsx`:145, :357–360), «Məlumat vəziyyəti» (:341–343) · `1366×768`, `1440×900`, `1200×800` (`390×844`-də cədvəl yoxdur — orada E-13)
Addımlar: 1) `basis=avg6` açın və cədvələ qədər sürüşdürün; 2) `<QİSMƏN>` obyektlərinin (ən azı üç) «Dəyişmə» xanasını yuxarıdan aşağı yazın: fərq, faiz, üçüncü sətir; 3) həmin sətirlərin «Məlumat vəziyyəti» sütununu yazın; 4) bazası tam olan bir sətrin, «Müqayisə bazası yoxdur» yazılan bir sətrin və «Sifariş qeydə alınmayıb» yazılan bir sətrin «Dəyişmə» xanasını yazın.
Gözlənilən: 2-ci addımda xana üç sətirdir: fərq (qırmızı/yaşıl), faiz (qırmızı/yaşıl), boz «Baza N/6 ay». 3-cü addımda «Müqayisə üçün data azdır» əvvəlki kimi yazılır. 4-cü addımda heç birində «Baza …» yoxdur (bazası tam sətirdə fərq və faiz, qalan ikisində «—»).
İlk auditdə: «Əhatə» çipi 16 obyekti sayırdı, amma heç bir kart və sətir bu sayı göstərmirdi (`TASKS/TASK-21.md`, §2.4)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-13 — Telefonda: sətirdə fərqin altında «Baza N/6 ay»
Mənbə: `BRIEFS/TASK-21.md`, «Tələb», 4-cü bənd, sitat: "Bazası natamam olan obyektin kartında və sətrində faktiki əhatə yazılsın: **"Baza 2/6 ay"**."
Harada: real (yalnız oxuma) · İdarəetmə paneli, telefon siyahısı · `/dashboard?period=2026-09&basis=avg6`; telefon sətri (`components/dashboard/LocationRows.tsx`:239) · `390×844`
Addımlar: 1) brauzerin cihaz rejimində `390×844` seçin; 2) `basis=avg6` açın və obyektlər siyahısına qədər sürüşdürün; 3) `<QİSMƏN>` obyektlərinin (ən azı üç) sağ tərəfindəki rəqəmləri yuxarıdan aşağı yazın; 4) bazası tam olan bir sətrin sağ tərəfini yazın; 5) diqqət kartlarına qayıdın və «Baza N/6 ay»-ın dəyişmə sətrinin sonunda sığıb-sığmadığını, yoxsa növbəti sətrə keçdiyini yazın.
Gözlənilən: 3-cü addımda: məbləğ; fərq və faiz; boz «Baza N/6 ay»; bazanın adı («Son 6 ayın ortalaması»). N E-11 və E-12-dəki ilə eynidir. 4-cü addımda «Baza …» yoxdur. 5-ci addımda «Baza N/6 ay» sətrə sığmırsa növbəti sətrə keçə bilər; rəqəmlər bir-birindən qırılmır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-14 — Heç yerdə «təxmini» yoxdur; faizlər dəyişməyib
Mənbə: `BRIEFS/TASK-21.md`, «Tələb», 4-cü bənd, sitat: "Faiz "təxmini" adlandırılmasın — hesablama mövcud data üçün dəqiqdir."
Harada: real (yalnız oxuma) · İdarəetmə paneli · beş baza; kart (`components/dashboard/AttentionSection.tsx`:191–195), cədvəl (`components/dashboard/LocationRows.tsx`:132–148) · `1440×900`, `390×844`
Addımlar: 1) hər bazanı növbə ilə açın; 2) hər bazada `Ctrl+F` ilə səhifədə «təxmini», sonra «təqribi» axtarın; tapılanların sayını yazın; 3) `basis=avg6`-da «Baza N/6 ay» olan bir kartın faizini yazın və həmin obyektin sifariş səhifəsindəki faizlə müqayisə edin; 4) faizin boz, solğun və ya gizli olub-olmadığını yazın.
Gözlənilən: 2-ci addımda hər bazada 0 nəticə. 3-cü addımda faizlər eynidir. 4-cü addımda faiz qırmızı/yaşıldır, tam görünür, heç bir qeydlə yumşaldılmayıb; yanındakı «Baza N/6 ay» yalnız faktdır.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-15 — Faiz kartında faiz aparıcıdır, mütləq fərq yanındadır, «Bu ay» altındadır
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 5-ci bənd, sitat: "Faiz kartında mütləq fərq də yazılıb (məsələn `1.830,40 ₼` obyekt üçün `+1.514,82 ₼` və `+480,01%` birlikdə)."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Ən böyük faiz dəyişməsi» / «İkinci ən böyük faiz dəyişməsi» kartları · beş baza; kart (`components/dashboard/AttentionSection.tsx`:154, :181) · dörd en
Addımlar: 1) beş bazada növbə ilə faiz kartlarını tapın; «Milli Konservatoriya qarşısı» kartının hansı bazada olduğunu yazın (heç birində yoxdursa, `Qeyd:`-də bunu yazın və 2–3-cü addımları istənilən faiz kartında edin); 2) həmin kartda ən böyük rəqəmi, yanındakı rəqəmi və növbəti sətri yazın; 3) iki rəqəmin rəngini yazın.
Gözlənilən: 2-ci addımda ən böyük rəqəm `+480,01%`-dir, yanında kiçik `+1.514,82 ₼`, növbəti sətirdə «Bu ay 1.830,40 ₼». 3-cü addımda ikisi də eyni rəngdədir (artım — qırmızı). Heç bir faiz kartı gizlədilməyib və heç bir hədd qoyulmayıb (qərar 21.5).
İlk auditdə: faiz kartında böyük faiz kiçik məbləğli obyektdən gəlirdi, amma rəhbər bunu qiymətləndirə bilmirdi (`BRIEFS/TASK-21.md`, «Tələb», 5-ci bənd)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-16 — Kartların sırası: «Ən böyük faiz dəyişməsi» «İkinci ən böyük faiz dəyişməsi»-dən əvvəldir (API yenidən başladılıb)
Mənbə: `BRIEFS/TASK-21.md`, «Qəbul», 6-cı bənd, sitat: "Kartların sırası: ən böyük artım, ikinci, ən böyük azalma, ikinci, **ən böyük faiz**, ikinci ən böyük faiz."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Diqqət tələb edən obyektlər» · beş baza; sıra (`src/BaxOrders.Application/Analytics/Dashboard/ManagementDashboardQueries.cs`:392–400) · `1440×900` (qalan enlərdə yalnız 2-ci addım)
Addımlar: 1) API-nin bu commit-lə yenidən başladıldığını təsdiqləyin (başladılmayıbsa, Hökm: «yoxlanıla bilmədi (API köhnə koddadır)»); 2) hər bazada kartların başlıqlarını ekrandakı sıra ilə (soldan sağa, yuxarıdan aşağı) yazın; 3) iki faiz kartı olan bazada hər iki kartın faizini və fərqini yazın.
Gözlənilən: hər bazada sıra: «Ən böyük məbləğ artımı», «İkinci ən böyük məbləğ artımı», «Ən böyük məbləğ azalması», «İkinci ən böyük məbləğ azalması», «Ən böyük faiz dəyişməsi», «İkinci ən böyük faiz dəyişməsi», sonra «Qiymət yoxdur» və «Müqayisə bazası yoxdur» (olmayanlar sadəcə atlanır). 3-cü addımda birinci faiz kartının faizi ikincininkindən böyükdür — hansının daha çox pul hərəkət etdirdiyindən asılı olmayaraq. Obyektlərin hansı kartda olduğu dəyişməyib.
İlk auditdə: «İkinci ən böyük faiz dəyişməsi» «Ən böyük faiz dəyişməsi»-dən əvvəl gəlirdi (`BRIEFS/TASK-21.md`, «Problem», dördüncüsü)
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-17 — Bazası olmayan obyekt: məbləğ ən böyük rəqəmdir, izahı yerindədir, «Bu ay» yoxdur
Mənbə: `TASKS/TASK-21.md`, §9, 9-cu meyar, sitat: "An object with no baseline still shows its current amount as the largest figure, with its existing explanation."
Harada: real (yalnız oxuma) · İdarəetmə paneli, «Müqayisə bazası yoxdur» kartı · `<PANEL>`; kart (`components/dashboard/AttentionSection.tsx`:142–150) · dörd en
Addımlar: 1) `<PANEL>` açın; 2) «Müqayisə bazası yoxdur» başlıqlı kartı tapın (EXPO Center olmalıdır); yoxdursa, başqa bazalarda axtarın və bazanı yazın; 3) kartdakı rəqəmləri və cümlələri yuxarıdan aşağı yazın; 4) ən böyük rəqəmi yazın.
Gözlənilən: 3-cü addımda: obyekt adı; böyük `180,04 ₼` (rəngsiz); «Müqayisə üçün əvvəlki ay yoxdur». «Bu ay» sözü, faiz və «Baza …» yoxdur. 4-cü addımda ən böyük rəqəm məbləğdir.
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:

### E-18 — İlk ekrana sığan kartlar; kart və sətir əvvəlki kimi açılır; heç bir rəqəm dəyişməyib
Mənbə: `BRIEFS/TASK-21.md`, «Toxunulmayanlar», sitat: "Hər rəqəm. Kartların hansı obyekti seçməsi (Task 09). Qərar 9.1-in rəngləri **və sözləri**"
Harada: real (yalnız oxuma) · İdarəetmə paneli, sifariş səhifəsi · `<PANEL>`, karta klikdən sonra açılan `/orders/<nömrə>?basis=last`; kartın səthi (`components/dashboard/AttentionSection.tsx`:118–122) · `1366×768` (1-ci addım), dörd en (2–5-ci addımlar)
Addımlar: 1) `1366×768`-də `<PANEL>` açın və sürüşdürmədən ekranda tam görünən diqqət kartlarının sayını yazın; Task 20 dövründən bu panelin eyni endə ekran şəkli varsa (məsələn `20-klik-affordansi.md`-nin D-15-i), oradakı sayı da yazın; yoxdursa, «əvvəlki: məlum deyil» yazın; 2) «Ən böyük məbləğ artımı» kartının «Bu ay» məbləğinə, sonra «Baza N/M ay» yazısına (varsa) adi klik edin; hər dəfə açılan səhifəni yazın və «geri» basın; 3) siçanı «Bu ay», faiz və «Baza …» üzərinə aparın və mətnin özünün dəyişib-dəyişmədiyini yazın (`390×844`-də bu addım «yoxlanıla bilmədi (kursor yoxdur)»); 4) kartda neçə keçid olduğunu yoxlayın: sağ klik menyusunda «Keçidi yeni vərəqdə aç» yalnız obyekt adında çıxırmı; 5) açılan sifariş səhifəsinin başlığındakı «Baza» və «Fərq» rəqəmlərini kartdakı rəqəmlərlə müqayisə edin.
Gözlənilən: 1-ci addımda say yazılıb (brief say tələb etmir; bu, kart hündürlüyünün dəyişdiyini qeydə almaq üçündür). 2-ci addımda hər klik həmin obyektin sifarişini açır, «geri» karta qaytarır. 3-cü addımda mətnin özü dəyişmir, yalnız kartın fonu və çərçivəsi (Task 20). 4-cü addımda kartda bir keçid var — obyektin adı. 5-ci addımda fərq və faiz eynidir (Task 1).
İlk auditdə: brief qeyd etmir
---- operator doldurur ----
Göründü:
Rəqəm:
En:
Ekran şəkli:
Hökm: keçdi / keçmədi / yoxlanıla bilmədi (səbəb)
Qeyd:
