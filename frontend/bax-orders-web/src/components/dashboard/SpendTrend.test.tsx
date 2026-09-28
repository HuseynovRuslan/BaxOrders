import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DashboardTrendPoint } from '../../api/dashboard'
import { SpendTrend } from './SpendTrend'

function point(period: string, knownAmount: number | null): DashboardTrendPoint {
  return { period, knownAmount, locationCount: 24, missingPriceItemCount: 0 }
}

function months(): DashboardTrendPoint[] {
  return [
    point('2026-04-01', 20_000),
    point('2026-05-01', 24_000),
    point('2026-06-01', 22_000),
    point('2026-07-01', 30_000),
    point('2026-08-01', 29_921.78),
    point('2026-09-01', 70_855.25),
  ]
}

/** The bar heights, in the order they are drawn. */
function heights(): number[] {
  return Array.from(document.querySelectorAll('[data-height]')).map((bar) =>
    Number(bar.getAttribute('data-height')))
}

/**
 * One question, one picture: is this month ordinary for us. Everything these tests hold is in service of the
 * reader being able to answer it at a glance and not be misled doing so.
 */
describe('the last six months as a shape', () => {
  it('draws the tallest month full and the rest against it', () => {
    render(<SpendTrend trend={months()} scope="Monthly" selectedPeriod="2026-09-01" />)

    const drawn = heights()
    expect(drawn.at(-1)).toBe(40)
    // 20 000 of 70 855,25 is a little over a quarter, and the bar is a little over a quarter of the frame.
    expect(drawn[0]).toBe(11)
    expect(drawn).toHaveLength(6)
  })

  it('marks the month the rest of the screen is about', () => {
    render(<SpendTrend trend={months()} scope="Monthly" selectedPeriod="2026-07-01" />)

    const bars = Array.from(document.querySelectorAll('[data-height]'))
    expect(bars.filter((bar) => bar.className.includes('bg-slate-800'))).toHaveLength(1)
    expect(bars[3].className).toContain('bg-slate-800')
  })

  it('says which population is drawn, so the line cannot be read as the other one', () => {
    const { rerender } = render(<SpendTrend trend={months()} scope="Monthly" selectedPeriod="2026-09-01" />)
    expect(screen.getByText('Son 6 ay · Aylıq sifarişlərin məbləği')).toBeInTheDocument()

    rerender(<SpendTrend trend={months()} scope="All" selectedPeriod="2026-09-01" />)
    expect(screen.getByText('Son 6 ay · Ümumi faktiki xərc')).toBeInTheDocument()
  })

  it('gives the figures themselves to a reader who is not reading the picture', () => {
    render(<SpendTrend trend={months()} scope="Monthly" selectedPeriod="2026-09-01" />)

    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(rows[0]).toHaveTextContent('Aprel 202620.000,00 ₼')
    expect(rows[5]).toHaveTextContent('Sentyabr 202670.855,25 ₼')
  })

  it('draws no bar for a month whose prices were never entered', () => {
    // Null is not zero: the month is not empty, its money is unknown, and a bar would claim otherwise.
    render(<SpendTrend trend={[point('2026-08-01', null), point('2026-09-01', 40_000)]} scope="Monthly" selectedPeriod="2026-09-01" />)

    expect(heights()).toEqual([0, 40])
    expect(within(screen.getByRole('table')).getAllByRole('row')[0]).toHaveTextContent('—')
  })

  it('keeps a visible bar for a month that is small rather than empty', () => {
    render(<SpendTrend trend={[point('2026-08-01', 12), point('2026-09-01', 40_000)]} scope="Monthly" selectedPeriod="2026-09-01" />)

    expect(heights()[0]).toBe(3)
  })

  it('draws nothing at all from a single month', () => {
    const { container } = render(<SpendTrend trend={[point('2026-09-01', 40_000)]} scope="Monthly" selectedPeriod="2026-09-01" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when no month of the run has a price on it', () => {
    const { container } = render(
      <SpendTrend trend={[point('2026-08-01', null), point('2026-09-01', null)]} scope="Monthly" selectedPeriod="2026-09-01" />)

    expect(container).toBeEmptyDOMElement()
  })
})
