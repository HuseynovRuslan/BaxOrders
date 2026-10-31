import { useState } from 'react'
import { Link } from 'react-router'
import { orderChanges, PRICE_CHANGE_THRESHOLD, type Basis, type Move, type OrderChangeRow, type Period } from '../data/analysis'
import { categories, products } from '../data/model'
import { minus, percent, price as formatPrice, quantity as formatQuantity, quantityParts, signedMoney } from '../lib/format'
import { ComparisonSelect, Delta, PeriodNote } from './parts'

/**
 * What changed in an object's monthly order against the comparison — the management's two questions first: whose price
 * went up or down, and whose quantity. The same filters as the product's order page: each family is the whole, then ▲
 * and ▼; a price that moved less than 1% is under no price filter, and store material under no quantity filter.
 */
type Filter = 'all' | 'price' | 'price-up' | 'price-down' | 'qty' | 'qty-up' | 'qty-down' | 'new' | 'dropped' | 'steady'

const labels: Record<Filter, string> = {
  all: 'Hamısı',
  price: 'Qiymət dəyişən',
  'price-up': 'Qiyməti artan',
  'price-down': 'Qiyməti azalan',
  qty: 'Miqdar dəyişən',
  'qty-up': 'Miqdarı artan',
  'qty-down': 'Miqdarı azalan',
  new: 'Yeni məhsullar',
  dropped: 'Bu ay yazılmayan məhsullar',
  steady: 'Məbləği dəyişməyən',
}

/** A direction chip shows an arrow and one word; its family gives it the subject. */
const directions: Partial<Record<Filter, { arrow: string; word: string }>> = {
  'price-up': { arrow: '▲', word: 'artan' },
  'price-down': { arrow: '▼', word: 'azalan' },
  'qty-up': { arrow: '▲', word: 'artan' },
  'qty-down': { arrow: '▼', word: 'azalan' },
}

const groups: Filter[][] = [['all'], ['price', 'price-up', 'price-down'], ['qty', 'qty-up', 'qty-down'], ['new'], ['dropped'], ['steady']]
const priceFilters: Filter[] = ['price', 'price-up', 'price-down']
const quantityFilters: Filter[] = ['qty', 'qty-up', 'qty-down']

function matches(row: OrderChangeRow, filter: Filter): boolean {
  switch (filter) {
    case 'all': return row.state !== 'steady'
    case 'price': return row.priceMove !== null
    case 'price-up': return row.priceMove === 'up'
    case 'price-down': return row.priceMove === 'down'
    case 'qty': return row.quantityMove !== null
    case 'qty-up': return row.quantityMove === 'up'
    case 'qty-down': return row.quantityMove === 'down'
    case 'new': return row.state === 'new'
    case 'dropped': return row.state === 'dropped'
    case 'steady': return row.state === 'steady'
  }
}

/** Under a price filter the largest price effect first, under a quantity filter the largest quantity effect. */
function rowsUnder(filter: Filter, rows: OrderChangeRow[]): OrderChangeRow[] {
  const under = rows.filter((row) => matches(row, filter))
  if (priceFilters.includes(filter)) return under.sort((left, right) => Math.abs(right.comparison.priceEffect ?? 0) - Math.abs(left.comparison.priceEffect ?? 0))
  if (quantityFilters.includes(filter)) return under.sort((left, right) => Math.abs(right.comparison.qtyEffect ?? 0) - Math.abs(left.comparison.qtyEffect ?? 0))
  return under
}

/** How many products a price filter leaves out for moving less than 1% — in the filter's own direction. */
function belowThreshold(filter: Filter, rows: OrderChangeRow[]): number {
  if (!priceFilters.includes(filter)) return 0
  return rows.filter((row) => row.smallPriceMove !== null && (filter === 'price' || (filter === 'price-up') === (row.smallPriceMove === 'up'))).length
}

const initialCount = 8

export function OrderChanges({ month, period, siteId, basis, onBasis, productHref }: {
  month: number
  period: Period
  siteId: string
  basis: Basis
  onBasis: (basis: Basis) => void
  productHref: (productId: string) => string
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState(false)
  const rows = orderChanges(month, period, siteId)
  const counts = Object.fromEntries(groups.flat().map((option) => [option, rowsUnder(option, rows).length])) as Record<Filter, number>
  const filtered = rowsUnder(filter, rows)
  const shown = expanded ? filtered : filtered.slice(0, initialCount)
  const hidden = belowThreshold(filter, rows)
  const offered = (option: Filter) => option === 'all' || option === filter || counts[option] > 0

  function choose(option: Filter) {
    setFilter(option)
    setExpanded(false)
  }

  function chip(option: Filter, grouped: boolean) {
    const pressed = filter === option
    const direction = directions[option]
    return (
      <button
        key={option}
        type="button"
        aria-pressed={pressed}
        aria-label={direction ? `${labels[option]} ${counts[option]}` : undefined}
        onClick={() => choose(option)}
        className={`min-h-8 px-2.5 text-xs font-semibold ${grouped ? '' : 'rounded-md border '}${
          pressed ? 'border-ink bg-ink text-paper' : `${grouped ? '' : 'border-line '}text-ink-2 hover:bg-stone`
        }`}
      >
        {direction ? `${direction.arrow} ${direction.word}` : labels[option]}
        <span className={`tnum ml-1 ${pressed ? 'opacity-70' : 'text-muted'}`}>{counts[option]}</span>
      </button>
    )
  }

  return (
    <section aria-labelledby="changes-title" className="rounded-lg border border-line bg-paper">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="changes-title" className="text-lg font-semibold text-ink">Dəyişən mallar</h2>
            <p className="text-sm text-muted">{period.unavailable ? 'Müqayisə üçün əvvəlki ay yoxdur' : `Müqayisə: ${period.label}`}</p>
          </div>
          <ComparisonSelect basis={basis} onChange={onBasis} label="Nə ilə müqayisə" />
        </div>

        {period.unavailable ? <PeriodNote period={period} /> : (
          <>
            {period.incomplete && <PeriodNote period={period} />}
            <div role="group" aria-label="Dəyişiklik növü" className="flex flex-wrap gap-1.5">
              {groups.map((group) => {
                if (!group.some(offered)) return null
                if (group.length === 1) return chip(group[0], false)
                // The whole stays while any of its directions is offered, so a ▲ never stands without its subject.
                const [whole, ...ways] = group
                return (
                  <div key={whole} className="inline-flex divide-x divide-line overflow-hidden rounded-md border border-line">
                    {chip(whole, true)}
                    {ways.filter(offered).map((option) => chip(option, true))}
                  </div>
                )
              })}
            </div>
            {hidden > 0 && (
              <p className="text-xs text-muted">
                Qiyməti {Math.round(PRICE_CHANGE_THRESHOLD * 100)}%-dən az dəyişən {hidden} məhsul bu siyahıda göstərilmir.
              </p>
            )}
          </>
        )}
      </div>

      {!period.unavailable && (shown.length === 0
        ? <p className="px-4 py-5 text-sm text-muted sm:px-5">Bu növ üzrə dəyişiklik yoxdur.</p>
        : (
          <ul className="divide-y divide-line">
            {shown.map((row) => <li key={row.productId}><ChangeRow row={row} href={productHref(row.productId)} steady={filter === 'steady'} /></li>)}
          </ul>
        ))}

      {filtered.length > initialCount && (
        <div className="border-t border-line px-4 py-2.5 text-center">
          <button type="button" onClick={() => setExpanded((current) => !current)} className="min-h-9 text-sm font-semibold text-sea hover:underline">
            {expanded ? 'Daha az göstər' : `Hamısına bax (${filtered.length})`}
          </button>
        </div>
      )}
    </section>
  )
}

/** One before → after fact: what it moved between, and how far, with ▲ / ▼ where a filter lists the move. */
interface Fact {
  label: string
  moved: string
  delta: string | null
  move: Move | null
  deltaClass: string
}

const quiet = 'text-muted'

function ChangeRow({ row, href, steady }: { row: OrderChangeRow; href: string; steady: boolean }) {
  const { comparison: cmp } = row
  const product = products.get(row.productId)!
  const before = cmp.comparison
  const unit = cmp.current.units[0] ?? before?.units[0] ?? null
  const pill = row.state === 'new' ? 'Yeni' : row.state === 'dropped' ? 'Bu ay yazılmayıb' : steady ? 'Dəyişməyib' : null

  const facts: Fact[] = []
  if (cmp.comparable) {
    const q0 = before!.qty!, q1 = cmp.current.qty!
    const change = q1 - q0
    facts.push({
      label: 'Miqdar',
      moved: `${formatQuantity(q0)} → ${formatQuantity(q1, unit)}`,
      delta: Math.abs(change) < 0.05 ? 'dəyişməyib' : `${change > 0 ? '+' : minus}${formatQuantity(Math.abs(change), unit)}`,
      move: row.quantityMove,
      deltaClass: row.quantityMove ? 'font-semibold text-ink' : quiet,
    })
  } else if (cmp.current.lineCount === 0 || !before?.lineCount) {
    // New or dropped: from nothing, or to nothing.
    const q0 = before?.lineCount ? before.qty : 0, q1 = cmp.current.lineCount ? cmp.current.qty : 0
    if (q0 !== null && q1 !== null) facts.push({ label: 'Miqdar', moved: `${formatQuantity(q0)} → ${formatQuantity(q1, unit)}`, delta: null, move: null, deltaClass: quiet })
  } else {
    facts.push({ label: 'Miqdar', moved: `${quantityParts(before.parts)} → ${quantityParts(cmp.current.parts)}`, delta: 'vahidlər fərqli', move: null, deltaClass: quiet })
  }

  const p0 = before?.lineCount ? before.price : null, p1 = cmp.current.lineCount ? cmp.current.price : null
  if (p0 !== null || p1 !== null) {
    const pct = cmp.pricePct
    const move = row.priceMove
    facts.push({
      label: 'Qiymət',
      moved: `${formatPrice(p0)} → ${formatPrice(p1)}`,
      delta: pct === null || p0 === null || p1 === null ? null : Math.abs(pct) < 0.0005 ? 'dəyişməyib' : percent(pct),
      move,
      // A unit price is a cost, so it takes the cost colours: dearer is red, cheaper is green.
      deltaClass: move === 'up' ? 'font-semibold text-up' : move === 'down' ? 'font-semibold text-down' : quiet,
    })
  }

  const split = !row.internal && Boolean(cmp.priceEffect) && Boolean(cmp.qtyEffect)

  return (
    <div className="flex items-start gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={href} className="font-medium text-ink underline-offset-4 hover:text-sea hover:underline">{row.name}</Link>
          {pill && <span className="whitespace-nowrap rounded-full bg-stone-2 px-2 py-0.5 text-xs font-semibold text-ink-2">{pill}</span>}
        </p>
        <p className="text-xs text-muted">{categories.get(product.midId)!.name} › {categories.get(product.leafId)!.name}</p>

        {facts.length > 0 && (
          <dl className="mt-1.5 grid max-w-xl grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-xs text-muted">{fact.label}</dt>
                <dd className="tnum text-sm text-ink">
                  {fact.moved}
                  {fact.delta !== null && (
                    <span className={`ml-2 text-xs ${fact.deltaClass}`}>
                      {fact.move && <span aria-hidden="true">{fact.move === 'up' ? '▲' : '▼'} </span>}
                      {fact.delta}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {split && (
          <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            <Effect label="Miqdarın təsiri" value={cmp.qtyEffect!} />
            <Effect label="Qiymətin təsiri" value={cmp.priceEffect!} />
          </p>
        )}
        {row.internal && <p className="mt-1 text-xs text-muted">Daxili təminat (pulsuz) — miqdar dəyişsə də, məbləğə təsir etmir.</p>}
      </div>

      <div className="w-28 shrink-0 text-right sm:w-32">
        <Delta value={cmp.deltaAmount} size="sm" />
        <p className="text-xs text-muted">Fərq</p>
      </div>
    </div>
  )
}

/** How much of the difference one half accounts for, in the cost colours. */
function Effect({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md bg-stone px-2 py-1 ring-1 ring-inset ring-line">
      <span className="text-muted">{label}</span>
      <span className={`tnum font-semibold ${value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-muted'}`}>{signedMoney(value)}</span>
    </span>
  )
}
