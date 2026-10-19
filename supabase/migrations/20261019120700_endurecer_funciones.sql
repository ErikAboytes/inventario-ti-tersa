-- Etapa 1 · Endurecimiento según los advisors de seguridad de Supabase.

-- Los helpers de rol no deben ser endpoints de la API (/rest/v1/rpc/…). Se mueven a un esquema
-- no expuesto; las políticas RLS los referencian por OID y siguen funcionando.
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.es_usuario_activo() set schema privado;
alter function public.es_admin() set schema privado;

-- Función del event trigger ensure_rls (se conserva por decisión del usuario): nadie la invoca por la API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
