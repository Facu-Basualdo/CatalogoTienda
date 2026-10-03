-- Cupones de descuento. Diseño en docs/plan-implementacion.md (fase 8); reglas en
-- claude/supabase/cupones.md.
--
-- La tabla NO tiene grants para anon: si fuera legible, cualquiera listaría los
-- códigos. El cupón se evalúa sólo dentro de private.evaluar_cupon (security definer),
-- que responde "inválido" sin decir por qué, salvo el mínimo de compra (el cliente lo
-- puede corregir). Un cupón por pedido, sobre el subtotal DESPUÉS de promociones.

create type public.tipo_cupon as enum ('porcentaje', 'monto_fijo');

create table public.cupones (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique check (codigo ~ '^[A-Z0-9-]{3,30}$'),   -- siempre en mayúsculas
  tipo          public.tipo_cupon not null,
  valor         numeric(12, 2) not null check (valor > 0),
  minimo_compra numeric(12, 2) not null default 0 check (minimo_compra >= 0),
  usos_maximos  int check (usos_maximos > 0),                                -- null = ilimitado
  usos          int not null default 0 check (usos >= 0),
  activo        boolean not null default true,
  desde         timestamptz,
  hasta         timestamptz,
  creado_en     timestamptz not null default now(),
  check (tipo <> 'porcentaje' or valor <= 100),
  check (desde is null or hasta is null or hasta > desde)
);

alter table public.pedidos add column cupon_id uuid references public.cupones (id) on delete set null;
create index pedidos_cupon_idx on public.pedidos (cupon_id);

-- Sólo el admin: ni anon ni un usuario autenticado cualquiera ven la tabla.
revoke all on public.cupones from anon, authenticated;
grant select, insert, update, delete on public.cupones to authenticated;

alter table public.cupones enable row level security;
create policy "admin lee" on public.cupones for select to authenticated using ((select private.es_admin()));
create policy "admin inserta" on public.cupones for insert to authenticated with check ((select private.es_admin()));
create policy "admin actualiza" on public.cupones for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));
create policy "admin borra" on public.cupones for delete to authenticated using ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Evaluación
-- ---------------------------------------------------------------------------

-- Devuelve {id, codigo, descuento} o {error}. p_base = subtotal − promociones.
-- Definer: anon no puede leer cupones. En private: la API no la expone.
create function private.evaluar_cupon(p_codigo text, p_base numeric)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  c public.cupones;
begin
  select * into c
  from public.cupones
  where codigo = upper(trim(p_codigo))
    and activo
    and (desde is null or desde <= now())
    and (hasta is null or hasta > now())
    and (usos_maximos is null or usos < usos_maximos);
  if not found then
    return jsonb_build_object('error', 'El cupón no es válido o ya venció');
  end if;
  if p_base < c.minimo_compra then
    return jsonb_build_object('error',
      'Este cupón requiere una compra mínima de $ ' || replace(to_char(c.minimo_compra, 'FM999,999,999'), ',', '.'));
  end if;
  return jsonb_build_object(
    'id', c.id,
    'codigo', c.codigo,
    'descuento', least(p_base, case c.tipo when 'porcentaje' then round(p_base * c.valor / 100, 0) else round(c.valor, 0) end)
  );
end;
$$;

-- cotizar + cupón. Sin cupón (null o vacío) devuelve lo mismo que cotizar.
create function private.cotizar_con_cupon(p_items jsonb, p_cupon text)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_cot jsonb := private.cotizar(p_items);
  v_c   jsonb;
  v_base numeric;
begin
  if nullif(trim(coalesce(p_cupon, '')), '') is null then
    return v_cot || jsonb_build_object('cupon', null, 'cupon_error', null);
  end if;
  v_base := (v_cot ->> 'subtotal')::numeric - (v_cot ->> 'descuento_promociones')::numeric;
  v_c := private.evaluar_cupon(p_cupon, v_base);
  if v_c ? 'error' then
    return v_cot || jsonb_build_object('cupon', null, 'cupon_error', v_c ->> 'error');
  end if;
  return v_cot || jsonb_build_object(
    'cupon', jsonb_build_object('codigo', v_c ->> 'codigo', 'descuento', (v_c ->> 'descuento')::numeric),
    'cupon_id', v_c -> 'id',
    'cupon_error', null,
    'descuento_cupon', (v_c ->> 'descuento')::numeric,
    'total', v_base - (v_c ->> 'descuento')::numeric
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC públicos: firma nueva con p_cupon (drop + create: agregar un parámetro crea
-- otra sobrecarga, no la reemplaza)
-- ---------------------------------------------------------------------------

drop function public.cotizar_carrito(jsonb);
create function public.cotizar_carrito(p_items jsonb, p_cupon text default null)
returns jsonb
language sql stable
set search_path = ''
as $$ select private.cotizar_con_cupon(p_items, p_cupon) - 'cupon_id' $$;

drop function public.crear_pedido(jsonb, text, text);
create function public.crear_pedido(p_items jsonb, p_nombre text, p_notas text default null, p_cupon text default null)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_cot    jsonb;
  v_pedido public.pedidos;
  v_padre  uuid;
  v_cupon  uuid;
  l        jsonb;
  n        bigint;
begin
  if length(trim(coalesce(p_nombre, ''))) not between 1 and 80 then
    raise exception 'Ingresá tu nombre (hasta 80 caracteres)';
  end if;
  if length(coalesce(p_notas, '')) > 500 then
    raise exception 'Las notas admiten hasta 500 caracteres';
  end if;

  v_cot := private.cotizar_con_cupon(p_items, p_cupon);

  if jsonb_array_length(v_cot -> 'lineas') = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if exists (select 1 from jsonb_array_elements(v_cot -> 'lineas') x where x ->> 'estado' <> 'ok') then
    raise exception 'Hay productos sin stock o que ya no están disponibles: revisá el carrito';
  end if;
  -- Si el cliente puso un cupón y no vale, no se crea el pedido con otro total.
  if v_cot ->> 'cupon_error' is not null then
    raise exception '%', v_cot ->> 'cupon_error';
  end if;

  -- Uso del cupón: atómico, sin carreras entre dos pedidos por el último uso.
  v_cupon := (v_cot ->> 'cupon_id')::uuid;
  if v_cupon is not null then
    update public.cupones set usos = usos + 1
    where id = v_cupon and (usos_maximos is null or usos < usos_maximos);
    if not found then
      raise exception 'El cupón no es válido o ya venció';
    end if;
  end if;

  insert into public.pedidos (nombre, notas, subtotal, descuento_promociones, descuento_cupon, total, cupon_id, cupon_codigo)
  values (
    trim(p_nombre),
    nullif(trim(coalesce(p_notas, '')), ''),
    (v_cot ->> 'subtotal')::numeric,
    (v_cot ->> 'descuento_promociones')::numeric,
    (v_cot ->> 'descuento_cupon')::numeric,
    (v_cot ->> 'total')::numeric,
    v_cupon,
    v_cot -> 'cupon' ->> 'codigo'
  )
  returning * into v_pedido;

  for l, n in select t.l, t.n from jsonb_array_elements(v_cot -> 'lineas') with ordinality as t(l, n) loop
    if l ->> 'tipo' = 'combo' then
      insert into public.pedido_items
        (pedido_id, combo_id, descripcion, detalle, cantidad, precio_unitario, descuento, subtotal, orden)
      values (v_pedido.id, (l ->> 'combo_id')::uuid, l ->> 'nombre', l ->> 'detalle', (l ->> 'cantidad')::int,
              (l ->> 'precio_unitario')::numeric, 0, (l ->> 'subtotal')::numeric, (n - 1)::int)
      returning id into v_padre;
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

  return (v_cot - 'cupon_id') || jsonb_build_object('id', v_pedido.id, 'numero', v_pedido.numero);
end;
$$;

-- ---------------------------------------------------------------------------
-- Estados: cancelar devuelve el uso del cupón; reactivar un cancelado lo vuelve a usar
-- ---------------------------------------------------------------------------
create or replace function public.cambiar_estado_pedido(p_pedido_id uuid, p_estado public.estado_pedido)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actual    public.estado_pedido;
  v_cupon     uuid;
  r           record;
  v_descontar boolean;
  v_reponer   boolean;
begin
  if not (select private.es_admin()) then
    raise exception 'Sólo administradores';
  end if;

  select estado, cupon_id into v_actual, v_cupon from public.pedidos where id = p_pedido_id for update;
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

  if v_cupon is not null then
    if p_estado = 'cancelado' then
      update public.cupones set usos = greatest(usos - 1, 0) where id = v_cupon;
    elsif v_actual = 'cancelado' then
      update public.cupones set usos = usos + 1
      where id = v_cupon and (usos_maximos is null or usos < usos_maximos);
      if not found then
        raise exception 'El cupón del pedido ya no tiene usos disponibles: no se puede reactivar';
      end if;
    end if;
  end if;

  update public.pedidos set estado = p_estado where id = p_pedido_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  private.evaluar_cupon(text, numeric),
  private.cotizar_con_cupon(jsonb, text),
  public.cotizar_carrito(jsonb, text),
  public.crear_pedido(jsonb, text, text, text)
from public;

grant execute on function
  private.evaluar_cupon(text, numeric),
  private.cotizar_con_cupon(jsonb, text),
  public.cotizar_carrito(jsonb, text),
  public.crear_pedido(jsonb, text, text, text)
to anon, authenticated;
