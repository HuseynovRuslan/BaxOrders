import type { EditedLine, EditedSupplier, OrderEditAction, OrderEditEvent } from '../../../api/revisions'
import { formatAmount, formatQuantity, noPriceLabel, unknownSupplierLabel } from '../../imports/labels'
import { orderLineTypeLabels, type OrderLineType } from '../../../orderLines/lineType'
import { noResponsiblePersonLabel, responsiblePersonLabel } from '../../../orderLines/responsibility'

export const createRevisionLabel = 'Düzəliş versiyası yarat'
export const createNextRevisionLabel = 'Yeni düzəliş versiyası yarat'
export const openRevisionLabel = 'Düzəldilmiş sifarişə bax'

/** Said before anything is created, because "correct" could be read as "change what was reviewed". */
export const createRevisionExplanation =
  'Köhnə versiya dəyişdirilməyəcək. Yeni, təsdiqlənməmiş versiya yaradılacaq.'

export const editLineLabel = 'Redaktə et'
export const addLineLabel = 'Sətir əlavə et'
export const removeLineLabel = 'Sil'

/** Said before a line is taken out, because "delete" reads as heavier than it is. */
export const removeLineExplanation =
  'Bu sətir yalnız cari, təsdiqlənməmiş versiyadan silinəcək. Əvvəlki versiya dəyişməyəcək.'

/** What a screen says when somebody else got there first. The answer is to reload, never to overwrite. */
export const staleDataMessage = 'Məlumat bu vaxt ərzində dəyişib. Səhifə yeniləndi.'

export const ownContributionBlockedNote =
  'Bu sifarişdə düzəliş etdiyiniz üçün onu özünüz təsdiqləyə bilməzsiniz.'

export const manualItemSourceNote = 'Əl ilə əlavə edilib — Excel mənbəsi yoxdur.'

export const editHistoryTitle = 'Düzəliş tarixçəsi'
export const workflowHistoryTitle = 'Təsdiq prosesi'

export const revisionErrors = {
  quantityRequired: 'Miqdar sıfırdan böyük olmalıdır.',
  priceNegative: 'Qiymət mənfi ola bilməz.',
  variantRequired: 'Məhsul variantı seçilməlidir.',
  unknown: 'Əməliyyat yerinə yetirilmədi.',
} as const

export const editActionLabels: Record<OrderEditAction, string> = {
  RevisionCreated: 'Düzəldilmiş sifariş yaradıldı',
  ItemQuantityChanged: 'Miqdar dəyişdirildi',
  ItemPriceChanged: 'Qiymət dəyişdirildi',
  ItemSupplierChanged: 'Təchizatçı dəyişdirildi',
  ItemOrderLineTypeChanged: 'Sifariş növü dəyişdirildi',
  ItemResponsiblePersonChanged: 'Cavabdeh dəyişdirildi',
  ItemAdded: 'Sətir əlavə edildi',
  ItemRemoved: 'Sətir silindi',
}

/** A colour and a word, so the kind of change never rests on colour alone. */
export const editActionClass: Record<OrderEditAction, string> = {
  RevisionCreated: 'bg-slate-100 text-slate-700',
  ItemQuantityChanged: 'bg-sky-100 text-sky-800',
  ItemPriceChanged: 'bg-sky-100 text-sky-800',
  ItemSupplierChanged: 'bg-sky-100 text-sky-800',
  ItemOrderLineTypeChanged: 'bg-sky-100 text-sky-800',
  ItemResponsiblePersonChanged: 'bg-sky-100 text-sky-800',
  ItemAdded: 'bg-emerald-100 text-emerald-800',
  ItemRemoved: 'bg-amber-100 text-amber-800',
}

const changedFieldLabels: Record<string, string> = {
  Quantity: 'Miqdar',
  UnitPrice: 'Qiymət',
  Supplier: 'Təchizatçı',
  OrderLineType: 'Növ',
  ResponsiblePerson: responsiblePersonLabel,
}

function isSupplier(value: unknown): value is EditedSupplier {
  return typeof value === 'object' && value !== null && 'name' in value && !('quantity' in value)
}

function isLine(value: unknown): value is EditedLine {
  return typeof value === 'object' && value !== null && 'quantity' in value
}

/**
 * One side of a change, as the history recorded it.
 * <para>
 * The stored value is read, never recomputed from what the line says now: the whole point of the history is
 * that it still says what was true then. An absent value is the word for it — a price nobody knew, or no
 * supplier — and never a zero.
 * </para>
 */
export function formatEditValue(
  value: number | string | EditedSupplier | EditedLine | null,
  field: string | null,
): string {
  // A person and a supplier are both stored as {id, name}; either way the name is what a reader needs.
  if (isSupplier(value)) {
    return value.name
  }

  // The classification is stored by name, so the history keeps reading correctly if the enum ever moves.
  if (typeof value === 'string') {
    return orderLineTypeLabels[value as OrderLineType] ?? value
  }

  if (isLine(value)) {
    const price = value.unitPrice === null ? noPriceLabel : formatAmount(value.unitPrice)
    return `${formatQuantity(value.quantity)} · ${price} · ${value.supplierName ?? unknownSupplierLabel}`
  }

  if (value === null) {
    if (field === 'Supplier') {
      return unknownSupplierLabel
    }

    // "Nobody recorded" is a real answer for a line, and reads nothing like a missing price.
    if (field === 'ResponsiblePerson') {
      return noResponsiblePersonLabel
    }

    return noPriceLabel
  }

  return field === 'UnitPrice' ? formatAmount(value) : formatQuantity(value)
}

/** "Miqdar: 10 → 12,5", or the line an add or a remove is about. */
export function describeEdit(entry: OrderEditEvent): string | null {
  if (entry.action === 'RevisionCreated') {
    return null
  }

  if (entry.field) {
    const label = changedFieldLabels[entry.field] ?? entry.field
    return `${label}: ${formatEditValue(entry.oldValue, entry.field)} → ${formatEditValue(entry.newValue, entry.field)}`
  }

  const line = entry.action === 'ItemAdded' ? entry.newValue : entry.oldValue
  return isLine(line) ? formatEditValue(line, null) : null
}

/** "22.09.2026 14:32" from a UTC instant, written in the reader's own time. */
export function formatEditMoment(utc: string): string {
  const moment = new Date(utc)
  if (Number.isNaN(moment.getTime())) {
    return utc
  }

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(moment.getDate())}.${pad(moment.getMonth() + 1)}.${moment.getFullYear()} ${pad(moment.getHours())}:${pad(moment.getMinutes())}`
}
