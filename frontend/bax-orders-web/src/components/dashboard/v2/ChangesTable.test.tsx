import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { costDirectionTintClass, costDirectionToneClass } from '../../analytics/format'
import { ChangesTable } from './ChangesTable'
import type { ChangesState } from './DifferenceDetail'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 1,
    locationCode: 'LOC-000001',
    locationName: 'Obyekt',
    hasCurrentRequest: true,
    currentRequestId: 105,
    current: { ...none, knownAmount: 1_000, itemCount: 10, knownPriceItemCount: 10 },
    baseline: { ...none, knownAmount: 800, itemCount: 10, knownPriceItemCount: 10 },
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    availableBaselinePeriodCount: 1,
    expectedBaselinePeriodCount: 1,
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    primaryCauseProduct: null,
    explanationIsComplete: true,
    responsibility: { kind: 'AgreedOnLines', personId: 7, personName: 'Elçin Məmmədov', distinctPersonCount: 1, namedLineCount: 10 },
    ...overrides,
  } as LocationDashboardRow
}

/** The compared list as the server orders it: by the size of the change, either way, largest first. */
function item(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return row(overrides)
}

const summary = { basis: 'PreviousMonth', baselinePeriods: ['2026-08-01'] } as ManagementDashboardSummary

/** An array is the list as read; null is the list still being read; a ChangesState is passed as it is. */
function show(changes: LocationDashboardRow[] | null | ChangesState, handlers: {
  onOpenDetail?: (row: LocationDashboardRow) => void
  onOpenAll?: () => void
  onRetry?: () => void
} = {}) {
  const state: ChangesState = changes === null
    ? { status: 'loading', rows: null }
    : Array.isArray(changes) ? { status: 'success', rows: changes } : changes
  return render(
    <ChangesTable
      changes={state}
      onRetry={handlers.onRetry}
      summary={summary}
      onOpenDetail={handlers.onOpenDetail ?? (() => {})}
      onOpenAll={handlers.onOpenAll}
    />,
  )
}

function bodyRows(): HTMLElement[] {
  const table = within(screen.getByRole('region', { name: 'Məbləğ dəyişiklikləri' })).getByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

/**
 * The shortlist the design tables: where the money moved, by how much, because of what, and a way in. Five
 * rows, ranked by the money moved — whichever way it moved, because a fall of nine thousand is as worth
 * reading as a rise of nine thousand.
 */
describe('the objects whose money moved most', () => {
  it('ranks by the size of the change, in either direction', () => {
    show([
      item({ locationId: 1, locationName: 'Kiçik', knownAmountDelta: 200 }),
      item({ locationId: 2, locationName: 'Ən böyük', knownAmountDelta: -9_000 }),
      item({ locationId: 3, locationName: 'Orta', knownAmountDelta: 4_000 }),
    ])

    expect(bodyRows().map((line) => within(line).getByRole('rowheader').textContent))
      .toEqual(['Ən böyük', 'Orta', 'Kiçik'])
  })

  it('shows five at most', () => {
    show(Array.from({ length: 8 }, (_, index) => item({
      locationId: index + 1,
      locationName: `Obyekt ${index + 1}`,
      knownAmountDelta: (index + 1) * 100,
    })))

    expect(bodyRows()).toHaveLength(5)
  })

  /** An object the comparison cannot speak about has no change to table. */
  it('leaves out an object with no comparison', () => {
    show([
      item({ locationId: 1, locationName: 'Müqayisə var', knownAmountDelta: 200 }),
      item({ locationId: 2, locationName: 'Müqayisə yoxdur', knownAmountDelta: null }),
    ])

    expect(bodyRows()).toHaveLength(1)
    expect(screen.queryByText('Müqayisə yoxdur')).toBeNull()
  })

  it('draws nothing when nothing moved', () => {
    const { container } = show([item({ knownAmountDelta: null })])

    expect(container).toBeEmptyDOMElement()
  })

  it('keeps its place with placeholder rows while the list is being read', () => {
    show(null)

    const section = screen.getByRole('region', { name: 'Məbləğ dəyişiklikləri' })
    expect(within(section).getByText('Məbləğ dəyişiklikləri yüklənir')).toBeInTheDocument()
    expect(within(section).queryByRole('table')).toBeNull()
  })
})

/**
 * Q-1: the list is a request of its own, and it can fail while the rest of the page has its figures. The section
 * stays and says so, with a way to ask again — never an empty list, never a zero.
 */
describe('when the list cannot be read', () => {
  const failed: ChangesState = { status: 'error', message: 'Şəbəkə xətası', rows: null }

  it('stays, with the server’s words, instead of disappearing', () => {
    show(failed)

    const section = screen.getByRole('region', { name: 'Məbləğ dəyişiklikləri' })
    expect(within(section).getByRole('heading', { name: 'Məbləğ dəyişiklikləri' })).toBeInTheDocument()
    expect(within(section).getByRole('alert')).toHaveTextContent('Şəbəkə xətası')
  })

  it('does not pass a failure off as an empty list or a zero', () => {
    show(failed)

    const section = screen.getByRole('region', { name: 'Məbləğ dəyişiklikləri' })
    expect(within(section).queryByRole('table')).toBeNull()
    expect(section).not.toHaveTextContent('0,00')
    expect(section).not.toHaveTextContent('yoxdur')
  })

  it('asks for the list again on request', async () => {
    const onRetry = vi.fn()
    show(failed, { onRetry })

    await userEvent.click(screen.getByRole('button', { name: 'Yenidən cəhd et' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

/**
 * S-6 (AC-07): the five are the largest of every compared object, not of a shortlist. The old source was the
 * attention list, which holds at most two objects of each direction — so three large rises lost their third.
 */
describe('the true largest five', () => {
  it('keeps three large changes of one direction, all of them', () => {
    show([
      item({ locationId: 1, locationName: 'Artım A', knownAmountDelta: 9_000 }),
      item({ locationId: 2, locationName: 'Artım B', knownAmountDelta: 8_000 }),
      item({ locationId: 3, locationName: 'Artım C', knownAmountDelta: 7_000 }),
      item({ locationId: 4, locationName: 'Azalma', knownAmountDelta: -500 }),
      item({ locationId: 5, locationName: 'Kiçik faiz', knownAmountDelta: 40 }),
      item({ locationId: 6, locationName: 'Ən kiçik', knownAmountDelta: 10 }),
    ])

    expect(bodyRows().map((line) => within(line).getByRole('rowheader').textContent))
      .toEqual(['Artım A', 'Artım B', 'Artım C', 'Azalma', 'Kiçik faiz'])
  })

  it('keeps the server’s order where two changes are the same size', () => {
    show([
      item({ locationId: 1, locationName: 'Ağdam', knownAmountDelta: 500 }),
      item({ locationId: 2, locationName: 'Bakı', knownAmountDelta: -500 }),
    ])

    expect(bodyRows().map((line) => within(line).getByRole('rowheader').textContent)).toEqual(['Ağdam', 'Bakı'])
  })

  it('shows only as many as there are where fewer than five were compared', () => {
    show([item({ locationId: 1, knownAmountDelta: 300 }), item({ locationId: 2, knownAmountDelta: -100 })])

    expect(bodyRows()).toHaveLength(2)
  })
})

/** This product's rule: money going up is the bad direction, and the words say it beside the colour. */
describe('the direction of each change', () => {
  it('shows a rise in red and a fall in green, and says which in words', () => {
    show([
      item({ locationId: 1, locationName: 'Artan', knownAmountDelta: 8_340 }),
      item({ locationId: 2, locationName: 'Azalan', knownAmountDelta: -4_200 }),
    ])

    const [rising, falling] = bodyRows()
    expect(within(rising).getByText(/\+8\.340,00/)).toHaveClass(...costDirectionTintClass(8_340).split(' '), costDirectionToneClass(8_340))
    expect(within(rising).getByText(', xərc artıb')).toBeInTheDocument()
    expect(within(falling).getByText(/−4\.200,00/)).toHaveClass(...costDirectionTintClass(-4_200).split(' '), costDirectionToneClass(-4_200))
    expect(within(falling).getByText(', xərc azalıb')).toBeInTheDocument()
  })
})

/** The reason is the object's own decomposition — never a budget status, a plan limit or a score. */
describe('why it moved', () => {
  it('names the largest cause of the change', () => {
    show([item({ primaryCause: 'NewOrders', primaryCauseAmount: 3_000 })])

    expect(bodyRows()[0]).toHaveTextContent('Yeni məhsullar')
  })

  it('says so plainly where there is no previous month to decompose against', () => {
    show([item({ primaryCause: null, primaryCauseAmount: null })])

    expect(bodyRows()[0]).toHaveTextContent('Müqayisə üçün əvvəlki ay yoxdur')
  })
})

describe('the way in', () => {
  it('opens the object the row is about', async () => {
    const onOpenDetail = vi.fn()
    show([item({ locationId: 42, locationName: 'Fəvvarələr meydanı' })], { onOpenDetail })

    await userEvent.click(screen.getByRole('button', { name: 'Fəvvarələr meydanı — ətraflı' }))

    expect(onOpenDetail).toHaveBeenCalledTimes(1)
    expect(onOpenDetail.mock.calls[0][0].locationId).toBe(42)
  })

  it('offers the full table to a reader who wants every object', async () => {
    const onOpenAll = vi.fn()
    show([item()], { onOpenAll })

    await userEvent.click(screen.getByRole('button', { name: 'Hamısına bax' }))

    expect(onOpenAll).toHaveBeenCalledTimes(1)
  })

  it('offers nothing to scroll to where there is nowhere to go', () => {
    show([item()])

    expect(screen.queryByRole('button', { name: 'Hamısına bax' })).toBeNull()
  })
})
