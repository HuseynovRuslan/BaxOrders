import { useEffect, useMemo, useRef, useState } from 'react'
import type { PagedResult } from '../../../api/orders'
import { fetchProductMatchFamilies, type ProductFamily } from '../../../api/productMatches'
import { formatCount } from '../../analytics/format'
import { EmptyState, ErrorState, LoadingRows } from '../../EmptyState'
import { formatWorkflowMoment } from '../../workflow/labels'
import { describeUsage, familiesNote, noFamiliesText } from './labels'

export const familyPageSize = 50

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

/**
 * "Məhsullar və variantlar": each base product, and under it every product an administrator approved as its variant.
 * <para>
 * A view of the approved links and nothing more. Every product here is still a product of its own — its own name,
 * lines and history — so each variant is its own row, never folded into its base (13.1). Read-only for everybody:
 * a link is taken back from "Qərarlar".
 * </para>
 */
export function FamilyList() {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [list, setList] = useState<Loaded<PagedResult<ProductFamily>>>({ status: 'loading' })

  const query = useMemo(() => ({ search: search || undefined, page, pageSize: familyPageSize }), [search, page])

  const lastKey = useRef('')
  useEffect(() => {
    const key = JSON.stringify(query)
    lastKey.current = key
    const controller = new AbortController()
    setList({ status: 'loading' })

    fetchProductMatchFamilies(query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setList({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setList({ status: 'error', message: problem instanceof Error && problem.message ? problem.message : 'Məhsullar yüklənmədi' })
        }
      })

    return () => controller.abort()
  }, [query])

  const data = list.status === 'success' ? list.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / familyPageSize)) : 1

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{familiesNote}</p>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput.trim())
          setPage(1)
        }}
      >
        <label className="sr-only" htmlFor="product-family-search">Məhsul adı üzrə axtar</label>
        <input
          id="product-family-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Məhsul adı üzrə axtar"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
      </form>

      {list.status === 'error' && <ErrorState message={list.message} />}
      {list.status === 'loading' && <LoadingRows label="Məhsullar yüklənir" />}

      {data && data.items.length === 0 && (
        <EmptyState>{search ? 'Bu axtarışa uyğun məhsul tapılmadı.' : noFamiliesText}</EmptyState>
      )}

      {data && data.items.length > 0 && (
        <ul className="space-y-2" aria-label="Əsas məhsullar">
          {data.items.map((family) => (
            <li key={family.productId} className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="break-words font-medium text-slate-900">{family.productName}</p>
                <p className="text-xs text-slate-500">Əsas məhsul · {describeUsage(family.usage)}</p>
              </div>
              <ul className="divide-y divide-slate-100" aria-label={`${family.productName} — variantlar`}>
                {family.variants.map((member) => (
                  <li key={member.decisionId} className="flex flex-col gap-1 px-3 py-2 pl-6 lg:flex-row lg:items-baseline lg:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm text-slate-900">{member.productName}</p>
                      <p className="text-xs text-slate-600">
                        Variant: <span className="font-medium text-slate-800">{member.variantLabel}</span>
                        {' · '}
                        {describeUsage(member.usage)}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">
                      Təsdiqləyib: {member.decidedByDisplayName} · {formatWorkflowMoment(member.decidedAtUtc)}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {data && data.totalCount > familyPageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.page} / {totalPages} · {formatCount(data.totalCount)} əsas məhsul</span>
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
    </div>
  )
}
