import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import type { DashboardAttention, LocationDashboardRow } from '../../api/dashboard'
import { formatCount, formatMoney, formatMoneyDelta, formatPercent } from '../analytics/format'
import {
  attentionReasonLabels,
  causeHeadline,
  detailsLabel,
  incompleteExplanationNote,
  noComparisonCause,
} from './labels'

/** How many secondary causes a card shows before it stops being a summary. */
const secondaryCount = 2

interface AttentionSectionProps {
  attention: DashboardAttention[]
}

/**
 * The objects worth reading first, and why each one is here.
 *
 * This is not a ranking of performance and not a score. Every card is on the screen because of a fact the data
 * states outright — it moved the most money, it moved by a large share of a real baseline, somebody owes a
 * price on it, or it has nothing behind it to compare against — and the card says which of those it is. An
 * object never disappears from the full table below for failing to appear here.
 */
export function AttentionSection({ attention }: AttentionSectionProps) {
  if (attention.length === 0) {
    return null
  }

  return (
    <section className="mb-6" aria-label="Diqqət tələb edən obyektlər">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Diqqət tələb edən obyektlər</h2>
        <p className="text-xs text-slate-500">
          Bütün obyektlər aşağıdakı cədvəldədir; bu bölmə yalnız oxuma sırasıdır.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attention.map((item) => (
          <li key={item.location.locationId}>
            <Card item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Card({ item }: { item: DashboardAttention }) {
  const row = item.location

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{attentionReasonLabels[item.reason]}</p>
      <p className="mt-0.5 font-medium text-slate-900">{row.locationName}</p>

      <p className="mt-2 whitespace-nowrap text-2xl font-semibold text-slate-900">
        {formatMoney(row.current.knownAmount)}
      </p>

      {row.knownAmountDelta === null ? (
        <p className="mt-0.5 text-sm text-slate-600">{noComparisonCause}</p>
      ) : (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="whitespace-nowrap font-medium text-slate-900">{formatMoneyDelta(row.knownAmountDelta)}</span>
          <span className="whitespace-nowrap text-slate-500">{formatPercent(row.knownAmountPercentChange)}</span>
        </p>
      )}

      <Causes row={row} />

      <div className="mt-auto pt-3">
        <DetailsLink row={row} />
      </div>
    </article>
  )
}

/**
 * The reason the money moved, largest first, with the next two beneath it. The causes come from the same
 * decomposition the decision screen uses, so the card and the page it opens never disagree.
 */
function Causes({ row }: { row: LocationDashboardRow }) {
  if (row.primaryCause === null || row.primaryCauseAmount === null) {
    return null
  }

  const secondary = row.causes
    .filter((cause) => cause.category !== row.primaryCause)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, secondaryCount)

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      <p className="text-xs text-slate-500">Əsas səbəb</p>
      <p className="text-sm font-medium text-slate-900">
        {causeHeadline(row.primaryCause, row.primaryCauseAmount)}{' '}
        <span className="whitespace-nowrap">{formatMoneyDelta(row.primaryCauseAmount)}</span>
      </p>

      {secondary.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {secondary.map((cause) => (
            <li key={cause.category} className="text-xs text-slate-500">
              {causeHeadline(cause.category, cause.amount)}{' '}
              <span className="whitespace-nowrap">{formatMoneyDelta(cause.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {!row.explanationIsComplete && (
        <p className="mt-1 text-xs text-amber-800">{incompleteExplanationNote}</p>
      )}

      {row.current.missingPriceItemCount > 0 && (
        <p className="mt-1 text-xs text-amber-800">
          {formatCount(row.current.missingPriceItemCount)} qiymətsiz sətir
        </p>
      )}
    </div>
  )
}

/**
 * Straight to the order this month's figures came from, which is the screen that answers the next question.
 * An object with no request this month has nothing to open, so it offers its own history instead.
 */
export function DetailsLink({ row, compact = false }: { row: LocationDashboardRow; compact?: boolean }) {
  const to = row.currentRequestId === null ? `/locations/${row.locationId}` : `/orders/${row.currentRequestId}`

  return (
    <Link
      to={to}
      aria-label={`${row.locationName} · ${detailsLabel}`}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      {detailsLabel}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  )
}
