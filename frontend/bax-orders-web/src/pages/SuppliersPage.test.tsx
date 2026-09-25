import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupplierList, SupplierListItem } from '../api/suppliers'
import { findOldTerms } from '../test/oldTerms'
import { SuppliersPage } from './SuppliersPage'

/**
 * The one screen where somebody says a supplier is the company's own store.
 *
 * Two things are load-bearing. The button is a courtesy — the server refuses a manager whatever the screen
 * offers — and the dialog has to state the consequence, because flipping this changes what five other screens
 * call a missing price and nothing visible happens here.
 */
const suppliersApi = vi.hoisted(() => ({
  fetchSuppliers: vi.fn(),
  changeSupplierPriceRequirement: vi.fn(),
}))

vi.mock('../api/suppliers', async () => {
  const actual = await vi.importActual<typeof import('../api/suppliers')>('../api/suppliers')
  return { ...actual, ...suppliersApi }
})

const auth = vi.hoisted(() => ({ canManageCatalog: true }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { canManageCatalog: auth.canManageCatalog } }),
}))

function supplier(overrides: Partial<SupplierListItem> = {}): SupplierListItem {
  return {
    supplierId: 79,
    code: null,
    name: 'Qala baza',
    isActive: true,
    priceRequirement: 'Required',
    orderLineCount: 197,
    unpricedItemCount: 94,
    orderCount: 59,
    ...overrides,
  }
}

function list(overrides: Partial<SupplierList> = {}): SupplierList {
  const suppliers = overrides.suppliers ?? [supplier()]
  return {
    suppliers,
    supplierCount: suppliers.length,
    priceNotRequiredCount: suppliers.filter((item) => item.priceRequirement === 'NotRequired').length,
    ...overrides,
  }
}

beforeEach(() => {
  auth.canManageCatalog = true
  suppliersApi.fetchSuppliers.mockReset().mockResolvedValue(list())
  suppliersApi.changeSupplierPriceRequirement.mockReset()
})

afterEach(() => vi.clearAllMocks())

async function renderPage() {
  render(
    <MemoryRouter>
      <SuppliersPage />
    </MemoryRouter>,
  )
  await screen.findByRole('group', { name: 'Təchizatçıların xülasəsi' })
}

describe('the list', () => {
  it('says in business words whether a supplier owes a price', async () => {
    suppliersApi.fetchSuppliers.mockResolvedValue(list({
      suppliers: [supplier(), supplier({ supplierId: 63, name: 'Anbar', priceRequirement: 'NotRequired' })],
    }))
    await renderPage()

    expect(screen.getByText('Alış qiyməti tələb olunur')).toBeInTheDocument()
    expect(screen.getByText('Qiymət tələb olunmur — daxili anbar')).toBeInTheDocument()
    // Never the identifier a developer would use.
    expect(screen.queryByText(/NotRequired/)).toBeNull()
  })

  it('shows the same unpriced count under either policy, and only calls it amber where it is owed', async () => {
    suppliersApi.fetchSuppliers.mockResolvedValue(list({
      suppliers: [
        supplier({ supplierId: 1, name: 'Kənar', unpricedItemCount: 5, priceRequirement: 'Required' }),
        supplier({ supplierId: 2, name: 'Daxili', unpricedItemCount: 5, priceRequirement: 'NotRequired' }),
      ],
    }))
    await renderPage()

    const table = document.querySelector('table')!
    const [external, internal] = within(table).getAllByText('5')
    expect(external).toHaveClass('text-amber-800')
    expect(internal).toHaveClass('text-slate-500')
  })
})

describe('who may change it', () => {
  it('offers the change to somebody who may manage the catalogue', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Dəyiş' })).toBeInTheDocument()
  })

  it('does not offer it to a manager — the server would refuse anyway', async () => {
    auth.canManageCatalog = false
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Dəyiş' })).toBeNull()
  })

  /** 14.1: "Təchizatçılarda heç nəyi dəyişə bilmirəm" — and the page says so rather than leaving it to be found out. */
  it('tells a manager the page is theirs to read and not to change', async () => {
    auth.canManageCatalog = false
    await renderPage()

    const note = screen.getByText('Yalnız baxış: bu bölmədə dəyişiklik etmək səlahiyyətiniz yoxdur.')
    expect(note).toHaveAttribute('role', 'note')
    expect(findOldTerms(note)).toEqual([])
    // The list is all still there.
    expect(screen.getByText('Qala baza')).toBeInTheDocument()
  })

  it('says nothing of the kind to somebody who may change it', async () => {
    await renderPage()

    expect(screen.queryByText(/Yalnız baxış/)).toBeNull()
  })
})

describe('the change itself', () => {
  it('states what it will do to the warnings before doing it', async () => {
    await renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Dəyiş' }))

    expect(screen.getByText(/94 sətri artıq/)).toBeInTheDocument()
    expect(screen.getByText(/xəbərdarlıqlarda görünməyəcək/)).toBeInTheDocument()
    // The promise that makes this safe to press.
    expect(screen.getByText(/Sifariş sətirlərinə toxunulmur/)).toBeInTheDocument()
  })

  it('sends the new policy and the reason', async () => {
    suppliersApi.changeSupplierPriceRequirement.mockResolvedValue({
      supplierId: 79,
      name: 'Qala baza',
      priceRequirement: 'NotRequired',
      changed: true,
      decision: null,
    })
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Dəyiş' }))
    await userEvent.type(screen.getByRole('textbox'), 'Öz anbarımızdır')
    await userEvent.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    expect(suppliersApi.changeSupplierPriceRequirement).toHaveBeenCalledWith(79, {
      priceRequirement: 'NotRequired',
      reason: 'Öz anbarımızdır',
    })
  })

  it('surfaces the server s refusal rather than pretending it worked', async () => {
    suppliersApi.changeSupplierPriceRequirement.mockRejectedValue(new Error('Bu əməliyyat üçün icazəniz yoxdur.'))
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Dəyiş' }))
    await userEvent.click(screen.getByRole('button', { name: 'Təsdiq et' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
