import type { OrderLineType } from '../../api/orders'
import { orderLineTypeBadge, orderLineTypeToneClass } from '../../orderLines/lineType'
import { StatusBadge } from '../StatusBadge'

/**
 * What kind of demand one line was, beside the line itself.
 *
 * Deliberately quiet, and quietest of all for the ordinary case: almost every line of a month is planned
 * material, and a chip that shouts on nine rows in ten is a chip nobody reads. The product, the quantity and
 * the money stay the things the eye lands on; this is the answer to a question asked second.
 */
export function OrderLineTypeBadge({ type }: { type: OrderLineType }) {
  return <StatusBadge label={orderLineTypeBadge[type]} toneClass={orderLineTypeToneClass[type]} size="sm" />
}
