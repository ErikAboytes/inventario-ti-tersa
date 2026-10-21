import { expect, test } from '@playwright/test'
import { conSesion, permiteCambios } from './utilidades'

/**
 * Flujo completo que escribe en la BD (doc 01 §10): alta de equipo → entrega → carta y etiquetas →
 * devolución a Stock. Solo corre con E2E_PERMITIR_CAMBIOS=1 y E2E_COLABORADOR (texto que encuentre a un
 * colaborador activo de prueba). Deja un equipo «E2E-…» en Stock y su historial: es la evidencia del flujo.
 */
conSesion('admin')
test.skip(
  !permiteCambios || !process.env.E2E_COLABORADOR,
  'Define E2E_PERMITIR_CAMBIOS=1 y E2E_COLABORADOR para correr el flujo que escribe datos.',
)

test('alta, entrega con documentos y devolución de un equipo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'El flujo completo se prueba en escritorio')
  const serie = `E2E-${Date.now()}`

  // Alta
  await page.goto('/equipos/nuevo')
  await page.getByRole('radio', { name: 'Monitor' }).check()
  await page.getByLabel('Número de serie').fill(serie)
  await page.getByLabel('Marca').fill('HP')
  await page.getByLabel('Modelo').fill('Prueba E2E')
  await page.getByRole('button', { name: 'Registrar equipo' }).click()
  await expect(page.getByText(serie).first()).toBeVisible()

  // Entrega desde la ficha
  await page.getByRole('button', { name: 'Entregar' }).click()
  await page.getByLabel('Buscar colaborador').fill(process.env.E2E_COLABORADOR!)
  await page.getByRole('list', { name: 'Colaboradores encontrados' }).getByRole('button').first().click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  // El equipo llega precargado desde la ficha.
  await expect(page.getByText(serie).first()).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Registrar entrega' }).click()

  // Documentos
  await expect(page.getByRole('status')).toContainText(/Entrega CC-\d{2}-\d{4} registrada/)
  await expect(page.getByRole('article', { name: /Carta custodia CC-/ })).toContainText(serie)
  await expect(page.getByRole('region', { name: /Hoja de etiquetas/ })).toContainText(serie)

  // Devolución
  await page.getByRole('link', { name: 'Volver a la entrega' }).click()
  await page.getByRole('button', { name: 'Registrar devolución' }).click()
  await page.getByLabel(new RegExp(serie)).check()
  await page.getByRole('button', { name: 'Registrar devolución' }).click()
  await page
    .getByRole('dialog', { name: '¿Registrar la devolución?' })
    .getByRole('button', { name: 'Registrar devolución' })
    .click()
  await expect(page).toHaveURL(/\/devoluciones\//)
  await expect(page.getByText(serie).first()).toBeVisible()
})
