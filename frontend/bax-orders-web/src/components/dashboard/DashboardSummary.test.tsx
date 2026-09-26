import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { AnalyticsComparisonBasis } from '../../api/analytics'
import type { DashboardLineTypeSplit, DashboardAmount, ManagementDashboardSummary } from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { describeBasisWithRange, knownAmountHint } from '../analytics/format'
import { comparedOnly, partition, partitionMember } from '../../test/dashboardFixtures'
import {
  DashboardCoverageChips,
  DashboardExceptions,
  DashboardHeadline,
  type CoverageChip,
} from './DashboardSummary'

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
  const base: ManagementDashboardSummary = {
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
    lineTypes: monthlyOnly(amount()),
    ...overrides,
  }

  return { ...base, lineTypes: monthlyOnly(base.current) }
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

/** The headline figure: the line right after the heading row, "Sentyabr 2026 sifarişlərinin məbləği". */
function headline(): HTMLElement {
  return screen.getByText(/sifarişlərinin məbləği/).parentElement!.nextElementSibling as HTMLElement
}

/** The cohort block, found by its name — "Müqayisə olunan 23 obyekt". */
function cohort(count: number): HTMLElement {
  return screen.getByRole('group', { name: `Müqayisə olunan ${count} obyekt` })
}

/** The visible line under the headline, not the ⓘ's note with the same words. */
/**
 * What the month was made of: the planned material and what was asked for on top of it. It sits between the
 * headline (with its qualifier, when there is one) and the cohort block — the second question a manager asks
 * about the number above, and before anything about the comparison.
 */
function lineTypeSplit(): HTMLElement {
  return screen.getByText('Aylıq sifarişlər').closest('div')!
}

function missingPriceLine(): HTMLElement | null {
  return screen.queryAllByText(knownAmountHint).find((element) => element.closest('[role="note"]') === null) ?? null
}

describe('the headline amount', () => {
  it('is named by its own month rather than as "the current period"', () => {
    renderSummary(summary())

    expect(screen.getByText(/Sentyabr 2026 sifarişlərinin məbləği/)).toBeInTheDocument()
    expect(screen.queryByText(/Cari dövrün məbləği/)).toBeNull()
  })

  /**
   * Task 21 (21.2a.1, .3): the month's real total is the headline, and nothing coloured and no percentage sits
   * under it. What follows it is the cohort block — the difference is the cohort's, and it is inside that block.
   */
  it('is the whole month, with the cohort block directly beneath it, when nothing was left out', () => {
    renderSummary(summary())

    const total = headline()
    expect(total).toHaveTextContent(/^71\.210,29 ₼$/)
    expect(total.nextElementSibling).toBe(lineTypeSplit())
    expect(lineTypeSplit().nextElementSibling).toBe(cohort(26))
  })

  /**
   * Brief 21: "baş rəqəm müqayisə edilən rəqəm deyil". The total stays the headline (21.2); the cohort is named
   * under it, as a block of its own, with its own this month, baseline and difference (21.2a.2), and the
   * percentage beside "Fərq" inside it, never beside the total (21.2a.3). No figure is recomputed.
   */
  it('keeps the total as the headline and names the cohort under it, with its own figures, when an object was left out', () => {
    renderSummary(september())

    const total = headline()
    expect(total).toHaveTextContent(/^71\.210,29 ₼$/)
    const block = cohort(23)
    expect(total.nextElementSibling).toBe(lineTypeSplit())
    expect(lineTypeSplit().nextElementSibling).toBe(block)

    expect(block).toHaveTextContent('Müqayisə olunan 23 obyekt · Keçən ay (Avqust 2026)')
    const figures = within(block).getByText('71.030,25 ₼').closest('p')!
    expect(figures).toHaveTextContent(/^Bu ay 71\.030,25 ₼ Baza 44\.340,78 ₼ Fərq \+26\.689,47 ₼ · \+60,19%$/)
    expect(within(block).getByText('+26.689,47 ₼')).toHaveClass('font-semibold', 'text-red-700')
    expect(within(block).getByText('+60,19%')).toHaveClass('text-red-700')
    expect(within(block).getByText('71.030,25 ₼')).toHaveClass('font-medium', 'text-slate-700')
    // The percentage is the cohort's and nothing else's.
    expect(screen.getAllByText('+60,19%')).toHaveLength(1)
  })

  /** Owner decision 9.1: the direction of the cost, in words — "xərc artıb / azalıb", never a verdict. */
  it('says which way it went and against what, in words', () => {
    renderSummary(summary({
      basis: 'Previous6MonthAverage',
      baselinePeriods: [],
      knownAmountDelta: -22561.84,
    }))

    expect(screen.getByText('Son 6 ayın ortalamasına görə xərc azalıb')).toBeInTheDocument()
    const block = cohort(26)
    expect(within(block).getByText('Son 6 ayın ortalaması')).toBeInTheDocument()
    expect(within(block).getByText('44.340,78 ₼').parentElement).toHaveTextContent(/^Baza 44\.340,78 ₼$/)
  })

  it('says a rise in cost is a rise in cost (9.1)', () => {
    renderSummary(summary())

    expect(screen.getByText('Keçən aya görə xərc artıb')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/yaxşı|pis|yüksəkdir|aşağıdır/i)
  })

  it('says it in words under the cohort\'s figures too', () => {
    renderSummary(september())

    expect(within(cohort(23)).getByText('Keçən aya görə xərc artıb')).toBeInTheDocument()
  })

  /** 9.1: a cost that went up is red and one that went down is green. Direction, never "good" or "bad". */
  it('colours the change by direction alone', () => {
    const { unmount } = renderSummary(summary({
      knownAmountDelta: -22561.84,
      knownAmountPercentChange: -31.8,
    }))
    expect(screen.getByText('−22.561,84 ₼')).toHaveClass('text-emerald-700')
    expect(screen.getByText('−31,8%')).toHaveClass('text-emerald-700')
    unmount()

    renderSummary(summary({ knownAmountDelta: 10626.82, knownAmountPercentChange: 17.54 }))
    expect(screen.getByText('+10.626,82 ₼')).toHaveClass('text-red-700')
    expect(screen.getByText('+17,54%')).toHaveClass('text-red-700')
    expect(document.querySelector('.text-rose-700')).toBeNull()
    // The sums are never coloured: they are amounts, not directions.
    expect(headline().className).not.toMatch(/red|emerald/)
    expect(within(cohort(26)).getByText('71.210,29 ₼').className).not.toMatch(/red|emerald/)
    expect(within(cohort(26)).getByText('44.340,78 ₼').className).not.toMatch(/red|emerald/)
  })

  it('never breaks a money value between the amount and its manat sign', () => {
    renderSummary(summary())

    expect(headline()).toHaveClass('whitespace-nowrap')
    // Each label is glued to its figure, so a line that wraps moves the pair together (21.2a.6).
    const block = cohort(26)
    expect(within(block).getByText('71.210,29 ₼').parentElement).toHaveClass('whitespace-nowrap')
    expect(within(block).getByText('44.340,78 ₼').parentElement).toHaveClass('whitespace-nowrap')
    const difference = within(block).getByText('+26.869,51 ₼').parentElement!
    expect(difference).toHaveClass('whitespace-nowrap')
    expect(difference).toHaveTextContent(/^Fərq \+26\.869,51 ₼ · \+60,6%$/)
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

    expect(within(cohort(23)).getByText('71.030,25 ₼').parentElement).toHaveTextContent(/^Bu ay 71\.030,25 ₼$/)
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

  /**
   * Task 21 (21.2a): one arrangement for every month. When every object that ordered was compared, the cohort is
   * still named, its "Bu ay" is the headline's figure — which says plainly that the cohort is the whole month —
   * and nobody is named as left out.
   */
  it('still names the cohort when every object that ordered was compared, and names nobody as left out', () => {
    renderSummary(summary())

    const block = cohort(26)
    expect(block).toHaveTextContent('Müqayisə olunan 26 obyekt · Keçən ay (Avqust 2026)')
    expect(within(block).getByText('71.210,29 ₼').parentElement).toHaveTextContent(/^Bu ay 71\.210,29 ₼$/)
    expect(within(block).getByText('44.340,78 ₼').parentElement).toHaveTextContent(/^Baza 44\.340,78 ₼$/)
    expect(screen.queryByText(/Müqayisəyə daxil deyil/)).toBeNull()
  })

  /**
   * The one metric this screen must never show: a baseline summed over every object that has history, set
   * beside a month summed over the objects that ordered. Two sets, one subtraction, and a difference that
   * moves when an object joins or leaves rather than when spending changes.
   */
  it('shows one baseline, and it is the cohort\'s', () => {
    renderSummary(september())

    expect(within(cohort(23)).getByText('44.340,78 ₼').parentElement).toHaveTextContent(/^Baza 44\.340,78 ₼$/)
    expect(screen.getAllByText('44.340,78 ₼')).toHaveLength(1)
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

  /**
   * Task 21, brief acceptance 3: that the total leaves those lines out is said on a visible line under it, not
   * only behind the ⓘ — in the ⓘ's own words (Task 2), and in amber, because it is about a price somebody owes.
   */
  it('says under the headline, without a click, that the unpriced lines are not in it', () => {
    renderSummary(summary({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 10,
    }))

    const line = missingPriceLine()!
    expect(line).toHaveTextContent(/^Qiyməti olmayan sətirlər bu məbləğə daxil deyil\.$/)
    expect(line).toBeVisible()
    expect(line).toHaveClass('text-xs', 'text-amber-800')
    // Directly under the total, and the cohort block right after it: nothing else comes between.
    expect(headline().nextElementSibling).toBe(line)
    expect(line.nextElementSibling).toBe(lineTypeSplit())
    expect(lineTypeSplit().nextElementSibling).toBe(cohort(26))
    // The ⓘ and the amber button stay as they were.
    expect(screen.getByRole('button', { name: 'Məbləğ necə hesablanır?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10 obyektin sifarişində qiyməti olmayan sətir var' })).toBeInTheDocument()
  })

  it('leaves that line out when nothing is missing, rather than saying it about nothing', () => {
    renderSummary(summary())

    expect(missingPriceLine()).toBeNull()
    expect(headline().nextElementSibling).toBe(lineTypeSplit())
    expect(lineTypeSplit().nextElementSibling).toBe(cohort(26))
    // The ⓘ still explains the rule.
    expect(screen.getByRole('button', { name: 'Məbləğ necə hesablanır?' })).toBeInTheDocument()
  })

  it('leaves that line out when the only unpriced lines are internally supplied', () => {
    renderSummary(summary({
      current: amount({ isComplete: true, missingPriceItemCount: 0, priceNotRequiredItemCount: 11 }),
      locationsWithMissingPrices: 0,
    }))

    expect(missingPriceLine()).toBeNull()
  })
})

/**
 * Task 21 (21.2a): one arrangement, whatever the basis and whether or not an object was left out. The same
 * elements come in the same order; only the basis words, the figures, and the two lines allowed to come and go
 * — the missing-price line and the objects left out — differ.
 */
describe('one arrangement for every basis and every month', () => {
  const bases: [AnalyticsComparisonBasis, string[]][] = [
    ['PreviousMonth', ['2026-08-01']],
    ['Previous3MonthAverage', ['2026-06-01', '2026-07-01', '2026-08-01']],
    ['Previous6MonthAverage', ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']],
    ['AllPriorMonths', ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']],
    ['CustomRange', ['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']],
  ]

  // Ten fixtures: every basis, on a month with nothing left out and on September with EXPO Center left out.
  const fixtures = bases.flatMap(([basis, baselinePeriods]) => [
    { name: `${basis}, nothing left out`, value: summary({ basis, baselinePeriods }), compared: 26, percent: '+60,6%' },
    { name: `${basis}, EXPO Center left out`, value: september({ basis, baselinePeriods }), compared: 23, percent: '+60,19%' },
  ])

  /** An element's own words, without its children's. */
  function ownText(element: Element): string {
    return Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('')
      .trim()
  }

  /** The two lines 21.2a lets come and go. */
  function isConditional(element: Element): boolean {
    const line = element.closest('p')
    return line !== null && line.closest('[role="note"]') === null
      && (line.textContent === knownAmountHint || (line.textContent ?? '').startsWith('Müqayisəyə daxil deyil'))
  }

  /** The headline section as a sequence: each element's tag and role, and the words that never change. */
  function shape(): string[] {
    const fixedWords = new Set(['Bu ay', 'Baza', 'Fərq', '·'])
    return Array.from(headline().closest('section')!.querySelectorAll('*'))
      .filter((element) => !isConditional(element))
      .map((element) => {
        const role = element.getAttribute('role')
        const words = ownText(element)
        return `${element.tagName.toLowerCase()}${role ? `[${role}]` : ''}${fixedWords.has(words) ? `:${words}` : ''}`
      })
  }

  it.each(fixtures)('keeps the total as the headline and the percentage inside the named cohort: $name', ({ value, compared, percent }) => {
    renderSummary(value)

    expect(headline()).toHaveTextContent(/^71\.210,29 ₼$/)
    const block = cohort(compared)
    expect(block).toHaveTextContent(`Müqayisə olunan ${compared} obyekt · ${describeBasisWithRange(value.basis, value.baselinePeriods)}`)
    const figures = within(block).getByText(percent).closest('p')!
    expect(figures).toHaveTextContent(/^Bu ay \S+ ₼ Baza 44\.340,78 ₼ Fərq \+\S+ ₼ · \+\S+%$/)
    expect(screen.getAllByText(percent)).toHaveLength(1)
    expect(headline().nextElementSibling).toBe(lineTypeSplit())
    expect(lineTypeSplit().nextElementSibling).toBe(block)
  })

  it('draws the same elements in the same order in all ten', () => {
    const shapes = fixtures.map(({ value }) => {
      const { unmount } = renderSummary(value)
      const result = shape()
      unmount()
      return result
    })

    expect(shapes[0]).toContain('div[group]')
    expect(shapes[0].filter((part) => /:(Bu ay|Baza|Fərq)$/.test(part))).toEqual(['span:Bu ay', 'span:Baza', 'span:Fərq'])
    for (const [index, result] of shapes.entries()) {
      expect(result, fixtures[index].name).toEqual(shapes[0])
    }
  })

  it('shows the missing-price line and the objects left out only when they apply, and in their places', () => {
    renderSummary(september({
      current: amount({ isComplete: false, missingPriceItemCount: 11 }),
      locationsWithMissingPrices: 10,
    }))

    const block = cohort(23)
    expect(headline().nextElementSibling).toBe(missingPriceLine())
    expect(missingPriceLine()!.nextElementSibling).toBe(lineTypeSplit())
    expect(block.lastElementChild).toHaveTextContent(/^Müqayisəyə daxil deyil: EXPO Center/)
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
