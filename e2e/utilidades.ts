import { test } from '@playwright/test'

export type Rol = 'admin' | 'lector'

/** Credenciales de prueba por rol. Vienen del entorno; nunca se escriben en el repositorio. */
export function credenciales(rol: Rol) {
  const prefijo = rol === 'admin' ? 'E2E_ADMIN' : 'E2E_LECTOR'
  const email = process.env[`${prefijo}_EMAIL`]
  const password = process.env[`${prefijo}_PASSWORD`]
  return email && password ? { email, password } : null
}

export const archivoSesion = (rol: Rol) => `e2e/.sesiones/${rol}.json`

/** Usa la sesión guardada del rol, o salta el archivo si no hay credenciales para él. */
export function conSesion(rol: Rol) {
  test.skip(!credenciales(rol), `Define E2E_${rol.toUpperCase()}_EMAIL y _PASSWORD para correr estas pruebas.`)
  test.use({ storageState: archivoSesion(rol) })
}

/** Las pruebas que escriben datos solo corren con permiso explícito (crean registros en la BD de desarrollo). */
export const permiteCambios = process.env.E2E_PERMITIR_CAMBIOS === '1'
