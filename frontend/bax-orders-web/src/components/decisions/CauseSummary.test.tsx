import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type { DecisionCause, DecisionDecomposition, DecisionDriver } from '../../api/decisions'
import { CauseSummary } from './CauseSummary'

/**
 * "Niyə dəyişib?" has one duty above every other: whatever it shows must add up to the difference it claims
 * to explain. The rest of these hold it to saying nothing it cannot back up — no confident cause over a
 * missing price, no warning the arithmetic contradicts, no zero rows dressed up as findings — and to putting
 * the part that matters first.
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
    products: { comparedCount: 6, inCurrentOrderCount: 5, newCount: 1, noLongerOrderedCount: 1, listedCount: 5 },
    ...overrides,
  }
}

/** Only the fields the section reads are meaningful here; the rest are an ordinary priced product. */
function driver(productName: string, category: DecisionDriver['category'], amountImpact: number): DecisionDriver {
  return {
    variant: {
      productVariantId: productName.length,
      productId: productName.length,
      productCode: 'PRD-000001',
      productName,
      specificationValue: null,
      specificationUnitCode: null,
      specificationUnitName: null,
      specificationDescriptor: null,
      modelCode: null,
      orderUnitCode: 'PCS',
      orderUnitName: 'Ədəd',
    },
    analyticsKind: 'QuantityComparable',
    category,
    amountImpact,
    quantityImpact: null,
    priceImpact: null,
    currentQuantity: 20,
    baselineQuantity: 20,
    quantityPercentChange: 0,
    currentUnitPrice: null,
    baselineUnitPrice: 1,
    unitPricePercentChange: null,
    currentKnownAmount: null,
    baselineKnownAmount: 20,
    currentItemCount: 1,
    baselineItemCount: 1,
    missingPriceItemCount: category === 'UnattributedDueToMissingPrice' ? 1 : 0,
    priceNotRequiredItemCount: 0,
    priceIsComplete: category !== 'UnattributedDueToMissingPrice',
    supplyChanged: false,
    state: 'Unchanged',
  }
}

function renderSummary(
  value: DecisionDecomposition,
  basis: AnalyticsComparisonBasis = 'PreviousMonth',
  windowPeriods: string[] = ['2026-08-01'],
) {
  return render(<CauseSummary decomposition={value} basis={basis} windowPeriods={windowPeriods} />)
}

/** The rows as the reader meets them, each by its part's name. */
function rowLabels(): string[] {
  return within(screen.getByRole('list')).getAllByRole('listitem')
    .map((row) => row.querySelector('span.rounded-full')?.textContent ?? '')
}

function rowOf(label: string): HTMLElement {
  return screen.getByText(label).closest('li')!
}

function barOf(row: HTMLElement): HTMLElement {
  return row.querySelector<HTMLElement>('.h-full')!
}

/**
 * Fəvvarələr meydanı, Sentyabr 2026 against Keçən ay — the brief's figures. The shown parts add up to "Cəmi"
 * exactly, and one product with an unpriced line moved no known money, so the backend still reports the
 * explanation as incomplete and the "Qiymət yoxdur" part is 0,00 ₼.
 */
function fevvareler(): DecisionDecomposition {
  return decomposition({
    categories: [
      cause('NewOrders', 5133.27, 9),
      cause('QuantityChange', 648.98, 12),
      cause('PriceChange', 17, 1),
      cause('NoLongerOrdered', -8093.7, 7),
      cause('Services', -290, 1),
      cause('UnattributedDueToMissingPrice', 0, 1),
    ],
    totalAmountImpact: -2584.45,
    explanationIsComplete: false,
    unattributedVariantCount: 1,
    drivers: [driver('Nərgiz', 'UnattributedDueToMissingPrice', 0)],
  })
}

/** Heydər Əliyev, against Keçən ay — the brief's figures. */
function heyderAliyev(): DecisionDecomposition {
  return decomposition({
    categories: [
      cause('NewOrders', 29691.52, 14),
      cause('QuantityChange', -309.2, 6),
      cause('PriceChange', 30, 1),
      cause('NoLongerOrdered', -5259.62, 5),
      cause('Services', -300, 1),
      cause('UnattributedDueToMissingPrice', 0, 0),
    ],
    totalAmountImpact: 23852.7,
  })
}

describe('the causes', () => {
  it('names each one with the money it moved', () => {
    renderSummary(decomposition())

    expect(screen.getByText('Yeni məhsullar')).toBeInTheDocument()
    expect(screen.getByText('+50,00 ₼')).toBeInTheDocument()
    // Named as effects on money: the manat figure beside "Miqdar" is not a quantity.
    expect(screen.getByText('Miqdar təsiri')).toBeInTheDocument()
    expect(screen.getByText('+120,00 ₼')).toBeInTheDocument()
    expect(screen.getByText('Qiymət təsiri')).toBeInTheDocument()
    expect(screen.getByText('+39,00 ₼')).toBeInTheDocument()
    expect(screen.getByText('Bu ay yazılmayan məhsullar')).toBeInTheDocument()
    expect(screen.getByText('−20,00 ₼')).toBeInTheDocument()
  })

  /**
   * Owner decision 5.1: a row of the comparison is a "məhsul", never a "mövqe". Brief (Task 10): every count says
   * what it counts — a part's count is the products its money came from, "2 məhsuldan", so beside "Yeni
   * məhsullar" it no longer reads as a count of new products.
   */
  it('counts the products a part s money came from, as products', () => {
    renderSummary(decomposition())

    expect(screen.getByText('2 məhsuldan')).toBeInTheDocument()
    expect(screen.getAllByText('1 məhsuldan')).toHaveLength(3)
    expect(screen.queryByText(/^\d+ məhsul$/)).toBeNull()
    expect(screen.queryByText(/mövqe/)).toBeNull()
  })

  it('calls the unexplained part by the same words as the line it comes from', () => {
    renderSummary(decomposition({
      categories: [cause('QuantityChange', 120, 2), cause('UnattributedDueToMissingPrice', 30, 1)],
      explanationIsComplete: false,
    }))

    expect(screen.getByText('Qiymət yoxdur')).toBeInTheDocument()
    expect(screen.queryByText('Qiyməti olmayanlar')).toBeNull()
  })

  it('shows the total the causes add up to', () => {
    renderSummary(decomposition())

    // 50 + 120 + 39 − 20.
    expect(screen.getByText('+189,00 ₼')).toBeInTheDocument()
  })

  it('leaves out a cause that moved nothing rather than drawing a labelled zero', () => {
    renderSummary(decomposition())

    expect(screen.queryByText('Xidmətlər')).toBeNull()
    expect(screen.queryByText('Qiyməti bilinməyənlər')).toBeNull()
  })

  it('says so plainly when the month did not change at all', () => {
    renderSummary(decomposition({
      categories: [cause('NewOrders', 0, 0)],
      totalAmountImpact: 0,
    }))

    expect(screen.getByText('Keçən aya görə məbləğ dəyişməyib.')).toBeInTheDocument()
  })
})

describe('the largest part first', () => {
  it('leads Fəvvarələr with the products not ordered this month, marked as the main cause', () => {
    renderSummary(fevvareler())

    // By size, whichever way each moved: −8.093,70, +5.133,27, +648,98, −290,00, +17,00.
    expect(rowLabels()).toEqual([
      'Bu ay yazılmayan məhsullar',
      'Yeni məhsullar',
      'Miqdar təsiri',
      'Xidmətlər',
      'Qiymət təsiri',
    ])

    const first = rowOf('Bu ay yazılmayan məhsullar')
    expect(within(first).getByText('Əsas səbəb')).toBeInTheDocument()
    expect(first).toHaveAttribute('data-primary', 'true')
    expect(within(first).getByText('−8.093,70 ₼')).toBeInTheDocument()
    // Marked once, and only on the first row.
    expect(screen.getAllByText('Əsas səbəb')).toHaveLength(1)
    expect(rowOf('Yeni məhsullar')).not.toHaveAttribute('data-primary')
  })

  it('makes the main cause visibly larger than the rest', () => {
    renderSummary(fevvareler())

    const first = rowOf('Bu ay yazılmayan məhsullar')
    const other = rowOf('Yeni məhsullar')

    expect(first).toHaveClass('bg-slate-50', 'ring-1')
    expect(other).not.toHaveClass('bg-slate-50')
    expect(within(first).getByText('Bu ay yazılmayan məhsullar')).toHaveClass('text-sm', 'font-semibold')
    expect(within(other).getByText('Yeni məhsullar')).toHaveClass('text-xs', 'font-medium')
    expect(within(first).getByText('−8.093,70 ₼').parentElement).toHaveClass('text-lg', 'font-semibold')
    expect(within(other).getByText('+5.133,27 ₼').parentElement).toHaveClass('text-sm', 'font-medium')
    // The widths are a share of the largest part, so the first bar is full.
    expect(barOf(first).style.width).toBe('100%')
  })

  it('leads Heydər Əliyev with the new products', () => {
    renderSummary(heyderAliyev())

    // +29.691,52, −5.259,62, −309,20, −300,00, +30,00.
    expect(rowLabels()).toEqual([
      'Yeni məhsullar',
      'Bu ay yazılmayan məhsullar',
      'Miqdar təsiri',
      'Xidmətlər',
      'Qiymət təsiri',
    ])
    expect(within(rowOf('Yeni məhsullar')).getByText('Əsas səbəb')).toBeInTheDocument()
    expect(within(rowOf('Yeni məhsullar')).getByText('+29.691,52 ₼')).toBeInTheDocument()
    // Every figure as the API gave it, and the total they make.
    expect(screen.getByText('+23.852,70 ₼')).toBeInTheDocument()
  })

  /**
   * The dashboard card picks its "Əsas səbəb" the same way: the largest, ties by the backend's category value,
   * which puts "Qiymət yoxdur" before "Daxili təminat" — the reverse of the order the API lists them in.
   */
  it('breaks a tie in size the way the dashboard card does', () => {
    renderSummary(decomposition({
      categories: [
        cause('PriceChange', 40),
        cause('NoLongerOrdered', -300),
        cause('Services', 300),
        cause('InternalSupply', 500),
        cause('UnattributedDueToMissingPrice', -500),
      ],
      explanationIsComplete: false,
      drivers: [driver('Əlcək', 'UnattributedDueToMissingPrice', -500)],
    }))

    expect(rowLabels()).toEqual([
      'Qiymət yoxdur',
      'Daxili təminat',
      'Bu ay yazılmayan məhsullar',
      'Xidmətlər',
      'Qiymət təsiri',
    ])
    expect(within(rowOf('Qiymət yoxdur')).getByText('Əsas səbəb')).toBeInTheDocument()
  })

  it('breaks a tie between new products and a price change the same way', () => {
    renderSummary(decomposition({
      categories: [cause('PriceChange', 75), cause('NewOrders', -75)],
    }))

    expect(rowLabels()).toEqual(['Yeni məhsullar', 'Qiymət təsiri'])
  })
})

/** Owner decision 9.1: a cost that went up is red, one that went down green — a direction, never a verdict. */
describe('the colours', () => {
  it('colours every bar and every amount by the direction of the cost', () => {
    renderSummary(fevvareler())

    for (const [label, amount] of [
      ['Bu ay yazılmayan məhsullar', '−8.093,70 ₼'],
      ['Xidmətlər', '−290,00 ₼'],
    ]) {
      const row = rowOf(label)
      expect(barOf(row), label).toHaveClass('bg-emerald-500')
      expect(within(row).getByText(amount), label).toHaveClass('text-emerald-700')
    }

    for (const [label, amount] of [
      ['Yeni məhsullar', '+5.133,27 ₼'],
      ['Miqdar təsiri', '+648,98 ₼'],
      ['Qiymət təsiri', '+17,00 ₼'],
    ]) {
      const row = rowOf(label)
      expect(barOf(row), label).toHaveClass('bg-red-500')
      expect(within(row).getByText(amount), label).toHaveClass('text-red-700')
    }

    // "Cəmi" too: Fəvvarələr cost less.
    expect(screen.getByText('−2.584,45 ₼')).toHaveClass('text-emerald-700')
  })

  it('paints the Heydər Əliyev main cause red, and its total', () => {
    renderSummary(heyderAliyev())

    const first = rowOf('Yeni məhsullar')
    expect(barOf(first)).toHaveClass('bg-red-500')
    expect(within(first).getByText('+29.691,52 ₼')).toHaveClass('text-red-700')
    expect(screen.getByText('+23.852,70 ₼')).toHaveClass('text-red-700')
  })

  it('draws no bar grey and colours no part by its kind', () => {
    const { container } = renderSummary(fevvareler())

    // Every bar is red or green; the old per-kind fills (grey for "Bu ay yazılmayan") are gone.
    const bars = Array.from(container.querySelectorAll('li .h-full'))
    expect(bars).toHaveLength(5)
    for (const bar of bars) {
      expect(bar.className).toMatch(/bg-(red|emerald)-500/)
    }
    expect(container.querySelector('[class*="bg-slate-400"]')).toBeNull()
    expect(container.querySelector('[class*="sky-"], [class*="indigo-"], [class*="violet-"]')).toBeNull()
  })

  it('says in words what red and green mean', () => {
    renderSummary(fevvareler())

    expect(screen.getByText('Qırmızı — xərc artıb · Yaşıl — xərc azalıb')).toBeInTheDocument()
  })

  it('says each part s direction to a screen reader too, so the colour is never the only carrier', () => {
    renderSummary(fevvareler())

    const falling = within(rowOf('Bu ay yazılmayan məhsullar')).getByText('−8.093,70 ₼')
    expect(falling).toHaveTextContent('−8.093,70 ₼, xərc azalıb')
    expect(within(falling).getByText(/xərc azalıb/)).toHaveClass('sr-only')

    const rising = within(rowOf('Yeni məhsullar')).getByText('+5.133,27 ₼')
    expect(rising).toHaveTextContent('+5.133,27 ₼, xərc artıb')

    // Never a verdict.
    expect(document.body).not.toHaveTextContent(/yaxşı|pis/i)
  })

  it('keeps "Qiymət yoxdur" amber on its label only — its bar follows the direction like any other', () => {
    renderSummary(decomposition({
      categories: [cause('QuantityChange', 120, 2), cause('UnattributedDueToMissingPrice', -18.96, 1)],
      explanationIsComplete: false,
      drivers: [driver('Əlcək', 'UnattributedDueToMissingPrice', -18.96)],
    }))

    const row = rowOf('Qiymət yoxdur')
    expect(within(row).getByText('Qiymət yoxdur')).toHaveClass('bg-amber-50', 'text-amber-900')
    expect(barOf(row)).toHaveClass('bg-emerald-500')
    // Every other label is neutral: red and green say the direction, and nothing else competes with them.
    expect(within(rowOf('Miqdar təsiri')).getByText('Miqdar təsiri')).toHaveClass('bg-slate-100', 'text-slate-700')
  })
})

describe('the warning', () => {
  /**
   * The audit's contradiction: the parts add up to "Cəmi" to the qəpik, and the section still said the change
   * could not be explained. With nothing unexplained there is nothing to warn about.
   */
  it('is not shown when the parts add up and nothing is unexplained, whatever the flag says', () => {
    renderSummary(fevvareler())

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText(/izah edilə bilmir/)).toBeNull()
  })

  it('says how much is unexplained and on which products when it is', () => {
    renderSummary(decomposition({
      categories: [
        cause('NewOrders', 2900),
        cause('NoLongerOrdered', -2281.04),
        cause('UnattributedDueToMissingPrice', -18.96, 2),
      ],
      explanationIsComplete: false,
      unattributedVariantCount: 2,
      drivers: [
        driver('Rosmarinus', 'NewOrders', 2900),
        driver('Zibil paketi', 'NoLongerOrdered', -2281.04),
        driver('Əlcək', 'UnattributedDueToMissingPrice', -12),
        driver('Sabun', 'UnattributedDueToMissingPrice', -6.96),
      ],
    }))

    // Only the products the part is made of, largest money first.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dəyişikliyin −18,96 ₼ hissəsi izah edilə bilmir, çünki bu məhsulların bəzi sətirlərində qiymət yoxdur: Əlcək, Sabun.',
    )
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('names three products and counts the rest, each product once', () => {
    renderSummary(decomposition({
      categories: [cause('QuantityChange', 120, 2), cause('UnattributedDueToMissingPrice', 64, 5)],
      explanationIsComplete: false,
      unattributedVariantCount: 5,
      drivers: [
        driver('Əlcək', 'UnattributedDueToMissingPrice', 30),
        // A second variant of the same product: still one product to the reader.
        driver('Əlcək', 'UnattributedDueToMissingPrice', 14),
        driver('Zibil paketi', 'UnattributedDueToMissingPrice', 10),
        driver('Rosmarinus', 'UnattributedDueToMissingPrice', 6),
        driver('Sabun', 'UnattributedDueToMissingPrice', 4),
      ],
    }))

    expect(screen.getByRole('status')).toHaveTextContent(
      ': Əlcək, Zibil paketi, Rosmarinus və daha 1 məhsul.',
    )
  })

  it('says nothing of the sort when every price is known', () => {
    renderSummary(decomposition())

    expect(screen.queryByRole('status')).toBeNull()
  })
})

/** Task 2: supply from the company's own store is how material arrives, never a gap in the records. */
describe('internal supply', () => {
  it('is its own part, says when products changed supply form, and is never a warning or amber', () => {
    renderSummary(decomposition({
      categories: [cause('NewOrders', 50), cause('InternalSupply', 600, 2)],
      internalSupplyVariantCount: 2,
      supplyChangedVariantCount: 1,
    }))

    const row = rowOf('Daxili təminat')
    expect(within(row).getByText('Təchizat forması dəyişib: alınan / şirkətdaxili')).toBeInTheDocument()
    // Task 10: the products this part's money came from.
    expect(within(row).getByText('2 məhsuldan')).toBeInTheDocument()
    expect(row.querySelector('[class*="amber"]')).toBeNull()
    // Sorted and coloured like any other part.
    expect(rowLabels()[0]).toBe('Daxili təminat')
    expect(barOf(row)).toHaveClass('bg-red-500')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('says nothing about a supply change when there was none', () => {
    renderSummary(decomposition({
      categories: [cause('InternalSupply', 600, 2)],
      internalSupplyVariantCount: 2,
    }))

    expect(screen.queryByText(/Təchizat forması dəyişib/)).toBeNull()
  })
})

describe('the chosen basis', () => {
  it('names the basis the parts are against beside the heading', () => {
    renderSummary(fevvareler(), 'Previous6MonthAverage', ['2026-03-01', '2026-08-01'])

    expect(screen.getByText('Son 6 ayın ortalamasına görə')).toBeInTheDocument()
  })

  it('says the month did not change against that basis, not against last month', () => {
    renderSummary(
      decomposition({ categories: [cause('NewOrders', 0, 0)], totalAmountImpact: 0 }),
      'Previous3MonthAverage',
      ['2026-06-01', '2026-07-01', '2026-08-01'],
    )

    expect(screen.getByText('Son 3 ayın ortalamasına görə məbləğ dəyişməyib.')).toBeInTheDocument()
    expect(screen.queryByText(/Keçən aya görə/)).toBeNull()
  })
})
