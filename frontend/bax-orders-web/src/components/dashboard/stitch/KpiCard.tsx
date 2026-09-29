import type { ReactNode } from 'react'

/**
 * One figure, in the approved design's card.
 *
 * The shape is fixed so a row of them reads as a row: a label and its qualifier at the top left, an icon at
 * the top right, the figure itself in the middle at a size nothing else on the screen competes with, and
 * whatever qualifies it underneath. A card that has nothing to put in the foot simply has none.
 *
 * The figure is `children` rather than a string because most of these are money with a separate currency mark,
 * or a ratio with a quieter denominator — arrangements the card should not have to know about.
 */
export function KpiCard({ label, note, icon, iconClass, children, foot, accent }: {
  label: string
  /** The line under the label: what the figure is of, in fewer words than the label can spare. */
  note?: string
  icon: ReactNode
  /** The icon's tile. Carries the card's one touch of colour, so the figure never has to. */
  iconClass: string
  children: ReactNode
  foot?: ReactNode
  /** A hairline along the bottom edge, for the one card whose direction is worth seeing from across a desk. */
  accent?: string
}) {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate font-label-md text-label-md font-medium text-on-surface-variant">{label}</h3>
          {note && <span className="truncate font-label-sm text-label-sm text-outline">{note}</span>}
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`} aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="my-3 flex items-baseline gap-1.5">{children}</div>

      {foot && <div className="flex flex-col gap-1.5 pt-2">{foot}</div>}

      {accent && <span className={`absolute inset-x-0 bottom-0 h-1 ${accent}`} aria-hidden="true" />}
    </section>
  )
}

/** The money itself: the one thing on the card at metric size, with its currency mark kept quieter. */
export function KpiMoney({ value, tone }: { value: string, tone?: string }) {
  // The mark is split off so the digits keep the tabular alignment a column of money needs.
  const [amount, mark] = value.endsWith(' ₼') ? [value.slice(0, -2), '₼'] : [value, null]

  return (
    <>
      <span className={`tabular whitespace-nowrap font-metric-val text-[34px] leading-none font-bold tracking-tight ${tone ?? 'text-on-surface'}`}>
        {amount}
      </span>
      {mark && <span className="font-headline-md text-headline-md font-semibold text-on-surface-variant">{mark}</span>}
    </>
  )
}

/** A short coloured strip under the figure — a difference, a state, a reassurance. */
export function KpiPill({ icon, children, className }: {
  icon?: ReactNode
  children: ReactNode
  className: string
}) {
  return (
    <span className={`flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 font-label-sm text-label-sm font-bold ${className}`}>
      {icon}
      {children}
    </span>
  )
}
