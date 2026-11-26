// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAlCambiar, useConteo, useDireccion, useRecienLlegados } from './movimiento'

function simularMovimiento(reducir: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: reducir && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useConteo', () => {
  it('sin matchMedia (jsdom) o con «reducir movimiento» muestra el valor final al instante', () => {
    const { result, rerender } = renderHook(({ v }) => useConteo(v), { initialProps: { v: 547 } })
    expect(result.current).toBe(547)
    rerender({ v: 550 })
    expect(result.current).toBe(550)

    simularMovimiento(true)
    const reducido = renderHook(() => useConteo(1399))
    expect(reducido.result.current).toBe(1399)
  })

  it('cuenta desde 0 y, al cambiar, del valor anterior al nuevo', () => {
    simularMovimiento(false)
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const { result, rerender } = renderHook(({ v }) => useConteo(v), { initialProps: { v: 500 } })
    expect(result.current).toBe(0)

    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(500)

    act(() => vi.advanceTimersByTime(600))
    expect(result.current).toBe(500)

    rerender({ v: 498 })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBeGreaterThanOrEqual(498)
    expect(result.current).toBeLessThanOrEqual(500)
    act(() => vi.advanceTimersByTime(700))
    expect(result.current).toBe(498)
  })
})

describe('useRecienLlegados', () => {
  it('lo de la primera carga no es nuevo; al actualizar, solo lo que no se había visto', () => {
    const { result, rerender } = renderHook(({ ids }) => useRecienLlegados(ids), {
      initialProps: { ids: [3, 2, 1] },
    })
    expect([...result.current]).toEqual([])
    rerender({ ids: [5, 4, 3, 2] })
    expect([...result.current]).toEqual([5, 4])
    rerender({ ids: [5, 4, 3, 2] })
    expect([...result.current]).toEqual([5, 4])
    rerender({ ids: [6, 5, 4, 3] })
    expect([...result.current]).toEqual([6])
  })
})

describe('useDireccion', () => {
  it('null al montar; adelante o atrás según el último cambio', () => {
    const { result, rerender } = renderHook(({ v }) => useDireccion(v), { initialProps: { v: 1 } })
    expect(result.current).toBeNull()
    rerender({ v: 2 })
    expect(result.current).toBe('adelante')
    rerender({ v: 2 })
    expect(result.current).toBe('adelante')
    rerender({ v: 1 })
    expect(result.current).toBe('atras')
  })
})

describe('useAlCambiar', () => {
  it('no cuenta el primer render ni los renders sin cambio; sí cada cambio', () => {
    const { result, rerender } = renderHook(({ v }) => useAlCambiar(v), {
      initialProps: { v: 'stock' },
    })
    expect(result.current).toBe(0)
    rerender({ v: 'stock' })
    expect(result.current).toBe(0)
    rerender({ v: 'mantenimiento' })
    expect(result.current).toBe(1)
    rerender({ v: 'stock' })
    expect(result.current).toBe(2)
  })

  it('la llegada del primer valor no cuenta y otro contexto vuelve a cero', () => {
    const { result, rerender } = renderHook(({ v, id }) => useAlCambiar(v, id), {
      initialProps: { v: undefined as string | undefined, id: undefined as string | undefined },
    })
    rerender({ v: 'stock', id: 'a' })
    expect(result.current).toBe(0)
    rerender({ v: 'mantenimiento', id: 'a' })
    expect(result.current).toBe(1)
    rerender({ v: 'asignado', id: 'b' })
    expect(result.current).toBe(0)
  })
})
