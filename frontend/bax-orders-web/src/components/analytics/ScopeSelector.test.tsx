import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ScopeSelector } from './ScopeSelector'

/**
 * This control is not a filter among filters: it decides what every number below it means. So the reader must
 * be able to see the answer to "what am I looking at" without opening anything.
 */
describe('the order scope', () => {
  it('shows all three ways of asking, with the chosen one pressed', () => {
    render(<ScopeSelector value="Monthly" onChange={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Sifariş növü' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['Aylıq sifarişlər', 'Aylıqdan kənar', 'Hamısı'])
    expect(within(group).getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the scope the reader picked', async () => {
    const onChange = vi.fn()
    render(<ScopeSelector value="Monthly" onChange={onChange} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Aylıqdan kənar' }))

    expect(onChange).toHaveBeenCalledWith('OutsideMonthly')
  })

  it('moves the pressed state with the value it is given', () => {
    const { rerender } = render(<ScopeSelector value="Monthly" onChange={vi.fn()} />)
    rerender(<ScopeSelector value="All" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Hamısı' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Aylıq sifarişlər' })).toHaveAttribute('aria-pressed', 'false')
  })
})
