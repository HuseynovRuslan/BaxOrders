/**
 * Numbers as the owner reads them (D-50, D-52): «317.128,16» — a dot between the thousands, a comma before the
 * fraction — on every screen, whatever the browser's own data for Azerbaijani says.
 *
 * That data is not stable. Chrome 155 writes «317,128.16» for `az-Latn-AZ` while Node writes «317.128,16», so a
 * formatter that trusts the runtime showed the owner one thing and the tests another. So the parts come from `en-US`,
 * which every runtime carries, and only the two separators are put in by name. The digits, the rounding, the grouping
 * and the minus sign stay the runtime's own: this decides how a number is written, never what it is.
 *
 * Every formatter on screen is made here; a test fails if a number formatter for Azerbaijani appears anywhere else.
 */
export interface NumberFormatter {
  format(value: number): string
}

export function azNumberFormat(options: Intl.NumberFormatOptions): NumberFormatter {
  const parts = new Intl.NumberFormat('en-US', options)

  return {
    format(value: number): string {
      return parts
        .formatToParts(value)
        .map((part) => (part.type === 'group' ? '.' : part.type === 'decimal' ? ',' : part.value))
        .join('')
    },
  }
}
