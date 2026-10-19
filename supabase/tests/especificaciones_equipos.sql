-- Pruebas de las especificaciones de Desktop y Laptop.
-- Se ejecutan dentro de una transacción que termina en ROLLBACK: no dejan datos.
-- Cada fallo lanza una excepción «FALLA: …»; si todo pasa, la última consulta devuelve 'OK'.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin.prueba@ejemplo.test');
update public.perfiles set activo = true, rol = 'admin' where id = '00000000-0000-4000-8000-0000000000a1';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
set local role authenticated;

-- Una laptop sin especificaciones se acepta: son opcionales.
insert into public.equipos (id, categoria, serie, marca, modelo)
values ('00000000-0000-4000-8000-0000000f0001', 'laptop', 'PRB-SPEC-1', 'HP', 'ProBook 440 G8');

-- Con especificaciones también, y el cambio queda en el historial.
update public.equipos
   set cpu = 'Intel Core i5-1135G7', ram_gb = 8, almacenamiento = 'SSD 256 GB',
       sistema_operativo = 'Windows 11 Pro'
 where id = '00000000-0000-4000-8000-0000000f0001';
do $$ begin
  if not exists (select 1 from public.movimientos
                  where equipo_id = '00000000-0000-4000-8000-0000000f0001'
                    and cambios -> 'ram_gb' = '[null, 8]'::jsonb) then
    raise exception 'FALLA: el cambio de RAM no quedó en el historial';
  end if;
  if (select cpu from public.v_equipos where id = '00000000-0000-4000-8000-0000000f0001')
     is distinct from 'Intel Core i5-1135G7' then
    raise exception 'FALLA: v_equipos no expone el CPU';
  end if;
end $$;

-- RAM fuera de rango.
do $$ begin
  update public.equipos set ram_gb = 0 where id = '00000000-0000-4000-8000-0000000f0001';
  raise exception 'FALLA: se aceptó RAM 0';
exception when check_violation then null; end $$;

-- Un monitor no lleva especificaciones.
do $$ begin
  insert into public.equipos (categoria, serie, marca, modelo, cpu)
  values ('monitor', 'PRB-SPEC-2', 'HP', 'V24', 'Intel');
  raise exception 'FALLA: un monitor aceptó CPU';
exception when check_violation then null; end $$;

-- Pasar la laptop a Monitor sin limpiar las especificaciones se rechaza.
do $$ begin
  update public.equipos set categoria = 'monitor' where id = '00000000-0000-4000-8000-0000000f0001';
  raise exception 'FALLA: se cambió a Monitor conservando especificaciones';
exception when check_violation then null; end $$;

reset role;

select 'OK' as resultado;
rollback;
