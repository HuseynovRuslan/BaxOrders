import type { CauseCategory } from '../../api/decisions'
import type {
  ComparisonAvailability,
  DashboardAttentionReason,
  DashboardSort,
  HistoryCoverageState,
} from '../../api/dashboard'
import type { PriceCoverageState } from '../../api/analytics'

export const historyCoverageLabels: Record<HistoryCoverageState, string> = {
  Complete: 'Tam tarixçə',
  Partial: 'Natamam tarixçə',
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
 * The sorts offered on the screen. Every one is a plain fact about the row, and the default is the object's
 * name, which asserts nothing about it.
 */
export const sortLabels: Record<DashboardSort, string> = {
  LocationName: 'Obyekt adı',
  CurrentKnownAmount: 'Cari məbləğ',
  KnownAmountDelta: 'Məbləğ fərqi',
  KnownAmountPercentChange: 'Dəyişmə %',
  MissingPriceItemCount: 'Qiymətsiz sətirlər',
  CurrentItemCount: 'Sətir sayı',
  NewVariantCount: 'Yeni məhsullar',
  IncreasedVariantCount: 'Artan məhsullar',
  DecreasedVariantCount: 'Azalan məhsullar',
  HistoryCoverage: 'Tarixçə',
}

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
  return value !== null && value in sortLabels
}

/** Shown beside a delta whenever either side of it is missing prices. */
export const partialAmountNote = 'Məbləğ müqayisəsi məlum qiymətlər üzrə hesablanıb.'

/**
 * A cause written the way a manager would say it out loud: with its direction in the words, so the sign beside
 * it confirms the reading rather than being the only clue to it.
 */
export function causeHeadline(category: CauseCategory, amount: number): string {
  switch (category) {
    case 'NewOrders':
      return 'Yeni sifarişlər'
    case 'QuantityChange':
      return amount >= 0 ? 'Miqdar artımı' : 'Miqdar azalması'
    case 'PriceChange':
      return amount >= 0 ? 'Qiymət artımı' : 'Qiymət azalması'
    case 'NoLongerOrdered':
      return 'Artıq sifariş olunmayanlar'
    case 'Services':
      return 'Xidmətlər'
    case 'InternalSupply':
      return 'Daxili təminat'
    case 'UnattributedDueToMissingPrice':
      return 'Qiymət məlumatı çatışmır'
  }
}

/** Why an object was surfaced. Said in the reader's terms, never as the enum name. */
export const attentionReasonLabels: Record<DashboardAttentionReason, string> = {
  LargestIncrease: 'Ən çox artan',
  LargestDecrease: 'Ən çox azalan',
  StrongPercentageChange: 'Nisbətdə böyük dəyişmə',
  MissingRequiredPrice: 'Qiymət məlumatı çatışmır',
  NoComparisonHistory: 'Müqayisə üçün əvvəlki ay yoxdur',
}

/**
 * What the "Məlumat vəziyyəti" column says — and, when everything is in order, it says nothing at all. A badge
 * that appears on every healthy row is noise a reader learns to skip, which is how the real ones get skipped too.
 */
export const noComparisonNote = 'Əvvəlki ay üçün məlumat yoxdur'
export const partialHistoryNote = 'Tarixçə natamamdır'
export const noCurrentRequestNote = 'Bu ay sifariş yoxdur'
export const incompleteExplanationNote = 'Məbləğin bir hissəsi izah edilə bilmir — qiymət məlumatı çatışmır'
export const noComparisonCause = 'Müqayisə üçün əvvəlki ay yoxdur'
export const detailsLabel = 'Detallara bax'
