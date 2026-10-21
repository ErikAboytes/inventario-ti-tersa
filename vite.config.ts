/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Las pruebas e2e (e2e/*.spec.ts) son de Playwright: npm run e2e.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // Las pruebas de pantalla (jsdom + user-event) rebasan 5 s cuando el equipo está ocupado.
    testTimeout: 15_000,
  },
})
