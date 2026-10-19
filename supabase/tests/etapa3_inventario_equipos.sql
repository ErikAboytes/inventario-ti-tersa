-- Pruebas de la Etapa 3: serie interna, cambio de estado (D-01), historial y búsqueda de la lista.
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

-- nextval() no se deshace con ROLLBACK: se guarda la secuencia de SINSERIE y se restaura al final,
-- para que la prueba no consuma números de los equipos reales.
create temp table _secuencia on commit drop as
  select last_value, is_called from public.equipos_sinserie_seq;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'lector.prueba@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin Prueba'
 where id = '00000000-0000-4000-8000-0000000000a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000000b2';

-- ── Administrador ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

insert into public.ubicaciones (id, nombre, tipo)
values ('00000000-0000-4000-8000-0000000c0001', 'Ubicación de Prueba Etapa 3', 'almacen');

-- Sin serie visible: el sistema asigna SINSERIE-NNNN.
insert into public.equipos (id, categoria, serie, marca, modelo)
values ('00000000-0000-4000-8000-0000000e0001', 'monitor', '  ', 'HP', 'V244h');
do $$ begin
  if (select serie from public.equipos where id = '00000000-0000-4000-8000-0000000e0001') !~ '^SINSERIE-\d{4,}$' then
    raise exception 'FALLA: no se asignó la serie interna';
  end if;
end $$;

insert into public.equipos (id, categoria, serie, marca, modelo, numero_producto)
values ('00000000-0000-4000-8000-0000000e0002', 'laptop', 'prb-et3-1', 'HP', 'ProBook 440 G8', 'W6B92LT#ABM');

-- La búsqueda de la lista ignora acentos y mayúsculas e incluye el número de producto.
do $$ begin
  if not exists (select 1 from public.v_equipos
                  where id = '00000000-0000-4000-8000-0000000e0002'
                    and busqueda like '%probook%' and busqueda like '%w6b92lt#abm%' and busqueda like '%prb-et3-1%') then
    raise exception 'FALLA: la columna busqueda de v_equipos no está normalizada';
  end if;
end $$;

-- Apartado exige etiqueta; «asignado» no se elige a mano.
do $$ begin
  perform public.cambiar_estado('00000000-0000-4000-8000-0000000e0002', 'apartado');
  raise exception 'FALLA: apartado sin etiqueta';
exception when check_violation then null; end $$;
do $$ begin
  perform public.cambiar_estado('00000000-0000-4000-8000-0000000e0002', 'asignado');
  raise exception 'FALLA: asignado a mano';
exception when check_violation then null; end $$;
do $$ begin
  perform public.cambiar_estado('00000000-0000-4000-8000-0000000e0999', 'stock');
  raise exception 'FALLA: equipo inexistente';
exception when no_data_found then null; end $$;

select public.cambiar_estado('00000000-0000-4000-8000-0000000e0002', 'apartado', ' Rossy Insunza ', null, 'Para el nuevo ingreso');
select public.cambiar_estado('00000000-0000-4000-8000-0000000e0002', 'desactivado', null, 'Vendido a CGE');
update public.equipos set ubicacion_id = '00000000-0000-4000-8000-0000000c0001'
 where id = '00000000-0000-4000-8000-0000000e0002';

do $$ declare r record; begin
  select apartado_para, motivo_desactivacion, estado into r
    from public.equipos where id = '00000000-0000-4000-8000-0000000e0002';
  if r.estado <> 'desactivado' or r.motivo_desactivacion <> 'Vendido a CGE' or r.apartado_para is not null then
    raise exception 'FALLA: estado final incorrecto (%)', r;
  end if;
end $$;

-- ── Lector: no cambia estados, pero sí ve el historial con autor y nombres ────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$ begin
  perform public.cambiar_estado('00000000-0000-4000-8000-0000000e0001', 'mantenimiento');
  raise exception 'FALLA: el Lector cambió un estado';
exception when insufficient_privilege then null; end $$;

do $$ declare
  h record;
  n int;
begin
  select count(*) into n from public.historial_equipo('00000000-0000-4000-8000-0000000e0002');
  if n <> 4 then raise exception 'FALLA: se esperaban 4 movimientos y hay %', n; end if;

  select * into h from public.historial_equipo('00000000-0000-4000-8000-0000000e0002')
   where tipo = 'cambio_estado' and estado_nuevo = 'apartado';
  if h.nota <> 'Para el nuevo ingreso' or h.autor <> 'Admin Prueba'
     or h.cambios -> 'apartado_para' <> '[null, "Rossy Insunza"]'::jsonb then
    raise exception 'FALLA: movimiento de apartado incorrecto (%)', h;
  end if;

  -- La nota no se queda pegada al siguiente cambio de la misma transacción.
  select * into h from public.historial_equipo('00000000-0000-4000-8000-0000000e0002')
   where estado_nuevo = 'desactivado' and tipo = 'cambio_estado';
  if h.nota is not null then raise exception 'FALLA: la nota se repitió (%)', h.nota; end if;

  select * into h from public.historial_equipo('00000000-0000-4000-8000-0000000e0002') where tipo = 'edicion';
  if h.cambios -> 'ubicacion_id' <> '[null, "Ubicación de Prueba Etapa 3"]'::jsonb then
    raise exception 'FALLA: la ubicación no se tradujo a su nombre (%)', h.cambios;
  end if;
end $$;

reset role;
-- Un usuario inactivo no ve historial.
update public.perfiles set activo = false where id = '00000000-0000-4000-8000-0000000000b2';
set local role authenticated;
do $$ begin
  if exists (select 1 from public.historial_equipo('00000000-0000-4000-8000-0000000e0002')) then
    raise exception 'FALLA: un usuario inactivo vio el historial';
  end if;
end $$;

reset role;
select setval('public.equipos_sinserie_seq', last_value, is_called) from _secuencia;
select 'OK' as resultado;
rollback;
