import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VariantTrendPoint } from '../../api/analytics'
import { TrendChart } from './TrendChart'
import type { TrendSlot } from './trend'

/**
 * The history chart, read through the props it hands the chart library: jsdom cannot lay out an SVG, but what
 * the chart is told to draw — the line's shape, which months are named, where the axis ends — is the decision
 * under test (brief, Task 10).
 */
type Props = Record<string, unknown>

const drawn = vi.hoisted(() => ({ chart: [] as Props[], xAxis: [] as Props[], yAxis: [] as Props[], line: [] as Props[] }))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  LineChart: ({ children, ...props }: { children?: ReactNode } & Props) => {
    drawn.chart.push(props)
    return <div>{children}</div>
  },
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: (props: Props) => {
    drawn.xAxis.push(props)
    return null
  },
  YAxis: (props: Props) => {
    drawn.yAxis.push(props)
    return null
  },
  Line: (props: Props) => {
    drawn.line.push(props)
    return null
  },
}))

function slot(period: string, quantity: number, overrides: Partial<VariantTrendPoint> = {}): TrendSlot {
  return {
    period,
    point: {
      period: `${period}-01`,
      orderRequestId: 1,
      version: 1,
      quantity,
      knownAmount: quantity * 32,
      weightedUnitPrice: 32,
      itemCount: 1,
      knownPriceItemCount: 1,
      missingRequiredPriceItemCount: 0,
      priceNotRequiredItemCount: 0,
      supplierNames: [],
      ...overrides,
    },
  }
}

/** Şampun qab, the brief's example: İyul 40, Avqust 20, Sentyabr 40 ədəd. */
const shampoo = [slot('2026-07', 40), slot('2026-08', 20), slot('2026-09', 40)]

/** Traktor qazonbiçən: none, then one. */
const tractor = [slot('2026-08', 0, { itemCount: 0 }), slot('2026-09', 1, { knownAmount: 21900, weightedUnitPrice: 21900 })]

function last(props: Props[]): Props {
  return props[props.length - 1]
}

beforeEach(() => {
  drawn.chart.length = 0
  drawn.xAxis.length = 0
  drawn.yAxis.length = 0
  drawn.line.length = 0
})

describe('the line', () => {
  /** A monthly figure has no value between two months; a curve drew one. */
  it('is straight from month to month, and still breaks at a month with no order', () => {
    render(<TrendChart slots={shampoo} metric="quantity" />)

    expect(last(drawn.line).type).toBe('linear')
    expect(last(drawn.line).connectNulls).toBe(false)
  })
})

describe('the months', () => {
  it('names every month, Avqust included', () => {
    render(<TrendChart slots={shampoo} metric="quantity" />)

    const axis = last(drawn.xAxis)
    expect(axis.interval).toBe(0)
    const format = axis.tickFormatter as (period: string) => string
    const data = last(drawn.chart).data as Array<Record<string, unknown>>
    const labels = data.map((row) => format(row[axis.dataKey as string] as string))
    expect(labels).toEqual(['İyul 2026', 'Avqust', 'Sentyabr'])
  })

  it('tilts the names of a long window rather than skipping any', () => {
    const year = Array.from({ length: 12 }, (_, index) => slot(`2025-${String(index + 1).padStart(2, '0')}`, 5))
    render(<TrendChart slots={year} metric="quantity" />)

    const axis = last(drawn.xAxis)
    expect(axis.interval).toBe(0)
    expect(axis.angle).toBe(-35)
    expect(axis.textAnchor).toBe('end')
  })
})

describe('the value axis', () => {
  /** Brief acceptance: "ox 0 və 1 göstərir (0.25 yox)". */
  it('counts a traktor in whole numbers, 0 and 1 among them', () => {
    render(<TrendChart slots={tractor} metric="quantity" />)

    const axis = last(drawn.yAxis)
    const ticks = axis.ticks as number[]
    expect(axis.allowDecimals).toBe(false)
    expect(ticks).toContain(0)
    expect(ticks).toContain(1)
    expect(ticks.every(Number.isInteger)).toBe(true)
  })

  it('ends above the highest month, and above a flat price', () => {
    render(<TrendChart slots={shampoo} metric="quantity" />)
    expect((last(drawn.yAxis).domain as number[])[1]).toBeGreaterThan(40)

    render(<TrendChart slots={shampoo} metric="price" />)
    const price = last(drawn.yAxis)
    expect((price.domain as number[])[1]).toBeGreaterThan(32)
    // A price keeps its qəpik: it is never forced onto whole numbers.
    expect(price.allowDecimals).toBe(true)
  })
})
