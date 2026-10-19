-- Pruebas de la Etapa 1: permisos por rol y reglas del esquema.
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

-- Usuarios de prueba (el trigger de auth.users les crea perfil inactivo).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'lector.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000c3', 'inactivo.prueba@ejemplo.test');

do $$ begin
  if (select count(*) from public.perfiles where email like '%.prueba@ejemplo.test' and not activo and rol = 'lector') <> 3 then
    raise exception 'FALLA: los perfiles nuevos deben nacer inactivos y como lector';
  end if;
end $$;

update public.perfiles set activo = true, rol = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000000b2';

-- ── Administrador ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

insert into public.empresas (id, clave, razon_social) values ('00000000-0000-4000-8000-00000000e001', 'TST', 'Empresa de prueba');
insert into public.contratos (id, operacion, empresa_id) values ('00000000-0000-4000-8000-00000000c001', 'PRUEBA001', '00000000-0000-4000-8000-00000000e001');
insert into public.subcategorias (id, nombre) values ('00000000-0000-4000-8000-00000000d001', 'Tablet prueba');
insert into public.equipos (id, categoria, serie, marca, modelo, contrato_id)
values ('00000000-0000-4000-8000-0000000e0001', 'laptop', '  5cdprueba01 ', 'HP', 'ProBook 440 G8', '00000000-0000-4000-8000-00000000c001');

do $$ declare r record; begin
  select serie, empresa_id, creado_por into r from public.equipos where id = '00000000-0000-4000-8000-0000000e0001';
  if r.serie <> '5CDPRUEBA01' then raise exception 'FALLA: la serie debe normalizarse (%).', r.serie; end if;
  if r.empresa_id <> '00000000-0000-4000-8000-00000000e001' then raise exception 'FALLA: la empresa debe tomarse del contrato'; end if;
  if r.creado_por <> '00000000-0000-4000-8000-0000000000a1' then raise exception 'FALLA: creado_por debe ser el usuario'; end if;
end $$;

-- Serie duplicada aunque cambien mayúsculas y espacios.
do $$ begin
  insert into public.equipos (categoria, serie, marca, modelo) values ('monitor', '5CDPRUEBA01 ', 'HP', 'X');
  raise exception 'FALLA: se permitió una serie duplicada';
exception when unique_violation then null; end $$;

-- «otro» exige subcategoría y solo «otro» la admite.
do $$ begin
  insert into public.equipos (categoria, serie, marca, modelo) values ('otro', 'PRB-OTRO-1', 'Apple', 'iPad');
  raise exception 'FALLA: «otro» sin subcategoría';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.equipos (categoria, serie, marca, modelo, subcategoria_id) values ('laptop', 'PRB-SUB-1', 'HP', 'X', '00000000-0000-4000-8000-00000000d001');
  raise exception 'FALLA: subcategoría en un equipo que no es «otro»';
exception when check_violation then null; end $$;

-- Apartado exige etiqueta; desactivado exige motivo.
do $$ begin
  update public.equipos set estado = 'apartado' where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: apartado sin etiqueta';
exception when check_violation then null; end $$;
do $$ begin
  update public.equipos set estado = 'desactivado' where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: desactivado sin motivo';
exception when check_violation then null; end $$;

-- «Asignado» no se puede poner por edición directa.
do $$ begin
  update public.equipos set estado = 'asignado' where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: se puso «asignado» sin el flujo de entrega';
exception when check_violation then null; end $$;

-- Al salir de «apartado» se limpia la etiqueta.
update public.equipos set estado = 'apartado', apartado_para = 'Rossy Insunza' where id = '00000000-0000-4000-8000-0000000e0001';
update public.equipos set estado = 'stock' where id = '00000000-0000-4000-8000-0000000e0001';
do $$ begin
  if (select apartado_para from public.equipos where id = '00000000-0000-4000-8000-0000000e0001') is not null then
    raise exception 'FALLA: apartado_para debía limpiarse';
  end if;
end $$;

update public.equipos set ubicacion_detalle = 'CAJA10' where id = '00000000-0000-4000-8000-0000000e0001';

-- Historial: alta + 2 cambios de estado + 1 edición, con «antes → después».
do $$ declare r record; begin
  select count(*) filter (where tipo = 'alta') altas,
         count(*) filter (where tipo = 'cambio_estado') estados,
         count(*) filter (where tipo = 'edicion' and cambios ? 'ubicacion_detalle') ediciones,
         bool_and(usuario_id = '00000000-0000-4000-8000-0000000000a1') autor
    into r from public.movimientos where equipo_id = '00000000-0000-4000-8000-0000000e0001';
  if r.altas <> 1 or r.estados <> 2 or r.ediciones <> 1 or not r.autor then
    raise exception 'FALLA: historial incorrecto (altas %, estados %, ediciones %)', r.altas, r.estados, r.ediciones;
  end if;
end $$;

-- Nadie escribe en el historial ni usa el generador de folios directamente.
do $$ begin
  insert into public.movimientos (equipo_id, tipo) values ('00000000-0000-4000-8000-0000000e0001', 'alta');
  raise exception 'FALLA: el admin pudo escribir en movimientos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.siguiente_folio('CC');
  raise exception 'FALLA: un usuario pudo llamar siguiente_folio';
exception when insufficient_privilege then null; end $$;

-- No se borran equipos.
do $$ begin
  delete from public.equipos where id = '00000000-0000-4000-8000-0000000e0001';
  raise exception 'FALLA: se borró un equipo';
exception when insufficient_privilege then null; end $$;

-- No quedarse sin Administrador.
do $$ begin
  update public.perfiles set rol = 'lector' where id = '00000000-0000-4000-8000-0000000000a1'
    and not exists (select 1 from public.perfiles where rol = 'admin' and activo and id <> '00000000-0000-4000-8000-0000000000a1');
  if found then raise exception 'FALLA: se degradó al último Administrador'; end if;
exception when check_violation then null; end $$;

reset role;

-- ── Lector activo ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;

do $$ begin
  if (select count(*) from public.v_equipos where serie = '5CDPRUEBA01') <> 1 then
    raise exception 'FALLA: el lector debe ver equipos';
  end if;
  if (select count(*) from public.perfiles) <> 1 then
    raise exception 'FALLA: el lector solo debe ver su propio perfil';
  end if;
end $$;
do $$ begin
  insert into public.empresas (clave, razon_social) values ('LEC', 'No debe entrar');
  raise exception 'FALLA: el lector pudo crear una empresa';
exception when insufficient_privilege then null; end $$;
do $$ declare n int; begin
  update public.equipos set notas = 'intento' where id = '00000000-0000-4000-8000-0000000e0001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: el lector pudo editar un equipo'; end if;
end $$;
do $$ declare n int; begin
  update public.perfiles set rol = 'admin' where id = '00000000-0000-4000-8000-0000000000b2';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: el lector pudo cambiar su rol'; end if;
end $$;

reset role;

-- ── Usuario inactivo ──────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
set local role authenticated;

do $$ begin
  if (select count(*) from public.equipos) <> 0 or (select count(*) from public.empresas) <> 0 then
    raise exception 'FALLA: un usuario inactivo no debe ver datos';
  end if;
  if (select count(*) from public.perfiles) <> 1 then
    raise exception 'FALLA: el usuario inactivo debe ver su propio perfil';
  end if;
end $$;

reset role;

-- ── Anónimo ───────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$ begin
  perform 1 from public.equipos;
  raise exception 'FALLA: un anónimo pudo leer equipos';
exception when insufficient_privilege then null; end $$;

reset role;

-- ── Folios (como servidor) ────────────────────────────────────────────────────
do $$ declare f1 text; f2 text; begin
  f1 := public.siguiente_folio('CC');
  f2 := public.siguiente_folio('CC');
  if f1 !~ '^CC-\d{2}-\d{4}$' or right(f2, 4)::int <> right(f1, 4)::int + 1 then
    raise exception 'FALLA: folios incorrectos (%, %)', f1, f2;
  end if;
end $$;

select 'OK' as resultado;
rollback;
