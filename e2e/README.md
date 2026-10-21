# Pruebas e2e (Playwright)

Flujos críticos del doc 01 §10 en un navegador real (Chromium), en escritorio y en móvil (Pixel 7).

```bash
npm run e2e
```

Por defecto levanta `npm run dev` y prueba `http://localhost:5173`. Para probar un *deploy preview* de Netlify:
`E2E_BASE_URL=https://<preview>.netlify.app npm run e2e`.

## Grupos de pruebas

| Archivo | Necesita | Qué prueba |
|---|---|---|
| `publico.spec.ts` | nada | Ruta protegida → login con regreso · QR sin sesión · login · invitación vencida |
| `admin.spec.ts` | sesión de Administrador | Panel → inventario filtrado · búsqueda por serie y QR · CSV · carta y etiquetas · historial · usuarios |
| `lector.spec.ts` | sesión de Lector | Sin «Usuarios» ni pantallas de Administrador · ficha sin Editar/Cambiar estado |
| `movil.spec.ts` | sesión de Administrador | Menú ☰ con Escape y foco · búsqueda móvil · sin desbordamiento horizontal |
| `flujo-entrega.spec.ts` | sesión de Administrador + permiso para escribir | Alta de equipo → entrega → carta y etiquetas → devolución |

Las pruebas que necesitan una credencial que no está definida se omiten (aparecen como *skipped*).

## Credenciales de prueba

Se leen del entorno y **nunca** se escriben en el repositorio. Usa cuentas de prueba, no las personales:

| Variable | Uso |
|---|---|
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Cuenta de prueba con rol Administrador |
| `E2E_LECTOR_EMAIL`, `E2E_LECTOR_PASSWORD` | Cuenta de prueba con rol Lector |
| `E2E_PERMITIR_CAMBIOS=1` | Habilita `flujo-entrega.spec.ts`, que **escribe** en la BD de desarrollo |
| `E2E_COLABORADOR` | Texto que encuentra a un colaborador activo de prueba con unidad de negocio (p. ej. «Prueba E2E») |

En PowerShell:

```powershell
$env:E2E_ADMIN_EMAIL = '...'; $env:E2E_ADMIN_PASSWORD = '...'; npm run e2e
```

Las sesiones se guardan en `e2e/.sesiones/` (ignorado por git). El reporte HTML queda en `e2e/reporte/`
(`npx playwright show-report e2e/reporte`).

`flujo-entrega.spec.ts` deja un equipo `E2E-<fecha>` en Stock con su entrega y devolución en el historial.
Úsalo solo en desarrollo.
