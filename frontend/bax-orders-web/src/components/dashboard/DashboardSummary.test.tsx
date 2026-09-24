import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { DashboardAmount, ManagementDashboardSummary } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { comparedOnly, partition, partitionMember } from '../../test/dashboardFixtures'
import { DashboardSummary } from './DashboardSummary'

/**
 * The three-second read, in the order a decision needs it: the amount, which way it moved, over which
 * objects, how much of the company that covers, and only then anything wrong with the records.
 *
 * Three of these are business rules rather than presentation. The system never says *why* an object has no
 * request, because it does not know. Material the company supplies itself is never counted as a missing
 * price, because nothing about it is missing. And the difference is only ever over objects that have both
 * sides of it — a total over one set of objects minus a total over another is not a change in anything.
 *
 * The figures are September 2026's real ones, so this file doubles as the record of what the screen showed.
 */
function amount(overrides: Partial<DashboardAmount> = {}): DashboardAmount {
  return {
    knownAmount: 71210.29,
    itemCount: 480,
    knownPriceItemCount: 480,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    isComplete: true,
    ...overrides,
  }
}

/** A clean month: every object that ordered can be compared, and nothing is outside the cohort. */
function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 26,
    locationsWithCurrentRequest: 26,
    locationsWithoutCurrentRequest: 0,
    currentRequestCount: 26,
    current: amount(),
    comparedCurrent: amount(),
    baseline: amount({ knownAmount: 44340.78 }),
    knownAmountDelta: 26869.51,
    knownAmountPercentChange: 60.6,
    partition: comparedOnly(26),
    locationsWithMissingPrices: 0,
    locationsWithCompleteHistory: 26,
    locationsWithPartialHistory: 0,
    locationsWithNoBaselineHistory: 0,
    locationsWithComparison: 26,
    newVariantCount: 0,
    increasedVariantCount: 0,
    decreasedVariantCount: 0,
    unchangedVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    insufficientHistoryVariantCount: 0,
    amountOrientedServiceCount: 0,
    ...overrides,
  }
}

/** September 2026 as it really is: two objects with no order, one with no baseline, three with no history. */
function september(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return summary({
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 2,
    currentRequestCount: 24,
    current: amount({ knownAmount: 71210.29 }),
    comparedCurrent: amount({ knownAmount: 71030.25 }),
    baseline: amount({ knownAmount: 44340.78 }),
    knownAmountDelta: 26689.47,
    knownAmountPercentChange: 60.19,
    locationsWithComparison: 23,
    locationsWithNoBaselineHistory: 1,
    partition: partition({
      compared: Array.from({ length: 23 }, (_, index) => partitionMember(index + 1, `Obyekt ${index + 1}`)),
      noOrderThisMonth: [
        partitionMember(32, 'Puşkin parkı', { lastOrderPeriod: '2026-05-01', lastOrderKnownAmount: 700 }),
        partitionMember(33, 'Təmir-tikinti', { lastOrderPeriod: '2026-07-01', lastOrderKnownAmount: 4645.05 }),
      ],
      noBaseline: [partitionMember(31, 'EXPO', { currentKnownAmount: 180.04 })],
      noHistory: [
        partitionMember(2, 'Maştağa'),
        partitionMember(1, 'Ramana'),
        partitionMember(3, 'Əmircan'),
      ],
    }),
    ...overrides,
  })
}

const selection: BasisSelection = { basis: 'PreviousMonth', from: null, to: null }

function renderSummary(value: ManagementDashboardSummary) {
  return render(
    <MemoryRouter>
      <DashboardSummary summary={value} selection={selection} />
    </MemoryRouter>,
  )
}

describe('the headline amount', () => {
  it('is named by its own month rather than as "the current period"', () => {
    renderSummary(summary())

    expect(screen.getByText(/Sentyabr 2026 sifarişlərinin məbləği/)).toBeInTheDocument()
    expect(screen.queryByText(/Cari dövrün məbləği/)).toBeNull()
  })

  it('is the whole month, with the change directly beneath it', () => {
    renderSummary(september())

    expect(screen.getByText('71.210,29 ₼')).toBeInTheDocument()
    expect(screen.getByText(/\+26\.689,47 ₼/)).toBeInTheDocument()
    expect(screen.getByText(/\+60,19%/)).toBeInTheDocument()
  })

  it('says which way it went and against what, in words', () => {
    renderSummary(summary({
      basis: 'Previous6MonthAverage',
      baselinePeriods: [],
      knownAmountDelta: -22561.84,
    }))

    expect(screen.getByText('Son 6 ayın ortalamasından aşağıdır')).toBeInTheDocument()
    expect(screen.getByText(/Son 6 ayın ortalaması:/)).toHaveTextContent('44.340,78 ₼')
  })

  it('says a rise is a rise', () => {
    renderSummary(summary())

    expect(screen.getByText('Keçən aydan yüksəkdir')).toBeInTheDocument()
  })

  /** Colour is direction and nothing else: less spending is not "good", and more is not "bad". */
  it('colours the change by direction alone', () => {
    const { unmount } = renderSummary(summary({
      knownAmountDelta: -22561.84,
      knownAmountPercentChange: -31.8,
    }))
    expect(screen.getByText(/−22\.561,84 ₼/).closest('p')).toHaveClass('text-rose-700')
    unmount()

    renderSummary(summary({ knownAmountDelta: 10626.82, knownAmountPercentChange: 17.54 }))
    expect(screen.getByText(/\+10\.626,82 ₼/).closest('p')).toHaveClass('text-emerald-700')
  })

  it('never breaks a money value between the amount and its manat sign', () => {
    renderSummary(summary())

    expect(screen.getByText('71.210,29 ₼')).toHaveClass('whitespace-nowrap')
    expect(screen.getByText(/\+26\.869,51 ₼/).closest('p')).toHaveClass('whitespace-nowrap')
  })

  /** "Məlum qiymətlər üzrə" is a caveat, not a headline, and it is not repeated as primary copy. */
  it('does not qualify the headline when nothing is missing', () => {
    renderSummary(summary())

    expect(screen.queryByText(/Məlum qiymətlər üzrə/)).toBeNull()
    expect(screen.queryByText(/natamamdır/)).toBeNull()
  })
})

/**
 * The rule this screen exists to respect. The big number is the month; the difference under it is over the
 * objects that have both sides of a comparison, and the screen says which objects those are.
 */
describe('the cohort the difference is over', () => {
  /**
   * An object that ordered this month with nothing behind it is in the month's total and not in the
   * comparison. Without this line a reader sees 71.210,29 ₼ and a difference computed from 71.030,25 ₼ and
   * has no way to tell that the two do not belong to each other.
   */
  it('names the compared objects and their money when some of the month was not compared', () => {
    renderSummary(september())

    expect(screen.getByText(/Müqayisə olunan 23 obyekt: 71\.030,25 ₼/)).toBeInTheDocument()
  })

  it('names who was left out, and says it is the window that did not reach them', () => {
    renderSummary(september())

    expect(screen.getByText(/Müqayisəyə daxil deyil: EXPO \(bu ay 180,04 ₼\) — keçən ay sifarişi yoxdur/))
      .toBeInTheDocument()
  })

  /** Six months back, "keçən ay" would be a false reason. The window is named, not the month. */
  it('names the window rather than last month on an averaged basis', () => {
    renderSummary(september({ basis: 'Previous3MonthAverage', baselinePeriods: ['2026-06-01', '2026-07-01', '2026-08-01'] }))

    expect(screen.getByText(/müqayisə dövründə sifarişi yoxdur/)).toBeInTheDocument()
    expect(screen.queryByText(/keçən ay sifarişi yoxdur/)).toBeNull()
  })

  it('says none of that when every object that ordered was compared', () => {
    renderSummary(summary())

    expect(screen.queryByText(/Müqayisə olunan 26 obyekt:/)).toBeNull()
    expect(screen.queryByText(/Müqayisəyə daxil deyil/)).toBeNull()
    expect(screen.getByText(/Keçən ay \(Avqust 2026\):/)).toHaveTextContent('44.340,78 ₼')
  })

  /**
   * The one metric this screen must never show: a baseline summed over every object that has history, set
   * beside a month summed over the objects that ordered. Two sets, one subtraction, and a difference that
   * moves when an object joins or leaves rather than when spending changes.
   */
  it('shows one baseline, and it is the cohort\'s', () => {
    renderSummary(september())

    expect(screen.getByText(/Keçən ay \(Avqust 2026\):/)).toHaveTextContent('44.340,78 ₼')
    expect(screen.queryByText(/45\.040,78 ₼/)).toBeNull()
  })
})

describe('incomplete price data', () => {
  it('is one short line naming how many objects it affects', () => {
    renderSummary(summary({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 10,
    }))

    expect(screen.getByText('10 obyektin sifarişində qiyməti olmayan sətir var')).toBeInTheDocument()
  })

  /**
   * A month supplied entirely from the company's own store is complete. The backend counts internal supply
   * apart from a missing price, and the screen must not put the two back together.
   */
  it('says nothing when the only unpriced lines are internally supplied', () => {
    renderSummary(summary({
      current: amount({ isComplete: true, missingPriceItemCount: 0, priceNotRequiredItemCount: 11 }),
      locationsWithMissingPrices: 0,
    }))

    expect(screen.queryByText(/qiyməti olmayan sətir/)).toBeNull()
  })
})

describe('object coverage', () => {
  /**
   * Out of the objects that have ever ordered, not out of the catalogue: an object that has never placed an
   * order cannot be described as missing one, and counting it in the denominator would say it was.
   */
  it('counts the objects that ordered, without saying why the rest did not', () => {
    renderSummary(september())

    const card = screen.getByText('Bu ay sifariş olan obyektlər').closest('section')!
    expect(within(card).getByText('24 / 26 obyekt üzrə sifariş var')).toBeInTheDocument()
    expect(within(card).getByText('2 obyekt üzrə sifariş qeydə alınmayıb')).toBeInTheDocument()
  })

  /**
   * The system knows an object has no request. It does not know whether one is late, was not needed, or was
   * never expected — so it must not imply any of them.
   */
  it('never says an object has "not sent yet"', () => {
    renderSummary(september())

    expect(screen.queryByText(/hələ göndərməyib/)).toBeNull()
    expect(screen.queryByText(/hələ/)).toBeNull()
  })

  it('says nothing extra when every object has ordered', () => {
    renderSummary(summary())

    expect(screen.queryByText(/obyekt üzrə sifariş qeydə alınmayıb/)).toBeNull()
  })
})

describe('data coverage', () => {
  /**
   * Three counts that are mutually exclusive and add up to the objects the table has rows for. The old chips
   * overlapped — an object could be in three of them at once — so nothing could be checked against anything.
   */
  it('chips the groups and shows them adding up', () => {
    renderSummary(september())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    const counts = ['Müqayisə olunan', 'Bazası yoxdur', 'Sifariş qeydə alınmayıb']
      .map((label) => within(coverage).getByText(label).closest('div')!.textContent)

    expect(counts).toEqual([
      expect.stringContaining('23'),
      expect.stringContaining('1'),
      expect.stringContaining('2'),
    ])
    expect(within(coverage).getByText('= 26 obyekt')).toBeInTheDocument()
  })

  /** A chip on every healthy row is one a reader learns to skip, and the real ones get skipped with it. */
  it('leaves a clean month with the compared count and no amber at all', () => {
    renderSummary(summary())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getByText('Müqayisə olunan').closest('div')).not.toHaveClass('bg-amber-50')
    expect(within(coverage).queryByText('Bazası yoxdur')).toBeNull()
    expect(within(coverage).queryByText('Sifariş qeydə alınmayıb')).toBeNull()
    expect(within(coverage).getByText('= 26 obyekt')).toBeInTheDocument()
  })

  it('ambers only the groups that have somebody in them', () => {
    renderSummary(september())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getByText('Sifariş qeydə alınmayıb').closest('div')).toHaveClass('bg-amber-50')
    expect(within(coverage).getByText('Müqayisə olunan').closest('div')).not.toHaveClass('bg-amber-50')
  })

  /**
   * The quality flags describe objects already counted in the groups to their left, so they are kept out of
   * the arithmetic — and the price one says it counts objects, because it is the only chip that counts
   * something other than a comparison group.
   */
  it('keeps the quality flags out of the sum and says what the price one counts', () => {
    renderSummary(september({ locationsWithPartialHistory: 3, locationsWithMissingPrices: 10 }))

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getByText('Tarixçə natamam').closest('div')).toHaveTextContent('3')
    expect(within(coverage).getByText('Qiymət yoxdur · 10 obyekt')).toBeInTheDocument()
    expect(within(coverage).getByText('= 26 obyekt')).toBeInTheDocument()
  })

  /** Whether the dashboard should also count the objects that have never ordered is Task 3's question. */
  it('does not chip the objects that have never ordered', () => {
    renderSummary(september())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).queryByText('Tarixçə yoxdur')).toBeNull()
  })
})

describe('the objects left out of the comparison', () => {
  function block() {
    return within(screen.getByText('Müqayisədən kənarda qalan obyektlər').closest('section')!)
  }

  it('names them, and says when each last ordered and for how much', () => {
    renderSummary(september())

    expect(block().getByText('Sifariş qeydə alınmayıb (2)')).toBeInTheDocument()
    expect(block().getByText('Puşkin parkı').closest('li')).toHaveTextContent('son sifariş May 2026, 700,00 ₼')
    expect(block().getByText('Təmir-tikinti').closest('li')).toHaveTextContent('son sifariş İyul 2026, 4.645,05 ₼')
  })

  /** Never an average: an object that did not order is not an object that ordered its usual amount. */
  it('never shows an average for an object that did not order', () => {
    renderSummary(september())

    expect(block().queryByText(/ortalama/i)).toBeNull()
  })

  /** An object with a month and no baseline is in the month's total; the block says what it contributed. */
  it('names the object that ordered with nothing to compare it against', () => {
    renderSummary(september())

    expect(block().getByText('Müqayisə bazası yoxdur (1)')).toBeInTheDocument()
    expect(block().getByText('EXPO').closest('li')).toHaveTextContent('bu ay 180,04 ₼')
  })

  /** Each name opens the object, carrying the comparison the reader is currently looking at. */
  it('links every name to the object page', () => {
    renderSummary(september())

    expect(block().getByRole('link', { name: 'Puşkin parkı' })).toHaveAttribute('href', '/locations/32?basis=last')
    expect(block().getByRole('link', { name: 'EXPO' })).toHaveAttribute('href', '/locations/31?basis=last')
  })

  it('is absent entirely when every object was compared', () => {
    renderSummary(summary())

    expect(screen.queryByText('Müqayisədən kənarda qalan obyektlər')).toBeNull()
  })
})
