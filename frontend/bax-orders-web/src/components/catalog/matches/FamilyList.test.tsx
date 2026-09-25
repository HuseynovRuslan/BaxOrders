import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductFamily } from '../../../api/productMatches'
import { findOldTerms } from '../../../test/oldTerms'
import { FamilyList } from './FamilyList'

/**
 * "Məhsullar və variantlar": each base with its approved variants, each variant its own row — never one product
 * (13.1) — and read-only for everybody.
 */
const matchApi = vi.hoisted(() => ({ fetchProductMatchFamilies: vi.fn() }))

vi.mock('../../../api/productMatches', async () => {
  const actual = await vi.importActual<typeof import('../../../api/productMatches')>('../../../api/productMatches')
  return { ...actual, ...matchApi }
})

const sabun: ProductFamily = {
  productId: 1,
  productName: 'Sabun elano',
  usage: { lineCount: 1, locationCount: 1, firstMonth: '2026-08-01', lastMonth: '2026-08-01' },
  variants: [{
    decisionId: 501,
    productId: 2,
    productName: 'Sabun elano lavanda ətirli',
    variantLabel: 'lavanda ətirli',
    decidedByDisplayName: 'Sınaq administratoru',
    decidedAtUtc: '2026-09-25T08:00:00Z',
    usage: { lineCount: 1, locationCount: 1, firstMonth: '2026-09-01', lastMonth: '2026-09-01' },
  }],
}

beforeEach(() => {
  matchApi.fetchProductMatchFamilies.mockReset().mockResolvedValue({ items: [sabun], page: 1, pageSize: 50, totalCount: 1 })
})

afterEach(() => vi.clearAllMocks())

describe('a family', () => {
  it('is the base, and under it each variant as a row of its own with its label and who approved it', async () => {
    render(<FamilyList />)

    expect(await screen.findByText('Sabun elano')).toBeInTheDocument()
    expect(screen.getByText('Əsas məhsul · 1 sətir · 1 obyekt · Avqust 2026')).toBeInTheDocument()

    const variants = screen.getByRole('list', { name: 'Sabun elano — variantlar' })
    const row = within(variants).getByRole('listitem')
    expect(within(row).getByText('Sabun elano lavanda ətirli')).toBeInTheDocument()
    expect(row).toHaveTextContent('Variant: lavanda ətirli · 1 sətir · 1 obyekt · Sentyabr 2026')
    expect(row).toHaveTextContent('Təsdiqləyib: Sınaq administratoru')

    expect(screen.getByText(/Variantlar ayrı məhsul kimi qalır/)).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toEqual([])
    expect(findOldTerms(document.body)).toEqual([])
  })

  it('says so when nothing has been approved yet', async () => {
    matchApi.fetchProductMatchFamilies.mockResolvedValue({ items: [], page: 1, pageSize: 50, totalCount: 0 })
    render(<FamilyList />)

    expect(await screen.findByText('Hələ heç bir variant əlaqəsi təsdiqlənməyib.')).toBeInTheDocument()
  })

  it('is searched by the server', async () => {
    const user = userEvent.setup()
    render(<FamilyList />)
    await screen.findByText('Sabun elano')

    await user.type(screen.getByRole('searchbox', { name: 'Məhsul adı üzrə axtar' }), 'lavanda{Enter}')

    await waitFor(() => expect(matchApi.fetchProductMatchFamilies).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'lavanda', page: 1 }),
      expect.anything(),
    ))
  })
})
