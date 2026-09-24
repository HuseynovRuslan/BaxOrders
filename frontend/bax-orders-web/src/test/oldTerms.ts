/**
 * Test-only: the words the manager's screens no longer say, and one check that looks for all of them.
 *
 * Kept in one exported list so a later task that retires more words adds them here rather than writing a second
 * sweep. Task 05a filled it with the old terms; Task 05b added the technical identifiers — codes, "Versiya",
 * "Sətir sayı".
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
  // Task 05b: technical identifiers. Object and product codes, in the shape the catalogue gives them.
  { name: 'object code', pattern: /LOC-\d/ },
  { name: 'product code', pattern: /PRD-\d/ },
  // The codes the brief found under a product name: two model codes and a bare specification value. A number
  // written for a reader uses a decimal comma, so "2.8" on its own is only ever the raw value.
  { name: 'model code (brief)', pattern: /M-101-S-2|20078331/ },
  { name: 'bare specification (brief)', pattern: /(?<![\d.,])2\.8(?!\d)/ },
  { name: 'Versiya', pattern: /versiya/i },
  { name: 'Sətir sayı', pattern: /Sətir sayı/i },
]

/**
 * The two places the owner kept the technical record in (brief): the product history's folded "Mənbə və versiya
 * məlumatı", and the "Mənbəyə bax" drawer. They are left out of the sweep — they and nothing else.
 */
function isKeptTechnicalSection(element: Element): boolean {
  if (element.tagName === 'DETAILS') {
    return element.querySelector('summary')?.textContent?.trim() === 'Mənbə və versiya məlumatı'
  }

  return element.getAttribute('role') === 'dialog' && element.querySelector('h2')?.textContent?.trim() === 'Mənbə'
}

/** Everything a reader can meet on the screen: its text, and what it says to a screen reader or on hover. */
export function readableText(root: HTMLElement): string {
  const copy = root.cloneNode(true) as HTMLElement
  Array.from(copy.querySelectorAll('details, [role="dialog"]'))
    .filter(isKeptTechnicalSection)
    .forEach((element) => element.remove())

  const attributes = Array.from(copy.querySelectorAll('[aria-label], [title], [placeholder]'))
    .flatMap((element) => ['aria-label', 'title', 'placeholder'].map((name) => element.getAttribute(name)))
    .filter((value): value is string => value !== null)

  return [copy.textContent ?? '', ...attributes].join('\n')
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
