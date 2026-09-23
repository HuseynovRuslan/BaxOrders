import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

/**
 * A subsection's own small heading — one step down from `PageHeader`. Used to separate blocks that must not
 * be read as one thing: a summary is not the actions, the actions are not the history.
 */
export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
