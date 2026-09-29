import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// The sidebar prints the build's own version, so it is read from the manifest rather than typed into a
// component, where it would drift from the truth the moment the package is bumped.
import { version } from './package.json'

// The dev server proxies API calls to the ASP.NET Core backend, so the browser
// talks to a single origin and the API needs no CORS configuration.
//
// Which backend depends on the mode. `npm run dev` is the ordinary one. `npm run dev:sandbox` (mode "sandbox")
// is Task 4's test environment: its API runs beside the ordinary one on its own port, against its own database,
// so both can be open at once without one ever standing in for the other.
const servers: Record<string, { port: number; apiTarget: string; strictPort: boolean }> = {
  sandbox: { port: 5174, apiTarget: 'http://localhost:5081', strictPort: true },
}

const ordinary = { port: 5173, apiTarget: 'http://localhost:5080', strictPort: false }

export default defineConfig(({ mode }) => {
  const { port, apiTarget, strictPort } = servers[mode] ?? ordinary

  return {
    plugins: [react(), tailwindcss()],
    define: { __APP_VERSION__: JSON.stringify(version) },
    server: {
      port,
      strictPort,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
