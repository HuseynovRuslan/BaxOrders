# TASK 05a — TERMİNLƏR, VAHİDLƏR VƏ FORMAT (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-05.md` — the owner's settled requirement. It decides *what* and *why*; this file
decides *how*. Where this file and the brief disagree, the brief wins and the Coder stops and reports.
Part: **a of 2.** Task 05 is split into 05a (this file: words, units, number format, server status) and 05b
(`TASKS/TASK-05b.md`: technical identifiers — object/product codes, "Versiya", line counts, meaningless product
codes). 05b runs after 05a is accepted. Every acceptance criterion of the brief is assigned to a part — see §13.
Specification status: READY — written by the Planner on 2026-09-24 from the brief and the repository at `3d9a4ed`.

This task changes **frontend presentation only**. It changes no computed figure, no API, no database, no data. There
is no `DATA_MIGRATION` marker in this file, on purpose.

---

## 1. Context

The audit found the Rəhbər's screens speaking three dialects at once: old words ("Yeni sifarişlər", "mövqe",
"Trend"), two words for one idea ("Bütün dövr" / "Bütün dövrün ortalaması", "Qiyməti olmayanlar" / "Qiymət yoxdur"),
English unit codes (PCS, BAG), a manat sign that falls onto its own line at 1366 px and on a phone, and prices with
four decimals. The owner approved a term table (decision **5.1**) and fixed which words must not change.

"Heç bir rəqəm dəyişmir. Yalnız sözlər, vahidlər və format dəyişir." Rounding a price to two decimals *for display*
is format; nothing the backend computes, sums or compares changes.

## 2. Verified current behaviour (repository at `3d9a4ed`)

Read from the code, not assumed. Line numbers are at `3d9a4ed`.

### 2.1 Where the words live

The frontend (`frontend/bax-orders-web/src`) holds every word; the backend emits no display text for any of the terms
below (searched `src/` for each — no hit). The words are spread over several label modules:

| Module | Holds |
|---|---|
| `pricing/labels.ts` | Task 2's price words ("Qiymət yoxdur", "Daxili təminat", `missingPriceCount`, `internalSupplyCount`, `internalSupplierLabel`). Its header says "Task 5 extends this module to the rest of the app's terminology". |
| `coverage/labels.ts` | Task 1b's portfolio words ("Müqayisə olunan", "Sifariş qeydə alınmayıb", …) and `partialHistoryChipLabel = 'Tarixçə natamam'` (line 193). |
| `components/analytics/format.ts` | `knownAmountLabel = 'Məlum qiymətlər üzrə'` (13), `weightedPriceLabel = 'Çəkili orta qiymət'` (16) and its hint (18–19), `basisLabels.AllPriorMonths = 'Bütün dövr'` (30) while `describeBasis` says `'Bütün dövrün ortalaması'` (70), money/price formatters (218–234). |
| `components/analytics/labels.ts` | `stateLabels` (38–46): `New: 'Yeni'`, `NoLongerOrdered: 'Artıq sifariş olunmur'`; `formatVariantLine` (123–133) prints `orderUnitCode` / `specificationUnitCode` raw. |
| `components/analytics/trend.ts` | `frequencySentence` (56–67): "Son N mövcud aydan M-də sifariş edilib" — always "-də". |
| `components/decisions/labels.ts` | `causeLabels` (10–18): `NewOrders: 'Yeni sifarişlər'`, `NoLongerOrdered: 'Artıq sifariş olunmayanlar'`, `UnattributedDueToMissingPrice: 'Qiyməti olmayanlar'`; `driverFilterLabels` (63–70): `NewOrders: 'Yeni'`, `NoLongerOrdered: 'Artıq sifariş olunmur'`; `incompleteExplanationNote` (101–102). |
| `components/dashboard/labels.ts` | `causeHeadline` (93–110): "Yeni sifarişlər", "Artıq sifariş olunmayanlar", "Qiymət məlumatı çatışmır"; `attentionReasonLabels.MissingRequiredPrice = 'Qiymət məlumatı natamamdır'` (123); `partialHistoryNote = 'Tarixçə natamamdır'` (173); `incompleteExplanationNote = 'Məbləğin bir hissəsi izah edilə bilmir — qiymət yoxdur'` (175); `historyCoverageLabels.Partial = 'Natamam tarixçə'` (13); `partialAmountNote` (87), `partialHistoryCoverageNote` (163), `sortLabels` (56–67) — the last four have no importer outside the file. |
| `components/imports/labels.ts` | `knownAmountLabel = 'Məlum qiymətlər üzrə'` (187), `formatAmount` (189–194), `formatOrderUnit` (219–221) returns the code raw, `formatItemSpecification` (205–216) prints the spec unit code raw. |
| `components/approvals/labels.ts` | `knownAmountRowLabel = 'Məlum qiymətlər üzrə'` (74), `missingPriceRowNote` → "N qiymətsiz sətir" (76–78), `sortLabels.KnownAmount = 'Məlum məbləğ'` (49). |
| `components/workflow/labels.ts` | `workflowActionLabels.ReturnedForCorrection = 'Düzəlişə qaytarıldı'` (34) while the action is "Düzəliş tələb et" (52); `missingPriceWarning` → "Bu sifarişdə N qiymətsiz sətir var. …" (140–142). |

### 2.2 Where the words are said

- **"Yeni sifarişlər" / "Artıq sifariş olunmayanlar"**: `CauseSummary.tsx:40` and `DriverList.tsx:103` (via
  `causeLabels`); `AttentionSection.tsx:137,147` and `LocationRows.tsx:262` (via `causeHeadline`). Filter chips
  "Yeni" / "Artıq sifariş olunmur" in `DriverList.tsx:73`. Analytics states in `LocationAnalyticsPage.tsx:269`
  (filter options), `AnalyticsSummary.tsx:87–90,186–187` (counts and a notice), `ComparisonRows.tsx:243` (row badge).
- **"mövqe"**: `CauseSummary.tsx:45`; `LocationAnalyticsPage.tsx:287,304,319`.
- **"Məlum qiymətlər üzrə …"**: `OrderDetailPage.tsx:227`; `LocationDetailPage.tsx:96` ("… cəm");
  `AnalyticsSummary.tsx:51`; `ApprovalRows.tsx:184`; `WorkflowPanel.tsx:159`; `WorkflowDialog.tsx:108`;
  `format.ts:277` (`amountHeading`, no caller). "Məlum məbləğ": approvals sort (`labels.ts:49`); "Cari məlum
  məbləğ": `ComparisonRows.tsx:143`.
- **"Çəkili orta qiymət"**: `ComparisonRows.tsx:211` and the hint in `format.ts:18–19`.
- **"Tarixçə natamam"**: `DashboardSummary.tsx:202` (chip); "Tarixçə natamamdır" `LocationRows.tsx:299`;
  "Natamam tarixçə nə deməkdir?" `DecisionHeadline.tsx:136`.
- **"Son 9 mövcud aydan 3-də"**: `TrendModal.tsx:281` via `frequencySentence`.
- **"Trend"**: `TrendModal.tsx:69` (error), `92` (modal title), `116` (group label); `ComparisonRows.tsx:71,150`
  (column), `253` ("… üzrə trendə bax"), `257` (button text).
- **"Bütün dövr"**: the picker button (`BasisPicker.tsx:81` via `basisLabels`); every result text says "Bütün dövrün
  ortalaması".
- **"Qiyməti olmayanlar"** (cause) vs **"Qiymət yoxdur"** (line); also "Yalnız qiyməti olmayanlar"
  (`OrderDetailPage.tsx:309`) and "Qiymət məlumatı çatışmır" (dashboard cause headline).
- **Nərimanov heykəli**: `LocationTrend.tsx:71` says "N məhsulun qiyməti yoxdur"; the table below says
  `missingPriceCount` → "N sətirdə qiymət yoxdur".
- **"40 sətir · 2 sətirdə qiymət yoxdur"**: `DecisionHeadline.tsx:56–62`; the same shape in the fallback headline
  `OrderDetailPage.tsx:233–236`, `AnalyticsSummary.tsx:55–56` ("N sətir · N qiymətsiz") and the inbox row
  `ApprovalRows.tsx:183–187` ("N sətir", "Məlum qiymətlər üzrə", "N qiymətsiz sətir").
- **"qiymətsiz"** on Rəhbər screens: `ApprovalSummary.tsx:31,33` ("Qiymətsiz sifarişlər", "N qiymətsiz sətir");
  `approvals/labels.ts:77`; `AnalyticsSummary.tsx:56,72`; `WorkflowHistory.tsx:39`; `workflow/labels.ts:141`;
  `TrendModal.tsx:243` ("N sətir qiymətsiz").
- **The attention sentence**: `dashboard/labels.ts:175` "Məbləğin bir hissəsi izah edilə bilmir — qiymət yoxdur"
  (cards `AttentionSection.tsx:163`, rows `LocationRows.tsx:303`); the order page says a different sentence,
  `decisions/labels.ts:101–102` (`CauseSummary.tsx:66`).

### 2.3 Units

- The unit catalogue stores a code, a name and a symbol (`Persistence/Seed/ReferenceData.cs:15–28`): PCS "Ədəd",
  PACK "Paçka", PAIR "Cüt", CM "Santimetr"/sm, M "Metr"/m, G "Qram"/qr, KG "Kiloqram"/kq, ML "Millilitr"/ml,
  L "Litr"/lt, MM "Millimetr"/mm, BAG "Kisə". Units added later through import review include square metre and roll
  (`docs/business-decisions.md` DB-05: `kv`/`kv.m` → "Kvadrat metr / m²", `top` → "Top (rulon)"), set ("Dəst") and
  "Dəfə"; the analytics code knows `MONTH` and `TIME` (`AnalyticsContracts.cs:169–170`); `UnitTypeTests.cs:12` uses
  `M2` / "Kvadrat metr" / "m²".
- Every API that carries a unit carries its **code and its name**: `orderUnitCode` + `orderUnitName`,
  `specificationUnitCode` + `specificationUnitName` (`api/orders.ts:113–120`, `api/analytics.ts:34–41`).
- The screens print the **code**: `formatOrderUnit` (`imports/labels.ts:219–221`) → the order page's "Ö/v" column
  (`OrderDetailPage.tsx:332,374–378`), `DriverList.tsx:165–167` ("71 → 0 PCS"), `TrendModal.tsx:89,177,323–324`;
  `formatVariantLine` (`analytics/labels.ts:123–133`) → the line under every product name in `DriverList`,
  `ComparisonRows`, `TrendModal`; `formatItemSpecification` → the order page's "Spesifikasiya" column.
- Import-review screens print the Excel label (`orderUnitLabel`) or the catalogue code on purpose — that is what an
  administrator resolves there.

### 2.4 Money and prices

- Three formatters append `' ₼'` with an ordinary space: `formatMoney` and `formatPrice` (`analytics/format.ts:228–234`)
  and `formatAmount` (`imports/labels.ts:192–194`). The ordinary space is a line-break opportunity, which is how
  "99,00 ₼" breaks into "99,00" / "₼" in a narrow table cell at 1366 px and on a phone. `formatMoneyDelta` and every
  money string on the Rəhbər's screens go through one of the three.
- `formatPrice` allows up to four decimals (`priceFormat`, `format.ts:220`): "32,1273 ₼". It is used for unit prices in
  `DriverList.tsx:177–178`, `ComparisonRows.tsx:211`, `TrendModal.tsx:235,330–331`, `trend.ts:43` (chart values).
  `formatAmount` already shows two decimals and is what the order-line price cell uses (`OrderDetailPage.tsx:531`).

### 2.5 The server badge

`layout/Header.tsx:30–46` (`ApiStatus`) shows a permanent pill: "Yoxlanılır…" while loading, **"Server işləyir"** with
a green dot on success, "Server əlçatan deyil" with a red dot on failure. It is on every signed-in page.

### 2.6 What Task 04a left to Task 5

`TASK-04a.md` §4 and §5.5 left to Task 5: the panel's amount line ("Məlum qiymətlər üzrə məbləğ: … · N sətir",
`WorkflowPanel.tsx:158–161`), the history label "Düzəlişə qaytarıldı", the "Düzəliş tələb olunur. … yeni versiya
yaradılır." note (that one is **05b**, it is about "versiya"), and the "Versiya N" texts (05b).

---

## 3. The split, and the seam

| Part | Carries |
|---|---|
| **05a** (this file) | the 5.1 term table; every "different words for one idea" pair of the brief; units in Azerbaijani; ₼ never separated from its amount; prices to two decimals; "Server işləyir" only when there is a problem; 04a's hand-offs about wording (panel amount line, history label). |
| **05b** | object and product codes (LOC-…, PRD-…), meaningless product codes under a product name ("2.8", "20078331", "M-101-S-2"), "Versiya", "Sətir sayı", code-mentioning search placeholders. |

Left to 05b **by name** (not done here, and must not be done here): removing `locationCode` / `productCode` /
`modelCode` from any screen; removing or rewording any "Versiya"/"versiya" text; removing the "Sətir sayı" column or
fact; the "Düzəliş tələb olunur. Düzəliş bu versiyada aparılmır: yeni versiya yaradılır." note. The brief's first
acceptance line ("heç bir LOC/PRD kodu, 'Versiya' və 'Server işləyir' görmürəm") is **completed by 05b**; 05a
delivers its "Server işləyir" part.

## 4. Scope

In scope:

- A. one home for the approved words, and the 5.1 table applied everywhere the old word is said;
- B. every pair the brief lists as "eyni anlayış üçün fərqli sözlər" reduced to one word;
- C. units as Azerbaijani words;
- D. money and prices: ₼ glued to the amount, prices to two decimals;
- E. the server badge only when something is wrong;
- F. tests, including one that renders the Rəhbər's screens and proves no old term remains.

Out of scope:

- everything listed for 05b in §3;
- repetition and visual weight of warnings on the cards — Task 9 (brief);
- the order and emphasis of the "Niyə dəyişib?" sections — Task 6 (brief);
- menus by role — Task 14 (brief);
- colours: this task changes no colour class (Task 9 owns the colour rule, 9.1);
- import, catalogue and pricing-classification screens (administrator screens) — except that they share the
  money/price formatters, so they get the same ₼ and two-decimal format for free. Raw Excel values shown there
  (`ImportRowsTable`, `ItemSourceDrawer` source fields) are evidence and stay as they are;
- the "Mənbəyə bax" drawer (`components/orders/ItemSourceDrawer.tsx`) — the last level, kept as it is (brief).

## 5. Required behaviour

### 5.1 One home for the approved words (A)

Create `src/terminology/terms.ts` holding the 5.1 words as named constants, and import them wherever they are said,
instead of repeating string literals:

```ts
export const newProductsLabel = 'Yeni məhsullar'
export const notOrderedThisMonthLabel = 'Bu ay yazılmayan məhsullar'
export const productNoun = 'məhsul'                       // was "mövqe"
export const pricedLinesTotalLabel = 'Qiyməti olan sətirlərin cəmi'
export const averagePriceLabel = 'Orta qiymət'
export const limitedComparisonDataLabel = 'Müqayisə üçün data azdır'
export const productHistoryLabel = 'Məhsul tarixçəsi'
export const allPriorMonthsLabel = 'Bütün dövrün ortalaması'
```

Update the header comment of `pricing/labels.ts` so it points to `terminology/` as the home of the general terms and
stays the home of the price words (Task 2). Task 2's words are **not** moved or renamed.

### 5.2 The 5.1 table, applied (A)

| Old (brief) | New (5.1) | Where, exactly |
|---|---|---|
| Yeni sifarişlər | **Yeni məhsullar** | `causeLabels.NewOrders`; `causeHeadline('NewOrders')`; `driverFilterLabels.NewOrders` (was "Yeni"); analytics `stateLabels.New` (was "Yeni") — see 5.2.1. |
| Artıq sifariş olunmayanlar / Artıq sifariş olunmur | **Bu ay yazılmayan məhsullar** | `causeLabels.NoLongerOrdered`; `causeHeadline('NoLongerOrdered')`; `driverFilterLabels.NoLongerOrdered`; analytics `stateLabels.NoLongerOrdered` — see 5.2.1. |
| mövqe | **məhsul** | `CauseSummary.tsx:45` → "N məhsul"; `LocationAnalyticsPage.tsx:287,319` → "N məhsul"; `:304` → "Bu bölmədə göstəriləcək məhsul yoxdur." |
| Məlum qiymətlər üzrə məbləğ / cəm | **Qiyməti olan sətirlərin cəmi** — or hidden where the same money is already on the screen | see 5.2.2 |
| Çəkili orta qiymət | **Orta qiymət** | `weightedPriceLabel` → "Orta qiymət"; its hint → `Orta qiymət miqdar nəzərə alınaraq hesablanır: 1 ədəd 10 ₼-dan və 9 ədəd 20 ₼-dan alınıbsa, orta qiymət 19 ₼-dır, 15 ₼ deyil.` (with the no-break space of 5.5 before each ₼). |
| Tarixçə natamam | **Müqayisə üçün data azdır** | `partialHistoryChipLabel`; `partialHistoryNote` (was "Tarixçə natamamdır"); `DecisionHeadline.tsx:136` InfoHint label → `Müqayisə üçün data azdır — bu nə deməkdir?`; `historyCoverageLabels.Partial` and `partialHistoryCoverageNote` — reword with the new term, or delete if nothing imports them (they have no importer at `3d9a4ed`). |
| Son 9 mövcud aydan 3-də | **Son 9 ayın 3-də sifariş edilib** | `frequencySentence`, see 5.2.3. |
| Trend | **Məhsul tarixçəsi** | `TrendModal`: title, error "Məhsul tarixçəsi yüklənmədi", metric group label "Göstərici"; `ComparisonRows`: the column's `sr-only` header, the button's visible text, and its `aria-label` → `${productName} — məhsul tarixçəsinə bax`. The component and file names (`TrendModal`, `trend.ts`) do not change. |

#### 5.2.1 Plural in lists, one word on a single row

Categories, filter chips, filter options and counts are about several products and use the 5.1 words exactly:
"Yeni məhsullar", "Bu ay yazılmayan məhsullar". A badge on **one** product's row (`ComparisonRows` `StateBadge`)
reads the same word in the singular: add `stateBadgeLabels` in `analytics/labels.ts` with `New: 'Yeni'`,
`NoLongerOrdered: 'Bu ay yazılmayıb'` and every other state equal to `stateLabels`; `StateBadge` uses it.
`AnalyticsSummary`'s notice (186–187) quotes the plural list words.

#### 5.2.2 "Məlum qiymətlər üzrə …", place by place

| Place | Becomes |
|---|---|
| `OrderDetailPage.tsx:227` fallback headline, incomplete | `Qiyməti olan sətirlərin cəmi` |
| `AnalyticsSummary.tsx:51`, incomplete | `Qiyməti olan sətirlərin cəmi` |
| `LocationDetailPage.tsx:96` fact | `Qiyməti olan sətirlərin cəmi` |
| `WorkflowDialog.tsx:108` fact, incomplete | `Qiyməti olan sətirlərin cəmi` (complete stays `Məbləğ`) |
| `WorkflowPanel.tsx:158–161` amount line | **removed**. The page headline shows the same amount directly beside the panel; the panel keeps its missing-price note (`missingPriceNote`). |
| `ApprovalRows.tsx:184` under the amount | **removed**. The line under it already says "N sətirdə qiymət yoxdur" (5.3). |
| `analytics/format.ts` `knownAmountLabel`, `amountHeading` | `knownAmountLabel` = `Qiyməti olan sətirlərin cəmi`; `amountHeading` has no caller — delete it, or keep it using the new word. |
| `imports/labels.ts:187` `knownAmountLabel` | same new word; its two importers are the rows above. |
| `approvals/labels.ts:74` `knownAmountRowLabel` | delete (no longer used). |
| `dashboard/labels.ts:87` `partialAmountNote` | reword to `Məbləğ müqayisəsi qiyməti olan sətirlər üzrə hesablanıb.`, or delete if nothing imports it. |
| approvals `sortLabels.KnownAmount` "Məlum məbləğ" | `Məbləğ` |
| `ComparisonRows.tsx:143` "Cari məlum məbləğ" | `Cari məbləğ` |

#### 5.2.3 "Son 9 ayın 3-də sifariş edilib"

`frequencySentence(frequency)`:

- no available month → unchanged (`Bu obyektin göstəriləcək sifarişi yoxdur`);
- none ordered → `Son ${N} ayın heç birində sifariş edilməyib`;
- otherwise → `Son ${N} ayın ${M}-${locativeSuffix(M)} sifariş edilib`.

`locativeSuffix(n)` (new, in `terminology/terms.ts`, unit-tested) returns `da` or `də` by the vowel of the last
number word that is pronounced — the same approach as 04a's `ordinalSuffix`:

| last non-zero part | suffix |
|---|---|
| units 1 bir, 2 iki, 3 üç, 4 dörd, 5 beş, 7 yeddi, 8 səkkiz | `də` |
| units 6 altı, 9 doqquz | `da` |
| tens 20 iyirmi, 50 əlli, 70 yetmiş, 80 səksən | `də` |
| tens 10 on, 30 otuz, 40 qırx, 60 altmış, 90 doxsan | `da` |
| hundreds (yüz), thousands (min) | `də` |
| millions (milyon) | `da` |

So "3-də", "6-da", "9-da", "10-da", "11-də", "12-də", "20-də", "40-da", "100-də".

### 5.3 One word for one idea — the brief's pairs (B)

| Pair in the brief | Resolution |
|---|---|
| "Bütün dövr" (button) / "Bütün dövrün ortalaması" (result) | `basisLabels.AllPriorMonths` = `Bütün dövrün ortalaması`. Every text already says so; `describeBasis*` keep their forms ("…ortalamasına görə", "…ortalamasından"), which are grammatical cases of the same name. |
| "Artıq sifariş olunmur" (filter) / "Artıq sifariş olunmayanlar" (badge) | both → `Bu ay yazılmayan məhsullar` (5.2). |
| "Qiyməti olmayanlar" ("Niyə dəyişib?") / "Qiymət yoxdur" (line) | `causeLabels.UnattributedDueToMissingPrice` → `Qiymət yoxdur` (`missingPriceShortLabel`); `causeHeadline('UnattributedDueToMissingPrice')` ("Qiymət məlumatı çatışmır") → `Qiymət yoxdur`; `attentionReasonLabels.MissingRequiredPrice` ("Qiymət məlumatı natamamdır") → `Qiymət yoxdur`; the order page's line filter (`OrderDetailPage.tsx:307–309`) → `Bütün sətirlər` / `Qiyməti olan sətirlər` / `Qiymət yoxdur`. The cause's hint text (`causeHints`) may keep its explanatory sentence. |
| Nərimanov heykəli: "1 məhsulun qiyməti yoxdur" (header) / "1 sətirdə qiymət yoxdur" (table) | `LocationTrend.tsx:71` → `missingPriceCount(n)`. |
| "40 sətir · 2 sətirdə qiymət yoxdur" — "sətir" twice | The total line count is dropped from these summary lines; Task 2's sentences stay word for word. `DecisionHeadline.tsx:55–72` and `OrderDetailPage.tsx:232–237`: the line shows only `missingPriceCount(…)` and `internalSupplyCount(…)`, joined by ` · `, and is not rendered when both are zero. `AnalyticsSummary.tsx:54–57`: the same, with `missingPriceCount` instead of "N qiymətsiz". `ApprovalRows.tsx:183`: the "N sətir" line is removed. (The line count itself as a figure is 05b's subject; here it is removed only where it doubled the word.) |
| old "qiymətsiz sifarişlər" / "qiymətsiz sətir" in summaries | every one goes through Task 2's `missingPriceCount` (`N sətirdə qiymət yoxdur`): `ApprovalSummary` label → `Qiyməti olmayan sətiri olan sifarişlər`, note → `missingPriceCount(items)`; `approvals missingPriceRowNote` → `missingPriceCount`; `AnalyticsSummary.tsx:72–73` → `Müqayisə dövründə də ${missingPriceCount(n)} — hər iki məbləğ tam deyil.`; `WorkflowHistory.tsx:39` → `Təsdiq zamanı qeyd edilib: ${missingPriceCount(n)}.`; `missingPriceWarning(n)` → `${missingPriceCount(n)}. Təsdiq edilən məbləğ tam deyil.`; `TrendModal.tsx:243` → `missingPriceCount(n)`. |
| the attention-card sentence ("Məbləğin bir hissəsi izah edilə bilmir — …") | **one** sentence for the dashboard cards, the dashboard rows and the order page: `Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.` Define it once (`terminology/terms.ts`, `incompleteExplanationNote`) and import it in `CauseSummary`, `AttentionSection` and `LocationRows`; delete the two old constants. Where it is shown and how loudly is unchanged (Task 9). |

One more pair that is the same idea as the 04a action and is 04a's hand-off: the history label
`workflowActionLabels.ReturnedForCorrection` "Düzəlişə qaytarıldı" → **`Düzəliş tələb olundu`**, matching the action
"Düzəliş tələb et" and the status "Düzəliş tələb olunur".

### 5.4 Units in Azerbaijani (C)

Create `src/terminology/units.ts`:

```ts
/** The word a reader sees for a unit. Never an English code. */
export function unitWord(code: string | null | undefined, name?: string | null): string | null
```

- `null`/empty code → `null`.
- A known code → its word (case-insensitive on the code):

  | Code | Word | Source |
  |---|---|---|
  | PCS | ədəd | brief |
  | BAG | kisə | brief |
  | PACK | paket | brief |
  | PAIR | cüt | brief |
  | ROLL | rulon | brief |
  | L | litr | brief |
  | M2 | m² | brief |
  | KG | kq | brief |
  | CM | sm | the catalogue's own symbol |
  | M | m | the catalogue's own symbol |
  | MM | mm | the catalogue's own symbol |
  | G | qr | the catalogue's own symbol |
  | ML | ml | the catalogue's own symbol |
  | MONTH | ay | `docs/business-decisions.md` (Task 5 of the import track: "ay"/MONTH) |
  | TIME | dəfə | the catalogue's name "Dəfə" |

- Any other code → the unit's own catalogue **name**, lower-cased with the Azerbaijani locale
  (`toLocaleLowerCase('az')`), when the API gave one (e.g. a set unit named "Dəst" → "dəst"); otherwise the code as
  it is. The code is the last resort, never the first.

Use it everywhere a unit is shown to a reader:

- `formatOrderUnit(code, name?)` (`imports/labels.ts`) → `unitWord(code, name) ?? 'Vahidsiz'` (unchanged for no
  unit). Every caller passes the name where it has one (`orderUnitName`).
- `formatItemSpecification` and analytics `formatVariantLine`: the specification's unit is
  `unitWord(specificationUnitCode, specificationUnitName)`; the order unit is `unitWord(orderUnitCode, orderUnitName)`.
  The descriptor ("28 diş") still wins over the unit, as today.
- `DriverList` quantity ("71 → 0 ədəd"), `TrendModal` quantities and `ComparisonDetail`, the order page's unit column.
- The order page's column header "Ö/v" (an Excel abbreviation) → `Vahid`; the cell no longer needs the
  `title={orderUnitName}` tooltip (remove it).

Not changed: import-review screens that show the Excel label or ask for a catalogue code (`CreateResolutionDialog`,
`MapExistingDialog`, `RowDetailDialog`, `formatVariantSummary`), and the unit catalogue itself — **no stored unit
name or symbol changes** (for example, PACK's stored name stays "Paçka"; only the displayed word is "paket", as the
brief says).

### 5.5 Money and prices (D)

- One no-break suffix, `export const manatSuffix = ' ₼'` (in `analytics/format.ts`), used by `formatMoney`,
  `formatPrice` and `imports/labels.ts` `formatAmount` instead of `' ₼'`. `formatMoneyDelta` and every money string
  inherit it. No money string on any screen is built with an ordinary space before ₼; search for `' ₼'` / `" ₼"`
  in `src/` (outside comments and tests) and fix any other occurrence the same way (e.g. `weightedPriceHint`).
- `formatPrice` shows **exactly two decimals** (`minimumFractionDigits: 2, maximumFractionDigits: 2`): "32,13 ₼".
  This is display rounding only; the value passed in, every sum, delta and percentage computed by the backend, and
  every test fixture value stay as they are. Price **input** fields in the correction dialogs keep the precision they
  have — they are not displays.
- Quantities (`formatQuantity`, `formatNumber`) keep their own precision; they are not money.
- Where a money figure sits in a table cell or a card beside other text, nothing else is needed: with the no-break
  space the figure and ₼ cannot be split. Do not add `whitespace-nowrap` wholesale.

### 5.6 The server badge only when something is wrong (E)

`layout/Header.tsx` `ApiStatus`:

- while checking → renders nothing (no "Yoxlanılır…" flash on every page load);
- healthy → renders nothing. The text "Server işləyir" is removed from the code;
- unreachable → as today: red dot, `Server əlçatan deyil`, and add `role="status"` so it is announced.

### 5.7 Words that must not change

These are the brief's list and 04a/04b's accepted wording. Do not edit them; tests assert them:

- **Task 2:** `Qiymət yoxdur` (amber), `Daxili təminat` (neutral), `N sətirdə qiymət yoxdur`,
  `N sətir daxili təminat (ödənişsiz)`, `Daxili: Azpetrol baza` (i.e. `internalSupplierLabel`).
- **Task 1b:** `Müqayisə olunan`, `Sifariş qeydə alınmayıb`, `Müqayisə bazası yoxdur`, `Qiymət yoxdur · N obyekt`,
  `10 obyektin sifarişində qiyməti olmayan sətir var` (i.e. `missingPriceLocationsNote`).
- **Task 3:** `Sistemdə hələ sifarişi yoxdur` and the objects' full names (data, not code — untouched).
- **04a:** `Düzəliş tələb et`, the submission count words (`İlk göndəriş`, `İkinci göndəriş · düzəliş tələbindən
  sonra`, …), the exact 4.1 sentence `Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.`, the
  missing-authority note.
- **04b:** the sandbox banner text in `src/environment/labels.ts`, word for word.
- "Mənbə və versiya məlumatı" (TrendModal's folded section) and "Mənbəyə bax" — kept (brief).

---

## 6. Frontend requirements — summary for the Coder

New: `src/terminology/terms.ts`, `src/terminology/units.ts` (+ their tests).

Changed (expected; the Coder searches for more): `pricing/labels.ts` (header comment only),
`coverage/labels.ts`, `components/analytics/{format,labels,trend}.ts`, `components/analytics/{TrendModal,
ComparisonRows,AnalyticsSummary,BasisPicker?}.tsx`, `components/decisions/{labels.ts,CauseSummary.tsx,DriverList.tsx,
DecisionHeadline.tsx}`, `components/dashboard/{labels.ts,DashboardSummary.tsx,LocationRows.tsx,AttentionSection.tsx}`,
`components/approvals/{labels.ts,ApprovalRows.tsx,ApprovalSummary.tsx}`, `components/workflow/{labels.ts,
WorkflowPanel.tsx,WorkflowDialog.tsx,WorkflowHistory.tsx}`, `components/imports/labels.ts`,
`components/locations/LocationTrend.tsx`, `pages/{OrderDetailPage,LocationDetailPage,LocationAnalyticsPage}.tsx`,
`layout/Header.tsx`.

## 7. Backend

None. No C# file changes, no API contract change, no migration. If any requirement here seems to need one, **STOP**
and report why.

## 8. Safety and STOP conditions

- **No database access.** Do not connect to `baxorders_dev` or any database; do not run `psql`, `pg_dump`,
  `dotnet ef`, `dotnet run`, or any tool under `tools/`. Backend tests use their own throw-away databases as always.
- No data change of any kind; HD-002's 94 rows are not touched (no access anyway).
- Do not change any computed figure, rounding in the backend, sum, delta, percentage, sort or filter behaviour. Only
  words, units and display format.
- Do not edit the words in §5.7.
- Do not do 05b's work (§3). If a change here would require removing a code or a "Versiya", leave it for 05b and
  note it in the report.
- Do not commit, push or merge. Do not edit anything under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, or a requirement here cannot be met without changing an owner decision,
  STOP with `BLOCKED_HUMAN` and say which line.

## 9. Invariants — MUST NOT CHANGE

- Every figure on every screen: amounts, deltas, percentages, counts (Tasks 1, 1b, 1c). Only prices are *displayed*
  to two decimals.
- Task 1's comparison basis in the URL; Task 1b's cohort and partition; Task 2's classifications and colours;
  Task 3's 27-object catalogue and counts.
- 04a's decision panel structure (action row first, facts, sticky column) — only the amount line leaves it (5.2.2)
  and the history label changes (5.3).
- 04b's sandbox banner and its behaviour.
- The "Mənbəyə bax" drawer and TrendModal's folded "Mənbə və versiya məlumatı" section.
- No colour class changes.
- No backend change; no schema change; no data change.

## 10. Acceptance criteria (this part)

1. On the dashboard, the order page, the object page, the object comparison page, the monthly report, the approval
   inbox and the product history, none of these appears: "Yeni sifarişlər", "Artıq sifariş olunmayanlar",
   "Artıq sifariş olunmur", "mövqe", "Məlum qiymətlər üzrə", "Məlum məbləğ", "Çəkili orta qiymət",
   "Tarixçə natamam", "Natamam tarixçə", "mövcud aydan", "Trend", a button reading exactly "Bütün dövr",
   "Qiyməti olmayanlar", "Qiymət məlumatı çatışmır", "Qiymət məlumatı natamamdır", "qiymətsiz" (any case),
   "məhsulun qiyməti yoxdur", "Düzəlişə qaytarıldı", "Server işləyir", "Ö/v".
2. The new words appear where the old ones were: "Yeni məhsullar", "Bu ay yazılmayan məhsullar", "məhsul",
   "Qiyməti olan sətirlərin cəmi", "Orta qiymət", "Müqayisə üçün data azdır", "Son 9 ayın 3-də sifariş edilib",
   "Məhsul tarixçəsi", "Bütün dövrün ortalaması", "Düzəliş tələb olundu".
3. In a Fəvvarələr-shaped fixture, `DriverList` shows "71 → 0 ədəd" (not "PCS") and a 32.1273 price as "32,13 ₼"
   (brief acceptance).
4. No unit code from the brief's list (PCS, BAG, PACK, PAIR, ROLL, L, M2, KG) is shown as a unit on those screens;
   each shows its Azerbaijani word; an unknown code shows its catalogue name in lower case.
5. Every money and price string produced by `formatMoney`, `formatMoneyDelta`, `formatPrice` and `formatAmount` has a
   no-break space before ₼, so no amount is separated from ₼ at 1366 px or on a phone (brief acceptance). Every price
   is shown with two decimals.
6. With a healthy server the header shows no server text; with an unreachable one it shows "Server əlçatan deyil".
7. Each pair of §5.3 now reads with one word; the Nərimanov-shaped object page says "N sətirdə qiymət yoxdur" in
   both places; no summary line says "N sətir · N sətirdə qiymət yoxdur".
8. Every word of §5.7 is unchanged, word for word.
9. No figure changed: all existing backend tests pass unchanged; frontend tests that changed did so only for words,
   units or format, and each is listed in the report with the reason.
10. All suites and both builds are green.

## 11. Required tests

Frontend (vitest):

- `terminology/units.test.ts`: every code of §5.4 → its word, case-insensitive; an unknown code with a name → the
  lower-cased name ("Dəst" → "dəst"; "İ" lower-cases to "i"); an unknown code without a name → the code; null/empty →
  null; `formatOrderUnit(null)` → "Vahidsiz".
- `terminology/terms.test.ts`: `locativeSuffix` for 1–12, 20, 30, 40, 50, 60, 70, 80, 90, 100, 1000.
- `components/analytics/format.test.ts` (extend): `formatMoney`, `formatMoneyDelta`, `formatPrice` and `formatAmount`
  put ` ` before ₼ and never an ordinary space; `formatPrice(32.1273)` is `32,13 ₼`; `formatPrice(2.8)` is
  `2,80 ₼`; `basisLabels.AllPriorMonths` equals `describeBasis('AllPriorMonths', …)`.
- `frequencySentence`: "Son 9 ayın 3-də sifariş edilib", "Son 12 ayın 6-da sifariş edilib", "Son 10 ayın 9-da …",
  and the none-ordered sentence.
- `DriverList.test.tsx` (extend): the Fəvvarələr case of §10.3; the filter chips read "Yeni məhsullar" and
  "Bu ay yazılmayan məhsullar"; the unattributed cause badge reads "Qiymət yoxdur".
- `CauseSummary.test.tsx` (extend): "N məhsul", the one incomplete-explanation sentence.
- `Header` test (new): nothing rendered while loading and on success; "Server əlçatan deyil" on failure.
- `LocationTrend.test.tsx` (extend): "N sətirdə qiymət yoxdur".
- **The old-terms sweep** (new, e.g. `src/terminology/oldTerms.test.tsx`): renders, with the existing fixtures,
  `ManagementDashboardPage`, the order decision page (`OrderDecisionPage.test.tsx`'s setup), `LocationDetailPage`,
  `LocationAnalyticsPage`, `MonthlyReportPage`, `ApprovalInboxPage` and an open `TrendModal`, and asserts that the
  rendered text (`document.body.textContent`, plus `aria-label`s) contains none of the §10.1 strings and no
  `,\d{3,4}\s?₼` four-decimal price. Keep the list of old terms in one exported array so 05b can extend it.
- Existing tests that assert an old word, "PCS", "Server işləyir", four-decimal prices or an ordinary space before ₼
  change with this task; update them and list each in the report (expected: `TrendModal`, `format`, `DriverList`,
  `CauseSummary`, `ComparisonRows`, `DashboardSummary`, `LocationRows`, `ManagementDashboardPage`, `OrderDecisionPage`,
  `ApprovalRows`, `WorkflowPanel`, `WorkflowDialog`, `LocationsPage`, `MonthlyReportPage`, `PricingModeReviewPage`).
  Note: Testing Library's default text normalizer treats ` ` as whitespace, so `getByText('1.234,00 ₼')` keeps
  matching; exact string comparisons (`toBe`) must use ` `. Never loosen an expectation to make it pass.

Backend: no new tests (no backend change). Run both suites to prove nothing moved.

## 12. Expected verification

- `dotnet build BaxOrders.slnx` — 0 warnings, 0 errors (use `--artifacts-path` if the running API locks `bin`, and
  say so).
- `dotnet test` — unit and integration all green, with counts (04b's accepted numbers: 797 unit, 609 integration —
  they must be unchanged, since no backend code changes).
- `npx tsc -b --noEmit`, `npx vitest run` (04b's accepted number: 448), `npm run build` — all green.
- `git diff --stat`, `git status`: changes only under `frontend/bax-orders-web/src/`.

## 13. Where each brief acceptance criterion lands

| Brief acceptance (business language) | Part |
|---|---|
| Panel, sifariş və obyekt səhifələrində heç bir LOC/PRD kodu, "Versiya" və "Server işləyir" görmürəm. | "Server işləyir": **05a** (§5.6). LOC/PRD, "Versiya": **05b**. Complete after 05b. |
| Fəvvarələr sifarişində "71 → 0 PCS" əvəzinə "71 → 0 ədəd", "32.1273 ₼" əvəzinə 2 onluqlu qiymət görürəm. | **05a** (§5.4, §5.5) |
| 1366-da və telefonda heç bir məbləğ ₼-dan ayrılmır. | **05a** (§5.5) |
| Sifariş səhifəsində "Yeni məhsullar", "Bu ay yazılmayan məhsullar", paneldə "Müqayisə üçün data azdır" görürəm. | **05a** (§5.2) |
| Yuxarıdakı fərqli söz cütlərinin heç biri qalmayıb. | **05a** (§5.3) |
| Task 1b, 2 və 3-ün sözləri olduğu kimi qalıb. | **05a and 05b** (invariant, §5.7 / §9) |

"İstədiyim nəticə": the approved word list (05a); no codes, "Versiya", "Sətir sayı" on the Rəhbər's screens (05b);
"Server işləyir" only on a problem (05a); units (05a); ₼ and two decimals (05a); useful specification kept,
meaningless codes hidden (05b). "Mütləq qorunmalı davranışlar": both parts.

---

## Assumptions the Planner made

Design decisions, not business rules; each can be overturned at review.

1. Task 05 is split into 05a (words, units, format, server badge) and 05b (technical identifiers) so each is one
   reviewable diff that one Coder session can finish.
2. The approved words live in a new `src/terminology/` module; Task 2's price words stay in `pricing/labels.ts`.
3. "Qiyməti olan sətirlərin cəmi (və ya gizlət)": the phrase is used where it heads a figure; it is hidden in the
   decision panel and on the inbox row, where the same money or the missing-price line is already beside it.
4. Lists, filters and counts use the 5.1 plural words; a single product's badge uses the singular "Yeni" /
   "Bu ay yazılmayıb".
5. The locative ending in "Son 9 ayın 3-də" follows the number's pronunciation (3-də, 6-da, 9-da).
6. "Bütün dövr" and "Bütün dövrün ortalaması" become "Bütün dövrün ortalaması" everywhere, like the other averages.
7. The unattributed cause, its dashboard headline, the attention reason and the order-line filter all use Task 2's
   "Qiymət yoxdur"; one sentence, "Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.",
   replaces the two incomplete-explanation sentences. Its wording is the Planner's.
8. "40 sətir · 2 sətirdə qiymət yoxdur" is resolved by dropping the total line count from those summary lines,
   because Task 2's "N sətirdə qiymət yoxdur" may not change.
9. Summaries that said "qiymətsiz" say Task 2's "N sətirdə qiymət yoxdur"; the inbox's metric is "Qiyməti olmayan
   sətiri olan sifarişlər", echoing Task 1b's "qiyməti olmayan sətir".
10. The history label "Düzəlişə qaytarıldı" becomes "Düzəliş tələb olundu", to match the 04a action.
11. Unit words: the brief's eight as given; the others from the catalogue's own symbols ("sm", "m", "mm", "qr", "ml"),
    "ay" and "dəfə"; any other code shows the unit's catalogue name in lower case. The same words are used for
    specification units ("5 litr", "50 kq"). No stored unit name changes.
12. "Ö/v" (an Excel abbreviation) becomes "Vahid" on the order page.
13. ₼ is kept with its amount by a no-break space in the shared formatters, not by per-cell CSS.
14. Prices are shown to two decimals everywhere they are displayed, administrator screens included, because they share
    the formatter; raw Excel values in import evidence are not prices being displayed and stay as they are.
15. The server badge shows nothing while checking and nothing when healthy; only "Server əlçatan deyil" remains.
16. "Tarixçə kifayət deyil" (a product with nothing to compare against) is a different idea from "Tarixçə natamam"
    (an average over fewer months than asked) and is left as it is.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git — branch, HEAD (`3d9a4ed` expected), `git status --short`, `git diff --stat`.
1. Terminlər — the 5.1 table as implemented: each old word, the new word, every file:line where it changed.
2. Söz cütləri — each pair of §5.3 and how it now reads, with file:line.
3. Vahidlər — the `unitWord` table, every call site, and a before/after example from each screen.
4. Məbləğ və qiymət formatı — the no-break suffix, the two-decimal price, every formatter changed, and confirmation
   that no computed value changed.
5. Server statusu — before/after.
6. Dəyişməyən sözlər — §5.7, each confirmed by a test name.
7. Testlər — new tests; changed tests, each with the reason; counts; builds.
8. Toxunulmayanlar — no database reached, no backend change, no figure changed, no 05b work done.
9. 05b və sonrakı tapşırıqlar üçün qeydlər — anything found for 05b, 6, 9, 12 or 14.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
