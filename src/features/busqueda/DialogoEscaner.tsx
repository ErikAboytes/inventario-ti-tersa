import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { iniciarLector, tipoDeFallo, type FalloEscaner } from '@/lib/escaner'

type Estado = 'iniciando' | 'escaneando' | FalloEscaner

const MENSAJE: Record<FalloEscaner, { titulo: string; texto: string }> = {
  'sin-soporte': {
    titulo: 'Tu navegador no permite escanear.',
    texto: 'Escribe la serie o el folio en el campo de abajo.',
  },
  permiso: {
    titulo: 'No hay permiso para usar la cámara.',
    texto:
      'Toca el candado o el ícono de la cámara junto a la dirección del sitio, permite la cámara y vuelve a abrir el escáner. Mientras tanto, escribe la serie o el folio.',
  },
  'sin-camara': {
    titulo: 'No se encontró una cámara disponible.',
    texto:
      'Revisa que ninguna otra aplicación la esté usando, o escribe la serie o el folio en el campo de abajo.',
  },
  error: {
    titulo: 'No se pudo iniciar la cámara.',
    texto: 'Cierra el escáner e inténtalo de nuevo, o escribe la serie o el folio.',
  },
}

/**
 * D-03: escáner de QR con cámara. Al leer un código cierra, apaga la cámara y entrega el texto. La cámara se
 * apaga siempre al cerrar (Escape incluido) porque el lector vive dentro del diálogo y se detiene al desmontar.
 */
export function DialogoEscaner({
  abierto,
  alCerrar,
  alLeer,
  ayuda = 'Apunta al código QR de la etiqueta del equipo.',
}: {
  abierto: boolean
  alCerrar: () => void
  alLeer: (texto: string) => void
  ayuda?: string
}) {
  return (
    <Dialogo
      abierto={abierto}
      alCambiar={(a) => !a && alCerrar()}
      titulo="Escanear QR"
      descripcion={ayuda}
      ancho="sm"
    >
      {abierto ? (
        <Escaner
          alLeer={(t) => {
            alCerrar()
            alLeer(t)
          }}
        />
      ) : null}
    </Dialogo>
  )
}

function Escaner({ alLeer }: { alLeer: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<Estado>('iniciando')
  const [texto, setTexto] = useState('')
  const alLeerActual = useRef(alLeer)
  useEffect(() => {
    alLeerActual.current = alLeer
  })

  useEffect(() => {
    let cancelado = false
    let detener: (() => void) | null = null
    let leido = false
    iniciarLector(video.current!, (valor) => {
      if (leido || cancelado) return
      leido = true
      detener?.()
      alLeerActual.current(valor)
    })
      .then((lector) => {
        // Si el diálogo se cerró mientras la cámara arrancaba, se apaga de inmediato.
        if (cancelado || leido) lector.detener()
        else {
          detener = lector.detener
          setEstado('escaneando')
        }
      })
      .catch((e) => {
        if (!cancelado) setEstado(tipoDeFallo(e))
      })
    return () => {
      cancelado = true
      detener?.()
    }
  }, [])

  const fallo = estado !== 'iniciando' && estado !== 'escaneando' ? MENSAJE[estado] : null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          fallo ? 'hidden' : 'relative aspect-square overflow-hidden rounded-control bg-tinta'
        }
      >
        <video ref={video} muted playsInline className="size-full object-cover" />
        {/* Recuadro guía */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[18%] rounded-control border-2 border-marca-amarillo"
        />
        <p
          role="status"
          className="absolute inset-x-0 bottom-0 bg-tinta/70 px-3 py-2 text-center text-sm text-white"
        >
          {estado === 'iniciando' ? 'Encendiendo la cámara…' : 'Apunta al código QR'}
        </p>
      </div>

      {fallo ? (
        <div role="alert" className="flex flex-col gap-1">
          <p className="font-medium">{fallo.titulo}</p>
          <p className="text-sm text-texto-secundario">{fallo.texto}</p>
        </div>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (texto.trim()) alLeer(texto.trim())
        }}
      >
        <div className="flex-1">
          <CampoTexto
            etiqueta="Serie o folio"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
            mono
            // En el celular el teclado taparía la cámara: el foco inicial no va a este campo.
            data-sin-autofoco
          />
        </div>
        <Button type="submit" variante="secundario" disabled={!texto.trim()}>
          Buscar
        </Button>
      </form>
    </div>
  )
}
