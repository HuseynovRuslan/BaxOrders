/**
 * Test-only: the words the manager's screens no longer say, and one check that looks for all of them.
 *
 * Kept in one exported list so a later task that retires more words (Task 05b: codes, "Versiya", "Sətir sayı")
 * adds them here rather than writing a second sweep.
 */

export interface OldTerm {
  /** What the report says when it is found. */
  name: string
  pattern: RegExp
}

export const oldTerms: OldTerm[] = [
  // Owner decision 5.1.
  { name: 'Yeni sifarişlər', pattern: /Yeni sifarişlər/i },
  { name: 'Artıq sifariş olunmayanlar / olunmur', pattern: /Artıq sifariş olunma|Artıq sifariş olunmur/i },
  { name: 'mövqe', pattern: /mövqe/i },
  { name: 'Məlum qiymətlər üzrə', pattern: /Məlum qiymətlər üzrə/i },
  { name: 'Məlum məbləğ', pattern: /Məlum məbləğ/i },
  { name: 'Çəkili orta qiymət', pattern: /Çəkili/i },
  { name: 'Tarixçə natamam', pattern: /Tarixçə natamam/i },
  { name: 'Natamam tarixçə', pattern: /Natamam tarixçə/i },
  { name: 'mövcud aydan', pattern: /mövcud aydan/i },
  { name: 'Trend', pattern: /trend/i },
  // The brief's pairs (5.3).
  { name: 'Qiyməti olmayanlar', pattern: /Qiyməti olmayanlar/i },
  { name: 'Qiymət məlumatı çatışmır', pattern: /Qiymət məlumatı çatışmır/i },
  { name: 'Qiymət məlumatı natamamdır', pattern: /Qiymət məlumatı natamamdır/i },
  { name: 'qiymətsiz', pattern: /qiymətsiz/i },
  { name: 'məhsulun qiyməti yoxdur', pattern: /məhsulun qiyməti yoxdur/i },
  { name: 'Düzəlişə qaytarıldı', pattern: /Düzəlişə qaytarıldı/i },
  // The header (5.6) and the order page's unit column (5.4).
  { name: 'Server işləyir', pattern: /Server işləyir/i },
  { name: 'Ö/v', pattern: /Ö\/v/ },
  // Units in English (5.4): a code standing where a unit is read — after a number or a "·".
  { name: 'unit code', pattern: /(?:\d|·)\s(?:PCS|BAG|PACK|PAIR|ROLL|L|M2|KG)(?![\p{L}\d])/u },
  // Money (5.5): a price to four decimals, and ₼ after a space it could be broken from.
  { name: 'four-decimal price', pattern: /,\d{3,4}\s?₼/ },
  { name: 'ordinary space before ₼', pattern: / ₼/ },
]

/** Everything a reader can meet on the screen: its text, and what it says to a screen reader or on hover. */
export function readableText(root: HTMLElement): string {
  const attributes = Array.from(root.querySelectorAll('[aria-label], [title], [placeholder]'))
    .flatMap((element) => ['aria-label', 'title', 'placeholder'].map((name) => element.getAttribute(name)))
    .filter((value): value is string => value !== null)

  return [root.textContent ?? '', ...attributes].join('\n')
}

/** The old words found on a screen, by name. Empty when the screen is clean. */
export function findOldTerms(root: HTMLElement): string[] {
  const text = readableText(root)
  const found = oldTerms.filter((term) => term.pattern.test(text)).map((term) => term.name)

  // "Bütün dövr" is the full name's first two words, so it is only old as the whole of a button.
  const shortBasisButton = Array.from(root.querySelectorAll('button'))
    .some((button) => button.textContent?.trim() === 'Bütün dövr')
  if (shortBasisButton) {
    found.push('a button reading "Bütün dövr"')
  }

  return found
}
