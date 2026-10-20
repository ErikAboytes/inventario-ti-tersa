-- Etapa 6 · Búsqueda global (docs/01 §3.3 y §7.5; doc 04 P-31).
-- Una sola llamada busca equipos, colaboradores, entregas y devoluciones sin importar acentos ni mayúsculas
-- («Chavez» encuentra «Chávez»). Es security invoker: el RLS decide qué ve cada usuario.
-- La URL del QR y el UUID los resuelve el cliente antes de llamar (src/features/busqueda/destino.ts).

create function public.buscar_global(p_texto text, p_limite int default 8)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_texto text := btrim(coalesce(p_texto, ''));
  v_mayus text := upper(v_texto);
  -- Comodines de LIKE escapados («50%» no debe coincidir con todo) y las palabras en orden con lo que
  -- sea entre ellas: «jose lopez» encuentra «José Carlos López».
  v_patron text := '%' || regexp_replace(
    replace(replace(replace(public.normalizar_texto(v_texto), '\', '\\'), '%', '\%'), '_', '\_'),
    '\s+', '%', 'g') || '%';
  v_limite int := least(greatest(coalesce(p_limite, 8), 1), 50);
  v_exacto jsonb;
begin
  if length(v_texto) < 2 then
    return jsonb_build_object('exacto', null, 'equipos', '[]'::jsonb, 'colaboradores', '[]'::jsonb,
      'asignaciones', '[]'::jsonb, 'devoluciones', '[]'::jsonb);
  end if;

  -- Coincidencia exacta de serie o de folio: el buscador abre ese registro directamente.
  select jsonb_build_object('tipo', 'equipo', 'id', e.id) into v_exacto
    from public.equipos e where upper(btrim(e.serie)) = v_mayus;
  if v_exacto is null then
    select jsonb_build_object('tipo', 'asignacion', 'id', a.id) into v_exacto
      from public.asignaciones a where upper(a.folio) = v_mayus;
  end if;
  if v_exacto is null then
    select jsonb_build_object('tipo', 'devolucion', 'id', d.id) into v_exacto
      from public.devoluciones d where upper(d.folio) = v_mayus;
  end if;

  return jsonb_build_object(
    'exacto', v_exacto,
    'equipos', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select v.id, v.serie, v.categoria, v.marca, v.modelo, v.estado, v.apartado_para,
               v.motivo_desactivacion, v.colaborador_nombre, v.ubicacion
          from public.v_equipos v
         where v.busqueda like v_patron
         -- Primero las series que empiezan con lo escrito.
         order by (upper(v.serie) like v_mayus || '%') desc, v.serie
         limit v_limite
      ) x), '[]'::jsonb),
    'colaboradores', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select c.id, c.nombre_completo, c.puesto, c.numero_empleado, c.activo
          from public.colaboradores c
         where c.busqueda like v_patron
         order by c.activo desc, c.nombre_completo
         limit v_limite
      ) x), '[]'::jsonb),
    'asignaciones', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select a.id, a.folio, a.fecha_entrega, a.colaborador_nombre, a.activa, a.es_historica
          from public.v_asignaciones a
         where a.busqueda like v_patron
         order by a.fecha_entrega desc nulls last, a.folio desc
         limit v_limite
      ) x), '[]'::jsonb),
    'devoluciones', coalesce((
      select jsonb_agg(to_jsonb(x)) from (
        select d.id, d.folio, d.fecha, d.es_cierre_incidencia, a.folio as asignacion_folio,
               co.nombre_completo as colaborador_nombre
          from public.devoluciones d
          join public.asignaciones a on a.id = d.asignacion_id
          join public.colaboradores co on co.id = a.colaborador_id
         where public.normalizar_texto(concat_ws(' ', d.folio, a.folio, co.nombre_completo)) like v_patron
         order by d.fecha desc, d.folio desc
         limit v_limite
      ) x), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.buscar_global(text, int) from public, anon;
grant execute on function public.buscar_global(text, int) to authenticated;
