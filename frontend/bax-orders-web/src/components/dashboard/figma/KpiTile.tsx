import type { ReactNode } from 'react'

/**
 * One figure, in the Figma Make handoff's tile.
 *
 * Four of them stand in a row and are read left to right, so the shape is fixed: a small upper-case label, a
 * quieter line saying what the figure is of, the figure itself in the mono face, and up to two lines of
 * qualification under it. A tile with nothing to qualify simply has none.
 *
 * The figures are mono because a row of money read across four tiles only lines up if the digits do.
 */
export function KpiTile({ label, sub, value, chip, chipTone = 'neutral', notes }: {
  label: string
  sub: string
  value: string
  /** The pill under the figure — a difference, or a state. */
  chip?: ReactNode
  /** What the chip means, in this product's terms: a cost going up is red, a cost coming down is green. */
  chipTone?: 'up' | 'down' | 'calm' | 'neutral'
  /** Up to two quiet lines. Anything longer belongs on the detailed view. */
  notes?: (string | null)[]
}) {
  const tone = {
    up: 'bg-cost-up-wash text-cost-up',
    down: 'bg-cost-down-wash text-cost-down',
    calm: 'bg-cost-down-wash text-cost-down',
    neutral: 'bg-simple-line-soft text-simple-ink-soft',
  }[chipTone]

  return (
    <section className="min-w-0 flex-1 rounded-xl border border-simple-line bg-simple-card px-5 py-[18px]">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-simple-ink-faint">{label}</h3>
      <p className="mt-0.5 mb-2.5 text-[11px] text-simple-ink-faint">{sub}</p>

      <p className="font-figures text-[28px] font-bold leading-none tracking-[-0.5px] text-simple-ink">{value}</p>

      {chip && (
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 font-figures text-xs font-semibold ${tone}`}>
          {chip}
        </span>
      )}

      {notes?.filter((note) => note !== null).map((note) => (
        <p key={note} className="mt-1 text-xs text-simple-ink-soft">{note}</p>
      ))}
    </section>
  )
}
