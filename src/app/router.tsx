import { createBrowserRouter } from 'react-router'
import { RequiereRol, RequiereSesion } from '@/features/auth/Guardas'
import { Login } from '@/features/auth/Login'
import { Recuperar } from '@/features/auth/Recuperar'
import { Restablecer } from '@/features/auth/Restablecer'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { Inicio } from '@/features/inicio/Inicio'
import { Proximamente } from '@/features/inicio/Proximamente'
import { MuestraDiseno } from '@/features/muestra/MuestraDiseno'
import { AppShell } from './AppShell'
import { MENU } from './navegacion'

const proximas = MENU.filter((m) => m.ruta !== '/' && !m.soloRol).map((m) => ({
  path: `${m.ruta.slice(1)}/*`,
  element: <Proximamente titulo={m.texto} etapa={m.etapa} />,
}))

// Rutas de la Etapa 1 (doc 04 §5). Las secciones aún no construidas muestran «Próximamente».
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
          ...proximas,
          {
            element: <RequiereRol rol="admin" />,
            children: [
              { path: 'admin/usuarios', element: <Proximamente titulo="Usuarios" etapa={8} /> },
            ],
          },
          { path: '*', element: <NoEncontrada dentroDeLaApp /> },
        ],
      },
    ],
  },
])
