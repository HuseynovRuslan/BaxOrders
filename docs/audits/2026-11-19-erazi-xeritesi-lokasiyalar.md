# Ərazilər xəritəsi — lokasiyalar və maliyyə uyğunlaşdırması (2026-11-19)

İcraçı prototip (`frontend/bax-orders-web/prototypes/executive`), `/xerite`. Bu sənəd xəritənin hansı məlumata
söykəndiyini, nəyin yoxlandığını və nəyin sahibin cavabını gözlədiyini qeyd edir. Məbləğ yoxdur: rəqəmlər real
məlumatdan (`public/data/real-data.json`, git-də deyil) ekranda hesablanır.

## 1. Lokasiya mənbəyi

| | |
| --- | --- |
| Sahibin faylı | `BaxOrders_Area_Locations_Final_49.xlsx`, «Areas» cədvəli |
| JSON ixracı | `docs/BaxOrders_Areas_48.txt` (adı .txt, içi JSON) |
| Proqramdakı nüsxə | `prototypes/executive/src/data/areaLocations.json` — ixracla bayt-bayt eynidir |
| Oxuyan kod | `src/data/areaLocations.ts` (yoxlayır, tiplə verir) |
| İdxal skripti | `scripts/import_area_locations.mjs` |

**Yeniləmə qaydası** (`frontend/bax-orders-web` qovluğundan):

1. «Areas» cədvəlini eyni sxemlə JSON kimi ixrac edin.
2. `node prototypes/executive/scripts/import_area_locations.mjs <ixrac.json>` — skript yalnız icazəli sahələri
   saxlayır (record_id, ad, koordinatlar, map_url, area_manager, status, confidence, duplicate_group,
   review_issue_ids, baxorders_area_id); başqa sütun (nəzarətçi, anbardar, telefon, mesaj) atılır və adı çəkilir.
   Təkrarlanan ID, rəqəm olmayan və ya Azərbaycandan kənar koordinat olan faylı qəbul etmir.
3. Yoxlamaq üçün: eyni əmr `--check` ilə (heç nə yazmır).
4. Testlər: `npx vitest run --config prototypes/executive/vitest.config.ts`.

## 2. Lokasiyaların yoxlanışı

- **48 qeyd**, 48 unikal `record_id` (LOC-0001 … LOC-0049). **LOC-0025 yoxdur** — sahib silib; bərpa edilmir.
- **LOC-0049** — «Aeroport yolu», ərazi rəhbəri **Məmmədov Nizami**.
- Bütün koordinatlar rəqəmdir, Azərbaycan hüdudundadır, mənbədəki dəqiqliklə saxlanılır (heç biri yuvarlaqlaşdırılmayıb,
  geokodlanmayıb, yerindən oynadılmayıb).
- Statuslar saxlanılır: 41 `VERIFIED`; 4 `NEEDS_REVIEW` (LOC-0009, LOC-0018, LOC-0031, LOC-0047);
  3 `POSSIBLE_DUPLICATE` (LOC-0014, LOC-0020, LOC-0026). Xəritədə bunların nöqtəsi kəsik xətli və «!» işarəlidir,
  paneldə «Koordinat yoxlanılmalıdır» / «Ehtimal olunan dublikat» yazılır.
- Xəritədə **47 nöqtə** var. LOC-0014 sahibin qərarı ilə gizlədilib, onun yerini LOC-0020 göstərir (bölmə 5).
  Mənbədə 48 qeydin hamısı qalır.
- İnsanlardan yalnız `area_manager` («Ərazi rəhbəri») göstərilir. Faylda başqa şəxs sahəsi yoxdur.

## 3. Maliyyə uyğunlaşdırması

Lokasiya faylında `baxorders_area_id` boşdur — maliyyə əlaqəsini o təsdiqləmir. Sifariş Excel-i öz adlarını işlədir
(«H.Ə.M», «F.M»), cari məlumatda **36 obyekt** var. Əlaqə `src/data/areaFinanceLinks.ts`-də əl ilə, hər sətir öz
sübutu ilə yazılıb; oxşar ad, rəhbər və ya məsafə ilə heç nə uyğunlaşdırılmır.

**Əhatə: 48 lokasiyadan 17-si, 36 obyektdən 17-si.** Hər obyekt bir nöqtəyə bağlıdır (bir obyekt bir neçə nöqtəyə
bağlansa, kod məbləği hər cəmdə bir dəfə sayır və paneldə bunu yazır).

| Lokasiya | Ad | Excel obyekti | Sübut |
| --- | --- | --- | --- |
| LOC-0024 | Heydər Əliyev Mərkəzi | H.Ə.M | sahibin cavabı CB-08 |
| LOC-0026 | Bakı Konqres Mərkəzi | B.K.M | sahibin cavabı CB-07 |
| LOC-0046 | Fəvvarələr meydanı | F.M | sahibin cavabı CB-06 |
| LOC-0037 | Puşkin parkı | Puşkin | sahibin cavabı CB-01 |
| LOC-0034 | Parlament parkı | Parlament | sahibin cavabı CB-02 |
| LOC-0035 | Xətai parkı | Xətai | məlumatla əsaslandırılıb DB-04 (nəticə B, aktiv) |
| LOC-0033 | Zabitlər parkı | Zabitlər | məlumatla əsaslandırılıb DB-04 (nəticə B, aktiv) |
| LOC-0049 | Aeroport yolu | Aeroport yolu | eyni ad |
| LOC-0040 | Balaxanı | Balaxanı | eyni ad |
| LOC-0021 | Pirşağı | Pirşağı | eyni ad |
| LOC-0028 | Ramana | Ramana | eyni ad (məhsulda RAMANA) |
| LOC-0023 | Əmircan | Əmircan | eyni ad (məhsulda EMIRCAN) |
| LOC-0029 | Bayıl yolu | Bayıl yolu | eyni ad, CB-38 |
| LOC-0032 | Novxanı | Novxanı | eyni ad, CB-38 |
| LOC-0038 | Muzey Mərkəzi | Muzey Mərkəzi | eyni ad, CB-38 |
| LOC-0047 | ADNSU | ADNSU | eyni ad, CB-38 |
| LOC-0048 | İDEA | İDEA | eyni ad, CB-38 |

CB-/DB- nömrələri `docs/business-decisions.md`-dədir.

### Sahibin təsdiqini gözləyən namizədlər (9 lokasiya, 8 obyekt) — məbləğ göstərilmir

| Lokasiya | Ad | Ehtimal olunan Excel obyekti | Sual |
| --- | --- | --- | --- |
| LOC-0039 | Nərimanov heykəli parkı | Nərimanov Heykəli | CB-03 adı «Nərimanov heykəli» təsdiqləyir; «parkı» əlavəsi ilə eyni obyektdirmi? |
| LOC-0042 | Konservatoriya parkı | Milli Konservatoriya qarşısı | CB-04-ün adı ilə eyni obyektdirmi? |
| LOC-0036 | Axundov bağı | Axundov | eyni obyektdirmi? |
| LOC-0041 | Dədə Qorqud parkı | Dədə Qorqud | eyni obyektdirmi? |
| LOC-0043 | Space park | Space Tv qarşısı | eyni obyektdirmi? |
| LOC-0030 | Qafur Məmmədov parkı | Qafur Məmmədov | DB-04 bunu ilk Excel-də bir obyekt saymışdı, düzəldilmiş Excel-də uzun ad yoxdur (nəticə C) |
| LOC-0018, LOC-0031 | Bibiheybət məscidi / qəsəbəsi | Bibiheybət | bir obyekt, iki nöqtə: hansına, yoxsa hər ikisinə? |
| LOC-0022 | Qala anbarı | Qala baza | CB-39: «Qala baza» həm obyekt, həm təchizatçıdır; eyni yerdirmi? |

Təsdiqlənən namizəd `FINANCE_LINK_CANDIDATES`-dən `FINANCE_LINKS`-ə keçirilir (sübutu ilə), sonra testlər işlədilir.

### Namizədi olmayan lokasiyalar (22)

LOC-0001 İzmir parkı ətrafı · LOC-0002 MQU Universiteti · LOC-0003 Qubernator parkı · LOC-0004 Şəlalə parkı ·
LOC-0005 Dağüstü park · LOC-0006 Filarmoniya parkı · LOC-0007 Atatürk parkı · LOC-0008 Yasamal parkı · LOC-0009 FOND ·
LOC-0010 Müasir İncəsənət Muzeyi · LOC-0011 Niyazi parkı · LOC-0012 Fəxri xiyaban 1 · LOC-0013 Fəxri xiyaban 2 ·
LOC-0014 və LOC-0020 Vətəndaş Qəbulu Mərkəzi · LOC-0015 Nazirlər Kabineti Qarajı · LOC-0016 Prezident Aparatı ·
LOC-0017 Ulduz Qonaq Evi · LOC-0019 Nazirlər Kabineti · LOC-0027 Bayıl — Azərbaycan Su İdmanı Federasiyası ·
LOC-0044 Fikrət Əmirov · LOC-0045 APİ parkı.

Bu nöqtələr xəritədə, siyahıda və paneldə adları, rəhbərləri və xəritə linki ilə görünür; maliyyə yerində
«Maliyyə məlumatları hələ uyğunlaşdırılmayıb» yazılır, «0 ₼» yox. Bəziləri (məsələn, «Hökümət evi və ətrafı
parklar» obyektinin parkları) bir Excel obyektinin hissəsi ola bilər — bunu yalnız sahib deyə bilər.

### Heç bir nöqtəyə bağlanmayan Excel obyektləri (cari məlumatda 19)

Ağır Cinayətlərin qarşısı, Axundov, Azpetrol Baza, Bibiheybət, Bülbül, Çadır, Dədə Qorqud, EXPO, Gəncə şəhəri,
Hökumət evi (Parad), Hökümət evi və ətrafı parklar, Kəlbəcər, Milli Konservatoriya qarşısı, Nərimanov Heykəli,
Qafur Məmmədov, Qala baza, Qara Qarayev, Space Tv qarşısı, Təmir Tikinti.

Onların məbləği xəritə səhifəsinin icmalında «Xəritəyə bağlanmayan N obyekt» sətrində və açılan siyahıda göstərilir
(hər biri illik ekrana keçid ilə), beləliklə dövrün ümumi məbləği tam qalır.

## 4. Dublikat və keyfiyyət qeydləri

- **DUP-01**: LOC-0014 və LOC-0020 — eyni ad («Azərbaycan Respublikası Prezident Administrasiyasının Vətəndaş Qəbulu
  Mərkəzi»), eyni rəhbər, nöqtələr ~72 m aralı. **Sahib 19 noyabr 2026-da bunun eyni ərazi olduğunu təsdiqlədi və bir
  nöqtə istədi** (`docs/BaxOrders_Map_UI_Fixes_2026_11_19.txt`, Fix 2). Bax: bölmə 5.
- **DUP-02**: yalnız LOC-0026-da var; bu ixracda qrupun ikinci qeydi yoxdur. Qrupun hələ lazım olub-olmadığını sahib
  deyə bilər.
- **Rəhbər adının yazılışı**: LOC-0008-də «Rəhman Quliyev», digər 19 qeyddə «Quliyev Rəhman». Eyni şəxsdirsə,
  mənbədə düzəldilməlidir; indi «Ərazi rəhbəri» filtrində iki ayrı ad kimi görünür (proqram adları birləşdirmir).
- **Yaxın nöqtələr**: LOC-0011 Niyazi parkı və LOC-0016 Prezident Aparatı ~28 m; LOC-0004 və LOC-0019 ~89 m.
  Uzaq miqyasda bir dairədə toplanırlar; dairəyə klik yaxınlaşdırır, yaxınlaşdırmaq mümkün olmayanda (və ya sağ
  klikdə) qeydləri seçmək üçün siyahı açır.
- İki rəhbərli qeydlər: LOC-0024 (Arazov Eldar; Mirzəxanlı Çingiz), LOC-0046 (İbrahimov Xəyal; Babayev Əbülfəz) —
  hər ikisi göstərilir.

## 5. Gizlədilən təkrar qeyd (19 noyabr 2026)

| | Göstərilir | Gizlədilib |
| --- | --- | --- |
| Qeyd | **LOC-0020** | LOC-0014 |
| Koordinat (mənbədəki kimi) | 40.413206, 49.8546377 | 40.41383743286133, 49.85444259643555 |
| Etibarlılıq | HIGH | MEDIUM |
| Yoxlama qeydləri | NR-002, NR-012 | NR-002, NR-010, NR-012 |
| Status, qrup | POSSIBLE_DUPLICATE, DUP-01 | POSSIBLE_DUPLICATE, DUP-01 |

- **Niyə LOC-0020:** etibarlılığı HIGH-dır. Layihədə LOC-0014-ün xeyrinə daha güclü sübut yoxdur.
- **Nə gizlədilir:** LOC-0014 yalnız xəritədən, siyahıdan, axtarışdan və analitikadan çıxarılıb.
- **Nə dəyişmir:**
  - qeyd `areaLocations.json`-da və `AREA_LOCATIONS`-da olduğu kimi qalır, bütün dəqiqliyi ilə;
  - heç nə silinməyib, birləşdirilməyib, koordinat yerindən oynadılmayıb;
  - LOC-0020-nin mənbə statusu (POSSIBLE_DUPLICATE) dəyişmir.
- **Harada yazılıb:** `prototypes/executive/src/data/locationVisibility.ts`, `HIDDEN_DUPLICATES` cədvəli: bir sətir,
  sübutu və tarixi ilə. Sətri silsəniz, iki nöqtə geri qayıdır.
- **Sətir yalnız şərtlər ödənəndə tətbiq olunur:**
  - hər iki qeyd mənbədədir;
  - eyni qrupdadır və eyni adlıdır;
  - göstərilən qeyd özü gizlədilməyib;
  - gizlədilən qeydin maliyyə sətri yoxdur.
- **Şərt pozulsa:** sətir tətbiq olunmur, iki nöqtə də görünür, xəritə səhifəsi səbəbi yazır.
- **Saylar:** mənbədə 48 qeyd, xəritədə **47 nöqtə**.
  - Xəritənin sayğacı «47 lokasiya» göstərir, üstünə gələndə izahı çıxır.
  - İcmal kartı «Mənbədə 48 qeyd; 1 təkrar qeyd ayrıca göstərilmir (LOC-0014 → LOC-0020)» yazır.
  - «Yoxlanılmalı» sayı 7-dən 6-ya enir.
  - Namizədi olmayan lokasiyalar xəritədə 21-dir (bölmə 3-dəki 22 qeyddən biri LOC-0014-dür).
- **Maliyyə:** dəyişmir. 17 bağlantı və 9 namizəd göstərilən qeydlərə aiddir, LOC-0014-ün maliyyə sətri yoxdur. Heç bir
  məbləğ iki dəfə sayılmır, heç biri itmir.
- **Köhnə linklər:** `?erazi=LOC-0014` LOC-0020-ni açır və ünvanı LOC-0020-yə düzəldir. Axtarışda «LOC-0014» yazanda da
  LOC-0020 tapılır.
- **Paneldə:** LOC-0020-nin «Qeyd və mənbə» hissəsində «Təkrar qeyd: LOC-0014» sətri, onun koordinatları və sahibin qərarı
  göstərilir.
- **Digər POSSIBLE_DUPLICATE qeyd** (LOC-0026, DUP-02) bu qərara daxil deyil: göstərilir.
