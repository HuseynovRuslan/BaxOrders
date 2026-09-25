import { useEffect, useState } from 'react'
import {
  applyCorrection,
  clearCorrection,
  excludeRow,
  fetchRow,
  includeRow,
  revertCorrection,
  type CorrectionField,
  type ImportRowDetail,
  type RowCorrectionResult,
} from '../../../api/rows'
import {
  formatDate,
  formatNumber,
  formatPeriod,
  issueTypeLabels,
  rowStatusLabels,
  severityLabels,
  unitlessOrderUnitLabel,
} from '../labels'
import { Modal } from './Modal'

interface RowDetailDialogProps {
  importId: number
  rowId: number
  onClose: () => void
  onChanged: (result: RowCorrectionResult) => void
}

/**
 * One staged row, field by field: what Excel holds, what the operator corrected and what the importer works with.
 * The Excel column is always shown, so a correction can never look like the workbook's own value.
 */
export function RowDetailDialog({ importId, rowId, onClose, onChanged }: RowDetailDialogProps) {
  const [row, setRow] = useState<ImportRowDetail | null>(null)
  const [editing, setEditing] = useState<CorrectionField | null>(null)
  const [draft, setDraft] = useState('')
  const [reason, setReason] = useState('')
  const [askExclude, setAskExclude] = useState(false)
  const [askClear, setAskClear] = useState<CorrectionField | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchRow(importId, rowId, controller.signal)
      .then(setRow)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId, rowId])

  async function run(action: () => Promise<RowCorrectionResult>) {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      setRow(result.row)
      setEditing(null)
      setAskExclude(false)
      setAskClear(null)
      setReason('')
      onChanged(result)
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={row ? `Sətir ${row.rowNumber} · ${row.sheetName}` : 'Sətir'}
      subtitle={
        row
          ? `${rowStatusLabels[row.status]}${row.isExcluded ? ' · importdan çıxarılıb' : ''}${
              row.correctionCount > 0 ? ` · ${row.correctionCount} düzəliş` : ''
            }`
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            Bağla
          </button>
          {row?.isExcluded ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => includeRow(importId, rowId))}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Yenidən importa daxil et
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !row}
              onClick={() => setAskExclude(true)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Bu sətri importdan çıxar
            </button>
          )}
        </>
      }
    >
      {row === null && !error && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}

      {row?.isExcluded && (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          Importdan çıxarılıb: {row.exclusionReason}
          {row.excludedAtUtc && ` · ${formatDate(row.excludedAtUtc.slice(0, 10))}`}
        </p>
      )}

      {askExclude && (
        <div className="mb-3 space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
          <p className="text-red-900">
            Mənbə sətri silinmir. O, yalnız gələcək sifariş importundan kənarda saxlanılır və bütün dəyərləri ilə
            görünməyə davam edir.
          </p>
          <label className="block text-slate-700">
            Səbəb (məcburidir)
            <input
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="məs. anbar sətridir, sifariş deyil"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || reason.trim().length === 0}
              onClick={() => run(() => excludeRow(importId, rowId, reason.trim()))}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Importdan çıxar
            </button>
            <button type="button" onClick={() => setAskExclude(false)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs">
              Ləğv et
            </button>
          </div>
        </div>
      )}

      {askClear && (
        <div className="mb-3 space-y-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm">
          <p className="text-sky-900">
            Bu sətirdə sifariş vahidi tələb olunmur. Mənbə dəyəri silinmir; yalnız import üçün bu xana qəsdən
            vahidsiz kimi qəbul edilir.
          </p>
          <p className="text-xs text-sky-800">
            Bu, «vahid unudulub» demək deyil — baxılmamış boş xana sətri bloklamağa davam edir.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => clearCorrection(importId, rowId, askClear))}
              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              Qəsdən boş kimi qeyd et
            </button>
            <button type="button" onClick={() => setAskClear(null)} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs">
              Ləğv et
            </button>
          </div>
        </div>
      )}

      {row && (
        <>
          <table className="w-full table-fixed text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="w-32 pb-1 font-medium">Sahə</th>
                <th className="pb-1 font-medium">Excel dəyəri</th>
                <th className="pb-1 font-medium">Düzəliş</th>
                <th className="pb-1 font-medium">Effektiv dəyər</th>
                <th className="w-28 pb-1" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {row.fields.map((field) => (
                <tr key={field.field} className="align-top">
                  <td className="py-1.5 pr-2 text-xs text-slate-600">
                    {field.column}
                    {field.storedAsDate && <span className="ml-1 text-amber-700" title="Excel bu xananı tarixə çevirib">⚠</span>}
                  </td>
                  <td className="py-1.5 pr-2 break-words text-slate-500">{field.sourceValue ?? '—'}</td>
                  <td className="py-1.5 pr-2 break-words">
                    {editing === field.field ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      <span className={field.isCorrected ? 'text-emerald-800' : 'text-slate-400'}>
                        {field.isIntentionallyEmpty ? 'qəsdən boş' : (field.correctedValue ?? '—')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 break-words font-medium text-slate-900">{field.effectiveValue ?? '—'}</td>
                  <td className="py-1.5 text-right">
                    {editing === field.field ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={busy || draft.trim().length === 0}
                          onClick={() => run(() => applyCorrection(importId, rowId, field.field, draft.trim()))}
                          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          Saxla
                        </button>
                        <button type="button" onClick={() => setEditing(null)} className="rounded border border-slate-200 px-2 py-1 text-xs">
                          Ləğv
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditing(field.field)
                            setDraft(field.effectiveValue ?? '')
                          }}
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Düzəlt
                        </button>
                        {clearableFields.includes(field.field) && !field.isIntentionallyEmpty && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setAskClear(field.field)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Qəsdən boş
                          </button>
                        )}
                        {field.isCorrected && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => revertCorrection(importId, rowId, field.field))}
                            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
                          >
                            Geri qaytar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            <Fact label="Miqdar" value={row.parsedQuantity === null ? '—' : formatNumber(row.parsedQuantity)} />
            {/* No state word: the row detail does not carry the classification, and «Qiymət yoxdur» would be
                false for a row classified «Daxili təminat». The review's «Qiymət təsnifatı» tab says the state. */}
            <Fact label="Qiymət" value={row.parsedUnitPrice === null ? '—' : formatNumber(row.parsedUnitPrice)} />
            <Fact label="Hesablanmış cəm" value={row.calculatedLineTotal === null ? '—' : formatNumber(row.calculatedLineTotal)} />
            <Fact label="Excel cəmi" value={row.originalLineTotal ?? '—'} />
            <Fact label="Dövr" value={row.parsedRequestPeriod ? formatPeriod(row.parsedRequestPeriod) : '—'} />
            <Fact label="Obyekt" value={row.matches.location ?? 'həll olunmayıb'} />
            <Fact label="Məhsul" value={row.matches.product ?? 'həll olunmayıb'} />
            <Fact label="Variant" value={row.matches.productVariant ?? 'həll olunmayıb'} />
            <Fact label="Ö/v" value={orderUnitFact(row)} />
          </dl>

          {row.issues.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs">
              {row.issues.map((issue, index) => (
                <li key={`${issue.issueType}-${index}`} className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      issue.severity === 'Error'
                        ? 'bg-red-50 text-red-800'
                        : issue.severity === 'Warning'
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {severityLabels[issue.severity]}
                  </span>
                  <span className="font-medium text-slate-800">{issueTypeLabels[issue.issueType]}</span>
                  {issue.fieldName && <span className="text-slate-500">{issue.fieldName}</span>}
                  <span className="text-slate-600">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}

/** Only the order unit may be confirmed empty on purpose; every other cell is either optional or required. */
const clearableFields: CorrectionField[] = ['OrderUnit']

/** "həll olunmayıb" would be wrong for a line that was reviewed and has no unit by decision. */
function orderUnitFact(row: ImportRowDetail): string {
  if (row.matches.orderUnit) return row.matches.orderUnit
  const cell = row.fields.find((field) => field.field === 'OrderUnit')
  return cell?.isIntentionallyEmpty ? unitlessOrderUnitLabel : 'həll olunmayıb'
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  )
}
