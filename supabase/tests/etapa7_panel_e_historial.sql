-- Pruebas de la Etapa 7: metricas_panel, historial_global, usuarios_historial y v_equipos.estado_desde.
-- La BD de desarrollo ya tiene el inventario real: las cifras se comparan antes y después de los datos de
-- la prueba. Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000007a1', 'admin.e7@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000007b2', 'lector.e7@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin E7'
 where id = '00000000-0000-4000-8000-0000000007a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000007b2';

-- Cifras antes de la prueba, vistas por el Lector.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007b2","role":"authenticated"}', true);
set local role authenticated;
create temp table _antes on commit drop as select public.metricas_panel() as r;
reset role;

insert into public.colaboradores (id, nombre_completo) values
  ('00000000-0000-4000-8000-0000000c0701', 'Colaborador Prueba Siete');
select set_config('app.contexto', 'importacion', true);
insert into public.equipos (id, categoria, serie, marca, modelo, estado, apartado_para) values
  ('00000000-0000-4000-8000-0000000e0701', 'laptop', 'PRBE7-MANT', 'HP', 'Siete', 'mantenimiento', null),
  ('00000000-0000-4000-8000-0000000e0702', 'laptop', 'PRBE7-APA-VIEJO', 'HP', 'Siete', 'apartado', 'Alguien'),
  ('00000000-0000-4000-8000-0000000e0703', 'laptop', 'PRBE7-APA-NUEVO', 'HP', 'Siete', 'apartado', 'Alguien'),
  ('00000000-0000-4000-8000-0000000e0704', 'monitor', 'PRBE7-ENTREGA', 'HP', 'Siete', 'stock', null);
select set_config('app.contexto', '', true);
-- Simula que llevan tiempo en su estado.
update public.movimientos set creado_en = now() - interval '40 days'
 where equipo_id = '00000000-0000-4000-8000-0000000e0701';
update public.movimientos set creado_en = now() - interval '20 days'
 where equipo_id = '00000000-0000-4000-8000-0000000e0702';

-- El administrador entrega un equipo; después el colaborador se da de baja.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007a1","role":"authenticated"}', true);
set local role authenticated;
create temp table _e7 on commit drop as
select public.crear_asignacion('00000000-0000-4000-8000-0000000c0701',
  array['00000000-0000-4000-8000-0000000e0704']::uuid[]) as r;
reset role;
update public.colaboradores set activo = false where id = '00000000-0000-4000-8000-0000000c0701';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000007b2","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  a jsonb := (select r from _antes);
  d jsonb := public.metricas_panel();
  dif text;
begin
  -- Cifras clave: 4 equipos activos más; uno asignado más.
  if (d #>> '{cifras,activos}')::int - (a #>> '{cifras,activos}')::int <> 4 then
    raise exception 'FALLA: activos no subió en 4';
  end if;
  if (d #>> '{cifras,asignados}')::int - (a #>> '{cifras,asignados}')::int <> 1 then
    raise exception 'FALLA: asignados no subió en 1';
  end if;

  -- Requiere atención: solo cuenta lo que pasó el umbral.
  if (d #>> '{atencion,mantenimiento_30}')::int - (a #>> '{atencion,mantenimiento_30}')::int <> 1 then
    raise exception 'FALLA: mantenimiento > 30 días';
  end if;
  if (d #>> '{atencion,apartado_15}')::int - (a #>> '{atencion,apartado_15}')::int <> 1 then
    raise exception 'FALLA: apartado > 15 días debe contar el de 20 días y no el nuevo';
  end if;
  if (d #>> '{atencion,colaborador_baja}')::int - (a #>> '{atencion,colaborador_baja}')::int <> 1 then
    raise exception 'FALLA: asignado a colaborador dado de baja';
  end if;

  -- Distribución: «Sin empresa» ganó los 4 equipos de la prueba y va al final.
  -- El total de cada barra es la suma de sus estados.
  if exists (select 1 from jsonb_array_elements(d -> 'por_empresa') x
              where (x ->> 'total')::int <> (select sum(v::int) from jsonb_each_text(x -> 'estados') t(k, v))) then
    raise exception 'FALLA: el total de una empresa no es la suma de sus estados';
  end if;
  if (select sum((x ->> 'total')::int) from jsonb_array_elements(d -> 'por_empresa') x)
     <> (d #>> '{cifras,activos}')::int then
    raise exception 'FALLA: la distribución no suma los equipos activos';
  end if;
  select (x ->> 'total') into dif from jsonb_array_elements(d -> 'por_empresa') x where x ->> 'empresa_id' is null;
  if dif::int - coalesce((select (x ->> 'total')::int from jsonb_array_elements(a -> 'por_empresa') x
                          where x ->> 'empresa_id' is null), 0) <> 4
     or (d -> 'por_empresa' -> -1 ->> 'empresa_id') is not null then
    raise exception 'FALLA: «Sin empresa» debe sumar los 4 equipos de la prueba e ir al final';
  end if;

  -- Actividad reciente: la entrega aparece primero, con folio, colaborador y autor (el Lector lo ve).
  if d -> 'actividad' -> 0 ->> 'serie' <> 'PRBE7-ENTREGA'
     or d -> 'actividad' -> 0 ->> 'folio' <> (select e.r ->> 'folio' from _e7 e)
     or d -> 'actividad' -> 0 ->> 'colaborador_nombre' <> 'Colaborador Prueba Siete'
     or d -> 'actividad' -> 0 ->> 'autor' <> 'Admin E7' then
    raise exception 'FALLA: actividad reciente: %', d -> 'actividad' -> 0;
  end if;
  if exists (select 1 from jsonb_array_elements(d -> 'actividad') x where x ->> 'tipo' = 'importacion') then
    raise exception 'FALLA: la importación no es actividad';
  end if;
  if jsonb_array_length(d -> 'serie_no_localizados') < 1 then
    raise exception 'FALLA: la serie semanal debe tener al menos la semana actual';
  end if;
end $$;

-- v_equipos.estado_desde y colaborador_activo
do $$ begin
  if (select estado_desde from public.v_equipos where serie = 'PRBE7-MANT') > now() - interval '39 days' then
    raise exception 'FALLA: estado_desde no tomó el movimiento que dejó al equipo en Mantenimiento';
  end if;
  if (select colaborador_activo from public.v_equipos where serie = 'PRBE7-ENTREGA') is not false then
    raise exception 'FALLA: colaborador_activo';
  end if;
end $$;

-- historial_global
do $$
declare n int; t bigint;
begin
  -- Por texto: serie o colaborador (sin acentos), con el total en cada fila.
  select count(*), max(h.total) into n, t from public.historial_global(p_texto => 'prbe7') h;
  if n <> 5 or t <> 5 then  -- 4 importaciones + 1 entrega
    raise exception 'FALLA: historial por texto devolvió % filas (total %)', n, t;
  end if;
  if (select count(*) from public.historial_global(p_texto => 'colaborador prueba siete')) <> 1 then
    raise exception 'FALLA: historial por colaborador';
  end if;
  -- Por tipo y usuario.
  if (select count(*) from public.historial_global(p_tipos => array['asignacion']::public.tipo_movimiento[],
        p_texto => 'prbe7', p_usuario => '00000000-0000-4000-8000-0000000007a1')) <> 1 then
    raise exception 'FALLA: historial por tipo y usuario';
  end if;
  -- Por fechas: el de hace 40 días queda fuera de «desde hace 30 días».
  if exists (select 1 from public.historial_global(p_desde => (privado.hoy() - 30), p_texto => 'prbe7-mant')) then
    raise exception 'FALLA: el filtro de fechas no excluyó un movimiento anterior';
  end if;
  if not exists (select 1 from public.historial_global(p_desde => (privado.hoy() - 45), p_hasta => privado.hoy() - 35,
        p_texto => 'prbe7-mant')) then
    raise exception 'FALLA: el filtro de fechas no incluyó un movimiento dentro del rango';
  end if;
  -- Paginación.
  if (select count(*) from public.historial_global(p_texto => 'prbe7', p_limite => 2, p_desplazamiento => 4)) <> 1 then
    raise exception 'FALLA: paginación';
  end if;
  if not exists (select 1 from public.usuarios_historial() where nombre = 'Admin E7') then
    raise exception 'FALLA: usuarios_historial';
  end if;
end $$;

-- Sin sesión: nada.
reset role;
set local role anon;
do $$ begin
  perform public.metricas_panel();
  raise exception 'FALLA: anon leyó el panel';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.historial_global();
  raise exception 'FALLA: anon leyó el historial';
exception when insufficient_privilege then null; end $$;

reset role;
select 'OK' as resultado;
rollback;
