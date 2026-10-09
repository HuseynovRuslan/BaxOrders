# TASK 16b — İMPORT EKRANLARI TASK 2-NİN SÖZLƏRİ İLƏ (P1)

Priority: P1
Brief: `AI_WORKFLOW/BRIEFS/TASK-16.md`. This is the owner's settled requirement, and 16a and 16b share it. It decides
*what* and *why*. This file decides *how*. Where this file and the brief disagree, the brief wins: the Coder stops and
reports.
Part: **16b of two.** 16a (accepted, `4467f8f`) built everything behind the screens: the stored review
classification, `GET/POST api/v1/imports/{id}/pricing`, the counts under Task 2's rule, and the confirmation that
writes the mode. 16b puts it on the import screens:
- Task 2's words on every import screen that counts prices;
- the classification tab inside the review;
- the advance warning "N sətir … «Təsnif edilməyib» kimi düşəcək", with its link to Qiymət təsnifatı;
- the post-import result, with its link;
- the price-word sweep over the import screens.

Specification status: READY. Written by the Planner on 2026-09-25 from the brief, `TASKS/TASK-16a.md`,
`REVIEWS/TASK-16a.md`, 16a's `LAST_REPORT.md` and the repository at `7cc1ccd` (HEAD). Line numbers below are at
`7cc1ccd`.

**Frontend only.** No backend file, schema, migration, tool or data changes. No database is touched. This file carries
no `DATA_MIGRATION` line, on purpose.

---

## 1. Context

The brief's goal: "Excel importunu edən şəxs importu təsdiqləmədən əvvəl qiyməti olmayan sətirləri sistemin qalan
hissəsi ilə eyni dildə görsün, onları elə orada təsnif edə bilsin və importdan sonra hansı işin qaldığını bilsin."

Owner decisions this part carries as hard requirements:

- "Qiymət vəziyyətləri və sözlər Task 2-dəki kimidir." The words are Task 2's and nothing else:
  - «Qiymət yoxdur» / «N sətirdə qiymət yoxdur» (the warning: Unresolved + PriceRequired);
  - «Təsnif edilməyib» (Unresolved);
  - «Alış qiyməti tələb olunur» (PriceRequired);
  - «Ödənişsiz daxili təminat», short «Daxili təminat» (InternalFreeSupply; never a warning, never amber).
- "Mənbəyə görə avtomatik təsnifat olmur." No screen pre-selects, suggests or bulk-applies a classification from a
  supplier, a workbook supplier text ("Qala baza", "Azpetrol baza"), a location, a product or a category.
- **16.1**: classification can be done in the import review, and corrected afterwards on Qiymət təsnifatı.

## 2. Verified current behaviour (repository at `7cc1ccd`)

### 2.1 What 16a exposes (server, live after the API restart on 16a's commit)

All fields are camelCase and appended to their records. Source: 16a's `LAST_REPORT.md` §9 and the types in
`frontend/bax-orders-web/src/api/`.

| Read | Fields 16b uses | Meaning |
|---|---|---|
| Readiness `GET /imports/{id}/readiness` → `warnings` (`api/rows.ts:135–147`) | `missingPrice`, `unclassifiedPrice`, `priceRequired`, `priceNotRequired` | Over the batch's **included** rows. `missingPrice = unclassifiedPrice + priceRequired`. `priceNotRequired` = rows classified InternalFreeSupply. |
| Confirmation preview `GET /imports/{id}/confirmation/preview` (`api/imports.ts:222–252`) | `missingPriceRows`, `unclassifiedPriceRows`, `priceRequiredRows`, `internalSupplyRows`; per group `missingPriceItemCount`, `unclassifiedPriceItemCount`, `priceRequiredItemCount`, `internalSupplyItemCount` | **Before** any group is skipped. A skipped group's share is its per-group count. |
| Confirmation result `POST /imports/{id}/confirmation` (`api/imports.ts:200–220`) | `missingPriceItems`, `unclassifiedPriceItems`, `priceRequiredItems`, `internalSupplyItems` | **After** skips. All zero when `alreadyImported` (replay). |
| Staging preview `GET /imports/{id}` → `groups[]` (`api/imports.ts:44–63`) | `missingPriceRows`, `internalSupplyRows` | **Included rows only.** The group's `rowCount` / `pricedRows` / `unpricedRows` still count excluded rows too. The two families cover different rows: never subtract one from the other (16a review note). |
| Classification list `GET /imports/{id}/pricing?mode=&search=&page=&pageSize=` (`api/importPricing.ts`) | `rows[]`, `totalCount`, `unclassified`, `priceRequired`, `internalFreeSupply` | The batch's included, unpriced rows. The three totals ignore the filter and search. `mode=Unresolved` = not classified; absent = all. `pageSize` max 200. |
| Classify `POST /imports/{id}/pricing` `{ importRowIds, pricingMode }` | `changed`, `unchanged`, `pricingMode`, `preview` | Rows named one by one. `"Unresolved"` clears. 422 on an excluded or priced row, or a batch not in `NeedsReview` / `ReadyToImport`. |

The client functions exist and no component uses them yet: `fetchImportPricing(importId, query, signal)` and
`setImportPricing(importId, { importRowIds, pricingMode })` (`api/importPricing.ts:63–76`). In the TypeScript types the
16a fields are optional (`?`), so that an API from before 16a still type-checks.

### 2.2 The import screens today: where the old words are

| Place | File:line | Today | Problem |
|---|---|---|---|
| Readiness "Bloklamayanlar" | `components/imports/review/ReadinessPanel.tsx:115` | `['Qiymət yoxdur', warnings.missingPrice]` | The number already has Task 2's meaning (16a). It does not show the sentence «N sətirdə qiymət yoxdur», the split, the advance warning or a link. |
| Staging groups table | `components/imports/ImportGroupsTable.tsx:27, 39–41` | Column «Qiymətli / qiymətsiz», `pricedRows / unpricedRows` | Old word «qiymətsiz». The count ignores classification and includes excluded rows. |
| Confirmation facts | `components/imports/review/ConfirmationDialog.tsx:135` | «Qiyməti olmayan» = `preview.missingPriceRows` | Not Task 2's short word. It does not follow a skipped group. There is no split and no advance warning. |
| Confirmation note | `ConfirmationDialog.tsx:143–148` | "… qiymətsiz sətirlər qiymətsiz qalır …" | Old word. After 16a it is also untrue: they land on Qiymət təsnifatı. |
| Confirmation groups column | `ConfirmationDialog.tsx:175, 193` | «Qiymətsiz» = `group.missingPriceItemCount` | Old word. |
| Result panel | `pages/ImportsPage.tsx:207, 212–215` | «Qiyməti olmayan» = `missingPriceItems`; "… qiymətsiz sətirlər qiymətsiz …" | Old words. No split, no "what is left" sentence, no link. |
| Row detail | `components/imports/review/RowDetailDialog.tsx:272` | «Qiymət: bilinmir» | Not a Task 2 word. The row detail carries no classification (`api/rows.ts:56–75`), so it cannot tell the three states apart. |
| Review tabs | `components/imports/review/ReviewCenter.tsx:140–172` | Eight kind tabs and «Sətir düzəlişləri» | There is no place to classify. |

`ImportRowsTable.tsx` shows the workbook's price cell as it was read (`:147–149`). That is the raw record, not a price
word, and it is not changed. Its «Ö/v» header is the workbook's own column name (`labels.ts:110`), the same as in
`columnLabels`, and it stays.

### 2.3 Where Task 2's words live

- `src/pricing/labels.ts` is the one home of the price words (its header says so). It has `missingPriceLabel` /
  `missingPriceShortLabel` «Qiymət yoxdur», `missingPriceCount(n)` «N sətirdə qiymət yoxdur», `internalSupplyLabel`
  «Daxili təminat», `internalSupplyFullLabel` «Ödənişsiz daxili təminat», `internalSupplyCount(n)`, `unclassifiedLabel`
  «Təsnif edilməyib», `unclassifiedHint`, `pricingReviewLinkLabel` «Qiymət təsnifatına bax», and the tone classes
  (`warningToneClass`, `warningChipClass`, `internalToneClass`, `internalChipClass`).
- It has **no** constant for «Alış qiyməti tələb olunur». That string is typed three times as a literal:
  `PricingModeReviewPage.tsx:27` (`modeLabels`), `:244` (its button) and `SuppliersPage.tsx:21`.
- Qiymət təsnifatı's own three labels and chip colours are local to the page (`PricingModeReviewPage.tsx:25–35`). The
  page re-exports them as `pricingModeLabels` (`:492`), and nothing imports that.

### 2.4 Qiymət təsnifatı and the link

- Route `/pricing-modes`, not permission-guarded in the router (`App.tsx:58`). The menu shows it to `canManageCatalog`
  (`layout/navigation.ts:39`). Without `?order=` it opens on the «Təsnif edilməyib» filter
  (`PricingModeReviewPage.tsx:74`). It reads `?order=`, not `?mode=`.
- `CanManageImports` and `CanManageCatalog` are both Koordinator + Admin (`Api/Security/SecuritySetup.cs:70–71, 91–92`).
  Everybody who can see the import screens can decide on Qiymət təsnifatı.
- The confirmation result carries **no** order ids (`api/imports.ts:200–220`). So there is no order to narrow the page
  to after an import, and the link is the page itself (Assumption 4).

### 2.5 The old-terms sweep

- `src/test/oldTerms.ts` holds one list, `oldTerms`, and `findOldTerms(root)`. It is used by
  `src/terminology/oldTerms.test.tsx` on the **manager's** screens.
- The list mixes two kinds of word:
  - the price words of the brief's pairs (5.3): «Qiyməti olmayanlar», «Qiymət məlumatı çatışmır», «Qiymət məlumatı
    natamamdır», «qiymətsiz», «məhsulun qiyməti yoxdur»;
  - 05b's technical identifiers: «Versiya», «Ö/v», product and object codes, and so on.
- The import screens are the Koordinator's working screens, and legitimately show the second kind. The confirmation
  dialog's «Versiya» column (`ConfirmationDialog.tsx:178`) and the workbook's «Ö/v» header are examples. So the whole
  list cannot be run over them (§4.8).

### 2.6 Tests today

- There is no test of `ImportsPage`, `ReadinessPanel`, `ConfirmationDialog`, `ImportGroupsTable` or `ReviewCenter`.
  `components/imports/review/` has only `Modal.test.tsx` and `productAliasAuthority.test.tsx`. The latter is the
  pattern to follow: `vi.hoisted` API mocks, `vi.mock('../../../auth/AuthProvider')`, and `userEvent`.
- Baseline: 16a's report gives frontend **44 files / 883 tests**. Commit `7cc1ccd` (a monthly-report fix) came after
  it. **Record the baseline at HEAD before changing anything**, and report both numbers.

## 3. Scope: where each brief line lands

| Brief line | 16a | 16b (here) |
|---|---|---|
| "Import yoxlaması … Task 2-nin sözləri ilə danışır: «N sətirdə qiymət yoxdur»" | the counts' meaning | §4.3, §4.4, §4.5, §4.6, §4.7; criteria 1, 2 |
| "Yoxlama zamanı hər qiymətsiz sətri «Alış qiyməti tələb olunur» və ya «Ödənişsiz daxili təminat» kimi təsnif etmək olur." | record + API | §4.2; criterion 3 |
| "Təsnif edilməyən sətirlər importdan sonra … «Təsnif edilməyib» kimi düşür **və ekran bunu əvvəlcədən deyir; yanında Qiymət təsnifatına keçid var.**" | the landing and the forecast numbers | the sentence and the link, §4.3, §4.5; criterion 4 |
| "Import zamanı verilən təsnifat sonradan Qiymət təsnifatında düzəldilə bilir." (16.1) | the lines and their decisions | the result's link, §4.6; criterion 5 |
| "Importdan sonra saylar tutur" | criterion 5 (API) | the screen's figures equal the API's after skips, §4.5, §4.6; criterion 4 |
| "Mənbəyə görə avtomatik təsnifat olmur" / acceptance 4 | criterion 4 | no source-driven control or pre-selection, §4.2; criterion 3 |
| Acceptance 1: "yoxlama ekranı «N sətirdə qiymət yoxdur» deyir" | the number | the words, criterion 1 |
| Acceptance 2: "Yoxlamada bu sətirlərin bir neçəsini təsnif edirəm. Importdan sonra … seçdiyim vəziyyətlə görünür; qalanları «Təsnif edilməyib» … sayları dəqiq tutur." | through the API | through the screen (the visible half): criteria 3, 4, 5, and the operator check §12 |
| Acceptance 3: "sonradan Qiymət təsnifatında dəyişə bilirəm" | criterion 6 | the link to the place where it is done, criterion 5 |
| Acceptance 5: "Import ekranında və qalan ekranlarda eyni sözləri görürəm." | — | §4.1, §4.8; criteria 2, 6 |
| Must keep: objects recognised as before, Task 3 aliases | criterion 8 | no matching code is touched, §7 |
| Must keep: Qiymət təsnifatı counts and paging | criterion 9 | the page's behaviour is unchanged; only where its labels come from moves, §4.1; criterion 7 |
| Out of scope: classifying the 94 rows; who sees Import (Task 14) | — | §10 |

After 16b, nothing of the brief is left open.

## 4. Required behaviour

The exact visible texts are in §4.9. The component and function names are the Planner's. The Coder may rename them,
but must not change what they say or do.

### 4.1 One home for the words: `src/pricing/labels.ts`

Add to `src/pricing/labels.ts`, next to the existing words:

- `priceRequiredLabel = 'Alış qiyməti tələb olunur'`.
- `pricingModeLabels: Record<PricingMode, string>` = `{ Unresolved: unclassifiedLabel, PriceRequired:
  priceRequiredLabel, InternalFreeSupply: internalSupplyFullLabel }`. These are exactly the three strings
  `PricingModeReviewPage` shows today.
- `pricingModeChipClass: Record<PricingMode, string>`: move the page's `modeToneClass` here **unchanged**
  (`PricingModeReviewPage.tsx:31–35`).
- The sentences of §4.9 as functions: `unclassifiedBeforeImportNote(n)`, `unclassifiedAfterImportNote(n)`, and the
  classification tab's words.

Then:

- `PricingModeReviewPage.tsx` imports `pricingModeLabels` and `pricingModeChipClass` instead of defining its own. No
  visible change: the same strings and the same classes. Its `export { modeLabels as pricingModeLabels }` (`:492`) is
  removed, because nothing imports it and the name now belongs to `pricing/labels`.
- `SuppliersPage.tsx:21` and the page's button at `:244` may use `priceRequiredLabel`. That is optional and changes no
  text.
- Every import screen reads its price words from `pricing/labels`. No import component types a price word as a
  literal.

### 4.2 The classification tab in the review

Add a tab to `ReviewCenter`, after «Sətir düzəlişləri». It is labelled «Qiymət təsnifatı», and its badge is the number
of **unclassified** rows. Take the badge number from the readiness that `ReadinessPanel` already loads, with no extra
request. For example, give `ReadinessPanel` an `onLoaded(readiness)` callback. The tab body is a new component, for
example `components/imports/review/PricingClassificationTab.tsx`.

What it shows:

- A one-line explanation (§4.9 T1).
- The three totals, as chips in Qiymət təsnifatı's style, labelled `pricingModeLabels`:
  - «Təsnif edilməyib» = `unclassified`, amber when above 0;
  - «Alış qiyməti tələb olunur» = `priceRequired`;
  - «Ödənişsiz daxili təminat» = `internalFreeSupply`, never amber.
- Filter buttons «Təsnif edilməyib» / «Alış qiyməti tələb olunur» / «Ödənişsiz daxili təminat» / «Hamısı». They map to
  `mode = Unresolved / PriceRequired / InternalFreeSupply / absent`. The tab opens on «Təsnif edilməyib», like the page.
- A search box, submitted on Enter as on Qiymət təsnifatı, sent as `search`. Placeholder: «Məhsul, obyekt və ya
  təchizatçı…».
- A table, `pageSize` 50, with «Əvvəlki» / «Növbəti» and «Səhifə X / Y · N sətir» when there is more than one page.
  Columns:
  - Məhsul: `productName`, with `specificationValue` under it;
  - Obyekt: `locationName`;
  - Dövr: `formatPeriod(requestPeriod)`, or «—»;
  - Miqdar: `quantity` + `orderUnit`;
  - Mənbə: `supplierName`, and «`workbookSupplierName`» under it, as on the page;
  - Vəziyyət: the chip of `classification ?? 'Unresolved'`, and under it "`classifiedByDisplayName`" when classified.
  - The sheet and row number («`sheetName`:`rowNumber`») may be shown small under Mənbə. On this Koordinator screen
    it is how a person finds the row in the workbook.
- One checkbox per row, labelled for a screen reader as on the page (product · location · period).

What it does:

- With rows selected, three buttons appear (§4.9 T3):
  - «Alış qiyməti tələb olunur kimi qeyd et» → `PriceRequired`;
  - «Ödənişsiz daxili təminat kimi qeyd et» → `InternalFreeSupply`;
  - «Təsnifatı geri al» → `Unresolved`, which clears.
- Each button opens a confirmation dialog, using the review's `Modal`, that **lists the selected rows by name**, as
  Qiymət təsnifatı's `DecideDialog` does. For `InternalFreeSupply` it adds the same explanation and the
  `internalSupplyHint` `InfoHint` as that dialog. There is no reason field, because the POST takes none.
- «Qeyd et» calls `setImportPricing(importId, { importRowIds: <the selected ids, exactly>, pricingMode })`. Then:
  - a notice «N sətir «…» kimi qeyd edildi.» (for clearing: «N sətrin təsnifatı geri alındı.»);
  - the selection is cleared and the list reloads;
  - `onChanged({ preview: result.preview })` is called. `ReviewCenter.refresh` then bumps the version, so readiness
    reloads, and passes the preview up, so the groups table and the confirmation section refresh. This is the same
    path every review write takes.
- A server refusal (400/404/422) is shown as the error text the API returns, in the dialog. Nothing else changes.
- Changing the filter, the search or the page clears the selection, as on the page.

What it must **not** have. These are hard, because they are "mənbəyə görə avtomatik təsnifat olmur":

- no "select all", no "select this page", and no selection by supplier, workbook supplier text, location, product or
  category;
- no pre-checked row, and no pre-chosen or suggested mode;
- no text implying that a source decides the state.

A person ticks rows one by one and names the state.

Read-only when the batch cannot be reviewed:

- `ReviewCenter` receives the batch status from `ImportsPage` (`preview.batch.status`).
- Unless the status is `NeedsReview` or `ReadyToImport`, the tab shows the list, the totals and the filter, with **no**
  checkboxes and no buttons, and the note T6 with the link to Qiymət təsnifatı.
- Pricing classification is not a blocker, so the tab never adds to `ReadinessPanel`'s blockers or to «Qalan
  maneələr».

### 4.3 Readiness panel: the price strip

Keep the «Bloklamayanlar» row «Qiymət yoxdur» = `warnings.missingPrice`, with `missingPriceShortLabel` in place of the
literal.

Below the four-section grid, add a **price strip**. It is shown when `unclassifiedPrice + priceRequired +
priceNotRequired > 0`, and says, in this order (texts in §4.9 R1–R5):

1. `missingPriceCount(warnings.missingPrice)`, amber, when `missingPrice > 0`. For example «7 sətirdə qiymət yoxdur».
   This is acceptance 1's sentence.
2. The split: «Təsnif edilməyib N · Alış qiyməti tələb olunur N · Daxili təminat N». The Daxili təminat part is in
   `internalToneClass`, never amber. A part at 0 may be shown as 0 or left out, but it must be the same rule for all
   three.
3. When `unclassifiedPrice > 0`: the advance warning `unclassifiedBeforeImportNote(unclassifiedPrice)`.
4. A button «Təsnif et», which opens the classification tab (§4.2) through the panel's navigation callback.
5. A link «Qiymət təsnifatına bax» → `/pricing-modes`. This is the brief's "yanında Qiymət təsnifatına keçid var".

When nothing is unpriced, the strip is absent.

### 4.4 Staging groups table

In `ImportGroupsTable`, replace the column «Qiymətli / qiymətsiz» (`pricedRows / unpricedRows`) with two columns:

- «Qiymət yoxdur» = `group.missingPriceRows`, amber when above 0, «—» at 0;
- «Daxili təminat» = `group.internalSupplyRows`, slate, «—» at 0.

Both count included rows only (§2.1). Do not show, add or subtract `pricedRows` / `unpricedRows` here. The fields stay
in the API and the type.

### 4.5 Confirmation dialog: the figures follow the skips

In `ConfirmationDialog`, compute the three price figures **after the groups the operator has marked «Bu qrupu idxal
etmə»**, the way `skippedRows` is already computed (`:65–67`):

```
missing      = preview.missingPriceRows      − Σ skipped group.missingPriceItemCount
unclassified = preview.unclassifiedPriceRows − Σ skipped group.unclassifiedPriceItemCount
internal     = preview.internalSupplyRows    − Σ skipped group.internalSupplyItemCount
```

(`priceRequired = missing − unclassified`. If it is shown, compute it the same way from `priceRequiredRows`.) These are
exactly the figures 16a's criterion 5 proves the import writes. So the dialog's forecast equals the result, and equals
the rise on Qiymət təsnifatı.

- Facts: replace «Qiyməti olmayan» with «Qiymət yoxdur» = `missing` (amber when above 0). Add «Təsnif edilməyib» =
  `unclassified` (amber when above 0) and «Daxili təminat» = `internal` (never amber). The other facts are unchanged.
- The warnings note (`:143–148`): shown when `missing > 0` or when there are duplicates or missing suppliers, as today.
  Its price clause is reworded (§4.9 C2). The rest of the sentence is unchanged.
- The advance warning: when `unclassified > 0`, `unclassifiedBeforeImportNote(unclassified)` with the link «Qiymət
  təsnifatına bax» → `/pricing-modes`. Inside this dialog the link opens in a **new tab** (`target="_blank"`,
  `rel="noopener noreferrer"`), so the operator's group decisions and skip reasons are not lost (Assumption 5). Beside
  it, the line C4 says the rows can still be classified in the review's «Qiymət təsnifatı» tab before confirming.
- Groups column «Qiymətsiz» → «Qiymət yoxdur» (`group.missingPriceItemCount`, «—» at 0, as today).
- The request body is unchanged. `expectedRowsToImport` and `expectedGroupCount` are unchanged. No price figure is
  sent.

### 4.6 The result panel

In `ImportsPage`'s `ImportConfirmationSection`, when `imported` is present and `!imported.alreadyImported`:

- The fact «Qiyməti olmayan» becomes «Qiymət yoxdur» = `missingPriceItems`. Add «Təsnif edilməyib» =
  `unclassifiedPriceItems` and «Daxili təminat» = `internalSupplyItems`.
- The note (`:212–215`) is reworded (§4.9 P2). Only the price clause changes. The duplicate clause and the sentence
  after it are kept word for word (§10).
- When `unclassifiedPriceItems > 0`: `unclassifiedAfterImportNote(unclassifiedPriceItems)`.
- When `unclassifiedPriceItems + priceRequiredItems + internalSupplyItems > 0`: the link «Qiymət təsnifatına bax» →
  `/pricing-modes`, and the line P4 saying that what was classified in the review can be changed there (16.1). This is
  a normal in-app link.

When `imported.alreadyImported` is true (a replay), the server returns zeros. The panel does **not** show the price
facts or the price sentences in that case, because they would say "0" about lines that exist. It keeps «Bu idxal artıq
sifarişlərə çevrilib.»-style wording. When the page is reopened on an imported batch (`imported === null`), the panel is
unchanged, apart from an optional link to Qiymət təsnifatı.

### 4.7 Row detail

`RowDetailDialog.tsx:272`: «Qiymət: bilinmir» → «Qiymət: —» when `parsedUnitPrice` is null. The row detail does not
carry the classification, so it must not claim «Qiymət yoxdur» (that would be wrong for a row classified «Daxili
təminat»). The state is said in the classification tab (Assumption 6). No other change to the dialog.

### 4.8 The sweep over the import screens

In `src/test/oldTerms.ts` (test-only):

- Export `oldPriceTerms`: the entries of `oldTerms` that are price words. That is the five of the brief's pairs (5.3):
  «Qiyməti olmayanlar», «Qiymət məlumatı çatışmır», «Qiymət məlumatı natamamdır», «qiymətsiz», «məhsulun qiyməti
  yoxdur». Pick them **by name**, with a test that each named entry exists, so a later rename cannot silently shrink the
  list.
- Export `findOldPriceTerms(root)`, the same as `findOldTerms` over that subset. It uses the same `readableText`, so
  aria-labels, titles and placeholders are read.
- `oldTerms` and `findOldTerms` are unchanged, and every existing sweep test passes unchanged.

The import screens are **not** swept for 05b's technical identifiers. That task was about the manager's view, and these
are the Koordinator's working screens (§2.5, §10).

## 5. Files: summary for the Coder

- `src/pricing/labels.ts` (+ its test, §8).
- `src/pages/PricingModeReviewPage.tsx`: labels and chip classes come from `pricing/labels`, with no visible change.
- `src/pages/ImportsPage.tsx`: result panel; passes the batch status to `ReviewCenter`.
- `src/components/imports/ImportGroupsTable.tsx`.
- `src/components/imports/review/ReviewCenter.tsx`, `ReadinessPanel.tsx`, `ConfirmationDialog.tsx`,
  `RowDetailDialog.tsx`, and the new `PricingClassificationTab.tsx` (with its confirmation dialog, which may be in the
  same file).
- `src/api/imports.ts`, `src/api/rows.ts`: the 16a fields become required (Assumption 3). `src/api/importPricing.ts`
  only if a type needs it.
- `src/test/oldTerms.ts`.
- Tests: §8.
- Optional: `src/pages/SuppliersPage.tsx`, the literal → `priceRequiredLabel` only.

No file under `src/BaxOrders.*`, `tests/BaxOrders.*`, `tools/` or `docs/` changes.

## 6. Safety and STOP conditions

- **No backend, schema, data or tool change.** If any requirement here seems to need a server change (a new field, a
  new endpoint, a change to a 16a count), STOP and report `BLOCKED_HUMAN` with the line. Do not add one.
- **No database access.** Do not run any `tools/` project, `psql`, `pg_dump`, the approval sandbox or DataTransfer. Do
  not start, stop or restart the API. Every test uses mocked API modules.
- **No classification by source** (brief, acceptance 4). If any control, default or text would classify, pre-select or
  suggest a state from a supplier, workbook supplier text, location, product or category, it is wrong. Remove it.
- The Coder classifies nothing anywhere real. HD-002's 94 lines are the owner's.
- Do not change a Task 2 word, colour or count. Do not change Qiymət təsnifatı's behaviour, filters, paging or role
  rules (Task 14). Do not change `pricing/labels`' existing exports' values.
- Do not rework Tasks 1–16a. Report any defect found there.
- Do not commit, push or merge. Edit nothing under `AI_WORKFLOW/` except `STATE.json` and `LAST_REPORT.md`.
- If the brief and this file disagree, STOP with `BLOCKED_HUMAN` and name the line.

## 7. Invariants: MUST NOT CHANGE

- Every server response and every request the frontend sends, except the new calls to 16a's two pricing endpoints.
  The confirmation body is unchanged.
- The importer's parsing, matching, review decisions, corrections, exclusions and blockers. Location aliases (Task 3,
  "H.Ə.M Təmizlik" → HEM) resolve as before, because no matching code or screen is touched.
- Qiymət təsnifatı: the same three labels, chip colours, filters, search, paging, order scope (`?order=`), read-only
  note and decide dialog. Its existing tests pass unchanged.
- Every manager screen's words. `terminology/oldTerms.test.tsx` passes unchanged.
- Task 2's rule: «Qiymət yoxdur» counts Unresolved + PriceRequired, and «Daxili təminat» is never amber and never a
  warning.
- Task 14's role rules: the import route stays `canManageImports`, and `/pricing-modes` stays as it is.
- The readiness `canImport` and blockers: a classification never blocks or unblocks an import.

## 8. Acceptance criteria

1. **Acceptance 1: the review says «N sətirdə qiymət yoxdur».** With readiness `missingPrice 7 = unclassifiedPrice 5
   + priceRequired 2`, `priceNotRequired 2`:
   - the panel shows «7 sətirdə qiymət yoxdur» and the split «Təsnif edilməyib 5 · Alış qiyməti tələb olunur 2 ·
     Daxili təminat 2»;
   - «Daxili təminat» is not amber.
   With every count at 0, there is no price strip.
2. **Task 2's words on every import screen.**
   - Readiness, the groups table, the confirmation dialog, the result panel, the row detail and the classification tab
     use only `pricing/labels`' words for prices.
   - «Qiymətsiz», «Qiymətli / qiymətsiz», «Qiyməti olmayan» (as a count label) and «bilinmir» (as the price) are gone
     from them.
   - The groups table shows `missingPriceRows` / `internalSupplyRows`, not `pricedRows / unpricedRows`.
3. **Classify in the review** (brief line 2, acceptance 2's first half, acceptance 4).
   - The tab lists rows from `fetchImportPricing` with the three totals, and filters with the right `mode`.
   - Selecting two rows and choosing «Ödənişsiz daxili təminat» shows a dialog naming those two rows. «Qeyd et» calls
     `setImportPricing` with exactly their ids and `InternalFreeSupply`. The same holds for `PriceRequired`, and for
     «Təsnifatı geri al» → `Unresolved`.
   - After success: the notice, a reload, and `onChanged` with the returned preview. A 422 shows the server's message
     and nothing else changes.
   - No select-all control, no pre-checked row, and no source-driven control exists. A row whose workbook supplier is
     «Qala baza» appears «Təsnif edilməyib» and unchecked.
   - On an `Imported` batch: no checkbox, no button, and note T6 with the link.
4. **Advance warning and "saylar tutur"** (brief line 3).
   - Readiness: with `unclassifiedPrice 5`, «5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi
     düşəcək.» and a link to `/pricing-modes`.
   - Confirmation dialog, on 16a's worked example (preview 7 / 5 / 2 / 2; group A 5 / 4 / 1 / 1; group B 2 / 1 / 1 / 1):
     - the dialog says 7 «Qiymət yoxdur», 5 «Təsnif edilməyib», 2 «Daxili təminat», and «5 sətir importdan sonra …»;
     - after «Bu qrupu idxal etmə» on B, it says 5 / 4 / 1 and «4 sətir …». That is the rise 16a proved on Qiymət
       təsnifatı.
     - The link opens `/pricing-modes` in a new tab.
5. **After the import** (brief lines 3–4, acceptance 2 and 3, the visible half).
   - A result of `missingPriceItems 5`, `unclassifiedPriceItems 4`, `priceRequiredItems 1`, `internalSupplyItems 1`
     shows the three facts, «4 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.», the line P4 and the link
     «Qiymət təsnifatına bax» → `/pricing-modes`.
   - With `alreadyImported: true`, no price facts or price sentences are shown.
6. **Acceptance 5: the same words.**
   - The sweep of §4.8 finds no old price word on: the import page with a batch under review (readiness, groups, the
     classification tab open), the confirmation dialog, and the result panel.
   - The classification tab's three chips and Qiymət təsnifatı's three chips read the same three strings, taken from
     `pricingModeLabels`.
7. **Nothing else moved.**
   - Qiymət təsnifatı's existing tests and `terminology/oldTerms.test.tsx` pass unchanged.
   - `git status` shows only §5's files and the new tests.
   - No backend file changed.
   - Frontend build and suite are green. The backend build and suite are green and unchanged in count.

## 9. Required tests

Frontend (vitest, `@testing-library/react`, `userEvent`). Mock the API modules as `productAliasAuthority.test.tsx`
does. No test reaches a server.

- `src/pricing/labels.test.ts` (new, or extend an existing one if present):
  - the new constants and sentences, including 1 and larger numbers;
  - `pricingModeLabels` equals the three strings Qiymət təsnifatı showed before (literal expectations).
- `components/imports/review/PricingClassificationTab.test.tsx`: criterion 3 in full. That includes the ids sent, each
  mode, the clear, the dialog listing the rows, the 422 path, the read-only state, the absence of any select-all or
  source control, and the reset of the selection on a filter or page change.
- `components/imports/review/ReadinessPanel.test.tsx`: criteria 1 and 4 (readiness half). The «Təsnif et» button calls
  the navigation that opens the tab. The strip is absent at 0.
- `components/imports/review/ConfirmationDialog.test.tsx`: criterion 4 (dialog half), with and without the skipped
  group, and the new-tab link. The body sent by `confirmImport` is unchanged (assert it).
- `components/imports/ImportGroupsTable.test.tsx`: criterion 2's column, including a group whose `rowCount` /
  `unpricedRows` include an excluded row while `missingPriceRows` does not. The screen shows `missingPriceRows`.
- `pages/ImportsPage.test.tsx` (or a result-panel test): criterion 5, including `alreadyImported`.
- `src/terminology/importScreens.test.tsx` (new; the name is the Planner's): criterion 6.
  - Render `ImportsPage` at `/imports?id=6` with a batch under review, and sweep with `findOldPriceTerms`.
  - Open the classification tab and sweep. Open the confirmation dialog and sweep. Confirm and sweep the result.
  - Assert the new words are present, and that «Qiymətsiz», «Qiymətli / qiymətsiz» and the label «Qiyməti olmayan» are
    absent.
- `src/test/oldTerms.ts`'s own tests (in `oldTerms.test.tsx`'s "the sweep itself", appended):
  - `findOldPriceTerms` finds each of the five price words;
  - it does **not** report «Versiya», «Ö/v» or a product code;
  - each name `oldPriceTerms` selects exists in `oldTerms`.
  - Every existing "the sweep itself" assertion is kept as written.
- `PricingModeReviewPage.test.tsx`: passes **unchanged**. If an import path in it must change because the re-export was
  removed, that is the only edit, and it is named in the report.

Backend: no new test. Run the suites to show they are unchanged.

No expectation may be weakened to make a test pass. Any existing test changed on purpose is named in the report with
the brief line behind it.

## 10. Out of scope

- Any server change, including putting the classification on the row detail (Assumption 6).
- Classifying the 94 real lines, or any real row. HD-002, the owner's work on Qiymət təsnifatı.
- Who sees the import section (Task 14, done).
- Non-price wording on the import screens: «staging», «Versiya», «operator qərarı», «Sifariş siyahıları növbəti
  mərhələdə əlavə olunacaq» (`ImportsPage.tsx:214`, no longer true), `ImportsPage`'s header "Bu mərhələdə sorğu
  yaradılmır", and «Ö/v» (a workbook header). List what you meet in the report for Task 15. Do not change it, except
  where it sits inside a price sentence that §4.9 replaces as a whole.
- The Suppliers page's NotRequired dialog text (`SuppliersPage.tsx:258–261`), recorded by 16a for the owner and
  Task 15.
- Narrowing Qiymət təsnifatı to one import (it has no import filter, and the result carries no order ids).
- The raw workbook price cell in `ImportRowsTable`.

## 11. Expected verification

- `npm run --prefix frontend/bax-orders-web test`: the baseline at HEAD (§2.6), then the new count. All green.
- `npm run --prefix frontend/bax-orders-web build`: green. The existing >500 kB chunk warning may remain.
- `dotnet build BaxOrders.slnx` and `dotnet test BaxOrders.slnx`: green, with the same counts as 16a (1046 unit / 785
  integration). If the running API locks `src/BaxOrders.Api/bin`, use `--artifacts-path` into the scratchpad, say so,
  and do not stop the API.
- `git diff --stat` and `git status`: frontend files only.

## 12. Operator notes (after review)

- Go-live: the API must already run 16a's commit (`4467f8f`) or later. After this task the types require 16a's fields,
  and an older API would leave them empty. No migration, and no API restart beyond that.
- The owner's live check ("Test mühitində import edəndə …") runs in the approval sandbox. Recreate or reset it first
  (`tools/BaxOrders.ApprovalSandbox/sandbox.ps1 -Reset`), so it has 16a's columns. Then:
  1. upload a workbook with unpriced rows;
  2. read «N sətirdə qiymət yoxdur» and the advance warning;
  3. classify some rows in «Qiymət təsnifatı»;
  4. confirm, and read the result;
  5. open Qiymət təsnifatı and check that each total rose by the figure the dialog gave, and that a line classified in
     review can be changed there.
  The Coder does not run this.
- Batch #6 in `baxorders_dev` (NeedsReview, 88 unpriced included rows, per 16a's inspect) can now be classified in
  review before it is confirmed. That is the owner's work, not a code task.

## 13. Where the brief lands in 16b

| Brief | Here |
|---|---|
| «N sətirdə qiymət yoxdur» in the review, acceptance 1 | §4.3; criterion 1 |
| Classify in the review (16.1) | §4.2; criterion 3 |
| Advance warning + link | §4.3, §4.5; criterion 4 |
| "sonradan düzəliş", acceptance 3 (the way there) | §4.6; criterion 5 |
| "saylar tutur", acceptance 2 (visible half) | §4.5, §4.6; criteria 4, 5; §12 |
| No classification by source, acceptance 4 | §4.2, §6; criterion 3 |
| Same words, acceptance 5 | §4.1, §4.8, §4.9; criteria 2, 6 |
| Objects recognised as before; Qiymət təsnifatı unchanged | §7; criterion 7 |

## 4.9 (appendix) Exact texts

Numbers are formatted with `formatCount` / `formatNumber`, as the surrounding screen does. «…» quotes are part of the
text.

| Id | Where | Text |
|---|---|---|
| R1 | Readiness strip | `missingPriceCount(n)` → «7 sətirdə qiymət yoxdur» |
| R2 | Readiness strip | «Təsnif edilməyib 5 · Alış qiyməti tələb olunur 2 · Daxili təminat 2» (labels from `pricing/labels`) |
| R3 | Readiness strip, dialog | `unclassifiedBeforeImportNote(n)` → «5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.» |
| R4 | Readiness strip | button «Təsnif et» |
| R5 | Readiness, dialog, result | link `pricingReviewLinkLabel` «Qiymət təsnifatına bax» → `/pricing-modes` |
| T1 | Tab intro | «Qiyməti olmayan sətirlərin alınan, yoxsa şirkətdaxili təmin olunan material olduğunu burada, importdan əvvəl qeyd edə bilərsiniz. Təsnif edilməyən sətirlər importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşür.» |
| T2 | Tab label | «Qiymət təsnifatı» |
| T3 | Tab buttons | «Alış qiyməti tələb olunur kimi qeyd et» · «Ödənişsiz daxili təminat kimi qeyd et» · «Təsnifatı geri al» |
| T4 | Tab notice | «N sətir «<label>» kimi qeyd edildi.» · clearing: «N sətrin təsnifatı geri alındı.» |
| T5 | Tab empty | «Təsnif edilməmiş sətir qalmayıb.» (filter Təsnif edilməyib) · otherwise «Bu filtrə uyğun sətir tapılmadı.» · no unpriced row at all: «Bu importda qiyməti olmayan sətir yoxdur.» |
| T6 | Tab, batch not reviewable | «Bu import artıq təsdiqlənib. Təsnifatı Qiymət təsnifatında dəyişə bilərsiniz.» + R5 |
| C1 | Dialog facts | «Qiymət yoxdur» · «Təsnif edilməyib» · «Daxili təminat» |
| C2 | Dialog note | «Bu xəbərdarlıqlar idxalı dayandırmır, amma yox olmur: qiyməti olmayan sətirlər Qiymət təsnifatında görünür, mümkün təkrarlar birləşdirilmir və təchizatçısı olmayan sətirlər boş təchizatçı ilə yazılır.» |
| C3 | Dialog groups column | «Qiymət yoxdur» |
| C4 | Dialog, beside R3 | «İdxaldan əvvəl onları yoxlamanın «Qiymət təsnifatı» bölməsində təsnif edə bilərsiniz.» |
| P1 | Result facts | «Qiymət yoxdur» · «Təsnif edilməyib» · «Daxili təminat» |
| P2 | Result note | «Xəbərdarlıqlar yox olmayıb: qiyməti olmayan sətirlər Qiymət təsnifatında görünür, mümkün təkrarlar ayrı-ayrı sətir olaraq qalır. Sifariş siyahıları növbəti mərhələdə əlavə olunacaq.» (the last sentence kept as is, §10) |
| P3 | Result | `unclassifiedAfterImportNote(n)` → «4 sətir Qiymət təsnifatına «Təsnif edilməyib» kimi düşdü.» |
| P4 | Result, beside R5 | «Yoxlamada verilən təsnifatı orada dəyişə bilərsiniz.» |
| D1 | Row detail | «Qiymət» · «—» when no price |

The Coder may improve Azerbaijani grammar in T1, C2, C4, P2 and P4 without changing their meaning. R1, R3, P3, T2 and
the state words are fixed.

---

## Assumptions the Planner made

These are design decisions, not business rules. Each can be overturned at review.

1. The classification lives in a **tab of the existing review** («Qiymət təsnifatı», after «Sətir düzəlişləri»), not
   on a separate page. That is where every other review decision is made, and it reuses the review's refresh path.
2. The tab is named «Qiymət təsnifatı», like the page, because it makes the same decision with the same words
   (acceptance 5). The link to the page is always «Qiymət təsnifatına bax», so the two are told apart by what they are
   (a tab and a link).
3. 16a's fields become **required** in the TypeScript types. 16a is committed, and the go-live already requires its
   API. Optional fields would force `?? 0` guesses into the screens.
4. The link after the import goes to `/pricing-modes`, which opens on «Təsnif edilməyib». There is no import filter on
   that page, and the result carries no order ids. Adding either would be a server change this part does not make.
5. The link inside the confirmation dialog opens in a new tab, so an operator's group decisions and skip reasons
   survive. Elsewhere it is an ordinary in-app link.
6. The row detail says «—» for a missing price, rather than a state word. It does not carry the classification, and
   «Qiymət yoxdur» would be false for a row classified «Daxili təminat». Adding the classification to it would be a
   server change.
7. The confirmation dialog's price figures follow the skipped groups, so the forecast is the number the import will
   actually write (16a criterion 5). The non-price facts keep today's behaviour.
8. Classifying in the tab is confirmed in a dialog that lists the rows, as on Qiymət təsnifatı. There is no
   select-all, for the page's reason: nobody classifies many lines without reading them, and a bulk control is how a
   source rule would creep back.
9. The import screens are swept for the **price** words only (a named subset of `oldTerms`), not for 05b's technical
   identifiers. Those were the manager's view. The Koordinator's import screens legitimately show «Versiya» and the
   workbook's «Ö/v».
10. `modeLabels` / `modeToneClass` move from `PricingModeReviewPage` to `pricing/labels` unchanged, so both screens
    read one definition. Its unused re-export is removed.
11. A replayed confirmation (`alreadyImported`) shows no price figures, because the server returns zeros for it.

---

## Final report format

Write `AI_WORKFLOW/LAST_REPORT.md` in Azerbaijani, with these sections:

0. Git: branch, HEAD (`7cc1ccd`, or the HEAD found), `git status --short`, `git diff --stat`.
1. Sözlər: what was added to `pricing/labels.ts`; every import screen and the words it now shows (§4.9 ids), with
   file:line; the PricingModeReviewPage move and why nothing visible changed.
2. Təsnifat bölməsi: the tab (file:line), its calls (the exact `setImportPricing` payloads in the tests), the dialog,
   the read-only state, and the proof there is no source-driven or select-all control.
3. Əvvəlcədən xəbərdarlıq və saylar: readiness and dialog figures on 16a's worked example, with and without a skipped
   group, and how they equal 16a's proven rises.
4. Nəticə paneli: the example of criterion 5, and the `alreadyImported` case.
5. Süpürmə: `oldPriceTerms` / `findOldPriceTerms`, the screens swept, and the non-price technical words met on the
   import screens (for Task 15), unchanged.
6. Testlər: new tests; deliberately changed tests with their reason; frontend counts (the baseline at HEAD → after);
   backend counts (unchanged); both builds.
7. Toxunulmayanlar: no backend or data change; Qiymət təsnifatı unchanged; manager screens unchanged; HD-002; Tasks
   1–16a.
8. Operator: the live check of §12, and anything found.

End with exactly one of `READY_FOR_REVIEW`, `BLOCKED_HUMAN`, `IMPLEMENTATION_FAILED`.
