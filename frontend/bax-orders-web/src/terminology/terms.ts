/**
 * The words the manager's screens use for the ideas they share, and the one place each is defined.
 *
 * The same idea used to reach the reader under two or three names — "Yeni sifarişlər" in one section and "Yeni"
 * in the filter above it, "Bütün dövr" on a button and "Bütün dövrün ortalaması" in the sentence it produced,
 * "mövqe" where every other screen said "məhsul" — so a reader moving between screens had to work out each time
 * whether two words meant one thing. The owner approved one word for each (decision 5.1), and they live here.
 *
 * The price words — "Qiymət yoxdur", "Daxili təminat" and their counts — are Task 2's and stay in
 * `src/pricing/labels`. The words for the four object groups are Task 1b's and stay in `src/coverage/labels`.
 */

/** Products ordered this month and not in the window it is compared against. Never "Yeni sifarişlər". */
export const newProductsLabel = 'Yeni məhsullar'

/**
 * Products in the window and not ordered this month. Never "Artıq sifariş olunmur": the product may well be
 * ordered next month, and the system only knows about this one.
 */
export const notOrderedThisMonthLabel = 'Bu ay yazılmayan məhsullar'

/** What a row of the comparison is. Was "mövqe". */
export const productNoun = 'məhsul'

/** Money that leaves out the lines nobody has priced. Never called a total of the order. */
export const pricedLinesTotalLabel = 'Qiyməti olan sətirlərin cəmi'

/** The quantity-weighted price. The weighting is explained in the hint beside it, not in its name. */
export const averagePriceLabel = 'Orta qiymət'

/** An average taken over fewer months than the basis asked for. Was "Tarixçə natamam". */
export const limitedComparisonDataLabel = 'Müqayisə üçün data azdır'

/** One product at one object, over time. Was "Trend". */
export const productHistoryLabel = 'Məhsul tarixçəsi'

/** The basis that averages every earlier month — the same name on the button and in the sentence. */
export const allPriorMonthsLabel = 'Bütün dövrün ortalaması'

/**
 * Said wherever part of the month's difference cannot be split into quantity and price because a price is
 * missing: the dashboard cards, the dashboard rows and the order page all say this one sentence.
 */
export const incompleteExplanationNote = 'Dəyişikliyin bir hissəsi izah edilə bilmir: bəzi sətirlərdə qiymət yoxdur.'

/**
 * The versions of one month's order, in business words rather than "Versiya N" (Task 05b). A version made to
 * correct a returned order is the "düzəldilmiş sifariş", the one it was made from the "əvvəlki sifariş", and the
 * newest of the month the "ən son sifariş". Version numbers stay only in the two technical places the owner kept:
 * the product history's folded "Mənbə və versiya məlumatı" and the "Mənbəyə bax" drawer.
 */
export const correctedOrderLabel = 'Düzəldilmiş sifariş'

/** The link from a correction back to the order it was made from. */
export const previousOrderLinkLabel = 'Əvvəlki sifarişə bax'

/** The link from an older order of a month to the newest one. */
export const latestOrderLinkLabel = 'Ən son sifarişə bax'

/** Under an older order of a month on the object page, where a later one of the same month replaced it. */
export const supersededOrderNote = 'Əvvəlki sifariş — sonradan yenilənib'

/**
 * The locative ending follows the vowel of the last number word that is pronounced: 3 "üç" → 3-də, 6 "altı" →
 * 6-da, 40 "qırx" → 40-da, 100 "yüz" → 100-də.
 */
const unitLocatives = ['', 'də', 'də', 'də', 'də', 'də', 'da', 'də', 'də', 'da']
const tensLocatives = ['', 'da', 'də', 'da', 'da', 'də', 'da', 'də', 'də', 'da']

/** "da" or "də" for "Son 9 ayın 3-də". */
export function locativeSuffix(value: number): string {
  const count = Math.abs(Math.trunc(value))
  if (count % 10 !== 0) return unitLocatives[count % 10]
  if (count % 100 !== 0) return tensLocatives[(count % 100) / 10]
  // Yüz (100), min (1 000), milyon (1 000 000).
  if (count % 1000 !== 0) return 'də'
  if (count % 1_000_000 !== 0) return 'də'
  return 'da'
}
