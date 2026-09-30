# Variantes y stock

[← Índice supabase](INDICE.md)

Una remera negra talle M y una blanca talle S son el mismo producto (misma ficha,
mismas fotos, misma descripción) pero tienen stock distinto. **El stock vive en la
variante, nunca en el producto.**

## Invariante central

**Todo producto tiene al menos una variante.** Un monitor sin opciones tiene una sola
variante sin etiquetas (la "variante única"), creada junto con el borrador. Así el
stock está siempre en un solo lugar y no hay `if (tieneVariantes)` en cada consulta,
en la ficha y en el dashboard.

## Tablas

```sql
alter table grupos_etiqueta add column es_variante boolean not null default false;
alter table etiquetas add constraint etiquetas_id_grupo_key unique (id, grupo_id);

create table producto_variantes (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos on delete cascade,
  clave       text not null,              -- slugs de sus etiquetas ordenados: 'm/negro'; '' = variante única
  sku         text unique,
  precio      numeric(12,2),              -- null = usa productos.precio
  stock       int not null default 0 check (stock >= 0),
  activa      boolean not null default true,
  orden       int not null default 0,
  unique (producto_id, clave)
);

create table variante_etiquetas (
  variante_id uuid not null references producto_variantes on delete cascade,
  etiqueta_id uuid not null,
  grupo_id    uuid not null,
  primary key (variante_id, grupo_id),                         -- una etiqueta por grupo
  foreign key (etiqueta_id, grupo_id) references etiquetas (id, grupo_id)
);
```

- **La pk `(variante_id, grupo_id)` + la FK compuesta** garantizan en la base que una
  variante no sea "M y L" a la vez, sin triggers. Por eso `etiquetas` necesita el
  unique `(id, grupo_id)`, redundante en apariencia.
- **`unique (producto_id, clave)`** impide dos variantes "M/negro" en el mismo producto.
- Un trigger en `variante_etiquetas` rechaza etiquetas de grupos con
  `es_variante = false`.

## Dónde va cada etiqueta

| Grupo | Tabla | Ejemplo |
|---|---|---|
| `es_variante = false` | `producto_etiquetas` | Material, Tasa de refresco, Panel |
| `es_variante = true` | `variante_etiquetas` | Talle, Color, Almacenamiento |

**Una etiqueta de grupo de variante nunca va en `producto_etiquetas`.** Si pasa, el
filtro por talle muestra el producto aunque ese talle esté agotado.

**`es_variante` no se puede cambiar en un grupo que ya tiene etiquetas en uso**: las
relaciones tendrían que migrar de tabla. El dashboard lo bloquea y la migración que lo
cambie tiene que moverlas explícitamente.

## Guardado: un solo RPC

`guardar_variantes(p_producto_id uuid, p_variantes jsonb)` recibe la lista completa
(`[{ id?, etiquetas: [uuid], sku, precio, stock, activa }]`), calcula `clave`, hace
upsert, borra las que no vinieron y reescribe `variante_etiquetas`, todo en una
transacción. Es `security invoker`: RLS exige admin.

No se editan variantes con updates sueltos desde el cliente: un fallo a mitad deja un
producto con variantes sin etiquetas que colisionan en `clave = ''`.

## Filtro con variantes

`buscar_productos` separa internamente `p_filtros` en grupos normales y de variante;
**el cliente manda el mismo objeto de siempre**.

- Grupos normales: como en [etiquetas](etiquetas.md#semántica-del-filtro).
- Grupos de variante: **tiene que existir UNA misma variante activa con stock que
  cumpla todos los grupos de variante filtrados.** `talle=m & color=negro` no se cumple
  con "M blanca con stock + L negra con stock": el cliente llega a la ficha y no
  existe lo que filtró.

```sql
exists (
  select 1 from producto_variantes v
  where v.producto_id = p.id and v.activa and v.stock > 0
    and not exists (
      select 1 from jsonb_each(filtros_variante) f(grupo, valores)
      where not exists (
        select 1 from variante_etiquetas ve
        join etiquetas e on e.id = ve.etiqueta_id
        join grupos_etiqueta g on g.id = ve.grupo_id
        where ve.variante_id = v.id and g.slug = f.grupo
          and e.slug in (select jsonb_array_elements_text(f.valores))
      )
    )
)
```

Las facetas de grupos de variante cuentan productos con al menos una variante activa
**con stock** que tenga esa etiqueta.

## Valores derivados (no se guardan)

`buscar_productos` y la lectura de la ficha devuelven, calculados sobre variantes
activas:

| Campo | Cálculo |
|---|---|
| `stock_total` | `sum(stock)` |
| `disponible` | `stock_total > 0` |
| `precio_desde` | `min(coalesce(v.precio, p.precio))`, priorizando variantes con stock |
| `precio_varia` | hay más de un precio efectivo distinto → la tarjeta dice "desde" |

- **Ordenar por precio usa `precio_desde`, no `productos.precio`.** Si no, una
  notebook de 16 GB a $900.000 con variante de 32 GB a $1.100.000 aparece ordenada
  por un precio que puede no estar disponible.
- **Los productos sin stock van siempre al final** (`order by disponible desc, …`),
  cualquiera sea el orden elegido.
- No se guarda `stock_total` en `productos`: dos fuentes de verdad se desincronizan en
  el primer update que se olvide del otro.

## Visibilidad

| Quiero… | Se hace con |
|---|---|
| Ocultar un producto entero de la tienda | `productos.publicado = false` (switch en el listado del dashboard) |
| Ocultar una combinación (ej. dejar de vender XL) | `producto_variantes.activa = false` |
| Mostrarlo pero que no se pueda pedir | `stock = 0` → la tienda muestra "Sin stock" |

Sin stock **no oculta** el producto: queda visible con el aviso y al final del listado.

## Descuento de stock

No hay checkout: el stock se edita a mano en el dashboard. Cuando haya ventas, el
descuento tiene que ser atómico en SQL (`update … set stock = stock - n where id = … and stock >= n`
y chequear filas afectadas), nunca leer–restar–escribir desde Next.

## Ver también

- [Variantes y stock (web)](../web/variantes-y-stock.md)
- [Etiquetas](etiquetas.md)
- [Esquema](esquema.md)
- [Seguridad y RLS](seguridad-rls.md)
