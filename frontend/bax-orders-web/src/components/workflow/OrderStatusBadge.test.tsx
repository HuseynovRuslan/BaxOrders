import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { OrderRequestStatus } from '../../api/orders'
import { warningChipClass, warningToneClass } from '../../pricing/labels'
import { StatusBadge } from '../StatusBadge'
import {
  historicalImportChipClass,
  historicalImportLabel,
  workflowStatusClass,
  workflowStatusLabels,
  workflowStatusSign,
} from './labels'
import { OrderStatusBadge } from './OrderStatusBadge'

/**
 * An order's status, said the same way wherever it is shown (Task 22). An order carried in from Excel as already
 * approved is approved (22.1): it keeps the approved badge, and the 22.2 phrase stands beside it in grey.
 */

/** The status words as the owner fixed them, pinned here so a change to any of them fails rather than drifts. */
const statusWords: Record<OrderRequestStatus, { word: string; sign: string }> = {
  Draft: { word: 'Təsdiqlənməyib', sign: '·' },
  PendingApproval: { word: 'Təsdiq gözləyir', sign: '⏳' },
  Approved: { word: 'Təsdiqlənib', sign: '✓' },
  ReturnedForCorrection: { word: 'Düzəliş tələb olunur', sign: '↩' },
}

const statuses = Object.keys(statusWords) as OrderRequestStatus[]

describe('an order carried in from Excel as already approved', () => {
  it('keeps the approved badge — its word, sign and colours — and says the owner s phrase beside it', () => {
    render(<OrderStatusBadge status="Approved" isHistoricalImport />)

    const badge = screen.getByText('Təsdiqlənib')
    expect(badge).toHaveClass(...workflowStatusClass.Approved.split(' '))
    expect(badge).toHaveTextContent('✓')
    expect(screen.getByText('Tarixi sifariş · sistemə təsdiqlənmiş kimi köçürülüb')).toBeInTheDocument()
  })

  it('puts the phrase beside the badge, not inside it, so the badge still reads as the status alone', () => {
    render(<OrderStatusBadge status="Approved" isHistoricalImport />)

    const badge = screen.getByText('Təsdiqlənib')
    const phrase = screen.getByText(historicalImportLabel)
    expect(badge).not.toContainElement(phrase)
    expect(badge.parentElement).toBe(phrase.parentElement)
    // Wraps, so on a phone the phrase drops under the badge instead of running off the screen.
    expect(badge.parentElement).toHaveClass('inline-flex', 'flex-wrap')
  })

  /** Grey, like the carried-over event in the history. Amber is Task 2's colour for a price still owed. */
  it('says it in neutral grey — never as a warning, a status or a decision', () => {
    render(<OrderStatusBadge status="Approved" isHistoricalImport />)

    const phrase = screen.getByText(historicalImportLabel)
    expect(phrase).toHaveClass(...historicalImportChipClass.split(' '))
    for (const colour of ['amber', 'red', 'emerald', 'sky']) {
      expect(historicalImportChipClass).not.toContain(colour)
      expect(phrase.className).not.toContain(colour)
    }
    expect(historicalImportChipClass).not.toBe(warningChipClass)
    expect(historicalImportChipClass).not.toBe(warningToneClass)
    // No ring and no sign: nothing here should read as a second badge.
    expect(phrase.className).not.toContain('ring')
    expect(phrase.children).toHaveLength(0)
  })

  it('sizes the phrase with the badge', () => {
    render(<OrderStatusBadge status="Approved" isHistoricalImport size="sm" />)

    expect(screen.getByText(historicalImportLabel)).toHaveClass('text-xs')
  })
})

describe('an order approved in this system', () => {
  it.each([
    ['not historical', false],
    ['with the fact not given', undefined],
  ])('shows the badge alone, exactly as before, %s', (_, isHistoricalImport) => {
    const { container } = render(<OrderStatusBadge status="Approved" isHistoricalImport={isHistoricalImport} />)
    const { container: before } = render(
      <StatusBadge
        label={workflowStatusLabels.Approved}
        sign={workflowStatusSign.Approved}
        toneClass={workflowStatusClass.Approved}
      />,
    )

    expect(container.innerHTML).toBe(before.innerHTML)
    expect(container).not.toHaveTextContent(/Tarixi sifariş/)
  })
})

/**
 * The guard: every status, historical or not, reads its own word and sign, and the phrase appears for one
 * combination only. An order that is not approved is never called historical, whatever the flag says.
 */
describe('every status', () => {
  it.each(statuses.flatMap((status) => [true, false].map((historical) => [status, historical] as const)))(
    '%s, historical %s',
    (status, historical) => {
      const { container } = render(<OrderStatusBadge status={status} isHistoricalImport={historical} />)

      expect(workflowStatusLabels[status]).toBe(statusWords[status].word)
      expect(workflowStatusSign[status]).toBe(statusWords[status].sign)

      const badge = screen.getByText(statusWords[status].word)
      expect(badge).toHaveClass(...workflowStatusClass[status].split(' '))
      expect(badge).toHaveTextContent(statusWords[status].sign)

      if (status === 'Approved' && historical) {
        expect(screen.getByText(historicalImportLabel)).toBeInTheDocument()
      } else {
        expect(container).not.toHaveTextContent(/Tarixi sifariş/)
        // Exactly the badge every other screen draws for the same status.
        const { container: plain } = render(
          <StatusBadge
            label={workflowStatusLabels[status]}
            sign={workflowStatusSign[status]}
            toneClass={workflowStatusClass[status]}
          />,
        )
        expect(container.innerHTML).toBe(plain.innerHTML)
      }
    },
  )
})
