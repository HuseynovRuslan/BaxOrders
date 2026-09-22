import { ArrowRight, Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'

/**
 * A request always belongs to one object and one month, so it is opened from that object rather than from a
 * flat list. This page only says so and points there.
 */
export function OrdersPage() {
  return (
    <>
      <PageHeader title="Sifarişlər" description="Obyektlərin aylıq material sorğuları" />

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 text-slate-800">
          <Building2 className="size-5 text-emerald-600" />
          <h2 className="font-medium">Sifariş obyektdən açılır</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Hər sorğu bir obyektə və bir aya aiddir. Obyektlər siyahısından obyekti seçin, sonra həmin obyektin
          dövrlər üzrə tarixçəsindən sorğuya keçin. Sorğunun hər sətrindən onun gəldiyi Excel sətrinə baxmaq olar.
        </p>

        <Link
          to="/locations"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Obyektlərə keç
          <ArrowRight className="size-4" />
        </Link>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Bu bölmə yalnız baxış üçündür: sorğular burada yaradılmır, dəyişdirilmir və təsdiqlənmir. Dövrlər arası
          müqayisə və analitika hazırda əhatə olunmur.
        </p>
      </section>
    </>
  )
}
