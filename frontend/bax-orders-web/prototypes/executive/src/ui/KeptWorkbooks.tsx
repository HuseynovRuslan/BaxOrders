import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleCheck, Download, FileSpreadsheet, History, X } from 'lucide-react'
import { quantity } from '../lib/format'
import { saveExcel } from './backupDownload'
import { callApi, ErrorBox, KeyField, keyRequired, Outcome, ReopenButton, when, type Answer } from './ImportButton'

/*
 * «Yüklənmiş Excel faylları» (owner, 2026-11-25): every workbook ever uploaded is kept on the server for good, and each
 * can be downloaded as it was uploaded or brought back as the site's figures. Both ask for the Rəhbər's code: the file
 * carries what the site never shows («Cavabdeh şəxs»), and bringing one back changes the figures for everyone. Bringing
 * back is an upload of that file — checked first, applied only on «Təsdiq et», undone by «Geri qaytar».
 */

const api = `${import.meta.env.BASE_URL}api/`

export interface KeptWorkbook {
  id: string
  file: string
  /** When it was uploaded, in Baku time. */
  at: string
  size: number
  /** Noted when it came in; null for a workbook uploaded before notes were kept. */
  lines: number | null
  years: number[] | null
  /** The site's figures came from it. */
  current: boolean
}

type ListState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; items: KeptWorkbook[] }

/** «2022–2026», or the years one by one when one is missing. */
export function yearsLabel(years: readonly number[]): string {
  if (years.length === 0) return ''
  const contiguous = years.every((year, index) => index === 0 || year === years[index - 1] + 1)
  return contiguous && years.length > 1 ? `${years[0]}–${years.at(-1)}` : years.join(', ')
}

const sizeLabel = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`

export function KeptWorkbooks({ editsSince }: { editsSince: number }) {
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [chosen, setChosen] = useState<{ item: KeptWorkbook; action: 'download' | 'restore' } | null>(null)

  useEffect(() => {
    let live = true
    fetch(`${api}history`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!live) return
        if (response.ok && body?.ok) setList({ kind: 'ready', items: body.workbooks as KeptWorkbook[] })
        else setList({ kind: 'error', message: (body?.error as string | undefined) ?? `Server cavab vermədi (${response.status}).` })
      })
      .catch(() => { if (live) setList({ kind: 'error', message: 'Serverə qoşulmaq olmadı.' }) })
    return () => { live = false }
  }, [])

  return (
    <section aria-labelledby="kept-title" className="flex flex-col gap-2 border-t border-(--x-line) pt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 id="kept-title" className="flex items-center gap-2 font-semibold text-(--x-ink-2)">
          <History aria-hidden="true" className="size-4" />
          Yüklənmiş Excel faylları{list.kind === 'ready' ? ` (${list.items.length})` : ''}
        </h3>
        <p className="text-xs text-(--x-muted)">Hər fayl serverdə saxlanır. Endirmək və geri qaytarmaq üçün Rəhbər kodu lazımdır.</p>
      </div>
      {list.kind === 'loading' && <p className="text-(--x-muted)">Siyahı yüklənir…</p>}
      {list.kind === 'error' && <p role="alert" className="text-(--x-danger)">Faylların siyahısı alınmadı: {list.message}</p>}
      {list.kind === 'ready' && list.items.length === 0 && <p className="text-(--x-muted)">Serverdə hələ saxlanmış Excel faylı yoxdur.</p>}
      {list.kind === 'ready' && list.items.length > 0 && (
        <ol aria-label="Yüklənmiş Excel faylları" className="flex max-h-80 flex-col divide-y divide-(--x-line) overflow-y-auto rounded-lg border border-(--x-line)">
          {list.items.map((item) => (
            <li key={item.id} data-kept={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
              <FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-(--x-muted)" />
              <div className="min-w-0 flex-1 basis-64">
                <p className="break-all font-semibold">{item.file}</p>
                <p className="tnum text-[13px] text-(--x-ink-2)">
                  {when(item.at, item.at)}
                  {item.lines !== null && ` · ${quantity(item.lines)} sətir`}
                  {item.years && item.years.length > 0 && ` · ${yearsLabel(item.years)}`}
                  {` · ${sizeLabel(item.size)}`}
                </p>
                {item.current && (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-(--x-prev-soft) px-2.5 py-0.5 text-[12.5px] font-semibold text-(--x-prev-ink)">
                    <CircleCheck aria-hidden="true" className="size-3.5" />
                    Saytdakı rəqəmlər bu fayldandır{editsSince > 0 ? ` (sonra saytda ${editsSince} dəyişiklik)` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setChosen({ item, action: 'download' })}
                  aria-label={`Endir: ${item.file}, ${when(item.at, item.at)}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-(--x-line-2) bg-(--x-surface) px-3 text-sm font-semibold hover:bg-(--x-band)"
                >
                  <Download aria-hidden="true" className="size-4" />Endir
                </button>
                {!(item.current && editsSince === 0) && (
                  <button
                    type="button"
                    onClick={() => setChosen({ item, action: 'restore' })}
                    aria-label={`Bu versiyaya qayıt: ${item.file}, ${when(item.at, item.at)}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-(--x-link) px-3 text-sm font-semibold text-(--x-link) hover:bg-(--x-band)"
                  >
                    <History aria-hidden="true" className="size-4" />Bu versiyaya qayıt
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {chosen && <KeptDialog key={`${chosen.item.id}-${chosen.action}`} item={chosen.item} action={chosen.action} onClose={() => setChosen(null)} />}
    </section>
  )
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; step: 'check' | 'apply' | 'download' }
  | { kind: 'error'; message: string; details: string[] }
  | { kind: 'checked'; answer: Answer }
  | { kind: 'done'; answer: Answer }
  | { kind: 'downloaded' }

/** The workbook as it was uploaded, with the Rəhbər's code; the server's reason in words when it says no. */
async function download(item: KeptWorkbook, code: string, key: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`${api}history/excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Import-Key': key } : {}) },
      body: JSON.stringify({ id: item.id, code }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      return { ok: false, message: (body?.error as string | undefined) ?? `Server cavab vermədi (${response.status}).` }
    }
    saveExcel(new Uint8Array(await response.arrayBuffer()), item.file)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Serverə qoşulmaq olmadı.' }
  }
}

function KeptDialog({ item, action, onClose }: { item: KeptWorkbook; action: 'download' | 'restore'; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [code, setCode] = useState('')
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const busy = status.kind === 'busy'

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const closed = () => onClose()
    element?.addEventListener('close', closed)
    return () => element?.removeEventListener('close', closed)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => dialog.current?.close()
  const edited = (value: string) => { setCode(value); if (status.kind === 'error' || status.kind === 'checked') setStatus({ kind: 'idle' }) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || status.kind === 'done' || status.kind === 'downloaded') return
    if (action === 'download') {
      setStatus({ kind: 'busy', step: 'download' })
      const result = await download(item, code, key)
      setStatus(result.ok ? { kind: 'downloaded' } : { kind: 'error', message: result.message, details: [] })
      return
    }
    const step = status.kind === 'checked' ? 'apply' : 'check'
    setStatus({ kind: 'busy', step })
    const result = await callApi('history/restore', step, key, {
      base: status.kind === 'checked' ? status.answer.base : undefined,
      body: JSON.stringify({ id: item.id, code }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (result.ok) setStatus({ kind: step === 'check' ? 'checked' : 'done', answer: result.body as Answer })
    else setStatus({ kind: 'error', message: result.message, details: result.details })
  }

  const title = action === 'download' ? 'Excel faylını endir' : 'Bu versiyaya qayıt'
  const finished = status.kind === 'done' || status.kind === 'downloaded'
  const submitLabel = action === 'download'
    ? 'Endir'
    : status.kind === 'checked' || (status.kind === 'busy' && status.step === 'apply') ? 'Təsdiq et və qayıt' : 'Yoxla'

  return (
    <dialog
      ref={dialog}
      aria-labelledby="kept-dialog-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop:bg-[rgb(6_14_24/0.55)]"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="kept-dialog-title" className="text-lg font-bold leading-snug">{title}</h2>
          <button type="button" onClick={close} aria-label="Bağla" className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-stone-2 hover:text-ink">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg bg-stone-2/60 px-4 py-3 text-sm">
          <dt className="text-ink-2">Fayl</dt>
          <dd className="break-all font-semibold text-ink">{item.file}</dd>
          <dt className="text-ink-2">Yüklənib</dt>
          <dd className="tnum text-ink">{when(item.at, item.at)}</dd>
          {(item.lines !== null || (item.years && item.years.length > 0)) && (
            <>
              <dt className="text-ink-2">Məzmun</dt>
              <dd className="tnum text-ink">{[item.lines !== null ? `${quantity(item.lines)} sətir` : '', item.years ? yearsLabel(item.years) : ''].filter(Boolean).join(' · ')}</dd>
            </>
          )}
        </dl>

        {!finished && status.kind !== 'checked' && (
          <>
            <p className="text-sm leading-relaxed text-ink-2">
              {action === 'download'
                ? 'Fayl yükləndiyi kimi endirilir. Onda sayt göstərmədiyi sütunlar da var («Cavabdeh şəxs»), ona görə Rəhbər kodu soruşulur.'
                : 'Saytdakı rəqəmlər bu faylın rəqəmləri ilə əvəz olunacaq — hamı üçün. Əvvəl yoxlanır və nəyin dəyişəcəyi göstərilir; rəqəmlər yalnız «Təsdiq et»-dən sonra dəyişir. Sonra «Geri qaytar» ilə indiki rəqəmlərə qayıtmaq olar.'}
            </p>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Rəhbər kodu
              <input
                type="password"
                required
                autoComplete="off"
                name="kept-rehber-code"
                value={code}
                onChange={(event) => edited(event.target.value)}
                className="h-10 rounded-lg border border-line px-3 font-normal tracking-[0.2em]"
              />
            </label>
            {keyRequired && <KeyField value={key} onChange={setKey} />}
          </>
        )}

        <div aria-live="polite">
          {status.kind === 'busy' && (
            <p className="text-sm text-ink-2">{status.step === 'download' ? 'Endirilir…' : status.step === 'check' ? 'Yoxlanılır…' : 'Qaytarılır…'}</p>
          )}
          {status.kind === 'error' && <ErrorBox message={status.message} details={status.details} />}
          {status.kind === 'checked' && <Outcome answer={status.answer} action="restore" done={false} />}
          {status.kind === 'done' && <Outcome answer={status.answer} action="restore" done />}
          {status.kind === 'downloaded' && (
            <p className="inline-flex items-start gap-1.5 text-sm text-ink-2">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-down" />
              <span className="min-w-0 break-all">Endirildi: «{item.file}».</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {status.kind === 'done' ? (
            <ReopenButton />
          ) : status.kind === 'downloaded' ? (
            <button type="button" onClick={close} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">Bağla</button>
          ) : (
            <>
              <button
                type="button"
                onClick={status.kind === 'checked' ? () => setStatus({ kind: 'idle' }) : close}
                disabled={busy}
                className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-stone-2 disabled:opacity-50"
              >
                {status.kind === 'checked' ? 'Geri' : 'Ləğv et'}
              </button>
              <button type="submit" disabled={busy || !code.trim() || (keyRequired && !key)} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50">
                {submitLabel}
              </button>
            </>
          )}
        </div>
      </form>
    </dialog>
  )
}
