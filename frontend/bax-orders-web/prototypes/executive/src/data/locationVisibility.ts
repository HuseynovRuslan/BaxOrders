import { AREA_LOCATIONS, type AreaLocation } from './areaLocations'
import { FINANCE_LINK_CANDIDATES, FINANCE_LINKS } from './areaFinanceLinks'

/*
 * Which of the owner's location records the map draws. Every record of the export stays in `areaLocations.json` and in
 * `AREA_LOCATIONS`, unchanged, with its full-precision coordinates. A record the owner has confirmed to be a second copy
 * of another place is only kept off the map, the list, the search and the analysis here, and its place is shown once,
 * by the record named beside it. Nothing is merged, moved or deleted: removing a line below brings the record back.
 *
 * A line is applied only while it still holds: the record and the one shown instead both exist in the export, both carry
 * the line's duplicate group and the same name, the one shown is not itself hidden, and the hidden record has no
 * financial line (its money would leave the map with it). A line that does not hold is not applied — both records are
 * drawn — and the page names it.
 */

export interface HiddenDuplicate {
  /** The record kept off the map. */
  id: string
  /** The record that shows the place instead. */
  shownAs: string
  /** The source's duplicate group both records carry. */
  group: string
  /** When the owner decided. */
  decided: string
  /** Why this record is hidden and not the other. */
  reason: string
}

export const HIDDEN_DUPLICATES: readonly HiddenDuplicate[] = [
  {
    id: 'LOC-0014',
    shownAs: 'LOC-0020',
    group: 'DUP-01',
    decided: '2026-11-19',
    reason: 'Sahib eyni ərazinin xəritədə iki dəfə göstərildiyini təsdiqlədi və bir nöqtə istədi '
      + '(docs/BaxOrders_Map_UI_Fixes_2026_11_19.txt, Fix 2). LOC-0020 qalır: etibarlılığı HIGH, LOC-0014-ün MEDIUM.',
  },
]

export interface HiddenLocation {
  location: AreaLocation
  shownAs: AreaLocation
  entry: HiddenDuplicate
}

export interface LocationVisibility {
  /** The records the map draws, in the export's order. */
  visible: AreaLocation[]
  hidden: HiddenLocation[]
  /** Lines of the registry that do not hold, and why: not applied. */
  problems: string[]
}

export function applyVisibility(
  locations: readonly AreaLocation[],
  registry: readonly HiddenDuplicate[] = HIDDEN_DUPLICATES,
  financeIds: ReadonlySet<string> = new Set([...Object.keys(FINANCE_LINKS), ...Object.keys(FINANCE_LINK_CANDIDATES)]),
): LocationVisibility {
  const byId = new Map(locations.map((location) => [location.id, location]))
  const hiddenIds = new Set(registry.map((entry) => entry.id))
  const hidden: HiddenLocation[] = []
  const problems: string[] = []
  const seen = new Set<string>()
  for (const entry of registry) {
    const location = byId.get(entry.id)
    const shownAs = byId.get(entry.shownAs)
    const problem = seen.has(entry.id) ? 'qeyd iki dəfə yazılıb'
      : !location ? 'gizlədilən qeyd mənbədə yoxdur'
        : !shownAs ? `əvəzində göstərilən ${entry.shownAs} mənbədə yoxdur`
          : entry.id === entry.shownAs || hiddenIds.has(entry.shownAs) ? `əvəzində göstərilən ${entry.shownAs} özü gizlədilib`
            : location.duplicateGroup !== entry.group || shownAs.duplicateGroup !== entry.group ? `qeydlər ${entry.group} dublikat qrupunda deyil`
              : location.name !== shownAs.name ? 'qeydlərin adları fərqlidir'
                : financeIds.has(entry.id) ? 'gizlədilən qeydin maliyyə sətri var'
                  : null
    seen.add(entry.id)
    if (problem || !location || !shownAs) {
      problems.push(`${entry.id} → ${entry.shownAs}: ${problem}; hər iki qeyd göstərilir`)
      continue
    }
    hidden.push({ location, shownAs, entry })
  }
  const off = new Set(hidden.map((item) => item.location.id))
  return { visible: locations.filter((location) => !off.has(location.id)), hidden, problems }
}

const applied = applyVisibility(AREA_LOCATIONS)

/** The locations the map draws: the export's records less the hidden duplicates. */
export const VISIBLE_LOCATIONS: readonly AreaLocation[] = Object.freeze(applied.visible)
/** The records kept off the map, each with the one shown for its place. */
export const HIDDEN_LOCATIONS: readonly HiddenLocation[] = Object.freeze(applied.hidden)
export const VISIBILITY_PROBLEMS: readonly string[] = Object.freeze(applied.problems)

/** The record that shows a location: itself, or — for a hidden duplicate — the one shown instead (an older link). */
export function shownIdOf(id: string): string {
  return HIDDEN_LOCATIONS.find((item) => item.location.id === id)?.shownAs.id ?? id
}

/** The hidden records a shown location stands for. */
export function hiddenBehind(id: string): HiddenLocation[] {
  return HIDDEN_LOCATIONS.filter((item) => item.shownAs.id === id)
}
