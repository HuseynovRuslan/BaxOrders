import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { PlannedFeature } from '../components/PlannedFeature'

export function ProductsPage() {
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
      <PlannedFeature
        title="Məhsul kataloqu"
        points={[
          'Məhsullar və onların variantları (ölçü, model, sifariş vahidi)',
          'Excel yazılışları üçün alternativ adlar',
          'Məhsulun qiymət və miqdar tarixçəsi',
        ]}
      />
    </>
  )
}
