import { afterEach, describe, expect, it, vi } from 'vitest'
import { azNumberFormat } from './azNumber'
import { formatCount, formatMoney, formatPercent, formatQuantity } from './format'

const money = azNumberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2 })
const count = azNumberFormat({ maximumFractionDigits: 4 })

describe('numbers as the owner reads them (D-52)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('puts a dot between the thousands and a comma before the fraction', () => {
    expect(money.format(317128.16)).toBe('317.128,16')
    expect(money.format(1234567.891)).toBe('1.234.567,89')
    expect(money.format(2413.11)).toBe('2.413,11')
    expect(money.format(88)).toBe('88,00')
    expect(money.format(0)).toBe('0,00')
    expect(money.format(-1234.5)).toBe('-1.234,50')
    expect(count.format(1234)).toBe('1.234')
    expect(count.format(12345.6789)).toBe('12.345,6789')
    expect(count.format(12.5)).toBe('12,5')
  })

  it('writes the same whatever the browser knows about Azerbaijani', () => {
    // A runtime whose own separators are neither: the formatter must still write «.» and «,».
    const Original = Intl.NumberFormat
    // A function, not an arrow: the formatter constructs it with `new`.
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locale?: string | string[], options?: Intl.NumberFormatOptions) {
      const real = new Original(locale, options)
      return {
        format: () => 'not this',
        formatToParts: (value: number) => real.formatToParts(value).map((part) =>
          part.type === 'group' ? { ...part, value: ' ' } : part.type === 'decimal' ? { ...part, value: '·' } : part),
      }
    } as unknown as typeof Intl.NumberFormat)

    expect(azNumberFormat({ minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(317128.16)).toBe('317.128,16')
  })

  it('is what every money, count and percentage on the screens is written with', () => {
    expect(formatMoney(317128.16)).toBe('317.128,16 ₼')
    expect(formatCount(3624)).toBe('3.624')
    expect(formatQuantity(1234.5)).toBe('1.234,5')
    expect(formatPercent(12.5)).toBe('+12,5%')
    expect(formatPercent(-1466.4)).toBe('−1.466,4%')
  })

  it('is the only number formatter for Azerbaijani in the code', () => {
    const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>

    expect(Object.keys(sources).length).toBeGreaterThan(50)
    const offenders = Object.entries(sources)
      .filter(([, text]) => /Intl\.NumberFormat\(\s*['"]az/.test(text) || /toLocaleString\(\s*['"]az/.test(text))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
