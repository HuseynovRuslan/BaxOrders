import { describe, expect, it } from 'vitest'
import {
  amountHeading,
  formatDelta,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  formatPeriodCoverage,
  formatQuantity,
  knownAmountLabel,
  toMonthKey,
  unknownValue,
} from './format'

/**
 * These are business rules wearing presentation clothes. A percentage that does not exist must not read as
 * zero, money that is only partly known must not read as a total, and a month must not shift because of the
 * reader's time zone — so each one is pinned here rather than left to a component.
 */
describe('percentages', () => {
  it('writes a percentage the backend did not give as an em dash', () => {
    // A rise from nothing has no percentage. Zero would be false and infinity would be worse.
    expect(formatPercent(null)).toBe(unknownValue)
    expect(formatPercent(undefined)).toBe(unknownValue)
  })

  it('marks a rise with a plus', () => {
    expect(formatPercent(20)).toBe('+20%')
    expect(formatPercent(0.5)).toBe('+0,5%')
  })

  it('marks a fall with a minus sign, not a hyphen', () => {
    expect(formatPercent(-15.5)).toBe('−15,5%')
    expect(formatPercent(-100)).toBe('−100%')
  })

  it('leaves no change unsigned', () => {
    expect(formatPercent(0)).toBe('0%')
  })

  it('never produces NaN or Infinity text', () => {
    for (const value of [null, undefined, 0, -100, 12.3456]) {
      const written = formatPercent(value)
      expect(written).not.toMatch(/NaN|Infinity|∞/)
    }
  })
})

describe('money', () => {
  it('writes an amount the backend did not give as an em dash, never as zero', () => {
    expect(formatMoney(null)).toBe(unknownValue)
    expect(formatMoney(null)).not.toBe('0,00 ₼')
  })

  it('writes an amount in manat with two decimals, grouped the Azerbaijani way', () => {
    // The separators come from the az-Latn-AZ locale: "." between groups and "," before the decimals.
    expect(formatMoney(48430.78)).toBe('48.430,78 ₼')
    expect(formatMoney(0)).toBe('0,00 ₼')
  })

  it('signs a money difference the same way as a percentage', () => {
    expect(formatMoneyDelta(1200)).toBe('+1.200,00 ₼')
    expect(formatMoneyDelta(-22561.84)).toBe('−22.561,84 ₼')
    expect(formatMoneyDelta(null)).toBe(unknownValue)
  })

  it('heads an incomplete amount as money that is known', () => {
    expect(amountHeading('Cari dövrün məbləği', false)).toContain(knownAmountLabel)
  })

  it('does not call a complete amount incomplete', () => {
    expect(amountHeading('Cari dövrün məbləği', true)).toBe('Cari dövrün məbləği')
    expect(amountHeading('Cari dövrün məbləği', true)).not.toContain(knownAmountLabel)
  })
})

describe('quantities and counts', () => {
  it('writes a quantity the backend did not give — a service — as an em dash', () => {
    expect(formatQuantity(null)).toBe(unknownValue)
  })

  it('keeps a quantity at the precision the backend sent, without inventing trailing zeros', () => {
    expect(formatQuantity(10)).toBe('10')
    expect(formatQuantity(3.333)).toBe('3,333')
  })

  it('signs a plain difference', () => {
    expect(formatDelta(20)).toBe('+20')
    expect(formatDelta(-20)).toBe('−20')
    expect(formatDelta(null)).toBe(unknownValue)
  })
})

describe('months', () => {
  it('names a month in Azerbaijani from either form the API uses', () => {
    expect(formatMonth('2026-07')).toBe('İyul 2026')
    expect(formatMonth('2026-07-01')).toBe('İyul 2026')
  })

  it('reads the month from the text, so a time zone cannot move it', () => {
    // A Date built from "2026-01-01" is midnight UTC and reads as December in a negative offset.
    expect(formatMonth('2026-01-01')).toBe('Yanvar 2026')
    expect(formatMonth('2026-12-01')).toBe('Dekabr 2026')
  })

  it('reduces either form to the yyyy-MM the analytics API speaks', () => {
    expect(toMonthKey('2026-07-01')).toBe('2026-07')
    expect(toMonthKey('2026-07')).toBe('2026-07')
  })
})

describe('history coverage', () => {
  it('writes what a comparison actually rests on', () => {
    expect(formatPeriodCoverage(2, 3)).toBe('2/3 ay')
    expect(formatPeriodCoverage(1, 1)).toBe('1/1 ay')
    expect(formatPeriodCoverage(0, 6)).toBe('0/6 ay')
  })
})
