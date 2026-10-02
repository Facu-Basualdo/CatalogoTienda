-- Promociones. Diseño en docs/plan-implementacion.md (fase 6); reglas en
-- claude/supabase/promociones.md.
--
-- Tipos:
--   porcentaje      valor = % de descuento por unidad (precio mostrado en la tienda)
--   monto_fijo      valor = $ de descuento por unidad   (precio mostrado en la tienda)
--   nxm             lleva N, paga M                      (se aplica en el carrito)
--   segunda_unidad  valor = % de descuento de cada 2da  (se aplica en el carrito)
-- No se acumulan: cada unidad recibe la promoción que más le descuenta.

create type public.tipo_promocion as enum ('porcentaje', 'monto_fijo', 'nxm', 'segunda_unidad');

create table public.promociones (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (length(trim(nombre)) between 1 and 80),
  tipo         public.tipo_promocion not null,
  valor        numeric(12, 2) check (valor > 0),
  lleva        int check (lleva between 2 and 10),
  paga         int check (paga >= 1),
  alcance_todo boolean not null default false,   -- explícito: sin alcance no aplica a nada
  activa       boolean not null default true,
  desde        timestamptz,
  hasta        timestamptz,
  creado_en    timestamptz not null default now(),
  check (desde is null or hasta is null or hasta > desde),
  check (case tipo
    when 'porcentaje'     then valor is not null and valor <= 90 and lleva is null and paga is null
    when 'monto_fijo'     then valor is not null and lleva is null and paga is null
    when 'segunda_unidad' then valor is not null and valor <= 100 and lleva is null and paga is null
    when 'nxm'            then valor is null and lleva is not null and paga is not null and paga < lleva
  end)
);

create table public.promocion_alcance (
  id           uuid primary key default gen_random_uuid(),
  promocion_id uuid not null references public.promociones (id) on delete cascade,
  producto_id  uuid references public.productos (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete cascade,
  etiqueta_id  uuid references public.etiquetas (id) on delete cascade,
  check (num_nonnulls(producto_id, categoria_id, etiqueta_id) = 1)
);
create index promocion_alcance_promocion_idx on public.promocion_alcance (promocion_id);
create index promocion_alcance_producto_idx on public.promocion_alcance (producto_id);
create index promocion_alcance_categoria_idx on public.promocion_alcance (categoria_id);
create index promocion_alcance_etiqueta_idx on public.promocion_alcance (etiqueta_id);

-- Grants + RLS. anon lee sólo las activas (las necesitan los RPC invoker del catálogo).
grant select on public.promociones, public.promocion_alcance to anon, authenticated;
grant insert, update, delete on public.promociones, public.promocion_alcance to authenticated;

alter table public.promociones enable row level security;
create policy "anon ve activas" on public.promociones for select to anon using (activa);
create policy "authenticated ve activas, admin todo" on public.promociones
  for select to authenticated using (activa or (select private.es_admin()));
create policy "admin inserta" on public.promociones for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.promociones for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.promociones for delete to authenticated using ((select private.es_admin()));

alter table public.promocion_alcance enable row level security;
create policy "anon ve de activas" on public.promocion_alcance for select to anon
  using (exists (select 1 from public.promociones p where p.id = promocion_id));
create policy "authenticated ve de activas, admin todo" on public.promocion_alcance for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.promociones p where p.id = promocion_id));
create policy "admin inserta" on public.promocion_alcance for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.promocion_alcance for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.promocion_alcance for delete to authenticated using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Promociones vigentes AHORA que alcanzan a un producto: por producto, por su categoría
-- (o la categoría padre), por una etiqueta del producto o de sus variantes, o alcance_todo.
-- Filtra activa y ventana explícitamente: también corre dentro de crear_pedido (definer).
create function private.promociones_aplicables(p_producto_id uuid)
returns setof public.promociones
language sql stable
set search_path = ''
as $$
  select pr.*
  from public.promociones pr
  where pr.activa
    and (pr.desde is null or pr.desde <= now())
    and (pr.hasta is null or pr.hasta > now())
    and (
      pr.alcance_todo
      or exists (
        select 1
        from public.promocion_alcance a
        left join public.productos p on p.id = p_producto_id
        left join public.categorias c on c.id = p.categoria_id
        where a.promocion_id = pr.id
          and (
            a.producto_id = p_producto_id
            or (a.categoria_id is not null and (a.categoria_id = p.categoria_id or a.categoria_id = c.padre_id))
            or (a.etiqueta_id is not null and (
                  exists (select 1 from public.producto_etiquetas pe
                           where pe.producto_id = p_producto_id and pe.etiqueta_id = a.etiqueta_id)
                  or exists (select 1 from public.producto_variantes v
                               join public.variante_etiquetas ve on ve.variante_id = v.id
                              where v.producto_id = p_producto_id and ve.etiqueta_id = a.etiqueta_id)))
          )
      )
    )
$$;

-- Mejor promoción POR UNIDAD (porcentaje o monto fijo) para un precio: precio final y nombre.
create function private.promo_unitaria(p_producto_id uuid, p_precio numeric, out precio numeric, out nombre text)
language sql stable
set search_path = ''
as $$
  select coalesce(p_precio - d.descuento, p_precio), d.nombre
  from (select 1) uno
  left join lateral (
    select greatest(0, least(p_precio,
             case pr.tipo when 'porcentaje' then round(p_precio * pr.valor / 100, 0) else pr.valor end)) as descuento,
           pr.nombre
    from private.promociones_aplicables(p_producto_id) pr
    where pr.tipo in ('porcentaje', 'monto_fijo')
    order by 1 desc, pr.creado_en
    limit 1
  ) d on true
$$;

-- Texto corto de la promoción por cantidad vigente ("3x2", "2da al 50%"), para chips.
create function private.promo_cantidad_texto(p_producto_id uuid)
returns text
language sql stable
set search_path = ''
as $$
  select case pr.tipo when 'nxm' then pr.lleva || 'x' || pr.paga
                      else '2da al ' || trim(to_char(pr.valor, 'FM999')) || '%' end
  from private.promociones_aplicables(p_producto_id) pr
  where pr.tipo in ('nxm', 'segunda_unidad')
  order by pr.creado_en
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- buscar_productos con precios de promoción
-- ---------------------------------------------------------------------------

-- precio_desde = con promo unitaria. precio_anterior = el de lista si la promo bajó el
-- precio; si no, productos.precio_anterior. `promo` = chip de promo por cantidad.
drop function public.buscar_productos(jsonb, text, text, text, int, int, boolean, boolean);

create function public.buscar_productos(
  p_filtros    jsonb   default '{}'::jsonb,
  p_categoria  text    default null,
  p_q          text    default null,
  p_orden      text    default 'relevancia',
  p_limite     int     default 24,
  p_offset     int     default 0,
  p_destacados boolean default false,
  p_ofertas    boolean default false
)
returns table (
  id              uuid,
  slug            text,
  nombre          text,
  marca           text,
  precio_desde    numeric,
  precio_varia    boolean,
  precio_anterior numeric,
  stock_total     int,
  disponible      boolean,
  variante_id     uuid,
  promo           text,
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
      p.id, p.slug, p.nombre, p.precio_anterior as anterior_manual, p.destacado, p.creado_en, p.busqueda,
      agg.stock_total,
      agg.stock_total > 0 as disponible,
      agg.lista_desde,
      (private.promo_unitaria(p.id, agg.lista_desde)).precio as precio_desde,
      agg.precio_varia,
      case when agg.cantidad = 1 and agg.clave_unica = '' then agg.primera end as variante_id,
      private.promo_cantidad_texto(p.id) as promo
    from public.productos p
    join ids on ids.id = p.id
    cross join lateral (
      select
        coalesce(sum(v.stock), 0)::int as stock_total,
        coalesce(
          min(coalesce(v.precio, p.precio)) filter (where v.stock > 0),
          min(coalesce(v.precio, p.precio)),
          p.precio
        ) as lista_desde,
        count(distinct coalesce(v.precio, p.precio)) > 1 as precio_varia,
        count(*) as cantidad,
        min(v.clave) as clave_unica,
        (array_agg(v.id order by v.orden))[1] as primera
      from public.producto_variantes v
      where v.producto_id = p.id and v.activa
    ) agg
    where not coalesce(p_destacados, false) or p.destacado
  ),
  con_anterior as (
    select d.*,
           case when d.precio_desde < d.lista_desde then greatest(d.lista_desde, coalesce(d.anterior_manual, 0))
                else d.anterior_manual end as precio_anterior
    from derivados d
  )
  select
    d.id, d.slug, d.nombre,
    (select e.valor
       from public.producto_etiquetas pe
       join public.etiquetas e on e.id = pe.etiqueta_id
       join public.grupos_etiqueta g on g.id = e.grupo_id
      where pe.producto_id = d.id and g.es_marca
      limit 1) as marca,
    d.precio_desde, d.precio_varia, d.precio_anterior,
    d.stock_total, d.disponible, d.variante_id, d.promo,
    img.path, img.alt, img.ancho, img.alto,
    count(*) over () as total
  from con_anterior d
  cross join consulta c
  left join lateral (
    select i.path, i.alt, i.ancho, i.alto
    from public.producto_imagenes i
    where i.producto_id = d.id
    order by i.orden, i.creado_en
    limit 1
  ) img on true
  where not coalesce(p_ofertas, false)
     or (d.precio_anterior is not null and d.precio_anterior > d.precio_desde)
     or d.promo is not null
  order by
    d.disponible desc,
    case when p_orden = 'precio-asc' then d.precio_desde end asc,
    case when p_orden = 'precio-desc' then d.precio_desde end desc,
    case when p_orden = 'relevancia' and c.tsq is not null then ts_rank(d.busqueda, c.tsq) end desc nulls last,
    d.creado_en desc,
    d.id
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Precios por variante para la ficha: lista, final con promo unitaria y chip de cantidad.
create function public.precios_producto(p_producto_id uuid)
returns table (variante_id uuid, precio_lista numeric, precio numeric, promo_unitaria text, promo_cantidad text)
language sql stable
set search_path = ''
as $$
  select v.id, coalesce(v.precio, p.precio), pu.precio, pu.nombre, private.promo_cantidad_texto(p.id)
  from public.producto_variantes v
  join public.productos p on p.id = v.producto_id
  cross join lateral private.promo_unitaria(p.id, coalesce(v.precio, p.precio)) pu
  where v.producto_id = p_producto_id and v.activa and p.publicado
$$;

-- ---------------------------------------------------------------------------
-- cotizar con promociones
-- ---------------------------------------------------------------------------

-- 1) Cada línea `ok` arranca con su mejor promo unitaria (descuento = N × (lista − promo)).
-- 2) Promos por cantidad: se juntan las unidades de las líneas alcanzadas, de mayor a
--    menor precio; N×M deja gratis las (N−M) más baratas de cada grupo de N y "2da" le
--    descuenta X% a cada segunda unidad. Una promo por cantidad se queda con sus líneas
--    sólo si descuenta MÁS que las promos unitarias de esas líneas (no se acumulan).
--    Se elige de a una la que más gana, hasta que ninguna gane.
create or replace function private.cotizar(p_items jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  r          record;
  q          record;
  n          int := 0;
  i          int;
  k          int;
  l_var      uuid[] := '{}';
  l_prod     uuid[] := '{}';
  l_nombre   text[] := '{}';
  l_slug     text[] := '{}';
  l_detalle  text[] := '{}';
  l_sku      text[] := '{}';
  l_img      text[] := '{}';
  l_cant     int[] := '{}';
  l_stock    int[] := '{}';
  l_lista    numeric[] := '{}';
  l_unit     numeric[] := '{}';
  l_desc     numeric[] := '{}';
  l_promo    text[] := '{}';
  l_estado   text[] := '{}';
  l_asignada boolean[] := '{}';
  v_lineas   jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_desc     numeric := 0;
  v_cantidad int := 0;
  -- promos por cantidad
  mejor_id   uuid;
  mejor_gan  numeric;
  gan        numeric;
  u_linea    int[];
  u_precio   numeric[];
  d_tmp      numeric[];
  mejor_d    numeric[];
  mejor_nom  text;
  usadas     uuid[] := '{}';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Carrito inválido';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'El carrito admite hasta 30 productos distintos';
  end if;

  -- Líneas (misma lógica que antes: agrupa variantes repetidas, chequea visibilidad y stock).
  for r in
    with pedidos as (
      select (i.valor ->> 'variante_id')::uuid as variante_id,
             least(sum(greatest(coalesce((i.valor ->> 'cantidad')::int, 1), 1)), 20)::int as cantidad,
             min(i.pos) as pos
      from jsonb_array_elements(p_items) with ordinality as i(valor, pos)
      where coalesce(i.valor ->> 'tipo', 'variante') = 'variante'
        and (i.valor ->> 'variante_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      group by 1
    )
    select pd.variante_id, pd.cantidad, v.sku, v.stock,
           p.id as producto_id, p.slug, p.nombre,
           coalesce(v.precio, p.precio) as precio,
           (select string_agg(e.valor, ' / ' order by g.orden)
              from public.variante_etiquetas ve
              join public.etiquetas e on e.id = ve.etiqueta_id
              join public.grupos_etiqueta g on g.id = ve.grupo_id
             where ve.variante_id = v.id) as detalle,
           (select im.path from public.producto_imagenes im
             where im.producto_id = p.id order by im.orden, im.creado_en limit 1) as imagen_path
    from pedidos pd
    left join public.producto_variantes v on v.id = pd.variante_id and v.activa
    left join public.productos p on p.id = v.producto_id and p.publicado
    order by pd.pos
  loop
    n := n + 1;
    l_var[n] := r.variante_id;   l_prod[n] := r.producto_id; l_nombre[n] := r.nombre;
    l_slug[n] := r.slug;         l_detalle[n] := r.detalle;  l_sku[n] := r.sku;
    l_img[n] := r.imagen_path;   l_cant[n] := r.cantidad;    l_stock[n] := coalesce(r.stock, 0);
    l_lista[n] := round(coalesce(r.precio, 0), 0);
    l_estado[n] := case when r.producto_id is null then 'no_disponible'
                        when r.stock = 0 then 'sin_stock'
                        when r.stock < r.cantidad then 'stock_insuficiente'
                        else 'ok' end;
    l_asignada[n] := false;
    if l_estado[n] = 'ok' then
      select pu.precio, pu.nombre into q from private.promo_unitaria(r.producto_id, l_lista[n]) pu;
      l_unit[n] := round(q.precio, 0);
      l_desc[n] := (l_lista[n] - l_unit[n]) * r.cantidad;
      l_promo[n] := case when l_desc[n] > 0 then q.nombre end;
    else
      l_unit[n] := l_lista[n]; l_desc[n] := 0; l_promo[n] := null;
    end if;
  end loop;

  -- Promos por cantidad, de a una la que más gana.
  loop
    mejor_id := null; mejor_gan := 0;
    for q in
      select distinct pr.id, pr.tipo, pr.valor, pr.lleva, pr.paga, pr.nombre
      from generate_subscripts(l_prod, 1) s(idx)
      cross join lateral private.promociones_aplicables(l_prod[s.idx]) pr
      where l_estado[s.idx] = 'ok' and not l_asignada[s.idx]
        and pr.tipo in ('nxm', 'segunda_unidad') and not (pr.id = any (usadas))
    loop
      -- Unidades de las líneas alcanzadas, de mayor a menor precio.
      select array_agg(x.idx order by x.precio desc, x.idx), array_agg(x.precio order by x.precio desc, x.idx)
        into u_linea, u_precio
      from (
        select s.idx, l_lista[s.idx] as precio
        from generate_subscripts(l_prod, 1) s(idx)
        cross join generate_series(1, l_cant[s.idx])
        where l_estado[s.idx] = 'ok' and not l_asignada[s.idx]
          and exists (select 1 from private.promociones_aplicables(l_prod[s.idx]) a where a.id = q.id)
      ) x;
      d_tmp := array_fill(0::numeric, array[n]);
      if u_linea is not null then
        for k in 1 .. array_length(u_linea, 1) loop
          if q.tipo = 'nxm' then
            -- grupo completo de `lleva`: las últimas (lleva − paga) de cada grupo son gratis
            if (k - 1) / q.lleva < array_length(u_linea, 1) / q.lleva and ((k - 1) % q.lleva) + 1 > q.paga then
              d_tmp[u_linea[k]] := d_tmp[u_linea[k]] + u_precio[k];
            end if;
          elsif k % 2 = 0 then
            d_tmp[u_linea[k]] := d_tmp[u_linea[k]] + round(u_precio[k] * q.valor / 100, 0);
          end if;
        end loop;
      end if;
      -- Ganancia = descuento por cantidad − promos unitarias que pierden esas líneas.
      gan := 0;
      for i in 1 .. n loop
        if d_tmp[i] > 0 then gan := gan + d_tmp[i] - l_desc[i]; end if;
      end loop;
      if gan > mejor_gan then
        mejor_gan := gan; mejor_id := q.id; mejor_d := d_tmp; mejor_nom := q.nombre;
      end if;
    end loop;

    exit when mejor_id is null;
    usadas := usadas || mejor_id;
    for i in 1 .. n loop
      if mejor_d[i] > 0 then
        l_desc[i] := mejor_d[i]; l_unit[i] := l_lista[i]; l_promo[i] := mejor_nom; l_asignada[i] := true;
      end if;
    end loop;
  end loop;

  for i in 1 .. n loop
    if l_estado[i] = 'ok' then
      v_subtotal := v_subtotal + l_lista[i] * l_cant[i];
      v_desc := v_desc + l_desc[i];
      v_cantidad := v_cantidad + l_cant[i];
    end if;
    v_lineas := v_lineas || jsonb_build_object(
      'variante_id', l_var[i],
      'producto_id', l_prod[i],
      'slug', l_slug[i],
      'nombre', l_nombre[i],
      'detalle', l_detalle[i],
      'sku', l_sku[i],
      'imagen_path', l_img[i],
      'cantidad', l_cant[i],
      'stock', l_stock[i],
      'precio_unitario', l_lista[i],
      'precio_promo', l_unit[i],
      'descuento', case when l_estado[i] = 'ok' then l_desc[i] else 0 end,
      'promo', case when l_estado[i] = 'ok' then l_promo[i] end,
      'subtotal', case when l_estado[i] = 'ok' then l_lista[i] * l_cant[i] - l_desc[i] else 0 end,
      'estado', l_estado[i]
    );
  end loop;

  return jsonb_build_object(
    'lineas', v_lineas,
    'cantidad', v_cantidad,
    'subtotal', v_subtotal,
    'descuento_promociones', v_desc,
    'descuento_cupon', 0,
    'total', v_subtotal - v_desc
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  private.promociones_aplicables(uuid),
  private.promo_unitaria(uuid, numeric),
  private.promo_cantidad_texto(uuid),
  public.buscar_productos(jsonb, text, text, text, int, int, boolean, boolean),
  public.precios_producto(uuid)
from public;

grant execute on function
  private.promociones_aplicables(uuid),
  private.promo_unitaria(uuid, numeric),
  private.promo_cantidad_texto(uuid),
  public.buscar_productos(jsonb, text, text, text, int, int, boolean, boolean),
  public.precios_producto(uuid)
to anon, authenticated;
