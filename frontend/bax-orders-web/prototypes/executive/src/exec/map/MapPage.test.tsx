import { afterAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useFixture } from '../../test/fixture'

/*
 * The map page on the fixture's figures and the owner's 48 real locations. The fixture has none of the owner's objects,
 * so the links are the test's own: Aeroport yolu (LOC-0049) → Alfa, Fəvvarələr meydanı (LOC-0046) → Beta, and both
 * Bibiheybət pins (LOC-0018, LOC-0031) → Delta, one object for two pins. That pairing is the test's alone: in the real
 * links they are two objects (CB-43). Nərimanov heykəli parkı (LOC-0039) is a candidate; every other location has no link.
 */

useFixture()
vi.doMock('../../data/areaFinanceLinks', () => ({
  FINANCE_LINKS: {
    'LOC-0049': { siteId: 'alfa', sourceName: 'Alfa', basis: 'same-name', ref: null },
    'LOC-0046': { siteId: 'beta', sourceName: 'Beta', basis: 'business', ref: 'CB-06' },
    'LOC-0018': { siteId: 'delta', sourceName: 'Delta', basis: 'data', ref: 'DB-04' },
    'LOC-0031': { siteId: 'delta', sourceName: 'Delta', basis: 'data', ref: 'DB-04' },
  },
  FINANCE_LINK_CANDIDATES: {
    'LOC-0039': { siteId: 'gamma', sourceName: 'Gamma', question: 'Eyni obyektdirmi?' },
  },
}))
const { appRoutes } = await import('../../routes')
const { AREA_LOCATIONS } = await import('../../data/areaLocations')
const { VISIBLE_LOCATIONS } = await import('../../data/locationVisibility')

/** The place the source has twice (DUP-01: LOC-0014 and LOC-0020), with the longest name of all. */
const LONG_NAME = 'Azərbaycan Respublikası Prezident Administrasiyasının Vətəndaş Qəbulu Mərkəzi'

afterAll(() => vi.useRealTimers())

/** Opens a page and lets the frame give its heading the focus (a frame later), so it cannot take it mid-test. */
async function open(path: string) {
  const router = createMemoryRouter(appRoutes(''), { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  const heading = await screen.findByRole('heading', { level: 1, name: 'Ərazilər xəritəsi' }, { timeout: 8000 })
  await waitFor(() => expect(heading).toHaveFocus())
  return router
}

async function choose(name: string, value: string) {
  await userEvent.click(screen.getByRole('combobox', { name }))
  const list = await screen.findByRole('listbox', { name })
  await userEvent.click(within(list).getAllByRole('option').find((option) => option.dataset.value === value)!)
}

const panel = () => screen.getByRole('heading', { level: 2, name: (_, element) => element?.id === 'area-title' }).closest('section')!
const params = (router: Awaited<ReturnType<typeof open>>) => new URLSearchParams(router.state.location.search)

describe('the areas map', () => {
  it('lists the 47 places of the export’s 48 records: LOC-0014 shown once as LOC-0020, LOC-0025 absent', async () => {
    const { container } = render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: ['/xerite?gorunus=siyahi'] })} />)
    // The first visit loads the map's code.
    expect(await screen.findByRole('heading', { level: 1, name: 'Ərazilər xəritəsi' }, { timeout: 8000 })).toBeInTheDocument()
    const count = screen.getByText('47 lokasiya')
    // The count says what it counts: the source's records, and the one shown once.
    expect(count).toHaveAttribute('title', 'Mənbədə 48 qeyd; 1 təkrar qeyd ayrıca göstərilmir (LOC-0014 → LOC-0020)')
    const rows = container.querySelectorAll('button[data-location]')
    expect(rows).toHaveLength(47)
    const ids = [...rows].map((row) => row.getAttribute('data-location'))
    expect(new Set(ids).size).toBe(47)
    expect(ids).not.toContain('LOC-0025')
    expect(ids).not.toContain('LOC-0014')
    // The other records the source calls possible duplicates are not part of the owner's decision: still listed.
    expect(ids).toEqual(expect.arrayContaining(['LOC-0020', 'LOC-0026', 'LOC-0049']))
    // One row for the long name.
    const names = [...rows].map((row) => row.querySelector('span[title]')?.getAttribute('title'))
    expect(names.filter((name) => name === LONG_NAME)).toHaveLength(1)
    expect(new Set(names).size).toBe(47)
  })

  it('draws each of the 47 places once on the map, as a pin or inside a numbered circle', async () => {
    const { container } = render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: ['/xerite'] })} />)
    await screen.findByRole('region', { name: 'Ərazilər xəritəsi' })
    await waitFor(() => expect(container.querySelectorAll('.x-marker, .x-cluster').length).toBeGreaterThan(0))
    const pins = container.querySelectorAll('.x-marker').length
    const gathered = [...container.querySelectorAll('[data-cluster]')].reduce((sum, element) => sum + Number(element.getAttribute('data-cluster')), 0)
    expect(pins + gathered).toBe(47)
    expect(container.querySelector('[data-location="LOC-0014"]')).toBeNull()
    // No circle names the same place twice.
    for (const circle of container.querySelectorAll('[data-cluster]')) {
      expect(circle.getAttribute('aria-label')!.split(LONG_NAME).length).toBeLessThanOrEqual(2)
    }
  })

  it('opens a location with its manager only, its id, its coordinates and a safe link to its own map address', async () => {
    const router = await open('/xerite?gorunus=siyahi')
    await screen.findByText('47 lokasiya')
    await userEvent.click(document.querySelector('button[data-location="LOC-0049"]')!)
    expect(params(router).get('erazi')).toBe('LOC-0049')
    const area = panel()
    expect(within(area).getByRole('heading', { level: 2, name: 'Aeroport yolu' })).toBeInTheDocument()
    // In the head and in the record's details.
    expect(within(area).getAllByText('LOC-0049').length).toBe(2)
    expect(within(area).getByText('Ərazi rəhbəri:')).toBeInTheDocument()
    expect(within(area).getByText('Məmmədov Nizami')).toBeInTheDocument()
    expect(within(area).getByText('40.469522, 50.093498')).toBeInTheDocument()
    const link = within(area).getByRole('link', { name: /Xəritədə aç/ })
    expect(link).toHaveAttribute('href', 'https://maps.google.com/maps?q=40.4695221%2C50.0934978&z=17&hl=en')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    const text = document.body.textContent!.toLocaleLowerCase('az')
    for (const word of ['supervisor', 'warehouse', 'nəzarətçi', 'anbardar']) expect(text).not.toContain(word)
  })

  it('shows the period against the same month a year before, then against the month before — January against December', async () => {
    const router = await open('/xerite?erazi=LOC-0049&dovr=m11')
    const area = await waitFor(panel)
    // November 2026 (the latest month): Alfa 120 ₼ against 100 ₼ in November 2025.
    const kpis = within(area).getAllByRole('definition')
    expect(kpis.some((item) => item.textContent === '120 ₼')).toBe(true)
    expect(kpis.some((item) => item.textContent === '100 ₼')).toBe(true)
    expect(within(area).getByText('+20,0%')).toBeInTheDocument()
    expect(within(area).getByText('Noyabr 2025')).toBeInTheDocument()
    // November waits for approval, November 2025 is approved: the difference is said not to be final.
    expect(within(area).getByText(/Fərq qəti deyil/)).toBeInTheDocument()

    await choose('Müqayisə', 'previous')
    expect(params(router).get('muq')).toBe('evvelki')
    expect(within(panel()).getByText('Oktyabr 2026')).toBeInTheDocument()
    expect(within(panel()).queryByText('+20,0%')).not.toBeInTheDocument()

    await choose('Dövr', 'm1')
    expect(within(panel()).getByText('Dekabr 2025')).toBeInTheDocument()
    expect(within(panel()).getByText('+20,0%')).toBeInTheDocument()
  })

  it('compares a run of months with an equally long run, and names the month left out', async () => {
    await open('/xerite?erazi=LOC-0049&dovr=ytd&muq=evvelki')
    const area = await waitFor(panel)
    expect(within(area).getByText('Yan–Noy 2026', { selector: 'dt span' })).toBeInTheDocument()
    expect(within(area).getByText('Fev–Dek 2025', { selector: 'dt span' })).toBeInTheDocument()
    expect(within(area).getByText(/yalnız uyğun 10 ay/)).toBeInTheDocument()
    expect(within(area).getByText(/İyul 2026 — məlumat yoxdur/)).toBeInTheDocument()
    // 1.280 ₼ against 1.000 ₼ over the ten months both sides have.
    expect(within(area).getByText('+28,0%')).toBeInTheDocument()
  })

  it('reads 2025 over its own twelve months, with no earlier year to compare', async () => {
    await open('/xerite?il=2025&dovr=ytd&erazi=LOC-0049')
    const area = await waitFor(panel)
    expect(within(area).getAllByRole('definition').some((item) => item.textContent === '1.200 ₼')).toBe(true)
    expect(within(area).getByText(/Yan–Dek 2024 üçün məlumat yoxdur/)).toBeInTheDocument()
    expect(within(area).queryByText(/NaN|Infinity/)).not.toBeInTheDocument()
  })

  it('shows no money for a location without a confirmed link — not even 0 ₼', async () => {
    await open('/xerite?erazi=LOC-0001')
    const area = await waitFor(panel)
    expect(within(area).getByText('Maliyyə məlumatları hələ uyğunlaşdırılmayıb')).toBeInTheDocument()
    expect(within(area).queryByRole('tablist')).not.toBeInTheDocument()
    expect(area.textContent).not.toContain('₼')
    expect(within(area).getByText('Quliyev Rəhman')).toBeInTheDocument()
    expect(within(area).getByRole('link', { name: /Xəritədə aç/ })).toBeInTheDocument()
  })

  it('names a candidate object without taking its figures', async () => {
    await open('/xerite?erazi=LOC-0039')
    const area = await waitFor(panel)
    expect(within(area).getByText(/Yoxlanılacaq ehtimal/)).toBeInTheDocument()
    expect(area.textContent).not.toContain('₼')
  })

  it('says when two pins share one object, and keeps both pins', async () => {
    await open('/xerite?erazi=LOC-0018')
    const area = await waitFor(panel)
    expect(within(area).getByText('Bir maliyyə obyekti, bir neçə nöqtə')).toBeInTheDocument()
    expect(within(area).getByText(/Bibiheybət qəsəbəsi/)).toBeInTheDocument()
    expect(within(area).getAllByText('Koordinat yoxlanılmalıdır').length).toBeGreaterThan(0)
  })

  it('opens a month’s orders from the chart, tells a zero from a missing month, and goes back to the summary', async () => {
    const router = await open('/xerite?erazi=LOC-0046')
    await waitFor(panel)
    // December 2026 has not come yet: it cannot be opened.
    expect(document.querySelector('button[data-month="12"]')).toBeDisabled()
    await userEvent.click(document.querySelector('button[data-month="3"]')!)
    expect(params(router).get('sifay')).toBe('3')
    expect(params(router).get('bolme')).toBe('sifarisler')
    expect(screen.getByRole('tab', { name: 'Sifarişlər' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 3, name: 'Sifarişlər · Mart 2026' })).toBeInTheDocument()
    // Beta ordered nothing in March 2026, a month with figures: a zero.
    expect(screen.getByText('Sifariş verilməyib')).toBeInTheDocument()

    await choose('Ay', '7')
    expect(screen.getByRole('heading', { level: 3, name: 'Sifarişlər · İyul 2026' })).toBeInTheDocument()
    expect(screen.getByText('Məlumat yoxdur')).toBeInTheDocument()

    await choose('Ay', '5')
    const table = screen.getByRole('table')
    expect(within(table).getByText('Aylıq sifariş')).toBeInTheDocument()
    expect(within(table).getByText('50 ₼')).toBeInTheDocument()
    expect(within(table).getAllByText('Təsdiqlənib').length).toBeGreaterThan(0)
    expect(within(table).getByRole('link', { name: /Aylıq sifariş, May 2026/ })).toHaveAttribute('href', '/2026/5/obyekt/beta/sifaris')

    await userEvent.click(screen.getByRole('button', { name: 'İcmala qayıt' }))
    expect(screen.getByRole('tab', { name: 'İcmal' })).toHaveAttribute('aria-selected', 'true')
    expect(params(router).get('sifay')).toBeNull()
  })

  it('keeps the kind of order in the drill: outside-monthly orders have no approval', async () => {
    await open('/xerite?erazi=LOC-0049&nov=hamisi&bolme=sifarisler&sifay=5')
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Aylıqdan kənar')).toBeInTheDocument()
    expect(within(table).getAllByText('Ayrıca razılıqla').length).toBeGreaterThan(0)
  })

  it('closes the analysis with Escape and with its own button', async () => {
    const router = await open('/xerite?erazi=LOC-0049')
    await waitFor(panel)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(await screen.findByRole('heading', { level: 2, name: 'Ərazi analitikası' })).toBeInTheDocument()
    expect(params(router).get('erazi')).toBeNull()
  })

  it('filters by the area manager, shows the filter and lets go of a location it leaves out', async () => {
    const router = await open('/xerite?gorunus=siyahi&erazi=LOC-0049')
    await waitFor(panel)
    await choose('Ərazi rəhbəri', 'Abbasov Elmir')
    const expected = VISIBLE_LOCATIONS.filter((location) => location.managers.includes('Abbasov Elmir')).length
    expect(screen.getByText(`${expected} / 47 lokasiya`)).toBeInTheDocument()
    expect(document.querySelectorAll('button[data-location]')).toHaveLength(expected)
    expect(screen.getByRole('button', { name: 'Filtri sil: Ərazi rəhbəri: Abbasov Elmir' })).toBeInTheDocument()
    expect(params(router).get('erazi')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Hamısını göstər' }))
    expect(screen.getByText('47 lokasiya')).toBeInTheDocument()
  })

  it('searches by name, manager or id', async () => {
    await open('/xerite?gorunus=siyahi')
    await screen.findByText('47 lokasiya')
    await userEvent.type(screen.getByRole('searchbox'), 'nizami')
    expect(document.querySelectorAll('button[data-location]')).toHaveLength(1)
    expect(screen.getByText('1 / 47 lokasiya')).toBeInTheDocument()
  })

  it('lets one choose a single record from a circle of pins', async () => {
    const router = await open('/xerite')
    await screen.findByRole('region', { name: 'Ərazilər xəritəsi' })
    const circle = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-cluster]')
      if (!found) throw new Error('no circle yet')
      return found
    })
    const count = Number(circle.dataset.cluster)
    // The test page has no size, so zooming cannot part them: the circle lists its records to choose from.
    await act(async () => { circle.click() })
    const choices = await waitFor(() => {
      const found = document.querySelectorAll<HTMLButtonElement>('.x-cluster-list button')
      if (!found.length) throw new Error('no list yet')
      return found
    })
    expect(choices).toHaveLength(count)
    await act(async () => { choices[0].click() })
    expect(params(router).get('erazi')).toMatch(/^LOC-\d{4}$/)
  })

  it('says so when the basemap does not load, and keeps the pins', async () => {
    await open('/xerite')
    await screen.findByRole('region', { name: 'Ərazilər xəritəsi' })
    const tiles = await waitFor(() => {
      const found = document.querySelectorAll<HTMLImageElement>('img.leaflet-tile')
      if (!found.length) throw new Error('no tiles yet')
      return found
    })
    await act(async () => { tiles.forEach((tile) => tile.dispatchEvent(new Event('error'))) })
    expect(await screen.findByText(/Xəritə altlığı yüklənmədi/)).toBeInTheDocument()
    expect(document.querySelectorAll('.x-marker, .x-cluster').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: 'Yenidən' }))
    expect(screen.queryByText(/Xəritə altlığı yüklənmədi/)).not.toBeInTheDocument()
  })

  it('switches between the light and the dark theme on the map page', async () => {
    await open('/xerite')
    await screen.findByRole('heading', { level: 1, name: 'Ərazilər xəritəsi' })
    await userEvent.click(screen.getByRole('button', { name: 'Tünd' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Açıq' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('opens the overview with honest counts before a location is chosen', async () => {
    await open('/xerite')
    const overview = (await screen.findByRole('heading', { level: 2, name: 'Ərazi analitikası' })).closest('section')!
    expect(within(overview).getByText('Təhlili görmək üçün xəritədən ərazi seçin — və ya siyahıdan.')).toBeInTheDocument()
    const counts = within(overview).getAllByRole('definition').slice(0, 3).map((item) => item.textContent)
    // 47 places (48 records, LOC-0014 shown as LOC-0020), 4 linked (the test's links), 6 the source asks to check.
    expect(counts).toEqual(['47', '4', '6'])
    expect(within(overview).getByText('Mənbədə 48 qeyd; 1 təkrar qeyd ayrıca göstərilmir (LOC-0014 → LOC-0020).')).toBeInTheDocument()
  })
})

describe('one place, one pin: the duplicate the owner had hidden', () => {
  it('finds the place once, by its name or by either record’s id', async () => {
    await open('/xerite?gorunus=siyahi')
    await screen.findByText('47 lokasiya')
    const search = screen.getByRole('searchbox')
    await userEvent.type(search, 'Vətəndaş Qəbulu')
    expect([...document.querySelectorAll('button[data-location]')].map((row) => row.getAttribute('data-location'))).toEqual(['LOC-0020'])
    await userEvent.clear(search)
    await userEvent.type(search, 'LOC-0014')
    expect([...document.querySelectorAll('button[data-location]')].map((row) => row.getAttribute('data-location'))).toEqual(['LOC-0020'])
  })

  it('opens an older link to LOC-0014 on LOC-0020, and names the hidden record with its own coordinates', async () => {
    const router = await open('/xerite?erazi=LOC-0014')
    const area = await waitFor(panel)
    await waitFor(() => expect(params(router).get('erazi')).toBe('LOC-0020'))
    expect(within(area).getByRole('heading', { level: 2, name: LONG_NAME })).toBeInTheDocument()
    expect(within(area).getAllByText('LOC-0020').length).toBe(2)
    // The hidden record stays in the source, at its own full-precision coordinates.
    expect(within(area).getByText('Təkrar qeyd')).toBeInTheDocument()
    expect(within(area).getByText('LOC-0014')).toBeInTheDocument()
    expect(within(area).getByText('40.41383743286133, 49.85444259643555')).toBeInTheDocument()
    expect(within(area).getByText(/sahibin qərarı, 19 noyabr 2026/)).toBeInTheDocument()
    // Still a record the source asks to check; still without money.
    expect(within(area).getByText('Maliyyə məlumatları hələ uyğunlaşdırılmayıb')).toBeInTheDocument()
    expect(area.textContent).not.toContain('₼')
  })

  it('counts the same money with the duplicate hidden: four linked places, each object once', async () => {
    await open('/xerite?dovr=m11')
    const overview = (await screen.findByRole('heading', { level: 2, name: 'Ərazi analitikası' })).closest('section')!
    // November 2026, monthly: Alfa 120 + Beta 50 + (Delta has no monthly order) = 170 ₼ on the map, nothing left over.
    expect(within(overview).getByText('Xəritədəki 4 nöqtənin obyektləri')).toBeInTheDocument()
    expect(within(overview).getAllByText('170 ₼').length).toBeGreaterThan(0)
  })
})

describe('the card over a pin', () => {
  /** A pin drawn on its own (not in a circle) and not the chosen one. */
  async function aPin() {
    return waitFor(() => {
      const found = document.querySelector<HTMLElement>('.x-marker[data-location]:not(.is-selected)')
      if (!found) throw new Error('no pin yet')
      return found
    })
  }

  it('shows the name once, the area manager and the period’s figure — in a card of the page’s own, hidden from screen readers', async () => {
    await open('/xerite')
    const pin = await aPin()
    const location = AREA_LOCATIONS.find((item) => item.id === pin.dataset.location)!
    await act(async () => { pin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    const card = document.querySelector<HTMLElement>('[data-map-tip="pin"]')!
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('aria-hidden', 'true')
    expect(card.textContent!.split(location.name).length - 1).toBe(1)
    expect(card).toHaveTextContent(`Ərazi rəhbəri: ${location.manager ?? 'məlumat yoxdur'}`)
    expect(card).toHaveTextContent('Ətraflı baxmaq üçün klikləyin')
    // Not Leaflet's tooltip: nothing else describes the pin, so a screen reader hears its label once.
    expect(document.querySelector('.leaflet-tooltip')).toBeNull()
    expect(pin).not.toHaveAttribute('aria-describedby')
    expect(pin.getAttribute('aria-label')!.split(location.name).length - 1).toBe(1)

    await act(async () => { pin.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })) })
    expect(document.querySelector('[data-map-tip]')).toBeNull()
  })

  it('opens for the keyboard’s focus too, and Escape puts it away without closing the chosen area', async () => {
    const router = await open('/xerite?erazi=LOC-0049')
    await waitFor(panel)
    const pin = await aPin()
    await act(async () => { pin.focus() })
    const card = document.querySelector<HTMLElement>('[data-map-tip="pin"]')!
    expect(card).toHaveTextContent('Ətraflı baxmaq üçün Enter basın')
    fireEvent.keyDown(pin, { key: 'Escape' })
    expect(document.querySelector('[data-map-tip]')).toBeNull()
    expect(params(router).get('erazi')).toBe('LOC-0049')
    // The chosen pin carries its own name plate, whole: no card over it.
    const chosen = document.querySelector<HTMLElement>('.x-marker.is-selected')!
    expect(chosen.querySelector('.x-pin-label')).toHaveTextContent('Aeroport yolu')
    await act(async () => { chosen.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(document.querySelector('[data-map-tip]')).toBeNull()
  })

  it('lists a circle’s places once each', async () => {
    await open('/xerite')
    const circle = await waitFor(() => {
      const found = document.querySelector<HTMLElement>('[data-cluster]')
      if (!found) throw new Error('no circle yet')
      return found
    })
    await act(async () => { circle.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    const card = document.querySelector<HTMLElement>('[data-map-tip="cluster"]')!
    expect(card).toHaveTextContent(`${circle.dataset.cluster} ərazi bu yerdə`)
    const names = [...card.querySelectorAll('li')].map((item) => item.textContent)
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeLessThanOrEqual(5)
  })
})

describe('«Ərazilər xəritəsi», a page of its own', () => {
  const sidebar = () => screen.getByRole('complementary', { name: 'Əsas naviqasiya' })

  it('has one title and no «Müdiriyyət» trail, and the sidebar lights its own row only', async () => {
    await open('/xerite')
    expect(screen.queryByRole('navigation', { name: 'Yol' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Müdiriyyət' })).not.toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Ərazilər xəritəsi' })).toHaveAttribute('aria-current', 'page')
    expect(within(sidebar()).getByRole('link', { name: 'Müdiriyyət' })).not.toHaveAttribute('aria-current')
    expect([...sidebar().querySelectorAll('[aria-current]')].map((element) => element.textContent)).toEqual(['Ərazilər xəritəsi'])
  })

  it('opens straight from its address, view and all, and again the same after a reload', async () => {
    const first = await open('/xerite?il=2025&dovr=ytd&erazi=LOC-0049')
    expect(within(await waitFor(panel)).getByRole('heading', { level: 2, name: 'Aeroport yolu' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'İl' })).toHaveTextContent('2025')
    const address = `${first.state.location.pathname}${first.state.location.search}`
    cleanup()
    // A reload: a new router on the same address.
    await open(address)
    expect(within(await waitFor(panel)).getByRole('heading', { level: 2, name: 'Aeroport yolu' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'İl' })).toHaveTextContent('2025')
  })

  it('comes and goes with Back and Forward, and «Müdiriyyət» still opens the year screen', async () => {
    const router = createMemoryRouter(appRoutes(''), { initialEntries: ['/2026'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    await userEvent.click(within(sidebar()).getByRole('link', { name: 'Ərazilər xəritəsi' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ərazilər xəritəsi' }, { timeout: 8000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/xerite')
    expect(within(sidebar()).getByRole('link', { name: 'Müdiriyyət' })).not.toHaveAttribute('aria-current')

    await act(() => router.navigate(-1))
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'Müdiriyyət' })).toHaveAttribute('aria-current', 'true')
    expect(within(sidebar()).getByRole('link', { name: 'Ərazilər xəritəsi' })).not.toHaveAttribute('aria-current')

    await act(() => router.navigate(1))
    expect(await screen.findByRole('heading', { level: 1, name: 'Ərazilər xəritəsi' })).toBeInTheDocument()
    await userEvent.click(within(sidebar()).getByRole('link', { name: 'Müdiriyyət' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/2026')
  })

  it('is lit alone in the phone menu too, which the keyboard opens, uses and closes', async () => {
    const router = await open('/xerite')
    const button = screen.getByRole('button', { name: 'Menyunu aç' })
    await userEvent.click(button)
    const menu = screen.getByRole('dialog', { name: 'Menyu' })
    expect(within(menu).getByRole('link', { name: 'Ərazilər xəritəsi' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('link', { name: 'Müdiriyyət' })).not.toHaveAttribute('aria-current')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()

    await userEvent.click(button)
    within(screen.getByRole('dialog', { name: 'Menyu' })).getByRole('link', { name: 'Müdiriyyət' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'İllik icmal 2026' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/2026')
    expect(screen.queryByRole('dialog', { name: 'Menyu' })).not.toBeInTheDocument()
  })
})

describe('a year on the map', () => {
  it('opens the year whole when the address names no period: «İlin əvvəlindən» now, «Bütün il» for a finished year', async () => {
    await open('/xerite?erazi=LOC-0049')
    expect(screen.getByRole('combobox', { name: 'Dövr' })).toHaveTextContent('İlin əvvəlindən')
    cleanup()
    await open('/xerite?il=2025&erazi=LOC-0049')
    expect(screen.getByRole('combobox', { name: 'Dövr' })).toHaveTextContent('Bütün il')
  })
})

describe('the years on offer', () => {
  it('offers only the years the figures have — 2026 and 2025 — with no empty 2020–2024', async () => {
    await open('/xerite')
    await userEvent.click(screen.getByRole('combobox', { name: 'İl' }))
    const list = await screen.findByRole('listbox', { name: 'İl' })
    expect(within(list).getAllByRole('option').map((option) => option.dataset.value)).toEqual(['2026', '2025'])
  })

  it('falls back to the latest year for a year the figures do not have', async () => {
    await open('/xerite?il=2022')
    expect(screen.getByRole('combobox', { name: 'İl' })).toHaveTextContent('2026')
    expect(screen.queryByText(/2022/)).not.toBeInTheDocument()
  })
})
