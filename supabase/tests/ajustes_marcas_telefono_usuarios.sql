-- Pruebas del PR 3 de ajustes: catálogo de marcas, teléfono de colaboradores y edición de usuarios.
-- Transacción con ROLLBACK: no deja datos. Cada fallo lanza «FALLA: …»; si todo pasa devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000aaa1', 'admin.pr3@ejemplo.test'),
  ('00000000-0000-4000-8000-00000000bbb2', 'lector.pr3@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin PR3'
 where id = '00000000-0000-4000-8000-00000000aaa1';
update public.perfiles set activo = true, nombre = 'Lector PR3'
 where id = '00000000-0000-4000-8000-00000000bbb2';

-- ── Marcas ───────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000aaa1","role":"authenticated"}', true);
set local role authenticated;

insert into public.marcas (nombre) values ('PruebaMarca');
do $$ begin
  insert into public.marcas (nombre) values ('pruebamarca');
  raise exception 'FALLA: se aceptó una marca repetida con otras mayúsculas';
exception when unique_violation then null; end $$;

-- Un equipo con una marca fuera del catálogo no se acepta.
do $$ begin
  insert into public.equipos (categoria, serie, marca, modelo, estado)
  values ('laptop', 'PRBPR3-X', 'MarcaInventada', 'X', 'stock');
  raise exception 'FALLA: se aceptó una marca fuera del catálogo';
exception when foreign_key_violation then null; end $$;

insert into public.equipos (id, categoria, serie, marca, modelo, estado)
values ('00000000-0000-4000-8000-0000000e0a01', 'laptop', 'PRBPR3-1', 'PruebaMarca', 'Uno', 'stock');

-- Renombrar la marca la cambia en sus equipos; borrarla en uso no se permite.
update public.marcas set nombre = 'Prueba Marca' where nombre = 'PruebaMarca';
do $$ begin
  if (select marca from public.equipos where id = '00000000-0000-4000-8000-0000000e0a01') <> 'Prueba Marca' then
    raise exception 'FALLA: renombrar la marca no actualizó el equipo';
  end if;
end $$;
do $$ begin
  delete from public.marcas where nombre = 'Prueba Marca';
  raise exception 'FALLA: se borró una marca en uso';
exception when foreign_key_violation then null; end $$;
reset role;

-- Un Lector ve las marcas pero no las agrega.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000bbb2","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.marcas where nombre = 'Prueba Marca') then
    raise exception 'FALLA: un Lector no ve el catálogo de marcas';
  end if;
  insert into public.marcas (nombre) values ('MarcaDeLector');
  raise exception 'FALLA: un Lector agregó una marca';
exception when insufficient_privilege then null; end $$;

-- Ni edita datos de usuarios.
do $$ begin
  perform public.actualizar_datos_usuario('00000000-0000-4000-8000-00000000bbb2', 'Otro nombre');
  raise exception 'FALLA: un Lector editó un usuario';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Teléfono y búsqueda ──────────────────────────────────────────────────────
insert into public.colaboradores (id, nombre_completo, telefono)
values ('00000000-0000-4000-8000-0000000c0a01', 'Colaborador PR3', '(664) 123-4567 ext. 21');
do $$ begin
  if not exists (select 1 from public.colaboradores
                  where id = '00000000-0000-4000-8000-0000000c0a01' and busqueda like '%664123456721%') then
    raise exception 'FALLA: la búsqueda no incluye los dígitos del teléfono';
  end if;
end $$;

-- ── Editar nombre y puesto ───────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000aaa1","role":"authenticated"}', true);
set local role authenticated;
select public.actualizar_datos_usuario('00000000-0000-4000-8000-00000000bbb2', '  Lectora Nueva ', ' Contadora ');
do $$ begin
  perform public.actualizar_datos_usuario('00000000-0000-4000-8000-00000000bbb2', '   ');
  raise exception 'FALLA: se aceptó un nombre vacío';
exception when check_violation then null; end $$;
reset role;
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-4000-8000-00000000bbb2'
                  and nombre = 'Lectora Nueva' and puesto = 'Contadora' and rol = 'lector') then
    raise exception 'FALLA: no se guardaron nombre y puesto (o cambió el rol)';
  end if;
end $$;

select 'OK' as resultado;
rollback;
