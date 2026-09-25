import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'
import { Modal } from './Modal'

/**
 * Brief (Task 19): the product history opens from the right, and the decision it is read against stays in view
 * (19.1). It is Task 17's dialog placed differently, so everything 17 promised of a dialog is promised here again.
 */
afterEach(() => {
  document.body.style.overflow = ''
})

function drawer(onClose = () => {}, dismissOnBackdrop = false) {
  return (
    <Drawer title="Məhsul tarixçəsi" subtitle="Zibil paketi · 120 litr" onClose={onClose} dismissOnBackdrop={dismissOnBackdrop}>
      <button type="button">Miqdar</button>
      <button type="button">Məbləğ</button>
    </Drawer>
  )
}

function parts() {
  const panel = screen.getByRole('dialog')
  return { backdrop: panel.parentElement as HTMLElement, panel, body: panel.children[1] as HTMLElement }
}

describe('where it sits', () => {
  it('is a panel against the right edge, full height, the whole width on a phone and 560 pixels from sm up', () => {
    render(drawer())

    const { backdrop, panel } = parts()
    expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'justify-end')
    expect(panel).toHaveClass('h-full', 'w-full', 'sm:w-[560px]', 'border-l')
    // A panel on the edge, not a card in the middle.
    expect(panel.className).not.toMatch(/rounded|mt-10|max-w-/)
    expect(backdrop.className).not.toMatch(/justify-center|items-start/)
  })

  /** Brief acceptance 1: the amount, "Baza" and "Fərq" stay readable beside it, not merely present behind it. */
  it('dims the page behind it lightly, not as a centred dialog does', () => {
    render(drawer())

    expect(parts().backdrop).toHaveClass('bg-slate-900/20')
    expect(parts().backdrop).not.toHaveClass('bg-slate-900/50')
  })

  it('keeps its header in place and scrolls only its body, inside the panel', () => {
    render(drawer())

    const { backdrop, panel, body } = parts()
    expect(panel).toHaveClass('flex', 'flex-col')
    expect(body).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'overscroll-contain')
    expect(panel.children[0]).toContainElement(screen.getByRole('heading', { name: 'Məhsul tarixçəsi' }))
    expect(panel.children[0]).not.toHaveClass('overflow-y-auto')
    // The background itself does not scroll, and has no padding to hold the panel off the edge.
    expect(backdrop.className).not.toMatch(/overflow-y-auto|\bp-4\b/)
  })

  /** A transform would become the box an ⓘ note's `position: fixed` is measured from, and misplace the note. */
  it('is not moved, slid or animated into place', () => {
    render(drawer())

    const { backdrop, panel } = parts()
    for (const element of [backdrop, panel]) {
      expect(element.className).not.toMatch(/transform|translate|animate|transition/)
    }
  })

  it('sits directly on its background, so a press on the background is judged as it is for every dialog', () => {
    render(drawer())

    const { backdrop, panel } = parts()
    expect(panel.parentElement).toBe(backdrop)
    expect(backdrop).toHaveClass('fixed', 'inset-0')
  })
})

describe('what a screen reader calls it', () => {
  it('is a modal dialog, named by its visible title and described by its subtitle', () => {
    render(drawer())

    const found = screen.getByRole('dialog', { name: 'Məhsul tarixçəsi' })
    expect(found).toHaveAttribute('aria-modal', 'true')
    expect(found).toHaveAccessibleDescription('Zibil paketi · 120 litr')
    expect(found).not.toHaveAttribute('aria-label')
  })
})

describe('the page behind it', () => {
  it('stays still while the drawer is open, and is given back when it closes', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(drawer())

    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })
})

describe('closing', () => {
  it('closes on Escape, once', async () => {
    const onClose = vi.fn()
    render(drawer(onClose))

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only the dialog on top: a dialog over the drawer first, then the drawer', async () => {
    const lower = vi.fn()
    const upper = vi.fn()
    render(drawer(lower))
    render(<Modal title="Mənbə" onClose={upper}><p>Excel sətri</p></Modal>)

    await userEvent.keyboard('{Escape}')

    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
  })

  it('closes only the drawer when it is the one on top', async () => {
    const lower = vi.fn()
    const upper = vi.fn()
    render(<Modal title="Sətri sil" onClose={lower}><p>Sətir</p></Modal>)
    render(drawer(upper))

    await userEvent.keyboard('{Escape}')

    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
  })

  it('closes on a press on the background when the caller allows it', async () => {
    const onClose = vi.fn()
    render(drawer(onClose, true))

    await userEvent.click(parts().backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on a press on the background when the caller does not allow it, which is the default', async () => {
    const onClose = vi.fn()
    render(drawer(onClose))

    await userEvent.click(parts().backdrop)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close on a press inside the panel', async () => {
    const onClose = vi.fn()
    render(drawer(onClose, true))

    await userEvent.click(parts().body)
    await userEvent.click(screen.getByRole('heading', { name: 'Məhsul tarixçəsi' }))

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the focus', () => {
  it('moves onto «Bağla» when it opens, and goes back to what opened it without moving the page', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Zibil paketi</button>
          {open && (
            <Drawer title="Məhsul tarixçəsi" onClose={() => setOpen(false)}>
              <p>Tarixçə</p>
            </Drawer>
          )}
        </>
      )
    }
    const user = userEvent.setup()
    render(<Page />)
    const opener = screen.getByRole('button', { name: 'Zibil paketi' })

    await user.click(opener)
    expect(screen.getByRole('button', { name: 'Bağla' })).toHaveFocus()
    const focus = vi.spyOn(opener, 'focus')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('goes round inside the drawer with Tab and Shift+Tab, and never reaches the page behind it', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Səhifədə əvvəl</button>
        {drawer()}
        <button type="button">Səhifədə sonra</button>
      </>,
    )
    const close = screen.getByRole('button', { name: 'Bağla' })
    const last = screen.getByRole('button', { name: 'Məbləğ' })

    await user.tab()
    expect(screen.getByRole('button', { name: 'Miqdar' })).toHaveFocus()
    await user.tab()
    expect(last).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })
})
