import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductMatchDecision } from '../../../api/productMatches'
import { findOldTerms } from '../../../test/oldTerms'
import { DecisionList } from './DecisionList'
import { readableVariantDescription } from './labels'

/**
 * "Qərarlar": every decision, newest first, the undone ones marked as such, and "Geri al" only on a decision that
 * still stands and only for somebody who may decide.
 */
const matchApi = vi.hoisted(() => ({
  fetchProductMatchDecisions: vi.fn(),
  undoProductMatch: vi.fn(),
}))

vi.mock('../../../api/productMatches', async () => {
  const actual = await vi.importActual<typeof import('../../../api/productMatches')>('../../../api/productMatches')
  return { ...actual, ...matchApi }
})

function decision(overrides: Partial<ProductMatchDecision> = {}): ProductMatchDecision {
  return {
    id: 1,
    kind: 'SameItem',
    outcome: 'Approved',
    sourceProductId: 11,
    sourceProductName: 'Lampa 15 W',
    targetProductId: 12,
    targetProductName: 'Lampa 15W',
    sourceVariantId: 21,
    sourceVariantDescription: '15 W · PCS',
    targetVariantId: 22,
    targetVariantDescription: 'PCS',
    variantLabel: null,
    reason: 'eyni lampa',
    decidedByUserId: '4f1f0a2e-0000-4000-8000-00000000000a',
    decidedByDisplayName: 'Sınaq administratoru',
    decidedAtUtc: '2026-09-25T08:00:00Z',
    undoneByUserId: null,
    undoneByDisplayName: null,
    undoneAtUtc: null,
    undoReason: null,
    isLive: true,
    ...overrides,
  }
}

const live = decision()
const undone = decision({
  id: 2,
  kind: 'Variant',
  sourceProductName: 'Sabun elano lavanda ətirli',
  targetProductName: 'Sabun elano',
  sourceVariantId: null,
  sourceVariantDescription: null,
  targetVariantId: null,
  targetVariantDescription: null,
  variantLabel: 'lavanda ətirli',
  reason: null,
  undoneByUserId: '4f1f0a2e-0000-4000-8000-00000000000b',
  undoneByDisplayName: 'Başqa administrator',
  undoneAtUtc: '2026-09-25T09:30:00Z',
  undoReason: 'səhv təsdiq',
  isLive: false,
})

beforeEach(() => {
  matchApi.fetchProductMatchDecisions.mockReset().mockResolvedValue({ items: [live, undone], page: 1, pageSize: 50, totalCount: 2 })
  matchApi.undoProductMatch.mockReset().mockResolvedValue({ ...live, isLive: false })
})

afterEach(() => vi.clearAllMocks())

describe('the filters', () => {
  it('ask the server for one kind, one outcome, and the undone ones only when ticked', async () => {
    const user = userEvent.setup()
    render(<DecisionList canDecide />)
    await screen.findByText(/Sabun elano lavanda ətirli/)

    expect(matchApi.fetchProductMatchDecisions).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: undefined, outcome: undefined, includeUndone: false, page: 1 }),
      expect.anything(),
    )

    await user.selectOptions(screen.getByRole('combobox', { name: 'Növ' }), 'Variant')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Qərar' }), 'Rejected')
    await user.click(screen.getByRole('checkbox', { name: 'Geri alınanları da göstər' }))

    await waitFor(() => expect(matchApi.fetchProductMatchDecisions).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: 'Variant', outcome: 'Rejected', includeUndone: true }),
      expect.anything(),
    ))
  })
})

describe('a row', () => {
  it('says the kind, the outcome, both sides, the reason, who and when — and marks an undone one', async () => {
    render(<DecisionList canDecide />)
    const rows = await screen.findAllByRole('listitem')

    const spelling = rows[0]
    expect(within(spelling).getByText('Yazılış fərqi')).toBeInTheDocument()
    expect(within(spelling).getByText('Təsdiqlənib')).toBeInTheDocument()
    expect(spelling).toHaveTextContent('Lampa 15 W (15 W · ədəd) → Lampa 15W (ədəd)')
    expect(spelling).toHaveTextContent('Səbəb: eyni lampa')
    expect(spelling).toHaveTextContent('Sınaq administratoru')
    expect(within(spelling).queryByText('Geri alınıb')).toBeNull()

    const variant = rows[1]
    expect(within(variant).getByText('Variant fərqi')).toBeInTheDocument()
    expect(variant).toHaveTextContent('Variant: lavanda ətirli')
    expect(within(variant).getByText('Geri alınıb')).toBeInTheDocument()
    expect(variant).toHaveTextContent('Geri alınıb: Başqa administrator')
    expect(variant).toHaveTextContent('Səbəb: səhv təsdiq')

    expect(findOldTerms(document.body)).toEqual([])
  })

  it('offers "Geri al" on a live decision only', async () => {
    render(<DecisionList canDecide />)
    const rows = await screen.findAllByRole('listitem')

    expect(within(rows[0]).getByRole('button', { name: 'Geri al' })).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('button', { name: 'Geri al' })).toBeNull()
  })

  it('offers it to nobody who may not decide', async () => {
    render(<DecisionList canDecide={false} />)
    await screen.findByText(/Sabun elano lavanda ətirli/)

    expect(screen.queryByRole('button', { name: 'Geri al' })).toBeNull()
  })
})

describe('taking a decision back', () => {
  it('asks first, says what it does, and sends the reason given', async () => {
    const user = userEvent.setup()
    render(<DecisionList canDecide />)

    await user.click(await screen.findByRole('button', { name: 'Geri al' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Bu qərar geri alınsın\? Cüt yenidən təklif kimi görünəcək/)).toBeInTheDocument()
    expect(matchApi.undoProductMatch).not.toHaveBeenCalled()

    await user.type(within(dialog).getByRole('textbox', { name: /Səbəb/ }), 'səhv')
    await user.click(within(dialog).getByRole('button', { name: 'Geri al' }))

    await waitFor(() => expect(matchApi.undoProductMatch).toHaveBeenCalledWith(1, 'səhv'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(matchApi.fetchProductMatchDecisions).toHaveBeenCalledTimes(2)
  })

  it('sends nothing when the dialog is closed', async () => {
    const user = userEvent.setup()
    render(<DecisionList canDecide />)

    await user.click(await screen.findByRole('button', { name: 'Geri al' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'İmtina' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(matchApi.undoProductMatch).not.toHaveBeenCalled()
  })
})

describe('a variant description', () => {
  it.each([
    ['15 W · PCS', '15 W · ədəd'],
    ['PCS', 'ədəd'],
    ['5 L · PCS', '5 litr · ədəd'],
    ['50 sm · M-7 · PACK', '50 sm · M-7 · paket'],
    ['vahidsiz', 'Vahidsiz'],
  ])('reads %s as %s', (server, readable) => {
    expect(readableVariantDescription(server)).toBe(readable)
  })
})
