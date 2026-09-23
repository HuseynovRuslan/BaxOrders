import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * A deliberately small test setup: it covers the presentation rules that carry business meaning — a
 * percentage that does not exist, money that is only partly known, an object that did not order — and
 * nothing else. The production build does not go through this file.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    /**
     * The suite mounts whole pages against jsdom, and several files do it a dozen times over. Run in parallel
     * on a loaded machine, a render that normally takes a moment can take several seconds, and the default
     * budget turns that into an intermittent failure in whichever file happened to be unlucky. A slow render
     * is not a broken one, so the budget is raised once here rather than guessed at file by file.
     */
    testTimeout: 20_000,
  },
})
