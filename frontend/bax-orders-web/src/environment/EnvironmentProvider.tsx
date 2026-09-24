import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { fetchEnvironment } from '../api/environment'

const SandboxContext = createContext(false)

/**
 * Whether the screens are talking to the test environment, asked once for the whole application.
 * </summary>
 * Until the answer arrives, and whenever the question cannot be answered, it is "no": the screens then look
 * exactly as they always have. That is safe because the banner is not what keeps test data out of the normal
 * screens — the API refuses to serve a sandbox database outside the Sandbox environment.
 */
export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [isSandbox, setIsSandbox] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetchEnvironment(controller.signal)
      .then((environment) => setIsSandbox(environment.isSandbox === true))
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  return <SandboxContext value={isSandbox}>{children}</SandboxContext>
}

export function useIsSandbox(): boolean {
  return use(SandboxContext)
}
