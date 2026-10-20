-- Pruebas de la Etapa 5: crear_asignacion, registrar_devolucion, actualizar_firmas y v_asignaciones.
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos (folios_control incluido).
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'lector.prueba@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin Prueba'
 where id = '00000000-0000-4000-8000-0000000000a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000000b2';

-- Datos propios de la prueba (la BD de desarrollo ya tiene el inventario real).
insert into public.ubicaciones (nombre, tipo)
select 'Almacén Sistemas', 'almacen'
where not exists (select 1 from public.ubicaciones where public.normalizar_texto(nombre) = 'almacen sistemas');
insert into public.ubicaciones (id, nombre, tipo) values ('00000000-0000-4000-8000-00000000f501', 'Sucursal Prueba E5', 'sucursal');
insert into public.unidades_negocio (id, nombre) values ('00000000-0000-4000-8000-00000000f502', 'Unidad Prueba E5');
insert into public.colaboradores (id, nombre_completo, puesto, ubicacion_id) values
  ('00000000-0000-4000-8000-0000000c0501', 'Colaborador Prueba E5', 'Asesor de ventas', '00000000-0000-4000-8000-00000000f501');
insert into public.colaboradores (id, nombre_completo, activo) values
  ('00000000-0000-4000-8000-0000000c0502', 'Colaborador Inactivo E5', false);

select set_config('app.contexto', 'importacion', true);
insert into public.equipos (id, categoria, serie, marca, modelo, estado, apartado_para, motivo_desactivacion) values
  ('00000000-0000-4000-8000-0000000e0501', 'laptop', 'PRB-E5-1', 'HP', 'ProBook', 'stock', null, null),
  ('00000000-0000-4000-8000-0000000e0502', 'monitor', 'PRB-E5-2', 'HP', 'P24v', 'apartado', 'Rossy', null),
  ('00000000-0000-4000-8000-0000000e0503', 'laptop', 'PRB-E5-3', 'HP', 'ProBook', 'desactivado', null, 'Vendido'),
  ('00000000-0000-4000-8000-0000000e0504', 'desktop', 'PRB-E5-4', 'HP', 'ProDesk', 'pendiente', null, null);
select set_config('app.contexto', '', true);

-- ── Lector: no registra entregas ──────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', array['00000000-0000-4000-8000-0000000e0501']::uuid[]);
  raise exception 'FALLA: un Lector registró una entrega';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.asignaciones (folio, colaborador_id) values ('X', '00000000-0000-4000-8000-0000000c0501');
  raise exception 'FALLA: un Lector insertó una asignación directamente';
exception when insufficient_privilege then null; end $$;

-- ── Administrador ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', '{}'::uuid[]);
  raise exception 'FALLA: entrega sin equipos';
exception when check_violation then null; end $$;
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', array['00000000-0000-4000-8000-0000000e0501']::uuid[],
                                  current_date + 30);
  raise exception 'FALLA: entrega con fecha futura';
exception when check_violation then null; end $$;
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0502', array['00000000-0000-4000-8000-0000000e0501']::uuid[]);
  raise exception 'FALLA: entrega a un colaborador dado de baja';
exception when check_violation then null; end $$;

-- Atómica: un equipo no asignable hace fallar toda la entrega y nada se guarda.
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501',
    array['00000000-0000-4000-8000-0000000e0501', '00000000-0000-4000-8000-0000000e0503']::uuid[]);
  raise exception 'FALLA: se entregó un equipo desactivado';
exception when check_violation then null; end $$;
do $$ begin
  if (select estado from public.equipos where id = '00000000-0000-4000-8000-0000000e0501') <> 'stock'
     or exists (select 1 from public.asignacion_equipos where equipo_id = '00000000-0000-4000-8000-0000000e0501') then
    raise exception 'FALLA: la entrega fallida dejó cambios';
  end if;
end $$;

-- Apartado sin confirmación: se rechaza.
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', array['00000000-0000-4000-8000-0000000e0502']::uuid[]);
  raise exception 'FALLA: se entregó un Apartado sin confirmar';
exception when check_violation then null; end $$;

-- Entrega correcta: Stock + Apartado confirmado, con unidad de negocio pedida en el asistente.
create temp table _r on commit drop as
select public.crear_asignacion(
  '00000000-0000-4000-8000-0000000c0501',
  array['00000000-0000-4000-8000-0000000e0501', '00000000-0000-4000-8000-0000000e0502']::uuid[],
  null, 'Tecate BC', 'Admin Prueba', 'Analista de Sistemas', null, null, 'Entrega de prueba',
  array['00000000-0000-4000-8000-0000000e0502']::uuid[], '00000000-0000-4000-8000-00000000f502') as r;

do $$ declare v jsonb := (select r from _r); a record; begin
  if v ->> 'folio' !~ '^CC-\d{2}-\d{4}$' then raise exception 'FALLA: folio % sin formato CC-AA-NNNN', v ->> 'folio'; end if;
  select * into a from public.asignaciones where id = (v ->> 'id')::uuid;
  if a.firma_recibe_nombre <> 'Colaborador Prueba E5' or a.firma_recibe_puesto <> 'Asesor de ventas'
     or a.lugar_expedicion <> 'Tecate BC' or a.entregado_por <> '00000000-0000-4000-8000-0000000000a1'
     or a.datos_colaborador ->> 'unidad_negocio' <> 'Unidad Prueba E5'
     or a.datos_colaborador ->> 'ubicacion' <> 'Sucursal Prueba E5' then
    raise exception 'FALLA: datos de la asignación incorrectos (%)', row_to_json(a);
  end if;
  if exists (select 1 from public.equipos where id in ('00000000-0000-4000-8000-0000000e0501', '00000000-0000-4000-8000-0000000e0502')
              and (estado <> 'asignado' or ubicacion_id <> '00000000-0000-4000-8000-00000000f501' or apartado_para is not null)) then
    raise exception 'FALLA: los equipos no quedaron asignados en la ubicación del colaborador';
  end if;
  if (select count(*) from public.movimientos where asignacion_id = (v ->> 'id')::uuid and tipo = 'asignacion') <> 2 then
    raise exception 'FALLA: faltan movimientos de entrega';
  end if;
  if (select unidad_negocio_id from public.colaboradores where id = '00000000-0000-4000-8000-0000000c0501')
     is distinct from '00000000-0000-4000-8000-00000000f502' then
    raise exception 'FALLA: no se guardó la unidad de negocio del colaborador';
  end if;
end $$;

-- El mismo equipo no se entrega dos veces.
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', array['00000000-0000-4000-8000-0000000e0501']::uuid[]);
  raise exception 'FALLA: doble entrega del mismo equipo';
exception when check_violation then null; end $$;

-- Fecha pasada (regularizar un Pendiente ya entregado) y folio consecutivo sin huecos.
do $$ declare v jsonb; f1 int; f2 int; begin
  v := public.crear_asignacion('00000000-0000-4000-8000-0000000c0501', array['00000000-0000-4000-8000-0000000e0504']::uuid[],
                               current_date - 40);
  f1 := split_part((select r ->> 'folio' from _r), '-', 3)::int;
  f2 := split_part(v ->> 'folio', '-', 3)::int;
  if f2 <> f1 + 1 then raise exception 'FALLA: folios no consecutivos (% → %)', f1, f2; end if;
  if (select fecha_entrega from public.asignaciones where id = (v ->> 'id')::uuid) <> current_date - 40 then
    raise exception 'FALLA: no respetó la fecha pasada';
  end if;
end $$;

-- ── Devolución ────────────────────────────────────────────────────────────────
-- Dañado sin observaciones: el CHECK del renglón lo rechaza y nada cambia.
do $$ begin
  perform public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0501","destino":"mantenimiento","condicion":"danado"}]');
  raise exception 'FALLA: devolución Dañado sin observaciones';
exception when check_violation then null; end $$;
do $$ begin
  perform public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0503","destino":"stock"}]');
  raise exception 'FALLA: devolvió un equipo que no está en la asignación';
exception when check_violation then null; end $$;
do $$ begin
  perform public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0501","destino":"desactivado"}]');
  raise exception 'FALLA: devolución normal con destino de incidencia';
exception when check_violation then null; end $$;

-- Parcial a Mantenimiento con estado físico: actualiza equipo, ubicación y deja la asignación abierta.
do $$ declare v jsonb; e record; begin
  v := public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0501","destino":"mantenimiento","condicion":"danado","observaciones":"Pantalla rota."}]');
  if v ->> 'folio' !~ '^CD-\d{2}-\d{4}$' then raise exception 'FALLA: folio de devolución %', v ->> 'folio'; end if;
  select * into e from public.equipos where id = '00000000-0000-4000-8000-0000000e0501';
  if e.estado <> 'mantenimiento' or e.condicion <> 'danado' or e.observaciones_estado <> 'Pantalla rota.'
     or public.normalizar_texto((select nombre from public.ubicaciones where id = e.ubicacion_id)) <> 'almacen sistemas' then
    raise exception 'FALLA: el equipo devuelto quedó mal (%)', row_to_json(e);
  end if;
  if (select cerrada_en from public.asignaciones where id = (select (r ->> 'id')::uuid from _r)) is not null then
    raise exception 'FALLA: una devolución parcial cerró la asignación';
  end if;
  if not exists (select 1 from public.movimientos where devolucion_id = (v ->> 'id')::uuid and tipo = 'devolucion'
                  and cambios -> 'condicion' = '[null, "danado"]'::jsonb) then
    raise exception 'FALLA: el historial no registra el estado físico de la devolución';
  end if;
end $$;

-- Cierre por incidencia: motivo obligatorio; cierra la asignación con folio CI y sin consumir CD.
do $$ begin
  perform public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0502","destino":"desactivado"}]', null, null, null, null, null, null, null, true);
  raise exception 'FALLA: cierre por incidencia sin motivo';
exception when check_violation then null; end $$;
do $$ declare v jsonb; begin
  v := public.registrar_devolucion((select (r ->> 'id')::uuid from _r),
    '[{"equipo":"00000000-0000-4000-8000-0000000e0502","destino":"desactivado"}]', null, null, null, null, null, null, null,
    true, 'Robado en tienda');
  if v ->> 'folio' !~ '^CI-' then raise exception 'FALLA: el cierre no usó folio CI (%)', v ->> 'folio'; end if;
  if (select motivo_desactivacion from public.equipos where id = '00000000-0000-4000-8000-0000000e0502') <> 'Robado en tienda' then
    raise exception 'FALLA: el motivo no llegó al equipo';
  end if;
  if (select cerrada_en from public.asignaciones where id = (select (r ->> 'id')::uuid from _r)) is null then
    raise exception 'FALLA: la asignación no se cerró al devolver el último equipo';
  end if;
  if not exists (select 1 from public.movimientos where devolucion_id = (v ->> 'id')::uuid
                  and tipo = 'cierre_incidencia' and nota = 'Robado en tienda') then
    raise exception 'FALLA: el movimiento de cierre no lleva el motivo';
  end if;
end $$;

-- v_asignaciones y actualizar_firmas.
do $$ declare a record; begin
  select * into a from public.v_asignaciones where id = (select (r ->> 'id')::uuid from _r);
  if a.activa or a.equipos_activos <> 0 or a.equipos_devueltos <> 2 or a.busqueda not like '%prb-e5-1%' then
    raise exception 'FALLA: v_asignaciones incorrecta (%)', row_to_json(a);
  end if;
end $$;
select public.actualizar_firmas('asignacion', (select (r ->> 'id')::uuid from _r), 'Tijuana BC',
  'Otra Persona', 'Jefe de Sistemas', 'Colaborador Prueba E5', 'Gerente');
do $$ begin
  if (select firma_entrega_nombre || '/' || firma_recibe_puesto from public.asignaciones
       where id = (select (r ->> 'id')::uuid from _r)) <> 'Otra Persona/Gerente' then
    raise exception 'FALLA: actualizar_firmas no guardó los cambios';
  end if;
end $$;

-- El Lector no edita firmas.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
do $$ begin
  perform public.actualizar_firmas('asignacion', (select (r ->> 'id')::uuid from _r), 'X', 'X', 'X', 'X', 'X');
  raise exception 'FALLA: un Lector editó firmas';
exception when insufficient_privilege then null; end $$;

reset role;
select 'OK' as resultado;
rollback;
