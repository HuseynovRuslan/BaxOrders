import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmationPreview, confirmationResult } from '../../../test/importFixtures'
import { findOldPriceTerms } from '../../../test/oldTerms'
import { ConfirmationDialog } from './ConfirmationDialog'

/**
 * Brief (Task 16): the rows nobody classified land on Qiymət təsnifatı as «Təsnif edilməyib», "və ekran bunu
 * əvvəlcədən deyir; yanında Qiymət təsnifatına keçid var", and "Importdan sonra saylar tutur".
 *
 * 16a's worked example: the preview says 7 «Qiymət yoxdur» (5 unclassified + 2 bought) and 2 free, before any
 * skip; group A holds 5 / 4 / 1 / 1 and group B 2 / 1 / 1 / 1. Leaving B out, the import writes 5 / 4 / 1 — the
 * rise 16a proved on Qiymət təsnifatı — so that is what the dialog must say.
 */
const importsApi = vi.hoisted(() => ({ fetchConfirmationPreview: vi.fn(), confirmImport: vi.fn() }))

vi.mock('../../../api/imports', async () => {
  const actual = await vi.importActual<typeof import('../../../api/imports')>('../../../api/imports')
  return { ...actual, ...importsApi }
})

function renderDialog(onImported = vi.fn()) {
  render(<ConfirmationDialog importId={6} onClose={() => {}} onImported={onImported} />)
  return { onImported }
}

/** A fact's value, by its label: the facts are a definition list. */
function fact(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling as HTMLElement
}

async function skipGroupB() {
  const user = userEvent.setup()
  const row = screen.getByText('Fəvvarələr meydanı').closest('tr') as HTMLElement
  await user.click(within(row).getByRole('radio', { name: 'Bu qrupu idxal etmə' }))
  await user.type(within(row).getByPlaceholderText('Səbəb (məcburidir)'), 'Növbəti ay')
  return user
}

beforeEach(() => {
  importsApi.fetchConfirmationPreview.mockReset().mockResolvedValue(confirmationPreview())
  importsApi.confirmImport.mockReset().mockResolvedValue(confirmationResult())
})

afterEach(() => vi.clearAllMocks())

describe('the price figures', () => {
  it('say 7 «Qiymət yoxdur», 5 «Təsnif edilməyib» and 2 «Daxili təminat» with every group in', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    expect(fact('Qiymət yoxdur')).toHaveTextContent(/^7$/)
    expect(fact('Təsnif edilməyib')).toHaveTextContent(/^5$/)
    expect(fact('Daxili təminat')).toHaveTextContent(/^2$/)
    expect(screen.getByText('5 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')).toBeInTheDocument()
  })

  it('follow a group left out: 5 / 4 / 1, and «4 sətir …»', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    await skipGroupB()

    expect(fact('Qiymət yoxdur')).toHaveTextContent(/^5$/)
    expect(fact('Təsnif edilməyib')).toHaveTextContent(/^4$/)
    expect(fact('Daxili təminat')).toHaveTextContent(/^1$/)
    expect(screen.getByText('4 sətir importdan sonra Qiymət təsnifatına «Təsnif edilməyib» kimi düşəcək.')).toBeInTheDocument()
    expect(screen.queryByText(/^5 sətir importdan sonra/)).toBeNull()
  })

  it('make «Qiymət yoxdur» and «Təsnif edilməyib» amber, and «Daxili təminat» never', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    expect(fact('Qiymət yoxdur').className).toMatch(/amber/)
    expect(fact('Təsnif edilməyib').className).toMatch(/amber/)
    expect(fact('Daxili təminat').className).not.toMatch(/amber/)
  })

  it('have no advance warning when every row is classified', async () => {
    importsApi.fetchConfirmationPreview.mockResolvedValue(
      confirmationPreview({ missingPriceRows: 2, unclassifiedPriceRows: 0, priceRequiredRows: 2 }),
    )
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    expect(fact('Təsnif edilməyib')).toHaveTextContent(/^0$/)
    expect(fact('Təsnif edilməyib').className).not.toMatch(/amber/)
    expect(screen.queryByText(/kimi düşəcək/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Qiymət təsnifatına bax' })).toBeNull()
  })
})

describe('the advance warning', () => {
  it('links to Qiymət təsnifatı in a new tab, so the decisions made here are not lost', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    const link = screen.getByRole('link', { name: 'Qiymət təsnifatına bax' })
    expect(link).toHaveAttribute('href', '/pricing-modes')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText(/İdxaldan əvvəl onları yoxlamanın «Qiymət təsnifatı» bölməsində təsnif edə bilərsiniz\./)).toBeInTheDocument()
  })

  it('reworded the note: the unpriced rows are on Qiymət təsnifatı, not "left unpriced"', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    expect(
      screen.getByText(
        'Bu xəbərdarlıqlar idxalı dayandırmır, amma yox olmur: qiyməti olmayan sətirlər Qiymət təsnifatında görünür, '
        + 'mümkün təkrarlar birləşdirilmir və təchizatçısı olmayan sətirlər boş təchizatçı ilə yazılır.',
      ),
    ).toBeInTheDocument()
  })
})

describe('the groups', () => {
  it('head the price column «Qiymət yoxdur», with the group’s count', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toContain('Qiymət yoxdur')
    expect(headers).not.toContain('Qiymətsiz')

    const cells = within(screen.getByText('Heydər Əliyev Mərkəzi').closest('tr') as HTMLElement).getAllByRole('cell')
    expect(cells[headers.indexOf('Qiymət yoxdur')]).toHaveTextContent(/^5$/)
  })
})

describe('the confirmation', () => {
  it('sends the same body as before: the decisions and the expected counts, and no price figure', async () => {
    const { onImported } = renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    const user = await skipGroupB()
    await user.click(screen.getByRole('button', { name: /sifariş və .* sətir yarat/ }))

    expect(importsApi.confirmImport).toHaveBeenCalledTimes(1)
    expect(importsApi.confirmImport).toHaveBeenCalledWith(6, {
      decisions: [{ locationId: 21, requestPeriod: '2026-03-01', action: 'Skip', reason: 'Növbəti ay' }],
      expectedRowsToImport: 15,
      expectedGroupCount: 2,
    })
    expect(onImported).toHaveBeenCalledWith(confirmationResult())
  })

  it('counts what it creates as before', async () => {
    renderDialog()
    await screen.findByText('Fəvvarələr meydanı')

    await skipGroupB()
    expect(screen.getByRole('button', { name: '1 sifariş və 10 sətir yarat' })).toBeInTheDocument()
  })
})

it('says no old price word', async () => {
  renderDialog()
  await screen.findByText('Fəvvarələr meydanı')

  expect(findOldPriceTerms(document.body)).toEqual([])
  expect(screen.queryByText('Qiyməti olmayan')).toBeNull()
})
