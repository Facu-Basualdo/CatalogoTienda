# Carrito y pedidos

[← Índice supabase](INDICE.md)

**Un solo motor de precios: `private.cotizar(p_items jsonb)`.** Lo que ve el cliente en
el carrito, el total del mensaje de WhatsApp y lo que queda guardado en `pedidos` salen
de la misma función. Si alguna vez se calcula un precio en otro lado (en la web, en un
trigger), los tres números dejan de coincidir y el primer reclamo es "el carrito decía
otra cosa".

Migración: `*_carrito_y_pedidos.sql`.

## Funciones

| Función | Rol | Seguridad | Qué hace |
|---|---|---|---|
| `private.cotizar(p_items)` | — | invoker | Desglose: líneas con precio, estado y subtotal; totales |
| `cotizar_carrito(p_items)` | anon, authenticated | invoker | Wrapper para el carrito. No escribe nada |
| `crear_pedido(p_items, p_nombre, p_notas)` | anon, authenticated | **definer** | Vuelve a cotizar, valida y guarda pedido + ítems |
| `cambiar_estado_pedido(p_pedido_id, p_estado)` | authenticated (+ admin) | invoker | Cambia estado; descuenta o repone stock |

`p_items`: `[{ "tipo": "variante", "variante_id": uuid, "cantidad": int }]`. Promociones,
combos y cupones van a entrar **dentro de `cotizar`**, no en funciones paralelas.

## Reglas de `cotizar`

- **Chequea `publicado` y `activa` explícitamente**, además de RLS: también corre
  dentro de `crear_pedido`, que es `security definer` y no pasa por RLS. Sin esos
  chequeos, un pedido podría incluir un borrador.
- La misma variante repetida se suma en una línea (máx. 20 unidades); máx. 30 líneas.
  Ids que no son UUID se descartan en silencio.
- Estado por línea: `ok` · `sin_stock` · `stock_insuficiente` · `no_disponible`
  (inexistente, inactiva o despublicada). **Sólo las `ok` suman al total**; las otras
  se devuelven igual para que el carrito muestre el aviso.
- Precios redondeados a pesos enteros por línea.

## `crear_pedido`

- Es la **única** forma de escribir en `pedidos`/`pedido_items`: `anon` no tiene grants
  sobre esas tablas. Por eso es `security definer` (en `public`, porque la llama la API)
  y valida todo adentro: nombre 1–80, notas ≤ 500, carrito no vacío, todas las líneas
  `ok`.
- Los mensajes de error (`raise exception`) **son para el cliente**: la web los muestra
  tal cual en un toast. Redactalos en español y accionables ("revisá el carrito").
- Guarda un **snapshot** en `pedido_items` (nombre, detalle "M / Negro", SKU, precio):
  los productos cambian después, el pedido no.
- **No reserva stock.** Un pedido pendiente es una intención; el stock se descuenta al
  confirmarlo. Riesgo aceptado: dos pedidos pendientes por la última unidad; el segundo
  falla al confirmar.
- Devuelve la cotización + `id` + `numero` (el que se menciona por WhatsApp).
- Sin rate limit: alguien puede generar pedidos basura. Si pasa, Turnstile en el
  formulario (ver plan).

## Estados y stock

`pendiente` → `confirmado` → `entregado`, o `cancelado`.

- Pasar a `confirmado`/`entregado` desde `pendiente`/`cancelado` **descuenta** con
  `update … set stock = stock - n where stock >= n` por variante. Si una no alcanza,
  `raise` y no se descuenta nada (la función es una transacción).
- Volver de `confirmado`/`entregado` a `pendiente`/`cancelado` **repone**.
- `for update` sobre el pedido: dos admins confirmando a la vez no descuentan dos veces.
- Todavía no se probó con un admin real (no hay dashboard); probarlo en la fase del
  dashboard de pedidos.

## Verificación hecha (como anon, por HTTP)

Cotizar con variante repetida, agotada e inexistente → una línea sumada, dos avisos,
total sólo de las `ok`. `crear_pedido` con línea agotada o sin nombre → 400 con el
mensaje. `anon` leyendo `pedidos` o llamando `cambiar_estado_pedido` → 42501. Crear un
pedido no cambia el stock.

## Ver también

- [Carrito (web)](../web/carrito.md)
- [Variantes y stock](variantes-y-stock.md)
- [Seguridad y RLS](seguridad-rls.md)
- [Esquema](esquema.md#funciones-rpc)
