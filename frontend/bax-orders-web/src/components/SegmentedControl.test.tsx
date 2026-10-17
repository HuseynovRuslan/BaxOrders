import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const views = [
  { value: 'Compact', label: 'Yığcam' },
  { value: 'Standard', label: 'Standart' },
] as const

/** UI V2 (03 §5.4, 04 §5.3): a few choices that decide what a screen shows, all in sight, the chosen one said. */
describe('a segmented control', () => {
  it('is a named group of buttons, the chosen one pressed', () => {
    render(<SegmentedControl label="Baxış" options={views} value="Compact" onChange={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Baxış' })
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual(['Yığcam', 'Standart'])
    expect(within(group).getByRole('button', { name: 'Yığcam' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Standart' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('takes its name from a visible label when it has one', () => {
    render(
      <>
        <span id="view-label">Baxış</span>
        <SegmentedControl label="Başqa ad" labelledBy="view-label" options={views} value="Compact" onChange={vi.fn()} />
      </>,
    )

    const group = screen.getByRole('group', { name: 'Baxış' })
    expect(group).toHaveAttribute('aria-labelledby', 'view-label')
    expect(group).not.toHaveAttribute('aria-label')
  })

  it('reports another choice, and asks nothing when the chosen one is pressed again', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Baxış" options={views} value="Compact" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Yığcam' }))
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Standart' }))
    expect(onChange).toHaveBeenCalledWith('Standard')
  })

  it('announces a choice by its full name where the segment says a short one (D-V8)', () => {
    render(
      <SegmentedControl
        label="Baxış"
        options={[{ value: 'Simple', label: 'Sadə', accessibleLabel: 'Sadə baxış' }]}
        value="Simple"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Sadə baxış' })).toHaveTextContent('Sadə')
  })

  it('carries the chosen segment by more than its colour, and shows the keyboard’s focus, in tokens', () => {
    render(<SegmentedControl label="Baxış" options={views} value="Compact" onChange={vi.fn()} />)

    const chosen = screen.getByRole('button', { name: 'Yığcam' })
    expect(chosen).toHaveClass('bg-surface-container-lowest', 'font-semibold', 'text-on-surface', 'ring-1', 'ring-outline')
    const other = screen.getByRole('button', { name: 'Standart' })
    expect(other).toHaveClass('font-medium', 'text-on-surface-variant')
    expect(other).not.toHaveClass('font-semibold')
    for (const button of [chosen, other]) {
      expect(button).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-primary')
      expect(button.className).not.toMatch(/slate-|#[0-9a-f]{3,6}/i)
    }
    expect(screen.getByRole('group', { name: 'Baxış' })).toHaveClass('bg-surface-container')
  })

  it('is 44 pixels tall for a finger below lg, and the whole width on a phone, when asked', () => {
    render(
      <SegmentedControl label="Baxış" options={views} value="Compact" onChange={vi.fn()} size="responsive" fullWidth="mobile" />,
    )

    const group = screen.getByRole('group', { name: 'Baxış' })
    expect(group).toHaveClass('w-full', 'sm:w-auto')
    for (const button of within(group).getAllByRole('button')) {
      expect(button).toHaveClass('h-11', 'lg:h-8', 'flex-1', 'sm:flex-none')
    }
  })
})
