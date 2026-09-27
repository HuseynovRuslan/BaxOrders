import type { OrderRequestItem } from '../../api/orders'
import { noResponsiblePersonLabel, responsiblePersonLabel } from '../../orderLines/responsibility'

/**
 * Who asked for one line, beside the line.
 *
 * Quiet, like the classification badge next to it: on an order where every line is one person's this repeats
 * itself down the page, and a chip on each row would compete with the product and the money. It earns its
 * place on the orders that hold two or three people's lines, which is where a reader actually has to ask.
 *
 * A line nobody is recorded for says so in grey rather than leaving a gap, because an empty space reads as
 * something the screen failed to load.
 */
export function LineResponsibleNote({ item }: { item: OrderRequestItem }) {
  return item.responsiblePersonName === null ? (
    <span className="text-xs text-slate-400">{noResponsiblePersonLabel}</span>
  ) : (
    <span className="text-xs text-slate-500">
      {responsiblePersonLabel}: <span className="text-slate-700">{item.responsiblePersonName}</span>
    </span>
  )
}
