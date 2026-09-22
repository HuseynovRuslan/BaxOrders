import { useEffect, useState } from 'react'
import type { ImportPreview, IssueType } from '../../../api/imports'
import {
  fetchUnresolvedSummary,
  type ResolutionKind,
  type UnresolvedSummaryItem,
} from '../../../api/review'
import { resolutionKindLabels } from '../labels'
import { CorrectionCenter } from './CorrectionCenter'
import { ReadinessPanel } from './ReadinessPanel'
import { UnresolvedList } from './UnresolvedList'

// Products and variants come last: a variant is identified by the product and units decided before it.
const referenceKinds: ResolutionKind[] = [
  'Location',
  'Supplier',
  'ResponsiblePerson',
  'OrderUnit',
  'SpecificationUnit',
  'CategoryPath',
]

const kinds: ResolutionKind[] = [...referenceKinds, 'Product', 'ProductVariant']

// Row-specific problems live in their own tab: no distinct-value decision can settle them.
const rowsTab = 'Rows' as const
type ReviewTab = ResolutionKind | typeof rowsTab

interface ReviewCenterProps {
  importId: number
  /** Every decision — single or bulk — returns the refreshed preview of the batch. */
  onResolved: (result: { preview: ImportPreview }) => void
}

export function ReviewCenter({ importId, onResolved }: ReviewCenterProps) {
  const [summary, setSummary] = useState<UnresolvedSummaryItem[] | null>(null)
  const [kind, setKind] = useState<ReviewTab>('Location')
  const [rowIssueFilter, setRowIssueFilter] = useState<IssueType | null>(null)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchUnresolvedSummary(importId, controller.signal)
      .then((items) => {
        setSummary(items)
        setError(null)
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, version])

  const active = summary?.find((item) => item.kind === kind)
  const showRows = kind === rowsTab
  const totalDistinct = summary?.reduce((sum, item) => sum + item.distinctValues, 0) ?? 0
  const blockedRows = active?.dependencyBlockedRows ?? 0
  const variantBlockedRows = summary?.find((item) => item.kind === 'ProductVariant')?.dependencyBlockedRows ?? 0
  const referenceLeft = summary?.filter((item) => referenceKinds.includes(item.kind)).reduce((sum, item) => sum + item.distinctValues, 0) ?? 0
  const productsLeft = summary?.find((item) => item.kind === 'Product')?.distinctValues ?? 0
  const variantsLeft = summary?.find((item) => item.kind === 'ProductVariant')?.distinctValues ?? 0

  function refresh(result: { preview: ImportPreview }) {
    setVersion((current) => current + 1)
    onResolved(result)
  }

  return (
    <div className="space-y-4">
      <ReadinessPanel
        importId={importId}
        version={version}
        onNavigate={(area, issueType) => {
          // A blocker opens the screen where it is decided.
          if (kinds.includes(area as ResolutionKind)) {
            setKind(area as ResolutionKind)
            setRowIssueFilter(null)
            return
          }

          setKind(rowsTab)
          setRowIssueFilter(issueType)
        }}
      />

      <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-900">Uyğunsuzluqları həll et</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Hər fərqli dəyəri bir dəfə həll edin: qərar bu importdakı bütün uyğun sətirlərə tətbiq olunur.
          {totalDistinct > 0 && ` Hazırda ${totalDistinct} həll olunmamış dəyər var.`}
        </p>
      </div>

      {summary && (
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-xs font-medium text-slate-700">İş növbəsi</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {summary.map((item) => (
              <li key={item.kind} className="flex items-center gap-2 text-xs">
                <span className="w-36 shrink-0 text-slate-600">{resolutionKindLabels[item.kind]}</span>
                <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={`block h-full ${item.distinctValues === 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    style={{ width: `${item.totalValues === 0 ? 100 : (item.resolvedValues / item.totalValues) * 100}%` }}
                  />
                </span>
                <span className="text-slate-700">
                  {item.resolvedValues} / {item.totalValues} həll edilib
                </span>
                {item.dependencyBlockedRows > 0 && (
                  <span className="text-amber-800">· {item.dependencyBlockedRows} sətir gözləyir</span>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-slate-600">
            <span className="font-medium">Növbəti addım: </span>
            {referenceLeft > 0
              ? `1) Referans məlumatları — ${referenceLeft} dəyər qalıb, sonra məhsullar və variantlar açılacaq.`
              : productsLeft > 0
                ? `2) Məhsullar — ${productsLeft} dəyər qalıb.`
                : variantsLeft > 0
                  ? `3) Variantlar — ${variantsLeft} dəyər qalıb.`
                  : '4) Bütün uyğunsuzluqlar həll olunub; import üçün qalan yoxdur.'}
          </p>

          {variantBlockedRows > 0 && (
            <p className="mt-1 text-xs text-amber-800">
              {variantBlockedRows} sətirdə variant həlli üçün əvvəlcə məhsul və vahid qərarları tamamlanmalıdır.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-2">
        {kinds.map((item) => {
          const count = summary?.find((entry) => entry.kind === item)?.distinctValues ?? 0
          return (
            <button
              key={item}
              type="button"
              onClick={() => setKind(item)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                kind === item ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {resolutionKindLabels[item]}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${kind === item ? 'bg-white/20' : 'bg-slate-100'}`}>
                {count}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => {
            setKind(rowsTab)
            setRowIssueFilter(null)
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            showRows ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Sətir düzəlişləri
        </button>
      </div>

      <div className="px-4 py-4">
        {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {showRows && <CorrectionCenter importId={importId} initialIssueType={rowIssueFilter} onChanged={refresh} />}

        {!showRows && active && (
          <p className="mb-3 text-sm text-slate-700">
            {active.distinctValues} həll olunmamış dəyər · {active.affectedRows} sətrə təsir edir
          </p>
        )}

        {!showRows && blockedRows > 0 && (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            {blockedRows} sətir hələ siyahıda görünmür: əvvəlcə həmin sətirlərin məhsulunu və ölçü vahidlərini həll
            edin. Variantın kimliyi məhz həmin qərarlardan qurulur.
          </p>
        )}

        {showRows ? null : active?.distinctValues === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            {blockedRows > 0 ? 'Bu bölmə asılı olduğu qərarları gözləyir.' : 'Bu bölmədə həll olunmamış dəyər yoxdur.'}
          </p>
        ) : (
          <UnresolvedList
            key={`${kind}-${version}`}
            importId={importId}
            kind={kind as ResolutionKind}
            onResolved={refresh}
            onBulkApplied={refresh}
          />
        )}
      </div>
      </section>
    </div>
  )
}
