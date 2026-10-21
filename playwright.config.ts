import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas e2e (docs/02 Etapa 9). Por defecto levantan `npm run dev` y prueban localhost; con E2E_BASE_URL
 * prueban un deploy preview de Netlify. Las que necesitan sesión leen las credenciales de prueba de
 * variables de entorno (ver e2e/README.md) y se omiten si no están definidas.
 */
const base = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/reporte' }]],
  outputDir: 'e2e/resultados',
  use: {
    baseURL: base,
    locale: 'es-MX',
    timezoneId: 'America/Tijuana',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Inicia sesión una vez por rol y guarda el estado para las demás pruebas.
    { name: 'sesiones', testMatch: /sesiones\.setup\.ts/ },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } },
      dependencies: ['sesiones'],
    },
    {
      name: 'movil',
      use: { ...devices['Pixel 7'] },
      dependencies: ['sesiones'],
      testMatch: /movil\.spec\.ts|publico\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run dev', url: base, reuseExistingServer: true, timeout: 60_000 },
})
