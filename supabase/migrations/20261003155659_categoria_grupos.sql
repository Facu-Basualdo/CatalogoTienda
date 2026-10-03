-- Qué grupos de etiquetas (características y variantes) pide cada categoría. El panel
-- muestra, al cargar un producto, sólo los grupos de su categoría (más los heredados de
-- la categoría padre y la marca, que va siempre). No restringe nada en la base: un
-- producto puede tener etiquetas de otros grupos (el panel las sigue mostrando).
-- Ver claude/supabase/etiquetas.md#grupos-por-categoría

create table public.categoria_grupos (
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  grupo_id     uuid not null references public.grupos_etiqueta (id) on delete cascade,
  primary key (categoria_id, grupo_id)
);
create index categoria_grupos_grupo_idx on public.categoria_grupos (grupo_id);

grant select on public.categoria_grupos to anon, authenticated;
grant insert, delete on public.categoria_grupos to authenticated;

alter table public.categoria_grupos enable row level security;
create policy "todos leen" on public.categoria_grupos for select to anon, authenticated using (true);
create policy "admin inserta" on public.categoria_grupos for insert to authenticated with check ((select private.es_admin()));
create policy "admin borra" on public.categoria_grupos for delete to authenticated using ((select private.es_admin()));

-- Relleno inicial: cada categoría con los grupos que ya usan sus productos (etiquetas
-- comunes y de variante). La marca no: el panel la muestra siempre.
insert into public.categoria_grupos (categoria_id, grupo_id)
select distinct p.categoria_id, e.grupo_id
from public.productos p
join (
  select pe.producto_id, pe.etiqueta_id from public.producto_etiquetas pe
  union
  select v.producto_id, ve.etiqueta_id
  from public.variante_etiquetas ve
  join public.producto_variantes v on v.id = ve.variante_id
) u on u.producto_id = p.id
join public.etiquetas e on e.id = u.etiqueta_id
join public.grupos_etiqueta g on g.id = e.grupo_id
where p.categoria_id is not null and not g.es_marca
on conflict do nothing;
