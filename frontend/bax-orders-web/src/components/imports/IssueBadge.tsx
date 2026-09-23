import type { IssueSeverity, IssueType } from '../../api/imports'
import { issueTypeLabels } from './labels'

/** An error blocks the import; a warning does not. The badge says so by weight, not only by hue. */
const severityStyles: Record<IssueSeverity, string> = {
  Error: 'bg-red-50 text-red-800 ring-red-300 font-semibold',
  Warning: 'bg-amber-50 text-amber-800 ring-amber-200 font-medium',
  Info: 'bg-sky-50 text-sky-700 ring-sky-200 font-medium',
}

interface IssueBadgeProps {
  issueType: IssueType
  severity: IssueSeverity
  title?: string
}

export function IssueBadge({ issueType, severity, title }: IssueBadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs ring-1 ring-inset ${severityStyles[severity]}`}
    >
      {issueTypeLabels[issueType]}
    </span>
  )
}
