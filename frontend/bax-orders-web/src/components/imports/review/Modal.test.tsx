import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
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
