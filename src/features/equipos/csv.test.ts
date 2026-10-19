import { describe, expect, it } from 'vitest'
import { celdaCsv, equiposACsv } from './csv'
import type { FilaEquipo } from './datos'

const fila = (cambios: Partial<FilaEquipo>) =>
  ({
    serie: '5CD626170N',
    categoria: 'laptop',
    marca: 'HP',
    modelo: 'ProBook 440 G3',
    estado: 'apartado',
    apartado_para: 'Rossy Insunza',
    condicion: null,
    ...cambios,
  }) as FilaEquipo

describe('CSV del inventario', () => {
  it('empieza con BOM, usa CRLF y traduce estado, categoría y condición', () => {
    const csv = equiposACsv([fila({})])
    expect(csv.startsWith('﻿Serie,Categoría,')).toBe(true)
    const [, linea] = csv.split('\r\n')
    expect(linea).toContain('5CD626170N,Laptop,,HP,ProBook 440 G3')
    expect(linea).toContain('Apartado,Rossy Insunza,,Sin revisar')
  })

  it('exporta las especificaciones después de la descripción', () => {
    const csv = equiposACsv([
      fila({
        descripcion: 'ProBook',
        cpu: 'i5-6200U',
        ram_gb: 8,
        sistema_operativo: 'Windows 10 Pro',
      }),
    ])
    const [encabezado, linea] = csv.split('\r\n')
    expect(encabezado).toContain(
      'Descripción,Procesador,Tarjeta gráfica,Memoria RAM (GB),Almacenamiento,Sistema operativo,',
    )
    expect(linea).toContain('ProBook,i5-6200U,,8,,Windows 10 Pro,')
  })

  it('pone comillas a comas, comillas y saltos, y neutraliza fórmulas', () => {
    expect(celdaCsv('Golpe, rayones')).toBe('"Golpe, rayones"')
    expect(celdaCsv('Pantalla de 24"')).toBe('"Pantalla de 24"""')
    expect(celdaCsv('Línea 1\nLínea 2')).toBe('"Línea 1\nLínea 2"')
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(celdaCsv(null)).toBe('')
  })
})
