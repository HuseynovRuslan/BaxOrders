import { describe, expect, it } from 'vitest'
import { readReportView, reportViewLabels, reportViewOrder, reportViewParam } from './reportView'

/** UI V2 (D-50 №6; 03 §3.2): the report opens «Yığcam»; «Standart» travels as `view=standart`. */
describe('the monthly report’s view in the address', () => {
  it('opens compact when the address says nothing, or something it does not know', () => {
    expect(readReportView(null)).toBe('Compact')
    expect(readReportView('')).toBe('Compact')
    expect(readReportView('etrafli')).toBe('Compact')
    expect(readReportView('Standart')).toBe('Compact')
  })

  it('reads and writes standart, and writes nothing for the default', () => {
    expect(readReportView('standart')).toBe('Standard')
    expect(reportViewParam('Standard')).toBe('standart')
    expect(reportViewParam('Compact')).toBeUndefined()
  })

  it('offers the two in the order and the words of the approved design', () => {
    expect(reportViewOrder.map((view) => reportViewLabels[view])).toEqual(['Yığcam', 'Standart'])
  })
})
