# Task 13 — Məhsul adlarının uyğunlaşdırılması / alias

## Məqsəd
Eyni mal fərqli yazıldığı üçün yalançı "yeni" və "bu ay yazılmayan" dəyişikliyi yaranmasın; ətir, rəng və ölçü kimi variantlar isə ayrı qalsın. Sistem heç vaxt öz-özünə birləşdirmə etməsin.

## Auditdə müşahidə edilən hazırkı problem
- Heydər Əliyev Mərkəzi, Sentyabr 2026:
  - "Sabun elano" "artıq sifariş olunmur" kimi görünür: 60 → 0 ədəd, 12.50 ₼, −750.00 ₼.
  - "Sabun elano lavanda ətirli" isə "yeni" kimi görünür: +750.00 ₼.
  - İkisi arasındakı əlaqə sistemdə yoxdur. Nəticədə "Niyə dəyişib?"də həm "yeni", həm "yazılmayan" hissəsi 750 ₼ artır.
- Əlavə kontekst (mənbə Excel faylların əvvəlki təhlili): 69 halda eyni mal fərqli yazılıb — boşluq fərqi, "15 W" / "15W", "3/4" / "3\4".
- Məhsullar səhifəsində hazırda "Bu bölmə hələ hazırlanır" yazılıb. Oradakı planlaşdırılmış imkanlar arasında "Məhsullar və onların variantları (ölçü, model, sifariş vahidi)" və "Excel yazılışları üçün alternativ adlar" var.

## İstədiyim nəticə
- Sistem ehtimal olunan uyğunluqları təklif edir. İki növ təklif var:
  - **Yazılış fərqi** (eyni mal): boşluq, "15 W" / "15W", "3/4" / "3\4". Təsdiqdən sonra bir mal sayılır.
  - **Variant fərqi** (ətir, rəng, ölçü): məsələn "Sabun elano" / "Sabun elano lavanda ətirli". Təsdiqdən sonra eyni əsas məhsulun ayrı variantları kimi bağlanır, bir mala birləşmir.
- Hər təklifi yalnız admin və ya data idarəçisi təsdiqləyir və ya rədd edir; təsdiqlənməyən heç nə dəyişmir.
- Yazılış fərqi təsdiqlənəndən sonra malın tarixçəsi, "Əsas dəyişikliklər" və "Niyə dəyişib?" onu bir mal kimi görür.
- Təsdiqlənmiş variant keçidi "Niyə dəyişib?"də bir sətirdə "variant dəyişib" kimi göstərilir, məsələn: "Sabun elano — variant dəyişib: adi → lavanda ətirli". Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda baş verir; təsdiqlənməmiş hallarda iki mal ayrı sətirlərdə qalır.
- Heç bir təsdiqdən sonra məbləğlər dəyişmir.
- Səhv təsdiq geri alına bilir.

## Qəbul edilmiş qərarlar
- Qeyri-müəyyən uyğunluqlar heç vaxt avtomatik qəbul edilmir (sizin qaydanız).
- Sifarişlər və məbləğlər dəyişmir; yalnız malın kimliyi və variant əlaqəsi qurulur.
- **13.1:** Ətir, rəng və ölçü fərqi olan adlar eyni əsas məhsula aid ola bilər, amma ayrı variant kimi qalır. Avtomatik kor birləşdirmə yoxdur.
- **13.1a:** Eyni əsas məhsulun təsdiqlənmiş variant keçidi "Niyə dəyişib?" bölməsində bir sətirdə "variant dəyişib" kimi göstərilir. Bu, yalnız təsdiqlənmiş məhsul–variant uyğunluğu olanda tətbiq olunur; qeyri-müəyyən hallarda avtomatik birləşdirmə yoxdur.
- **13.2:** Uyğunluqları və alternativ adları yalnız admin və ya data idarəçisi təsdiqləyir.

## Mütləq qorunmalı davranışlar
- Task 1/1b/1c rəqəmləri dəyişmir: ümumi məbləğlər və obyekt fərqləri eyni qalır.
- Task 2-nin qiymət vəziyyətləri (qiymət yoxdur / daxili təminat) təsdiqdən sonra da düzgün qalır.

## Out of scope
- Menyuda "Məhsullar" bölməsinin kimə görünməsi — Task 14.
- Sözlər — Task 5.

## Acceptance — biznes dili ilə
- Sistem "Sabun elano lavanda ətirli"ni "Sabun elano"nun variantı kimi təklif edir, özü heç nə etmir.
- Admin təsdiqləyəndən sonra ikisi eyni əsas məhsulun ayrı variantları kimi görünür, bir mala birləşmir.
- Variant əlaqəsi təsdiqlənəndən sonra Heydər Əliyevin Sentyabr sifarişində "Niyə dəyişib?" bölməsində "Sabun elano" üçün bir "variant dəyişib" sətri görürəm; bu sətrin təsiri 0.00 ₼-dır (750.00 − 750.00). "Yeni məhsullar" və "Bu ay yazılmayan məhsullar" hissələrinin hər biri 750.00 ₼ azalır.
- Təsdiq olunana qədər iki mal indiki kimi ayrı sətirlərdə qalır.
- "15 W" / "15W" kimi yazılış fərqini admin təsdiqləyəndən sonra malın tarixçəsində bir mal görürəm.
- Rəhbər hesabı ilə təklifi təsdiqləyə bilmirəm.
- Heç bir təsdiqdən sonra ümumi məbləğ və obyekt fərqi dəyişmir (Heydər Əliyev, Keçən ay: +23,852.70).
- Səhv təsdiqi geri alanda əvvəlki vəziyyət qayıdır.

## Açıq suallar
Yoxdur.

---

