import { afterAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

// No workbook: the prototype's own demo, one year (2026) and nothing before it to compare with.
vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date(2026, 9, 18, 12))
delete (globalThis as { __BAX_DATA__?: unknown }).__BAX_DATA__
vi.resetModules()
const { appRoutes } = await import('./routes')
const { compareYears } = await import('./overview/metrics')

afterAll(() => vi.useRealTimers())

describe('the overview with a single year', () => {
  it('says there is nothing to compare with instead of inventing a comparison', async () => {
    render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: ['/'] })} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })).toBeInTheDocument()
    // The year before the first is never named: it has no figures, not even 0.
    expect(screen.getAllByText('2026 məlumatın ilk ilidir — müqayisə yoxdur').length).toBeGreaterThan(0)
    expect(screen.getByText('Əvvəlki il')).toBeInTheDocument()
    expect(screen.getByText('Müqayisə yoxdur')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^2025 ilinin paneli/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Demo məlumat/)).toBeInTheDocument()
    expect(compareYears(2026, [1, 2], 'monthly')).toMatchObject({ previousYear: null, previous: null, delta: null, pct: null })
  })
})
