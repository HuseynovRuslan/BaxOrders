import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { DashboardAttention, LocationDashboardRow, ManagementDashboardSummary } from '../../api/dashboard'
import { WhatChangedList } from './WhatChangedList'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 1,
    locationCode: 'LOC-000001',
    locationName: 'Obyekt',
    hasCurrentRequest: true,
    currentRequestId: 105,
    current: { ...none, knownAmount: 1000, itemCount: 10, knownPriceItemCount: 10 },
    baseline: { ...none, knownAmount: 800, itemCount: 10, knownPriceItemCount: 10 },
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    explanationIsComplete: true,
    ...overrides,
  } as LocationDashboardRow
}

function item(overrides: Partial<LocationDashboardRow> = {}): DashboardAttention {
  return { reason: 'LargestIncrease', location: row(overrides), rank: 1, alsoFirstIn: [] }
}

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 27,
    locationsWithComparison: 27,
    ...overrides,
  } as ManagementDashboardSummary
}

function show(attention: DashboardAttention[], over: Partial<ManagementDashboardSummary> = {}) {
  return render(
    <MemoryRouter>
      <WhatChangedList
        attention={attention}
        summary={summary(over)}
        selection={{ basis: 'PreviousMonth', from: null, to: null }}
      />
    </MemoryRouter>,
  )
}

function rows(): HTMLElement[] {
  return within(screen.getByRole('list')).getAllByRole('listitem')
}

/**
 * «Nə dəyişdi?» in one line per object. A manager said the cards were tiring to read; nothing they carried is
 * gone, but what is here first has to be the three facts that decide where to look.
 */
describe('what changed, in three lines', () => {
  it('ranks by the money moved, whichever way it moved', () => {
    show([
      item({ locationId: 1, locationName: 'Kiçik', knownAmountDelta: 200 }),
      item({ locationId: 2, locationName: 'Ən böyük azalma', knownAmountDelta: -9_000 }),
      item({ locationId: 3, locationName: 'Böyük artım', knownAmountDelta: 4_000 }),
    ])

    expect(rows().map((line) => line.textContent)).toEqual([
      expect.stringContaining('Ən böyük azalma'),
      expect.stringContaining('Böyük artım'),
      expect.stringContaining('Kiçik'),
    ])
  })

  it('stops at three, however many objects were put in front of it', () => {
    show(Array.from({ length: 8 }, (_, index) =>
      item({ locationId: index + 1, locationName: `Obyekt ${index + 1}`, knownAmountDelta: (index + 1) * 100 })))

    expect(rows()).toHaveLength(3)
  })

  it('says which way the money went in words as well as in colour', () => {
    show([item({ knownAmountDelta: 4_000 }), item({ locationId: 2, knownAmountDelta: -2_000 })])

    expect(rows()[0]).toHaveTextContent('xərc artıb')
    expect(rows()[1]).toHaveTextContent('xərc azalıb')
  })

  it('draws each difference against the largest of the three', () => {
    show([
      item({ locationId: 1, knownAmountDelta: 10_000 }),
      item({ locationId: 2, knownAmountDelta: -5_000 }),
    ])

    const shares = Array.from(document.querySelectorAll('[data-share]')).map((bar) => bar.getAttribute('data-share'))
    expect(shares).toEqual(['100', '50'])
  })

  it('names the reason the object\'s own row already gives', () => {
    show([item({ primaryCause: 'PriceChange', primaryCauseAmount: 200 })])

    expect(rows()[0]).toHaveTextContent('Qiymət artımı')
  })

  it('says so plainly when an object has nothing to compare against', () => {
    show([item({ primaryCause: null, primaryCauseAmount: null })])

    expect(rows()[0]).toHaveTextContent('Müqayisə üçün əvvəlki ay yoxdur')
  })

  it('leaves out an object whose difference does not exist', () => {
    // No baseline, no difference: it belongs among the exceptions, not in a ranking of movement.
    show([
      item({ locationId: 1, locationName: 'Müqayisə olunan', knownAmountDelta: 500 }),
      item({ locationId: 2, locationName: 'Bazası yox', knownAmountDelta: null }),
    ])

    expect(rows()).toHaveLength(1)
    expect(rows()[0]).toHaveTextContent('Müqayisə olunan')
  })

  it('opens the object on its name, carrying the basis that was read', () => {
    show([item({ locationId: 43, locationName: 'Nərimanov heykəli', currentRequestId: 907 })])

    // The month's own order, not the object's history: it is the screen that answers the next question.
    expect(screen.getByRole('link', { name: /Nərimanov heykəli/ }))
      .toHaveAttribute('href', '/orders/907?basis=last')
  })

  it('never lets three lines read as the whole company', () => {
    show([item()], { locationCount: 27, locationsWithComparison: 24 })

    const section = screen.getByRole('region', { name: 'Nə dəyişdi?' })
    expect(section).toHaveTextContent('Bütün obyektlər aşağıdakı cədvəldədir.')
    expect(section).toHaveTextContent('3 obyekt müqayisəyə daxil deyil.')
  })

  it('says nothing about exclusions on a month that has none', () => {
    show([item()], { locationCount: 27, locationsWithComparison: 27 })

    expect(screen.queryByText(/müqayisəyə daxil deyil/)).toBeNull()
  })

  it('draws nothing at all on a month where nothing can be compared', () => {
    const { container } = show([item({ knownAmountDelta: null })])

    expect(container).toBeEmptyDOMElement()
  })
})
