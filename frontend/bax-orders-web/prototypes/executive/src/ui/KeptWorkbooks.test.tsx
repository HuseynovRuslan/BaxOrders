import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFixture } from '../test/fixture'

/*
 * «Yüklənmiş Excel faylları» against a stand-in for the import service: the list as the service gives it, a download and
 * a return to an older workbook — both with the Rəhbər's code, the return checked before it is applied.
 */

useFixture()
// The server's build has no import key (owner, 2026-10-28): only the Rəhbər's code is asked.
vi.stubEnv('VITE_IMPORT_KEY', 'off')
const saveExcel = vi.fn()
vi.doMock('./backupDownload', () => ({ saveExcel }))
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) }
const { KeptWorkbooks, yearsLabel } = await import('./KeptWorkbooks')

const LIST = [
  { id: '20261124T180528186215-v12.xlsx', file: 'Sifarişlər v12.xlsx', at: '2026-11-24T18:05+04:00', size: 4_833_423, lines: 48240, years: [2022, 2023, 2024, 2025, 2026], current: true },
  { id: '20261111T144300000000-v9.xlsx', file: 'Sifarişlər v9.xlsx', at: '2026-11-11T14:43+04:00', size: 1_258_291, lines: null, years: null, current: false },
]
const CHECKED = {
  ok: true, mode: 'check', base: 'baza-1', editsLost: 0,
  report: { file: 'Sifarişlər v9.xlsx', lines: 12000, objects: 40, months: { '2025-01': { monthly: 100, outside: 0 } }, freeLines: 0, missingPrice: 0, mismatchedTotals: 0 },
  changes: { linesBefore: 48240, linesAfter: 12000, moved: [{ year: 2025, month: 1, monthName: 'Yanvar 2025', kind: 'monthly', before: 250, after: 100 }] },
}

type Call = { url: string; init?: RequestInit }
let calls: Call[] = []

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  calls = []
  saveExcel.mockClear()
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    if (url.endsWith('api/history')) return answer({ ok: true, workbooks: LIST })
    if (url.endsWith('api/history/excel')) {
      const { code } = JSON.parse(String(init?.body))
      if (code !== '4321') return answer({ error: 'Rəhbər kodu səhvdir.' }, 401)
      return new Response(new Uint8Array([80, 75, 3, 4]), { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })
    }
    if (url.includes('api/history/restore?mode=check')) return answer(CHECKED)
    if (url.endsWith('api/history/restore')) return answer({ ...CHECKED, mode: 'apply', importedAt: '2026-11-25T12:00+04:00' })
    return answer({ error: 'Tapılmadı.' }, 404)
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const row = (file: string) => screen.getByText(file).closest('li')!

describe('the kept workbooks', () => {
  it('lists every upload, newest first, with when, its lines and years, and which one the figures are from', async () => {
    render(<KeptWorkbooks editsSince={0} />)
    expect(await screen.findByText('Yüklənmiş Excel faylları (2)')).toBeInTheDocument()
    const current = row('Sifarişlər v12.xlsx')
    expect(current).toHaveTextContent('24 noyabr 2026, 18:05 · 48.240 sətir · 2022–2026 · 4,6 MB')
    expect(current).toHaveTextContent('Saytdakı rəqəmlər bu fayldandır')
    // The figures are this file's, unedited: nothing to go back to.
    expect(within(current).queryByRole('button', { name: /Bu versiyaya qayıt/ })).not.toBeInTheDocument()
    const older = row('Sifarişlər v9.xlsx')
    // Uploaded before notes were kept: no lines or years are made up.
    expect(older).toHaveTextContent('11 noyabr 2026, 14:43 · 1,2 MB')
    expect(older).not.toHaveTextContent('sətir')
    expect(within(older).getByRole('button', { name: /Bu versiyaya qayıt/ })).toBeInTheDocument()
  })

  it('offers the current file back when the site was edited after it', async () => {
    render(<KeptWorkbooks editsSince={3} />)
    const current = (await screen.findByText('Sifarişlər v12.xlsx')).closest('li')!
    expect(current).toHaveTextContent('(sonra saytda 3 dəyişiklik)')
    expect(within(current).getByRole('button', { name: /Bu versiyaya qayıt/ })).toBeInTheDocument()
  })

  it('downloads a file only with the Rəhbər’s code, and says why not', async () => {
    render(<KeptWorkbooks editsSince={0} />)
    await userEvent.click(within(await screen.findByText('Sifarişlər v9.xlsx').then((item) => item.closest('li')!)).getByRole('button', { name: /Endir/ }))
    const dialog = screen.getByRole('dialog', { name: 'Excel faylını endir' })
    const submit = within(dialog).getByRole('button', { name: 'Endir' })
    expect(submit).toBeDisabled()

    await userEvent.type(within(dialog).getByLabelText('Rəhbər kodu'), '1111')
    await userEvent.click(submit)
    expect(await within(dialog).findByText('Rəhbər kodu səhvdir.')).toBeInTheDocument()
    expect(saveExcel).not.toHaveBeenCalled()

    await userEvent.clear(within(dialog).getByLabelText('Rəhbər kodu'))
    await userEvent.type(within(dialog).getByLabelText('Rəhbər kodu'), '4321')
    await userEvent.click(submit)
    expect(await within(dialog).findByText('Endirildi: «Sifarişlər v9.xlsx».')).toBeInTheDocument()
    const request = calls.filter((call) => call.url.endsWith('api/history/excel')).at(-1)!
    expect(request.init?.method).toBe('POST')
    expect(JSON.parse(String(request.init?.body))).toEqual({ id: '20261111T144300000000-v9.xlsx', code: '4321' })
    expect(saveExcel).toHaveBeenCalledWith(new Uint8Array([80, 75, 3, 4]), 'Sifarişlər v9.xlsx')
  })

  it('brings an older file back in two steps: what would change first, then — against those figures — the change', async () => {
    render(<KeptWorkbooks editsSince={0} />)
    await userEvent.click(within(await screen.findByText('Sifarişlər v9.xlsx').then((item) => item.closest('li')!)).getByRole('button', { name: /Bu versiyaya qayıt/ }))
    const dialog = screen.getByRole('dialog', { name: 'Bu versiyaya qayıt' })
    await userEvent.type(within(dialog).getByLabelText('Rəhbər kodu'), '4321')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yoxla' }))

    expect(await within(dialog).findByText('Yoxlandı — hələ heç nə dəyişməyib.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Yanvar 2025, aylıq/)).toBeInTheDocument()
    const check = calls.find((call) => call.url.includes('history/restore?mode=check'))!
    expect(JSON.parse(String(check.init?.body))).toEqual({ id: '20261111T144300000000-v9.xlsx', code: '4321' })

    await userEvent.click(within(dialog).getByRole('button', { name: 'Təsdiq et və qayıt' }))
    expect(await within(dialog).findByText('Qaytarıldı: rəqəmlər hamı üçün bu faylın rəqəmləridir.')).toBeInTheDocument()
    const apply = calls.find((call) => call.url.endsWith('history/restore'))!
    expect((apply.init?.headers as Record<string, string>)['X-Base']).toBe('baza-1')
    expect(within(dialog).getByRole('button', { name: 'Yeni rəqəmlərlə aç' })).toBeInTheDocument()
  })

  it('says so when the list cannot be had', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    render(<KeptWorkbooks editsSince={0} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Faylların siyahısı alınmadı: Serverə qoşulmaq olmadı.')
  })
})

describe('yearsLabel', () => {
  it('joins a run of years and names them one by one when one is missing', () => {
    expect(yearsLabel([2022, 2023, 2024])).toBe('2022–2024')
    expect(yearsLabel([2023, 2025])).toBe('2023, 2025')
    expect(yearsLabel([2026])).toBe('2026')
  })
})
