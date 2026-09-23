import type { ProductCategoryFilter, ProductCategoryState } from '../../api/productCategories'

export const stateLabels: Record<ProductCategoryState, string> = {
  Assigned: 'Təyin olunub',
  UniqueEvidence: 'Təhlükəsiz uyğunluq',
  Ambiguous: 'Ziddiyyətli',
  NoEvidence: 'Məlumatsız',
}

/**
 * Colour marks the state and the label says it in words, so a badge still reads without colour. Ambiguous is
 * the only one that asks for anything: neither "məlumatsız" nor "təyin olunub" is a fault.
 */
export const stateClass: Record<ProductCategoryState, string> = {
  Assigned: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  UniqueEvidence: 'bg-sky-50 text-sky-900 ring-sky-200',
  Ambiguous: 'bg-amber-50 text-amber-900 ring-amber-200',
  NoEvidence: 'bg-slate-100 text-slate-700 ring-slate-200',
}

/** A symbol as well as a colour, so the state is never carried by colour alone. */
export const stateSign: Record<ProductCategoryState, string> = {
  Assigned: '✓',
  UniqueEvidence: '≡',
  Ambiguous: '⚠',
  NoEvidence: '·',
}

export const filterLabels: Record<ProductCategoryFilter, string> = {
  All: 'Hamısı',
  UniqueEvidence: 'Təhlükəsiz',
  Ambiguous: 'Ziddiyyətli',
  NoEvidence: 'Məlumatsız',
  Assigned: 'Təyin olunub',
}

export const filterOrder: ProductCategoryFilter[] = ['All', 'UniqueEvidence', 'Ambiguous', 'NoEvidence', 'Assigned']

export function isFilter(value: string | null): value is ProductCategoryFilter {
  return value !== null && value in filterLabels
}

/** The separator the rest of the application uses for a category path. */
export function formatCategoryPath(path: string[]): string {
  return path.join(' › ')
}

export function occurrenceLabel(count: number): string {
  return `${count} dəfə`
}

export const applySafeLabel = 'Təhlükəsiz uyğunluqları tətbiq et'
export const assignLabel = 'Kateqoriya seç'

/** Said where the history disagrees with itself, so nobody reads the first row as the answer. */
export const ambiguousNote =
  'Excel tarixçəsi bir neçə kateqoriya göstərir. Say çoxluğu qərar vermir — kateqoriyanı özünüz seçməlisiniz.'

export const noEvidenceNote = 'Excel tarixçəsində bu məhsul üçün kateqoriya məlumatı yoxdur.'

/** Said next to the evidence, so it is never read as what the catalogue now claims. */
export const evidenceIsHistoryNote =
  'Bu sütun Excel-in nə dediyini göstərir. Kanonik kateqoriya kataloqun ayrıca qərarıdır.'
