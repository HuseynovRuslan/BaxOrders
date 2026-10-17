import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type {
  DashboardPartitionMember,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../../api/dashboard'
import type { BasisSelection } from '../../../analytics/basisParams'
import { costDirectionToneClass } from '../../analytics/format'
import { DifferenceDetail, type ChangesState } from './DifferenceDetail'
import { ExpandableList, initialRows } from './ExpandableList'
import { KpiDetailSection } from './KpiDetailSection'
import { AmountDetail, BaselineDetail, LocationsDetail } from './MonthDetails'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }
const selection = { basis: 'PreviousMonth' } as BasisSelection

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 1,
    locationCode: 'LOC-000001',
    locationName: 'Obyekt',
    hasCurrentRequest: true,
    currentRequestId: 105,
    current: { ...none, knownAmount: 1_000, itemCount: 10, knownPriceItemCount: 10 },
    baseline: { ...none, knownAmount: 800, itemCount: 10, knownPriceItemCount: 10 },
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    availableBaselinePeriodCount: 1,
    expectedBaselinePeriodCount: 1,
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    primaryCauseProduct: null,
    explanationIsComplete: true,
    causes: [{ category: 'QuantityChange', amount: 200, variantCount: 2 }],
    newVariantCount: 0,
    noLongerOrderedVariantCount: 0,
    increasedVariantCount: 2,
    decreasedVariantCount: 0,
    unchangedVariantCount: 3,
    insufficientHistoryVariantCount: 0,
    supplyChangedVariantCount: 0,
    unattributedAmount: 0,
    ...overrides,
  } as LocationDashboardRow
}

function member(overrides: Partial<DashboardPartitionMember> = {}): DashboardPartitionMember {
  return {
    locationId: 1,
    locationCode: 'LOC-000001',
    locationName: 'Obyekt',
    currentKnownAmount: 1_000,
    baselineKnownAmount: 800,
    knownAmountDelta: 200,
    lastOrderPeriod: '2026-08-01',
    lastOrderKnownAmount: 800,
    ...overrides,
  }
}

function summary(overrides: Partial<ManagementDashboardSummary> = {}): ManagementDashboardSummary {
  return {
    selectedPeriod: '2026-09-01',
    basis: 'PreviousMonth',
    baselinePeriods: ['2026-08-01'],
    locationCount: 6,
    locationsWithCurrentRequest: 4,
    locationsWithoutCurrentRequest: 2,
    current: { ...none, knownAmount: 12_000 },
    comparedCurrent: { ...none, knownAmount: 10_000 },
    baseline: { ...none, knownAmount: 9_000 },
    knownAmountDelta: 1_000,
    knownAmountPercentChange: 11.1,
    locationsWithPartialHistory: 0,
    lineTypes: {
      monthly: { ...none, knownAmount: 12_000 },
      outsideMonthly: { ...none, knownAmount: 800 },
      unclassified: { ...none, knownAmount: null },
      unclassifiedItemCount: 0,
    },
    categories: [{ categoryId: 1, name: 'Təmizlik', kind: 'Category', knownAmount: 7_000, itemCount: 40, categoryCount: 1 }],
    partition: {
      locationCount: 6,
      comparableLocationCount: 5,
      compared: [
        member({ locationId: 1, locationName: 'Artan', currentKnownAmount: 6_000, baselineKnownAmount: 4_000 }),
        member({ locationId: 2, locationName: 'Azalan', currentKnownAmount: 4_000, baselineKnownAmount: 5_000 }),
      ],
      noBaseline: [member({ locationId: 3, locationName: 'Bazasız', currentKnownAmount: 2_000, baselineKnownAmount: null })],
      noOrderThisMonth: [member({ locationId: 4, locationName: 'Sifarişsiz', currentKnownAmount: null, lastOrderPeriod: '2026-05-01', lastOrderKnownAmount: 700 })],
      noHistory: [member({ locationId: 5, locationName: 'Təzə', currentKnownAmount: null, lastOrderPeriod: null })],
    },
    ...overrides,
  } as ManagementDashboardSummary
}

const changes = (rows: LocationDashboardRow[]): ChangesState => ({ status: 'success', rows })

/** «Fərq» with its object row kept in state, as the page keeps it in the address. */
function Difference({ rows, initial = null, state }: { rows: LocationDashboardRow[]; initial?: number | null; state?: ChangesState }) {
  const [objectId, setObjectId] = useState<number | null>(initial)
  return (
    <MemoryRouter>
      <DifferenceDetail
        summary={summary()}
        changes={state ?? changes(rows)}
        objectId={objectId}
        onSelectObject={setObjectId}
        onRetry={() => {}}
        selection={selection}
      />
    </MemoryRouter>
  )
}

function names(region: string): string[] {
  return within(screen.getByRole('region', { name: region }))
    .getAllByRole('button', { expanded: false })
    .concat(within(screen.getByRole('region', { name: region })).queryAllByRole('button', { expanded: true }))
    .filter((button) => button.hasAttribute('aria-controls'))
    .map((button) => button.textContent ?? '')
}

/** AC-06: where the month's difference came from, in the server's order, grouped the way a manager reads it. */
describe('«Fərq» — where the difference came from', () => {
  it('says the difference is the compared objects', () => {
    render(<Difference rows={[]} />)

    expect(screen.getByText('Fərq aşağıdakı 2 obyektin fərqlərindən ibarətdir.')).toBeInTheDocument()
  })

  it('groups rises and falls, each in the server’s order, with a count and no total', () => {
    render(<Difference rows={[
      row({ locationId: 11, locationName: 'Böyük artım', knownAmountDelta: 9_000 }),
      row({ locationId: 12, locationName: 'Böyük azalma', knownAmountDelta: -5_000 }),
      row({ locationId: 13, locationName: 'Kiçik artım', knownAmountDelta: 100 }),
      row({ locationId: 14, locationName: 'Sabit', knownAmountDelta: 0 }),
    ]} />)

    expect(screen.getByRole('heading', { name: 'Xərci artan obyektlər (2)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Xərci azalan obyektlər (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dəyişməyən (1)' })).toBeInTheDocument()
    expect(names('Xərci artan obyektlər')[0]).toMatch(/^Böyük artım/)
    expect(names('Xərci artan obyektlər')[1]).toMatch(/^Kiçik artım/)
    // S-3: a group says how many, never a sum of its own.
    expect(screen.getByRole('region', { name: 'Xərci artan obyektlər' })).not.toHaveTextContent('9.100')
  })

  /** D-4: a difference nobody can know (nothing priced on a side) is not an unchanged one. */
  it('keeps an unknown difference apart from an unchanged one', () => {
    render(<Difference rows={[
      row({ locationId: 21, locationName: 'Sıfır', knownAmountDelta: 0 }),
      row({ locationId: 22, locationName: 'Qala baza', knownAmountDelta: null, knownAmountPercentChange: null }),
    ]} />)

    expect(screen.getByRole('heading', { name: 'Dəyişməyən (1)' })).toBeInTheDocument()
    expect(names('Dəyişməyən')).toHaveLength(1)
    expect(names('Dəyişməyən')[0]).toMatch(/^Sıfır/)
    expect(screen.getByRole('heading', { name: 'Fərqi bilinməyən (1)' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Fərqi bilinməyən' })).getByText('—')).toBeInTheDocument()
  })

  it('shows each change in the product’s cost colour, with its direction in words', () => {
    render(<Difference rows={[row({ locationId: 11, locationName: 'Artan', knownAmountDelta: 9_000 })]} />)

    const figure = screen.getByText(/\+9\.000,00/)
    expect(figure).toHaveClass(costDirectionToneClass(9_000))
    expect(within(figure).getByText(', xərc artıb')).toBeInTheDocument()
  })

  it('opens one object at a time, in place, onto its breakdown and its order', async () => {
    render(<Difference rows={[
      row({ locationId: 11, locationName: 'Birinci', knownAmountDelta: 9_000 }),
      row({ locationId: 12, locationName: 'İkinci', knownAmountDelta: 4_000 }),
    ]} />)

    await userEvent.click(screen.getByRole('button', { name: /^Birinci/ }))
    expect(screen.getByRole('button', { name: /^Birinci/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Rəqəmlər' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Detallara bax' })).toHaveAttribute('href', expect.stringContaining('/orders/105'))

    await userEvent.click(screen.getByRole('button', { name: /^İkinci/ }))
    expect(screen.getByRole('button', { name: /^Birinci/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('region', { name: 'Rəqəmlər' })).toHaveLength(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes an open row first on Esc, before anything else', async () => {
    const outer = vi.fn()
    render(
      <div onKeyDown={(event) => !event.defaultPrevented && outer()}>
        <Difference rows={[row({ locationId: 11, locationName: 'Birinci' })]} initial={11} />
      </div>,
    )

    screen.getByRole('button', { name: /^Birinci/ }).focus()
    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: /^Birinci/ })).toHaveAttribute('aria-expanded', 'false')
    expect(outer).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    expect(outer).toHaveBeenCalledTimes(1)
  })

  it('names the objects the comparison could not reach', () => {
    render(<Difference rows={[]} />)

    const outside = within(screen.getByRole('region', { name: 'Müqayisəyə daxil deyil' }))
    expect(outside.getByRole('heading', { name: 'Müqayisəyə daxil deyil (1)' })).toBeInTheDocument()
    expect(outside.getByRole('link', { name: 'Bazasız' })).toBeInTheDocument()
    expect(outside.getByText(/müqayisə bazası yoxdur · bu ay 2\.000,00/)).toBeInTheDocument()
    // Not ordering this month is a different fact, said under «Aktiv obyektlər», not here.
    expect(outside.queryByText('Sifarişsiz')).toBeNull()
  })

  it('says when there is nothing to compare, and keeps the rest of the detail when the list fails', () => {
    const { unmount } = render(<Difference rows={[]} />)
    expect(screen.getByText('Bu ay müqayisə ediləcək obyekt yoxdur.')).toBeInTheDocument()
    unmount()

    render(<Difference rows={[]} state={{ status: 'error', message: 'Şəbəkə xətası', rows: null }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Şəbəkə xətası')
    expect(screen.getByRole('button', { name: 'Yenidən cəhd et' })).toBeInTheDocument()
    expect(screen.getByText('Fərq aşağıdakı 2 obyektin fərqlərindən ibarətdir.')).toBeInTheDocument()
  })
})

/** AC-10: the first rows, then «Hamısını göstər (N)» in place — never a scroll inside the page. */
describe('a long list', () => {
  const items = Array.from({ length: 12 }, (_, index) => index + 1)

  function List({ reveal }: { reveal?: number }) {
    return <ExpandableList items={items} keyOf={(item) => item} label="Obyektlər" reveal={reveal} render={(item) => `Obyekt ${item}`} />
  }

  it('shows the first rows and offers the rest by their number', async () => {
    render(<List />)

    expect(screen.getAllByRole('listitem')).toHaveLength(initialRows)
    await userEvent.click(screen.getByRole('button', { name: 'Obyektlər: hamısını göstər (12)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
    await userEvent.click(screen.getByRole('button', { name: 'Obyektlər: daha az göstər' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(initialRows)
  })

  it('opens itself to show a row that was asked for, and can still be closed', async () => {
    render(<List reveal={10} />)

    expect(screen.getByText('Obyekt 11')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Obyektlər: daha az göstər' }))
    expect(screen.queryByText('Obyekt 11')).toBeNull()
  })
})

/** AC-03: closed, the region takes no room at all; open, it is its content's height. */
describe('the region under the cards', () => {
  function Section({ open }: { open: boolean }) {
    return (
      <KpiDetailSection title="Fərq" figure="+1.000,00 ₼" open={open} focusKey={0} onClose={() => {}}>
        <p>Məzmun</p>
      </KpiDetailSection>
    )
  }

  it('is hidden while closed and named by its card while open', () => {
    const { container, rerender } = render(<Section open={false} />)
    expect(container.querySelector('#kpi-detail')).toHaveAttribute('hidden')
    expect(screen.queryByRole('region', { name: 'Fərq' })).toBeNull()

    rerender(<Section open />)
    expect(container.querySelector('#kpi-detail')).not.toHaveAttribute('hidden')
    expect(screen.getByRole('region', { name: 'Fərq' })).toHaveTextContent('+1.000,00 ₼')
    expect((container.querySelector('#kpi-detail') as HTMLElement).style.minHeight).toBe('')
  })

  it('closes from its ✕ and from «Bağla»', async () => {
    const onClose = vi.fn()
    render(
      <KpiDetailSection title="Fərq" figure="—" open focusKey={0} onClose={onClose}>
        <p>Məzmun</p>
      </KpiDetailSection>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Detalları bağla' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bağla' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('leaves the focus to the object row when it was opened on one («Ətraflı»)', () => {
    const { rerender } = render(
      <KpiDetailSection title="Fərq" figure="—" open focusKey={0} scrollOnOpen={false} onClose={() => {}}><p /></KpiDetailSection>,
    )
    rerender(<KpiDetailSection title="Fərq" figure="—" open focusKey={1} scrollOnOpen={false} onClose={() => {}}><p /></KpiDetailSection>)

    expect(document.activeElement).not.toBe(screen.getByRole('heading', { name: 'Fərq' }))
  })

  it('takes the focus to its heading when the reader opens it, not when a link arrives open', () => {
    const { rerender } = render(
      <KpiDetailSection title="Fərq" figure="—" open focusKey={0} onClose={() => {}}><p /></KpiDetailSection>,
    )
    expect(document.activeElement).toBe(document.body)

    rerender(<KpiDetailSection title="Fərq" figure="—" open focusKey={1} onClose={() => {}}><p /></KpiDetailSection>)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Fərq' }))
  })
})

/** AC-14: the other three cards' details — server figures only. */
describe('the other three details', () => {
  it('«Məbləğ»: the month by kind with no total, by category, and objects by this month’s money', () => {
    render(<MemoryRouter><AmountDetail summary={summary()} scope="Monthly" selection={selection} /></MemoryRouter>)

    const kinds = within(screen.getByRole('region', { name: 'Növ tərkibi' }))
    expect(kinds.getByText('Aylıq sifarişlər')).toHaveClass('font-semibold')
    expect(kinds.getByText('12.000,00 ₼')).toBeInTheDocument()
    expect(kinds.getByText('800,00 ₼')).toBeInTheDocument()
    expect(kinds.queryByText(/12\.800/)).toBeNull()
    expect(kinds.getByText('Təmizlik')).toBeInTheDocument()

    const objects = within(screen.getByRole('region', { name: 'Obyektlər bu ayın məbləğinə görə' }))
    expect(objects.getAllByRole('link').map((link) => link.textContent)).toEqual(['Artan', 'Azalan', 'Bazasız'])
  })

  it('«Müqayisə dövrü»: the rule, how many are compared, and each object’s baseline', () => {
    render(<MemoryRouter><BaselineDetail summary={summary({ locationsWithPartialHistory: 1 })} selection={selection} /></MemoryRouter>)

    expect(screen.getByText(/2 obyekt müqayisədədir\./)).toHaveTextContent('1 obyekt üzrə: müqayisə üçün data azdır.')
    const objects = within(screen.getByRole('region', { name: 'Obyektlərin müqayisə dövrü məbləği' }))
    expect(objects.getAllByRole('link').map((link) => link.textContent)).toEqual(['Azalan', 'Artan'])
  })

  /** D-4: the list holds the number the sentence says; a baseline nobody priced is listed last, as unknown. */
  it('«Müqayisə dövrü»: lists every compared object, an unknown baseline last and unknown', () => {
    const withUnknown = summary()
    withUnknown.partition = {
      ...withUnknown.partition,
      compared: [...withUnknown.partition.compared, member({ locationId: 7, locationName: 'Qala baza', baselineKnownAmount: null })],
    }
    render(<MemoryRouter><BaselineDetail summary={withUnknown} selection={selection} /></MemoryRouter>)

    expect(screen.getByText(/3 obyekt müqayisədədir\./)).toBeInTheDocument()
    const objects = within(screen.getByRole('region', { name: 'Obyektlərin müqayisə dövrü məbləği' }))
    expect(objects.getAllByRole('link').map((link) => link.textContent)).toEqual(['Azalan', 'Artan', 'Qala baza'])
    expect(objects.getAllByRole('listitem')[2]).toHaveTextContent('—')
  })

  it('«Aktiv obyektlər»: who did not order, with their last order, and who did', () => {
    render(<MemoryRouter><LocationsDetail summary={summary()} selection={selection} /></MemoryRouter>)

    const missing = within(screen.getByRole('region', { name: 'Sifariş qeydə alınmayıb' }))
    expect(missing.getByRole('link', { name: 'Sifarişsiz' })).toBeInTheDocument()
    expect(missing.getByText(/son sifariş May 2026, 700,00/)).toBeInTheDocument()
    expect(missing.getByRole('link', { name: 'Təzə' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Bu ay sifariş verənlər' })).getAllByRole('link')).toHaveLength(3)
  })
})
