import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { conSesion, credenciales } from './utilidades'

// Revisión automática WCAG 2.2 AA con axe-core (doc 04 §10). No sustituye la prueba con teclado y lector
// de pantalla, pero detecta contraste, nombres accesibles, roles y estructura.

async function revisar(page: Page, ruta: string) {
  await page.goto(ruta)
  // Espera a que la pantalla termine de cargar sus datos.
  await expect(page.getByText(/Cargando|Calculando/)).toHaveCount(0, { timeout: 15_000 })
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  const resumen = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} · ${v.help}`)
  expect(resumen, `Violaciones de accesibilidad en ${ruta}`).toEqual([])
}

test.describe('sin sesión', () => {
  for (const ruta of ['/login', '/recuperar', '/restablecer?invitacion=1']) {
    test(`${ruta} cumple WCAG 2.2 AA`, async ({ page }) => revisar(page, ruta))
  }
})

test.describe('Administrador', () => {
  test.skip(!credenciales('admin'), 'Sin credenciales de Administrador')
  conSesion('admin')
  for (const ruta of [
    '/',
    '/equipos',
    '/asignaciones',
    '/asignaciones/nueva',
    '/historial',
    '/colaboradores',
    '/catalogos/empresas',
    '/buscar?q=hp',
    '/admin/usuarios',
  ]) {
    test(`${ruta} cumple WCAG 2.2 AA`, async ({ page }) => revisar(page, ruta))
  }
})
