import { categories, products, sites, YEAR } from '../data/model'
import { monthName } from './format'
import { paths } from './links'
import type { Crumb } from '../ui/parts'

/**
 * The trail to any place in the drill-down: year › month › [object] › category levels › product › [order]. The month
 * links back to the view the reader came from: by object when an object is in the trail.
 */
export function trailFor({ month, siteId, categoryId, productId, order = false, link }: {
  month: number
  siteId?: string
  categoryId?: string
  productId?: string
  order?: boolean
  link: (path: string, extra?: Record<string, string>) => string
}): Crumb[] {
  const trail: Crumb[] = [
    { label: String(YEAR), to: link(paths.year(YEAR)) },
    { label: `${monthName(month)} ${YEAR}`, to: link(paths.month(YEAR, month), siteId ? { bax: 'obyektler' } : {}) },
  ]

  if (siteId) trail.push({ label: sites.get(siteId)?.name ?? siteId, to: link(paths.site(YEAR, month, siteId)) })

  const product = productId ? products.get(productId) : undefined
  const category = categoryId ? categories.get(categoryId) : product ? categories.get(product.leafId) : undefined
  for (const id of category?.path ?? []) {
    trail.push({ label: categories.get(id)!.name, to: link(paths.category(YEAR, month, id, siteId)) })
  }

  if (product) trail.push({ label: product.name, to: link(paths.product(YEAR, month, product.id, siteId)) })
  if (order) trail.push({ label: 'Sifariş' })

  // The last step is where the reader is: not a link.
  trail[trail.length - 1] = { label: trail[trail.length - 1].label }
  return trail
}

export const levelNames = { 1: 'Ana kateqoriya', 2: 'Orta kateqoriya', 3: 'Alt kateqoriya' } as const
