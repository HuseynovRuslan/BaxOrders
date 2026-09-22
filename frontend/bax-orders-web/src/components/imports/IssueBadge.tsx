import type { IssueSeverity, IssueType } from '../../api/imports'
import { issueTypeLabels } from './labels'

const severityStyles: Record<IssueSeverity, string> = {
  Error: 'bg-red-50 text-red-700 ring-red-200',
  Warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  Info: 'bg-sky-50 text-sky-700 ring-sky-200',
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
      className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${severityStyles[severity]}`}
    >
      {issueTypeLabels[issueType]}
    </span>
  )
}
