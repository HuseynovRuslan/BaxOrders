import { PageHeader } from '../components/PageHeader'
import { PlannedFeature } from '../components/PlannedFeature'

export function ProductsPage() {
  return (
    <>
      <PageHeader title="Məhsullar" description="Məhsullar, variantlar və kateqoriyalar" />
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
