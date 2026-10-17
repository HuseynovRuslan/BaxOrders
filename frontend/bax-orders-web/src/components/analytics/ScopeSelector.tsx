import type { AnalyticsScope } from '../../api/dashboard'
import { scopeLabels, scopeOrder } from '../../analytics/scope'
import { SegmentedControl, type SegmentedControlSize } from '../SegmentedControl'

const options = scopeOrder.map((scope) => ({ value: scope, label: scopeLabels[scope] }))

/**
 * Which lines the screen is about.
 *
 * A segmented control rather than a dropdown, because this is not a filter among filters: it decides what every
 * number on the screen means, and the reader has to be able to see the answer to "what am I looking at" without
 * opening anything. Three options is few enough to show and important enough to keep in sight.
 *
 * Drawn as the product's `SegmentedControl` (UI V2): a quiet grey track with the chosen scope lifted out of it in
 * white, rather than a dark pill — it sits near the money it qualifies, and the money must win.
 */
export function ScopeSelector({
  value,
  onChange,
  label = 'Sifariş növü',
  labelledBy,
  size,
  fullWidth,
}: {
  value: AnalyticsScope
  onChange: (scope: AnalyticsScope) => void
  label?: string
  /** The id of a visible label that names the group; without one, `label` names it. */
  labelledBy?: string
  size?: SegmentedControlSize
  fullWidth?: boolean | 'mobile'
}) {
  return (
    <SegmentedControl
      label={label}
      labelledBy={labelledBy}
      options={options}
      value={value}
      onChange={onChange}
      size={size}
      fullWidth={fullWidth}
    />
  )
}
