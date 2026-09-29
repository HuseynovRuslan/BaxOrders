import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { DashboardAttention, LocationDashboardRow } from '../../../api/dashboard'
import { AttentionCards } from './AttentionCards'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 1,
    locationCode: 'LOC-000001',
    locationName: 'Obyekt',
    hasCurrentRequest: true,
    currentRequestId: 105,
    current: { ...none, knownAmount: 1000, itemCount: 10, knownPriceItemCount: 10 },
    baseline: { ...none, knownAmount: 800, itemCount: 10, knownPriceItemCount: 10 },
    knownAmountDelta: 200,
    knownAmountPercentChange: 25,
    historyCoverage: 'Complete',
    availableBaselinePeriodCount: 1,
    expectedBaselinePeriodCount: 1,
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 200,
    primaryCauseProduct: { productVariantId: 21, productName: 'Zibil paketi', amount: 150, sameDirectionAmount: 200 },
    explanationIsComplete: true,
    responsibility: { kind: 'AgreedOnLines', personId: 7, personName: 'Elçin Məmmədov', distinctPersonCount: 1, namedLineCount: 10 },
    ...overrides,
  } as LocationDashboardRow
}

function item(overrides: Partial<LocationDashboardRow> = {}): DashboardAttention {
  return { reason: 'LargestIncrease', location: row(overrides), rank: 1, alsoFirstIn: [] }
}

function show(attention: DashboardAttention[], onOpenDetail?: (item: DashboardAttention) => void) {
  return render(
    <MemoryRouter>
      <AttentionCards
        attention={attention}
        summary={{ basis: 'PreviousMonth', baselinePeriods: ['2026-08-01'] } as never}
        selection={{ basis: 'PreviousMonth', from: null, to: null }}
        onOpenDetail={onOpenDetail}
      />
    </MemoryRouter>,
  )
}

function cards(): HTMLElement[] {
  return within(screen.getByRole('region', { name: 'Diqqət tələb edən obyektlər' })).getAllByRole('article')
}

/**
 * The approved design's outlier cards, on this product's own figures. Each answers four questions in the order
 * a manager asks them — which object, who is answerable, how far it moved, because of what — and nothing on a
 * card is a claim the data does not carry.
 */
describe('the objects whose money moved most', () => {
  it('ranks by the money moved and shows three', () => {
    show([
      item({ locationId: 1, locationName: 'Kiçik', knownAmountDelta: 200 }),
      item({ locationId: 2, locationName: 'Ən böyük', knownAmountDelta: -9_000 }),
      item({ locationId: 3, locationName: 'Orta', knownAmountDelta: 4_000 }),
      item({ locationId: 4, locationName: 'Dördüncü', knownAmountDelta: 100 }),
    ])

    expect(cards().map((card) => within(card).getByRole('heading').textContent))
      .toEqual(['Ən böyük', 'Orta', 'Kiçik'])
  })

  /**
   * The badge is taken from the card's place in this block, which is ranked by money — so «ən böyük» is only
   * ever on the card that is. A badge claiming it while sitting second is the one thing on the card a reader
   * could catch out.
   */
  it('claims "the largest" only on the card that is', () => {
    show([
      item({ locationId: 1, locationName: 'Birinci', knownAmountDelta: 9_000 }),
      item({ locationId: 2, locationName: 'İkinci', knownAmountDelta: 4_000 }),
    ])

    expect(cards()[0]).toHaveTextContent('ƏN BÖYÜK MƏBLƏĞ ARTIMI')
    expect(cards()[1]).toHaveTextContent('MƏBLƏĞ ARTIMI')
    expect(cards()[1]).not.toHaveTextContent('ƏN BÖYÜK')
  })

  /** A saving is not a fault, so it never carries the words or the colour of one. */
  it('names a fall as a fall', () => {
    show([item({ knownAmountDelta: -2_000, primaryCauseAmount: -2_000, primaryCause: 'NoLongerOrdered' })])

    expect(cards()[0]).toHaveTextContent('MƏBLƏĞ AZALMASI')
    expect(cards()[0]).toHaveTextContent('−2.000,00 ₼')
    expect(cards()[0]).toHaveTextContent('xərc azalıb')
  })

  it('names the real person the order is answerable to', () => {
    show([item()])

    expect(cards()[0]).toHaveTextContent('Cavabdeh: Elçin Məmmədov')
  })

  /**
   * Several people on the lines is an answer, and it is not a name. Picking the majority would put a name on
   * a decision nobody made.
   */
  it('says "several" rather than choosing one of them', () => {
    show([item({
      responsibility: { kind: 'Several', personId: null, personName: null, distinctPersonCount: 3, namedLineCount: 12 },
    })])

    expect(cards()[0]).toHaveTextContent('Cavabdeh: Bir neçə cavabdeh')
  })

  it('says nobody is named when nobody is', () => {
    show([item({
      responsibility: { kind: 'None', personId: null, personName: null, distinctPersonCount: 0, namedLineCount: 0 },
    })])

    expect(cards()[0]).toHaveTextContent('Cavabdeh: Cavabdeh təyin edilməyib')
  })

  it('carries the cause and the product the object\'s own row gives', () => {
    show([item({ primaryCause: 'PriceChange', primaryCauseAmount: 200 })])

    expect(cards()[0]).toHaveTextContent('Əsas səbəb: Qiymət artımı')
    expect(cards()[0]).toHaveTextContent('Zibil paketi')
    expect(cards()[0]).toHaveTextContent('artımların 75%-i')
  })

  /**
   * A difference against a baseline that only partly exists says so. Without it the figure reads as a
   * comparison with six months when it is a comparison with two.
   */
  it('says when the baseline it is measured against is only partly there', () => {
    show([item({ historyCoverage: 'Partial', availableBaselinePeriodCount: 2, expectedBaselinePeriodCount: 6 })])

    expect(cards()[0]).toHaveTextContent('Baza 2/6 ay')
  })

  it('marks money that is still missing a price', () => {
    show([item({
      current: { ...none, knownAmount: 1000, itemCount: 10, knownPriceItemCount: 8, missingPriceItemCount: 2, isComplete: false },
      explanationIsComplete: false,
    })])

    // The mark is "⚠ 2"; what it means is its name to a screen reader and its hover text.
    const mark = within(cards()[0]).getByRole('img')
    expect(mark).toHaveTextContent('⚠ 2')
    expect(mark).toHaveAccessibleName(expect.stringContaining('qiymət'))
  })

  it('says plainly when there is nothing to compare against', () => {
    show([item({ primaryCause: null, primaryCauseAmount: null, primaryCauseProduct: null })])

    expect(cards()[0]).toHaveTextContent('Müqayisə üçün əvvəlki ay yoxdur')
  })

  it('opens the object, and the detail beside the page', async () => {
    const onOpenDetail = vi.fn()
    show([item({ locationId: 43, locationName: 'Nərimanov heykəli', currentRequestId: 907 })], onOpenDetail)

    expect(screen.getByRole('link', { name: /Nərimanov heykəli/ }))
      .toHaveAttribute('href', '/orders/907?basis=last')

    await userEvent.click(screen.getByRole('button', { name: 'Nərimanov heykəli — təfərrüat' }))
    expect(onOpenDetail).toHaveBeenCalledOnce()
  })

  it('leaves out an object with no difference, and draws nothing when none has one', () => {
    const { container } = show([item({ knownAmountDelta: null })])

    expect(container).toBeEmptyDOMElement()
  })
})
