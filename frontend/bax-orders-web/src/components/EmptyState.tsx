/** Nothing to show, and said plainly: what's missing, in one line. Every list page said this slightly differently. */
export function EmptyState({ children }: { children: string }) {
  return <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{children}</p>
}

/** A request failed. The server's own message when it has one — never a raw ProblemDetails dump. */
export function ErrorState({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      {message}
    </p>
  )
}

/** A handful of quiet placeholder rows while a list loads, instead of nothing or a spinner that jumps the page. */
export function LoadingRows({ count = 5, label }: { count?: number; label: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  )
}
