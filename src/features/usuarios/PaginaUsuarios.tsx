import clsx from 'clsx'
import { Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { useAvisos } from '@/components/ui/avisosContexto'
import { useAuth } from '@/features/auth/contexto'
import { fechaHora } from '@/features/equipos/historial'
import { mensajeDeError } from '@/lib/errores'
import { useTitulo } from '@/lib/useTitulo'
import { ETIQUETA_ROL, situacion, useAdministrarUsuario, useUsuarios, type Usuario } from './datos'
import { DialogoUsuario } from './DialogoUsuario'

const ESTADO = {
  activo: { texto: 'Activo', tono: 'positivo' },
  pendiente: { texto: 'Invitación pendiente', tono: 'aviso' },
  inactivo: { texto: 'Desactivado', tono: 'apagado' },
} as const

// En tableta se ocultan Puesto y Último acceso para que las acciones quepan sin desplazar la tabla.
const COLUMNAS: [string, string?][] = [
  ['Usuario'],
  ['Puesto', 'hidden xl:table-cell'],
  ['Rol'],
  ['Estado'],
  ['Último acceso', 'hidden lg:table-cell'],
  ['Acciones'],
]

type Dialogo =
  | { tipo: 'invitar' }
  | { tipo: 'rol'; usuario: Usuario }
  | { tipo: 'desactivar' | 'reactivar'; usuario: Usuario }
  | null

/** P-60: usuarios y roles (solo Administrador). Las altas son por invitación: no hay registro público. */
export function PaginaUsuarios() {
  useTitulo('Usuarios')
  const { perfil } = useAuth()
  const { avisar } = useAvisos()
  const lista = useUsuarios()
  const administrar = useAdministrarUsuario()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const usuarios = lista.data ?? []
  const activos = usuarios.filter((u) => u.activo)

  async function reenviar(u: Usuario) {
    try {
      await administrar.mutateAsync({ accion: 'reenviar', id: u.id })
      avisar({ tipo: 'exito', texto: `Se reenvió la invitación a ${u.email}.` })
    } catch (e) {
      avisar({ tipo: 'error', texto: e instanceof Error ? e.message : mensajeDeError(e) })
    }
  }

  async function cambiarAcceso(tipo: 'desactivar' | 'reactivar', u: Usuario) {
    try {
      const r = await administrar.mutateAsync({ accion: tipo, id: u.id })
      const nombre = u.nombre || u.email
      avisar({
        tipo: 'exito',
        texto:
          r?.aviso ??
          (tipo === 'desactivar'
            ? `${nombre} ya no tiene acceso.`
            : `${nombre} vuelve a tener acceso.`),
      })
      setDialogo(null)
    } catch (e) {
      avisar({ tipo: 'error', texto: e instanceof Error ? e.message : mensajeDeError(e) })
    }
  }

  const acciones = (u: Usuario) => {
    const propio = u.id === perfil?.id
    const s = situacion(u)
    return (
      <div className="flex flex-wrap gap-2">
        {s !== 'inactivo' ? (
          <Button variante="secundario" onClick={() => setDialogo({ tipo: 'rol', usuario: u })}>
            Cambiar rol
          </Button>
        ) : null}
        {s === 'pendiente' ? (
          <Button
            variante="secundario"
            onClick={() => reenviar(u)}
            disabled={administrar.isPending}
          >
            Reenviar invitación
          </Button>
        ) : null}
        {s === 'inactivo' ? (
          <Button
            variante="secundario"
            onClick={() => setDialogo({ tipo: 'reactivar', usuario: u })}
          >
            Reactivar
          </Button>
        ) : !propio ? (
          <Button
            variante="fantasma"
            onClick={() => setDialogo({ tipo: 'desactivar', usuario: u })}
          >
            Desactivar
          </Button>
        ) : null}
      </div>
    )
  }

  const nombre = (u: Usuario) => (
    <span className="flex flex-col">
      <span className="font-medium">
        {u.nombre || u.email}
        {u.id === perfil?.id ? (
          <span className="font-normal text-texto-secundario"> (tú)</span>
        ) : null}
      </span>
      {/* Sin nombre capturado, el correo ya va arriba: no se repite. */}
      {u.nombre ? <span className="text-sm break-all text-texto-secundario">{u.email}</span> : null}
    </span>
  )
  const acceso = (u: Usuario) =>
    u.ultimo_acceso
      ? fechaHora(u.ultimo_acceso)
      : situacion(u) === 'pendiente'
        ? 'Aún no entra'
        : 'Nunca'

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion={
          lista.data
            ? `${activos.length} con acceso · ${usuarios.length - activos.length} desactivados`
            : 'Quién puede entrar al inventario y con qué rol.'
        }
        acciones={
          <Button onClick={() => setDialogo({ tipo: 'invitar' })}>
            <Plus aria-hidden="true" className="size-4" /> Invitar usuario
          </Button>
        }
      />

      {lista.error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-tarjeta border border-borde bg-superficie p-6"
        >
          <p className="font-medium">No se pudo cargar la lista.</p>
          <p className="text-sm text-texto-secundario">{mensajeDeError(lista.error)}</p>
          <Button variante="secundario" onClick={() => lista.refetch()}>
            <RotateCw aria-hidden="true" className="size-4" /> Reintentar
          </Button>
        </div>
      ) : lista.isPending ? (
        <p role="status" className="text-texto-secundario">
          Cargando usuarios…
        </p>
      ) : (
        <>
          {/* Escritorio y tableta */}
          <div className="hidden overflow-x-auto rounded-tarjeta border border-borde bg-superficie md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Usuarios</caption>
              <thead className="border-b border-borde text-texto-secundario">
                <tr>
                  {COLUMNAS.map(([c, clase]) => (
                    <th
                      key={c}
                      scope="col"
                      className={clsx('px-4 py-2 font-medium whitespace-nowrap', clase)}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-borde align-middle last:border-0">
                    <td className="px-4 py-3">{nombre(u)}</td>
                    <td className={clsx('px-4 py-3', COLUMNAS[1][1])}>{u.puesto || '—'}</td>
                    <td className="px-4 py-3">{ETIQUETA_ROL[u.rol]}</td>
                    <td className="px-4 py-3">
                      <Etiqueta
                        texto={ESTADO[situacion(u)].texto}
                        tono={ESTADO[situacion(u)].tono}
                      />
                    </td>
                    <td className={clsx('px-4 py-3 whitespace-nowrap', COLUMNAS[4][1])}>
                      {acceso(u)}
                    </td>
                    <td className="px-4 py-3">{acciones(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <ul className="flex flex-col gap-2 md:hidden" aria-label="Usuarios">
            {usuarios.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4"
              >
                {nombre(u)}
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Etiqueta texto={ESTADO[situacion(u)].texto} tono={ESTADO[situacion(u)].tono} />
                  <span>{ETIQUETA_ROL[u.rol]}</span>
                  {u.puesto ? <span className="text-texto-secundario">· {u.puesto}</span> : null}
                </p>
                <p className="text-sm text-texto-secundario">Último acceso: {acceso(u)}</p>
                {acciones(u)}
              </li>
            ))}
          </ul>
        </>
      )}

      {dialogo?.tipo === 'invitar' ? <DialogoUsuario alCerrar={() => setDialogo(null)} /> : null}
      {dialogo?.tipo === 'rol' ? (
        <DialogoUsuario usuario={dialogo.usuario} alCerrar={() => setDialogo(null)} />
      ) : null}
      {dialogo?.tipo === 'desactivar' || dialogo?.tipo === 'reactivar' ? (
        <Confirmacion
          abierto
          alCambiar={(a) => !a && setDialogo(null)}
          titulo={
            dialogo.tipo === 'desactivar'
              ? `¿Desactivar a ${dialogo.usuario.nombre || dialogo.usuario.email}?`
              : `¿Reactivar a ${dialogo.usuario.nombre || dialogo.usuario.email}?`
          }
          textoConfirmar={dialogo.tipo === 'desactivar' ? 'Desactivar' : 'Reactivar'}
          peligro={dialogo.tipo === 'desactivar'}
          alConfirmar={() =>
            cambiarAcceso(dialogo.tipo as 'desactivar' | 'reactivar', dialogo.usuario)
          }
        >
          {dialogo.tipo === 'desactivar'
            ? 'Pierde el acceso en su siguiente acción y no podrá volver a iniciar sesión hasta que lo reactives. Lo que registró se conserva en el historial.'
            : `Podrá volver a entrar con su contraseña, con el rol de ${ETIQUETA_ROL[dialogo.usuario.rol]}.`}
        </Confirmacion>
      ) : null}
    </div>
  )
}
