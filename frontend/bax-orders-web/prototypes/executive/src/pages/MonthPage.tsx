import { Link, useParams, useSearchParams } from 'react-router'
import { Check, ChevronLeft, ChevronRight, Hourglass, Wrench } from 'lucide-react'
import {
  approvalOf, basisOptions, categoryRows, figure, hasData, isValidMonth, linesFor, outsideRequestsIn, siteRows,
  type Basis, type BreakdownRow, type Figure, type Kind, type Period,
} from '../data/analysis'
import { TODAY, YEAR } from '../data/model'
import { minus, money, moneyParts, monthName, monthRange, percent, signedMoney } from '../lib/format'
import { paths, useComparison } from '../lib/links'
import { kindNames, kindOrder } from '../lib/year'
import { OutsideFlowNote, OutsideRequestList } from '../ui/kinds'
import { NotFound } from './NotFound'
import { Chip } from './YearKpi'
import './year.css'

export const viewParam = 'bax'
const sortParam = 'sira'

/**
 * Screen 2 — one month, in the year's «Modern Analytics» style. Built to answer one question first: why did this month
 * differ from the one it is compared with? So the top holds only what the answer needs — the month's amount, the
 * comparison's amount and the difference — then one or two sentences naming the part that moved the most, then the
 * parts themselves, the largest change first, each a way down: Ana → Orta → Alt → Məhsul (prices and quantities on the
 * product pages), or the object and its own categories.
 *
 * The figures are about one kind of order at a time (owner, 2026-10-18): the monthly orders by default, whose approval
 * is the month's, given once by the Rəhbər, usually by the 15th and sometimes later; the outside-monthly requests on
 * their own, each with its separate consent; or «Hamısı», spending, never an amount to approve. The month is compared
 * whole — October's orders with September's — never a range of days.
 */
export function MonthPage() {
  const params = useParams()
  const year = Number(params.year)
  const month = Number(params.month)
  const [search, setSearch] = useSearchParams()
  const comparison = useComparison(month)

  if (year !== YEAR || !isValidMonth(month)) return <NotFound />
  if (!hasData(month)) {
    const future = month > TODAY.month
    return <NotFound message={`${monthName(month)} ${YEAR} ${future ? 'hələ başlamayıb' : 'üzrə məlumat yoxdur'}.`} />
  }

  const { period, basis, setBasis, kind, link } = comparison
  const bySite = search.get(viewParam) === 'obyektler'
  const view = bySite ? 'obyektler' : ''
  const byAmount = search.get(sortParam) === 'mebleg'
  const total = figure(month, period, { kind })
  const categories = categoryRows(month, period, kind, null)
  const objects = siteRows(month, period, kind)
  const siteCount = new Set(linesFor(month, { kind }).map((line) => line.siteId)).size
  const requests = outsideRequestsIn(month)
  const rows = bySite ? objects : categories
  const rowHref = (row: BreakdownRow) => link(bySite ? paths.site(YEAR, month, row.id) : paths.category(YEAR, month, row.id))
  // The order of the rows is a reading of the same table: it replaces the entry and keeps the scroll.
  const setSort = (amount: boolean) => {
    const next = new URLSearchParams(search)
    if (amount) next.set(sortParam, 'mebleg')
    else next.delete(sortParam)
    setSearch(next, { replace: true, preventScrollReset: true })
  }
  const keep = (extra: Record<string, string> = {}) => ({ [viewParam]: view, ...(byAmount ? { [sortParam]: 'mebleg' } : {}), ...extra })

  return (
    // Tighter than the page's own rhythm, so the figures, the reason and most of the table share the first screen.
    <div className="month-view flex flex-col gap-3 lg:-mt-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            {/* Where the month sits: the year it belongs to, one step up, as the first word of the heading. */}
            <div className="flex items-baseline gap-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
              <Link to={link(paths.year(YEAR))} aria-label={`İllik icmal ${YEAR}`} className="rounded text-(--y-muted) hover:text-(--y-bar)">{YEAR}</Link>
              <span aria-hidden="true" className="font-normal text-(--y-line)">/</span>
              <h1 id="page-title" tabIndex={-1} className="outline-none">{monthName(month)}<span className="sr-only"> {YEAR}</span></h1>
            </div>
            <MonthStepper month={month} link={(path) => link(path, keep())} />
          </div>
          <KindStatus kind={kind} month={month} />
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <nav aria-label="Sifariş növü" className="grid grid-cols-[0.8fr_1.5fr_1fr] rounded-lg border border-(--y-line) bg-(--y-surface) p-1 sm:flex">
            {kindOrder.map((value) => (
              <Link
                key={value}
                to={link(paths.month(YEAR, month), keep(), { kind: value })}
                replace
                aria-current={value === kind ? 'true' : undefined}
                className={`flex min-h-9 items-center justify-center whitespace-nowrap rounded-md px-2 text-sm font-semibold transition-colors sm:px-3 ${
                  value === kind ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'
                }`}
              >
                <span className="sm:hidden">{value === 'monthly' ? 'Aylıq' : kindNames[value]}</span>
                <span className="hidden sm:inline">{kindNames[value]}</span>
              </Link>
            ))}
          </nav>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) py-1 pl-3 pr-1 text-sm">
            <span className="whitespace-nowrap text-(--y-muted)">Müqayisə üçün</span>
            <select
              value={basis}
              onChange={(event) => setBasis(event.target.value as Basis)}
              className="h-9 min-w-0 flex-1 rounded-md bg-transparent pl-1 pr-7 font-semibold text-(--y-ink)"
            >
              {basisOptions.map((option) => <option key={option.value} value={option.value} className="bg-(--y-surface)">{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <Figures
        month={month}
        kind={kind}
        period={period}
        total={total}
        note={kind === 'outside' ? `${requests.length} sifariş, ${siteCount} obyektdə` : `${siteCount} obyektdə sifariş`}
      />

      <KeyChange rows={rows} total={total} period={period} bySite={bySite} hrefOf={rowHref} />

      <section aria-labelledby="parts-title" className="rounded-xl border border-(--y-line) bg-(--y-surface)">
        <h2 id="parts-title" className="sr-only">{bySite ? 'Obyektlər üzrə' : 'Ana kateqoriyalar üzrə'}</h2>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-(--y-line) px-3 pt-1 sm:px-4">
          <nav aria-label="Görünüş" className="-mb-px flex gap-5">
            {[
              { label: 'Kateqoriyalar', count: categories.length, active: !bySite, to: link(paths.month(YEAR, month), keep({ [viewParam]: '' })) },
              { label: 'Obyektlər', count: objects.length, active: bySite, to: link(paths.month(YEAR, month), keep({ [viewParam]: 'obyektler' })) },
            ].map((tab) => (
              <Link
                key={tab.label}
                to={tab.to}
                replace
                aria-current={tab.active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 border-b-2 text-sm font-bold transition-colors ${
                  tab.active ? 'border-(--y-bar) text-(--y-ink)' : 'border-transparent text-(--y-muted) hover:text-(--y-ink)'
                }`}
              >
                {tab.label}
                <span className={`tnum rounded-full px-1.5 text-xs ${tab.active ? 'bg-(--y-band) text-(--y-bar)' : 'bg-(--y-grid) text-(--y-muted)'}`}>{tab.count}</span>
              </Link>
            ))}
          </nav>
          <div role="group" aria-label="Sıralama" className="mb-1.5 flex rounded-lg border border-(--y-line) p-0.5 text-xs font-semibold">
            {[{ amount: false, label: 'Fərqə görə' }, { amount: true, label: 'Məbləğə görə' }].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={byAmount === option.amount}
                onClick={() => setSort(option.amount)}
                className={`rounded-md px-2.5 py-1.5 ${byAmount === option.amount ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <PartsTable
          rows={rows}
          total={total}
          period={period}
          month={month}
          nameHeader={bySite ? 'Obyekt' : 'Ana kateqoriya'}
          byAmount={byAmount}
          hrefOf={rowHref}
        />
      </section>

      {kind === 'outside' && (
        <section aria-labelledby="outside-title" className="flex flex-col gap-3">
          <h2 id="outside-title" className="text-base font-bold">{monthName(month)} ayının aylıqdan kənar sifarişləri</h2>
          <OutsideFlowNote />
          <OutsideRequestList requests={requests} siteLink link={(siteId) => link(paths.site(YEAR, month, siteId))} />
        </section>
      )}
    </div>
  )
}

/**
 * Beside the month's name, what its figures are, in the kind's own terms: the monthly orders' one approval — given
 * once a month, usually by the 15th, sometimes later; waiting is not late — the outside-monthly requests' separate
 * consent, or «Hamısı» as spending only.
 */
function KindStatus({ kind, month }: { kind: Kind; month: number }) {
  if (kind === 'monthly') {
    const approval = approvalOf(month)
    if (!approval) return null
    return approval.state === 'approved' ? (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-(--y-ok)/12 px-2.5 py-1 text-sm font-semibold text-(--y-ok)">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.75} />
        Sifarişlər təsdiqlənib
        {approval.approvedOn && <span className="font-medium text-(--y-ink-2)">· {approval.approvedOn.day} {monthName(approval.approvedOn.month).toLocaleLowerCase('az')}</span>}
      </span>
    ) : (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-(--y-amber-soft) px-2.5 py-1 text-sm font-semibold text-(--y-amber)"
        title="Rəhbər ayın aylıq sifarişlərini ayda bir dəfə təsdiqləyir — adətən ayın 15-nə qədər, bəzən daha gec. Gözləmək gecikmə demək deyil."
      >
        <Hourglass aria-hidden="true" className="size-4" strokeWidth={2.25} />
        Sifarişlər təsdiq gözləyir
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-(--y-band) px-2.5 py-1 text-sm font-semibold text-(--y-ink-2)">
      {kind === 'outside' && <Wrench aria-hidden="true" className="size-4" />}
      {kind === 'outside' ? 'Hər sifariş ayrıca razılıqla' : 'Ümumi xərc · təsdiq məbləği deyil'}
    </span>
  )
}

/** The three figures the month is read by: its amount, the comparison's, and the difference in manats and per cent. */
function Figures({ month, kind, period, total, note }: { month: number; kind: Kind; period: Period; total: Figure; note: string }) {
  const { whole } = moneyParts(Math.round(total.current))
  const missing = period.unavailable || period.incomplete
  const way = total.delta === null ? null : Math.abs(total.delta) < 0.005 ? 'flat' : total.delta > 0 ? 'up' : 'down'
  const comparisonLabel = period.unavailable ? 'Müqayisə dövrü' : period.isAverage ? `${basisLabel(period.basis)}` : `${monthName(period.months[0])} ${YEAR}`
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-(--y-line) bg-(--y-line) lg:grid-cols-[1.25fr_1fr_1.15fr]">
      <div className="col-span-2 bg-(--y-surface) px-5 py-3 lg:col-span-1">
        <dt className="text-xs font-semibold text-(--y-muted)">{monthName(month)} {YEAR} · {kindNames[kind]}</dt>
        <dd className="tnum mt-1 text-[30px] font-extrabold leading-none tracking-[-0.02em]">
          {whole}<span className="text-[0.5em] font-bold text-(--y-ink-2)"> ₼</span>
        </dd>
        <dd className="mt-1 text-xs text-(--y-muted)">{kind === 'all' ? `${note} · ümumi xərc, təsdiq məbləği deyil` : note}</dd>
      </div>
      <div className="bg-(--y-surface) px-5 py-3">
        <dt className="text-xs font-semibold text-(--y-muted)">{comparisonLabel}</dt>
        {missing ? (
          <dd className="mt-1.5 text-sm text-(--y-muted)">
            {period.unavailable ? 'Müqayisə üçün əvvəlki ay yoxdur.' : `Məlumat azdır: ${period.wanted} ay lazımdır, ${period.months.length} ay var.`}
          </dd>
        ) : (
          <>
            <dd className="tnum mt-1.5 text-xl font-bold leading-none">{money(total.comparison)}</dd>
            <dd className="mt-1 text-xs text-(--y-muted)">{period.isAverage ? `${monthRange(period.months, YEAR)} · aylıq ortalama` : 'bütün ayın sifarişləri'}</dd>
          </>
        )}
      </div>
      <div className="bg-(--y-surface) px-5 py-3">
        <dt className="text-xs font-semibold text-(--y-muted)">Fərq</dt>
        {missing || total.delta === null ? (
          <dd className="mt-1.5 text-sm text-(--y-muted)">Fərq göstərilmir.</dd>
        ) : (
          <dd className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={`tnum text-xl font-extrabold leading-none ${way === 'up' ? 'text-(--y-up)' : way === 'down' ? 'text-(--y-down)' : ''}`}>{signedMoney(total.delta)}</span>
            {total.pct !== null && way && <Chip change={{ kind: 'value', way, pct: total.pct, delta: total.delta, text: percent(total.pct) }} />}
          </dd>
        )}
      </div>
    </dl>
  )
}

const basisLabel = (basis: Basis) => basisOptions.find((option) => option.value === basis)!.label

/**
 * «Əsas dəyişiklik»: the one part — category or object, as the table below — whose change in money was the largest,
 * in a sentence, and what all the others came to together. Read from the table's own figures, nothing added; where the
 * comparison cannot be made, it says only that.
 */
function KeyChange({ rows, total, period, bySite, hrefOf }: { rows: readonly BreakdownRow[]; total: Figure; period: Period; bySite: boolean; hrefOf: (row: BreakdownRow) => string }) {
  const noun = bySite ? { of: 'obyektində', others: 'Digər obyektlərin' } : { of: 'kateqoriyasında', others: 'Digər kateqoriyaların' }
  const body = (() => {
    if (period.unavailable || period.incomplete || total.delta === null) {
      return <>Müqayisə üçün məlumat {period.unavailable ? 'yoxdur' : 'azdır'}, ona görə əsas dəyişiklik göstərilmir.</>
    }
    const top = [...rows].filter((row) => row.figure.delta !== null && Math.abs(row.figure.delta) >= 0.005)
      .sort((left, right) => Math.abs(right.figure.delta!) - Math.abs(left.figure.delta!))[0]
    if (!top) return <>Heç bir {bySite ? 'obyektdə' : 'kateqoriyada'} məbləğ dəyişməyib.</>
    const delta = top.figure.delta!
    const rest = Math.round((total.delta! - delta) * 100) / 100
    const name = <Link to={hrefOf(top)} className="font-bold text-(--y-bar) underline decoration-(--y-bar)/40 underline-offset-4 hover:decoration-(--y-bar)">{top.name}</Link>
    const first = !top.figure.hasCurrent
      ? <>{name} {noun.of} bu ay sifariş yoxdur; müqayisə dövründə {money(top.figure.comparison)} idi.</>
      : !top.figure.hasComparison
        ? <>{name} {noun.of} müqayisə dövründə sifariş yox idi; bu ay {money(top.figure.current)} sifariş edilib.</>
        : <>{name} {noun.of} sifariş məbləği <Amount value={Math.abs(delta)} way={delta > 0 ? 'up' : 'down'} /> {delta > 0 ? 'artıb' : 'azalıb'}{top.figure.pct !== null && <> ({percent(top.figure.pct)})</>}.</>
    return (
      <>
        {first}
        {rows.length > 1 && <> {noun.others} birlikdə xalis fərqi <Amount value={rest} signed /> təşkil edir.</>}
      </>
    )
  })()
  return (
    <section aria-labelledby="key-change" className="flex flex-col gap-1 rounded-xl border border-(--y-line) border-l-[3px] border-l-(--y-bar) bg-(--y-surface) px-5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
      <h2 id="key-change" className="shrink-0 text-xs font-bold text-(--y-bar)">Əsas dəyişiklik</h2>
      <p className="text-[15px] leading-relaxed text-(--y-ink)">{body}</p>
    </section>
  )
}

/** An amount in a sentence, in the cost colour of its direction. */
function Amount({ value, way, signed = false }: { value: number; way?: 'up' | 'down'; signed?: boolean }) {
  const direction = way ?? (Math.abs(value) < 0.005 ? undefined : value > 0 ? 'up' : 'down')
  const text = signed ? (Math.abs(value) < 0.005 ? '0,00 ₼' : `${value > 0 ? '+' : minus}${money(Math.abs(value))}`) : money(value)
  return <span className={`tnum whitespace-nowrap font-bold ${direction === 'up' ? 'text-(--y-up)' : direction === 'down' ? 'text-(--y-down)' : ''}`}>{text}</span>
}

/**
 * The month's parts against the comparison: the name, this month, the comparison, the change in manats and per cent.
 * The largest change first (or the largest amount); every row, nothing cut; the whole row opens the next level. The
 * «Cəmi» row closes it with the same figures as the top of the page — the parts describe one sum, never another.
 */
function PartsTable({ rows, total, period, month, nameHeader, byAmount, hrefOf }: {
  rows: readonly BreakdownRow[]
  total: Figure
  period: Period
  month: number
  nameHeader: string
  byAmount: boolean
  hrefOf: (row: BreakdownRow) => string
}) {
  if (rows.length === 0) return <p className="p-6 text-center text-sm text-(--y-muted)">Bu növdə bu ay sifariş yoxdur.</p>
  const comparable = !period.unavailable
  const sorted = byAmount || !comparable
    ? rows
    : [...rows].sort((left, right) => Math.abs(right.figure.delta ?? 0) - Math.abs(left.figure.delta ?? 0) || right.figure.current - left.figure.current)
  const against = period.unavailable ? 'Müqayisə' : period.isAverage ? 'Ortalama' : monthName(period.months[0])
  const grid = 'md:grid-cols-[minmax(0,1fr)_9rem_9rem_9.5rem_5rem_1rem]'
  return (
    <div role="table" aria-label={nameHeader}>
      <div role="row" className={`hidden gap-x-4 border-b border-(--y-line) px-5 py-2 text-[11px] font-semibold text-(--y-muted) md:grid ${grid}`}>
        <span role="columnheader">{nameHeader}</span>
        <span role="columnheader" className="text-right">{monthName(month)}</span>
        <span role="columnheader" className="text-right">{against}</span>
        <span role="columnheader" className="text-right">Fərq, ₼</span>
        <span role="columnheader" className="text-right">Fərq, %</span>
        <span />
      </div>
      <div role="rowgroup">
        {sorted.map((row) => (
          <div key={row.id} role="row" className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-(--y-line) px-4 py-2.5 transition-colors hover:bg-(--y-band) sm:px-5 md:py-2 ${grid}`}>
            <span role="cell" className="row-span-2 min-w-0 md:row-span-1">
              <Link to={hrefOf(row)} className="stretched block truncate text-sm font-semibold focus-visible:outline-offset-[-2px] group-hover:text-(--y-bar)" title={row.name}>{row.name}</Link>
              <span className="tnum mt-0.5 block text-xs text-(--y-muted) md:hidden">{against}: {comparisonText(row.figure, comparable)}</span>
            </span>
            <span role="cell" className="tnum text-right text-sm font-bold">{row.figure.hasCurrent ? money(row.figure.current) : <span className="font-normal text-(--y-muted)">bu ay yoxdur</span>}</span>
            <span role="cell" className="tnum hidden text-right text-sm text-(--y-ink-2) md:block">{comparisonText(row.figure, comparable)}</span>
            <span role="cell" className="col-start-2 flex items-center justify-end gap-2 md:col-start-auto md:block md:text-right">
              <DeltaMoney figure={row.figure} comparable={comparable} />
              <span className="md:hidden"><DeltaPct figure={row.figure} comparable={comparable} /></span>
            </span>
            <span role="cell" className="hidden justify-end md:flex"><DeltaPct figure={row.figure} comparable={comparable} /></span>
            <ChevronRight aria-hidden="true" className="hidden size-4 justify-self-end text-(--y-muted) group-hover:text-(--y-bar) md:block" />
          </div>
        ))}
      </div>
      <div role="row" className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 rounded-b-xl bg-(--y-band)/50 px-4 py-2.5 sm:px-5 ${grid}`}>
        <span role="rowheader" className="text-sm font-bold">Cəmi</span>
        <span role="cell" className="tnum text-right text-sm font-extrabold">{money(total.current)}</span>
        <span role="cell" className="tnum hidden text-right text-sm font-semibold text-(--y-ink-2) md:block">{comparable ? money(total.comparison) : '—'}</span>
        <span role="cell" className="col-start-2 flex items-center justify-end gap-2 md:col-start-auto md:block md:text-right">
          <DeltaMoney figure={total} comparable={comparable} />
          <span className="md:hidden"><DeltaPct figure={total} comparable={comparable} /></span>
        </span>
        <span role="cell" className="hidden justify-end md:flex"><DeltaPct figure={total} comparable={comparable} /></span>
        <span />
      </div>
    </div>
  )
}

const comparisonText = (f: Figure, comparable: boolean) => (!comparable ? '—' : f.hasComparison ? money(f.comparison) : 'yox idi')

function DeltaMoney({ figure: f, comparable }: { figure: Figure; comparable: boolean }) {
  if (!comparable || f.delta === null) return <span className="text-sm text-(--y-muted)">—</span>
  const tone = Math.abs(f.delta) < 0.005 ? 'text-(--y-muted)' : f.delta > 0 ? 'text-(--y-up)' : 'text-(--y-down)'
  return <span className={`tnum text-sm font-semibold ${tone}`}>{signedMoney(f.delta)}</span>
}

function DeltaPct({ figure: f, comparable }: { figure: Figure; comparable: boolean }) {
  if (!comparable || f.delta === null) return <span className="text-xs text-(--y-muted)">—</span>
  if (!f.hasComparison || f.pct === null) return <span className="rounded-full bg-(--y-band) px-1.5 py-0.5 text-[11px] font-bold text-(--y-bar)">yeni</span>
  const way = Math.abs(f.delta) < 0.005 ? 'flat' : f.delta > 0 ? 'up' : 'down'
  return <Chip change={{ kind: 'value', way, pct: f.pct, delta: f.delta, text: percent(f.pct) }} />
}

/** The month before and after, keeping the comparison, the kind, the view and the order. A month not begun cannot be opened. */
function MonthStepper({ month, link }: { month: number; link: (path: string) => string }) {
  const previous = hasData(month - 1) ? month - 1 : null
  const next = hasData(month + 1) ? month + 1 : null
  const button = 'inline-flex size-9 items-center justify-center rounded-lg border border-(--y-line) bg-(--y-surface) text-(--y-ink-2) hover:border-(--y-bar) hover:text-(--y-bar)'
  const off = 'inline-flex size-9 items-center justify-center rounded-lg border border-(--y-line) text-(--y-line)'
  return (
    <span className="inline-flex gap-1" role="group" aria-label="Ay">
      {previous ? (
        <Link to={link(paths.month(YEAR, previous))} aria-label={`Əvvəlki ay: ${monthName(previous)}`} className={button}><ChevronLeft className="size-4" /></Link>
      ) : <span className={off} aria-hidden="true"><ChevronLeft className="size-4" /></span>}
      {next ? (
        <Link to={link(paths.month(YEAR, next))} aria-label={`Növbəti ay: ${monthName(next)}`} className={button}><ChevronRight className="size-4" /></Link>
      ) : <span className={off} title={`${monthName(month + 1) ?? ''} hələ başlamayıb`} aria-hidden="true"><ChevronRight className="size-4" /></span>}
    </span>
  )
}
