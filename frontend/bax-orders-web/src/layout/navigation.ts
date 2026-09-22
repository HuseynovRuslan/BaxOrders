import {
  ClipboardList,
  Users,
  FileSpreadsheet,
  LayoutDashboard,
  MapPin,
  Package,
  Truck,
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
  requires?: 'canManageImports' | 'canManageUsers'
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'İdarəetmə paneli', icon: LayoutDashboard },
  { to: '/orders', label: 'Sifarişlər', icon: ClipboardList },
  { to: '/imports', label: 'Excel importları', icon: FileSpreadsheet, requires: 'canManageImports' },
  { to: '/locations', label: 'Obyektlər', icon: MapPin },
  { to: '/products', label: 'Məhsullar', icon: Package },
  { to: '/suppliers', label: 'Təchizatçılar', icon: Truck },
  { to: '/admin/users', label: 'İstifadəçilər', icon: Users, requires: 'canManageUsers' },
]
