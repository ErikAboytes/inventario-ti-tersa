-- Ajustes · Las entregas importadas del Excel no tienen fecha real: se guardaron con la fecha de la migración.
-- fecha_conocida = false hace que la carta deje la fecha en blanco y el detalle diga «Desconocida» hasta que
-- se capture en «Datos de firma».

alter table public.asignaciones add column fecha_conocida boolean not null default true;
comment on column public.asignaciones.fecha_conocida is
  'false = importada del Excel sin fecha real; fecha_entrega es la de la migración. Se vuelve true al capturarla.';

set session_replication_role = replica;
update public.asignaciones set fecha_conocida = false where es_historica;
reset session_replication_role;

create or replace view public.v_asignaciones
with (security_invoker = true)
as
select
  a.id,
  a.folio,
  a.fecha_entrega,
  a.colaborador_id,
  co.nombre_completo as colaborador_nombre,
  a.datos_colaborador ->> 'ubicacion' as ubicacion,
  a.es_historica,
  a.cerrada_en,
  a.cerrada_en is null as activa,
  count(ae.id) filter (where ae.devolucion_id is null)::int as equipos_activos,
  count(ae.id) filter (where ae.devolucion_id is not null)::int as equipos_devueltos,
  a.creado_en,
  public.normalizar_texto(concat_ws(' ', a.folio, co.nombre_completo, co.numero_empleado,
    string_agg(e.serie, ' '))) as busqueda,
  a.fecha_conocida
from public.asignaciones a
join public.colaboradores co on co.id = a.colaborador_id
left join public.asignacion_equipos ae on ae.asignacion_id = a.id
left join public.equipos e on e.id = ae.equipo_id
group by a.id, co.id;

create or replace function public.actualizar_firmas(
  p_tipo text,
  p_id uuid,
  p_lugar text,
  p_firma_entrega_nombre text,
  p_firma_entrega_puesto text,
  p_firma_recibe_nombre text,
  p_firma_recibe_puesto text,
  -- Solo asignaciones. Si cambia, queda un movimiento por equipo en el historial.
  p_fecha date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior date;
  v_conocida boolean;
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede editar los datos de firma.' using errcode = '42501';
  end if;
  if p_tipo = 'asignacion' then
    select fecha_entrega into v_anterior from public.asignaciones where id = p_id for update;
    if not found then
      raise exception 'No se encontró el documento.' using errcode = 'no_data_found';
    end if;
    -- Las importadas del Excel no tienen fecha real: capturarla la vuelve conocida aunque sea la misma.
    select fecha_conocida into v_conocida from public.asignaciones where id = p_id;
    if p_fecha is not null and (p_fecha <> v_anterior or not v_conocida) then
      perform privado.validar_fecha_asignacion(p_fecha);
    end if;
    update public.asignaciones
       set lugar_expedicion = coalesce(nullif(btrim(p_lugar), ''), lugar_expedicion),
           firma_entrega_nombre = nullif(btrim(p_firma_entrega_nombre), ''),
           firma_entrega_puesto = nullif(btrim(p_firma_entrega_puesto), ''),
           firma_recibe_nombre = nullif(btrim(p_firma_recibe_nombre), ''),
           firma_recibe_puesto = nullif(btrim(p_firma_recibe_puesto), ''),
           fecha_entrega = coalesce(p_fecha, fecha_entrega),
           fecha_conocida = fecha_conocida or p_fecha is not null
     where id = p_id;
    if p_fecha is not null and (p_fecha <> v_anterior or not v_conocida) then
      insert into public.movimientos
        (equipo_id, tipo, estado_anterior, estado_nuevo, asignacion_id, nota, usuario_id)
      select ae.equipo_id, 'cambio_fecha_asignacion', e.estado, e.estado, p_id,
             'Fecha de asignación: ' || case when v_conocida then to_char(v_anterior, 'DD/MM/YYYY') else 'desconocida' end
               || ' → ' || to_char(p_fecha, 'DD/MM/YYYY'),
             auth.uid()
        from public.asignacion_equipos ae
        join public.equipos e on e.id = ae.equipo_id
       where ae.asignacion_id = p_id;
    end if;
  elsif p_tipo = 'devolucion' then
    update public.devoluciones
       set lugar_expedicion = coalesce(nullif(btrim(p_lugar), ''), lugar_expedicion),
           firma_entrega_nombre = nullif(btrim(p_firma_entrega_nombre), ''),
           firma_entrega_puesto = nullif(btrim(p_firma_entrega_puesto), ''),
           firma_recibe_nombre = nullif(btrim(p_firma_recibe_nombre), ''),
           firma_recibe_puesto = nullif(btrim(p_firma_recibe_puesto), '')
     where id = p_id;
    if not found then
      raise exception 'No se encontró el documento.' using errcode = 'no_data_found';
    end if;
  else
    raise exception 'Tipo de documento no válido: %', p_tipo using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

