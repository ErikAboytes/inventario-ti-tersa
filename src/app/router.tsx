import { createBrowserRouter, Navigate } from 'react-router'
import { AsistenteEntrega } from '@/features/asignaciones/AsistenteEntrega'
import { DetalleAsignacion } from '@/features/asignaciones/DetalleAsignacion'
import { DetalleDevolucion } from '@/features/asignaciones/DetalleDevolucion'
import { ImprimirAsignacion } from '@/features/asignaciones/ImprimirAsignacion'
import { ListaAsignaciones } from '@/features/asignaciones/ListaAsignaciones'
import { PaginaRegistrarDevolucion } from '@/features/asignaciones/RegistrarDevolucion'
import { RequiereRol, RequiereSesion } from '@/features/auth/Guardas'
import { Login } from '@/features/auth/Login'
import { Recuperar } from '@/features/auth/Recuperar'
import { Restablecer } from '@/features/auth/Restablecer'
import { PaginaCatalogo } from '@/features/catalogos/PaginaCatalogo'
import { PaginaBusqueda } from '@/features/busqueda/PaginaBusqueda'
import { FichaColaborador } from '@/features/colaboradores/FichaColaborador'
import { ListaColaboradores } from '@/features/colaboradores/ListaColaboradores'
import { DocumentosAsignacion } from '@/features/documentos/DocumentosAsignacion'
import { EtiquetasLote } from '@/features/documentos/EtiquetasLote'
import { PaginaCartaDevolucion } from '@/features/documentos/PaginaCartaDevolucion'
import { FichaEquipo, RedirigirQr } from '@/features/equipos/FichaEquipo'
import { PaginaFormularioEquipo } from '@/features/equipos/FormularioEquipo'
import { ListaEquipos } from '@/features/equipos/ListaEquipos'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { Proximamente } from '@/features/inicio/Proximamente'
import { PaginaHistorial } from '@/features/historial/PaginaHistorial'
import { MuestraDiseno } from '@/features/muestra/MuestraDiseno'
import { Panel } from '@/features/panel/Panel'
import { PaginaUsuarios } from '@/features/usuarios/PaginaUsuarios'
import { AppShell } from './AppShell'
import { MENU } from './navegacion'

const CONSTRUIDAS = new Set([
  '/',
  '/equipos',
  '/asignaciones',
  '/historial',
  '/colaboradores',
  '/catalogos',
])

// Secciones de etapas futuras: marcador «Próximamente».
const proximas = MENU.filter((m) => !CONSTRUIDAS.has(m.ruta) && !m.soloRol).map((m) => ({
  path: `${m.ruta.slice(1)}/*`,
  element: <Proximamente titulo={m.texto} etapa={m.etapa} />,
}))

// Rutas del doc 04 §5 construidas hasta la Etapa 8.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar', element: <Recuperar /> },
  { path: '/restablecer', element: <Restablecer /> },
  { path: '/muestra', element: <MuestraDiseno /> },
  {
    element: <RequiereSesion />,
    children: [
      // Documentos imprimibles, sin la estructura de la app (P-23, P-24, carta de devolución, P-70).
      { path: 'asignaciones/:id/imprimir', element: <ImprimirAsignacion /> },
      { path: 'asignaciones/:id/documentos', element: <DocumentosAsignacion /> },
      { path: 'devoluciones/:id/carta', element: <PaginaCartaDevolucion /> },
      { path: 'etiquetas', element: <EtiquetasLote /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Panel /> },
          { path: 'equipos', element: <ListaEquipos /> },
          { path: 'equipos/:id', element: <FichaEquipo /> },
          { path: 'e/:id', element: <RedirigirQr /> },
          { path: 'asignaciones', element: <ListaAsignaciones /> },
          { path: 'asignaciones/:id', element: <DetalleAsignacion /> },
          { path: 'devoluciones/:id', element: <DetalleDevolucion /> },
          { path: 'buscar', element: <PaginaBusqueda /> },
          { path: 'historial', element: <PaginaHistorial /> },
          { path: 'colaboradores', element: <ListaColaboradores /> },
          { path: 'colaboradores/:id', element: <FichaColaborador /> },
          { path: 'catalogos', element: <Navigate to="/catalogos/empresas" replace /> },
          { path: 'catalogos/:catalogo', element: <PaginaCatalogo /> },
          ...proximas,
          {
            element: <RequiereRol rol="admin" />,
            children: [
              { path: 'equipos/nuevo', element: <PaginaFormularioEquipo /> },
              { path: 'equipos/:id/editar', element: <PaginaFormularioEquipo /> },
              { path: 'asignaciones/nueva', element: <AsistenteEntrega /> },
              { path: 'asignaciones/:id/devolucion', element: <PaginaRegistrarDevolucion /> },
              { path: 'admin/usuarios', element: <PaginaUsuarios /> },
            ],
          },
          { path: '*', element: <NoEncontrada dentroDeLaApp /> },
        ],
      },
    ],
  },
])
