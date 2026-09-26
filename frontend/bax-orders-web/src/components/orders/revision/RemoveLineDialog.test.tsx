import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderRequestItem } from '../../../api/orders'
import { RemoveLineDialog } from './RemoveLineDialog'

/**
 * Brief (Task 17), acceptance 2: "Sətri silmə təsdiqi açıqdır → fona klik edilir → pəncərə bağlanmır və heç nə
 * silinmir." Closing is refusing (17.3): `Escape` is «İmtina», and nothing is ever removed because the dialog closed.
 */
const revisionsApi = vi.hoisted(() => ({ removeOrderItem: vi.fn() }))
vi.mock('../../../api/revisions', async () => ({
  ...(await vi.importActual<typeof import('../../../api/revisions')>('../../../api/revisions')),
  ...revisionsApi,
}))

function item(): OrderRequestItem {
  return {
    orderRequestItemId: 501,
    productId: 11,
    productCode: 'PRD-000011',
    productName: 'York qatlama salfet',
    productVariantId: 21,
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    quantity: 30,
    unitPrice: 4.1,
    lineTotal: 123,
    supplierId: null,
    supplierName: null,
    pricingMode: 'PriceRequired',
    sourceSupplierName: null,
    categoryPath: [],
    source: null,
    sourceOrderRequestItemId: null,
    orderLineType: 'Monthly',
  }
}

function renderDialog() {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn(), onStale: vi.fn() }
  render(<RemoveLineDialog orderRequestId={105} item={item()} rowVersion="AAAAAAAAB9E=" {...handlers} />)
  return handlers
}

beforeEach(() => revisionsApi.removeOrderItem.mockReset().mockResolvedValue(undefined))
afterEach(() => vi.clearAllMocks())

describe('closing the line removal', () => {
  it('stays open on a press on the background, and removes nothing', async () => {
    const { onClose, onSaved } = renderDialog()

    await userEvent.click(screen.getByRole('dialog', { name: 'Sətri sil' }).parentElement as HTMLElement)

    expect(screen.getByRole('dialog', { name: 'Sətri sil' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(revisionsApi.removeOrderItem).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('closes on Escape as a refusal: only onClose, and nothing removed', async () => {
    const { onClose, onSaved } = renderDialog()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(revisionsApi.removeOrderItem).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('opens with the focus on «Bağla», not on «Sil»', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Bağla' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Sil' })).not.toHaveFocus()
  })
})
