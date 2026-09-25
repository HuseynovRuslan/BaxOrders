import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResolutionKind, ResolutionResult, UnresolvedValue } from '../../../api/review'
import { BulkActionDialog } from './BulkActionDialog'
import { CreateResolutionDialog } from './CreateResolutionDialog'
import { MapExistingDialog } from './MapExistingDialog'

/**
 * Brief (Task 13), decision 13.2: "Uyğunluqları və alternativ adları yalnız admin və ya data idarəçisi təsdiqləyir."
 *
 * Saving a spelling "for future imports" is how the import review approves a product's alternative name, so a
 * product offers it only to somebody holding `canDecideProductMatches`. Every other kind is unchanged. The checkbox is
 * a courtesy: the server refuses anybody else whatever the screen sends.
 */
const reviewApi = vi.hoisted(() => ({
  searchReference: vi.fn(),
  mapToExisting: vi.fn(),
  createProduct: vi.fn(),
  createLocation: vi.fn(),
  previewBulk: vi.fn(),
  applyBulk: vi.fn(),
}))

vi.mock('../../../api/review', async () => {
  const actual = await vi.importActual<typeof import('../../../api/review')>('../../../api/review')
  return { ...actual, ...reviewApi }
})

const auth = vi.hoisted(() => ({ canDecideProductMatches: false }))
vi.mock('../../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { canDecideProductMatches: auth.canDecideProductMatches } }),
}))

const singleAliasLabel = /Gələcək importlarda da bu uyğunluğu yadda saxla/
const bulkAliasLabel = /Seçilən yazılışları gələcək importlar üçün də yadda saxla/

function value(displayValue = 'Lampa 15 W'): UnresolvedValue {
  return {
    sourceKey: displayValue.toLowerCase(),
    displayValue,
    normalizedValue: displayValue.toLowerCase(),
    affectedRowCount: 3,
    sampleOriginalValues: [displayValue],
    sampleRows: [],
    currentStatus: 'Unknown',
    parentLabel: null,
  }
}

beforeEach(() => {
  auth.canDecideProductMatches = false
  reviewApi.searchReference.mockReset().mockResolvedValue([{ id: 7, label: 'Lampa 15W', secondary: null }])
  reviewApi.mapToExisting.mockReset().mockResolvedValue({} as ResolutionResult)
  reviewApi.createProduct.mockReset().mockResolvedValue({} as ResolutionResult)
  reviewApi.createLocation.mockReset().mockResolvedValue({} as ResolutionResult)
  reviewApi.previewBulk.mockReset().mockReturnValue(new Promise(() => {}))
  reviewApi.applyBulk.mockReset()
})

afterEach(() => vi.clearAllMocks())

function renderMap(kind: ResolutionKind) {
  render(<MapExistingDialog importId={1} kind={kind} value={value()} onClose={() => {}} onResolved={() => {}} />)
}

function renderCreate(kind: ResolutionKind) {
  render(<CreateResolutionDialog importId={1} kind={kind} value={value()} onClose={() => {}} onResolved={() => {}} />)
}

function renderBulk(kind: ResolutionKind) {
  render(
    <BulkActionDialog importId={1} kind={kind} sourceKeys={['lampa 15 w']} mode="map" onClose={() => {}} onApplied={() => {}} />,
  )
}

describe('mapping a product to an existing one', () => {
  it('offers no alternative name without the authority, and maps for this import only', async () => {
    const user = userEvent.setup()
    renderMap('Product')

    await user.click(await screen.findByRole('button', { name: 'Lampa 15W' }))
    expect(screen.queryByRole('checkbox', { name: singleAliasLabel })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    expect(reviewApi.mapToExisting).toHaveBeenCalledWith(1, expect.objectContaining({ kind: 'Product', targetId: 7, scope: 'BatchOnly' }))
  })

  it('offers it to an administrator, and saves it when asked', async () => {
    auth.canDecideProductMatches = true
    const user = userEvent.setup()
    renderMap('Product')

    await user.click(await screen.findByRole('button', { name: 'Lampa 15W' }))
    await user.click(screen.getByRole('checkbox', { name: singleAliasLabel }))
    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))

    expect(reviewApi.mapToExisting).toHaveBeenCalledWith(1, expect.objectContaining({ kind: 'Product', scope: 'GlobalAlias' }))
  })

  it('is unchanged for another kind: a supplier spelling can still be remembered without the authority', async () => {
    const user = userEvent.setup()
    renderMap('Supplier')

    await user.click(await screen.findByRole('button', { name: 'Lampa 15W' }))
    await user.click(screen.getByRole('checkbox', { name: singleAliasLabel }))
    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))

    expect(reviewApi.mapToExisting).toHaveBeenCalledWith(1, expect.objectContaining({ kind: 'Supplier', scope: 'GlobalAlias' }))
  })
})

describe('creating a product', () => {
  it('offers no alternative name without the authority, and creates for this import only', async () => {
    const user = userEvent.setup()
    renderCreate('Product')

    expect(screen.queryByRole('checkbox', { name: singleAliasLabel })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Yarat' }))

    expect(reviewApi.createProduct).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Lampa 15 W', scope: 'BatchOnly' }))
  })

  it('offers it to an administrator', async () => {
    auth.canDecideProductMatches = true
    const user = userEvent.setup()
    renderCreate('Product')

    await user.click(screen.getByRole('checkbox', { name: singleAliasLabel }))
    await user.click(screen.getByRole('button', { name: 'Yarat' }))

    expect(reviewApi.createProduct).toHaveBeenCalledWith(1, expect.objectContaining({ scope: 'GlobalAlias' }))
  })

  it('is unchanged for another kind: a new location still offers it without the authority', async () => {
    const user = userEvent.setup()
    renderCreate('Location')

    await user.click(screen.getByRole('checkbox', { name: singleAliasLabel }))
    await user.click(screen.getByRole('button', { name: 'Yarat' }))

    expect(reviewApi.createLocation).toHaveBeenCalledWith(1, expect.objectContaining({ scope: 'GlobalAlias' }))
  })
})

describe('mapping several products at once', () => {
  it('offers no alternative names without the authority', async () => {
    renderBulk('Product')

    expect(await screen.findByRole('button', { name: 'Lampa 15W' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: bulkAliasLabel })).not.toBeInTheDocument()
  })

  it('offers them to an administrator', async () => {
    auth.canDecideProductMatches = true
    renderBulk('Product')

    expect(await screen.findByRole('checkbox', { name: bulkAliasLabel })).toBeInTheDocument()
  })

  it('is unchanged for another kind', async () => {
    renderBulk('Supplier')

    expect(await screen.findByRole('checkbox', { name: bulkAliasLabel })).toBeInTheDocument()
  })
})
