# 04 — Vizual dizayn: UI V2 «Aylıq hesabat»

**Tarix:** 2026-10-15 · **Mərhələ:** 4 — Vizual dizayn (`AI_WORKFLOW/DESIGN_WORKFLOW.md`) · **Kim:** `ux-architect`
**Revizyon 1 (2026-10-15):** `04-critique.md`-yə cavab olaraq yenilənmiş `03-ux.md` ilə uyğunlaşdırılıb (DK-ID-lər
mətndə; tam siyahı `03-ux.md` §12).
**Əsaslanır:** `03-ux.md` (axın, yerləşmə, vəziyyətlər, ölçülmüş enlər), `01-audit.md` §2 və §6 (Figma və onun
xətaları), `02-requirements.md`, `04-critique.md`, D-50, D-S1, D-F3, D-V1…D-V2, D-V5,
`frontend/bax-orders-web/src/index.css` (tokenlər). **Tətbiqin kodu dəyişməyib.**

> **TƏSDİQLƏNDİ — D-51 (2026-10-16).** S-2b = **12 px** (E rədd edildi): bu sənəddə «E», «11 px», «68 / 98 / 84»
> deyilən hər yer **qüvvədə deyil**; qüvvədə olan ölçülər — ay sütunu Yığcam 74 px, Standart 106 px, il 88 px, obyekt
> 120 px, rəqəmlər 12 px. S-3: cədvəldə ✓ boz. Qalan hər şey tövsiyə edildiyi kimi.

Sahibin sözü (sözbəsöz, `02-requirements.md` §1):

> İndi 1-ci mərhələyə keç: UX-i tamamla və tətbiq planını yekunlaşdır. Hələ proqram kodunu dəyişmə. Əvvəl
> nəticəni mənə təqdim et.

---

## 0. Figma və bu sənəd

- Figma bağlıdır, amma **redaktə edilmir** (W-05: Figma yalnız vizual istiqamətdir). Ona görə burada Figma linki yoxdur;
  ekranlar markdown-dadır: karkas sxemləri — `03-ux.md` §4, hər elementin tokeni — aşağıda.
- Oxunan kadrlar (fayl `rtCWL4rS03iOyhKFtGcaGh`, 2026-10-15): `10:3` «Yığcam cədvəl», `16:2` «Standart cədvəl», `17:2`
  «Detal paneli» — `get_screenshot`, `get_metadata`, `get_design_context`. Aşağıdakı Figma dəyərləri (hex, px) oradandır.
  Ekran şəkilləri real biznes məlumatı göstərir, ona görə anbara qoyulmayıb. Figma-dakı rəqəmlər məlumat deyil.
- **Ölçmə:** rəqəm və simvol enləri tətbiqin yüklədiyi Google Fonts fayllarından (Geist, Inter — `index.html:15`) və
  Windows fallback şriftlərindən (Segoe UI, Segoe UI Symbol) `fontTools` ilə ölçülüb; stock rənglər Tailwind 4.3.3-ün
  OKLCH dəyərlərindən sRGB-yə çevrilib (`04-critique.md`-nin üsulu ilə eyni).

## 1. Figma-dan nə götürülür, nə götürülmür

**Götürülən (istiqamət):** bölmələrin ritmi — kartda üç rəqəmli zolaq, aralarında xətt, altında boz meta zolağı;
etiketi üstdə olan filtr sırası; boz yolda ağ aktiv seqment; başlıqlı kartın içində cədvəl, açıq başlıq zolağı,
obyekt və il sütunlarının xətlə ayrılması, ~44 px sətir, zebra; seçilmiş sətrin və xananın vurğusu; sağ panelin
yuxarısında rəqəm qutusu; ay aralığına keçid (`← Yan–Fev · Mar–Okt · Noy–Dek →`).

| Figma | Qərar | Niyə |
|---|---|---|
| Palitra: `#2563eb`, `#111d33`, `#f4f7fb`, `#15253d`, `#687a94`, `#dfe6f0`, `#b76a0a` | `index.css` tokenləri (§2) | D-50 №4; ikinci dərəcəli mətn 4,37:1, kəhrəba 4,13:1 — 4,5:1-dən aşağı |
| Yalnız Inter | rəqəm və başlıq Geist, mətn Inter | `index.css:74-88`; Geist-in tabular rəqəmi Inter-dən dar (12 px-də 7,2 / 7,8 px) — 12 ay daha yaxşı sığır |
| Əsas rəqəm mavi, üç rəqəm 27 px bərabər | əsas 28 (`metric-val`), ikincilər 20 (`headline-md`), hamısı `on-surface` | K3 / D-50 №3; mavi (`secondary`) yalnız «bu nəsə edir» |
| Boz faiz, narıncı anomaliya nöqtəsi və faizi | faiz 9.1 rəngində (12 px); anomaliya — istiqamətin açıq fonu + ▲/▼ | D-50 №1, №2; D-F3; DK-17 |
| Status işarəsi yoxdur | məhsulun öz simvolları ✓ ⏳ ↩ (`workflowStatusSign`); Draft işarəsiz | M-07, DK-05 |
| «İlk mövcud ay» | heç nə yazılmır | audit §6.3 |
| Mərkəzə düzülmüş rəqəmlər; xanada ₼ yoxdur; «326,951.62» | sağa, `.tabular`; hər yerdə `formatMoney` «326.951,62 ₼» | D-50 əlavə; M-08 |
| Ay sütunu 106 px (1920-də) | Yığcam ≥ 74 / 68, Standart ≥ 106 / 98 — ölçülmüş enlər + ≥ 6 px boşluq | DK-07 |
| Xanada «Gələcək» sözü (2,18:1) | mətnsiz ştrix, xətlər `outline` (4,05:1) + accessible name; başlıqda ştrix zolaq | kontrast, DK-14 |
| Sidebar 220, başlıq 64, «SİFARİŞ SİSTEMİ», «İŞ SAHƏSİ» | karkas dəyişmir (260 / 72) | D-50 №4, W-02 |
| Başlığın yanında mavi il «pill»-i | götürülmür — il filtr sırasındadır | DK-22 |
| «İllik görünüş · AZN», «2026 · Məbləğlər AZN ilə», dizayn qeydləri, mavi izah zolağı | götürülmür; istəyə bağlı bir sətirlik klik ipucu | audit §6.8 |
| Əfsanə cədvəlin altında | cədvəlin üstündə, ekranda (1440-da Yığcamda bir sətir) | `03-ux.md` §9.18, DK-15 |
| «Görünür: 8 obyekt / Ümumi: 27 obyekt» (kartın altında) | «N / M obyekt» — filtrlərin altında daimi `role="status"`, hər endə | `MonthlyReportPage.tsx:128-132`; DK-03, DK-23 |
| «Qiyməti olmayan: 1 · Xərc tam deyil», «Sifariş sayı», «Obyekt sayı» | «Qiymət yoxdur», «Məbləğ tam deyil. Qiyməti olmayan sətirlər bu məbləğə daxil deyil.», «Sifariş», «Obyekt» | `pricing/labels.ts`, `format.ts:32`; DK-15 |
| — | alt xətdə rəqəmsiz statik cümlə «Təsdiqlənməmiş sifarişlər də daxildir; …» | DK-12 — sahibin sualı S-4 |
| «Obyekt axtarışı» etiketi | «Obyekt axtar» | mövcud accessible name; WCAG 2.5.3 |
| «✓ Yığcam cədvəl» | «Yığcam» / «Standart» (✓-siz) | tapşırıq bu iki sözə icazə verir |
| «Obyektlər üzrə aylıq xərclər» | «Obyektlər üzrə aylıq sifariş məbləğləri» | mövcud caption mətni; «Aylıq sifarişlər» növündə «xərc» yox, tələb oxunur |
| «↶ Sıfırla» filtrlərin ortasında | «↺ Sıfırla» (`RotateCcw`) sıranın sonunda, yeri həmişə ayrılmış | DK-16 |
| «Sifariş detalları» başlığı, mavi «2026 / İyun / …» | başlıq — obyektin adı; alt sətir — «İyun 2026 · Aylıq sifarişlər» | dialoqun dəqiq adı; mavi link deyil |
| Paneldə «İlkin sifariş detalları mövcud deyil» və qeydlər | sifarişin real sətirləri (cavabdeh şəxs ilə) | audit §6.1; DK-24 |
| «Qeyri-adi artım · +235.89%», «Niyə işarələnib?» | iki ayrı adlı müqayisə + qayda qutusu | audit §6.2 |
| «Bütün əlaqəli sifarişlərə bax ↗» (mavi, tam en) | «Sifarişə bax» (əsas) + «Obyektin sifarişləri»; telefonda + «Bağla» | audit §6.10; DK-10 |
| Açıq örtük `#dce3ee` 27%, panel 530 px | `Drawer`-in ortaq örtüyü və eni 560 px | 19.1; ortaq komponent |
| «Esc · Paneli bağla · Seçilmiş xana saxlanılır» | götürülmür | standart davranış |

## 2. Token xəritəsi: Figma → `index.css`

### 2.1 Rənglər

| Figma | Harada | Token / sinif | Qeyd |
|---|---|---|---|
| `#ffffff` | kart, sahə, panel, ağ seqment | `surface-container-lowest` | |
| `#f4f7fb` | səhifə fonu | karkasın `#f5f5f3`-ü qalır | W-02 |
| `#f8fafd` | meta zolağı, cədvəl başlığı | `surface-container-low` `#f0f4f8` | |
| `#f8fafd` | zebra | `surface` `#f6fafe` | |
| `#f0f3f8` | gələcək ay | `surface-container-low` + **`outline`** ştrix xətləri | 4,05:1 ≥ 3:1 (DK-14) |
| `#e8edf5` | seqment yolu | `surface-container` `#eaeef2` | |
| `#dfe6f0` | kart kənarı, bölücülər, sabit sütun xətti | `outline-variant` `#c5c6ce` | dekorativ |
| `#dfe6f0` | sətir xətləri | `surface-container-high` `#e4e9ed` | 27 sətir ağır tor olmasın |
| — | sahə (input / select) kənarı | `outline` `#75777e` | idarəetmə sərhədi ≥ 3:1 (4,47:1) |
| `#15253d` | əsas mətn, rəqəm | `on-surface` `#171c1f` | 17,2:1 |
| `#687a94` | ikinci dərəcəli mətn, «—» | `on-surface-variant` `#45474d` | 9,3:1 (Figma 4,37) |
| `#2563eb` | əsas rəqəm, aktiv seqment, seçilmiş ad, düymə | işlənmir: rəqəm `on-surface`; aktiv seqment `on-surface` + `ring-outline`; seçim `primary` halqa; düymə `primary` | `secondary` bu ekranda yoxdur |
| `#eff5ff` | seçilmiş sətir | `surface-container-low` | onun üstündə yaşıl faiz 4,86:1 |
| `#dce9ff` | seçilmiş xana | 2 px `ring-primary`, xananın öz fonu qalır | `primary-fixed` fonu yaşıl faizi 4,15:1-ə salardı |
| `#b76a0a` | xəbərdarlıq | `warningToneClass` (`amber-800` `#973c00`, 7,1:1) | ortaq, token yoxdur (§7) |
| `#b76a0a` | anomaliya | götürülmür → 9.1 | D-50 №1 |
| — | xərc artdı / azaldı | `costDirection*`: mətn `red-700` `#c10007` / `emerald-700` `#007a55`; fon `red-50` / `emerald-50` + `ring-*-200`; bar `red-500` / `emerald-500` | ortaq 9.1 köməkçiləri; `cost-up` / `cost-down` tokenlərinə keçid — W-04 |
| — | status simvolları | ✓ `on-surface-variant` (S-3: və ya `emerald-700`); ⏳ `sky-700` `#0069a8`; ↩ `amber-800` | §4; rənglər `StatusMark`-da yerli sabit |
| — | fokus, seçilmiş halqa, əsas düymə | `primary` `#08162f`; düymənin mətni `on-primary` | 18:1 |
| `#dce3ee` 27% | panelin örtüyü | `Drawer`-in ortaq örtüyü (`bg-slate-900/20`) | 19.1 |

### 2.2 Ölçü və boşluq (DK-07, DK-15, DK-20)

| Figma | V2 | Token / sinif |
|---|---|---|
| zolağın daxili boşluğu 23–24 | 24 (`≥ 1440`), 20 (1024–1439 və planşet), 16 (telefon) | `p-space-lg` / `p-5` / `p-4` |
| bölmələr arası 16–20 | 16 | `gap-space-md` / `mt-space-md` |
| filtr sahələri arası 19–20 | 16 | `gap-space-md` |
| etiket → sahə 6 | 6 | `mb-1.5` |
| sahə hündürlüyü 38 | 40; `lg`-dən aşağı 44 | `h-10` / `h-11` |
| seqment 30 | 32; toxunmada 44 | `h-8` / `h-11` |
| meta zolağı 35 | 36 (dar endə bükülür) | `min-h-9` |
| cədvəl başlığı 40 | 40; üzən surət 40 + 12 (sinxron zolaq, yalnız qutu sürüşəndə) | `h-10`, `h-3` |
| sətir 44 | **45** hər iki baxışda: link `py-1` 4 + 18 + 2 + 16 + 4 = 44, + 1 px sətir xətti (E-də 1440-dan aşağı: 4 + 16 + 2 + 16 + 4 = 42 → `min-h-11` 44 + 1) | `min-h-11` linkdə |
| obyekt sütunu 230 | **120**, `px-2` (mətn sahəsi 104 — adlar ≤ 2 sətir) | `w-[7.5rem]` |
| il sütunu ~132 | **88** (12 px) / **84** (E) — yarımqalın altırəqəmli il cəmi + 8 | `w-[5.5rem]` / `w-[5.25rem]` |
| ay sütunu 106 (1920-də) | Yığcam ≥ **74** (12 px) / **68** (E); Standart ≥ **106** / **98** — qalan eni bərabər bölürlər | `table-fixed` + `min-w` |
| xananın üfüqi boşluğu (iki səviyyə idi) | **bir səviyyə:** `td` 0, link `px-1` | DK-07 |
| cədvəlin `min-w` (çərçivəsiz) | Yığcam 1096 / 1020 (E, 1440-dan aşağı); Standart 1480 / 1380 | qutunun daxili eni B ilə müqayisə (`03-ux.md` §4.1) |
| panel 530, daxili 30 | 560, daxili 16 | `Drawer` (ortaq) |

### 2.3 Radius, kənar, kölgə

| Element | Figma | V2 |
|---|---|---|
| Kart (zolaq, cədvəl, telefon kartı, paneldə rəqəm qutusu) | 9–10 | `rounded-lg` (8) |
| Sahə, seqment yolu, düymə | 7 | `rounded-md` (6) |
| Seqment, xananın linki, seçim / fokus halqası | 5 | `rounded` (4) |
| Kart kənarı | 1 px `#dfe6f0` | 1 px `outline-variant`, kölgəsiz |
| Sabit sütunun daxili kənarı | 1 px | 1 px `outline-variant` |
| «Cəmi» sətri | — | yuxarıda 2 px `outline-variant` |
| Üzən başlıq | — | `shadow-sm` (mövcud 1-ci səviyyə) + alt 1 px `outline-variant` |
| Panel | — | `Drawer`-in ortaq kölgəsi |

Yeni kölgə səviyyəsi yoxdur; dərinlik ton və 1 px xətdən gəlir (`index.css:166-173`).

## 3. Tipoqrafiya

**Qayda:** diakritikli mətndə sətir hündürlüyü ≥ 1,4 × ölçü. **Tapıntı:** `index.css:90-93` hamısının ≥ 1,4 olduğunu
deyir, amma `body-sm` 12/16 = 1,33, `label-md` 13/18 = 1,38, `headline-lg` 24/32 = 1,33, `display-lg` 32/40 = 1,25,
`metric-val` 28/32 = 1,14. Bu ekran mətndə sətir hündürlüyünü açıq yazır (`*`); yalnız rəqəm, ₼ və simvol olan yerdə
(diakritik yoxdur) tokenin və ya 16 px-lik sətir hündürlüyü qalır.

**Şrift faktları:** Geist yalnız 400, 600, 700, 800 çəkilərində yüklənir — 500 (`font-medium`) Geist-də 400 kimi
çıxır, ona görə Geist rəqəmləri 400 və ya 600-dür. Geist-in Google Fonts dəstlərində ₼ yoxdur — ₼ növbəti şriftdən
gəlir (Windows-da Segoe UI, 12 px-də 9,1–9,7 px); idarəetmə panelinin təsdiqlənmiş rəqəmlərində bu gün də belədir.
✓ ⏳ ↩ ▲ ▼ ⚠ simvolları Geist / Inter-də yoxdur — Segoe UI Symbol-dan gəlir.

| Rol | Token / sinif | Ölçü / sətir | Qalınlıq | Şrift | Rəng |
|---|---|---|---|---|---|
| Səhifə başlığı | `PageHeader` (ortaq; yalnız `title`) | 24/32 | 600 | ortaq | ortaq |
| Zolağın etiketləri | `text-label-md` | 13/19* | 500 | Inter | `on-surface-variant` |
| Əsas rəqəm | `font-metric-val text-metric-val` | 28/32 | 700 | Geist, `.tabular` | `on-surface` |
| İkinci rəqəmlər | `font-headline-md text-headline-md` | 20/28 | 600 | Geist, `.tabular` | `on-surface` |
| Alt xətt (sayğaclar, cümlələr) | `text-body-sm` | 12/18* | 500; dəyər 600 | Inter | `on-surface-variant`; dəyər `on-surface`; xəbərdarlıq `amber-800` |
| Filtr etiketləri, «N / M obyekt» | `text-body-sm` | 12/18* | 500 / 400 | Inter | `on-surface-variant` |
| Sahə, select | `text-body-md` | 14/20 | 400 | Inter | `on-surface` |
| Seqment | `text-body-sm` | 12/18* | 500; aktiv 600 | Inter | `on-surface-variant`; aktiv `on-surface` |
| Cədvəl kartının başlığı (`h2`) | `font-headline-sm text-headline-sm` | 16/24 | 600 | Geist | `on-surface` |
| Əfsanə | `text-body-sm` | 12/18* | 400 | Inter (simvollar Segoe UI Symbol) | `on-surface-variant`; simvol öz rəngində |
| Sütun başlıqları | `text-body-sm` | 12/18* | 500; aktiv sıra 600 | Inter | `on-surface-variant`; aktiv `on-surface` |
| Obyektin adı | `text-body-sm` | 12/18* | 500; seçilmişdə 600 | Inter | `on-surface` |
| Xananın məbləği | `text-body-sm` (E-də 1024–1439 px-də `text-[11px]`) | 12/18 (E: 11/16) | **400** — qeyri-adidə də | Geist, `.tabular` | `on-surface` |
| İşarə sətri: status, ⚠ N, ▲/▼, Standartda faiz | `text-body-sm` (E-də 1024–1439 px-də `text-[11px]`) | 12/16 (E: 11/16) — yalnız rəqəm və simvol | faiz 400, ⚠ N 600 | Geist `.tabular`; simvollar Segoe UI Symbol | 9.1 / `amber-800` / status rəngi |
| İl sütunu | `text-body-sm` (E: 11 px) | 12/18 (E: 11/16) | 600 | Geist, `.tabular` | `on-surface` |
| «Cəmi» sətri | `text-body-sm` | 12/18 | rəqəmlər **400**; «Cəmi» sözü 600 | Geist / Inter | `on-surface` |
| Panelin başlığı | `Modal` (ortaq) | 14/20 | 500 | ortaq | ortaq |
| Paneldə növün məbləği | `font-metric-val text-metric-val` | 28/32 | 700 | Geist, `.tabular` | `on-surface` |
| Paneldə etiket (`dt`) | `text-label-md` | 13/19* | 500 | Inter | `on-surface-variant` |
| Paneldə faiz | `font-headline-sm text-headline-sm` | 16/24 | 600 | Geist, `.tabular` | 9.1 rəngi |
| Paneldə mətn, sətrin adı, sətrin cəmi | `text-body-md` | 14/20 | 400 / 500 / 600 | Inter / Geist `.tabular` | `on-surface` |
| Paneldə `h3` («Sifariş», «Sətirlər») | `font-headline-sm text-headline-sm` | 16/24 | 600 | Geist | `on-surface` |
| Sətrin təfərrüatı, cavabdeh | `text-body-sm` | 12/18* | 400 | Inter | `on-surface-variant` |
| Düymələr | `text-body-md` | 14/20 | 500 | Inter | §5.8 |

`label-sm` (11/14, böyük hərfli qısa etiket) bu ekranda işlənmir (DK-17). Rəqəmlər 12 px-dir; yeganə istisna — sahib
E-ni seçərsə, 1024–1439 px-də cədvəlin rəqəmləri bu günkü kimi 11 px.

## 4. Rəngin mənası və kontrast

### 4.1 Bir rəng — bir məna

| Rəng | Bu ekranda nə deməkdir | Harada |
|---|---|---|
| Qırmızı (`red-700`, açıq fon `red-50`) | xərc artıb (9.1) | Standartın faizi, ▲, qeyri-adi fon, paneldə faiz və qutu, kartın zolağında bar |
| Yaşıl (`emerald-700`, `emerald-50`) | xərc azalıb (9.1) | eyni yerlər, ▼; ✓ yaşıl seçilsə (S-3) — status da |
| Kəhrəba (`amber-800`) | xəbərdarlıq: qiymət yoxdur; sifariş düzəlişə qaytarılıb | ⚠ N, ↩, təsnifat qeydi |
| Göy (`sky-700`) | təsdiq gözləyir | ⏳ |
| Neytral (`on-surface-variant`, `outline`) | norma və yoxluq: təsdiqlənib (S-3 tövsiyəsi), sifariş yoxdur, gələcək ay | ✓, «—», ştrix |
| Navy (`primary`) | struktur və hərəkət: fokus, seçilmiş xana, əsas düymə | |
| Mavi (`secondary`) | bu ekranda işlənmir | — |

✓-in rəngi sahibin sualıdır (S-3): neytral ✓ cədvəldə yaşılı yalnız «xərc azalıb» üçün saxlayır; yaşıl ✓ məhsulun
qalanı ilə (və paneldəki `OrderStatusBadge` ilə) eynidir.

### 4.2 Kontrast (WCAG 2.1; Tailwind 4 dəyərləri ilə hesablanıb)

| Ön plan | Fon | Nisbət | Hədd | |
|---|---|---|---|---|
| `on-surface` | ağ / `surface` / `surface-container-low` / `surface-container` | 17,2 / 16,4 / 15,5 / 14,7 | 4,5 | ✓ |
| `on-surface-variant` (mətn, «—», neytral ✓) | ağ / `surface-container-low` / `surface-container` / `red-50` | 9,3 / 8,4 / 8,0 / 8,5 | 4,5 | ✓ |
| `outline` (mətn kimi) | ağ | 4,47 | 4,5 | ✗ — mətn üçün işlənmir |
| `outline` (ştrix xətti, sahə kənarı, aktiv seqment halqası) | `surface-container-low` / ağ / `surface-container` | 4,05 / 4,47 / 3,83 | 3 | ✓ |
| `outline-variant` (köhnə ştrix xətti) | `surface-container-low` | 1,54 | 3 | ✗ — işlənmir (DK-14) |
| `red-700` (faiz, ▲) | ağ / `red-50` / `surface-container` / `emerald-50` | 6,4 / 5,9 / 5,5 / 6,1 | 4,5 | ✓ |
| `emerald-700` (faiz, ▼; S-3-də ✓) | ağ / `emerald-50` / `surface` / `surface-container-low` / `surface-container` (hover) | 5,4 / 5,1 / 5,1 / 4,9 / 4,6 | 4,5 | ✓ |
| `emerald-700` | `primary-fixed` / `surface-container-high` | 4,2 / 4,4 | 4,5 | ✗ — bu fonlar yaşıl mətnin altında işlənmir |
| `amber-800` (⚠ N, ↩) | ağ / `surface-container` / `surface-container-high` / `red-50` | 7,1 / 6,1 / 5,8 / 6,5 | 4,5 | ✓ |
| `sky-700` (⏳) | ağ / `surface` / `surface-container-high` / `red-50` | 5,9 / 5,6 / 4,8 / 5,4 | 4,5 | ✓ |
| `primary` (fokus, seçim halqası) | ağ / `red-50` / `emerald-50` | 18,0 / 16,5 / 17,1 | 3 | ✓ |
| `on-primary` | `primary` (düymə) | 18,0 | 4,5 | ✓ |
| `slate-500` (`lineToneClass` — «Daxili təminat») | ağ | 4,8 | 4,5 | ✓ |
| `slate-400` (`LineResponsibleNote` «təyin edilməyib») | ağ | 2,6 | 4,5 | ✗ — paneldə işlənmir; cavabdeh yerli, `on-surface-variant` ilə |
| Bu gün: `slate-400` (gələcək başlıq) / `slate-300` («—») | `slate-50` / ağ | 2,45 / 1,48 | 4,5 | ✗ → düzəlir |
| Figma: `#687a94` / `#b76a0a` / `#9aa8b9` | ağ / ağ / `#f0f3f8` | 4,37 / 4,13 / 2,18 | 4,5 | ✗ — götürülmür |

## 5. Komponentlərin vizual spesifikasiyası

Siniflər Tailwind 4 + `index.css` token adlarıdır; ortaq köməkçilər öz siniflərini verir (§7). «E» — sahib S-2b-də
E-ni seçərsə 1024–1439 px üçün dəyər.

### 5.1 Səhifə başlığı

`PageHeader title="Aylıq hesabat"` — açıqlamasız (eyni sözlər cədvəlin başlığındadır; 1280×800-də 24 px qazanılır),
il çipi yoxdur (DK-22). `PageHeader` dəyişmir.

### 5.2 Zolaq («İlin xülasəsi»)

- Kart: `rounded-lg border border-outline-variant bg-surface-container-lowest`.
- Rəqəmlər bloku: `grid gap-space-md p-5 min-[1440px]:p-space-lg sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]`;
  ikinci və üçüncü sütun `sm:border-l sm:border-outline-variant sm:pl-space-lg`. Telefonda `p-4`: əsas tam en, altında
  ikincilər `grid grid-cols-2 gap-space-md` (aralarında `border-l`).
- Etiket: `text-label-md leading-[19px] font-medium text-on-surface-variant` (əsasınki `h2`).
- Əsas rəqəm: `mt-1 whitespace-nowrap font-metric-val text-metric-val tabular text-on-surface`.
- İkinci rəqəm: `mt-1 whitespace-nowrap font-headline-md text-headline-md tabular text-on-surface`.
- «…» (yüklənir): `text-on-surface-variant` + `aria-busy`. Alınmayanda «—» + `text-body-sm leading-[18px]
  text-on-surface-variant` «Ümumi faktiki xərc alınmadı.» + ghost «Yenidən cəhd et» (`h-8`; `lg`-dən aşağı `h-11`, DK-19).
- `scopeNotes` (növ `OutsideMonthly` / `All`): əsasın altında `mt-1 text-body-sm leading-[18px] text-on-surface-variant`.
- Axtarış qeydi: rəqəmlər blokunun yuxarı sağında (`sm:`; telefonda rəqəmlərin altında) `text-body-sm leading-[18px]
  text-on-surface-variant` + `Info` ikonu `size-3.5`, `aria-hidden`.
- **Alt xətt** (DK-15, DK-12): `flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1 border-t border-outline-variant
  bg-surface-container-low px-5 py-2 min-[1440px]:px-space-lg text-body-sm leading-[18px] text-on-surface-variant`:
  - sayğaclar — dəyərlər `font-semibold text-on-surface tabular`;
  - qiymətsiz sətir olanda üçüncü sayğac bütövlükdə `warningToneClass font-semibold`: «⚠ Qiymət yoxdur 3 — Məbləğ tam
    deyil.» + adi çəkidə «Qiyməti olmayan sətirlər bu məbləğə daxil deyil.» (əsasın altındakı ayrıca sətir yoxdur);
  - statik cümlə (S-4) — xəttin sonunda, `text-on-surface-variant`, rəqəmsiz; ⏳ simvolu cədvəldəki rəngdə (`sky-700`).
- Təsnifat qeydi: zolağın ən altında `m-4 mt-0 rounded-md p-2 text-body-sm leading-[18px] ring-1 ring-inset` +
  `warningChipClass`.

### 5.3 Filtrlər və nəticə sayı

- Sıra: `flex flex-wrap items-end gap-space-md`; «Baxış» qrupu `ml-auto`; **«Sıfırla» sıranın sonunda**, öz eni qədər yer
  həmişə ayrılır — sıfırlanacaq heç nə yoxdursa `invisible` (`visibility: hidden`: çəkilmir, fokus almır), görünəndə heç
  bir element yerindən tərpənmir (DK-16). 1280-də (S = 17): 96 + 240 + 296 + 152 + 77 + 4 × 16 = **925 ≤ 937** — bir sıra.
- Etiket (üstdə): `mb-1.5 block text-body-sm leading-[18px] font-medium text-on-surface-variant`.
- İl və «Sıralama» select: `h-10 appearance-none rounded-md border border-outline bg-surface-container-lowest pl-3 pr-8
  text-body-md text-on-surface` + `ChevronDown size-4 text-on-surface-variant` (`pointer-events-none`); fokus `outline-2
  outline-offset-2 outline-primary`; `lg`-dən aşağı `h-11`. İl seçimi `w-24`.
- Axtarış: `h-10 w-60 min-[1440px]:w-72 rounded-md border border-outline bg-surface-container-lowest pl-9 pr-3
  text-body-md text-on-surface placeholder:text-on-surface-variant`; solda `Search size-4 text-on-surface-variant`
  (dekorativ); telefonda `w-full h-11`.
- **Seqmentli idarəetmə** («Sifariş növü» — yerində dəyişən `ScopeSelector`; «Baxış»; `SegmentedControl` təsdiqlənsə
  hər ikisi onunla): yol `inline-flex gap-1 rounded-md bg-surface-container p-1`; seqment `h-8 rounded px-3 text-body-sm
  leading-[18px] font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface`; aktiv
  `bg-surface-container-lowest font-semibold text-on-surface ring-1 ring-outline`; fokus `focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-primary`. Toxunmada: yol `p-0.5`, seqment `h-11`, telefonda
  `w-full`, seqmentlər `flex-1`; söz qısalmır («Aylıq sifarişlər» 81,8 px, seqmentin mətn sahəsi ~90 px — DK-21).
- «↺ Sıfırla»: ghost düymə (§5.8) + `RotateCcw size-4`; `title` (§6.7 `03-ux.md`).
- **Nəticə sayı** (DK-03, DK-23): filtr sırasının altında, cədvəl kartından və kartların siyahısından **kənarda** bir
  daimi element: `mt-2 empty:mt-0 text-body-sm leading-[18px] text-on-surface-variant tabular`, `role="status"` — boşdursa
  hündürlüyü 0-dır, amma DOM-da qalır; axtarışda «1 / 27 obyekt».

### 5.4 Cədvəl kartı

- Kart: `rounded-lg border border-outline-variant bg-surface-container-lowest`. **`overflow: hidden` qoyulmur** (yapışqan
  elementi tutardı); alt künclər qutuda `rounded-b-lg`.
- Başlıq hissəsi `px-space-md pt-space-md pb-3`: `h2` (cədvəlin `aria-labelledby` hədəfi) `font-headline-sm
  text-headline-sm text-on-surface`; sağda ay düymələri.
- Ay düymələri: iki ghost ikon düymə `size-8` (`ChevronLeft` / `ChevronRight`, `aria-label` «Əvvəlki aylar» / «Sonrakı
  aylar»), aralarında `text-body-sm text-on-surface-variant tabular` «Fevral–Oktyabr 2026»; deaktivdə 40%; yalnız qutu
  sürüşəndə. `scroll-mt-18`.
- Əfsanə: `mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm leading-[18px] text-on-surface-variant`; hər elementdə işarə
  ilə söz arasında `gap-1.5`; status simvolları öz rəngində; «⚠ N» `warningToneClass`; ▲ / ▼ istiqamətin açıq fonunda
  `inline-flex size-4 items-center justify-center rounded-sm` qutucuqlarda; gələcək ay — `h-3 w-4 rounded-sm ring-1
  ring-inset ring-outline-variant` + `outline` ştrix. 1440-da Yığcamda bir sətir (~1.055 / 1.065 px), 1280-də iki.
- İstəyə bağlı ipucu: əfsanənin altında `text-body-sm text-on-surface-variant`.
- Qutu: `border-t border-outline-variant overflow-x-auto rounded-b-lg [scroll-snap-type:x_proximity] scroll-pl-30
  scroll-pr-22` (E-də 1440-dan aşağı `scroll-pr-21`) — `scroll-padding-inline` = sabit sütunlar (DK-01).

### 5.5 Cədvəl

| Hissə | Sinif / ölçü |
|---|---|
| `table` | `w-full table-fixed border-separate border-spacing-0`; `min-w` §2.2; `aria-labelledby` = kartın `h2`-si; caption yoxdur |
| `colgroup` | `w-[7.5rem]` · 12 sinifsiz · `w-[5.5rem]` (E: `w-[5.25rem]`) |
| Başlıq sətri | `h-10 bg-surface-container-low border-b border-outline-variant text-body-sm leading-[18px] font-medium text-on-surface-variant`; aylar `text-right px-1`, obyekt `text-left px-2`, il `text-right px-1` |
| Sıra düyməsi (`th` içində) | `inline-flex items-center gap-1 rounded -mx-1 px-1 hover:text-on-surface scroll-mt-18`; aktiv `font-semibold text-on-surface`; ikon `size-3.5` (↕ `ChevronsUpDown`, ↓ `ArrowDown`, ↑ `ArrowUp`); defolt «Obyekt» aktivdir (`aria-sort="ascending"`) |
| Gələcək ayın başlığı | mətn `on-surface-variant` (normal); etiketin altında 4 px hündür `outline` ştrixli zolaq (`after:`), `data-future`, `title` «Oktyabr 2026: gələcək ay» |
| Üzən başlıq (Seçim A) | başlıq sətrinin eynisi + altında `h-3` sinxron zolaq (yalnız aylar sahəsi; `overflow-x-auto [scrollbar-width:thin] [scrollbar-color:var(--color-outline)_transparent]`, `aria-hidden`) + `shadow-sm`; `top-18 z-10`; bütövlükdə `aria-hidden`, düymələri `tabindex="-1"`, basılanda fokusu əsl düyməyə ötürür |
| Obyekt xanası (`th scope="row"`) | `sticky left-0 z-[1] border-r border-outline-variant px-2 py-1 text-left`; fon sətrin fonu; link `block break-words text-body-sm leading-[18px] font-medium text-on-surface hover:underline scroll-mt-31 scroll-mb-4` + fokus halqası |
| Ay xanası (`td`) | `p-0 text-right align-top border-b border-surface-container-high` |
| Xananın linki | `block min-h-11 rounded px-1 py-1 scroll-mt-31 scroll-mb-4`; hover `bg-surface-container`; fokus `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary` |
| Məbləğ | `block whitespace-nowrap font-metric-val text-body-sm leading-[18px] tabular text-on-surface` (400; qeyri-adidə də) — E: `text-[11px] leading-4 min-[1440px]:text-body-sm min-[1440px]:leading-[18px]` |
| İşarə sətri | `mt-0.5 flex items-center justify-end gap-1 text-body-sm leading-4 tabular` (E: 1024–1439 px-də `text-[11px]`); Standartda faiz burada, `costDirectionToneClass` |
| ✓ / ⏳ / ↩ | `data-status-mark`, `aria-hidden`; ✓ `text-on-surface-variant` (S-3: və ya `text-emerald-700`); ⏳ (U+23F3 + U+FE0E) `text-sky-700` — emoji kimi çıxsa `Hourglass size-3 text-sky-700`; ↩ (U+21A9 + U+FE0E) `text-amber-800`; Draft — işarə yoxdur |
| ⚠ N | `warningToneClass font-semibold` |
| ▲ / ▼ | `costDirectionToneClass(recentAveragePercent)`; Standartda məbləğin solunda `mr-1`, Yığcamda işarə sətrinin sonunda |
| Qeyri-adi xana | link `costDirectionTintClass(recentAveragePercent)`; hover-də halqa 2 px |
| Seçilmiş xana | link `ring-2 ring-inset ring-primary`; qeyri-adi xanada tint-in **fonu** qalır, tint-in halqası (`ring-1 ring-*-200`) **verilmir** — bir elementdə iki halqa sinfi olmur (DK-18) |
| Seçilmiş sətir | xanalar `bg-surface-container-low`; obyekt xanası `shadow-[inset_3px_0_0_var(--color-primary)]`, ad `font-semibold` |
| Sifarişsiz keçmiş ay | `block px-1 py-1 text-on-surface-variant` «—» |
| Gələcək ay | `block min-h-11 rounded bg-surface-container-low bg-[image:repeating-linear-gradient(135deg,transparent_0_6px,var(--color-outline)_6px_7px)]` |
| Tarixçəsiz obyekt | `colSpan=12`, `px-2 py-1 text-body-sm leading-[18px] text-on-surface-variant` |
| İl xanası | `sticky right-0 z-[1] border-l border-outline-variant bg-surface-container-low px-1 text-right`; məbləğ `font-semibold` |
| Zebra | tək sətirlər `bg-surface`; sətir hover-i `bg-surface-container-low` (bütün xanalar, sabitlər də) |
| «Cəmi» (`tfoot`) | `bg-surface-container border-t-2 border-outline-variant`; «Cəmi» / «Cəmi — bütün obyektlər» `font-semibold`; ay rəqəmləri **400**; il xanası `bg-surface-container-high font-semibold`; ⚠ işarəsi + `sr-only` cümlə (bu gün) |
| Köhnə məlumat | sarğı `opacity-60` + `inert`; sözlər `shownKey`-dən (`03-ux.md` §3.5) |
| z-qatları | tətbiq başlığı `z-20` > üzən başlıq `z-10` > `thead` künc `z-[3]` > `thead` `z-[2]` > sabit xanalar `z-[1]` |
| Sürüşmə kənarları (DK-01) | qutu `scroll-pl-30 scroll-pr-22` (120 / 88); `tbody` və `tfoot` fokuslananları `scroll-mt-31` (124 = 72 + 40 + 12); başlıq düymələri və cədvəldən yuxarıdakılar `scroll-mt-18` (72) |

### 5.6 Panel

| Hissə | Sinif / qeyd |
|---|---|
| Çərçivə, başlıq, «Bağla» (X), footer | `Drawer` (ortaq): başlıq `font-medium`, alt sətir `text-sm` boz, footer `flex justify-end gap-2 border-t` |
| Status sətri | `flex flex-wrap items-center gap-2` (`OrderStatusBadge`); altında `mt-1 text-body-sm leading-[18px] text-on-surface-variant` (`replacesEarlierOrderNote`) |
| Növün məbləği qutusu | `mt-space-md rounded-lg bg-surface-container-low p-space-md`; `dt` `text-label-md leading-[19px] font-medium text-on-surface-variant`; dəyər `mt-1 font-metric-val text-metric-val tabular text-on-surface`; qeyd `mt-1 text-body-sm leading-[18px] text-on-surface-variant` |
| Müqayisələr (`dl`) | `mt-space-md grid grid-cols-[minmax(0,1fr)_auto] gap-x-space-md gap-y-3`; `dt` `text-label-md leading-[19px] text-on-surface-variant`; `dd` `text-right`: faiz `font-headline-sm text-headline-sm tabular` + `costDirectionToneClass`, yanında manat fərqi `text-body-md tabular`; alt sətir (`col-span-2`) `text-body-sm leading-[18px] text-on-surface-variant` |
| Qeyri-adi qutusu | `col-span-2 rounded-lg p-3 text-body-md` + `costDirectionTintClass`; başlıq «▲ Qeyri-adi ay» `font-semibold`, ▲ `costDirectionToneClass`; qayda mətni `text-on-surface` |
| Tərkib (`dl`) | `mt-space-md border-t border-outline-variant pt-space-md grid grid-cols-[1fr_auto_auto] gap-x-space-md gap-y-1 text-body-md`; məbləğ və say `tabular text-right`; aktiv növ `font-semibold` |
| «Sifariş» bölməsi | `mt-space-lg border-t border-outline-variant pt-space-md`; `h3` `font-headline-sm text-headline-sm text-on-surface`; «Bütün sifarişin məbləği» sətri tərkib kimi (növ `All`-da yoxdur, DK-11); qiymətsizlik **öz sətrində** `warningToneClass text-body-sm` «⚠ 1 sətirdə qiymət yoxdur.» + `text-on-surface-variant` izah |
| «Sətirlər» başlığı | `mt-space-md flex items-center justify-between`; `h3` + say `text-body-sm text-on-surface-variant`; select §5.3 (`h-9`; telefonda `h-11`) |
| Sətir siyahısı | `mt-2 divide-y divide-surface-container-high`; `li` `py-3` |
| Sətrin 1-ci xətti | `flex items-start gap-3`: nömrə `w-6 shrink-0 text-body-sm text-on-surface-variant tabular`; ad `min-w-0 flex-1 break-words text-body-md font-medium text-on-surface`; cəm `shrink-0 whitespace-nowrap font-metric-val text-body-md font-semibold tabular text-on-surface` (yoxdursa «—» `text-on-surface-variant`) |
| 2-ci və 3-cü xətt | `ml-9 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm leading-[18px] text-on-surface-variant`: spesifikasiya · `OrderLineTypeBadge` · «Cavabdeh: …» / «Cavabdeh təyin edilməyib» (yerli, `on-surface-variant` — `LineResponsibleNote`-un `slate-400`-ü 2,6:1-dir); miqdar × qiymət; «Qiymət yoxdur» / «Daxili təminat» `lineToneClass`; təchizatçı |
| Səhifələmə | `mt-3 flex items-center justify-between text-body-sm text-on-surface-variant tabular` + iki secondary düymə `h-8` (telefonda `h-11`) |
| Yüklənir / xəta | 3 sətir `h-12 animate-pulse rounded-md bg-surface-container-low`, `aria-busy` / `ErrorState` (ortaq) |
| Footer | masaüstü: «Obyektin sifarişləri» secondary, «Sifarişə bax» primary (§5.8); **telefonda** (`sm`-dən aşağı) footer-ə bir sarğı verilir: `grid w-full grid-cols-2 gap-2` — «Sifarişə bax» `col-span-2`, altında «Obyektin sifarişləri» və «Bağla» (secondary); hamısı `h-11` |

### 5.7 Kartlar (`lg`-dən aşağı)

- Nəticə sayı kartlardan **əvvəl**, filtrlərin altındadır (§5.3); telefon hissəsinin uşaq sırası dəyişmir (əfsanə
  birincidir).
- Əfsanə — cədvəlinki kimi, kartların üstündə (`aria-label="Kartlardakı işarələr"`).
- Kart: `rounded-lg border border-outline-variant bg-surface-container-lowest p-3`.
- Başlıq xətti: obyekt linki `flex min-h-11 items-center break-words text-body-md font-medium text-on-surface`; sağda
  «İl cəmi» `text-body-sm text-on-surface-variant` + məbləğ `font-metric-val text-body-md font-semibold tabular`.
- Zolaq: `mt-2 grid h-10 grid-cols-12 items-end gap-0.5 border-b border-outline-variant`; adi bar `costDirectionBarClass(0)`
  (neytral), qeyri-adi bar istiqamət rəngi, gələcək ay `outline` ştrix; `aria-hidden`.
- Ay şəbəkəsi: `mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6`; ayın adı `text-body-sm leading-[18px] font-medium
  text-on-surface-variant`; xana — cədvəldəki `ReportCell` (12 px; kartlarda E tətbiq olunmur — sütunlar ~110 px-dir),
  `min-h-11`.
- «Cəmi» kartı: `bg-surface-container`, eyni şəbəkə, faiz və rəng yoxdur.

### 5.8 Düymələr (`buttonClass` və ya eyni siniflər yerli)

| Variant | Normal | Hover | Fokus | Deaktiv |
|---|---|---|---|---|
| primary («Sifarişə bax») | `h-10 rounded-md bg-primary px-4 text-body-md font-medium text-on-primary` | `bg-primary-container` | `outline-2 outline-offset-2 outline-primary` | `opacity-40`, `aria-disabled` |
| secondary («Obyektin sifarişləri», «Əvvəlki / Növbəti», telefonda «Bağla») | `h-10 rounded-md border border-outline bg-surface-container-lowest px-4 text-body-md font-medium text-on-surface` | `bg-surface-container-low` | eyni | eyni |
| ghost («Sıfırla», «Yenidən cəhd et», ay düymələri) | `h-10 rounded-md px-2 text-body-md text-on-surface-variant` | `bg-surface-container-low text-on-surface` | eyni | eyni |
| touch (ölçü) | `h-11` | | | |

## 6. Breakpoint üzrə vizual ölçülər

B — qutunun daxili eni (Windows, S = 17); ay sayı — `03-ux.md` §4.1.

| | 1440 | 1366 | 1280 | 1024 | 768 | 390 |
|---|---|---|---|---|---|---|
| `main` boşluğu | 32 | 32 | 32 | 32 | 24 | 16 |
| B | 1097 | 1023 | 937 | 681 | kart | kart |
| Zolaq | 3 sütun, `p-6` | 3 sütun, `p-5` | 3 sütun, `p-5` | 3 sütun, `p-5` | 3 sütun, `p-5` | əsas + 2 sütun, `p-4` |
| Filtrlər | 1 sıra, axtarış 288 | 1 sıra, 240 | 1 sıra (925 ≤ 937) | 2 sıra | 4 sıra | 4 sıra, tam en |
| İdarəetmə hündürlüyü | 40 | 40 | 40 | 40 | 44 | 44 |
| Yığcam, 12 px | 12 ay (1 px ehtiyat) | ~11 ay | ~9,85 ay (Fev–Okt) | ~6,4 ay | 3×4 → 6 sütun | 3 sütun |
| Yığcam, E | (12 px ilə eyni) | 12 ay | ~10,8 ay (Yan–Okt) | ~7 ay | (eyni) | (eyni) |
| Standart, 12 px / E | ~8,4 / eyni | ~7,7 / ~8,4 | ~6,9 / ~7,5 | ~4,5 / ~4,9 | kart | kart |
| Rəqəm ölçüsü (cədvəl) | 12 | 12 / E 11 | 12 / E 11 | 12 / E 11 | 12 | 12 |
| Sətir | 45 | 45 | 45 | 45 | kart | kart |
| Əfsanə | 1 sətir (Yığcam) | 2 | 2 | 3 | bükülür | bükülür |
| Panel | 560 | 560 | 560 | 560 | 560 (solda ~208 px səhifə) | tam ekran |

## 7. Stock siniflərin qaldığı yerlər və səbəbi

Hesabatın öz fayllarındakı hər rəng, ölçü və boşluq tokendən gəlir (M-11). Aşağıdakılar ortaq köməkçi və ya ortaq
komponentdir, ya da token olmayan bir mənadır; onları tokenə keçirmək başqa ekranları da dəyişir və ayrıca tapşırıqdır
(W-04).

| Yer | Stock sinif | Niyə qalır |
|---|---|---|
| `costDirectionToneClass` / `BarClass` / `TintClass` (`format.ts:322-351`) | `red-700`, `emerald-700`, `red-500`, `emerald-500`, `slate-300`, `red-50`, `emerald-50`, `ring-*-200` | 9.1-in bir mənbəyi, bütün analitika ekranları işlədir; `cost-up` / `cost-down` tokenləri var, keçid W-04 |
| `warningToneClass`, `warningChipClass` (`pricing/labels.ts:92-93`), `lineToneClass` | `amber-800`, `amber-50`, `amber-900`, `ring-amber-200`, `slate-500` | xəbərdarlıq tokeni yoxdur; məhsulun qiymət sözləri |
| `StatusMark` (yerli sabit, `components/reports/`) | `sky-700` (⏳); S-3 yaşıl seçilsə `emerald-700` (✓); ↩ — `warningToneClass` | status tokeni yoxdur; nişanların rəng ailəsi (`workflowStatusClass`); ortaq `workflow/labels.ts` dəyişmir |
| `orderLineTypeToneClass` (`lineType.ts:47-51`) | `slate-*`, `sky-*` | `OrderLineTypeBadge` — ortaq |
| `OrderStatusBadge` / `StatusBadge`, `EmptyState` / `ErrorState` / `LoadingRows`, `PageHeader`, `Modal` / `Drawer` | `slate-*`, `red-*` | ortaq komponentlər (6–24 fayl) |
| Karkas: `AppLayout` (`#f5f5f3`), `Sidebar` (`slate-800`, `#2a3649`), `Header` | `slate-*`, hex | D-50 №4, W-02 — dəyişmir |

Ortaq komponentlərin iki kontrast boşluğu bu işdə toxunulmur, ayrıca qeyd olunur: `InfoHint` ⓘ (`slate-400`, 2,63:1) və
`LineResponsibleNote`-un «təyin edilməyib» mətni (`slate-400`, 2,6:1); panel heç birini işlətmir.

## 8. `visual-qa` üçün dizayn tənqidi siyahısı (A rejimi)

1. 3 saniyə testi (1440 və 1280): göz əvvəl əsas rəqəmə, sonra cədvəlin məbləğlərinə düşür; 1280×800-də ilk ekranda zolaq
   və cədvəlin ~3 sətri görünür (`03-ux.md` §4.1 büdcəsi).
2. Hər rəng bir məna daşıyır (§4.1); qırmızı / yaşıl yalnız xərcin istiqamətidir (✓ yaşıl seçilməzsə); mavi heç bir
   statik elementdə yoxdur.
3. Heç bir xanada iki faiz yoxdur; ▲/▼ faizin yanında deyil; Standartın faizi 12 px-dir (E istisna).
4. Kontrast cədvəli (§4.2) ekranın hər mətninə uyğundur; `outline` mətn kimi işlənməyib; ştrix xətti `outline`-dır.
5. Diakritikli mətndə sətir hündürlüyü ≥ 1,4 (§3); «İyn», «İyl», «Məbləğ», «Ümumi» kəsilmir.
6. ✓ ⏳ ↩ boz tonlu şəkildə də fərqlənir; ⏳ monoxromdur və işarə sətrinə sığır (emoji çıxsa ehtiyat ikon).
7. «Cəmi» sətrinin beşrəqəmli qonşu cəmləri arasında ≥ 6 px var; xananın fonu, hover, seçim və fokus rəqəmi tam örtür.
8. Seçilmiş qeyri-adi xanada yalnız `primary` halqa görünür.
9. Toxunma ölçüləri `lg`-dən aşağı ≥ 44 px (panelin footer «Bağla»sı daxil).
10. Stock siniflər yalnız §7-dəki yerlərdədir.
11. Audit §6-dakı Figma xətalarının heç biri geri gəlməyib (panelin yanlış mətni, faizin əsası, «İlk mövcud ay», rəqəm
    formatı, kiçik rəqəmlər, kontrast, dizayn qeydləri, «Bütün əlaqəli sifarişlər»).
12. Karkas (260 / 72, rənglər) dəyişməyib; panelin örtüyü səhifəni oxunaqlı saxlayır (19.1).
