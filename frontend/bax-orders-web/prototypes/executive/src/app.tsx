import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router'
import './styles.css'
import { applyStoredTheme } from './ui/theme'
import { appRoutes } from './routes'

applyStoredTheme()

// A shared copy (a claude.ai Artifact) is one static page: its levels live after the # there. Locally, real paths.
const createRouter = import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

const router = createRouter(appRoutes())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
