-- RLS de todas las tablas. Modelo en claude/supabase/seguridad-rls.md
--
-- Las policies se separan por rol: `anon` nunca evalúa es_admin() (no tiene
-- execute sobre private.es_admin), `authenticated` sí.

-- security definer: si corriera como el usuario, chocaría con el RLS de `admins`
-- (sin policies) y daría siempre false. Vive en `private`, que la API no expone.
create function private.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

revoke execute on function private.es_admin() from public, anon;
grant execute on function private.es_admin() to authenticated;

-- Wrapper invoker para que la web pregunte "¿soy admin?" por RPC.
create function public.es_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$ select private.es_admin() $$;

revoke execute on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

alter table public.admins enable row level security;  -- sin policies a propósito

-- ---------------------------------------------------------------------------
-- productos
-- ---------------------------------------------------------------------------

alter table public.productos enable row level security;

create policy "anon ve publicados" on public.productos
  for select to anon using (publicado);
create policy "authenticated ve publicados, admin todo" on public.productos
  for select to authenticated using (publicado or (select private.es_admin()));
create policy "admin inserta" on public.productos
  for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.productos
  for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.productos
  for delete to authenticated using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Tablas hijas de productos: miran al padre. Si no, un borrador filtraría sus
-- imágenes y variantes por la API.
-- ---------------------------------------------------------------------------

alter table public.producto_imagenes enable row level security;

create policy "anon ve de publicados" on public.producto_imagenes
  for select to anon
  using (exists (select 1 from public.productos p where p.id = producto_id and p.publicado));
create policy "authenticated ve de publicados, admin todo" on public.producto_imagenes
  for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.productos p where p.id = producto_id and p.publicado));
create policy "admin escribe" on public.producto_imagenes
  for all to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));

alter table public.producto_etiquetas enable row level security;

create policy "anon ve de publicados" on public.producto_etiquetas
  for select to anon
  using (exists (select 1 from public.productos p where p.id = producto_id and p.publicado));
create policy "authenticated ve de publicados, admin todo" on public.producto_etiquetas
  for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.productos p where p.id = producto_id and p.publicado));
create policy "admin escribe" on public.producto_etiquetas
  for all to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));

-- Las variantes inactivas tampoco se ven desde la tienda.
alter table public.producto_variantes enable row level security;

create policy "anon ve activas de publicados" on public.producto_variantes
  for select to anon
  using (activa and exists (select 1 from public.productos p where p.id = producto_id and p.publicado));
create policy "authenticated ve activas de publicados, admin todo" on public.producto_variantes
  for select to authenticated
  using ((select private.es_admin()) or (activa and exists (select 1 from public.productos p where p.id = producto_id and p.publicado)));
create policy "admin escribe" on public.producto_variantes
  for all to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));

alter table public.variante_etiquetas enable row level security;

create policy "anon ve de variantes visibles" on public.variante_etiquetas
  for select to anon
  using (exists (select 1 from public.producto_variantes v where v.id = variante_id));
create policy "authenticated ve de variantes visibles, admin todo" on public.variante_etiquetas
  for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.producto_variantes v where v.id = variante_id));
create policy "admin escribe" on public.variante_etiquetas
  for all to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Catálogos públicos: lectura libre, escritura admin.
-- ---------------------------------------------------------------------------

alter table public.categorias enable row level security;
create policy "todos leen" on public.categorias for select to anon, authenticated using (true);
create policy "admin inserta" on public.categorias for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.categorias for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.categorias for delete to authenticated using ((select private.es_admin()));

alter table public.grupos_etiqueta enable row level security;
create policy "todos leen" on public.grupos_etiqueta for select to anon, authenticated using (true);
create policy "admin inserta" on public.grupos_etiqueta for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.grupos_etiqueta for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.grupos_etiqueta for delete to authenticated using ((select private.es_admin()));

alter table public.etiquetas enable row level security;
create policy "todos leen" on public.etiquetas for select to anon, authenticated using (true);
create policy "admin inserta" on public.etiquetas for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.etiquetas for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.etiquetas for delete to authenticated using ((select private.es_admin()));

-- La ventana desde/hasta se filtra en la consulta, no acá (ver cache-y-revalidacion).
alter table public.banners enable row level security;
create policy "anon ve activos" on public.banners for select to anon using (activo);
create policy "authenticated ve activos, admin todo" on public.banners
  for select to authenticated using (activo or (select private.es_admin()));
create policy "admin inserta" on public.banners for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.banners for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.banners for delete to authenticated using ((select private.es_admin()));
