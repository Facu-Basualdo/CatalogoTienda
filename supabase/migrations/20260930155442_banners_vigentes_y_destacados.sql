-- 1. banners_vigentes: la ventana desde/hasta se evalúa con now() en la base.
--    Filtrarla en Next con Date.now() dentro de una función cacheada congela la hora
--    del primer render. Ver claude/web/cache-y-revalidacion.md#banners-y-ventanas-de-fecha
create function public.banners_vigentes()
returns setof public.banners
language sql stable
set search_path = ''
as $$
  select *
  from public.banners b
  where b.activo
    and (b.desde is null or b.desde <= now())
    and (b.hasta is null or b.hasta > now())
  order by b.orden, b.creado_en
$$;

revoke execute on function public.banners_vigentes() from public;
grant execute on function public.banners_vigentes() to anon, authenticated;

-- 2. buscar_productos con p_destacados (home). Agregar un parámetro crea otra
--    sobrecarga, así que se borra la versión anterior.
drop function public.buscar_productos(jsonb, text, text, text, int, int);

create function public.buscar_productos(
  p_filtros   jsonb default '{}'::jsonb,
  p_categoria text  default null,
  p_q         text  default null,
  p_orden     text  default 'relevancia',
  p_limite    int   default 24,
  p_offset    int   default 0,
  p_destacados boolean default false
)
returns table (
  id              uuid,
  slug            text,
  nombre          text,
  precio_desde    numeric,
  precio_varia    boolean,
  precio_anterior numeric,
  stock_total     int,
  disponible      boolean,
  imagen_path     text,
  imagen_alt      text,
  imagen_ancho    int,
  imagen_alto     int,
  total           bigint
)
language sql stable
set search_path = ''
as $$
  with
  ids as (
    select id from private.productos_filtrados(p_filtros, p_categoria, p_q)
  ),
  consulta as (
    select case when nullif(trim(coalesce(p_q, '')), '') is null then null
                else websearch_to_tsquery('spanish', public.f_unaccent(trim(p_q))) end as tsq
  ),
  derivados as (
    select
      p.id, p.slug, p.nombre, p.precio_anterior, p.creado_en, p.busqueda,
      agg.stock_total,
      agg.stock_total > 0 as disponible,
      agg.precio_desde,
      agg.precio_varia
    from public.productos p
    join ids on ids.id = p.id
    cross join lateral (
      select
        coalesce(sum(v.stock), 0)::int as stock_total,
        -- El precio "desde" prioriza variantes con stock.
        coalesce(
          min(coalesce(v.precio, p.precio)) filter (where v.stock > 0),
          min(coalesce(v.precio, p.precio)),
          p.precio
        ) as precio_desde,
        count(distinct coalesce(v.precio, p.precio)) > 1 as precio_varia
      from public.producto_variantes v
      where v.producto_id = p.id and v.activa
    ) agg
    where not coalesce(p_destacados, false) or p.destacado
  )
  select
    d.id, d.slug, d.nombre, d.precio_desde, d.precio_varia, d.precio_anterior,
    d.stock_total, d.disponible,
    img.path, img.alt, img.ancho, img.alto,
    count(*) over () as total
  from derivados d
  cross join consulta c
  left join lateral (
    select i.path, i.alt, i.ancho, i.alto
    from public.producto_imagenes i
    where i.producto_id = d.id
    order by i.orden, i.creado_en
    limit 1
  ) img on true
  order by
    -- Sin stock siempre al final, cualquiera sea el orden.
    d.disponible desc,
    case when p_orden = 'precio-asc' then d.precio_desde end asc,
    case when p_orden = 'precio-desc' then d.precio_desde end desc,
    case when p_orden = 'relevancia' and c.tsq is not null then ts_rank(d.busqueda, c.tsq) end desc nulls last,
    d.creado_en desc,
    d.id
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke execute on function public.buscar_productos(jsonb, text, text, text, int, int, boolean) from public;
grant execute on function public.buscar_productos(jsonb, text, text, text, int, int, boolean) to anon, authenticated;
