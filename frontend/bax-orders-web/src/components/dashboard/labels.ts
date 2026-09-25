import type { CauseCategory } from '../../api/decisions'
import type {
  ComparisonAvailability,
  DashboardAttentionReason,
  DashboardSort,
  HistoryCoverageState,
} from '../../api/dashboard'
import type { PriceCoverageState } from '../../api/analytics'
import { portfolioGroupLabels } from '../../coverage/labels'
import { missingPriceShortLabel } from '../../pricing/labels'
import {
  limitedComparisonDataLabel,
  newProductsLabel,
  notOrderedThisMonthLabel,
  variantChangedLabel,
} from '../../terminology/terms'
import { formatCount, formatMonth, manatSuffix } from '../analytics/format'

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
 * Every sort the dashboard API accepts. Each is a plain fact about the row; none says an object is doing well or
 * badly. The page offers three of them (`dashboardSortOptions`).
 */
export const sortOrder: DashboardSort[] = [
  'AbsoluteKnownAmountDelta',
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

export interface DashboardSortOption {
  sort: DashboardSort
  descending: boolean
  label: string
}

/**
 * The three orders the page offers, the first being the one it opens on: the size of the change, whichever way
 * it went, because "which object moved the most" is the first question asked of the table. The API's own
 * default stays the name, which asserts nothing, so an older link that names no sort still gets an answer.
 */
export const dashboardSortOptions: DashboardSortOption[] = [
  { sort: 'AbsoluteKnownAmountDelta', descending: true, label: 'Ən çox dəyişən' },
  { sort: 'CurrentKnownAmount', descending: true, label: 'Bu ayın məbləği üzrə' },
  { sort: 'LocationName', descending: false, label: 'Obyekt adı üzrə' },
]

/** The page's order for a `sort` read from the URL. Anything but the three it offers reads as none at all. */
export function dashboardSortOption(value: string | null): DashboardSortOption {
  return dashboardSortOptions.find((option) => option.sort === value) ?? dashboardSortOptions[0]
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
    // Said the same way whichever way the money went: the switch is the fact, and the sign says the rest.
    case 'VariantChange':
      return variantChangedLabel
  }
}

/**
 * Why an object was surfaced, said as the fact that put it there — and, for a movement, where it stands.
 *
 * Each title names its own measure, so a card for the biggest sum and a card for the biggest proportion cannot
 * be confused. It also names the card's place in that measure: two cards both called "Ən böyük məbləğ artımı"
 * were one true title and one false one, so the second now says it is the second.
 */
const largestTitles: Record<DashboardAttentionReason, string> = {
  LargestIncrease: 'Ən böyük məbləğ artımı',
  LargestDecrease: 'Ən böyük məbləğ azalması',
  StrongPercentageChange: 'Ən böyük faiz dəyişməsi',
  MissingRequiredPrice: missingPriceShortLabel,
  NoComparisonHistory: portfolioGroupLabels.NoBaseline,
}

/** The measure with no claim about its size, for a place the section never shows (a third or later). */
const plainTitles: Record<DashboardAttentionReason, string> = {
  LargestIncrease: 'Məbləğ artımı',
  LargestDecrease: 'Məbləğ azalması',
  StrongPercentageChange: 'Faiz dəyişməsi',
  MissingRequiredPrice: missingPriceShortLabel,
  NoComparisonHistory: portfolioGroupLabels.NoBaseline,
}

/** The three reasons that are a ranking of money moved, as opposed to a gap in the records. */
const movementReasons: DashboardAttentionReason[] = ['LargestIncrease', 'LargestDecrease', 'StrongPercentageChange']

/**
 * "Ən böyük məbləğ artımı" for the first, "İkinci ən böyük məbləğ artımı" for the second. A warning's title does
 * not rank — "Qiymət yoxdur", "Müqayisə bazası yoxdur" — and a place the section never shows is named without
 * a superlative rather than with a false one.
 */
export function attentionTitle(reason: DashboardAttentionReason, rank: number): string {
  if (!movementReasons.includes(reason) || rank === 1) {
    return largestTitles[reason]
  }

  return rank === 2 ? `İkinci ${lowerFirst(largestTitles[reason])}` : plainTitles[reason]
}

/**
 * "Həm də ən böyük faiz dəyişməsi" — the largest figure of another movement, named on the card it already has,
 * so it is never hidden behind that card's title. Null when there is nothing to name.
 */
export function alsoFirstLine(reasons: readonly DashboardAttentionReason[]): string | null {
  return reasons.length === 0
    ? null
    : `Həm də ${reasons.map((reason) => lowerFirst(largestTitles[reason])).join(' · ')}`
}

/**
 * What "Ən böyük faiz dəyişməsi" is the largest of. The two thresholds are the backend's
 * (`ManagementDashboardQueries.MeaningfulBaseline` and `StrongPercentage`): a percentage of a tiny baseline says
 * more about the divisor than about the change, so those objects are not in the running.
 */
export const strongPercentageHint =
  `Faiz yalnız müqayisə bazası ən azı 100${manatSuffix} olan və ən azı 50% dəyişən obyektlər arasında müqayisə olunur.`

/**
 * Whether a card's title is amber. Amber means one thing on the dashboard — a price somebody owes is missing
 * (Task 2's ⚠) — so only the "Qiymət yoxdur" card has it. "Müqayisə bazası yoxdur" is slate: it states a fact
 * about the window, and nothing is owed.
 */
export const attentionReasonIsMissingPrice: Record<DashboardAttentionReason, boolean> = {
  LargestIncrease: false,
  LargestDecrease: false,
  StrongPercentageChange: false,
  MissingRequiredPrice: true,
  NoComparisonHistory: false,
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('az') + text.slice(1)
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

/**
 * The three words a comparison is read in, the same ones the order page labels its figures with (Task 06) and the
 * table heads its first money column with: this month, what it is set against, and the difference (21.2a).
 */
export const thisMonthLabel = 'Bu ay'
export const baselineLabel = 'Baza'
export const deltaLabel = 'Fərq'

/**
 * "Baza 2/6 ay" beside a difference over a partial baseline. Slate, as the order page states partial coverage:
 * it is a fact about how much history the figure rests on — not a direction (9.1), and not a missing price, which
 * is the only thing amber means.
 */
export const baselineCoverageClass = 'whitespace-nowrap text-xs font-normal text-slate-500'

export const noComparisonNote = 'Əvvəlki ay üçün məlumat yoxdur'
/** An object averaged over fewer months than the basis asked for — the same words as the chip above. */
export const partialHistoryNote = limitedComparisonDataLabel
export const noCurrentRequestNote = 'Bu ay sifariş yoxdur'
export const noComparisonCause = 'Müqayisə üçün əvvəlki ay yoxdur'
export const detailsLabel = 'Detallara bax'
