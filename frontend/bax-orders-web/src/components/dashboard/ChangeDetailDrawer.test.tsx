import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { LocationDashboardRow } from '../../api/dashboard'
import { ChangeDetailDrawer } from './ChangeDetailDrawer'

const none = { knownAmount: null, itemCount: 0, knownPriceItemCount: 0, missingPriceItemCount: 0, priceNotRequiredItemCount: 0, isComplete: true }

function row(overrides: Partial<LocationDashboardRow> = {}): LocationDashboardRow {
  return {
    locationId: 43,
    locationCode: 'LOC-000043',
    locationName: 'Nərimanov heykəli',
    hasCurrentRequest: true,
    currentRequestId: 907,
    current: { ...none, knownAmount: 3_246.43, itemCount: 10, knownPriceItemCount: 10 },
    baseline: { ...none, knownAmount: 2_000, itemCount: 9, knownPriceItemCount: 9 },
    knownAmountDelta: 1_246.43,
    knownAmountPercentChange: 62.32,
    expectedBaselinePeriodCount: 1,
    availableBaselinePeriodCount: 1,
    causes: [
      { category: 'QuantityChange', amount: 900, variantCount: 4 },
      { category: 'NewOrders', amount: 500, variantCount: 2 },
      { category: 'NoLongerOrdered', amount: -153.57, variantCount: 1 },
      { category: 'PriceChange', amount: 0, variantCount: 0 },
    ],
    primaryCause: 'QuantityChange',
    primaryCauseAmount: 900,
    primaryCauseProduct: { productVariantId: 21, productName: 'Zibil paketi', amount: 700, sameDirectionAmount: 1_400 },
    explanationIsComplete: true,
    unattributedAmount: 0,
    supplyChangedVariantCount: 0,
    newVariantCount: 2,
    increasedVariantCount: 4,
    decreasedVariantCount: 0,
    unchangedVariantCount: 3,
    noLongerOrderedVariantCount: 1,
    insufficientHistoryVariantCount: 0,
    ...overrides,
  } as LocationDashboardRow
}

function open(overrides: Partial<LocationDashboardRow> = {}, onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <ChangeDetailDrawer
        row={row(overrides)}
        basis="PreviousMonth"
        baselinePeriods={['2026-08-01']}
        selection={{ basis: 'PreviousMonth', from: null, to: null }}
        onClose={onClose}
      />
    </MemoryRouter>,
  )
  return onClose
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name })
}

/**
 * The next question after «Nə dəyişdi?» is «Haradan bilirsən?». It is answered beside the page, out of the same
 * decomposition the object's own page uses — so opening the object afterwards finds the same numbers.
 */
describe('one object opened beside the page', () => {
  it('shows both months and the difference between them', () => {
    open()

    const amounts = section('Rəqəmlər')
    expect(amounts).toHaveTextContent('3.246,43 ₼')
    expect(amounts).toHaveTextContent('2.000,00 ₼')
    expect(amounts).toHaveTextContent('+1.246,43 ₼')
    expect(amounts).toHaveTextContent('62,32%')
  })

  it('names what it is comparing against, beside the figure it is comparing', () => {
    // A figure whose basis is not on screen is a figure the reader has to remember the basis for.
    open()

    expect(section('Rəqəmlər')).toHaveTextContent('Keçən aya görə2.000,00 ₼')
  })

  it('breaks the difference into its causes, largest first', () => {
    open()

    const causes = within(section('Niyə dəyişib?')).getAllByRole('listitem')
    expect(causes[0]).toHaveTextContent('Miqdar artımı')
    expect(causes[0]).toHaveTextContent('Əsas səbəb')
    expect(causes[1]).toHaveTextContent('Yeni məhsullar')
    expect(causes[2]).toHaveTextContent('Bu ay yazılmayan məhsullar')
  })

  it('leaves out a cause that moved no money', () => {
    open()

    expect(within(section('Niyə dəyişib?')).getAllByRole('listitem')).toHaveLength(3)
    expect(section('Niyə dəyişib?')).not.toHaveTextContent('Qiymət')
  })

  it('divides a rise by the rises and a fall by the falls', () => {
    open()

    const causes = within(section('Niyə dəyişib?')).getAllByRole('listitem')
    // 900 of the 1 400 that rose; 500 of the same 1 400; and the one fall is all of the falls.
    expect(causes[0]).toHaveTextContent('artımların 64%-i')
    expect(causes[1]).toHaveTextContent('artımların 36%-i')
    expect(causes[2]).toHaveTextContent('azalmaların 100%-i')
  })

  it('draws each cause against the largest of them', () => {
    open()

    const shares = Array.from(document.querySelectorAll('[data-share]')).map((bar) => bar.getAttribute('data-share'))
    expect(shares).toEqual(['100', '56', '17'])
  })

  it('names the product that did most of the main cause, with its share', () => {
    open()

    expect(section('Niyə dəyişib?')).toHaveTextContent('Zibil paketi')
    expect(section('Niyə dəyişib?')).toHaveTextContent('artımların 50%-i')
  })

  it('counts the products behind the figures, and says nothing of a kind with none', () => {
    open()

    const products = section('Məhsullar')
    expect(products).toHaveTextContent('Yeni məhsul')
    expect(products).toHaveTextContent('Məbləği artıb')
    expect(products).not.toHaveTextContent('Məbləği azalıb')
  })

  it('says outright when part of the difference cannot be attributed', () => {
    open({ unattributedAmount: -120, explanationIsComplete: false })

    expect(screen.getByText(/bölüşdürülə bilmir/)).toHaveTextContent('−120,00 ₼')
  })

  it('sends the reader to the order page for the product-by-product list', () => {
    open()

    expect(screen.getByRole('link', { name: 'Detallara bax' })).toHaveAttribute('href', '/orders/907?basis=last')
    expect(screen.getByText(/Məhsul-məhsul siyahı/)).toBeInTheDocument()
  })

  it('says plainly when there is nothing to compare against', () => {
    open({ causes: [], primaryCause: null, primaryCauseAmount: null, primaryCauseProduct: null, knownAmountDelta: null, knownAmountPercentChange: null })

    expect(section('Niyə dəyişib?')).toHaveTextContent('Müqayisə üçün əvvəlki ay yoxdur')
    expect(section('Rəqəmlər')).toHaveTextContent('—')
  })

  it('closes the way every dialog closes', async () => {
    const onClose = open()

    await userEvent.click(screen.getByRole('button', { name: 'Bağla' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
