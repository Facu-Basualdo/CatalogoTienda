-- Carrito y pedidos por WhatsApp.
--
-- UN SOLO motor de precios: private.cotizar. Lo usan cotizar_carrito (lo que ve el
-- cliente) y crear_pedido (lo que se guarda). El navegador nunca calcula precios:
-- así el total del carrito, el del mensaje de WhatsApp y el guardado coinciden.
-- Promociones, combos y cupones se agregan dentro de cotizar en sus fases.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create type public.estado_pedido as enum ('pendiente', 'confirmado', 'entregado', 'cancelado');

create table public.pedidos (
  id                    uuid primary key default gen_random_uuid(),
  numero                bigint generated always as identity unique,  -- el que se menciona por WhatsApp
  estado                public.estado_pedido not null default 'pendiente',
  nombre                text not null check (length(trim(nombre)) between 1 and 80),
  notas                 text check (length(notas) <= 500),
  subtotal              numeric(12, 2) not null check (subtotal >= 0),
  descuento_promociones numeric(12, 2) not null default 0 check (descuento_promociones >= 0),
  descuento_cupon       numeric(12, 2) not null default 0 check (descuento_cupon >= 0),
  total                 numeric(12, 2) not null check (total >= 0),
  cupon_codigo          text,
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);
create index pedidos_estado_idx on public.pedidos (estado, creado_en desc);

-- Snapshot: nombres y precios cambian después; el pedido no.
create table public.pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos (id) on delete cascade,
  variante_id     uuid references public.producto_variantes (id) on delete set null,
  producto_id     uuid references public.productos (id) on delete set null,
  descripcion     text not null,
  detalle         text,           -- "M / Negro"
  sku             text,
  cantidad        int not null check (cantidad between 1 and 20),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  descuento       numeric(12, 2) not null default 0 check (descuento >= 0),
  subtotal        numeric(12, 2) not null check (subtotal >= 0),
  orden           int not null default 0
);
create index pedido_items_pedido_idx on public.pedido_items (pedido_id, orden);
create index pedido_items_variante_idx on public.pedido_items (variante_id);
create index pedido_items_producto_idx on public.pedido_items (producto_id);

create trigger pedidos_actualizado_en
before update on public.pedidos
for each row execute function private.tocar_actualizado_en();

-- anon no toca estas tablas: los pedidos entran sólo por crear_pedido.
revoke all on public.pedidos, public.pedido_items from anon, authenticated;
grant select, update, delete on public.pedidos to authenticated;
grant select on public.pedido_items to authenticated;

alter table public.pedidos enable row level security;
create policy "admin lee" on public.pedidos for select to authenticated using ((select private.es_admin()));
create policy "admin actualiza" on public.pedidos for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.pedidos for delete to authenticated using ((select private.es_admin()));

alter table public.pedido_items enable row level security;
create policy "admin lee" on public.pedido_items for select to authenticated using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Motor de precios
-- ---------------------------------------------------------------------------

-- p_items: [{ "tipo": "variante", "variante_id": uuid, "cantidad": int }]
-- Chequea publicado/activa explícitamente: también corre dentro de crear_pedido,
-- que es security definer y no pasa por RLS.
create function private.cotizar(p_items jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  r          record;
  v_lineas   jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_cantidad int := 0;
  v_estado   text;
  v_linea    numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Carrito inválido';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'El carrito admite hasta 30 productos distintos';
  end if;

  for r in
    with pedidos as (
      -- La misma variante dos veces se suma en una línea.
      select (i.valor ->> 'variante_id')::uuid as variante_id,
             least(sum(greatest(coalesce((i.valor ->> 'cantidad')::int, 1), 1)), 20)::int as cantidad,
             min(i.pos) as pos
      from jsonb_array_elements(p_items) with ordinality as i(valor, pos)
      where coalesce(i.valor ->> 'tipo', 'variante') = 'variante'
        and (i.valor ->> 'variante_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      group by 1
    )
    select pd.variante_id, pd.cantidad,
           v.id as v_id, v.sku, v.stock,
           p.id as producto_id, p.slug, p.nombre,
           coalesce(v.precio, p.precio) as precio,
           (select string_agg(e.valor, ' / ' order by g.orden)
              from public.variante_etiquetas ve
              join public.etiquetas e on e.id = ve.etiqueta_id
              join public.grupos_etiqueta g on g.id = ve.grupo_id
             where ve.variante_id = v.id) as detalle,
           (select i.path from public.producto_imagenes i
             where i.producto_id = p.id order by i.orden, i.creado_en limit 1) as imagen_path
    from pedidos pd
    left join public.producto_variantes v on v.id = pd.variante_id and v.activa
    left join public.productos p on p.id = v.producto_id and p.publicado
    order by pd.pos
  loop
    if r.producto_id is null then
      v_estado := 'no_disponible';
    elsif r.stock = 0 then
      v_estado := 'sin_stock';
    elsif r.stock < r.cantidad then
      v_estado := 'stock_insuficiente';
    else
      v_estado := 'ok';
    end if;

    v_linea := case when v_estado = 'ok' then round(r.precio * r.cantidad, 0) else 0 end;
    v_subtotal := v_subtotal + v_linea;
    if v_estado = 'ok' then v_cantidad := v_cantidad + r.cantidad; end if;

    v_lineas := v_lineas || jsonb_build_object(
      'variante_id', r.variante_id,
      'producto_id', r.producto_id,
      'slug', r.slug,
      'nombre', r.nombre,
      'detalle', r.detalle,
      'sku', r.sku,
      'imagen_path', r.imagen_path,
      'cantidad', r.cantidad,
      'stock', coalesce(r.stock, 0),
      'precio_unitario', round(coalesce(r.precio, 0), 0),
      'descuento', 0,
      'subtotal', v_linea,
      'estado', v_estado
    );
  end loop;

  return jsonb_build_object(
    'lineas', v_lineas,
    'cantidad', v_cantidad,
    'subtotal', v_subtotal,
    'descuento_promociones', 0,
    'descuento_cupon', 0,
    'total', v_subtotal
  );
end;
$$;

-- Lo que ve el cliente. security invoker: respeta RLS además de los chequeos propios.
create function public.cotizar_carrito(p_items jsonb)
returns jsonb
language sql stable
set search_path = ''
as $$ select private.cotizar(p_items) $$;

-- Crea el pedido. security definer porque anon no tiene grants sobre pedidos: toda
-- la validación está acá. No reserva stock: se descuenta al confirmar.
create function public.crear_pedido(p_items jsonb, p_nombre text, p_notas text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_cot    jsonb;
  v_pedido public.pedidos;
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
  if exists (select 1 from jsonb_array_elements(v_cot -> 'lineas') l where l ->> 'estado' <> 'ok') then
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

  insert into public.pedido_items
    (pedido_id, variante_id, producto_id, descripcion, detalle, sku, cantidad, precio_unitario, descuento, subtotal, orden)
  select v_pedido.id,
         (l ->> 'variante_id')::uuid,
         (l ->> 'producto_id')::uuid,
         l ->> 'nombre',
         l ->> 'detalle',
         l ->> 'sku',
         (l ->> 'cantidad')::int,
         (l ->> 'precio_unitario')::numeric,
         (l ->> 'descuento')::numeric,
         (l ->> 'subtotal')::numeric,
         (n - 1)::int
  from jsonb_array_elements(v_cot -> 'lineas') with ordinality as t(l, n);

  return v_cot || jsonb_build_object('id', v_pedido.id, 'numero', v_pedido.numero);
end;
$$;

-- Dashboard: cambiar estado. Confirmar descuenta stock (atómico por variante: si una
-- no alcanza, falla todo); volver de confirmado/entregado a pendiente/cancelado lo repone.
create function public.cambiar_estado_pedido(p_pedido_id uuid, p_estado public.estado_pedido)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actual    public.estado_pedido;
  r           record;
  v_descontar boolean;
  v_reponer   boolean;
begin
  if not (select private.es_admin()) then
    raise exception 'Sólo administradores';
  end if;

  select estado into v_actual from public.pedidos where id = p_pedido_id for update;
  if v_actual is null then
    raise exception 'Pedido inexistente';
  end if;
  if v_actual = p_estado then
    return;
  end if;

  v_descontar := p_estado in ('confirmado', 'entregado') and v_actual in ('pendiente', 'cancelado');
  v_reponer   := p_estado in ('pendiente', 'cancelado') and v_actual in ('confirmado', 'entregado');

  if v_descontar then
    for r in select variante_id, sum(cantidad)::int as cantidad, min(descripcion) as descripcion
               from public.pedido_items
              where pedido_id = p_pedido_id and variante_id is not null
              group by variante_id
    loop
      update public.producto_variantes
         set stock = stock - r.cantidad
       where id = r.variante_id and stock >= r.cantidad;
      if not found then
        raise exception 'No hay stock suficiente de "%" para confirmar el pedido', r.descripcion;
      end if;
    end loop;
  elsif v_reponer then
    update public.producto_variantes v
       set stock = v.stock + i.cantidad
      from (select variante_id, sum(cantidad)::int as cantidad
              from public.pedido_items
             where pedido_id = p_pedido_id and variante_id is not null
             group by variante_id) i
     where v.id = i.variante_id;
  end if;

  update public.pedidos set estado = p_estado where id = p_pedido_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  private.cotizar(jsonb),
  public.cotizar_carrito(jsonb),
  public.crear_pedido(jsonb, text, text),
  public.cambiar_estado_pedido(uuid, public.estado_pedido)
from public;

grant execute on function private.cotizar(jsonb) to anon, authenticated;
grant execute on function public.cotizar_carrito(jsonb) to anon, authenticated;
grant execute on function public.crear_pedido(jsonb, text, text) to anon, authenticated;
revoke execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido) from anon;
grant execute on function public.cambiar_estado_pedido(uuid, public.estado_pedido) to authenticated;
