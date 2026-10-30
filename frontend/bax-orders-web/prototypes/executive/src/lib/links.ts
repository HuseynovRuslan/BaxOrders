import { useSearchParams } from 'react-router'
import { basisOptions, kindOptions, readBasis, readKind, resolvePeriod, type Basis, type Kind, type Period } from '../data/analysis'

/**
 * Every level is an address, so Back goes up one level, a reload keeps the place, and a pasted link opens the same
 * screen. The comparison (`muq`) and the order kind (`nov`) travel with every link, so drilling down never resets
 * either of them.
 */
export const paths = {
  year: (year: number) => `/${year}`,
  month: (year: number, month: number) => `/${year}/${month}`,
  category: (year: number, month: number, categoryId: string, siteId?: string) =>
    siteId ? `/${year}/${month}/obyekt/${siteId}/kateqoriya/${categoryId}` : `/${year}/${month}/kateqoriya/${categoryId}`,
  product: (year: number, month: number, productId: string, siteId?: string) =>
    siteId ? `/${year}/${month}/obyekt/${siteId}/mehsul/${productId}` : `/${year}/${month}/mehsul/${productId}`,
  site: (year: number, month: number, siteId: string) => `/${year}/${month}/obyekt/${siteId}`,
  order: (year: number, month: number, siteId: string) => `/${year}/${month}/obyekt/${siteId}/sifaris`,
}

export const basisParam = 'muq'
export const kindParam = 'nov'

/** The comparison and the order kind in the address, and a way to write links that keep both. */
export function useComparison(month: number): {
  basis: Basis
  kind: Kind
  period: Period
  setBasis: (basis: Basis) => void
  setKind: (kind: Kind) => void
  /** A link that keeps the comparison and the kind; `overrides` can set either for this one link. */
  link: (path: string, extra?: Record<string, string>, overrides?: { kind?: Kind }) => string
} {
  const [params, setParams] = useSearchParams()
  const basis = readBasis(params.get(basisParam))
  const kind = readKind(params.get(kindParam))

  function link(path: string, extra: Record<string, string> = {}, overrides: { kind?: Kind } = {}) {
    const next = new URLSearchParams()
    const basisValue = basisOptions.find((option) => option.value === basis)!.param
    const kindValue = kindOptions.find((option) => option.value === (overrides.kind ?? kind))!.param
    if (basisValue) next.set(basisParam, basisValue)
    if (kindValue) next.set(kindParam, kindValue)
    for (const [key, item] of Object.entries(extra)) if (item) next.set(key, item)
    const query = next.toString()
    return query ? `${path}?${query}` : path
  }

  // A new comparison or kind is a new reading of the same place: it replaces the entry rather than adding a step to Back.
  function write(name: string, value: string) {
    const changed = new URLSearchParams(params)
    if (value) changed.set(name, value)
    else changed.delete(name)
    setParams(changed, { replace: true })
  }

  return {
    basis,
    kind,
    period: resolvePeriod(month, basis),
    setBasis: (next) => write(basisParam, basisOptions.find((option) => option.value === next)!.param),
    setKind: (next) => write(kindParam, kindOptions.find((option) => option.value === next)!.param),
    link,
  }
}
