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
    supplyChanged: false,
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

  /**
   * Both dimensions, even the one that stayed put. "30 → 30 ədəd · Qiymət 2,80 ₼ → 4,10 ₼" is what makes the
   * effect beside it checkable: a reader can see the money came from the price and not from the quantity.
   */
  it('states the quantity even when only the price moved', () => {
    renderList([driver()])

    expect(screen.getByText(/30 → 30 ədəd/)).toBeInTheDocument()
  })

  it('shows the quantity it moved between when that is the story', () => {
    renderList([bags])

    expect(screen.getByText(/20 → 60 ədəd/)).toBeInTheDocument()
    expect(screen.getByText('+120,00 ₼')).toBeInTheDocument()
  })

  /**
   * The Fəvvarələr order the owner read (brief acceptance): "71 → 0 PCS" and "32.1273 ₼" become "71 → 0 ədəd"
   * and a price to the qəpik. The figures themselves are the backend's and are not touched.
   */
  it('says a unit and a price the way the Fəvvarələr order should read', () => {
    renderList([driver({
      variant: variant({ productVariantId: 25, productName: 'Zibil paketi' }),
      category: 'NoLongerOrdered',
      amountImpact: -2281.04,
      quantityImpact: null,
      priceImpact: null,
      baselineQuantity: 71,
      currentQuantity: 0,
      baselineUnitPrice: 32.1273,
      currentUnitPrice: null,
      unitPricePercentChange: null,
    })])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    expect(row).toHaveTextContent('71 → 0 ədəd')
    expect(row).toHaveTextContent('32,13 ₼')
    expect(row).not.toHaveTextContent('PCS')
    expect(row).not.toHaveTextContent('32,1273')
  })

  /** The money is an effect on money, not a quantity, and the badge above it says so. */
  it('calls the money an effect rather than a change in quantity', () => {
    renderList([bags])

    expect(screen.getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(screen.queryByText('Miqdar dəyişməsi')).toBeNull()
  })

  it('colours the effect by direction alone', () => {
    renderList([bags, driver({ amountImpact: -20, priceImpact: -20 })])

    expect(screen.getByText('+120,00 ₼')).toHaveClass('text-emerald-700')
    expect(screen.getByText('−20,00 ₼')).toHaveClass('text-rose-700')
  })

  /** Both months are ordinary and nothing is missing, which is exactly why it has to be said out loud. */
  it('says when a product was paid for in one month and supplied internally in the other', () => {
    renderList([driver({ supplyChanged: true })])

    expect(screen.getByText(/Təchizat forması dəyişib/)).toBeInTheDocument()
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

    expect(screen.getByText(/Cəmi 400,00 ₼ → 800,00 ₼/)).toBeInTheDocument()
    expect(screen.queryByText(/Miqdar/)).toBeNull()
  })

  it('says how many of a product s lines have no price', () => {
    renderList([driver({
      category: 'UnattributedDueToMissingPrice',
      missingPriceItemCount: 2,
      priceIsComplete: false,
    })])

    expect(screen.getByText(/2 sətirdə qiymət yoxdur/)).toBeInTheDocument()
    // The cause says the same two words as the line and the filter — not a third name for one gap.
    const row = screen.getByRole('button', { name: /York qatlama salfet/ })
    expect(within(row).getByText('Qiymət yoxdur')).toBeInTheDocument()
    expect(screen.queryByText('Qiyməti olmayanlar')).toBeNull()
    // The money it did move is known and real, so it is shown.
    expect(screen.getByText('+39,00 ₼')).toBeInTheDocument()
  })

  /**
   * The row that read as a real zero. A product whose price nobody knows moved an amount nobody can compute,
   * and "0,00 ₼" claims it moved nothing at all.
   */
  it('shows an em dash, not a zero, when the money cannot be computed at all', () => {
    renderList([driver({
      category: 'UnattributedDueToMissingPrice',
      amountImpact: 0,
      quantityImpact: null,
      priceImpact: null,
      currentUnitPrice: null,
      baselineUnitPrice: null,
      unitPricePercentChange: null,
      currentKnownAmount: null,
      baselineKnownAmount: null,
      missingPriceItemCount: 1,
      priceIsComplete: false,
    })])

    expect(screen.queryByText('0,00 ₼')).toBeNull()
    expect(screen.getByRole('button', { name: /York qatlama salfet/ })).toHaveTextContent('—')
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
    expect(within(filters).queryByRole('button', { name: /Yeni məhsullar/ })).toBeNull()
    expect(within(filters).queryByRole('button', { name: /Bu ay yazılmayan məhsullar/ })).toBeNull()
  })

  /** Owner decision 5.1: the filter and the badge under it say the same words. */
  it('names new and no-longer-ordered products in the approved words', () => {
    renderList([
      driver({ variant: variant({ productVariantId: 31, productName: 'Yeni mal' }), category: 'NewOrders' }),
      driver({ variant: variant({ productVariantId: 32, productName: 'Köhnə mal' }), category: 'NoLongerOrdered' }),
    ])

    const filters = screen.getByRole('group', { name: 'Dəyişiklik növü' })
    expect(within(filters).getByRole('button', { name: /Yeni məhsullar/ })).toBeInTheDocument()
    expect(within(filters).getByRole('button', { name: /Bu ay yazılmayan məhsullar/ })).toBeInTheDocument()

    expect(within(screen.getByRole('button', { name: /Yeni mal/ })).getByText('Yeni məhsullar')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Köhnə mal/ })).getByText('Bu ay yazılmayan məhsullar'))
      .toBeInTheDocument()
    expect(screen.queryByText(/Yeni sifarişlər|Artıq sifariş olunma|Artıq sifariş olunmur/)).toBeNull()
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
  /** The whole row is the target, not just the name: the figures are what make a reader want to open it. */
  it('opens on the product that was clicked', async () => {
    const onHistory = renderList([driver()])
    await userEvent.click(screen.getByRole('button', { name: /York qatlama salfet/ }))

    expect(onHistory).toHaveBeenCalledWith(expect.objectContaining({
      variant: expect.objectContaining({ productVariantId: 21 }),
    }))
  })
})
