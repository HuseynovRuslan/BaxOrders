import { warningToneClass } from '../../pricing/labels'
import { formatCount } from '../analytics/format'

/**
 * «⚠ N»: N lines of the order have no price, so its amount is not the whole of it (UI V2 03 §6.2.5). Amber, because a
 * price somebody owes is missing; material the company supplies itself never reaches this mark. The sentence it stands
 * for is in the cell's name, so the mark is hidden from a screen reader.
 */
export function MissingPriceMark({ count }: { count: number }) {
  return (
    <span aria-hidden="true" className={`whitespace-nowrap font-semibold ${warningToneClass}`}>
      {`⚠ ${formatCount(count)}`}
    </span>
  )
}
