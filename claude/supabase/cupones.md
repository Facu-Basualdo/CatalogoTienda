# Cupones

[← Índice supabase](INDICE.md)

**`cupones` no tiene grants para `anon`.** Si la tabla fuera legible, cualquiera
listaría los códigos con un `select`. El navegador nunca la lee: manda el código a
`cotizar_carrito` y el cupón se evalúa en `private.evaluar_cupon`, `security definer`
en el schema `private` (la API no la expone). `anon` recibe 42501 si la consulta
directo, y está probado.

Migración: `*_cupones.sql`.

## Tabla

| Columna | Regla |
|---|---|
| `codigo` | Único, **siempre en mayúsculas** (`check ^[A-Z0-9-]{3,30}$`). La búsqueda hace `upper(trim(…))`: el cliente puede escribirlo como quiera |
| `tipo`, `valor` | `porcentaje` (≤ 100) o `monto_fijo` |
| `minimo_compra` | Sobre el subtotal **después** de promociones |
| `usos_maximos`, `usos` | null = ilimitado. `usos` cuenta pedidos no cancelados |
| `activo`, `desde`, `hasta` | Igual que las promociones |

`pedidos.cupon_id` (on delete set null) + `pedidos.cupon_codigo` (el texto, para que
el pedido lo conserve aunque se borre el cupón).

## Cómo se aplica

- **Uno por pedido, sobre `subtotal − descuento_promociones`** (promos y combos ya
  aplicados). Porcentaje redondeado a pesos; monto fijo, como mucho el total.
- `private.cotizar_con_cupon(p_items, p_cupon)` envuelve a `cotizar` (que no sabe de
  cupones) y agrega `cupon`, `cupon_error`, `descuento_cupon` y el `total` nuevo.
- **Errores**: "no es válido o ya venció" para todo (no existe, inactivo, fuera de
  fecha, sin usos) para no dar pistas al que prueba códigos; el **mínimo sí se informa**
  con el monto, porque el cliente lo puede corregir.
- Los códigos cortos se pueden adivinar probando: no hay rate limit. El panel genera
  códigos de 10 caracteres al azar para los que no son públicos.

## Firmas (cambiaron en esta migración)

| Función | Antes | Ahora |
|---|---|---|
| `cotizar_carrito` | `(p_items)` | `(p_items, p_cupon text default null)` |
| `crear_pedido` | `(p_items, p_nombre, p_notas)` | `(…, p_cupon text default null)` |

Se hicieron con `drop` + `create` (agregar un parámetro crea otra sobrecarga) y se
volvieron a dar los grants. `cupon_id` nunca sale en la respuesta de los RPC públicos.

## Usos

- `crear_pedido` **rechaza el pedido si el cupón no vale** (no lo crea con otro total)
  y suma el uso con
  `update … set usos = usos + 1 where id = … and (usos_maximos is null or usos < usos_maximos)`:
  atómico, dos pedidos no se llevan el último uso.
- `cambiar_estado_pedido`: pasar a `cancelado` **devuelve** el uso; sacar un pedido de
  `cancelado` lo vuelve a consumir y falla si ya no quedan.

## Ver también

- [Cupones (web)](../web/cupones.md) — campo en el carrito y panel
- [Carrito y pedidos](carrito.md) — `cotizar`, `crear_pedido`, estados
- [Promociones](promociones.md) — se aplican antes del cupón
- [Seguridad y RLS](seguridad-rls.md)
