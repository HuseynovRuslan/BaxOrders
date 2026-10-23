import { Link, useParams } from 'react-router'
import { MapPin } from 'lucide-react'
import { categoryRows, figure, hasData, isValidMonth, productRows } from '../data/analysis'
import { categories, sites, YEAR } from '../data/model'
import { paths, useComparison } from '../lib/links'
import { levelNames, trailFor } from '../lib/trail'
import { Breakdown } from '../ui/Breakdown'
import { KindBadge, kindLabels } from '../ui/kinds'
import { Breadcrumbs, ComparisonSelect, FigureBand, PageTitle } from '../ui/parts'
import { NotFound } from './NotFound'

/**
 * One category, at any of its three levels, for the whole company or inside one object. Its own three figures, then
 * what it is made of: the next category level, or — under a sub-category — its products. Products are not a fourth
 * category level; they are what the last level holds.
 */
export function CategoryPage() {
  const params = useParams()
  const year = Number(params.year)
  const month = Number(params.month)
  const comparison = useComparison(month)
  const category = categories.get(params.categoryId ?? '')
  const siteId = params.siteId
  const site = siteId ? sites.get(siteId) : undefined

  if (year !== YEAR || !isValidMonth(month) || !hasData(month) || !category || (siteId && !site)) return <NotFound />

  const { period, basis, setBasis, kind, link } = comparison
  const scope = { kind, siteId, categoryId: category.id }
  const total = figure(month, period, scope)
  const leaf = category.level === 3
  const rows = leaf ? productRows(month, period, kind, category.id, siteId) : categoryRows(month, period, kind, category.id, siteId)
  const childName = leaf ? 'Məhsul' : levelNames[(category.level + 1) as 2 | 3]

  return (
    <>
      <Breadcrumbs trail={trailFor({ month, siteId, categoryId: category.id, link })} />

      <PageTitle
        eyebrow={levelNames[category.level]}
        aside={<ComparisonSelect basis={basis} onChange={setBasis} period={period} />}
      >
        {category.name}
      </PageTitle>

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <KindBadge kind={kind} month={month} />
        {site && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-paper px-2.5 py-1 text-sm text-ink-2 ring-1 ring-line">
            <MapPin aria-hidden="true" className="size-4 text-sea" />
            Yalnız {site.name}
            <Link to={link(paths.category(YEAR, month, category.id))} className="font-semibold text-sea underline-offset-4 hover:underline">
              bütün obyektlər üzrə bax
            </Link>
          </span>
        )}
      </div>

      <FigureBand month={month} period={period} figure={total} label={kindLabels[kind]} />

      <Breakdown
        label={leaf ? 'Məhsullar' : `${childName}lar`}
        nameHeader={childName}
        rows={rows}
        total={total}
        period={period}
        products={leaf}
        hrefOf={(row) => link(leaf ? paths.product(YEAR, month, row.id, siteId) : paths.category(YEAR, month, row.id, siteId))}
      />
    </>
  )
}
