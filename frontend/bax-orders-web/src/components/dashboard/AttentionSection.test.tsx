import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type {
  DashboardAmount,
  DashboardAttention,
  DashboardCause,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import { comparedOnly } from '../../test/dashboardFixtures'
import { findOldTerms } from '../../test/oldTerms'
import { AttentionSection } from './AttentionSection'

/**
 * The attention card's "Əsas səbəb", with the product behind it (Task 07).
 *
 * The owner wants to say "this rise is the tractor" without opening the order. So the card names the product
 * that did most of the main cause, what it moved, and its share of every movement that way (7.1, 7.1a) — under
 * the main cause, above the two causes that follow it, and in the colour of its direction (9.1).
 */

function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 1000,
    itemCount: 10,
    knownPriceItemCount: 10,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    isComplete: true,
    ...overrides,
  }
}

function cause(category: DashboardCause['category'], value: number, variantCount = 1): DashboardCause {
  return { category, amount: value, variantCount }
}

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Obyekt',
    hasCurrentRequest: true,
    currentRequestId: 154,
    currentVersion: 1,
    currentStatus: 'Approved',
    current: amount(),
    currentPriceCoverage: 'Complete',
    expectedBaselinePeriodCount: 1,
    availableBaselinePeriodCount: 1,
    missingBaselinePeriods: [],
    baselinePeriods: [],
    baseline: amount({ knownAmount: 800 }),
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    comparisonAvailability: 'Available',
    comparisonAvailable: true,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 0,
    notComparableVariantCount: 0,
    quantityComparableVariantCount: 0,
    amountOrientedServiceCount: 0,
    comparedVariantCount: 0,
    deepLinkPeriod: '2026-09-01',
    deepLinkBasis: 'PreviousMonth',
    deepLinkCustomStart: null,
    deepLinkCustomEnd: null,
    causes: [cause('QuantityChange', 200)],
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    primaryCauseProduct: null,
    explanationIsComplete: true,
    unattributedAmount: 0,
    supplyChangedVariantCount: 0,
    ...overrides,
  }
}

/** Heydər Əliyev Mərkəzi, Sentyabr 2026 against Keçən ay: +23.852,70 ₼, most of it one tractor. */
function heyderAliyev(): LocationDashboardRow {
  return row({
    locationId: 1,
    locationName: 'Heydər Əliyev Mərkəzi',
    current: amount({ knownAmount: 49_000 }),
    baseline: amount({ knownAmount: 25_147.3 }),
    knownAmountDelta: 23_852.7,
    knownAmountPercentChange: 94.85,
    causes: [
      cause('NewOrders', 29_691.52, 3),
      cause('PriceChange', 100),
      cause('NoLongerOrdered', -5_629.62),
      cause('QuantityChange', -309.2),
    ],
    primaryCause: 'NewOrders',
    primaryCauseAmount: 29_691.52,
    primaryCauseProduct: {
      productVariantId: 501,
      productName: 'Traktor qazonbiçən RT-6127.1 ZL',
      amount: 21_900,
      // Every rise: the new products and the price rise.
      sameDirectionAmount: 29_791.52,
    },
  })
}

/** Fəvvarələr meydanı, same month and basis: −2.584,45 ₼, the summer shoes the largest thing not ordered. */
function fevvareler(): LocationDashboardRow {
  return row({
    locationId: 2,
    locationName: 'Fəvvarələr meydanı',
    current: amount({ knownAmount: 5_000 }),
    baseline: amount({ knownAmount: 7_584.45 }),
    knownAmountDelta: -2_584.45,
    knownAmountPercentChange: -34.08,
    causes: [
      cause('NewOrders', 6_009.25),
      cause('NoLongerOrdered', -8_093.7, 5),
      cause('QuantityChange', -500),
    ],
    primaryCause: 'NoLongerOrdered',
    primaryCauseAmount: -8_093.7,
    primaryCauseProduct: {
      productVariantId: 502,
      productName: 'Yay ayaqqabısı',
      amount: -1_988,
      // Every fall: the products not ordered this month and the quantity fall.
      sameDirectionAmount: -8_593.7,
    },
  })
}

function summary(): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 2,
    locationsWithCurrentRequest: 2,
    locationsWithoutCurrentRequest: 0,
    currentRequestCount: 2,
    current: amount(),
    comparedCurrent: amount(),
    baseline: amount(),
    knownAmountDelta: 0,
    knownAmountPercentChange: 0,
    partition: comparedOnly(2),
    locationsWithMissingPrices: 0,
    locationsWithCompleteHistory: 2,
    locationsWithPartialHistory: 0,
    locationsWithNoBaselineHistory: 0,
    locationsWithComparison: 2,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 0,
    amountOrientedServiceCount: 0,
  }
}

function renderCards(...locations: LocationDashboardRow[]) {
  const attention: DashboardAttention[] = locations.map((location) => ({
    reason: (location.knownAmountDelta ?? 0) < 0 ? 'LargestDecrease' : 'LargestIncrease',
    location,
  }))

  return render(
    <MemoryRouter>
      <AttentionSection
        attention={attention}
        summary={summary()}
        selection={{ basis: 'PreviousMonth', from: null, to: null }}
      />
    </MemoryRouter>,
  )
}

function card(locationName: string): HTMLElement {
  return screen.getByText(locationName).closest('article')!
}

/** The line under "Əsas səbəb" that names the product. */
function productLine(article: HTMLElement, productName: string): HTMLElement {
  return within(article).getByText(new RegExp(productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).closest('p')!
}

/** The share's whole percent, read off the line as a reader would. */
function shareOf(line: HTMLElement, movement: 'artımların' | 'azalmaların'): number {
  const match = new RegExp(`\\(${movement} (\\d+)%-i\\)`).exec(line.textContent ?? '')
  expect(match, line.textContent ?? '').not.toBeNull()
  return Number(match![1])
}

describe('the product behind the main cause', () => {
  it('names the tractor on the Heydər Əliyev card, with its amount and its share of every rise', () => {
    renderCards(heyderAliyev())
    const article = card('Heydər Əliyev Mərkəzi')

    expect(within(article).getByText('Əsas səbəb')).toBeInTheDocument()
    expect(within(article).getByText('Yeni məhsullar')).toBeInTheDocument()
    expect(within(article).getByText('+29.691,52 ₼')).toBeInTheDocument()

    const line = productLine(article, 'Traktor qazonbiçən RT-6127.1 ZL')
    expect(line).toHaveTextContent('Traktor qazonbiçən RT-6127.1 ZL — +21.900,00 ₼')
    // New products alone come to 29.691,52 ₼, so the tractor cannot be more than 74% of the rises.
    expect(shareOf(line, 'artımların')).toBeLessThanOrEqual(74)
    expect(line).toHaveTextContent('(artımların 74%-i)')

    // Then the two causes after the main one, largest first.
    const secondary = within(article).getAllByRole('listitem')
    expect(secondary.map((item) => item.textContent)).toEqual([
      'Bu ay yazılmayan məhsullar −5.629,62 ₼',
      'Miqdar azalması −309,20 ₼',
    ].map((text) => text.replace(/ ₼/g, `${String.fromCharCode(0xa0)}₼`)))
  })

  it('names the summer shoes on the Fəvvarələr card, with their share of every fall', () => {
    renderCards(fevvareler())
    const article = card('Fəvvarələr meydanı')

    expect(within(article).getByText('Bu ay yazılmayan məhsullar')).toBeInTheDocument()
    const line = productLine(article, 'Yay ayaqqabısı')
    expect(line).toHaveTextContent('Yay ayaqqabısı — −1.988,00 ₼')
    // Products not ordered this month alone come to 8.093,70 ₼, so the shoes cannot be more than 25%.
    expect(shareOf(line, 'azalmaların')).toBeLessThanOrEqual(25)
    expect(line).toHaveTextContent('(azalmaların 23%-i)')
  })

  it('puts the product directly under the main cause and above the causes that follow', () => {
    renderCards(heyderAliyev())
    const text = card('Heydər Əliyev Mərkəzi').textContent ?? ''

    const order = ['Əsas səbəb', 'Yeni məhsullar', 'Traktor qazonbiçən', 'Bu ay yazılmayan məhsullar', 'Miqdar azalması']
      .map((part) => text.indexOf(part))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((left, right) => left - right)).toEqual(order)
  })

  it('keeps the main cause the loudest line: the product is quieter, the causes below quieter still', () => {
    renderCards(heyderAliyev())
    const article = card('Heydər Əliyev Mərkəzi')

    const primary = within(article).getByText('Yeni məhsullar').closest('p')!
    const line = productLine(article, 'Traktor qazonbiçən RT-6127.1 ZL')
    expect(primary).toHaveClass('text-sm', 'text-slate-900')
    expect(line).toHaveClass('text-sm', 'text-slate-700')
    expect(line).not.toHaveClass('text-slate-900')
    for (const item of within(article).getAllByRole('listitem')) {
      expect(item).toHaveClass('text-xs')
    }
  })

  it('is text, not a link: "Detallara bax" already opens the order', () => {
    renderCards(heyderAliyev())
    const article = card('Heydər Əliyev Mərkəzi')

    expect(productLine(article, 'Traktor qazonbiçən RT-6127.1 ZL').querySelector('a')).toBeNull()
    expect(within(article).getAllByRole('link')).toHaveLength(1)
  })

  it('shows no product line when no product moved the main cause, and leaves the rest as it was', () => {
    renderCards(row({
      locationName: 'Nərimanov heykəli',
      causes: [cause('QuantityChange', 200), cause('PriceChange', 50), cause('NewOrders', -20)],
      primaryCause: 'QuantityChange',
      primaryCauseAmount: 200,
      primaryCauseProduct: null,
    }))
    const article = card('Nərimanov heykəli')

    expect(article.textContent).not.toMatch(/artımların|azalmaların/)
    expect(article.textContent).not.toContain(' — ')
    expect(within(article).getByText('Miqdar artımı')).toBeInTheDocument()
    expect(within(article).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows no product line when there is nothing to compare against', () => {
    renderCards(row({
      locationName: 'Bakı Konqres Mərkəzi',
      knownAmountDelta: null,
      knownAmountPercentChange: null,
      causes: [],
      primaryCause: null,
      primaryCauseAmount: null,
      primaryCauseProduct: null,
    }))

    expect(card('Bakı Konqres Mərkəzi').textContent).not.toContain('Əsas səbəb')
  })

  it('uses no retired word and names no product code', () => {
    const { container } = renderCards(heyderAliyev(), fevvareler())

    expect(findOldTerms(container)).toEqual([])
  })
})

describe('colour by direction on the card (9.1)', () => {
  it('paints a rise red: the difference, the main cause, the product and a rising cause below', () => {
    renderCards(row({
      ...heyderAliyev(),
      // A second rise among the secondaries, so a red secondary is checked too.
      causes: [cause('NewOrders', 29_691.52, 3), cause('PriceChange', 6_000), cause('NoLongerOrdered', -5_629.62)],
    }))
    const article = card('Heydər Əliyev Mərkəzi')

    expect(within(article).getByText('+23.852,70 ₼').closest('p')).toHaveClass('text-red-700')
    expect(within(article).getByText('+29.691,52 ₼')).toHaveClass('text-red-700')
    expect(within(article).getByText('+21.900,00 ₼')).toHaveClass('text-red-700')
    expect(within(article).getByText('+6.000,00 ₼')).toHaveClass('text-red-700')
    expect(within(article).getByText('−5.629,62 ₼')).toHaveClass('text-emerald-700')
  })

  it('paints a fall green: the difference, the main cause, the product and a falling cause below', () => {
    renderCards(fevvareler())
    const article = card('Fəvvarələr meydanı')

    expect(within(article).getByText('−2.584,45 ₼').closest('p')).toHaveClass('text-emerald-700')
    expect(within(article).getByText('−8.093,70 ₼')).toHaveClass('text-emerald-700')
    expect(within(article).getByText('−1.988,00 ₼')).toHaveClass('text-emerald-700')
    expect(within(article).getByText('−500,00 ₼')).toHaveClass('text-emerald-700')
    expect(within(article).getByText('+6.009,25 ₼')).toHaveClass('text-red-700')
  })

  it('never uses the old rule: no green on a rise, and no rose anywhere', () => {
    const { container } = renderCards(heyderAliyev(), fevvareler())

    expect(container.querySelector('.text-rose-700')).toBeNull()
    const rising = card('Heydər Əliyev Mərkəzi')
    for (const figure of ['+23.852,70 ₼', '+29.691,52 ₼', '+21.900,00 ₼']) {
      const element = within(rising).getByText(figure)
      expect(element.closest('.text-emerald-700'), figure).toBeNull()
    }
  })

  it('says the direction in words to a screen reader, beside the difference and the product', () => {
    renderCards(heyderAliyev(), fevvareler())

    const rising = card('Heydər Əliyev Mərkəzi')
    expect(within(rising).getByText('+23.852,70 ₼').closest('p')).toHaveTextContent('xərc artıb')
    const tractor = within(rising).getByText('+21.900,00 ₼')
    expect(tractor).toHaveTextContent('+21.900,00 ₼, xərc artıb')
    expect(within(tractor).getByText(/xərc artıb/)).toHaveClass('sr-only')

    const falling = card('Fəvvarələr meydanı')
    expect(within(falling).getByText('−2.584,45 ₼').closest('p')).toHaveTextContent('xərc azalıb')
    const shoes = within(falling).getByText('−1.988,00 ₼')
    expect(shoes).toHaveTextContent('−1.988,00 ₼, xərc azalıb')
    expect(within(shoes).getByText(/xərc azalıb/)).toHaveClass('sr-only')

    // Never a verdict.
    expect(document.body).not.toHaveTextContent(/yaxşı|pis/i)
  })
})

describe('the two causes after the main one', () => {
  /** Equal amounts fall in the order page's tie order, so the two screens agree on ties too. */
  it('breaks a tie in the order the order page uses', () => {
    renderCards(row({
      locationName: 'Nərimanov heykəli',
      causes: [
        cause('NoLongerOrdered', -1_601.06),
        cause('InternalSupply', 300),
        cause('UnattributedDueToMissingPrice', -300),
        cause('Services', 300),
      ],
      primaryCause: 'NoLongerOrdered',
      primaryCauseAmount: -1_601.06,
    }))
    const article = card('Nərimanov heykəli')

    // Three of 300: "Xidmətlər", then "Qiymət yoxdur", then "Daxili təminat" — and only two are shown.
    const secondary = within(article).getAllByRole('listitem').map((item) => item.textContent ?? '')
    expect(secondary).toHaveLength(2)
    expect(secondary[0]).toMatch(/^Xidmətlər/)
    expect(secondary[1]).toMatch(/^Qiymət yoxdur/)
  })
})
