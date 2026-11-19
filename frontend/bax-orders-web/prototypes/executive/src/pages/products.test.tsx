import { afterAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useFixture } from '../test/fixture'

// «Mallar» on the fixture's two products: «Bez» (Təmizlik › Ləvazimat › Bez) and «Gübrə» (Yaşıllıq › Torpaq › Gübrə).
useFixture()
const { appRoutes } = await import('../routes')

// jsdom has the <dialog> element but not its modal methods: opened and closed by the attribute, as a browser does.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }

afterAll(() => vi.useRealTimers())

async function open(path: string) {
  render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: [path] })} />)
  await screen.findByRole('heading', { level: 1, name: 'Mallar' })
  return screen.getByRole('region', { name: 'Mallar' })
}

const names = (table: HTMLElement) => within(table).queryAllByRole('rowheader').map((cell) => cell.querySelector('span')?.textContent)

async function choose(name: string, label: string) {
  await userEvent.click(screen.getByRole('combobox', { name }))
  await userEvent.click(within(screen.getByRole('listbox', { name })).getByRole('option', { name: label }))
}

describe('«Mallar»', () => {
  it('lists every product of the year with its price, amount and lines, under both years', async () => {
    const table = await open('/2026/mallar')
    expect(names(table)).toEqual(['Bez', 'Gübrə'])
    const gubre = within(table).getByRole('rowheader', { name: /Gübrə/ }).closest('tr')!
    // 9 lines of 50 ₼ and one free line in 2026; the latest price, November's, per kg.
    expect(gubre).toHaveTextContent('10,00 ₼ / kq')
    expect(gubre).toHaveTextContent('Noyabr')
    expect(gubre).toHaveTextContent('450 ₼')
    expect(within(gubre).getByRole('button', { name: 'Qiymət' })).toBeInTheDocument()
    expect(within(gubre).getByRole('button', { name: 'Düzəlt' })).toBeInTheDocument()
    expect(within(gubre).getByRole('button', { name: 'Sil' })).toBeInTheDocument()
  })

  it('finds by name or category, filters by category with each list opening the next, and sorts', async () => {
    const table = await open('/2026/mallar')
    const search = screen.getByRole('searchbox')
    await userEvent.type(search, 'güb')
    expect(names(table)).toEqual(['Gübrə'])
    expect(screen.getByText('1 mal tapıldı')).toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'ləvazimat')
    expect(names(table)).toEqual(['Bez'])
    await userEvent.clear(search)

    expect(screen.getByRole('combobox', { name: 'Orta kateqoriya' })).toBeDisabled()
    await choose('Ana kateqoriya', 'Yaşıllıq')
    expect(names(table)).toEqual(['Gübrə'])
    expect(screen.getByRole('combobox', { name: 'Orta kateqoriya' })).toBeEnabled()
    expect(screen.getByRole('combobox', { name: 'Alt kateqoriya' })).toBeDisabled()
    await choose('Ana kateqoriya', 'Hamısı')
    expect(names(table)).toEqual(['Bez', 'Gübrə'])

    await choose('Sırala', 'Məbləğ')
    expect(screen.getByRole('combobox', { name: 'Sırala' })).toHaveTextContent('Məbləğ')
    // Bez 1.340 ₼, Gübrə 450 ₼: the largest first.
    expect(names(table)).toEqual(['Bez', 'Gübrə'])
  })

  it('opens the other year’s list from «İl»', async () => {
    await open('/2026/mallar')
    await choose('İl', '2025')
    expect(await screen.findByText(/Son qiymət və məbləğ 2025 ilinin sifarişlərindəndir/)).toBeInTheDocument()
  })

  it('offers the units in use under «Vahid» of a new product, and keeps any typed', async () => {
    await open('/2026/mallar')
    await userEvent.click(screen.getByRole('button', { name: 'Mal əlavə et' }))
    const dialog = await screen.findByRole('dialog', { name: 'Mal əlavə et' })
    const unit = within(dialog).getByRole('combobox', { name: 'Vahid' })
    expect(unit).toHaveValue('ədəd')
    unit.focus()
    await userEvent.keyboard('{ArrowDown}')
    const list = within(dialog).getByRole('listbox', { name: 'Vahid' })
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['ədəd', 'kq'])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(unit).toHaveValue('kq')
    await userEvent.clear(unit)
    await userEvent.type(unit, 'qutu')
    expect(unit).toHaveValue('qutu')
  })
})
