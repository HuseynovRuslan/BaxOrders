import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VariantIdentity } from '../../api/analytics'
import type { DecisionDriver } from '../../api/decisions'
import { DriverList } from './DriverList'

/**
 * The list a manager actually reads before deciding. Its job is to make each claim checkable: the two numbers
 * a thing changed between, next to the money that came of it. A row that says "qiymət artıb" and nothing else
 * is an assertion; "2,80 → 4,10 ₼" is evidence.
 */
function variant(overrides: Partial<VariantIdentity> = {}): VariantIdentity {
  return {
    productVariantId: 21,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'York qatlama salfet',
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    ...overrides,
  }
}

function driver(overrides: Partial<DecisionDriver> = {}): DecisionDriver {
  return {
    variant: variant(),
    analyticsKind: 'QuantityComparable',
    category: 'PriceChange',
    amountImpact: 39,
    quantityImpact: 0,
    priceImpact: 39,
    currentQuantity: 30,
    baselineQuantity: 30,
    quantityPercentChange: 0,
    currentUnitPrice: 4.1,
    baselineUnitPrice: 2.8,
    unitPricePercentChange: 46.4286,
    currentKnownAmount: 123,
    baselineKnownAmount: 84,
    currentItemCount: 1,
    baselineItemCount: 1,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    priceIsComplete: true,
    ...overrides,
  }
}

const bags = driver({
  variant: variant({ productVariantId: 22, productName: 'Zibil paketi' }),
  category: 'QuantityChange',
  amountImpact: 120,
  quantityImpact: 120,
  priceImpact: 0,
  currentQuantity: 60,
  baselineQuantity: 20,
  quantityPercentChange: 200,
  currentUnitPrice: 3,
  baselineUnitPrice: 3,
  unitPricePercentChange: 0,
})

function renderList(drivers: DecisionDriver[], onHistory = vi.fn()) {
  render(<DriverList drivers={drivers} onHistory={onHistory} />)
  return onHistory
}

describe('a row', () => {
  it('shows the price it moved between, and what that was worth', () => {
    renderList([driver()])

    expect(screen.getByText('York qatlama salfet')).toBeInTheDocument()
    expect(screen.getByText(/Qiymət 2,80 ₼ → 4,10 ₼/)).toBeInTheDocument()
    expect(screen.getByText(/\+46,43%/)).toBeInTheDocument()
    expect(screen.getByText('+39,00 ₼')).toBeInTheDocument()
  })

  it('leaves out the dimension that did not move', () => {
    renderList([driver()])

    // The quantity stayed at 30. Writing "30 → 30" would be noise on a row whose whole story is the price.
    expect(screen.queryByText(/Miqdar 30 → 30/)).toBeNull()
  })

  it('shows the quantity it moved between when that is the story', () => {
    renderList([bags])

    expect(screen.getByText(/Miqdar 20 → 60/)).toBeInTheDocument()
    expect(screen.getByText('+120,00 ₼')).toBeInTheDocument()
  })

  it('gives a service its money and never a quantity', () => {
    renderList([driver({
      variant: variant({ productVariantId: 23, productName: 'Təmizlik xidməti', orderUnitCode: 'MONTH' }),
      analyticsKind: 'AmountOrientedService',
      category: 'Services',
      amountImpact: 400,
      quantityImpact: null,
      priceImpact: null,
      currentQuantity: null,
      baselineQuantity: null,
      quantityPercentChange: null,
      currentUnitPrice: null,
      baselineUnitPrice: null,
      unitPricePercentChange: null,
      baselineKnownAmount: 400,
      currentKnownAmount: 800,
    })])

    expect(screen.getByText(/Məbləğ 400,00 ₼ → 800,00 ₼/)).toBeInTheDocument()
    expect(screen.queryByText(/Miqdar/)).toBeNull()
  })

  it('says how many of a product s lines have no price', () => {
    renderList([driver({
      category: 'UnattributedDueToMissingPrice',
      missingPriceItemCount: 2,
      priceIsComplete: false,
    })])

    expect(screen.getByText(/2 sətrin qiyməti yoxdur/)).toBeInTheDocument()
    expect(screen.getByText('Qiyməti bilinməyənlər')).toBeInTheDocument()
  })
})

describe('the filters', () => {
  it('lists a product that moved both ways under both', async () => {
    const both = driver({
      variant: variant({ productVariantId: 24, productName: 'Əlcək' }),
      category: 'QuantityChange',
      amountImpact: 70,
      quantityImpact: 50,
      priceImpact: 20,
      baselineQuantity: 10,
      currentQuantity: 20,
      baselineUnitPrice: 5,
      currentUnitPrice: 6,
    })
    renderList([both])

    const filters = screen.getByRole('group', { name: 'Dəyişiklik növü' })
    await userEvent.click(within(filters).getByRole('button', { name: /Qiymət dəyişən/ }))
    expect(screen.getByText('Əlcək')).toBeInTheDocument()

    await userEvent.click(within(filters).getByRole('button', { name: /Miqdar dəyişən/ }))
    expect(screen.getByText('Əlcək')).toBeInTheDocument()
  })

  it('keeps a price-only change out of the quantity filter', async () => {
    renderList([driver(), bags])

    const filters = screen.getByRole('group', { name: 'Dəyişiklik növü' })
    await userEvent.click(within(filters).getByRole('button', { name: /Miqdar dəyişən/ }))

    expect(screen.getByText('Zibil paketi')).toBeInTheDocument()
    expect(screen.queryByText('York qatlama salfet')).toBeNull()
  })

  it('offers no filter for a kind of change that did not happen', () => {
    renderList([driver()])

    const filters = screen.getByRole('group', { name: 'Dəyişiklik növü' })
    expect(within(filters).queryByRole('button', { name: /Yeni/ })).toBeNull()
    expect(within(filters).queryByRole('button', { name: /Artıq sifariş olunmur/ })).toBeNull()
  })
})

describe('a long list', () => {
  const many = Array.from({ length: 9 }, (_, index) =>
    driver({
      variant: variant({ productVariantId: 100 + index, productName: `Mal ${index}` }),
      amountImpact: 100 - index,
    }))

  it('shows a handful and offers the rest', () => {
    renderList(many)

    expect(screen.getByText('Mal 0')).toBeInTheDocument()
    expect(screen.queryByText('Mal 8')).toBeNull()
    expect(screen.getByRole('button', { name: /Hamısına bax \(9\)/ })).toBeInTheDocument()
  })

  it('shows the rest when asked', async () => {
    renderList(many)
    await userEvent.click(screen.getByRole('button', { name: /Hamısına bax/ }))

    expect(screen.getByText('Mal 8')).toBeInTheDocument()
  })
})

describe('the product history', () => {
  it('opens on the product that was clicked', async () => {
    const onHistory = renderList([driver()])
    await userEvent.click(screen.getByRole('button', { name: 'York qatlama salfet' }))

    expect(onHistory).toHaveBeenCalledWith(expect.objectContaining({
      variant: expect.objectContaining({ productVariantId: 21 }),
    }))
  })
})
