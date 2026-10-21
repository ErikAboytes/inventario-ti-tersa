import { expect, test } from '@playwright/test'

// Sin sesión: no necesitan credenciales y no tocan datos.

test('una ruta protegida manda al login y recuerda a dónde regresar', async ({ page }) => {
  await page.goto('/equipos?estado=stock')
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fequipos%3Festado%3Dstock$/)
  await expect(page.getByRole('heading', { name: 'Inventario de equipos de TI' })).toBeVisible()
})

test('un QR escaneado sin sesión pide iniciar sesión para ver el equipo', async ({ page }) => {
  await page.goto('/e/0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b')
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fe%2F0e8f4a2b/)
  await expect(page.getByText('Inicia sesión para ver el equipo.')).toBeVisible()
})

test('el login enfoca el correo y ofrece recuperar la contraseña', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Correo')).toBeFocused()
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
  await expect(page).toHaveURL(/\/recuperar$/)
})

test('un enlace de invitación vencido explica qué hacer', async ({ page }) => {
  await page.goto('/restablecer?invitacion=1')
  await expect(page.getByText(/La invitación expiró o ya se usó/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a iniciar sesión' })).toBeVisible()
})
