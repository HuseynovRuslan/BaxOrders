import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DecisionCause, DecisionDecomposition } from '../../api/decisions'
import { CauseSummary } from './CauseSummary'

/**
 * "Niyə dəyişib?" has one duty above every other: whatever it shows must add up to the difference it claims
 * to explain. The rest of these hold it to saying nothing it cannot back up — no confident cause over a
 * missing price, no zero rows dressed up as findings.
 */
function cause(category: DecisionCause['category'], amount: number, variantCount = 1): DecisionCause {
  return { category, amount, variantCount }
}

function decomposition(overrides: Partial<DecisionDecomposition> = {}): DecisionDecomposition {
  const categories = overrides.categories ?? [
    cause('NewOrders', 50),
    cause('QuantityChange', 120, 2),
    cause('PriceChange', 39),
    cause('NoLongerOrdered', -20),
    cause('Services', 0, 0),
    cause('UnattributedDueToMissingPrice', 0, 0),
  ]

  return {
    categories,
    totalAmountImpact: categories.reduce((sum, item) => sum + item.amount, 0),
    explanationIsComplete: true,
    unattributedVariantCount: 0,
    internalSupplyVariantCount: 0,
    supplyChangedVariantCount: 0,
    drivers: [],
    ...overrides,
  }
}

describe('the causes', () => {
  it('names each one with the money it moved', () => {
    render(<CauseSummary decomposition={decomposition()} />)

    expect(screen.getByText('Yeni sifarişlər')).toBeInTheDocument()
    expect(screen.getByText('+50,00 ₼')).toBeInTheDocument()
    // Named as effects on money: the manat figure beside "Miqdar" is not a quantity.
    expect(screen.getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(screen.getByText('+120,00 ₼')).toBeInTheDocument()
    expect(screen.getByText('Qiymət təsiri')).toBeInTheDocument()
    expect(screen.getByText('+39,00 ₼')).toBeInTheDocument()
    expect(screen.getByText('Artıq sifariş olunmayanlar')).toBeInTheDocument()
    expect(screen.getByText('−20,00 ₼')).toBeInTheDocument()
  })

  it('shows the total the causes add up to', () => {
    render(<CauseSummary decomposition={decomposition()} />)

    // 50 + 120 + 39 − 20.
    expect(screen.getByText('+189,00 ₼')).toBeInTheDocument()
  })

  it('leaves out a cause that moved nothing rather than drawing a labelled zero', () => {
    render(<CauseSummary decomposition={decomposition()} />)

    expect(screen.queryByText('Xidmətlər')).toBeNull()
    expect(screen.queryByText('Qiyməti bilinməyənlər')).toBeNull()
  })

  it('says so plainly when the month did not change at all', () => {
    render(<CauseSummary decomposition={decomposition({
      categories: [cause('NewOrders', 0, 0)],
      totalAmountImpact: 0,
    })} />)

    expect(screen.getByText('Keçən aya görə məbləğ dəyişməyib.')).toBeInTheDocument()
  })
})

describe('an explanation that cannot be complete', () => {
  it('says the cause is not fully known instead of presenting a confident one', () => {
    render(<CauseSummary decomposition={decomposition({
      explanationIsComplete: false,
      unattributedVariantCount: 2,
    })} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Bəzi məhsulların qiyməti bilinmədiyi üçün dəyişikliyin səbəbi tam izah edilə bilmir.',
    )
  })

  it('says nothing of the sort when every price is known', () => {
    render(<CauseSummary decomposition={decomposition()} />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the colours', () => {
  it('never calls a rise bad or a fall good — nothing here is green or red', () => {
    const { container } = render(<CauseSummary decomposition={decomposition()} />)

    expect(container.querySelector('[class*="text-emerald"]')).toBeNull()
    expect(container.querySelector('[class*="text-red"]')).toBeNull()
    expect(container.querySelector('[class*="bg-emerald"]')).toBeNull()
  })
})
