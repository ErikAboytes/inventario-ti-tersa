import { expect, test as setup } from '@playwright/test'
import { archivoSesion, credenciales, type Rol } from './utilidades'

// Inicia sesión por la pantalla de login (como lo haría una persona) y guarda el estado del navegador.
for (const rol of ['admin', 'lector'] as Rol[]) {
  setup(`sesión de ${rol}`, async ({ page }) => {
    const c = credenciales(rol)
    setup.skip(!c, `Sin credenciales de ${rol}`)
    await page.goto('/login')
    await page.getByLabel('Correo').fill(c!.email)
    await page.getByLabel('Contraseña').fill(c!.password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Panel', level: 1 })).toBeVisible()
    await page.context().storageState({ path: archivoSesion(rol) })
  })
}
