import type { ImportGroupPreview } from '../../api/imports'
import {
  internalSupplyShortLabel,
  internalToneClass,
  missingPriceShortLabel,
  warningToneClass,
} from '../../pricing/labels'
import { formatPeriod } from './labels'

interface ImportGroupsTableProps {
  groups: ImportGroupPreview[]
  ungroupedRows: number
}

export function ImportGroupsTable({ groups, ungroupedRows }: ImportGroupsTableProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-900">Obyekt və dövr üzrə qruplar</h2>
        <p className="mt-0.5 text-xs text-slate-500">Hər qrup gələcəkdə bir sorğuya çevrilə bilər. Bu mərhələdə sorğu yaradılmır.</p>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">Obyekti və tarixi müəyyən olunmuş sətir yoxdur.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Obyekt</th>
                <th className="px-4 py-2">Dövr</th>
                <th className="px-4 py-2 text-right">Sətir</th>
                <th className="px-4 py-2 text-right">{missingPriceShortLabel}</th>
                <th className="px-4 py-2 text-right">{internalSupplyShortLabel}</th>
                <th className="px-4 py-2 text-right">Xəbərdarlıq</th>
                <th className="px-4 py-2 text-right">Xəta</th>
                <th className="px-4 py-2">Mövcud sorğu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((group) => (
                <tr key={`${group.locationId}-${group.period}`}>
                  <td className="px-4 py-2 font-medium text-slate-900">{group.locationName}</td>
                  <td className="px-4 py-2 text-slate-700">{formatPeriod(group.period)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{group.rowCount}</td>
                  {/* Task 2's words over the group's included rows. `unpricedRows` also counts excluded rows,
                      so it is neither shown here nor subtracted from these. */}
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      group.missingPriceRows > 0 ? `font-medium ${warningToneClass}` : 'text-slate-400'
                    }`}
                  >
                    {group.missingPriceRows || '—'}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      group.internalSupplyRows > 0 ? internalToneClass : 'text-slate-400'
                    }`}
                  >
                    {group.internalSupplyRows || '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-amber-700">{group.warningCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-700">{group.errorCount}</td>
                  <td className="px-4 py-2 text-slate-700">
                    {group.existingRequest ? (
                      <span className="text-amber-800">Var (versiya {group.latestVersion}) — operator qərarı tələb olunur</span>
                    ) : (
                      <span className="text-slate-500">Yoxdur</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ungroupedRows > 0 && (
        <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
          {ungroupedRows} sətir obyekt və ya tarix müəyyən olunmadığı üçün heç bir qrupa daxil deyil.
        </p>
      )}
    </section>
  )
}
