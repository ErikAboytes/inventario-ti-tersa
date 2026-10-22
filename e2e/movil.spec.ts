import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { conSesion } from './utilidades'

// Navegación móvil (doc 04 §4, D-06): el menú se abre con ☰, Escape lo cierra y el foco regresa al botón.
conSesion('admin')

test('el menú móvil se abre, se cierra con Escape y devuelve el foco', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Solo en el proyecto móvil')
  await page.goto('/')
  const abrir = page.getByRole('button', { name: 'Abrir menú' })
  await abrir.click()
  const menu = page.getByRole('dialog', { name: 'Menú' })
  await expect(menu.getByRole('link', { name: 'Inventario' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(abrir).toBeFocused()
})

test('en móvil la lupa abre la búsqueda y las cifras quedan a la vista', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Solo en el proyecto móvil')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Cifras clave' })).toBeInViewport()
  await page.getByRole('link', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/\/buscar$/)
  // Sin desbordamiento horizontal.
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})

test('en móvil los filtros ocupan una línea y se abren en un panel accesible', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Solo en el proyecto móvil')
  await page.goto('/equipos')
  const barra = page.locator('main [role=search]')
  expect((await barra.boundingBox())!.height).toBeLessThanOrEqual(120)

  await page.getByRole('button', { name: /^Filtros/ }).click()
  const panel = page.getByRole('dialog', { name: 'Filtros' })
  // El filtro vive en la URL (transición de React Router): se espera a que la casilla refleje el cambio.
  const stock = panel.getByRole('checkbox', { name: 'Stock' })
  await stock.click()
  await expect(stock).toBeChecked()
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(r.violations.map((v) => v.id)).toEqual([])
  await panel.getByRole('button', { name: /^Ver .* resultados?$/ }).click()
  await expect(panel).toBeHidden()
  await expect(page).toHaveURL(/estado=stock/)
  await expect(page.getByRole('button', { name: 'Quitar filtro Estado: Stock' })).toBeVisible()
})
