import type {
  AnalyticsKind,
  ComparisonState,
  PriceCoverageState,
  VariantIdentity,
} from '../../api/analytics'
import { formatCount, formatMonth, formatMoney, formatQuantity, unknownValue } from './format'
import { unitlessOrderUnitLabel } from '../imports/labels'

// The shared formatting rules live in ./format and are re-exported here, so the analytics screens keep one
// behaviour for a null percentage, for money and for a month.
export {
  basisHints,
  basisLabels,
  basisNeedsRange,
  basisOrder,
  describeBasis,
  describeBasisCaption,
  describeBasisWithRange,
  describeDirection,
  formatDelta,
  formatMonth,
  formatMonthRange,
  formatMoneyDelta,
  formatPercent,
  formatPeriodCoverage,
  formatPrice,
  historyHint,
  isBasis,
  knownAmountHint,
  knownAmountLabel,
  signedToneClass,
  unknownValue,
  weightedPriceHint,
  weightedPriceLabel,
} from './format'

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

/** Money as the analytics screens write it. */
export function formatAnalyticsAmount(value: number | null | undefined): string {
  return formatMoney(value)
}

/** A quantity as the backend gave it; null (a service) is an em dash. */
export function formatAnalyticsQuantity(value: number | null | undefined): string {
  return formatQuantity(value)
}

/** "İyul 2026", parsed as text rather than through a local-time date. */
export function formatAnalyticsPeriod(period: string): string {
  return formatMonth(period)
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

/** "2 / 3 ay mövcuddur" — coverage is stated plainly, never hidden in a tooltip. */
export function formatCoverage(available: number, expected: number): string {
  return `${formatCount(available)} / ${formatCount(expected)} ay mövcuddur`
}

/** "2/3 ay əsasında" — what an average was actually built from, shown next to the baseline heading. */
export function formatBaselineBasisNote(available: number, expected: number): string {
  return `${formatCount(available)}/${formatCount(expected)} ay əsasında`
}

export { unknownValue as emDash }

// What an empty price cell means has exactly one home — src/pricing/labels — and these names are kept only
// so the analytics screens can go on importing from here. There is no second definition.
export {
  internalSupplyFullLabel as internalFreeSupplyLabel,
  internalSupplyHint,
  internalSupplyLabel,
  missingPriceLabel as noPriceLabel,
  unclassifiedHint as unresolvedPricingHint,
  unclassifiedLabel as unresolvedPricingLabel,
} from '../../pricing/labels'
