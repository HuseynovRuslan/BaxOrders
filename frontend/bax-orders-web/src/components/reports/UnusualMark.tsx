import { costDirectionToneClass } from '../analytics/format'

/**
 * The direction of an unusual month (owner decision 8.2, UI V2 03 §6.2.4): ▲ when it is more than half above its
 * location's three recent months, ▼ when it is more than half below — in the cost colours (9.1: up red, down green),
 * and with a shape of its own, so the direction never rests on the colour alone (AC-04). Whether a month is unusual is
 * the server's decision; this only draws it. The percentage itself is never written in a cell — it is in the cell's
 * name and tooltip, against its own basis.
 */
export function UnusualMark({ percent, className = '' }: { percent: number | null; className?: string }) {
  if (percent === null || percent === 0) {
    return null
  }

  const up = percent > 0
  return (
    <span
      aria-hidden="true"
      data-unusual-mark={up ? 'up' : 'down'}
      className={`${costDirectionToneClass(percent)} ${className}`}
    >
      {up ? '▲' : '▼'}
    </span>
  )
}
