import type {
  AnalyticsKind,
  ComparisonState,
  PriceCoverageState,
  VariantIdentity,
} from '../../api/analytics'
import { formatCount, formatMonth, formatMoney, formatQuantity, unknownValue } from './format'
import { unitlessOrderUnitLabel } from '../imports/labels'
import { newProductsLabel, notOrderedThisMonthLabel } from '../../terminology/terms'
import { unitWord } from '../../terminology/units'

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

/** What a group of products is called — in the filter, the counts and the notice. */
export const stateLabels: Record<ComparisonState, string> = {
  New: newProductsLabel,
  NoLongerOrdered: notOrderedThisMonthLabel,
  Increased: 'Artıb',
  Decreased: 'Azalıb',
  Unchanged: 'Dəyişməyib',
  NotComparable: 'Miqdar üzrə müqayisə edilmir',
  InsufficientHistory: 'Tarixçə kifayət deyil',
}

/**
 * The same states on one product's row, where the plural of a list would read wrong: the row says "Yeni", the
 * filter above it "Yeni məhsullar".
 */
export const stateBadgeLabels: Record<ComparisonState, string> = {
  ...stateLabels,
  New: 'Yeni',
  NoLongerOrdered: 'Bu ay yazılmayıb',
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
 * The variant with every identifying field, model code and bare specification included: "120 sm · M-101 · ədəd".
 * Kept for screens where those codes are the thing being worked on; the manager's screens use describeVariant.
 * No variant key, no null, no empty code, and no unit code where a unit word exists.
 */
export function formatVariantLine(variant: VariantIdentity): string {
  const specification = variant.specificationValue?.trim()
  const suffix = variant.specificationDescriptor?.trim()
    || unitWord(variant.specificationUnitCode, variant.specificationUnitName)
  const parts = [
    specification ? (suffix ? `${specification} ${suffix}` : specification) : null,
    variant.modelCode?.trim() || null,
    unitWord(variant.orderUnitCode, variant.orderUnitName) ?? unitlessOrderUnitLabel,
  ]

  return parts.filter((part): part is string => Boolean(part)).join(' · ')
}

/** The parts of a variant the manager's screens describe it by. An order line carries the same fields. */
export type VariantDescription = Pick<
  VariantIdentity,
  | 'specificationValue'
  | 'specificationUnitCode'
  | 'specificationUnitName'
  | 'specificationDescriptor'
  | 'modelCode'
  | 'orderUnitCode'
  | 'orderUnitName'
>

/**
 * The specification when it says what it measures: "5 litr", "50 kq", "28 diş". A value with neither a unit nor
 * a descriptor ("2.8") says nothing to a manager, and is not shown.
 */
export function describeSpecification(variant: VariantDescription): string | null {
  const value = variant.specificationValue?.trim()
  const suffix = variant.specificationDescriptor?.trim()
    || unitWord(variant.specificationUnitCode, variant.specificationUnitName)
  return value && suffix ? `${value} ${suffix}` : null
}

/** "5 litr · ədəd", "28 diş · ədəd", "ədəd", "Vahidsiz" — no product code, no model code, no bare number. */
export function describeVariant(variant: VariantDescription): string {
  const unit = unitWord(variant.orderUnitCode, variant.orderUnitName) ?? unitlessOrderUnitLabel
  return [describeSpecification(variant), unit].filter((part): part is string => Boolean(part)).join(' · ')
}

/** What describeVariant leaves out: the model code if there is one, else a specification value with no unit. */
function hiddenDetail(variant: VariantDescription): string | null {
  return variant.modelCode?.trim()
    || (describeSpecification(variant) === null ? variant.specificationValue?.trim() : null)
    || null
}

/**
 * For each row of one rendered list, the detail that tells it apart, or null.
 *
 * Hiding the model code can make two rows read identically — the same product name over the same description.
 * Those rows, and only those, get back what was hidden; every other row shows no code at all.
 */
export function distinguishingDetails(rows: Array<VariantDescription & { productName: string }>): Array<string | null> {
  const keys = rows.map((row) => JSON.stringify([row.productName, describeVariant(row)]))
  const counts = new Map<string, number>()
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return rows.map((row, index) => ((counts.get(keys[index]) ?? 0) > 1 ? hiddenDetail(row) : null))
}

/** The line under each product name in one list: describeVariant, and the distinguishing detail where needed. */
export function distinguishVariants(rows: Array<VariantDescription & { productName: string }>): string[] {
  const details = distinguishingDetails(rows)
  return rows.map((row, index) => {
    const detail = details[index]
    return detail ? `${describeVariant(row)} · ${detail}` : describeVariant(row)
  })
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
