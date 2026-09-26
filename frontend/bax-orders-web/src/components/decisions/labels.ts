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
 * The section's own name, in the words its reader would use for it: these are the products that moved the order's
 * amount. Said once, so the heading and the landmark can never drift apart.
 *
 * It was «Əsas dəyişikliklər», which named the analysis rather than the thing a manager is looking for.
 */
export const driverSectionTitle = 'Məbləği dəyişdirən əsas məhsullar'

/** Slate: the badge under «Məbləği dəyişməyən» names a state, which is a fact about the product, not a verdict. */
export const mixedCauseToneClass = 'bg-slate-100 text-slate-700 ring-slate-300'

/** What the row's leading figure is: this product's whole effect on the order's difference. */
export const totalEffectLabel = 'Ümumi təsir'

/** The lead of the one sentence that says why, before a single figure has to be read. */
export const primaryCauseLabel = 'Əsas səbəb'

/**
 * The two halves of the money, named as effects ON the total rather than as the things they are named after.
 *
 * "Miqdar +270,00 ₼" read as though the manat figure were a quantity. It is not — it is the share of the
 * difference that ordering more accounts for — and «təsiri» is what makes that impossible to misread.
 */
export const quantityEffectLabel = 'Miqdarın təsiri'
export const priceEffectLabel = 'Qiymətin təsiri'

/** The headings of the two before → after facts under the reason. */
export const quantityFactLabel = 'Miqdar'
export const priceFactLabel = 'Qiymət'

/** The cue that says the whole card opens the product's history. One target, named rather than guessed at. */
export const historyCueLabel = 'Tarixçə'

/**
 * The one effect of a product that has only one, said in that product's own terms.
 *
 * A new product's whole amount is new spending, and a dropped one's whole amount is spending that stopped.
 * Neither is a quantity effect or a price effect, and neither is given a made-up previous price to make it
 * look like one.
 */
export const newProductEffectLabel = 'Yeni məhsulun təsiri'
export const noLongerOrderedEffectLabel = 'Bu ay yazılmamasının təsiri'

const quantityRoseCause = 'daha çox sifariş verilib'
const quantityFellCause = 'daha az sifariş verilib'
const priceRoseCause = 'qiymət artıb'
const priceFellCause = 'qiymət azalıb'
const equalEffectCause = 'miqdar və qiymət eyni təsir edib'
const newProductCause = 'Bu ay ilk dəfə sifariş edilib'
const noLongerOrderedCause = 'keçən ay olan məhsul bu ay yazılmayıb'

/**
 * Whether this row's money was split into a quantity effect and a price effect at all.
 *
 * A new product, one no longer ordered, a service, store material and a line still owing a price are never split:
 * the backend returns null for both, and the row keeps its category's own accepted words.
 */
export function hasEffectSplit(quantityImpact: number | null, priceImpact: number | null): boolean {
  return quantityImpact !== null && priceImpact !== null
}

/**
 * Why this product moved the amount, in the words a manager would use — from the two figures the backend already
 * returns and from nothing else. No threshold, no heuristic, no new arithmetic.
 *
 * The larger contribution in absolute money is the reason, and its own sign says which way. Because the two
 * contributions sum to the total, the larger one always carries the total's sign, so this sentence can never
 * contradict the figure beside it: quantity +227,03 with price −10,60 is "daha çox sifariş verilib" on a +216,43
 * row, and quantity −23,36 with price +85,61 is "qiymət artıb" on a +62,25 one.
 */
export function primaryCause(
  category: CauseCategory,
  quantityImpact: number | null,
  priceImpact: number | null,
): string | null {
  if (!hasEffectSplit(quantityImpact, priceImpact)) {
    // The two the reader still wants a sentence for. The rest — a service, store material, a line owing a
    // price — say everything they have to say in their badge, and a second line would only repeat it.
    if (category === 'NewOrders') {
      return newProductCause
    }

    if (category === 'NoLongerOrdered') {
      return noLongerOrderedCause
    }

    return null
  }

  const quantity = Math.abs(quantityImpact as number)
  const price = Math.abs(priceImpact as number)

  // Neither outweighs the other, so neither may be called the reason.
  if (quantity === price) {
    return equalEffectCause
  }

  if (quantity > price) {
    return (quantityImpact as number) > 0 ? quantityRoseCause : quantityFellCause
  }

  return (priceImpact as number) > 0 ? priceRoseCause : priceFellCause
}

/**
 * "Əsas səbəb: daha çox sifariş verilib" — the whole line, so no component assembles it from two pieces, and
 * null where this kind of row has no sentence to give.
 */
export function primaryCauseLine(
  category: CauseCategory,
  quantityImpact: number | null,
  priceImpact: number | null,
): string | null {
  const cause = primaryCause(category, quantityImpact, priceImpact)
  return cause === null ? null : `${primaryCauseLabel}: ${cause}`
}

/**
 * The name of the one pill a row with a single effect carries, or null where the money is split in two and the
 * two effect labels carry it instead.
 */
export function soleEffectLabel(category: CauseCategory, quantityImpact: number | null, priceImpact: number | null): string | null {
  if (hasEffectSplit(quantityImpact, priceImpact)) {
    return null
  }

  if (category === 'NewOrders') {
    return newProductEffectLabel
  }

  return category === 'NoLongerOrdered' ? noLongerOrderedEffectLabel : null
}

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
 * What "Hamısı" counts, said beside the heading behind its ⓘ (23.3; under the heading until then).
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
 * The ⓘ beside «Əsas dəyişikliklər» that holds `driverScopeLine` (23.3): named for the question the sentence answers,
 * as the page's other hints are. The sentence explains how the list counts, so it is asked for, not read first.
 */
export const driverScopeHintLabel = '«Hamısı» nəyi sayır?'

/**
 * Said under a reason whose list counts a different number of products than the reason does (18.3).
 *
 * The part counts the products its money is filed under ("58 məhsuldan"); the chip counts every product in the
 * chip's state — a new product owing a price, or supplied from the store, is new, and its money sits in another
 * part. Neither number is wrong and neither changes: each says what it counts.
 *
 * "«Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» və «Qiymət yoxdur» hissələrində olanları
 * da." The parts are named by their own names on the same screen, so the reader can find each of them above.
 */
export function causeListCountNote(
  filter: DriverFilter,
  listedCount: number,
  otherParts: readonly CauseCategory[],
): string {
  const line = `«${driverFilterLabels[filter]}» siyahısı ${formatCount(listedCount)} ${productNoun}u sayır`
  const parts = otherParts.map((category) => `«${causeLabels[category]}»`)

  if (parts.length === 0) {
    return `${line}.`
  }

  if (parts.length === 1) {
    return `${line} — məbləği ${parts[0]} hissəsində olanları da.`
  }

  return `${line} — məbləği ${parts.slice(0, -1).join(', ')} və ${parts[parts.length - 1]} hissələrində olanları da.`
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
