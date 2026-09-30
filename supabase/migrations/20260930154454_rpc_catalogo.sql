-- RPC del catálogo. Semántica de filtros en claude/supabase/etiquetas.md y
-- claude/supabase/variantes-y-stock.md
--
-- p_filtros: {"grupo-slug": ["etiqueta-slug", ...], ...}
--   AND entre grupos, OR dentro del grupo. Claves de grupo desconocidas se ignoran.
--   Grupos de variante: UNA misma variante activa con stock tiene que cumplirlos todos.
--
-- Todas son security invoker: respetan el RLS de quien llama (anon no ve borradores).

-- ---------------------------------------------------------------------------
-- Helpers (schema private, no expuesto por la API)
-- ---------------------------------------------------------------------------

-- Filtros válidos: sólo grupos existentes y arrays no vacíos.
create function private.filtros_validos(p_filtros jsonb)
returns table (grupo_id uuid, es_variante boolean, slugs text[])
language sql stable
set search_path = ''
as $$
  select g.id, g.es_variante, array(select jsonb_array_elements_text(f.value))
  from jsonb_each(coalesce(p_filtros, '{}'::jsonb)) f
  join public.grupos_etiqueta g on g.slug = f.key
  where jsonb_typeof(f.value) = 'array' and jsonb_array_length(f.value) > 0
$$;

-- ¿La variante cumple todos los filtros de grupos de variante?
create function private.variante_cumple(p_variante_id uuid, p_filtros jsonb)
returns boolean
language sql stable
set search_path = ''
as $$
  select not exists (
    select 1
    from private.filtros_validos(p_filtros) f
    where f.es_variante
      and not exists (
        select 1
        from public.variante_etiquetas ve
        join public.etiquetas e on e.id = ve.etiqueta_id
        where ve.variante_id = p_variante_id
          and ve.grupo_id = f.grupo_id
          and e.slug = any (f.slugs)
      )
  )
$$;

-- Ids de productos publicados que cumplen categoría, búsqueda y filtros.
create function private.productos_filtrados(p_filtros jsonb, p_categoria text, p_q text)
returns table (id uuid)
language sql stable
set search_path = ''
as $$
  with
  consulta as (
    select
      nullif(trim(coalesce(p_q, '')), '') as q,
      public.f_unaccent(lower(trim(coalesce(p_q, '')))) as q_norm
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
          and strpos(public.f_unaccent(lower(e.valor)), c.q_norm) > 0
      )
      or exists (
        select 1 from public.producto_variantes v
        join public.variante_etiquetas ve on ve.variante_id = v.id
        join public.etiquetas e on e.id = ve.etiqueta_id
        where v.producto_id = p.id and v.activa
          and strpos(public.f_unaccent(lower(e.valor)), c.q_norm) > 0
      )
    )
    -- Grupos normales: el producto tiene alguna de las etiquetas de cada grupo.
    and not exists (
      select 1 from filtros f
      where not f.es_variante
        and not exists (
          select 1 from public.producto_etiquetas pe
          join public.etiquetas e on e.id = pe.etiqueta_id
          where pe.producto_id = p.id and e.grupo_id = f.grupo_id and e.slug = any (f.slugs)
        )
    )
    -- Grupos de variante: si hay alguno filtrado, una misma variante con stock los cumple.
    and (
      not exists (select 1 from filtros f where f.es_variante)
      or exists (
        select 1 from public.producto_variantes v
        where v.producto_id = p.id and v.activa and v.stock > 0
          and private.variante_cumple(v.id, p_filtros)
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- buscar_productos: listado paginado del catálogo
-- ---------------------------------------------------------------------------

-- Paginación con OFFSET a propósito: el catálogo usa páginas numeradas que se
-- comparten por URL (?pagina=3) con cualquier orden. Con cientos de productos
-- el costo es despreciable; ver claude/web/catalogo.md#paginación
create function public.buscar_productos(
  p_filtros   jsonb default '{}'::jsonb,
  p_categoria text  default null,
  p_q         text  default null,
  p_orden     text  default 'relevancia',
  p_limite    int   default 24,
  p_offset    int   default 0
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

-- ---------------------------------------------------------------------------
-- facetas_productos: opciones del panel de filtros con su cantidad
-- ---------------------------------------------------------------------------

-- El conteo de cada grupo aplica todos los filtros MENOS el de ese grupo; si no,
-- al tildar "144 Hz" las otras opciones de refresco quedan en 0 y desaparecen.
create function public.facetas_productos(
  p_filtros   jsonb default '{}'::jsonb,
  p_categoria text  default null,
  p_q         text  default null
)
returns table (
  grupo_slug     text,
  grupo_nombre   text,
  grupo_orden    int,
  es_variante    boolean,
  etiqueta_slug  text,
  etiqueta_valor text,
  etiqueta_orden int,
  color_hex      text,
  cantidad       bigint,
  seleccionada   boolean
)
language sql stable
set search_path = ''
as $$
  with
  grupos as (
    select g.* from public.grupos_etiqueta g where g.visible_en_filtros
  ),
  -- Una llamada a productos_filtrados por grupo, sin el filtro de ese grupo.
  candidatos as (
    select g.id as grupo_id, g.slug as grupo_slug, g.es_variante, fp.id as producto_id
    from grupos g
    cross join lateral private.productos_filtrados(
      coalesce(p_filtros, '{}'::jsonb) - g.slug, p_categoria, p_q
    ) fp
  ),
  conteos as (
    select e.id as etiqueta_id, count(distinct c.producto_id) as cantidad
    from candidatos c
    join public.etiquetas e on e.grupo_id = c.grupo_id
    where
      case
        when c.es_variante then exists (
          select 1
          from public.producto_variantes v
          join public.variante_etiquetas ve on ve.variante_id = v.id
          where v.producto_id = c.producto_id and v.activa and v.stock > 0
            and ve.etiqueta_id = e.id
            and private.variante_cumple(v.id, coalesce(p_filtros, '{}'::jsonb) - c.grupo_slug)
        )
        else exists (
          select 1 from public.producto_etiquetas pe
          where pe.producto_id = c.producto_id and pe.etiqueta_id = e.id
        )
      end
    group by e.id
  )
  select
    g.slug, g.nombre, g.orden, g.es_variante,
    e.slug, e.valor, e.orden, e.color_hex,
    coalesce(ct.cantidad, 0),
    coalesce((p_filtros -> g.slug) ? e.slug, false)
  from grupos g
  join public.etiquetas e on e.grupo_id = g.id
  left join conteos ct on ct.etiqueta_id = e.id
  -- Las seleccionadas se devuelven aunque den 0: la UI las muestra deshabilitadas.
  where coalesce(ct.cantidad, 0) > 0 or coalesce((p_filtros -> g.slug) ? e.slug, false)
  order by g.orden, g.nombre, e.orden, e.valor
$$;

-- ---------------------------------------------------------------------------
-- guardar_variantes: reemplaza TODAS las variantes de un producto en una transacción
-- ---------------------------------------------------------------------------

-- p_variantes: [{ "etiquetas": [uuid], "sku": text|null, "precio": number|null,
--                 "stock": int, "activa": bool }]
-- La identidad de una variante es su combinación de etiquetas (`clave`): las que
-- no vienen se borran, las que vienen se crean o actualizan.
create function public.guardar_variantes(p_producto_id uuid, p_variantes jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_item   jsonb;
  v_orden  int := 0;
  v_ids    uuid[];
  v_clave  text;
  v_claves text[] := '{}';
  v_id     uuid;
begin
  if jsonb_typeof(p_variantes) <> 'array' or jsonb_array_length(p_variantes) = 0 then
    raise exception 'Un producto necesita al menos una variante';
  end if;

  -- 1. Calcular las claves que quedan.
  for v_item in select * from jsonb_array_elements(p_variantes) loop
    v_ids := array(select jsonb_array_elements_text(coalesce(v_item -> 'etiquetas', '[]'::jsonb))::uuid);
    select coalesce(string_agg(e.slug, '/' order by g.orden, g.slug), '')
      into v_clave
      from public.etiquetas e
      join public.grupos_etiqueta g on g.id = e.grupo_id
      where e.id = any (v_ids);
    if v_clave = any (v_claves) then
      raise exception 'Combinación repetida: %', v_clave;
    end if;
    v_claves := v_claves || v_clave;
  end loop;

  -- 2. Borrar primero las que no vienen (libera sus SKU).
  delete from public.producto_variantes
  where producto_id = p_producto_id and clave <> all (v_claves);

  -- 3. Crear o actualizar cada una y reescribir sus etiquetas.
  for v_item in select * from jsonb_array_elements(p_variantes) loop
    v_ids := array(select jsonb_array_elements_text(coalesce(v_item -> 'etiquetas', '[]'::jsonb))::uuid);
    v_clave := v_claves[v_orden + 1];

    insert into public.producto_variantes (producto_id, clave, sku, precio, stock, activa, orden)
    values (
      p_producto_id,
      v_clave,
      nullif(trim(v_item ->> 'sku'), ''),
      (v_item ->> 'precio')::numeric,
      coalesce((v_item ->> 'stock')::int, 0),
      coalesce((v_item ->> 'activa')::boolean, true),
      v_orden
    )
    on conflict (producto_id, clave) do update
      set sku = excluded.sku,
          precio = excluded.precio,
          stock = excluded.stock,
          activa = excluded.activa,
          orden = excluded.orden
    returning id into v_id;

    delete from public.variante_etiquetas where variante_id = v_id;
    insert into public.variante_etiquetas (variante_id, etiqueta_id, grupo_id)
    select v_id, e.id, e.grupo_id from public.etiquetas e where e.id = any (v_ids);

    v_orden := v_orden + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- reordenar_imagenes: reescribe `orden` según la posición en el array
-- ---------------------------------------------------------------------------

create function public.reordenar_imagenes(p_producto_id uuid, p_ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.producto_imagenes
  set orden = array_position(p_ids, id) - 1
  where producto_id = p_producto_id and id = any (p_ids)
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  private.filtros_validos(jsonb),
  private.variante_cumple(uuid, jsonb),
  private.productos_filtrados(jsonb, text, text),
  public.buscar_productos(jsonb, text, text, text, int, int),
  public.facetas_productos(jsonb, text, text),
  public.guardar_variantes(uuid, jsonb),
  public.reordenar_imagenes(uuid, uuid[])
from public;

grant execute on function
  private.filtros_validos(jsonb),
  private.variante_cumple(uuid, jsonb),
  private.productos_filtrados(jsonb, text, text),
  public.buscar_productos(jsonb, text, text, text, int, int),
  public.facetas_productos(jsonb, text, text)
to anon, authenticated;

-- Escritura: sólo authenticated; RLS exige además es_admin().
revoke execute on function
  public.guardar_variantes(uuid, jsonb),
  public.reordenar_imagenes(uuid, uuid[])
from anon;
grant execute on function
  public.guardar_variantes(uuid, jsonb),
  public.reordenar_imagenes(uuid, uuid[])
to authenticated;
