import {
  CheckCheck,
  CalendarRange,
  CircleDollarSign,
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
  requires?: 'canManageImports' | 'canManageUsers' | 'canViewApprovals'
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'İdarəetmə paneli', icon: LayoutDashboard, end: true },
  { to: '/dashboard/monthly', label: 'Aylıq hesabat', icon: CalendarRange },
  // Seeing the queue is wider than deciding on it: an administrator keeps it, read-only.
  { to: '/approvals', label: 'Təsdiq gözləyənlər', icon: CheckCheck, requires: 'canViewApprovals' },
  // Orders are browsed from the object they belong to; "Obyektlər" below is that entry point, so there is
  // no separate "Sifarişlər" item competing with it for the same page.
  { to: '/imports', label: 'Excel importları', icon: FileSpreadsheet, requires: 'canManageImports' },
  { to: '/locations', label: 'Obyektlər', icon: MapPin },
  { to: '/products', label: 'Məhsullar', icon: Package },
  { to: '/suppliers', label: 'Təchizatçılar', icon: Truck },
  { to: '/pricing-modes', label: 'Qiymət təsnifatı', icon: CircleDollarSign },
  { to: '/admin/users', label: 'İstifadəçilər', icon: Users, requires: 'canManageUsers' },
]
