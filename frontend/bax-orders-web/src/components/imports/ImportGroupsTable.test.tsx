import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { stagingGroup as group } from '../../test/importFixtures'
import { findOldPriceTerms } from '../../test/oldTerms'
import { ImportGroupsTable } from './ImportGroupsTable'

/**
 * Brief (Task 16): the staging groups speak Task 2's words. «Qiymət yoxdur» is the group's included rows that are
 * unpriced and unclassified or said to be bought; «Daxili təminat» the ones said to be supplied free.
 */

function cells(locationName: string) {
  const row = screen.getByRole('row', { name: new RegExp(locationName) })
  return within(row).getAllByRole('cell')
}

describe('the price columns', () => {
  it('are Task 2’s two words, not «Qiymətli / qiymətsiz»', () => {
    render(<ImportGroupsTable groups={[group()]} ungroupedRows={0} />)

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toContain('Qiymət yoxdur')
    expect(headers).toContain('Daxili təminat')
    expect(screen.queryByText(/Qiymətli \/ qiymətsiz/i)).toBeNull()
    expect(findOldPriceTerms(document.body)).toEqual([])
  })

  it('shows the included rows 16a counts, not the unpriced rows that include an excluded one', () => {
    // Six unpriced rows, one of them excluded: rowCount / unpricedRows still count it, missingPriceRows does not.
    render(
      <ImportGroupsTable
        groups={[
          group({ rowCount: 10, pricedRows: 4, unpricedRows: 6, missingPriceRows: 3, internalSupplyRows: 2, warningCount: 1 }),
        ]}
        ungroupedRows={0}
      />,
    )

    const [, , rows, missing, internal] = cells('Heydər Əliyev Mərkəzi')
    expect(rows).toHaveTextContent('10')
    expect(missing).toHaveTextContent(/^3$/)
    expect(internal).toHaveTextContent(/^2$/)
    // Neither the old pair nor anything subtracted from it.
    expect(screen.queryByText('4 / 6')).toBeNull()
    expect(screen.queryByText('6')).toBeNull()
  })

  it('makes «Qiymət yoxdur» amber and «Daxili təminat» never amber', () => {
    render(<ImportGroupsTable groups={[group()]} ungroupedRows={0} />)

    const [, , , missing, internal] = cells('Heydər Əliyev Mərkəzi')
    expect(missing.className).toMatch(/amber/)
    expect(internal.className).not.toMatch(/amber/)
  })

  it('shows a dash at zero', () => {
    render(<ImportGroupsTable groups={[group({ missingPriceRows: 0, internalSupplyRows: 0 })]} ungroupedRows={0} />)

    const [, , , missing, internal] = cells('Heydər Əliyev Mərkəzi')
    expect(missing).toHaveTextContent('—')
    expect(internal).toHaveTextContent('—')
    expect(missing.className).not.toMatch(/amber/)
  })
})
