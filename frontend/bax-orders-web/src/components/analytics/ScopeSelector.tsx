import type { AnalyticsScope } from '../../api/dashboard'
import { scopeLabels, scopeOrder } from '../../analytics/scope'

/**
 * Which lines the screen is about.
 *
 * A segmented control rather than a dropdown, because this is not a filter among filters: it decides what every
 * number below it means, and the reader has to be able to see the answer to "what am I looking at" without
 * opening anything. Three options is few enough to show and important enough to keep in sight.
 *
 * Compact on purpose. It sits near the top of a management screen, where it competes with the amount, and the
 * amount must win.
 */
export function ScopeSelector({ value, onChange, label = 'Sifariş növü' }: {
  value: AnalyticsScope
  onChange: (scope: AnalyticsScope) => void
  label?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-md border border-slate-200 bg-white p-0.5"
    >
      {scopeOrder.map((scope) => {
        const active = scope === value
        return (
          <button
            key={scope}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(scope)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {scopeLabels[scope]}
          </button>
        )
      })}
    </div>
  )
}
