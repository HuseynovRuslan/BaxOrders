import { useCallback, useEffect, useState } from 'react'

/**
 * The dialogs open right now, oldest first. One `Escape` closes only the dialog on top (owner decision 17.1), and
 * every open dialog hears that `Escape`, so each needs a way to ask whether it is the one on top.
 *
 * Asked when the key arrives, not answered once at opening: a depth handed out at opening is wrong as soon as a
 * lower dialog closes before the one above it.
 */
const openDialogs: object[] = []

/**
 * Puts the calling dialog on the stack while it is mounted, and returns a stable `isTopmost()`.
 *
 * Added in an effect and removed in its cleanup, so StrictMode's second mount leaves one entry, not two.
 */
export function useDialogLayer(): () => boolean {
  const [layer] = useState(() => ({}))

  useEffect(() => {
    openDialogs.push(layer)
    return () => {
      const index = openDialogs.lastIndexOf(layer)
      if (index !== -1) {
        openDialogs.splice(index, 1)
      }
    }
  }, [layer])

  return useCallback(() => openDialogs[openDialogs.length - 1] === layer, [layer])
}

/** Test-only: how many dialogs the stack holds. */
export function openDialogCountForTests(): number {
  return openDialogs.length
}
