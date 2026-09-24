import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiStatus } from './Header'

/**
 * The server badge says something only when there is something to say (brief: "Server işləyir" yalnız problem
 * olanda görünür). A badge that reads "working" on every page is one a reader learns to skip.
 */
const healthApi = vi.hoisted(() => ({ fetchHealth: vi.fn() }))

vi.mock('../api/health', () => healthApi)

afterEach(() => vi.clearAllMocks())

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
