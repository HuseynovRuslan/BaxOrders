import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../../api/client'
import {
  fetchProductMatchSuggestions,
  rejectProductMatch,
  undoProductMatch,
  type ProductMatchDecision,
  type ProductMatchKind,
  type ProductMatchSide,
  type ProductMatchSuggestion,
  type ProductMatchSuggestionList,
} from '../../../api/productMatches'
import { spellingDifferenceLabels } from '../../../terminology/terms'
import { formatCount } from '../../analytics/format'
import { EmptyState, ErrorState, LoadingRows } from '../../EmptyState'
import { ApproveMatchDialog } from './ApproveMatchDialog'
import {
  approveLabel,
  describeSide,
  describeSideUsage,
  kindExplanations,
  kindLabels,
  kindOrder,
  readOnlyNote,
  rejectedNotice,
  rejectLabel,
  undoLabel,
} from './labels'

export const suggestionPageSize = 50

type Loaded<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T }

interface SuggestionListProps {
  kind: ProductMatchKind
  search: string
  page: number
  /** Whether this person may decide. The server checks again either way (13.2). */
  canDecide: boolean
  onKindChange: (kind: ProductMatchKind) => void
  onSearch: (search: string) => void
  onPage: (page: number) => void
}

/**
 * What the rules suggest, of one kind at a time, with how many there are of each.
 * <para>
 * Nothing here does anything by itself: opening, searching and paging only read. Approving asks first, in a
 * dialog. Rejecting is one click, because an administrator may reject hundreds of accessories — and every
 * rejection is offered back at once with "Geri al".
 * </para>
 */
export function SuggestionList({ kind, search, page, canDecide, onKindChange, onSearch, onPage }: SuggestionListProps) {
  const [list, setList] = useState<Loaded<ProductMatchSuggestionList>>({ status: 'loading' })
  const [refreshToken, setRefreshToken] = useState(0)
  const [approving, setApproving] = useState<ProductMatchSuggestion | null>(null)
  const [rejected, setRejected] = useState<ProductMatchDecision | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  const query = useMemo(
    () => ({ kind, search: search || undefined, page, pageSize: suggestionPageSize }),
    [kind, search, page],
  )

  // One request per selection; the key keeps a stale answer from clobbering a newer one. Reading the same selection
  // again after an action keeps the list on screen meanwhile; a different selection shows that it is loading.
  const lastKey = useRef('')
  const lastQuery = useRef('')
  useEffect(() => {
    const selection = JSON.stringify(query)
    const key = `${selection}|${refreshToken}`
    lastKey.current = key
    const controller = new AbortController()
    if (lastQuery.current !== selection) {
      lastQuery.current = selection
      setList({ status: 'loading' })
    }

    fetchProductMatchSuggestions(query, controller.signal)
      .then((data) => {
        if (lastKey.current === key) {
          setList({ status: 'success', data })
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setList({ status: 'error', message: problem instanceof Error && problem.message ? problem.message : 'Təkliflər yüklənmədi' })
        }
      })

    return () => controller.abort()
  }, [query, refreshToken])

  function reload() {
    setRefreshToken((token) => token + 1)
  }

  /** Any new action clears the last rejection's line: it stays only until the next thing is done. */
  function startAction() {
    setRejected(null)
    setActionError(null)
  }

  async function reject(suggestion: ProductMatchSuggestion) {
    startAction()
    setBusy(true)
    try {
      const isSpelling = suggestion.kind === 'SameItem'
      const decision = await rejectProductMatch({
        kind: suggestion.kind,
        sourceId: isSpelling ? suggestion.source.variantId! : suggestion.source.productId,
        targetId: isSpelling ? suggestion.target.variantId! : suggestion.target.productId,
      })
      setRejected(decision)
    } catch (problem: unknown) {
      setActionError(problem instanceof ApiError ? problem.message : 'Rədd edilmədi.')
    } finally {
      setBusy(false)
      reload()
    }
  }

  async function undoRejection(decision: ProductMatchDecision) {
    setActionError(null)
    setBusy(true)
    try {
      await undoProductMatch(decision.id)
      setRejected(null)
    } catch (problem: unknown) {
      setActionError(problem instanceof ApiError ? problem.message : 'Geri alınmadı.')
    } finally {
      setBusy(false)
      reload()
    }
  }

  const data = list.status === 'success' ? list.data : null
  const items = data?.suggestions.items ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.suggestions.totalCount / suggestionPageSize)) : 1

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Təklifin növü">
        {kindOrder.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={kind === option}
            onClick={() => onKindChange(option)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              kind === option ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {kindLabels[option]}
            {data && ` (${formatCount(option === 'SameItem' ? data.sameItemCount : data.variantCount)})`}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600">{kindExplanations[kind]}</p>

      {!canDecide && <p className="text-xs text-slate-500">{readOnlyNote}</p>}

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch(searchInput.trim())
        }}
      >
        <label className="sr-only" htmlFor="product-match-search">Məhsul adı üzrə axtar</label>
        <input
          id="product-match-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Məhsul adı üzrə axtar"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
        {data && (
          <span className="text-xs text-slate-500 sm:ml-auto">{formatCount(data.filteredCount)} təklif</span>
        )}
      </form>

      {rejected && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800" role="status">
          <span>{rejectedNotice(rejected.sourceProductName, rejected.targetProductName)}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => undoRejection(rejected)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-40"
          >
            {undoLabel}
          </button>
        </div>
      )}

      {actionError && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{actionError}</p>
      )}

      {list.status === 'error' && <ErrorState message={list.message} />}
      {list.status === 'loading' && <LoadingRows label="Təkliflər yüklənir" />}

      {data && items.length === 0 && (
        <EmptyState>{search ? 'Bu axtarışa uyğun təklif tapılmadı.' : 'Bu növdə təklif yoxdur.'}</EmptyState>
      )}

      {data && items.length > 0 && (
        <ul className="space-y-2">
          {groups(items).map((group) => (
            <li key={group.key} className="rounded-lg border border-slate-200 bg-white">
              {group.base && (
                <p className="border-b border-slate-100 px-3 py-2 text-sm">
                  <span className="text-xs text-slate-500">Əsas məhsul: </span>
                  <span className="font-medium text-slate-900">{group.base.productName}</span>
                  <span className="ml-2 text-xs text-slate-500">{describeSideUsage(group.base)}</span>
                </p>
              )}
              <ul className="divide-y divide-slate-100">
                {group.items.map((suggestion) => (
                  <li key={suggestionKey(suggestion)} className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-start lg:justify-between">
                    {suggestion.kind === 'SameItem' ? <SpellingPair suggestion={suggestion} /> : <VariantPair suggestion={suggestion} />}
                    {canDecide && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            startAction()
                            setApproving(suggestion)
                          }}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                        >
                          {approveLabel}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => reject(suggestion)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          {rejectLabel}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {data && data.suggestions.totalCount > suggestionPageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>Səhifə {data.suggestions.page} / {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Əvvəlki
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40">
              Növbəti
            </button>
          </div>
        </div>
      )}

      {approving && (
        <ApproveMatchDialog
          suggestion={approving}
          onClose={() => setApproving(null)}
          onApproved={() => {
            setApproving(null)
            reload()
          }}
          onRefused={reload}
        />
      )}
    </div>
  )
}

/** Both spellings, and what they differ by. */
function SpellingPair({ suggestion }: { suggestion: ProductMatchSuggestion }) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
      <Side side={suggestion.source} />
      <Side side={suggestion.target} />
      {suggestion.difference && (
        <p className="text-xs text-amber-800 sm:col-span-2">{spellingDifferenceLabels[suggestion.difference]}</p>
      )}
    </div>
  )
}

function Side({ side }: { side: ProductMatchSide }) {
  return (
    <div className="min-w-0">
      <p className="break-words font-medium text-slate-900">{side.productName}</p>
      <p className="text-xs text-slate-600">{describeSide(side)}</p>
      <p className="text-xs text-slate-500">{describeSideUsage(side)}</p>
    </div>
  )
}

/** The variant product, under its base, with the label it would be shown under. */
function VariantPair({ suggestion }: { suggestion: ProductMatchSuggestion }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="break-words font-medium text-slate-900">{suggestion.source.productName}</p>
      <p className="text-xs text-slate-600">
        → {suggestion.target.productName}
        {suggestion.proposedLabel && <> · variant: <span className="font-medium text-slate-800">{suggestion.proposedLabel}</span></>}
      </p>
      <p className="text-xs text-slate-500">{describeSideUsage(suggestion.source)}</p>
    </div>
  )
}

interface SuggestionGroup {
  key: string
  /** The shared base of a run of variant suggestions; null for spelling pairs, which stand alone. */
  base: ProductMatchSide | null
  items: ProductMatchSuggestion[]
}

/** Variant suggestions under one base together, in the order the API gave them; spelling pairs one by one. */
function groups(items: ProductMatchSuggestion[]): SuggestionGroup[] {
  const result: SuggestionGroup[] = []
  for (const item of items) {
    const last = result[result.length - 1]
    if (item.kind === 'Variant' && last?.base && last.base.productId === item.target.productId) {
      last.items.push(item)
      continue
    }

    result.push({
      key: suggestionKey(item),
      base: item.kind === 'Variant' ? item.target : null,
      items: [item],
    })
  }

  return result
}

function suggestionKey(suggestion: ProductMatchSuggestion): string {
  return suggestion.kind === 'SameItem'
    ? `s-${suggestion.source.variantId}-${suggestion.target.variantId}`
    : `v-${suggestion.source.productId}-${suggestion.target.productId}`
}
