-- Pruebas de la Etapa 2: catálogos y colaboradores. Transacción con ROLLBACK: no deja datos.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000000b2', 'lector.prueba@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000000b2';

-- ── Administrador ─────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

insert into public.empresas (id, clave, razon_social) values ('00000000-0000-4000-8000-00000000e001', 'TST', 'Empresa de prueba');
insert into public.ubicaciones (id, nombre, tipo) values ('00000000-0000-4000-8000-00000000f0f1', 'Tersa Tecate Prueba', 'sucursal');
insert into public.colaboradores (id, nombre_completo, puesto, numero_empleado, empresa_id, ubicacion_id)
values ('00000000-0000-4000-8000-0000000c0001', 'José Carlos LÓPEZ Chávez', 'Asesor de ventas', 'E-123',
        '00000000-0000-4000-8000-00000000e001', '00000000-0000-4000-8000-00000000f0f1');

-- Búsqueda sin acentos ni mayúsculas, por nombre, puesto o número de empleado.
do $$ begin
  if (select count(*) from public.colaboradores where busqueda ilike '%lopez chavez%') <> 1
     or (select count(*) from public.colaboradores where busqueda ilike '%asesor de ventas%') <> 1
     or (select count(*) from public.colaboradores where busqueda ilike '%e-123%') <> 1 then
    raise exception 'FALLA: la columna busqueda no normaliza bien';
  end if;
end $$;

-- Nombre de ubicación único sin importar acentos/mayúsculas.
do $$ begin
  insert into public.ubicaciones (nombre, tipo) values ('TERSA TECATE PRUEBA', 'sucursal');
  raise exception 'FALLA: se duplicó una ubicación';
exception when unique_violation then null; end $$;

-- Un catálogo en uso no se puede eliminar.
do $$ begin
  delete from public.empresas where id = '00000000-0000-4000-8000-00000000e001';
  raise exception 'FALLA: se eliminó una empresa en uso';
exception when foreign_key_violation then null; end $$;

-- Uno sin uso, sí.
insert into public.unidades_negocio (id, nombre) values ('00000000-0000-4000-8000-00000000a0b1', 'Unidad temporal');
do $$ declare n int; begin
  delete from public.unidades_negocio where id = '00000000-0000-4000-8000-00000000a0b1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALLA: el admin no pudo eliminar un catálogo sin uso'; end if;
end $$;

-- Baja lógica sí; borrado de colaboradores no.
update public.colaboradores set activo = false where id = '00000000-0000-4000-8000-0000000c0001';
do $$ begin
  delete from public.colaboradores where id = '00000000-0000-4000-8000-0000000c0001';
  raise exception 'FALLA: se borró un colaborador';
exception when insufficient_privilege then null; end $$;

reset role;

-- ── Lector ────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
set local role authenticated;

do $$ begin
  if (select count(*) from public.colaboradores where id = '00000000-0000-4000-8000-0000000c0001') <> 1 then
    raise exception 'FALLA: el lector debe ver colaboradores';
  end if;
end $$;
do $$ begin
  insert into public.colaboradores (nombre_completo) values ('No debe entrar');
  raise exception 'FALLA: el lector pudo crear un colaborador';
exception when insufficient_privilege then null; end $$;
do $$ declare n int; begin
  update public.colaboradores set activo = true where id = '00000000-0000-4000-8000-0000000c0001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: el lector pudo reactivar un colaborador'; end if;
  delete from public.ubicaciones where id = '00000000-0000-4000-8000-00000000f0f1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALLA: el lector pudo borrar una ubicación'; end if;
end $$;

reset role;

select 'OK' as resultado;
rollback;
