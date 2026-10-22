-- Ajustes posteriores a la Etapa 9 · PR 3: catálogo de marcas, teléfono de colaboradores y edición del
-- nombre y puesto de los usuarios.

-- ── Marcas ─────────────────────────────────────────────────────────────────────────────────────────
-- equipos.marca sigue siendo texto (lo usan la búsqueda, la carta y el CSV) pero ahora debe existir en el
-- catálogo: así no aparecen «hp», «HP » y «Hp» como marcas distintas. Renombrar una marca la actualiza en
-- todos sus equipos (on update cascade, queda en el historial de cada uno); no se puede borrar una marca en
-- uso, solo desactivarla.
create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (nombre = btrim(nombre) and nombre <> ''),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create unique index marcas_nombre_uidx on public.marcas (public.normalizar_texto(nombre));
create index marcas_creado_por_idx on public.marcas (creado_por);
create index marcas_actualizado_por_idx on public.marcas (actualizado_por);

create trigger marcas_auditoria before insert or update on public.marcas
  for each row execute function public.marcar_auditoria_fila();

alter table public.marcas enable row level security;
create policy marcas_select on public.marcas for select to authenticated
  using ((select privado.es_usuario_activo()));
create policy marcas_insert on public.marcas for insert to authenticated
  with check ((select privado.es_admin()));
create policy marcas_update on public.marcas for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy marcas_delete on public.marcas for delete to authenticated
  using ((select privado.es_admin()));

-- Las marcas que ya tiene el inventario (sin triggers: es la carga inicial, no una acción de un usuario).
set session_replication_role = replica;
insert into public.marcas (nombre)
select distinct btrim(marca) from public.equipos where btrim(coalesce(marca, '')) <> ''
on conflict do nothing;
reset session_replication_role;

alter table public.equipos
  add constraint equipos_marca_fkey foreign key (marca) references public.marcas (nombre)
  on update cascade on delete restrict;

-- ── Teléfono de colaboradores ──────────────────────────────────────────────────────────────────────
alter table public.colaboradores
  add column telefono text check (telefono is null or (btrim(telefono) <> '' and length(telefono) <= 40));
comment on column public.colaboradores.telefono is
  'Teléfono de contacto: 10 dígitos con espacios o guiones y extensión opcional. No aparece en la carta.';

-- La búsqueda incluye el teléfono solo con dígitos: «6641234567» encuentra «664 123 4567».
drop index public.colaboradores_busqueda_trgm_idx;
alter table public.colaboradores drop column busqueda;
alter table public.colaboradores
  add column busqueda text generated always as (
    public.normalizar_texto(
      nombre_completo || ' ' || coalesce(numero_empleado, '') || ' ' || coalesce(puesto, '') || ' '
        || regexp_replace(coalesce(telefono, ''), '\D', '', 'g')
    )
  ) stored;
create index colaboradores_busqueda_trgm_idx
  on public.colaboradores using gin (busqueda extensions.gin_trgm_ops);

-- ── Nombre y puesto de un usuario (P-60) ───────────────────────────────────────────────────────────
-- Solo estas dos columnas: el rol y el acceso siguen pasando por la Edge Function admin-usuarios.
create function public.actualizar_datos_usuario(p_id uuid, p_nombre text, p_puesto text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'Solo un Administrador puede editar usuarios.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(p_nombre, '')) = '' then
    raise exception 'Escribe el nombre de la persona.' using errcode = 'check_violation';
  end if;
  if length(btrim(p_nombre)) > 200 or length(btrim(coalesce(p_puesto, ''))) > 200 then
    raise exception 'El nombre y el puesto admiten hasta 200 caracteres.' using errcode = 'check_violation';
  end if;

  update public.perfiles
     set nombre = btrim(p_nombre),
         puesto = nullif(btrim(coalesce(p_puesto, '')), '')
   where id = p_id;
  if not found then
    raise exception 'No se encontró el usuario.' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.actualizar_datos_usuario(uuid, text, text) from public, anon;
grant execute on function public.actualizar_datos_usuario(uuid, text, text) to authenticated;
