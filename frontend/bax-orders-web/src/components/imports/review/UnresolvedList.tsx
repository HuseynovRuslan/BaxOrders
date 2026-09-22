import { useEffect, useState } from 'react'
import {
  bulkCreatableKinds,
  fetchUnresolved,
  type BulkApplyResult,
  type PagedUnresolved,
  type ResolutionKind,
  type ResolutionResult,
  type UnresolvedValue,
} from '../../../api/review'
import { formatPeriod, resolutionKindSingular, unresolvedStatusLabels } from '../labels'
import { BulkActionDialog, type BulkMode } from './BulkActionDialog'
import { CreateResolutionDialog } from './CreateResolutionDialog'
import { MapExistingDialog } from './MapExistingDialog'
import { NotAUnitDialog } from './NotAUnitDialog'

const pageSize = 10

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: PagedUnresolved }

interface UnresolvedListProps {
  importId: number
  kind: ResolutionKind
  onResolved: (result: ResolutionResult) => void
  onBulkApplied: (result: BulkApplyResult) => void
}

export function UnresolvedList({ importId, kind, onResolved, onBulkApplied }: UnresolvedListProps) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [state, setState] = useState<ListState>({ status: 'loading' })
  const [dialog, setDialog] = useState<{ mode: 'map' | 'create' | 'notAUnit'; value: UnresolvedValue } | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [bulk, setBulk] = useState<BulkMode | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchUnresolved(importId, { kind, search: search || undefined, page, pageSize }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: problem instanceof Error ? problem.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [importId, kind, page, search])

  // A filter change would leave invisible values selected, so the selection starts over with it.
  useEffect(() => {
    setSelected([])
  }, [kind, search])

  const items = state.status === 'success' ? state.data.items : []
  const totalPages = state.status === 'success' ? Math.max(1, Math.ceil(state.data.totalCount / pageSize)) : 1
  const pageKeys = items.map((value) => value.sourceKey)
  const selectedOnPage = pageKeys.filter((key) => selected.includes(key)).length
  const selectedElsewhere = selected.length - selectedOnPage
  const canCreateInBulk = bulkCreatableKinds.includes(kind)
  const canMapInBulk = kind !== 'ProductVariant'
  // Only the "Vahid" column holds words that describe a specification instead of measuring it.
  const canMarkNotAUnit = kind === 'SpecificationUnit'

  function toggle(sourceKey: string) {
    setSelected((current) =>
      current.includes(sourceKey) ? current.filter((key) => key !== sourceKey) : [...current, sourceKey],
    )
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(searchInput.trim())
          setPage(1)
        }}
      >
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Dəyərə görə axtar…"
          className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
        />
      </form>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={selectedOnPage === pageKeys.length && pageKeys.length > 0}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, ...pageKeys.filter((key) => !current.includes(key))]
                    : current.filter((key) => !pageKeys.includes(key)),
                )
              }
            />
            Bu səhifəni seç
          </label>

          <span className="text-slate-600">
            {selected.length} dəyər seçilib
            {selectedElsewhere > 0 && ` (${selectedElsewhere}-i başqa səhifədə)`}
          </span>

          {selected.length > 0 && (
            <button type="button" onClick={() => setSelected([])} className="text-slate-500 underline">
              Seçimi təmizlə
            </button>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            {canMapInBulk && (
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setBulk('map')}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Seçilənləri mövcud olana bağla
              </button>
            )}
            {canCreateInBulk && (
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => setBulk('create')}
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-40"
              >
                {kind === 'ProductVariant'
                  ? 'Seçilən variantları yarat'
                  : `Seçilənləri göstərilən adla ${resolutionKindSingular[kind]} kimi yarat`}
              </button>
            )}
          </div>
        </div>
      )}

      {state.status === 'loading' && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}
      {state.status === 'error' && <p className="py-6 text-center text-sm text-red-600">{state.message}</p>}
      {state.status === 'success' && items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">Uyğun dəyər tapılmadı.</p>
      )}

      {state.status === 'success' && (
        <ul className="space-y-2">
          {items.map((value) => (
            <li key={value.sourceKey} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(value.sourceKey)}
                  onChange={() => toggle(value.sourceKey)}
                  className="mt-1"
                  aria-label={`${value.displayValue} seç`}
                />
                <div className="min-w-0">
                  {value.parentLabel && <p className="text-xs text-slate-500">{value.parentLabel}</p>}
                  <p className="font-medium text-slate-900">{value.displayValue}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {value.affectedRowCount} sətrə təsir edir · {unresolvedStatusLabels[value.currentStatus]}
                  </p>

                  {value.sampleOriginalValues.length > 1 && (
                    <p className="mt-1 text-xs text-slate-500">Yazılışlar: {value.sampleOriginalValues.join(' · ')}</p>
                  )}

                  <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                    {value.sampleRows.map((row) => (
                      <li key={`${row.sheetName}-${row.rowNumber}`}>
                        Sətir {row.rowNumber}: {row.productName ?? '—'} · {row.locationName ?? '—'}
                        {row.period ? ` · ${formatPeriod(row.period)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="ml-auto flex flex-wrap justify-end gap-2">
                  {canMarkNotAUnit && (
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: 'notAUnit', value })}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Bu vahid deyil
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDialog({ mode: 'map', value })}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Mövcud olana bağla
                  </button>
                  <button
                    type="button"
                    disabled={value.currentStatus === 'IncompletePath'}
                    onClick={() => setDialog({ mode: 'create', value })}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                  >
                    Yeni yarat
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.status === 'success' && state.data.totalCount > pageSize && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {state.data.page} / {totalPages} · {state.data.totalCount} dəyər
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Əvvəlki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Növbəti
            </button>
          </div>
        </div>
      )}

      {bulk && (
        <BulkActionDialog
          importId={importId}
          kind={kind}
          mode={bulk}
          sourceKeys={selected}
          onClose={() => setBulk(null)}
          onApplied={(result) => {
            setBulk(null)
            setSelected([])
            onBulkApplied(result)
          }}
        />
      )}

      {dialog?.mode === 'map' && (
        <MapExistingDialog
          importId={importId}
          kind={kind}
          value={dialog.value}
          onClose={() => setDialog(null)}
          onResolved={(result) => {
            setDialog(null)
            onResolved(result)
          }}
        />
      )}

      {dialog?.mode === 'notAUnit' && (
        <NotAUnitDialog
          importId={importId}
          kind={kind}
          value={dialog.value}
          onClose={() => setDialog(null)}
          onResolved={(result) => {
            setDialog(null)
            onResolved(result)
          }}
        />
      )}

      {dialog?.mode === 'create' && (
        <CreateResolutionDialog
          importId={importId}
          kind={kind}
          value={dialog.value}
          onClose={() => setDialog(null)}
          onResolved={(result) => {
            setDialog(null)
            onResolved(result)
          }}
        />
      )}
    </div>
  )
}
