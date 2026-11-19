import { Link, useLocation, useNavigate } from 'react-router'
import { basisOptions, type Basis, type Kind } from '../data/analysis'
import { YEAR, YEARS } from '../data/model'
import { kindNames, kindOrder } from '../lib/year'
import { Select } from '../ui/Select'

/**
 * The year on screen, as a choice among the years with figures: the same screen of another year, its kind, comparison
 * and filters kept. An open row of the split closes — it may not be in the other year. With one year, just the year.
 */
export function YearSelect({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  if (YEARS.length < 2) return <span className={`px-1 font-semibold ${className}`}>{YEAR}</span>
  const go = (year: string) => {
    const params = new URLSearchParams(search)
    params.delete('sec')
    params.delete('yol')
    const query = params.toString()
    navigate(`${pathname.replace(/^\/\d{4}/, `/${year}`)}${query ? `?${query}` : ''}`)
  }
  return (
    <Select
      variant="bare"
      label="İl"
      value={String(YEAR)}
      options={YEARS.map((year) => ({ value: String(year), label: String(year) }))}
      onChange={go}
      className={className}
    />
  )
}

/** The order kind, as three links that keep everything else in the address: the year and the analysis screens share it. */
export function KindNav({ kind, hrefOf }: { kind: Kind; hrefOf: (kind: Kind) => string }) {
  return (
    <nav aria-label="Sifariş növü" className="grid grid-cols-[0.8fr_1.5fr_1fr] rounded-lg border border-(--y-line) bg-(--y-surface) p-1 sm:flex">
      {kindOrder.map((value) => (
        <Link
          key={value}
          to={hrefOf(value)}
          replace
          aria-current={value === kind ? 'true' : undefined}
          className={`flex min-h-9 items-center justify-center whitespace-nowrap rounded-md px-2 text-sm font-semibold transition-colors sm:px-3 ${
            value === kind ? 'bg-(--y-ink) text-(--y-surface)' : 'text-(--y-ink-2) hover:bg-(--y-band)'
          }`}
        >
          <span className="sm:hidden">{value === 'monthly' ? 'Aylıq' : kindNames[value]}</span>
          <span className="hidden sm:inline">{kindNames[value]}</span>
        </Link>
      ))}
    </nav>
  )
}

/** What every change is measured against: the month before, or the monthly average of the months before it. */
export function BasisSelect({ basis, onChange }: { basis: Basis; onChange: (basis: Basis) => void }) {
  return (
    <label className="dd-group gap-2 py-0.5 pl-3 pr-1 text-sm">
      <span className="dd-group-label">Müqayisə üçün</span>
      <Select
        variant="bare"
        label="Müqayisə üçün"
        value={basis}
        options={basisOptions}
        onChange={(value) => onChange(value as Basis)}
        className="flex-1"
      />
    </label>
  )
}
