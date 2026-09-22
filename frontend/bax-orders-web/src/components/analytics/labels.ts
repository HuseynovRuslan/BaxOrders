import type {
  AnalyticsComparisonBasis,
  AnalyticsKind,
  ComparisonState,
  PriceCoverageState,
  VariantIdentity,
} from '../../api/analytics'
import { formatAmount, formatNumber, formatPeriod, unitlessOrderUnitLabel } from '../imports/labels'

/** The three bases, worded the way the business asked for them. */
export const basisLabels: Record<AnalyticsComparisonBasis, string> = {
  PreviousMonth: 'Keçən ay',
  Previous3MonthAverage: 'Son 3 ayın ortalaması',
  Previous6MonthAverage: 'Son 6 ayın ortalaması',
}

export const basisOrder: AnalyticsComparisonBasis[] = [
  'PreviousMonth',
  'Previous3MonthAverage',
  'Previous6MonthAverage',
]

export function isBasis(value: string | null): value is AnalyticsComparisonBasis {
  return value !== null && (basisOrder as string[]).includes(value)
}

export const stateLabels: Record<ComparisonState, string> = {
  New: 'Yeni',
  NoLongerOrdered: 'Artıq sifariş olunmur',
  Increased: 'Artıb',
  Decreased: 'Azalıb',
  Unchanged: 'Dəyişməyib',
  NotComparable: 'Miqdar üzrə müqayisə edilmir',
  InsufficientHistory: 'Tarixçə kifayət deyil',
}

/** The states a material row can carry; a service is always NotComparable and lives in its own section. */
export const materialStates: ComparisonState[] = [
  'New',
  'Increased',
  'Decreased',
  'Unchanged',
  'NoLongerOrdered',
  'InsufficientHistory',
]

export function isState(value: string | null): value is ComparisonState {
  return value !== null && value in stateLabels
}

/**
 * Badge colours for the direction of a change, never for a verdict on it. Ordering more is not "good" and
 * ordering less is not "bad": this is descriptive analytics, so nothing here is green-for-good or red-for-bad.
 */
export const stateBadgeClass: Record<ComparisonState, string> = {
  New: 'bg-sky-50 text-sky-800 ring-sky-200',
  NoLongerOrdered: 'bg-slate-100 text-slate-700 ring-slate-300',
  Increased: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  Decreased: 'bg-violet-50 text-violet-800 ring-violet-200',
  Unchanged: 'bg-slate-50 text-slate-600 ring-slate-200',
  NotComparable: 'bg-slate-50 text-slate-600 ring-slate-200',
  InsufficientHistory: 'bg-amber-50 text-amber-900 ring-amber-200',
}

/** A short symbol so direction is never carried by colour alone. */
export const stateSign: Record<ComparisonState, string> = {
  New: '+',
  NoLongerOrdered: '−',
  Increased: '↑',
  Decreased: '↓',
  Unchanged: '=',
  NotComparable: '·',
  InsufficientHistory: '?',
}

export const kindLabels: Record<AnalyticsKind, string> = {
  QuantityComparable: 'Məhsullar',
  AmountOrientedService: 'Xidmətlər',
}

export const coverageLabels: Record<PriceCoverageState, string> = {
  Complete: 'Qiymət tam məlumdur',
  Partial: 'Qiymət qismən məlumdur',
  Unavailable: 'Qiymət yoxdur',
}

export const coverageBadgeClass: Record<PriceCoverageState, string> = {
  Complete: 'text-slate-500',
  Partial: 'text-amber-800',
  Unavailable: 'text-slate-500',
}

export const knownAmountLabel = 'Məlum qiymətlər üzrə'
export const weightedPriceLabel = 'Çəkili orta qiymət'
export const weightedPriceHint =
  'Çəkili orta qiymət miqdar nəzərə alınaraq hesablanır: 1 ədəd 10 ₼-dan və 9 ədəd 20 ₼-dan alınıbsa, çəkili orta qiymət 19 ₼-dır, 15 ₼ deyil.'

/** Nothing is computed here; a value the backend did not give is written as an em dash, never as 0. */
export const unknownValue = '—'

const percentFormat = new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 2 })

/** "+20%", "−15,5%", "−100%". Null stays an em dash: a percentage of nothing is not zero and not infinity. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return unknownValue
  }

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${percentFormat.format(Math.abs(value))}%`
}

/** A signed difference, in the same shape as the percentage beside it. */
export function formatDelta(value: number | null | undefined, format: (value: number) => string = formatNumber): string {
  if (value === null || value === undefined) {
    return unknownValue
  }

  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${format(Math.abs(value))}`
}

export function formatAnalyticsAmount(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : formatAmount(value)
}

/** A quantity as the backend gave it, without invented trailing zeros. Null (a service) is an em dash. */
export function formatAnalyticsQuantity(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : formatNumber(value)
}

/** A price to the precision prices are stored at, or an em dash when none is known. */
const priceFormat = new Intl.NumberFormat('az-Latn-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? unknownValue : `${priceFormat.format(value)} ₼`
}

/**
 * The variant under its product name: "120 sm · ədəd", "28 diş · ədəd", "Vahidsiz". Technical values never
 * reach the screen — no variant key, no null, no empty code.
 */
export function formatVariantLine(variant: VariantIdentity): string {
  const specification = variant.specificationValue?.trim()
  const suffix = variant.specificationDescriptor?.trim() || variant.specificationUnitCode?.trim()
  const parts = [
    specification ? (suffix ? `${specification} ${suffix}` : specification) : null,
    variant.modelCode?.trim() || null,
    variant.orderUnitCode?.trim() || unitlessOrderUnitLabel,
  ]

  return parts.filter((part): part is string => Boolean(part)).join(' · ')
}

/** "İyul 2026" — the period string is parsed as text, never through a local-time Date. */
export function formatAnalyticsPeriod(period: string): string {
  return formatPeriod(period)
}

/** "2 / 3 ay mövcuddur" — coverage is stated plainly, never hidden in a tooltip. */
export function formatCoverage(available: number, expected: number): string {
  return `${formatNumber(available)} / ${formatNumber(expected)} ay mövcuddur`
}

/** "2/3 ay əsasında" — what an average was actually built from, shown next to the baseline heading. */
export function formatBaselineBasisNote(available: number, expected: number): string {
  return `${formatNumber(available)}/${formatNumber(expected)} ay əsasında`
}
