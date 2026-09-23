import type { ReactNode } from 'react'

interface SummaryMetricProps {
  label: string
  value: string
  /** A short line under the number — a count, a coverage fact. Never a second sentence. */
  note?: ReactNode
  /** Amber instead of slate: something here needs a look, not a judgement about the object. */
  warn?: boolean
  /**
   * Colours only the note line, independent of `warn`. For a metric that is itself perfectly neutral (a
   * plain count of objects, say) but whose one qualifying line is worth a glance — the number is never the
   * problem, so it never turns amber just because its footnote does.
   */
  noteAttention?: boolean
  size?: 'lg' | 'md'
}

/**
 * One fact, read in under a second: a label, a number, and — if there is one — the one line that qualifies
 * it. This is the shape every page's summary row was reinventing slightly differently; it exists so a screen
 * full of these reads as one page rather than four unrelated card designs.
 * <para>
 * <c>warn</c> is the only colour decision made here, and it never means "bad" — a coverage gap or a missing
 * price is a fact to notice, not a verdict on the object.
 * </para>
 */
export function SummaryMetric({ label, value, note, warn = false, noteAttention, size = 'md' }: SummaryMetricProps) {
  const noteWarn = noteAttention ?? warn

  return (
    <div className={`rounded-lg border bg-white p-3 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold ${size === 'lg' ? 'text-3xl' : 'text-xl'} ${warn ? 'text-amber-900' : 'text-slate-900'}`}
      >
        {value}
      </p>
      {note && <p className={`mt-0.5 text-xs ${noteWarn ? 'text-amber-800' : 'text-slate-500'}`}>{note}</p>}
    </div>
  )
}
