-- Pruebas del indicador «Histórico»: lo enciende la importación, lo apagan un cambio de estado o
-- confirmar_estado(), y nadie lo pone a mano. Transacción con ROLLBACK: no deja datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000009a1', 'admin.hist@ejemplo.test'),
  ('00000000-0000-4000-8000-0000000009b2', 'lector.hist@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin', nombre = 'Admin Hist'
 where id = '00000000-0000-4000-8000-0000000009a1';
update public.perfiles set activo = true, nombre = 'Lector Hist'
 where id = '00000000-0000-4000-8000-0000000009b2';

-- Uno importado y uno dado de alta a mano.
select set_config('app.contexto', 'importacion', true);
insert into public.equipos (id, categoria, serie, marca, modelo, estado) values
  ('00000000-0000-4000-8000-0000000e0901', 'laptop', 'PRBHIST-IMP', 'HP', 'Hist', 'stock'),
  ('00000000-0000-4000-8000-0000000e0903', 'laptop', 'PRBHIST-IMP2', 'HP', 'Hist', 'stock');
select set_config('app.contexto', '', true);
insert into public.equipos (id, categoria, serie, marca, modelo, estado) values
  ('00000000-0000-4000-8000-0000000e0902', 'laptop', 'PRBHIST-ALTA', 'HP', 'Hist', 'stock');

do $$ begin
  if not (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0901') then
    raise exception 'FALLA: lo importado no quedó como histórico';
  end if;
  if (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0902') then
    raise exception 'FALLA: un alta manual quedó como histórica';
  end if;
  if not (select estado_historico from public.v_equipos where id = '00000000-0000-4000-8000-0000000e0901') then
    raise exception 'FALLA: v_equipos no expone estado_historico';
  end if;
end $$;

-- ── Lector: no puede confirmar ───────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009b2","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  perform public.confirmar_estado('00000000-0000-4000-8000-0000000e0901');
  raise exception 'FALLA: un Lector confirmó un estado';
exception when insufficient_privilege then null; end $$;
reset role;

-- ── Administrador ────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000009a1","role":"authenticated"}', true);
set local role authenticated;

-- Editar otros datos no lo quita, y el historial no lista estado_historico como campo editado.
update public.equipos set modelo = 'Hist 2' where id = '00000000-0000-4000-8000-0000000e0901';
-- Nadie lo enciende a mano.
update public.equipos set estado_historico = true where id = '00000000-0000-4000-8000-0000000e0902';
do $$ begin
  if not (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0901') then
    raise exception 'FALLA: una edición quitó la marca de histórico';
  end if;
  if exists (select 1 from public.movimientos where equipo_id = '00000000-0000-4000-8000-0000000e0901'
              and cambios ? 'estado_historico') then
    raise exception 'FALLA: el historial registró estado_historico como campo';
  end if;
  if (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0902') then
    raise exception 'FALLA: se encendió la marca de histórico a mano';
  end if;
  if exists (select 1 from public.movimientos where equipo_id = '00000000-0000-4000-8000-0000000e0902'
              and tipo = 'edicion') then
    raise exception 'FALLA: intentar encender la marca dejó un movimiento vacío';
  end if;
end $$;

-- Confirmar: la quita y deja su propio movimiento con la nota.
select public.confirmar_estado('00000000-0000-4000-8000-0000000e0901', 'Revisado en almacén');
do $$ begin
  if (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0901') then
    raise exception 'FALLA: confirmar_estado no quitó la marca';
  end if;
  if not exists (select 1 from public.movimientos where equipo_id = '00000000-0000-4000-8000-0000000e0901'
                  and tipo = 'confirmacion_estado' and nota = 'Revisado en almacén'
                  and estado_anterior = 'stock' and estado_nuevo = 'stock') then
    raise exception 'FALLA: no quedó el movimiento de confirmación';
  end if;
end $$;
-- Confirmar dos veces no se permite.
do $$ begin
  perform public.confirmar_estado('00000000-0000-4000-8000-0000000e0901');
  raise exception 'FALLA: se confirmó un estado ya revisado';
exception when check_violation then null; end $$;

-- Cambiar de estado la quita.
select public.cambiar_estado('00000000-0000-4000-8000-0000000e0903', 'mantenimiento');
do $$ begin
  if (select estado_historico from public.equipos where id = '00000000-0000-4000-8000-0000000e0903') then
    raise exception 'FALLA: un cambio de estado no quitó la marca';
  end if;
end $$;
reset role;

select 'OK' as resultado;
rollback;
