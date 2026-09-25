import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUser, CurrentUser } from '../api/auth'
import { ApiError } from '../api/client'
import { AuthProvider } from '../auth/AuthProvider'
import { AdminUsersPage } from './AdminUsersPage'

/**
 * The administrator's screen for the people who use the system. An account is never deleted — the workflow
 * history names whoever caused each event — so the only way to stop one working is to deactivate it, and the
 * screen has to say that rather than leave somebody looking for a delete button.
 */
const authApi = vi.hoisted(() => ({
  primeCsrf: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchUsers: vi.fn(),
  fetchApprovalAuthority: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resetUserPassword: vi.fn(),
}))

vi.mock('../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../api/auth')>('../api/auth')
  return { ...actual, ...authApi }
})

const admin: CurrentUser = {
  isAuthenticated: true,
  userId: 'aaaaaaaa-0000-4000-8000-000000000001',
  userName: 'test.admin',
  displayName: 'Test Administrator',
  role: 'Admin',
  canManageImports: true,
  canSubmitOrders: true,
  // 4.3: an administrator holds no approval authority, and sees the queue without it.
  canDecideOrders: false,
  canManageUsers: true,
  canManageCatalog: true,
  canViewApprovals: true,
  // 13.2: product matches and alternative product names are the administrator's.
  canDecideProductMatches: true,
}

function appUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'bbbbbbbb-0000-4000-8000-000000000002',
    userName: 'test.koordinator',
    displayName: 'Test Koordinator',
    role: 'Coordinator',
    isActive: true,
    createdAtUtc: '2026-09-01T08:00:00Z',
    lockoutEndUtc: null,
    ...overrides,
  }
}

beforeEach(() => {
  authApi.primeCsrf.mockReset().mockResolvedValue(undefined)
  authApi.fetchCurrentUser.mockReset().mockResolvedValue(admin)
  authApi.fetchUsers.mockReset().mockResolvedValue([appUser()])
  authApi.fetchApprovalAuthority.mockReset().mockResolvedValue({ activeApproverCount: 1 })
  authApi.createUser.mockReset()
  authApi.updateUser.mockReset().mockResolvedValue(appUser())
  authApi.resetUserPassword.mockReset().mockResolvedValue(undefined)
})

afterEach(() => vi.clearAllMocks())

async function renderPage(users: AppUser[] = [appUser()]) {
  authApi.fetchUsers.mockResolvedValue(users)
  render(
    <MemoryRouter>
      <AuthProvider>
        <AdminUsersPage />
      </AuthProvider>
    </MemoryRouter>,
  )

  await screen.findByRole('heading', { name: 'İstifadəçilər' })
  await waitFor(() => expect(authApi.fetchUsers).toHaveBeenCalled())
}

describe('the list', () => {
  it('names each person, their role in Azerbaijani, and whether the account works', async () => {
    await renderPage([
      appUser(),
      appUser({ id: 'cccccccc-0000-4000-8000-000000000003', userName: 'test.rehber', displayName: 'Test Rəhbər', role: 'Manager', isActive: false }),
    ])

    expect(await screen.findByText('test.koordinator')).toBeInTheDocument()
    expect(screen.getByText('Koordinator')).toBeInTheDocument()
    expect(screen.getByText('Aktiv')).toBeInTheDocument()
    expect(screen.getByText('Rəhbər')).toBeInTheDocument()
    expect(screen.getByText('Deaktiv')).toBeInTheDocument()
  })

  it('offers no way to delete anybody, and says why', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: /Sil/ })).toBeNull()
    expect(screen.getByText(/İstifadəçi silinmir/)).toBeInTheDocument()
  })

  it('will not let an administrator deactivate their own account', async () => {
    await renderPage([appUser({ id: admin.userId!, userName: 'test.admin', displayName: 'Test Administrator', role: 'Admin' })])

    expect(await screen.findByText('(siz)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deaktiv et' })).toBeDisabled()
  })
})

describe('creating somebody', () => {
  it('needs a name, a login and a first password before it will save', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /Yeni istifadəçi/ }))
    const dialog = screen.getByRole('dialog')
    const save = within(dialog).getByRole('button', { name: 'Yadda saxla' })
    expect(save).toBeDisabled()

    await user.type(within(dialog).getByLabelText('İstifadəçi adı'), 'test.yeni')
    await user.type(within(dialog).getByLabelText(/Görünən ad/), 'Test Yeni İstifadəçi')
    expect(save).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/İlkin şifrə/), 'ilkin-şifrə-10')
    expect(save).toBeEnabled()
  })

  it('sends the role that was chosen, and starts on the least powerful one', async () => {
    const user = userEvent.setup()
    authApi.createUser.mockResolvedValue(appUser({ role: 'Manager' }))
    await renderPage()

    await user.click(screen.getByRole('button', { name: /Yeni istifadəçi/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('radio', { name: /Koordinator/ })).toBeChecked()

    await user.type(within(dialog).getByLabelText('İstifadəçi adı'), 'test.rehber')
    await user.type(within(dialog).getByLabelText(/Görünən ad/), 'Test Rəhbər')
    await user.type(within(dialog).getByLabelText(/İlkin şifrə/), 'ilkin-şifrə-10')
    await user.click(within(dialog).getByRole('radio', { name: /Rəhbər/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(authApi.createUser).toHaveBeenCalledWith({
      userName: 'test.rehber',
      displayName: 'Test Rəhbər',
      role: 'Manager',
      password: 'ilkin-şifrə-10',
    }))
  })

  it('explains what the server will accept as a password, and shows the refusal it gives', async () => {
    const user = userEvent.setup()
    authApi.createUser.mockRejectedValue(new ApiError(400, 'Şifrə ən azı 10 simvol olmalıdır.'))
    await renderPage()

    await user.click(screen.getByRole('button', { name: /Yeni istifadəçi/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/Ən azı 10 simvol/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('İstifadəçi adı'), 'test.yeni')
    await user.type(within(dialog).getByLabelText(/Görünən ad/), 'Test Yeni')
    await user.type(within(dialog).getByLabelText(/İlkin şifrə/), 'qısa')
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Şifrə ən azı 10 simvol olmalıdır.')
  })
})

describe('editing somebody', () => {
  it('will not rename the login, and warns that old history keeps the old name', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByLabelText('İstifadəçi adı')).toBeDisabled()
    expect(within(dialog).getByText(/köhnə qeydlər dəyişmir/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('İlkin şifrə')).toBeNull()
  })

  it('sends only the name and the role', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Redaktə et' }))
    const dialog = screen.getByRole('dialog')
    const name = within(dialog).getByLabelText(/Görünən ad/)
    await user.clear(name)
    await user.type(name, 'Test Koordinator II')
    await user.click(within(dialog).getByRole('button', { name: 'Yadda saxla' }))

    await waitFor(() => expect(authApi.updateUser).toHaveBeenCalledWith(
      'bbbbbbbb-0000-4000-8000-000000000002',
      { displayName: 'Test Koordinator II', role: 'Coordinator' },
    ))
  })

  it('resets a password without ever showing it again', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /Şifrəni sıfırla/ }))
    const dialog = screen.getByRole('dialog')
    const field = within(dialog).getByLabelText(/Yeni şifrə/)
    expect(field).toHaveAttribute('type', 'password')

    await user.type(field, 'sıfırlanmış-10')
    await user.click(within(dialog).getByRole('button', { name: 'Sıfırla' }))

    await waitFor(() => expect(authApi.resetUserPassword).toHaveBeenCalledWith(
      'bbbbbbbb-0000-4000-8000-000000000002',
      'sıfırlanmış-10',
    ))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('deactivates an account rather than removing it', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: 'Deaktiv et' }))

    await waitFor(() => expect(authApi.updateUser).toHaveBeenCalledWith(
      'bbbbbbbb-0000-4000-8000-000000000002',
      { isActive: false },
    ))
  })

  it('shows the server’s refusal to disable the last Rəhbər', async () => {
    const user = userEvent.setup()
    const refusal = 'Bu, təsdiq səlahiyyəti olan yeganə aktiv istifadəçidir. Əvvəlcə başqa bir Rəhbər təyin edin.'
    authApi.updateUser.mockRejectedValue(new ApiError(400, refusal))
    await renderPage([appUser({ userName: 'test.rehber', displayName: 'Test Rəhbər', role: 'Manager' })])

    await user.click(await screen.findByRole('button', { name: 'Deaktiv et' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(refusal)
  })
})

describe('who can approve', () => {
  const warning =
    'Təsdiq səlahiyyəti olan aktiv istifadəçi yoxdur. Sifarişləri heç kim təsdiqləyə bilmir. Rəhbər rolu ilə istifadəçi yaradın.'

  it('warns at the top when nobody active holds approval authority', async () => {
    authApi.fetchApprovalAuthority.mockResolvedValue({ activeApproverCount: 0 })
    await renderPage()

    expect(await screen.findByText(warning)).toBeInTheDocument()
  })

  it('says nothing of the kind while somebody can approve', async () => {
    authApi.fetchApprovalAuthority.mockResolvedValue({ activeApproverCount: 2 })
    await renderPage()

    await screen.findByText('test.koordinator')
    expect(screen.queryByText(warning)).toBeNull()
  })

  it('describes each role truthfully where one is chosen: the authority is the Rəhbər’s, not the administrator’s', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /Yeni istifadəçi/ }))
    const dialog = within(screen.getByRole('dialog'))

    expect(dialog.getByText('Sifarişləri təsdiqləyir və ya düzəliş tələb edir. Təsdiq səlahiyyəti bu roldadır.')).toBeInTheDocument()
    expect(dialog.getByText(
      'Excel idxalını aparır, sifarişləri təsdiqə göndərir və istifadəçiləri idarə edir. Təsdiq səlahiyyəti yoxdur.',
    )).toBeInTheDocument()
    expect(dialog.getByText('Excel idxalını aparır və sifarişləri təsdiqə göndərir.')).toBeInTheDocument()
  })
})
