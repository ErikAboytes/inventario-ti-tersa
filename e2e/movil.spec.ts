import { expect, test } from '@playwright/test'
import { conSesion } from './utilidades'

// Navegación móvil (doc 04 §4, D-06): el menú se abre con ☰, Escape lo cierra y el foco regresa al botón.
conSesion('admin')

test('el menú móvil se abre, se cierra con Escape y devuelve el foco', async ({ page, isMobile }) => {
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

test('en móvil la lupa abre la búsqueda y las cifras quedan a la vista', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo en el proyecto móvil')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Cifras clave' })).toBeInViewport()
  await page.getByRole('link', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/\/buscar$/)
  // Sin desbordamiento horizontal.
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})
