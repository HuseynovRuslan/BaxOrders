import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { ImportStatus, IssueType } from '../../../api/imports'
import { fetchReadiness, type ImportReadiness } from '../../../api/rows'
import {
  internalSupplyShortLabel,
  internalToneClass,
  missingPriceCount,
  missingPriceShortLabel,
  priceRequiredLabel,
  pricingReviewLinkLabel,
  pricingReviewPath,
  unclassifiedBeforeImportNote,
  unclassifiedLabel,
  warningToneClass,
} from '../../../pricing/labels'
import { formatPeriod, issueTypeLabels } from '../labels'

/** The area the price strip's «Təsnif et» navigates to: the review's «Qiymət təsnifatı» tab. Never a blocker's. */
export const pricingArea = 'Pricing'

/** A classification can still change only while the batch is under review; after that, on Qiymət təsnifatı. */
export const reviewableStatuses: ImportStatus[] = ['NeedsReview', 'ReadyToImport']

interface ReadinessPanelProps {
  importId: number
  /** Bumped after every decision, so the panel reflects the current state. */
  version: number
  /** The batch's status as the page knows it: newer than the readiness read before the import was confirmed. */
  batchStatus?: ImportStatus
  /** Opens the screen where a blocker is decided: a review tab, or the row corrections tab. */
  onNavigate: (area: string, issueType: IssueType) => void
  /** Every readiness the panel reads, so the review can show its counts without asking again. */
  onLoaded?: (readiness: ImportReadiness) => void
}

/**
 * Why this import can or cannot become order requests yet. It only explains — creating the orders themselves is
 * a separate step that does not exist yet.
 */
export function ReadinessPanel({ importId, version, batchStatus, onNavigate, onLoaded }: ReadinessPanelProps) {
  const [readiness, setReadiness] = useState<ImportReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchReadiness(importId, controller.signal)
      .then((result) => {
        setReadiness(result)
        setError(null)
        onLoaded?.(result)
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
    // onLoaded is a report, not a reason to read again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            [missingPriceShortLabel, readiness.warnings.missingPrice],
            ['Yanlış qiymət', readiness.warnings.invalidPrice],
            ['Cəm uyğunsuzluğu', readiness.warnings.lineTotalMismatch],
            ['Mümkün təkrarlar', readiness.possibleDuplicateRows],
          ]}
          empty
          note="Bunlar importa mane olmur."
        />
      </div>

      <PriceStrip
        readiness={readiness}
        underReview={reviewableStatuses.includes(batchStatus ?? readiness.batchStatus)}
        onClassify={() => onNavigate(pricingArea, 'MissingPrice')}
      />

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
 * The unpriced rows in Task 2's words (Task 16): «N sətirdə qiymət yoxdur», what the review has said about them so
 * far, and what becomes of the rest once imported. Never a blocker: a classification neither stops an import nor
 * lets one through, so nothing here reaches «Qalan maneələr».
 */
function PriceStrip({
  readiness,
  underReview,
  onClassify,
}: {
  readiness: ImportReadiness
  /** Once imported, the rows have landed: "will land" is no longer true, and they are classified on Qiymət təsnifatı. */
  underReview: boolean
  onClassify: () => void
}) {
  const { missingPrice, unclassifiedPrice, priceRequired, priceNotRequired } = readiness.warnings
  if (unclassifiedPrice + priceRequired + priceNotRequired === 0) {
    return null
  }

  // All three parts are shown, at 0 too, so the same rule holds for each. Daxili təminat is never amber.
  const parts: [string, number, string][] = [
    [unclassifiedLabel, unclassifiedPrice, unclassifiedPrice > 0 ? warningToneClass : 'text-slate-500'],
    [priceRequiredLabel, priceRequired, priceRequired > 0 ? warningToneClass : 'text-slate-500'],
    [internalSupplyShortLabel, priceNotRequired, internalToneClass],
  ]

  return (
    <div className="space-y-1 border-t border-slate-200 px-4 py-3 text-xs" role="group" aria-label="Qiymət vəziyyəti">
      {missingPrice > 0 && <p className={`font-medium ${warningToneClass}`}>{missingPriceCount(missingPrice)}</p>}
      <p>
        {parts.map(([label, value, tone], index) => (
          <Fragment key={label}>
            {index > 0 && <span className="text-slate-400"> · </span>}
            <span className={tone}>
              {label} {value}
            </span>
          </Fragment>
        ))}
      </p>
      {underReview && unclassifiedPrice > 0 && (
        <p className={warningToneClass}>{unclassifiedBeforeImportNote(unclassifiedPrice)}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        {underReview && (
          <button
            type="button"
            onClick={onClassify}
            className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            Təsnif et
          </button>
        )}
        <Link to={pricingReviewPath} className="text-slate-600 underline hover:text-slate-900">
          {pricingReviewLinkLabel}
        </Link>
      </div>
    </div>
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
