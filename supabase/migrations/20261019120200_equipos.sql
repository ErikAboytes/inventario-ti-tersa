-- Etapa 1 · Equipos (docs/01 §3.2 y §4.1).

create table public.equipos (
  -- El UUID va en el QR (/e/<id>) y nunca cambia.
  id uuid primary key default gen_random_uuid(),
  categoria public.categoria_equipo not null,
  subcategoria_id uuid references public.subcategorias (id),
  serie text not null check (btrim(serie) <> ''),
  numero_producto text,
  marca text not null check (btrim(marca) <> ''),
  modelo text not null check (btrim(modelo) <> ''),
  descripcion text,
  -- Opcional solo para equipos fuera de contrato; si hay contrato, se toma de él.
  empresa_id uuid references public.empresas (id),
  contrato_id uuid references public.contratos (id),
  ubicacion_id uuid references public.ubicaciones (id),
  ubicacion_detalle text,
  estado public.estado_equipo not null default 'stock',
  apartado_para text,
  motivo_desactivacion text,
  notas text,
  creado_en timestamptz not null default now(),
  creado_por uuid references public.perfiles (id),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references public.perfiles (id),

  constraint equipos_subcategoria_solo_otro
    check ((categoria = 'otro') = (subcategoria_id is not null)),
  constraint equipos_apartado_requiere_etiqueta
    check (estado <> 'apartado' or nullif(btrim(apartado_para), '') is not null),
  constraint equipos_desactivado_requiere_motivo
    check (estado <> 'desactivado' or nullif(btrim(motivo_desactivacion), '') is not null)
);

-- Serie única sin distinguir mayúsculas ni espacios.
create unique index equipos_serie_uidx on public.equipos (upper(btrim(serie)));
create index equipos_serie_trgm_idx on public.equipos using gin (upper(serie) extensions.gin_trgm_ops);
create index equipos_modelo_trgm_idx
  on public.equipos using gin (public.normalizar_texto(marca || ' ' || modelo) extensions.gin_trgm_ops);
create index equipos_estado_idx on public.equipos (estado);
create index equipos_categoria_idx on public.equipos (categoria);
create index equipos_empresa_idx on public.equipos (empresa_id);
create index equipos_contrato_idx on public.equipos (contrato_id);
create index equipos_ubicacion_idx on public.equipos (ubicacion_id);
create index equipos_subcategoria_idx on public.equipos (subcategoria_id);

-- Normaliza la serie, toma la empresa del contrato y limpia etiquetas al salir de apartado/desactivado.
create function public.preparar_equipo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  empresa_contrato uuid;
begin
  new.serie := upper(btrim(new.serie));

  if new.contrato_id is not null then
    select c.empresa_id into empresa_contrato from public.contratos c where c.id = new.contrato_id;
    if new.empresa_id is null then
      new.empresa_id := empresa_contrato;
    elsif new.empresa_id <> empresa_contrato then
      raise exception 'La empresa del equipo no coincide con la empresa del contrato.'
        using errcode = 'check_violation', constraint = 'equipos_empresa_del_contrato';
    end if;
  end if;

  if new.estado <> 'apartado' then
    new.apartado_para := null;
  end if;
  if new.estado <> 'desactivado' then
    new.motivo_desactivacion := null;
  end if;

  return new;
end;
$$;

-- «asignado» solo se pone o se quita desde las funciones de entrega/devolución (o la importación).
-- Las funciones marcan su contexto con set_config('app.contexto', …, true).
create function public.proteger_estado_asignado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  contexto text := coalesce(current_setting('app.contexto', true), '');
begin
  if contexto in ('asignacion', 'devolucion', 'cierre_incidencia', 'importacion') then
    return new;
  end if;

  if (tg_op = 'INSERT' and new.estado = 'asignado')
     or (tg_op = 'UPDATE' and (new.estado = 'asignado') <> (old.estado = 'asignado')) then
    raise exception 'El estado «Asignado» solo cambia al registrar una entrega o una devolución.'
      using errcode = 'check_violation', constraint = 'equipos_asignado_solo_por_flujo';
  end if;

  return new;
end;
$$;

create trigger equipos_01_preparar before insert or update on public.equipos
  for each row execute function public.preparar_equipo();
create trigger equipos_02_proteger_asignado before insert or update on public.equipos
  for each row execute function public.proteger_estado_asignado();
create trigger equipos_03_auditoria before insert or update on public.equipos
  for each row execute function public.marcar_auditoria_fila();
