import type { OrderLineType } from '../../../orderLines/lineType'
import { orderLineTypeLabels, selectableOrderLineTypes } from '../../../orderLines/lineType'

interface OrderLineTypePickerProps {
  value: OrderLineType
  onChange: (value: OrderLineType) => void
}

/**
 * Whether this line is the month's planned material or was ordered on top of it.
 *
 * Two answers to choose from. "Təsnif edilməyib" is not one of them: it is what a line says before anybody
 * has looked at it, not a third kind of demand, and offering it as an equal option would invite it to be
 * picked to avoid deciding. A line that already carries it keeps it listed, so that somebody who no longer
 * stands behind a classification can put it back rather than choose the less wrong of two.
 */
export function OrderLineTypePicker({ value, onChange }: OrderLineTypePickerProps) {
  const options = selectableOrderLineTypes.includes(value)
    ? selectableOrderLineTypes
    : [value, ...selectableOrderLineTypes]

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">Növ</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as OrderLineType)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {orderLineTypeLabels[option]}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-slate-500">
        Aylıqdan kənar sətirlər aylıq müqayisəyə daxil edilmir.
      </span>
    </label>
  )
}
