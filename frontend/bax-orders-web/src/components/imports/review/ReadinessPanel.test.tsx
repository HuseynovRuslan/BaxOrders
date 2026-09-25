import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importReadiness as readiness } from '../../../test/importFixtures'
import { findOldPriceTerms } from '../../../test/oldTerms'
import { pricingArea, ReadinessPanel } from './ReadinessPanel'

/**
 * Brief (Task 16): "Import yoxlaması (review) Task 2-nin sözləri ilə danışır: «N sətirdə qiymət yoxdur»", and the
 * rows nobody classifies land on Qiymət təsnifatı as «Təsnif edilməyib» — "ekran bunu əvvəlcədən deyir; yanında
 * Qiymət təsnifatına keçid var."
 */
const rowsApi = vi.hoisted(() => ({ fetchReadiness: vi.fn() }))

vi.mock('../../../api/rows', async () => {
  const actual = await vi.importActual<typeof import('../../../api/rows')>('../../../api/rows')
  return { ...actual, ...rowsApi }
})

// The fixture is acceptance 1's example: 7 = 5 unclassified + 2 bought, and 2 supplied free.
function renderPanel(onNavigate = vi.fn(), onLoaded = vi.fn()) {
  render(
    <MemoryRouter>
      <ReadinessPanel importId={6} version={0} onNavigate={onNavigate} onLoaded={onLoaded} />
    </MemoryRouter>,
  )
  return { onNavigate, onLoaded }
}

function strip() {
  return screen.getByRole('group', { name: 'Qiymət vəziyyəti' })
}

beforeEach(() => {
  rowsApi.fetchReadiness.mockReset().mockResolvedValue(readiness())
})

afterEach(() => vi.clearAllMocks())

describe('the price strip', () => {
  it('says «7 sətirdə qiymət yoxdur» and splits it in Task 2’s words', async () => {
    renderPanel()

    expect(await screen.findByText('7 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(strip()).toHaveTextContent('Təsnif edilməyib 5 · Alış qiyməti tələb olunur 2 · Daxili təminat 2')
  })

  it('never makes «Daxili təminat» amber', async () => {
    renderPanel()

    const internal = await within(await screen.findByRole('group', { name: 'Qiymət vəziyyəti' })).findByText('Daxili təminat 2')
    expect(internal.className).not.toMatch(/amber/)
    expect(internal.closest('p')?.className ?? '').not.toMatch(/amber/)
    expect(within(strip()).getByText('7 sətirdə qiymət yoxdur').className).toMatch(/amber/)
  })

  it('says beforehand what becomes of the rows nobody classified, with the way to Qiymət təsnifatı', async () => {
    renderPanel()

    expect(await screen.findByText('5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')).toBeInTheDocument()
    expect(within(strip()).getByRole('link', { name: 'Qiymət təsnifatına bax' })).toHaveAttribute('href', '/pricing-modes')
  })

  it('opens the classification tab from «Təsnif et»', async () => {
    const user = userEvent.setup()
    const { onNavigate } = renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Təsnif et' }))
    expect(onNavigate).toHaveBeenCalledWith(pricingArea, 'MissingPrice')
  })

  it('keeps «Qiymət yoxdur» among the non-blocking counts, with the same number', async () => {
    renderPanel()

    await screen.findByText('7 sətirdə qiymət yoxdur')
    const label = screen.getByText('Qiymət yoxdur', { selector: 'dt' })
    expect(label.nextElementSibling).toHaveTextContent('7')
  })

  it('has no advance warning when every unpriced row is classified, and still says what is missing', async () => {
    rowsApi.fetchReadiness.mockResolvedValue(readiness({ missingPrice: 2, unclassifiedPrice: 0, priceRequired: 2, priceNotRequired: 5 }))
    renderPanel()

    expect(await screen.findByText('2 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(strip()).toHaveTextContent('Təsnif edilməyib 0 · Alış qiyməti tələb olunur 2 · Daxili təminat 5')
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
  })

  it('does not warn when only internal supply is left: nothing is missing', async () => {
    rowsApi.fetchReadiness.mockResolvedValue(readiness({ missingPrice: 0, unclassifiedPrice: 0, priceRequired: 0, priceNotRequired: 3 }))
    renderPanel()

    expect(await screen.findByRole('group', { name: 'Qiymət vəziyyəti' })).toHaveTextContent('Daxili təminat 3')
    expect(screen.queryByText(/sətirdə qiymət yoxdur/)).toBeNull()
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
  })

  it('is absent when nothing is unpriced', async () => {
    rowsApi.fetchReadiness.mockResolvedValue(readiness({ missingPrice: 0, unclassifiedPrice: 0, priceRequired: 0, priceNotRequired: 0 }))
    renderPanel()

    expect(await screen.findByText('İmporta hazırlıq')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Qiymət vəziyyəti' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsnif et' })).toBeNull()
  })

  it('never adds a classification to the blockers', async () => {
    renderPanel()

    await screen.findByText('7 sətirdə qiymət yoxdur')
    expect(screen.getByText('İmporta hazırdır')).toBeInTheDocument()
    expect(screen.queryByText('Qalan maneələr')).toBeNull()
  })

  it('does not say "will land", nor offer «Təsnif et», about a batch already imported', async () => {
    rowsApi.fetchReadiness.mockResolvedValue(readiness({}, { batchStatus: 'Imported' }))
    renderPanel()

    expect(await screen.findByText('7 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsnif et' })).toBeNull()
    expect(within(strip()).getByRole('link', { name: 'Qiymət təsnifatına bax' })).toHaveAttribute('href', '/pricing-modes')
  })

  it('believes the page over a readiness read before the import was confirmed', async () => {
    render(
      <MemoryRouter>
        <ReadinessPanel importId={6} version={0} batchStatus="Imported" onNavigate={vi.fn()} />
      </MemoryRouter>,
    )

    expect(await screen.findByText('7 sətirdə qiymət yoxdur')).toBeInTheDocument()
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Təsnif et' })).toBeNull()
  })

  it('reports each readiness it reads, so the review can badge its tab without asking again', async () => {
    const { onLoaded } = renderPanel()

    await screen.findByText('7 sətirdə qiymət yoxdur')
    expect(onLoaded).toHaveBeenCalledWith(expect.objectContaining({ warnings: expect.objectContaining({ unclassifiedPrice: 5 }) }))
    expect(rowsApi.fetchReadiness).toHaveBeenCalledTimes(1)
  })

  it('says no old price word', async () => {
    renderPanel()

    await screen.findByText('7 sətirdə qiymət yoxdur')
    expect(findOldPriceTerms(document.body)).toEqual([])
  })
})
