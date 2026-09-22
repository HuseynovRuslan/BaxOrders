import { fetchLocations } from '../api/locations'
import { PageHeader } from '../components/PageHeader'
import { PlannedFeature } from '../components/PlannedFeature'
import { useApiResource } from '../hooks/useApiResource'

export function DashboardPage() {
  const locations = useApiResource(fetchLocations)

  const activeLocationCount =
    locations.status === 'success' ? locations.data.filter((l) => l.isActive).length : null

  return (
    <>
      <PageHeader
        title="İdarə paneli"
        description="Obyektlər üzrə material sorğularının ümumi mənzərəsi"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Aktiv obyektlər</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {locations.status === 'loading' && '…'}
            {locations.status === 'error' && <span className="text-base text-red-600">Yüklənmədi</span>}
            {activeLocationCount !== null && activeLocationCount}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <PlannedFeature
          title="Analitika"
          points={[
            'Cari ayın ümumi sorğu dəyəri və əvvəlki ayla müqayisə',
            'Ən çox artım və azalma olan obyektlər',
            'Miqdarı və qiyməti ən çox dəyişən məhsullar',
            'Yeni məhsullar və qeyri-adi dəyişikliklər',
          ]}
        />
      </div>
    </>
  )
}
