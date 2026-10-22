-- Ajustes · Una sola «Fecha de asignación» (docs/02, ajustes posteriores a la Etapa 9).
-- asignaciones.fecha_entrega es la fecha de la carta custodia: puede ser hasta un año antes o después de hoy
-- y se puede corregir en «Datos de firma». Cuándo se registró queda en movimientos.creado_en y en
-- asignaciones.creado_en.

alter type public.tipo_movimiento add value if not exists 'cambio_fecha_asignacion';

create function privado.validar_fecha_asignacion(p_fecha date)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_min date := (privado.hoy() - interval '1 year')::date;
  v_max date := (privado.hoy() + interval '1 year')::date;
begin
  if p_fecha is null or p_fecha < v_min or p_fecha > v_max then
    raise exception 'La fecha de asignación debe estar entre el % y el %.',
      to_char(v_min, 'DD/MM/YYYY'), to_char(v_max, 'DD/MM/YYYY')
      using errcode = 'check_violation', constraint = 'asignacion_fecha_fuera_de_rango';
  end if;
end;
$$;
revoke execute on function privado.validar_fecha_asignacion(date) from public, anon;
grant execute on function privado.validar_fecha_asignacion(date) to authenticated;

create or replace function public.crear_asignacion(
  p_colaborador uuid,
  p_equipos uuid[],
  p_fecha date default null,
  p_lugar text default 'Tijuana BC',
  p_firma_entrega_nombre text default null,
  p_firma_entrega_puesto text default null,
  p_firma_recibe_nombre text default null,
  p_firma_recibe_puesto text default null,
  p_observaciones text default null,
  -- Equipos Apartados que el usuario confirmó entregar (docs/01 §4.1, D1).
  p_apartados_confirmados uuid[] default '{}',
  -- Si el colaborador no tiene unidad de negocio, el asistente la pide y se guarda aquí (doc 04 P-21).
  p_unidad_negocio uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_colab public.colaboradores;
  v_equipo record;
  v_id uuid;
  v_folio text;
  v_fecha date := coalesce(p_fecha, privado.hoy());
  v_total int;
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede registrar entregas.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_equipos), 0) = 0 then
    raise exception 'Agrega al menos un equipo.'
      using errcode = 'check_violation', constraint = 'asignacion_sin_equipos';
  end if;
  -- La fecha de asignación es la de la carta: hasta un año antes o después de hoy. El historial guarda
  -- aparte cuándo se registró (movimientos.creado_en).
  perform privado.validar_fecha_asignacion(v_fecha);

  select * into v_colab from public.colaboradores where id = p_colaborador for update;
  if not found then
    raise exception 'No se encontró el colaborador.' using errcode = 'no_data_found';
  end if;
  if not v_colab.activo then
    raise exception 'El colaborador está dado de baja.'
      using errcode = 'check_violation', constraint = 'asignacion_colaborador_inactivo';
  end if;
  if p_unidad_negocio is not null and v_colab.unidad_negocio_id is null then
    update public.colaboradores set unidad_negocio_id = p_unidad_negocio where id = p_colaborador
      returning * into v_colab;
  end if;

  -- Bloqueo en orden fijo: dos entregas simultáneas del mismo equipo se esperan en lugar de cruzarse.
  select count(*) into v_total from (
    select 1 from public.equipos where id = any (p_equipos) order by id for update
  ) bloqueados;
  if v_total <> (select count(distinct x) from unnest(p_equipos) x) then
    raise exception 'Uno de los equipos no existe.' using errcode = 'no_data_found';
  end if;

  for v_equipo in
    select e.id, e.serie, e.estado from public.equipos e where e.id = any (p_equipos) order by e.serie
  loop
    if v_equipo.estado not in ('stock', 'mantenimiento', 'no_localizado', 'pendiente', 'apartado') then
      raise exception 'El equipo % no se puede entregar: está «%».', v_equipo.serie, v_equipo.estado
        using errcode = 'check_violation', constraint = 'asignacion_equipo_no_asignable';
    end if;
    if v_equipo.estado = 'apartado' and not v_equipo.id = any (p_apartados_confirmados) then
      raise exception 'El equipo % está apartado: confirma que se entrega a esa persona o destino.', v_equipo.serie
        using errcode = 'check_violation', constraint = 'asignacion_apartado_sin_confirmar';
    end if;
  end loop;

  v_folio := public.siguiente_folio('CC');
  insert into public.asignaciones (
    folio, colaborador_id, fecha_entrega, entregado_por, lugar_expedicion, datos_colaborador,
    firma_entrega_nombre, firma_entrega_puesto, firma_recibe_nombre, firma_recibe_puesto, observaciones
  )
  values (
    v_folio, p_colaborador, v_fecha, auth.uid(), coalesce(nullif(btrim(p_lugar), ''), 'Tijuana BC'),
    -- Instantánea para la carta: si el colaborador cambia después, la carta no.
    jsonb_build_object(
      'nombre', v_colab.nombre_completo,
      'puesto', v_colab.puesto,
      'numero_empleado', v_colab.numero_empleado,
      'unidad_negocio', (select nombre from public.unidades_negocio where id = v_colab.unidad_negocio_id),
      'ubicacion', (select nombre from public.ubicaciones where id = v_colab.ubicacion_id),
      'empresa', (select clave from public.empresas where id = v_colab.empresa_id)
    ),
    nullif(btrim(p_firma_entrega_nombre), ''), nullif(btrim(p_firma_entrega_puesto), ''),
    coalesce(nullif(btrim(p_firma_recibe_nombre), ''), v_colab.nombre_completo),
    coalesce(nullif(btrim(p_firma_recibe_puesto), ''), v_colab.puesto),
    nullif(btrim(p_observaciones), '')
  )
  returning id into v_id;

  insert into public.asignacion_equipos (asignacion_id, equipo_id)
  select v_id, x from (select distinct unnest(p_equipos) x) d;

  -- El trigger registra un movimiento «asignacion» por equipo con este contexto.
  perform set_config('app.contexto', 'asignacion', true);
  perform set_config('app.asignacion_id', v_id::text, true);
  update public.equipos
     set estado = 'asignado',
         ubicacion_id = coalesce(v_colab.ubicacion_id, ubicacion_id),
         ubicacion_detalle = case when v_colab.ubicacion_id is null then ubicacion_detalle end
   where id = any (p_equipos);
  perform set_config('app.contexto', '', true);
  perform set_config('app.asignacion_id', '', true);

  return jsonb_build_object('id', v_id, 'folio', v_folio);
end;
$$;


create or replace function public.registrar_devolucion(
  p_asignacion uuid,
  p_items jsonb,
  p_fecha date default null,
  p_lugar text default 'Tijuana BC',
  p_firma_entrega_nombre text default null,
  p_firma_entrega_puesto text default null,
  p_firma_recibe_nombre text default null,
  p_firma_recibe_puesto text default null,
  p_observaciones text default null,
  -- Extravío o baja de equipos asignados: destino No localizado o Desactivado, motivo obligatorio, sin carta.
  p_cierre_incidencia boolean default false,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asig public.asignaciones;
  v_item record;
  v_id uuid;
  v_folio text;
  v_fecha date := coalesce(p_fecha, privado.hoy());
  v_almacen uuid;
  v_motivo text := nullif(btrim(p_motivo), '');
  v_destinos text[] := case when p_cierre_incidencia then array['no_localizado', 'desactivado']
                            else array['stock', 'mantenimiento'] end;
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede registrar devoluciones.' using errcode = '42501';
  end if;
  select * into v_asig from public.asignaciones where id = p_asignacion for update;
  if not found then
    raise exception 'No se encontró la asignación.' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Marca al menos un equipo.'
      using errcode = 'check_violation', constraint = 'devolucion_sin_equipos';
  end if;
  -- No antes de la asignación; si la asignación tiene fecha futura, desde hoy.
  if v_fecha > privado.hoy() or v_fecha < least(v_asig.fecha_entrega, privado.hoy()) then
    raise exception 'La fecha debe estar entre el % y hoy.',
      to_char(least(v_asig.fecha_entrega, privado.hoy()), 'DD/MM/YYYY')
      using errcode = 'check_violation', constraint = 'devolucion_fecha_invalida';
  end if;
  if p_cierre_incidencia and v_motivo is null then
    raise exception 'Indica el motivo del cierre por incidencia.'
      using errcode = 'check_violation', constraint = 'devolucion_cierre_sin_motivo';
  end if;

  -- Validación de todos los renglones antes de escribir: si uno falla, no se guarda nada.
  for v_item in
    select i.equipo, i.destino, e.serie, ae.id as renglon
      from jsonb_to_recordset(p_items) as i(equipo uuid, destino text)
      left join public.equipos e on e.id = i.equipo
      left join public.asignacion_equipos ae
        on ae.asignacion_id = p_asignacion and ae.equipo_id = i.equipo and ae.devolucion_id is null
  loop
    if v_item.renglon is null then
      raise exception 'El equipo % no está activo en esta asignación.', coalesce(v_item.serie, v_item.equipo::text)
        using errcode = 'check_violation', constraint = 'devolucion_equipo_no_activo';
    end if;
    if not v_item.destino = any (v_destinos) then
      raise exception 'Destino «%» no válido para el equipo %.', v_item.destino, v_item.serie
        using errcode = 'check_violation', constraint = 'devolucion_destino_invalido';
    end if;
  end loop;
  perform 1 from public.asignacion_equipos
   where asignacion_id = p_asignacion and devolucion_id is null order by id for update;

  v_folio := public.siguiente_folio(case when p_cierre_incidencia then 'CI' else 'CD' end);
  insert into public.devoluciones (
    folio, asignacion_id, fecha, lugar_expedicion, recibido_por, firma_entrega_nombre, firma_entrega_puesto,
    firma_recibe_nombre, firma_recibe_puesto, observaciones, es_cierre_incidencia
  )
  values (
    v_folio, p_asignacion, v_fecha, coalesce(nullif(btrim(p_lugar), ''), 'Tijuana BC'), auth.uid(),
    -- En la devolución entrega el colaborador y recibe Sistemas.
    coalesce(nullif(btrim(p_firma_entrega_nombre), ''), v_asig.datos_colaborador ->> 'nombre'),
    coalesce(nullif(btrim(p_firma_entrega_puesto), ''), v_asig.datos_colaborador ->> 'puesto'),
    nullif(btrim(p_firma_recibe_nombre), ''), nullif(btrim(p_firma_recibe_puesto), ''),
    coalesce(nullif(btrim(p_observaciones), ''), v_motivo), p_cierre_incidencia
  )
  returning id into v_id;

  -- El CHECK de asignacion_equipos exige observaciones con Con detalles o Dañado.
  update public.asignacion_equipos ae
     set devolucion_id = v_id,
         destino_devolucion = i.destino::public.destino_devolucion,
         condicion_devolucion = i.condicion::public.condicion_equipo,
         observaciones_devolucion = nullif(btrim(i.observaciones), '')
    from jsonb_to_recordset(p_items) as i(equipo uuid, destino text, condicion text, observaciones text)
   where ae.asignacion_id = p_asignacion and ae.equipo_id = i.equipo and ae.devolucion_id is null;

  -- Lo que regresa a Stock o Mantenimiento va al almacén de Sistemas (docs/01 §4.3).
  select id into v_almacen from public.ubicaciones
   where public.normalizar_texto(nombre) = 'almacen sistemas' limit 1;

  perform set_config('app.contexto', case when p_cierre_incidencia then 'cierre_incidencia' else 'devolucion' end, true);
  perform set_config('app.asignacion_id', p_asignacion::text, true);
  perform set_config('app.devolucion_id', v_id::text, true);
  perform set_config('app.nota', coalesce(v_motivo, ''), true);
  update public.equipos e
     set estado = i.destino::public.estado_equipo,
         ubicacion_id = case when i.destino in ('stock', 'mantenimiento') then coalesce(v_almacen, e.ubicacion_id)
                             else e.ubicacion_id end,
         ubicacion_detalle = case when i.destino in ('stock', 'mantenimiento') and v_almacen is not null then null
                                  else e.ubicacion_detalle end,
         motivo_desactivacion = case when i.destino = 'desactivado' then v_motivo end,
         -- Sin condición en el renglón, el equipo conserva su estado físico.
         condicion = coalesce(i.condicion::public.condicion_equipo, e.condicion),
         observaciones_estado = case when i.condicion is null then e.observaciones_estado
                                     else nullif(btrim(i.observaciones), '') end
    from jsonb_to_recordset(p_items) as i(equipo uuid, destino text, condicion text, observaciones text)
   where e.id = i.equipo;
  perform set_config('app.contexto', '', true);
  perform set_config('app.asignacion_id', '', true);
  perform set_config('app.devolucion_id', '', true);
  perform set_config('app.nota', '', true);

  if not exists (select 1 from public.asignacion_equipos
                  where asignacion_id = p_asignacion and devolucion_id is null) then
    update public.asignaciones set cerrada_en = now() where id = p_asignacion;
  end if;

  return jsonb_build_object('id', v_id, 'folio', v_folio);
end;
$$;


-- ── «Datos de firma»: también corrige la fecha de asignación ─────────────────────────────────────
drop function public.actualizar_firmas(text, uuid, text, text, text, text, text);
create function public.actualizar_firmas(
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
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede editar los datos de firma.' using errcode = '42501';
  end if;
  if p_tipo = 'asignacion' then
    select fecha_entrega into v_anterior from public.asignaciones where id = p_id for update;
    if not found then
      raise exception 'No se encontró el documento.' using errcode = 'no_data_found';
    end if;
    if p_fecha is not null and p_fecha <> v_anterior then
      perform privado.validar_fecha_asignacion(p_fecha);
    end if;
    update public.asignaciones
       set lugar_expedicion = coalesce(nullif(btrim(p_lugar), ''), lugar_expedicion),
           firma_entrega_nombre = nullif(btrim(p_firma_entrega_nombre), ''),
           firma_entrega_puesto = nullif(btrim(p_firma_entrega_puesto), ''),
           firma_recibe_nombre = nullif(btrim(p_firma_recibe_nombre), ''),
           firma_recibe_puesto = nullif(btrim(p_firma_recibe_puesto), ''),
           fecha_entrega = coalesce(p_fecha, fecha_entrega)
     where id = p_id;
    if p_fecha is not null and p_fecha <> v_anterior then
      insert into public.movimientos
        (equipo_id, tipo, estado_anterior, estado_nuevo, asignacion_id, nota, usuario_id)
      select ae.equipo_id, 'cambio_fecha_asignacion', e.estado, e.estado, p_id,
             'Fecha de asignación: ' || to_char(v_anterior, 'DD/MM/YYYY') || ' → ' || to_char(p_fecha, 'DD/MM/YYYY'),
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
revoke execute on function public.actualizar_firmas(text, uuid, text, text, text, text, text, date) from public, anon;
grant execute on function public.actualizar_firmas(text, uuid, text, text, text, text, text, date) to authenticated;
