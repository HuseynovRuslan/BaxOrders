import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LocationDashboardRow, ManagementDashboardSummary } from '../../../api/dashboard'
import { ComparisonChart } from './ComparisonChart'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function row(id: number, name: string, baseline: number, current: number): LocationDashboardRow {
  return {
    locationId: id,
    locationName: name,
    locationCode: `LOC-${id}`,
    current: { ...none, knownAmount: current, knownPriceItemCount: 1 },
    baseline: { ...none, knownAmount: baseline, knownPriceItemCount: 1 },
    knownAmountDelta: current - baseline,
    knownAmountPercentChange: baseline === 0 ? null : ((current - baseline) / baseline) * 100,
  } as LocationDashboardRow
}

const summary = {
  selectedPeriod: '2026-07-01',
  basis: 'PreviousMonth',
  baselinePeriods: ['2026-06-01'],
} as ManagementDashboardSummary

function show(rows: LocationDashboardRow[]) {
  return render(<ComparisonChart summary={summary} rows={rows} />)
}

function section(): HTMLElement {
  return screen.getByRole('region', { name: 'Aylıq xərc dinamikası və müqayisə' })
}

/**
 * recharts measures its own container, which jsdom gives no size, so the bars themselves cannot be asserted
 * here. What can be — and what carries the meaning — is which objects the chart chose, what it folds, and
 * what it says underneath.
 */
describe('the month against its basis', () => {
  /**
   * Named by spend, not by movement: three small objects beside a remainder twenty times their height is a
   * picture that says nothing. Which objects *moved* most is the question the cards below answer.
   */
  it('names the biggest spenders and folds the rest', () => {
    show([
      row(1, 'Böyük xərcli', 10_000, 12_000),
      row(2, 'Orta xərcli', 6_000, 7_000),
      row(3, 'Kiçik xərcli', 3_000, 3_500),
      row(4, 'Dörd', 100, 900),
      row(5, 'Beş', 100, 800),
    ])

    expect(section()).toHaveTextContent('Böyük xərcli')
    expect(section()).toHaveTextContent('Orta xərcli')
    expect(section()).toHaveTextContent('Kiçik xərcli')
    expect(section()).toHaveTextContent('Digər 2 obyekt')
    expect(section()).not.toHaveTextContent('Dörd')
  })

  it('names nothing extra when every object fits', () => {
    show([row(1, 'Bir', 100, 200), row(2, 'İki', 100, 150)])

    expect(section()).not.toHaveTextContent('Digər')
  })

  /**
   * The takeaway is about movement, so it names the object that moved most — which need not be the one that
   * spends most, and a line that confused the two would be quietly wrong.
   */
  it('attributes the change to the object that actually moved most', () => {
    show([
      row(1, 'Ən çox xərcləyən', 20_000, 20_500),
      row(2, 'Ən çox dəyişən', 1_000, 6_000),
    ])

    expect(section()).toHaveTextContent('Ən çox dəyişən obyektinin payına düşür')
    expect(section()).not.toHaveTextContent('Ən çox xərcləyən obyektinin payına düşür')
  })

  it('names both sides of the comparison in its legend', () => {
    show([row(1, 'Bir', 100, 200)])

    expect(section()).toHaveTextContent('Keçən aya görə')
    expect(section()).toHaveTextContent('İyul 2026')
  })

  it('says so when nothing moved', () => {
    show([row(1, 'Bir', 500, 500)])

    expect(section()).toHaveTextContent('Bu ay heç bir obyektin məbləği dəyişməyib')
  })

  it('draws nothing when no object can be compared', () => {
    const { container } = render(
      <ComparisonChart summary={summary} rows={[{ ...row(1, 'Bir', 0, 0), knownAmountDelta: null }]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
