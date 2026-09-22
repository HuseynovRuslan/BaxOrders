import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  anonymousUser,
  changeOwnPassword,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  primeCsrf,
  type CurrentUser,
} from '../api/auth'
import { setUnauthenticatedHandler } from '../api/client'

interface AuthState {
  /** True until the first answer from the server; nothing private is rendered before then. */
  loading: boolean
  user: CurrentUser
  login: (userName: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Who is signed in, for the whole application.
 * </summary>
 * The session itself is an HttpOnly cookie the browser holds and script cannot read — this only remembers
 * what the server said about it. Nothing is kept in local storage: a page that believed a stale copy of
 * "I am an administrator" would show private data to somebody whose session had already ended.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(anonymousUser)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchCurrentUser())
    } catch {
      setUser(anonymousUser)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // The token is fetched up front so the first write of the session is not the one that has to wait.
    primeCsrf()
      .catch(() => undefined)
      .then(() => fetchCurrentUser())
      .then((current) => {
        if (!cancelled) {
          setUser(current)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(anonymousUser)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // When any request comes back 401 the session has ended; the application stops claiming otherwise.
    setUnauthenticatedHandler(() => setUser(anonymousUser))
    return () => setUnauthenticatedHandler(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      login: async (userName, password) => {
        setUser(await loginRequest(userName, password))
      },
      logout: async () => {
        try {
          await logoutRequest()
        } finally {
          setUser(anonymousUser)
        }
      },
      refresh,
      changePassword: (currentPassword, newPassword) => changeOwnPassword(currentPassword, newPassword),
    }),
    [loading, user, refresh],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const state = use(AuthContext)
  if (state === null) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return state
}
