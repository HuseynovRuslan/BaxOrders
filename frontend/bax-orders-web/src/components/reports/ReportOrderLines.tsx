import type { OrderRequestItem } from '../../api/orders'
import { noResponsiblePersonLabel, responsiblePersonLabel } from '../../orderLines/responsibility'
import {
  classifyLine,
  internalSupplierLabel,
  internalSupplyLabel,
  isInternalSupply,
  missingPriceLabel,
  warningToneClass,
} from '../../pricing/labels'
import { describeSpecification, distinguishingDetails } from '../analytics/labels'
import { formatMoney, formatQuantity, unknownValue } from '../analytics/format'
import { buttonClass } from '../buttonClass'
import { formatOrderUnit, unknownSupplierLabel } from '../imports/labels'
import { OrderLineTypeBadge } from '../orders/OrderLineTypeBadge'
import { linesPageLabel, linesSectionLabel, nextPageLabel, previousPageLabel } from './labels'

/**
 * A page of an order's real lines, under the month they make up (UI V2 03 §6.9.6, 03a). Kept here rather than shared
 * with the order page (03 §9.9): the order page's cells carry its editing and its explanations, which the details do
 * not. Every word is the order page's own; every amount is the server's, as it sent it — nothing is added up here.
 *
 * Each line reads in three: the product and what it cost; what it is, which kind of line, who asked for it; how much at
 * what price — or what a missing price means — and who supplied it.
 */
export function ReportOrderLines({ items, firstNumber, numbered = true }: {
  items: readonly OrderRequestItem[]
  /** The first line's place in the whole order, as the order page counts it. */
  firstNumber: number
  /**
   * Off under a filter: a line's place in the filtered list is not its number in the order, and the API does not send
   * that number, so none is written rather than a misleading one (E-4).
   */
  numbered?: boolean
}) {
  const details = distinguishingDetails([...items])

  return (
    <ul aria-label={linesSectionLabel} className="divide-y divide-outline-variant">
      {items.map((item, index) => (
        <OrderLine key={item.orderRequestItemId} item={item} number={numbered ? firstNumber + index : null} detail={details[index]} />
      ))}
    </ul>
  )
}

function OrderLine({ item, number, detail }: { item: OrderRequestItem; number: number | null; detail: string | null }) {
  const specification = [describeSpecification(item), detail].filter((part): part is string => part !== null).join(' · ')

  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-body-md leading-[1.4] text-on-surface">
          {number !== null && <span className="mr-1.5 text-body-sm tabular text-on-surface-variant">{number}</span>}
          {item.productName}
        </p>
        {/* Never a zero: no amount was recorded, for either reason. */}
        <span className="shrink-0 whitespace-nowrap text-body-md font-medium tabular text-on-surface">
          {item.lineTotal === null ? unknownValue : formatMoney(item.lineTotal)}
        </span>
      </div>

      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm leading-[1.4] text-on-surface-variant">
        {specification !== '' && <span>{specification}</span>}
        <OrderLineTypeBadge type={item.orderLineType} />
        {/* Written here in the product's secondary text colour; the shared note's grey is below contrast (03 §6.9.6). */}
        <span>
          {item.responsiblePersonName === null
            ? noResponsiblePersonLabel
            : `${responsiblePersonLabel}: ${item.responsiblePersonName}`}
        </span>
      </p>

      <p className="mt-0.5 text-body-sm leading-[1.4] text-on-surface-variant">
        <span className="tabular">{formatQuantity(item.quantity)}</span> {formatOrderUnit(item.orderUnitCode, item.orderUnitName)}
        {item.unitPrice !== null
          ? <> × <span className="tabular">{formatMoney(item.unitPrice)}</span></>
          : <> · <PriceWord item={item} /></>}
        {' · '}
        <Supplier item={item} />
      </p>
    </li>
  )
}

/**
 * What a missing price means: material the company issues from its own store never had one, and says so in calm
 * grey; any other line still owes a price, in the warning tone (the order page's rule).
 */
function PriceWord({ item }: { item: OrderRequestItem }) {
  return isInternalSupply(classifyLine(item.unitPrice, item.pricingMode))
    ? <span>{internalSupplyLabel}</span>
    : <span className={warningToneClass}>{missingPriceLabel}</span>
}

function Supplier({ item }: { item: OrderRequestItem }) {
  if (isInternalSupply(classifyLine(item.unitPrice, item.pricingMode))) {
    return <>{internalSupplierLabel(item.sourceSupplierName)}</>
  }

  return <>{item.supplierName ?? unknownSupplierLabel}</>
}

/** «Səhifə 1 / 3 · 123 sətir», «Əvvəlki», «Növbəti» — only when the order has more lines than one page holds. */
export function LinesPager({ page, pages, total, onPage }: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}) {
  if (pages <= 1) {
    return null
  }

  const button = buttonClass({ variant: 'secondary', size: 'sm', touchBelowLg: true })
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p className="text-body-sm text-on-surface-variant">{linesPageLabel(page, pages, total)}</p>
      <div className="flex gap-2">
        <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          {previousPageLabel}
        </button>
        <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {nextPageLabel}
        </button>
      </div>
    </div>
  )
}
