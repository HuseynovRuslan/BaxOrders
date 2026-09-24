import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardAmount, ManagementDashboardSummary } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { comparedOnly, partition, partitionMember } from '../../test/dashboardFixtures'
import {
  DashboardCoverageChips,
  DashboardExceptions,
  DashboardHeadline,
  type CoverageChip,
} from './DashboardSummary'

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

/**
 * September 2026 as it really is once the catalogue is the owner's 27 objects (Task 3): two objects with no
 * order, one with no baseline, and Çadır, which has never ordered.
 */
function september(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return summary({
    locationCount: 27,
    locationsWithCurrentRequest: 24,
    locationsWithoutCurrentRequest: 3,
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
        partitionMember(33, 'Təmir-tikinti (ərazidə olan dibçəklərə qulluq)', {
          lastOrderPeriod: '2026-07-01',
          lastOrderKnownAmount: 4645.05,
        }),
      ],
      noBaseline: [partitionMember(31, 'EXPO Center', { currentKnownAmount: 180.04 })],
      noHistory: [partitionMember(51, 'Çadır')],
    }),
    ...overrides,
  })
}

const selection: BasisSelection = { basis: 'PreviousMonth', from: null, to: null }

/**
 * The three parts the page places apart — the headline, the objects left out, the chips — rendered together,
 * in the page's order, so every expectation below reads the dashboard's top as a reader meets it.
 */
function renderSummary(
  value: ManagementDashboardSummary,
  {
    active = null,
    onSelect = () => {},
    onShowMissingPrices = () => {},
  }: {
    active?: CoverageChip | null
    onSelect?: (chip: CoverageChip) => void
    onShowMissingPrices?: () => void
  } = {},
) {
  return render(
    <MemoryRouter>
      <DashboardHeadline summary={value} onShowMissingPrices={onShowMissingPrices} />
      <DashboardExceptions summary={value} selection={selection} />
      <DashboardCoverageChips summary={value} active={active} onSelect={onSelect} />
    </MemoryRouter>,
  )
}

describe('the headline amount', () => {
  it('is named by its own month rather than as "the current period"', () => {
    renderSummary(summary())

    expect(screen.getByText(/Sentyabr 2026 sifarişlərinin məbləği/)).toBeInTheDocument()
    expect(screen.queryByText(/Cari dövrün məbləği/)).toBeNull()
  })

  /**
   * Task 09: only when every object that ordered was compared. Then the month's total is the amount the
   * difference is of, and the change belongs right under it.
   */
  it('is the whole month, with the change directly beneath it, when nothing was left out', () => {
    renderSummary(summary())

    const total = screen.getByText('71.210,29 ₼')
    expect(total.nextElementSibling).toHaveTextContent('+26.869,51 ₼ · +60,6%')
  })

  /**
   * Brief: "İstisna olanda fərq müqayisə olunan məbləğin yanında görünür: 71,030.25 − 44,340.78 = +26,689.47".
   * The difference used to sit under 71.210,29 ₼, and a manager who subtracted the baseline from that got another
   * number. Now the total stands alone and the comparison is written as the subtraction it is, in one line.
   */
  it('is written as a subtraction beside the compared amount when an object was left out', () => {
    renderSummary(september())

    // What is right under the total is the subtraction, never the difference standing on its own.
    const total = screen.getByText('71.210,29 ₼')
    expect(total.nextElementSibling!.textContent).not.toMatch(/^\s*\+26\.689,47/)
    expect(total.nextElementSibling!.textContent).toMatch(/^\s*Müqayisə olunan 23 obyekt/)

    const subtraction = screen.getByText(/Müqayisə olunan 23 obyekt: 71\.030,25 ₼/).closest('p')!
    expect(screen.getByText(/\+26\.689,47 ₼/).closest('p')).toBe(subtraction)
    expect(subtraction).toHaveTextContent('Müqayisə olunan 23 obyekt: 71.030,25 ₼ − Keçən ay (Avqust 2026): 44.340,78 ₼ = +26.689,47 ₼ · +60,19%')
    expect(within(subtraction).getByText(/\+26\.689,47 ₼/)).toHaveClass('font-semibold', 'text-red-700')
    expect(within(subtraction).getByText(/71\.030,25 ₼/)).toHaveClass('font-medium', 'text-slate-700')
  })

  /** Owner decision 9.1: the direction of the cost, in words — "xərc artıb / azalıb", never a verdict. */
  it('says which way it went and against what, in words', () => {
    renderSummary(summary({
      basis: 'Previous6MonthAverage',
      baselinePeriods: [],
      knownAmountDelta: -22561.84,
    }))

    expect(screen.getByText('Son 6 ayın ortalamasına görə xərc azalıb')).toBeInTheDocument()
    expect(screen.getByText(/Son 6 ayın ortalaması:/)).toHaveTextContent('44.340,78 ₼')
  })

  it('says a rise in cost is a rise in cost (9.1)', () => {
    renderSummary(summary())

    expect(screen.getByText('Keçən aya görə xərc artıb')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/yaxşı|pis|yüksəkdir|aşağıdır/i)
  })

  it('says it in words under the subtraction too', () => {
    renderSummary(september())

    expect(screen.getByText('Keçən aya görə xərc artıb')).toBeInTheDocument()
  })

  /** 9.1: a cost that went up is red and one that went down is green. Direction, never "good" or "bad". */
  it('colours the change by direction alone', () => {
    const { unmount } = renderSummary(summary({
      knownAmountDelta: -22561.84,
      knownAmountPercentChange: -31.8,
    }))
    expect(screen.getByText(/−22\.561,84 ₼/).closest('p')).toHaveClass('text-emerald-700')
    unmount()

    renderSummary(summary({ knownAmountDelta: 10626.82, knownAmountPercentChange: 17.54 }))
    expect(screen.getByText(/\+10\.626,82 ₼/).closest('p')).toHaveClass('text-red-700')
    expect(document.querySelector('.text-rose-700')).toBeNull()
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

    expect(screen.getByText(/Müqayisəyə daxil deyil: EXPO Center \(bu ay 180,04 ₼\) — keçən ay sifarişi yoxdur/))
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

  /** Brief: "Qiymət xəbərdarlığından həmin obyektlərə birbaşa keçid." The same words, and now they open them. */
  it('opens those objects when it is clicked', async () => {
    const onShowMissingPrices = vi.fn()
    renderSummary(summary({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 10,
    }), { onShowMissingPrices })

    await userEvent.click(screen.getByRole('button', { name: '10 obyektin sifarişində qiyməti olmayan sətir var' }))

    expect(onShowMissingPrices).toHaveBeenCalledTimes(1)
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
   * Out of every object of the month — the number the chips, the table, the monthly report and the Obyektlər
   * page count too — and the sentence accounts for the rest: the ones that did not order this month, and the
   * one that has never ordered at all (B2, Task 3).
   */
  it('counts the objects that ordered out of every object, and says where the rest are', () => {
    renderSummary(september())

    const card = screen.getByText('Bu ay sifariş olan obyektlər').closest('section')!
    expect(within(card).getByText(
      '24 / 27 obyekt üzrə sifariş var · 2 obyektdə sifariş qeydə alınmayıb · 1 obyektin sistemdə hələ sifarişi yoxdur',
    )).toBeInTheDocument()
    expect(card).toHaveTextContent('24 / 27')
  })

  /**
   * The system knows an object has no request. It does not know whether one is late, was not needed, or was
   * never expected — so it must not imply any of them. "Hələ" is only ever said of an object with no order in
   * the system at all, in the owner's own words for it.
   */
  it('never says an object has "not sent yet"', () => {
    renderSummary(september())

    expect(screen.queryByText(/göndərməyib/)).toBeNull()
    const mentions = screen.queryAllByText(/hələ/)
    expect(mentions.length).toBeGreaterThan(0)
    mentions.forEach((element) => expect(element.textContent).toMatch(/[Ss]istemdə hələ sifarişi yoxdur/))
  })

  it('says nothing extra when every object has ordered', () => {
    renderSummary(summary())

    expect(screen.queryByText(/sifariş qeydə alınmayıb/)).toBeNull()
    expect(screen.queryByText(/hələ sifarişi yoxdur/)).toBeNull()
  })
})

describe('data coverage', () => {
  /**
   * Counts that are mutually exclusive and add up to every object of the month — the objects the table has
   * rows for. The old chips overlapped — an object could be in three of them at once — so nothing could be
   * checked against anything. Sentyabr 2026 on the previous-month basis: 23 + 1 + 2 + 1 = 27.
   */
  /** Task 09: every chip is a button now (brief: "Hər çip klik olunur"). Its count is inside it. */
  it('chips the groups and shows them adding up', () => {
    renderSummary(september())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    const counts = ['Müqayisə olunan', 'Bazası yoxdur', 'Sifariş qeydə alınmayıb', 'Sistemdə hələ sifarişi yoxdur']
      .map((label) => within(coverage).getByText(label).closest('button')!.textContent)

    expect(counts).toEqual([
      expect.stringContaining('23'),
      expect.stringContaining('1'),
      expect.stringContaining('2'),
      expect.stringContaining('1'),
    ])
    expect(within(coverage).getByText('= 27 obyekt')).toBeInTheDocument()
  })

  /** A chip on every healthy row is one a reader learns to skip, and the real ones get skipped with it. */
  it('leaves a clean month with the compared count and no amber at all', () => {
    renderSummary(summary())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getByText('Müqayisə olunan').closest('button')!.className).not.toMatch(/amber/)
    expect(within(coverage).queryByText('Bazası yoxdur')).toBeNull()
    expect(within(coverage).queryByText('Sifariş qeydə alınmayıb')).toBeNull()
    expect(within(coverage).getByText('= 26 obyekt')).toBeInTheDocument()
  })

  /**
   * Brief: "narıncı rəng çox işlənir". Amber means a price somebody owes, so only the price chip has it; a group
   * is a situation, not something anybody owes.
   */
  it('ambers only the price chip', () => {
    renderSummary(september({ locationsWithPartialHistory: 3, locationsWithMissingPrices: 10 }))

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' })).toHaveClass('bg-amber-50')
    for (const label of ['Müqayisə olunan', 'Bazası yoxdur', 'Sifariş qeydə alınmayıb', 'Sistemdə hələ sifarişi yoxdur', 'Müqayisə üçün data azdır']) {
      expect(within(coverage).getByText(label).closest('button')!.className, label).not.toMatch(/amber/)
    }
  })

  /** Brief: "sıfır saylı çip görünmür" — and "Müqayisə olunan" is no exception. The total still counts them. */
  it('shows no chip with nobody in it', () => {
    renderSummary(summary({
      locationCount: 2,
      locationsWithCurrentRequest: 0,
      locationsWithoutCurrentRequest: 2,
      partition: partition({ noOrderThisMonth: [partitionMember(1, 'Bir'), partitionMember(2, 'İki')] }),
    }))

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    expect(within(coverage).getAllByRole('button', { pressed: false }).map((button) => button.textContent))
      .toEqual(['Sifariş qeydə alınmayıb2'])
    expect(within(coverage).queryByText('Müqayisə olunan')).toBeNull()
    expect(within(coverage).queryByText('Müqayisə üçün data azdır')).toBeNull()
    expect(within(coverage).queryByText(/Qiymət yoxdur/)).toBeNull()
    expect(within(coverage).getByText('= 2 obyekt')).toBeInTheDocument()
  })

  it('hands the page the filter of the chip that was clicked', async () => {
    const onSelect = vi.fn()
    renderSummary(september({ locationsWithPartialHistory: 3, locationsWithMissingPrices: 10 }), { onSelect })

    await userEvent.click(screen.getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' }))
    await userEvent.click(screen.getByText('Bazası yoxdur').closest('button')!)
    await userEvent.click(screen.getByText('Müqayisə üçün data azdır').closest('button')!)

    expect(onSelect.mock.calls.map(([chip]) => chip)).toEqual([
      { kind: 'missingPrice' },
      { kind: 'group', group: 'NoBaseline' },
      { kind: 'partialHistory' },
    ])
  })

  it('says which chip is on, to the eye and to a screen reader', () => {
    renderSummary(september({ locationsWithMissingPrices: 10 }), { active: { kind: 'group', group: 'NoBaseline' } })

    const chip = screen.getByText('Bazası yoxdur').closest('button')!
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveClass('ring-2')
    expect(screen.getByRole('button', { name: 'Qiymət yoxdur · 10 obyekt' })).toHaveAttribute('aria-pressed', 'false')
  })

  /**
   * The quality flags describe objects already counted in the groups to their left, so they are kept out of
   * the arithmetic — and the price one says it counts objects, because it is the only chip that counts
   * something other than a comparison group.
   */
  it('keeps the quality flags out of the sum and says what the price one counts', () => {
    renderSummary(september({ locationsWithPartialHistory: 3, locationsWithMissingPrices: 10 }))

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    // Owner decision 5.1: "Tarixçə natamam" is "Müqayisə üçün data azdır".
    expect(within(coverage).getByText('Müqayisə üçün data azdır').closest('button')).toHaveTextContent('3')
    expect(within(coverage).queryByText(/Tarixçə natamam/)).toBeNull()
    expect(within(coverage).getByText('Qiymət yoxdur · 10 obyekt')).toBeInTheDocument()
    expect(within(coverage).getByText('= 27 obyekt')).toBeInTheDocument()
  })

  /**
   * Task 3 answered the question this test used to leave open: an object that has never ordered is one of the
   * company's objects, so it is chipped, and the chips add up to every object rather than to all but it.
   */
  it('chips the objects that have never ordered, plainly', () => {
    renderSummary(september())

    const coverage = screen.getByText('Məlumatın əhatəsi').closest('section')!
    const chip = within(coverage).getByText('Sistemdə hələ sifarişi yoxdur').closest('button')!
    expect(chip).toHaveTextContent('1')
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
    expect(block().getByText('Təmir-tikinti (ərazidə olan dibçəklərə qulluq)').closest('li'))
      .toHaveTextContent('son sifariş İyul 2026, 4.645,05 ₼')
  })

  /** B2: Çadır is listed under its own heading, and nothing further is claimed about it. */
  it('lists the object that has never ordered under its own heading', () => {
    renderSummary(september())

    expect(block().getByText('Sistemdə hələ sifarişi yoxdur (1)')).toBeInTheDocument()
    expect(block().getByText('Çadır').closest('li')).toHaveTextContent(/^Çadır$/)
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
    expect(block().getByText('EXPO Center').closest('li')).toHaveTextContent('bu ay 180,04 ₼')
  })

  /** Each name opens the object, carrying the comparison the reader is currently looking at. */
  it('links every name to the object page', () => {
    renderSummary(september())

    expect(block().getByRole('link', { name: 'Puşkin parkı' })).toHaveAttribute('href', '/locations/32?basis=last')
    expect(block().getByRole('link', { name: 'EXPO Center' })).toHaveAttribute('href', '/locations/31?basis=last')
  })

  it('is absent entirely when every object was compared', () => {
    renderSummary(summary())

    expect(screen.queryByText('Müqayisədən kənarda qalan obyektlər')).toBeNull()
  })
})
