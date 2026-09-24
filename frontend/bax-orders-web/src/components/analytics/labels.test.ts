import { describe, expect, it } from 'vitest'
import {
  describeSpecification,
  describeVariant,
  distinguishingDetails,
  distinguishVariants,
  formatVariantLine,
  type VariantDescription,
} from './labels'

function variant(overrides: Partial<VariantDescription & { productName: string }> = {}) {
  return {
    productName: 'Yay ayaqqabısı',
    specificationValue: null,
    specificationUnitCode: null,
    specificationUnitName: null,
    specificationDescriptor: null,
    modelCode: null,
    orderUnitCode: 'PCS',
    orderUnitName: 'Ədəd',
    ...overrides,
  }
}

/** Task 05b: the useful specification stays ("5 L, 50 kq"); codes nobody can read do not reach the manager. */
describe('what a product row says under its name', () => {
  it('keeps a specification that says what it measures, in words', () => {
    expect(describeVariant(variant({ specificationValue: '5', specificationUnitCode: 'L', specificationUnitName: 'Litr' })))
      .toBe('5 litr · ədəd')
    expect(describeVariant(variant({ specificationValue: '50', specificationUnitCode: 'KG', specificationUnitName: 'Kiloqram' })))
      .toBe('50 kq · ədəd')
    expect(describeVariant(variant({ specificationValue: '28', specificationDescriptor: 'diş' })))
      .toBe('28 diş · ədəd')
  })

  it('leaves out a bare number, which says nothing about what it measures', () => {
    // "2.8" under Rosmarinus in the audit.
    expect(describeVariant(variant({ productName: 'Rosmarinus', specificationValue: '2.8' }))).toBe('ədəd')
    expect(describeSpecification(variant({ specificationValue: '2.8' }))).toBeNull()
  })

  it('never shows the model code', () => {
    // "M-101-S-2" under Yay ayaqqabısı and "20078331" under Columbus 80 BM 100 Şotka in the audit.
    expect(describeVariant(variant({ modelCode: 'M-101-S-2' }))).toBe('ədəd')
    expect(describeVariant(variant({ modelCode: '20078331', specificationValue: '80', specificationUnitCode: 'CM' })))
      .toBe('80 sm · ədəd')
  })

  it('says "Vahidsiz" for a variant with no order unit', () => {
    expect(describeVariant(variant({ orderUnitCode: null, orderUnitName: null }))).toBe('Vahidsiz')
  })

  it('leaves the full technical line to the screens that work with codes', () => {
    expect(formatVariantLine({
      ...variant({ modelCode: 'M-101-S-2', specificationValue: '2.8' }),
      productVariantId: 1,
      productId: 1,
      productCode: 'PRD-000110',
    })).toBe('2.8 · M-101-S-2 · ədəd')
  })
})

describe('two rows that would read alike', () => {
  it('tells two rows of one product and one description apart by their model codes', () => {
    const rows = [variant({ modelCode: 'M-101-S-2' }), variant({ modelCode: 'M-101-S-3' })]

    expect(distinguishingDetails(rows)).toEqual(['M-101-S-2', 'M-101-S-3'])
    expect(distinguishVariants(rows)).toEqual(['ədəd · M-101-S-2', 'ədəd · M-101-S-3'])
  })

  it('uses the bare specification value for a row that has no model code', () => {
    const rows = [
      variant({ productName: 'Rosmarinus', modelCode: 'R-1', specificationValue: '2.8' }),
      variant({ productName: 'Rosmarinus', specificationValue: '3.1' }),
    ]

    expect(distinguishingDetails(rows)).toEqual(['R-1', '3.1'])
  })

  it('adds nothing to a row that is already unique', () => {
    const rows = [
      variant({ modelCode: 'M-101-S-2' }),
      variant({ productName: 'Rosmarinus', specificationValue: '2.8' }),
      // The same product, but the unit already tells it apart.
      variant({ modelCode: 'M-101-S-3', orderUnitCode: 'PAIR', orderUnitName: 'Cüt' }),
    ]

    expect(distinguishingDetails(rows)).toEqual([null, null, null])
    expect(distinguishVariants(rows)).toEqual(['ədəd', 'ədəd', 'cüt'])
  })

  it('only gives back the detail to the rows that collide, not to their neighbours', () => {
    const rows = [
      variant({ modelCode: 'M-101-S-2' }),
      variant({ productName: 'Columbus 80 BM 100 Şotka', modelCode: '20078331' }),
      variant({ modelCode: 'M-101-S-3' }),
    ]

    expect(distinguishingDetails(rows)).toEqual(['M-101-S-2', null, 'M-101-S-3'])
  })
})
