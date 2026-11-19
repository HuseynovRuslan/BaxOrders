import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { allLines, DATA_EDITS, products, YEAR, YEARS, type Line } from '../data/model'
import { money, monthName } from '../lib/format'
import { CatalogDialog, CategoryPicker, pathOf, priceText, type CatalogTask, type ProductRow } from '../ui/CatalogDialog'
import { importEnabled, when } from '../ui/ImportButton'
import { Select } from '../ui/Select'
import { YearNotFound } from './NotFound'
import { YearSelect } from './YearControls'
import './year.css'

/**
 * «Mallar» (owner, 2026-10-28): every product, found by name or by category, with its latest price, its year's amount
 * and how many order lines it has — and, for the owner, a price changed from a month on, a name or category put right,
 * a product taken out, a new one added. Each edit is checked on the server first and applied only when confirmed;
 * «Geri qaytar» in «Excel yüklə» takes the last one back.
 */
export function ProductsPage() {
  const year = Number(useParams().year)
  const rows = useMemo(rowsOf, [])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState({ root: '', mid: '', leaf: '' })
  const [sort, setSort] = useState<'ad' | 'mebleg'>('ad')
  const [limit, setLimit] = useState(60)
  const [task, setTask] = useState<CatalogTask | null>(null)
  // The import key, typed once for the visit: every edit on the page uses it.
  const [key, setKey] = useState('')

  if (year !== YEAR) return <YearNotFound />

  const needle = query.trim().toLocaleLowerCase('az')
  const shown = rows
    .filter((row) => (!picked.root || row.product.rootId === picked.root)
      && (!picked.mid || row.product.midId === picked.mid)
      && (!picked.leaf || row.product.leafId === picked.leaf)
      && (!needle || row.product.name.toLocaleLowerCase('az').includes(needle) || row.path.toLocaleLowerCase('az').includes(needle)))
    .sort(sort === 'ad' ? (left, right) => left.product.name.localeCompare(right.product.name, 'az') : (left, right) => right.amount - left.amount)
  // A row's buttons: one size, one icon size, one gap; lit a step above the row's own hover, deletion in a quiet red.
  const action = 'inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-(--y-ink-2) transition-colors hover:bg-(--y-action-hover) hover:text-(--y-ink) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--y-bar) motion-reduce:transition-none'
  const filterLabel = 'flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-(--y-muted)'
  const head = 'border-b border-(--y-line) px-3 pb-2 pt-1 text-[11px] font-semibold text-(--y-ink-2)'
  const edge = 'border-b border-(--y-divider) align-middle'
  const cell = `${edge} px-3 py-2.5`

  return (
    <div className="year-view flex flex-col gap-4 lg:-mt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 id="page-title" tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">Mallar</h1>
          <p className="mt-1 max-w-4xl text-sm text-(--y-muted)">
            {rows.length} mal. Son qiymət və məbləğ {YEAR} ilinin sifarişlərindəndir. Qiymət, ad, kateqoriya, yeni mal və silinmə hamı üçün keçərlidir: hər dəyişiklik əvvəl yoxlanır, sonra təsdiqlənir.
          </p>
        </div>
        {importEnabled && (
          <button
            type="button"
            onClick={() => setTask({ kind: 'add' })}
            className="inline-flex min-h-[42px] shrink-0 items-center gap-2 self-start rounded-[10px] bg-(--y-ink) px-4 text-sm font-semibold text-(--y-surface) transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--y-bar) sm:self-auto"
          >
            <Plus aria-hidden="true" className="size-4" />
            Mal əlavə et
          </button>
        )}
      </div>

      {DATA_EDITS.length > 0 && (
        <section aria-labelledby="edits-title" className="rounded-xl border border-(--y-line) bg-(--y-surface) px-4 py-3 text-sm">
          <h2 id="edits-title" className="text-xs font-semibold text-(--y-muted)">Saytda son dəyişikliklər ({DATA_EDITS.length})</h2>
          <ul className="mt-1 space-y-0.5">
            {DATA_EDITS.slice(-3).reverse().map((edit) => (
              <li key={edit.at + edit.text} className="text-(--y-ink-2)"><span className="tnum text-(--y-muted)">{when(edit.at)}</span> — {edit.text}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="@container flex flex-col gap-3 rounded-xl border border-(--y-line) bg-(--y-surface) p-3 sm:p-4">
        {/*
          The filters in their reading order. As wide as the card allows: one row (the search widest, the year as wide as
          its value, the three category lists sharing the rest, the sort last); narrower, the search and the year above
          the lists and the sort; on a phone, one under another.
        */}
        <div className="grid gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto] @5xl:grid-cols-[minmax(16rem,1.25fr)_auto_minmax(0,3fr)]">
          <label className={`${filterLabel} ${YEARS.length > 1 ? '' : '@2xl:col-span-2'}`}>
            Axtar
            <span className="dd-field">
              <Search aria-hidden="true" className="size-4 shrink-0 text-(--dd-muted)" />
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60) }} placeholder="Malın adı və ya kateqoriya…" className="dd-field-input" />
            </span>
          </label>
          {YEARS.length > 1 && (
            <div className={filterLabel}>
              İl
              <span className="dd-group px-1 text-sm"><YearSelect className="w-full" /></span>
            </div>
          )}
          <div className="grid gap-3 @2xl:col-span-full @xl:grid-cols-[minmax(0,1fr)_auto] @5xl:col-span-1">
            <CategoryPicker value={picked} onChange={(next) => { setPicked(next); setLimit(60) }} allowAll labels="filter" />
            <div className={filterLabel}>
              Sırala
              <Select label="Sırala" value={sort} options={[{ value: 'ad', label: 'Ad' }, { value: 'mebleg', label: 'Məbləğ' }]} onChange={(value) => setSort(value as 'ad' | 'mebleg')} className="w-full @xl:min-w-32" />
            </div>
          </div>
        </div>
        <p aria-live="polite" className="text-xs text-(--y-muted)">{shown.length} mal tapıldı</p>

        <div role="region" aria-label="Mallar" tabIndex={0} className="relative -mx-1 overflow-x-auto px-1">
          {/* The name takes the room; the figures and the buttons sit together at the right, as narrow as they are. */}
          <table className="row-list w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                <th scope="col" className={`${head} min-w-[15rem] text-left`}>Mal</th>
                <th scope="col" className={`${head} w-px whitespace-nowrap text-right`}>Son qiymət</th>
                <th scope="col" className={`${head} w-px whitespace-nowrap text-right`}>{YEAR} üzrə məbləğ</th>
                <th scope="col" className={`${head} w-px whitespace-nowrap text-right`}>Sətir</th>
                {importEnabled && <th scope="col" className={`${head} w-px`}><span className="sr-only">Əməliyyatlar</span></th>}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((row) => {
                const text = priceText(row)
                return (
                  <tr key={row.product.id} data-product={row.product.id}>
                    <th scope="row" className={`${cell} text-left font-semibold text-(--y-ink)`}>
                      <span className="block break-words">{row.product.name}</span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-snug text-(--y-muted)">{row.path}</span>
                    </th>
                    <td className={`${cell} tnum whitespace-nowrap text-right`}>
                      {text === '—' ? <span className="text-(--y-muted)">—</span> : <span className="block text-(--y-ink)">{text}</span>}
                      {note(row) && <span className="mt-0.5 block text-[11px] text-(--y-muted)">{note(row)}</span>}
                    </td>
                    <td className={`${cell} tnum whitespace-nowrap text-right font-semibold`}>{row.lines.length ? money(row.amount) : <span className="font-normal text-(--y-muted)">—</span>}</td>
                    <td className={`${cell} tnum whitespace-nowrap text-right ${row.lines.length ? 'text-(--y-ink-2)' : 'text-(--y-muted)'}`}>{row.lines.length}</td>
                    {importEnabled && (
                      <td className={`${edge} whitespace-nowrap py-1.5 pl-4 pr-1`}>
                        <span className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setTask({ kind: 'price', row })} className={action}><Tag aria-hidden="true" className="size-4 shrink-0" />Qiymət</button>
                          <button type="button" onClick={() => setTask({ kind: 'edit', row })} className={action}><Pencil aria-hidden="true" className="size-4 shrink-0" />Düzəlt</button>
                          <button type="button" onClick={() => setTask({ kind: 'delete', row })} className={`${action} hover:bg-(--y-up-soft) hover:text-(--y-up)`}><Trash2 aria-hidden="true" className="size-4 shrink-0" />Sil</button>
                        </span>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-(--y-muted)">Bu axtarışa uyğun mal yoxdur.</p>}
        </div>
        {shown.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 60)} className="min-h-10 w-full rounded-lg text-sm font-semibold text-(--y-bar) transition-colors hover:bg-(--y-row-hover) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--y-bar)">
            Daha çox göstər ({shown.length - limit} qalıb)
          </button>
        )}
      </div>

      {task && <CatalogDialog key={task.kind + (task.kind === 'add' ? '' : task.row.product.id)} task={task} keyValue={key} onKey={setKey} onClose={() => setTask(null)} />}
    </div>
  )
}

/** Under the price: its month — or why there is none: free internal supply (D-45, D-46), or no price written. */
function note(row: ProductRow) {
  if (row.latest) return monthName(row.latest.month)
  if (row.product.price !== undefined) return 'siyahı qiyməti'
  if (!row.lines.length) return ''
  return row.lines.every((line) => line.supplier.trim().toLocaleLowerCase('az') === 'qala baza') ? 'pulsuz (Qala Baza)' : 'qiyməti yoxdur'
}

/** Every product with its order lines, its year's amount, its units and its latest price — once, for the page. */
function rowsOf(): ProductRow[] {
  const byProduct = new Map<string, Line[]>()
  for (const line of allLines) {
    const list = byProduct.get(line.productId)
    if (list) list.push(line)
    else byProduct.set(line.productId, [line])
  }
  return [...products.values()].map((product) => {
    const lines = byProduct.get(product.id) ?? []
    const priced = lines.filter((line) => line.price > 0)
    const month = Math.max(0, ...priced.map((line) => line.month))
    const inLatest = priced.filter((line) => line.month === month)
    const unit = inLatest[0]?.unit ?? product.unit
    const prices = inLatest.filter((line) => line.unit === unit).map((line) => line.price)
    return {
      product,
      path: pathOf(product.leafId),
      lines,
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      units: [...new Set(lines.filter((line) => line.price > 0).map((line) => line.unit))].sort(),
      latest: prices.length ? { month, low: Math.min(...prices), high: Math.max(...prices), unit } : null,
    }
  })
}
