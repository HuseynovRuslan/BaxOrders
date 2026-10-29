import { useState } from 'react'
import { Link } from 'react-router'
import { Building2, ChevronRight } from 'lucide-react'
import type { BreakdownRow, Figure, Period, ProductComparison, SupplierShare } from '../data/analysis'
import { direction, minus, money, percent, price as formatPrice, quantity as formatQuantity, quantityParts } from '../lib/format'
import { Delta, Money, NewTag } from './parts'

type Sort = 'amount' | 'change'

/**
 * One level of the drill-down as a table: each row is a place to go next, and the whole row opens it.
 *
 * The bar under a name is its share of this month's total for the level, with the share written beside it — a full
 * bar would be the whole month, never just the largest row. The «Cəmi» row closes the table with the same figure as the band above it: the levels
 * describe one sum of money, never a separate one.
 */
export function Breakdown({ label, nameHeader, rows, total, period, hrefOf, suppliersHrefOf, products = false, emptyText }: {
  label: string
  nameHeader: string
  rows: readonly BreakdownRow[]
  total: Figure
  period: Period
  hrefOf: (row: BreakdownRow) => string
  /** Products only: the product's «Şirkətlər üzrə», where «+N şirkət» opens. */
  suppliersHrefOf?: (row: BreakdownRow) => string
  products?: boolean
  emptyText?: string
}) {
  const [sort, setSort] = useState<Sort>('amount')
  const sorted = sort === 'amount'
    ? rows
    : [...rows].sort((left, right) => Math.abs(right.figure.delta ?? 0) - Math.abs(left.figure.delta ?? 0))
  // Products get their quantity and price columns only where there is room for six (1024 px); narrower, the two are
  // one line under the name, so a tablet never scrolls sideways.
  const columns = products
    ? 'md:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_12rem] lg:grid-cols-[minmax(0,1fr)_7.5rem_9rem_8.5rem_8.5rem_10.5rem]'
    : 'md:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_12rem]'
  const compareHeader = period.isAverage ? 'Müqayisə (orta)' : 'Əvvəlki ay'

  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-line-2 bg-paper p-6 text-center text-muted">{emptyText ?? 'Bu səviyyədə sifariş yoxdur.'}</p>
  }

  return (
    <section aria-label={label} className="rounded-lg border border-line bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm text-muted">
          <span className="tnum font-semibold text-ink">{rows.length}</span> {nameHeader.toLocaleLowerCase('az')}
        </p>
        <div role="group" aria-label="Sıralama" className="inline-flex rounded-md bg-stone-2 p-0.5 text-sm">
          {(['amount', 'change'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={`min-h-9 rounded px-3 font-semibold ${sort === value ? 'bg-paper text-ink shadow-[0_1px_2px_rgba(18,38,58,0.12)]' : 'text-muted hover:text-ink'}`}
            >
              {value === 'amount' ? 'Məbləğə görə' : 'Fərqə görə'}
            </button>
          ))}
        </div>
      </div>

      <div role="table" aria-label={label}>
        <div role="row" className={`hidden gap-4 border-b border-line px-5 py-2.5 text-xs font-semibold text-muted md:grid ${columns}`}>
          <span role="columnheader">{nameHeader}</span>
          {products && <span role="columnheader" className="hidden text-right lg:block">Miqdar</span>}
          {products && <span role="columnheader" className="hidden text-right lg:block">Orta qiymət</span>}
          <span role="columnheader" className="text-right">Bu ay</span>
          <span role="columnheader" className="text-right">{compareHeader}</span>
          <span role="columnheader" className="text-right">Fərq</span>
        </div>

        <div role="rowgroup">
          {sorted.map((row) => {
            const share = total.current > 0 ? row.figure.current / total.current : 0
            return (
              <div
                key={row.id}
                role="row"
                className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 last:border-b-0 hover:bg-stone sm:px-5 ${columns}`}
              >
                <div role="cell" className="min-w-0">
                  <Link to={hrefOf(row)} className="stretched flex items-start gap-1 text-[15px] font-semibold leading-[1.35] text-ink group-hover:text-sea focus-visible:outline-offset-[-2px]">
                    <span className="break-words">{row.name}</span>
                    <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-line-2 group-hover:text-sea" />
                  </Link>
                  {row.figure.hasCurrent && (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span aria-hidden="true" className="block h-1 w-full max-w-56 rounded-full bg-stone-2">
                        <span className="block h-1 rounded-full bg-bar" style={{ width: `${Math.max(1.5, share * 100)}%` }} />
                      </span>
                      <span className="tnum shrink-0 text-xs text-muted"><span className="sr-only">Payı </span>{percent(share, false)}</span>
                    </span>
                  )}
                  {products && row.suppliers?.length
                    ? <Suppliers items={row.suppliers} href={suppliersHrefOf?.(row)} />
                    : products && row.suppliersBefore?.length
                      ? <Suppliers items={row.suppliersBefore} href={suppliersHrefOf?.(row)} before={period.isAverage ? 'Müqayisə dövründə' : 'Əvvəlki ay'} />
                      : null}
                  {products && row.figure.hasCurrent && (
                    <span className="tnum mt-1 block text-sm text-ink-2 lg:hidden">
                      {row.quantity?.mixedUnits ? quantityParts(row.quantity.parts) : `${formatQuantity(row.quantity?.qty, row.quantity?.unit)} × ${formatPrice(row.quantity?.price)}`}
                      {row.product && (
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                          <span>Miqdar <QtyDelta cmp={row.product} /></span>
                          <span>Qiymət <PriceDelta cmp={row.product} /></span>
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {products && (
                  <>
                    <span role="cell" className="tnum hidden text-right text-sm text-ink-2 lg:block">
                      {row.quantity?.mixedUnits ? quantityParts(row.quantity.parts) : formatQuantity(row.quantity?.qty, row.quantity?.unit)}
                      {row.product && <span className="block text-xs"><QtyDelta cmp={row.product} /></span>}
                    </span>
                    <span role="cell" className="tnum hidden text-right text-sm text-ink-2 lg:block">
                      {row.quantity?.mixedUnits ? '—' : formatPrice(row.quantity?.price)}
                      {row.product && <span className="block text-xs"><PriceDelta cmp={row.product} /></span>}
                    </span>
                  </>
                )}

                <span role="cell" className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
                  {row.figure.hasCurrent ? <Money value={row.figure.current} className="font-semibold" /> : <span className="text-sm text-muted">Bu ay yoxdur</span>}
                </span>
                <span role="cell" className="tnum text-sm text-muted md:text-right md:text-ink-2">
                  <span className="md:hidden">{period.isAverage ? 'Orta' : 'Əvvəlki ay'}: </span>
                  {period.unavailable ? '—' : row.figure.hasComparison ? <Money value={row.figure.comparison} size="sm" /> : 'yox idi'}
                </span>
                <span role="cell" className="flex justify-end text-sm">
                  {period.unavailable ? <span className="text-muted">—</span>
                    : !row.figure.hasComparison
                      ? <span className="inline-flex items-center gap-2"><Delta value={row.figure.delta} size="sm" /><NewTag /></span>
                      : <Delta value={row.figure.delta} pct={row.figure.pct} size="sm" />}
                </span>
              </div>
            )
          })}
        </div>

        <div role="row" className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t-2 border-line bg-stone px-4 py-3 sm:px-5 ${columns}`}>
          <span role="rowheader" className="text-sm font-semibold text-ink">Cəmi</span>
          {products && <span role="cell" className="hidden lg:block" />}
          {products && <span role="cell" className="hidden lg:block" />}
          <span role="cell" className="text-right"><Money value={total.current} className="font-semibold" /></span>
          <span role="cell" className="tnum text-sm text-ink-2 md:text-right">
            <span className="md:hidden text-muted">{period.isAverage ? 'Orta' : 'Əvvəlki ay'}: </span>
            {period.unavailable ? '—' : <Money value={total.comparison} size="sm" />}
          </span>
          <span role="cell" className="flex justify-end text-sm">
            {period.unavailable ? <span className="text-muted">—</span> : <Delta value={total.delta} pct={total.pct} size="sm" />}
          </span>
        </div>
      </div>
    </section>
  )
}

/**
 * Where the goods came from, said outright under the product. One company is one line: «Şirkət: Cleanfix».
 * Several are a short list under «Şirkətlər · N», one company a line with its share of the product's money, the
 * largest first — names in one column, shares in another, so the eye runs down them. Up to four are listed; more fold
 * into «+N şirkət», a link (a tap, not a hover) to the product's «Şirkətlər üzrə». A product not bought this month
 * names the comparison period's companies, muted and labelled so.
 */
function Suppliers({ items, href, before }: { items: readonly SupplierShare[]; href?: string; before?: string }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const shown = items.length > 4 ? items.slice(0, 3) : items
  const rest = items.slice(shown.length)
  const tone = before ? 'text-ink-2' : 'text-ink'
  const label = (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted">
      <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
      {before ? `${before} · ` : ''}{items.length === 1 ? 'Şirkət' : `Şirkətlər · ${items.length}`}<span className="sr-only">:</span>
    </span>
  )

  if (items.length === 1) {
    return (
      <p className="mt-2 flex min-w-0 max-w-80 items-center gap-2" title={`${items[0].name}: ${money(items[0].amount)}`}>
        {label}
        <span className={`truncate text-[13px] font-semibold ${tone}`}>{items[0].name}</span>
      </p>
    )
  }

  return (
    <div className="mt-2 max-w-64">
      {label}
      <ul className="mt-1 flex flex-col gap-0.5 border-l-2 border-line pl-2.5">
        {shown.map((item, index) => (
          <li key={item.id} title={`${item.name}: ${money(item.amount)}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-[13px] leading-5">
            <span className={`truncate ${tone} ${index === 0 ? 'font-semibold' : ''}`}>{item.name}</span>
            <span className="tnum text-xs text-muted"><span className="sr-only">payı </span>{percent(total > 0 ? item.amount / total : 0, false)}</span>
          </li>
        ))}
        {rest.length > 0 && (
          <li>
            {href ? (
              <Link to={href} className="relative z-10 inline-flex min-h-7 items-center text-xs font-semibold text-sea underline-offset-4 hover:underline">
                +{rest.length} şirkət<span className="sr-only">: {rest.map((item) => item.name).join(', ')}. Şirkətlər üzrə müqayisəni aç</span>
              </Link>
            ) : <span className="text-xs font-semibold text-muted">+{rest.length} şirkət</span>}
          </li>
        )}
      </ul>
    </div>
  )
}

/**
 * How the product's quantity moved against the comparison: a count, so it stays neutral — ordering more is not good or
 * bad by itself — and says its direction with its sign.
 */
function QtyDelta({ cmp }: { cmp: ProductComparison }) {
  if (!cmp.comparison?.lineCount) return <span className="text-muted">yeni</span>
  if (!cmp.current.lineCount) return <span className="text-muted">sifariş yoxdur</span>
  if (!cmp.comparable || cmp.deltaQty === null) return <span className="text-muted">vahidlər fərqli</span>
  if (Math.abs(cmp.qtyPct ?? 0) < 0.005) return <span className="text-muted">dəyişməyib</span>
  const unit = cmp.current.units[0]
  const sign = cmp.deltaQty > 0 ? '+' : minus
  return <span className="text-ink-2">{sign}{formatQuantity(Math.abs(cmp.deltaQty), unit)} ({percent(cmp.qtyPct)})</span>
}

/** How the product's weighted unit price moved: a price is a cost, so it takes the cost colours. */
function PriceDelta({ cmp }: { cmp: ProductComparison }) {
  if (!cmp.comparison?.lineCount || !cmp.current.lineCount) return <span className="text-muted">—</span>
  if (!cmp.comparable || cmp.pricePct === null) return <span className="text-muted">vahidlər fərqli</span>
  if (Math.abs(cmp.pricePct) < 0.005) return <span className="text-muted">dəyişməyib</span>
  const way = direction(cmp.pricePct)
  return (
    <span className={way === 'up' ? 'text-up' : 'text-down'}>
      <span aria-hidden="true">{way === 'up' ? '▲' : '▼'} </span>{percent(cmp.pricePct)}
    </span>
  )
}
