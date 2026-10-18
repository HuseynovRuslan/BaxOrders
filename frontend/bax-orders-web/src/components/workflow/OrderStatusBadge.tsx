import type { OrderRequestStatus } from '../../api/orders'
import { StatusBadge } from '../StatusBadge'
import {
  historicalImportChipClass,
  historicalImportLabel,
  showsHistoricalImport,
  workflowStatusClass,
  workflowStatusLabels,
  workflowStatusSign,
} from './labels'

interface OrderStatusBadgeProps {
  status: OrderRequestStatus
  /** From the workflow's decision facts. Only an Approved order is ever shown as historical. */
  isHistoricalImport?: boolean
  size?: 'sm' | 'md'
}

/**
 * An order's workflow status, said the same way wherever it is shown (Task 22).
 * <para>
 * The badge is the ordinary one — its word, sign and colours are the status's. An order carried in from Excel as
 * already approved keeps that badge, because it is approved (22.1), and gets the 22.2 phrase beside it in plain
 * grey: context, not a second status and not a warning.
 * </para>
 * <para>
 * Whether an order is historical is the workflow's recorded fact, never inferred here from a missing approver or
 * date — that absence is exactly what made the old wording contradict the badge.
 * </para>
 */
export function OrderStatusBadge({ status, isHistoricalImport = false, size = 'md' }: OrderStatusBadgeProps) {
  const badge = (
    <StatusBadge
      label={workflowStatusLabels[status] ?? status}
      sign={workflowStatusSign[status]}
      toneClass={workflowStatusClass[status]}
      size={size}
    />
  )

  if (!showsHistoricalImport(status, isHistoricalImport)) {
    return badge
  }

  // Wraps, so on a phone the text drops under the badge instead of running off the screen.
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {badge}
      <span
        className={`max-w-full rounded-2xl ${historicalImportChipClass} ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
        }`}
      >
        {historicalImportLabel}
      </span>
    </span>
  )
}
