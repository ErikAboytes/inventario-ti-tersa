-- Etapa 1 · Endurecimiento según los advisors de seguridad de Supabase.

-- Los helpers de rol no deben ser endpoints de la API (/rest/v1/rpc/…). Se mueven a un esquema
-- no expuesto; las políticas RLS los referencian por OID y siguen funcionando.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.es_usuario_activo() set schema privado;
alter function public.es_admin() set schema privado;

-- Event trigger ensure_rls (se conserva por decisión del usuario): activa RLS en las tablas nuevas de public.
-- En el proyecto dev nació desde el panel de Supabase; se crea aquí para que exista en cualquier servidor.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
  tbl name;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name = 'public' then
      begin
        select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
        execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (not in enforced list: %)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_event_trigger where evtname = 'ensure_rls') then
    create event trigger ensure_rls on ddl_command_end
      when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      execute function public.rls_auto_enable();
  end if;
end
$$;

-- Nadie la invoca por la API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
