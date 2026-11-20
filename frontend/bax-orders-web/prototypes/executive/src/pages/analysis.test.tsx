import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useFixture } from '../test/fixture'

/*
 * «Ətraflı analiz» on the fixture (see test/fixture.ts): the column totals over the matrix as a chart of their own,
 * the head row and first column that stay, the filters closed, the ready-made directions on one row, and the month
 * marks — with October 2026 approved for 150 ₼ and now 170 ₼ (Alfa 120 + Beta 50), so it moved after its approval.
 *
 * Objects × months, monthly orders, 2026: January–November but July; each month Alfa 120 and Beta 50 (170 ₼), April
 * 250 ₼ (Alfa 200), March 120 ₼ (Beta ordered nothing). Today is 11 November 2026: November is still running.
 */

;(globalThis as { __BAX_APPROVALS__?: unknown }).__BAX_APPROVALS__ = {
  months: { '2026-10': { state: 'approved', at: '2026-11-02T11:27+04:00', by: 'Rəhbər', amount: 150, lines: 2 } },
}
useFixture()
const { appRoutes } = await import('../routes')
const { computePivot, readAnalysis } = await import('../lib/pivot')

afterAll(() => {
  vi.useRealTimers()
  delete (globalThis as { __BAX_APPROVALS__?: unknown }).__BAX_APPROVALS__
})
beforeEach(() => window.localStorage.clear())

/** Opens the page and lets the frame give its heading the focus (a frame later), so it cannot take it mid-test. */
async function open(path = '/2026/analiz') {
  const router = createMemoryRouter(appRoutes(''), { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  const heading = await screen.findByRole('heading', { level: 1, name: 'Ətraflı analiz' })
  await waitFor(() => expect(heading).toHaveFocus())
  return router
}

const strip = () => document.querySelector<HTMLTableRowElement>('tr[data-chart="col-totals"]')!
const bars = () => [...document.querySelectorAll<HTMLButtonElement>('[data-bar]')]
const bar = (key: string) => document.querySelector<HTMLButtonElement>(`[data-bar="${key}"]`)!
const head = (key: string) => document.querySelector<HTMLTableCellElement>(`table[data-matrix] thead th[data-col="${key}"]`)!
const tipOf = (element: Element) => document.getElementById(element.getAttribute('aria-describedby')!)!

describe('the column totals over the matrix', () => {
  it('stands a bar over every column, in the same column of the same table, with an axis and short figures', async () => {
    await open()
    expect(strip()).toBeInTheDocument()
    const keys = bars().map((item) => item.dataset.bar)
    expect(keys).toEqual(['1', '2', '3', '4', '5', '6', '8', '9', '10', '11'])
    for (const item of bars()) {
      expect(item.closest('td')!.cellIndex).toBe(head(item.dataset.bar!).cellIndex)
    }
    expect(bar('1')).toHaveAccessibleName('Yanvar: 170 manat. Filtr kimi tətbiq et')
    expect(bar('4').querySelector('.strip-label')).toHaveTextContent('250')
    // Round steps up to the largest column (250 ₼): 0, 100, 200.
    expect([...strip().querySelectorAll('.strip-tick-label')].map((item) => item.textContent)).toEqual(['0', '100', '200'])
    expect(within(strip()).getByText(/Sütunların cəmi, qrafik: 10 sütun/)).toBeInTheDocument()
    // The tallest column at full scale, the others in proportion.
    expect(bar('4').parentElement!.style.getPropertyValue('--r')).toBe('1')
    expect(bar('3').parentElement!.style.getPropertyValue('--r')).toBe(String(120 / 250))
  })

  it('tells a column’s figures: its amount, its share, the month before — and «no data», never a per cent of nothing', async () => {
    await open()
    const april = tipOf(bar('4'))
    expect(april).toHaveTextContent('Aprel 2026')
    expect(april).toHaveTextContent('250 ₼')
    expect(april).toHaveTextContent(/Ümumi cəmdə payı: \d/)
    expect(april).toHaveTextContent('Marta görə: +108% (+130 ₼)')
    // August: July has no figures at all.
    expect(tipOf(bar('8'))).toHaveTextContent('İyul üçün məlumat yoxdur')
    expect(tipOf(bar('8'))).not.toHaveTextContent('%)')
  })

  it('is one stop for Tab, the arrows go from bar to bar, and Escape closes the tip', async () => {
    await open()
    expect(bars().filter((item) => item.tabIndex === 0)).toHaveLength(1)
    act(() => bar('1').focus())
    await userEvent.keyboard('{ArrowRight}')
    expect(bar('2')).toHaveFocus()
    expect(bars().filter((item) => item.tabIndex === 0)).toEqual([bar('2')])
    await userEvent.keyboard('{End}')
    expect(bar('11')).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(bar('1')).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(tipOf(bar('1'))).toHaveClass('invisible')
  })

  it('lights its column when a bar is pointed at, and its bar when a column’s head is', async () => {
    await open()
    fireEvent.pointerOver(bar('4'))
    expect(document.querySelectorAll('table[data-matrix] [data-col="4"].is-hot-col').length).toBeGreaterThan(3)
    expect(document.querySelectorAll('.strip-bar.is-dim')).toHaveLength(9)
    expect(tipOf(bar('4'))).toHaveClass('opacity-100')
    fireEvent.pointerOut(bar('4'))
    expect(document.querySelectorAll('.is-hot-col')).toHaveLength(0)

    fireEvent.pointerOver(head('6'))
    expect(bar('6').querySelector('.strip-bar')).not.toHaveClass('is-dim')
    expect(bar('5').querySelector('.strip-bar')).toHaveClass('is-dim')
  })

  it('marks the month the last month is compared with, and a running month only where its figure can still grow', async () => {
    await open()
    expect(bar('10').querySelector('.strip-bar')).toHaveClass('is-comparison')
    expect(screen.getByText('Müqayisə: Oktyabr 2026')).toBeInTheDocument()
    // Monthly orders: November's package is the month's plan, not a part of a month.
    expect(document.querySelector('.strip-bar.is-running')).toBeNull()
    // Named beside the chart, with the bars' own looks — not only in the key under the table.
    const key = screen.getByRole('list', { name: 'Qrafikin işarələri' })
    expect(within(key).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['müqayisə ayı'])
    expect(key.querySelector('.strip-key.is-comparison')).toBeInTheDocument()
    cleanup()

    await open('/2026/analiz?nov=hamisi')
    expect(bar('11').querySelector('.strip-bar')).toHaveClass('is-running')
    expect(head('11')).toHaveTextContent('davam edir')
    expect(tipOf(bar('11'))).toHaveTextContent(/Ay davam edir: rəqəmlər .+ yükləməsinədir/)
    expect(within(screen.getByRole('list', { name: 'Qrafikin işarələri' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['müqayisə ayı', 'davam edir'])
    // The running month is marked by its stripes and its words, never by the pointer's band.
    expect(document.querySelectorAll('.is-hot-col')).toHaveLength(0)
  })

  it('lets go of the lit column when the pointer leaves the table', async () => {
    await open()
    fireEvent.pointerOver(bar('4'))
    expect(document.querySelectorAll('.is-hot-col').length).toBeGreaterThan(0)
    fireEvent.pointerLeave(document.querySelector('[role="region"][aria-labelledby="matrix-caption"]')!)
    expect(document.querySelectorAll('.is-hot-col')).toHaveLength(0)
  })

  it('shows a filter a bar applies beside «Filtrlər», and takes it off in one click', async () => {
    await open()
    await userEvent.click(bar('4'))
    const chips = screen.getByRole('list', { name: 'Aktiv filtrlər' })
    expect(chips).toHaveAttribute('aria-live', 'polite')
    expect(within(chips).getByText('Ay: Aprel')).toBeInTheDocument()
    await userEvent.click(within(chips).getByRole('button', { name: 'Ay: Aprel filtrini sil' }))
    expect(screen.queryByRole('list', { name: 'Aktiv filtrlər' })).not.toBeInTheDocument()
    expect(screen.getByText('Bütün il, bütün obyekt və kateqoriyalar')).toBeInTheDocument()
  })

  it('grows and shrinks, and the page remembers the choice', async () => {
    await open()
    const table = document.querySelector<HTMLTableElement>('table[data-matrix]')!
    expect(table.style.getPropertyValue('--strip-h')).toBe('clamp(160px, 20vh, 220px)')
    await userEvent.click(screen.getByRole('button', { name: 'Böyüt' }))
    expect(table.style.getPropertyValue('--strip-h')).toBe('300px')
    expect(window.localStorage.getItem('baxorders-analiz-qrafik')).toBe('böyük')
    cleanup()

    await open()
    expect(document.querySelector<HTMLTableElement>('table[data-matrix]')!.style.getPropertyValue('--strip-h')).toBe('300px')
    await userEvent.click(screen.getByRole('button', { name: 'Kiçilt' }))
    expect(window.localStorage.getItem('baxorders-analiz-qrafik')).toBe('adi')
  })

  it('is not drawn in the table view; a table that fits reads in the page, its head row stuck to the window', async () => {
    await open('/2026/analiz?gorunus=cedvel')
    expect(document.querySelector('tr[data-chart]')).toBeNull()
    const region = document.querySelector('[role="region"][aria-labelledby="matrix-caption"]')!
    // No box of its own: one scrollbar, the page's.
    expect(region).not.toHaveAttribute('data-boxed')
    expect(region.className).not.toMatch(/overflow-auto|max-h-/)
    expect(region).not.toHaveAttribute('tabindex')
    // Under the phone's top bar, at the very top beside the sidebar.
    expect(head('1')).toHaveClass('sticky', 'top-14', 'xl:top-0')
    expect(document.querySelector('table[data-matrix] tbody th')).toHaveClass('sticky', 'left-0')
    expect(screen.getByRole('columnheader', { name: /Obyekt.*Ay · ₼/ })).toBeInTheDocument()
    // Nothing is under the sticky columns: no shadow on either side.
    expect(document.querySelector('table[data-matrix] tbody td[data-col="total"]')!.className).not.toMatch(/var\(--y-edge\)/)
    expect(document.querySelector('table[data-matrix] tbody th')!.className).not.toMatch(/var\(--y-edge\)/)
  })

  it('gives a table wider than the column a box of its own, with shadows only where columns are under the sticky ones', async () => {
    // jsdom has no layout: the table is told to be wider than its box.
    const wide = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.tagName === 'TABLE' ? 2000 : 0 })
    const room = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'region' ? 1000 : 0 })
    const scroll = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return this.getAttribute('role') === 'region' ? 2008 : 0 })
    try {
      await open('/2026/analiz?gorunus=cedvel')
      const region = document.querySelector<HTMLElement>('[role="region"][aria-labelledby="matrix-caption"]')!
      await waitFor(() => expect(region).toHaveAttribute('data-boxed'))
      expect(region).toHaveClass('overflow-auto')
      expect(region).toHaveAttribute('tabindex', '0')
      // The wheel goes on to the page at the box's end: no vertical overscroll containment.
      expect(region.className).not.toMatch(/overscroll-(y-)?contain/)
      expect(head('1')).toHaveClass('sticky', 'top-0')
      // At the left end: columns are under the right edge only.
      expect(document.querySelector('tbody td[data-col="total"]')!.className).toMatch(/var\(--y-edge\)/)
      expect(document.querySelector('table[data-matrix] tbody th')!.className).not.toMatch(/var\(--y-edge\)/)
      // Scrolled: under both.
      region.scrollLeft = 300
      fireEvent.scroll(region)
      await waitFor(() => expect(document.querySelector('table[data-matrix] tbody th')!.className).toMatch(/var\(--y-edge\)/))
      expect(document.querySelector('tbody td[data-col="total"]')!.className).toMatch(/var\(--y-edge\)/)
    } finally {
      wide.mockRestore()
      room.mockRestore()
      scroll.mockRestore()
    }
  })
})

describe('room for the result', () => {
  it('opens with the filters closed and says what the figures cover', async () => {
    await open()
    expect(document.getElementById('filter-fields')).toBeNull()
    expect(screen.getByRole('button', { name: /Filtrlər/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Bütün il, bütün obyekt və kateqoriyalar')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Filtrlər/ }))
    expect(document.getElementById('filter-fields')).toBeInTheDocument()
  })

  it('puts the ready-made directions on one row, with ‹ › for the ones out of sight', async () => {
    await open()
    const row = screen.getByRole('group', { name: 'Hazır analizlər' })
    expect(row).toHaveClass('preset-strip', 'overflow-x-auto')
    expect(within(row).getAllByRole('button')).toHaveLength(9)
    expect(within(row).getByRole('button', { name: 'Obyektlər × Aylar' })).toHaveAttribute('aria-pressed', 'true')
    // Nothing is out of sight on a page with no layout: the buttons keep their place, unseen.
    expect(screen.getByRole('button', { name: 'Növbəti hazır analizlər', hidden: true })).toHaveClass('invisible')
    expect(screen.getByRole('button', { name: 'Əvvəlki hazır analizlər', hidden: true })).toHaveClass('invisible')
  })
})

describe('the month marks and the latest month', () => {
  it('says beside the change when a month it stands on moved after its approval', async () => {
    await open()
    expect(document.querySelector('[data-drift="10"]')).toHaveTextContent(/^Oktyabr təsdiqdən sonra dəyişib: 150 → 170 ₼$/)
  })

  it('opens what a mark means on a tap and from the keyboard, with its own sign for a month that moved', async () => {
    await open()
    const october = within(document.querySelector('table[data-matrix] thead tr:last-child')!).getByRole('button', { name: 'Oktyabr: aylıq paketin təsdiqi' })
    expect(october.querySelector('svg')).toHaveClass('lucide-circle-alert')
    const tip = tipOf(october)
    expect(tip).toHaveTextContent('Təsdiqlənib, 2 noyabr · sonra dəyişib')
    expect(tip).toHaveTextContent('Təsdiqdə 150 ₼, indi 170 ₼.')
    await userEvent.click(october)
    expect(tip).toHaveClass('opacity-100')
    await userEvent.keyboard('{Escape}')
    expect(tip).toHaveClass('invisible')

    const january = within(document.querySelector('table[data-matrix] thead tr:last-child')!).getByRole('button', { name: 'Yanvar: aylıq paketin təsdiqi' })
    expect(january.querySelector('svg')).toHaveClass('lucide-check')
    // November waits for approval: the hourglass.
    const november = within(document.querySelector('table[data-matrix] thead tr:last-child')!).getByRole('button', { name: 'Noyabr: aylıq paketin təsdiqi' })
    expect(november.querySelector('svg')).toHaveClass('lucide-hourglass')
    expect(tipOf(november)).toHaveTextContent('Təsdiq gözləyir')
  })
})

describe('the figures', () => {
  it('stay as they were: the comparison months are only added beside them', () => {
    const analysis = readAnalysis(new URLSearchParams())
    const pivot = computePivot(analysis, 'monthly', 'previous')
    expect(pivot.total).toBe(1730)
    expect(pivot.latest).toBe(11)
    expect(pivot.latestAmount).toBe(170)
    expect(pivot.comparisonAmount).toBe(170)
    expect(pivot.comparisonMonths).toEqual([10])
    expect(pivot.cols.map((col) => col.total)).toEqual([170, 170, 120, 250, 170, 170, 170, 170, 170, 170])
    expect(computePivot(analysis, 'monthly', 'avg3').comparisonMonths).toEqual([8, 9, 10])
  })
})
