import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export type Theme = 'light' | 'dark'

const storageKey = 'baxorders-theme'

/**
 * The reader's own choice of light or dark, kept in this browser. Until they choose, the page follows the device. Only
 * a convenience: storage may be unavailable (a private window, blocked site data), and then the page simply follows
 * the device again.
 */
function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

function deviceTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme
  return set === 'light' || set === 'dark' ? set : deviceTheme()
}

/** Applied before the first render, so a reader who chose dark never sees a light flash. */
export function applyStoredTheme() {
  const theme = storedTheme()
  if (theme) document.documentElement.dataset.theme = theme
}

/** The theme in effect and a way to choose one, remembered in this browser; shared by every toggle. */
export function useThemeChoice(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(effectiveTheme)

  // While the reader has not chosen, follow the device as it changes.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const follow = () => { if (!storedTheme()) setTheme(effectiveTheme()) }
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [])

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(storageKey, next)
    } catch {
      // Not remembered this time; the choice still applies to this visit.
    }
    setTheme(next)
  }

  return [theme, choose]
}

export function ThemeToggle() {
  const [theme, choose] = useThemeChoice()

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Açıq', Icon: Sun },
    { value: 'dark', label: 'Tünd', Icon: Moon },
  ]

  return (
    <div role="group" aria-label="Mövzu" className="inline-flex rounded-full border border-line bg-stone p-0.5">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => choose(value)}
          title={`${label} mövzu`}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
            theme === value ? 'bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-muted hover:text-ink'
          }`}
        >
          <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.25} />
          <span className="max-sm:sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
