import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../../api/client'
import {
  applyBulk,
  previewBulk,
  searchReference,
  type BulkApplyResult,
  type BulkPreviewItem,
  type BulkPreviewResult,
  type BulkResolutionItem,
  type ReferenceOption,
  type ResolutionKind,
} from '../../../api/review'
import { useAuth } from '../../../auth/AuthProvider'
import { bulkStatusLabels, resolutionKindSingular } from '../labels'
import { Modal } from './Modal'

export type BulkMode = 'create' | 'map'

interface BulkActionDialogProps {
  importId: number
  kind: ResolutionKind
  sourceKeys: string[]
  mode: BulkMode
  onClose: () => void
  onApplied: (result: BulkApplyResult) => void
}

/**
 * Select → preview → confirm → apply. The preview comes from the server and is the only thing the confirmation
 * shows; the operator sees every value, every conflict and the exact number of rows before anything is written.
 */
export function BulkActionDialog({ importId, kind, sourceKeys, mode, onClose, onApplied }: BulkActionDialogProps) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<ReferenceOption[] | null>(null)
  const [target, setTarget] = useState<ReferenceOption | null>(null)
  const [saveAlias, setSaveAlias] = useState(false)
  const [preview, setPreview] = useState<BulkPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<BulkPreviewItem[] | null>(null)

  // A product's alternative name is saved only by whoever may decide product matches (13.2); the server refuses
  // the whole set for anybody else.
  const aliasSupported =
    mode === 'map' &&
    kind !== 'CategoryPath' &&
    kind !== 'ProductVariant' &&
    (kind !== 'Product' || user.canDecideProductMatches)

  const items = useMemo<BulkResolutionItem[]>(
    () =>
      sourceKeys.map((sourceKey) =>
        mode === 'create'
          ? { kind, sourceKey, action: 'CreateFromValue', scope: 'BatchOnly' }
          : {
              kind,
              sourceKey,
              action: 'MapExisting',
              targetId: target?.id ?? null,
              scope: saveAlias && aliasSupported ? 'GlobalAlias' : 'BatchOnly',
            },
      ),
    [aliasSupported, kind, mode, saveAlias, sourceKeys, target],
  )

  useEffect(() => {
    if (mode !== 'map') return
    const controller = new AbortController()
    setOptions(null)
    const timer = setTimeout(() => {
      searchReference(kind, search.trim(), controller.signal)
        .then(setOptions)
        .catch((problem: unknown) => {
          if (!controller.signal.aborted) {
            setError(problem instanceof Error ? problem.message : 'Axtarış alınmadı')
          }
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [kind, mode, search])

  // Nothing is written here: the preview is a read-only plan the operator confirms.
  useEffect(() => {
    if (mode === 'map' && target === null) {
      setPreview(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setPreview(null)
    setError(null)
    previewBulk(importId, items, controller.signal)
      .then((result) => {
        setPreview(result)
        setLoading(false)
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [importId, items, mode, target])

  async function submit() {
    if (!preview || preview.summary.ready === 0) return
    setBusy(true)
    setError(null)
    setConflicts(null)
    try {
      onApplied(await applyBulk(importId, items))
    } catch (problem) {
      if (problem instanceof ApiError && Array.isArray(problem.problem?.items)) {
        setConflicts(problem.problem.items as BulkPreviewItem[])
      }
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
      setBusy(false)
    }
  }

  const summary = preview?.summary
  const ready = summary?.ready ?? 0
  const singular = resolutionKindSingular[kind]
  const applyLabel =
    mode === 'create'
      ? `${ready} yeni ${singular} yarat və uyğunlaşdır`
      : `${ready} dəyəri «${target?.label ?? '—'}» ilə uyğunlaşdır`

  return (
    <Modal
      title={mode === 'create' ? `Seçilənləri yeni ${singular} kimi yarat` : `Seçilənləri mövcud olana bağla`}
      subtitle={`${sourceKeys.length} dəyər seçilib`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || loading || ready === 0}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Tətbiq olunur…' : applyLabel}
          </button>
        </>
      }
    >
      {mode === 'map' && (
        <div className="mb-3">
          <label className="block text-sm text-slate-700">
            Hansı qeydə bağlanacaq?
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setTarget(null)
              }}
              placeholder="Axtar…"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>

          <ul className="mt-2 max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {options === null && <li className="px-3 py-3 text-center text-sm text-slate-500">Yüklənir…</li>}
            {options?.length === 0 && <li className="px-3 py-3 text-center text-sm text-slate-500">Nəticə yoxdur.</li>}
            {options?.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setTarget(option)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                    target?.id === option.id ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.secondary && <span className="shrink-0 text-xs text-slate-500">{option.secondary}</span>}
                </button>
              </li>
            ))}
          </ul>

          {aliasSupported && (
            <label className="mt-2 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={saveAlias} onChange={(event) => setSaveAlias(event.target.checked)} className="mt-0.5" />
              Seçilən yazılışları gələcək importlar üçün də yadda saxla
            </label>
          )}
        </div>
      )}

      {mode === 'map' && target === null && (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-600">
          Əvvəlcə hədəf qeydi seçin — sistem özü uyğunluq təyin etmir.
        </p>
      )}

      {loading && <p className="py-3 text-center text-sm text-slate-500">Plan hazırlanır…</p>}

      {summary && (
        <>
          <dl className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-3">
            <Fact label="Seçilib" value={summary.selected} />
            <Fact label="Tətbiq olunacaq" value={summary.ready} tone="emerald" />
            <Fact label="Konflikt" value={summary.conflicts} tone={summary.conflicts > 0 ? 'red' : undefined} />
            <Fact label="Artıq həll olunub" value={summary.alreadyResolved} />
            <Fact label="Asılılıq gözləyir" value={summary.dependencyBlocked} tone={summary.dependencyBlocked > 0 ? 'amber' : undefined} />
            <Fact label="Yeni qeyd" value={summary.recordsToCreate} />
            <Fact label="Yeni alias" value={summary.aliasesToCreate} />
            <Fact label="Yenidən yoxlanacaq sətir" value={summary.rowsAffected} />
          </dl>

          {summary.conflicts + summary.dependencyBlocked > 0 && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
              Əməliyyat bütövdür: bir dəyər belə konflikt versə, heç nə yazılmayacaq. Problemli dəyərləri seçimdən çıxarın.
            </p>
          )}

          <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200 text-sm">
            {preview?.items.map((item) => (
              <li key={item.sourceKey} className="px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${statusTone(item.status)}`}>{bulkStatusLabels[item.status]}</span>
                  {item.parentLabel && <span className="text-xs text-slate-500">{item.parentLabel} ·</span>}
                  <span className="font-medium text-slate-900">{item.displayValue}</span>
                  <span className="text-xs text-slate-500">{item.affectedRowCount} sətir</span>
                  {item.sourceSpellings > 1 && <span className="text-xs text-slate-500">· {item.sourceSpellings} yazılış</span>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">
                  {item.createsRecord ? `Yaradılacaq: ${item.targetLabel ?? item.displayValue}` : `Bağlanacaq: ${item.targetLabel ?? '—'}`}
                  {item.createsAlias && ' · alias yadda saxlanacaq'}
                </p>
                {item.problem && <p className="mt-0.5 text-xs text-red-700">{item.problem}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {conflicts && conflicts.length > 0 && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          <p className="font-medium">Bu dəyərlər əməliyyatı dayandırdı:</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {conflicts.map((item) => (
              <li key={item.sourceKey}>
                «{item.displayValue}» — {item.problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}

function Fact({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'red' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : tone === 'amber' ? 'text-amber-800' : 'text-slate-900'
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-base font-medium ${color}`}>{value}</dd>
    </div>
  )
}

function statusTone(status: BulkPreviewItem['status']): string {
  switch (status) {
    case 'Ready':
      return 'bg-emerald-50 text-emerald-800'
    case 'AlreadyResolved':
      return 'bg-slate-100 text-slate-600'
    case 'DependencyBlocked':
      return 'bg-amber-50 text-amber-900'
    default:
      return 'bg-red-50 text-red-800'
  }
}
