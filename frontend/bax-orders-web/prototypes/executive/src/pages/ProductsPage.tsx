import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import { allLines, DATA_EDITS, products, YEAR, type Line } from '../data/model'
import { money, monthName } from '../lib/format'
import { CatalogDialog, CategoryPicker, pathOf, priceText, type CatalogTask, type ProductRow } from '../ui/CatalogDialog'
import { importEnabled, when } from '../ui/ImportButton'
import { NotFound } from './NotFound'
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

  if (year !== YEAR) return <NotFound message={`Prototip yalnız ${YEAR} ilini göstərir.`} />

  const needle = query.trim().toLocaleLowerCase('az')
  const shown = rows
    .filter((row) => (!picked.root || row.product.rootId === picked.root)
      && (!picked.mid || row.product.midId === picked.mid)
      && (!picked.leaf || row.product.leafId === picked.leaf)
      && (!needle || row.product.name.toLocaleLowerCase('az').includes(needle) || row.path.toLocaleLowerCase('az').includes(needle)))
    .sort(sort === 'ad' ? (left, right) => left.product.name.localeCompare(right.product.name, 'az') : (left, right) => right.amount - left.amount)
  const action = 'inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-(--y-ink-2) hover:bg-(--y-band) hover:text-(--y-ink)'

  return (
    <div className="year-view flex flex-col gap-4 lg:-mt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 id="page-title" tabIndex={-1} className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] outline-none">Mallar</h1>
          <p className="text-sm text-(--y-muted)">
            {rows.length} mal. Qiymət, ad, kateqoriya, yeni mal və silinmə hamı üçün keçərlidir: hər dəyişiklik əvvəl yoxlanır, sonra təsdiqlənir.
          </p>
        </div>
        {importEnabled && (
          <button type="button" onClick={() => setTask({ kind: 'add' })} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-(--y-ink) px-4 text-sm font-semibold text-(--y-surface)">
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

      <div className="flex flex-col gap-3 rounded-xl border border-(--y-line) bg-(--y-surface) p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-(--y-muted) lg:w-72">
            Axtar
            <span className="flex h-10 items-center gap-2 rounded-lg border border-(--y-line) px-2.5 focus-within:border-(--y-bar)">
              <Search aria-hidden="true" className="size-4 shrink-0 text-(--y-muted)" />
              <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60) }} placeholder="Malın adı…" className="min-w-0 flex-1 bg-transparent text-sm font-normal text-(--y-ink) outline-none" />
            </span>
          </label>
          <CategoryPicker value={picked} onChange={(next) => { setPicked(next); setLimit(60) }} allowAll className="flex-1" />
          <label className="flex flex-col gap-1 text-xs font-semibold text-(--y-muted)">
            Sırala
            <select value={sort} onChange={(event) => setSort(event.target.value as 'ad' | 'mebleg')} className="h-10 rounded-lg border border-(--y-line) bg-(--y-surface) px-2 text-sm font-normal text-(--y-ink)">
              <option value="ad">Ad</option>
              <option value="mebleg">Məbləğ</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-(--y-muted)">{shown.length} mal tapıldı</p>

        <div role="region" aria-label="Mallar" tabIndex={0} className="relative -mx-1 overflow-x-auto px-1">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-[11px] font-semibold text-(--y-ink-2)">
                <th scope="col" className="border-b border-(--y-line) px-3 py-2 text-left">Mal</th>
                <th scope="col" className="border-b border-(--y-line) px-3 py-2 text-right">Son qiymət</th>
                <th scope="col" className="border-b border-(--y-line) px-3 py-2 text-right">İl üzrə məbləğ</th>
                <th scope="col" className="border-b border-(--y-line) px-3 py-2 text-right">Sətir</th>
                {importEnabled && <th scope="col" className="border-b border-(--y-line) px-3 py-2"><span className="sr-only">Əməliyyatlar</span></th>}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, limit).map((row) => (
                <tr key={row.product.id} data-product={row.product.id} className="group">
                  <th scope="row" className="max-w-[24rem] border-b border-(--y-line) px-3 py-2 text-left font-semibold group-hover:bg-(--y-band)">
                    <span className="block break-words">{row.product.name}</span>
                    <span className="block text-[11px] font-normal text-(--y-muted)">{row.path}</span>
                  </th>
                  <td className="tnum whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-right">
                    <span className="block">{priceText(row)}</span>
                    <span className="block text-[11px] text-(--y-muted)">{note(row)}</span>
                  </td>
                  <td className="tnum whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-right font-semibold">{row.lines.length ? money(row.amount) : <span className="font-normal text-(--y-muted)">—</span>}</td>
                  <td className="tnum whitespace-nowrap border-b border-(--y-line) px-3 py-2 text-right text-(--y-ink-2)">{row.lines.length}</td>
                  {importEnabled && (
                    <td className="whitespace-nowrap border-b border-(--y-line) px-2 py-1 text-right">
                      <button type="button" onClick={() => setTask({ kind: 'price', row })} className={action}><Tag aria-hidden="true" className="size-3.5" />Qiymət</button>
                      <button type="button" onClick={() => setTask({ kind: 'edit', row })} className={action}><Pencil aria-hidden="true" className="size-3.5" />Düzəlt</button>
                      <button type="button" onClick={() => setTask({ kind: 'delete', row })} className={`${action} hover:text-(--y-up)`}><Trash2 aria-hidden="true" className="size-3.5" />Sil</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-(--y-muted)">Bu axtarışa uyğun mal yoxdur.</p>}
        </div>
        {shown.length > limit && (
          <button type="button" onClick={() => setLimit(limit + 60)} className="w-full rounded-lg py-2 text-sm font-semibold text-(--y-bar) hover:bg-(--y-band)">
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
