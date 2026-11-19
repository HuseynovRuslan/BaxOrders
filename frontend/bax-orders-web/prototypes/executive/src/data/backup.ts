import { strToU8, zipSync } from 'fflate'
import { monthName, quantity } from '../lib/format'
import { updatedText } from '../lib/year'
import {
  categories, DATA_EDITS, DATA_SOURCE, linesOfEveryYear, products, sites, YEARS, type Category, type Line, type Product, type Site,
} from './model'

/*
 * «Excel kimi endir» (owner, 2026-11-17): the figures on the site, saved as an Excel file before a new workbook replaces
 * them. The file is the workbook the «Excel yüklə» button reads (scripts/import_workbook.py): one «Əsas» sheet, its
 * columns found by their headings, the order kind in «Sifariş növü». Uploaded again, it gives the same lines and the same
 * month figures: every line is written as the site holds it — edits made in «Mallar» included — in the order it holds
 * them, so the products come back under the same ids.
 *
 * Nothing is invented. What the site does not keep is not in the file either, and its «Qeyd» sheet says so: the day of
 * an order (the «Tarix» cell holds the 1st of its month and shows the month and year only), the responsible person, the
 * size apart from the product's name, and the model code. One exception, said there too: two products of one name in one
 * sub-category (the workbook told them apart by a model code the import did not keep) would come back as one, so the
 * first of the two carries its site code in «Model/Kod» — the import then keeps them apart, under the same ids.
 */

/** The headings the import finds its columns by, in the order the file writes them. */
export const BACKUP_HEADINGS = [
  'Ana kateqoriya', 'Orta kateqoriya', 'Alt kateqoriya', 'Malın adı', 'Model/Kod', 'Miqdarı', 'Ö/V', 'Qiyməti', 'Cəmi',
  'Şirkət', 'Obyekt', 'Tarix', 'Cavabdeh şəxs', 'Sifariş növü',
] as const

/** The order kinds as the workbook writes them. */
export const KIND_LABELS = { monthly: 'Aylıq sifariş', outside: 'Aylıqdan kənar' } as const

export interface BackupRow {
  root: string
  mid: string
  leaf: string
  name: string
  /** Empty, but for the first of two products of one name in one sub-category: its site code (see above). */
  model: string
  qty: number
  unit: string
  price: number
  amount: number
  supplier: string
  site: string
  year: number
  month: number
  kind: Line['type']
}

/** A note line for the «Qeyd» sheet; a title is set in bold. */
export type BackupNote = string | { title: string }

/** Why the file could not be made, in the owner's words. */
export class BackupError extends Error {
  override name = 'BackupError'
}

/** The model gives a line with no company the name «Göstərilməyib»; the file leaves its «Şirkət» empty, as it came. */
const NO_SUPPLIER = 'gosterilmeyib'

/** As the import compares names: case and spaces only. */
const fold = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase().replaceAll('i\u0307', 'i')

/** Internal supply from Qala Baza with no amount: free (D-45, D-46), as the import counts it. */
export const isFree = (row: Pick<BackupRow, 'supplier' | 'amount'>) => fold(row.supplier) === 'qala baza' && row.amount === 0

/**
 * The products to write a «Model/Kod» for: of products sharing a name in one sub-category, every one but the last the
 * lines come to. The import names a product by its name, size and model, and calls the second of two alike by its name
 * alone when that one has no model — so the first needs a code to stay apart, and the last must have none to keep its
 * name. The import never makes more than two alike, nor do the site's edits (a name is unique in its sub-category).
 */
export function twinCodes(lines: readonly Line[], products: ReadonlyMap<string, Product>): Set<string> {
  const seen = new Map<string, string[]>()
  for (const line of lines) {
    const product = products.get(line.productId)
    if (!product) continue
    const key = `${product.leafId}|${fold(product.name)}`
    const ids = seen.get(key) ?? []
    if (!ids.includes(product.id)) ids.push(product.id)
    seen.set(key, ids)
  }
  return new Set([...seen.values()].flatMap((ids) => ids.slice(0, -1)))
}

/** Every line as a row of the file, in the order the site holds them. */
export function backupRows(
  lines: readonly Line[],
  lookup: { products: ReadonlyMap<string, Product>; categories: ReadonlyMap<string, Category>; sites: ReadonlyMap<string, Site> },
): BackupRow[] {
  const coded = twinCodes(lines, lookup.products)
  return lines.map((line) => {
    const product = lookup.products.get(line.productId)
    const site = lookup.sites.get(line.siteId)
    const [root, mid, leaf] = [product?.rootId, product?.midId, product?.leafId].map((id) => (id ? lookup.categories.get(id)?.name : undefined))
    if (!product || !site || !root || !mid || !leaf) {
      throw new BackupError(`«${line.id}» sətrinin ${!product ? 'malı' : !site ? 'obyekti' : 'kateqoriyası'} məlumatda tapılmadı.`)
    }
    return {
      root, mid, leaf, name: product.name, model: coded.has(product.id) ? product.id : '', qty: line.qty, unit: line.unit, price: line.price, amount: line.amount,
      supplier: line.supplierId === NO_SUPPLIER ? '' : line.supplier, site: site.name, year: line.year, month: line.month, kind: line.type,
    }
  })
}

/* ---- The xlsx itself: a few XML parts in a zip ------------------------------------------------------------------- */

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const COLUMNS = 'ABCDEFGHIJKLMN'
const LAST_COLUMN = COLUMNS.at(-1)
/** Column widths in characters, by heading. */
const WIDTHS = [18, 20, 22, 44, 12, 10, 8, 11, 13, 22, 24, 10, 16, 16]
/** The styles of `STYLES`: 1 a heading, 2 a month and year, 3 money, 4 wrapped text. */
const STYLE = { heading: 1, month: 2, money: 3, wrap: 4 } as const

const STYLES = `${XML_HEAD}<styleSheet xmlns="${MAIN}">`
  + '<numFmts count="1"><numFmt numFmtId="164" formatCode="mm.yyyy"/></numFmts>'
  + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="5">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>'

// Characters XML 1.0 cannot hold: dropped rather than let them break the file.
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g
const escape = (value: string) => value.replace(NOT_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A number as the cell stores it; a figure that is not a number would make a file that lies, so none is written. */
function numberText(value: number, where: string) {
  if (!Number.isFinite(value)) throw new BackupError(`${where}: rəqəm deyil.`)
  return String(value)
}

/** The 1st of a month as Excel counts days (from 30 December 1899). */
export const excelMonth = (year: number, month: number) => (Date.UTC(year, month - 1, 1) - Date.UTC(1899, 11, 30)) / 86_400_000

/** Each text once, by its place in the list: what Excel itself writes. */
class SharedStrings {
  private readonly places = new Map<string, number>()
  private readonly list: string[] = []
  private uses = 0

  place(value: string) {
    this.uses++
    let at = this.places.get(value)
    if (at === undefined) {
      at = this.list.length
      this.places.set(value, at)
      this.list.push(value)
    }
    return at
  }

  xml() {
    const items = this.list.map((value) => `<si><t${/^\s|\s$/.test(value) ? ' xml:space="preserve"' : ''}>${escape(value)}</t></si>`)
    return `${XML_HEAD}<sst xmlns="${MAIN}" count="${this.uses}" uniqueCount="${this.list.length}">${items.join('')}</sst>`
  }
}

function textCell(strings: SharedStrings, ref: string, value: string, style = 0) {
  if (!value) return ''
  return `<c r="${ref}"${style ? ` s="${style}"` : ''} t="s"><v>${strings.place(value)}</v></c>`
}

function numberCell(ref: string, value: number, where: string, style = 0) {
  return `<c r="${ref}"${style ? ` s="${style}"` : ''}><v>${numberText(value, where)}</v></c>`
}

function mainSheet(rows: readonly BackupRow[], strings: SharedStrings) {
  const last = rows.length + 1
  const heading = BACKUP_HEADINGS.map((label, index) => textCell(strings, `${COLUMNS[index]}1`, label, STYLE.heading)).join('')
  const body = rows.map((row, index) => {
    const r = index + 2
    const where = `${r}-ci sətir`
    return `<row r="${r}">`
      + textCell(strings, `A${r}`, row.root) + textCell(strings, `B${r}`, row.mid) + textCell(strings, `C${r}`, row.leaf)
      + textCell(strings, `D${r}`, row.name) + textCell(strings, `E${r}`, row.model)
      + numberCell(`F${r}`, row.qty, where) + textCell(strings, `G${r}`, row.unit) + numberCell(`H${r}`, row.price, where)
      // «Cəmi» is a formula, as in the owner's book, with the site's amount as its value.
      + `<c r="I${r}" s="${STYLE.money}"><f>F${r}*H${r}</f><v>${numberText(row.amount, where)}</v></c>`
      + textCell(strings, `J${r}`, row.supplier) + textCell(strings, `K${r}`, row.site)
      + numberCell(`L${r}`, excelMonth(row.year, row.month), where, STYLE.month)
      + textCell(strings, `N${r}`, KIND_LABELS[row.kind])
      + '</row>'
  }).join('')
  const cols = WIDTHS.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')
  return `${XML_HEAD}<worksheet xmlns="${MAIN}" xmlns:r="${REL}">`
    + `<dimension ref="A1:${LAST_COLUMN}${last}"/>`
    + '<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + `<cols>${cols}</cols>`
    + `<sheetData><row r="1">${heading}</row>${body}</sheetData>`
    + `<autoFilter ref="A1:${LAST_COLUMN}${last}"/>`
    + '</worksheet>'
}

function noteSheet(notes: readonly BackupNote[], strings: SharedStrings) {
  const rows = notes.map((note, index) => {
    const r = index + 1
    const cell = typeof note === 'string' ? textCell(strings, `A${r}`, note, STYLE.wrap) : textCell(strings, `A${r}`, note.title, STYLE.heading)
    return `<row r="${r}">${cell}</row>`
  }).join('')
  return `${XML_HEAD}<worksheet xmlns="${MAIN}" xmlns:r="${REL}">`
    + `<dimension ref="A1:A${Math.max(notes.length, 1)}"/>`
    + '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    + '<sheetFormatPr defaultRowHeight="15"/>'
    + '<cols><col min="1" max="1" width="110" customWidth="1"/></cols>'
    + `<sheetData>${rows}</sheetData>`
    + '</worksheet>'
}

/** The xlsx file: «Əsas» with every row, «Qeyd» with what the file is. */
export function backupWorkbook(rows: readonly BackupRow[], notes: readonly BackupNote[], madeAt: Date): Uint8Array {
  const strings = new SharedStrings()
  const main = mainSheet(rows, strings)
  const note = noteSheet(notes, strings)
  const sheet = 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
  const parts: Record<string, string> = {
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${sheet}"/>`
      + `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="${sheet}"/>`
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
      + '</Types>',
    '_rels/.rels': `${XML_HEAD}<Relationships xmlns="${PACKAGE_REL}">`
      + `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>`
      + '</Relationships>',
    'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${MAIN}" xmlns:r="${REL}">`
      + '<bookViews><workbookView activeTab="0"/></bookViews>'
      + '<sheets><sheet name="Əsas" sheetId="1" r:id="rId1"/><sheet name="Qeyd" sheetId="2" r:id="rId2"/></sheets>'
      + `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Əsas'!$A$1:$${LAST_COLUMN}$${rows.length + 1}</definedName></definedNames>`
      + '</workbook>',
    'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="${PACKAGE_REL}">`
      + `<Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/>`
      + `<Relationship Id="rId2" Type="${REL}/worksheet" Target="worksheets/sheet2.xml"/>`
      + `<Relationship Id="rId3" Type="${REL}/styles" Target="styles.xml"/>`
      + `<Relationship Id="rId4" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>`
      + '</Relationships>',
    'xl/styles.xml': STYLES,
    'xl/sharedStrings.xml': strings.xml(),
    'xl/worksheets/sheet1.xml': main,
    'xl/worksheets/sheet2.xml': note,
  }
  return zipSync(Object.fromEntries(Object.entries(parts).map(([name, xml]) => [name, strToU8(xml)])), { level: 6, mtime: madeAt })
}

/* ---- The site's figures as that file ------------------------------------------------------------------------------- */

const two = (value: number) => String(value).padStart(2, '0')

/** «Sifarisler_ehtiyat_2026-11-17_1405.xlsx»: plain letters, so every system and the import's history keep the name. */
export function backupFileName(madeAt: Date, demo = DATA_SOURCE.kind === 'demo') {
  const day = `${madeAt.getFullYear()}-${two(madeAt.getMonth() + 1)}-${two(madeAt.getDate())}`
  return `Sifarisler_${demo ? 'demo' : 'ehtiyat'}_${day}_${two(madeAt.getHours())}${two(madeAt.getMinutes())}.xlsx`
}

/** What the file is and what it leaves out, for its «Qeyd» sheet. */
export function backupNotes(rows: readonly BackupRow[], madeAt: Date): BackupNote[] {
  const free = rows.filter(isFree).length
  const ordered = new Set(linesOfEveryYear.map((line) => line.productId))
  const unordered = [...products.values()].filter((product) => !ordered.has(product.id)).length
  const supplied = new Set(linesOfEveryYear.map((line) => line.siteId))
  const idle = [...sites.values()].filter((site) => !supplied.has(site.id)).length
  const coded = new Set(rows.map((row) => row.model).filter(Boolean)).size
  const made = `${madeAt.getDate()} ${monthName(madeAt.getMonth() + 1).toLocaleLowerCase('az')} ${madeAt.getFullYear()}, ${two(madeAt.getHours())}:${two(madeAt.getMinutes())}`
  const notes: (BackupNote | null)[] = [
    { title: 'Saytdakı məlumatın ehtiyat nüsxəsi' },
    `Endirilib: ${made}`,
    DATA_SOURCE.kind === 'real'
      ? `Mənbə: Excel «${DATA_SOURCE.file}»; son yeniləmə: ${updatedText}`
      : 'Mənbə: demo məlumat — rəqəmlər uydurmadır',
    DATA_EDITS.length ? `Saytda edilən ${DATA_EDITS.length} dəyişiklik bu fayldadır.` : null,
    `Sətirlər: ${quantity(rows.length)}${free ? `, o cümlədən ${quantity(free)} pulsuz (Qala bazadan daxili təchizat)` : ''}`,
    `İllər: ${YEARS.join(', ')}`,
    '',
    '«Əsas» vərəqində saytdakı bütün sifariş sətirləri var. Bu faylı «Excel yüklə» ilə yükləsəniz, sətirlər və ayların məbləğləri indiki kimi olar.',
    'Saytın saxlamadığı məlumat bu faylda da yoxdur:',
    '• «Tarix» yalnız ayı və ili göstərir: sifarişin günü saytda saxlanmır, xanaya ayın 1-i yazılıb.',
    '• «Cavabdeh şəxs» sütunu boşdur.',
    '• «Ölçü» ayrıca sütunda deyil, malın adının içindədir; malın model kodu saytda saxlanmır.',
    coded
      ? `• «Model/Kod» yalnız ${quantity(coded)} malda doldurulub: eyni alt kateqoriyada eyni adlı ikinci bir mal var. Orada malın saytdakı kodu yazılıb ki, fayl geri yüklənəndə bu iki mal birləşməsin.`
      : null,
    unordered ? `• Sifarişi olmayan ${quantity(unordered)} mal (saytda siyahıya əlavə edilib) bu faylda yoxdur: fayl yalnız sifariş sətirlərini saxlayır.` : null,
    idle ? `• Sifarişi olmayan ${quantity(idle)} obyekt bu faylda yoxdur: fayl yalnız sifariş sətirlərini saxlayır.` : null,
    'Rəhbərin ay təsdiqləri bu fayla daxil deyil: onlar ayrıca saxlanır və yeni Excel yükləyəndə dəyişmir.',
  ]
  return notes.filter((note): note is BackupNote => note !== null)
}

/** The figures on the site as the file, with its name. */
export function siteBackup(madeAt: Date) {
  const rows = backupRows(linesOfEveryYear, { products, categories, sites })
  if (rows.length === 0) throw new BackupError('Saytda sifariş sətri yoxdur: endiriləcək bir şey yoxdur.')
  return { bytes: backupWorkbook(rows, backupNotes(rows, madeAt), madeAt), fileName: backupFileName(madeAt), lines: rows.length }
}
