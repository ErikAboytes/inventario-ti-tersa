-- Etapa 9 · Advisor de rendimiento 0001 (unindexed_foreign_keys): índices para las columnas de auditoría
-- creado_por / actualizado_por. Las tablas son chicas, pero sin índice cualquier cambio a un perfil obliga a
-- recorrerlas completas para validar la llave foránea.

create index if not exists colaboradores_creado_por_idx on public.colaboradores (creado_por);
create index if not exists colaboradores_actualizado_por_idx on public.colaboradores (actualizado_por);
create index if not exists contratos_creado_por_idx on public.contratos (creado_por);
create index if not exists contratos_actualizado_por_idx on public.contratos (actualizado_por);
create index if not exists empresas_creado_por_idx on public.empresas (creado_por);
create index if not exists empresas_actualizado_por_idx on public.empresas (actualizado_por);
create index if not exists equipos_creado_por_idx on public.equipos (creado_por);
create index if not exists equipos_actualizado_por_idx on public.equipos (actualizado_por);
create index if not exists subcategorias_creado_por_idx on public.subcategorias (creado_por);
create index if not exists subcategorias_actualizado_por_idx on public.subcategorias (actualizado_por);
create index if not exists ubicaciones_creado_por_idx on public.ubicaciones (creado_por);
create index if not exists ubicaciones_actualizado_por_idx on public.ubicaciones (actualizado_por);
create index if not exists unidades_negocio_creado_por_idx on public.unidades_negocio (creado_por);
create index if not exists unidades_negocio_actualizado_por_idx on public.unidades_negocio (actualizado_por);

-- folios_control: RLS activo y sin políticas a propósito. Solo la usan siguiente_folio() y las funciones de
-- entrega/devolución (security definer); ningún rol de la API la lee ni la escribe directo.
comment on table public.folios_control is
  'Consecutivos de folios por tipo y año. Sin políticas RLS a propósito: solo la usan funciones security definer.';
