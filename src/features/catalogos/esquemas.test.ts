import { describe, expect, it } from 'vitest'
import { esquemaColaborador } from '@/features/colaboradores/esquema'
import { catalogoPorRuta } from './configuracion'

const esquema = (ruta: string) => catalogoPorRuta(ruta)!.esquema

describe('esquema de empresas', () => {
  it('pasa la clave y el RFC a mayúsculas', () => {
    const r = esquema('empresas').parse({
      clave: ' tro ',
      razon_social: 'Tersa',
      rfc: 'abc010101ab1',
      activa: true,
    })
    expect(r).toMatchObject({ clave: 'TRO', rfc: 'ABC010101AB1' })
  })

  it('rechaza RFC inválido y campos vacíos', () => {
    const r = esquema('empresas').safeParse({
      clave: '',
      razon_social: '',
      rfc: 'XYZ',
      activa: true,
    })
    expect(r.success).toBe(false)
    const campos = r.error!.issues.map((i) => i.path[0])
    expect(campos).toEqual(expect.arrayContaining(['clave', 'razon_social', 'rfc']))
  })
})

describe('esquema de contratos', () => {
  it('exige empresa y normaliza la operación', () => {
    const base = {
      operacion: 'tersa001',
      empresa_id: '',
      numero_contrato: '',
      fecha_vencimiento: '',
      estatus: '',
      descripcion: '',
      notas: '',
    }
    expect(esquema('contratos').safeParse(base).success).toBe(false)
    expect(esquema('contratos').parse({ ...base, empresa_id: 'x' })).toMatchObject({
      operacion: 'TERSA001',
    })
  })
})

describe('esquema de ubicaciones', () => {
  it('solo admite los tipos del diseño', () => {
    const base = { nombre: 'Tersa Tecate', ciudad: '', estado_republica: '', activa: true }
    expect(esquema('ubicaciones').safeParse({ ...base, tipo: 'sucursal' }).success).toBe(true)
    expect(esquema('ubicaciones').safeParse({ ...base, tipo: 'bodega' }).success).toBe(false)
  })
})

describe('esquema de colaborador', () => {
  const base = {
    nombre_completo: 'José Carlos López Medina',
    numero_empleado: '',
    puesto: '',
    area: '',
    unidad_negocio_id: '',
    empresa_id: '',
    ubicacion_id: '',
    email: '',
    telefono: '',
    tipo: 'persona' as const,
  }

  it('acepta un colaborador mínimo', () => {
    expect(esquemaColaborador.safeParse(base).success).toBe(true)
  })

  it('valida nombre y correo', () => {
    const r = esquemaColaborador.safeParse({ ...base, nombre_completo: 'J', email: 'no-es-correo' })
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(['nombre_completo', 'email'])
  })
})
