-- Etapa 8 · P-60 Usuarios (docs/01 §5, doc 04 P-60).
-- Las altas, cambios de rol y desactivaciones los hace la Edge Function `admin-usuarios` (necesita la llave
-- de servicio para invitar y para cerrar sesiones). Aquí solo la lista, con los datos de acceso que viven en
-- auth.users y que el cliente no puede leer.

create function public.usuarios_admin()
returns table (
  id uuid,
  email text,
  nombre text,
  puesto text,
  rol public.rol_usuario,
  activo boolean,
  creado_en timestamptz,
  invitado_en timestamptz,
  confirmado_en timestamptz,
  ultimo_acceso timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede ver los usuarios.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select p.id, p.email, p.nombre, p.puesto, p.rol, p.activo, p.creado_en,
         u.invited_at, u.email_confirmed_at, u.last_sign_in_at
    from public.perfiles p
    join auth.users u on u.id = p.id
   order by p.activo desc, lower(coalesce(nullif(p.nombre, ''), p.email));
end;
$$;

revoke all on function public.usuarios_admin() from public, anon;
grant execute on function public.usuarios_admin() to authenticated;
