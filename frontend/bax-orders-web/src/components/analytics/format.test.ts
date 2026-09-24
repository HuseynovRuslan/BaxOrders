import { describe, expect, it } from 'vitest'
import {
  amountHeading,
  describeBasis,
  describeDirection,
  formatDelta,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  formatPercent,
  formatPeriodCoverage,
  formatQuantity,
  knownAmountLabel,
  signedToneClass,
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

describe('naming the comparison basis', () => {
  /** Three of the five name themselves; the other two cannot, and are named from the months resolved. */
  it('uses the fixed name where the calendar decides the window', () => {
    expect(describeBasis('PreviousMonth', [])).toBe('Keçən ay')
    expect(describeBasis('Previous3MonthAverage', [])).toBe('Son 3 ayın ortalaması')
    expect(describeBasis('Previous6MonthAverage', [])).toBe('Son 6 ayın ortalaması')
  })

  it('names every prior month as an average of the whole period', () => {
    expect(describeBasis('AllPriorMonths', ['2026-01-01', '2026-02-01'])).toBe('Bütün dövrün ortalaması')
  })

  /** A window of one month is that month, not an average of it. */
  it('names a single hand-picked month as the month', () => {
    expect(describeBasis('CustomRange', ['2026-03-01'])).toBe('Mart 2026')
  })

  it('names a hand-picked range by its ends', () => {
    expect(describeBasis('CustomRange', ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01']))
      .toBe('Yanvar–May 2026 ortalaması')
  })

  /** Across a year boundary the first month keeps its year, or the heading would name the wrong four months. */
  it('keeps both years when a range crosses one', () => {
    expect(describeBasis('CustomRange', ['2025-11-01', '2025-12-01', '2026-01-01']))
      .toBe('Noyabr 2025–Yanvar 2026 ortalaması')
  })
})

describe('which way a month moved', () => {
  it('says it in the ablative the basis takes', () => {
    expect(describeDirection('Previous6MonthAverage', [], 10626.82)).toBe('Son 6 ayın ortalamasından yüksəkdir')
    expect(describeDirection('PreviousMonth', [], -1)).toBe('Keçən aydan aşağıdır')
    expect(describeDirection('AllPriorMonths', ['2026-01-01'], 5)).toBe('Bütün dövrün ortalamasından yüksəkdir')
  })

  /**
   * A hand-picked month can be any month of any year, and guessing a case ending for one would produce wrong
   * Azerbaijani — so it takes the form that needs no ending.
   */
  it('avoids inventing an ending for a month it was handed', () => {
    expect(describeDirection('CustomRange', ['2026-03-01'], 5)).toBe('Mart 2026 ilə müqayisədə yüksəkdir')
  })

  it('says nothing at all when there is no difference to describe', () => {
    expect(describeDirection('PreviousMonth', [], null)).toBeNull()
  })

  it('does not call an unchanged month a rise', () => {
    expect(describeDirection('PreviousMonth', [], 0)).toBe('Keçən aydan fərqlənmir')
  })
})

describe('the colour of a signed number', () => {
  /** Direction and nothing else: less spending is not "good" and more is not "bad". */
  it('is emerald up, rose down and slate flat', () => {
    expect(signedToneClass(1)).toBe('text-emerald-700')
    expect(signedToneClass(-1)).toBe('text-rose-700')
    expect(signedToneClass(0)).toBe('text-slate-600')
    expect(signedToneClass(null)).toBe('text-slate-600')
  })
})
