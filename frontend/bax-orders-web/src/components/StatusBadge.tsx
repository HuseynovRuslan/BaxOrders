interface StatusBadgeProps {
  label: string
  /** A symbol as well as a colour, so the state is never carried by colour alone. */
  sign?: string
  /** The Tailwind ring/background/text classes for this state, e.g. `historyCoverageClass[state]`. */
  toneClass: string
  size?: 'sm' | 'md'
}

/**
 * The one badge shape the whole application uses for a state: workflow status, history coverage, comparison
 * availability, permission blocks. A page owns what its states are called and coloured — this only owns how
 * a state is drawn, so a badge on one screen looks like a badge on every other.
 * <para>
 * Badges are for states a thing is <i>in</i>, not for every number or fact about it — a count or a version is
 * plain text, not a pill, or the page turns back into badge soup.
 * </para>
 */
export function StatusBadge({ label, sign, toneClass, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      // `rounded-2xl`, not `rounded-full`: a pill on one line all the same (its radius is more than half its height),
      // and a rounded box rather than a blob when a long label wraps — at 200% text, on a phone (UI V2 E-1).
      className={`inline-flex max-w-full items-center gap-1.5 rounded-2xl font-medium ring-1 ring-inset ${toneClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      {sign && <span aria-hidden="true">{sign}</span>}
      {label}
    </span>
  )
}
