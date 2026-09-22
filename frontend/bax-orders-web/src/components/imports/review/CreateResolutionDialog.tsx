import { useEffect, useState } from 'react'
import {
  createCategoryPath,
  createLocation,
  createProduct,
  createProductVariant,
  createResponsiblePerson,
  createSupplier,
  createUnit,
  fetchCategoryPathPlan,
  fetchVariantPlan,
  searchReference,
  type CategoryPathPlan,
  type ReferenceOption,
  type ResolutionKind,
  type ResolutionResult,
  type ResolutionScope,
  type UnitType,
  type UnresolvedValue,
  type VariantPlan,
} from '../../../api/review'
import { formatSpecification, resolutionKindSingular, unitlessOrderUnitLabel, unitTypeLabels } from '../labels'
import { Modal } from './Modal'

interface CreateResolutionDialogProps {
  importId: number
  kind: ResolutionKind
  value: UnresolvedValue
  onClose: () => void
  onResolved: (result: ResolutionResult) => void
}

const unitTypes: UnitType[] = ['Count', 'Length', 'Area', 'Mass', 'Volume', 'Package', 'Pair', 'Other']

export function CreateResolutionDialog({ importId, kind, value, onClose, onResolved }: CreateResolutionDialogProps) {
  const [name, setName] = useState(value.displayValue)
  const [code, setCode] = useState('')
  const [symbol, setSymbol] = useState('')
  const [unitType, setUnitType] = useState<UnitType>('Other')
  const [saveAlias, setSaveAlias] = useState(false)
  const [plan, setPlan] = useState<CategoryPathPlan | null>(null)
  const [variantPlan, setVariantPlan] = useState<VariantPlan | null>(null)
  const [category, setCategory] = useState<ReferenceOption | null>(null)
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<ReferenceOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCategory = kind === 'CategoryPath'
  const isUnit = kind === 'OrderUnit' || kind === 'SpecificationUnit'
  const isProduct = kind === 'Product'
  const isVariant = kind === 'ProductVariant'

  useEffect(() => {
    if (!isCategory) return
    const controller = new AbortController()
    fetchCategoryPathPlan(importId, value.sourceKey, controller.signal)
      .then(setPlan)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, isCategory, value.sourceKey])

  useEffect(() => {
    if (!isVariant) return
    const controller = new AbortController()
    fetchVariantPlan(importId, value.sourceKey, controller.signal)
      .then(setVariantPlan)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, isVariant, value.sourceKey])

  // The category of a new product is optional and never filled in automatically.
  useEffect(() => {
    if (!isProduct || categorySearch.trim().length === 0) {
      setCategoryOptions(null)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchReference('CategoryPath', categorySearch.trim(), controller.signal)
        .then(setCategoryOptions)
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
  }, [isProduct, categorySearch])

  async function submit() {
    setBusy(true)
    setError(null)
    const scope: ResolutionScope = saveAlias ? 'GlobalAlias' : 'BatchOnly'
    const sourceKey = value.sourceKey

    try {
      const result = isCategory
        ? await createCategoryPath(importId, { sourceKey })
        : isVariant
          ? await createProductVariant(importId, { sourceKey })
          : isProduct
            ? await createProduct(importId, { sourceKey, name, categoryId: category?.id ?? null, scope })
            : kind === 'Location'
              ? await createLocation(importId, { sourceKey, name, scope })
              : kind === 'Supplier'
                ? await createSupplier(importId, { sourceKey, name, code: code.trim() || null, scope })
                : kind === 'ResponsiblePerson'
                  ? await createResponsiblePerson(importId, { sourceKey, name, scope })
                  : await createUnit(importId, { kind, sourceKey, code, name, symbol: symbol.trim() || null, unitType, scope })
      onResolved(result)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
      setBusy(false)
    }
  }

  const canSubmit = isCategory
    ? plan?.canCreate === true
    : isVariant
      ? variantPlan?.canCreate === true
      : name.trim().length > 0 && (!isUnit || code.trim().length > 0)

  return (
    <Modal
      title={`Yeni ${resolutionKindSingular[kind]} yarat`}
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
            disabled={!canSubmit || busy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Yarat
          </button>
        </>
      }
    >
      {isCategory ? (
        <div className="space-y-2 text-sm">
          <p className="text-slate-600">Kateqoriya iyerarxiyası:</p>
          <ol className="space-y-1">
            {plan?.levels.map((level, index) => (
              <li key={level.name} className="flex items-center gap-2 rounded border border-slate-100 px-3 py-2">
                <span className="text-xs text-slate-400">{index + 1}.</span>
                <span className="text-slate-900">{level.name}</span>
                <span className={`ml-auto text-xs ${level.existingCategoryId ? 'text-slate-500' : 'text-emerald-700'}`}>
                  {level.existingCategoryId ? 'Mövcuddur (istifadə olunacaq)' : 'Yaradılacaq'}
                </span>
              </li>
            ))}
          </ol>
          {plan === null && !error && <p className="text-slate-500">Yüklənir…</p>}
          {plan?.problem && <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">{plan.problem}</p>}
        </div>
      ) : isVariant ? (
        <div className="space-y-2 text-sm">
          {variantPlan === null && !error && <p className="text-slate-500">Yüklənir…</p>}
          {variantPlan && (
            <>
              <p className="text-slate-600">Bu variant aşağıdakı qərarlardan qurulur:</p>
              <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
                <Row label="Məhsul" value={variantPlan.productLabel} />
                <Row
                  label="Ölçü"
                  value={
                    formatSpecification(
                      variantPlan.specificationValue,
                      variantPlan.specificationUnitLabel,
                      variantPlan.specificationDescriptor,
                    ) ?? '—'
                  }
                  note="cədvəldəki mətn olduğu kimi saxlanılır"
                />
                <Row
                  label="Vahid"
                  value={variantPlan.specificationUnitLabel ?? (variantPlan.specificationDescriptor ? 'ölçü vahidi deyil' : '—')}
                  note={variantPlan.specificationDescriptor ? `spesifikasiya təsviri: ${variantPlan.specificationDescriptor}` : undefined}
                />
                <Row label="Model/Kod" value={variantPlan.modelCode ?? '—'} />
                <Row
                  label="Ö/v"
                  value={variantPlan.orderUnitLabel || unitlessOrderUnitLabel}
                  note={variantPlan.orderUnitLabel ? undefined : 'bu sətirlərdə sifariş vahidi tələb olunmur'}
                />
              </dl>
              <p className="text-xs text-slate-500">
                Variantın kimliyi vahidlərin kodlarından qurulur, xam mətndən yox: «ədəd», «əd» və «pcs» eyni vahidə
                bağlandıqda bir variant olur.
              </p>
            </>
          )}
          {variantPlan?.problem && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">{variantPlan.problem}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <label className="block text-slate-700">
            Ad
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
            />
          </label>

          {kind === 'Location' && (
            <p className="text-xs text-slate-500">Kod avtomatik yaradılacaq (LOC-000001 formatında).</p>
          )}

          {isProduct && (
            <>
              <p className="text-xs text-slate-500">Kod avtomatik yaradılacaq (PRD-000001 formatında).</p>
              <div className="rounded-md border border-slate-200 p-2">
                <p className="text-slate-700">
                  Kateqoriya (istəyə bağlı):{' '}
                  <span className="font-medium text-slate-900">{category?.label ?? 'seçilməyib'}</span>
                  {category && (
                    <button type="button" onClick={() => setCategory(null)} className="ml-2 text-xs text-slate-500 underline">
                      təmizlə
                    </button>
                  )}
                </p>
                <input
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  placeholder="Kateqoriya axtar…"
                  className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
                {categoryOptions && categoryOptions.length > 0 && (
                  <ul className="mt-2 max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                    {categoryOptions.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCategory(option)
                            setCategorySearch('')
                          }}
                          className="w-full px-2 py-1.5 text-left hover:bg-slate-50"
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {categoryOptions?.length === 0 && <p className="mt-2 text-xs text-slate-500">Nəticə yoxdur.</p>}
              </div>
            </>
          )}

          {kind === 'Supplier' && (
            <label className="block text-slate-700">
              Kod (istəyə bağlı)
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
              />
            </label>
          )}

          {isUnit && (
            <>
              <label className="block text-slate-700">
                Kod
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="məs. KVM"
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
              </label>
              <label className="block text-slate-700">
                Simvol (istəyə bağlı)
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                />
              </label>
              <label className="block text-slate-700">
                Növ
                <select
                  value={unitType}
                  onChange={(event) => setUnitType(event.target.value as UnitType)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
                >
                  {unitTypes.map((type) => (
                    <option key={type} value={type}>
                      {unitTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-500">
                Vahidin mənasını yalnız siz təyin edirsiniz; sistem «kv.m», «top» kimi dəyərləri özü şərh etmir.
              </p>
            </>
          )}

          <label className="flex items-start gap-2 text-slate-700">
            <input type="checkbox" checked={saveAlias} onChange={(event) => setSaveAlias(event.target.checked)} className="mt-0.5" />
            Gələcək importlarda da bu uyğunluğu yadda saxla
          </label>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-2">
      <dt className="w-24 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">
        {value}
        {note && <span className="ml-2 text-xs text-slate-500">({note})</span>}
      </dd>
    </div>
  )
}
