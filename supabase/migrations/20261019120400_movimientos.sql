-- Etapa 1 · Historial auditable de equipos (docs/01 §3.2). Solo inserción.

create table public.movimientos (
  id bigint generated always as identity primary key,
  equipo_id uuid not null references public.equipos (id),
  tipo public.tipo_movimiento not null,
  estado_anterior public.estado_equipo,
  estado_nuevo public.estado_equipo,
  -- {"campo": [antes, después]}
  cambios jsonb not null default '{}'::jsonb,
  asignacion_id uuid references public.asignaciones (id),
  devolucion_id uuid references public.devoluciones (id),
  nota text,
  usuario_id uuid references public.perfiles (id),
  creado_en timestamptz not null default now()
);
create index movimientos_equipo_idx on public.movimientos (equipo_id, creado_en desc);
create index movimientos_creado_idx on public.movimientos (creado_en desc);
create index movimientos_asignacion_idx on public.movimientos (asignacion_id);
create index movimientos_devolucion_idx on public.movimientos (devolucion_id);
create index movimientos_usuario_idx on public.movimientos (usuario_id);

-- Registra cada alta y cambio de un equipo. Las funciones de entrega/devolución/importación indican su
-- contexto con set_config('app.contexto' | 'app.asignacion_id' | 'app.devolucion_id' | 'app.nota', …, true).
create function public.registrar_movimiento_equipo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  contexto text := nullif(current_setting('app.contexto', true), '');
  v_cambios jsonb := '{}'::jsonb;
  v_tipo public.tipo_movimiento;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)), '{}'::jsonb)
      into v_cambios
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value
       and n.key not in ('actualizado_en', 'actualizado_por');

    if v_cambios = '{}'::jsonb then
      return new;
    end if;
  end if;

  v_tipo := case
    when contexto in ('asignacion', 'devolucion', 'cierre_incidencia', 'importacion')
      then contexto::public.tipo_movimiento
    when tg_op = 'INSERT' then 'alta'
    when new.estado is distinct from old.estado then 'cambio_estado'
    else 'edicion'
  end;

  insert into public.movimientos
    (equipo_id, tipo, estado_anterior, estado_nuevo, cambios, asignacion_id, devolucion_id, nota, usuario_id)
  values (
    new.id,
    v_tipo,
    case when tg_op = 'UPDATE' then old.estado end,
    new.estado,
    v_cambios,
    nullif(current_setting('app.asignacion_id', true), '')::uuid,
    nullif(current_setting('app.devolucion_id', true), '')::uuid,
    nullif(current_setting('app.nota', true), ''),
    auth.uid()
  );

  return new;
end;
$$;
revoke execute on function public.registrar_movimiento_equipo() from public, anon, authenticated;

create trigger equipos_04_movimiento after insert or update on public.equipos
  for each row execute function public.registrar_movimiento_equipo();
