import type { CauseCategory, DecisionProductCounts, OrderDecisionContext } from '../../api/decisions'
import { missingPriceCount, missingPriceShortLabel } from '../../pricing/labels'
import { newProductsLabel, notOrderedThisMonthLabel, productNoun, variantChangedLabel } from '../../terminology/terms'
import { formatCount, formatMonth } from '../analytics/format'
import { stateLabels } from '../analytics/labels'

/**
 * What each category is called where money is shown beside it.
 *
 * "Miqdar dəyişməsi" read as though the manat figure next to it were a quantity. It is not: it is the share of
 * the money difference that ordering more or less accounts for, so it is named as an effect on money.
 */
export const causeLabels: Record<CauseCategory, string> = {
  NewOrders: newProductsLabel,
  QuantityChange: 'Miqdar təsiri',
  PriceChange: 'Qiymət təsiri',
  NoLongerOrdered: notOrderedThisMonthLabel,
  Services: 'Xidmətlər',
  InternalSupply: 'Daxili təminat',
  // The same two words the line itself says, not a third name for the same gap.
  UnattributedDueToMissingPrice: missingPriceShortLabel,
  VariantChange: variantChangedLabel,
}

/**
 * One line each, said where the figure is — not in a tooltip somebody has to find.
 */
export const causeHints: Record<CauseCategory, string> = {
  NewOrders: 'Keçən ay sifariş olunmayan, bu ay sifariş olunan məhsullar.',
  QuantityChange: 'Eyni məhsuldan daha çox və ya daha az sifariş olunması — keçən ayın qiyməti ilə hesablanır.',
  PriceChange: 'Eyni miqdarın qiymətinin dəyişməsi.',
  NoLongerOrdered: 'Keçən ay sifariş olunan, bu ay sifariş olunmayan məhsullar.',
  Services: 'Xidmətlər miqdar üzrə deyil, yalnız məbləğ üzrə müqayisə olunur.',
  InternalSupply:
    'Daxili anbardan verilən material üçün alış qiyməti tələb olunmur, ona görə dəyişikliyin səbəbi miqdara və ya qiymətə ayrılmır.',
  UnattributedDueToMissingPrice: 'Qiyməti tam bilinmədiyi üçün səbəbi miqdara və qiymətə ayrıla bilməyən məbləğ.',
  VariantChange:
    'Eyni əsas məhsulun bir variantı əvəzinə başqası sifariş olunub (administrator təsdiqləyib). Məbləğ fərqi bir sətirdə göstərilir; məhsullar ayrı qalır.',
}

/**
 * Colour says which kind of cause this is, never whether it is good news. Ordering more is not a failure and
 * ordering less is not a success, so nothing here is green or red — the one amber is a data gap, which is a
 * fact about the records rather than about the spending.
 */
export const causeToneClass: Record<CauseCategory, string> = {
  NewOrders: 'bg-sky-50 text-sky-900 ring-sky-200',
  QuantityChange: 'bg-indigo-50 text-indigo-900 ring-indigo-200',
  PriceChange: 'bg-violet-50 text-violet-900 ring-violet-200',
  NoLongerOrdered: 'bg-slate-100 text-slate-700 ring-slate-300',
  Services: 'bg-slate-50 text-slate-700 ring-slate-200',
  // Slate, never amber: this is how some material arrives, not something anybody has to put right.
  InternalSupply: 'bg-slate-100 text-slate-700 ring-slate-300',
  UnattributedDueToMissingPrice: 'bg-amber-50 text-amber-900 ring-amber-200',
  // Slate: which products were switched is a fact about the order, not a direction and not a gap.
  VariantChange: 'bg-slate-100 text-slate-700 ring-slate-300',
}

/** The order a reader should meet them, matching the one the backend returns. */
export const causeOrder: CauseCategory[] = [
  'NewOrders',
  'QuantityChange',
  'PriceChange',
  'NoLongerOrdered',
  'VariantChange',
  'Services',
  'InternalSupply',
  'UnattributedDueToMissingPrice',
]

/**
 * How two causes of the same size are ordered — the dashboard's order, not `causeOrder`.
 *
 * The dashboard card picks its "Əsas səbəb" in `ManagementDashboardQueries` as the largest cause, ties broken by
 * the backend's `CauseCategory` value, which puts "Qiymət yoxdur" before "Daxili təminat", and "Variant dəyişib" (8)
 * after every other. The order page sorts its parts by size and breaks ties the same way, so its first part and the
 * card's "Əsas səbəb" are always the same cause for the same order and basis.
 */
export const causeTieOrder: CauseCategory[] = [
  'NewOrders',
  'QuantityChange',
  'PriceChange',
  'NoLongerOrdered',
  'Services',
  'UnattributedDueToMissingPrice',
  'InternalSupply',
  'VariantChange',
]

/**
 * The one pill of a product whose quantity and price both moved.
 *
 * It used to carry only the larger of its two effects — "Miqdar təsiri" on Zibil paketi, whose +167 ₼ was 160 ₼
 * of quantity and 7 ₼ of price — so the row read as a quantity change with the price hidden in it. The pill now
 * names both, neutrally, and the line under the figures gives each its money.
 */
export const mixedCauseLabel = 'Miqdar və qiymət'

/** Slate: the pill says which kind of change this is, and a row that moved both ways is neither kind alone. */
export const mixedCauseToneClass = 'bg-slate-100 text-slate-700 ring-slate-300'

/** The two words of a mixed row's split: "Miqdar +160,00 ₼ · Qiymət +7,00 ₼". */
export const quantityPartLabel = 'Miqdar'
export const pricePartLabel = 'Qiymət'

/**
 * `New` and `NoLongerOrdered` are the product's state — the comparison page's own rule — not where its money
 * went, so the chip and the comparison page count the same products.
 *
 * `Steady` is the one chip whose rows are not drivers: the compared products whose money did not move, which the
 * comparison page listed and the order page now lists too (11.1). "Hamısı" keeps Task 10's meaning — the products
 * that changed — so they are under this chip and under no other.
 */
export type DriverFilter =
  | 'All'
  | 'PriceChange'
  | 'QuantityChange'
  | 'New'
  | 'NoLongerOrdered'
  | 'MissingPrice'
  | 'Steady'

/** The chip of the products whose money did not move, and the scope line's words for them. */
export const steadyProductsLabel = 'Məbləği dəyişməyən'

export const driverFilterLabels: Record<DriverFilter, string> = {
  All: 'Hamısı',
  PriceChange: 'Qiymət dəyişən',
  QuantityChange: 'Miqdar dəyişən',
  New: newProductsLabel,
  NoLongerOrdered: notOrderedThisMonthLabel,
  MissingPrice: missingPriceShortLabel,
  Steady: steadyProductsLabel,
}

export const driverFilterOrder: DriverFilter[] = [
  'All',
  'PriceChange',
  'QuantityChange',
  'New',
  'NoLongerOrdered',
  'MissingPrice',
  'Steady',
]

/**
 * What "Hamısı" counts, said under the heading.
 *
 * "Hamısı 100" on an order of 76 lines read as a mistake. It was not one — the comparison is over this order and
 * the basis window together, and only the products that changed are listed — but nothing said so.
 *
 * The rest are "məbləği dəyişməyən", in the chip's own words. It used to say they "did not change", which is not
 * true of store material whose quantity moved at no cost — and that product is now on screen, marked "Artıb".
 */
export function driverScopeLine(products: DecisionProductCounts): string {
  const { inCurrentOrderCount, comparedCount, listedCount } = products
  const line = `Bu sifarişdə ${formatCount(inCurrentOrderCount)} ${productNoun} var, müqayisə bazası ilə birlikdə `
    + `${formatCount(comparedCount)}. «Hamısı» onlardan dəyişən ${formatCount(listedCount)} ${productNoun}u sayır.`

  return comparedCount > listedCount
    ? `${line} ${formatCount(comparedCount - listedCount)} ${productNoun}un məbləği dəyişməyib.`
    : line
}

/**
 * "Artıb: 12 · Azalıb: 9 · Xidmətlər: 1" — how many compared products went up or down by quantity, and how many
 * are services, as the comparison page counted them. The counts are the backend's, over every compared product;
 * nothing is counted here. "Xidmətlər" only when there is one.
 */
export function productStateLine(products: DecisionProductCounts): string {
  const parts = [
    `${stateLabels.Increased}: ${formatCount(products.increasedCount)}`,
    `${stateLabels.Decreased}: ${formatCount(products.decreasedCount)}`,
  ]

  if (products.serviceCount > 0) {
    parts.push(`${causeLabels.Services}: ${formatCount(products.serviceCount)}`)
  }

  return parts.join(' · ')
}

/** Said on a product the company paid for in one month and supplied itself in the other. */
export const supplyChangedDriverNote = 'Təchizat forması dəyişib: alınan / şirkətdaxili'

/**
 * Said when the chosen window holds no order at all.
 *
 * Not "keçən ay yoxdur": the reader may have chosen any window, and the honest statement is about the window
 * they chose. Nothing is compared against zero and no other basis is quietly substituted.
 */
export const emptyWindowNote = 'Seçilmiş dövrdə müqayisə üçün sifariş yoxdur'

/** How the average treats a month the object never ordered in. Said wherever an average is shown. */
export const averagingHint =
  'Ortalama yalnız sifariş olan aylar üzrə hesablanır: obyektin sifarişi olmayan ay sıfır sayılmır və bölənə daxil edilmir.'

export const coverageHint =
  'Bazanın əhatə etdiyi aylardan yalnız bir hissəsində bu obyektin sifarişi var. Ortalama həmin mövcud aylara bölünür.'

export const noPreviousMonthNote = 'Keçən ay üçün müqayisə məlumatı yoxdur.'

// ---- what the window is made of (Task 11b: the comparison page's facts, on the order page) ---------------

/**
 * "(2/3 ay · Çatışmayan: Aprel 2026)" — what an average rests on, and which months of the window the object has no
 * order for. The months are named rather than only counted, as the comparison page named them.
 */
export function partialCoverageLine(available: number, expected: number, missing: readonly string[]): string {
  const months = missing.map(formatMonth).join(', ')
  return months
    ? `(${formatCount(available)}/${formatCount(expected)} ay · Çatışmayan: ${months})`
    : `(${formatCount(available)}/${formatCount(expected)} ay)`
}

/** The disclosure listing every month of the chosen window. */
export const windowMonthsLabel = 'Müqayisəyə daxil olan aylar'

/** The link beside a window month the object has an order for. */
export const openOrderLabel = 'Sifarişə bax'

/**
 * "Aprel 2026 — sifariş yoxdur": a month of the window the object did not order in. A gap in the window, not a price
 * warning — so words, never a warning icon.
 */
export function windowMonthWithoutOrder(period: string): string {
  return `${formatMonth(period)} — sifariş yoxdur`
}

/**
 * "Müqayisə dövründə də 3 sətirdə qiymət yoxdur — hər iki məbləğ tam deyil." — said only when both this order and
 * the window owe prices, so neither side of the difference is a whole amount. The comparison page's sentence.
 */
export function bothSidesOwePricesNote(baselineMissingPriceItemCount: number): string {
  return `Müqayisə dövründə də ${missingPriceCount(baselineMissingPriceItemCount)} — hər iki məbləğ tam deyil.`
}

/**
 * The months an order can be compared against, oldest first, as `yyyy-MM` — what a hand-picked range offers.
 *
 * They come from the "Bütün dövr" window, which is every month the company has ordered in before this one — the
 * same set the dashboard offers, so the screens agree about what a hand-picked range may contain. The order page
 * and the object page both ask this one function, so their pickers cannot offer two different lists for one order.
 */
export function comparablePriorMonths(context: OrderDecisionContext | null | undefined): string[] {
  return (context?.secondary.find((item) => item.basis === 'AllPriorMonths')?.windowPeriods
    ?? context?.primary.windowPeriods
    ?? []).map((period) => period.slice(0, 7))
}
