import { createRef, useState, type ComponentProps } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { VariantIdentity } from '../../api/analytics'
import type { DecisionDriver, DecisionProductCounts, DecisionVariantTransition } from '../../api/decisions'
import { findOldTerms } from '../../test/oldTerms'
import { interactiveTextClass } from '../interaction'
import { DriverList } from './DriverList'
import type { DriverFilter } from './labels'

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
    state: 'Unchanged',
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
  state: 'Increased',
})

/**
 * The counts the backend sends beside the drivers; by default, a comparison of exactly these drivers and steady
 * products, counted the way the backend counts them.
 */
function productsOf(
  drivers: DecisionDriver[],
  overrides: Partial<DecisionProductCounts> = {},
  steady: DecisionDriver[] = [],
): DecisionProductCounts {
  const compared = [...drivers, ...steady]
  return {
    comparedCount: compared.length,
    inCurrentOrderCount: compared.length,
    newCount: drivers.filter((item) => item.state === 'New').length,
    noLongerOrderedCount: drivers.filter((item) => item.state === 'NoLongerOrdered').length,
    listedCount: drivers.length,
    increasedCount: compared.filter((item) => item.state === 'Increased').length,
    decreasedCount: compared.filter((item) => item.state === 'Decreased').length,
    serviceCount: compared.filter((item) => item.analyticsKind === 'AmountOrientedService').length,
    ...overrides,
  }
}

/**
 * The page's side of the list. The chip that is on is the page's (Task 18: it lives in the URL), so the list is
 * rendered the way the page renders it — holding the chip and handing it back — and a pressed chip is on.
 */
type ControlledProps = Omit<ComponentProps<typeof DriverList>, 'filter' | 'onFilter'> & { initialFilter?: DriverFilter }

function Controlled({ initialFilter = 'All', ...props }: ControlledProps) {
  const [filter, setFilter] = useState<DriverFilter>(initialFilter)
  return <DriverList {...props} filter={filter} onFilter={setFilter} />
}

function renderList(
  drivers: DecisionDriver[],
  onHistory = vi.fn(),
  products = productsOf(drivers),
  steady: DecisionDriver[] = [],
) {
  render(<Controlled drivers={drivers} steady={steady} products={products} onHistory={onHistory} />)
  return onHistory
}

/** A priced product ordered the same at the same price: no money, no effect — steady, and unchanged. */
const steadyGood = driver({
  variant: variant({ productVariantId: 71, productName: 'Sabit mal' }),
  category: 'QuantityChange',
  amountImpact: 0,
  quantityImpact: 0,
  priceImpact: 0,
  currentQuantity: 50,
  baselineQuantity: 50,
  quantityPercentChange: 0,
  currentUnitPrice: 1,
  baselineUnitPrice: 1,
  unitPricePercentChange: 0,
  currentKnownAmount: 50,
  baselineKnownAmount: 50,
  state: 'Unchanged',
})

/**
 * Store material whose quantity rose: it costs nothing either way, so it is not a reason — and it is still up.
 * The one steady product the old "dəyişməyib" misdescribed.
 */
const risingStore = driver({
  variant: variant({ productVariantId: 72, productName: 'Artan anbar malı' }),
  category: 'InternalSupply',
  amountImpact: 0,
  quantityImpact: null,
  priceImpact: null,
  currentQuantity: 12,
  baselineQuantity: 10,
  quantityPercentChange: 20,
  currentUnitPrice: null,
  baselineUnitPrice: null,
  unitPricePercentChange: null,
  currentKnownAmount: null,
  baselineKnownAmount: null,
  priceNotRequiredItemCount: 2,
  state: 'Increased',
})

/** What a sighted reader sees: the text without the words said only to a screen reader, spaces collapsed. */
function visibleText(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.sr-only').forEach((node) => node.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
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

  /**
   * Owner decision 9.1 (brief acceptance: "Nitroamafoska +870 qırmızı, Yay ayaqqabısı −1,988 yaşıl"): a cost that
   * went up is red and one that went down is green — its direction, not a verdict, and said in words as well.
   */
  it('colours the money by the direction of the cost, and says the direction', () => {
    renderList([
      driver({ variant: variant({ productVariantId: 41, productName: 'Nitroamafoska' }), amountImpact: 870, priceImpact: 870 }),
      driver({ variant: variant({ productVariantId: 42, productName: 'Yay ayaqqabısı' }), amountImpact: -1988, priceImpact: -1988 }),
    ])

    const up = screen.getByText('+870,00 ₼')
    const down = screen.getByText('−1.988,00 ₼')
    expect(up).toHaveClass('text-red-700')
    expect(down).toHaveClass('text-emerald-700')
    expect(within(up).getByText(/xərc artıb/)).toHaveClass('sr-only')
    expect(within(down).getByText(/xərc azalıb/)).toHaveClass('sr-only')
    expect(screen.getByRole('region', { name: 'Əsas dəyişikliklər' }).innerHTML).not.toMatch(/text-rose-700/)
  })

  /**
   * The audit's Zibil paketi (brief acceptance 1): 50 → 55 paket at 32,00 → 32,1273 ₼ is +167,00 ₼, of which 160 ₼
   * is quantity and 7 ₼ is price. The row said only "Miqdar təsiri"; it now gives each part its money.
   */
  it('splits a row whose quantity and price both moved, keeping the compact line as it was', () => {
    renderList([driver({
      variant: variant({ productVariantId: 51, productName: 'Zibil paketi', orderUnitCode: 'PACK', orderUnitName: 'Paçka' }),
      category: 'QuantityChange',
      amountImpact: 167,
      quantityImpact: 160,
      priceImpact: 7,
      baselineQuantity: 50,
      currentQuantity: 55,
      quantityPercentChange: 10,
      baselineUnitPrice: 32,
      currentUnitPrice: 32.1273,
      unitPricePercentChange: 0.3978,
      state: 'Increased',
    })])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    // "Mütləq qorunmalı": the compact line in the same form and order.
    const compact = within(row).getByText(/50 → 55 paket · Qiymət 32,00 ₼ → 32,13 ₼/)
    const split = compact.nextElementSibling as HTMLElement
    expect(visibleText(split)).toBe('Miqdar +160,00 ₼ · Qiymət +7,00 ₼')
    expect(within(split).getByText('+160,00 ₼')).toHaveClass('text-red-700')
    expect(within(split).getByText('+7,00 ₼')).toHaveClass('text-red-700')
    expect(within(split).getAllByText(/xərc artıb/)).toHaveLength(2)

    // One neutral pill naming both, never the larger effect alone.
    expect(within(row).getByText('Miqdar və qiymət')).toHaveClass('bg-slate-100')
    expect(within(row).queryByText('Miqdar təsiri')).toBeNull()
    expect(within(row).getByText('+167,00 ₼')).toHaveClass('text-red-700')
  })

  it('gives each part of a split its own direction', () => {
    renderList([driver({ amountImpact: 30, quantityImpact: 50, priceImpact: -20, category: 'QuantityChange' })])

    const row = screen.getByRole('button', { name: /York qatlama salfet/ })
    expect(within(row).getByText('+50,00 ₼')).toHaveClass('text-red-700')
    expect(within(row).getByText('−20,00 ₼')).toHaveClass('text-emerald-700')
  })

  it('leaves a row with one effect as it was: one pill, no split', () => {
    renderList([bags])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    expect(within(row).getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(within(row).queryByText('Miqdar və qiymət')).toBeNull()
    expect(within(row).queryByText(/^Miqdar$/)).toBeNull()
    expect(visibleText(row)).not.toMatch(/Miqdar \+120,00 ₼ · Qiymət/)
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

  /**
   * Listed because it is new, not because it moved money: a new material from the company's own store has no
   * known amount on either side. Its money is unknown rather than zero, so it reads "—" too.
   */
  it('shows an em dash for a new product that has no known money on either side', () => {
    renderList([driver({
      category: 'InternalSupply',
      amountImpact: 0,
      quantityImpact: null,
      priceImpact: null,
      baselineQuantity: 0,
      currentQuantity: 4,
      currentUnitPrice: null,
      baselineUnitPrice: null,
      unitPricePercentChange: null,
      currentKnownAmount: null,
      baselineKnownAmount: null,
      priceNotRequiredItemCount: 1,
      state: 'New',
    })])

    const row = screen.getByRole('button', { name: /York qatlama salfet/ })
    expect(row).toHaveTextContent('—')
    expect(screen.queryByText('0,00 ₼')).toBeNull()
  })
})

describe('what "Hamısı" counts', () => {
  /**
   * Brief: "Hamısı 100" on an order of 76 lines, and nothing said what the 100 was. The tail changed deliberately
   * in 11b: "9 məhsul dəyişməyib" was not true of store material whose quantity moved at no cost, and those 9 are
   * now on screen under "Məbləği dəyişməyən" — so the line uses the chip's words.
   */
  it('says how many products the order has, the comparison covers, and the list holds', () => {
    renderList([driver()], vi.fn(), productsOf([driver()], { inCurrentOrderCount: 76, comparedCount: 100, listedCount: 91 }))

    expect(screen.getByText(
      'Bu sifarişdə 76 məhsul var, müqayisə bazası ilə birlikdə 100. «Hamısı» onlardan dəyişən 91 məhsulu sayır. '
      + '9 məhsulun məbləği dəyişməyib.',
    )).toBeInTheDocument()
  })

  it('says nothing about unchanged products when every compared product changed', () => {
    renderList([driver()], vi.fn(), productsOf([driver()], { inCurrentOrderCount: 1, comparedCount: 1, listedCount: 1 }))

    expect(screen.getByText(
      'Bu sifarişdə 1 məhsul var, müqayisə bazası ilə birlikdə 1. «Hamısı» onlardan dəyişən 1 məhsulu sayır.',
    )).toBeInTheDocument()
    expect(screen.queryByText(/dəyişməyib/)).toBeNull()
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
      driver({ variant: variant({ productVariantId: 31, productName: 'Yeni mal' }), category: 'NewOrders', state: 'New' }),
      driver({
        variant: variant({ productVariantId: 32, productName: 'Köhnə mal' }),
        category: 'NoLongerOrdered',
        state: 'NoLongerOrdered',
      }),
    ])

    const filters = screen.getByRole('group', { name: 'Dəyişiklik növü' })
    expect(within(filters).getByRole('button', { name: /Yeni məhsullar/ })).toBeInTheDocument()
    expect(within(filters).getByRole('button', { name: /Bu ay yazılmayan məhsullar/ })).toBeInTheDocument()

    expect(within(screen.getByRole('button', { name: /Yeni mal/ })).getByText('Yeni məhsullar')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Köhnə mal/ })).getByText('Bu ay yazılmayan məhsullar'))
      .toBeInTheDocument()
    expect(screen.queryByText(/Yeni sifarişlər|Artıq sifariş olunma|Artıq sifariş olunmur/)).toBeNull()
  })

  /**
   * Brief: "Yeni 58" on the order page against "Yeni 60" on the comparison page. The chip now counts and filters
   * by the product's state — the comparison page's rule — not by where its money was filed, so a new product
   * whose price is missing is a new product, and is under "Qiymət yoxdur" as well.
   */
  it('counts and lists new products by their state, whatever their money was filed under', async () => {
    const unpricedNew = driver({
      variant: variant({ productVariantId: 61, productName: 'Yeni qiyməti olmayan mal' }),
      category: 'UnattributedDueToMissingPrice',
      missingPriceItemCount: 1,
      priceIsComplete: false,
      state: 'New',
    })
    const freeNew = driver({
      variant: variant({ productVariantId: 62, productName: 'Yeni anbar malı' }),
      category: 'InternalSupply',
      priceNotRequiredItemCount: 1,
      state: 'New',
    })
    const pricedNew = driver({ variant: variant({ productVariantId: 63, productName: 'Yeni alət' }), category: 'NewOrders', state: 'New' })
    const dropped = driver({
      variant: variant({ productVariantId: 64, productName: 'Köhnə alət' }),
      category: 'NoLongerOrdered',
      state: 'NoLongerOrdered',
    })
    const drivers = [unpricedNew, freeNew, pricedNew, dropped, bags]
    const products = productsOf(drivers)
    renderList(drivers, vi.fn(), products)

    const filters = within(screen.getByRole('group', { name: 'Dəyişiklik növü' }))
    // Each chip's count is the backend's count for the same question, and the number of rows it leaves.
    expect(filters.getByRole('button', { name: /Yeni məhsullar/ })).toHaveTextContent(`Yeni məhsullar${products.newCount}`)
    expect(products.newCount).toBe(3)
    expect(filters.getByRole('button', { name: /Bu ay yazılmayan məhsullar/ }))
      .toHaveTextContent(`Bu ay yazılmayan məhsullar${products.noLongerOrderedCount}`)

    await userEvent.click(filters.getByRole('button', { name: /Yeni məhsullar/ }))
    const list = within(screen.getByRole('list'))
    expect(list.getAllByRole('listitem')).toHaveLength(3)
    expect(list.getByText('Yeni qiyməti olmayan mal')).toBeInTheDocument()
    expect(list.getByText('Yeni anbar malı')).toBeInTheDocument()
    expect(list.queryByText('Zibil paketi')).toBeNull()

    await userEvent.click(filters.getByRole('button', { name: /Qiymət yoxdur/ }))
    expect(within(screen.getByRole('list')).getByText('Yeni qiyməti olmayan mal')).toBeInTheDocument()
  })
})

/**
 * 11.1, sub-line 3: nothing the comparison page showed is lost. It listed every compared product; the order page
 * lists the ones whose money did not move under a chip of their own, so "Hamısı" keeps Task 10's meaning.
 */
describe('the products whose money did not move', () => {
  const drivers = [driver(), bags]
  const steady = [risingStore, steadyGood]

  it('are under their own chip, last in the row, counting compared minus listed', () => {
    const products = productsOf(drivers, {}, steady)
    renderList(drivers, vi.fn(), products, steady)

    const chips = within(screen.getByRole('group', { name: 'Dəyişiklik növü' })).getAllByRole('button')
    const chip = chips[chips.length - 1]
    expect(chip).toHaveTextContent('Məbləği dəyişməyən2')
    // K − L = U: the chip counts exactly the products the scope line says moved no money.
    expect(products.comparedCount - products.listedCount).toBe(steady.length)
    expect(screen.getByText(/2 məhsulun məbləği dəyişməyib\.$/)).toBeInTheDocument()
  })

  it('list each in the same row form, its pill naming its state in slate', async () => {
    renderList(drivers, vi.fn(), productsOf(drivers, {}, steady), steady)

    await userEvent.click(screen.getByRole('button', { name: /Məbləği dəyişməyən/ }))
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows).toHaveLength(2)

    const same = screen.getByRole('button', { name: /Sabit mal/ })
    expect(within(same).getByText('Dəyişməyib')).toHaveClass('bg-slate-100')
    expect(within(same).queryByText('Miqdar təsiri')).toBeNull()
    expect(same).toHaveTextContent('50 → 50 ədəd · Qiymət 1,00 ₼ → 1,00 ₼')
    // Money known on both sides that did not move is a real zero, in slate.
    expect(within(same).getByText('0,00 ₼')).toHaveClass('text-slate-600')

    // Up by quantity, no money either way: "Artıb", and an em dash rather than a zero nobody can compute.
    const rising = screen.getByRole('button', { name: /Artan anbar malı/ })
    expect(within(rising).getByText('Artıb')).toHaveClass('bg-slate-100')
    expect(within(rising).queryByText('Daxili təminat', { selector: 'span' })).toBeNull()
    expect(rising).toHaveTextContent('10 → 12 ədəd')
    expect(rising).toHaveTextContent('—')
    expect(within(rising).queryByText('0,00 ₼')).toBeNull()
  })

  it('open the product history like every other row', async () => {
    const onHistory = renderList(drivers, vi.fn(), productsOf(drivers, {}, steady), steady)

    await userEvent.click(screen.getByRole('button', { name: /Məbləği dəyişməyən/ }))
    await userEvent.click(screen.getByRole('button', { name: /Artan anbar malı/ }))

    expect(onHistory).toHaveBeenCalledWith(risingStore)
  })

  it('leave "Hamısı" and every other chip counting and listing the changed products only', () => {
    renderList(drivers, vi.fn(), productsOf(drivers, {}, steady), steady)

    const filters = within(screen.getByRole('group', { name: 'Dəyişiklik növü' }))
    expect(filters.getByRole('button', { name: /Hamısı/ })).toHaveTextContent('Hamısı2')
    expect(filters.getByRole('button', { name: /Qiymət dəyişən/ })).toHaveTextContent('Qiymət dəyişən1')
    expect(filters.getByRole('button', { name: /Miqdar dəyişən/ })).toHaveTextContent('Miqdar dəyişən1')
    expect(screen.queryByText('Sabit mal')).toBeNull()
    expect(screen.queryByText('Artan anbar malı')).toBeNull()
  })

  it('offer no chip when there are none', () => {
    renderList(drivers)

    expect(screen.queryByRole('button', { name: /Məbləği dəyişməyən/ })).toBeNull()
  })

  it('show six and offer the rest, like every chip', async () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      driver({ ...steadyGood, variant: variant({ productVariantId: 200 + index, productName: `Sabit ${index}` }) }))
    renderList(drivers, vi.fn(), productsOf(drivers, {}, many), many)

    await userEvent.click(screen.getByRole('button', { name: /Məbləği dəyişməyən/ }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('button', { name: /Hamısına bax \(8\)/ })).toBeInTheDocument()
  })
})

/** C13: the comparison page's up / down / service counts, from the backend, over every compared product. */
describe('the state counts', () => {
  it('say how many went up and down, from the backend', () => {
    renderList([driver()], vi.fn(), productsOf([driver()], { increasedCount: 12, decreasedCount: 9, serviceCount: 0 }))

    expect(screen.getByText('Artıb: 12 · Azalıb: 9')).toBeInTheDocument()
  })

  it('add the services when there are any', () => {
    renderList([driver()], vi.fn(), productsOf([driver()], { increasedCount: 12, decreasedCount: 9, serviceCount: 1 }))

    expect(screen.getByText('Artıb: 12 · Azalıb: 9 · Xidmətlər: 1')).toBeInTheDocument()
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

/**
 * Task 20 (brief requirement 3): the product name opened the history but read as ordinary black text, and nobody
 * found it. The row stays the one button Task 19 opens the drawer from; only what it says about itself changes.
 */
describe('the product name says it opens something', () => {
  it('is still one button per row, found by its product, that says it opens a dialog', () => {
    renderList([bags, driver()])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    expect(row).toHaveAttribute('aria-haspopup', 'dialog')
    expect(row).toHaveClass('group')
    expect(row).toHaveAccessibleName(/^Zibil paketi/)
    // Nothing else in the row is a control: the name, the marker and the figures are all this one button.
    expect(row.querySelector('button, a')).toBeNull()
    expect(within(screen.getByRole('list')).getAllByRole('button')).toHaveLength(2)
  })

  it('underlines the name with its row, and keeps the name\'s resting look', () => {
    renderList([bags])

    const name = within(screen.getByRole('button', { name: /Zibil paketi/ })).getByText('Zibil paketi')
    expect(name.tagName).toBe('SPAN')
    // Its resting classes as they were, and only the hover and focus underline added.
    expect(name.className).toBe(`font-medium text-slate-900 ${interactiveTextClass}`)
  })

  it('puts a history marker right after the name, for the eye only', () => {
    renderList([bags])

    const name = within(screen.getByRole('button', { name: /Zibil paketi/ })).getByText('Zibil paketi')
    const marker = name.nextElementSibling!
    expect(marker.tagName.toLowerCase()).toBe('svg')
    expect(marker).toHaveAttribute('aria-hidden', 'true')
    expect(marker).toHaveClass('size-3.5', 'shrink-0', 'text-slate-400', 'group-hover:text-slate-700')
    expect(marker.parentElement).toBe(name.parentElement)
  })

  it('opens the history with the product, from the name and from the marker alike', async () => {
    const onHistory = renderList([bags])
    const row = screen.getByRole('button', { name: /Zibil paketi/ })

    await userEvent.click(within(row).getByText('Zibil paketi'))
    await userEvent.click(within(row).getByText('Zibil paketi').nextElementSibling!)

    expect(onHistory).toHaveBeenCalledTimes(2)
    expect(onHistory).toHaveBeenNthCalledWith(1, bags)
    expect(onHistory).toHaveBeenNthCalledWith(2, bags)
  })

  it('leaves the pill, the figures and their colours as they were', () => {
    renderList([bags])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    expect(within(row).getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(within(row).getByText(/20 → 60 ədəd/)).toBeInTheDocument()
    expect(within(row).getByText('+120,00 ₼')).toHaveClass('text-red-700')
    // The marker adds no word: what a reader sees in the row is the name, the pill and the figures, as before.
    expect(visibleText(row)).not.toMatch(/tarixçə/i)
    expect(within(row).getByText('Miqdar təsiri')).toHaveClass('rounded-full', 'text-xs', 'font-medium')
  })
})

/**
 * Task 13c (13.1a, 13.1): the two products of an approved variant transition stay two rows, each with its own figures
 * and history. Their pill says "Variant dəyişib" and a note names the switch; the chips still count them by state.
 */
describe('an approved variant transition', () => {
  const sabun = driver({
    variant: variant({ productVariantId: 81, productId: 181, productName: 'Sabun elano' }),
    category: 'VariantChange',
    amountImpact: -750,
    quantityImpact: null,
    priceImpact: null,
    currentQuantity: 0,
    baselineQuantity: 60,
    quantityPercentChange: -100,
    currentUnitPrice: null,
    baselineUnitPrice: 12.5,
    unitPricePercentChange: null,
    currentKnownAmount: null,
    baselineKnownAmount: 750,
    currentItemCount: 0,
    state: 'NoLongerOrdered',
  })
  const lavanda = driver({
    variant: variant({ productVariantId: 82, productId: 182, productName: 'Sabun elano lavanda ətirli' }),
    category: 'VariantChange',
    amountImpact: 750,
    quantityImpact: null,
    priceImpact: null,
    currentQuantity: 60,
    baselineQuantity: 0,
    quantityPercentChange: null,
    currentUnitPrice: 12.5,
    baselineUnitPrice: null,
    unitPricePercentChange: null,
    currentKnownAmount: 750,
    baselineKnownAmount: null,
    baselineItemCount: 0,
    state: 'New',
  })
  const transitions: DecisionVariantTransition[] = [{
    baseProductId: 181,
    baseProductName: 'Sabun elano',
    from: [{ productVariantId: 81, productId: 181, productName: 'Sabun elano', variantLabel: null }],
    to: [{ productVariantId: 82, productId: 182, productName: 'Sabun elano lavanda ətirli', variantLabel: 'lavanda ətirli' }],
    amountImpact: 0,
    baselineKnownAmount: 750,
    currentKnownAmount: 750,
  }]

  function renderFamily(drivers: DecisionDriver[] = [lavanda, sabun]) {
    render(
      <Controlled
        drivers={drivers}
        steady={[]}
        products={productsOf(drivers)}
        variantTransitions={transitions}
        onHistory={vi.fn()}
      />,
    )
  }

  it('gives both products the pill and the note naming the switch, each with its own money', () => {
    renderFamily()

    for (const [name, money] of [['Sabun elano lavanda ətirli', '+750,00 ₼'], ['Sabun elano', '−750,00 ₼']]) {
      const row = screen.getByText(name).closest('button')!
      expect(within(row).getByText('Variant dəyişib'), name).toHaveClass('bg-slate-100', 'text-slate-700')
      expect(within(row).getByText('Variant dəyişib: adi → lavanda ətirli'), name).toBeInTheDocument()
      expect(within(row).getByText(money), name).toBeInTheDocument()
    }
  })

  it('still counts both under "Yeni məhsullar" and "Bu ay yazılmayan", by their state', async () => {
    renderFamily()

    const filters = within(screen.getByRole('group', { name: 'Dəyişiklik növü' }))
    expect(filters.getByRole('button', { name: /Yeni məhsullar/ })).toHaveTextContent('Yeni məhsullar1')
    expect(filters.getByRole('button', { name: /Bu ay yazılmayan məhsullar/ })).toHaveTextContent('Bu ay yazılmayan məhsullar1')

    await userEvent.click(filters.getByRole('button', { name: /Yeni məhsullar/ }))
    const list = within(screen.getByRole('list'))
    expect(list.getAllByRole('listitem')).toHaveLength(1)
    expect(list.getByText('Sabun elano lavanda ətirli')).toBeInTheDocument()
  })

  it('says nothing of a switch on a product that is not part of one', () => {
    renderFamily([lavanda, sabun, bags])

    const row = screen.getByRole('button', { name: /Zibil paketi/ })
    expect(within(row).queryByText(/Variant dəyişib/)).toBeNull()
  })

  it('uses no retired word', () => {
    renderFamily()

    expect(findOldTerms(document.body)).toEqual([])
  })
})

/**
 * Task 18 (18.1): the chips and the reasons of "Niyə dəyişib?" are one control. The chip that is on is the page's,
 * in the URL; a chip pressed here asks the page for it, as a reason does.
 */
describe('the chip, owned by the page', () => {
  /** The Zibil paketi of the audit: 50 → 55 paket at 32,00 → 32,1273 ₼, +167,00 ₼ — 160 ₼ quantity, 7 ₼ price. */
  const mixedBags = driver({
    variant: variant({ productVariantId: 51, productName: 'Zibil paketi', orderUnitCode: 'PACK', orderUnitName: 'Paçka' }),
    category: 'QuantityChange',
    amountImpact: 167,
    quantityImpact: 160,
    priceImpact: 7,
    baselineQuantity: 50,
    currentQuantity: 55,
    quantityPercentChange: 10,
    baselineUnitPrice: 32,
    currentUnitPrice: 32.1273,
    unitPricePercentChange: 0.3978,
    state: 'Increased',
  })
  const newTool = driver({
    variant: variant({ productVariantId: 63, productName: 'Yeni alət' }),
    category: 'NewOrders',
    priceImpact: null,
    quantityImpact: null,
    baselineQuantity: 0,
    state: 'New',
  })
  const droppedTool = driver({
    variant: variant({ productVariantId: 64, productName: 'Köhnə alət' }),
    category: 'NoLongerOrdered',
    priceImpact: null,
    quantityImpact: null,
    currentQuantity: 0,
    state: 'NoLongerOrdered',
  })
  const unpriced = driver({
    variant: variant({ productVariantId: 65, productName: 'Qiyməti olmayan mal' }),
    category: 'UnattributedDueToMissingPrice',
    priceImpact: null,
    quantityImpact: null,
    missingPriceItemCount: 1,
    priceIsComplete: false,
  })

  function list(filter: DriverFilter, drivers: DecisionDriver[], onFilter = vi.fn(), steady: DecisionDriver[] = []) {
    return (
      <DriverList
        drivers={drivers}
        steady={steady}
        products={productsOf(drivers, {}, steady)}
        filter={filter}
        onFilter={onFilter}
        onHistory={vi.fn()}
      />
    )
  }

  function chips(): HTMLElement[] {
    return within(screen.getByRole('group', { name: 'Dəyişiklik növü' })).getAllByRole('button')
  }

  function chip(name: RegExp): HTMLElement {
    return within(screen.getByRole('group', { name: 'Dəyişiklik növü' })).getByRole('button', { name })
  }

  it('shows the chip it is given as on, and only that chip s products', () => {
    render(list('New', [driver(), bags, newTool, droppedTool]))

    expect(chip(/Yeni məhsullar/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/Hamısı/)).toHaveAttribute('aria-pressed', 'false')
    const rows = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Yeni alət')
  })

  it('asks the page for a pressed chip rather than keeping it to itself', async () => {
    const onFilter = vi.fn()
    render(list('All', [driver(), bags], onFilter))

    await userEvent.click(chip(/Qiymət dəyişən/))

    expect(onFilter).toHaveBeenCalledWith('PriceChange')
    // The page did not take it up, so nothing moved: the list follows the page, not the press.
    expect(chip(/Hamısı/)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Zibil paketi')).toBeInTheDocument()
  })

  it('keeps the chips labels, order and counts as they were', () => {
    render(list('All', [driver(), bags, newTool, droppedTool, unpriced], vi.fn(), [steadyGood]))

    expect(chips().map((chip) => chip.textContent)).toEqual([
      'Hamısı5',
      'Qiymət dəyişən1',
      'Miqdar dəyişən1',
      'Yeni məhsullar1',
      'Bu ay yazılmayan məhsullar1',
      'Qiymət yoxdur1',
      'Məbləği dəyişməyən1',
    ])
  })

  /**
   * A link, or a basis with other products, can turn on a chip with nothing under it. The chip is then still there,
   * on and reading 0, so the screen agrees with the address bar; every other empty chip stays out as before.
   */
  it('offers the chip that is on even at 0, with the list saying there is nothing under it', () => {
    render(list('New', [driver(), bags]))

    const on = chip(/Yeni məhsullar/)
    expect(on).toHaveAttribute('aria-pressed', 'true')
    expect(on).toHaveTextContent('Yeni məhsullar0')
    expect(screen.getByText('Bu növ üzrə dəyişiklik yoxdur.')).toBeInTheDocument()
    // Every other chip with nothing under it stays out, as before.
    expect(chips().map((button) => button.textContent))
      .toEqual(['Hamısı2', 'Qiymət dəyişən1', 'Miqdar dəyişən1', 'Yeni məhsullar0'])
  })

  it('goes back to the first six whenever the chip changes from outside', async () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      driver({ variant: variant({ productVariantId: 100 + index, productName: `Mal ${index}` }), amountImpact: 100 - index }))
    const { rerender } = render(list('All', many))

    await userEvent.click(screen.getByRole('button', { name: /Hamısına bax \(9\)/ }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(9)

    // Every one of them moved its price, so "Qiymət dəyişən" holds the same nine — and starts at six.
    rerender(list('PriceChange', many))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByRole('button', { name: /Hamısına bax \(9\)/ })).toBeInTheDocument()

    // Back to "Hamısı" — through Back, say — is a new filter too; its opened list is not remembered.
    rerender(list('All', many))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6)
  })

  it('still goes back to the first six when the chip that is on is pressed again', async () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      driver({ variant: variant({ productVariantId: 100 + index, productName: `Mal ${index}` }), amountImpact: 100 - index }))
    render(<Controlled drivers={many} steady={[]} products={productsOf(many)} initialFilter="PriceChange" onHistory={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Hamısına bax \(9\)/ }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(9)
    await userEvent.click(chip(/Qiymət dəyişən/))

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6)
  })

  it('keeps a filtered row s whole quantity and price decomposition', () => {
    for (const filter of ['QuantityChange', 'PriceChange'] as const) {
      const { unmount } = render(list(filter, [mixedBags, driver()]))

      const row = screen.getByRole('button', { name: /Zibil paketi/ })
      const compact = within(row).getByText(/50 → 55 paket · Qiymət 32,00 ₼ → 32,13 ₼/)
      expect(visibleText(compact.nextElementSibling as HTMLElement), filter).toBe('Miqdar +160,00 ₼ · Qiymət +7,00 ₼')
      expect(within(row).getByText('Miqdar və qiymət'), filter).toBeInTheDocument()
      expect(within(row).getByText('+167,00 ₼'), filter).toHaveClass('text-red-700')
      unmount()
    }
  })

  it('hands its heading to the page, clear of the sticky header', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(
      <DriverList
        drivers={[driver()]}
        steady={[]}
        products={productsOf([driver()])}
        filter="All"
        onFilter={vi.fn()}
        headingRef={heading}
        onHistory={vi.fn()}
      />,
    )

    expect(heading.current).toHaveTextContent('Əsas dəyişikliklər')
    expect(heading.current).toHaveClass('scroll-mt-20')
  })
})
