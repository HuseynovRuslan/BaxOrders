import type { ProductMatchKind, ProductMatchOutcome, ProductMatchSide, ProductMatchUsage } from '../../../api/productMatches'
import {
  matchApprovedLabel,
  matchRejectedLabel,
  sameItemExplanation,
  sameItemKindLabel,
  variantExplanation,
  variantKindLabel,
} from '../../../terminology/terms'
import { unitWord } from '../../../terminology/units'
import { formatCount, formatMonthRange } from '../../analytics/format'
import { unitlessOrderUnitLabel } from '../../imports/labels'

/**
 * The Products page's own wording. The words other screens share — the two kinds, the three differences, the
 * outcomes and the two explanations — are in `terminology/terms`.
 */

export type ProductsTab = 'suggestions' | 'families' | 'decisions'

export const tabLabels: Record<ProductsTab, string> = {
  suggestions: 'Təkliflər',
  families: 'Məhsullar və variantlar',
  decisions: 'Qərarlar',
}

export const tabOrder: ProductsTab[] = ['suggestions', 'families', 'decisions']

export function isTab(value: string | null): value is ProductsTab {
  return value !== null && value in tabLabels
}

export const kindLabels: Record<ProductMatchKind, string> = {
  SameItem: sameItemKindLabel,
  Variant: variantKindLabel,
}

export const kindExplanations: Record<ProductMatchKind, string> = {
  SameItem: sameItemExplanation,
  Variant: variantExplanation,
}

export const kindOrder: ProductMatchKind[] = ['SameItem', 'Variant']

export function isKind(value: string | null): value is ProductMatchKind {
  return value !== null && value in kindLabels
}

export const outcomeLabels: Record<ProductMatchOutcome, string> = {
  Approved: matchApprovedLabel,
  Rejected: matchRejectedLabel,
}

export const approveLabel = 'Təsdiqlə'
export const rejectLabel = 'Rədd et'
export const undoLabel = 'Geri al'

/** Said instead of the buttons to everybody who may read the suggestions but not decide them (13.2). */
export const readOnlyNote = 'Təklifləri yalnız administrator təsdiqləyir və ya rədd edir.'

/** The approval dialog's question for a spelling pair. The suggestion's own choice is preselected. */
export const keepWhichQuestion = 'Hansı yazılış saxlanılsın?'

export const familiesNote =
  'Variantlar ayrı məhsul kimi qalır; burada yalnız hansı əsas məhsula aid olduqları göstərilir.'

export const noFamiliesText = 'Hələ heç bir variant əlaqəsi təsdiqlənməyib.'

export const undoQuestion =
  'Bu qərar geri alınsın? Cüt yenidən təklif kimi görünəcək; yazılış uyğunluğu idisə, hesabatlar əvvəlki kimi iki mal göstərəcək.'

export const includeUndoneLabel = 'Geri alınanları da göstər'

/** The label a variant link is shown under, as the domain allows it. */
export const variantLabelMaxLength = 100

/** A decision's reason, as the domain allows it. */
export const reasonMaxLength = 500

/** "«Lampa 15 W» / «Lampa 15W» rədd edildi." — the line above the list after a one-click rejection. */
export function rejectedNotice(source: string, target: string): string {
  return `«${source}» / «${target}» rədd edildi.`
}

/**
 * "15 W · ədəd" — a spelling side's variant in words: the specification with its unit or descriptor, the model code
 * where there is one, and the order unit as a word. A spelling match is about exactly these, so they are shown; the
 * product code is not (05b).
 */
export function describeSide(side: ProductMatchSide): string {
  const value = side.specificationValue?.trim()
  const suffix = side.specificationDescriptor?.trim() || unitWord(side.specificationUnitCode)
  const specification = value ? (suffix ? `${value} ${suffix}` : value) : null
  const unit = unitWord(side.orderUnitCode) ?? unitlessOrderUnitLabel
  return [specification, side.modelCode?.trim() || null, unit]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}

/** How the server spells "no order unit" inside a variant description. */
const serverUnitless = 'vahidsiz'

/**
 * A decision's variant description as a reader says it. The server writes it as "15 W · PCS" — specification, model
 * code where there is one, and the order unit as a catalogue code, always last. The order unit, and a unit code
 * straight after a number, become words ("15 W · ədəd", "5 litr · ədəd"); everything else is kept as written.
 */
export function readableVariantDescription(description: string): string {
  const parts = description.split(' · ')
  const orderUnit = parts.pop() ?? ''
  const unit = orderUnit === serverUnitless ? unitlessOrderUnitLabel : unitWord(orderUnit) ?? orderUnit
  const rest = parts.map((part) =>
    part.replace(/^(\S*\d\S*)\s+(\S+)$/, (_, value: string, code: string) => `${value} ${unitWord(code) ?? code}`))
  return [...rest, unit].filter((part) => part.length > 0).join(' · ')
}

/** "3 sətir · 1 obyekt · Aprel–İyul 2026" — where a product was ordered. */
export function describeUsage(usage: ProductMatchUsage | null | undefined): string {
  if (!usage) {
    return 'Sifarişlərdə yoxdur'
  }

  const months = formatMonthRange([usage.firstMonth, usage.lastMonth])
  return [`${formatCount(usage.lineCount)} sətir`, `${formatCount(usage.locationCount)} obyekt`, months]
    .filter((part): part is string => Boolean(part))
    .join(' · ')
}

/** The same, for a suggestion's side, which carries its usage flat. */
export function describeSideUsage(side: ProductMatchSide): string {
  return describeUsage({
    lineCount: side.lineCount,
    locationCount: side.locationCount,
    firstMonth: side.firstMonth,
    lastMonth: side.lastMonth,
  })
}
