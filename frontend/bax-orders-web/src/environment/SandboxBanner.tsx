import { useIsSandbox } from './EnvironmentProvider'
import { sandboxBanner } from './labels'

/**
 * The test environment's mark, at the top of every page. It cannot be closed: a page of the sandbox is never
 * to be taken for a page of the real system. In the normal system it renders nothing at all.
 */
export function SandboxBanner() {
  if (!useIsSandbox()) {
    return null
  }

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900"
    >
      {sandboxBanner}
    </div>
  )
}
