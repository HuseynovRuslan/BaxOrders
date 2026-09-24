import type { CauseCategory } from '../../api/decisions'
import { missingPriceShortLabel } from '../../pricing/labels'

/**
 * What each category is called where money is shown beside it.
 *
 * "Miqdar dəyişməsi" read as though the manat figure next to it were a quantity. It is not: it is the share of
 * the money difference that ordering more or less accounts for, so it is named as an effect on money.
 */
export const causeLabels: Record<CauseCategory, string> = {
  NewOrders: 'Yeni sifarişlər',
  QuantityChange: 'Miqdar təsiri',
  PriceChange: 'Qiymət təsiri',
  NoLongerOrdered: 'Artıq sifariş olunmayanlar',
  Services: 'Xidmətlər',
  InternalSupply: 'Daxili təminat',
  UnattributedDueToMissingPrice: 'Qiyməti olmayanlar',
}

/**
 * One line each, said where the figure is — not in a tooltip somebody has to find.
 */
export const causeHints: Record<CauseCategory, string> = {
  NewOrders: 'Keçən ay sifariş olunmayan, bu ay sifariş olunan məhsullar.',
  QuantityChange: 'Eyni məhsuldan daha çox və ya daha az sifariş olunması — keçən ayın qiyməti ilə hesablanır.',
  PriceChange: 'Eyni miqdarın qiymətinin dəyişməsi.',
  NoLongerOrdered: 'Keçən ay sifariş olunan, bu ay sifariş olunmayan məhsullar.',
  Services: 'Xidmətlər miqdar üzrə deyil, yalnız məbləğ üzrə müqayisə olunur.',
  InternalSupply:
    'Daxili anbardan verilən material üçün alış qiyməti tələb olunmur, ona görə dəyişikliyin səbəbi miqdara və ya qiymətə ayrılmır.',
  UnattributedDueToMissingPrice: 'Qiyməti tam bilinmədiyi üçün səbəbi miqdara və qiymətə ayrıla bilməyən məbləğ.',
}

/**
 * Colour says which kind of cause this is, never whether it is good news. Ordering more is not a failure and
 * ordering less is not a success, so nothing here is green or red — the one amber is a data gap, which is a
 * fact about the records rather than about the spending.
 */
export const causeToneClass: Record<CauseCategory, string> = {
  NewOrders: 'bg-sky-50 text-sky-900 ring-sky-200',
  QuantityChange: 'bg-indigo-50 text-indigo-900 ring-indigo-200',
  PriceChange: 'bg-violet-50 text-violet-900 ring-violet-200',
  NoLongerOrdered: 'bg-slate-100 text-slate-700 ring-slate-300',
  Services: 'bg-slate-50 text-slate-700 ring-slate-200',
  // Slate, never amber: this is how some material arrives, not something anybody has to put right.
  InternalSupply: 'bg-slate-100 text-slate-700 ring-slate-300',
  UnattributedDueToMissingPrice: 'bg-amber-50 text-amber-900 ring-amber-200',
}

/** The order a reader should meet them, matching the one the backend returns. */
export const causeOrder: CauseCategory[] = [
  'NewOrders',
  'QuantityChange',
  'PriceChange',
  'NoLongerOrdered',
  'Services',
  'InternalSupply',
  'UnattributedDueToMissingPrice',
]

export type DriverFilter = 'All' | 'PriceChange' | 'QuantityChange' | 'NewOrders' | 'NoLongerOrdered' | 'MissingPrice'

export const driverFilterLabels: Record<DriverFilter, string> = {
  All: 'Hamısı',
  PriceChange: 'Qiymət dəyişən',
  QuantityChange: 'Miqdar dəyişən',
  NewOrders: 'Yeni',
  NoLongerOrdered: 'Artıq sifariş olunmur',
  MissingPrice: missingPriceShortLabel,
}

export const driverFilterOrder: DriverFilter[] = [
  'All',
  'PriceChange',
  'QuantityChange',
  'NewOrders',
  'NoLongerOrdered',
  'MissingPrice',
]

/** Said on a product the company paid for in one month and supplied itself in the other. */
export const supplyChangedDriverNote = 'Təchizat forması dəyişib: alınan / şirkətdaxili'

/**
 * Said when the chosen window holds no order at all.
 *
 * Not "keçən ay yoxdur": the reader may have chosen any window, and the honest statement is about the window
 * they chose. Nothing is compared against zero and no other basis is quietly substituted.
 */
export const emptyWindowNote = 'Seçilmiş dövrdə müqayisə üçün sifariş yoxdur'

/** How the average treats a month the object never ordered in. Said wherever an average is shown. */
export const averagingHint =
  'Ortalama yalnız sifariş olan aylar üzrə hesablanır: obyektin sifarişi olmayan ay sıfır sayılmır və bölənə daxil edilmir.'

export const coverageHint =
  'Bazanın əhatə etdiyi aylardan yalnız bir hissəsində bu obyektin sifarişi var. Ortalama həmin mövcud aylara bölünür.'

export const noPreviousMonthNote = 'Keçən ay üçün müqayisə məlumatı yoxdur.'

export const incompleteExplanationNote =
  'Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir.'
