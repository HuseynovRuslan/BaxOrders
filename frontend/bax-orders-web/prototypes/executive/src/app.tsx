import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createHashRouter, Navigate, RouterProvider } from 'react-router'
import './styles.css'
import { Shell } from './ui/Shell'
import { YearPage } from './pages/YearPage'
import { MonthPage } from './pages/MonthPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { ProductsPage } from './pages/ProductsPage'
import { CategoryPage } from './pages/CategoryPage'
import { SitePage } from './pages/SitePage'
import { ProductPage } from './pages/ProductPage'
import { OrderPage } from './pages/OrderPage'
import { NotFound } from './pages/NotFound'
import { YEAR } from './data/model'
import { applyStoredTheme } from './ui/theme'
import { ConceptLayout } from './concepts/shared'
import { ConceptCompare } from './concepts/ConceptCompare'
import { ConceptA } from './concepts/ConceptA'
import { ConceptB } from './concepts/ConceptB'
import { ConceptC } from './concepts/ConceptC'

applyStoredTheme()

// A shared copy (a claude.ai Artifact) is one static page: its levels live after the # there. Locally, real paths.
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

const router = createRouter([
  // Three concepts for the year screen, for review; outside the app's own frame, each draws its own.
  {
    path: 'konsept',
    element: <ConceptLayout />,
    children: [
      { index: true, element: <ConceptCompare /> },
      { path: 'a', element: <ConceptA /> },
      { path: 'b', element: <ConceptB /> },
      { path: 'c', element: <ConceptC /> },
    ],
  },
  {
    element: <Shell />,
    children: [
      // A review copy can open on another page (VITE_START=konsept, no slash: a shell may rewrite one); the app opens on the year.
      { index: true, element: <Navigate to={`/${import.meta.env.VITE_START || YEAR}`} replace /> },
      { path: ':year', element: <YearPage /> },
      { path: ':year/analiz', element: <AnalysisPage /> },
      { path: ':year/mallar', element: <ProductsPage /> },
      { path: ':year/:month', element: <MonthPage /> },
      { path: ':year/:month/kateqoriya/:categoryId', element: <CategoryPage /> },
      { path: ':year/:month/mehsul/:productId', element: <ProductPage /> },
      { path: ':year/:month/obyekt/:siteId', element: <SitePage /> },
      { path: ':year/:month/obyekt/:siteId/kateqoriya/:categoryId', element: <CategoryPage /> },
      { path: ':year/:month/obyekt/:siteId/mehsul/:productId', element: <ProductPage /> },
      { path: ':year/:month/obyekt/:siteId/sifaris', element: <OrderPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
