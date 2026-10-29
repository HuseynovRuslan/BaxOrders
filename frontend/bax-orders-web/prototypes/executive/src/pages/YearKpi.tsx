import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Check, ChevronDown, ChevronRight, Hourglass, X } from 'lucide-react'
import { categoryRows, productRows, resolvePeriod, siteRows, type BreakdownRow, type Kind, type MonthTile } from '../data/analysis'
import { categories, sites, YEAR } from '../data/model'
import { money, moneyParts, monthName, monthRange, percent, price, quantity, quantityParts, shortMonthNames, signedMoney } from '../lib/format'
import { paths } from '../lib/links'
import {
  arrowOf, basisReference, changeOf, childLevelName, kindNames, rounded, scopeRequests, scopeSplit, yearChildren, yearMonths, yearSites,
  type Change, type YearChild, type YearReading, type YearScope,
} from '../lib/year'

/*
 * The year's four figures, each one a way in. A card opens its detail in place, under the strip — one at a time, no
 * side panel (owner: details open where they are asked for). The open card lives in the address (`panel`; for the split
 * also `bolgu`, the open row `sec` and the way down it `yol`), so Back from a month returns to it; the order kind and the comparison travel as everywhere else.
 * Every row inside leads to a page that already exists: the month, a category or an object in a month, an order.
 * With the year screen's filters on, every card and every detail reads the same filtered scope; approval stays the
 * month's, so a filtered part is never shown as approved on its own — its cards say «in approved months».
 */

export type PanelId = 'cemi' | 'tesdiq' | 'gozleyir' | 'ferq' | 'kenar' | 'aylar'

/** Which detail each card opens, by kind: approval exists only for the monthly orders. */
const panelsFor: Record<Kind, readonly PanelId[]> = {
  monthly: ['cemi', 'tesdiq', 'gozleyir', 'ferq'],
  outside: ['cemi', 'kenar', 'aylar', 'ferq'],
  all: ['cemi', 'aylar', 'kenar', 'ferq'],
}

export function useKpiPanel(kind: Kind) {
  const [params, setParams] = useSearchParams()
  const asked = params.get('panel') as PanelId | null
  const panel = asked && panelsFor[kind].includes(asked) ? asked : null
  const by: 'category' | 'site' = params.get('bolgu') === 'obyekt' ? 'site' : 'category'
  // Opening and closing is a new reading of the same place: it replaces the entry and keeps the scroll.
  const write = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true, preventScrollReset: true })
  }
  const closed = { bolgu: null, sec: null, yol: null }
  const selected = params.get('sec')
  return {
    panel,
    by,
    /** The split's open row (a root category or an object), and the way down from it: ids, one per level. */
    selected,
    path: (params.get('yol') ?? '').split(',').filter(Boolean),
    toggle: (id: PanelId) => write(panel === id ? { panel: null, ...closed } : { panel: id, ...closed }),
    close: () => write({ panel: null, ...closed }),
    setBy: (next: 'category' | 'site') => write({ ...closed, bolgu: next === 'site' ? 'obyekt' : null }),
    select: (id: string) => write({ sec: selected === id ? null : id, yol: null }),
    drill: (path: string[]) => write({ yol: path.length ? path.join(',') : null }),
  }
}

type KpiPanelState = ReturnType<typeof useKpiPanel>

interface Card {
  panel: PanelId
  label: string
  body: ReactNode
  span?: string
}

/** The strip of four cards and, under it, the detail of the one that is open. */
export function KpiStrip({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const buttons = useRef(new Map<PanelId, HTMLButtonElement>())
  const cards = cardsFor(reading)

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && kpi.panel) {
      const opened = kpi.panel
      kpi.close()
      buttons.current.get(opened)?.focus()
      event.preventDefault()
      return
    }
    const card = (event.target as HTMLElement).dataset?.kpi as PanelId | undefined
    if (card && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      const order = cards.map((item) => item.panel)
      const next = order[(order.indexOf(card) + (event.key === 'ArrowRight' ? 1 : -1) + order.length) % order.length]
      buttons.current.get(next)?.focus()
      event.preventDefault()
    }
  }

  return (
    <div onKeyDown={onKeyDown} className="flex flex-col gap-2">
      <div role="group" aria-label="İlin göstəriciləri" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-(--y-line) bg-(--y-line) lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
        {cards.map((card) => (
          <button
            key={card.panel}
            ref={(element) => { if (element) buttons.current.set(card.panel, element); else buttons.current.delete(card.panel) }}
            type="button"
            data-kpi={card.panel}
            aria-expanded={kpi.panel === card.panel}
            aria-controls="kpi-panel"
            onClick={() => kpi.toggle(card.panel)}
            className={`group flex min-w-0 cursor-pointer flex-col items-start bg-(--y-surface) px-5 py-3.5 text-left transition-colors hover:bg-(--y-band)/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar) aria-expanded:bg-(--y-band) aria-expanded:shadow-[inset_0_-3px_0_var(--y-bar)] ${card.span ?? ''}`}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span className="text-xs font-semibold text-(--y-muted)">{card.label}</span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-(--y-muted) transition-transform group-hover:text-(--y-ink) group-aria-expanded:rotate-180 group-aria-expanded:text-(--y-bar) motion-reduce:transition-none"
              />
            </span>
            {card.body}
          </button>
        ))}
      </div>
      {kpi.panel && <KpiPanel reading={reading} kpi={kpi} panel={kpi.panel} />}
    </div>
  )
}

/** The cards in the kind's own terms; the last one is always the latest month against the chosen comparison. */
function cardsFor(reading: YearReading): Card[] {
  const { kind, total, latest, basis } = reading
  const { whole } = moneyParts(Math.round(total.amount))
  const value = (text: string, note: string, tone = '') => (
    <>
      <span className={`tnum mt-1.5 text-lg font-bold leading-none ${tone}`}>{text}</span>
      <span className="mt-1 text-xs text-(--y-muted)">{note}</span>
    </>
  )
  const cards: Card[] = [{
    panel: 'cemi',
    label: `${kindNames[kind]} · ${reading.period}`,
    span: 'col-span-2 lg:col-span-1',
    body: (
      <>
        <span className="tnum mt-1 text-[30px] font-extrabold leading-none tracking-[-0.02em]">
          {reading.hasOrders ? <>{whole}<span className="text-[0.5em] font-bold text-(--y-ink-2)"> ₼</span></> : <span className="text-(--y-muted)">—</span>}
        </span>
        {kind === 'all' && reading.hasOrders && <span className="mt-1 text-xs text-(--y-muted)">Ümumi xərc, təsdiq ediləcək məbləğ deyil</span>}
        {!reading.hasOrders && <span className="mt-1 text-xs text-(--y-muted)">Seçilmiş filtrdə sifariş yoxdur</span>}
      </>
    ),
  }]
  if (kind === 'monthly') {
    cards.push({
      panel: 'tesdiq',
      label: reading.scoped ? 'Təsdiqlənmiş aylarda' : 'Təsdiqlənib',
      body: reading.approvedMonths === 0
        ? value('—', 'seçilmiş dövrdə təsdiqlənmiş ay yoxdur')
        : !reading.approvedAmount
          ? value('—', 'təsdiqlənmiş aylarda bu filtrdə sifariş yoxdur')
        : value(money(reading.approvedAmount), reading.scoped ? `${reading.approvedMonths} ay · təsdiq ay üzrədir` : `${reading.approvedMonths} ayın sifarişləri`),
    })
    const waiting = reading.waiting
    if (waiting.length) {
      const amount = waiting.reduce((sum, tile) => sum + (tile.amount ?? 0), 0)
      const names = waiting.map((tile) => monthName(tile.month)).join(', ')
      cards.push({
        panel: 'gozleyir',
        label: reading.scoped ? 'Təsdiq gözləyən ayda' : 'Təsdiq gözləyir',
        body: amount
          ? value(money(amount), reading.scoped ? `${names} · təsdiq ay üzrədir` : `${names} sifarişləri`, 'text-(--y-amber)')
          : value('—', `${names}: bu filtrdə sifariş yoxdur`),
      })
    }
  }
  if (kind === 'outside') {
    cards.push({ panel: 'kenar', label: 'Sifarişlər', body: total.outsideCount ? value(`${total.outsideCount}`, 'hər biri ayrıca razılıqla') : value('—', 'bu filtrdə sifariş yoxdur') })
    if (reading.peak) cards.push({ panel: 'aylar', label: 'Ən yüksək ay', body: reading.peak.amount ? value(money(reading.peak.amount), monthName(reading.peak.month)) : value('—', 'bu filtrdə sifariş yoxdur') })
  }
  if (kind === 'all') {
    cards.push({ panel: 'aylar', label: 'Aylıq sifarişlər', body: reading.totals.monthly ? value(money(reading.totals.monthly), 'ay üzrə bir dəfə təsdiq olunur') : value('—', 'bu filtrdə sifariş yoxdur') })
    cards.push({ panel: 'kenar', label: 'Aylıqdan kənar', body: reading.totals.outside ? value(money(reading.totals.outside), 'hər biri ayrıca razılıqla') : value('—', 'bu filtrdə sifariş yoxdur') })
  }
  if (latest) {
    const change = changeOf(latest)
    cards.push({
      panel: 'ferq',
      label: `${monthName(latest.month)}, ${basisReference[basis]}`,
      span: (cards.length - 1) % 2 === 0 ? 'col-span-2 lg:col-span-1' : '',
      body: change.kind === 'value'
        ? <><span className="mt-1.5"><Chip change={change} large /></span><span className="tnum mt-1 text-xs text-(--y-muted)">{signedMoney(change.delta)}</span></>
        : <span className="mt-1.5 text-sm text-(--y-muted)">{change.detail}</span>,
    })
  }
  return cards
}

/* ---- The details ------------------------------------------------------------------------------------------------- */

function KpiPanel({ reading, kpi, panel }: { reading: YearReading; kpi: KpiPanelState; panel: PanelId }) {
  switch (panel) {
    case 'cemi': return <SplitPanel reading={reading} kpi={kpi} />
    case 'tesdiq': return <ApprovedPanel reading={reading} kpi={kpi} />
    case 'gozleyir': return <WaitingPanel reading={reading} kpi={kpi} />
    case 'ferq': return <ChangePanel reading={reading} kpi={kpi} />
    case 'kenar': return <RequestsPanel reading={reading} kpi={kpi} />
    case 'aylar': return <MonthsPanel reading={reading} kpi={kpi} />
  }
}

function Frame({ title, intro, kpi, tools, children }: { title: string; intro?: ReactNode; kpi: KpiPanelState; tools?: ReactNode; children: ReactNode }) {
  return (
    <section id="kpi-panel" aria-labelledby="kpi-panel-title" className="kpi-panel rounded-xl border border-(--y-line) bg-(--y-surface)">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-(--y-line) px-5 py-3">
        <div className="min-w-0">
          <h2 id="kpi-panel-title" className="text-sm font-bold">{title}</h2>
          {intro && <p className="mt-0.5 max-w-3xl text-xs text-(--y-muted)">{intro}</p>}
        </div>
        <div className="flex items-center gap-2">
          {tools}
          <button type="button" aria-label="Bağla" title="Bağla (Esc)" onClick={kpi.close} className="grid size-8 place-items-center rounded-md text-(--y-muted) hover:bg-(--y-band) hover:text-(--y-ink)">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </header>
      <div className="p-2">{children}</div>
    </section>
  )
}

const rowLink = 'rounded-lg px-3 py-2 transition-colors hover:bg-(--y-band) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar)'

/**
 * Ümumi məbləğ: the year's orders of the kind in view, split by root category or by object — name, amount, share,
 * largest first, every one of them. A row opens in place: its months, and the way down the catalogue from it.
 */
function SplitPanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const parts = kpi.by === 'category' ? yearChildren(reading.scope, reading.months) : yearSites(reading.scope, reading.months)
  const whole = parts.reduce((sum, part) => sum + part.amount, 0)
  const noun = kpi.by === 'category' ? childLevelName(reading.scope).replace(/(lar|lər)$/, '') : 'Obyekt'
  return (
    <Frame
      kpi={kpi}
      title="İllik sifarişlərin bölgüsü"
      intro={`${kindNames[reading.kind]} · ${reading.period}${reading.scoped ? ' · seçilmiş filtr üzrə' : ''}. Sətrə klikləyin: ${kpi.by === 'category' ? 'kateqoriyanın aylıq dinamikası və alt bölmələri' : 'obyektin sifarişləri kateqoriya və məhsullar üzrə'} açılır.`}
      tools={
        <div role="group" aria-label="Bölgü" className="flex rounded-lg border border-(--y-line) p-0.5 text-xs font-semibold">
          {(['category', 'site'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kpi.by === value}
              onClick={() => kpi.setBy(value)}
              className={`rounded-md px-2.5 py-1.5 ${kpi.by === value ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'}`}
            >
              {value === 'category' ? 'Kateqoriyalar' : 'Obyektlər'}
            </button>
          ))}
        </div>
      }
    >
      <div aria-hidden="true" className={`${splitGrid} px-3 pb-1.5 pt-1 text-[11px] font-semibold text-(--y-muted)`}>
        <span>{noun}</span><span className="text-right">Məbləğ</span><span className="text-right">Pay</span><span />
      </div>
      <ol>
        {parts.map((part) => (
          <li key={part.id} className="border-t border-(--y-line)">
            <button
              type="button"
              aria-expanded={kpi.selected === part.id}
              aria-controls={`split-${part.id}`}
              onClick={() => kpi.select(part.id)}
              className={`group w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-(--y-band) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar) aria-expanded:bg-(--y-band)/70 ${splitGrid}`}
            >
              <span className="min-w-0 truncate text-sm font-semibold" title={part.name}>{part.name}</span>
              <span className="tnum text-right text-sm font-bold">{money(part.amount)}</span>
              <span className="tnum text-right text-xs text-(--y-muted)">{percent(part.share, false)}</span>
              <ChevronRight aria-hidden="true" className="size-4 justify-self-end text-(--y-muted) transition-transform group-hover:text-(--y-ink) group-aria-expanded:rotate-90 group-aria-expanded:text-(--y-bar) motion-reduce:transition-none" />
            </button>
            {kpi.selected === part.id && (
              <SplitDetail
                id={`split-${part.id}`}
                reading={reading}
                kpi={kpi}
                root={{
                  name: part.name,
                  scope: part.type === 'site' ? { ...reading.scope, siteId: part.id } : part.type === 'product' ? { ...reading.scope, productId: part.id } : { ...reading.scope, categoryId: part.id },
                  product: part.type === 'product' ? part : undefined,
                }}
              />
            )}
          </li>
        ))}
      </ol>
      <div className={`${splitGrid} border-t border-(--y-ink)/30 px-3 pb-1 pt-2.5`}>
        <span className="text-sm font-bold">Cəmi</span>
        <span className="tnum text-right text-sm font-extrabold">{money(whole)}</span>
        <span className="tnum text-right text-xs text-(--y-muted)">100%</span>
        <span />
      </div>
    </Frame>
  )
}

const splitGrid = 'grid grid-cols-[minmax(0,1fr)_auto_3.25rem_1rem] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_10rem_4.5rem_1.25rem] sm:gap-x-5'

/**
 * An open row: where the year went inside it. On one side its twelve months — each a way into that month's page for
 * it; on the other the next level of the catalogue — a category opens one level further, a product shows its quantity
 * and price. The way down is a trail above, every step of it a way back up.
 */
function SplitDetail({ id, reading, kpi, root }: { id: string; reading: YearReading; kpi: KpiPanelState; root: { name: string; scope: YearScope; product?: YearChild } }) {
  // Walk the way down from the row, one known child at a time; a stale step in the address simply ends the walk.
  let scope: YearScope = root.scope
  let product: YearChild | null = root.product ?? null
  const trail: { name: string; path: string[] }[] = [{ name: root.name, path: [] }]
  for (const step of kpi.path) {
    const child = yearChildren(scope, reading.months).find((item) => item.id === step)
    if (!child || product) break
    const path = [...trail[trail.length - 1].path, step]
    trail.push({ name: child.name, path })
    if (child.type === 'product') {
      product = child
      scope = { ...scope, productId: step }
    } else {
      scope = { ...scope, categoryId: step }
    }
  }
  const here = trail[trail.length - 1]
  const children = product ? [] : yearChildren(scope, reading.months)
  const months = yearMonths(scope, reading.months)
  const withData = new Set(reading.tiles.filter((tile) => tile.state === 'data').map((tile) => tile.month))
  const monthHref = (month: number) => reading.href(
    scope.productId ? paths.product(YEAR, month, scope.productId, scope.siteId)
      : scope.categoryId ? paths.category(YEAR, month, scope.categoryId, scope.siteId)
        : paths.site(YEAR, month, scope.siteId!),
  )

  // After a step down or up, the list's heading takes the focus, so a keyboard user carries on from where they are.
  const heading = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (moved.current) heading.current?.focus()
    moved.current = false
  }, [kpi.path.join(',')])
  const go = (path: string[]) => { moved.current = true; kpi.drill(path) }

  return (
    <div id={id} className="mx-1 mb-2.5 mt-1 rounded-lg border border-(--y-line) bg-(--y-band)/30 p-3 sm:p-4">
      <nav aria-label="Yol" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        {trail.map((step, index) => (
          <span key={step.path.join('/') || 'root'} className="inline-flex items-center gap-1.5">
            {index > 0 && <ChevronRight aria-hidden="true" className="size-3.5 text-(--y-muted)" />}
            {index < trail.length - 1
              ? <button type="button" onClick={() => go(step.path)} className="rounded font-semibold text-(--y-bar) underline-offset-4 hover:underline">{step.name}</button>
              : <span aria-current="location" className="font-bold">{step.name}</span>}
          </span>
        ))}
      </nav>

      <div className="mt-3 grid gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <section aria-label={`${here.name}: aylıq dinamika`}>
          <h4 className="text-xs font-bold text-(--y-ink-2)">Aylıq dinamika</h4>
          <MonthBars name={here.name} months={months} withData={withData} hrefFor={monthHref} />
        </section>

        <section>
          <h4 ref={heading} tabIndex={-1} className="text-xs font-bold text-(--y-ink-2) outline-none">{product ? 'Məhsul' : childLevelName(scope)}</h4>
          {product ? <ProductSummary product={product} /> : (
            <ol className="mt-1.5">
              {children.map((child) => (
                <li key={child.id} className="border-t border-(--y-line) first:border-t-0">
                  <button
                    type="button"
                    onClick={() => go([...here.path, child.id])}
                    className="group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_3rem_1rem] items-center gap-x-3 rounded-md px-2 py-2 text-left hover:bg-(--y-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--y-bar)"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold" title={child.name}>{child.name}</span>
                      {child.quantity && <span className="block truncate text-xs text-(--y-muted)">{quantityText(child.quantity)}</span>}
                    </span>
                    <span className="tnum text-right text-sm font-bold">{money(child.amount)}</span>
                    <span className="tnum text-right text-xs text-(--y-muted)">{percent(child.share, false)}</span>
                    <ChevronRight aria-hidden="true" className="size-4 justify-self-end text-(--y-muted) group-hover:text-(--y-ink)" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

/** A product's year: its amount, its quantity in its own unit(s), the weighted price where the unit is one. */
function ProductSummary({ product }: { product: YearChild }) {
  const q = product.quantity!
  return (
    <dl className="mt-1.5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-(--y-line) bg-(--y-line) text-sm sm:grid-cols-3">
      <div className="bg-(--y-surface) px-3 py-2"><dt className="text-xs text-(--y-muted)">Məbləğ</dt><dd className="tnum font-bold">{money(product.amount)}</dd></div>
      <div className="bg-(--y-surface) px-3 py-2"><dt className="text-xs text-(--y-muted)">Miqdar</dt><dd className="tnum font-bold">{q.mixedUnits ? quantityParts(q.parts) : quantity(q.qty, q.unit)}</dd></div>
      <div className="col-span-2 bg-(--y-surface) px-3 py-2 sm:col-span-1">
        <dt className="text-xs text-(--y-muted)">Orta qiymət</dt>
        <dd className="tnum font-bold">{q.mixedUnits ? <span className="text-xs font-semibold text-(--y-muted)">vahidlər fərqlidir</span> : price(q.price, q.unit)}</dd>
      </div>
    </dl>
  )
}

const quantityText = (q: NonNullable<YearChild['quantity']>) => (q.mixedUnits ? quantityParts(q.parts) : `${quantity(q.qty, q.unit)} · ${price(q.price, q.unit)}`)

/** Twelve small bars of one part's year; a month with orders is a way into that month's page for it. */
function MonthBars({ name, months, withData, hrefFor }: { name: string; months: number[]; withData: Set<number>; hrefFor: (month: number) => string }) {
  const peak = Math.max(...months, 0)
  return (
    <div role="group" aria-label={`${name}: aylar`} className="mt-2 grid h-36 grid-cols-12 items-end gap-1 sm:gap-1.5">
      {months.map((amount, index) => {
        const month = index + 1
        const label = <span className="mt-1 text-[10px] font-semibold text-(--y-muted) sm:text-[11px]">{shortMonthNames[index]}</span>
        if (amount <= 0) {
          return (
            <span key={month} className="flex h-full flex-col items-center justify-end">
              <span aria-hidden="true" className={`block h-px w-full ${withData.has(month) ? 'bg-(--y-line)' : 'border-t border-dashed border-(--y-line)'}`} />
              {label}
            </span>
          )
        }
        return (
          <Link
            key={month}
            to={hrefFor(month)}
            title={`${monthName(month)}: ${money(amount)}`}
            aria-label={`${monthName(month)} ${YEAR}: ${money(amount)}`}
            className="group/bar relative flex h-full flex-col items-center justify-end rounded-md pt-1 hover:bg-(--y-surface) focus-visible:outline-2 focus-visible:outline-(--y-bar)"
          >
            {/* The figure over the bar, only for the bar under the pointer or the focus: the chart stays quiet. */}
            <span className="relative block w-[60%] max-w-6 rounded-t-[4px] bg-(--y-bar) group-hover/bar:bg-(--y-bar-hover)" style={{ height: `${peak ? Math.max(4, (amount / peak) * 80) : 0}%` }}>
              <span aria-hidden="true" className="tnum pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-(--y-ink) px-1.5 py-0.5 text-[10px] font-semibold text-(--y-surface) opacity-0 transition-opacity group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100">
                {compact(amount)}
              </span>
            </span>
            {label}
          </Link>
        )
      })}
    </div>
  )
}

/** A bar's figure in a few characters: «21,3 min», «856». */
const compact = (value: number) => (value >= 1000 ? `${(Math.round(value / 100) / 10).toFixed(1).replace('.', ',').replace(',0', '')} min` : `${Math.round(value)}`)

/** Təsdiqlənib: the months whose monthly orders the Rəhbər has approved, when, and for how much. */
function ApprovedPanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const approved = reading.monthlyTiles.filter((tile) => tile.approval?.state === 'approved')
  const largest = Math.max(...approved.map((tile) => tile.amount ?? 0), 0)
  return (
    <Frame
      kpi={kpi}
      title="Təsdiqlənmiş aylar"
      intro={reading.scoped
        ? `Təsdiq ay üzrə vahiddir: ayın bütün aylıq sifarişləri bir dəfə təsdiqlənir. Burada həmin aylarda seçilmiş filtrə düşən sifarişlərin məbləği göstərilir — cəmi ${money(reading.approvedAmount)}, ${reading.approvedMonths} ay.`
        : `Hər ayın aylıq sifarişləri bütün obyektlər üçün bir dəfə təsdiqlənir. Cəmi ${money(reading.approvedAmount)}, ${reading.approvedMonths} ay.`}
    >
      <ol className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3">
        {approved.map((tile) => (
          <li key={tile.month}>
            <Link to={reading.monthHref(tile.month)} className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 ${rowLink}`}>
              <span className="text-sm font-bold">{monthName(tile.month)}</span>
              <span className="tnum text-right text-sm font-bold">{money(tile.amount)}</span>
              <span className="inline-flex items-center gap-1 text-xs text-(--y-ok)">
                <Check aria-hidden="true" className="size-3.5" strokeWidth={2.75} />
                {tile.approval?.approvedOn ? `${tile.approval.approvedOn.day} ${monthName(tile.approval.approvedOn.month).toLocaleLowerCase('az')}` : 'təsdiqlənib'}
              </span>
              <span className="text-right text-xs text-(--y-muted)">{tile.objects} obyekt</span>
              <span aria-hidden="true" className="col-span-2 mt-1 block h-1 rounded-full bg-(--y-grid)">
                <span className="block h-full rounded-full bg-(--y-bar)" style={{ width: `${largest ? ((tile.amount ?? 0) / largest) * 100 : 0}%` }} />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

/** Təsdiq gözləyir: the month(s) whose monthly orders wait for approval — and each object's order in them. */
function WaitingPanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  return (
    <Frame
      kpi={kpi}
      title="Təsdiq gözləyən aylıq sifarişlər"
      intro={`Ayın aylıq sifarişləri bütün obyektlər üçün bir dəfə təsdiqlənir. Gözləmək gecikmə demək deyil: təsdiqin son tarixi yoxdur.${reading.scoped ? ' Burada seçilmiş filtrə düşən sifarişlər göstərilir.' : ''}`}
    >
      {reading.waiting.map((tile) => <WaitingMonth key={tile.month} tile={tile} reading={reading} />)}
    </Frame>
  )
}

function WaitingMonth({ tile, reading }: { tile: MonthTile; reading: YearReading }) {
  const { siteId, categoryId } = reading.scope
  const orders = siteRows(tile.month, tile.period ?? resolvePeriod(tile.month, 'previous'), 'monthly', categoryId)
    .filter((row) => row.figure.current > 0 && (!siteId || row.id === siteId))
  return (
    <div className="px-1 pb-1">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2 py-2">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-base font-extrabold">{monthName(tile.month)} {YEAR}</span>
          <span className="tnum text-base font-bold">{money(tile.amount)}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-(--y-amber-soft) px-2 py-0.5 text-xs font-semibold text-(--y-amber)">
            <Hourglass aria-hidden="true" className="size-3.5" />Sifarişlər təsdiq gözləyir
          </span>
          <span className="text-xs text-(--y-muted)">{orders.length} obyektin sifarişi</span>
        </p>
        <p className="flex gap-2 text-sm font-semibold">
          <Link to={reading.monthHref(tile.month)} className="rounded-md border border-(--y-line) px-3 py-1.5 hover:bg-(--y-band)">Ayın təhlili</Link>
          <Link to={reading.href(paths.month(YEAR, tile.month), { bax: 'obyektler' })} className="rounded-md border border-(--y-line) px-3 py-1.5 hover:bg-(--y-band)">Obyektlər üzrə</Link>
        </p>
      </div>
      <ol className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((row) => (
          <li key={row.id}>
            <Link to={reading.href(paths.order(YEAR, tile.month, row.id))} className={`flex items-baseline justify-between gap-3 ${rowLink}`} aria-label={`${row.name}: ${monthName(tile.month)} sifarişi, ${money(row.figure.current)}`}>
              <span className="min-w-0 truncate text-sm font-semibold" title={row.name}>{row.name}</span>
              <span className="tnum shrink-0 text-sm font-bold">{money(row.figure.current)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Müqayisə fərqi: the latest month against the chosen comparison, and where the difference comes from. */
function ChangePanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const tile = reading.latest!
  const change = changeOf(tile)
  const period = tile.period ?? resolvePeriod(tile.month, reading.basis)
  const against = period.isAverage ? `Ortalama (${monthRange(period.months, YEAR)})` : monthName(tile.month - 1)
  const title = `${monthName(tile.month)}, ${basisReference[reading.basis]}`
  if (change.kind === 'none') {
    return (
      <Frame kpi={kpi} title={title} intro={change.detail}>
        <p className="px-3 py-2 text-sm"><Link to={reading.monthHref(tile.month)} className="font-semibold text-(--y-bar) underline underline-offset-4">{monthName(tile.month)} ayının təhlili</Link></p>
      </Frame>
    )
  }
  const byChange = (rows: BreakdownRow[]) => [...rows].filter((row) => row.figure.delta !== null).sort((left, right) => Math.abs(right.figure.delta!) - Math.abs(left.figure.delta!)).slice(0, 5)
  const { siteId, categoryId } = reading.scope
  const level = categoryId ? categories.get(categoryId)!.level : 0
  const categoriesChanged = byChange(level === 3
    ? productRows(tile.month, period, reading.kind, categoryId!, siteId)
    : categoryRows(tile.month, period, reading.kind, categoryId ?? null, siteId))
  const sitesChanged = byChange(siteRows(tile.month, period, reading.kind, categoryId).filter((row) => !siteId || row.id === siteId))
  const partTitle = ['Kateqoriyalar üzrə', 'Orta kateqoriyalar üzrə', 'Alt kateqoriyalar üzrə', 'Məhsullar üzrə'][level]
  const partHref = (id: string) => reading.href(level === 3 ? paths.product(YEAR, tile.month, id, siteId) : paths.category(YEAR, tile.month, id, siteId))
  const siteHref = (id: string) => reading.href(categoryId ? paths.category(YEAR, tile.month, categoryId, id) : paths.site(YEAR, tile.month, id))
  return (
    <Frame
      kpi={kpi}
      title={title}
      intro="Fərqi ən çox yaradan kateqoriyalar və obyektlər. Sətrə klikləyin: həmin ayda onun təhlili açılır."
      tools={<Link to={reading.monthHref(tile.month)} className="rounded-md border border-(--y-line) px-3 py-1.5 text-sm font-semibold hover:bg-(--y-band)">{monthName(tile.month)} ayının təhlili</Link>}
    >
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-(--y-line) bg-(--y-line) text-sm sm:max-w-xl">
        <div className="bg-(--y-surface) px-3 py-2"><dt className="text-xs text-(--y-muted)">{monthName(tile.month)}</dt><dd className="tnum font-bold">{money(tile.amount)}</dd></div>
        <div className="bg-(--y-surface) px-3 py-2"><dt className="text-xs text-(--y-muted)">{against}</dt><dd className="tnum font-bold">{money(tile.comparison)}</dd></div>
        <div className="bg-(--y-surface) px-3 py-2"><dt className="text-xs text-(--y-muted)">Fərq</dt><dd className="flex flex-wrap items-center gap-1.5"><Chip change={change} /><span className="tnum text-xs font-semibold">{signedMoney(change.delta)}</span></dd></div>
      </dl>
      <div className="mt-2 grid gap-x-6 lg:grid-cols-2">
        <ChangeList title={partTitle} columns={[monthName(tile.month), against]} rows={categoriesChanged} hrefFor={partHref} />
        <ChangeList title="Obyektlər üzrə" columns={[monthName(tile.month), against]} rows={sitesChanged} hrefFor={siteHref} />
      </div>
    </Frame>
  )
}

function ChangeList({ title, columns, rows, hrefFor }: { title: string; columns: [string, string]; rows: BreakdownRow[]; hrefFor: (id: string) => string }) {
  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-end gap-x-3 px-3 pb-1 pt-2 text-[11px] font-semibold text-(--y-muted)">
        <h3 className="text-xs font-bold text-(--y-ink-2)">{title}</h3>
        <span aria-hidden="true" className="truncate text-right">{columns[0]}</span>
        <span aria-hidden="true" className="truncate text-right" title={columns[1]}>{columns[1]}</span>
        <span aria-hidden="true" className="text-right">Fərq</span>
      </div>
      <ol>
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={hrefFor(row.id)} className={`grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem] items-center gap-x-3 ${rowLink}`}>
              <span className="min-w-0 truncate text-sm font-semibold" title={row.name}>{row.name}</span>
              <span className="tnum text-right text-sm font-bold">{rounded(row.figure.current)}</span>
              <span className="tnum text-right text-xs text-(--y-muted)">{rounded(row.figure.comparison)}</span>
              <span className="flex justify-end"><FigureChip delta={row.figure.delta} pct={row.figure.pct} /></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Aylıqdan kənar: every outside-monthly request of the year, latest first; each opens its object's order for the month. */
function RequestsPanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const requests = [...reading.months].reverse().flatMap((month) => scopeRequests(month, reading.scope).reverse())
  return (
    <Frame
      kpi={kpi}
      title={`Aylıqdan kənar sifarişlər · ${requests.length}`}
      intro="Hər biri ayrıca razılıqla verilir və aylıq sifarişlərin təsdiqinə daxil deyil. Hazırkı sistemdə bu razılığın elektron qeydi yoxdur."
    >
      <ol className="grid gap-x-2 lg:grid-cols-2">
        {requests.map((request) => (
          <li key={request.id}>
            <Link to={reading.href(paths.order(YEAR, request.month, request.siteId))} className={`grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 ${rowLink}`}>
              <span className="tnum text-xs font-semibold text-(--y-muted)">{request.day > 0 ? `${request.day} ` : ''}{shortMonthNames[request.month - 1].toLocaleLowerCase('az')}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{sites.get(request.siteId)?.name}</span>
                {request.reason && <span className="block truncate text-xs text-(--y-muted)" title={request.reason}>{request.reason}</span>}
              </span>
              <span className="tnum text-sm font-bold">{money(request.amount)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Frame>
  )
}

/**
 * Aylar: the months of the kind in view. For the outside-monthly requests, their count and amount, the highest month
 * marked; for «Hamısı», each month split into its two kinds — approval only beside the monthly orders.
 */
function MonthsPanel({ reading, kpi }: { reading: YearReading; kpi: KpiPanelState }) {
  const tiles = reading.tiles.filter((tile) => tile.state === 'data')
  const largest = Math.max(...tiles.map((tile) => tile.amount ?? 0), 0)
  if (reading.kind === 'outside') {
    return (
      <Frame kpi={kpi} title="Aylar üzrə aylıqdan kənar sifarişlər" intro="Təsdiq yoxdur: hər sifariş ayrıca razılıqla verilir.">
        <ol className="grid gap-x-2 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <li key={tile.month}>
              <Link to={reading.monthHref(tile.month)} className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 ${rowLink}`}>
                <span className="text-sm font-bold">
                  {monthName(tile.month)}
                  {tile.month === reading.peak?.month && <span className="ml-2 rounded-full bg-(--y-band) px-1.5 py-0.5 text-[11px] font-semibold text-(--y-bar)">ən yüksək</span>}
                </span>
                <span className="tnum text-right text-sm font-bold">{money(tile.amount)}</span>
                <span className="text-xs text-(--y-muted)">{tile.outsideCount} sifariş</span>
                <span />
                <span aria-hidden="true" className="col-span-2 mt-1 block h-1 rounded-full bg-(--y-grid)">
                  <span className="block h-full rounded-full bg-(--y-bar)" style={{ width: `${largest ? ((tile.amount ?? 0) / largest) * 100 : 0}%` }} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </Frame>
    )
  }
  return (
    <Frame kpi={kpi} title="Aylar üzrə: aylıq və aylıqdan kənar" intro="Təsdiq yalnız aylıq sifarişlərə aiddir; aylıqdan kənar sifarişlər hər biri ayrıca razılıqla verilir.">
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 px-3 pb-1 text-[11px] font-semibold text-(--y-muted) sm:grid">
        <span>Ay</span><span className="text-right">Aylıq sifarişlər</span><span className="text-right">Aylıqdan kənar</span><span className="text-right">Cəmi</span>
      </div>
      <ol>
        {tiles.map((tile) => {
          const split = scopeSplit(tile.month, reading.scope)
          const approval = reading.monthlyTiles.find((item) => item.month === tile.month)?.approval
          return (
            <li key={tile.month} className="border-t border-(--y-line) first:border-t-0">
              <Link to={reading.monthHref(tile.month)} className={`grid grid-cols-2 items-baseline gap-x-4 gap-y-0.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] ${rowLink}`}>
                <span className="text-sm font-bold">{monthName(tile.month)}</span>
                <span className="tnum flex items-baseline justify-end gap-2 text-sm">
                  {approval && (
                    <span className={`text-[11px] font-semibold ${approval.state === 'approved' ? 'text-(--y-ok)' : 'text-(--y-amber)'}`}>
                      {approval.state === 'approved' ? 'təsdiqlənib' : 'təsdiq gözləyir'}
                    </span>
                  )}
                  {money(split.monthly)}
                </span>
                <span className="tnum text-right text-sm">{money(split.outside)} <span className="text-[11px] text-(--y-muted)">({split.outsideCount})</span></span>
                <span className="tnum text-right text-sm font-bold">{money(split.all)}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </Frame>
  )
}

/* ---- Small pieces shared with the chart -------------------------------------------------------------------------- */

/** A change as a small chip: its direction in the cost colour, said by the arrow and the sign as well. */
export function Chip({ change, large = false }: { change: Extract<Change, { kind: 'value' }>; large?: boolean }) {
  const tone = change.way === 'up' ? 'bg-(--y-up-soft) text-(--y-up)' : change.way === 'down' ? 'bg-(--y-down-soft) text-(--y-down)' : 'bg-(--y-band) text-(--y-muted)'
  return (
    <span className={`tnum inline-flex items-center gap-1 whitespace-nowrap rounded-full font-bold ${large ? 'px-2.5 py-1 text-base' : 'px-1.5 py-0.5 text-[11px]'} ${tone}`}>
      <span aria-hidden="true" className={large ? 'text-xs' : 'text-[8px]'}>{arrowOf(change.way)}</span>{change.text}
    </span>
  )
}

/** A missing comparison: a quiet dash, the reason in the tip and for a screen reader. */
export function NoChange({ change }: { change: Extract<Change, { kind: 'none' }> }) {
  return <span className="text-xs text-(--y-muted)"><span aria-hidden="true">—</span><span className="sr-only">{change.text}</span></span>
}

/** A row's change as a chip; «yeni» where it had nothing in the comparison period. */
function FigureChip({ delta, pct }: { delta: number | null; pct: number | null }) {
  if (delta === null) return <span className="text-xs text-(--y-muted)">—</span>
  if (pct === null) return <span className="rounded-full bg-(--y-band) px-1.5 py-0.5 text-[11px] font-bold text-(--y-bar)">yeni</span>
  const way = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down'
  return <Chip change={{ kind: 'value', way, pct, delta, text: percent(pct) }} />
}
