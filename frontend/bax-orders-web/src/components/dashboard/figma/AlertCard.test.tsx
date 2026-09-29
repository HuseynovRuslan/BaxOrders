import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { DashboardAttention, LocationDashboardRow } from '../../../api/dashboard'
import { AlertCard } from './AlertCard'

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
    causes: [
      { category: 'QuantityChange', amount: 300, variantCount: 3 },
      { category: 'NoLongerOrdered', amount: -80, variantCount: 1 },
      { category: 'PriceChange', amount: 0, variantCount: 0 },
    ],
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 300,
    primaryCauseProduct: { productVariantId: 21, productName: 'Zibil paketi', amount: 240, sameDirectionAmount: 300 },
    explanationIsComplete: true,
    supplyChangedVariantCount: 0,
    responsibility: { kind: 'AgreedOnLines', personId: 7, personName: 'Elçin Məmmədov', distinctPersonCount: 1, namedLineCount: 10 },
    ...overrides,
  } as LocationDashboardRow
}

function show(overrides: Partial<LocationDashboardRow> = {}, place = 0) {
  const item: DashboardAttention = { reason: 'LargestIncrease', location: row(overrides), rank: 1, alsoFirstIn: [] }
  return render(
    <MemoryRouter>
      <AlertCard item={item} place={place} selection={{ basis: 'PreviousMonth', from: null, to: null }} />
    </MemoryRouter>,
  )
}

function card(): HTMLElement {
  return screen.getByRole('article')
}

/**
 * The Figma card: short until asked. Its whole idea is that the detail arrives without the page changing
 * under the reader — so what it says closed, and what it opens, both matter.
 */
describe('one object, short until asked', () => {
  /**
   * The mock paints a rising number green, as most products would. In this one a rising number is money
   * leaving, so it is red — and a fall is green. This is the single most consequential inversion in the
   * implementation, and nothing else on the card may quietly re-invert it.
   */
  it('paints a rising cost red and a falling cost green', () => {
    const { rerender } = show({ knownAmountDelta: 200 })
    expect(within(card()).getAllByText(/\+200,00 ₼/)[0]).toHaveClass('text-cost-up')

    rerender(
      <MemoryRouter>
        <AlertCard
          item={{ reason: 'LargestDecrease', location: row({ knownAmountDelta: -200, primaryCauseAmount: -200 }), rank: 1, alsoFirstIn: [] }}
          place={0}
          selection={{ basis: 'PreviousMonth', from: null, to: null }}
        />
      </MemoryRouter>,
    )
    expect(within(card()).getAllByText(/−200,00 ₼/)[0]).toHaveClass('text-cost-down')
  })

  it('claims «ən böyük» only on the first card of the block', () => {
    const { rerender } = show({}, 0)
    expect(card()).toHaveTextContent('Ən böyük Məbləğ artımı')

    rerender(
      <MemoryRouter>
        <AlertCard
          item={{ reason: 'LargestIncrease', location: row(), rank: 1, alsoFirstIn: [] }}
          place={1}
          selection={{ basis: 'PreviousMonth', from: null, to: null }}
        />
      </MemoryRouter>,
    )
    expect(card()).not.toHaveTextContent('Ən böyük')
  })

  it('names the real person the order is answerable to', () => {
    show()

    expect(card()).toHaveTextContent('Cavabdeh: Elçin Məmmədov')
  })

  it('says «several» rather than choosing one of them', () => {
    show({ responsibility: { kind: 'Several', personId: null, personName: null, distinctPersonCount: 3, namedLineCount: 12 } })

    expect(card()).toHaveTextContent('Cavabdeh: Bir neçə cavabdeh')
  })

  it('shows one reason closed, and the rest only when asked', async () => {
    show()

    expect(card()).toHaveTextContent('Əsas səbəb: Miqdar artımı')
    expect(screen.queryByText('Zibil paketi', { exact: false })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Detallara bax →' }))

    expect(screen.getByText(/Zibil paketi/)).toBeInTheDocument()
    expect(card()).toHaveTextContent('Bu ay yazılmayan məhsullar')
  })

  /** Each opened line carries its own direction, which is not always the card's. */
  it('colours each opened line by the way its own money went', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Detallara bax →' }))

    expect(screen.getByText('+240,00 ₼')).toHaveClass('text-cost-up')
    expect(screen.getByText('−80,00 ₼')).toHaveClass('text-cost-down')
  })

  it('leaves out a cause that moved no money', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Detallara bax →' }))

    expect(card()).not.toHaveTextContent('Qiymət')
  })

  /** Neutral: a product moving to the company's own store changed arrangement, not price. */
  it('states an internal-supply change without colouring it', async () => {
    show({ supplyChangedVariantCount: 2 })
    await userEvent.click(screen.getByRole('button', { name: 'Detallara bax →' }))

    const line = screen.getByText(/daxili təminata keçib/).closest('div')!
    expect(within(line).getByText('—')).toHaveClass('text-simple-ink')
  })

  it('closes again', async () => {
    show()
    await userEvent.click(screen.getByRole('button', { name: 'Detallara bax →' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bağla ↑' }))

    expect(screen.queryByText(/Zibil paketi/)).toBeNull()
  })

  it('says plainly when there is nothing to compare against', () => {
    show({ primaryCause: null, primaryCauseAmount: null, primaryCauseProduct: null, causes: [] })

    expect(card()).toHaveTextContent('Müqayisə üçün əvvəlki ay yoxdur')
  })

  it('opens the month\'s own order, carrying the basis that was read', () => {
    show({ locationId: 43, locationName: 'Nərimanov heykəli', currentRequestId: 907 })

    expect(screen.getByRole('link', { name: /Nərimanov heykəli/ }))
      .toHaveAttribute('href', '/orders/907?basis=last')
  })
})
