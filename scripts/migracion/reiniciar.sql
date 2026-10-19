-- Borra el inventario importado para repetir la carga en DESARROLLO (docs/03 §7, paso 3).
-- Nunca en producción. Se niega si ya hay entregas registradas en el sistema (no históricas).
-- Uso: supabase db query --linked -f scripts/migracion/reiniciar.sql
begin;

do $$ begin
  if exists (select 1 from public.asignaciones where not es_historica) then
    raise exception 'Hay entregas registradas en el sistema: no se reinicia el inventario.';
  end if;
end $$;

delete from public.asignacion_equipos;
delete from public.devoluciones;
delete from public.asignaciones;
delete from public.movimientos;
delete from public.equipos;
delete from public.colaboradores;
delete from public.contratos;
delete from public.ubicaciones;
delete from public.subcategorias;
delete from public.empresas;
delete from public.folios_control;
alter sequence public.equipos_sinserie_seq restart;

select 'Inventario vacío' as resultado;
commit;
