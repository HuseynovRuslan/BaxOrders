import { Link, useSearchParams } from 'react-router'
import type { ProductMatchKind } from '../api/productMatches'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader } from '../components/PageHeader'
import { DecisionList } from '../components/catalog/matches/DecisionList'
import { FamilyList } from '../components/catalog/matches/FamilyList'
import { SuggestionList } from '../components/catalog/matches/SuggestionList'
import { isKind, isTab, tabLabels, tabOrder, type ProductsTab } from '../components/catalog/matches/labels'

/**
 * The products the catalogue may be holding twice, and what an administrator decided about them (Task 13).
 * <para>
 * Three views: what the rules suggest, the base products with the variants approved under them, and every decision.
 * The tab and the kind of suggestion live in the address, so going back returns to the same view. Anybody signed
 * in reads all three; only somebody holding `canDecideProductMatches` is offered a button (13.2).
 * </para>
 */
export function ProductsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const tab: ProductsTab = isTab(params.get('tab')) ? (params.get('tab') as ProductsTab) : 'suggestions'
  const kind: ProductMatchKind = isKind(params.get('kind')) ? (params.get('kind') as ProductMatchKind) : 'SameItem'
  const search = params.get('search') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1)

  function update(changes: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === undefined || value === '') {
        next.delete(name)
      } else {
        next.set(name, value)
      }
    }

    if (resetPage) {
      next.delete('page')
    }

    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Məhsullar"
        description="Məhsullar, variantlar və kateqoriyalar"
        actions={
          <Link
            to="/products/categories"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Məhsul kateqoriyaları
          </Link>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Məhsullar">
        {tabOrder.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => update({ tab: option === 'suggestions' ? undefined : option, search: undefined })}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === option ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tabLabels[option]}
          </button>
        ))}
      </div>

      {tab === 'suggestions' && (
        <SuggestionList
          kind={kind}
          search={search}
          page={page}
          canDecide={user.canDecideProductMatches}
          onKindChange={(option) => update({ kind: option === 'SameItem' ? undefined : option })}
          onSearch={(value) => update({ search: value })}
          onPage={(value) => update({ page: String(value) }, false)}
        />
      )}

      {tab === 'families' && <FamilyList />}

      {tab === 'decisions' && <DecisionList canDecide={user.canDecideProductMatches} />}
    </>
  )
}
