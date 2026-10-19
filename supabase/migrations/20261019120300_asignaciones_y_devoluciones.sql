-- Etapa 1 · Asignaciones, devoluciones y folios (docs/01 §3.2 y §4.4).
-- Las funciones que escriben aquí (crear_asignacion, registrar_devolucion) llegan en la Etapa 5.

create table public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  -- CC-26-0001; las importadas conservan SIS0xxx o HIST-0001.
  folio text not null unique,
  colaborador_id uuid not null references public.colaboradores (id),
  fecha_entrega date not null default current_date,
  entregado_por uuid references public.perfiles (id),
  lugar_expedicion text not null default 'Tijuana BC',
  -- Instantánea de nombre, puesto, unidad de negocio y ubicación al momento de la entrega.
  datos_colaborador jsonb not null default '{}'::jsonb,
  firma_entrega_nombre text,
  firma_entrega_puesto text,
  firma_recibe_nombre text,
  firma_recibe_puesto text,
  observaciones text,
  es_historica boolean not null default false,
  cerrada_en timestamptz,
  creado_en timestamptz not null default now()
);
create index asignaciones_colaborador_idx on public.asignaciones (colaborador_id);
create index asignaciones_entregado_por_idx on public.asignaciones (entregado_por);
create index asignaciones_fecha_idx on public.asignaciones (fecha_entrega desc);

create table public.devoluciones (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  asignacion_id uuid not null references public.asignaciones (id),
  fecha date not null default current_date,
  lugar_expedicion text not null default 'Tijuana BC',
  recibido_por uuid references public.perfiles (id),
  firma_entrega_nombre text,
  firma_entrega_puesto text,
  firma_recibe_nombre text,
  firma_recibe_puesto text,
  observaciones text,
  -- Extravío o baja de un equipo asignado: no genera carta.
  es_cierre_incidencia boolean not null default false,
  creado_en timestamptz not null default now()
);
create index devoluciones_asignacion_idx on public.devoluciones (asignacion_id);
create index devoluciones_recibido_por_idx on public.devoluciones (recibido_por);

create table public.asignacion_equipos (
  id uuid primary key default gen_random_uuid(),
  asignacion_id uuid not null references public.asignaciones (id) on delete cascade,
  equipo_id uuid not null references public.equipos (id),
  devolucion_id uuid references public.devoluciones (id),
  destino_devolucion public.destino_devolucion,
  condicion_devolucion text check (condicion_devolucion in ('buen_estado', 'con_detalles', 'danado')),
  unique (asignacion_id, equipo_id),
  constraint asignacion_equipos_devolucion_completa
    check ((devolucion_id is null) = (destino_devolucion is null))
);
-- Un equipo no puede tener dos asignaciones activas, ni con peticiones simultáneas.
create unique index asignacion_equipos_activa_uidx
  on public.asignacion_equipos (equipo_id) where devolucion_id is null;
create index asignacion_equipos_devolucion_idx on public.asignacion_equipos (devolucion_id);

-- Contador sin huecos por tipo y año. Solo lo tocan funciones del servidor.
create table public.folios_control (
  tipo text not null check (tipo in ('CC', 'CD')),
  anio smallint not null,
  ultimo integer not null default 0,
  primary key (tipo, anio)
);

-- Devuelve el siguiente folio («CC-26-0001»). Debe llamarse dentro de la transacción de la entrega/devolución.
create function public.siguiente_folio(p_tipo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anio smallint := extract(year from (now() at time zone 'America/Tijuana'))::smallint;
  v_numero integer;
begin
  insert into public.folios_control as f (tipo, anio, ultimo)
  values (p_tipo, v_anio, 1)
  on conflict (tipo, anio) do update set ultimo = f.ultimo + 1
  returning ultimo into v_numero;

  return format('%s-%s-%s', p_tipo, lpad((v_anio % 100)::text, 2, '0'), lpad(v_numero::text, 4, '0'));
end;
$$;
revoke execute on function public.siguiente_folio(text) from public, anon, authenticated;
