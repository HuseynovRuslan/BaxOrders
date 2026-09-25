import { describe, expect, it } from 'vitest'
import type { DriverFilter } from '../components/decisions/labels'
import {
  causeParamToFilter,
  filterToCauseParam,
  parseCause,
  productParam,
  withCause,
  withProduct,
  type CauseParam,
} from './decisionParams'

/**
 * Task 18: which products "Əsas dəyişikliklər" shows travels in the URL, beside the basis. The short names are the
 * contract a pasted link relies on, so they are pinned here one by one.
 */
const spelled: Record<CauseParam, Exclude<DriverFilter, 'All'>> = {
  new: 'New',
  qty: 'QuantityChange',
  price: 'PriceChange',
  dropped: 'NoLongerOrdered',
  noprice: 'MissingPrice',
  steady: 'Steady',
}

describe('the spelling', () => {
  it('reads every short name as its chip, and writes every chip back as the same short name', () => {
    for (const [param, filter] of Object.entries(spelled) as [CauseParam, DriverFilter][]) {
      expect(causeParamToFilter(param), param).toBe(filter)
      expect(filterToCauseParam(filter), filter).toBe(param)
    }
  })

  it('writes no parameter for "Hamısı"', () => {
    expect(filterToCauseParam('All')).toBeNull()
  })

  it('reads an absent or an unknown value as "Hamısı", and never throws', () => {
    expect(causeParamToFilter(null)).toBe('All')
    for (const value of ['', 'New', 'NEW', 'yeni', 'toString', '__proto__', 'new ', 'price,qty']) {
      expect(() => causeParamToFilter(value), value).not.toThrow()
      expect(causeParamToFilter(value), value).toBe('All')
    }

    expect(parseCause(new URLSearchParams(''))).toBe('All')
    expect(parseCause(new URLSearchParams('basis=avg3&cause=bogus'))).toBe('All')
  })

  it('reads the chip out of a query string that carries the basis too', () => {
    expect(parseCause(new URLSearchParams('basis=avg3&cause=new'))).toBe('New')
    expect(parseCause(new URLSearchParams('cause=price&basis=custom&from=2026-05&to=2026-08'))).toBe('PriceChange')
  })
})

describe('writing it into a query string', () => {
  const basis = 'basis=custom&from=2026-05&to=2026-08&period=2026-09'

  it('sets the chip and keeps every other parameter as it was', () => {
    const current = new URLSearchParams(basis)
    const next = withCause(current, 'New')!

    expect(next.toString()).toBe(`${basis}&cause=new`)
    for (const name of ['basis', 'from', 'to', 'period']) {
      expect(next.get(name), name).toBe(current.get(name))
    }
    // The original is left alone: the page still holds it.
    expect(current.toString()).toBe(basis)
  })

  it('replaces a chip in place, where it stood', () => {
    const next = withCause(new URLSearchParams('basis=avg3&cause=new&period=2026-09'), 'PriceChange')!

    expect(next.toString()).toBe('basis=avg3&cause=price&period=2026-09')
  })

  it('removes the parameter for "Hamısı", and nothing else', () => {
    const next = withCause(new URLSearchParams(`${basis}&cause=qty`), 'All')!

    expect(next.toString()).toBe(basis)
    expect(next.has('cause')).toBe(false)
  })

  it('replaces an unknown value with the chip the reader chose, or removes it for "Hamısı"', () => {
    expect(withCause(new URLSearchParams('basis=avg3&cause=bogus'), 'New')!.toString()).toBe('basis=avg3&cause=new')
    expect(withCause(new URLSearchParams('basis=avg3&cause=bogus'), 'All')!.toString()).toBe('basis=avg3')
  })

  it('returns null when nothing would change, so no entry is pushed that is the same as this one', () => {
    expect(withCause(new URLSearchParams('basis=avg3&cause=new'), 'New')).toBeNull()
    expect(withCause(new URLSearchParams('basis=avg3'), 'All')).toBeNull()
    expect(withCause(new URLSearchParams(''), 'All')).toBeNull()
  })

  it('never touches the basis, whatever it holds', () => {
    // An old link's spelling is the basis module's to rewrite, not this one's.
    const legacy = 'basis=Previous6MonthAverage&customStart=2026-03&customEnd=2026-08'
    expect(withCause(new URLSearchParams(legacy), 'Steady')!.toString()).toBe(`${legacy}&cause=steady`)
  })

  /** Task 19: an open product history is in the same address, and choosing a chip under it keeps it. */
  it('keeps the open product', () => {
    expect(withCause(new URLSearchParams('basis=avg3&product=812'), 'New')!.toString()).toBe('basis=avg3&product=812&cause=new')
    expect(withCause(new URLSearchParams('basis=avg3&cause=new&product=812'), 'All')!.toString()).toBe('basis=avg3&product=812')
  })
})

/**
 * Task 19: the product whose history is open travels in the URL too, so Back closes it and a pasted link opens it.
 * Its value is the product variant's ID, which a hand-edited or truncated address can spoil in many ways.
 */
describe('the open product', () => {
  it('reads a product variant ID', () => {
    expect(productParam(new URLSearchParams('product=812'))).toBe(812)
    expect(productParam(new URLSearchParams('basis=avg3&cause=new&product=21'))).toBe(21)
  })

  it('reads anything that is not a plain positive whole number as no product, and never throws', () => {
    expect(productParam(new URLSearchParams(''))).toBeNull()
    expect(productParam(new URLSearchParams('basis=avg3'))).toBeNull()

    const unsafe = String(Number.MAX_SAFE_INTEGER + 2)
    for (const value of ['', 'abc', '0', '-3', '1.5', '1e3', ' 12', '12 ', '+12', '0x1F', '١٢', unsafe]) {
      const params = new URLSearchParams()
      params.set('product', value)
      expect(() => productParam(params), value).not.toThrow()
      expect(productParam(params), value).toBeNull()
    }
  })

  const basis = 'basis=custom&from=2026-05&to=2026-08&period=2026-09&cause=new'

  it('sets the product and keeps every other parameter as it was', () => {
    const current = new URLSearchParams(basis)
    const next = withProduct(current, 812)!

    expect(next.toString()).toBe(`${basis}&product=812`)
    for (const name of ['basis', 'from', 'to', 'period', 'cause']) {
      expect(next.get(name), name).toBe(current.get(name))
    }
    // The original is left alone: the page still holds it.
    expect(current.toString()).toBe(basis)
  })

  it('replaces a product in place, where it stood — an unknown value too', () => {
    expect(withProduct(new URLSearchParams('basis=avg3&product=21&cause=new'), 812)!.toString())
      .toBe('basis=avg3&product=812&cause=new')
    expect(withProduct(new URLSearchParams('basis=avg3&product=abc'), 812)!.toString()).toBe('basis=avg3&product=812')
  })

  it('removes the product, and nothing else', () => {
    const next = withProduct(new URLSearchParams(`${basis}&product=812`), null)!

    expect(next.toString()).toBe(basis)
    expect(next.has('product')).toBe(false)
    for (const name of ['basis', 'from', 'to', 'period', 'cause']) {
      expect(next.get(name), name).toBe(new URLSearchParams(basis).get(name))
    }
  })

  it('returns null when nothing would change, so no entry is pushed that is the same as this one', () => {
    expect(withProduct(new URLSearchParams('basis=avg3&product=812'), 812)).toBeNull()
    expect(withProduct(new URLSearchParams('basis=avg3'), null)).toBeNull()
    expect(withProduct(new URLSearchParams(''), null)).toBeNull()
  })
})
