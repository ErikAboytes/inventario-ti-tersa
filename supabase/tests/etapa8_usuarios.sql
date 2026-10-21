-- Pruebas de la Etapa 8: usuarios_admin, último Administrador y acceso de un perfil desactivado.
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email, invited_at) values
  ('00000000-0000-4000-8000-0000000008a1', 'admin.e8@ejemplo.test', null),
  ('00000000-0000-4000-8000-0000000008b2', 'lector.e8@ejemplo.test', now());
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin E8'
 where id = '00000000-0000-4000-8000-0000000008a1';
update public.perfiles set activo = true, nombre = 'Lector E8'
 where id = '00000000-0000-4000-8000-0000000008b2';

-- ── Lector: no ve la lista ───────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008b2","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  perform public.usuarios_admin();
  raise exception 'FALLA: un Lector vio la lista de usuarios';
exception when insufficient_privilege then null; end $$;
-- Ni puede cambiarse el rol a sí mismo (RLS de perfiles).
update public.perfiles set rol = 'admin' where id = '00000000-0000-4000-8000-0000000008b2';
reset role;
do $$ begin
  if (select rol from public.perfiles where id = '00000000-0000-4000-8000-0000000008b2') <> 'lector' then
    raise exception 'FALLA: un Lector se dio rol de Administrador';
  end if;
end $$;

-- ── Administrador: ve la lista con los datos de acceso ──────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008a1","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.usuarios_admin()
                  where email = 'lector.e8@ejemplo.test' and invitado_en is not null and confirmado_en is null) then
    raise exception 'FALLA: usuarios_admin no trae la invitación pendiente';
  end if;
end $$;

-- Desactivar al Lector: pierde acceso en su siguiente petición.
update public.perfiles set activo = false where id = '00000000-0000-4000-8000-0000000008b2';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000008b2","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.equipos limit 1) then
    raise exception 'FALLA: un perfil desactivado sigue leyendo equipos';
  end if;
end $$;
reset role;

-- ── Último Administrador ─────────────────────────────────────────────────────
-- Se deja como único Administrador activo al de la prueba y se intenta quitarle el rol o desactivarlo.
update public.perfiles set activo = false where rol = 'admin' and id <> '00000000-0000-4000-8000-0000000008a1';
do $$ begin
  update public.perfiles set rol = 'lector' where id = '00000000-0000-4000-8000-0000000008a1';
  raise exception 'FALLA: se quitó el rol al último Administrador';
exception when check_violation then null; end $$;
do $$ begin
  update public.perfiles set activo = false where id = '00000000-0000-4000-8000-0000000008a1';
  raise exception 'FALLA: se desactivó al último Administrador';
exception when check_violation then null; end $$;

-- Sin sesión: nada.
set local role anon;
do $$ begin
  perform public.usuarios_admin();
  raise exception 'FALLA: anon vio la lista de usuarios';
exception when insufficient_privilege then null; end $$;

reset role;
select 'OK' as resultado;
rollback;
