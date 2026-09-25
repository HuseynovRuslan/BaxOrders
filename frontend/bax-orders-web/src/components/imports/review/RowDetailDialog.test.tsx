import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportRowDetail } from '../../../api/rows'
import { RowDetailDialog } from './RowDetailDialog'

/**
 * Owner decision 17.2: the row detail is one of the dialogs that are read, so a press on its background closes it.
 * It also holds the correction forms, and a form must never lose what was typed to a stray click. So it closes on
 * the background only while nothing is being written and no request is on its way.
 */
const rowsApi = vi.hoisted(() => ({ fetchRow: vi.fn(), includeRow: vi.fn() }))
vi.mock('../../../api/rows', async () => ({
  ...(await vi.importActual<typeof import('../../../api/rows')>('../../../api/rows')),
  ...rowsApi,
}))

function row(overrides: Partial<ImportRowDetail> = {}): ImportRowDetail {
  return {
    id: 812,
    importBatchId: 6,
    sheetName: 'Mart',
    rowNumber: 44,
    sequenceNumber: '17',
    status: 'NeedsReview',
    isExcluded: false,
    exclusionReason: null,
    excludedAtUtc: null,
    parsedQuantity: 12,
    parsedUnitPrice: null,
    parsedRequestPeriod: '2026-03-01',
    calculatedLineTotal: null,
    originalLineTotal: null,
    correctionCount: 0,
    fields: [
      {
        field: 'ProductName',
        column: 'Məhsulun adı',
        sourceValue: 'Maye sabun',
        correctedValue: null,
        effectiveValue: 'Maye sabun',
        isCorrected: false,
        storedAsDate: false,
        isIntentionallyEmpty: false,
      },
    ],
    matches: {
      location: 'Heydər Əliyev Mərkəzi',
      supplier: null,
      responsiblePerson: null,
      category: null,
      product: 'Maye sabun',
      productVariant: null,
      orderUnit: 'ədəd',
      specificationUnit: null,
    },
    issues: [],
    ...overrides,
  }
}

async function renderDialog() {
  const onClose = vi.fn()
  render(<RowDetailDialog importId={6} rowId={812} onClose={onClose} onChanged={() => {}} />)
  await screen.findByRole('dialog', { name: 'Sətir 44 · Mart' })
  return onClose
}

function backdrop() {
  return screen.getByRole('dialog').parentElement as HTMLElement
}

beforeEach(() => {
  rowsApi.fetchRow.mockReset().mockResolvedValue(row())
  rowsApi.includeRow.mockReset()
})
afterEach(() => vi.clearAllMocks())

describe('a press on the row detail’s background', () => {
  it('closes it while it is only read', async () => {
    const onClose = await renderDialog()

    await userEvent.click(backdrop())

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close it while a correction is being typed, and the typed text is kept', async () => {
    const user = userEvent.setup()
    const onClose = await renderDialog()
    await user.click(screen.getByRole('button', { name: 'Düzəlt' }))
    const field = screen.getByRole('textbox')
    await user.type(field, ' 5 litr')

    await user.click(backdrop())

    expect(onClose).not.toHaveBeenCalled()
    expect(field).toHaveValue('Maye sabun 5 litr')
  })

  it('does not close it while an exclusion reason is being written', async () => {
    const user = userEvent.setup()
    const onClose = await renderDialog()
    await user.click(screen.getByRole('button', { name: 'Bu sətri importdan çıxar' }))
    await user.type(screen.getByPlaceholderText('məs. anbar sətridir, sifariş deyil'), 'anbar sətridir')

    await user.click(backdrop())

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('məs. anbar sətridir, sifariş deyil')).toHaveValue('anbar sətridir')
  })

  it('does not close it while a request is on its way', async () => {
    const user = userEvent.setup()
    rowsApi.fetchRow.mockResolvedValue(row({ isExcluded: true, exclusionReason: 'anbar sətridir' }))
    rowsApi.includeRow.mockReturnValue(new Promise(() => {}))
    const onClose = await renderDialog()
    await user.click(screen.getByRole('button', { name: 'Yenidən importa daxil et' }))

    await user.click(backdrop())

    expect(onClose).not.toHaveBeenCalled()
  })
})
