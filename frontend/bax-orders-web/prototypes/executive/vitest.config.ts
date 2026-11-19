import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * The executive prototype's own tests: the figures the overview and the map stand on (aligned periods, approval, zero
 * and missing months, area figures, clustering) and the routes around the year screens. Run from frontend/bax-orders-web:
 * `npx vitest run --config prototypes/executive/vitest.config.ts`. The product's suite (vitest.config.ts) is separate.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 20_000,
  },
})
