import { useState } from 'react'
import { Link } from 'react-router'
import type { DashboardAttention, LocationDashboardRow } from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { orderResponsibilityText, responsiblePersonLabel } from '../../../orderLines/responsibility'
import { productShareLabel } from '../../../terminology/terms'
import { DirectionWord } from '../../analytics/DirectionWord'
import { formatMoney, formatMoneyDelta, formatPercent } from '../../analytics/format'
import { causeTieOrder } from '../../decisions/labels'
import { causeHeadline, noComparisonCause } from '../labels'
import { detailsName, detailsTarget } from '../details'

/**
 * One object that moved, as the Figma handoff draws it — and, on a click, as much of the reason as the
 * dashboard knows.
 *
 * The card's whole idea is that it is short until asked: a badge, the object, one big difference, one reason.
 * «Detallara bax» opens the rest in place rather than sending the reader somewhere, which is what makes this
 * the simple view — the detail is available without the page changing under them.
 *
 * Nothing on it is computed here. The difference, the cause and the product are the object's own row, the
 * same decomposition the detailed view and the order page read, so the two screens cannot disagree.
 */
export function AlertCard({ item, place, selection }: {
  item: DashboardAttention
  /** Where this card sits in the block, which is ranked by money moved. Nothing else may claim «ən böyük». */
  place: number
  selection: BasisSelection
}) {
  const [open, setOpen] = useState(false)
  const row = item.location
  const delta = row.knownAmountDelta!

  // In this product a cost that rises is red and a cost that falls is green — the Figma mock paints a rising
  // number green, as most products would, and that inversion is deliberate here. See `--color-cost-up`.
  const rising = delta > 0
  const ink = rising ? 'text-cost-up' : 'text-cost-down'
  const wash = rising ? 'bg-cost-up-wash' : 'bg-cost-down-wash'
  const edge = rising ? 'border-l-cost-up' : 'border-l-cost-down'

  return (
    <article
      id={`attention-${row.locationId}`}
      className="flex flex-col gap-3 rounded-xl border border-simple-line bg-simple-card p-5 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      {/*
        The badge names what the card is: the biggest rise, another rise, or a fall. The handoff also puts an
        object code in this row; this product decided in Task 05b that technical identifiers do not belong on
        a manager's screen, and a standing rule outranks a mockup.
      */}
      <p>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.05em] ${wash} ${ink}`}>
          <span className={`inline-block size-1.5 rounded-full ${rising ? 'bg-cost-up' : 'bg-cost-down'}`} aria-hidden="true" />
          {place === 0 ? 'Ən böyük ' : ''}{rising ? 'Məbləğ artımı' : 'Məbləğ azalması'}
        </span>
      </p>

      <div>
        <h3 className="text-base font-bold text-simple-ink">{row.locationName}</h3>
        <p className="mt-0.5 text-xs text-simple-ink-faint">
          {responsiblePersonLabel}: {row.responsibility === null ? '—' : orderResponsibilityText(row.responsibility)}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-simple-ink-soft">
          {rising ? 'Xalis kənaraçıxma' : 'Xalis qənaət / azalma'}
        </p>
        <p className="flex flex-wrap items-baseline gap-2.5">
          <span className={`font-figures text-[28px] font-bold tracking-[-0.5px] ${ink}`}>
            {formatMoneyDelta(delta)}
            <DirectionWord value={delta} />
          </span>
          {row.knownAmountPercentChange !== null && (
            <span className={`rounded-full px-2 py-0.5 font-figures text-[13px] font-semibold ${wash} ${ink}`}>
              {rising ? '▲' : '▼'} {formatPercent(row.knownAmountPercentChange)} {rising ? 'artım' : 'qənaət'}
            </span>
          )}
        </p>
        <p className="mt-1 font-figures text-xs text-simple-ink-soft">
          Bu ay: {formatMoney(row.current.knownAmount)}
        </p>
      </div>

      <p className={`rounded-lg border-l-[3px] px-3 py-2 text-[13px] font-semibold ${wash} ${ink} ${edge}`}>
        {row.primaryCause === null || row.primaryCauseAmount === null
          ? noComparisonCause
          : `Əsas səbəb: ${causeHeadline(row.primaryCause, row.primaryCauseAmount)} (${formatMoneyDelta(row.primaryCauseAmount)})`}
      </p>

      {open && <Details row={row} />}

      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((shown) => !shown)}
          aria-expanded={open}
          className="rounded-lg border border-simple-line px-3.5 py-1.5 text-[13px] font-medium text-simple-ink-soft transition-colors hover:border-simple-accent hover:bg-simple-accent-wash hover:text-simple-accent"
        >
          {open ? 'Bağla ↑' : 'Detallara bax →'}
        </button>
        <Link
          to={detailsTarget(row, selection)}
          aria-label={detailsName(row)}
          className="rounded-lg border border-simple-line px-3.5 py-1.5 text-[13px] font-medium text-simple-ink-soft transition-colors hover:bg-simple-line-soft hover:text-simple-ink"
        >
          Sifarişə keç
        </Link>
      </div>
    </article>
  )
}

/**
 * What the card opens: the product that did most of the main cause, then the other causes that moved money.
 *
 * Largest first, ties broken the way the order page breaks them, so this list and that page agree even about
 * two causes of the same size. Each line's colour says which way its own money went, which is not always the
 * card's direction — an object whose cost fell can still have one cause pushing the other way.
 */
function Details({ row }: { row: LocationDashboardRow }) {
  const others = row.causes
    .filter((cause) => cause.amount !== 0 && cause.category !== row.primaryCause)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount)
      || causeTieOrder.indexOf(left.category) - causeTieOrder.indexOf(right.category))

  const lines: { label: string, value: string, rising: boolean | null }[] = []

  if (row.primaryCauseProduct !== null) {
    const product = row.primaryCauseProduct
    lines.push({
      label: `${product.productName} (${productShareLabel(product.amount, product.sameDirectionAmount)})`,
      value: formatMoneyDelta(product.amount),
      rising: product.amount > 0,
    })
  }

  for (const cause of others) {
    lines.push({
      label: causeHeadline(cause.category, cause.amount),
      value: formatMoneyDelta(cause.amount),
      rising: cause.amount > 0,
    })
  }

  if (row.supplyChangedVariantCount > 0) {
    // Not a cause and never coloured: a product that moved to the company's own store changed arrangement,
    // not price.
    lines.push({
      label: `${row.supplyChangedVariantCount} məhsul daxili təminata keçib`,
      value: '—',
      rising: null,
    })
  }

  if (lines.length === 0) {
    return (
      <p className="border-t border-simple-line pt-3 text-[13px] text-simple-ink-soft">
        Bu obyekt üçün başqa səbəb yoxdur.
      </p>
    )
  }

  return (
    <dl className="flex flex-col gap-1.5 border-t border-simple-line pt-3 text-[13px]">
      {lines.map((line) => (
        <div key={line.label} className="flex justify-between gap-2">
          <dt className="min-w-0 text-simple-ink-soft">{line.label}</dt>
          <dd className={`whitespace-nowrap font-figures font-semibold ${
            line.rising === null ? 'text-simple-ink' : line.rising ? 'text-cost-up' : 'text-cost-down'
          }`}>
            {line.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
