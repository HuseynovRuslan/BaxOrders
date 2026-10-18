import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import type { AnalyticsScope } from '../../api/dashboard'
import type { MonthlyReportCell, MonthlyReportRow } from '../../api/reports'
import { scopeAmountLabels, scopeLabels } from '../../analytics/scope'
import { monthlyReportOrderLink, monthlyReportOrderState } from '../../navigation/monthlyReportReturn'
import { monthlyOrdersLabel, orderLineTypeLabels, outsideMonthlyOrdersLabel } from '../../orderLines/lineType'
import { missingPriceCount, missingPriceShortLabel, warningToneClass } from '../../pricing/labels'
import {
  costDecreasedLabel,
  costIncreasedLabel,
  costUnchangedLabel,
  limitedComparisonDataLabel,
  replacesEarlierOrderNote,
  unusualMonthHint,
} from '../../terminology/terms'
import {
  costDirectionTintClass,
  costDirectionToneClass,
  describeBasisCaption,
  formatCount,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  knownAmountHint,
  unknownValue,
} from '../analytics/format'
import { buttonClass } from '../buttonClass'
import { openOrderLabel } from '../decisions/labels'
import { ErrorState, LoadingRows } from '../EmptyState'
import { OrderStatusBadge } from '../workflow/OrderStatusBadge'
import { cellOrderPageSize, type CellOrder } from './cellOrder'
import {
  allLinesLabel,
  closeDetailsLabel,
  closeLabel,
  linesSectionLabel,
  loadingLinesLabel,
  locationOrdersLabel,
  noLinesInOrderLabel,
  noLinesOfScopeLabel,
  noMatchingLinesLabel,
  orderSectionLabel,
  previousMonthAmountLabel,
  pricedLinesLabel,
  recentAverageAmountLabel,
  recentAverageComparisonLabel,
  unusualMonthLabel,
  wholeOrderAmountLabel,
} from './labels'
import { LinesPager, ReportOrderLines } from './ReportOrderLines'
import { UnusualMark } from './UnusualMark'

/** Where the details are drawn: under a table row, or inside a phone or tablet card. */
export type ReportDetailSurface = 'table' | 'cards'

/** The id of the details on each surface; the open month's link names it (`aria-controls`). */
export function reportCellDetailId(surface: ReportDetailSurface): string {
  return `report-cell-detail-${surface}`
}

/** How long the details take to open (03a §2). Nothing moves for a reader who asked for less. */
const openingMs = 150

function prefersMotion(): boolean {
  return typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * One month's details, in place, under the object's row — or inside its card below the table's width (UI V2 03 §6.9
 * for what they say, 03a for where: the owner's «Yerində, sətrin altında», D-Y1). Only one month is ever open.
 *
 * Every figure of the month is the report's answer, on the screen at once; the order's lines are their own question
 * (`useCellOrder`), so a slow or failed one never hides the month's figures or the way to the order. Opening slides
 * the height for 150 ms (the dashboard's in-place details do the same); moving to another month does not animate.
 * The reader's own opening puts the focus on the heading and brings the details up if they are low on the screen; an
 * address that already names the month — a link, a reload, Back from the order — takes no focus.
 */
export function ReportCellDetail({
  surface,
  row,
  cell,
  scope,
  order,
  focusKey,
  animate,
  onClose,
}: {
  surface: ReportDetailSurface
  row: MonthlyReportRow
  cell: MonthlyReportCell
  scope: AnalyticsScope
  order: CellOrder
  /** Changes each time the reader opens or moves to a month. Zero when the address opened it. */
  focusKey: number
  /** Whether to slide open: only when nothing was open before. */
  animate: boolean
  onClose: () => void
}) {
  const id = reportCellDetailId(surface)
  const heading = useRef<HTMLHeadingElement>(null)
  const section = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(() => !animate || !prefersMotion())

  useLayoutEffect(() => {
    if (expanded) {
      return
    }

    // One frame at 0fr, so the browser has a height to slide from.
    const frame = requestAnimationFrame(() => setExpanded(true))
    return () => cancelAnimationFrame(frame)
  }, [expanded])

  // Both surfaces try; the one hidden by the width takes no focus, so the one in sight keeps it.
  const handled = useRef(0)
  useEffect(() => {
    if (focusKey === 0 || focusKey === handled.current) {
      return
    }

    handled.current = focusKey
    heading.current?.focus({ preventScroll: true })
    // Only when the top is low on the screen (the dashboard's rule).
    const top = section.current?.getBoundingClientRect().top ?? 0
    if (top < 0 || top > window.innerHeight * (2 / 3)) {
      scrollPage(section.current, 'start')
    }
  }, [focusKey])

  const linesHeading = useRef<HTMLHeadingElement>(null)
  function showPage(page: number) {
    order.setPage(page)
    scrollPage(linesHeading.current, 'nearest')
  }

  return (
    <div
      className="grid transition-[grid-template-rows] ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: expanded ? '1fr' : '0fr', transitionDuration: `${openingMs}ms` }}
    >
      {/* `relative` keeps every `sr-only` word inside the box that clips it, so none can widen the page. */}
      <div className="relative min-h-0 overflow-hidden">
        <section
          ref={section}
          id={id}
          aria-labelledby={`${id}-title`}
          // Back from the order brings the object's row into view, though the details are not inside it (24.3).
          data-scroll-anchor={surface === 'table' ? `row-${row.locationId}` : `row-${row.locationId}-phone`}
          className="@container scroll-mt-20 rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                id={`${id}-title`}
                ref={heading}
                tabIndex={-1}
                className="break-words font-headline-sm text-headline-sm leading-[1.4] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {row.locationName}
              </h3>
              <p className="text-body-sm leading-[1.4] text-on-surface-variant">
                {formatMonth(cell.period)} · {scopeLabels[scope]}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeDetailsLabel}
              className={buttonClass({ variant: 'ghost', size: 'touch', iconOnly: true })}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-4 @3xl:grid-cols-2">
            <MonthFigures cell={cell} scope={scope} />
            <OrderLines order={order} scope={scope} linesHeading={linesHeading} onPage={showPage} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
            <Link
              to={monthlyReportOrderLink(cell.orderRequestId!)}
              state={monthlyReportOrderState}
              className={`${buttonClass({ variant: 'primary', touchBelowLg: true })} w-full sm:w-auto`}
            >
              {openOrderLabel}
            </Link>
            <Link to={`/locations/${row.locationId}`} className={buttonClass({ variant: 'secondary', touchBelowLg: true })}>
              {locationOrdersLabel}
            </Link>
            <button type="button" onClick={onClose} className={`${buttonClass({ variant: 'secondary', touchBelowLg: true })} sm:ml-auto`}>
              {closeLabel}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

/** The month as the report answered it (03 §6.9.2–6.9.5): its state, its amount, two named comparisons, its make-up. */
function MonthFigures({ cell, scope }: { cell: MonthlyReportCell; scope: AnalyticsScope }) {
  const scopeLines = scope === 'Monthly' ? cell.monthlyItemCount : scope === 'OutsideMonthly' ? cell.outsideMonthlyItemCount : cell.itemCount
  const amountNote = cell.knownAmount === null && scopeLines === 0
    ? noLinesOfScopeLabel
    : !cell.amountIsComplete || cell.knownAmount === null ? knownAmountHint : null

  return (
    <div className="min-w-0 space-y-4">
      {cell.status !== null && (
        <div className="min-w-0 max-w-full">
          <OrderStatusBadge status={cell.status} isHistoricalImport={cell.isHistoricalImport} />
          {/* «Versiya» is never written (Task 05b): a later order for the month replaces the earlier one. */}
          {cell.version !== null && cell.version > 1 && (
            <p className="mt-1 text-body-sm leading-[1.4] text-on-surface-variant">{replacesEarlierOrderNote}</p>
          )}
        </div>
      )}

      <div className="rounded-md border border-outline-variant bg-surface-container-low p-3">
        <p className="font-label-md text-label-md text-on-surface-variant">{scopeAmountLabels[scope]}</p>
        <p className="mt-0.5 whitespace-nowrap font-metric-val text-metric-val tabular text-on-surface">{formatMoney(cell.knownAmount)}</p>
        {amountNote !== null && <p className="mt-1 text-body-sm leading-[1.4] text-on-surface-variant">{amountNote}</p>}
      </div>

      <dl className="space-y-3">
        <Comparison
          label={describeBasisCaption('PreviousMonth', [])}
          value={previousMonthChange(cell)}
          tone={costDirectionToneClass(cell.deltaPercent ?? cell.deltaAmount)}
          note={previousMonthAmountLabel(formatMoney(cell.previousMonthKnownAmount))}
        />
        <Comparison
          label={recentAverageComparisonLabel}
          value={cell.recentAveragePercent === null ? unknownValue : formatPercent(cell.recentAveragePercent)}
          tone={costDirectionToneClass(cell.recentAveragePercent)}
          note={cell.recentAverageKnownAmount === null
            ? limitedComparisonDataLabel
            : recentAverageAmountLabel(formatMoney(cell.recentAverageKnownAmount))}
        />
      </dl>

      {cell.isUnusual && cell.recentAveragePercent !== null && cell.recentAveragePercent !== 0 && (
        <div className={`rounded-md p-3 ${costDirectionTintClass(cell.recentAveragePercent)}`}>
          <p className="flex items-center gap-1.5 text-body-md font-semibold text-on-surface">
            <UnusualMark percent={cell.recentAveragePercent} />
            {unusualMonthLabel}
          </p>
          <p className="mt-0.5 text-body-sm leading-[1.4] text-on-surface">{sentence(unusualMonthHint)}</p>
        </div>
      )}

      {/* What the month was made of, whichever scope is read; no total line (03 §6.9.5). */}
      <dl className="divide-y divide-outline-variant">
        <MakeUp label={monthlyOrdersLabel} amount={cell.monthlyKnownAmount} lines={cell.monthlyItemCount} active={scope === 'Monthly'} />
        <MakeUp label={outsideMonthlyOrdersLabel} amount={cell.outsideMonthlyKnownAmount} lines={cell.outsideMonthlyItemCount} active={scope === 'OutsideMonthly'} />
        {cell.unclassifiedItemCount > 0 && (
          <MakeUp label={orderLineTypeLabels.Unclassified} amount={cell.unclassifiedKnownAmount} lines={cell.unclassifiedItemCount} active={false} />
        )}
      </dl>
    </div>
  )
}

/** «+100% · +1.234,00 ₼ · xərc artıb»: the change on the month before, in the cost colours (9.1), and in words. */
function previousMonthChange(cell: MonthlyReportCell): string {
  if (cell.deltaAmount === null) {
    return cell.deltaPercent === null ? unknownValue : formatPercent(cell.deltaPercent)
  }

  const direction = cell.deltaAmount > 0 ? costIncreasedLabel : cell.deltaAmount < 0 ? costDecreasedLabel : costUnchangedLabel
  return [cell.deltaPercent === null ? null : formatPercent(cell.deltaPercent), formatMoneyDelta(cell.deltaAmount), direction]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

function Comparison({ label, value, tone, note }: { label: string; value: string; tone: string; note: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <dt className="text-body-md leading-[1.4] text-on-surface">{label}</dt>
        {/* Free to wrap between its parts: at 200% text on a phone the whole sentence is wider than the details (E-1). */}
        <dd className={`min-w-0 max-w-full text-right text-body-md font-semibold tabular ${tone}`}>{value}</dd>
      </div>
      <dd className="text-body-sm leading-[1.4] text-on-surface-variant">{note}</dd>
    </div>
  )
}

function MakeUp({ label, amount, lines, active }: { label: string; amount: number | null; lines: number; active: boolean }) {
  const weight = active ? 'font-semibold' : ''
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
      <dt className={`text-body-md leading-[1.4] text-on-surface ${weight}`}>{label}</dt>
      <dd className="flex flex-wrap justify-end gap-x-3 tabular">
        <span className={`whitespace-nowrap text-body-md text-on-surface ${weight}`}>{formatMoney(amount)}</span>
        <span className="whitespace-nowrap text-body-sm text-on-surface-variant">{formatCount(lines)} sətir</span>
      </dd>
    </div>
  )
}

/** The order and a page of its lines (03 §6.9.6, §6.9.8). */
function OrderLines({ order, scope, linesHeading, onPage }: {
  order: CellOrder
  scope: AnalyticsScope
  linesHeading: RefObject<HTMLHeadingElement | null>
  onPage: (page: number) => void
}) {
  const { state } = order
  const loaded = state.status === 'success' ? state.order : null

  return (
    <div className="min-w-0">
      <h4 className="font-label-md text-label-md text-on-surface-variant">{orderSectionLabel}</h4>
      {loaded !== null && (
        <>
          {/* Not beside «Hamısı»: the cell's own figure is the same lines, rounded per kind (03 §6.9.6). */}
          {scope !== 'All' && (
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body-md leading-[1.4] text-on-surface">{wholeOrderAmountLabel}</span>
              <span className="whitespace-nowrap text-body-md font-semibold tabular text-on-surface">{formatMoney(loaded.knownAmountTotal)}</span>
            </div>
          )}
          {loaded.missingPriceItemCount > 0 && (
            <p className={`mt-1 text-body-sm leading-[1.4] ${warningToneClass}`}>
              ⚠ {missingPriceCount(loaded.missingPriceItemCount)}. {knownAmountHint}
            </p>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h4 ref={linesHeading} className="scroll-mt-20 font-label-md text-label-md text-on-surface-variant">
          {/* The space between word and count is its own text, so a screen reader hears «Sətirlər 3», not «Sətirlər3». */}
          {linesSectionLabel}{loaded !== null && <>{' '}<span className="tabular">{linesCount(loaded.items.totalCount, loaded.itemCount, order.hasPrice !== undefined)}</span></>}
        </h4>
        <select
          aria-label={linesSectionLabel}
          value={order.hasPrice === undefined ? '' : String(order.hasPrice)}
          onChange={(event) => order.setHasPrice(event.target.value === '' ? undefined : event.target.value === 'true')}
          className="min-h-11 rounded-md border border-outline bg-surface-container-lowest px-2 text-body-sm text-on-surface focus-visible:outline-2 focus-visible:outline-primary lg:min-h-8"
        >
          <option value="">{allLinesLabel}</option>
          <option value="true">{pricedLinesLabel}</option>
          <option value="false">{missingPriceShortLabel}</option>
        </select>
      </div>

      <div className="mt-1">
        {state.status === 'loading' && <LoadingRows count={3} label={loadingLinesLabel} />}
        {state.status === 'error' && <ErrorState message={state.message} />}
        {loaded !== null && (loaded.items.items.length === 0
          ? <p className="py-2 text-body-sm text-on-surface-variant">{order.hasPrice === undefined ? noLinesInOrderLabel : noMatchingLinesLabel}</p>
          : (
            <>
              <ReportOrderLines
                items={loaded.items.items}
                firstNumber={(order.page - 1) * cellOrderPageSize + 1}
                numbered={order.hasPrice === undefined}
              />
              <LinesPager
                page={order.page}
                pages={Math.ceil(loaded.items.totalCount / cellOrderPageSize)}
                total={loaded.items.totalCount}
                onPage={onPage}
              />
            </>
          ))}
      </div>
    </div>
  )
}

/**
 * «Sətirlər 110», or under a filter «Sətirlər 8 / 110»: how many lines the filter left of the order's own count, so the
 * heading never claims the whole order while a part of it is listed (E-4).
 */
function linesCount(listed: number, total: number, filtered: boolean): string {
  return filtered ? `${formatCount(listed)} / ${formatCount(total)}` : formatCount(total)
}

/** «əvvəlki 3 mövcud ayın …» as a sentence of its own. */
function sentence(text: string): string {
  return `${text.charAt(0).toLocaleUpperCase('az')}${text.slice(1)}.`
}

/** Room the application's header (72 px) takes at the top of the screen, and a little air under it. */
const headerOffset = 80

/**
 * Scrolls the page, and only the page. `scrollIntoView` would also scroll the table's box to where the pinned details
 * would sit unpinned — its start — and move the reader's months away under them (03a §2: the box keeps its place).
 * An element with no box at all — the layout hidden at this width — moves nothing.
 */
export function scrollPage(element: HTMLElement | null, where: 'start' | 'nearest' | 'center') {
  const rect = element?.getBoundingClientRect()
  if (rect === undefined || (rect.width === 0 && rect.height === 0)) {
    return
  }

  const behavior: ScrollBehavior = prefersMotion() ? 'smooth' : 'auto'
  if (where === 'start') {
    window.scrollBy({ top: rect.top - headerOffset, behavior })
  } else if (where === 'center') {
    window.scrollBy({ top: rect.top - (window.innerHeight - rect.height) / 2, behavior })
  } else if (rect.top < headerOffset) {
    window.scrollBy({ top: rect.top - headerOffset, behavior })
  } else if (rect.bottom > window.innerHeight) {
    window.scrollBy({ top: Math.min(rect.bottom - window.innerHeight + 16, rect.top - headerOffset), behavior })
  }
}
