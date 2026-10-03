# Promociones

[← Índice supabase](INDICE.md)

**Las promociones se calculan sólo en Postgres, y siempre con las mismas funciones.** El
precio de la tarjeta, el de la ficha, el del carrito y el que queda en el pedido salen de
`private.promociones_aplicables` + `private.promo_unitaria` (por unidad) y de
`private.cotizar` (por cantidad). Si la web calcula un descuento por su cuenta, el
carrito muestra un total y el pedido guarda otro.

Migraciones: `*_promociones.sql` (tablas, helpers, `buscar_productos`, `precios_producto`,
`cotizar`) y `*_guardar_promocion.sql`.

## Tablas

| Tabla | Qué guarda |
|---|---|
| `promociones` | `nombre`, `tipo`, `valor` · `lleva`/`paga` (sólo N×M) · `alcance_todo` · `activa` · `desde`/`hasta` (timestamptz, ambos opcionales) |
| `promocion_alcance` | Una fila por producto, categoría **o** etiqueta: `check (num_nonnulls(...) = 1)` |

| `tipo` | `valor` | Dónde se ve |
|---|---|---|
| `porcentaje` | % por unidad (≤ 90) | Baja el precio en la tienda (tachado = lista) |
| `monto_fijo` | $ por unidad | Igual que porcentaje |
| `nxm` | — (`lleva`, `paga` < `lleva`) | Chip "3x2" en la tienda; se aplica en el carrito |
| `segunda_unidad` | % de cada 2da (≤ 100) | Chip "2da al 50%"; se aplica en el carrito |

Un `check` por tipo exige la combinación exacta de columnas: un N×M con `valor` o un
porcentaje con `lleva` no entran.

- **Sin alcance no aplica a nada.** "Todo el catálogo" es `alcance_todo = true`
  explícito, nunca "sin filas": así un 20% global no aparece por olvidarse de elegir.
- Por **categoría** alcanza a la categoría y a sus hijas (`padre_id`, dos niveles).
- Por **etiqueta** mira `producto_etiquetas` **y** `variante_etiquetas`: una promo por
  "Color: Negro" alcanza al producto que tenga alguna variante negra (a todas sus
  variantes, no sólo a la negra).

## No se acumulan

**Cada unidad recibe UNA promoción: la que más le descuenta.**

1. Promos por unidad (`porcentaje`, `monto_fijo`): `promo_unitaria(producto, precio)`
   elige la de mayor descuento (empate: la más vieja). Redondeo a pesos enteros.
2. Promos por cantidad (`nxm`, `segunda_unidad`), dentro de `cotizar`: junta las
   unidades de las líneas alcanzadas **de mayor a menor precio**. N×M deja gratis las
   `lleva − paga` más baratas de cada grupo completo de `lleva`; "2da" descuenta el %
   a cada unidad par. Mezcla variantes y productos distintos si la promo los alcanza a
   todos (remera básica ×2 + oversize ×1 = un 3x2).
3. Una promo por cantidad **se queda con sus líneas sólo si gana más** que las promos
   unitarias que esas líneas pierden. Se elige de a una (la de mayor ganancia) hasta que
   ninguna gane; una línea asignada ya no entra en otra.

Las unidades dentro de un combo no reciben promociones (ver [combos](combos.md)).

## Contratos con la web

| Función | Devuelve |
|---|---|
| `buscar_productos(...)` | `precio_desde` **con** promo unitaria · `precio_anterior` = precio de lista si la promo lo bajó (o el anterior manual si es mayor) · `promo` = texto del chip por cantidad · `p_ofertas` incluye productos con promo unitaria |
| `precios_producto(p_producto_id)` | Por variante: `precio_lista`, `precio` (con promo), `promo_unitaria` (nombre), `promo_cantidad` ("3x2") |
| `cotizar` (línea) | `precio_unitario` = **lista** · `precio_promo` · `descuento` (total de la línea) · `promo` (nombre) · `subtotal` = lista × cantidad − descuento |
| `cotizar` (totales) | `subtotal` = suma a precio de lista · `descuento_promociones` · `total` |
| `guardar_promocion(p_id, p_promo, p_alcance)` | `uuid`. Crea (`p_id` null) o reemplaza promo **y** alcance en una transacción |

`crear_pedido` guarda en `pedido_items.promo` el nombre de la promoción de cada línea, y
el detalle del pedido en el panel lo muestra junto al descuento.

## Seguridad

- `anon` lee **sólo las activas** (policy `using (activa)`) y el alcance de las que ve:
  lo necesitan los RPC `security invoker` del catálogo. Las pausadas no se filtran.
- `promociones_aplicables` filtra `activa` y la ventana **a mano**, además de RLS:
  también corre dentro de `crear_pedido` (definer), que ve todas las filas.
- Escritura: `authenticated` + `private.es_admin()`, policies separadas por acción.
  `guardar_promocion` es `security invoker` y sólo la ejecuta `authenticated`.

## Ventanas de fecha

**Nadie muta nada cuando una promo empieza o termina**: `now()` se evalúa en cada
consulta, pero la web cachea los precios. Por eso las lecturas con precio tienen vida de
5 minutos (ver [cache web](../web/cache-y-revalidacion.md#promociones-y-fechas)). El
carrito cotiza en vivo: la compra nunca usa un precio vencido.

## Ver también

- [Promociones (web)](../web/promociones.md) — panel, fechas por día, chips y caché
- [Carrito y pedidos](carrito.md) — `cotizar` es el motor; acá sólo la parte de promos
- [Seguridad y RLS](seguridad-rls.md)
- [Esquema](esquema.md)
- [Combos](combos.md)
