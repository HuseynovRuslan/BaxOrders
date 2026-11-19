import { vi } from 'vitest'

/*
 * A small workbook, every figure countable by hand, loaded the way `main.tsx` loads the real one: on `globalThis` before
 * the model is imported. Two years; 2026 stops in November, with no figures at all in July (a missing month), «Beta» has
 * no order in March 2026 (a zero, not a missing month), a free line from the internal store, «Delta» orders for the
 * first time in 2026 (no comparison), «Gamma» never orders. Approval follows the model's rule for real figures: every
 * month to September 2026 approved, October and November waiting.
 *
 * Monthly orders: Alfa 100 ₼ a month in 2025, 120 in 2026 (200 in April 2026); Beta 50 a month in both years.
 * Outside-monthly: Alfa 30 ₼ in May 2025 and 40 in May 2026; Delta 20 in January 2026.
 */

interface FixtureLine {
  id: string
  type: 'monthly' | 'outside'
  orderId: string
  year: number
  month: number
  siteId: string
  productId: string
  qty: number
  unit: string
  price: number
  amount: number
  supplier: string
}

export function buildFixture() {
  const lines: FixtureLine[] = []
  const add = (year: number, month: number, siteId: string, productId: string, amount: number, type: 'monthly' | 'outside' = 'monthly') => {
    const unit = productId === 'p1' ? 'ədəd' : 'kq'
    const price = amount === 0 ? 0 : 10
    lines.push({
      id: `l${lines.length + 1}`, type, orderId: type === 'monthly' ? `${siteId}-${year}-${month}` : `kenar-${siteId}-${year}-${month}`,
      year, month, siteId, productId, qty: amount === 0 ? 3 : amount / 10, unit, price, amount, supplier: productId === 'p1' ? 'Cleanfix' : 'Progres',
    })
  }
  for (let month = 1; month <= 12; month++) {
    add(2025, month, 'alfa', 'p1', 100)
    add(2025, month, 'beta', 'p2', 50)
  }
  add(2025, 5, 'alfa', 'p1', 30, 'outside')
  for (let month = 1; month <= 11; month++) {
    if (month === 7) continue
    add(2026, month, 'alfa', 'p1', month === 4 ? 200 : 120)
    if (month !== 3) add(2026, month, 'beta', 'p2', 50)
  }
  add(2026, 2, 'alfa', 'p2', 0)
  add(2026, 5, 'alfa', 'p1', 40, 'outside')
  add(2026, 1, 'delta', 'p1', 20, 'outside')

  const orders = new Map<string, { id: string; number: string; siteId: string; year: number; month: number; submittedDay: number; lineIds: string[] }>()
  const outsideRequests = new Map<string, { id: string; number: string; siteId: string; year: number; month: number; day: number; reason: string; lineIds: string[] }>()
  for (const line of lines) {
    const target = line.type === 'monthly' ? orders : outsideRequests
    const existing = target.get(line.orderId)
    if (existing) existing.lineIds.push(line.id)
    else if (line.type === 'monthly') orders.set(line.orderId, { id: line.orderId, number: '', siteId: line.siteId, year: line.year, month: line.month, submittedDay: 0, lineIds: [line.id] })
    else outsideRequests.set(line.orderId, { id: line.orderId, number: '', siteId: line.siteId, year: line.year, month: line.month, day: 0, reason: '', lineIds: [line.id] })
  }

  return {
    meta: { source: 'fixture.xlsx', sha256: 'test', lines: lines.length, freeLines: 1, importedAt: '2026-11-11T14:43+04:00' },
    sites: [
      { id: 'alfa', name: 'Alfa', kind: '' },
      { id: 'beta', name: 'Beta', kind: '' },
      { id: 'delta', name: 'Delta', kind: '' },
      { id: 'gamma', name: 'Gamma', kind: '' },
    ],
    categories: [
      { id: 'r1', name: 'Təmizlik', level: 1, parentId: null, path: ['r1'] },
      { id: 'r1--m', name: 'Ləvazimat', level: 2, parentId: 'r1', path: ['r1', 'r1--m'] },
      { id: 'r1--m--l', name: 'Bez', level: 3, parentId: 'r1--m', path: ['r1', 'r1--m', 'r1--m--l'] },
      { id: 'r2', name: 'Yaşıllıq', level: 1, parentId: null, path: ['r2'] },
      { id: 'r2--m', name: 'Torpaq', level: 2, parentId: 'r2', path: ['r2', 'r2--m'] },
      { id: 'r2--m--l', name: 'Gübrə', level: 3, parentId: 'r2--m', path: ['r2', 'r2--m', 'r2--m--l'] },
    ],
    products: [
      { id: 'p1', name: 'Bez', unit: 'ədəd', leafId: 'r1--m--l', midId: 'r1--m', rootId: 'r1' },
      { id: 'p2', name: 'Gübrə', unit: 'kq', leafId: 'r2--m--l', midId: 'r2--m', rootId: 'r2' },
    ],
    lines,
    orders: [...orders.values()],
    outsideRequests: [...outsideRequests.values()],
  }
}

/** Today in the fixture's world: 11 November 2026, so November 2026 is the running month. */
export const FIXTURE_TODAY = new Date(2026, 10, 11, 12, 0, 0)

/** The figures on `globalThis`, the clock on the fixture's today, and the model loaded afresh. */
export function useFixture() {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXTURE_TODAY)
  ;(globalThis as { __BAX_DATA__?: unknown }).__BAX_DATA__ = buildFixture()
  vi.resetModules()
}
