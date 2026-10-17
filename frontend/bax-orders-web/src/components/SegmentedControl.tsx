/** One choice of a segmented control. */
export interface SegmentedOption<T extends string> {
  value: T
  /** What the segment says. */
  label: string
  /** What a screen reader announces instead, where the segment says a short form of it (D-V8). */
  accessibleLabel?: string
}

/**
 * `md` — 32-pixel segments in a 40-pixel track, for a mouse. `touch` — 44-pixel segments, for a finger.
 * `responsive` — `touch` below the `lg` width and `md` from there up, as every control on a page that is read on a
 * laptop and on a phone.
 */
export type SegmentedControlSize = 'md' | 'touch' | 'responsive'

const trackPadding: Record<SegmentedControlSize, string> = {
  md: 'p-1',
  touch: 'p-0.5',
  responsive: 'p-0.5 lg:p-1',
}

const segmentHeight: Record<SegmentedControlSize, string> = {
  md: 'h-8',
  touch: 'h-11',
  responsive: 'h-11 lg:h-8',
}

/** `true` — the whole width at every size; `'mobile'` — the whole width below `sm` only, its own width above. */
type FullWidth = boolean | 'mobile'

function trackWidth(fullWidth: FullWidth): string {
  if (fullWidth === 'mobile') {
    return 'flex w-full sm:inline-flex sm:w-auto'
  }

  return fullWidth ? 'flex w-full' : 'inline-flex'
}

function segmentWidth(fullWidth: FullWidth): string {
  if (fullWidth === 'mobile') {
    return 'flex-1 sm:flex-none'
  }

  return fullWidth ? 'flex-1' : ''
}

/**
 * A handful of choices that decide what a whole screen shows, all of them in sight (UI V2, 03 §5.4, 04 §5.3).
 *
 * A grey track with the chosen segment lifted out of it: white, a thin outline and a heavier word, so the choice is
 * carried by more than its colour, and `aria-pressed` says it to a screen reader. Each segment is a button and a stop
 * of its own for the keyboard, as the product's other segmented controls are.
 *
 * The group is named by its visible label where it has one (`labelledBy`), and by `label` otherwise.
 *
 * Each segment keeps 72 pixels of scroll margin above it (`scroll-mt-18`): the application's header is sticky and
 * 72 pixels tall, and a segment the keyboard reaches by Shift+Tab must not come to rest underneath it.
 */
export function SegmentedControl<T extends string>({
  label,
  labelledBy,
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
}: {
  label: string
  labelledBy?: string
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: SegmentedControlSize
  fullWidth?: FullWidth
}) {
  return (
    <div
      role="group"
      aria-label={labelledBy === undefined ? label : undefined}
      aria-labelledby={labelledBy}
      className={`${trackWidth(fullWidth)} gap-1 rounded-md bg-surface-container ${trackPadding[size]}`}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.accessibleLabel}
            // The chosen one is already the answer: pressing it again changes nothing, so it asks for nothing.
            onClick={() => {
              if (!active) {
                onChange(option.value)
              }
            }}
            className={`${segmentWidth(fullWidth)} ${segmentHeight[size]} scroll-mt-18 whitespace-nowrap rounded px-3 text-body-sm leading-[18px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? 'bg-surface-container-lowest font-semibold text-on-surface ring-1 ring-outline'
                : 'font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
