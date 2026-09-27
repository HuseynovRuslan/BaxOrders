/**
 * Who an order line is answerable to, and the one place the app names it.
 *
 * The business writes a responsible person beside every line of the order workbook, not once at the top, and
 * one order routinely carries two or three people's lines: the cleaning material of the person who runs the
 * building, the fuel and machinery of the person who runs the grounds. So this is a fact about the line.
 *
 * An order still has to say something about itself, and there are four honest answers. Somebody assigned the
 * whole order to one person; nobody assigned it but its lines all name the same person; its lines name several
 * people; or nothing names anybody. What the screen never does is pick the person with the most lines — an
 * order of forty cleaning lines and one fuel line is not the cleaner's order, and a heading that said so would
 * put a name on a decision nobody made.
 *
 * The line-type words live in `./lineType`, the price words in `src/pricing/labels`, and the rest of the
 * shared terms in `src/terminology/terms`.
 */

/** The mirror of `BaxOrders.Application.Orders.OrderResponsibilityKind`. */
export type OrderResponsibilityKind = 'None' | 'Assigned' | 'AgreedOnLines' | 'Several'

/** The mirror of `OrderResponsibilityDto`. */
export interface OrderResponsibility {
  kind: OrderResponsibilityKind
  personId: number | null
  personName: string | null
  /** How many different people the lines name. Context for a reader, never a ranking. */
  distinctPersonCount: number
  /** How many lines name somebody at all. */
  namedLineCount: number
}

/** What the field is called, on an order and on a line alike. */
export const responsiblePersonLabel = 'Cavabdeh'

/** The plural the workbook itself uses, for a heading that names the column rather than one line's value. */
export const responsiblePersonColumnLabel = 'Cavabdeh şəxs'

/**
 * What an order whose lines name several people says.
 *
 * Deliberately not "Eldar +2 nəfər": naming one of them first reads as a ranking, and the point of this label
 * is that the order does not have a single answer. Whose each line is stands beside the line.
 */
export const severalResponsiblePeopleLabel = 'Bir neçə cavabdeh'

/** What a line, or an order, with nobody recorded says. Never an error: the source simply did not say. */
export const noResponsiblePersonLabel = 'Cavabdeh təyin edilməyib'

/** What an order's heading reads, whichever of the four answers applies. */
export function orderResponsibilityText(responsibility: OrderResponsibility): string {
  switch (responsibility.kind) {
    case 'Assigned':
    case 'AgreedOnLines':
      return responsibility.personName ?? noResponsiblePersonLabel
    case 'Several':
      return severalResponsiblePeopleLabel
    default:
      return noResponsiblePersonLabel
  }
}

/**
 * Why the heading says what it says, in a few words, or nothing where the answer speaks for itself.
 *
 * Only the two answers a reader could misread get a note. An assignment is a decision somebody made and the
 * lines may say otherwise, so it says so. "Several" needs to point at where the answer actually is.
 */
export function orderResponsibilityNote(responsibility: OrderResponsibility): string | null {
  switch (responsibility.kind) {
    case 'Assigned':
      return 'Sifariş bütövlükdə bu şəxsə təyin edilib'
    case 'Several':
      return 'Hər sətrin cavabdehi sətrin yanında göstərilir'
    default:
      return null
  }
}
