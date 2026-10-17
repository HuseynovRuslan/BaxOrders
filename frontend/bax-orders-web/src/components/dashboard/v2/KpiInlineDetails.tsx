import { Link } from 'react-router'
import { X } from 'lucide-react'
import type { DashboardPartitionMember, ManagementDashboardSummary } from '../../../api/dashboard'
import { locationLink, type BasisSelection } from '../../../analytics/basisParams'
import { formatCount, formatMoney, formatMoneyDelta } from '../../analytics/format'

export type KpiKind = 'current' | 'baseline' | 'difference' | 'active'

const titles: Record<KpiKind, string> = {
  current: 'Xərclər obyektlər üzrə',
  baseline: 'Müqayisə dövründə xərclər',
  difference: 'Fərqi yaradan obyektlər',
  active: 'Obyektlərin sifariş vəziyyəti',
}

/**
 * An inline drill-down immediately after the four dashboard cards, not a drawer or modal.
 * Partition members are the backend's full portfolio (even if the table below has a search
 * filter or another page), so the numbers here come from the same answer as the headline.
 * The difference is a compared-cohort figure: never mix uncomparable objects into that list.
 */
export function KpiInlineDetails({
  kind,
  summary,
  selection,
  onClose,
}: {
  kind: KpiKind
  summary: ManagementDashboardSummary
  selection?: BasisSelection
  onClose: () => void
}) {
  const { compared, noBaseline, noOrderThisMonth, noHistory } = summary.partition
  const ordered = [...compared, ...noBaseline]
  const activeIds = new Set(ordered.map((member) => member.locationId))
  const candidates = kind === 'active'
    ? [...ordered, ...noOrderThisMonth, ...noHistory]
    : kind === 'current'
      ? ordered
      : compared

  const rows = [...candidates].sort((left, right) => {
    if (kind === 'active') {
      const first = Number(activeIds.has(right.locationId)) - Number(activeIds.has(left.locationId))
      return first || left.locationName.localeCompare(right.locationName, 'az')
    }

    if (kind === 'difference') {
      const movement = Math.abs(right.knownAmountDelta ?? 0) - Math.abs(left.knownAmountDelta ?? 0)
      return movement || left.locationName.localeCompare(right.locationName, 'az')
    }

    const value = (member: DashboardPartitionMember) =>
      kind === 'current' ? member.currentKnownAmount : member.baselineKnownAmount
    return (value(right) ?? -Infinity) - (value(left) ?? -Infinity)
      || left.locationName.localeCompare(right.locationName, 'az')
  })

  const note = kind === 'difference'
    ? 'Fərq yalnız hər iki tərəfi müqayisə edilə bilən obyektlər üzrə göstərilir. Artımlar və azalmalar birlikdə ümumi fərqi yaradır.'
    : kind === 'active'
      ? 'Sifariş olmayan obyektlər də siyahıdadır. Sifarişin olmaması xərcin sıfır olduğu demək deyil.'
      : 'Məbləğlər API-nin hesabladığı məlum xərclərdir. Qiyməti olmayan sətirlər məbləğə daxil deyil.'

  return (
    <section
      id="dashboard-kpi-inline-details"
      role="region"
      aria-label={titles[kind]}
      className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{titles[kind]}</h2>
          <p className="mt-1 text-xs text-slate-500">{note}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kart detallarını bağla"
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {formatCount(rows.length)} obyekt
        {kind === 'active' && ' · ' + formatCount(activeIds.size) + ' sifariş verib'}
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Bu göstərici üzrə obyekt yoxdur.</p>
      ) : (
        <div className="mt-3 max-h-[440px] overflow-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[540px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Obyekt</th>
                {kind === 'active' ? (
                  <th scope="col" className="px-3 py-2 font-semibold">Bu ay</th>
                ) : (
                  <>
                    {kind !== 'baseline' && <th scope="col" className="px-3 py-2 text-right font-semibold">Cari ay</th>}
                    {kind !== 'current' && <th scope="col" className="px-3 py-2 text-right font-semibold">Müqayisə dövrü</th>}
                    {kind === 'difference' && <th scope="col" className="px-3 py-2 text-right font-semibold">Fərq</th>}
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr key={member.locationId} className="border-t border-slate-100 hover:bg-slate-50">
                  <th scope="row" className="px-3 py-2 text-left font-medium text-slate-800">
                    {selection ? (
                      <Link to={locationLink(member.locationId, selection)} className="underline-offset-2 hover:underline">
                        {member.locationName}
                      </Link>
                    ) : member.locationName}
                  </th>
                  {kind === 'active' ? (
                    <td className="px-3 py-2 text-slate-600">
                      {activeIds.has(member.locationId) ? 'Sifariş verib' : 'Sifariş yoxdur'}
                    </td>
                  ) : (
                    <>
                      {kind !== 'baseline' && (
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(member.currentKnownAmount)}</td>
                      )}
                      {kind !== 'current' && (
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatMoney(member.baselineKnownAmount)}</td>
                      )}
                      {kind === 'difference' && (
                        <td
                          className={
                            'whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ' +
                            (member.knownAmountDelta === null ? 'text-slate-500'
                              : member.knownAmountDelta > 0 ? 'text-red-600'
                                : member.knownAmountDelta < 0 ? 'text-green-600' : 'text-slate-700')
                          }
                        >
                          {member.knownAmountDelta === null ? '—' : formatMoneyDelta(member.knownAmountDelta)}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
