# 06 — Hesabatın skeleti (15b üçün)

Bu fayl yekun hesabatın boş quruluşudur. Operator onu doldurmur. Hesabatı 15b operatorun nəticələrindən
(`neticeler.md`, `ekranlar/`) yığır və `docs/audits/2026-final-enver-muellim-audit.md` faylına yazır (protokol §7.1).

- Hesabat Azərbaycan dilindədir.
- Bölmələr aşağıdakı sıra ilə gəlir. İlk auditin 20 bölməsi məlum deyil; bu quruluş bu auditin özününküdür (protokol
  §7.1).
- Hər rəqəmin yanında onun oxunduğu ekran və en göstərilir. Ekran şəkillərinə `ekranlar/`-dəki adları ilə istinad
  edilir (protokol §7.2).
- Hər bölmənin altındakı "Mənbə" sətri həmin bölməni yoxlama siyahısının hansı bölmələrinin qidalandırdığını deyir.

---

## 1. Yoxlanıla bilməyənlər

Mənbə: `README.md`, 8-ci bölmə (protokolun §0.1-i).

İlk auditin (23.09.2026) hesabatı əlçatan deyil: repozitoriyada yoxdur və sahib onun mətnini verməyib (cavab A2).
Tapşırığın bu hissələri yazıldığı kimi yerinə yetirilə bilməz:

- **"eyni ssenari və eyni hesabat quruluşu: 20 bölmə"** — ilk auditin ssenarisi və 20 bölməsi məlum deyil. Hesabat
  protokolun §7.1-dəki quruluşdan istifadə edir; bu, bu auditin öz quruluşudur.
- **"P0–P3 cədvəli"** və **"İlk auditin hər P0 və P1 tapıntısının vəziyyəti"** — ilk auditin prioritetləri məlum
  deyil, ona görə hansı köhnə tapıntıların P0 və ya P1 olduğunu demək mümkün deyil. Bunun əvəzinə *hər* köhnə tapıntıya
  sübutla vəziyyət verilir (§6.1); onların arasında P0 və P1 olanlar da buna daxildir. P0–P3 cədvəli bu auditin öz
  şkalasından istifadə edir (§7.1).
- **"Klik sayı ilk auditlə müqayisə olunub (3 klik + 3 sürüşdürmə)"** — sayılmış yol məlum deyil. Audit §6.5-dəki
  yolları sayır — bunlar bu auditin öz yollarıdır — və onları "3 + 3"-ün yanına qoyur, yolların fərqli ola biləcəyini
  açıq deyərək. Ona görə bu rəqəmlər eyni yolun müqayisəsi deyil.

(Paraqraf nömrələri protokola, `AI_WORKFLOW/TASKS/TASK-15.md`-yə aiddir.)

## 2. Ön şərtlər — G1, G2, G3

Mənbə: A bölməsi.

Sahibin ay təsdiqi sitat kimi, tarixi ilə (protokol §5.1). Hər ön şərtin nəticəsi, rəqəmləri və oxunduğu vaxt
(protokol §5).

## 3. Köhnə tapıntılar

Mənbə: B bölməsi.

Hər köhnə tapıntının vəziyyəti — həll olunub / qismən / həll olunmayıb — sübutla, və ilk auditin dörd "Xeyr" səbəbi
(protokol §6.1).

## 4. Task 04–16 qəbul şərtləri

Mənbə: C bölməsi.

## 5. Sahibin qərarları 4.1 … 16.1

Mənbə: D bölməsi.

## 6. Regress — Task 1–3 və ilk auditdə yaxşı olanlar

Mənbə: E bölməsi.

## 7. Təsdiq axını (sınaq mühitində)

Mənbə: F bölməsi.

## 8. Klik sayı

Mənbə: G bölməsi.

Protokolun §6.5-dəki yolların sayı, "3 klik + 3 sürüşdürmə"-nin yanında, yolların fərqli ola biləcəyi deyilərək.

## 9. Ekran enləri

Mənbə: H bölməsi.

## 10. Əvvəlki tasklardan daşınan qeydlər

Mənbə: I bölməsi (protokolun §3-dəki daşınan qeydlər).

## 11. Yeni tapıntılar

Mənbə: K bölməsi.

Hər yeni tapıntı təklif olunan task kimi yazılır: adı, ekranı və eni, rəqəmi, P0–P3 prioriteti və sahəyə cavabdeh
olan task. Yalnız təklif olunur; heç nə düzəldilmir (protokol §7.3).

## 12. P0–P3 cədvəli

Mənbə: B, C, D, E, F, G, H, I, K bölmələri — hər açıq bənd, köhnə və yeni.

**Bu auditin P0–P3 şkalası** (ilk auditin şkalası məlum deyil). Prioritet bəndin Rəhbərin təsdiq qərarına təsirinə
görə verilir (protokol §7.1):

- **P0** — Rəhbərin gördüyü rəqəm səhvdir və ya eyni rəqəm başqa ekranda fərqlidir; ya da Rəhbər real datanı Task
  14-ün dəyişə bilməməli dediyi şəkildə dəyişə bilir; ya da təsdiq axınının bir addımı alınmır.
- **P1** — qərar verilə bilir, amma tapşırıqdakı qəbul şərtlərindən biri və ya sahibin qərarı (4.1 … 16.1) yerinə
  yetirilməyib; ya da Rəhbərin yolundakı söz, rəng və ya xəbərdarlıq yanıldır.
- **P2** — Rəhbəri yavaşladır və ya çaşdırır, amma yanıltmır: dörd endən birində düzülüş xətası, artıq kliklər,
  texniki söz.
- **P3** — kosmetik, və ya Rəhbərin istifadə etmədiyi ekranda.

## 13. Son vəziyyət

Mənbə: J bölməsi.

Auditin sonundakı oxunuş (protokol §9, 11-ci bənd).

## 14. Yekun cavab

Mənbə: yuxarıdakı bütün bölmələr.

**Yekun cavabın qaydası** (protokol §7.1). Cavab yalnız bu halda **Bəli**-dir: bütün ön şərtlər keçib, heç bir açıq P0
və ya P1 yoxdur (köhnə və ya yeni), və təsdiq axını başdan sona işləyib. Əks halda cavab **Xeyr**-dir və səbəblər açıq
bəndləri öz sətirləri ilə adlandırır. "Qismən", "əsasən" və ya şərtli cavab cavab deyil.

Bu ayın sifarişləri bu gün Ənvər müəllimə verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?

Cavab: Bəli / Xeyr —
