import type { AnalyticsScope } from '../api/dashboard'

/**
 * The three ways a manager asks the same question, and the words each one is answered in.
 *
 * `All` is deliberately not called a monthly figure anywhere: it is what the company actually spent, including
 * lines nobody has classified, and describing it as demand would be the very guess the classification exists to
 * prevent.
 */
export const scopeOrder: readonly AnalyticsScope[] = ['Monthly', 'OutsideMonthly', 'All']

export const scopeLabels: Record<AnalyticsScope, string> = {
  Monthly: 'Aylıq sifarişlər',
  OutsideMonthly: 'Aylıqdan kənar',
  All: 'Hamısı',
}

/** What the amount on the screen is, in the scope the reader chose. */
export const scopeAmountLabels: Record<AnalyticsScope, string> = {
  Monthly: 'Aylıq sifarişlərin məbləği',
  OutsideMonthly: 'Aylıqdan kənar xərclər',
  All: 'Ümumi faktiki xərc',
}

/**
 * One line under the amount, where the scope changes what a comparison means.
 *
 * Only the two that need saying say anything: the planned material is what every comparison on this product has
 * always been about and needs no explanation, and a caption on every scope would be three captions to read.
 */
export const scopeNotes: Partial<Record<AnalyticsScope, string>> = {
  OutsideMonthly: 'Plandan kənar alınanlar. Xərcdir, aylıq tələb deyil.',
  All: 'Bütün sətirlər, təsnif edilməyənlər də daxil. Aylıq tələb kimi oxunmur.',
}

export function isScope(value: string | null): value is AnalyticsScope {
  return value !== null && (scopeOrder as readonly string[]).includes(value)
}
