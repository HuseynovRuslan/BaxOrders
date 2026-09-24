import { useEffect } from 'react'
import type { SetURLSearchParams } from 'react-router'
import { normalizeBasis, parseBasis, type BasisSelection } from './basisParams'

/**
 * The basis a screen is reading, with an older link quietly rewritten into today's spelling.
 *
 * A link saved before the short names existed still opens the comparison it was saved with — `parseBasis`
 * reads both spellings — but it would otherwise stay in the address bar in a form the screen never writes,
 * so the next person to copy it would pass on the old one. This replaces the entry rather than pushing a new
 * one: nobody pressed anything, so Back must still go where the reader came from.
 */
export function useBasis(params: URLSearchParams, setParams: SetURLSearchParams): BasisSelection {
  useEffect(() => {
    const normalized = normalizeBasis(params)
    if (normalized !== null) {
      setParams(normalized, { replace: true })
    }
  }, [params, setParams])

  return parseBasis(params)
}
