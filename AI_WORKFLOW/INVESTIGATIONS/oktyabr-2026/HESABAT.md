# Oktyabr 2026 sifarişləri — sistemə əlavə edildi, rəhbərin təsdiqini gözləyir

**Tarix:** 2026-10-15  ·  **Mənbə:** `AI_WORKFLOW/INVESTIGATIONS/Oktyabr_sifarisi_bolgu_2026.xlsx`  ·  **İdxal:** #50012
**Qərar:** D-49

Sahib: «oktyabr ayı sifarişləri gəldi, bu təsdiqlənməyib, rəhbər baxıb qərar verməlidir, bunu sistemə əlavə
et, ancaq oktyabr ayı».

## Nəticə

| | |
|---|---|
| Sifariş | **24** (hər obyekt üçün bir, versiya 1) |
| Sətir | **382** |
| Məbləğ | **42 586,30 ₼** |
| Status | **PendingApproval** — 24-ü də rəhbərin təsdiq növbəsindədir |
| Aylıq / aylıqdan kənar | 378 / 4 |
| Daxili təminat (qiymətsiz) | 4 sətir |

Orijinal Excel ilə **müstəqil** tutuşdurma (proqramın öz rəqəmləri ilə yox, faylın özü ilə): 24 obyekt, 382
sətir, 42 586,30 ₼ — **fərq sıfır**. Yanvar–sentyabr tarixçəsinə toxunulmayıb: 166 sifariş, 3624 sətir,
431 458,93404 ₼ — əvvəlki kimi.

Heç bir sifariş təsdiqlənməyib. İdxal sifarişləri **qaralama** kimi yaradır (`ImportedAsApproved` hadisəsini
kod heç vaxt yazmır — o, yalnız tarixi sifarişlərə miqrasiya ilə yazılıb), sonra 24-ü bir əməliyyatla
təsdiqə göndərildi. Administrator göndərə bilir, **təsdiq edə bilmir** — qərar yalnız rəhbərindir.

## Faylın idxala uyğunlaşdırılması

Fayl idxalın gözlədiyi formada deyildi:

| fayl | idxal gözləyir |
|---|---|
| vərəq «Oktyabr 2026» | yalnız **«Aylıq»** vərəqini oxuyur, başqasını rədd edir |
| sütun «Sifariş növü» | sütunu adına görə tanıyır: **«Növ»** |
| sonda «Cəmi:» yekun sətri | yekun sətir sifariş sətri deyil |

**Orijinal fayla toxunulmadı.** İdxal üçün ayrıca surət hazırlandı
(`oktyabr-2026/Oktyabr-2026-idxal-ucun.xlsx`) — yalnız bu üç forma dəyişikliyi ilə. Surət orijinalla
hüceyrə-hüceyrə tutuşduruldu: 382 = 382 sətir, məzmunda **0 fərq**. Orijinalın «Cəmi» sütunu düstur idi
(`=L*J`) və hesablanmış dəyəri yox idi; surətdə boş saxlanıldı (idxala lazım deyil, uydurma rəqəm yazılmadı).

**Gələn ay üçün:** bu uyğunlaşdırmaya ehtiyac qalmasın deyə göndərənə yeni şablon verilməlidir
(`tools/workbook-template/`) — orada vərəq artıq «Aylıq», sütun «Növ»-dür.

## Həll edilən məsələlər

Bütün həllər **yalnız bu partiya üçündür** (`BatchOnly`) — heç bir alias yazılmayıb.

| | say | necə | əsas |
|---|---|---|---|
| Obyekt | 24 | hamısı avtomatik tanındı (`H.Ə.M` → Heydər Əliyev Mərkəzi və s.) | alias cədvəli |
| Cavabdeh şəxs | 8 | hamısı tanındı; `Xəyal` və `Xəyal Əbülfəz` iki ayrı şəxsdir | kataloq |
| **Yeni təchizatçı** | **6** | Excel-dəki adla yaradıldı: ASTEXNİKA, Yusif R-2017, Lankon İnşaat, Bi Servis Plyus, Hidroart, Nərmiyyə Qəribova | kataloqda oxşarı yox idi |
| **Yeni vahid** | **4** | `M3` Kub metr, `REYS` Reys, `INCH` Düym, `V` Volt | mövcud nümunə: `M2`, `KAMAZ`, `KW` |
| Vahid bağlama | 1 | `komplekt` → «Dəst» | eyni söz |
| Təsvir (vahid deyil) | 6 | `lik`, `lıq`, `luq`, `yarpaq`, `qat`, `ədədli` | D-20, D-21 |
| Kateqoriya yolu | 4 | «Yeni mallar» vərəqindəki kimi yaradıldı | göndərənin vərəqi |
| **Yeni məhsul** | **51** | «Yeni mallar» vərəqindəki ad və kateqoriya ilə | göndərənin vərəqi |
| Mövcud məhsula bağlama | 3 | `Columbus 80 BM 100 Şotka`, `Serçevina`, `Şurup samarez` | kataloqda açıq şəkildə var |
| **Yeni variant** | **85** | vərəqdəki ölçü/model ilə | |
| Qiymətsiz Qala Baza | 4 | daxili təminat | D-35 |

### Göndərənin «Yeni mallar» vərəqi

Göndərən 78 element hazırlamışdı: 40 «Yeni mal», 38 «Yeni ölçü/model». İdxal da öz yoxlamasında eyni
nəticəyə gəldi — 39 ad (PPRC qapatma başlığı iki ölçü ilə iki dəfə yazılıb) yeni məhsul idi.

«Yeni ölçü/model» deyilən 15 adı idxal tanımadı, yəni göndərən malın mövcud olduğunu düşünür, amma kataloqda
bu adla mal yoxdur. Kataloqda namizəd axtarıldı:

- **3-ü mövcud məhsula bağlandı** — `Columbus 80 BM 100 Şotka (№97)`, `Serçevina (barel)`,
  `Şurup samarez (papaqlı)`: kataloqda eyni mal var, yalnız ölçü və ya model yenidir
- **12-si yeni məhsul kimi yaradıldı** — kataloqun öz qaydası maşın və ölçünü məhsul adına yazır
  (`Bıçaq (Husqvarna TC 342)`, `Yağ filtri (Viking ZL)` kimi), və bu 12-nin heç birinin kataloqda qarşılığı
  yox idi. Məs. `Ağac remeni 3 sm` — kataloqda yalnız `Ağac remeni 4 sm` var, ölçü adın içindədir.

### Mövcud məhsullardakı 32 yeni variant yoxlanıldı

Hər biri kataloqdakı variantlarla yanaşı müqayisə edildi. Hamısı həqiqətən fərqlidir: yeni ölçü
(`Mikrofiber əski 40x50`), yeni model (`Akkumulyator 8V 190AH`), və ya fərqli sifariş vahidi
(`Taxta 4 metr` əvvəl ədədlə, indi **m³** ilə; `Şlanq Gardena 50x3/4` əvvəl topla, indi **metrlə**).
Sifariş vahidi variantın kimliyinin hissəsidir, ona görə bunlar ayrı variantdır. Yazılış fərqindən yaranan
dublikat tapılmadı.

## Diqqət çəkən sətirlər

- **8 «ola bilər təkrar» sətir** — idxal eyni dəyərli sətirləri işarələdi: H.Ə.M-də `Arxa skriz rezini`
  iki dəfə (2 × 97,5), F.M-də `Çəkmə uzun boğaz rezin` dörd dəfə, Dədə Qorqud-da iki dəfə. Bu, ayrı-ayrı
  işçilər üçün bir-bir yazılış ola bilər — keçmişdə də belə idi (may, H.Ə.M, № 1166–1168). Kitab əsas
  olduğu üçün ayrı sətir kimi gəldi. **Rəhbər baxanda bunlara diqqət yetirə bilər.**
- **2 təchizatçısız sətir** — hər ikisi `Nəqliyyat xərci` (1 reys × 50 ₼), H.Ə.M və Nərimanov heykəli.
  Excel-də şirkət yazılmayıb, proqramda da boşdur.

## Təsdiq edə bilən

Sistemdə təsdiq səlahiyyəti olan **yeganə aktiv hesab `audit.rehber`**-dir (Manager rolu). Növbədəki 24
sifarişi o görür və qərar verə bilir.

## Təhlükəsizlik

Əvvəl ehtiyat nüsxə: `baxorders-prod-pre-oktyabr-20261015T110118Z.dump` (sha256 yoxlandı, 353 obyekt oxunur).
Bütün yazılar tətbiqin öz idxal endpoint-ləri ilə aparıldı — birbaşa SQL yoxdur, hər addımın audit izi var.
Həll skripti əvvəlcə quru rejimdə işlədildi; o, bir səhvi əvvəlcədən tutdu (`m³` normalaşanda `m3` olur).
