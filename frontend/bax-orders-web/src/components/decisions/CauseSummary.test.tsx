import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type {
  DecisionCause,
  DecisionDecomposition,
  DecisionDriver,
  DecisionVariantSide,
  DecisionVariantTransition,
} from '../../api/decisions'
import { findOldTerms } from '../../test/oldTerms'
import { CauseSummary } from './CauseSummary'
import { causeListCountNote, type DriverFilter } from './labels'

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
    products: {
      comparedCount: 6,
      inCurrentOrderCount: 5,
      newCount: 1,
      noLongerOrderedCount: 1,
      listedCount: 5,
      increasedCount: 1,
      decreasedCount: 0,
      serviceCount: 0,
    },
    steady: [],
    variantTransitions: [],
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
  selected: DriverFilter = 'All',
  onSelect: (filter: DriverFilter) => void = vi.fn(),
) {
  return render(
    <CauseSummary
      decomposition={value}
      basis={basis}
      windowPeriods={windowPeriods}
      selected={selected}
      onSelect={onSelect}
    />,
  )
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

/**
 * Task 13c, owner decision 13.1a: an approved variant transition is one "Variant dəyişib" line — "Sabun elano —
 * variant dəyişib: adi → lavanda ətirli" — under its own part, shown even at 0,00 ₼, and never the main cause at 0,00.
 */
describe('an approved variant transition', () => {
  function side(productName: string, variantLabel: string | null, id: number): DecisionVariantSide {
    return { productVariantId: id, productId: id * 10, productName, variantLabel }
  }

  function transition(
    from: DecisionVariantSide[],
    to: DecisionVariantSide[],
    amountImpact: number,
    baseProductName = 'Sabun elano',
  ): DecisionVariantTransition {
    return {
      baseProductId: 100 + baseProductName.length,
      baseProductName,
      from,
      to,
      amountImpact,
      baselineKnownAmount: 750,
      currentKnownAmount: 750 + amountImpact,
    }
  }

  const sabun = side('Sabun elano', null, 1)
  const lavanda = side('Sabun elano lavanda ətirli', 'lavanda ətirli', 2)

  /** Heydər Əliyev, Sentyabr, after the approval — acceptance 3's figures. */
  function heyderAliyevAfterApproval(): DecisionDecomposition {
    return decomposition({
      categories: [
        cause('NewOrders', 0, 0),
        cause('QuantityChange', 0, 0),
        cause('PriceChange', 0, 0),
        cause('NoLongerOrdered', 0, 0),
        cause('VariantChange', 0, 2),
        cause('Services', 0, 0),
        cause('InternalSupply', 0, 0),
        cause('UnattributedDueToMissingPrice', 0, 0),
      ],
      totalAmountImpact: 0,
      variantTransitions: [transition([sabun], [lavanda], 0)],
    })
  }

  it('shows Heydər Əliyev s line at 0,00 ₼ under the sentence that nothing changed, and never as the main cause', () => {
    renderSummary(heyderAliyevAfterApproval())

    expect(screen.getByText('Keçən aya görə məbləğ dəyişməyib.')).toBeInTheDocument()
    expect(rowLabels()).toEqual(['Variant dəyişib'])

    const row = rowOf('Variant dəyişib')
    const line = row.querySelector<HTMLElement>('[data-variant-transition]')!
    expect(within(line).getByText('Sabun elano — variant dəyişib: adi → lavanda ətirli')).toBeInTheDocument()
    expect(within(line).getByText('0,00 ₼')).toBeInTheDocument()
    expect(within(row).getByText('2 məhsuldan')).toBeInTheDocument()

    expect(screen.queryByText('Əsas səbəb')).toBeNull()
    expect(row).not.toHaveAttribute('data-primary')
    // "Yeni məhsullar" and "Bu ay yazılmayan" are 750,00 ₼ smaller — here, nothing — so they are not listed.
    expect(screen.queryByText('Yeni məhsullar')).toBeNull()
    expect(screen.queryByText('Bu ay yazılmayan məhsullar')).toBeNull()
  })

  it('makes a transition that moved money the main cause, with its line under it', () => {
    renderSummary(decomposition({
      categories: [
        cause('NewOrders', 0, 0),
        cause('PriceChange', 40, 1),
        cause('NoLongerOrdered', 0, 0),
        cause('VariantChange', 125, 2),
      ],
      totalAmountImpact: 165,
      variantTransitions: [transition([sabun], [lavanda], 125)],
    }))

    expect(rowLabels()).toEqual(['Variant dəyişib', 'Qiymət təsiri'])

    const first = rowOf('Variant dəyişib')
    expect(within(first).getByText('Əsas səbəb')).toBeInTheDocument()
    expect(first).toHaveAttribute('data-primary', 'true')
    const line = first.querySelector<HTMLElement>('[data-variant-transition]')!
    expect(within(line).getByText('Sabun elano — variant dəyişib: adi → lavanda ətirli')).toBeInTheDocument()
    // 9.1: the cost went up, so red, and said in words to a screen reader.
    expect(within(line).getByText('+125,00 ₼')).toHaveClass('text-red-700')
    expect(within(line).getByText('+125,00 ₼')).toHaveTextContent('+125,00 ₼, xərc artıb')
    expect(barOf(first)).toHaveClass('bg-red-500')
    // The legend is back once something moved.
    expect(screen.getByText('Qırmızı — xərc artıb · Yaşıl — xərc azalıb')).toBeInTheDocument()
  })

  it('loses a tie in size to every other part, as the dashboard card does', () => {
    renderSummary(decomposition({
      categories: [cause('NewOrders', 125, 1), cause('VariantChange', -125, 2)],
      totalAmountImpact: 0,
      variantTransitions: [transition([sabun], [lavanda], -125)],
    }))

    expect(rowLabels()).toEqual(['Yeni məhsullar', 'Variant dəyişib'])
  })

  it('joins several labels on one side, the base first and each once', () => {
    renderSummary(decomposition({
      categories: [cause('VariantChange', 125, 3)],
      totalAmountImpact: 125,
      variantTransitions: [
        transition([sabun], [lavanda, side('Sabun elano nanə', 'nanə', 3)], 125),
        transition([side('Qab yuma limon', 'limon', 5)], [side('Qab yuma', null, 4), side('Qab yuma nanə', 'nanə', 6)], 0, 'Qab yuma'),
      ],
    }))

    const lines = Array.from(rowOf('Variant dəyişib').querySelectorAll('[data-variant-transition]'))
      .map((line) => line.firstElementChild?.textContent)
    expect(lines).toEqual([
      'Sabun elano — variant dəyişib: adi → lavanda ətirli, nanə',
      'Qab yuma — variant dəyişib: limon → adi, nanə',
    ])
  })

  it('renders exactly as before when there is no transition', () => {
    const { container } = renderSummary(decomposition())

    expect(container.querySelector('[data-variant-transition]')).toBeNull()
    expect(screen.queryByText('Variant dəyişib')).toBeNull()
  })

  it('uses no retired word', () => {
    const { container } = renderSummary(heyderAliyevAfterApproval())

    expect(findOldTerms(container)).toEqual([])
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

/**
 * Task 18 (18.1, 18.2): a reason is the way to the products behind it. The five reasons with a chip of their own
 * select it, and a second press clears it; the three without one look and behave exactly as before.
 */
describe('the way from a reason to its products', () => {
  const nbsp = String.fromCharCode(0xa0)

  /** A listed product, an ordinary priced one unless told otherwise. Each has its own id. */
  function product(id: number, overrides: Partial<DecisionDriver> = {}): DecisionDriver {
    const base = driver(`Mal ${id}`, 'QuantityChange', 0)
    return { ...base, variant: { ...base.variant, productVariantId: id, productId: id }, ...overrides }
  }

  function times(count: number, from: number, overrides: Partial<DecisionDriver>): DecisionDriver[] {
    return Array.from({ length: count }, (_, index) => product(from + index, overrides))
  }

  /**
   * Heydər Əliyev, against Keçən ay — the brief's figures, with the products behind each part: under every chip as
   * many products as the part counts, so no sentence is owed.
   */
  function heyderAliyevWithProducts(): DecisionDecomposition {
    return {
      ...heyderAliyev(),
      drivers: [
        ...times(14, 100, { category: 'NewOrders', amountImpact: 2000, state: 'New' }),
        ...times(6, 200, { category: 'QuantityChange', amountImpact: -50, quantityImpact: -50, state: 'Decreased' }),
        product(300, { category: 'PriceChange', amountImpact: 30, priceImpact: 30, state: 'Unchanged' }),
        ...times(5, 400, { category: 'NoLongerOrdered', amountImpact: -1000, state: 'NoLongerOrdered' }),
        product(500, { category: 'Services', analyticsKind: 'AmountOrientedService', amountImpact: -300, state: 'NotComparable' }),
      ],
    }
  }

  function reasonButton(label: string): HTMLElement {
    return screen.getByRole('button', { name: new RegExp(`^${label}, `) })
  }

  /** Every figure a row shows, in the order the rows are shown: label, amount, count, bar. */
  function figures(): string[][] {
    return within(screen.getByRole('list')).getAllByRole('listitem').map((row) => [
      row.querySelector('span.rounded-full')?.textContent ?? '',
      row.querySelector('p.whitespace-nowrap')?.textContent ?? '',
      row.querySelector('span.text-slate-400')?.textContent ?? '',
      row.querySelector<HTMLElement>('.h-full')?.style.width ?? '',
    ])
  }

  it('makes a reason with products under its chip one button, named by its label and its amount', () => {
    renderSummary(heyderAliyevWithProducts())

    const reason = screen.getByRole('button', { name: `Yeni məhsullar, +29.691,52${nbsp}₼` })
    expect(reason).toHaveAttribute('aria-pressed', 'false')
    // The pill is still the pill, with its own words and colour, now inside the button.
    expect(within(reason).getByText('Yeni məhsullar')).toHaveClass('rounded-full', 'bg-slate-100', 'text-slate-700')
    expect(rowOf('Yeni məhsullar')).toContainElement(reason)

    for (const name of [
      `Bu ay yazılmayan məhsullar, −5.259,62${nbsp}₼`,
      `Miqdar təsiri, −309,20${nbsp}₼`,
      `Qiymət təsiri, +30,00${nbsp}₼`,
    ]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('stretches the button over the whole row, with the ⓘ above it, and marks the row as a target', () => {
    renderSummary(heyderAliyevWithProducts())

    const row = rowOf('Yeni məhsullar')
    // The row is where the button's layer is placed; the layer covers it.
    expect(row).toHaveClass('relative', 'cursor-pointer', 'hover:bg-slate-100')
    expect(reasonButton('Yeni məhsullar')).toHaveClass('before:absolute', 'before:inset-0', 'cursor-pointer')
    // The keyboard's outline is drawn on that layer, around the row; the button shows none of its own.
    expect(reasonButton('Yeni məhsullar')).toHaveClass('focus-visible:outline-hidden', 'focus-visible:before:outline-2')
    // The ⓘ is positioned after the layer, so it is above it — and outside the button. Its wrapper sets no z-index:
    // one would cap the note's own z-[60] beneath the sticky header and the phone's decision bar (both z-20).
    const hint = within(row).getByRole('button', { name: 'Yeni məhsullar nədir?' })
    const wrapper = hint.parentElement!.parentElement!
    expect(wrapper.tagName).toBe('SPAN')
    expect(wrapper.className).toBe('relative inline-flex')
    expect(wrapper.parentElement?.tagName).toBe('P')
    expect(reasonButton('Yeni məhsullar')).not.toContainElement(hint)

    // An ordinary row's hover is one step darker than its white; the main cause's than its slate-50.
    expect(rowOf('Bu ay yazılmayan məhsullar')).toHaveClass('relative', 'cursor-pointer', 'hover:bg-slate-50', 'rounded-md')
    expect(rowOf('Bu ay yazılmayan məhsullar')).not.toHaveClass('bg-slate-50')
  })

  it('leaves "Xidmətlər" as it was: no button but its ⓘ, no pointer, no hover, no layer', () => {
    renderSummary(heyderAliyevWithProducts())

    const row = rowOf('Xidmətlər')
    expect(within(row).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['Xidmətlər nədir?'])
    expect(row.className).toBe('')
    // The ⓘ keeps its own hover, as it has everywhere; nothing else in the row gains one.
    expect(row.querySelector('[class*="before:"], .cursor-pointer')).toBeNull()
  })

  it('leaves "Daxili təminat" and "Variant dəyişib" inert too, even with new products behind them', async () => {
    const onSelect = vi.fn()
    renderSummary(decomposition({
      categories: [cause('InternalSupply', 600, 1), cause('VariantChange', 125, 2)],
      totalAmountImpact: 725,
      drivers: [
        product(1, { category: 'InternalSupply', priceNotRequiredItemCount: 1, state: 'New' }),
        product(2, { category: 'VariantChange', amountImpact: 125, state: 'New' }),
        product(3, { category: 'VariantChange', state: 'NoLongerOrdered' }),
      ],
      variantTransitions: [{
        baseProductId: 9,
        baseProductName: 'Sabun elano',
        from: [{ productVariantId: 3, productId: 3, productName: 'Sabun elano', variantLabel: null }],
        to: [{ productVariantId: 2, productId: 2, productName: 'Sabun elano lavanda ətirli', variantLabel: 'lavanda ətirli' }],
        amountImpact: 125,
        baselineKnownAmount: 750,
        currentKnownAmount: 875,
      }],
    }), 'PreviousMonth', ['2026-08-01'], 'All', onSelect)

    for (const label of ['Daxili təminat', 'Variant dəyişib']) {
      const row = rowOf(label)
      expect(within(row).getAllByRole('button'), label).toHaveLength(1)
      expect(row.className, label).not.toMatch(/cursor-pointer|hover:|relative/)
      await userEvent.click(row)
      await userEvent.click(within(row).getByText(label))
    }

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /, [+−]/ })).toBeNull()
  })

  it('leaves a reason inert when its chip would list nothing', () => {
    // The default decomposition sends no products at all.
    renderSummary(decomposition())

    expect(within(rowOf('Yeni məhsullar')).getAllByRole('button')).toHaveLength(1)
    expect(rowOf('Yeni məhsullar').className).toBe('')
    expect(screen.queryByRole('button', { name: /^Yeni məhsullar, / })).toBeNull()
  })

  it('selects the reason s chip, and clears it when it is the chip already on', async () => {
    const onSelect = vi.fn()
    const { unmount } = renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'All', onSelect)

    await userEvent.click(reasonButton('Yeni məhsullar'))
    await userEvent.click(reasonButton('Miqdar təsiri'))
    await userEvent.click(reasonButton('Qiymət təsiri'))
    await userEvent.click(reasonButton('Bu ay yazılmayan məhsullar'))
    expect(onSelect.mock.calls).toEqual([['New'], ['QuantityChange'], ['PriceChange'], ['NoLongerOrdered']])
    unmount()

    onSelect.mockClear()
    renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'New', onSelect)
    expect(reasonButton('Yeni məhsullar')).toHaveAttribute('aria-pressed', 'true')
    expect(reasonButton('Miqdar təsiri')).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(reasonButton('Yeni məhsullar'))
    expect(onSelect).toHaveBeenCalledWith('All')
    // Another reason still selects its own chip rather than clearing.
    await userEvent.click(reasonButton('Qiymət təsiri'))
    expect(onSelect).toHaveBeenLastCalledWith('PriceChange')
  })

  it('opens "Qiymət yoxdur" on its chip, amber pill and all', async () => {
    const onSelect = vi.fn()
    renderSummary(decomposition({
      categories: [cause('QuantityChange', 120, 1), cause('UnattributedDueToMissingPrice', -18.96, 1)],
      explanationIsComplete: false,
      drivers: [
        product(1, { category: 'QuantityChange', amountImpact: 120, quantityImpact: 120 }),
        driver('Əlcək', 'UnattributedDueToMissingPrice', -18.96),
      ],
    }), 'PreviousMonth', ['2026-08-01'], 'All', onSelect)

    const reason = screen.getByRole('button', { name: `Qiymət yoxdur, −18,96${nbsp}₼` })
    expect(within(reason).getByText('Qiymət yoxdur')).toHaveClass('bg-amber-50', 'text-amber-900')
    await userEvent.click(reason)
    expect(onSelect).toHaveBeenCalledWith('MissingPrice')
  })

  it('outlines the selected row, and keeps the main cause s ring as it is', () => {
    renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'New')

    const selected = rowOf('Yeni məhsullar')
    expect(selected).toHaveClass('outline-2', 'outline-offset-2', 'outline-slate-900')
    expect(selected).toHaveClass('bg-slate-50', 'ring-1', 'ring-inset', 'ring-slate-200', 'p-2')
    expect(rowOf('Miqdar təsiri')).not.toHaveClass('outline-2')
    // The pill keeps its colour: the outline says which is on, never a colour that could read as a direction.
    expect(within(selected).getByText('Yeni məhsullar')).toHaveClass('bg-slate-100', 'text-slate-700')
  })

  it('opens the ⓘ inside a reason without selecting it', async () => {
    const onSelect = vi.fn()
    renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'All', onSelect)

    const hint = within(rowOf('Yeni məhsullar')).getByRole('button', { name: 'Yeni məhsullar nədir?' })
    await userEvent.click(hint)

    expect(hint).toHaveAttribute('aria-expanded', 'true')
    expect(within(rowOf('Yeni məhsullar')).getByRole('note')).toBeVisible()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reaches a reason by Tab and presses it with Enter and Space', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'All', onSelect)

    await user.tab()
    expect(reasonButton('Yeni məhsullar')).toHaveFocus()
    await user.keyboard('{Enter}')
    // Then its ⓘ, then the next reason.
    await user.tab()
    expect(within(rowOf('Yeni məhsullar')).getByRole('button', { name: 'Yeni məhsullar nədir?' })).toHaveFocus()
    await user.tab()
    expect(reasonButton('Bu ay yazılmayan məhsullar')).toHaveFocus()
    await user.keyboard(' ')

    expect(onSelect.mock.calls).toEqual([['New'], ['NoLongerOrdered']])
  })

  it('does not make an inert row a stop of its own; its ⓘ still is one', async () => {
    const user = userEvent.setup()
    renderSummary(heyderAliyevWithProducts())

    // Yeni, ⓘ, Bu ay yazılmayan, ⓘ, Miqdar, ⓘ — and then Xidmətlər's ⓘ, never the row itself.
    for (let step = 0; step < 7; step++) {
      await user.tab()
    }
    expect(within(rowOf('Xidmətlər')).getByRole('button', { name: 'Xidmətlər nədir?' })).toHaveFocus()
  })

  /** Brief acceptance 5: choosing a reason moves no figure. The Heydər Əliyev figures, with a row selected and without. */
  it('shows the same rows, order, caption, amounts, counts and bars whichever reason is selected', () => {
    const expected = [
      ['Yeni məhsullar', '+29.691,52 ₼, xərc artıb', '14 məhsuldan', '100%'],
      ['Bu ay yazılmayan məhsullar', '−5.259,62 ₼, xərc azalıb', '5 məhsuldan', `${(5259.62 / 29691.52) * 100}%`],
      ['Miqdar təsiri', '−309,20 ₼, xərc azalıb', '6 məhsuldan', `${(309.2 / 29691.52) * 100}%`],
      ['Xidmətlər', '−300,00 ₼, xərc azalıb', '1 məhsuldan', `${(300 / 29691.52) * 100}%`],
      ['Qiymət təsiri', '+30,00 ₼, xərc artıb', '1 məhsuldan', `${(30 / 29691.52) * 100}%`],
    ].map((row) => row.map((value) => value.replace(/ ₼/, `${nbsp}₼`)))

    for (const selected of ['All', 'New', 'QuantityChange'] as const) {
      const { unmount } = renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], selected)

      expect(figures(), selected).toEqual(expected)
      expect(screen.getAllByText('Əsas səbəb'), selected).toHaveLength(1)
      expect(within(rowOf('Yeni məhsullar')).getByText('Əsas səbəb'), selected).toBeInTheDocument()
      expect(screen.getByText('+23.852,70 ₼'), selected).toBeInTheDocument()
      unmount()
    }
  })

  it('names no retired word, and puts the ₼ of its names after a space that cannot break', () => {
    const { container } = renderSummary(heyderAliyevWithProducts(), 'PreviousMonth', ['2026-08-01'], 'New')

    expect(findOldTerms(container)).toEqual([])
  })
})

/**
 * Task 18 (18.3): "58 məhsuldan" beside the part, "Yeni məhsullar 60" on the chip. Both are right — the part counts
 * the products its money is filed under, the chip every new product — so neither changes, and a sentence under the
 * part says what the list counts.
 */
describe('two counts under one label', () => {
  function product(id: number, overrides: Partial<DecisionDriver> = {}): DecisionDriver {
    const base = driver(`Mal ${id}`, 'QuantityChange', 0)
    return { ...base, variant: { ...base.variant, productVariantId: id, productId: id }, ...overrides }
  }

  /** Heydər Əliyev's shape: 58 new products filed under "Yeni məhsullar", one from the store and one owing a price. */
  function heyderAliyevSixty(): DecisionDecomposition {
    return decomposition({
      categories: [
        cause('NewOrders', 29691.52, 58),
        cause('NoLongerOrdered', -5259.62, 5),
        cause('InternalSupply', 0, 1),
        cause('UnattributedDueToMissingPrice', 0, 1),
      ],
      totalAmountImpact: 24431.9,
      drivers: [
        ...Array.from({ length: 58 }, (_, index) => product(100 + index, { category: 'NewOrders', amountImpact: 500, state: 'New' })),
        product(200, { category: 'InternalSupply', priceNotRequiredItemCount: 1, state: 'New' }),
        product(201, { category: 'UnattributedDueToMissingPrice', missingPriceItemCount: 1, priceIsComplete: false, state: 'New' }),
        ...Array.from({ length: 5 }, (_, index) => product(300 + index, { category: 'NoLongerOrdered', amountImpact: -1000, state: 'NoLongerOrdered' })),
      ],
    })
  }

  it('keeps "58 məhsuldan" and says under it what the list of 60 counts, naming the parts the other two are in', () => {
    renderSummary(heyderAliyevSixty())

    const row = rowOf('Yeni məhsullar')
    expect(within(row).getByText('58 məhsuldan')).toBeInTheDocument()
    const note = within(row).getByText(
      '«Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» və «Qiymət yoxdur» hissələrində olanları da.',
    )
    expect(note.tagName).toBe('P')
    expect(note).toHaveClass('mt-1', 'text-xs', 'text-slate-500')
    // Under the label and the amount, before the bar.
    expect(note.previousElementSibling).toHaveTextContent('+29.691,52 ₼')
    expect(note.nextElementSibling?.querySelector('.h-full')).not.toBeNull()
    // The figures are the API's, as they were.
    expect(within(row).getByText('+29.691,52 ₼')).toBeInTheDocument()
  })

  it('adds nothing where the part and its list count the same products', () => {
    renderSummary(heyderAliyevSixty())

    // "Bu ay yazılmayan məhsullar": 5 and 5.
    expect(within(rowOf('Bu ay yazılmayan məhsullar')).getByText('5 məhsuldan')).toBeInTheDocument()
    expect(within(rowOf('Bu ay yazılmayan məhsullar')).queryByText(/siyahısı/)).toBeNull()
    expect(screen.getAllByText(/siyahısı \d+ məhsulu sayır/)).toHaveLength(1)
  })

  it('names one part in the singular', () => {
    renderSummary(decomposition({
      categories: [cause('NoLongerOrdered', -750, 1), cause('VariantChange', 0, 2)],
      totalAmountImpact: -750,
      drivers: [
        product(1, { category: 'NoLongerOrdered', amountImpact: -750, state: 'NoLongerOrdered' }),
        product(2, { category: 'VariantChange', state: 'NoLongerOrdered' }),
        product(3, { category: 'VariantChange', state: 'New' }),
      ],
    }))

    expect(within(rowOf('Bu ay yazılmayan məhsullar')).getByText(
      '«Bu ay yazılmayan məhsullar» siyahısı 2 məhsulu sayır — məbləği «Variant dəyişib» hissəsində olanları da.',
    )).toBeInTheDocument()
  })

  /**
   * A chip that selects by an effect names no part: a product that moved both ways has money in two parts, and
   * naming "its" part would not be true.
   */
  it('names no part under a reason whose chip goes by an effect', () => {
    renderSummary(decomposition({
      categories: [cause('QuantityChange', 120, 3)],
      totalAmountImpact: 120,
      drivers: [
        product(1, { category: 'QuantityChange', amountImpact: 70, quantityImpact: 50, priceImpact: 20 }),
        product(2, { category: 'PriceChange', amountImpact: 50, quantityImpact: 70, priceImpact: -20 }),
      ],
    }))

    expect(within(rowOf('Miqdar təsiri')).getByText('«Miqdar dəyişən» siyahısı 2 məhsulu sayır.')).toBeInTheDocument()
    expect(within(rowOf('Miqdar təsiri')).getByText('3 məhsuldan')).toBeInTheDocument()
  })

  it('writes each form of the sentence, and a count in the thousands the way every count is written', () => {
    expect(causeListCountNote('New', 60, [])).toBe('«Yeni məhsullar» siyahısı 60 məhsulu sayır.')
    expect(causeListCountNote('New', 60, ['InternalSupply']))
      .toBe('«Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» hissəsində olanları da.')
    expect(causeListCountNote('New', 60, ['InternalSupply', 'UnattributedDueToMissingPrice']))
      .toBe('«Yeni məhsullar» siyahısı 60 məhsulu sayır — məbləği «Daxili təminat» və «Qiymət yoxdur» hissələrində olanları da.')
    expect(causeListCountNote('NoLongerOrdered', 3, ['VariantChange', 'InternalSupply', 'UnattributedDueToMissingPrice']))
      .toBe('«Bu ay yazılmayan məhsullar» siyahısı 3 məhsulu sayır — məbləği «Variant dəyişib», «Daxili təminat» və '
        + '«Qiymət yoxdur» hissələrində olanları da.')
    expect(causeListCountNote('QuantityChange', 1234, [])).toBe('«Miqdar dəyişən» siyahısı 1.234 məhsulu sayır.')
  })

  it('uses no retired word', () => {
    const { container } = renderSummary(heyderAliyevSixty())

    expect(findOldTerms(container)).toEqual([])
  })
})
