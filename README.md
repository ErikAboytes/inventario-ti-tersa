# Inventario de equipos de TI — Grupo Tersa

Sistema web para controlar los equipos de cómputo de Grupo Tersa (desktop, laptop, monitor y otro):
inventario, asignaciones, devoluciones, cartas custodia, etiquetas QR e historial.

**Stack:** React + TypeScript (Vite) · Tailwind CSS 4 · React Router · Supabase (Postgres, Auth, RLS) · Netlify.

## Documentación

| Documento | Contenido |
|---|---|
| [01 — Diseño del sistema](docs/01-diseno-del-sistema.md) | Arquitectura, modelo de datos, reglas de negocio, seguridad |
| [02 — Plan de desarrollo](docs/02-plan-de-desarrollo.md) | Etapas, criterios de aceptación, forma de trabajo |
| [03 — Análisis y migración del Excel](docs/03-analisis-y-migracion-de-datos.md) | Calidad de datos y mapeos |
| [04 — Diseño UI/UX](docs/04-diseno-ui-ux.md) | Pantallas, flujos, identidad visual, accesibilidad |

## Requisitos

- Node.js 24 y npm 11
- (Opcional) Supabase CLI 2.x para migraciones

## Arranque local

```bash
npm install
```

```bash
cp .env.example .env.local
```

Llena `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env.local` con la clave pública del proyecto Supabase «Tersa»
(dev). Nunca pongas la clave `service_role` en el frontend.

```bash
npm run dev
```

La app abre en `http://localhost:5173`. La muestra de diseño está en `/muestra`.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Revisa tipos y genera `dist/` |
| `npm run lint` | oxlint |
| `npm test` | Pruebas (Vitest) |
| `npm run format` | Formatea `src/` con Prettier |
| `npm run check` | Formato + lint + tipos + pruebas (lo que debe pasar antes de abrir un PR) |

## Forma de trabajo

- `main` solo recibe cambios por **PR**. Cada cambio va en su propia rama (`etapa-N-nombre`, `fix/...`,
  `docs/...`); **el merge lo aprueba y lo hace el responsable del proyecto**.
- El esquema de la base de datos cambia solo con migraciones en `supabase/migrations/`.
- Los Excel fuente y cualquier CSV derivado **no se suben** al repositorio (datos personales).

## Despliegue

Netlify compila con `npm run build` y publica `dist/` (ver `netlify.toml`). Las rutas de la SPA se resuelven
con `public/_redirects`, así que recargar cualquier ruta funciona.

## Skills de diseño

En `.claude/skills/` están Impeccable, UI UX Pro Max y motion-design (ver `ORIGEN.txt` de cada uno y el
plan, §Herramientas de diseño).
