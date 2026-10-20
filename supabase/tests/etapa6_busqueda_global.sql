-- Pruebas de la Etapa 6: buscar_global (acentos, varias palabras, serie y folio exactos, permisos).
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000006a1', 'admin.e6@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000006b2', 'lector.e6@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin E6'
 where id = '00000000-0000-4000-8000-0000000006a1';
update public.perfiles set activo = true where id = '00000000-0000-4000-8000-0000000006b2';

insert into public.colaboradores (id, nombre_completo, puesto) values
  ('00000000-0000-4000-8000-0000000c0601', 'Ánfora Chávez Zúñiga Pruebaseis', 'Gerente de pruebas');
select set_config('app.contexto', 'importacion', true);
insert into public.equipos (id, categoria, serie, marca, modelo, estado) values
  ('00000000-0000-4000-8000-0000000e0601', 'laptop', 'PRBE6X100', 'HP', 'ProBook Seis', 'stock'),
  ('00000000-0000-4000-8000-0000000e0602', 'monitor', 'PRBE6X1001', 'HP', 'Monitor Seis', 'stock');
select set_config('app.contexto', '', true);

-- El administrador registra una entrega para tener un folio que buscar.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000006a1","role":"authenticated"}', true);
set local role authenticated;
create temp table _e6 on commit drop as
select public.crear_asignacion('00000000-0000-4000-8000-0000000c0601',
  array['00000000-0000-4000-8000-0000000e0602']::uuid[]) as r;

-- ── Lector: la búsqueda es de consulta, la puede usar cualquier usuario activo ─
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000006b2","role":"authenticated"}', true);

do $$
declare r jsonb;
begin
  -- Sin acentos ni mayúsculas, y con palabras salteadas.
  r := public.buscar_global('chavez pruebaseis');
  if jsonb_array_length(r -> 'colaboradores') <> 1 then
    raise exception 'FALLA: «chavez pruebaseis» no encontró a «Ánfora Chávez Zúñiga Pruebaseis»: %', r -> 'colaboradores';
  end if;
  if r -> 'exacto' <> 'null'::jsonb then
    raise exception 'FALLA: un nombre no debe ser coincidencia exacta';
  end if;

  -- La entrega se encuentra por el nombre del colaborador y por la serie de su equipo.
  if jsonb_array_length(r -> 'asignaciones') <> 1 then
    raise exception 'FALLA: la entrega no apareció al buscar al colaborador';
  end if;
  if jsonb_array_length(public.buscar_global('prbe6x1001') -> 'asignaciones') <> 1 then
    raise exception 'FALLA: la entrega no apareció al buscar la serie de su equipo';
  end if;

  -- Serie exacta (sin importar mayúsculas ni espacios) abre el equipo; la parcial no.
  r := public.buscar_global('  prbe6x100 ');
  if r -> 'exacto' <> jsonb_build_object('tipo', 'equipo', 'id', '00000000-0000-4000-8000-0000000e0601') then
    raise exception 'FALLA: la serie exacta no se reconoció: %', r -> 'exacto';
  end if;
  if r -> 'equipos' -> 0 ->> 'serie' <> 'PRBE6X100' then
    raise exception 'FALLA: la serie que empieza con lo escrito debe ir primero';
  end if;
  if public.buscar_global('PRBE6X10') -> 'exacto' <> 'null'::jsonb then
    raise exception 'FALLA: una serie parcial se tomó como exacta';
  end if;

  -- Folio exacto de la entrega.
  r := public.buscar_global(lower((select e.r ->> 'folio' from _e6 e)));
  if r -> 'exacto' ->> 'tipo' <> 'asignacion'
     or r -> 'exacto' ->> 'id' <> (select e.r ->> 'id' from _e6 e) then
    raise exception 'FALLA: el folio exacto no abrió la entrega: %', r -> 'exacto';
  end if;

  -- Los comodines se toman literalmente y el texto corto no busca.
  if jsonb_array_length(public.buscar_global('%%%') -> 'equipos') <> 0 then
    raise exception 'FALLA: «%%%%%%» coincidió con todo';
  end if;
  if jsonb_array_length(public.buscar_global('h') -> 'equipos') <> 0 then
    raise exception 'FALLA: un solo carácter no debe buscar';
  end if;
  -- El límite se respeta.
  if jsonb_array_length(public.buscar_global('hp', 3) -> 'equipos') > 3 then
    raise exception 'FALLA: no respetó el límite';
  end if;
end $$;

-- ── Sin sesión: anon no puede llamarla ─────────────────────────────────────────
reset role;
set local role anon;
do $$ begin
  perform public.buscar_global('hp');
  raise exception 'FALLA: anon usó la búsqueda global';
exception when insufficient_privilege then null; end $$;

reset role;
select 'OK' as resultado;
rollback;
