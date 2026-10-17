# 05 — Təsdiq: dashboard kartlarının detalları

**Tarix:** 2026-10-17 · **Mərhələ:** 5 — Təsdiq (`AI_WORKFLOW/DESIGN_WORKFLOW.md`) · **Əsaslanır:** `01-audit.md`
(«Yeniləndi: 2026-10-17 …», variant B, §7 dizayn, §8 icra planı, §9 qərarlar).

Bu iş üçün 02–04 ayrıca sənəd kimi yazılmayıb: tələblər, UX və vizual qərarlar `01-audit.md` §4–§9-dadır və sahib onları
o sənəd üzərindən təsdiqləyib. `DECISIONS.md` qeydi (D-54) «Aylıq hesabat» V2 commit olunandan sonra əlavə olunur —
o faylda V2-nin commit olunmamış dəyişiklikləri var, indi ona yazmaq iki işi qarışdırardı (O-4).

## Sahibin təsdiqləri (sözbəsöz)

**1 — Variant və S-1…S-6:**

> Vacib düzəliş: Mən sağdan açılan panel (Drawer) istəmirəm. Bu, əvvəlcədən bildirdiyim tələbdir. Ona görə A
> variantını tövsiyə etmə. Əsas seçim: Kartlara klikləyəndə detallar KPI kartlarının altında, eyni səhifədə açılsın.
> Yalnız bir kartın detalları açıq qalsın. […] Mənim qərarlarım: S-1: Hələlik obyekt-obyekt səbəblər. S-2: Maliyyə
> yekunları serverdə qalsın. S-3: Ayrı cəmlər sonrakı mərhələyə. S-4: Yalnız Sadə baxış. S-5: Mövcud ortaq
> komponentlərə uyğun davran. S-6: Həqiqi ən böyük 5-i göstərmək üstünlükdür.

**2 — O-1…O-4 və əlavə tələblər:**

> Dashboard kartları üçün O-1–O-4 qərarlarını təsdiqləyirəm: O-1: Bəli. «Ətraflı» düyməsi sağ Drawer əvəzinə kartların
> altındakı «Fərq» bölməsini açsın və müvafiq obyekti seçsin. O-2: Mobil görünüşdə 2×2 kart düzülüşü istifadə et.
> Mətnlər sığmırsa, responsive alternativ seç. O-3: «Bütün obyektlər cədvəli» keçidi həmin səhifədə cədvələ
> sürüşdürsün. Mövcud filtrləri dəyişmə. O-4: Aylıq hesabat V2 ilə ortaq fayllara toxunmazdan əvvəl onun
> dəyişikliklərinin commit olunmasını və konflikt riskinin yoxlanmasını gözlə. Əlavə tələblər: Kartların yerindən
> tərpənməsinin qarşısını al. Detal bölməsində daimi artıq boşluq yaratma. «Ən böyük 5» siyahısının bütün uyğun
> obyektlər arasından düzgün seçilməsini yoxla. Mövcud API və maliyyə hesablamalarını dəyişmə. Əvvəlki auditləri
> təkrarlama.

**3 — İcraya başlamaq:**

> IMPLEMENTATION MODE. `AI_WORKFLOW/DESIGN/2026-10-17-dashboard-kart-detallari/01-audit.md` sənədində təsdiqlənmiş
> dashboard kartları planının icrasına başlayırıq. […] Vacib şərtlər: Aylıq hesabat V2 ilə konflikt yarada biləcək
> fayllara onun commit-i tamamlanmadan toxunma. Mövcud API, maliyyə hesablamaları və biznes məntiqini dəyişmə. Hər
> mərhələdən sonra testləri işə sal. Playwright ilə responsive və funksional yoxlama apar. Test olunmayan hissələri
> açıq bildir. İş bitəndə dəyişikliklərin xülasəsini və test nəticələrini təqdim et. Artıq təsdiqlənmiş UX qərarlarını
> yenidən audit etmə.

**4 — İcra zamanı verilən iki cavab (2026-10-17):**

- V2 qapısı: «V2-yə toxunmadan hamısını et». Mənası: V2-nin dəyişdiyi və ya yaratdığı heç bir fayl (`format.ts`,
  `buttonClass.ts`, `terms.ts`, `reports/*` …) dəyişmir və V2-nin yeni modulları idxal olunmur; `format.ts`-in commit
  olunmuş versiyada da olan funksiyaları çağırılır. İki iş sonradan fayl yolları üzrə ayrıca commit oluna bilər.
- Brauzer yoxlaması: «Hər ikisi» — sahib Playwright pəncərəsində özü daxil olur (real lokal data), çətin hallar isə
  saxta API cavabları ilə yoxlanır.

## Qəbul meyarları

| ID | Kim, harada, nə edir və nə görür |
|---|---|
| AC-01 | Rəhbər «Sadə baxış»da 4 kartdan birini klikləyir — həmin kartın detalları kart cərgəsinin altında açılır. Eyni anda yalnız biri açıqdır; eyni karta təkrar klik bağlayır; başqa karta klik məzmunu dəyişir. Kart düymədir (`aria-expanded`). |
| AC-02 | Açma, bağlama və kartdan karta keçid zamanı 4 kartın yeri və ölçüsü dəyişmir (Δ = 0) — desktop, 768 və 390 (2×2). |
| AC-03 | Bağlı vəziyyətdə bölmə yer tutmur (0 hündürlük); kartlarla növbəti blok arasındakı məsafə açılmadan əvvəlki ilə eynidir. Uzun detaldan qısaya keçəndə bölmə məzmuna qədər kiçilir. |
| AC-04 | URL: `detal=mebleg|baza|ferq|obyektler`, «Fərq»də açıq sətir `obyekt=<id>`. Birbaşa link eyni vəziyyəti açır; «Geri» bölməni bağlayır; kartdan karta keçid və sətir dəyişməsi tarixçəyə yeni addım yazmır; tanınmayan dəyər səssizcə silinir; «Ətraflı baxış»da `detal` tətbiq olunmur. |
| AC-05 | Klaviatura: kartlara Tab ilə çatılır; açanda fokus bölmənin başlığına keçir; Esc bölməni bağlayır və fokus karta qayıdır; açıq sətir varsa birinci Esc yalnız sətri bağlayır. Fokus həmişə görünür. |
| AC-06 | «Fərq»: müqayisə olunan bütün obyektlər artan / azalan qruplarda, serverin \|fərq\| sırası ilə; sətir yerində açılır (bir dəfədə biri) və obyektin dekompozisiyasını, «Sifarişə bax» keçidini göstərir; müqayisəyə daxil olmayanlar adbaad. Brauzer pul toplamır, faiz hesablamır. |
| AC-07 | «Məbləğ dəyişiklikləri» bütün müqayisə olunan obyektlər arasından \|fərq\|-ə görə ilk 5-i göstərir; cədvəlin axtarış və süzgəclərindən asılı deyil; «Fərq» bölməsinin ilk 5-i ilə eyni obyektlərdir. |
| AC-08 | «Ətraflı» düyməsi Drawer açmır: «Fərq» bölməsini həmin obyektin sətri açıq halda açır (`detal=ferq&obyekt=<id>`); sətir görünmürsə siyahı genişlənir. «Sadə baxış»da Drawer qalmır. («Ətraflı baxış»ın «— təfərrüat» düyməsi də `ChangeDetailDrawer`-i açır və S-4-ə görə dəyişmir; `01-audit.md`-dəki «istehlakçısı qalmır» qeydi bunu nəzərə almamışdı — icra zamanı aşkarlandı.) |
| AC-09 | «Bütün obyektlər cədvəli» keçidi yalnız cədvələ sürüşür; URL və cədvəlin süzgəcləri dəyişmir. |
| AC-10 | Uzun siyahı: ilk 8 sətir + «Hamısını göstər (N)»; bölmənin daxilində ayrıca sürüşmə yoxdur. |
| AC-11 | Telefonda (360–767 px) kartlar 2×2 yığcam formadadır: rəqəm kəsilmir və bükülmür, etiket ən çox 2 sətir; daha dar ekranda və ya böyük şriftdə 1 sütun. Səhifə yana sürüşmür; toxunma düymələri ≥ 44 px. |
| AC-12 | Bölmə yüklənir / yenilənir / səhv / boş / qiymətsiz sətir vəziyyətlərini göstərir; bir hissənin səhvi qalanını bloklamır. |
| AC-13 | «Fərq» kartı və fərq rəqəmləri məhsulun artım–azalma rəng köməkçisi ilə göstərilir (artım qırmızı, azalma yaşıl), kontrast AA; rəng heç vaxt tək işarə deyil. |
| AC-14 | «Məbləğ», «Müqayisə dövrü», «Aktiv obyektlər» bölmələri `01-audit.md` §7.5-dəki məzmunu yalnız server rəqəmləri ilə göstərir. |
| AC-15 | Dəyişmir: API, server hesablamaları, «Ətraflı baxış», «Bütün obyektlər» cədvəli və süzgəcləri, V2 faylları. |
