import { User, X } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { roleLabels } from '../auth/labels'
import { navItems } from './navigation'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

/**
 * The product's structural anchor, as the approved BaxOrders-UI-v2 design draws it.
 *
 * A fixed 260-pixel slate column that never scrolls away and never changes colour: everything else sits on a
 * near-white ground, so the one dark shape is what the eye uses to know where it is. The active item carries
 * both a lighter fill and a blue bar on its trailing edge — colour is never the only thing saying where you are.
 *
 * The queue's count is not here any more; the design moved it to the header, where it now sits on a control
 * that opens the queue.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const visible = navItems.filter((item) => item.requires === undefined || user[item.requires])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col justify-between bg-slate-800 p-6 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-0 flex-col gap-8">
          <div className="flex shrink-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-lg font-extrabold text-white">
              B
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-lg font-bold leading-none text-white">BaxOrders</span>
              <span className="truncate text-[10px] font-medium uppercase leading-none text-slate-500">
                Material panel
              </span>
            </div>
            <button
              type="button"
              className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden"
              onClick={onClose}
              aria-label="Menyunu bağla"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {visible.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                    isActive ? 'bg-[#2a3649]' : 'hover:bg-slate-700/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`size-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span className={`min-w-0 flex-1 truncate text-sm ${
                      isActive ? 'font-semibold text-white' : 'font-medium text-slate-400'
                    }`}>
                      {label}
                    </span>
                    {/* The second carrier of "you are here", so the fill is never doing it alone. */}
                    {isActive && <span className="h-4 w-1 shrink-0 rounded-sm bg-blue-600" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/*
          Who is signed in. The approved design puts a photograph here; this product has no portraits, so the
          mark stands in its place — a stock face of somebody who does not work here would be the one piece of
          invented content on the screen.
        */}
        <div className="flex shrink-0 items-center gap-3 rounded-lg bg-slate-900 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700" aria-hidden="true">
            <User className="size-4 text-slate-300" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[13px] font-semibold leading-none text-white">{user.displayName}</span>
            <span className="truncate text-[11px] leading-none text-slate-500">
              {user.role ? roleLabels[user.role] : ''}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
