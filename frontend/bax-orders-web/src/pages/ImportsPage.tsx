import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  fetchImport,
  uploadImport,
  type ImportConfirmationResult,
  type ImportPreview,
  type SheetDetection,
} from '../api/imports'
import { PageHeader } from '../components/PageHeader'
import { FileDropZone } from '../components/imports/FileDropZone'
import { ImportGroupsTable } from '../components/imports/ImportGroupsTable'
import { ImportRowsTable } from '../components/imports/ImportRowsTable'
import { ImportSummary } from '../components/imports/ImportSummary'
import { formatNumber } from '../components/imports/labels'
import { ConfirmationDialog } from '../components/imports/review/ConfirmationDialog'
import { ReviewCenter } from '../components/imports/review/ReviewCenter'

type Phase = 'idle' | 'uploading' | 'processing'

interface UploadProblem {
  message: string
  duplicate: boolean
}

export function ImportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const importId = Number(searchParams.get('id')) || null

  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [problem, setProblem] = useState<UploadProblem | null>(null)
  const [sheets, setSheets] = useState<SheetDetection[] | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)

  // Bumped after every review decision so the row preview reloads with the new matches.
  const [reviewVersion, setReviewVersion] = useState(0)
  const [imported, setImported] = useState<ImportConfirmationResult | null>(null)

  // The import id lives in the URL, so a refresh or a duplicate link shows the stored preview.
  useEffect(() => {
    if (importId === null) {
      setPreview(null)
      return
    }

    const controller = new AbortController()
    fetchImport(importId, controller.signal)
      .then(setPreview)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProblem({ message: error instanceof Error ? error.message : 'Naməlum xəta', duplicate: false })
        }
      })
    return () => controller.abort()
  }, [importId])

  const busy = phase !== 'idle'

  async function handleUpload() {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setProblem({ message: 'Yalnız .xlsx və .xls faylları qəbul edilir.', duplicate: false })
      return
    }

    setProblem(null)
    setSheets(null)
    setPhase('uploading')

    try {
      const response = await uploadImport(file, () => setPhase('processing'))
      setPreview(response.preview)
      setSheets(response.sheets)
      setFile(null)
      setSearchParams({ id: String(response.preview.batch.id) })
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null
      const importBatchId = apiError?.problem?.importBatchId
      const problemSheets = apiError?.problem?.sheets

      setProblem({
        message: error instanceof Error ? error.message : 'Naməlum xəta',
        duplicate: apiError?.status === 409,
      })
      setSheets(Array.isArray(problemSheets) ? (problemSheets as SheetDetection[]) : null)
      if (typeof importBatchId === 'number') {
        setSearchParams({ id: String(importBatchId) })
      }
    } finally {
      setPhase('idle')
    }
  }

  const issueTypes = [...new Set(preview?.issueSummary.map((issue) => issue.issueType) ?? [])]

  return (
    <>
      <PageHeader
        title="Excel importları"
        description="Faylı yükləyin: sətirlər oxunur, yoxlanılır və önizləmə göstərilir. Bu mərhələdə sorğu yaradılmır."
      />

      <div className="space-y-6">
        <section className="space-y-3">
          <FileDropZone
            file={file}
            disabled={busy}
            onFileSelected={(selected) => {
              setFile(selected)
              setProblem(null)
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!file || busy}
              onClick={handleUpload}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Yüklə və yoxla
            </button>
            {busy && (
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {phase === 'uploading' ? 'Fayl yüklənir…' : 'Fayl oxunur və yoxlanılır…'}
              </span>
            )}
          </div>

          {problem && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                problem.duplicate ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {problem.duplicate && <p className="font-medium">Bu fayl artıq yüklənib.</p>}
              <p>{problem.message}</p>
            </div>
          )}
        </section>

        {preview && (
          <>
            <ImportSummary preview={preview} sheets={sheets} />
            {preview.batch.totalRows > 0 && (
              <>
                <ImportGroupsTable groups={preview.groups} ungroupedRows={preview.ungroupedRows} />
                <ReviewCenter
                  importId={preview.batch.id}
                  onResolved={(result) => {
                    setPreview(result.preview)
                    setReviewVersion((current) => current + 1)
                  }}
                />
                <ImportRowsTable
                  key={`${preview.batch.id}-${reviewVersion}`}
                  importId={preview.batch.id}
                  issueTypes={issueTypes}
                />
              </>
            )}
            <ImportConfirmationSection
              preview={preview}
              onImported={(result) => {
                setImported(result)
                setReviewVersion((current) => current + 1)
              }}
              imported={imported}
            />
          </>
        )}
      </div>
    </>
  )
}

/**
 * The last step of an import. The action appears only while the batch is ready; once it is imported the
 * section becomes the result, with the warnings still visible instead of a plain green tick.
 */
function ImportConfirmationSection({
  preview,
  imported,
  onImported,
}: {
  preview: ImportPreview
  imported: ImportConfirmationResult | null
  onImported: (result: ImportConfirmationResult) => void
}) {
  const [open, setOpen] = useState(false)
  const status = imported?.batchStatus ?? preview.batch.status

  if (status === 'Imported' || imported) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="text-sm font-medium text-emerald-900">İdxal tamamlandı</h2>
        {imported ? (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <Detail label="Yaradılan sifariş" value={formatNumber(imported.createdRequests)} />
              <Detail label="Yaradılan sətir" value={formatNumber(imported.createdItems)} />
              <Detail label="İdxal edilməyən qrup" value={formatNumber(imported.skippedGroups)} />
              <Detail label="İdxal edilməyən sətir" value={formatNumber(imported.skippedRows)} />
              <Detail label="Qiyməti olmayan" value={formatNumber(imported.missingPriceItems)} />
              <Detail label="Mümkün təkrar" value={formatNumber(imported.possibleDuplicateItems)} />
              <Detail label="Təchizatçısız" value={formatNumber(imported.missingSupplierItems)} />
              <Detail label="Müddət" value={`${formatNumber(imported.durationMilliseconds)} ms`} />
            </dl>
            <p className="mt-2 text-xs text-emerald-900">
              Xəbərdarlıqlar yox olmayıb: qiymətsiz sətirlər qiymətsiz, mümkün təkrarlar ayrı-ayrı sətir olaraq
              qalır. Sifariş siyahıları növbəti mərhələdə əlavə olunacaq.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-emerald-900">Bu idxal artıq sifarişlərə çevrilib.</p>
        )}
      </section>
    )
  }

  if (status !== 'ReadyToImport') {
    return (
      <p className="text-xs text-slate-500">
        İdxalı təsdiqləmək üçün bütün bloklayıcı uyğunsuzluqlar həll olunmalıdır.
      </p>
    )
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-emerald-900">İdxal hazırdır</h2>
        <p className="mt-0.5 text-xs text-emerald-900">
          Baxış bitdi. Növbəti addım staging sətirlərindən real sifarişlər yaratmaqdır.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        İdxalı təsdiqlə
      </button>

      {open && (
        <ConfirmationDialog
          importId={preview.batch.id}
          onClose={() => setOpen(false)}
          onImported={(result) => {
            setOpen(false)
            onImported(result)
          }}
        />
      )}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-emerald-800">{label}</dt>
      <dd className="font-medium text-emerald-950">{value}</dd>
    </div>
  )
}
