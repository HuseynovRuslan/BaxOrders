import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalInbox } from '../api/approvals'
import { ApprovalInboxPage } from './ApprovalInboxPage'

/**
 * The queue's own page: the summary always describes the whole thing, and every filter and sort the reader
 * picks lives in the URL rather than in memory the browser could lose on a refresh.
 */
const approvalsApi = vi.hoisted(() => ({
  fetchApprovalInbox: vi.fn(),
}))

vi.mock('../api/approvals', async () => {
  const actual = await vi.importActual<typeof import('../api/approvals')>('../api/approvals')
  return { ...actual, ...approvalsApi }
})

function inbox(overrides: Partial<ApprovalInbox> = {}): ApprovalInbox {
  return {
    summary: {
      pendingCount: 6,
      actionableByCurrentUserCount: 4,
      blockedForCurrentUserCount: 2,
      missingPriceRequestCount: 1,
      missingPriceItemCount: 3,
      revisionCount: 1,
    },
    filteredCount: 6,
    rows: { items: [], page: 1, pageSize: 25, totalCount: 6 },
    ...overrides,
  }
}

beforeEach(() => approvalsApi.fetchApprovalInbox.mockReset())
afterEach(() => vi.clearAllMocks())

/**
 * The same wording appears twice on this page — once as a summary figure, once as a filter chip's label — so
 * every summary assertion is scoped to the summary's own `<dl>`, the one place each label appears exactly once.
 */
async function renderPage(initialPath = '/approvals') {
  const { container } = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ApprovalInboxPage />
    </MemoryRouter>,
  )
  await screen.findByText('Gözləyən sifarişlər')
  return { summary: within(container.querySelector('dl')!) }
}

function factValue(summary: ReturnType<typeof within>, label: string): string | null {
  const dt = summary.getByText(label)
  return dt.closest('div')?.querySelector('dd')?.textContent ?? null
}

describe('the summary', () => {
  it('shows the whole queue’s counts, not just the rows on the current page or filter', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    const { summary } = await renderPage()

    expect(factValue(summary, 'Gözləyən sifarişlər')).toBe('6')
    expect(factValue(summary, 'Qərar verə bilərəm')).toBe('4')
    expect(factValue(summary, 'Mənim üçün bloklanıb')).toBe('2')
    expect(factValue(summary, 'Qiymətsiz sifarişlər')).toBe('1')
    expect(factValue(summary, 'Qiymətsiz sətirlər')).toBe('3')
    expect(factValue(summary, 'Düzəliş versiyaları')).toBe('1')
  })
})

describe('an empty queue', () => {
  it('says there is nothing to decide, rather than showing an empty table', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox({
      summary: { pendingCount: 0, actionableByCurrentUserCount: 0, blockedForCurrentUserCount: 0, missingPriceRequestCount: 0, missingPriceItemCount: 0, revisionCount: 0 },
      filteredCount: 0,
      rows: { items: [], page: 1, pageSize: 25, totalCount: 0 },
    }))
    await renderPage()

    expect(await screen.findByText('Təsdiq gözləyən sifariş yoxdur.')).toBeInTheDocument()
  })
})

describe('the actionability filter', () => {
  it('asks the server for only what the reader may decide, and marks that choice as active', async () => {
    const user = userEvent.setup()
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    await renderPage()

    await waitFor(() => expect(approvalsApi.fetchApprovalInbox).toHaveBeenCalled())
    approvalsApi.fetchApprovalInbox.mockClear()

    await user.click(screen.getByRole('button', { name: /Qərar verə bilərəm/ }))

    await waitFor(() => expect(approvalsApi.fetchApprovalInbox).toHaveBeenCalledWith(
      expect.objectContaining({ actionability: 'CanDecide' }),
      expect.anything(),
    ))
    expect(screen.getByRole('button', { name: /Qərar verə bilərəm/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('starts on "Hamısı" and asks for no actionability filter at all', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    await renderPage()

    await waitFor(() => expect(approvalsApi.fetchApprovalInbox).toHaveBeenCalledWith(
      expect.objectContaining({ actionability: 'All' }),
      expect.anything(),
    ))
  })
})

describe('a request already narrowed by the URL', () => {
  it('reproduces the same view on a fresh load, so a shared link or a refresh shows the same thing', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    await renderPage('/approvals?actionability=BlockedForMe&search=Fəvvarə')

    await waitFor(() => expect(approvalsApi.fetchApprovalInbox).toHaveBeenCalledWith(
      expect.objectContaining({ actionability: 'BlockedForMe', search: 'Fəvvarə' }),
      expect.anything(),
    ))
  })
})
