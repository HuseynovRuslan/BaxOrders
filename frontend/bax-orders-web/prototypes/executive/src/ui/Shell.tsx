import { Outlet } from 'react-router'
import { DATA_SOURCE } from '../data/model'
import { updatedText } from '../lib/year'
import { ImportButton, importEnabled } from './ImportButton'

/**
 * The year screens' inner frame: the data flag and the Excel import above the page, and where the figures come from
 * below it. It sits beside the application's sidebar (`exec/ExecLayout`), which carries the product's name, the way to
 * every screen («Mallar» among them), the light/dark switch, the skip link, the focus on each new heading and the
 * scroll restoration. The demo flag is always in sight — none of the demo figures is BaxOrders data.
 */
export function Shell() {
  return (
    <div className="min-h-dvh">
      {/* Over the page's own ground (the frame's `app-canvas`), parted from the page by its line alone. */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-end gap-2 sm:gap-4 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {importEnabled && <ImportButton />}
            {DATA_SOURCE.kind === 'real' ? (
              // On a phone the header has no room for it; the footer names the source all the same.
              <span className="hidden rounded-full border border-line-2 bg-stone-2 px-2.5 py-1 text-xs font-semibold text-ink-2 md:inline-block" title={`Mənbə: ${DATA_SOURCE.file}`}>
                Real məlumat · Excel
              </span>
            ) : (
              <span className="rounded-full border border-line-2 bg-stone-2 px-2.5 py-1 text-xs font-semibold text-ink-2" title="Prototip: bütün rəqəmlər uydurmadır">
                Demo məlumat
              </span>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto flex max-w-[1400px] flex-col gap-6 pb-16 pt-6 sm:pt-8 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-[1400px] pb-8 text-xs text-muted pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] sm:pl-[max(24px,env(safe-area-inset-left,0px))] sm:pr-[max(24px,env(safe-area-inset-right,0px))]">
        {DATA_SOURCE.kind === 'real'
          ? `Prototip. Rəqəmlər sahibin Excel kitabındandır: «${DATA_SOURCE.file}», ${DATA_SOURCE.lines} sətir${DATA_SOURCE.edits ? `, saytda ${DATA_SOURCE.edits} dəyişiklik edilib` : ''}; ${DATA_SOURCE.uploaded ? 'yenilənib' : 'düzəldilib'} ${updatedText}. Qala Bazadan daxili təchizat pulsuz sayılır. Aylıq sifarişləri Rəhbər ay səhifəsində öz kodu ilə təsdiqləyir; sentyabr 2026 daxil bütün aylar proqramda təsdiqlənib.`
          : 'Prototip. Kateqoriya quruluşu kitabdakı kimidir; obyektlər, məhsullar, miqdarlar və məbləğlər demo məqsədli uydurmadır.'}
      </footer>
    </div>
  )
}
