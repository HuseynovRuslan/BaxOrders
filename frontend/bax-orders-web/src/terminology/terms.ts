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

/**
 * "58 məhsuldan" — how many products a part of the money came from. Beside a "Yeni məhsullar" part, "58 məhsul"
 * read as "58 new products", which is the state count's question, not this one.
 */
export const fromProductsNoun = 'məhsuldan'

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

/** How many product names the unexplained-part sentence names before it counts the rest. */
const unexplainedNamedProductLimit = 3

/**
 * The order page's warning, said only when part of the difference really is unexplained: how much, and which
 * products it sits on. `amount` arrives already formatted ("−18,96 ₼"); `names` in the order the reader meets
 * them, largest money first. A name repeated across variants is one product to the reader and is named once.
 *
 * The amount comes in formatted because `components/analytics/format` already reads its words from this file;
 * importing the formatter back here would make the two modules load each other.
 */
export function unexplainedPartNote(amount: string, names: readonly string[]): string {
  const distinct = Array.from(new Set(names))
  if (distinct.length === 0) {
    // Never "…: ." — the API names the products, but a sentence with an empty list is worse than a shorter one.
    return `Dəyişikliyin ${amount} hissəsi izah edilə bilmir, çünki bəzi sətirlərdə qiymət yoxdur.`
  }

  const named = distinct.slice(0, unexplainedNamedProductLimit).join(', ')
  const rest = distinct.length - unexplainedNamedProductLimit
  const tail = rest > 0 ? ` və daha ${rest} ${productNoun}` : ''
  return `Dəyişikliyin ${amount} hissəsi izah edilə bilmir, çünki bu məhsulların bəzi sətirlərində qiymət yoxdur: ${named}${tail}.`
}

/**
 * Owner decision 9.1 in words: the direction of a cost, said beside the colour that shows it so the colour is
 * never the only carrier — and never "yaxşı" or "pis".
 */
export const costIncreasedLabel = 'xərc artıb'
export const costDecreasedLabel = 'xərc azalıb'
export const costUnchangedLabel = 'xərc dəyişməyib'

/**
 * "Keçən aya görə xərc artıb" — the direction of a cost in words, after the caption that says what it is measured
 * against (`describeBasisCaption`). The dashboard's headline and cards say it where the reader sees it, so 9.1 is
 * read and not only coloured. Null when there is no difference to describe.
 */
export function costDirectionSentence(caption: string, delta: number | null | undefined): string | null {
  if (delta === null || delta === undefined) {
    return null
  }

  const direction = delta > 0 ? costIncreasedLabel : delta < 0 ? costDecreasedLabel : costUnchangedLabel
  return `${caption} ${direction}`
}

// ---- the monthly report (Task 08) ------------------------------------------------------------------------

/** The row under the monthly report's locations: each month's company total and the year's (owner decision 8.1). */
export const monthlyTotalsRowLabel = 'Cəmi'

/**
 * The same row while a search is narrowing the locations. The totals stay the whole company's, and the label
 * says so, so nobody tries to add the visible rows up to it.
 */
export const monthlyTotalsAllLocationsLabel = 'Cəmi — bütün obyektlər'

/** A month that has not begun yet. Never "sifariş yoxdur": nothing can have been ordered for it yet. */
export const futureMonthLabel = 'Gələcək ay'

/** "Oktyabr 2026: gələcək ay" — a future month's cell, said to a screen reader or on hover. */
export function futureMonthNote(month: string): string {
  return `${month}: ${futureMonthLabel.toLowerCase()}`
}

/** A month far from its location's recent months (owner decision 8.2). A fact to look at, never a verdict. */
export const unusualMonthLabel = 'Qeyri-adi ay'

/** What "Qeyri-adi ay" means, in the legend above the report. */
export const unusualMonthHint = 'əvvəlki 3 mövcud ayın ortalamasından 50%-dən çox fərq'

/**
 * "Qeyri-adi ay: əvvəlki 3 mövcud ayın ortalaması 14.458,58 ₼, fərq +149,06%". `average` and `percent` arrive
 * already formatted, for the reason `unexplainedPartNote` gives.
 */
export function unusualMonthNote(average: string, percent: string): string {
  return `${unusualMonthLabel}: əvvəlki 3 mövcud ayın ortalaması ${average}, fərq ${percent}`
}

/** What the percentage in a report cell is measured against. */
export const previousMonthPercentLabel = 'Faiz — əvvəlki aya görə'

/** The name of the legend above the report, for a screen reader. */
export const reportLegendLabel = 'Cədvəldəki işarələr'

/** The same legend above the report's cards on a phone, where there is no table for it to be the legend of. */
export const reportCardsLegendLabel = 'Kartlardakı işarələr'

const sharePercentFormat = new Intl.NumberFormat('az-Latn-AZ', { maximumFractionDigits: 0 })

/**
 * A product's share of every movement in its direction (owner decisions 7.1, 7.1a): "artımların 74%-i",
 * "azalmaların 25%-i". Which product and which movement are the backend's; this only divides and words it.
 *
 * A whole percent, with two guards so the figure is never false: a share short of all of it never reads 100
 * (it reads 99), and a share that is something never reads 0 ("1%-dən azı"). Never above 100 — the backend
 * guarantees the product is part of its denominator, and the cap says so here too.
 */
export function productShareLabel(amount: number, sameDirectionAmount: number): string {
  const movement = amount < 0 ? 'azalmaların' : 'artımların'
  const exact = sameDirectionAmount === 0
    ? 0
    : Math.min(100, (Math.abs(amount) / Math.abs(sameDirectionAmount)) * 100)

  if (exact > 0 && exact < 0.5) {
    return `${movement} 1%-dən azı`
  }

  // Math.round on a positive number is half away from zero.
  const whole = exact < 100 ? Math.min(99, Math.round(exact)) : 100
  return `${movement} ${sharePercentFormat.format(whole)}%-i`
}

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

// ---- the object page (Task 11) ---------------------------------------------------------------------------

/**
 * "Sentyabr 2026 sifarişində:" — the period the latest order's counts belong to, said before them. A count with no
 * period read as this month's whether it was or not.
 */
export function orderCountsLead(month: string): string {
  return `${month} sifarişində:`
}

/**
 * "Bütün tarixçə (Aprel–Sentyabr 2026):" — the period the object's lifetime counts belong to. Heydər Əliyev's "15"
 * unpriced lines are every order it has, not this month's, and the line now says so. `range` arrives formatted;
 * null for an object with no order, which then has no months to name.
 */
export function wholeHistoryLead(range: string | null): string {
  return range === null ? 'Bütün tarixçə:' : `Bütün tarixçə (${range}):`
}

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
