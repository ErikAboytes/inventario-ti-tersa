import { expect, test } from '@playwright/test'
import { conSesion } from './utilidades'

// Flujos de consulta del Administrador: no escriben datos.
conSesion('admin')

test('cada cifra del panel abre el inventario con el filtro equivalente', async ({ page }) => {
  await page.goto('/')
  const cifras = page.getByRole('region', { name: 'Cifras clave' })
  await expect(cifras).toBeVisible()
  await cifras.getByRole('link', { name: /Asignados/ }).click()
  await expect(page).toHaveURL(/\/equipos\?estado=asignado$/)
  await expect(page.getByText(/equipos? con estos filtros/)).toBeVisible()
})

test('una serie exacta en la barra superior abre la ficha y el QR lleva a la misma ficha', async ({
  page,
}) => {
  await page.goto('/equipos?estado=stock')
  const primero = page.getByRole('table', { name: 'Equipos' }).getByRole('link').first()
  const serie = (await primero.innerText()).trim()
  const ruta = await primero.getAttribute('href')

  await page.goto('/')
  await page.getByRole('searchbox', { name: /Buscar/ }).fill(serie)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`${ruta}$`))
  await expect(page.getByText(serie).first()).toBeVisible()

  await page.goto(ruta!.replace('/equipos/', '/e/'))
  await expect(page).toHaveURL(new RegExp(`${ruta}$`))
})

test('la exportación CSV descarga el resultado filtrado', async ({ page }) => {
  await page.goto('/equipos?estado=apartado')
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^inventario-\d{4}-\d{2}-\d{2}\.csv$/)
})

test('una entrega abre su carta custodia y sus etiquetas', async ({ page }) => {
  await page.goto('/asignaciones?estado=activa')
  await page.getByRole('table').getByRole('link').first().click()
  await page.getByRole('button', { name: 'Carta y etiquetas' }).click()
  await expect(page.getByRole('heading', { name: /Documentos de la entrega/ })).toBeVisible()
  await expect(page.getByRole('article', { name: /Carta custodia/ })).toBeVisible()
  await expect(page.getByRole('region', { name: /Hoja de etiquetas 1/ })).toBeVisible()
})

test('el historial filtra por tipo desde la URL y la lista de usuarios carga', async ({ page }) => {
  await page.goto('/historial?tipo=importacion')
  await expect(page.getByRole('heading', { name: 'Historial', level: 1 })).toBeVisible()
  await expect(page.getByText(/movimientos? con estos filtros/)).toBeVisible()

  await page.goto('/admin/usuarios')
  await expect(page.getByRole('heading', { name: 'Usuarios', level: 1 })).toBeVisible()
  await expect(page.getByText('(tú)').first()).toBeVisible()
})
