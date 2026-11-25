import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, type SelectOption } from './Select'

const options: SelectOption[] = [
  { value: 'year', label: 'Bütün il' },
  { value: 'm1', label: 'Yanvar', group: 'Bir ay' },
  { value: 'm2', label: 'Fevral — hələ başlamayıb', display: 'Fevral', disabled: true, group: 'Bir ay' },
  { value: 'm3', label: 'Mart', group: 'Bir ay' },
  { value: 'range', label: 'Aralıq seç…', group: 'Bir neçə ay' },
]

function Harness({ onChange = () => {}, disabled = false }: { onChange?: (value: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('year')
  return (
    <>
      <Select label="Dövr" value={value} options={options} disabled={disabled} onChange={(next) => { setValue(next); onChange(next) }} />
      <button type="button">Başqa yer</button>
    </>
  )
}

describe('the app’s dropdown', () => {
  it('is a combobox that opens a listbox of its choices, in their groups, the chosen one marked', async () => {
    render(<Harness />)
    const box = screen.getByRole('combobox', { name: 'Dövr' })
    expect(box).toHaveAttribute('aria-expanded', 'false')
    expect(box).toHaveTextContent('Bütün il')
    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-expanded', 'true')
    const list = screen.getByRole('listbox', { name: 'Dövr' })
    expect(box).toHaveAttribute('aria-controls', list.id)
    expect(within(list).getByRole('group', { name: 'Bir ay' })).toBeInTheDocument()
    expect(within(list).getByRole('group', { name: 'Bir neçə ay' })).toBeInTheDocument()
    expect(within(list).getByRole('option', { name: 'Bütün il' })).toHaveAttribute('aria-selected', 'true')
    expect(within(list).getByRole('option', { name: 'Fevral — hələ başlamayıb' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('chooses with the mouse, closes, and shows the short name of the choice', async () => {
    const changed = vi.fn()
    render(<Harness onChange={changed} />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Dövr' }))
    await userEvent.click(screen.getByRole('option', { name: 'Mart' }))
    expect(changed).toHaveBeenCalledWith('m3')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Dövr' })).toHaveTextContent('Mart')
  })

  it('never chooses a disabled option, by mouse or by keys', async () => {
    const changed = vi.fn()
    render(<Harness onChange={changed} />)
    const box = screen.getByRole('combobox', { name: 'Dövr' })
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('option', { name: 'Fevral — hələ başlamayıb' }))
    expect(changed).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // From «Yanvar» one step down skips February.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Mart' }).id)
    await userEvent.keyboard('{Enter}')
    expect(changed).toHaveBeenCalledWith('m3')
  })

  it('works from the keyboard: arrows, Home and End, typing a name, Enter, Space and Escape', async () => {
    const changed = vi.fn()
    render(<Harness onChange={changed} />)
    const box = screen.getByRole('combobox', { name: 'Dövr' })
    box.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{End}')
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Aralıq seç…' }).id)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(changed).not.toHaveBeenCalled()
    expect(box).toHaveFocus()
    // Typing opens the list on the first name that starts so; Enter chooses it.
    await userEvent.keyboard('m')
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Mart' }).id)
    await userEvent.keyboard('{Enter}')
    expect(changed).toHaveBeenLastCalledWith('m3')
    // Space opens it and, once no name is being typed, chooses.
    await userEvent.keyboard(' ')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Home}')
    expect(box.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Bütün il' }).id)
    await userEvent.keyboard('{Tab}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on a press outside, and a disabled one does not open', async () => {
    const { unmount } = render(<Harness />)
    await userEvent.click(screen.getByRole('combobox', { name: 'Dövr' }))
    await userEvent.click(screen.getByRole('button', { name: 'Başqa yer' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    unmount()
    render(<Harness disabled />)
    expect(screen.getByRole('combobox', { name: 'Dövr' })).toBeDisabled()
  })

  it('opens its list inside the dialog it sits in, so the dialog does not shut it out', async () => {
    render(<dialog open><Select label="Növ" value="monthly" options={[{ value: 'monthly', label: 'Aylıq sifariş' }, { value: 'outside', label: 'Aylıqdan kənar' }]} onChange={() => {}} /></dialog>)
    await userEvent.click(screen.getByRole('combobox', { name: 'Növ' }))
    expect(screen.getByRole('listbox').closest('dialog')).not.toBeNull()
  })
})
