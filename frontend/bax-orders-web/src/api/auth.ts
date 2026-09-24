import { getJson, postJson } from './client'

export type BaxOrdersRole = 'Coordinator' | 'Manager' | 'Admin'

/** Who is signed in, and what the server says they may do. Never decided in the browser. */
export interface CurrentUser {
  isAuthenticated: boolean
  userId: string | null
  userName: string | null
  displayName: string | null
  role: BaxOrdersRole | null
  canManageImports: boolean
  canSubmitOrders: boolean
  /** Holds approval authority. Only the Rəhbər role does; an administrator does not. */
  canDecideOrders: boolean
  canManageUsers: boolean
  canManageCatalog: boolean
  /** May open "Təsdiq gözləyənlər": the Rəhbər, and an administrator, who sees it without deciding. */
  canViewApprovals: boolean
}

/** Whether anybody can approve an order right now. */
export interface ApprovalAuthorityStatus {
  /** Active users whose role holds approval authority. Zero means nobody can approve. */
  activeApproverCount: number
}

export interface AppUser {
  id: string
  userName: string
  displayName: string
  role: BaxOrdersRole
  isActive: boolean
  createdAtUtc: string
  lockoutEndUtc: string | null
}

export interface CreateUserCommand {
  userName: string
  displayName: string
  role: BaxOrdersRole
  password: string
}

export interface UpdateUserCommand {
  displayName?: string
  role?: BaxOrdersRole
  isActive?: boolean
}

export const anonymousUser: CurrentUser = {
  isAuthenticated: false,
  userId: null,
  userName: null,
  displayName: null,
  role: null,
  canManageImports: false,
  canSubmitOrders: false,
  canDecideOrders: false,
  canManageUsers: false,
  canManageCatalog: false,
  canViewApprovals: false,
}

/**
 * Fetches the antiforgery token the server expects on every write.
 * </summary>
 * The session is a cookie, which the browser attaches to any request to this origin — including one another
 * site provoked. This token proves the request came from our own page, and is sent by the shared request
 * helper rather than by each component.
 */
export function primeCsrf(signal?: AbortSignal): Promise<void> {
  return fetch('/api/v1/auth/csrf', { signal }).then(() => undefined)
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return getJson<CurrentUser>('/api/v1/auth/me', signal)
}

export function login(userName: string, password: string, signal?: AbortSignal): Promise<CurrentUser> {
  return postJson<CurrentUser>('/api/v1/auth/login', { userName, password }, signal)
}

export async function logout(signal?: AbortSignal): Promise<void> {
  await postJson<void>('/api/v1/auth/logout', {}, signal)
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
  signal?: AbortSignal,
): Promise<void> {
  await postJson<void>('/api/v1/auth/change-password', { currentPassword, newPassword }, signal)
}

export function fetchUsers(signal?: AbortSignal): Promise<AppUser[]> {
  return getJson<AppUser[]>('/api/v1/admin/users', signal)
}

export function fetchApprovalAuthority(signal?: AbortSignal): Promise<ApprovalAuthorityStatus> {
  return getJson<ApprovalAuthorityStatus>('/api/v1/admin/users/approval-authority', signal)
}

export function createUser(command: CreateUserCommand, signal?: AbortSignal): Promise<AppUser> {
  return postJson<AppUser>('/api/v1/admin/users', command, signal)
}

export function updateUser(userId: string, command: UpdateUserCommand, signal?: AbortSignal): Promise<AppUser> {
  return patchJson<AppUser>(`/api/v1/admin/users/${userId}`, command, signal)
}

export async function resetUserPassword(userId: string, newPassword: string, signal?: AbortSignal): Promise<void> {
  await postJson<void>(`/api/v1/admin/users/${userId}/reset-password`, { newPassword }, signal)
}

// Re-exported here so the admin screen does not have to reach into the client module for one verb.
import { patchJson } from './client'
