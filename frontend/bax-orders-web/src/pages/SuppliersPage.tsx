import { PageHeader } from '../components/PageHeader'
import { PlannedFeature } from '../components/PlannedFeature'

export function SuppliersPage() {
  return (
    <>
      <PageHeader title="Təchizatçılar" description="Materialların alındığı şirkətlər" />
      <PlannedFeature
        title="Təchizatçıların idarə edilməsi"
        points={['Təchizatçıların siyahısı', 'Təchizatçı üzrə qiymət tarixçəsi']}
      />
    </>
  )
}
