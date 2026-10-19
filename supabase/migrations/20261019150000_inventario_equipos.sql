-- Etapa 3 · Inventario de equipos (docs/01 §3.2, §3.3 y §4.1).

-- ── Serie interna para equipos sin serie visible: SINSERIE-0001, SINSERIE-0002… ──────────────────
create sequence public.equipos_sinserie_seq;
grant usage on sequence public.equipos_sinserie_seq to authenticated;

create or replace function public.preparar_equipo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  empresa_contrato uuid;
begin
  -- En el alta, una serie vacía significa «No tiene serie visible».
  if tg_op = 'INSERT' and nullif(btrim(new.serie), '') is null then
    new.serie := 'SINSERIE-' || lpad(nextval('public.equipos_sinserie_seq')::text, 4, '0');
  end if;
  new.serie := upper(btrim(new.serie));

  if new.contrato_id is not null then
    select c.empresa_id into empresa_contrato from public.contratos c where c.id = new.contrato_id;
    if new.empresa_id is null then
      new.empresa_id := empresa_contrato;
    elsif new.empresa_id <> empresa_contrato then
      raise exception 'La empresa del equipo no coincide con la empresa del contrato.'
        using errcode = 'check_violation', constraint = 'equipos_empresa_del_contrato';
    end if;
  end if;

  if new.estado <> 'apartado' then
    new.apartado_para := null;
  end if;
  if new.estado <> 'desactivado' then
    new.motivo_desactivacion := null;
  end if;

  return new;
end;
$$;

-- ── Búsqueda de la lista: serie, marca, modelo, número de producto, descripción y colaborador ─────
-- Se calcula en la vista (≈1,500 equipos): una columna generada en equipos aparecería en el historial.
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
    e.descripcion, ct.operacion, co.nombre_completo)) as busqueda
from public.equipos e
left join public.subcategorias sc on sc.id = e.subcategoria_id
left join public.empresas em on em.id = e.empresa_id
left join public.contratos ct on ct.id = e.contrato_id
left join public.ubicaciones ub on ub.id = e.ubicacion_id
left join public.asignacion_equipos ae on ae.equipo_id = e.id and ae.devolucion_id is null
left join public.asignaciones a on a.id = ae.asignacion_id
left join public.colaboradores co on co.id = a.colaborador_id;

-- ── D-01 · Cambio de estado manual (§4.1) ───────────────────────────────────────────────────────
-- security invoker: el RLS decide (solo Administrador). Los triggers ya validan Apartado/Desactivado,
-- prohíben «asignado» y limpian las etiquetas; aquí solo se añade la nota al historial.
create function public.cambiar_estado(
  p_equipo uuid,
  p_estado public.estado_equipo,
  p_apartado_para text default null,
  p_motivo text default null,
  p_nota text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform set_config('app.nota', coalesce(btrim(p_nota), ''), true);

  update public.equipos
     set estado = p_estado,
         apartado_para = case when p_estado = 'apartado' then nullif(btrim(p_apartado_para), '') end,
         motivo_desactivacion = case when p_estado = 'desactivado' then nullif(btrim(p_motivo), '') end
   where id = p_equipo;

  if not found then
    if exists (select 1 from public.equipos where id = p_equipo) then
      raise exception 'Solo un Administrador puede cambiar el estado.' using errcode = '42501';
    end if;
    raise exception 'No se encontró el equipo.' using errcode = 'no_data_found';
  end if;

  perform set_config('app.nota', '', true);
end;
$$;
revoke execute on function public.cambiar_estado(uuid, public.estado_equipo, text, text, text)
  from public, anon;
grant execute on function public.cambiar_estado(uuid, public.estado_equipo, text, text, text)
  to authenticated;

-- ── Historial de un equipo con autor y nombres legibles ─────────────────────────────────────────
-- security definer porque un Lector no puede leer otros perfiles; solo expone el nombre del autor.
create function privado.nombre_referencia(p_campo text, p_valor jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_valor is null or jsonb_typeof(p_valor) = 'null' then p_valor
    when p_campo = 'empresa_id' then
      to_jsonb((select clave from public.empresas where id = (p_valor #>> '{}')::uuid))
    when p_campo = 'contrato_id' then
      to_jsonb((select operacion from public.contratos where id = (p_valor #>> '{}')::uuid))
    when p_campo = 'ubicacion_id' then
      to_jsonb((select nombre from public.ubicaciones where id = (p_valor #>> '{}')::uuid))
    when p_campo = 'subcategoria_id' then
      to_jsonb((select nombre from public.subcategorias where id = (p_valor #>> '{}')::uuid))
    else p_valor
  end;
$$;

create function public.historial_equipo(p_equipo uuid)
returns table (
  id bigint,
  tipo public.tipo_movimiento,
  estado_anterior public.estado_equipo,
  estado_nuevo public.estado_equipo,
  cambios jsonb,
  nota text,
  creado_en timestamptz,
  autor text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.tipo,
    m.estado_anterior,
    m.estado_nuevo,
    -- {"campo": [antes, después]} con los id de catálogos cambiados por su nombre.
    (select coalesce(jsonb_object_agg(c.key, jsonb_build_array(
              privado.nombre_referencia(c.key, c.value -> 0),
              privado.nombre_referencia(c.key, c.value -> 1))), '{}'::jsonb)
       from jsonb_each(m.cambios) c
      where c.key not in ('id', 'creado_en', 'creado_por')),
    m.nota,
    m.creado_en,
    coalesce(nullif(p.nombre, ''), p.email)
  from public.movimientos m
  left join public.perfiles p on p.id = m.usuario_id
  where m.equipo_id = p_equipo
    and privado.es_usuario_activo()
  order by m.creado_en desc, m.id desc;
$$;
revoke execute on function privado.nombre_referencia(text, jsonb) from public, anon, authenticated;
revoke execute on function public.historial_equipo(uuid) from public, anon;
grant execute on function public.historial_equipo(uuid) to authenticated;
