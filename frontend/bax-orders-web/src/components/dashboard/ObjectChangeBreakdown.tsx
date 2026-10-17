import { Link } from 'react-router'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type { LocationDashboardRow } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { productShareLabel } from '../../terminology/terms'
import { DirectionWord } from '../analytics/DirectionWord'
import {
  costDirectionToneClass,
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
} from '../analytics/format'
import { causeTieOrder } from '../decisions/labels'
import { baselineCoverageNote } from '../../coverage/labels'
import { causeHeadline, detailsLabel, noComparisonCause, supplyChangedNote, thisMonthLabel } from './labels'
import { detailsTarget } from './details'
import { MissingPriceMark } from './MissingPriceMark'

/**
 * One object's month, in the order a reader checks it: the two amounts, the difference, what the difference was
 * made of, and how many products of each kind are behind it — and the way on to the order it came from.
 *
 * Drawn in two places that must agree to the qəpik: beside the page on «Ətraflı baxış» (`ChangeDetailDrawer`), and
 * in place under the cards on «Sadə baxış», where an object's row in «Fərq» opens it (01-audit §7.6). Moved here
 * unchanged from the drawer, so the figures, their order and their words are the ones the product already shows.
 *
 * Nothing here is computed for this view. Every figure is the row's own, so a reader who opens the object
 * afterwards finds the same numbers, and the wording of a share is the one wording the whole product uses.
 *
 * What it does not carry is the product-by-product list, which is what the order page is for; it says so and opens
 * it, rather than showing a second, shorter list that could disagree with the first.
 */
export function ObjectChangeBreakdown({ row, basis, baselinePeriods, selection, touchLinks = false }: {
  row: LocationDashboardRow
  basis: AnalyticsComparisonBasis
  baselinePeriods: readonly string[]
  selection: BasisSelection
  /**
   * The link at a touch height on a phone (44 px). The in-place row on «Sadə baxış» asks for it; the drawer on
   * «Ətraflı baxış» keeps its link exactly as it was (S-4).
   */
  touchLinks?: boolean
}) {
  const caption = describeBasisCaption(basis, baselinePeriods)

  return (
    <>
      <Amounts row={row} caption={caption} />
      <Causes row={row} />
      <Products row={row} />

      <p className="mt-4 text-xs text-slate-500">
        Məhsul-məhsul siyahı və hər məhsulun tarixçəsi sifariş səhifəsindədir.
      </p>
      <Link
        to={detailsTarget(row, selection)}
        className={`mt-1 text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600 ${
          touchLinks ? 'inline-flex min-h-11 items-center sm:inline-block sm:min-h-0' : 'inline-block'
        }`}
      >
        {detailsLabel}
      </Link>
    </>
  )
}

/** The two months and what lies between them. Nothing is subtracted here: the difference is the row's own. */
function Amounts({ row, caption }: { row: LocationDashboardRow, caption: string }) {
  const coverage = baselineCoverageNote(row)

  return (
    <section aria-label="Rəqəmlər" className="grid gap-3 sm:grid-cols-3">
      <Figure label={thisMonthLabel}>
        {formatMoney(row.current.knownAmount)}
        <MissingPriceMark count={row.current.missingPriceItemCount} explanationIsComplete={row.explanationIsComplete} />
      </Figure>

      <Figure label={caption} note={coverage ?? undefined}>
        {formatMoney(row.baseline.knownAmount)}
      </Figure>

      <Figure
        label="Fərq"
        tone={costDirectionToneClass(row.knownAmountDelta)}
        note={row.knownAmountPercentChange === null ? undefined : formatPercent(row.knownAmountPercentChange)}
      >
        {row.knownAmountDelta === null ? '—' : formatMoneyDelta(row.knownAmountDelta)}
        <DirectionWord value={row.knownAmountDelta} />
      </Figure>
    </section>
  )
}

function Figure({ label, children, tone, note }: {
  label: string
  children: React.ReactNode
  tone?: string
  note?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 whitespace-nowrap text-xl font-semibold ${tone ?? 'text-slate-900'}`}>{children}</p>
      {note && <p className={`mt-0.5 text-xs ${tone ?? 'text-slate-500'}`}>{note}</p>}
    </div>
  )
}

/**
 * What the difference was made of. Largest first, ties broken the way the order page breaks them, so the two
 * screens agree down to the order of two equal causes.
 *
 * The bar is a share of the largest cause and the percentage is the share of every movement in that cause's own
 * direction — the same figure, and the same words, a product's share is given in. A rise and a fall are not
 * added together to make a denominator: they are two different movements and dividing one by their sum would
 * name a share of nothing.
 */
function Causes({ row }: { row: LocationDashboardRow }) {
  const moved = row.causes
    .filter((cause) => cause.amount !== 0)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount)
      || causeTieOrder.indexOf(left.category) - causeTieOrder.indexOf(right.category))

  if (moved.length === 0) {
    return (
      <section aria-label="Niyə dəyişib?" className="mt-4">
        <h3 className="text-sm font-semibold text-slate-900">Niyə dəyişib?</h3>
        <p className="mt-1 text-sm text-slate-600">{noComparisonCause}</p>
      </section>
    )
  }

  const largest = Math.abs(moved[0].amount)
  const rises = moved.filter((cause) => cause.amount > 0).reduce((sum, cause) => sum + cause.amount, 0)
  const falls = moved.filter((cause) => cause.amount < 0).reduce((sum, cause) => sum + cause.amount, 0)

  return (
    <section aria-label="Niyə dəyişib?" className="mt-4">
      <h3 className="text-sm font-semibold text-slate-900">Niyə dəyişib?</h3>

      <ul className="mt-2 space-y-2">
        {moved.map((cause, index) => (
          <li key={cause.category}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
              <span className="text-slate-900">
                {causeHeadline(cause.category, cause.amount)}
                {index === 0 && <span className="ml-1.5 text-xs text-slate-500">Əsas səbəb</span>}
              </span>
              <span className={`whitespace-nowrap font-medium ${costDirectionToneClass(cause.amount)}`}>
                {formatMoneyDelta(cause.amount)}
                <DirectionWord value={cause.amount} />
              </span>
            </p>

            <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
              <span
                className={`block h-1.5 rounded-full ${cause.amount > 0 ? 'bg-rose-300' : 'bg-emerald-300'}`}
                style={{ width: `${largest === 0 ? 0 : (Math.abs(cause.amount) / largest) * 100}%` }}
                data-share={Math.round(largest === 0 ? 0 : (Math.abs(cause.amount) / largest) * 100)}
              />
            </span>

            <p className="mt-0.5 text-xs text-slate-500">
              {productShareLabel(cause.amount, cause.amount > 0 ? rises : falls)}
              {cause.variantCount > 0 && ` · ${formatCount(cause.variantCount)} məhsul`}
            </p>
          </li>
        ))}
      </ul>

      {row.primaryCauseProduct !== null && (
        <p className="mt-3 text-sm text-slate-700">
          <span className="text-xs text-slate-500">Ən çox təsir edən məhsul</span>
          <br />
          {row.primaryCauseProduct.productName}
          {' — '}
          <span className={`whitespace-nowrap font-medium ${costDirectionToneClass(row.primaryCauseProduct.amount)}`}>
            {formatMoneyDelta(row.primaryCauseProduct.amount)}
            <DirectionWord value={row.primaryCauseProduct.amount} />
          </span>{' '}
          <span className="whitespace-nowrap">
            ({productShareLabel(row.primaryCauseProduct.amount, row.primaryCauseProduct.sameDirectionAmount)})
          </span>
        </p>
      )}

      {row.unattributedAmount !== 0 && (
        <p className="mt-2 text-xs text-amber-800">
          {formatMoneyDelta(row.unattributedAmount)} qiyməti olmayan sətirlərə görə bölüşdürülə bilmir.
        </p>
      )}
    </section>
  )
}

/** How many products of each kind are behind the figures above. Counts, never a judgement of them. */
function Products({ row }: { row: LocationDashboardRow }) {
  const counts: [string, number][] = [
    ['Yeni məhsul', row.newVariantCount],
    ['Bu ay sifariş edilməyib', row.noLongerOrderedVariantCount],
    ['Məbləği artıb', row.increasedVariantCount],
    ['Məbləği azalıb', row.decreasedVariantCount],
    ['Məbləği dəyişməyib', row.unchangedVariantCount],
    ['Müqayisə üçün tarixçəsi yoxdur', row.insufficientHistoryVariantCount],
  ]

  const shown = counts.filter(([, count]) => count > 0)
  if (shown.length === 0) {
    return null
  }

  return (
    <section aria-label="Məhsullar" className="mt-4">
      <h3 className="text-sm font-semibold text-slate-900">Məhsullar</h3>
      <dl className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {shown.map(([label, count]) => (
          <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
            <dt className="truncate text-slate-600">{label}</dt>
            <dd className="font-medium text-slate-900">{formatCount(count)}</dd>
          </div>
        ))}
      </dl>

      {/* Neutral: a product that moved from being bought to being supplied internally is a change in
          arrangement, not a gap in the records. */}
      {row.supplyChangedVariantCount > 0 && (
        <p className="mt-1 text-xs text-slate-500">{supplyChangedNote(row.supplyChangedVariantCount)}</p>
      )}
    </section>
  )
}
