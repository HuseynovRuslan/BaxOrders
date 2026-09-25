import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openSurfaceLink, surfaceLinkAttribute } from './interaction'

/**
 * Task 20 (20.1, 20.2): a card or a row opens what its one link opens. The surface never navigates by itself — it
 * hands a plain click to the link, so the link does what a link does and Back's scroll memory sees a click on an
 * <a>. Everything that is not a plain click on the surface's own text is left alone.
 */

/** The router's own address, so a test can see whether anything navigated. */
function Where() {
  const location = useLocation()
  return <span data-testid="where">{location.pathname + location.search}</span>
}

function renderSurface(onButton = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Where />
      <Routes>
        <Route
          path="/dashboard"
          element={(
            <article data-testid="surface" onClick={openSurfaceLink}>
              <p>
                <Link {...surfaceLinkAttribute} to="/orders/154?basis=avg3" aria-label="Obyekt · Detallara bax">
                  Obyekt
                </Link>
              </p>
              <p>Düz mətn</p>
              <button type="button" onClick={onButton}>Düymə</button>
              <span role="note">Qeyd</span>
              <span onClick={(event) => event.preventDefault()}>Artıq işlənib</span>
            </article>
          )}
        />
        <Route path="/orders/:id" element={<p>Sifariş səhifəsi</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return onButton
}

function where(): string {
  return screen.getByTestId('where').textContent ?? ''
}

afterEach(() => {
  window.getSelection()?.removeAllRanges()
})

describe('a plain click on the surface', () => {
  it('opens what the link opens, from anywhere on the surface', async () => {
    renderSurface()

    await userEvent.click(screen.getByText('Düz mətn'))

    expect(where()).toBe('/orders/154?basis=avg3')
    expect(screen.getByText('Sifariş səhifəsi')).toBeInTheDocument()
  })

  it('hands the click to the link itself, so a listener above it sees a click on an <a>', async () => {
    renderSurface()
    // Where useScrollMemory listens: on an element above the surface, natively, below React's own root.
    const seen: (string | null)[] = []
    screen.getByTestId('surface').addEventListener('click', (event) => {
      seen.push(event.target instanceof Element ? event.target.closest('a')?.getAttribute('href') ?? null : null)
    })

    await userEvent.click(screen.getByText('Düz mətn'))

    // The reader's click on the text, then the one the surface handed to its link.
    expect(seen).toEqual([null, '/orders/154?basis=avg3'])
  })

  it('leaves a click on the link to the link: one click, one navigation', async () => {
    renderSurface()
    const clicks = vi.fn()
    document.addEventListener('click', clicks)
    try {
      await userEvent.click(screen.getByRole('link', { name: 'Obyekt · Detallara bax' }))
    } finally {
      document.removeEventListener('click', clicks)
    }

    expect(clicks).toHaveBeenCalledTimes(1)
    expect(where()).toBe('/orders/154?basis=avg3')
  })
})

describe('what the surface leaves alone', () => {
  it('a button inside it: the button does its own work, and nothing navigates', async () => {
    const onButton = renderSurface()

    await userEvent.click(screen.getByRole('button', { name: 'Düymə' }))

    expect(onButton).toHaveBeenCalledTimes(1)
    expect(where()).toBe('/dashboard')
  })

  it('an open note inside it', async () => {
    renderSurface()

    await userEvent.click(screen.getByRole('note'))

    expect(where()).toBe('/dashboard')
  })

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
  ])('a click with %s held', (_name, modifier) => {
    renderSurface()

    fireEvent.click(screen.getByText('Düz mətn'), modifier)

    expect(where()).toBe('/dashboard')
  })

  it('a click with any button but the main one', () => {
    renderSurface()

    fireEvent.click(screen.getByText('Düz mətn'), { button: 1 })

    expect(where()).toBe('/dashboard')
  })

  it('a click the page already handled', async () => {
    renderSurface()

    await userEvent.click(screen.getByText('Artıq işlənib'))

    expect(where()).toBe('/dashboard')
  })

  it('a click that ends a text selection inside the surface', () => {
    renderSurface()
    const text = screen.getByText('Düz mətn')
    const range = document.createRange()
    range.selectNodeContents(text)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)

    fireEvent.click(text)

    expect(where()).toBe('/dashboard')
  })

  it('but not a selection somewhere else on the page', () => {
    renderSurface()
    const elsewhere = screen.getByTestId('where')
    const range = document.createRange()
    range.selectNodeContents(elsewhere)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)

    fireEvent.click(screen.getByText('Düz mətn'))

    expect(where()).toBe('/orders/154?basis=avg3')
  })
})

describe('a modifier click on the link itself', () => {
  /**
   * A new tab is the browser's to open. Neither the router nor the surface takes the click: it arrives at the
   * document once, not taken, and the page stays where it is. (The listener takes it last, so jsdom does not try
   * to load the address.)
   */
  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Meta', { metaKey: true }],
  ])('is left to the browser with %s held', (_name, modifier) => {
    renderSurface()
    const leftToBrowser: boolean[] = []
    const listener = (event: MouseEvent) => {
      leftToBrowser.push(!event.defaultPrevented)
      event.preventDefault()
    }
    document.addEventListener('click', listener)
    try {
      fireEvent.click(screen.getByRole('link', { name: 'Obyekt · Detallara bax' }), modifier)
    } finally {
      document.removeEventListener('click', listener)
    }

    expect(leftToBrowser).toEqual([true])
    expect(where()).toBe('/dashboard')
  })
})
