import { expect, test } from '@playwright/test'
import { conSesion } from './utilidades'

// El Lector consulta y exporta; no ve acciones de escritura ni la administración de usuarios.
conSesion('lector')

test('el Lector no ve «Usuarios» ni puede entrar a pantallas de Administrador', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Principal' })).not.toContainText('Usuarios')
  await expect(page.getByRole('button', { name: /Nueva entrega/ })).toHaveCount(0)

  for (const ruta of ['/admin/usuarios', '/equipos/nuevo', '/asignaciones/nueva']) {
    await page.goto(ruta)
    await expect(
      page.getByRole('heading', { name: 'No tienes permiso para ver esta sección' }),
    ).toBeVisible()
  }
})

test('la ficha de un equipo no ofrece editar ni cambiar estado al Lector', async ({ page }) => {
  await page.goto('/equipos?estado=stock')
  await page.getByRole('table', { name: 'Equipos' }).getByRole('link').first().click()
  await expect(page.getByRole('button', { name: /Imprimir etiqueta/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cambiar estado' })).toHaveCount(0)
})
