import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InfoHint } from './InfoHint'

/**
 * The ⓘ opens on a click, a tap and the keyboard (brief: "Info izahları toxunanda və kliklə açılır"), and its note is
 * placed against the screen, so no box around it can cut it off and no ⓘ near an edge can push it off the screen.
 *
 * jsdom lays nothing out, so where the note lands is tested through the arithmetic, with the ⓘ's box given.
 */
const hint = 'Daxili təminat — alış qiyməti tələb olunmayan sətir.'

function renderHint() {
  render(
    <div>
      <p>Başqa mətn</p>
      <InfoHint label="Daxili təminat nədir?">{hint}</InfoHint>
    </div>,
  )
  return {
    button: screen.getByRole('button', { name: 'Daxili təminat nədir?' }),
    note: screen.getByRole('note', { hidden: true }),
  }
}

function setScreen(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

function placeIcon(button: HTMLElement, left: number, top: number) {
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(new DOMRect(left, top, 18, 18))
}

function giveNoteHeight(note: HTMLElement, height: number) {
  vi.spyOn(note, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 256, height))
}

const initialWidth = window.innerWidth
const initialHeight = window.innerHeight

afterEach(() => {
  setScreen(initialWidth, initialHeight)
  vi.restoreAllMocks()
})

describe('opening', () => {
  it('is closed at first', () => {
    const { button, note } = renderHint()

    expect(note).not.toBeVisible()
    expect(note).toHaveAttribute('hidden')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens on a mouse click', async () => {
    const { button, note } = renderHint()

    await userEvent.click(button)

    expect(note).toBeVisible()
    expect(note).toHaveTextContent(hint)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens on a touch tap', async () => {
    const { button, note } = renderHint()

    await userEvent.pointer({ keys: '[TouchA]', target: button })

    expect(note).toBeVisible()
  })

  it('opens from the keyboard', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.tab()
    expect(button).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(note).toBeVisible()
  })
})

describe('closing', () => {
  it('closes on a second click', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    await user.click(button)

    expect(note).not.toBeVisible()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and leaves the focus on the ⓘ', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    await user.keyboard('{Escape}')

    expect(note).not.toBeVisible()
    expect(button).toHaveFocus()
  })

  it('closes when the reader presses anywhere else', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    fireEvent.pointerDown(screen.getByText('Başqa mətn'))

    expect(note).not.toBeVisible()
  })

  it('stays open when the reader presses on the note itself', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    fireEvent.pointerDown(note)
    expect(note).toBeVisible()

    // And a whole click on it keeps the focus on the ⓘ, so leaving the ⓘ does not close it either.
    await user.click(note)
    expect(note).toBeVisible()
    expect(button).toHaveFocus()
  })

  it('closes when the page scrolls, since a note fixed to the screen would drift from its ⓘ', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    fireEvent.scroll(window)

    expect(note).not.toBeVisible()
  })

  it('closes when a box inside the page scrolls', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    fireEvent.scroll(screen.getByText('Başqa mətn'))

    expect(note).not.toBeVisible()
  })

  it('closes when the window is resized', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    fireEvent(window, new Event('resize'))

    expect(note).not.toBeVisible()
  })

  it('closes when the focus leaves the ⓘ', async () => {
    const user = userEvent.setup()
    const { button, note } = renderHint()

    await user.click(button)
    await user.tab()

    expect(note).not.toBeVisible()
  })
})

describe('where the note is placed', () => {
  it('is fixed to the screen while open, so no scrolling box around it can cut it off', async () => {
    const { button, note } = renderHint()

    await userEvent.click(button)

    expect(note.style.position).toBe('fixed')
  })

  it('keeps 8 px from the right edge of a 390 px phone when its ⓘ is near that edge', async () => {
    setScreen(390, 844)
    const { button, note } = renderHint()
    placeIcon(button, 330, 200)
    giveNoteHeight(note, 80)

    await userEvent.click(button)

    expect(note.style.width).toBe('256px')
    expect(note.style.left).toBe(`${390 - 8 - 256}px`)
    expect(note.style.top).toBe(`${218 + 6}px`)
  })

  it('narrows to the screen, less 8 px on each side, when the screen is narrower than the note', async () => {
    setScreen(250, 844)
    const { button, note } = renderHint()
    placeIcon(button, 330, 200)
    giveNoteHeight(note, 80)

    await userEvent.click(button)

    expect(note.style.width).toBe('234px')
    expect(note.style.left).toBe('8px')
  })

  it('starts at its ⓘ when there is room', async () => {
    setScreen(1366, 768)
    const { button, note } = renderHint()
    placeIcon(button, 400, 200)
    giveNoteHeight(note, 80)

    await userEvent.click(button)

    expect(note.style.left).toBe('400px')
    expect(note.style.top).toBe('224px')
  })

  it('opens above its ⓘ when it does not fit below and does fit above', async () => {
    setScreen(390, 844)
    const { button, note } = renderHint()
    placeIcon(button, 100, 800)
    giveNoteHeight(note, 100)

    await userEvent.click(button)

    expect(note.style.top).toBe(`${800 - 6 - 100}px`)
  })

  it('stays below its ⓘ when it fits neither way', async () => {
    setScreen(390, 300)
    const { button, note } = renderHint()
    placeIcon(button, 100, 50)
    giveNoteHeight(note, 280)

    await userEvent.click(button)

    expect(note.style.top).toBe(`${68 + 6}px`)
  })

  it('stays beside its ⓘ in the page, above the dialogs and the decision bar', () => {
    const { button, note } = renderHint()

    expect(button.parentElement).toContainElement(note)
    expect(button).toHaveAttribute('aria-controls', note.id)
    expect(note).toHaveClass('z-[60]')
    expect(note.className).not.toMatch(/\babsolute\b|\bz-20\b|\bw-64\b/)
  })

  it('is a larger target under a finger, and unchanged under a mouse', () => {
    const { button } = renderHint()

    expect(button).toHaveClass('p-0.5', 'pointer-coarse:p-2.5')
  })
})
