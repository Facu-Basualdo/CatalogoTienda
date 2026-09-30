-- Bucket público de imágenes del catálogo. Lectura por URL pública (sin policy);
-- escritura sólo admin. Ver claude/supabase/imagenes.md

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do nothing;

-- select hace falta para listar y para remove(); el bucket público no lo necesita
-- para servir las URLs.
create policy "catalogo: admin lee" on storage.objects
  for select to authenticated using (bucket_id = 'catalogo' and (select private.es_admin()));
create policy "catalogo: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'catalogo' and (select private.es_admin()));
create policy "catalogo: admin actualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalogo' and (select private.es_admin()))
  with check (bucket_id = 'catalogo' and (select private.es_admin()));
create policy "catalogo: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'catalogo' and (select private.es_admin()));
