import { afterAll, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { strFromU8, unzipSync } from 'fflate'
import { buildFixture, FIXTURE_TODAY, useFixture } from '../test/fixture'

useFixture()
const backup = await import('./backup')
const model = await import('./model')
const { appRoutes } = await import('../routes')

afterAll(() => vi.useRealTimers())

const fixture = buildFixture()
const unescape = (value: string) => value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

/** The file read back the plain way: every row of a sheet as its cells by column, a formula beside its value. */
function read(bytes: Uint8Array) {
  const files = unzipSync(bytes)
  const text = (name: string) => strFromU8(files[name])
  const strings = [...text('xl/sharedStrings.xml').matchAll(/<si><t[^>]*>([^<]*)<\/t><\/si>/g)].map((match) => unescape(match[1]))
  const sheet = (name: string) => [...text(name).matchAll(/<row r="\d+">(.*?)<\/row>/g)].map(([, cells]) => {
    const row: Record<string, string | number> = {}
    for (const [, column, attributes, formula, value] of cells.matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<f>([^<]*)<\/f>)?<v>([^<]*)<\/v><\/c>/g)) {
      row[column] = attributes.includes('t="s"') ? strings[Number(value)] : Number(value)
      if (formula) row[`${column}=`] = formula
    }
    return row
  })
  return { names: Object.keys(files), text, main: sheet('xl/worksheets/sheet1.xml'), notes: sheet('xl/worksheets/sheet2.xml').map((row) => row.A) }
}

describe('«Excel kimi endir»: the figures on the site as the workbook the import reads', () => {
  const file = backup.siteBackup(FIXTURE_TODAY)
  const { names, text, main, notes } = read(file.bytes)

  it('is an xlsx with the «Əsas» sheet the import reads and a «Qeyd» sheet beside it', () => {
    expect(names).toEqual(expect.arrayContaining([
      '[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/sharedStrings.xml',
      'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
    ]))
    expect(text('xl/workbook.xml')).toContain('<sheet name="Əsas" sheetId="1" r:id="rId1"/><sheet name="Qeyd" sheetId="2" r:id="rId2"/>')
    expect(file.fileName).toBe('Sifarisler_ehtiyat_2026-11-11_1200.xlsx')
  })

  it('heads its columns as the owner’s book does, the order kind in «Sifariş növü»', () => {
    expect(Object.values(main[0])).toEqual([...backup.BACKUP_HEADINGS])
  })

  it('writes every line once, as the site holds it, «Cəmi» a formula with the site’s amount', () => {
    expect(main).toHaveLength(fixture.lines.length + 1)
    expect(file.lines).toBe(fixture.lines.length)
    // l1: Alfa's January 2025 order, 10 ədəd × 10 ₼; the date the 1st of January 2025 (45658), shown as «01.2025».
    // No «Model/Kod» (E) and no «Cavabdeh şəxs» (M): the site keeps neither.
    expect(main[1]).toEqual({
      A: 'Təmizlik', B: 'Ləvazimat', C: 'Bez', D: 'Bez', F: 10, G: 'ədəd', H: 10, I: 100, 'I=': 'F2*H2', J: 'Cleanfix', K: 'Alfa', L: 45658, N: 'Aylıq sifariş',
    })
    expect(text('xl/styles.xml')).toContain('formatCode="mm.yyyy"')
    // The zero line stays a zero, with its quantity; the outside-monthly lines say so.
    const zero = main.find((row) => row.D === 'Gübrə' && row.F === 3)
    expect(zero).toMatchObject({ H: 0, I: 0, J: 'Progres', K: 'Alfa', L: backup.excelMonth(2026, 2) })
    expect(main.filter((row) => row.N === 'Aylıqdan kənar')).toHaveLength(3)
  })

  it('adds up, month by month and kind by kind, to the figures on the site', () => {
    const fromFile = new Map<string, number>()
    for (const row of main.slice(1)) {
      const key = `${row.L}|${row.N}`
      fromFile.set(key, (fromFile.get(key) ?? 0) + Number(row.I))
    }
    const onSite = new Map<string, number>()
    for (const line of model.linesOfEveryYear) {
      const key = `${backup.excelMonth(line.year, line.month)}|${backup.KIND_LABELS[line.type]}`
      onSite.set(key, (onSite.get(key) ?? 0) + line.amount)
    }
    expect(fromFile).toEqual(onSite)
    expect(fromFile.get(`${backup.excelMonth(2026, 4)}|Aylıq sifariş`)).toBe(250)
    expect(fromFile.has(`${backup.excelMonth(2026, 7)}|Aylıq sifariş`)).toBe(false)
  })

  it('says in «Qeyd» what it is and what the site does not keep', () => {
    expect(notes).toEqual(expect.arrayContaining([
      'Saytdakı məlumatın ehtiyat nüsxəsi',
      'Endirilib: 11 noyabr 2026, 12:00',
      'Mənbə: Excel «fixture.xlsx»; son yeniləmə: 11 noyabr 2026, 14:43',
      `Sətirlər: ${fixture.lines.length}`,
      'İllər: 2025, 2026',
      '• «Cavabdeh şəxs» sütunu boşdur.',
      // «Gamma» never ordered: a workbook holds order lines only.
      '• Sifarişi olmayan 1 obyekt bu faylda yoxdur: fayl yalnız sifariş sətirlərini saxlayır.',
    ]))
    expect(notes.some((note) => String(note).includes('mal (saytda siyahıya əlavə edilib)'))).toBe(false)
    expect(notes.some((note) => String(note).startsWith('• «Model/Kod»'))).toBe(false)
  })
})

describe('two products of one name in one sub-category', () => {
  it('codes every one but the last the lines come to, so the import keeps them apart under the same names', () => {
    const [first] = model.linesOfEveryYear
    const bez = model.products.get('p1')!
    const products = new Map([
      ['bel', { ...bez, id: 'bel', name: 'Bel' }],
      ['bel--bez', { ...bez, id: 'bel--bez', name: 'BEL ' }],
      ['bel-2', { ...bez, id: 'bel-2', name: 'Bel', leafId: 'r2--m--l' }],
    ])
    const lines = ['bel', 'bel-2', 'bel--bez', 'bel'].map((productId, index) => ({ ...first, id: `x${index}`, productId }))
    expect([...backup.twinCodes(lines, products)]).toEqual(['bel'])
    const rows = backup.backupRows(lines, { products, categories: model.categories, sites: model.sites })
    expect(rows.map((row) => row.model)).toEqual(['bel', '', '', 'bel'])
  })
})

describe('what the file will not hold', () => {
  const row: import('./backup').BackupRow = {
    root: 'Təmizlik', mid: 'Ləvazimat', leaf: 'Bez', name: 'Bez', model: '', qty: 1, unit: 'ədəd', price: 2, amount: 2, supplier: 'Qala Baza',
    site: 'Alfa', year: 2026, month: 1, kind: 'monthly',
  }

  it('escapes what XML would read as markup, and drops what XML cannot hold', () => {
    const { main } = read(backup.backupWorkbook([{ ...row, name: 'Boya <ağ> & "mat"\u0001' }], [], FIXTURE_TODAY))
    expect(main[1].D).toBe('Boya <ağ> & "mat"')
  })

  it('refuses a figure that is not a number, and a line whose product it cannot name', () => {
    expect(() => backup.backupWorkbook([{ ...row, amount: Number.NaN }], [], FIXTURE_TODAY)).toThrow(backup.BackupError)
    const [line] = model.linesOfEveryYear
    expect(() => backup.backupRows([{ ...line, productId: 'yoxdur' }], model)).toThrow('sətrinin malı məlumatda tapılmadı')
  })

  it('counts free internal supply as the import does: Qala Baza with no amount', () => {
    expect(backup.isFree({ supplier: ' qala  BAZA ', amount: 0 })).toBe(true)
    expect(backup.isFree({ supplier: 'Qala Baza', amount: 12 })).toBe(false)
    expect(backup.isFree({ supplier: 'Progres', amount: 0 })).toBe(false)
  })
})

describe('the button under «Yenilənmə tarixçəsi»', () => {
  it('hands the file to the browser and says what it saved', async () => {
    const created = vi.fn((_: Blob) => 'blob:ehtiyat')
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() })
    const clicked: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download) })

    render(<RouterProvider router={createMemoryRouter(appRoutes(''), { initialEntries: ['/'] })} />)
    const history = await screen.findByRole('region', { name: 'Yenilənmə tarixçəsi' })
    await userEvent.click(within(history).getByRole('button', { name: 'Excel kimi endir' }))

    expect(await within(history).findByText(`Endirildi: «Sifarisler_ehtiyat_2026-11-11_1200.xlsx», ${fixture.lines.length} sətir.`)).toBeInTheDocument()
    expect(clicked).toEqual(['Sifarisler_ehtiyat_2026-11-11_1200.xlsx'])
    expect(created.mock.calls[0][0].type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    click.mockRestore()
  })
})
