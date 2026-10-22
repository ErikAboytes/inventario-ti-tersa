import { expect, test, type Page } from '@playwright/test'
import { conSesion } from './utilidades'

// Procesos largos: después de «Continuar», de un error o de cambiar de página, lo nuevo queda a la vista.
// El borrador es de prueba y no se registra nada.
conSesion('admin')

const hoy = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })

async function conBorrador(page: Page, recibe = 'Colaborador de prueba') {
  await page.addInitScript(
    ({ fecha, recibe }) => {
      if (sessionStorage.getItem('tersa:entrega-borrador')) return
      sessionStorage.setItem(
        'tersa:entrega-borrador',
        JSON.stringify({
          colaborador: {
            id: 'e2e',
            nombre_completo: 'Colaborador de prueba',
            puesto: 'Asesor',
            numero_empleado: null,
            unidad_negocio_id: 'u',
            unidad: { nombre: 'Llantas' },
            ubicacion: null,
          },
          unidadNegocioId: '',
          equipos: [
            {
              id: 'e',
              serie: 'E2E-PRB',
              categoria: 'laptop',
              marca: 'HP',
              modelo: 'X',
              estado: 'stock',
            },
          ],
          apartadosConfirmados: [],
          fecha,
          fechaCarta: '',
          firmas: {
            lugar: 'Tijuana BC',
            entrega_nombre: 'Admin',
            entrega_puesto: '',
            recibe_nombre: recibe,
            recibe_puesto: '',
          },
          observaciones: '',
        }),
      )
    },
    { fecha: hoy(), recibe },
  )
}

const alFondo = (page: Page) => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

test('al continuar, el paso siguiente se ve desde su título', async ({ page }) => {
  await conBorrador(page)
  await page.goto('/asignaciones/nueva?paso=2')
  await expect(page.getByRole('list', { name: 'Disponibles para entregar' })).toBeVisible()
  await alFondo(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: '3. Datos de carta' })).toBeInViewport()
})

test('con datos faltantes, el aviso se ve aunque el botón esté al pie', async ({ page }) => {
  await conBorrador(page, '')
  await page.goto('/asignaciones/nueva?paso=3')
  await alFondo(page)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('alert')).toContainText('Escribe quién recibe')
  await expect(page.getByRole('alert')).toBeInViewport()
})

test('en el teléfono «Continuar» está a la vista sin bajar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo en el proyecto móvil')
  await conBorrador(page)
  await page.goto('/asignaciones/nueva?paso=2')
  await expect(page.getByRole('list', { name: 'Disponibles para entregar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeInViewport()
})

test('al cambiar de página, la tabla se ve desde el inicio', async ({ page }) => {
  await page.goto('/equipos')
  await expect(page.getByText(/^\d[\d,]* equipos$/)).toBeVisible()
  await alFondo(page)
  await page.getByRole('button', { name: 'Página siguiente' }).click()
  await expect(page).toHaveURL(/pagina=2/)
  const inicio = page.getByText(/^26–50 de/)
  await expect(inicio).toBeVisible()
  // El inicio de la tabla (o de las tarjetas en el teléfono) queda dentro de la ventana.
  const primera = page.locator('main a[href^="/equipos/"]').filter({ visible: true }).first()
  await expect(primera).toBeInViewport()
})
