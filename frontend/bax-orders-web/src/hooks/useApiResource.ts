import { useEffect, useState } from 'react'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string }

/**
 * Loads a resource once per `load` identity. Pass a stable (module-level)
 * function; the request is aborted when the component unmounts.
 */
export function useApiResource<T>(load: (signal: AbortSignal) => Promise<T>): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Naməlum xəta baş verdi'
        setState({ status: 'error', message })
      })

    return () => controller.abort()
  }, [load])

  return state
}
