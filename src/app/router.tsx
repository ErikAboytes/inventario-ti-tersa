import { createBrowserRouter, Navigate } from 'react-router'
import { RequiereRol, RequiereSesion } from '@/features/auth/Guardas'
import { Login } from '@/features/auth/Login'
import { Recuperar } from '@/features/auth/Recuperar'
import { Restablecer } from '@/features/auth/Restablecer'
import { PaginaCatalogo } from '@/features/catalogos/PaginaCatalogo'
import { FichaColaborador } from '@/features/colaboradores/FichaColaborador'
import { ListaColaboradores } from '@/features/colaboradores/ListaColaboradores'
import { FichaEquipo, RedirigirQr } from '@/features/equipos/FichaEquipo'
import { PaginaFormularioEquipo } from '@/features/equipos/FormularioEquipo'
import { ListaEquipos } from '@/features/equipos/ListaEquipos'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { Inicio } from '@/features/inicio/Inicio'
import { Proximamente } from '@/features/inicio/Proximamente'
import { MuestraDiseno } from '@/features/muestra/MuestraDiseno'
import { AppShell } from './AppShell'
import { MENU } from './navegacion'

const CONSTRUIDAS = new Set(['/', '/equipos', '/colaboradores', '/catalogos'])

// Secciones de etapas futuras: marcador «Próximamente».
const proximas = MENU.filter((m) => !CONSTRUIDAS.has(m.ruta) && !m.soloRol).map((m) => ({
  path: `${m.ruta.slice(1)}/*`,
  element: <Proximamente titulo={m.texto} etapa={m.etapa} />,
}))

// Rutas del doc 04 §5 construidas hasta la Etapa 3.
export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/recuperar', element: <Recuperar /> },
  { path: '/restablecer', element: <Restablecer /> },
  { path: '/muestra', element: <MuestraDiseno /> },
  {
    element: <RequiereSesion />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'equipos', element: <ListaEquipos /> },
          { path: 'equipos/:id', element: <FichaEquipo /> },
          { path: 'e/:id', element: <RedirigirQr /> },
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
              { path: 'admin/usuarios', element: <Proximamente titulo="Usuarios" etapa={8} /> },
            ],
          },
          { path: '*', element: <NoEncontrada dentroDeLaApp /> },
        ],
      },
    ],
  },
])
