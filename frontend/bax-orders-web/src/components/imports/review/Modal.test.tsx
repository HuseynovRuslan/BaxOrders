import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

/**
 * Brief (Task 10): "Pəncərədə sürüşdürəndə arxadakı səhifə də sürüşür." While a dialog is open the page behind it
 * stays where it is, and closing it gives the page back exactly as it was.
 */
afterEach(() => {
  document.body.style.overflow = ''
})

function dialog(title: string, onClose = () => {}) {
  return <Modal title={title} onClose={onClose}><p>{title}</p></Modal>
}

describe('the page behind a dialog', () => {
  it('stays still while the dialog is open, and is given back when it closes', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(dialog('Məhsul tarixçəsi'))

    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('does not carry a scroll that reaches the end of the dialog on to the page', () => {
    render(dialog('Məhsul tarixçəsi'))

    expect(screen.getByRole('dialog').parentElement).toHaveClass('overscroll-contain')
  })

  it('is given back correctly when one dialog opens over another', () => {
    const first = render(dialog('Birinci'))
    const second = render(dialog('İkinci'))
    expect(document.body.style.overflow).toBe('hidden')

    // The one on top closes first: the one beneath is still open, so the page stays still.
    second.unmount()
    expect(document.body.style.overflow).toBe('hidden')

    first.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('is given back correctly when one dialog follows another', () => {
    const first = render(dialog('Birinci'))
    first.unmount()
    expect(document.body.style.overflow).toBe('')

    const second = render(dialog('İkinci'))
    expect(document.body.style.overflow).toBe('hidden')
    second.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('is given back when one dialog replaces another in the same place', () => {
    const { rerender, unmount } = render(<div>{dialog('Birinci')}</div>)
    rerender(<div key="other">{dialog('İkinci')}</div>)
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

/**
 * Brief (Task 17): every dialog closes the same way. `Escape` closes the dialog on top and no other (17.1), a press
 * on the background closes only a dialog that is read, never one that is written in (17.2), and closing is always
 * refusing — it is `onClose`, never the dialog's action (17.3).
 */
describe('Escape', () => {
  it('closes the dialog, once', async () => {
    const onClose = vi.fn()
    render(dialog('Məhsul tarixçəsi', onClose))

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only the dialog on top when one is open over another', async () => {
    const lower = vi.fn()
    const upper = vi.fn()
    const first = render(dialog('Birinci', lower))
    const second = render(dialog('İkinci', upper))

    await userEvent.keyboard('{Escape}')

    expect(upper).toHaveBeenCalledTimes(1)
    expect(lower).not.toHaveBeenCalled()
    // Closed top first, as a reader would, so the page is given back as it was found.
    second.unmount()
    first.unmount()
  })

  it('takes one dialog away per press, the upper first, and the page stays still until the last is gone', async () => {
    function TwoDialogs() {
      const [lower, setLower] = useState(true)
      const [upper, setUpper] = useState(true)
      return (
        <>
          {lower && <Modal title="Birinci" onClose={() => setLower(false)}><p>Birinci</p></Modal>}
          {upper && <Modal title="İkinci" onClose={() => setUpper(false)}><p>İkinci</p></Modal>}
        </>
      )
    }
    const user = userEvent.setup()
    document.body.style.overflow = 'auto'
    render(<TwoDialogs />)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'İkinci' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Birinci' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('still reaches the dialog left on top when the one beneath it closes first', async () => {
    const upper = vi.fn()
    function pair(withLower: boolean) {
      return (
        <>
          {withLower && <Modal key="birinci" title="Birinci" onClose={() => {}}><p>Birinci</p></Modal>}
          <Modal key="ikinci" title="İkinci" onClose={upper}><p>İkinci</p></Modal>
        </>
      )
    }
    const { rerender } = render(pair(true))
    rerender(pair(false))

    await userEvent.keyboard('{Escape}')

    expect(upper).toHaveBeenCalledTimes(1)
  })

  it('is left alone when something inside the dialog has already used it', async () => {
    const onClose = vi.fn()
    render(<Modal title="Məhsul tarixçəsi" onClose={onClose}><button type="button">İçəridə</button></Modal>)
    const inside = screen.getByRole('button', { name: 'İçəridə' })
    inside.addEventListener('keydown', (event) => event.preventDefault())
    inside.focus()

    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })

  it('is no longer heard once the dialog has closed', async () => {
    const onClose = vi.fn()
    const { unmount } = render(dialog('Məhsul tarixçəsi', onClose))
    unmount()

    await userEvent.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('a press on the background', () => {
  function backdrop() {
    return screen.getByRole('dialog').parentElement as HTMLElement
  }

  it('does not close a dialog that does not allow it, which is every dialog by default', async () => {
    const onClose = vi.fn()
    render(dialog('Sətri sil', onClose))

    await userEvent.click(backdrop())

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes a dialog that is only read', async () => {
    const onClose = vi.fn()
    render(<Modal title="Mənbə" onClose={onClose} dismissOnBackdrop><p>Excel sətri</p></Modal>)

    await userEvent.click(backdrop())

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('counts only a press that starts and ends on the background itself', async () => {
    const onClose = vi.fn()
    render(<Modal title="Mənbə" onClose={onClose} dismissOnBackdrop><p>Excel sətri</p></Modal>)
    const body = screen.getByText('Excel sətri')

    // A press on the dialog's own content.
    await userEvent.click(body)
    // Pressed inside the dialog and let go over the background: the browser reports that click on the background.
    fireEvent.pointerDown(body)
    fireEvent.pointerUp(backdrop())
    fireEvent.click(backdrop())
    // Pressed on the background and let go inside the dialog.
    fireEvent.pointerDown(backdrop())
    fireEvent.pointerUp(body)
    fireEvent.click(backdrop())

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the focus', () => {
  it('moves into the dialog, onto «Bağla», and never onto a destructive button', () => {
    render(
      <Modal title="Sətri sil" onClose={() => {}} footer={<button type="button">Sətri sil</button>}>
        <p>Sətir düzəliş versiyasından çıxarılır.</p>
      </Modal>,
    )

    expect(screen.getByRole('button', { name: 'Bağla' })).toHaveFocus()
  })

  it('stays on a field that focuses itself', () => {
    render(<Modal title="Yeni məhsul" onClose={() => {}}><input aria-label="Məhsulun adı" autoFocus /></Modal>)

    expect(screen.getByRole('textbox', { name: 'Məhsulun adı' })).toHaveFocus()
  })

  it('goes round inside the dialog with Tab and Shift+Tab, and never reaches the page behind it', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Səhifədə əvvəl</button>
        <Modal
          title="Sətri redaktə et"
          onClose={() => {}}
          footer={
            <>
              <button type="button">İmtina</button>
              <button type="button">Yadda saxla</button>
            </>
          }
        >
          <input aria-label="Miqdar" />
        </Modal>
        <button type="button">Səhifədə sonra</button>
      </>,
    )
    const close = screen.getByRole('button', { name: 'Bağla' })
    const save = screen.getByRole('button', { name: 'Yadda saxla' })

    await user.tab()
    expect(screen.getByRole('textbox', { name: 'Miqdar' })).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(save).toHaveFocus()

    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(save).toHaveFocus()

    // A press on the background leaves the focus on the page; the next Tab brings it back in.
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement)
    await user.tab()
    expect(close).toHaveFocus()
  })

  it('skips what cannot be reached: a disabled button and the inside of a closed <details>', async () => {
    const user = userEvent.setup()
    render(
      <Modal title="Məhsul tarixçəsi" onClose={() => {}}>
        <details>
          <summary>Mənbə və versiya məlumatı</summary>
          <a href="/orders/91">Sifariş</a>
        </details>
        <button type="button" disabled>Yüklənir</button>
      </Modal>,
    )
    const close = screen.getByRole('button', { name: 'Bağla' })

    await user.tab({ shift: true })
    expect(screen.getByText('Mənbə və versiya məlumatı')).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
  })

  it('goes back to what opened the dialog when it closes, without moving the page', async () => {
    function Page() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Zibil paketi</button>
          {open && <Modal title="Məhsul tarixçəsi" onClose={() => setOpen(false)}><p>Tarixçə</p></Modal>}
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
    // A plain focus() would scroll the opener into view.
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('closes quietly when what opened it has left the page', () => {
    const page = render(<button type="button">Açan</button>)
    screen.getByRole('button', { name: 'Açan' }).focus()
    const modal = render(dialog('Məhsul tarixçəsi'))
    page.unmount()

    expect(() => modal.unmount()).not.toThrow()
    expect(document.body).toHaveFocus()
  })
})

/**
 * Task 19 gave `Modal` a second placement for the product history's drawer. Every other dialog renders without one,
 * so its markup is pinned here exactly as it was at Task 18's commit.
 */
describe('the centred dialog every other screen uses', () => {
  function parts() {
    const panel = screen.getByRole('dialog')
    return { backdrop: panel.parentElement as HTMLElement, panel, body: panel.children[1] as HTMLElement }
  }

  it('has the markup it had before a placement existed, at the default width', () => {
    render(dialog('Sətri sil'))

    const { backdrop, panel, body } = parts()
    expect(backdrop.className).toBe(
      'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4',
    )
    expect(panel.className).toBe('mt-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-w-lg')
    expect(body.className).toBe('px-4 py-4')
  })

  it('has the markup it had before a placement existed, wide', () => {
    render(<Modal title="Mənbə" onClose={() => {}} width="wide"><p>Excel sətri</p></Modal>)

    const { backdrop, panel, body } = parts()
    expect(backdrop.className).toBe(
      'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-900/50 p-4',
    )
    expect(panel.className).toBe('mt-10 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-w-3xl')
    expect(body.className).toBe('px-4 py-4')
  })

  it('is the same with the placement spelled out as the centre', () => {
    const footer = <button type="button">İmtina</button>
    const implicit = render(<Modal title="Mənbə" subtitle="Excel" onClose={() => {}} footer={footer}><p>Mətn</p></Modal>)
    const before = implicit.container.innerHTML
    implicit.unmount()
    const explicit = render(
      <Modal title="Mənbə" subtitle="Excel" onClose={() => {}} footer={footer} placement="center"><p>Mətn</p></Modal>,
    )

    // The ids React hands out differ between two renders; nothing else may.
    const withoutIds = (html: string) => html.replace(/(id|aria-labelledby|aria-describedby)="[^"]*"/g, '$1=""')
    expect(withoutIds(explicit.container.innerHTML)).toBe(withoutIds(before))
  })
})

describe('what a screen reader calls it', () => {
  it('is named by its visible title and described by its subtitle', () => {
    render(<Modal title="Sətri sil" subtitle="Yay ayaqqabısı" onClose={() => {}}><p>Sətir</p></Modal>)

    const found = screen.getByRole('dialog', { name: 'Sətri sil' })
    expect(found).toHaveAccessibleDescription('Yay ayaqqabısı')
    expect(found).not.toHaveAttribute('aria-label')
  })

  it('has no description when there is no subtitle', () => {
    render(dialog('Məhsul tarixçəsi'))

    const found = screen.getByRole('dialog', { name: 'Məhsul tarixçəsi' })
    expect(found).not.toHaveAttribute('aria-describedby')
    expect(found).toHaveAccessibleDescription('')
  })
})
