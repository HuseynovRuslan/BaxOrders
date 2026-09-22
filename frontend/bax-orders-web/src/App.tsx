import { Route, Routes } from 'react-router'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ImportsPage } from './pages/ImportsPage'
import { LocationAnalyticsPage } from './pages/LocationAnalyticsPage'
import { LocationDetailPage } from './pages/LocationDetailPage'
import { LocationsPage } from './pages/LocationsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SuppliersPage } from './pages/SuppliersPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/:orderRequestId" element={<OrderDetailPage />} />
        <Route path="imports" element={<ImportsPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="locations/:locationId" element={<LocationDetailPage />} />
        <Route path="locations/:locationId/analytics" element={<LocationAnalyticsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
