import { missingPriceCount, warningToneClass } from '../../pricing/labels'
import { incompleteExplanationNote } from '../../terminology/terms'

/**
 * A price somebody owes, as a short mark beside the money it affects: "⚠ 3". The two sentences it replaces —
 * "3 sətirdə qiymət yoxdur" and "Dəyişikliyin bir hissəsi izah edilə bilmir…" — sat on nearly every card and
 * row, and a warning said everywhere stops being read. They are its hover text and its name to a screen reader.
 *
 * Only a line somebody owes a price for counts (Task 2): internal supply never raises it. With no line missing
 * this month but a baseline month that was, the change is still partly unexplained, so the mark stands alone.
 */
export function MissingPriceMark({ count, explanationIsComplete }: {
  /** Lines in this month's order somebody still owes a price for. */
  count: number
  explanationIsComplete: boolean
}) {
  const name = missingPriceMarkName(count, explanationIsComplete)
  if (name === null) {
    return null
  }

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={`whitespace-nowrap text-xs font-medium ${warningToneClass}`}
    >
      {count > 0 ? `⚠ ${count}` : '⚠'}
    </span>
  )
}

/** What the mark says in words; null when there is nothing to warn about. */
function missingPriceMarkName(count: number, explanationIsComplete: boolean): string | null {
  if (count > 0) {
    return explanationIsComplete
      ? missingPriceCount(count)
      : `${missingPriceCount(count)}. ${incompleteExplanationNote}`
  }

  return explanationIsComplete ? null : incompleteExplanationNote
}
