import { useEffect, useMemo, useState } from 'react'
import {
  confirmImport,
  fetchConfirmationPreview,
  type ConfirmationGroupDecision,
  type ConfirmationGroupPreview,
  type GroupDecisionAction,
  type ImportConfirmationPreview,
  type ImportConfirmationResult,
} from '../../../api/imports'
import {
  classifyBeforeImportHint,
  internalSupplyShortLabel,
  missingPriceShortLabel,
  pricingReviewLinkLabel,
  pricingReviewPath,
  unclassifiedBeforeImportNote,
  unclassifiedLabel,
} from '../../../pricing/labels'
import { formatNumber, formatPeriod } from '../labels'
import { Modal } from './Modal'

const pageSize = 12

interface ConfirmationDialogProps {
  importId: number
  onClose: () => void
  onImported: (result: ImportConfirmationResult) => void
}

type DecisionMap = Record<string, { action: GroupDecisionAction; reason: string }>

const groupKey = (group: ConfirmationGroupPreview) => `${group.locationId}|${group.requestPeriod}`

/**
 * The last screen before staging rows become company orders. It shows what would be created and what is still
 * only a warning, and it never preselects anything for a group that already has an order request.
 */
export function ConfirmationDialog({ importId, onClose, onImported }: ConfirmationDialogProps) {
  const [preview, setPreview] = useState<ImportConfirmationPreview | null>(null)
  const [decisions, setDecisions] = useState<DecisionMap>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchConfirmationPreview(importId, controller.signal)
      .then(setPreview)
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
        }
      })
    return () => controller.abort()
  }, [importId])

  const groups = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('az')
    const all = preview?.groups ?? []
    return needle.length === 0
      ? all
      : all.filter((group) => group.locationName.toLocaleLowerCase('az').includes(needle))
  }, [preview, search])

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize))
  const visible = groups.slice((page - 1) * pageSize, page * pageSize)

  const undecided = (preview?.groups ?? []).filter(
    (group) => group.requiredDecision !== null && decisions[groupKey(group)] === undefined,
  )
  const skipped = Object.values(decisions).filter((decision) => decision.action === 'Skip')
  const skippedGroups = (preview?.groups ?? []).filter((group) => decisions[groupKey(group)]?.action === 'Skip')
  const skippedRows = skippedGroups.reduce((sum, group) => sum + group.sourceRowCount, 0)

  // The price figures after the groups the operator will not import, the way skippedRows is taken: the preview's
  // are before any skip. These are the figures the import writes, and the rise on Qiymət təsnifatı (Task 16).
  const skippedSum = (count: (group: ConfirmationGroupPreview) => number) =>
    skippedGroups.reduce((sum, group) => sum + count(group), 0)
  const missingPrice = (preview?.missingPriceRows ?? 0) - skippedSum((group) => group.missingPriceItemCount)
  const unclassifiedPrice = (preview?.unclassifiedPriceRows ?? 0) - skippedSum((group) => group.unclassifiedPriceItemCount)
  const internalSupply = (preview?.internalSupplyRows ?? 0) - skippedSum((group) => group.internalSupplyItemCount)
  const missingReason = Object.values(decisions).some(
    (decision) => decision.action === 'Skip' && decision.reason.trim().length === 0,
  )

  const requestsToCreate = (preview?.groupCount ?? 0) - skipped.length
  const itemsToCreate = (preview?.rowsToImport ?? 0) - skippedRows
  const ready = preview !== null && preview.canImport && !preview.alreadyImported && undecided.length === 0 && !missingReason

  function decide(group: ConfirmationGroupPreview, action: GroupDecisionAction) {
    setDecisions((current) => ({ ...current, [groupKey(group)]: { action, reason: current[groupKey(group)]?.reason ?? '' } }))
  }

  async function submit() {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const body: ConfirmationGroupDecision[] = Object.entries(decisions).map(([key, decision]) => {
        const [locationId, requestPeriod] = key.split('|')
        return {
          locationId: Number(locationId),
          requestPeriod,
          action: decision.action,
          reason: decision.action === 'Skip' ? decision.reason.trim() : null,
        }
      })

      onImported(await confirmImport(importId, {
        decisions: body,
        expectedRowsToImport: preview.rowsToImport,
        expectedGroupCount: preview.groupCount,
      }))
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Naməlum xəta')
      setBusy(false)
    }
  }

  return (
    <Modal
      title="İdxalı təsdiqlə"
      subtitle={preview ? `${preview.groupCount} qrup · ${preview.rowsToImport} sətir` : undefined}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm">
            Ləğv et
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !ready}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? 'Yaradılır…' : `${formatNumber(requestsToCreate)} sifariş və ${formatNumber(itemsToCreate)} sətir yarat`}
          </button>
        </>
      }
    >
      {preview === null && !error && <p className="py-6 text-center text-sm text-slate-500">Yüklənir…</p>}

      {preview && (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
            <Fact label="Sifarişə çevriləcək sətir" value={formatNumber(preview.rowsToImport)} />
            <Fact label="Yaradılacaq sifariş qrupu" value={formatNumber(preview.groupCount)} />
            <Fact label="İdxaldan çıxarılmış" value={formatNumber(preview.excludedRows)} />
            <Fact label={missingPriceShortLabel} value={formatNumber(missingPrice)} warn={missingPrice > 0} />
            <Fact label={unclassifiedLabel} value={formatNumber(unclassifiedPrice)} warn={unclassifiedPrice > 0} />
            {/* Never amber: nothing is missing about material the company supplies itself. */}
            <Fact label={internalSupplyShortLabel} value={formatNumber(internalSupply)} />
            <Fact label="Mümkün təkrar" value={formatNumber(preview.possibleDuplicateRows)} warn={preview.possibleDuplicateRows > 0} />
            <Fact label="Təchizatçısı məlum olmayan" value={formatNumber(preview.missingSupplierRows)} warn={preview.missingSupplierRows > 0} />
            <Fact label="Vahidsiz xidmət sətri" value={formatNumber(preview.unitlessVariantRows)} />
            <Fact label="Təsvirli spesifikasiya" value={formatNumber(preview.descriptorVariantRows)} />
            <Fact label="Mövcud sifarişi olan qrup" value={formatNumber(preview.existingRequestConflictGroups)} warn={preview.existingRequestConflictGroups > 0} />
          </dl>

          {(missingPrice > 0 || preview.possibleDuplicateRows > 0 || preview.missingSupplierRows > 0) && (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              Bu xəbərdarlıqlar idxalı dayandırmır, amma yox olmur: qiyməti olmayan sətirlər Qiymət təsnifatında
              görünür, mümkün təkrarlar birləşdirilmir və təchizatçısı olmayan sətirlər boş təchizatçı ilə yazılır.
            </p>
          )}

          {unclassifiedPrice > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <p className="font-medium">{unclassifiedBeforeImportNote(unclassifiedPrice)}</p>
              <p className="mt-0.5">
                {classifyBeforeImportHint}{' '}
                {/* A new tab, so the group decisions and skip reasons made here are not lost. */}
                <a href={pricingReviewPath} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-950">
                  {pricingReviewLinkLabel}
                </a>
              </p>
            </div>
          )}

          {undecided.length > 0 && (
            <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {undecided.length} qrupun artıq sifarişi var. Hər biri üçün qərar seçilməyincə idxal başlamır.
            </p>
          )}

          <div>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Obyektə görə axtar…"
              className="mb-2 w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-64"
            />

            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-1 font-medium">Obyekt</th>
                  <th className="pb-1 font-medium">Dövr</th>
                  <th className="pb-1 text-right font-medium">Sətir</th>
                  <th className="pb-1 text-right font-medium">Məbləğ</th>
                  <th className="pb-1 text-right font-medium">{missingPriceShortLabel}</th>
                  <th className="pb-1 text-right font-medium">Təkrar</th>
                  <th className="pb-1 font-medium">Mövcud sifariş</th>
                  <th className="pb-1 font-medium">Versiya</th>
                  <th className="pb-1 font-medium">Qərar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((group) => {
                  const decision = decisions[groupKey(group)]
                  return (
                    <tr key={groupKey(group)} className="align-top">
                      <td className="py-1.5 pr-2 text-slate-900">{group.locationName}</td>
                      <td className="py-1.5 pr-2 text-slate-600">{formatPeriod(group.requestPeriod)}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-700">{formatNumber(group.sourceRowCount)}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-700">
                        {group.knownAmountTotal === null ? '—' : formatNumber(group.knownAmountTotal)}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-slate-500">{group.missingPriceItemCount || '—'}</td>
                      <td className="py-1.5 pr-2 text-right text-slate-500">{group.possibleDuplicateItemCount || '—'}</td>
                      <td className="py-1.5 pr-2">
                        {group.existingRequest ? (
                          <span className="text-amber-800">Mövcud sifariş var ({group.existingVersions})</span>
                        ) : (
                          <span className="text-emerald-800">Yeni sifariş</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-700">
                        {decision?.action === 'Skip'
                          ? '—'
                          : group.existingRequest
                            ? decision?.action === 'CreateNewVersion'
                              ? `Versiya ${(group.latestVersion ?? 0) + 1}`
                              : '—'
                            : `Versiya ${group.proposedVersion ?? 1}`}
                      </td>
                      <td className="py-1.5">
                        {group.requiredDecision === null ? (
                          <span className="text-slate-400">tələb olunmur</span>
                        ) : (
                          <div className="space-y-1">
                            {group.conflictState === 'ExistingRequest' && (
                              <label className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={groupKey(group)}
                                  checked={decision?.action === 'CreateNewVersion'}
                                  onChange={() => decide(group, 'CreateNewVersion')}
                                />
                                Yeni versiya yarat
                              </label>
                            )}
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                name={groupKey(group)}
                                checked={decision?.action === 'Skip'}
                                onChange={() => decide(group, 'Skip')}
                              />
                              Bu qrupu idxal etmə
                            </label>
                            {decision?.action === 'Skip' && (
                              <input
                                value={decision.reason}
                                onChange={(event) =>
                                  setDecisions((current) => ({
                                    ...current,
                                    [groupKey(group)]: { action: 'Skip', reason: event.target.value },
                                  }))
                                }
                                placeholder="Səbəb (məcburidir)"
                                className="w-40 rounded border border-slate-300 px-2 py-1"
                              />
                            )}
                            {group.conflictState === 'ExistingDraft' && (
                              <p className="text-slate-500">Mövcud sifariş hələ təsdiqlənməyib; yeni versiya yaradıla bilməz.</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {groups.length > pageSize && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Səhifə {page} / {totalPages} · {groups.length} qrup
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    Əvvəlki
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
                  >
                    Növbəti
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            Bu əməliyyat staging məlumatlarından real sifarişlər yaradacaq. Mövcud sifarişlər səssiz şəkildə
            dəyişdirilməyəcək.
          </p>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </Modal>
  )
}

function Fact({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={warn ? 'font-medium text-amber-800' : 'text-slate-900'}>{value}</dd>
    </div>
  )
}
