import { describe, expect, it } from 'vitest'
import {
  noResponsiblePersonLabel,
  orderResponsibilityNote,
  orderResponsibilityText,
  responsiblePersonColumnLabel,
  responsiblePersonLabel,
  severalResponsiblePeopleLabel,
  type OrderResponsibility,
} from './responsibility'

function responsibility(overrides: Partial<OrderResponsibility> = {}): OrderResponsibility {
  return { kind: 'None', personId: null, personName: null, distinctPersonCount: 0, namedLineCount: 0, ...overrides }
}

describe('whose order this is', () => {
  it('names the person an order was assigned to', () => {
    const text = orderResponsibilityText(
      responsibility({ kind: 'Assigned', personId: 4, personName: 'Çingiz', distinctPersonCount: 2, namedLineCount: 41 }),
    )

    expect(text).toBe('Çingiz')
  })

  it('names the person every line agrees on', () => {
    const text = orderResponsibilityText(
      responsibility({ kind: 'AgreedOnLines', personId: 7, personName: 'Eldar', distinctPersonCount: 1, namedLineCount: 12 }),
    )

    expect(text).toBe('Eldar')
  })

  /**
   * The one thing this must never do: lead with the person who has the most lines. An order of thirty-seven
   * cleaning lines and two fuel lines is not the cleaner's order, and naming them first would read as a
   * decision nobody made.
   */
  it('says there are several rather than naming one of them', () => {
    const text = orderResponsibilityText(
      responsibility({ kind: 'Several', distinctPersonCount: 2, namedLineCount: 39 }),
    )

    expect(text).toBe(severalResponsiblePeopleLabel)
    expect(text).not.toMatch(/nəfər$/)
    expect(text).not.toContain('+')
  })

  it('says nobody is recorded rather than leaving a gap', () => {
    expect(orderResponsibilityText(responsibility())).toBe(noResponsiblePersonLabel)
  })

  /** An assignment whose name was not loaded still reads as an answer, not as an empty heading. */
  it('falls back to the words for nobody when an assignment has no name', () => {
    const text = orderResponsibilityText(responsibility({ kind: 'Assigned', personId: 99, personName: null }))

    expect(text).toBe(noResponsiblePersonLabel)
  })
})

describe('why the heading says what it says', () => {
  it('says an assignment is a decision about the whole order', () => {
    const note = orderResponsibilityNote(responsibility({ kind: 'Assigned', personId: 4, personName: 'Çingiz' }))

    expect(note).toBe('Sifariş bütövlükdə bu şəxsə təyin edilib')
  })

  it('points at the lines when the order has several people', () => {
    const note = orderResponsibilityNote(responsibility({ kind: 'Several', distinctPersonCount: 3 }))

    expect(note).toContain('sətrin')
  })

  it('adds nothing to an answer that speaks for itself', () => {
    expect(orderResponsibilityNote(responsibility({ kind: 'AgreedOnLines', personId: 7, personName: 'Eldar' }))).toBeNull()
    expect(orderResponsibilityNote(responsibility())).toBeNull()
  })
})

describe('the words themselves', () => {
  it('uses the short form on a line and the workbook column name in a form', () => {
    expect(responsiblePersonLabel).toBe('Cavabdeh')
    expect(responsiblePersonColumnLabel).toBe('Cavabdeh şəxs')
  })

  /** Azerbaijani, and specifically the letters the business writes: ə and ş are never folded away. */
  it('keeps the Azerbaijani letters', () => {
    expect(severalResponsiblePeopleLabel).toBe('Bir neçə cavabdeh')
    expect(noResponsiblePersonLabel).toContain('təyin edilməyib')
  })
})
