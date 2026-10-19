-- Etapa 2 · Búsqueda de colaboradores sin importar acentos ni mayúsculas («Chavez» encuentra «Chávez»).
-- El cliente normaliza el texto igual (minúsculas, sin acentos) y filtra con ilike sobre esta columna.

alter table public.colaboradores
  add column busqueda text generated always as (
    public.normalizar_texto(
      nombre_completo || ' ' || coalesce(numero_empleado, '') || ' ' || coalesce(puesto, '')
    )
  ) stored;

drop index public.colaboradores_nombre_trgm_idx;
create index colaboradores_busqueda_trgm_idx
  on public.colaboradores using gin (busqueda extensions.gin_trgm_ops);
