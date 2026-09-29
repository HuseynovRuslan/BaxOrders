import { ArrowRight, CircleAlert, TrendingDown, Zap } from 'lucide-react'
import { Link } from 'react-router'
import type { DashboardAttention, LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { orderResponsibilityText, responsiblePersonLabel } from '../../../orderLines/responsibility'
import { productShareLabel } from '../../../terminology/terms'
import { DirectionWord } from '../../analytics/DirectionWord'
import {
  describeBasisCaption,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
} from '../../analytics/format'
import { baselineCoverageNote } from '../../../coverage/labels'
import { causeHeadline, detailsLabel, noComparisonCause } from '../labels'
import { detailsName, detailsTarget } from '../details'
import { MissingPriceMark } from '../MissingPriceMark'

/** Three, as the approved design has it: a shortlist, not a second table. */
const shown = 3

/**
 * The objects whose money moved the most, one card each.
 *
 * Each card answers four questions in the order a manager asks them: which object, who is answerable for it,
 * how far it moved, and because of what. The whole card is one reading — nothing on it is decoration, and the
 * badge at the top says what place the card holds so "the largest" is checkable rather than asserted.
 */
export function AttentionCards({ attention, summary, selection, onOpenDetail }: {
  attention: readonly DashboardAttention[]
  summary: ManagementDashboardSummary
  selection: BasisSelection
  onOpenDetail?: (item: DashboardAttention) => void
}) {
  const moved = attention
    .filter((item) => item.location.knownAmountDelta !== null)
    .sort((left, right) => Math.abs(right.location.knownAmountDelta!) - Math.abs(left.location.knownAmountDelta!))
    .slice(0, shown)

  if (moved.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-space-md" aria-label="Diqqət tələb edən obyektlər">
      <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-space-sm">
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Diqqət tələb edən obyektlər</h2>
          <span className="rounded-full bg-error-container px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-error-container">
            Xərclərdə ən yüksək kənaraçıxmalar
          </span>
        </div>
        {/*
          The basis, once, beside the cards that are measured against it. The ribbon says it too, but by the
          time a reader has scrolled to these the ribbon is off the screen — and a difference whose basis is
          not in sight is a difference somebody will remember the wrong basis for.
        */}
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {describeBasisCaption(summary.basis, summary.baselinePeriods)} · bütün obyektlər aşağıdakı cədvəldədir
        </span>
      </div>

      <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
        {moved.map((item, place) => (
          <Card
            key={item.location.locationId}
            item={item}
            place={place}
            selection={selection}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  )
}

function Card({ item, place, selection, onOpenDetail }: {
  item: DashboardAttention
  place: number
  selection: BasisSelection
  onOpenDetail?: (item: DashboardAttention) => void
}) {
  const row = item.location
  const delta = row.knownAmountDelta!
  const rising = delta > 0

  const badge = badgeOf(place, rising)
  const tone = rising ? 'text-error' : 'text-on-tertiary-fixed-variant'
  const coverage = baselineCoverageNote(row)

  return (
    <article
      id={`attention-${row.locationId}`}
      className="flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm"
    >
      <div>
        {/*
          The approved design puts the object's code in the corner here («Kod: #OB-004»). This product decided
          the opposite in Task 05b — technical identifiers are not shown on a manager's screen — and a standing
          rule outranks a mockup, so the badge has the row to itself. The code is still on the object's own page
          and in every export, where somebody looking one up expects it.
        */}
        <div className="mb-3 flex items-center gap-space-sm">
          <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-label-sm text-[11px] font-bold tracking-wide ${badge.className}`}>
            {badge.icon}
            {badge.text}
          </span>
        </div>

        <h3 className="mb-1 font-headline-sm text-headline-sm font-bold text-on-surface">{row.locationName}</h3>
        <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
          {responsiblePersonLabel}: {row.responsibility === null ? '—' : orderResponsibilityText(row.responsibility)}
        </p>

        <div className="mb-4 rounded-xl bg-surface-container-low p-space-md">
          <div className="mb-1 flex items-baseline justify-between gap-space-sm">
            <span className="font-label-sm text-label-sm font-medium uppercase text-on-surface-variant">
              Xalis kənaraçıxma
            </span>
            <span className={`tabular font-headline-md text-headline-md font-extrabold tracking-tight ${tone}`}>
              {formatMoneyDelta(delta)}
              <DirectionWord value={delta} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-space-sm border-t border-surface-container-high/70 pt-1 font-body-sm text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              Bu ay: <strong className="tabular font-semibold text-on-surface">{formatMoney(row.current.knownAmount)}</strong>
              {/* A figure somebody still owes a price for is marked where it is read, not in a footnote. */}
              <MissingPriceMark
                count={row.current.missingPriceItemCount}
                explanationIsComplete={row.explanationIsComplete}
              />
            </span>
            {row.knownAmountPercentChange !== null && (
              <span className={`font-label-md font-bold ${tone}`}>{formatPercent(row.knownAmountPercentChange)}</span>
            )}
          </div>

          {/*
            A difference taken against a baseline that only partly exists says so on the card. Without it the
            figure above reads as a comparison with six months when it is a comparison with two.
          */}
          {coverage && (
            <p className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{coverage}</p>
          )}
        </div>

        <Driver row={row} rising={rising} />
      </div>

      <div className="flex items-center justify-between gap-space-sm border-t border-surface-container-high/60 pt-3">
        <Link
          to={detailsTarget(row, selection)}
          aria-label={detailsName(row)}
          className="inline-flex items-center gap-1 font-label-md text-label-md font-semibold text-secondary hover:text-on-secondary-fixed-variant"
        >
          {detailsLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        {onOpenDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            aria-label={`${row.locationName} — təfərrüat`}
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface"
          >
            Təfərrüat
          </button>
        )}
      </div>
    </article>
  )
}

/**
 * Why it moved: the cause the object's own row already carries, and the product that did most of it.
 *
 * Never recomputed here. The card, the table, the drawer and the order page all read the same decomposition,
 * so a fourth wording of it would be a fourth chance to disagree.
 */
function Driver({ row, rising }: { row: LocationDashboardRow, rising: boolean }) {
  if (row.primaryCause === null || row.primaryCauseAmount === null) {
    return <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">{noComparisonCause}</p>
  }

  const pill = rising ? 'bg-error-container/40 text-error' : 'bg-tertiary-fixed/40 text-on-tertiary-fixed-variant'
  const edge = rising ? 'border-error' : 'border-tertiary-fixed-dim'

  return (
    <div className="mb-4 space-y-2">
      <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-label-sm text-label-sm font-semibold ${pill}`}>
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          Əsas səbəb: {causeHeadline(row.primaryCause, row.primaryCauseAmount)} ({formatMoneyDelta(row.primaryCauseAmount)})
        </span>
      </span>

      {row.primaryCauseProduct !== null && (
        <div className={`rounded-lg border-l-2 bg-surface-container-low/60 p-2.5 font-body-sm text-body-sm ${edge}`}>
          <p className="font-medium leading-snug text-on-surface">{row.primaryCauseProduct.productName}</p>
          <p className="mt-1 flex items-center justify-between gap-space-sm text-[12px] text-on-surface-variant">
            <span className="tabular font-bold text-on-surface">{formatMoney(row.primaryCauseProduct.amount)}</span>
            <span className={`font-semibold ${rising ? 'text-error' : 'text-on-tertiary-fixed-variant'}`}>
              {productShareLabel(row.primaryCauseProduct.amount, row.primaryCauseProduct.sameDirectionAmount)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * What place the card holds, and in which direction.
 *
 * Taken from the card's position in this block rather than from the attention reason, because the block is
 * ranked by money moved: a badge that said "the largest" while sitting second would be the one claim on the
 * card a reader could catch out.
 */
function badgeOf(place: number, rising: boolean): { text: string, className: string, icon: React.ReactNode } {
  if (!rising) {
    return {
      text: 'MƏBLƏĞ AZALMASI',
      className: 'bg-tertiary-fixed/70 text-on-tertiary-fixed-variant',
      icon: <TrendingDown className="size-3.5" aria-hidden="true" />,
    }
  }

  return place === 0
    ? {
      text: 'ƏN BÖYÜK MƏBLƏĞ ARTIMI',
      className: 'bg-error-container/70 text-error',
      icon: <CircleAlert className="size-3.5" aria-hidden="true" />,
    }
    : {
      text: 'MƏBLƏĞ ARTIMI',
      className: 'bg-secondary-fixed text-on-secondary-fixed',
      icon: <Zap className="size-3.5" aria-hidden="true" />,
    }
}
