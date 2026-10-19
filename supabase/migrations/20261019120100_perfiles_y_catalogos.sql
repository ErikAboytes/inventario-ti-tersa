-- Etapa 1 · Perfiles de usuario y catálogos (docs/01 §3.2).

-- Perfil de cada usuario de Supabase Auth. Nace inactivo; un Administrador lo activa.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null default '',
  puesto text,
  rol public.rol_usuario not null default 'lector',
  activo boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Marcas de tiempo y autor de cada fila. Se reutiliza en catálogos y equipos.
create function public.marcar_auditoria_fila()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_en := now();
    new.creado_por := coalesce(new.creado_por, auth.uid());
  else
    new.creado_en := old.creado_en;
    new.creado_por := old.creado_por;
  end if;
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique check (clave = upper(btrim(clave)) and clave <> ''),
  razon_social text not null check (btrim(razon_social) <> ''),
  rfc text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  operacion text not null unique check (operacion = upper(btrim(operacion)) and operacion <> ''),
  numero_contrato text,
  empresa_id uuid not null references public.empresas (id),
  descripcion text,
  fecha_vencimiento date,
  estatus text check (estatus in ('vigente', 'comprado', 'pagado', 'vencido')),
  notas text,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create index contratos_empresa_idx on public.contratos (empresa_id);

create table public.ubicaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  tipo text not null default 'sucursal' check (tipo in ('sucursal', 'corporativo', 'almacen', 'externo')),
  ciudad text,
  estado_republica text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create unique index ubicaciones_nombre_uidx on public.ubicaciones (public.normalizar_texto(nombre));

create table public.unidades_negocio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create unique index unidades_negocio_nombre_uidx on public.unidades_negocio (public.normalizar_texto(nombre));

-- Solo para equipos de categoría «otro» (iPad/Tablet…).
create table public.subcategorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create unique index subcategorias_nombre_uidx on public.subcategorias (public.normalizar_texto(nombre));

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  numero_empleado text unique,
  nombre_completo text not null check (btrim(nombre_completo) <> ''),
  puesto text,
  unidad_negocio_id uuid references public.unidades_negocio (id),
  area text,
  empresa_id uuid references public.empresas (id),
  ubicacion_id uuid references public.ubicaciones (id),
  email text,
  -- «generico»: valores del Excel que no son personas (SERVIDOR, VACANTE…), para depurar después.
  tipo text not null default 'persona' check (tipo in ('persona', 'generico')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id)
);
create index colaboradores_nombre_trgm_idx
  on public.colaboradores using gin (public.normalizar_texto(nombre_completo) extensions.gin_trgm_ops);
create index colaboradores_unidad_idx on public.colaboradores (unidad_negocio_id);
create index colaboradores_empresa_idx on public.colaboradores (empresa_id);
create index colaboradores_ubicacion_idx on public.colaboradores (ubicacion_id);

create trigger empresas_auditoria before insert or update on public.empresas
  for each row execute function public.marcar_auditoria_fila();
create trigger contratos_auditoria before insert or update on public.contratos
  for each row execute function public.marcar_auditoria_fila();
create trigger ubicaciones_auditoria before insert or update on public.ubicaciones
  for each row execute function public.marcar_auditoria_fila();
create trigger unidades_negocio_auditoria before insert or update on public.unidades_negocio
  for each row execute function public.marcar_auditoria_fila();
create trigger subcategorias_auditoria before insert or update on public.subcategorias
  for each row execute function public.marcar_auditoria_fila();
create trigger colaboradores_auditoria before insert or update on public.colaboradores
  for each row execute function public.marcar_auditoria_fila();
