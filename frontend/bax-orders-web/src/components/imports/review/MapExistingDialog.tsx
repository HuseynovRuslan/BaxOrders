import { useEffect, useState } from 'react'
import {
  fetchVariantPlan,
  mapToExisting,
  searchProductVariants,
  searchReference,
  type ReferenceOption,
  type ResolutionKind,
  type ResolutionResult,
  type UnresolvedValue,
  type VariantPlan,
} from '../../../api/review'
import { useAuth } from '../../../auth/AuthProvider'
import { resolutionKindSingular, unitlessOrderUnitLabel } from '../labels'
import { Modal } from './Modal'

interface MapExistingDialogProps {
  importId: number
  kind: ResolutionKind
  value: UnresolvedValue
  onClose: () => void
  onResolved: (result: ResolutionResult) => void
}

export function MapExistingDialog({ importId, kind, value, onClose, onResolved }: MapExistingDialogProps) {
  const { user } = useAuth()
  const isVariant = kind === 'ProductVariant'
  const [search, setSearch] = useState(isVariant ? '' : value.displayValue)
  const [options, setOptions] = useState<ReferenceOption[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [saveAlias, setSaveAlias] = useState(false)
  const [plan, setPlan] = useState<VariantPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A category path and a variant are identified by this import's own decisions, so neither becomes an alias.
  // A product's alternative name is saved only by whoever may decide product matches (13.2); the server refuses
  // anybody else whatever this offers.
  const aliasSupported =
    kind !== 'CategoryPath' && !isVariant && (kind !== 'Product' || user.canDecideProductMatches)

  // The variant's product decides which variants may be offered at all.
  useEffect(() => {
    if (!isVariant) return
    const controller = new AbortController()
    fetchVariantPlan(importId, value.sourceKey, controller.signal)
      .then(setPlan)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, isVariant, value.sourceKey])

  useEffect(() => {
    if (isVariant && !plan?.canCreate) return

    const controller = new AbortController()
    setOptions(null)
    const timer = setTimeout(() => {
      const results = isVariant
        ? searchProductVariants(plan!.productId, search.trim(), controller.signal)
        : searchReference(kind, search.trim(), controller.signal)

      results.then(setOptions).catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Axtarış alınmadı')
        }
      })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [isVariant, kind, plan, search])

  async function submit() {
    if (selectedId === null) return
    setBusy(true)
    setError(null)
    try {
      onResolved(await mapToExisting(importId, {
        kind,
        sourceKey: value.sourceKey,
        targetId: selectedId,
        scope: saveAlias && aliasSupported ? 'GlobalAlias' : 'BatchOnly',
      }))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Mövcud olana bağla — ${resolutionKindSingular[kind]}`}
      subtitle={`«${value.displayValue}» · ${value.affectedRowCount} sətir`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={selectedId === null || busy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Təsdiqlə
          </button>
        </>
      }
    >
      {isVariant && (
        <div className="mb-3 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          {plan === null && !error && <p className="text-slate-500">Yüklənir…</p>}
          {plan && (
            <>
              <p className="text-slate-900">{plan.productLabel}</p>
              <p className="text-xs text-slate-600">
                Ö/v: {plan.orderUnitLabel || unitlessOrderUnitLabel}
                {plan.specificationUnitLabel ? ` · Vahid: ${plan.specificationUnitLabel}` : ''}
                {plan.specificationDescriptor ? ` · Təsvir: ${plan.specificationDescriptor}` : ''}
              </p>
              <p className="text-xs text-slate-500">Yalnız bu məhsulun və eyni sifariş vahidinin variantları seçilə bilər.</p>
            </>
          )}
          {plan?.problem && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">{plan.problem}</p>}
        </div>
      )}

      {(!isVariant || plan?.canCreate) && (
        <>
          <label className="block text-sm text-slate-700">
            Axtar
            <input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setSelectedId(null)
              }}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>

          <ul className="mt-3 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {options === null && <li className="px-3 py-4 text-center text-sm text-slate-500">Yüklənir…</li>}
            {options?.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">Nəticə yoxdur.</li>}
            {options?.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(option.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                    selectedId === option.id ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.secondary && <span className="shrink-0 text-xs text-slate-500">{option.secondary}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {aliasSupported && (
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={saveAlias} onChange={(event) => setSaveAlias(event.target.checked)} className="mt-0.5" />
          Gələcək importlarda da bu uyğunluğu yadda saxla
        </label>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}
