import { describe, expect, it } from 'vitest'
import { findOldTerms } from '../test/oldTerms'
import { baselineCoverageLabel, baselineCoverageNote } from './labels'

/**
 * Task 21 (21.3): a difference over a partial baseline says how much baseline it has, as a count. It is a fact,
 * not a warning — the percentage is exact for the data there is — so it is never called "təxmini".
 */
describe('the baseline coverage label', () => {
  it('reads "Baza 2/6 ay"', () => {
    expect(baselineCoverageLabel(2, 6)).toBe('Baza 2/6 ay')
    expect(baselineCoverageLabel(4, 6)).toBe('Baza 4/6 ay')
  })

  it('uses no retired word, and never qualifies the figure as an estimate', () => {
    const line = document.createElement('p')
    line.textContent = baselineCoverageLabel(2, 6)

    expect(findOldTerms(line)).toEqual([])
    expect(line.textContent).not.toMatch(/təxmini|təqribi/i)
  })
})

describe('when a row says it', () => {
  const partial = {
    knownAmountDelta: 200,
    historyCoverage: 'Partial',
    availableBaselinePeriodCount: 2,
    expectedBaselinePeriodCount: 6,
  } as const

  it('says it for a difference over a partial baseline', () => {
    expect(baselineCoverageNote(partial)).toBe('Baza 2/6 ay')
  })

  it.each([
    ['a complete baseline', { ...partial, historyCoverage: 'Complete', availableBaselinePeriodCount: 6 }],
    ['no baseline month at all', { ...partial, historyCoverage: 'Unavailable', availableBaselinePeriodCount: 0, knownAmountDelta: null }],
    ['0 of 6 months', { ...partial, historyCoverage: 'Unavailable', availableBaselinePeriodCount: 0 }],
    ['no difference to qualify', { ...partial, knownAmountDelta: null }],
  ] as const)('says nothing for %s', (_case, row) => {
    expect(baselineCoverageNote(row)).toBeNull()
  })

  it('says it for a fall as well as a rise', () => {
    expect(baselineCoverageNote({ ...partial, knownAmountDelta: -200 })).toBe('Baza 2/6 ay')
  })
})
