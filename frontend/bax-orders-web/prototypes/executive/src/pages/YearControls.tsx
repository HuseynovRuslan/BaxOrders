import { Link } from 'react-router'
import { basisOptions, type Basis, type Kind } from '../data/analysis'
import { kindNames, kindOrder } from '../lib/year'

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
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-(--y-line) bg-(--y-surface) py-1 pl-3 pr-1 text-sm">
      <span className="whitespace-nowrap text-(--y-muted)">Müqayisə üçün</span>
      <select
        value={basis}
        onChange={(event) => onChange(event.target.value as Basis)}
        className="h-9 min-w-0 flex-1 rounded-md bg-transparent pl-1 pr-7 font-semibold text-(--y-ink)"
      >
        {basisOptions.map((option) => <option key={option.value} value={option.value} className="bg-(--y-surface)">{option.label}</option>)}
      </select>
    </label>
  )
}
