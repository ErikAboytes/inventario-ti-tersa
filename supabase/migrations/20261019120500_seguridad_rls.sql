-- Etapa 1 · Perfiles automáticos, helpers de rol y políticas RLS (docs/01 §5).
-- Administrador: lee y escribe. Lector: solo lee. Perfil inactivo o anónimo: nada.

-- Crea el perfil (inactivo, lector) de cada usuario nuevo de Auth.
create function public.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'nombre', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.crear_perfil_de_usuario() from public, anon, authenticated;

create trigger auth_usuario_crea_perfil after insert on auth.users
  for each row execute function public.crear_perfil_de_usuario();

-- Usuarios que ya existían en Auth (p. ej. test@test.com): perfil inactivo.
insert into public.perfiles (id, email)
select u.id, coalesce(u.email, '') from auth.users u
on conflict (id) do nothing;

create function public.es_usuario_activo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.activo)
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles p where p.id = (select auth.uid()) and p.activo and p.rol = 'admin'
  )
$$;
revoke execute on function public.es_usuario_activo(), public.es_admin() from public, anon;
grant execute on function public.es_usuario_activo(), public.es_admin() to authenticated;

-- Nunca quedarse sin un Administrador activo.
create function public.proteger_ultimo_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.rol = 'admin' and old.activo
     and (tg_op = 'DELETE' or new.rol <> 'admin' or not new.activo)
     and not exists (
       select 1 from public.perfiles p
        where p.id <> old.id and p.rol = 'admin' and p.activo
     ) then
    raise exception 'Debe quedar al menos un Administrador activo.'
      using errcode = 'check_violation', constraint = 'perfiles_ultimo_admin';
  end if;
  return coalesce(new, old);
end;
$$;

create function public.marcar_actualizacion_perfil()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  new.id := old.id;
  new.creado_en := old.creado_en;
  return new;
end;
$$;

create trigger perfiles_ultimo_admin before update or delete on public.perfiles
  for each row execute function public.proteger_ultimo_admin();
create trigger perfiles_actualizacion before update on public.perfiles
  for each row execute function public.marcar_actualizacion_perfil();

-- RLS explícito en todas las tablas (el event trigger ensure_rls es solo una red de seguridad).
alter table public.perfiles enable row level security;
alter table public.empresas enable row level security;
alter table public.contratos enable row level security;
alter table public.ubicaciones enable row level security;
alter table public.unidades_negocio enable row level security;
alter table public.subcategorias enable row level security;
alter table public.colaboradores enable row level security;
alter table public.equipos enable row level security;
alter table public.asignaciones enable row level security;
alter table public.devoluciones enable row level security;
alter table public.asignacion_equipos enable row level security;
alter table public.folios_control enable row level security;
alter table public.movimientos enable row level security;

-- Anónimos no tocan ninguna tabla; folios_control solo lo usan funciones del servidor.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
revoke all on public.folios_control from authenticated;
-- El historial es de solo lectura para todos.
revoke insert, update, delete, truncate on public.movimientos from authenticated;

-- Perfiles: cada quien ve el suyo (aunque esté inactivo); el Administrador ve y edita todos.
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
create policy perfiles_update on public.perfiles for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Catálogos: lectura para usuarios activos; altas, cambios y bajas solo Administrador.
do $$
declare
  t text;
begin
  foreach t in array array['empresas', 'contratos', 'ubicaciones', 'unidades_negocio', 'subcategorias'] loop
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using ((select public.es_usuario_activo()))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check ((select public.es_admin()))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using ((select public.es_admin()))', t);
  end loop;
end;
$$;

-- Colaboradores y equipos: sin borrado (baja lógica / estado «desactivado»).
create policy colaboradores_select on public.colaboradores for select to authenticated
  using ((select public.es_usuario_activo()));
create policy colaboradores_insert on public.colaboradores for insert to authenticated
  with check ((select public.es_admin()));
create policy colaboradores_update on public.colaboradores for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy equipos_select on public.equipos for select to authenticated
  using ((select public.es_usuario_activo()));
create policy equipos_insert on public.equipos for insert to authenticated
  with check ((select public.es_admin()));
create policy equipos_update on public.equipos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Asignaciones y devoluciones: lectura; las escrituras llegarán por funciones (Etapa 5).
create policy asignaciones_select on public.asignaciones for select to authenticated
  using ((select public.es_usuario_activo()));
create policy devoluciones_select on public.devoluciones for select to authenticated
  using ((select public.es_usuario_activo()));
create policy asignacion_equipos_select on public.asignacion_equipos for select to authenticated
  using ((select public.es_usuario_activo()));
create policy movimientos_select on public.movimientos for select to authenticated
  using ((select public.es_usuario_activo()));

revoke delete, truncate on public.colaboradores, public.equipos from authenticated;
revoke insert, update, delete, truncate
  on public.asignaciones, public.devoluciones, public.asignacion_equipos from authenticated;
