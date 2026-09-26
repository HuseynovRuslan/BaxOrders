import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderItemProvenance } from '../../api/orders'
import { ItemSourceDrawer } from './ItemSourceDrawer'

/**
 * «Mənbə», the window on where one line came from. Task 23 moved the way to it behind the folded lines and kept
 * everything in it (23.2: "heç bir imkan silinmir"). So every label and every value it shows is listed here, in the
 * order it shows them: a later change that drops one — the file, the import, the sheet, the Excel row, a column of
 * the three readings, a marker, the chain — fails this file, whatever else it does.
 */
const ordersApi = vi.hoisted(() => ({ fetchOrderItemSource: vi.fn() }))

vi.mock('../../api/orders', async () => {
  const actual = await vi.importActual<typeof import('../../api/orders')>('../../api/orders')
  return { ...actual, ...ordersApi }
})

const nbsp = String.fromCharCode(0xa0)

/** A line of a correction, copied from the returned version whose line came from Excel row 3142. */
function imported(): OrderItemProvenance {
  return {
    orderRequestItemId: 501,
    orderRequestId: 105,
    version: 2,
    origin: 'Imported',
    lineage: [
      { orderRequestItemId: 501, orderRequestId: 105, version: 2, status: 'Approved', isImported: false },
      { orderRequestItemId: 401, orderRequestId: 104, version: 1, status: 'ReturnedForCorrection', isImported: true },
    ],
    source: {
      orderRequestItemId: 401,
      orderRequestId: 104,
      materializedAtUtc: '2026-09-22T09:00:00Z',
      importBatchId: 50010,
      importFileName: 'Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx',
      importStatus: 'Imported',
      importRowId: 70,
      sheetName: 'Sentyabr',
      rowNumber: 3142,
      isExcluded: false,
      originalLineTotal: '123',
      calculatedLineTotal: 123,
      fields: [
        {
          column: 'Məhsul',
          sourceValue: 'Yay ayaqqabısı',
          effectiveValue: 'Yay ayaqqabısı',
          isCorrected: false,
          isIntentionallyEmpty: false,
          canonicalValue: 'Yay ayaqqabısı',
        },
        { column: 'Miqdar', sourceValue: '10', effectiveValue: '12', isCorrected: true, isIntentionallyEmpty: false, canonicalValue: null },
        { column: 'Model', sourceValue: 'M-101-S-2', effectiveValue: null, isCorrected: true, isIntentionallyEmpty: true, canonicalValue: null },
      ],
    },
  }
}

function manual(): OrderItemProvenance {
  return {
    orderRequestItemId: 777,
    orderRequestId: 105,
    version: 2,
    origin: 'ManuallyAdded',
    lineage: [{ orderRequestItemId: 777, orderRequestId: 105, version: 2, status: 'Draft', isImported: false }],
    source: null,
  }
}

beforeEach(() => {
  ordersApi.fetchOrderItemSource.mockReset().mockResolvedValue(imported())
})

async function open(onClose = vi.fn()) {
  render(<ItemSourceDrawer orderRequestItemId={501} productName="Yay ayaqqabısı" onClose={onClose} />)
  const dialog = screen.getByRole('dialog', { name: 'Mənbə' })
  await within(dialog).findByText('Excel dəyərləri dəyişdirilmir.', { exact: false })
  return dialog
}

/** Each fact as the reader sees it: its label, then its value. */
function facts(dialog: HTMLElement): [string, string][] {
  return Array.from(dialog.querySelectorAll('dt')).map((term) => [
    term.textContent ?? '',
    term.nextElementSibling?.textContent ?? '',
  ])
}

describe('the source of an imported line', () => {
  it('asks for the line it was opened on, and is the same window as before: «Mənbə», the product, wide', async () => {
    const dialog = await open()

    expect(ordersApi.fetchOrderItemSource).toHaveBeenCalledWith(501, expect.any(AbortSignal))
    expect(dialog).toHaveAccessibleDescription('Yay ayaqqabısı')
    expect(dialog).toHaveClass('max-w-3xl')
  })

  it('names the file, the import, the sheet, the Excel row, both totals and the day it was written, in that order', async () => {
    const dialog = await open()

    expect(facts(dialog)).toEqual([
      ['Fayl', 'Sifarisler_uzre_bolgu_25_08_2026_duzeldilmis.xlsx'],
      ['İdxal', '#50010 · Imported'],
      ['Vərəq', 'Sentyabr'],
      ['Excel sətri', '3142'],
      ['Excel cəmi', '123'],
      ['Hesablanmış cəm', `123,00${nbsp}₼`],
      ['Sifarişə yazılıb', '22.09.2026'],
    ])
  })

  it('reads every field three ways, with the correction and the deliberate blank marked', async () => {
    const dialog = await open()
    const table = within(dialog).getByRole('table')

    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Sahə',
      'Mənbə dəyəri (Excel-də)',
      'Effektiv dəyər (sistem qəbul edir)',
      'Kanonik qeyd',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
      .map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent))
    expect(rows).toEqual([
      ['Məhsul', 'Yay ayaqqabısı', 'Yay ayaqqabısı', 'Yay ayaqqabısı'],
      ['Miqdar', '10', '12düzəliş', '—'],
      ['Model', 'M-101-S-2', 'qəsdən boş', '—'],
    ])
    expect(within(table).getByText('düzəliş')).toBeInTheDocument()
    expect(within(table).getByText('qəsdən boş')).toBeInTheDocument()
  })

  it('shows the versions the line came through, ending at the one with the Excel row', async () => {
    const dialog = await open()

    const chain = within(dialog).getByText('Sətrin keçdiyi versiyalar').closest('div')!
    const steps = within(chain).getAllByRole('listitem')
    expect(steps).toHaveLength(2)
    expect(steps[0]).toHaveTextContent('Cari sətir (versiya 2)')
    expect(steps[0]).toHaveTextContent('Təsdiqlənib')
    expect(steps[0]).not.toHaveTextContent('Excel sətri')
    expect(steps[1]).toHaveTextContent('Versiya 1')
    expect(steps[1]).toHaveTextContent('Düzəliş tələb olunur')
    expect(within(steps[1]).getByText('· Excel sətri')).toBeInTheDocument()
    expect(chain).toHaveTextContent('Kopyalanmış sətir üçün yeni Excel qeydi yaradılmır: mənbə zəncir boyu geri izlənir.')
  })

  it('closes on the note that no Excel value is changed', async () => {
    const dialog = await open()

    expect(dialog).toHaveTextContent(
      'Excel dəyərləri dəyişdirilmir. Düzəliş yalnız xananın nə demək istədiyini qeyd edir; kanonik qeyd isə sistemdə '
      + 'həmin dəyərin bağlandığı kataloq yazısıdır. Düzəlişlər idxal baxış mərkəzində edilir.',
    )
  })

  /** Task 17: only read, never written in, so a press on its background closes it. */
  it('closes on a press on its background', async () => {
    const onClose = vi.fn()
    const dialog = await open(onClose)

    await userEvent.click(dialog.parentElement as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('the source of a line added by hand', () => {
  it('says so, and shows no facts, no field table and no chain', async () => {
    ordersApi.fetchOrderItemSource.mockResolvedValue(manual())
    render(<ItemSourceDrawer orderRequestItemId={777} productName="Vedrə" onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Mənbə' })

    expect(await within(dialog).findByText('Əl ilə əlavə edilib — Excel mənbəsi yoxdur.')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('Bu sətir düzəliş versiyasında əl ilə əlavə edilib; onun arxasında Excel sətri yoxdur.')
    expect(dialog.querySelector('dl')).toBeNull()
    expect(within(dialog).queryByRole('table')).toBeNull()
    expect(within(dialog).queryByText('Sətrin keçdiyi versiyalar')).toBeNull()
  })
})
