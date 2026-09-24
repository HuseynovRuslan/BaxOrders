import { describe, expect, it } from 'vitest'
import { formatItemSpecification, formatOrderUnit } from '../components/imports/labels'
import { unitWord } from './units'

/** A manager reads "71 → 0 ədəd", never "71 → 0 PCS". */
describe('the word for a unit', () => {
  it('says every unit the audit found in English in Azerbaijani', () => {
    expect(unitWord('PCS')).toBe('ədəd')
    expect(unitWord('BAG')).toBe('kisə')
    expect(unitWord('PACK')).toBe('paket')
    expect(unitWord('PAIR')).toBe('cüt')
    expect(unitWord('ROLL')).toBe('rulon')
    expect(unitWord('L')).toBe('litr')
    expect(unitWord('M2')).toBe('m²')
    expect(unitWord('KG')).toBe('kq')
  })

  it('uses the catalogue’s own symbol for the other units it knows', () => {
    expect(unitWord('CM')).toBe('sm')
    expect(unitWord('M')).toBe('m')
    expect(unitWord('MM')).toBe('mm')
    expect(unitWord('G')).toBe('qr')
    expect(unitWord('ML')).toBe('ml')
    expect(unitWord('MONTH')).toBe('ay')
    expect(unitWord('TIME')).toBe('dəfə')
  })

  it('does not care how the code is cased or padded', () => {
    expect(unitWord('pcs')).toBe('ədəd')
    expect(unitWord(' Kg ')).toBe('kq')
    expect(unitWord('m2')).toBe('m²')
  })

  /** The word, not the stored name: PACK is still "Paçka" in the catalogue, and nothing stored changes. */
  it('prefers its own word to the catalogue name for a unit it knows', () => {
    expect(unitWord('PACK', 'Paçka')).toBe('paket')
    expect(unitWord('PCS', 'Ədəd')).toBe('ədəd')
  })

  it('names a unit it does not know by its catalogue name, in lower case', () => {
    expect(unitWord('SET', 'Dəst')).toBe('dəst')
    // Azerbaijani casing: a dotted capital İ is a dotted i, not "i̇".
    expect(unitWord('INCH', 'İnç')).toBe('inç')
  })

  it('shows the code only when there is nothing else to show', () => {
    expect(unitWord('XYZ')).toBe('XYZ')
    expect(unitWord('XYZ', null)).toBe('XYZ')
    expect(unitWord('XYZ', '  ')).toBe('XYZ')
  })

  it('has no word for no unit', () => {
    expect(unitWord(null)).toBeNull()
    expect(unitWord(undefined)).toBeNull()
    expect(unitWord('')).toBeNull()
    expect(unitWord('   ')).toBeNull()
  })
})

describe('where a unit is shown', () => {
  it('writes a line’s order unit as a word, and a line with none as "Vahidsiz"', () => {
    expect(formatOrderUnit('PCS')).toBe('ədəd')
    expect(formatOrderUnit('BAG', 'Kisə')).toBe('kisə')
    expect(formatOrderUnit('SET', 'Dəst')).toBe('dəst')
    expect(formatOrderUnit(null)).toBe('Vahidsiz')
  })

  /** "5 litr", "50 kq" — the useful specification stays, in words. */
  it('writes a specification’s unit as a word, and keeps a descriptor ahead of it', () => {
    expect(formatItemSpecification({
      specificationValue: '5',
      specificationUnitCode: 'L',
      specificationUnitName: 'Litr',
      specificationDescriptor: null,
    })).toBe('5 litr')

    expect(formatItemSpecification({
      specificationValue: '28',
      specificationUnitCode: 'PCS',
      specificationDescriptor: 'diş',
    })).toBe('28 diş')

    expect(formatItemSpecification({
      specificationValue: '120',
      specificationUnitCode: null,
      specificationDescriptor: null,
    })).toBe('120')
  })
})
