/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is set for GitHub Pages project-site hosting (/<repo>/).
// Override with BASE_PATH env at build time if the repo name differs.
const base = process.env.BASE_PATH ?? '/delivery-challan-assistant/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
