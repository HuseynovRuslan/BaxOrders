import { useEffect } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Package } from 'lucide-react'
import { DATA_SOURCE, YEAR } from '../data/model'
import { updatedText } from '../lib/year'
import { ImportButton, importEnabled } from './ImportButton'
import { ThemeToggle } from './theme'

/**
 * The frame every screen shares: the product's name, the demo flag, and the page. The demo flag is always in sight —
 * none of these figures is BaxOrders data.
 */
export function Shell() {
  const location = useLocation()

  // A new place moves the focus to its heading, so a keyboard or screen-reader user starts where the eye does.
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-paper focus:px-3 focus:py-2">
        Əsas məzmuna keç
      </a>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
          <Link to={`/${YEAR}`} className="flex items-center gap-2.5 rounded">
            <Mark />
            <span className="text-[17px] font-bold tracking-tight text-ink">BaxOrders</span>
            <span className="hidden text-sm text-muted sm:inline">Rəhbərlik paneli</span>
          </Link>
          <div className="flex items-center gap-2">
            {importEnabled && (
              <Link
                to={`/${YEAR}/mallar`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-2 bg-paper px-3 text-xs font-semibold text-ink transition-colors hover:bg-stone-2"
              >
                <Package aria-hidden="true" className="size-3.5" />
                Mallar
              </Link>
            )}
            {importEnabled && <ImportButton />}
            {DATA_SOURCE.kind === 'real' ? (
              <span className="rounded-full border border-line-2 bg-stone-2 px-2.5 py-1 text-xs font-semibold text-ink-2" title={`Mənbə: ${DATA_SOURCE.file}`}>
                Real məlumat · Excel
              </span>
            ) : (
              <span className="rounded-full border border-line-2 bg-stone-2 px-2.5 py-1 text-xs font-semibold text-ink-2" title="Prototip: bütün rəqəmlər uydurmadır">
                Demo məlumat
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto flex max-w-[1180px] flex-col gap-6 pb-16 pt-6 sm:pt-8 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-[1180px] pb-8 text-xs text-muted pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
        {DATA_SOURCE.kind === 'real'
          ? `Prototip. Rəqəmlər sahibin Excel kitabındandır: «${DATA_SOURCE.file}», ${DATA_SOURCE.lines} sətir${DATA_SOURCE.edits ? `, saytda ${DATA_SOURCE.edits} dəyişiklik edilib` : ''}; ${DATA_SOURCE.uploaded ? 'yenilənib' : 'düzəldilib'} ${updatedText}. Qala Bazadan daxili təchizat pulsuz sayılır. Təsdiq vəziyyəti proqramdakı kimidir: yanvar–sentyabr təsdiqlənib, sonrakı aylar gözləyir.`
          : 'Prototip. Kateqoriya quruluşu kitabdakı kimidir; obyektlər, məhsullar, miqdarlar və məbləğlər demo məqsədli uydurmadır.'}
      </footer>
      <ScrollRestoration />
    </div>
  )
}

/** A small mark: a square of sea-ink with a ledger line through it. */
function Mark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
      <rect width="24" height="24" rx="5" className="fill-ink" />
      <rect x="5" y="14" width="3" height="5" rx="1" className="fill-bar-soft" />
      <rect x="10.5" y="9" width="3" height="10" rx="1" className="fill-bar-soft" />
      <rect x="16" y="5" width="3" height="14" rx="1" className="fill-[#7fc4c7]" />
    </svg>
  )
}
