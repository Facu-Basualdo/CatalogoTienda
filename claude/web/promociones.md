# Promociones

[← Índice web](INDICE.md)

**La web nunca calcula un descuento: muestra lo que devuelve la base.** El precio con
promo de la tarjeta viene de `buscar_productos`, el de la ficha de `precios_producto` y
el del carrito de `cotizar_carrito`. Lo único que se compara en el cliente es
`precioLista > precio` para decidir si se tacha algo. Reglas del motor (tipos, alcance,
no acumulación) en [promociones supabase](../supabase/promociones.md).

## En la tienda

| Dónde | Qué muestra | De dónde sale |
|---|---|---|
| Tarjeta | Precio con promo unitaria, lista tachada + chip verde de ahorro · chip negro "3x2" / "2da al 50%" | `precioDesde`, `precioAnterior`, `promo` de `buscar_productos` |
| `/ofertas` | También los productos con promo unitaria vigente | `p_ofertas` |
| Ficha | Precio de la variante elegida con promo, tachado = lista · chip con el nombre de la promo unitaria · "Promo 3x2: se aplica en el carrito" | `precios_producto` por variante → `precio`, `precioLista`, `promoUnitaria`, `promoCantidad` en `obtenerProducto` |
| Carrito | Por línea: lista c/u, total de lista tachado, chip `-$X` + nombre de la promo; en el resumen, "Promociones" | `precio_unitario`, `descuento`, `promo`; `descuento_promociones` |
| WhatsApp | La promo al lado de la línea y una línea "Promociones: -$X" | lo que devolvió `crear_pedido` |

El tachado de la ficha es el **mayor** entre el precio de lista y el `precio_anterior`
manual, igual que en `buscar_productos`: si no, la tarjeta y la ficha muestran ahorros
distintos.

## Caché

**Toda lectura con precio lleva el tag `promociones` y vive 5 minutos** (`VIDA_PRECIOS`
en `lib/catalogo/lecturas.ts`): una promo que arranca o vence no dispara ningún
`updateTag`. Detalle en [cache](cache-y-revalidacion.md#promociones-y-fechas). Las
acciones del panel sólo invalidan `promociones`; con eso se actualizan tarjetas, ofertas
y fichas.

## Dashboard

`/admin/promociones` (listado), `/nueva` y `/[id]` (edición + borrado). Acciones en
`app/admin/(panel)/promociones/acciones.ts`: `guardarPromocion`, `cambiarActiva`,
`borrarPromocion`.

- **Se guarda con el RPC `guardar_promocion`**, que reemplaza promo y alcance en una
  transacción. Dos escrituras desde la acción podían dejar una promo sin alcance (= no
  aplica a nada) si fallaba la segunda.
- Zod repite las reglas del `check` de la tabla con mensajes para el admin (N×M paga <
  lleva, porcentaje ≤ 90, alcance no vacío salvo "Todo el catálogo").
- Con "Todo el catálogo" se guarda `alcance_todo = true` y **ninguna** fila de alcance.
- Listado: estado calculado (Vigente / Programada / Vencida / Pausada) y `SwitchActiva`
  inline, optimista como el de productos.
- Alcance con `components/admin/selector-multiple.tsx` (chips + `ComboBox`, muestra hasta
  50 resultados): categorías, etiquetas como "Grupo: valor" y productos (hasta 2000, por
  nombre). Las opciones las arma `opcionesAlcance` en `lib/admin/promociones.ts`.

### Fechas

**El admin elige días, la base guarda instantes.** `DatePicker` sin hora; la acción
convierte `desde` a las 00:00 y `hasta` a las 24:00 (00:00 del día siguiente) de
Argentina, con offset fijo `-03:00` (no hay horario de verano). Al leer, `aDia(ts, true)`
resta 1 ms para mostrar el último día incluido. Si se escribe `hasta` con otra hora por
SQL, el panel muestra el día en que termina.

## Ver también

- [Promociones (supabase)](../supabase/promociones.md) — motor, alcance, contratos
- [Carrito](carrito.md) — la cotización que muestra el descuento por línea
- [Dashboard](dashboard.md) — patrón de Server Action y páginas del panel
- [Caché y revalidación](cache-y-revalidacion.md#promociones-y-fechas)
