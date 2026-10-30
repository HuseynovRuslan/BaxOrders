import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// The executive UX prototype: its own small app on demo data, served beside the product and sharing nothing with its
// routes, API or build. Run from frontend/bax-orders-web: `npx vite --config prototypes/executive/vite.config.ts`.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  // In development the «Excel yüklə» button talks to a local import_service.py on :8099 (scripts/); with
  // IMPORT_DEV=1 the figures come from that service too, as nginx serves them on the server.
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8099', rewrite: (path) => path.replace(/^\/api/, '') },
      ...(process.env.IMPORT_DEV === '1' ? { '/data': 'http://127.0.0.1:8099' } : {}),
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
