-- Pruebas del estado físico del equipo (condición + observaciones).
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'lector.prueba@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000000b2';

-- ── Administrador ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

-- Sin condición = «Sin revisar»; se permite.
insert into public.equipos (id, categoria, serie, marca, modelo)
values ('00000000-0000-4000-8000-0000000e0001', 'laptop', 'PRB-COND-1', 'HP', 'ProBook 440 G8');

-- «Buen estado» no exige observaciones.
update public.equipos set condicion = 'buen_estado' where id = '00000000-0000-4000-8000-0000000e0001';

-- «Con detalles» y «Dañado» exigen observaciones.
do $$ begin
  update public.equipos set condicion = 'con_detalles' where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: «con detalles» sin observaciones';
exception when check_violation then null; end $$;
do $$ begin
  update public.equipos set condicion = 'danado', observaciones_estado = '   ' where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: «dañado» con observaciones en blanco';
exception when check_violation then null; end $$;

update public.equipos
   set condicion = 'con_detalles',
       observaciones_estado = 'Ligero golpe en chasis y leves rayones en la pantalla. Sigue en estado funcional.'
 where id = '00000000-0000-4000-8000-0000000e0001';

-- Cada cambio queda en el historial con «antes → después».
do $$ declare r record; begin
  select count(*) filter (where cambios -> 'condicion' = '[null, "buen_estado"]'::jsonb) primera,
         count(*) filter (where cambios -> 'condicion' = '["buen_estado", "con_detalles"]'::jsonb
                            and cambios ? 'observaciones_estado') segunda
    into r from public.movimientos
   where equipo_id = '00000000-0000-4000-8000-0000000e0001' and tipo = 'edicion';
  if r.primera <> 1 or r.segunda <> 1 then
    raise exception 'FALLA: historial de condición incorrecto (%, %)', r.primera, r.segunda;
  end if;
end $$;

-- El renglón de devolución tiene la misma regla.
do $$ begin
  if (select data_type || '/' || udt_name from information_schema.columns
       where table_schema = 'public' and table_name = 'asignacion_equipos' and column_name = 'condicion_devolucion')
     <> 'USER-DEFINED/condicion_equipo' then
    raise exception 'FALLA: condicion_devolucion debe usar el enum condicion_equipo';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'asignacion_equipos_detalle_requiere_observaciones') then
    raise exception 'FALLA: falta la regla de observaciones en la devolución';
  end if;
end $$;

reset role;

-- ── Lector activo ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;

do $$ declare r record; begin
  select condicion, observaciones_estado into r from public.v_equipos where serie = 'PRB-COND-1';
  if r.condicion is distinct from 'con_detalles' or r.observaciones_estado is null then
    raise exception 'FALLA: el lector debe ver la condición en v_equipos';
  end if;
end $$;
do $$ declare n int; begin
  update public.equipos set condicion = 'danado', observaciones_estado = 'intento'
   where id = '00000000-0000-4000-8000-0000000e0001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: el lector pudo cambiar la condición'; end if;
end $$;

reset role;

select 'OK' as resultado;
rollback;
