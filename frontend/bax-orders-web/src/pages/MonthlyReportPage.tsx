import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import type { AnalyticsScope } from '../api/dashboard'
import { fetchMonthlyReport, type MonthlyReport } from '../api/reports'
import { defaultReportSort, readReportSort, reportSortParam, sortReportRows } from '../analytics/reportSort'
import { readReportView, reportViewParam } from '../analytics/reportView'
import { isScope } from '../analytics/scope'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { MonthlyReportYearList } from '../components/reports/MonthlyReportYearList'
import { ReportFilters } from '../components/reports/ReportFilters'
import { ReportResultCount } from '../components/reports/ReportResultCount'
import { ReportSummaryBand, type CombinedSpend } from '../components/reports/ReportSummaryBand'
import { ReportTable } from '../components/reports/ReportTable'
import { loadingLabel, noMatchingLocationsLabel, noOrdersThisYearLabel } from '../components/reports/labels'
import { useScrollMemory } from '../navigation/useScrollMemory'

/** What an answer was asked for. The answer on the screen is drawn in these words, whatever the controls say now. */
interface ReportKey {
  year: number | undefined
  search: string
  scope: AnalyticsScope
}

/** The answer on the screen: the question it answered, and «Ümumi faktiki xərc» from the same moment. */
interface Shown {
  key: ReportKey
  report: MonthlyReport
  /** Null when the scope is «Hamısı»: the answer's own figure is the company's actual spend. */
  combined: CombinedSpend | null
}

type Phase = 'loading' | 'ready' | 'error'

const waiting: CombinedSpend = { status: 'loading' }
const failed: CombinedSpend = { status: 'error' }

function combinedFrom(all: MonthlyReport): CombinedSpend {
  return { status: 'success', amount: all.knownAmount }
}

/**
 * The year at a glance: every object against every month, with the money as the only heavy thing on the page.
 *
 * Its state lives in the URL, like the dashboard's and the comparison screen's, so a month worth talking about
 * can be sent to somebody as a link.
 *
 * Every main question is asked together with a `scope=All` one, sent first, unless the scope is «Hamısı» already:
 * «Ümumi faktiki xərc» beside the other scopes' figures is that answer's own figure — the server's, from the same
 * moment as the figures beside it, and never the browser adding them up (D-50 №3; 03 §3.3).
 *
 * While the next answer is on its way the last one stays, dimmed and out of reach, in the words of the question it
 * answered; the controls already say the new question (DK-04). A failed main question takes the old answer away.
 */
export function MonthlyReportPage() {
  const [params, setParams] = useSearchParams()
  const [shown, setShown] = useState<Shown | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [problem, setProblem] = useState('')
  // The years the server has, kept through a failed question so the year can still be changed.
  const [years, setYears] = useState<number[]>([])
  const retry = useRef<AbortController | null>(null)

  const year = Number(params.get('year')) || undefined
  const search = params.get('search') ?? ''
  // The same three questions the dashboard asks, in the same words, so a reader moving between the two screens
  // does not have to work out whether they mean the same thing.
  const scopeParam = params.get('scope')
  const scope: AnalyticsScope = isScope(scopeParam) ? scopeParam : 'Monthly'
  // Neither asks the server anything: the view and the order are how the answer is drawn.
  const view = readReportView(params.get('view'))
  const sort = readReportSort(params.get('sort'))

  // Every question gets its own controller, and an answer is used only while its controller has not been abandoned.
  // That — not a key guarding the request — is what keeps a late answer off the screen: guarding the fetch itself
  // would deadlock under StrictMode, whose second pass would find the guard set and never ask for anything.
  useEffect(() => {
    const key: ReportKey = { year, search, scope }
    const controller = new AbortController()
    const current = () => !controller.signal.aborted
    retry.current?.abort()
    setPhase('loading')

    let main: MonthlyReport | null = null
    // The «All» answer when it is first: held until the main one says which year the screen is about.
    let early: MonthlyReport | null = null
    let earlyFailed = false
    let askedAgain = false

    const publish = (combined: CombinedSpend) => {
      setShown((previous) => (previous !== null && previous.report === main ? { ...previous, combined } : previous))
    }

    // Two answers to a question without a year are about the server's latest year. A new year arriving between them
    // would put another year's spend beside this one's, so the «All» answer is set aside and asked for again, once,
    // for the main answer's year.
    const settle = (all: MonthlyReport, answered: MonthlyReport): CombinedSpend => {
      if (all.year === answered.year) {
        return combinedFrom(all)
      }

      if (askedAgain) {
        return failed
      }

      askedAgain = true
      fetchMonthlyReport({ year: answered.year, scope: 'All' }, controller.signal).then(
        (again) => {
          if (current()) {
            publish(again.year === answered.year ? combinedFrom(again) : failed)
          }
        },
        () => {
          if (current()) {
            publish(failed)
          }
        },
      )
      return waiting
    }

    // First, so that the last request a reader's change makes is always the question they asked.
    if (scope !== 'All') {
      fetchMonthlyReport({ year, scope: 'All' }, controller.signal).then(
        (all) => {
          if (!current()) {
            return
          }

          if (main === null) {
            early = all
            return
          }

          publish(settle(all, main))
        },
        () => {
          if (!current()) {
            return
          }

          if (main === null) {
            earlyFailed = true
            return
          }

          publish(failed)
        },
      )
    }

    fetchMonthlyReport({ year, search: search || undefined, scope }, controller.signal).then(
      (data) => {
        if (!current()) {
          return
        }

        main = data
        const combined = scope === 'All'
          ? null
          : early !== null ? settle(early, data) : earlyFailed ? failed : waiting
        setShown({ key, report: data, combined })
        setYears(data.availableYears)
        setPhase('ready')
      },
      (reason: unknown) => {
        if (!current()) {
          return
        }

        setShown(null)
        setProblem(reason instanceof ApiError ? reason.message : 'Naməlum xəta')
        setPhase('error')
      },
    )

    return () => controller.abort()
  }, [year, search, scope])

  // A question asked again by hand is abandoned with the page.
  useEffect(() => () => retry.current?.abort(), [])

  /** «Yenidən cəhd et»: «All» again, for the year on the screen, so it can only be that year's spend. */
  function retryCombined() {
    if (shown === null || shown.combined === null) {
      return
    }

    const { report } = shown
    retry.current?.abort()
    const controller = new AbortController()
    retry.current = controller

    const publish = (combined: CombinedSpend) => {
      setShown((previous) => (previous !== null && previous.report === report ? { ...previous, combined } : previous))
    }

    publish(waiting)
    fetchMonthlyReport({ year: report.year, scope: 'All' }, controller.signal).then(
      (all) => {
        if (!controller.signal.aborted) {
          publish(all.year === report.year ? combinedFrom(all) : failed)
        }
      },
      () => {
        if (!controller.signal.aborted) {
          publish(failed)
        }
      },
    )
  }

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    setParams(next, { replace: true })
  }

  const refreshing = phase === 'loading' && shown !== null

  // The order the reader asked for, from the server's own figures; asks nothing. The company's totals stay last.
  const rows = useMemo(() => (shown === null ? [] : sortReportRows(shown.report.rows, sort)), [shown, sort])

  // The year in the address, or — when it names none — the year the answer on the screen is about. A year the server
  // does not list is still offered, so the select never claims another year than the one asked about.
  const yearValue = year !== undefined ? String(year) : shown !== null ? String(shown.report.year) : ''
  const yearOptions = year === undefined || years.includes(year) ? years : [...years, year].sort((a, b) => b - a)

  // «Sıfırla» puts back everything but the year (03 §3.2).
  const canReset = search !== ''
    || scope !== 'Monthly'
    || view !== 'Compact'
    || sort !== defaultReportSort
    || params.has('cell')

  // Back from an order brings the reader to the row — or, on a phone, the card — whose month they opened, once the
  // matrix for the returned-to address is on the page (24.3). The rows carry the ids the memory looks for.
  const root = useScrollMemory<HTMLDivElement>(phase === 'ready')

  return (
    <div ref={root}>
      {/* No description under the title: its words name the table now, above it (DK-15, DK-23). */}
      <PageHeader title="Aylıq hesabat" />

      {shown !== null ? (
        <Stale when={refreshing}>
          <ReportSummaryBand
            report={shown.report}
            scope={shown.key.scope}
            searchActive={shown.key.search !== ''}
            combined={shown.combined}
            onRetryCombined={retryCombined}
          />
        </Stale>
      ) : (
        phase === 'loading' && <BandPlaceholder />
      )}

      <ReportFilters
        year={yearValue}
        years={yearOptions}
        yearsLoading={phase === 'loading'}
        onYear={(value) => update({ year: value })}
        search={search}
        onSearch={(text) => update({ search: text })}
        scope={scope}
        onScope={(next) => update({ scope: next === 'Monthly' ? undefined : next })}
        view={view}
        onView={(next) => update({ view: reportViewParam(next) })}
        sort={sort}
        onSort={(next) => update({ sort: reportSortParam(next) })}
        canReset={canReset}
        onReset={() => update({ search: undefined, scope: undefined, view: undefined, sort: undefined, cell: undefined })}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-x-space-md">
        <ReportResultCount report={shown?.report ?? null} search={shown?.key.search ?? ''} stale={refreshing} />
        <p role="status" className="mt-2 text-body-sm leading-[18px] text-on-surface-variant empty:mt-0">
          {refreshing ? loadingLabel : null}
        </p>
      </div>

      <div className="mt-space-md">
        {phase === 'error' && <ErrorState message={problem} />}

        {phase === 'loading' && shown === null && <LoadingRows label="Hesabat yüklənir" />}

        {shown !== null && (
          <Stale when={refreshing}>
            {shown.report.requestCount === 0 ? (
              // A year with no order at all is not a search that found nothing, and says so (03 §7).
              <EmptyState>{noOrdersThisYearLabel}</EmptyState>
            ) : rows.length === 0 ? (
              <EmptyState>{noMatchingLocationsLabel}</EmptyState>
            ) : (
              <>
                <ReportTable
                  report={shown.report}
                  rows={rows}
                  view={view}
                  sort={sort}
                  onSort={(next) => update({ sort: reportSortParam(next) })}
                  searchActive={shown.key.search !== ''}
                />
                <MonthlyReportYearList
                  report={shown.report}
                  rows={rows}
                  view={view}
                  searchActive={shown.key.search !== ''}
                />
              </>
            )}
          </Stale>
        )}
      </div>
    </div>
  )
}

/**
 * The last answer while the next one is on its way: dimmed, and out of reach of a click and of the keyboard, so
 * nobody acts on figures that are about to change (03 §3.5).
 */
function Stale({ when, children }: { when: boolean; children: ReactNode }) {
  return (
    <div inert={when} className={when ? 'opacity-60' : undefined}>
      {children}
    </div>
  )
}

/** Where the year's figures will be, on a first visit, so the page does not jump when they arrive. */
function BandPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="mb-space-md h-36 rounded-lg border border-outline-variant bg-surface-container-low motion-safe:animate-pulse"
    />
  )
}
