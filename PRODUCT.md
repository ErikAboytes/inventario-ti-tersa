# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administrador (área de Sistemas de Grupo Tersa).** Registra y mantiene el inventario: altas, cambios de
  estado, entregas y devoluciones a colaboradores, cartas custodia y etiquetas QR. Trabaja en escritorio en la
  oficina, y con celular en sucursales y almacén para levantar inventario físico escaneando QR.
- **Lector: Contabilidad/finanzas.** Consulta los equipos por empresa (razón social) y contrato, y exporta a CSV.
- **Lector: Dirección.** Consulta el panel con las cifras generales del inventario.

## Product Purpose

Sustituir el inventario en Excel de los equipos de cómputo de Grupo Tersa (desktop, laptop, monitor y otro)
por un sistema que sepa en todo momento dónde está cada equipo, en qué estado y quién lo tiene, con historial
auditable y documentos de custodia firmables.

Éxito:
1. **Retirar el Excel:** el sistema es la única fuente de verdad del inventario.
2. **Bajar los equipos «No localizado»** (503 de 1,449 en el Excel al migrar) mediante inventario físico con QR.

## Positioning

Herramienta interna hecha a la medida de cómo Sistemas de Grupo Tersa ya opera: folios de carta custodia,
formato F.TI-006-02, contratos/operaciones de arrendamiento HP por empresa, y estados propios
(Stock, Asignado, Mantenimiento, Apartado, Desactivado, No localizado, Pendiente). Las reglas de negocio las
garantiza la base de datos, no solo la interfaz.

## Operating Context

- Entrega: se elige colaborador y equipos asignables, se capturan los datos de firma (Entrega/Recibe, editables
  porque quien firma no siempre es el colaborador) y se imprimen juntas la carta custodia y las etiquetas QR en
  hoja carta normal.
- Devolución parcial o total a Stock o Mantenimiento; la carta de devolución se genera solo cuando se requiere.
- El QR de cada equipo abre su ficha (requiere sesión) con la asignación vigente al frente.
- Inventario consultable y ordenable por empresa: TRO, TAU, CRVH, REVOR, ROVAL (razones sociales completas aún
  por capturar).
- Documentación detallada en `docs/01`–`docs/04`; la arquitectura de interfaz está en `docs/04-diseno-ui-ux.md`.

## Capabilities and Constraints

- Stack existente: React + TypeScript (Vite), Tailwind CSS 4, React Router; Supabase (Postgres, Auth, RLS);
  despliegue en Netlify.
- Roles: Administrador (consulta, edita y administra accesos) y Lector (solo consulta y exporta).
- Solo un equipo asignable puede entregarse; «Asignado» y «Desactivado» no son asignables; «Apartado» solo con
  confirmación de que se entrega a la persona del apartado.
- Los equipos nunca se borran; la baja es «Desactivado» con motivo.
- Folios nuevos `CC-AA-NNNN` (custodia) y `CD-AA-NNNN` (devolución); se conservan los SIS históricos.
- Escaneo con cámara solo donde el navegador lo permita; siempre hay búsqueda por texto.
- Interfaz solo en español de México; fechas `dd/mm/aaaa`; zona `America/Tijuana`.
- Datos personales mínimos de colaboradores (LFPDPPP).

## Brand Commitments

- La interfaz y las cartas son de **Grupo Tersa** y usan su logotipo (`docs/assets/marca/`).
- Estilo **minimalista, moderno y empresarial**, basado en el logotipo (azul `#0055A3`, amarillo `#FFF100`),
  según lo pidió el usuario. El detalle vive en `docs/04-diseno-ui-ux.md` §7.

## Evidence on Hand

- Inventario real a migrar: 1,463 equipos (Excel consolidado + equipos fuera de contrato), procesado solo en
  local; no se versiona.
- Carta custodia de ejemplo (formato F.TI-006-02, folio SIS0750).
- Logotipo de Grupo Tersa en PNG/WebP (sin SVG oficial todavía).
- No hay testimonios, métricas de uso ni capturas de producto: no inventarlos.

## Product Principles

1. Lo frecuente a un paso: buscar o escanear un equipo y ver quién lo tiene, desde cualquier pantalla.
2. Prevenir antes que corregir: solo se ofrece lo que las reglas permiten.
3. El estado del equipo siempre visible y en palabras.
4. Lo que se ve es lo que se imprime: cartas y etiquetas con vista previa fiel al formato oficial.
5. Trazabilidad: cada cambio queda en el historial con quién, cuándo y qué cambió.

## Accessibility & Inclusion

WCAG 2.2 AA. No se identificaron necesidades específicas adicionales entre los usuarios.
