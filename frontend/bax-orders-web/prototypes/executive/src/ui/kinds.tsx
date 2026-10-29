import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Check, Hourglass, Layers, Wrench } from 'lucide-react'
import { approvalOf, kindOptions, type Kind, type outsideRequestsIn } from '../data/analysis'
import { linesById, products, sites, YEAR, type MonthApproval } from '../data/model'
import { monthName, money, price, quantity } from '../lib/format'
import { Money, Notice } from './parts'

export const kindLabels: Record<Kind, string> = Object.fromEntries(kindOptions.map((option) => [option.value, option.label])) as Record<Kind, string>

/** The package's approval in a few words, for the strip and the year's tips. */
export function packageWords(approval: MonthApproval | null): string {
  if (!approval) return 'Aylıq sifariş yoxdur'
  return approval.state === 'approved'
    ? `Sifarişlər təsdiqlənib${approval.approvedOn ? `, ${approval.approvedOn.day} ${monthName(approval.approvedOn.month).toLocaleLowerCase('az')}` : ''}`
    : 'Sifarişlər təsdiq gözləyir'
}

/**
 * The two kinds of order side by side, with «Hamısı» after them — and the way to choose which one every figure below is
 * about. The monthly package carries its approval; the urgent requests their count and their separate consent; the
 * total says plainly that it is spending, not an amount to approve.
 */
export function KindStrip({ kind, cells, linkFor }: {
  kind: Kind
  cells: { monthly: number; outside: number; all: number; outsideCount: number; approval?: MonthApproval | null; approvedMonths?: number; pendingMonths?: number }
  linkFor: (kind: Kind) => string
}) {
  const items: { value: Kind; label: string; short: string; amount: number; note: ReactNode; Icon: typeof Layers }[] = [
    {
      value: 'monthly',
      label: 'Aylıq sifarişlər',
      short: 'Aylıq',
      amount: cells.monthly,
      Icon: Layers,
      note: cells.approval !== undefined ? <PackageNote approval={cells.approval} />
        : <span>{cells.approvedMonths} ay təsdiqlənib{cells.pendingMonths ? `, ${cells.pendingMonths} ay gözləyir` : ''}</span>,
    },
    {
      value: 'outside',
      label: 'Aylıqdan kənar',
      short: 'Aylıqdan kənar',
      amount: cells.outside,
      Icon: Wrench,
      note: <span>{cells.outsideCount} sifariş, hər biri ayrıca razılıqla</span>,
    },
    {
      value: 'all',
      label: 'Hamısı',
      short: 'Hamısı',
      amount: cells.all,
      Icon: AlertTriangle,
      note: <span>ümumi xərc, təsdiq məbləği deyil</span>,
    },
  ]

  return (
    <nav aria-label="Sifariş növü" className="grid grid-cols-3 gap-1.5 rounded-lg border border-line bg-paper p-1.5 sm:gap-2">
      {items.map((item) => {
        const active = item.value === kind
        return (
          <Link
            key={item.value}
            to={linkFor(item.value)}
            replace
            aria-current={active ? 'true' : undefined}
            className={`flex min-w-0 flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors sm:px-3.5 sm:py-2.5 ${
              active ? 'bg-sea-soft ring-1 ring-inset ring-sea/50' : 'hover:bg-stone'
            }`}
          >
            <span className={`text-xs font-semibold leading-tight sm:text-sm ${active ? 'text-sea-2' : 'text-ink-2'}`}>
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
            <Money value={item.amount} className={`text-sm font-semibold sm:text-base ${active ? 'text-ink' : 'text-ink-2'}`} />
            <span className="hidden text-xs leading-snug text-muted sm:block">{item.note}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function PackageNote({ approval }: { approval: MonthApproval | null }) {
  if (!approval) return <span>aylıq sifariş yoxdur</span>
  return approval.state === 'approved'
    ? <span className="inline-flex items-center gap-1 text-sea-2"><Check aria-hidden="true" className="size-3.5" strokeWidth={2.75} />{packageWords(approval)}</span>
    : <span className="inline-flex items-center gap-1 text-amber"><Hourglass aria-hidden="true" className="size-3.5" />{packageWords(approval)}</span>
}

/**
 * What the figures on a page are about, beside its heading. The monthly package names its one approval; the urgent
 * requests say their consent is separate; «Hamısı» says it is not an amount to approve.
 */
export function KindBadge({ kind, month }: { kind: Kind; month: number }) {
  if (kind === 'monthly') {
    const approval = approvalOf(month)
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${
        approval?.state === 'approved' ? 'bg-sea-soft text-sea-2' : 'border border-amber-line bg-amber-soft text-amber'
      }`}>
        {approval?.state === 'approved' ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : <Hourglass aria-hidden="true" className="size-4" />}
        {packageWords(approval)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-stone-2 px-2.5 py-1 text-sm font-semibold text-ink-2">
      {kind === 'outside' ? <Wrench aria-hidden="true" className="size-4" /> : <AlertTriangle aria-hidden="true" className="size-4" />}
      {kind === 'outside' ? 'Aylıqdan kənar: hər sifariş ayrıca razılıqla' : 'Hamısı: ümumi xərc, təsdiq məbləği deyil'}
    </span>
  )
}

/** How consent for urgent requests works today, said once where the requests are listed. */
export function OutsideFlowNote() {
  return (
    <Notice>
      Aylıqdan kənar sifarişlər aylıq sifarişlərin təsdiqinə daxil deyil: hər biri üçün Rəhbərin ayrıca razılığı alınır.
      Hazırkı sistemdə bu razılıq üçün elektron mexanizm yoxdur — sətirlər obyektin həmin ayki sifarişində «Aylıqdan kənar»
      kimi saxlanılır, razılıq sistemdən kənar verilir. Prototip mövcud axını göstərir, təsdiq düyməsi yaratmır.
    </Notice>
  )
}

/** The month's urgent requests, each with its day, object, reason, lines and amount. */
export function OutsideRequestList({ requests, link, siteLink }: {
  requests: ReturnType<typeof outsideRequestsIn>
  link?: (siteId: string) => string
  siteLink?: boolean
}) {
  if (requests.length === 0) {
    return <p className="rounded-lg border border-dashed border-line-2 bg-paper p-5 text-center text-sm text-muted">Bu ay aylıqdan kənar sifariş olmayıb.</p>
  }
  return (
    <ol className="flex flex-col divide-y divide-line rounded-lg border border-line bg-paper">
      {requests.map((request) => (
        <li key={request.id} className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{request.reason || 'Aylıqdan kənar sifariş'}</p>
              <p className="text-sm text-muted">
                {request.day > 0 ? `${request.day} ` : ''}{monthName(request.month).toLocaleLowerCase('az')} {YEAR} ·{' '}
                {siteLink && link ? <Link to={link(request.siteId)} className="text-sea underline-offset-4 hover:underline">{sites.get(request.siteId)!.name}</Link> : sites.get(request.siteId)!.name}
                {request.number ? ` · ${request.number}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <Money value={request.amount} className="font-semibold" />
              <span className="text-xs text-muted">Razılıq: sistemdə qeyd yoxdur</span>
            </div>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm text-ink-2">
            {request.lineIds.map((id) => {
              const line = linesById.get(id)!
              return (
                <li key={id} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">{products.get(line.productId)!.name}</span>
                  <span className="tnum shrink-0 text-right">{quantity(line.qty, line.unit)} × {price(line.price)} = {money(line.amount)}</span>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ol>
  )
}
