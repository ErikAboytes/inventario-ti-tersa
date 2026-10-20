import { describe, expect, it } from 'vitest'
import { cambioSobreSiMismo, mensajeDeFallo, urlDeInvitacion, validarSolicitud } from './reglas'

const ID = '0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b'

describe('admin-usuarios · validación', () => {
  it('normaliza la invitación y exige correo, nombre y rol', () => {
    expect(
      validarSolicitud({
        accion: 'invitar',
        email: '  Ana.Perez@GrupoTersa.com ',
        nombre: ' Ana Pérez ',
        puesto: '',
        rol: 'lector',
      }),
    ).toEqual({
      ok: true,
      solicitud: {
        accion: 'invitar',
        email: 'ana.perez@grupotersa.com',
        nombre: 'Ana Pérez',
        puesto: null,
        rol: 'lector',
      },
    })
    expect(validarSolicitud({ accion: 'invitar', email: 'ana', nombre: 'Ana', rol: 'lector' })).toEqual({
      ok: false,
      error: 'Escribe un correo válido.',
    })
    expect(validarSolicitud({ accion: 'invitar', email: 'a@b.mx', nombre: ' ', rol: 'lector' })).toMatchObject({
      ok: false,
    })
    expect(
      validarSolicitud({ accion: 'invitar', email: 'a@b.mx', nombre: 'Ana', rol: 'superadmin' }),
    ).toEqual({ ok: false, error: 'Elige el rol: Administrador o Lector.' })
  })

  it('las acciones sobre un usuario necesitan su id; las desconocidas se rechazan', () => {
    expect(validarSolicitud({ accion: 'desactivar', id: ID })).toEqual({
      ok: true,
      solicitud: { accion: 'desactivar', id: ID },
    })
    expect(validarSolicitud({ accion: 'reactivar', id: 'x' })).toMatchObject({ ok: false })
    expect(validarSolicitud({ accion: 'cambiar_rol', id: ID, rol: 'admin' })).toMatchObject({
      ok: true,
    })
    expect(validarSolicitud({ accion: 'borrar', id: ID })).toEqual({
      ok: false,
      error: 'Acción no reconocida.',
    })
    expect(validarSolicitud(null)).toMatchObject({ ok: false })
  })
})

describe('admin-usuarios · reglas', () => {
  it('un Administrador no se desactiva ni se quita el rol a sí mismo', () => {
    expect(cambioSobreSiMismo({ accion: 'desactivar', id: ID }, ID)).toMatch(/propia cuenta/)
    expect(cambioSobreSiMismo({ accion: 'cambiar_rol', id: ID, rol: 'lector' }, ID)).toMatch(
      /quitarte el rol/,
    )
    expect(cambioSobreSiMismo({ accion: 'cambiar_rol', id: ID, rol: 'admin' }, ID)).toBeNull()
    expect(cambioSobreSiMismo({ accion: 'desactivar', id: ID }, 'otro')).toBeNull()
  })

  it('el enlace del correo vuelve al sitio desde el que se invitó', () => {
    expect(urlDeInvitacion('https://inventario.netlify.app')).toBe(
      'https://inventario.netlify.app/restablecer?invitacion=1',
    )
    expect(urlDeInvitacion('javascript:alert(1)')).toBeNull()
    expect(urlDeInvitacion(null)).toBeNull()
  })

  it('traduce los errores de Supabase sin mostrar detalles técnicos', () => {
    expect(mensajeDeFallo({ status: 429, message: 'Email rate limit exceeded' })).toMatch(/límite/)
    expect(mensajeDeFallo({ message: 'A user with this email address has already been registered' })).toBe(
      'Ya existe un usuario con ese correo.',
    )
    expect(mensajeDeFallo({ message: 'Debe quedar al menos un Administrador activo.' })).toBe(
      'Debe quedar al menos un Administrador activo.',
    )
    expect(mensajeDeFallo({ message: 'new row violates row-level security policy.' })).toBe(
      'No se pudo completar el cambio. Inténtalo de nuevo.',
    )
  })
})
