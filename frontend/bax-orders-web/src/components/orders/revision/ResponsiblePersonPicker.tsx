import { useEffect, useState } from 'react'
import { searchReference, type ReferenceOption } from '../../../api/review'
import { noResponsiblePersonLabel, responsiblePersonColumnLabel } from '../../../orderLines/responsibility'

interface ResponsiblePersonPickerProps {
  value: number | null
  /** The person the line has now, so it reads correctly before anything is searched. */
  currentName: string | null
  onChange: (responsiblePersonId: number | null) => void
}

/**
 * Picks who asked for this line, from the people the system knows, or nobody at all.
 *
 * Typed text is a search, never a new person: naming somebody on an order is a statement about a real
 * colleague, and their record is created deliberately — in the import review, where a name is checked against
 * the aliases that already exist, or by an administrator. "Nobody recorded" is a real answer here and is kept
 * apart from "not chosen yet", the same way an unknown supplier is.
 */
export function ResponsiblePersonPicker({ value, currentName, onChange }: ResponsiblePersonPickerProps) {
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<ReferenceOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      searchReference('ResponsiblePerson', search.trim(), controller.signal)
        .then(setOptions)
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false)
          }
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  const chosen = options.find((option) => option.id === value)
  const chosenName = chosen?.label ?? (value !== null ? currentName : null)

  return (
    <div>
      <span className="text-xs text-slate-600">{responsiblePersonColumnLabel}</span>
      <p className="mt-1 text-sm text-slate-900">{chosenName ?? noResponsiblePersonLabel}</p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cavabdeh axtar…"
        aria-label="Cavabdeh axtar"
        className="mt-2 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
      />

      <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-200">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
            value === null ? 'bg-slate-100 font-medium' : ''
          }`}
        >
          {noResponsiblePersonLabel}
        </button>

        {loading && <p className="px-3 py-1.5 text-xs text-slate-500">Axtarılır…</p>}

        {!loading && options.length === 0 && (
          <p className="px-3 py-1.5 text-xs text-slate-500">Uyğun cavabdeh tapılmadı.</p>
        )}

        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex w-full flex-col px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
              value === option.id ? 'bg-slate-100 font-medium' : ''
            }`}
          >
            <span className="text-slate-900">{option.label}</span>
            {option.secondary && <span className="text-xs text-slate-500">{option.secondary}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
