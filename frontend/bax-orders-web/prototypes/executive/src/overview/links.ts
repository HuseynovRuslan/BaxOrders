import { kindOptions, readKind, type Kind } from '../data/analysis'
import { filterParams } from '../lib/year'
import { paths } from '../lib/links'
import { YEARS } from '../data/model'

/*
 * The ways from the overview and the map into the screens that already exist. Each address is one those screens already
 * read — the year (`/2026`), its waiting-approval card (`?panel=gozleyir`), a month, an object in a month, the year
 * narrowed to an object or a category (`?obyekt=`, `?ana=`), the analysis — so nothing on them changes. The order kind
 * travels as `nov`, as it does between the year screens; the monthly orders, their default, add nothing.
 */

export const kindParam = 'nov'

export { readKind }

function withKind(path: string, kind: Kind, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams()
  const value = kindOptions.find((option) => option.value === kind)?.param
  if (value) params.set(kindParam, value)
  for (const [key, item] of Object.entries(extra)) if (item) params.set(key, item)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export const hasYear = (year: number) => YEARS.includes(year)

export const overviewLinks = {
  year: (year: number, kind: Kind = 'monthly') => withKind(paths.year(year), kind),
  /** The year screen with its «Təsdiq gözləyir» card open: the waiting months and each object's order in them. */
  pending: (year: number) => withKind(paths.year(year), 'monthly', { panel: 'gozleyir' }),
  month: (year: number, month: number, kind: Kind = 'monthly') => withKind(paths.month(year, month), kind),
  analysis: (year: number, kind: Kind = 'monthly') => withKind(`/${year}/analiz`, kind),
  /** The year narrowed to one object («Obyekt» filter), its months and approvals as usual. */
  siteYear: (year: number, siteId: string, kind: Kind = 'monthly') => withKind(paths.year(year), kind, { [filterParams.site]: siteId }),
  siteMonth: (year: number, month: number, siteId: string, kind: Kind = 'monthly') => withKind(paths.site(year, month, siteId), kind),
  /** An object's order for a month: its monthly lines and its outside-monthly requests. */
  order: (year: number, month: number, siteId: string, kind: Kind = 'monthly') => withKind(paths.order(year, month, siteId), kind),
  /** A product at an object in a month: quantity, price and the comparison. */
  product: (year: number, month: number, productId: string, siteId: string, kind: Kind = 'monthly') => withKind(paths.product(year, month, productId, siteId), kind),
  /** The year narrowed to one root category. */
  rootYear: (year: number, rootId: string, kind: Kind = 'monthly') => withKind(paths.year(year), kind, { [filterParams.root]: rootId }),
  /** The year grouped by object or by root category, largest first. */
  grouped: (year: number, group: 'obyekt' | 'ana', kind: Kind = 'monthly') => withKind(paths.year(year), kind, { [filterParams.group]: group }),
  products: (year: number) => `/${year}/mallar`,
  map: (params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params ?? {})) if (value) search.set(key, value)
    const query = search.toString()
    return query ? `/xerite?${query}` : '/xerite'
  },
}
