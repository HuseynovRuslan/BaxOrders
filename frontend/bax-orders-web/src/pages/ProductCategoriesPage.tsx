import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  fetchProductCategories,
  type ProductCategoryFilter,
  type ProductCategoryList,
  type ProductCategoryRow,
} from '../api/productCategories'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { SummaryMetric } from '../components/SummaryMetric'
import { formatCount } from '../components/analytics/format'
import { ApplySafeDialog } from '../components/catalog/ApplySafeDialog'
import { AssignCategoryDialog } from '../components/catalog/AssignCategoryDialog'
import { ProductCategoryRows } from '../components/catalog/ProductCategoryRows'
import { applySafeLabel, evidenceIsHistoryNote, filterLabels, filterOrder, isFilter } from '../components/catalog/labels'

const pageSize = 25

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

/**
 * Which products the catalogue can speak for, and which it cannot yet.
 * <para>
 * Everything on this screen comes from the import history the server read; nothing here works out a category
 * from a product's name, and where the history disagrees with itself the screen says so and stops rather than
 * offering the most frequent answer as if it were the right one.
 * </para>
 */
export function ProductCategoriesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [list, setList] = useState<Loaded<ProductCategoryList>>({ status: 'loading' })
  const [refreshToken, setRefreshToken] = useState(0)
  const [applying, setApplying] = useState(false)
  const [assigning, setAssigning] = useState<ProductCategoryRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const search = params.get('search') ?? ''
  const filter: ProductCategoryFilter = isFilter(params.get('filter'))
    ? (params.get('filter') as ProductCategoryFilter)
    : 'All'
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  const query = useMemo(
    () => ({ search: search || undefined, filter, page, pageSize }),
    [search, filter, page],
  )

  // One request per selection; the key keeps a stale answer from clobbering a newer one.
  const lastKey = useRef('')
  useEffect(() => {
    const key = `${JSON.stringify(query)}|${refreshToken}`
    lastKey.current = key
    const controller = new AbortController()
    setList({ status: 'loading' })

    fetchProductCategories(query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setList({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setList({ status: 'error', message: message(problem, 'Məhsul kateqoriyaları yüklənmədi') })
        }
      })

    return () => controller.abort()
  }, [query, refreshToken])

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    if (resetPage) {
      next.delete('page')
    }

    setParams(next)
  }

  function refresh() {
    setRefreshToken((token) => token + 1)
  }

  const data = list.status === 'success' ? list.data : null
  const summary = data?.summary
  const totalPages = data ? Math.max(1, Math.ceil(data.rows.totalCount / pageSize)) : 1

  return (
    <>
      <PageHeader
        title="Məhsul kateqoriyaları"
        description="Kanonik kateqoriya və onu təklif edən Excel tarixçəsi"
        actions={
          <>
            <Link
              to="/products"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Məhsullara qayıt
            </Link>
            {user.canManageCatalog && (
              <button
                type="button"
                onClick={() => setApplying(true)}
                disabled={!summary || summary.uniqueEvidenceCount === 0}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {applySafeLabel}
              </button>
            )}
          </>
        }
      />

      {notice && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
          {notice}
        </p>
      )}

      {list.status === 'error' && <ErrorState message={list.message} />}

      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Kataloqun xülasəsi">
          <SummaryMetric label="Kanonik kateqoriyası olan" value={formatCount(summary.assignedCount)} />
          <SummaryMetric label="Təhlükəsiz uyğunlaşdırma" value={formatCount(summary.uniqueEvidenceCount)} />
          <SummaryMetric label="Ziddiyyətli" value={formatCount(summary.ambiguousCount)} warn={summary.ambiguousCount > 0} />
          <SummaryMetric label="Məlumatsız" value={formatCount(summary.noEvidenceCount)} />
        </div>
      )}

      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vəziyyətə görə süz">
          {filterOrder.map((option) => (
            <Chip
              key={option}
              label={filterLabels[option]}
              count={summary ? countOf(summary, option) : undefined}
              active={filter === option}
              onClick={() => update({ filter: option === 'All' ? undefined : option })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim() }) }}>
            <label className="sr-only" htmlFor="product-category-search">Məhsul adı və ya kodu üzrə axtar</label>
            <input
              id="product-category-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Məhsul adı və ya kodu üzrə axtar"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
            />
          </form>

          {(search || filter !== 'All') && (
            <button
              type="button"
              onClick={() => update({ search: undefined, filter: undefined })}
              className="text-sm text-slate-500 underline hover:text-slate-800"
            >
              Filtri təmizlə
            </button>
          )}

          {data && (
            <span className="ml-auto text-xs text-slate-500">
              {formatCount(data.filteredCount)} məhsul göstərilir
              {data.filteredCount !== data.summary.totalProductCount && (
                <> ({formatCount(data.summary.totalProductCount)} məhsuldan)</>
              )}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">{evidenceIsHistoryNote}</p>
      </div>

      {list.status === 'loading' && <LoadingRows label="Siyahı yüklənir" />}

      {data && data.rows.items.length === 0 && (
        <EmptyState>{search || filter !== 'All' ? 'Bu filtrə uyğun məhsul tapılmadı.' : 'Kataloqda məhsul yoxdur.'}</EmptyState>
      )}

      {data && data.rows.items.length > 0 && (
        <ProductCategoryRows
          rows={data.rows.items}
          canDecide={user.canManageCatalog}
          onAssign={setAssigning}
        />
      )}

      {data && data.rows.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.rows.page} / {totalPages} · {formatCount(data.rows.totalCount)} məhsul</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Əvvəlki
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) }, false)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Növbəti
            </button>
          </div>
        </div>
      )}

      {applying && summary && (
        <ApplySafeDialog
          summary={summary}
          onClose={() => setApplying(false)}
          onApplied={(result) => {
            setApplying(false)
            setNotice(
              `${formatCount(result.assignedCount)} məhsula kateqoriya təyin edildi. `
              + `${formatCount(result.skippedAmbiguousCount)} ziddiyyətli və `
              + `${formatCount(result.skippedNoEvidenceCount)} məlumatsız məhsula toxunulmadı.`,
            )
            refresh()
          }}
        />
      )}

      {assigning && (
        <AssignCategoryDialog
          row={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setNotice(`${assigning.productName} üçün kateqoriya təyin edildi.`)
            setAssigning(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

function countOf(
  summary: { assignedCount: number; uniqueEvidenceCount: number; ambiguousCount: number; noEvidenceCount: number; totalProductCount: number },
  filter: ProductCategoryFilter,
): number {
  switch (filter) {
    case 'Assigned': return summary.assignedCount
    case 'UniqueEvidence': return summary.uniqueEvidenceCount
    case 'Ambiguous': return summary.ambiguousCount
    case 'NoEvidence': return summary.noEvidenceCount
    default: return summary.totalProductCount
  }
}

function Chip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
        active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
      {count !== undefined && <span className={`ml-1.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>{formatCount(count)}</span>}
    </button>
  )
}

function message(problem: unknown, fallback: string): string {
  return problem instanceof Error && problem.message ? problem.message : fallback
}
