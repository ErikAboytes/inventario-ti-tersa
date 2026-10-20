import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library'
import { describe, expect, it } from 'vitest'
import { trazoQr, urlQrEquipo } from '@/lib/qr'
import { idsDeParametro, POR_HOJA, repartirEnHojas } from './impresion'
import { fechaCarta, nombreArchivo } from './textos'

/** Lee el QR que dibuja trazoQr con el mismo decodificador que usa el escáner de respaldo. */
function leerQr(texto: string): string {
  const { d, lado } = trazoQr(texto)
  const escala = 4
  const ancho = lado * escala
  const pixeles = new Uint8ClampedArray(ancho * ancho).fill(255)
  for (const [, x, y] of d.matchAll(/M(\d+) (\d+)/g)) {
    for (let dy = 0; dy < escala; dy++)
      for (let dx = 0; dx < escala; dx++)
        pixeles[(Number(y) * escala + dy) * ancho + Number(x) * escala + dx] = 0
  }
  const fuente = new RGBLuminanceSource(pixeles, ancho, ancho)
  return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(fuente))).getText()
}

describe('QR de las etiquetas', () => {
  it('codifica la URL /e/<id> y se puede leer de vuelta', () => {
    const url = urlQrEquipo('0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b', 'https://inventario.test')
    expect(url).toBe('https://inventario.test/e/0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b')
    expect(leerQr(url)).toBe(url)
  })
})

describe('hoja de etiquetas', () => {
  it('reparte en hojas de 24 y respeta la posición inicial', () => {
    const equipos = Array.from({ length: 30 }, (_, i) => i)
    const hojas = repartirEnHojas(equipos)
    expect(hojas.map((h) => h.length)).toEqual([POR_HOJA, 6])

    const desde5 = repartirEnHojas(equipos, 5)
    expect(desde5[0].slice(0, 5)).toEqual([null, null, null, null, 0])
    expect(desde5.flat().filter((x) => x !== null)).toHaveLength(30)
    // Fuera de rango se ajusta a 1–24.
    expect(repartirEnHojas([1], 99)[0]).toHaveLength(POR_HOJA)
    expect(repartirEnHojas([1], -3)[0]).toEqual([1])
  })

  it('solo acepta UUID en ?ids=', () => {
    expect(idsDeParametro('0E8F4A2B-1C3D-4E5F-8A9B-0C1D2E3F4A5B, basura,,1;drop')).toEqual([
      '0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
    ])
    expect(idsDeParametro(null)).toEqual([])
  })
})

describe('textos de la carta', () => {
  it('fecha en el formato de la carta vigente', () => {
    expect(fechaCarta('2026-07-09')).toBe('09 de 07 del 2026')
    expect(fechaCarta(null)).toBe('___ de ___ del ____')
  })

  it('nombre del PDF sin acentos ni caracteres inválidos, con «+N» si hay varios equipos', () => {
    expect(
      nombreArchivo('Carta Custodia', 'CC-26-0001', ['5CD626170N'], 'José Carlos López Medina'),
    ).toBe('F.TI-006-02 Carta Custodia CC-26-0001 5CD626170N Jose Carlos Lopez Medina')
    expect(nombreArchivo('Carta Devolucion', 'CD-26-0003', ['A1', 'B2', 'C3'], 'Ana / Peña')).toBe(
      'Carta Devolucion CD-26-0003 A1 +2 Ana Pena',
    )
  })
})
