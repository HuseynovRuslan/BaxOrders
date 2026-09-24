import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { authErrors } from '../auth/labels'
import { SandboxBanner } from '../environment/SandboxBanner'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Where the guard sent them from, so they land where they were going rather than always on the dashboard.
  const intended = (location.state as { from?: string } | null)?.from
  const destination = intended && intended.startsWith('/') && !intended.startsWith('//') ? intended : '/dashboard'

  if (!loading && user.isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await login(userName.trim(), password)
      navigate(destination, { replace: true })
    } catch (problem: unknown) {
      // The server says the same thing whether the name exists or the password is wrong, and so does this.
      setError(problem instanceof ApiError && problem.status === 401 ? authErrors.badCredentials : authErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* The test environment says so before anybody signs in. */}
      <SandboxBanner />

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white">
              BAX
            </span>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">Sifariş sistemi</p>
              <p className="text-xs text-slate-500">Bakı Abadlıq Xidməti</p>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Sistemə daxil olun</h1>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600">İstifadəçi adı</span>
              <input
                type="text"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                autoComplete="username"
                autoFocus
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </label>

            <label className="mt-3 block text-sm">
              <span className="text-slate-600">Şifrə</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || userName.trim().length === 0 || password.length === 0}
              className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {busy ? 'Yoxlanılır…' : 'Daxil ol'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
