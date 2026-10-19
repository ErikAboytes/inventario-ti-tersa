import completo from '@/assets/marca/logo-grupo-tersa.webp'
import sinLema from '@/assets/marca/logo-grupo-tersa-sin-lema.webp'

// «completo» solo en el inicio de sesión; «sin-lema» en la barra superior, donde el lema no se lee (doc 04 §7.1).
const VERSION = {
  completo: { src: completo, width: 500, height: 270 },
  'sin-lema': { src: sinLema, width: 397, height: 190 },
}

type Props = { variante?: keyof typeof VERSION; className?: string }

export function Logo({ variante = 'completo', className }: Props) {
  const { src, width, height } = VERSION[variante]
  return <img src={src} alt="Grupo Tersa" width={width} height={height} className={className} />
}
