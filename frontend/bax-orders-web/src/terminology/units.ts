/**
 * Units as a reader says them.
 *
 * The catalogue identifies a unit by a code — PCS, BAG, PACK — and the screens used to print that code, so a
 * manager read "71 → 0 PCS". The code stays the key; what is shown is the Azerbaijani word. Nothing stored
 * changes: PACK's catalogue name is still "Paçka", and only the word on the screen is "paket".
 */
const unitWords: Record<string, string> = {
  PCS: 'ədəd',
  BAG: 'kisə',
  PACK: 'paket',
  PAIR: 'cüt',
  ROLL: 'rulon',
  L: 'litr',
  M2: 'm²',
  KG: 'kq',
  // The catalogue's own symbols.
  CM: 'sm',
  M: 'm',
  MM: 'mm',
  G: 'qr',
  ML: 'ml',
  // A billing period, not a quantity (CB-40), and the catalogue's "Dəfə".
  MONTH: 'ay',
  TIME: 'dəfə',
}

/**
 * The word a reader sees for a unit. Never an English code.
 *
 * A unit this table does not know is named by its catalogue name, in lower case; the code is the last resort,
 * shown only when the API gave nothing else.
 */
export function unitWord(code: string | null | undefined, name?: string | null): string | null {
  const key = code?.trim()
  if (!key) {
    return null
  }

  const known = unitWords[key.toUpperCase()]
  if (known) {
    return known
  }

  const named = name?.trim()
  return named ? named.toLocaleLowerCase('az') : key
}
