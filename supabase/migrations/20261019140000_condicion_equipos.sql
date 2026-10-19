-- Estado físico del equipo (docs/01 §3.2 y §4.3): condición + observaciones.
-- No se imprime en las cartas; los cambios quedan en movimientos por el trigger existente.

create type public.condicion_equipo as enum ('buen_estado', 'con_detalles', 'danado');

-- Nulo = «Sin revisar» (p. ej. equipos importados sin esta información).
alter table public.equipos
  add column condicion public.condicion_equipo,
  add column observaciones_estado text,
  add constraint equipos_detalle_requiere_observaciones
    check (condicion is null or condicion = 'buen_estado'
           or nullif(btrim(observaciones_estado), '') is not null);

-- La condición con la que regresa cada equipo y sus observaciones; registrar_devolucion las copia al equipo.
alter table public.asignacion_equipos
  drop constraint asignacion_equipos_condicion_devolucion_check;
alter table public.asignacion_equipos
  alter column condicion_devolucion type public.condicion_equipo
    using condicion_devolucion::public.condicion_equipo,
  add column observaciones_devolucion text,
  add constraint asignacion_equipos_detalle_requiere_observaciones
    check (condicion_devolucion is null or condicion_devolucion = 'buen_estado'
           or nullif(btrim(observaciones_devolucion), '') is not null);

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
  e.observaciones_estado
from public.equipos e
left join public.subcategorias sc on sc.id = e.subcategoria_id
left join public.empresas em on em.id = e.empresa_id
left join public.contratos ct on ct.id = e.contrato_id
left join public.ubicaciones ub on ub.id = e.ubicacion_id
left join public.asignacion_equipos ae on ae.equipo_id = e.id and ae.devolucion_id is null
left join public.asignaciones a on a.id = ae.asignacion_id
left join public.colaboradores co on co.id = a.colaborador_id;
