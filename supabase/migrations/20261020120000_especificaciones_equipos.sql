-- Especificaciones de Desktop y Laptop (docs/01 §3.2): todas opcionales.
-- Los cambios quedan en movimientos por el trigger existente.

alter table public.equipos
  add column cpu text,
  add column gpu text,
  add column ram_gb smallint,
  add column almacenamiento text,
  add column sistema_operativo text,
  add constraint equipos_ram_gb_rango check (ram_gb between 1 and 4096),
  add constraint equipos_especificaciones_solo_computo
    check (categoria in ('desktop', 'laptop')
           or (cpu is null and gpu is null and ram_gb is null
               and almacenamiento is null and sistema_operativo is null));

-- Columnas nuevas al final: create or replace view no permite reordenar.
create or replace view public.v_equipos
with (security_invoker = true)
as
select
  e.id,
  e.categoria,
  e.subcategoria_id,
  sc.nombre as subcategoria,
  e.serie,
  e.numero_producto,
  e.marca,
  e.modelo,
  e.descripcion,
  e.empresa_id,
  em.clave as empresa_clave,
  em.razon_social as empresa_razon_social,
  e.contrato_id,
  ct.operacion as contrato_operacion,
  ct.fecha_vencimiento as contrato_vencimiento,
  e.ubicacion_id,
  ub.nombre as ubicacion,
  e.ubicacion_detalle,
  e.estado,
  e.apartado_para,
  e.motivo_desactivacion,
  e.notas,
  ae.asignacion_id,
  a.folio as asignacion_folio,
  a.fecha_entrega as asignacion_fecha,
  co.id as colaborador_id,
  co.nombre_completo as colaborador_nombre,
  e.creado_en,
  e.actualizado_en,
  e.condicion,
  e.observaciones_estado,
  public.normalizar_texto(concat_ws(' ', e.serie, e.marca, e.modelo, e.numero_producto,
    e.descripcion, ct.operacion, co.nombre_completo)) as busqueda,
  e.cpu,
  e.gpu,
  e.ram_gb,
  e.almacenamiento,
  e.sistema_operativo
from public.equipos e
left join public.subcategorias sc on sc.id = e.subcategoria_id
left join public.empresas em on em.id = e.empresa_id
left join public.contratos ct on ct.id = e.contrato_id
left join public.ubicaciones ub on ub.id = e.ubicacion_id
left join public.asignacion_equipos ae on ae.equipo_id = e.id and ae.devolucion_id is null
left join public.asignaciones a on a.id = ae.asignacion_id
left join public.colaboradores co on co.id = a.colaborador_id;
