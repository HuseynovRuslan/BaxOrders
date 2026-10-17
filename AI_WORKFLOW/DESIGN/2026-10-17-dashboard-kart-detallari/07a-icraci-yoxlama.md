# 07a — İcraçının öz brauzer yoxlaması (qəbul sənədi deyil)

**Tarix:** 2026-10-17 · **Mərhələ:** 7 · **Kim:** icraçı (Playwright MCP) — **müstəqil `visual-qa` agenti hələ işlədilməyib**.
`DESIGN_WORKFLOW.md`-ə görə qəbul `visual-qa` + sahibdən gəlir; bu sənəd icraçının öz yoxlamasıdır.

**Mühit:** lokal — PostgreSQL `baxorders_dev` (sentyabr 2026-ya qədər, 167 sifariş), API `localhost:5080`, Vite
`localhost:5174`. Sahib Playwright pəncərəsində özü daxil oldu (real lokal data). Çətin hallar `page.route` ilə yalnız
«Fərq» siyahısının sorğusunu əvəz edərək yoxlandı. Ekran şəkilləri: `qa/` (gitignore).

## Ölçmələr — 1920, 1440, 1280, 1024, 768, 390, 360 px

Hər endə: bağlı → «Fərq» → «Məbləğ» → «Aktiv obyektlər» → Esc. Mövqelər sənəd koordinatları ilə.

| Meyar | Nəticə |
|---|---|
| AC-02 kartlar tərpənmir | 7/7 endə dörd kartın x, y, en, hündürlüyü bütün addımlarda eyni (Δ = 0) |
| AC-03 boşluq yoxdur | bağlıda region `hidden`, hündürlük 0; növbəti blokun yeri açılmadan əvvəl və bağlandıqdan sonra eyni; açıqda region = məzmun (qalıq 0 px), «Fərq» → «Aktiv obyektlər» keçidində region kiçilir |
| Sütunlar | 1920/1440/1280 → 4 · 1024/768/390 → 2 (2×2) · 360 → 1 |
| AC-11 telefon | 390: 2×2, rəqəm 16,4 px, heç bir rəqəm kartdan daşmır, etiket ≤ 2 sətir, cərgədə kartlar bərabər hündürlük; 360: 1 sütun; yana sürüşmə 0 (360 və 390) |
| 200% şrift (390) | kartlar 1 sütuna düşür, rəqəmlər daşmır |
| AC-04 URL | `?detal=ferq` → `mebleg` → `obyektler` → boş; brauzerin «Geri»si bölməni bağlayır və səhifədə qalır (kartlar arası keçid tarixçəyə addım yazmayıb) |
| AC-05 klaviatura | Enter → fokus bölmənin başlığında; Tab → «Detalları bağla»; Esc → bağlanır, fokus karta qayıdır |
| AC-07 ən böyük 5 | cədvəldəki 5 obyekt = «Fərq» siyahısının \|Δ\|-ə görə ilk 5-i (real data: Heydər Əliyev Mərkəzi, Novxanı, Fəvvarələr meydanı, Bakı Konqres Mərkəzi, Bayıl yolu) |
| AC-08 «Ətraflı» | dialog yoxdur; `?detal=ferq&obyekt=21`; sətir açıq və ekranda |
| AC-09 «Bütün obyektlər cədvəli» | yalnız sürüşür (başlıq ekranın yuxarısında), URL eyni |
| AC-10 uzun siyahı | real: «Hamısını göstər (19)»; saxta 120 obyekt: iki səhifə oxundu (60 + 60), «Hamısını göstər (60)», uzun adlar bükülür, yana sürüşmə 0 |
| AC-12 vəziyyətlər | siyahı sorğusu 500 → bölmədə xəta + «Yenidən cəhd et», təkrar cəhddən sonra yükləndi; boş siyahı → «Bu ay müqayisə ediləcək obyekt yoxdur» |
| Toxunma | 390-da regiondakı bütün düymə və keçidlər ≥ 44 px (düzəlişdən sonra) |
| Hərəkət | `prefers-reduced-motion: reduce` → `transition: none` |
| Konsol | xəta yoxdur (yalnız köhnə `favicon.ico` 404) |

## Açıq qalanlar

| ID | Ciddilik | Nə | Qeyd |
|---|---|---|---|
| Q-1 | S3 | «Fərq» siyahısının sorğusu xəta verəndə «Məbləğ dəyişiklikləri» cədvəli mesajsız gizlənir | «Fərq» bölməsi xətanı göstərir; cədvəl üçün mesaj ayrıca kiçik addımdır |
| Q-2 | S3 | 200% şriftdə səhifə 128 px yana sürüşür | mənbə yuxarıdakı «Aylıq / Aylıqdan kənar / Hamısı» seçicisidir — köhnə, bu işə aid deyil |
| Q-3 | S4 | Açılan obyekt sətrindəki «Detallara bax» keçidi telefonda < 44 px | `ObjectChangeBreakdown` «Ətraflı baxış»ın Drawer-i ilə ortaqdır və S-4-ə görə dəyişmədi |
| Q-4 | — | Müstəqil `visual-qa` yoxlaması edilməyib | layihə qaydasına görə qəbul üçün lazımdır |

**Test olunmayanlar:** real telefon/planşet cihazı (yalnız brauzer emulyasiyası); ekran oxuyucunun özü (yalnız
rol və ad yoxlamaları); `OutsideMonthly` növündə «Məbləğ» bölməsi brauzerdə (jsdom-da da ayrıca test yoxdur — mövcud
paneldən köçürülən siyahıdır); 100+ obyekt yalnız saxta data ilə; oktyabr datası (lokal baza sentyabrda bitir).
