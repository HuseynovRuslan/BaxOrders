import { ArrowLeft, ArrowRight, GitBranch } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../../api/client'
import { createRevision, type OrderRevision } from '../../../api/revisions'
import { correctedOrderLabel, previousOrderLinkLabel } from '../../../terminology/terms'
import { Modal } from '../../imports/review/Modal'
import {
  createNextRevisionLabel,
  createRevisionExplanation,
  createRevisionLabel,
  openRevisionLabel,
  revisionErrors,
} from './labels'

interface RevisionPanelProps {
  revision: OrderRevision
  onChanged: () => void
}

/**
 * Where this order sits among the orders of its month — the one it corrects, the one that corrects it — and the
 * one action that creates a correction.
 * <para>
 * Nothing here decides who may do what: `canCreateRevision` is the server's answer, and the endpoint checks it
 * again. The links are always shown, whoever is reading — the history of a month is not a permission.
 * </para>
 */
export function RevisionPanel({ revision, onChanged }: RevisionPanelProps) {
  const [asking, setAsking] = useState(false)

  const previous = revision.revisedFrom
  const next = revision.revisedInto
  const nothingToShow = !revision.isRevision && next === null && !revision.canCreateRevision

  if (nothingToShow) {
    return null
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      {/*
        Unmistakable: this is not the reviewed order, it is the one being corrected. Said in business words —
        the version numbers stay in the "Mənbəyə bax" drawer — and the status only once, in the page header.
      */}
      {revision.isRevision && previous && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
          <GitBranch className="size-4 shrink-0 text-sky-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-sky-900">{correctedOrderLabel}</p>
            <p className="text-xs text-sky-800">Düzəliş tələbindən sonra əvvəlki sifarişdən yaradılıb</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {previous && (
          <Link
            to={`/orders/${previous.orderRequestId}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {previousOrderLinkLabel}
          </Link>
        )}

        {next && (
          <Link
            to={`/orders/${next.orderRequestId}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {openRevisionLabel}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}

        {/* Offered only where the server says so, and never next to a link to a correction that exists. */}
        {revision.canCreateRevision && next === null && (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {revision.isRevision ? createNextRevisionLabel : createRevisionLabel}
          </button>
        )}
      </div>

      {previous && (
        <p className="mt-3 text-xs text-slate-500">
          Əvvəlki sifariş dəyişdirilmir. Düzəlişlər bu sifarişdə aparılır.
        </p>
      )}

      {asking && (
        <CreateRevisionDialog
          orderRequestId={revision.orderRequestId}
          version={revision.version}
          onClose={() => setAsking(false)}
          onChanged={onChanged}
        />
      )}
    </section>
  )
}

/**
 * Asks before creating a version, and says plainly what will and will not happen.
 * <para>
 * The button disables itself while the request is in flight, and a second correction cannot appear from a
 * double click anyway: the server answers the second call with the first correction.
 * </para>
 */
function CreateRevisionDialog({
  orderRequestId,
  version,
  onClose,
  onChanged,
}: {
  orderRequestId: number
  version: number
  onClose: () => void
  onChanged: () => void
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const created = await createRevision(orderRequestId)
      onChanged()
      navigate(`/orders/${created.orderRequestId}`)
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : revisionErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={createRevisionLabel}
      subtitle={`Versiya ${version}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            İmtina
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Yaradılır…' : createRevisionLabel}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">{createRevisionExplanation}</p>
        <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
          Yeni versiyada bu versiyanın bütün sətirləri olduğu kimi olacaq. Sonra onları redaktə edib təsdiqə
          göndərə bilərsiniz.
        </p>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
