# 04a — Dizayn tənqidi: D mərhələsi yerində (`03a-D-yerinde.md`)

**Tarix:** 2026-10-17 · **Mərhələ:** 4 (tənqid) · **Kim:** layihənin `visual-qa` agenti, A rejimi, Sonnet, ayrıca prosesdə, yalnız oxuma alətləri (Read/Grep/Glob), büdcə həddi 1,5 $. Sahibin tapşırığı (D-Y3): «D mərhələsinə başlamazdan əvvəl Sonnet ilə qısa, müstəqil visual-qa dizayn tənqidi apar. Yalnız təsdiqlənmiş `03a-D-yerinde.md` planını qiymətləndir.» Agentin hesabatı aşağıda dəyişdirilmədən verilir; S2-lərin həlli `03a` §10-dadır.

---

## Hökm: QEYDLƏRLƏ KEÇDİ
S1 yoxdur. İki S2 var, ikisi də icradan əvvəl planın 3a-ya düzəlişi ilə həll olunur, ona görə də icranı dayandırmırlar. «Qeydlərlə» o deməkdir ki, bu iki düzəliş icradan əvvəl plana yazılmalıdır.

## Mühit
Rejim A, brauzersiz, statik. Oxudum: 03a, 03-ux §3.2, §3.4, §9.8 və kodun üç faylı: `reportScroll.ts`, `ReportTable.tsx` (grep), `ReportFloatingHeader.tsx` (grep). 05-approval-ı, DESIGN_WORKFLOW-un Severity bölməsini və 03-ux §4.7/§6.9-u açmadım. İddiaları 03a-nın öz mətni və kodun grep nəticəsi ilə yoxladım. Rollar yoxlanmayıb.

## Qəbul meyarları
Bu rejimdə mümkün deyil. 03a §8-in meyarları E mərhələsində brauzerdə yoxlanacaq.

## Qüsurlar

**[Q-1] S2 · İstifadə/Kod · 03a §2 «Görünən en» · masaüstü · hamı**
Addımlar: Cədvəl yana sürüşmüşdür. İçində `colSpan=14` və `sticky left-0` olan detal sətri açılır.
Gözlənilən: Detal tam görünür.
Faktiki (kodla təsdiqləndi): `useBoxScroll` ResizeObserver-i yalnız `box` və `table` elementlərinə qoşur (`reportScroll.ts:221-225`) və `scrollLeft/width` ölçür. Plan «görünən eni onunla ölçürük» deyir, amma hook ölçülən en yaymır. Əlavə risklər:
- `colSpan` hüceyrəsi `table-layout` sütun enlərini dəyişə bilər. Sütun enləri `colgroup`-da sabit deyilsə, bütün aylıq sütunlar sıçrayır.
- `position: sticky` ölçü sahibi `td`-nin içində deyil, `td`-nin özündədirsə, `td` bütün cədvəl enində olur. Sticky qutu isə `td`-nin içində yaşamalıdır.
- Detal `td`-si `<td>` olaraq sütunların enini şişirdərsə, `box` üfüqi sürüşmə eni artır. `latest` və `trackWidth` dəyişir, «yan tərəfə səhifələmə» düymələri yanlış hesablayır.

İstiqamət: Detal `td`-sində `p-0`, içində bir `div` (`sticky left-0`, `width = box.clientWidth`) olsun. `td` özü üfüqi sürüşməyə töhfə verməsin (məsələn `max-width: 0; overflow: visible`). Enin mənbəyi `useBoxScroll`-un qaytardığı yeni `viewportWidth` olsun. Plana «cədvəlin `scrollWidth`-i detal açılanda dəyişmir» testi yazılsın.

**[Q-2] S2 · İstifadə · 03a §2 «Üzən başlıq» · masaüstü**
Addımlar: Detal açıqdır, səhifə aşağı sürüşür.
Faktiki: `ReportFloatingHeader` yalnız IntersectionObserver ilə iki elementi izləyir: real `thead` və `table` (`rows`). Sətirlərin sayını və ya hündürlüyünü bilmir. Detal sətri yüzlərlə piksel hündürdür (sifarişin 50 sətri). Üzən başlıq cədvəl sonuna qədər görünəcək, yəni sətirlərin içindəki detalın üstündə də qalır. Detal 14 sütunu tutduğundan başlıqdakı «Yan, İyun, İyul» sütunları detalla uyğun gəlmir və oxucunu çaşdırır. Plan «adi sətir kimi sayır» deyir, amma sayılacaq bir şey yoxdur. «Öz testi olacaq» kifayət deyil: dizayn qərarı yoxdur.
İstiqamət: Qərar yazılsın. Detalın içində başlıq gizlənsin (detal aralığında üzən başlıq `hidden`) və ya yalnız `box` sürüşməsində yox, `table` içindəki cari nöqtəyə görə. Ən sadəsi: detal açıq olanda üzən başlıq cədvəl səviyyəsində qalır, amma detalın `z-index`-i ondan yuxarıdır və detalın görünən sahəsi başlığın altına düşmür. Bu seçim planda göstərilməlidir.

**[Q-3] S3 · İstifadə · §4 «Açılanda fokus»**
Plan «h3, tabIndex=-1, görünən olandan sonra» deyir, amma 0fr→1fr animasiyası zamanı `focus()` çağırışı ya çox tezdir (element hələ sürüşmür), ya `inert`/`visibility` ilə bloklanır. Dashboard dərsi qeyd olunub, amma texniki mexanizm yazılmayıb.
İstiqamət: `transitionend` və ya `reduced-motion` halında dərhal. İlk 150 ms üçün `visibility` yox, `overflow:hidden` istifadə edilsin.

**[Q-4] S3 · İstifadə · §4 «Geri» ilə bağlanma**
«Geri» ilə bağlanma `navigate(-1)` istifadə edir, giriş bizimdirsə. Detal açıq ikən `year` dəyişirsə (il seçimi, replace) tarixçə dəyişmir, bu normaldir. Amma keçid `replace` olduğundan bir neçə xana ardıcıl açılsa da «Geri» yalnız bir addım geri qaytarır, yəni «Geri» hər xana arasında yox, bütün detaldan çıxarır. Bu bilərəkdir, amma planda bildirilməlidir (03 §3.4-dən fərq yoxdur). Yalnız `state: { reportCell: true }` yoxlamasının yenilənmə sonrası itdiyi hal (F5-dən sonra «Geri») qeyd edilməlidir.
İstiqamət: Testə «F5-dən sonra ✕» halı əlavə olunsun.

**[Q-5] S3 · İstifadə · §3 kart variantı · telefon**
Kartın içində detal obyektin ay şəbəkəsinin altında açılır, amma xananın toxunulan düyməsi detaldan yuxarıda qalır. 6 ay-düyməli şəbəkəni 390 px-də 44 px hədəflə (§8) 4 sətirlik detalla birlikdə göstərmək kartı bir ekrandan hündür edir. Plan «scrollIntoView block:center» yazır, bu kart hündürdürsə xananı görünməz edə bilər.
İstiqamət: Açılanda kartın başlığı + açılan xana + detalın başlığı görünsün (`block:'start'` qısa kartlarda, hündürlərdə `nearest`). Telefonda 44 px sınağı E-də mütləq olsun.

**[Q-6] S4 · Əlçatanlıq · §4 ARIA**
`aria-expanded` link üzərində yoxlanılmış model deyil: `role=link` + `aria-expanded` ekran oxuyucularda gözlənilməz oxunur. Plan öz özünə ziddir: eyni linkdə həm sifarişə keçid (Ctrl-klik), həm detal açma. Sahibin qaydası (link qalır) ziddiyyətsiz saxlanılır, ona görə yalnız S4. `aria-controls="report-cell-detail"` yalnız açıq olanda DOM-da id var, bağlıda göstərilən id yoxdur: bağlıda `aria-controls` buraxılmalıdır.
İstiqamət: `aria-controls` yalnız açıq xanada. İki xana arasında id dublikatı olmasın (kart + cədvəl eyni anda DOM-da olmamalıdır).

**[Q-7] S4 · Mətn · §2 «Bağlıda detalın sətri DOM-da yoxdur»**
Bu doğrudur, amma `ReportTable.tsx:324`-də hər sətir `<tr id="row-{locationId}">` ilə, detal sətri ayrıca `<tr>` kimi `tbody`-yə girəcək. Zebra (`striped`) hesabı sətir indeksi ilə gedirsə, detal sətri onu pozur.
İstiqamət: Zebra indeksi detal sətrini saymasın.

## Yoxlanıla bilməyənlər və səbəbi
Brauzer olmadan: layout sıçraması (Q-1 təsiri), sticky qutunun sürüşmüş cədvəldə real davranışı, fokus zamanlaması (Q-3), 44 px hədəflər, kartın hündürlüyü (Q-5), kontrast, Esc/Tab sırası. Hamısı E mərhələsində 1440/1280/1024/768/390 enlərində yoxlanmalıdır.

Sahibin qaydalarına uyğunluq: pul toplanmır (məzmun §6.9 sözbəsöz qalır), artım qırmızı/azalma yaşıl dəyişmir, sağ Drawer yoxdur, hamısı planda qorunur. Problem yoxdur.
