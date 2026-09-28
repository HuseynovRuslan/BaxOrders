import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type {
  DashboardLineTypeSplit,
  DashboardAmount,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { partition, partitionMember } from '../../test/dashboardFixtures'
import { expectInert } from '../../test/interaction'
import { interactiveRowClass, interactiveSurfaceClass, rowLinkClass, surfaceLinkClass } from '../interaction'
import { LocationRows } from './LocationRows'

/**
 * A month with nothing in it but planned material: the monthly figure is the whole month, which is what
 * every fixture here describes. The other two sides hold no lines at all, so their amount is null rather
 * than a zero standing in for one.
 */
function monthlyOnly(current: DashboardAmount): DashboardLineTypeSplit {
  const none: DashboardAmount = {
    knownAmount: null,
    itemCount: 0,
    knownPriceItemCount: 0,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    isComplete: true,
  }

  return { monthly: current, outsideMonthly: none, unclassified: none, unclassifiedItemCount: 0 }
}


/**
 * The objects table as a manager reads it: what this month cost, what last month cost, the difference, and the
 * one reason for it.
 * <para>
 * Two habits are pinned here. The table never reports how many lines an order had, because nobody decides
 * anything with that. And it says nothing at all about history on a healthy row — a badge that appears on
 * every row is one a reader stops seeing, and then stops seeing the real ones with it.
 * </para>
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

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    hasCurrentRequest: true,
    currentRequestId: 105,
    currentVersion: 1,
    currentStatus: 'Draft',
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
    newVariantCount: 3,
    increasedVariantCount: 2,
    decreasedVariantCount: 1,
    unchangedVariantCount: 4,
    noLongerOrderedVariantCount: 5,
    insufficientHistoryVariantCount: 0,
    notComparableVariantCount: 0,
    quantityComparableVariantCount: 15,
    amountOrientedServiceCount: 0,
    comparedVariantCount: 15,
    deepLinkPeriod: '2026-07-01',
    deepLinkBasis: 'PreviousMonth',
    deepLinkCustomStart: null,
    deepLinkCustomEnd: null,
    supplyChangedVariantCount: 0,
    causes: [
      { category: 'NewOrders', amount: 150, variantCount: 3 },
      { category: 'PriceChange', amount: 50, variantCount: 2 },
    ],
    primaryCause: 'NewOrders',
    primaryCauseAmount: 150,
    primaryCauseProduct: null,
    explanationIsComplete: true,
    unattributedAmount: 0,
    ...overrides,
  }
}

function summary(basis: AnalyticsComparisonBasis = 'PreviousMonth'): ManagementDashboardSummary {
  const base: ManagementDashboardSummary = {
    selectedPeriod: '2026-07-01',
    basis,
    baselinePeriods: ['2026-06-01'],
    locationCount: 26,
    locationsWithCurrentRequest: 25,
    locationsWithoutCurrentRequest: 1,
    currentRequestCount: 25,
    current: amount({ knownAmount: 25000 }),
    comparedCurrent: amount({ knownAmount: 24000 }),
    baseline: amount({ knownAmount: 20000 }),
    knownAmountDelta: 4000,
    knownAmountPercentChange: 20,
    /*
      The compared objects are given ids of their own so that nothing collides with the row under test; the
      object with no order this month IS the row under test, because that is the row whose status has to be
      drawn from what the partition knows about it.
    */
    partition: partition({
      compared: Array.from({ length: 25 }, (_, index) => partitionMember(101 + index, `Obyekt ${index + 1}`)),
      noOrderThisMonth: [partitionMember(21, 'Fəvvarələr meydanı', {
        lastOrderPeriod: '2026-06-01',
        lastOrderKnownAmount: 800,
      })],
    }),
    locationsWithMissingPrices: 0,
    locationsWithCompleteHistory: 23,
    locationsWithPartialHistory: 0,
    locationsWithNoBaselineHistory: 3,
    locationsWithComparison: 23,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 0,
    amountOrientedServiceCount: 0,
    lineTypes: monthlyOnly(amount()),
    trend: [],
  }

  return { ...base, lineTypes: monthlyOnly(base.current) }
}

/** What the dashboard was comparing against; the table carries it into every row's link. */
const selection: BasisSelection = { basis: 'Previous3MonthAverage', from: null, to: null }

function renderRows(rows: LocationDashboardRow[], basis: AnalyticsComparisonBasis = 'PreviousMonth') {
  return render(
    <MemoryRouter>
      <LocationRows rows={rows} summary={summary(basis)} selection={selection} />
    </MemoryRouter>,
  )
}

function table() {
  return within(document.querySelector('table')!)
}

describe('the columns a manager reads', () => {
  it('names them in money terms, not analytics terms', () => {
    renderRows([row()])

    const headers = table().getAllByRole('columnheader').map((cell) => cell.textContent)
    // No "Detallar" column: the whole row opens the object now (20.2).
    expect(headers).toEqual(['Obyekt', 'Bu ay', 'Keçən ay', 'Dəyişmə', 'Əsas səbəb', 'Məlumat vəziyyəti'])
  })

  /**
   * The comparison column is headed by whatever the comparison actually is. A figure under "Keçən ay" that
   * was in fact a six-month average would be a true number under a false label.
   */
  it('names the comparison column after the basis in force', () => {
    renderRows([row()], 'Previous6MonthAverage')
    expect(table().getByRole('columnheader', { name: 'Son 6 ayın ortalaması' })).toBeInTheDocument()
  })

  it('names a hand-picked range by its own months', () => {
    render(
      <MemoryRouter>
        <LocationRows
          selection={selection}
          rows={[row()]}
          summary={{
            ...summary('CustomRange'),
            baselinePeriods: ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'],
          }}
        />
      </MemoryRouter>,
    )

    expect(table().getByRole('columnheader', { name: 'Yanvar–May 2026 ortalaması' })).toBeInTheDocument()
  })

  /** Owner decision 9.1: a cost that went up is red, one that went down is green — direction, never a verdict. */
  it('colours the difference by direction alone', () => {
    const { container } = renderRows([row(), row({ locationId: 22, knownAmountDelta: -200, knownAmountPercentChange: -25 })])

    expect(table().getByText('+200,00 ₼')).toHaveClass('text-red-700')
    expect(table().getByText('+25%')).toHaveClass('text-red-700')
    expect(table().getByText('−200,00 ₼')).toHaveClass('text-emerald-700')
    expect(table().getByText('−25%')).toHaveClass('text-emerald-700')
    // The main cause follows the same rule.
    expect(table().getAllByText('+150,00 ₼')[0]).toHaveClass('text-red-700')
    expect(container.querySelector('.text-rose-700')).toBeNull()
  })

  it('says the direction in words to a screen reader beside the difference', () => {
    renderRows([row(), row({ locationId: 22, knownAmountDelta: -200, knownAmountPercentChange: -25 })])

    const rising = table().getByText('+200,00 ₼')
    expect(rising).toHaveTextContent('+200,00 ₼, xərc artıb')
    expect(within(rising).getByText(/xərc artıb/)).toHaveClass('sr-only')
    expect(table().getByText('−200,00 ₼')).toHaveTextContent('−200,00 ₼, xərc azalıb')
    expect(document.body).not.toHaveTextContent(/yaxşı|pis/i)
  })

  it('puts the object\'s id on its row, for Back to return to', () => {
    renderRows([row()])

    expect(table().getByText('Fəvvarələr meydanı').closest('tr')).toHaveAttribute('id', 'row-21')
  })

  /**
   * Task 20 (20.2): "keçid sətrin sağ kənarında bir düymə olaraq qalmır". The right-hand button and its column are
   * gone — the row is the target — and the footer still spans the whole table.
   */
  it('has no right-hand button column, and its footer still spans the table', () => {
    renderRows([row()])

    const cells = document.querySelector('tbody tr')!.children
    expect(cells).toHaveLength(6)
    expect(within(cells[cells.length - 1] as HTMLElement).queryByRole('link')).toBeNull()
    expect(within(document.querySelector('tbody')!).queryAllByRole('button')).toHaveLength(0)
    expect(within(document.querySelector('tbody')!).queryByText('Detallara bax')).toBeNull()

    const footerCells = Array.from(document.querySelector('tfoot tr')!.children) as HTMLTableCellElement[]
    expect(footerCells[footerCells.length - 1]).toHaveAttribute('colspan', '2')
    expect(footerCells.reduce((sum, cell) => sum + cell.colSpan, 0)).toBe(6)
  })

  it('has dropped the line count nobody decided anything with', () => {
    renderRows([row()])

    expect(table().queryByRole('columnheader', { name: 'Sətir' })).toBeNull()
    expect(table().queryByText('Məlum məbləğ')).toBeNull()
  })

  it('shows this month, last month and the difference between them', () => {
    renderRows([row()])

    expect(table().getByText('1.000,00 ₼')).toBeInTheDocument()
    expect(table().getByText('800,00 ₼')).toBeInTheDocument()
    expect(table().getByText('+200,00 ₼')).toBeInTheDocument()
    expect(table().getByText('+25%')).toBeInTheDocument()
  })

  it('never dumps the raw product counts into the row', () => {
    renderRows([row()])

    // Answers to a question nobody asks of a list of twenty-six objects.
    expect(table().queryByText('Yeni')).toBeNull()
    expect(table().queryByText('Artıb')).toBeNull()
    expect(table().queryByText('Bu ay yazılmayan məhsullar')).toBeNull()
  })
})

describe('the main reason', () => {
  it('is the cause that moved the most money, with its direction in the words', () => {
    renderRows([row()])

    expect(table().getByText(/Yeni məhsullar/)).toBeInTheDocument()
    expect(table().getByText('+150,00 ₼')).toBeInTheDocument()
  })

  /** One name for one gap: the line, the order page and the dashboard all say Task 2's "Qiymət yoxdur". */
  it('names the money a missing price leaves unexplained in the words the line uses', () => {
    renderRows([row({ primaryCause: 'UnattributedDueToMissingPrice', primaryCauseAmount: 90 })])

    expect(table().getByText(/Qiymət yoxdur/)).toBeInTheDocument()
    expect(table().queryByText(/Qiymət məlumatı çatışmır/)).toBeNull()
  })

  it('says a price rose when that is what happened', () => {
    renderRows([row({ primaryCause: 'PriceChange', primaryCauseAmount: 740 })])

    expect(table().getByText(/Qiymət artımı/)).toBeInTheDocument()
    expect(table().getByText('+740,00 ₼')).toBeInTheDocument()
  })

  it('says a quantity fell when that is what happened', () => {
    renderRows([row({ primaryCause: 'QuantityChange', primaryCauseAmount: -1610 })])

    expect(table().getByText(/Miqdar azalması/)).toBeInTheDocument()
    expect(table().getByText('−1.610,00 ₼')).toBeInTheDocument()
  })

  it('refuses to name one when there is nothing to compare against', () => {
    renderRows([row({
      knownAmountDelta: null,
      knownAmountPercentChange: null,
      comparisonAvailability: 'NoBaselineHistory',
      comparisonAvailable: false,
      primaryCause: null,
      primaryCauseAmount: null,
      causes: [],
    })])

    expect(table().getAllByText('Müqayisə üçün əvvəlki ay yoxdur').length).toBeGreaterThan(0)
  })
})

describe('the data-state column', () => {
  it('says nothing at all when there is nothing wrong', () => {
    renderRows([row()])

    // Silence is the point: a badge on every healthy row is one nobody reads.
    expect(table().queryByText('Tam tarixçə')).toBeNull()
    expect(table().queryByText(/1\/1 ay/)).toBeNull()
    expect(table().queryByText('Müqayisə üçün data azdır')).toBeNull()
  })

  it('says the previous month is missing when it is', () => {
    renderRows([row({
      comparisonAvailability: 'NoBaselineHistory',
      comparisonAvailable: false,
      knownAmountDelta: null,
      knownAmountPercentChange: null,
      primaryCause: null,
      primaryCauseAmount: null,
    })])

    expect(table().getByText('Müqayisə bazası yoxdur')).toBeInTheDocument()
  })

  it('says the history is short when it is', () => {
    renderRows(
      [row({ historyCoverage: 'Partial', availableBaselinePeriodCount: 2, expectedBaselinePeriodCount: 3 })],
      'Previous3MonthAverage',
    )

    // Owner decision 5.1, and the same words as the chip above the table.
    expect(table().getByText('Müqayisə üçün data azdır')).toBeInTheDocument()
  })

  it('says an object did not order rather than showing it as a zero', () => {
    renderRows([row({
      hasCurrentRequest: false,
      currentRequestId: null,
      current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
      knownAmountDelta: null,
      knownAmountPercentChange: null,
      primaryCause: null,
      primaryCauseAmount: null,
    })])

    expect(table().getByText('Sifariş qeydə alınmayıb · son sifariş İyun 2026 (800,00 ₼)')).toBeInTheDocument()
    expect(table().queryByText('0,00 ₼')).toBeNull()
  })

  /**
   * Task 09 (brief: "qiymət xəbərdarlığı 4 sətir tutur"): the ⚠ mark on the amount says it — the one sentence
   * the cards and the order page say is its name — and the column no longer repeats it.
   */
  it('says when part of the money cannot be explained, once, on the mark', () => {
    renderRows([row({ explanationIsComplete: false, unattributedAmount: 120 })])

    const mark = table().getByRole('img', { name: 'Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.' })
    expect(mark.closest('td')).toHaveTextContent('1.000,00 ₼')
    expect(table().queryByText('Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.')).toBeNull()
    expect(table().queryByText('Məlumat tamdır')).toBeNull()
  })

  /** Amber means a price somebody owes; an object that did not order owes nothing, so its status is slate. */
  it('says an object did not order in slate, not amber', () => {
    renderRows([row({
      hasCurrentRequest: false,
      currentRequestId: null,
      current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
      knownAmountDelta: null,
      knownAmountPercentChange: null,
      primaryCause: null,
      primaryCauseAmount: null,
    })])

    const status = table().getByText('Sifariş qeydə alınmayıb · son sifariş İyun 2026 (800,00 ₼)')
    expect(status).toHaveClass('text-slate-600')
    expect(status.className).not.toMatch(/amber/)
  })
})

/**
 * Task 21 (21.3): a difference over a partial baseline says how much baseline it has — "Baza 2/6 ay" — under the
 * percentage in the table and under the difference on a phone. A fact, in slate; the percentage is left as it is.
 */
describe('the baseline coverage', () => {
  const partial = row({
    locationId: 31,
    locationName: 'Qismən baza',
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 2,
    historyCoverage: 'Partial',
  })
  const complete = row({
    locationId: 32,
    locationName: 'Tam baza',
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 6,
    historyCoverage: 'Complete',
  })
  const noBaseline = row({
    locationId: 33,
    locationName: 'Bazasız',
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 0,
    historyCoverage: 'Unavailable',
    comparisonAvailability: 'NoBaselineHistory',
    comparisonAvailable: false,
    baseline: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    primaryCause: null,
    primaryCauseAmount: null,
    causes: [],
  })
  const noOrder = row({
    locationId: 34,
    locationName: 'Sifarişsiz',
    hasCurrentRequest: false,
    currentRequestId: null,
    current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    expectedBaselinePeriodCount: 6,
    availableBaselinePeriodCount: 2,
    historyCoverage: 'Partial',
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    primaryCause: null,
    primaryCauseAmount: null,
    causes: [],
  })

  function tableRow(locationId: number): HTMLElement {
    return document.getElementById(`row-${locationId}`)!
  }

  function phoneRow(locationId: number): HTMLElement {
    return document.getElementById(`row-${locationId}-phone`)!
  }

  it('says "Baza 2/6 ay" in the Dəyişmə cell and on the phone row of a partial row', () => {
    renderRows([partial], 'Previous6MonthAverage')

    const cell = within(tableRow(31)).getByText('+25%').closest('td')!
    const inCell = within(cell).getByText('Baza 2/6 ay')
    // A third line, under the percentage.
    expect(cell.lastElementChild).toBe(inCell)
    expect(cell).toHaveTextContent(/^\+200,00 ₼, xərc artıb\s*\+25%\s*Baza 2\/6 ay$/)

    const onPhone = within(phoneRow(31)).getByText('Baza 2/6 ay')
    const differenceLine = within(phoneRow(31)).getByText(/\+200,00 ₼ \+25%/)
    expect(differenceLine.nextElementSibling).toBe(onPhone)

    for (const coverage of [inCell, onPhone]) {
      expect(coverage).toHaveClass('text-xs', 'text-slate-500', 'whitespace-nowrap')
      expect(coverage.className).not.toMatch(/amber|red|emerald/)
      expectInert(coverage, coverage.closest('tr, li')!)
    }
  })

  it('says nothing of the sort on a complete, a no-baseline or a no-order row', () => {
    renderRows([complete, noBaseline, noOrder], 'Previous6MonthAverage')

    for (const locationId of [32, 33, 34]) {
      expect(tableRow(locationId).textContent, String(locationId)).not.toMatch(/Baza \d/)
      expect(phoneRow(locationId).textContent, String(locationId)).not.toMatch(/Baza \d/)
    }
  })

  it('leaves the data-state column and the figures as they were', () => {
    renderRows([partial], 'Previous6MonthAverage')

    expect(within(tableRow(31)).getByText('Müqayisə üçün data azdır')).toBeInTheDocument()
    expect(within(tableRow(31)).getByText('1.000,00 ₼')).toBeInTheDocument()
    expect(within(tableRow(31)).getByText('800,00 ₼')).toBeInTheDocument()
    expect(within(tableRow(31)).getByText('+25%')).toHaveClass('text-red-700')
    expect(document.body.textContent).not.toMatch(/təxmini|təqribi/i)
  })
})

describe('the unpriced lines', () => {
  /**
   * Task 09 (brief: "Qiymət xəbərdarlığı ... qısa işarə və say ilə"): "⚠ 3" beside the money it affects, on the
   * same line, with the sentence as its name — not a sentence under the amount.
   */
  it('marks them beside the money they affect', () => {
    renderRows([row({ current: amount({ missingPriceItemCount: 3, isComplete: false }) })])

    const mark = table().getByRole('img', { name: '3 sətirdə qiymət yoxdur' })
    expect(mark).toHaveTextContent('⚠ 3')
    expect(mark).toHaveClass('whitespace-nowrap', 'text-amber-800')
    const line = mark.closest('p')!
    expect(line).toHaveClass('whitespace-nowrap')
    expect(line).toHaveTextContent('⚠ 3 1.000,00 ₼')
    expect(table().queryByText(/3 sətirdə qiymət yoxdur/)).toBeNull()
  })

  it('marks them on the phone list too, beside its amount', () => {
    const { container } = renderRows([row({ current: amount({ missingPriceItemCount: 3, isComplete: false }) })])
    const cards = container.querySelector('ul.lg\\:hidden') as HTMLElement

    expect(within(cards).getByRole('img', { name: '3 sətirdə qiymət yoxdur' }).closest('p')).toHaveTextContent('1.000,00 ₼')
    expect(within(cards).queryByText(/3 sətirdə qiymət yoxdur/)).toBeNull()
  })

  it('says nothing of the sort when every line that needed a price has one', () => {
    renderRows([row({ current: amount({ priceNotRequiredItemCount: 4 }) })])

    // Internal supply is not a shortfall, so it raises nothing here.
    expect(table().queryByText(/qiymət yoxdur/i)).toBeNull()
    expect(table().queryByRole('img')).toBeNull()
  })
})

describe('the drill-down', () => {
  /** The basis travels with the link, so the order answers about the comparison the row was showing. */
  it('goes straight to the order the figures came from, carrying the basis', () => {
    renderRows([row({ currentRequestId: 105 })])

    expect(table().getByRole('link', { name: /Fəvvarələr meydanı · Detallara bax/ }))
      .toHaveAttribute('href', '/orders/105?basis=avg3')
  })

  it('offers the object itself when there is no order this month to open', () => {
    renderRows([row({
      hasCurrentRequest: false,
      currentRequestId: null,
      primaryCause: null,
      primaryCauseAmount: null,
    })])

    expect(table().getByRole('link', { name: /Detallara bax/ })).toHaveAttribute('href', '/locations/21?basis=avg3')
  })

  it('no longer sends the reader through a separate analytics screen', () => {
    renderRows([row()])

    expect(screen.queryByText('Analitikaya bax')).toBeNull()
  })
})

describe('a phone', () => {
  it('gets the same four answers stacked, not the table squeezed sideways', () => {
    const { container } = renderRows([row()])
    const cards = container.querySelector('ul.lg\\:hidden') as HTMLElement

    expect(within(cards).getByText('Fəvvarələr meydanı')).toBeInTheDocument()
    expect(within(cards).getByText('1.000,00 ₼')).toBeInTheDocument()
    expect(within(cards).getByText(/Yeni məhsullar/)).toBeInTheDocument()
    expect(within(cards).getByRole('link', { name: /Detallara bax/ })).toBeInTheDocument()
  })

  /** Task 12, the decision it carries from Task 1: "Mobil kartlar da bazanı sifariş səhifəsinə ötürür". */
  it('carries the basis into the order from a card, as the table does', () => {
    const { container } = renderRows([row({ currentRequestId: 105 })])
    const cards = container.querySelector('ul.lg\\:hidden') as HTMLElement

    expect(within(cards).getByRole('link', { name: /Detallara bax/ })).toHaveAttribute('href', '/orders/105?basis=avg3')
  })

  it('carries it into the object from a card when there is no order this month to open', () => {
    const { container } = renderRows([row({
      hasCurrentRequest: false,
      currentRequestId: null,
      primaryCause: null,
      primaryCauseAmount: null,
    })])
    const cards = container.querySelector('ul.lg\\:hidden') as HTMLElement

    expect(within(cards).getByRole('link', { name: /Detallara bax/ })).toHaveAttribute('href', '/locations/21?basis=avg3')
  })
})

/**
 * The table ends on the same figures the page began with.
 *
 * A manager who reads down a column and adds it up must land on the number at the top of the page, or one of
 * the two is wrong and there is no way to tell which. Every column does add up, because each object's figure
 * — including its own difference — is rounded to the cent before the total is taken.
 */
describe('the footer', () => {
  function footer() {
    return within(document.querySelector('tfoot')!)
  }

  it('restates the page headline rather than summing the page in front of the reader', () => {
    renderRows([row()])

    expect(footer().getByText('Müqayisə olunan 25 obyekt')).toBeInTheDocument()
    expect(footer().getByText('24.000,00 ₼')).toBeInTheDocument()
    expect(footer().getByText('20.000,00 ₼')).toBeInTheDocument()
    expect(footer().getByText('+4.000,00 ₼')).toBeInTheDocument()
    expect(footer().getByText('+20%')).toBeInTheDocument()
  })

  /**
   * The month is a bigger number than the comparison whenever an object ordered with nothing behind it, and
   * the footer says both rather than letting the reader take one for the other.
   */
  it('adds the whole month underneath when some of it was not compared', () => {
    render(
      <MemoryRouter>
        <LocationRows
          rows={[row()]}
          selection={selection}
          summary={{
            ...summary(),
            partition: partition({
              compared: Array.from({ length: 24 }, (_, index) => partitionMember(101 + index, `Obyekt ${index + 1}`)),
              noBaseline: [partitionMember(31, 'EXPO', { currentKnownAmount: 1000 })],
              noOrderThisMonth: [partitionMember(21, 'Fəvvarələr meydanı')],
            }),
          }}
        />
      </MemoryRouter>,
    )

    expect(footer().getByText('Müqayisə olunan 24 obyekt')).toBeInTheDocument()
    expect(footer().getByText('Bütün sifarişlər (25 obyekt): 25.000,00 ₼')).toBeInTheDocument()
  })

  it('says nothing of the sort when the comparison covers the whole month', () => {
    renderRows([row()])

    expect(footer().queryByText(/Bütün sifarişlər/)).toBeNull()
  })

  /** 9.1, as a row: the company's cost went up, so it is red, and a screen reader hears it said. */
  it('colours its difference by direction, exactly as a row does', () => {
    renderRows([row()])

    const delta = footer().getByText('+4.000,00 ₼')
    expect(delta).toHaveClass('text-red-700')
    expect(delta).toHaveTextContent('+4.000,00 ₼, xərc artıb')
    expect(footer().getByText('+20%')).toHaveClass('text-red-700')
  })

  it('follows 9.1 on the phone list too, rows and total alike', () => {
    const { container } = renderRows([row(), row({ locationId: 22, locationName: 'Bayıl yolu', knownAmountDelta: -200, knownAmountPercentChange: -25 })])
    const cards = container.querySelector('ul.lg\\:hidden') as HTMLElement

    expect(within(cards).getByText(/\+200,00 ₼/)).toHaveClass('text-red-700')
    expect(within(cards).getByText(/−200,00 ₼/)).toHaveClass('text-emerald-700')
    expect(within(cards).getByText(/\+4\.000,00 ₼/)).toHaveClass('text-red-700')
    expect(cards.querySelector('.text-rose-700')).toBeNull()
  })

  /** It is a summary of the table, not a row of it: it must not turn up among the objects. */
  it('is not counted as an object row', () => {
    renderRows([row()])

    // Six columns since Task 20 (20.2): the "Detallar" column went with its buttons.
    expect(table().getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Obyekt', 'Bu ay', 'Keçən ay', 'Dəyişmə', 'Əsas səbəb', 'Məlumat vəziyyəti',
    ])
    expect(within(document.querySelector('tbody')!).queryByText(/Müqayisə olunan/)).toBeNull()
  })

  /** A phone would otherwise have to scroll back to the top of the page for the same three figures. */
  it('is repeated at the end of the phone list', () => {
    renderRows([row()])

    const cards = within(document.querySelector('ul')!)
    expect(cards.getByText('Müqayisə olunan 25 obyekt')).toBeInTheDocument()
    expect(cards.getByText('24.000,00 ₼')).toBeInTheDocument()
  })
})

describe('an object with no order this month', () => {
  const noOrder = {
    hasCurrentRequest: false,
    currentRequestId: null,
    current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    baseline: amount({ knownAmount: 800 }),
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    primaryCause: null,
    primaryCauseAmount: null,
  } as const

  /**
   * An object that did not order is not an object that ordered nothing — and it is not an object that ordered
   * its usual amount either. Its own average is a real number, and printing it under "Keçən ay" would invite
   * exactly the subtraction this page exists to prevent.
   */
  it('shows an em dash for its money, its baseline and its difference alike', () => {
    renderRows([row(noOrder)])

    const cells = table().getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells.slice(0, 3)).toEqual(['—', '—', '—'])
    expect(table().queryByText('0,00 ₼')).toBeNull()
    expect(table().queryByText('800,00 ₼')).toBeNull()
  })

  /** What it last did is the fact a reader wants next, and the one fact that is actually known. */
  it('says when it last ordered instead of calling it a missing order', () => {
    renderRows([row(noOrder)])

    expect(table().getByText('Sifariş qeydə alınmayıb · son sifariş İyun 2026 (800,00 ₼)')).toBeInTheDocument()
    expect(table().queryByText('Sifariş yoxdur')).toBeNull()
  })

  /**
   * An object that has never ordered at all is a different fact again, and amber would be claiming somebody
   * has something to put right. The screen reads the group the backend put it in rather than guessing, and
   * says it in the same words as that group's chip — "Sistemdə hələ sifarişi yoxdur" (B2, Task 3).
   */
  it('says something else again when it has never ordered', () => {
    render(
      <MemoryRouter>
        <LocationRows
          rows={[row({ ...noOrder, locationId: 77 })]}
          selection={selection}
          summary={{
            ...summary(),
            partition: partition({
              compared: Array.from({ length: 25 }, (_, index) => partitionMember(101 + index, `Obyekt ${index + 1}`)),
              noHistory: [partitionMember(77, 'Heç sifariş verməyən obyekt')],
            }),
          }}
        />
      </MemoryRouter>,
    )

    expect(table().getByText('Sistemdə hələ sifarişi yoxdur')).toHaveClass('text-slate-500')
    expect(table().queryByText(/Sifariş qeydə alınmayıb/)).toBeNull()
  })

  /** B2: its money columns carry the dash an object with no order carries, never a zero. */
  it('shows no money for an object that has never ordered', () => {
    render(
      <MemoryRouter>
        <LocationRows
          rows={[row({
            ...noOrder,
            locationId: 77,
            locationName: 'Çadır',
            baseline: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
            availableBaselinePeriodCount: 0,
            historyCoverage: 'Unavailable',
          })]}
          selection={selection}
          summary={{
            ...summary(),
            partition: partition({
              compared: Array.from({ length: 26 }, (_, index) => partitionMember(101 + index, `Obyekt ${index + 1}`)),
              noHistory: [partitionMember(77, 'Çadır')],
            }),
          }}
        />
      </MemoryRouter>,
    )

    const cadir = table().getByText('Çadır').closest('tr')!
    expect(within(cadir).queryByText(/₼/)).toBeNull()
    expect(within(cadir).getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(within(cadir).getByText('Sistemdə hələ sifarişi yoxdur')).toBeInTheDocument()
  })
})

/**
 * Task 20 (20.2): the whole row opens the object, in the table and on a phone. Its one link is the object's name,
 * going where the right-hand button went and named as it was, so nothing about where a reader lands has moved.
 */
describe('the whole row opens the object', () => {
  /** The router's own address, so a test can see where a click went. */
  function Where() {
    const location = useLocation()
    return <span data-testid="where">{location.pathname + location.search}</span>
  }

  function renderRoutes(rows: LocationDashboardRow[], summaryOf: ManagementDashboardSummary = summary()) {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Where />
        <Routes>
          <Route path="/dashboard" element={<LocationRows rows={rows} summary={summaryOf} selection={selection} />} />
          <Route path="*" element={<p>Açıldı</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  function where(): string {
    return screen.getByTestId('where').textContent ?? ''
  }

  function surfaces(locationId: number): [HTMLElement, HTMLElement] {
    return [document.getElementById(`row-${locationId}`)!, document.getElementById(`row-${locationId}-phone`)!]
  }

  const bayil = row({ locationId: 22, locationName: 'Bayıl yolu', currentRequestId: 106, current: amount({ knownAmount: 2000 }) })

  const noOrder = {
    hasCurrentRequest: false,
    currentRequestId: null,
    current: amount({ knownAmount: null, itemCount: 0, knownPriceItemCount: 0 }),
    knownAmountDelta: null,
    knownAmountPercentChange: null,
    primaryCause: null,
    primaryCauseAmount: null,
  } as const

  it('has one link per row, in the table and on a phone, going where it went and named as it was', () => {
    renderRoutes([row(), bayil])

    for (const [locationId, name, href] of [
      [21, 'Fəvvarələr meydanı', '/orders/105?basis=avg3'],
      [22, 'Bayıl yolu', '/orders/106?basis=avg3'],
    ] as const) {
      for (const surface of surfaces(locationId)) {
        const links = within(surface).getAllByRole('link')
        expect(links, surface.id).toHaveLength(1)
        expect(links[0]).toHaveAttribute('data-surface-link')
        expect(links[0]).toHaveTextContent(name)
        expect(links[0]).toHaveAccessibleName(`${name} · Detallara bax`)
        expect(links[0]).toHaveAttribute('href', href)
        expect(within(surface).queryAllByRole('button')).toHaveLength(0)
      }
    }
  })

  it('keeps the ids Back returns to', () => {
    renderRoutes([row(), bayil])

    expect(table().getByText('Fəvvarələr meydanı').closest('tr')).toHaveAttribute('id', 'row-21')
    expect(table().getByText('Bayıl yolu').closest('tr')).toHaveAttribute('id', 'row-22')
    const phone = document.querySelector('ul.lg\\:hidden') as HTMLElement
    expect(within(phone).getByText('Fəvvarələr meydanı').closest('li')).toHaveAttribute('id', 'row-21-phone')
  })

  it.each([
    ['a table row\'s amount', () => within(surfaces(22)[0]).getByText('2.000,00 ₼')],
    ['a table row\'s main reason', () => within(surfaces(22)[0]).getByText(/Yeni məhsullar/)],
    ['a table row\'s empty cell', () => surfaces(22)[0].querySelectorAll('td')[4] as HTMLElement],
    ['a phone row\'s amount', () => within(surfaces(22)[1]).getByText('2.000,00 ₼')],
    ['a phone row\'s empty space', () => surfaces(22)[1]],
    ['a phone row\'s "Detallara bax"', () => within(surfaces(22)[1]).getByText('Detallara bax')],
  ])('opens the order from a click on %s', async (_part, target) => {
    renderRoutes([row(), bayil])

    await userEvent.click(target())

    expect(where()).toBe('/orders/106?basis=avg3')
  })

  it('keeps a phone row\'s "Detallara bax" as a sign only: not a link, and not read out twice', () => {
    renderRoutes([row()])

    const cue = within(surfaces(21)[1]).getByText('Detallara bax')
    expect(cue.tagName).toBe('SPAN')
    expect(cue).toHaveAttribute('aria-hidden', 'true')
    expect(cue.closest('a')).toBeNull()
    // Under its divider, as the link it replaces was.
    expect(cue.parentElement).toHaveClass('mt-2', 'border-t', 'border-slate-100', 'pt-2')
  })

  it('makes a row with no order this month a surface too, opening the object with the basis', async () => {
    renderRoutes([row(noOrder)])

    for (const surface of surfaces(21)) {
      expect(within(surface).getByRole('link')).toHaveAttribute('href', '/locations/21?basis=avg3')
    }
    await userEvent.click(within(surfaces(21)[0]).getByText('Sifariş qeydə alınmayıb · son sifariş İyun 2026 (800,00 ₼)'))

    expect(where()).toBe('/locations/21?basis=avg3')
  })

  it('makes a never-ordered row a surface too, opening the object with the basis', async () => {
    renderRoutes([row({ ...noOrder, locationId: 77, locationName: 'Çadır' })], {
      ...summary(),
      partition: partition({
        compared: Array.from({ length: 25 }, (_, index) => partitionMember(101 + index, `Obyekt ${index + 1}`)),
        noHistory: [partitionMember(77, 'Çadır')],
      }),
    })

    for (const surface of surfaces(77)) {
      expect(within(surface).getByRole('link')).toHaveAttribute('href', '/locations/77?basis=avg3')
    }
    await userEvent.click(within(surfaces(77)[1]).getByText('Sistemdə hələ sifarişi yoxdur'))

    expect(where()).toBe('/locations/77?basis=avg3')
  })

  it('changes a row as a whole under the cursor and the keyboard, and leaves its text inert (20.3)', () => {
    renderRoutes([row({ current: amount({ missingPriceItemCount: 3, isComplete: false }) })])
    const [tableRow, phoneRow] = surfaces(21)

    expect(tableRow.className).toBe(interactiveRowClass)
    expect(within(tableRow).getByRole('link').className).toContain(rowLinkClass)
    expect(phoneRow.className).toContain(interactiveSurfaceClass)
    expect(phoneRow).toHaveClass('group', 'rounded-lg', 'border', 'border-slate-200', 'bg-white', 'p-3')
    expect(within(phoneRow).getByRole('link').className).toContain(surfaceLinkClass)

    for (const surface of [tableRow, phoneRow]) {
      // The name's own line keeps its resting look.
      expect(within(surface).getByRole('link').closest('p')).toHaveClass('font-medium', 'text-slate-900')
      for (const element of [
        within(surface).getByText('1.000,00 ₼'),
        within(surface).getByText(/\+200,00 ₼/),
        within(surface).getByText(/Yeni məhsullar/),
        within(surface).getByRole('img', { name: '3 sətirdə qiymət yoxdur' }),
      ]) {
        expectInert(element, surface)
      }
    }
    expectInert(table().getByRole('columnheader', { name: 'Əsas səbəb' }))
  })

  it('leaves the footer and the phone list\'s summary as they were: not surfaces, and inert', async () => {
    renderRoutes([row()])

    const footer = document.querySelector('tfoot tr') as HTMLElement
    const phone = document.querySelector('ul.lg\\:hidden') as HTMLElement
    const phoneSummary = phone.lastElementChild as HTMLElement
    expect(phoneSummary).toHaveTextContent('Müqayisə olunan 25 obyekt')

    for (const element of [footer, phoneSummary]) {
      expect(within(element).queryByRole('link')).toBeNull()
      expect(element.className).not.toMatch(/cursor-pointer/)
      for (const figure of [within(element).getByText('24.000,00 ₼'), within(element).getByText(/\+4\.000,00 ₼/)]) {
        expectInert(figure)
      }
      await userEvent.click(within(element).getByText('24.000,00 ₼'))
      expect(where()).toBe('/dashboard')
    }
  })
})
