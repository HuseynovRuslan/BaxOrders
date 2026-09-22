import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderRequestStatus } from '../../api/orders'
import type { AllowedWorkflowActions, OrderWorkflow } from '../../api/workflow'
import { WorkflowPanel } from './WorkflowPanel'

/**
 * What the approval panel is allowed to show and to send. Which buttons exist is the server's answer — the
 * state, the role and whose submission it is are all folded into `allowedActions`, and the endpoint checks
 * them again — and an order whose money is partly unknown cannot be approved by someone who has not said
 * they know that. Nothing here names the person acting: the session does.
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

const nobody: AllowedWorkflowActions = {
  canSubmit: false,
  canApprove: false,
  canReturn: false,
  blockedBySelfApproval: false,
  blockedByOwnContribution: false,
}

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
      ...nobody,
      canSubmit: status === 'Draft' || status === 'ReturnedForCorrection',
      canApprove: status === 'PendingApproval',
      canReturn: status === 'PendingApproval',
    },
    submittedByUserId: null,
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

  it('asks a returned request to be sent again, and says a correction is a new version', async () => {
    await renderPanel(workflow({ status: 'ReturnedForCorrection' }))

    expect(screen.getByText('Düzəlişə qaytarılıb')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yenidən təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.getByText(/yeni qaralama versiyası yaradılır/)).toBeInTheDocument()
  })
})

/**
 * The panel never works out a role for itself. These fix what it does with the answer the server gives for
 * each one, which is the answer the endpoints then enforce.
 */
describe('what each role is offered', () => {
  it('lets a coordinator send a draft on, and does not offer them a decision', async () => {
    await renderPanel(workflow({
      status: 'Draft',
      allowedActions: { ...nobody, canSubmit: true },
    }))

    expect(screen.getByRole('button', { name: 'Təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
  })

  it('offers a coordinator nothing on a waiting request', async () => {
    await renderPanel(workflow({ status: 'PendingApproval', allowedActions: nobody }))

    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəlişə qaytar' })).toBeNull()
    expect(screen.queryByText(/Özünüzün təsdiqə göndərdiyiniz/)).toBeNull()
  })

  it('lets a manager decide on a waiting request but not submit a draft', async () => {
    await renderPanel(workflow({
      status: 'PendingApproval',
      allowedActions: { ...nobody, canApprove: true, canReturn: true },
    }))

    expect(screen.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Düzəlişə qaytar' })).toBeInTheDocument()

    await renderPanel(workflow({ status: 'Draft', allowedActions: nobody }))
    expect(screen.queryByRole('button', { name: 'Təsdiqə göndər' })).toBeNull()
  })

  it('lets an admin decide on somebody else’s submission', async () => {
    await renderPanel(workflow({
      status: 'PendingApproval',
      submittedByUserId: '4f1f0a2e-0000-4000-8000-000000000001',
      allowedActions: { ...nobody, canApprove: true, canReturn: true },
    }))

    expect(screen.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Düzəlişə qaytar' })).toBeInTheDocument()
  })
})

describe('a request the reader submitted themselves', () => {
  const ownSubmission = workflow({
    status: 'PendingApproval',
    submittedByUserId: '4f1f0a2e-0000-4000-8000-000000000001',
    allowedActions: { ...nobody, blockedBySelfApproval: true },
  })

  it('says why there is nothing to press, rather than showing an empty row', async () => {
    await renderPanel(ownSubmission)

    expect(screen.getByText(/Özünüzün təsdiqə göndərdiyiniz sifarişi təsdiqləyə bilməzsiniz/)).toBeInTheDocument()
  })

  it('offers neither approval nor return, whatever the role', async () => {
    await renderPanel(ownSubmission)

    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəlişə qaytar' })).toBeNull()
  })
})

describe('a correction the reader worked on', () => {
  it('says that editing it is what rules them out, not who submitted it', async () => {
    await renderPanel(workflow({
      status: 'PendingApproval',
      allowedActions: { ...nobody, blockedByOwnContribution: true },
    }))

    expect(screen.getByText(/Bu versiyada düzəliş etdiyiniz üçün onu özünüz təsdiqləyə bilməzsiniz/)).toBeInTheDocument()
    expect(screen.queryByText(/Özünüzün təsdiqə göndərdiyiniz/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəlişə qaytar' })).toBeNull()
  })
})

describe('taking an action', () => {
  it('asks for nothing but a note, and never for a name', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'Draft' }))
    await user.click(screen.getByRole('button', { name: 'Təsdiqə göndər' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Təsdiqə göndər' })).toBeEnabled()
    expect(screen.queryByPlaceholderText('Ad, soyad')).toBeNull()
    expect(screen.queryByText('Əməliyyatı edən')).toBeNull()
    expect(screen.queryByText(/Sistemdə hələ istifadəçi girişi yoxdur/)).toBeNull()
  })

  it('sends only the note that was typed; who is acting comes from the session', async () => {
    const user = userEvent.setup()
    workflowApi.submitForApproval.mockResolvedValue(workflow({ status: 'PendingApproval' }))
    await renderPanel(workflow({ status: 'Draft' }))

    await user.click(screen.getByRole('button', { name: 'Təsdiqə göndər' }))
    await user.type(screen.getByRole('textbox', { name: /Qeyd/ }), 'İyul sifarişi yoxlanıldı')
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqə göndər' }).at(-1)!)

    await waitFor(() => expect(workflowApi.submitForApproval).toHaveBeenCalledWith(105, {
      comment: 'İyul sifarişi yoxlanıldı',
    }))
  })

  it('will not hand a request back without a reason', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Düzəlişə qaytar' }))

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
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu sifariş artıq təsdiqlənib.')
  })

  it('shows the server’s refusal when it disagrees with what was offered', async () => {
    const user = userEvent.setup()
    const { ApiError } = await vi.importActual<typeof import('../../api/client')>('../../api/client')
    workflowApi.approveOrder.mockRejectedValue(
      new ApiError(403, 'Bu əməliyyat üçün icazəniz yoxdur.'),
    )
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Təsdiqlə' }))
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!)

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu əməliyyat üçün icazəniz yoxdur.')
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
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getAllByRole('button', { name: 'Təsdiqlə' }).at(-1)!)

    await waitFor(() => expect(workflowApi.approveOrder).toHaveBeenCalledWith(105, {
      comment: undefined,
      acknowledgeMissingPrices: true,
    }))
  })
})

describe('the history', () => {
  it('reads as the story of the request, oldest first, in the names recorded at the time', async () => {
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
          actorUserId: '4f1f0a2e-0000-4000-8000-000000000001',
          actorDisplayName: 'Test Koordinator',
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
          actorUserId: '4f1f0a2e-0000-4000-8000-000000000002',
          actorDisplayName: 'Test Rəhbər',
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
    expect(entries[0]).toHaveTextContent('Test Koordinator')
    expect(entries[1]).toHaveTextContent('Düzəlişə qaytarıldı')
    expect(entries[1]).toHaveTextContent('Test Rəhbər')
    expect(entries[1]).toHaveTextContent('Səbəb: Zibil paketi sayı çoxdur')
  })

  it('keeps the name as it was stored, without looking the person up again', async () => {
    await renderPanel(workflow({
      status: 'Approved',
      history: [{
        id: 4,
        action: 'Approved',
        fromStatus: 'PendingApproval',
        toStatus: 'Approved',
        actorUserId: '4f1f0a2e-0000-4000-8000-000000000002',
        // The person has since been renamed; the record still says who acted that day.
        actorDisplayName: 'Köhnə ad',
        comment: null,
        missingPriceItemCount: 0,
        missingPricesAcknowledged: false,
        occurredAtUtc: '2026-09-22T12:00:00Z',
      }],
    }))

    expect(screen.getByText(/Köhnə ad/)).toBeInTheDocument()
  })

  it('reads an event with nobody behind it as the system', async () => {
    await renderPanel(workflow({
      status: 'PendingApproval',
      history: [{
        id: 5,
        action: 'SubmittedForApproval',
        fromStatus: 'Draft',
        toStatus: 'PendingApproval',
        actorUserId: null,
        actorDisplayName: '',
        comment: null,
        missingPriceItemCount: 0,
        missingPricesAcknowledged: false,
        occurredAtUtc: '2026-09-22T09:00:00Z',
      }],
    }))

    expect(screen.getByRole('listitem')).toHaveTextContent('Sistem')
  })

  it('records that unpriced lines were acknowledged', async () => {
    await renderPanel(workflow({
      status: 'Approved',
      history: [{
        id: 3,
        action: 'Approved',
        fromStatus: 'PendingApproval',
        toStatus: 'Approved',
        actorUserId: '4f1f0a2e-0000-4000-8000-000000000002',
        actorDisplayName: 'Test Rəhbər',
        comment: null,
        missingPriceItemCount: 3,
        missingPricesAcknowledged: true,
        occurredAtUtc: '2026-09-22T12:00:00Z',
      }],
    }))

    expect(screen.getByText(/3 qiymətsiz sətir təsdiq zamanı qeyd edilib/)).toBeInTheDocument()
  })
})
