import { costDecreasedLabel, costIncreasedLabel } from '../../terminology/terms'

/**
 * The direction of a cost in words, for a screen reader, beside the colour that shows it (9.1) — so the colour
 * is never the only carrier. Nothing for no change.
 */
export function DirectionWord({ value }: { value: number | null | undefined }) {
  const direction = value == null || value === 0 ? null : value > 0 ? costIncreasedLabel : costDecreasedLabel
  return direction === null ? null : <span className="sr-only">, {direction}</span>
}
