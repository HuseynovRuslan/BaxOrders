import { afterAll, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, matchRoutes, RouterProvider } from 'react-router'
import { useFixture } from './test/fixture'

useFixture()
const { appRoutes } = await import('./routes')
const { placeOf } = await import('./exec/ExecLayout')

afterAll(() => vi.useRealTimers())

function open(path: string) {
  const router = createMemoryRouter(appRoutes(''), { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

/** Opens a dropdown by its name and chooses an option by its value, as a mouse does. */
async function choose(name: string, value: string) {
  await userEvent.click(screen.getByRole('combobox', { name }))
  const list = await screen.findByRole('listbox', { name })
  await userEvent.click(within(list).getAllByRole('option').find((option) => option.dataset.value === value)!)
}

describe('the overview and the year screens', () => {
  it('opens the overview at /, in its own frame, on the latest year against the one before', async () => {
    open('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Əsas naviqasiya' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2026 ilinin paneli/ })).toHaveAttribute('href', '/2026')
    expect(screen.getByRole('link', { name: /^2025 ilinin paneli/ })).toHaveAttribute('href', '/2025')
    expect(screen.getByRole('link', { name: 'Müdiriyyət' })).toHaveAttribute('href', '/2026')
    expect(screen.getByRole('link', { name: 'Mallar' })).toHaveAttribute('href', '/2026/mallar')
    expect(screen.getByRole('link', { name: 'Ərazilər xəritəsi' })).toHaveAttribute('href', '/xerite')
  })

  it('opens /2025 from its card, as the year screen draws it beside the same sidebar, and Back and Forward work', async () => {
    const router = open('/')
    await userEvent.click(await screen.findByRole('link', { name: /^2025 ilinin paneli/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2025' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/2025')
    const sidebar = screen.getByRole('complementary', { name: 'Əsas naviqasiya' })
    expect(within(sidebar).getByRole('link', { name: 'Müdiriyyət' })).toHaveAttribute('aria-current', 'true')
    expect(within(sidebar).getByRole('link', { name: '2025 İllik icmal' })).toHaveAttribute('aria-current', 'page')
    // One frame: the year screen's inner frame no longer repeats the name, the theme switch or «Mallar».
    expect(screen.getAllByRole('link', { name: 'Əsas məzmuna keç' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Tünd' })).toHaveLength(1)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    await act(() => router.navigate(-1))
    expect(await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })).toBeInTheDocument()
    await act(() => router.navigate(1))
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2025' })).toBeInTheDocument()
  })

  it('opens /2026 from its card', async () => {
    const router = open('/')
    await userEvent.click(await screen.findByRole('link', { name: /^2026 ilinin paneli/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/2026')
    expect(screen.getByRole('link', { name: '2026 İllik icmal' })).toHaveAttribute('aria-current', 'page')
  })

  it('still opens a year screen directly, and its own year switch still works — the sidebar follows it', async () => {
    const router = open('/2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    await choose('İl', '2025')
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2025' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/2025')
    expect(screen.getByRole('link', { name: '2025 İllik icmal' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '2026 İllik icmal' })).not.toHaveAttribute('aria-current')
    // «Mallar» follows the year on screen.
    expect(screen.getByRole('link', { name: 'Mallar' })).toHaveAttribute('href', '/2025/mallar')
  })

  it('lists every year under «Müdiriyyət», newest first, behind a chevron of its own', async () => {
    const router = open('/')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    const sidebar = screen.getByRole('complementary', { name: 'Əsas naviqasiya' })
    const toggle = within(sidebar).getByRole('button', { name: 'İlləri göstər' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(sidebar).queryByRole('link', { name: '2026 İllik icmal' })).not.toBeInTheDocument()

    await userEvent.click(toggle)
    expect(within(sidebar).getByRole('button', { name: 'İlləri gizlət' })).toHaveAttribute('aria-expanded', 'true')
    const years = within(within(sidebar).getByRole('list', { name: 'İllik icmallar' })).getAllByRole('link')
    expect(years.map((link) => link.getAttribute('href'))).toEqual(['/2026', '/2025'])
    // Opening the list is not a visit: the address stays.
    expect(router.state.location.pathname).toBe('/')

    await userEvent.click(within(sidebar).getByRole('button', { name: 'İlləri gizlət' }))
    expect(within(sidebar).queryByRole('link', { name: '2025 İllik icmal' })).not.toBeInTheDocument()
  })

  it('puts the products page in the same frame, with «Mallar» lit', async () => {
    open('/2026/mallar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Mallar' })).toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', { name: 'Əsas naviqasiya' })
    expect(within(sidebar).getByRole('link', { name: 'Mallar' })).toHaveAttribute('aria-current', 'page')
    expect(within(sidebar).getByRole('link', { name: 'Müdiriyyət' })).not.toHaveAttribute('aria-current')
  })

  it('places every address in its section of the sidebar', () => {
    expect(placeOf('/')).toEqual({ section: 'home', year: null })
    expect(placeOf('/xerite')).toEqual({ section: 'map', year: null })
    expect(placeOf('/2026')).toEqual({ section: 'management', year: 2026 })
    expect(placeOf('/2025/10/obyekt/alfa')).toEqual({ section: 'management', year: 2025 })
    expect(placeOf('/2026/analiz')).toEqual({ section: 'management', year: 2026 })
    expect(placeOf('/2026/mallar')).toEqual({ section: 'products', year: 2026 })
    expect(placeOf('/2019')).toEqual({ section: null, year: null })
    expect(placeOf('/konsept/a')).toEqual({ section: null, year: null })
  })

  it('keeps the pending card on the year screen’s own waiting panel', async () => {
    open('/')
    const pending = await screen.findByRole('link', { name: /^Təsdiq gözləyən aylıq sifarişlər/ })
    expect(pending).toHaveAttribute('href', '/2026?panel=gozleyir')
  })

  it('sends /xerite to the map, never to a year called «xerite»', () => {
    const matched = matchRoutes(appRoutes(''), '/xerite')!
    expect(matched.at(-1)!.route.path).toBe('xerite')
    expect(matchRoutes(appRoutes(''), '/2026')!.at(-1)!.route.path).toBe(':year')
  })

  it('lets a review copy open elsewhere, as before', () => {
    const matched = matchRoutes(appRoutes('konsept'), '/')!
    expect(matched.at(-1)!.route.index).toBe(true)
    expect(matched.some((match) => match.route.path === 'xerite')).toBe(false)
  })
})

describe('the overview’s filters', () => {
  it('shows the earlier year whole on its card, and the change over the same months only', async () => {
    open('/')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    const cards = screen.getByRole('region', { name: 'Əsas göstəricilər' })
    // 2025 · Yan–Dek: all twelve months, 12 × 150 ₼.
    const earlier = within(cards).getByRole('link', { name: /^2025 ilinin paneli: Aylıq sifarişlər, Yanvar–Dekabr — 1\.800 ₼$/ })
    expect(earlier).toHaveTextContent('2025 · Yan–Dek')
    expect(earlier).toHaveTextContent('Tam il · 12 ay')
    expect(earlier).not.toHaveTextContent('Eyni')
    // The change: 1.730 ₼ against 1.500 ₼, the ten months both years have (2026 has no July) — never against 1.800 ₼.
    expect(cards).toHaveTextContent('+15,3%')
    expect(cards).toHaveTextContent('+230 ₼')
    expect(cards).toHaveTextContent('1.500 ₼ → 1.730 ₼')
    expect(cards).toHaveTextContent('Müqayisə: Yan, Fev, Mar, Apr, May, İyn, Avq, Sen, Okt, Noy 2026 ilə')
    expect(screen.getByText(/2025 kartında Yanvar–Dekabr göstərilir \(12 ay\); dəyişmə yalnız eyni aylar üzrə hesablanır\./)).toBeInTheDocument()
  })

  it('reads one period for every card and keeps it in the address', async () => {
    const router = open('/')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    await choose('Dövr', 'q4')
    expect(router.state.location.search).toBe('?dovr=q4')
    expect(await screen.findByRole('link', { name: /^2026 ilinin paneli: Aylıq sifarişlər, Oktyabr–Noyabr — 340 ₼/ })).toBeInTheDocument()
    // The earlier year's card shows its whole fourth quarter; the change is still October–November against the same.
    expect(screen.getByRole('link', { name: /^2025 ilinin paneli: Aylıq sifarişlər, Oktyabr–Dekabr — 450 ₼/ })).toHaveTextContent('Tam rüb · 3 ay')
    expect(screen.getByRole('region', { name: 'Əsas göstəricilər' })).toHaveTextContent('300 ₼ → 340 ₼')
  })

  it('reads the earlier year over the same months under an approval filter', async () => {
    open('/?status=gozleyir')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    expect(screen.getByRole('link', { name: /^2025 ilinin paneli: Aylıq sifarişlər, Oktyabr–Noyabr — 300 ₼/ })).toHaveTextContent('Eyni 2 ay üzrə müqayisə')
    expect(screen.getByRole('link', { name: /^2026 ilinin paneli/ })).toHaveTextContent('Təsdiq gözləyən aylar · 2 ay')
  })

  it('changes the order kind from «Növ», by keyboard, and keeps it in the address', async () => {
    const router = open('/')
    const heading = await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    // The frame gives a new page's heading the focus a frame later: let it, or it takes the focus from «Növ» mid-test.
    await waitFor(() => expect(heading).toHaveFocus())
    const kind = screen.getByRole('combobox', { name: 'Növ' })
    expect(kind).toHaveTextContent('Aylıq sifarişlər')
    kind.focus()
    await userEvent.keyboard('{ArrowDown}')
    const list = screen.getByRole('listbox', { name: 'Növ' })
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['Aylıq sifarişlər', 'Aylıqdan kənar', 'Hamısı'])
    expect(within(list).getByRole('option', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?nov=kenar')
    expect(screen.getByRole('combobox', { name: 'Növ' })).toHaveTextContent('Aylıqdan kənar')
    expect(screen.getByRole('combobox', { name: 'Növ' })).toHaveFocus()
  })

  it('turns the approval filter off for kinds without approval', async () => {
    open('/?nov=kenar&status=tesdiq')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    expect(screen.getByRole('combobox', { name: 'Təsdiq' })).toBeDisabled()
    expect(screen.getByRole('link', { name: /^2026 ilinin paneli: Aylıqdan kənar/ })).toHaveAttribute('href', '/2026?nov=kenar')
  })
})

describe('the overview’s years', () => {
  it('puts another year on screen from «İl», and names no year before the first', async () => {
    const router = open('/')
    await screen.findByRole('heading', { level: 1, name: 'İdarəetmə mərkəzi' })
    await choose('İl', '2025')
    expect(new URLSearchParams(router.state.location.search).get('il')).toBe('2025')
    expect(screen.getByRole('link', { name: /^2025 ilinin paneli/ })).toHaveAttribute('href', '/2025')
    expect(screen.getAllByText('2025 məlumatın ilk ilidir — müqayisə yoxdur').length).toBeGreaterThan(0)
    expect(screen.getByText('Əvvəlki il')).toBeInTheDocument()
    // With no year before it, none of its months is «left out of the comparison»: its card says what it covers.
    expect(screen.queryByText(/müqayisəyə daxil deyil/)).not.toBeInTheDocument()
    expect(screen.getByText('Tam il · 12 ay')).toBeInTheDocument()
    expect(screen.getByRole('main').textContent).not.toContain('2024')
    expect(screen.getByRole('link', { name: 'Xəritədə' })).toHaveAttribute('href', '/xerite?il=2025')

    await choose('İl', '2026')
    expect(new URLSearchParams(router.state.location.search).get('il')).toBeNull()
    expect(screen.getByRole('link', { name: /^2026 ilinin paneli/ })).toHaveAttribute('href', '/2026')
  })
})
