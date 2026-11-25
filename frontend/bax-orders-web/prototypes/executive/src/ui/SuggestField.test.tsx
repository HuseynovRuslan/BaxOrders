import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuggestField } from './SuggestField'

const units = ['cüt', 'ədəd', 'kq', 'litr', 'metr']

function Form({ onSubmit = () => {}, initial = 'ədəd' }: { onSubmit?: (value: string) => void; initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(value) }}>
      <SuggestField label="Vahid" required value={value} suggestions={units} onChange={setValue} />
      <button type="submit">Yoxla</button>
    </form>
  )
}

describe('a field with suggestions («Mal əlavə et» → «Vahid»)', () => {
  it('is a text field: any unit may be typed, a new one among them', async () => {
    const submitted = vi.fn()
    render(<Form onSubmit={submitted} />)
    const field = screen.getByRole('combobox', { name: 'Vahid' })
    expect(field).toHaveValue('ədəd')
    expect(field).toHaveAttribute('aria-autocomplete', 'list')
    await userEvent.clear(field)
    await userEvent.type(field, 'qutu')
    // Nothing in use contains «qutu»: no list, and Enter is the form's.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(submitted).toHaveBeenCalledWith('qutu')
  })

  it('narrows the list as one types, and takes a value with the keys', async () => {
    const submitted = vi.fn()
    render(<Form onSubmit={submitted} initial="" />)
    const field = screen.getByRole('combobox', { name: 'Vahid' })
    await userEvent.type(field, 'tr')
    const list = screen.getByRole('listbox', { name: 'Vahid' })
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual(['litr', 'metr'])
    expect(field).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(field.getAttribute('aria-activedescendant')).toBe(within(list).getByRole('option', { name: 'metr' }).id)
    // Enter takes the highlighted value, and does not send the form.
    await userEvent.keyboard('{Enter}')
    expect(field).toHaveValue('metr')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(submitted).not.toHaveBeenCalled()
    expect(field).toHaveFocus()
  })

  it('shows every value from Down or the chevron, the current one marked, and closes on Escape only the list', async () => {
    render(<Form />)
    const field = screen.getByRole('combobox', { name: 'Vahid' })
    field.focus()
    await userEvent.keyboard('{ArrowDown}')
    const list = screen.getByRole('listbox')
    expect(within(list).getAllByRole('option')).toHaveLength(units.length)
    expect(within(list).getByRole('option', { name: 'ədəd' })).toHaveAttribute('aria-selected', 'true')
    const escape = vi.fn()
    document.addEventListener('keydown', escape)
    await userEvent.keyboard('{Escape}')
    document.removeEventListener('keydown', escape)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    // The press stayed with the field: a dialog around it would not close.
    expect(escape).not.toHaveBeenCalled()
    expect(field).toHaveValue('ədəd')
  })

  it('takes a value with the mouse', async () => {
    render(<Form initial="" />)
    await userEvent.type(screen.getByRole('combobox', { name: 'Vahid' }), 'kq')
    await userEvent.click(screen.getByRole('option', { name: 'kq' }))
    expect(screen.getByRole('combobox', { name: 'Vahid' })).toHaveValue('kq')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens its list inside the dialog it sits in', async () => {
    render(<dialog open><SuggestField label="Vahid" value="" suggestions={units} onChange={() => {}} /></dialog>)
    screen.getByRole('combobox', { name: 'Vahid' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox').closest('dialog')).not.toBeNull()
  })
})
