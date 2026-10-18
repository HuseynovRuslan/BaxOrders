# Accepted decisions

Only decisions the owner has actually made, or rules already implemented and accepted in the code. Nothing here
is inferred. If a line has no source, it does not belong in this file.

## Source of truth

| # | Decision | Source |
|---|---|---|
| D-01 | **`Aylıq` is the authoritative worksheet.** `Əsas` takes no part in staging, validation, duplicate detection, issues or confirmation. No fallback. | Owner, 2026-09-27 |
| D-02 | A workbook without `Aylıq` is refused: «Aylıq vərəqi tapılmadı. Sifariş idxalı üçün əsas məlumat vərəqi mövcud deyil.» | Owner, 2026-09-27 |
| D-03 | Original\*/provenance values are immutable. Historical source facts are never silently overwritten. | Owner, standing |
| D-04 | Unknown catalog values are never silently created. | Owner, standing |
| D-05 | A missing price stays null. Never zero. | Owner, standing |

## Order lines

| # | Decision | Source |
|---|---|---|
| D-10 | `OrderLineType` is **line-level**. `Aylıq sifariş` → Monthly, `aylıq sifariş` → Monthly, `Aylıqdan kənar` → OutsideMonthly, blank → Warning + Unclassified, unknown word → Warning + Unclassified. | Owner, 2026-09-26 |
| D-11 | No month-based inference. The importer must never read September's blank cells as Monthly. | Owner, 2026-09-27 |
| D-12 | `ResponsiblePerson` is **line-level** (`OrderRequestItem.ResponsiblePersonId`). | Owner, 2026-09-27 |
| D-13 | `OrderRequest.ResponsiblePersonId` is an **explicit whole-request assignment/override**. Where it is null the reader is shown the person the lines agree on, or «Bir neçə cavabdeh». **No majority voting**, ever. | Owner, 2026-09-27 |
| D-14 | Request 76 → Çingiz, request 104 → Qədeş. The line-level source facts underneath both stay unchanged. | Owner, 2026-09-27 |
| D-15 | **The 480 blank September 2026 «Növ» cells are `Aylıq sifariş`**, written into the workbook itself (`Aylıq!R3141:R3620`). Not a rule in the importer — D-11 still forbids that. The source now says what the business always meant. | Owner, 2026-09-27 (B-01 approved) |

## The remaining workbook conflicts, answered 2026-09-27

| # | Decision | Source |
|---|---|---|
| D-16 | **«Yay ayaqqabısı» belongs in the workbook.** The row that became item 2988 was not meant to disappear; it is restored to `Aylıq` as row 3621 from its own historical source row (`Əsas` 3035), and **its «Növ» is left empty** — no source states it and it must not be guessed. | Owner, 2026-09-27 (B-02) |
| D-17 | **«Kürək düz» is a purchase, not free supply.** Item 500 takes the workbook's price: 3 × 4 = 12. Recorded through the pricing decision log, `Original*` untouched. | Owner, 2026-09-27 (B-03) |
| D-18 | **`Enli skoç şəffaf 200` is 50 mm, not 50 mt.** The workbook's «Vahid» on `Aylıq` row 1248 is corrected to `mm`, and the row then matches the catalog variant that already existed. | Owner, 2026-09-27 (B-04) |
| D-19 | **The seventeen «Laqonda daşı metal üçün» lines follow the new workbook.** One canonical product of that name, with a variant per current Ölçü + Model/Kod; rows of the same normalized identity share a variant, so 1730 and 2201 are one and 2251 is its own at 180 mm. The six historical products stay untouched — not deleted, renamed or merged — and **no alias is written**, so nothing folds their identity into the new product. | Owner, 2026-09-27 (B-05) |
| D-24 | **The restored «Yay ayaqqabısı» line is `Aylıqdan kənar`.** The one cell left unresolved by D-16 is now stated in the workbook. **Applied to the historical line itself on 2026-10-09** — item 2988 had stayed `Unclassified` because it came from the September import and the workbook has not been re-imported since. | Owner, 2026-09-28 |

| D-25 | **«Aylıq» vərəqi əsasdır.** Kitabda vərəqlər ziddiyyət təşkil edəndə `Aylıq` qalib gəlir: `Növ` sütunu yalnız orada var, idxal yalnız oranı oxuyur (`70b74a6`), və sahib sətirləri onunla təsvir edir. `Əsas` tarixi arxivdir, `Лист1` qaralamadır. | Sahib, 2026-10-09 |
| D-26 | **Xətai parkı · sentyabr 2026 · Pittosporum = 50 ədəd** (50 × 4 = 200 ₼). `Лист1` qaralamasındakı 5 × 4 = 20 rəqəmi D-25-ə görə qüvvədə deyil. | Sahib, 2026-10-09 (D-25-dən) |

## Units and specifications

| # | Decision | Source |
|---|---|---|
| D-20 | `lik / lıq / luq / lük` are the four vowel-harmony forms of one Azerbaijani suffix. They are **specification descriptors, not units of measure**, and normalize to one descriptor `lik`. | Owner, accepted; implemented in `SpecificationDescriptorNormalizer` |
| D-21 | `yarpaq`, `qat`, `diş`, `ədədli` are specification/count descriptors, not units. Evidence: 2026-09-27 audit — every row states Ölçü, Ö/v is separately filled and resolves, and the canonical catalog already holds variants with these descriptors (lik 118, diş 5, yarpaq 4, ədədli 3, qat 2). | Audit 2026-09-27, consistent with D-20 |
| D-22 | A value in a unit column is marked "not a unit" **per batch** (`ImportResolution.NotAUnit`, always `ResolutionScope.BatchOnly`). No global automatic descriptor reuse without an owner decision. | Code, accepted; owner reaffirmed 2026-09-27 |
| D-23 | An **order unit** cell is made explicitly empty **per row**, through a row correction (`ImportRowCorrection` clear), not per value. A currency such as `azn` in "Ö/v" is handled that way and never becomes a unit. | Code + tests `UnitlessAndDescriptorTests`, accepted |

## Rows

| # | Decision | Source |
|---|---|---|
| D-30 | A row is business data when at least one column outside `№` and `Cəmi` carries something. A summary/total row is not a line. | Owner, 2026-09-27 |
| D-31 | A half-written row still stages, and what it is missing is reported rather than swallowed. | Owner, 2026-09-27 |

## Historical invariants (must hold after every change)

```
OrderRequests            167
OrderRequestItems       3618
ImportRowMaterializations 3618
known amount     431670.91404 AZN
Monthly                 3293
OutsideMonthly           324
Unclassified               1   (item 2988 only)
line-level ResponsiblePersonId on all 3618 items
```

---

# Autonomous decisions

Made under the owner's autonomy grant of 2026-09-27: where a choice is product, policy or catalog
representation rather than historical truth, and the recommendation is defensible and reversible, it is taken
and recorded here rather than parked. Each one states how to change it later.

## AD-01 · A brand or a grit is a **variant**, not a product — 2026-09-27

**Problem.** 17 rows name a product the catalog has and ask for a model it does not: 9 × `Laqonda daşı almaz`
with `№611320`, `№611340`, `BOSCH`, `Staunch` ×4, `Mrtony`; 8 × `Laqonda nasadkası üçün şkurka` with `P40`,
`P60`, `P80` ×2, `P100` ×2, `P120`, `P220`. The catalog is inconsistent: some grits already exist as separate
products (`… üçün şkurka P100`, `… P40 göy`, `… P60 göy`).

**Options.** (a) a variant of the existing product, carrying the workbook's «Model/Kod» text; (b) a new product
per brand/grit, matching the older records; (c) map each row onto whichever of the two shapes already exists.

**Chosen: (a).** `ProductVariantKey` already makes the model part of variant identity and
`ModelCodeNormalizer` exists for exactly this comparison, so (a) needs no new concept. It keeps one product per
real article, which is what a manager compares month over month — five products called almost the same thing
would split one trend into five. The workbook's text is kept verbatim, so no source identity is lost.

**Not done, deliberately:** the grit-as-product records that already exist are **left alone**. Folding them into
variants would merge historical products, which the hard boundary protects.

**Affects.** Catalog data only, and only when a real batch is reviewed: the operator uses the existing
"create variant" action of the import review. No code, no migration.

**How to change later.** A variant can be re-pointed, or a product created and the rows mapped to it, through
the same review screens. Nothing here is irreversible.

## AD-02 · `Təmir işləri` is a service line with no order unit — 2026-09-27

**Problem.** `Aylıq` rows 2307 («Ö/v» = `azn`) and 2629 («Ö/v» empty) are repair work. `azn` is a currency, and
the pipeline refuses it as an order unit — correctly.

**Options.** (a) treat them as service lines and clear the cell per row, which is the accepted mechanism (D-23);
(b) invent a unit for `azn`; (c) leave them blocked.

**Chosen: (a).** (b) is forbidden by D-04 and would put a currency in the unit catalog. The domain already
models a unitless line, `ProductVariantKey` documents it, and `UnitlessAndDescriptorTests` already pins exactly
this case — including a row whose «Ö/v» says `azn`.

**Affects.** Review data only: one `ImportRowCorrection` clear per row. `Original*` stays `azn`. No code.

**How to change later.** `CorrectionService.RevertAsync` puts the blocker back.

## AD-03 · The three corrupted/emptied source cells are repaired **in review**, from the older source — 2026-09-27

**Problem.** Three rows are read exactly as written and the writing is wrong: `Aylıq` 501 and 609 carry model
`2021-11-11` where the older source has the text `11 11 21` (Excel turned it into a date), and `Aylıq` 227 has an
empty Ölçü and Vahid where the older source has `125 mm`.

**Options.** (a) correct the cells in the owner's workbook; (b) record an `ImportRowCorrection` per cell during
review, with the older source as the evidence; (c) accept the corrupted values.

**Chosen: (b).** (c) is refused by the standing rules — a specification must not be destroyed by a generic
rename, and `11 11 21` must not become a date. (a) rewrites the owner's document and is parked as B-01's
sibling. (b) keeps `Original*` immutable, leaves an audit trail of who corrected what, and needs no permission
outside the application.

**Affects.** Review data only, when a real batch is reviewed. No code.

**How to change later.** `CorrectionService.RevertAsync` per cell.

## AD-04 · The eight descriptor values are confirmed per batch through the existing review action — 2026-09-27

**Problem.** 198 of the 222 variant blockers are rows whose «Vahid» holds `lik`, `lıq`, `luq`, `lük`, `yarpaq`,
`qat`, `diş` or `ədədli`. D-20/D-21 settle what they are; D-22 says the "not a unit" decision is per batch.

**Options.** (a) the reviewer marks the eight values through the existing action, once per batch; (b) make the
decision reusable across batches automatically; (c) a parser rule that recognises the words without a decision.

**Chosen: (a).** The owner reserved (b) for their own decision, and (c) would let an unknown word become a
descriptor silently — the opposite of D-04. Eight actions per import is a small price for a decision that stays
visible. Audited: after those eight, **all 198 rows match variants that already exist**; none needs creating.

**Affects.** Review data only. No code.

**How to change later.** (b) remains open as an owner decision; nothing implemented here stands in its way.

## AD-05 · A cell the workbook lost is restored from the company's own catalog — 2026-09-27

**Problem.** `Aylıq` row 597, `Rolik başlığı`, Ölçü 10, Vahid `sm`, quantity 10, price 1 — and «Ö/v» empty. A
missing order unit is an error, so the row blocks the import. It is not a service line, so AD-02 does not cover
it.

**Options.** (a) correct the cell in review from the company's own record; (b) leave it blocked for the owner;
(c) treat it as a service line with no unit, as AD-02 does for `Təmir işləri`.

**Chosen: (a).** (c) would be a lie about a physical article. (b) asks the owner a question their own catalog
already answers: variant 20121 is `Rolik başlığı` 10 CM ordered in **PCS**, and it has been ordered seven times,
four of them at exactly this quantity and price. The evidence is not contradictory — this product has never been
ordered in anything else — so the hard boundary is not touched. The correction leaves `OriginalOrderUnit` empty
for ever and carries an audit trail.

**The rule this generalizes.** A cell the workbook lost may be restored in review when the company's own records
give exactly one answer. Where they give two — `mm` against `mt` on row 1248 — it stays an owner question
(B-04). Existence of an answer is not enough; it has to be the only one.

**Affects.** Review data only, when a real batch is reviewed. No code, no migration.

**How to change later.** `CorrectionService.RevertAsync` puts the blocker back.

## AD-06 · Source repairs come before catalog creation — 2026-09-27

**Problem.** The review lets an operator create variants and correct cells in any order. Creating first is
destructive in a quiet way: a variant is permanent catalog identity, so a corrupted cell becomes the company's
record of what that article is.

**Measured, not argued.** The same workbook through the same endpoints, twice:

| order | variants created | what was written |
|---|---|---|
| variants first | **15** | `Yaramilla` with model `2021-11-11`, `Laqonda naqilli` with no specification at all, and `Enli skoç 50` — three articles the catalog already holds under their right identity |
| repairs first | **12** | twelve genuine makes; rows 227, 501, 597 and 609 matched variants **20861, 20415 and 20121, which already existed** |

**Chosen.** The accepted order of a review is: the descriptor decisions (AD-04), then the cell repairs (AD-03,
AD-05), then the service lines (AD-02), and only then the variants (AD-01). Written down rather than built in,
because the review is the operator's to sequence and a rule that refused would get in the way of the many cases
where there is nothing to repair.

**Affects.** How a real review is carried out. No code.

**How to change later.** If an operator gets it wrong, the variant is deletable while nothing references it; the
row can then be corrected and re-matched. The defect that made a corrected row impossible to create a variant
from at all was a separate matter and is fixed in `4b5386b`.

## AD-07 · The monthly report's grid is the month's demand — 2026-09-28

**Problem.** The year-at-a-glance report added every line of a month together and compared the result with the
month before. The company's workbook carries 325 outside-monthly lines, so a month where a pump broke read as a
rise in demand. Every other comparison surface had read monthly lines alone since `MonthlyComparisonPopulation`;
the report was the one that had not.

**Options.** (a) the grid shows and compares monthly money, with the rest beside it; (b) the grid keeps showing
the whole month but computes its differences on monthly money; (c) leave it and explain it in the UI.

**Chosen: (a).** (b) prints a difference that does not match the numbers above it, which is worse than either
pure reading. (c) leaves a wrong comparison on the screen. So the cells, their differences, the three-month
average behind «Qeyri-adi ay» and the year total are monthly money, and each cell, row, month and the company
carry the outside-monthly and the unclassified money apart from it.

**The page.** Three figures head the year instead of one — «Aylıq sifarişlərin məbləği», «Aylıqdan kənar məbləğ»
with its line count, and «Ümumi faktiki xərc» — so the manager never has to add two numbers in their head.
Unclassified lines are in neither and the page says so in one line.

**Affects.** `MonthlyReportQueries`, its DTOs and `MonthlyReportPage`. No data, no migration.

**How to change later.** The population is one call; the three figures are additive fields nothing else reads.

---

## The executive redesign — 2026-09-28

**D-R1 · One scope vocabulary, three questions.** «Aylıq sifarişlər», «Aylıqdan kənar», «Hamısı» mean the same
thing on the dashboard and on the monthly report, and the API takes the same enum. `AnalyticsScope.All` is
never called monthly demand anywhere in the product: it is what the company spent, unclassified lines included.

**D-R2 · The scope decides exactly one figure, and everything else follows it.** On the dashboard that is the
snapshot population; on the report it is `KnownAmountOf`. The differences, the averages and «Qeyri-adi ay» are
built from that figure, so they cannot disagree about which lines they are about. The alternative — scoping the
cells and leaving the arithmetic behind — would show one population under another one's arithmetic.

**D-R3 · A month's own composition never moves with the scope.** The dashboard's `lineTypes` and the report's
per-cell split describe what was ordered, not what was asked about. Both are pinned by a test that compares
them with themselves across the three scopes.

**D-R4 · Two depths, not two dashboards.** «Sadə baxış» is the default and answers the five questions a manager
opens the page with. «Ətraflı baxış» keeps every word and figure the screen has ever had. Nothing was deleted
by the redesign; complexity moved one level down, into the second view and into the drawer.

**D-R5 · A short list must say what it is short of.** The Top-3 says how many objects are outside the
comparison and that the whole table is below it. The drawer says the product-by-product list is on the order
page, and opens it, rather than showing a second, shorter list that could disagree with the first.

**D-R6 · A rise is divided by the rises and a fall by the falls.** Contribution percentages in the drawer use
the one share helper the product shares. Adding the two directions together to make a denominator would name a
share of nothing.

**D-R7 · The build gate is `tsc -b`.** `tsc --noEmit` at the web root type-checks zero files. Any claim that
the frontend typechecks must come from `tsc -b` or `npm run build`.

---

## The Stitch dashboard — 2026-09-29

**D-S1 · The YAML palette, not the prose.** `DESIGN.md` carries two incompatible colour schemes. Not one value
named in its prose (`#0F172A`, `#2563EB`, `#059669`, `#D97706`, `#DC2626`, `#F1F5F9` …) appears anywhere in
`code.html`, and the approved screenshot is visibly the YAML scheme. What was approved is what somebody looked
at, so the YAML tokens ship and the prose stays as rationale.

**D-S2 · A standing rule outranks a mockup.** The handoff puts an object code in every card's corner; Task 05b
decided technical identifiers do not appear on a manager's screen. The rule wins, and the code stays on the
object's own page where somebody looking one up expects it.

**D-S3 · Never draw a control that does nothing.** The ⌘K search, the notification bell and the export button
have nothing behind them in this product. They are absent rather than inert: a reader who clicks a live-looking
control and gets nothing trusts the next control less.

**D-S4 · Say the true thing instead of the reassuring one.** The handoff's «Sinxronizasiya: Bu gün, 09:42» is
replaced by when the answer on screen was actually read. This product synchronises with nothing, and a sync
time it cannot back up is a fiction in the one place a reader checks for freshness.

**D-S5 · Spending is counted under the catalogue's root.** Ten roots is a list a manager reads; 105 leaves is
not. Four are named and the rest folded, so the breakdown still adds up to the month. Products filed under no
category are their own row, never folded into «Digər» — the absence of an answer is not another answer.

**D-S6 · The off-plan KPI describes the month, not the question.** Three of the four cards follow the scope;
the fourth is fixed to the month's own composition, so a reader who has scoped the screen to the plan can still
see what fell outside it. The same rule the line-type split has always followed.

**D-S7 · A card is not a clickable surface any more.** The approved design gives each outlier card an explicit
«Detallara bax →». Table rows keep the whole-row surface; cards do not. The link is where the reader can see it.

---

## The Figma Make simple view — 2026-09-29

**D-F1 · Two languages, not one merged design.** The owner approved a Figma Make handoff for «Sadə baxış» and
a Stitch handoff for «Ətraflı baxış». They are implemented separately and the toggle swaps the whole
composition. Blending them would produce a third design nobody approved.

**D-F2 · The shared chrome stays Stitch.** The navy column and the utility bar are neither view's content, and
repainting the sidebar as the reader toggles would be exactly the third design D-F1 forbids.

**D-F3 · The product's colour rule outranks the mock's.** The Figma mock paints a rising number green. Here a
rising number is money leaving, so cost up is red and cost down is green. The tokens are named `cost-up` and
`cost-down` so the mock cannot re-invert them by being read again later.

**D-F4 · Off-plan spending is not painted red.** Red means the cost went up. A kind of spend is neither a rise
nor a fault, and the card already names it and gives the amount. Changed on both views.

**D-F5 · The chart names the biggest spenders, not the biggest movers.** «Əsas xərc daşıyıcıları» is the
handoff's own phrase, and it is also the only ranking that produces a readable chart: by movement, this
month's three largest movers are 283, 2 114 and 9 882 ₼ beside a remainder of 39 384 ₼. The cards below are
the ones ranked by movement.

**D-F6 · Tokens from a second handoff are prefixed.** Both handoffs define `surface`, `background` and
`border`. The Figma set ships as `simple-*` so one cannot silently overwrite the other.

**D-F7 · A chart gets a table.** An SVG chart says nothing to a screen reader, and recharts draws nothing in
jsdom — so the screen-reader table is both the accessibility answer and the only way the chart's choice of
objects can be tested.

---

## The approved BaxOrders UI — 2026-09-29

The owner approved a new design in Figma (`BaxOrders-UI-v2`, frame `baxorders-dashboard`, node `6:4`) for the
app shell and for «Sadə baxış». «Ətraflı baxış» is being designed separately and was not touched.

**D-V1 · The new design replaces the Figma Make simple view; it does not sit beside it.** Two simple views
would be the third design D-F1 forbids, one toggle deeper. The Figma Make components and their `simple-*`
palette are deleted from the product — the handoff itself stays untouched under `design-reference/`, and git
history has the code.

**D-V2 · The shell is now the approved one, and both views sit in it.** D-F2 said the shared chrome stays
Stitch because repainting it as the reader toggles would be a third design. The new design *is* the shell, so
the rule is unchanged and only the answer moved: one chrome, drawn as approved, for both views.

**D-V3 · Two slots in the design are people who do not work here.** The avatars are photographs of invented
colleagues; a mark stands in their place. The bell is a notification centre this product does not have; the
slot carries the approval queue instead — a real count, a real destination, and an accessible name that says
how many orders are waiting rather than leaving a red dot to say it.

**D-V4 · F-10 is answered by the design, not overturned by the implementation.** F-10 deferred the six-month
trend from «Sadə baxış» because the Figma Make composition did not have one. The approved BaxOrders design
does — «Xərc dinamikası» is its largest section — so the trend returns as approved design rather than as a
change of mind. The old split bar is still absent, and still has no design asking for it.

**D-V5 · The design's own colour rule agrees with the product's.** Unlike the Figma Make mock (D-F3), this
design paints a rise red and a fall green throughout. Nothing had to be inverted this time; `cost-up` and
`cost-down` stay named as they are so the next mock cannot re-invert them either.

**D-V6 · «Digər» folds the tail so five rows still add up to the month.** The category API returns up to six
rows — four named, a folded remainder and whatever nobody has filed. The approved design shows five, so the
tail folds again here. «Ətraflı baxış» keeps all six apart, including the unfiled row, which D-S5 requires.

**D-V7 · The role moved to the sidebar, because that is where the design puts it.** Brief 14's rule — a Rəhbər
is named for what they are and «Administrator» appears nowhere — is unchanged; only the line it is written on
moved, from the header to the account card at the foot of the column.

**D-V8 · A control's accessible name does not change with the width it is drawn at.** The view toggle reads
«Sadə» / «Ətraflı» as the design draws it, and announces «Sadə baxış» / «Ətraflı baxış» as the product names
it everywhere else.

**D-V9 · Four figures are a grid, not a wrapping row.** Four across from 1280, two and two below it, one per
row on a phone. As a wrapping flex row the fourth card fell to its own line at 1200 and stretched across the
page alone, which reads as a different kind of card.

**D-V10 · The trend's figure follows the pointer; it is not pinned to the current month.** The approved design
pins «71.2K ₼» over September, which leaves the other five heights a picture nobody can put a number to, and a
blue bar that never moves reads as decoration rather than as a reading. Any month now lights the same blue and
writes its amount when pointed at. Two consequences: the label is the exact amount, because the rounding only
existed to keep a permanent label short; and an untouched chart carries no figure at all — the current month
keeps its colour, which the legend names and which is a fact about the month, but nothing floats over it.
Owner's request, 2026-09-29.

---

## Batch 50011 — sentyabr sətirlərinin əlavəsi, 2026-10-09

**D-27 · «Aylıq»-dakı nömrəsiz sətirlər versiya mexanizmi ilə gəlir.** Təsdiqlənmiş sifarişə sətir əlavə
etməyin sistemdə yeganə yolu idxaldır (`CreateNextVersion` yalnız `ImportConfirmationService`-dən və
`ReturnedForCorrection` statusundakı `CreateRevision`-dan çağrılır). Ona görə yeni sətirlər v2 **Draft** kimi
gəlir, v1 Approved toxunulmur, təsdiq isə real şəxsi gözləyir. Saxta təsdiqçi və tarix yaradılmır.

**D-28 · «kamaz» öz ölçü vahididir.** Daşınan yükün say vahidi; «ədəd» və ya «m³» ilə eyniləşdirilmir.
«15 kub» spesifikasiya dəyəri (15) + təsviri («kub») kimi saxlanılır. Sahib, 2026-10-09.

**D-29 · «Saxsı qab» ayrıca məhsuldur.** «Gül qabı və dibçək» kateqoriyasında; mövcud «Saxsı dibçək» ilə
birləşdirilmir. Sahib, 2026-10-09.

**D-30 · «Vahid» sütunundakı «yarpaq», «lik», «kub» ölçü vahidi deyil, təsvirdir.** Kataloq onsuz da onları
`SpecificationDescriptor` kimi saxlayır; idxala da bu deyilir. Qərar yalnız bu partiyaya aiddir (BatchOnly),
qlobal alias yazılmır.

**D-31 · Zabitlər parkı sentyabr idxalı DAYANDIRILDI.** №3482/3483 («Laqonda nasadkası üçün şkurka» P40/P60)
sətirlərinin v1 variantı 20864/20865-dir, onların məhsulu 20702/20703; yeni kitab isə sətri məhsul 20313-ə
aparır. Bir məhsul açarı iki məhsula bağlana bilmədiyi üçün v1 variantı qorunmur. Sahibin «mövcud sətirlərin
məhsulu dəyişməsin» şərtinə görə qrup gətirilmədi.

**D-32 · Xətai parkı v2-si yaradıldı və GERİ ALINDI.** Yoxlama göstərdi ki, mövcud bir sətrin məhsulu
«Laqonda nasadkası qırmızı» (20699/20863) → «Laqonda nasadkası» (20698/20862) dəyişir — bu sətir avtomatik
uyğunlaşdığı üçün əvvəlcədən görünməmişdi. Sahibin dayanma şərtinə görə sifariş 169 silindi; v1 (165)
toxunulmadı.

**D-33 · Sahibin yekun Excel-i təsdiqlənmiş tarixi sənəddir.** Onun düzəlişləri yeni sifariş deyil; qüvvəyə
minmək üçün menecer təsdiqi gözləmir. Tətbiq edilən mexanizm sistemin özünün `ImportedAsApproved` semantikasıdır
(miqrasiya `20260923122642`): aktyor «Sistem», `ActorUserId` NULL, `SubmittedAtUtc`/`ApprovedAtUtc` NULL —
çünki bu sistemdə heç kim onları təsdiqləməyib və uydurma tarix yazmaq yalan olardı. Yeni sifarişlərin adi
təsdiq axını toxunulmayıb. Sahib, 2026-10-09.

**D-34 · Xətai və Zabitlər v2-si idxalla yox, dar əhatəli uzlaşdırma ilə quruldu.** İdxal onların Laqonda
sətirlərini v1-dəki məhsulda saxlaya bilmir (bir kitab adı bir məhsula həll olunur, v1 isə «…P40 göy» və
«…P60 göy» kimi ikisini saxlayır). v1-in öz `ProductVariantId`-si köçürülüb; heç nə adlandırılmayıb, alias
yazılmayıb. Hər köçürülən sətir `SourceOrderRequestItemId` ilə öz mənbəyinə bağlıdır. Skript:
`INVESTIGATIONS/reconcile-2026-10-09/09-effektiv-tarixi-versiyalar.sql`, idempotentdir.

**D-35 · «Qala Baza»nın qiymətsiz 27 sətri daxili tədarükdür.** Yekun Excel-də qiymət xanası boş olan 27 sətrin
**hamısı** «Qala Baza»dır — şirkətin öz anbarı. Sahib təsdiq etdi: mal anbardan verilib, alış deyil, ona görə
qiymət yoxdur. Sətirlər `InternalFreeSupply` rejiminə keçirildi və qiymətləri təmizləndi — «qiymət gözlənilir,
amma yoxdur» (`PriceRequired` + boş qiymət) yanlış mesaj olardı. Köhnə qiymətlər audit izində və qiymət qərar
jurnalında saxlanılır. Effektiv məbləğ 432 453,01404 → **431 971,26404** (−481,75). Sahib, 2026-10-09.

**D-36 · Söz fərqi olan adlarda Excel əsasdır.** Kataloq ilə kitab eyni şeyi fərqli sözlə yazanda kitabın
yazılışı qalib gəlir. Tətbiq olunanlar: `Dırmıq plastik Gardena` → **`Dırmıq Gardena plastik`** (ad dəyişmə,
4 sətir) və `Cod şotka` → **`Cod fırça`** (birləşmə: 11 sətir 20123-ə keçdi, cəmi 17; köhnə məhsul silinmədi,
deaktiv edildi). Pul və sətir sayı dəyişmədi. Sahib, 2026-10-09.

**D-37 · «Şkurka üçün nasatka laqondaya» ilə «Laqonda nasadkası üçün şkurka» AYRI mallardır.**
Sözlər eynidir, sıra tərsinədir, məna da tərsinədir: biri laqondaya taxılan **altlıq (nasadka)**, digəri həmin
altlığa taxılan **sumbata kağızı (şkurka)**. Variantları da fərqlidir (115 **MM** ↔ «115 **lik**» təsviri).
Sahib təsdiq etdi: **birləşdirilmir**. Deməli bu sətirlərdə kitabın adlandırması iki malı bir adla yazır və
kataloq daha dəqiqdir. Sahib, 2026-10-09.

**D-38 · `Laqonda daşı dəmir üçün` → `Laqonda daşı metal üçün`.** Bu, həmin bir məhsul üçün **D-19-u ləğv edir**.
Model/kod daşıyan dörd qardaş məhsul (`… Alevs`, `… AO 46SBF-42 Alevs`, `… AO 60TBF-41 Alevs`,
`… AO 60TBF-41 Skom`) adlandırılmadığı üçün D-19-un qorumasında qalır və toxunulmadı. Ad dəyişmədir,
birləşmə deyil: bu adda başqa məhsul yox idi; `Id`, iki variant və yeddi sətir qaldı. Sahib, 2026-10-09.

**D-39 · «Excel-də necədi elə olsun» — model/marka adın içindən öz sütununa keçdi.** Sahib yekun qərarı verdi:
kitab ilə proqram fərqlənəndə kitab qalib gəlir. Araşdırma göstərdi ki, kitab kataloqdan **daha yaxşı
qurulub**: malın qradını və markasını (`P100`, `Staunch`, `AO 60TBF-41 Skom`) öz `Model/Kod` sütununda saxlayır,
kataloq isə onu məhsul adının içinə yığıb həmin sütunu boş qoymuşdu. `Model/Kod` variant kimliyinin
hissəsidir, ona görə onu öz yerinə köçürmək **heç bir fərqi itirmir** — dörd cür `Laqonda daşı almaz` dörd
variant olaraq qalır — və növbəti idxalın axtardığı yerə qoyur.

Tətbiq: **75 sətir**. 29 sətir kitabın adı ilə kataloqda **artıq mövcud olan** məhsula keçdi (18 yeni variant,
22 boşalan variant və 16 məhsul deaktiv edildi — heç nə silinmədi); 41 sətir bir variantın yalnız yazılışı
düzələn model kodunu paylaşır (`EMAF A 300` → `Emaf A300`); 3 sətir `Dırmıq`-dır — kitab bu malı üç sətirdə
`Dırmıq plastik Gardena`, bir sətirdə `Dırmıq Gardena plastik` yazır, **D-36 azlıqda qalan yazılışı seçmişdi**,
bu qərar çoxluğu seçir və o məhsulun səhv `NormalizedName`-ini də düzəldir. D-38-in qoruduğu üç model kodlu
qardaş məhsul kitabda adlandırıldığı üçün bu işləməyə daxil oldu.

Sətir sayı (3625) və məbləğ (431 971,26404 ₼) dəyişməyib; miqdar, qiymət, təchizatçı, obyekt, cavabdeh və dövr
toxunulmayıb. Fərq **176 → 77** sahəyə (143 → 70 sətir) düşdü. Skript:
`INVESTIGATIONS/reconcile-2026-10-09/16-excel-uygunlasdirma.sql`, idempotentdir (ikinci işləmədə hər dəyişiklik 0).

**Tətbiq EDİLMƏYƏN və sahibə bildirilən 77 fərq.** Heç biri izahsız deyil:
- **48 fərq / 48 sətir — kitab eyni malı bir vərəqdə bir neçə cür yazır.** On məhsulda belədir, və doqquzunda
  proqram kitabın **çoxluq yazılışına artıq uyğundur** (`Xlor Toz 90% qranul` 41 sətrin 25-i, `Hava
  təravətləndirici (Air freshener)` 24 sətrin 16-sı, `Şampun qab üçün` 22 sətrin 21-i və s.). Azlıq
  yazılışlarını da ödəmək bir mal üçün kataloqda **iki məhsul** yaratmaq olardı — bu daha pis məlumatdır,
  ona görə edilmədi.
- **22 fərq / 15 sətir — kitab öz-özünə zidd, yaxud sahibin öz qərarına zidd.** D-37-nin altlıq/şkurka
  ayrımını ləğv edərdi (5 sətir); `AO 46SBF-42 Alevs` ↔ `AO 60TBF-41 Alevs` (1 sətir); həm ölçü, həm marka
  dəyişir (1 sətir); `Balaca laqonda daşı şirfofka başlığı` ilə `Laqonda nasadkası qırmızı` bir ada yığılır
  (2 sətir); `Model/Kod` xanasında **tarix** var — `2021-11-11 00:00:00` (2 sətir); `Clean strong` ↔
  `Yersil (Plastik)` başqa maldır (1 sətir); kitabda ölçü **boşdur**, kataloqda real ölçü var — `18 CM`,
  `125 MM`, `2.2` (3 sətir): tətbiq etmək ölçünü silmək olardı.
- **7 fərq / 7 sətir — yalnız hərf və boşluq.** `US-418` ↔ `us-418` (4), `MV-611` ↔ `Mv-611`, `Emaf A300` ↔
  `EMAF A 300`, ikiqat boşluq. Normallaşdırılmış dəyər eynidir, yəni proqram onları artıq eyni sayır; burada
  kataloqun yazılışı düzgündür.

Sahib, 2026-10-09.

**D-40 · «Sən həmişə Excel-i əsas al» — saxlanılan 15 sətrin 13-ü tətbiq edildi.** Sahib ümumi qayda verdi:
proqram ilə kitab fərqlənəndə kitab qalib gəlir, hər dəfə. D-39-da mülahizə tələb etdiyi üçün saxladığım
sətirlər açıldı.

Tətbiq olunan 20 sətir: sahibin adını çəkdiyi **№ 1228** (`Clean strong` → **`Yersil (Plastik)`**, ölçü 55 sm
— kataloqda bu məhsul artıq var idi, ona görə sətir sadəcə ona keçdi, dublikat yaranmadı); kitabın
`Laqonda nasadkası üçün şkurka` yazdığı **5 sətir** — bu **D-37-ni ləğv edir**; `Laqonda nasadkası` yazdığı
**2 sətir**; modeldə və ölçüdə kataloqa zidd olan **2 sətir** (`AO 46SBF-42` → `AO 60TBF-41 Alevs`, və
115 → 230 + `Skom`); kitabda ölçü xanası boş olan **3 sətir** (`18 CM`, `125 MM`, `2.2` təmizləndi); bir
variantın model kodundan ikiqat boşluq silindi (7 sətir).

Nəticə: 13 sətir yeni varianta keçdi (10-u başqa məhsula), 1 yeni variant yaradıldı, 10 variant və 6 məhsul
deaktiv edildi. Yeni məhsul yaradılmadı, mövcud məhsulun adı dəyişdirilmədi. Sətir sayı (3625) və məbləğ
(431 971,26404 ₼) dəyişməyib. Fərq **77 → 56** sahəyə düşdü; **ölçü fərqi tamamilə bitdi**. Skript:
`INVESTIGATIONS/reconcile-2026-10-09/18-excel-uygunlasdirma-2.sql`, idempotentdir (ikinci işləmədə hamısı 0).

**Niyə 56 fərq hələ də qalır — kitab bu sətirlərdə bir şey demir, bir neçə şey deyir.**
- **48 sətir — kitab bir malı iki-üç cür adlandırır və o adların heç biri kataloqda ayrı məhsul deyil.**
  Hərfi tətbiq etmək eyni mal üçün **ikinci kataloq məhsulu** yaratmaq olardı — bir Gardena duşu üçün üç
  məhsul — və onda heç bir hesabat o malı toplaya bilməzdi. Doqquz haldan doqquzunda proqram kitabın çoxluq
  yazılışına uyğundur.
- **6 sətir — hərf fərqi, amma azlıqdadır.** Kitab `US-418`-i altı sətirdə belə, üç sətirdə `us-418` yazır;
  `Emaf A300`-u qırx bir sətirdə belə, bir sətirdə `EMAF A 300`. Variant paylaşıldığı üçün azlığa getmək
  çoxluğu pozardı. Generatora bu qoruyucu əlavə edildi: paylaşılan variantın mətni yalnız **heç bir sətir
  köhnə yazılışı istəmədikdə** dəyişir.
- **2 sətir — `Yaramilla`.** Kitabın `Model/Kod` xanasında `2021-11-11 00:00:00` var: cədvəl model kodunu
  tarix kimi formatlayıb. Kataloqdaki `11 11 21` **həmin xananın kod kimi oxunuşudur** — yəni kitabın dəyəri
  artıq proqramdadır. Tarixi yazmaq model kodu yerinə tarix yazmaq olardı.

Sahib, 2026-10-09.

**D-41 · Yazılış fərqlərində ÇOXLUQ qalib gəlir; `Yaramilla`-da proqram düzdür.** Sahib D-40-ın qoruyucusunu
qayda kimi təsdiq etdi: kitab aynı model kodunu iki cür yazanda **hansı yazılış daha çox sətirdədirsə o
qalır**, azlıq yazılışı tətbiq edilmir.

Yoxlama göstərdi ki **heç bir dəyişiklik lazım deyil** — kataloq artıq hər yerdə çoxluğu saxlayır:

| variant | kitabda çoxluq | bazada |
|---|---|---|
| `Fəhlə əlcəyi` | `Emaf A300` — 41 sətir (1-i `EMAF A 300`) | `Emaf A300` ✓ |
| `Rain bird sprinkler başlığı` | `US-418` — 6 sətir (3-ü `us-418`) | `US-418` ✓ |
| `Rain bird sprinkler başlığı (sarı)` | `US-418` — 3 sətir (1-i `us-418`) | `US-418` ✓ |
| `Divar tip el qurutma feni` | **bərabərlik** — 1 `MV-611`, 1 `Mv-611` | `MV-611` |

Son halda kitabın həmin variant üzrə yalnız iki sətri var və hər biri ayrı cür yazır, yəni çoxluq mövcud
deyil; tərəf tutmaq təsadüfi olardı, ona görə bazadakı yazılış qalır.

**`Yaramilla` (2 sətir) bağlandı:** sahib təsdiq etdi — kitabın `Model/Kod` xanasındaki
`2021-11-11 00:00:00` **kitabın özünün problemidir**, proqramdaki `11 11 21` düzgündür. Dəyişiklik yoxdur.

Beləliklə qalan 56 fərqdən **8-i bağlandı** (dəyişiklik tələb etmədən) və **48-i sahibin sonraki baxışını
gözləyir** — bunlar kitabın bir malı iki-üç cür adlandırdığı sətirlərdir. Sahib: «qalanlarına sonra baxarıq».

Sahib, 2026-10-09.

**D-42 · Qalan 48 fərq bağlandı: fərqli yazılışlardır, məntiqcə eyni maldır.** Sahib: «olduğu kimi burax,
əslində fərqli yazılışlar amma eynidi məntiq». On məhsulda kitab aynı malı bir vərəqdə iki-üç cür adlandırır
(`Xlor Toz 90% qranul` 41 sətrin 25-ində bir cür, 9-unda `Pooltech` ilə, 7-sində üçüncü cür; `Suvarma sistemi
yumru duş Gardena` 12 sətrin 5-ində belə, 4-ündə `Suvarma üçün duş Gardena`, 3-ündə `Duş Gardena`). Kataloq
hər halda **çoxluq yazılışını** saxlayır və bu qalır.

`Pooltech`, `264 metr`, `Glade`, `3/4`, `Ardıc` kimi azlıq yazılışlarının ayrı mal olub-olmadığı soruşuldu;
sahib təsdiq etdi ki **ayrı mal deyil**, yalnız yazılış fərqidir. Ona görə ayrı məhsul yaradılmır — yaradılsa
bir mal kataloqda iki-üç dəfə görünər və heç bir hesabat onu toplaya bilməz.

**Beləliklə Excel–proqram uzlaşdırması TAM BAĞLANDI.** Qalan 56 sahə fərqinin hamısı izah olunub və sahib
tərəfindən qəbul edilib: 48-i yazılış fərqi (D-42), 6-sı kitabın azlıq yazılışı (D-41), 2-si kitabın xana
xətası (D-41). Heç biri proqramın səhvi deyil və heç biri dəyişiklik tələb etmir.

Yekun vəziyyət: **167 sifariş · 3625 effektiv sətir · 431 971,26404 ₼.** Kitabın «Aylıq» vərəqi 3624 sətir ·
431 943,26404 ₼ — fərq **1 sətir, 28,00 ₼**, yəni № 3032 (sahibin D-16/D-24 qərarı). Miqdar, qiymət, dövr,
obyekt, təchizatçı, cavabdeh və ölçü üzrə **fərq yoxdur**.

**Növbəti idxal üçün qeyd:** kitab gələn ay yenə `Duş Gardena` yazsa, idxal onu yeni məhsul kimi görəcək,
çünki sahib global alias yaradılmasını qadağan etmişdi (7 çatışmayan sətir brifinqi, «Global alias yaratma»;
D-19 da Laqonda məhsulları üçün alias yazılmasını qadağan edir). Bu qərar dəyişməyib; lazım olanda sahib
istədiyi yazılışlar üçün alias icazəsi verə bilər.

Sahib, 2026-10-09.

**D-43 · Adlar daha əldən yazılmır: şablon kataloqu özündə daşıyır + köhnə adlar üçün alias.** Sahibin
təklifi: «mən deyirəm bazada olan məhsulları Excel-də data validation-da olan kimi məcbur yazsınlar».
Qəbul edildi — bu, uzlaşdırmanın bütün səbəbini mənbədə kəsir.

**1. Global aliaslar.** Yoxlama göstərdi ki 10 məhsulun azlıq yazılışları üçün **15 alias artıq var**
(22 sentyabr, ilk idxal nəzərdən keçirilməsində yazılmışdı) — yəni gələn ay `Duş Gardena` ya da
`Xlor toz qranul 90% Pooltech` yazılsa, idxal onları özü tanıyır. Yeni yazılmağa ehtiyac yox idi.

Amma bu gün 23 məhsul deaktiv edildiyi üçün onların adları daha tanınmırdı: `ImportCatalogLoader` yalnız
məhsulu aktiv olan aliası oxuyur, deməli idxal hər birini «naməlum məhsul» kimi qaldırıb sahibin artıq
cavabladığı sualı yenidən verərdi. **23 alias yazıldı** (`Laqonda daşı almaz Staunch` → `Laqonda daşı almaz`,
`Şkurka taxta üçün laqonda P80` → `Laqonda nasadkası üçün şkurka`, `Oleander` → `Nerium oleander` və s.) və
`Şotka cod` aliası deaktiv `Cod şotka`-dan `Cod fırça`-ya yönləndirildi. Cəmi **38 alias**.

Alias **yalnız deaktiv məhsul üçün** yazıldı. `Clean strong`-un öz 32 sətri var və yaşayır — bir sətri
`Yersil (Plastik)`-ə keçsə də ona alias yazılmadı: gələcəkdə `Clean strong` yazılsa, o `Clean strong`
deməkdir. Eyni şey hələ v1 sətirləri daşıyan `… P40 göy` və `… P60 göy` üçün də. Qoruyucular: hədəf aktiv
olmalıdır, alias aktiv məhsulun adı ilə toqquşmamalıdır (yoxsa `NameIndex` ikimənalılıq qaytarır), və alias
başqa məhsula işarə etməməlidir. Skript `20-aliaslar.sql`, idempotentdir.

**2. Excel şablonu.** `tools/workbook-template/` — kataloqu bazadan ixrac edir və Excel faylını qurur.
`Malın adı`, `Obyekt`, `Şirkət`, `Cavabdeh şəxs`, `Vahid`, `Ö/v`, `Növ` yalnız siyahıdan seçilir; hər
yoxlama `errorStyle = stop`, yəni səhv dəyər **rədd edilir**, xəbərdarlıqla keçmir. `Miqdarı` sıfırdan böyük
rəqəm, `Qiyməti` mənfi olmayan rəqəm ya boş, `Tarix` tarix olmalıdır. Kateqoriya sütunları və `Cəmi`
düsturdur və vərəq qorunduğu üçün üzərinə yazıla bilmir — kateqoriya malın kataloqdaki xüsusiyyətidir, onu
təkrar yazmaq lazım deyil.

Başlıqlar `ImportHeaders.ExpectedHeaders` ilə hərfi hərfinə üst-üstə düşür və vərəqin adı `Aylıq`-dır;
yaradılan fayl idxalın öz tanıma məntiqi ilə yoxlandı — 17/17 sütun tanınır, təkrar yoxdur, çatışmayan
məcburi sütun yoxdur. Fayl: `AI_WORKFLOW/workbooks/template/BaxOrders-sifaris-sablonu.xlsx` (1090 məhsul,
27 obyekt, 78 şirkət, 11 cavabdeh, 18 vahid). `.xlsx` git-ə düşmür — içində kataloq var və skriptdən
yenidən yaradıla bilər.

**Məhdudiyyət:** siyahılar faylın yaradıldığı günün kataloqudur. Kataloq dəyişəndə şablon yenidən qurulmalıdır.
Siyahıda olmayan mal sifariş edilə bilmir — bu qəsdəndir: yeni mal kataloq qərarıdır.

Sahib, 2026-10-09.

**D-44 · Şablonda malın heç bir xüsusiyyəti yazılmır: bir seçim hamısını təyin edir.** Sahib D-43-dəki
şablona baxıb iki şey dedi: kateqoriya sütunları **lazım deyil** («hər dəfə ərazidəki anbardarlar
yazacaqlar?»), və `Ölçü` ilə `Model/Kod` da siyahıdan seçilsin.

İkisi də doğru idi. Kateqoriya sütunları `ImportHeaders.RequiredFields`-də deyil və kateqoriya malın
kataloqdakı xüsusiyyətidir — sistem onu məhsuldan özü bilir; sütunlar yalnız cədvəli genişləndirirdi.
`Ölçü` və `Model/Kod` isə sərbəst qaldıqca problem bağlanmırdı: `115` ↔ `115x10x22,23` və
`Emaf A300` ↔ `EMAF A 300` məhz oradan gəlmişdi.

İndi `Mal seçimi` sütununda **1368 aktiv variant** siyahısı var — `Laqonda daşı almaz · 115 MM · Staunch ·
Ədəd`. Seçim `Malın adı`, `Ölçü`, `Vahid`, `Model/Kod` və `Ö/v` sütunlarını `VLOOKUP` ilə doldurur; həmin beş
sütun **gizlədilib və kilidlidir** — idxalın oxuduğu sütunlar məhz onlardır, və heç kim yazmadığı üçün nə
bir-biri ilə, nə kataloqla ziddiyyətə düşə bilmir. `Mal seçimi` adı `ExpectedHeaders`-də olmadığı üçün idxal
onu görməzdən gəlir (tanınmayan başlıq heç vaxt təxmin edilmir). `№` də artıq avtomatikdir.

Anbardar yalnız bunu doldurur: **mal seçimi · miqdar · qiymət · şirkət · obyekt · tarix · cavabdeh · növ.**
Görünən sütun 17-dən **10-a** düşdü. Yoxlama: aktiv məhsulların **hamısının** ən azı bir aktiv variantı var
(variantsız aktiv məhsul 0), ona görə siyahıdan heç nə düşmür; 1368 seçim adının hamısı birmənalıdır
(generator təkrar görsə dayanır). Fayl idxalın öz tanıma məntiqi ilə yoxlandı: vərəq `Aylıq`, başlıq 3-cü
sətirdə, 5 məcburi sütunun hamısı var, təkrar yoxdur.

**Ödənilən qiymət:** kataloqda olmayan ölçü sifariş edilə bilmir. Bu qəsdəndir — yeni variant kataloq
qərarıdır: kataloqa əlavə edilir, şablon yenidən qurulur (bir əmr).

Sahib, 2026-10-09.

**D-45 · İki «Qala baza» sətri də daxili tədarükdür — qiymətləri silindi.** Sahib sentyabrı yoxlayanda
Excel-də 71 900,39, proqramda 71 980,39 gördü. Fərq **80,00 ₼** idi və səbəbi kitabın iki boş «Cəmi»
xanası oldu: № 3146 `Süpürgə xəkandaz dəsti` (5 × 8) və № 3147 `Kürək sapı` (10 × 4), hər ikisi Heydər Əliyev
Mərkəzi, hər ikisi **Qala baza**. Sahib təsdiq etdi: «daxili tədarükdü, pulsuz verilib».

Baza bunu **artıq yarımçıq qeyd etmişdi**: hər iki sətir `InternalFreeSupply` kimi təsnif olunub, amma
qiyməti saxlayırdı — yəni rejim «pul ödənilməyib», məbləğ isə «80 ₼ ödənilib» deyirdi. Bütün effektiv
tarixçədə bu vəziyyətdə olan **yalnız bu iki sətir** var idi, və həmin 80 ₼ məhz sahibin tapdığı fərqdir.
Bu işləmə təsnifatın başladığını tamamladı: rejim qaldı, qiymət getdi.

Köhnə qiymətlər audit izində saxlanılır. Qiymət qərar jurnalına yeni sətir yazılmadı — rejim onsuz da düzgün
idi; bu qəsdəndir. Skript `21-qala-baza-daxili-tedaruk-2.sql`, idempotentdir (ikinci işləmədə hamısı 0).

**Nəticə:** effektiv məbləğ **431 971,26404 → 431 891,26404 ₼** (−80,00). Sətir sayı dəyişməyib (3625).
Sentyabr artıq kitabın «Cəmi» sütunu ilə **tam eynidir** (71 900,39).

**Diqqət:** kitabın `Qiyməti` sütununda həmin iki sətirdə hələ 8 və 4 yazılıdır. Yəni kitabı
`Miqdarı × Qiyməti` ilə toplasanız, proqramdan 80 ₼ çox çıxacaq; `Cəmi` sütunu ilə toplasanız üst-üstə
düşəcək. Kitab mənbə sənəd olduğu üçün ona toxunulmayıb — ödənilməyən qiymət orada yazılı qalır, proqram isə
sahibin qərarını əks etdirir.

Sahib, 2026-10-09.

**D-46 · Mayın 20 «Qala baza» sətri də daxili tədarükdür — qiymətləri silindi.** D-45-dən sonra bütün aylar
eyni üsulla yoxlandı: hər ay üçün kitabın «Cəmi» sütunu, kitabın `miqdar × qiymət`-i və proqramın məbləği
yan-yana qoyuldu.

Nəticə bir nümunə göstərdi. **Bütün kitabda «Cəmi» xanası boş olan 22 sətir var və 22-sinin də «Şirkət»
sütununda «Qala Baza» yazılıb** — istisna yoxdur. İkisi sentyabrındır (D-45), qalan **20-si maydır**, cəmi
**404,33 ₼**. Yəni kitabı dolduran adam məbləği məhz pul getmədiyi yerdə yazmayıb. Sahib təsdiq etdi.

Sətirlər `InternalFreeSupply` rejiminə keçirildi və qiymətləri təmizləndi. Sentyabrın ikisindən fərqli olaraq
bunlar `PriceRequired` idi, ona görə qiymət qərar jurnalına hər biri üçün sətir yazıldı. Köhnə qiymətlər
audit izində saxlanılır. Skript `22-qala-baza-daxili-tedaruk-3.sql`, idempotentdir.

**Bütün «Qala baza» sətirləri toxunulmadı və qayda məhz budur:** 57 sətir həm qiymət, həm də kitabın
doldurduğu «Cəmi» daşıyır — kitab onları həqiqi alış sayır və olduğu kimi qaldı. Sahib əvvəl «Kürək düz»
sətrini əks istiqamətdə — pulsuz təminatdan 12 ₼-lik alışa — keçirmişdi, yəni «Qala baza» tək başına qərar
vermir. Qərar verən **boş «Cəmi» xanasıdır**.

**Yekun vəziyyət — proqram artıq kitabın «Cəmi» sütununun özüdür:**

| ay | kitabın «Cəmi» sütunu | proqram | fərq |
|---|---|---|---|
| 2026-01 … 04, 06, 07 | = | = | **0** |
| 2026-05 | 62 139,28 | 62 139,28 | **0** |
| 2026-08 | 44 312,78 | 44 340,78 | +28,00 (№3032, D-16/D-24) |
| 2026-09 | 71 900,39 | 71 900,39 | **0** |
| **CƏMİ** | **431 458,93404** | **431 486,93404** | **+28,00** |

Effektiv məbləğ **431 891,26404 → 431 486,93404 ₼**. Sətir sayı dəyişməyib (3625), qiymətsiz sətir 121 → 141.
Bütün effektiv tarixçədə «daxili təminat, amma qiymətli» ziddiyyəti artıq **0**-dır.

Sahib, 2026-10-09.

**D-47 · «Aylıq»-da olmayan sətir proqramdan da silindi — **D-16 və D-24 ləğv olunur**.** Sahib: «excel-də
yoxdursa saytdan da sil». Söhbət bir sətirdən gedir: **item 2988, kitab № 3032** — `Yay ayaqqabısı`, Heydər
Əliyev Mərkəzi, avqust 2026, 1 × 28 = **28,00 ₼**.

Bu sətir kitabın **«Əsas»** vərəqinin 3035-ci sətrində durur, amma **«Aylıq»** vərəqində yoxdur. Məhz buna
görə sahib onu 27 sentyabrda bərpa etmişdi (D-16) və 28 sentyabrda `Aylıqdan kənar` təyin etmişdi (D-24).
Bu gün sahibə həmin tarixçə yenidən xatırladıldı və o əks qərar verdi: **«Aylıq» əsas vərəqdir** (D-25) və
**kitab hər dəfə qalib gəlir** (D-39, D-40, D-41), deməli «Aylıq»-ın daşımadığı sətir sifariş deyil.

**Bu, silməkdir və domen təsdiqlənmiş sifariş üçün silmə təklif etmir:** `OrderRequest.RemoveItem` yalnız
qaralamada işləyir, çünki təsdiqlənmiş versiya audit edilən revizya ilə dəyişdirilməlidir. Yumşaq silmə
mexanizmi yoxdur, ona görə sətir birbaşa silindi, amma **silinmə əvvəlcə tarixçəyə yazıldı**
(`ItemRemovedAsAbsentFromWorkbook`, köhnə dəyəri ilə). Tarixçə ekranı hadisələri sifariş üzrə oxuyur və
məhsulu **variant** vasitəsilə həll edir, sətir vasitəsilə yox — ona görə qeyd sətirdən sonra da qalır.
İdxal sətri öz izini saxlayır; yalnız «bu sətri yaratdı» bağlantısı silindi. Skript `23-setir-3032-silindi.sql`,
idempotentdir (ikinci işləmədə «already removed»).

**Nəticə — proqram kitabın «Aylıq» vərəqinin özüdür:**

| | kitab «Aylıq» | proqram |
|---|---|---|
| sətir | **3624** | **3624** |
| «Cəmi» sütunu / məbləğ | **431 458,93404 ₼** | **431 458,93404 ₼** |
| kitabda olub proqramda olmayan № | — | **0** |
| proqramda olub kitabda olmayan № | — | **0** |

**Doqquz ayın doqquzunda da sətir sayı və məbləğ qəpiyinə qədər eynidir.** Uzlaşdırma bitdi.

Qalan yeganə fərq kitabın **öz içindədir**: `miqdar × qiymət` 431 943,26404, `Cəmi` sütunu isə
431 458,93404 — aradakı 484,33 ₼ məhz «Cəmi» xanası boş qoyulmuş 22 Qala baza sətridir (D-45, D-46).
Proqram «Cəmi» sütununu izləyir, çünki sahib həmin malların pulsuz verildiyini təsdiq etdi.

Sahib, 2026-10-09.

**D-48 · Boş «Parlament parkı · yanvar 2026» sifarişi silindi.** Obyektlər üzrə yoxlama göstərdi ki proqramda
**166 yox, 167** effektiv sifariş var — fərq **sətri olmayan bir sifariş** idi (Id 7).

Araşdırma: bu, 22 sentyabrdakı idxalın səhv uyğunlaşdırmasının qalığıdır. Kitabın 1075-ci sətri (№ 1072,
`Torf (perilitli)`, 5 × 74) obyekt kimi **`H.Ə.M`** yazır, amma idxal onu **Parlament parkına** bağlayıb və
orada yanvar sifarişi açıb. Sətir sonradan düzəldilib — indi sifariş 5-də, **Heydər Əliyev Mərkəzi, yanvar**,
yəni kitabın yazdığı yerdə — boş qabıq isə qalıb. Kitabda Parlament parkının yanvar sətri **ümumiyyətlə
yoxdur**: o obyekt orada yalnız apreldən sentyabra görünür (80 sətir).

Sahibin qaydasına görə («Aylıq»-ın daşımadığı sifariş deyil) sifariş silindi. **İdxalın qeydi silinmədi:**
qrup sətri sxemin öz mexanizmi ilə `Skipped` edildi — `OrderRequestId` NULL, `SkipReason` nə baş verdiyini
yazır. `CK_ImportMaterializationGroups_SkipOrRequest` məhz bu formanı tələb edir və oktyabrda sahibin
buraxdığı 164 qrup da belə saxlanılır, yəni idxal partiyası oxuduğu hər sətrin hesabatını verməyə davam edir.
Sifarişin yeganə iş axını hadisəsi FK-nın öz kaskadı ilə getdi. Sətir, tarixçə, revizya — heç biri yox idi.
Skript `24-bos-sifaris-7-silindi.sql`, idempotentdir.

**Nəticə:** effektiv sifariş **167 → 166**, sətirsiz sifariş **0**. Sətir sayı (3624) və məbləğ
(431 458,93404 ₼) dəyişməyib.

**Obyektlər üzrə tam uyğunluq təsdiqləndi:**

| | kitab | proqram |
|---|---|---|
| obyekt | 26 | 26 — **fərqli 0** |
| sifariş (obyekt + ay) | **166** | **166** — yalnız bir tərəfdə olan **0** |
| sətir | 3624 | 3624 |
| məbləğ | 431 458,93404 ₼ | 431 458,93404 ₼ |

Müqayisə proqramın öz `LocationAliases` cədvəli ilə aparıldı (`H.Ə.M` → `Heydər Əliyev Mərkəzi` və s.);
kitabda alias cədvəlinin tanımadığı obyekt adı qalmadı.

Sahib, 2026-10-09.

**D-49 · Oktyabr 2026 sifarişləri sistemə əlavə edildi — təsdiqlənməyib, rəhbərin qərarını gözləyir.**
Sahib: «oktyabr ayı sifarişləri gəldi, bu təsdiqlənməyib, rəhbər baxıb qərar verməlidir, bunu sistemə əlavə
et, ancaq oktyabr ayı». Fayl: `INVESTIGATIONS/Oktyabr_sifarisi_bolgu_2026.xlsx`, idxal #50012.

**Nəticə:** 24 sifariş (hər obyekt üçün bir, v1), 382 sətir, **42 586,30 ₼**, hamısı **PendingApproval** —
rəhbərin təsdiq növbəsində. Orijinal Excel ilə müstəqil tutuşdurma: 24 obyekt, 382 sətir, məbləğ — fərq
sıfır. Yanvar–sentyabr (166 sifariş, 431 458,93404 ₼) toxunulmayıb.

**Təsdiqlənməmiş qaldığı necə təmin edildi:** idxal sifarişi qaralama kimi yaradır; `ImportedAsApproved`
hadisəsini kod heç vaxt yazmır (o, yalnız tarixi sifarişlərə miqrasiya ilə yazılıb). Sonra 24-ü
`submit-many` ilə göndərildi. Administrator göndərə bilir, təsdiq edə bilmir (`canDecideOrders: false`).

**Fayl idxalın formasında deyildi** — vərəq «Oktyabr 2026» (idxal yalnız «Aylıq» oxuyur), sütun «Sifariş
növü» («Növ» olmalıdır), sonda «Cəmi:» sətri. Orijinala toxunulmadı; idxal üçün surət hazırlandı və
hüceyrə-hüceyrə yoxlandı (0 fərq). Gələn ay bu lazım olmasın deyə göndərənə D-44 şablonu verilməlidir.

**Kataloq qərarları — hamısı BatchOnly, alias yazılmayıb:** 6 yeni təchizatçı (Excel-dəki adla; oxşarı
yox idi), 4 yeni vahid (`M3` Kub metr, `REYS`, `INCH` Düym, `V` Volt — `M2`/`KAMAZ`/`KW` nümunəsi ilə),
`komplekt` → «Dəst», 6 təsvir (D-20/D-21), 4 kateqoriya yolu və 51 yeni məhsul (göndərənin «Yeni mallar»
vərəqindən, kateqoriyası ilə), 3 ad mövcud məhsula bağlandı (`Columbus 80 BM 100 Şotka`, `Serçevina`,
`Şurup samarez` — kataloqda eyni mal var, yalnız ölçü/model yenidir), 85 yeni variant, qiymətsiz 4 Qala
Baza sətri daxili təminat (D-35). Ətraflı: `INVESTIGATIONS/oktyabr-2026/HESABAT.md`.

**Açıq qalan:** təsdiq səlahiyyəti olan yeganə aktiv hesab `audit.rehber`-dir. Rəhbərin öz hesabı başqadırsa,
ona Manager rolu verilməlidir.

Sahib, 2026-10-15.

---

## UI V2 — Aylıq hesabat, 2026-10-15

**D-50 · UI V2-nin «Aylıq hesabat» ekranı üçün sahibin qərarları.** Sahib auditi
(`DESIGN/2026-10-15-ui-v2-ayliq-hesabat/01-audit.md`) və mərhələli planı qəbul etdi. Sözbəsöz:

> 1. Artım qırmızı, azalma yaşıl göstərilsin.
> 2. Qeyri-adi aylar həm artım, həm azalma üzrə, mövcud təsdiqlənmiş biznes qaydasına əsasən göstərilsin.
> 3. Yuxarı hissədə 1 əsas, 2 ikinci dərəcəli maliyyə göstəricisi olsun. Əsas göstərici aktiv sifariş növünə və
>    filtrlərə uyğun hesablanmalıdır.
> 4. Sidebar 260 px, başlıq 72 px saxlanılsın. Bunlar təsdiqlənmiş ölçülərdir.
> 5. Xanaya klik etdikdə real sifariş sətirləri göstərilsin. Sifarişin öz səhifəsinə keçid olsun.
> 6. İlkin görünüş yığcam olsun.
> 7. Analitika sonrakı mərhələyə saxlanılsın.
>
> Əlavə tələblər: Mövcud funksiyaları silmə. Status nöqtələri, təsdiq zəngi, aylıq cəm sətri və sifarişdən
> hesabata geri qayıdış qorunsun. Aylıq faizlə anomaliya faizini fərqləndir. Pul formatı Azərbaycan standartında
> olsun: 326.951,62 ₼. 1280 px, planşet və telefon görünüşlərini nəzərə al. Figma biznes məntiqi üçün yox,
> vizual istiqamət üçün əsasdır. Mövcud API və backend əsas həqiqət mənbəyidir. 29 CSS-ə bağlı testi yeni
> dizayna uyğunlaşdırarkən funksional yoxlamaları zəiflətmə. Tam testdəki timeout problemini ayrıca qeyd et;
> təkbaşına keçməsi problemin qəti olaraq maşın yükündən olduğunu sübut etmir.

**Nə deməkdir.** 9.1 və 8.2 olduğu kimi qalır — Figma-nın boz faizi, narıncı anomaliyası və «yalnız artım»
qaydası götürülmür. Karkas (D-V1, D-V2) dəyişmir. Rəqəmlərin, rənglərin, statusların və anomaliyanın mənbəyi API-dir;
Figma yalnız görünüşün istiqamətidir. «Ümumi faktiki xərc» brauzerdə toplanmır, API-nin «Hamısı» növü üzrə
rəqəmindən oxunur. Auditdəki «29 CSS testi» səhv sayılmışdı; düzgün say 30 test / 69 yoxlama sətridir.
Timeout ayrıca açıq məsələ kimi `BLOCKERS.md`-də qeyd olunur.

**Açıq (sahibin cavabı gözlənilir):** əsas göstərici il və sifariş növünə görə API-də hesablanır, obyekt
axtarışına görə isə hesablanmır — API yuxarı rəqəmləri həmişə bütün obyektlər üzrə verir. Axtarışa görə rəqəm
backend dəyişikliyi tələb edir. `DESIGN/2026-10-15-ui-v2-ayliq-hesabat/02-requirements.md`, sual S-1.
(Cavab: D-51, S-1 — A.)

Sahib, 2026-10-15.

**D-51 · UI V2 «Aylıq hesabat»: Mərhələ 1 (UX və tətbiq planı) qəbul edildi.** Sahib təsdiq paketinə
(`DESIGN/2026-10-15-ui-v2-ayliq-hesabat/05-approval.md`) cavab verdi. Sözbəsöz:

> Mərhələ 1-i qəbul edirəm.
>
> S-1, S-2a, S-3, S-4 və üç ortaq komponent üzrə tövsiyələrinlə razıyam.
>
> Yalnız S-2b fərqlidir: 11 px əvəzinə 12 px seçirəm. Rəqəmlərin oxunaqlılığı daha vacibdir. Lazım olduqda cədvəl öz
> daxilində üfüqi sürüşsün, amma səhifənin özü yana sürüşməsin.
>
> Əlavə şərtlər:
> - Obyekt axtarışının yuxarıdakı ümumi göstəricilərə təsir etmədiyi aydın yazılsın.
> - Status işarələrinin mənası qorunsun.
> - Sifariş detalları real API məlumatlarına əsaslansın.
> - Mövcud işləyən funksiyalar və biznes qaydaları dəyişməsin.
> - Testlərin funksional yoxlamaları zəiflədilməsin.
>
> Bu qərarları D-51 kimi qeyd et və A hazırlıq mərhələsinə keç.
>
> Kod dəyişikliklərinə başlamazdan əvvəl mövcud vəziyyəti yoxla. Daha sonra təsdiqlənmiş plana uyğun mərhələli icraya
> başla. Hər mərhələdən sonra build və test nəticələrini təqdim et. Commit və push üçün ayrıca təsdiqimi gözlə.

**Qərarlar:**

| Sual | Qərar |
|---|---|
| S-1 | **A** — yuxarı rəqəmlər bütün obyektlər üzrə qalır; axtarış aktiv olanda bunun belə olduğu ekranda aydın yazılır. |
| S-2a | **A** — cədvəl yalnız öz qutusunda yana sürüşür; aşağı sürüşəndə ay başlıqları 72 px başlığın altında görünən qalır və qutu ilə sinxron hərəkət edir, altında nazik sinxron sürüşmə zolağı. |
| S-2b | **12 px** — rəqəmlər bütün masaüstü enlərində 12 px. E variantı (1440-dan aşağı 11 px) **rədd edildi**. 1280-də ~10 ay görünür, qalanı qutunun içində yana sürüşür; səhifə heç vaxt yana sürüşmür. |
| S-3 | Cədvəldə ✓ (Təsdiqlənib) **boz**; paneldəki status nişanı məhsulun hər yerindəki kimi qalır. |
| S-4 | Zolaqda daimi statik cümlə (rəqəmsiz): «Təsdiqlənməmiş sifarişlər də daxildir; təsdiq gözləyənlər cədvəldə ⏳ ilə işarələnib.» |
| Ortaq komponentlər | `ScopeSelector`-un görünüşünün yerində dəyişməsi, yeni `SegmentedControl`, yeni `buttonClass` — təsdiqləndi. |

**Şərtlər (icra boyu):** status işarələrinin mənası dəyişmir (məhsulun öz `workflowStatusLabels` / `workflowStatusSign`
lüğəti); panel yalnız real API məlumatı göstərir; işləyən funksiya və biznes qaydası dəyişmir; testlərin funksional
yoxlamaları zəiflədilmir; commit və push — ayrıca təsdiqlə.

Sahib, 2026-10-16.

**D-52 · Pul formatı bütün proqramda Azərbaycan standartında; B-09 ayrıca tapşırıqdır.** UI V2-nin A mərhələsində
məlum oldu ki, Chrome 155 `az-Latn-AZ` dilində «317,128.16» yazır; testlər Node-da «317.128,16» gördüyü üçün bunu
tutmurdu (`06-implementation.md`, A jurnalı). Sahib, sözbəsöz:

> Hər iki suala cavabım **BƏLİ**.
>
> **1. Pul formatı:** Bütün proqramda Azərbaycan formatı tətbiq edilsin: `317.128,16 ₼`.
>
> Yalnız ekranda göstərilmə formatı dəyişsin. API, verilənlər bazası, hesablamalar və Excel import məntiqi dəyişməsin.
> `format.ts` istifadə olunan bütün yerlər yoxlanılsın.
>
> **2. B-09 timeout:** Ayrı texniki tapşırıq kimi araşdırılsın. C və D mərhələlərini gecikdirməsin.
>
> Hazırda işləyən icraçı agentin işini bölməyin və eyni fayllarda paralel dəyişiklik aparmayın.
>
> Agent C mərhələsini bitirdikdən sonra:
> - Build və bütün testləri işlədin.
> - 1920, 1440, 1280 və 390 px ölçülərdə yoxlayın.
> - Statusları, anomaliyaları, sıralamanı və sürüşməni yoxlayın.
> - Brauzer şəkillərini və aşkar edilən problemləri göstərin.
> - Heç nə commit və push etməyin.
>
> C mərhələsi yoxlanmadan D mərhələsinə keçməyin.

**Nə deməkdir.** Ekranda rəqəm göstərən dörd yer — `components/analytics/format.ts`, `components/analytics/trend.ts`,
`components/imports/labels.ts`, `terminology/terms.ts` — brauzerin yerli dil məlumatından asılı olmadan qrup ayırıcısı
«.» və onluq ayırıcı «,» yazacaq; onları işlədən bütün komponentlər (58 fayl) yoxlanır. Rəqəmin özü, API, baza,
hesablamalar və Excel idxalı dəyişmir. Format düzəlişi C mərhələsi bitəndən sonra, icraçının fayllarına toxunmadan,
ayrıca addım kimi edilir. B-09 — C/D-ni saxlamayan ayrıca texniki tapşırıq.

Sahib, 2026-10-16.

**D-55 · UI V2 «Aylıq hesabat», D mərhələsi: xananın detalları yerində; E qəbulu.** Nömrə qeydi: D-53 (2026-10-17 məlumat
düzəlişi) əsas qovluğun commit olunmamış qaralamasındadır, D-54 dashboard kartlarının detalları üçün ayrılıb — ikisi
də sənəd commit-i ilə yazılacaq.

Sahib, sözbəsöz qısaldılmış (tam mətn `DESIGN/2026-10-15-ui-v2-ayliq-hesabat/03a-D-yerinde.md` §11):

> D mərhələsinin forması (2026-10-17): «Yerində, sətrin altında».
>
> **D-Y1 — TƏSDİQ.** Desktop: detallar kliklənən sətrin altında açılsın. Mobil və planşet: detallar obyekt kartının
> daxilində açılsın. Eyni anda yalnız bir detal açıq olsun. URL, Back, fokus və sifarişdən qayıdış qaydaları qorunsun.
> Horizontal scroll zamanı detallar sabit sütunun altında qalmasın. Mövcud API və biznes hesablamaları dəyişdirilməsin.
>
> **D-Y2 — TƏSDİQ, AMMA TƏHLÜKƏSİZ İZOLYASİYA İLƏ.** V2 ilə main-in birləşdirilmiş vəziyyətini ayrıca integration
> branch və Git worktree-də hazırla. […] Push, production merge və deploy etmə.
>
> **D-Y3 — TƏSDİQ.** D mərhələsinə başlamazdan əvvəl Sonnet ilə qısa, müstəqil visual-qa dizayn tənqidi apar.

E mərhələsi (2026-10-18): «E-1 və E-4 problemlərini təsdiqlənmiş dizayn və mövcud biznes qaydaları çərçivəsində
düzəlt. API və maliyyə hesablamalarını dəyişmə. E-2 və E-3 bloklayıcı problem deyilsə, ROADMAP.md backlog-una əlavə
et.» Sonra: «müstəqil QA nəticəsini qəbul edirəm: KEÇDİ. V2-nin ayrıca lokal commit edilməsinə icazə verirəm.»

**Nə deməkdir.** Bu, D-51-in «xanaya klik sağda panel açır» bəndini əvəz edir. Sağdan açılan panel (Drawer) yalnız
dashboard üçün deyil, burada da istənmir. Panelin məzmunu (03 §6.9) dəyişmir. Detallar yerində açılır: masaüstündə
`colSpan=14` sətir kimi, cədvəl qutusunun görünən enində və qutunun sol kənarına yapışıq; 1024 px-dən aşağı kartın
içində. İş `v2-inteqrasiya` branch-indədir (V2 + `main`). Tənqid `04a-D-critique.md`-dədir (QEYDLƏRLƏ KEÇDİ, iki S2
icradan əvvəl həll olundu), qəbul `07-qa.md`-dədir (QEYDLƏRLƏ KEÇDİ; E-1, E-4 düzəldilib, təkrar yoxlama KEÇDİ). E-2 və
E-3 backlog-dadır: `ROADMAP.md` R-29, R-30. Yalnız Administrator rolu yoxlanılıb. `main`-ə birləşmə, push və deploy —
ayrıca qərarla.

Sahib, 2026-10-17 və 2026-10-18.
