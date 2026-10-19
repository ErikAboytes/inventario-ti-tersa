import { createBrowserRouter } from 'react-router'
import { Inicio } from '@/features/inicio/Inicio'
import { MuestraDiseno } from '@/features/muestra/MuestraDiseno'
import { NoEncontrada } from '@/features/errores/NoEncontrada'

// Rutas de la Etapa 0. El shell con menú y las rutas protegidas llegan en la Etapa 1 (doc 04 §5).
export const router = createBrowserRouter([
  { path: '/', element: <Inicio /> },
  { path: '/muestra', element: <MuestraDiseno /> },
  { path: '*', element: <NoEncontrada /> },
])
