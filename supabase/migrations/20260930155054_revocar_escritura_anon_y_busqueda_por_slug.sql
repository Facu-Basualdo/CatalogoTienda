-- 1. Los proyectos creados antes del cambio de grants por defecto le dan a `anon`
--    insert/update/delete sobre toda tabla nueva de `public`. RLS ya lo frena, pero
--    el permiso no tiene que existir: anon sólo lee.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;

-- Y que las tablas futuras no lo hereden.
alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;

-- 2. Buscar "144hz" (sin espacio) no encontraba la etiqueta "144 Hz": se compara
--    además el slug normalizado de la consulta contra el slug de la etiqueta.
create or replace function private.productos_filtrados(p_filtros jsonb, p_categoria text, p_q text)
returns table (id uuid)
language sql stable
set search_path = ''
as $$
  with
  consulta as (
    select
      nullif(trim(coalesce(p_q, '')), '') as q,
      public.f_unaccent(lower(trim(coalesce(p_q, '')))) as q_norm,
      nullif(public.slugify(coalesce(p_q, '')), '') as q_slug
  ),
  categorias_incluidas as (
    select c.id
    from public.categorias c
    join public.categorias raiz on raiz.slug = p_categoria
    where c.id = raiz.id or c.padre_id = raiz.id
  ),
  filtros as (
    select * from private.filtros_validos(p_filtros)
  )
  select p.id
  from public.productos p, consulta c
  where p.publicado
    and (p_categoria is null or p.categoria_id in (select id from categorias_incluidas))
    and (
      c.q is null
      or p.busqueda @@ websearch_to_tsquery('spanish', public.f_unaccent(c.q))
      or exists (
        select 1 from public.producto_etiquetas pe
        join public.etiquetas e on e.id = pe.etiqueta_id
        where pe.producto_id = p.id
          and (strpos(public.f_unaccent(lower(e.valor)), c.q_norm) > 0
               or (c.q_slug is not null and strpos(e.slug, c.q_slug) > 0))
      )
      or exists (
        select 1 from public.producto_variantes v
        join public.variante_etiquetas ve on ve.variante_id = v.id
        join public.etiquetas e on e.id = ve.etiqueta_id
        where v.producto_id = p.id and v.activa
          and (strpos(public.f_unaccent(lower(e.valor)), c.q_norm) > 0
               or (c.q_slug is not null and strpos(e.slug, c.q_slug) > 0))
      )
    )
    and not exists (
      select 1 from filtros f
      where not f.es_variante
        and not exists (
          select 1 from public.producto_etiquetas pe
          join public.etiquetas e on e.id = pe.etiqueta_id
          where pe.producto_id = p.id and e.grupo_id = f.grupo_id and e.slug = any (f.slugs)
        )
    )
    and (
      not exists (select 1 from filtros f where f.es_variante)
      or exists (
        select 1 from public.producto_variantes v
        where v.producto_id = p.id and v.activa and v.stock > 0
          and private.variante_cumple(v.id, p_filtros)
      )
    )
$$;
