import type { PricingMode } from '../api/orders'

/**
 * What an order line's price situation is called, everywhere in the app.
 *
 * The same idea used to have about ten names — "qiymətsiz sətir", "məhsulun qiyməti yoxdur", "sətirdə qiymət
 * yoxdur", "Qiymətsiz sətirlər", "Qiymət natamam", "Qiyməti bilinməyənlər", "Qiymətsiz", "Daxili anbardan",
 * "Daxili təminat", "Ödənişsiz daxili təminat" — and two of those meant the opposite thing. A reader moving
 * between screens had to work out each time whether they were being shown a problem or a fact.
 *
 * Two words carry the whole distinction now:
 *
 *   **Qiymət yoxdur** — a price is owed and absent, or nobody has said which. Amber. Somebody must act.
 *   **Daxili təminat** — the company supplies this itself, free. Neutral. Nothing is missing.
 *
 * This module stays the home of the price words. The app's other shared terms — "Yeni məhsullar", "Orta qiymət",
 * "Məhsul tarixçəsi" and the rest of owner decision 5.1 — live in `src/terminology`.
 */

/** The mirror of `BaxOrders.Domain.Orders.OrderLinePricingState`. */
export type LinePricingState =
  | 'Priced'
  | 'MissingUnclassified'
  | 'MissingPriceRequired'
  | 'FreeInternalSupply'

/**
 * The one rule, in the browser.
 *
 * A recorded price wins: a line that carries a price is priced whatever its pricing mode says, because the
 * price is a fact about money that changed hands and the mode is a statement about an absence that is not
 * there. This is the same rule the server applies, and the tests hold the two to each other.
 */
export function classifyLine(unitPrice: number | null, pricingMode: PricingMode): LinePricingState {
  if (unitPrice !== null) {
    return 'Priced'
  }

  switch (pricingMode) {
    case 'InternalFreeSupply':
      return 'FreeInternalSupply'
    case 'PriceRequired':
      return 'MissingPriceRequired'
    default:
      return 'MissingUnclassified'
  }
}

/** Something somebody has to put right. */
export function isPriceWarning(state: LinePricingState): boolean {
  return state === 'MissingUnclassified' || state === 'MissingPriceRequired'
}

/** The company supplying itself. Context, never a problem. */
export function isInternalSupply(state: LinePricingState): boolean {
  return state === 'FreeInternalSupply'
}

// ---- the two words ---------------------------------------------------------------------------------

/** A price is owed and is not there. Amber, everywhere. */
export const missingPriceLabel = 'Qiymət yoxdur'

/** The company supplies this itself, free of charge. Neutral, everywhere. */
export const internalSupplyLabel = 'Daxili təminat'

/** Said in full where there is room and the reader may not know the short form yet. */
export const internalSupplyFullLabel = 'Ödənişsiz daxili təminat'

/** A line nobody has classified. Still a warning; this only adds who can answer it. */
export const unclassifiedLabel = 'Təsnif edilməyib'

/** A line somebody said is bought: the price is owed. Still a warning. */
export const priceRequiredLabel = 'Alış qiyməti tələb olunur'

/**
 * The three states of an unpriced line, where a screen is about telling them apart: Qiymət təsnifatı, and the
 * import review's tab of the same name (Task 16). One definition, so the two can never drift.
 */
export const pricingModeLabels: Record<PricingMode, string> = {
  Unresolved: unclassifiedLabel,
  PriceRequired: priceRequiredLabel,
  InternalFreeSupply: internalSupplyFullLabel,
}

// ---- the two colours -------------------------------------------------------------------------------

/**
 * Amber means one thing on these screens: a price somebody owes is missing. It is never used for internal
 * supply, because nothing about internal supply is missing.
 */
export const warningToneClass = 'text-amber-800'
export const warningChipClass = 'bg-amber-50 text-amber-900 ring-amber-200'

/** Slate, not amber. A fact about how the material arrives, not a problem with the records. */
export const internalToneClass = 'text-slate-500'
export const internalChipClass = 'bg-slate-100 text-slate-700 ring-slate-300'

/** The chip of each state on the screens that list them by state. Internal supply is sky, never amber. */
export const pricingModeChipClass: Record<PricingMode, string> = {
  Unresolved: 'bg-amber-50 text-amber-900 ring-amber-200',
  PriceRequired: 'bg-slate-100 text-slate-700 ring-slate-300',
  InternalFreeSupply: 'bg-sky-50 text-sky-900 ring-sky-200',
}

export function lineToneClass(state: LinePricingState): string {
  return isPriceWarning(state) ? warningToneClass : internalToneClass
}

/** What to print in a price cell that holds no price. Never "0,00 ₼": no price was ever recorded. */
export function unpricedCellLabel(state: LinePricingState): string {
  return isInternalSupply(state) ? internalSupplyLabel : missingPriceLabel
}

// ---- the counts ------------------------------------------------------------------------------------

/** "3 sətirdə qiymət yoxdur" — the one sentence for a count of price warnings. */
export function missingPriceCount(count: number): string {
  return `${count} sətirdə qiymət yoxdur`
}

/** "2 sətir daxili təminat (ödənişsiz)" — never worded as a shortfall. */
export function internalSupplyCount(count: number): string {
  return `${count} sətir daxili təminat (ödənişsiz)`
}

/** Beside an order's price warning: the unpriced lines themselves, on Qiymət təsnifatı, read-only for a Rəhbər (14.1). */
export const pricingReviewLinkLabel = 'Qiymət təsnifatına bax'

/** Where Qiymət təsnifatı lives. Without `?order=` it opens on the lines nobody has classified. */
export const pricingReviewPath = '/pricing-modes'

// ---- the import review (Task 16) ---------------------------------------------------------------------

/** Before the import: what happens to the rows nobody classifies in the review. */
export function unclassifiedBeforeImportNote(count: number): string {
  return `${count} sətir importdan sonra Qiymət təsnifatına «${unclassifiedLabel}» kimi düşəcək.`
}

/** After the import: the work it left on Qiymət təsnifatı. */
export function unclassifiedAfterImportNote(count: number): string {
  return `${count} sətir Qiymət təsnifatına «${unclassifiedLabel}» kimi düşdü.`
}

/** The review's tab, named like the page: it makes the same decision with the same words. */
export const importPricingTabLabel = 'Qiymət təsnifatı'

export const importPricingIntro =
  'Qiyməti olmayan sətirlərin alınan, yoxsa şirkətdaxili təmin olunan material olduğunu burada, importdan əvvəl '
  + `qeyd edə bilərsiniz. Təsnif edilməyən sətirlər importdan sonra Qiymət təsnifatına «${unclassifiedLabel}» kimi düşür.`

/** What each of the tab's buttons says. Clearing takes a classification away; the row is unclassified again. */
export const importPricingActionLabels: Record<PricingMode, string> = {
  PriceRequired: `${priceRequiredLabel} kimi qeyd et`,
  InternalFreeSupply: `${internalSupplyFullLabel} kimi qeyd et`,
  Unresolved: 'Təsnifatı geri al',
}

/** After the tab saved: "3 sətir «Ödənişsiz daxili təminat» kimi qeyd edildi." */
export function importPricingSavedNotice(count: number, mode: PricingMode): string {
  return mode === 'Unresolved'
    ? `${count} sətrin təsnifatı geri alındı.`
    : `${count} sətir «${pricingModeLabels[mode]}» kimi qeyd edildi.`
}

export const importPricingNoneLeft = 'Təsnif edilməmiş sətir qalmayıb.'
export const importPricingNoneMatching = 'Bu filtrə uyğun sətir tapılmadı.'
export const importPricingNoUnpricedRows = 'Bu importda qiyməti olmayan sətir yoxdur.'
export const importPricingReadOnlyNote =
  'Bu import artıq təsdiqlənib. Təsnifatı Qiymət təsnifatında dəyişə bilərsiniz.'

/** Beside the advance warning, in the confirmation dialog: there is still time. */
export const classifyBeforeImportHint =
  `İdxaldan əvvəl onları yoxlamanın «${importPricingTabLabel}» bölməsində təsnif edə bilərsiniz.`

/** Beside the link after the import (16.1): what the review decided is not final. */
export const changeAfterImportHint = 'Yoxlamada verilən təsnifatı orada dəyişə bilərsiniz.'

/** Said only where a price somebody owes is actually absent. */
export const amountIncompleteLabel = 'Məbləğ tam deyil'

/** For a column header or a filter chip, where a noun reads better than a sentence. */
export const missingPriceShortLabel = 'Qiymət yoxdur'
export const internalSupplyShortLabel = 'Daxili təminat'

// ---- the hints -------------------------------------------------------------------------------------

export const internalSupplyHint =
  'Bu material şirkətdaxili təmin olunur, alış qiyməti tələb olunmur.'

export const unclassifiedHint =
  'Bu sətrin qiyməti yoxdur və onun alınan, yoxsa şirkətdaxili təmin olunan material olduğu hələ qeyd edilməyib. '
  + 'Koordinator və ya admin «Qiymət təsnifatı» səhifəsində qeyd edə bilər.'

export const amountIncompleteHint =
  'Məbləğ yalnız qiyməti məlum olan sətirlər üzrədir. Şirkətdaxili təmin olunan sətirlər məbləğə daxil deyil '
  + 'və məbləği natamam etmir.'

// ---- where an internal line came from ----------------------------------------------------------------

/** The company's own store, when the workbook does not name which one. */
export const internalWarehouseFallback = 'Daxili anbar'

/**
 * "Daxili: Azpetrol baza" — the store an internally supplied line was issued by.
 *
 * These lines have no catalogue supplier at all, so the cell used to read "Məlum deyil", which says the
 * record is incomplete. It is not: it came out of our own warehouse, and the workbook usually says which.
 */
export function internalSupplierLabel(sourceName: string | null | undefined): string {
  const name = sourceName?.trim()
  return name ? `Daxili: ${name}` : internalWarehouseFallback
}
