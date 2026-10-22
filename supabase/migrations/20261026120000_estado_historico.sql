-- Ajustes · Indicador «Histórico» (docs/02, ajustes posteriores a la Etapa 9).
-- Un equipo es histórico mientras conserve el estado con el que llegó de la migración de Excel. Sirve para
-- localizar en lote lo que falta revisar a mano. Se quita al cambiar de estado (manual, entrega,
-- devolución, cierre) o con «Confirmar estado» cuando el estado ya era correcto.

alter type public.tipo_movimiento add value if not exists 'confirmacion_estado';

alter table public.equipos add column estado_historico boolean not null default false;
comment on column public.equipos.estado_historico is
  'true = conserva el estado importado del Excel sin revisión. Solo lo pone la importación; lo quita un cambio de estado o confirmar_estado().';

-- Lo migrado que no ha cambiado de estado desde la importación.
-- Sin triggers: no es una edición del usuario (no toca actualizado_en ni deja movimientos).
set session_replication_role = replica;
update public.equipos e
   set estado_historico = true
 where exists (select 1 from public.movimientos m where m.equipo_id = e.id and m.tipo = 'importacion')
   and not exists (
     select 1 from public.movimientos m
      where m.equipo_id = e.id
        and m.tipo in ('cambio_estado', 'asignacion', 'devolucion', 'cierre_incidencia')
   );
reset session_replication_role;

create index equipos_estado_historico_idx on public.equipos (estado_historico) where estado_historico;

-- Nadie lo pone a mano: la importación lo enciende, un cambio de estado o la confirmación lo apagan.
create function public.marcar_estado_historico()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  contexto text := coalesce(current_setting('app.contexto', true), '');
begin
  if contexto = 'importacion' then
    new.estado_historico := true;
  elsif tg_op = 'INSERT' then
    new.estado_historico := false;
  elsif new.estado is distinct from old.estado or contexto = 'confirmacion_estado' then
    new.estado_historico := false;
  else
    new.estado_historico := old.estado_historico;
  end if;
  return new;
end;
$$;
revoke execute on function public.marcar_estado_historico() from public, anon, authenticated;

create trigger equipos_01b_estado_historico before insert or update on public.equipos
  for each row execute function public.marcar_estado_historico();

-- El historial no lista estado_historico como un campo editado; la confirmación tiene su propio tipo.
create or replace function public.registrar_movimiento_equipo()
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
       and n.key not in ('actualizado_en', 'actualizado_por', 'estado_historico');

    if v_cambios = '{}'::jsonb and contexto is distinct from 'confirmacion_estado' then
      return new;
    end if;
  end if;

  v_tipo := case
    when contexto in ('asignacion', 'devolucion', 'cierre_incidencia', 'importacion', 'confirmacion_estado')
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

-- ── Confirmar estado: el estado importado ya es correcto ───────────────────────────────────────────
-- security invoker: el RLS decide (solo Administrador puede actualizar equipos).
create function public.confirmar_estado(p_equipo uuid, p_nota text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.equipos where id = p_equipo) then
    raise exception 'No se encontró el equipo.' using errcode = 'no_data_found';
  end if;
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede confirmar el estado.' using errcode = '42501';
  end if;
  if not (select estado_historico from public.equipos where id = p_equipo) then
    raise exception 'El estado de este equipo ya se revisó.' using errcode = 'check_violation';
  end if;

  perform set_config('app.contexto', 'confirmacion_estado', true);
  perform set_config('app.nota', coalesce(btrim(p_nota), ''), true);
  update public.equipos set estado_historico = false where id = p_equipo;
  perform set_config('app.contexto', '', true);
  perform set_config('app.nota', '', true);
end;
$$;
revoke execute on function public.confirmar_estado(uuid, text) from public, anon;
grant execute on function public.confirmar_estado(uuid, text) to authenticated;

-- ── v_equipos con estado_historico (columna nueva al final) ────────────────────────────────────────
create or replace view public.v_equipos
with (security_invoker = true)
as
select
  e.id,
  e.categoria,
  e.subcategoria_id,
  sc.nombre as subcategoria,
  e.serie,
  e.numero_producto,
  e.marca,
  e.modelo,
  e.descripcion,
  e.empresa_id,
  em.clave as empresa_clave,
  em.razon_social as empresa_razon_social,
  e.contrato_id,
  ct.operacion as contrato_operacion,
  ct.fecha_vencimiento as contrato_vencimiento,
  e.ubicacion_id,
  ub.nombre as ubicacion,
  e.ubicacion_detalle,
  e.estado,
  e.apartado_para,
  e.motivo_desactivacion,
  e.notas,
  ae.asignacion_id,
  a.folio as asignacion_folio,
  a.fecha_entrega as asignacion_fecha,
  co.id as colaborador_id,
  co.nombre_completo as colaborador_nombre,
  e.creado_en,
  e.actualizado_en,
  e.condicion,
  e.observaciones_estado,
  public.normalizar_texto(concat_ws(' ', e.serie, e.marca, e.modelo, e.numero_producto,
    e.descripcion, ct.operacion, co.nombre_completo)) as busqueda,
  e.cpu,
  e.gpu,
  e.ram_gb,
  e.almacenamiento,
  e.sistema_operativo,
  coalesce(ed.creado_en, e.creado_en) as estado_desde,
  co.activo as colaborador_activo,
  e.estado_historico
from public.equipos e
left join public.subcategorias sc on sc.id = e.subcategoria_id
left join public.empresas em on em.id = e.empresa_id
left join public.contratos ct on ct.id = e.contrato_id
left join public.ubicaciones ub on ub.id = e.ubicacion_id
left join public.asignacion_equipos ae on ae.equipo_id = e.id and ae.devolucion_id is null
left join public.asignaciones a on a.id = ae.asignacion_id
left join public.colaboradores co on co.id = a.colaborador_id
left join lateral (
  select m.creado_en
    from public.movimientos m
   where m.equipo_id = e.id
     and m.estado_nuevo = e.estado
     and m.estado_anterior is distinct from m.estado_nuevo
   order by m.creado_en desc, m.id desc
   limit 1
) ed on true;
