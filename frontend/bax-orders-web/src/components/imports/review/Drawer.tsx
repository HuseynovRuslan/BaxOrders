import { Modal, type ModalProps } from './Modal'

export type DrawerProps = Omit<ModalProps, 'width' | 'placement'>

/**
 * A dialog that opens from the right and leaves the page it was opened from readable beside it (owner decision 19.1):
 * something read alongside a decision rather than instead of it. Full-screen on a phone.
 *
 * It is `Modal` placed on the right, not a second dialog: `Escape`, the focus, the keyboard and the rules for a press
 * on the background are the one contract every dialog has (Task 17). Whether that press closes it is still the
 * caller's to say — only a drawer that is read, never written in, may (17.2).
 */
export function Drawer(props: DrawerProps) {
  return <Modal {...props} placement="right" />
}
