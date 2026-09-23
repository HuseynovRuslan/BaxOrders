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

async function renderPage(initialPath = '/approvals') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ApprovalInboxPage />
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Təsdiq gözləyənlər' })
  // The title renders before the fetch resolves, whichever of the two very different views follows it.
  await waitFor(() => expect(screen.queryByText('Siyahı yüklənir')).toBeNull())
}

/**
 * A summary metric's label and its big number are siblings, whatever wraps them. Scoped to the summary
 * group, since a filter chip below repeats one of the same labels ("Mənim üçün bloklanıb").
 */
function metricValue(label: string): string | null {
  const summary = screen.getByRole('group', { name: 'Növbənin xülasəsi' })
  return within(summary).getByText(label).nextElementSibling?.textContent ?? null
}

describe('the summary', () => {
  it('shows the whole queue’s counts, not just the rows on the current page or filter', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    await renderPage()

    expect(metricValue('Gözləyən sifarişlər')).toBe('6')
    expect(screen.getByText('4 qərar verə bilərəm')).toBeInTheDocument()
    expect(metricValue('Mənim üçün bloklanıb')).toBe('2')
    expect(metricValue('Qiymətsiz sifarişlər')).toBe('1')
    expect(screen.getByText('3 qiymətsiz sətir')).toBeInTheDocument()
  })
})

describe('an empty queue', () => {
  it('says there is nothing to decide, and why nothing appeared, in one strong empty state', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox({
      summary: { pendingCount: 0, actionableByCurrentUserCount: 0, blockedForCurrentUserCount: 0, missingPriceRequestCount: 0, missingPriceItemCount: 0, revisionCount: 0 },
      filteredCount: 0,
      rows: { items: [], page: 1, pageSize: 25, totalCount: 0 },
    }))
    await renderPage()

    expect(screen.getByText('Təsdiq gözləyən sifariş yoxdur.')).toBeInTheDocument()
    expect(screen.getByText('Yeni sifariş təsdiqə göndərildikdə burada görünəcək.')).toBeInTheDocument()
  })

  it('offers no summary cards and no filters when there is nothing for them to say', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox({
      summary: { pendingCount: 0, actionableByCurrentUserCount: 0, blockedForCurrentUserCount: 0, missingPriceRequestCount: 0, missingPriceItemCount: 0, revisionCount: 0 },
      filteredCount: 0,
      rows: { items: [], page: 1, pageSize: 25, totalCount: 0 },
    }))
    await renderPage()

    expect(screen.queryByRole('group', { name: 'Növbənin xülasəsi' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Qərar vermə imkanına görə süz' })).toBeNull()
    expect(screen.queryByLabelText('Obyekt adı və ya kodu üzrə axtar')).toBeNull()
  })
})

describe('a queue that has requests in it', () => {
  it('keeps the summary and every filter available, exactly as before', async () => {
    approvalsApi.fetchApprovalInbox.mockResolvedValue(inbox())
    await renderPage()

    expect(screen.getByRole('group', { name: 'Növbənin xülasəsi' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Qərar vermə imkanına görə süz' })).toBeInTheDocument()
    expect(screen.getByLabelText('Obyekt adı və ya kodu üzrə axtar')).toBeInTheDocument()
    expect(screen.queryByText('Təsdiq gözləyən sifariş yoxdur.')).toBeNull()
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
