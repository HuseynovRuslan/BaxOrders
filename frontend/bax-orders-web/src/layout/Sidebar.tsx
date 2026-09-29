import { X } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { navItems } from './navigation'
import { usePendingApprovalCount } from './usePendingApprovalCount'
import { appVersion } from './version'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

/**
 * The product's structural anchor: a fixed navy column that never scrolls away and never changes colour.
 *
 * Everything else on screen sits on a near-white ground, so the one dark shape is what the eye uses to know
 * where it is. That is the whole job — it is deliberately the least decorated surface in the product.
 */
export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const visible = navItems.filter((item) => item.requires === undefined || user[item.requires])
  const pending = usePendingApprovalCount(visible.some((item) => item.to === '/approvals'))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-primary/50 lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between bg-primary text-on-primary transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-0 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between px-space-lg">
            <div className="flex items-center gap-space-md">
              <span className="flex size-9 items-center justify-center rounded-xl bg-secondary font-headline-sm text-headline-sm font-bold tracking-tight text-on-secondary">
                BAX
              </span>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-label-md text-label-md font-semibold leading-tight text-on-primary">
                  Sifariş sistemi
                </span>
                <span className="truncate font-label-sm text-label-sm text-on-primary-container">
                  Bakı Abadlıq Xidməti
                </span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-on-primary-container hover:bg-primary-container hover:text-on-primary lg:hidden"
              onClick={onClose}
              aria-label="Menyunu bağla"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-space-sm py-space-md">
            {visible.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-space-sm rounded-lg px-space-md py-space-sm transition-colors ${
                    isActive
                      ? 'bg-primary-container font-semibold text-on-primary'
                      : 'text-primary-fixed-dim hover:bg-primary-container hover:text-on-primary'
                  }`
                }
              >
                <span className="flex min-w-0 items-center gap-space-sm">
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="truncate font-body-md text-body-md">{label}</span>
                </span>

                {/*
                  The one number in the navigation, and only when there is one: a badge that reads zero teaches
                  the reader to stop looking at it. It is the real queue length, not a decoration.
                */}
                {to === '/approvals' && pending !== null && pending > 0 && (
                  <span className="shrink-0 rounded-full bg-error px-1.5 py-0.5 font-label-sm text-label-sm font-semibold text-on-error">
                    {pending}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="shrink-0 p-space-md">
          <div className="flex items-center justify-between rounded-lg bg-primary-container/60 p-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container">
              Sistem
            </span>
            {/* The version this build really is. The handoff's «v2.0 Enterprise» was mock copy. */}
            <span className="font-label-sm text-label-sm font-semibold text-secondary-fixed">{appVersion}</span>
          </div>
        </div>
      </aside>
    </>
  )
}
