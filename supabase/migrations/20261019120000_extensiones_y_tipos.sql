-- Etapa 1 · Extensiones y tipos enumerados (docs/01-diseno-del-sistema.md §3.1).

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() no es IMMUTABLE; este envoltorio permite usarlo en índices (búsqueda «Chávez» = «Chavez»).
create function public.normalizar_texto(texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, texto))
$$;

create type public.categoria_equipo as enum ('desktop', 'laptop', 'monitor', 'otro');

create type public.estado_equipo as enum (
  'stock', 'asignado', 'mantenimiento', 'apartado', 'desactivado', 'no_localizado', 'pendiente'
);

create type public.rol_usuario as enum ('admin', 'lector');

create type public.tipo_movimiento as enum (
  'alta', 'edicion', 'cambio_estado', 'asignacion', 'devolucion', 'cierre_incidencia', 'importacion'
);

-- no_localizado y desactivado solo se usan en el cierre por incidencia (§4.3).
create type public.destino_devolucion as enum ('stock', 'mantenimiento', 'no_localizado', 'desactivado');
