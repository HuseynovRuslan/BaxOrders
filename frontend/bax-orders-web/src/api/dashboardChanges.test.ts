import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocationDashboardRow, ManagementDashboard } from './dashboard'

const client = vi.hoisted(() => ({ getJson: vi.fn() }))
vi.mock('./client', async () => ({ ...(await vi.importActual<typeof import('./client')>('./client')), ...client }))

const { fetchDashboardChanges } = await import('./dashboard')

function page(ids: number[], totalCount: number): ManagementDashboard {
  return {
    rows: { items: ids.map((id) => ({ locationId: id }) as LocationDashboardRow), page: 1, pageSize: 100, totalCount },
  } as ManagementDashboard
}

function askedFor(call: number): URLSearchParams {
  const url = client.getJson.mock.calls[call][0] as string
  return new URL(url, 'http://localhost').searchParams
}

beforeEach(() => client.getJson.mockReset())

/**
 * The list «Fərq» opens and «Məbləğ dəyişiklikləri» takes its five from (AC-06, AC-07): every compared object,
 * largest change first, and never narrowed by the table's own search or filters.
 */
describe('every compared object, largest change first', () => {
  it('asks for the compared group ordered by the size of the change, on the month’s own comparison', async () => {
    client.getJson.mockResolvedValueOnce(page([3, 1, 2], 3))

    const rows = await fetchDashboardChanges('2026-09', { basis: 'CustomRange', customStart: '2026-05', customEnd: '2026-07', scope: 'All' })

    expect(rows.map((row) => row.locationId)).toEqual([3, 1, 2])
    const params = askedFor(0)
    expect(params.get('period')).toBe('2026-09')
    expect(params.get('basis')).toBe('CustomRange')
    expect(params.get('customStart')).toBe('2026-05')
    expect(params.get('customEnd')).toBe('2026-07')
    expect(params.get('scope')).toBe('All')
    expect(params.get('group')).toBe('Compared')
    expect(params.get('sort')).toBe('AbsoluteKnownAmountDelta')
    expect(params.get('descending')).toBe('true')
    expect(params.get('pageSize')).toBe('100')
  })

  it('carries none of the table’s search or filters', async () => {
    client.getJson.mockResolvedValueOnce(page([1], 1))

    await fetchDashboardChanges('2026-09', { basis: 'PreviousMonth' })

    const params = askedFor(0)
    for (const name of ['search', 'historyCoverage', 'priceCoverage', 'hasCurrentRequest', 'missingPrice', 'scope', 'customStart']) {
      expect(params.has(name)).toBe(false)
    }
  })

  it('reads on page by page until every compared object is in', async () => {
    const first = Array.from({ length: 100 }, (_, index) => index + 1)
    client.getJson
      .mockResolvedValueOnce(page(first, 103))
      .mockResolvedValueOnce(page([101, 102, 103], 103))

    const rows = await fetchDashboardChanges('2026-09', { basis: 'PreviousMonth' })

    expect(rows).toHaveLength(103)
    expect(askedFor(0).get('page')).toBe('1')
    expect(askedFor(1).get('page')).toBe('2')
    expect(client.getJson).toHaveBeenCalledTimes(2)
  })

  it('stops at an empty page rather than asking forever', async () => {
    client.getJson.mockResolvedValueOnce(page([], 5))

    await expect(fetchDashboardChanges('2026-09', { basis: 'PreviousMonth' })).resolves.toEqual([])
    expect(client.getJson).toHaveBeenCalledTimes(1)
  })
})
