import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Building2, FileText, MapPin } from 'lucide-react'
import { compareProduct, hasData, isValidMonth, productBySite, productBySupplier, type Period, type ProductComparison, type ProductSiteRow, type ProductSupplierRow } from '../data/analysis'
import { allOrders, categories, products, sites, YEAR, type Product } from '../data/model'
import { direction, minus, money, monthName, percent, price, quantity, quantityParts, signedMoney } from '../lib/format'
import { paths, useComparison } from '../lib/links'
import { trailFor } from '../lib/trail'
import { KindBadge } from '../ui/kinds'
import { Breadcrumbs, ComparisonSelect, Delta, Money, NewTag, Notice, PageTitle, ViewTabs } from '../ui/parts'
import { NotFound } from './NotFound'

const viewParam = 'gorunus'

/**
 * The last level, and the one that answers «why»: the product's money in both periods, split into how much was
 * ordered and at what price. «Ümumi müqayisə» for the product as a whole; «Obyektlər üzrə» for who ordered it, each
 * with the way to their order; «Şirkətlər üzrə» for whom it was bought from, each company's price beside the others'.
 */
export function ProductPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const year = Number(params.year)
  const month = Number(params.month)
  const comparison = useComparison(month)
  const product = products.get(params.productId ?? '')
  const siteId = params.siteId
  const site = siteId ? sites.get(siteId) : undefined

  if (year !== YEAR || !isValidMonth(month) || !hasData(month) || !product || (siteId && !site)) return <NotFound />

  const { period, basis, setBasis, kind, link } = comparison
  const result = compareProduct(month, period, kind, product.id, siteId)
  const view = search.get(viewParam)
  const bySite = !siteId && view === 'obyektler'
  const bySupplier = view === 'sirketler'
  const siteRows = siteId ? [] : productBySite(month, period, kind, product.id)
  const supplierRows = productBySupplier(month, period, kind, product.id, siteId)
  const here = paths.product(YEAR, month, product.id, siteId)

  return (
    <>
      <Breadcrumbs trail={trailFor({ month, siteId, productId: product.id, link })} />

      <PageTitle eyebrow="Məhsul" aside={<ComparisonSelect basis={basis} onChange={setBasis} period={period} />}>
        {product.name}
      </PageTitle>

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <KindBadge kind={kind} month={month} />
        {site && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-paper px-2.5 py-1 text-sm text-ink-2 ring-1 ring-line">
            <MapPin aria-hidden="true" className="size-4 text-sea" />
            Yalnız {site.name}
            <Link to={link(paths.product(YEAR, month, product.id))} className="font-semibold text-sea underline-offset-4 hover:underline">bütün obyektlər üzrə bax</Link>
          </span>
        )}
        {site && allOrders.has(`${site.id}-${month}`) && (
          <Link to={link(paths.order(YEAR, month, site.id))} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-semibold text-ink hover:border-sea hover:text-sea">
            <FileText aria-hidden="true" className="size-4" />Sifarişi aç
          </Link>
        )}
      </div>

      <ViewTabs
        label="Görünüş"
        tabs={[
          { label: 'Ümumi müqayisə', to: link(here), active: !bySite && !bySupplier },
          ...(siteId ? [] : [{ label: 'Obyektlər üzrə', to: link(here, { [viewParam]: 'obyektler' }), active: bySite, count: siteRows.length }]),
          { label: 'Şirkətlər üzrə', to: link(here, { [viewParam]: 'sirketler' }), active: bySupplier, count: supplierRows.length },
        ]}
      />

      {bySite ? (
        <SplitTable
          label="Obyektlər üzrə"
          nameHeader="Obyekt"
          intro={<><span className="tnum font-semibold text-ink">{siteRows.length}</span> obyekt bu məhsulu bu ay və ya müqayisə dövründə sifariş edib. Fərqə görə sıralanıb.</>}
          rows={siteRows.map((row) => siteSplit(row, month, product, link))}
          total={result}
          month={month}
          period={period}
          product={product}
        />
      ) : bySupplier ? (
        <SplitTable
          label="Şirkətlər üzrə"
          nameHeader="Şirkət"
          intro={<><span className="tnum font-semibold text-ink">{supplierRows.length}</span> şirkətdən bu ay və ya müqayisə dövründə alınıb{site ? ` (${site.name})` : ''}. Bu ayın məbləğinə görə sıralanıb; qiymət hər şirkətin öz çəkili ortasıdır.</>}
          rows={supplierRows.map((row) => ({ key: row.supplierId, name: row.name, comparison: row.comparison, mark: cheapest(supplierRows, row) }))}
          total={result}
          month={month}
          period={period}
          product={product}
        />
      ) : (
        <Overview result={result} month={month} period={period} product={product} siteRows={siteRows} supplierRows={supplierRows}
          onSites={siteId ? undefined : link(here, { [viewParam]: 'obyektler' })}
          onSuppliers={link(here, { [viewParam]: 'sirketler' })} />
      )}
    </>
  )
}

// ---- Ümumi müqayisə -----------------------------------------------------------------------------------------------

function Overview({ result, month, period, product, siteRows, supplierRows, onSites, onSuppliers }: {
  result: ProductComparison
  month: number
  period: Period
  product: Product
  siteRows: ProductSiteRow[]
  supplierRows: ProductSupplierRow[]
  onSites?: string
  onSuppliers: string
}) {
  const verdict = explain(result, period)
  const unit = result.current.units[0] ?? result.comparison?.units[0] ?? product.unit
  const columnLabel = period.isAverage ? 'Müqayisə (aylıq orta)' : 'Əvvəlki ay'
  const contributors = siteRows.filter((row) => (row.comparison.deltaAmount ?? 0) !== 0).slice(0, 3)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <section aria-labelledby="verdict" className="rounded-lg border border-line bg-paper p-5 sm:p-6">
          <h2 id="verdict" className="text-sm font-semibold text-muted">Nə dəyişdi?</h2>
          <p className="mt-1.5 text-[clamp(1.15rem,2.4vw,1.4rem)] font-semibold leading-[1.35] text-ink">{verdict.headline}</p>
          {verdict.points.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-[15px] text-ink-2">
              {verdict.points.map((point) => <li key={point} className="flex gap-2"><span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sea" />{point}</li>)}
            </ul>
          )}
        </section>

        <section aria-labelledby="matrix" className="overflow-hidden rounded-lg border border-line bg-paper">
          <h2 id="matrix" className="sr-only">Dövrlərin müqayisəsi</h2>
          <table className="w-full text-left">
            <thead className="border-b border-line bg-stone text-xs font-semibold text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 sm:px-5"><span className="sr-only">Göstərici</span></th>
                <th scope="col" className="px-3 py-3 text-right">{monthName(month)} {YEAR}</th>
                <th scope="col" className="px-3 py-3 text-right">
                  {columnLabel}
                  <span className="block font-normal">{period.unavailable ? '—' : period.label.replace(' · aylıq ortalama', '')}</span>
                </th>
                <th scope="col" className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">Dəyişmə</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[15px]">
              <MatrixRow
                label="Məbləğ"
                current={<Money value={result.current.lineCount ? result.current.amount : null} className="font-semibold" />}
                previous={result.comparison && result.comparison.lineCount ? <Money value={result.comparison.amount} /> : <span className="text-muted">yox idi</span>}
                change={result.deltaAmount === null ? <span className="text-muted">—</span> : <Delta value={result.deltaAmount} pct={result.comparison?.amount ? result.deltaAmount / result.comparison.amount : null} size="sm" />}
              />
              <MatrixRow
                label="Miqdar"
                current={result.current.qty === null ? <Parts parts={result.current.parts} /> : quantity(result.current.qty, unit)}
                previous={!result.comparison?.lineCount ? <span className="text-muted">—</span> : result.comparison.qty === null ? <Parts parts={result.comparison.parts} /> : quantity(result.comparison.qty, unit)}
                change={result.deltaQty === null ? <span className="text-muted">—</span> : <Change neutral value={result.deltaQty} pct={result.qtyPct} text={`${result.deltaQty > 0 ? '+' : result.deltaQty < 0 ? minus : ''}${quantity(Math.abs(result.deltaQty), unit)}`} />}
              />
              <MatrixRow
                label="Orta qiymət"
                hint="məbləğ ÷ miqdar"
                current={result.current.price === null ? <Mixed /> : <UnitPrice value={result.current.price} unit={unit} />}
                previous={!result.comparison?.lineCount ? <span className="text-muted">—</span> : result.comparison.price === null ? <Mixed /> : <UnitPrice value={result.comparison.price} unit={unit} />}
                change={result.pricePct === null || !result.comparison?.price ? <span className="text-muted">—</span> : <Change value={result.current.price! - result.comparison.price} pct={result.pricePct} text={signedMoney(result.current.price! - result.comparison.price)} />}
              />
            </tbody>
          </table>
        </section>

        {result.priceEffect !== null && result.qtyEffect !== null && result.deltaAmount !== null && Math.abs(result.deltaAmount) >= 0.01 && (
          <EffectSplit priceEffect={result.priceEffect} qtyEffect={result.qtyEffect} total={result.deltaAmount} />
        )}

        <Notes result={result} period={period} unit={unit} />
      </div>

      <aside className="flex flex-col gap-4">
        {onSites && (
          <section aria-labelledby="contributors" className="rounded-lg border border-line bg-paper p-5">
            <h2 id="contributors" className="text-sm font-semibold text-ink">Fərqə ən çox təsir edən obyektlər</h2>
            {contributors.length === 0 ? <p className="mt-2 text-sm text-muted">Obyektlər üzrə fərq yoxdur.</p> : (
              <ol className="mt-3 flex flex-col divide-y divide-line">
                {contributors.map((row) => (
                  <li key={row.siteId} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 break-words text-ink">{row.name}</span>
                    <Delta value={row.comparison.deltaAmount} size="sm" />
                  </li>
                ))}
              </ol>
            )}
            <Link to={onSites} className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-sea underline-offset-4 hover:underline">
              Bütün obyektlər: miqdar, qiymət, məbləğ
            </Link>
          </section>
        )}
        <SupplierCard rows={supplierRows} unit={unit} href={onSuppliers} />
        <section className="rounded-lg border border-line bg-paper p-5 text-sm text-ink-2">
          <h2 className="font-semibold text-ink">Vahid</h2>
          <p className="mt-1">{product.unit}{result.current.units.length > 1 ? ` (bu ay: ${result.current.units.join(', ')})` : ''}</p>
          <h2 className="mt-3 font-semibold text-ink">Kateqoriya</h2>
          <p className="mt-1">{categories.get(product.rootId)!.name} › {categories.get(product.midId)!.name} › {categories.get(product.leafId)!.name}</p>
        </section>
      </aside>
    </div>
  )
}

function MatrixRow({ label, hint, current, previous, change }: { label: string; hint?: string; current: ReactNode; previous: ReactNode; change: ReactNode }) {
  return (
    <tr className="align-top">
      <th scope="row" className="px-4 py-3.5 font-semibold text-ink sm:px-5">
        {label}
        {hint && <span className="block text-xs font-normal text-muted">{hint}</span>}
        <span className="mt-1 block text-sm font-normal sm:hidden">{change}</span>
      </th>
      <td className="tnum px-3 py-3.5 text-right text-ink">{current}</td>
      <td className="tnum px-3 py-3.5 text-right text-ink-2">{previous}</td>
      <td className="hidden px-4 py-3.5 text-right sm:table-cell sm:px-5"><span className="inline-flex justify-end">{change}</span></td>
    </tr>
  )
}

function UnitPrice({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className="whitespace-nowrap">{money(value)}</span>
      <span className="whitespace-nowrap text-xs text-muted">1 {unit} üçün</span>
    </span>
  )
}

function Mixed() {
  return <span className="text-sm text-ink-2">vahidlər fərqli</span>
}

/** Quantities in more than one unit, each kept in its own. */
function Parts({ parts }: { parts: readonly { qty: number; unit: string }[] }) {
  return <span className="text-sm text-ink-2">{quantityParts(parts)}</span>
}

/**
 * A change of quantity or price. A price is a cost and takes the cost colours; a quantity is not a cost on its own —
 * ordering more is not good or bad by itself — so it stays neutral and says its direction with its sign.
 */
function Change({ value, pct, text, neutral = false }: { value: number; pct: number | null; text: string; neutral?: boolean }) {
  const way = direction(value)
  const tone = neutral ? 'text-ink' : way === 'up' ? 'text-up' : way === 'down' ? 'text-down' : 'text-muted'
  const pill = neutral ? 'bg-stone-2 text-ink-2' : way === 'up' ? 'bg-up-soft text-up' : way === 'down' ? 'bg-down-soft text-down' : 'bg-stone-2 text-muted'
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className={`tnum font-semibold ${tone}`}>{text}</span>
      {pct !== null && <span className={`tnum rounded px-1.5 py-0.5 text-xs font-semibold ${pill}`}>{percent(pct)}</span>}
    </span>
  )
}

/**
 * The amount difference split in two: what the change of price did at this month's quantity, and what the change of
 * quantity did at the comparison's price. The two add up to the difference exactly. It is arithmetic, not a cause.
 */
function EffectSplit({ priceEffect, qtyEffect, total }: { priceEffect: number; qtyEffect: number; total: number }) {
  const scale = Math.max(Math.abs(priceEffect), Math.abs(qtyEffect), Math.abs(total), 0.01)
  const rows = [
    { label: 'Qiymət dəyişməsi', value: priceEffect },
    { label: 'Miqdar dəyişməsi', value: qtyEffect },
    { label: 'Cəmi fərq', value: total, strong: true },
  ]
  return (
    <section aria-labelledby="split" className="rounded-lg border border-line bg-paper p-5 sm:p-6">
      <h2 id="split" className="text-sm font-semibold text-ink">Məbləğ fərqinin bölgüsü</h2>
      <p className="mt-1 text-sm text-muted">Qiymət dəyişməsi bu ayın miqdarı ilə, miqdar dəyişməsi müqayisə dövrünün qiyməti ilə hesablanır. Bu, riyazi bölgüdür; səbəbi göstərmir.</p>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map((row) => {
          const width = (Math.abs(row.value) / scale) * 50
          const way = direction(row.value)
          const color = way === 'up' ? 'bg-up' : way === 'down' ? 'bg-down' : 'bg-line-2'
          return (
            <div key={row.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_8.5rem]">
              <span className={`text-sm ${row.strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>{row.label}</span>
              <span aria-hidden="true" className="relative h-3 rounded-sm bg-stone-2">
                <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line-2" />
                <span
                  className={`absolute inset-y-0 rounded-sm ${color} ${row.strong ? '' : 'opacity-80'}`}
                  style={row.value >= 0 ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
                />
              </span>
              <span className={`tnum col-start-2 text-sm font-semibold sm:col-start-auto sm:text-right ${way === 'up' ? 'text-up' : way === 'down' ? 'text-down' : 'text-muted'}`}>{signedMoney(row.value)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Notes({ result, period, unit }: { result: ProductComparison; period: Period; unit: string }) {
  const notes: { text: string; warn?: boolean }[] = []
  const [low, high] = result.current.priceRange ?? [0, 0]
  if (!result.comparable && result.current.lineCount && result.comparison?.lineCount) {
    const units = [...new Set([...result.current.units, ...result.comparison.units])]
    notes.push({ warn: true, text: `Vahidlər fərqlidir (${units.join(', ')}): ${units.join(' ilə ')} bir-birinə çevrilmir, ona görə miqdar və qiymət birbaşa müqayisə olunmur. Yalnız məbləğ müqayisə olunur.` })
  }
  // A range of prices across different units says nothing: the note is for one unit only.
  if (result.current.priceRange && result.current.units.length === 1 && high - low >= 0.01) {
    notes.push({ text: `Bu ay ${result.current.lineCount} sifariş sətrində qiymət ${money(low)} ilə ${money(high)} arasındadır. Orta qiymət çəkili ortadır: ümumi məbləğ ümumi miqdara bölünür.` })
  }
  if (period.isAverage && !period.unavailable) {
    notes.push({ text: `Müqayisə ${period.months.length} ayın aylıq ortalamasıdır: məbləğ və miqdar aylıq orta, qiymət həmin ayların çəkili ortasıdır (${unit} üzrə).` })
  }
  if (period.incomplete) notes.push({ warn: true, text: `Müqayisə dövrü natamamdır: ${period.wanted} ay istənilir, ${period.months.length} ay mövcuddur.` })
  if (notes.length === 0) return null
  return <div className="flex flex-col gap-2">{notes.map((note) => <Notice key={note.text} tone={note.warn ? 'warn' : 'info'}>{note.text}</Notice>)}</div>
}

/**
 * The sentence at the top: what changed, in plain words, without claiming a cause. It names a direction only where the
 * figures moved by more than one per cent, and says which part of the difference is larger only where it clearly is.
 */
function explain(result: ProductComparison, period: Period): { headline: string; points: string[] } {
  const current = result.current, before = result.comparison
  if (period.unavailable || !before) return { headline: 'Müqayisə üçün əvvəlki dövr yoxdur.', points: [] }
  if (!current.lineCount) return { headline: `Bu ay sifariş olunmayıb. Müqayisə dövründə ayda orta ${money(before.amount)} idi.`, points: [] }
  if (!before.lineCount) return { headline: `Bu məhsul müqayisə dövründə sifariş olunmayıb: bu ayın ${money(current.amount)} xərci yenidir.`, points: [] }

  const amountWords = direction(result.deltaAmount) === 'up' ? 'artıb' : direction(result.deltaAmount) === 'down' ? 'azalıb' : 'dəyişməyib'
  if (!result.comparable) {
    return {
      headline: `Məbləğ ${money(Math.abs(result.deltaAmount ?? 0))} ${amountWords}. Vahidlər fərqli olduğu üçün bunu qiymətə və miqdara ayırmaq olmur.`,
      points: [],
    }
  }

  const points: string[] = []
  const unit = current.units[0]
  const p = result.pricePct ?? 0, q = result.qtyPct ?? 0
  points.push(Math.abs(p) < 0.01
    ? `Qiymət demək olar dəyişməyib (${price(before.price, unit)}).`
    : `Qiymət ${percent(Math.abs(p), false)} ${p > 0 ? 'bahalaşıb' : 'ucuzlaşıb'}: ${price(before.price, unit)} → ${price(current.price, unit)}.`)
  points.push(Math.abs(q) < 0.01
    ? `Miqdar demək olar dəyişməyib (${quantity(current.qty, unit)}).`
    : `${percent(Math.abs(q), false)} ${q > 0 ? 'çox' : 'az'} sifariş olunub: ${quantity(before.qty, unit)} → ${quantity(current.qty, unit)}.`)

  const pe = Math.abs(result.priceEffect ?? 0), qe = Math.abs(result.qtyEffect ?? 0)
  const share = pe >= 2 * qe ? 'fərqin əsas hissəsi qiymət dəyişməsinə düşür' : qe >= 2 * pe ? 'fərqin əsas hissəsi miqdar dəyişməsinə düşür' : 'həm qiymət, həm miqdar dəyişib'
  return { headline: `Məbləğ ${money(Math.abs(result.deltaAmount ?? 0))} ${amountWords} — ${share}.`, points }
}

/**
 * Who sold it this month: each company's amount, share and weighted price, so a second, dearer company is seen at
 * once. Only this month's companies; the comparison is on «Şirkətlər üzrə».
 */
function SupplierCard({ rows, unit, href }: { rows: ProductSupplierRow[]; unit: string; href: string }) {
  const current = rows.filter((row) => row.comparison.current.lineCount > 0)
  const total = current.reduce((sum, row) => sum + row.comparison.current.amount, 0)
  return (
    <section aria-labelledby="suppliers" className="rounded-lg border border-line bg-paper p-5">
      <h2 id="suppliers" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Building2 aria-hidden="true" className="size-4 text-sea" />
        {current.length === 1 ? 'Şirkət' : `Şirkətlər · ${current.length}`}
      </h2>
      {current.length === 0 ? <p className="mt-2 text-sm text-muted">Bu ay alınmayıb.</p> : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {current.map((row) => {
            const side = row.comparison.current
            const share = total > 0 ? side.amount / total : 0
            return (
              <li key={row.supplierId} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words font-semibold text-ink">{row.name}</span>
                  <Money value={side.amount} size="sm" className="shrink-0 font-semibold" />
                </span>
                {current.length > 1 && (
                  <span aria-hidden="true" className="block h-1 rounded-full bg-stone-2">
                    <span className="block h-1 rounded-full bg-bar" style={{ width: `${Math.max(1.5, share * 100)}%` }} />
                  </span>
                )}
                <span className="tnum flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span>{side.units.length > 1 ? quantityParts(side.parts) : `${quantity(side.qty, unit)} × ${money(side.price)}`}</span>
                  {current.length > 1 && <span><span className="sr-only">Payı </span>{percent(share, false)}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > 0 && (
        <Link to={href} className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-sea underline-offset-4 hover:underline">
          Şirkətlər üzrə müqayisə
        </Link>
      )}
    </section>
  )
}

// ---- Obyektlər üzrə · Şirkətlər üzrə --------------------------------------------------------------------------------

interface SplitRow {
  key: string
  name: string
  comparison: ProductComparison
  /** Where the row opens, when it opens somewhere. */
  href?: string
  /** A second line under the name: the object's order. */
  sub?: ReactNode
  /** A word beside the name: the lowest price this month. */
  mark?: string
}

function siteSplit(row: ProductSiteRow, month: number, product: Product, link: (path: string, extra?: Record<string, string>) => string): SplitRow {
  const order = allOrders.get(`${row.siteId}-${month}`)
  return {
    key: row.siteId,
    name: row.name,
    comparison: row.comparison,
    href: link(paths.product(YEAR, month, product.id, row.siteId)),
    sub: order && row.comparison.current.lineCount > 0 && (
      <Link to={link(paths.order(YEAR, month, row.siteId))} className="relative z-10 inline-flex min-h-7 items-center gap-1 whitespace-nowrap text-xs font-semibold text-sea underline-offset-4 hover:underline">
        <FileText aria-hidden="true" className="size-3.5" />Sifariş{order.number ? ` ${order.number}` : ''}
      </Link>
    ),
  }
}

/**
 * «ən ucuz» beside the company with the lowest weighted price this month — only where two or more companies sold it
 * in the same unit and their prices really differ.
 */
function cheapest(rows: readonly ProductSupplierRow[], row: ProductSupplierRow): string | undefined {
  const priced = rows.filter((item) => item.comparison.current.price !== null && item.comparison.current.units.length === 1)
  if (priced.length < 2 || new Set(priced.map((item) => item.comparison.current.units[0])).size > 1) return undefined
  const prices = priced.map((item) => item.comparison.current.price!)
  const low = Math.min(...prices)
  if (Math.max(...prices) - low < 0.01) return undefined
  return row.comparison.current.price === low ? 'ən ucuz' : undefined
}

/** The product split by object or by company, each row both periods and the difference; the closing row is the product. */
function SplitTable({ label, nameHeader, intro, rows, total, month, period, product }: {
  label: string
  nameHeader: string
  intro: ReactNode
  rows: SplitRow[]
  /** The product as a whole: the closing row, equal to the sum of the rows above it. */
  total: ProductComparison
  month: number
  period: Period
  product: Product
}) {
  const compareLabel = period.isAverage ? 'Müqayisə (aylıq orta)' : 'Əvvəlki ay'
  const columns = 'lg:grid-cols-[minmax(12rem,1fr)_13rem_13rem_11rem]'
  return (
    <section aria-label={label} className="rounded-lg border border-line bg-paper">
      <p className="border-b border-line px-4 py-3 text-sm text-muted sm:px-5">{intro}</p>
      <div role="table" aria-label={`${label}: miqdar, qiymət və məbləğ`}>
        <div role="row" className={`hidden gap-4 border-b border-line px-5 py-2.5 text-xs font-semibold text-muted lg:grid ${columns}`}>
          <span role="columnheader">{nameHeader}</span>
          <span role="columnheader" className="text-right">{monthName(month)} {YEAR}</span>
          <span role="columnheader" className="text-right">{compareLabel}</span>
          <span role="columnheader" className="text-right">Fərq</span>
        </div>
        {rows.map((row) => {
          const cmp = row.comparison
          const unit = cmp.current.units[0] ?? cmp.comparison?.units[0] ?? product.unit
          return (
            <div key={row.key} role="row" className={`group relative grid grid-cols-1 gap-2 border-b border-line px-4 py-3.5 last:border-b-0 sm:px-5 lg:items-center lg:gap-4 ${row.href ? 'hover:bg-stone' : ''} ${columns}`}>
              <div role="cell" className="flex min-w-0 flex-col items-start gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {row.href
                    ? <Link to={row.href} className="stretched break-words text-[15px] font-semibold text-ink group-hover:text-sea">{row.name}</Link>
                    : <span className="break-words text-[15px] font-semibold text-ink">{row.name}</span>}
                  {row.mark && <span className="rounded bg-down-soft px-1.5 py-0.5 text-xs font-semibold text-down">{row.mark}</span>}
                </span>
                {row.sub}
              </div>
              <PeriodCell label={`${monthName(month)}:`} side={cmp.current.lineCount ? cmp.current : null} unit={unit} />
              <PeriodCell label={`${compareLabel}:`} side={cmp.comparison?.lineCount ? cmp.comparison : null} unit={unit} />
              <div role="cell" className="flex justify-end">
                {!cmp.comparison?.lineCount
                  ? <span className="inline-flex items-center gap-2"><Delta value={cmp.deltaAmount} size="sm" /><NewTag /></span>
                  : <Delta value={cmp.deltaAmount} pct={cmp.comparison.amount ? (cmp.deltaAmount ?? 0) / cmp.comparison.amount : null} size="sm" />}
              </div>
            </div>
          )
        })}
        <div role="row" className={`grid grid-cols-1 gap-2 border-t-2 border-line bg-stone px-4 py-3 sm:px-5 lg:items-center lg:gap-4 ${columns}`}>
          <span role="rowheader" className="text-sm font-semibold text-ink">Cəmi</span>
          <PeriodCell label={`${monthName(month)}:`} side={total.current.lineCount ? total.current : null} unit={product.unit} />
          <PeriodCell label={`${compareLabel}:`} side={total.comparison?.lineCount ? total.comparison : null} unit={product.unit} />
          <div role="cell" className="flex justify-end">
            <Delta value={total.deltaAmount} pct={total.comparison?.amount ? (total.deltaAmount ?? 0) / total.comparison.amount : null} size="sm" />
          </div>
        </div>
      </div>
    </section>
  )
}

/** One period of one object or company: the amount, and how it was made — quantity × the weighted price, or each unit apart. */
function PeriodCell({ label, side, unit }: { label: string; side: ProductComparison['current'] | null; unit: string }) {
  return (
    <div role="cell" className="flex items-baseline justify-between gap-3 lg:flex-col lg:items-end lg:gap-0.5">
      <span className="text-xs text-muted lg:hidden">{label}</span>
      {side === null ? <span className="text-sm text-muted">sifariş yox idi</span> : (
        <span className="flex flex-col items-end gap-0.5">
          <Money value={side.amount} className="font-semibold" />
          <span className="tnum text-xs text-muted">
            {side.units.length > 1 ? quantityParts(side.parts) : `${quantity(side.qty, unit)} × ${money(side.price)}`}
          </span>
        </span>
      )}
    </div>
  )
}
