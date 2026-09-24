import type { AnalyticsComparisonBasis } from '../api/analytics'
import type { DashboardPartition, DashboardPartitionMember } from '../api/dashboard'
import { formatCount, formatMoney, formatMonth } from '../components/analytics/format'

/**
 * What the app calls each of the four situations an object can be in, and how it explains them.
 *
 * The same distinction used to be spelled four different ways on one screen — "Sifariş yoxdur" in a chip,
 * "Bu ay sifariş yoxdur" in a row, "Tarixçə yoxdur" for two quite different things, and a headline that said
 * nothing at all about the objects it had left out. A manager reading the chips could not tell whether an
 * object was missing an order, missing a baseline, or had never ordered at all.
 *
 * Four words carry the whole distinction now, and they are the same four the backend partitions by:
 *
 *   **Müqayisə olunan** — ordered this month and has a month inside the window. The headline is these.
 *   **Sifariş qeydə alınmayıb** — has ordered before, nothing recorded this month. Never "has not sent yet",
 *     and never a zero: an object that did not order is not an object that ordered nothing.
 *   **Müqayisə bazası yoxdur** — ordered this month, but nothing in the window to set it against. Its money
 *     is in the month's total and not in the difference.
 *   **Tarixçə yoxdur** — had never ordered as of this month at all.
 *
 * They add up to the catalogue, and the screen shows the first three adding up to the objects it has rows
 * for, because a total nobody can reconcile is a total nobody can check.
 */

/** The mirror of `BaxOrders.Application.Analytics.Dashboard.PortfolioGroup`. */
export type PortfolioGroup = 'Compared' | 'NoOrderThisMonth' | 'NoBaseline' | 'NoHistory'

export const portfolioGroupLabels: Record<PortfolioGroup, string> = {
  Compared: 'Müqayisə olunan',
  NoOrderThisMonth: 'Sifariş qeydə alınmayıb',
  NoBaseline: 'Müqayisə bazası yoxdur',
  NoHistory: 'Tarixçə yoxdur',
}

/** Short enough for a chip, where the surrounding row already says these are comparison groups. */
export const portfolioGroupChipLabels: Record<PortfolioGroup, string> = {
  ...portfolioGroupLabels,
  NoBaseline: 'Bazası yoxdur',
}

/**
 * Why each group is what it is. Every one of these is a fact about the records; not one of them says why, or
 * whose fault it is, because the system does not know either.
 */
export const portfolioGroupHints: Record<PortfolioGroup, string> = {
  Compared:
    'Bu ay sifarişi olan və müqayisə dövründə ən azı bir ayı olan obyektlər. Panelin yuxarısındakı müqayisə '
    + 'yalnız bu obyektlər üzrədir.',
  NoOrderThisMonth:
    'Əvvəllər sifariş verib, lakin bu ay üçün sifariş qeydə alınmayıb. Bu sıfır sifariş deyil — ona görə də '
    + 'nə ayın cəminə, nə də müqayisəyə daxil edilmir. Sistem sifarişin olmadığını bilir, səbəbini bilmir.',
  NoBaseline:
    'Bu ay sifarişi var, lakin seçilmiş müqayisə dövründə heç bir ayı yoxdur. Məbləği ayın cəminə daxildir, '
    + 'müqayisəyə isə daxil deyil.',
  NoHistory:
    'Seçilmiş aya qədər heç vaxt sifariş verməyib. Nə müqayisə ediləcək bir şey var, nə də əskik olan bir şey.',
}

/** The order a reader meets them: what was compared, then what was not. */
export const portfolioGroupOrder: PortfolioGroup[] = [
  'Compared',
  'NoBaseline',
  'NoOrderThisMonth',
  'NoHistory',
]

export interface PortfolioGroupView {
  group: PortfolioGroup
  label: string
  chipLabel: string
  hint: string
  members: DashboardPartitionMember[]
  count: number
}

/**
 * The four groups in reading order, each with the objects in it.
 *
 * Every group is returned, including the empty ones, so a caller that chips only the exceptions filters on
 * `count` and a caller that shows the arithmetic does not have to invent the zeroes.
 */
export function portfolioGroups(partition: DashboardPartition): PortfolioGroupView[] {
  const members: Record<PortfolioGroup, DashboardPartitionMember[]> = {
    Compared: partition.compared,
    NoOrderThisMonth: partition.noOrderThisMonth,
    NoBaseline: partition.noBaseline,
    NoHistory: partition.noHistory,
  }

  return portfolioGroupOrder.map((group) => ({
    group,
    label: portfolioGroupLabels[group],
    chipLabel: portfolioGroupChipLabels[group],
    hint: portfolioGroupHints[group],
    members: members[group],
    count: members[group].length,
  }))
}

/**
 * The groups the screen counts: the objects it has rows for.
 *
 * "Tarixçə yoxdur" is left out on purpose. Those objects are in the catalogue and not in this table, and
 * whether the dashboard should show all of them is a question of its own — the partition names them so the
 * arithmetic can be checked, and the chips stay about the objects in front of the reader.
 */
export function coverageGroups(partition: DashboardPartition): PortfolioGroupView[] {
  return portfolioGroups(partition).filter((group) => group.group !== 'NoHistory')
}

// ---- the headline ------------------------------------------------------------------------------------

export const coverageHeading = 'Məlumatın əhatəsi'

/** The heading over the objects the comparison could not speak about. Not a list of problems: a list of facts. */
export const exceptionsHeading = 'Müqayisədən kənarda qalan obyektlər'

/** "24 / 26 obyekt üzrə sifariş var" — a count, with no reason attached to it. */
export function ordersThisMonthLine(withOrder: number, comparable: number): string {
  return `${formatCount(withOrder)} / ${formatCount(comparable)} obyekt üzrə sifariş var`
}

export function noOrderLine(count: number): string {
  return `${formatCount(count)} obyekt üzrə sifariş qeydə alınmayıb`
}

/**
 * "Müqayisə olunan 23 obyekt: 71.030,25 ₼" — the money the difference beneath it was actually computed from.
 *
 * Shown whenever the month holds money the comparison could not take in. Without it the reader sees a total
 * and a difference that came from two different sets of objects and has no way to tell.
 */
export function comparedAmountLine(count: number, amount: number | null): string {
  return `Müqayisə olunan ${formatCount(count)} obyekt: ${formatMoney(amount)}`
}

/**
 * Why an object that ordered this month is outside the comparison, in the words of the basis in force.
 *
 * Named after the window rather than after the object: it is the window that does not reach back far enough,
 * and "keçən ay sifarişi yoxdur" would be false the moment the reader picks a six-month average.
 */
export function noOrderInWindowPhrase(basis: AnalyticsComparisonBasis): string {
  return basis === 'PreviousMonth' ? 'keçən ay sifarişi yoxdur' : 'müqayisə dövründə sifarişi yoxdur'
}

/** "Müqayisəyə daxil deyil: EXPO (bu ay 180,04 ₼) — keçən ay sifarişi yoxdur" */
export function excludedFromComparisonLine(
  members: readonly DashboardPartitionMember[],
  basis: AnalyticsComparisonBasis,
): string {
  const named = members
    .map((member) => `${member.locationName} (bu ay ${formatMoney(member.currentKnownAmount)})`)
    .join(' · ')

  return `Müqayisəyə daxil deyil: ${named} — ${noOrderInWindowPhrase(basis)}`
}

/**
 * Objects whose orders this month contain a line somebody still owes a price for.
 *
 * It names objects rather than lines, and it says where the gap is — in the order, not in the object —
 * because "10 obyektdə qiymət məlumatı natamamdır" was read as a fault of the object itself.
 */
export function missingPriceLocationsNote(count: number): string {
  return `${formatCount(count)} obyektin sifarişində qiyməti olmayan sətir var`
}

/** The price chip counts objects, not lines, and says so rather than leaving it to be guessed. */
export function missingPriceChipLabel(count: number): string {
  return `Qiymət yoxdur · ${formatCount(count)} obyekt`
}

/** An object averaged over fewer months than the basis asked for. A property of a compared object. */
export const partialHistoryChipLabel = 'Tarixçə natamam'

/** "= 26 obyekt" — the line that closes the chips, so the reader can see them add up. */
export function coverageTotalNote(count: number): string {
  return `= ${formatCount(count)} obyekt`
}

// ---- one object in the exceptions block --------------------------------------------------------------

/** "son sifariş May 2026, 700,00 ₼" — the fact, offered because it is the next thing anybody asks. */
export function lastOrderNote(member: DashboardPartitionMember): string | null {
  return member.lastOrderPeriod === null
    ? null
    : `son sifariş ${formatMonth(member.lastOrderPeriod)}, ${formatMoney(member.lastOrderKnownAmount)}`
}

/** What a no-baseline object is shown by: this month's money, which counts towards the month and nothing else. */
export function currentOnlyNote(member: DashboardPartitionMember): string | null {
  return member.currentKnownAmount === null ? null : `bu ay ${formatMoney(member.currentKnownAmount)}`
}

/** The one fact worth carrying beside a name, which is a different fact for each group. */
export function memberNote(group: PortfolioGroup, member: DashboardPartitionMember): string | null {
  switch (group) {
    case 'NoOrderThisMonth':
      return lastOrderNote(member)
    case 'NoBaseline':
      return currentOnlyNote(member)
    default:
      return null
  }
}

// ---- the table -----------------------------------------------------------------------------------------

/** "Sifariş qeydə alınmayıb · son sifariş May 2026 (700,00 ₼)" — the whole of a no-order row's status. */
export function noOrderRowStatus(member: DashboardPartitionMember | undefined): string {
  const base = portfolioGroupLabels.NoOrderThisMonth
  if (member?.lastOrderPeriod == null) {
    return base
  }

  return `${base} · son sifariş ${formatMonth(member.lastOrderPeriod)} (${formatMoney(member.lastOrderKnownAmount)})`
}

/** "Müqayisə olunan 23 obyekt" — what the footer row is a total of, said before the figures. */
export function footerComparedLabel(count: number): string {
  return `Müqayisə olunan ${formatCount(count)} obyekt`
}

/** "Bütün sifarişlər (24 obyekt): 71.210,29 ₼" — the month itself, when it is more than the comparison. */
export function footerAllOrdersLine(count: number, amount: number | null): string {
  return `Bütün sifarişlər (${formatCount(count)} obyekt): ${formatMoney(amount)}`
}
