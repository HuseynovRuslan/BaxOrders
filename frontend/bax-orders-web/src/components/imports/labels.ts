import type { ImportStatus, IssueSeverity, IssueType, RowStatus } from '../../api/imports'
import type { BulkItemStatus, ResolutionKind, UnitType, UnresolvedStatus } from '../../api/review'
import { pricedLinesTotalLabel } from '../../terminology/terms'
import { unitWord } from '../../terminology/units'
import { azNumberFormat } from '../analytics/azNumber'
import { manatSuffix } from '../analytics/format'

export const importStatusLabels: Record<ImportStatus, string> = {
  Uploaded: 'Yükləndi',
  Parsing: 'Oxunur',
  Validating: 'Yoxlanılır',
  NeedsReview: 'Baxış tələb olunur',
  ReadyToImport: 'İdxala hazırdır',
  Imported: 'İdxal edildi',
  Failed: 'Uğursuz',
}

export const rowStatusLabels: Record<RowStatus, string> = {
  Pending: 'Gözləyir',
  Valid: 'Düzgün',
  NeedsReview: 'Xəbərdarlıq',
  Invalid: 'Xəta',
}

export const severityLabels: Record<IssueSeverity, string> = {
  Info: 'Məlumat',
  Warning: 'Xəbərdarlıq',
  Error: 'Xəta',
}

export const issueTypeLabels: Record<IssueType, string> = {
  UnknownProduct: 'Naməlum məhsul',
  UnknownProductVariant: 'Naməlum variant',
  UnknownSupplier: 'Naməlum təchizatçı',
  UnknownLocation: 'Naməlum obyekt',
  UnknownUnit: 'Naməlum vahid',
  UnknownCategory: 'Naməlum kateqoriya',
  UnknownResponsiblePerson: 'Naməlum cavabdeh şəxs',
  // True of all three silences the column can hold: no column at all, an empty cell, or a word nobody
  // can read. None of them says what the line is, and none of them is guessed at.
  UnknownOrderLineType: 'Sifariş növü oxunmadı',
  AmbiguousMatch: 'Qeyri-müəyyən uyğunluq',
  MissingRequiredValue: 'Məcburi dəyər yoxdur',
  InvalidQuantity: 'Yanlış miqdar',
  InvalidPrice: 'Yanlış qiymət',
  InvalidDate: 'Yanlış tarix',
  MissingPrice: 'Qiymət yoxdur',
  InvalidLineTotal: 'Yanlış cəm',
  LineTotalMismatch: 'Cəm uyğun gəlmir',
  // Informational only: identical lines can be legitimate.
  DuplicateRow: 'Mümkün təkrar',
  Other: 'Digər',
}

export const resolutionKindLabels: Record<ResolutionKind, string> = {
  Location: 'Obyektlər',
  Supplier: 'Təchizatçılar',
  ResponsiblePerson: 'Cavabdeh şəxslər',
  OrderUnit: 'Sifariş vahidləri',
  SpecificationUnit: 'Ölçü vahidləri',
  CategoryPath: 'Kateqoriyalar',
  Product: 'Məhsullar',
  ProductVariant: 'Variantlar',
}

/** Singular form, used inside dialogs. */
export const resolutionKindSingular: Record<ResolutionKind, string> = {
  Location: 'obyekt',
  Supplier: 'təchizatçı',
  ResponsiblePerson: 'cavabdeh şəxs',
  OrderUnit: 'sifariş vahidi',
  SpecificationUnit: 'ölçü vahidi',
  CategoryPath: 'kateqoriya',
  Product: 'məhsul',
  ProductVariant: 'variant',
}

export const bulkStatusLabels: Record<BulkItemStatus, string> = {
  Ready: 'Hazır',
  AlreadyResolved: 'Artıq həll olunub',
  DependencyBlocked: 'Asılılıq gözləyir',
  Conflict: 'Konflikt',
  NotFound: 'Tapılmadı',
}

export const unresolvedStatusLabels: Record<UnresolvedStatus, string> = {
  Unknown: 'Naməlum',
  Ambiguous: 'Qeyri-müəyyən',
  IncompletePath: 'Natamam yol',
}

export const unitTypeLabels: Record<UnitType, string> = {
  Count: 'Say',
  Length: 'Uzunluq',
  Area: 'Sahə',
  Mass: 'Kütlə',
  Volume: 'Həcm',
  Package: 'Qablaşdırma',
  Pair: 'Cüt',
  Other: 'Digər',
}

/** Excel header text of each logical column, used when the API reports missing columns. */
export const columnLabels: Record<string, string> = {
  SequenceNumber: '№',
  MainCategory: 'Ana kateqoriya',
  MiddleCategory: 'Orta kateqoriya',
  SubCategory: 'Alt kateqoriya',
  ProductName: 'Malın adı',
  SpecificationValue: 'Ölçü',
  SpecificationUnit: 'Vahid',
  ModelCode: 'Model/Kod',
  Quantity: 'Miqdarı',
  OrderUnit: 'Ö/v',
  UnitPrice: 'Qiyməti',
  LineTotal: 'Cəmi',
  Supplier: 'Şirkət',
  Location: 'Obyekt',
  RequestDate: 'Tarix',
  ResponsiblePerson: 'Cavabdeh şəxs',
}

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr']

/** "2026-03-01" → "Mart 2026" */
export function formatPeriod(isoDate: string): string {
  const [year, month] = isoDate.split('-')
  return `${monthNames[Number(month) - 1] ?? month} ${year}`
}

/** "2026-03-18" → "18.03.2026" */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

const numberFormat = azNumberFormat({ maximumFractionDigits: 4 })

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** How a line the review accepted as having no order unit is shown. Never "null" or a technical code. */
export const unitlessOrderUnitLabel = 'Vahidsiz'

/**
 * The specification of a variant as one phrase: the value with its unit ("50 sm") or, when the "Vahid" cell
 * holds a word that is not a unit, with that descriptor ("28 diş", "2 qat").
 */
export function formatSpecification(
  value: string | null | undefined,
  unitLabel: string | null | undefined,
  descriptor: string | null | undefined,
): string | null {
  const specification = value?.trim()
  if (!specification) return null

  const suffix = descriptor?.trim() || unitLabel?.trim()
  return suffix ? `${specification} ${suffix}` : specification
}

/** The whole variant on one line: "48 mm · A-12 · ədəd", "28 diş · ədəd", "Vahidsiz". */
export function formatVariantSummary(variant: {
  specificationValue?: string | null
  specificationUnitLabel?: string | null
  specificationDescriptor?: string | null
  modelCode?: string | null
  orderUnitLabel?: string | null
}): string {
  const parts = [
    formatSpecification(variant.specificationValue, variant.specificationUnitLabel, variant.specificationDescriptor),
    variant.modelCode?.trim() || null,
    variant.orderUnitLabel?.trim() || unitlessOrderUnitLabel,
  ]
  return parts.filter((part): part is string => Boolean(part)).join(' · ')
}

// ---- permanent orders -------------------------------------------------------------------------------

export const orderStatusLabels: Record<string, string> = {
  Draft: 'Təsdiqlənməyib',
  PendingApproval: 'Təsdiq gözləyir',
  Approved: 'Təsdiqlənib',
  ReturnedForCorrection: 'Düzəliş tələb olunur',
}

/** What a line with no price says. One convention everywhere, never a zero. */
export const noPriceLabel = 'Qiymət yoxdur'

/** What an item with no resolved supplier says. */
export const unknownSupplierLabel = 'Məlum deyil'

/** Money the system can actually account for, as opposed to a complete total. */
export const knownAmountLabel = pricedLinesTotalLabel

const currencyFormat = azNumberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Formats a decimal the backend already calculated. Nothing is added up in the browser. */
export function formatAmount(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${currencyFormat.format(value)}${manatSuffix}`
}

/** Quantities keep their own precision; they are counts, not money. */
export function formatQuantity(value: number): string {
  return formatNumber(value)
}

/**
 * The specification of one line: the value with its unit ("120 sm"), or with the word that describes it when
 * the "Vahid" cell held no unit at all ("28 diş").
 */
export function formatItemSpecification(item: {
  specificationValue: string | null
  specificationUnitName?: string | null
  specificationUnitCode?: string | null
  specificationDescriptor: string | null
}): string | null {
  const value = item.specificationValue?.trim()
  if (!value) return null

  const suffix = item.specificationDescriptor?.trim()
    || unitWord(item.specificationUnitCode, item.specificationUnitName)
  return suffix ? `${value} ${suffix}` : value
}

/** The order unit of a line in words ("ədəd", "kisə"), or the word for a line that legitimately has none. */
export function formatOrderUnit(orderUnitCode: string | null, orderUnitName?: string | null): string {
  return unitWord(orderUnitCode, orderUnitName) ?? unitlessOrderUnitLabel
}
