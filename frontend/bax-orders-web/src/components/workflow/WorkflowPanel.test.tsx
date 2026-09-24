import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrderRequestStatus } from '../../api/orders'
import type { AllowedWorkflowActions, OrderWorkflow, WorkflowDecisionFacts } from '../../api/workflow'
import { WorkflowPanel } from './WorkflowPanel'

/**
 * What the decision panel is allowed to show and to send. Which buttons exist is the server's answer — the
 * state, the approval authority and whose submission it is are all folded into `allowedActions`, and the
 * endpoint checks them again — and what it says about who sent the order and who decided is the server's
 * too, read off the recorded events. The status is not repeated here: the page header says it once. Nothing
 * here names the person acting: the session does.
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
  blockedByMissingAuthority: false,
}

const neverSent: WorkflowDecisionFacts = {
  isHistoricalImport: false,
  submissionNumber: 0,
  submittedByDisplayName: null,
  submittedAtUtc: null,
  previousReturn: null,
  decision: null,
}

const sentOnce: WorkflowDecisionFacts = {
  ...neverSent,
  submissionNumber: 1,
  submittedByDisplayName: 'Test Koordinator',
  submittedAtUtc: '2026-09-22T10:32:00Z',
}

const correctionRequest = {
  action: 'ReturnedForCorrection' as const,
  actorDisplayName: 'Test Rəhbər',
  occurredAtUtc: '2026-09-22T11:05:00Z',
  reason: 'Zibil paketi sayı çoxdur',
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
    priceNotRequiredItemCount: 0,
    knownAmountTotal: 12317.61,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    decisionFacts: status === 'Draft' ? neverSent : sentOnce,
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
  return screen.findByRole('region', { name: 'Qərar' })
}

/** The status words the page header shows. None of them belongs in the panel. */
const statusWords = ['Təsdiqlənməyib', 'Təsdiq gözləyir', 'Təsdiqlənib', 'Düzəliş tələb olunur']

describe('what each state offers', () => {
  it('offers only submission on a draft', async () => {
    await renderPanel(workflow({ status: 'Draft' }))

    expect(screen.getByRole('button', { name: 'Təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
  })

  it('offers approving and asking for a correction on a waiting request', async () => {
    await renderPanel(workflow({ status: 'PendingApproval' }))

    expect(screen.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Düzəliş tələb et' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Təsdiqə göndər' })).toBeNull()
  })

  it('offers nothing at all once approved', async () => {
    await renderPanel(workflow({ status: 'Approved', approvedAtUtc: '2026-09-22T11:00:00Z' }))

    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Təsdiqə göndər/ })).toBeNull()
  })

  it('asks a returned request to be sent again, and says a correction is a new version', async () => {
    await renderPanel(workflow({ status: 'ReturnedForCorrection' }))

    expect(screen.getByRole('button', { name: 'Yenidən təsdiqə göndər' })).toBeInTheDocument()
    expect(screen.getByText(/yeni versiya yaradılır/)).toBeInTheDocument()
  })
})

describe('the status is said once, in the page header', () => {
  it.each<OrderRequestStatus>(['Draft', 'PendingApproval', 'Approved', 'ReturnedForCorrection'])(
    'is neither a badge nor a word in the panel when the order is %s',
    async (status) => {
      const panel = await renderPanel(workflow({ status }))

      for (const word of statusWords) {
        expect(within(panel).queryByText(word)).toBeNull()
      }
      expect(within(panel).queryByText(/^[·⏳✓↩]$/)).toBeNull()
    },
  )
})

describe('the buttons come first', () => {
  it('puts the action row above everything else in the panel', async () => {
    const panel = await renderPanel(workflow({ status: 'PendingApproval' }))

    const firstButton = within(panel).getAllByRole('button')[0]
    const facts = within(panel).getByText('Göndərən')

    expect(panel.firstElementChild).toContainElement(firstButton)
    expect(firstButton).toHaveTextContent('Təsdiqlə')
    // The facts follow the buttons in the document, never the other way round.
    expect(firstButton.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('the facts behind the decision', () => {
  it('says who sent a waiting order, when, and that it is the first time', async () => {
    const panel = await renderPanel(workflow({ status: 'PendingApproval' }))

    expect(within(panel).getByText('Göndərən')).toBeInTheDocument()
    expect(within(panel).getByText('Test Koordinator')).toBeInTheDocument()
    expect(within(panel).getByText('Göndərilib')).toBeInTheDocument()
    expect(within(panel).getByText('İlk göndəriş')).toBeInTheDocument()
    expect(within(panel).queryByText('Əvvəlki düzəliş səbəbi')).toBeNull()
  })

  it('says it is the second time, after a request for correction, with that request, who made it and when', async () => {
    const panel = await renderPanel(workflow({
      status: 'PendingApproval',
      decisionFacts: { ...sentOnce, submissionNumber: 2, previousReturn: correctionRequest },
    }))

    expect(within(panel).getByText('İkinci göndəriş · düzəliş tələbindən sonra')).toBeInTheDocument()
    expect(within(panel).getByText('Əvvəlki düzəliş səbəbi')).toBeInTheDocument()
    expect(within(panel).getByText('Zibil paketi sayı çoxdur')).toBeInTheDocument()
    expect(within(panel).getByText(/Test Rəhbər · \d{2}\.\d{2}\.2026 \d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('names who asked for the correction, when and why, on a returned order', async () => {
    const panel = await renderPanel(workflow({
      status: 'ReturnedForCorrection',
      decisionFacts: { ...sentOnce, decision: correctionRequest },
    }))

    expect(within(panel).getByText('Düzəliş tələb edən')).toBeInTheDocument()
    expect(within(panel).getByText('Test Rəhbər')).toBeInTheDocument()
    expect(within(panel).getByText('Tarix')).toBeInTheDocument()
    expect(within(panel).getByText('Səbəb')).toBeInTheDocument()
    expect(within(panel).getByText('Zibil paketi sayı çoxdur')).toBeInTheDocument()
    // And the cycle that was returned.
    expect(within(panel).getByText('Test Koordinator')).toBeInTheDocument()
    expect(within(panel).getByText('İlk göndəriş')).toBeInTheDocument()
  })

  it('names who approved and when, then who sent it', async () => {
    const panel = await renderPanel(workflow({
      status: 'Approved',
      decisionFacts: {
        ...sentOnce,
        submissionNumber: 2,
        previousReturn: correctionRequest,
        decision: { action: 'Approved', actorDisplayName: 'Test Rəhbər', occurredAtUtc: '2026-09-23T09:30:00Z', reason: null },
      },
    }))

    expect(within(panel).getByText('Təsdiqləyən')).toBeInTheDocument()
    expect(within(panel).getByText('Təsdiq tarixi')).toBeInTheDocument()
    expect(within(panel).getAllByText('Test Rəhbər').length).toBeGreaterThan(0)
    expect(within(panel).getByText('Göndərən')).toBeInTheDocument()
    expect(within(panel).getByText('İkinci göndəriş · düzəliş tələbindən sonra')).toBeInTheDocument()
  })

  it('says a draft has not been sent yet', async () => {
    const panel = await renderPanel(workflow({ status: 'Draft' }))

    expect(within(panel).getByText('Hələ təqdim olunmayıb')).toBeInTheDocument()
    expect(within(panel).queryByText('Göndərən')).toBeNull()
  })

  it('shows a correction not yet sent the request it answers', async () => {
    const panel = await renderPanel(workflow({
      status: 'Draft',
      decisionFacts: { ...neverSent, previousReturn: correctionRequest },
    }))

    expect(within(panel).getByText('Hələ təqdim olunmayıb')).toBeInTheDocument()
    expect(within(panel).getByText('Zibil paketi sayı çoxdur')).toBeInTheDocument()
  })

  it('keeps the amount line as it was, without the moments that are now facts', async () => {
    const panel = await renderPanel(workflow({
      status: 'Approved',
      submittedAtUtc: '2026-09-10T08:00:00Z',
      approvedAtUtc: '2026-09-11T09:30:00Z',
    }))

    expect(within(panel).getByText(/Məbləğ: 12\.317,61 ₼ · 95 sətir/)).toBeInTheDocument()
    expect(within(panel).queryByText(/Təqdim: /)).toBeNull()
    expect(within(panel).queryByText(/Təsdiq: /)).toBeNull()
  })

  it('introduces no "Versiya" anywhere in the panel', async () => {
    const panel = await renderPanel(workflow({
      status: 'PendingApproval',
      version: 3,
      decisionFacts: { ...sentOnce, submissionNumber: 3, previousReturn: correctionRequest },
    }))

    expect(panel).not.toHaveTextContent(/Versiya/)
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

  it('offers a coordinator nothing on a waiting request, and tells them nothing', async () => {
    await renderPanel(workflow({ status: 'PendingApproval', allowedActions: nobody }))

    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lets a Rəhbər decide on a waiting request but not submit a draft', async () => {
    await renderPanel(workflow({
      status: 'PendingApproval',
      allowedActions: { ...nobody, canApprove: true, canReturn: true },
    }))

    expect(screen.getByRole('button', { name: 'Təsdiqlə' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Düzəliş tələb et' })).toBeInTheDocument()

    await renderPanel(workflow({ status: 'Draft', allowedActions: nobody }))
    expect(screen.queryByRole('button', { name: 'Təsdiqə göndər' })).toBeNull()
  })

  it('tells an administrator the decision is the Rəhbər’s, and offers no decision button', async () => {
    const panel = await renderPanel(workflow({
      status: 'PendingApproval',
      submittedByUserId: '4f1f0a2e-0000-4000-8000-000000000001',
      allowedActions: { ...nobody, blockedByMissingAuthority: true },
    }))

    expect(within(panel).getByRole('status')).toHaveTextContent(
      'Təsdiq səlahiyyətiniz yoxdur. Qərarı Rəhbər rolu olan istifadəçi verir.',
    )
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
    // The facts are still there to read.
    expect(within(panel).getByText('Test Koordinator')).toBeInTheDocument()
  })

  it('gives the missing authority, not the self-submission, when both would apply', async () => {
    const panel = await renderPanel(workflow({
      status: 'PendingApproval',
      allowedActions: { ...nobody, blockedByMissingAuthority: true, blockedBySelfApproval: true },
    }))

    expect(within(panel).getAllByRole('status')).toHaveLength(1)
    expect(within(panel).queryByText(/Özünüzün təsdiqə göndərdiyiniz/)).toBeNull()
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

  it('offers neither approval nor a correction request, whatever the role', async () => {
    await renderPanel(ownSubmission)

    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
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
    expect(screen.queryByRole('button', { name: 'Düzəliş tələb et' })).toBeNull()
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

  it('will not ask for a correction without a reason (4.2)', async () => {
    const user = userEvent.setup()
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Düzəliş tələb et' }))

    const confirm = screen.getAllByRole('button', { name: 'Düzəliş tələb et' }).at(-1)!
    expect(confirm).toBeDisabled()
    expect(screen.getByText('Düzəliş tələb etmək üçün səbəb yazılmalıdır.')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Nəyin düzəldilməli olduğunu yazın'), 'Zibil paketi sayı çoxdur')
    expect(confirm).toBeEnabled()
  })

  it('sends the reason that was written with the correction request', async () => {
    const user = userEvent.setup()
    workflowApi.returnForCorrection.mockResolvedValue(workflow({ status: 'ReturnedForCorrection' }))
    await renderPanel(workflow({ status: 'PendingApproval' }))

    await user.click(screen.getByRole('button', { name: 'Düzəliş tələb et' }))
    await user.type(screen.getByPlaceholderText('Nəyin düzəldilməli olduğunu yazın'), 'Zibil paketi sayı çoxdur')
    await user.click(screen.getAllByRole('button', { name: 'Düzəliş tələb et' }).at(-1)!)

    await waitFor(() => expect(workflowApi.returnForCorrection).toHaveBeenCalledWith(105, {
      reason: 'Zibil paketi sayı çoxdur',
    }))
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
    priceNotRequiredItemCount: 0,
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

/**
 * An order carried in from Excel as already approved: Approved, with neither moment recorded and nobody
 * behind it. Owner decision 4.1: the panel says exactly "Excel importu ilə daxil edilib · Təsdiq məlumatı
 * mövcud deyil." — and invents no sender, no approver and no date.
 */
const historical = (): Partial<OrderWorkflow> => ({
  status: 'Approved',
  submittedAtUtc: null,
  approvedAtUtc: null,
  returnedAtUtc: null,
  submittedByUserId: null,
  decisionFacts: { ...neverSent, isHistoricalImport: true },
  history: [{
    id: 1,
    action: 'ImportedAsApproved',
    fromStatus: 'Draft',
    toStatus: 'Approved',
    actorUserId: null,
    actorDisplayName: 'Sistem',
    comment: 'Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.',
    missingPriceItemCount: 0,
    missingPricesAcknowledged: false,
    occurredAtUtc: '2026-09-23T12:26:42Z',
  }],
})

describe('an order carried in from Excel as already approved', () => {
  it('says exactly the owner’s sentence', async () => {
    const panel = await renderPanel(workflow({ ...historical(), history: [] }))

    expect(within(panel).getByText('Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil.')).toBeInTheDocument()
  })

  it('names nobody and dates nothing about its submission or approval', async () => {
    const panel = await renderPanel(workflow({ ...historical(), history: [] }))

    for (const label of ['Göndərən', 'Göndərilib', 'Göndəriş', 'Təsdiqləyən', 'Təsdiq tarixi']) {
      expect(within(panel).queryByText(label)).toBeNull()
    }
    expect(panel).not.toHaveTextContent(/Sistem/)
    expect(panel).not.toHaveTextContent(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('never calls an approved order one that has not been sent', async () => {
    await renderPanel(workflow(historical()))

    expect(screen.queryByText(/Hələ təqdim olunmayıb/)).toBeNull()
  })

  it('offers no action, the same as any approved order', async () => {
    await renderPanel(workflow(historical()))

    expect(screen.queryByRole('button', { name: /Təsdiqə göndər/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsdiqlə' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Düzəliş tələb et/ })).toBeNull()
  })

  it('names the carried-over event in the reader s own words, in the history', async () => {
    await renderPanel(workflow(historical()))

    const entry = screen.getByRole('listitem')
    expect(within(entry).getByText('Təsdiqlənmiş kimi köçürülüb')).toBeInTheDocument()
    expect(within(entry).queryByText('Təsdiqləndi')).toBeNull()
  })

  /** Grey, not the green of a decision taken here: this is a record carried over, not an approval given. */
  it('does not dress the carried-over record as a decision made here', async () => {
    await renderPanel(workflow(historical()))

    expect(screen.getByText('Təsdiqlənmiş kimi köçürülüb')).toHaveClass('bg-slate-100')
  })
})
