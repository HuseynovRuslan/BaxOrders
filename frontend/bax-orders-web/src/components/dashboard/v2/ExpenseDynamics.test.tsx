import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { DashboardTrendPoint } from '../../../api/dashboard'
import { ExpenseDynamics } from './ExpenseDynamics'

function point(period: string, knownAmount: number | null): DashboardTrendPoint {
  return { period, knownAmount, locationCount: 24, missingPriceItemCount: 0 }
}

const sixMonths = [
  point('2026-04-01', 52_000),
  point('2026-05-01', 58_000),
  point('2026-06-01', 61_000),
  point('2026-07-01', 55_000),
  point('2026-08-01', 63_340),
  point('2026-09-01', 71_210),
]

function show(trend: DashboardTrendPoint[], selectedPeriod = '2026-09-01') {
  return render(<ExpenseDynamics trend={trend} scope="Monthly" selectedPeriod={selectedPeriod} />)
}

function bars(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-height]'))
}

/** The whole column answers the pointer, not the bar inside it. */
function columns(container: HTMLElement): HTMLElement[] {
  return bars(container).map((bar) => bar.closest('.flex-1') as HTMLElement)
}

/**
 * One question — is this month ordinary for us — answered in one picture. The heights have to be the money, or
 * the picture is decoration; the figures behind them have to be readable without the picture at all.
 */
describe('the run of months', () => {
  it('draws one bar a month, tallest for the largest', () => {
    const { container } = show(sixMonths)

    const heights = bars(container).map((bar) => Number(bar.dataset.height))
    expect(heights).toHaveLength(6)
    expect(Math.max(...heights)).toBe(160)
    expect(heights.indexOf(Math.max(...heights))).toBe(5)
    // Each height is its month against the tallest, to the pixel.
    expect(heights[0]).toBe(Math.round((52_000 / 71_210) * 160))
  })

  it('colours the selected month and leaves the rest quiet', () => {
    const { container } = show(sixMonths, '2026-07-01')

    const drawn = bars(container)
    expect(drawn[3].className).toContain('bg-blue-600')
    expect(drawn[5].className).toContain('bg-slate-400/40')
  })

  /** A month with money in it keeps a visible bar: a bar of no height reads as a month with nothing in it. */
  it('keeps a small month visible, and draws nothing for a month with no priced line', () => {
    const { container } = show([
      point('2026-08-01', 100_000),
      point('2026-09-01', 5),
      point('2026-10-01', null),
    ], '2026-09-01')

    const heights = bars(container).map((bar) => Number(bar.dataset.height))
    expect(heights[1]).toBe(4)
    expect(heights[2]).toBe(0)
  })
})


/**
 * Any month answers, not just the selected one. Pinning the figure to the current month left the other five
 * heights a picture nobody could put a number to.
 */
describe('pointing at a month', () => {
  it('lights the month under the pointer and writes its amount', async () => {
    const { container } = show(sixMonths, '2026-09-01')

    await userEvent.hover(columns(container)[1])

    expect(bars(container)[1]).toHaveAttribute('data-lit', 'true')
    expect(screen.getByText(/58\.000,00/, { ignore: 'table, table *' })).toBeInTheDocument()
  })

  it('writes the exact amount, not a rounded one', async () => {
    const { container } = show([point('2026-08-01', 63_340), point('2026-09-01', 71_210.29)], '2026-09-01')

    await userEvent.hover(columns(container)[1])

    expect(screen.getByText(/71\.210,29/, { ignore: 'table, table *' })).toBeInTheDocument()
    expect(screen.queryByText(/71\.2K/)).toBeNull()
  })

  it('pins nothing: an unpointed chart carries no figure at all', () => {
    show(sixMonths, '2026-09-01')

    // The table beside the picture still has every figure; the picture itself has none until asked.
    expect(within(screen.getByRole('table')).getByText(/71\.210,00/)).toBeInTheDocument()
    expect(screen.queryByText(/71\.210,00/, { ignore: 'table, table *' })).toBeNull()
  })

  it('lets go when the pointer leaves the chart', async () => {
    const { container } = show(sixMonths, '2026-09-01')

    await userEvent.hover(columns(container)[1])
    await userEvent.unhover(columns(container)[1])

    expect(bars(container)[1]).toHaveAttribute('data-lit', 'false')
  })
})

/**
 * jsdom lays nothing out and a screen reader reads no bar, so the exact figures are a table beside the picture.
 * It is the same data, not a summary of it.
 */
describe('the figures behind the picture', () => {
  it('names every month and its amount', () => {
    show(sixMonths)

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('Aprel 2026')
    expect(rows[5]).toHaveTextContent('71.210,00')
  })

  it('says which lines the run is of', () => {
    render(<ExpenseDynamics trend={sixMonths} scope="All" selectedPeriod="2026-09-01" />)

    expect(screen.getByRole('region', { name: 'Xərc dinamikası' }))
      .toHaveTextContent('Son 6 ayın xülasəsi · ümumi faktiki xərc')
  })
})

/** An empty frame is worse than no frame: a single point is not a trend, and neither is a run of nothing. */
describe('when there is nothing to draw', () => {
  it('draws nothing for a single month', () => {
    const { container } = show([point('2026-09-01', 71_210)])

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing where no month is priced', () => {
    const { container } = show([point('2026-08-01', null), point('2026-09-01', null)])

    expect(container).toBeEmptyDOMElement()
  })
})
