-- Pruebas de la «Fecha de asignación»: ±1 año, devolución de una asignación con fecha futura y corrección
-- de la fecha en «Datos de firma» con su movimiento. Transacción con ROLLBACK: no deja datos.
-- Cada fallo lanza «FALLA: …»; si todo pasa devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000fa01', 'admin.fecha@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000fb02', 'lector.fecha@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin Fecha'
 where id = '00000000-0000-4000-8000-00000000fa01';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-00000000fb02';

insert into public.colaboradores (id, nombre_completo) values
  ('00000000-0000-4000-8000-0000000cfa01', 'Colaborador Fecha');
insert into public.equipos (id, categoria, serie, marca, modelo, estado) values
  ('00000000-0000-4000-8000-0000000efa01', 'laptop', 'PRB-FECHA-1', 'HP', 'ProBook', 'stock'),
  ('00000000-0000-4000-8000-0000000efa02', 'laptop', 'PRB-FECHA-2', 'HP', 'ProBook', 'stock');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000fa01","role":"authenticated"}', true);
set local role authenticated;

-- Más de un año antes o después: no.
do $$ begin
  perform public.crear_asignacion('00000000-0000-4000-8000-0000000cfa01',
    array['00000000-0000-4000-8000-0000000efa01']::uuid[], privado.hoy() - 400);
  raise exception 'FALLA: aceptó una fecha de más de un año atrás';
exception when check_violation then null; end $$;

-- Una semana adelante: sí. Se guarda en la asignación; el movimiento se registra hoy.
create temp table t_asig on commit drop as
select (public.crear_asignacion('00000000-0000-4000-8000-0000000cfa01',
  array['00000000-0000-4000-8000-0000000efa01']::uuid[], privado.hoy() + 7) ->> 'id')::uuid as id;
do $$ begin
  if (select fecha_entrega from public.asignaciones where id = (select id from t_asig)) <> privado.hoy() + 7 then
    raise exception 'FALLA: no guardó la fecha de asignación futura';
  end if;
  if not exists (select 1 from public.movimientos where asignacion_id = (select id from t_asig)
                  and tipo = 'asignacion' and creado_en::date >= current_date - 1) then
    raise exception 'FALLA: el movimiento de asignación no se registró en la fecha real';
  end if;
end $$;

-- Una asignación con fecha futura se puede devolver hoy.
select public.registrar_devolucion((select id from t_asig),
  '[{"equipo":"00000000-0000-4000-8000-0000000efa01","destino":"stock"}]'::jsonb, privado.hoy(),
  'Tijuana BC', 'Colaborador Fecha', null, 'Admin Fecha', null);

-- Corregir la fecha en «Datos de firma» deja un movimiento por equipo.
create temp table t_asig2 on commit drop as
select (public.crear_asignacion('00000000-0000-4000-8000-0000000cfa01',
  array['00000000-0000-4000-8000-0000000efa02']::uuid[]) ->> 'id')::uuid as id;
select public.actualizar_firmas('asignacion', (select id from t_asig2), 'Tijuana BC', 'Admin Fecha', null,
  'Colaborador Fecha', null, privado.hoy() + 3);
do $$ begin
  if (select fecha_entrega from public.asignaciones where id = (select id from t_asig2)) <> privado.hoy() + 3 then
    raise exception 'FALLA: Datos de firma no corrigió la fecha';
  end if;
  if not exists (select 1 from public.movimientos where asignacion_id = (select id from t_asig2)
                  and equipo_id = '00000000-0000-4000-8000-0000000efa02'
                  and tipo = 'cambio_fecha_asignacion' and nota like 'Fecha de asignación: % → %') then
    raise exception 'FALLA: el cambio de fecha no quedó en el historial';
  end if;
end $$;
do $$ begin
  perform public.actualizar_firmas('asignacion', (select id from t_asig2), 'Tijuana BC', 'Admin Fecha', null,
    'Colaborador Fecha', null, privado.hoy() + 500);
  raise exception 'FALLA: corrigió a una fecha fuera de rango';
exception when check_violation then null; end $$;
reset role;

-- El Lector no corrige.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000fb02","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  perform public.actualizar_firmas('asignacion', (select id from t_asig2), 'Tijuana BC', 'X', null, 'Y', null,
    privado.hoy());
  raise exception 'FALLA: un Lector corrigió la fecha';
exception when insufficient_privilege then null; end $$;
reset role;

select 'OK' as resultado;
rollback;
