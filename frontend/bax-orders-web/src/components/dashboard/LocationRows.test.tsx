import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type {
  DashboardAmount,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { partition, partitionMember } from '../../test/dashboardFixtures'
import { LocationRows } from './LocationRows'

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
    explanationIsComplete: true,
    unattributedAmount: 0,
    ...overrides,
  }
}

function summary(basis: AnalyticsComparisonBasis = 'PreviousMonth'): ManagementDashboardSummary {
  return {
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
  }
}

/** What the dashboard was comparing against; the table carries it into every "Detallara bax". */
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
    expect(headers).toEqual(['Obyekt', 'Bu ay', 'Keçən ay', 'Dəyişmə', 'Əsas səbəb', 'Məlumat vəziyyəti', 'Detallar'])
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

  it('colours the difference by direction alone', () => {
    renderRows([row(), row({ locationId: 22, knownAmountDelta: -200, knownAmountPercentChange: -25 })])

    expect(table().getByText('+200,00 ₼')).toHaveClass('text-emerald-700')
    expect(table().getByText('−200,00 ₼')).toHaveClass('text-rose-700')
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

  it('says when part of the money cannot be explained', () => {
    renderRows([row({ explanationIsComplete: false, unattributedAmount: 120 })])

    // The one sentence the cards and the order page say too.
    expect(table().getByText('Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.'))
      .toBeInTheDocument()
  })
})

describe('the unpriced lines', () => {
  it('names them beside the money they affect', () => {
    renderRows([row({ current: amount({ missingPriceItemCount: 3, isComplete: false }) })])

    expect(table().getByText(/3 sətirdə qiymət yoxdur/)).toBeInTheDocument()
  })

  it('says nothing of the sort when every line that needed a price has one', () => {
    renderRows([row({ current: amount({ priceNotRequiredItemCount: 4 }) })])

    // Internal supply is not a shortfall, so it raises nothing here.
    expect(table().queryByText(/qiymət yoxdur/i)).toBeNull()
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

  it('colours its difference by direction, exactly as a row does', () => {
    renderRows([row()])

    expect(footer().getByText('+4.000,00 ₼')).toHaveClass('text-emerald-700')
  })

  /** It is a summary of the table, not a row of it: it must not turn up among the objects. */
  it('is not counted as an object row', () => {
    renderRows([row()])

    expect(table().getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Obyekt', 'Bu ay', 'Keçən ay', 'Dəyişmə', 'Əsas səbəb', 'Məlumat vəziyyəti', 'Detallar',
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
