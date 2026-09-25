import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

/**
 * Keeps the operational screens behind a sign-in.
 * </summary>
 * Nothing is rendered until the server has answered who is signed in, so a page never flashes private data
 * to somebody whose session has ended. This is a convenience, not the protection: every endpoint behind these
 * screens refuses an unauthenticated caller on its own.
 */
export function RequireAuth() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <span className="text-sm text-slate-500">Yüklənir…</span>
      </div>
    )
  }

  if (!user.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}

/**
 * A screen only some roles may open.
 * </summary>
 * The permission flags come from the server, which checks them again on every request the screen makes —
 * hiding a page is a courtesy to the person, not a lock on the data.
 */
export function RequirePermission({
  permission,
}: {
  permission: 'canManageImports' | 'canManageUsers' | 'canViewApprovals' | 'canManageCatalog'
}) {
  const { user } = useAuth()

  if (!user[permission]) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900" role="alert">
        <p className="font-medium">Bu səhifəyə icazəniz yoxdur.</p>
        <p className="mt-1">Lazımdırsa, administratordan rolunuzun dəyişdirilməsini xahiş edin.</p>
      </div>
    )
  }

  return <Outlet />
}
