# Yekun Ənvər müəllim auditi — operatorun dəsti

Bu qovluq yekun auditi aparmaq üçün hazırlanmış dəstdir. Sahibin tapşırığı `AI_WORKFLOW/BRIEFS/TASK-15.md`, auditin
protokolu isə `AI_WORKFLOW/TASKS/TASK-15.md` faylındadır. Bu dəst onlardan irəli gəlir və onları əvəz etmir.

## 1. Audit nədir

Tapşırığın məqsədi, sözbəsöz:

> Bütün tapşırıqlardan sonra yoxlamaq: Ənvər müəllim ən son tam ayın sifarişlərini bu sistemlə rahat və inamla
> təsdiqləyə bilirmi? Bu task yeni imkan qurmur, yalnız yoxlayır.

Audit Sentyabr 2026-nın real datası ilə, Rəhbər hesabı ilə və yalnız oxuma rejimində aparılır; ay sahib tərəfindən
2026-09-25-də təsdiqlənib (protokol §5.1, cavab A1). Təsdiq axını real datada yox, ayrıca sınaq mühitində (sandbox),
test sifarişi ilə yoxlanır. Auditin sonunda bir suala açıq cavab verilir: "Bu ayın sifarişləri bu gün Ənvər
müəllimə verilsəydi, o, bu sistemlə rahat və inamla təsdiq qərarı verə bilərdimi?"

## 2. Kim nə edir

- **Sahibin operatoru auditi aparır** (sahibin cavabı A3). Brauzerdə ekranlara baxır, enləri dəyişir, klikləri sayır,
  yalnız oxuyan əmrləri işlədir, sınaq mühitində təsdiq axınını keçir, nəticələri və ekran şəkillərini yazır.
- **Coder bu dəsti hazırlayıb** (Task 15a). Coder-in brauzeri, Rəhbər parolu və verilənlər bazasına girişi yoxdur. O,
  yalnız faylları yazıb və regress testlərini baza kimi işlədib.
- **Hesabatı 15b yığır.** Operatorun nəticələri qayıtdıqdan sonra Coder onlardan
  `docs/audits/2026-final-enver-muellim-audit.md` hesabatını protokolun §7-sinə görə yığır və testləri yenidən işlədir.
  Hesabatın boş skeleti `06-hesabat-skeleti.md` faylındadır. Operator onu doldurmur.

## 3. Dəstin faylları

| Fayl | Nə üçündür |
|---|---|
| `README.md` | Bu səhifə: məqsəd, qaydalar, işin ardıcıllığı. |
| `01-hazirliq.md` | Hazırlıq: tarix, commit, real sistemin işə salınması, Rəhbər hesabı, sınaq mühiti, ekran enləri, ekran şəkilləri. |
| `02-yoxlama-siyahisi.md` | Yoxlama siyahısı, A … K bölmələri. |
| `03-emrler.md` | Yalnız oxuyan əmrlər: auditin əvvəlində (A bölməsi) və sonunda (J bölməsi). |
| `04-sandbox.md` | Sınaq mühitində təsdiq axınının addımları. |
| `05-neticeler-qaytarilmasi.md` | Nəticələrin necə və hara qaytarılması. |
| `06-hesabat-skeleti.md` | 15b-nin hesabatı üçün boş skelet. |

Operator iş zamanı bu qovluqda iki şey yaradır: `neticeler.md` (yoxlama siyahısının doldurulmuş surəti) və
`ekranlar/` (ekran şəkilləri).

Yoxlama siyahısının bölmələri:

| Hərf | Bölmə |
|---|---|
| A | Ön şərtlər (G1, G2, G3) |
| B | Köhnə tapıntılar |
| C | Task 04–16 qəbul şərtləri |
| D | Sahibin qərarları 4.1 … 16.1 |
| E | Regress: Task 1–3 və ilk auditdə yaxşı olanlar |
| F | Təsdiq axını (sınaq mühitində) |
| G | Klik sayı |
| H | Ekran enləri |
| I | Əvvəlki tasklardan daşınan qeydlər |
| J | Son vəziyyət |
| K | Yeni tapıntılar |

Hər yoxlamanın nömrəsi `<bölmənin hərfi>-<iki rəqəm>` şəklindədir, məsələn `A-02` və ya `C-17`.

## 4. İşin ardıcıllığı

1. `01-hazirliq.md` — hazırlığın yeddi bəndi, sıra ilə.
2. `03-emrler.md` — başlanğıc oxunuşu. Nəticə `neticeler.md`-də A bölməsinin altına yapışdırılır.
3. Ön şərtlər — `02-yoxlama-siyahisi.md`, A bölməsi. Bir ön şərt keçməsə: DAYANIN, audit davam etmir.
4. Yoxlama siyahısının qalan bölmələri, B … K. Sınaq mühitində aparılan yoxlamalar üçün `04-sandbox.md`.
5. `03-emrler.md` yenidən — son vəziyyət, J bölməsi.
6. `05-neticeler-qaytarilmasi.md` — nəticələrin təhvili.

## 5. Dəyişməz qaydalar

Tapşırığın «Qəbul edilmiş qərarlar» bölməsindən, sözbəsöz:

- Audit yalnız oxuma rejimində aparılır: real sifariş təsdiqlənmir, qaytarılmır, dəyişdirilmir.
- Audit admin yox, Rəhbər hesabı ilə aparılır (Task 14).
- Ekran enləri: 1366, 1440, 390 (telefon) və 1150–1279 arası noutbuk.
- **15.1:** Ən son tam real ay + təsdiq axını üçün ayrıca test sifarişi. Oktyabr tamdırsa Oktyabr, deyilsə Sentyabr.
- **15.2:** Yekun auditdən əvvəl real qiymət təsnifatı üzrə açıq sətir qalmamalıdır.
- **15.2a:** "Alış qiyməti tələb olunur" real sətirlər yekun audit üçün açıq sayılır. Auditdən əvvəl ya qiymət daxil
  edilir, ya da biznes qaydasına görə qiymət tələb etmədiyi təsdiqlənib uyğun statusa keçirilir.

Protokolun §2 və §8 bəndlərindən:

- Real datada (`baxorders_dev`) heç bir sifariş təsdiqlənmir, qaytarılmır və dəyişdirilmir.
- `baxorders_dev`-də heç nə təsnif edilmir, heç bir məhsul uyğunluğu təsdiq və ya rədd edilmir, heç bir import
  təsdiqlənmir.
- İmport #6 heç vaxt təsdiqlənmir. O, Yanvar–İyun dövrünün köhnəlmiş iş kitabıdır və İyun orada iki dəfədir; onu
  təsdiqləmək həmin ayların sifarişlərinin ikinci surətini əlavə edərdi.
- Yazma tələb edən hər yoxlama yalnız sınaq mühitində aparılır.
- Audit Rəhbər hesabı ilə aparılır, admin hesabı ilə yox. Admin hesabı yalnız dəstin açıq dediyi yerdə işlədilir
  (`01-hazirliq.md`, 4-cü bənd: İstifadəçilər səhifəsinə baxmaq) və orada heç nə yadda saxlanılmır.
- Yeni tapıntılar yeni task kimi yalnız **təklif olunur**. Bu audit çərçivəsində kod dəyişmir.
- Heç vaxt: dəstin yalnız oxuyan əmrlərindən başqa `baxorders_dev`-ə qarşı SQL, `pg_dump` / `pg_restore`,
  `dotnet ef`, miqrasiya alətinin `--backup` və ya `--apply` əmri, `git commit` / `reset` / `checkout` / `push`.

Aşağıdakılardan biri baş verərsə, DAYANIN və yan yol axtarmadan vəziyyəti `neticeler.md`-də yazın (protokol §8):

- ön şərtlərdən (G1, G2, G3) biri keçmir;
- audit `baxorders_dev`-də nəyisə təsdiqləməli, qaytarmalı, dəyişməli və ya təsnif etməli olur;
- ekran Rəhbərə real datada Task 14-ün olmamalı dediyi bir yazma əməli təklif edir. Protokola görə bu, P0 tapıntısı
  kimi yazılır. Düyməni basmayın;
- import #6 təsdiqlənmiş tapılır, və ya #50010-dan başqa hansısa import `Imported` vəziyyətindədir;
- API və ya frontend protokolun §5.3-də adı çəkilən commit-də deyil;
- parol və ya başqa gizli məlumat fayla, jurnala və ya hesabata yazılmalı olur;
- tapşırıqla protokol bir-birinə zidd çıxır.

## 6. Parollar

Parol yalnız giriş formasına və ya mühit dəyişəninə (environment variable) yazılır. O, heç vaxt bu dəstin faylına,
`neticeler.md`-yə, ekran şəklinə və ya yadda saxlanılan əmr tarixçəsinə düşmür. Sınaq mühitinin parolunu tarixçəyə
düşmədən necə təyin etmək `01-hazirliq.md`-də, 5-ci bənddə göstərilib.

## 7. Nəyi və hara qaytarmaq

Nəticələr bu qovluqda, `neticeler.md` faylında və `ekranlar/` qovluğunda qalır. Nəyin necə doldurulduğu və iş bitəndə
nə edilməli olduğu `05-neticeler-qaytarilmasi.md`-dədir.

## 8. Yoxlanıla bilməyənlər

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

Operator bunları bərpa etməyə çalışmır: ilk auditin bölmələrini, prioritetlərini və ya klik yolunu yaddaşdan və ya
başqa sənəddən qurmur. Yoxlanıla bilməyən hər şey hesabatda açıq şəkildə "yoxlanıla bilmədi" kimi qalır.
