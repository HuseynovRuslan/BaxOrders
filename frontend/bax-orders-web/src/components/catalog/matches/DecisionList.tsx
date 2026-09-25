import { useEffect, useMemo, useRef, useState } from 'react'
import type { PagedResult } from '../../../api/orders'
import {
  fetchProductMatchDecisions,
  type ProductMatchDecision,
  type ProductMatchKind,
  type ProductMatchOutcome,
} from '../../../api/productMatches'
import { matchUndoneLabel } from '../../../terminology/terms'
import { formatCount } from '../../analytics/format'
import { EmptyState, ErrorState, LoadingRows } from '../../EmptyState'
import { formatWorkflowMoment } from '../../workflow/labels'
import { includeUndoneLabel, kindLabels, kindOrder, outcomeLabels, readableVariantDescription, undoLabel } from './labels'
import { UndoDecisionDialog } from './UndoDecisionDialog'

export const decisionPageSize = 50

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

const outcomeOrder: ProductMatchOutcome[] = ['Approved', 'Rejected']

interface DecisionListProps {
  /** Whether this person may take a decision back. The server checks again either way (13.2). */
  canDecide: boolean
}

/**
 * "Qərarlar": every decision about a pair, newest first, as it was made and — if it was — as it was taken back.
 * <para>
 * A decision is never deleted, so an undone one stays in the record, marked as such, with who undid it, when and
 * why. Only a decision that still stands can be taken back, and only by somebody who may decide.
 * </para>
 */
export function DecisionList({ canDecide }: DecisionListProps) {
  const [kind, setKind] = useState<ProductMatchKind | undefined>(undefined)
  const [outcome, setOutcome] = useState<ProductMatchOutcome | undefined>(undefined)
  const [includeUndone, setIncludeUndone] = useState(false)
  const [page, setPage] = useState(1)
  const [refreshToken, setRefreshToken] = useState(0)
  const [list, setList] = useState<Loaded<PagedResult<ProductMatchDecision>>>({ status: 'loading' })
  const [undoing, setUndoing] = useState<ProductMatchDecision | null>(null)

  const query = useMemo(
    () => ({ kind, outcome, includeUndone, page, pageSize: decisionPageSize }),
    [kind, outcome, includeUndone, page],
  )

  const lastKey = useRef('')
  useEffect(() => {
    const key = `${JSON.stringify(query)}|${refreshToken}`
    lastKey.current = key
    const controller = new AbortController()
    setList({ status: 'loading' })

    fetchProductMatchDecisions(query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setList({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setList({ status: 'error', message: problem instanceof Error && problem.message ? problem.message : 'Qərarlar yüklənmədi' })
        }
      })

    return () => controller.abort()
  }, [query, refreshToken])

  function reload() {
    setRefreshToken((token) => token + 1)
  }

  const data = list.status === 'success' ? list.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / decisionPageSize)) : 1

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Növ</span>
          <select
            value={kind ?? ''}
            onChange={(event) => {
              setKind(event.target.value === '' ? undefined : (event.target.value as ProductMatchKind))
              setPage(1)
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="">Hamısı</option>
            {kindOrder.map((option) => <option key={option} value={option}>{kindLabels[option]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Qərar</span>
          <select
            value={outcome ?? ''}
            onChange={(event) => {
              setOutcome(event.target.value === '' ? undefined : (event.target.value as ProductMatchOutcome))
              setPage(1)
            }}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="">Hamısı</option>
            {outcomeOrder.map((option) => <option key={option} value={option}>{outcomeLabels[option]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeUndone}
            onChange={(event) => {
              setIncludeUndone(event.target.checked)
              setPage(1)
            }}
          />
          <span className="text-xs text-slate-700">{includeUndoneLabel}</span>
        </label>
      </div>

      {list.status === 'error' && <ErrorState message={list.message} />}
      {list.status === 'loading' && <LoadingRows label="Qərarlar yüklənir" />}

      {data && data.items.length === 0 && <EmptyState>Bu seçimə uyğun qərar yoxdur.</EmptyState>}

      {data && data.items.length > 0 && (
        <ul className="space-y-2" aria-label="Qərarlar">
          {data.items.map((decision) => (
            <DecisionRow
              key={decision.id}
              decision={decision}
              canUndo={canDecide && decision.isLive}
              onUndo={() => setUndoing(decision)}
            />
          ))}
        </ul>
      )}

      {data && data.totalCount > decisionPageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.page} / {totalPages} · {formatCount(data.totalCount)} qərar</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Əvvəlki
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Növbəti
            </button>
          </div>
        </div>
      )}

      {undoing && (
        <UndoDecisionDialog
          decision={undoing}
          onClose={() => setUndoing(null)}
          onUndone={() => {
            setUndoing(null)
            reload()
          }}
          onRefused={reload}
        />
      )}
    </div>
  )
}

function DecisionRow({ decision, canUndo, onUndo }: { decision: ProductMatchDecision; canUndo: boolean; onUndo: () => void }) {
  const isSpelling = decision.kind === 'SameItem'
  return (
    <li
      className={`flex flex-col gap-2 rounded-lg border p-3 lg:flex-row lg:items-start lg:justify-between ${
        decision.isLive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">{kindLabels[decision.kind]}</span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              decision.outcome === 'Approved' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
            }`}
          >
            {outcomeLabels[decision.outcome]}
          </span>
          {!decision.isLive && (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-medium text-slate-700">{matchUndoneLabel}</span>
          )}
        </p>
        <p className={`break-words text-sm ${decision.isLive ? 'text-slate-900' : 'text-slate-600 line-through decoration-slate-400'}`}>
          {decision.sourceProductName}
          {isSpelling && decision.sourceVariantDescription && (
            <span className="text-xs"> ({readableVariantDescription(decision.sourceVariantDescription)})</span>
          )}
          {' → '}
          {decision.targetProductName}
          {isSpelling && decision.targetVariantDescription && (
            <span className="text-xs"> ({readableVariantDescription(decision.targetVariantDescription)})</span>
          )}
        </p>
        {!isSpelling && decision.variantLabel && (
          <p className="text-xs text-slate-600">Variant: <span className="font-medium">{decision.variantLabel}</span></p>
        )}
        {decision.reason && <p className="text-xs text-slate-600">Səbəb: {decision.reason}</p>}
        <p className="text-xs text-slate-500">
          {decision.decidedByDisplayName} · {formatWorkflowMoment(decision.decidedAtUtc)}
        </p>
        {!decision.isLive && (
          <p className="text-xs text-slate-600">
            {matchUndoneLabel}: {decision.undoneByDisplayName}
            {decision.undoneAtUtc && ` · ${formatWorkflowMoment(decision.undoneAtUtc)}`}
            {decision.undoReason && ` · Səbəb: ${decision.undoReason}`}
          </p>
        )}
      </div>
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 self-start rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {undoLabel}
        </button>
      )}
    </li>
  )
}
