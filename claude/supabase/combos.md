# Combos

[← Índice supabase](INDICE.md)

**Un combo en el pedido es una fila padre y una fila hija por variante.** El padre
(`combo_id`, precio del combo, `variante_id` null) lleva la plata; las hijas (`padre_id`,
precio 0, cantidad = combos × cantidad del ítem) llevan la variante. Por eso
`cambiar_estado_pedido` descuenta y repone stock sin saber nada de combos: suma
`pedido_items` por `variante_id`, y el padre no tiene. Si alguien agrega un combo como
una sola fila, confirmar el pedido no mueve el stock.

Migración: `*_combos.sql` (tablas, `buscar_combos`, `linea_combo`, y nuevas versiones
de `cotizar` y `crear_pedido`).

## Tablas

| Tabla | Qué guarda |
|---|---|
| `combos` | `slug` (único entre combos, URL `/combo/{slug}`), `nombre`, `descripcion` TipTap + `descripcion_texto`, `precio`, `publicado`, `destacado` |
| `combo_items` | `producto_id` (**on delete restrict**), `cantidad` 1–10, `orden` · `unique (combo_id, producto_id)` |
| `combo_imagenes` | Igual que `producto_imagenes`; paths `combos/{id}/{uuid}.webp` |
| `pedido_items` (columnas nuevas) | `combo_id`, `padre_id` (hijas, cascade), `promo` (nombre de la promoción aplicada a la línea) · `cantidad` admite hasta 200 por las hijas |

- **El combo guarda productos, no variantes.** El cliente elige la variante de cada
  producto en la ficha.
- `restrict` en `producto_id`: un producto que está en un combo no se borra (el panel
  lo avisa antes de tocar Storage). Ocultarlo sí se puede, y deja el combo sin stock.
- RLS como productos: anon ve combos publicados y las hijas de esos. Escritura admin.

## Disponibilidad y precio

- `private.combo_disponible(id)`: tiene ítems y **cada** producto está publicado y tiene
  alguna variante activa con stock ≥ la cantidad del ítem.
- `buscar_combos(p_destacados, p_limite, p_offset)`: los publicados con ítems;
  `precio_items` = suma del **precio de lista más bajo** de cada producto × cantidad (la
  base del "Ahorrás $X"). Disponibles primero.
- **Dentro de un combo no hay promociones.** El precio del combo tiene que ganarle a
  comprar los productos por separado con sus promos: el seed lo respeta (combo gamer
  $319.000 contra $326.000 con el 20% del monitor).

## Cotización

Item del carrito: `{ "tipo": "combo", "combo_id", "variantes": [uuid…], "cantidad" }`.

- **`variantes` va en el orden de `combo_items` (`orden`, `id`)** y `linea_combo` las
  empareja por posición: la variante `k` tiene que ser del producto del ítem `k`. Otro
  orden, otro producto, una inactiva o un producto oculto → `no_disponible`.
- El mismo combo con las mismas variantes se suma en una línea; con otras variantes es
  otra línea.
- `stock` de la línea = cuántos combos alcanzan (mínimo de stock ÷ cantidad, tope 20).
  **Se chequea por línea**, no contra otras líneas del carrito que usen la misma
  variante: igual que con variantes sueltas, el stock real se valida al confirmar.
- Toda línea trae `tipo` y **`clave`**: el `variante_id`, o
  `combo:<id>:<variantes separadas por coma>`. La web usa esa clave para cambiar
  cantidades y quitar líneas. Si cambia el formato, cambia `claveItem` en la web.
- Las líneas de combo traen `ahorro` (lista − precio, × cantidad) e `items` (variante,
  producto, nombre, detalle, sku, cantidad): `crear_pedido` arma las hijas con eso.
- Las líneas salen en el orden en que llegaron, mezclando combos y variantes.

## Ver también

- [Combos (web)](../web/combos.md) — ficha, selector por producto, carrito, panel
- [Carrito y pedidos](carrito.md) — `cotizar`, `crear_pedido`, estados y stock
- [Promociones](promociones.md) — por qué no se aplican dentro de un combo
- [Esquema](esquema.md)
