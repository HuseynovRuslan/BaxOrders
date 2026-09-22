import { KeyRound, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createUser,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type AppUser,
  type BaxOrdersRole,
} from '../api/auth'
import { ApiError } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/imports/review/Modal'
import { formatMonth } from '../components/analytics/format'
import { useAuth } from '../auth/AuthProvider'
import { authErrors, roleDescriptions, roleLabels, roleOrder } from '../auth/labels'

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: AppUser }
  | { kind: 'reset'; user: AppUser }

/**
 * The people who use the system.
 * </summary>
 * There is no delete: a workflow event names the person who caused it, for as long as the record is kept.
 * An account that should stop working is deactivated, which ends its sessions without touching its history.
 */
export function AdminUsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  async function reload() {
    try {
      setUsers(await fetchUsers())
      setError(null)
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : authErrors.unknown)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function toggleActive(person: AppUser) {
    await updateUser(person.id, { isActive: !person.isActive })
    await reload()
  }

  return (
    <>
      <PageHeader
        title="İstifadəçilər"
        description="Sistemə girişi olan şəxslər və onların rolları"
        actions={
          <button
            type="button"
            onClick={() => setDialog({ kind: 'create' })}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Yeni istifadəçi
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">İstifadəçi adı</th>
              <th scope="col" className="px-3 py-3">Ad</th>
              <th scope="col" className="px-3 py-3">Rol</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Yaradılıb</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Əməliyyatlar</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users === null && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Yüklənir…</td></tr>
            )}
            {users?.map((person) => (
              <tr key={person.id} className={person.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/60'}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-slate-900">
                  {person.userName}
                  {person.id === me.userId && <span className="ml-2 text-xs text-slate-500">(siz)</span>}
                </th>
                <td className="px-3 py-2.5 text-slate-700">{person.displayName}</td>
                <td className="px-3 py-2.5 text-slate-700">{roleLabels[person.role] ?? person.role}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      person.isActive
                        ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 ring-slate-300'
                    }`}
                  >
                    {person.isActive ? 'Aktiv' : 'Deaktiv'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">{formatMonth(person.createdAtUtc.slice(0, 7))}</td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'edit', user: person })}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Redaktə et
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'reset', user: person })}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <KeyRound className="size-3.5" aria-hidden="true" />
                      Şifrəni sıfırla
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(person)}
                      disabled={person.id === me.userId}
                      title={person.id === me.userId ? 'Öz hesabınızı deaktiv edə bilməzsiniz' : undefined}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {person.isActive ? 'Deaktiv et' : 'Aktiv et'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        İstifadəçi silinmir: əməliyyat tarixçəsi onun adına bağlı qalır. Girişi dayandırmaq üçün hesab deaktiv
        edilir.
      </p>

      {dialog?.kind === 'create' && (
        <UserForm
          title="Yeni istifadəçi"
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); void reload() }}
        />
      )}

      {dialog?.kind === 'edit' && (
        <UserForm
          title="İstifadəçini redaktə et"
          existing={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); void reload() }}
        />
      )}

      {dialog?.kind === 'reset' && (
        <ResetPasswordForm
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </>
  )
}

function UserForm({
  title,
  existing,
  onClose,
  onSaved,
}: {
  title: string
  existing?: AppUser
  onClose: () => void
  onSaved: () => void
}) {
  const [userName, setUserName] = useState(existing?.userName ?? '')
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '')
  const [role, setRole] = useState<BaxOrdersRole>(existing?.role ?? 'Coordinator')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const creating = existing === undefined
  const blocked = displayName.trim().length === 0 || (creating && (userName.trim().length === 0 || password.length === 0))

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (creating) {
        await createUser({ userName: userName.trim(), displayName: displayName.trim(), role, password })
      } else {
        await updateUser(existing!.id, { displayName: displayName.trim(), role })
      }

      // The password lives no longer than the form does.
      setPassword('')
      onSaved()
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : authErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            İmtina
          </button>
          <button type="button" onClick={save} disabled={blocked || busy} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40">
            {busy ? 'Yadda saxlanılır…' : 'Yadda saxla'}
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-xs text-slate-600">İstifadəçi adı</span>
          <input
            type="text"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            disabled={!creating}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 disabled:bg-slate-50 disabled:text-slate-500"
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-600">Görünən ad</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Əməliyyat tarixçəsində bu ad qeyd olunur. Sonradan dəyişsəniz, köhnə qeydlər dəyişmir.
          </span>
        </label>

        <fieldset>
          <legend className="text-xs text-slate-600">Rol</legend>
          <div className="mt-1 space-y-1.5">
            {roleOrder.map((option) => (
              <label key={option} className="flex items-start gap-2 rounded-md border border-slate-200 p-2">
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-slate-900">{roleLabels[option]}</span>
                  <span className="block text-xs text-slate-500">{roleDescriptions[option]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {creating && (
          <label className="block">
            <span className="text-xs text-slate-600">İlkin şifrə</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Ən azı 10 simvol, rəqəm və kiçik hərf olmalıdır. Şifrə bir daha göstərilmir.
            </span>
          </label>
        )}

        {error && <p className="rounded-md border border-red-200 bg-red-50 p-2 text-red-700" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

function ResetPasswordForm({ user, onClose, onSaved }: { user: AppUser; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await resetUserPassword(user.id, password)
      setPassword('')
      onSaved()
    } catch (problem: unknown) {
      setError(problem instanceof ApiError ? problem.message : authErrors.unknown)
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Şifrəni sıfırla"
      subtitle={`${user.displayName} (${user.userName})`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            İmtina
          </button>
          <button type="button" onClick={save} disabled={password.length === 0 || busy} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40">
            {busy ? 'Gözləyin…' : 'Sıfırla'}
          </button>
        </>
      }
    >
      <label className="block text-sm">
        <span className="text-xs text-slate-600">Yeni şifrə</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Şifrəni istifadəçiyə özünüz çatdırın; sistem onu bir daha göstərmir.
        </span>
      </label>

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700" role="alert">{error}</p>}
    </Modal>
  )
}
