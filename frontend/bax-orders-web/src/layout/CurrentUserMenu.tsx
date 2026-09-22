import { KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { authErrors, roleLabels } from '../auth/labels'
import { Modal } from '../components/imports/review/Modal'

/** Who is signed in, with the two things they can do about it themselves. */
export function CurrentUserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [changing, setChanging] = useState(false)

  if (!user.isAuthenticated) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
        <p className="text-xs text-slate-500">{user.role ? roleLabels[user.role] : ''}</p>
      </div>

      <button
        type="button"
        onClick={() => setChanging(true)}
        aria-label="Şifrəni dəyiş"
        title="Şifrəni dəyiş"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <KeyRound className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
        aria-label="Çıxış"
        title="Çıxış"
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>

      {changing && <ChangePasswordDialog onClose={() => setChanging(false)} />}
    </div>
  )
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Checked here as a courtesy; the real rules are the server's and are applied there.
  const mismatch = repeat.length > 0 && next !== repeat
  const blocked = current.length === 0 || next.length === 0 || next !== repeat

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setRepeat('')
      setDone(true)
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : authErrors.unknown)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Şifrəni dəyiş"
      onClose={onClose}
      footer={
        done ? (
          <button type="button" onClick={onClose} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
            Bağla
          </button>
        ) : (
          <>
            <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              İmtina
            </button>
            <button type="button" onClick={save} disabled={blocked || busy} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40">
              {busy ? 'Gözləyin…' : 'Dəyiş'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <p className="py-4 text-center text-sm text-emerald-800">Şifrəniz dəyişdirildi.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-xs text-slate-600">Cari şifrə</span>
            <input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-600">Yeni şifrə</span>
            <input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5" />
          </label>
          <label className="block">
            <span className="text-xs text-slate-600">Yeni şifrəni təkrar et</span>
            <input type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5" />
            {mismatch && <span className="mt-1 block text-xs text-amber-800">{authErrors.passwordMismatch}</span>}
          </label>

          {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
