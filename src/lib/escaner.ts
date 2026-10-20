/**
 * Lectura de QR (y códigos de barras de serie) con la cámara (doc 01 §7.5, doc 04 D-03).
 * Usa BarcodeDetector cuando el navegador lo trae (Chrome en Android, Edge) y @zxing/browser como respaldo
 * (Safari, Firefox); zxing se carga solo al abrir el escáner para no pesar en el resto de la app.
 */

export type FalloEscaner = 'sin-soporte' | 'permiso' | 'sin-camara' | 'error'

export class ErrorEscaner extends Error {
  readonly tipo: FalloEscaner
  constructor(tipo: FalloEscaner) {
    super(tipo)
    this.tipo = tipo
  }
}

export type Lector = { detener: () => void }

// BarcodeDetector aún no está en lib.dom de TypeScript.
type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type ClaseDetector = {
  new (o: { formats: string[] }): Detector
  getSupportedFormats: () => Promise<string[]>
}

const FORMATOS = ['qr_code', 'code_128', 'code_39', 'data_matrix']
const CAMARA: MediaStreamConstraints = {
  video: { facingMode: { ideal: 'environment' } },
  audio: false,
}

/** ¿Vale la pena ofrecer el botón? La cámara solo existe en contexto seguro (https o localhost). */
export function hayCamara(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

export function tipoDeFallo(e: unknown): FalloEscaner {
  if (e instanceof ErrorEscaner) return e.tipo
  const nombre = (e as { name?: string } | null)?.name
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'permiso'
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'sin-camara'
  if (nombre === 'NotReadableError') return 'sin-camara'
  return 'error'
}

/** Enciende la cámara en `video` y llama `alLeer` con cada código leído hasta que se llame `detener`. */
export async function iniciarLector(
  video: HTMLVideoElement,
  alLeer: (texto: string) => void,
): Promise<Lector> {
  if (!hayCamara()) throw new ErrorEscaner('sin-soporte')

  const Nativo = (window as unknown as { BarcodeDetector?: ClaseDetector }).BarcodeDetector
  const formatos = Nativo
    ? (await Nativo.getSupportedFormats().catch(() => [])).filter((f) => FORMATOS.includes(f))
    : []

  if (Nativo && formatos.includes('qr_code')) {
    const flujo = await navigator.mediaDevices.getUserMedia(CAMARA)
    video.srcObject = flujo
    video.setAttribute('playsinline', 'true')
    await video.play().catch(() => {})
    const detector = new Nativo({ formats: formatos })
    let activo = true
    const ciclo = async () => {
      if (!activo) return
      try {
        if (video.readyState >= 2) {
          const [codigo] = await detector.detect(video)
          if (codigo?.rawValue && activo) alLeer(codigo.rawValue)
        }
      } catch {
        // Un cuadro ilegible no es un error: se intenta con el siguiente.
      }
      if (activo) setTimeout(ciclo, 200)
    }
    void ciclo()
    return {
      detener: () => {
        activo = false
        flujo.getTracks().forEach((t) => t.stop())
        video.srcObject = null
      },
    }
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const lector = new BrowserMultiFormatReader()
  const controles = await lector.decodeFromConstraints(CAMARA, video, (resultado) => {
    if (resultado) alLeer(resultado.getText())
  })
  return { detener: () => controles.stop() }
}
