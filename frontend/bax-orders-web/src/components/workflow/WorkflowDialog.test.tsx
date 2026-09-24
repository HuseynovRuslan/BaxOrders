import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OrderWorkflow } from '../../api/workflow'
import { WorkflowDialog, type WorkflowDialogKind } from './WorkflowDialog'

/**
 * The confirmation every decision goes through. It says what is being decided — which month, which time it
 * was sent, how many lines and how much money — in business language: no version number.
 */
function workflow(overrides: Partial<OrderWorkflow> = {}): OrderWorkflow {
  return {
    orderRequestId: 105,
    locationId: 21,
    locationName: 'Fəvvarələr meydanı',
    requestPeriod: '2026-07-01',
    version: 2,
    status: 'PendingApproval',
    allowedActions: {
      canSubmit: false,
      canApprove: true,
      canReturn: true,
      blockedBySelfApproval: false,
      blockedByOwnContribution: false,
      blockedByMissingAuthority: false,
    },
    submittedByUserId: null,
    submittedAtUtc: '2026-09-22T10:32:00Z',
    approvedAtUtc: null,
    returnedAtUtc: null,
    itemCount: 95,
    missingPriceItemCount: 0,
    priceNotRequiredItemCount: 0,
    knownAmountTotal: 12317.61,
    amountIsComplete: true,
    requiresMissingPriceAcknowledgement: false,
    history: [],
    decisionFacts: {
      isHistoricalImport: false,
      submissionNumber: 2,
      submittedByDisplayName: 'Test Koordinator',
      submittedAtUtc: '2026-09-22T10:32:00Z',
      previousReturn: {
        action: 'ReturnedForCorrection',
        actorDisplayName: 'Test Rəhbər',
        occurredAtUtc: '2026-09-21T09:00:00Z',
        reason: 'Zibil paketi sayı çoxdur',
      },
      decision: null,
    },
    ...overrides,
  }
}

function renderDialog(kind: WorkflowDialogKind, state = workflow()) {
  const onConfirm = vi.fn().mockResolvedValue(undefined)
  render(<WorkflowDialog kind={kind} workflow={state} onClose={vi.fn()} onConfirm={onConfirm} />)
  return { dialog: screen.getByRole('dialog'), onConfirm }
}

describe('asking for a correction', () => {
  it('is called "Düzəliş tələb et", in the title and on the button that confirms it', () => {
    const { dialog } = renderDialog('return')

    expect(within(dialog).getByRole('heading', { name: 'Düzəliş tələb et' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Düzəliş tələb et' })).toBeInTheDocument()
  })

  it('cannot be confirmed while the reason is empty, or only spaces (4.2)', async () => {
    const user = userEvent.setup()
    const { dialog, onConfirm } = renderDialog('return')
    const confirm = within(dialog).getByRole('button', { name: 'Düzəliş tələb et' })

    expect(confirm).toBeDisabled()
    expect(within(dialog).getByText('Düzəliş tələb etmək üçün səbəb yazılmalıdır.')).toBeInTheDocument()

    await user.type(within(dialog).getByPlaceholderText('Nəyin düzəldilməli olduğunu yazın'), '   ')
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByPlaceholderText('Nəyin düzəldilməli olduğunu yazın'), 'Miqdar çoxdur')
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(onConfirm).toHaveBeenCalledWith({ comment: 'Miqdar çoxdur', acknowledge: false })
  })
})

describe('what is being decided', () => {
  it.each<WorkflowDialogKind>(['approve', 'return', 'submit'])('names no version number when it is to %s', (kind) => {
    const { dialog } = renderDialog(kind)

    expect(dialog).not.toHaveTextContent(/Versiya/)
  })

  it('says which time the order was sent, in words', () => {
    const { dialog } = renderDialog('approve')

    expect(within(dialog).getAllByText(/İkinci göndəriş · düzəliş tələbindən sonra/).length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Göndəriş')).toBeInTheDocument()
  })

  it('keeps the other facts it always showed', () => {
    const { dialog } = renderDialog('approve')

    for (const label of ['Obyekt', 'Dövr', 'Məbləğ']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument()
    }
  })

  /** Task 05b: a line count is not something the manager decides by, so the dialog no longer states one. */
  it('states no line count', () => {
    const { dialog } = renderDialog('approve')

    expect(within(dialog).queryByText('Sətir sayı')).toBeNull()
    expect(dialog).not.toHaveTextContent(/Sətir sayı/)
  })

  /** Owner decision 5.1: an amount that leaves out unpriced lines is named as exactly that. */
  it('heads an incomplete amount as the total of the priced lines', () => {
    const { dialog } = renderDialog('approve', workflow({
      missingPriceItemCount: 3,
      amountIsComplete: false,
      requiresMissingPriceAcknowledgement: true,
    }))

    expect(within(dialog).getByText('Qiyməti olan sətirlərin cəmi')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Məlum qiymətlər üzrə/)).toBeNull()
    expect(within(dialog).getByText('3 sətirdə qiymət yoxdur. Təsdiq edilən məbləğ tam deyil.')).toBeInTheDocument()
  })

  it('shows no count for an order that is only now being sent', () => {
    const { dialog } = renderDialog('submit', workflow({
      status: 'Draft',
      decisionFacts: { ...workflow().decisionFacts, submissionNumber: 0, previousReturn: null },
    }))

    expect(within(dialog).queryByText('Göndəriş')).toBeNull()
    expect(within(dialog).queryByText(/göndəriş/)).toBeNull()
  })
})
