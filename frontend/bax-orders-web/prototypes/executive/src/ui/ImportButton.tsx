import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Upload, X } from 'lucide-react'
import { money, monthName, signedMoney } from '../lib/format'

/**
 * «Excel yüklə» (owner, 2026-10-28): the owner uploads the workbook and the site's figures change for everyone — in
 * two steps, so a wrong file is seen before it counts. «Yoxla» reads the file on the server and says what would
 * change, month by month (a month that would disappear in red); nothing changes until «Təsdiq et». «Geri qaytar»
 * takes the last change back — an import or an edit made in «Mallar» — checked and confirmed the same way. The server
 * refuses a file that does not hang together, with the rows to look at. The site has no login, so every step asks
 * for the import key.
 */

/** On the server's build (VITE_IMPORT=on) and in development; a copy with no import service shows no button. */
export const importEnabled = import.meta.env.DEV || import.meta.env.VITE_IMPORT === 'on'
/** The owner asked for no password (2026-10-28): the server's build has VITE_IMPORT_KEY=off, and its service no key. */
export const keyRequired = import.meta.env.VITE_IMPORT_KEY !== 'off'
const api = `${import.meta.env.BASE_URL}api/`

interface Report {
  file: string
  lines: number
  objects: number
  months: Record<string, { monthly: number; outside: number }>
  freeLines: number
  missingPrice: number
  mismatchedTotals: number
}
interface Moved { month: number; monthName: string; kind: 'monthly' | 'outside'; before: number; after: number }
export interface Changes { linesBefore: number; linesAfter: number; moved: Moved[] }
interface Version { source: string | null; importedAt: string | null; edits: number; lastEdit: { at: string; text: string } | null }
/** The server's answer to a check or an apply: an import carries the report, an undo the two versions. */
interface Answer { ok: true; mode: 'check' | 'apply'; base?: string; report?: Report; changes: Changes; current?: Version; restore?: Version; editsLost?: number }

/** One step against the import service: the key, the check's fingerprint on an apply, and the answer or why not. */
export async function callApi(path: 'import' | 'undo' | 'catalog', step: 'check' | 'apply', key: string, init: { body?: BodyInit | null; headers?: Record<string, string>; base?: string } = {}) {
  const headers: Record<string, string> = { ...(key ? { 'X-Import-Key': key } : {}), ...init.headers }
  if (init.base) headers['X-Base'] = init.base
  try {
    const response = await fetch(`${api}${path}${step === 'check' ? '?mode=check' : ''}`, { method: 'POST', headers, body: init.body ?? null })
    const body = await response.json().catch(() => null)
    if (response.ok && body?.ok) return { ok: true as const, body }
    return { ok: false as const, message: (body?.error as string | undefined) ?? `Server cavab vermədi (${response.status}). Rəqəmlər dəyişmədi.`, details: (body?.details as string[] | undefined) ?? [] }
  } catch {
    return { ok: false as const, message: 'Serverə qoşulmaq olmadı. Rəqəmlər dəyişmədi.', details: [] }
  }
}

type Action = 'import' | 'undo'
type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; step: 'check' | 'apply' }
  | { kind: 'error'; message: string; details: string[] }
  | { kind: 'checked'; answer: Answer }
  | { kind: 'done'; answer: Answer }

export function ImportButton() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [action, setAction] = useState<Action>('import')
  const [file, setFile] = useState<File | null>(null)
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const busy = status.kind === 'busy'

  const open = () => {
    setStatus({ kind: 'idle' })
    dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()
  // A check holds for the file, the key and the action it was made with: any change, and it is made again.
  const reset = () => setStatus({ kind: 'idle' })
  const choose = (next: Action) => { setAction(next); reset() }

  async function call(step: 'check' | 'apply', base?: string) {
    setStatus({ kind: 'busy', step })
    const upload = action === 'import' && file
    const result = await callApi(action, step, key, {
      base,
      body: upload ? file : null,
      headers: upload ? { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) } : {},
    })
    if (result.ok) setStatus({ kind: step === 'check' ? 'checked' : 'done', answer: result.body as Answer })
    else setStatus({ kind: 'error', message: result.message, details: result.details })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (status.kind === 'checked') void call('apply', status.answer.base)
    else void call('check')
  }

  const ready = (!keyRequired || Boolean(key)) && (action === 'undo' || Boolean(file))
  const title = action === 'import' ? 'Excel faylını yüklə' : 'Son dəyişikliyi geri qaytar'

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-2 bg-paper px-3 text-xs font-semibold text-ink transition-colors hover:bg-stone-2"
      >
        <Upload aria-hidden="true" className="size-3.5" />
        <span className="hidden sm:inline">Excel yüklə</span>
        <span className="sm:hidden">Yüklə</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="import-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop:bg-ink/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="import-title" className="text-lg font-bold leading-snug">{title}</h2>
            <button type="button" onClick={close} aria-label="Bağla" className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-stone-2 hover:text-ink">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {status.kind !== 'done' && (
            <div role="group" aria-label="Əməliyyat" className="grid grid-cols-2 rounded-lg border border-line p-1 text-sm font-semibold">
              {(['import', 'undo'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={action === item}
                  disabled={busy}
                  onClick={() => choose(item)}
                  className={`min-h-9 rounded-md px-3 transition-colors ${action === item ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-stone-2'}`}
                >
                  {item === 'import' ? 'Yeni Excel' : 'Geri qaytar'}
                </button>
              ))}
            </div>
          )}

          {status.kind !== 'done' && (
            <p className="text-sm leading-relaxed text-ink-2">
              {action === 'import'
                ? 'Sifariş kitabı (.xlsx): «Aylıq» vərəqi və ay adlı vərəqlər, məsələn «Oktyabr», oxunur. Əvvəl yoxlanır və nəyin dəyişəcəyi göstərilir; rəqəmlər yalnız «Təsdiq et»-dən sonra, hamı üçün dəyişir.'
                : 'Son dəyişiklik — Excel importu və ya «Mallar»-da edilən düzəliş — ləğv olunur və ondan əvvəlki rəqəmlər bərpa edilir. Əvvəl nəyin dəyişəcəyi göstərilir; rəqəmlər yalnız «Təsdiq et»-dən sonra dəyişir.'}
            </p>
          )}

          {status.kind !== 'done' && status.kind !== 'checked' && (
            <>
              {action === 'import' && (
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  Fayl
                  <input
                    type="file"
                    required
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => { setFile(event.target.files?.[0] ?? null); reset() }}
                    className="rounded-lg border border-line p-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-stone-2 file:px-3 file:py-1.5 file:font-semibold file:text-ink"
                  />
                </label>
              )}
              {keyRequired && <KeyField value={key} onChange={(value) => { setKey(value); reset() }} />}
            </>
          )}

          <div aria-live="polite">
            {status.kind === 'busy' && (
              <p className="text-sm text-ink-2">{status.step === 'check' ? 'Yoxlanılır…' : action === 'import' ? 'Yüklənir…' : 'Geri qaytarılır…'}</p>
            )}
            {status.kind === 'error' && <ErrorBox message={status.message} details={status.details} />}
            {status.kind === 'checked' && <Outcome answer={status.answer} action={action} done={false} />}
            {status.kind === 'done' && <Outcome answer={status.answer} action={action} done />}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {status.kind === 'done' ? (
              <ReopenButton />
            ) : (
              <>
                <button
                  type="button"
                  onClick={status.kind === 'checked' ? reset : close}
                  disabled={busy}
                  className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-stone-2 disabled:opacity-50"
                >
                  {status.kind === 'checked' ? 'Geri' : 'Ləğv et'}
                </button>
                <button type="submit" disabled={busy || !ready} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50">
                  {status.kind === 'checked' || (status.kind === 'busy' && status.step === 'apply')
                    ? action === 'import' ? 'Təsdiq et və yüklə' : 'Təsdiq et və geri qaytar'
                    : 'Yoxla'}
                </button>
              </>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}

export function KeyField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      İmport parolu
      <input
        type="password"
        required
        name="import-key"
        autoComplete="current-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-line px-3 font-normal"
      />
    </label>
  )
}

export function ErrorBox({ message, details }: { message: string; details: string[] }) {
  return (
    <div role="alert" className="rounded-lg border border-up/30 bg-up-soft px-4 py-3 text-sm text-ink">
      <p className="font-semibold text-up">{message}</p>
      {details.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          {details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      )}
    </div>
  )
}

export function ReopenButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">
      Yeni rəqəmlərlə aç
    </button>
  )
}

/** «28 oktyabr 2026, 10:48» from the server's Baku time. */
export function when(at: string | null | undefined, fallback = '') {
  const parts = at?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/)
  if (!parts) return fallback
  return `${Number(parts[3])} ${monthName(Number(parts[2])).toLocaleLowerCase('az')} ${parts[1]}, ${parts[4]}`
}

/** What a version is, in the owner's words: its last edit on the site, or the workbook it came from. */
function describe(version: Version) {
  if (version.lastEdit) return `saytda dəyişiklik — ${version.lastEdit.text} (${when(version.lastEdit.at)})`
  return `«${version.source}» — ${when(version.importedAt, 'ilk fayl, 17 oktyabr 2026')}`
}

/**
 * Every month whose figure moves — a month that would go to nothing in red, as it would disappear from the site — and
 * the line count when it changes: for a check, what would happen; after an apply, what did.
 */
export function ChangeLines({ changes, done }: { changes: Changes; done: boolean }) {
  return (
    <div>
      <p className="font-semibold text-ink">{done ? 'Nə dəyişdi' : 'Təsdiq etsəniz nə dəyişəcək'}</p>
      {changes.moved.length === 0 ? (
        <p className="text-ink-2">Heç bir ayın məbləği dəyişmir.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {changes.moved.map((item) => (
            <li key={`${item.month}-${item.kind}`} className={`tnum ${item.before > 0 && item.after === 0 ? 'font-semibold text-up' : 'text-ink-2'}`}>
              {item.monthName}, {item.kind === 'monthly' ? 'aylıq' : 'aylıqdan kənar'}: {money(item.before)} → <b className="text-ink">{money(item.after)}</b> ({signedMoney(item.after - item.before)})
              {item.before > 0 && item.after === 0 ? ' — bu ay saytdan itəcək' : item.before === 0 ? ' — yeni' : ''}
            </li>
          ))}
        </ul>
      )}
      {changes.linesBefore !== changes.linesAfter && (
        <p className={`mt-1 ${changes.linesAfter < changes.linesBefore * 0.9 ? 'font-semibold text-up' : 'text-ink-2'}`}>Sətir sayı: {changes.linesBefore} → {changes.linesAfter}</p>
      )}
    </div>
  )
}

/** The box a check or an apply answers in: amber while nothing has changed yet, green once it has. */
export function OutcomeBox({ done, heading, children }: { done: boolean; heading: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm ${done ? 'border-down/30 bg-down-soft' : 'border-amber-line bg-amber-soft'}`}>
      <p className={`font-semibold ${done ? 'text-down' : 'text-amber'}`}>{heading}</p>
      {children}
    </div>
  )
}

/** What a check found, or what an apply did: the file or the versions, the months that move, and what to watch. */
function Outcome({ answer, action, done }: { answer: Answer; action: Action; done: boolean }) {
  const { report, changes } = answer
  const heading = done
    ? action === 'import' ? 'Yükləndi: rəqəmlər hamı üçün yeniləndi.' : 'Geri qaytarıldı: əvvəlki rəqəmlər bərpa olundu.'
    : 'Yoxlandı — hələ heç nə dəyişməyib.'
  const months = report ? Object.keys(report.months).map(Number).sort((a, b) => a - b) : []
  const sum = (kind: 'monthly' | 'outside') => months.reduce((total, month) => total + report!.months[month][kind], 0)
  const lost = changes.moved.filter((item) => item.before > 0 && item.after === 0)
  const fewer = changes.linesAfter < changes.linesBefore * 0.9

  return (
    <OutcomeBox done={done} heading={heading}>
      {report && (
        <p className="text-ink-2">
          «{report.file}» · {report.lines} sətir, {report.objects} obyekt · {months.length ? `${monthName(months[0])}–${monthName(months[months.length - 1])}` : ''}
          <br />
          Aylıq sifarişlər: <b className="tnum text-ink">{money(sum('monthly'))}</b> · Aylıqdan kənar: <b className="tnum text-ink">{money(sum('outside'))}</b>
        </p>
      )}
      {answer.current && answer.restore && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-ink-2">
          <dt>Ləğv olunur:</dt>
          <dd className="min-w-0 break-words text-ink">{describe(answer.current)}</dd>
          <dt>Bərpa olunur:</dt>
          <dd className="min-w-0 break-words text-ink">{describe(answer.restore)}</dd>
        </dl>
      )}
      <ChangeLines changes={changes} done={done} />
      {!done && (answer.editsLost ?? 0) > 0 && (
        <Warn>Saytda «Mallar»-da edilmiş {answer.editsLost} dəyişiklik (qiymət, yeni mal, silinmə) bu faylın rəqəmləri ilə əvəz olunacaq.</Warn>
      )}
      {!done && (lost.length > 0 || fewer) && (
        <Warn>Diqqət: {lost.length > 0 ? `${lost.map((item) => item.monthName).filter((name, index, all) => all.indexOf(name) === index).join(', ')} saytdan itəcək` : 'sətir sayı xeyli azalır'}. Doğru faylı seçdiyinizə əmin olun.</Warn>
      )}
      {report && (report.freeLines > 0 || report.missingPrice > 0 || report.mismatchedTotals > 0) && (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-2">
          {report.freeLines > 0 && <li>Qala Bazadan pulsuz daxili təchizat: {report.freeLines} sətir (məbləği 0).</li>}
          {report.missingPrice > 0 && <li>Qiyməti boş olan sətir: {report.missingPrice} (məbləği 0 sayıldı).</li>}
          {report.mismatchedTotals > 0 && <li>«Cəmi» miqdar × qiymətdən fərqlənir: {report.mismatchedTotals} sətir — məbləğ miqdar × qiymətdən hesablanıb.</li>}
        </ul>
      )}
    </OutcomeBox>
  )
}

export function Warn({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-md bg-up-soft px-3 py-2 font-semibold text-up">{children}</p>
}
