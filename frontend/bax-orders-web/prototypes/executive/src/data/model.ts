import { catalogSeed, seasonality, siteSeeds } from './catalog'

/**
 * The owner's workbook (owner, 2026-10-28), as `scripts/import_workbook.py` writes it and the «Excel yüklə» button
 * replaces it: read by `main.tsx` before this module loads. The file is kept out of git — it is real business data.
 * Without it the prototype runs on the demo below.
 */
interface RealData {
  meta: { source: string; sha256: string; lines: number; freeLines: number; importedAt?: string; edits?: DataEdit[] }
  sites: Site[]
  categories: Category[]
  products: Product[]
  /** No `year` in a file written before years came in (2026-11-10): its figures are 2026's alone (LEGACY_YEAR). */
  lines: (Omit<Line, 'year' | 'supplierId'> & { year?: number; supplierId?: string })[]
  orders: (Omit<Order, 'year'> & { year?: number })[]
  outsideRequests: (Omit<OutsideRequest, 'year'> & { year?: number })[]
}
export const LEGACY_YEAR = 2026
const loaded = (globalThis as { __BAX_DATA__?: Partial<RealData> }).__BAX_DATA__
const real = loaded?.meta && Array.isArray(loaded.lines) && Array.isArray(loaded.products) ? loaded as RealData : undefined

/**
 * DEMO MƏLUMAT — generated once, deterministically, from a fixed seed. Every amount in the prototype is the sum of
 * these lines (quantity × unit price, rounded to the qəpik per line), so the category, object and product views all
 * describe the same money and reconcile to the qəpik.
 */

export type Level = 1 | 2 | 3

export interface Category {
  id: string
  name: string
  level: Level
  parentId: string | null
  /** Root → itself, for every level. */
  path: string[]
}

export interface Product {
  id: string
  name: string
  unit: string
  leafId: string
  rootId: string
  midId: string
  /** The price set on the site («Mallar»): what a product the orders do not show yet costs. */
  price?: number
}

/** An edit made on the site («Mallar»), as the server records it. */
export interface DataEdit { at: string; op: string; text: string }

export interface Site {
  id: string
  name: string
  kind: string
}

/**
 * The two kinds of order (owner, 2026-10-18). A monthly order is the month's plan, prepared once and approved by the
 * Rəhbər as one package for every object. An outside-monthly order answers an accident or another urgent need, can come
 * on any day of the month, and gets its own consent — it is not part of the monthly package.
 */
export type LineType = 'monthly' | 'outside'

export interface Line {
  id: string
  type: LineType
  /** The monthly order (object × year × month), or the outside-monthly request this line belongs to. */
  orderId: string
  year: number
  /** 1–12, within `year`. */
  month: number
  siteId: string
  productId: string
  qty: number
  unit: string
  price: number
  amount: number
  /** The company the goods were bought from: the order file's «Şirkət» column. */
  supplierId: string
  supplier: string
}

/** A company goods are bought from. */
export interface Supplier {
  id: string
  name: string
}

export interface Order {
  id: string
  /** Empty when the source has none (the workbook has no order numbers). */
  number: string
  siteId: string
  year: number
  month: number
  /** 0 when the source does not say. */
  submittedDay: number
  lineIds: string[]
}

/** One outside-monthly request: raised on a day of the month, for a reason, with its own lines. */
export interface OutsideRequest {
  id: string
  number: string
  siteId: string
  year: number
  month: number
  day: number
  reason: string
  lineIds: string[]
}

export type ApprovalState = 'approved' | 'pending'

export interface MonthApproval {
  month: number
  state: ApprovalState
  /** The day it was approved, in the following month. */
  approvedOn?: { day: number; month: number }
  /** Approved on the site: when (Baku time) and by whom — none for the months approved in the program (D-53). */
  at?: string | null
  by?: string
  /** The monthly orders' amount and line count the approval was given for: the figures may move after it. */
  amount?: number
  lines?: number
  /**
   * The approvals file has a record of the month: an approval given or taken back on the site, or one of the program's
   * months the file was started with. Only such an approval can be taken back on the site.
   */
  recorded?: boolean
}

/** The demo's year, and the month its figures stop at: October 2026. */
const DEMO_YEAR = 2026
const DEMO_LAST_MONTH = 10

/**
 * data/approvals.json, written by the import service when the Rəhbər approves a month or takes the approval back: one
 * record per month, keyed `YYYY-MM`. A file written before years came in (2026-11-12) keys a month by its number alone
 * (`'10'`): that month is 2026's (LEGACY_YEAR), as every figure then was.
 */
interface ApprovalRecord { state?: ApprovalState; at?: string | null; by?: string; amount?: number; lines?: number }
interface ApprovalFile { months?: Record<string, ApprovalRecord> }
const approvalKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`
const approvalRecords = new Map<string, ApprovalRecord>()
// A month's number alone comes first among a JS object's keys, so a `YYYY-MM` record of the same month, were both in
// the file, is read after it and wins.
for (const [key, record] of Object.entries((globalThis as { __BAX_APPROVALS__?: ApprovalFile }).__BAX_APPROVALS__?.months ?? {})) {
  approvalRecords.set(/^\d{1,2}$/.test(key) ? approvalKey(LEGACY_YEAR, Number(key)) : key, record)
}
const now = new Date()
/** Today: the real date with the workbook, the demo's 18 October 2026 without it. */
export const TODAY = real ? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() } : { year: 2026, month: 10, day: 18 }
/**
 * When the figures were last brought in: the last upload (Baku time, as the server writes it), or — before any — the
 * owner's corrected workbook of 17 October 2026 (D-53).
 */
/** The edits made on the site since the last import, oldest first. */
export const DATA_EDITS: readonly DataEdit[] = real?.meta.edits ?? []
// The figures' last change: an upload or an edit on the site, whichever came later (both are Baku time, one format).
const lastChange = [real?.meta.importedAt, DATA_EDITS.at(-1)?.at].filter((value): value is string => Boolean(value)).sort().at(-1)
const uploaded = lastChange?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/)
export const DATA_UPDATED_AT = uploaded
  ? { year: Number(uploaded[1]), month: Number(uploaded[2]), day: Number(uploaded[3]), time: uploaded[4] }
  : real ? { year: 2026, month: 10, day: 17, time: '' } : { year: 2026, month: 10, day: 18, time: '09:40' }
/** Where the figures come from, for the frame's flag and footnote. */
export const DATA_SOURCE = real
  ? { kind: 'real' as const, file: real.meta.source, lines: real.meta.lines, freeLines: real.meta.freeLines, uploaded: Boolean(uploaded), edits: DATA_EDITS.length }
  : { kind: 'demo' as const }

// ---- seeded randomness --------------------------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20261018)
const between = (low: number, high: number) => low + (high - low) * random()
const round2 = (value: number) => Math.round(value * 100) / 100

export function slug(text: string): string {
  const map: Record<string, string> = { ə: 'e', ı: 'i', ö: 'o', ü: 'u', ç: 'c', ş: 's', ğ: 'g', İ: 'i', Ə: 'e', Ö: 'o', Ü: 'u', Ç: 'c', Ş: 's', Ğ: 'g' }
  return text
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ---- catalogue ----------------------------------------------------------------------------------------------------

export const categories = new Map<string, Category>()
export const products = new Map<string, Product>()
const productSeeds = new Map<string, { price: number; qty: number }>()

for (const [rootName, middles] of Object.entries(catalogSeed)) {
  const rootId = slug(rootName)
  categories.set(rootId, { id: rootId, name: rootName, level: 1, parentId: null, path: [rootId] })
  for (const [midName, leaves] of Object.entries(middles)) {
    const midId = `${rootId}--${slug(midName)}`
    categories.set(midId, { id: midId, name: midName, level: 2, parentId: rootId, path: [rootId, midId] })
    for (const [leafName, seeds] of Object.entries(leaves)) {
      const leafId = `${midId}--${slug(leafName)}`
      categories.set(leafId, { id: leafId, name: leafName, level: 3, parentId: midId, path: [rootId, midId, leafId] })
      for (const seed of seeds) {
        const id = slug(seed.name)
        products.set(id, { id, name: seed.name, unit: seed.unit, leafId, rootId, midId })
        productSeeds.set(id, { price: seed.price, qty: seed.qty })
      }
    }
  }
}

export const sites = new Map<string, Site>(siteSeeds.map((seed) => [slug(seed.name), { id: slug(seed.name), name: seed.name, kind: seed.kind }]))

// ---- the year's orders --------------------------------------------------------------------------------------------

/**
 * The real companies of the order file («Sifarişlər üzrə bölgü», Aylıq sheet), per root category: those it buys that
 * category from most often, each with its number of lines there, so the main company carries most of the lines here
 * too. The internal stock («Qala Baza», «Anbar (Daxili)») is left out.
 */
const suppliersByRoot: Record<string, [name: string, lines: number][]> = {
  'Təmizlik': [['Cleanfix', 412], ['Prestige Cleaning', 219], ['Azclean', 104], ['Proshine', 79], ['Səma Plastik', 77]],
  'Yaşıllıq': [['Progres', 216], ['Ağakərim Ağakərimov', 108], ['Baku Garden', 47], ['Green Garden', 37]],
  'Usta': [['El Promaster', 262], ['Eldost İnşaat', 222], ['Omid', 138], ['Star Boya (Cəfər)', 39]],
  'Geyim': [['Elit Teks', 124], ['İnşaat MS', 100], ['Sign LTD', 49], ['Qasımoğlu Group', 26]],
  'Suvarma': [['Aura İnşaat', 237], ['Progres', 78]],
  'Fontan': [['Pooltech', 154], ['Poolstore', 6]],
  'Nəqliyyat': [['SOCAR', 130]],
  'Ofis': [['Aden Kırtasiye', 39]],
  'Elektrik': [['Unical Texnik', 7], ['Akkur', 6], ['El Promaster', 5]],
  'Məişət': [['Eldost İnşaat', 7], ['Cleanfix', 3]],
}

/** The company an object buys a product from: fixed per object and product, drawn by the companies' weights. */
function supplierOf(product: Product, key: string): string {
  const weighted = suppliersByRoot[categories.get(product.rootId)!.name]
  let hash = 2166136261
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  let pick = hash % weighted.reduce((sum, [, lines]) => sum + lines, 0)
  for (const [name, lines] of weighted) {
    if (pick < lines) return name
    pick -= lines
  }
  return weighted[0][0]
}

/** Stories the demo tells on purpose, so the product screen has something real to explain. */
function storyPrice(productId: string, month: number, base: number): number {
  if (productId === 'doseme-yuyucu-konsentrat-5-l' && month >= 10) return base * 1.18
  if (productId === 'metal-boyasi-2-5-l' && month >= 9) return base * 1.09
  if (productId === 'bel' && month >= 10) return base * 0.92
  return base
}

function storyQty(productId: string, month: number, qty: number): number {
  if (productId === 'benovse-sitili') return month === 10 ? qty * 3.2 : month === 3 || month === 4 ? qty * 1.4 : qty * 0.25
  if (productId === 'petuniya-sitili') return month >= 4 && month <= 6 ? qty * 1.8 : qty * 0.3
  if (productId === 'benzin-ai-92' && month === 10) return qty * 1.25
  return qty
}

const lines: Line[] = []
const orders: Order[] = []

siteSeeds.forEach((seed, siteIndex) => {
  const siteId = slug(seed.name)
  for (let month = 1; month <= DEMO_LAST_MONTH; month++) {
    if ((seed.from && month < seed.from) || seed.skip?.includes(month)) continue

    const orderId = `${siteId}-${month}`
    const order: Order = {
      id: orderId,
      number: `SF-${DEMO_YEAR}-${String(month).padStart(2, '0')}-${String(siteIndex + 1).padStart(2, '0')}`,
      siteId,
      year: DEMO_YEAR,
      month,
      submittedDay: 1 + Math.floor(random() * 4),
      lineIds: [],
    }

    for (const product of products.values()) {
      const weight = seed.profile[categories.get(product.rootId)!.name] ?? 0
      if (weight === 0) continue

      const season = seasonality[categories.get(product.rootId)!.name][month - 1]
      // The pump is never planned: it is bought when one breaks (see the outside requests below).
      if (product.id === 'derinlik-nasosu-1-1-kvt') {
        continue
      } else if (product.id === 'is-elceyi' && siteId === 'idman-kompleksi' && month === 10) {
        // Kept on purpose: the box of gloves below must exist for the mixed-unit case.
      } else if (random() > Math.min(0.92, 0.42 * weight * Math.max(season, 0.15))) {
        continue
      }

      const base = productSeeds.get(product.id)!
      let qty = storyQty(product.id, month, base.qty * weight * season * between(0.7, 1.3))
      qty = product.unit === 'metr' || product.unit === 'litr' || product.unit === 'ədəd' && base.qty >= 50
        ? Math.max(10, Math.round(qty / 10) * 10)
        : Math.max(1, Math.round(qty))

      // Two suppliers carry the trimmer head at different prices, so its month has more than one price.
      const trimmer = product.id === 'trimmer-ucun-leskali-basliq'
      const supplier = trimmer ? (siteIndex % 2 === 0 ? 'Progres' : 'Ağakərim Ağakərimov') : supplierOf(product, `${siteId}|${product.id}`)
      const drift = 1 + 0.004 * (month - 1)
      const level = trimmer ? (siteIndex % 2 === 0 ? 1 : 1.12) : seed.priceLevel
      let price = round2(storyPrice(product.id, month, base.price) * drift * level)
      let unit = product.unit

      // One object orders work gloves by the box in October: a quantity that cannot be added to pairs.
      if (product.id === 'is-elceyi' && siteId === 'idman-kompleksi' && month === 10) {
        unit = 'qutu'
        qty = 2
        price = round2(54 * drift)
      }
      if (product.id === 'benzin-ai-92' || product.id === 'dizel-yanacagi') price = 1

      const line: Line = {
        id: `${orderId}-${product.id}`,
        type: 'monthly',
        orderId,
        year: DEMO_YEAR,
        month,
        siteId,
        productId: product.id,
        qty,
        unit,
        price,
        amount: round2(qty * price),
        supplierId: slug(supplier),
        supplier,
      }
      lines.push(line)
      order.lineIds.push(line.id)
    }

    if (order.lineIds.length > 0) orders.push(order)
  }
})

// ---- outside-monthly requests ---------------------------------------------------------------------------------------
// Their own random sequence, so adding them leaves every monthly figure as it was.

const urgent = mulberry32(4411)
const urgentBetween = (low: number, high: number) => low + Math.round((high - low) * urgent())

const templates: Record<string, { reason: string; items: [string, number, number][] }> = {
  su: { reason: 'Qəza: su borusu partladı', items: [['ppr-boru-25-mm', 20, 40], ['kran', 2, 4], ['material-dasinmasi', 1, 1]] },
  nasos: { reason: 'Suvarma nasosu sıradan çıxdı', items: [['derinlik-nasosu-1-1-kvt', 1, 1], ['slanq-birlesdiricisi', 4, 6]] },
  firtina: { reason: 'Fırtınadan sonra təcili təmizlik', items: [['zibil-paketi-80-110', 10, 20], ['is-elceyi', 20, 40], ['material-dasinmasi', 2, 3]] },
  isiq: { reason: 'İşıqlandırma xətti zədələndi', items: [['kabel-3-2-5', 30, 60], ['led-lampa-15-vt', 6, 12]] },
  fontan: { reason: 'Fəvvarə nasosu təmiri', items: [['fontan-nasosu-ucun-salnik-desti', 1, 2], ['xlor-tableti-5-kq', 1, 2]] },
  seki: { reason: 'Təcili təmir: səki örtüyü', items: [['sement-m400-50-kq', 8, 15], ['qum', 1, 2]] },
  qizdirici: { reason: 'Qızdırıcı sıradan çıxdı', items: [['elektrik-qizdirici', 1, 2]] },
}

/** When and where something went wrong: month, day, object, what happened. October's stop before the demo's today. */
const schedule: [number, number, string, string][] = [
  [1, 12, 'merkezi-xiyaban', 'isiq'],
  [2, 7, 'texniki-baza', 'su'],
  [2, 20, 'medeniyyet-evi', 'qizdirici'],
  [3, 15, 'seher-bagi', 'firtina'],
  [4, 9, 'genclik-meydani', 'fontan'],
  [5, 21, 'sahil-parki', 'su'],
  [6, 11, 'botanika-bagi', 'nasos'],
  [6, 26, 'denizkenari-bulvar', 'fontan'],
  [7, 8, 'gol-parki', 'su'],
  [7, 19, 'serq-meydani', 'seki'],
  [8, 14, 'denizkenari-bulvar', 'isiq'],
  [9, 3, 'merkezi-xiyaban', 'firtina'],
  [9, 22, 'idman-kompleksi', 'su'],
  [10, 6, 'sahil-parki', 'nasos'],
  [10, 13, 'universitet-seherciyi', 'firtina'],
  [10, 17, 'genclik-meydani', 'isiq'],
]

const outsideRequests: OutsideRequest[] = []
schedule.forEach(([month, day, siteId, kind]) => {
  if (!sites.has(siteId)) throw new Error(`demo data: no object ${siteId}`)
  const template = templates[kind]
  const perMonth = outsideRequests.filter((item) => item.month === month).length + 1
  const request: OutsideRequest = {
    id: `kenar-${month}-${perMonth}`,
    number: `AK-${DEMO_YEAR}-${String(month).padStart(2, '0')}-${String(perMonth).padStart(2, '0')}`,
    siteId,
    year: DEMO_YEAR,
    month,
    day,
    reason: template.reason,
    lineIds: [],
  }
  for (const [productId, low, high] of template.items) {
    const product = products.get(productId)
    if (!product) throw new Error(`demo data: no product ${productId}`)
    const base = productSeeds.get(productId)!
    let qty = urgentBetween(low, high)
    if (product.unit === 'metr') qty = Math.max(10, Math.round(qty / 10) * 10)
    // Bought in a hurry, from whoever had it: a little above the planned price.
    const price = round2(base.price * (1 + 0.004 * (month - 1)) * 1.06)
    const supplier = supplierOf(product, `${request.id}|${productId}`)
    const line: Line = {
      id: `${request.id}-${productId}`,
      type: 'outside',
      orderId: request.id,
      year: DEMO_YEAR,
      month,
      siteId,
      productId,
      qty,
      unit: product.unit,
      price,
      amount: round2(qty * price),
      supplierId: slug(supplier),
      supplier,
    }
    lines.push(line)
    request.lineIds.push(line.id)
  }
  outsideRequests.push(request)
})

// With the workbook here, its figures replace the demo's, in the same shapes.
if (real) {
  categories.clear()
  for (const category of real.categories) categories.set(category.id, category)
  products.clear()
  for (const product of real.products) products.set(product.id, product)
  sites.clear()
  for (const site of real.sites) sites.set(site.id, site)
  lines.length = 0
  // The company comes from the workbook's «Şirkət» column by name; a line added on the site may have none.
  lines.push(...real.lines.map((line) => ({
    ...line,
    year: line.year ?? LEGACY_YEAR,
    supplierId: line.supplierId || slug(line.supplier) || 'gosterilmeyib',
    supplier: line.supplier || 'Göstərilməyib',
  })))
  orders.length = 0
  orders.push(...real.orders.map((order) => ({ ...order, year: order.year ?? LEGACY_YEAR })))
  outsideRequests.length = 0
  outsideRequests.push(...real.outsideRequests.map((request) => ({ ...request, year: request.year ?? LEGACY_YEAR })))
}

// ---- every year -----------------------------------------------------------------------------------------------------

/** The years with orders, oldest first: the site shows one at a time (`YEAR`), and opens on the latest. */
export const YEARS: readonly number[] = [...new Set(lines.map((line) => line.year))].sort((a, b) => a - b)
/** Every year's lines: for what is the same whatever the year on screen — the units in use, a line by its id. */
export const linesOfEveryYear: readonly Line[] = lines
export const linesById = new Map(lines.map((line) => [line.id, line]))
/** The companies lines were bought from, in any year: a comparison can reach into the year before. */
export const allSuppliers = new Map<string, Supplier>(lines.map((line) => [line.supplierId, { id: line.supplierId, name: line.supplier }]))

const monthsByYear = new Map<number, number[]>()
for (const line of lines) {
  if (line.type !== 'monthly') continue
  const months = monthsByYear.get(line.year) ?? []
  if (!months.includes(line.month)) months.push(line.month)
  monthsByYear.set(line.year, months)
}
for (const months of monthsByYear.values()) months.sort((a, b) => a - b)

/** A year's reporting months: those with a monthly package. Outside-monthly figures are read within the same months. */
export const monthsWithDataIn = (year: number): readonly number[] => monthsByYear.get(year) ?? []

/**
 * The monthly packages approved in the program, not in the workbook: up to and including September 2026; October is
 * waiting (D-53), and a month the workbook adds later waits too, until the program says otherwise. No approval days are
 * made up.
 */
const APPROVED_THROUGH = { year: 2026, month: 9 }

/**
 * A month's approval, in any year. The site's record decides where there is one: an approval, or an approval taken
 * back. A month with no record is as the program left it: approved up to and including September 2026, waiting after.
 * The demo approves every month but its last, a few days into the month after.
 */
export function approvalIn(year: number, month: number): MonthApproval {
  if (!real) {
    return month >= DEMO_LAST_MONTH
      ? { month, state: 'pending' }
      : { month, state: 'approved', approvedOn: { day: 3 + (month % 4), month: month + 1 } }
  }
  const record = approvalRecords.get(approvalKey(year, month))
  if (record) {
    if (record.state === 'pending') return { month, state: 'pending', recorded: true }
    const day = record.at?.match(/^\d{4}-(\d{2})-(\d{2})/)
    return {
      month, state: 'approved', recorded: true, at: record.at ?? null, by: record.by, amount: record.amount, lines: record.lines,
      ...(day ? { approvedOn: { day: Number(day[2]), month: Number(day[1]) } } : {}),
    }
  }
  const approved = year < APPROVED_THROUGH.year || (year === APPROVED_THROUGH.year && month <= APPROVED_THROUGH.month)
  return { month, state: approved ? 'approved' : 'pending' }
}

// ---- the year on screen -------------------------------------------------------------------------------------------
//
// Every screen reads one year: the one in the address, chosen by `selectYear` before any of them draws (app.tsx). The
// bindings below are that year's and change with it — read them when they are needed, never copy them at load.

/** The year on screen. */
export let YEAR = YEARS.at(-1) ?? DEMO_YEAR
/** The year's lines: months 1–12. */
export let allLines: readonly Line[] = []
/** The year's monthly orders, by object and month: `${siteId}-${month}`. */
export let allOrders = new Map<string, Order>()
export let allOutsideRequests: readonly OutsideRequest[] = []
/** The year's reporting months. */
export let monthsWithData: readonly number[] = []
/** The latest month of the year with any order. */
export let LAST_MONTH_WITH_DATA = 0
/**
 * Lines by month counted from January of the year on screen, the years before it included: 0 is the December before,
 * −11 the January of the year before. A comparison reads the months before a month whatever their year — January's
 * «previous month» is the December before it.
 */
export let linesByMonth = new Map<number, Line[]>()
/** The months — counted the same way — with a monthly package, up to the year on screen's: what a comparison stands on. */
export let comparableMonths: readonly number[] = []
/**
 * The monthly package's approval: a Rəhbər approves the month's monthly orders once, for every object. Usually by the
 * 15th, but that is not a deadline: on 18 October the October package can still be waiting, and that is not «late».
 * Outside-monthly requests are not in it; the system keeps no record of their separate consent.
 */
export let approvals: MonthApproval[] = []

/** The figures of one year, for every screen; a year with no orders gives empty ones. */
export function selectYear(year: number) {
  YEAR = year
  allLines = lines.filter((line) => line.year === year)
  allOrders = new Map(orders.filter((order) => order.year === year).map((order) => [`${order.siteId}-${order.month}`, order]))
  allOutsideRequests = outsideRequests.filter((request) => request.year === year)
  monthsWithData = monthsWithDataIn(year)
  LAST_MONTH_WITH_DATA = allLines.reduce((last, line) => Math.max(last, line.month), 0)

  linesByMonth = new Map()
  const comparable = new Set<number>()
  for (const line of lines) {
    if (line.year > year) continue
    const month = (line.year - year) * 12 + line.month
    const list = linesByMonth.get(month)
    if (list) list.push(line)
    else linesByMonth.set(month, [line])
    if (line.type === 'monthly') comparable.add(month)
  }
  comparableMonths = [...comparable].sort((a, b) => a - b)

  approvals = Array.from({ length: LAST_MONTH_WITH_DATA }, (_, index) => approvalIn(year, index + 1))
}

selectYear(YEAR)
