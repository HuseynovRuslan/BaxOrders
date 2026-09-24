import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApprovalInboxRow } from '../../api/approvals'
import type { AllowedWorkflowActions, OrderWorkflow } from '../../api/workflow'
import { ApprovalRows } from './ApprovalRows'

/**
 * The queue's rows. Which buttons a row offers is the server's answer, carried straight from the inbox
 * response — this never re-derives who may decide. Deciding itself goes through the same dialog and the same
 * workflow endpoints the order detail page uses; only the network calls are mocked here.
 */
const workflowApi = vi.hoisted(() => ({
  fetchWorkflow: vi.fn(),
  approveOrder: vi.fn(),
  returnForCorrection: vi.fn(),
}))

vi.mock('../../api/workflow', async () => {
  const actual = await vi.importActual<typeof import('../../api/workflow')>('../../api/workflow')
  return { ...actual, ...workflowApi }
})

function row(overrides: Partial<ApprovalInboxRow> = {}): ApprovalInboxRow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationCode: 'LOC-000017',
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    submittedAtUtc: '2026-09-22T10:32:00Z',
    submittedByUserId: '4f1f0a2e-0000-4000-8000-000000000001',
    submittedByDisplayName: 'Test Koordinator',
    itemCount: 12,
    knownAmount: 450.5,
    missingPriceItemCount: 0,
    amountIsComplete: true,
    isRevision: false,
    sourceVersion: null,
    sourceOrderRequestId: null,
    canApprove: true,
    canReturn: true,
    blockedBySelfApproval: false,
    blockedByOwnContribution: false,
    blockedByMissingAuthority: false,
    ...overrides,
  }
}

const nobody: AllowedWorkflowActions = {
  canSubmit: false,
  canApprove: true,
  canReturn: true,
  blockedBySelfApproval: false,
  blockedByOwnContribution: false,
  blockedByMissingAuthority: false,
}

function workflow(overrides: Partial<OrderWorkflow> = {}): OrderWorkflow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    status: 'PendingApproval',
    allowedActions: nobody,
    submittedByUserId: '4f1f0a2e-0000-4000-8000-000000000001',
    submittedAtUtc: '2026-09-22T10:32:00Z',
    approvedAtUtc: null,
    returnedAtUtc: null,
    itemCount: 12,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    knownAmountTotal: 450.5,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    decisionFacts: {
      isHistoricalImport: false,
      submissionNumber: 1,
      submittedByDisplayName: 'Test Koordinator',
      submittedAtUtc: '2026-09-22T10:32:00Z',
      previousReturn: null,
      decision: null,
    },
    ...overrides,
  }
}

beforeEach(() => {
  workflowApi.fetchWorkflow.mockReset()
  workflowApi.approveOrder.mockReset()
  workflowApi.returnForCorrection.mockReset()
})

afterEach(() => vi.clearAllMocks())

/**
 * The desktop table and the mobile cards render the same rows at once — CSS decides which one a real screen
 * shows, and jsdom applies no CSS — so every query below is scoped to the table, the one place each row
 * exists exactly once.
 */
function renderRows(rows: ApprovalInboxRow[], onChanged = vi.fn()) {
  const { container } = render(
    <MemoryRouter>
      <ApprovalRows rows={rows} onChanged={onChanged} />
    </MemoryRouter>,
  )
  const table = within(container.querySelector('table')!)
  return { table, onChanged }
}

describe('a row this person may decide', () => {
  it('offers to approve, to ask for a correction, and to open the order', () => {
    const { table } = renderRows([row()])

    expect(table.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(table.getByRole('button', { name: 'Düzəliş tələb et' })).toBeInTheDocument()
    expect(table.getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/105')
  })

  it('approves through the same dialog the order page uses, then reports back so the queue is read again', async () => {
    const user = userEvent.setup()
    workflowApi.fetchWorkflow.mockResolvedValue(workflow())
    workflowApi.approveOrder.mockResolvedValue(workflow({ status: 'Approved' }))
    const { table, onChanged } = renderRows([row()])

    await user.click(table.getByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    await waitFor(() => expect(workflowApi.approveOrder).toHaveBeenCalledWith(105, {
      comment: undefined,
      acknowledgeMissingPrices: false,
    }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(dialog).not.toBeInTheDocument()
  })

  it('will not ask for a correction without a reason, exactly as the order page requires', async () => {
    const user = userEvent.setup()
    workflowApi.fetchWorkflow.mockResolvedValue(workflow())
    const { table } = renderRows([row()])

    await user.click(table.getByRole('button', { name: 'Düzəliş tələb et' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('button', { name: 'Düzəliş tələb et' })).toBeDisabled()
  })

  it('reads the queue again and says why, when somebody else decided first', async () => {
    const user = userEvent.setup()
    workflowApi.fetchWorkflow.mockResolvedValue(workflow())
    const { ApiError } = await vi.importActual<typeof import('../../api/client')>('../../api/client')
    workflowApi.approveOrder.mockRejectedValue(new ApiError(409, 'Conflict'))
    const { table, onChanged } = renderRows([row()])

    await user.click(table.getByRole('button', { name: 'Təsdiqlə' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Təsdiqlə' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bu sifariş siz işləyərkən başqası tərəfindən dəyişdirilib. Səhifəni yeniləyib yenidən cəhd edin.',
    )
    expect(onChanged).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('a row blocked by self-submission', () => {
  it('says so with the exact wording, and offers no decision, only the order itself', () => {
    const { table } = renderRows([row({ canApprove: false, canReturn: false, blockedBySelfApproval: true })])

    expect(screen.getAllByText('Öz göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz.').length).toBeGreaterThan(0)
    expect(table.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(table.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
    expect(table.getByRole('link', { name: 'Sifarişə bax' })).toBeInTheDocument()
  })
})

describe('a row read by somebody without approval authority', () => {
  it('says the decision is the Rəhbər’s, offers no decision, and still opens the order', () => {
    const { table } = renderRows([row({ canApprove: false, canReturn: false, blockedByMissingAuthority: true })])

    expect(table.getByText('Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.')).toBeInTheDocument()
    expect(table.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(table.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
    expect(table.getByRole('link', { name: 'Sifarişə bax' })).toBeInTheDocument()
  })

  it('gives that reason, not the self-submission one, when both would apply', () => {
    renderRows([row({ canApprove: false, canReturn: false, blockedByMissingAuthority: true, blockedBySelfApproval: true })])

    expect(screen.queryByText('Öz göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz.')).toBeNull()
  })
})

describe('a row blocked by the reader’s own contribution to the correction', () => {
  it('says so with the exact wording, not the self-submission one', () => {
    const { table } = renderRows([row({ canApprove: false, canReturn: false, blockedByOwnContribution: true })])

    expect(screen.getAllByText('Bu versiyada düzəliş etdiyiniz üçün qərar verə bilməzsiniz.').length).toBeGreaterThan(0)
    expect(screen.queryByText('Öz göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz.')).toBeNull()
    expect(table.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
  })
})

describe('a request with unpriced lines', () => {
  it('shows the missing count and never shows the partial amount as the total', () => {
    renderRows([row({ knownAmount: 200, amountIsComplete: false, missingPriceItemCount: 4 })])

    expect(screen.getAllByText('4 qiymətsiz sətir').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Məlum qiymətlər üzrə').length).toBeGreaterThan(0)
  })

  it('says nothing extra about a fully priced request', () => {
    renderRows([row({ amountIsComplete: true, missingPriceItemCount: 0 })])

    expect(screen.queryByText(/qiymətsiz sətir/)).toBeNull()
    expect(screen.queryByText('Məlum qiymətlər üzrə')).toBeNull()
  })
})

describe('an original submission versus a revision', () => {
  it('marks a plain submission as original', () => {
    renderRows([row({ isRevision: false })])
    expect(screen.getAllByText('İlkin').length).toBeGreaterThan(0)
  })

  it('marks a revision compactly and links back to the version it corrects', () => {
    const { table } = renderRows([row({ isRevision: true, version: 2, sourceVersion: 1, sourceOrderRequestId: 90 })])

    expect(screen.getAllByText(/Düzəliş/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/V1 düzəlişi/).length).toBeGreaterThan(0)
    expect(table.getByRole('link', { name: /Düzəliş/ })).toHaveAttribute('href', '/orders/90')
  })
})
