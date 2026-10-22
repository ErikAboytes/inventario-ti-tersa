import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campos'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { useCrearMarca } from './datos'
import { marcaDelCatalogo, type EntradaEquipo, type ValoresEquipo } from './esquema'

/**
 * «Marca» del formulario de equipo: se elige del catálogo (lista al escribir). Al salir del campo se corrige
 * a como está en el catálogo («hp» → «HP»); si no existe, se ofrece agregarla ahí mismo.
 */
export function CampoMarca({
  form,
  marcas,
}: {
  form: UseFormReturn<EntradaEquipo, unknown, ValoresEquipo>
  marcas: string[] | undefined
}) {
  const { avisar } = useAvisos()
  const crear = useCrearMarca()
  const [error, setError] = useState<string | null>(null)
  const valor = useWatch({ control: form.control, name: 'marca' }).trim()
  const registro = form.register('marca')
  const nueva = Boolean(marcas && valor && !marcaDelCatalogo(valor, marcas))

  async function agregar() {
    setError(null)
    try {
      const nombre = await crear.mutateAsync(valor)
      form.setValue('marca', nombre, { shouldDirty: true, shouldValidate: true })
      avisar({ tipo: 'exito', texto: `Marca «${nombre}» agregada al catálogo.` })
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <CampoTexto
        etiqueta="Marca"
        required
        list="sugerencias-marca"
        autoComplete="off"
        error={form.formState.errors.marca?.message}
        ayuda="Elige de la lista. Si es una marca nueva, agrégala al catálogo."
        {...registro}
        onBlur={(e) => {
          const canonica = marcas && marcaDelCatalogo(e.target.value, marcas)
          if (canonica && canonica !== e.target.value)
            form.setValue('marca', canonica, { shouldDirty: true, shouldValidate: true })
          return registro.onBlur(e)
        }}
      />
      <datalist id="sugerencias-marca">
        {marcas?.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {nueva ? (
        <div className="flex flex-col items-start gap-1 text-sm">
          <span className="text-texto-secundario">«{valor}» no está en el catálogo de marcas.</span>
          <Button variante="secundario" onClick={agregar} disabled={crear.isPending}>
            <Plus aria-hidden="true" className="size-4" />
            {crear.isPending ? 'Agregando…' : `Agregar «${valor}» como marca nueva`}
          </Button>
          {error ? (
            <span role="alert" className="text-no-localizado">
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
