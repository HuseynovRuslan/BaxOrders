import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle, ArrowUpRight, CalendarDays, ChevronDown, CircleCheck, Clock3, Download, Layers, MapPin, TrendingUp, type LucideIcon,
} from 'lucide-react'
import type { Kind } from '../../data/analysis'
import { YEARS } from '../../data/model'
import { money, moneyParts, monthName, percent, quantity } from '../../lib/format'
import { kindNames } from '../../lib/year'
import { hasYear, overviewLinks } from '../../overview/links'
import {
  approvalDrifts, approvalSplit, longRange, shortRange, type PeriodOption, type PeriodTotal, type ShareRow, type StatusFilter, type YearComparison,
} from '../../overview/metrics'
import type { Insight } from '../../overview/insights'
import { sourceInfo } from '../../overview/status'
import { useBackupDownload } from '../../ui/backupDownload'
import { importEnabled } from '../../ui/ImportButton'
import { KeptWorkbooks } from '../../ui/KeptWorkbooks'
import { CardTitle, ChangeChip, Swatch } from '../ui'

/* ---- KPI cards ------------------------------------------------------------------------------------------------------- */

/** The big figure: whole manats, the ₼ a step smaller, as the reference sets it. */
function Amount({ value, tone = '' }: { value: number | null; tone?: string }) {
  if (value === null) return <span className="text-[34px] font-extrabold leading-none text-(--x-muted)">—</span>
  return (
    <span className={`tnum text-[34px] font-extrabold leading-none tracking-[-0.02em] ${tone}`}>
      {moneyParts(Math.round(value)).whole}<span className="text-[0.62em] font-bold"> ₼</span>
    </span>
  )
}

function CardShell({ icon: Icon, label, children, note, href, linkLabel }: {
  icon: LucideIcon
  label: string
  children: ReactNode
  note: ReactNode
  /** The whole card opens this page. */
  href?: string
  linkLabel?: string
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold text-(--x-ink-2)">
          <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
          <span className="truncate">{label}</span>
        </span>
        {href && <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-(--x-muted) opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
      </span>
      <span className="mt-3 flex min-h-11 items-center">{children}</span>
      <span className="mt-2.5 text-sm text-(--x-ink-2)">{note}</span>
    </>
  )
  const frame = 'x-card flex min-w-0 flex-col px-5 py-4 sm:px-6'
  if (!href) return <div className={frame}>{body}</div>
  return (
    <Link
      to={href}
      aria-label={linkLabel}
      className={`group ${frame} transition-[border-color,transform] hover:-translate-y-px hover:border-(--x-focus)/70 focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      {body}
    </Link>
  )
}

/** «Eyni 11 ay üzrə müqayisə» — or why there is no comparison. */
function alignedNote(comparison: YearComparison): string {
  // A year before the figures' first is never named: it has no figures, not even 0 (owner, 2026-11-24).
  if (comparison.previousYear === null) return YEARS[0] === comparison.focusYear ? `${comparison.focusYear} məlumatın ilk ilidir — müqayisə yoxdur` : 'Əvvəlki ilin məlumatı yoxdur — müqayisə mümkün deyil'
  if (comparison.aligned.length === 0) return 'Bu aylar üçün əvvəlki ildə məlumat yoxdur'
  const count = comparison.aligned.length
  return count === 1 ? `Eyni ay üzrə müqayisə: ${monthName(comparison.aligned[0])}` : `Eyni ${count} ay üzrə müqayisə`
}

/** How much of the period a card's figure covers: «Tam il · 12 ay», «İlin əvvəlindən · 11 ay», «Tam rüb · 3 ay». */
function spanNote(group: PeriodOption['group'], months: readonly number[], span: readonly number[], running: boolean): string {
  const count = months.length
  if (count === 0) return 'Bu dövr üçün məlumat yoxdur'
  const whole = count === span.length && !running
  if (group === 'month') return running ? 'Ay davam edir' : 'Tam ay'
  if (group === 'quarter') return whole ? `Tam rüb · ${count} ay` : `Rübün əvvəlindən · ${count} ay`
  return whole ? `Tam il · ${count} ay` : `İlin əvvəlindən · ${count} ay`
}

const statusNotes: Record<Exclude<StatusFilter, 'all'>, string> = { approved: 'Təsdiqlənmiş aylar', pending: 'Təsdiq gözləyən aylar' }

export function KpiCards({ comparison, kind, pending, period, status, previousTotal, running }: {
  comparison: YearComparison
  kind: Kind
  /** The focus year's monthly orders waiting for approval in the compared months. */
  pending: { amount: number; months: number[] }
  period: PeriodOption
  status: StatusFilter
  /**
   * The earlier year over the whole period (all of 2025 against 2026's January–November), for its own card only. Null
   * under an approval filter: the months are then the focus year's choice and the earlier year is read over the same.
   */
  previousTotal: PeriodTotal | null
  /** The focus year's month still under way in the period, if any. */
  running: number | null
}) {
  const { focusYear, previousYear } = comparison
  const range = shortRange(comparison.months)
  const note = alignedNote(comparison)
  const pendingLink = pending.amount > 0 && hasYear(focusYear) ? overviewLinks.pending(focusYear) : undefined
  // «Yan–Noy 2026» stays on one line; a list of months that are not one run («Yan, Mar, …») may wrap.
  const keepTogether = shortRange(comparison.aligned).includes(',') ? undefined : 'whitespace-nowrap'
  const focusNote = status === 'all'
    ? spanNote(period.group, comparison.months, period.span, running !== null)
    : `${statusNotes[status]} · ${comparison.months.length} ay`

  // The earlier year's card: the whole period it has, or — under an approval filter — the compared months.
  const earlier = previousYear === null
    ? null
    : previousTotal
      ? {
        months: previousTotal.months,
        range: shortRange(previousTotal.complete ? previousTotal.span : previousTotal.months),
        amount: previousTotal.months.length ? previousTotal.amount : null,
        note: spanNote(period.group, previousTotal.months, previousTotal.span, false),
      }
      : { months: comparison.aligned, range: shortRange(comparison.aligned), amount: comparison.previous, note }
  return (
    <section aria-label="Əsas göstəricilər" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <CardShell
        icon={CalendarDays}
        label={`${focusYear} · ${range}`}
        href={hasYear(focusYear) ? overviewLinks.year(focusYear, kind) : undefined}
        linkLabel={`${focusYear} ilinin paneli: ${kindNames[kind]}, ${longRange(comparison.months)} — ${money(comparison.current)}`}
        note={previousYear !== null && comparison.unmatched.length ? `${comparison.unmatched.map(monthName).join(', ')} müqayisəyə daxil deyil` : focusNote}
      >
        <Amount value={comparison.current} />
      </CardShell>

      <CardShell
        icon={CalendarDays}
        label={previousYear === null ? 'Əvvəlki il' : `${previousYear} · ${earlier && earlier.months.length ? earlier.range : range}`}
        href={previousYear !== null ? overviewLinks.year(previousYear, kind) : undefined}
        linkLabel={earlier ? `${previousYear} ilinin paneli: ${kindNames[kind]}, ${longRange(earlier.months)} — ${money(earlier.amount)}` : undefined}
        note={earlier?.note ?? note}
      >
        <Amount value={earlier?.amount ?? null} />
      </CardShell>

      <CardShell
        icon={TrendingUp}
        label="İllərarası dəyişmə"
        note={comparison.delta === null || comparison.previous === null ? note : (
          // The base of the change, stated: the earlier year over the same months — not the figure on its own card.
          <>
            <span className="tnum block">
              <span className="whitespace-nowrap">{money(comparison.previous)}</span> → <span className="whitespace-nowrap">{money(comparison.currentAligned)}</span>
            </span>
            <span className="mt-0.5 block text-[13px] text-(--x-muted)">
              Müqayisə: <span className={keepTogether}>{shortRange(comparison.aligned)} {focusYear}</span> ilə{' '}
              <span className={keepTogether}>{shortRange(comparison.aligned)} {previousYear}</span>
            </span>
          </>
        )}
      >
        {comparison.delta === null
          ? <span className="text-sm text-(--x-muted)">Müqayisə yoxdur</span>
          : (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ChangeChip pct={comparison.pct} delta={comparison.delta} size="lg" />
              {comparison.pct !== null && <span className="tnum whitespace-nowrap text-[17px] font-bold">{signedWhole(comparison.delta)}</span>}
            </span>
          )}
      </CardShell>

      <CardShell
        icon={Clock3}
        label="Təsdiq gözləyir"
        href={pendingLink}
        linkLabel={pendingLink ? `Təsdiq gözləyən aylıq sifarişlər: ${money(pending.amount)} — ${focusYear} panelində aç` : undefined}
        note={pending.amount > 0
          ? `${pending.months.map(monthName).join(', ')} ${focusYear}${kind === 'monthly' ? ' sifarişləri' : ' · yalnız aylıq sifarişlər'}`
          : kind === 'monthly' ? 'Seçilmiş dövrdə gözləyən sifariş yoxdur' : 'Təsdiq yalnız aylıq sifarişlərə aiddir'}
      >
        <Amount value={pending.amount > 0 ? pending.amount : null} tone="text-(--x-amber)" />
      </CardShell>
    </section>
  )
}

const signedWhole = (value: number) => `${value > 0 ? '+' : ''}${money(value)}`

/**
 * How the two years are compared, in one line under the cards: the same months on both sides, the kind of order, and —
 * where the approval differs between them — which months still wait, so a difference is never read as final.
 */
export function Methodology({ comparison, kind, inProgress, previousTotal }: {
  comparison: YearComparison
  kind: Kind
  inProgress: number | null
  previousTotal: PeriodTotal | null
}) {
  const { focusYear, previousYear, coverage } = comparison
  const parts: string[] = []
  if (previousYear !== null && comparison.aligned.length) {
    parts.push(`Müqayisə: ${longRange(comparison.aligned)} ${focusYear} ilə ${longRange(comparison.aligned)} ${previousYear}, ${kindNames[kind].toLocaleLowerCase('az')}.`)
    // The earlier year's card shows more months than are compared: say so, so its figure is never read as the base.
    const shown = previousTotal?.months ?? []
    if (shown.length > comparison.aligned.length) {
      parts.push(`${previousYear} kartında ${longRange(shown)} göstərilir (${shown.length} ay); dəyişmə yalnız eyni aylar üzrə hesablanır.`)
    }
  } else {
    parts.push(`${longRange(comparison.months)} ${focusYear}, ${kindNames[kind].toLocaleLowerCase('az')}.`)
  }
  if (kind === 'monthly') {
    const focusPending = coverage.focus.pending
    const previousPending = coverage.previous?.pending ?? []
    if (focusPending.length) parts.push(`${focusYear}: ${longRange(focusPending)} təsdiq gözləyir.`)
    if (previousYear !== null && comparison.aligned.length) {
      parts.push(previousPending.length ? `${previousYear}: ${longRange(previousPending)} təsdiq gözləyir.` : `${previousYear}: bu ayların hamısı təsdiqlənib.`)
    }
    if (focusPending.length && !previousPending.length && previousYear !== null) parts.push('Fərq qəti deyil: gözləyən aylar təsdiqdə dəyişə bilər.')
  } else {
    parts.push(kind === 'outside' ? 'Aylıqdan kənar sifarişlərin təsdiq qeydi yoxdur.' : 'Hamısı: ümumi xərcdir, təsdiq ediləcək məbləğ deyil.')
  }
  if (inProgress !== null && kind !== 'monthly') parts.push(`${monthName(inProgress)} ${focusYear} davam edir: aylıqdan kənar sifarişlər hələ əlavə oluna bilər.`)
  return <p className="-mt-1 text-[13px] leading-relaxed text-(--x-muted)">{parts.join(' ')}</p>
}

/* ---- Notes ------------------------------------------------------------------------------------------------------------ */

const noteIcons: Record<Insight['icon'], LucideIcon> = { calendar: CalendarDays, map: MapPin, layers: Layers }

export function InsightList({ insights, focusYear, previousYear }: { insights: readonly Insight[]; focusYear: number; previousYear: number | null }) {
  return (
    <section aria-labelledby="notes-title" className="x-card flex min-w-0 flex-col px-5 pb-5 pt-5 sm:px-6">
      <CardTitle id="notes-title" icon={Layers} aside={<span className="tnum pt-1 text-sm font-semibold text-(--x-ink-2)">{previousYear !== null ? `${focusYear} / ${previousYear}` : focusYear}</span>}>
        Ağıllı qeydlər
      </CardTitle>
      <p className="mt-1 text-xs text-(--x-muted)">Seçilmiş dövrün rəqəmlərindən hesablanır.</p>
      {insights.length === 0 ? (
        <p className="mt-6 text-sm text-(--x-muted)">Bu dövr üçün qeyd yoxdur: müqayisə ediləcək ay və ya sifariş tapılmadı.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {insights.map((insight) => {
            const Icon = noteIcons[insight.icon]
            return (
              <li key={insight.id}>
                <Link
                  to={insight.href}
                  title={insight.detail}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-(--x-line) bg-(--x-surface-2) px-3.5 py-2.5 transition-colors hover:border-(--x-focus)/60 hover:bg-(--x-band)"
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-(--x-ink-2)" strokeWidth={2} />
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    <span className="font-extrabold">{insight.subject}</span>
                    <span className="text-(--x-ink-2)"> · {insight.text}</span>
                    <span className="sr-only">. {insight.detail}</span>
                  </span>
                  <span className="tnum inline-flex shrink-0 items-center gap-1 rounded-full bg-(--x-chip) px-2.5 py-1 text-sm font-bold text-(--x-chip-ink)">
                    {insight.value.way && <span aria-hidden="true" className="text-[10px]">{insight.value.way === 'up' ? '▲' : insight.value.way === 'down' ? '▼' : '•'}</span>}
                    {insight.value.text}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ---- Approval -------------------------------------------------------------------------------------------------------- */

/**
 * «Təsdiq vəziyyəti»: the monthly package of the period's months, approved and waiting, for the focus year or the one
 * before (the «İllər» switch). Approval is the month's — one decision for every object — and only the monthly orders
 * have it.
 */
export function ApprovalStatus({ months, focusYear, previousYear }: { months: readonly number[]; focusYear: number; previousYear: number | null }) {
  const years = [previousYear, focusYear].filter((year): year is number => year !== null)
  const [year, setYear] = useState(focusYear)
  const shownYear = years.includes(year) ? year : focusYear
  const split = approvalSplit(shownYear, months)
  const drifts = approvalDrifts(shownYear, split.approvedMonths)
  const approvedShare = split.total ? split.approved / split.total : 0
  const pendingShare = split.total ? split.pending / split.total : 0
  return (
    <section aria-labelledby="approval-title" className="x-card px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
        <h2 id="approval-title" className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.01em]">
          <CircleCheck aria-hidden="true" className="size-7 text-(--x-ok)" strokeWidth={2} />
          Təsdiq vəziyyəti
        </h2>
        <span aria-hidden="true" className="hidden h-12 w-px bg-(--x-line) md:block" />
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <dt className="flex items-center gap-2 text-sm text-(--x-ink-2)"><Swatch tone="ok" />Təsdiqlənib</dt>
            <dd className="tnum mt-0.5 text-[24px] font-extrabold leading-tight">{money(split.approved)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm text-(--x-ink-2)"><Swatch tone="amber" />Təsdiq gözləyir</dt>
            <dd className="tnum mt-0.5 text-[24px] font-extrabold leading-tight">
              {split.pending > 0 && shownYear === focusYear && hasYear(shownYear)
                ? <Link to={overviewLinks.pending(shownYear)} className="underline decoration-(--x-amber-bar) decoration-2 underline-offset-4 hover:text-(--x-amber)">{money(split.pending)}</Link>
                : money(split.pending)}
            </dd>
          </div>
        </dl>
        <div className="min-w-[220px] flex-1">
          {split.total > 0 ? (
            <div
              role="img"
              aria-label={`${shownYear}: təsdiqlənib ${percent(approvedShare, false)}, təsdiq gözləyir ${percent(pendingShare, false)}`}
              className="flex h-8 overflow-hidden rounded-full bg-(--x-band) text-[13px] font-bold"
            >
              {approvedShare > 0 && (
                <span className="tnum flex items-center justify-center bg-(--x-ok) text-[#062b27]" style={{ width: `${approvedShare * 100}%` }}>
                  {approvedShare >= 0.12 ? percent(approvedShare, false) : ''}
                </span>
              )}
              {pendingShare > 0 && (
                <span className="tnum flex items-center justify-center bg-(--x-amber-bar) text-[#3a2604]" style={{ width: `${pendingShare * 100}%` }}>
                  {pendingShare >= 0.12 ? percent(pendingShare, false) : ''}
                </span>
              )}
            </div>
          ) : <p className="text-sm text-(--x-muted)">Bu aylarda aylıq sifariş yoxdur.</p>}
        </div>
        {years.length > 1 && (
          <>
            <span aria-hidden="true" className="hidden h-12 w-px bg-(--x-line) md:block" />
            <div className="flex items-center gap-3">
              <span className="text-[15px] text-(--x-ink-2)">İllər:</span>
              <div role="group" aria-label="Təsdiq vəziyyətinin ili" className="flex rounded-[10px] border border-(--x-line-2) p-1">
                {years.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={item === shownYear}
                    onClick={() => setYear(item)}
                    className={`tnum min-h-9 rounded-md px-3.5 text-[15px] font-bold transition-colors ${item === shownYear ? 'bg-(--x-band) text-(--x-ink) shadow-(--x-shadow)' : 'text-(--x-ink-2) hover:text-(--x-ink)'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <p className="mt-3 text-[13px] text-(--x-muted)">
        Aylıq sifarişlər, {longRange(months)} {shownYear}. Təsdiq ay üzrə verilir — ayın bütün obyektləri üçün bir dəfə; aylıqdan kənar sifarişlərin təsdiq qeydi yoxdur.
      </p>
      {drifts.length > 0 && (
        <ul aria-label="Təsdiqdən sonra dəyişən aylar" className="mt-2 flex flex-col gap-1 text-[13px] text-(--x-ink-2)">
          {drifts.map((drift) => (
            <li key={drift.month} className="flex items-start gap-2">
              <AlertTriangle aria-hidden="true" className="mt-px size-4 shrink-0 text-(--x-ink)" />
              <span>
                {hasYear(shownYear)
                  ? <Link to={overviewLinks.month(shownYear, drift.month)} className="font-semibold text-(--x-ink) underline decoration-(--x-line-2) underline-offset-4 hover:decoration-current">{monthName(drift.month)} {shownYear}</Link>
                  : <span className="font-semibold text-(--x-ink)">{monthName(drift.month)} {shownYear}</span>}
                : təsdiqdən sonra dəyişib — <span className="tnum">{money(drift.approved)} → {money(drift.now)}</span>. «Təsdiqlənib» indiki məbləği göstərir.
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* ---- Where the money went ---------------------------------------------------------------------------------------------- */

export function ShareCard({ title, noun, icon, rows, total, previousYear, hrefOf, more }: {
  title: string
  /** What a row is, for the count: «ərazi», «ana kateqoriya». */
  noun: string
  icon: LucideIcon
  rows: readonly ShareRow[]
  total: number
  previousYear: number | null
  hrefOf: (row: ShareRow) => string
  more: ReactNode
}) {
  const top = rows.slice(0, 5)
  const largest = top[0]?.amount ?? 0
  return (
    <section aria-label={title} className="x-card flex min-w-0 flex-col px-5 pb-4 pt-5 sm:px-6">
      <CardTitle icon={icon} aside={<span className="pt-1 text-sm text-(--x-ink-2)">Cəmi {rows.length} {noun}</span>}>{title}</CardTitle>
      {top.length === 0 ? <p className="mt-6 text-sm text-(--x-muted)">Seçilmiş dövrdə sifariş yoxdur.</p> : (
        <ol className="mt-3 flex flex-col">
          {top.map((row) => (
            <li key={row.id} className="border-t border-(--x-line) first:border-t-0">
              <Link to={hrefOf(row)} className="grid grid-cols-[minmax(0,1fr)_auto_4.5rem] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2.5 hover:bg-(--x-band)">
                <span className="min-w-0 truncate text-[15px] font-semibold" title={row.name}>{row.name}</span>
                <span className="tnum text-right text-[15px] font-bold">{money(row.amount)}</span>
                <span className="flex justify-end">
                  <ChangeChip pct={row.pct} delta={row.delta} reason={previousYear === null ? 'əvvəlki il yoxdur' : 'əvvəlki ildə yox idi'} />
                </span>
                <span aria-hidden="true" className="col-span-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--x-band)">
                    <span className="block h-full rounded-full bg-(--x-focus-year)" style={{ width: `${largest ? (row.amount / largest) * 100 : 0}%` }} />
                  </span>
                  <span className="tnum w-12 text-right text-xs text-(--x-muted)">{percent(row.share, false)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-(--x-line) pt-3 text-sm">
        <span className="text-(--x-muted)">Cəmi <span className="tnum font-semibold text-(--x-ink-2)">{money(total)}</span>{previousYear !== null ? '; fərq ötən ilin eyni aylarına görə' : ''}</span>
        {more}
      </div>
    </section>
  )
}

/* ---- Freshness and history -------------------------------------------------------------------------------------------- */

export function UpdateHistory() {
  const [open, setOpen] = useState(false)
  const backup = useBackupDownload()
  const busy = backup.state.kind === 'busy'
  const info = sourceInfo()
  const real = info.source.kind === 'real' ? info.source : null
  const label = info.edits.length ? 'Son dəyişiklik' : real?.uploaded ? 'Son Excel yenilənməsi' : 'Məlumat tarixi'
  return (
    <section aria-labelledby="history-title" className="x-card px-5 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h2 id="history-title" className="flex items-center gap-2.5 text-[17px] font-extrabold">
          <Clock3 aria-hidden="true" className="size-6" strokeWidth={2} />
          Yenilənmə tarixçəsi
        </h2>
        <span aria-hidden="true" className="hidden h-8 w-px bg-(--x-line) md:block" />
        <p className="text-[15px] text-(--x-ink-2)">{label}: <span className="font-semibold text-(--x-ink)">{info.updated}</span></p>
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* The figures as they stand, saved before a new workbook replaces them (owner, 2026-11-17). */}
          <button
            type="button"
            onClick={() => void backup.start()}
            disabled={busy}
            aria-busy={busy}
            aria-describedby="backup-status"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-(--x-line-2) bg-(--x-surface) px-3.5 text-sm font-semibold text-(--x-ink) transition-colors hover:bg-(--x-band) disabled:cursor-progress disabled:opacity-70 motion-reduce:transition-none"
          >
            <Download aria-hidden="true" className="size-4" strokeWidth={2.2} />
            {busy ? 'Hazırlanır…' : 'Excel kimi endir'}
          </button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="history-detail"
            onClick={() => setOpen(!open)}
            className="group inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-[15px] font-semibold text-(--x-link)"
          >
            {open ? 'Tarixçəni gizlət' : 'Tarixçəyə bax'}
            <ChevronDown aria-hidden="true" className="size-4 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" />
          </button>
        </div>
      </div>
      <p id="backup-status" aria-live="polite" className="mt-2 text-sm empty:mt-0">
        {backup.state.kind === 'done' && (
          <span className="inline-flex items-start gap-1.5 text-(--x-ink-2)">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--x-ok)" />
            <span className="min-w-0 break-words">Endirildi: «{backup.state.fileName}», {quantity(backup.state.lines)} sətir.</span>
          </span>
        )}
        {backup.state.kind === 'error' && <span className="font-semibold text-(--x-danger)">{backup.state.message}</span>}
      </p>
      {open && (
        <div id="history-detail" className="mt-3 grid gap-4 border-t border-(--x-line) pt-3 text-sm md:grid-cols-2">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5">
            {real ? (
              <>
                <dt className="text-(--x-muted)">Mənbə</dt><dd className="break-words font-semibold">Excel: «{real.file}»</dd>
                <dt className="text-(--x-muted)">Sətirlər</dt><dd className="tnum">{quantity(real.lines)} sətir, o cümlədən {quantity(real.freeLines)} pulsuz (Qala bazadan daxili təchizat)</dd>
                <dt className="text-(--x-muted)">İllər</dt><dd className="tnum">{YEARS.join(', ')}</dd>
                <dt className="text-(--x-muted)">Yeniləmə</dt><dd>«Excel yüklə» ilə; hər yükləmə əvvəl yoxlanır, sonra təsdiqlənir</dd>
              </>
            ) : (
              <><dt className="text-(--x-muted)">Mənbə</dt><dd>Demo məlumat: rəqəmlər uydurmadır</dd></>
            )}
            <dt className="text-(--x-muted)">Ehtiyat nüsxə</dt>
            <dd>«Excel kimi endir» saytdakı bütün sətirləri bir Excel faylına yazır; bu fayl «Excel yüklə» ilə geri yüklənə bilər</dd>
          </dl>
          <div>
            <h3 className="font-semibold text-(--x-ink-2)">Saytda edilən dəyişikliklər ({info.edits.length})</h3>
            {info.edits.length === 0 ? <p className="mt-1 text-(--x-muted)">Son yükləmədən sonra dəyişiklik edilməyib.</p> : (
              <ul className="relative mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto">
                {info.edits.map((edit) => (
                  <li key={`${edit.at}-${edit.text}`} className="flex gap-3">
                    <span className="tnum shrink-0 text-(--x-muted)">{edit.at.slice(0, 16).replace('T', ' ')}</span>
                    <span className="min-w-0">{edit.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Every workbook ever uploaded, to download or bring back (owner, 2026-11-25); only where the service runs. */}
          {importEnabled && <div className="md:col-span-2"><KeptWorkbooks editsSince={info.edits.length} /></div>}
        </div>
      )}
    </section>
  )
}
