-- Las policies `for all` también cubren SELECT y se suman a la de lectura: dos
-- policies permisivas por fila (advisor multiple_permissive_policies). Se separan
-- en insert/update/delete.

do $$
declare
  t text;
begin
  foreach t in array array['producto_imagenes', 'producto_etiquetas', 'producto_variantes', 'variante_etiquetas'] loop
    execute format('drop policy "admin escribe" on public.%I', t);
    execute format('create policy "admin inserta" on public.%I for insert to authenticated with check ((select private.es_admin()))', t);
    execute format('create policy "admin actualiza" on public.%I for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()))', t);
    execute format('create policy "admin borra" on public.%I for delete to authenticated using ((select private.es_admin()))', t);
  end loop;
end;
$$;
