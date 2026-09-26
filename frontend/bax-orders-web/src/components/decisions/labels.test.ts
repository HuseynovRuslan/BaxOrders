import { describe, expect, it } from 'vitest'
import { causeLabels, hasEffectSplit, primaryCause, primaryCauseLine, soleEffectLabel } from './labels'

/**
 * Why a product moved the order's amount, in the words a manager uses.
 *
 * The rule is the whole point: the larger contribution in absolute money is the reason, and its own sign says
 * which way. Nothing is weighed, guessed or thresholded — the two figures come from the backend and the sentence
 * is a reading of them. These tests are the rule table, so a later change to the wording cannot quietly change
 * which factor gets named.
 */
describe('the primary cause of a row', () => {
  it('names ordering more when quantity carries a rise', () => {
    expect(primaryCause('QuantityChange', 270, 90)).toBe('daha çox sifariş verilib')
  })

  it('names ordering less when quantity carries a fall', () => {
    expect(primaryCause('QuantityChange', -270, -90)).toBe('daha az sifariş verilib')
  })

  it('names a rising price when price carries a rise', () => {
    expect(primaryCause('PriceChange', 30, 120)).toBe('qiymət artıb')
  })

  it('names a falling price when price carries a fall', () => {
    expect(primaryCause('PriceChange', -30, -120)).toBe('qiymət azalıb')
  })

  /**
   * The audit's Latex: 8,75 → 40 paket at 7,27 → 7,00 ₼ is +216,43 ₼, of which +227,03 is quantity and −10,60 is
   * price. The reason is the quantity even though the unit price fell — and the row shows the fall underneath, so
   * the reader is never told the price rose.
   */
  it('names quantity on Latex, whose price actually fell', () => {
    expect(primaryCause('QuantityChange', 227.03, -10.6)).toBe('daha çox sifariş verilib')
  })

  /**
   * The audit's Zibil paketi: 30,75 → 30 paket at 31,15 → 34,00 ₼ is +62,25 ₼, of which −23,36 is quantity and
   * +85,61 is price. Fewer were ordered, and the higher price more than made up for it.
   */
  it('names price on Zibil paketi, whose quantity actually fell', () => {
    expect(primaryCause('QuantityChange', -23.36, 85.61)).toBe('qiymət artıb')
  })

  /** Neither outweighs the other, so neither may be called the reason. */
  it('names neither when the two weigh exactly the same', () => {
    expect(primaryCause('QuantityChange', 40, -40)).toBe('miqdar və qiymət eyni təsir edib')
    expect(primaryCause('QuantityChange', 40, 40)).toBe('miqdar və qiymət eyni təsir edib')
  })

  /**
   * The backend splits a variant into the two effects only where both exist, so neither of these is forced into
   * quantity-and-price words. The two a reader still wants a sentence for get their own; the rest say everything
   * they have in their badge, and a second line would only repeat it.
   */
  it('gives a new product and a dropped one their own words, in their own terms', () => {
    expect(hasEffectSplit(null, null)).toBe(false)
    expect(primaryCause('NewOrders', null, null)).toBe('Bu ay ilk dəfə sifariş edilib')
    expect(primaryCause('NoLongerOrdered', null, null)).toBe('keçən ay olan məhsul bu ay yazılmayıb')
  })

  it('leaves a service, store material and a line owing a price to their badge', () => {
    for (const category of ['Services', 'InternalSupply', 'UnattributedDueToMissingPrice'] as const) {
      expect(primaryCause(category, null, null)).toBeNull()
      expect(primaryCauseLine(category, null, null)).toBeNull()
      // The badge still names them, in the category's own accepted words.
      expect(causeLabels[category]).toBeTruthy()
    }
  })

  /** One half missing is not a split either: half a decomposition explains nothing. */
  it('treats one missing half as no split at all', () => {
    expect(hasEffectSplit(270, null)).toBe(false)
    expect(hasEffectSplit(null, 90)).toBe(false)
    expect(primaryCause('NewOrders', 270, null)).toBe('Bu ay ilk dəfə sifariş edilib')
  })

  /**
   * A product with only one effect names that effect in its own terms, and never as a quantity or a price one —
   * a new product's whole amount is new spending, not "more ordered" at a price nobody had before.
   */
  it('names the one effect of a row that has only one', () => {
    expect(soleEffectLabel('NewOrders', null, null)).toBe('Yeni məhsulun təsiri')
    expect(soleEffectLabel('NoLongerOrdered', null, null)).toBe('Bu ay yazılmamasının təsiri')
    expect(soleEffectLabel('Services', null, null)).toBeNull()
    // Where the money is split in two, the two effect labels carry it instead.
    expect(soleEffectLabel('QuantityChange', 270, 90)).toBeNull()
  })

  /** The whole line, assembled in one place so no component builds it from two pieces. */
  it('writes the line with its lead', () => {
    expect(primaryCauseLine('QuantityChange', 270, 90)).toBe('Əsas səbəb: daha çox sifariş verilib')
  })
})
