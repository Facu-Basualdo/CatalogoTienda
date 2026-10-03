-- Combos: varios productos que se venden juntos a un precio. Diseño en
-- docs/plan-implementacion.md (fase 7); reglas en claude/supabase/combos.md.
--
-- En el carrito un combo es UNA línea con la variante elegida de cada producto. En el
-- pedido queda una fila padre (el combo, con el precio) y una fila hija por variante
-- (precio 0, con la cantidad real): así cambiar_estado_pedido descuenta y repone stock
-- sin saber nada de combos.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.combos (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre            text not null check (length(trim(nombre)) between 1 and 120),
  descripcion       jsonb,                                -- documento TipTap, nunca HTML
  descripcion_texto text not null default '',
  precio            numeric(12, 2) not null default 0 check (precio >= 0),
  publicado         boolean not null default false,
  destacado         boolean not null default false,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);
create index combos_publicados_idx on public.combos (creado_en desc) where publicado;

create trigger combos_actualizado_en
before update on public.combos
for each row execute function private.tocar_actualizado_en();

-- restrict: borrar un producto que está en un combo falla (el panel avisa en cuál).
create table public.combo_items (
  id          uuid primary key default gen_random_uuid(),
  combo_id    uuid not null references public.combos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad    int not null default 1 check (cantidad between 1 and 10),
  orden       int not null default 0,
  unique (combo_id, producto_id)
);
create index combo_items_combo_idx on public.combo_items (combo_id, orden);
create index combo_items_producto_idx on public.combo_items (producto_id);

create table public.combo_imagenes (
  id        uuid primary key default gen_random_uuid(),
  combo_id  uuid not null references public.combos (id) on delete cascade,
  path      text not null unique,
  alt       text not null default '',
  orden     int not null default 0,
  ancho     int check (ancho > 0),
  alto      int check (alto > 0),
  creado_en timestamptz not null default now()
);
create index combo_imagenes_combo_idx on public.combo_imagenes (combo_id, orden);

-- Pedidos: fila padre del combo + hijas por variante. `promo` = nombre de la promoción
-- que se aplicó a la línea (antes sólo quedaba el descuento).
alter table public.pedido_items
  add column combo_id uuid references public.combos (id) on delete set null,
  add column padre_id uuid references public.pedido_items (id) on delete cascade,
  add column promo    text;
create index pedido_items_combo_idx on public.pedido_items (combo_id);
create index pedido_items_padre_idx on public.pedido_items (padre_id);
-- Una hija lleva cantidad del combo × cantidad del ítem (hasta 20 × 10).
alter table public.pedido_items drop constraint pedido_items_cantidad_check;
alter table public.pedido_items add constraint pedido_items_cantidad_check check (cantidad between 1 and 200);

-- ---------------------------------------------------------------------------
-- Grants + RLS (mismo esquema que productos: las hijas miran al padre)
-- ---------------------------------------------------------------------------

grant select on public.combos, public.combo_items, public.combo_imagenes to anon, authenticated;
grant insert, update, delete on public.combos, public.combo_items, public.combo_imagenes to authenticated;

alter table public.combos enable row level security;
create policy "anon ve publicados" on public.combos for select to anon using (publicado);
create policy "authenticated ve publicados, admin todo" on public.combos
  for select to authenticated using (publicado or (select private.es_admin()));
create policy "admin inserta" on public.combos for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.combos for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.combos for delete to authenticated using ((select private.es_admin()));

alter table public.combo_items enable row level security;
create policy "anon ve de publicados" on public.combo_items for select to anon
  using (exists (select 1 from public.combos c where c.id = combo_id and c.publicado));
create policy "authenticated ve de publicados, admin todo" on public.combo_items for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.combos c where c.id = combo_id and c.publicado));
create policy "admin inserta" on public.combo_items for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.combo_items for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.combo_items for delete to authenticated using ((select private.es_admin()));

alter table public.combo_imagenes enable row level security;
create policy "anon ve de publicados" on public.combo_imagenes for select to anon
  using (exists (select 1 from public.combos c where c.id = combo_id and c.publicado));
create policy "authenticated ve de publicados, admin todo" on public.combo_imagenes for select to authenticated
  using ((select private.es_admin()) or exists (select 1 from public.combos c where c.id = combo_id and c.publicado));
create policy "admin inserta" on public.combo_imagenes for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.combo_imagenes for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.combo_imagenes for delete to authenticated using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Disponibilidad y listado
-- ---------------------------------------------------------------------------

-- Disponible = tiene ítems y cada producto está publicado y tiene alguna variante activa
-- con stock >= la cantidad del ítem. No mira combinaciones entre ítems (dos ítems no
-- comparten producto: unique).
create function private.combo_disponible(p_combo_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (select 1 from public.combo_items where combo_id = p_combo_id)
     and not exists (
       select 1
       from public.combo_items ci
       where ci.combo_id = p_combo_id
         and not exists (
           select 1
           from public.producto_variantes v
           join public.productos p on p.id = v.producto_id and p.publicado
           where v.producto_id = ci.producto_id and v.activa and v.stock >= ci.cantidad
         )
     )
$$;

-- precio_items = suma del precio de lista más bajo de cada producto × cantidad: es la
-- base del "Ahorrás $X" de la tarjeta. Los combos sin ítems no se listan.
create function public.buscar_combos(
  p_destacados boolean default false,
  p_limite     int     default 24,
  p_offset     int     default 0
)
returns table (
  id           uuid,
  slug         text,
  nombre       text,
  precio       numeric,
  precio_items numeric,
  disponible   boolean,
  productos    int,
  imagen_path  text,
  imagen_alt   text,
  total        bigint
)
language sql stable
set search_path = ''
as $$
  with base as (
    select co.id, co.slug, co.nombre, round(co.precio, 0) as precio, co.destacado, co.creado_en,
           it.precio_items, it.productos, private.combo_disponible(co.id) as disponible
    from public.combos co
    cross join lateral (
      select coalesce(sum(round(pv.minimo, 0) * ci.cantidad), 0) as precio_items, count(*)::int as productos
      from public.combo_items ci
      join public.productos p on p.id = ci.producto_id
      cross join lateral (
        select coalesce(min(coalesce(v.precio, p.precio)), p.precio) as minimo
        from public.producto_variantes v
        where v.producto_id = p.id and v.activa
      ) pv
      where ci.combo_id = co.id
    ) it
    where co.publicado and (not coalesce(p_destacados, false) or co.destacado) and it.productos > 0
  )
  select b.id, b.slug, b.nombre, b.precio, b.precio_items, b.disponible, b.productos,
         im.path, im.alt, count(*) over ()
  from base b
  left join lateral (
    select path, alt from public.combo_imagenes where combo_id = b.id order by orden, creado_en limit 1
  ) im on true
  order by b.disponible desc, b.destacado desc, b.creado_en desc
  limit least(greatest(coalesce(p_limite, 24), 1), 48)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- Reemplaza los ítems en una transacción. p_items: [{producto_id, cantidad}] en orden.
create function public.guardar_combo_items(p_combo_id uuid, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 10 then
    raise exception 'Un combo lleva entre 1 y 10 productos distintos';
  end if;
  if (select sum(greatest(coalesce((i ->> 'cantidad')::int, 1), 1)) from jsonb_array_elements(p_items) i) < 2 then
    raise exception 'Un combo lleva al menos 2 unidades';
  end if;
  delete from public.combo_items where combo_id = p_combo_id;
  insert into public.combo_items (combo_id, producto_id, cantidad, orden)
  select p_combo_id, (i ->> 'producto_id')::uuid, greatest(coalesce((i ->> 'cantidad')::int, 1), 1), (n - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(i, n);
end;
$$;

create function public.reordenar_imagenes_combo(p_combo_id uuid, p_ids uuid[])
returns void
language sql
set search_path = ''
as $$
  update public.combo_imagenes
  set orden = array_position(p_ids, id) - 1
  where combo_id = p_combo_id and id = any (p_ids)
$$;

-- ---------------------------------------------------------------------------
-- Línea de combo para cotizar
-- ---------------------------------------------------------------------------

-- p_variantes: la variante elegida de cada ítem, EN EL ORDEN de combo_items (orden).
-- Chequea publicado/activa a mano (corre dentro de crear_pedido, definer).
create function private.linea_combo(p_combo_id uuid, p_variantes uuid[], p_cantidad int)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  it        record;
  v         record;
  v_slug    text;
  v_nombre  text;
  v_precio  numeric := 0;
  v_imagen  text;
  v_ok      boolean := true;
  v_max     int := 2147483647;
  v_lista   numeric := 0;
  v_items   jsonb := '[]'::jsonb;
  v_detalle text[] := '{}';
  v_estado  text;
begin
  select co.slug, co.nombre, round(co.precio, 0),
         (select im.path from public.combo_imagenes im where im.combo_id = co.id order by im.orden, im.creado_en limit 1)
    into v_slug, v_nombre, v_precio, v_imagen
  from public.combos co
  where co.id = p_combo_id and co.publicado;
  if not found then
    v_ok := false;
  elsif (select count(*) from public.combo_items where combo_id = p_combo_id) <> coalesce(array_length(p_variantes, 1), 0) then
    v_ok := false;
  else
    for it in
      select ci.producto_id, ci.cantidad, row_number() over (order by ci.orden, ci.id)::int as k
      from public.combo_items ci
      where ci.combo_id = p_combo_id
      order by ci.orden, ci.id
    loop
      select pv.id, pv.sku, pv.stock, p.id as producto_id, p.nombre,
             round(coalesce(pv.precio, p.precio), 0) as precio,
             (select string_agg(e.valor, ' / ' order by g.orden)
                from public.variante_etiquetas ve
                join public.etiquetas e on e.id = ve.etiqueta_id
                join public.grupos_etiqueta g on g.id = ve.grupo_id
               where ve.variante_id = pv.id) as detalle
        into v
      from public.producto_variantes pv
      join public.productos p on p.id = pv.producto_id and p.publicado
      where pv.id = p_variantes[it.k] and pv.producto_id = it.producto_id and pv.activa;
      if not found then
        v_ok := false;
        exit;
      end if;
      v_max := least(v_max, v.stock / it.cantidad);
      v_lista := v_lista + v.precio * it.cantidad;
      v_detalle := v_detalle || ((case when it.cantidad > 1 then it.cantidad || ' × ' else '' end)
                                 || v.nombre || coalesce(' (' || v.detalle || ')', ''));
      v_items := v_items || jsonb_build_object(
        'variante_id', v.id, 'producto_id', v.producto_id, 'nombre', v.nombre,
        'detalle', v.detalle, 'sku', v.sku, 'cantidad', it.cantidad);
    end loop;
  end if;

  v_estado := case when not v_ok then 'no_disponible'
                   when v_max = 0 then 'sin_stock'
                   when v_max < p_cantidad then 'stock_insuficiente'
                   else 'ok' end;

  return jsonb_build_object(
    'tipo', 'combo',
    'clave', 'combo:' || p_combo_id || ':' || array_to_string(p_variantes, ','),
    'combo_id', p_combo_id,
    'variantes', to_jsonb(p_variantes),
    'variante_id', null,
    'producto_id', null,
    'slug', v_slug,
    'nombre', v_nombre,
    'detalle', array_to_string(v_detalle, ' + '),
    'sku', null,
    'imagen_path', v_imagen,
    'cantidad', p_cantidad,
    'stock', case when v_ok then least(v_max, 20) else 0 end,
    'precio_unitario', v_precio,
    'precio_promo', v_precio,
    'descuento', 0,
    'promo', null,
    'ahorro', case when v_estado = 'ok' then greatest(0, v_lista - v_precio) * p_cantidad else 0 end,
    'subtotal', case when v_estado = 'ok' then v_precio * p_cantidad else 0 end,
    'estado', v_estado,
    'items', v_items
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- cotizar: variantes (con promociones, igual que antes) + combos
-- ---------------------------------------------------------------------------
-- Las unidades de un combo no reciben promociones. Las líneas salen en el orden en que
-- llegaron en p_items. Cada línea trae `tipo` y `clave` (variante_id, o
-- combo:<id>:<variantes>), que es lo que la web usa para cambiar cantidades o quitarla.
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
  l_pos      bigint[] := '{}';
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
  v_pares    jsonb := '[]'::jsonb;   -- [{pos, linea}]
  v_linea    jsonb;
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
  uuid_re    constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Carrito inválido';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'El carrito admite hasta 30 productos distintos';
  end if;

  -- Líneas de variante: agrupa repetidas, chequea visibilidad y stock.
  for r in
    with pedidos as (
      select (i.valor ->> 'variante_id')::uuid as variante_id,
             least(sum(greatest(coalesce((i.valor ->> 'cantidad')::int, 1), 1)), 20)::int as cantidad,
             min(i.pos) as pos
      from jsonb_array_elements(p_items) with ordinality as i(valor, pos)
      where coalesce(i.valor ->> 'tipo', 'variante') = 'variante'
        and (i.valor ->> 'variante_id') ~ uuid_re
      group by 1
    )
    select pd.variante_id, pd.cantidad, pd.pos, v.sku, v.stock,
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
    l_pos[n] := r.pos;
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

  -- Promos por cantidad, de a una la que más gana (ver claude/supabase/promociones.md).
  loop
    mejor_id := null; mejor_gan := 0;
    for q in
      select distinct pr.id, pr.tipo, pr.valor, pr.lleva, pr.paga, pr.nombre
      from generate_subscripts(l_prod, 1) s(idx)
      cross join lateral private.promociones_aplicables(l_prod[s.idx]) pr
      where l_estado[s.idx] = 'ok' and not l_asignada[s.idx]
        and pr.tipo in ('nxm', 'segunda_unidad') and not (pr.id = any (usadas))
    loop
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
            if (k - 1) / q.lleva < array_length(u_linea, 1) / q.lleva and ((k - 1) % q.lleva) + 1 > q.paga then
              d_tmp[u_linea[k]] := d_tmp[u_linea[k]] + u_precio[k];
            end if;
          elsif k % 2 = 0 then
            d_tmp[u_linea[k]] := d_tmp[u_linea[k]] + round(u_precio[k] * q.valor / 100, 0);
          end if;
        end loop;
      end if;

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
    v_pares := v_pares || jsonb_build_object('pos', l_pos[i], 'linea', jsonb_build_object(
      'tipo', 'variante',
      'clave', l_var[i]::text,
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
    ));
  end loop;

  -- Líneas de combo: el mismo combo con las mismas variantes se suma en una línea.
  for r in
    with crudos as (
      select (i.valor ->> 'combo_id')::uuid as combo_id,
             array(select x::uuid from jsonb_array_elements_text(i.valor -> 'variantes') with ordinality as t(x, o) order by o) as variantes,
             greatest(coalesce((i.valor ->> 'cantidad')::int, 1), 1) as cantidad,
             i.pos
      from jsonb_array_elements(p_items) with ordinality as i(valor, pos)
      where i.valor ->> 'tipo' = 'combo'
        and (i.valor ->> 'combo_id') ~ uuid_re
        and jsonb_typeof(i.valor -> 'variantes') = 'array'
        and jsonb_array_length(i.valor -> 'variantes') between 1 and 10
        and not exists (select 1 from jsonb_array_elements_text(i.valor -> 'variantes') x where x !~ uuid_re)
    )
    select combo_id, variantes, least(sum(cantidad), 20)::int as cantidad, min(pos) as pos
    from crudos
    group by combo_id, variantes
  loop
    v_linea := private.linea_combo(r.combo_id, r.variantes, r.cantidad);
    if v_linea ->> 'estado' = 'ok' then
      v_subtotal := v_subtotal + (v_linea ->> 'subtotal')::numeric;
      v_cantidad := v_cantidad + r.cantidad;
    end if;
    v_pares := v_pares || jsonb_build_object('pos', r.pos, 'linea', v_linea);
  end loop;

  return jsonb_build_object(
    'lineas', coalesce((select jsonb_agg(x -> 'linea' order by (x ->> 'pos')::bigint) from jsonb_array_elements(v_pares) x), '[]'::jsonb),
    'cantidad', v_cantidad,
    'subtotal', v_subtotal,
    'descuento_promociones', v_desc,
    'descuento_cupon', 0,
    'total', v_subtotal - v_desc
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- crear_pedido: guarda combos como padre + hijas, y el nombre de la promo
-- ---------------------------------------------------------------------------
create or replace function public.crear_pedido(p_items jsonb, p_nombre text, p_notas text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_cot    jsonb;
  v_pedido public.pedidos;
  v_padre  uuid;
  l        jsonb;
  n        bigint;
begin
  if length(trim(coalesce(p_nombre, ''))) not between 1 and 80 then
    raise exception 'Ingresá tu nombre (hasta 80 caracteres)';
  end if;
  if length(coalesce(p_notas, '')) > 500 then
    raise exception 'Las notas admiten hasta 500 caracteres';
  end if;

  v_cot := private.cotizar(p_items);

  if jsonb_array_length(v_cot -> 'lineas') = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if exists (select 1 from jsonb_array_elements(v_cot -> 'lineas') x where x ->> 'estado' <> 'ok') then
    raise exception 'Hay productos sin stock o que ya no están disponibles: revisá el carrito';
  end if;

  insert into public.pedidos (nombre, notas, subtotal, descuento_promociones, descuento_cupon, total)
  values (
    trim(p_nombre),
    nullif(trim(coalesce(p_notas, '')), ''),
    (v_cot ->> 'subtotal')::numeric,
    (v_cot ->> 'descuento_promociones')::numeric,
    (v_cot ->> 'descuento_cupon')::numeric,
    (v_cot ->> 'total')::numeric
  )
  returning * into v_pedido;

  for l, n in select t.l, t.n from jsonb_array_elements(v_cot -> 'lineas') with ordinality as t(l, n) loop
    if l ->> 'tipo' = 'combo' then
      insert into public.pedido_items
        (pedido_id, combo_id, descripcion, detalle, cantidad, precio_unitario, descuento, subtotal, orden)
      values (v_pedido.id, (l ->> 'combo_id')::uuid, l ->> 'nombre', l ->> 'detalle', (l ->> 'cantidad')::int,
              (l ->> 'precio_unitario')::numeric, 0, (l ->> 'subtotal')::numeric, (n - 1)::int)
      returning id into v_padre;
      -- Hijas: precio 0 y la cantidad real de cada variante (la que mueve el stock).
      insert into public.pedido_items
        (pedido_id, padre_id, variante_id, producto_id, descripcion, detalle, sku, cantidad, precio_unitario, descuento, subtotal, orden)
      select v_pedido.id, v_padre, (it ->> 'variante_id')::uuid, (it ->> 'producto_id')::uuid, it ->> 'nombre',
             it ->> 'detalle', it ->> 'sku', (it ->> 'cantidad')::int * (l ->> 'cantidad')::int, 0, 0, 0, (m - 1)::int
      from jsonb_array_elements(l -> 'items') with ordinality as t(it, m);
    else
      insert into public.pedido_items
        (pedido_id, variante_id, producto_id, descripcion, detalle, sku, cantidad, precio_unitario, descuento, subtotal, promo, orden)
      values (v_pedido.id, (l ->> 'variante_id')::uuid, (l ->> 'producto_id')::uuid, l ->> 'nombre', l ->> 'detalle',
              l ->> 'sku', (l ->> 'cantidad')::int, (l ->> 'precio_unitario')::numeric, (l ->> 'descuento')::numeric,
              (l ->> 'subtotal')::numeric, l ->> 'promo', (n - 1)::int);
    end if;
  end loop;

  return v_cot || jsonb_build_object('id', v_pedido.id, 'numero', v_pedido.numero);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  private.combo_disponible(uuid),
  private.linea_combo(uuid, uuid[], int),
  public.buscar_combos(boolean, int, int),
  public.guardar_combo_items(uuid, jsonb),
  public.reordenar_imagenes_combo(uuid, uuid[])
from public, anon;

grant execute on function
  private.combo_disponible(uuid),
  private.linea_combo(uuid, uuid[], int),
  public.buscar_combos(boolean, int, int)
to anon, authenticated;

grant execute on function
  public.guardar_combo_items(uuid, jsonb),
  public.reordenar_imagenes_combo(uuid, uuid[])
to authenticated;
