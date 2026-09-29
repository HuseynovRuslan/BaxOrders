import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardAttention, LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { ChangesTable } from './ChangesTable'

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

function item(overrides: Partial<LocationDashboardRow> = {}): DashboardAttention {
  return { reason: 'LargestIncrease', location: row(overrides), rank: 1, alsoFirstIn: [] }
}

const summary = { basis: 'PreviousMonth', baselinePeriods: ['2026-08-01'] } as ManagementDashboardSummary

function show(attention: DashboardAttention[], handlers: {
  onOpenDetail?: (item: DashboardAttention) => void
  onOpenAll?: () => void
} = {}) {
  return render(
    <ChangesTable
      attention={attention}
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
})

/** This product's rule: money going up is the bad direction, and the words say it beside the colour. */
describe('the direction of each change', () => {
  it('shows a rise in red and a fall in green, and says which in words', () => {
    show([
      item({ locationId: 1, locationName: 'Artan', knownAmountDelta: 8_340 }),
      item({ locationId: 2, locationName: 'Azalan', knownAmountDelta: -4_200 }),
    ])

    const [rising, falling] = bodyRows()
    expect(within(rising).getByText(/\+8\.340,00/)).toHaveClass('bg-red-50', 'text-red-500')
    expect(within(rising).getByText(', xərc artıb')).toBeInTheDocument()
    expect(within(falling).getByText(/−4\.200,00/)).toHaveClass('bg-green-50', 'text-green-500')
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
    expect(onOpenDetail.mock.calls[0][0].location.locationId).toBe(42)
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
