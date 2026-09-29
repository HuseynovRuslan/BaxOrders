import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiStatus, Header } from './Header'

/**
 * The server badge says something only when there is something to say (brief: "Server işləyir" yalnız problem
 * olanda görünür). A badge that reads "working" on every page is one a reader learns to skip.
 */
const healthApi = vi.hoisted(() => ({ fetchHealth: vi.fn() }))

vi.mock('../api/health', () => healthApi)

// Who is signed in, and what is waiting, are those two components' own concern; here they only have to take
// their place in the bar.
vi.mock('./CurrentUserMenu', () => ({ CurrentUserMenu: () => <span>İstifadəçi</span> }))
vi.mock('./ApprovalsBell', () => ({ ApprovalsBell: () => <span>Zəng</span> }))

afterEach(() => vi.clearAllMocks())

/**
 * The title fits one line (brief: "Başlıq bir sətirə sığır"). At 390 px it broke into three: nothing stopped it
 * wrapping, and it was the one thing in the bar with no room to give. jsdom lays nothing out, so this checks the
 * classes that decide it.
 *
 * The approved BaxOrders-UI-v2 design writes it as two lines — the organisation above, the product below — and
 * the rule is the same for both: each truncates, and everything else in the bar keeps its width.
 */
describe('the title', () => {
  it('keeps its words, on one line each, and is the one thing in the bar that gives way', () => {
    healthApi.fetchHealth.mockReturnValue(new Promise(() => {}))
    render(<Header onMenuClick={() => {}} />)

    expect(screen.getByText('Bakı Abadlıq Xidməti')).toHaveClass('truncate')
    const title = screen.getByText('Sifariş sistemi')
    expect(title).toHaveClass('truncate')
    expect(title.parentElement).toHaveClass('min-w-0')

    expect(screen.getByRole('button', { name: 'Menyunu aç' })).toHaveClass('shrink-0', 'lg:hidden')
    expect(screen.getByText('İstifadəçi').parentElement).toHaveClass('shrink-0')
  })
})

describe('the server badge', () => {
  it('shows nothing while the check is still running', () => {
    healthApi.fetchHealth.mockReturnValue(new Promise(() => {}))
    const { container } = render(<ApiStatus />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Yoxlanılır…')).toBeNull()
  })

  it('shows nothing when the server answers', async () => {
    healthApi.fetchHealth.mockResolvedValue('Healthy')
    const { container } = render(<ApiStatus />)

    // Let the answer land and React render it, then check that it changed nothing on the screen.
    await waitFor(() => expect(healthApi.fetchHealth).toHaveBeenCalled())
    await act(async () => {})
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/Server işləyir/)).toBeNull()
  })

  it('says the server cannot be reached when it cannot, and announces it', async () => {
    healthApi.fetchHealth.mockRejectedValue(new Error('Failed to fetch'))
    render(<ApiStatus />)

    expect(await screen.findByRole('status')).toHaveTextContent('Server əlçatan deyil')
  })
})
