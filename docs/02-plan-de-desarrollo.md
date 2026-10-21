# Plan de desarrollo por etapas

> Estado: **borrador v0.2** (2026-10-19). Base: [01 — Diseño del sistema](01-diseno-del-sistema.md),
> [03 — Análisis y migración](03-analisis-y-migracion-de-datos.md) y [04 — Diseño UI/UX](04-diseno-ui-ux.md).
> Las pantallas se citan por su identificador del doc 04 (P-xx pantallas, D-xx diálogos).

## Forma de trabajo

- Cada etapa es **una rama y un PR** (`etapa-N-nombre`) que se despliega en un *deploy preview* de Netlify.
- **Regla del repositorio:** después del primer commit en `main`, todo cambio (etapas, correcciones,
  documentos) va en una rama nueva con su PR. **El merge solo lo aprueba y lo hace el usuario**; nunca hay push
  directo a `main` ni auto-merge.
- Una etapa se cierra cuando cumple sus **criterios de aceptación** y la validas en el preview. Hasta entonces
  no empieza la siguiente (salvo las marcadas como paralelas).
- El esquema de base de datos se cambia solo con **migraciones SQL versionadas**; nunca editando a mano en el
  panel de Supabase.
- Hasta la salida a producción (Etapa 9), `main` se despliega contra el proyecto Supabase **dev**.
- La interfaz se construye según el doc 04. **Al cerrar cada etapa con interfaz** se pasa una revisión de
  diseño con los skills de **Impeccable** (auditoría, crítica y pulido; ver §Herramientas de diseño) y se
  corrige lo que salga antes de pedir tu validación.
- Los documentos de `docs/` se actualizan cuando una etapa cambie una decisión.

**Definición de terminado (todas las etapas):** compila sin errores ni advertencias de lint; pruebas de la
etapa en verde; funciona en móvil y escritorio; accesible con teclado; los permisos se probaron con un
usuario Lector; revisión de diseño hecha (si hubo interfaz); documentación actualizada.

Tamaños relativos: **S** pequeño · **M** mediano · **L** grande.

## Herramientas de diseño

| Herramienta | Uso en el proyecto |
|---|---|
| **Impeccable** v4.6.0 (Apache-2.0). **Instalado** el 2026-10-19 en `.claude/skills/impeccable` | Revisión y dirección de diseño. En la Etapa 0, `/impeccable init` crea `PRODUCT.md` con el contexto del producto; cuando haya código, `/impeccable document` crea `DESIGN.md`. Al cerrar cada etapa con interfaz se corren `audit` (accesibilidad, rendimiento, adaptable), `critique` (jerarquía y claridad) y `polish` (pase final); según el caso, también `harden` (errores y casos límite), `clarify` (textos), `adapt` (móvil) o `typeset`/`layout`. La app es de modo **Operate** (herramienta de trabajo): precisión y sobriedad antes que efectos. Se instaló **sin sus hooks automáticos**, que correrían su detector después de cada edición; se pueden activar después con `/impeccable hooks on` |
| **UI UX Pro Max** (MIT). **Instalado** el 2026-10-19 en `.claude/skills/ui-ux-pro-max` | Como consulta, no como dirección: sus reglas para React + Tailwind + shadcn/ui, sus guías de UX y su guía de tipos de gráfica. **No** se usa su generador de sistemas de diseño, porque la identidad ya la define la marca |
| **motion-design-skill** de LottieFiles (MIT). **Instalado** el 2026-10-19 en `.claude/skills/motion-design` | Criterios de movimiento sobrios: duraciones y curvas, retroalimentación de estados (cargando → éxito/error al registrar una entrega) y «reducir movimiento». Solo microinteracciones, en línea con el doc 04 §7.4 |
| Skill **dataviz** (ya disponible) | Gráficas y tarjetas de cifras del panel (Etapa 7) |
| **Figma** (conector disponible, opcional) | Prototipo navegable de P-10, P-12, P-21 y P-23 en la fase UX-0, si quieres probar el flujo antes de construirlo |

Si dos skills se contradicen, manda el doc 04: la marca y las decisiones que tomaste.

## Mapa de etapas

```mermaid
flowchart LR
  E0[0 · Cimientos + UX-0] --> E1[1 · BD, seguridad y shell]
  E1 --> E2[2 · Catálogos y colaboradores]
  E2 --> E3[3 · Inventario]
  E3 --> E4[4 · Migración del Excel]
  E4 --> E5[5 · Entregas y devoluciones]
  E5 --> E6[6 · Cartas, etiquetas, QR y búsqueda]
  E6 --> E7[7 · Panel e historial]
  E1 --> E8[8 · Administración de accesos]
  E7 --> E9[9 · Producción]
  E8 --> E9
  E1 -. script y mapeos en paralelo .-> E4
```

La Etapa 8 puede hacerse en cualquier momento tras la 1. El script de migración y la revisión de mapeos
(Etapa 4) pueden avanzar en paralelo a las Etapas 2–3; la **carga** sí requiere que el inventario exista.

---

## Etapa 0 — Cimientos del proyecto y validación de UX · S

**Objetivo:** repositorio, herramientas y despliegue funcionando de punta a punta, y el diseño de interfaz
validado, antes de escribir lógica.

Proyecto:
- Repositorio git + GitHub (cuenta `ErikAboytes`, ya conectada); `.gitignore` que excluye `*.xlsx`, `*.pdf`
  de cartas reales, `.env*` y `scripts/migracion/salida/`.
- Proyecto Vite + React + TypeScript; ESLint, Prettier, Tailwind, alias de rutas, estructura de carpetas (§9 del diseño).
- Supabase CLI inicializado y enlazado al proyecto **«Tersa»** como entorno **dev** (ya existe). Producción se
  crea en la Etapa 9.
- Sitio Netlify conectado a GitHub: `netlify.toml`, `public/_redirects`, variables de entorno, deploy previews.
  **Hecho (2026-10-19):** sitio **`tersa-it-dev`** (`https://tersa-it-dev.netlify.app`), creado por el usuario y
  conectado al repositorio. Despliega `main` y genera deploy previews de los PRs, con las variables
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SECRETS_SCAN_OMIT_KEYS`. Los sitios
  `inventarios-web` e `inventarios-dev` (intento anterior) e `inventario-ti-tersa` (creado y sin usar) no se tocan.
- README: cómo instalar, correr y desplegar.

Diseño (fase UX-0 del doc 04):
- **Impeccable** ya está instalado. Se corre `/impeccable init` para que genere `PRODUCT.md` a partir de los
  docs 01 y 04. La primera vez descarga su motor (≈ 19 MB desde las releases oficiales, verificado con
  SHA-256); te aviso antes de ejecutarlo.
- Validar contigo el doc 04 (navegación, pantallas, flujos, bocetos).
- Identidad visual de **Grupo Tersa** (doc 04 §7: minimalista, moderna y empresarial; paleta medida del
  logotipo y con contraste verificado) convertida en tokens de Tailwind; página de muestra con botones,
  badges de estado, campos y barra superior.
- Opcional: prototipo en Figma del flujo de entrega.

**Aceptación:** `npm run build` limpio · la URL de Netlify abre · recargar `/cualquier/ruta` no da 404 ·
un PR genera su deploy preview · doc 04 aprobado · tokens con contraste AA.

**Necesito de ti:**
- Confirmar con quien administre los formatos si la carta con el nuevo logotipo pasa a `F.TI-006-03`.
- Si existen, versiones oficiales del logotipo de Grupo Tersa en SVG (completo, sin lema e isotipo). Ya está
  en el proyecto el que me pasaste (`docs/assets/marca/`).

## Etapa 1 — Base de datos, seguridad y shell de la app · M

**Objetivo:** el esquema completo y las reglas de acceso, más el «esqueleto» navegable de la app.

Backend:
- La base «Tersa» parte vacía: la migración del diseño anterior ya se descartó el 2026-10-19. Por decisión
  tuya se conservan el event trigger `ensure_rls` (red de seguridad de RLS) y el usuario de Auth
  `test@test.com`. Las migraciones activan RLS de forma explícita en cada tabla de todos modos.
- Migraciones: extensiones (`pgcrypto`, `pg_trgm`, `unaccent`), enums, **todas** las tablas del diseño
  (incluidas `unidades_negocio` y `folios_control`), constraints (serie única, subcategoría solo en Otro,
  etiqueta de apartado, motivo de baja), índices.
- Triggers: marcas de tiempo/autor, auditoría a `movimientos`, guarda del estado `asignado`.
- `perfiles` (con puesto para la firma) + alta automática al crear usuario en Auth; helpers `es_admin()` /
  `es_usuario_activo()`.
- RLS en todas las tablas; `movimientos` solo inserción. Registro público desactivado.
- Pruebas SQL de permisos y constraints. Primer Administrador creado manualmente.

Frontend:
- Cliente Supabase, tipos generados, TanStack Query.
- `AppShell`, `Sidebar`, `TopBar`, menú móvil **D-06**; **P-01** login, **P-02** recuperar contraseña,
  **P-90** no encontrada, **P-91** sin permiso, marcador de **P-03**.
- Rutas protegidas con `?siguiente=` y guardas por rol; enlace «saltar al contenido»; títulos por ruta.

**Aceptación:** un Lector lee pero recibe error al escribir **vía API** · un usuario sin perfil activo no ve
datos · el menú móvil abre y cierra con Escape · recargar una ruta protegida conserva la sesión · tras
iniciar sesión se vuelve a la ruta pedida.

## Etapa 2 — Catálogos y colaboradores · M

**Objetivo:** los datos de referencia que el inventario necesita, y los componentes base que se reutilizarán.

- Componentes: `DataTable` (paginación del servidor, orden, tarjetas en móvil), `FilterBar` (filtros en la
  URL), campos, `Dialog`/`ConfirmDialog`, `Toast`, `StatusBadge`.
- **P-50** catálogos: empresas (razón social provisional = clave), contratos, ubicaciones, unidades de negocio,
  subcategorías de Otro.
- **P-40 / P-41** colaboradores: lista con búsqueda, alta, edición, baja lógica, ficha (sin equipos por ahora).

**Aceptación:** Admin crea/edita y ve errores claros ante duplicados · Lector no ve botones de edición y la
API le rechaza escrituras · filtros y página sobreviven a la recarga.

## Etapa 3 — Inventario de activos · L

**Objetivo:** el corazón del sistema: registrar y consultar equipos.

- **P-10** lista sobre `v_equipos`: búsqueda, filtros, orden (incluido **por empresa**), vista **agrupada por
  empresa**, paginación 25/50/100, selección múltiple.
- **D-05** exportación CSV del resultado filtrado completo (no solo la página), UTF-8 con BOM.
- **P-11 / P-13** alta y edición (número de producto, «sin serie visible», empresa desde el contrato).
- **P-12** ficha: datos, estado con su etiqueta, **estado físico** (condición + observaciones), historial del equipo.
- **Estado físico** en P-11/P-13 y filtro «Condición» en P-10. Ya están hechos y probados (rama
  `bd/mensajes-condicion-equipos`): la validación `exigirObservaciones` (`src/lib/condicion.ts`), los
  componentes `CamposEstadoFisico` y `EtiquetaCondicion`, y los mensajes del servidor con su campo
  (`mensajeDeError` / `campoDeError`). La Etapa 3 solo los conecta al formulario y a la ficha.
- **D-01** cambio de estado manual con «apartado para» y «motivo de desactivación».
- Búsqueda en la barra superior (solo equipos, por ahora).

**Aceptación:** no se puede repetir una serie (ni con distinto uso de mayúsculas/espacios) · Otro exige
subcategoría · Apartado exige etiqueta y Desactivado exige motivo · Con detalles/Dañado exige observaciones
(el mensaje dice qué escribir y aparece junto al campo, tanto si lo detecta el cliente como la BD) · `asignado` no se puede elegir a mano ·
el CSV abre en Excel con acentos correctos · cada edición aparece en el historial con «antes → después».

**Construido (rama `etapa-3-inventario-equipos`):**

- Migración `20261019150000_inventario_equipos.sql`:
  - serie interna `SINSERIE-NNNN` asignada por la BD;
  - columna `busqueda` en `v_equipos` (serie, marca, modelo, número de producto, descripción, operación y
    colaborador, sin acentos);
  - `cambiar_estado()` con nota al historial;
  - `historial_equipo()` con autor y nombres de catálogo en lugar de id.
- Prueba SQL `supabase/tests/etapa3_inventario_equipos.sql`.
- Rutas `/equipos`, `/equipos/nuevo`, `/equipos/:id`, `/equipos/:id/editar` y `/e/:id` (destino del QR, lleva a la ficha).
- Cambios respecto a lo planeado:
  - La **selección múltiple** de P-10 se mueve a la Etapa 6: su única acción es «Imprimir etiquetas (N)».
  - El selector de contrato es un `<select>` sin búsqueda. Se cambiará a `Combobox` si la lista de contratos crece.

## Etapa 4 — Migración del Excel · M

**Objetivo:** cargar los **1,463 equipos** reales al entorno dev y validarlos con las pantallas ya hechas.

- `scripts/migracion/extraer.py` + archivos de mapeo (estados, ubicaciones, modelos, usuarios genéricos).
- Consolidado (1,449) + 14 equipos fuera de contrato; servidores/switches/UPS **no** se cargan.
- **Sesión de revisión contigo** de mapeos e incidencias (lista en §8 del doc 03).
- Carga a `staging` → transformación a tablas finales → reporte de conciliación.
- Asignaciones históricas con sus folios SIS/HIST; movimientos `importacion` con los datos originales.

**Aceptación:** 1,463 equipos · conteos por estado/categoría/empresa iguales al reporte (78 desactivados:
CGE, vendidas y donativos) · muestreo de 20 series correcto · ningún dato de LogMeIn en la base · todas las
incidencias resueltas o documentadas.

**Construido (rama `etapa-4-migracion-excel`):**

- `scripts/migracion/`:
  - `extraer.py` y los mapeos revisables `mapeos/estados.csv`, `modelos.csv` y `ubicaciones.csv`;
  - `conciliar.py`;
  - `reiniciar.sql`, solo para desarrollo;
  - un README con el proceso.
- La carga a «Tersa» (dev) concilia: 1,463 equipos y conteos por estado, categoría y empresa iguales al Excel,
  integridad de asignaciones, muestreo de 20 series y cero valores de LogMeIn. El resultado detallado está en el
  doc 03 §9.
- Cambio respecto a lo planeado: en lugar de un esquema `staging`, `extraer.py` genera `salida/carga.sql`, que carga
  con tablas temporales dentro de **una sola transacción**. Se aborta si la BD ya tiene equipos o si un conteo de
  conciliación no cuadra. Es más simple, no deja tablas intermedias y el SQL se puede revisar antes de ejecutarlo.
- Pendiente: la **sesión de revisión contigo** de las incidencias (doc 03 §9). Las decisiones se aplican en los
  mapeos o en la BD y la carga se repite.

**Ajustes tras revisar la migración (rama `ajustes-inventario-especificaciones`):**

- Especificaciones opcionales de Desktop y Laptop (CPU, GPU, RAM, almacenamiento y sistema operativo) en el
  formulario y la ficha; migración `20261020120000_especificaciones_equipos.sql`.
- Inventario con un solo buscador: en escritorio filtra la barra superior; el de la página queda solo en móvil.
- Espacio inferior en el contenido para que la insignia flotante de Netlify no tape la paginación.

## Etapa 5 — Entregas y devoluciones · L

**Objetivo:** el flujo operativo diario con reglas garantizadas por la base de datos.

- Funciones `crear_asignacion`, `registrar_devolucion` (parcial/total, destino stock o mantenimiento, cierre
  por incidencia) y `actualizar_firmas`; folios **`CC-AA-NNNN`** y **`CD-AA-NNNN`** con `folios_control`.
- Apartados asignables solo con confirmación explícita.
- **Regularizar Pendientes:** varios de los 37 equipos `pendiente` de la migración ya están entregados en la
  realidad. Se pasan a Asignado con este mismo asistente (P-21), por lo que `crear_asignacion` debe aceptar una
  **fecha de entrega pasada**. No se hace un flujo aparte (decisión del 2026-10-19).
- Pruebas SQL: equipo no asignable rechazado, doble asignación concurrente rechazada, transacción atómica,
  folios sin huecos.
- **P-21** asistente de entrega (con **D-04** datos de firma editables y **D-07** alta rápida de colaborador),
  **P-20** lista, **P-22** detalle, **P-24** vista imprimible, **P-25** devolución, **P-26** detalle de devolución.
- En **P-25**, cada renglón usa `CamposEstadoFisico` en modo devolución, prellenado con el estado físico del
  equipo. Los errores `asignacion_equipos_detalle_requiere_observaciones` se muestran en el renglón del equipo
  que los causó.
- Asignación actual en **P-12** y equipos actuales en **P-41**.

**Aceptación:** los equipos no asignables no aparecen y la API los rechaza · un Apartado no se entrega sin
la confirmación · si falla un equipo no se guarda nada · folios consecutivos sin huecos · devolver a
mantenimiento deja el estado y la ubicación correctos · la condición de la devolución actualiza el estado físico del equipo · recargar el asistente no pierde lo capturado.

**Construido (rama `etapa-5-entregas-devoluciones`):**

- Migración `20261021120000_entregas_y_devoluciones.sql`:
  - `crear_asignacion`, `registrar_devolucion` y `actualizar_firmas`: *security definer* con validación del
    rol, porque `authenticated` no puede escribir directo en esas tablas;
  - vista `v_asignaciones`;
  - folio `CI-AA-NNNN` para el cierre por incidencia.
- Prueba SQL `supabase/tests/etapa5_entregas_y_devoluciones.sql`. Cubre:
  - Lector rechazado;
  - equipo no asignable y entrega atómica;
  - Apartado sin confirmar;
  - fecha pasada sí, futura no;
  - folios consecutivos;
  - devolución parcial a Mantenimiento con estado físico;
  - cierre por incidencia con motivo;
  - firmas.

  La concurrencia real (dos sesiones a la vez) no se puede probar en una sola transacción: la cubren el
  `FOR UPDATE` en orden fijo y el índice único de asignación activa.
- Pantallas:
  - P-20 `/asignaciones`;
  - P-21 `/asignaciones/nueva`: con D-04, D-07 y precarga `?equipo=` / `?colaborador=` desde las fichas;
  - P-22 `/asignaciones/:id`;
  - P-24 `/asignaciones/:id/imprimir`;
  - P-25 `/asignaciones/:id/devolucion`;
  - P-26 `/devoluciones/:id`;
  - en P-12 se agregan las acciones *Entregar* y *Registrar devolución*;
  - en P-41, los equipos actuales y las entregas del colaborador.
- Cambios respecto a lo planeado:
  - Mientras no exista P-23 (Etapa 6), al registrar una entrega se abre su detalle (P-22). Desde la
    Etapa 6 se abre P-23.
  - P-24 es un comprobante sencillo con líneas de firma; la carta formal F.TI-006-02 queda en P-23.
  - El cierre por incidencia usa su propio consecutivo `CI-AA-NNNN`, así no deja huecos en los folios `CD`.
  - `actualizar_firmas` no deja un movimiento en el historial de los equipos: el historial es por equipo y la
    firma pertenece a la carta. Se puede agregar una bitácora de documentos en la Etapa 7 si hace falta.

## Etapa 6 — Cartas, etiquetas, QR y búsqueda · M-L

**Objetivo:** documentos imprimibles e identificación rápida de equipos.

- **Carta custodia** con los datos y el texto del formato **F.TI-006-02** (1 equipo = datos en vertical;
  varios = tabla), firmas editables, nombre de archivo sugerido al guardar como PDF. No tiene que ser una
  réplica visual del formato anterior: basta con los datos importantes y un diseño profesional (decisión del
  usuario, 2026-10-19).
- **P-23** documentos de la asignación: **carta + hoja de etiquetas generadas juntas** al completar la entrega.
- **Carta de devolución** bajo demanda desde **P-26**.
- **Etiquetas QR** en hoja carta (3 × 8 con guías de corte) por asignación y por lote (**P-70**); ruta **P-14** `/e/:id`.
- **P-31** búsqueda global (URL de QR, UUID, serie, colaborador sin importar acentos, folios CC/CD/SIS/HIST).
- **D-03** escáner con cámara: `BarcodeDetector` o respaldo zxing; mensajes claros sin soporte o sin permiso.

**Aceptación:** la carta lleva los datos y las cláusulas de F.TI-006-02 y cabe en hoja carta · las etiquetas impresas en papel
normal se leen con un celular · un QR escaneado sin sesión lleva al login y luego a la ficha · la búsqueda
encuentra «Chavez» cuando el dato es «Chávez» · en un navegador sin cámara se explica la alternativa.

**Construido (rama `etapa-6-cartas-etiquetas-busqueda`):**

- Migración `20261022120000_busqueda_global.sql`: `buscar_global(texto, límite)`.
  - Es *security invoker*, así que respeta el RLS. Responde con la coincidencia exacta (serie o folio) y
    los grupos Equipos, Colaboradores, Entregas y Devoluciones.
  - No distingue acentos ni mayúsculas, acepta palabras salteadas («jose lopez») y escapa los comodines.
  - Tarda unos 50 ms con los 1,463 equipos.
- Prueba SQL `supabase/tests/etapa6_busqueda_global.sql`. Cubre:
  - acentos y palabras salteadas;
  - serie exacta frente a parcial;
  - folio exacto;
  - comodines escapados;
  - límite de resultados;
  - el Lector puede buscar;
  - `anon` rechazado.
- Documentos (`src/features/documentos/`), fuera de la estructura de la app y con el título de la pestaña
  igual al nombre del PDF:
  - **P-23** `/asignaciones/:id/documentos`: carta custodia y hoja de etiquetas. Permite *Imprimir todo*,
    *Imprimir carta* o *Imprimir etiquetas*, además de *Datos de firma*. Se abre al registrar la entrega.
  - Carta de devolución `/devoluciones/:id/carta`: botón *Generar carta de devolución* en P-26. Los cierres
    por incidencia no la generan.
  - **P-70** `/etiquetas?ids=…`: se abre desde la selección múltiple de P-10 (*Imprimir etiquetas (N)*) y
    desde *Imprimir etiqueta* en P-12.
  - Etiquetas en rejilla de 3 × 8 de 65 × 32 mm, con QR de 26 mm (nivel M) y guías de corte. *Empezar en la
    etiqueta N* permite reutilizar una hoja ya empezada.
- **P-31** `/buscar` y la barra superior:
  - la URL del QR o un UUID abren la ficha;
  - una serie o un folio exactos abren su registro;
  - lo demás lleva a los resultados agrupados;
  - en móvil, la lupa abre P-31.
- **D-03** escáner:
  - está en la barra superior, en P-31 y en el paso 2 de P-21. En P-21 un QR agrega el equipo directo y un
    código de barras de serie se busca como texto;
  - usa `BarcodeDetector` y, si no existe, `@zxing/browser`, que se carga aparte (≈ 125 kB comprimido) solo
    al abrir el escáner;
  - cuando no hay cámara, no hay permiso o falla, muestra un mensaje claro y deja escribir la serie o el folio.
- Prueba unitaria: el QR que genera la etiqueta se vuelve a leer con el mismo decodificador de zxing.
- Cambios respecto a lo planeado:
  - La carta es un diseño propio con los datos y el texto de F.TI-006-02, no una réplica visual. Las
    6 cláusulas se conservan sin cambios de redacción. Con varios equipos solo cambia el número gramatical
    del párrafo de compromiso.
  - El nombre del PDF lleva el nombre completo del colaborador sin acentos (p. ej.
    `F.TI-006-02 Carta Custodia CC-26-0001 5CD626170N Nombre Apellido Apellido`).
  - El QR usa `VITE_URL_PUBLICA` si está definida; si no, el dominio desde el que se abre la app. Hay que
    definirla en Netlify antes de imprimir etiquetas definitivas (Etapa 9), para que no apunten a un *deploy
    preview*.
  - Las entregas importadas del Excel no tienen firmas ni fecha real: P-23 lo avisa antes de reimprimir.

## Etapa 7 — Panel operativo e historial global · M

**Objetivo:** visibilidad del estado del inventario.

- `metricas_panel()`: equipos activos, conteos por estado/categoría/empresa, contratos por vencer (90 días),
  movimientos recientes.
- **P-03** panel según el doc 04 §6 (datos útiles, profesional y minimalista): 4 cifras clave, «Requiere
  atención», distribución por empresa, avance de localización y actividad reciente (skill dataviz). Cada
  cifra abre el inventario ya filtrado. `metricas_panel()` calcula además el tiempo en el estado actual (a
  partir de `movimientos`), la serie semanal de «No localizado» y las asignaciones activas de colaboradores
  dados de baja.
- **P-30** historial filtrable con detalle de cambios y exportación.

**Aceptación:** cada cifra del panel coincide con su consulta de verificación · hacer clic en una cifra abre
la lista con el filtro equivalente.

**Construido (rama `etapa-7-panel-historial`):**

- Migración `20261023120000_panel_e_historial.sql`:
  - `v_equipos` gana `estado_desde` (último movimiento que dejó al equipo en su estado actual; para lo
    migrado es la fecha de la importación) y `colaborador_activo`;
  - `metricas_panel()`: cifras clave, «Requiere atención», distribución por empresa, serie semanal de
    «No localizado» reconstruida desde `movimientos` (hasta 26 semanas) y los 8 movimientos más recientes;
  - `historial_global(desde, hasta, tipos, texto, usuario, límite, desplazamiento)` y `usuarios_historial()`.
  - Las tres funciones son *security definer* con validación de usuario activo: muestran el nombre de quien
    hizo cada cambio y el Lector no puede leer perfiles ajenos. Tiempos con los datos reales: panel ≈ 30 ms,
    historial ≈ 17 ms, página del inventario ≈ 23 ms.
- Prueba SQL `supabase/tests/etapa7_panel_e_historial.sql`. Compara las cifras antes y después de sus propios
  datos (la BD tiene el inventario real) y cubre:
  - umbrales de mantenimiento (30 días) y apartado (15 días);
  - asignados a colaboradores dados de baja;
  - la distribución suma los activos y «Sin empresa» va al final;
  - actividad con folio, colaborador y autor visible para el Lector, sin la importación;
  - historial por texto, colaborador, tipo, usuario, fechas y paginación;
  - `anon` rechazado.
- **P-03** `/`: los 5 bloques del doc 04. El Administrador ve primero «Requiere atención» y tiene *Nueva entrega*
  y *Escanear QR*; el Lector ve primero la distribución y el avance. Todo es enlace al inventario filtrado:
  - filtro nuevo `?atencion=` (mantenimiento > 30 días, apartado > 15 días, colaborador dado de baja, contrato
    vencido, contrato que vence en 90 días), con un aviso «Desde el panel: …» y *Quitar este filtro*;
  - filtro `empresa=sin_empresa`.
- **P-30** `/historial`: filtros de texto (serie, colaborador o folio), fechas, tipo y usuario en la URL; cada
  resumen se despliega en la tabla de cambios campo por campo; exportación CSV del resultado completo.
- Cambios respecto a lo planeado:
  - «Requiere atención» separa los contratos **vencidos** con equipos activos (hoy 292 equipos) de los que
    vencen en 90 días (75): ambos sirven para decidir renovaciones.
  - Las cifras de «Requiere atención» cuentan **equipos**, no contratos.
  - La tendencia de «No localizado» y la comparación con el mes anterior dicen «sin comparación aún» hasta que
    el historial cubra ese periodo (empieza con la migración del 19/10/2026). No se inventan datos.
  - El tiempo en Mantenimiento o Apartado de lo migrado se cuenta desde la importación, porque el Excel no trae
    esa fecha.

## Etapa 8 — Administración de accesos · S-M

**Objetivo:** que un Administrador gestione usuarios sin entrar al panel de Supabase.

- Edge Function `admin-usuarios`: invitar, cambiar rol, desactivar/reactivar (verifica que quien llama es admin).
- **P-60** usuarios y **D-08** invitar/cambiar rol; correo de invitación en español; protección del último Administrador.

**Aceptación:** un Lector no puede invocar la función · un usuario desactivado pierde acceso en su siguiente
petición · no es posible quedarse sin Administradores.

**Construido (rama `etapa-8-usuarios`):**

- Edge Function `supabase/functions/admin-usuarios` (desplegada en «Tersa»), con las acciones invitar,
  reenviar invitación, cambiar rol, desactivar y reactivar.
  - Valida la sesión y el rol en el código (`auth.getUser` + `perfiles`): un Lector o una sesión inválida
    reciben 403/401. Por eso tiene `verify_jwt = false` en `config.toml`; así funciona con las llaves
    heredadas y con las nuevas.
  - Al invitar, crea el usuario con el correo de Supabase y activa su perfil con el rol, nombre y puesto
    capturados. El enlace lleva a `/restablecer?invitacion=1`, donde crea su contraseña y entra directo.
  - Al desactivar, primero marca el perfil como inactivo (el RLS deja de responderle en su siguiente
    petición) y después lo bloquea en Auth para que no pueda renovar la sesión. Reactivar quita el bloqueo.
  - Un Administrador no puede desactivarse ni quitarse el rol a sí mismo; la BD además protege al último
    Administrador (`perfiles_ultimo_admin`).
  - Las reglas viven en `reglas.ts`, sin dependencias de Deno, y se prueban con Vitest.
- Migración `20261024120000_usuarios_admin.sql`: `usuarios_admin()` (solo Administrador) con los datos de
  acceso de `auth.users`: invitación, confirmación y último acceso.
- Prueba SQL `supabase/tests/etapa8_usuarios.sql`:
  - el Lector no ve la lista ni se cambia el rol;
  - un perfil desactivado deja de leer equipos;
  - no se puede quitar el rol ni desactivar al último Administrador;
  - `anon` rechazado.
- **P-60** `/admin/usuarios` con estado (Activo, Invitación pendiente, Desactivado), rol y último acceso;
  acciones según el estado; desactivar pide confirmación (D-02).
- **D-08**: invitar (correo, nombre, puesto, rol) y cambiar rol, con la descripción de cada rol.
- Correo de invitación en español: `supabase/templates/invitacion.html`, registrado en `config.toml`. En el
  proyecto remoto la plantilla se aplica aparte (panel de Supabase → Authentication → Emails, o
  `supabase config push`).
- Verificado contra la función desplegada: sin sesión o con token inválido → 401; con la sesión del
  Administrador, las reglas de «sobre sí mismo» y la acción desconocida responden 400 con su mensaje. No se
  enviaron invitaciones reales durante las pruebas.

## Etapa 9 — Endurecimiento y salida a producción · M

- Pruebas e2e (Playwright) de los flujos críticos sobre el preview.
- Auditoría final de accesibilidad y diseño adaptable (Impeccable + revisión manual con teclado y lector de pantalla).
- Pruebas con usuarios de las 4 tareas del doc 04 §13.
- *Advisors* de seguridad y rendimiento de Supabase; plan de respaldos; revisión del plan de Supabase.
- Producción: crear el proyecto prod con migraciones, SMTP para correos, dominio en Netlify.
- **Migración final** con el Excel congelado; capacitación breve y manual de usuario (`docs/`).
- Operación en paralelo con el Excel 1–2 semanas y retiro del Excel.

**Aceptación:** e2e en verde · sin alertas críticas en *advisors* · conciliación final aprobada · usuarios
capacitados.

---

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Datos del Excel inconsistentes (ubicaciones, modelos, usuarios) | Mapeos revisables + reporte de incidencias antes de cargar |
| El Excel sigue cambiando durante el desarrollo | Carga repetible; carga final con archivo congelado |
| Proyecto gratuito de Supabase pausado o sin respaldos | Plan Pro o respaldo programado antes de producción |
| Credenciales expuestas en la columna LogMeIn | No migrarlas; cambiar esas contraseñas |
| Escaneo de QR no soportado en algunos navegadores | Respaldo zxing + búsqueda manual siempre disponible |
| Etiquetas en papel normal se desgastan | Recomendar cinta transparente encima o, más adelante, papel adhesivo con la misma rejilla |
| Reglas de negocio solo en el frontend | Reglas en SQL (constraints, RPC, RLS) con pruebas |
