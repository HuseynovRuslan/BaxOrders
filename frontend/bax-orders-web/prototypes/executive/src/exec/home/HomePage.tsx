import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AlertTriangle, CalendarDays, CircleCheck, Clock3, Filter, Layers, Map as MapIcon, MapPin, ShieldCheck } from 'lucide-react'
import { kindOptions, readKind } from '../../data/analysis'
import { YEARS } from '../../data/model'
import { kindNames, updatedText } from '../../lib/year'
import { buildInsights } from '../../overview/insights'
import { kindParam, overviewLinks } from '../../overview/links'
import {
  approvalSplit, compareYears, isInProgress, latestYear, monthPairs, monthsFor, periodById, periodOptions, periodTotal, previousYearOf, shareBy, shortRange,
  type StatusFilter,
} from '../../overview/metrics'
import { freshness } from '../../overview/status'
import { EmptyNote, FilterSelect, type SelectOption } from '../ui'
import { ApprovalStatus, InsightList, KpiCards, Methodology, ShareCard, UpdateHistory } from './sections'
import { YoyChart } from './YoyChart'

/*
 * «Ümumi baxış» (Konsept A.3): the executive's first screen. The latest year against the year before over the same
 * months, what waits for approval, month by month, where the money went, and how current the figures are. One set of
 * filters — the period, the kind of order, the approval — lives in the address and every card reads it, so no two
 * cards ever speak of different months. The year cards open the year screens as they are (`/2025`, `/2026`).
 */

const periodParam = 'dovr'
const statusParam = 'status'
const statusValues: Record<StatusFilter, string> = { all: '', approved: 'tesdiq', pending: 'gozleyir' }

export function readStatus(value: string | null): StatusFilter {
  return (Object.entries(statusValues).find(([, param]) => param && param === value)?.[0] as StatusFilter | undefined) ?? 'all'
}

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const focusYear = latestYear()
  const previousYear = previousYearOf(focusYear)
  const kind = readKind(params.get(kindParam))
  // Approval is the monthly package's: under another kind the filter has nothing to choose.
  const status: StatusFilter = kind === 'monthly' ? readStatus(params.get(statusParam)) : 'all'
  const options = periodOptions(focusYear)
  const period = periodById(focusYear, params.get(periodParam))

  const view = useMemo(() => {
    const months = monthsFor(focusYear, period, status, kind)
    const comparison = compareYears(focusYear, months, kind)
    const pairs = monthPairs(focusYear, months, kind)
    const pendingSplit = approvalSplit(focusYear, months)
    const sites = shareBy(focusYear, months, kind, 'site')
    const roots = shareBy(focusYear, months, kind, 'root')
    const insights = buildInsights({ focusYear, previousYear, kind, pairs, sites, roots, limit: 5 })
    const running = months.find((month) => isInProgress(focusYear, month)) ?? null
    // The earlier year's own card covers the whole period (all of 2025, not only January–November); the change above it
    // is still read over the months both years have. Under an approval filter the months are the focus year's choice, so
    // the earlier year is read over the same ones and this stays null.
    const previousTotal = previousYear !== null && period && status === 'all' ? periodTotal(previousYear, period.span, kind) : null
    return { months, comparison, pairs, pending: { amount: pendingSplit.pending, months: pendingSplit.pendingMonths }, sites, roots, insights, running, previousTotal }
    // The period is looked up afresh each render; its id is what changes the figures.
  }, [focusYear, previousYear, period?.id, status, kind]) // eslint-disable-line react-hooks/exhaustive-deps

  // A new filter is a new reading of the same screen: it replaces the entry and keeps the scroll.
  function write(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const fresh = freshness()
  const total = view.sites.reduce((sum, row) => sum + row.amount, 0)

  if (YEARS.length === 0 || !period) {
    return (
      <>
        <Header fresh={fresh} />
        <EmptyNote title="Məlumat yoxdur">Excel kitabı yüklənəndən sonra icmal burada görünəcək.</EmptyNote>
      </>
    )
  }

  const periodChoices: SelectOption[] = options.map((option) => ({
    value: option.id,
    label: option.label,
    display: option.group === 'ytd' ? shortRange(option.months) : undefined,
    group: option.group === 'ytd' ? undefined : option.group === 'quarter' ? 'Rüb' : 'Ay',
  }))
  const kindChoices: SelectOption[] = kindOptions.map((option) => ({ value: option.value, label: option.label }))
  const statusChoices: SelectOption[] = [
    { value: 'all', label: 'Hamısı' },
    { value: 'approved', label: 'Təsdiqlənmiş aylar' },
    { value: 'pending', label: 'Təsdiq gözləyən aylar' },
  ]

  return (
    <>
      <Header
        fresh={fresh}
        filters={(
          <>
            <FilterSelect icon={CalendarDays} label="Dövr" value={period.id} options={periodChoices} onChange={(value) => write({ [periodParam]: value === 'ytd' ? null : value })} />
            <FilterSelect
              icon={Filter}
              label="Növ"
              value={kind}
              options={kindChoices}
              onChange={(value) => write({ [kindParam]: kindOptions.find((option) => option.value === value)?.param || null, ...(value !== 'monthly' ? { [statusParam]: null } : {}) })}
            />
            <FilterSelect
              icon={ShieldCheck}
              label="Təsdiq"
              value={status}
              options={statusChoices}
              disabled={kind !== 'monthly'}
              title={kind !== 'monthly' ? 'Təsdiq yalnız aylıq sifarişlərə aiddir' : undefined}
              onChange={(value) => write({ [statusParam]: statusValues[value as StatusFilter] || null })}
            />
          </>
        )}
      />

      {view.months.length === 0 ? (
        <EmptyNote
          title={status === 'pending' ? 'Bu dövrdə təsdiq gözləyən ay yoxdur' : status === 'approved' ? 'Bu dövrdə təsdiqlənmiş ay yoxdur' : 'Bu dövrdə məlumat yoxdur'}
          action={<button type="button" onClick={() => write({ [statusParam]: null, [periodParam]: null })} className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-(--x-line-2) px-4 text-sm font-semibold hover:bg-(--x-band)">Filtrləri sıfırla</button>}
        >
          {`${kindNames[kind]}: seçilmiş dövr və təsdiq filtri üzrə ${focusYear} ilində ay tapılmadı.`}
        </EmptyNote>
      ) : (
        <>
          <KpiCards
            comparison={view.comparison}
            kind={kind}
            pending={view.pending}
            period={period}
            status={status}
            previousTotal={view.previousTotal}
            running={view.running}
          />
          <Methodology comparison={view.comparison} kind={kind} inProgress={view.running} previousTotal={view.previousTotal} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
            <YoyChart key={`${period.id}-${kind}-${status}`} pairs={view.pairs} focusYear={focusYear} previousYear={previousYear} kind={kind} />
            <InsightList insights={view.insights} focusYear={focusYear} previousYear={previousYear} />
          </div>

          <ApprovalStatus key={`${period.id}-${status}`} months={view.months} focusYear={focusYear} previousYear={previousYear} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ShareCard
              title="Ərazilər üzrə xərc"
              noun="ərazi"
              icon={MapPin}
              rows={view.sites}
              total={total}
              previousYear={previousYear}
              hrefOf={(row) => overviewLinks.siteYear(focusYear, row.id, kind)}
              more={(
                <span className="flex gap-4">
                  <Link to={overviewLinks.map()} className="inline-flex items-center gap-1.5 font-semibold text-(--x-link) underline-offset-4 hover:underline"><MapIcon aria-hidden="true" className="size-4" />Xəritədə</Link>
                  <Link to={overviewLinks.grouped(focusYear, 'obyekt', kind)} className="font-semibold text-(--x-link) underline-offset-4 hover:underline">Hamısı ({view.sites.length})</Link>
                </span>
              )}
            />
            <ShareCard
              title="Kateqoriyalar üzrə xərc"
              noun="ana kateqoriya"
              icon={Layers}
              rows={view.roots}
              total={total}
              previousYear={previousYear}
              hrefOf={(row) => overviewLinks.rootYear(focusYear, row.id, kind)}
              more={<Link to={overviewLinks.grouped(focusYear, 'ana', kind)} className="font-semibold text-(--x-link) underline-offset-4 hover:underline">Hamısı ({view.roots.length})</Link>}
            />
          </div>
        </>
      )}

      <UpdateHistory />
    </>
  )
}

function Header({ fresh, filters }: { fresh: ReturnType<typeof freshness>; filters?: ReactNode }) {
  const ok = fresh.state === 'current' || fresh.state === 'behind'
  const StatusIcon = ok ? CircleCheck : AlertTriangle
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h1 id="page-title" tabIndex={-1} className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.025em] outline-none sm:text-[40px]">
          İdarəetmə mərkəzi
        </h1>
        <p className="mt-1.5 text-lg text-(--x-ink-2)">Bütün illərin sifariş və xərc icmalı</p>
        <p className="mt-3 flex items-start gap-2 text-[15px]">
          <StatusIcon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${ok ? 'text-(--x-ok)' : 'text-(--x-amber)'}`} strokeWidth={2} />
          <span><span className="font-bold">Məlumat statusu:</span> <span className="text-(--x-ink-2)">{fresh.text}.</span></span>
        </p>
      </div>
      <div className="flex flex-col gap-3 xl:items-end">
        <p className="flex items-center gap-2 text-[15px] text-(--x-ink-2)">
          <Clock3 aria-hidden="true" className="size-5" strokeWidth={2} />
          Yenilənib: <span className="font-semibold text-(--x-ink)">{updatedText}</span>
        </p>
        {filters && (
          <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
            {filters}
            <span className="hidden border-l border-(--x-line-2) pl-4 text-[15px] text-(--x-ink-2) 2xl:inline" title="İki il həmişə eyni aylar üzrə müqayisə olunur">Eyni aylar üzrə</span>
          </div>
        )}
      </div>
    </header>
  )
}

