-- Etapa 7 · Panel operativo (P-03) e historial global (P-30). docs/01 §3.3, doc 04 §6.

-- ── v_equipos: tiempo en el estado actual y colaborador dado de baja ──────────────────────────────
-- estado_desde = el último movimiento que dejó al equipo en su estado actual. Para lo migrado es la fecha
-- de la importación: el Excel no trae desde cuándo está cada equipo en su estado.
-- Columnas nuevas al final: create or replace view no permite reordenar.
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
  co.activo as colaborador_activo
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

-- ── P-03 · metricas_panel ─────────────────────────────────────────────────────────────────────────
-- Un solo viaje con todo lo que pinta el panel. security definer porque la actividad reciente muestra el
-- nombre de quien hizo cada cambio (un Lector no puede leer perfiles ajenos); por eso valida al usuario.
-- Umbrales de «Requiere atención» (doc 04 P-03): mantenimiento > 30 días, apartado > 15 días,
-- contratos que vencen en 90 días.
create function public.metricas_panel()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Tijuana';
  v_hoy date := privado.hoy();
  v_inicio_mes timestamptz := (date_trunc('month', v_hoy::timestamp) at time zone v_tz);
  v_primer_mov timestamptz;
  v_resultado jsonb;
begin
  if not privado.es_usuario_activo() then
    raise exception 'Tu cuenta no tiene acceso.' using errcode = 'insufficient_privilege';
  end if;

  select min(creado_en) into v_primer_mov from public.movimientos;

  with
  equipos as (
    select e.id, e.estado, e.empresa_id, e.contrato_id, v.estado_desde, v.colaborador_activo,
           v.contrato_vencimiento
      from public.equipos e
      join public.v_equipos v on v.id = e.id
  ),
  -- Estado de cada equipo en un momento dado = el del último movimiento anterior a ese momento.
  semanas as (
    select s::date as semana,
           -- Fin de la semana (o ahora, para la semana en curso).
           least(((s + interval '7 days')::timestamp at time zone v_tz), now()) as corte
      from generate_series(
             greatest(date_trunc('week', (v_primer_mov at time zone v_tz)),
                      date_trunc('week', v_hoy::timestamp) - interval '25 weeks'),
             date_trunc('week', v_hoy::timestamp),
             interval '1 week') s
     where v_primer_mov is not null
  ),
  serie as (
    select s.semana,
           (select count(*)
              from (select distinct on (m.equipo_id) m.estado_nuevo
                      from public.movimientos m
                     where m.creado_en < s.corte
                     order by m.equipo_id, m.creado_en desc, m.id desc) x
             where x.estado_nuevo = 'no_localizado')::int as no_localizados
      from semanas s
  )
  select jsonb_build_object(
    'calculado_en', now(),
    'primer_movimiento', v_primer_mov,
    'cifras', (
      select jsonb_build_object(
        'activos', count(*) filter (where estado <> 'desactivado'),
        'asignados', count(*) filter (where estado = 'asignado'),
        'stock', count(*) filter (where estado = 'stock'),
        'no_localizados', count(*) filter (where estado = 'no_localizado'),
        -- Comparación con el cierre del mes anterior; null si el historial empieza este mes.
        'no_localizados_mes_anterior', case when v_primer_mov < v_inicio_mes then (
          select count(*)
            from (select distinct on (m.equipo_id) m.estado_nuevo
                    from public.movimientos m
                   where m.creado_en < v_inicio_mes
                   order by m.equipo_id, m.creado_en desc, m.id desc) x
           where x.estado_nuevo = 'no_localizado') end
      ) from equipos),
    'atencion', (
      select jsonb_build_object(
        'pendientes', count(*) filter (where estado = 'pendiente'),
        'mantenimiento_30', count(*) filter (
          where estado = 'mantenimiento' and estado_desde < now() - interval '30 days'),
        'apartado_15', count(*) filter (
          where estado = 'apartado' and estado_desde < now() - interval '15 days'),
        'colaborador_baja', count(*) filter (where estado = 'asignado' and colaborador_activo = false),
        'contrato_vencido', count(*) filter (
          where estado <> 'desactivado' and contrato_vencimiento < v_hoy),
        'contrato_90', count(*) filter (
          where estado <> 'desactivado' and contrato_vencimiento between v_hoy and v_hoy + 90)
      ) from equipos),
    -- Equipos activos por empresa y estado (bloque 3). «Sin empresa» va al final.
    'por_empresa', coalesce((
      select jsonb_agg(jsonb_build_object(
               'empresa_id', g.empresa_id, 'clave', g.clave, 'razon_social', g.razon_social,
               'total', g.total, 'estados', g.estados)
             order by g.empresa_id is null, g.total desc)
        from (
          select e.empresa_id, em.clave, em.razon_social, sum(e.n)::int as total,
                 jsonb_object_agg(e.estado, e.n) as estados
            from (select empresa_id, estado, count(*)::int as n
                    from equipos where estado <> 'desactivado'
                   group by empresa_id, estado) e
            left join public.empresas em on em.id = e.empresa_id
           group by e.empresa_id, em.clave, em.razon_social
        ) g
    ), '[]'::jsonb),
    'serie_no_localizados', coalesce((
      select jsonb_agg(jsonb_build_object('semana', semana, 'valor', no_localizados) order by semana)
        from serie
    ), '[]'::jsonb),
    -- Últimos 8 movimientos hechos en el sistema (la importación no es actividad).
    'actividad', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.creado_en desc, x.id desc)
        from (
          select m.id, m.creado_en, m.tipo, m.estado_anterior, m.estado_nuevo,
                 eq.id as equipo_id, eq.serie,
                 coalesce(d.folio, a.folio) as folio,
                 co.nombre_completo as colaborador_nombre,
                 coalesce(nullif(p.nombre, ''), p.email) as autor
            from public.movimientos m
            join public.equipos eq on eq.id = m.equipo_id
            left join public.devoluciones d on d.id = m.devolucion_id
            left join public.asignaciones a on a.id = coalesce(m.asignacion_id, d.asignacion_id)
            left join public.colaboradores co on co.id = a.colaborador_id
            left join public.perfiles p on p.id = m.usuario_id
           where m.tipo <> 'importacion'
           order by m.creado_en desc, m.id desc
           limit 8
        ) x
    ), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.metricas_panel() from public, anon;
grant execute on function public.metricas_panel() to authenticated;

-- ── P-30 · historial_global ───────────────────────────────────────────────────────────────────────
-- Movimientos de todos los equipos con filtros y paginación; `total` repite el conteo en cada fila.
-- p_texto busca en serie, colaborador y folio (sin acentos). Fechas en días de Tijuana, ambas inclusive.
create function public.historial_global(
  p_desde date default null,
  p_hasta date default null,
  p_tipos public.tipo_movimiento[] default null,
  p_texto text default null,
  p_usuario uuid default null,
  p_limite int default 25,
  p_desplazamiento int default 0
)
returns table (
  id bigint,
  creado_en timestamptz,
  tipo public.tipo_movimiento,
  estado_anterior public.estado_equipo,
  estado_nuevo public.estado_equipo,
  cambios jsonb,
  nota text,
  equipo_id uuid,
  serie text,
  categoria public.categoria_equipo,
  marca text,
  modelo text,
  asignacion_id uuid,
  devolucion_id uuid,
  folio text,
  colaborador_id uuid,
  colaborador_nombre text,
  autor text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'America/Tijuana';
  v_patron text := case when nullif(btrim(p_texto), '') is not null then
    '%' || regexp_replace(
      replace(replace(replace(public.normalizar_texto(btrim(p_texto)), '\', '\\'), '%', '\%'), '_', '\_'),
      '\s+', '%', 'g') || '%' end;
begin
  if not privado.es_usuario_activo() then
    raise exception 'Tu cuenta no tiene acceso.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    m.id, m.creado_en, m.tipo, m.estado_anterior, m.estado_nuevo,
    -- {"campo": [antes, después]} con los id de catálogos cambiados por su nombre (como historial_equipo).
    (select coalesce(jsonb_object_agg(c.key, jsonb_build_array(
              privado.nombre_referencia(c.key, c.value -> 0),
              privado.nombre_referencia(c.key, c.value -> 1))), '{}'::jsonb)
       from jsonb_each(m.cambios) c
      where c.key not in ('id', 'creado_en', 'creado_por')),
    m.nota,
    eq.id, eq.serie, eq.categoria, eq.marca, eq.modelo,
    a.id, d.id,
    coalesce(d.folio, a.folio),
    co.id, co.nombre_completo,
    coalesce(nullif(p.nombre, ''), p.email),
    count(*) over ()
  from public.movimientos m
  join public.equipos eq on eq.id = m.equipo_id
  left join public.devoluciones d on d.id = m.devolucion_id
  left join public.asignaciones a on a.id = coalesce(m.asignacion_id, d.asignacion_id)
  left join public.colaboradores co on co.id = a.colaborador_id
  left join public.perfiles p on p.id = m.usuario_id
  where (p_desde is null or m.creado_en >= (p_desde::timestamp at time zone v_tz))
    and (p_hasta is null or m.creado_en < ((p_hasta + 1)::timestamp at time zone v_tz))
    and (p_tipos is null or cardinality(p_tipos) = 0 or m.tipo = any (p_tipos))
    and (p_usuario is null or m.usuario_id = p_usuario)
    and (v_patron is null
         or public.normalizar_texto(concat_ws(' ', eq.serie, co.nombre_completo, a.folio, d.folio))
            like v_patron)
  order by m.creado_en desc, m.id desc
  limit least(greatest(coalesce(p_limite, 25), 1), 1000)
  offset greatest(coalesce(p_desplazamiento, 0), 0);
end;
$$;

revoke all on function public.historial_global(date, date, public.tipo_movimiento[], text, uuid, int, int)
  from public, anon;
grant execute on function public.historial_global(date, date, public.tipo_movimiento[], text, uuid, int, int)
  to authenticated;

-- Opciones del filtro «Usuario» de P-30: quien ha hecho algún movimiento. El Lector no puede leer
-- perfiles ajenos, así que se exponen solo id y nombre.
create function public.usuarios_historial()
returns table (id uuid, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(nullif(p.nombre, ''), p.email)
    from public.perfiles p
   where privado.es_usuario_activo()
     and exists (select 1 from public.movimientos m where m.usuario_id = p.id)
   order by 2;
$$;

revoke all on function public.usuarios_historial() from public, anon;
grant execute on function public.usuarios_historial() to authenticated;
