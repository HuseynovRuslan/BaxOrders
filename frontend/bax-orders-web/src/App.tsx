import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth, RequirePermission } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { ImportsPage } from './pages/ImportsPage'
import { LocationAnalyticsPage } from './pages/LocationAnalyticsPage'
import { LocationDetailPage } from './pages/LocationDetailPage'
import { LocationsPage } from './pages/LocationsPage'
import { LoginPage } from './pages/LoginPage'
import { ManagementDashboardPage } from './pages/ManagementDashboardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SuppliersPage } from './pages/SuppliersPage'

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      {/* Everything below needs a signed-in person. The endpoints behind these screens check again. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* The old root was a placeholder; the management dashboard is the landing screen now. */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ManagementDashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderRequestId" element={<OrderDetailPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="locations/:locationId" element={<LocationDetailPage />} />
          <Route path="locations/:locationId/analytics" element={<LocationAnalyticsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />

          {/* The import screens change data, so a manager does not get them. */}
          <Route element={<RequirePermission permission="canManageImports" />}>
            <Route path="imports" element={<ImportsPage />} />
          </Route>

          <Route element={<RequirePermission permission="canManageUsers" />}>
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
