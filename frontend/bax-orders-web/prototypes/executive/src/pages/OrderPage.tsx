import { Link, useParams } from 'react-router'
import { approvalOf, hasData, isValidMonth, outsideRequestsIn } from '../data/analysis'
import { allOrders, categories, linesById, products, sites, YEAR, type Line } from '../data/model'
import { money, monthName, price, quantity } from '../lib/format'
import { paths, useComparison } from '../lib/links'
import { trailFor } from '../lib/trail'
import { OutsideFlowNote, OutsideRequestList, packageWords } from '../ui/kinds'
import { OrderChanges } from '../ui/OrderChanges'
import { ApprovalBadge, Breadcrumbs, Money, Notice, PageTitle } from '../ui/parts'
import { NotFound } from './NotFound'

/**
 * The concrete order behind an object's month: every line, grouped by main category. The approval is the month's —
 * one decision for every object — so it is stated once, not on the order.
 */
export function OrderPage() {
  const params = useParams()
  const year = Number(params.year)
  const month = Number(params.month)
  const { link, basis, period, setBasis } = useComparison(month)
  const site = sites.get(params.siteId ?? '')
  const order = site ? allOrders.get(`${site.id}-${month}`) : undefined

  if (year !== YEAR || !isValidMonth(month) || !hasData(month) || !site) return <NotFound />
  if (!order) return <NotFound message={`${site.name} ${monthName(month)} ${YEAR} üçün sifariş verməyib.`} />

  const lines = order.lineIds.map((id) => linesById.get(id)!)
  const urgent = outsideRequestsIn(month, site.id)
  const groups = new Map<string, Line[]>()
  for (const line of lines) {
    const root = products.get(line.productId)!.rootId
    groups.set(root, [...(groups.get(root) ?? []), line])
  }
  const sum = (items: Line[]) => Math.round(items.reduce((total, line) => total + line.amount, 0) * 100) / 100
  const ordered = [...groups].sort((left, right) => sum(right[1]) - sum(left[1]))

  return (
    <>
      <Breadcrumbs trail={trailFor({ month, siteId: site.id, order: true, link })} />
      <PageTitle eyebrow={order.number ? `Aylıq sifariş ${order.number}` : 'Aylıq sifariş'}>{site.name}, {monthName(month)} {YEAR}</PageTitle>

      <div className="-mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-2">
        <ApprovalBadge approval={approvalOf(month)} />
        {order.submittedDay > 0 && <span>Göndərilib: {order.submittedDay} {monthName(month).toLocaleLowerCase('az')}</span>}
        <span>{lines.length} sətir</span>
      </div>

      <Notice>Bu sifariş {monthName(month)} ayının aylıq sifarişlərindəndir: Rəhbər ayın aylıq sifarişlərini bütün obyektlər üçün bir dəfə təsdiqləyir ({packageWords(approvalOf(month)).toLocaleLowerCase('az')}). Bu sifarişin ayrıca təsdiqi yoxdur.</Notice>

      {/* What changed against the comparison comes first: whose price went up or down, whose quantity (owner request). */}
      <OrderChanges
        month={month}
        period={period}
        siteId={site.id}
        basis={basis}
        onBasis={setBasis}
        productHref={(productId) => link(paths.product(YEAR, month, productId, site.id), {}, { kind: 'monthly' })}
      />

      <section aria-label="Sifarişin sətirləri" className="overflow-hidden rounded-lg border border-line bg-paper">
        <table className="w-full text-left text-[15px]">
          <thead className="hidden border-b border-line bg-stone text-xs font-semibold text-muted md:table-header-group">
            <tr>
              <th scope="col" className="px-5 py-2.5">Məhsul</th>
              <th scope="col" className="px-3 py-2.5 text-right">Miqdar</th>
              <th scope="col" className="px-3 py-2.5 text-right">Qiymət</th>
              <th scope="col" className="px-3 py-2.5 text-right">Məbləğ</th>
              <th scope="col" className="px-5 py-2.5">Şirkət</th>
            </tr>
          </thead>
          {ordered.map(([rootId, items]) => (
            <tbody key={rootId} className="border-b border-line last:border-b-0">
              <tr className="bg-stone/60">
                <th scope="rowgroup" colSpan={3} className="px-4 py-2 text-sm font-semibold text-ink sm:px-5">{categories.get(rootId)!.name}</th>
                <td className="px-3 py-2 text-right text-sm"><Money value={sum(items)} size="sm" className="font-semibold" /></td>
                <td className="hidden md:table-cell" />
              </tr>
              {[...items].sort((left, right) => right.amount - left.amount).map((line) => {
                const product = products.get(line.productId)!
                return (
                  <tr key={line.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-line px-4 py-2.5 md:table-row md:px-0">
                    <td className="w-full md:w-auto md:px-5 md:py-2.5">
                      <Link to={link(paths.product(YEAR, month, product.id, site.id), {}, { kind: 'monthly' })} className="font-medium text-ink underline-offset-4 hover:text-sea hover:underline">{product.name}</Link>
                      <span className="block text-xs text-muted">{categories.get(product.midId)!.name} › {categories.get(product.leafId)!.name}</span>
                    </td>
                    <td className="tnum text-sm text-ink-2 md:px-3 md:py-2.5 md:text-right">{quantity(line.qty, line.unit)}</td>
                    <td className="tnum text-sm text-ink-2 md:px-3 md:py-2.5 md:text-right">× {price(line.price)}</td>
                    <td className="tnum ml-auto font-semibold md:px-3 md:py-2.5 md:text-right">{money(line.amount)}</td>
                    <td className="w-full text-xs text-muted md:w-auto md:px-5 md:py-2.5 md:text-sm">{line.supplier}</td>
                  </tr>
                )
              })}
            </tbody>
          ))}
          <tfoot className="border-t-2 border-line bg-stone">
            <tr>
              <th scope="row" colSpan={3} className="px-4 py-3 text-sm font-semibold sm:px-5">Aylıq sifarişin cəmi</th>
              <td className="px-3 py-3 text-right"><Money value={sum(lines)} className="font-semibold" /></td>
              <td className="hidden md:table-cell" />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* The object's urgent requests in the same month: apart from the monthly order, each with its own consent. */}
      <section aria-labelledby="urgent-title" className="flex flex-col gap-3">
        <h2 id="urgent-title" className="text-lg font-semibold text-ink">Aylıqdan kənar sifarişlər ({urgent.length})</h2>
        {urgent.length > 0 && <OutsideFlowNote />}
        <OutsideRequestList requests={urgent} />
      </section>
    </>
  )
}
