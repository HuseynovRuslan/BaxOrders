import { Link } from 'react-router'
import { YEAR } from '../data/model'

export function NotFound({ message = 'Bu ünvanda səhifə yoxdur.' }: { message?: string }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-lg border border-line bg-paper p-6">
      <h1 id="page-title" tabIndex={-1} className="text-xl font-semibold outline-none">Tapılmadı</h1>
      <p className="text-muted">{message}</p>
      <Link to={`/${YEAR}`} className="font-semibold text-sea underline-offset-4 hover:underline">{YEAR} ilinin icmalına qayıt</Link>
    </section>
  )
}
