import { useId, useRef } from 'react'
import { Info } from 'lucide-react'
import type { AnalyticsScope } from '../../api/dashboard'
import type { MonthlyReport } from '../../api/reports'
import { scopeAmountLabels, scopeNotes } from '../../analytics/scope'
import {
  combinedSpendLabel,
  monthlyOrdersLabel,
  outsideMonthlyOrdersLabel,
  unclassifiedOutsideAnalyticsNote,
} from '../../orderLines/lineType'
import { amountIncompleteLabel, missingPriceShortLabel, warningChipClass, warningToneClass } from '../../pricing/labels'
import { formatCount, formatMoney, knownAmountHint, unknownValue } from '../analytics/format'
import { buttonClass } from '../buttonClass'
import { workflowStatusSign } from '../workflow/labels'
import {
  combinedSpendFailedNote,
  loadingLabel,
  retryLabel,
  searchKeepsTotalsNote,
  unapprovedOrdersIncludedNote,
} from './labels'
import { StatusMark } from './StatusMark'

/**
 * «Ümumi faktiki xərc» beside another scope's figures: the `scope=All` answer asked for together with the main one,
 * on its way, failed, or its `knownAmount`.
 */
export type CombinedSpend =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; amount: number | null }

/** A figure the main answer holds, or the «All» answer's. */
type Secondary =
  | { label: string; amount: number | null }
  | { label: string; combined: CombinedSpend }

const figureLabelClass = 'text-label-md leading-[19px] font-medium text-on-surface-variant'
const secondaryValueClass = 'mt-1 whitespace-nowrap font-headline-md text-headline-md tabular'

/**
 * The year's money in three figures (owner decision D-50 №3; UI V2 02 §6, 03 §6.8): one at headline size in the words
 * of the scope the reader chose, and two beside it, smaller, so the other two answers stay in sight without competing
 * with the one asked for.
 *
 * Every figure is the server's. «Ümumi faktiki xərc» beside another scope is the `scope=All` answer's own figure,
 * asked for with every main question — never the figures on the screen added up. While it is on its way it reads «…»;
 * when it cannot be had it reads «—» and says so, with a way to ask again.
 *
 * Under the figures, one quiet line: the counts, whether the money is complete, and — always — that orders nobody has
 * approved yet are in it too. With a search on, the band says the figures are every object's (D-51, S-1).
 *
 * Every word comes from the answer on the screen and the question it answered, never from the controls: while the next
 * answer is on its way the band keeps saying what this one is.
 */
export function ReportSummaryBand({
  report,
  scope,
  searchActive,
  combined,
  onRetryCombined,
}: {
  report: MonthlyReport
  /** The scope this answer was asked about. */
  scope: AnalyticsScope
  /** Whether this answer was asked with a search. */
  searchActive: boolean
  /** Null when the scope is «Hamısı», whose own figure «Ümumi faktiki xərc» is. */
  combined: CombinedSpend | null
  onRetryCombined: () => void
}) {
  const note = scopeNotes[scope]
  const [first, second] = secondaries(report, scope, combined)

  return (
    <section
      aria-label="İlin xülasəsi"
      className="mb-space-md rounded-lg border border-outline-variant bg-surface-container-lowest"
    >
      <div className="flex flex-col gap-3 p-4 sm:p-5 min-[1440px]:p-space-lg">
        <div className="grid gap-space-md sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h2 className={figureLabelClass}>{scopeAmountLabels[scope]}</h2>
            <p className="mt-1 whitespace-nowrap font-metric-val text-metric-val tabular text-on-surface">
              {formatMoney(report.knownAmount)}
            </p>
            {note && <p className="mt-1 text-body-sm leading-[18px] text-on-surface-variant">{note}</p>}
          </div>

          {/* Two columns of their own on a phone, under the headline; beside it from `sm`. */}
          <div className="grid grid-cols-2 gap-space-md sm:contents">
            <SecondaryFigure
              figure={first}
              onRetry={onRetryCombined}
              className="sm:border-l sm:border-outline-variant sm:pl-space-lg"
            />
            <SecondaryFigure
              figure={second}
              onRetry={onRetryCombined}
              className="border-l border-outline-variant pl-space-md sm:pl-space-lg"
            />
          </div>
        </div>

        {/* Above the figures, on the right, from `sm`; under them on a phone (03 §6.8.4). */}
        {searchActive && (
          <p className="flex items-start gap-1.5 text-body-sm leading-[18px] text-on-surface-variant sm:order-first sm:self-end">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {searchKeepsTotalsNote}
          </p>
        )}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-x-5 gap-y-1 border-t border-outline-variant bg-surface-container-low px-4 py-2 text-body-sm leading-[18px] text-on-surface-variant sm:px-5 min-[1440px]:px-space-lg">
        {/* Counts, not money: they describe the year rather than measure it. */}
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Counter label="Sifariş" value={formatCount(report.requestCount)} />
          <Counter label="Obyekt" value={formatCount(report.locationCount)} />
          {report.missingPriceItemCount > 0 ? (
            // Said beside the figures it qualifies. Not written onto a figure: the report's completeness is the whole
            // year's, whichever scope the figures are in.
            <div className={`flex flex-wrap items-baseline gap-x-1.5 ${warningToneClass}`}>
              <dt className="font-semibold">
                <span aria-hidden="true">⚠ </span>
                {missingPriceShortLabel}
              </dt>
              <dd className="font-semibold">
                <span className="tabular">{formatCount(report.missingPriceItemCount)}</span> — {amountIncompleteLabel}.
              </dd>
              <dd>{knownAmountHint}</dd>
            </div>
          ) : (
            <Counter label={missingPriceShortLabel} value={formatCount(report.missingPriceItemCount)} />
          )}
        </dl>

        <UnapprovedIncludedNote />
      </div>

      {/* The same note, on the same condition, as the report has always had: these lines are in neither figure. */}
      {report.unclassifiedItemCount > 0 && (
        <p
          className={`mx-4 mb-4 mt-3 rounded-md p-2 text-body-sm leading-[18px] ring-1 ring-inset sm:mx-5 min-[1440px]:mx-space-lg ${warningChipClass}`}
        >
          {unclassifiedOutsideAnalyticsNote(report.unclassifiedItemCount, formatMoney(report.unclassifiedKnownAmount))}
        </p>
      )}
    </section>
  )
}

/** The two figures beside the headline, by scope (02 §6, 03 §6.8.1). */
function secondaries(
  report: MonthlyReport,
  scope: AnalyticsScope,
  combined: CombinedSpend | null,
): [Secondary, Secondary] {
  const combinedSpend: Secondary = { label: combinedSpendLabel, combined: combined ?? { status: 'loading' } }

  switch (scope) {
    case 'Monthly':
      return [{ label: outsideMonthlyOrdersLabel, amount: report.outsideMonthlyKnownAmount }, combinedSpend]
    case 'OutsideMonthly':
      return [{ label: monthlyOrdersLabel, amount: report.monthlyKnownAmount }, combinedSpend]
    case 'All':
      return [
        { label: monthlyOrdersLabel, amount: report.monthlyKnownAmount },
        { label: outsideMonthlyOrdersLabel, amount: report.outsideMonthlyKnownAmount },
      ]
  }
}

function SecondaryFigure({
  figure,
  onRetry,
  className,
}: {
  figure: Secondary
  onRetry: () => void
  className: string
}) {
  if ('combined' in figure) {
    return <CombinedSpendFigure label={figure.label} combined={figure.combined} onRetry={onRetry} className={className} />
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <p className={figureLabelClass}>{figure.label}</p>
      <p className={`${secondaryValueClass} text-on-surface`}>{formatMoney(figure.amount)}</p>
    </div>
  )
}

/**
 * «Ümumi faktiki xərc» from the «All» answer, and only from it (03 §6.8.3). Asking again keeps the reader's place:
 * the button goes with the failure, so the figure itself takes the focus while the answer is fetched.
 */
function CombinedSpendFigure({
  label,
  combined,
  onRetry,
  className,
}: {
  label: string
  combined: CombinedSpend
  onRetry: () => void
  className: string
}) {
  const labelId = useId()
  const figure = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={figure}
      role="group"
      aria-labelledby={labelId}
      tabIndex={-1}
      className={`min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <p id={labelId} className={figureLabelClass}>{label}</p>

      {combined.status === 'success' && (
        <p className={`${secondaryValueClass} text-on-surface`}>{formatMoney(combined.amount)}</p>
      )}
      {combined.status === 'loading' && (
        <p className={`${secondaryValueClass} text-on-surface-variant`} aria-busy="true">
          <span aria-hidden="true">…</span>
          <span className="sr-only">{loadingLabel}</span>
        </p>
      )}
      {combined.status === 'error' && (
        <p className={`${secondaryValueClass} text-on-surface-variant`}>{unknownValue}</p>
      )}

      {/* Always in the page, so the failure is announced when it is written into it. */}
      <p role="status" className="mt-1 text-body-sm leading-[18px] text-on-surface-variant empty:mt-0">
        {combined.status === 'error' ? combinedSpendFailedNote : null}
      </p>

      {combined.status === 'error' && (
        <button
          type="button"
          onClick={() => {
            onRetry()
            figure.current?.focus()
          }}
          className={`-ml-2 mt-1 scroll-mt-18 ${buttonClass({ variant: 'ghost', size: 'sm', touchBelowLg: true })}`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  )
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="font-semibold tabular text-on-surface">{value}</dd>
    </div>
  )
}

/**
 * The approved sentence (D-51, S-4), with its sign drawn by the table's own mark (`StatusMark`) — the character itself
 * is an emoji by default and would come out in colour — and said as the character to a screen reader, so the words
 * read exactly as approved.
 */
function UnapprovedIncludedNote() {
  const sign = workflowStatusSign.PendingApproval
  const [before, after] = unapprovedOrdersIncludedNote.split(sign)

  return (
    <p>
      {before}
      <StatusMark status="PendingApproval" className="align-[-1px]" />
      <span className="sr-only">{sign}</span>
      {after}
    </p>
  )
}
