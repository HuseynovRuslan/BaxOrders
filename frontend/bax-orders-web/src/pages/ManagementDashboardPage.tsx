import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PriceCoverageState } from '../api/analytics'
import {
  fetchDashboard,
  fetchDashboardPeriods,
  type DashboardPeriods,
  type HistoryCoverageState,
  type AnalyticsScope,
  type ManagementDashboard,
} from '../api/dashboard'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import {
  DashboardCoverageChips,
  DashboardExceptions,
  type CoverageChip,
} from '../components/dashboard/DashboardSummary'
import { LocationRows } from '../components/dashboard/LocationRows'
import {
  dashboardSortOption,
  dashboardSortOptions,
  isHistoryCoverage,
  isPriceCoverage,
} from '../components/dashboard/labels'
import { formatCount, formatMonth, toMonthKey } from '../components/analytics/format'
import { basisParams, basisRequest, type BasisSelection } from '../analytics/basisParams'
import { isScope } from '../analytics/scope'
import { readView, viewParam, dashboardViewOrder, dashboardViewLabels, type DashboardView } from '../analytics/dashboardView'
import { SimpleDashboard } from '../components/dashboard/figma/SimpleDashboard'
import { ChangeDetailDrawer } from '../components/dashboard/ChangeDetailDrawer'
import { FilterRibbon } from '../components/dashboard/stitch/FilterRibbon'
import { KpiGrid } from '../components/dashboard/stitch/KpiGrid'
import { ComparisonBars } from '../components/dashboard/stitch/ComparisonBars'
import { CategoryBreakdown } from '../components/dashboard/stitch/CategoryBreakdown'
import { AttentionCards } from '../components/dashboard/stitch/AttentionCards'
import { useBasis } from '../analytics/useBasis'
import { isPortfolioGroup } from '../coverage/labels'
import { useScrollMemory } from '../navigation/useScrollMemory'
import { OutsideMonthlyPanel } from '../components/dashboard/OutsideMonthlyPanel'

/**
 * Every object of the month on one page: the API's largest page (`ManagementDashboardQueries.MaxPageSize`). The
 * pager below the table is for a company with more objects than that, and is not shown otherwise.
 */
const pageSize = 100

/** Every filter a chip can set. A chip sets one and clears the rest; "Filtri təmizlə" clears them all. */
const noDataFilters = {
  group: undefined,
  historyCoverage: undefined,
  priceCoverage: undefined,
  hasCurrentRequest: undefined,
  missingPrice: undefined,
}

type Periods = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: DashboardPeriods }

/**
 * The last answer, kept on screen while the next one loads. A reload used to blank the page, which threw the
 * reader back to the top at every filter, sort or page change; the figures now stay, marked busy, until the
 * new ones replace them.
 */
interface Dashboard {
  data: ManagementDashboard | null
  /** The comparison `data` was asked for, so a card's link opens the order it is actually showing. */
  selection: BasisSelection | null
  loading: boolean
  error: string | null
  /** When the answer on screen was read. The ribbon says it, because the alternative was a fictional sync time. */
  loadedAt: Date | null
}

/**
 * The company's month, object by object. Every figure comes from the dashboard API as it is: nothing here
 * adds up money, works out a percentage or decides whether an object's history is complete, and no object is
 * ranked as doing well or badly.
 *
 * Laid out so the first screen answers "which object do I look at": the month and its change, then the
 * objects worth reading first, then who was left out, and only then the chips and the full table they filter.
 */
export function ManagementDashboardPage() {
  const [params, setParams] = useSearchParams()
  const [periods, setPeriods] = useState<Periods>({ status: 'loading' })
  const [dashboard, setDashboard] = useState<Dashboard>({ data: null, selection: null, loading: true, error: null, loadedAt: null })
  const tableHeading = useRef<HTMLHeadingElement>(null)

  // The whole reading lives in the query string, so Back, Forward, a reload and a pasted link all restore
  // the same comparison — and a card can hand it on to the order it opens. Anything unrecognised falls back
  // to last month rather than breaking the screen.
  const selection = useBasis(params, setParams)
  const historyCoverage: HistoryCoverageState | undefined = isHistoryCoverage(params.get('historyCoverage'))
    ? (params.get('historyCoverage') as HistoryCoverageState)
    : undefined
  const priceCoverage: PriceCoverageState | undefined = isPriceCoverage(params.get('priceCoverage'))
    ? (params.get('priceCoverage') as PriceCoverageState)
    : undefined
  // Which lines the whole screen is about. In the URL like every other reading, so a link carries the question
  // as well as the answer.
  const scopeParam = params.get('scope')
  const scope: AnalyticsScope = isScope(scopeParam) ? scopeParam : 'Monthly'
  // How deep. The simple view is the default and answers the questions the page is opened with; the detailed
  // one keeps everything the screen has ever had.
  const view: DashboardView = readView(params.get('view'))
  const groupParam = params.get('group')
  const group = isPortfolioGroup(groupParam) ? groupParam : undefined
  const missingPrice = params.get('missingPrice') === 'true' ? true : undefined
  const hasCurrentRequest = params.get('hasCurrentRequest') === 'false'
    ? false
    : params.get('hasCurrentRequest') === 'true'
      ? true
      : undefined
  // The size of the change unless the reader chose otherwise; nothing is written to the URL for the default.
  const sortOption = dashboardSortOption(params.get('sort'))
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = useState(search)
  // The month's ad-hoc lines, opened from the figure that names them on the headline.
  const [outsideMonthlyOpen, setOutsideMonthlyOpen] = useState(false)

  // Which object's decomposition is open beside the page, by id rather than by row: the answer is refetched on
  // every basis and period, and holding the row itself would leave the drawer showing the month before.
  const [detailLocationId, setDetailLocationId] = useState<number | null>(null)
  useEffect(() => setSearchInput(search), [search])

  useEffect(() => {
    const controller = new AbortController()
    setPeriods({ status: 'loading' })
    fetchDashboardPeriods(controller.signal)
      .then((data) => setPeriods({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setPeriods({ status: 'error', message: message(problem, 'Dövrlər yüklənmədi') })
        }
      })
    return () => controller.abort()
  }, [])

  const available = periods.status === 'success' ? periods.data.periods : []
  const requested = params.get('period')
  // Only a month the company really ordered in; the latest one otherwise.
  const period = available.some((item) => toMonthKey(item.period) === requested)
    ? requested!
    : (available[0] ? toMonthKey(available[0].period) : null)

  // Oldest first, and never the selected month itself.
  const priorMonths = useMemo(
    () =>
      available
        .map((item) => toMonthKey(item.period))
        .filter((month) => period !== null && month < period)
        .sort(),
    [available, period],
  )

  // The two months travel only with the basis that uses them; the API refuses them with any other. An
  // unfinished range asks for last month rather than asking for nothing, so the page never goes blank.
  const request = basisRequest(selection)
  const basisKey = `${request.basis}|${request.customStart ?? ''}|${request.customEnd ?? ''}`
  const query = useMemo(
    () => ({
      ...request,
      // The default scope travels as nothing at all, so an ordinary link stays short and the server's own
      // default is the one in force.
      scope: scope === 'Monthly' ? undefined : scope,
      search: search || undefined,
      historyCoverage,
      priceCoverage,
      hasCurrentRequest,
      group,
      missingPrice,
      sort: sortOption.sort,
      descending: sortOption.descending,
      page,
      pageSize,
    }) as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basisKey, scope, search, historyCoverage, priceCoverage, hasCurrentRequest, group, missingPrice, sortOption, page],
  )

  // One request per selection; the key keeps a stale answer from replacing a newer one.
  const lastKey = useRef('')
  useEffect(() => {
    if (period === null) {
      return
    }

    const key = `${period}|${JSON.stringify(query)}`
    lastKey.current = key
    const controller = new AbortController()
    const asked = selection
    setDashboard((current) => ({ ...current, loading: true, error: null }))

    fetchDashboard(period, query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setDashboard({ data, selection: asked, loading: false, error: null, loadedAt: new Date() })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          // Figures from another question must not stand under this one's error.
          setDashboard({ data: null, selection: null, loading: false, error: message(problem, 'Panel yüklənmədi'), loadedAt: null })
        }
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, query])

  const data = dashboard.data
  const shownSelection = dashboard.selection ?? selection

  // The attention list first, because that is what opens the drawer; the table next, so a row opened from a
  // page the object is on works too. Not found in either — a new basis dropped it — and the drawer closes.
  const detailRow = detailLocationId === null || data === null
    ? null
    : data.attention.find((item) => item.location.locationId === detailLocationId)?.location
      ?? data.rows.items.find((row) => row.locationId === detailLocationId)
      ?? null
  const root = useScrollMemory<HTMLDivElement>(data !== null)

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    if (resetPage) {
      next.delete('page')
    }

    setParams(next)
  }

  // The chip that says what the table is showing. An older link's price or request filter has no chip.
  const activeChip: CoverageChip | null = group ? { kind: 'group', group }
    : missingPrice ? { kind: 'missingPrice' }
      : historyCoverage === 'Partial' ? { kind: 'partialHistory' }
        : null

  function chipParams(chip: CoverageChip): Record<string, string | undefined> {
    switch (chip.kind) {
      case 'group':
        return { ...noDataFilters, group: chip.group }
      case 'partialHistory':
        return { ...noDataFilters, historyCoverage: 'Partial' }
      case 'missingPrice':
        return { ...noDataFilters, missingPrice: 'true' }
    }
  }

  function selectChip(chip: CoverageChip) {
    const isActive = activeChip !== null && JSON.stringify(activeChip) === JSON.stringify(chip)
    update(isActive ? noDataFilters : chipParams(chip))
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.rows.totalCount / pageSize)) : 1
  const filtered = Boolean(
    search || historyCoverage || priceCoverage || hasCurrentRequest !== undefined || group || missingPrice)

  return (
    <div ref={root}>
      {view === 'Detailed' && (
        <>
        {/*
          The approved design's opening: who this is for, what it is, and the one control that decides how much
          of it is shown. The eyebrow names the organisation because this screen is printed and forwarded.
        */}
        <div className="mb-space-md flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
          <div className="min-w-0">
            <p className="mb-1 flex flex-wrap items-center gap-space-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              <span>İdarəetmə mərkəzi</span>
              <span aria-hidden="true">•</span>
              <span className="font-medium text-secondary">Bakı Abadlıq Xidməti MMC</span>
            </p>
            <h1 className="font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">İdarəetmə paneli</h1>
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
              {data
                ? `${formatMonth(data.summary.selectedPeriod)} üzrə material sifarişlərinin analitikası və obyektlərin xərc dinamikası`
                : 'Material sifarişlərinin analitikası və obyektlərin xərc dinamikası'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-space-sm self-start lg:self-center">
            <div className="flex items-center rounded-xl bg-surface-container-high p-1 shadow-sm" role="group" aria-label="Baxış">
              {dashboardViewOrder.map((option) => {
                const active = option === view
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ view: viewParam(option) })}
                    className={`rounded-lg px-space-md py-1.5 font-label-md text-label-md transition-all ${
                      active
                        ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {dashboardViewLabels[option]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mb-space-lg">
          <FilterRibbon
            periods={available}
            period={period}
            onPeriod={(next) => update({ period: next })}
            scope={scope}
            onScope={(next) => update({ scope: next === 'Monthly' ? undefined : next })}
            selection={selection}
            onSelection={(next) => update(basisParams(next))}
            priorMonths={priorMonths}
            loadedAt={dashboard.loadedAt}
          />
        </div>

        </>
      )}
      {periods.status === 'error' && <ErrorState message={periods.message} />}
      {dashboard.error !== null && <ErrorState message={dashboard.error} />}

      {periods.status === 'success' && available.length === 0 && (
        <EmptyState>Hələ heç bir dövr üzrə daimi sifariş məlumatı yoxdur.</EmptyState>
      )}

      {dashboard.loading && data === null && period !== null && <LoadingRows label="Panel yüklənir" />}

      {data && (
        <div aria-busy={dashboard.loading}>
          {/*
            On a phone the exceptions come directly under the headline (Task 1b's decision), then the cards. The
            page keeps its order and only the phone's layout moves them, so from 1024 pixels the cards stay
            straight under the month, on the first screen (Task 9), and Back still finds the card it left from.
          */}
          <div className="max-lg:flex max-lg:flex-col">
            {view === 'Simple' ? (
              /*
                «Sadə baxış» is the approved Figma Make composition, on this product's own data. It brings its
                own title row and filter bar — the two views are two approved visual languages, and a page half
                in each would be a third design nobody approved. The month, the scope and the comparison are
                the page's own state, shared with «Ətraflı baxış».
              */
              <SimpleDashboard
                data={data}
                periods={available}
                period={period}
                onPeriod={(next) => update({ period: next })}
                scope={scope}
                onScope={(next) => update({ scope: next === 'Monthly' ? undefined : next })}
                view={view}
                onView={(next) => update({ view: viewParam(next) })}
                selection={selection}
                onSelection={(next) => update(basisParams(next))}
                priorMonths={priorMonths}
                loadedAt={dashboard.loadedAt}
                onOpenAll={() => tableHeading.current?.scrollIntoView?.({ block: 'start' })}
              />
            ) : (
              /*
                «Ətraflı baxış» is the approved Stitch composition, on this product's own data: four figures,
                the month against its basis object by object, what the money went on, and the outliers.
              */
              <>
                <KpiGrid
                  summary={data.summary}
                  scope={scope}
                  onShowOutsideMonthly={() => setOutsideMonthlyOpen(true)}
                />

                <div className="mb-space-lg grid grid-cols-1 items-stretch gap-space-lg lg:grid-cols-12">
                  <ComparisonBars
                    summary={data.summary}
                    rows={data.rows.items}
                    selection={shownSelection}
                    onOpenAll={() => tableHeading.current?.scrollIntoView?.({ block: 'start' })}
                  />
                  <CategoryBreakdown categories={data.summary.categories} scope={scope} />
                </div>
              </>
            )}
            {/*
              The object's own decomposition, beside the page rather than instead of it. Looked up in the answer
              on screen, so a drawer left open across a change of basis shows the month the page is showing or
              closes itself — never a figure from the answer before.
            */}
            {detailRow && (
              <ChangeDetailDrawer
                row={detailRow}
                basis={data.summary.basis}
                baselinePeriods={data.summary.baselinePeriods}
                selection={shownSelection}
                onClose={() => setDetailLocationId(null)}
              />
            )}

            {outsideMonthlyOpen && (
              <OutsideMonthlyPanel
                period={data.summary.selectedPeriod.slice(0, 7)}
                onClose={() => setOutsideMonthlyOpen(false)}
              />
            )}

            {/*
              Which objects to read, and why — straight under the month, on the first screen. «Sadə baxış»
              carries its own cards inside its composition, so this is the detailed view's.
            */}
            {view === 'Detailed' && (
              <div className="max-lg:order-2">
                <AttentionCards
                  attention={data.attention}
                  summary={data.summary}
                  selection={shownSelection}
                  onOpenDetail={(item) => setDetailLocationId(item.location.locationId)}
                />
              </div>
            )}

            {/*
              Who is outside the comparison, object by object. In «Sadə baxış» that is a count on the list above
              and the names are one click away, because naming three groups here is the density the redesign is
              about; nothing is hidden, it is one level deeper.
            */}
            {view === 'Detailed' && (
              <div className="max-lg:order-1">
                <DashboardExceptions summary={data.summary} selection={shownSelection} />
              </div>
            )}
          </div>

          <h2 ref={tableHeading} className="mb-space-sm scroll-mt-20 font-headline-md text-headline-md font-bold text-on-surface">Bütün obyektlər</h2>

          {/* The chips sit directly over the table they filter, and a chip opens exactly the objects it counts. */}
          <DashboardCoverageChips summary={data.summary} active={activeChip} onSelect={selectChip} />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim() }) }}>
              <label className="sr-only" htmlFor="dashboard-search">Obyekt adı üzrə axtar</label>
              <input
                id="dashboard-search"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Obyekt adı üzrə axtar"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-space-md py-1.5 font-body-md text-body-md sm:w-72"
              />
            </form>

            <label className="text-sm">
              <span className="sr-only">Sıralama</span>
              <select
                value={sortOption.sort}
                onChange={(event) => {
                  const chosen = dashboardSortOption(event.target.value)
                  // The default is written as nothing, so the address a reader shares stays the plain one.
                  update(chosen === dashboardSortOptions[0]
                    ? { sort: undefined, descending: undefined }
                    : { sort: chosen.sort, descending: chosen.descending ? 'true' : undefined })
                }}
                className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              >
                {dashboardSortOptions.map((option) => (
                  <option key={option.sort} value={option.sort}>{option.label}</option>
                ))}
              </select>
            </label>

            {filtered && (
              <button
                type="button"
                onClick={() => update({ search: undefined, ...noDataFilters })}
                className="text-sm text-slate-500 underline hover:text-slate-800"
              >
                Filtri təmizlə
              </button>
            )}

            <span className="ml-auto text-xs text-slate-500">
              {formatCount(data.filteredLocationCount)} obyekt göstərilir
              {data.filteredLocationCount !== data.summary.locationCount && <> ({formatCount(data.summary.locationCount)} obyektdən)</>}
            </span>
          </div>

          <div className={dashboard.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {data.rows.items.length === 0 && (
              <EmptyState>{filtered ? 'Bu filtrə uyğun obyekt tapılmadı.' : 'Bu dövr üzrə sifariş məlumatı yoxdur.'}</EmptyState>
            )}

            {data.rows.items.length > 0 && (
              <LocationRows rows={data.rows.items} summary={data.summary} selection={shownSelection} />
            )}
          </div>

          {data.rows.totalCount > data.rows.pageSize && (
            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span>Səhifə {data.rows.page} / {totalPages} · {formatCount(data.rows.totalCount)} obyekt</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
                  Əvvəlki
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
                  Növbəti
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function message(problem: unknown, fallback: string): string {
  return problem instanceof Error && problem.message ? problem.message : fallback
}
