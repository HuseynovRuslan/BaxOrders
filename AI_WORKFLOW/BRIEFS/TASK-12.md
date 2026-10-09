# Task 12 — Mobil görünüş

## Məqsəd
Ənvər müəllim telefonda da sifarişi rahat təhlil edib qərar verə bilsin.

## Auditdə müşahidə edilən hazırkı problem
Telefon eni 390px ilə:
- Başlıq "Material sifarişlərinin idarə edilməsi" 3 sətrə sınır.
- Aylıq hesabat mobildə yalnız seçilmiş bir ayı göstərir; obyektin il üzrə gedişatı itir.
- Sifariş sətirləri cədvəli 810px enindədir, ekranın istifadə olunan hissəsi isə 338px-dir; yana sürüşdürmək lazım gəlir.
- Sifariş səhifəsində qərar paneli "Niyə dəyişib?" təhlilindən əvvəl gəlir; qərar düymələri ekranın altında sabit deyil.
- Info (ⓘ) izahları yalnız mouse üzərinə gələndə açılır. Toxunanda açılmır; masaüstündə klik də heç nə açmır.

## İstədiyim nəticə
- Başlıq bir sətirə sığır.
- Mobil aylıq hesabatda obyektin il üzrə gedişatı görünür.
- Sifariş sətirləri telefonda yana sürüşdürmədən oxunur.
- Sifariş səhifəsinin ardıcıllığı: nə olub → niyə → qərar. Qərar düymələri ekranın altında sabitdir.
- Info izahları toxunanda və kliklə açılır.

## Qəbul edilmiş qərarlar
- İstisnalar bloku mobildə başlığın dərhal altındadır (Task 1b).
- Mobil kartlar da bazanı sifariş səhifəsinə ötürür (Task 1).

## Mütləq qorunmalı davranışlar
- Panel mobildə kart siyahısı kimi istifadəyə yararlı qalır (auditdə yaxşı qiymətləndirilib).
- Masaüstü görünüş dəyişmir.

## Out of scope
- Məbləğin ₼-dan ayrılmaması və "Server işləyir" yazısı — Task 5. Bu task yalnız həmin qaydanın telefonda işlədiyini yoxlayır.
- Qərar panelinin məzmunu və qaydaları (səbəbin məcburiliyi, təsdiq hüququ) — Task 4.
- 12 aylıq cədvəlin noutbukda açılma eni — Task 8.

## Acceptance — biznes dili ilə
- Telefonda başlıq bir sətirdir və Task 5-in məbləğ qaydası burada da işləyir.
- Aylıq hesabatda bir obyektin 12 aylıq gedişatını telefonda görə bilirəm.
- Sifariş sətirlərini yana sürüşdürmədən oxuyuram.
- Task 4-ün test sifarişini telefonda açıram, təhlilə baxıram və "Təsdiqlə" / "Düzəliş tələb et" düymələrini ekranın altında tapıram.
- ⓘ işarəsinə toxunanda izah açılır.

## Açıq suallar
Yoxdur.

---

