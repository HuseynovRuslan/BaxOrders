import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, Hourglass, Info, Minus, TriangleAlert } from 'lucide-react'
import { basisOptions, type Basis, type Figure, type Period } from '../data/analysis'
import { YEAR, type MonthApproval } from '../data/model'
import { direction, directionWords, monthName, moneyParts, percent, signedMoney } from '../lib/format'

// ---- figures ------------------------------------------------------------------------------------------------------

/** A money figure; at display sizes the qəpik is set smaller, so the manats are what the eye reads first. */
export function Money({ value, size = 'md', className = '' }: { value: number | null; size?: 'xl' | 'lg2' | 'lg' | 'md' | 'sm'; className?: string }) {
  if (value === null) return <span className={`tnum text-muted ${className}`}>—</span>
  const { whole, cents } = moneyParts(value)
  const display = size === 'xl' || size === 'lg2' || size === 'lg'
  return (
    <span className={`tnum whitespace-nowrap ${display ? 'font-figure font-semibold tracking-tight' : ''} ${sizeClass[size]} ${className}`}>
      {whole}
      <span className={display ? 'text-[0.6em] font-medium' : ''}>,{cents}</span>
      <span className={display ? 'ml-1.5 text-[0.55em] font-medium text-ink-2' : 'ml-1'}>₼</span>
    </span>
  )
}

const sizeClass = {
  xl: 'text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.1]',
  lg2: 'text-[clamp(2rem,4.5vw,2.75rem)] leading-[1.1]',
  lg: 'text-[clamp(1.5rem,3.6vw,2rem)] leading-[1.15]',
  md: 'text-base',
  sm: 'text-sm',
}

const tone = { up: 'text-up', down: 'text-down', flat: 'text-muted' } as const
const toneSoft = { up: 'bg-up-soft text-up', down: 'bg-down-soft text-down', flat: 'bg-stone-2 text-muted' } as const

/** A difference with its direction said in words as well as colour. */
export function Delta({ value, pct, size = 'md', words = false }: { value: number | null; pct?: number | null; size?: 'lg' | 'md' | 'sm'; words?: boolean }) {
  const way = direction(value)
  if (way === null) return <span className="text-muted">—</span>
  const Icon = way === 'up' ? ArrowUpRight : way === 'down' ? ArrowDownRight : Minus
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${size === 'sm' ? 'text-sm' : ''}`}>
      <span className={`tnum inline-flex items-center gap-1 whitespace-nowrap font-semibold ${tone[way]} ${size === 'lg' ? 'font-figure text-[clamp(1.5rem,3.6vw,2rem)] leading-[1.15]' : ''}`}>
        <Icon aria-hidden="true" className={size === 'lg' ? 'size-6' : 'size-4'} strokeWidth={2.25} />
        {size === 'lg' ? (
          // At display size the manat sign is set smaller, as every other large figure sets it.
          <span>{signedMoney(value).replace(' ₼', '')}<span className="ml-1.5 text-[0.55em] font-medium">₼</span></span>
        ) : signedMoney(value)}
      </span>
      {pct !== undefined && pct !== null && (
        <span className={`tnum rounded px-1.5 py-0.5 text-xs font-semibold ${toneSoft[way]}`}>{percent(pct)}</span>
      )}
      {words && <span className="text-sm text-muted">{directionWords[way]}</span>}
    </span>
  )
}

// ---- approval -----------------------------------------------------------------------------------------------------

/** The month's one approval — it covers every company and object in the month. */
export function ApprovalBadge({ approval, future = false }: { approval: MonthApproval | null; future?: boolean }) {
  if (future) {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-2 px-2.5 py-1 text-sm text-muted">Hələ başlamayıb</span>
  }
  if (!approval) return null
  if (approval.state === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sea-soft px-2.5 py-1 text-sm font-semibold text-sea-2" title="Rəhbər bu ayı bütün obyektlər üzrə təsdiqləyib">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
        Təsdiqlənib
        {approval.approvedOn && (
          <span className="font-normal text-ink-2">· {approval.approvedOn.day} {monthName(approval.approvedOn.month).toLocaleLowerCase('az')}</span>
        )}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-line bg-amber-soft px-2.5 py-1 text-sm font-semibold text-amber" title="Rəhbər bu ayı hələ təsdiqləməyib">
      <Hourglass aria-hidden="true" className="size-4" strokeWidth={2.25} />
      Təsdiq gözləyir
    </span>
  )
}

/**
 * The same state as a mark, for the year's ribbon. An approved month is the ordinary case and says it quietly — a tick;
 * the month still waiting is the exception and says it in words.
 */
export function ApprovalMark({ approval, compact = false }: { approval: MonthApproval | null; compact?: boolean }) {
  if (!approval) return null
  return approval.state === 'approved'
    ? (
      <span className="inline-flex items-center gap-1 text-xs text-sea-2" title="Təsdiqlənib">
        <Check aria-hidden="true" className={compact ? 'size-3.5' : 'size-4'} strokeWidth={2.75} />
        {compact ? <span>Təsdiqlənib</span> : <span className="sr-only">Təsdiqlənib</span>}
      </span>
    )
    : (
      <span title="Təsdiq gözləyir" className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-amber-soft px-1.5 py-0.5 text-xs font-semibold text-amber">
        <Hourglass aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
        {compact ? 'Təsdiq gözləyir' : 'Gözləyir'}
      </span>
    )
}

// ---- navigation ---------------------------------------------------------------------------------------------------

export interface Crumb {
  label: string
  to?: string
}

/** Where the reader is. Every step but the last opens that level; on a phone the trail wraps rather than hides. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Yer" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-muted">
        {trail.map((crumb, index) => (
          <li key={`${index}-${crumb.label}`} className="inline-flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-line-2" />}
            {crumb.to ? (
              <Link to={crumb.to} className="inline-flex min-h-7 items-center rounded px-0.5 text-ink-2 underline-offset-4 hover:text-sea hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="px-0.5 font-semibold text-ink">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export interface TabItem {
  label: string
  to: string
  active: boolean
  count?: number
}

/** Two ways to read the same money. Links, not buttons: each view has its own address. */
export function ViewTabs({ label, tabs }: { label: string; tabs: TabItem[] }) {
  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="-mb-px flex gap-5 overflow-x-auto sm:gap-6">
        {tabs.map((tab) => (
          <li key={tab.label}>
            <Link
              to={tab.to}
              replace
              aria-current={tab.active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-0.5 text-[15px] font-semibold ${
                tab.active ? 'border-sea text-ink' : 'border-transparent text-muted hover:border-line-2 hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`tnum rounded-full px-1.5 text-xs ${tab.active ? 'bg-sea-soft text-sea-2' : 'bg-stone-2 text-muted'}`}>{tab.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** What the month is compared with. A native select: it is the most familiar control on every device. */
export function ComparisonSelect({ basis, onChange, period, label = 'Müqayisə', inline = false }: {
  basis: Basis
  onChange: (basis: Basis) => void
  /** The one month's period, for its note; the year has twelve, so it passes none. */
  period?: Period
  label?: string
  /** The label beside the control rather than over it. */
  inline?: boolean
}) {
  return (
    <div className={`flex min-w-0 ${inline ? 'flex-wrap items-center gap-x-3 gap-y-1' : 'flex-col gap-1'}`}>
      <label htmlFor="comparison" className={`font-semibold ${inline ? 'text-sm text-ink-2' : 'text-xs text-muted'}`}>{label}</label>
      <select
        id="comparison"
        value={basis}
        onChange={(event) => onChange(event.target.value as Basis)}
        className={`w-full min-w-0 rounded-md border border-line-2 bg-paper px-3 pr-8 min-h-11 text-[15px] text-ink sm:w-80`}
      >
        {basisOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {period && <PeriodNote period={period} />}
    </div>
  )
}

export function PeriodNote({ period }: { period: Period }) {
  if (period.unavailable) return <span className="text-xs text-ink-2">Bu ay ilin ilk ayıdır: müqayisə üçün əvvəlki ay yoxdur.</span>
  if (period.incomplete) {
    return (
      <span className="text-xs text-ink-2">
        {period.wanted} ay istənilir, {period.months.length} ay mövcuddur — ortalama mövcud aylar üzrədir.
      </span>
    )
  }
  return null
}

// ---- figures band -------------------------------------------------------------------------------------------------

/**
 * The three figures of a place in the drill-down: this month, what it is compared with, the difference. One band with
 * thin rules between the figures — not three cards — so they read as one statement.
 */
export function FigureBand({ month, period, figure, prominent = false, note, label }: {
  month: number
  period: Period
  figure: Figure
  prominent?: boolean
  note?: ReactNode
  /** Which orders the figures are about, beside the month: «Aylıq sifarişlər», «Aylıqdan kənar», «Hamısı». */
  label?: string
}) {
  return (
    <section aria-label="Əsas göstəricilər" className="grid rounded-lg border border-line bg-paper md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className={`flex min-w-0 flex-col gap-1 ${prominent ? 'p-5 sm:p-7' : 'p-5 sm:p-6'}`}>
        <span className="text-sm font-semibold text-ink-2">{monthName(month)} {YEAR}{label && <span className="font-normal text-muted"> · {label}</span>}</span>
        {figure.hasCurrent ? <Money value={figure.current} size={prominent ? 'xl' : 'lg2'} /> : <span className="py-1 text-lg text-muted">Bu ay sifariş yoxdur</span>}
        {note && <span className="text-sm text-muted">{note}</span>}
      </div>
      <div className={`flex min-w-0 flex-col gap-1 border-t border-line md:border-l md:border-t-0 ${prominent ? 'p-5 sm:p-7' : 'p-5 sm:p-6'}`}>
        <span className="text-sm font-semibold text-ink-2">{period.isAverage ? 'Müqayisə dövrü (aylıq orta)' : 'Əvvəlki ay'}</span>
        {period.unavailable
          ? <span className="py-1 text-base text-muted">Müqayisə mümkün deyil</span>
          : figure.hasComparison ? <Money value={figure.comparison} size="lg" className="text-ink-2" /> : <span className="py-1 text-base text-muted">O dövrdə sifariş yoxdur</span>}
        <span className="text-sm text-muted">{period.unavailable ? 'İlin ilk ayı' : period.label}</span>
      </div>
      <div className={`flex min-w-0 flex-col gap-1.5 border-t border-line md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 ${prominent ? 'p-5 sm:p-7' : 'p-5 sm:p-6'}`}>
        <span className="text-sm font-semibold text-ink-2">Fərq</span>
        {period.unavailable ? <span className="py-1 text-base text-muted">—</span>
          : !figure.hasComparison && figure.hasCurrent
            ? <span className="inline-flex flex-wrap items-center gap-2"><Delta value={figure.delta} size="lg" /><NewTag long /></span>
            : <Delta value={figure.delta} pct={figure.pct} size="lg" words />}
      </div>
    </section>
  )
}

/** Something the comparison period did not have: the amount is still shown, this only says it is new. */
export function NewTag({ long = false }: { long?: boolean }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-stone-2 px-1.5 py-0.5 text-xs font-semibold text-ink-2">
      {long ? 'yeni: müqayisə dövründə yox idi' : 'yeni'}
    </span>
  )
}

export function Notice({ children, tone: kind = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <p className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${kind === 'warn' ? 'border border-line-2 bg-paper text-ink' : 'bg-stone-2 text-ink-2'}`}>
      {kind === 'warn' ? <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink-2" /> : <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
      <span>{children}</span>
    </p>
  )
}

/** The page's one heading; the shell moves focus here on every new place. */
export function PageTitle({ children, eyebrow, after, aside }: {
  children: ReactNode
  eyebrow?: ReactNode
  /** Beside the heading, outside it: the heading stays the place's name alone. */
  after?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-sm text-muted">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 id="page-title" tabIndex={-1} className="break-words text-[clamp(1.6rem,3.2vw,2.25rem)] font-semibold leading-[1.2] tracking-tight text-ink outline-none">
            {children}
          </h1>
          {after}
        </div>
      </div>
      {aside && <div className="flex shrink-0 flex-wrap items-end gap-3">{aside}</div>}
    </div>
  )
}
