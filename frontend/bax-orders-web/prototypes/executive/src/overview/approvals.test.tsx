import { afterAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useFixture } from '../test/fixture'

// The Rəhbər's approvals file, as the site writes it: October under its number alone (a file from before years came in:
// 2026's), November approved for 120 ₼ though the month now holds 170 ₼, September's approval taken back.
useFixture()
;(globalThis as { __BAX_APPROVALS__?: unknown }).__BAX_APPROVALS__ = {
  months: {
    10: { state: 'approved', at: '2026-11-02T11:27+04:00', by: 'Rəhbər', amount: 170, lines: 2 },
    '2026-11': { state: 'approved', at: '2026-11-12T11:25+04:00', by: 'Rəhbər', amount: 120, lines: 1 },
    '2026-09': { state: 'pending', at: '2026-11-12T10:00+04:00', by: 'Rəhbər' },
  },
}
const model = await import('../data/model')
const metrics = await import('./metrics')
const { appRoutes } = await import('../routes')

afterAll(() => {
  delete (globalThis as { __BAX_APPROVALS__?: unknown }).__BAX_APPROVALS__
  vi.useRealTimers()
})

const yearSoFar = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

describe('the Rəhbər’s approvals on the overview', () => {
  it('reads the site’s record before the program’s rule, in every year, as the year screens do', () => {
    expect(metrics.statusOf(2026, 10)).toBe('approved')
    expect(metrics.statusOf(2026, 11)).toBe('approved')
    expect(metrics.statusOf(2026, 9)).toBe('pending')
    expect(metrics.statusOf(2025, 10)).toBe('approved')
    for (const year of model.YEARS) {
      model.selectYear(year)
      for (const approval of model.approvals) expect(model.approvalFor(year, approval.month)).toEqual(approval)
    }
    model.selectYear(2026)
  })

  it('splits the period by those approvals', () => {
    expect(metrics.approvalSplit(2026, yearSoFar)).toEqual({
      approved: 1560, pending: 170, total: 1730, approvedMonths: [1, 2, 3, 4, 5, 6, 8, 10, 11], pendingMonths: [9],
    })
  })

  it('names a month whose figures moved after its approval, and only that one', () => {
    expect(metrics.approvalDrifts(2026, yearSoFar)).toEqual([{ month: 11, approved: 120, now: 170 }])
    expect(metrics.approvalDrifts(2025, yearSoFar)).toEqual([])
  })

  it('says so under «Təsdiq vəziyyəti», with the way to the month', async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: ['/'] })} />)
    const moved = await screen.findByRole('list', { name: 'Təsdiqdən sonra dəyişən aylar' })
    const items = within(moved).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Noyabr 2026: təsdiqdən sonra dəyişib — 120 ₼ → 170 ₼.')
    expect(within(items[0]).getByRole('link', { name: 'Noyabr 2026' })).toHaveAttribute('href', '/2026/11')
  })
})
