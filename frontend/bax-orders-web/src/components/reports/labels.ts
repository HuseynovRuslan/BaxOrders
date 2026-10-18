import { formatCount } from '../analytics/format'
import { workflowStatusSign } from '../workflow/labels'

/**
 * The monthly report's own words (UI V2 «Aylıq hesabat»). The words it shares with other screens stay where they are
 * defined — the scopes in `analytics/scope`, the kinds of line in `orderLines/lineType`, the price words in
 * `pricing/labels`, the report's legend and totals in `terminology/terms`. The sentences marked new in the approved
 * design (03-ux.md, «[Yeni mətn]»; owner decision D-51) are written here once.
 */

/** The filter row's visible labels. They are also the controls' accessible names. */
export const yearFilterLabel = 'İl'
export const searchFilterLabel = 'Obyekt axtar'
export const searchPlaceholder = 'Obyekt adı…'
export const scopeFilterLabel = 'Sifariş növü'
export const viewFilterLabel = 'Baxış'

/** Said wherever an answer is on its way. */
export const loadingLabel = 'Yüklənir…'

/** Under the filters while a search is narrowing the objects: "1 / 27 obyekt". */
export function resultCountLabel(filtered: number, total: number): string {
  return `${formatCount(filtered)} / ${formatCount(total)} obyekt`
}

export const noMatchingLocationsLabel = 'Axtarışa uyğun obyekt tapılmadı.'

/** «Sıfırla» puts the address back to how the report opens; the year is a different question and stays (03 §3.2). */
export const resetFiltersLabel = 'Sıfırla'
export const resetFiltersHint = 'Axtarışı, sifariş növünü, baxışı və sıralamanı ilkin vəziyyətə qaytarır.'

/**
 * Beside the year's figures while a search is on (owner decision D-51, S-1 = A): the figures are every object's,
 * whatever the search left in the table.
 */
export const searchKeepsTotalsNote = 'Bütün obyektlər üzrə — axtarış bu rəqəmləri dəyişmir.'

/**
 * Always under the year's figures (owner decision D-51, S-4): the report counts the latest order of every object and
 * month whatever its status, so an order nobody has approved is in the figures too. No number in it on purpose.
 * The sign is the product's own for an order awaiting approval.
 */
export const unapprovedOrdersIncludedNote =
  `Təsdiqlənməmiş sifarişlər də daxildir; təsdiq gözləyənlər cədvəldə ${workflowStatusSign.PendingApproval} ilə işarələnib.`

/** «Ümumi faktiki xərc» could not be read from the server. Nothing is put in its place — never a sum. */
export const combinedSpendFailedNote = 'Ümumi faktiki xərc alınmadı.'
export const retryLabel = 'Yenidən cəhd et'

// ---- the table (UI V2, phase C) ------------------------------------------------------------------------

/**
 * The table's name, on the screen above it (DK-23) — the words the page's header used to say under its title and the
 * table's hidden caption said to a screen reader (DK-15).
 */
export const reportTableTitle = 'Obyektlər üzrə aylıq sifariş məbləğləri'

/** The two columns a reader can order the table by. */
export const locationColumnLabel = 'Obyekt'

/** The year's own column, named so it cannot be mistaken for a thirteenth month. */
export const yearTotalLabel = 'İl cəmi'

/** The control that orders the cards, below the width the table's own headers are pressed at (03 §6.4). */
export const sortFilterLabel = 'Sıralama'

/** The buttons that move the table's months a page at a time while it scrolls in its box (03 §4.3). */
export const previousMonthsLabel = 'Əvvəlki aylar'
export const nextMonthsLabel = 'Sonrakı aylar'

/** A year the system has no order for at all (03 §7) — not a search that found nothing. */
export const noOrdersThisYearLabel = 'Bu il üçün sistemdə sifariş yoxdur.'

// ---- a month's details, under its row (UI V2, phase D — 03 §6.9, 03a) -------------------------------------------

/** The details' close control, in the dashboard's words for its own in-place details. */
export const closeDetailsLabel = 'Detalları bağla'
export const closeLabel = 'Bağla'

/** The second comparison, by its full name (03 §6.9.4, M-04) — never side by side with the first without it. */
export const recentAverageComparisonLabel = 'Əvvəlki 3 mövcud ayın ortalamasına görə'

export function previousMonthAmountLabel(amount: string): string {
  return `Keçən ay: ${amount}`
}

export function recentAverageAmountLabel(amount: string): string {
  return `Əvvəlki 3 mövcud ayın ortalaması: ${amount}`
}

/** The unusual month's box: its name, then why (`unusualMonthHint`, said as a sentence). */
export const unusualMonthLabel = 'Qeyri-adi ay'

/** The month has no line of the scope being read (03 §6.9.3). */
export const noLinesOfScopeLabel = 'Bu növdə sətir yoxdur.'

/** The order the month is, and its lines (03 §6.9.6). */
export const orderSectionLabel = 'Sifariş'
export const wholeOrderAmountLabel = 'Bütün sifarişin məbləği'
export const linesSectionLabel = 'Sətirlər'
export const allLinesLabel = 'Bütün sətirlər'
export const pricedLinesLabel = 'Qiyməti olan sətirlər'
export const noLinesInOrderLabel = 'Bu sifarişdə sətir yoxdur.'
export const noMatchingLinesLabel = 'Axtarışa uyğun sətir tapılmadı.'
export const loadingLinesLabel = 'Sətirlər yüklənir'
export const previousPageLabel = 'Əvvəlki'
export const nextPageLabel = 'Növbəti'

export function linesPageLabel(page: number, pages: number, total: number): string {
  return `Səhifə ${page} / ${pages} · ${formatCount(total)} sətir`
}

/** The object's whole history of orders (03 §6.9.7). */
export const locationOrdersLabel = 'Obyektin sifarişləri'
