import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ManagementDashboardSummary } from '../../api/dashboard'
import { SpendSplitBar } from './SpendSplitBar'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function summary(lineTypes: Partial<ManagementDashboardSummary['lineTypes']> = {}): ManagementDashboardSummary {
  return {
    lineTypes: {
      monthly: { ...none, knownAmount: 56800, itemCount: 300, knownPriceItemCount: 300 },
      outsideMonthly: { ...none, knownAmount: 14200, itemCount: 40, knownPriceItemCount: 40 },
      unclassified: none,
      unclassifiedItemCount: 0,
      ...lineTypes,
    },
  } as ManagementDashboardSummary
}

/** The bar's own track, so a test can read the length the eye is meant to read. */
function barWidth(label: string): string {
  const row = screen.getByText(label).closest('div') as HTMLElement
  const fill = row.querySelector('span.rounded-full > span') as HTMLElement
  return fill.style.width
}

/**
 * «Rəqəm çoxdur. Oxumaq yorur.» — so the proportion is drawn, not written. These tests hold the drawing to the
 * arithmetic: what the bar shows has to be what the money says.
 */
describe('the month drawn as a proportion', () => {
  it('gives each kind of line the length of its share', () => {
    render(<SpendSplitBar summary={summary()} />)

    expect(barWidth('Aylıq sifarişlər')).toBe('80%')
    expect(barWidth('Aylıqdan Kənar sifarişlər')).toBe('20%')
  })

  it('counts unclassified money in the whole the shares are taken of', () => {
    // 50 000 monthly of a 100 000 month is half, however the other half is labelled. Leaving the unclassified
    // lines out of the denominator would draw a fuller month than the company had.
    render(<SpendSplitBar summary={summary({
      monthly: { ...none, knownAmount: 50000, itemCount: 200 },
      outsideMonthly: { ...none, knownAmount: 25000, itemCount: 30 },
      unclassified: { ...none, knownAmount: 25000, itemCount: 9 },
      unclassifiedItemCount: 9,
    })} />)

    expect(barWidth('Aylıq sifarişlər')).toBe('50%')
    expect(barWidth('Aylıqdan Kənar sifarişlər')).toBe('25%')
  })

  it('shows the amount beside the share, so the shape can be checked', () => {
    render(<SpendSplitBar summary={summary()} />)

    expect(screen.getByLabelText('Bu ayın faktiki xərci')).toHaveTextContent('56.800,00 ₼ · 80%')
  })

  it('keeps a sliver for money too small to round to a percent', () => {
    // A single 40 ₼ line out of 56 840 rounds to 0%. Drawing an empty track would say "none", which is a
    // different fact from "little", and off-plan spending is exactly where that difference matters.
    render(<SpendSplitBar summary={summary({ outsideMonthly: { ...none, knownAmount: 40, itemCount: 1 } })} />)

    expect(barWidth('Aylıqdan Kənar sifarişlər')).toBe('1%')
  })

  it('names unclassified lines only when there are some', () => {
    const { rerender } = render(<SpendSplitBar summary={summary()} />)
    expect(screen.queryByText(/təsnif edilməyib/)).toBeNull()

    rerender(<SpendSplitBar summary={summary({ unclassifiedItemCount: 9, unclassified: { ...none, knownAmount: 400, itemCount: 9 } })} />)
    expect(screen.getByText('9 sətir təsnif edilməyib')).toBeInTheDocument()
  })

  it('opens the off-plan lines from the figure that raised the question', async () => {
    const onShowOutsideMonthly = vi.fn()
    render(<SpendSplitBar summary={summary()} onShowOutsideMonthly={onShowOutsideMonthly} />)

    await userEvent.click(screen.getByRole('button', { name: 'Aylıqdan Kənar sifarişlər' }))

    expect(onShowOutsideMonthly).toHaveBeenCalledOnce()
  })

  it('draws nothing on a month with no off-plan spending at all', () => {
    // A bar of one colour is a decoration. The KPI above already said what the month cost.
    const { container } = render(<SpendSplitBar summary={summary({ outsideMonthly: none })} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('draws nothing when no line has a price yet', () => {
    const { container } = render(<SpendSplitBar summary={summary({
      monthly: { ...none, itemCount: 300, missingPriceItemCount: 300, isComplete: false },
      outsideMonthly: { ...none, itemCount: 40, missingPriceItemCount: 40, isComplete: false },
    })} />)

    expect(container).toBeEmptyDOMElement()
  })
})
