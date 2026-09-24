import { Navigate, Route, Routes } from 'react-router'
import { RequireAuth, RequirePermission } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { ApprovalInboxPage } from './pages/ApprovalInboxPage'
import { ImportsPage } from './pages/ImportsPage'
import { LocationAnalyticsPage } from './pages/LocationAnalyticsPage'
import { LocationDetailPage } from './pages/LocationDetailPage'
import { LocationsPage } from './pages/LocationsPage'
import { LoginPage } from './pages/LoginPage'
import { ManagementDashboardPage } from './pages/ManagementDashboardPage'
import { MonthlyReportPage } from './pages/MonthlyReportPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { ProductCategoriesPage } from './pages/ProductCategoriesPage'
import { PricingModeReviewPage } from './pages/PricingModeReviewPage'
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

          {/* The year in one place: the panel answers "this month", this answers "the year so far". */}
          <Route path="dashboard/monthly" element={<MonthlyReportPage />} />

          {/* A coordinator's own submissions are not theirs to decide, so this queue is not offered to them. An
              administrator sees it, and is told on every row that the decision is the Rəhbər's. */}
          <Route element={<RequirePermission permission="canViewApprovals" />}>
            <Route path="approvals" element={<ApprovalInboxPage />} />
          </Route>

          {/* Orders are browsed from the object they belong to; the old standalone page never had one to open. */}
          <Route path="orders" element={<Navigate to="/locations" replace />} />
          <Route path="orders/:orderRequestId" element={<OrderDetailPage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="locations/:locationId" element={<LocationDetailPage />} />
          <Route path="locations/:locationId/analytics" element={<LocationAnalyticsPage />} />
          <Route path="products" element={<ProductsPage />} />
          {/* Everybody signed in may look; only the catalogue policy may change what it says. */}
          <Route path="products/categories" element={<ProductCategoriesPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          {/* A manager reads the queue — how much of the missing money is a real gap is the context behind
              every price warning — and the server refuses their attempt to decide on it. */}
          <Route path="pricing-modes" element={<PricingModeReviewPage />} />

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
