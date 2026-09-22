import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Səhifə tapılmadı</h1>
      <p className="mt-2 text-sm text-slate-500">Axtardığınız ünvan mövcud deyil.</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">
        İdarə panelinə qayıt
      </Link>
    </div>
  )
}
