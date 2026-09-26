import { useEffect, useState } from 'react'
import { fetchOutsideMonthly, type OutsideMonthly } from '../../api/dashboard'
import { outsideMonthlyOrdersLabel } from '../../orderLines/lineType'
import { formatCount, formatMoney, formatQuantity } from '../analytics/format'
import { Modal } from '../imports/review/Modal'
import { EmptyState } from '../EmptyState'
import { missingPriceCount } from '../../pricing/labels'

/**
 * What a month was asked for on top of its plan: which objects, which products, how much.
 *
 * Opened from the figure it explains, so there is no second page to find and nothing to keep in step with the
 * dashboard's own month. It lists and totals; it does not compare. An ad-hoc purchase has no month of its own
 * to be measured against, and a trend invented for one would be exactly the mistake the monthly comparison
 * avoids by leaving these lines out.
 */
export function OutsideMonthlyPanel({ period, onClose }: { period: string; onClose: () => void }) {
  const [data, setData] = useState<OutsideMonthly | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(false)
    fetchOutsideMonthly(period, controller.signal)
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })

    return () => controller.abort()
  }, [period])

  return (
    <Modal title={outsideMonthlyOrdersLabel} subtitle={subtitle(data)} onClose={onClose} width="wide" dismissOnBackdrop>
      {error && <p role="alert" className="text-sm text-red-700">Siyahını oxumaq alınmadı.</p>}
      {!error && data === null && <p className="text-sm text-slate-500">Yüklənir…</p>}

      {data !== null && data.locations.length === 0 && (
        <EmptyState>Bu ay aylıqdan kənar sifariş olmayıb.</EmptyState>
      )}

      {data !== null && data.locations.map((location) => (
        <section key={location.locationId} className="mb-4 last:mb-0" aria-label={location.locationName}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-slate-200 pb-1">
            <h3 className="text-sm font-semibold text-slate-900">{location.locationName}</h3>
            <p className="text-xs text-slate-500">
              {formatCount(location.lineCount)} sətir
              <span className="ml-3 text-sm font-medium text-slate-700">{formatMoney(location.knownAmount)}</span>
            </p>
          </div>

          {location.missingPriceLineCount > 0 && (
            <p className="mt-1 text-xs text-amber-800">
              {missingPriceCount(location.missingPriceLineCount)}
            </p>
          )}

          <ul className="mt-1 divide-y divide-slate-100">
            {location.lines.map((line) => (
              <li key={line.orderRequestItemId} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                <span className="min-w-0 flex-1 text-sm text-slate-900">
                  {line.productName}
                  <span className="ml-2 text-xs text-slate-500">
                    {formatQuantity(line.quantity)}
                    {line.orderUnitName !== null && ` ${line.orderUnitName}`}
                    {line.supplierName !== null && ` · ${line.supplierName}`}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-slate-700">{formatMoney(line.knownAmount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Modal>
  )
}

/** The month's whole answer in one line: how many, how much, and what the figure leaves out. */
function subtitle(data: OutsideMonthly | null): string | undefined {
  if (data === null) {
    return undefined
  }

  const parts = [`${formatCount(data.lineCount)} sətir`, formatMoney(data.knownAmount)]
  if (data.missingPriceLineCount > 0) {
    parts.push(missingPriceCount(data.missingPriceLineCount))
  }

  return parts.join(' · ')
}
