import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { openDialogCountForTests, useDialogLayer } from './dialogStack'

/**
 * The dialogs open right now, so that one `Escape` closes only the one on top (owner decision 17.1). Asked when the
 * key arrives, so dialogs that close out of order cannot leave it wrong.
 */
function openDialog() {
  return renderHook(() => useDialogLayer())
}

describe('the stack of open dialogs', () => {
  it('holds each open dialog once, and lets it go when it closes', () => {
    const first = openDialog()
    const second = openDialog()
    expect(openDialogCountForTests()).toBe(2)

    second.unmount()
    expect(openDialogCountForTests()).toBe(1)
    first.unmount()
    expect(openDialogCountForTests()).toBe(0)
  })

  it('puts the last one opened on top', () => {
    const first = openDialog()
    expect(first.result.current()).toBe(true)

    const second = openDialog()
    expect(second.result.current()).toBe(true)
    expect(first.result.current()).toBe(false)

    second.unmount()
    expect(first.result.current()).toBe(true)
  })

  it('stays right when a lower dialog closes before the one above it', () => {
    const first = openDialog()
    const second = openDialog()
    const third = openDialog()

    second.unmount()
    expect(openDialogCountForTests()).toBe(2)
    expect(third.result.current()).toBe(true)
    expect(first.result.current()).toBe(false)

    third.unmount()
    expect(first.result.current()).toBe(true)
  })

  it('holds a dialog once under StrictMode, whose effects run twice', () => {
    const dialog = renderHook(() => useDialogLayer(), { wrapper: StrictMode })
    expect(openDialogCountForTests()).toBe(1)
    expect(dialog.result.current()).toBe(true)

    dialog.unmount()
    expect(openDialogCountForTests()).toBe(0)
  })

  it('gives the same question on every render', () => {
    const dialog = openDialog()
    const asked = dialog.result.current

    dialog.rerender()

    expect(dialog.result.current).toBe(asked)
  })
})
