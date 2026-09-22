import type { ImportPreview, ImportStatus, SheetDetection } from '../../api/imports'
import { IssueBadge } from './IssueBadge'
import { columnLabels, importStatusLabels, severityLabels } from './labels'

const statusStyles: Record<ImportStatus, string> = {
  Uploaded: 'bg-slate-100 text-slate-700',
  Parsing: 'bg-slate-100 text-slate-700',
  Validating: 'bg-slate-100 text-slate-700',
  NeedsReview: 'bg-amber-100 text-amber-800',
  ReadyToImport: 'bg-emerald-100 text-emerald-800',
  Imported: 'bg-emerald-100 text-emerald-800',
  Failed: 'bg-red-100 text-red-700',
}

interface ImportSummaryProps {
  preview: ImportPreview
  sheets: SheetDetection[] | null
}

export function ImportSummary({ preview, sheets }: ImportSummaryProps) {
  const { batch, issueSummary } = preview

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">İmport #{batch.id}</p>
          <p className="truncate font-medium text-slate-900">{batch.fileName}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${statusStyles[batch.status]}`}>
          {importStatusLabels[batch.status]}
        </span>
      </div>

      {batch.failureReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{batch.failureReason}</div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Cəmi sətir" value={batch.totalRows} tone="text-slate-900" />
        <SummaryCard label="Düzgün" value={batch.validRows} tone="text-emerald-700" />
        <SummaryCard label="Xəbərdarlıq" value={batch.warningRows} tone="text-amber-700" />
        <SummaryCard label="Xəta" value={batch.invalidRows} tone="text-red-700" />
      </div>

      {sheets && sheets.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Vərəqlər</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {sheets.map((sheet) => (
              <li key={sheet.sheetName}>
                <span className="font-medium text-slate-800">{sheet.sheetName}</span>:{' '}
                {sheet.headerRowNumber !== null
                  ? `başlıq ${sheet.headerRowNumber}-cü sətirdə, ${sheet.dataRows} məlumat sətri`
                  : `idxal olunmadı${
                      sheet.missingRequiredColumns.length > 0
                        ? ` (çatışmayan sütunlar: ${sheet.missingRequiredColumns.map((c) => columnLabels[c] ?? c).join(', ')})`
                        : sheet.problem
                          ? ` (${sheet.problem})`
                          : ''
                    }`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-900">Problemlərin xülasəsi</h2>
        {issueSummary.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Problem tapılmadı.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {issueSummary.map((issue) => (
              <li
                key={`${issue.issueType}-${issue.severity}`}
                className="flex items-center justify-between gap-2 rounded border border-slate-100 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <IssueBadge issueType={issue.issueType} severity={issue.severity} />
                  <span className="text-xs text-slate-500">{severityLabels[issue.severity]}</span>
                </span>
                <span className="font-medium tabular-nums text-slate-900">{issue.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}
