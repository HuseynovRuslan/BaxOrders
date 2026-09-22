# Business Decisions

Decision register for the real request workbook. It records **what was decided, who decided it and what
is still open**, so that the apply steps (row corrections, exclusion, resolutions, order creation) never
have to re-derive a business meaning from the data.

## Context

Two workbooks exist. Decisions below were **written against the first** and **re-checked against the
second**; the per-decision result is in [Corrected Workbook Rebase](#corrected-workbook-rebase).

| | Original workbook | Corrected workbook |
| --- | --- | --- |
| File | `kamran_sifarisler_2026.xlsx` | `Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx` |
| Import batch | **#6** | **#50010** |
| Period covered | 2026 January – June | 2026 January – **September** |
| Staged rows | 2,672 (source rows 4–2675) | **3,619** (source rows 4–3624) |
| June rows | 1,066 — *the block appears twice* | 522 — *no duplication* |
| Status | `NeedsReview`, kept for audit, **never modified** | **`Imported`** — reviewed, confirmed, and now the source of the permanent orders |
| Register written | 2026-09-22 | rebased 2026-09-22 |

The analysis behind the data-backed entries was read-only (`SELECT` only), and nothing in this document had
been applied when it was written. It has since been applied **to batch #50010 only**, by Tasks 3F, 3G and 4;
see [Application log](#application-log) and [Write log](#write-log). **Batch #6 remains untouched.**

## Provenance and status

Every entry carries exactly one status. The distinction is deliberate and must survive later edits.

| Status | Meaning |
| --- | --- |
| `CONFIRMED_BY_BUSINESS` | An explicit answer from the business. Only an answer creates this status. |
| `DATA_BACKED_ACCEPTED` | A high-confidence conclusion from the batch data itself. Accepted for implementation, but nobody from the business has said it. |
| `UNRESOLVED` | Still needs a human answer. Never guess it. |

A `DATA_BACKED_ACCEPTED` entry is **never** rewritten as `CONFIRMED_BY_BUSINESS` because the business
later confirmed something similar. It is upgraded only by an answer about that exact subject.

---

## Confirmed by Business

Two rounds of answers are recorded here. **CB-01 … CB-24** answered the questions raised on the original
workbook (2026-09-22). **CB-25 … CB-37** answered the questions the corrected workbook raised, including
the July–September ones, and are marked by id in each table below. **CB-38 … CB-40** are the last answers, given while Task 3G-B was
being prepared.

### Locations

| Id | Source value(s) | Canonical | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-01 | `Puşkin` (1 row) | **Puşkin parkı** | Business named the location. | Create the location under the canonical name; keep `Puşkin` as an alias. |
| CB-02 | `Parlament` (43 rows), `Parlament parkı` (13 rows) | **Parlament parkı** | Business: one and the same location. | One location; `Parlament` becomes an alias. |
| CB-03 | `Nərimanov` (64 rows), `Nərimanov heykəli` (22 rows) | **Nərimanov heykəli** | Business: same operational location. | One location; `Nərimanov` becomes an alias. |
| CB-04 | `Milli Konservatoriya` (12 rows), `Milli Konservatoriya qarşısı` (16 rows) | **Milli Konservatoriya qarşısı** | Business: same operational location. | One location; the short form becomes an alias. |
| CB-05 | `Ağır Cinayətlərin` (10 rows), `Ağır Cinayətlərin qarşısı` (15 rows) | **Ağır Cinayətlərin qarşısı** | Business: same operational location. | One location; the short form becomes an alias. |
| CB-06 | `F.M`, `Fəvvarələr meydanı` | **Fəvvarələr Meydanı** | Confirmed earlier in the review of batch #6. Matches the seeded pattern of `H.Ə.M` → `Heydər Əliyev Mərkəzi`. | Canonical location with `F.M` and `Fəvvarələr meydanı` as aliases. |
| CB-07 | `B.K.M` (174 rows) | **Bakı Konqres Mərkəzi** | Confirmed earlier in the review of batch #6. | Canonical location with `B.K.M` as an alias. No expansion is inferred from anything else. |
| CB-08 | `H.Ə.M` (527 rows) | **Heydər Əliyev Mərkəzi** | Confirmed earlier; already seeded with `H.Ə.M` as an approved alias. | Nothing new. |
| CB-25 | `Sabir bağı` (27 rows in #50010, July) | **Fəvvarələr meydanı** | Business: the same operational location as F.M. | `Sabir bağı` becomes an alias of the location CB-06 names. **No separate `Sabir bağı` location is created.** |
| CB-26 | `Təmir-tikinti` (written `Təmir Tikinti`, 16 rows in #50010, July) | **Təmir-tikinti** | Business: a real object. | Its own `Location`. It is **not** a supplier, a category or a service type, whatever the name suggests. |
| CB-38 | `Qafur Məmmədov`, `Bayıl yolu`, `Novxanı`, `Bibiheybət`, `Axundov`, `Muzey Mərkəzi`, `Qara Qarayev`, `EXPO`, `ADNSU`, `İDEA`, `Space Tv qarşısı` | **each as written** | Business: a stable operational name is enough to be canonical; a formal or legal long name is not a precondition. | Create each `Location` exactly as the sheet spells it. **No expansion is invented for `EXPO`, `ADNSU` or `İDEA`.** A fuller display name can be set later without changing the record's identity, so this closes UR-04. |
| CB-39 | `Qala baza` | a **Location** *and* a **Supplier** | Business: the name is valid in both roles. | Two records in two catalogs: `Location` "Qala baza" (60 rows) and `Supplier` "Qala baza" (197 rows). The entity types are never merged; sharing a name is not a conflict. Closes UR-02. |
| CB-35 | `Azpetrol baza`, `Bağ`, `Mehdiabad` | three **separate** locations | Business answer. | Three distinct `Location` records; never merged with each other. `Mehtabad`, if it appears, is a spelling candidate for **Mehdiabad only** where the source row supports exactly that location — never assumed. |

Answers CB-02 … CB-06 and CB-25 all chose the **longer, fuller form** as the canonical display name. That
convention is applied to the data-backed location pairs below (DB-04).

### Responsible people

| Id | Subject | Decision | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-09 | `Xəyal` (39 rows: İDEA, ADNSU, B.K.M) and `Xəyal - Əbülfəz` / `Xəyal-Əbülfəz` (493 rows, mostly F.M) | **Do not merge.** Two separate business labels. | Business decided; the observed split by location is context, not proof. | Two responsible-person records. Never offer them as one suggestion. Extended by CB-30. |
| CB-10 | The relevant B.K.M records | Responsible person / business label is **Çingiz**. | Business answer. | Used when those rows are resolved. **No conclusion about the meaning of B.K.M is drawn from this.** |
| CB-30 | `Xəyal - Əbülfəz`, `Xəyal-Əbülfəz` (612 rows) and **`Əbülfəz` alone** (6 rows, July–September) | **Xəyal Əbülfəz** | Business: `Əbülfəz` on its own is not a third person; all three spellings are one label. | One responsible person named `Xəyal Əbülfəz`, with **three** spellings as aliases. ⚠️ The canonical spelling uses a space, so it normalizes to `xəyal əbülfəz` — different from `xəyal-əbülfəz`. All three source spellings therefore need an explicit alias; none of them resolves by itself. |
| CB-31 | `Aydın` (20 rows, July and September) | **Aydın** | Business: a valid responsible person. | Own `ResponsiblePerson` record. |

**`Xəyal` ≠ `Xəyal Əbülfəz`.** CB-09 and CB-30 stand together: `Əbülfəz` joins `Xəyal Əbülfəz`, and `Xəyal`
on its own stays a separate person (see NM-13).

### Suppliers

| Id | Source value(s) | Canonical | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-11 | `Orxan Musayev` (3 rows), `ORXAN MUSAYEV VAHİD OĞLU` (1 row) | **Orxan Musayev Vahid oğlu** | Business: the same person. The fuller legal form is preferred. | One supplier; the short spelling is kept as an alias. |
| CB-12 | `Star boya` (27 rows), `Star boya 195` (14 rows) | **Star boya** | Business: the same business source. | One supplier; `Star boya 195` becomes an alias. **No meaning is inferred for `195`.** |
| CB-13 | Named individuals as the source of goods, e.g. `Ağakərim`, `Ağaverdi Məmmədov`, `Ruslan Mirzəyev` | Record as **a purchase from an individual**, not from a company | Business answer. No company or VÖEN identity may be invented. | The `Supplier` model has no supplier-type field today. Recorded as a future modelling/import requirement (TR-10). **Not redesigned here.** |
| CB-14 | The 14 suppliers that appear exactly once in January–June | **Not** one-off or temporary suppliers | Business: these are sources the organisation may keep working with; they simply had few purchases in this period. | Create them like any other supplier. Do not deactivate, do not special-case, do not warn about them. |
| CB-27 | `Ağakərim Ağakərimov` (65 rows, March–June), `Ağakərim Kərimov` (39 rows, July–September) | **two separate suppliers** | Business: different people. | Two records. The non-overlapping months look like a renaming but are **not** one — see NM-14. |
| CB-28 | `ESPA`, `Marsu` | **two separate companies** | Business answer. | Two records. No relationship is inferred from product or brand names — see NM-15. |
| CB-29 | `EMA MMC` (1 row), `EMA Qapalı S/C` (1 row) | **EMA MMC** | Business: the same company written with two legal forms. | One supplier; `EMA Qapalı S/C` becomes an alias — unless a source row's own context says otherwise. |
| CB-36 | `Anbar` (1 row, in the `Şirkət` column) | a **Supplier**, not a location | Business: it names the source that supplied the goods. | Supplier `Anbar`. **No `Location` named `Anbar` is created** just because the word appears in the data. |

### Units and order lines

| Id | Source value | Canonical | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-15 | Order unit `k` (1 row: `Motor simi`, quantity 2, 32 AZN, F.M, March) | **kq / kiloqram → unit `KG`** | Business answer. | Approved alias `k` → existing seeded unit `KG`. Note: that row's *specification* unit is `qr` (grams); the two are different columns and do not conflict. |
| CB-16 | Service lines, e.g. 280 AZN repair work with order unit `dəfə` | Stay in the **same** request list as material lines | Business answer. | `dəfə` is a legitimate order unit. **No separate service-order subsystem** is built. |
| CB-32 | Specification unit `KW` (1 row: `Fontan motoru Water pump`, 7.5 KW, Milli Konservatoriya) | **kW — kilovat / kilowatt** | Business answer. | A unit of measure for power, its `UnitType` chosen from the existing enum. **No conversion factor to any other unit is invented.** |
| CB-33 | The `Təmir işləri` row whose `Ö/v` cell is empty (source row 2629, Zabitlər, July, 200 AZN) | the order unit is **intentionally empty** | Business answer: the row is valid business data as it stands. | **Never** fill it with `dəfə`, `AZN`, `ədəd` or any invented unit — `AZN` is currency, not a unit. Today an empty `Ö/v` raises a blocking `MissingRequiredValue`; Task 3F must inspect that rule and adapt it safely rather than fabricate a value. See TR-11. |
| CB-34 | Order unit `ay` | ~~NOT_APPLICABLE_TO_BATCH_50010~~ — **superseded by CB-40** | Business first stated the corrected workbook had no such order unit; the batch did carry one (source row 3505). | Superseded. Kept on record because the first answer was acted on. |
| CB-40 | Order unit `ay` (row 3505: `Ayaqyolu pulu`, 1 × 100 AZN, Hökümət evi və ətrafı parklar, September, Cleanfix MMC) | **`ay` — a monthly service / billing period**, unit code `MONTH`, name `Ay`, symbol `ay`, `UnitType.Other` | Business answer, replacing CB-34 once the row was shown. | Create or reuse the unit `MONTH`. It measures a billing period, not a physical quantity: **no conversion factor to any other unit exists or may be invented.** Closes UR-25. |

### Products and specifications

| Id | Subject | Decision | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-17 | `Laqonda nasadkası şkurka üçün` (1.60 AZN, Eldost) vs `Laqonda nasadkası üçün şkurka` (0.85 AZN, El Promaster) | **Different products.** One is the attachment (nasadka), the other the sandpaper (şkurka). | Business answer; the price and supplier difference agrees with it. | Two products. **Never** merged automatically, whatever the token similarity. See NM-11. |
| CB-18 | Tape (`Skoç`) specification | **Width and length are both significant** and are stored together, e.g. `48 mm x 50 m`, `50 mm x 100 m` | Business answer. | A tape variant is never identified by width alone or length alone when both are known. Missing values are never invented. |
| CB-19 | `Yaramila` / `Yaramilla`, rows 501 and 609 — Excel stored the model as the date `2021-11-11` | True value is **`11-11-21`** | Business answer; the Excel date conversion is wrong. | Row-level correction (RC-01). The real rows are **not** modified yet. |
| CB-37 | Product name **`FAB`** (21 rows in #50010, Omid, 4.15 / 5.00 / 5.85 AZN) | exactly **`FAB`** | Business: the name is valid as it stands. | Create the product as `FAB`. **Do not expand it, do not infer a hidden name, and never merge it into `Şampun əl üçün D2`.** This supersedes the retired data-backed hypothesis in DB-10 — see NM-16. |

### Categories

| Id | Product | Canonical category path | Reason | Future action |
| --- | --- | --- | --- | --- |
| CB-20 | `Mikrofiber əski` | `Təmizlik > Təmizlik ləvazimatı > Təmizlik bezi` | Business answer. The path already exists and already carries 58 of the product's 59 rows. | The one remaining row uses the truncated path `Təmizlik > T > Təmizlik bezi` → RC-03. |
| CB-21 | `Cod şotka` (and the same product written `Şotka cod`) | `Təmizlik > Təmizlik ləvazimatı > Avadanlıq` | Business: the cleaning-equipment classification already in the tree. That exact path exists and carries 8 of 9 rows (plus all 3 `Şotka cod` rows). | The one row filed under `Təmizlik > Təmizlik kimyəvi maddələr > Döşəmə təmizləyici` → RC-04. |
| CB-22 | `Akkumulyator` | Leaf category **`Ehtiyat hissələri`** | Business answer. | ⚠️ **Incomplete:** `Ehtiyat hissələri` is not a top level. It exists as a leaf under two different branches — `Təmizlik > Təmizlik texnikası > Ehtiyat hissələri` (6 rows) and `Yaşıllıq > Yaşıllıq texnikası > Ehtiyat hissələri` (4 rows). The branch is **UNRESOLVED** (UR-13). No new top-level category is invented. |
| CB-23 | The category tree as a whole (11 main groups, 111 paths) | **Keep as it is** | Business answer. | Individual wrong product assignments may be corrected; the hierarchy is not redesigned. |

CB-20 … CB-22 answer **only** the products named in them. The other products that appear under more than
one category remain open (UR-12).

### Scope of the reference data

| Id | Decision | Reason | Future action |
| --- | --- | --- | --- |
| CB-24 | The January–June workbook is **not** the final universe of locations, suppliers, units or products. More months will follow. | Business answer. | Catalogues are never frozen from the first six months. New canonical values keep arriving through the existing controlled review workflow. |

---

## Data-backed Accepted Decisions

Accepted for implementation on the strength of the batch data. **No business answer exists for these.**

### DB-01 — The June block is in the file twice

> **HISTORICAL OLD-WORKBOOK DECISION — NOT APPLICABLE to the corrected workbook.** The finding below is
> correct for batch #6 and stays on record. The corrected workbook has 522 June rows and no duplicated
> block, so **no exclusion is carried over**. See [Corrected Workbook Rebase](#corrected-workbook-rebase).

| | |
| --- | --- |
| Subject | Structural duplication of a whole month |
| First block | source rows **1610–2142** (533 rows) |
| Second block | source rows **2143–2675** (533 rows) |
| Decision | **Keep the first block, exclude the second** |
| Evidence | Every pair aligns at an exact offset of **+533**. 533 of 533 pairs match on location + quantity + unit price. 522 of 533 also match on the normalized product name; in the remaining 11 the two copies differ only in spelling. |
| Why accepted | 533 independent orders cannot repeat with identical objects, quantities, prices **and in the same order**. |
| Why the first block | It carries more information in the lines that differ: `List polad 1500x6000 mm` (the copy loses the size), `Sep (Stihl Motopila MS 250) 28diş` (loses the tooth count), `Şpilka 2m`, `Dərmanvuran … Öztürk`, `Şampun əl üçün D2` (the copy says only `FAB`). |
| Future action | Exclude 533 rows with the reason **`İyun bloku təkrardır`**. |
| Impact if skipped | Every June request and every June amount is created twice. |

This is **not** the generic `PossibleDuplicate` signal. Generic possible duplicates stay informational and
never block; this specific block is a confirmed structural duplication.

### DB-02 — Location typos

| Id | Source | Canonical | Evidence |
| --- | --- | --- | --- |
| DB-02 | `Dədəd Qorqud` (4 rows) | `Dədə Qorqud` (334 rows) | One extra letter; no other difference in any column. |

### DB-03 — Spellings that normalization already merges (no decision needed)

`Hökümət evİ və ətrafı parklar` / `Hökümət evi və ətrafı parklar` · ` Muzey Mərkəzi` / `Muzey mərkəzi` ·
` Parlament ` / `Parlament` · ` Zabitlər` / `Zabitlər` · `Nərimanov ` / `Nərimanov` · ` Eldar` / `Eldar` ·
`Xəyal - Əbülfəz` / `Xəyal-Əbülfəz` · `Balaxanı  zavod` / `Balaxanı zavod` · `"PROSHINE"` / `Proshine` ·
`"UNICAL TEXNIK"` / `Unical Texnik` · ` ədəd` / `ədəd` · and 10 product names that differ only by a double
space or a comma.

These produce one source key already. They are listed so nobody mistakes them for open questions.

### DB-04 — Short and long location names are one location

| Short form | Long form | Canonical (see note) |
| --- | --- | --- |
| `Xətai` (128) | `Xətai parkı` (3) | Xətai parkı |
| `Bülbül` (68) | `Bülbül parkı` (3) | Bülbül parkı |
| `Zabitlər` (68) | `Zabitlər parkı` (7) | Zabitlər parkı |
| `Qafur Məmmədov` (156) | `Qafur Məmmədov parkı` (3) | Qafur Məmmədov parkı |
| `Hökümət evi` (3) | `Hökümət evi və ətrafı parklar` (28) | Hökümət evi və ətrafı parklar |

**Evidence.** The distribution is complementary: the small side of each pair consists only of the June
fuel lines, while the large side covers every month and every kind of material. From January to May the
same fuel for the same object was bought from Socar; in June the *Şirkət* column was filled with the
object's own name instead (see DB-09). The pattern is identical on the objects the business has already
confirmed (F.M, H.Ə.M, B.K.M).

**Note on the canonical form.** The merge itself is data-backed. The choice of the *longer* name as the
display form follows the convention the business used in CB-02 … CB-06; it is a display decision only and
costs nothing to change.

### DB-05 — Order units

| Source | Canonical | `UnitType` | Evidence |
| --- | --- | --- | --- |
| `kv`, `kv.m` (28 rows) | **Kvadrat metr / m²** | `Area` | All tiles and stone; fractional quantities (15.12, 6.12, 20.26, 2.88); prices per square metre. The `kv.m` rows sit on the same product / object / price as the `kv` rows. |
| `top` (13 rows) | **Top (rulon)** | `Package` | Every row is goods sold in rolls, without exception. |
| `dəst` (4 rows) | **Dəst** | `Package` | Quantity is 1 in every row; the products are sets. |
| `dəfə` (2 rows) | **Dəfə** | `Other` | Repair service, 280 AZN. Business separately confirmed these lines stay in the same request list (CB-16). |

`kv` and `kv.m` become **one** unit of measure with both spellings as aliases. `UnitType.Area` already
exists in the domain. Nothing is created yet.

### DB-06 — Words in the specification-unit column that are not units

**`-lik`, `-lıq`, `-lük`, `-luq`** are the four vowel-harmony forms of one Azerbaijani suffix, not a
measurement. Proof from the batch — the same product carries different forms:

| Product | One row | Another row |
| --- | --- | --- |
| Şkurka | `lük` 100 | `lik` 120 |
| PE kaplin mufta | `lik` 20 | `luq` 110 |
| Rotor | `lük` 5004 | `lik` 5500 |
| Sverlo | `lik` 8 | `luq` 10 |
| PE Kaplin üçlük | `lik` 75 | `luq` 110 |

All 123 rows hold a number, and every one of them also has a real order unit of its own.

**`yarpaq`, `qat`, `ədədli`, `diş`** behave the same way: numeric value, separate real order unit → product
attributes, not quantity units.

Future behaviour: keep the specification value, create **no** `UnitOfMeasure` for these words, allow
`SpecificationUnit` to be null, and keep whatever text the variant identity needs. (The seeded reference
data already refuses `lik`, `lük`, `qat` and `yarpaq` as units.)

### DB-07 — `Rolik başlığı` order unit

The row with the missing order unit gets **`ədəd` / `PCS`**: the product appears in 6 rows, 5 of them use
`ədəd` with the same specification (10 sm) and the same supplier (El Promaster), and every other `rolik`
product is ordered in pieces. Recorded as a pending row correction (RC-02).

### DB-08 — Supplier merges

| Source spellings | Canonical | Evidence |
| --- | --- | --- |
| `baku garden` (41), `baku gardenn` (2) | **Baku Garden** | Doubled letter. |
| `granite az` (10), `granite az mmc` (1) | **Granite AZ MMC** | Legal-form suffix. |
| `poolstore` (1), `poolstore mmc` (6) | **Poolstore MMC** | Legal-form suffix. |
| `proshine` (60), `proshine mmc` (1) | **Proshine MMC** | Legal-form suffix. |
| `unical texnik` (42), `unical_texnik` (1) | **Unical Texnik** | Underscore typo. |

### DB-09 — Some June `Şirkət` cells hold a location name, not a supplier

Values seen: `Parlament` (5 rows), `Parlament parkı` (2), `Qafur Məmmədov` (2), `Qafur Məmmədov parkı` (3).

Evidence: in row 2128 the supplier, the location and the product line read *Parlament parkı / Parlament
parkı / Benzin, 10 × 1.15 AZN* — the organisation does not buy from its own park.

**These must never become `Supplier` records.** Who the real supplier was is unresolved (UR-03).

### DB-10 — Products that are the same

**Proved by the June duplicate pairing** (the identical record written twice — the strongest evidence in
the batch):

| First block | Second block |
| --- | --- |
| `Star parlaq boya sintetik qara` | `Star parlaq boya sintetik qara taxta üçün` |
| `Sep (Stihl Motopila MS 250) 28diş` | `Sep (Stihl Motopila MS 250)` |
| `Mop ekstra nəmki` | `Mop ekstra nəmli` |
| `List polad 1500x6000 mm` | `List polad` |
| `Laqonda metal kəsmək üçün daş` | `Laqonda lıq metal kəsmək üçün daş` |
| `Şampun əl üçün D2` | `FAB` |
| `Dərmanvuran aparat akkumlyatorlu Öztürk` | `Dərmanvuran aparat akumlyatorlu` |
| `PPRC rekor çöl rezba` | `PPRC mm rekor çöl rezba` |
| `PPRC 90 dərəcə bir tərəfi çöl rezba` | `PPRC mm 90 dərəcə bir tərəfi çöl rezba` |
| `Laqonda daşı metal üçün` | `Laqonda daşı, metal üçün` |
| `Şpilka 2m` | `Şpilka` |

**Proved by model code plus a second signal** (price, supplier or specification):

| Model code | Same product, written as |
| --- | --- |
| `OREGON 69-365Y` | `Leska x 2,4mm Sarı` = `Leska x 264 metr Sarı` |
| `0781-319-8410` | `STHIL Yağ` = `Yağ STİHL` |
| `2847` | `Duş Gardena` = `Suvarma sistemi yumru duş GARDENA` = `Suvarma üçün duş Gardena` |
| `4002-710-2108` | `Leska başlığı` = `Trimmer üçün leskalı başlıq STİHL` |
| `12300` | `Qayçı formaverən Gardena` = `Qayçı formaven GARDENA` |
| `3101` | `Dırmıq Gardena plastik` = `Dırmıq plastik Gardena` = `Dırmıq plastiq GARDENA` |
| `18216` | `Gardena` (bare) = `Şlanq birləşdirici Gardena` |
| `18233` | `Gardena iki şlanq birləşdirici 3/4` = `İki şlanq birləşdirici Gardena` |
| `5304` | the spellings of `Tap birləşdirici` |
| `2240` | `Pensan qələm` = the blue `Pensan My-tech` |
| `№611320Harden` | `Laqonda daş almaz` = `Laqonda daşı almaz` |
| `0000-400-7016`, `0000-400-7011` | the Stihl spark-plug pairs |
| `20620031`, `20078331` | the Columbus parts shared between machine models |

**Proved by identical price, supplier and specification with only the name differing:**

`Hava təravətləndirici Air freshener` = `Hava təravətləndirici (Air freshener)` (3.50, Prestige) ·
`Hava təravətləndiricii` = `Hava təravətləndiricii Glade` (3.50, spec 300) ·
`90% Toz xlor qranul Pooltech` = `Xlor Toz 90% qranul` (both 5 kq / 30 AZN) ·
`Şampun qab üçün` = `Şampun qabyuma Ardıc` (Azclean, 2.80, 5 lt) ·
`Pe kaplin çöl diş mufta` = `pe kaplin mufta 1 tərəfi 50-lik çöl rezbalı` (2.49, spec 50) ·
`PE kaplin çöl diş dirsək` = `PE kaplin mufta 90 dərəcəlik…` (1.31, spec 20) ·
`Cod şotka` = `Şotka cod` (word order only).

None of these is applied. Each becomes a product resolution, with a global alias only where an operator
asks for one.

---

## Technical Modeling Rules

Recorded for later implementation. **No code was changed in this patch.**

| Id | Rule |
| --- | --- |
| TR-01 | **Suffix specifications.** `-lik/-lıq/-lük/-luq` are specification semantics, never a `UnitOfMeasure`. Import and normalization must represent them as part of the specification, and `SpecificationUnit` may stay null. |
| TR-02 | **Dimensions inside product names** (`List polad 1500x6000 mm`, `Şpilka 2m`, `PE kaplin 3/4`, `Leska 2,4mm`, `50-lik`, `20-lik`). The long-term target is a base `Product` plus the size on the `ProductVariant` specification, **but no aggressive automatic parser is built from product names.** Human-reviewed correction or resolution is the safer path. For tape, CB-18 applies: width and length are kept together. |
| TR-03 | **Colour** exists only inside product names today (`Metlaq boz`, `Zəncir tikişli mop ağ`, `Pensan mavi`, `Rain Bird sarı`, `Boya ağ` / `qırmızı`, `Şurup qara`). Whether colour becomes a first-class variant attribute is **unresolved** (UR-10). Until it is answered, colour is never stripped out of a canonical name automatically. |
| TR-04 | **Brand and word order.** Token-set similarity may later suggest candidates to a human. It must **never** become an automatic merge rule. No fuzzy automatic merging. |
| TR-05 | **`ModelCode` is not globally unique** (`5097`, `837806849`, `10W40`, `1/2 mm`, `DN20`, `Mirsa GOLD` all repeat across different products). It can never identify a `Product` or `ProductVariant` on its own; the variant key keeps using product + specification + units + model context. |
| TR-06 | **Short or incomplete names** such as the bare `Gardena` or `FAB` cannot be resolved by name. They need a model code, duplicate-pair evidence, supplier/specification context or a human decision. |
| TR-07 | **One canonical category per product.** Business has answered only `Mikrofiber əski`, `Cod şotka` and `Akkumulyator` (CB-20 … CB-22); the other conflicting products stay open (UR-12). |
| TR-08 | **Duplicate fingerprints.** Batch #6 predates the Task 3D behaviour and has **no** stored `DuplicateFingerprint` values (0 of 2,672 rows). Review and readiness logic must recompute duplicate information when it needs it instead of trusting an old, empty persisted fingerprint. Batch #6 is not mutated for this. |
| TR-09 | **Excel date conversion.** A cell is not a date because it parses as one. Known correction: `Yaramila` → `11-11-21` (CB-19). Other converted cells stay unresolved until answered (UR-08). |
| TR-10 | **Supplier type.** CB-13 requires telling a company apart from a named individual. `Supplier` has no such field today. This is a future modelling/import requirement, deliberately **not** designed in this patch. |
| TR-11 | **An empty order unit can be valid.** CB-33 states that a service line may legitimately have no `Ö/v`. Today `ImportHeaders.RequiredFields` includes `OrderUnit`, and an empty cell produces a blocking `MissingRequiredValue`, so such a row can never reach `ReadyToImport`. Task 3F must look at that rule and decide deliberately — relax it for lines of this shape, or let the operator mark the emptiness as intended — and must **never** invent a unit to satisfy it. Note this is the opposite of DB-07, where the data itself supplies the missing unit. |

---

## Explicit "Do Not Merge" Rules

These pairs look similar to a matcher and are **different products**. A future suggestion engine must not
propose them, and a bulk operation must not collapse them.

| Id | Must stay separate | Why |
| --- | --- | --- |
| NM-01 | Gardena products with model codes `12300`, `12304`, `14730` | Three different model codes and three price levels — three products. |
| NM-02 | `Metlaq Boz` ≠ `Metlaq boz rəng` | Different size, price and supplier spelling. |
| NM-03 | Rain Bird `başlıq` (2.50–2.70) ≠ `sprink` (3.80) | Two distinct price bands, two distinct items. |
| NM-04 | `Fəhlə əlcəyi` (0.28, Emaf A300, 32 qr) ≠ the `MM Elektrik` glove (1.10) | Different product, supplier and price. |
| NM-05 | `Şampun qab üçün` (Azclean, 2.80) ≠ `D3` (Proshine, 3.65) | Different supplier and price. |
| NM-06 | `Leska 3mm` ≠ `Leska 2,4mm` | Different model codes. |
| NM-07 | The occurrences of Viking model `5097` | The same code is reused for three different parts. **Never merge on a matching model code alone.** |
| NM-08 | `Kist 2` ≠ `Kist 3` (StarGil) | The number is the size. |
| NM-09 | `1 gözlü troynik` ≠ `3 gözlü troynik` | The number is the product. |
| NM-10 | `Əl arabası` ≠ `Əl arabası qaynaqlı` | Welded is a different item on the evidence available. |
| NM-11 | `Mop eko` ≠ `Mop əskisi` | Same supplier, price and specification, but two different articles. |
| NM-12 | `Laqonda nasadkası şkurka üçün` ≠ `Laqonda nasadkası üçün şkurka` | **Business answer** (CB-17): one is the attachment, the other the sandpaper. Word order is the only textual difference, which makes this the most dangerous pair in the batch. |
| NM-13 | `Xəyal` ≠ `Xəyal Əbülfəz` (responsible people) | **Business answer** (CB-09, CB-30). `Əbülfəz` alone belongs to `Xəyal Əbülfəz`; `Xəyal` alone does not. |
| NM-14 | `Ağakərim Ağakərimov` ≠ `Ağakərim Kərimov` | **Business answer** (CB-27): different people. Their months never overlap (March–June vs July–September), which looks like a renaming — that appearance must not be acted on. |
| NM-15 | `ESPA` ≠ `Marsu` | **Business answer** (CB-28): different companies. No relationship may be inferred from product or brand names. |
| NM-16 | `FAB` is never merged into another product | **Business answer** (CB-37). It replaces the retired DB-10 hypothesis that `FAB` meant `Şampun əl üçün D2`, whose only evidence was the June duplicate pairing that no longer exists. |
| NM-17 | `Azpetrol baza` ≠ `Bağ` ≠ `Mehdiabad` (locations) | **Business answer** (CB-35): three separate objects. |

---

## Pending Row Corrections

Planned, **not applied**. Every `Original*` value stays exactly as staged.

| Id | Rows | Field | Staged value | Intended value | Provenance |
| --- | --- | --- | --- | --- | --- |
| RC-01 | 501, 609 (`Yaramila` / `Yaramilla`, 25 kq, 92 AZN, Ağaverdi Məmmədov, March) | Model code | `2021-11-11` (Excel date) | **`11-11-21`** | `CONFIRMED_BY_BUSINESS` (CB-19) |
| RC-02 | 597 (`Rolik başlığı`) | Order unit | empty | **`ədəd`** | `DATA_BACKED_ACCEPTED` (DB-07) |
| RC-03 | 1 row of `Mikrofiber əski` | Middle category | `T` (truncated) | **`Təmizlik ləvazimatı`** | Target path `CONFIRMED_BY_BUSINESS` (CB-20); the truncation itself is data-backed |
| RC-04 | 1 row of `Cod şotka` | Category path | `Təmizlik > Təmizlik kimyəvi maddələr > Döşəmə təmizləyici` | **`Təmizlik > Təmizlik ləvazimatı > Avadanlıq`** | Target path `CONFIRMED_BY_BUSINESS` (CB-21) |
| RC-05 | 1188 (`Pe 1-5 rotorlu rain-bird us`, EXPO, Aura inşaat, May) | Specification value | `2026-02-01` (Excel date), unit `mm` | **unknown** | `UNRESOLVED` (UR-08) — no correction may be written |

Planned exclusion, separate from the corrections above:

| Id | Rows | Action | Reason text | Provenance |
| --- | --- | --- | --- | --- |
| RC-06 | 2143–2675 (533 rows) | Exclude from the import | `İyun bloku təkrardır` | `DATA_BACKED_ACCEPTED` (DB-01) |

---

## Still Unresolved

No answer exists for these. **Do not guess them.**

| Id | Question | Context from the data |
| --- | --- | --- |
| UR-01 | Which locations do the rows written as `Təhvil verdi` / `Təhvil verildi` really belong to? | 4 rows and 1 row, the location column holds a hand-over phrase instead of an object. |
| UR-02 | Is `Qala baza` an internal warehouse or an external supplier — or both? | It appears as a location in 37 rows and as the supplier in 203 rows. **Closed — CB-39: both.** |
| UR-03 | Who was the real supplier in the June rows where the `Şirkət` column holds a location name? | 12 rows (DB-09). From January to May the same fuel was bought from Socar. |
| UR-04 | What are the official full names of the locations not yet confirmed? | `Dədə Qorqud`, `Bayıl yolu`, `Bibiheybət`, `Axundov`, `Qara Qarayev`, `İDEA`, `ADNSU`, `EXPO`, `Space Tv qarşısı`, `Muzey Mərkəzi`, `Novxanı`. |
| UR-05 | Are any of the locations in the workbook no longer serviced? | — |
| UR-06 | What is the full name behind the responsible person `Qədeş`? | 17 rows. |
| UR-07 | Does the business want full names (surnames) for `Elmir`, `Sirus`, `Qulu`, `Eldar`, `Çingiz`, `Elvin`, `Məmməd`? | Only first names are recorded today. |
| UR-08 | What is the real specification of `Pe 1-5 rotorlu rain-bird us` (row 1188)? | Excel turned the cell into `2026-02-01`; the unit is `mm`. |
| UR-09 | `Laqonda daşı dəmir üçün` (0.95 AZN) and `Laqonda daşı metal üçün` (0.75 AZN) — one stone or two? | Prices differ; a price difference alone proves nothing. |
| UR-10 | Should colour form part of the product-variant identity, or stay inside the product name? | Affects `Metlaq boz`, `mop ağ`, `Pensan mavi`, `Rain Bird sarı`, `Boya ağ`/`qırmızı`, `Şurup qara`. See TR-03. |
| UR-11 | `Petlə -lik taxta qapı üçün` (0.60) and `Taxta qapı üçün petlə lik` (1.20) — one hinge in two sizes, or two products? | The size that would explain the price difference is missing from both rows. |
| UR-12 | Columbus `Ön Drenaj Şlanqı` and `Su drenaj şlanqa` — one hose or two? | Same machine, same supplier, both 95.40 AZN. |
| UR-13 | Which branch does `Akkumulyator` belong under? | `Ehtiyat hissələri` exists as a leaf under **two** branches: `Təmizlik > Təmizlik texnikası` (6 rows) and `Yaşıllıq > Yaşıllıq texnikası` (4 rows). CB-22 named the leaf but not the branch; the rows suggest two physically different batteries. |
| UR-14 | Which category is correct for the remaining products that appear under more than one path? | `Clean strong` (22 rows), `Mərmər` (4), `Vetland` (3) and the rest of the group. CB-20 … CB-22 answered only three products. |

---

## Corrected Workbook Rebase

A corrected workbook arrived on 2026-09-22 and was staged as **batch #50010**. Every decision above was
re-checked against it. Nothing was applied; batch #6 was not touched.

**Reading this section.** A decision written against the old workbook is a *historical* decision until it
has been re-checked here. The result column says which it is:

| Result | Meaning |
| --- | --- |
| **A — applicable unchanged** | The same values are in the corrected workbook. The decision is active. |
| **B — applicable, source moved** | Still active, but the rows, counts or spellings it referred to changed. |
| **C — no longer present** | The corrected workbook no longer contains what the decision was about. Historical only. |
| **D — needs renewed review** | The evidence changed enough that the decision must not be applied as written. |

**Row numbers do not carry over.** They were re-located by content, never by the old row number.

### What the two workbooks contain

| Month | Batch #6 | Batch #50010 | Note |
| --- | --- | --- | --- |
| 2026-01 | 92 | 92 | — |
| 2026-02 | 165 | 165 | — |
| 2026-03 | 378 | 377 | −1 |
| 2026-04 | 470 | 470 | — |
| 2026-05 | 501 | 490 | −11 |
| 2026-06 | **1,066** | **522** | the duplicated block is gone (−533), and 11 rows beyond it |
| 2026-07 | — | 682 | new |
| 2026-08 | — | 340 | new |
| 2026-09 | — | 480 | new |
| no period | — | 1 | a totals row, see below |
| **Total** | **2,672** | **3,619** | |

Distinct values: locations 37 → 36, suppliers 98 → **85**, responsible people 12 → 14 spellings (10 → 12
after normalization), category paths 111 → 105, product names 858 → **1,127**, unresolved order units
6 → 9, unresolved specification descriptors 8 → 9. Suppliers and category paths fell **while three months
were added**, because the corrected workbook merged spellings.

### Sheets

The workbook has two sheets. `Əsas` is the order sheet (header on row 3, all 16 known columns, 3,619 data
rows). `Dəyişikliklər` is a review sheet and **is not imported**: the existing header detection finds no
`Malın adı`, `Miqdarı`, `Ö/v`, `Obyekt` or `Tarix` in it and reports *"Row 7 looks like a header but
required columns are missing."* No filename rule was added and none is needed.

### Structural duplication

None. The longest contiguous run of repeated rows at any offset is **2 rows** (the old workbook had a run
of 533 at offset +533). What remains is ordinary `DuplicateRow` (Info) detection: **24 fingerprint groups
over 55 rows**, mostly Columbus spare parts ordered on separate lines of the same month. These stay
informational and are never excluded automatically.

### Decision-by-decision result

#### Confirmed by business

| Id | Result | What changed |
| --- | --- | --- |
| CB-01 Puşkin | **A** | 1 row, May. |
| CB-02 Parlament | **A** | `Parlament` 51 + 9, `Parlament parkı` 13 + 2. Both forms still present. |
| CB-03 Nərimanov | **A** | `Nərimanov` 42, `Nərimanov Heykəli` 90. |
| CB-04 Milli Konservatoriya | **A** | 35 and 16. |
| CB-05 Ağır Cinayətlərin | **A** | 5 and 31. |
| CB-06 F.M → Fəvvarələr Meydanı | **B** | The spelling `Fəvvarələr meydanı` no longer appears as a location; only `F.M` (602 rows). The canonical name still applies, that one alias no longer has a source row. |
| CB-07 B.K.M | **A** | 224 rows. |
| CB-08 H.Ə.M | **A** | 675 rows; still the only location the seeded alias resolves. |
| CB-09 Xəyal ≠ Xəyal - Əbülfəz | **A + D** | Both still present (64 / 612). **New:** a third label `Əbülfəz` alone, 6 rows, July–September. Whether it is a third person needs an answer (UR-20). |
| CB-10 B.K.M / Çingiz | **A** | `Çingiz` 450 rows. |
| CB-11 Orxan Musayev | **B** | `ORXAN MUSAYEV VAHİD OĞLU` is gone; only `Orxan Musayev` (5 rows). The merge is no longer needed. The canonical display name the business chose (`Orxan Musayev Vahid oğlu`) now differs from every spelling in the file. |
| CB-12 Star boya | **B** | `Star boya 195` is gone; only `Star Boya` (38 rows). The merge is no longer needed. |
| CB-13 individuals as suppliers | **A** | Broader: `Ağakərim Ağakərimov`, `Ağakərim Kərimov`, `Ağaverdi Məmmədov`, `Kamran Qaraşov`, `Ruslan Mirzəyev`, `İbrahim Seyidli`, `Zəfər Osmanov`, `Sadıqov Namiq`, `Tərlan Salmanlı (ESPA)`, `Muxtaroğlu`. |
| CB-14 rare suppliers | **A** | 30 suppliers now have one or two rows. |
| CB-15 `k` → KG | **A** | Same row content: `Motor simi`, quantity 2, 32 AZN, F.M, March, specification `0.6 qr`. |
| CB-16 services stay in the list | **A** | Broader: new service lines `Təmir işləri` (200 AZN, unit `azn`) and `Ayaqyolu pulu` (100 AZN, unit `ay`). |
| CB-17 Laqonda nasadkası pair | **A** | Both still present (1.60 Eldost / 0.85 and 1.10 El Promaster) plus more sandpaper spellings. |
| CB-18 Skoç width + length | **A** | Confirmed by the data: the width now sits **in the name** (`Skoç kağız x48 mm`, `Skoç şəffaf x 45 mm`, `x 43mm`) and the length in the specification column (37, 50, 100, 120, 200, 300). |
| CB-19 Yaramila = 11-11-21 | **C** as a correction | The corrected workbook already stores `11 11 21` (2 rows, spaces instead of dashes). The business value is confirmed and present; no row correction is needed. |
| CB-20 Mikrofiber əski category | **A** | All 78 rows are on the confirmed path. The truncated `Təmizlik > T > Təmizlik bezi` row is gone. |
| CB-21 Cod şotka category | **A** | 8 rows on the confirmed path, **1 row still** under `Təmizlik kimyəvi maddələr > Döşəmə təmizləyici`. |
| CB-22 Akkumulyator | **A, still incomplete** | `Akkumulyator` 6 rows under `Təmizlik > Təmizlik texnikası > Ehtiyat hissələri` and 3 under `Yaşıllıq > Yaşıllıq texnikası > Ehtiyat hissələri`. The new rows sharpen the split: `HAKO Jonas Akkumulyator 1500` is a cleaning machine, `Akkumulyator 8V 175 Amper Marshell` is garden equipment. UR-13 stays open. |
| CB-23 keep the category structure | **A** | 105 paths now. |
| CB-24 catalogues are not frozen | **A** | Proven: three months added 269 product names and two locations. |

#### Data-backed

| Id | Result | What changed |
| --- | --- | --- |
| DB-01 June duplication | **C — NOT APPLICABLE** | June is 522 rows, no repeated block. **No exclusions are created.** Historical record only. |
| DB-02 `Dədəd Qorqud` | **A** | 3 rows (April, May, June). |
| DB-03 normalization-only collisions | **A** | Still present: ` Zabitlər`, ` Muzey Mərkəzi`, ` Parlament `, `Hökümət evİ …`, `Nərimanov `, `Axundov `, ` Eldar`, `Xəyal-Əbülfəz`, ` ədəd`, `kisə `. |
| DB-04 short/long location pairs | **B** | Four of five remain: Xətai 156/2, Bülbül 91/2, Zabitlər 149/2, Hökümət evi 2/49. **`Qafur Məmmədov parkı` is gone** (only `Qafur Məmmədov`, 205 rows) → that pair is result **C**. |
| DB-05 order units | **A, extend** | `kv` 26, `kv.m` 4, `top` 17, `dəst` 4, `dəfə` 5. **New:** one row uses the proper symbol `m²` (`Mərmər bej qalınlığı 2 sm`, 9.6 × 120 AZN) — it belongs to the same unit, which strengthens the decision. |
| DB-06 suffixes are not units | **A** | `lik` 119, `yarpaq` 40, `qat` 18, `luq` 12, `lıq` 11, `diş` 8, `lük` 7, `ədədli` 5. **New:** `KW` (1 row) *is* a real unit and is not part of this rule (UR-22). |
| DB-07 `Rolik başlığı` → ədəd | **A** | Still missing its order unit, and by coincidence still on row 597. **New:** a second row (2629, `Təmir işləri`, Zabitlər, July) is also missing the order unit (UR-23). |
| DB-08 supplier merges | **C** | All five are already merged in the corrected workbook: only `Baku Garden`, `Granite Az`, `Poolstore MMC`, `Proshine`, `Unical Texnik` remain. Note two canonical names differ from what DB-08 proposed (`Granite AZ MMC`, `Proshine MMC`); the file's spelling now governs. |
| DB-09 supplier column holds a location | **B** | Reduced from 12 rows to **3**: `H.Ə.M` (Benzin, Dizel) and `Bülbül parkı` (Benzin). The `Dəyişikliklər` sheet records 30 such cells as already corrected. |
| DB-10 products — June-pair group | **mostly C, one D** | Already merged in the file: `List polad 1500x6000 mm`, `Şpilka`, `Mop ekstra nəmli`, `Dərmanvuran aparat akkumulyatorlu`, the `PPRC Rekor` spellings, `Laqonda daşı metal üçün`, the `Star parlaq boya` pair (now separated by RAL codes), `Sep (Stihl Motopila MS 250)`. **`FAB` → D:** `FAB` appears 21 times as a product in its own right and the file is full of `… FAB` paints, so FAB is a **brand**. The only evidence that it meant `Şampun əl üçün D2` was the June duplicate pairing, which no longer exists. **This pair is retired; it must not be applied.** |
| DB-10 products — model-code group | **A** | Still multi-spelled: `3101` (`Dırmıq Gardena plastik`, `Dırmıq plastik Gardena`, `Plastik yarpaq dırmığı Gardena`), `2847` (three duş spellings), `18216`, `18233`, `4002-710-2108`, `OREGON 69-365Y`. `12300` is already merged in the file. |
| DB-10 products — price/supplier group | **A** | `Hava təravətləndirici` / `(Air freshener)` / `Glade`; the `Xlor … 90% qranul` family; `Şampun qab üçün` / `Şampun qabyuma Ardıc`; `Cod şotka` / `Şotka cod` — and the last pair now shares **both** prices (2.60 and 3.00), which is stronger evidence than before. The PE kaplin long-description pairs are gone (**C**). |

#### Do-not-merge rules

All remain relevant except **NM-10** (`Əl arabası` no longer appears → **C**). Two are sharper now:

- **NM-01** — `Qayçı formaverən Gardena` is now used for **both** model `12300` (54 AZN) and `12304`
  (86–99 AZN), while `14730` is written `Formaverən Gardena` (275 AZN). The name alone cannot separate
  them; only the model code can.
- **NM-02** — `Metlaq Boz` now appears at 38 **and** 39 AZN, and `Metlaq boz rəng` at 39. The price gap
  the old rule leaned on is gone, so the rule now rests only on the differing spelling and size. Colour
  is a bigger question than before: `Metlaq ağ`, `bej rəng`, `Qara`, `tünd boz rəng` all exist (UR-10).

#### Pending row corrections

| Id | Result |
| --- | --- |
| RC-01 Yaramila model code | **C** — already `11 11 21` in the file. |
| RC-02 `Rolik başlığı` order unit | **A** — still needed. |
| RC-03 Mikrofiber `T` category | **C** — the truncated path is gone. |
| RC-04 Cod şotka category | **A** — one row still misfiled. |
| RC-05 Rain Bird specification | **C** — the Excel date is gone; the cell now reads `5004` with unit `lük` (row 1187, same 16 AZN row). UR-08 is answered by the corrected file. |
| RC-06 exclude the second June block | **NOT APPLICABLE** — nothing to exclude. |

#### Unresolved questions

| Id | Result |
| --- | --- |
| UR-01 `Təhvil verdi` / `Təhvil verildi` | **Disappeared.** Neither value exists as a location any more. |
| UR-02 Qala baza | **Closed — CB-39.** Valid in both roles: a location (60 rows) and a supplier (197 rows), in two separate catalogs. |
| UR-03 real supplier behind a location name | **Open, narrowed** to 3 fuel rows. |
| UR-04 official full location names | **Closed — CB-38.** A stable operational name is canonical; the eleven remaining names are used as written. |
| UR-05 locations no longer serviced | **Open.** |
| UR-06 `Qədeş` | **Open** — 15 rows. |
| UR-07 surnames | **Open** — now 14 labels including `Aydın` and `Əbülfəz`. |
| UR-08 Rain Bird specification | **Answered by the corrected workbook** (`5004`, `lük`). |
| UR-09 `Laqonda daşı dəmir üçün` vs `metal üçün` | **Disappeared** — only `dəmir üçün` remains. It now has four price points and brand suffixes, which is a variant question, not this one. |
| UR-10 colour | **Open and larger** — Metlaq colours, the FAB paint range, and RAL numbers now appearing in the model column. |
| UR-11 Petlə pair | **D — new evidence.** `Petlə -lik taxta qapı üçün` has specification **5** (0.60 AZN) and `Taxta qapı üçün petlə lik` has specification **10** (1.20 AZN). The data now points to one product in two sizes rather than two products, which is the opposite of leaving them apart. Not applied. |
| UR-12 Columbus drainage hoses | **Open** — both still 95.40 AZN. |
| UR-13 Akkumulyator branch | **Open** — 6 rows vs 3 rows, and the new rows suggest two different batteries. |
| UR-14 remaining category conflicts | **Open** — `Clean strong` 31 + 1, `Cod şotka` 8 + 1. |

### New questions raised by July–September

The questions are kept as they were asked. The **Status** column records what the business answered on
2026-09-22; a question is never deleted once it has been asked.

| Id | Question | Context | Status |
| --- | --- | --- | --- |
| UR-15 | Is `Sabir bağı` a serviced object? | 27 rows, **July only**. | **Closed — CB-25.** It is Fəvvarələr meydanı, not a new object. |
| UR-16 | Is `Təmir Tikinti` an object or a kind of work / a department? | 16 rows, **July only**; it buys water tanks, an inverter, hoses, cable — it reads like a work type, not a place. | **Closed — CB-26.** It is a real location. |
| UR-17 | Are `Ağakərim Ağakərimov` (65 rows, March–June) and `Ağakərim Kərimov` (39 rows, July–September) the same supplier? | The two spellings never overlap in time, which is what a renaming looks like — but the surnames genuinely differ. | **Closed — CB-27 / NM-14.** Different people. |
| UR-18 | Are `ESPA`, `Espa Marsu`, `Marsu` and `Tərlan Salmanlı (ESPA)` one supplier? | One row each. | **Partly closed — CB-28 / NM-15.** `ESPA` ≠ `Marsu`. **Still open:** where `Espa Marsu` and `Tərlan Salmanlı (ESPA)` belong. |
| UR-19 | Are `EMA MMC` and `EMA Qapalı S/C` one supplier? | One row each. | **Closed — CB-29.** One company, canonical `EMA MMC`. |
| UR-20 | Is `Əbülfəz` (6 rows, July–September) a third person, or the same as `Xəyal - Əbülfəz`? | Follow-up to CB-09, which must not be assumed to answer it. | **Closed — CB-30.** Not a third person; canonical `Xəyal Əbülfəz`. |
| UR-21 | `Aydın` — 20 rows, July and September. Full name? | New responsible person. | **Closed — CB-31.** Valid person; kept as `Aydın`. |
| UR-22 | Should `KW` become a unit of measure? | 1 specification row. | **Closed — CB-32.** kilovat / `kW`. |
| UR-23 | Which order unit belongs to `Təmir işləri` (row 2629, Zabitlər, July)? | The cell is empty; the row is blocked. | **Closed — CB-33.** None: the emptiness is intended. Raises TR-11. |
| UR-24 | How should a service priced in money be counted — the unit `azn` (row 2307, `Təmir işləri`, 200 AZN, Sabir bağı)? | CB-16 keeps services in the list but does not say what the unit means. | **Still open.** CB-33 says `AZN` is currency and not an order unit, but does not say what this row's unit should become. |
| UR-25 | How should a recurring monthly charge be counted — the unit `ay` (row 3505, `Ayaqyolu pulu`, 100 AZN/month)? | Same question, different shape. | **Closed — CB-40.** `ay` is a monthly service period; unit `MONTH`. This supersedes CB-34, which had said the value was not in the file. |
| UR-26 | Are `Anbar`, `Azpetrol baza` and `B.A.X Mehdiabad` external suppliers or internal sources? | 1, 1 and 7 rows. Related to UR-02. | **Partly closed — CB-36** (`Anbar` is a supplier) **and CB-35** (`Azpetrol baza` and `Mehdiabad` are locations). **Still open:** what `B.A.X Mehdiabad` in the `Şirkət` column is, given that `Mehdiabad` is a location. |
| UR-27 | What product is the bare name `FAB` (21 rows, 4.15 / 5.00 / 5.85 AZN)? | FAB is a paint brand used across many rows; alone it identifies nothing. Replaces the retired DB-10 FAB pair. | **Closed — CB-37 / NM-16.** The product is exactly `FAB`. |
| UR-28 | Should the workbook's last row hold a grand total? | Source row 3624 carries only `431 670.914` in `Cəmi` and no product, location, quantity, unit or date. It is staged as a row with five errors. | **Still open.** |

### Second round of answers — what the data says (2026-09-22)

The answers CB-25 … CB-37 were checked against batch #50010. Three need a note; the rest match the data.

**⚠️ CB-34 (`ay`) contradicts the staged rows.** The business states the corrected workbook contains no
`ay` order unit. It does: source row **3505**, `Ayaqyolu pulu`, quantity 1, 100 AZN, order unit `ay`,
Hökümət evi və ətrafı parklar, Cleanfix MMC, September. The instruction is followed — **no `ay` unit is
created and UR-25 is marked not applicable** — but the row will keep raising `UnknownUnit` and stay
unresolved in the review centre. It needs either a correction or a decision before that batch can be
imported. Nothing has been changed.

**CB-35 names locations that batch #50010 does not contain.** `Azpetrol baza` appears only in the
`Şirkət` column (1 row) and `B.A.X Mehdiabad` likewise (7 rows); there is no `Bağ`, no standalone
`Mehdiabad` and no `Mehtabad` anywhere in the batch. The decision is recorded as forward-looking
reference data, which CB-24 expressly allows. It contradicts nothing, but **it resolves none of the rows
staged today**, and `Azpetrol baza` being a location does not by itself say what to do with the supplier
cell that carries that name.

**CB-25 and CB-06 name the same record slightly differently** — `Fəvvarələr meydanı` versus
`Fəvvarələr Meydanı`. Only the display capitalisation differs; normalization makes them one value, so
`F.M` (602 rows) and `Sabir bağı` (27 rows) both become aliases of one location either way. The spelling
to print is the only thing left to pick.

Everything else lines up: `Təmir Tikinti` (16 rows, written without a hyphen in the sheet), both Ağakərim
spellings, `EMA MMC` / `EMA Qapalı S/C`, `Əbülfəz`, `Aydın`, `KW` on the fountain pump, the empty `Ö/v`
on row 2629, `Anbar` in the supplier column and the 21 `FAB` rows are all present exactly as the answers
describe them.

### The `Dəyişikliklər` sheet

It is a **changelog of corrections already applied** to `Əsas`, not instructions to execute. Layout:
rows 1–3 a colour legend, row 6 the header `Sətir (Əsas) | Sütun | Dəyər | Səbəb`, then 1,973 entries.

| Flagged column | Entries | Shape of the entry |
| --- | --- | --- |
| Şirkət | 1,158 | old spelling → corrected spelling (`Progress` → `Progres MMC`) |
| Malın adı | 743 | old spelling → corrected spelling (`Karbirator` → `Karbürator`) |
| Alt kateqoriya | 37 | current value + a written reason |
| Orta kateqoriya | 26 | current value + a written reason |
| Ana kateqoriya | 9 | current value + a written reason |

Evidence that the corrections are already in `Əsas`: the fourth column's value exists in `Əsas` for
**1,870 of 1,901** spelling entries, while the third column's old value survives in only 285 — and those
are spellings that are also legitimately used by other rows.

⚠️ **The `Sətir (Əsas)` numbers are not usable as pointers.** Checked at offsets −3 … +3, the best
alignment explains only 532 of 1,971 entries (27%). They appear to number an intermediate version of the
sheet. Anything taken from this sheet must be matched **by content**.

What our system already detects, and what it does not:

| The sheet flags | We detect it? |
| --- | --- |
| A supplier or product spelling that needs mapping | **Yes** — as `UnknownSupplier` / `UnknownProduct`, resolved through the review centre. We never *propose* the corrected spelling: that is TR-04, no fuzzy matching. |
| A location name written into the `Şirkət` column (30 cells) | **No.** We report `UnknownSupplier`; nothing says the value is a known location. Gap — see DB-09. |
| The same product filed under two category paths | **No.** Each path is validated on its own. Gap — see TR-07 and UR-14. |
| A double space inside a category name | **Partly.** Normalization collapses it for matching, so the two spellings resolve to one path, but nothing reports the untidy source text. |

Both gaps are candidates for a later task; neither is needed to ingest the workbook safely, and no parser
for this sheet was built.

## Deferred Implementation

**Status: applied.** This plan was written while nothing had been applied. Tasks 3F, 3G-A, 3G-B and 4 then
carried it out against batch #50010 in exactly this order; see *Application log* below for what each step
actually produced. The plan is kept as written so the intent can still be compared against the result.

The order in which it was to be applied, **against batch #50010**, using only the decisions the rebase
marks A, B or D-after-review:

1. **Reference decisions** — locations (CB-01 … CB-08, **CB-25, CB-26, CB-35**, DB-02, DB-04 minus the
   Qafur Məmmədov pair), responsible people (CB-09, **CB-30, CB-31**), suppliers (**CB-27, CB-28, CB-29,
   CB-36**), units (CB-15, **CB-32**, DB-05 including `m²`). Aliases only where the operator asks for
   them. CB-11, CB-12 and DB-08 no longer need a merge; only their canonical spelling is a choice.
   `Xəyal Əbülfəz` needs all three source spellings as explicit aliases (CB-30).
2. **Row corrections** — RC-02 and RC-04. RC-01, RC-03 and RC-05 are already fixed in the file.
3. **No exclusions.** RC-06 does not apply to the corrected workbook.
4. **The empty-order-unit rule** — decide TR-11 before readiness can ever pass, because CB-33 makes an
   empty `Ö/v` legitimate while the current rule blocks it.
5. **Product and variant resolutions** — DB-10 minus the retired FAB pair, with `FAB` created as itself
   (CB-37), respecting every rule in *Explicit "Do Not Merge"*.
6. **Order creation (Task 4)** — after the reference and product decisions are in place.

At the time this plan was written, the following were explicitly **not** done and **not** started:
applying any resolution, creating any alias, product, variant, supplier, location, unit or category,
correcting or excluding any row, any migration, any production code change, and Task 4.

## Application log

What each task did with the plan above. Batch #6 was never touched by any of them.

| Task | What it applied | Result |
| --- | --- | --- |
| **3F** | Steps 1, 2, 3 and 5 — reference decisions, RC-02 and RC-04, product and variant resolutions — using only the existing review services (`ImportResolutionService`, `BulkResolutionService`, `ImportRowCorrectionService`, `ImportRevalidator`). No parallel data-cleaning path. | Stopped deliberately before step 4: TR-11 could not be honoured without a domain change, and that was reported instead of being worked around with an invented unit. |
| **3G-A** | Step 4, the domain half — specification descriptors, `MarkNotAUnit`, intentionally-empty order unit, nullable `ProductVariant.OrderUnitId`, descriptor-aware variant key. | An empty `Ö/v` can now be *reviewed as meaningful* rather than blocking. No placeholder unit was created; existing variant keys were left byte-identical. |
| **3G-B** | CB-38, CB-39 and CB-40 — operational location names, `Qala baza` in both catalogs, `ay` as the `MONTH` unit — plus the Review Center screens for the new decisions. | Batch #50010 reached `ReadyToImport`; readiness was never forced. |
| **4** | Step 6 — confirmation of batch #50010. | **167 `OrderRequest`s and 3,618 `OrderRequestItem`s**, reconciled to 431 670.9140 over the priced lines. One excluded row became no item. Batch #50010 is `Imported`. |
| **5** | Nothing. Task 5 is read-only and applied no decision. | The browsing screens display the confirmed decisions (`Vahidsiz`, `ay`/MONTH, `Qiymət yoxdur` instead of a zero) but cannot change them. |
| **6A** | Nothing. The analytics engine is read-only and applied no decision. | It *reads* the confirmed service semantics: a variant with no order unit, with `MONTH` (CB-40) or with `TIME` is compared by money and never by quantity, because "1 ay → 2 ay" is not a doubling of consumption. Descriptor variants (CB-33 family) stay separate comparison rows. No product carries a canonical category, so category is **not** an analytics dimension yet — see UR notes below. |
| **9A** | Nothing. Task 9A adds the correction of returned orders (see *Order corrections* below) and applied it to no company request. | All 167 requests are still `Draft` at version 1: no correction, no edit, no lineage link, no workflow event. The migration added a nullable column and left the 3,618 imported lines unwritten. |

## Write log


Counts in `BaxOrders_Dev`. The first three rows are the zero-write verification of the register itself and
of the corrected-workbook intake; the last two are what applying the register actually wrote.

| | Products | Variants | Aliases | Resolutions | Corrections | Excluded rows | Batch #6 rows | Batch #50010 rows |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Register written | 0 | 0 | 0 | 0 | 0 | 0 | 2,672 | — |
| After staging #50010 | 0 | 0 | 0 | 0 | 0 | 0 | 2,672 | 3,619 |
| After the second round of answers | 0 | 0 | 0 | 0 | 0 | 0 | 2,672 | 3,619 |
| After Tasks 3F + 3G | 1,112 | 1,380 | 15 | 2,748 | 5 | 1 | 2,672 | 3,619 |
| After Task 4, unchanged by Task 5 | 1,112 | 1,380 | 15 | 2,748 | 5 | 1 | 2,672 | 3,619 |

Reference data after the same work: suppliers 78, locations 29, units 17, categories 148, responsible
people 4. Orders: 167 `OrderRequest`s and 3,618 `OrderRequestItem`s, all still `Draft`, linked to their
source rows by 3,618 `ImportRowMaterializations` under one `ImportMaterialization`.

Two things did not change at any point: **batch #6 still holds its original 2,672 staged rows**, and no
`Original*` value in any staged row was ever rewritten. Writing documentation is not a database write.

## Order corrections (Task 9A)

How a returned order is put right. The first table is what the business fixed when it set the task; the
second is what the implementation had to decide on its way, each chosen to be the safer reading and each
reversible if the business decides otherwise.

### Fixed by the business

| # | Decision |
| --- | --- |
| OC-01 | A request that has entered review — `PendingApproval`, `Approved`, `ReturnedForCorrection` — is an immutable business snapshot. Its lines are never edited. |
| OC-02 | A returned request is corrected by a **new version**: same location, same period, next version, `Draft`, with an exact copy of every line. |
| OC-03 | Only `ReturnedForCorrection` may be corrected. Correcting an **approved** month is a future decision, not implied by this one. |
| OC-04 | One returned version produces at most one correction. A returned correction is corrected again (V2 → V3), never reopened. |
| OC-05 | A copied line records the line it was copied from, one version back. Import provenance is inherited through that chain; no workbook row is materialized twice, and a line added by hand has no workbook row. |
| OC-06 | Editable in a correction draft: quantity (> 0), price (a price or *unknown* — never zero for unknown), supplier (a catalog supplier or none). The product of a line does not change: remove it and add the other. Lines may be added and removed. |
| OC-07 | Every change is recorded, append-only, with the actor's identity and name at the time, and structured old and new values. |
| OC-08 | Coordinator and Admin correct and edit; Manager reads only. Self-approval (Task 8B) is unchanged. |
| OC-09 | Only a draft that was made as a correction is editable. The 167 imported drafts are **not** made editable. |
| OC-10 | Analytics keeps selecting the highest version of a month whatever its status, so **a correction draft becomes the analytics version the moment it exists**. Approved-only analytics remains a separate, future decision. |

### Decided in implementation — for the business to confirm

| # | Decision | Why | If the business wants otherwise |
| --- | --- | --- | --- |
| OC-11 | Once a returned version has been corrected, it can no longer be **resubmitted unchanged**. Before it is corrected it still can, as Task 8A allowed. | Otherwise V1 (resubmitted) and V2 (the correction) would both be live versions of one month in front of the approver. | Drop one check in the workflow service. |
| OC-12 | Only the **newest** version of a month may be corrected. | Correcting an older one after something newer exists (a second import) would fork the history and hand analytics a stale month. | Allow it and decide which of the two forks analytics should read. |
| OC-13 | A copy keeps a line's variant and supplier **even if they have been deactivated since**; new and changed values must be active. An inactive location or responsible person blocks a correction, as it blocks any new version. | Refusing the copy would make a returned order uncorrectable; the person correcting it removes and replaces the retired line. | Refuse corrections that carry retired records. |
| OC-14 | The self-approval rule follows the **submitter** of the current cycle only. Someone who edited a correction but did not submit it may still approve it. | That is the Task 8B rule, which Task 9A was told to leave unchanged. | A "four eyes on edits" rule: whoever edited a correction may not decide on it. |
| OC-15 | Removing a line from a correction draft deletes it from that draft; the history keeps the whole line as it was. | Hiding "removed" lines instead would have to be taught to every query that reads lines — analytics, the dashboard, totals — with a real chance of one being missed. | Keep removed lines as soft-deleted rows, with that cost. |
