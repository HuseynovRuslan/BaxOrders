import { useEffect, useState } from 'react'
import type { IssueType } from '../../../api/imports'
import { fetchReadiness, type ImportReadiness } from '../../../api/rows'
import { formatPeriod, issueTypeLabels } from '../labels'

interface ReadinessPanelProps {
  importId: number
  /** Bumped after every decision, so the panel reflects the current state. */
  version: number
  /** Opens the screen where a blocker is decided: a review tab, or the row corrections tab. */
  onNavigate: (area: string, issueType: IssueType) => void
}

/**
 * Why this import can or cannot become order requests yet. It only explains — creating the orders themselves is
 * a separate step that does not exist yet.
 */
export function ReadinessPanel({ importId, version, onNavigate }: ReadinessPanelProps) {
  const [readiness, setReadiness] = useState<ImportReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchReadiness(importId, controller.signal)
      .then((result) => {
        setReadiness(result)
        setError(null)
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, version])

  if (error) {
    return <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>
  }

  if (readiness === null) {
    return <p className="py-4 text-center text-sm text-slate-500">İmporta hazırlıq yüklənir…</p>
  }

  const references =
    readiness.unresolvedReferences.locations +
    readiness.unresolvedReferences.suppliers +
    readiness.unresolvedReferences.responsiblePeople +
    readiness.unresolvedReferences.orderUnits +
    readiness.unresolvedReferences.specificationUnits +
    readiness.unresolvedReferences.categoryPaths

  const rowErrors =
    readiness.rowIssues.invalidQuantity +
    readiness.rowIssues.invalidPeriod +
    readiness.rowIssues.missingRequiredValue +
    readiness.rowIssues.ambiguousMatch +
    readiness.rowIssues.otherErrors

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline gap-2 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-900">İmporta hazırlıq</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            readiness.canImport ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {readiness.canImport ? 'İmporta hazırdır' : 'İmporta hazır deyil'}
        </span>
        <span className="text-xs text-slate-500">
          {readiness.includedRows} sətir importda · {readiness.excludedRows} çıxarılıb · {readiness.totalRows} cəmi
        </span>
      </div>

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Section
          title="Referans məlumatları"
          rows={[
            ['Obyektlər', readiness.unresolvedReferences.locations],
            ['Təchizatçılar', readiness.unresolvedReferences.suppliers],
            ['Cavabdehlər', readiness.unresolvedReferences.responsiblePeople],
            ['Sifariş vahidləri', readiness.unresolvedReferences.orderUnits],
            ['Ölçü vahidləri', readiness.unresolvedReferences.specificationUnits],
            ['Kateqoriyalar', readiness.unresolvedReferences.categoryPaths],
          ]}
          empty={references === 0}
          blocking
        />
        <Section
          title="Məhsullar və variantlar"
          rows={[
            ['Məhsullar', readiness.products.unresolvedProducts],
            ['Variantlar', readiness.products.unresolvedVariants],
            ['Asılılıq gözləyən sətirlər', readiness.products.dependencyBlockedRows],
          ]}
          empty={readiness.products.unresolvedProducts + readiness.products.unresolvedVariants === 0}
          blocking
        />
        <Section
          title="Sətir xətaları"
          rows={[
            ['Yanlış miqdar', readiness.rowIssues.invalidQuantity],
            ['Yanlış dövr', readiness.rowIssues.invalidPeriod],
            ['Məcburi dəyər yoxdur', readiness.rowIssues.missingRequiredValue],
            ['Qeyri-müəyyən uyğunluq', readiness.rowIssues.ambiguousMatch],
            ['Digər xətalar', readiness.rowIssues.otherErrors],
          ]}
          empty={rowErrors === 0}
          blocking
        />
        <Section
          title="Bloklamayanlar"
          rows={[
            ['Qiymət yoxdur', readiness.warnings.missingPrice],
            ['Yanlış qiymət', readiness.warnings.invalidPrice],
            ['Cəm uyğunsuzluğu', readiness.warnings.lineTotalMismatch],
            ['Mümkün təkrarlar', readiness.possibleDuplicateRows],
          ]}
          empty
          note="Bunlar importa mane olmur."
        />
      </div>

      {readiness.existingRequestGroups.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs font-medium text-slate-700">Mövcud sifarişlər</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {readiness.existingRequestGroups.map((group) => (
              <li key={`${group.locationId}-${group.period}`}>
                {group.locationName} · {formatPeriod(group.period)} — artıq v{group.latestVersion} var, {group.rowCount} sətir bu qrupa düşür.
                <span className="ml-1 text-amber-800">Qərar tələb olunur (heç nə birləşdirilmir).</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {readiness.blockers.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3">
          {/* These are the reason canImport is false, so they read as blocking — not as another warning. */}
          <p className="text-xs font-medium text-slate-700">Qalan maneələr</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {readiness.blockers.map((blocker) => (
              <li key={`${blocker.area}-${blocker.issueType}`}>
                <button
                  type="button"
                  onClick={() => onNavigate(blocker.area, blocker.issueType)}
                  className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  {issueTypeLabels[blocker.issueType]} · {blocker.rowCount} sətir →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * A blocking count is red and bold, because it is the reason the import cannot proceed; a non-blocking one
 * stays amber at most — the same distinction the rest of the review screen already makes for a single issue,
 * carried through to these totals.
 */
function Section({
  title,
  rows,
  empty,
  note,
  blocking = false,
}: {
  title: string
  rows: [string, number][]
  empty: boolean
  note?: string
  blocking?: boolean
}) {
  return (
    <div>
      <p className="flex items-baseline gap-1.5 text-xs font-medium text-slate-700">
        {title}
        {empty && <span className="text-emerald-700">✓</span>}
      </p>
      <dl className="mt-1 space-y-0.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className={value === 0 ? 'text-slate-400' : blocking ? 'font-semibold text-red-700' : 'font-medium text-amber-800'}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}
    </div>
  )
}
