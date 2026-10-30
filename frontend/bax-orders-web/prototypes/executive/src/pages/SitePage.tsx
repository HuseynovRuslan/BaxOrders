import { Link, useParams } from 'react-router'
import { FileText } from 'lucide-react'
import { categoryRows, figure, hasData, isValidMonth, linesFor, outsideRequestsIn } from '../data/analysis'
import { allOrders, sites, YEAR } from '../data/model'
import { quantity } from '../lib/format'
import { paths, useComparison } from '../lib/links'
import { trailFor } from '../lib/trail'
import { Breakdown } from '../ui/Breakdown'
import { KindBadge, kindLabels } from '../ui/kinds'
import { Breadcrumbs, ComparisonSelect, FigureBand, PageTitle } from '../ui/parts'
import { NotFound } from './NotFound'

/** One object in one month: its figures, its order, and what that order was made of by category. */
export function SitePage() {
  const params = useParams()
  const year = Number(params.year)
  const month = Number(params.month)
  const comparison = useComparison(month)
  const site = sites.get(params.siteId ?? '')

  if (year !== YEAR || !isValidMonth(month) || !hasData(month) || !site) return <NotFound />

  const { period, basis, setBasis, kind, link } = comparison
  const total = figure(month, period, { kind, siteId: site.id })
  const rows = categoryRows(month, period, kind, null, site.id)
  const urgent = outsideRequestsIn(month, site.id)
  const order = allOrders.get(`${site.id}-${month}`)
  const lineCount = linesFor(month, { kind: 'monthly', siteId: site.id }).length

  return (
    <>
      <Breadcrumbs trail={trailFor({ month, siteId: site.id, link })} />

      <PageTitle eyebrow={`Obyekt: ${site.kind.toLocaleLowerCase('az')}`} aside={<ComparisonSelect basis={basis} onChange={setBasis} period={period} />}>
        {site.name}
      </PageTitle>

      <div className="-mt-2 flex flex-wrap items-center gap-3">
        <KindBadge kind={kind} month={month} />
        {order && (
          <Link
            to={link(paths.order(YEAR, month, site.id))}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-semibold text-ink hover:border-sea hover:text-sea"
          >
            <FileText aria-hidden="true" className="size-4" />
            {order.number ? `Aylıq sifariş: ${order.number}` : 'Aylıq sifariş'}
            <span className="font-normal text-muted">({quantity(lineCount)} sətir)</span>
          </Link>
        )}
        {urgent.length > 0 && (
          <Link
            to={link(paths.order(YEAR, month, site.id))}
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-semibold text-ink hover:border-sea hover:text-sea"
          >
            Aylıqdan kənar: {urgent.length} sifariş
          </Link>
        )}
      </div>

      <FigureBand month={month} period={period} figure={total} label={kindLabels[kind]} />

      <Breakdown
        label={`${site.name} üzrə ana kateqoriyalar`}
        nameHeader="Ana kateqoriya"
        rows={rows}
        total={total}
        period={period}
        emptyText="Bu obyekt bu ay sifariş verməyib."
        hrefOf={(row) => link(paths.category(YEAR, month, row.id, site.id))}
      />
    </>
  )
}
