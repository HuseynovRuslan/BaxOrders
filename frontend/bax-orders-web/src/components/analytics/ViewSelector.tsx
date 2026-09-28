import { dashboardViewLabels, dashboardViewOrder, type DashboardView } from '../../analytics/dashboardView'

/**
 * How deep the reader wants to go.
 *
 * Built the same way as the scope control and placed beside it, because they are the same kind of decision —
 * what am I looking at, and how much of it — and two controls that behave alike are one thing to learn.
 */
export function ViewSelector({ value, onChange }: {
  value: DashboardView
  onChange: (view: DashboardView) => void
}) {
  return (
    <div role="group" aria-label="Baxış" className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
      {dashboardViewOrder.map((view) => {
        const active = view === value
        return (
          <button
            key={view}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(view)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {dashboardViewLabels[view]}
          </button>
        )
      })}
    </div>
  )
}
