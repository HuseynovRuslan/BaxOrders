import { Construction } from 'lucide-react'

interface PlannedFeatureProps {
  title: string
  points: string[]
}

/** Honest placeholder for sections whose functionality is not built yet. */
export function PlannedFeature({ title, points }: PlannedFeatureProps) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
      <div className="flex items-center gap-2 text-slate-700">
        <Construction className="size-5 text-amber-600" />
        <h2 className="font-medium">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Bu bölmə hələ hazırlanır. Planlaşdırılan imkanlar:
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  )
}
