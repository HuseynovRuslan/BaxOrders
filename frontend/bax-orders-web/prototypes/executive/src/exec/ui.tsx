import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import { percent, signedMoney } from '../lib/format'
import { wayOf, type Way } from '../overview/insights'
import { Select, type SelectOption } from '../ui/Select'

/*
 * The small parts the overview and the map share. The filters are the app's own dropdown (ui/Select), drawn as the
 * reference draws its «Dövr» button: an icon, a quiet label, the value, a chevron.
 */

export type { SelectOption }

export function FilterSelect({ icon, label, value, options, onChange, disabled = false, title, className = '' }: {
  icon: LucideIcon
  label: string
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  title?: string
  className?: string
}) {
  // The reason a filter is off is shown on its box: a disabled control shows no tooltip of its own.
  return (
    <span title={title} className={`inline-flex min-w-0 ${className}`}>
      <Select icon={icon} prefix={`${label}:`} label={label} value={value} options={options} onChange={onChange} disabled={disabled} className="min-w-0 text-[15px]" />
    </span>
  )
}

const arrows: Record<Way, string> = { up: '▲', down: '▼', flat: '•' }
const wayWords: Record<Way, string> = { up: 'artım', down: 'azalma', flat: 'dəyişməyib' }

/**
 * A change, said by its arrow and its sign as well as its number — in one neutral colour: the cost rose or fell, and the
 * chip does not say whether that is good.
 */
export function ChangeChip({ pct, delta, size = 'sm', reason }: { pct: number | null; delta: number | null; size?: 'sm' | 'lg'; reason?: string }) {
  if (delta === null) return <span className="text-sm text-(--x-muted)" title={reason}><span aria-hidden="true">—</span><span className="sr-only">{reason ?? 'müqayisə yoxdur'}</span></span>
  // No percentage beside a figure that was zero before: the thing is new, not «+∞%».
  if (pct === null && delta > 0) {
    return <span title={`Əvvəl sifariş yox idi; fərq ${signedMoney(delta)}`} className={`inline-flex items-center whitespace-nowrap rounded-full bg-(--x-chip) font-bold text-(--x-chip-ink) ${size === 'lg' ? 'px-3.5 py-1.5 text-[22px] leading-none' : 'px-2 py-0.5 text-[13px]'}`}>yeni</span>
  }
  const way = wayOf(delta)
  const text = pct === null ? signedMoney(delta) : percent(pct)
  return (
    <span
      className={`tnum inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-(--x-chip) font-bold text-(--x-chip-ink) ${size === 'lg' ? 'px-3.5 py-1.5 text-[22px] leading-none' : 'px-2 py-0.5 text-[13px]'}`}
    >
      <span aria-hidden="true" className={size === 'lg' ? 'text-[13px]' : 'text-[9px]'}>{arrows[way]}</span>
      <span className="sr-only">{wayWords[way]}: </span>
      {text}
    </span>
  )
}

export function Swatch({ tone, hatch = false }: { tone: 'prev' | 'focus' | 'ok' | 'amber'; hatch?: boolean }) {
  const colour = { prev: 'bg-(--x-prev)', focus: 'bg-(--x-focus-year)', ok: 'bg-(--x-ok)', amber: 'bg-(--x-amber-bar)' }[tone]
  return <span aria-hidden="true" className={`inline-block size-3 shrink-0 rounded-[3px] ${colour} ${hatch ? 'x-hatch' : ''}`} />
}

export function CardTitle({ icon: Icon, children, aside, id }: { icon: LucideIcon; children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <h2 id={id} className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.01em]">
        <Icon aria-hidden="true" className="size-6 shrink-0 text-(--x-ink)" strokeWidth={2.2} />
        {children}
      </h2>
      {aside}
    </div>
  )
}

/** Where a figure cannot be shown: what is missing and what to do, never a zero standing in for it. */
export function EmptyNote({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-(--x-line-2) px-6 py-10 text-center">
      <p className="text-base font-bold">{title}</p>
      {children && <p className="max-w-xl text-sm text-(--x-muted)">{children}</p>}
      {action}
    </div>
  )
}
