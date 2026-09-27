/**
 * What kind of demand an order line was, and the one place the app names it.
 *
 * The business runs two kinds of demand through the same order. Most lines are the month's planned material;
 * some are asked for on top of it because something broke or an event needed material nobody planned for. The
 * two are budgeted and compared separately, which is the whole reason the distinction is stored at all — a
 * one-off purchase compared against a month that did not have one reads as a rise in demand when it is
 * nothing of the kind.
 *
 * One request routinely holds both kinds, so this is a fact about the line, never about the order.
 *
 * The price words live in `src/pricing/labels`, the object-group words in `src/coverage/labels`, and the rest
 * of the shared terms in `src/terminology/terms`. This module owns these three and nothing else.
 */

/** The mirror of `BaxOrders.Domain.Orders.OrderLineType`. */
export type OrderLineType = 'Unclassified' | 'Monthly' | 'OutsideMonthly'

/**
 * What each kind is called on screen.
 *
 * "Aylıqdan Kənar sifarişlər" is the plural the owner named it by, and it stays that way in headings and
 * filters where it names a group of lines. On a single line's badge the short form reads better and says the
 * same thing, which is what {@link orderLineTypeBadge} is for.
 */
export const orderLineTypeLabels: Record<OrderLineType, string> = {
  Monthly: 'Aylıq sifariş',
  OutsideMonthly: 'Aylıqdan Kənar sifarişlər',
  Unclassified: 'Təsnif edilməyib',
}

/** The same three, shortened for a badge sitting beside a product name. */
export const orderLineTypeBadge: Record<OrderLineType, string> = {
  Monthly: 'Aylıq',
  OutsideMonthly: 'Aylıqdan kənar',
  Unclassified: 'Təsnif edilməyib',
}

/**
 * How each kind is drawn.
 *
 * Deliberately quiet. The classification is context for a line, not its headline: the product, the quantity
 * and the money are what a manager reads first, and a loud chip beside every row would compete with them.
 * Monthly — the ordinary case — is the quietest of the three, because a badge on almost every line that
 * shouts is a badge nobody reads.
 */
export const orderLineTypeToneClass: Record<OrderLineType, string> = {
  Monthly: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700',
  OutsideMonthly: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900',
  Unclassified: 'bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700',
}

/** The order the three are listed in: the ordinary case first, the absence of an answer last. */
export const orderLineTypesInOrder: readonly OrderLineType[] = ['Monthly', 'OutsideMonthly', 'Unclassified']

/**
 * The two a person may choose.
 *
 * "Təsnif edilməyib" is a system state — what a line says before anybody has looked at it — not a third
 * answer. It stays selectable only where a line already carries it, so that somebody who no longer stands
 * behind a classification can say so rather than pick the less wrong of two.
 */
export const selectableOrderLineTypes: readonly OrderLineType[] = ['Monthly', 'OutsideMonthly']

/** "51 sətir təsnif edilməyib" — the neutral note, never an error. */
export function unclassifiedLinesNote(count: number): string {
  return `${count} sətir təsnif edilməyib`
}

/** "Aylıq sifarişlər üzrə müqayisə" — what the comparison on this page is actually about. */
export const monthlyComparisonScopeLabel = 'Aylıq sifarişlər üzrə müqayisə'

/** The heading of the month's money, split by kind. */
export const monthlyOrdersLabel = 'Aylıq sifarişlər'
export const outsideMonthlyOrdersLabel = 'Aylıqdan Kənar sifarişlər'

/**
 * What an import calls a line whose «Növ» cell says nothing it can read.
 *
 * Deliberately not «Təsnif edilməyib», which the price classification already owns: on the confirmation screen
 * both counts sit in one grid, and two different facts must not share a word. This one names the column, because
 * that is where the silence is.
 */
export const unclassifiedLineTypeShortLabel = 'Növü göstərilməyib'

/** What the operator is told before confirming an import that carries such rows. */
export function unclassifiedLineTypeBeforeImportNote(
  unclassified: number,
  monthly: number,
  outsideMonthly: number,
): string {
  return (
    `${unclassified} sətrin «Növ» sütunu boşdur və ya oxunmur; həmin sətirlər təsnif edilməmiş idxal olunacaq. ` +
    `Bu idxalda ${monthly} aylıq, ${outsideMonthly} aylıqdan kənar sətir var.`
  )
}

/** Said beside the note: the classification is a line-level fact and is changed on the order, not guessed here. */
export const classifyLinesAfterImportHint =
  'Təsnifat sətir səviyyəsindədir: idxaldan sonra sifariş səhifəsində dəyişdirilir. İdxal bunu ayın adına görə təxmin etmir.'
