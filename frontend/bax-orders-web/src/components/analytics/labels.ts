import type { ComparisonState, VariantIdentity } from '../../api/analytics'
import { formatMonth, formatMoney, unknownValue } from './format'
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
  unknownValue,
  weightedPriceHint,
  weightedPriceLabel,
} from './format'

/** What a group of products is called — in the counts and the notes. */
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
 * chip above it "Yeni məhsullar".
 */
export const stateBadgeLabels: Record<ComparisonState, string> = {
  ...stateLabels,
  New: 'Yeni',
  NoLongerOrdered: 'Bu ay yazılmayıb',
}

/** Money as the analytics screens write it. */
export function formatAnalyticsAmount(value: number | null | undefined): string {
  return formatMoney(value)
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
