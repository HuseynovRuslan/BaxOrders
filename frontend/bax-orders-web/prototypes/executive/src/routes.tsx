import { Navigate, Outlet, useLocation, type RouteObject } from 'react-router'
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
import { selectYear, YEAR, YEARS } from './data/model'
import { ExecLayout, type FrameHandle } from './exec/ExecLayout'
import { HomePage } from './exec/home/HomePage'
import { ConceptLayout } from './concepts/shared'
import { ConceptCompare } from './concepts/ConceptCompare'
import { ConceptA } from './concepts/ConceptA'
import { ConceptB } from './concepts/ConceptB'
import { ConceptC } from './concepts/ConceptC'

/**
 * The year in the address is the year every screen reads: chosen here, before the frame or any page under it draws.
 * Another year draws them afresh, so nothing worked out for one year is shown for the next. A year with no figures is
 * left to the page to say so.
 */
function YearScope() {
  const asked = Number(useLocation().pathname.split('/')[1])
  if (asked !== YEAR && YEARS.includes(asked)) selectYear(asked)
  return <Outlet key={YEAR} />
}

/**
 * Every screen's address, for the app's router (app.tsx) and for the tests' memory router. A review copy can open on
 * another page (VITE_START=konsept, no slash: a shell may rewrite one); the app opens on the overview.
 */
export function appRoutes(start: string | undefined = import.meta.env.VITE_START): RouteObject[] {
  return [
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
    // The application's frame (Konsept A.3): one sidebar for every screen. The overview and the areas map are drawn in
    // its own page column; the year screens keep their routes, their inner frame (`Shell`) and everything in it, and
    // only gain the sidebar beside them.
    {
      element: <ExecLayout />,
      // While the map's code arrives on a first visit straight to /xerite.
      hydrateFallbackElement: <p style={{ margin: '4rem auto', maxWidth: '20rem', textAlign: 'center', font: '15px system-ui, sans-serif', color: '#5a6a70' }}>Yüklənir…</p>,
      children: [
        ...(start ? [] : [{ index: true, element: <HomePage /> }]),
        // The map brings its own library (Leaflet): loaded when the map is opened, not with every screen.
        { path: 'xerite', lazy: async () => ({ Component: (await import('./exec/map/MapPage')).MapPage }) },
        {
          element: <YearScope />,
          handle: { frame: 'year' } satisfies FrameHandle,
          children: [
            {
              element: <Shell />,
              children: [
                ...(start ? [{ index: true, element: <Navigate to={`/${start}`} replace /> }] : []),
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
          ],
        },
      ],
    },
  ]
}
