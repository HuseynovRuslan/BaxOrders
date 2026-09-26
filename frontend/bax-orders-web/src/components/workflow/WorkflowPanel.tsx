import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  approveOrder,
  fetchWorkflow,
  returnForCorrection,
  submitForApproval,
  type OrderWorkflow,
  type WorkflowDecisionEvent,
  type WorkflowDecisionFacts,
} from '../../api/workflow'
import { systemActorLabel } from '../../auth/labels'
import { WorkflowDialog, type WorkflowDialogKind } from './WorkflowDialog'
import { WorkflowHistory } from './WorkflowHistory'
import {
  approveLabel,
  decisionFactLabels,
  formatWorkflowMoment,
  historicalImportNote,
  missingAuthorityNote,
  missingPriceNote,
  notSubmittedYetNote,
  ownContributionBlockedNote,
  resubmitLabel,
  returnLabel,
  selfApprovalBlockedNote,
  submissionCountLabel,
  submitLabel,
} from './labels'

interface WorkflowPanelProps {
  orderRequestId: number
  onStatusChanged?: (workflow: OrderWorkflow) => void
  /**
   * Every workflow this panel has read — the first load and each action's answer — so the page can say what only
   * the workflow knows (whether the order is historical) without asking the server a second time. Never called for
   * an abandoned load.
   */
  onLoaded?: (workflow: OrderWorkflow) => void
  /** False where the page shows the history itself, so it is not on the screen twice. */
  showHistory?: boolean
}

/**
 * The decision: what may be done to a request now, and what the person deciding needs to know first.
 * <para>
 * The buttons come first, so nobody has to look for them. Then, at most one reason why none is offered, and
 * then the facts — who sent it, when, which time, what the last correction request said, who decided. The
 * status is not repeated here: the page header says it once.
 * </para>
 * <para>
 * Which buttons appear is the server's answer, not this component's opinion: the state, the signed-in
 * person's approval authority and whether this is their own submission all fold into <c>allowedActions</c>,
 * and the endpoint checks the same rules again when the action is taken. The facts are the server's too, read
 * off the recorded events; nothing here fills a gap with a name or a date.
 * </para>
 */
export function WorkflowPanel({
  orderRequestId,
  onStatusChanged,
  onLoaded,
  showHistory = true,
}: WorkflowPanelProps) {
  const [workflow, setWorkflow] = useState<OrderWorkflow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<WorkflowDialogKind | null>(null)

  // The latest callback, read when the answer arrives: a page passing a new function each render must not
  // re-fetch the workflow.
  const onLoadedRef = useRef(onLoaded)
  useEffect(() => {
    onLoadedRef.current = onLoaded
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchWorkflow(orderRequestId, controller.signal)
      .then((loaded) => {
        setWorkflow(loaded)
        if (!controller.signal.aborted) {
          onLoadedRef.current?.(loaded)
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'İş axını yüklənmədi')
        }
      })
    return () => controller.abort()
  }, [orderRequestId])

  async function run(kind: WorkflowDialogKind, input: { comment: string; acknowledge: boolean }) {
    const comment = input.comment.length > 0 ? input.comment : undefined
    const updated =
      kind === 'submit'
        ? await submitForApproval(orderRequestId, { comment })
        : kind === 'approve'
          ? await approveOrder(orderRequestId, { comment, acknowledgeMissingPrices: input.acknowledge })
          : await returnForCorrection(orderRequestId, { reason: input.comment })

    setWorkflow(updated)
    setDialog(null)
    onLoaded?.(updated)
    onStatusChanged?.(updated)
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        {error}
      </section>
    )
  }

  if (!workflow) {
    return <div className="h-24 animate-pulse rounded-lg bg-slate-100" aria-busy="true" />
  }

  const { allowedActions: allowed } = workflow
  const hasActions = allowed.canSubmit || allowed.canApprove || allowed.canReturn

  // One reason at most, in the order the server reports them: no authority at all comes first.
  const blockedNote = allowed.blockedByMissingAuthority
    ? missingAuthorityNote
    : allowed.blockedBySelfApproval
      ? selfApprovalBlockedNote
      : allowed.blockedByOwnContribution
        ? ownContributionBlockedNote
        : null

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Qərar">
      {/*
        On a phone the panel comes after the analysis, so the buttons are fixed to the bottom of the screen and
        stay in reach while "Niyə dəyişib?" is read. From 1024 pixels they are the first thing in the panel, which
        itself stays in view beside the analysis.
      */}
      {hasActions && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(15,23,42,0.08)] lg:static lg:z-auto lg:flex-wrap lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {allowed.canSubmit && (
            <button
              type="button"
              onClick={() => setDialog('submit')}
              className="flex-1 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 lg:flex-none lg:py-1.5"
            >
              {workflow.status === 'ReturnedForCorrection' ? resubmitLabel : submitLabel}
            </button>
          )}
          {allowed.canApprove && (
            <button
              type="button"
              onClick={() => setDialog('approve')}
              className="flex-1 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 lg:flex-none lg:py-1.5"
            >
              {approveLabel}
            </button>
          )}
          {allowed.canReturn && (
            <button
              type="button"
              onClick={() => setDialog('return')}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:flex-none lg:py-1.5"
            >
              {returnLabel}
            </button>
          )}
        </div>
      )}

      {blockedNote && (
        <p
          className={`${hasActions ? 'mt-3 ' : ''}rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700`}
          role="status"
        >
          {blockedNote}
        </p>
      )}

      <div className={hasActions || blockedNote ? 'mt-3' : undefined}>
        <DecisionFacts workflow={workflow} />
      </div>

      {/* The amount itself is in the page headline beside this panel; only what qualifies it is said here. */}
      {workflow.missingPriceItemCount > 0 && (
        <p className="mt-3 text-xs text-amber-800">{missingPriceNote(workflow.missingPriceItemCount)}</p>
      )}

      {workflow.status === 'ReturnedForCorrection' && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Bu sifariş üçün düzəliş tələb olunur. Düzəliş bu sifarişdə aparılmır: düzəldilmiş sifariş yaradılır.
        </p>
      )}

      {showHistory && workflow.history.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-xs font-medium text-slate-500">Əməliyyat tarixçəsi</h3>
          <div className="mt-2">
            <WorkflowHistory entries={workflow.history} />
          </div>
        </div>
      )}

      {dialog && (
        <WorkflowDialog
          kind={dialog}
          workflow={workflow}
          onClose={() => setDialog(null)}
          onConfirm={(input) => run(dialog, input)}
        />
      )}
    </section>
  )
}

/**
 * Who sent it, when, which time, the last correction request, and who decided — whatever of that was
 * recorded, and nothing that was not.
 */
function DecisionFacts({ workflow }: { workflow: OrderWorkflow }) {
  const facts = workflow.decisionFacts

  // 22.3: an order carried in from Excel says why nobody and no date is recorded, in one sentence, and 4.1's other
  // half still holds — nothing about who sent or approved it is made up.
  if (facts.isHistoricalImport) {
    return <p className="text-sm text-slate-700">{historicalImportNote}</p>
  }

  const decision = facts.decision
  const decided =
    decision?.action === 'Approved' ? (
      <>
        <Fact label={decisionFactLabels.approvedBy}>{actorName(decision)}</Fact>
        <Fact label={decisionFactLabels.approvedAt}>{formatWorkflowMoment(decision.occurredAtUtc)}</Fact>
      </>
    ) : decision?.action === 'ReturnedForCorrection' ? (
      <>
        <Fact label={decisionFactLabels.returnedBy}>{actorName(decision)}</Fact>
        <Fact label={decisionFactLabels.returnedAt}>{formatWorkflowMoment(decision.occurredAtUtc)}</Fact>
        <Fact label={decisionFactLabels.reason}>{decision.reason}</Fact>
      </>
    ) : null

  return (
    <dl className="space-y-1.5 text-xs">
      {decided}
      {decided && facts.submissionNumber > 0 && <div className="border-t border-slate-100" aria-hidden="true" />}
      <SubmissionFacts facts={facts} />
    </dl>
  )
}

function SubmissionFacts({ facts }: { facts: WorkflowDecisionFacts }) {
  const previous = facts.previousReturn

  return (
    <>
      {facts.submissionNumber === 0 ? (
        <Fact label={decisionFactLabels.submission}>{notSubmittedYetNote}</Fact>
      ) : (
        <>
          <Fact label={decisionFactLabels.submittedBy}>{facts.submittedByDisplayName || systemActorLabel}</Fact>
          {facts.submittedAtUtc && (
            <Fact label={decisionFactLabels.submittedAt}>{formatWorkflowMoment(facts.submittedAtUtc)}</Fact>
          )}
          <Fact label={decisionFactLabels.submission}>
            {submissionCountLabel(facts.submissionNumber, previous !== null)}
          </Fact>
        </>
      )}
      {previous && (
        <Fact label={decisionFactLabels.previousReturn}>
          <span className="block">{previous.reason}</span>
          <span className="block text-slate-500">
            {actorName(previous)} · {formatWorkflowMoment(previous.occurredAtUtc)}
          </span>
        </Fact>
      )}
    </>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-slate-900">{children}</dd>
    </div>
  )
}

/** The name as it was recorded; an event with nobody behind it is the system's. */
function actorName(event: WorkflowDecisionEvent): string {
  return event.actorDisplayName || systemActorLabel
}
