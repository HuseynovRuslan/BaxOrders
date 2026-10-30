import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { allLines, categories, LAST_MONTH_WITH_DATA, sites, type Line, type Product } from '../data/model'
import { money, moneyParts, monthName, monthNames } from '../lib/format'
import { callApi, ChangeLines, ErrorBox, KeyField, keyRequired, OutcomeBox, ReopenButton, type Changes } from './ImportButton'

/**
 * One edit in «Mallar» (owner, 2026-10-28): a product's price from a month on, its name or category, the product taken
 * out, or a new one — with, if wanted, its first order line. As with the workbook, the server checks it first and says
 * what would change («Yoxla»); nothing changes until «Təsdiq et», and «Geri qaytar» in «Excel yüklə» takes it back.
 */

export interface ProductRow {
  product: Product
  path: string
  lines: Line[]
  amount: number
  /** The units its order lines are in: a price is for one of them. */
  units: string[]
  /** Its price in the latest month it was ordered (a range when the lines differ), in that month's unit. */
  latest: { month: number; low: number; high: number; unit: string } | null
}

export type CatalogTask = { kind: 'price' | 'edit' | 'delete'; row: ProductRow } | { kind: 'add' }

export const pathOf = (leafId: string) => (categories.get(leafId)?.path ?? []).map((id) => categories.get(id)!.name).join(' › ')
/** A unit price keeps its qəpik: «0,91». */
export const unitPrice = (value: number) => { const parts = moneyParts(value); return `${parts.whole},${parts.cents}` }

export function priceText(row: ProductRow) {
  if (row.latest) {
    const { low, high, unit } = row.latest
    return `${low === high ? unitPrice(low) : `${unitPrice(low)}–${unitPrice(high)}`} ₼ / ${unit}`
  }
  return row.product.price !== undefined ? `${unitPrice(row.product.price)} ₼ / ${row.product.unit}` : '—'
}

interface Picked { root: string; mid: string; leaf: string }

const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name, 'az')
const level = (n: number, parent?: string) => [...categories.values()].filter((item) => item.level === n && (parent === undefined || item.parentId === parent)).sort(byName)

/** Ana → Orta → Alt as three lists, each narrowed by the one before. */
export function CategoryPicker({ value, onChange, allowAll = false, className = '' }: { value: Picked; onChange: (next: Picked) => void; allowAll?: boolean; className?: string }) {
  const select = 'h-10 min-w-0 rounded-lg border border-line bg-paper px-2 text-sm font-normal text-ink'
  const empty = allowAll ? 'Hamısı' : 'Seçin…'
  return (
    <div className={`grid gap-2 sm:grid-cols-3 ${className}`}>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
        Ana kateqoriya
        <select value={value.root} onChange={(event) => onChange({ root: event.target.value, mid: '', leaf: '' })} className={select}>
          <option value="">{empty}</option>
          {level(1).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
        Orta kateqoriya
        <select value={value.mid} disabled={!value.root} onChange={(event) => onChange({ ...value, mid: event.target.value, leaf: '' })} className={`${select} disabled:opacity-50`}>
          <option value="">{empty}</option>
          {value.root && level(2, value.root).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
        Alt kateqoriya
        <select value={value.leaf} disabled={!value.mid} onChange={(event) => onChange({ ...value, leaf: event.target.value })} className={`${select} disabled:opacity-50`}>
          <option value="">{empty}</option>
          {value.mid && level(3, value.mid).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
    </div>
  )
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; step: 'check' | 'apply' }
  | { kind: 'error'; message: string; details: string[] }
  | { kind: 'checked'; base: string; summary: string[]; changes: Changes }
  | { kind: 'done'; summary: string[]; changes: Changes }

const titles = { price: 'Qiyməti dəyiş', edit: 'Malı düzəlt', delete: 'Malı sil', add: 'Mal əlavə et' } as const
const units = [...new Set(allLines.map((line) => line.unit))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'az'))
const number = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.'))

export function CatalogDialog({ task, keyValue, onKey, onClose }: { task: CatalogTask; keyValue: string; onKey: (value: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const row = task.kind === 'add' ? null : task.row
  const product = row?.product

  const [price, setPrice] = useState(row?.latest ? unitPrice(row.latest.high) : product?.price !== undefined ? unitPrice(product.price) : '')
  const [fromMonth, setFromMonth] = useState(LAST_MONTH_WITH_DATA)
  const [unit, setUnit] = useState(row?.latest?.unit ?? row?.units[0] ?? product?.unit ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [picked, setPicked] = useState<Picked>({ root: product?.rootId ?? '', mid: product?.midId ?? '', leaf: product?.leafId ?? '' })
  const [newUnit, setNewUnit] = useState('ədəd')
  const [line, setLine] = useState({ siteId: '', month: String(LAST_MONTH_WITH_DATA), qty: '', kind: 'monthly' })
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const busy = status.kind === 'busy'
  // A check holds for what it was made with: any change, and it is made again.
  const reset = () => setStatus({ kind: 'idle' })
  const change = <T,>(set: (value: T) => void) => (value: T) => { set(value); reset() }

  const priceOk = Number.isFinite(number(price)) && price.trim() !== '' && number(price) >= 0
  const lineOk = !line.siteId || (Number.isFinite(number(line.qty)) && number(line.qty) > 0)
  const ready = (!keyRequired || Boolean(keyValue)) && {
    price: priceOk,
    edit: Boolean(name.trim()) && Boolean(picked.leaf),
    delete: true,
    add: Boolean(name.trim()) && Boolean(picked.leaf) && Boolean(newUnit.trim()) && priceOk && lineOk,
  }[task.kind]

  function body() {
    switch (task.kind) {
      case 'price': return { op: 'price', productId: product!.id, price: number(price), fromMonth, unit }
      case 'edit': return { op: 'edit', productId: product!.id, name: name.trim(), leafId: picked.leaf }
      case 'delete': return { op: 'delete', productId: product!.id }
      case 'add': return {
        op: 'add', name: name.trim(), leafId: picked.leaf, unit: newUnit.trim(), price: number(price),
        line: line.siteId ? { siteId: line.siteId, month: Number(line.month), qty: number(line.qty), kind: line.kind } : undefined,
      }
    }
  }

  async function call(step: 'check' | 'apply', base?: string) {
    setStatus({ kind: 'busy', step })
    const result = await callApi('catalog', step, keyValue, { base, body: JSON.stringify(body()), headers: { 'Content-Type': 'application/json' } })
    if (!result.ok) return setStatus({ kind: 'error', message: result.message, details: result.details })
    const answer = result.body as { base: string; summary: string[]; changes: Changes }
    setStatus(step === 'check' ? { kind: 'checked', base: answer.base, summary: answer.summary, changes: answer.changes } : { kind: 'done', summary: answer.summary, changes: answer.changes })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !ready) return
    if (status.kind === 'checked') void call('apply', status.base)
    else void call('check')
  }

  const field = 'h-10 rounded-lg border border-line bg-paper px-3 text-sm font-normal text-ink'
  const label = 'flex min-w-0 flex-col gap-1.5 text-sm font-semibold'
  const editing = status.kind !== 'checked' && status.kind !== 'done'
  const confirm = { price: 'Təsdiq et', edit: 'Təsdiq et', delete: 'Təsdiq et və sil', add: 'Təsdiq et və əlavə et' }[task.kind]

  return (
    <dialog
      ref={dialog}
      aria-labelledby="catalog-title"
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop:bg-ink/40"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="catalog-title" className="text-lg font-bold leading-snug">{titles[task.kind]}</h2>
            {row && <p className="mt-0.5 break-words text-sm text-ink-2"><b className="text-ink">{row.product.name}</b> · {row.path}</p>}
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Bağla" className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-stone-2 hover:text-ink">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        {editing && task.kind === 'price' && row && (
          <>
            <p className="text-sm text-ink-2">
              İndiki qiymət: <b className="text-ink">{priceText(row)}</b>{row.latest ? ` (${monthName(row.latest.month)})` : ''}. Seçilən aydan sonrakı bütün aylarda
              bu malın sifariş sətirləri yeni qiymətlə hesablanır; Qala Bazadan pulsuz sətirlər pulsuz qalır.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={label}>
                Yeni qiymət, ₼
                <input inputMode="decimal" required value={price} onChange={(event) => change(setPrice)(event.target.value)} className={field} />
              </label>
              <label className={label}>
                Hansı aydan
                <select value={fromMonth} onChange={(event) => change(setFromMonth)(Number(event.target.value))} className={field}>
                  {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                </select>
              </label>
              {row.units.length > 1 && (
                <label className={label}>
                  Vahid
                  <select value={unit} onChange={(event) => change(setUnit)(event.target.value)} className={field}>
                    {row.units.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              )}
            </div>
          </>
        )}

        {editing && task.kind === 'edit' && (
          <>
            <label className={label}>
              Ad
              <input required value={name} onChange={(event) => change(setName)(event.target.value)} className={field} />
            </label>
            <CategoryPicker value={picked} onChange={change(setPicked)} />
          </>
        )}

        {editing && task.kind === 'delete' && row && (
          <p className="text-sm leading-relaxed text-ink-2">
            {row.lines.length
              ? <>Bu malın <b className="text-ink">{row.lines.length} sifariş sətri ({money(row.amount)})</b> da silinəcək və rəqəmlər azalacaq. Səhv yazılmış malsa, əvvəlcə «Düzəlt» ilə adını düzəltmək olar.</>
              : 'Bu malın sifariş sətri yoxdur: yalnız siyahıdan silinir, rəqəmlər dəyişmir.'}
          </p>
        )}

        {editing && task.kind === 'add' && (
          <>
            <label className={label}>
              Malın adı
              <input required value={name} onChange={(event) => change(setName)(event.target.value)} placeholder="məsələn: Mop palirovka 60 sm" className={field} />
            </label>
            <CategoryPicker value={picked} onChange={change(setPicked)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>
                Vahid
                <input required list="catalog-units" value={newUnit} onChange={(event) => change(setNewUnit)(event.target.value)} className={field} />
                <datalist id="catalog-units">{units.map((item) => <option key={item} value={item} />)}</datalist>
              </label>
              <label className={label}>
                Qiymət, ₼
                <input inputMode="decimal" required value={price} onChange={(event) => change(setPrice)(event.target.value)} className={field} />
              </label>
            </div>
            <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
              <legend className="px-1 text-sm font-semibold">Sifarişə də əlavə et <span className="font-normal text-muted">(könüllü)</span></legend>
              <p className="-mt-1 text-xs text-muted">Obyekt seçməsəniz, mal yalnız siyahıya düşür və rəqəmlər dəyişmir.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Obyekt
                  <select value={line.siteId} onChange={(event) => change(setLine)({ ...line, siteId: event.target.value })} className={field}>
                    <option value="">— əlavə etmə —</option>
                    {[...sites.values()].sort(byName).map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </label>
                <label className={label}>
                  Ay
                  <select value={line.month} disabled={!line.siteId} onChange={(event) => change(setLine)({ ...line, month: event.target.value })} className={`${field} disabled:opacity-50`}>
                    {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                </label>
                <label className={label}>
                  Miqdar
                  <input inputMode="decimal" disabled={!line.siteId} required={Boolean(line.siteId)} value={line.qty} onChange={(event) => change(setLine)({ ...line, qty: event.target.value })} className={`${field} disabled:opacity-50`} />
                </label>
                <label className={label}>
                  Növ
                  <select value={line.kind} disabled={!line.siteId} onChange={(event) => change(setLine)({ ...line, kind: event.target.value })} className={`${field} disabled:opacity-50`}>
                    <option value="monthly">Aylıq sifariş</option>
                    <option value="outside">Aylıqdan kənar</option>
                  </select>
                </label>
              </div>
            </fieldset>
          </>
        )}

        {editing && keyRequired && <KeyField value={keyValue} onChange={(value) => { onKey(value); reset() }} />}

        <div aria-live="polite">
          {status.kind === 'busy' && <p className="text-sm text-ink-2">{status.step === 'check' ? 'Yoxlanılır…' : 'Yadda saxlanılır…'}</p>}
          {status.kind === 'error' && <ErrorBox message={status.message} details={status.details} />}
          {(status.kind === 'checked' || status.kind === 'done') && (
            <OutcomeBox done={status.kind === 'done'} heading={status.kind === 'done' ? 'Yadda saxlandı: dəyişiklik hamı üçün keçərlidir.' : 'Yoxlandı — hələ heç nə dəyişməyib.'}>
              <ul className="space-y-0.5 text-ink">
                {status.summary.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <ChangeLines changes={status.changes} done={status.kind === 'done'} />
            </OutcomeBox>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {status.kind === 'done' ? (
            <ReopenButton />
          ) : (
            <>
              <button
                type="button"
                onClick={status.kind === 'checked' ? reset : () => dialog.current?.close()}
                disabled={busy}
                className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-stone-2 disabled:opacity-50"
              >
                {status.kind === 'checked' ? 'Geri' : 'Ləğv et'}
              </button>
              <button type="submit" disabled={busy || !ready} className={`min-h-10 rounded-lg px-4 text-sm font-semibold text-paper disabled:opacity-50 ${task.kind === 'delete' && status.kind === 'checked' ? 'bg-up' : 'bg-ink'}`}>
                {status.kind === 'checked' || (status.kind === 'busy' && status.step === 'apply') ? confirm : 'Yoxla'}
              </button>
            </>
          )}
        </div>
      </form>
    </dialog>
  )
}
