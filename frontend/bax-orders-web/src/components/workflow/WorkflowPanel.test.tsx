import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderRequestStatus } from '../../api/orders'
import type { OrderWorkflow } from '../../api/workflow'
import { WorkflowPanel } from './WorkflowPanel'

/**
 * What the approval panel is allowed to show and to send. The state decides which buttons exist — the server
 * says so and checks again — and an order whose money is partly unknown cannot be approved by someone who
 * has not said they know that.
 */
const workflowApi = vi.hoisted(() => ({
  fetchWorkflow: vi.fn(),
  submitForApproval: vi.fn(),
  approveOrder: vi.fn(),
  returnForCorrection: vi.fn(),
}))

vi.mock('../../api/workflow', async () => {
  const actual = await vi.importActual<typeof import('../../api/workflow')>('../../api/workflow')
  return { ...actual, ...workflowApi }
})

function workflow(overrides: Partial<OrderWorkflow> = {}): OrderWorkflow {
  const status: OrderRequestStatus = overrides.status ?? 'Draft'
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 1,
    status,
    allowedActions: {
      canSubmit: status === 'Draft' || status === 'ReturnedForCorrection',
      canApprove: status === 'PendingApproval',
      canReturn: status === 'PendingApproval',
    },
    submittedAtUtc: null,
    approvedAtUtc: null,
    returnedAtUtc: null,
    itemCount: 95,
    missingPriceItemCount: 0,
    knownAmountTotal: 12317.61,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    ...overrides,
  }
}

beforeEach(() => {
  workflowApi.fetchWorkflow.mockReset()
  workflowApi.submitForApproval.mockReset()
  workflowApi.approveOrder.mockReset()
  workflowApi.returnForCorrection.mockReset()
})

afterEach(() => vi.clearAllMocks())

async function renderPanel(state: OrderWorkflow) {
  workflowApi.fetchWorkflow.mockResolvedValue(state)
  render(<WorkflowPanel orderRequestId={105} />)
  await screen.findByText(/Qaralama|Təsdiq gözləyir|Təsdiqlənib|Düzəlişə qaytarılıb/)
}

describe('what each state shows', () => {
  it('offers only submission on a draft', async () => {
    await renderPanel(workflow({ status: 'Draft' }))

    expect(screen.getByText('Qaralama')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəlişə qaytar' })).toBeNull()
  })

  it('offers approving and returning on a waiting request', async () => {
    await renderPanel(workflow({ status: 'PendingApproval' }))

    expect(screen.getByText('Təsdiq gözləyir')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Düzəlişə qaytar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqə göndər' })).toBeNull()
  })

  it('offers nothing at all once approved', async () => {
    await renderPanel(workflow({ status: 'Approved', approvedAtUtc: '2026-09-22T11:00:00Z' }))

    expect(screen.getByText('Təsdiqlənib')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəlişə qaytar' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Təsdiqə göndər/ })).toBeNull()
  })

  it('asks a returned request to be sent again, and says editing is not built', async () => {
    await renderPanel(workflow({ status: 'ReturnedForCorrection' }))

    expect(screen.getByText('Düzəlişə qaytarılıb')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yenidən təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.getByText(/Sətirlərin redaktəsi hələ sistemdə yoxdur/)).toBeInTheDocument()
  })
})

describe('taking an action', () => {
  it('will not act until somebody is named', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'Draft' }))
    await user.click(screen.getByRole('button', { name: 'Təsdiqə göndər' }))

    const dialog = screen.getByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Təsdiqə göndər' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ruslan')
    expect(confirm).toBeEnabled()
  })

  it('sends the name and the note that were typed', async () => {
    const user = userEvent.setup()
    workflowApi.submitForApproval.mockResolvedValue(workflow({ status: 'PendingApproval' }))
    await renderPanel(workflow({ status: 'Draft' }))

    await user.click(screen.getByRole('button', { name: 'Təsdiqə göndər' }))
    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ruslan')
    await user.type(screen.getByRole('textbox', { name: /Qeyd/ }), 'İyul sifarişi yoxlanıldı')
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqə göndər' }).at(-1)!)

    await waitFor(() => expect(workflowApi.submitForApproval).toHaveBeenCalledWith(105, {
      actorDisplayName: 'Ruslan',
      comment: 'İyul sifarişi yoxlanıldı',
    }))
  })

  it('will not hand a request back without a reason', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Düzəlişə qaytar' }))
    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ənvər')

    const confirm = screen.getAllByRole('button', { name: 'Düzəlişə qaytar' }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(screen.getByText('Düzəlişə qaytarmaq üçün səbəb yazılmalıdır.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Nəyin düzəldilməli olduğunu yazın'), 'Zibil paketi sayı çoxdur')
    expect(confirm).toBeEnabled()
  })

  it('shows the error the server gave rather than a generic one', async () => {
    const user = userEvent.setup()
    const { ApiError } = await vi.importActual<typeof import('../../api/client')>('../../api/client')
    workflowApi.approveOrder.mockRejectedValue(new ApiError(422, 'Bu sifariş artıq təsdiqlənib.'))
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ənvər')
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu sifariş artıq təsdiqlənib.')
  })
})

describe('an order whose money is partly unknown', () => {
  const unpriced = workflow({
    status: 'PendingApproval',
    itemCount: 95,
    missingPriceItemCount: 3,
    knownAmountTotal: 12000,
    amountIsComplete: false,
    requiresMissingPriceAcknowledgement: true,
  })

  it('says so on the panel', async () => {
    await renderPanel(unpriced)
    expect(screen.getByText('3 sətirdə qiymət yoxdur. Məbləğ tam deyil.')).toBeInTheDocument()
    expect(screen.getByText(/Məlum qiymətlər üzrə məbləğ/)).toBeInTheDocument()
  })

  it('will not approve until the approver says they know', async () => {
    const user = userEvent.setup()
    await renderPanel(unpriced)

    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ənvər')

    const confirm = screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!
    expect(screen.getByText(/3 qiymətsiz sətir var/)).toBeInTheDocument()
    expect(confirm).toBeDisabled()

    await user.click(screen.getByRole('checkbox'))
    expect(confirm).toBeEnabled()
  })

  it('tells the server that it was acknowledged', async () => {
    const user = userEvent.setup()
    workflowApi.approveOrder.mockResolvedValue(workflow({ status: 'Approved' }))
    await renderPanel(unpriced)

    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    await user.type(screen.getByPlaceholderText('Ad, soyad'), 'Ənvər')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!)

    await waitFor(() => expect(workflowApi.approveOrder).toHaveBeenCalledWith(105, {
      actorDisplayName: 'Ənvər',
      comment: undefined,
      acknowledgeMissingPrices: true,
    }))
  })
})

describe('the history', () => {
  it('reads as the story of the request, oldest first', async () => {
    await renderPanel(workflow({
      status: 'Approved',
      submittedAtUtc: '2026-09-22T10:32:00Z',
      approvedAtUtc: '2026-09-22T11:05:00Z',
      history: [
        {
          id: 1,
          action: 'SubmittedForApproval',
          fromStatus: 'Draft',
          toStatus: 'PendingApproval',
          actorDisplayName: 'Ruslan',
          comment: 'İyul sifarişi yoxlanıldı',
          missingPriceItemCount: 0,
          missingPricesAcknowledged: false,
          occurredAtUtc: '2026-09-22T10:32:00Z',
        },
        {
          id: 2,
          action: 'ReturnedForCorrection',
          fromStatus: 'PendingApproval',
          toStatus: 'ReturnedForCorrection',
          actorDisplayName: 'Ənvər',
          comment: 'Zibil paketi sayı çoxdur',
          missingPriceItemCount: 0,
          missingPricesAcknowledged: false,
          occurredAtUtc: '2026-09-22T11:05:00Z',
        },
      ],
    }))

    const entries = screen.getAllByRole('listitem')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toHaveTextContent('Təsdiqə göndərildi')
    expect(entries[0]).toHaveTextContent('Ruslan')
    expect(entries[1]).toHaveTextContent('Düzəlişə qaytarıldı')
    expect(entries[1]).toHaveTextContent('Səbəb: Zibil paketi sayı çoxdur')
  })

  it('records that unpriced lines were acknowledged', async () => {
    await renderPanel(workflow({
      status: 'Approved',
      history: [{
        id: 3,
        action: 'Approved',
        fromStatus: 'PendingApproval',
        toStatus: 'Approved',
        actorDisplayName: 'Ənvər',
        comment: null,
        missingPriceItemCount: 3,
        missingPricesAcknowledged: true,
        occurredAtUtc: '2026-09-22T12:00:00Z',
      }],
    }))

    expect(screen.getByText(/3 qiymətsiz sətir təsdiq zamanı qeyd edilib/)).toBeInTheDocument()
  })
})

describe('the temporary actor field', () => {
  it('says plainly that the name is not a verified identity', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'Draft' }))
    await user.click(screen.getByRole('button', { name: 'Təsdiqə göndər' }))

    expect(screen.getByText(/Sistemdə hələ istifadəçi girişi yoxdur/)).toBeInTheDocument()
  })
})
