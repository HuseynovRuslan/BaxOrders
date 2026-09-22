import {
  ClipboardList,
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
}

export const navItems: NavItem[] = [
  { to: '/', label: 'İdarə paneli', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Sifarişlər', icon: ClipboardList },
  { to: '/imports', label: 'Excel importları', icon: FileSpreadsheet },
  { to: '/locations', label: 'Obyektlər', icon: MapPin },
  { to: '/products', label: 'Məhsullar', icon: Package },
  { to: '/suppliers', label: 'Təchizatçılar', icon: Truck },
]
