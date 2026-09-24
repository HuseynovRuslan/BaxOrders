import type { CauseCategory } from '../../api/decisions'
import type {
  ComparisonAvailability,
  DashboardAttentionReason,
  DashboardSort,
  HistoryCoverageState,
} from '../../api/dashboard'
import type { PriceCoverageState } from '../../api/analytics'
import { missingPriceShortLabel } from '../../pricing/labels'
import { limitedComparisonDataLabel, newProductsLabel, notOrderedThisMonthLabel } from '../../terminology/terms'
import { formatCount, formatMonth } from '../analytics/format'

export const historyCoverageLabels: Record<HistoryCoverageState, string> = {
  Complete: 'Tam tarixçə',
  Partial: limitedComparisonDataLabel,
  Unavailable: 'Tarixçə yoxdur',
}

/**
 * Colour says which of the three coverage states a row is in, and never whether that is good. An object with
 * no history is not a failing object; it is an object the comparison cannot speak about.
 */
export const historyCoverageClass: Record<HistoryCoverageState, string> = {
  Complete: 'bg-slate-100 text-slate-700 ring-slate-200',
  Partial: 'bg-amber-50 text-amber-900 ring-amber-200',
  Unavailable: 'bg-amber-50 text-amber-900 ring-amber-300',
}

export const historyCoverageOrder: HistoryCoverageState[] = ['Complete', 'Partial', 'Unavailable']

export function isHistoryCoverage(value: string | null): value is HistoryCoverageState {
  return value !== null && value in historyCoverageLabels
}

/** What a row says instead of a comparison when there is nothing to compare. */
export const availabilityLabels: Record<ComparisonAvailability, string> = {
  Available: 'Müqayisə olunur',
  NoCurrentRequest: 'Bu ay sifariş yoxdur',
  NoBaselineHistory: 'Müqayisə üçün əvvəlki dövr məlumatı yoxdur',
}

export const priceCoverageLabels: Record<PriceCoverageState, string> = {
  Complete: 'Qiyməti tam olan',
  Partial: 'Qiyməti natamam olan',
  Unavailable: 'Qiymət məlumatı olmayan',
}

export const priceCoverageOrder: PriceCoverageState[] = ['Complete', 'Partial', 'Unavailable']

export function isPriceCoverage(value: string | null): value is PriceCoverageState {
  return value !== null && value in priceCoverageLabels
}

/**
 * The sorts the dashboard accepts in its URL. Every one is a plain fact about the row, and the default is the
 * object's name, which asserts nothing about it. None of them is offered by name on the screen.
 */
export const sortOrder: DashboardSort[] = [
  'LocationName',
  'CurrentKnownAmount',
  'KnownAmountDelta',
  'KnownAmountPercentChange',
  'MissingPriceItemCount',
  'CurrentItemCount',
  'NewVariantCount',
  'IncreasedVariantCount',
  'DecreasedVariantCount',
  'HistoryCoverage',
]

export function isSort(value: string | null): value is DashboardSort {
  return value !== null && (sortOrder as string[]).includes(value)
}

/**
 * A cause written the way a manager would say it out loud: with its direction in the words, so the sign beside
 * it confirms the reading rather than being the only clue to it.
 */
export function causeHeadline(category: CauseCategory, amount: number): string {
  switch (category) {
    case 'NewOrders':
      return newProductsLabel
    case 'QuantityChange':
      return amount >= 0 ? 'Miqdar artımı' : 'Miqdar azalması'
    case 'PriceChange':
      return amount >= 0 ? 'Qiymət artımı' : 'Qiymət azalması'
    case 'NoLongerOrdered':
      return notOrderedThisMonthLabel
    case 'Services':
      return 'Xidmətlər'
    case 'InternalSupply':
      return 'Daxili təminat'
    case 'UnattributedDueToMissingPrice':
      return missingPriceShortLabel
  }
}

/**
 * Why an object was surfaced, said as the fact that put it there.
 *
 * "Ən çox artan" and "Nisbətdə böyük dəyişmə" were both true and both vague — neither said what was measured,
 * and two cards could sit side by side for what looked like the same reason. Each label now names its own
 * measure, so a card for the biggest sum and a card for the biggest proportion cannot be confused.
 */
export const attentionReasonLabels: Record<DashboardAttentionReason, string> = {
  LargestIncrease: 'Ən böyük məbləğ artımı',
  LargestDecrease: 'Ən böyük məbləğ azalması',
  StrongPercentageChange: 'Ən böyük faiz dəyişməsi',
  MissingRequiredPrice: missingPriceShortLabel,
  NoComparisonHistory: 'Müqayisə üçün əvvəlki ay yoxdur',
}

/**
 * Which cards report a movement and which report a gap in the records.
 *
 * It decides one thing: whether the card's figures are coloured by direction or left neutral under an amber
 * warning. A card about missing data has no direction to colour.
 */
export const attentionReasonIsWarning: Record<DashboardAttentionReason, boolean> = {
  LargestIncrease: false,
  LargestDecrease: false,
  StrongPercentageChange: false,
  MissingRequiredPrice: true,
  NoComparisonHistory: true,
}

/**
 * What the "Məlumat vəziyyəti" column says — and, when everything is in order, it says nothing at all. A badge
 * that appears on every healthy row is noise a reader learns to skip, which is how the real ones get skipped too.
 */
/** "Sentyabr 2026 sifarişlərinin məbləği" — the month says which month, so nobody has to look it up. */
export function monthAmountHeading(period: string): string {
  return `${formatMonth(period)} sifarişlərinin məbləği`
}

/** Neutral by design: the system knows an object has no request, never why. */
export const ordersThisMonthLabel = 'Bu ay sifariş olan obyektlər'

export function locationsWithoutRequestNote(count: number): string {
  return `${formatCount(count)} obyekt üzrə sifariş qeydə alınmayıb`
}

/** Products bought in one of the two months and supplied from the company's own store in the other. */
export function supplyChangedNote(count: number): string {
  return `${formatCount(count)} məhsulun təchizat forması dəyişib (alınan / şirkətdaxili)`
}

export const noComparisonNote = 'Əvvəlki ay üçün məlumat yoxdur'
/** An object averaged over fewer months than the basis asked for — the same words as the chip above. */
export const partialHistoryNote = limitedComparisonDataLabel
export const noCurrentRequestNote = 'Bu ay sifariş yoxdur'
export const noComparisonCause = 'Müqayisə üçün əvvəlki ay yoxdur'
export const detailsLabel = 'Detallara bax'
