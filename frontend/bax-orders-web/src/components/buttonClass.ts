/**
 * The product's three button styles, in tokens, for a `<button>` and an `<a>` alike (UI V2, 03 §5.4, 04 §5.8).
 *
 * - `primary` — the one action a surface is for («Sifarişə bax»). Navy, because navy is structure and action here.
 * - `secondary` — an action beside it («Obyektin sifarişləri», «Əvvəlki / Növbəti»).
 * - `ghost` — an action that should not compete with the figures around it («Sıfırla», «Yenidən cəhd et»).
 *
 * Heights: `sm` 32, `md` 40, `touch` 44 pixels. `touchBelowLg` keeps a button at 44 pixels below the `lg` width, where
 * it is pressed with a finger, and at its own height from there up. `iconOnly` makes it square, for a button that is
 * an icon with an `aria-label`.
 *
 * A disabled button is said with `disabled` or `aria-disabled="true"` and drawn at 40%. Every one of them shows a
 * 2-pixel navy outline under the keyboard's focus.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'touch'

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-body-md transition-colors '
  + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary '
  + 'disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary font-medium text-on-primary hover:bg-primary-container',
  secondary:
    'border border-outline bg-surface-container-lowest font-medium text-on-surface hover:bg-surface-container-low',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
}

const padding: Record<ButtonVariant, string> = {
  primary: 'px-4',
  secondary: 'px-4',
  ghost: 'px-2',
}

// Written out whole, so the stylesheet is generated for each of them.
const heights: Record<ButtonSize, string> = {
  sm: 'h-8',
  md: 'h-10',
  touch: 'h-11',
}

const touchBelowLgHeights: Record<ButtonSize, string> = {
  sm: 'h-11 lg:h-8',
  md: 'h-11 lg:h-10',
  touch: 'h-11',
}

/** A button that is only an icon (with an `aria-label`) is as wide as it is tall. */
const iconWidths: Record<ButtonSize, string> = {
  sm: 'w-8',
  md: 'w-10',
  touch: 'w-11',
}

const touchBelowLgIconWidths: Record<ButtonSize, string> = {
  sm: 'w-11 lg:w-8',
  md: 'w-11 lg:w-10',
  touch: 'w-11',
}

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  touchBelowLg = false,
  iconOnly = false,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  touchBelowLg?: boolean
  iconOnly?: boolean
} = {}): string {
  const height = touchBelowLg ? touchBelowLgHeights[size] : heights[size]
  const width = iconOnly ? (touchBelowLg ? touchBelowLgIconWidths[size] : iconWidths[size]) : padding[variant]
  return `${base} ${variants[variant]} ${height} ${width}`
}
