import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ApprovalInbox, ApprovalInboxSort, ApprovalActionability, ApprovalPriceCoverage, ApprovalRevisionFilter } from '../api/approvals'
import { fetchApprovalInbox } from '../api/approvals'
import { EmptyState, ErrorState, LoadingRows } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { ApprovalRows } from '../components/approvals/ApprovalRows'
import { ApprovalSummary } from '../components/approvals/ApprovalSummary'
import {
  actionabilityLabels,
  actionabilityOrder,
  isActionability,
  isPriceCoverage,
  isRevisionFilter,
  isSort,
  priceCoverageLabels,
  priceCoverageOrder,
  revisionFilterLabels,
  revisionFilterOrder,
  sortLabels,
  sortOrder,
} from '../components/approvals/labels'
import { formatCount } from '../components/analytics/format'

const pageSize = 25

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

/**
 * Every permanent request waiting for a decision, in one place. A manager or an administrator works through
 * this the way they work through any queue: oldest first by default, with the reason spelled out on the rows
 * they personally may not decide rather than those rows simply vanishing from view.
 */
export function ApprovalInboxPage() {
  const [params, setParams] = useSearchParams()
  const [inbox, setInbox] = useState<Loaded<ApprovalInbox>>({ status: 'loading' })
  const [refreshToken, setRefreshToken] = useState(0)

  const search = params.get('search') ?? ''
  const period = params.get('period') ?? ''
  const actionability: ApprovalActionability = isActionability(params.get('actionability'))
    ? (params.get('actionability') as ApprovalActionability)
    : 'All'
  const priceCoverage: ApprovalPriceCoverage | undefined = isPriceCoverage(params.get('priceCoverage'))
    ? (params.get('priceCoverage') as ApprovalPriceCoverage)
    : undefined
  const revision: ApprovalRevisionFilter = isRevisionFilter(params.get('revision'))
    ? (params.get('revision') as ApprovalRevisionFilter)
    : 'All'
  const sort: ApprovalInboxSort = isSort(params.get('sort')) ? (params.get('sort') as ApprovalInboxSort) : 'SubmittedAtUtc'
  const descending = params.get('descending') === 'true'
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  const query = useMemo(
    () => ({
      search: search || undefined,
      period: period || undefined,
      actionability,
      priceCoverage,
      revision,
      sort,
      descending,
      page,
      pageSize,
    }),
    [search, period, actionability, priceCoverage, revision, sort, descending, page],
  )

  // One request per selection; the key keeps a stale in-flight response from clobbering a newer one.
  const lastKey = useRef('')
  useEffect(() => {
    const key = `${JSON.stringify(query)}|${refreshToken}`
    lastKey.current = key
    const controller = new AbortController()
    setInbox({ status: 'loading' })

    fetchApprovalInbox(query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setInbox({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setInbox({ status: 'error', message: message(problem, 'Təsdiq gözləyənlər siyahısı yüklənmədi') })
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

  // Approving or returning a row takes it out of PendingApproval, so the queue is read again rather than
  // patched in place -- the counts and the page both have to agree with what the server now says.
  function refresh() {
    setRefreshToken((token) => token + 1)
  }

  const data = inbox.status === 'success' ? inbox.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.rows.totalCount / pageSize)) : 1
  const filtered = Boolean(search || period || actionability !== 'All' || priceCoverage || revision !== 'All')

  // Nothing pending at all: every summary card and every filter would say the same thing — nothing — so
  // none of them earn their place on the screen. A row appearing again, once one exists, is the queue's own
  // filters kicking back in; this is not a second, separate empty-state codepath for them to fall out of sync with.
  const nothingPending = data !== null && data.summary.pendingCount === 0

  return (
    <>
      <PageHeader title="Təsdiq gözləyənlər" description="Qərar gözləyən bütün sifarişlər, təsdiq üçün göndərilmə sırasına görə" />

      {inbox.status === 'error' && <ErrorState message={inbox.message} />}
      {inbox.status === 'loading' && <LoadingRows label="Siyahı yüklənir" />}

      {nothingPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-medium text-slate-800">Təsdiq gözləyən sifariş yoxdur.</p>
          <p className="mt-1 text-sm text-slate-500">Yeni sifariş təsdiqə göndərildikdə burada görünəcək.</p>
        </div>
      )}

      {data && !nothingPending && (
        <>
      <ApprovalSummary summary={data.summary} />

      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Qərar vermə imkanına görə süz">
          {actionabilityOrder.map((option) => (
            <Chip
              key={option}
              label={actionabilityLabels[option]}
              count={
                data
                  ? option === 'CanDecide'
                    ? data.summary.actionableByCurrentUserCount
                    : option === 'BlockedForMe'
                      ? data.summary.blockedForCurrentUserCount
                      : data.summary.pendingCount
                  : undefined
              }
              active={actionability === option}
              onClick={() => update({ actionability: option === 'All' ? undefined : option })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={(event) => { event.preventDefault(); update({ search: searchInput.trim() }) }}>
            <label className="sr-only" htmlFor="approvals-search">Obyekt adı üzrə axtar</label>
            <input
              id="approvals-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Obyekt adı üzrə axtar"
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
            />
          </form>

          <label className="text-sm">
            <span className="sr-only">Dövr</span>
            <input
              type="month"
              value={period}
              onChange={(event) => update({ period: event.target.value })}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="sr-only">Qiymət məlumatına görə süz</span>
            <select
              value={priceCoverage ?? ''}
              onChange={(event) => update({ priceCoverage: event.target.value || undefined })}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="">Qiymət məlumatı: hamısı</option>
              {priceCoverageOrder.map((option) => (
                <option key={option} value={option}>{priceCoverageLabels[option]}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="sr-only">Növünə görə süz</span>
            <select
              value={revision}
              onChange={(event) => update({ revision: event.target.value === 'All' ? undefined : event.target.value })}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            >
              {revisionFilterOrder.map((option) => (
                <option key={option} value={option}>{revisionFilterLabels[option]}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="sr-only">Sıralama</span>
            <select
              value={sort}
              onChange={(event) => update({ sort: event.target.value === 'SubmittedAtUtc' ? undefined : event.target.value })}
              className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            >
              {sortOrder.map((option) => (
                <option key={option} value={option}>{sortLabels[option]}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            aria-pressed={descending}
            onClick={() => update({ descending: descending ? undefined : 'true' })}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {descending ? 'Azalan ↓' : 'Artan ↑'}
          </button>

          {filtered && (
            <button
              type="button"
              onClick={() => update({ search: undefined, period: undefined, actionability: undefined, priceCoverage: undefined, revision: undefined })}
              className="text-sm text-slate-500 underline hover:text-slate-800"
            >
              Filtri təmizlə
            </button>
          )}

          {data && (
            <span className="ml-auto text-xs text-slate-500">
              {formatCount(data.filteredCount)} sifariş göstərilir
              {data.filteredCount !== data.summary.pendingCount && <> ({formatCount(data.summary.pendingCount)} sifarişdən)</>}
            </span>
          )}
        </div>
      </div>

      {data.rows.items.length === 0 && (
        <EmptyState>Bu filtrə uyğun gözləyən sifariş tapılmadı.</EmptyState>
      )}

      {data.rows.items.length > 0 && <ApprovalRows rows={data.rows.items} onChanged={refresh} />}

      {data.rows.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.rows.page} / {totalPages} · {formatCount(data.rows.totalCount)} sifariş</span>
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
        </>
      )}
    </>
  )
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
