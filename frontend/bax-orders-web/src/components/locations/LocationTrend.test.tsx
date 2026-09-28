import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { BasisSelection } from '../../analytics/basisParams'
import type { DecisionComparison, OrderDecisionContext } from '../../api/decisions'
import type { LocationOrderHistoryEntry } from '../../api/orders'
import { expectInert } from '../../test/interaction'
import { findOldTerms } from '../../test/oldTerms'
import { historicalImportChipClass, historicalImportLabel, workflowStatusClass } from '../workflow/labels'
import { LocationTrend } from './LocationTrend'

/**
 * The strip at the top of an object: what it ordered last, and the shape of the year behind it. The month it
 * did not order in is the thing most easily got wrong here — a bar of no height would read as a month that
 * cost nothing, which is a different fact entirely.
 *
 * The comparison under the amount is the order page's own figure, handed in (Task 11); this component works
 * none of it out.
 */
function entry(period: string, amount: number | null, overrides: Partial<LocationOrderHistoryEntry> = {}): LocationOrderHistoryEntry {
  return {
    orderRequestId: Number(period.slice(5, 7)),
    requestPeriod: period,
    version: 1,
    requestDate: null,
    status: 'Draft',
    itemCount: 10,
    knownPriceItemCount: 10,
    missingPriceItemCount: 0,
    internalSupplyItemCount: 0,
    knownAmountTotal: amount,
    createdAtUtc: '2026-09-22T10:00:00Z',
    isHistoricalImport: false,
    ...overrides,
  }
}

function comparison(overrides: Partial<DecisionComparison> = {}): DecisionComparison {
  return {
    basis: 'PreviousMonth',
    customStart: null,
    customEnd: null,
    windowPeriods: ['2026-08-01'],
    expectedPeriodCount: 1,
    availablePeriodCount: 1,
    missingPeriods: [],
    periods: [],
    available: true,
    baselineKnownAmount: 1958.52,
    deltaAmount: 1287.91,
    deltaPercent: 65.76,
    amountIsComplete: true,
    baselineMissingPriceItemCount: 0,
    ...overrides,
  }
}

function context(primary: DecisionComparison = comparison()): OrderDecisionContext {
  return {
    orderRequestId: 9,
    locationId: 43,
    locationCode: 'LOC-000043',
    locationName: 'Nərimanov heykəli',
    requestPeriod: '2026-09-01',
    version: 1,
    status: 'Draft',
    isLatestVersion: true,
    previousOrderRequestId: null,
    previousVersion: null,
    latestOrderRequestId: 9,
    latestVersion: 1,
    current: {
      knownAmount: 3246.43,
      itemCount: 10,
      knownPriceItemCount: 10,
      missingPriceItemCount: 0,
      priceNotRequiredItemCount: 0,
      isComplete: true,
    },
    primary,
    secondary: [],
    decomposition: null,
  }
}

const lastMonth: BasisSelection = { basis: 'PreviousMonth', from: null, to: null }

function renderTrend(
  entries: LocationOrderHistoryEntry[],
  props: {
    comparison?: OrderDecisionContext | null
    comparisonPending?: boolean
    selection?: BasisSelection
  } = {},
) {
  return render(
    <MemoryRouter>
      <LocationTrend
        entries={entries}
        comparison={props.comparison ?? null}
        comparisonPending={props.comparisonPending ?? false}
        selection={props.selection ?? lastMonth}
        onSelectBasis={vi.fn()}
        priorMonths={['2026-07', '2026-08']}
      />
    </MemoryRouter>,
  )
}

function strip() {
  return screen.getByRole('list', { name: 'Son ayların məbləğləri' })
}

/**
 * Each slot's month label and amount, left to right. Task 24: a slot's content sits one level down, inside the
 * month's link or, for a gap, a plain wrapper — so it is read from the slot's first element child.
 */
function slots() {
  return within(strip()).getAllByRole('listitem').map((slot) => {
    const [, label, amount] = Array.from(slot.firstElementChild!.children)
    return { label: label.textContent, amount: amount.textContent?.replace(String.fromCharCode(0xa0), ' ') }
  })
}

describe('the latest order', () => {
  it('leads with its month, its money and its state', () => {
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)])

    expect(screen.getByText(/Son sifariş · Sentyabr 2026/)).toBeInTheDocument()
    expect(screen.getByText('3.246,43 ₼', { selector: '.text-2xl' })).toBeInTheDocument()
    expect(screen.getByText('Təsdiqlənməyib')).toBeInTheDocument()
  })

  it('opens the order it is about, carrying the basis the page is reading', () => {
    renderTrend([entry('2026-09-01', 3246.43)], {
      selection: { basis: 'Previous3MonthAverage', from: null, to: null },
    })

    expect(screen.getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/9?basis=avg3')
  })

  it('writes the basis even when it is last month, so the order page reads the same', () => {
    renderTrend([entry('2026-09-01', 3246.43)])

    expect(screen.getByRole('link', { name: 'Sifarişə bax' })).toHaveAttribute('href', '/orders/9?basis=last')
  })
})

/** Task 22b: the card says a historical latest order the way the order page does (22.2). */
describe('a latest order carried in from Excel', () => {
  function card() {
    return screen.getByRole('region', { name: 'Son sifariş və tarixçə' })
  }

  it('reads ✓ Təsdiqlənib with the phrase beside it, and still has one way into the order', () => {
    renderTrend([entry('2026-09-01', 3246.43, { status: 'Approved', isHistoricalImport: true })])

    const badge = within(card()).getByText('Təsdiqlənib')
    expect(badge).toHaveTextContent('✓')
    expect(badge).toHaveClass(...workflowStatusClass.Approved.split(' '))
    const phrase = within(card()).getByText(historicalImportLabel)
    expect(phrase).toHaveClass(...historicalImportChipClass.split(' '))
    expect(phrase.className).not.toMatch(/amber/)

    expect(within(card()).getAllByRole('link', { name: 'Sifarişə bax' })).toHaveLength(1)
  })

  it('says nothing historical of an order approved in this system', () => {
    renderTrend([entry('2026-09-01', 3246.43, { status: 'Approved', isHistoricalImport: false })])

    expect(within(card()).getByText('Təsdiqlənib')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent('Tarixi sifariş')
    expect(within(card()).getAllByRole('link', { name: 'Sifarişə bax' })).toHaveLength(1)
  })

  it('looks only at the latest order: an older historical one says nothing on the card', () => {
    renderTrend([
      entry('2026-09-01', 3246.43, { status: 'PendingApproval' }),
      entry('2026-08-01', 1958.52, { status: 'Approved', isHistoricalImport: true }),
    ])

    expect(within(card()).getByText('Təsdiq gözləyir')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent('Tarixi sifariş')
  })
})

/**
 * The two tests "compares it with the calendar month before it" and "refuses a comparison when the month before
 * has no order" are replaced (brief: "Obyekt səhifəsi seçilmiş bazanı qəbul edir və saxlayır"). The figure is the
 * order page's, from its endpoint, for whichever basis the reader chose — the same "Keçən ay" figure when that is
 * the basis, and the same refusal when its window is empty.
 */
describe('the comparison under it', () => {
  it('is the order page’s figure for last month, named and coloured by the direction of the cost', () => {
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)], { comparison: context() })

    expect(screen.getByText('Müqayisə: Keçən ay (Avqust 2026)')).toBeInTheDocument()
    expect(screen.getByText('Keçən aya görə')).toBeInTheDocument()
    // Red up (9.1), with the direction in words beside the colour.
    const delta = screen.getByText('+1.287,91 ₼')
    expect(delta).toHaveClass('text-red-700')
    expect(delta).toHaveTextContent('xərc artıb')
    expect(screen.getByText('+65,76%')).toHaveClass('text-red-700')
  })

  it('is the chosen basis’s figure, not last month’s', () => {
    renderTrend([entry('2026-09-01', 3246.43)], {
      comparison: context(comparison({
        basis: 'Previous3MonthAverage',
        windowPeriods: ['2026-06-01', '2026-07-01', '2026-08-01'],
        deltaAmount: -150,
        deltaPercent: -4.42,
      })),
      selection: { basis: 'Previous3MonthAverage', from: null, to: null },
    })

    expect(screen.getByText('Müqayisə: Son 3 ayın ortalaması (İyun–Avqust 2026)')).toBeInTheDocument()
    expect(screen.getByText('Son 3 ayın ortalamasına görə')).toBeInTheDocument()
    expect(screen.queryByText(/Keçən aya görə/)).toBeNull()
    const delta = screen.getByText('−150,00 ₼')
    expect(delta).toHaveClass('text-emerald-700')
    expect(delta).toHaveTextContent('xərc azalıb')
    expect(screen.getByText('−4,42%')).toHaveClass('text-emerald-700')
    // The picker shows the chosen basis.
    expect(screen.getByRole('button', { name: 'Son 3 ayın ortalaması' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says the window is empty rather than comparing with zero', () => {
    // July, then September: August never happened, so last month's window holds nothing.
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-07-01', 1958.52)], {
      comparison: context(comparison({
        available: false,
        availablePeriodCount: 0,
        missingPeriods: ['2026-08-01'],
        baselineKnownAmount: null,
        deltaAmount: null,
        deltaPercent: null,
      })),
    })

    expect(screen.getByText('Seçilmiş dövrdə müqayisə üçün sifariş yoxdur')).toBeInTheDocument()
    expect(screen.queryByText(/Keçən aya görə/)).toBeNull()
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it('holds a placeholder while the comparison is on its way', () => {
    const { container } = renderTrend([entry('2026-09-01', 3246.43)], { comparison: context(), comparisonPending: true })

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    // Never the previous answer under a newly chosen basis.
    expect(screen.queryByText(/Müqayisə:/)).toBeNull()
  })

  it('says nothing at all when the comparison did not come', () => {
    const { container } = renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)])

    expect(screen.queryByText(/Müqayisə:/)).toBeNull()
    expect(screen.queryByText(/aya görə/)).toBeNull()
    expect(container.querySelector('.animate-pulse')).toBeNull()
    // The card itself is still whole.
    expect(screen.getByText('3.246,43 ₼', { selector: '.text-2xl' })).toBeInTheDocument()
  })

  it('works out no difference of its own from the rows it is given', () => {
    // Two rows a month apart and no context: the old strip would have said "Keçən aya görə +1.287,91 ₼".
    renderTrend([entry('2026-09-01', 3246.43), entry('2026-08-01', 1958.52)])

    expect(screen.queryByText(/1\.287,91/)).toBeNull()
  })
})

describe('the latest order’s counts', () => {
  /** Nərimanov heykəli, September (brief acceptance 3): one price owed and one line from the company's own store. */
  it('names both, apart, with the order they belong to — amber and slate', () => {
    renderTrend([entry('2026-09-01', 3246.43, { missingPriceItemCount: 1, internalSupplyItemCount: 1 })])

    const line = screen.getByText(/sifarişində:/)
    expect(line).toHaveTextContent('Sentyabr 2026 sifarişində: Qiymət yoxdur 1 · Daxili təminat 1')
    expect(within(line).getByText('Qiymət yoxdur 1')).toHaveClass('text-amber-800')
    expect(within(line).getByText('Daxili təminat 1')).toHaveClass('text-slate-500')
    expect(within(line).getByText('Daxili təminat 1')).not.toHaveClass('text-amber-800')
  })

  /**
   * Was "2 sətirdə qiymət yoxdur" on the card (5.3). The card now says the brief's own words with the order's month
   * (brief: "hər sayın hansı dövrə aid olduğu yazılır"); the table's sentence stays the mark's name in the strip.
   */
  it('says only the price owed when nothing came from the company’s own store', () => {
    renderTrend([entry('2026-09-01', 3246.43, { missingPriceItemCount: 2 })])

    const line = screen.getByText(/sifarişində:/)
    expect(line).toHaveTextContent('Sentyabr 2026 sifarişində: Qiymət yoxdur 2')
    expect(line).not.toHaveTextContent('Daxili təminat')
    expect(line).not.toHaveTextContent('·')
    expect(within(strip()).getByRole('img', { name: '2 sətirdə qiymət yoxdur' })).toBeInTheDocument()
    expect(screen.queryByText(/məhsulun qiyməti yoxdur/)).toBeNull()
  })

  it('says only the internal supply when every owed price is there', () => {
    renderTrend([entry('2026-09-01', 3246.43, { internalSupplyItemCount: 3 })])

    const line = screen.getByText(/sifarişində:/)
    expect(line).toHaveTextContent('Sentyabr 2026 sifarişində: Daxili təminat 3')
    expect(line).not.toHaveTextContent('Qiymət yoxdur')
    expect(line.querySelector('.text-amber-800')).toBeNull()
  })

  it('has no line at all when there is nothing to count', () => {
    renderTrend([entry('2026-09-01', 3246.43)])

    expect(screen.queryByText(/sifarişində:/)).toBeNull()
  })
})

describe('the strip behind it', () => {
  /** Nərimanov heykəli read "Apr May İyu İyu Avq Sen" (brief acceptance 1). */
  it('names every month in full, so İyun and İyul are two words, and shows each month’s money', () => {
    renderTrend([
      entry('2026-09-01', 3246.43),
      entry('2026-08-01', 1958.52),
      entry('2026-07-01', 2100),
      entry('2026-06-01', 1800.5),
      entry('2026-05-01', 1500),
      entry('2026-04-01', 1200.25),
    ])

    expect(slots()).toEqual([
      { label: 'Aprel 2026', amount: '1.200,25 ₼' },
      { label: 'May', amount: '1.500,00 ₼' },
      { label: 'İyun', amount: '1.800,50 ₼' },
      { label: 'İyul', amount: '2.100,00 ₼' },
      { label: 'Avqust', amount: '1.958,52 ₼' },
      { label: 'Sentyabr', amount: '3.246,43 ₼' },
    ])
    for (const cut of ['Apr', 'İyu', 'Avq', 'Sen']) {
      expect(within(strip()).queryByText(cut)).toBeNull()
    }
  })

  it('names the year again on January, so a strip across two years says where', () => {
    renderTrend([entry('2027-02-01', 300), entry('2027-01-01', 200), entry('2026-12-01', 100)])

    expect(slots().map((slot) => slot.label)).toEqual(['Dekabr 2026', 'Yanvar 2027', 'Fevral'])
  })

  it('draws a month with no order as a gap rather than as nothing spent', () => {
    const { container } = renderTrend([
      entry('2026-09-01', 3000),
      entry('2026-07-01', 1000),
    ])

    expect(within(strip()).getAllByRole('listitem')).toHaveLength(3)

    // August is a dashed outline, not a short solid bar.
    expect(container.querySelector('[title^="Avqust 2026"]')).toHaveAttribute('title', 'Avqust 2026: sifariş yoxdur')
    expect(container.querySelector('[title^="Avqust 2026"]')?.className).toContain('border-dashed')
  })

  it('labels a gap with its month, and its money as unknown — never "—" for a name, never a zero', () => {
    renderTrend([entry('2026-09-01', 3000), entry('2026-07-01', 1000)])

    expect(slots()[1]).toEqual({ label: 'Avqust', amount: '—' })
    expect(within(strip()).queryByText('0,00 ₼')).toBeNull()
  })

  it('says what each month was worth when hovered, too', () => {
    const { container } = renderTrend([entry('2026-09-01', 3000), entry('2026-08-01', 1000)])

    // An attribute is compared exactly, so the no-break space (U+00A0) that keeps ₼ with its amount is written out.
    expect(container.querySelector('[title^="Sentyabr 2026"]'))
      .toHaveAttribute('title', `Sentyabr 2026: 3.000,00${String.fromCharCode(0xa0)}₼`)
  })

  it('marks a month whose amount is partial with "⚠ N", and no other', () => {
    renderTrend([
      entry('2026-09-01', 3000),
      entry('2026-08-01', 1000, { missingPriceItemCount: 3 }),
      entry('2026-07-01', 900, { internalSupplyItemCount: 4 }),
    ])

    const [july, august, september] = within(strip()).getAllByRole('listitem')
    expect(within(august).getByRole('img', { name: '3 sətirdə qiymət yoxdur' })).toHaveTextContent('⚠ 3')
    // Internal supply is not a price owed, so July carries no mark (Task 2).
    expect(within(july).queryByRole('img')).toBeNull()
    expect(within(september).queryByRole('img')).toBeNull()
  })

  it('covers at most twelve calendar months, ending at the latest order', () => {
    // Fifteen months of orders, newest first: October 2025 … December 2026.
    const entries = Array.from({ length: 15 }, (_, index) => {
      const zeroBased = 2026 * 12 + 11 - index
      const period = `${Math.floor(zeroBased / 12)}-${String((zeroBased % 12) + 1).padStart(2, '0')}-01`
      return entry(period, 100 + index, { orderRequestId: 1000 + index })
    })
    renderTrend(entries)

    const labels = slots().map((slot) => slot.label)
    expect(labels).toHaveLength(12)
    expect(labels[0]).toBe('Yanvar 2026')
    expect(labels[11]).toBe('Dekabr')
  })

  it('shows each month once, at its newest order', () => {
    // July corrected: version 2 replaced version 1, and only version 2 is July's money.
    renderTrend([
      entry('2026-07-01', 4700, { orderRequestId: 107, version: 2 }),
      entry('2026-07-01', 4800, { orderRequestId: 105, version: 1 }),
      entry('2026-06-01', 4200, { orderRequestId: 104 }),
    ])

    expect(slots()).toEqual([
      { label: 'İyun 2026', amount: '4.200,00 ₼' },
      { label: 'İyul', amount: '4.700,00 ₼' },
    ])
  })

  it('shows nothing at all for an object that has never ordered', () => {
    const { container } = renderTrend([])

    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * Task 24 (brief acceptance 2, 24.4): a month in the strip is the way into that month's order, and the latest order's
 * month — the one the card names — stands apart from the others, to the eye and to a screen reader.
 */
describe('the strip as a way into each month', () => {
  /** September, a gap in August, July corrected once and June owing two prices. */
  const year = () => [
    entry('2026-09-01', 3000),
    entry('2026-07-01', 1500, { orderRequestId: 107, version: 2 }),
    entry('2026-07-01', 1600, { orderRequestId: 105, version: 1 }),
    entry('2026-06-01', 750, { orderRequestId: 104, missingPriceItemCount: 2 }),
  ]

  function monthLinks(): HTMLElement[] {
    return within(strip()).queryAllByRole('link')
  }

  function bar(slot: HTMLElement): HTMLElement {
    return slot.querySelector<HTMLElement>('[title]')!
  }

  it('opens each month with an order at that order, carrying the basis the page is reading', () => {
    renderTrend(year(), { selection: { basis: 'Previous3MonthAverage', from: null, to: null } })

    expect(monthLinks().map((link) => link.getAttribute('href'))).toEqual([
      '/orders/104?basis=avg3',
      '/orders/107?basis=avg3',
      '/orders/9?basis=avg3',
    ])
    // The link is the slot's one child, and holds the bar, the name, the money and the mark as they were.
    for (const link of monthLinks()) {
      expect(link.parentElement!.tagName).toBe('LI')
      expect(link.parentElement!.children).toHaveLength(1)
      expect(link.querySelector('a, button')).toBeNull()
    }
  })

  it('opens a corrected month at its newest version, as the row list’s newest row does', () => {
    renderTrend(year())

    const july = within(strip()).getAllByRole('listitem')[1]
    expect(within(july).getByRole('link')).toHaveAttribute('href', '/orders/107?basis=last')
    expect(within(strip()).queryByRole('link', { name: /1\.600,00/ })).toBeNull()
  })

  it('names each month by its bar’s words, and says a price still owed', () => {
    renderTrend(year())

    expect(monthLinks().map((link) => link.getAttribute('aria-label'))).toEqual([
      `İyun 2026: 750,00${nbsp}₼ · 2 sətirdə qiymət yoxdur`,
      `İyul 2026: 1.500,00${nbsp}₼`,
      `Sentyabr 2026: 3.000,00${nbsp}₼`,
    ])
    // The accessible name is the bar's title, word for word, before anything is added to it.
    for (const link of monthLinks()) {
      expect(link.getAttribute('aria-label')!.startsWith(bar(link).getAttribute('title')!)).toBe(true)
    }
  })

  it('leaves a month with no order as a gap that opens nothing and does not change under the cursor', () => {
    renderTrend(year())

    const august = within(strip()).getAllByRole('listitem')[2]
    expect(within(august).queryByRole('link')).toBeNull()
    expect(august.firstElementChild!.tagName).toBe('DIV')
    expect(bar(august)).toHaveAttribute('title', 'Avqust 2026: sifariş yoxdur')
    expectInert(bar(august), august)
    expectInert(within(august).getByText('Avqust'), august)
  })

  it('marks the latest order’s month alone: darker, in bold, and as the current one — never in red or green', () => {
    renderTrend(year())

    const current = monthLinks().filter((link) => link.getAttribute('aria-current') === 'true')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('href', '/orders/9?basis=last')
    expect(current[0]).toBe(monthLinks().at(-1))
    expect(bar(current[0])).toHaveClass('bg-slate-600')
    expect(within(current[0]).getByText('Sentyabr')).toHaveClass('font-semibold', 'text-slate-900')

    for (const other of monthLinks().slice(0, -1)) {
      expect(other).not.toHaveAttribute('aria-current')
      expect(bar(other)).toHaveClass('bg-slate-300')
      expect(bar(other)).not.toHaveClass('bg-slate-600')
    }

    expect(strip().querySelector('[class*="red-"], [class*="emerald-"]')).toBeNull()
  })

  it('keeps every bar’s height, name, money and title as they were', () => {
    renderTrend(year())

    const [june, july, august, september] = within(strip()).getAllByRole('listitem')
    // The largest month is the full 44 pixels; the others are drawn against it, and a gap is a 4-pixel outline.
    expect(bar(september).style.height).toBe('44px')
    expect(bar(july).style.height).toBe('22px')
    expect(bar(june).style.height).toBe('11px')
    expect(bar(august).style.height).toBe('4px')

    expect(slots()).toEqual([
      { label: 'İyun 2026', amount: '750,00 ₼' },
      { label: 'İyul', amount: '1.500,00 ₼' },
      { label: 'Avqust', amount: '—' },
      { label: 'Sentyabr', amount: '3.000,00 ₼' },
    ])
    expect(bar(june)).toHaveAttribute('title', `İyun 2026: 750,00${nbsp}₼`)
    expect(within(june).getByRole('img', { name: '2 sətirdə qiymət yoxdur' })).toHaveTextContent('⚠ 2')
  })

  it('leaves the card with its one «Sifarişə bax», and says nothing the old words list forbids', () => {
    renderTrend(year())

    const card = screen.getByRole('region', { name: 'Son sifariş və tarixçə' })
    expect(within(card).getAllByRole('link', { name: 'Sifarişə bax' })).toHaveLength(1)
    expect(findOldTerms(card)).toEqual([])
  })

  it('can be reached with Tab and opened with Enter', async () => {
    function Address() {
      const { pathname, search } = useLocation()
      return <p data-testid="address">{pathname + search}</p>
    }

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/locations/43']}>
        <Routes>
          <Route
            path="/locations/:locationId"
            element={(
              <LocationTrend
                entries={year()}
                comparison={null}
                comparisonPending={false}
                selection={lastMonth}
                onSelectBasis={vi.fn()}
                priorMonths={['2026-07', '2026-08']}
              />
            )}
          />
          <Route path="/orders/:orderRequestId" element={<Address />} />
        </Routes>
      </MemoryRouter>,
    )

    const links = monthLinks()
    const reached: HTMLElement[] = []
    for (let step = 0; step < 50 && reached.length < links.length; step++) {
      await user.tab()
      if (links.includes(document.activeElement as HTMLElement)) {
        reached.push(document.activeElement as HTMLElement)
      }
    }

    // Every month with an order, left to right, and the latest last.
    expect(reached).toEqual(links)
    expect(document.activeElement).toHaveAttribute('aria-current', 'true')

    await user.keyboard('{Enter}')
    expect(screen.getByTestId('address')).toHaveTextContent('/orders/9?basis=last')
  })
})

/** U+00A0, by its code point: the no-break space the money formatter puts before ₼. */
const nbsp = String.fromCharCode(0xa0)
