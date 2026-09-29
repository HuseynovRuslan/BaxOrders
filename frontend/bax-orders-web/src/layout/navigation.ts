import {
  Building2,
  ChartBar,
  Clock,
  Database,
  LayoutGrid,
  Package,
  Tag,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  /**
   * The permission a signed-in person needs before this is offered. Hiding an entry is a courtesy — the
   * endpoints behind it refuse anybody who is not allowed, whether they saw the link or not.
   */
  requires?: 'canManageImports' | 'canManageUsers' | 'canViewApprovals' | 'canManageCatalog'
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'İdarəetmə paneli', icon: LayoutGrid, end: true },
  { to: '/dashboard/monthly', label: 'Aylıq hesabat', icon: ChartBar },
  // Seeing the queue is wider than deciding on it: an administrator keeps it, read-only.
  { to: '/approvals', label: 'Təsdiq gözləyənlər', icon: Clock, requires: 'canViewApprovals' },
  // Orders are browsed from the object they belong to; "Obyektlər" below is that entry point, so there is
  // no separate "Sifarişlər" item competing with it for the same page.
  { to: '/imports', label: 'Excel importları', icon: Database, requires: 'canManageImports' },
  { to: '/locations', label: 'Obyektlər', icon: Building2 },
  // The catalogue's working screens are offered to the people who shape the catalogue. A Rəhbər reads the
  // suppliers, and reaches Qiymət təsnifatı from an order's price warning instead of the menu (14.1).
  { to: '/products', label: 'Məhsullar', icon: Package, requires: 'canManageCatalog' },
  { to: '/suppliers', label: 'Təchizatçılar', icon: Truck },
  { to: '/pricing-modes', label: 'Qiymət təsnifatı', icon: Tag, requires: 'canManageCatalog' },
  { to: '/admin/users', label: 'İstifadəçilər', icon: Users, requires: 'canManageUsers' },
]
