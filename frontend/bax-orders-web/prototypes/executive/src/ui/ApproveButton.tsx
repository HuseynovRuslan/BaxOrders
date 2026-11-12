import { useRef, useState, type FormEvent } from 'react'
import { Check, Undo2, X } from 'lucide-react'
import { approvalDrift, approvalOf, monthlyAmount } from '../data/analysis'
import { YEAR } from '../data/model'
import { money, monthName } from '../lib/format'
import { callApi, ErrorBox, importEnabled, KeyField, keyRequired, OutcomeBox, when } from './ImportButton'

/**
 * The Rəhbər's approval of a month (owner, 2026-11-02): the month's monthly orders, for every object, approved once —
 * with the Rəhbər's code, which only the server knows. The approval keeps the amount it was given for; if the figures
 * move after it, it stands and the month says so, and the Rəhbər can approve the new figure. Outside-monthly orders
 * have their own consent and are not approved here; «Hamısı» is spending, never an amount to approve.
 */

type Action = 'approve' | 'revoke'
type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; at: string; by: string; amount: number }

export function ApproveButton({ month }: { month: number }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const approval = approvalOf(month)
  const drift = approvalDrift(month)
  const approved = approval?.state === 'approved'
  // A waiting month, or an approved one whose figures moved, is approved (again); an approved one can be taken back.
  const offered: Action = !approved || drift ? 'approve' : 'revoke'
  const [action, setAction] = useState<Action>(offered)
  const [code, setCode] = useState('')
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const busy = status.kind === 'busy'
  const now = monthlyAmount(month)
  // The month on screen is the year on screen's: a page never approves a month of another year.
  const year = YEAR
  const name = `${monthName(month)} ${year}`

  if (!importEnabled || !approval) return null
  // An approval the program gave, with no record in the approvals file (a year before the site's): it was given there,
  // and there is nothing here to take back.
  if (approved && !approval.recorded) return null

  const open = () => {
    setAction(offered)
    setCode('')
    setStatus({ kind: 'idle' })
    dialog.current?.showModal()
  }
  const close = () => dialog.current?.close()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || status.kind === 'done') return
    setStatus({ kind: 'busy' })
    const result = await callApi('approve', 'apply', key, {
      body: JSON.stringify({ year, month, action, code, expected: now.amount }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (result.ok) setStatus({ kind: 'done', at: result.body.at, by: result.body.by, amount: result.body.amount })
    else setStatus({ kind: 'error', message: result.message })
  }

  const title = action === 'approve' ? `${name}: aylıq sifarişləri təsdiqlə` : `${name}: təsdiqi geri al`
  const label = !approved ? 'Təsdiqlə' : drift ? 'Yeni məbləği təsdiqlə' : 'Təsdiqi geri al'

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={offered === 'approve'
          ? 'inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-sm font-semibold text-paper transition-colors hover:bg-ink-2'
          : 'inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline'}
      >
        {offered === 'approve' ? <Check aria-hidden="true" className="size-4" strokeWidth={2.75} /> : <Undo2 aria-hidden="true" className="size-3.5" />}
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`approve-title-${month}`}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-paper p-0 text-ink shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop:bg-ink/40"
      >
        <form onSubmit={submit} className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={`approve-title-${month}`} className="text-lg font-bold leading-snug">{title}</h2>
            <button type="button" onClick={close} aria-label="Bağla" className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-muted hover:bg-stone-2 hover:text-ink">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          {status.kind === 'done' ? (
            <OutcomeBox done heading={action === 'approve' ? 'Təsdiqləndi.' : 'Təsdiq geri alındı.'}>
              <p className="text-ink-2">
                {action === 'approve'
                  ? <>{name}, aylıq sifarişlər: <b className="tnum text-ink">{money(status.amount)}</b> · {status.by}, {when(status.at)}</>
                  : <>{name} yenidən təsdiq gözləyir · {status.by}, {when(status.at)}</>}
              </p>
            </OutcomeBox>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg bg-stone-2/60 px-4 py-3 text-sm">
                <dt className="text-ink-2">Aylıq sifarişlər</dt>
                <dd className="tnum text-right font-bold text-ink">{money(now.amount)}</dd>
                <dt className="text-ink-2">Obyekt / sətir</dt>
                <dd className="tnum text-right text-ink">{now.objects} obyekt · {now.lines} sətir</dd>
                {approved && (
                  <>
                    <dt className="text-ink-2">Təsdiqlənib</dt>
                    <dd className="tnum text-right text-ink">
                      {approval.amount !== undefined ? money(approval.amount) : 'proqramda'}
                      {approval.at ? `, ${when(approval.at)}` : ''}
                    </dd>
                  </>
                )}
              </dl>

              <p className="text-sm leading-relaxed text-ink-2">
                {action === 'approve'
                  ? drift
                    ? `Təsdiqdən sonra məbləğ dəyişib: ${money(drift.approved)} → ${money(drift.now)}. Yeni məbləği təsdiqləsəniz, əvvəlki təsdiq bununla əvəz olunur.`
                    : `Ayın bütün obyektlər üzrə aylıq sifarişləri bir dəfəyə təsdiqlənir. Aylıqdan kənar sifarişlər bura daxil deyil — onların hər birinin ayrıca razılığı var.`
                  : `${name} yenidən «təsdiq gözləyir» vəziyyətinə qayıdacaq. Rəqəmlər dəyişmir.`}
              </p>

              {approved && drift && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {(['approve', 'revoke'] as const).map((item) => (
                    <label key={item} className="inline-flex min-h-8 items-center gap-2">
                      <input type="radio" name={`approve-action-${month}`} checked={action === item} onChange={() => { setAction(item); setStatus({ kind: 'idle' }) }} />
                      {item === 'approve' ? 'Yeni məbləği təsdiqlə' : 'Təsdiqi geri al'}
                    </label>
                  ))}
                </div>
              )}

              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Rəhbər kodu
                <input
                  type="password"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  name={`rehber-code-${month}`}
                  value={code}
                  onChange={(event) => { setCode(event.target.value); if (status.kind === 'error') setStatus({ kind: 'idle' }) }}
                  className="h-10 rounded-lg border border-line px-3 font-normal tracking-[0.2em]"
                />
                <span className="text-xs font-normal text-muted">Kodu yalnız Rəhbər bilir; server onu yoxlayır və kimin, nə vaxt təsdiqlədiyini yazır.</span>
              </label>
              {keyRequired && <KeyField value={key} onChange={setKey} />}
            </>
          )}

          <div aria-live="polite">
            {busy && <p className="text-sm text-ink-2">{action === 'approve' ? 'Təsdiqlənir…' : 'Geri alınır…'}</p>}
            {status.kind === 'error' && <ErrorBox message={status.message} details={[]} />}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {status.kind === 'done' ? (
              <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper">
                Bağla və yenilə
              </button>
            ) : (
              <>
                <button type="button" onClick={close} disabled={busy} className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold hover:bg-stone-2 disabled:opacity-50">
                  Ləğv et
                </button>
                <button type="submit" disabled={busy || !code.trim() || (keyRequired && !key)} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-paper disabled:opacity-50">
                  {action === 'approve' ? 'Təsdiqlə' : 'Təsdiqi geri al'}
                </button>
              </>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}
