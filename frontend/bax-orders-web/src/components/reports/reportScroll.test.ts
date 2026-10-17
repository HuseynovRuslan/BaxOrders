import { describe, expect, it } from 'vitest'
import {
  describeBoxScroll,
  maxScrollLeft,
  openingScrollLeft,
  pageScrollLeft,
  visibleMonths,
  type BoxGeometry,
} from './reportScroll'

/**
 * The table in its box as UI V2 lays it out (03 §4.1, D-51): the object 120 pixels, twelve months of `month` pixels,
 * the year 88. A 1280-pixel window with Windows' 17-pixel scrollbar leaves the box 937 pixels.
 */
function geometry({ month = 74, clientWidth = 937, scrollLeft = 0 } = {}): BoxGeometry {
  const months = Array.from({ length: 12 }, (_, index) => ({ left: 120 + index * month, width: month }))
  return { months, objectWidth: 120, yearWidth: 88, clientWidth, scrollWidth: 120 + 12 * month + 88, scrollLeft }
}

describe('the months in sight in the box', () => {
  it('are the ones wholly between the pinned object and year columns', () => {
    // 937 − 120 − 88 = 729 pixels of months: nine whole ones of 74, January to September, and part of October.
    expect(visibleMonths(geometry())).toEqual({ first: 0, last: 8 })
    // Scrolled to February's edge: February to October, and November only in part.
    expect(visibleMonths(geometry({ scrollLeft: 74 }))).toEqual({ first: 1, last: 9 })
  })

  it('says whether the box scrolls, and whether it is at either end', () => {
    expect(describeBoxScroll(geometry())).toMatchObject({ scrolls: true, atStart: true, atEnd: false, first: 0, last: 8 })
    const end = geometry({ scrollLeft: maxScrollLeft(geometry()) })
    expect(describeBoxScroll(end)).toMatchObject({ scrolls: true, atStart: false, atEnd: true })
    // At 1440 every month fits: nothing to scroll, nothing to move to.
    expect(describeBoxScroll(geometry({ clientWidth: 1097 }))).toMatchObject({ scrolls: false, first: 0, last: 11 })
  })

  it('gives the thin bar under the floating header the months’ own width to scroll', () => {
    expect(describeBoxScroll(geometry()).trackWidth).toBe(12 * 74)
  })
})

describe('where the box opens (03 §4.1)', () => {
  it('puts the latest month with orders wholly in sight beside the year, from a month’s own edge', () => {
    // 1280, «Yığcam», orders up to October: February–October in sight, January hidden — the spec's own example.
    const left = openingScrollLeft(geometry(), 9)
    expect(left).toBe(74)
    expect(visibleMonths(geometry({ scrollLeft: left }))).toEqual({ first: 1, last: 9 })
  })

  it('stays at the start when everything up to the latest month already fits', () => {
    expect(openingScrollLeft(geometry(), 8)).toBe(0)
    expect(openingScrollLeft(geometry({ clientWidth: 1097 }), 11)).toBe(0)
  })

  it('never scrolls past the end of the table', () => {
    // December in «Standart» at 1280: as far as the box goes, and December is in sight.
    const standard = geometry({ month: 106 })
    const left = openingScrollLeft(standard, 11)
    expect(left).toBe(maxScrollLeft(standard))
    expect(visibleMonths(geometry({ month: 106, scrollLeft: left }))?.last).toBe(11)
  })

  it('opens «Standart» at 1280 on May–October when the orders reach October', () => {
    const left = openingScrollLeft(geometry({ month: 106 }), 9)
    expect(visibleMonths(geometry({ month: 106, scrollLeft: left }))).toEqual({ first: 4, last: 9 })
  })
})

describe('a page of months', () => {
  it('goes forward by as many months as are in sight, from a month’s edge, and no further than the end', () => {
    const fromFebruary = geometry({ scrollLeft: 74 })
    expect(pageScrollLeft(fromFebruary, 1)).toBe(maxScrollLeft(fromFebruary))
    const fromStart = geometry()
    // Nine in sight from January: the next page starts at October, which is past the end — so the end.
    expect(pageScrollLeft(fromStart, 1)).toBe(maxScrollLeft(fromStart))
  })

  it('goes back by as many months as are in sight, and no further than January', () => {
    const atEnd = geometry({ scrollLeft: maxScrollLeft(geometry()) })
    const back = pageScrollLeft(atEnd, -1)
    expect(back).toBe(0)
    expect(pageScrollLeft(geometry({ scrollLeft: 74 }), -1)).toBe(0)
  })

  it('moves by the room there is when no whole month fits', () => {
    const narrow = geometry({ clientWidth: 240 })
    expect(visibleMonths(narrow)).toBeNull()
    expect(pageScrollLeft(narrow, 1)).toBe(32)
  })
})
