# Migración del Excel (Etapa 4)

Proceso descrito en [docs/03](../../docs/03-analisis-y-migracion-de-datos.md). Carga los equipos, colaboradores
y asignaciones históricas del inventario en Excel a Supabase.

> Los Excel y todo lo que hay en `salida/` contienen datos personales: **no se suben a git** (`.gitignore`).
> La columna LogMeIn (usuarios y contraseñas en texto plano) nunca se carga.

## Requisitos

- Python 3.12+ con `openpyxl` (`pip install openpyxl`).
- Supabase CLI enlazado al proyecto (`supabase link`).
- Los dos Excel fuente. Por omisión se buscan en las rutas de `extraer.py` (`CONSOLIDADO`, `ORIGINAL`); se
  pueden indicar con `--consolidado` y `--original`.

## Pasos

```bash
# 1. Extraer: genera salida/*.csv, incidencias.csv, resumen.md y carga.sql
python scripts/migracion/extraer.py

# 2. Revisar salida/resumen.md e incidencias.csv; corregir mapeos/*.csv si hace falta y repetir el paso 1

# 3. Cargar (una sola transacción; aborta si la BD ya tiene equipos o si un conteo no cuadra)
supabase db query --linked -f scripts/migracion/salida/carga.sql

# 4. Conciliar contra el Excel: conteos, integridad, muestreo de 20 series y ausencia de LogMeIn
python scripts/migracion/conciliar.py
```

`conciliar.py` compara contra el Excel: sirve justo después de cargar. En cuanto alguien cambia un equipo
en el sistema (p. ej. desactivar un no localizado por donativo), los conteos por estado dejan de coincidir; eso
es esperado y no indica un error de la carga.

Para repetir la carga **en desarrollo**, primero `supabase db query --linked -f scripts/migracion/reiniciar.sql`.
Se niega a borrar si ya hay entregas registradas en el sistema (no históricas).

## Mapeos (`mapeos/`)

Tablas revisadas a mano y versionadas (no contienen datos personales). Se abren en Excel.

| Archivo | Qué decide |
|---|---|
| `estados.csv` | Estatus del Excel → estado del sistema (y motivo de desactivación) |
| `modelos.csv` | Descripción libre → marca, modelo y número de producto (los números de parte quedan como «Por identificar») |
| `ubicaciones.csv` | Texto de ubicación → ubicación normalizada, tipo y detalle (caja, cajón, mueble…). Vacío = sin ubicación |

`python scripts/migracion/extraer.py --generar-mapeos` crea con las reglas iniciales los mapeos que falten; no
sobrescribe los existentes. Una descripción o ubicación nueva que no esté en su mapeo aparece en `incidencias.csv`.

## Reglas que aplica `extraer.py`

- **Estados:** docs/03 §3. Asignada sin usuario → Pendiente; vacío con DONATIVO → Desactivado.
- **Colaboradores:** uno por nombre normalizado (sin acentos ni mayúsculas). Los valores que son puestos o equipos
  (SERVIDOR, VACANTE, ASESOR DE VENTAS…) se cargan como colaboradores **genéricos** ligados a su sucursal (D8).
  Los posibles homónimos no se fusionan: se reportan en `incidencias.csv` para decidir a mano.
- **Puesto:** de la columna PUESTO del archivo original (cruce por serie); si no hay, del comentario cuando parece un puesto.
- **Estado físico:** los comentarios de daño («Detalle en teclado», «Dañada…») llenan condición y observaciones.
- **Asignaciones históricas:** una por carta (SIS…) o, sin carta, una por colaborador (HIST-0001…). Las cartas de
  equipos que ya no están asignados quedan cerradas con una devolución histórica `DEV-<folio>`.
- **Historial:** cada equipo recibe un movimiento «Importación» cuya nota guarda los datos originales del Excel.
