import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { assignProductCategory, type ProductCategoryRow } from '../../api/productCategories'
import { searchReference, type ReferenceOption } from '../../api/review'
import { Modal } from '../imports/review/Modal'
import { formatCategoryPath, occurrenceLabel } from './labels'

interface AssignCategoryDialogProps {
  row: ProductCategoryRow
  onClose: () => void
  onAssigned: () => void
}

/**
 * Choosing a product's canonical category.
 * <para>
 * The evidence is shown, never preselected: where the history disagrees with itself, offering the most
 * frequent category already suggests an answer, and there is no reason to believe the workbook was right more
 * often than it was wrong. Typed text searches the categories that exist; a category is not created here.
 * </para>
 */
export function AssignCategoryDialog({ row, onClose, onAssigned }: AssignCategoryDialogProps) {
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<ReferenceOption[]>([])
  const [chosen, setChosen] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchReference('CategoryPath', search.trim(), controller.signal)
        .then(setOptions)
        .catch(() => undefined)
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  async function confirm() {
    if (chosen === null) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      await assignProductCategory(row.productId, chosen, reason.trim() || undefined)
      onAssigned()
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : 'Kateqoriya təyin edilmədi.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Kateqoriya seç"
      subtitle={`${row.productName} · ${row.productCode}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            İmtina
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={chosen === null || busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? 'Gözləyin…' : 'Təyin et'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="text-slate-500">Mövcud kanonik kateqoriya</p>
          <p className="font-medium text-slate-900">
            {row.currentCategoryPath.length > 0 ? formatCategoryPath(row.currentCategoryPath) : 'Yoxdur'}
          </p>
        </div>

        {row.evidence.length > 0 && (
          <div>
            <p className="text-xs text-slate-600">Excel tarixçəsində görünən kateqoriyalar</p>
            <ul className="mt-1 space-y-1">
              {row.evidence.map((entry) => (
                <li key={entry.categoryId} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-slate-700">{formatCategoryPath(entry.path)}</span>
                  <span className="shrink-0 text-slate-500">{occurrenceLabel(entry.occurrences)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="block">
          <span className="text-xs text-slate-600">Kateqoriya axtar</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kateqoriya adı ilə axtar…"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </label>

        <div className="max-h-52 overflow-y-auto rounded-md border border-slate-200" role="listbox" aria-label="Kateqoriyalar">
          {options.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Uyğun kateqoriya tapılmadı.</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={chosen === option.id}
              onClick={() => setChosen(option.id)}
              className={`flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                chosen === option.id ? 'bg-slate-100 font-medium' : ''
              }`}
            >
              <span className="text-slate-900">{option.label}</span>
              {option.secondary && <span className="text-xs text-slate-500">{option.secondary}</span>}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs text-slate-600">Səbəb (məcburi deyil)</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Bu kateqoriyanın niyə seçildiyi"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
          />
        </label>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
