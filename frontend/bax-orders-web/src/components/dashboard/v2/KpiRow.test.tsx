import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ManagementDashboardSummary } from '../../../api/dashboard'
import { costDirectionToneClass } from '../../analytics/format'
import { KpiRow } from './KpiRow'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 27,
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 3,
    current: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 300 },
    comparedCurrent: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 300 },
    baseline: { ...none, knownAmount: 63_340, itemCount: 290, knownPriceItemCount: 290 },
    knownAmountDelta: 7_870,
    knownAmountPercentChange: 12.4,
    locationsWithComparison: 24,
    ...overrides,
  } as ManagementDashboardSummary
}

function card(name: string | RegExp) {
  return screen.getByRole('heading', { name }).closest('section')!
}

/**
 * The month in four figures. Every one of them is the answer the API gave; the row's whole job is to say which
 * is which, and to say the direction of the third one in a way that does not depend on seeing colour.
 */
describe('the four figures', () => {
  it('names the selected amount by the scope it is of', () => {
    render(<KpiRow summary={summary()} scope="All" />)

    expect(card('Ümumi faktiki xərc')).toHaveTextContent('71.210,00')
  })

  it('says which months the comparison is of', () => {
    render(<KpiRow summary={summary({ basis: 'Previous3MonthAverage', baselinePeriods: ['2026-06-01', '2026-07-01', '2026-08-01'] })} scope="Monthly" />)

    const baseline = card('Müqayisə dövrü · Son 3 ayın ortalaması')
    expect(baseline).toHaveTextContent('63.340,00')
    expect(baseline).toHaveTextContent('İyun–Avqust 2026')
  })

  it('counts the objects of the month against the company', () => {
    render(<KpiRow summary={summary()} scope="Monthly" />)

    expect(card('Aktiv obyektlər')).toHaveTextContent('24 / 27 obyekt')
    expect(card('Aktiv obyektlər')).toHaveTextContent('3 obyektdə bu ay sifariş yoxdur')
  })

  /** What the selected figure leaves out, said where the figure is rather than in a footnote. */
  it('says when lines are left out of the amount for want of a price', () => {
    render(<KpiRow summary={summary({ current: { ...none, knownAmount: 71_210, itemCount: 300, knownPriceItemCount: 288, missingPriceItemCount: 12 } })} scope="Monthly" />)

    expect(card('Aylıq sifarişlərin məbləği')).toHaveTextContent('Qiyməti olmayan sətirlər bu məbləğə daxil deyil.')
  })
})

/**
 * This product's rule, which the mock designs have inverted more than once: money going up is the bad
 * direction. Colour says it, and the words beside it say it too.
 */
describe('the direction of the difference', () => {
  it('shows a rise in red, and says so in words', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: 7_870, knownAmountPercentChange: 12.4 })} scope="Monthly" />)

    const difference = within(card('Fərq'))
    expect(difference.getByText(/\+7\.870,00/)).toHaveClass(costDirectionToneClass(7_870))
    expect(difference.getByText('+12,4%')).toHaveClass(costDirectionToneClass(7_870))
    expect(difference.getByText('xərc artıb')).toBeInTheDocument()
  })

  it('shows a fall in green, and says so in words', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: -4_200, knownAmountPercentChange: -6.2 })} scope="Monthly" />)

    const difference = within(card('Fərq'))
    expect(difference.getByText(/−4\.200,00/)).toHaveClass(costDirectionToneClass(-4_200))
    expect(difference.getByText('xərc azalıb')).toBeInTheDocument()
  })

  it('says nothing about a direction there is no comparison for', () => {
    render(<KpiRow summary={summary({ knownAmountDelta: null, knownAmountPercentChange: null })} scope="Monthly" />)

    expect(card('Fərq')).toHaveTextContent('—')
    expect(screen.queryByText('xərc artıb')).toBeNull()
  })
})

/**
 * The difference is a cohort figure, so subtracting the two cards beside it does not always give it. Where it
 * does not, the card says how many objects it is actually over — without that the reader finds a number that
 * does not add up and has no way to learn why.
 */
describe('what the difference is over', () => {
  it('names the objects the comparison could not reach', () => {
    render(<KpiRow summary={summary({ locationsWithCurrentRequest: 24, locationsWithComparison: 21 })} scope="Monthly" />)

    expect(card('Fərq')).toHaveTextContent('21 obyekt üzrə — 3 obyekt müqayisəyə daxil deyil')
  })

  it('says nothing where every object of the month is in the comparison', () => {
    render(<KpiRow summary={summary()} scope="Monthly" />)

    expect(card('Fərq')).not.toHaveTextContent('müqayisəyə daxil deyil')
  })
})

/**
 * Each card opens its own detail under the row (AC-01): a disclosure button, so «all closed» is ordinary and a second
 * click closes. The button is named by the card's label and points at the one region the cards open.
 */
describe('opening a card', () => {
  it('makes every card a button that says whether its detail is open', () => {
    render(<KpiRow summary={summary()} scope="Monthly" open="Difference" onToggle={() => {}} />)

    const difference = within(card('Fərq')).getByRole('button', { name: 'Fərq' })
    expect(difference).toHaveAttribute('aria-expanded', 'true')
    expect(difference).toHaveAttribute('aria-controls', 'kpi-detail')
    for (const name of ['Aylıq sifarişlərin məbləği', 'Müqayisə dövrü · Keçən ay', 'Aktiv obyektlər']) {
      expect(within(card(name)).getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false')
    }
  })

  it('hands the card it was clicked on to the page', async () => {
    const onToggle = vi.fn()
    render(<KpiRow summary={summary()} scope="Monthly" onToggle={onToggle} />)

    await userEvent.click(screen.getByRole('button', { name: 'Aktiv obyektlər' }))
    await userEvent.click(screen.getByRole('button', { name: 'Fərq' }))

    expect(onToggle.mock.calls).toEqual([['Locations'], ['Difference']])
  })

  it('reads the figure and what qualifies it to a screen reader as the button’s description', () => {
    render(<KpiRow summary={summary()} scope="Monthly" onToggle={() => {}} />)

    expect(screen.getByRole('button', { name: 'Fərq' })).toHaveAccessibleDescription(/\+7\.870,00.*xərc artıb/)
  })

  /** AC-02: the open card is marked by a ring, which takes no room, and the open/closed line is always there. */
  it('marks the open card without changing what is in any card', () => {
    const { rerender } = render(<KpiRow summary={summary()} scope="Monthly" open={null} onToggle={() => {}} />)
    const closedText = card('Fərq').textContent

    rerender(<KpiRow summary={summary()} scope="Monthly" open="Difference" onToggle={() => {}} />)

    expect(card('Fərq')).toHaveClass('ring-2', 'ring-primary')
    expect(card('Fərq')).not.toHaveClass('border-2')
    expect(card('Fərq').textContent).toBe(closedText!.replace('Detallara bax', 'Bağla'))
    expect(card('Aktiv obyektlər')).not.toHaveClass('ring-2')
  })

  it('stays four figures, with nothing to press, where nothing is offered to open', () => {
    render(<KpiRow summary={summary()} scope="Monthly" />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getAllByRole('heading')).toHaveLength(4)
  })
})
