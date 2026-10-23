import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// The executive UX prototype: its own small app on demo data, served beside the product and sharing nothing with its
// routes, API or build. Run from frontend/bax-orders-web: `npx vite --config prototypes/executive/vite.config.ts`.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  server: { port: 5179, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
