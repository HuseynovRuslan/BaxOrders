import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router'
import {
  BarChart3, ChevronDown, ChevronsLeft, ChevronsRight, LayoutDashboard, MapPinned, Menu, Moon, Package, Sun, X, type LucideIcon,
} from 'lucide-react'
import { YEARS } from '../data/model'
import { useThemeChoice, type Theme } from '../ui/theme'
import { latestYear } from '../overview/metrics'
import { overviewLinks } from '../overview/links'
import './exec.css'

/*
 * The application's frame (Konsept A.3): a navy sidebar and the page, on every screen — the overview, the year screens
 * («Müdiriyyət»), the areas map and «Mallar». The year screens bring their own inner frame (`Shell`: its toolbar, its
 * page column and its footer) and their own look; this frame only puts the sidebar beside them. Their routes say so
 * with `handle: { frame: 'year' }`, and then the page column is theirs, outside the executive tokens. The sidebar folds
 * to its icons on a desktop (remembered in this browser) and becomes a menu behind a button below 1280 px: the year
 * screens were laid out for the whole width, and beside a sidebar they keep enough of it only from there on (at 1100 px
 * their month figures would run into each other).
 */

/** Set on a route whose screens draw their own page column (the year screens' `Shell`). */
export interface FrameHandle {
  frame?: 'year'
}

const collapseKey = 'baxorders-sidebar'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(collapseKey) === 'yığılıb'
  } catch {
    return false
  }
}

type Section = 'home' | 'management' | 'map' | 'products'

/** Where an address sits in the sidebar, and the year it is about (a year screen, a month, the analysis, «Mallar»). */
export function placeOf(pathname: string): { section: Section | null; year: number | null } {
  if (pathname === '/') return { section: 'home', year: null }
  const [first, second] = pathname.split('/').filter(Boolean)
  if (first === 'xerite') return { section: 'map', year: null }
  const year = Number(first)
  if (!YEARS.includes(year)) return { section: null, year: null }
  return { section: second === 'mallar' ? 'products' : 'management', year }
}

export function ExecLayout() {
  const location = useLocation()
  const yearFrame = useMatches().some((match) => (match.handle as FrameHandle | undefined)?.frame === 'year')
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeMenu = useCallback(() => { setMenuOpen(false); menuButton.current?.focus() }, [])

  // A new place moves the focus to its heading (every screen's is #page-title) and closes the phone menu.
  useEffect(() => {
    setMenuOpen(false)
    const frame = requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem(collapseKey, next ? 'yığılıb' : 'açıq')
    } catch {
      // Not remembered this time; the choice still holds for this visit.
    }
  }

  return (
    // The executive tokens colour the whole page of the new screens; on a year screen only the sidebar's parts carry
    // them (`exec contents` adds no box), so the year screen's own colours, type and focus rings stay its own.
    <div className={`${yearFrame ? '' : 'exec '}min-h-dvh xl:flex`}>
      <div className="exec contents">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[1000] focus:rounded-md focus:bg-(--x-surface) focus:px-3 focus:py-2 focus:text-(--x-ink)">
          Əsas məzmuna keç
        </a>

        {/* Desktop: the sidebar in the page's flow, wide or folded to its icons. */}
        {/* The navy runs the page's whole height; the menu inside it stays in view while the page scrolls. */}
        <div className="hidden shrink-0 border-r border-(--x-side-line) bg-(--x-side) xl:block">
          <aside
            aria-label="Əsas naviqasiya"
            className={`sticky top-0 flex h-dvh flex-col text-(--x-side-ink) transition-[width] duration-200 motion-reduce:transition-none ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}
          >
            <SidebarBody place="side" collapsed={collapsed} onToggle={toggleCollapsed} />
          </aside>
        </div>

        {/* Below 1280 px: a top bar, and the same sidebar as a menu over the page. */}
        <div className="sticky top-0 z-[900] flex h-14 items-center justify-between gap-3 border-b border-(--x-side-line) bg-(--x-side) px-4 text-(--x-side-ink) xl:hidden">
          <Brand />
          <button
            ref={menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="exec-menu"
            onClick={() => setMenuOpen(true)}
            className="grid size-11 place-items-center rounded-lg hover:bg-(--x-side-2)"
          >
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Menyunu aç</span>
          </button>
        </div>
        {menuOpen && <MobileMenu onClose={closeMenu} />}
      </div>

      <div className="app-canvas min-w-0 flex-1">
        {yearFrame ? <Outlet /> : (
          <main id="main" className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pt-7">
            <Outlet />
          </main>
        )}
      </div>
      <ScrollRestoration />
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-h-11 items-center gap-2.5 rounded-lg" aria-label={compact ? 'BaxOrders — ümumi baxış' : undefined}>
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white">
        <svg viewBox="0 0 24 24" className="size-5">
          <rect x="4" y="13" width="3.5" height="7" rx="1" fill="#0e9384" />
          <rect x="10.25" y="8" width="3.5" height="12" rx="1" fill="#10243a" />
          <rect x="16.5" y="4" width="3.5" height="16" rx="1" fill="#10243a" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col">
          <span className="text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-white">BaxOrders</span>
          <span className="text-xs font-semibold text-(--x-side-muted)">Rəhbərlik paneli</span>
        </span>
      )}
    </Link>
  )
}

function SidebarBody({ place, collapsed, onToggle, onNavigate }: {
  /** Which copy of the sidebar this is (the desktop column or the phone menu): their ids must differ. */
  place: 'side' | 'menu'
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const { section, year } = placeOf(pathname)
  const latest = latestYear()
  return (
    <div className="flex h-full flex-col px-3 pb-4 pt-5">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'px-2'}`}>
        <Brand compact={collapsed} />
      </div>
      <div aria-hidden="true" className="mx-2 mb-4 mt-5 border-t border-(--x-side-line)" />
      <nav aria-label="Bölmələr" className="min-h-0 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          <li>
            <NavRow to="/" label="Ümumi baxış" Icon={BarChart3} active={section === 'home'} current={pathname === '/' ? 'page' : undefined} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
          <li>
            <ManagementGroup listId={`${place}-years`} section={section} year={year} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
          <li>
            <NavRow to="/xerite" label="Ərazilər xəritəsi" Icon={MapPinned} active={section === 'map'} current={section === 'map' ? 'page' : undefined} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
          <li>
            {/* The catalogue of the year on screen, or of the latest year. */}
            <NavRow
              to={overviewLinks.products(year ?? latest)}
              label="Mallar"
              Icon={Package}
              active={section === 'products'}
              current={section === 'products' ? 'page' : undefined}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </li>
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Paneli aç' : 'Paneli yığ'}
            title={collapsed ? 'Paneli aç' : 'Paneli yığ'}
            className={`flex min-h-10 items-center gap-2 rounded-[10px] text-sm font-semibold text-(--x-side-muted) hover:bg-(--x-side-2)/60 hover:text-white ${collapsed ? 'justify-center' : 'px-3'}`}
          >
            {collapsed ? <ChevronsRight aria-hidden="true" className="size-5" /> : <><ChevronsLeft aria-hidden="true" className="size-5" />Paneli yığ</>}
          </button>
        )}
        <ThemeSwitch compact={collapsed} />
      </div>
    </div>
  )
}

/**
 * One top-level destination: the teal bar and the lit row mark the section the page belongs to. A section whose open
 * list already lights the page's own row (a year under «Müdiriyyət») keeps only its white name and teal icon, so one
 * row is lit, not two.
 */
function NavRow({ to, label, Icon, active, lit = active, current, collapsed, onNavigate, trailing }: {
  to: string
  label: string
  Icon: LucideIcon
  active: boolean
  lit?: boolean
  current?: 'page' | 'true'
  collapsed: boolean
  onNavigate?: () => void
  trailing?: ReactNode
}) {
  const tone = lit ? 'bg-(--x-side-2) text-white' : active ? 'text-white hover:bg-(--x-side-2)/60' : 'text-(--x-side-ink) hover:bg-(--x-side-2)/60 hover:text-white'
  return (
    <div className={`group relative flex items-center rounded-[10px] transition-colors ${tone}`}>
      {lit && <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-(--x-side-accent)" />}
      <Link
        to={to}
        aria-current={current}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[10px] text-[15px] font-semibold ${collapsed ? 'justify-center px-0' : 'px-3'}`}
      >
        <Icon aria-hidden="true" strokeWidth={2.1} className={`size-5 shrink-0 ${active ? 'text-(--x-side-accent)' : 'text-(--x-side-muted) group-hover:text-white'}`} />
        <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
      </Link>
      {!collapsed && trailing}
    </div>
  )
}

/**
 * «Müdiriyyət»: the year screens. The name opens the latest year; the chevron beside it — a control of its own — shows
 * or hides every year the data has, newest first, so a new year appears here by itself. On a year screen the list
 * opens and its year is lit; the year switch on the screen itself stays as it was. Folded to icons, the sidebar shows
 * the years as short tabs under the icon while a year screen is open.
 */
function ManagementGroup({ listId, section, year, pathname, collapsed, onNavigate }: {
  /** A fixed id, not useId(): a generated one here would renumber the ids of every screen drawn after the sidebar. */
  listId: string
  section: Section | null
  year: number | null
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  const inside = section === 'management'
  const [open, setOpen] = useState(inside)
  // Arriving on a year screen opens the list, so the year on screen is in sight.
  useEffect(() => {
    if (inside) setOpen(true)
  }, [inside, year])
  const years = [...YEARS].reverse()
  const latest = latestYear()

  return (
    <>
      <NavRow
        to={overviewLinks.year(latest)}
        label="Müdiriyyət"
        Icon={LayoutDashboard}
        active={inside}
        lit={inside && (collapsed || !open)}
        current={inside ? 'true' : undefined}
        collapsed={collapsed}
        onNavigate={onNavigate}
        trailing={years.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={open ? 'İlləri gizlət' : 'İlləri göstər'}
            title={open ? 'İlləri gizlət' : 'İlləri göstər'}
            onClick={() => setOpen((value) => !value)}
            className="mr-1 grid size-9 shrink-0 place-items-center rounded-lg text-(--x-side-muted) transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronDown aria-hidden="true" strokeWidth={2.2} className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      />

      {collapsed ? (
        inside && (
          <ul aria-label="İllər" className="mt-1 flex flex-col items-center gap-1">
            {years.map((item) => (
              <li key={item}>
                <Link
                  to={overviewLinks.year(item)}
                  onClick={onNavigate}
                  aria-label={`${item} · İllik icmal`}
                  aria-current={item === year ? (pathname === `/${item}` ? 'page' : 'true') : undefined}
                  title={`${item} · İllik icmal`}
                  className={`tnum grid h-8 w-[52px] place-items-center rounded-lg text-[13px] font-bold transition-colors ${
                    item === year ? 'bg-(--x-side-2) text-white ring-1 ring-(--x-side-accent)/70' : 'text-(--x-side-muted) hover:bg-(--x-side-2)/60 hover:text-white'
                  }`}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        // The list folds by its height (the grid row), and is out of reach while folded.
        <div
          id={listId}
          inert={!open}
          aria-hidden={!open || undefined}
          className={`grid transition-[grid-template-rows,visibility] duration-200 motion-reduce:transition-none ${open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
        >
          <ul aria-label="İllik icmallar" className="ml-[21px] flex min-h-0 flex-col gap-0.5 overflow-hidden border-l border-(--x-side-line) pl-2.5">
            {years.map((item, index) => {
              const selected = inside && item === year
              return (
                <li key={item} className={index === 0 ? 'pt-1' : index === years.length - 1 ? 'pb-1' : undefined}>
                  <Link
                    to={overviewLinks.year(item)}
                    onClick={onNavigate}
                    aria-current={selected ? (pathname === `/${item}` ? 'page' : 'true') : undefined}
                    className={`relative flex min-h-10 items-center gap-2 rounded-lg px-3 text-[14px] transition-colors ${
                      selected ? 'bg-(--x-side-2) text-white' : 'text-(--x-side-ink) hover:bg-(--x-side-2)/60 hover:text-white'
                    }`}
                  >
                    {/* The year on screen is marked on the list's line as well as by its lit row. */}
                    {selected && <span aria-hidden="true" className="absolute -left-[12px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-(--x-side-accent)" />}
                    {/* The spaces keep the name «2026 İllik icmal» for a screen reader; the flex row ignores them. */}
                    <span className="tnum font-bold">{item}</span>{' '}
                    <span aria-hidden="true" className="text-(--x-side-muted)">·</span>{' '}
                    <span className={selected ? 'text-white/85' : 'text-(--x-side-muted)'}>İllik icmal</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}

/** Light or dark for every screen — the app's own choice, as on the year screens — in the sidebar's navy. */
function ThemeSwitch({ compact }: { compact: boolean }) {
  const [theme, choose] = useThemeChoice()
  const options: { value: Theme; label: string; Icon: LucideIcon }[] = [
    { value: 'light', label: 'Açıq', Icon: Sun },
    { value: 'dark', label: 'Tünd', Icon: Moon },
  ]
  if (compact) {
    const next = theme === 'dark' ? options[0] : options[1]
    return (
      <button
        type="button"
        onClick={() => choose(next.value)}
        aria-label={`${next.label} mövzuya keç`}
        title={`${next.label} mövzu`}
        className="mx-auto grid size-11 place-items-center rounded-full border border-(--x-side-line) text-(--x-side-ink) hover:bg-(--x-side-2)"
      >
        <next.Icon aria-hidden="true" className="size-4" />
      </button>
    )
  }
  return (
    <div role="group" aria-label="Mövzu" className="grid grid-cols-2 rounded-full border border-(--x-side-line) p-1">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => choose(value)}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors ${
            theme === value ? 'bg-white text-[#10243a]' : 'text-(--x-side-ink) hover:text-white'
          }`}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={2.2} />
          {label}
        </button>
      ))}
    </div>
  )
}

/** The sidebar over the page on a narrow screen: Escape, the backdrop and the close button put it away. */
function MobileMenu({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[1000] xl:hidden">
      <button type="button" aria-label="Menyunu bağla" onClick={onClose} className="absolute inset-0 bg-black/50" tabIndex={-1} />
      <div
        id="exec-menu"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menyu"
        className="x-slide-in absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col overflow-y-auto bg-(--x-side) text-(--x-side-ink) shadow-2xl"
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-4 z-10 grid size-10 place-items-center rounded-lg hover:bg-(--x-side-2)">
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Menyunu bağla</span>
        </button>
        <SidebarBody place="menu" collapsed={false} onNavigate={onClose} />
      </div>
    </div>
  )
}
